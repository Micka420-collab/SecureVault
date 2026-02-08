import { useState, useEffect, useCallback, useMemo } from 'react';
import { Search, Command, Lock, Key, Mail, Settings, LogOut, Plus, History, Shield, Share2, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

/**
 * Command Palette - Interface power-user type VS Code
 * Accessible via Cmd+K ou Ctrl+K
 * 
 * Features:
 * - Recherche floue (fuzzy search)
 * - Raccourcis clavier
 * - Actions rapides
 * - Historique des commandes
 */
export default function CommandPalette() {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const navigate = useNavigate();
    const { lock, logout } = useAuthStore();

    // Définition des commandes disponibles
    const commands = useMemo(() => [
        {
            id: 'goto-dashboard',
            title: 'Tableau de bord',
            description: 'Aller au tableau de bord',
            icon: Command,
            shortcut: 'G D',
            action: () => navigate('/dashboard'),
            category: 'Navigation',
        },
        {
            id: 'goto-vault',
            title: 'Coffre-fort',
            description: 'Voir toutes les entrées',
            icon: Lock,
            shortcut: 'G V',
            action: () => navigate('/vault'),
            category: 'Navigation',
        },
        {
            id: 'goto-aliases',
            title: 'Alias E-mail',
            description: 'Gérer les alias',
            icon: Mail,
            shortcut: 'G A',
            action: () => navigate('/aliases'),
            category: 'Navigation',
        },
        {
            id: 'goto-emails',
            title: 'Messages',
            description: 'Voir les emails',
            icon: Mail,
            shortcut: 'G M',
            action: () => navigate('/emails'),
            category: 'Navigation',
        },
        {
            id: 'goto-settings',
            title: 'Paramètres',
            description: 'Configuration',
            icon: Settings,
            shortcut: 'G S',
            action: () => navigate('/settings'),
            category: 'Navigation',
        },
        {
            id: 'create-entry',
            title: 'Nouvelle entrée',
            description: 'Ajouter un mot de passe',
            icon: Plus,
            shortcut: 'N E',
            action: () => navigate('/vault?action=create'),
            category: 'Actions',
        },
        {
            id: 'create-alias',
            title: 'Nouvel alias',
            description: 'Créer un alias email',
            icon: Plus,
            shortcut: 'N A',
            action: () => navigate('/aliases?action=create'),
            category: 'Actions',
        },
        {
            id: 'lock-vault',
            title: 'Verrouiller le coffre',
            description: 'Verrouillage immédiat',
            icon: Lock,
            shortcut: 'Ctrl+L',
            action: () => {
                lock();
                setIsOpen(false);
            },
            category: 'Actions',
        },
        {
            id: 'security-score',
            title: 'Score de sécurité',
            description: 'Voir mon score de sécurité',
            icon: Shield,
            shortcut: '',
            action: () => navigate('/dashboard?tab=security'),
            category: 'Sécurité',
        },
        {
            id: 'generate-password',
            title: 'Générer un mot de passe',
            description: 'Ouvrir le générateur',
            icon: Key,
            shortcut: '',
            action: () => navigate('/vault?action=generate'),
            category: 'Outils',
        },
        {
            id: 'diceware',
            title: 'Passphrase Diceware',
            description: 'Générer une passphrase mémorisable',
            icon: Key,
            shortcut: '',
            action: () => navigate('/vault?action=diceware'),
            category: 'Outils',
        },
        {
            id: 'secure-share',
            title: 'Partage sécurisé',
            description: 'Créer un lien temporaire',
            icon: Share2,
            shortcut: '',
            action: () => navigate('/vault?action=share'),
            category: 'Outils',
        },
        {
            id: 'emergency-access',
            title: 'Accès d\'urgence',
            description: 'Configurer un contact de confiance',
            icon: AlertCircle,
            shortcut: '',
            action: () => navigate('/settings?tab=emergency'),
            category: 'Sécurité',
        },
        {
            id: 'audit-logs',
            title: 'Historique d\'audit',
            description: 'Voir les logs de sécurité',
            icon: History,
            shortcut: '',
            action: () => navigate('/settings?tab=audit'),
            category: 'Sécurité',
        },
        {
            id: 'logout',
            title: 'Déconnexion',
            description: 'Se déconnecter',
            icon: LogOut,
            shortcut: '',
            action: async () => {
                await logout();
                setIsOpen(false);
            },
            category: 'Compte',
        },
    ], [navigate, lock, logout]);

    // Fuzzy search
    const filteredCommands = useMemo(() => {
        if (!search) return commands;
        
        const searchLower = search.toLowerCase();
        return commands.filter(cmd => {
            const text = `${cmd.title} ${cmd.description} ${cmd.category}`.toLowerCase();
            return text.includes(searchLower);
        });
    }, [commands, search]);

    // Groupement par catégorie
    const groupedCommands = useMemo(() => {
        const groups = {};
        filteredCommands.forEach(cmd => {
            if (!groups[cmd.category]) groups[cmd.category] = [];
            groups[cmd.category].push(cmd);
        });
        return groups;
    }, [filteredCommands]);

    // Navigation clavier
    const handleKeyDown = useCallback((e) => {
        // Ouvrir avec Cmd+K ou Ctrl+K
        if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
            e.preventDefault();
            setIsOpen(true);
            return;
        }

        if (!isOpen) return;

        switch (e.key) {
            case 'Escape':
                setIsOpen(false);
                break;
            case 'ArrowDown':
                e.preventDefault();
                setSelectedIndex(i => Math.min(i + 1, filteredCommands.length - 1));
                break;
            case 'ArrowUp':
                e.preventDefault();
                setSelectedIndex(i => Math.max(i - 1, 0));
                break;
            case 'Enter':
                e.preventDefault();
                const cmd = filteredCommands[selectedIndex];
                if (cmd) {
                    cmd.action();
                    setIsOpen(false);
                    setSearch('');
                }
                break;
        }
    }, [isOpen, filteredCommands, selectedIndex]);

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);

    // Reset selection when search changes
    useEffect(() => {
        setSelectedIndex(0);
    }, [search]);

    if (!isOpen) return null;

    let globalIndex = 0;

    return (
        <div 
            className="modal-overlay"
            onClick={() => setIsOpen(false)}
            style={{ zIndex: 9999 }}
        >
            <div 
                className="command-palette"
                onClick={e => e.stopPropagation()}
                style={{
                    background: 'var(--color-base)',
                    border: '1px solid var(--color-surface1)',
                    borderRadius: 'var(--radius-xl)',
                    width: '100%',
                    maxWidth: '640px',
                    maxHeight: '70vh',
                    overflow: 'hidden',
                    boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
                }}
            >
                {/* Header */}
                <div style={{
                    padding: 'var(--space-md) var(--space-lg)',
                    borderBottom: '1px solid var(--color-surface0)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-md)',
                }}>
                    <Search size={20} color="var(--color-subtext0)" />
                    <input
                        type="text"
                        placeholder="Rechercher une commande..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        autoFocus
                        style={{
                            flex: 1,
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--color-text)',
                            fontSize: '1rem',
                            outline: 'none',
                        }}
                    />
                    <kbd style={{
                        padding: '2px 8px',
                        background: 'var(--color-surface0)',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.75rem',
                        color: 'var(--color-subtext0)',
                    }}>ESC</kbd>
                </div>

                {/* Results */}
                <div style={{
                    overflowY: 'auto',
                    maxHeight: '50vh',
                }}>
                    {Object.entries(groupedCommands).map(([category, cmds]) => (
                        <div key={category}>
                            <div style={{
                                padding: 'var(--space-sm) var(--space-lg)',
                                color: 'var(--color-subtext0)',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em',
                            }}>
                                {category}
                            </div>
                            {cmds.map((cmd) => {
                                const isSelected = globalIndex === selectedIndex;
                                const Icon = cmd.icon;
                                const currentIndex = globalIndex++;

                                return (
                                    <button
                                        key={cmd.id}
                                        onClick={() => {
                                            cmd.action();
                                            setIsOpen(false);
                                        }}
                                        onMouseEnter={() => setSelectedIndex(currentIndex)}
                                        style={{
                                            width: '100%',
                                            padding: 'var(--space-sm) var(--space-lg)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 'var(--space-md)',
                                            background: isSelected ? 'var(--color-surface0)' : 'transparent',
                                            border: 'none',
                                            color: 'var(--color-text)',
                                            cursor: 'pointer',
                                            textAlign: 'left',
                                            transition: 'background 0.15s',
                                        }}
                                    >
                                        <Icon size={18} color={isSelected ? 'var(--color-primary)' : 'var(--color-subtext0)'} />
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: 500 }}>{cmd.title}</div>
                                            <div style={{ 
                                                fontSize: '0.875rem', 
                                                color: 'var(--color-subtext0)'
                                            }}>
                                                {cmd.description}
                                            </div>
                                        </div>
                                        {cmd.shortcut && (
                                            <kbd style={{
                                                padding: '2px 6px',
                                                background: isSelected ? 'var(--color-surface1)' : 'var(--color-surface0)',
                                                borderRadius: 'var(--radius-sm)',
                                                fontSize: '0.75rem',
                                            }}>
                                                {cmd.shortcut}
                                            </kbd>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    ))}

                    {filteredCommands.length === 0 && (
                        <div style={{
                            padding: 'var(--space-xl)',
                            textAlign: 'center',
                            color: 'var(--color-subtext0)',
                        }}>
                            Aucune commande trouvée pour "{search}"
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div style={{
                    padding: 'var(--space-sm) var(--space-lg)',
                    borderTop: '1px solid var(--color-surface0)',
                    display: 'flex',
                    gap: 'var(--space-lg)',
                    fontSize: '0.75rem',
                    color: 'var(--color-subtext0)',
                }}>
                    <span><kbd>↑↓</kbd> Naviguer</span>
                    <span><kbd>↵</kbd> Sélectionner</span>
                    <span><kbd>ESC</kbd> Fermer</span>
                </div>
            </div>
        </div>
    );
}
