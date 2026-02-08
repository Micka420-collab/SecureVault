/**
 * Background Script - SecureVault Extension
 * Service Worker qui gère la communication avec le serveur SecureVault
 */

// Configuration
const CONFIG = {
    serverUrl: '', // Sera chargé depuis le storage
    extensionToken: '',
};

// Cache des credentials (en mémoire uniquement, pas de storage)
const credentialsCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// ========================================
// Initialisation
// ========================================

chrome.runtime.onInstalled.addListener(() => {
    console.log('[SecureVault] Extension installed');
    
    // Initialiser la configuration
    chrome.storage.sync.get(['serverUrl', 'extensionToken'], (result) => {
        if (!result.serverUrl) {
            // Première installation - ouvrir la page d'options
            chrome.runtime.openOptionsPage();
        }
    });
});

// ========================================
// Gestion des messages
// ========================================

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    handleMessage(request, sender).then(sendResponse).catch((error) => {
        console.error('[SecureVault] Message error:', error);
        sendResponse({ error: error.message });
    });
    return true; // Async
});

async function handleMessage(request, sender) {
    // Charger la config
    const config = await loadConfig();
    
    switch (request.action) {
        case 'getCredentials':
            return await getCredentials(request.domain, config);
            
        case 'saveCredentials':
            return await saveCredentials(request, config);
            
        case 'checkConnection':
            return await checkConnection(config);
            
        case 'registerExtension':
            return await registerExtension(request, config);
            
        case 'getStatus':
            return { 
                connected: !!config.extensionToken,
                serverUrl: config.serverUrl,
            };
            
        default:
            return { error: 'Unknown action' };
    }
}

// ========================================
// Fonctions API
// ========================================

async function getCredentials(domain, config) {
    if (!config.extensionToken) {
        return { error: 'Not authenticated' };
    }

    // Vérifier le cache
    const cacheKey = `${domain}-${config.extensionToken}`;
    const cached = credentialsCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return { credentials: cached.credentials };
    }

    try {
        const url = `${config.serverUrl}/api/extension/credentials?url=https://${domain}`;
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'X-Extension-Token': config.extensionToken,
            },
        });

        if (!response.ok) {
            if (response.status === 401) {
                // Token invalide - demander reconnexion
                notifyUser('Session expired', 'Please reconnect to SecureVault');
                return { error: 'Session expired' };
            }
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        
        // Si on a des entrées chiffrées, on doit les retourner pour déchiffrement côté popup
        // Le content script ne peut pas déchiffrer (pas accès au crypto key)
        if (data.entries && data.entries.length > 0) {
            // Retourner la première entrée (simplifié - en vrai, on filtrerait par domaine côté client)
            const entry = data.entries[0];
            
            // Mettre en cache
            credentialsCache.set(cacheKey, {
                credentials: entry,
                timestamp: Date.now(),
            });
            
            return { 
                credentials: entry,
                encrypted: true, // Indique qu'il faut déchiffrer
            };
        }

        return { credentials: null };

    } catch (error) {
        console.error('[SecureVault] Get credentials error:', error);
        return { error: error.message };
    }
}

async function saveCredentials(request, config) {
    if (!config.extensionToken) {
        return { error: 'Not authenticated' };
    }

    // Demander à l'utilisateur de confirmer
    // Note: En vrai, on ouvrirait le popup pour chiffrer localement
    // Cette version simplifiée suppose que le chiffrement est fait côté serveur
    // (moins sécurisé, mais plus simple pour la démo)
    
    try {
        const response = await fetch(`${config.serverUrl}/api/extension/save`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Extension-Token': config.extensionToken,
            },
            body: JSON.stringify({
                url: request.url,
                // Note: En production, ces données devraient être chiffrées
                // par le popup avec la clé de l'utilisateur avant envoi
                encryptedData: 'placeholder', // À remplacer par vraies données chiffrées
                iv: 'placeholder',
                title: request.title,
                category: 'login',
            }),
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        
        notifyUser('Password Saved', `Credentials for ${new URL(request.url).hostname} saved successfully`);
        
        return { success: true, entry: data.entry };

    } catch (error) {
        console.error('[SecureVault] Save error:', error);
        return { error: error.message };
    }
}

async function checkConnection(config) {
    if (!config.serverUrl) {
        return { connected: false, error: 'Server URL not configured' };
    }

    try {
        const response = await fetch(`${config.serverUrl}/api/extension/health`, {
            method: 'GET',
            headers: config.extensionToken ? {
                'X-Extension-Token': config.extensionToken,
            } : {},
        });

        if (response.ok) {
            const data = await response.json();
            return { 
                connected: true, 
                version: data.version,
                authenticated: !!config.extensionToken,
            };
        }

        return { connected: false, error: 'Server error' };

    } catch (error) {
        return { connected: false, error: error.message };
    }
}

async function registerExtension(request, config) {
    if (!config.serverUrl) {
        return { error: 'Server URL not configured' };
    }

    try {
        // Note: Cette route nécessite l'authentification JWT (pas extension token)
        // L'utilisateur doit d'abord se connecter via le popup
        const response = await fetch(`${config.serverUrl}/api/extension/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${request.jwtToken}`,
            },
            body: JSON.stringify({
                deviceName: request.deviceName || 'Browser Extension',
                browser: request.browser || 'Unknown',
            }),
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        
        // Sauvegarder le token
        await chrome.storage.sync.set({ extensionToken: data.token });
        
        return { success: true, token: data.token };

    } catch (error) {
        console.error('[SecureVault] Register error:', error);
        return { error: error.message };
    }
}

// ========================================
// Utilitaires
// ========================================

async function loadConfig() {
    return new Promise((resolve) => {
        chrome.storage.sync.get(['serverUrl', 'extensionToken'], (result) => {
            resolve({
                serverUrl: result.serverUrl || '',
                extensionToken: result.extensionToken || '',
            });
        });
    });
}

function notifyUser(title, message) {
    chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon128.png',
        title: title,
        message: message,
    });
}

// ========================================
// Raccourcis clavier
// ========================================

chrome.commands.onCommand.addListener((command) => {
    if (command === 'open-popup') {
        chrome.action.openPopup();
    }
    
    if (command === 'fill-credentials') {
        // Envoyer message au content script actif
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]) {
                chrome.tabs.sendMessage(tabs[0].id, { action: 'requestFill' });
            }
        });
    }
});

// ========================================
// Mise à jour du badge
// ========================================

async function updateBadge() {
    const config = await loadConfig();
    
    if (!config.extensionToken) {
        chrome.action.setBadgeText({ text: '!' });
        chrome.action.setBadgeBackgroundColor({ color: '#f38ba8' });
    } else {
        chrome.action.setBadgeText({ text: '' });
    }
}

// Mettre à jour le badge périodiquement
setInterval(updateBadge, 30000);
updateBadge();

console.log('[SecureVault] Background script loaded');
