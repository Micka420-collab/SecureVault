/**
 * Search Routes - SecureVault by Nextendo x Micka Delcato
 * Recherche dans documents (OCR) et vault
 */

import express from 'express';
import prisma from '../config/database.js';
import { requireAuth } from '../middleware/session.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import ocrService from '../services/ocrService.js';

const router = express.Router();

/**
 * Recherche globale (vault + documents OCR)
 * GET /api/search?q=query&type=all|vault|documents
 */
router.get('/', requireAuth, asyncHandler(async (req, res) => {
    const { q: query, type = 'all', limit = 20 } = req.query;
    
    if (!query || query.length < 2) {
        return res.status(400).json({ error: 'Query must be at least 2 characters' });
    }

    const normalizedQuery = query.toLowerCase().trim();
    const results = {
        query: normalizedQuery,
        vault: [],
        documents: [],
        total: 0
    };

    // Recherche dans le vault
    if (type === 'all' || type === 'vault') {
        const vaultEntries = await prisma.vaultEntry.findMany({
            where: {
                userId: req.userId,
                OR: [
                    { encryptedData: { contains: normalizedQuery } }, // Note: les données sont chiffrées
                    // Pour recherche réelle, il faudrait indexer les titres déchiffrés côté client
                ]
            },
            take: parseInt(limit)
        });

        // Filtrer côté serveur (les données sont chiffrées)
        // En production, la recherche vault se fait côté client
        results.vault = vaultEntries.map(entry => ({
            id: entry.id,
            type: 'vault',
            category: entry.category,
            createdAt: entry.createdAt
        }));
    }

    // Recherche OCR dans les documents
    if (type === 'all' || type === 'documents') {
        // Recherche dans les documents avec texte OCR indexé
        const documents = await prisma.secureDocument.findMany({
            where: {
                userId: req.userId,
                ocrText: {
                    contains: normalizedQuery,
                    mode: 'insensitive'
                }
            },
            take: parseInt(limit)
        });

        results.documents = documents.map(doc => ({
            id: doc.id,
            type: 'document',
            mimeType: doc.mimeType,
            category: doc.category,
            sizeBytes: doc.sizeBytes,
            ocrConfidence: doc.ocrConfidence,
            createdAt: doc.createdAt
        }));
    }

    results.total = results.vault.length + results.documents.length;

    res.json(results);
}));

/**
 * Indexer un document pour OCR
 * POST /api/search/index/:documentId
 */
router.post('/index/:documentId', requireAuth, asyncHandler(async (req, res) => {
    const { documentId } = req.params;

    const document = await prisma.secureDocument.findFirst({
        where: {
            id: documentId,
            userId: req.userId
        }
    });

    if (!document) {
        return res.status(404).json({ error: 'Document not found' });
    }

    // Vérifier si le document supporte l'OCR
    const supportedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/tiff'];
    if (!supportedTypes.includes(document.mimeType)) {
        return res.status(400).json({ 
            error: 'Document type not supported for OCR',
            supportedTypes 
        });
    }

    // Indexer le document
    const filePath = document.storagePath;
    const indexResult = await ocrService.indexDocument(
        documentId, 
        filePath, 
        document.mimeType
    );

    if (!indexResult) {
        return res.status(500).json({ error: 'OCR indexing failed' });
    }

    // Mettre à jour le document avec le texte OCR
    await prisma.secureDocument.update({
        where: { id: documentId },
        data: {
            ocrText: indexResult.text,
            ocrConfidence: indexResult.confidence,
            ocrPages: indexResult.pages,
            ocrIndexedAt: indexResult.indexedAt
        }
    });

    res.json({
        success: true,
        documentId,
        confidence: indexResult.confidence,
        pages: indexResult.pages,
        textPreview: indexResult.text.substring(0, 200) + '...'
    });
}));

/**
 * Statistiques de recherche
 * GET /api/search/stats
 */
router.get('/stats', requireAuth, asyncHandler(async (req, res) => {
    const stats = await prisma.secureDocument.aggregate({
        where: {
            userId: req.userId,
            ocrText: { not: null }
        },
        _count: { id: true },
        _avg: { ocrConfidence: true }
    });

    const byType = await prisma.secureDocument.groupBy({
        by: ['category'],
        where: {
            userId: req.userId,
            ocrText: { not: null }
        },
        _count: { id: true }
    });

    res.json({
        totalIndexed: stats._count.id,
        averageConfidence: Math.round(stats._avg.ocrConfidence || 0),
        byType: byType.map(t => ({
            category: t.category,
            count: t._count.id
        }))
    });
}));

export default router;
