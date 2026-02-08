import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import fs from 'fs/promises';
import path from 'path';

const router = Router();

// Path to extension releases
const EXTENSION_DIR = process.env.EXTENSION_DIR || './extensions';

/**
 * Get available extension releases
 * GET /api/extension/releases
 */
router.get('/releases', asyncHandler(async (req, res) => {
    const releasesPath = path.resolve(EXTENSION_DIR);
    
    try {
        // Check if directory exists
        await fs.access(releasesPath);
    } catch {
        return res.status(503).json({
            error: 'Extensions not available',
            message: 'Extension packages have not been built yet',
            buildInstructions: 'Run: cd browser-extension && npm run build:extension',
        });
    }
    
    // Read release info
    const releaseInfoPath = path.join(releasesPath, 'release-info.json');
    let releaseInfo = null;
    
    try {
        const data = await fs.readFile(releaseInfoPath, 'utf8');
        releaseInfo = JSON.parse(data);
    } catch {
        // Release info not available, scan directory instead
    }
    
    // Scan directory for packages
    const files = await fs.readdir(releasesPath);
    const packages = [];
    
    for (const file of files) {
        if (file.endsWith('.zip') || file.endsWith('.xpi')) {
            const stat = await fs.stat(path.join(releasesPath, file));
            const browser = file.includes('firefox') ? 'firefox' : 
                           file.includes('chrome') ? 'chrome' : 'edge';
            
            packages.push({
                filename: file,
                browser,
                size: stat.size,
                sizeFormatted: formatBytes(stat.size),
                downloadUrl: `/api/extension/download/${file}`,
                updatedAt: stat.mtime,
            });
        }
    }
    
    res.json({
        available: packages.length > 0,
        version: releaseInfo?.version || 'unknown',
        date: releaseInfo?.date || null,
        packages,
        installInstructions: releaseInfo?.installInstructions || {
            chrome: [
                'Download the .zip file',
                'Extract to a folder',
                'Open chrome://extensions/',
                'Enable "Developer mode"',
                'Click "Load unpacked"',
                'Select the extracted folder',
            ],
            firefox: [
                'Download the .xpi file',
                'Open about:addons',
                'Click gear icon → "Install from file"',
                'Select the .xpi file',
            ],
            edge: [
                'Download the .zip file (same as Chrome)',
                'Extract to a folder',
                'Open edge://extensions/',
                'Enable "Developer mode"',
                'Click "Load unpacked"',
                'Select the extracted folder',
            ],
        },
    });
}));

/**
 * Download extension package
 * GET /api/extension/download/:filename
 */
router.get('/download/:filename', asyncHandler(async (req, res) => {
    const { filename } = req.params;
    
    // Security: Validate filename
    if (!filename.match(/^[\w\-\.]+\.(zip|xpi)$/)) {
        return res.status(400).json({ error: 'Invalid filename' });
    }
    
    const filePath = path.resolve(EXTENSION_DIR, filename);
    
    // Security: Ensure file is within extension directory
    if (!filePath.startsWith(path.resolve(EXTENSION_DIR))) {
        return res.status(403).json({ error: 'Access denied' });
    }
    
    try {
        await fs.access(filePath);
    } catch {
        return res.status(404).json({ error: 'File not found' });
    }
    
    // Set appropriate content type
    const isXPI = filename.endsWith('.xpi');
    res.set({
        'Content-Type': isXPI ? 'application/x-xpinstall' : 'application/zip',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'X-Content-Type-Options': 'nosniff',
    });
    
    // Stream file
    const fileStream = await fs.open(filePath, 'r');
    const { size } = await fs.stat(filePath);
    
    res.set('Content-Length', size);
    
    // Read and send file
    const buffer = Buffer.alloc(size);
    await fileStream.read(buffer, 0, size, 0);
    await fileStream.close();
    
    res.send(buffer);
}));

/**
 * Get extension info for current user
 * GET /api/extension/info
 */
router.get('/info', asyncHandler(async (req, res) => {
    res.json({
        name: 'SecureVault Auto-Fill',
        description: 'Auto-fill extension for SecureVault password manager',
        version: '1.0.0',
        browsers: ['chrome', 'firefox', 'edge'],
        features: [
            'Auto-fill login forms',
            'Secure credential storage',
            'Password generator',
            'Keyboard shortcuts (Ctrl+Shift+L)',
            'Context menu integration',
        ],
        requirements: {
            chrome: 'Version 88+',
            firefox: 'Version 109+',
            edge: 'Version 88+',
        },
    });
}));

/**
 * Format bytes to human readable
 */
function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export default router;
