-- ════════════════════════════════════════════════════════════════
-- 015_sequencias_sistema.sql
-- Permite sequências padrão do sistema (empresa_id nullable + is_sistema)
-- ════════════════════════════════════════════════════════════════

DO $$
BEGIN
  -- Torna empresa_id nullable para suportar sequências do sistema
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sequencias_aula'
      AND column_name = 'empresa_id'
      AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE sequencias_aula ALTER COLUMN empresa_id DROP NOT NULL;
  END IF;

  -- Adiciona is_sistema
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sequencias_aula' AND column_name = 'is_sistema'
  ) THEN
    ALTER TABLE sequencias_aula ADD COLUMN is_sistema boolean NOT NULL DEFAULT false;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_seq_aula_sistema ON sequencias_aula(is_sistema);
