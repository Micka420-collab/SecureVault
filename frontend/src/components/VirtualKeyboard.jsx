import { useState, useCallback } from 'react';
import { Keyboard, X, Shuffle, Delete } from 'lucide-react';

/**
 * VirtualKeyboard - Clavier virtuel pour saisie sécurisée
 * 
 * Features:
 * - Clavier aléatoire (shuffle) pour éviter les keyloggers
 * - Support chiffres et symboles
 * - Pas de feedback visuel sur les touches (protection shoulder surfing)
 */
export default function VirtualKeyboard({ 
    onInput, 
    onClose, 
    maxLength = 64,
    allowShuffle = true,
    maskInput = true 
}) {
    const [input, setInput] = useState('');
    const [useShuffle, setUseShuffle] = useState(false);

    // Générer les touches dans un ordre aléatoire si demandé
    const generateKeys = useCallback(() => {
        let keys = 'abcdefghijklmnopqrstuvwxyz0123456789'.split('');
        
        if (useShuffle) {
            // Fisher-Yates shuffle
            for (let i = keys.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [keys[i], keys[j]] = [keys[j], keys[i]];
            }
        }
        
        return keys;
    }, [useShuffle]);

    const [keys, setKeys] = useState(generateKeys());

    const handleKeyPress = (char) => {
        if (input.length < maxLength) {
            const newInput = input + char;
            setInput(newInput);
            onInput?.(newInput);
        }
    };

    const handleBackspace = () => {
        if (input.length > 0) {
            const newInput = input.slice(0, -1);
            setInput(newInput);
            onInput?.(newInput);
        }
    };

    const handleClear = () => {
        setInput('');
        onInput?.('');
    };

    const toggleShuffle = () => {
        const newShuffle = !useShuffle;
        setUseShuffle(newShuffle);
        if (newShuffle) {
            setKeys(generateKeys());
        } else {
            setKeys('abcdefghijklmnopqrstuvwxyz0123456789'.split(''));
        }
    };

    const handleSubmit = () => {
        onClose?.(input);
    };

    const renderKey = (char, index) => (
        <button
            key={`${char}-${index}`}
            className="btn btn-secondary"
            onClick={() => handleKeyPress(char)}
            style={{
                minWidth: '40px',
                height: '48px',
                fontSize: '1.125rem',
                fontWeight: 500,
                textTransform: 'uppercase',
            }}
        >
            {char}
        </button>
    );

    return (
        <div className="modal-overlay" onClick={() => onClose?.(null)}>
            <div 
                className="modal" 
                onClick={(e) => e.stopPropagation()}
                style={{ maxWidth: '500px' }}
            >
                <div className="modal-header">
                    <h3 className="modal-title">
                        <Keyboard size={20} style={{ marginRight: 'var(--space-sm)', verticalAlign: 'middle' }} />
                        Clavier sécurisé
                    </h3>
                    <button className="modal-close" onClick={() => onClose?.(null)}>
                        <X size={20} />
                    </button>
                </div>

                <div className="modal-body">
                    {/* Zone d'affichage */}
                    <div 
                        className="input-group"
                        style={{ marginBottom: 'var(--space-lg)' }}
                    >
                        <label className="input-label">Saisie</label>
                        <div style={{ position: 'relative' }}>
                            <input
                                type={maskInput ? 'password' : 'text'}
                                className="input"
                                value={input}
                                readOnly
                                placeholder="Cliquez sur les touches..."
                                style={{ 
                                    fontSize: '1.25rem',
                                    letterSpacing: '0.2em',
                                    textAlign: 'center',
                                }}
                            />
                            <span 
                                className="text-muted text-sm"
                                style={{ 
                                    position: 'absolute', 
                                    right: 'var(--space-md)', 
                                    top: '50%', 
                                    transform: 'translateY(-50%)' 
                                }}
                            >
                                {input.length}/{maxLength}
                            </span>
                        </div>
                    </div>

                    {/* Contrôles */}
                    <div style={{ 
                        display: 'flex', 
                        gap: 'var(--space-sm)', 
                        marginBottom: 'var(--space-md)',
                        justifyContent: 'center'
                    }}>
                        {allowShuffle && (
                            <button
                                className={`btn btn-sm ${useShuffle ? 'btn-primary' : 'btn-ghost'}`}
                                onClick={toggleShuffle}
                            >
                                <Shuffle size={14} />
                                Aléatoire
                            </button>
                        )}
                        <button
                            className="btn btn-sm btn-ghost"
                            onClick={handleClear}
                        >
                            Effacer
                        </button>
                        <button
                            className="btn btn-sm btn-ghost"
                            onClick={handleBackspace}
                        >
                            <Delete size={14} />
                            Retour
                        </button>
                    </div>

                    {/* Clavier */}
                    <div 
                        style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(6, 1fr)',
                            gap: 'var(--space-sm)',
                            padding: 'var(--space-md)',
                            background: 'var(--color-surface0)',
                            borderRadius: 'var(--radius-md)',
                        }}
                    >
                        {keys.map((char, index) => renderKey(char, index))}
                    </div>

                    {/* Instructions */}
                    <p className="text-muted text-sm text-center" style={{ marginTop: 'var(--space-md)' }}>
                        {useShuffle 
                            ? 'Les touches sont mélangées pour plus de sécurité'
                            : 'Ce clavier protège contre les enregistreurs de frappes'
                        }
                    </p>
                </div>

                <div className="modal-footer">
                    <button className="btn btn-ghost" onClick={() => onClose?.(null)}>
                        Annuler
                    </button>
                    <button 
                        className="btn btn-primary"
                        onClick={handleSubmit}
                        disabled={input.length === 0}
                    >
                        Valider
                    </button>
                </div>
            </div>
        </div>
    );
}
