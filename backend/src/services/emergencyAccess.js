/**
 * Emergency Access Service - SecureVault by Nextendo x Micka Delcato
 * Accès de confiance en cas d'urgence
 * 100% local, chiffrement E2E
 * 
 * @author nextendo
 * @version 2.0.0
 */

import prisma from '../config/database.js';
import crypto from 'crypto';

/**
 * Logger pour les accès d'urgence (audit trail)
 */
async function logEmergencyAccess(emergencyAccessId, action, details = {}, req = null) {
    try {
        const logData = {
            emergencyAccessId,
            action,
            details: details ? JSON.stringify(details) : null,
            ipAddress: req?.ip || 'unknown',
            userAgent: req?.headers?.['user-agent'] || 'unknown',
        };

        await prisma.emergencyAccessAudit.create({ data: logData });
        
        // Log console pour le développement
        console.log(`[EmergencyAudit] ${action} - AccessID: ${emergencyAccessId}`);
    } catch (error) {
        // Ne pas bloquer l'opération si le logging échoue
        console.error('[EmergencyAudit] Failed to log:', error);
    }
}

/**
 * Configure un contact d'urgence
 */
export async function setupEmergencyAccess(grantorId, granteeEmail, waitTimeHours = 24, confirmedExpiryHours = 168) {
    const normalizedEmail = granteeEmail.toLowerCase().trim();

    // 🔒 VÉRIFICATION : Le grantee doit avoir un compte
    const grantee = await prisma.user.findUnique({
        where: { email: normalizedEmail }
    });

    if (!grantee) {
        throw new Error(`User ${granteeEmail} not found. They must create a SecureVault account first.`);
    }

    // Vérifier si déjà configuré
    const existing = await prisma.emergencyAccess.findFirst({
        where: {
            grantorId,
            granteeEmail: normalizedEmail,
        }
    });

    if (existing) {
        throw new Error('Emergency access already configured for this email');
    }

    // Créer la demande
    const access = await prisma.emergencyAccess.create({
        data: {
            grantorId,
            granteeId: grantee.id,
            granteeEmail: normalizedEmail,
            waitTimeHours,
            confirmedExpiryHours: Math.min(confirmedExpiryHours, 720), // Max 30 jours
            status: 'pending',
        }
    });

    // Envoyer notification au grantee (local uniquement - log)
    console.log(`[Emergency] Access setup for ${granteeEmail} with ${waitTimeHours}h wait time, expires after ${confirmedExpiryHours}h`);

    return {
        id: access.id,
        granteeEmail,
        waitTimeHours,
        confirmedExpiryHours: access.confirmedExpiryHours,
        status: 'pending',
    };
}

/**
 * Demande d'accès d'urgence (par le contact de confiance)
 */
export async function requestEmergencyAccess(granteeEmail, grantorEmail, req = null) {
    const normalizedGrantee = granteeEmail.toLowerCase().trim();
    const normalizedGrantor = grantorEmail.toLowerCase().trim();

    const access = await prisma.emergencyAccess.findFirst({
        where: {
            granteeEmail: normalizedGrantee,
            grantor: {
                email: normalizedGrantor
            }
        },
        include: { grantor: true }
    });

    if (!access) {
        throw new Error('Emergency access not found');
    }

    if (access.status !== 'pending') {
        throw new Error(`Request already ${access.status}`);
    }

    // Mettre à jour le statut
    const updated = await prisma.emergencyAccess.update({
        where: { id: access.id },
        data: {
            status: 'requested',
            requestDate: new Date(),
        }
    });

    // Calculer la date d'accès
    const accessDate = new Date(Date.now() + access.waitTimeHours * 60 * 60 * 1000);

    // 📝 AUDIT LOG
    await logEmergencyAccess(access.id, 'REQUESTED', {
        granteeEmail: normalizedGrantee,
        grantorEmail: normalizedGrantor,
        waitTimeHours: access.waitTimeHours,
        canAccessAt: accessDate.toISOString(),
    }, req);

    // Notifier le grantor (log local)
    console.log(`[Emergency] Access requested by ${granteeEmail} for ${grantorEmail}`);
    console.log(`[Emergency] Auto-approve at: ${accessDate}`);

    return {
        id: updated.id,
        status: 'requested',
        waitTimeHours: access.waitTimeHours,
        confirmedExpiryHours: access.confirmedExpiryHours,
        requestDate: updated.requestDate,
        accessDate,
        canAccessAt: accessDate,
    };
}

/**
 * Vérifie si l'accès peut être accordé
 */
export async function checkEmergencyAccessStatus(accessId, req = null) {
    const access = await prisma.emergencyAccess.findUnique({
        where: { id: accessId },
        include: { grantor: true }
    });

    if (!access) {
        throw new Error('Access request not found');
    }

    const now = new Date();

    // 🔒 VÉRIFICATION : Accès confirmé mais expiré ?
    if (access.status === 'confirmed' && access.confirmedAt) {
        const expiryDate = new Date(access.confirmedAt.getTime() + access.confirmedExpiryHours * 60 * 60 * 1000);
        
        if (now >= expiryDate) {
            // 📝 AUDIT LOG
            await logEmergencyAccess(access.id, 'EXPIRED', {
                confirmedAt: access.confirmedAt.toISOString(),
                expiredAt: expiryDate.toISOString(),
            }, req);

            return {
                canAccess: false,
                reason: 'Access expired',
                expiredAt: expiryDate,
                status: 'expired',
            };
        }

        return {
            canAccess: true,
            encryptedKey: access.encryptedKey,
            grantorEmail: access.grantor.email,
            expiresAt: expiryDate,
            timeRemaining: Math.ceil((expiryDate - now) / (1000 * 60 * 60)), // heures restantes
        };
    }

    if (access.status === 'requested' && access.requestDate) {
        const canAccessAt = new Date(
            access.requestDate.getTime() + access.waitTimeHours * 60 * 60 * 1000
        );

        if (now >= canAccessAt) {
            // Auto-approval
            return {
                canAccess: true,
                needsApproval: false,
                grantorEmail: access.grantor.email,
            };
        }

        return {
            canAccess: false,
            needsApproval: true,
            waitTimeRemaining: Math.ceil((canAccessAt - now) / (1000 * 60 * 60)), // heures
            canAccessAt,
        };
    }

    return {
        canAccess: false,
        status: access.status,
    };
}

/**
 * Accorde l'accès (par le grantor ou auto-approval)
 */
export async function grantEmergencyAccess(accessId, encryptedVaultKey, req = null) {
    const access = await prisma.emergencyAccess.update({
        where: { id: accessId },
        data: {
            status: 'confirmed',
            accessDate: new Date(),
            confirmedAt: new Date(),
            encryptedKey: encryptedVaultKey,
        }
    });

    // 📝 AUDIT LOG
    await logEmergencyAccess(access.id, 'APPROVED', {
        confirmedAt: access.confirmedAt?.toISOString(),
        expiresAt: new Date(Date.now() + access.confirmedExpiryHours * 60 * 60 * 1000).toISOString(),
    }, req);

    console.log(`[Emergency] Access GRANTED for ${access.granteeEmail}, expires in ${access.confirmedExpiryHours}h`);

    return {
        id: access.id,
        status: 'confirmed',
        accessDate: access.accessDate,
        confirmedAt: access.confirmedAt,
        expiresAt: new Date(Date.now() + access.confirmedExpiryHours * 60 * 60 * 1000),
    };
}

/**
 * Révoque l'accès d'urgence
 */
export async function revokeEmergencyAccess(accessId, grantorId, req = null) {
    const access = await prisma.emergencyAccess.findFirst({
        where: {
            id: accessId,
            grantorId,
        }
    });

    if (!access) {
        throw new Error('Access not found');
    }

    await prisma.emergencyAccess.delete({ where: { id: accessId } });

    // 📝 AUDIT LOG
    await logEmergencyAccess(accessId, 'REVOKED', {
        grantorId,
        previousStatus: access.status,
    }, req);

    return { success: true };
}

/**
 * Liste les accès d'urgence configurés
 */
export async function listEmergencyAccess(grantorId) {
    const accesses = await prisma.emergencyAccess.findMany({
        where: { grantorId },
        include: {
            grantee: { select: { email: true, createdAt: true } },
            _count: { select: { audits: true } }
        },
        orderBy: { createdAt: 'desc' },
    });

    const now = new Date();

    return accesses.map(a => {
        let canAccessNow = false;
        let expiresAt = null;
        let isExpired = false;

        if (a.status === 'confirmed' && a.confirmedAt) {
            expiresAt = new Date(a.confirmedAt.getTime() + a.confirmedExpiryHours * 60 * 60 * 1000);
            isExpired = now >= expiresAt;
            canAccessNow = !isExpired;
        } else if (a.status === 'requested' && a.requestDate) {
            const canAccessAt = new Date(a.requestDate.getTime() + a.waitTimeHours * 60 * 60 * 1000);
            canAccessNow = now >= canAccessAt;
        }

        return {
            id: a.id,
            granteeEmail: a.granteeEmail,
            granteeCreatedAt: a.grantee?.createdAt,
            status: a.status,
            waitTimeHours: a.waitTimeHours,
            confirmedExpiryHours: a.confirmedExpiryHours,
            requestDate: a.requestDate,
            accessDate: a.accessDate,
            confirmedAt: a.confirmedAt,
            expiresAt,
            isExpired,
            canAccessNow,
            auditCount: a._count.audits,
            createdAt: a.createdAt,
        };
    });
}

/**
 * Liste les accès où l'utilisateur est contact de confiance
 */
export async function listGrantedAccess(granteeEmail, req = null) {
    const normalizedEmail = granteeEmail.toLowerCase().trim();

    const accesses = await prisma.emergencyAccess.findMany({
        where: {
            granteeEmail: normalizedEmail,
            status: { in: ['requested', 'confirmed'] }
        },
        include: {
            grantor: { select: { email: true } }
        }
    });

    const now = new Date();

    return accesses.map(a => {
        let canAccessAt = null;
        let expiresAt = null;
        let isExpired = false;

        if (a.status === 'requested' && a.requestDate) {
            canAccessAt = new Date(a.requestDate.getTime() + a.waitTimeHours * 60 * 60 * 1000);
        } else if (a.status === 'confirmed' && a.confirmedAt) {
            expiresAt = new Date(a.confirmedAt.getTime() + a.confirmedExpiryHours * 60 * 60 * 1000);
            isExpired = now >= expiresAt;
        }

        return {
            id: a.id,
            grantorEmail: a.grantor.email,
            status: a.status,
            waitTimeHours: a.waitTimeHours,
            confirmedExpiryHours: a.confirmedExpiryHours,
            requestDate: a.requestDate,
            accessDate: a.accessDate,
            confirmedAt: a.confirmedAt,
            canAccessAt,
            expiresAt,
            isExpired,
            canAccessNow: (a.status === 'confirmed' && !isExpired) || 
                (canAccessAt && now >= canAccessAt),
        };
    });
}

/**
 * Refuse une demande d'accès
 */
export async function rejectEmergencyAccess(accessId, grantorId, req = null) {
    const access = await prisma.emergencyAccess.updateMany({
        where: {
            id: accessId,
            grantorId,
        },
        data: {
            status: 'rejected',
        }
    });

    if (access.count === 0) {
        throw new Error('Access not found');
    }

    // 📝 AUDIT LOG
    await logEmergencyAccess(accessId, 'REJECTED', { grantorId }, req);

    return { success: true };
}

/**
 * Récupère l'historique d'audit pour un accès d'urgence
 */
export async function getEmergencyAccessAudits(accessId, grantorId) {
    // Vérifier que l'utilisateur est bien le grantor
    const access = await prisma.emergencyAccess.findFirst({
        where: { id: accessId, grantorId }
    });

    if (!access) {
        throw new Error('Access not found or unauthorized');
    }

    const audits = await prisma.emergencyAccessAudit.findMany({
        where: { emergencyAccessId: accessId },
        orderBy: { timestamp: 'desc' },
    });

    return audits.map(a => ({
        ...a,
        details: a.details ? JSON.parse(a.details) : null,
    }));
}

export default {
    setupEmergencyAccess,
    requestEmergencyAccess,
    checkEmergencyAccessStatus,
    grantEmergencyAccess,
    revokeEmergencyAccess,
    listEmergencyAccess,
    listGrantedAccess,
    rejectEmergencyAccess,
    getEmergencyAccessAudits,
    logEmergencyAccess,
};
