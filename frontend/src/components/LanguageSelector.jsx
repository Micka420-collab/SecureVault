/**
 * Language Selector - SecureVault by Nextendo x Micka Delcato
 * Sélecteur de langue avec drapeaux
 */

import { Globe, Check } from 'lucide-react';
import { useI18nStore } from '../stores/i18nStore';
import { useState, useEffect, useRef } from 'react';

export default function LanguageSelector({ showLabel = false, size = 'md' }) {
    const { locale, setLocale, availableLocales } = useI18nStore();
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef(null);

    // Fermer en cliquant à l'extérieur
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const currentLocale = availableLocales.find(l => l.code === locale);

    const sizeClasses = {
        sm: 'w-8 h-8 text-xs',
        md: 'w-10 h-10 text-sm',
        lg: 'w-12 h-12 text-base'
    };

    return (
        <div ref={containerRef} className="relative">
            <div className="flex items-center gap-2">
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className={`
                        ${sizeClasses[size]}
                        flex items-center justify-center gap-1
                        rounded-xl
                        bg-surface0
                        hover:bg-surface1
                        active:scale-95
                        transition-all duration-200
                        border border-surface1
                        hover:border-surface2
                        focus:outline-none focus:ring-2 focus:ring-cyan-400/50
                    `}
                    title={`Langue: ${currentLocale?.name}`}
                >
                    <span className="text-lg">{currentLocale?.flag}</span>
                    <Globe size={14} className="text-subtext0" />
                </button>
                
                {showLabel && (
                    <span className="text-sm text-subtext0 font-medium">
                        {currentLocale?.name}
                    </span>
                )}
            </div>

            {isOpen && (
                <div className="absolute top-full right-0 mt-2 w-48 py-2 rounded-xl bg-surface1 border border-surface2 shadow-xl z-50">
                    <div className="px-3 py-2 text-xs font-semibold text-subtext0 uppercase tracking-wider">
                        Sélectionner la langue
                    </div>
                    
                    {availableLocales.map((loc) => (
                        <button
                            key={loc.code}
                            onClick={() => {
                                setLocale(loc.code);
                                setIsOpen(false);
                            }}
                            className={`
                                flex items-center justify-between w-full px-3 py-2
                                transition-colors
                                ${locale === loc.code 
                                    ? 'bg-cyan-400/10 text-cyan-400' 
                                    : 'text-text hover:bg-surface0'
                                }
                            `}
                        >
                            <div className="flex items-center gap-3">
                                <span className="text-xl">{loc.flag}</span>
                                <span className="font-medium">{loc.name}</span>
                            </div>
                            
                            {locale === loc.code && (
                                <Check size={16} />
                            )}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
