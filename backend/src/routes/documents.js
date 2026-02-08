/**
 * Documents Routes - SecureVault by Nextendo x Micka Delcato
 */

import { Router } from 'express';
import { requireAuth } from '../middleware/session.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import prisma from '../config/database.js';
import { body, param, validationResult } from 'express-validator';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

const router = Router();

// Configuration
const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE) || 500 * 1024 * 1024; // 500MB default
const ALLOWED_MIME_TYPES = [
    // Videos
    'video/mp4',
    'video/webm',
    'video/ogg',
    'video/quicktime',
    'video/x-msvideo',
    'video/x-matroska',
    // Documents
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/markdown',
    // Images
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    // Audio
    'audio/mpeg',
    'audio/ogg',
    'audio/wav',
    'audio/webm',
];

// Ensure upload directory exists
async function ensureUploadDir() {
    try {
        await fs.access(UPLOAD_DIR);
    } catch {
        await fs.mkdir(UPLOAD_DIR, { recursive: true });
    }
}

ensureUploadDir();

// Helper: Get user storage directory
function getUserDir(userId) {
    return path.join(UPLOAD_DIR, userId);
}

// Helper: Ensure user directory exists
async function ensureUserDir(userId) {
    const userDir = getUserDir(userId);
    try {
        await fs.access(userDir);
    } catch {
        await fs.mkdir(userDir, { recursive: true });
    }
    return userDir;
}

// Helper: Format bytes to human readable
function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// ========================================
// Routes
// ========================================

/**
 * Get storage stats for current user
 * GET /api/documents/stats
 */
router.get('/stats',
    requireAuth,
    asyncHandler(async (req, res) => {
        const documents = await prisma.secureDocument.findMany({
            where: { userId: req.userId },
            select: { sizeBytes: true, category: true },
        });

        const stats = {
            totalFiles: documents.length,
            totalSize: documents.reduce((sum, d) => sum + d.sizeBytes, 0),
            byCategory: {},
        };

        for (const doc of documents) {
            stats.byCategory[doc.category] = (stats.byCategory[doc.category] || 0) + doc.sizeBytes;
        }

        // Convert sizes to human readable
        stats.totalSizeFormatted = formatBytes(stats.totalSize);
        for (const cat in stats.byCategory) {
            stats.byCategory[cat] = {
                bytes: stats.byCategory[cat],
                formatted: formatBytes(stats.byCategory[cat]),
            };
        }

        res.json(stats);
    })
);

/**
 * List documents with filtering
 * GET /api/documents?category=&search=&favorite=&limit=&offset=
 */
router.get('/',
    requireAuth,
    asyncHandler(async (req, res) => {
        const { 
            category, 
            search, 
            favorite, 
            limit = '50', 
            offset = '0',
            sortBy = 'createdAt',
            sortOrder = 'desc'
        } = req.query;

        const where = { userId: req.userId };
        
        if (category && category !== 'all') {
            where.category = category;
        }
        
        if (favorite === 'true') {
            where.favorite = true;
        }

        const orderBy = {};
        orderBy[sortBy] = sortOrder;

        const documents = await prisma.secureDocument.findMany({
            where,
            orderBy,
            take: parseInt(limit),
            skip: parseInt(offset),
            select: {
                id: true,
                encryptedName: true,
                nameIv: true,
                mimeType: true,
                sizeBytes: true,
                category: true,
                tags: true,
                thumbnailPath: true,
                favorite: true,
                createdAt: true,
                updatedAt: true,
            },
        });

        const total = await prisma.secureDocument.count({ where });

        res.json({
            documents,
            total,
            limit: parseInt(limit),
            offset: parseInt(offset),
        });
    })
);

/**
 * Get single document metadata
 * GET /api/documents/:id
 */
router.get('/:id',
    requireAuth,
    [param('id').isUUID()],
    asyncHandler(async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const document = await prisma.secureDocument.findFirst({
            where: { 
                id: req.params.id,
                userId: req.userId,
            },
        });

        if (!document) {
            return res.status(404).json({ error: 'Document not found' });
        }

        res.json(document);
    })
);

/**
 * Upload a new document
 * POST /api/documents
 * 
 * Expected body (multipart/form-data):
 * - file: the encrypted file blob
 * - encryptedName: encrypted filename
 * - nameIv: IV for filename
 * - fileIv: IV for file content
 * - fileAuthTag: Auth tag for AES-GCM
 * - mimeType: MIME type
 * - category: video/document/image/audio/other
 * - tags: JSON array of encrypted tags (optional)
 * - thumbnail: encrypted thumbnail blob (optional)
 * - thumbnailIv: IV for thumbnail (optional)
 */
router.post('/',
    requireAuth,
    asyncHandler(async (req, res) => {
        // In a real implementation, you'd use multer or similar for multipart upload
        // For this example, we assume the file is sent as base64 in the body
        // In production, use streaming with multipart/form-data
        
        const {
            encryptedData,      // Base64 encoded encrypted file
            encryptedName,      // Encrypted filename
            nameIv,             // IV for filename
            fileIv,             // IV for file content
            fileAuthTag,        // Auth tag for file
            mimeType,
            category = 'other',
            tags,
            thumbnailData,      // Optional thumbnail
            thumbnailIv,
            sizeBytes,          // Original size (unencrypted)
        } = req.body;

        // Validation
        if (!encryptedData || !encryptedName || !nameIv || !fileIv || !fileAuthTag) {
            return res.status(400).json({ error: 'Missing required encryption fields' });
        }

        if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
            return res.status(400).json({ error: 'File type not allowed' });
        }

        const fileSize = Buffer.from(encryptedData, 'base64').length;
        if (fileSize > MAX_FILE_SIZE) {
            return res.status(400).json({ 
                error: 'File too large',
                maxSize: MAX_FILE_SIZE,
                maxSizeFormatted: formatBytes(MAX_FILE_SIZE),
            });
        }

        // Ensure user directory exists
        const userDir = await ensureUserDir(req.userId);
        
        // Generate unique filename
        const fileId = crypto.randomUUID();
        const filePath = path.join(userDir, `${fileId}.enc`);
        
        // Save encrypted file
        await fs.writeFile(filePath, Buffer.from(encryptedData, 'base64'));

        // Save thumbnail if provided
        let thumbnailPath = null;
        if (thumbnailData) {
            thumbnailPath = path.join(userDir, `${fileId}.thumb.enc`);
            await fs.writeFile(thumbnailPath, Buffer.from(thumbnailData, 'base64'));
        }

        // Create database record
        const document = await prisma.secureDocument.create({
            data: {
                userId: req.userId,
                encryptedName,
                nameIv,
                mimeType,
                sizeBytes: sizeBytes || fileSize,
                category: ['video', 'document', 'image', 'audio', 'other'].includes(category) 
                    ? category 
                    : 'other',
                tags,
                fileIv,
                fileAuthTag,
                storagePath: `${req.userId}/${fileId}.enc`,
                thumbnailPath: thumbnailPath ? `${req.userId}/${fileId}.thumb.enc` : null,
                thumbnailIv,
            },
        });

        // Audit log
        await prisma.auditLog.create({
            data: {
                userId: req.userId,
                action: 'DOCUMENT_UPLOADED',
                details: JSON.stringify({ 
                    documentId: document.id, 
                    category,
                    sizeBytes: document.sizeBytes,
                }),
                ipAddress: req.ip || 'unknown',
                userAgent: req.headers['user-agent'],
            },
        });

        res.status(201).json({
            success: true,
            document: {
                id: document.id,
                encryptedName: document.encryptedName,
                nameIv: document.nameIv,
                mimeType: document.mimeType,
                sizeBytes: document.sizeBytes,
                category: document.category,
                createdAt: document.createdAt,
            },
        });
    })
);

/**
 * Download/decrypt a document
 * GET /api/documents/:id/download
 */
router.get('/:id/download',
    requireAuth,
    [param('id').isUUID()],
    asyncHandler(async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const document = await prisma.secureDocument.findFirst({
            where: { 
                id: req.params.id,
                userId: req.userId,
            },
        });

        if (!document) {
            return res.status(404).json({ error: 'Document not found' });
        }

        const filePath = path.join(UPLOAD_DIR, document.storagePath);
        
        try {
            const encryptedData = await fs.readFile(filePath);
            
            // Return encrypted data - client will decrypt
            res.json({
                id: document.id,
                encryptedData: encryptedData.toString('base64'),
                fileIv: document.fileIv,
                fileAuthTag: document.fileAuthTag,
                encryptedName: document.encryptedName,
                nameIv: document.nameIv,
                mimeType: document.mimeType,
                sizeBytes: document.sizeBytes,
            });

            // Audit log
            await prisma.auditLog.create({
                data: {
                    userId: req.userId,
                    action: 'DOCUMENT_DOWNLOADED',
                    details: JSON.stringify({ documentId: document.id }),
                    ipAddress: req.ip || 'unknown',
                    userAgent: req.headers['user-agent'],
                },
            });
        } catch (error) {
            if (error.code === 'ENOENT') {
                return res.status(404).json({ error: 'File not found on storage' });
            }
            throw error;
        }
    })
);

/**
 * Stream video for preview (for encrypted videos, returns encrypted chunks)
 * GET /api/documents/:id/stream
 */
router.get('/:id/stream',
    requireAuth,
    [param('id').isUUID()],
    asyncHandler(async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const document = await prisma.secureDocument.findFirst({
            where: { 
                id: req.params.id,
                userId: req.userId,
            },
        });

        if (!document) {
            return res.status(404).json({ error: 'Document not found' });
        }

        if (!document.mimeType.startsWith('video/')) {
            return res.status(400).json({ error: 'Not a video file' });
        }

        const filePath = path.join(UPLOAD_DIR, document.storagePath);
        
        try {
            const stat = await fs.stat(filePath);
            const fileSize = stat.size;
            const range = req.headers.range;

            if (range) {
                // Handle range requests for video streaming
                const parts = range.replace(/bytes=/, "").split("-");
                const start = parseInt(parts[0], 10);
                const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
                const chunksize = (end - start) + 1;
                
                // Note: For encrypted files, range requests need special handling
                // The client must download chunks and decrypt them properly
                // This is a simplified implementation
                
                const file = await fs.open(filePath, 'r');
                const buffer = Buffer.alloc(chunksize);
                await file.read(buffer, 0, chunksize, start);
                await file.close();

                res.writeHead(206, {
                    'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                    'Accept-Ranges': 'bytes',
                    'Content-Length': chunksize,
                    'Content-Type': 'application/octet-stream',
                    'X-Document-Id': document.id,
                    'X-Encryption-Iv': document.fileIv,
                    'X-Encryption-Auth-Tag': document.fileAuthTag,
                });
                res.end(buffer);
            } else {
                // Full file download
                const encryptedData = await fs.readFile(filePath);
                res.set({
                    'Content-Type': 'application/octet-stream',
                    'Content-Length': fileSize,
                    'X-Document-Id': document.id,
                    'X-Encryption-Iv': document.fileIv,
                    'X-Encryption-Auth-Tag': document.fileAuthTag,
                });
                res.send(encryptedData);
            }
        } catch (error) {
            if (error.code === 'ENOENT') {
                return res.status(404).json({ error: 'File not found on storage' });
            }
            throw error;
        }
    })
);

/**
 * Get thumbnail
 * GET /api/documents/:id/thumbnail
 */
router.get('/:id/thumbnail',
    requireAuth,
    [param('id').isUUID()],
    asyncHandler(async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const document = await prisma.secureDocument.findFirst({
            where: { 
                id: req.params.id,
                userId: req.userId,
            },
        });

        if (!document || !document.thumbnailPath) {
            return res.status(404).json({ error: 'Thumbnail not found' });
        }

        const thumbnailPath = path.join(UPLOAD_DIR, document.thumbnailPath);
        const encryptedData = await fs.readFile(thumbnailPath);

        res.json({
            encryptedData: encryptedData.toString('base64'),
            thumbnailIv: document.thumbnailIv,
        });
    })
);

/**
 * Update document metadata
 * PATCH /api/documents/:id
 */
router.patch('/:id',
    requireAuth,
    [
        param('id').isUUID(),
        body('encryptedName').optional().isString(),
        body('nameIv').optional().isString(),
        body('category').optional().isIn(['video', 'document', 'image', 'audio', 'other']),
        body('tags').optional().isString(),
        body('favorite').optional().isBoolean(),
    ],
    asyncHandler(async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { encryptedName, nameIv, category, tags, favorite } = req.body;

        const document = await prisma.secureDocument.findFirst({
            where: { 
                id: req.params.id,
                userId: req.userId,
            },
        });

        if (!document) {
            return res.status(404).json({ error: 'Document not found' });
        }

        const updated = await prisma.secureDocument.update({
            where: { id: req.params.id },
            data: {
                ...(encryptedName && { encryptedName }),
                ...(nameIv && { nameIv }),
                ...(category && { category }),
                ...(tags !== undefined && { tags }),
                ...(favorite !== undefined && { favorite }),
            },
        });

        // Audit log
        await prisma.auditLog.create({
            data: {
                userId: req.userId,
                action: 'DOCUMENT_UPDATED',
                details: JSON.stringify({ documentId: document.id }),
                ipAddress: req.ip || 'unknown',
                userAgent: req.headers['user-agent'],
            },
        });

        res.json({
            success: true,
            document: updated,
        });
    })
);

/**
 * Delete a document
 * DELETE /api/documents/:id
 */
router.delete('/:id',
    requireAuth,
    [param('id').isUUID()],
    asyncHandler(async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const document = await prisma.secureDocument.findFirst({
            where: { 
                id: req.params.id,
                userId: req.userId,
            },
        });

        if (!document) {
            return res.status(404).json({ error: 'Document not found' });
        }

        // Delete files from storage
        try {
            const filePath = path.join(UPLOAD_DIR, document.storagePath);
            await fs.unlink(filePath);
            
            if (document.thumbnailPath) {
                const thumbPath = path.join(UPLOAD_DIR, document.thumbnailPath);
                await fs.unlink(thumbPath);
            }
        } catch (error) {
            // Log but continue - file might already be deleted
            console.error('Error deleting file:', error);
        }

        // Delete from database
        await prisma.secureDocument.delete({
            where: { id: req.params.id },
        });

        // Audit log
        await prisma.auditLog.create({
            data: {
                userId: req.userId,
                action: 'DOCUMENT_DELETED',
                details: JSON.stringify({ 
                    documentId: document.id,
                    category: document.category,
                    sizeBytes: document.sizeBytes,
                }),
                ipAddress: req.ip || 'unknown',
                userAgent: req.headers['user-agent'],
            },
        });

        res.json({ success: true });
    })
);

/**
 * Batch operations
 * POST /api/documents/batch
 */
router.post('/batch',
    requireAuth,
    asyncHandler(async (req, res) => {
        const { operation, ids } = req.body;

        if (!Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ error: 'No document IDs provided' });
        }

        if (ids.length > 100) {
            return res.status(400).json({ error: 'Too many documents (max 100)' });
        }

        switch (operation) {
            case 'delete':
                // Verify ownership and delete
                const docs = await prisma.secureDocument.findMany({
                    where: {
                        id: { in: ids },
                        userId: req.userId,
                    },
                });

                for (const doc of docs) {
                    try {
                        await fs.unlink(path.join(UPLOAD_DIR, doc.storagePath));
                        if (doc.thumbnailPath) {
                            await fs.unlink(path.join(UPLOAD_DIR, doc.thumbnailPath));
                        }
                    } catch (e) {
                        console.error('Error deleting file:', e);
                    }
                }

                await prisma.secureDocument.deleteMany({
                    where: {
                        id: { in: ids },
                        userId: req.userId,
                    },
                });

                await prisma.auditLog.create({
                    data: {
                        userId: req.userId,
                        action: 'DOCUMENTS_BATCH_DELETED',
                        details: JSON.stringify({ count: docs.length }),
                        ipAddress: req.ip || 'unknown',
                        userAgent: req.headers['user-agent'],
                    },
                });

                res.json({ success: true, deleted: docs.length });
                break;

            case 'favorite':
                await prisma.secureDocument.updateMany({
                    where: {
                        id: { in: ids },
                        userId: req.userId,
                    },
                    data: { favorite: true },
                });
                res.json({ success: true });
                break;

            case 'unfavorite':
                await prisma.secureDocument.updateMany({
                    where: {
                        id: { in: ids },
                        userId: req.userId,
                    },
                    data: { favorite: false },
                });
                res.json({ success: true });
                break;

            default:
                res.status(400).json({ error: 'Unknown operation' });
        }
    })
);

export default router;
