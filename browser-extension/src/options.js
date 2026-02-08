/**
 * Options Script - SecureVault Extension
 * Page de configuration de l'extension
 */

// ========================================
// Initialisation
// ========================================

document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    initSettings();
    loadSavedSettings();
    checkConnection();
});

// ========================================
// Navigation
// ========================================

function initNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const pages = document.querySelectorAll('.page');
    
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const pageId = item.dataset.page;
            
            // Mettre à jour la navigation active
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');
            
            // Afficher la page correspondante
            pages.forEach(page => page.classList.add('hidden'));
            document.getElementById(`page-${pageId}`).classList.remove('hidden');
        });
    });
}

// ========================================
// Paramètres
// ========================================

function initSettings() {
    // Sauvegarde du serveur
    document.getElementById('btn-save-server').addEventListener('click', saveServerSettings);
    
    // Clear data
    document.getElementById('btn-clear').addEventListener('click', clearSettings);
    document.getElementById('btn-clear-all').addEventListener('click', clearAllData);
    
    // Lock now
    document.getElementById('btn-lock-now').addEventListener('click', lockNow);
    
    // Toggles
    initToggle('toggle-autofill', 'autoFill');
    initToggle('toggle-save', 'showSavePrompt');
    initToggle('toggle-context', 'showContextMenu');
    initToggle('toggle-notify', 'showNotifications');
}

function initToggle(id, settingKey) {
    const toggle = document.getElementById(id);
    if (!toggle) return;
    
    toggle.addEventListener('click', async () => {
        const isActive = toggle.classList.contains('active');
        
        if (isActive) {
            toggle.classList.remove('active');
        } else {
            toggle.classList.add('active');
        }
        
        // Sauvegarder
        await chrome.storage.sync.set({ [settingKey]: !isActive });
        
        // Mettre à jour le context menu si nécessaire
        if (settingKey === 'showContextMenu') {
            updateContextMenu(!isActive);
        }
    });
}

async function loadSavedSettings() {
    const settings = await chrome.storage.sync.get([
        'serverUrl',
        'extensionToken',
        'autoFill',
        'showSavePrompt',
        'showContextMenu',
        'showNotifications',
    ]);
    
    // Champs texte
    if (settings.serverUrl) {
        document.getElementById('server-url').value = settings.serverUrl;
    }
    if (settings.extensionToken) {
        document.getElementById('extension-token').value = 
            settings.extensionToken.substring(0, 20) + '...';
    }
    
    // Toggles
    updateToggle('toggle-autofill', settings.autoFill !== false); // default true
    updateToggle('toggle-save', settings.showSavePrompt !== false); // default true
    updateToggle('toggle-context', settings.showContextMenu === true); // default false
    updateToggle('toggle-notify', settings.showNotifications === true); // default false
}

function updateToggle(id, active) {
    const toggle = document.getElementById(id);
    if (!toggle) return;
    
    if (active) {
        toggle.classList.add('active');
    } else {
        toggle.classList.remove('active');
    }
}

// ========================================
// Gestion du serveur
// ========================================

async function saveServerSettings() {
    const serverUrl = document.getElementById('server-url').value.trim();
    
    if (!serverUrl) {
        alert('Please enter a server URL');
        return;
    }
    
    // Valider l'URL
    try {
        new URL(serverUrl);
    } catch {
        alert('Invalid URL format');
        return;
    }
    
    // Sauvegarder
    await chrome.storage.sync.set({ serverUrl });
    
    // Tester la connexion
    await checkConnection();
}

async function checkConnection() {
    const statusCard = document.getElementById('connection-status');
    const serverUrl = (await chrome.storage.sync.get(['serverUrl'])).serverUrl;
    
    if (!serverUrl) {
        updateStatusCard('error', 'Not configured', 'Please enter your SecureVault server URL');
        return;
    }
    
    updateStatusCard('pending', 'Checking...', 'Testing connection to your server');
    
    try {
        const result = await sendMessage({ action: 'checkConnection' });
        
        if (result.connected) {
            const authStatus = result.authenticated ? 'Authenticated' : 'Not authenticated';
            updateStatusCard('success', 'Connected', 
                `Server v${result.version || 'unknown'} - ${authStatus}`);
        } else {
            updateStatusCard('error', 'Connection failed', result.error || 'Could not reach server');
        }
    } catch (error) {
        updateStatusCard('error', 'Error', error.message);
    }
}

function updateStatusCard(type, title, message) {
    const statusCard = document.getElementById('connection-status');
    const icon = statusCard.querySelector('.status-icon');
    const titleEl = statusCard.querySelector('.status-info h4');
    const messageEl = statusCard.querySelector('.status-info p');
    
    // Icône
    icon.className = 'status-icon ' + type;
    icon.textContent = type === 'success' ? '✅' : type === 'error' ? '❌' : '⏳';
    
    // Texte
    titleEl.textContent = title;
    messageEl.textContent = message;
}

// ========================================
// Actions
// ========================================

async function clearSettings() {
    if (!confirm('Clear server URL? You will need to reconfigure the extension.')) {
        return;
    }
    
    await chrome.storage.sync.remove(['serverUrl']);
    document.getElementById('server-url').value = '';
    checkConnection();
}

async function clearAllData() {
    if (!confirm('This will remove all saved data including your authentication token. Continue?')) {
        return;
    }
    
    await chrome.storage.sync.clear();
    document.getElementById('server-url').value = '';
    document.getElementById('extension-token').value = '';
    checkConnection();
}

async function lockNow() {
    await chrome.storage.sync.remove(['extensionToken']);
    document.getElementById('extension-token').value = '';
    checkConnection();
    alert('Extension locked. You will need to log in again from the popup.');
}

// ========================================
// Context Menu
// ========================================

function updateContextMenu(enabled) {
    if (enabled) {
        chrome.contextMenus.create({
            id: 'securevault-fill',
            title: 'Fill with SecureVault',
            contexts: ['page', 'editable'],
        });
        
        chrome.contextMenus.create({
            id: 'securevault-generate',
            title: 'Generate Password',
            contexts: ['editable'],
        });
    } else {
        chrome.contextMenus.removeAll();
    }
}

// Écouter les clics sur le context menu
chrome.contextMenus?.onClicked?.addListener((info, tab) => {
    if (info.menuItemId === 'securevault-fill') {
        chrome.tabs.sendMessage(tab.id, { action: 'requestFill' });
    } else if (info.menuItemId === 'securevault-generate') {
        chrome.tabs.sendMessage(tab.id, { action: 'generatePassword' });
    }
});

// ========================================
// Utilitaires
// ========================================

function sendMessage(message) {
    return new Promise((resolve) => {
        chrome.runtime.sendMessage(message, resolve);
    });
}
