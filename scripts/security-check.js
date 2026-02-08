#!/usr/bin/env node

/**
 * Security Configuration Check Script
 * Verifies that all security settings are properly configured
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const CHECKS = {
    passed: [],
    failed: [],
    warnings: [],
};

function check(name, condition, message, isWarning = false) {
    if (condition) {
        CHECKS.passed.push({ name, message });
        console.log(`✅ ${name}`);
    } else if (isWarning) {
        CHECKS.warnings.push({ name, message });
        console.log(`⚠️  ${name}: ${message}`);
    } else {
        CHECKS.failed.push({ name, message });
        console.log(`❌ ${name}: ${message}`);
    }
}

console.log('\n🔐 SecureVault Security Check\n');
console.log('=' .repeat(50));

// Check environment files
const backendEnvPath = path.join(__dirname, '..', 'backend', '.env');
const rootEnvPath = path.join(__dirname, '..', '.env');

if (fs.existsSync(backendEnvPath) || fs.existsSync(rootEnvPath)) {
    const envPath = fs.existsSync(backendEnvPath) ? backendEnvPath : rootEnvPath;
    const envContent = fs.readFileSync(envPath, 'utf8');
    
    // Check JWT_SECRET
    check(
        'JWT_SECRET defined',
        envContent.includes('JWT_SECRET=') && !envContent.includes('JWT_SECRET=CHANGE_ME'),
        'JWT_SECRET is not set or uses default value'
    );
    
    // Check SESSION_SECRET
    check(
        'SESSION_SECRET defined',
        envContent.includes('SESSION_SECRET=') && !envContent.includes('SESSION_SECRET=CHANGE_ME'),
        'SESSION_SECRET is not set or uses default value'
    );
    
    // Check REAL_EMAIL_ENCRYPTION_KEY
    check(
        'REAL_EMAIL_ENCRYPTION_KEY defined',
        envContent.includes('REAL_EMAIL_ENCRYPTION_KEY=') && !envContent.includes('REAL_EMAIL_ENCRYPTION_KEY=CHANGE_ME'),
        'REAL_EMAIL_ENCRYPTION_KEY is not set or uses default value'
    );
    
    // Check DB_PASSWORD
    check(
        'DB_PASSWORD defined',
        envContent.includes('DB_PASSWORD=') && !envContent.includes('DB_PASSWORD=CHANGE_ME'),
        'DB_PASSWORD is not set or uses default value'
    );
} else {
    check('.env file exists', false, 'No .env file found');
}

// Check for HTTPS in production
check(
    'HTTPS recommended for production',
    true, // Just a warning
    'Ensure HTTPS is enabled in production',
    true
);

// Check Prisma schema
const schemaPath = path.join(__dirname, '..', 'backend', 'prisma', 'schema.prisma');
if (fs.existsSync(schemaPath)) {
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    check(
        'AuditLog model exists',
        schema.includes('model AuditLog'),
        'AuditLog model not found in schema'
    );
    
    check(
        'Session model has totpVerified',
        schema.includes('totpVerified'),
        'Session model missing totpVerified field'
    );
    
    check(
        'User model has clientAuthHash',
        schema.includes('clientAuthHash'),
        'User model missing clientAuthHash field'
    );
}

// Check package.json for security dependencies
const backendPackagePath = path.join(__dirname, '..', 'backend', 'package.json');
if (fs.existsSync(backendPackagePath)) {
    const pkg = JSON.parse(fs.readFileSync(backendPackagePath, 'utf8'));
    
    check(
        'Helmet installed',
        pkg.dependencies.helmet !== undefined,
        'helmet not installed'
    );
    
    check(
        'express-rate-limit installed',
        pkg.dependencies['express-rate-limit'] !== undefined,
        'express-rate-limit not installed'
    );
    
    check(
        'Argon2 installed',
        pkg.dependencies.argon2 !== undefined,
        'argon2 not installed'
    );
}

// Summary
console.log('\n' + '='.repeat(50));
console.log('\n📊 Summary:\n');
console.log(`  ✅ Passed: ${CHECKS.passed.length}`);
console.log(`  ❌ Failed: ${CHECKS.failed.length}`);
console.log(`  ⚠️  Warnings: ${CHECKS.warnings.length}`);

if (CHECKS.failed.length === 0) {
    console.log('\n✨ All security checks passed!\n');
    process.exit(0);
} else {
    console.log('\n⚠️  Some security checks failed. Please review the issues above.\n');
    process.exit(1);
}
