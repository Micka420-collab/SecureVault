import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { calculatePasswordStrength } from '../crypto/clientCrypto';
import toast from 'react-hot-toast';

export default function Register() {
    const navigate = useNavigate();
    const { register } = useAuthStore();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [realEmail, setRealEmail] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState(1);

    const passwordStrength = calculatePasswordStrength(password);
    const passwordsMatch = password === confirmPassword;
    const isValidPassword = password.length >= 12; // Simplified for testing

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (step === 1) {
            if (!email || !password || !confirmPassword) {
                toast.error('Veuillez remplir tous les champs');
                return;
            }
            if (!passwordsMatch) {
                toast.error('Les mots de passe ne correspondent pas');
                return;
            }
            if (!isValidPassword) {
                toast.error('Le mot de passe doit être plus fort (min. 12 caractères)');
                return;
            }
            setStep(2);
            return;
        }

        setLoading(true);
        try {
            await register(email, password, realEmail || email);
            toast.success('Compte créé avec succès');
            navigate('/login');
        } catch (error) {
            toast.error(error.message || 'Échec de la création du compte');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center" style={{ minHeight: '100vh' }}>
            <div className="card card-glass" style={{ width: '100%', maxWidth: 420, margin: 'var(--space-lg)' }}>
                {/* Logo */}
                <div className="text-center mb-md">
                    <img 
                        src="/logo-securevault.png" 
                        alt="SecureVault Logo" 
                        style={{
                            width: 80,
                            height: 80,
                            borderRadius: 'var(--radius-xl)',
                            margin: '0 auto var(--space-lg)',
                            display: 'block'
                        }}
                    />
                    // Register Page - SecureVault by Nextendo x Micka Delcato
            <h1 className="text-gradient" style={{ fontSize: '1.75rem' }}>Créer un compte</h1>
                    <p className="text-muted mt-md">
                        {step === 1 ? 'Étape 1: Identifiants' : 'Étape 2: Configuration'}
                    </p>
                </div>

                <form onSubmit={handleSubmit}>
                    {step === 1 ? (
                        <>
                            <div className="input-group mb-md">
                                <label className="input-label">Adresse e-mail</label>
                                <div className="input-with-icon">
                                    <Mail className="input-icon" size={18} />
                                    <input
                                        type="email"
                                        className="input"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="vous@exemple.com"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="input-group mb-md">
                                <label className="input-label">Mot de passe maître</label>
                                <div className="input-with-icon">
                                    <Lock className="input-icon" size={18} />
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        className="input"
                                        style={{ paddingRight: '2.5rem' }}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="Minimum 12 caractères"
                                        required
                                    />
                                    <button
                                        type="button"
                                        className="input-password-toggle"
                                        onClick={() => setShowPassword(!showPassword)}
                                    >
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                                <div className="strength-bar">
                                    <div
                                        className="strength-fill"
                                        style={{
                                            width: `${passwordStrength.score}%`,
                                            backgroundColor: passwordStrength.color,
                                        }}
                                    />
                                </div>
                                <span className="strength-label" style={{ color: passwordStrength.color }}>
                                    {passwordStrength.label}
                                </span>
                            </div>

                            <div className="input-group mb-md">
                                <label className="input-label">Confirmer le mot de passe</label>
                                <div className="input-with-icon">
                                    <Lock className="input-icon" size={18} />
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        className="input"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        placeholder="Répétez le mot de passe"
                                        required
                                    />
                                </div>
                                {confirmPassword && (
                                    <span
                                        className="text-sm mt-md"
                                        style={{ color: passwordsMatch ? 'var(--color-success)' : 'var(--color-error)' }}
                                    >
                                        {passwordsMatch ? '✓ Les mots de passe correspondent' : '✗ Les mots de passe ne correspondent pas'}
                                    </span>
                                )}
                            </div>
                        </>
                    ) : (
                        <>
                            <div
                                className="card"
                                style={{
                                    background: 'rgba(166, 227, 161, 0.1)',
                                    border: '1px solid var(--color-success)',
                                    marginBottom: 'var(--space-lg)',
                                }}
                            >
                                <div className="flex items-center gap-md">
                                    <CheckCircle size={24} color="var(--color-success)" />
                                    <div>
                                        <div style={{ fontWeight: 500 }}>Identifiants configurés</div>
                                        <div className="text-sm text-muted">{email}</div>
                                    </div>
                                </div>
                            </div>

                            <div className="input-group mb-md">
                                <label className="input-label">
                                    Adresse e-mail de transfert (optionnel)
                                </label>
                                <div className="input-with-icon">
                                    <Mail className="input-icon" size={18} />
                                    <input
                                        type="email"
                                        className="input"
                                        value={realEmail}
                                        onChange={(e) => setRealEmail(e.target.value)}
                                        placeholder="Pour recevoir les alias (défaut: e-mail principal)"
                                    />
                                </div>
                                <p className="text-sm text-muted mt-md">
                                    Les e-mails envoyés à vos alias seront transférés à cette adresse.
                                </p>
                            </div>

                            <div
                                className="card"
                                style={{
                                    background: 'rgba(249, 226, 175, 0.1)',
                                    border: '1px solid var(--color-warning)',
                                }}
                            >
                                <p className="text-sm" style={{ color: 'var(--color-warning)' }}>
                                    ⚠️ <strong>Important:</strong> Votre mot de passe maître ne peut pas être récupéré.
                                    Mémorisez-le ou stockez-le dans un endroit sûr.
                                </p>
                            </div>
                        </>
                    )}

                    <button
                        type="submit"
                        className="btn btn-primary btn-lg"
                        style={{ width: '100%', marginTop: 'var(--space-lg)' }}
                        disabled={loading || (step === 1 && (!isValidPassword || !passwordsMatch))}
                    >
                        {loading ? (
                            <span className="spinner spinner-sm" />
                        ) : step === 1 ? (
                            'Continuer'
                        ) : (
                            'Créer mon compte'
                        )}
                    </button>

                    {step === 2 && (
                        <button
                            type="button"
                            className="btn btn-ghost"
                            style={{ width: '100%', marginTop: 'var(--space-sm)' }}
                            onClick={() => setStep(1)}
                        >
                            Retour
                        </button>
                    )}
                </form>

                <p className="text-center text-muted mt-lg">
                    Déjà inscrit ?{' '}
                    <Link to="/login" style={{ color: 'var(--color-primary)' }}>
                        Se connecter
                    </Link>
                </p>
            </div>
        </div>
    );
}
