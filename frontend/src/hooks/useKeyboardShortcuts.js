/**
 * Keyboard Shortcuts Hook - SecureVault by Nextendo x Micka Delcato
 * Gestion des raccourcis clavier globaux
 */

import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

export const SHORTCUTS = {
    // Navigation
    GO_TO_VAULT: { key: 'g', modifier: 'alt', description: 'Aller au Coffre-fort' },
    GO_TO_ALIASES: { key: 'a', modifier: 'alt', description: 'Aller aux Aliases' },
    GO_TO_SECURITY: { key: 's', modifier: 'alt', description: 'Aller à Sécurité' },
    GO_TO_SETTINGS: { key: ',', modifier: 'alt', description: 'Paramètres' },
    
    // Actions
    NEW_ITEM: { key: 'n', modifier: 'ctrl', description: 'Nouveau mot de passe' },
    SEARCH: { key: 'k', modifier: 'ctrl', description: 'Recherche globale' },
    LOCK: { key: 'l', modifier: 'ctrl', shift: true, description: 'Verrouiller' },
    
    // Utilitaires
    HELP: { key: '/', modifier: null, description: 'Aide raccourcis' },
    ESCAPE: { key: 'Escape', modifier: null, description: 'Fermer/Fermer' },
};

export function useKeyboardShortcuts() {
    const navigate = useNavigate();
    const { lock, isAuthenticated } = useAuthStore();

    const handleKeyDown = useCallback((event) => {
        // Ignorer si dans un input (sauf Escape)
        const isInput = event.target.tagName === 'INPUT' || 
                       event.target.tagName === 'TEXTAREA' ||
                       event.target.isContentEditable;
        
        if (isInput && event.key !== 'Escape') return;
        
        const { key, ctrlKey, altKey, shiftKey, metaKey } = event;
        const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
        const cmdKey = isMac ? metaKey : ctrlKey;
        
        // Help
        if (key === '/' && !isInput) {
            event.preventDefault();
            // Ouvrir modal aide
            window.dispatchEvent(new CustomEvent('open-shortcuts-help'));
            return;
        }
        
        // Lock: Ctrl/Cmd + Shift + L
        if ((key === 'L' || key === 'l') && cmdKey && shiftKey && isAuthenticated) {
            event.preventDefault();
            lock();
            return;
        }
        
        // Search: Ctrl/Cmd + K
        if ((key === 'k' || key === 'K') && cmdKey && !shiftKey) {
            event.preventDefault();
            window.dispatchEvent(new CustomEvent('open-spotlight-search'));
            return;
        }
        
        // New Item: Ctrl/Cmd + N
        if ((key === 'n' || key === 'N') && cmdKey && isAuthenticated) {
            event.preventDefault();
            window.dispatchEvent(new CustomEvent('create-new-item'));
            return;
        }
        
        // Navigation Alt + key
        if (altKey && !ctrlKey && !metaKey && isAuthenticated) {
            switch (key.toLowerCase()) {
                case 'g':
                    event.preventDefault();
                    navigate('/vault');
                    break;
                case 'a':
                    event.preventDefault();
                    navigate('/aliases');
                    break;
                case 's':
                    event.preventDefault();
                    navigate('/security');
                    break;
                case ',':
                    event.preventDefault();
                    navigate('/settings');
                    break;
                default:
                    break;
            }
        }
        
        // Escape
        if (key === 'Escape') {
            window.dispatchEvent(new CustomEvent('escape-pressed'));
        }
    }, [navigate, lock, isAuthenticated]);

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);
}

export function getShortcutDisplay(shortcut) {
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const modifier = shortcut.modifier === 'ctrl' 
        ? (isMac ? '⌘' : 'Ctrl') 
        : shortcut.modifier === 'alt' 
            ? (isMac ? '⌥' : 'Alt')
            : '';
    const shift = shortcut.shift ? (isMac ? '⇧' : 'Shift') + '+' : '';
    const key = shortcut.key === ',' ? ',' : shortcut.key.toUpperCase();
    
    return `${modifier}${modifier ? '+' : ''}${shift}${key}`;
}
