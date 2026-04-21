-- =============================================================================
-- PRYLOM — DDL Part 2: Tabelas de usuário + RLS (favorites, dossie_logs, leads)
-- =============================================================================

-- ── PROFILES RLS ──────────────────────────────────────────────────────────────
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
CREATE POLICY "profiles_select_own"
  ON profiles FOR SELECT
  USING (auth.uid() = id OR is_admin());

DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
CREATE POLICY "profiles_insert_own"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE
  USING (auth.uid() = id OR is_admin());


-- ── FAVORITES ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS favorites (
  id       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  asset_id UUID NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
  UNIQUE (user_id, asset_id)
);

CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON favorites (user_id);

ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "favorites_select_own" ON favorites;
CREATE POLICY "favorites_select_own"
  ON favorites FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "favorites_insert_own" ON favorites;
CREATE POLICY "favorites_insert_own"
  ON favorites FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "favorites_delete_own" ON favorites;
CREATE POLICY "favorites_delete_own"
  ON favorites FOR DELETE
  USING (auth.uid() = user_id);


-- ── DOSSIE_LOGS ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS dossie_logs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hash        TEXT NOT NULL,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_name   TEXT,
  cpf_cnpj    TEXT,
  ip          TEXT,
  produto_id  TEXT NOT NULL,
  produto_cod TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dossie_logs_user_created    ON dossie_logs (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dossie_logs_produto_created ON dossie_logs (produto_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dossie_logs_created_brin    ON dossie_logs USING BRIN (created_at);


-- ── RURAL_CONSULTAS_HISTORICO ─────────────────────────────────────────────────
-- Garante que a coluna user_id existe mesmo se a tabela foi criada sem ela
CREATE TABLE IF NOT EXISTS rural_consultas_historico (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email        TEXT,
  input_original    TEXT,
  intencao          TEXT,
  status_negociacao TEXT NOT NULL DEFAULT 'pendente',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE rural_consultas_historico
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_rural_consultas_user_id      ON rural_consultas_historico (user_id);
CREATE INDEX IF NOT EXISTS idx_rural_consultas_status       ON rural_consultas_historico (status_negociacao);
CREATE INDEX IF NOT EXISTS idx_rural_consultas_created_brin ON rural_consultas_historico USING BRIN (created_at);


-- ── ATIVOS_CADASTRO ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ativos_cadastro (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id               UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  nome_propriedade      TEXT,
  aptidao               TEXT,
  area_total_hectares   NUMERIC,
  tipo_negociacao       TEXT,
  valor_por_hectare     NUMERIC,
  localizacao_municipio TEXT,
  descricao_detalhada   TEXT,
  telefone_whats        TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE ativos_cadastro
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_ativos_cadastro_user_id      ON ativos_cadastro (user_id);
CREATE INDEX IF NOT EXISTS idx_ativos_cadastro_created_brin ON ativos_cadastro USING BRIN (created_at);

-- CADASTRADOS_IMAGENS
CREATE TABLE IF NOT EXISTS cadastrados_imagens (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cadastro_id UUID NOT NULL REFERENCES ativos_cadastro(id) ON DELETE CASCADE,
  image_url   TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cadastrados_imagens_cadastro_id ON cadastrados_imagens (cadastro_id);

-- DOCUMENTOS_CADASTRO
CREATE TABLE IF NOT EXISTS documentos_cadastro (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cadastro_id UUID NOT NULL REFERENCES ativos_cadastro(id) ON DELETE CASCADE,
  doc_url     TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_documentos_cadastro_cadastro_id ON documentos_cadastro (cadastro_id);
