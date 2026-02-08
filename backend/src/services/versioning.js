/**
 * Versioning Service - Historique local des modifications
 * Garde les 30 dernières versions de chaque entrée
 */

import prisma from '../config/database.js';

const MAX_VERSIONS = 30;

/**
 * Crée une nouvelle version d'une entrée
 */
export async function createVersion(entryId, userId, action, oldData = null) {
    try {
        // Compter les versions existantes
        const versionCount = await prisma.vaultVersion.count({
            where: { entryId }
        });

        // Supprimer les anciennes versions si on dépasse la limite
        if (versionCount >= MAX_VERSIONS) {
            const oldestVersions = await prisma.vaultVersion.findMany({
                where: { entryId },
                orderBy: { createdAt: 'asc' },
                take: versionCount - MAX_VERSIONS + 1,
                select: { id: true }
            });

            await prisma.vaultVersion.deleteMany({
                where: {
                    id: { in: oldestVersions.map(v => v.id) }
                }
            });
        }

        // Créer la nouvelle version
        const version = await prisma.vaultVersion.create({
            data: {
                entryId,
                userId,
                action, // 'create', 'update', 'delete'
                oldData: oldData ? JSON.stringify(oldData) : null,
                createdAt: new Date(),
            }
        });

        return version;
    } catch (error) {
        console.error('Failed to create version:', error);
        return null;
    }
}

/**
 * Récupère l'historique d'une entrée
 */
export async function getVersionHistory(entryId, userId) {
    const versions = await prisma.vaultVersion.findMany({
        where: {
            entryId,
            userId, // Sécurité : vérifier l'appartenance
        },
        orderBy: { createdAt: 'desc' },
        take: MAX_VERSIONS,
    });

    return versions.map(v => ({
        ...v,
        oldData: v.oldData ? JSON.parse(v.oldData) : null,
    }));
}

/**
 * Restaure une version spécifique
 */
export async function restoreVersion(versionId, userId) {
    const version = await prisma.vaultVersion.findFirst({
        where: {
            id: versionId,
            userId,
        }
    });

    if (!version || !version.oldData) {
        throw new Error('Version not found');
    }

    const oldData = JSON.parse(version.oldData);

    // Sauvegarder l'état actuel avant restauration
    const currentEntry = await prisma.vaultEntry.findFirst({
        where: { id: version.entryId, userId },
    });

    if (currentEntry) {
        await createVersion(
            version.entryId,
            userId,
            'restore_backup',
            {
                encryptedData: currentEntry.encryptedData,
                iv: currentEntry.iv,
                category: currentEntry.category,
                favorite: currentEntry.favorite,
            }
        );

        // Restaurer
        await prisma.vaultEntry.update({
            where: { id: version.entryId },
            data: {
                encryptedData: oldData.encryptedData,
                iv: oldData.iv,
                category: oldData.category,
                favorite: oldData.favorite,
                updatedAt: new Date(),
            }
        });
    }

    return { success: true, restoredData: oldData };
}

/**
 * Compare deux versions
 */
export async function compareVersions(versionId1, versionId2, userId) {
    const [v1, v2] = await Promise.all([
        prisma.vaultVersion.findFirst({
            where: { id: versionId1, userId },
        }),
        prisma.vaultVersion.findFirst({
            where: { id: versionId2, userId },
        })
    ]);

    if (!v1 || !v2) {
        throw new Error('One or both versions not found');
    }

    const data1 = v1.oldData ? JSON.parse(v1.oldData) : {};
    const data2 = v2.oldData ? JSON.parse(v2.oldData) : {};

    // Diff simple
    const diff = {
        changed: [],
        added: [],
        removed: [],
    };

    const keys = new Set([...Object.keys(data1), ...Object.keys(data2)]);
    
    for (const key of keys) {
        if (!(key in data1)) {
            diff.added.push({ field: key, value: data2[key] });
        } else if (!(key in data2)) {
            diff.removed.push({ field: key, value: data1[key] });
        } else if (data1[key] !== data2[key]) {
            diff.changed.push({
                field: key,
                oldValue: data1[key],
                newValue: data2[key],
            });
        }
    }

    return diff;
}

/**
 * Nettoie les vieilles versions (maintenance)
 */
export async function cleanupOldVersions(userId, keepDays = 365) {
    const cutoffDate = new Date(Date.now() - keepDays * 24 * 60 * 60 * 1000);

    const deleted = await prisma.vaultVersion.deleteMany({
        where: {
            userId,
            createdAt: { lt: cutoffDate },
        }
    });

    return deleted.count;
}

export default {
    createVersion,
    getVersionHistory,
    restoreVersion,
    compareVersions,
    cleanupOldVersions,
};
