-- ════════════════════════════════════════════════════════════════
-- 012_turmas.sql
-- Módulo de Gestão de Turmas (aulas coletivas)
-- ════════════════════════════════════════════════════════════════

-- 1. TURMAS — definição da aula coletiva
CREATE TABLE IF NOT EXISTS turmas (
  id                        uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id                uuid        NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  nome                      text        NOT NULL,
  descricao                 text,
  profissional_id           uuid        REFERENCES profissionais(id) ON DELETE SET NULL,
  sala_id                   uuid        REFERENCES salas(id) ON DELETE SET NULL,
  servico_id                uuid        REFERENCES servicos(id) ON DELETE SET NULL,
  nivel                     text        NOT NULL DEFAULT 'livre'
                                        CHECK (nivel IN ('iniciante','intermediario','avancado','livre')),
  capacidade_slot int        NOT NULL DEFAULT 10,
  data_inicio               date        NOT NULL,
  data_fim                  date,
  ativo                     boolean     NOT NULL DEFAULT true,
  observacoes               text,
  criado_em                 timestamptz NOT NULL DEFAULT now()
);

-- 2. TURMA_SLOTS — horários disponíveis dentro da turma
CREATE TABLE IF NOT EXISTS turma_slots (
  id                  uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  turma_id            uuid        NOT NULL REFERENCES turmas(id) ON DELETE CASCADE,
  empresa_id          uuid        NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  dia_semana          int         NOT NULL CHECK (dia_semana BETWEEN 0 AND 6),
  hora_inicio         text        NOT NULL,
  hora_fim            text        NOT NULL,
  duracao_minutos     int         NOT NULL,
  sala_id             uuid        REFERENCES salas(id) ON DELETE SET NULL,
  profissional_id     uuid        REFERENCES profissionais(id) ON DELETE SET NULL,
  capacidade_maxima   int,        -- null = herda da turma
  ativo               boolean     NOT NULL DEFAULT true,
  criado_em           timestamptz NOT NULL DEFAULT now()
);

-- 3. TURMA_PLANOS — pacotes de preço por frequência semanal
CREATE TABLE IF NOT EXISTS turma_planos (
  id                  uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  turma_id            uuid        NOT NULL REFERENCES turmas(id) ON DELETE CASCADE,
  empresa_id          uuid        NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  nome                text        NOT NULL,
  frequencia_semanal  int         NOT NULL CHECK (frequencia_semanal BETWEEN 1 AND 7),
  valor_mensal        numeric(10,2) NOT NULL DEFAULT 0,
  criado_em           timestamptz NOT NULL DEFAULT now()
);

-- 4. TURMA_MATRICULAS — inscrição de aluno na turma
CREATE TABLE IF NOT EXISTS turma_matriculas (
  id                  uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  turma_id            uuid        NOT NULL REFERENCES turmas(id) ON DELETE CASCADE,
  paciente_id         uuid        NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  plano_id            uuid        REFERENCES turma_planos(id) ON DELETE SET NULL,
  empresa_id          uuid        NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  data_matricula      date        NOT NULL DEFAULT CURRENT_DATE,
  data_saida          date,
  status              text        NOT NULL DEFAULT 'ativo'
                                  CHECK (status IN ('ativo','pausado','encerrado')),
  observacoes         text,
  criado_em           timestamptz NOT NULL DEFAULT now(),
  UNIQUE (turma_id, paciente_id)
);

-- 5. TURMA_MATRICULA_SLOTS — quais slots o aluno escolheu
CREATE TABLE IF NOT EXISTS turma_matricula_slots (
  id                  uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  matricula_id        uuid        NOT NULL REFERENCES turma_matriculas(id) ON DELETE CASCADE,
  slot_id             uuid        NOT NULL REFERENCES turma_slots(id) ON DELETE CASCADE,
  empresa_id          uuid        NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  criado_em           timestamptz NOT NULL DEFAULT now(),
  UNIQUE (matricula_id, slot_id)
);

-- 6. TURMA_SESSOES — cada ocorrência real de aula (gerada por slot)
CREATE TABLE IF NOT EXISTS turma_sessoes (
  id                  uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  slot_id             uuid        NOT NULL REFERENCES turma_slots(id) ON DELETE CASCADE,
  turma_id            uuid        NOT NULL REFERENCES turmas(id) ON DELETE CASCADE,
  empresa_id          uuid        NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  data_hora           timestamptz NOT NULL,
  duracao_minutos     int         NOT NULL,
  status              text        NOT NULL DEFAULT 'agendada'
                                  CHECK (status IN ('agendada','realizada','cancelada')),
  observacoes         text,
  criado_em           timestamptz NOT NULL DEFAULT now()
);

-- 7. TURMA_PRESENCAS — chamada por sessão
CREATE TABLE IF NOT EXISTS turma_presencas (
  id                  uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  sessao_id           uuid        NOT NULL REFERENCES turma_sessoes(id) ON DELETE CASCADE,
  paciente_id         uuid        NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  empresa_id          uuid        NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  status              text        NOT NULL DEFAULT 'presente'
                                  CHECK (status IN ('presente','falta','falta_justificada')),
  observacoes         text,
  registrado_em       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (sessao_id, paciente_id)
);

-- ─── Índices ─────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_turmas_empresa          ON turmas(empresa_id);
CREATE INDEX IF NOT EXISTS idx_turma_slots_turma       ON turma_slots(turma_id);
CREATE INDEX IF NOT EXISTS idx_turma_planos_turma      ON turma_planos(turma_id);
CREATE INDEX IF NOT EXISTS idx_turma_matriculas_turma  ON turma_matriculas(turma_id);
CREATE INDEX IF NOT EXISTS idx_turma_matriculas_pac    ON turma_matriculas(paciente_id);
CREATE INDEX IF NOT EXISTS idx_turma_mat_slots_mat     ON turma_matricula_slots(matricula_id);
CREATE INDEX IF NOT EXISTS idx_turma_mat_slots_slot    ON turma_matricula_slots(slot_id);
CREATE INDEX IF NOT EXISTS idx_turma_sessoes_slot      ON turma_sessoes(slot_id);
CREATE INDEX IF NOT EXISTS idx_turma_sessoes_turma_dh  ON turma_sessoes(turma_id, data_hora);
CREATE INDEX IF NOT EXISTS idx_turma_sessoes_empresa   ON turma_sessoes(empresa_id, data_hora);
CREATE INDEX IF NOT EXISTS idx_turma_presencas_sessao  ON turma_presencas(sessao_id);
CREATE INDEX IF NOT EXISTS idx_turma_presencas_pac     ON turma_presencas(paciente_id);
