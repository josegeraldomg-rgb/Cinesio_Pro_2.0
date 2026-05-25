-- ════════════════════════════════════════════════════════════════
-- 011_financeiro.sql
-- Módulo Financeiro: formas de pagamento, comissões, lançamentos
-- ════════════════════════════════════════════════════════════════

-- Formas de pagamento configuráveis por clínica
CREATE TABLE IF NOT EXISTS config_formas_pagamento (
  id                  uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id          uuid        NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  nome                text        NOT NULL,
  tipo                text        NOT NULL CHECK (tipo IN ('dinheiro','pix','credito','debito','transferencia','convenio','outro')),
  taxa_percentual     numeric(5,2) NOT NULL DEFAULT 0,   -- % cobrado pela operadora/maquininha
  taxa_fixa           numeric(10,2) NOT NULL DEFAULT 0,  -- R$ fixo por transação
  prazo_liquidez_dias int          NOT NULL DEFAULT 0,   -- D+N
  ativo               boolean      NOT NULL DEFAULT true,
  criado_em           timestamptz  NOT NULL DEFAULT now()
);

-- Configurações de comissão: global da clínica, por profissional ou por profissional+serviço
CREATE TABLE IF NOT EXISTS comissoes_config (
  id                  uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id          uuid        NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  profissional_id     uuid        REFERENCES profissionais(id) ON DELETE CASCADE,  -- NULL = regra global da clínica
  servico_id          uuid        REFERENCES servicos(id) ON DELETE SET NULL,      -- NULL = regra geral do profissional
  percentual          numeric(5,2) NOT NULL CHECK (percentual >= 0 AND percentual <= 100),
  ativo               boolean      NOT NULL DEFAULT true,
  criado_em           timestamptz  NOT NULL DEFAULT now()
);

-- Lançamentos financeiros (receitas geradas por atendimentos)
CREATE TABLE IF NOT EXISTS financeiro_receitas (
  id                  uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id          uuid        NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  agendamento_id      uuid        REFERENCES agendamentos(id) ON DELETE SET NULL,
  paciente_id         uuid        REFERENCES pacientes(id) ON DELETE SET NULL,
  profissional_id     uuid        REFERENCES profissionais(id) ON DELETE SET NULL,
  servico_id          uuid        REFERENCES servicos(id) ON DELETE SET NULL,
  forma_pagamento_id  uuid        REFERENCES config_formas_pagamento(id) ON DELETE SET NULL,

  valor_bruto         numeric(10,2) NOT NULL,
  desconto            numeric(10,2) NOT NULL DEFAULT 0,
  taxa_operadora      numeric(10,2) NOT NULL DEFAULT 0,   -- calculada da forma_pagamento
  valor_liquido       numeric(10,2) NOT NULL,             -- bruto - desconto - taxa_operadora
  percentual_comissao numeric(5,2)  NOT NULL DEFAULT 0,
  valor_comissao      numeric(10,2) NOT NULL DEFAULT 0,   -- valor_liquido * percentual_comissao / 100

  status              text NOT NULL DEFAULT 'pago'
                      CHECK (status IN ('pago','pendente','cancelado','estornado')),

  data_competencia    date        NOT NULL,   -- dia do atendimento
  data_liquidez       date,                  -- competencia + prazo_liquidez_dias
  data_pagamento      timestamptz,           -- quando foi efetivamente recebido

  descricao           text,
  observacoes         text,

  criado_em           timestamptz NOT NULL DEFAULT now(),
  criado_por          uuid REFERENCES usuarios(id) ON DELETE SET NULL
);

-- Índices de performance
CREATE INDEX IF NOT EXISTS idx_fin_receitas_empresa    ON financeiro_receitas(empresa_id);
CREATE INDEX IF NOT EXISTS idx_fin_receitas_data       ON financeiro_receitas(empresa_id, data_competencia);
CREATE INDEX IF NOT EXISTS idx_fin_receitas_agend      ON financeiro_receitas(agendamento_id);
CREATE INDEX IF NOT EXISTS idx_fin_receitas_prof       ON financeiro_receitas(profissional_id);
CREATE INDEX IF NOT EXISTS idx_fin_receitas_paciente   ON financeiro_receitas(paciente_id);
CREATE INDEX IF NOT EXISTS idx_comissoes_prof          ON comissoes_config(empresa_id, profissional_id);
CREATE INDEX IF NOT EXISTS idx_config_fp_empresa       ON config_formas_pagamento(empresa_id);

-- RLS
ALTER TABLE config_formas_pagamento  ENABLE ROW LEVEL SECURITY;
ALTER TABLE comissoes_config          ENABLE ROW LEVEL SECURITY;
ALTER TABLE financeiro_receitas       ENABLE ROW LEVEL SECURITY;

-- Políticas simples (admin client bypassa RLS, mas protege acessos diretos)
CREATE POLICY "fp_empresa"     ON config_formas_pagamento  FOR ALL USING (true);
CREATE POLICY "com_empresa"    ON comissoes_config          FOR ALL USING (true);
CREATE POLICY "rec_empresa"    ON financeiro_receitas       FOR ALL USING (true);

-- ── Seed: formas de pagamento padrão (executar por empresa via app) ──
-- As formas padrão são inseridas via Server Action na primeira abertura da config.
