/**
 * Cypress Configuration - SecureVault by Nextendo x Micka Delcato
 * E2E Testing
 */

import { defineConfig } from 'cypress';

export default defineConfig({
    e2e: {
        baseUrl: 'http://localhost:5173',
        supportFile: 'cypress/support/e2e.js',
        specPattern: 'cypress/e2e/**/*.cy.js',
        video: false,
        screenshotOnRunFailure: true,
        viewportWidth: 1280,
        viewportHeight: 720,
        defaultCommandTimeout: 10000,
        requestTimeout: 10000,
        responseTimeout: 10000,
        setupNodeEvents(on, config) {
            // Implémentation des événements Node
            on('task', {
                log(message) {
                    console.log(message);
                    return null;
                }
            });
            return config;
        }
    },
    component: {
        devServer: {
            framework: 'react',
            bundler: 'vite'
        }
    }
});
