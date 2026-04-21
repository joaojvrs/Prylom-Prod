-- =============================================================================
-- PRYLOM — Migração: RPC log_dossier_download + índices dossie_logs
-- Execute no Supabase Dashboard > SQL Editor
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. ÍNDICES para dossie_logs (tabela cresce a cada download de PDF)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_dossie_logs_user_created
  ON dossie_logs (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_dossie_logs_produto_created
  ON dossie_logs (produto_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_dossie_logs_created_brin
  ON dossie_logs USING BRIN (created_at);


-- ─────────────────────────────────────────────────────────────────────────────
-- 2. RPC log_dossier_download
-- Consolida: busca cpf_cnpj do profile + insere em dossie_logs em uma chamada.
-- O IP deve ser capturado server-side via request_headers() — não confiar no
-- valor enviado pelo cliente.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION log_dossier_download(
  p_produto_id  TEXT,
  p_produto_cod TEXT,
  p_dossie_hash TEXT,
  p_ip          TEXT DEFAULT NULL
)
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS
'
  WITH profile_data AS (
    SELECT COALESCE(cpf_cnpj, ''CPF/CNPJ nao cadastrado'') AS cpf_cnpj,
           COALESCE(full_name, auth.email()) AS user_name
      FROM profiles
     WHERE id = auth.uid()
     LIMIT 1
  ),
  ins AS (
    INSERT INTO dossie_logs (
      hash, user_id, user_name, cpf_cnpj, ip, produto_id, produto_cod
    )
    SELECT
      p_dossie_hash,
      auth.uid(),
      (SELECT user_name  FROM profile_data),
      (SELECT cpf_cnpj   FROM profile_data),
      COALESCE(p_ip, current_setting(''request.headers'', true)::json->>''x-forwarded-for'', ''Indisponivel''),
      p_produto_id,
      p_produto_cod
    RETURNING cpf_cnpj
  )
  SELECT cpf_cnpj FROM ins
';

GRANT EXECUTE ON FUNCTION log_dossier_download(TEXT, TEXT, TEXT, TEXT) TO authenticated;


-- ─────────────────────────────────────────────────────────────────────────────
-- 3. RLS para dossie_logs (se não existir)
-- Apenas o próprio usuário vê seus logs; admin vê tudo
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE dossie_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "dossie_logs_select_own" ON dossie_logs;
CREATE POLICY "dossie_logs_select_own"
  ON dossie_logs FOR SELECT
  USING (auth.uid() = user_id OR is_admin());

DROP POLICY IF EXISTS "dossie_logs_insert_definer" ON dossie_logs;
CREATE POLICY "dossie_logs_insert_definer"
  ON dossie_logs FOR INSERT
  WITH CHECK (false);
