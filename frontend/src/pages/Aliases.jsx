/**
 * Aliases Page - SecureVault by Nextendo x Micka Delcato
 */

import { useState, useEffect } from 'react';
import { Plus, Mail, Power, Trash2, Copy, Search, X } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { createAuthenticatedApi } from '../services/api';
import toast from 'react-hot-toast';

export default function Aliases() {
    const { accessToken } = useAuthStore();
    const [aliases, setAliases] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const [formData, setFormData] = useState({
        label: '',
        description: '',
        prefix: '',
    });

    const api = createAuthenticatedApi(accessToken);

    useEffect(() => {
        fetchAliases();
    }, [accessToken]);

    const fetchAliases = async () => {
        try {
            const response = await api.get('/aliases');
            setAliases(response.data.aliases || []);
        } catch (error) {
            toast.error('Erreur lors du chargement des alias');
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e) => {
        e.preventDefault();

        try {
            await api.post('/aliases', formData);
            toast.success('Alias créé');
            setShowModal(false);
            setFormData({ label: '', description: '', prefix: '' });
            fetchAliases();
        } catch (error) {
            toast.error(error.response?.data?.error || 'Erreur lors de la création');
        }
    };

    const handleToggle = async (id) => {
        try {
            const response = await api.patch(`/aliases/${id}/toggle`);
            toast.success(response.data.message);
            fetchAliases();
        } catch (error) {
            toast.error('Erreur');
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Supprimer cet alias ? Les e-mails associés seront également supprimés.')) return;

        try {
            await api.delete(`/aliases/${id}`);
            toast.success('Alias supprimé');
            fetchAliases();
        } catch (error) {
            toast.error('Erreur lors de la suppression');
        }
    };

    const copyToClipboard = async (text) => {
        try {
            await navigator.clipboard.writeText(text);
            toast.success('Alias copié');
        } catch (error) {
            toast.error('Erreur de copie');
        }
    };

    const filteredAliases = aliases.filter(alias =>
        !searchQuery ||
        alias.label?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        alias.aliasAddress?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const activeCount = aliases.filter(a => a.isActive).length;

    return (
        <div>
            {/* Header */}
            <div className="page-header">
                <div>
                    <h1 className="page-title">Alias E-mail</h1>
                    <p className="text-muted">
                        {activeCount} alias actifs sur {aliases.length}
                    </p>
                </div>
                <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                    <Plus size={18} />
                    Nouvel alias
                </button>
            </div>

            {/* Search */}
            <div className="input-with-icon" style={{ marginBottom: 'var(--space-lg)' }}>
                <Search className="input-icon" size={18} />
                <input
                    type="text"
                    className="input"
                    placeholder="Rechercher un alias..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>

            {/* Aliases List */}
            {loading ? (
                <div className="flex items-center justify-center" style={{ padding: 'var(--space-2xl)' }}>
                    <span className="spinner" />
                </div>
            ) : filteredAliases.length > 0 ? (
                <div className="entry-list">
                    {filteredAliases.map((alias) => (
                        <div key={alias.id} className="entry-item">
                            <div
                                className="entry-favicon"
                                style={{
                                    background: alias.isActive
                                        ? 'rgba(166, 227, 161, 0.15)'
                                        : 'rgba(108, 112, 134, 0.15)',
                                }}
                            >
                                <Mail
                                    size={20}
                                    color={alias.isActive ? 'var(--color-success)' : 'var(--color-overlay0)'}
                                />
                            </div>

                            <div className="entry-info" style={{ flex: 1 }}>
                                <div className="entry-title">{alias.label}</div>
                                <div className="entry-username font-mono" style={{ fontSize: '0.813rem' }}>
                                    {alias.aliasAddress}
                                </div>
                            </div>

                            <div className="flex items-center gap-md">
                                <span className={`badge ${alias.isActive ? 'badge-success' : ''}`}>
                                    {alias.isActive ? 'Actif' : 'Désactivé'}
                                </span>
                                <span className="badge badge-info">
                                    {alias.emailCount || 0} e-mails
                                </span>
                            </div>

                            <div className="entry-actions">
                                <button
                                    className="btn btn-icon btn-ghost"
                                    onClick={() => copyToClipboard(alias.aliasAddress)}
                                    title="Copier l'alias"
                                >
                                    <Copy size={16} />
                                </button>
                                <button
                                    className="btn btn-icon btn-ghost"
                                    onClick={() => handleToggle(alias.id)}
                                    title={alias.isActive ? 'Désactiver' : 'Activer'}
                                    style={{ color: alias.isActive ? 'var(--color-success)' : 'var(--color-overlay0)' }}
                                >
                                    <Power size={16} />
                                </button>
                                <button
                                    className="btn btn-icon btn-ghost"
                                    onClick={() => handleDelete(alias.id)}
                                    title="Supprimer"
                                    style={{ color: 'var(--color-error)' }}
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center text-muted" style={{ padding: 'var(--space-2xl)' }}>
                    <Mail size={64} style={{ opacity: 0.3, marginBottom: 'var(--space-lg)' }} />
                    <h3>Aucun alias</h3>
                    <p style={{ marginBottom: 'var(--space-lg)' }}>
                        Créez des alias pour protéger votre adresse e-mail réelle
                    </p>
                    <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                        <Plus size={18} /> Créer un alias
                    </button>
                </div>
            )}

            {/* Create Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">Nouvel alias</h3>
                            <button className="modal-close" onClick={() => setShowModal(false)}>
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleCreate}>
                            <div className="modal-body">
                                <div className="input-group">
                                    <label className="input-label">Nom du service</label>
                                    <input
                                        type="text"
                                        className="input"
                                        value={formData.label}
                                        onChange={(e) => setFormData(p => ({ ...p, label: e.target.value }))}
                                        placeholder="Ex: Newsletter, Facebook, etc."
                                        required
                                    />
                                </div>

                                <div className="input-group">
                                    <label className="input-label">Préfixe (optionnel)</label>
                                    <input
                                        type="text"
                                        className="input"
                                        value={formData.prefix}
                                        onChange={(e) => setFormData(p => ({ ...p, prefix: e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '') }))}
                                        placeholder="Ex: facebook"
                                    />
                                    <p className="text-sm text-muted mt-md">
                                        L'alias sera: <code className="font-mono">{formData.prefix || 'xxx'}-abc123@domaine.com</code>
                                    </p>
                                </div>

                                <div className="input-group">
                                    <label className="input-label">Description (optionnel)</label>
                                    <textarea
                                        className="input"
                                        value={formData.description}
                                        onChange={(e) => setFormData(p => ({ ...p, description: e.target.value }))}
                                        placeholder="Notes personnelles..."
                                        rows={2}
                                    />
                                </div>

                                <div
                                    className="card"
                                    style={{
                                        background: 'rgba(137, 220, 235, 0.1)',
                                        border: '1px solid var(--color-info)',
                                    }}
                                >
                                    <p className="text-sm" style={{ color: 'var(--color-info)' }}>
                                        📧 Les e-mails envoyés à cet alias seront transférés à votre adresse réelle.
                                        Vous pouvez désactiver l'alias à tout moment.
                                    </p>
                                </div>
                            </div>

                            <div className="modal-footer">
                                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>
                                    Annuler
                                </button>
                                <button type="submit" className="btn btn-primary">
                                    Créer l'alias
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
