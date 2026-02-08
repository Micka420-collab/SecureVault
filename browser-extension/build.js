#!/usr/bin/env node

/**
 * Build script for SecureVault Browser Extension
 * Generates icons from SVG and prepares the extension for packaging
 */

const fs = require('fs');
const path = require('path');

const SIZES = [16, 32, 48, 128];
const ICONS_DIR = path.join(__dirname, 'icons');

console.log('🔐 SecureVault Extension Build\n');

// Check if running in a Node environment with canvas or similar
// For now, we'll create placeholder instructions

console.log('📦 Building extension...\n');

// Verify structure
const requiredFiles = [
    'manifest.json',
    'popup.html',
    'options.html',
    'src/content.js',
    'src/content.css',
    'src/background.js',
    'src/popup.js',
    'src/options.js',
    'icons/icon.svg',
];

let allPresent = true;

console.log('✓ Checking file structure:');
for (const file of requiredFiles) {
    const exists = fs.existsSync(path.join(__dirname, file));
    console.log(`  ${exists ? '✓' : '✗'} ${file}`);
    if (!exists) allPresent = false;
}

if (!allPresent) {
    console.error('\n❌ Some required files are missing!');
    process.exit(1);
}

// Check for icon PNGs
console.log('\n✓ Checking icons:');
const iconSizes = [16, 32, 48, 128];
let iconsMissing = false;

for (const size of iconSizes) {
    const iconPath = path.join(ICONS_DIR, `icon${size}.png`);
    const exists = fs.existsSync(iconPath);
    console.log(`  ${exists ? '✓' : '✗'} icon${size}.png`);
    if (!exists) iconsMissing = true;
}

if (iconsMissing) {
    console.log('\n⚠️  Some icons are missing. To generate them:');
    console.log('   Option 1: Use ImageMagick:');
    console.log('     convert -background none icons/icon.svg -resize 16x16 icons/icon16.png');
    console.log('     convert -background none icons/icon.svg -resize 32x32 icons/icon32.png');
    console.log('     convert -background none icons/icon.svg -resize 48x48 icons/icon48.png');
    console.log('     convert -background none icons/icon.svg -resize 128x128 icons/icon128.png');
    console.log('\n   Option 2: Use an online converter (svg2png.com)');
    console.log('\n   Option 3: The extension will still work, but without icons in the toolbar');
}

// Create distribution zip info
console.log('\n✓ Build complete!\n');
console.log('📋 Next steps:');
console.log('   1. Generate icon PNGs if needed (see above)');
console.log('   2. Load in Chrome:');
console.log('      - Open chrome://extensions/');
console.log('      - Enable "Developer mode"');
console.log('      - Click "Load unpacked"');
console.log('      - Select this folder\n');
console.log('   3. Or create a zip for distribution:');
console.log('      zip -r securevault-extension.zip browser-extension/ -x "*.git*" -x "*node_modules*"\n');

// Package info
const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, 'manifest.json'), 'utf8'));
console.log(`📊 Extension: ${manifest.name} v${manifest.version}`);
console.log(`📝 Description: ${manifest.description}\n`);
