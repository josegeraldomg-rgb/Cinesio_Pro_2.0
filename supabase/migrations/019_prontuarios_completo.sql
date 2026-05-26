-- ─── Migration 019: Módulo Prontuários Completo ──────────────────────────────

-- Alertas críticos e acesso restrito no prontuário base
ALTER TABLE prontuarios
  ADD COLUMN IF NOT EXISTS alertas_criticos jsonb NOT NULL DEFAULT '[]',
  -- [{"tipo": "alergia"|"cirurgia"|"patologia", "descricao": "..."}]
  ADD COLUMN IF NOT EXISTS acesso_restrito  boolean NOT NULL DEFAULT false;

-- ─── Prescrições médicas ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS prescricoes (
  id              uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id      uuid        NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  paciente_id     uuid        NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  profissional_id uuid        REFERENCES profissionais(id) ON DELETE SET NULL,
  tipo            text        NOT NULL DEFAULT 'simples'
                              CHECK (tipo IN ('simples','especial','antibiotico')),
  medicamentos    jsonb       NOT NULL DEFAULT '[]',
  -- [{nome, dosagem, posologia, quantidade, observacao}]
  observacoes     text,
  cid10           text,
  data_emissao    timestamptz NOT NULL DEFAULT now(),
  criado_em       timestamptz NOT NULL DEFAULT now()
);

-- ─── Laudos técnicos ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS laudos (
  id              uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id      uuid        NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  paciente_id     uuid        NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  profissional_id uuid        REFERENCES profissionais(id) ON DELETE SET NULL,
  titulo          text        NOT NULL DEFAULT 'Laudo Técnico',
  conteudo        text        NOT NULL,
  cid10           text,
  data_emissao    timestamptz NOT NULL DEFAULT now(),
  criado_em       timestamptz NOT NULL DEFAULT now()
);

-- ─── Atestados médicos ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS atestados (
  id              uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id      uuid        NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  paciente_id     uuid        NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  profissional_id uuid        REFERENCES profissionais(id) ON DELETE SET NULL,
  tipo            text        NOT NULL DEFAULT 'afastamento'
                              CHECK (tipo IN ('afastamento','comparecimento','acompanhamento')),
  dias            int,
  cid10           text,
  observacoes     text,
  data_emissao    timestamptz NOT NULL DEFAULT now(),
  criado_em       timestamptz NOT NULL DEFAULT now()
);

-- ─── Anexos do prontuário ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS prontuario_anexos (
  id              uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id      uuid        NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  paciente_id     uuid        NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  profissional_id uuid        REFERENCES profissionais(id) ON DELETE SET NULL,
  nome            text        NOT NULL,
  tipo_mime       text,
  url             text        NOT NULL,
  tamanho_bytes   bigint,
  criado_em       timestamptz NOT NULL DEFAULT now()
);

-- ─── Índices ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_prescricoes_pac   ON prescricoes(empresa_id, paciente_id, data_emissao DESC);
CREATE INDEX IF NOT EXISTS idx_laudos_pac        ON laudos(empresa_id, paciente_id, data_emissao DESC);
CREATE INDEX IF NOT EXISTS idx_atestados_pac     ON atestados(empresa_id, paciente_id, data_emissao DESC);
CREATE INDEX IF NOT EXISTS idx_anexos_pac        ON prontuario_anexos(empresa_id, paciente_id, criado_em DESC);

-- ─── RLS ─────────────────────────────────────────────────────────────────────
ALTER TABLE prescricoes       ENABLE ROW LEVEL SECURITY;
ALTER TABLE laudos            ENABLE ROW LEVEL SECURITY;
ALTER TABLE atestados         ENABLE ROW LEVEL SECURITY;
ALTER TABLE prontuario_anexos ENABLE ROW LEVEL SECURITY;

-- service_role bypasses RLS; políticas para usuários autenticados via empresa_id
CREATE POLICY "prescricoes_empresa"  ON prescricoes       FOR ALL USING (empresa_id IN (SELECT empresa_id FROM usuarios WHERE id = auth.uid()));
CREATE POLICY "laudos_empresa"       ON laudos            FOR ALL USING (empresa_id IN (SELECT empresa_id FROM usuarios WHERE id = auth.uid()));
CREATE POLICY "atestados_empresa"    ON atestados         FOR ALL USING (empresa_id IN (SELECT empresa_id FROM usuarios WHERE id = auth.uid()));
CREATE POLICY "anexos_empresa"       ON prontuario_anexos FOR ALL USING (empresa_id IN (SELECT empresa_id FROM usuarios WHERE id = auth.uid()));
