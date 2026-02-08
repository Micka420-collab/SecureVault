import { useState, useEffect } from 'react';
import { Shield, AlertTriangle, CheckCircle, Lock, Key, Clock, RefreshCw, ArrowRight, Zap } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { createAuthenticatedApi } from '../services/api';
import toast from 'react-hot-toast';

/**
 * Security Score Dashboard - Vue complète du score de sécurité
 * 100% offline, calcul local
 */
export default function SecurityScore() {
    const { accessToken } = useAuthStore();
    const [score, setScore] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');

    const api = createAuthenticatedApi(accessToken);

    const fetchScore = async () => {
        try {
            const response = await api.get('/security/score');
            setScore(response.data);
        } catch (error) {
            toast.error('Erreur lors du chargement du score');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchScore();
    }, []);

    if (loading) {
        return (
            <div className="card" style={{ padding: 'var(--space-2xl)', textAlign: 'center' }}>
                <span className="spinner" />
                <p className="text-muted mt-md">Analyse de votre sécurité...</p>
            </div>
        );
    }

    if (!score) return null;

    const getPriorityColor = (priority) => {
        switch (priority) {
            case 'critical': return '#f38ba8';
            case 'high': return '#fab387';
            case 'medium': return '#f9e2af';
            default: return '#a6e3a1';
        }
    };

    const getPriorityLabel = (priority) => {
        switch (priority) {
            case 'critical': return 'Critique';
            case 'high': return 'Haute';
            case 'medium': return 'Moyenne';
            default: return 'Faible';
        }
    };

    return (
        <div>
            {/* Header avec Score Global */}
            <div className="page-header">
                <div>
                    <h1 className="page-title">Score de Sécurité</h1>
                    <p className="text-muted">Analyse complète de votre coffre-fort</p>
                </div>
                <button className="btn btn-secondary" onClick={fetchScore}>
                    <RefreshCw size={16} />
                    Actualiser
                </button>
            </div>

            {/* Score Circle */}
            <div className="card" style={{ marginBottom: 'var(--space-xl)', textAlign: 'center' }}>
                <div style={{ 
                    display: 'inline-flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    padding: 'var(--space-xl)',
                }}>
                    <div style={{
                        position: 'relative',
                        width: 200,
                        height: 200,
                    }}>
                        {/* Cercle de fond */}
                        <svg width="200" height="200" style={{ transform: 'rotate(-90deg)' }}>
                            <circle
                                cx="100"
                                cy="100"
                                r="90"
                                fill="none"
                                stroke="var(--color-surface0)"
                                strokeWidth="12"
                            />
                            <circle
                                cx="100"
                                cy="100"
                                r="90"
                                fill="none"
                                stroke={score.grade.color}
                                strokeWidth="12"
                                strokeLinecap="round"
                                strokeDasharray={`${(score.score / 100) * 2 * Math.PI * 90} ${2 * Math.PI * 90}`}
                                style={{ transition: 'stroke-dasharray 1s ease' }}
                            />
                        </svg>
                        <div style={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            textAlign: 'center',
                        }}>
                            <div style={{
                                fontSize: '3.5rem',
                                fontWeight: 700,
                                color: score.grade.color,
                                lineHeight: 1,
                            }}>
                                {score.score}
                            </div>
                            <div style={{
                                fontSize: '1.5rem',
                                fontWeight: 600,
                                color: 'var(--color-text)',
                            }}>
                                {score.grade.letter}
                            </div>
                            <div style={{
                                fontSize: '0.875rem',
                                color: 'var(--color-subtext0)',
                            }}>
                                {score.grade.label}
                            </div>
                        </div>
                    </div>

                    {/* Dernière mise à jour */}
                    <p className="text-muted text-sm mt-md">
                        Mis à jour : {new Date(score.lastUpdated).toLocaleString('fr-FR')}
                    </p>
                </div>

                {/* Stats rapides */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: 'var(--space-lg)',
                    padding: 'var(--space-lg)',
                    borderTop: '1px solid var(--color-surface0)',
                }}>
                    <StatBox 
                        icon={Key}
                        value={score.stats.totalPasswords}
                        label="Mots de passe"
                        color="var(--color-primary)"
                    />
                    <StatBox 
                        icon={Lock}
                        value={score.stats.weakPasswords}
                        label="Faibles"
                        color="var(--color-error)"
                        warning={score.stats.weakPasswords > 0}
                    />
                    <StatBox 
                        icon={Clock}
                        value={score.stats.oldPasswords}
                        label="Anciens (>90j)"
                        color="var(--color-warning)"
                        warning={score.stats.oldPasswords > 0}
                    />
                    <StatBox 
                        icon={Shield}
                        value={score.stats.with2FA ? 'Actif' : 'Inactif'}
                        label="2FA"
                        color={score.stats.with2FA ? 'var(--color-success)' : 'var(--color-error)'}
                        warning={!score.stats.with2FA}
                    />
                </div>
            </div>

            {/* Tabs */}
            <div style={{ 
                display: 'flex', 
                gap: 'var(--space-sm)',
                marginBottom: 'var(--space-lg)',
                borderBottom: '1px solid var(--color-surface0)',
            }}>
                {[
                    { id: 'overview', label: 'Vue d\'ensemble', icon: Shield },
                    { id: 'breakdown', label: 'Détails', icon: Zap },
                    { id: 'recommendations', label: 'Recommandations', icon: AlertTriangle },
                ].map(tab => (
                    <button
                        key={tab.id}
                        className={`btn ${activeTab === tab.id ? 'btn-primary' : 'btn-ghost'}`}
                        onClick={() => setActiveTab(tab.id)}
                        style={{
                            borderRadius: 'var(--radius-md) var(--radius-md) 0 0',
                            borderBottom: activeTab === tab.id ? '2px solid var(--color-primary)' : 'none',
                        }}
                    >
                        <tab.icon size={16} />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Content */}
            {activeTab === 'overview' && (
                <div className="grid grid-2">
                    {/* Répartition des scores */}
                    <div className="card">
                        <h3 className="card-title">Répartition du score</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                            <ScoreBar 
                                label="Force des mots de passe"
                                score={score.breakdown.passwordStrength}
                            />
                            <ScoreBar 
                                label="Âge des mots de passe"
                                score={score.breakdown.passwordAge}
                            />
                            <ScoreBar 
                                label="Unicité"
                                score={score.breakdown.uniqueness}
                            />
                            <ScoreBar 
                                label="Double authentification"
                                score={score.breakdown.twoFA}
                            />
                            <ScoreBar 
                                label="Sessions"
                                score={score.breakdown.sessionSecurity}
                            />
                            <ScoreBar 
                                label="Alias"
                                score={score.breakdown.aliasSecurity}
                            />
                        </div>
                    </div>

                    {/* Top recommandations */}
                    <div className="card">
                        <h3 className="card-title">Actions prioritaires</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                            {score.recommendations.slice(0, 3).map((rec, index) => (
                                <div 
                                    key={index}
                                    className="card"
                                    style={{
                                        borderLeft: `4px solid ${getPriorityColor(rec.priority)}`,
                                        padding: 'var(--space-md)',
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: 'var(--space-xs)' }}>
                                        <span 
                                            className="badge"
                                            style={{ 
                                                background: `${getPriorityColor(rec.priority)}20`,
                                                color: getPriorityColor(rec.priority),
                                            }}
                                        >
                                            {getPriorityLabel(rec.priority)}
                                        </span>
                                        <span className="badge badge-info">{rec.impact}</span>
                                    </div>
                                    <p style={{ fontWeight: 500 }}>{rec.title}</p>
                                    <p className="text-muted text-sm">{rec.description}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'breakdown' && (
                <div className="card">
                    <h3 className="card-title">Détail des calculs</h3>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--color-surface0)' }}>
                                <th style={{ textAlign: 'left', padding: 'var(--space-md)' }}>Critère</th>
                                <th style={{ textAlign: 'center', padding: 'var(--space-md)' }}>Score</th>
                                <th style={{ textAlign: 'center', padding: 'var(--space-md)' }}>Poids</th>
                                <th style={{ textAlign: 'right', padding: 'var(--space-md)' }}>Contribution</th>
                            </tr>
                        </thead>
                        <tbody>
                            {[
                                { name: 'Force des mots de passe', key: 'passwordStrength', weight: '25%' },
                                { name: 'Âge des mots de passe', key: 'passwordAge', weight: '20%' },
                                { name: 'Unicité', key: 'uniqueness', weight: '20%' },
                                { name: '2FA', key: 'twoFA', weight: '20%' },
                                { name: 'Sécurité des sessions', key: 'sessionSecurity', weight: '10%' },
                                { name: 'Utilisation des alias', key: 'aliasSecurity', weight: '5%' },
                            ].map(item => {
                                const score = score.breakdown[item.key];
                                const weight = parseInt(item.weight) / 100;
                                const contribution = Math.round(score * weight);
                                
                                return (
                                    <tr key={item.key} style={{ borderBottom: '1px solid var(--color-surface0)' }}>
                                        <td style={{ padding: 'var(--space-md)' }}>{item.name}</td>
                                        <td style={{ textAlign: 'center', padding: 'var(--space-md)' }}>
                                            <span className={`badge ${score >= 80 ? 'badge-success' : score >= 60 ? 'badge-warning' : 'badge-error'}`}>
                                                {score}/100
                                            </span>
                                        </td>
                                        <td style={{ textAlign: 'center', padding: 'var(--space-md)' }}>{item.weight}</td>
                                        <td style={{ textAlign: 'right', padding: 'var(--space-md)', fontWeight: 600 }}>
                                            +{contribution}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                        <tfoot>
                            <tr style={{ fontWeight: 700, fontSize: '1.125rem' }}>
                                <td style={{ padding: 'var(--space-md)' }}>Total</td>
                                <td colSpan={2}></td>
                                <td style={{ textAlign: 'right', padding: 'var(--space-md)', color: score.grade.color }}>
                                    {score.score}/100
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            )}

            {activeTab === 'recommendations' && (
                <div className="card">
                    <h3 className="card-title">Toutes les recommandations</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                        {score.recommendations.map((rec, index) => (
                            <div 
                                key={index}
                                style={{
                                    display: 'flex',
                                    alignItems: 'flex-start',
                                    gap: 'var(--space-md)',
                                    padding: 'var(--space-md)',
                                    borderBottom: index < score.recommendations.length - 1 ? '1px solid var(--color-surface0)' : 'none',
                                }}
                            >
                                <div style={{
                                    width: 8,
                                    height: 8,
                                    borderRadius: '50%',
                                    background: getPriorityColor(rec.priority),
                                    marginTop: 6,
                                    flexShrink: 0,
                                }} />
                                <div style={{ flex: 1 }}>
                                    <p style={{ fontWeight: 500 }}>{rec.title}</p>
                                    <p className="text-muted text-sm">{rec.description}</p>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <span className="badge badge-info" style={{ marginBottom: 'var(--space-xs)' }}>
                                        {rec.impact}
                                    </span>
                                    <br />
                                    <a 
                                        href={rec.action}
                                        className="btn btn-sm btn-secondary"
                                        style={{ marginTop: 'var(--space-sm)' }}
                                    >
                                        Résoudre
                                        <ArrowRight size={14} />
                                    </a>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

function StatBox({ icon: Icon, value, label, color, warning }) {
    return (
        <div style={{ textAlign: 'center' }}>
            <div style={{
                width: 48,
                height: 48,
                borderRadius: 'var(--radius-lg)',
                background: warning ? `${color}20` : 'var(--color-surface0)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto var(--space-sm)',
            }}>
                <Icon size={24} color={color} />
            </div>
            <div style={{ 
                fontSize: '1.5rem', 
                fontWeight: 700,
                color: warning ? color : 'var(--color-text)',
            }}>
                {value}
            </div>
            <div className="text-muted text-sm">{label}</div>
        </div>
    );
}

function ScoreBar({ label, score }) {
    const color = score >= 80 ? 'var(--color-success)' : score >= 60 ? 'var(--color-warning)' : 'var(--color-error)';
    
    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-xs)' }}>
                <span className="text-sm">{label}</span>
                <span className="text-sm" style={{ color, fontWeight: 600 }}>{score}%</span>
            </div>
            <div style={{
                height: 8,
                background: 'var(--color-surface0)',
                borderRadius: 'var(--radius-full)',
                overflow: 'hidden',
            }}>
                <div style={{
                    height: '100%',
                    width: `${score}%`,
                    background: color,
                    borderRadius: 'var(--radius-full)',
                    transition: 'width 0.5s ease',
                }} />
            </div>
        </div>
    );
}
