/**
 * Advanced Rate Limiter - SecureVault by Nextendo x Micka Delcato
 * Rate limiting par IP, par utilisateur et par endpoint
 */

import rateLimit from 'express-rate-limit';
import Redis from 'ioredis';

// Configuration Redis (optionnel, fallback vers mémoire)
let redis;
try {
    redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
} catch (error) {
    console.log('[RateLimiter] Redis non disponible, utilisation mémoire');
}

// Store en mémoire (fallback)
const memoryStore = new Map();

// Configuration par endpoint
export const RATE_LIMITS = {
    // Auth: Très strict
    LOGIN: {
        windowMs: 15 * 60 * 1000,  // 15 minutes
        max: 5,                     // 5 tentatives
        message: 'Trop de tentatives de connexion. Réessayez dans 15 minutes.',
        skipSuccessfulRequests: true
    },
    
    // API générale
    API: {
        windowMs: 60 * 1000,        // 1 minute
        max: 100,                   // 100 requêtes
        message: 'Limite de requêtes atteinte.'
    },
    
    // Vault: Modéré
    VAULT: {
        windowMs: 60 * 1000,
        max: 30,
        message: 'Trop d\'opérations sur le coffre-fort.'
    },
    
    // Emergency Access: Très strict
    EMERGENCY: {
        windowMs: 60 * 60 * 1000,   // 1 heure
        max: 3,                     // 3 demandes max
        message: 'Limite d\'accès d\'urgence atteinte.'
    },
    
    // Alias: Normal
    ALIAS: {
        windowMs: 60 * 1000,
        max: 50
    },
    
    // Documents: Limité (uploads lourds)
    DOCUMENTS: {
        windowMs: 60 * 1000,
        max: 10,
        message: 'Trop de téléchargements. Attendez une minute.'
    }
};

// Créer un middleware de rate limiting
function createRateLimiter(config, keyGenerator = null) {
    return rateLimit({
        windowMs: config.windowMs,
        max: config.max,
        message: {
            error: config.message || 'Too many requests',
            retryAfter: Math.ceil(config.windowMs / 1000)
        },
        standardHeaders: true,
        legacyHeaders: false,
        
        // Key generator personnalisé (IP + User ID si authentifié)
        keyGenerator: keyGenerator || ((req) => {
            const ip = req.ip || req.connection.remoteAddress;
            const userId = req.userId || 'anonymous';
            return `${ip}:${userId}`;
        }),
        
        // Handler personnalisé
        handler: (req, res, next, options) => {
            res.status(429).json({
                error: options.message.error,
                code: 'RATE_LIMIT_EXCEEDED',
                retryAfter: options.message.retryAfter,
                limit: config.max,
                windowMs: config.windowMs
            });
        },
        
        // Skip certaines requêtes
        skip: (req) => {
            // Skip health checks
            return req.path === '/api/health';
        }
    });
}

// Middlewares spécifiques
export const loginLimiter = createRateLimiter(RATE_LIMITS.LOGIN, (req) => {
    // Rate limit par IP uniquement pour login (même utilisateur différent)
    return req.ip || req.connection.remoteAddress;
});

export const apiLimiter = createRateLimiter(RATE_LIMITS.API);

export const vaultLimiter = createRateLimiter(RATE_LIMITS.VAULT);

export const emergencyLimiter = createRateLimiter(RATE_LIMITS.EMERGENCY, (req) => {
    // Rate limit par utilisateur ET par IP
    const ip = req.ip || req.connection.remoteAddress;
    const userId = req.userId || 'anonymous';
    return `emergency:${ip}:${userId}`;
});

export const aliasLimiter = createRateLimiter(RATE_LIMITS.ALIAS);

export const documentLimiter = createRateLimiter(RATE_LIMITS.DOCUMENTS);

// Rate limiter dynamique par route
export function dynamicRateLimiter(routeType) {
    const config = RATE_LIMITS[routeType] || RATE_LIMITS.API;
    return createRateLimiter(config);
}

// Middleware de surveillance (logging)
export function rateLimitMonitor(req, res, next) {
    const originalJson = res.json;
    
    res.json = function(data) {
        // Si rate limit atteint, logger
        if (res.statusCode === 429) {
            console.warn(`[RateLimit] ${req.ip} - ${req.method} ${req.path} - LIMIT EXCEEDED`);
        }
        
        originalJson.call(this, data);
    };
    
    next();
}

export default {
    loginLimiter,
    apiLimiter,
    vaultLimiter,
    emergencyLimiter,
    aliasLimiter,
    documentLimiter,
    dynamicRateLimiter,
    rateLimitMonitor,
    RATE_LIMITS
};
