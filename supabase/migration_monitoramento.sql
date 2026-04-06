-- =============================================================================
-- PRYLOM — Sistema de Monitoramento de Propriedades Rurais
-- Execute no SQL Editor do Supabase (Settings > SQL Editor)
-- =============================================================================

-- ─── Tabelas ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS rural_propriedades_monitoradas (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  codigo_car           text        NOT NULL,
  label                text        NOT NULL,
  input_original       text        NOT NULL,
  snapshot             jsonb       NOT NULL DEFAULT '{}',
  ultima_verificacao   timestamptz NOT NULL DEFAULT now(),
  created_at           timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, codigo_car)
);

CREATE TABLE IF NOT EXISTS rural_alertas_historico (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  propriedade_id   uuid        NOT NULL REFERENCES rural_propriedades_monitoradas(id) ON DELETE CASCADE,
  user_id          uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mudancas         jsonb       NOT NULL DEFAULT '[]',
  texto_formatado  text        NOT NULL DEFAULT '',
  lido             boolean     NOT NULL DEFAULT false,
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- Índice para busca rápida de alertas não lidos por usuário
CREATE INDEX IF NOT EXISTS idx_alertas_user_nao_lido
  ON rural_alertas_historico(user_id, lido)
  WHERE lido = false;

-- ─── RLS ──────────────────────────────────────────────────────────────────────

ALTER TABLE rural_propriedades_monitoradas ENABLE ROW LEVEL SECURITY;
ALTER TABLE rural_alertas_historico        ENABLE ROW LEVEL SECURITY;

-- Usuário acessa apenas as próprias propriedades monitoradas
DROP POLICY IF EXISTS "monitor_select_own" ON rural_propriedades_monitoradas;
CREATE POLICY "monitor_select_own"
  ON rural_propriedades_monitoradas FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "monitor_insert_own" ON rural_propriedades_monitoradas;
CREATE POLICY "monitor_insert_own"
  ON rural_propriedades_monitoradas FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "monitor_update_own" ON rural_propriedades_monitoradas;
CREATE POLICY "monitor_update_own"
  ON rural_propriedades_monitoradas FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "monitor_delete_own" ON rural_propriedades_monitoradas;
CREATE POLICY "monitor_delete_own"
  ON rural_propriedades_monitoradas FOR DELETE
  USING (auth.uid() = user_id);

-- Usuário acessa apenas os próprios alertas
DROP POLICY IF EXISTS "alertas_select_own" ON rural_alertas_historico;
CREATE POLICY "alertas_select_own"
  ON rural_alertas_historico FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "alertas_insert_own" ON rural_alertas_historico;
CREATE POLICY "alertas_insert_own"
  ON rural_alertas_historico FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "alertas_update_own" ON rural_alertas_historico;
CREATE POLICY "alertas_update_own"
  ON rural_alertas_historico FOR UPDATE
  USING (auth.uid() = user_id);

-- ─── Função de verificação (chamada pelo pg_cron e pelo client) ───────────────
-- Atualiza ultima_verificacao para identificar propriedades vencidas.
-- A lógica de consulta SICAR/SIGEF/IBAMA é executada no client (JavaScript).
-- Esta função serve para o pg_cron marcar propriedades como "pendentes de
-- verificação" (ultima_verificacao < now() - interval '30 days').

CREATE OR REPLACE FUNCTION marcar_propriedades_para_verificacao()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  -- Sem-op intencionalmente: a lógica de consulta às APIs externas (SICAR,
  -- SIGEF, IBAMA) só pode ser executada no client JS, pois envolve fetch()
  -- a serviços externos. Esta função existe para ser chamada pelo pg_cron
  -- e disparar a notificação via realtime ao client conectado.
  NOTIFY monitoramento_rural, 'verificar';
$$;

-- ─── pg_cron: job mensal ──────────────────────────────────────────────────────
-- Habilitar pg_cron: Supabase Dashboard > Database > Extensions > pg_cron
-- O job abaixo roda no 1º dia de cada mês às 06:00 UTC e notifica os
-- clients conectados via LISTEN/NOTIFY para iniciarem a re-consulta.

-- Para criar o job após habilitar a extensão:
-- SELECT cron.schedule(
--   'monitoramento-rural-mensal',
--   '0 6 1 * *',
--   $$SELECT marcar_propriedades_para_verificacao()$$
-- );

-- Para remover o job se necessário:
-- SELECT cron.unschedule('monitoramento-rural-mensal');
