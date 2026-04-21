-- =============================================================================
-- PRYLOM — DDL Part 1: Extensões + tabelas do catálogo principal
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- PROFILES
CREATE TABLE IF NOT EXISTS profiles (
  id        UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone     TEXT,
  cpf_cnpj  TEXT
);

-- PRODUTOS
CREATE TABLE IF NOT EXISTS produtos (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  codigo         TEXT UNIQUE,
  titulo         TEXT NOT NULL,
  descricao      TEXT,
  categoria      TEXT NOT NULL,
  subcategoria   TEXT,
  valor          NUMERIC,
  unidade        TEXT,
  quantidade     NUMERIC,
  estado         TEXT,
  cidade         TEXT,
  status         TEXT NOT NULL DEFAULT 'ativo',
  destaque       BOOLEAN NOT NULL DEFAULT FALSE,
  certificacao   BOOLEAN NOT NULL DEFAULT FALSE,
  tipo_transacao TEXT NOT NULL DEFAULT 'venda',
  vendido_prylom BOOLEAN NOT NULL DEFAULT FALSE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_produtos_categoria    ON produtos (categoria);
CREATE INDEX IF NOT EXISTS idx_produtos_status       ON produtos (status);
CREATE INDEX IF NOT EXISTS idx_produtos_estado       ON produtos (estado);
CREATE INDEX IF NOT EXISTS idx_produtos_destaque     ON produtos (destaque) WHERE destaque = TRUE;
CREATE INDEX IF NOT EXISTS idx_produtos_created_brin ON produtos USING BRIN (created_at);

-- FAZENDAS
CREATE TABLE IF NOT EXISTS fazendas (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  produto_id            UUID NOT NULL UNIQUE REFERENCES produtos(id) ON DELETE CASCADE,
  nome_fazenda          TEXT,
  area_total_ha         NUMERIC,
  area_lavoura_ha       NUMERIC,
  aptidao               TEXT,
  teor_argila           NUMERIC,
  topografia            TEXT,
  precipitacao_mm       NUMERIC,
  altitude_m            NUMERIC,
  km_asfalto            NUMERIC,
  reserva_legal         TEXT,
  permuta               TEXT,
  comissao              TEXT,
  sit_doc               TEXT,
  proprietario          TEXT,
  telefone_proprietario TEXT,
  email_proprietario    TEXT,
  corretor              TEXT,
  corretor_id           UUID,
  telefone_corretor     TEXT,
  email_corretor        TEXT,
  estado_corretor       TEXT,
  tipo_anuncio          TEXT,
  relevancia_anuncio    TEXT,
  portal_parceiro       JSONB,
  media_argila_estado   NUMERIC,
  media_pluvio_estado   NUMERIC,
  media_altitude_estado NUMERIC,
  media_relevo_estado   TEXT
);

CREATE INDEX IF NOT EXISTS idx_fazendas_produto_id  ON fazendas (produto_id);
CREATE INDEX IF NOT EXISTS idx_fazendas_aptidao     ON fazendas (aptidao);
CREATE INDEX IF NOT EXISTS idx_fazendas_corretor_id ON fazendas (corretor_id);

-- MAQUINAS
CREATE TABLE IF NOT EXISTS maquinas (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  produto_id           UUID NOT NULL UNIQUE REFERENCES produtos(id) ON DELETE CASCADE,
  marca                TEXT,
  modelo               TEXT,
  ano                  INTEGER,
  horas_trabalhadas    NUMERIC,
  potencia             NUMERIC,
  estado_conservacao   TEXT,
  agricultura_precisao TEXT,
  combustivel          TEXT
);

CREATE INDEX IF NOT EXISTS idx_maquinas_produto_id ON maquinas (produto_id);

-- AVIOES
CREATE TABLE IF NOT EXISTS avioes (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  produto_id      UUID NOT NULL UNIQUE REFERENCES produtos(id) ON DELETE CASCADE,
  fabricante      TEXT,
  modelo          TEXT,
  ano             INTEGER,
  horas_voo       NUMERIC,
  tipo_operacao   TEXT,
  homologado_anac TEXT
);

CREATE INDEX IF NOT EXISTS idx_avioes_produto_id ON avioes (produto_id);

-- GRAOS
CREATE TABLE IF NOT EXISTS graos (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  produto_id        UUID NOT NULL UNIQUE REFERENCES produtos(id) ON DELETE CASCADE,
  cultura           TEXT,
  safra             TEXT,
  qualidade         TEXT,
  estoque_toneladas NUMERIC
);

CREATE INDEX IF NOT EXISTS idx_graos_produto_id ON graos (produto_id);

-- ARRENDAMENTOS
CREATE TABLE IF NOT EXISTS arrendamentos (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  produto_id          UUID NOT NULL UNIQUE REFERENCES produtos(id) ON DELETE CASCADE,
  ativo               BOOLEAN NOT NULL DEFAULT TRUE,
  cultura_base        TEXT,
  modalidade          TEXT,
  aptidao             TEXT,
  area_total          NUMERIC,
  area_minima         NUMERIC,
  area_maxima         NUMERIC,
  qt_safras           INTEGER,
  mes_inicio_colheita TEXT
);

CREATE INDEX IF NOT EXISTS idx_arrendamentos_produto_id ON arrendamentos (produto_id);
CREATE INDEX IF NOT EXISTS idx_arrendamentos_ativo      ON arrendamentos (ativo) WHERE ativo = TRUE;

-- PRODUTOS_IMAGENS
CREATE TABLE IF NOT EXISTS produtos_imagens (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  produto_id UUID NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
  image_url  TEXT NOT NULL,
  ordem      INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_produtos_imagens_produto_id ON produtos_imagens (produto_id, ordem);

-- PRODUTOS_AUDIOS
CREATE TABLE IF NOT EXISTS produtos_audios (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  produto_id UUID NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
  audio_url  TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_produtos_audios_produto_id ON produtos_audios (produto_id);

-- DOCUMENTOS_FAZENDA
CREATE TABLE IF NOT EXISTS documentos_fazenda (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  produto_id    UUID NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
  documento_url TEXT NOT NULL,
  autorizacao   TEXT NOT NULL DEFAULT '0',
  ordem         INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_documentos_fazenda_produto_id ON documentos_fazenda (produto_id);

-- SHARE_TOKENS
CREATE TABLE IF NOT EXISTS share_tokens (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  produto_id     UUID NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
  recipient_name TEXT,
  phone          TEXT,
  email          TEXT,
  expires_at     TIMESTAMPTZ NOT NULL,
  revogado       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_share_tokens_produto_id ON share_tokens (produto_id);
CREATE INDEX IF NOT EXISTS idx_share_tokens_email      ON share_tokens (email) WHERE revogado = FALSE;
CREATE INDEX IF NOT EXISTS idx_share_tokens_expires_at ON share_tokens (expires_at) WHERE revogado = FALSE;

-- CORRETORES
CREATE TABLE IF NOT EXISTS corretores (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome       TEXT NOT NULL,
  estado     TEXT,
  telefone   TEXT,
  email      TEXT,
  creci      TEXT,
  foto_url   TEXT,
  cargo      TEXT,
  descricao  TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
