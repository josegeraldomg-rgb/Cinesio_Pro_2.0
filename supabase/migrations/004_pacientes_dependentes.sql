-- CinesioPro · Migration 004
-- Módulo de Pacientes: DDI internacional, dependentes, auto-completar via token

-- ── 1. Estende a tabela pacientes ──
alter table pacientes
  add column if not exists ddi               text default '55',
  add column if not exists sexo_biologico    text check (sexo_biologico in ('masculino','feminino','intersexo')),
  add column if not exists responsavel_id    uuid references pacientes(id) on delete set null,
  add column if not exists contato_emergencia text,
  add column if not exists token_completar   uuid,
  add column if not exists token_expires_at  timestamptz;

-- Telefone passa a aceitar duplicatas (mesmo número entre titular e dependente)
-- Já não tinha unique antes, mas garante.
drop index if exists pacientes_telefone_uidx;

create index if not exists idx_pacientes_responsavel
  on pacientes(responsavel_id);

create index if not exists idx_pacientes_token
  on pacientes(token_completar) where token_completar is not null;

create index if not exists idx_pacientes_telefone
  on pacientes(ddi, telefone);

-- ── 2. RLS atualizada usando current_empresa_id() ──
drop policy if exists "pacientes_empresa" on pacientes;
create policy "pacientes_empresa" on pacientes
  for all using (empresa_id = public.current_empresa_id())
          with check (empresa_id = public.current_empresa_id());

-- ── 3. Policy especial: leitura/escrita pública por token (auto-completar) ──
-- Permite que a página /app/completar/[token] funcione sem auth, mas SÓ
-- para o registro cujo token bate.
-- Como Supabase JS no client não consegue passar um WHERE seguro, a página
-- pública usa a Server Action (admin client), então NÃO precisamos abrir
-- policy nenhuma extra aqui. Mantemos as policies fechadas.
