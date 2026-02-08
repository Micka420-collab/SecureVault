/**
 * Spotlight Search - SecureVault by Nextendo x Micka Delcato
 * Recherche globale style CMD+K / Spotlight
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X, Key, Mail, Shield, FileText, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// Données de démo - à remplacer par vraies données
const MOCK_DATA = [
    { id: '1', type: 'password', title: 'Google', username: 'user@gmail.com', category: 'Social' },
    { id: '2', type: 'password', title: 'GitHub', username: 'dev', category: 'Dev' },
    { id: '3', type: 'alias', title: 'newsletter@alias.com', forwardTo: 'real@email.com' },
    { id: '4', type: 'document', title: 'Passeport.pdf', size: '2.4 MB' },
];

const RECENT_SEARCHES = [];

export default function SpotlightSearch() {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [results, setResults] = useState([]);
    const inputRef = useRef(null);
    const navigate = useNavigate();

    // Ouvrir avec événement custom
    useEffect(() => {
        const handleOpen = () => {
            setIsOpen(true);
            setQuery('');
            setSelectedIndex(0);
        };
        window.addEventListener('open-spotlight-search', handleOpen);
        return () => window.removeEventListener('open-spotlight-search', handleOpen);
    }, []);

    // Focus input quand ouvert
    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen]);

    // Fermer avec Escape
    useEffect(() => {
        const handleEscape = () => setIsOpen(false);
        if (isOpen) {
            window.addEventListener('escape-pressed', handleEscape);
            return () => window.removeEventListener('escape-pressed', handleEscape);
        }
    }, [isOpen]);

    // Recherche fuzzy
    useEffect(() => {
        if (!query.trim()) {
            setResults([]);
            return;
        }

        const lowerQuery = query.toLowerCase();
        const filtered = MOCK_DATA.filter(item => {
            const searchable = `${item.title} ${item.username || ''} ${item.category || ''}`.toLowerCase();
            return searchable.includes(lowerQuery);
        });

        // Ajouter actions rapides
        const actions = [];
        if ('nouveau'.includes(lowerQuery) || 'password'.includes(lowerQuery)) {
            actions.push({ type: 'action', id: 'new-password', title: 'Nouveau mot de passe', icon: Key, action: () => navigate('/vault?action=new') });
        }
        if ('alias'.includes(lowerQuery)) {
            actions.push({ type: 'action', id: 'new-alias', title: 'Nouvel alias email', icon: Mail, action: () => navigate('/aliases?action=new') });
        }

        setResults([...actions, ...filtered]);
        setSelectedIndex(0);
    }, [query, navigate]);

    // Navigation clavier
    const handleKeyDown = useCallback((e) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(prev => (prev + 1) % results.length);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(prev => (prev - 1 + results.length) % results.length);
        } else if (e.key === 'Enter' && results[selectedIndex]) {
            e.preventDefault();
            const item = results[selectedIndex];
            if (item.action) {
                item.action();
            } else if (item.type === 'password') {
                navigate(`/vault?id=${item.id}`);
            } else if (item.type === 'alias') {
                navigate(`/aliases?id=${item.id}`);
            }
            setIsOpen(false);
        }
    }, [results, selectedIndex, navigate]);

    if (!isOpen) return null;

    const getIcon = (item) => {
        if (item.icon) return item.icon;
        switch (item.type) {
            case 'password': return Key;
            case 'alias': return Mail;
            case 'document': return FileText;
            default: return Shield;
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]">
            {/* Overlay */}
            <div 
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={() => setIsOpen(false)}
            />
            
            {/* Search Container */}
            <div className="relative w-full max-w-2xl mx-4 bg-surface1 rounded-2xl border border-surface2 shadow-2xl overflow-hidden">
                {/* Input */}
                <div className="flex items-center gap-4 p-4 border-b border-surface2">
                    <Search className="w-6 h-6 text-subtext0" />
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Rechercher un mot de passe, alias, document..."
                        className="flex-1 bg-transparent text-lg text-text placeholder-subtext0 outline-none"
                    />
                    <kbd className="px-2 py-1 rounded-lg bg-surface2 text-subtext0 text-sm font-mono">
                        ESC
                    </kbd>
                </div>
                
                {/* Results */}
                <div className="max-h-[50vh] overflow-y-auto py-2">
                    {results.length === 0 && query && (
                        <div className="p-8 text-center text-subtext0">
                            Aucun résultat pour "{query}"
                        </div>
                    )}
                    
                    {results.map((item, index) => {
                        const Icon = getIcon(item);
                        const isSelected = index === selectedIndex;
                        
                        return (
                            <button
                                key={item.id}
                                onClick={() => {
                                    if (item.action) item.action();
                                    setIsOpen(false);
                                }}
                                onMouseEnter={() => setSelectedIndex(index)}
                                className={`w-full flex items-center gap-4 px-4 py-3 transition-colors ${
                                    isSelected ? 'bg-cyan-400/10' : 'hover:bg-surface0'
                                }`}
                            >
                                <div className={`p-2 rounded-xl ${isSelected ? 'bg-cyan-400/20' : 'bg-surface2'}`}>
                                    <Icon className={`w-5 h-5 ${isSelected ? 'text-cyan-400' : 'text-subtext0'}`} />
                                </div>
                                
                                <div className="flex-1 text-left">
                                    <div className={`font-medium ${isSelected ? 'text-cyan-400' : 'text-text'}`}>
                                        {item.title}
                                    </div>
                                    <div className="text-sm text-subtext0">
                                        {item.username || item.forwardTo || item.category || item.size}
                                    </div>
                                </div>
                                
                                {isSelected && (
                                    <kbd className="px-2 py-1 rounded bg-surface2 text-subtext0 text-xs">
                                        ↵
                                    </kbd>
                                )}
                            </button>
                        );
                    })}
                </div>
                
                {/* Footer */}
                <div className="flex items-center gap-4 px-4 py-2 border-t border-surface2 bg-surface0/30 text-xs text-subtext0">
                    <span>↑↓ pour naviguer</span>
                    <span>•</span>
                    <span>↵ pour sélectionner</span>
                    <span>•</span>
                    <span>ESC pour fermer</span>
                </div>
            </div>
        </div>
    );
}
