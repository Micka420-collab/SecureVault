/**
 * Vault Page - SecureVault by Nextendo x Micka Delcato
 */

import { useState, useEffect } from 'react';
import {
    Plus,
    Search,
    Key,
    Copy,
    Eye,
    EyeOff,
    Edit2,
    Trash2,
    Star,
    Globe,
    X,
    RefreshCw
} from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { createAuthenticatedApi } from '../services/api';
import { encrypt, decrypt, generatePassword, calculatePasswordStrength } from '../crypto/clientCrypto';
import toast from 'react-hot-toast';

export default function Vault() {
    const { accessToken, getEncryptionKey } = useAuthStore();
    const [entries, setEntries] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingEntry, setEditingEntry] = useState(null);
    const [visiblePasswords, setVisiblePasswords] = useState({});
    const [decryptedData, setDecryptedData] = useState({});

    // Form state
    const [formData, setFormData] = useState({
        title: '',
        username: '',
        password: '',
        url: '',
        notes: '',
        category: 'login',
    });

    const api = createAuthenticatedApi(accessToken);

    useEffect(() => {
        fetchEntries();
    }, [accessToken]);

    const fetchEntries = async () => {
        try {
            const response = await api.get('/vault');
            setEntries(response.data.entries || []);
        } catch (error) {
            toast.error('Erreur lors du chargement du coffre');
        } finally {
            setLoading(false);
        }
    };

    const decryptEntry = async (entry) => {
        if (decryptedData[entry.id]) return decryptedData[entry.id];

        try {
            const key = getEncryptionKey();
            const data = await decrypt(entry.encryptedData, entry.iv, key);
            setDecryptedData(prev => ({ ...prev, [entry.id]: data }));
            return data;
        } catch (error) {
            toast.error('Erreur de déchiffrement');
            return null;
        }
    };

    const handleCreateOrUpdate = async (e) => {
        e.preventDefault();

        try {
            const key = getEncryptionKey();
            const { encrypted, iv } = await encrypt(formData, key);

            if (editingEntry) {
                await api.put(`/vault/${editingEntry.id}`, {
                    encryptedData: encrypted,
                    iv,
                    category: formData.category,
                });
                toast.success('Entrée mise à jour');
            } else {
                await api.post('/vault', {
                    encryptedData: encrypted,
                    iv,
                    category: formData.category,
                });
                toast.success('Entrée créée');
            }

            setShowModal(false);
            resetForm();
            fetchEntries();
            // Clear decrypted cache
            setDecryptedData({});
        } catch (error) {
            toast.error('Erreur lors de la sauvegarde');
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Supprimer cette entrée ?')) return;

        try {
            await api.delete(`/vault/${id}`);
            toast.success('Entrée supprimée');
            fetchEntries();
        } catch (error) {
            toast.error('Erreur lors de la suppression');
        }
    };

    const handleToggleFavorite = async (id) => {
        try {
            await api.patch(`/vault/${id}/favorite`);
            fetchEntries();
        } catch (error) {
            toast.error('Erreur');
        }
    };

    const copyToClipboard = async (text, label) => {
        try {
            await navigator.clipboard.writeText(text);
            toast.success(`${label} copié`);
        } catch (error) {
            toast.error('Erreur de copie');
        }
    };

    const openEditModal = async (entry) => {
        const data = await decryptEntry(entry);
        if (data) {
            setFormData(data);
            setEditingEntry(entry);
            setShowModal(true);
        }
    };

    const resetForm = () => {
        setFormData({
            title: '',
            username: '',
            password: '',
            url: '',
            notes: '',
            category: 'login',
        });
        setEditingEntry(null);
    };

    const handleGeneratePassword = () => {
        const newPassword = generatePassword({ length: 24, symbols: true });
        setFormData(prev => ({ ...prev, password: newPassword }));
    };

    const passwordStrength = calculatePasswordStrength(formData.password);

    const filteredEntries = entries.filter(entry => {
        if (!searchQuery) return true;
        const data = decryptedData[entry.id];
        if (!data) return true;
        return data.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            data.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            data.url?.toLowerCase().includes(searchQuery.toLowerCase());
    });

    return (
        <div>
            {/* Header */}
            <div className="page-header">
                <div>
                    <h1 className="page-title">Coffre-fort</h1>
                    <p className="text-muted">{entries.length} entrées sécurisées</p>
                </div>
                <button className="btn btn-primary" onClick={() => { resetForm(); setShowModal(true); }}>
                    <Plus size={18} />
                    Nouvelle entrée
                </button>
            </div>

            {/* Search */}
            <div className="input-with-icon" style={{ marginBottom: 'var(--space-lg)' }}>
                <Search className="input-icon" size={18} />
                <input
                    type="text"
                    className="input"
                    placeholder="Rechercher..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>

            {/* Entries List */}
            {loading ? (
                <div className="flex items-center justify-center" style={{ padding: 'var(--space-2xl)' }}>
                    <span className="spinner" />
                </div>
            ) : filteredEntries.length > 0 ? (
                <div className="entry-list">
                    {filteredEntries.map((entry) => {
                        const data = decryptedData[entry.id];
                        const isVisible = visiblePasswords[entry.id];

                        return (
                            <div
                                key={entry.id}
                                className="entry-item"
                                onClick={() => !data && decryptEntry(entry)}
                            >
                                <div className="entry-favicon">
                                    {data?.url ? (
                                        <img
                                            src={`https://www.google.com/s2/favicons?sz=32&domain=${new URL(data.url).hostname}`}
                                            alt=""
                                            onError={(e) => { e.target.style.display = 'none'; }}
                                            style={{ width: 24, height: 24 }}
                                        />
                                    ) : (
                                        <Key size={20} />
                                    )}
                                </div>

                                <div className="entry-info" style={{ flex: 1 }}>
                                    <div className="entry-title">
                                        {data?.title || 'Cliquez pour déchiffrer'}
                                    </div>
                                    <div className="entry-username">
                                        {data?.username || '••••••••'}
                                    </div>
                                </div>

                                {data && (
                                    <>
                                        <div
                                            className="font-mono text-sm"
                                            style={{
                                                width: 150,
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                            }}
                                        >
                                            {isVisible ? data.password : '••••••••••••'}
                                        </div>

                                        <div className="entry-actions" onClick={(e) => e.stopPropagation()}>
                                            <button
                                                className="btn btn-icon btn-ghost"
                                                onClick={() => setVisiblePasswords(p => ({ ...p, [entry.id]: !p[entry.id] }))}
                                                title={isVisible ? 'Masquer' : 'Afficher'}
                                            >
                                                {isVisible ? <EyeOff size={16} /> : <Eye size={16} />}
                                            </button>
                                            <button
                                                className="btn btn-icon btn-ghost"
                                                onClick={() => copyToClipboard(data.password, 'Mot de passe')}
                                                title="Copier le mot de passe"
                                            >
                                                <Copy size={16} />
                                            </button>
                                            {data.url && (
                                                <button
                                                    className="btn btn-icon btn-ghost"
                                                    onClick={() => window.open(data.url, '_blank')}
                                                    title="Ouvrir le site"
                                                >
                                                    <Globe size={16} />
                                                </button>
                                            )}
                                            <button
                                                className="btn btn-icon btn-ghost"
                                                onClick={() => handleToggleFavorite(entry.id)}
                                                title="Favori"
                                            >
                                                <Star size={16} fill={entry.favorite ? 'var(--color-warning)' : 'none'} />
                                            </button>
                                            <button
                                                className="btn btn-icon btn-ghost"
                                                onClick={() => openEditModal(entry)}
                                                title="Modifier"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button
                                                className="btn btn-icon btn-ghost"
                                                onClick={() => handleDelete(entry.id)}
                                                title="Supprimer"
                                                style={{ color: 'var(--color-error)' }}
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="text-center text-muted" style={{ padding: 'var(--space-2xl)' }}>
                    <Key size={64} style={{ opacity: 0.3, marginBottom: 'var(--space-lg)' }} />
                    <h3>Aucune entrée</h3>
                    <p style={{ marginBottom: 'var(--space-lg)' }}>
                        Commencez par ajouter vos identifiants
                    </p>
                    <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                        <Plus size={18} /> Ajouter une entrée
                    </button>
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">
                                {editingEntry ? 'Modifier l\'entrée' : 'Nouvelle entrée'}
                            </h3>
                            <button className="modal-close" onClick={() => setShowModal(false)}>
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleCreateOrUpdate}>
                            <div className="modal-body">
                                <div className="input-group">
                                    <label className="input-label">Titre</label>
                                    <input
                                        type="text"
                                        className="input"
                                        value={formData.title}
                                        onChange={(e) => setFormData(p => ({ ...p, title: e.target.value }))}
                                        placeholder="Ex: Google"
                                        required
                                    />
                                </div>

                                <div className="input-group">
                                    <label className="input-label">Nom d'utilisateur / E-mail</label>
                                    <input
                                        type="text"
                                        className="input"
                                        value={formData.username}
                                        onChange={(e) => setFormData(p => ({ ...p, username: e.target.value }))}
                                        placeholder="Ex: vous@exemple.com"
                                    />
                                </div>

                                <div className="input-group">
                                    <label className="input-label">Mot de passe</label>
                                    <div className="flex gap-sm">
                                        <input
                                            type="text"
                                            className="input font-mono"
                                            value={formData.password}
                                            onChange={(e) => setFormData(p => ({ ...p, password: e.target.value }))}
                                            placeholder="Mot de passe"
                                            style={{ flex: 1 }}
                                        />
                                        <button
                                            type="button"
                                            className="btn btn-secondary"
                                            onClick={handleGeneratePassword}
                                            title="Générer"
                                        >
                                            <RefreshCw size={18} />
                                        </button>
                                    </div>
                                    {formData.password && (
                                        <>
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
                                        </>
                                    )}
                                </div>

                                <div className="input-group">
                                    <label className="input-label">URL du site</label>
                                    <input
                                        type="url"
                                        className="input"
                                        value={formData.url}
                                        onChange={(e) => setFormData(p => ({ ...p, url: e.target.value }))}
                                        placeholder="https://example.com"
                                    />
                                </div>

                                <div className="input-group">
                                    <label className="input-label">Notes</label>
                                    <textarea
                                        className="input"
                                        value={formData.notes}
                                        onChange={(e) => setFormData(p => ({ ...p, notes: e.target.value }))}
                                        placeholder="Notes sécurisées..."
                                        rows={3}
                                        style={{ resize: 'vertical' }}
                                    />
                                </div>

                                <div className="input-group">
                                    <label className="input-label">Catégorie</label>
                                    <select
                                        className="input"
                                        value={formData.category}
                                        onChange={(e) => setFormData(p => ({ ...p, category: e.target.value }))}
                                    >
                                        <option value="login">Identifiant</option>
                                        <option value="card">Carte bancaire</option>
                                        <option value="identity">Identité</option>
                                        <option value="note">Note sécurisée</option>
                                    </select>
                                </div>
                            </div>

                            <div className="modal-footer">
                                <button
                                    type="button"
                                    className="btn btn-ghost"
                                    onClick={() => setShowModal(false)}
                                >
                                    Annuler
                                </button>
                                <button type="submit" className="btn btn-primary">
                                    {editingEntry ? 'Enregistrer' : 'Créer'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
