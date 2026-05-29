-- ════════════════════════════════════════════════════════════════
-- 021_exames_paciente.sql
-- Armazena metadados de exames enviados pelo paciente via Portal.
-- Os arquivos ficam no bucket privado "exames-pacientes" do Storage.
-- ════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS exames_paciente (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id    uuid        NOT NULL REFERENCES empresas(id)  ON DELETE CASCADE,
  paciente_id   uuid        NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  nome_arquivo  text        NOT NULL,
  tipo          text        NOT NULL DEFAULT 'outro'
                            CHECK (tipo IN ('rx','ressonancia','tomografia','laudo','receita','outro')),
  storage_path  text        NOT NULL,
  tamanho_bytes bigint,
  mime_type     text,
  observacoes   text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_exames_paciente_id ON exames_paciente(paciente_id);
CREATE INDEX IF NOT EXISTS idx_exames_empresa_id  ON exames_paciente(empresa_id);

ALTER TABLE exames_paciente ENABLE ROW LEVEL SECURITY;

-- Profissionais da empresa lêem todos os exames
CREATE POLICY "exames_empresa_leitura" ON exames_paciente
  FOR SELECT USING (
    empresa_id = (SELECT empresa_id FROM usuarios WHERE id = auth.uid())
  );

-- Paciente só lê/escreve seus próprios exames
CREATE POLICY "exames_proprio_paciente" ON exames_paciente
  FOR ALL USING (
    paciente_id IN (
      SELECT id FROM pacientes WHERE usuario_id = auth.uid()
    )
  );

-- ════════════════════════════════════════════════════════════════
-- STORAGE — bucket privado para exames
-- Execute também no Supabase Dashboard → Storage → New Bucket:
--   Nome: exames-pacientes
--   Public: OFF (privado — acesso via signed URL)
-- ════════════════════════════════════════════════════════════════
