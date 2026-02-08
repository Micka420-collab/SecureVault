import express from 'express';
import jwt from 'jsonwebtoken';
import { authenticator } from 'otplib';
import QRCode from 'qrcode';
import validator from 'validator';
import crypto from 'crypto';
import prisma from '../config/database.js';
import {
    hashPassword,
    verifyPassword,
    generateToken,
    generateSalt,
    encryptServerSide,
    decryptServerSide,
} from '../crypto/encryption.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { requireAuth } from '../middleware/session.js';
import { logAudit, AUDIT_ACTIONS, getUserAuditLogs, getSecuritySummary } from '../middleware/auditLog.js';

const router = express.Router();

// Token expiry
const ACCESS_TOKEN_EXPIRY = '1h';
const SESSION_EXPIRY_HOURS = 24;

/**
 * Validate password strength
 */
function validatePassword(password) {
    if (!password || typeof password !== 'string') {
        return { valid: false, error: 'Password is required' };
    }
    if (password.length < 12) {
        return { valid: false, error: 'Password must be at least 12 characters' };
    }
    if (password.length > 128) {
        return { valid: false, error: 'Password must not exceed 128 characters' };
    }
    return { valid: true };
}

/**
 * Validate email format
 */
function validateEmail(email) {
    if (!email || typeof email !== 'string') {
        return { valid: false, error: 'Email is required' };
    }
    if (!validator.isEmail(email)) {
        return { valid: false, error: 'Invalid email format' };
    }
    if (email.length > 254) {
        return { valid: false, error: 'Email too long' };
    }
    return { valid: true };
}

/**
 * Verify password hash against stored hash with timing-safe comparison
 */
async function timingSafeVerify(storedHash, password) {
    try {
        return await verifyPassword(storedHash, password);
    } catch {
        return false;
    }
}

/**
 * Derive key from password for unlock verification (matches client-side derivation)
 */
async function deriveKeyForUnlock(password, saltBase64) {
    const encoder = new TextEncoder();
    const salt = Buffer.from(saltBase64, 'base64');
    
    // Combine password and salt (same as client)
    const data = encoder.encode(password + saltBase64);
    
    // Hash multiple times (same as client)
    let hash = await crypto.subtle.digest('SHA-256', data);
    for (let i = 0; i < 3; i++) {
        hash = await crypto.subtle.digest('SHA-256', hash);
    }
    
    return Buffer.from(hash).toString('base64');
}

// ========================================
// Registration
// ========================================
/**
 * Auth Routes - SecureVault by Nextendo x Micka Delcato
 */

// Register endpoint - SecureVault by Nextendo x Micka Delcato
router.post('/register', asyncHandler(async (req, res) => {
    const { email, masterPassword, realEmail } = req.body;

    // Validation
    const emailValidation = validateEmail(email);
    if (!emailValidation.valid) {
        return res.status(400).json({ error: emailValidation.error });
    }

    const passwordValidation = validatePassword(masterPassword);
    if (!passwordValidation.valid) {
        return res.status(400).json({ error: passwordValidation.error });
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
        where: { email: email.toLowerCase().trim() },
    });

    if (existingUser) {
        // Add random delay to prevent user enumeration via timing
        await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));
        return res.status(409).json({ error: 'User already exists' });
    }
    
    // Validate realEmail if provided
    if (realEmail) {
        const realEmailValidation = validateEmail(realEmail);
        if (!realEmailValidation.valid) {
            return res.status(400).json({ error: 'Invalid forwarding email format' });
        }
    }

    // Generate salt for client-side key derivation (used for encryption, not auth)
    const salt = generateSalt();

    // Hash the password directly with Argon2
    const serverHash = await hashPassword(masterPassword);
    
    // Generate client auth hash for unlock verification (SHA-256 of password+salt)
    const encoder = new TextEncoder();
    const saltData = encoder.encode(masterPassword + salt);
    let clientHashBuffer = await crypto.subtle.digest('SHA-256', saltData);
    for (let i = 0; i < 3; i++) {
        clientHashBuffer = await crypto.subtle.digest('SHA-256', clientHashBuffer);
    }
    const clientAuthHashRaw = Buffer.from(clientHashBuffer).toString('base64');
    
    // Encrypt the client auth hash for storage
    const encryptedClientHash = encryptServerSide(clientAuthHashRaw);

    // Encrypt real email if provided
    let encryptedRealEmail = null;
    let realEmailIv = null;
    if (realEmail) {
        const encrypted = encryptServerSide(realEmail);
        encryptedRealEmail = encrypted.encrypted;
        realEmailIv = encrypted.iv;
    }

    // Create user
    const user = await prisma.user.create({
        data: {
            email: email.toLowerCase().trim(),
            passwordHash: serverHash,
            clientAuthHash: `${encryptedClientHash.encrypted}:${encryptedClientHash.iv}`,
            salt,
            realEmail: encryptedRealEmail ? `${encryptedRealEmail}:${realEmailIv}` : '',
        },
        select: {
            id: true,
            email: true,
            salt: true,
            createdAt: true,
        },
    });

    res.status(201).json({
        message: 'User created successfully',
        user: {
            id: user.id,
            email: user.email,
            salt: user.salt,
        },
    });
    
    // Log account creation
    await logAudit(AUDIT_ACTIONS.ACCOUNT_CREATE, user.id, {
        email: user.email,
        hasRealEmail: !!realEmail,
    }, req);
    
    // Securely clear sensitive data from memory
    clientAuthHashRaw = null;
}));

// ========================================
// Login
// ========================================
router.post('/login', asyncHandler(async (req, res) => {
    const { email, masterPassword } = req.body;

    // Validation
    const emailValidation = validateEmail(email);
    if (!emailValidation.valid) {
        return res.status(400).json({ error: emailValidation.error });
    }

    const passwordValidation = validatePassword(masterPassword);
    if (!passwordValidation.valid) {
        return res.status(400).json({ error: passwordValidation.error });
    }

    // Find user
    const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase().trim() },
    });

    // Constant-time comparison to prevent timing attacks
    // If user doesn't exist, verify against a dummy hash
    let passwordHash = user ? user.passwordHash : '$argon2id$v=19$m=65536,t=3,p=4$' + '0'.repeat(32) + '$' + '0'.repeat(64);
    
    // Verify password with Argon2
    const isValid = await verifyPassword(passwordHash, masterPassword);
    
    // Update client auth hash if missing (migration for existing users)
    if (isValid && user && !user.clientAuthHash) {
        const encoder = new TextEncoder();
        const saltData = encoder.encode(masterPassword + user.salt);
        let clientHashBuffer = await crypto.subtle.digest('SHA-256', saltData);
        for (let i = 0; i < 3; i++) {
            clientHashBuffer = await crypto.subtle.digest('SHA-256', clientHashBuffer);
        }
        const clientAuthHashRaw = Buffer.from(clientHashBuffer).toString('base64');
        const encryptedClientHash = encryptServerSide(clientAuthHashRaw);
        
        await prisma.user.update({
            where: { id: user.id },
            data: { clientAuthHash: `${encryptedClientHash.encrypted}:${encryptedClientHash.iv}` }
        });
    }
    
    if (!user || !isValid) {
        // Add random delay to prevent timing attacks (100-300ms)
        await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));
        
        // Log failed login attempt
        await logAudit(AUDIT_ACTIONS.LOGIN_FAILURE, user?.id || null, {
            email: email.toLowerCase().trim(),
            reason: user ? 'invalid_password' : 'user_not_found',
        }, req);
        
        return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate session token
    const sessionToken = generateToken();
    const expiresAt = new Date(Date.now() + SESSION_EXPIRY_HOURS * 60 * 60 * 1000);

    // Create session
    await prisma.session.create({
        data: {
            userId: user.id,
            token: sessionToken,
            expiresAt,
            totpVerified: false,
        },
    });

    // Generate JWT
    const accessToken = jwt.sign(
        { userId: user.id, sessionToken },
        process.env.JWT_SECRET,
        { expiresIn: ACCESS_TOKEN_EXPIRY }
    );

    // Check if 2FA is required
    if (user.totpEnabled) {
        return res.json({
            message: '2FA required',
            requires2FA: true,
            accessToken,
            salt: user.salt,
            hasSeenOnboarding: user.hasSeenOnboarding,
        });
    }

    res.json({
        message: 'Login successful',
        accessToken,
        salt: user.salt,
        user: {
            id: user.id,
            email: user.email,
            totpEnabled: user.totpEnabled,
            hasSeenOnboarding: user.hasSeenOnboarding,
        },
    });
    
    // Log successful login
    await logAudit(AUDIT_ACTIONS.LOGIN_SUCCESS, user.id, {
        email: user.email,
        totpRequired: user.totpEnabled,
    }, req);
}));

// ========================================
// Get Salt (for client-side key derivation)
// ========================================
router.post('/salt', asyncHandler(async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ error: 'Email is required' });
    }

    const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
        select: { salt: true },
    });

    if (!user) {
        // Return a fake salt to prevent user enumeration
        return res.json({ salt: generateSalt() });
    }

    res.json({ salt: user.salt });
}));

// ========================================
// Setup 2FA
// ========================================
router.post('/2fa/setup', requireAuth, asyncHandler(async (req, res) => {
    const user = req.user;

    if (user.totpEnabled) {
        return res.status(400).json({ error: '2FA is already enabled' });
    }

    // Generate TOTP secret
    const secret = authenticator.generateSecret();

    // Generate QR code
    const otpauth = authenticator.keyuri(user.email, 'SecureVault', secret);
    const qrCode = await QRCode.toDataURL(otpauth);

    // Store secret temporarily (encrypted)
    const encrypted = encryptServerSide(secret);
    await prisma.user.update({
        where: { id: user.id },
        data: { totpSecret: `${encrypted.encrypted}:${encrypted.iv}` },
    });

    res.json({
        message: 'Scan QR code with authenticator app',
        qrCode,
        secret, // Also provide manual entry option
    });
}));

// ========================================
// Verify 2FA (during setup or login)
// ========================================
router.post('/2fa/verify', requireAuth, asyncHandler(async (req, res) => {
    const { code, isSetup } = req.body;
    const user = req.user;

    if (!code || !/^\d{6}$/.test(code)) {
        return res.status(400).json({ error: 'Valid 6-digit verification code is required' });
    }

    if (!user.totpSecret) {
        return res.status(400).json({ error: '2FA not configured' });
    }

    // Decrypt secret - Format: "encryptedData:authTag:iv"
    const parts = user.totpSecret.split(':');
    if (parts.length !== 3) {
        return res.status(500).json({ error: 'Invalid 2FA secret format' });
    }
    
    const [encryptedData, authTag, iv] = parts;
    const secret = decryptServerSide(`${encryptedData}:${authTag}`, iv);

    // Verify code with window tolerance
    const isValid = authenticator.verify({ 
        token: code, 
        secret,
        window: 1 // Allow 1 step before/after for time drift
    });

    if (!isValid) {
        return res.status(401).json({ error: 'Invalid verification code' });
    }

    if (isSetup) {
        // Enable 2FA
        await prisma.user.update({
            where: { id: user.id },
            data: { totpEnabled: true },
        });

        // Log 2FA setup
        await logAudit(AUDIT_ACTIONS.TOTP_SETUP, user.id, {}, req);
        
        return res.json({ message: '2FA enabled successfully' });
    }

    // Log 2FA verification
    await logAudit(AUDIT_ACTIONS.TOTP_VERIFY, user.id, {}, req);
    
    // Mark session as 2FA verified
    await prisma.session.update({
        where: { id: req.session.id },
        data: { lastActivity: new Date(), totpVerified: true },
    });

    res.json({ message: '2FA verified successfully' });
}));

// ========================================
// Disable 2FA
// ========================================
router.post('/2fa/disable', requireAuth, asyncHandler(async (req, res) => {
    const { code } = req.body;
    const user = req.user;

    if (!code || !/^\d{6}$/.test(code)) {
        return res.status(400).json({ error: 'Valid 6-digit code is required' });
    }

    if (!user.totpEnabled) {
        return res.status(400).json({ error: '2FA is not enabled' });
    }

    // Verify code before disabling - Format: "encryptedData:authTag:iv"
    const parts = user.totpSecret.split(':');
    if (parts.length !== 3) {
        return res.status(500).json({ error: 'Invalid 2FA secret format' });
    }
    
    const [encryptedData, authTag, iv] = parts;
    const secret = decryptServerSide(`${encryptedData}:${authTag}`, iv);

    const isValid = authenticator.verify({ 
        token: code, 
        secret,
        window: 1 
    });

    if (!isValid) {
        return res.status(401).json({ error: 'Invalid verification code' });
    }

    await prisma.user.update({
        where: { id: user.id },
        data: {
            totpEnabled: false,
            totpSecret: null,
        },
    });

    res.json({ message: '2FA disabled successfully' });
    
    // Log 2FA disable
    await logAudit(AUDIT_ACTIONS.TOTP_DISABLE, user.id, {}, req);
}));

// ========================================
// Unlock Session (after auto-lock)
// ========================================
router.post('/unlock', asyncHandler(async (req, res) => {
    const { passwordHash } = req.body;
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Token required for unlock' });
    }

    // Validate passwordHash format
    if (!passwordHash || typeof passwordHash !== 'string' || passwordHash.length < 32) {
        return res.status(400).json({ error: 'Invalid password hash format' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET, { ignoreExpiration: true });

        const user = await prisma.user.findUnique({
            where: { id: decoded.userId },
        });

        if (!user) {
            return res.status(401).json({ error: 'User not found' });
        }

        // Derive expected hash from stored password using user's salt
        // The client sends PBKDF2 hash, we derive the same from stored Argon2 hash
        // Actually, we need to compare differently - the client sends a hash derived from password
        // We verify by hashing the password with Argon2 and comparing
        
        // For unlock, we verify the passwordHash by deriving it the same way client does
        // Then comparing with a hash we would derive from the master password
        // Since we don't store the master password, we use a different approach:
        // We decrypt a test value or use a stored verification hash
        
        // Better approach: Store a verification hash during registration/login
        // For now, we'll verify by attempting to verify the Argon2 hash
        // But the client sends a SHA-256 hash, not the original password
        
        // Solution: Derive the client hash from the Argon2 password
        // This requires storing the master password temporarily or using a different verification method
        
        // Alternative: Use a challenge-response mechanism
        // For now, we'll use a simplified approach - verify against stored verification hash
        
        // Verify the passwordHash against stored clientAuthHash
        // The client sends a SHA-256 hash, we compare it with the stored encrypted hash
        if (!user.clientAuthHash) {
            return res.status(500).json({ error: 'Account not configured for unlock' });
        }
        
        // Decrypt stored client auth hash
        const [encryptedHash, iv] = user.clientAuthHash.split(':');
        const storedClientHash = decryptServerSide(encryptedHash, iv);
        
        // Constant-time comparison
        const isValid = crypto.timingSafeEqual(
            Buffer.from(passwordHash),
            Buffer.from(storedClientHash)
        );
        
        if (!isValid) {
            // Add random delay
            await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Delete old sessions for this user to ensure clean state
        await prisma.session.deleteMany({
            where: { userId: user.id }
        });

        // Create new session
        const sessionToken = generateToken();
        const expiresAt = new Date(Date.now() + SESSION_EXPIRY_HOURS * 60 * 60 * 1000);

        await prisma.session.create({
            data: {
                userId: user.id,
                token: sessionToken,
                expiresAt,
                lastActivity: new Date(),
            },
        });

        // Generate new JWT
        const accessToken = jwt.sign(
            { userId: user.id, sessionToken },
            process.env.JWT_SECRET,
            { expiresIn: ACCESS_TOKEN_EXPIRY }
        );

        res.json({
            message: 'Session unlocked',
            accessToken,
        });
        
        // Log successful unlock
        await logAudit(AUDIT_ACTIONS.SESSION_UNLOCK, user.id, {}, req);
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ error: 'Invalid token' });
        }
        return res.status(401).json({ error: 'Unlock failed' });
    }
}));

// ========================================
// Logout
// ========================================
router.post('/logout', requireAuth, asyncHandler(async (req, res) => {
    const userId = req.userId;
    
    // Delete current session
    if (req.session) {
        await prisma.session.delete({ where: { id: req.session.id } });
    }

    res.json({ message: 'Logged out successfully' });
    
    // Log logout
    await logAudit(AUDIT_ACTIONS.LOGOUT, userId, {}, req);
}));

// ========================================
// Get Current User
// ========================================
router.get('/me', requireAuth, asyncHandler(async (req, res) => {
    res.json({
        user: {
            id: req.user.id,
            email: req.user.email,
            totpEnabled: req.user.totpEnabled,
            hasSeenOnboarding: req.user.hasSeenOnboarding,
            createdAt: req.user.createdAt,
        },
    });
}));

// ========================================
// Get Audit Logs
// ========================================
router.get('/audit-logs', requireAuth, asyncHandler(async (req, res) => {
    const { limit = 50 } = req.query;
    
    const logs = await getUserAuditLogs(req.userId, parseInt(limit));
    
    res.json({
        logs,
        count: logs.length,
    });
}));

// ========================================
// Get Security Summary
// ========================================
router.get('/security-summary', requireAuth, asyncHandler(async (req, res) => {
    const summary = await getSecuritySummary(req.userId);
    
    res.json(summary);
}));

// ========================================
// Mark Onboarding as Seen
// ========================================
router.post('/onboarding-seen', requireAuth, asyncHandler(async (req, res) => {
    await prisma.user.update({
        where: { id: req.userId },
        data: { hasSeenOnboarding: true },
    });

    res.json({ success: true, message: 'Onboarding marked as seen' });
    
    // Log this action
    await logAudit(AUDIT_ACTIONS.ONBOARDING_COMPLETE, req.userId, {}, req);
}));

export default router;
