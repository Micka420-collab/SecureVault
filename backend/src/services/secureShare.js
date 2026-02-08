/**
 * Secure Share Service - Partage auto-destructible 100% local
 * Aucune donnée n'est envoyée à des services externes
 */

import prisma from '../config/database.js';
import crypto from 'crypto';

/**
 * Crée un lien de partage sécurisé
 */
export async function createSecureShare(userId, data, options = {}) {
    const {
        maxViews = 1,
        expireHours = 24,
        password = null, // Optionnel : mot de passe additionnel
    } = options;

    // Générer une clé aléatoire pour le chiffrement
    const shareKey = crypto.randomBytes(32);
    const salt = crypto.randomBytes(16).toString('base64');
    const iv = crypto.randomBytes(12);

    // Chiffrer les données
    const cipher = crypto.createCipheriv('aes-256-gcm', shareKey, iv);
    let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'base64');
    encrypted += cipher.final('base64');
    const authTag = cipher.getAuthTag();

    // Combiner encrypted + authTag
    const encryptedData = `${encrypted}:${authTag.toString('base64')}`;

    // Calculer la date d'expiration
    const expiresAt = new Date(Date.now() + expireHours * 60 * 60 * 1000);

    // Créer l'entrée en base
    const share = await prisma.secureShare.create({
        data: {
            userId,
            encryptedData,
            iv: iv.toString('base64'),
            salt,
            maxViews,
            currentViews: 0,
            expiresAt,
        }
    });

    // Générer le token d'accès (partie de l'URL)
    // Ce token contient la clé de déchiffrement, jamais stockée en base
    const token = Buffer.from(shareKey).toString('base64url');
    const shareId = share.id;

    return {
        shareId,
        token,
        url: `/share/${shareId}#${token}`, // Fragment pour ne pas envoyer au serveur
        expiresAt,
        maxViews,
    };
}

/**
 * Récupère les données d'un partage
 */
export async function accessSecureShare(shareId, providedToken) {
    const share = await prisma.secureShare.findUnique({
        where: { id: shareId }
    });

    if (!share) {
        throw new Error('Share not found or expired');
    }

    // Vérifier expiration
    if (new Date() > share.expiresAt) {
        // Auto-cleanup
        await prisma.secureShare.delete({ where: { id: shareId } });
        throw new Error('Share has expired');
    }

    // Vérifier nombre de vues
    if (share.currentViews >= share.maxViews) {
        await prisma.secureShare.delete({ where: { id: shareId } });
        throw new Error('Maximum views reached');
    }

    try {
        // Reconstruire la clé depuis le token
        const shareKey = Buffer.from(providedToken, 'base64url');
        
        // Déchiffrer
        const [encrypted, authTagBase64] = share.encryptedData.split(':');
        const authTag = Buffer.from(authTagBase64, 'base64');
        const iv = Buffer.from(share.iv, 'base64');

        const decipher = crypto.createDecipheriv('aes-256-gcm', shareKey, iv);
        decipher.setAuthTag(authTag);
        
        let decrypted = decipher.update(encrypted, 'base64', 'utf8');
        decrypted += decipher.final('utf8');

        // Incrémenter le compteur de vues
        const updatedShare = await prisma.secureShare.update({
            where: { id: shareId },
            data: { currentViews: { increment: 1 } }
        });

        // Si c'était la dernière vue, supprimer
        if (updatedShare.currentViews >= share.maxViews) {
            await prisma.secureShare.delete({ where: { id: shareId } });
        }

        return {
            data: JSON.parse(decrypted),
            remainingViews: share.maxViews - updatedShare.currentViews,
        };

    } catch (error) {
        throw new Error('Invalid or corrupted share');
    }
}

/**
 * Supprime un partage (par le créateur)
 */
export async function revokeShare(shareId, userId) {
    const share = await prisma.secureShare.findFirst({
        where: { id: shareId, userId }
    });

    if (!share) {
        throw new Error('Share not found');
    }

    await prisma.secureShare.delete({ where: { id: shareId } });
    return { success: true };
}

/**
 * Liste les partages actifs d'un utilisateur
 */
export async function listActiveShares(userId) {
    const shares = await prisma.secureShare.findMany({
        where: {
            userId,
            expiresAt: { gt: new Date() },
            currentViews: { lt: prisma.secureShare.fields.maxViews }
        },
        orderBy: { createdAt: 'desc' },
        select: {
            id: true,
            maxViews: true,
            currentViews: true,
            expiresAt: true,
            createdAt: true,
        }
    });

    return shares.map(s => ({
        ...s,
        url: `/share/${s.id}`,
        isExpired: false,
        remainingViews: s.maxViews - s.currentViews,
    }));
}

/**
 * Nettoyage automatique des partages expirés
 * À appeler via cron job toutes les heures
 */
export async function cleanupExpiredShares() {
    const expired = await prisma.secureShare.deleteMany({
        where: {
            OR: [
                { expiresAt: { lt: new Date() } },
                { currentViews: { gte: prisma.secureShare.fields.maxViews } }
            ]
        }
    });

    return expired.count;
}

export default {
    createSecureShare,
    accessSecureShare,
    revokeShare,
    listActiveShares,
    cleanupExpiredShares,
};
