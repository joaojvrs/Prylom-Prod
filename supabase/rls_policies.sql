-- =============================================================================
-- PRYLOM — Row Level Security Policies
-- Execute este script no SQL Editor do Supabase (Settings > SQL Editor)
-- =============================================================================

-- Helper: verifica se o usuário tem role = 'admin' no app_metadata do JWT
-- Funciona para múltiplos admins sem hardcoding de email
-- Para marcar um admin: Supabase Dashboard > Authentication > Users
--   → clique no usuário → Edit user → app_metadata: {"role": "admin"}
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT coalesce(
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin',
    false
  )
$$;


-- =============================================================================
-- TABELA: produtos
-- SELECT público (produtos ativos), escrita restrita ao admin
-- =============================================================================
ALTER TABLE produtos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "produtos_select_public" ON produtos;
CREATE POLICY "produtos_select_public"
  ON produtos FOR SELECT
  USING (status = 'ativo' OR is_admin());

DROP POLICY IF EXISTS "produtos_insert_admin" ON produtos;
CREATE POLICY "produtos_insert_admin"
  ON produtos FOR INSERT
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "produtos_update_admin" ON produtos;
CREATE POLICY "produtos_update_admin"
  ON produtos FOR UPDATE
  USING (is_admin());

DROP POLICY IF EXISTS "produtos_delete_admin" ON produtos;
CREATE POLICY "produtos_delete_admin"
  ON produtos FOR DELETE
  USING (is_admin());


-- =============================================================================
-- TABELA: produtos_imagens
-- SELECT público, escrita restrita ao admin
-- =============================================================================
ALTER TABLE produtos_imagens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "produtos_imagens_select_public" ON produtos_imagens;
CREATE POLICY "produtos_imagens_select_public"
  ON produtos_imagens FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "produtos_imagens_insert_admin" ON produtos_imagens;
CREATE POLICY "produtos_imagens_insert_admin"
  ON produtos_imagens FOR INSERT
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "produtos_imagens_update_admin" ON produtos_imagens;
CREATE POLICY "produtos_imagens_update_admin"
  ON produtos_imagens FOR UPDATE
  USING (is_admin());

DROP POLICY IF EXISTS "produtos_imagens_delete_admin" ON produtos_imagens;
CREATE POLICY "produtos_imagens_delete_admin"
  ON produtos_imagens FOR DELETE
  USING (is_admin());


-- =============================================================================
-- TABELA: fazendas
-- SELECT público (dados técnicos visíveis no detalhe do produto)
-- =============================================================================
ALTER TABLE fazendas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "fazendas_select_public" ON fazendas;
CREATE POLICY "fazendas_select_public"
  ON fazendas FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "fazendas_insert_admin" ON fazendas;
CREATE POLICY "fazendas_insert_admin"
  ON fazendas FOR INSERT
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "fazendas_update_admin" ON fazendas;
CREATE POLICY "fazendas_update_admin"
  ON fazendas FOR UPDATE
  USING (is_admin());

DROP POLICY IF EXISTS "fazendas_delete_admin" ON fazendas;
CREATE POLICY "fazendas_delete_admin"
  ON fazendas FOR DELETE
  USING (is_admin());


-- =============================================================================
-- TABELA: maquinas
-- =============================================================================
ALTER TABLE maquinas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "maquinas_select_public" ON maquinas;
CREATE POLICY "maquinas_select_public"
  ON maquinas FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "maquinas_insert_admin" ON maquinas;
CREATE POLICY "maquinas_insert_admin"
  ON maquinas FOR INSERT
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "maquinas_update_admin" ON maquinas;
CREATE POLICY "maquinas_update_admin"
  ON maquinas FOR UPDATE
  USING (is_admin());

DROP POLICY IF EXISTS "maquinas_delete_admin" ON maquinas;
CREATE POLICY "maquinas_delete_admin"
  ON maquinas FOR DELETE
  USING (is_admin());


-- =============================================================================
-- TABELA: avioes
-- =============================================================================
ALTER TABLE avioes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "avioes_select_public" ON avioes;
CREATE POLICY "avioes_select_public"
  ON avioes FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "avioes_insert_admin" ON avioes;
CREATE POLICY "avioes_insert_admin"
  ON avioes FOR INSERT
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "avioes_update_admin" ON avioes;
CREATE POLICY "avioes_update_admin"
  ON avioes FOR UPDATE
  USING (is_admin());

DROP POLICY IF EXISTS "avioes_delete_admin" ON avioes;
CREATE POLICY "avioes_delete_admin"
  ON avioes FOR DELETE
  USING (is_admin());


-- =============================================================================
-- TABELA: graos
-- =============================================================================
ALTER TABLE graos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "graos_select_public" ON graos;
CREATE POLICY "graos_select_public"
  ON graos FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "graos_insert_admin" ON graos;
CREATE POLICY "graos_insert_admin"
  ON graos FOR INSERT
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "graos_update_admin" ON graos;
CREATE POLICY "graos_update_admin"
  ON graos FOR UPDATE
  USING (is_admin());

DROP POLICY IF EXISTS "graos_delete_admin" ON graos;
CREATE POLICY "graos_delete_admin"
  ON graos FOR DELETE
  USING (is_admin());


-- =============================================================================
-- TABELA: arrendamentos
-- =============================================================================
ALTER TABLE arrendamentos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "arrendamentos_select_public" ON arrendamentos;
CREATE POLICY "arrendamentos_select_public"
  ON arrendamentos FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "arrendamentos_insert_admin" ON arrendamentos;
CREATE POLICY "arrendamentos_insert_admin"
  ON arrendamentos FOR INSERT
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "arrendamentos_update_admin" ON arrendamentos;
CREATE POLICY "arrendamentos_update_admin"
  ON arrendamentos FOR UPDATE
  USING (is_admin());

DROP POLICY IF EXISTS "arrendamentos_delete_admin" ON arrendamentos;
CREATE POLICY "arrendamentos_delete_admin"
  ON arrendamentos FOR DELETE
  USING (is_admin());


-- =============================================================================
-- TABELA: corretores
-- SELECT público (nome do corretor aparece no detalhe do produto)
-- =============================================================================
ALTER TABLE corretores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "corretores_select_public" ON corretores;
CREATE POLICY "corretores_select_public"
  ON corretores FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "corretores_insert_admin" ON corretores;
CREATE POLICY "corretores_insert_admin"
  ON corretores FOR INSERT
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "corretores_update_admin" ON corretores;
CREATE POLICY "corretores_update_admin"
  ON corretores FOR UPDATE
  USING (is_admin());

DROP POLICY IF EXISTS "corretores_delete_admin" ON corretores;
CREATE POLICY "corretores_delete_admin"
  ON corretores FOR DELETE
  USING (is_admin());


-- =============================================================================
-- TABELA: documentos_fazenda
-- Apenas usuários autenticados leem (documentos sensíveis), apenas admin escreve
-- =============================================================================
ALTER TABLE documentos_fazenda ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "documentos_fazenda_select_auth" ON documentos_fazenda;
CREATE POLICY "documentos_fazenda_select_auth"
  ON documentos_fazenda FOR SELECT
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "documentos_fazenda_insert_admin" ON documentos_fazenda;
CREATE POLICY "documentos_fazenda_insert_admin"
  ON documentos_fazenda FOR INSERT
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "documentos_fazenda_update_admin" ON documentos_fazenda;
CREATE POLICY "documentos_fazenda_update_admin"
  ON documentos_fazenda FOR UPDATE
  USING (is_admin());

DROP POLICY IF EXISTS "documentos_fazenda_delete_admin" ON documentos_fazenda;
CREATE POLICY "documentos_fazenda_delete_admin"
  ON documentos_fazenda FOR DELETE
  USING (is_admin());


-- =============================================================================
-- TABELA: favorites
-- Cada usuário só acessa os próprios favoritos
-- =============================================================================
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


-- =============================================================================
-- TABELA: share_tokens
-- Apenas admin gerencia tokens; validação é feita via RPC (SECURITY DEFINER)
-- =============================================================================
ALTER TABLE share_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "share_tokens_admin_all" ON share_tokens;
CREATE POLICY "share_tokens_admin_all"
  ON share_tokens
  USING (is_admin())
  WITH CHECK (is_admin());


-- =============================================================================
-- TABELA: ativos_cadastro
-- INSERT público (formulário de cadastro), leitura e gestão apenas admin
-- =============================================================================
ALTER TABLE ativos_cadastro ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ativos_cadastro_insert_public" ON ativos_cadastro;
CREATE POLICY "ativos_cadastro_insert_public"
  ON ativos_cadastro FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "ativos_cadastro_select_admin" ON ativos_cadastro;
CREATE POLICY "ativos_cadastro_select_admin"
  ON ativos_cadastro FOR SELECT
  USING (is_admin());

DROP POLICY IF EXISTS "ativos_cadastro_update_admin" ON ativos_cadastro;
CREATE POLICY "ativos_cadastro_update_admin"
  ON ativos_cadastro FOR UPDATE
  USING (is_admin());

DROP POLICY IF EXISTS "ativos_cadastro_delete_admin" ON ativos_cadastro;
CREATE POLICY "ativos_cadastro_delete_admin"
  ON ativos_cadastro FOR DELETE
  USING (is_admin());


-- =============================================================================
-- TABELA: cadastrados_imagens
-- INSERT público (upload durante cadastro), leitura apenas admin
-- =============================================================================
ALTER TABLE cadastrados_imagens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cadastrados_imagens_insert_public" ON cadastrados_imagens;
CREATE POLICY "cadastrados_imagens_insert_public"
  ON cadastrados_imagens FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "cadastrados_imagens_select_admin" ON cadastrados_imagens;
CREATE POLICY "cadastrados_imagens_select_admin"
  ON cadastrados_imagens FOR SELECT
  USING (is_admin());

DROP POLICY IF EXISTS "cadastrados_imagens_delete_admin" ON cadastrados_imagens;
CREATE POLICY "cadastrados_imagens_delete_admin"
  ON cadastrados_imagens FOR DELETE
  USING (is_admin());


-- =============================================================================
-- TABELA: documentos_cadastro
-- INSERT público (upload durante cadastro), leitura apenas admin
-- =============================================================================
ALTER TABLE documentos_cadastro ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "documentos_cadastro_insert_public" ON documentos_cadastro;
CREATE POLICY "documentos_cadastro_insert_public"
  ON documentos_cadastro FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "documentos_cadastro_select_admin" ON documentos_cadastro;
CREATE POLICY "documentos_cadastro_select_admin"
  ON documentos_cadastro FOR SELECT
  USING (is_admin());

DROP POLICY IF EXISTS "documentos_cadastro_delete_admin" ON documentos_cadastro;
CREATE POLICY "documentos_cadastro_delete_admin"
  ON documentos_cadastro FOR DELETE
  USING (is_admin());


-- =============================================================================
-- TABELA: protocols_national  ⚠️ DADOS SENSÍVEIS (CPF, email, telefone, PEP)
-- INSERT público (formulário DataRoom), SELECT/UPDATE/DELETE apenas admin
-- =============================================================================
ALTER TABLE protocols_national ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "protocols_national_insert_public" ON protocols_national;
CREATE POLICY "protocols_national_insert_public"
  ON protocols_national FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "protocols_national_select_admin" ON protocols_national;
CREATE POLICY "protocols_national_select_admin"
  ON protocols_national FOR SELECT
  USING (is_admin());

DROP POLICY IF EXISTS "protocols_national_update_admin" ON protocols_national;
CREATE POLICY "protocols_national_update_admin"
  ON protocols_national FOR UPDATE
  USING (is_admin());

DROP POLICY IF EXISTS "protocols_national_delete_admin" ON protocols_national;
CREATE POLICY "protocols_national_delete_admin"
  ON protocols_national FOR DELETE
  USING (is_admin());


-- =============================================================================
-- TABELA: protocols_international  ⚠️ DADOS SENSÍVEIS (investidores internacionais)
-- =============================================================================
ALTER TABLE protocols_international ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "protocols_international_insert_public" ON protocols_international;
CREATE POLICY "protocols_international_insert_public"
  ON protocols_international FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "protocols_international_select_admin" ON protocols_international;
CREATE POLICY "protocols_international_select_admin"
  ON protocols_international FOR SELECT
  USING (is_admin());

DROP POLICY IF EXISTS "protocols_international_update_admin" ON protocols_international;
CREATE POLICY "protocols_international_update_admin"
  ON protocols_international FOR UPDATE
  USING (is_admin());

DROP POLICY IF EXISTS "protocols_international_delete_admin" ON protocols_international;
CREATE POLICY "protocols_international_delete_admin"
  ON protocols_international FOR DELETE
  USING (is_admin());


-- =============================================================================
-- TABELA: private_protocols  ⚠️ DADOS MAIS SENSÍVEIS (mandatos, passaportes)
-- =============================================================================
ALTER TABLE private_protocols ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "private_protocols_insert_public" ON private_protocols;
CREATE POLICY "private_protocols_insert_public"
  ON private_protocols FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "private_protocols_select_admin" ON private_protocols;
CREATE POLICY "private_protocols_select_admin"
  ON private_protocols FOR SELECT
  USING (is_admin());

DROP POLICY IF EXISTS "private_protocols_update_admin" ON private_protocols;
CREATE POLICY "private_protocols_update_admin"
  ON private_protocols FOR UPDATE
  USING (is_admin());

DROP POLICY IF EXISTS "private_protocols_delete_admin" ON private_protocols;
CREATE POLICY "private_protocols_delete_admin"
  ON private_protocols FOR DELETE
  USING (is_admin());


-- =============================================================================
-- STORAGE BUCKETS — Políticas de acesso
-- Execute separadamente via Supabase Dashboard > Storage > Policies
-- ou via SQL conforme abaixo
-- =============================================================================

-- Bucket: produtos (imagens públicas dos produtos)
INSERT INTO storage.buckets (id, name, public)
VALUES ('produtos', 'produtos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "storage_produtos_select_public" ON storage.objects;
CREATE POLICY "storage_produtos_select_public"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'produtos');

DROP POLICY IF EXISTS "storage_produtos_insert_admin" ON storage.objects;
CREATE POLICY "storage_produtos_insert_admin"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'produtos' AND is_admin());

DROP POLICY IF EXISTS "storage_produtos_delete_admin" ON storage.objects;
CREATE POLICY "storage_produtos_delete_admin"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'produtos' AND is_admin());

-- Bucket: documentos_fazenda (documentos privados)
INSERT INTO storage.buckets (id, name, public)
VALUES ('documentos_fazenda', 'documentos_fazenda', false)
ON CONFLICT (id) DO UPDATE SET public = false;

DROP POLICY IF EXISTS "storage_docs_select_auth" ON storage.objects;
CREATE POLICY "storage_docs_select_auth"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'documentos_fazenda' AND auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "storage_docs_insert_admin" ON storage.objects;
CREATE POLICY "storage_docs_insert_admin"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'documentos_fazenda' AND is_admin());

DROP POLICY IF EXISTS "storage_docs_delete_admin" ON storage.objects;
CREATE POLICY "storage_docs_delete_admin"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'documentos_fazenda' AND is_admin());

-- Bucket: kyc-documents  ⚠️ PRIVADO — passaportes e documentos de identidade
-- NUNCA deve ser público. Acesso apenas via admin.
INSERT INTO storage.buckets (id, name, public)
VALUES ('kyc-documents', 'kyc-documents', false)
ON CONFLICT (id) DO UPDATE SET public = false;

DROP POLICY IF EXISTS "storage_kyc_select_admin" ON storage.objects;
CREATE POLICY "storage_kyc_select_admin"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'kyc-documents' AND is_admin());

DROP POLICY IF EXISTS "storage_kyc_insert_public" ON storage.objects;
CREATE POLICY "storage_kyc_insert_public"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'kyc-documents');

DROP POLICY IF EXISTS "storage_kyc_delete_admin" ON storage.objects;
CREATE POLICY "storage_kyc_delete_admin"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'kyc-documents' AND is_admin());
