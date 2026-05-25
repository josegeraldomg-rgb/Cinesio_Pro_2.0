-- ════════════════════════════════════════════════════════════════
-- 013_presenca_evolucao.sql
-- Presença e Evolução em Grupo
-- ════════════════════════════════════════════════════════════════

-- 1. biblioteca_exercicios já existe no schema.sql com estrutura diferente.
--    Adiciona colunas ausentes sem recriar a tabela.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'biblioteca_exercicios' AND column_name = 'grupo_muscular'
  ) THEN
    ALTER TABLE biblioteca_exercicios ADD COLUMN grupo_muscular text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'biblioteca_exercicios' AND column_name = 'nivel'
  ) THEN
    ALTER TABLE biblioteca_exercicios ADD COLUMN nivel text
      CHECK (nivel IN ('leve','moderado','intenso'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'biblioteca_exercicios' AND column_name = 'descricao'
  ) THEN
    ALTER TABLE biblioteca_exercicios ADD COLUMN descricao text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'biblioteca_exercicios' AND column_name = 'empresa_id'
  ) THEN
    ALTER TABLE biblioteca_exercicios
      ADD COLUMN empresa_id uuid REFERENCES empresas(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 2. sequencias_aula já existe no schema.sql com estrutura diferente (sem empresa_id).
--    Adiciona colunas ausentes.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sequencias_aula' AND column_name = 'empresa_id'
  ) THEN
    ALTER TABLE sequencias_aula
      ADD COLUMN empresa_id uuid REFERENCES empresas(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sequencias_aula' AND column_name = 'descricao'
  ) THEN
    ALTER TABLE sequencias_aula ADD COLUMN descricao text;
  END IF;

  -- Garante que a coluna exercicios existe como jsonb
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sequencias_aula' AND column_name = 'exercicios'
  ) THEN
    ALTER TABLE sequencias_aula ADD COLUMN exercicios jsonb NOT NULL DEFAULT '[]';
  END IF;
END $$;

-- 3. Extender turma_sessoes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'turma_sessoes' AND column_name = 'sequencia_id'
  ) THEN
    ALTER TABLE turma_sessoes
      ADD COLUMN sequencia_id uuid REFERENCES sequencias_aula(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'turma_sessoes' AND column_name = 'evolucao_padrao'
  ) THEN
    ALTER TABLE turma_sessoes ADD COLUMN evolucao_padrao text;
  END IF;
END $$;

-- 4. Extender turma_presencas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'turma_presencas' AND column_name = 'evolucao_individual'
  ) THEN
    ALTER TABLE turma_presencas ADD COLUMN evolucao_individual text;
  END IF;
END $$;

-- 5. Atualizar CHECK constraint de status em turma_presencas
DO $$
DECLARE
  cname text;
BEGIN
  SELECT conname INTO cname
  FROM pg_constraint
  WHERE conrelid = 'turma_presencas'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) LIKE '%status%';

  IF cname IS NOT NULL THEN
    EXECUTE 'ALTER TABLE turma_presencas DROP CONSTRAINT ' || quote_ident(cname);
  END IF;

  ALTER TABLE turma_presencas
    ADD CONSTRAINT turma_presencas_status_check
    CHECK (status IN ('presente','faltou','justificado','falta','falta_justificada'));
END $$;

-- 6. Créditos de reposição
CREATE TABLE IF NOT EXISTS creditos_reposicao (
  id             uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id     uuid        NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  paciente_id    uuid        NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  turma_id       uuid        REFERENCES turmas(id) ON DELETE SET NULL,
  sessao_id      uuid        REFERENCES turma_sessoes(id) ON DELETE SET NULL,
  motivo         text,
  data_expiracao date        NOT NULL,
  utilizado      boolean     NOT NULL DEFAULT false,
  criado_em      timestamptz NOT NULL DEFAULT now()
);

-- Índices (só criados se a coluna existir)
CREATE INDEX IF NOT EXISTS idx_bib_ex_empresa   ON biblioteca_exercicios(empresa_id);
CREATE INDEX IF NOT EXISTS idx_seq_aula_empresa  ON sequencias_aula(empresa_id);
CREATE INDEX IF NOT EXISTS idx_creditos_paciente ON creditos_reposicao(paciente_id, utilizado);
CREATE INDEX IF NOT EXISTS idx_creditos_empresa  ON creditos_reposicao(empresa_id);
