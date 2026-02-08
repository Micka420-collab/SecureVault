/**
 * Theme Toggle Component - SecureVault by Nextendo x Micka Delcato
 * Bouton de basculement Dark/Light
 */

import { Moon, Sun, Monitor } from 'lucide-react';
import { useThemeStore, THEMES } from '../stores/themeStore';
import { useEffect, useState } from 'react';

export default function ThemeToggle({ showLabel = false, size = 'md' }) {
    const { theme, setTheme, toggleTheme } = useThemeStore();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return <div className={`theme-toggle-placeholder theme-toggle-${size}`} />;
    }

    const sizeClasses = {
        sm: 'w-8 h-8',
        md: 'w-10 h-10',
        lg: 'w-12 h-12'
    };

    const iconSizes = {
        sm: 16,
        md: 20,
        lg: 24
    };

    const getIcon = () => {
        switch (theme) {
            case THEMES.LIGHT:
                return <Sun size={iconSizes[size]} className="text-yellow-500" />;
            case THEMES.DARK:
                return <Moon size={iconSizes[size]} className="text-lavender" />;
            case THEMES.AUTO:
                return <Monitor size={iconSizes[size]} className="text-blue" />;
            default:
                return <Moon size={iconSizes[size]} />;
        }
    };

    const getLabel = () => {
        switch (theme) {
            case THEMES.LIGHT:
                return 'Clair';
            case THEMES.DARK:
                return 'Sombre';
            case THEMES.AUTO:
                return 'Auto';
            default:
                return '';
        }
    };

    return (
        <div className="flex items-center gap-2">
            <button
                onClick={toggleTheme}
                className={`
                    ${sizeClasses[size]}
                    flex items-center justify-center
                    rounded-xl
                    bg-surface0
                    hover:bg-surface1
                    active:scale-95
                    transition-all duration-200
                    border border-surface1
                    hover:border-surface2
                    focus:outline-none focus:ring-2 focus:ring-cyan-400/50
                `}
                title={`Thème: ${getLabel()} (cliquez pour changer)`}
                aria-label={`Thème actuel: ${getLabel()}`}
            >
                {getIcon()}
            </button>
            
            {showLabel && (
                <span className="text-sm text-subtext0 font-medium">
                    {getLabel()}
                </span>
            )}
        </div>
    );
}

// Sélecteur de thème complet avec menu
export function ThemeSelector() {
    const { theme, setTheme, THEMES } = useThemeStore();
    const [isOpen, setIsOpen] = useState(false);

    const themes = [
        { id: THEMES.DARK, label: 'Sombre', icon: Moon, description: 'Thème sombre Catppuccin' },
        { id: THEMES.LIGHT, label: 'Clair', icon: Sun, description: 'Thème clair Catppuccin' },
        { id: THEMES.AUTO, label: 'Automatique', icon: Monitor, description: 'Selon votre système' }
    ];

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-3 w-full p-3 rounded-xl bg-surface0 hover:bg-surface1 transition-colors border border-surface1"
            >
                {theme === THEMES.DARK && <Moon size={20} className="text-lavender" />}
                {theme === THEMES.LIGHT && <Sun size={20} className="text-yellow-500" />}
                {theme === THEMES.AUTO && <Monitor size={20} className="text-blue" />}
                <span className="flex-1 text-left">
                    {themes.find(t => t.id === theme)?.label}
                </span>
                <svg 
                    className={`w-5 h-5 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {isOpen && (
                <>
                    <div 
                        className="fixed inset-0 z-40"
                        onClick={() => setIsOpen(false)}
                    />
                    <div className="absolute top-full left-0 right-0 mt-2 p-2 rounded-xl bg-surface1 border border-surface2 shadow-xl z-50">
                        {themes.map(({ id, label, icon: Icon, description }) => (
                            <button
                                key={id}
                                onClick={() => {
                                    setTheme(id);
                                    setIsOpen(false);
                                }}
                                className={`
                                    flex items-center gap-3 w-full p-3 rounded-lg
                                    transition-colors text-left
                                    ${theme === id 
                                        ? 'bg-cyan-400/10 border border-cyan-400/30' 
                                        : 'hover:bg-surface0'
                                    }
                                `}
                            >
                                <Icon 
                                    size={20} 
                                    className={theme === id ? 'text-cyan-400' : 'text-subtext0'} 
                                />
                                <div className="flex-1">
                                    <div className={`font-medium ${theme === id ? 'text-cyan-400' : 'text-text'}`}>
                                        {label}
                                    </div>
                                    <div className="text-xs text-subtext0">
                                        {description}
                                    </div>
                                </div>
                                {theme === id && (
                                    <div className="w-2 h-2 rounded-full bg-cyan-400" />
                                )}
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}
