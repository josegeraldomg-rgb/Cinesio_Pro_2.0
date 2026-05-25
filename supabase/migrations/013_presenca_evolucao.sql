-- ════════════════════════════════════════════════════════════════
-- 013_presenca_evolucao.sql
-- Presença e Evolução em Grupo — biblioteca de exercícios,
-- sequências de aula, créditos de reposição, extensões de presença
-- ════════════════════════════════════════════════════════════════

-- 1. Biblioteca de exercícios
CREATE TABLE IF NOT EXISTS biblioteca_exercicios (
  id             uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id     uuid        NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  nome           text        NOT NULL,
  descricao      text,
  grupo_muscular text,
  nivel          text        CHECK (nivel IN ('leve','moderado','intenso')),
  instrucoes     text,
  criado_em      timestamptz NOT NULL DEFAULT now()
);

-- 2. Sequências de aula (conjunto ordenado de exercícios)
CREATE TABLE IF NOT EXISTS sequencias_aula (
  id         uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id uuid        NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  nome       text        NOT NULL,
  descricao  text,
  -- [{exercicio_id, nome_exercicio, series, repeticoes, carga, obs}]
  exercicios jsonb       NOT NULL DEFAULT '[]',
  criado_em  timestamptz NOT NULL DEFAULT now()
);

-- 3. Extender turma_sessoes (só se a coluna não existir)
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

-- 4. Extender turma_presencas — adicionar evolucao_individual
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'turma_presencas' AND column_name = 'evolucao_individual'
  ) THEN
    ALTER TABLE turma_presencas ADD COLUMN evolucao_individual text;
  END IF;
END $$;

-- 5. Atualizar CHECK constraint de status em turma_presencas para incluir novos valores
--    (presente, faltou, justificado além dos originais)
DO $$
DECLARE
  constraint_name text;
BEGIN
  SELECT conname INTO constraint_name
  FROM pg_constraint
  WHERE conrelid = 'turma_presencas'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) LIKE '%status%';

  IF constraint_name IS NOT NULL THEN
    EXECUTE 'ALTER TABLE turma_presencas DROP CONSTRAINT ' || quote_ident(constraint_name);
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

-- Índices
CREATE INDEX IF NOT EXISTS idx_bib_ex_empresa      ON biblioteca_exercicios(empresa_id);
CREATE INDEX IF NOT EXISTS idx_seq_aula_empresa    ON sequencias_aula(empresa_id);
CREATE INDEX IF NOT EXISTS idx_creditos_paciente   ON creditos_reposicao(paciente_id, utilizado);
CREATE INDEX IF NOT EXISTS idx_creditos_empresa    ON creditos_reposicao(empresa_id);
