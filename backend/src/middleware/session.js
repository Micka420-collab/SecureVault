import jwt from 'jsonwebtoken';
import prisma from '../config/database.js';

const SESSION_TIMEOUT = 15 * 60 * 1000; // 15 minutes inactivity timeout

/**
 * Session middleware for auto-lock mechanism
 */
export async function sessionMiddleware(req, res, next) {
    // Skip for non-authenticated routes
    const publicPaths = ['/api/health', '/api/auth/login', '/api/auth/register'];
    if (publicPaths.some(path => req.path.startsWith(path))) {
        return next();
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return next();
    }

    try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Check if session exists and is not expired
        const session = await prisma.session.findUnique({
            where: { token },
            include: { user: true },
        });

        if (!session) {
            return res.status(401).json({ error: 'Session not found', code: 'SESSION_EXPIRED' });
        }

        // Check for inactivity timeout
        const lastActivity = new Date(session.lastActivity).getTime();
        const now = Date.now();

        if (now - lastActivity > SESSION_TIMEOUT) {
            // Session expired due to inactivity
            await prisma.session.delete({ where: { id: session.id } });
            return res.status(401).json({
                error: 'Session expired due to inactivity',
                code: 'SESSION_LOCKED',
                requiresUnlock: true,
            });
        }

        // Update last activity
        await prisma.session.update({
            where: { id: session.id },
            data: { lastActivity: new Date() },
        });

        // Attach user to request
        req.user = session.user;
        req.session = session;
        req.userId = decoded.userId;

        next();
    } catch (error) {
        if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Invalid or expired token', code: 'TOKEN_INVALID' });
        }
        next(error);
    }
}

/**
 * Require authentication middleware
 */
export function requireAuth(req, res, next) {
    if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
    }
    next();
}

/**
 * Require 2FA verification middleware
 */
export function require2FA(req, res, next) {
    if (req.user?.totpEnabled && !req.session?.totpVerified) {
        return res.status(403).json({
            error: '2FA verification required',
            code: 'TOTP_REQUIRED',
        });
    }
    next();
}
