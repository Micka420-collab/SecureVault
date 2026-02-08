-- Migration 001 : Préparation pour les nouvelles fonctionnalités
-- À exécuter si vous avez des données existantes

-- 1. Nettoyer les sessions expirées (optionnel mais recommandé)
DELETE FROM sessions WHERE expiresAt < datetime('now');

-- 2. Vérifier les utilisateurs sans clientAuthHash
SELECT 
    id, 
    email, 
    CASE 
        WHEN clientAuthHash IS NULL THEN 'NEEDS_RELOGIN'
        ELSE 'OK'
    END as status
FROM users;

-- 3. Statistiques des tables
SELECT 'users' as table_name, COUNT(*) as count FROM users
UNION ALL
SELECT 'sessions', COUNT(*) FROM sessions
UNION ALL
SELECT 'vault_entries', COUNT(*) FROM vault_entries
UNION ALL
SELECT 'aliases', COUNT(*) FROM aliases
UNION ALL
SELECT 'emails', COUNT(*) FROM emails;

-- 4. Vérifier les index (SQLite)
SELECT name FROM sqlite_master WHERE type='index' AND tbl_name IN ('users', 'sessions', 'vault_entries', 'aliases', 'emails', 'audit_logs');
