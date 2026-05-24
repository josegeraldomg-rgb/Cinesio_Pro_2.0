-- CinesioPro · Migration 003
-- Corrige RLS recursivo na tabela `usuarios`.
--
-- A policy original "usuarios_empresa" usa um sub-SELECT na própria tabela
-- usuarios para descobrir a empresa do usuário logado. Isso dispara a mesma
-- policy recursivamente, retornando vazio. Resultado: o usuário não enxerga
-- nem a própria linha, e qualquer outra policy que dependa de
-- (select empresa_id from usuarios where id = auth.uid())
-- também falha.
--
-- Solução:
--   1. Cria uma FUNCTION SECURITY DEFINER que faz o lookup ignorando RLS
--   2. Recria as policies dependentes usando a function

-- ── 1. Function helper ──
create or replace function public.current_empresa_id()
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select empresa_id from public.usuarios where id = auth.uid() limit 1
$$;

-- Permite que usuários autenticados chamem a função
grant execute on function public.current_empresa_id() to authenticated, anon, service_role;

-- ── 2. Recria policies em usuarios ──
drop policy if exists "usuarios_empresa" on usuarios;

-- Cada usuário lê a própria linha + linhas da mesma empresa
create policy "usuarios_self_or_empresa" on usuarios for select
  using (id = auth.uid() or empresa_id = public.current_empresa_id());

create policy "usuarios_insert_empresa" on usuarios for insert
  with check (empresa_id = public.current_empresa_id() or id = auth.uid());

create policy "usuarios_update_empresa" on usuarios for update
  using (empresa_id = public.current_empresa_id())
  with check (empresa_id = public.current_empresa_id());

create policy "usuarios_delete_empresa" on usuarios for delete
  using (empresa_id = public.current_empresa_id());

-- ── 3. Atualiza policies dependentes para usar a function ──
-- Profissionais
drop policy if exists "profissionais_empresa" on profissionais;
create policy "profissionais_empresa" on profissionais
  for all using (empresa_id = public.current_empresa_id())
          with check (empresa_id = public.current_empresa_id());

-- Pacientes
drop policy if exists "pacientes_empresa" on pacientes;
create policy "pacientes_empresa" on pacientes
  for all using (empresa_id = public.current_empresa_id())
          with check (empresa_id = public.current_empresa_id());

-- Agendamentos
drop policy if exists "agendamentos_empresa" on agendamentos;
create policy "agendamentos_empresa" on agendamentos
  for all using (empresa_id = public.current_empresa_id())
          with check (empresa_id = public.current_empresa_id());

-- Prontuarios
drop policy if exists "prontuarios_empresa" on prontuarios;
create policy "prontuarios_empresa" on prontuarios
  for all using (empresa_id = public.current_empresa_id())
          with check (empresa_id = public.current_empresa_id());

-- Servicos
drop policy if exists "servicos_empresa" on servicos;
create policy "servicos_empresa" on servicos
  for all using (empresa_id = public.current_empresa_id())
          with check (empresa_id = public.current_empresa_id());

-- Salas
drop policy if exists "salas_empresa" on salas;
create policy "salas_empresa" on salas
  for all using (empresa_id = public.current_empresa_id())
          with check (empresa_id = public.current_empresa_id());

-- Demais tabelas com mesma estrutura (uma a uma — mais simples e à prova de erro)
drop policy if exists "planos_tratamento_empresa" on planos_tratamento;
create policy "planos_tratamento_empresa" on planos_tratamento
  for all using (empresa_id = public.current_empresa_id())
          with check (empresa_id = public.current_empresa_id());

drop policy if exists "evolucoes_clinicas_empresa" on evolucoes_clinicas;
create policy "evolucoes_clinicas_empresa" on evolucoes_clinicas
  for all using (empresa_id = public.current_empresa_id())
          with check (empresa_id = public.current_empresa_id());

drop policy if exists "escalas_aplicadas_empresa" on escalas_aplicadas;
create policy "escalas_aplicadas_empresa" on escalas_aplicadas
  for all using (empresa_id = public.current_empresa_id())
          with check (empresa_id = public.current_empresa_id());

drop policy if exists "turmas_empresa" on turmas;
create policy "turmas_empresa" on turmas
  for all using (empresa_id = public.current_empresa_id())
          with check (empresa_id = public.current_empresa_id());

drop policy if exists "pacotes_paciente_empresa" on pacotes_paciente;
create policy "pacotes_paciente_empresa" on pacotes_paciente
  for all using (empresa_id = public.current_empresa_id())
          with check (empresa_id = public.current_empresa_id());

drop policy if exists "receitas_empresa" on receitas;
create policy "receitas_empresa" on receitas
  for all using (empresa_id = public.current_empresa_id())
          with check (empresa_id = public.current_empresa_id());

drop policy if exists "despesas_empresa" on despesas;
create policy "despesas_empresa" on despesas
  for all using (empresa_id = public.current_empresa_id())
          with check (empresa_id = public.current_empresa_id());

drop policy if exists "kpis_mensais_empresa" on kpis_mensais;
create policy "kpis_mensais_empresa" on kpis_mensais
  for all using (empresa_id = public.current_empresa_id())
          with check (empresa_id = public.current_empresa_id());

drop policy if exists "notificacoes_empresa" on notificacoes;
create policy "notificacoes_empresa" on notificacoes
  for all using (empresa_id = public.current_empresa_id())
          with check (empresa_id = public.current_empresa_id());

-- ── 4. Atualiza as policies criadas em migrations anteriores ──
-- Categorias servicos (migration 001)
drop policy if exists "categorias_select_empresa" on categorias_servicos;
drop policy if exists "categorias_insert_empresa" on categorias_servicos;
drop policy if exists "categorias_update_empresa" on categorias_servicos;
drop policy if exists "categorias_delete_empresa" on categorias_servicos;
create policy "categorias_empresa" on categorias_servicos
  for all using (empresa_id = public.current_empresa_id())
          with check (empresa_id = public.current_empresa_id());

-- Disponibilidade (migration 002)
drop policy if exists "disp_select_empresa"  on disponibilidade_profissional;
drop policy if exists "disp_insert_empresa"  on disponibilidade_profissional;
drop policy if exists "disp_update_empresa"  on disponibilidade_profissional;
drop policy if exists "disp_delete_empresa"  on disponibilidade_profissional;
create policy "disp_empresa" on disponibilidade_profissional
  for all using (empresa_id = public.current_empresa_id())
          with check (empresa_id = public.current_empresa_id());

-- Folgas / férias (migration 002)
drop policy if exists "folgas_select_empresa" on folgas_ferias;
drop policy if exists "folgas_insert_empresa" on folgas_ferias;
drop policy if exists "folgas_update_empresa" on folgas_ferias;
drop policy if exists "folgas_delete_empresa" on folgas_ferias;
create policy "folgas_empresa" on folgas_ferias
  for all using (empresa_id = public.current_empresa_id())
          with check (empresa_id = public.current_empresa_id());

-- Servico_profissional (sem empresa_id direto — herda via servico)
alter table servico_profissional enable row level security;
drop policy if exists "servprof_via_servico" on servico_profissional;
create policy "servprof_via_servico" on servico_profissional
  for all using (
    exists (
      select 1 from servicos s
      where s.id = servico_profissional.servico_id
        and s.empresa_id = public.current_empresa_id()
    )
  );
