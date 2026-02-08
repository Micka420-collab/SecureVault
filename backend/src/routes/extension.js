import { Router } from 'express';
import { requireAuth, require2FA } from '../middleware/session.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import prisma from '../config/database.js';
import crypto from 'crypto';
import { body, query, validationResult } from 'express-validator';

const router = Router();

// Cache pour les tokens d'extension (en mémoire)
// Structure: { extensionToken: { userId, createdAt, expiresAt } }
const extensionTokens = new Map();

// Durée de validité d'un token (30 jours)
const TOKEN_DURATION = 30 * 24 * 60 * 60 * 1000;

// ========================================
// Middleware pour vérifier le token d'extension
// ========================================

export function requireExtensionToken(req, res, next) {
    const token = req.headers['x-extension-token'];
    
    if (!token) {
        return res.status(401).json({ error: 'Extension token required' });
    }
    
    const tokenData = extensionTokens.get(token);
    
    if (!tokenData) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
    
    if (Date.now() > tokenData.expiresAt) {
        extensionTokens.delete(token);
        return res.status(401).json({ error: 'Token expired' });
    }
    
    req.userId = tokenData.userId;
    req.extensionToken = token;
    next();
}

// ========================================
// Routes
// ========================================

/**
 * Health check
 * GET /api/extension/health
 */
router.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        version: '1.0.0',
        timestamp: new Date().toISOString(),
    });
});

/**
 * Enregistrer l'extension et obtenir un token
 * POST /api/extension/register
 * Auth: JWT requis
 */
router.post('/register',
    requireAuth,
    [
        body('deviceName').optional().isString().trim(),
        body('browser').optional().isString().trim(),
    ],
    asyncHandler(async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { deviceName = 'Browser Extension', browser = 'Unknown' } = req.body;
        
        // Générer un token unique
        const token = crypto.randomBytes(32).toString('base64url');
        const now = Date.now();
        
        // Stocker le token
        extensionTokens.set(token, {
            userId: req.userId,
            deviceName,
            browser,
            createdAt: now,
            expiresAt: now + TOKEN_DURATION,
            lastUsedAt: now,
        });
        
        // Créer une entrée d'audit
        await prisma.auditLog.create({
            data: {
                userId: req.userId,
                action: 'EXTENSION_REGISTERED',
                details: JSON.stringify({ deviceName, browser }),
                ipAddress: req.ip || 'unknown',
                userAgent: req.headers['user-agent'],
            },
        });
        
        res.json({
            success: true,
            token,
            expiresAt: new Date(now + TOKEN_DURATION).toISOString(),
        });
    })
);

/**
 * Révoquer un token d'extension
 * DELETE /api/extension/revoke
 */
router.delete('/revoke',
    requireExtensionToken,
    asyncHandler(async (req, res) => {
        extensionTokens.delete(req.extensionToken);
        
        await prisma.auditLog.create({
            data: {
                userId: req.userId,
                action: 'EXTENSION_REVOKED',
                ipAddress: req.ip || 'unknown',
                userAgent: req.headers['user-agent'],
            },
        });
        
        res.json({ success: true });
    })
);

/**
 * Obtenir les credentials pour un domaine
 * GET /api/extension/credentials
 * Auth: Extension Token requis
 */
router.get('/credentials',
    requireExtensionToken,
    [
        query('url').isURL().withMessage('Valid URL required'),
    ],
    asyncHandler(async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const url = new URL(req.query.url);
        const domain = url.hostname;
        
        // Mettre à jour lastUsedAt
        const tokenData = extensionTokens.get(req.extensionToken);
        tokenData.lastUsedAt = Date.now();
        
        // Récupérer les entrées du vault de l'utilisateur
        const entries = await prisma.vaultEntry.findMany({
            where: { 
                userId: req.userId,
                category: 'login', // Uniquement les logins
            },
            select: {
                id: true,
                encryptedData: true,
                iv: true,
                category: true,
                favorite: true,
                createdAt: true,
                updatedAt: true,
            },
        });
        
        // Filtrer par domaine (les données sont chiffrées, on ne peut pas filtrer côté serveur)
        // On retourne toutes les entrées de type login, le client filtrera
        // Note: En production, on pourrait indexer les domaines en clair pour un filtrage serveur
        
        res.json({
            entries: entries.map(entry => ({
                id: entry.id,
                encryptedData: entry.encryptedData,
                iv: entry.iv,
                category: entry.category,
                favorite: entry.favorite,
                createdAt: entry.createdAt,
                updatedAt: entry.updatedAt,
            })),
            domain,
        });
    })
);

/**
 * Sauvegarder un nouveau credential
 * POST /api/extension/save
 * Auth: Extension Token requis
 */
router.post('/save',
    requireExtensionToken,
    [
        body('url').isURL().withMessage('Valid URL required'),
        body('encryptedData').isString().withMessage('Encrypted data required'),
        body('iv').isString().withMessage('IV required'),
        body('authTag').isString().withMessage('Auth tag required'),
        body('title').optional().isString().trim(),
    ],
    asyncHandler(async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { url, encryptedData, iv, authTag, title } = req.body;
        const urlObj = new URL(url);
        const hostname = urlObj.hostname;
        
        // Créer l'entrée
        const entry = await prisma.vaultEntry.create({
            data: {
                userId: req.userId,
                title: title || hostname,
                encryptedData,
                iv,
                authTag,
                category: 'login',
            },
        });
        
        // Audit log
        await prisma.auditLog.create({
            data: {
                userId: req.userId,
                action: 'ENTRY_CREATED',
                details: JSON.stringify({ 
                    entryId: entry.id, 
                    title: entry.title,
                    source: 'extension',
                }),
                ipAddress: req.ip || 'unknown',
                userAgent: req.headers['user-agent'],
            },
        });
        
        res.status(201).json({
            success: true,
            entry: {
                id: entry.id,
                title: entry.title,
                createdAt: entry.createdAt,
            },
        });
    })
);

/**
 * Logger une action d'auto-fill (pour audit)
 * POST /api/extension/log
 * Auth: Extension Token requis
 */
router.post('/log',
    requireExtensionToken,
    [
        body('action').isIn(['FILL', 'COPY_PASSWORD', 'COPY_USERNAME']),
        body('entryId').isUUID().optional(),
        body('url').isURL().optional(),
    ],
    asyncHandler(async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { action, entryId, url } = req.body;
        
        await prisma.auditLog.create({
            data: {
                userId: req.userId,
                action: `EXTENSION_${action}`,
                details: JSON.stringify({ entryId, url }),
                ipAddress: req.ip || 'unknown',
                userAgent: req.headers['user-agent'],
            },
        });
        
        res.json({ success: true });
    })
);

/**
 * Générer un mot de passe
 * GET /api/extension/generate-password
 */
router.get('/generate-password',
    requireExtensionToken,
    asyncHandler(async (req, res) => {
        const length = Math.min(Math.max(parseInt(req.query.length) || 16, 8), 64);
        const includeUppercase = req.query.uppercase !== 'false';
        const includeNumbers = req.query.numbers !== 'false';
        const includeSymbols = req.query.symbols !== 'false';
        
        const lowercase = 'abcdefghijklmnopqrstuvwxyz';
        const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const numbers = '0123456789';
        const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';
        
        let chars = lowercase;
        if (includeUppercase) chars += uppercase;
        if (includeNumbers) chars += numbers;
        if (includeSymbols) chars += symbols;
        
        let password = '';
        const array = new Uint32Array(length);
        crypto.getRandomValues(array);
        
        for (let i = 0; i < length; i++) {
            password += chars[array[i] % chars.length];
        }
        
        // S'assurer d'avoir au moins un caractère de chaque type requis
        const randomInt = (max) => {
            return crypto.randomInt(0, max);
        };
        
        if (includeUppercase && !/[A-Z]/.test(password)) {
            const pos = randomInt(password.length);
            password = password.slice(0, pos) + uppercase[randomInt(uppercase.length)] + password.slice(pos + 1);
        }
        if (includeNumbers && !/[0-9]/.test(password)) {
            const pos = randomInt(password.length);
            password = password.slice(0, pos) + numbers[randomInt(numbers.length)] + password.slice(pos + 1);
        }
        if (includeSymbols && !/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password)) {
            const pos = randomInt(password.length);
            password = password.slice(0, pos) + symbols[randomInt(symbols.length)] + password.slice(pos + 1);
        }
        
        res.json({ password });
    })
);

/**
 * Obtenir la liste des sessions d'extension actives
 * GET /api/extension/sessions
 * Auth: JWT requis
 */
router.get('/sessions',
    requireAuth,
    asyncHandler(async (req, res) => {
        const sessions = [];
        
        for (const [token, data] of extensionTokens.entries()) {
            if (data.userId === req.userId) {
                sessions.push({
                    deviceName: data.deviceName,
                    browser: data.browser,
                    createdAt: new Date(data.createdAt).toISOString(),
                    lastUsedAt: new Date(data.lastUsedAt).toISOString(),
                    expiresAt: new Date(data.expiresAt).toISOString(),
                    isCurrent: false, // TODO: identifier la session courante
                });
            }
        }
        
        res.json({ sessions });
    })
);

export default router;
