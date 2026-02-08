/**
 * Prometheus Metrics Middleware - SecureVault by Nextendo x Micka Delcato
 * Exporte les métriques pour monitoring
 */

import promClient from 'prom-client';

// Créer un registre
const register = new promClient.Registry();

// Ajouter les métriques par défaut
promClient.collectDefaultMetrics({ register });

// Métriques personnalisées SecureVault

// Compteur de requêtes HTTP
const httpRequestsTotal = new promClient.Counter({
    name: 'http_requests_total',
    help: 'Nombre total de requêtes HTTP',
    labelNames: ['method', 'route', 'status_code'],
    registers: [register]
});

// Durée des requêtes HTTP
const httpRequestDuration = new promClient.Histogram({
    name: 'http_request_duration_seconds',
    help: 'Durée des requêtes HTTP en secondes',
    labelNames: ['method', 'route', 'status_code'],
    buckets: [0.1, 0.5, 1, 2, 5, 10],
    registers: [register]
});

// Compteur de tentatives de login
const loginAttemptsTotal = new promClient.Counter({
    name: 'login_attempts_total',
    help: 'Nombre total de tentatives de login',
    labelNames: ['status'], // success, failure
    registers: [register]
});

// Compteur d'opérations vault
const vaultOperationsTotal = new promClient.Counter({
    name: 'vault_operations_total',
    help: 'Nombre d\'opérations sur le vault',
    labelNames: ['operation'], // create, update, delete, read
    registers: [register]
});

// Nombre d'utilisateurs actifs
const activeUsers = new promClient.Gauge({
    name: 'active_users',
    help: 'Nombre d\'utilisateurs actuellement connectés',
    registers: [register]
});

// Compteur d'alias créés
const aliasesCreatedTotal = new promClient.Counter({
    name: 'aliases_created_total',
    help: 'Nombre total d\'alias créés',
    registers: [register]
});

// Compteur de documents uploadés
const documentsUploadedTotal = new promClient.Counter({
    name: 'documents_uploaded_total',
    help: 'Nombre total de documents uploadés',
    labelNames: ['type'], // video, document, image, audio
    registers: [register]
});

// Durée des opérations de chiffrement
const encryptionDuration = new promClient.Histogram({
    name: 'encryption_duration_seconds',
    help: 'Durée des opérations de chiffrement',
    buckets: [0.01, 0.05, 0.1, 0.5, 1, 2],
    registers: [register]
});

// Middleware pour tracking des requêtes
export function metricsMiddleware(req, res, next) {
    const start = Date.now();
    
    // Sauvegarder la méthode json originale
    const originalJson = res.json;
    
    res.json = function(data) {
        const duration = (Date.now() - start) / 1000;
        const route = req.route ? req.route.path : req.path;
        const statusCode = res.statusCode.toString();
        
        // Incrémenter les compteurs
        httpRequestsTotal.inc({
            method: req.method,
            route: route,
            status_code: statusCode
        });
        
        httpRequestDuration.observe({
            method: req.method,
            route: route,
            status_code: statusCode
        }, duration);
        
        return originalJson.call(this, data);
    };
    
    next();
}

// Endpoint pour exposer les métriques
export function metricsEndpoint(req, res) {
    res.set('Content-Type', register.contentType);
    res.end(register.metrics());
}

// Fonctions utilitaires pour incrémenter les métriques
export function trackLoginSuccess() {
    loginAttemptsTotal.inc({ status: 'success' });
}

export function trackLoginFailure() {
    loginAttemptsTotal.inc({ status: 'failure' });
}

export function trackVaultOperation(operation) {
    vaultOperationsTotal.inc({ operation });
}

export function trackAliasCreated() {
    aliasesCreatedTotal.inc();
}

export function trackDocumentUploaded(type) {
    documentsUploadedTotal.inc({ type });
}

export function trackEncryptionDuration(duration) {
    encryptionDuration.observe(duration);
}

export function setActiveUsers(count) {
    activeUsers.set(count);
}

export default {
    register,
    metricsMiddleware,
    metricsEndpoint,
    trackLoginSuccess,
    trackLoginFailure,
    trackVaultOperation,
    trackAliasCreated,
    trackDocumentUploaded,
    trackEncryptionDuration,
    setActiveUsers
};
