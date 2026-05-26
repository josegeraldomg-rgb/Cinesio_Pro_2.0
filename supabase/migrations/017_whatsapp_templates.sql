-- ─── Tabela de templates de mensagens WhatsApp por empresa ───────────────────
CREATE TABLE IF NOT EXISTS whatsapp_templates (
  id                   uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id           uuid        NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  gatilho              text        NOT NULL,
  ativo                boolean     NOT NULL DEFAULT true,
  mensagem             text        NOT NULL DEFAULT '',
  minutos_antecedencia int,        -- para lembrete_horario e pedido_confirmacao
  horario_disparo      text,       -- "HH:MM" para aniversario_paciente e agenda_diaria
  criado_em            timestamptz NOT NULL DEFAULT now(),
  atualizado_em        timestamptz NOT NULL DEFAULT now(),
  UNIQUE(empresa_id, gatilho)
);

CREATE INDEX IF NOT EXISTS idx_wa_templates_empresa ON whatsapp_templates(empresa_id);

-- Trigger para atualizar atualizado_em automaticamente
CREATE OR REPLACE FUNCTION set_wa_template_updated()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_wa_template_updated ON whatsapp_templates;
CREATE TRIGGER trg_wa_template_updated
  BEFORE UPDATE ON whatsapp_templates
  FOR EACH ROW EXECUTE FUNCTION set_wa_template_updated();
