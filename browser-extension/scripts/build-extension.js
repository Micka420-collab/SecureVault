#!/usr/bin/env node

/**
 * Build Extension Packages for Web Download
 * Creates .zip (Chrome/Edge) and .xpi (Firefox) packages
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.join(__dirname, '..');
const DIST_DIR = path.join(ROOT_DIR, 'dist');
const RELEASE_DIR = path.join(DIST_DIR, 'releases');

console.log('🔨 Building Extension Packages for Web Download\n');

// Ensure directories exist
[DIST_DIR, RELEASE_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

// Read manifest
const manifest = JSON.parse(
    fs.readFileSync(path.join(ROOT_DIR, 'manifest.json'), 'utf8')
);

const VERSION = manifest.version;
const NAME = 'securevault-extension';

// Files to include
const FILES_TO_INCLUDE = [
    'manifest.json',
    'popup.html',
    'options.html',
    'README.md',
    'LICENSE',
    'CHANGELOG.md',
];

const SRC_FILES = [
    'src/content.js',
    'src/content.css',
    'src/background.js',
    'src/popup.js',
    'src/options.js',
];

/**
 * Create ZIP for Chrome/Edge
 */
async function createChromePackage() {
    console.log('📦 Creating Chrome/Edge package...');
    
    try {
        // Try to use adm-zip if available
        let AdmZip;
        try {
            const module = await import('adm-zip');
            AdmZip = module.default;
        } catch {
            console.log('⚠️  adm-zip not found, using fallback...');
            return createPackageFallback('chrome');
        }
        
        const zip = new AdmZip();
        
        // Add main files
        for (const file of FILES_TO_INCLUDE) {
            const filePath = path.join(ROOT_DIR, file);
            if (fs.existsSync(filePath)) {
                zip.addLocalFile(filePath);
            }
        }
        
        // Add src files
        for (const file of SRC_FILES) {
            const filePath = path.join(ROOT_DIR, file);
            if (fs.existsSync(filePath)) {
                zip.addLocalFile(filePath, path.dirname(file));
            }
        }
        
        // Add icons
        const iconSizes = [16, 32, 48, 128];
        for (const size of iconSizes) {
            const iconPath = path.join(ROOT_DIR, 'icons', `icon${size}.png`);
            if (fs.existsSync(iconPath)) {
                zip.addLocalFile(iconPath, 'icons');
            }
        }
        
        // Add SVG source
        const svgPath = path.join(ROOT_DIR, 'icons', 'icon.svg');
        if (fs.existsSync(svgPath)) {
            zip.addLocalFile(svgPath, 'icons');
        }
        
        const outputPath = path.join(RELEASE_DIR, `${NAME}-v${VERSION}-chrome.zip`);
        zip.writeZip(outputPath);
        
        // Generate checksum
        const hash = generateChecksum(outputPath);
        
        console.log(`✅ Chrome package: ${outputPath}`);
        console.log(`   SHA256: ${hash}`);
        
        return {
            filename: path.basename(outputPath),
            path: outputPath,
            size: formatBytes(fs.statSync(outputPath).size),
            sha256: hash,
            browser: 'chrome',
        };
    } catch (error) {
        console.error('❌ Failed to create Chrome package:', error.message);
        return null;
    }
}

/**
 * Create XPI for Firefox
 */
async function createFirefoxPackage() {
    console.log('\n📦 Creating Firefox package...');
    
    try {
        // Firefox uses the same ZIP format but with .xpi extension
        // We need to modify the manifest slightly for Firefox
        
        const firefoxManifest = {
            ...manifest,
            browser_specific_settings: {
                gecko: {
                    id: 'securevault@example.com',
                    strict_min_version: '109.0',
                },
            },
        };
        
        // Create temporary manifest
        const tempManifestPath = path.join(ROOT_DIR, 'manifest-firefox.json');
        fs.writeFileSync(tempManifestPath, JSON.stringify(firefoxManifest, null, 2));
        
        let AdmZip;
        try {
            const module = await import('adm-zip');
            AdmZip = module.default;
        } catch {
            console.log('⚠️  adm-zip not found, using fallback...');
            fs.unlinkSync(tempManifestPath);
            return createPackageFallback('firefox');
        }
        
        const zip = new AdmZip();
        
        // Add modified manifest as manifest.json
        zip.addLocalFile(tempManifestPath, '', 'manifest.json');
        
        // Add other files (except original manifest)
        for (const file of FILES_TO_INCLUDE.filter(f => f !== 'manifest.json')) {
            const filePath = path.join(ROOT_DIR, file);
            if (fs.existsSync(filePath)) {
                zip.addLocalFile(filePath);
            }
        }
        
        // Add src files
        for (const file of SRC_FILES) {
            const filePath = path.join(ROOT_DIR, file);
            if (fs.existsSync(filePath)) {
                zip.addLocalFile(filePath, path.dirname(file));
            }
        }
        
        // Add icons
        const iconSizes = [16, 32, 48, 128];
        for (const size of iconSizes) {
            const iconPath = path.join(ROOT_DIR, 'icons', `icon${size}.png`);
            if (fs.existsSync(iconPath)) {
                zip.addLocalFile(iconPath, 'icons');
            }
        }
        
        const outputPath = path.join(RELEASE_DIR, `${NAME}-v${VERSION}-firefox.xpi`);
        zip.writeZip(outputPath);
        
        // Clean up temp manifest
        fs.unlinkSync(tempManifestPath);
        
        // Generate checksum
        const hash = generateChecksum(outputPath);
        
        console.log(`✅ Firefox package: ${outputPath}`);
        console.log(`   SHA256: ${hash}`);
        
        return {
            filename: path.basename(outputPath),
            path: outputPath,
            size: formatBytes(fs.statSync(outputPath).size),
            sha256: hash,
            browser: 'firefox',
        };
    } catch (error) {
        console.error('❌ Failed to create Firefox package:', error.message);
        return null;
    }
}

/**
 * Fallback using shell commands
 */
async function createPackageFallback(browser) {
    console.log(`Creating ${browser} package using shell commands...`);
    
    const ext = browser === 'firefox' ? 'xpi' : 'zip';
    const filename = `${NAME}-v${VERSION}-${browser}.${ext}`;
    const outputPath = path.join(RELEASE_DIR, filename);
    
    // Create manifest for Firefox if needed
    if (browser === 'firefox') {
        const firefoxManifest = {
            ...manifest,
            browser_specific_settings: {
                gecko: {
                    id: 'securevault@example.com',
                    strict_min_version: '109.0',
                },
            },
        };
        fs.writeFileSync(
            path.join(ROOT_DIR, 'manifest-firefox.json'),
            JSON.stringify(firefoxManifest, null, 2)
        );
    }
    
    console.log(`\n⚠️  Could not create ${browser} package automatically.`);
    console.log('Please create it manually with:');
    console.log(`   cd browser-extension`);
    console.log(`   zip -r ${filename} manifest.json popup.html options.html src/ icons/`);
    console.log(`   mv ${filename} dist/releases/`);
    
    return null;
}

/**
 * Generate SHA256 checksum
 */
function generateChecksum(filePath) {
    const data = fs.readFileSync(filePath);
    return crypto.createHash('sha256').update(data).digest('hex');
}

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

/**
 * Generate release info JSON
 */
function generateReleaseInfo(packages) {
    const info = {
        version: VERSION,
        date: new Date().toISOString(),
        packages: packages.filter(p => p !== null),
        installInstructions: {
            chrome: [
                'Téléchargez le fichier .zip',
                'Extrayez le contenu dans un dossier',
                'Ouvrez chrome://extensions/',
                'Activez "Mode développeur"',
                'Cliquez sur "Charger l\'extension non empaquetée"',
                'Sélectionnez le dossier extrait',
            ],
            firefox: [
                'Téléchargez le fichier .xpi',
                'Ouvrez about:addons',
                'Cliquez sur l\'icône engrenage → "Installer depuis un fichier"',
                'Sélectionnez le fichier .xpi',
            ],
            edge: [
                'Téléchargez le fichier .zip (même que Chrome)',
                'Extrayez le contenu dans un dossier',
                'Ouvrez edge://extensions/',
                'Activez "Mode développeur"',
                'Cliquez sur "Charger l\'extension non empaquetée"',
                'Sélectionnez le dossier extrait',
            ],
        },
    };
    
    const infoPath = path.join(RELEASE_DIR, 'release-info.json');
    fs.writeFileSync(infoPath, JSON.stringify(info, null, 2));
    
    return info;
}

/**
 * Main build function
 */
async function build() {
    console.log(`Building extension v${VERSION}\n`);
    
    // Check if icons exist
    const icon16Path = path.join(ROOT_DIR, 'icons', 'icon16.png');
    if (!fs.existsSync(icon16Path)) {
        console.log('⚠️  Icons not found. Run: npm run build:icons\n');
    }
    
    const packages = [];
    
    // Build packages
    const chromePackage = await createChromePackage();
    if (chromePackage) packages.push(chromePackage);
    
    const firefoxPackage = await createFirefoxPackage();
    if (firefoxPackage) packages.push(firefoxPackage);
    
    // Generate release info
    const releaseInfo = generateReleaseInfo(packages);
    
    console.log('\n✅ Build complete!');
    console.log(`\n📁 Output directory: ${RELEASE_DIR}`);
    console.log(`📋 Release info: ${path.join(RELEASE_DIR, 'release-info.json')}`);
    
    // Summary
    console.log('\n📊 Summary:');
    packages.forEach(pkg => {
        console.log(`   ${pkg.browser}: ${pkg.filename} (${pkg.size})`);
    });
    
    // Web download instructions
    console.log('\n🌐 Web Download Setup:');
    console.log('   1. Copy the contents of dist/releases/ to your web server');
    console.log('   2. Serve with Content-Type: application/octet-stream for .xpi files');
    console.log('   3. Update your frontend to fetch /api/extension/releases');
    
    return releaseInfo;
}

build().catch(console.error);
