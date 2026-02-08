/**
 * Settings Page - SecureVault by Nextendo x Micka Delcato
 */

import { useState } from 'react';
import { Shield, Key, Mail, LogOut, Trash2, QrCode } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { createAuthenticatedApi } from '../services/api';
import toast from 'react-hot-toast';

export default function Settings() {
    const navigate = useNavigate();
    const { user, accessToken, logout } = useAuthStore();
    const api = createAuthenticatedApi(accessToken);

    const [show2FASetup, setShow2FASetup] = useState(false);
    const [qrCode, setQrCode] = useState('');
    const [secret, setSecret] = useState('');
    const [verificationCode, setVerificationCode] = useState('');
    const [loading, setLoading] = useState(false);

    const handle2FASetup = async () => {
        setLoading(true);
        try {
            const response = await api.post('/auth/2fa/setup', {});
            setQrCode(response.data.qrCode);
            setSecret(response.data.secret);
            setShow2FASetup(true);
        } catch (error) {
            toast.error('Erreur lors de la configuration 2FA');
        } finally {
            setLoading(false);
        }
    };

    const handle2FAVerify = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.post('/auth/2fa/verify', { code: verificationCode, isSetup: true });
            toast.success('2FA activée avec succès');
            setShow2FASetup(false);
            // Refresh user data
            window.location.reload();
        } catch (error) {
            toast.error('Code invalide');
        } finally {
            setLoading(false);
        }
    };

    const handle2FADisable = async () => {
        const code = prompt('Entrez votre code 2FA pour confirmer la désactivation:');
        if (!code) return;

        try {
            await api.post('/auth/2fa/disable', { code });
            toast.success('2FA désactivée');
            window.location.reload();
        } catch (error) {
            toast.error('Code invalide');
        }
    };

    const handleLogout = async () => {
        await logout();
        toast.success('Déconnexion réussie');
        navigate('/login');
    };

    const handleDeleteAccount = async () => {
        if (!confirm('Êtes-vous sûr de vouloir supprimer votre compte ? Cette action est irréversible.')) return;
        if (!confirm('Dernière confirmation: TOUTES vos données seront supprimées définitivement.')) return;

        toast.error('Fonctionnalité non implémentée pour des raisons de sécurité');
    };

    return (
        <div>
            {/* Header */}
            <div className="page-header">
                <div>
                    <h1 className="page-title">Paramètres</h1>
                    <p className="text-muted">Gérez votre compte et la sécurité</p>
                </div>
            </div>

            <div className="grid grid-2">
                {/* Account Info */}
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">Compte</h3>
                    </div>

                    <div className="flex flex-col gap-md">
                        <div>
                            <label className="text-sm text-muted">Adresse e-mail</label>
                            <p style={{ fontWeight: 500 }}>{user?.email}</p>
                        </div>
                        <div>
                            <label className="text-sm text-muted">Membre depuis</label>
                            <p style={{ fontWeight: 500 }}>
                                {new Date(user?.createdAt).toLocaleDateString('fr-FR', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric',
                                })}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Security */}
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">Sécurité</h3>
                    </div>

                    <div className="flex flex-col gap-md">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-md">
                                <Shield size={20} color="var(--color-primary)" />
                                <div>
                                    <div style={{ fontWeight: 500 }}>Double authentification</div>
                                    <div className="text-sm text-muted">
                                        Protection supplémentaire pour votre compte
                                    </div>
                                </div>
                            </div>
                            <span className={`badge ${user?.totpEnabled ? 'badge-success' : 'badge-warning'}`}>
                                {user?.totpEnabled ? 'Activée' : 'Désactivée'}
                            </span>
                        </div>

                        {user?.totpEnabled ? (
                            <button
                                className="btn btn-secondary"
                                onClick={handle2FADisable}
                            >
                                Désactiver la 2FA
                            </button>
                        ) : (
                            <button
                                className="btn btn-primary"
                                onClick={handle2FASetup}
                                disabled={loading}
                            >
                                {loading ? <span className="spinner spinner-sm" /> : <QrCode size={18} />}
                                Activer la 2FA
                            </button>
                        )}
                    </div>
                </div>

                {/* Encryption Info */}
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">Chiffrement</h3>
                    </div>

                    <div className="flex flex-col gap-sm">
                        <div className="flex items-center justify-between">
                            <span>Algorithme</span>
                            <span className="badge badge-success">AES-256-GCM</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span>Dérivation de clé</span>
                            <span className="badge badge-success">PBKDF2</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span>Itérations</span>
                            <span className="badge badge-info">600,000</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span>Chiffrement</span>
                            <span className="badge badge-success">Bout en bout</span>
                        </div>
                    </div>

                    <div
                        className="mt-lg"
                        style={{
                            padding: 'var(--space-md)',
                            background: 'rgba(166, 227, 161, 0.1)',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid var(--color-success)',
                        }}
                    >
                        <p className="text-sm" style={{ color: 'var(--color-success)' }}>
                            🔒 Vos données sont chiffrées localement avant d'être envoyées au serveur.
                            Même nous ne pouvons pas lire vos mots de passe.
                        </p>
                    </div>
                </div>

                {/* Danger Zone */}
                <div className="card" style={{ borderColor: 'var(--color-error)' }}>
                    <div className="card-header">
                        <h3 className="card-title" style={{ color: 'var(--color-error)' }}>
                            Zone de danger
                        </h3>
                    </div>

                    <div className="flex flex-col gap-md">
                        <button
                            className="btn btn-secondary"
                            onClick={handleLogout}
                        >
                            <LogOut size={18} />
                            Se déconnecter
                        </button>

                        <button
                            className="btn btn-danger"
                            onClick={handleDeleteAccount}
                        >
                            <Trash2 size={18} />
                            Supprimer mon compte
                        </button>
                    </div>
                </div>
            </div>

            {/* 2FA Setup Modal */}
            {show2FASetup && (
                <div className="modal-overlay" onClick={() => setShow2FASetup(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">Configurer la 2FA</h3>
                            <button
                                className="modal-close"
                                onClick={() => setShow2FASetup(false)}
                            >
                                ×
                            </button>
                        </div>

                        <div className="modal-body">
                            <p className="text-center mb-md">
                                Scannez ce QR code avec votre application d'authentification
                                (Google Authenticator, Authy, etc.)
                            </p>

                            {qrCode && (
                                <div className="text-center mb-md">
                                    <img
                                        src={qrCode}
                                        alt="QR Code 2FA"
                                        style={{
                                            width: 200,
                                            height: 200,
                                            margin: '0 auto',
                                            background: 'white',
                                            padding: 'var(--space-sm)',
                                            borderRadius: 'var(--radius-md)',
                                        }}
                                    />
                                </div>
                            )}

                            <div
                                className="card"
                                style={{
                                    background: 'var(--color-surface0)',
                                    marginBottom: 'var(--space-md)',
                                }}
                            >
                                <p className="text-sm text-muted mb-sm">
                                    Ou entrez ce code manuellement:
                                </p>
                                <code
                                    className="font-mono"
                                    style={{
                                        fontSize: '0.875rem',
                                        wordBreak: 'break-all',
                                        color: 'var(--color-primary)',
                                    }}
                                >
                                    {secret}
                                </code>
                            </div>

                            <form onSubmit={handle2FAVerify}>
                                <div className="input-group mb-md">
                                    <label className="input-label">Code de vérification</label>
                                    <input
                                        type="text"
                                        className="input text-center font-mono"
                                        style={{ fontSize: '1.5rem', letterSpacing: '0.5em' }}
                                        value={verificationCode}
                                        onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                        placeholder="000000"
                                        maxLength={6}
                                        required
                                    />
                                </div>

                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    style={{ width: '100%' }}
                                    disabled={loading || verificationCode.length !== 6}
                                >
                                    {loading ? <span className="spinner spinner-sm" /> : 'Activer la 2FA'}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
