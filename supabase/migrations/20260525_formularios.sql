-- =============================================
-- MÓDULO: CRIADOR DE FORMULÁRIOS
-- =============================================

-- Formulários (templates e cópias personalizadas)
create table formularios (
  id            uuid primary key default gen_random_uuid(),
  empresa_id    uuid references empresas(id) on delete cascade,  -- null = biblioteca global
  nome          text not null,
  descricao     text,
  categoria     text not null,
  eh_biblioteca boolean not null default false,
  status        text not null default 'ativo'
                  check (status in ('rascunho', 'ativo', 'arquivado')),
  campos_json   jsonb not null default '[]'::jsonb,
  criado_por    uuid references usuarios(id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Envios para pacientes (link único por envio)
create table formularios_envios (
  id            uuid primary key default gen_random_uuid(),
  formulario_id uuid not null references formularios(id) on delete cascade,
  paciente_id   uuid not null references pacientes(id) on delete cascade,
  empresa_id    uuid not null references empresas(id) on delete cascade,
  token_unico   text unique not null default encode(gen_random_bytes(32), 'hex'),
  expira_em     timestamptz,
  respondido_em timestamptz,
  enviado_via   text not null default 'link'
                  check (enviado_via in ('whatsapp', 'email', 'link')),
  status        text not null default 'pendente'
                  check (status in ('pendente', 'respondido', 'expirado')),
  created_at    timestamptz not null default now()
);

-- Respostas recebidas — vão para o prontuário
create table formularios_respostas (
  id             uuid primary key default gen_random_uuid(),
  envio_id       uuid references formularios_envios(id) on delete set null,
  formulario_id  uuid not null references formularios(id) on delete cascade,
  paciente_id    uuid not null references pacientes(id) on delete cascade,
  empresa_id     uuid not null references empresas(id) on delete cascade,
  prontuario_id  uuid references prontuarios(id),
  respostas_json jsonb not null default '{}'::jsonb,
  pontuacao      numeric,
  interpretacao  text,
  created_at     timestamptz not null default now()
);

-- ── Índices ──────────────────────────────────────────────────────────────────

create index idx_formularios_empresa    on formularios(empresa_id);
create index idx_formularios_categoria  on formularios(categoria);
create index idx_formularios_biblioteca on formularios(eh_biblioteca) where eh_biblioteca = true;

create index idx_envios_paciente        on formularios_envios(paciente_id);
create index idx_envios_token           on formularios_envios(token_unico);
create index idx_envios_status          on formularios_envios(status);
create index idx_envios_empresa         on formularios_envios(empresa_id);

create index idx_respostas_paciente     on formularios_respostas(paciente_id);
create index idx_respostas_prontuario   on formularios_respostas(prontuario_id);
create index idx_respostas_empresa      on formularios_respostas(empresa_id);

-- ── RLS ──────────────────────────────────────────────────────────────────────

alter table formularios         enable row level security;
alter table formularios_envios  enable row level security;
alter table formularios_respostas enable row level security;

-- Formulários: biblioteca global (empresa_id null) + formulários da empresa
create policy "formularios_acesso" on formularios
  for all using (
    empresa_id is null
    or empresa_id = (select empresa_id from usuarios where id = auth.uid())
  );

create policy "envios_empresa" on formularios_envios
  for all using (
    empresa_id = (select empresa_id from usuarios where id = auth.uid())
  );

create policy "respostas_empresa" on formularios_respostas
  for all using (
    empresa_id = (select empresa_id from usuarios where id = auth.uid())
  );

-- ── Trigger updated_at ───────────────────────────────────────────────────────

create trigger t_formularios_updated
  before update on formularios
  for each row execute function update_updated_at();
