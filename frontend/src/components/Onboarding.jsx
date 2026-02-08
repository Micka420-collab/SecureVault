/**
 * Onboarding Component - Tutoriel interactif pour nouveaux utilisateurs
 * Affiché automatiquement à la première connexion
 */

import { useState, useEffect, useCallback } from 'react';
import { 
    X, 
    ChevronRight, 
    ChevronLeft, 
    Shield, 
    Key, 
    Mail, 
    FileText, 
    AlertTriangle,
    CheckCircle,
    Lock,
    Sparkles
} from 'lucide-react';
import { useAuthStore } from '../stores/authStore';

const steps = [
    {
        id: 'welcome',
        title: 'Bienvenue dans SecureVault 🔐 by Nextendo x Micka Delcato',
        description: 'Votre coffre-fort numérique sécurisé. Laissez-nous vous présenter les fonctionnalités essentielles.',
        icon: Sparkles,
        color: 'text-yellow-400',
        bgColor: 'bg-yellow-400/10',
        position: 'center',
    },
    {
        id: 'vault',
        title: 'Coffre-Fort Sécurisé',
        description: 'Stockez tous vos mots de passe en toute sécurité. Chiffrement AES-256 de bout en bout. Vos données sont irrécupérables sans votre mot de passe maître.',
        icon: Key,
        color: 'text-blue-400',
        bgColor: 'bg-blue-400/10',
        target: '[data-tour="vault"]',
        position: 'right',
    },
    {
        id: 'aliases',
        title: 'Alias E-mail',
        description: 'Protégez votre identité avec des adresses e-mail jetables. Recevez vos mails sans révéler votre vraie adresse.',
        icon: Mail,
        color: 'text-green-400',
        bgColor: 'bg-green-400/10',
        target: '[data-tour="aliases"]',
        position: 'right',
    },
    {
        id: 'documents',
        title: 'Documents Sécurisés',
        description: 'Stockez et visionnez vos documents sensibles (PDF, vidéos, images) chiffrés. Limite de 500MB par fichier.',
        icon: FileText,
        color: 'text-purple-400',
        bgColor: 'bg-purple-400/10',
        target: '[data-tour="documents"]',
        position: 'right',
    },
    {
        id: 'emergency',
        title: 'Partage d\'Urgence',
        description: 'Désignez des contacts de confiance qui pourront accéder à votre coffre en cas d\'urgence (coma, décès, perte de mot de passe).',
        icon: AlertTriangle,
        color: 'text-orange-400',
        bgColor: 'bg-orange-400/10',
        target: '[data-tour="security"]',
        position: 'right',
    },
    {
        id: 'security',
        title: 'Score de Sécurité',
        description: 'Suivez votre niveau de sécurité et recevez des recommandations pour renforcer la protection de vos comptes.',
        icon: Shield,
        color: 'text-cyan-400',
        bgColor: 'bg-cyan-400/10',
        target: '[data-tour="security"]',
        position: 'right',
    },
    {
        id: 'master-password',
        title: '⚠️ Important : Mot de passe maître',
        description: 'Votre mot de passe maître n\'est JAMAIS stocké sur nos serveurs. Si vous le perdez, vos données sont définitivement perdues. Conservez-le précieusement !',
        icon: Lock,
        color: 'text-red-400',
        bgColor: 'bg-red-400/10',
        position: 'center',
        isWarning: true,
    },
    {
        id: 'complete',
        title: 'Vous êtes prêt ! 🎉',
        description: 'Votre coffre-fort est configuré. Commencez par ajouter votre premier mot de passe dans la section Coffre-Fort.',
        icon: CheckCircle,
        color: 'text-green-400',
        bgColor: 'bg-green-400/10',
        position: 'center',
    },
];

export default function Onboarding() {
    const [isVisible, setIsVisible] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const [targetRect, setTargetRect] = useState(null);
    const [isClosing, setIsClosing] = useState(false);
    const { user, markOnboardingSeen } = useAuthStore();

    // Vérifier si c'est la première connexion
    useEffect(() => {
        if (user && !user.hasSeenOnboarding) {
            // Petit délai pour laisser l'interface se charger
            const timer = setTimeout(() => {
                setIsVisible(true);
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [user]);

    // Mettre à jour la position de la cible
    useEffect(() => {
        const step = steps[currentStep];
        if (step.target && isVisible) {
            const element = document.querySelector(step.target);
            if (element) {
                const rect = element.getBoundingClientRect();
                setTargetRect(rect);
                // Scroll vers l'élément
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            } else {
                setTargetRect(null);
            }
        } else {
            setTargetRect(null);
        }
    }, [currentStep, isVisible]);

    const handleClose = useCallback(async () => {
        setIsClosing(true);
        // Animation de fermeture
        setTimeout(async () => {
            setIsVisible(false);
            await markOnboardingSeen();
        }, 300);
    }, [markOnboardingSeen]);

    const handleNext = useCallback(() => {
        if (currentStep < steps.length - 1) {
            setCurrentStep(prev => prev + 1);
        } else {
            handleClose();
        }
    }, [currentStep, handleClose]);

    const handlePrev = useCallback(() => {
        if (currentStep > 0) {
            setCurrentStep(prev => prev - 1);
        }
    }, [currentStep]);

    const handleSkip = useCallback(() => {
        handleClose();
    }, [handleClose]);

    if (!isVisible || !user) return null;

    const step = steps[currentStep];
    const Icon = step.icon;
    const isFirstStep = currentStep === 0;
    const isLastStep = currentStep === steps.length - 1;

    // Calculer la position de la bulle
    const getBubblePosition = () => {
        if (step.position === 'center' || !targetRect) {
            return {
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
            };
        }

        const bubbleWidth = 400;
        const bubbleHeight = 300;
        const offset = 20;

        let top = targetRect.top + targetRect.height / 2 - bubbleHeight / 2;
        let left = targetRect.right + offset;

        // Ajuster si hors écran à droite
        if (left + bubbleWidth > window.innerWidth) {
            left = targetRect.left - bubbleWidth - offset;
        }

        // Ajuster si hors écran en bas
        if (top + bubbleHeight > window.innerHeight) {
            top = window.innerHeight - bubbleHeight - 20;
        }

        // Minimum top
        if (top < 20) top = 20;

        return { top: `${top}px`, left: `${left}px` };
    };

    const bubblePosition = getBubblePosition();

    return (
        <div className={`fixed inset-0 z-50 transition-opacity duration-300 ${isClosing ? 'opacity-0' : 'opacity-100'}`}>
            {/* Overlay sombre */}
            <div 
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={handleClose}
            />

            {/* Highlight de la cible */}
            {targetRect && step.target && (
                <div
                    className="absolute rounded-lg ring-4 ring-cyan-400/50 animate-pulse"
                    style={{
                        top: targetRect.top - 4,
                        left: targetRect.left - 4,
                        width: targetRect.width + 8,
                        height: targetRect.height + 8,
                        boxShadow: '0 0 30px rgba(34, 211, 238, 0.3)',
                    }}
                />
            )}

            {/* Bulle du tutoriel */}
            <div
                className={`absolute w-full max-w-md transition-all duration-500 ${isClosing ? 'scale-95 opacity-0' : 'scale-100 opacity-100'}`}
                style={bubblePosition}
            >
                <div className={`
                    relative overflow-hidden rounded-2xl border shadow-2xl
                    ${step.isWarning 
                        ? 'bg-surface1/95 border-red-400/30' 
                        : 'bg-surface1/95 border-surface2'
                    }
                    backdrop-blur-xl
                `}>
                    {/* Barre de progression */}
                    <div className="absolute top-0 left-0 right-0 h-1 bg-surface2">
                        <div
                            className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 transition-all duration-500"
                            style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
                        />
                    </div>

                    {/* Bouton fermer */}
                    <button
                        onClick={handleClose}
                        className="absolute top-4 right-4 p-2 rounded-full text-subtext0 hover:text-text hover:bg-surface2 transition-colors"
                        title="Fermer le tutoriel"
                    >
                        <X size={20} />
                    </button>

                    {/* Contenu */}
                    <div className="p-8">
                        {/* Icône */}
                        <div className={`
                            w-16 h-16 rounded-2xl flex items-center justify-center mb-6
                            ${step.bgColor}
                        `}>
                            <Icon className={`w-8 h-8 ${step.color}`} />
                        </div>

                        {/* Titre */}
                        <h3 className={`text-2xl font-bold mb-3 ${step.isWarning ? 'text-red-400' : 'text-text'}`}>
                            {step.title}
                        </h3>

                        {/* Description */}
                        <p className="text-subtext1 leading-relaxed mb-8">
                            {step.description}
                        </p>

                        {/* Navigation */}
                        <div className="flex items-center justify-between">
                            {/* Indicateurs de progression */}
                            <div className="flex items-center gap-2">
                                {steps.map((_, index) => (
                                    <button
                                        key={index}
                                        onClick={() => setCurrentStep(index)}
                                        className={`
                                            w-2 h-2 rounded-full transition-all duration-300
                                            ${index === currentStep 
                                                ? 'w-6 bg-cyan-400' 
                                                : index < currentStep 
                                                    ? 'bg-cyan-400/50' 
                                                    : 'bg-surface2'
                                            }
                                        `}
                                    />
                                ))}
                            </div>

                            {/* Boutons navigation */}
                            <div className="flex items-center gap-3">
                                {!isFirstStep && (
                                    <button
                                        onClick={handlePrev}
                                        className="p-2 rounded-xl text-subtext0 hover:text-text hover:bg-surface2 transition-colors"
                                    >
                                        <ChevronLeft size={20} />
                                    </button>
                                )}

                                {!isLastStep && (
                                    <button
                                        onClick={handleSkip}
                                        className="px-4 py-2 text-sm text-subtext0 hover:text-text transition-colors"
                                    >
                                        Passer
                                    </button>
                                )}

                                <button
                                    onClick={handleNext}
                                    className={`
                                        flex items-center gap-2 px-6 py-2.5 rounded-xl font-medium transition-all
                                        ${step.isWarning
                                            ? 'bg-red-400 hover:bg-red-500 text-surface0'
                                            : 'bg-cyan-400 hover:bg-cyan-500 text-surface0'
                                        }
                                    `}
                                >
                                    {isLastStep ? 'Terminer' : 'Suivant'}
                                    {!isLastStep && <ChevronRight size={18} />}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Décoration */}
                    <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-gradient-to-br from-cyan-400/10 to-transparent rounded-full blur-3xl pointer-events-none" />
                </div>
            </div>

            {/* Flèche pointant vers la cible */}
            {targetRect && step.target && step.position !== 'center' && (
                <div
                    className="absolute w-4 h-4 bg-surface1 border-l border-t border-surface2 rotate-45"
                    style={{
                        top: targetRect.top + targetRect.height / 2 - 8,
                        left: targetRect.right + 12,
                    }}
                />
            )}
        </div>
    );
}
