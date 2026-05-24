-- ══════════════════════════════════════════════════════════════════
-- 009 — Tabela dedicada de Feriados (multi-tenant)
-- Substitui o uso de folgas_ferias(tipo='feriado').
-- Feriados bloqueiam TODA a agenda da clínica num dia específico.
-- recorrente = true → o bloqueio se repete todo ano (mesmo MM-DD).
-- ══════════════════════════════════════════════════════════════════

create table if not exists feriados (
  id          uuid primary key default uuid_generate_v4(),
  empresa_id  uuid not null references empresas(id) on delete cascade,
  nome        text not null,
  data        date not null,
  recorrente  boolean not null default false,
  created_at  timestamptz default now()
);

-- Índice principal: empresa + data (queries por dia)
create index if not exists idx_feriados_empresa_data
  on feriados (empresa_id, data);

-- Garante que não cadastre o mesmo dia duas vezes para a mesma empresa
create unique index if not exists idx_feriados_empresa_data_unique
  on feriados (empresa_id, data);
