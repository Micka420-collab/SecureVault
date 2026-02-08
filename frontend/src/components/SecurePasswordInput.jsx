import { useState, useEffect } from 'react';
import { Eye, EyeOff, Keyboard, Shield, AlertTriangle, CheckCircle } from 'lucide-react';
import { usePasswordCheck, usePasswordStrength } from '../hooks/usePasswordCheck';
import VirtualKeyboard from './VirtualKeyboard';

/**
 * SecurePasswordInput - Input de mot de passe avec fonctionnalités de sécurité avancées
 * 
 * Features:
 * - Vérification de compromission (Have I Been Pwned)
 * - Analyse de force locale
 * - Clavier virtuel optionnel
 * - Masquage intelligent
 * - Indicateurs visuels
 */
export default function SecurePasswordInput({
    value,
    onChange,
    placeholder = 'Mot de passe',
    showStrength = true,
    showBreachCheck = true,
    allowVirtualKeyboard = true,
    maxLength = 128,
    required = false,
    ...props
}) {
    const [showPassword, setShowPassword] = useState(false);
    const [showVirtualKeyboard, setShowVirtualKeyboard] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    
    const { 
        checkPassword, 
        isChecking, 
        isCompromised, 
        breachCount,
        error: checkError 
    } = usePasswordCheck();
    
    const { 
        strength, 
        analyzePassword 
    } = usePasswordStrength();

    // Analyser le mot de passe à chaque changement
    useEffect(() => {
        analyzePassword(value);
        
        // Vérifier la compromission si le mot de passe est assez long
        if (showBreachCheck && value && value.length >= 8) {
            const timeout = setTimeout(() => {
                checkPassword(value);
            }, 500); // Debounce
            
            return () => clearTimeout(timeout);
        }
    }, [value, showBreachCheck, analyzePassword, checkPassword]);

    const handleVirtualKeyboardInput = (input) => {
        if (input !== null) {
            onChange({ target: { value: input } });
        }
        setShowVirtualKeyboard(false);
    };

    return (
        <div className="secure-password-input">
            {/* Input principal */}
            <div className="input-with-icon">
                <input
                    type={showPassword ? 'text' : 'password'}
                    className="input"
                    value={value}
                    onChange={onChange}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    placeholder={placeholder}
                    maxLength={maxLength}
                    required={required}
                    style={{ paddingRight: '5rem' }}
                    {...props}
                />
                
                {/* Boutons d'action */}
                <div style={{
                    position: 'absolute',
                    right: 'var(--space-sm)',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    display: 'flex',
                    gap: 'var(--space-xs)',
                }}>
                    {allowVirtualKeyboard && (
                        <button
                            type="button"
                            className="btn btn-icon btn-ghost"
                            onClick={() => setShowVirtualKeyboard(true)}
                            title="Utiliser le clavier virtuel"
                        >
                            <Keyboard size={16} />
                        </button>
                    )}
                    <button
                        type="button"
                        className="btn btn-icon btn-ghost"
                        onClick={() => setShowPassword(!showPassword)}
                        title={showPassword ? 'Masquer' : 'Afficher'}
                    >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                </div>
            </div>

            {/* Indicateur de force */}
            {showStrength && value && (
                <div style={{ marginTop: 'var(--space-sm)' }}>
                    <div 
                        className="strength-bar"
                        style={{
                            height: '6px',
                            background: 'var(--color-surface0)',
                            borderRadius: 'var(--radius-full)',
                            overflow: 'hidden',
                        }}
                    >
                        <div
                            style={{
                                height: '100%',
                                width: `${strength.score}%`,
                                backgroundColor: strength.color,
                                transition: 'all 0.3s ease',
                            }}
                        />
                    </div>
                    <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginTop: 'var(--space-xs)',
                    }}>
                        <span 
                            className="text-sm"
                            style={{ color: strength.color, fontWeight: 500 }}
                        >
                            {strength.label}
                        </span>
                        <span className="text-sm text-muted">
                            {value.length} caractères
                        </span>
                    </div>
                    
                    {/* Feedback détaillé */}
                    {isFocused && strength.feedback.length > 0 && (
                        <ul style={{ 
                            marginTop: 'var(--space-sm)',
                            paddingLeft: 'var(--space-lg)',
                            fontSize: '0.875rem',
                            color: 'var(--color-subtext0)',
                        }}>
                            {strength.feedback.map((item, index) => (
                                <li key={index}>{item}</li>
                            ))}
                        </ul>
                    )}
                </div>
            )}

            {/* Alerte de compromission */}
            {showBreachCheck && isCompromised && (
                <div 
                    className="card"
                    style={{
                        marginTop: 'var(--space-md)',
                        background: 'rgba(243, 139, 168, 0.15)',
                        border: '1px solid var(--color-error)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-sm)',
                        padding: 'var(--space-sm) var(--space-md)',
                    }}
                >
                    <AlertTriangle size={20} color="var(--color-error)" />
                    <div>
                        <p className="text-sm" style={{ color: 'var(--color-error)', fontWeight: 500 }}>
                            Ce mot de passe a été compromis !
                        </p>
                        <p className="text-sm text-muted">
                            Trouvé dans {breachCount.toLocaleString()} fuites de données.
                            Ne l utilisez pas.
                        </p>
                    </div>
                </div>
            )}

            {/* Indication de sécurité */}
            {showBreachCheck && !isCompromised && value && value.length >= 8 && !isChecking && (
                <div 
                    style={{
                        marginTop: 'var(--space-sm)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-xs)',
                    }}
                >
                    <CheckCircle size={14} color="var(--color-success)" />
                    <span className="text-sm" style={{ color: 'var(--color-success)' }}>
                        Pas trouvé dans les fuites de données connues
                    </span>
                </div>
            )}

            {/* Indicateur de vérification */}
            {isChecking && (
                <div 
                    style={{
                        marginTop: 'var(--space-sm)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-xs)',
                    }}
                >
                    <span className="spinner spinner-sm" />
                    <span className="text-sm text-muted">
                        Vérification de la sécurité...
                    </span>
                </div>
            )}

            {/* Clavier virtuel */}
            {showVirtualKeyboard && (
                <VirtualKeyboard
                    onInput={handleVirtualKeyboardInput}
                    onClose={handleVirtualKeyboardInput}
                    maxLength={maxLength}
                />
            )}
        </div>
    );
}
