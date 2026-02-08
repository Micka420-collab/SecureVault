import { useState } from 'react';
import { Lock, Eye, EyeOff } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import toast from 'react-hot-toast';

export default function LockScreen() {
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const { unlock, logout } = useAuthStore();

    const handleUnlock = async (e) => {
        e.preventDefault();
        if (!password.trim()) return;

        setLoading(true);
        try {
            await unlock(password);
            toast.success('Coffre-fort déverrouillé');
        } catch (error) {
            toast.error('Mot de passe maître incorrect');
        } finally {
            setLoading(false);
            setPassword('');
        }
    };

    const handleLogout = () => {
        logout();
        toast.success('Déconnexion réussie');
    };

    return (
        <div className="lock-screen">
            <div className="lock-icon">
                <Lock size={40} />
            </div>

            <h2 style={{ marginBottom: 'var(--space-sm)' }}>Coffre-fort verrouillé</h2>
            <p className="text-muted text-center" style={{ marginBottom: 'var(--space-xl)' }}>
                Session expirée par inactivité
            </p>

            <form className="lock-form" onSubmit={handleUnlock}>
                <div className="input-group">
                    <label className="input-label">Mot de passe maître</label>
                    <div className="input-with-icon">
                        <Lock className="input-icon" size={18} />
                        <input
                            type={showPassword ? 'text' : 'password'}
                            className="input"
                            style={{ paddingRight: '2.5rem' }}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Entrez votre mot de passe maître"
                            autoFocus
                            disabled={loading}
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
                    style={{ width: '100%', marginTop: 'var(--space-lg)' }}
                    disabled={loading || !password.trim()}
                >
                    {loading ? <span className="spinner spinner-sm" /> : 'Déverrouiller'}
                </button>

                <button
                    type="button"
                    className="btn btn-ghost"
                    style={{ width: '100%', marginTop: 'var(--space-md)' }}
                    onClick={handleLogout}
                >
                    Se déconnecter
                </button>
            </form>
        </div>
    );
}
