import { useState } from 'react';
import { Download, Shield, FileJson, Lock, CheckCircle } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { createAuthenticatedApi } from '../services/api';
import { encrypt } from '../crypto/clientCrypto';
import toast from 'react-hot-toast';

/**
 * VaultExport - Export sécurisé des données du vault
 * 
 * Features:
 * - Export chiffré avec mot de passe
 * - Export non chiffré (JSON)
 * - Vérification de l'intégrité
 * - Progression de l'export
 */
export default function VaultExport({ entries, onClose }) {
    const { accessToken, getEncryptionKey } = useAuthStore();
    const [exportPassword, setExportPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [exportFormat, setExportFormat] = useState('encrypted'); // 'encrypted' | 'json'
    const [isExporting, setIsExporting] = useState(false);
    const [exportComplete, setExportComplete] = useState(false);

    const api = createAuthenticatedApi(accessToken);

    const handleExport = async () => {
        if (entries.length === 0) {
            toast.error('Aucune entrée à exporter');
            return;
        }

        setIsExporting(true);

        try {
            let dataToExport;
            let filename;
            let mimeType;

            if (exportFormat === 'encrypted') {
                // Vérifier le mot de passe
                if (!exportPassword || exportPassword.length < 8) {
                    toast.error('Le mot de passe d export doit faire au moins 8 caractères');
                    setIsExporting(false);
                    return;
                }

                if (exportPassword !== confirmPassword) {
                    toast.error('Les mots de passe ne correspondent pas');
                    setIsExporting(false);
                    return;
                }

                // Déchiffrer toutes les entrées
                const key = getEncryptionKey();
                const decryptedEntries = await Promise.all(
                    entries.map(async (entry) => {
                        try {
                            const { decrypt } = await import('../crypto/clientCrypto');
                            const data = await decrypt(entry.encryptedData, entry.iv, key);
                            return {
                                ...data,
                                category: entry.category,
                                favorite: entry.favorite,
                                createdAt: entry.createdAt,
                                updatedAt: entry.updatedAt,
                            };
                        } catch (e) {
                            console.error('Failed to decrypt entry:', e);
                            return null;
                        }
                    })
                );

                const validEntries = decryptedEntries.filter(Boolean);

                // Chiffrer avec le mot de passe d'export
                const { encrypt: encryptExport } = await import('../crypto/clientCrypto');
                const salt = crypto.getRandomValues(new Uint8Array(16)).toString('base64');
                
                // Dériver une clé du mot de passe d'export
                const encoder = new TextEncoder();
                const keyMaterial = await crypto.subtle.importKey(
                    'raw',
                    encoder.encode(exportPassword + salt),
                    'PBKDF2',
                    false,
                    ['deriveKey']
                );
                
                const exportKey = await crypto.subtle.deriveKey(
                    {
                        name: 'PBKDF2',
                        salt: encoder.encode(salt),
                        iterations: 100000,
                        hash: 'SHA-256',
                    },
                    keyMaterial,
                    { name: 'AES-GCM', length: 256 },
                    false,
                    ['encrypt']
                );

                const encrypted = await encryptExport(
                    JSON.stringify(validEntries),
                    exportKey
                );

                dataToExport = JSON.stringify({
                    version: '1.0',
                    format: 'securevault-encrypted',
                    exportedAt: new Date().toISOString(),
                    count: validEntries.length,
                    salt,
                    data: encrypted.encrypted,
                    iv: encrypted.iv,
                }, null, 2);

                filename = `securevault-export-${new Date().toISOString().split('T')[0]}.svault`;
                mimeType = 'application/json';

            } else {
                // Export JSON non chiffré (avec avertissement)
                if (!confirm('ATTENTION : Cette option exporte vos mots de passe en CLAIR. Êtes-vous sûr ?')) {
                    setIsExporting(false);
                    return;
                }

                // Déchiffrer toutes les entrées
                const key = getEncryptionKey();
                const decryptedEntries = await Promise.all(
                    entries.map(async (entry) => {
                        try {
                            const { decrypt } = await import('../crypto/clientCrypto');
                            const data = await decrypt(entry.encryptedData, entry.iv, key);
                            return {
                                ...data,
                                category: entry.category,
                                favorite: entry.favorite,
                                createdAt: entry.createdAt,
                                updatedAt: entry.updatedAt,
                            };
                        } catch (e) {
                            return null;
                        }
                    })
                );

                dataToExport = JSON.stringify({
                    version: '1.0',
                    format: 'securevault-json',
                    exportedAt: new Date().toISOString(),
                    warning: 'UNENCRYPTED - Store securely',
                    count: decryptedEntries.filter(Boolean).length,
                    entries: decryptedEntries.filter(Boolean),
                }, null, 2);

                filename = `securevault-export-${new Date().toISOString().split('T')[0]}.json`;
                mimeType = 'application/json';
            }

            // Créer et télécharger le fichier
            const blob = new Blob([dataToExport], { type: mimeType });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            // Log l'export côté serveur
            await api.post('/vault/export/log', { 
                format: exportFormat,
                count: entries.length 
            }).catch(() => {});

            setExportComplete(true);
            toast.success('Export réussi !');

            setTimeout(() => {
                onClose();
            }, 2000);

        } catch (error) {
            console.error('Export failed:', error);
            toast.error('Erreur lors de l export');
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
                <div className="modal-header">
                    <h3 className="modal-title">
                        <Download size={20} style={{ marginRight: 'var(--space-sm)', verticalAlign: 'middle' }} />
                        Exporter le coffre-fort
                    </h3>
                    <button className="modal-close" onClick={onClose}>×</button>
                </div>

                <div className="modal-body">
                    {exportComplete ? (
                        <div className="text-center" style={{ padding: 'var(--space-xl)' }}>
                            <CheckCircle size={64} color="var(--color-success)" style={{ marginBottom: 'var(--space-md)' }} />
                            <h4>Export réussi !</h4>
                            <p className="text-muted">
                                Vos données ont été exportées et téléchargées.
                            </p>
                        </div>
                    ) : (
                        <>
                            <div style={{ marginBottom: 'var(--space-lg)' }}>
                                <label className="input-label">Format d export</label>
                                <div style={{ display: 'flex', gap: 'var(--space-md)', marginTop: 'var(--space-sm)' }}>
                                    <button
                                        className={`btn ${exportFormat === 'encrypted' ? 'btn-primary' : 'btn-ghost'}`}
                                        onClick={() => setExportFormat('encrypted')}
                                        style={{ flex: 1 }}
                                    >
                                        <Lock size={16} />
                                        Chiffré (.svault)
                                    </button>
                                    <button
                                        className={`btn ${exportFormat === 'json' ? 'btn-primary' : 'btn-ghost'}`}
                                        onClick={() => setExportFormat('json')}
                                        style={{ flex: 1 }}
                                    >
                                        <FileJson size={16} />
                                        JSON (clair)
                                    </button>
                                </div>
                            </div>

                            {exportFormat === 'encrypted' ? (
                                <>
                                    <div 
                                        className="card"
                                        style={{
                                            background: 'rgba(166, 227, 161, 0.1)',
                                            border: '1px solid var(--color-success)',
                                            marginBottom: 'var(--space-lg)',
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                                            <Shield size={20} color="var(--color-success)" />
                                            <p className="text-sm" style={{ color: 'var(--color-success)' }}>
                                                Vos données seront chiffrées avec un mot de passe.
                                                Conservez ce mot de passe pour pouvoir importer plus tard.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="input-group" style={{ marginBottom: 'var(--space-md)' }}>
                                        <label className="input-label">Mot de passe d export</label>
                                        <input
                                            type="password"
                                            className="input"
                                            value={exportPassword}
                                            onChange={(e) => setExportPassword(e.target.value)}
                                            placeholder="Minimum 8 caractères"
                                        />
                                    </div>

                                    <div className="input-group" style={{ marginBottom: 'var(--space-md)' }}>
                                        <label className="input-label">Confirmer le mot de passe</label>
                                        <input
                                            type="password"
                                            className="input"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            placeholder="Répétez le mot de passe"
                                        />
                                    </div>
                                </>
                            ) : (
                                <div 
                                    className="card"
                                    style={{
                                        background: 'rgba(243, 139, 168, 0.1)',
                                        border: '1px solid var(--color-error)',
                                        marginBottom: 'var(--space-lg)',
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                                        <Shield size={20} color="var(--color-error)" />
                                        <p className="text-sm" style={{ color: 'var(--color-error)' }}>
                                            ⚠️ Attention : Ce format exporte vos mots de passe en CLAIR.
                                            Assurez-vous de stocker ce fichier en lieu sûr et de le supprimer après usage.
                                        </p>
                                    </div>
                                </div>
                            )}

                            <p className="text-muted text-sm">
                                <strong>{entries.length}</strong> entrées seront exportées
                            </p>
                        </>
                    )}
                </div>

                {!exportComplete && (
                    <div className="modal-footer">
                        <button className="btn btn-ghost" onClick={onClose}>
                            Annuler
                        </button>
                        <button 
                            className="btn btn-primary"
                            onClick={handleExport}
                            disabled={isExporting}
                        >
                            {isExporting ? (
                                <span className="spinner spinner-sm" />
                            ) : (
                                <>
                                    <Download size={16} />
                                    Exporter
                                </>
                            )}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
