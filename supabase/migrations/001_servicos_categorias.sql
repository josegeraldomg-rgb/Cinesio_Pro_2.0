-- CinesioPro · Migration 001
-- Módulo de Serviços: adicionar categorias e novas colunas em servicos
-- Aplicar com: node scripts/apply-migration-servicos.mjs

-- ── 1. Tabela de categorias de serviços ──
create table if not exists categorias_servicos (
  id uuid primary key default uuid_generate_v4(),
  empresa_id uuid references empresas(id) on delete cascade,
  nome text not null,
  descricao text,
  cor text default '#4A3AE8',
  icone text default 'medical_services',
  ordem int default 0,
  ativo boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_cat_servicos_empresa
  on categorias_servicos(empresa_id);

-- ── 2. Estender tabela servicos ──
alter table servicos
  add column if not exists categoria_id uuid references categorias_servicos(id) on delete set null,
  add column if not exists permite_agendamento_online boolean default false,
  add column if not exists icone text;

create index if not exists idx_servicos_categoria
  on servicos(categoria_id);

-- ── 3. Seed: categorias padrão para a empresa de exemplo ──
insert into categorias_servicos (empresa_id, nome, cor, icone, ordem)
values
  ('00000000-0000-0000-0000-000000000001', 'Fisioterapia',            '#4A3AE8', 'medical_services',  1),
  ('00000000-0000-0000-0000-000000000001', 'Pilates',                 '#27AE60', 'sports_gymnastics', 2),
  ('00000000-0000-0000-0000-000000000001', 'Avaliação',               '#F39C12', 'fact_check',        3),
  ('00000000-0000-0000-0000-000000000001', 'Estética e Bem-estar',    '#E91E63', 'spa',               4),
  ('00000000-0000-0000-0000-000000000001', 'Esportes / Reabilitação', '#3498DB', 'directions_run',    5),
  ('00000000-0000-0000-0000-000000000001', 'Teleconsulta',            '#8E44AD', 'video_call',        6)
on conflict do nothing;

-- ── 4. RLS para categorias_servicos ──
alter table categorias_servicos enable row level security;

drop policy if exists "categorias_select_empresa" on categorias_servicos;
create policy "categorias_select_empresa" on categorias_servicos for select
  using (
    empresa_id in (
      select empresa_id from usuarios where id = auth.uid()
    )
  );

drop policy if exists "categorias_insert_empresa" on categorias_servicos;
create policy "categorias_insert_empresa" on categorias_servicos for insert
  with check (
    empresa_id in (
      select empresa_id from usuarios where id = auth.uid()
    )
  );

drop policy if exists "categorias_update_empresa" on categorias_servicos;
create policy "categorias_update_empresa" on categorias_servicos for update
  using (
    empresa_id in (
      select empresa_id from usuarios where id = auth.uid()
    )
  );

drop policy if exists "categorias_delete_empresa" on categorias_servicos;
create policy "categorias_delete_empresa" on categorias_servicos for delete
  using (
    empresa_id in (
      select empresa_id from usuarios where id = auth.uid()
    )
  );
