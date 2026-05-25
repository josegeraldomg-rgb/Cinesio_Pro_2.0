-- ════════════════════════════════════════════════════════════════
-- 014_biblioteca_exercicios.sql
-- Biblioteca de Exercícios expandida + Planejamento Semanal + Planos de Tratamento
-- ════════════════════════════════════════════════════════════════

-- 1. Novos campos em biblioteca_exercicios
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'biblioteca_exercicios' AND column_name = 'objetivo') THEN
    ALTER TABLE biblioteca_exercicios ADD COLUMN objetivo text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'biblioteca_exercicios' AND column_name = 'regiao_corporal') THEN
    ALTER TABLE biblioteca_exercicios ADD COLUMN regiao_corporal text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'biblioteca_exercicios' AND column_name = 'aparelho') THEN
    ALTER TABLE biblioteca_exercicios ADD COLUMN aparelho text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'biblioteca_exercicios' AND column_name = 'duracao_segundos') THEN
    ALTER TABLE biblioteca_exercicios ADD COLUMN duracao_segundos int;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'biblioteca_exercicios' AND column_name = 'series_padrao') THEN
    ALTER TABLE biblioteca_exercicios ADD COLUMN series_padrao int;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'biblioteca_exercicios' AND column_name = 'repeticoes_padrao') THEN
    ALTER TABLE biblioteca_exercicios ADD COLUMN repeticoes_padrao text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'biblioteca_exercicios' AND column_name = 'is_sistema') THEN
    ALTER TABLE biblioteca_exercicios ADD COLUMN is_sistema boolean NOT NULL DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'biblioteca_exercicios' AND column_name = 'imagem_url') THEN
    ALTER TABLE biblioteca_exercicios ADD COLUMN imagem_url text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'biblioteca_exercicios' AND column_name = 'video_url') THEN
    ALTER TABLE biblioteca_exercicios ADD COLUMN video_url text;
  END IF;
END $$;

-- 2. Planejamento semanal por slot de turma
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'turma_slots' AND column_name = 'sequencia_padrao_id') THEN
    ALTER TABLE turma_slots
      ADD COLUMN sequencia_padrao_id uuid REFERENCES sequencias_aula(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 3. Planos de tratamento (prescrição de exercícios para pacientes)
CREATE TABLE IF NOT EXISTS planos_exercicios (
  id              uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id      uuid        NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  paciente_id     uuid        NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  profissional_id uuid        REFERENCES profissionais(id) ON DELETE SET NULL,
  nome            text        NOT NULL,
  descricao       text,
  exercicios      jsonb       NOT NULL DEFAULT '[]',
  frequencia      text,
  data_inicio     date        NOT NULL DEFAULT CURRENT_DATE,
  data_fim        date,
  ativo           boolean     NOT NULL DEFAULT true,
  criado_em       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_planos_ex_paciente ON planos_exercicios(paciente_id);
CREATE INDEX IF NOT EXISTS idx_planos_ex_empresa  ON planos_exercicios(empresa_id);
CREATE INDEX IF NOT EXISTS idx_bib_ex_sistema     ON biblioteca_exercicios(is_sistema);
