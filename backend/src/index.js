import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import routes
import authRoutes from './routes/auth.js';
import vaultRoutes from './routes/vault.js';
import aliasRoutes from './routes/alias.js';
import emailRoutes from './routes/email.js';
import securityRoutes from './routes/security.js';
import extensionRoutes from './routes/extension.js';
import extensionDownloadRoutes from './routes/extensionDownload.js';
import documentRoutes from './routes/documents.js';

// Import middleware
import { errorHandler } from './middleware/errorHandler.js';
import { sessionMiddleware } from './middleware/session.js';

const app = express();
const PORT = process.env.PORT || 3001;

// ========================================
// Security Middleware
// ========================================
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "blob:"],
        },
    },
    crossOriginEmbedderPolicy: false,
}));

// CORS configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
    'http://localhost:5173',
    'http://localhost:3000',
    process.env.FRONTEND_URL
].filter(Boolean);

// Extension origins (chrome-extension:// and moz-extension://)
const isExtensionOrigin = (origin) => {
    return origin?.startsWith('chrome-extension://') || 
           origin?.startsWith('moz-extension://') ||
           origin?.startsWith('safari-extension://');
};

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, curl, etc.)
        if (!origin) return callback(null, true);
        
        // Allow browser extensions
        if (isExtensionOrigin(origin)) {
            return callback(null, true);
        }
        
        // Allow configured origins
        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        
        callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Extension-Token'],
    exposedHeaders: ['X-Request-Id'],
    maxAge: 86400,
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { error: 'Too many requests, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api', limiter);

// Stricter rate limit for auth endpoints
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: { error: 'Too many authentication attempts, please try again later.' },
    skipSuccessfulRequests: true,
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/unlock', authLimiter);

// Rate limit for 2FA endpoints
const twoFALimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { error: 'Too many 2FA attempts, please try again later.' },
});
app.use('/api/auth/2fa/', twoFALimiter);

// Rate limit for vault operations
const vaultLimiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 60,
    message: { error: 'Too many vault operations, please slow down.' },
});
app.use('/api/vault', vaultLimiter);

// Rate limit for email fetching
const emailLimiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 30,
    message: { error: 'Too many email requests, please slow down.' },
});
app.use('/api/emails', emailLimiter);

// Rate limit for extension endpoints
const extensionLimiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 30,
    message: { error: 'Too many extension requests, please slow down.' },
});
app.use('/api/extension', extensionLimiter);

// Rate limit for document operations (more lenient for uploads)
const documentLimiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 20,
    message: { error: 'Too many document requests, please slow down.' },
});
app.use('/api/documents', documentLimiter);

// ========================================
// Body Parsing
// ========================================
// Higher limit for document uploads (100MB for large files)
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));
app.use(cookieParser());

// ========================================
// Session Management
// ========================================
app.use(sessionMiddleware);

// ========================================
// Health Check
// ========================================
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: '2.0.0',
        features: ['audit-log', 'versioning', 'secure-share', 'emergency-access', 'diceware', 'secure-documents'],
    });
});

// ========================================
// API Routes
// ========================================
app.use('/api/auth', authRoutes);
app.use('/api/vault', vaultRoutes);
app.use('/api/aliases', aliasRoutes);
app.use('/api/emails', emailRoutes);
app.use('/api/security', securityRoutes);
app.use('/api/extension', extensionRoutes);
app.use('/api/extension', extensionDownloadRoutes);
app.use('/api/documents', documentRoutes);

// ========================================
// Error Handling
// ========================================
app.use(errorHandler);

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
});

// ========================================
// Start Server
// ========================================
app.listen(PORT, () => {
    console.log(`🔐 SecureVault API running on port ${PORT}`);
    console.log(`📋 Health check: http://localhost:${PORT}/api/health`);
    console.log('🔐 SecureVault by Nextendo x Micka Delcato - Server ready');
    console.log(`🔒 Security Score: http://localhost:${PORT}/api/security/score`);
    console.log(`📦 Features: Audit Log, Versioning, Secure Share, Emergency Access, Diceware, Secure Documents`);
});

export default app;
