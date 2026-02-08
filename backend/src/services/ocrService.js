/**
 * OCR Service - SecureVault by Nextendo x Micka Delcato
 * Reconnaissance optique de caractères pour les documents
 * VERSION 100% OFFLINE - Les modèles sont locaux
 */

import { createWorker } from 'tesseract.js';
import pdfParse from 'pdf-parse';
import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class OCRService {
    constructor() {
        this.worker = null;
        this.isInitialized = false;
        this.langPath = path.join(__dirname, '../../ocr-lang-data');
    }

    /**
     * Initialise le worker Tesseract avec modèles locaux
     */
    async initialize() {
        if (this.isInitialized) return;

        try {
            // Vérifier si les modèles locaux existent
            const langPathExists = await this.checkPathExists(this.langPath);
            
            if (langPathExists) {
                // Mode offline avec modèles locaux
                this.worker = await createWorker('fra+eng', 1, {
                    langPath: this.langPath,
                    logger: m => console.log(`[OCR] ${m.status}: ${Math.round(m.progress * 100)}%`)
                });
                console.log('[OCR] Service initialized (OFFLINE mode with local models)');
            } else {
                // Fallback: mode sans OCR (extraction texte PDF uniquement)
                console.log('[OCR] No local models found, running in PDF-text-only mode');
                this.worker = null;
            }
            
            this.isInitialized = true;
        } catch (error) {
            console.error('[OCR] Failed to initialize:', error);
            this.isInitialized = true; // Marquer comme initialisé même en cas d'erreur
            this.worker = null;
        }
    }

    /**
     * Vérifie si un chemin existe
     */
    async checkPathExists(filepath) {
        try {
            await fs.access(filepath);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Termine le worker
     */
    async terminate() {
        if (this.worker) {
            await this.worker.terminate();
            this.worker = null;
        }
        this.isInitialized = false;
    }

    /**
     * Extrait le texte d'une image (nécessite modèles Tesseract locaux)
     */
    async extractFromImage(imagePath) {
        await this.initialize();

        if (!this.worker) {
            return {
                text: '',
                confidence: 0,
                pages: 1,
                error: 'OCR offline mode - Image OCR requires local Tesseract models'
            };
        }

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
                pages: 1,
                offline: true
            };
        } catch (error) {
            console.error('[OCR] Image extraction failed:', error);
            return {
                text: '',
                confidence: 0,
                pages: 1,
                error: error.message
            };
        }
    }

    /**
     * Extrait le texte d'un PDF
     */
    async extractFromPDF(pdfPath) {
        try {
            // D'abord essayer d'extraire le texte natif (100% offline)
            const dataBuffer = await fs.readFile(pdfPath);
            const pdfData = await pdfParse(dataBuffer);
            
            // Si du texte est extrait avec confiance suffisante
            if (pdfData.text && pdfData.text.length > 50) {
                return {
                    text: pdfData.text.trim(),
                    confidence: 95,
                    pages: pdfData.numpages,
                    source: 'pdf-native',
                    offline: true
                };
            }

            // Si pas de texte natif et OCR disponible, essayer OCR
            if (this.worker) {
                return await this.extractFromPDFImages(pdfPath);
            }

            // Sinon, retourner vide mais sans erreur
            return {
                text: '',
                confidence: 0,
                pages: pdfData.numpages,
                source: 'none',
                offline: true,
                note: 'PDF contains no extractable text and OCR is not available'
            };
        } catch (error) {
            console.error('[OCR] PDF extraction failed:', error);
            return {
                text: '',
                confidence: 0,
                pages: 0,
                error: error.message
            };
        }
    }

    /**
     * Convertit un PDF en images et fait OCR (nécessite modèles locaux)
     */
    async extractFromPDFImages(pdfPath) {
        // Cette méthode nécessite des outils externes comme pdf2image
        // Pour une solution 100% offline, il faudrait pdf-poppler ou similar
        console.log('[OCR] PDF to image OCR requires additional setup');
        return {
            text: '',
            confidence: 0,
            pages: 0,
            error: 'PDF image OCR requires poppler utils'
        };
    }

    /**
     * Prétraite l'image pour améliorer l'OCR
     */
    async preprocessImage(imagePath) {
        const ext = path.extname(imagePath);
        const outputPath = imagePath.replace(ext, '_processed.png');

        try {
            await sharp(imagePath)
                .resize(2000, 2000, { fit: 'inside', withoutEnlargement: true })
                .grayscale()
                .normalize()
                .threshold(128)
                .sharpen()
                .toFile(outputPath);

            return outputPath;
        } catch (error) {
            console.error('[OCR] Preprocessing failed:', error);
            return imagePath; // Retourner l'original si échec
        }
    }

    /**
     * Extrait le texte d'un document (image ou PDF)
     */
    async extractText(filePath, mimeType) {
        await this.initialize();

        if (mimeType.startsWith('image/')) {
            return await this.extractFromImage(filePath);
        } else if (mimeType === 'application/pdf') {
            return await this.extractFromPDF(filePath);
        } else {
            return {
                text: '',
                confidence: 0,
                error: 'Unsupported file type'
            };
        }
    }
}

// Singleton instance
const ocrService = new OCRService();

export default ocrService;
