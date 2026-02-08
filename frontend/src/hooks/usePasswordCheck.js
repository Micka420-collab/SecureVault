import { useState, useCallback } from 'react';

/**
 * Hook pour vérifier si un mot de passe a été compromis
 * VERSION 100% OFFLINE - Ne fait aucun appel externe
 * 
 * Vérifie localement contre une liste de mots de passe communs
 * et analyse la force du mot de passe sans jamais contacter internet.
 */
export function usePasswordCheck() {
    const [isChecking, setIsChecking] = useState(false);
    const [isCompromised, setIsCompromised] = useState(false);
    const [breachCount, setBreachCount] = useState(0);
    const [error, setError] = useState(null);

    // Liste locale des mots de passe les plus communs (top 100)
    // Source: RockYou leak analysis - jamais envoyée nulle part
    const commonPasswords = new Set([
        '123456', 'password', '12345678', 'qwerty', '123456789',
        'letmein', '1234567', 'football', 'iloveyou', 'admin',
        'welcome', 'monkey', 'login', 'abc123', '111111',
        '123123', 'password123', '1234', 'baseball', 'qwertyuiop',
        'trustno1', 'sunshine', 'princess', 'dragon', 'adobe123',
        'photoshop', '1234567890', 'master', 'hello123', 'freedom',
        'whatever', 'qazwsx', '654321', 'jesus', 'password1',
        'superman', '1q2w3e4r', 'zaq12wsx', 'password123', 'starwars',
        'football', 'batman', 'passw0rd', 'hacker', 'killer',
        'hockey', 'george', 'andrew', 'michelle', 'love',
        'joshua', 'maggie', 'michael', 'biteme', 'mustang',
        'access', 'loveme', 'pussy', '696969', 'qwerty123',
        'asdfgh', 'chelsea', '123qwe', 'ranger', 'tigger',
        'shadow', 'morgan', 'thomas', 'robert', 'daniel',
        'jordan', 'ashley', 'hunter', 'harley', 'cowboys',
        'dallas', 'matrix', 'liverpool', 'fuckyou', 'merlin',
        'passwor', 'zaq1zaq1', '555555', 'fucking', 'alexander',
        '666666', 'yankees', 'ninja', 'banana', 'testing'
    ]);

    /**
     * Vérifie si le mot de passe a été compromis (OFFLINE uniquement)
     */
    const checkPassword = useCallback(async (password) => {
        if (!password || password.length < 1) {
            setIsCompromised(false);
            setBreachCount(0);
            return { isCompromised: false, breachCount: 0 };
        }

        setIsChecking(true);
        setError(null);

        try {
            // Vérification 100% offline
            const lowerPassword = password.toLowerCase();
            const found = commonPasswords.has(lowerPassword);
            
            // Vérifier aussi les variantes simples
            const isCommonVariant = Array.from(commonPasswords).some(common => 
                lowerPassword.includes(common) || 
                lowerPassword === common + '123' ||
                lowerPassword === common + '1' ||
                lowerPassword.startsWith(common)
            );

            const compromised = found || isCommonVariant;
            const count = compromised ? 1000000 : 0; // Indique "très compromis" si trouvé

            setIsCompromised(compromised);
            setBreachCount(count);

            return { isCompromised: compromised, breachCount: count, offline: true };

        } catch (err) {
            console.error('Password check error:', err);
            setError(err.message);
            setIsCompromised(false);
            setBreachCount(0);
            return { isCompromised: false, breachCount: 0, error: err.message };
        } finally {
            setIsChecking(false);
        }
    }, []);

    /**
     * Vérifie si un mot de passe est considéré comme sûr
     */
    const isPasswordSafe = useCallback(async (password) => {
        const result = await checkPassword(password);
        return !result.isCompromised;
    }, [checkPassword]);

    return {
        checkPassword,
        isPasswordSafe,
        isChecking,
        isCompromised,
        breachCount,
        error,
    };
}

/**
 * Hook pour analyser la force d'un mot de passe localement
 */
export function usePasswordStrength() {
    const [strength, setStrength] = useState({
        score: 0,
        label: 'Aucun',
        color: '#6c7086',
        feedback: [],
    });

    const analyzePassword = useCallback((password) => {
        if (!password) {
            setStrength({
                score: 0,
                label: 'Aucun',
                color: '#6c7086',
                feedback: [],
            });
            return;
        }

        let score = 0;
        const feedback = [];

        // Longueur
        if (password.length < 8) {
            feedback.push('Trop court (min. 8 caractères)');
        } else if (password.length >= 12) {
            score += 25;
        } else {
            score += 10;
        }

        if (password.length >= 16) {
            score += 10;
        }

        if (password.length >= 20) {
            score += 5;
        }

        // Complexité
        const hasLower = /[a-z]/.test(password);
        const hasUpper = /[A-Z]/.test(password);
        const hasNumber = /[0-9]/.test(password);
        const hasSymbol = /[^a-zA-Z0-9]/.test(password);

        if (hasLower) score += 10;
        else feedback.push('Ajoutez des minuscules');

        if (hasUpper) score += 10;
        else feedback.push('Ajoutez des majuscules');

        if (hasNumber) score += 10;
        else feedback.push('Ajoutez des chiffres');

        if (hasSymbol) score += 15;
        else feedback.push('Ajoutez des symboles');

        // Bonus pour la diversité
        const variety = [hasLower, hasUpper, hasNumber, hasSymbol].filter(Boolean).length;
        if (variety >= 3) score += 10;
        if (variety === 4) score += 10;

        // Pénalités
        if (/(.)\1{2,}/.test(password)) {
            score -= 10;
            feedback.push('Évitez les répétitions');
        }

        if (/^[a-zA-Z]+$/.test(password)) {
            score -= 10;
            feedback.push('N\'utilisez pas que des lettres');
        }

        if (/^[0-9]+$/.test(password)) {
            score -= 20;
            feedback.push('N\'utilisez pas que des chiffres');
        }

        // Mots communs (basique)
        const commonWords = ['password', '123456', 'qwerty', 'admin', 'letmein', 'welcome', 'monkey'];
        if (commonWords.some(w => password.toLowerCase().includes(w))) {
            score -= 30;
            feedback.push('Mot de passe trop commun');
        }

        score = Math.max(0, Math.min(100, score));

        // Déterminer le label
        let label, color;
        if (score < 25) {
            label = 'Très faible';
            color = '#f38ba8';
        } else if (score < 50) {
            label = 'Faible';
            color = '#fab387';
        } else if (score < 75) {
            label = 'Moyen';
            color = '#f9e2af';
        } else if (score < 90) {
            label = 'Fort';
            color = '#a6e3a1';
        } else {
            label = 'Excellent';
            color = '#94e2d5';
        }

        const result = {
            score,
            label,
            color,
            feedback: feedback.length > 0 ? feedback : ['Bon mot de passe !'],
            hasLower,
            hasUpper,
            hasNumber,
            hasSymbol,
            length: password.length,
        };

        setStrength(result);
        return result;
    }, []);

    return {
        strength,
        analyzePassword,
    };
}

export default usePasswordCheck;
