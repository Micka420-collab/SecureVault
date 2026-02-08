/**
 * Email Routes - SecureVault by Nextendo x Micka Delcato
 */

import express from 'express';
import prisma from '../config/database.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { requireAuth } from '../middleware/session.js';
import { logAudit, AUDIT_ACTIONS } from '../middleware/auditLog.js';

const router = express.Router();

// All email routes require authentication
router.use(requireAuth);

/**
 * Validate UUID format
 */
function isValidUUID(id) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

// ========================================
// List Emails for an Alias
// ========================================
/**
 * Validate pagination parameters
 */
function validatePagination(page, limit) {
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    
    if (isNaN(pageNum) || pageNum < 1 || pageNum > 1000) {
        return { valid: false, error: 'Invalid page number' };
    }
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
        return { valid: false, error: 'Invalid limit (max 100)' };
    }
    return { valid: true, page: pageNum, limit: limitNum };
}

router.get('/alias/:aliasId', asyncHandler(async (req, res) => {
    const { aliasId } = req.params;
    const { page = 1, limit = 20, unreadOnly } = req.query;
    
    // Validate pagination
    const pagination = validatePagination(page, limit);
    if (!pagination.valid) {
        return res.status(400).json({ error: pagination.error });
    }

    // Verify alias ownership
    const alias = await prisma.alias.findFirst({
        where: { id: aliasId, userId: req.userId },
    });

    if (!alias) {
        return res.status(404).json({ error: 'Alias not found' });
    }

    const where = { aliasId };
    if (unreadOnly === 'true') {
        where.isRead = false;
    }

    const [emails, total] = await Promise.all([
        prisma.email.findMany({
            where,
            orderBy: { receivedAt: 'desc' },
            skip: (pagination.page - 1) * pagination.limit,
            take: pagination.limit,
            select: {
                id: true,
                fromAddress: true,
                subject: true,
                receivedAt: true,
                isRead: true,
                isStarred: true,
            },
        }),
        prisma.email.count({ where }),
    ]);

    res.json({
        emails,
        pagination: {
            page: pagination.page,
            limit: pagination.limit,
            total,
            pages: Math.ceil(total / pagination.limit),
        },
    });
}));

// ========================================
// List All Emails (across all aliases)
// ========================================
router.get('/', asyncHandler(async (req, res) => {
    const { page = 1, limit = 20, unreadOnly, starred } = req.query;
    
    // Validate pagination
    const pagination = validatePagination(page, limit);
    if (!pagination.valid) {
        return res.status(400).json({ error: pagination.error });
    }

    const where = {
        alias: { userId: req.userId },
    };

    if (unreadOnly === 'true') {
        where.isRead = false;
    }

    if (starred === 'true') {
        where.isStarred = true;
    }

    const [emails, total] = await Promise.all([
        prisma.email.findMany({
            where,
            orderBy: { receivedAt: 'desc' },
            skip: (pagination.page - 1) * pagination.limit,
            take: pagination.limit,
            select: {
                id: true,
                fromAddress: true,
                subject: true,
                receivedAt: true,
                isRead: true,
                isStarred: true,
                alias: {
                    select: {
                        id: true,
                        aliasAddress: true,
                        label: true,
                    },
                },
            },
        }),
        prisma.email.count({ where }),
    ]);

    res.json({
        emails,
        pagination: {
            page: pagination.page,
            limit: pagination.limit,
            total,
            pages: Math.ceil(total / pagination.limit),
        },
    });
}));

// ========================================
// Get Single Email
// ========================================
router.get('/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    if (!isValidUUID(id)) {
        return res.status(400).json({ error: 'Invalid email ID format' });
    }

    const email = await prisma.email.findFirst({
        where: {
            id,
            alias: { userId: req.userId },
        },
        include: {
            alias: {
                select: {
                    id: true,
                    aliasAddress: true,
                    label: true,
                },
            },
        },
    });

    if (!email) {
        return res.status(404).json({ error: 'Email not found' });
    }

    // Mark as read
    if (!email.isRead) {
        await prisma.email.update({
            where: { id },
            data: { isRead: true },
        });
    }

    res.json({ email });
    
    // Log email read
    if (!email.isRead) {
        await logAudit(AUDIT_ACTIONS.EMAIL_READ, req.userId, {
            emailId: email.id,
            aliasId: email.aliasId,
            fromAddress: email.fromAddress,
        }, req);
    }
}));

// ========================================
// Mark Email as Read/Unread
// ========================================
router.patch('/:id/read', asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    if (!isValidUUID(id)) {
        return res.status(400).json({ error: 'Invalid email ID format' });
    }
    const { isRead } = req.body;

    const email = await prisma.email.findFirst({
        where: { id, alias: { userId: req.userId } },
    });

    if (!email) {
        return res.status(404).json({ error: 'Email not found' });
    }

    const updated = await prisma.email.update({
        where: { id },
        data: { isRead: isRead !== undefined ? isRead : true },
        select: { id: true, isRead: true },
    });

    res.json({ email: updated });
    
    // Log email read status change
    if (isRead !== undefined && isRead !== email.isRead) {
        await logAudit(AUDIT_ACTIONS.EMAIL_READ, req.userId, {
            emailId: id,
            markedAsRead: isRead,
        }, req);
    }
}));

// ========================================
// Toggle Star
// ========================================
router.patch('/:id/star', asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    if (!isValidUUID(id)) {
        return res.status(400).json({ error: 'Invalid email ID format' });
    }

    const email = await prisma.email.findFirst({
        where: { id, alias: { userId: req.userId } },
    });

    if (!email) {
        return res.status(404).json({ error: 'Email not found' });
    }

    const updated = await prisma.email.update({
        where: { id },
        data: { isStarred: !email.isStarred },
        select: { id: true, isStarred: true },
    });

    res.json({ email: updated });
}));

// ========================================
// Delete Email
// ========================================
router.delete('/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    if (!isValidUUID(id)) {
        return res.status(400).json({ error: 'Invalid email ID format' });
    }

    const email = await prisma.email.findFirst({
        where: { id, alias: { userId: req.userId } },
    });

    if (!email) {
        return res.status(404).json({ error: 'Email not found' });
    }

    await prisma.email.delete({ where: { id } });

    res.json({ message: 'Email deleted successfully' });
    
    // Log single email deletion
    await logAudit(AUDIT_ACTIONS.EMAIL_DELETE, req.userId, {
        emailId: id,
    }, req);
}));

// ========================================
// Bulk Mark as Read
// ========================================
router.post('/bulk/read', asyncHandler(async (req, res) => {
    const { emailIds } = req.body;

    if (!Array.isArray(emailIds)) {
        return res.status(400).json({ error: 'emailIds must be an array' });
    }
    
    if (emailIds.length === 0 || emailIds.length > 100) {
        return res.status(400).json({ error: 'Invalid number of email IDs (1-100 allowed)' });
    }
    
    // Validate all IDs format
    if (!emailIds.every(isValidUUID)) {
        return res.status(400).json({ error: 'Invalid email ID format in array' });
    }

    // Verify ownership of all emails
    const emails = await prisma.email.findMany({
        where: {
            id: { in: emailIds },
            alias: { userId: req.userId },
        },
    });

    if (emails.length !== emailIds.length) {
        return res.status(403).json({ error: 'Some emails not found or unauthorized' });
    }

    await prisma.email.updateMany({
        where: { id: { in: emailIds } },
        data: { isRead: true },
    });

    res.json({ message: 'Emails marked as read', count: emails.length });
    
    // Log bulk email read
    await logAudit(AUDIT_ACTIONS.EMAIL_READ, req.userId, {
        bulk: true,
        count: emails.length,
    }, req);
}));

// ========================================
// Bulk Delete
// ========================================
router.delete('/bulk/delete', asyncHandler(async (req, res) => {
    const { emailIds } = req.body;

    if (!Array.isArray(emailIds)) {
        return res.status(400).json({ error: 'emailIds must be an array' });
    }
    
    if (emailIds.length === 0 || emailIds.length > 100) {
        return res.status(400).json({ error: 'Invalid number of email IDs (1-100 allowed)' });
    }
    
    // Validate all IDs format
    if (!emailIds.every(isValidUUID)) {
        return res.status(400).json({ error: 'Invalid email ID format in array' });
    }

    // Verify ownership of all emails
    const emails = await prisma.email.findMany({
        where: {
            id: { in: emailIds },
            alias: { userId: req.userId },
        },
    });

    if (emails.length !== emailIds.length) {
        return res.status(403).json({ error: 'Some emails not found or unauthorized' });
    }

    await prisma.email.deleteMany({
        where: { id: { in: emailIds } },
    });

    res.json({ message: 'Emails deleted', count: emails.length });
    
    // Log bulk email deletion
    await logAudit(AUDIT_ACTIONS.EMAIL_BULK_DELETE, req.userId, {
        count: emails.length,
    }, req);
}));

// ========================================
// Get Unread Count
// ========================================
router.get('/stats/unread', asyncHandler(async (req, res) => {
    const count = await prisma.email.count({
        where: {
            alias: { userId: req.userId },
            isRead: false,
        },
    });

    res.json({ unreadCount: count });
}));

export default router;
