/**
 * Popup Script - SecureVault Extension
 * Interface utilisateur dans la popup de l'extension
 */

// État global
let currentTab = null;
let credentials = [];

// ========================================
// Initialisation
// ========================================

document.addEventListener('DOMContentLoaded', async () => {
    // Obtenir l'onglet actif
    [currentTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // Initialiser les événements
    initEventListeners();
    
    // Charger le statut
    await loadStatus();
});

function initEventListeners() {
    // Boutons
    document.getElementById('btn-setup').addEventListener('click', () => {
        chrome.runtime.openOptionsPage();
        window.close();
    });
    
    document.getElementById('btn-login').addEventListener('click', handleLogin);
    document.getElementById('btn-lock').addEventListener('click', handleLock);
    document.getElementById('btn-options').addEventListener('click', () => {
        chrome.runtime.openOptionsPage();
    });
    
    // Remplir automatiquement le champ server URL si configuré
    chrome.storage.sync.get(['serverUrl'], (result) => {
        if (result.serverUrl) {
            document.getElementById('server-url').value = result.serverUrl;
        }
    });
}

// ========================================
// Chargement du statut
// ========================================

async function loadStatus() {
    const status = await sendMessage({ action: 'getStatus' });
    
    if (!status.serverUrl) {
        showView('view-setup');
        updateStatus(false, 'Server not configured');
        return;
    }
    
    if (!status.connected) {
        showView('view-login');
        updateStatus(false, 'Not authenticated');
        document.getElementById('server-url').value = status.serverUrl;
        return;
    }
    
    // Connecté - charger les credentials
    showView('view-connected');
    updateStatus(true, 'Connected to SecureVault');
    await loadCredentials();
}

function showView(viewId) {
    document.querySelectorAll('[id^="view-"]').forEach(el => el.classList.add('hidden'));
    document.getElementById(viewId).classList.remove('hidden');
}

function updateStatus(connected, text) {
    const dot = document.getElementById('status-dot');
    const statusText = document.getElementById('status-text');
    
    if (connected) {
        dot.classList.remove('disconnected');
        dot.classList.add('connected');
    } else {
        dot.classList.remove('connected');
        dot.classList.add('disconnected');
    }
    
    statusText.textContent = text;
}

// ========================================
// Authentification
// ========================================

async function handleLogin() {
    const serverUrl = document.getElementById('server-url').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    
    if (!serverUrl || !email || !password) {
        alert('Please fill all fields');
        return;
    }
    
    // Sauvegarder le serveur
    await chrome.storage.sync.set({ serverUrl });
    
    try {
        // Étape 1: Login au backend pour obtenir JWT
        const loginResponse = await fetch(`${serverUrl}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });
        
        if (!loginResponse.ok) {
            const error = await loginResponse.json();
            alert(error.error || 'Login failed');
            return;
        }
        
        const { token } = await loginResponse.json();
        
        // Étape 2: Enregistrer l'extension
        const regResult = await sendMessage({
            action: 'registerExtension',
            jwtToken: token,
            deviceName: 'Chrome Extension',
            browser: navigator.userAgent,
        });
        
        if (regResult.error) {
            alert(regResult.error);
            return;
        }
        
        // Effacer le mot de passe
        document.getElementById('password').value = '';
        
        // Recharger
        await loadStatus();
        
    } catch (error) {
        console.error('Login error:', error);
        alert('Connection failed: ' + error.message);
    }
}

async function handleLock() {
    // Supprimer le token
    await chrome.storage.sync.remove(['extensionToken']);
    
    // Recharger
    await loadStatus();
}

// ========================================
// Gestion des credentials
// ========================================

async function loadCredentials() {
    if (!currentTab || !currentTab.url) return;
    
    const url = new URL(currentTab.url);
    const domain = url.hostname;
    
    try {
        const result = await sendMessage({ 
            action: 'getCredentials', 
            domain: domain 
        });
        
        if (result.error) {
            console.error('Failed to load credentials:', result.error);
            renderCredentials([]);
            return;
        }
        
        // En vrai, on aurait plusieurs credentials possibles
        // Pour la simplicité, on montre juste si on a des entrées ou pas
        if (result.credentials) {
            renderCredentials([result.credentials]);
        } else {
            renderCredentials([]);
        }
        
    } catch (error) {
        console.error('Load credentials error:', error);
        renderCredentials([]);
    }
}

function renderCredentials(creds) {
    const container = document.getElementById('credentials-list');
    
    if (creds.length === 0) {
        container.innerHTML = `
            <div class="message">
                <div class="message-icon">🔍</div>
                <p>No passwords found for this site</p>
            </div>
        `;
        return;
    }
    
    // Note: En production, les credentials seraient chiffrés
    // et on les déchiffrerait ici avec la clé dérivée du mot de passe maître
    container.innerHTML = creds.map((cred, index) => `
        <div class="credential-item" data-index="${index}">
            <div class="credential-icon">🔑</div>
            <div class="credential-info">
                <div class="credential-title">${escapeHtml(cred.title || 'Website Login')}</div>
                <div class="credential-username">${escapeHtml(cred.username || 'Click to fill')}</div>
            </div>
        </div>
    `).join('');
    
    // Ajouter les événements de clic
    container.querySelectorAll('.credential-item').forEach(item => {
        item.addEventListener('click', () => {
            const index = parseInt(item.dataset.index);
            fillCredential(creds[index]);
        });
    });
}

async function fillCredential(cred) {
    // Note: En production, on déchiffrerait ici avec la clé de l'utilisateur
    // Pour la démo, on simule
    
    // Envoyer au content script pour remplir le formulaire
    if (currentTab && currentTab.id) {
        await chrome.tabs.sendMessage(currentTab.id, {
            action: 'fillCredentials',
            // En vrai: données déchiffrées
            username: 'user@example.com', // Placeholder
            password: '********', // Placeholder
        });
    }
    
    window.close();
}

// ========================================
// Utilitaires
// ========================================

function sendMessage(message) {
    return new Promise((resolve) => {
        chrome.runtime.sendMessage(message, resolve);
    });
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
