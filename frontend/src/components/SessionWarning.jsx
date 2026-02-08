import { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, RefreshCw, LogOut } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';

/**
 * SessionWarning - Avertit l'utilisateur avant l'expiration de la session
 * 
 * Features:
 * - Compte à rebours visible
 * - Option pour prolonger la session
 * - Déconnexion automatique
 */
export default function SessionWarning() {
    const { 
        isAuthenticated, 
        isLocked, 
        lastActivity, 
        resetActivity, 
        lock,
        logout 
    } = useAuthStore();
    
    const [showWarning, setShowWarning] = useState(false);
    const [timeRemaining, setTimeRemaining] = useState(0);
    
    const LOCK_TIMEOUT = 15 * 60 * 1000; // 15 minutes
    const WARNING_THRESHOLD = 2 * 60 * 1000; // Avertir 2 minutes avant

    const formatTime = useCallback((ms) => {
        const seconds = Math.ceil(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }, []);

    useEffect(() => {
        if (!isAuthenticated || isLocked) {
            setShowWarning(false);
            return;
        }

        const interval = setInterval(() => {
            const now = Date.now();
            const elapsed = now - lastActivity;
            const remaining = Math.max(0, LOCK_TIMEOUT - elapsed);

            setTimeRemaining(remaining);

            // Afficher l'avertissement quand il reste moins de 2 minutes
            if (remaining <= WARNING_THRESHOLD && remaining > 0) {
                setShowWarning(true);
            } else if (remaining === 0) {
                setShowWarning(false);
                lock();
            } else {
                setShowWarning(false);
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [isAuthenticated, isLocked, lastActivity, lock]);

    const handleExtend = useCallback(() => {
        resetActivity();
        setShowWarning(false);
    }, [resetActivity]);

    const handleLogout = useCallback(async () => {
        await logout();
        setShowWarning(false);
    }, [logout]);

    const handleLock = useCallback(() => {
        lock();
        setShowWarning(false);
    }, [lock]);

    if (!showWarning) return null;

    return (
        <div 
            style={{
                position: 'fixed',
                bottom: 'var(--space-lg)',
                right: 'var(--space-lg)',
                zIndex: 9999,
                animation: 'slideUp 0.3s ease',
            }}
        >
            <div 
                className="card"
                style={{
                    background: 'rgba(249, 226, 175, 0.95)',
                    border: '2px solid var(--color-warning)',
                    color: '#1e1e2e',
                    minWidth: '350px',
                    backdropFilter: 'blur(10px)',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', marginBottom: 'var(--space-md)' }}>
                    <div 
                        style={{
                            width: 40,
                            height: 40,
                            borderRadius: 'var(--radius-full)',
                            background: 'var(--color-warning)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <AlertTriangle size={24} color="#1e1e2e" />
                    </div>
                    <div>
                        <h4 style={{ fontWeight: 600, marginBottom: 4 }}>
                            Session sur le point d expirer
                        </h4>
                        <p style={{ fontSize: '0.875rem', opacity: 0.9 }}>
                            Verrouillage dans <strong>{formatTime(timeRemaining)}</strong>
                        </p>
                    </div>
                </div>

                <div 
                    style={{
                        height: 4,
                        background: 'rgba(0,0,0,0.1)',
                        borderRadius: 'var(--radius-full)',
                        marginBottom: 'var(--space-md)',
                        overflow: 'hidden',
                    }}
                >
                    <div 
                        style={{
                            height: '100%',
                            width: `${(timeRemaining / WARNING_THRESHOLD) * 100}%`,
                            background: timeRemaining < 30000 ? '#f38ba8' : '#1e1e2e',
                            transition: 'width 1s linear, background 0.3s',
                        }}
                    />
                </div>

                <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                    <button 
                        className="btn btn-primary"
                        onClick={handleExtend}
                        style={{ 
                            flex: 1,
                            background: '#1e1e2e',
                            color: 'var(--color-warning)',
                        }}
                    >
                        <RefreshCw size={16} />
                        Prolonger
                    </button>
                    <button 
                        className="btn btn-secondary"
                        onClick={handleLock}
                        style={{ 
                            background: 'rgba(30, 30, 46, 0.2)',
                            color: '#1e1e2e',
                        }}
                    >
                        Verrouiller
                    </button>
                    <button 
                        className="btn btn-secondary"
                        onClick={handleLogout}
                        style={{ 
                            background: 'rgba(30, 30, 46, 0.2)',
                            color: '#1e1e2e',
                        }}
                    >
                        <LogOut size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
}
