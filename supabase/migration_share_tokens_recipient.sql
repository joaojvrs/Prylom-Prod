-- =============================================================================
-- MIGRAÇÃO: adiciona coluna recipient_name na tabela share_tokens
-- Execute este script no SQL Editor do Supabase
-- =============================================================================

ALTER TABLE share_tokens
  ADD COLUMN IF NOT EXISTS recipient_name TEXT;
