-- =============================================================================
-- PRYLOM — Migração: RPCs Atômicas para Publicação de Produtos
-- Execute no Supabase Dashboard > SQL Editor
-- =============================================================================
-- Objetivo: substituir o padrão delete+insert separado por operações atômicas
-- dentro de uma única transação Postgres, evitando janelas de inconsistência
-- onde produtos ficam temporariamente sem imagens/documentos.
-- =============================================================================


-- ─────────────────────────────────────────────────────────────────────────────
-- 1. upsert_produto_imagens
-- Recebe o produto_id e o array de URLs na ordem correta.
-- Apaga todas as imagens antigas e insere as novas em uma única transação.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION upsert_produto_imagens(
  p_produto_id UUID,
  p_urls       TEXT[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Não autorizado';
  END IF;

  -- Remove todas as imagens existentes do produto
  DELETE FROM produtos_imagens
  WHERE produto_id = p_produto_id;

  -- Insere as novas imagens mantendo a ordem
  IF array_length(p_urls, 1) IS NOT NULL AND array_length(p_urls, 1) > 0 THEN
    INSERT INTO produtos_imagens (produto_id, image_url, ordem)
    SELECT
      p_produto_id,
      url,
      idx::INT
    FROM unnest(p_urls) WITH ORDINALITY AS t(url, idx);
  END IF;
END;
$$;

-- Permite que o role anon (via JWT admin) invoque a função
GRANT EXECUTE ON FUNCTION upsert_produto_imagens(UUID, TEXT[]) TO anon, authenticated;


-- ─────────────────────────────────────────────────────────────────────────────
-- 2. upsert_produto_documentos
-- Recebe produto_id e um array JSONB de documentos:
--   [{ "url": "...", "autorizacao": 1, "ordem": 1 }, ...]
-- Apaga todos os documentos antigos e insere os novos atomicamente.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION upsert_produto_documentos(
  p_produto_id UUID,
  p_docs       JSONB
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Não autorizado';
  END IF;

  -- Remove todos os documentos existentes do produto
  DELETE FROM documentos_fazenda
  WHERE produto_id = p_produto_id;

  -- Insere os novos documentos se o array não estiver vazio
  IF jsonb_array_length(p_docs) > 0 THEN
    INSERT INTO documentos_fazenda (produto_id, documento_url, autorizacao, ordem)
    SELECT
      p_produto_id,
      (elem ->> 'url')::TEXT,
      (elem ->> 'autorizacao')::INT,
      (elem ->> 'ordem')::INT
    FROM jsonb_array_elements(p_docs) AS elem;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION upsert_produto_documentos(UUID, JSONB) TO anon, authenticated;
