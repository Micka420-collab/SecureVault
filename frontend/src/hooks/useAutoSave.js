import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Hook pour l'auto-save des données du vault
 * 
 * Features:
 * - Sauvegarde automatique après inactivité
 * - Sauvegarde périodique
 * - Gestion des conflits
 * - Indicateur de statut
 * - Récupération en cas d'erreur
 */
export function useAutoSave({
    data,
    onSave,
    debounceMs = 3000,      // Sauvegarder 3s après la dernière modification
    intervalMs = 30000,     // Sauvegarder toutes les 30s si modifié
    maxRetries = 3,
    enabled = true,
}) {
    const [status, setStatus] = useState('idle'); // idle, saving, saved, error
    const [lastSaved, setLastSaved] = useState(null);
    const [error, setError] = useState(null);
    
    const dataRef = useRef(data);
    const savedDataRef = useRef(null);
    const timeoutRef = useRef(null);
    const intervalRef = useRef(null);
    const retryCountRef = useRef(0);
    const isMountedRef = useRef(true);

    // Mettre à jour la ref des données
    useEffect(() => {
        dataRef.current = data;
    }, [data]);

    // Fonction de sauvegarde
    const performSave = useCallback(async (isRetry = false) => {
        if (!enabled || !isMountedRef.current) return;
        
        const currentData = dataRef.current;
        
        // Ne pas sauvegarder si pas de changement
        if (JSON.stringify(currentData) === JSON.stringify(savedDataRef.current)) {
            return;
        }

        setStatus('saving');
        setError(null);

        try {
            await onSave(currentData);
            
            if (!isMountedRef.current) return;
            
            savedDataRef.current = currentData;
            setStatus('saved');
            setLastSaved(new Date());
            retryCountRef.current = 0;
            
            // Revenir à idle après 2 secondes
            setTimeout(() => {
                if (isMountedRef.current) {
                    setStatus(prev => prev === 'saved' ? 'idle' : prev);
                }
            }, 2000);
            
        } catch (err) {
            if (!isMountedRef.current) return;
            
            console.error('Auto-save failed:', err);
            
            if (retryCountRef.current < maxRetries && !isRetry) {
                retryCountRef.current++;
                setTimeout(() => performSave(true), 1000 * retryCountRef.current);
                setStatus('saving');
            } else {
                setStatus('error');
                setError(err.message || 'Save failed');
            }
        }
    }, [enabled, onSave, maxRetries]);

    // Debounce sur les changements de données
    useEffect(() => {
        if (!enabled) return;

        // Effacer le timeout précédent
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        // Programmer une nouvelle sauvegarde
        timeoutRef.current = setTimeout(() => {
            performSave();
        }, debounceMs);

        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, [data, enabled, debounceMs, performSave]);

    // Sauvegarde périodique
    useEffect(() => {
        if (!enabled) return;

        intervalRef.current = setInterval(() => {
            performSave();
        }, intervalMs);

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [enabled, intervalMs, performSave]);

    // Sauvegarder avant de quitter la page
    useEffect(() => {
        if (!enabled) return;

        const handleBeforeUnload = (e) => {
            if (JSON.stringify(dataRef.current) !== JSON.stringify(savedDataRef.current)) {
                // Tentative de sauvegarde synchrone
                performSave();
                
                // Avertir l'utilisateur
                e.preventDefault();
                e.returnValue = '';
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [enabled, performSave]);

    // Cleanup
    useEffect(() => {
        return () => {
            isMountedRef.current = false;
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, []);

    // Forcer la sauvegarde manuellement
    const saveNow = useCallback(async () => {
        retryCountRef.current = 0;
        await performSave();
    }, [performSave]);

    // Vérifier s'il y a des changements non sauvegardés
    const hasUnsavedChanges = useCallback(() => {
        return JSON.stringify(dataRef.current) !== JSON.stringify(savedDataRef.current);
    }, []);

    return {
        status,
        lastSaved,
        error,
        saveNow,
        hasUnsavedChanges: hasUnsavedChanges(),
        isSaving: status === 'saving',
        isSaved: status === 'saved',
        isError: status === 'error',
    };
}

/**
 * Hook pour sauvegarder les brouillons localement
 */
export function useLocalDraft(key, data, options = {}) {
    const { enabled = true, debounceMs = 1000 } = options;
    const [hasDraft, setHasDraft] = useState(false);

    // Sauvegarder le brouillon
    useEffect(() => {
        if (!enabled || !data) return;

        const timeout = setTimeout(() => {
            try {
                localStorage.setItem(`draft_${key}`, JSON.stringify({
                    data,
                    timestamp: new Date().toISOString(),
                }));
                setHasDraft(true);
            } catch (e) {
                console.error('Failed to save draft:', e);
            }
        }, debounceMs);

        return () => clearTimeout(timeout);
    }, [key, data, enabled, debounceMs]);

    // Charger le brouillon
    const loadDraft = useCallback(() => {
        try {
            const draft = localStorage.getItem(`draft_${key}`);
            if (draft) {
                return JSON.parse(draft);
            }
        } catch (e) {
            console.error('Failed to load draft:', e);
        }
        return null;
    }, [key]);

    // Effacer le brouillon
    const clearDraft = useCallback(() => {
        try {
            localStorage.removeItem(`draft_${key}`);
            setHasDraft(false);
        } catch (e) {
            console.error('Failed to clear draft:', e);
        }
    }, [key]);

    // Vérifier s'il y a un brouillon au mount
    useEffect(() => {
        const draft = localStorage.getItem(`draft_${key}`);
        setHasDraft(!!draft);
    }, [key]);

    return {
        hasDraft,
        loadDraft,
        clearDraft,
    };
}

export default useAutoSave;
