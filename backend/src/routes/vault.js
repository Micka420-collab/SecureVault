/**
 * Vault Routes - SecureVault by Nextendo x Micka Delcato
 */

import express from 'express';
import prisma from '../config/database.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { requireAuth } from '../middleware/session.js';
import { logAudit, AUDIT_ACTIONS } from '../middleware/auditLog.js';

const router = express.Router();

// All vault routes require authentication
router.use(requireAuth);

/**
 * Validate UUID format
 */
function isValidUUID(id) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

// ========================================
// List Vault Entries
// ========================================
router.get('/', asyncHandler(async (req, res) => {
    const { category, search, favorite } = req.query;

    const where = {
        userId: req.userId,
    };

    // Validate category
    if (category) {
        const validCategories = ['login', 'card', 'identity', 'note', 'password'];
        if (!validCategories.includes(category)) {
            return res.status(400).json({ error: 'Invalid category filter' });
        }
        where.category = category;
    }

    if (favorite === 'true') {
        where.favorite = true;
    }
    
    // Validate search parameter length
    if (search && (typeof search !== 'string' || search.length > 100)) {
        return res.status(400).json({ error: 'Search query too long' });
    }

    const entries = await prisma.vaultEntry.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
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

    res.json({ entries });
}));

// ========================================
// Get Single Vault Entry
// ========================================
router.get('/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    if (!isValidUUID(id)) {
        return res.status(400).json({ error: 'Invalid entry ID format' });
    }

    const entry = await prisma.vaultEntry.findFirst({
        where: {
            id,
            userId: req.userId,
        },
        include: {
            alias: {
                select: {
                    id: true,
                    aliasAddress: true,
                    label: true,
                    isActive: true,
                },
            },
        },
    });

    if (!entry) {
        return res.status(404).json({ error: 'Entry not found' });
    }

    res.json({ entry });
}));

// ========================================
// Create Vault Entry
// ========================================
/**
 * Validate vault entry data
 */
function validateVaultEntry(data) {
    if (!data || typeof data !== 'string') {
        return { valid: false, error: 'Invalid data format' };
    }
    // Base64 validation
    if (!/^[A-Za-z0-9+/]*={0,2}$/.test(data)) {
        return { valid: false, error: 'Invalid data encoding' };
    }
    if (data.length > 10000) { // Max 10KB
        return { valid: false, error: 'Data too large' };
    }
    return { valid: true };
}

router.post('/', asyncHandler(async (req, res) => {
    const { encryptedData, iv, category } = req.body;

    if (!encryptedData || !iv) {
        return res.status(400).json({ error: 'Encrypted data and IV are required' });
    }
    
    // Validate data format and size
    const dataValidation = validateVaultEntry(encryptedData);
    if (!dataValidation.valid) {
        return res.status(400).json({ error: dataValidation.error });
    }
    
    const ivValidation = validateVaultEntry(iv);
    if (!ivValidation.valid) {
        return res.status(400).json({ error: 'Invalid IV format' });
    }
    
    // Validate category
    const validCategories = ['login', 'card', 'identity', 'note', 'password'];
    if (category && !validCategories.includes(category)) {
        return res.status(400).json({ error: 'Invalid category' });
    }

    const entry = await prisma.vaultEntry.create({
        data: {
            userId: req.userId,
            encryptedData,
            iv,
            category: category || 'login',
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

    res.status(201).json({ entry });
}));

// ========================================
// Update Vault Entry
// ========================================
router.put('/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    if (!isValidUUID(id)) {
        return res.status(400).json({ error: 'Invalid entry ID format' });
    }
    const { encryptedData, iv, category, favorite } = req.body;

    // Verify ownership
    const existing = await prisma.vaultEntry.findFirst({
        where: { id, userId: req.userId },
    });

    if (!existing) {
        return res.status(404).json({ error: 'Entry not found' });
    }

    const updateData = {};
    if (encryptedData !== undefined) updateData.encryptedData = encryptedData;
    if (iv !== undefined) updateData.iv = iv;
    if (category !== undefined) updateData.category = category;
    if (favorite !== undefined) updateData.favorite = favorite;

    const entry = await prisma.vaultEntry.update({
        where: { id },
        data: updateData,
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

    res.json({ entry });
    
    // Log vault entry update
    await logAudit(AUDIT_ACTIONS.VAULT_ENTRY_UPDATE, req.userId, {
        entryId: entry.id,
        category: entry.category,
    }, req);
}));

// ========================================
// Toggle Favorite
// ========================================
router.patch('/:id/favorite', asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    if (!isValidUUID(id)) {
        return res.status(400).json({ error: 'Invalid entry ID format' });
    }

    const existing = await prisma.vaultEntry.findFirst({
        where: { id, userId: req.userId },
    });

    if (!existing) {
        return res.status(404).json({ error: 'Entry not found' });
    }

    const entry = await prisma.vaultEntry.update({
        where: { id },
        data: { favorite: !existing.favorite },
        select: {
            id: true,
            favorite: true,
        },
    });

    res.json({ entry });
}));

// ========================================
// Delete Vault Entry
// ========================================
router.delete('/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    if (!isValidUUID(id)) {
        return res.status(400).json({ error: 'Invalid entry ID format' });
    }

    // Verify ownership
    const existing = await prisma.vaultEntry.findFirst({
        where: { id, userId: req.userId },
    });

    if (!existing) {
        return res.status(404).json({ error: 'Entry not found' });
    }

    await prisma.vaultEntry.delete({ where: { id } });

    res.json({ message: 'Entry deleted successfully' });
    
    // Log vault entry deletion
    await logAudit(AUDIT_ACTIONS.VAULT_ENTRY_DELETE, req.userId, {
        entryId: id,
    }, req);
}));

// ========================================
// Export All Entries (encrypted)
// ========================================
router.get('/export/all', asyncHandler(async (req, res) => {
    const entries = await prisma.vaultEntry.findMany({
        where: { userId: req.userId },
        select: {
            encryptedData: true,
            iv: true,
            category: true,
            createdAt: true,
        },
    });

    res.json({
        exportDate: new Date().toISOString(),
        count: entries.length,
        entries,
    });
    
    // Log vault export
    await logAudit(AUDIT_ACTIONS.VAULT_EXPORT, req.userId, {
        count: entries.length,
    }, req);
}));

// ========================================
// Import Entries (encrypted)
// ========================================
router.post('/import', asyncHandler(async (req, res) => {
    const { entries } = req.body;

    if (!Array.isArray(entries)) {
        return res.status(400).json({ error: 'Entries must be an array' });
    }
    
    // Limit import size
    if (entries.length > 1000) {
        return res.status(400).json({ error: 'Cannot import more than 1000 entries at once' });
    }
    
    // Validate each entry
    for (const entry of entries) {
        if (!entry.encryptedData || !entry.iv) {
            return res.status(400).json({ error: 'Each entry must have encryptedData and iv' });
        }
        const validation = validateVaultEntry(entry.encryptedData);
        if (!validation.valid) {
            return res.status(400).json({ error: 'Invalid entry data format' });
        }
    }

    const created = await prisma.vaultEntry.createMany({
        data: entries.map(entry => ({
            userId: req.userId,
            encryptedData: entry.encryptedData,
            iv: entry.iv,
            category: entry.category || 'login',
        })),
    });

    res.status(201).json({
        message: 'Import successful',
        count: created.count,
    });
    
    // Log vault import
    await logAudit(AUDIT_ACTIONS.VAULT_IMPORT, req.userId, {
        count: created.count,
    }, req);
}));

export default router;
