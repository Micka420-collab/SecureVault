import { useState, useCallback } from 'react';

/**
 * Hook pour vérifier si un mot de passe a été compromis
 * Utilise l'API Have I Been Pwned (k-Anonymity)
 * 
 * Le mot de passe n'est jamais envoyé en clair - seuls les 5 premiers caractères
 * du hash SHA-1 sont envoyés à l'API.
 */
export function usePasswordCheck() {
    const [isChecking, setIsChecking] = useState(false);
    const [isCompromised, setIsCompromised] = useState(false);
    const [breachCount, setBreachCount] = useState(0);
    const [error, setError] = useState(null);

    /**
     * Hash le mot de passe en SHA-1
     */
    const sha1 = async (message) => {
        const encoder = new TextEncoder();
        const data = encoder.encode(message);
        const hashBuffer = await crypto.subtle.digest('SHA-1', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
    };

    /**
     * Vérifie si le mot de passe a été compromis
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
            // Calculer le hash SHA-1 du mot de passe
            const hash = await sha1(password);
            const prefix = hash.substring(0, 5);
            const suffix = hash.substring(5);

            // Appeler l'API HIBP avec k-Anonymity
            const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
                headers: {
                    'Add-Padding': 'true', // Améliore la confidentialité
                },
            });

            if (!response.ok) {
                throw new Error('Failed to check password');
            }

            const data = await response.text();
            const lines = data.split('\n');

            // Chercher le suffixe dans la réponse
            let found = false;
            let count = 0;

            for (const line of lines) {
                const [lineSuffix, lineCount] = line.split(':');
                if (lineSuffix.trim() === suffix) {
                    found = true;
                    count = parseInt(lineCount.trim(), 10);
                    break;
                }
            }

            setIsCompromised(found);
            setBreachCount(count);

            return { isCompromised: found, breachCount: count };

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
        if (/(.){2,}/.test(password)) {
            score -= 10;
            feedback.push('Évitez les répétitions');
        }

        if (/^[a-zA-Z]+$/.test(password)) {
            score -= 10;
            feedback.push('N utilisez pas que des lettres');
        }

        if (/^[0-9]+$/.test(password)) {
            score -= 20;
            feedback.push('N utilisez pas que des chiffres');
        }

        // Mots communs (basique)
        const commonWords = ['password', '123456', 'qwerty', 'admin', 'letmein'];
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
