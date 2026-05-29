// ─── Gerador de PDF para documentos clínicos ─────────────────────────────────
// Gera HTML completo → abre em nova janela → window.print()

export interface PacientePDF {
  nome:            string
  cpf:             string | null
  data_nascimento: string | null
  telefone:        string | null
}

export interface EmpresaPDF {
  nome:     string
  telefone: string | null
  email:    string | null
  cnpj:     string | null
}

export interface ProfissionalPDF {
  nome:         string
  registro:     string   // CRM / CREFITO / CRN
  especialidade?: string | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatarDataBR(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function formatarDataExtenso(d = new Date()): string {
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }).toUpperCase()
}

function formatarTelefone(tel: string | null): string {
  if (!tel) return '—'
  const d = tel.replace(/\D/g, '')
  if (d.length === 11) return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`
  if (d.length === 10) return `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`
  return tel
}

function calcularIdade(dataNasc: string | null): string {
  if (!dataNasc) return ''
  const nasc = new Date(dataNasc)
  const hoje = new Date()
  let age = hoje.getFullYear() - nasc.getFullYear()
  if (hoje.getMonth() < nasc.getMonth() || (hoje.getMonth() === nasc.getMonth() && hoje.getDate() < nasc.getDate())) age--
  return `${age} anos`
}

// ─── CSS base compartilhado ───────────────────────────────────────────────────

const CSS_BASE = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: Arial, Helvetica, sans-serif;
    font-size: 13px;
    color: #1E293B;
    background: #fff;
  }

  /* ── CABEÇALHO ── */
  .header {
    background: #0D9488;
    color: white;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding: 28px 40px;
    position: relative;
    overflow: hidden;
  }
  .header::after {
    content: '';
    position: absolute;
    right: 0; top: 0; bottom: 0;
    width: 160px;
    background: rgba(255,255,255,0.08);
    clip-path: polygon(20% 0%, 100% 0%, 100% 100%, 0% 100%);
  }
  .header-left h1 {
    font-size: 22px;
    font-weight: 900;
    letter-spacing: 0.5px;
    text-transform: uppercase;
    line-height: 1.1;
  }
  .header-left .subtitulo {
    font-size: 11px;
    font-weight: 400;
    opacity: 0.85;
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-top: 4px;
  }
  .header-right {
    font-size: 14px;
    font-weight: 700;
    text-align: right;
    line-height: 1.6;
    z-index: 1;
  }

  /* ── CORPO ── */
  .body { padding: 36px 40px; min-height: calc(100vh - 180px); }

  /* ── TÍTULO DO DOCUMENTO ── */
  .doc-titulo {
    text-align: center;
    font-size: 18px;
    font-weight: 900;
    color: #0D9488;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    margin-bottom: 28px;
    padding-bottom: 16px;
    border-bottom: 2px solid #CCFBF1;
  }

  /* ── TABELA DO PACIENTE ── */
  .tabela-paciente {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 28px;
    border: 1px solid #CBD5E1;
  }
  .tabela-paciente td {
    padding: 10px 14px;
    border: 1px solid #CBD5E1;
    vertical-align: top;
    width: 50%;
  }
  .tabela-paciente .label {
    font-size: 11px;
    font-weight: 700;
    color: #64748B;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    display: block;
    margin-bottom: 3px;
  }
  .tabela-paciente .valor {
    font-size: 13px;
    color: #1E293B;
  }

  /* ── SEÇÃO ── */
  .secao-titulo {
    font-size: 11px;
    font-weight: 700;
    color: #0D9488;
    text-transform: uppercase;
    letter-spacing: 1px;
    margin: 22px 0 10px 0;
    border-bottom: 1px solid #CCFBF1;
    padding-bottom: 4px;
  }
  .secao-conteudo {
    font-size: 13px;
    color: #334155;
    line-height: 1.7;
    white-space: pre-wrap;
    margin-bottom: 8px;
  }
  .campo-linha {
    display: flex;
    gap: 8px;
    margin-bottom: 6px;
    font-size: 13px;
  }
  .campo-label {
    font-weight: 700;
    color: #64748B;
    min-width: 160px;
    flex-shrink: 0;
  }
  .campo-valor { color: #1E293B; }
  .campo-teal  { color: #0D9488; }

  /* ── ASSINATURA ── */
  .assinatura {
    margin-top: 48px;
    text-align: center;
  }
  .assinatura-linha {
    width: 280px;
    border-top: 1.5px solid #1E293B;
    margin: 0 auto 8px auto;
  }
  .assinatura-nome {
    font-weight: 700;
    font-size: 14px;
    color: #1E293B;
  }
  .assinatura-registro {
    font-size: 12px;
    color: #64748B;
  }

  /* ── RODAPÉ ── */
  .footer {
    background: #0D9488;
    color: rgba(255,255,255,0.85);
    font-size: 11px;
    padding: 14px 40px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
  }

  /* ── PRINT ── */
  @media print {
    .footer { position: fixed; bottom: 0; }
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    @page { margin: 0; size: A4; }
  }
`

// ─── Template base ─────────────────────────────────────────────────────────────

function templateBase(
  empresa:    EmpresaPDF,
  paciente:   PacientePDF,
  titulo:     string,
  subtitulo:  string,
  corpo:      string,
  profissional?: ProfissionalPDF | null,
): string {
  const dataHoje = formatarDataExtenso()

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${titulo} — ${paciente.nome}</title>
  <style>${CSS_BASE}</style>
</head>
<body>

  <!-- CABEÇALHO -->
  <div class="header">
    <div class="header-left">
      <h1>${empresa.nome}</h1>
      <div class="subtitulo">${subtitulo}</div>
    </div>
    <div class="header-right">
      ${dataHoje}
    </div>
  </div>

  <!-- CORPO -->
  <div class="body">

    <!-- Título -->
    <div class="doc-titulo">${titulo}</div>

    <!-- Informações do Paciente -->
    <div class="secao-titulo">Informações do Paciente</div>
    <table class="tabela-paciente">
      <tr>
        <td>
          <span class="label">Nome Completo:</span>
          <span class="valor">${paciente.nome}</span>
        </td>
        <td>
          <span class="label">CPF / Documento:</span>
          <span class="valor">${paciente.cpf ?? '—'}</span>
        </td>
      </tr>
      <tr>
        <td>
          <span class="label">Data de Nascimento:</span>
          <span class="valor">${formatarDataBR(paciente.data_nascimento)}${paciente.data_nascimento ? ` (${calcularIdade(paciente.data_nascimento)})` : ''}</span>
        </td>
        <td>
          <span class="label">Contato / Telefone:</span>
          <span class="valor">${formatarTelefone(paciente.telefone)}</span>
        </td>
      </tr>
    </table>

    <!-- Conteúdo do documento -->
    ${corpo}

    <!-- Assinatura -->
    ${profissional ? `
    <div class="assinatura">
      <div class="assinatura-linha"></div>
      <div class="assinatura-nome">${profissional.nome}</div>
      <div class="assinatura-registro">${profissional.registro}${profissional.especialidade ? ` — ${profissional.especialidade}` : ''}</div>
    </div>
    ` : ''}

  </div>

  <!-- RODAPÉ -->
  <div class="footer">
    <span>CinesioPro — Sistema de Gestão Clínica</span>
    <span>Documento gerado em ${dataHoje}</span>
  </div>

</body>
</html>`
}

// ─── Prescrição ───────────────────────────────────────────────────────────────

export function gerarPDFPrescricao(
  empresa:     EmpresaPDF,
  paciente:    PacientePDF,
  dados: { uso: string; medicamentos: string; posologia: string },
  profissional?: ProfissionalPDF | null,
): string {
  const corpo = `
    <div class="secao-titulo">Prescrição</div>
    <div class="campo-linha">
      <span class="campo-label">Uso:</span>
      <span class="campo-valor">${dados.uso}</span>
    </div>

    <div class="secao-titulo">Medicamento(s)</div>
    <div class="secao-conteudo">${dados.medicamentos.replace(/\n/g,'<br>')}</div>

    <div class="secao-titulo">Posologia / Recomendações</div>
    <div class="secao-conteudo">${dados.posologia.replace(/\n/g,'<br>')}</div>
  `
  return templateBase(empresa, paciente, `PRESCRIÇÃO MÉDICA — ${dados.uso.toUpperCase()}`, 'DOCUMENTO OFICIAL', corpo, profissional)
}

// ─── Laudo ────────────────────────────────────────────────────────────────────

export function gerarPDFLaudo(
  empresa:     EmpresaPDF,
  paciente:    PacientePDF,
  dados: { titulo: string; corpo: string },
  profissional?: ProfissionalPDF | null,
): string {
  const conteudo = `
    <div class="secao-titulo">Parecer / Corpo do Laudo</div>
    <div class="secao-conteudo">${dados.corpo.replace(/\n/g,'<br>')}</div>
  `
  return templateBase(empresa, paciente, dados.titulo.toUpperCase(), 'DOCUMENTO OFICIAL', conteudo, profissional)
}

// ─── Atestado ─────────────────────────────────────────────────────────────────

export function gerarPDFAtestado(
  empresa:     EmpresaPDF,
  paciente:    PacientePDF,
  dados: { dias: number | null; data_inicio: string; cid: string; observacoes: string },
  profissional?: ProfissionalPDF | null,
): string {
  const dataInicio = formatarDataBR(dados.data_inicio)
  const corpo = `
    <div class="secao-titulo">Atestado de Afastamento</div>
    <div class="secao-conteudo" style="margin-bottom:20px; font-size:14px; line-height:2;">
      Atestamos para os devidos fins que o(a) paciente
      <strong>${paciente.nome}</strong>, portador(a) do CPF <strong>${paciente.cpf ?? '—'}</strong>,
      necessita de afastamento de suas atividades por
      <strong>${dados.dias ?? '—'} (${dados.dias === 1 ? 'um' : dados.dias === 2 ? 'dois' : dados.dias === 3 ? 'três' : (dados.dias?.toString() ?? '—')}) dia(s)</strong>,
      a partir de <strong>${dataInicio}</strong>.
    </div>
    ${dados.cid ? `<div class="campo-linha"><span class="campo-label">CID:</span><span class="campo-valor">${dados.cid}</span></div>` : ''}
    ${dados.observacoes ? `<div class="secao-titulo">Observações</div><div class="secao-conteudo">${dados.observacoes.replace(/\n/g,'<br>')}</div>` : ''}
    <div style="margin-top:28px; font-size:12px; color:#64748B;">
      Este atestado é válido apenas para o período especificado e deve ser entregue ao setor responsável.
    </div>
  `
  return templateBase(empresa, paciente, 'ATESTADO MÉDICO', 'DOCUMENTO OFICIAL', corpo, profissional)
}

// ─── Prontuário Completo ──────────────────────────────────────────────────────

export interface RegistroPDF {
  tipo:              string
  criado_em:         string
  profissional_nome: string | null
  resumo:            string
  dados:             Record<string, unknown>
}

const TIPO_LABEL: Record<string, string> = {
  evolucao:  'Evolução',
  prescricao:'Prescrição',
  laudo:     'Laudo',
  atestado:  'Atestado',
  anexo:     'Anexo',
  copiloto:  'Copiloto IA',
  plano:     'Plano de Tratamento',
}

function formatarRegistro(reg: RegistroPDF): string {
  const d = reg.dados
  const dataHora = new Date(reg.criado_em).toLocaleDateString('pt-BR', {
    day:'2-digit', month:'2-digit', year:'numeric',
    hour:'2-digit', minute:'2-digit',
  })

  let conteudo = ''

  if (reg.tipo === 'evolucao') {
    conteudo = `<div class="secao-conteudo">${String(d.conteudo ?? '').replace(/\n/g,'<br>')}</div>`
  } else if (reg.tipo === 'prescricao') {
    conteudo = `
      <div class="campo-linha"><span class="campo-label">Uso:</span><span class="campo-valor">${d.uso ?? ''}</span></div>
      <div class="campo-linha"><span class="campo-label">Medicamentos:</span><span class="campo-valor">${String(d.medicamentos ?? '').replace(/\n/g,'<br>')}</span></div>
      ${d.posologia ? `<div class="campo-linha"><span class="campo-label">Posologia:</span><span class="campo-valor">${String(d.posologia).replace(/\n/g,'<br>')}</span></div>` : ''}
    `
  } else if (reg.tipo === 'laudo') {
    conteudo = `
      <div style="font-weight:700; margin-bottom:6px;">${d.titulo ?? 'Laudo'}</div>
      <div class="secao-conteudo">${String(d.corpo ?? '').replace(/\n/g,'<br>')}</div>
    `
  } else if (reg.tipo === 'atestado') {
    conteudo = `
      ${d.dias ? `<div class="campo-linha"><span class="campo-label">Dias de afastamento:</span><span class="campo-valor">${d.dias}</span></div>` : ''}
      ${d.data_inicio ? `<div class="campo-linha"><span class="campo-label">Data de início:</span><span class="campo-valor">${formatarDataBR(String(d.data_inicio))}</span></div>` : ''}
      ${d.cid ? `<div class="campo-linha"><span class="campo-label">CID:</span><span class="campo-valor">${d.cid}</span></div>` : ''}
      ${d.observacoes ? `<div class="secao-conteudo">${String(d.observacoes).replace(/\n/g,'<br>')}</div>` : ''}
    `
  } else if (reg.tipo === 'plano') {
    conteudo = `
      <div class="secao-conteudo">${String(d.diagnostico_clinico ?? '').replace(/\n/g,'<br>')}</div>
      ${d.cid10 ? `<div class="campo-linha"><span class="campo-label">CID-10:</span><span class="campo-valor">${d.cid10}</span></div>` : ''}
      ${d.sessoes_previstas ? `<div class="campo-linha"><span class="campo-label">Sessões previstas:</span><span class="campo-valor">${d.sessoes_previstas}</span></div>` : ''}
    `
  } else if (reg.tipo === 'copiloto') {
    conteudo = `
      ${d.queixa ? `<div class="campo-linha"><span class="campo-label">Queixa:</span><span class="campo-valor">${d.queixa}</span></div>` : ''}
      ${d.anamnese ? `<div class="campo-linha" style="align-items:flex-start"><span class="campo-label">Anamnese:</span><span class="campo-valor">${String(d.anamnese).replace(/\n/g,'<br>')}</span></div>` : ''}
      ${d.conduta ? `<div class="campo-linha" style="align-items:flex-start"><span class="campo-label">Conduta:</span><span class="campo-valor">${String(d.conduta).replace(/\n/g,'<br>')}</span></div>` : ''}
      ${d.cid ? `<div class="campo-linha"><span class="campo-label">CID:</span><span class="campo-valor">${d.cid}</span></div>` : ''}
    `
  } else if (reg.tipo === 'anexo') {
    conteudo = `<div class="campo-linha"><span class="campo-label">Arquivo:</span><span class="campo-valor">${d.nome ?? 'Anexo'}</span></div>`
  }

  return `
    <div style="margin-bottom: 24px; padding-bottom: 20px; border-bottom: 1px solid #E2E8F0;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
        <div style="display:flex; align-items:center; gap:10px;">
          <span style="
            font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:0.5px;
            padding:3px 10px; border-radius:99px; background:#CCFBF1; color:#0D9488;
          ">${TIPO_LABEL[reg.tipo] ?? reg.tipo}</span>
          <span style="font-size:12px; color:#0D9488; font-weight:600;">${dataHora}</span>
        </div>
        ${reg.profissional_nome ? `<span style="font-size:12px; color:#64748B;">Prof. ${reg.profissional_nome}</span>` : ''}
      </div>
      ${conteudo}
    </div>
  `
}

export function gerarPDFProntuario(
  empresa:    EmpresaPDF,
  paciente:   PacientePDF,
  prontuario: { alergias?: string | null; antecedentes?: string | null; medicamentos?: string | null },
  registros:  RegistroPDF[],
): string {
  const dataHoje = formatarDataExtenso()

  const infoBase = `
    ${prontuario.alergias ? `
      <div class="secao-titulo">Alergias</div>
      <div class="secao-conteudo" style="color:#EF4444;">${prontuario.alergias}</div>
    ` : ''}
    ${prontuario.medicamentos ? `
      <div class="secao-titulo">Medicamentos em Uso</div>
      <div class="secao-conteudo">${prontuario.medicamentos.replace(/\n/g,'<br>')}</div>
    ` : ''}
    ${prontuario.antecedentes ? `
      <div class="secao-titulo">Antecedentes / Histórico</div>
      <div class="secao-conteudo">${prontuario.antecedentes.replace(/\n/g,'<br>')}</div>
    ` : ''}
  `

  const timelineHTML = registros.map(formatarRegistro).join('')

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Prontuário Clínico — ${paciente.nome}</title>
  <style>${CSS_BASE}</style>
</head>
<body>

  <div class="header">
    <div class="header-left">
      <h1>${empresa.nome}</h1>
      <div class="subtitulo">PRONTUÁRIO CLÍNICO INTEGRAL</div>
    </div>
    <div class="header-right">${dataHoje}</div>
  </div>

  <div class="body">
    <div class="doc-titulo">HISTÓRICO CLÍNICO DO PACIENTE</div>

    <div class="secao-titulo">Informações do Paciente</div>
    <table class="tabela-paciente">
      <tr>
        <td><span class="label">Nome Completo:</span><span class="valor">${paciente.nome}</span></td>
        <td><span class="label">CPF / Documento:</span><span class="valor">${paciente.cpf ?? '—'}</span></td>
      </tr>
      <tr>
        <td>
          <span class="label">Data de Nascimento:</span>
          <span class="valor">${formatarDataBR(paciente.data_nascimento)}${paciente.data_nascimento ? ` (${calcularIdade(paciente.data_nascimento)})` : ''}</span>
        </td>
        <td>
          <span class="label">Contato / Telefone:</span>
          <span class="valor">${formatarTelefone(paciente.telefone)}</span>
        </td>
      </tr>
    </table>

    ${infoBase ? `<div style="margin-bottom:24px;">${infoBase}</div>` : ''}

    <div class="secao-titulo" style="margin-top:28px;">Histórico de Atendimentos</div>
    <div style="margin-top:16px;">
      ${timelineHTML || '<p style="color:#94A3B8; font-style:italic;">Nenhum registro encontrado.</p>'}
    </div>
  </div>

  <div class="footer">
    <span>CinesioPro — Sistema de Gestão Clínica</span>
    <span>Gerado em ${dataHoje}</span>
  </div>

</body>
</html>`
}

// ─── Relatório de Evoluções ───────────────────────────────────────────────────

export function gerarPDFEvolucoes(
  empresa:   EmpresaPDF,
  paciente:  PacientePDF,
  evolucoes: RegistroPDF[],
): string {
  const dataHoje = formatarDataExtenso()

  const rows = evolucoes.map(reg => {
    const d = reg.dados
    const dataHora = new Date(reg.criado_em).toLocaleDateString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    }) + ' às ' + new Date(reg.criado_em).toLocaleTimeString('pt-BR', {
      hour: '2-digit', minute: '2-digit',
    })

    // conteúdo varia por tipo
    let conteudo = ''
    if (reg.tipo === 'evolucao') {
      conteudo = `<div class="secao-conteudo">${String(d.conteudo ?? '').replace(/\n/g,'<br>')}</div>`
    } else if (reg.tipo === 'copiloto') {
      conteudo = `
        ${d.queixa ? `<div class="campo-linha"><span class="campo-label">Queixa:</span><span class="campo-valor">${d.queixa}</span></div>` : ''}
        ${d.anamnese ? `<div class="campo-linha" style="align-items:flex-start"><span class="campo-label">Anamnese:</span><span class="campo-valor">${String(d.anamnese).replace(/\n/g,'<br>')}</span></div>` : ''}
        ${d.conduta ? `<div class="campo-linha" style="align-items:flex-start"><span class="campo-label">Conduta:</span><span class="campo-valor">${String(d.conduta).replace(/\n/g,'<br>')}</span></div>` : ''}
        ${d.cid ? `<div class="campo-linha"><span class="campo-label">CID:</span><span class="campo-valor">${d.cid}</span></div>` : ''}
        ${d.anotacoes ? `<div class="campo-linha" style="align-items:flex-start"><span class="campo-label">Anotações:</span><span class="campo-valor" style="color:#64748B;font-style:italic;">${String(d.anotacoes).replace(/\n/g,'<br>')}</span></div>` : ''}
      `
    }

    const tipoLabel = reg.tipo === 'evolucao' ? 'Evolução Clínica' : 'Copiloto IA'
    const tipoColor = reg.tipo === 'evolucao' ? '#1D4ED8' : '#BE185D'
    const tipoBg    = reg.tipo === 'evolucao' ? '#DBEAFE'  : '#FCE7F3'

    return `
      <div style="margin-bottom:28px; padding:20px; border:1px solid #E2E8F0; border-radius:10px; page-break-inside:avoid;">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:14px; flex-wrap:wrap; gap:8px;">
          <div style="display:flex; align-items:center; gap:10px;">
            <span style="
              font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:0.5px;
              padding:3px 10px; border-radius:99px; background:${tipoBg}; color:${tipoColor};
            ">${tipoLabel}</span>
            ${reg.profissional_nome ? `<span style="font-size:12px; color:#64748B;">Prof. ${reg.profissional_nome}</span>` : ''}
          </div>
          <span style="font-size:12px; color:#64748B; font-weight:600;">${dataHora}</span>
        </div>
        ${conteudo}
      </div>
    `
  }).join('')

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Evoluções Clínicas — ${paciente.nome}</title>
  <style>${CSS_BASE}
    .evo-count {
      font-size: 12px;
      color: #64748B;
      margin-bottom: 20px;
      padding: 8px 14px;
      background: #F8FAFC;
      border: 1px solid #E2E8F0;
      border-radius: 8px;
      display: inline-block;
    }
  </style>
</head>
<body>

  <div class="header">
    <div class="header-left">
      <h1>${empresa.nome}</h1>
      <div class="subtitulo">RELATÓRIO DE EVOLUÇÕES CLÍNICAS</div>
    </div>
    <div class="header-right">${dataHoje}</div>
  </div>

  <div class="body">
    <div class="doc-titulo">EVOLUÇÕES CLÍNICAS</div>

    <div class="secao-titulo">Informações do Paciente</div>
    <table class="tabela-paciente">
      <tr>
        <td><span class="label">Nome Completo:</span><span class="valor">${paciente.nome}</span></td>
        <td><span class="label">CPF / Documento:</span><span class="valor">${paciente.cpf ?? '—'}</span></td>
      </tr>
      <tr>
        <td>
          <span class="label">Data de Nascimento:</span>
          <span class="valor">${formatarDataBR(paciente.data_nascimento)}${paciente.data_nascimento ? ` (${calcularIdade(paciente.data_nascimento)})` : ''}</span>
        </td>
        <td>
          <span class="label">Contato / Telefone:</span>
          <span class="valor">${formatarTelefone(paciente.telefone)}</span>
        </td>
      </tr>
    </table>

    <div class="secao-titulo" style="margin-top:28px;">Registro de Evoluções</div>
    <div class="evo-count">${evolucoes.length} evolução(ões) encontrada(s) — ordenadas da mais recente para a mais antiga</div>

    <div style="margin-top:12px;">
      ${rows || '<p style="color:#94A3B8; font-style:italic;">Nenhuma evolução registrada.</p>'}
    </div>
  </div>

  <div class="footer">
    <span>CinesioPro — Sistema de Gestão Clínica</span>
    <span>Gerado em ${dataHoje}</span>
  </div>

</body>
</html>`
}

// ─── Abrir PDF em nova janela ─────────────────────────────────────────────────

export function abrirPDF(html: string) {
  const win = window.open('', '_blank', 'width=900,height=700')
  if (!win) {
    alert('Permita pop-ups nesta página para visualizar o PDF.')
    return
  }
  win.document.write(html)
  win.document.close()
  win.focus()
  setTimeout(() => win.print(), 600)
}
