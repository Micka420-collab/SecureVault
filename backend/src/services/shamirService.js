/**
 * Shamir's Secret Sharing Service - SecureVault by Nextendo x Micka Delcato
 * Partage de secret avec seuil (M-sur-N)
 * 
 * Algorithme: Split master password en N parts, besoin de M pour reconstruire
 * Mathématiques: Polynômes sur corps fini (GF(256))
 */

import crypto from 'crypto';

class ShamirSecretSharing {
    constructor() {
        // GF(256) avec polynôme irréductible x^8 + x^4 + x^3 + x + 1 = 0x11d
        this.PRIMITIVE = 0x11d;
    }

    /**
     * Addition dans GF(256) - XOR
     */
    add(a, b) {
        return a ^ b;
    }

    /**
     * Multiplication dans GF(256)
     */
    multiply(a, b) {
        let result = 0;
        for (let i = 0; i < 8; i++) {
            if (b & 1) {
                result ^= a;
            }
            const highBit = a & 0x80;
            a <<= 1;
            if (highBit) {
                a ^= 0x1b; // x^8 = x^4 + x^3 + x + 1 (AES polynomial)
            }
            b >>= 1;
        }
        return result & 0xff;
    }

    /**
     * Exponentiation rapide dans GF(256)
     */
    pow(base, exp) {
        let result = 1;
        while (exp > 0) {
            if (exp & 1) {
                result = this.multiply(result, base);
            }
            base = this.multiply(base, base);
            exp >>= 1;
        }
        return result;
    }

    /**
     * Inverse multiplicatif dans GF(256)
     */
    inverse(a) {
        return this.pow(a, 254); // a^(2^8 - 2) = a^254
    }

    /**
     * Évaluation d'un polynôme en utilisant le schéma de Horner
     * P(x) = coefficients[0] + coefficients[1]*x + coefficients[2]*x^2 + ...
     */
    evaluatePolynomial(coefficients, x) {
        let result = 0;
        for (let i = coefficients.length - 1; i >= 0; i--) {
            result = this.add(this.multiply(result, x), coefficients[i]);
        }
        return result;
    }

    /**
     * Génère un polynôme aléatoire de degré (threshold - 1)
     * Le secret est le terme constant
     */
    generatePolynomial(secret, threshold) {
        const coefficients = [secret];
        for (let i = 1; i < threshold; i++) {
            // Générer coefficient aléatoire non nul
            let coeff;
            do {
                coeff = crypto.randomBytes(1)[0];
            } while (coeff === 0);
            coefficients.push(coeff);
        }
        return coefficients;
    }

    /**
     * Divise un secret en N parts avec un seuil M
     * @param {Buffer} secret - Secret à partager
     * @param {number} totalShares - Nombre total de parts (N)
     * @param {number} threshold - Seuil pour reconstruction (M)
     * @returns {Array} - Tableau de {x, y} parts
     */
    split(secret, totalShares, threshold) {
        if (threshold < 2) {
            throw new Error('Threshold must be at least 2');
        }
        if (threshold > totalShares) {
            throw new Error('Threshold cannot be greater than total shares');
        }
        if (totalShares > 255) {
            throw new Error('Maximum 255 shares allowed');
        }

        const shares = [];
        const xValues = [];

        // Pour chaque octet du secret
        for (let byteIndex = 0; byteIndex < secret.length; byteIndex++) {
            const secretByte = secret[byteIndex];
            const coefficients = this.generatePolynomial(secretByte, threshold);

            // Générer N parts
            for (let i = 1; i <= totalShares; i++) {
                if (byteIndex === 0) {
                    shares[i - 1] = { x: i, y: [] };
                }
                const y = this.evaluatePolynomial(coefficients, i);
                shares[i - 1].y.push(y);
            }
        }

        // Convertir en format utilisable
        return shares.map(share => ({
            x: share.x,
            y: Buffer.from(share.y).toString('base64'),
            index: share.x,
            threshold: threshold,
            totalShares: totalShares
        }));
    }

    /**
     * Interpolation de Lagrange pour reconstruire le secret
     * Retrouve P(0) = secret constant
     */
    lagrangeInterpolation(shares) {
        let secret = 0;
        const k = shares.length;

        for (let i = 0; i < k; i++) {
            let numerator = 1;
            let denominator = 1;

            for (let j = 0; j < k; j++) {
                if (i !== j) {
                    numerator = this.multiply(numerator, shares[j].x);
                    denominator = this.multiply(denominator, this.add(shares[i].x, shares[j].x));
                }
            }

            const lagrangeCoeff = this.multiply(numerator, this.inverse(denominator));
            secret = this.add(secret, this.multiply(shares[i].y[0], lagrangeCoeff));
        }

        return secret;
    }

    /**
     * Reconstruit le secret à partir de M parts
     * @param {Array} shares - Parts disponibles (minimum threshold)
     * @returns {Buffer} - Secret reconstruit
     */
    combine(shares) {
        if (shares.length < 2) {
            throw new Error('At least 2 shares required');
        }

        // Vérifier que toutes les parts ont la même taille
        const shareLength = Buffer.from(shares[0].y, 'base64').length;
        const threshold = shares[0].threshold;

        if (shares.length < threshold) {
            throw new Error(`Need at least ${threshold} shares to reconstruct`);
        }

        // Convertir les parts
        const parsedShares = shares.map(share => ({
            x: share.x,
            y: Buffer.from(share.y, 'base64')
        }));

        // Reconstruire chaque octet
        const secret = [];
        for (let byteIndex = 0; byteIndex < shareLength; byteIndex++) {
            const byteShares = parsedShares.map(share => ({
                x: share.x,
                y: share.y[byteIndex]
            }));
            secret.push(this.lagrangeInterpolation(byteShares));
        }

        return Buffer.from(secret);
    }

    /**
     * Validation des parts
     */
    validateShares(shares) {
        if (!Array.isArray(shares) || shares.length === 0) {
            return { valid: false, error: 'Shares must be a non-empty array' };
        }

        const threshold = shares[0].threshold;
        const totalShares = shares[0].totalShares;

        // Vérifier que toutes les parts ont les mêmes métadonnées
        for (const share of shares) {
            if (share.threshold !== threshold || share.totalShares !== totalShares) {
                return { valid: false, error: 'All shares must have the same threshold and totalShares' };
            }
        }

        // Vérifier les X uniques
        const xValues = shares.map(s => s.x);
        if (new Set(xValues).size !== xValues.length) {
            return { valid: false, error: 'All shares must have unique X values' };
        }

        // Vérifier le seuil
        if (shares.length < threshold) {
            return { 
                valid: false, 
                error: `Need at least ${threshold} shares, only have ${shares.length}`,
                have: shares.length,
                need: threshold
            };
        }

        return { valid: true, threshold, totalShares };
    }
}

// Export singleton
const shamirService = new ShamirSecretSharing();

export default shamirService;
export { ShamirSecretSharing };
