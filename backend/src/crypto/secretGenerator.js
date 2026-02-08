/**
 * Secret Generator - SecureVault by Nextendo x Micka Delcato
 * Génération et validation de secrets sécurisés
 */

import crypto from 'crypto';

/**
 * Génère un secret cryptographiquement sécurisé
 */
export function generateSecureSecret(length = 32) {
    return crypto.randomBytes(length).toString('base64');
}

/**
 * Valide la force d'un secret
 */
export function validateSecret(secret) {
    const checks = {
        minLength: secret.length >= 32,
        hasUpper: /[A-Z]/.test(secret),
        hasLower: /[a-z]/.test(secret),
        hasNumbers: /[0-9]/.test(secret),
        hasSpecial: /[^A-Za-z0-9]/.test(secret),
        notDefault: !isDefaultSecret(secret)
    };

    const isValid = Object.values(checks).every(check => check === true);

    return {
        valid: isValid,
        checks,
        errors: Object.entries(checks)
            .filter(([_, valid]) => !valid)
            .map(([key]) => getErrorMessage(key))
    };
}

function isDefaultSecret(secret) {
    const dangerousPatterns = [
        'CHANGE_ME', 'change_me', 'secret', 'password',
        '123456', 'default', 'your_', 'admin', 'test'
    ];
    return dangerousPatterns.some(p => secret.toLowerCase().includes(p));
}

function getErrorMessage(key) {
    const messages = {
        minLength: 'Le secret doit faire au moins 32 caractères',
        hasUpper: 'Le secret doit contenir des majuscules',
        hasLower: 'Le secret doit contenir des minuscules',
        hasNumbers: 'Le secret doit contenir des chiffres',
        hasSpecial: 'Le secret doit contenir des caractères spéciaux',
        notDefault: 'Le secret ne doit pas contenir de valeurs par défaut'
    };
    return messages[key] || 'Erreur de validation';
}

export function generateAllSecrets() {
    return {
        JWT_SECRET: generateSecureSecret(64),
        SESSION_SECRET: generateSecureSecret(64),
        REAL_EMAIL_ENCRYPTION_KEY: generateSecureSecret(32),
        DB_PASSWORD: generateSecureSecret(24).replace(/[^a-zA-Z0-9]/g, '').substring(0, 20)
    };
}
