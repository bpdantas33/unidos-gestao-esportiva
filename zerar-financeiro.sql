-- ============================================================
-- ZERAR FINANCEIRO — UNIDOS FC
-- ============================================================
-- Executar no SQL Editor do Supabase Dashboard
--
-- O que faz:
-- 1. Apaga TODAS as transações financeiras
-- 2. Apaga TODOS os débitos de atletas
-- 3. Mantém todas as outras tabelas intactas
--
-- Após executar o SQL, limpar localStorage no navegador:
-- F12 → Application → Local Storage → apagar:
--   unidos_cache_transactions
--   unidos_cache_unpaid
-- ============================================================

BEGIN;

-- Apaga transações
DELETE FROM transactions;

-- Apaga débitos
DELETE FROM "unpaidMembers";

COMMIT;

-- Verificar se limpou:
-- SELECT count(*) FROM transactions;
-- SELECT count(*) FROM "unpaidMembers";
