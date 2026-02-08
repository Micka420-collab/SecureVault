/**
 * Tailscale SSO Authentication Middleware
 * Authentification automatique via certificat client Tailscale
 * 
 * Headers attendus de Tailscale (via Nginx reverse proxy):
 * - Tailscale-User-Login : email de l'utilisateur Tailscale
 * - Tailscale-User-Name : nom complet
 * - Tailscale-User-Profile-Pic : URL avatar
 * - Tailscale-Cert-Subject : CN du certificat
 */

import prisma from '../config/database.js';
import { generateToken, generateSalt, encryptServerSide } from '../crypto/encryption.js';
import jwt from 'jsonwebtoken';

const SESSION_EXPIRY_HOURS = 24;

/**
 * Middleware d'authentification Tailscale
 * À utiliser AVANT le auth classique sur les routes protégées
 */
export async function tailscaleAuthMiddleware(req, res, next) {
    // Vérifier si l'en-tête Tailscale est présent
    const tailscaleEmail = req.headers['tailscale-user-login'] || 
                           req.headers['x-tailscale-user-login'];
    
    const tailscaleName = req.headers['tailscale-user-name'] || 
                          req.headers['x-tailscale-user-name'];
    
    const tailscaleCert = req.headers['tailscale-cert-subject'] || 
                          req.headers['x-tailscale-cert-subject'];

    // Si pas d'identité Tailscale, passer au middleware suivant (auth classique)
    if (!tailscaleEmail) {
        return next();
    }

    try {
        // Vérifier si l'utilisateur existe déjà
        let user = await prisma.user.findUnique({
            where: { email: tailscaleEmail.toLowerCase() }
        });

        // Si l'utilisateur n'existe pas, le créer automatiquement (SSO auto-provisioning)
        if (!user) {
            console.log(`[Tailscale SSO] Creating new user: ${tailscaleEmail}`);
            
            // Générer un mot de passe aléatoire sécurisé (jamais utilisé, purement technique)
            const randomPassword = generateToken(32);
            const { hashPassword } = await import('../crypto/encryption.js');
            const serverHash = await hashPassword(randomPassword);
            
            // Générer le clientAuthHash
            const encoder = new TextEncoder();
            const salt = generateSalt();
            const saltData = encoder.encode(randomPassword + salt);
            let clientHashBuffer = await crypto.subtle.digest('SHA-256', saltData);
            for (let i = 0; i < 3; i++) {
                clientHashBuffer = await crypto.subtle.digest('SHA-256', clientHashBuffer);
            }
            const clientAuthHashRaw = Buffer.from(clientHashBuffer).toString('base64');
            const encryptedClientHash = encryptServerSide(clientAuthHashRaw);

            user = await prisma.user.create({
                data: {
                    email: tailscaleEmail.toLowerCase(),
                    passwordHash: serverHash,
                    clientAuthHash: `${encryptedClientHash.encrypted}:${encryptedClientHash.iv}`,
                    salt,
                    realEmail: '', // L'utilisateur devra le configurer
                    // L'utilisateur devra configurer son mot de passe maître au premier login
                }
            });

            // Marquer comme utilisateur Tailscale
            await prisma.user.update({
                where: { id: user.id },
                data: { 
                    // On pourrait ajouter un champ tailscaleConnected si nécessaire
                }
            });
        }

        // Créer une session
        const sessionToken = generateToken();
        const expiresAt = new Date(Date.now() + SESSION_EXPIRY_HOURS * 60 * 60 * 1000);

        await prisma.session.create({
            data: {
                userId: user.id,
                token: sessionToken,
                expiresAt,
                totpVerified: false, // Tailscale != 2FA du vault
            }
        });

        // Générer JWT
        const accessToken = jwt.sign(
            { 
                userId: user.id, 
                sessionToken,
                authMethod: 'tailscale',
                tailscaleUser: tailscaleEmail
            },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        // Attacher l'utilisateur à la requête
        req.user = user;
        req.userId = user.id;
        req.sessionToken = sessionToken;
        req.accessToken = accessToken;
        req.authMethod = 'tailscale';

        console.log(`[Tailscale SSO] Authenticated: ${tailscaleEmail}`);
        
        next();
    } catch (error) {
        console.error('[Tailscale SSO] Authentication error:', error);
        next(); // Passer à l'auth classique en cas d'erreur
    }
}

/**
 * Endpoint pour vérifier si Tailscale auth est disponible
 */
export async function checkTailscaleAuth(req, res) {
    const tailscaleEmail = req.headers['tailscale-user-login'];
    const tailscaleCert = req.headers['tailscale-cert-subject'];

    if (!tailscaleEmail || !tailscaleCert) {
        return res.json({
            available: false,
            message: 'Tailscale authentication not detected'
        });
    }

    // Vérifier si l'utilisateur existe
    const user = await prisma.user.findUnique({
        where: { email: tailscaleEmail.toLowerCase() },
        select: { id: true, email: true, totpEnabled: true }
    });

    res.json({
        available: true,
        user: user ? {
            exists: true,
            email: user.email,
            requiresPasswordSetup: false, // À déterminer selon la logique
        } : {
            exists: false,
            email: tailscaleEmail,
        }
    });
}

/**
 * Middleware combiné : essaye Tailscale d'abord, puis JWT classique
 */
export async function combinedAuthMiddleware(req, res, next) {
    // 1. Essayer Tailscale
    const tailscaleEmail = req.headers['tailscale-user-login'];
    
    if (tailscaleEmail) {
        // Logique Tailscale déplacée ici pour éviter la duplication
        try {
            let user = await prisma.user.findUnique({
                where: { email: tailscaleEmail.toLowerCase() }
            });

            if (user) {
                // Créer session rapidement
                const sessionToken = generateToken();
                const expiresAt = new Date(Date.now() + SESSION_EXPIRY_HOURS * 60 * 60 * 1000);

                await prisma.session.create({
                    data: {
                        userId: user.id,
                        token: sessionToken,
                        expiresAt,
                        totpVerified: false,
                    }
                });

                const accessToken = jwt.sign(
                    { userId: user.id, sessionToken, authMethod: 'tailscale' },
                    process.env.JWT_SECRET,
                    { expiresIn: '1h' }
                );

                req.user = user;
                req.userId = user.id;
                req.authMethod = 'tailscale';
                
                // Retourner le token dans la réponse pour l'extension
                res.setHeader('X-Auth-Method', 'tailscale');
                res.setHeader('X-Access-Token', accessToken);
                
                return next();
            }
        } catch (error) {
            console.error('[Tailscale Auth] Error:', error);
        }
    }

    // 2. Sinon, continuer avec le middleware JWT classique
    next();
}

export default {
    tailscaleAuthMiddleware,
    checkTailscaleAuth,
    combinedAuthMiddleware
};
