import { create } from 'zustand';
import { documentService, documentCrypto } from '../services/documents';
import { useAuthStore } from './authStore';

/**
 * Document Store
 * Manages encrypted document state and operations
 */

export const useDocumentStore = create((set, get) => ({
    // State
    documents: [],
    selectedDocument: null,
    stats: null,
    isLoading: false,
    isUploading: false,
    uploadProgress: 0,
    error: null,
    totalCount: 0,
    filters: {
        category: 'all',
        favorite: false,
        sortBy: 'createdAt',
        sortOrder: 'desc',
    },

    // Pagination
    pagination: {
        limit: 50,
        offset: 0,
        hasMore: true,
    },

    // Actions

    /**
     * Set filters
     */
    setFilters: (filters) => {
        set({ 
            filters: { ...get().filters, ...filters },
            documents: [],
            pagination: { ...get().pagination, offset: 0, hasMore: true },
        });
        get().fetchDocuments();
    },

    /**
     * Fetch storage stats
     */
    fetchStats: async () => {
        try {
            const stats = await documentService.getStats();
            set({ stats });
            return stats;
        } catch (error) {
            console.error('Failed to fetch stats:', error);
            return null;
        }
    },

    /**
     * Fetch documents list
     */
    fetchDocuments: async (reset = false) => {
        const state = get();
        if (state.isLoading) return;

        set({ isLoading: true, error: null });

        try {
            const offset = reset ? 0 : state.pagination.offset;
            
            const result = await documentService.list({
                ...state.filters,
                limit: state.pagination.limit,
                offset,
            });

            // Decrypt filenames
            const encryptionKey = useAuthStore.getState().encryptionKey;
            const decryptedDocs = await Promise.all(
                result.documents.map(async (doc) => {
                    try {
                        const filename = await documentCrypto.decryptFilename(
                            doc.encryptedName,
                            new Uint8Array(doc.nameIv),
                            encryptionKey
                        );
                        return { ...doc, decryptedFilename: filename };
                    } catch (e) {
                        console.error('Failed to decrypt filename:', e);
                        return { ...doc, decryptedFilename: 'Encrypted File' };
                    }
                })
            );

            set({
                documents: reset ? decryptedDocs : [...state.documents, ...decryptedDocs],
                totalCount: result.total,
                pagination: {
                    ...state.pagination,
                    offset: offset + result.documents.length,
                    hasMore: result.documents.length === state.pagination.limit,
                },
            });
        } catch (error) {
            set({ error: error.message });
        } finally {
            set({ isLoading: false });
        }
    },

    /**
     * Load more documents (pagination)
     */
    loadMore: () => {
        if (get().pagination.hasMore && !get().isLoading) {
            get().fetchDocuments();
        }
    },

    /**
     * Upload a new document
     */
    uploadDocument: async (file, options = {}) => {
        const encryptionKey = useAuthStore.getState().encryptionKey;
        if (!encryptionKey) {
            throw new Error('Encryption key not available');
        }

        set({ isUploading: true, uploadProgress: 0 });

        try {
            // Update progress
            set({ uploadProgress: 10 });

            // Read file
            const fileData = await file.arrayBuffer();
            set({ uploadProgress: 30 });

            // Encrypt file
            const encryptedFile = await documentCrypto.encryptFile(fileData, encryptionKey);
            set({ uploadProgress: 60 });

            // Encrypt filename
            const encryptedName = await documentCrypto.encryptFilename(file.name, encryptionKey);
            set({ uploadProgress: 70 });

            // Generate thumbnail if applicable
            let thumbnailData = null;
            let thumbnailIv = null;
            
            if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
                const thumbnailBlob = await documentCrypto.generateThumbnail(file);
                if (thumbnailBlob) {
                    const thumbData = await thumbnailBlob.arrayBuffer();
                    const encryptedThumb = await documentCrypto.encryptFile(thumbData, encryptionKey);
                    thumbnailData = documentCrypto.arrayBufferToBase64(encryptedThumb.encryptedData);
                    thumbnailIv = encryptedThumb.iv;
                }
            }

            set({ uploadProgress: 85 });

            // Detect category from mime type
            const category = getCategoryFromMimeType(file.type);

            // Upload
            const result = await documentService.upload({
                encryptedData: documentCrypto.arrayBufferToBase64(encryptedFile.encryptedData),
                encryptedName: encryptedName.encryptedName,
                nameIv: encryptedName.iv,
                fileIv: encryptedFile.iv,
                fileAuthTag: encryptedFile.authTag,
                mimeType: file.type,
                category: options.category || category,
                tags: options.tags ? JSON.stringify(options.tags) : null,
                thumbnailData,
                thumbnailIv,
                sizeBytes: file.size,
            });

            set({ uploadProgress: 100 });

            // Refresh documents list
            await get().fetchDocuments(true);
            await get().fetchStats();

            return result;
        } catch (error) {
            set({ error: error.message });
            throw error;
        } finally {
            set({ isUploading: false, uploadProgress: 0 });
        }
    },

    /**
     * Download and decrypt a document
     */
    downloadDocument: async (document) => {
        const encryptionKey = useAuthStore.getState().encryptionKey;
        if (!encryptionKey) {
            throw new Error('Encryption key not available');
        }

        set({ isLoading: true, error: null });

        try {
            // Download encrypted data
            const encryptedDoc = await documentService.download(document.id);

            // Decrypt file
            const encryptedData = documentCrypto.base64ToArrayBuffer(encryptedDoc.encryptedData);
            const iv = new Uint8Array(encryptedDoc.fileIv);
            const authTag = new Uint8Array(encryptedDoc.fileAuthTag);

            const decryptedData = await documentCrypto.decryptFile(
                encryptedData,
                iv,
                authTag,
                encryptionKey
            );

            // Decrypt filename
            const filename = await documentCrypto.decryptFilename(
                encryptedDoc.encryptedName,
                new Uint8Array(encryptedDoc.nameIv),
                encryptionKey
            );

            return {
                data: decryptedData,
                filename,
                mimeType: encryptedDoc.mimeType,
            };
        } catch (error) {
            set({ error: error.message });
            throw error;
        } finally {
            set({ isLoading: false });
        }
    },

    /**
     * Delete a document
     */
    deleteDocument: async (id) => {
        set({ isLoading: true, error: null });

        try {
            await documentService.delete(id);
            
            // Update local state
            set({
                documents: get().documents.filter(d => d.id !== id),
                selectedDocument: get().selectedDocument?.id === id ? null : get().selectedDocument,
            });

            await get().fetchStats();
        } catch (error) {
            set({ error: error.message });
            throw error;
        } finally {
            set({ isLoading: false });
        }
    },

    /**
     * Toggle favorite status
     */
    toggleFavorite: async (id) => {
        const doc = get().documents.find(d => d.id === id);
        if (!doc) return;

        const newFavorite = !doc.favorite;

        // Optimistic update
        set({
            documents: get().documents.map(d =>
                d.id === id ? { ...d, favorite: newFavorite } : d
            ),
        });

        try {
            await documentService.toggleFavorite(id, newFavorite);
        } catch (error) {
            // Revert on error
            set({
                documents: get().documents.map(d =>
                    d.id === id ? { ...d, favorite: !newFavorite } : d
                ),
            });
            throw error;
        }
    },

    /**
     * Select a document
     */
    selectDocument: (document) => {
        set({ selectedDocument: document });
    },

    /**
     * Clear selection
     */
    clearSelection: () => {
        set({ selectedDocument: null });
    },

    /**
     * Clear error
     */
    clearError: () => {
        set({ error: null });
    },
}));

/**
 * Get category from MIME type
 */
function getCategoryFromMimeType(mimeType) {
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('audio/')) return 'audio';
    if (mimeType === 'application/pdf') return 'document';
    if (mimeType.includes('word') || mimeType.includes('excel') || mimeType.includes('office')) {
        return 'document';
    }
    return 'other';
}
