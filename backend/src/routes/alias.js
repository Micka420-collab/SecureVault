/**
 * Alias Routes - SecureVault by Nextendo x Micka Delcato
 */

import express from 'express';
import prisma from '../config/database.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { requireAuth } from '../middleware/session.js';
import { generateEmailAlias, encryptServerSide } from '../crypto/encryption.js';
import { logAudit, AUDIT_ACTIONS } from '../middleware/auditLog.js';

const router = express.Router();

// All alias routes require authentication
router.use(requireAuth);

/**
 * Validate UUID format
 */
function isValidUUID(id) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

// ========================================
// List Aliases
// ========================================
router.get('/', asyncHandler(async (req, res) => {
    const { active } = req.query;

    const where = {
        userId: req.userId,
    };

    if (active !== undefined) {
        where.isActive = active === 'true';
    }

    const aliases = await prisma.alias.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        select: {
            id: true,
            aliasAddress: true,
            label: true,
            description: true,
            isActive: true,
            createdAt: true,
            updatedAt: true,
            _count: {
                select: { emails: true },
            },
        },
    });

    res.json({
        aliases: aliases.map(alias => ({
            ...alias,
            emailCount: alias._count.emails,
            _count: undefined,
        })),
    });
}));

// ========================================
// Get Single Alias
// ========================================
router.get('/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    if (!isValidUUID(id)) {
        return res.status(400).json({ error: 'Invalid alias ID format' });
    }

    const alias = await prisma.alias.findFirst({
        where: {
            id,
            userId: req.userId,
        },
        include: {
            vaultEntry: {
                select: {
                    id: true,
                    category: true,
                },
            },
            _count: {
                select: { emails: true },
            },
        },
    });

    if (!alias) {
        return res.status(404).json({ error: 'Alias not found' });
    }

    res.json({
        alias: {
            ...alias,
            emailCount: alias._count.emails,
            _count: undefined,
        },
    });
}));

// ========================================
// Create Alias
// ========================================
/**
 * Validate alias input
 */
function validateAliasLabel(label) {
    if (!label || typeof label !== 'string') {
        return { valid: false, error: 'Label is required' };
    }
    if (label.length < 1 || label.length > 100) {
        return { valid: false, error: 'Label must be between 1 and 100 characters' };
    }
    // Allow alphanumeric, spaces, and common punctuation
    if (!/^[\p{L}\p{N}\s\-_.,()[\]{}]+$/u.test(label)) {
        return { valid: false, error: 'Label contains invalid characters' };
    }
    return { valid: true };
}

function validatePrefix(prefix) {
    if (!prefix) return { valid: true };
    if (typeof prefix !== 'string') {
        return { valid: false, error: 'Invalid prefix format' };
    }
    if (prefix.length > 30) {
        return { valid: false, error: 'Prefix too long (max 30 chars)' };
    }
    if (!/^[a-z0-9]*$/.test(prefix)) {
        return { valid: false, error: 'Prefix must be lowercase alphanumeric' };
    }
    return { valid: true };
}

router.post('/', asyncHandler(async (req, res) => {
    const { label, description, prefix, vaultEntryId } = req.body;
    const mailDomain = process.env.MAIL_DOMAIN;

    if (!mailDomain) {
        return res.status(500).json({ error: 'Mail domain not configured' });
    }

    // Validate label
    const labelValidation = validateAliasLabel(label);
    if (!labelValidation.valid) {
        return res.status(400).json({ error: labelValidation.error });
    }
    
    // Validate prefix
    const prefixValidation = validatePrefix(prefix);
    if (!prefixValidation.valid) {
        return res.status(400).json({ error: prefixValidation.error });
    }
    
    // Validate description length
    if (description && description.length > 500) {
        return res.status(400).json({ error: 'Description too long (max 500 chars)' });
    }

    // Check alias limit per user (prevent abuse)
    const aliasCount = await prisma.alias.count({
        where: { userId: req.userId }
    });
    
    if (aliasCount >= 100) {
        return res.status(400).json({ error: 'Maximum number of aliases (100) reached' });
    }

    // Get user's real email
    const user = await prisma.user.findUnique({
        where: { id: req.userId },
        select: { realEmail: true },
    });

    if (!user?.realEmail) {
        return res.status(400).json({ error: 'Real email not configured. Please update your profile.' });
    }

    // Generate unique alias address
    const aliasAddress = generateEmailAlias(mailDomain, prefix);

    // Create alias
    const alias = await prisma.alias.create({
        data: {
            userId: req.userId,
            aliasAddress,
            label,
            description,
            forwardTo: user.realEmail,
            vaultEntryId: vaultEntryId || null,
        },
        select: {
            id: true,
            aliasAddress: true,
            label: true,
            description: true,
            isActive: true,
            createdAt: true,
        },
    });

    res.status(201).json({ alias });
    
    // Log alias creation
    await logAudit(AUDIT_ACTIONS.ALIAS_CREATE, req.userId, {
        aliasId: alias.id,
        aliasAddress: alias.aliasAddress,
        label: alias.label,
    }, req);
}));

// ========================================
// Update Alias
// ========================================
router.put('/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    if (!isValidUUID(id)) {
        return res.status(400).json({ error: 'Invalid alias ID format' });
    }
    const { label, description } = req.body;

    // Verify ownership
    const existing = await prisma.alias.findFirst({
        where: { id, userId: req.userId },
    });

    if (!existing) {
        return res.status(404).json({ error: 'Alias not found' });
    }

    const updateData = {};
    if (label !== undefined) updateData.label = label;
    if (description !== undefined) updateData.description = description;

    const alias = await prisma.alias.update({
        where: { id },
        data: updateData,
        select: {
            id: true,
            aliasAddress: true,
            label: true,
            description: true,
            isActive: true,
            updatedAt: true,
        },
    });

    res.json({ alias });
    
    // Log alias update
    await logAudit(AUDIT_ACTIONS.ALIAS_UPDATE, req.userId, {
        aliasId: alias.id,
        label: alias.label,
    }, req);
}));

// ========================================
// Toggle Alias Active Status
// ========================================
router.patch('/:id/toggle', asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    if (!isValidUUID(id)) {
        return res.status(400).json({ error: 'Invalid alias ID format' });
    }

    const existing = await prisma.alias.findFirst({
        where: { id, userId: req.userId },
    });

    if (!existing) {
        return res.status(404).json({ error: 'Alias not found' });
    }

    const alias = await prisma.alias.update({
        where: { id },
        data: { isActive: !existing.isActive },
        select: {
            id: true,
            aliasAddress: true,
            isActive: true,
        },
    });

    res.json({
        alias,
        message: alias.isActive ? 'Alias activated' : 'Alias deactivated',
    });
    
    // Log alias toggle
    await logAudit(AUDIT_ACTIONS.ALIAS_TOGGLE, req.userId, {
        aliasId: alias.id,
        isActive: alias.isActive,
    }, req);
}));

// ========================================
// Delete Alias
// ========================================
router.delete('/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    if (!isValidUUID(id)) {
        return res.status(400).json({ error: 'Invalid alias ID format' });
    }

    // Verify ownership
    const existing = await prisma.alias.findFirst({
        where: { id, userId: req.userId },
    });

    if (!existing) {
        return res.status(404).json({ error: 'Alias not found' });
    }

    // Delete alias (cascades to emails)
    await prisma.alias.delete({ where: { id } });

    res.json({ message: 'Alias deleted successfully' });
    
    // Log alias deletion
    await logAudit(AUDIT_ACTIONS.ALIAS_DELETE, req.userId, {
        aliasId: id,
    }, req);
}));

// ========================================
// Get Alias Statistics
// ========================================
router.get('/stats/summary', asyncHandler(async (req, res) => {
    const stats = await prisma.alias.aggregate({
        where: { userId: req.userId },
        _count: { id: true },
    });

    const activeCount = await prisma.alias.count({
        where: { userId: req.userId, isActive: true },
    });

    const emailCount = await prisma.email.count({
        where: {
            alias: { userId: req.userId },
        },
    });

    res.json({
        totalAliases: stats._count.id,
        activeAliases: activeCount,
        totalEmails: emailCount,
    });
}));

export default router;
