import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import toast from 'react-hot-toast';

export default function Login() {
    const navigate = useNavigate();
    const { login, verify2FA } = useAuthStore();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [totpCode, setTotpCode] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [show2FA, setShow2FA] = useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();
        if (!email || !password) return;

        setLoading(true);
        try {
            const result = await login(email, password);

            if (result.requires2FA) {
                setShow2FA(true);
                toast.success('Code 2FA requis');
            } else {
                toast.success('Connexion réussie');
                navigate('/dashboard');
            }
        } catch (error) {
            toast.error(error.message || 'Échec de la connexion');
        } finally {
            setLoading(false);
        }
    };

    const handle2FAVerify = async (e) => {
        e.preventDefault();
        if (!totpCode) return;

        setLoading(true);
        try {
            await verify2FA(totpCode, password);
            toast.success('Connexion réussie');
            navigate('/dashboard');
        } catch (error) {
            toast.error('Code 2FA invalide');
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
                    <h1 className="text-gradient" style={{ fontSize: '1.75rem' }}>SecureVault <span style={{fontSize: '0.5em', opacity: 0.7}}>by Nextendo x Micka Delcato</span></h1>
                    <p className="text-muted mt-md">
                        {show2FA ? 'Vérification en deux étapes' : 'Connexion à votre coffre-fort'}
                    </p>
                </div>

                {!show2FA ? (
                    <form onSubmit={handleLogin}>
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
                                    disabled={loading}
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
                                    placeholder="••••••••••••"
                                    disabled={loading}
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
                        </div>

                        <button
                            type="submit"
                            className="btn btn-primary btn-lg"
                            style={{ width: '100%', marginTop: 'var(--space-md)' }}
                            disabled={loading}
                        >
                            {loading ? <span className="spinner spinner-sm" /> : 'Se connecter'}
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handle2FAVerify}>
                        <div className="input-group mb-md">
                            <label className="input-label">Code d'authentification</label>
                            <input
                                type="text"
                                className="input text-center font-mono"
                                style={{ fontSize: '1.5rem', letterSpacing: '0.5em' }}
                                value={totpCode}
                                onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                placeholder="000000"
                                maxLength={6}
                                disabled={loading}
                                autoFocus
                                required
                            />
                            <p className="text-muted text-sm mt-md text-center">
                                Entrez le code de votre application d'authentification
                            </p>
                        </div>

                        <button
                            type="submit"
                            className="btn btn-primary btn-lg"
                            style={{ width: '100%', marginTop: 'var(--space-md)' }}
                            disabled={loading || totpCode.length !== 6}
                        >
                            {loading ? <span className="spinner spinner-sm" /> : 'Vérifier'}
                        </button>

                        <button
                            type="button"
                            className="btn btn-ghost"
                            style={{ width: '100%', marginTop: 'var(--space-sm)' }}
                            onClick={() => {
                                setShow2FA(false);
                                setTotpCode('');
                            }}
                        >
                            Retour
                        </button>
                    </form>
                )}

                <p className="text-center text-muted mt-lg">
                    Pas encore de compte ?{' '}
                    <Link to="/register" style={{ color: 'var(--color-primary)' }}>
                        Créer un compte
                    </Link>
                </p>
            </div>
        </div>
    );
}
