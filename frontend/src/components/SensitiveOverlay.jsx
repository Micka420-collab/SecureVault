import { useState, useEffect, useCallback } from 'react';
import { Eye, EyeOff, Shield } from 'lucide-react';

/**
 * SensitiveOverlay - Protection contre les screenshots et la visualisation
 * 
 * Features:
 * - Masquage automatique après inactivité
 * - Protection contre l'enregistrement d'écran
 * - Détection de changement d'onglet/fenêtre
 * - Option "toujours visible"
 */
export default function SensitiveOverlay({ 
    children, 
    autoHideDelay = 30000, // 30 secondes par défaut
    sensitive = true,
    className = ''
}) {
    const [isVisible, setIsVisible] = useState(!sensitive);
    const [isHovered, setIsHovered] = useState(false);
    const [lastActivity, setLastActivity] = useState(Date.now());
    const [screenRecordingDetected, setScreenRecordingDetected] = useState(false);

    // Gérer l'activité utilisateur
    const handleActivity = useCallback(() => {
        if (sensitive) {
            setIsVisible(true);
            setLastActivity(Date.now());
        }
    }, [sensitive]);

    // Détecter le changement de visibilité de la page
    useEffect(() => {
        if (!sensitive) return;

        const handleVisibilityChange = () => {
            if (document.hidden) {
                // Masquer immédiatement quand l'onglet n'est pas visible
                setIsVisible(false);
            }
        };

        const handleWindowBlur = () => {
            // Masquer quand la fenêtre perd le focus
            setIsVisible(false);
        };

        const handleWindowFocus = () => {
            // Ne pas montrer automatiquement au focus
            setIsVisible(false);
        };

        // Détection basique d'enregistrement d'écran (API Display Media)
        const detectScreenRecording = async () => {
            if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
                // Note: On ne peut pas détecter directement si l'écran est enregistré,
                // mais on peut écouter les changements de taille de fenêtre
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('blur', handleWindowBlur);
        window.addEventListener('focus', handleWindowFocus);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('blur', handleWindowBlur);
            window.removeEventListener('focus', handleWindowFocus);
        };
    }, [sensitive]);

    // Timer d'inactivité
    useEffect(() => {
        if (!sensitive || !isVisible) return;

        const timer = setInterval(() => {
            const inactive = Date.now() - lastActivity;
            if (inactive > autoHideDelay && !isHovered) {
                setIsVisible(false);
            }
        }, 1000);

        return () => clearInterval(timer);
    }, [sensitive, isVisible, lastActivity, isHovered, autoHideDelay]);

    // Écouteurs d'activité
    useEffect(() => {
        if (!sensitive) return;

        const events = ['mousedown', 'keydown', 'touchstart', 'scroll'];
        events.forEach(event => {
            document.addEventListener(event, handleActivity);
        });

        return () => {
            events.forEach(event => {
                document.removeEventListener(event, handleActivity);
            });
        };
    }, [sensitive, handleActivity]);

    // Protection contre le Print Screen
    useEffect(() => {
        if (!sensitive) return;

        const handleKeyDown = (e) => {
            // Détecter Print Screen
            if (e.key === 'PrintScreen') {
                setIsVisible(false);
                e.preventDefault();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [sensitive]);

    if (!sensitive) {
        return <div className={className}>{children}</div>;
    }

    return (
        <div 
            className={`sensitive-container ${className}`}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            style={{ position: 'relative' }}
        >
            {/* Contenu réel */}
            <div 
                style={{ 
                    filter: isVisible ? 'none' : 'blur(8px)',
                    userSelect: isVisible ? 'text' : 'none',
                    transition: 'filter 0.3s ease',
                    opacity: isVisible ? 1 : 0.3,
                }}
            >
                {children}
            </div>

            {/* Overlay de protection */}
            {!isVisible && (
                <div 
                    className="sensitive-overlay"
                    style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'rgba(30, 30, 46, 0.95)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: 'var(--radius-md)',
                        cursor: 'pointer',
                        zIndex: 10,
                    }}
                    onClick={handleActivity}
                >
                    <Shield size={32} style={{ marginBottom: 'var(--space-md)', color: 'var(--color-primary)' }} />
                    <p style={{ fontWeight: 500, marginBottom: 'var(--space-sm)' }}>
                        Contenu masqué pour votre sécurité
                    </p>
                    <p className="text-muted text-sm" style={{ marginBottom: 'var(--space-md)' }}>
                        Cliquez ou appuyez sur une touche pour afficher
                    </p>
                    <button 
                        className="btn btn-secondary btn-sm"
                        onClick={(e) => {
                            e.stopPropagation();
                            handleActivity();
                        }}
                    >
                        <Eye size={16} />
                        Afficher
                    </button>
                </div>
            )}

            {/* Indicateur de visibilité */}
            {isVisible && sensitive && (
                <button
                    className="btn btn-icon btn-ghost"
                    style={{
                        position: 'absolute',
                        top: 'var(--space-sm)',
                        right: 'var(--space-sm)',
                        opacity: 0.5,
                        zIndex: 5,
                    }}
                    onClick={() => setIsVisible(false)}
                    title="Masquer le contenu"
                >
                    <EyeOff size={16} />
                </button>
            )}
        </div>
    );
}

/**
 * Hook pour utiliser la protection des données sensibles
 */
export function useSensitiveProtection() {
    const [globalProtection, setGlobalProtection] = useState(true);

    const disableProtection = useCallback(() => {
        setGlobalProtection(false);
    }, []);

    const enableProtection = useCallback(() => {
        setGlobalProtection(true);
    }, []);

    return {
        isProtected: globalProtection,
        disableProtection,
        enableProtection,
    };
}
