/**
 * Audit Logging Middleware
 * Tracks security-relevant actions for monitoring and compliance
 */
import prisma from '../config/database.js';

// Actions à tracer
export const AUDIT_ACTIONS = {
    // Auth
    LOGIN_SUCCESS: 'LOGIN_SUCCESS',
    LOGIN_FAILURE: 'LOGIN_FAILURE',
    LOGOUT: 'LOGOUT',
    SESSION_UNLOCK: 'SESSION_UNLOCK',
    SESSION_LOCK: 'SESSION_LOCK',
    PASSWORD_CHANGE: 'PASSWORD_CHANGE',
    ONBOARDING_COMPLETE: 'ONBOARDING_COMPLETE',
    
    // 2FA
    TOTP_SETUP: 'TOTP_SETUP',
    TOTP_VERIFY: 'TOTP_VERIFY',
    TOTP_DISABLE: 'TOTP_DISABLE',
    
    // Vault
    VAULT_ENTRY_CREATE: 'VAULT_ENTRY_CREATE',
    VAULT_ENTRY_UPDATE: 'VAULT_ENTRY_UPDATE',
    VAULT_ENTRY_DELETE: 'VAULT_ENTRY_DELETE',
    VAULT_EXPORT: 'VAULT_EXPORT',
    VAULT_IMPORT: 'VAULT_IMPORT',
    
    // Aliases
    ALIAS_CREATE: 'ALIAS_CREATE',
    ALIAS_UPDATE: 'ALIAS_UPDATE',
    ALIAS_DELETE: 'ALIAS_DELETE',
    ALIAS_TOGGLE: 'ALIAS_TOGGLE',
    
    // Emails
    EMAIL_READ: 'EMAIL_READ',
    EMAIL_DELETE: 'EMAIL_DELETE',
    EMAIL_BULK_DELETE: 'EMAIL_BULK_DELETE',
    
    // Account
    ACCOUNT_CREATE: 'ACCOUNT_CREATE',
    ACCOUNT_DELETE: 'ACCOUNT_DELETE',
    SETTINGS_UPDATE: 'SETTINGS_UPDATE',
    
    // Security
    SUSPICIOUS_ACTIVITY: 'SUSPICIOUS_ACTIVITY',
    RATE_LIMIT_HIT: 'RATE_LIMIT_HIT',
    INVALID_TOKEN: 'INVALID_TOKEN',
    
    // Documents
    DOCUMENT_UPLOADED: 'DOCUMENT_UPLOADED',
    DOCUMENT_DOWNLOADED: 'DOCUMENT_DOWNLOADED',
    DOCUMENT_DELETED: 'DOCUMENT_DELETED',
    DOCUMENT_UPDATED: 'DOCUMENT_UPDATED',
    DOCUMENTS_BATCH_DELETED: 'DOCUMENTS_BATCH_DELETED',
};

/**
 * Log an audit event
 */
export async function logAudit(action, userId, details = {}, req = null) {
    try {
        const logEntry = {
            action,
            userId,
            details: JSON.stringify(sanitizeDetails(details)),
            ipAddress: req?.ip || req?.connection?.remoteAddress || 'unknown',
            userAgent: req?.headers?.['user-agent'] || 'unknown',
            timestamp: new Date(),
        };

        // Log to console for immediate visibility
        console.log(`[AUDIT] ${action} | User: ${userId || 'anonymous'} | IP: ${logEntry.ipAddress}`);

        // Store in database (fire and forget)
        await prisma.auditLog.create({
            data: logEntry,
        }).catch(err => {
            // Don't throw if audit logging fails
            console.error('[AUDIT] Failed to store log:', err.message);
        });

        // Alert on suspicious activity
        if (action === AUDIT_ACTIONS.SUSPICIOUS_ACTIVITY || 
            action === AUDIT_ACTIONS.RATE_LIMIT_HIT) {
            console.warn(`[SECURITY ALERT] ${action} detected for user ${userId}`);
        }
    } catch (error) {
        console.error('[AUDIT] Logging error:', error);
    }
}

/**
 * Audit middleware factory
 */
export function audit(action, getDetails = null) {
    return async (req, res, next) => {
        // Store original end function
        const originalEnd = res.end;
        
        // Override end to capture response status
        res.end = function(...args) {
            res.end = originalEnd;
            res.end(...args);
            
            // Only log successful operations
            if (res.statusCode < 400) {
                const details = getDetails ? getDetails(req, res) : {};
                logAudit(action, req.userId, details, req);
            }
        };
        
        next();
    };
}

/**
 * Sanitize sensitive details before logging
 */
function sanitizeDetails(details) {
    const sensitiveFields = ['password', 'passwordHash', 'secret', 'token', 'key', 'iv', 'encrypted'];
    const sanitized = {};
    
    for (const [key, value] of Object.entries(details)) {
        if (sensitiveFields.some(f => key.toLowerCase().includes(f))) {
            sanitized[key] = '[REDACTED]';
        } else if (typeof value === 'object' && value !== null) {
            sanitized[key] = sanitizeDetails(value);
        } else {
            sanitized[key] = value;
        }
    }
    
    return sanitized;
}

/**
 * Get recent audit logs for a user
 */
export async function getUserAuditLogs(userId, limit = 50) {
    return prisma.auditLog.findMany({
        where: { userId },
        orderBy: { timestamp: 'desc' },
        take: limit,
        select: {
            id: true,
            action: true,
            details: true,
            ipAddress: true,
            timestamp: true,
        },
    }).then(logs => logs.map(log => ({
        ...log,
        details: log.details ? JSON.parse(log.details) : null,
    })));
}

/**
 * Get security summary for user
 */
export async function getSecuritySummary(userId) {
    const now = new Date();
    const last24h = new Date(now - 24 * 60 * 60 * 1000);
    const last7d = new Date(now - 7 * 24 * 60 * 60 * 1000);
    
    const [
        failedLogins24h,
        totalActions24h,
        uniqueIPs24h,
        failedLogins7d,
    ] = await Promise.all([
        prisma.auditLog.count({
            where: {
                userId,
                action: AUDIT_ACTIONS.LOGIN_FAILURE,
                timestamp: { gte: last24h },
            },
        }),
        prisma.auditLog.count({
            where: {
                userId,
                timestamp: { gte: last24h },
            },
        }),
        prisma.auditLog.groupBy({
            by: ['ipAddress'],
            where: {
                userId,
                timestamp: { gte: last24h },
            },
            _count: { ipAddress: true },
        }),
        prisma.auditLog.count({
            where: {
                userId,
                action: AUDIT_ACTIONS.LOGIN_FAILURE,
                timestamp: { gte: last7d },
            },
        }),
    ]);
    
    return {
        failedLogins24h,
        totalActions24h,
        uniqueIPs24h: uniqueIPs24h.length,
        failedLogins7d,
        riskLevel: calculateRiskLevel(failedLogins24h, uniqueIPs24h.length),
    };
}

function calculateRiskLevel(failedLogins, uniqueIPs) {
    if (failedLogins > 10 || uniqueIPs > 5) return 'HIGH';
    if (failedLogins > 5 || uniqueIPs > 3) return 'MEDIUM';
    return 'LOW';
}
