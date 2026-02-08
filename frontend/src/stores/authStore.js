/**
 * Auth Store - SecureVault by Nextendo x Micka Delcato
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { deriveKey, hashForAuth } from '../crypto/clientCrypto';
import api from '../services/api';

const LOCK_TIMEOUT = 15 * 60 * 1000; // 15 minutes

export const useAuthStore = create(
    persist(
        (set, get) => ({
            // State
            user: null,
            accessToken: null,
            salt: null,
            encryptionKey: null, // CryptoKey - stored in memory only
            isAuthenticated: false,
            isLocked: false,
            requires2FA: false,
            lastActivity: Date.now(),
            lockTimer: null,

            // Actions
            setUser: (user) => set({ user }),
            setToken: (accessToken) => set({ accessToken }),
            setSalt: (salt) => set({ salt }),

            /**
             * Register a new user
             */
            register: async (email, masterPassword, realEmail) => {
                // First, register to get the salt that will be stored
                // The server generates the salt during registration
                const registerResponse = await api.post('/auth/register', {
                    email,
                    masterPassword, // Send raw password, server will hash it
                    realEmail,
                });

                return registerResponse.data;
            },

            /**
             * Login user
             */
            login: async (email, masterPassword) => {
                // Attempt login with raw password
                const response = await api.post('/auth/login', {
                    email,
                    masterPassword,
                });

                const { accessToken, requires2FA, user, salt } = response.data;

                if (requires2FA) {
                    set({
                        accessToken,
                        salt,
                        requires2FA: true,
                        isAuthenticated: false,
                    });
                    return { requires2FA: true };
                }

                // Derive encryption key from master password using the salt
                const encryptionKey = await deriveKey(masterPassword, salt);

                set({
                    user,
                    accessToken,
                    salt,
                    encryptionKey,
                    isAuthenticated: true,
                    isLocked: false,
                    requires2FA: false,
                    lastActivity: Date.now(),
                });

                // Start lock timer
                get().startLockTimer();

                return { success: true };
            },

            /**
             * Verify 2FA code
             */
            verify2FA: async (code, masterPassword) => {
                const { salt, accessToken } = get();

                const response = await api.post('/auth/2fa/verify', { code }, {
                    headers: { Authorization: `Bearer ${accessToken}` },
                });

                // Derive encryption key now that 2FA is verified
                const encryptionKey = await deriveKey(masterPassword, salt);

                // Get user info
                const userResponse = await api.get('/auth/me', {
                    headers: { Authorization: `Bearer ${accessToken}` },
                });

                set({
                    user: userResponse.data.user,
                    encryptionKey,
                    isAuthenticated: true,
                    isLocked: false,
                    requires2FA: false,
                    lastActivity: Date.now(),
                });

                get().startLockTimer();

                return { success: true };
            },

            /**
             * Unlock session after auto-lock
             */
            unlock: async (masterPassword) => {
                const { salt, accessToken } = get();

                const passwordHash = await hashForAuth(masterPassword, salt);

                const response = await api.post('/auth/unlock', { passwordHash }, {
                    headers: { Authorization: `Bearer ${accessToken}` },
                });

                // Re-derive encryption key
                const encryptionKey = await deriveKey(masterPassword, salt);

                set({
                    accessToken: response.data.accessToken,
                    encryptionKey,
                    isLocked: false,
                    lastActivity: Date.now(),
                });

                get().startLockTimer();

                return { success: true };
            },

            /**
             * Lock the vault
             */
            lock: () => {
                const { lockTimer } = get();
                if (lockTimer) clearTimeout(lockTimer);

                set({
                    encryptionKey: null, // Clear encryption key from memory
                    isLocked: true,
                    lockTimer: null,
                });
            },

            /**
             * Start inactivity lock timer
             */
            startLockTimer: () => {
                const { lockTimer } = get();
                if (lockTimer) clearTimeout(lockTimer);

                const timer = setTimeout(() => {
                    get().lock();
                }, LOCK_TIMEOUT);

                set({ lockTimer: timer, lastActivity: Date.now() });
            },

            /**
             * Reset activity timer (call on user interaction)
             */
            resetActivity: () => {
                const { isAuthenticated, isLocked } = get();
                if (isAuthenticated && !isLocked) {
                    get().startLockTimer();
                }
            },

            /**
             * Logout
             */
            logout: async () => {
                const { accessToken, lockTimer } = get();

                try {
                    if (accessToken) {
                        await api.post('/auth/logout', {}, {
                            headers: { Authorization: `Bearer ${accessToken}` },
                        });
                    }
                } catch (error) {
                    // Ignore logout errors
                }

                if (lockTimer) clearTimeout(lockTimer);

                set({
                    user: null,
                    accessToken: null,
                    salt: null,
                    encryptionKey: null,
                    isAuthenticated: false,
                    isLocked: false,
                    requires2FA: false,
                    lockTimer: null,
                });
            },

            /**
             * Get encryption key (throws if locked)
             */
            getEncryptionKey: () => {
                const { encryptionKey, isLocked } = get();
                if (isLocked || !encryptionKey) {
                    throw new Error('Vault is locked');
                }
                return encryptionKey;
            },

            /**
             * Mark onboarding as seen
             */
            markOnboardingSeen: async () => {
                const { accessToken, user } = get();
                if (!accessToken || !user) return;

                try {
                    await api.post('/auth/onboarding-seen', {}, {
                        headers: { Authorization: `Bearer ${accessToken}` },
                    });

                    // Update local state
                    set({
                        user: { ...user, hasSeenOnboarding: true }
                    });
                } catch (error) {
                    console.error('Failed to mark onboarding as seen:', error);
                }
            },
        }),
        {
            name: 'securevault-auth',
            // Only persist these fields (NOT the encryption key!)
            partialize: (state) => ({
                user: state.user,
                accessToken: state.accessToken,
                salt: state.salt,
                isAuthenticated: state.isAuthenticated,
            }),
        }
    )
);
