import api from './api';

/**
 * Extension Download Service
 * Handles fetching extension packages and release info
 */

export const extensionDownloadService = {
    /**
     * Get available extension releases
     */
    async getReleases() {
        const response = await api.get('/extension/releases');
        return response.data;
    },

    /**
     * Get extension info
     */
    async getInfo() {
        const response = await api.get('/extension/info');
        return response.data;
    },

    /**
     * Download extension package
     * @param {string} filename - Package filename
     * @param {string} browser - Browser type (for tracking)
     */
    async download(filename, browser = 'unknown') {
        const response = await api.get(`/extension/download/${filename}`, {
            responseType: 'blob',
        });
        
        // Create download link
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
        
        return true;
    },

    /**
     * Get download URL (for direct download)
     */
    getDownloadUrl(filename) {
        const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
        return `${baseUrl}/api/extension/download/${filename}`;
    },
};

/**
 * Browser detection utility
 */
export const browserDetection = {
    /**
     * Detect current browser
     */
    detect() {
        const userAgent = navigator.userAgent.toLowerCase();
        
        if (userAgent.includes('firefox')) {
            return 'firefox';
        } else if (userAgent.includes('edg')) {
            return 'edge';
        } else if (userAgent.includes('chrome')) {
            return 'chrome';
        } else if (userAgent.includes('safari')) {
            return 'safari';
        }
        
        return 'unknown';
    },

    /**
     * Check if browser is supported
     */
    isSupported(browser = null) {
        const detected = browser || this.detect();
        return ['chrome', 'firefox', 'edge'].includes(detected);
    },

    /**
     * Get browser display name
     */
    getDisplayName(browser) {
        const names = {
            chrome: 'Google Chrome',
            firefox: 'Mozilla Firefox',
            edge: 'Microsoft Edge',
            safari: 'Apple Safari',
            unknown: 'Navigateur inconnu',
        };
        return names[browser] || names.unknown;
    },

    /**
     * Get browser icon/color
     */
    getTheme(browser) {
        const themes = {
            chrome: { color: '#4285F4', bg: '#E8F0FE' },
            firefox: { color: '#FF7139', bg: '#FFF0EB' },
            edge: { color: '#0078D7', bg: '#E5F1FA' },
            safari: { color: '#006CFF', bg: '#E8F1FF' },
        };
        return themes[browser] || themes.chrome;
    },
};
