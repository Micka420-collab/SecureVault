#!/usr/bin/env node

/**
 * Generate PNG icons from SVG
 * Uses sharp if available, otherwise provides instructions
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ICONS_DIR = path.join(__dirname, '..', 'icons');
const SIZES = [16, 32, 48, 128];

console.log('🎨 Generating icons...\n');

async function generateWithSharp() {
    try {
        const sharp = await import('sharp');
        const svgPath = path.join(ICONS_DIR, 'icon.svg');
        
        if (!fs.existsSync(svgPath)) {
            console.error('❌ icon.svg not found in icons/');
            process.exit(1);
        }
        
        const svgBuffer = fs.readFileSync(svgPath);
        
        for (const size of SIZES) {
            const outputPath = path.join(ICONS_DIR, `icon${size}.png`);
            
            await sharp.default(svgBuffer)
                .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
                .png()
                .toFile(outputPath);
            
            console.log(`✓ Generated icon${size}.png`);
        }
        
        console.log('\n✅ All icons generated successfully!');
        return true;
        
    } catch (error) {
        if (error.code === 'ERR_MODULE_NOT_FOUND') {
            return false;
        }
        throw error;
    }
}

function printManualInstructions() {
    console.log('⚠️  sharp module not found. Install it for automatic icon generation:\n');
    console.log('   npm install sharp\n');
    console.log('Or generate icons manually with ImageMagick:\n');
    console.log('   cd browser-extension');
    for (const size of SIZES) {
        console.log(`   convert -background none icons/icon.svg -resize ${size}x${size} icons/icon${size}.png`);
    }
    console.log('\nOr use an online converter:');
    console.log('   https://svg2png.com/');
    console.log('\n💡 The extension will work without icons, but will use default browser icons.');
}

async function main() {
    // Create icons directory if needed
    if (!fs.existsSync(ICONS_DIR)) {
        fs.mkdirSync(ICONS_DIR, { recursive: true });
    }
    
    // Try to generate with sharp
    const success = await generateWithSharp();
    
    if (!success) {
        printManualInstructions();
        process.exit(0);
    }
}

main().catch(console.error);
