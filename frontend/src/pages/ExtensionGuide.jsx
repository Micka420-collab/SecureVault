import React from 'react';
import { 
    Download, 
    Chrome, 
    Shield, 
    Key, 
    Zap, 
    Keyboard,
    AlertTriangle,
    CheckCircle,
    ExternalLink
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function ExtensionGuide() {
    return (
        <div className="page-container max-w-4xl mx-auto">
            <div className="text-center mb-12">
                <h1 className="text-4xl font-bold text-text mb-4">
                    Guide de l'Extension
                </h1>
                <p className="text-lg text-subtext0">
                    Tout ce que vous devez savoir sur l'extension SecureVault
                </p>
            </div>

            {/* Quick Download */}
            <div className="bg-gradient-to-r from-mauve/20 to-blue/20 rounded-2xl p-8 mb-12 text-center">
                <h2 className="text-2xl font-bold text-text mb-4">
                    Prêt à commencer ?
                </h2>
                <p className="text-subtext0 mb-6">
                    Téléchargez l'extension pour votre navigateur préféré
                </p>
                <Link to="/extension" className="btn btn-primary inline-flex items-center gap-2">
                    <Download className="w-5 h-5" />
                    Télécharger l'extension
                </Link>
            </div>

            {/* Installation Sections */}
            <div className="space-y-12">
                <section>
                    <h2 className="text-2xl font-bold text-text mb-6 flex items-center gap-3">
                        <Chrome className="w-6 h-6 text-mauve" />
                        Installation sur Chrome / Edge
                    </h2>
                    <div className="bg-surface0 rounded-xl p-6">
                        <ol className="space-y-4">
                            <li className="flex gap-4">
                                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-mauve text-crust font-bold flex items-center justify-center">1</span>
                                <div>
                                    <p className="text-text font-medium">Téléchargez le fichier .zip</p>
                                    <p className="text-subtext0 text-sm">Rendez-vous sur la page de téléchargement et choisissez Chrome/Edge</p>
                                </div>
                            </li>
                            <li className="flex gap-4">
                                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-mauve text-crust font-bold flex items-center justify-center">2</span>
                                <div>
                                    <p className="text-text font-medium">Extrayez le contenu</p>
                                    <p className="text-subtext0 text-sm">Décompressez le fichier .zip dans un dossier (ex: C:\SecureVault-Extension)</p>
                                </div>
                            </li>
                            <li className="flex gap-4">
                                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-mauve text-crust font-bold flex items-center justify-center">3</span>
                                <div>
                                    <p className="text-text font-medium">Ouvrez la page des extensions</p>
                                    <p className="text-subtext0 text-sm">Tapez <code className="bg-surface1 px-2 py-0.5 rounded">chrome://extensions</code> dans la barre d'adresse</p>
                                </div>
                            </li>
                            <li className="flex gap-4">
                                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-mauve text-crust font-bold flex items-center justify-center">4</span>
                                <div>
                                    <p className="text-text font-medium">Activez le mode développeur</p>
                                    <p className="text-subtext0 text-sm">Basculez l'interrupteur "Mode développeur" en haut à droite</p>
                                </div>
                            </li>
                            <li className="flex gap-4">
                                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-mauve text-crust font-bold flex items-center justify-center">5</span>
                                <div>
                                    <p className="text-text font-medium">Chargez l'extension</p>
                                    <p className="text-subtext0 text-sm">Cliquez sur "Charger l'extension non empaquetée" et sélectionnez le dossier extrait</p>
                                </div>
                            </li>
                        </ol>
                    </div>
                </section>

                <section>
                    <h2 className="text-2xl font-bold text-text mb-6 flex items-center gap-3">
                        <svg className="w-6 h-6 text-orange" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                        </svg>
                        Installation sur Firefox
                    </h2>
                    <div className="bg-surface0 rounded-xl p-6">
                        <ol className="space-y-4">
                            <li className="flex gap-4">
                                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-orange text-white font-bold flex items-center justify-center">1</span>
                                <div>
                                    <p className="text-text font-medium">Téléchargez le fichier .xpi</p>
                                    <p className="text-subtext0 text-sm">Sélectionnez Firefox sur la page de téléchargement</p>
                                </div>
                            </li>
                            <li className="flex gap-4">
                                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-orange text-white font-bold flex items-center justify-center">2</span>
                                <div>
                                    <p className="text-text font-medium">Ouvrez le gestionnaire d'extensions</p>
                                    <p className="text-subtext0 text-sm">Tapez <code className="bg-surface1 px-2 py-0.5 rounded">about:addons</code> dans la barre d'adresse</p>
                                </div>
                            </li>
                            <li className="flex gap-4">
                                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-orange text-white font-bold flex items-center justify-center">3</span>
                                <div>
                                    <p className="text-text font-medium">Installez depuis le fichier</p>
                                    <p className="text-subtext0 text-sm">Cliquez sur l'icône engrenage ⚙️ puis "Installer depuis un fichier"</p>
                                </div>
                            </li>
                            <li className="flex gap-4">
                                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-orange text-white font-bold flex items-center justify-center">4</span>
                                <div>
                                    <p className="text-text font-medium">Confirmez l'installation</p>
                                    <p className="text-subtext0 text-sm">Sélectionnez le fichier .xpi téléchargé et acceptez les permissions</p>
                                </div>
                            </li>
                        </ol>
                    </div>
                </section>

                {/* Configuration */}
                <section>
                    <h2 className="text-2xl font-bold text-text mb-6">Configuration</h2>
                    <div className="bg-surface0 rounded-xl p-6">
                        <div className="space-y-6">
                            <div>
                                <h3 className="font-semibold text-text mb-2">1. URL du serveur</h3>
                                <p className="text-subtext0 mb-3">
                                    Cliquez sur l'icône de l'extension → Paramètres, puis entrez l'URL de votre serveur SecureVault :
                                </p>
                                <code className="block bg-surface1 p-3 rounded-lg text-text">
                                    {window.location.origin}
                                </code>
                            </div>

                            <div>
                                <h3 className="font-semibold text-text mb-2">2. Authentification</h3>
                                <p className="text-subtext0">
                                    Cliquez sur l'extension et connectez-vous avec votre email et mot de passe maître. 
                                    Vos identifiants sont chiffrés localement et jamais transmis en clair.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Features */}
                <section>
                    <h2 className="text-2xl font-bold text-text mb-6">Fonctionnalités</h2>
                    <div className="grid md:grid-cols-2 gap-4">
                        <div className="bg-surface0 rounded-xl p-5 flex gap-4">
                            <Shield className="w-8 h-8 text-mauve flex-shrink-0" />
                            <div>
                                <h3 className="font-semibold text-text">Remplissage automatique</h3>
                                <p className="text-subtext0 text-sm">
                                    Détecte automatiquement les formulaires de connexion et propose de les remplir
                                </p>
                            </div>
                        </div>

                        <div className="bg-surface0 rounded-xl p-5 flex gap-4">
                            <Key className="w-8 h-8 text-mauve flex-shrink-0" />
                            <div>
                                <h3 className="font-semibold text-text">Chiffrement local</h3>
                                <p className="text-subtext0 text-sm">
                                    Vos mots de passe sont déchiffrés uniquement dans votre navigateur
                                </p>
                            </div>
                        </div>

                        <div className="bg-surface0 rounded-xl p-5 flex gap-4">
                            <Zap className="w-8 h-8 text-mauve flex-shrink-0" />
                            <div>
                                <h3 className="font-semibold text-text">Générateur de mots de passe</h3>
                                <p className="text-subtext0 text-sm">
                                    Créez des mots de passe forts en un clic depuis le menu contextuel
                                </p>
                            </div>
                        </div>

                        <div className="bg-surface0 rounded-xl p-5 flex gap-4">
                            <Keyboard className="w-8 h-8 text-mauve flex-shrink-0" />
                            <div>
                                <h3 className="font-semibold text-text">Raccourcis clavier</h3>
                                <p className="text-subtext0 text-sm">
                                    Ctrl+Shift+L pour ouvrir, Ctrl+Shift+F pour remplir le formulaire
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Troubleshooting */}
                <section>
                    <h2 className="text-2xl font-bold text-text mb-6 flex items-center gap-3">
                        <AlertTriangle className="w-6 h-6 text-yellow" />
                        Résolution de problèmes
                    </h2>
                    <div className="bg-surface0 rounded-xl p-6 space-y-4">
                        <details className="group">
                            <summary className="flex items-center justify-between cursor-pointer text-text font-medium hover:text-mauve transition-colors">
                                L'extension ne détecte pas les formulaires
                                <span className="transition-transform group-open:rotate-180">▼</span>
                            </summary>
                            <p className="mt-3 text-subtext0 pl-4 border-l-2 border-surface1">
                                Certains sites utilisent des formulaires non standard. Essayez de rafraîchir la page 
                                ou utilisez le raccourci Ctrl+Shift+F pour forcer la détection.
                            </p>
                        </details>

                        <details className="group">
                            <summary className="flex items-center justify-between cursor-pointer text-text font-medium hover:text-mauve transition-colors">
                                "Non connecté" alors que je suis connecté sur le site
                                <span className="transition-transform group-open:rotate-180">▼</span>
                            </summary>
                            <p className="mt-3 text-subtext0 pl-4 border-l-2 border-surface1">
                                Vérifiez que l'URL du serveur dans les paramètres de l'extension correspond exactement 
                                à l'URL de votre SecureVault (avec http/https et le port si nécessaire).
                            </p>
                        </details>

                        <details className="group">
                            <summary className="flex items-center justify-between cursor-pointer text-text font-medium hover:text-mauve transition-colors">
                                Les mots de passe ne se remplissent pas
                                <span className="transition-transform group-open:rotate-180">▼</span>
                            </summary>
                            <p className="mt-3 text-subtext0 pl-4 border-l-2 border-surface1">
                                Assurez-vous d'avoir des identifiants enregistrés pour ce site dans votre coffre-fort. 
                                L'extension vérifie strictement la correspondance du domaine pour éviter le phishing.
                            </p>
                        </details>
                    </div>
                </section>

                {/* Security Note */}
                <section>
                    <h2 className="text-2xl font-bold text-text mb-6 flex items-center gap-3">
                        <CheckCircle className="w-6 h-6 text-green" />
                        Sécurité
                    </h2>
                    <div className="bg-green/10 border border-green/30 rounded-xl p-6">
                        <p className="text-text mb-4">
                            L'extension SecureVault est conçue avec la sécurité comme priorité absolue :
                        </p>
                        <ul className="space-y-2 text-subtext0">
                            <li className="flex items-start gap-2">
                                <span className="text-green">✓</span>
                                <span>Vos mots de passe sont chiffrés avec AES-256-GCM</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-green">✓</span>
                                <span>Le déchiffrement se fait uniquement dans votre navigateur</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-green">✓</span>
                                <span>Le serveur ne voit jamais vos mots de passe en clair</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-green">✓</span>
                                <span>Vérification stricte des domaines pour éviter le phishing</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-green">✓</span>
                                <span>Code open source auditable</span>
                            </li>
                        </ul>
                    </div>
                </section>
            </div>

            {/* Back to download */}
            <div className="mt-12 text-center">
                <Link to="/extension" className="btn btn-primary inline-flex items-center gap-2">
                    <Download className="w-5 h-5" />
                    Télécharger l'extension
                </Link>
            </div>
        </div>
    );
}
