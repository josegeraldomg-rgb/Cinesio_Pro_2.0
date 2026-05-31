// ─── Gerador de Contrato de Prestação de Serviços ────────────────────────────
// Estratégia: HTML completo → window.open() → window.print()

// ─── Tipos exportados ─────────────────────────────────────────────────────────

export interface ContratoConfig {
  // Empresa / Contratada
  razao_social:          string
  cnpj:                  string
  endereco:              string
  cidade_empresa:        string
  estado_empresa:        string
  responsavel_tecnico:   string
  registro_profissional: string
  telefone_empresa:      string
  email_empresa:         string

  // Vigência
  vigencia_meses:       number
  renovacao_automatica: boolean
  aviso_previo_dias:    number

  // Financeiro
  dia_vencimento:              number
  forma_pagamento_pix:         boolean
  chave_pix:                   string
  forma_pagamento_boleto:      boolean
  forma_pagamento_transferencia: boolean
  banco:                       string
  agencia:                     string
  conta:                       string
  forma_pagamento_cartao:      boolean
  multa_atraso_pct:            number
  juros_mes_pct:               number
  prazo_inadimplencia_dias:    number
  indice_reajuste:             string
  percentual_reajuste_fixo:    number

  // Aulas
  aviso_cancelamento_aula_horas: number
  prazo_atestado_horas:          number
  prazo_suspensao_medica_dias:   number
  aviso_falta_horas:             number
  canal_comunicacao:             string
  tolerancia_atraso_minutos:     number

  // Rescisão
  prazo_rescisao_contratante_dias: number
  percentual_multa_rescisoria:     number
  limite_multa_mensalidades:       number
  prazo_rescisao_empresa_dias:     number
  prazo_restituicao_dias:          number

  // LGPD
  email_dpo:               string
  prazo_retencao_dados_anos: number

  // Foro
  cidade_foro: string
  estado_foro: string

  // Outros
  nome_metodo: string
}

export interface DadosAluno {
  nome:            string
  cpf:             string | null
  data_nascimento: string | null
  rg:              string | null
  telefone:        string | null
  email:           string | null
  endereco:        string | null
  cidade:          string | null
  estado:          string | null
}

export interface DadosPlano {
  nome_servico:       string
  modalidade:         string
  frequencia_semanal: number
  valor_mensal:       number
  dias_semana_str:    string
  horario_str:        string
  duracao_minutos:    number | null
  max_alunos:         number | null
  nome_instrutor:     string | null
  data_inicio:        string
  data_fim:           string | null
}

// ─── Defaults ─────────────────────────────────────────────────────────────────

export const DEFAULT_CONFIG: ContratoConfig = {
  razao_social:          '',
  cnpj:                  '',
  endereco:              '',
  cidade_empresa:        '',
  estado_empresa:        '',
  responsavel_tecnico:   '',
  registro_profissional: '',
  telefone_empresa:      '',
  email_empresa:         '',
  vigencia_meses:        12,
  renovacao_automatica:  true,
  aviso_previo_dias:     30,
  dia_vencimento:        10,
  forma_pagamento_pix:   true,
  chave_pix:             '',
  forma_pagamento_boleto:      false,
  forma_pagamento_transferencia: false,
  banco:    '',
  agencia:  '',
  conta:    '',
  forma_pagamento_cartao: false,
  multa_atraso_pct:         2,
  juros_mes_pct:            1,
  prazo_inadimplencia_dias: 30,
  indice_reajuste:          'IPCA',
  percentual_reajuste_fixo: 0,
  aviso_cancelamento_aula_horas: 24,
  prazo_atestado_horas:          48,
  prazo_suspensao_medica_dias:   30,
  aviso_falta_horas:             2,
  canal_comunicacao:             'WhatsApp',
  tolerancia_atraso_minutos:     10,
  prazo_rescisao_contratante_dias: 30,
  percentual_multa_rescisoria:     20,
  limite_multa_mensalidades:       3,
  prazo_rescisao_empresa_dias:     15,
  prazo_restituicao_dias:          30,
  email_dpo:               '',
  prazo_retencao_dados_anos: 5,
  cidade_foro: '',
  estado_foro: '',
  nome_metodo: 'Pilates',
}

// ─── Placeholders para pré-visualização ──────────────────────────────────────

const PLACEHOLDER_ALUNO: DadosAluno = {
  nome:            '[Nome Completo do Aluno]',
  cpf:             '[000.000.000-00]',
  data_nascimento: null,
  rg:              null,
  telefone:        null,
  email:           null,
  endereco:        null,
  cidade:          null,
  estado:          null,
}

const PLACEHOLDER_PLANO: DadosPlano = {
  nome_servico:       '[Serviço]',
  modalidade:         '[Pilates Solo / Aparelho / Semi-Privado]',
  frequencia_semanal: 2,
  valor_mensal:       0,
  dias_semana_str:    '[Segunda e Quarta]',
  horario_str:        '[09h00]',
  duracao_minutos:    50,
  max_alunos:         4,
  nome_instrutor:     null,
  data_inicio:        new Date().toISOString().slice(0, 10),
  data_fim:           null,
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function blank(s: string | null | undefined, fallback = '___________'): string {
  return s?.trim() || fallback
}

function fmtData(iso: string | null, fallback = '___________'): string {
  if (!iso) return fallback
  try { return new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) }
  catch { return iso }
}

function fmtDataExtenso(iso: string | null, fallback = '___________'): string {
  if (!iso) return fallback
  try { return new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }) }
  catch { return iso }
}

function fmtCNPJ(cnpj: string): string {
  if (!cnpj) return '___________'
  const d = cnpj.replace(/\D/g, '')
  if (d.length === 14) return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5,8)}/${d.slice(8,12)}-${d.slice(12)}`
  if (d.length === 11) return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6,9)}-${d.slice(9)}`
  return cnpj || '___________'
}

function fmtCPF(cpf: string | null): string {
  if (!cpf) return '___________'
  const d = cpf.replace(/\D/g, '')
  if (d.length === 11) return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6,9)}-${d.slice(9)}`
  return cpf
}

function fmtTelefone(tel: string): string {
  if (!tel) return '___________'
  const d = tel.replace(/\D/g, '')
  if (d.length === 11) return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`
  if (d.length === 10) return `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`
  return tel
}

function valorPorExtenso(n: number): string {
  const inteiro  = Math.floor(n)
  const centavos = Math.round((n - inteiro) * 100)
  const UN  = ['','um','dois','três','quatro','cinco','seis','sete','oito','nove']
  const ESP = ['dez','onze','doze','treze','quatorze','quinze','dezesseis','dezessete','dezoito','dezenove']
  const DEZ = ['','dez','vinte','trinta','quarenta','cinquenta','sessenta','setenta','oitenta','noventa']
  const CEN = ['','cento','duzentos','trezentos','quatrocentos','quinhentos','seiscentos','setecentos','oitocentos','novecentos']
  function w(num: number): string {
    if (num === 0)   return ''
    if (num === 100) return 'cem'
    if (num < 10)    return UN[num]
    if (num < 20)    return ESP[num - 10]
    if (num < 100)   { const d = Math.floor(num/10), u = num%10; return DEZ[d] + (u ? ' e ' + UN[u] : '') }
    if (num < 1000)  { const c = Math.floor(num/100), r = num%100; return CEN[c] + (r ? ' e ' + w(r) : '') }
    if (num < 1e6)   { const mil = Math.floor(num/1000), r = num%1000; return (mil === 1 ? 'mil' : w(mil)+' mil') + (r ? ' e ' + w(r) : '') }
    return String(num)
  }
  if (!inteiro && !centavos) return 'zero reais'
  const pi = inteiro   ? `${w(inteiro)} ${inteiro === 1 ? 'real' : 'reais'}` : ''
  const pc = centavos  ? `${w(centavos)} ${centavos === 1 ? 'centavo' : 'centavos'}` : ''
  return [pi, pc].filter(Boolean).join(' e ')
}

function hoje(): string {
  return new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
}

function calcMeses(inicio: string, fim: string | null): number | null {
  if (!fim) return null
  const d1 = new Date(inicio + 'T12:00:00'), d2 = new Date(fim + 'T12:00:00')
  return Math.max(1, (d2.getFullYear() - d1.getFullYear()) * 12 + d2.getMonth() - d1.getMonth())
}

// ─── CSS do contrato ──────────────────────────────────────────────────────────

const CSS = `
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  font-family: 'Georgia', 'Times New Roman', serif;
  font-size: 10.5pt;
  color: #1E1E2E;
  background: #fff;
  line-height: 1.65;
}
@media print {
  body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  @page { size: A4; margin: 12mm 18mm; }
  .no-break { page-break-inside: avoid; }
  .page-break { page-break-before: always; }
}

/* ── HEADER ── */
.header {
  background: linear-gradient(135deg, #4A3AE8 0%, #3D2ED6 55%, #2D1FC8 100%);
  color: #fff;
  padding: 26px 48px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: relative;
  overflow: hidden;
}
.header::before {
  content: '';
  position: absolute;
  right: -30px; top: -30px;
  width: 200px; height: 200px;
  border-radius: 50%;
  background: rgba(255,255,255,0.06);
}
.header::after {
  content: '';
  position: absolute;
  right: 100px; bottom: -60px;
  width: 150px; height: 150px;
  border-radius: 50%;
  background: rgba(255,255,255,0.04);
}
.h-empresa { font-family: Arial, sans-serif; font-size: 19pt; font-weight: 900; letter-spacing: 0.2px; position: relative; z-index: 1; }
.h-sub     { font-family: Arial, sans-serif; font-size: 8pt; opacity: 0.72; text-transform: uppercase; letter-spacing: 2px; margin-top: 5px; }
.h-right   { text-align: right; font-family: Arial, sans-serif; position: relative; z-index: 1; }
.h-date    { font-size: 10pt; font-weight: 700; opacity: 0.9; }
.h-tipo    { font-size: 7.5pt; text-transform: uppercase; letter-spacing: 1.5px; opacity: 0.65; margin-top: 3px; }

/* ── CORPO ── */
.body { padding: 34px 48px 48px; }

/* ── TÍTULO ── */
.titulo {
  text-align: center;
  font-family: Arial, sans-serif;
  font-size: 13pt;
  font-weight: 900;
  color: #4A3AE8;
  text-transform: uppercase;
  letter-spacing: 0.7px;
  padding-bottom: 13px;
  border-bottom: 3px solid #4A3AE8;
  margin-bottom: 4px;
}
.subtitulo {
  text-align: center;
  font-family: Arial, sans-serif;
  font-size: 7.5pt;
  color: #94A3B8;
  text-transform: uppercase;
  letter-spacing: 2px;
  margin-bottom: 28px;
}

/* ── BADGE ── */
.badge {
  display: inline-block;
  background: #4A3AE8;
  color: #fff;
  font-family: Arial, sans-serif;
  font-size: 6.5pt;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 2.5px;
  padding: 4px 12px;
  border-radius: 4px;
  margin: 6px 0 14px;
}

/* ── PARTES ── */
.partes { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 8px; }
.parte {
  background: #FAFBFF;
  border: 1.5px solid #E2E8F0;
  border-radius: 10px;
  padding: 15px 17px;
}
.parte-titulo {
  font-family: Arial, sans-serif;
  font-size: 6.5pt;
  font-weight: 900;
  color: #4A3AE8;
  text-transform: uppercase;
  letter-spacing: 1.5px;
  padding-bottom: 8px;
  border-bottom: 1px solid #EEF0FD;
  margin-bottom: 10px;
}
.campo { margin-bottom: 6px; }
.campo-label {
  font-family: Arial, sans-serif;
  font-size: 6.5pt;
  font-weight: 700;
  color: #94A3B8;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  display: block;
  margin-bottom: 1px;
}
.campo-valor { font-size: 9.5pt; color: #1E1E2E; font-weight: 600; }
.campo-vazio { font-size: 9.5pt; color: #94A3B8; border-bottom: 1px solid #CBD5E1; display: inline-block; min-width: 100px; }

/* ── NOTA MENOR ── */
.nota-menor {
  background: #FFFBEB;
  border: 1px solid #FDE68A;
  border-radius: 8px;
  padding: 10px 14px;
  font-size: 9pt;
  color: #92400E;
  margin: 12px 0 8px;
  font-family: Arial, sans-serif;
}

/* ── INTRO ── */
.intro {
  background: linear-gradient(to right, #EEF0FD, #F8F9FF);
  border-left: 3.5px solid #4A3AE8;
  border-radius: 0 8px 8px 0;
  padding: 13px 16px;
  margin: 18px 0 22px;
  font-size: 10pt;
  color: #334155;
  line-height: 1.7;
  text-align: justify;
}

/* ── CLÁUSULAS ── */
.clausula { margin-bottom: 20px; }
.clausula-titulo {
  font-family: Arial, sans-serif;
  font-size: 8.5pt;
  font-weight: 900;
  color: #fff;
  background: #4A3AE8;
  padding: 6px 14px;
  border-radius: 5px;
  margin-bottom: 11px;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}
.clausula-body { font-size: 10pt; color: #334155; line-height: 1.7; }
.clausula-item { margin-bottom: 9px; text-align: justify; }
.clausula-sub  { margin: 6px 0 6px 20px; font-size: 10pt; color: #334155; text-align: justify; line-height: 1.7; }
.clausula-lista { margin: 7px 0 7px 26px; }
.clausula-lista li { margin-bottom: 5px; font-size: 10pt; color: #334155; line-height: 1.65; }

/* ── TABELA ── */
table.dados { width: 100%; border-collapse: collapse; margin: 11px 0; font-size: 9.5pt; }
table.dados th {
  background: #4A3AE8; color: #fff;
  text-align: left; padding: 7px 13px;
  font-family: Arial, sans-serif; font-size: 8pt; font-weight: 700;
}
table.dados td { padding: 7px 13px; border-bottom: 1px solid #E2E8F0; vertical-align: top; }
table.dados tr:nth-child(even) td { background: #F8F9FF; }
table.dados .td-r { font-family: Arial, sans-serif; font-size: 8pt; font-weight: 700; color: #64748B; width: 40%; }

/* ── FORMAS DE PAGAMENTO ── */
.pagamento-ops { margin: 8px 0 4px 4px; }
.pagamento-op { display: flex; align-items: center; gap: 8px; margin-bottom: 5px; font-size: 10pt; color: #334155; }
.caixa { width: 13px; height: 13px; border: 1.5px solid #94A3B8; border-radius: 2px; flex-shrink: 0; display: inline-flex; align-items: center; justify-content: center; }
.marcada { background: #4A3AE8 !important; border-color: #4A3AE8 !important; }
.marcada::after { content: '✓'; font-size: 8px; color: #fff; font-weight: 900; }

/* ── ASSINATURAS ── */
.assinaturas { margin-top: 40px; }
.local-data { font-size: 10pt; color: #334155; margin-bottom: 34px; }
.sig-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 48px; margin-bottom: 32px; }
.sig { text-align: center; }
.sig-linha { border-top: 1.5px solid #1E1E2E; margin-bottom: 8px; }
.sig-nome { font-size: 10pt; font-weight: 700; color: #1E1E2E; margin-bottom: 3px; }
.sig-detalhe { font-size: 8.5pt; color: #64748B; }
.sig-unico { max-width: 340px; margin: 0 auto 32px; }
.testemunhas { display: grid; grid-template-columns: 1fr 1fr; gap: 48px; padding-top: 22px; border-top: 1px dashed #CBD5E1; }

/* ── NOTA DIGITAL ── */
.nota-digital {
  margin-top: 26px;
  background: #F8F9FF;
  border: 1px solid #C7D2FE;
  border-radius: 8px;
  padding: 11px 15px;
  font-size: 9pt;
  color: #4338CA;
  font-family: Arial, sans-serif;
  line-height: 1.6;
}

/* ── RODAPÉ ── */
.rodape {
  background: #4A3AE8;
  color: rgba(255,255,255,0.75);
  font-family: Arial, sans-serif;
  font-size: 7.5pt;
  padding: 10px 48px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 32px;
}
`

// ─── Gerador Principal ────────────────────────────────────────────────────────

export function gerarPDFContrato(
  config:  ContratoConfig,
  aluno?:  DadosAluno,
  plano?:  DadosPlano,
): string {
  const al = aluno ?? PLACEHOLDER_ALUNO
  const pl = plano ?? PLACEHOLDER_PLANO

  const valorFmt   = pl.valor_mensal > 0 ? `R$ ${pl.valor_mensal.toFixed(2).replace('.', ',')}` : '[Valor]'
  const valorExt   = pl.valor_mensal > 0 ? valorPorExtenso(pl.valor_mensal) : '[valor por extenso]'
  const prazoMeses = calcMeses(pl.data_inicio, pl.data_fim) ?? config.vigencia_meses
  const temPrazo   = !!pl.data_fim
  const cidade     = config.cidade_foro || config.cidade_empresa || al.cidade || '___________'
  const estado     = config.estado_foro || config.estado_empresa || al.estado || '__'
  const instrNome  = pl.nome_instrutor || config.responsavel_tecnico || '___________'
  const endEmpresa = [config.endereco, config.cidade_empresa, config.estado_empresa].filter(Boolean).join(', ') || '___________'

  const cb = (checked: boolean) =>
    checked
      ? `<span class="caixa marcada"></span>`
      : `<span class="caixa"></span>`

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Contrato — ${al.nome}</title>
<style>${CSS}</style>
</head>
<body>

<div class="header">
  <div>
    <div class="h-empresa">${blank(config.razao_social, 'Clínica')}</div>
    <div class="h-sub">Contrato de Prestação de Serviços</div>
  </div>
  <div class="h-right">
    <div class="h-date">${hoje()}</div>
    <div class="h-tipo">Instrumento Particular</div>
  </div>
</div>

<div class="body">

<div class="titulo">Contrato de Prestação de Serviços de ${pl.nome_servico}</div>
<div class="subtitulo">Instrumento Particular — Duas Vias de Igual Teor e Força</div>

<div class="badge">Identificação das Partes</div>

<div class="partes no-break">
  <div class="parte">
    <div class="parte-titulo">Contratada</div>
    <div class="campo"><span class="campo-label">Razão Social / Nome</span><span class="campo-valor">${blank(config.razao_social)}</span></div>
    <div class="campo"><span class="campo-label">CNPJ / CPF</span><span class="campo-valor">${fmtCNPJ(config.cnpj)}</span></div>
    <div class="campo"><span class="campo-label">Endereço</span><span class="campo-valor">${endEmpresa}</span></div>
    <div class="campo"><span class="campo-label">Responsável Técnico</span><span class="campo-valor">${blank(config.responsavel_tecnico)}</span></div>
    <div class="campo"><span class="campo-label">CREF / Registro</span><span class="campo-valor">${blank(config.registro_profissional)}</span></div>
    <div class="campo"><span class="campo-label">Telefone</span><span class="campo-valor">${fmtTelefone(config.telefone_empresa)}</span></div>
    <div class="campo"><span class="campo-label">E-mail</span><span class="campo-valor">${blank(config.email_empresa)}</span></div>
  </div>
  <div class="parte">
    <div class="parte-titulo">Contratante (Aluno)</div>
    <div class="campo"><span class="campo-label">Nome Completo</span><span class="campo-valor">${blank(al.nome)}</span></div>
    <div class="campo"><span class="campo-label">CPF</span><span class="campo-valor">${fmtCPF(al.cpf)}</span></div>
    <div class="campo"><span class="campo-label">Data de Nascimento</span><span class="campo-valor">${fmtData(al.data_nascimento)}</span></div>
    <div class="campo"><span class="campo-label">RG</span><span class="${al.rg ? 'campo-valor' : 'campo-vazio'}">${blank(al.rg)}</span></div>
    <div class="campo"><span class="campo-label">Endereço</span><span class="${al.endereco ? 'campo-valor' : 'campo-vazio'}">${blank(al.endereco)}</span></div>
    <div class="campo"><span class="campo-label">Telefone</span><span class="campo-valor">${fmtTelefone(al.telefone ?? '')}</span></div>
    <div class="campo"><span class="campo-label">E-mail</span><span class="${al.email ? 'campo-valor' : 'campo-vazio'}">${blank(al.email)}</span></div>
  </div>
</div>

<div class="nota-menor">
  <strong>⚠ Responsável Legal</strong> (somente para menores de 18 anos):<br>
  Nome: <span style="border-bottom:1px solid #D97706;display:inline-block;min-width:180px;">&nbsp;</span>
  &nbsp;&nbsp;CPF: <span style="border-bottom:1px solid #D97706;display:inline-block;min-width:120px;">&nbsp;</span>
</div>

<div class="intro">
  As partes acima identificadas celebram o presente <strong>Contrato de Prestação de Serviços de ${pl.nome_servico}</strong>,
  doravante denominado simplesmente "Contrato", que se regerá pelas cláusulas e condições a seguir estabelecidas,
  em conformidade com a legislação brasileira vigente.
</div>

<div class="clausula no-break">
  <div class="clausula-titulo">Cláusula 1 — Objeto do Contrato</div>
  <div class="clausula-body">
    <div class="clausula-item">1.1. O presente contrato tem por objeto a prestação de serviços de <strong>${pl.nome_servico}</strong> pela CONTRATADA ao CONTRATANTE:</div>
    <table class="dados">
      <tr><th>Item</th><th>Descrição</th></tr>
      <tr><td class="td-r">Modalidade</td><td>${blank(pl.modalidade)}</td></tr>
      <tr><td class="td-r">Turma / Horário</td><td>${blank(pl.horario_str)}</td></tr>
      <tr><td class="td-r">Frequência semanal</td><td><strong>${pl.frequencia_semanal}x por semana</strong></td></tr>
      <tr><td class="td-r">Dias da semana</td><td>${blank(pl.dias_semana_str)}</td></tr>
      <tr><td class="td-r">Duração de cada aula</td><td><strong>${pl.duracao_minutos ?? '___'} minutos</strong></td></tr>
      <tr><td class="td-r">Máximo de alunos por aula</td><td><strong>${pl.max_alunos ?? '___'} aluno(s)</strong></td></tr>
      <tr><td class="td-r">Instrutor(a) responsável</td><td>${instrNome}</td></tr>
    </table>
    <div class="clausula-item">1.2. A CONTRATADA poderá substituir o(a) instrutor(a) por profissional igualmente habilitado, sem que isso configure descumprimento contratual.</div>
  </div>
</div>

<div class="clausula no-break">
  <div class="clausula-titulo">Cláusula 2 — Prazo de Vigência</div>
  <div class="clausula-body">
    ${temPrazo
      ? `<div class="clausula-item">2.1. O presente contrato terá vigência de <strong>${prazoMeses} meses</strong>, com início em <strong>${fmtDataExtenso(pl.data_inicio)}</strong> e término em <strong>${fmtDataExtenso(pl.data_fim)}</strong>.</div>
         <div class="clausula-item">2.2. Findo o prazo, o contrato ${config.renovacao_automatica ? 'será <strong>renovado automaticamente</strong> por igual período' : 'deverá ser renovado expressamente por escrito'}, salvo manifestação contrária de qualquer das partes com antecedência mínima de <strong>${config.aviso_previo_dias} dias</strong> antes do vencimento.</div>`
      : `<div class="clausula-item">2.1. O presente contrato vigorará por <strong>prazo indeterminado</strong>, com início em <strong>${fmtDataExtenso(pl.data_inicio)}</strong>, podendo ser rescindido por qualquer das partes conforme a Cláusula 7.</div>
         <div class="clausula-item">2.2. Para rescisão, é necessário aviso prévio por escrito com antecedência mínima de <strong>${config.aviso_previo_dias} dias</strong>.</div>`}
  </div>
</div>

<div class="clausula no-break">
  <div class="clausula-titulo">Cláusula 3 — Valor, Forma e Condições de Pagamento</div>
  <div class="clausula-body">
    <div class="clausula-item">3.1. O CONTRATANTE pagará à CONTRATADA o valor mensal de <strong>${valorFmt} (${valorExt})</strong>.</div>
    <div class="clausula-item">3.2. O pagamento deverá ser efetuado até o dia <strong>${config.dia_vencimento}</strong> de cada mês, por meio de:</div>
    <div class="pagamento-ops">
      <div class="pagamento-op">${cb(config.forma_pagamento_pix)} PIX — chave: <strong>${blank(config.chave_pix)}</strong></div>
      <div class="pagamento-op">${cb(config.forma_pagamento_boleto)} Boleto bancário</div>
      <div class="pagamento-op">${cb(config.forma_pagamento_transferencia)} Transferência bancária — Banco: <strong>${blank(config.banco)}</strong> | Ag.: <strong>${blank(config.agencia)}</strong> | Conta: <strong>${blank(config.conta)}</strong></div>
      <div class="pagamento-op">${cb(config.forma_pagamento_cartao)} Cartão de crédito/débito</div>
    </div>
    <div class="clausula-item">3.3. <strong>Multa por atraso:</strong> multa de <strong>${config.multa_atraso_pct}%</strong> sobre o valor em aberto, acrescida de juros de <strong>${config.juros_mes_pct}% ao mês</strong> (<em>pro rata die</em>), nos termos do art. 52, §1º do CDC e art. 395 do Código Civil.</div>
    <div class="clausula-item">3.4. O não pagamento por mais de <strong>${config.prazo_inadimplencia_dias} dias</strong> faculta à CONTRATADA suspender o acesso do CONTRATANTE às aulas, sem prejuízo da cobrança dos valores em aberto.</div>
    <div class="clausula-item">3.5. Os valores poderão ser reajustados anualmente com base no índice <strong>${config.indice_reajuste}</strong>${config.percentual_reajuste_fixo > 0 ? ` ou no percentual de <strong>${config.percentual_reajuste_fixo}%</strong>, prevalecendo o maior,` : ','} mediante comunicação com antecedência mínima de <strong>30 dias</strong>.</div>
  </div>
</div>

<div class="clausula no-break">
  <div class="clausula-titulo">Cláusula 4 — Obrigações da Contratada</div>
  <div class="clausula-body">
    <div class="clausula-item">4.1. A CONTRATADA obriga-se a:</div>
    <ul class="clausula-lista">
      <li>Prestar os serviços com profissionais devidamente habilitados e registrados no CREF;</li>
      <li>Disponibilizar espaço físico, equipamentos e materiais adequados à prática de <strong>${pl.nome_servico}</strong>, em condições de higiene e segurança;</li>
      <li>Respeitar os limites físicos e restrições de saúde informados pelo CONTRATANTE;</li>
      <li>Manter sigilo sobre os dados pessoais e de saúde do CONTRATANTE (LGPD — Lei nº 13.709/2018);</li>
      <li>Comunicar com antecedência mínima de <strong>${config.aviso_cancelamento_aula_horas} horas</strong> eventuais cancelamentos de aulas;</li>
      <li>Repor as aulas canceladas pela CONTRATADA conforme Cláusula 5.</li>
    </ul>
  </div>
</div>

<div class="clausula no-break">
  <div class="clausula-titulo">Cláusula 5 — Reposição de Aulas e Faltas</div>
  <div class="clausula-body">
    <div class="clausula-item">5.1. <strong>Faltas do CONTRATANTE:</strong> não haverá reposição, salvo nos seguintes casos:</div>
    <ul class="clausula-lista">
      <li>Apresentação de atestado médico em até <strong>${config.prazo_atestado_horas} horas</strong> após a falta;</li>
      <li>Casos fortuitos ou de força maior, a critério da CONTRATADA.</li>
    </ul>
    <div class="clausula-item">5.2. Aulas canceladas pela CONTRATADA serão repostas em data acordada, sem custo adicional.</div>
    <div class="clausula-item">5.3. Afastamento médico comprovado igual ou superior a <strong>${config.prazo_suspensao_medica_dias} dias</strong> poderá suspender o contrato pelo mesmo período, sem cobrança.</div>
    <div class="clausula-item">5.4. O CONTRATANTE deverá comunicar sua falta com antecedência mínima de <strong>${config.aviso_falta_horas} horas</strong> pelo canal <strong>${config.canal_comunicacao}</strong>.</div>
  </div>
</div>

<div class="clausula no-break">
  <div class="clausula-titulo">Cláusula 6 — Obrigações do Contratante</div>
  <div class="clausula-body">
    <div class="clausula-item">6.1. O CONTRATANTE obriga-se a:</div>
    <ul class="clausula-lista">
      <li>Efetuar os pagamentos nas datas e formas estabelecidas na Cláusula 3;</li>
      <li>Apresentar atestado médico de aptidão física para a prática de <strong>${pl.nome_servico}</strong>, quando solicitado;</li>
      <li>Informar qualquer condição de saúde, lesão, restrição médica ou medicamento que possa influenciar as atividades;</li>
      <li>Respeitar as normas internas do estabelecimento, demais alunos e profissionais;</li>
      <li>Chegar com pontualidade — atrasos acima de <strong>${config.tolerancia_atraso_minutos} minutos</strong> poderão ser considerados falta;</li>
      <li>Utilizar vestuário e calçado adequados às atividades;</li>
      <li>Não gravar, fotografar ou filmar aulas sem autorização prévia por escrito.</li>
    </ul>
  </div>
</div>

<div class="clausula no-break">
  <div class="clausula-titulo">Cláusula 7 — Rescisão</div>
  <div class="clausula-body">
    <div class="clausula-item">7.1. <strong>Pelo CONTRATANTE:</strong> mediante aviso escrito com antecedência mínima de <strong>${config.prazo_rescisao_contratante_dias} dias</strong>.</div>
    <div class="clausula-sub">7.1.1. Na rescisão antecipada (prazo determinado), incidirá multa de <strong>${config.percentual_multa_rescisoria}%</strong> das mensalidades remanescentes, limitada a <strong>${config.limite_multa_mensalidades} mensalidades</strong>.</div>
    <div class="clausula-sub">7.1.2. Dispensada a multa em caso de comprovado motivo de saúde, mudança de cidade ou demissão sem justa causa.</div>
    <div class="clausula-item">7.2. <strong>Pela CONTRATADA:</strong> mediante aviso com antecedência mínima de <strong>${config.prazo_rescisao_empresa_dias} dias</strong>, nos casos de:</div>
    <ul class="clausula-lista">
      <li>Inadimplência superior a <strong>${config.prazo_inadimplencia_dias} dias</strong>;</li>
      <li>Descumprimento reiterado das normas internas;</li>
      <li>Conduta incompatível com o ambiente;</li>
      <li>Encerramento das atividades da CONTRATADA.</li>
    </ul>
    <div class="clausula-item">7.3. Em rescisão pela CONTRATADA sem culpa do CONTRATANTE, os valores proporcionais não utilizados serão restituídos em <strong>${config.prazo_restituicao_dias} dias</strong>.</div>
  </div>
</div>

<div class="clausula no-break">
  <div class="clausula-titulo">Cláusula 8 — Saúde, Segurança e Responsabilidade</div>
  <div class="clausula-body">
    <div class="clausula-item">8.1. O CONTRATANTE declara estar <strong>ciente dos riscos inerentes</strong> à prática de atividade física e assume responsabilidade pelas informações de saúde prestadas.</div>
    <div class="clausula-item">8.2. A CONTRATADA não se responsabiliza por lesões decorrentes de informações omitidas ou incorretas pelo CONTRATANTE.</div>
    <div class="clausula-item">8.3. A CONTRATADA não se responsabiliza por objetos pessoais deixados nas dependências do estabelecimento, salvo guarda expressa mediante recibo.</div>
    <div class="clausula-item">8.4. O CONTRATANTE autoriza a CONTRATADA a acionar socorro médico em emergências, sendo os custos de sua responsabilidade.</div>
    <div class="clausula-item">8.5. A prática de <strong>${pl.nome_servico}</strong> é supervisionada por profissional habilitado e segue protocolos do CREF${config.nome_metodo ? ` e do Método <strong>${config.nome_metodo}</strong>` : ''}.</div>
  </div>
</div>

<div class="clausula no-break">
  <div class="clausula-titulo">Cláusula 9 — Proteção de Dados (LGPD — Lei nº 13.709/2018)</div>
  <div class="clausula-body">
    <div class="clausula-item">9.1. Os dados pessoais e de saúde serão tratados exclusivamente para execução deste contrato, comunicações de serviço e cumprimento de obrigações legais.</div>
    <div class="clausula-item">9.2. Os dados <strong>não serão compartilhados com terceiros</strong> sem consentimento expresso, salvo obrigação legal.</div>
    <div class="clausula-item">9.3. O CONTRATANTE poderá solicitar acesso, correção, portabilidade ou exclusão de seus dados pelo e-mail: <strong>${blank(config.email_dpo || config.email_empresa)}</strong>.</div>
    <div class="clausula-item">9.4. Os dados serão armazenados por <strong>${config.prazo_retencao_dados_anos} anos</strong> após o encerramento do contrato.</div>
  </div>
</div>

<div class="clausula no-break">
  <div class="clausula-titulo">Cláusula 10 — Imagem e Divulgação</div>
  <div class="clausula-body">
    <div class="clausula-item">10.1. O CONTRATANTE &nbsp;<span class="caixa"></span> <strong>autoriza</strong> &nbsp;/&nbsp; <span class="caixa"></span> <strong>não autoriza</strong> a CONTRATADA a utilizar sua imagem, nome ou depoimento em material de divulgação e redes sociais, gratuitamente e por prazo indeterminado, para fins exclusivamente institucionais.</div>
    <div class="clausula-item">10.2. A autorização poderá ser revogada a qualquer tempo mediante comunicação escrita.</div>
  </div>
</div>

<div class="clausula no-break">
  <div class="clausula-titulo">Cláusula 11 — Disposições Gerais</div>
  <div class="clausula-body">
    <div class="clausula-item">11.1. Este contrato representa a totalidade do acordo entre as partes, substituindo entendimentos anteriores sobre o mesmo objeto.</div>
    <div class="clausula-item">11.2. Qualquer alteração somente será válida se formalizada por escrito e assinada por ambas as partes.</div>
    <div class="clausula-item">11.3. Este contrato é regido pelo <strong>Código Civil (Lei nº 10.406/2002)</strong>, pelo <strong>Código de Defesa do Consumidor (Lei nº 8.078/1990)</strong> e pela <strong>LGPD (Lei nº 13.709/2018)</strong>.</div>
  </div>
</div>

<div class="clausula no-break">
  <div class="clausula-titulo">Cláusula 12 — Foro</div>
  <div class="clausula-body">
    <div class="clausula-item">12.1. Fica eleito o foro da Comarca de <strong>${cidade}/${estado}</strong> para dirimir quaisquer dúvidas ou litígios, renunciando as partes a qualquer outro, por mais privilegiado que seja.</div>
    <div class="clausula-item">12.2. Antes de qualquer medida judicial, as partes comprometem-se a buscar solução amigável, podendo recorrer à mediação nos termos da Lei nº 13.140/2015.</div>
  </div>
</div>

<div class="assinaturas no-break">
  <div class="badge">Assinaturas</div>
  <div class="local-data">
    Celebrado em <strong>${blank(config.cidade_empresa || cidade)}</strong>, aos
    <span style="border-bottom:1px solid #666;display:inline-block;width:28px;text-align:center;">&nbsp;</span>
    de <span style="border-bottom:1px solid #666;display:inline-block;width:100px;">&nbsp;</span>
    de <span style="border-bottom:1px solid #666;display:inline-block;width:46px;">&nbsp;</span>.
  </div>

  <div class="sig-grid">
    <div class="sig">
      <div class="sig-linha"></div>
      <div class="sig-nome">${blank(config.razao_social)}</div>
      <div class="sig-detalhe">CNPJ/CPF: ${fmtCNPJ(config.cnpj)}</div>
      <div class="sig-detalhe">Representante: ${blank(config.responsavel_tecnico)}</div>
    </div>
    <div class="sig">
      <div class="sig-linha"></div>
      <div class="sig-nome">${blank(al.nome)}</div>
      <div class="sig-detalhe">CPF: ${fmtCPF(al.cpf)}</div>
      <div class="sig-detalhe">Contratante</div>
    </div>
  </div>

  <div class="sig-unico">
    <div class="sig-linha"></div>
    <div class="sig-nome" style="color:#94A3B8;font-style:italic;">[Responsável Legal — somente para menores de 18 anos]</div>
    <div class="sig-detalhe">CPF: <span style="border-bottom:1px solid #CBD5E1;display:inline-block;min-width:110px;">&nbsp;</span></div>
  </div>

  <div class="testemunhas">
    <div class="sig">
      <div class="sig-linha"></div>
      <div class="sig-nome">Testemunha 1</div>
      <div class="sig-detalhe">Nome: <span style="border-bottom:1px solid #94A3B8;display:inline-block;min-width:130px;">&nbsp;</span></div>
      <div class="sig-detalhe">CPF: <span style="border-bottom:1px solid #94A3B8;display:inline-block;min-width:95px;">&nbsp;</span></div>
    </div>
    <div class="sig">
      <div class="sig-linha"></div>
      <div class="sig-nome">Testemunha 2</div>
      <div class="sig-detalhe">Nome: <span style="border-bottom:1px solid #94A3B8;display:inline-block;min-width:130px;">&nbsp;</span></div>
      <div class="sig-detalhe">CPF: <span style="border-bottom:1px solid #94A3B8;display:inline-block;min-width:95px;">&nbsp;</span></div>
    </div>
  </div>

  <div class="nota-digital">
    📋 <strong>Assinatura Digital:</strong> Este contrato pode ser assinado digitalmente por plataformas como D4Sign, ClickSign ou DocuSign,
    com validade jurídica nos termos da Lei nº 14.063/2020 e MP nº 2.200-2/2001 (ICP-Brasil).
    A assinatura digital dispensa testemunhas para fins de validade legal.
  </div>
</div>

</div>

<div class="rodape">
  <span>${blank(config.razao_social, 'CinesioPro')} — Sistema de Gestão Clínica</span>
  <span>Documento gerado em ${hoje()} · Versão 1.0</span>
</div>

<script>
  window.onload = function() { setTimeout(function() { window.print(); }, 700); };
</script>
</body>
</html>`
}

// ─── Abrir PDF em nova janela ─────────────────────────────────────────────────

export function abrirContratoPDF(html: string) {
  const win = window.open('', '_blank', 'width=960,height=720')
  if (!win) { alert('Permita pop-ups nesta página para visualizar o contrato.'); return }
  win.document.write(html)
  win.document.close()
  win.focus()
  setTimeout(() => win.print(), 700)
}
