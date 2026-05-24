-- CinesioPro · Migration 002
-- Módulo de Horários: estender disponibilidade_profissional + folgas_ferias + RLS
-- Aplicar com: node scripts/apply-migration-horarios.mjs

-- ── 1. Estender disponibilidade_profissional ──
alter table disponibilidade_profissional
  add column if not exists empresa_id uuid references empresas(id) on delete cascade,
  add column if not exists intervalo_minutos int default 0,
  add column if not exists created_at timestamptz default now();

-- Backfill empresa_id a partir do profissional
update disponibilidade_profissional dp
   set empresa_id = p.empresa_id
  from profissionais p
 where dp.profissional_id = p.id
   and dp.empresa_id is null;

create index if not exists idx_disp_prof_dia
  on disponibilidade_profissional(profissional_id, dia_semana);

create index if not exists idx_disp_empresa
  on disponibilidade_profissional(empresa_id);

-- ── 2. RLS para disponibilidade_profissional ──
alter table disponibilidade_profissional enable row level security;

drop policy if exists "disp_select_empresa" on disponibilidade_profissional;
create policy "disp_select_empresa" on disponibilidade_profissional for select
  using (empresa_id in (select empresa_id from usuarios where id = auth.uid()));

drop policy if exists "disp_insert_empresa" on disponibilidade_profissional;
create policy "disp_insert_empresa" on disponibilidade_profissional for insert
  with check (empresa_id in (select empresa_id from usuarios where id = auth.uid()));

drop policy if exists "disp_update_empresa" on disponibilidade_profissional;
create policy "disp_update_empresa" on disponibilidade_profissional for update
  using (empresa_id in (select empresa_id from usuarios where id = auth.uid()));

drop policy if exists "disp_delete_empresa" on disponibilidade_profissional;
create policy "disp_delete_empresa" on disponibilidade_profissional for delete
  using (empresa_id in (select empresa_id from usuarios where id = auth.uid()));

-- ── 3. RLS para folgas_ferias ──
alter table folgas_ferias enable row level security;

drop policy if exists "folgas_select_empresa" on folgas_ferias;
create policy "folgas_select_empresa" on folgas_ferias for select
  using (empresa_id in (select empresa_id from usuarios where id = auth.uid()));

drop policy if exists "folgas_insert_empresa" on folgas_ferias;
create policy "folgas_insert_empresa" on folgas_ferias for insert
  with check (empresa_id in (select empresa_id from usuarios where id = auth.uid()));

drop policy if exists "folgas_update_empresa" on folgas_ferias;
create policy "folgas_update_empresa" on folgas_ferias for update
  using (empresa_id in (select empresa_id from usuarios where id = auth.uid()));

drop policy if exists "folgas_delete_empresa" on folgas_ferias;
create policy "folgas_delete_empresa" on folgas_ferias for delete
  using (empresa_id in (select empresa_id from usuarios where id = auth.uid()));

create index if not exists idx_folgas_prof_data
  on folgas_ferias(profissional_id, data_inicio, data_fim);
