import { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw, AlertCircle } from 'lucide-react';
import { useOffline } from '../hooks/useOffline';

/**
 * OfflineStatus - Indicateur de connexion et actions en attente
 */
export default function OfflineStatus() {
    const { isOnline, isSyncing, pendingCount, forceSync } = useOffline();
    const [showDetails, setShowDetails] = useState(false);
    const [wasOffline, setWasOffline] = useState(false);

    // Détecter le retour en ligne
    useEffect(() => {
        if (!isOnline) {
            setWasOffline(true);
        } else if (wasOffline && pendingCount > 0) {
            // Auto-sync après retour en ligne
            forceSync();
        }
    }, [isOnline, wasOffline, pendingCount, forceSync]);

    if (isOnline && pendingCount === 0) return null;

    return (
        <div 
            style={{
                position: 'fixed',
                bottom: 'var(--space-lg)',
                left: 'var(--space-lg)',
                zIndex: 9998,
            }}
        >
            <div 
                className="card"
                style={{
                    background: isOnline ? 'rgba(166, 227, 161, 0.95)' : 'rgba(243, 139, 168, 0.95)',
                    border: `2px solid ${isOnline ? 'var(--color-success)' : 'var(--color-error)'}`,
                    color: '#1e1e2e',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-md)',
                    cursor: pendingCount > 0 ? 'pointer' : 'default',
                    backdropFilter: 'blur(10px)',
                }}
                onClick={() => pendingCount > 0 && setShowDetails(!showDetails)}
            >
                {isOnline ? (
                    <Wifi size={20} />
                ) : (
                    <WifiOff size={20} />
                )}
                
                <div>
                    <span style={{ fontWeight: 500 }}>
                        {isOnline ? 'En ligne' : 'Hors ligne'}
                    </span>
                    {pendingCount > 0 && (
                        <span style={{ fontSize: '0.875rem', marginLeft: 'var(--space-sm)' }}>
                            ({pendingCount} action{pendingCount > 1 ? 's' : ''} en attente)
                        </span>
                    )}
                </div>

                {isSyncing && (
                    <RefreshCw size={16} className="spin-animation" />
                )}

                {!isOnline && (
                    <AlertCircle size={16} />
                )}
            </div>

            {/* Détails des actions en attente */}
            {showDetails && pendingCount > 0 && (
                <div 
                    className="card"
                    style={{
                        marginTop: 'var(--space-sm)',
                        maxWidth: '300px',
                        maxHeight: '200px',
                        overflow: 'auto',
                    }}
                >
                    <p className="text-sm text-muted" style={{ marginBottom: 'var(--space-sm)' }}>
                        Actions en attente de synchronisation :
                    </p>
                    {/* Liste des actions - à implémenter selon les besoins */}
                    <button 
                        className="btn btn-secondary btn-sm"
                        onClick={(e) => {
                            e.stopPropagation();
                            forceSync();
                        }}
                        disabled={isSyncing || !isOnline}
                        style={{ width: '100%', marginTop: 'var(--space-sm)' }}
                    >
                        {isSyncing ? (
                            <>
                                <RefreshCw size={14} style={{ marginRight: 'var(--space-xs)' }} />
                                Synchronisation...
                            </>
                        ) : (
                            <>
                                <RefreshCw size={14} style={{ marginRight: 'var(--space-xs)' }} />
                                Synchroniser maintenant
                            </>
                        )}
                    </button>
                </div>
            )}
        </div>
    );
}
