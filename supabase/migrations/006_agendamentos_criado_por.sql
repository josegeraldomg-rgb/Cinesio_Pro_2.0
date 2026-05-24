-- ══════════════════════════════════════════════════════════════════
-- 006 — Canal de criação e valor do agendamento
-- Adiciona:
--   • canal        — quem/como o agendamento foi criado
--   • criado_por_id — FK para o usuário que agendou
--   • valor        — valor cobrado nesta sessão (com desconto aplicado)
-- ══════════════════════════════════════════════════════════════════

ALTER TABLE agendamentos
  ADD COLUMN IF NOT EXISTS canal          text NOT NULL DEFAULT 'sistema'
    CHECK (canal IN ('sistema','whatsapp_ia','paciente_app')),
  ADD COLUMN IF NOT EXISTS criado_por_id  uuid REFERENCES usuarios(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS valor          numeric(10,2);

CREATE INDEX IF NOT EXISTS idx_agendamentos_criado_por
  ON agendamentos(criado_por_id)
  WHERE criado_por_id IS NOT NULL;
