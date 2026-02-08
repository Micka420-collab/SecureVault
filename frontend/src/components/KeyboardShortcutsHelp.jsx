/**
 * Keyboard Shortcuts Help Modal - SecureVault by Nextendo x Micka Delcato
 * Affiche l'aide des raccourcis clavier
 */

import { useState, useEffect } from 'react';
import { X, Keyboard } from 'lucide-react';
import { SHORTCUTS, getShortcutDisplay } from '../hooks/useKeyboardShortcuts';

export default function KeyboardShortcutsHelp() {
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        const handleOpen = () => setIsOpen(true);
        window.addEventListener('open-shortcuts-help', handleOpen);
        return () => window.removeEventListener('open-shortcuts-help', handleOpen);
    }, []);

    // Fermer avec Escape
    useEffect(() => {
        const handleEscape = () => setIsOpen(false);
        if (isOpen) {
            window.addEventListener('escape-pressed', handleEscape);
            return () => window.removeEventListener('escape-pressed', handleEscape);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const categories = [
        {
            title: 'Navigation',
            shortcuts: [SHORTCUTS.GO_TO_VAULT, SHORTCUTS.GO_TO_ALIASES, SHORTCUTS.GO_TO_SECURITY, SHORTCUTS.GO_TO_SETTINGS]
        },
        {
            title: 'Actions',
            shortcuts: [SHORTCUTS.NEW_ITEM, SHORTCUTS.SEARCH, SHORTCUTS.LOCK]
        },
        {
            title: 'Utilitaires',
            shortcuts: [SHORTCUTS.HELP, SHORTCUTS.ESCAPE]
        }
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Overlay */}
            <div 
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={() => setIsOpen(false)}
            />
            
            {/* Modal */}
            <div className="relative w-full max-w-2xl bg-surface1 rounded-2xl border border-surface2 shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-surface2">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-cyan-400/10">
                            <Keyboard className="w-6 h-6 text-cyan-400" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-text">Raccourcis Clavier</h2>
                            <p className="text-sm text-subtext0">SecureVault by Nextendo x Micka Delcato</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setIsOpen(false)}
                        className="p-2 rounded-lg text-subtext0 hover:text-text hover:bg-surface2 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>
                
                {/* Content */}
                <div className="p-6 max-h-[60vh] overflow-y-auto">
                    {categories.map((category, idx) => (
                        <div key={category.title} className={idx > 0 ? 'mt-6' : ''}>
                            <h3 className="text-sm font-semibold text-subtext0 uppercase tracking-wider mb-3">
                                {category.title}
                            </h3>
                            <div className="space-y-2">
                                {category.shortcuts.map((shortcut) => (
                                    <div 
                                        key={shortcut.key}
                                        className="flex items-center justify-between p-3 rounded-xl bg-surface0/50 hover:bg-surface0 transition-colors"
                                    >
                                        <span className="text-text">{shortcut.description}</span>
                                        <kbd className="px-3 py-1.5 rounded-lg bg-surface2 border border-surface1 font-mono text-sm text-cyan-400">
                                            {getShortcutDisplay(shortcut)}
                                        </kbd>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
                
                {/* Footer */}
                <div className="p-4 border-t border-surface2 bg-surface0/30">
                    <p className="text-center text-sm text-subtext0">
                        Appuyez sur <kbd className="px-2 py-0.5 rounded bg-surface2 text-text">/</kbd> pour ouvrir cette aide
                    </p>
                </div>
            </div>
        </div>
    );
}
