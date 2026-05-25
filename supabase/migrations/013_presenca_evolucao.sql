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

-- 3. Extender turma_sessoes
ALTER TABLE turma_sessoes
  ADD COLUMN IF NOT EXISTS sequencia_id    uuid REFERENCES sequencias_aula(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS evolucao_padrao text;

-- 4. Extender turma_presencas
ALTER TABLE turma_presencas
  ADD COLUMN IF NOT EXISTS evolucao_individual text;

-- 5. Créditos de reposição (previsto em schema.sql, garante existência)
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
