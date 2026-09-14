-- ============================================================
-- SEGURANÇA UNIDOS FC — FASE 1 (bloquear escritas diretas)
-- ============================================================
-- Executar no SQL Editor do Supabase Dashboard
--
-- O que faz:
-- 1. Habilita RLS em todas as tabelas
-- 2. Cria policies de leitura pública (SELECT true) — app lê normalmente
-- 3. Revoga INSERT/UPDATE/DELETE de anon e authenticated
-- 4. Mantém SELECT para ambos
-- 5. Apenas Edge Functions (service_role) podem escrever
-- ============================================================

-- ============================================================
-- PASSO 1: HABILITAR ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE IF EXISTS public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."unpaidMembers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.standings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."trainingLogs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.config ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.confirmations ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- PASSO 2: CRIAR POLICIES DE LEITURA PÚBLICA
-- Usamos USING (true) porque o app precisa ler mesmo sem JWT
-- (signInAnonymously pode falhar em alguns casos)
-- A segurança real está em bloquear as escritas (passo 3)
-- ============================================================
DROP POLICY IF EXISTS enable_read_for_authenticated ON public.players;
DROP POLICY IF EXISTS enable_read_for_authenticated ON public.matches;
DROP POLICY IF EXISTS enable_read_for_authenticated ON public.transactions;
DROP POLICY IF EXISTS enable_read_for_authenticated ON public."unpaidMembers";
DROP POLICY IF EXISTS enable_read_for_authenticated ON public.standings;
DROP POLICY IF EXISTS enable_read_for_authenticated ON public."trainingLogs";
DROP POLICY IF EXISTS enable_read_for_authenticated ON public.config;
DROP POLICY IF EXISTS enable_read_for_authenticated ON public.confirmations;

DROP POLICY IF EXISTS enable_read_for_all ON public.players;
DROP POLICY IF EXISTS enable_read_for_all ON public.matches;
DROP POLICY IF EXISTS enable_read_for_all ON public.transactions;
DROP POLICY IF EXISTS enable_read_for_all ON public."unpaidMembers";
DROP POLICY IF EXISTS enable_read_for_all ON public.standings;
DROP POLICY IF EXISTS enable_read_for_all ON public."trainingLogs";
DROP POLICY IF EXISTS enable_read_for_all ON public.config;
DROP POLICY IF EXISTS enable_read_for_all ON public.confirmations;

CREATE POLICY enable_read_for_all ON public.players FOR SELECT USING (true);
CREATE POLICY enable_read_for_all ON public.matches FOR SELECT USING (true);
CREATE POLICY enable_read_for_all ON public.transactions FOR SELECT USING (true);
CREATE POLICY enable_read_for_all ON public."unpaidMembers" FOR SELECT USING (true);
CREATE POLICY enable_read_for_all ON public.standings FOR SELECT USING (true);
CREATE POLICY enable_read_for_all ON public."trainingLogs" FOR SELECT USING (true);
CREATE POLICY enable_read_for_all ON public.config FOR SELECT USING (true);
CREATE POLICY enable_read_for_all ON public.confirmations FOR SELECT USING (true);

-- ============================================================
-- PASSO 3: REVOGAR PRIVILÉGIOS DE ESCRITA
-- anon + authenticated não podem mais INSERT/UPDATE/DELETE
-- ============================================================
REVOKE INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public FROM authenticated;

-- ============================================================
-- PASSO 4: MANTER LEITURA PÚBLICA
-- Tanto anon quanto authenticated podem SELECT
-- ============================================================
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;

-- ============================================================
-- PASSO 5: CONFIRMAR QUE SERVICE_ROLE mantém acesso total
-- (Edge Functions usam service_role para escrever)
-- ============================================================
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
