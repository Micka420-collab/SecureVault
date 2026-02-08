# Changelog

All notable changes to the SecureVault Browser Extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2024-XX-XX

### Added
- Initial release of SecureVault Browser Extension
- Auto-fill functionality for login forms
- Secure credential retrieval from SecureVault server
- Domain matching with anti-phishing protection
- Popup interface for credential selection
- Options page for configuration
- Keyboard shortcuts (Ctrl+Shift+L, Ctrl+Shift+F)
- Context menu integration
- Notification support
- Tailscale network integration
- Zero-knowledge encryption support
- Extension token authentication
- Password generation via context menu

### Security
- AES-256-GCM client-side encryption
- PBKDF2 key derivation (600k iterations)
- Extension tokens with 30-day expiration
- Domain verification to prevent phishing
- No credentials stored in extension storage

## [Unreleased]

### Planned
- Safari extension support
- Biometric authentication
- Secure password sharing from extension
- Dark/light theme toggle
- Import/export credentials

---

## Versioning Guidelines

- **MAJOR**: Incompatible API changes
- **MINOR**: New functionality (backward compatible)
- **PATCH**: Bug fixes (backward compatible)
