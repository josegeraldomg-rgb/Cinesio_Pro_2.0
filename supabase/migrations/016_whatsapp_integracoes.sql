-- ═══════════════════════════════════════════════════════════════════
-- 016 — WhatsApp: empresa_integracoes + debug logs
-- ═══════════════════════════════════════════════════════════════════

-- Tabela genérica de integrações por empresa (WhatsApp, futuro: Calendar, Stripe…)
CREATE TABLE IF NOT EXISTS empresa_integracoes (
  id          uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id  uuid        NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  tipo        text        NOT NULL,          -- 'whatsapp' | 'google_calendar' | 'stripe'
  config      jsonb       NOT NULL DEFAULT '{}',
  -- Para 'whatsapp': { instance_id, instance_token, jid?, phone? }
  ativo       boolean     NOT NULL DEFAULT true,
  criado_em   timestamptz NOT NULL DEFAULT now(),
  UNIQUE(empresa_id, tipo)
);

CREATE INDEX IF NOT EXISTS idx_emp_integracoes ON empresa_integracoes(empresa_id, tipo);

-- RLS: cada empresa acessa apenas as próprias integrações
ALTER TABLE empresa_integracoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "empresa acessa propria integracao" ON empresa_integracoes;
CREATE POLICY "empresa acessa propria integracao" ON empresa_integracoes
  FOR ALL USING (
    empresa_id = (
      SELECT empresa_id FROM usuarios WHERE id = auth.uid() LIMIT 1
    )
  );

-- Logs de debug do webhook UAZAPI (audit trail bruto)
CREATE TABLE IF NOT EXISTS whatsapp_webhook_debug_logs (
  id          uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id  uuid        REFERENCES empresas(id) ON DELETE CASCADE,
  event_type  text,
  payload     jsonb       NOT NULL DEFAULT '{}',
  criado_em   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wa_debug_empresa
  ON whatsapp_webhook_debug_logs(empresa_id, criado_em DESC);
