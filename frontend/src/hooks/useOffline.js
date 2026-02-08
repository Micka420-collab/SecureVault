import { useState, useEffect, useCallback } from 'react';

/**
 * Hook pour gérer le mode hors-ligne
 * 
 * Features:
 * - Détection de la connexion
 * - Stockage local des actions en attente
 * - Synchronisation lors du retour en ligne
 */
export function useOffline() {
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [isSyncing, setIsSyncing] = useState(false);
    const [pendingActions, setPendingActions] = useState([]);

    // Écouter les changements de connexion
    useEffect(() => {
        const handleOnline = () => {
            setIsOnline(true);
            // Tentative de synchronisation automatique
            syncPendingActions();
        };

        const handleOffline = () => {
            setIsOnline(false);
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // Charger les actions en attente
        loadPendingActions();

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    // Charger les actions en attente depuis localStorage
    const loadPendingActions = useCallback(() => {
        try {
            const stored = localStorage.getItem('pending_actions');
            if (stored) {
                const actions = JSON.parse(stored);
                setPendingActions(actions);
            }
        } catch (e) {
            console.error('Failed to load pending actions:', e);
        }
    }, []);

    // Sauvegarder les actions en attente
    const savePendingActions = useCallback((actions) => {
        try {
            localStorage.setItem('pending_actions', JSON.stringify(actions));
            setPendingActions(actions);
        } catch (e) {
            console.error('Failed to save pending actions:', e);
        }
    }, []);

    // Ajouter une action en attente
    const queueAction = useCallback((action) => {
        const newAction = {
            id: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            ...action,
        };
        
        const updated = [...pendingActions, newAction];
        savePendingActions(updated);
        
        // Enregistrer pour sync background si supporté
        if ('serviceWorker' in navigator && 'SyncManager' in window) {
            navigator.serviceWorker.ready.then((registration) => {
                registration.sync.register('sync-vault-changes').catch((err) => {
                    console.log('Background sync registration failed:', err);
                });
            });
        }
        
        return newAction.id;
    }, [pendingActions, savePendingActions]);

    // Supprimer une action complétée
    const removeAction = useCallback((actionId) => {
        const updated = pendingActions.filter(a => a.id !== actionId);
        savePendingActions(updated);
    }, [pendingActions, savePendingActions]);

    // Synchroniser les actions en attente
    const syncPendingActions = useCallback(async () => {
        if (pendingActions.length === 0 || !isOnline || isSyncing) {
            return;
        }

        setIsSyncing(true);
        const failed = [];

        for (const action of pendingActions) {
            try {
                // Exécuter l'action
                await executeAction(action);
                // Marquer comme réussie
                console.log('[Offline] Synced action:', action.id);
            } catch (error) {
                console.error('[Offline] Failed to sync action:', action.id, error);
                failed.push(action);
            }
        }

        // Sauvegarder les actions qui ont échoué
        savePendingActions(failed);
        setIsSyncing(false);

        return failed.length === 0;
    }, [pendingActions, isOnline, isSyncing, savePendingActions]);

    // Exécuter une action spécifique
    const executeAction = async (action) => {
        // Cette fonction serait appelée avec le contexte approprié
        // pour exécuter l'action (API call, etc.)
        switch (action.type) {
            case 'CREATE_ENTRY':
                // Appeler l'API pour créer l'entrée
                break;
            case 'UPDATE_ENTRY':
                // Appeler l'API pour mettre à jour
                break;
            case 'DELETE_ENTRY':
                // Appeler l'API pour supprimer
                break;
            default:
                throw new Error(`Unknown action type: ${action.type}`);
        }
    };

    // Forcer la synchronisation
    const forceSync = useCallback(async () => {
        return syncPendingActions();
    }, [syncPendingActions]);

    // Effacer toutes les actions en attente
    const clearPending = useCallback(() => {
        savePendingActions([]);
    }, [savePendingActions]);

    return {
        isOnline,
        isSyncing,
        pendingActions,
        pendingCount: pendingActions.length,
        queueAction,
        removeAction,
        syncPendingActions,
        forceSync,
        clearPending,
    };
}

/**
 * Hook pour stocker des données en cache local
 */
export function useLocalCache(key) {
    const [data, setData] = useState(null);
    const [isLoaded, setIsLoaded] = useState(false);

    // Charger depuis localStorage
    useEffect(() => {
        try {
            const stored = localStorage.getItem(`cache_${key}`);
            if (stored) {
                const parsed = JSON.parse(stored);
                // Vérifier si le cache n'est pas expiré
                if (parsed.expires && new Date(parsed.expires) > new Date()) {
                    setData(parsed.data);
                } else {
                    localStorage.removeItem(`cache_${key}`);
                }
            }
        } catch (e) {
            console.error('Failed to load cache:', e);
        }
        setIsLoaded(true);
    }, [key]);

    // Sauvegarder dans localStorage
    const saveCache = useCallback((newData, ttlMinutes = 60) => {
        try {
            const expires = new Date(Date.now() + ttlMinutes * 60 * 1000);
            const cacheData = {
                data: newData,
                expires: expires.toISOString(),
                updatedAt: new Date().toISOString(),
            };
            localStorage.setItem(`cache_${key}`, JSON.stringify(cacheData));
            setData(newData);
        } catch (e) {
            console.error('Failed to save cache:', e);
        }
    }, [key]);

    // Effacer le cache
    const clearCache = useCallback(() => {
        try {
            localStorage.removeItem(`cache_${key}`);
            setData(null);
        } catch (e) {
            console.error('Failed to clear cache:', e);
        }
    }, [key]);

    return {
        data,
        isLoaded,
        saveCache,
        clearCache,
    };
}

export default useOffline;
