import { useState, useEffect } from 'react';
import { Inbox, Mail, Star, Trash2, Check, X, ArrowLeft } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { createAuthenticatedApi } from '../services/api';
import { decrypt } from '../crypto/clientCrypto';
import toast from 'react-hot-toast';

export default function Emails() {
    const { accessToken, getEncryptionKey } = useAuthStore();
    const [emails, setEmails] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedEmail, setSelectedEmail] = useState(null);
    const [decryptedBody, setDecryptedBody] = useState('');
    const [filter, setFilter] = useState('all'); // all, unread, starred

    const api = createAuthenticatedApi(accessToken);

    useEffect(() => {
        fetchEmails();
    }, [accessToken, filter]);

    const fetchEmails = async () => {
        try {
            const params = new URLSearchParams();
            if (filter === 'unread') params.append('unreadOnly', 'true');
            if (filter === 'starred') params.append('starred', 'true');

            const response = await api.get(`/emails?${params.toString()}`);
            setEmails(response.data.emails || []);
        } catch (error) {
            toast.error('Erreur lors du chargement des e-mails');
        } finally {
            setLoading(false);
        }
    };

    const handleSelectEmail = async (email) => {
        setSelectedEmail(email);
        setDecryptedBody('');

        try {
            // Mark as read
            if (!email.isRead) {
                await api.patch(`/emails/${email.id}/read`, { isRead: true });
            }

            // Get full email with encrypted body
            const response = await api.get(`/emails/${email.id}`);
            const fullEmail = response.data.email;

            // Decrypt body
            try {
                const key = getEncryptionKey();
                const body = await decrypt(fullEmail.bodyEncrypted, fullEmail.bodyIv, key);
                setDecryptedBody(body);
            } catch {
                setDecryptedBody('[Impossible de déchiffrer le contenu]');
            }

            // Update local state
            setEmails(emails.map(e => e.id === email.id ? { ...e, isRead: true } : e));
        } catch (error) {
            toast.error('Erreur lors du chargement de l\'e-mail');
        }
    };

    const handleToggleStar = async (emailId, e) => {
        e?.stopPropagation();
        try {
            await api.patch(`/emails/${emailId}/star`);
            setEmails(emails.map(e => e.id === emailId ? { ...e, isStarred: !e.isStarred } : e));
        } catch (error) {
            toast.error('Erreur');
        }
    };

    const handleDelete = async (emailId, e) => {
        e?.stopPropagation();
        if (!confirm('Supprimer cet e-mail ?')) return;

        try {
            await api.delete(`/emails/${emailId}`);
            setEmails(emails.filter(e => e.id !== emailId));
            if (selectedEmail?.id === emailId) setSelectedEmail(null);
            toast.success('E-mail supprimé');
        } catch (error) {
            toast.error('Erreur lors de la suppression');
        }
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diff = now - date;

        if (diff < 86400000) { // Less than 24h
            return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
        }
        return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
    };

    const unreadCount = emails.filter(e => !e.isRead).length;

    return (
        <div>
            {/* Header */}
            <div className="page-header">
                <div>
                    <h1 className="page-title">Messages</h1>
                    <p className="text-muted">
                        {unreadCount > 0 ? `${unreadCount} non lu(s)` : 'Tous les messages lus'}
                    </p>
                </div>
                <div className="flex gap-sm">
                    {['all', 'unread', 'starred'].map((f) => (
                        <button
                            key={f}
                            className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-ghost'}`}
                            onClick={() => setFilter(f)}
                        >
                            {f === 'all' ? 'Tous' : f === 'unread' ? 'Non lus' : 'Favoris'}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex gap-lg" style={{ height: 'calc(100vh - 200px)' }}>
                {/* Email List */}
                <div
                    style={{
                        width: selectedEmail ? '40%' : '100%',
                        overflowY: 'auto',
                        transition: 'width var(--transition-normal)',
                    }}
                >
                    {loading ? (
                        <div className="flex items-center justify-center" style={{ padding: 'var(--space-2xl)' }}>
                            <span className="spinner" />
                        </div>
                    ) : emails.length > 0 ? (
                        <div className="entry-list">
                            {emails.map((email) => (
                                <div
                                    key={email.id}
                                    className="entry-item"
                                    onClick={() => handleSelectEmail(email)}
                                    style={{
                                        background: selectedEmail?.id === email.id
                                            ? 'var(--color-surface1)'
                                            : !email.isRead
                                                ? 'rgba(137, 180, 250, 0.05)'
                                                : undefined,
                                    }}
                                >
                                    <div className="entry-favicon">
                                        <Mail
                                            size={20}
                                            fill={!email.isRead ? 'var(--color-secondary)' : 'none'}
                                            color={!email.isRead ? 'var(--color-secondary)' : 'var(--color-overlay0)'}
                                        />
                                    </div>

                                    <div className="entry-info" style={{ flex: 1, minWidth: 0 }}>
                                        <div
                                            className="entry-title"
                                            style={{ fontWeight: !email.isRead ? 600 : 400 }}
                                        >
                                            {email.subject || '(Sans objet)'}
                                        </div>
                                        <div className="entry-username truncate">
                                            {email.fromAddress}
                                        </div>
                                    </div>

                                    <div className="flex flex-col items-end gap-sm">
                                        <span className="text-sm text-muted">
                                            {formatDate(email.receivedAt)}
                                        </span>
                                        <span className="badge" style={{ fontSize: '0.7rem' }}>
                                            via {email.alias?.label || 'alias'}
                                        </span>
                                    </div>

                                    <div className="entry-actions" style={{ marginLeft: 'var(--space-sm)' }}>
                                        <button
                                            className="btn btn-icon btn-ghost"
                                            onClick={(e) => handleToggleStar(email.id, e)}
                                        >
                                            <Star
                                                size={16}
                                                fill={email.isStarred ? 'var(--color-warning)' : 'none'}
                                                color={email.isStarred ? 'var(--color-warning)' : undefined}
                                            />
                                        </button>
                                        <button
                                            className="btn btn-icon btn-ghost"
                                            onClick={(e) => handleDelete(email.id, e)}
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
                            <Inbox size={64} style={{ opacity: 0.3, marginBottom: 'var(--space-lg)' }} />
                            <h3>Aucun message</h3>
                            <p>Les e-mails reçus via vos alias apparaîtront ici</p>
                        </div>
                    )}
                </div>

                {/* Email Detail */}
                {selectedEmail && (
                    <div
                        className="card"
                        style={{
                            flex: 1,
                            display: 'flex',
                            flexDirection: 'column',
                            overflow: 'hidden',
                        }}
                    >
                        <div
                            className="flex items-center gap-md"
                            style={{
                                borderBottom: '1px solid var(--color-surface1)',
                                paddingBottom: 'var(--space-md)',
                                marginBottom: 'var(--space-md)',
                            }}
                        >
                            <button
                                className="btn btn-icon btn-ghost"
                                onClick={() => setSelectedEmail(null)}
                            >
                                <ArrowLeft size={20} />
                            </button>
                            <div style={{ flex: 1 }}>
                                <h3 style={{ fontSize: '1.125rem' }}>
                                    {selectedEmail.subject || '(Sans objet)'}
                                </h3>
                                <p className="text-sm text-muted">
                                    De: {selectedEmail.fromAddress}
                                </p>
                            </div>
                            <button
                                className="btn btn-icon btn-ghost"
                                onClick={(e) => handleToggleStar(selectedEmail.id, e)}
                            >
                                <Star
                                    size={20}
                                    fill={selectedEmail.isStarred ? 'var(--color-warning)' : 'none'}
                                    color={selectedEmail.isStarred ? 'var(--color-warning)' : undefined}
                                />
                            </button>
                            <button
                                className="btn btn-icon btn-ghost"
                                onClick={(e) => handleDelete(selectedEmail.id, e)}
                                style={{ color: 'var(--color-error)' }}
                            >
                                <Trash2 size={20} />
                            </button>
                        </div>

                        <div
                            className="flex items-center gap-sm text-sm text-muted"
                            style={{ marginBottom: 'var(--space-md)' }}
                        >
                            <span>Reçu via:</span>
                            <span className="badge badge-info">{selectedEmail.alias?.aliasAddress}</span>
                            <span>le {new Date(selectedEmail.receivedAt).toLocaleString('fr-FR')}</span>
                        </div>

                        <div
                            style={{
                                flex: 1,
                                overflowY: 'auto',
                                padding: 'var(--space-md)',
                                background: 'var(--color-surface0)',
                                borderRadius: 'var(--radius-md)',
                                whiteSpace: 'pre-wrap',
                                fontFamily: 'inherit',
                                lineHeight: 1.6,
                            }}
                        >
                            {decryptedBody || (
                                <div className="flex items-center justify-center" style={{ height: '100%' }}>
                                    <span className="spinner" />
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
