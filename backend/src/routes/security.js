/**
 * Security Routes - Score, versioning, emergency access, secure share
 */

import express from 'express';
import { calculateSecurityScore } from '../services/securityScore.js';
import * as versioning from '../services/versioning.js';
import * as secureShare from '../services/secureShare.js';
import * as emergencyAccess from '../services/emergencyAccess.js';
import * as diceware from '../services/diceware.js';
import { requireAuth } from '../middleware/session.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = express.Router();

// ========================================
// Security Score
// ========================================
router.get('/score', requireAuth, asyncHandler(async (req, res) => {
    const score = await calculateSecurityScore(req.userId);
    res.json(score);
}));

// ========================================
// Diceware Passphrase Generator
// ========================================
router.post('/diceware', requireAuth, asyncHandler(async (req, res) => {
    const { wordCount = 6, addNumber = true, addSpecial = true } = req.body;
    
    const result = diceware.generateDicewarePassphrase(wordCount, addNumber, addSpecial);
    const crackTime = diceware.estimateCrackTime(result.entropy);
    
    res.json({
        ...result,
        crackTime,
    });
}));

// ========================================
// Versioning
// ========================================
router.get('/vault/:entryId/versions', requireAuth, asyncHandler(async (req, res) => {
    const { entryId } = req.params;
    
    const versions = await versioning.getVersionHistory(entryId, req.userId);
    res.json({ versions });
}));

router.post('/vault/versions/:versionId/restore', requireAuth, asyncHandler(async (req, res) => {
    const { versionId } = req.params;
    
    const result = await versioning.restoreVersion(versionId, req.userId);
    res.json(result);
}));

router.post('/vault/versions/cleanup', requireAuth, asyncHandler(async (req, res) => {
    const { keepDays = 365 } = req.body;
    
    const deleted = await versioning.cleanupOldVersions(req.userId, keepDays);
    res.json({ deleted });
}));

// ========================================
// Secure Share
// ========================================
router.post('/share', requireAuth, asyncHandler(async (req, res) => {
    const { data, maxViews = 1, expireHours = 24 } = req.body;
    
    const share = await secureShare.createSecureShare(req.userId, data, {
        maxViews,
        expireHours,
    });
    
    res.json(share);
}));

router.get('/share/:shareId', asyncHandler(async (req, res) => {
    const { shareId } = req.params;
    const token = req.query.token || req.headers['x-share-token'];
    
    if (!token) {
        return res.status(400).json({ error: 'Token required' });
    }
    
    const result = await secureShare.accessSecureShare(shareId, token);
    res.json(result);
}));

router.delete('/share/:shareId', requireAuth, asyncHandler(async (req, res) => {
    const { shareId } = req.params;
    
    await secureShare.revokeShare(shareId, req.userId);
    res.json({ success: true });
}));

router.get('/shares', requireAuth, asyncHandler(async (req, res) => {
    const shares = await secureShare.listActiveShares(req.userId);
    res.json({ shares });
}));

// ========================================
// Emergency Access
// ========================================
router.post('/emergency-access', requireAuth, asyncHandler(async (req, res) => {
    const { granteeEmail, waitTimeHours = 24, confirmedExpiryHours = 168 } = req.body;
    
    const access = await emergencyAccess.setupEmergencyAccess(
        req.userId,
        granteeEmail,
        waitTimeHours,
        confirmedExpiryHours
    );
    
    res.json(access);
}));

router.get('/emergency-access', requireAuth, asyncHandler(async (req, res) => {
    const accesses = await emergencyAccess.listEmergencyAccess(req.userId);
    res.json({ accesses });
}));

router.get('/emergency-access/granted', requireAuth, asyncHandler(async (req, res) => {
    const user = await req.user;
    const accesses = await emergencyAccess.listGrantedAccess(user.email, req);
    res.json({ accesses });
}));

router.post('/emergency-access/:id/request', requireAuth, asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { grantorEmail } = req.body;
    
    const user = await req.user;
    const result = await emergencyAccess.requestEmergencyAccess(user.email, grantorEmail, req);
    res.json(result);
}));

router.get('/emergency-access/:id/status', requireAuth, asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    const status = await emergencyAccess.checkEmergencyAccessStatus(id, req);
    res.json(status);
}));

router.post('/emergency-access/:id/grant', requireAuth, asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { encryptedKey } = req.body;
    
    const result = await emergencyAccess.grantEmergencyAccess(id, encryptedKey, req);
    res.json(result);
}));

router.post('/emergency-access/:id/reject', requireAuth, asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    await emergencyAccess.rejectEmergencyAccess(id, req.userId, req);
    res.json({ success: true });
}));

router.delete('/emergency-access/:id', requireAuth, asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    await emergencyAccess.revokeEmergencyAccess(id, req.userId, req);
    res.json({ success: true });
}));

// 🆕 NOUVEAU : Récupérer l'historique d'audit
router.get('/emergency-access/:id/audits', requireAuth, asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    const audits = await emergencyAccess.getEmergencyAccessAudits(id, req.userId);
    res.json({ audits });
}));

export default router;
