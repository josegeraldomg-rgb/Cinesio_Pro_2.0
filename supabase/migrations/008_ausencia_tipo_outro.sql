-- ══════════════════════════════════════════════════════════════════
-- 008 — Adiciona tipo 'outro' para ausências (atestado, licença, etc.)
-- Remove 'feriado' do form de ausências (agora tem aba dedicada),
-- mas mantém o valor válido na constraint para compatibilidade.
-- ══════════════════════════════════════════════════════════════════

-- Recriar constraint de tipo incluindo 'outro'
ALTER TABLE folgas_ferias DROP CONSTRAINT IF EXISTS folgas_ferias_tipo_check;
ALTER TABLE folgas_ferias
  ADD CONSTRAINT folgas_ferias_tipo_check
  CHECK (tipo IN ('folga', 'ferias', 'feriado', 'outro'));
