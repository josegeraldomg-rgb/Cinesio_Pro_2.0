-- =============================================
-- CinesioPro - Schema Completo v3.0
-- Rodar no Supabase SQL Editor
-- =============================================

-- Habilitar extensões necessárias
create extension if not exists "uuid-ossp";
create extension if not exists "unaccent";

-- =============================================
-- GRUPO 1: MULTITENANCY
-- =============================================

create table if not exists empresas (
  id uuid primary key default uuid_generate_v4(),
  nome text not null,
  cnpj text,
  telefone text,
  email text,
  logo_url text,
  endereco jsonb default '{}',
  configuracoes jsonb default '{}',
  ativo boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists planos_saas (
  id uuid primary key default uuid_generate_v4(),
  nome text not null,
  max_profissionais int default 5,
  max_pacientes int default 200,
  max_minutos_ia int default 60,
  valor_mensal numeric(10,2) default 0,
  ativo boolean default true,
  created_at timestamptz default now()
);

create table if not exists usuarios (
  id uuid primary key references auth.users(id) on delete cascade,
  empresa_id uuid references empresas(id) on delete cascade,
  nome text not null,
  email text not null,
  perfil text not null check (perfil in ('dev','admin','profissional','recepcionista','paciente')),
  avatar_url text,
  ativo boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists salas (
  id uuid primary key default uuid_generate_v4(),
  empresa_id uuid references empresas(id) on delete cascade,
  nome text not null,
  capacidade int default 1,
  tipo text default 'atendimento',
  status text default 'disponivel' check (status in ('disponivel','manutencao','inativa')),
  cor text default '#4A3AE8',
  created_at timestamptz default now()
);

-- =============================================
-- GRUPO 2: PROFISSIONAIS E SERVIÇOS
-- =============================================

create table if not exists profissionais (
  id uuid primary key default uuid_generate_v4(),
  empresa_id uuid references empresas(id) on delete cascade,
  usuario_id uuid references usuarios(id),
  nome text not null,
  crefito text,
  uf text,
  especialidade text,
  telefone text,
  email text,
  avatar_url text,
  cor_agenda text default '#4A3AE8',
  percentual_comissao numeric(5,2) default 0,
  ativo boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists servicos (
  id uuid primary key default uuid_generate_v4(),
  empresa_id uuid references empresas(id) on delete cascade,
  nome text not null,
  descricao text,
  duracao_minutos int default 50,
  valor numeric(10,2) default 0,
  tipo text default 'fisioterapia' check (tipo in ('fisioterapia','pilates','avaliacao','teleconsulta','outro')),
  cor text default '#4A3AE8',
  ativo boolean default true,
  created_at timestamptz default now()
);

create table if not exists servico_profissional (
  id uuid primary key default uuid_generate_v4(),
  servico_id uuid references servicos(id) on delete cascade,
  profissional_id uuid references profissionais(id) on delete cascade,
  valor_override numeric(10,2),
  duracao_override int,
  unique(servico_id, profissional_id)
);

create table if not exists disponibilidade_profissional (
  id uuid primary key default uuid_generate_v4(),
  profissional_id uuid references profissionais(id) on delete cascade,
  dia_semana int check (dia_semana between 0 and 6),
  hora_inicio time not null,
  hora_fim time not null,
  ativo boolean default true
);

create table if not exists folgas_ferias (
  id uuid primary key default uuid_generate_v4(),
  profissional_id uuid references profissionais(id) on delete cascade,
  empresa_id uuid references empresas(id) on delete cascade,
  data_inicio date not null,
  data_fim date not null,
  motivo text,
  tipo text default 'folga' check (tipo in ('folga','ferias','feriado')),
  created_at timestamptz default now()
);

-- =============================================
-- GRUPO 3: PACIENTES
-- =============================================

create table if not exists pacientes (
  id uuid primary key default uuid_generate_v4(),
  empresa_id uuid references empresas(id) on delete cascade,
  usuario_id uuid references usuarios(id),
  nome text not null,
  cpf text,
  data_nascimento date,
  telefone text,
  email text,
  endereco jsonb default '{}',
  convenio text,
  numero_convenio text,
  foto_url text,
  observacoes text,
  status text default 'ativo' check (status in ('ativo','inativo','alta')),
  lgpd_consentimento boolean default false,
  lgpd_data timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- =============================================
-- GRUPO 4: AGENDAMENTOS
-- =============================================

create table if not exists agendamentos (
  id uuid primary key default uuid_generate_v4(),
  empresa_id uuid references empresas(id) on delete cascade,
  paciente_id uuid references pacientes(id) on delete cascade,
  profissional_id uuid references profissionais(id),
  servico_id uuid references servicos(id),
  sala_id uuid references salas(id),
  data_hora timestamptz not null,
  duracao_minutos int default 50,
  status text default 'agendado' check (status in ('agendado','confirmado','em_atendimento','realizado','cancelado','faltou')),
  tipo text default 'presencial' check (tipo in ('presencial','teleconsulta')),
  observacoes text,
  valor numeric(10,2),
  pacote_id uuid,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists lista_espera (
  id uuid primary key default uuid_generate_v4(),
  empresa_id uuid references empresas(id) on delete cascade,
  paciente_id uuid references pacientes(id) on delete cascade,
  profissional_id uuid references profissionais(id),
  servico_id uuid references servicos(id),
  data_preferencia date,
  periodo text check (periodo in ('manha','tarde','noite','qualquer')),
  status text default 'aguardando' check (status in ('aguardando','contatado','encaixado','cancelado')),
  created_at timestamptz default now()
);

-- =============================================
-- GRUPO 5: PRONTUÁRIO E CLÍNICO
-- =============================================

create table if not exists prontuarios (
  id uuid primary key default uuid_generate_v4(),
  empresa_id uuid references empresas(id) on delete cascade,
  paciente_id uuid references pacientes(id) on delete cascade,
  profissional_id uuid references profissionais(id),
  anamnese jsonb default '{}',
  antecedentes text,
  medicamentos text,
  alergias text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(empresa_id, paciente_id)
);

create table if not exists planos_tratamento (
  id uuid primary key default uuid_generate_v4(),
  empresa_id uuid references empresas(id) on delete cascade,
  paciente_id uuid references pacientes(id) on delete cascade,
  profissional_id uuid references profissionais(id),
  diagnostico_clinico text,
  cid10 text,
  objetivos jsonb default '[]',
  sessoes_previstas int,
  sessoes_realizadas int default 0,
  data_inicio date,
  data_previsao_alta date,
  data_alta date,
  status text default 'ativo' check (status in ('ativo','reavaliacao','alta','encerrado')),
  observacoes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists evolucoes_clinicas (
  id uuid primary key default uuid_generate_v4(),
  empresa_id uuid references empresas(id) on delete cascade,
  paciente_id uuid references pacientes(id) on delete cascade,
  profissional_id uuid references profissionais(id),
  agendamento_id uuid references agendamentos(id),
  plano_id uuid references planos_tratamento(id),
  conteudo text not null,
  audio_url text,
  ia_transcricao text,
  ia_narrativa text,
  data_atendimento timestamptz default now(),
  created_at timestamptz default now()
);

create table if not exists escalas_aplicadas (
  id uuid primary key default uuid_generate_v4(),
  empresa_id uuid references empresas(id) on delete cascade,
  paciente_id uuid references pacientes(id) on delete cascade,
  profissional_id uuid references profissionais(id),
  plano_id uuid references planos_tratamento(id),
  tipo_escala text not null,
  respostas jsonb not null default '{}',
  score numeric(10,2),
  interpretacao text,
  tipo_aplicacao text default 'inicial' check (tipo_aplicacao in ('inicial','reavaliacao','alta')),
  created_at timestamptz default now()
);

-- =============================================
-- GRUPO 6: TURMAS DE PILATES
-- =============================================

create table if not exists turmas (
  id uuid primary key default uuid_generate_v4(),
  empresa_id uuid references empresas(id) on delete cascade,
  profissional_id uuid references profissionais(id),
  sala_id uuid references salas(id),
  nome text not null,
  dia_semana int check (dia_semana between 0 and 6),
  hora_inicio time,
  hora_fim time,
  capacidade_maxima int default 6,
  nivel text default 'iniciante' check (nivel in ('iniciante','intermediario','avancado')),
  ativo boolean default true,
  created_at timestamptz default now()
);

create table if not exists turma_alunos (
  id uuid primary key default uuid_generate_v4(),
  turma_id uuid references turmas(id) on delete cascade,
  paciente_id uuid references pacientes(id) on delete cascade,
  data_matricula date default current_date,
  status text default 'ativo' check (status in ('ativo','pausado','encerrado')),
  unique(turma_id, paciente_id)
);

create table if not exists presencas_turma (
  id uuid primary key default uuid_generate_v4(),
  turma_id uuid references turmas(id) on delete cascade,
  paciente_id uuid references pacientes(id) on delete cascade,
  data_aula date not null,
  presente boolean default false,
  observacao text,
  created_at timestamptz default now()
);

create table if not exists biblioteca_exercicios (
  id uuid primary key default uuid_generate_v4(),
  empresa_id uuid references empresas(id) on delete cascade,
  nome text not null,
  descricao text,
  categoria text,
  nivel text,
  equipamento text,
  video_url text,
  imagem_url text,
  instrucoes jsonb default '[]',
  created_at timestamptz default now()
);

create table if not exists sequencias_aula (
  id uuid primary key default uuid_generate_v4(),
  turma_id uuid references turmas(id) on delete cascade,
  profissional_id uuid references profissionais(id),
  nome text,
  data_aula date,
  exercicios jsonb default '[]',
  observacoes text,
  created_at timestamptz default now()
);

-- =============================================
-- GRUPO 7: FINANCEIRO
-- =============================================

create table if not exists pacotes_sessoes (
  id uuid primary key default uuid_generate_v4(),
  empresa_id uuid references empresas(id) on delete cascade,
  nome text not null,
  descricao text,
  numero_sessoes int not null,
  validade_dias int default 90,
  valor numeric(10,2) not null,
  tipo text default 'fisioterapia' check (tipo in ('fisioterapia','pilates','avaliacao')),
  ativo boolean default true,
  created_at timestamptz default now()
);

create table if not exists pacotes_paciente (
  id uuid primary key default uuid_generate_v4(),
  empresa_id uuid references empresas(id) on delete cascade,
  paciente_id uuid references pacientes(id) on delete cascade,
  pacote_id uuid references pacotes_sessoes(id),
  profissional_id uuid references profissionais(id),
  sessoes_total int not null,
  sessoes_utilizadas int default 0,
  valor_pago numeric(10,2),
  data_compra date default current_date,
  data_expiracao date,
  status text default 'ativo' check (status in ('ativo','expirado','encerrado')),
  created_at timestamptz default now()
);

create table if not exists creditos_reposicao (
  id uuid primary key default uuid_generate_v4(),
  empresa_id uuid references empresas(id) on delete cascade,
  paciente_id uuid references pacientes(id) on delete cascade,
  turma_id uuid references turmas(id),
  agendamento_id uuid references agendamentos(id),
  motivo text,
  data_expiracao date,
  utilizado boolean default false,
  created_at timestamptz default now()
);

create table if not exists receitas (
  id uuid primary key default uuid_generate_v4(),
  empresa_id uuid references empresas(id) on delete cascade,
  paciente_id uuid references pacientes(id),
  profissional_id uuid references profissionais(id),
  agendamento_id uuid references agendamentos(id),
  pacote_id uuid references pacotes_paciente(id),
  descricao text not null,
  valor numeric(10,2) not null,
  categoria text default 'sessao',
  forma_pagamento text default 'pix' check (forma_pagamento in ('pix','cartao_debito','cartao_credito','boleto','dinheiro','transferencia')),
  status text default 'recebido' check (status in ('pendente','recebido','cancelado')),
  data_vencimento date,
  data_pagamento date,
  created_at timestamptz default now()
);

create table if not exists despesas (
  id uuid primary key default uuid_generate_v4(),
  empresa_id uuid references empresas(id) on delete cascade,
  descricao text not null,
  valor numeric(10,2) not null,
  categoria text default 'outros',
  forma_pagamento text,
  status text default 'pago' check (status in ('pendente','pago','cancelado')),
  data_vencimento date,
  data_pagamento date,
  created_at timestamptz default now()
);

create table if not exists comissoes (
  id uuid primary key default uuid_generate_v4(),
  empresa_id uuid references empresas(id) on delete cascade,
  profissional_id uuid references profissionais(id) on delete cascade,
  receita_id uuid references receitas(id),
  valor_bruto numeric(10,2),
  percentual numeric(5,2),
  valor_comissao numeric(10,2),
  status text default 'pendente' check (status in ('pendente','pago')),
  data_pagamento date,
  created_at timestamptz default now()
);

create table if not exists inadimplencia_historico (
  id uuid primary key default uuid_generate_v4(),
  empresa_id uuid references empresas(id) on delete cascade,
  paciente_id uuid references pacientes(id) on delete cascade,
  receita_id uuid references receitas(id),
  valor_devido numeric(10,2),
  dias_atraso int,
  faixa text check (faixa in ('0_30','31_60','61_90','mais_90')),
  status text default 'pendente' check (status in ('pendente','quitado','negociado')),
  ultima_cobranca timestamptz,
  bloqueado boolean default false,
  created_at timestamptz default now()
);

-- =============================================
-- GRUPO 8: TELECONSULTA E CONFORMIDADE
-- =============================================

create table if not exists teleconsultas (
  id uuid primary key default uuid_generate_v4(),
  empresa_id uuid references empresas(id) on delete cascade,
  agendamento_id uuid references agendamentos(id) on delete cascade,
  link_sala text,
  consentimento_paciente boolean default false,
  data_inicio timestamptz,
  data_fim timestamptz,
  registrado_prontuario boolean default false,
  created_at timestamptz default now()
);

create table if not exists assinaturas_digitais (
  id uuid primary key default uuid_generate_v4(),
  empresa_id uuid references empresas(id) on delete cascade,
  documento_tipo text,
  documento_id uuid,
  profissional_id uuid references profissionais(id),
  certificado_info jsonb default '{}',
  hash_documento text,
  url_documento_assinado text,
  status text default 'pendente' check (status in ('pendente','assinado','cancelado')),
  created_at timestamptz default now()
);

create table if not exists kpis_mensais (
  id uuid primary key default uuid_generate_v4(),
  empresa_id uuid references empresas(id) on delete cascade,
  mes int not null,
  ano int not null,
  taxa_ocupacao numeric(5,2),
  ticket_medio numeric(10,2),
  receita_total numeric(10,2),
  despesa_total numeric(10,2),
  novos_pacientes int default 0,
  pacientes_ativos int default 0,
  taxa_inadimplencia numeric(5,2),
  nps numeric(5,2),
  created_at timestamptz default now(),
  unique(empresa_id, mes, ano)
);

create table if not exists formularios_paciente (
  id uuid primary key default uuid_generate_v4(),
  empresa_id uuid references empresas(id) on delete cascade,
  paciente_id uuid references pacientes(id) on delete cascade,
  tipo text not null,
  conteudo jsonb default '{}',
  preenchido boolean default false,
  data_preenchimento timestamptz,
  created_at timestamptz default now()
);

create table if not exists notificacoes (
  id uuid primary key default uuid_generate_v4(),
  empresa_id uuid references empresas(id) on delete cascade,
  usuario_id uuid references usuarios(id),
  titulo text not null,
  mensagem text,
  tipo text default 'info' check (tipo in ('info','alerta','sucesso','erro')),
  lida boolean default false,
  link text,
  created_at timestamptz default now()
);

create table if not exists auditoria_log (
  id uuid primary key default uuid_generate_v4(),
  empresa_id uuid references empresas(id),
  usuario_id uuid references usuarios(id),
  acao text not null,
  tabela text,
  registro_id uuid,
  dados_anteriores jsonb,
  dados_novos jsonb,
  ip text,
  created_at timestamptz default now()
);

-- =============================================
-- DADOS INICIAIS (SEED)
-- =============================================

-- Empresa demo
insert into empresas (id, nome, email, telefone) values
  ('00000000-0000-0000-0000-000000000001', 'CinesioPro Demo', 'contato@cinesiopro.com.br', '(31) 99999-9999')
on conflict do nothing;

-- Plano SaaS básico
insert into planos_saas (nome, max_profissionais, max_pacientes, max_minutos_ia, valor_mensal) values
  ('Básico', 3, 100, 60, 149.00),
  ('Pro', 10, 500, 300, 349.00),
  ('Enterprise', 999, 9999, 9999, 799.00)
on conflict do nothing;

-- Salas demo
insert into salas (empresa_id, nome, capacidade, tipo) values
  ('00000000-0000-0000-0000-000000000001', 'Estúdio A', 6, 'pilates'),
  ('00000000-0000-0000-0000-000000000001', 'Estúdio B', 4, 'pilates'),
  ('00000000-0000-0000-0000-000000000001', 'Reab. 1', 1, 'atendimento'),
  ('00000000-0000-0000-0000-000000000001', 'Reab. 2', 1, 'atendimento')
on conflict do nothing;

-- Serviços demo
insert into servicos (empresa_id, nome, duracao_minutos, valor, tipo) values
  ('00000000-0000-0000-0000-000000000001', 'Fisioterapia Individual', 50, 120.00, 'fisioterapia'),
  ('00000000-0000-0000-0000-000000000001', 'Pilates Solo', 55, 90.00, 'pilates'),
  ('00000000-0000-0000-0000-000000000001', 'Pilates Avançado', 55, 100.00, 'pilates'),
  ('00000000-0000-0000-0000-000000000001', 'Avaliação Inicial', 60, 150.00, 'avaliacao'),
  ('00000000-0000-0000-0000-000000000001', 'Teleconsulta', 30, 80.00, 'teleconsulta')
on conflict do nothing;

-- =============================================
-- RLS (Row Level Security)
-- =============================================

alter table empresas enable row level security;
alter table usuarios enable row level security;
alter table profissionais enable row level security;
alter table servicos enable row level security;
alter table salas enable row level security;
alter table pacientes enable row level security;
alter table agendamentos enable row level security;
alter table prontuarios enable row level security;
alter table planos_tratamento enable row level security;
alter table evolucoes_clinicas enable row level security;
alter table escalas_aplicadas enable row level security;
alter table turmas enable row level security;
alter table turma_alunos enable row level security;
alter table presencas_turma enable row level security;
alter table pacotes_paciente enable row level security;
alter table receitas enable row level security;
alter table despesas enable row level security;
alter table kpis_mensais enable row level security;
alter table notificacoes enable row level security;

-- Política básica: usuário vê apenas dados da sua empresa
create policy "usuarios_empresa" on usuarios
  for all using (empresa_id = (select empresa_id from usuarios where id = auth.uid()));

create policy "profissionais_empresa" on profissionais
  for all using (empresa_id = (select empresa_id from usuarios where id = auth.uid()));

create policy "pacientes_empresa" on pacientes
  for all using (empresa_id = (select empresa_id from usuarios where id = auth.uid()));

create policy "agendamentos_empresa" on agendamentos
  for all using (empresa_id = (select empresa_id from usuarios where id = auth.uid()));

create policy "prontuarios_empresa" on prontuarios
  for all using (empresa_id = (select empresa_id from usuarios where id = auth.uid()));

create policy "servicos_empresa" on servicos
  for all using (empresa_id = (select empresa_id from usuarios where id = auth.uid()));

create policy "salas_empresa" on salas
  for all using (empresa_id = (select empresa_id from usuarios where id = auth.uid()));

create policy "receitas_empresa" on receitas
  for all using (empresa_id = (select empresa_id from usuarios where id = auth.uid()));

create policy "despesas_empresa" on despesas
  for all using (empresa_id = (select empresa_id from usuarios where id = auth.uid()));

create policy "notificacoes_usuario" on notificacoes
  for all using (usuario_id = auth.uid());

-- Empresas: usuário vê apenas a sua
create policy "empresa_propria" on empresas
  for all using (id = (select empresa_id from usuarios where id = auth.uid()));

-- =============================================
-- FUNÇÃO: atualizar updated_at automaticamente
-- =============================================

create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger t_empresas_updated before update on empresas
  for each row execute function update_updated_at();
create trigger t_usuarios_updated before update on usuarios
  for each row execute function update_updated_at();
create trigger t_profissionais_updated before update on profissionais
  for each row execute function update_updated_at();
create trigger t_pacientes_updated before update on pacientes
  for each row execute function update_updated_at();
create trigger t_agendamentos_updated before update on agendamentos
  for each row execute function update_updated_at();
create trigger t_planos_updated before update on planos_tratamento
  for each row execute function update_updated_at();
