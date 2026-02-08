/**
 * Client-side cryptography module using Web Crypto API
 * All sensitive data encryption/decryption happens here before sending to server
 */

// ========================================
// Constants
// ========================================
const PBKDF2_ITERATIONS = 600000;
const AES_KEY_LENGTH = 256;
const IV_LENGTH = 12; // 96 bits for GCM

// ========================================
// Key Derivation (PBKDF2)
// ========================================

/**
 * Derive an AES-256 key from master password
 * @param {string} masterPassword - User's master password
 * @param {string} saltBase64 - Base64 encoded salt from server
 * @returns {Promise<CryptoKey>} - Derived AES-GCM key
 */
export async function deriveKey(masterPassword, saltBase64) {
    const encoder = new TextEncoder();
    const salt = base64ToBuffer(saltBase64);

    // Import master password as key material
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        encoder.encode(masterPassword),
        'PBKDF2',
        false,
        ['deriveKey']
    );

    // Derive AES-256-GCM key
    return crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt,
            iterations: PBKDF2_ITERATIONS,
            hash: 'SHA-256',
        },
        keyMaterial,
        { name: 'AES-GCM', length: AES_KEY_LENGTH },
        false, // Not extractable for security
        ['encrypt', 'decrypt']
    );
}

/**
 * Create a hash of the password for server authentication
 * This is NOT the encryption key - it's a separate hash for auth
 * @param {string} masterPassword - User's master password
 * @param {string} saltBase64 - Base64 encoded salt
 * @returns {Promise<string>} - Base64 encoded hash
 */
export async function hashForAuth(masterPassword, saltBase64) {
    const encoder = new TextEncoder();
    const salt = base64ToBuffer(saltBase64);

    // Combine password and salt
    const data = encoder.encode(masterPassword + saltBase64);

    // Hash multiple times for additional security
    let hash = await crypto.subtle.digest('SHA-256', data);
    for (let i = 0; i < 3; i++) {
        hash = await crypto.subtle.digest('SHA-256', hash);
    }

    return bufferToBase64(hash);
}

// ========================================
// Encryption / Decryption
// ========================================

/**
 * Encrypt data with AES-256-GCM
 * @param {object|string} data - Data to encrypt
 * @param {CryptoKey} key - AES-GCM key
 * @returns {Promise<{encrypted: string, iv: string}>} - Encrypted data and IV
 */
export async function encrypt(data, key) {
    const encoder = new TextEncoder();
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

    const plaintext = typeof data === 'string' ? data : JSON.stringify(data);

    const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        encoder.encode(plaintext)
    );

    return {
        encrypted: bufferToBase64(encrypted),
        iv: bufferToBase64(iv),
    };
}

/**
 * Decrypt data with AES-256-GCM
 * @param {string} encryptedBase64 - Base64 encoded encrypted data
 * @param {string} ivBase64 - Base64 encoded IV
 * @param {CryptoKey} key - AES-GCM key
 * @returns {Promise<object|string>} - Decrypted data
 */
export async function decrypt(encryptedBase64, ivBase64, key) {
    const decoder = new TextDecoder();
    const encrypted = base64ToBuffer(encryptedBase64);
    const iv = base64ToBuffer(ivBase64);

    const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        key,
        encrypted
    );

    const plaintext = decoder.decode(decrypted);

    // Try to parse as JSON, otherwise return as string
    try {
        return JSON.parse(plaintext);
    } catch {
        return plaintext;
    }
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
 * Generate a cryptographically secure random password
 * @param {object} options - Generation options
 * @returns {string} - Generated password
 */
export function generatePassword(options = {}) {
    const {
        length = 20,
        lowercase = true,
        uppercase = true,
        numbers = true,
        symbols = true,
        excludeAmbiguous = false,
    } = options;

    let charset = '';
    const requiredChars = [];

    if (lowercase) {
        let chars = CHAR_SETS.lowercase;
        if (excludeAmbiguous) chars = chars.replace(/[l]/g, '');
        charset += chars;
        requiredChars.push(chars);
    }
    if (uppercase) {
        let chars = CHAR_SETS.uppercase;
        if (excludeAmbiguous) chars = chars.replace(/[IO]/g, '');
        charset += chars;
        requiredChars.push(chars);
    }
    if (numbers) {
        let chars = CHAR_SETS.numbers;
        if (excludeAmbiguous) chars = chars.replace(/[01]/g, '');
        charset += chars;
        requiredChars.push(chars);
    }
    if (symbols) {
        charset += CHAR_SETS.symbols;
        requiredChars.push(CHAR_SETS.symbols);
    }

    if (!charset) {
        charset = CHAR_SETS.lowercase + CHAR_SETS.uppercase + CHAR_SETS.numbers;
    }

    const password = new Array(length);
    const randomValues = crypto.getRandomValues(new Uint32Array(length));

    // Fill with random characters
    for (let i = 0; i < length; i++) {
        password[i] = charset[randomValues[i] % charset.length];
    }

    // Ensure at least one character from each required set
    requiredChars.forEach((chars, index) => {
        if (index < length) {
            const randomByte = crypto.getRandomValues(new Uint8Array(1))[0];
            password[index] = chars[randomByte % chars.length];
        }
    });

    // Fisher-Yates shuffle
    for (let i = password.length - 1; i > 0; i--) {
        const j = crypto.getRandomValues(new Uint32Array(1))[0] % (i + 1);
        [password[i], password[j]] = [password[j], password[i]];
    }

    return password.join('');
}

/**
 * Calculate password strength (0-100)
 * @param {string} password - Password to analyze
 * @returns {{score: number, label: string, color: string}}
 */
export function calculatePasswordStrength(password) {
    if (!password) return { score: 0, label: 'Aucun', color: '#6c7086' };

    let score = 0;

    // Length scoring
    if (password.length >= 8) score += 20;
    if (password.length >= 12) score += 15;
    if (password.length >= 16) score += 15;
    if (password.length >= 24) score += 10;

    // Character variety
    if (/[a-z]/.test(password)) score += 10;
    if (/[A-Z]/.test(password)) score += 10;
    if (/[0-9]/.test(password)) score += 10;
    if (/[^a-zA-Z0-9]/.test(password)) score += 10;

    // Bonus for mixing
    const variety = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^a-zA-Z0-9]/]
        .filter(r => r.test(password)).length;
    if (variety >= 3) score += 10;
    if (variety >= 4) score += 10;

    // Penalties
    if (/(.)\1{2,}/.test(password)) score -= 10; // Repeated characters
    if (/^[a-zA-Z]+$/.test(password)) score -= 10; // Only letters
    if (/^[0-9]+$/.test(password)) score -= 20; // Only numbers

    score = Math.max(0, Math.min(100, score));

    let label, color;
    if (score < 25) { label = 'Très faible'; color = '#f38ba8'; }
    else if (score < 50) { label = 'Faible'; color = '#fab387'; }
    else if (score < 75) { label = 'Moyen'; color = '#f9e2af'; }
    else if (score < 90) { label = 'Fort'; color = '#a6e3a1'; }
    else { label = 'Très fort'; color = '#94e2d5'; }

    return { score, label, color };
}

// ========================================
// Utility Functions
// ========================================

/**
 * Convert ArrayBuffer to Base64 string
 */
export function bufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

/**
 * Convert Base64 string to ArrayBuffer
 */
export function base64ToBuffer(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
}

/**
 * Generate a random string for IDs
 */
export function generateId(length = 16) {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    const values = crypto.getRandomValues(new Uint8Array(length));
    return Array.from(values, v => chars[v % chars.length]).join('');
}
