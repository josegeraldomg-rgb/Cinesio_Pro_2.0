-- Migration 005: tabela de regras de recorrência + FK em agendamentos
-- Rodar no Supabase SQL Editor

create table if not exists recorrencias (
  id              uuid primary key default uuid_generate_v4(),
  empresa_id      uuid references empresas(id)      on delete cascade,
  paciente_id     uuid references pacientes(id)     on delete cascade,
  profissional_id uuid references profissionais(id) on delete set null,
  servico_id      uuid references servicos(id)      on delete set null,

  -- regra de repetição
  frequencia      text not null
    check (frequencia in ('semanal', 'quinzenal', 'mensal', 'personalizado')),
  intervalo_dias  int,              -- preenchido apenas quando frequencia = 'personalizado'
  hora            text not null,    -- "HH:MM"
  duracao_minutos int  not null,

  -- condição de término
  tipo_fim        text not null
    check (tipo_fim in ('sessoes', 'data')),
  total_sessoes   int,              -- preenchido quando tipo_fim = 'sessoes'
  data_fim        date,             -- preenchido quando tipo_fim = 'data'
  data_inicio     date not null,

  observacoes     text,
  created_at      timestamptz default now()
);

-- Coluna de FK na tabela existente
alter table agendamentos
  add column if not exists recorrencia_id uuid
    references recorrencias(id) on delete set null;

create index if not exists idx_agendamentos_recorrencia
  on agendamentos (recorrencia_id)
  where recorrencia_id is not null;
