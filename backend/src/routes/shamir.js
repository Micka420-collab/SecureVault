/**
 * Shamir's Secret Sharing Routes - SecureVault by Nextendo x Micka Delcato
 * API pour le partage de secret
 */

import express from 'express';
import { requireAuth } from '../middleware/session.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import shamirService from '../services/shamirService.js';
import prisma from '../config/database.js';
import { logAudit, AUDIT_ACTIONS } from '../middleware/auditLog.js';

const router = express.Router();

/**
 * Créer un partage de secret
 * POST /api/shamir/split
 * Body: { secret: string (base64), totalShares: number, threshold: number }
 */
router.post('/split', requireAuth, asyncHandler(async (req, res) => {
    const { secret, totalShares, threshold, description } = req.body;

    // Validation
    if (!secret || !totalShares || !threshold) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    if (threshold < 2 || threshold > totalShares || totalShares > 255) {
        return res.status(400).json({ error: 'Invalid threshold or totalShares' });
    }

    try {
        // Découper le secret
        const shares = shamirService.split(
            Buffer.from(secret, 'base64'),
            parseInt(totalShares),
            parseInt(threshold)
        );

        // Sauvegarder les métadonnées dans la base
        const shamirConfig = await prisma.shamirShare.create({
            data: {
                userId: req.userId,
                totalShares: parseInt(totalShares),
                threshold: parseInt(threshold),
                description: description || 'Shamir Secret Share',
                // Les parts ne sont PAS stockées sur le serveur!
                // L'utilisateur doit les conserver
            }
        });

        // Logger
        await logAudit(AUDIT_ACTIONS.SHAMIR_CREATED, req.userId, {
            totalShares,
            threshold,
            configId: shamirConfig.id
        }, req);

        res.json({
            success: true,
            configId: shamirConfig.id,
            shares: shares,
            warning: 'IMPORTANT: Store these shares securely! The server does NOT keep a copy.',
            instructions: `You need at least ${threshold} of ${totalShares} shares to reconstruct your secret.`
        });

    } catch (error) {
        console.error('[Shamir] Split error:', error);
        res.status(500).json({ error: 'Failed to split secret', details: error.message });
    }
}));

/**
 * Reconstruire un secret
 * POST /api/shamir/combine
 * Body: { shares: Array<{x, y}> }
 */
router.post('/combine', requireAuth, asyncHandler(async (req, res) => {
    const { shares } = req.body;

    if (!Array.isArray(shares) || shares.length === 0) {
        return res.status(400).json({ error: 'Shares array required' });
    }

    try {
        // Validation
        const validation = shamirService.validateShares(shares);
        if (!validation.valid) {
            return res.status(400).json({ error: validation.error });
        }

        // Reconstruire le secret
        const secret = shamirService.combine(shares);

        // Logger (ne pas logger le secret!)
        await logAudit(AUDIT_ACTIONS.SHAMIR_RECONSTRUCTED, req.userId, {
            shareCount: shares.length,
            threshold: validation.threshold
        }, req);

        res.json({
            success: true,
            secret: secret.toString('base64'),
            reconstructedFrom: shares.length,
            threshold: validation.threshold
        });

    } catch (error) {
        console.error('[Shamir] Combine error:', error);
        res.status(500).json({ error: 'Failed to reconstruct secret', details: error.message });
    }
}));

/**
 * Vérifier la validité des parts
 * POST /api/shamir/validate
 */
router.post('/validate', requireAuth, asyncHandler(async (req, res) => {
    const { shares } = req.body;

    const validation = shamirService.validateShares(shares);
    
    res.json({
        valid: validation.valid,
        ...validation
    });
}));

/**
 * Lister les configurations Shamir de l'utilisateur
 * GET /api/shamir/configs
 */
router.get('/configs', requireAuth, asyncHandler(async (req, res) => {
    const configs = await prisma.shamirShare.findMany({
        where: { userId: req.userId },
        orderBy: { createdAt: 'desc' },
        select: {
            id: true,
            description: true,
            totalShares: true,
            threshold: true,
            createdAt: true,
            // Ne jamais retourner les parts!
        }
    });

    res.json({ configs });
}));

/**
 * Supprimer une configuration
 * DELETE /api/shamir/configs/:id
 */
router.delete('/configs/:id', requireAuth, asyncHandler(async (req, res) => {
    const { id } = req.params;

    const config = await prisma.shamirShare.findFirst({
        where: { id, userId: req.userId }
    });

    if (!config) {
        return res.status(404).json({ error: 'Config not found' });
    }

    await prisma.shamirShare.delete({ where: { id } });

    await logAudit(AUDIT_ACTIONS.SHAMIR_DELETED, req.userId, { configId: id }, req);

    res.json({ success: true, message: 'Shamir configuration deleted' });
}));

/**
 * Générer un guide de récupération
 * POST /api/shamir/recovery-guide
 */
router.post('/recovery-guide', requireAuth, asyncHandler(async (req, res) => {
    const { configId } = req.body;

    const config = await prisma.shamirShare.findFirst({
        where: { id: configId, userId: req.userId }
    });

    if (!config) {
        return res.status(404).json({ error: 'Config not found' });
    }

    const guide = {
        title: 'Guide de Récupération SecureVault',
        description: config.description,
        threshold: config.threshold,
        totalShares: config.totalShares,
        instructions: [
            `Vous devez rassembler ${config.threshold} parts parmi ${config.totalShares} pour reconstruire votre secret.`,
            'Chaque part est une valeur cryptographique unique.',
            'Ne perdez pas vos parts! Sans elles, le secret est irrécupérable.',
            'Vous pouvez utiliser n\'importe quelle combinaison de ' + config.threshold + ' parts.'
        ],
        warnings: [
            'NE stockez jamais plusieurs parts au même endroit.',
            'Gardez une part dans un coffre-fort bancaire.',
            'Donnez des parts à des personnes de confiance (famille, avocat).',
            'Testez la reconstruction avant de compter dessus!'
        ],
        reconstructionSteps: [
            'Rassemblez au moins ' + config.threshold + ' parts.',
            'Accédez à SecureVault > Sécurité > Récupération Shamir.',
            'Entrez vos parts dans l\'ordre ou le désordre.',
            'Le secret sera reconstruit temporairement.',
            'Utilisez-le immédiatement ou stockez-le en lieu sûr.'
        ],
        support: 'Pour toute aide, contactez support@securevault.app'
    };

    res.json(guide);
}));

export default router;
