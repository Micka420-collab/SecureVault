/**
 * Analytics Dashboard - SecureVault by Nextendo x Micka Delcato
 * Tableau de bord d'analyses et statistiques
 */

import { useState, useEffect } from 'react';
import { 
    LayoutDashboard, 
    Shield, 
    Key, 
    Mail, 
    FileText, 
    Users,
    Lock,
    AlertTriangle,
    CheckCircle,
    TrendingUp,
    TrendingDown,
    Activity,
    Clock,
    Globe,
    Smartphone,
    Laptop,
    Tablet
} from 'lucide-react';
import { useTranslation } from '../stores/i18nStore';
import api from '../services/api';

// Composants de graphiques simples (sans bibliothèque externe)
const BarChart = ({ data, maxValue, color = '#89b4fa' }) => {
    return (
        <div className="flex items-end gap-2 h-32">
            {data.map((item, index) => {
                const height = maxValue ? (item.value / maxValue) * 100 : 50;
                return (
                    <div key={index} className="flex-1 flex flex-col items-center gap-1">
                        <div 
                            className="w-full rounded-t-lg transition-all duration-500"
                            style={{ 
                                height: `${height}%`, 
                                backgroundColor: color,
                                opacity: 0.7 + (height / 300)
                            }}
                            title={`${item.label}: ${item.value}`}
                        />
                        <span className="text-xs text-subtext0 truncate w-full text-center">
                            {item.label}
                        </span>
                    </div>
                );
            })}
        </div>
    );
};

const PieChart = ({ data, size = 120 }) => {
    const total = data.reduce((acc, item) => acc + item.value, 0);
    let currentAngle = 0;
    
    return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            {data.map((item, index) => {
                const angle = (item.value / total) * 360;
                const startAngle = currentAngle;
                currentAngle += angle;
                
                const startRad = (startAngle * Math.PI) / 180;
                const endRad = ((startAngle + angle) * Math.PI) / 180;
                
                const x1 = size/2 + (size/2 - 10) * Math.cos(startRad);
                const y1 = size/2 + (size/2 - 10) * Math.sin(startRad);
                const x2 = size/2 + (size/2 - 10) * Math.cos(endRad);
                const y2 = size/2 + (size/2 - 10) * Math.sin(endRad);
                
                const largeArc = angle > 180 ? 1 : 0;
                
                return (
                    <path
                        key={index}
                        d={`M ${size/2} ${size/2} L ${x1} ${y1} A ${size/2 - 10} ${size/2 - 10} 0 ${largeArc} 1 ${x2} ${y2} Z`}
                        fill={item.color}
                        stroke="var(--color-surface0)"
                        strokeWidth="2"
                    />
                );
            })}
            <circle cx={size/2} cy={size/2} r={size/4} fill="var(--color-surface0)" />
        </svg>
    );
};

const StatCard = ({ title, value, change, changeType, icon: Icon, color }) => {
    const isPositive = changeType === 'positive';
    const isNegative = changeType === 'negative';
    
    return (
        <div className="p-6 rounded-2xl bg-surface1 border border-surface2 hover:border-surface2 transition-all">
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-sm text-subtext0 mb-1">{title}</p>
                    <p className="text-3xl font-bold text-text">{value}</p>
                    {change && (
                        <div className={`flex items-center gap-1 mt-2 text-sm ${
                            isPositive ? 'text-green' : isNegative ? 'text-red' : 'text-subtext0'
                        }`}>
                            {isPositive && <TrendingUp size={16} />}
                            {isNegative && <TrendingDown size={16} />}
                            <span>{change}</span>
                        </div>
                    )}
                </div>
                <div className={`p-3 rounded-xl ${color}`}>
                    <Icon size={24} className="text-surface0" />
                </div>
            </div>
        </div>
    );
};

const ActivityItem = ({ icon: Icon, text, time, type = 'info' }) => {
    const colors = {
        info: 'bg-blue/20 text-blue',
        success: 'bg-green/20 text-green',
        warning: 'bg-yellow/20 text-yellow',
        error: 'bg-red/20 text-red',
    };
    
    return (
        <div className="flex items-center gap-4 p-4 rounded-xl bg-surface0 hover:bg-surface1 transition-colors">
            <div className={`p-2 rounded-lg ${colors[type]}`}>
                <Icon size={20} />
            </div>
            <div className="flex-1">
                <p className="text-text">{text}</p>
                <p className="text-sm text-subtext0">{time}</p>
            </div>
        </div>
    );
};

export default function Analytics() {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState(null);
    const [timeRange, setTimeRange] = useState('7d');

    useEffect(() => {
        fetchStats();
    }, [timeRange]);

    const fetchStats = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/analytics?range=${timeRange}`);
            setStats(response.data);
        } catch (error) {
            console.error('Failed to fetch analytics:', error);
            // Données de démo en cas d'erreur
            setStats(getDemoData());
        } finally {
            setLoading(false);
        }
    };

    const getDemoData = () => ({
        overview: {
            totalPasswords: 156,
            totalAliases: 24,
            totalDocuments: 42,
            securityScore: 87,
            passwordsChange: '+12',
            aliasesChange: '+3',
            documentsChange: '+8',
            scoreChange: '+5'
        },
        categories: [
            { label: 'Social', value: 45, color: '#89b4fa' },
            { label: 'Work', value: 38, color: '#a6e3a1' },
            { label: 'Finance', value: 22, color: '#f9e2af' },
            { label: 'Dev', value: 31, color: '#f38ba8' },
            { label: 'Other', value: 20, color: '#cba6f7' }
        ],
        activityOverTime: [
            { label: 'Lun', value: 12 },
            { label: 'Mar', value: 19 },
            { label: 'Mer', value: 15 },
            { label: 'Jeu', value: 25 },
            { label: 'Ven', value: 22 },
            { label: 'Sam', value: 8 },
            { label: 'Dim', value: 5 }
        ],
        devices: [
            { label: 'Desktop', value: 65, color: '#89b4fa' },
            { label: 'Mobile', value: 28, color: '#a6e3a1' },
            { label: 'Tablet', value: 7, color: '#f9e2af' }
        ],
        recentActivity: [
            { icon: Key, text: 'Nouveau mot de passe ajouté: Netflix', time: 'Il y a 5 minutes', type: 'success' },
            { icon: Lock, text: 'Connexion depuis Chrome sur Windows', time: 'Il y a 2 heures', type: 'info' },
            { icon: Mail, text: 'Nouvel alias créé: shopping@alias.com', time: 'Il y a 3 heures', type: 'success' },
            { icon: AlertTriangle, text: 'Tentative de connexion échouée', time: 'Il y a 5 heures', type: 'warning' },
            { icon: Shield, text: 'Scan de sécurité complété', time: 'Il y a 1 jour', type: 'info' }
        ],
        passwordStrength: {
            strong: 89,
            medium: 45,
            weak: 12
        }
    });

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="flex items-center gap-3 text-subtext0">
                    <Activity className="animate-spin" />
                    <span>Chargement des statistiques...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-text flex items-center gap-3">
                        <LayoutDashboard className="text-cyan-400" />
                        Analytics Dashboard
                    </h1>
                    <p className="text-subtext0 mt-1">Vue d'ensemble de votre activité SecureVault</p>
                </div>
                
                <div className="flex items-center gap-2 bg-surface0 rounded-xl p-1">
                    {['24h', '7d', '30d', '90d'].map((range) => (
                        <button
                            key={range}
                            onClick={() => setTimeRange(range)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                timeRange === range
                                    ? 'bg-cyan-400 text-surface0'
                                    : 'text-subtext0 hover:text-text'
                            }`}
                        >
                            {range === '24h' ? '24h' : range === '7d' ? '7 jours' : range === '30d' ? '30 jours' : '3 mois'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="Mots de passe"
                    value={stats.overview.totalPasswords}
                    change={stats.overview.passwordsChange}
                    changeType="positive"
                    icon={Key}
                    color="bg-blue"
                />
                <StatCard
                    title="Alias Email"
                    value={stats.overview.totalAliases}
                    change={stats.overview.aliasesChange}
                    changeType="positive"
                    icon={Mail}
                    color="bg-green"
                />
                <StatCard
                    title="Documents"
                    value={stats.overview.totalDocuments}
                    change={stats.overview.documentsChange}
                    changeType="positive"
                    icon={FileText}
                    color="bg-yellow"
                />
                <StatCard
                    title="Score de sécurité"
                    value={`${stats.overview.securityScore}%`}
                    change={stats.overview.scoreChange}
                    changeType="positive"
                    icon={Shield}
                    color="bg-mauve"
                />
            </div>

            {/* Graphs */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Activity Over Time */}
                <div className="p-6 rounded-2xl bg-surface1 border border-surface2">
                    <h3 className="text-lg font-semibold text-text mb-6 flex items-center gap-2">
                        <Activity size={20} className="text-cyan-400" />
                        Activité sur la période
                    </h3>
                    <BarChart 
                        data={stats.activityOverTime} 
                        maxValue={30}
                        color="#89b4fa"
                    />
                </div>

                {/* Categories */}
                <div className="p-6 rounded-2xl bg-surface1 border border-surface2">
                    <h3 className="text-lg font-semibold text-text mb-6 flex items-center gap-2">
                        <Key size={20} className="text-cyan-400" />
                        Répartition par catégorie
                    </h3>
                    <div className="flex items-center gap-8">
                        <PieChart data={stats.categories} size={140} />
                        <div className="flex-1 space-y-2">
                            {stats.categories.map((cat) => (
                                <div key={cat.label} className="flex items-center gap-2">
                                    <div 
                                        className="w-3 h-3 rounded-full" 
                                        style={{ backgroundColor: cat.color }}
                                    />
                                    <span className="text-sm text-subtext0 flex-1">{cat.label}</span>
                                    <span className="text-sm font-medium text-text">{cat.value}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Devices & Security */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Devices */}
                <div className="p-6 rounded-2xl bg-surface1 border border-surface2">
                    <h3 className="text-lg font-semibold text-text mb-4 flex items-center gap-2">
                        <Globe size={20} className="text-cyan-400" />
                        Appareils
                    </h3>
                    <div className="space-y-4">
                        {stats.devices.map((device) => (
                            <div key={device.label} className="flex items-center gap-3">
                                {device.label === 'Desktop' && <Laptop size={20} className="text-subtext0" />}
                                {device.label === 'Mobile' && <Smartphone size={20} className="text-subtext0" />}
                                {device.label === 'Tablet' && <Tablet size={20} className="text-subtext0" />}
                                <div className="flex-1">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-sm text-text">{device.label}</span>
                                        <span className="text-sm text-subtext0">{device.value}%</span>
                                    </div>
                                    <div className="h-2 rounded-full bg-surface0 overflow-hidden">
                                        <div 
                                            className="h-full rounded-full transition-all duration-500"
                                            style={{ 
                                                width: `${device.value}%`,
                                                backgroundColor: device.color
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Password Strength */}
                <div className="p-6 rounded-2xl bg-surface1 border border-surface2">
                    <h3 className="text-lg font-semibold text-text mb-4 flex items-center gap-2">
                        <Shield size={20} className="text-cyan-400" />
                        Force des mots de passe
                    </h3>
                    <div className="space-y-4">
                        <div>
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-sm text-text flex items-center gap-2">
                                    <CheckCircle size={16} className="text-green" />
                                    Forts
                                </span>
                                <span className="text-sm font-medium text-text">{stats.passwordStrength.strong}</span>
                            </div>
                            <div className="h-2 rounded-full bg-surface0 overflow-hidden">
                                <div className="h-full w-3/4 rounded-full bg-green" />
                            </div>
                        </div>
                        <div>
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-sm text-text flex items-center gap-2">
                                    <AlertTriangle size={16} className="text-yellow" />
                                    Moyens
                                </span>
                                <span className="text-sm font-medium text-text">{stats.passwordStrength.medium}</span>
                            </div>
                            <div className="h-2 rounded-full bg-surface0 overflow-hidden">
                                <div className="h-full w-1/2 rounded-full bg-yellow" />
                            </div>
                        </div>
                        <div>
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-sm text-text flex items-center gap-2">
                                    <AlertTriangle size={16} className="text-red" />
                                    Faibles
                                </span>
                                <span className="text-sm font-medium text-text">{stats.passwordStrength.weak}</span>
                            </div>
                            <div className="h-2 rounded-full bg-surface0 overflow-hidden">
                                <div className="h-full w-1/4 rounded-full bg-red" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Recent Activity */}
                <div className="p-6 rounded-2xl bg-surface1 border border-surface2">
                    <h3 className="text-lg font-semibold text-text mb-4 flex items-center gap-2">
                        <Clock size={20} className="text-cyan-400" />
                        Activité récente
                    </h3>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                        {stats.recentActivity.map((activity, index) => (
                            <ActivityItem key={index} {...activity} />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
