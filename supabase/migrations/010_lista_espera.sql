-- ══════════════════════════════════════════════════════════════════
-- 010 — Lista de Espera da Clínica
-- Pacientes que querem ser avisados quando um slot compatível abrir.
-- O motor de match roda ao cancelar um agendamento.
-- ══════════════════════════════════════════════════════════════════

create table if not exists lista_espera_clinica (
  id                        uuid primary key default uuid_generate_v4(),
  empresa_id                uuid not null references empresas(id) on delete cascade,
  paciente_id               uuid not null references pacientes(id) on delete cascade,
  servico_id                uuid references servicos(id) on delete set null,
  profissional_id           uuid references profissionais(id) on delete set null,

  -- Janela de datas de interesse
  data_inicio               date not null,
  data_fim                  date not null,

  -- Faixa de horário de interesse (null = qualquer hora)
  hora_inicio               time,
  hora_fim                  time,

  -- Ciclo de vida
  status                    text not null default 'aguardando'
    check (status in ('aguardando', 'notificado', 'agendado', 'cancelado')),

  observacoes               text,
  notificado_em             timestamptz,
  notificar_automaticamente boolean not null default false,
  created_at                timestamptz default now()
);

create index if not exists idx_lista_espera_empresa
  on lista_espera_clinica (empresa_id, status);

create index if not exists idx_lista_espera_paciente
  on lista_espera_clinica (paciente_id);
