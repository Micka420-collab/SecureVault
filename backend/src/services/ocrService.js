/**
 * OCR Service - SecureVault by Nextendo x Micka Delcato
 * Reconnaissance optique de caractères pour les documents
 */

import { createWorker } from 'tesseract.js';
import pdfParse from 'pdf-parse';
import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';

class OCRService {
    constructor() {
        this.worker = null;
        this.isInitialized = false;
    }

    /**
     * Initialise le worker Tesseract
     */
    async initialize() {
        if (this.isInitialized) return;

        try {
            this.worker = await createWorker('fra+eng'); // Français + Anglais
            this.isInitialized = true;
            console.log('[OCR] Service initialized');
        } catch (error) {
            console.error('[OCR] Failed to initialize:', error);
            throw error;
        }
    }

    /**
     * Termine le worker
     */
    async terminate() {
        if (this.worker) {
            await this.worker.terminate();
            this.worker = null;
            this.isInitialized = false;
        }
    }

    /**
     * Extrait le texte d'une image
     */
    async extractFromImage(imagePath) {
        await this.initialize();

        try {
            // Prétraitement de l'image
            const processedPath = await this.preprocessImage(imagePath);
            
            // OCR
            const { data: { text, confidence } } = await this.worker.recognize(processedPath);
            
            // Nettoyer le fichier temporaire
            await fs.unlink(processedPath).catch(() => {});

            return {
                text: text.trim(),
                confidence,
                pages: 1
            };
        } catch (error) {
            console.error('[OCR] Image extraction failed:', error);
            throw error;
        }
    }

    /**
     * Extrait le texte d'un PDF
     */
    async extractFromPDF(pdfPath) {
        try {
            // D'abord essayer d'extraire le texte natif
            const dataBuffer = await fs.readFile(pdfPath);
            const pdfData = await pdfParse(dataBuffer);
            
            // Si du texte est extrait avec confiance suffisante
            if (pdfData.text && pdfData.text.length > 100) {
                return {
                    text: pdfData.text.trim(),
                    confidence: 95,
                    pages: pdfData.numpages
                };
            }

            // Sinon, convertir en images et faire OCR
            return await this.extractFromPDFImages(pdfPath);
        } catch (error) {
            console.error('[OCR] PDF extraction failed:', error);
            throw error;
        }
    }

    /**
     * Convertit un PDF en images et fait OCR
     */
    async extractFromPDFImages(pdfPath) {
        await this.initialize();

        try {
            // Utiliser pdf2pic ou similaire pour convertir en images
            // Note: Nécessite l'installation de poppler
            const { fromPath } = await import('pdf2pic');
            
            const convert = fromPath(pdfPath, {
                density: 300,
                saveFilename: 'page',
                savePath: '/tmp/securevault-ocr',
                format: 'png',
                width: 2000
            });

            const images = await convert.bulk(-1); // Toutes les pages
            
            let fullText = '';
            let totalConfidence = 0;

            for (const image of images) {
                const result = await this.extractFromImage(image.path);
                fullText += result.text + '\n';
                totalConfidence += result.confidence;
                
                // Nettoyer
                await fs.unlink(image.path).catch(() => {});
            }

            return {
                text: fullText.trim(),
                confidence: totalConfidence / images.length,
                pages: images.length
            };
        } catch (error) {
            console.error('[OCR] PDF to images failed:', error);
            throw error;
        }
    }

    /**
     * Prétraite l'image pour améliorer l'OCR
     */
    async preprocessImage(imagePath) {
        const outputPath = `/tmp/securevault-ocr-${Date.now()}.png`;
        
        await sharp(imagePath)
            .resize(2000, null, { withoutEnlargement: true }) // Max 2000px de large
            .grayscale() // Niveaux de gris
            .normalize() // Normaliser les couleurs
            .threshold(128) // Binarisation
            .sharpen({ sigma: 1 }) // Netteté
            .toFile(outputPath);

        return outputPath;
    }

    /**
     * Extrait le texte selon le type de fichier
     */
    async extractText(filePath, mimeType) {
        const ext = path.extname(filePath).toLowerCase();
        
        if (mimeType.startsWith('image/') || ['.jpg', '.jpeg', '.png', '.tiff', '.bmp'].includes(ext)) {
            return await this.extractFromImage(filePath);
        } else if (mimeType === 'application/pdf' || ext === '.pdf') {
            return await this.extractFromPDF(filePath);
        } else {
            throw new Error(`Format non supporté: ${mimeType}`);
        }
    }

    /**
     * Indexe un document pour la recherche
     */
    async indexDocument(documentId, filePath, mimeType) {
        try {
            const { text, confidence, pages } = await this.extractText(filePath, mimeType);
            
            // Sauvegarder dans la base de données
            // Note: Nécessite l'ajout d'un champ 'ocrText' dans le modèle Document
            
            return {
                documentId,
                text: text.substring(0, 10000), // Limiter la taille
                confidence,
                pages,
                indexedAt: new Date()
            };
        } catch (error) {
            console.error('[OCR] Indexing failed:', error);
            return null;
        }
    }

    /**
     * Recherche dans le texte OCR
     */
    searchInText(text, query) {
        const normalizedQuery = query.toLowerCase().trim();
        const normalizedText = text.toLowerCase();
        
        // Recherche exacte
        if (normalizedText.includes(normalizedQuery)) {
            return true;
        }
        
        // Recherche par mots (tous les mots doivent être présents)
        const queryWords = normalizedQuery.split(/\s+/);
        return queryWords.every(word => normalizedText.includes(word));
    }
}

// Singleton
const ocrService = new OCRService();

export default ocrService;
export { OCRService };
