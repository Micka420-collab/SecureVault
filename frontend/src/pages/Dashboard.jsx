import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Key, Mail, Inbox, Shield, Plus, ArrowRight } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { createAuthenticatedApi } from '../services/api';

export default function Dashboard() {
    const { accessToken, user } = useAuthStore();
    const [stats, setStats] = useState({
        vaultEntries: 0,
        aliases: 0,
        activeAliases: 0,
        unreadEmails: 0,
    });
    const [recentEntries, setRecentEntries] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDashboardData = async () => {
            if (!accessToken) return;

            const api = createAuthenticatedApi(accessToken);

            try {
                const [vaultRes, aliasRes, emailRes] = await Promise.all([
                    api.get('/vault'),
                    api.get('/aliases/stats/summary'),
                    api.get('/emails/stats/unread'),
                ]);

                setStats({
                    vaultEntries: vaultRes.data.entries?.length || 0,
                    aliases: aliasRes.data.totalAliases || 0,
                    activeAliases: aliasRes.data.activeAliases || 0,
                    unreadEmails: emailRes.data.unreadCount || 0,
                });

                setRecentEntries(vaultRes.data.entries?.slice(0, 5) || []);
            } catch (error) {
                console.error('Failed to fetch dashboard data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, [accessToken]);

    const statCards = [
        {
            icon: Key,
            label: 'Entrées du coffre',
            value: stats.vaultEntries,
            color: 'primary',
            link: '/vault',
        },
        {
            icon: Mail,
            label: 'Alias e-mail',
            value: `${stats.activeAliases}/${stats.aliases}`,
            sublabel: 'actifs',
            color: 'secondary',
            link: '/aliases',
        },
        {
            icon: Inbox,
            label: 'Messages non lus',
            value: stats.unreadEmails,
            color: 'warning',
            link: '/emails',
        },
        {
            icon: Shield,
            label: 'Sécurité',
            value: user?.totpEnabled ? 'Activée' : 'Standard',
            sublabel: user?.totpEnabled ? '2FA active' : 'Sans 2FA',
            color: user?.totpEnabled ? 'success' : 'warning',
            link: '/settings',
        },
    ];

    return (
        <div>
            {/* Header */}
            <div className="page-header">
                <div>
                    <h1 className="page-title">Tableau de bord</h1>
                    <p className="text-muted">Bienvenue dans votre coffre-fort sécurisé</p>
                </div>
                <div className="flex gap-sm">
                    <Link to="/vault" className="btn btn-secondary">
                        <Plus size={18} />
                        Nouvelle entrée
                    </Link>
                    <Link to="/aliases" className="btn btn-primary">
                        <Mail size={18} />
                        Nouvel alias
                    </Link>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-4" style={{ marginBottom: 'var(--space-2xl)' }}>
                {statCards.map(({ icon: Icon, label, value, sublabel, color, link }) => (
                    <Link key={label} to={link} className="stat-card" style={{ textDecoration: 'none' }}>
                        <div className={`stat-icon stat-icon-${color}`}>
                            <Icon size={24} />
                        </div>
                        <div>
                            <div className="stat-value">{loading ? '...' : value}</div>
                            <div className="stat-label">{sublabel || label}</div>
                        </div>
                    </Link>
                ))}
            </div>

            {/* Quick Actions */}
            <div className="grid grid-2">
                {/* Recent Vault Entries */}
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">Entrées récentes</h3>
                        <Link to="/vault" className="btn btn-ghost btn-sm">
                            Voir tout <ArrowRight size={16} />
                        </Link>
                    </div>

                    {loading ? (
                        <div className="flex items-center justify-center" style={{ padding: 'var(--space-xl)' }}>
                            <span className="spinner" />
                        </div>
                    ) : recentEntries.length > 0 ? (
                        <div className="entry-list">
                            {recentEntries.map((entry) => (
                                <div key={entry.id} className="entry-item">
                                    <div className="entry-favicon">
                                        <Key size={20} />
                                    </div>
                                    <div className="entry-info">
                                        <div className="entry-title">Entrée chiffrée</div>
                                        <div className="entry-username">Cliquez pour déchiffrer</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center text-muted" style={{ padding: 'var(--space-xl)' }}>
                            <Key size={48} style={{ opacity: 0.3, marginBottom: 'var(--space-md)' }} />
                            <p>Aucune entrée dans le coffre</p>
                            <Link to="/vault" className="btn btn-primary btn-sm mt-md">
                                <Plus size={16} /> Ajouter une entrée
                            </Link>
                        </div>
                    )}
                </div>

                {/* Security Overview */}
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">Sécurité</h3>
                        <Link to="/settings" className="btn btn-ghost btn-sm">
                            Paramètres <ArrowRight size={16} />
                        </Link>
                    </div>

                    <div className="flex flex-col gap-md">
                        <div className="flex items-center justify-between">
                            <span>Chiffrement</span>
                            <span className="badge badge-success">AES-256-GCM</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span>Dérivation de clé</span>
                            <span className="badge badge-success">PBKDF2 600K</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span>Double authentification</span>
                            <span className={`badge ${user?.totpEnabled ? 'badge-success' : 'badge-warning'}`}>
                                {user?.totpEnabled ? 'Activée' : 'Désactivée'}
                            </span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span>Verrouillage auto</span>
                            <span className="badge badge-success">15 minutes</span>
                        </div>
                    </div>

                    {!user?.totpEnabled && (
                        <Link
                            to="/settings"
                            className="btn btn-secondary"
                            style={{ width: '100%', marginTop: 'var(--space-lg)' }}
                        >
                            <Shield size={18} />
                            Activer la 2FA
                        </Link>
                    )}
                </div>
            </div>
        </div>
    );
}
