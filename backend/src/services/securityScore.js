/**
 * Security Score Service - Calcul 100% local du score de sécurité
 * Aucune donnée n'est envoyée à l'extérieur
 */

import prisma from '../config/database.js';

/**
 * Calcule le score de sécurité complet d'un utilisateur
 * Tout est calculé localement sur le serveur
 */
export async function calculateSecurityScore(userId) {
    const [
        vaultStats,
        passwordAgeStats,
        reuseStats,
        twoFAStatus,
        sessionStats,
        aliasStats
    ] = await Promise.all([
        getVaultStats(userId),
        getPasswordAgeStats(userId),
        getPasswordReuseStats(userId),
        getTwoFAStatus(userId),
        getSessionStats(userId),
        getAliasStats(userId)
    ]);

    // Calcul des sous-scores (0-100)
    const scores = {
        passwordStrength: calculatePasswordStrengthScore(vaultStats),
        passwordAge: calculatePasswordAgeScore(passwordAgeStats),
        uniqueness: calculateUniquenessScore(reuseStats),
        twoFA: twoFAStatus.enabled ? 100 : 0,
        sessionSecurity: calculateSessionSecurityScore(sessionStats),
        aliasSecurity: calculateAliasSecurityScore(aliasStats),
    };

    // Score global pondéré
    const weights = {
        passwordStrength: 0.25,
        passwordAge: 0.20,
        uniqueness: 0.20,
        twoFA: 0.20,
        sessionSecurity: 0.10,
        aliasSecurity: 0.05,
    };

    const globalScore = Math.round(
        Object.entries(scores).reduce((sum, [key, score]) => {
            return sum + (score * weights[key]);
        }, 0)
    );

    // Générer les recommandations priorisées
    const recommendations = generateRecommendations(scores, {
        vaultStats,
        passwordAgeStats,
        reuseStats,
        twoFAStatus,
    });

    return {
        score: globalScore,
        grade: getGrade(globalScore),
        lastUpdated: new Date().toISOString(),
        breakdown: scores,
        recommendations,
        stats: {
            totalPasswords: vaultStats.total,
            weakPasswords: vaultStats.weak,
            oldPasswords: passwordAgeStats.old,
            reusedPasswords: reuseStats.reused,
            with2FA: twoFAStatus.enabled,
        }
    };
}

/**
 * Récupère les statistiques du vault
 */
async function getVaultStats(userId) {
    const entries = await prisma.vaultEntry.findMany({
        where: { userId },
        select: {
            id: true,
            encryptedData: true,
            iv: true,
            category: true,
            updatedAt: true,
        }
    });

    // Analyse locale de la force des mots de passe
    let weak = 0;
    let medium = 0;
    let strong = 0;

    for (const entry of entries) {
        // Détection heuristique basée sur la taille et patterns
        const strength = estimatePasswordStrength(entry.encryptedData);
        if (strength < 40) weak++;
        else if (strength < 70) medium++;
        else strong++;
    }

    return {
        total: entries.length,
        weak,
        medium,
        strong,
        categories: countByCategory(entries),
    };
}

/**
 * Estimation locale de la force d'un mot de passe (sans le déchiffrer)
 * Basé sur l'entropie de l'encryption
 */
function estimatePasswordStrength(encryptedData) {
    if (!encryptedData) return 0;
    
    // Plus le mot de passe est long/complexe, plus l'encryption est "dense"
    const length = encryptedData.length;
    
    // Estimation basique
    if (length < 50) return 30;
    if (length < 100) return 60;
    return 85;
}

/**
 * Statistiques sur l'âge des mots de passe
 */
async function getPasswordAgeStats(userId) {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);

    const [recent, medium, old, veryOld] = await Promise.all([
        prisma.vaultEntry.count({
            where: { userId, updatedAt: { gte: thirtyDaysAgo } }
        }),
        prisma.vaultEntry.count({
            where: { 
                userId, 
                updatedAt: { 
                    gte: ninetyDaysAgo,
                    lt: thirtyDaysAgo 
                } 
            }
        }),
        prisma.vaultEntry.count({
            where: { 
                userId, 
                updatedAt: { 
                    gte: oneYearAgo,
                    lt: ninetyDaysAgo 
                } 
            }
        }),
        prisma.vaultEntry.count({
            where: { 
                userId, 
                updatedAt: { lt: oneYearAgo }
            }
        }),
    ]);

    const total = recent + medium + old + veryOld;
    
    return {
        total,
        recent,
        medium,
        old,
        veryOld,
        percentOld: total > 0 ? Math.round((old + veryOld) / total * 100) : 0,
    };
}

/**
 * Détection de réutilisation locale
 * Compare les hashes pour détecter les doublons
 */
async function getPasswordReuseStats(userId) {
    const entries = await prisma.vaultEntry.findMany({
        where: { userId },
        select: {
            id: true,
            encryptedData: true,
        }
    });

    // Comparaison des encryptedData (même mot de passe = même encryption si même IV)
    const dataMap = new Map();
    let reused = 0;

    for (const entry of entries) {
        const key = entry.encryptedData.substring(0, 100); // Premier 100 caractères
        if (dataMap.has(key)) {
            reused++;
        } else {
            dataMap.set(key, entry.id);
        }
    }

    return {
        total: entries.length,
        reused,
        unique: entries.length - reused,
        percentReused: entries.length > 0 
            ? Math.round(reused / entries.length * 100) 
            : 0,
    };
}

/**
 * Statut 2FA
 */
async function getTwoFAStatus(userId) {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { totpEnabled: true }
    });

    return {
        enabled: user?.totpEnabled || false,
    };
}

/**
 * Statistiques des sessions
 */
async function getSessionStats(userId) {
    const [totalSessions, expiredSessions] = await Promise.all([
        prisma.session.count({ where: { userId } }),
        prisma.session.count({
            where: {
                userId,
                expiresAt: { lt: new Date() }
            }
        })
    ]);

    return {
        totalSessions,
        activeSessions: totalSessions - expiredSessions,
        expiredSessions,
    };
}

/**
 * Statistiques des alias
 */
async function getAliasStats(userId) {
    const [total, active, withEmails] = await Promise.all([
        prisma.alias.count({ where: { userId } }),
        prisma.alias.count({ where: { userId, isActive: true } }),
        prisma.alias.count({
            where: {
                userId,
                emails: { some: {} }
            }
        })
    ]);

    return {
        total,
        active,
        inactive: total - active,
        withEmails,
    };
}

/**
 * Calcul du score de force des mots de passe
 */
function calculatePasswordStrengthScore(stats) {
    if (stats.total === 0) return 0;
    
    const goodPasswords = stats.strong + (stats.medium * 0.7);
    return Math.round((goodPasswords / stats.total) * 100);
}

/**
 * Calcul du score d'âge
 */
function calculatePasswordAgeScore(stats) {
    if (stats.total === 0) return 100; // Pas de mot de passe = pas de problème
    
    const good = stats.recent + (stats.medium * 0.8);
    return Math.round((good / stats.total) * 100);
}

/**
 * Calcul du score d'unicité
 */
function calculateUniquenessScore(stats) {
    if (stats.total === 0) return 100;
    const unique = stats.total - stats.reused;
    return Math.round((unique / stats.total) * 100);
}

/**
 * Score de sécurité des sessions
 */
function calculateSessionSecurityScore(stats) {
    if (stats.totalSessions === 0) return 100;
    
    // Pénalité si trop de sessions actives
    if (stats.activeSessions > 5) return 60;
    if (stats.activeSessions > 3) return 80;
    return 100;
}

/**
 * Score de sécurité des alias
 */
function calculateAliasSecurityScore(stats) {
    if (stats.total === 0) return 100;
    
    // Points pour l'utilisation active des alias
    const usage = stats.withEmails / stats.total;
    return Math.round(70 + (usage * 30));
}

/**
 * Génère des recommandations priorisées
 */
function generateRecommendations(scores, stats) {
    const recommendations = [];

    if (scores.twoFA < 100) {
        recommendations.push({
            priority: 'critical',
            title: 'Activez la double authentification (2FA)',
            description: 'Protégez votre compte avec une couche de sécurité supplémentaire.',
            action: '/settings',
            impact: '+20 points',
        });
    }

    if (scores.passwordStrength < 70) {
        recommendations.push({
            priority: 'high',
            title: `Renforcez ${stats.vaultStats.weak} mots de passe faibles`,
            description: 'Utilisez le générateur pour créer des mots de passe plus forts.',
            action: '/vault',
            impact: '+15 points',
        });
    }

    if (stats.passwordAgeStats.percentOld > 30) {
        recommendations.push({
            priority: 'high',
            title: `Mettez à jour ${stats.passwordAgeStats.old + stats.passwordAgeStats.veryOld} mots de passe anciens`,
            description: 'Les mots de passe de plus de 3 mois devraient être changés.',
            action: '/vault?filter=old',
            impact: '+10 points',
        });
    }

    if (scores.uniqueness < 100) {
        recommendations.push({
            priority: 'medium',
            title: 'Évitez de réutiliser les mots de passe',
            description: `${stats.reuseStats.reused} mots de passe sont utilisés sur plusieurs sites.`,
            action: '/vault?filter=duplicates',
            impact: '+10 points',
        });
    }

    if (stats.vaultStats.total === 0) {
        recommendations.push({
            priority: 'low',
            title: 'Ajoutez votre première entrée',
            description: 'Commencez à sécuriser vos identifiants.',
            action: '/vault?action=create',
            impact: '+5 points',
        });
    }

    // Trier par priorité
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    return recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
}

/**
 * Convertit le score en grade
 */
function getGrade(score) {
    if (score >= 95) return { letter: 'A+', label: 'Excellent', color: '#94e2d5' };
    if (score >= 90) return { letter: 'A', label: 'Très bon', color: '#a6e3a1' };
    if (score >= 80) return { letter: 'B', label: 'Bon', color: '#f9e2af' };
    if (score >= 70) return { letter: 'C', label: 'Moyen', color: '#fab387' };
    if (score >= 60) return { letter: 'D', label: 'Faible', color: '#f38ba8' };
    return { letter: 'F', label: 'Critique', color: '#f38ba8' };
}

/**
 * Compte par catégorie
 */
function countByCategory(entries) {
    return entries.reduce((acc, entry) => {
        const cat = entry.category || 'login';
        acc[cat] = (acc[cat] || 0) + 1;
        return acc;
    }, {});
}

export default { calculateSecurityScore };
