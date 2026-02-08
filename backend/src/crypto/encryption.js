import crypto from 'crypto';
import argon2 from 'argon2';

// ========================================
// Argon2 Configuration (Memory-hard hashing)
// ========================================
const ARGON2_CONFIG = {
    type: argon2.argon2id,
    memoryCost: 65536, // 64 MB
    timeCost: 3,       // 3 iterations
    parallelism: 4,    // 4 parallel threads
};

// ========================================
// Password Hashing (Server-side)
// ========================================

/**
 * Hash a password using Argon2id
 * @param {string} password - The password to hash
 * @returns {Promise<string>} - The hashed password
 */
export async function hashPassword(password) {
    return argon2.hash(password, ARGON2_CONFIG);
}

/**
 * Verify a password against an Argon2id hash
 * @param {string} hash - The stored hash
 * @param {string} password - The password to verify
 * @returns {Promise<boolean>} - True if password matches
 */
export async function verifyPassword(hash, password) {
    try {
        return await argon2.verify(hash, password);
    } catch (error) {
        return false;
    }
}

// ========================================
// Encryption Utilities (Server-side metadata)
// ========================================

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

/**
 * Get the server encryption key from environment
 * @returns {Buffer} - 32-byte encryption key
 */
function getServerKey() {
    const key = process.env.REAL_EMAIL_ENCRYPTION_KEY;
    if (!key) {
        throw new Error('REAL_EMAIL_ENCRYPTION_KEY environment variable not set');
    }
    return Buffer.from(key, 'base64');
}

/**
 * Encrypt data using AES-256-GCM
 * @param {string} plaintext - Data to encrypt
 * @returns {{ encrypted: string, iv: string }} - Encrypted data and IV
 */
export function encryptServerSide(plaintext) {
    const key = getServerKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(plaintext, 'utf8', 'base64');
    encrypted += cipher.final('base64');

    const authTag = cipher.getAuthTag();

    return {
        encrypted: encrypted + ':' + authTag.toString('base64'),
        iv: iv.toString('base64'),
    };
}

/**
 * Decrypt data using AES-256-GCM
 * @param {string} encryptedData - Data to decrypt (encrypted:authTag format)
 * @param {string} ivBase64 - Base64 encoded IV
 * @returns {string} - Decrypted plaintext
 */
export function decryptServerSide(encryptedData, ivBase64) {
    const key = getServerKey();
    const iv = Buffer.from(ivBase64, 'base64');
    const [encrypted, authTagBase64] = encryptedData.split(':');
    const authTag = Buffer.from(authTagBase64, 'base64');

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'base64', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
}

// ========================================
// Random Token Generation
// ========================================

/**
 * Generate a cryptographically secure random token
 * @param {number} length - Length in bytes
 * @returns {string} - Hex encoded token
 */
export function generateToken(length = 32) {
    return crypto.randomBytes(length).toString('hex');
}

/**
 * Generate a random salt for client-side key derivation
 * @returns {string} - Base64 encoded salt
 */
export function generateSalt() {
    return crypto.randomBytes(32).toString('base64');
}

// ========================================
// Password Generator
// ========================================

const CHAR_SETS = {
    lowercase: 'abcdefghijklmnopqrstuvwxyz',
    uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    numbers: '0123456789',
    symbols: '!@#$%^&*()_+-=[]{}|;:,.<>?',
};

/**
 * Generate a random password
 * @param {Object} options - Password options
 * @param {number} options.length - Password length (default: 20)
 * @param {boolean} options.lowercase - Include lowercase (default: true)
 * @param {boolean} options.uppercase - Include uppercase (default: true)
 * @param {boolean} options.numbers - Include numbers (default: true)
 * @param {boolean} options.symbols - Include symbols (default: true)
 * @returns {string} - Generated password
 */
export function generatePassword(options = {}) {
    const {
        length = 20,
        lowercase = true,
        uppercase = true,
        numbers = true,
        symbols = true,
    } = options;

    let charset = '';
    if (lowercase) charset += CHAR_SETS.lowercase;
    if (uppercase) charset += CHAR_SETS.uppercase;
    if (numbers) charset += CHAR_SETS.numbers;
    if (symbols) charset += CHAR_SETS.symbols;

    if (!charset) {
        charset = CHAR_SETS.lowercase + CHAR_SETS.uppercase + CHAR_SETS.numbers;
    }

    const password = [];
    const randomBytes = crypto.randomBytes(length);

    for (let i = 0; i < length; i++) {
        password.push(charset[randomBytes[i] % charset.length]);
    }

    // Ensure at least one character from each selected set
    const required = [];
    if (lowercase) required.push(CHAR_SETS.lowercase);
    if (uppercase) required.push(CHAR_SETS.uppercase);
    if (numbers) required.push(CHAR_SETS.numbers);
    if (symbols) required.push(CHAR_SETS.symbols);

    required.forEach((chars, index) => {
        if (index < length) {
            const randomByte = crypto.randomBytes(1)[0];
            password[index] = chars[randomByte % chars.length];
        }
    });

    // Shuffle the password
    for (let i = password.length - 1; i > 0; i--) {
        const j = crypto.randomBytes(1)[0] % (i + 1);
        [password[i], password[j]] = [password[j], password[i]];
    }

    return password.join('');
}

// ========================================
// Email Alias Generation
// ========================================

/**
 * Generate a random email alias
 * @param {string} domain - Email domain
 * @param {string} prefix - Optional prefix (e.g., service name)
 * @returns {string} - Generated alias email
 */
export function generateEmailAlias(domain, prefix = '') {
    const randomPart = crypto.randomBytes(8).toString('hex').substring(0, 12);
    const prefixPart = prefix ? `${prefix.toLowerCase().replace(/[^a-z0-9]/g, '')}-` : '';
    return `${prefixPart}${randomPart}@${domain}`;
}
