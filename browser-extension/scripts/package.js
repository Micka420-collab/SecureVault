#!/usr/bin/env node

/**
 * Package the extension for distribution
 * Creates a zip file ready for Chrome Web Store or manual installation
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.join(__dirname, '..');
const DIST_DIR = path.join(ROOT_DIR, 'dist');

console.log('📦 Packaging SecureVault Extension...\n');

// Read manifest to get version
const manifest = JSON.parse(
    fs.readFileSync(path.join(ROOT_DIR, 'manifest.json'), 'utf8')
);

const version = manifest.version;
const packageName = `securevault-extension-v${version}.zip`;

// Files to include
const filesToInclude = [
    'manifest.json',
    'popup.html',
    'options.html',
    'README.md',
    'src/content.js',
    'src/content.css',
    'src/background.js',
    'src/popup.js',
    'src/options.js',
];

// Check if icons exist
const iconSizes = [16, 32, 48, 128];
const iconsExist = iconSizes.every(size => 
    fs.existsSync(path.join(ROOT_DIR, 'icons', `icon${size}.png`))
);

if (!iconsExist) {
    console.log('⚠️  Warning: Some icon files are missing.');
    console.log('   Run: npm run build:icons\n');
}

// Create dist directory
if (!fs.existsSync(DIST_DIR)) {
    fs.mkdirSync(DIST_DIR, { recursive: true });
}

// Check if we can use adm-zip
async function packageWithAdmZip() {
    try {
        const AdmZip = await import('adm-zip');
        const zip = new AdmZip.default();
        
        // Add files
        for (const file of filesToInclude) {
            const filePath = path.join(ROOT_DIR, file);
            if (fs.existsSync(filePath)) {
                zip.addLocalFile(filePath, path.dirname(file));
                console.log(`✓ Added ${file}`);
            } else {
                console.log(`✗ Missing ${file}`);
            }
        }
        
        // Add icons
        for (const size of iconSizes) {
            const iconPath = path.join(ROOT_DIR, 'icons', `icon${size}.png`);
            if (fs.existsSync(iconPath)) {
                zip.addLocalFile(iconPath, 'icons');
            }
        }
        
        // Write zip
        const outputPath = path.join(DIST_DIR, packageName);
        zip.writeZip(outputPath);
        
        console.log(`\n✅ Package created: ${outputPath}`);
        return true;
        
    } catch (error) {
        if (error.code === 'ERR_MODULE_NOT_FOUND') {
            return false;
        }
        throw error;
    }
}

function printManualInstructions() {
    console.log('⚠️  adm-zip module not found. Install it for automatic packaging:\n');
    console.log('   npm install adm-zip\n');
    console.log('Or package manually:\n');
    console.log(`   cd browser-extension`);
    console.log(`   zip -r ${packageName} manifest.json popup.html options.html src/ icons/`);
    console.log(`   mv ${packageName} dist/`);
}

async function main() {
    const success = await packageWithAdmZip();
    
    if (!success) {
        printManualInstructions();
    }
    
    console.log('\n📋 Next steps:');
    console.log('   1. Test the extension in developer mode');
    console.log('   2. Upload to Chrome Web Store (if publishing)');
    console.log('   3. Or distribute the zip file for manual installation');
}

main().catch(console.error);
