import React, { useState, useEffect } from 'react';
import {
    Download,
    Chrome,
    Globe,
    Check,
    Copy,
    ExternalLink,
    Shield,
    Key,
    Zap,
    Keyboard,
    AlertCircle,
    ChevronDown,
    ChevronUp,
    FileArchive,
    Package,
} from 'lucide-react';
import { extensionDownloadService, browserDetection } from '../services/extensionDownload';
import toast from 'react-hot-toast';

const BROWSER_INFO = {
    chrome: {
        name: 'Google Chrome',
        icon: Chrome,
        color: '#4285F4',
        minVersion: '88',
        installSteps: [
            'Téléchargez le fichier .zip',
            'Extrayez le contenu dans un dossier',
            'Ouvrez chrome://extensions/ dans un nouvel onglet',
            'Activez "Mode développeur" en haut à droite',
            'Cliquez sur "Charger l\'extension non empaquetée"',
            'Sélectionnez le dossier extrait',
        ],
    },
    firefox: {
        name: 'Mozilla Firefox',
        icon: Globe,
        color: '#FF7139',
        minVersion: '109',
        installSteps: [
            'Téléchargez le fichier .xpi',
            'Ouvrez about:addons dans un nouvel onglet',
            'Cliquez sur l\'icône engrenage ⚙️',
            'Sélectionnez "Installer depuis un fichier"',
            'Choisissez le fichier .xpi téléchargé',
            'Confirmez l\'installation',
        ],
    },
    edge: {
        name: 'Microsoft Edge',
        icon: Globe,
        color: '#0078D7',
        minVersion: '88',
        installSteps: [
            'Téléchargez le fichier .zip (même que Chrome)',
            'Extrayez le contenu dans un dossier',
            'Ouvrez edge://extensions/ dans un nouvel onglet',
            'Activez "Mode développeur" en bas à gauche',
            'Cliquez sur "Charger l\'extension non empaquetée"',
            'Sélectionnez le dossier extrait',
        ],
    },
};

const FEATURES = [
    {
        icon: Shield,
        title: 'Remplissage automatique',
        description: 'Détecte et remplit automatiquement les formulaires de connexion',
    },
    {
        icon: Key,
        title: 'Chiffrement de bout en bout',
        description: 'Vos identifiants restent chiffrés, même dans l\'extension',
    },
    {
        icon: Zap,
        title: 'Générateur de mots de passe',
        description: 'Créez des mots de passe forts en un clic depuis le navigateur',
    },
    {
        icon: Keyboard,
        title: 'Raccourcis clavier',
        description: 'Ctrl+Shift+L pour ouvrir, Ctrl+Shift+F pour remplir',
    },
];

export default function ExtensionDownload() {
    const [releases, setReleases] = useState(null);
    const [loading, setLoading] = useState(true);
    const [downloading, setDownloading] = useState(null);
    const [currentBrowser, setCurrentBrowser] = useState('unknown');
    const [expandedBrowser, setExpandedBrowser] = useState(null);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        const browser = browserDetection.detect();
        setCurrentBrowser(browser);
        
        // Auto-expand current browser
        if (browserDetection.isSupported(browser)) {
            setExpandedBrowser(browser);
        }
        
        fetchReleases();
    }, []);

    const fetchReleases = async () => {
        try {
            const data = await extensionDownloadService.getReleases();
            setReleases(data);
        } catch (error) {
            console.error('Failed to fetch releases:', error);
            toast.error('Impossible de récupérer les informations de l\'extension');
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = async (pkg) => {
        setDownloading(pkg.browser);
        
        try {
            await extensionDownloadService.download(pkg.filename, pkg.browser);
            toast.success(`Téléchargement de ${pkg.browser} démarré !`);
        } catch (error) {
            console.error('Download failed:', error);
            toast.error('Échec du téléchargement');
        } finally {
            setDownloading(null);
        }
    };

    const getPackageForBrowser = (browser) => {
        if (!releases?.packages) return null;
        return releases.packages.find(p => p.browser === browser);
    };

    const copyServerUrl = () => {
        const url = window.location.origin;
        navigator.clipboard.writeText(url);
        setCopied(true);
        toast.success('URL copiée !');
        setTimeout(() => setCopied(false), 2000);
    };

    const isSupported = browserDetection.isSupported(currentBrowser);

    if (loading) {
        return (
            <div className="page-container flex items-center justify-center min-h-[60vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-mauve"></div>
            </div>
        );
    }

    return (
        <div className="page-container">
            {/* Header */}
            <div className="text-center mb-12">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-mauve to-blue rounded-2xl mb-6">
                    <Download className="w-10 h-10 text-white" />
                </div>
                <h1 className="text-4xl font-bold text-text mb-4">
                    Extension SecureVault
                </h1>
                <p className="text-lg text-subtext0 max-w-2xl mx-auto">
                    Auto-remplissez vos mots de passe directement depuis votre navigateur.
                    Vos identifiants restent chiffrés de bout en bout.
                </p>
            </div>

            {/* Browser Detection Banner */}
            {isSupported && (
                <div 
                    className="rounded-2xl p-6 mb-8"
                    style={{ 
                        background: `${BROWSER_INFO[currentBrowser].color}15`,
                        border: `2px solid ${BROWSER_INFO[currentBrowser].color}30`,
                    }}
                >
                    <div className="flex items-center gap-4">
                        <div 
                            className="w-14 h-14 rounded-xl flex items-center justify-center"
                            style={{ background: BROWSER_INFO[currentBrowser].color }}
                        >
                            {React.createElement(BROWSER_INFO[currentBrowser].icon, {
                                className: 'w-7 h-7 text-white'
                            })}
                        </div>
                        <div className="flex-1">
                            <h3 className="text-xl font-semibold text-text">
                                Nous avons détecté {BROWSER_INFO[currentBrowser].name}
                            </h3>
                            <p className="text-subtext0">
                                Téléchargez l'extension optimisée pour votre navigateur
                            </p>
                        </div>
                        {getPackageForBrowser(currentBrowser) && (
                            <button
                                onClick={() => handleDownload(getPackageForBrowser(currentBrowser))}
                                disabled={downloading === currentBrowser}
                                className="btn btn-primary flex items-center gap-2"
                            >
                                {downloading === currentBrowser ? (
                                    <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
                                        Téléchargement...
                                    </>
                                ) : (
                                    <>
                                        <Download className="w-4 h-4" />
                                        Télécharger
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Download Cards */}
            <div className="grid md:grid-cols-3 gap-6 mb-12">
                {['chrome', 'firefox', 'edge'].map((browser) => {
                    const info = BROWSER_INFO[browser];
                    const pkg = getPackageForBrowser(browser);
                    const isCurrent = currentBrowser === browser;
                    const isExpanded = expandedBrowser === browser;
                    const Icon = info.icon;

                    return (
                        <div
                            key={browser}
                            className={`rounded-2xl border-2 transition-all ${
                                isCurrent 
                                    ? 'border-mauve bg-mauve/5' 
                                    : 'border-surface0 bg-surface0/50 hover:border-surface1'
                            }`}
                        >
                            <div className="p-6">
                                <div className="flex items-center gap-4 mb-4">
                                    <div 
                                        className="w-12 h-12 rounded-xl flex items-center justify-center"
                                        style={{ 
                                            background: info.color,
                                            opacity: pkg ? 1 : 0.5 
                                        }}
                                    >
                                        <Icon className="w-6 h-6 text-white" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-text">
                                            {info.name}
                                        </h3>
                                        <p className="text-sm text-subtext0">
                                            v{releases?.version || '1.0.0'} • Min. {info.minVersion}+
                                        </p>
                                    </div>
                                </div>

                                {pkg ? (
                                    <>
                                        <div className="flex items-center justify-between text-sm text-subtext0 mb-4">
                                            <span>{pkg.sizeFormatted}</span>
                                            <span>Mis à jour {new Date(pkg.updatedAt).toLocaleDateString('fr-FR')}</span>
                                        </div>

                                        <button
                                            onClick={() => handleDownload(pkg)}
                                            disabled={downloading === browser}
                                            className="w-full btn btn-primary flex items-center justify-center gap-2 mb-3"
                                        >
                                            {downloading === browser ? (
                                                <>
                                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
                                                    Téléchargement...
                                                </>
                                            ) : (
                                                <>
                                                    <Download className="w-4 h-4" />
                                                    Télécharger
                                                </>
                                            )}
                                        </button>

                                        <button
                                            onClick={() => setExpandedBrowser(isExpanded ? null : browser)}
                                            className="w-full btn btn-ghost text-sm flex items-center justify-center gap-1"
                                        >
                                            {isExpanded ? 'Masquer' : 'Voir'} l'installation
                                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                        </button>
                                    </>
                                ) : (
                                    <div className="text-center py-4">
                                        <AlertCircle className="w-8 h-8 text-subtext0 mx-auto mb-2" />
                                        <p className="text-sm text-subtext0">
                                            Package non disponible
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Installation Instructions */}
                            {isExpanded && pkg && (
                                <div className="border-t border-surface1 px-6 py-4">
                                    <h4 className="font-medium text-text mb-3">
                                        Guide d'installation
                                    </h4>
                                    <ol className="space-y-2 text-sm text-subtext0">
                                        {info.installSteps.map((step, index) => (
                                            <li key={index} className="flex gap-3">
                                                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-surface1 text-text text-xs flex items-center justify-center font-medium">
                                                    {index + 1}
                                                </span>
                                                <span>{step}</span>
                                            </li>
                                        ))}
                                    </ol>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Configuration Section */}
            <div className="bg-surface0 rounded-2xl p-8 mb-12">
                <h2 className="text-2xl font-bold text-text mb-6">
                    Configuration de l'extension
                </h2>
                
                <div className="grid md:grid-cols-2 gap-8">
                    <div>
                        <h3 className="font-semibold text-text mb-3">
                            1. URL du serveur
                        </h3>
                        <p className="text-subtext0 mb-4">
                            Configurez l'URL de votre serveur SecureVault dans les options de l'extension.
                        </p>
                        <div className="flex gap-2">
                            <code className="flex-1 bg-surface1 px-4 py-2 rounded-lg text-text text-sm break-all">
                                {window.location.origin}
                            </code>
                            <button
                                onClick={copyServerUrl}
                                className="btn btn-secondary p-2"
                                title="Copier l'URL"
                            >
                                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>

                    <div>
                        <h3 className="font-semibold text-text mb-3">
                            2. Authentification
                        </h3>
                        <p className="text-subtext0 mb-4">
                            Connectez-vous avec votre email et mot de passe maître. Une session sécurisée sera créée.
                        </p>
                        <div className="flex items-center gap-2 text-sm text-subtext0">
                            <Shield className="w-4 h-4 text-green" />
                            <span>Vos identifiants ne quittent jamais votre navigateur</span>
                        </div>
                    </div>
                </div>

                <div className="mt-6 p-4 bg-yellow/10 border border-yellow/30 rounded-lg">
                    <div className="flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-yellow flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="text-text font-medium">Important</p>
                            <p className="text-subtext0 text-sm">
                                L'extension nécessite que votre serveur SecureVault soit accessible depuis votre navigateur. 
                                Utilisez Tailscale pour un accès sécurisé depuis n'importe où.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Features Grid */}
            <div className="mb-12">
                <h2 className="text-2xl font-bold text-text mb-6 text-center">
                    Fonctionnalités
                </h2>
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {FEATURES.map((feature) => (
                        <div 
                            key={feature.title}
                            className="bg-surface0 rounded-xl p-6 hover:bg-surface1 transition-colors"
                        >
                            <div className="w-12 h-12 bg-mauve/20 rounded-xl flex items-center justify-center mb-4">
                                <feature.icon className="w-6 h-6 text-mauve" />
                            </div>
                            <h3 className="font-semibold text-text mb-2">
                                {feature.title}
                            </h3>
                            <p className="text-sm text-subtext0">
                                {feature.description}
                            </p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Resources */}
            <div className="text-center">
                <h2 className="text-xl font-bold text-text mb-4">
                    Ressources supplémentaires
                </h2>
                <div className="flex flex-wrap justify-center gap-4">
                    <a 
                        href="/extension-guide"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-surface0 rounded-lg text-text hover:bg-surface1 transition-colors"
                    >
                        <FileArchive className="w-4 h-4" />
                        Guide complet
                    </a>
                    <a 
                        href="https://github.com/yourusername/securevault/tree/main/browser-extension"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-surface0 rounded-lg text-text hover:bg-surface1 transition-colors"
                    >
                        <Package className="w-4 h-4" />
                        Code source
                        <ExternalLink className="w-3 h-3" />
                    </a>
                </div>
            </div>

            {/* Not Available Modal */}
            {releases && !releases.available && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-surface0 rounded-2xl p-8 max-w-md mx-4">
                        <div className="w-16 h-16 bg-yellow/20 rounded-full flex items-center justify-center mx-auto mb-4">
                            <AlertCircle className="w-8 h-8 text-yellow" />
                        </div>
                        <h2 className="text-xl font-bold text-text text-center mb-2">
                            Extensions non disponibles
                        </h2>
                        <p className="text-subtext0 text-center mb-6">
                            Les packages d'extension n'ont pas encore été générés.
                            Contactez l'administrateur ou compilez-les manuellement.
                        </p>
                        <div className="bg-surface1 rounded-lg p-4 mb-6">
                            <code className="text-sm text-text block">
                                cd browser-extension<br />
                                npm run build:extension
                            </code>
                        </div>
                        <button
                            onClick={() => window.location.reload()}
                            className="w-full btn btn-primary"
                        >
                            Réessayer
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
