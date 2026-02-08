import api from './api';

/**
 * Document Service
 * Handles encrypted document upload/download operations
 */

export const documentService = {
    /**
     * Get storage statistics
     */
    async getStats() {
        const response = await api.get('/documents/stats');
        return response.data;
    },

    /**
     * List documents with filters
     */
    async list(options = {}) {
        const params = new URLSearchParams();
        if (options.category) params.append('category', options.category);
        if (options.favorite) params.append('favorite', 'true');
        if (options.limit) params.append('limit', options.limit.toString());
        if (options.offset) params.append('offset', options.offset.toString());
        if (options.sortBy) params.append('sortBy', options.sortBy);
        if (options.sortOrder) params.append('sortOrder', options.sortOrder);

        const response = await api.get(`/documents?${params.toString()}`);
        return response.data;
    },

    /**
     * Get single document metadata
     */
    async get(id) {
        const response = await api.get(`/documents/${id}`);
        return response.data;
    },

    /**
     * Upload a new document
     * The file must be encrypted before calling this method
     */
    async upload({
        encryptedData,      // Base64 encoded encrypted file
        encryptedName,      // Encrypted filename
        nameIv,             // IV for filename
        fileIv,             // IV for file content
        fileAuthTag,        // Auth tag for file
        mimeType,
        category,
        tags,
        thumbnailData,      // Optional
        thumbnailIv,        // Optional
        sizeBytes,          // Original file size
    }) {
        const response = await api.post('/documents', {
            encryptedData,
            encryptedName,
            nameIv,
            fileIv,
            fileAuthTag,
            mimeType,
            category,
            tags,
            thumbnailData,
            thumbnailIv,
            sizeBytes,
        });
        return response.data;
    },

    /**
     * Download encrypted document
     * Returns encrypted data that must be decrypted client-side
     */
    async download(id) {
        const response = await api.get(`/documents/${id}/download`);
        return response.data;
    },

    /**
     * Stream video (for large files)
     * Returns encrypted chunks
     */
    async streamVideo(id, range) {
        const headers = range ? { Range: range } : {};
        const response = await api.get(`/documents/${id}/stream`, {
            headers,
            responseType: 'arraybuffer',
        });
        return {
            data: response.data,
            headers: response.headers,
        };
    },

    /**
     * Get thumbnail
     */
    async getThumbnail(id) {
        const response = await api.get(`/documents/${id}/thumbnail`);
        return response.data;
    },

    /**
     * Update document metadata
     */
    async update(id, updates) {
        const response = await api.patch(`/documents/${id}`, updates);
        return response.data;
    },

    /**
     * Delete document
     */
    async delete(id) {
        const response = await api.delete(`/documents/${id}`);
        return response.data;
    },

    /**
     * Batch operations
     */
    async batch(operation, ids) {
        const response = await api.post('/documents/batch', { operation, ids });
        return response.data;
    },

    /**
     * Toggle favorite status
     */
    async toggleFavorite(id, favorite) {
        return this.update(id, { favorite });
    },
};

/**
 * Encryption utilities for documents
 */
export const documentCrypto = {
    /**
     * Encrypt a file using AES-256-GCM
     * @param {ArrayBuffer} fileData - Raw file data
     * @param {CryptoKey} key - AES key
     * @returns {Promise<{encryptedData: ArrayBuffer, iv: string, authTag: string}>}
     */
    async encryptFile(fileData, key) {
        // Generate random IV (96 bits for GCM)
        const iv = crypto.getRandomValues(new Uint8Array(12));
        
        // Encrypt
        const encryptedData = await crypto.subtle.encrypt(
            { name: 'AES-GCM', iv },
            key,
            fileData
        );

        // Extract auth tag (last 16 bytes in WebCrypto AES-GCM)
        const encryptedArray = new Uint8Array(encryptedData);
        const authTag = encryptedArray.slice(-16);
        const ciphertext = encryptedArray.slice(0, -16);

        return {
            encryptedData: ciphertext.buffer,
            iv: Array.from(iv),
            authTag: Array.from(authTag),
        };
    },

    /**
     * Decrypt a file using AES-256-GCM
     * @param {ArrayBuffer} encryptedData - Encrypted file data (without auth tag)
     * @param {Uint8Array} iv - Initialization vector
     * @param {Uint8Array} authTag - Authentication tag
     * @param {CryptoKey} key - AES key
     * @returns {Promise<ArrayBuffer>}
     */
    async decryptFile(encryptedData, iv, authTag, key) {
        // Combine ciphertext and auth tag
        const combined = new Uint8Array(encryptedData.byteLength + authTag.length);
        combined.set(new Uint8Array(encryptedData), 0);
        combined.set(authTag, encryptedData.byteLength);

        // Decrypt
        const decrypted = await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv },
            key,
            combined
        );

        return decrypted;
    },

    /**
     * Encrypt filename (short text)
     * @param {string} filename - Original filename
     * @param {CryptoKey} key - AES key
     * @returns {Promise<{encryptedName: string, iv: string}>}
     */
    async encryptFilename(filename, key) {
        const encoder = new TextEncoder();
        const data = encoder.encode(filename);
        const iv = crypto.getRandomValues(new Uint8Array(12));

        const encrypted = await crypto.subtle.encrypt(
            { name: 'AES-GCM', iv },
            key,
            data
        );

        // Convert to base64 for storage
        const encryptedArray = new Uint8Array(encrypted);
        // Include auth tag in the encrypted data for filenames
        const base64 = btoa(String.fromCharCode(...encryptedArray));

        return {
            encryptedName: base64,
            iv: Array.from(iv),
        };
    },

    /**
     * Decrypt filename
     * @param {string} encryptedName - Base64 encrypted filename
     * @param {Uint8Array} iv - Initialization vector
     * @param {CryptoKey} key - AES key
     * @returns {Promise<string>}
     */
    async decryptFilename(encryptedName, iv, key) {
        // Decode base64
        const binaryString = atob(encryptedName);
        const encrypted = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            encrypted[i] = binaryString.charCodeAt(i);
        }

        const decrypted = await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv },
            key,
            encrypted
        );

        const decoder = new TextDecoder();
        return decoder.decode(decrypted);
    },

    /**
     * Generate a thumbnail from video/image
     * @param {File} file - Original file
     * @param {number} maxSize - Max dimension
     * @returns {Promise<Blob|null>}
     */
    async generateThumbnail(file, maxSize = 200) {
        return new Promise((resolve, reject) => {
            if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
                resolve(null);
                return;
            }

            const url = URL.createObjectURL(file);
            const img = new Image();

            img.onload = () => {
                URL.revokeObjectURL(url);

                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');

                let { width, height } = img;
                if (width > height) {
                    if (width > maxSize) {
                        height *= maxSize / width;
                        width = maxSize;
                    }
                } else {
                    if (height > maxSize) {
                        width *= maxSize / height;
                        height = maxSize;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                ctx.drawImage(img, 0, 0, width, height);

                canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.7);
            };

            img.onerror = () => {
                URL.revokeObjectURL(url);
                resolve(null);
            };

            if (file.type.startsWith('video/')) {
                // For videos, capture a frame
                const video = document.createElement('video');
                video.preload = 'metadata';
                video.playsInline = true;
                video.muted = true;

                video.onloadedmetadata = () => {
                    video.currentTime = Math.min(1, video.duration / 4);
                };

                video.onseeked = () => {
                    canvas.width = video.videoWidth;
                    canvas.height = video.videoHeight;
                    ctx.drawImage(video, 0, 0);
                    canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.7);
                    URL.revokeObjectURL(url);
                };

                video.onerror = () => {
                    URL.revokeObjectURL(url);
                    resolve(null);
                };

                video.src = url;
            } else {
                img.src = url;
            }
        });
    },

    /**
     * ArrayBuffer to Base64
     */
    arrayBufferToBase64(buffer) {
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    },

    /**
     * Base64 to ArrayBuffer
     */
    base64ToArrayBuffer(base64) {
        const binaryString = atob(base64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes.buffer;
    },
};
