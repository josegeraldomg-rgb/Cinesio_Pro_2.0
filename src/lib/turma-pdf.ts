import type { Turma, Matricula } from '@/app/(dashboard)/turmas/actions'

const DIAS_FULL  = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado']
const DIAS_ABREV = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

const NIVEL_LABEL: Record<string, string> = {
  livre: 'Livre', iniciante: 'Iniciante', intermediario: 'Intermediário', avancado: 'Avançado',
}
const NIVEL_COLOR: Record<string, string> = {
  livre: '#4A3AE8', iniciante: '#27AE60', intermediario: '#E67E22', avancado: '#E74C3C',
}

function fmtData(iso: string) {
  return new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
}

function fmtMoeda(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function gerarPdfTurma(turma: Turma, matriculas: Matricula[]) {
  const turmaMatriculas = matriculas.filter(m => m.turma_id === turma.id && m.status === 'ativo')
  const slotsAtivos = turma.slots.filter(s => s.ativo)
  const totalAlunos = new Set(turmaMatriculas.map(m => m.paciente_id)).size
  const receitaMensal = turmaMatriculas.reduce((acc, m) => acc + (m.turma_planos?.valor_mensal ?? 0), 0)
  const nivelCor = NIVEL_COLOR[turma.nivel] ?? '#4A3AE8'
  const nivelLabel = NIVEL_LABEL[turma.nivel] ?? turma.nivel
  const geradoEm = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })

  // Agrupa alunos por slot
  const alunosPorSlot = slotsAtivos.map(slot => {
    const alunos = turmaMatriculas.filter(m => (m.slots_ids ?? []).includes(slot.id))
    return { slot, alunos }
  })

  // Alunos sem slot específico atribuído
  const todosComSlot = new Set(turmaMatriculas.filter(m => (m.slots_ids ?? []).length > 0).map(m => m.paciente_id))
  const semSlot = turmaMatriculas.filter(m => !(m.slots_ids ?? []).length)

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${turma.nome} — Relatório da Turma</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --primary:   ${nivelCor};
      --primary10: ${nivelCor}18;
      --primary30: ${nivelCor}50;
      --dark:      #1A2332;
      --mid:       #4A5568;
      --light:     #718096;
      --border:    #E2E8F0;
      --bg:        #F7F8FA;
      --white:     #FFFFFF;
      --green:     #27AE60;
      --green10:   #27AE6015;
    }

    body {
      font-family: 'Inter', system-ui, sans-serif;
      font-size: 13px;
      color: var(--dark);
      background: var(--white);
      line-height: 1.5;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    /* ── Layout ── */
    .page { max-width: 800px; margin: 0 auto; padding: 0; }

    /* ── Hero Header ── */
    .hero {
      background: linear-gradient(135deg, ${nivelCor} 0%, ${nivelCor}CC 100%);
      padding: 36px 40px 32px;
      color: white;
      position: relative;
      overflow: hidden;
    }
    .hero::before {
      content: '';
      position: absolute; inset: 0;
      background: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Ccircle cx='30' cy='30' r='28'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E") repeat;
    }
    .hero-top {
      display: flex; align-items: flex-start; justify-content: space-between;
      position: relative;
    }
    .hero-brand {
      font-size: 11px; font-weight: 700; letter-spacing: 0.12em;
      text-transform: uppercase; opacity: 0.75; margin-bottom: 10px;
    }
    .hero-title { font-size: 28px; font-weight: 800; letter-spacing: -0.5px; line-height: 1.15; }
    .hero-desc  { font-size: 14px; opacity: 0.85; margin-top: 6px; max-width: 500px; }
    .hero-badge {
      background: rgba(255,255,255,0.2); border: 1.5px solid rgba(255,255,255,0.35);
      color: white; font-size: 11px; font-weight: 700; letter-spacing: 0.06em;
      text-transform: uppercase; padding: 5px 12px; border-radius: 20px;
      white-space: nowrap; backdrop-filter: blur(4px);
    }
    .hero-stats {
      display: flex; gap: 32px; margin-top: 24px; position: relative;
    }
    .hero-stat-value { font-size: 26px; font-weight: 800; line-height: 1; }
    .hero-stat-label { font-size: 11px; opacity: 0.75; margin-top: 3px; text-transform: uppercase; letter-spacing: 0.05em; }

    /* ── Info Cards ── */
    .info-grid {
      display: grid; grid-template-columns: repeat(3, 1fr);
      gap: 1px; background: var(--border);
      border-bottom: 1px solid var(--border);
    }
    .info-cell {
      background: var(--white); padding: 14px 20px;
    }
    .info-label { font-size: 10px; font-weight: 700; color: var(--light); text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 4px; }
    .info-value { font-size: 13px; font-weight: 600; color: var(--dark); }
    .info-value.accent { color: var(--primary); }

    /* ── Section ── */
    .section { padding: 24px 40px; }
    .section + .section { padding-top: 0; }
    .section-title {
      font-size: 11px; font-weight: 700; color: var(--light);
      text-transform: uppercase; letter-spacing: 0.1em;
      margin-bottom: 14px; display: flex; align-items: center; gap: 8px;
    }
    .section-title::after {
      content: ''; flex: 1; height: 1px; background: var(--border);
    }

    /* ── Day Block ── */
    .day-block {
      margin-bottom: 16px;
      border: 1px solid var(--border); border-radius: 12px;
      overflow: hidden; break-inside: avoid;
    }
    .day-header {
      display: flex; align-items: center; gap: 12px;
      background: var(--bg); padding: 10px 16px;
      border-bottom: 1px solid var(--border);
    }
    .day-pill {
      width: 36px; height: 36px; border-radius: 10px;
      background: var(--primary); color: white;
      font-size: 11px; font-weight: 800;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }
    .day-name { font-weight: 700; font-size: 13px; color: var(--dark); }
    .day-time { font-size: 12px; color: var(--mid); margin-top: 1px; }
    .day-count {
      margin-left: auto; font-size: 11px; font-weight: 700;
      background: var(--primary10); color: var(--primary);
      padding: 3px 10px; border-radius: 20px;
    }
    .day-occupancy {
      display: flex; align-items: center; gap: 8px;
      padding: 8px 16px; border-bottom: 1px solid var(--border);
      background: white;
    }
    .occ-bar { flex: 1; height: 4px; background: var(--border); border-radius: 2px; overflow: hidden; }
    .occ-fill { height: 100%; border-radius: 2px; background: var(--primary); }
    .occ-text { font-size: 10px; color: var(--light); font-weight: 600; flex-shrink: 0; }

    /* ── Student Table ── */
    .student-table { width: 100%; border-collapse: collapse; }
    .student-table th {
      background: var(--bg); font-size: 10px; font-weight: 700; color: var(--light);
      text-transform: uppercase; letter-spacing: 0.07em;
      padding: 8px 16px; text-align: left;
    }
    .student-table td { padding: 9px 16px; font-size: 12px; border-top: 1px solid var(--border); }
    .student-table tr:hover td { background: var(--bg); }
    .student-num {
      width: 22px; height: 22px; border-radius: 50%;
      background: var(--primary10); color: var(--primary);
      font-size: 10px; font-weight: 800;
      display: inline-flex; align-items: center; justify-content: center;
    }
    .student-name { font-weight: 600; color: var(--dark); }
    .student-phone { color: var(--light); font-size: 11px; }
    .plan-badge {
      display: inline-flex; align-items: center; gap: 4px;
      background: var(--green10); color: var(--green);
      font-size: 10px; font-weight: 700; padding: 3px 8px; border-radius: 6px;
    }
    .plan-value { color: var(--mid); font-size: 11px; font-weight: 600; }
    .empty-slot {
      padding: 20px 16px; text-align: center;
      color: var(--light); font-size: 12px; font-style: italic;
    }

    /* ── Planos Summary ── */
    .planos-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 10px; }
    .plano-card {
      border: 1px solid var(--border); border-radius: 10px;
      padding: 14px 16px; background: var(--white);
    }
    .plano-freq { font-size: 22px; font-weight: 800; color: var(--primary); line-height: 1; }
    .plano-unit { font-size: 11px; color: var(--light); margin-top: 2px; }
    .plano-name { font-size: 13px; font-weight: 600; color: var(--dark); margin-top: 8px; }
    .plano-price { font-size: 14px; font-weight: 700; color: var(--green); margin-top: 2px; }
    .plano-alunos { font-size: 11px; color: var(--light); margin-top: 4px; }

    /* ── Sem Slot ── */
    .no-slot-block {
      border: 1px dashed var(--border); border-radius: 12px; overflow: hidden;
      margin-bottom: 16px;
    }
    .no-slot-header {
      padding: 10px 16px; background: var(--bg);
      border-bottom: 1px solid var(--border);
      font-size: 12px; font-weight: 700; color: var(--light);
    }

    /* ── Footer ── */
    .footer {
      margin-top: 32px; padding: 16px 40px;
      border-top: 1px solid var(--border);
      display: flex; align-items: center; justify-content: space-between;
      background: var(--bg);
    }
    .footer-brand { font-size: 11px; font-weight: 700; color: var(--primary); }
    .footer-date  { font-size: 11px; color: var(--light); }

    /* ── Print ── */
    @media print {
      body { background: white; }
      .page { max-width: 100%; }
      .no-print { display: none !important; }
      .day-block, .plano-card { break-inside: avoid; }
      @page { margin: 15mm; size: A4; }
    }
  </style>
</head>
<body>
<div class="page">

  <!-- Botão de impressão (não aparece no PDF) -->
  <div class="no-print" style="position:fixed;top:16px;right:16px;z-index:99;display:flex;gap:8px;">
    <button onclick="window.print()" style="background:${nivelCor};color:white;border:none;padding:10px 20px;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;box-shadow:0 4px 12px ${nivelCor}50;">
      ⬇ Salvar PDF
    </button>
    <button onclick="window.close()" style="background:#F0F0F0;color:#555;border:none;padding:10px 16px;border-radius:10px;font-size:13px;cursor:pointer;font-family:inherit;">
      ✕ Fechar
    </button>
  </div>

  <!-- Hero -->
  <div class="hero">
    <div class="hero-top">
      <div>
        <div class="hero-brand">CinesioPro · Relatório de Turma</div>
        <div class="hero-title">${turma.nome}</div>
        ${turma.descricao ? `<div class="hero-desc">${turma.descricao}</div>` : ''}
      </div>
      <div class="hero-badge">${nivelLabel}</div>
    </div>
    <div class="hero-stats">
      <div>
        <div class="hero-stat-value">${totalAlunos}</div>
        <div class="hero-stat-label">Aluno${totalAlunos !== 1 ? 's' : ''} ativos</div>
      </div>
      <div>
        <div class="hero-stat-value">${slotsAtivos.length}</div>
        <div class="hero-stat-label">Slot${slotsAtivos.length !== 1 ? 's' : ''} semanais</div>
      </div>
      <div>
        <div class="hero-stat-value">${turma.capacidade_slot}</div>
        <div class="hero-stat-label">Vagas por slot</div>
      </div>
      <div>
        <div class="hero-stat-value">${fmtMoeda(receitaMensal)}</div>
        <div class="hero-stat-label">Receita mensal</div>
      </div>
    </div>
  </div>

  <!-- Info Strip -->
  <div class="info-grid">
    <div class="info-cell">
      <div class="info-label">Profissional</div>
      <div class="info-value">${turma.profissionais?.nome ?? '—'}</div>
    </div>
    <div class="info-cell">
      <div class="info-label">Sala Padrão</div>
      <div class="info-value">${turma.salas?.nome ?? '—'}</div>
    </div>
    <div class="info-cell">
      <div class="info-label">Período</div>
      <div class="info-value">${fmtData(turma.data_inicio)}${turma.data_fim ? ` → ${fmtData(turma.data_fim)}` : ' · Sem prazo'}</div>
    </div>
  </div>

  <!-- Slots por Dia -->
  <div class="section">
    <div class="section-title">Alunos por Dia da Semana</div>
    ${alunosPorSlot.map(({ slot, alunos }) => {
      const cap = slot.capacidade_maxima ?? turma.capacidade_slot
      const pct = cap > 0 ? Math.round((alunos.length / cap) * 100) : 0
      const corBarra = pct >= 90 ? '#E74C3C' : pct >= 70 ? '#E67E22' : '#27AE60'
      return `
      <div class="day-block">
        <div class="day-header">
          <div class="day-pill">${DIAS_ABREV[slot.dia_semana]}</div>
          <div>
            <div class="day-name">${DIAS_FULL[slot.dia_semana]}</div>
            <div class="day-time">${slot.hora_inicio} – ${slot.hora_fim} &nbsp;·&nbsp; ${slot.duracao_minutos} min</div>
          </div>
          <div class="day-count">${alunos.length}/${cap} aluno${alunos.length !== 1 ? 's' : ''}</div>
        </div>
        <div class="day-occupancy">
          <div class="occ-bar"><div class="occ-fill" style="width:${pct}%;background:${corBarra};"></div></div>
          <div class="occ-text">${pct}% ocupado</div>
        </div>
        ${alunos.length === 0
          ? `<div class="empty-slot">Nenhum aluno inscrito neste horário</div>`
          : `<table class="student-table">
              <thead>
                <tr>
                  <th style="width:36px">#</th>
                  <th>Aluno</th>
                  <th>Plano</th>
                  <th style="text-align:right">Mensalidade</th>
                </tr>
              </thead>
              <tbody>
                ${alunos.map((m, idx) => `
                <tr>
                  <td><span class="student-num">${idx + 1}</span></td>
                  <td>
                    <div class="student-name">${m.pacientes?.nome ?? '—'}</div>
                    ${m.pacientes?.telefone ? `<div class="student-phone">${m.pacientes.telefone}</div>` : ''}
                  </td>
                  <td>
                    ${m.turma_planos
                      ? `<span class="plan-badge">${m.turma_planos.frequencia_semanal}x/sem.</span>
                         <span style="margin-left:6px;font-size:12px;color:#4A5568;">${m.turma_planos.nome}</span>`
                      : '<span style="color:#718096;font-size:11px;">Sem plano</span>'}
                  </td>
                  <td style="text-align:right">
                    ${m.turma_planos?.valor_mensal
                      ? `<span class="plan-value">${fmtMoeda(m.turma_planos.valor_mensal)}</span>`
                      : '—'}
                  </td>
                </tr>`).join('')}
              </tbody>
            </table>`
        }
      </div>`
    }).join('')}

    ${semSlot.length > 0 ? `
    <div class="no-slot-block">
      <div class="no-slot-header">⚠ Alunos matriculados sem horário definido (${semSlot.length})</div>
      <table class="student-table">
        <thead>
          <tr><th style="width:36px">#</th><th>Aluno</th><th>Plano</th><th style="text-align:right">Mensalidade</th></tr>
        </thead>
        <tbody>
          ${semSlot.map((m, idx) => `
          <tr>
            <td><span class="student-num">${idx + 1}</span></td>
            <td>
              <div class="student-name">${m.pacientes?.nome ?? '—'}</div>
              ${m.pacientes?.telefone ? `<div class="student-phone">${m.pacientes.telefone}</div>` : ''}
            </td>
            <td>${m.turma_planos ? `<span class="plan-badge">${m.turma_planos.frequencia_semanal}x/sem.</span>` : '—'}</td>
            <td style="text-align:right">${m.turma_planos?.valor_mensal ? `<span class="plan-value">${fmtMoeda(m.turma_planos.valor_mensal)}</span>` : '—'}</td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>` : ''}
  </div>

  <!-- Planos -->
  ${turma.planos.length > 0 ? `
  <div class="section">
    <div class="section-title">Planos Disponíveis</div>
    <div class="planos-grid">
      ${turma.planos.map(p => {
        const qtdAlunos = turmaMatriculas.filter(m => m.plano_id === p.id).length
        return `
        <div class="plano-card">
          <div class="plano-freq">${p.frequencia_semanal}×</div>
          <div class="plano-unit">por semana</div>
          <div class="plano-name">${p.nome}</div>
          <div class="plano-price">${fmtMoeda(p.valor_mensal)}<span style="font-size:11px;font-weight:400;color:#718096;">/mês</span></div>
          <div class="plano-alunos">${qtdAlunos} aluno${qtdAlunos !== 1 ? 's' : ''} neste plano</div>
        </div>`
      }).join('')}
    </div>
  </div>` : ''}

  <!-- Footer -->
  <div class="footer">
    <div class="footer-brand">CinesioPro</div>
    <div class="footer-date">Gerado em ${geradoEm}</div>
  </div>

</div>
</body>
</html>`

  const win = window.open('', '_blank', 'width=900,height=700')
  if (!win) { alert('Permita pop-ups para gerar o PDF.'); return }
  win.document.write(html)
  win.document.close()
}
