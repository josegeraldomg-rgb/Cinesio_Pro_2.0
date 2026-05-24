-- ══════════════════════════════════════════════════════════════════
-- 007 — Horários parciais em folgas/férias/feriados
-- Permite bloquear apenas um intervalo de horas dentro de um dia,
-- ex: "das 13:00 às 17:30" ou "das 13:00 de seg até 17:30 de ter".
-- hora_inicio / hora_fim nulos = dia inteiro bloqueado (comportamento original).
-- ══════════════════════════════════════════════════════════════════

ALTER TABLE folgas_ferias
  ADD COLUMN IF NOT EXISTS hora_inicio text,   -- "HH:MM", nullable = dia inteiro
  ADD COLUMN IF NOT EXISTS hora_fim    text;   -- "HH:MM", nullable = dia inteiro
