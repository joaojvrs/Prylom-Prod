-- =============================================================================
-- PRYLOM — Migração de Segurança: Rate Limiting para Inserts Públicos
-- Execute no Supabase Dashboard > SQL Editor
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. TABELA DE RATE LIMITING
-- Rastreia submissões recentes por identificador (telefone/email) e tabela.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.submission_rate_limits (
  id           UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  identifier   TEXT        NOT NULL,
  "table_name" TEXT        NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- RLS: apenas admin lê; inserts controlados pela função SECURITY DEFINER abaixo
ALTER TABLE public.submission_rate_limits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rate_limits_select_admin" ON public.submission_rate_limits;
CREATE POLICY "rate_limits_select_admin"
  ON public.submission_rate_limits FOR SELECT
  USING (is_admin());

DROP POLICY IF EXISTS "rate_limits_insert_definer" ON public.submission_rate_limits;
CREATE POLICY "rate_limits_insert_definer"
  ON public.submission_rate_limits FOR INSERT
  WITH CHECK (false);  -- bloqueado direto; apenas a função SECURITY DEFINER insere

-- Índice para lookups rápidos (identifier + tabela + janela de tempo)
CREATE INDEX IF NOT EXISTS idx_sub_rate_limits_lookup
  ON public.submission_rate_limits (identifier, "table_name", created_at DESC);

-- Índice para limpeza de registros antigos (purge periódico)
CREATE INDEX IF NOT EXISTS idx_sub_rate_limits_created
  ON public.submission_rate_limits (created_at DESC);


-- ─────────────────────────────────────────────────────────────────────────────
-- 2. FUNÇÃO DE VERIFICAÇÃO E REGISTRO (SECURITY DEFINER)
-- Retorna TRUE se abaixo do limite, FALSE se excedeu.
-- Registra a tentativa na tabela de rate limits.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION check_and_record_submission(
  p_identifier TEXT,
  p_table_name TEXT,
  p_max_per_day INT DEFAULT 5
)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS
'
  WITH check_limit AS (
    SELECT COUNT(*) AS cnt
      FROM public.submission_rate_limits
     WHERE identifier    = p_identifier
       AND "table_name"  = p_table_name
       AND created_at    > NOW() - INTERVAL ''24 hours''
  ),
  do_insert AS (
    INSERT INTO public.submission_rate_limits (identifier, "table_name")
    SELECT p_identifier, p_table_name
      FROM check_limit
     WHERE p_identifier IS NOT NULL
       AND trim(p_identifier) <> ''''
       AND cnt < p_max_per_day
    RETURNING 1
  )
  SELECT EXISTS (SELECT 1 FROM do_insert)
';


-- ─────────────────────────────────────────────────────────────────────────────
-- 3. PURGE AUTOMÁTICO — remover entradas com mais de 48h via pg_cron:
--   SELECT cron.schedule(
--     'purge-rate-limits', '0 3 * * *',
--     'DELETE FROM submission_rate_limits WHERE created_at < NOW() - INTERVAL ''48 hours'''
--   );
-- ─────────────────────────────────────────────────────────────────────────────


-- ─────────────────────────────────────────────────────────────────────────────
-- 4. POLÍTICAS CORRIGIDAS: protocols_national
-- Exige telefone não-nulo + abaixo do rate limit (5 por dia por número)
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "protocols_national_insert_public" ON protocols_national;
DROP POLICY IF EXISTS "protocols_national_insert_ratelimited" ON protocols_national;
CREATE POLICY "protocols_national_insert_ratelimited"
  ON protocols_national FOR INSERT
  WITH CHECK (
    telefone IS NOT NULL
    AND trim(telefone) <> ''
    AND check_and_record_submission(telefone, 'protocols_national', 5)
  );


-- ─────────────────────────────────────────────────────────────────────────────
-- 5. POLÍTICAS CORRIGIDAS: protocols_international
-- Usa rep_phone como identificador
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "protocols_international_insert_public" ON protocols_international;
DROP POLICY IF EXISTS "protocols_international_insert_ratelimited" ON protocols_international;
CREATE POLICY "protocols_international_insert_ratelimited"
  ON protocols_international FOR INSERT
  WITH CHECK (
    rep_phone IS NOT NULL
    AND trim(rep_phone) <> ''
    AND check_and_record_submission(rep_phone, 'protocols_international', 5)
  );


-- ─────────────────────────────────────────────────────────────────────────────
-- 6. POLÍTICAS CORRIGIDAS: private_protocols
-- Usa phone como identificador
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "private_protocols_insert_public" ON private_protocols;
DROP POLICY IF EXISTS "private_protocols_insert_ratelimited" ON private_protocols;
CREATE POLICY "private_protocols_insert_ratelimited"
  ON private_protocols FOR INSERT
  WITH CHECK (
    phone IS NOT NULL
    AND trim(phone) <> ''
    AND check_and_record_submission(phone, 'private_protocols', 5)
  );


-- ─────────────────────────────────────────────────────────────────────────────
-- 7. POLÍTICAS CORRIGIDAS: ativos_cadastro
-- Usa telefone como identificador (máximo 3 cadastros por número por dia)
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "ativos_cadastro_insert_public" ON ativos_cadastro;
DROP POLICY IF EXISTS "ativos_cadastro_insert_ratelimited" ON ativos_cadastro;
CREATE POLICY "ativos_cadastro_insert_ratelimited"
  ON ativos_cadastro FOR INSERT
  WITH CHECK (
    telefone_whats IS NOT NULL
    AND trim(telefone_whats) <> ''
    AND check_and_record_submission(telefone_whats, 'ativos_cadastro', 3)
  );


-- ─────────────────────────────────────────────────────────────────────────────
-- 8. POLÍTICAS CORRIGIDAS: cadastrados_imagens e documentos_cadastro
-- Só permite INSERT se o ativo_id referenciado existe e foi criado nas últimas 2h
-- (evita uploads orphans de bots sem um cadastro pai legítimo)
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "cadastrados_imagens_insert_public" ON cadastrados_imagens;
DROP POLICY IF EXISTS "cadastrados_imagens_insert_anchored" ON cadastrados_imagens;
CREATE POLICY "cadastrados_imagens_insert_anchored"
  ON cadastrados_imagens FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.ativos_cadastro ac
      WHERE ac.id       = cadastro_id
        AND ac.created_at > NOW() - INTERVAL '2 hours'
    )
  );

DROP POLICY IF EXISTS "documentos_cadastro_insert_public" ON documentos_cadastro;
DROP POLICY IF EXISTS "documentos_cadastro_insert_anchored" ON documentos_cadastro;
CREATE POLICY "documentos_cadastro_insert_anchored"
  ON documentos_cadastro FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.ativos_cadastro ac
      WHERE ac.id       = cadastro_id
        AND ac.created_at > NOW() - INTERVAL '2 hours'
    )
  );


-- ─────────────────────────────────────────────────────────────────────────────
-- 9. STORAGE: kyc-documents — exigir autenticação para upload
-- Passaportes e documentos de identidade nunca devem ser acessíveis a anônimos
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "storage_kyc_insert_public" ON storage.objects;
DROP POLICY IF EXISTS "storage_kyc_insert_auth" ON storage.objects;
CREATE POLICY "storage_kyc_insert_auth"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'kyc-documents'
    AND auth.uid() IS NOT NULL
  );


-- ─────────────────────────────────────────────────────────────────────────────
-- 10. ÍNDICES BRIN para tabelas de log/lead (manutenção/retention eficiente)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_protocols_national_created
  ON protocols_national USING BRIN (created_at);

CREATE INDEX IF NOT EXISTS idx_protocols_intl_created
  ON protocols_international USING BRIN (created_at);

CREATE INDEX IF NOT EXISTS idx_private_protocols_created
  ON private_protocols USING BRIN (created_at);

CREATE INDEX IF NOT EXISTS idx_ativos_cadastro_created
  ON ativos_cadastro USING BRIN (created_at);
