-- =============================================================================
-- PRYLOM — DDL Part 3: Tabelas de monitoramento + RLS
-- =============================================================================

-- ── RURAL_PROPRIEDADES_MONITORADAS ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS rural_propriedades_monitoradas (
  id                     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id                UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  codigo_car             TEXT NOT NULL,
  label                  TEXT,
  snapshot               JSONB,
  ultima_verificacao_iso TIMESTAMPTZ,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, codigo_car)
);

CREATE INDEX IF NOT EXISTS idx_rural_monitored_user_id ON rural_propriedades_monitoradas (user_id);

ALTER TABLE rural_propriedades_monitoradas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rural_monitored_select_own" ON rural_propriedades_monitoradas;
CREATE POLICY "rural_monitored_select_own"
  ON rural_propriedades_monitoradas FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "rural_monitored_insert_own" ON rural_propriedades_monitoradas;
CREATE POLICY "rural_monitored_insert_own"
  ON rural_propriedades_monitoradas FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "rural_monitored_update_own" ON rural_propriedades_monitoradas;
CREATE POLICY "rural_monitored_update_own"
  ON rural_propriedades_monitoradas FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "rural_monitored_delete_own" ON rural_propriedades_monitoradas;
CREATE POLICY "rural_monitored_delete_own"
  ON rural_propriedades_monitoradas FOR DELETE
  USING (auth.uid() = user_id);


-- ── RURAL_ALERTAS_HISTORICO ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS rural_alertas_historico (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  propriedade_id UUID NOT NULL REFERENCES rural_propriedades_monitoradas(id) ON DELETE CASCADE,
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mudancas       JSONB,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rural_alertas_propriedade_id ON rural_alertas_historico (propriedade_id);
CREATE INDEX IF NOT EXISTS idx_rural_alertas_user_id        ON rural_alertas_historico (user_id);
CREATE INDEX IF NOT EXISTS idx_rural_alertas_created_brin   ON rural_alertas_historico USING BRIN (created_at);
