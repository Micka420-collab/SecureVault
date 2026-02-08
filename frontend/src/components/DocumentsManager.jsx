import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useDocumentStore } from '../stores/documentStore';
import { useAuthStore } from '../stores/authStore';
import { 
    FileText, 
    Image, 
    Video, 
    Music, 
    File, 
    Star, 
    Trash2, 
    Download, 
    Upload,
    Grid,
    List,
    Filter,
    Search,
    X,
    Play,
    Pause,
    Lock,
    HardDrive,
    MoreVertical,
    FolderOpen
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

// Category icons mapping
const CATEGORY_ICONS = {
    video: Video,
    image: Image,
    audio: Music,
    document: FileText,
    other: File,
};

const CATEGORY_LABELS = {
    video: 'Vidéos',
    image: 'Images',
    audio: 'Audio',
    document: 'Documents',
    other: 'Autres',
    all: 'Tous les fichiers',
};

export default function DocumentsManager() {
    const {
        documents,
        stats,
        isLoading,
        isUploading,
        uploadProgress,
        error,
        totalCount,
        filters,
        pagination,
        fetchDocuments,
        fetchStats,
        loadMore,
        uploadDocument,
        downloadDocument,
        deleteDocument,
        toggleFavorite,
        setFilters,
        selectDocument,
        clearError,
    } = useDocumentStore();

    const { isLocked } = useAuthStore();
    
    const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
    const [searchQuery, setSearchQuery] = useState('');
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [previewDoc, setPreviewDoc] = useState(null);
    const [isDragging, setIsDragging] = useState(false);
    
    const fileInputRef = useRef(null);
    const observerRef = useRef(null);
    const lastDocRef = useRef(null);

    // Initial load
    useEffect(() => {
        if (!isLocked) {
            fetchStats();
            fetchDocuments(true);
        }
    }, [isLocked, filters]);

    // Infinite scroll
    useEffect(() => {
        if (observerRef.current) observerRef.current.disconnect();

        observerRef.current = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting && pagination.hasMore && !isLoading) {
                loadMore();
            }
        });

        if (lastDocRef.current) {
            observerRef.current.observe(lastDocRef.current);
        }

        return () => observerRef.current?.disconnect();
    }, [pagination.hasMore, isLoading, documents.length]);

    // File drop handlers
    const handleDragOver = useCallback((e) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        setIsDragging(false);
        
        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0) {
            handleFileSelect(files[0]);
        }
    }, []);

    const handleFileSelect = (file) => {
        // Validate file size (max 500MB)
        const maxSize = 500 * 1024 * 1024;
        if (file.size > maxSize) {
            alert('Fichier trop volumineux. Taille maximum: 500MB');
            return;
        }
        
        setSelectedFile(file);
        setShowUploadModal(true);
    };

    const handleUpload = async () => {
        if (!selectedFile) return;

        try {
            await uploadDocument(selectedFile);
            setShowUploadModal(false);
            setSelectedFile(null);
        } catch (err) {
            // Error is handled in store
        }
    };

    const handleDownload = async (doc) => {
        try {
            const result = await downloadDocument(doc);
            
            // Create download link
            const blob = new Blob([result.data], { type: result.mimeType });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = result.filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (err) {
            alert('Erreur lors du téléchargement: ' + err.message);
        }
    };

    const handleDelete = async (doc) => {
        if (!confirm(`Supprimer "${doc.decryptedFilename}" ? Cette action est irréversible.`)) {
            return;
        }

        try {
            await deleteDocument(doc.id);
        } catch (err) {
            alert('Erreur lors de la suppression');
        }
    };

    const handlePreview = (doc) => {
        if (doc.mimeType?.startsWith('video/')) {
            setPreviewDoc(doc);
        } else if (doc.mimeType?.startsWith('image/')) {
            setPreviewDoc(doc);
        }
    };

    // Filter documents by search
    const filteredDocuments = documents.filter(doc =>
        doc.decryptedFilename?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-surface0">
                <div>
                    <h1 className="text-2xl font-bold text-text">Documents Sécurisés</h1>
                    <p className="text-subtext0 mt-1">
                        {stats ? (
                            <>
                                <HardDrive className="inline w-4 h-4 mr-1" />
                                {stats.totalFiles} fichiers • {stats.totalSizeFormatted} utilisés
                            </>
                        ) : (
                            'Chargement...'
                        )}
                    </p>
                </div>
                
                <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 px-4 py-2 bg-mauve text-crust rounded-lg hover:bg-mauve/90 transition-colors"
                >
                    <Upload className="w-4 h-4" />
                    Ajouter un fichier
                </button>
                
                <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                />
            </div>

            {/* Toolbar */}
            <div className="flex items-center justify-between p-4 border-b border-surface0 gap-4">
                {/* Category filters */}
                <div className="flex items-center gap-2 overflow-x-auto">
                    {['all', 'video', 'image', 'document', 'audio', 'other'].map((cat) => (
                        <button
                            key={cat}
                            onClick={() => setFilters({ category: cat })}
                            className={`px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-colors ${
                                filters.category === cat
                                    ? 'bg-mauve text-crust'
                                    : 'bg-surface0 text-text hover:bg-surface1'
                            }`}
                        >
                            {CATEGORY_LABELS[cat]}
                        </button>
                    ))}
                </div>

                {/* Search */}
                <div className="relative flex-shrink-0">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-subtext0" />
                    <input
                        type="text"
                        placeholder="Rechercher..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 pr-4 py-2 bg-surface0 border border-surface1 rounded-lg text-text placeholder-subtext0 focus:outline-none focus:border-mauve w-64"
                    />
                </div>

                {/* View mode toggle */}
                <div className="flex items-center bg-surface0 rounded-lg p-1">
                    <button
                        onClick={() => setViewMode('grid')}
                        className={`p-2 rounded transition-colors ${
                            viewMode === 'grid' ? 'bg-surface1 text-text' : 'text-subtext0'
                        }`}
                    >
                        <Grid className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => setViewMode('list')}
                        className={`p-2 rounded transition-colors ${
                            viewMode === 'list' ? 'bg-surface1 text-text' : 'text-subtext0'
                        }`}
                    >
                        <List className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Drop zone overlay */}
            {isDragging && (
                <div
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className="fixed inset-0 bg-mauve/20 border-4 border-mauve border-dashed m-4 rounded-2xl flex items-center justify-center z-50"
                >
                    <div className="text-center">
                        <Upload className="w-16 h-16 text-mauve mx-auto mb-4" />
                        <p className="text-xl font-semibold text-text">Déposez votre fichier ici</p>
                        <p className="text-subtext0">Les fichiers seront chiffrés avant l'envoi</p>
                    </div>
                </div>
            )}

            {/* Documents list */}
            <div 
                className="flex-1 overflow-y-auto p-6"
                onDragOver={handleDragOver}
            >
                {filteredDocuments.length === 0 && !isLoading ? (
                    <div className="flex flex-col items-center justify-center h-full text-subtext0">
                        <FolderOpen className="w-16 h-16 mb-4 opacity-50" />
                        <p className="text-lg">Aucun document</p>
                        <p className="text-sm mt-2">Glissez-déposez un fichier ou cliquez sur "Ajouter"</p>
                    </div>
                ) : (
                    <div className={viewMode === 'grid' ? 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4' : 'space-y-2'}>
                        {filteredDocuments.map((doc, index) => (
                            <DocumentItem
                                key={doc.id}
                                doc={doc}
                                viewMode={viewMode}
                                isLast={index === filteredDocuments.length - 1}
                                lastDocRef={lastDocRef}
                                onPreview={() => handlePreview(doc)}
                                onDownload={() => handleDownload(doc)}
                                onDelete={() => handleDelete(doc)}
                                onToggleFavorite={() => toggleFavorite(doc.id)}
                            />
                        ))}
                    </div>
                )}

                {isLoading && (
                    <div className="flex justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-mauve"></div>
                    </div>
                )}
            </div>

            {/* Upload Modal */}
            {showUploadModal && selectedFile && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-surface0 rounded-2xl p-6 w-full max-w-md">
                        <h3 className="text-lg font-semibold text-text mb-4">
                            Ajouter un fichier sécurisé
                        </h3>
                        
                        <div className="bg-surface1 rounded-lg p-4 mb-4">
                            <div className="flex items-center gap-3">
                                {React.createElement(
                                    CATEGORY_ICONS[getCategoryFromMimeType(selectedFile.type)] || File,
                                    { className: 'w-10 h-10 text-mauve' }
                                )}
                                <div className="flex-1 min-w-0">
                                    <p className="text-text font-medium truncate">{selectedFile.name}</p>
                                    <p className="text-subtext0 text-sm">
                                        {formatBytes(selectedFile.size)} • {selectedFile.type || 'Inconnu'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {isUploading ? (
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-subtext0">Chiffrement et upload...</span>
                                    <span className="text-text">{uploadProgress}%</span>
                                </div>
                                <div className="h-2 bg-surface1 rounded-full overflow-hidden">
                                    <div 
                                        className="h-full bg-mauve transition-all duration-300"
                                        style={{ width: `${uploadProgress}%` }}
                                    />
                                </div>
                            </div>
                        ) : (
                            <div className="flex gap-3">
                                <button
                                    onClick={() => {
                                        setShowUploadModal(false);
                                        setSelectedFile(null);
                                    }}
                                    className="flex-1 px-4 py-2 bg-surface1 text-text rounded-lg hover:bg-surface2 transition-colors"
                                >
                                    Annuler
                                </button>
                                <button
                                    onClick={handleUpload}
                                    className="flex-1 px-4 py-2 bg-mauve text-crust rounded-lg hover:bg-mauve/90 transition-colors"
                                >
                                    Chiffrer et uploader
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Preview Modal */}
            {previewDoc && (
                <DocumentPreview 
                    doc={previewDoc}
                    onClose={() => setPreviewDoc(null)}
                    onDownload={() => handleDownload(previewDoc)}
                />
            )}

            {/* Error toast */}
            {error && (
                <div className="fixed bottom-4 right-4 bg-red/20 border border-red text-red px-4 py-3 rounded-lg flex items-center gap-3">
                    <span>{error}</span>
                    <button onClick={clearError}>
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}
        </div>
    );
}

// Document Item Component
function DocumentItem({ doc, viewMode, isLast, lastDocRef, onPreview, onDownload, onDelete, onToggleFavorite }) {
    const Icon = CATEGORY_ICONS[doc.category] || File;
    const isVideo = doc.mimeType?.startsWith('video/');
    const isImage = doc.mimeType?.startsWith('image/');

    if (viewMode === 'list') {
        return (
            <div
                ref={isLast ? lastDocRef : null}
                className="flex items-center gap-4 p-3 bg-surface0 rounded-lg hover:bg-surface1 transition-colors group"
            >
                <div className="w-10 h-10 bg-surface1 rounded-lg flex items-center justify-center">
                    <Icon className="w-5 h-5 text-mauve" />
                </div>
                
                <div className="flex-1 min-w-0">
                    <p className="text-text font-medium truncate">{doc.decryptedFilename}</p>
                    <p className="text-subtext0 text-sm">
                        {formatBytes(doc.sizeBytes)} • {formatDistanceToNow(new Date(doc.createdAt), { addSuffix: true, locale: fr })}
                    </p>
                </div>

                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                        onClick={onToggleFavorite}
                        className={`p-2 rounded-lg transition-colors ${doc.favorite ? 'text-yellow' : 'text-subtext0 hover:text-yellow'}`}
                    >
                        <Star className="w-4 h-4" fill={doc.favorite ? 'currentColor' : 'none'} />
                    </button>
                    <button
                        onClick={onDownload}
                        className="p-2 text-subtext0 hover:text-text rounded-lg transition-colors"
                    >
                        <Download className="w-4 h-4" />
                    </button>
                    <button
                        onClick={onDelete}
                        className="p-2 text-subtext0 hover:text-red rounded-lg transition-colors"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div
            ref={isLast ? lastDocRef : null}
            className="group relative bg-surface0 rounded-xl overflow-hidden hover:bg-surface1 transition-colors"
        >
            {/* Thumbnail or Icon */}
            <div 
                className="aspect-square bg-surface1 flex items-center justify-center relative cursor-pointer"
                onClick={isVideo || isImage ? onPreview : undefined}
            >
                {doc.thumbnailPath ? (
                    <img 
                        src={`/api/documents/${doc.id}/thumbnail`}
                        alt=""
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <Icon className="w-12 h-12 text-mauve/50" />
                )}
                
                {isVideo && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Play className="w-10 h-10 text-white" />
                    </div>
                )}

                {/* Favorite badge */}
                {doc.favorite && (
                    <div className="absolute top-2 left-2">
                        <Star className="w-4 h-4 text-yellow" fill="currentColor" />
                    </div>
                )}

                {/* Actions */}
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="flex flex-col gap-1">
                        <button
                            onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}
                            className="p-2 bg-surface0/90 rounded-lg text-subtext0 hover:text-yellow transition-colors"
                        >
                            <Star className="w-4 h-4" fill={doc.favorite ? 'currentColor' : 'none'} />
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); onDownload(); }}
                            className="p-2 bg-surface0/90 rounded-lg text-subtext0 hover:text-text transition-colors"
                        >
                            <Download className="w-4 h-4" />
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); onDelete(); }}
                            className="p-2 bg-surface0/90 rounded-lg text-subtext0 hover:text-red transition-colors"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Info */}
            <div className="p-3">
                <p className="text-text font-medium truncate text-sm">{doc.decryptedFilename}</p>
                <p className="text-subtext0 text-xs mt-1">
                    {formatBytes(doc.sizeBytes)}
                </p>
            </div>
        </div>
    );
}

// Document Preview Modal
function DocumentPreview({ doc, onClose, onDownload }) {
    const [decryptedUrl, setDecryptedUrl] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isPlaying, setIsPlaying] = useState(false);
    
    const isVideo = doc.mimeType?.startsWith('video/');
    const isImage = doc.mimeType?.startsWith('image/');

    useEffect(() => {
        const loadPreview = async () => {
            try {
                const result = await useDocumentStore.getState().downloadDocument(doc);
                const blob = new Blob([result.data], { type: result.mimeType });
                const url = URL.createObjectURL(blob);
                setDecryptedUrl(url);
            } catch (err) {
                console.error('Failed to load preview:', err);
            } finally {
                setIsLoading(false);
            }
        };

        loadPreview();

        return () => {
            if (decryptedUrl) URL.revokeObjectURL(decryptedUrl);
        };
    }, [doc.id]);

    return (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50">
            <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 text-white/70 hover:text-white transition-colors"
            >
                <X className="w-6 h-6" />
            </button>

            <button
                onClick={onDownload}
                className="absolute top-4 right-16 flex items-center gap-2 px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors"
            >
                <Download className="w-4 h-4" />
                Télécharger
            </button>

            <div className="max-w-4xl max-h-[90vh] w-full mx-4">
                {isLoading ? (
                    <div className="flex items-center justify-center h-96">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
                    </div>
                ) : decryptedUrl ? (
                    isVideo ? (
                        <video
                            src={decryptedUrl}
                            controls
                            className="w-full max-h-[80vh] rounded-lg"
                            autoPlay
                        />
                    ) : isImage ? (
                        <img
                            src={decryptedUrl}
                            alt={doc.decryptedFilename}
                            className="max-w-full max-h-[80vh] object-contain rounded-lg mx-auto"
                        />
                    ) : (
                        <div className="text-center text-white">
                            <p>L'aperçu n'est pas disponible pour ce type de fichier</p>
                        </div>
                    )
                ) : (
                    <div className="text-center text-white">
                        <p>Erreur lors du chargement du fichier</p>
                    </div>
                )}
            </div>

            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/70 text-sm">
                {doc.decryptedFilename} • {formatBytes(doc.sizeBytes)}
            </div>
        </div>
    );
}

// Utility functions
function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function getCategoryFromMimeType(mimeType) {
    if (mimeType?.startsWith('video/')) return 'video';
    if (mimeType?.startsWith('image/')) return 'image';
    if (mimeType?.startsWith('audio/')) return 'audio';
    return 'document';
}
