/**
 * Content Script - SecureVault Extension
 * Injected into web pages to detect and fill login forms
 */

// Configuration
const CONFIG = {
    // Sélecteurs pour détecter les champs
    usernameSelectors: [
        'input[type="email"]',
        'input[name*="email" i]',
        'input[name*="user" i]',
        'input[name*="login" i]',
        'input[id*="email" i]',
        'input[id*="user" i]',
        'input[id*="login" i]',
        'input[placeholder*="email" i]',
        'input[placeholder*="user" i]',
        'input[autocomplete="username"]',
        'input[autocomplete="email"]',
    ],
    passwordSelectors: [
        'input[type="password"]',
        'input[name*="pass" i]',
        'input[name*="pwd" i]',
        'input[autocomplete="current-password"]',
        'input[autocomplete="new-password"]',
    ],
    submitSelectors: [
        'button[type="submit"]',
        'input[type="submit"]',
        'button:has-text("login")',
        'button:has-text("sign in")',
        'button:has-text("log in")',
    ],
    // Patterns d'exclusion (champs qui ne sont pas des logins)
    excludeSelectors: [
        'input[type="hidden"]',
        'input[readonly]',
        'input[disabled]',
    ],
};

// État
let detectedForms = [];
let activeDropdown = null;
let credentialsCache = null;

// ========================================
// Initialisation
// ========================================

function init() {
    // Attendre que le DOM soit chargé
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', onReady);
    } else {
        onReady();
    }
    
    // Observer les changements dynamiques
    observeDOMChanges();
}

function onReady() {
    console.log('[SecureVault] Content script loaded on', window.location.hostname);
    
    // Détecter les formulaires
    detectForms();
    
    // Si des formulaires sont trouvés, récupérer les credentials
    if (detectedForms.length > 0) {
        prefetchCredentials();
    }
}

// ========================================
// Détection des formulaires
// ========================================

function detectForms() {
    // Réinitialiser
    detectedForms = [];
    removeAllIcons();
    
    // Chercher les formulaires
    const forms = document.querySelectorAll('form');
    
    forms.forEach(form => {
        const fields = analyzeForm(form);
        if (fields.username && fields.password) {
            detectedForms.push({ form, fields });
            setupForm(form, fields);
        }
    });
    
    // Chercher aussi les formulaires sans balise <form>
    detectStandaloneFields();
    
    console.log('[SecureVault] Detected', detectedForms.length, 'login forms');
}

function analyzeForm(form) {
    const fields = {
        username: null,
        password: null,
        submit: null,
    };
    
    // Chercher le champ username
    for (const selector of CONFIG.usernameSelectors) {
        const input = form.querySelector(selector);
        if (input && !isExcluded(input)) {
            fields.username = input;
            break;
        }
    }
    
    // Chercher le champ password
    for (const selector of CONFIG.passwordSelectors) {
        const input = form.querySelector(selector);
        if (input && !isExcluded(input)) {
            fields.password = input;
            break;
        }
    }
    
    // Chercher le bouton submit
    fields.submit = form.querySelector(CONFIG.submitSelectors.join(', '));
    
    return fields;
}

function detectStandaloneFields() {
    // Certains sites n'utilisent pas de balise <form>
    // Chercher des champs password isolés avec un champ username à proximité
    
    const passwordFields = document.querySelectorAll('input[type="password"]');
    
    passwordFields.forEach(passwordField => {
        if (isExcluded(passwordField)) return;
        
        // Chercher un champ username à proximité (même parent ou parent proche)
        let parent = passwordField.parentElement;
        let usernameField = null;
        let depth = 0;
        
        while (parent && depth < 5) {
            for (const selector of CONFIG.usernameSelectors) {
                const input = parent.querySelector(selector);
                if (input && input !== passwordField && !isExcluded(input)) {
                    usernameField = input;
                    break;
                }
            }
            if (usernameField) break;
            parent = parent.parentElement;
            depth++;
        }
        
        if (usernameField) {
            const fields = { username: usernameField, password: passwordField, submit: null };
            detectedForms.push({ form: null, fields });
            setupStandaloneFields(usernameField, passwordField);
        }
    });
}

function isExcluded(element) {
    return CONFIG.excludeSelectors.some(selector => element.matches(selector));
}

// ========================================
// Setup des formulaires
// ========================================

function setupForm(form, fields) {
    // Ajouter l'icône SecureVault sur le champ username
    addSecureVaultIcon(fields.username, fields);
    
    // Écouter la soumission pour proposer de sauvegarder
    form.addEventListener('submit', (e) => handleFormSubmit(e, form, fields));
}

function setupStandaloneFields(usernameField, passwordField) {
    addSecureVaultIcon(usernameField, { username: usernameField, password: passwordField });
}

function addSecureVaultIcon(inputField, fields) {
    // Vérifier si l'icône existe déjà
    if (inputField.parentElement?.querySelector('.securevault-icon')) {
        return;
    }
    
    // Créer le wrapper si nécessaire
    let wrapper = inputField.parentElement;
    if (!wrapper.classList.contains('securevault-field-wrapper')) {
        wrapper = document.createElement('div');
        wrapper.className = 'securevault-field-wrapper';
        inputField.parentNode.insertBefore(wrapper, inputField);
        wrapper.appendChild(inputField);
    }
    
    // Créer l'icône
    const icon = document.createElement('div');
    icon.className = 'securevault-icon';
    icon.title = 'Fill with SecureVault';
    icon.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        handleIconClick(icon, fields);
    });
    
    wrapper.appendChild(icon);
}

function removeAllIcons() {
    document.querySelectorAll('.securevault-icon').forEach(icon => icon.remove());
}

// ========================================
// Gestion du clic sur l'icône
// ========================================

async function handleIconClick(icon, fields) {
    // Fermer le dropdown existant
    if (activeDropdown) {
        closeDropdown();
        return;
    }
    
    // Récupérer les credentials
    const credentials = await fetchCredentialsForDomain();
    
    if (!credentials || credentials.length === 0) {
        // Aucun credential trouvé - ouvrir le popup
        chrome.runtime.sendMessage({ action: 'open-popup' });
        return;
    }
    
    // Afficher le dropdown
    showCredentialsDropdown(icon, credentials, fields);
}

function showCredentialsDropdown(icon, credentials, fields) {
    const dropdown = document.createElement('div');
    dropdown.className = 'securevault-dropdown';
    
    // Header
    const header = document.createElement('div');
    header.className = 'securevault-dropdown-header';
    header.innerHTML = `
        <h4>🔐 SecureVault</h4>
        <p>${credentials.length} credential${credentials.length > 1 ? 's' : ''} available</p>
    `;
    dropdown.appendChild(header);
    
    // Liste des credentials
    credentials.forEach(cred => {
        const item = document.createElement('div');
        item.className = 'securevault-credential-item';
        item.innerHTML = `
            <div class="securevault-credential-icon">🔑</div>
            <div class="securevault-credential-info">
                <div class="securevault-credential-title">${escapeHtml(cred.title || 'Website Login')}</div>
                <div class="securevault-credential-username">Click to fill</div>
            </div>
        `;
        item.addEventListener('click', () => {
            fillCredentials(cred, fields);
            closeDropdown();
        });
        dropdown.appendChild(item);
    });
    
    // Footer avec bouton "Open Vault"
    const footer = document.createElement('div');
    footer.className = 'securevault-dropdown-footer';
    const btn = document.createElement('button');
    btn.className = 'securevault-dropdown-btn';
    btn.textContent = 'Open SecureVault';
    btn.addEventListener('click', () => {
        chrome.runtime.sendMessage({ action: 'open-popup' });
        closeDropdown();
    });
    footer.appendChild(btn);
    dropdown.appendChild(footer);
    
    // Positionner
    const rect = icon.getBoundingClientRect();
    dropdown.style.position = 'fixed';
    dropdown.style.top = `${rect.bottom + 4}px`;
    dropdown.style.right = `${window.innerWidth - rect.right}px`;
    
    // Ajouter au document
    document.body.appendChild(dropdown);
    activeDropdown = dropdown;
    
    // Fermer au clic externe
    setTimeout(() => {
        document.addEventListener('click', closeDropdownOnClickOutside, { once: true });
    }, 100);
}

function closeDropdown() {
    if (activeDropdown) {
        activeDropdown.remove();
        activeDropdown = null;
    }
}

function closeDropdownOnClickOutside(e) {
    if (activeDropdown && !activeDropdown.contains(e.target)) {
        closeDropdown();
    }
}

// ========================================
// Remplissage des credentials
// ========================================

async function fillCredentials(cred, fields) {
    // Note: En production, les credentials seraient chiffrés
    // Il faudrait communiquer avec le background script pour obtenir les données déchiffrées
    
    // Pour cette démo, on simule le remplissage
    // En vrai, on ferait:
    // 1. Envoyer un message au background pour déchiffrer
    // 2. Recevoir les données déchiffrées
    // 3. Remplir les champs
    
    console.log('[SecureVault] Filling credentials for', cred.title);
    
    // Simuler le remplissage (à remplacer par vraie logique)
    fields.username.value = 'user@example.com';
    fields.password.value = 'password123';
    
    // Déclencher des événements pour que les sites détectent le changement
    triggerInputEvent(fields.username);
    triggerInputEvent(fields.password);
    
    // Logger l'action
    chrome.runtime.sendMessage({
        action: 'logAction',
        type: 'FILL',
        entryId: cred.id,
        url: window.location.href,
    });
    
    // Focus sur le bouton submit si présent
    if (fields.submit) {
        fields.submit.focus();
    }
}

function triggerInputEvent(element) {
    const events = ['input', 'change', 'keyup', 'blur'];
    events.forEach(eventType => {
        const event = new Event(eventType, { bubbles: true });
        element.dispatchEvent(event);
    });
}

// ========================================
// Soumission du formulaire
// ========================================

function handleFormSubmit(e, form, fields) {
    // Vérifier si on a des credentials pour ce site
    // Si non, proposer de sauvegarder
    
    // Note: Cette fonctionnalité nécessiterait:
    // 1. Vérifier si on a déjà des credentials pour ce domaine
    // 2. Si non, afficher une notification pour sauvegarder
    
    // Pour l'instant, on ne fait rien de spécial
    console.log('[SecureVault] Form submitted on', window.location.hostname);
}

// ========================================
// Communication avec le background
// ========================================

async function fetchCredentialsForDomain() {
    const domain = window.location.hostname;
    
    try {
        const response = await chrome.runtime.sendMessage({
            action: 'getCredentials',
            domain: domain,
        });
        
        if (response.error) {
            console.error('[SecureVault] Failed to fetch credentials:', response.error);
            return null;
        }
        
        // Mettre en cache
        credentialsCache = response.credentials ? [response.credentials] : [];
        return credentialsCache;
        
    } catch (error) {
        console.error('[SecureVault] Error fetching credentials:', error);
        return null;
    }
}

async function prefetchCredentials() {
    // Précharger les credentials dès le chargement de la page
    // pour une réponse instantanée quand l'utilisateur clique
    const credentials = await fetchCredentialsForDomain();
    if (credentials && credentials.length > 0) {
        console.log('[SecureVault] Pre-fetched', credentials.length, 'credentials');
    }
}

// ========================================
// Observation des changements DOM
// ========================================

function observeDOMChanges() {
    const observer = new MutationObserver((mutations) => {
        let shouldDetect = false;
        
        for (const mutation of mutations) {
            if (mutation.type === 'childList') {
                for (const node of mutation.addedNodes) {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        // Vérifier si un formulaire ou champ de formulaire a été ajouté
                        if (node.matches?.('form, input') || 
                            node.querySelector?.('form, input[type="password"]')) {
                            shouldDetect = true;
                            break;
                        }
                    }
                }
            }
        }
        
        if (shouldDetect) {
            // Debounce
            clearTimeout(window.securevaultDetectTimeout);
            window.securevaultDetectTimeout = setTimeout(detectForms, 500);
        }
    });
    
    observer.observe(document.body, {
        childList: true,
        subtree: true,
    });
}

// ========================================
// Écoute des messages
// ========================================

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    switch (request.action) {
        case 'requestFill':
            // Remplir automatiquement le premier formulaire disponible
            if (detectedForms.length > 0) {
                const form = detectedForms[0];
                fetchCredentialsForDomain().then(creds => {
                    if (creds && creds.length > 0) {
                        fillCredentials(creds[0], form.fields);
                        sendResponse({ success: true });
                    } else {
                        sendResponse({ error: 'No credentials found' });
                    }
                });
                return true; // Async
            }
            sendResponse({ error: 'No forms detected' });
            break;
            
        case 'fillCredentials':
            // Remplir avec des données spécifiques (depuis le popup)
            if (detectedForms.length > 0) {
                const form = detectedForms[0];
                form.fields.username.value = request.username || '';
                form.fields.password.value = request.password || '';
                triggerInputEvent(form.fields.username);
                triggerInputEvent(form.fields.password);
                sendResponse({ success: true });
            }
            break;
            
        case 'generatePassword':
            // Générer un mot de passe et le mettre dans le champ actif
            chrome.runtime.sendMessage({ action: 'generatePassword' }, (response) => {
                if (response.password && detectedForms.length > 0) {
                    const activeElement = document.activeElement;
                    if (activeElement && activeElement.type === 'password') {
                        activeElement.value = response.password;
                        triggerInputEvent(activeElement);
                    }
                }
            });
            break;
            
        default:
            sendResponse({ error: 'Unknown action' });
    }
});

// ========================================
// Utilitaires
// ========================================

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ========================================
// Démarrer
// ========================================

init();
