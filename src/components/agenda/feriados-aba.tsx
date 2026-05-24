'use client'

import { useState, useMemo } from 'react'
import {
  Plus, Search, X, Flag, Pencil, Trash2, Calendar,
  Download, RefreshCw, Repeat, AlertTriangle, Check,
} from 'lucide-react'
import {
  salvarFeriadoAction,
  excluirFeriadoAction,
  importarFeriadosBrasilAPIAction,
  criarEmendaAction,
} from '@/app/(dashboard)/agenda/feriados-actions'
import type { Feriado } from '@/app/(dashboard)/agenda/agenda-page-client'

interface Props {
  feriados: Feriado[]
}

// ── Sugestões de feriados fixos ──────────────────────────────────
const SUGESTOES = [
  { nome: 'Ano Novo',                   mes: '01', dia: '01', emoji: '🎊' },
  { nome: 'Tiradentes',                 mes: '04', dia: '21', emoji: '🏅' },
  { nome: 'Dia do Trabalho',            mes: '05', dia: '01', emoji: '🛠️' },
  { nome: 'Independência do Brasil',    mes: '09', dia: '07', emoji: '🇧🇷' },
  { nome: 'N. S. Aparecida',            mes: '10', dia: '12', emoji: '🙏' },
  { nome: 'Finados',                    mes: '11', dia: '02', emoji: '🕯️' },
  { nome: 'Proclamação da República',   mes: '11', dia: '15', emoji: '🏛️' },
  { nome: 'Véspera de Natal',           mes: '12', dia: '24', emoji: '🌟' },
  { nome: 'Natal',                      mes: '12', dia: '25', emoji: '🎄' },
  { nome: 'Réveillon',                  mes: '12', dia: '31', emoji: '🎆' },
]

function toDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function fmtData(s: string) {
  const [ano, mes, dia] = s.split('-').map(Number)
  return new Date(ano, mes - 1, dia).toLocaleDateString('pt-BR', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
  })
}

function fmtDataCurta(s: string) {
  const [ano, mes, dia] = s.split('-').map(Number)
  return new Date(ano, mes - 1, dia).toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

// Detecta se a data cai em terça (→ emenda segunda) ou quinta (→ emenda sexta)
function getEmenda(data: string): { dataEmenda: string; nomeEmenda: string } | null {
  if (!data) return null
  const [ano, mes, dia] = data.split('-').map(Number)
  const d = new Date(ano, mes - 1, dia)
  const dow = d.getDay()
  if (dow === 2) {  // terça → segunda anterior
    const seg = new Date(d); seg.setDate(seg.getDate() - 1)
    return { dataEmenda: toDateStr(seg), nomeEmenda: 'segunda-feira' }
  }
  if (dow === 4) {  // quinta → sexta seguinte
    const sex = new Date(d); sex.setDate(sex.getDate() + 1)
    return { dataEmenda: toDateStr(sex), nomeEmenda: 'sexta-feira' }
  }
  return null
}

// ════════════════════════════════════════════════════════════════
// Componente principal
// ════════════════════════════════════════════════════════════════
export function FeriadosAba({ feriados }: Props) {
  const [busca, setBusca]                 = useState('')
  const [modal, setModal]                 = useState<{ tipo: 'novo' | 'editar'; feriado?: Feriado } | null>(null)
  const [importando, setImportando]       = useState(false)
  const [importMsg, setImportMsg]         = useState<{ tipo: 'ok' | 'err'; texto: string } | null>(null)

  const anoAtual = new Date().getFullYear()

  // Ordena: primeiro os de data futura/atual, depois os passados; dentro de cada grupo por data
  const ordenados = useMemo(() => {
    const hoje = toDateStr(new Date())
    const futuros  = feriados.filter(f => f.data >= hoje).sort((a, b) => a.data.localeCompare(b.data))
    const passados = feriados.filter(f => f.data < hoje).sort((a, b) => b.data.localeCompare(a.data))
    return [...futuros, ...passados]
  }, [feriados])

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase()
    if (!q) return ordenados
    return ordenados.filter(f => f.nome.toLowerCase().includes(q))
  }, [ordenados, busca])

  async function excluir(f: Feriado) {
    if (!confirm(`Excluir o feriado "${f.nome}"?`)) return
    await excluirFeriadoAction(f.id)
    window.location.reload()
  }

  async function importar() {
    setImportando(true)
    setImportMsg(null)
    const r = await importarFeriadosBrasilAPIAction(anoAtual)
    setImportando(false)
    if ('error' in r) {
      setImportMsg({ tipo: 'err', texto: r.error ?? 'Erro desconhecido.' })
    } else {
      setImportMsg({ tipo: 'ok', texto: r.msg ?? 'Importação concluída.' })
      // Sempre recarrega para refletir o estado atual (inclusive "já cadastrados")
      setTimeout(() => window.location.reload(), 1200)
    }
  }

  const hoje = toDateStr(new Date())

  return (
    <div className="space-y-4">
      {/* ── Mensagem de importação ── */}
      {importMsg && (
        <div className={`flex items-start gap-2 px-4 py-3 rounded-xl border text-sm font-medium ${
          importMsg.tipo === 'ok'
            ? 'bg-[#27AE60]/10 border-[#27AE60]/30 text-[#27AE60]'
            : 'bg-[#E74C3C]/10 border-[#E74C3C]/30 text-[#E74C3C]'
        }`}>
          {importMsg.tipo === 'ok' ? <Check size={16} className="mt-0.5 flex-shrink-0" /> : <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />}
          <span>{importMsg.texto}</span>
          <button onClick={() => setImportMsg(null)} className="ml-auto flex-shrink-0 opacity-60 hover:opacity-100"><X size={14} /></button>
        </div>
      )}

      {/* ── Header: busca + ações ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="bg-white border border-[#E8E8E8] rounded-2xl p-3 flex items-center gap-2 flex-1 min-w-[300px] shadow-sm">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7F8C8D]" />
            <input
              value={busca}
              onChange={e => setBusca(e.target.value)}
              placeholder="Buscar feriado pelo nome…"
              className="w-full h-9 pl-9 pr-3 rounded-lg bg-[#F8F9FA] border border-transparent text-sm outline-none focus:bg-white focus:border-[#E74C3C]"
            />
          </div>
          {busca && (
            <button onClick={() => setBusca('')} className="flex items-center gap-1 h-9 px-3 rounded-lg text-xs font-semibold text-[#E74C3C] hover:bg-[#E74C3C]/10">
              <X size={12} />
              Limpar
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Importar BrasilAPI */}
          <button
            onClick={importar}
            disabled={importando}
            className="flex items-center gap-2 bg-white border border-[#E8E8E8] text-[#2C3E50] px-4 py-2.5 rounded-full text-sm font-semibold hover:border-[#E74C3C] hover:text-[#E74C3C] disabled:opacity-50 shadow-sm transition-colors"
          >
            {importando
              ? <><RefreshCw size={14} className="animate-spin" /> Importando…</>
              : <><Download size={14} /> Importar {anoAtual}</>
            }
          </button>

          {/* Novo feriado manual */}
          <button
            onClick={() => setModal({ tipo: 'novo' })}
            className="flex items-center gap-2 bg-[#E74C3C] text-white px-5 py-2.5 rounded-full text-sm font-semibold hover:bg-[#c0392b] shadow-md"
          >
            <Plus size={16} />
            Novo Feriado
          </button>
        </div>
      </div>

      {/* ── Info sobre importação ── */}
      <div className="bg-[#E74C3C]/5 border border-[#E74C3C]/15 rounded-xl px-4 py-3 flex items-start gap-2.5 text-xs text-[#7F8C8D]">
        <Download size={13} className="mt-0.5 flex-shrink-0 text-[#E74C3C]" />
        <p>
          <span className="font-semibold text-[#E74C3C]">Importação automática:</span>{' '}
          o botão "Importar {anoAtual}" busca todos os feriados nacionais oficiais via BrasilAPI e os cadastra automaticamente,
          ignorando os que já existem. Feriados marcados como <span className="font-semibold">Recorrente ↺</span> se repetem automaticamente a cada ano.
        </p>
      </div>

      {/* ── Lista ── */}
      {filtrados.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#E8E8E8] p-14 text-center">
          <div className="w-14 h-14 rounded-2xl bg-[#E74C3C]/10 flex items-center justify-center mx-auto mb-4">
            <Flag className="w-7 h-7 text-[#E74C3C]" />
          </div>
          <p className="text-sm font-semibold text-[#2C3E50] mb-1">
            {feriados.length === 0 ? 'Nenhum feriado cadastrado' : 'Nenhum resultado'}
          </p>
          <p className="text-xs text-[#7F8C8D] max-w-xs mx-auto">
            {feriados.length === 0
              ? `Clique em "Importar ${anoAtual}" para puxar os feriados nacionais automaticamente, ou em "Novo Feriado" para adicionar manualmente.`
              : 'Nenhum feriado corresponde à busca.'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#E8E8E8] overflow-hidden">
          <ul className="divide-y divide-[#F0F0F0]">
            {filtrados.map(f => {
              const isPast = f.data < hoje
              return (
                <li key={f.id} className={`flex items-center gap-4 px-5 py-4 ${isPast ? 'opacity-50' : ''}`}>
                  {/* Ícone com data */}
                  <div className="w-12 h-12 rounded-xl bg-[#E74C3C]/10 flex flex-col items-center justify-center flex-shrink-0">
                    <span className="text-[10px] font-bold text-[#E74C3C] uppercase leading-none">
                      {f.data.slice(5, 7)}/{f.data.slice(0, 4)}
                    </span>
                    <span className="text-lg font-black text-[#E74C3C] leading-none">{f.data.slice(8, 10)}</span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <p className="text-sm font-bold text-[#2C3E50] truncate">{f.nome}</p>
                      {f.recorrente && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#3498DB]/10 text-[#3498DB]">
                          <Repeat size={9} />
                          Recorrente
                        </span>
                      )}
                      {isPast && (
                        <span className="text-[10px] font-semibold text-[#BDC3C7]">passado</span>
                      )}
                    </div>
                    <p className="text-xs text-[#7F8C8D] flex items-center gap-1.5">
                      <Calendar size={11} />
                      <span className="capitalize">{fmtData(f.data)}</span>
                      <span className="text-[#BDC3C7]">·</span>
                      <span className="font-semibold text-[#E74C3C]">toda a clínica</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setModal({ tipo: 'editar', feriado: f })}
                      className="p-1.5 rounded-lg text-[#4A3AE8] hover:bg-[#4A3AE8]/10"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => excluir(f)}
                      className="p-1.5 rounded-lg text-[#E74C3C] hover:bg-[#E74C3C]/10"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {modal && (
        <FeriadoForm
          feriado={modal.tipo === 'editar' ? modal.feriado ?? null : null}
          feriadosExistentes={feriados}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════
// Form de criação / edição
// ════════════════════════════════════════════════════════════════
interface FormProps {
  feriado: Feriado | null
  feriadosExistentes: Feriado[]
  onClose: () => void
}

function FeriadoForm({ feriado, feriadosExistentes, onClose }: FormProps) {
  const anoAtual = new Date().getFullYear()

  const [nome,       setNome]       = useState(feriado?.nome ?? '')
  const [data,       setData]       = useState(feriado?.data ?? '')
  const [recorrente, setRecorrente] = useState(feriado?.recorrente ?? true)
  const [loading,    setLoading]    = useState(false)
  const [err,        setErr]        = useState<string | null>(null)
  const [emendaOk,   setEmendaOk]  = useState(false)
  const [criandoEmenda, setCriandoEmenda] = useState(false)

  const emenda = getEmenda(data)
  const emendaJaExiste = emenda
    ? feriadosExistentes.some(f => f.data === emenda.dataEmenda)
    : false

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true); setErr(null)
    const fd = new FormData()
    if (feriado) fd.set('id', feriado.id)
    fd.set('nome', nome)
    fd.set('data', data)
    fd.set('recorrente', String(recorrente))
    const r = await salvarFeriadoAction(fd)
    setLoading(false)
    if (r?.error) setErr(r.error)
    else { onClose(); window.location.reload() }
  }

  async function handleEmenda() {
    if (!emenda) return
    setCriandoEmenda(true)
    const r = await criarEmendaAction(emenda.dataEmenda, nome || 'Feriado')
    setCriandoEmenda(false)
    if (r?.error) setErr(r.error)
    else setEmendaOk(true)
  }

  function aplicarSugestao(s: typeof SUGESTOES[number]) {
    setNome(s.nome)
    setData(`${anoAtual}-${s.mes}-${s.dia}`)
    setRecorrente(true)
    setEmendaOk(false)
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg my-8">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E8E8E8]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#E74C3C]/10 flex items-center justify-center">
              <Flag size={16} className="text-[#E74C3C]" />
            </div>
            <h2 className="font-bold text-[#2C3E50] text-lg">
              {feriado ? 'Editar Feriado' : 'Novo Feriado'}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-[#F8F9FA] text-[#7F8C8D]">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">

          {/* ── Pills de sugestão ── */}
          {!feriado && (
            <div>
              <label className="text-xs font-semibold text-[#7F8C8D] mb-2 block">Sugestões rápidas</label>
              <div className="flex flex-wrap gap-1.5">
                {SUGESTOES.map(s => {
                  const jaExiste = feriadosExistentes.some(
                    f => f.data === `${anoAtual}-${s.mes}-${s.dia}`
                  )
                  return (
                    <button
                      key={s.nome}
                      type="button"
                      disabled={jaExiste}
                      onClick={() => aplicarSugestao(s)}
                      className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                        jaExiste
                          ? 'opacity-40 cursor-not-allowed bg-[#F8F9FA] border-[#E8E8E8] text-[#7F8C8D]'
                          : data === `${anoAtual}-${s.mes}-${s.dia}`
                            ? 'bg-[#E74C3C] text-white border-[#E74C3C] shadow-sm'
                            : 'bg-white border-[#E8E8E8] text-[#2C3E50] hover:border-[#E74C3C] hover:text-[#E74C3C]'
                      }`}
                    >
                      <span>{s.emoji}</span>
                      <span>{s.nome}</span>
                      {jaExiste && <span className="text-[9px] ml-0.5">✓</span>}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── Nome ── */}
          <div>
            <label className="text-xs font-semibold text-[#7F8C8D] mb-1 block">Nome do feriado *</label>
            <input
              required
              value={nome}
              onChange={e => setNome(e.target.value)}
              placeholder="Ex: Aniversário da Cidade"
              className="w-full h-10 px-3 rounded-lg border border-[#E8E8E8] text-sm outline-none focus:border-[#E74C3C] focus:ring-2 focus:ring-[#E74C3C]/10"
            />
          </div>

          {/* ── Data ── */}
          <div>
            <label className="text-xs font-semibold text-[#7F8C8D] mb-1 block">Data *</label>
            <input
              required
              type="date"
              value={data}
              onChange={e => { setData(e.target.value); setEmendaOk(false) }}
              className="w-full h-10 px-3 rounded-lg border border-[#E8E8E8] text-sm outline-none focus:border-[#E74C3C] focus:ring-2 focus:ring-[#E74C3C]/10"
            />
            {data && (
              <p className="text-[11px] text-[#7F8C8D] mt-1 capitalize">
                {fmtDataCurta(data)}
              </p>
            )}
          </div>

          {/* ── Sugestão de emenda ── */}
          {emenda && !emendaJaExiste && !emendaOk && (
            <div className="bg-[#E67E22]/8 border border-[#E67E22]/30 rounded-xl px-4 py-3 space-y-2">
              <div className="flex items-start gap-2">
                <AlertTriangle size={15} className="text-[#E67E22] flex-shrink-0 mt-0.5" />
                <p className="text-xs text-[#2C3E50]">
                  <span className="font-semibold">Sugestão de emenda:</span>{' '}
                  esse feriado cai numa{' '}
                  <span className="font-semibold">{['domingo','segunda','terça','quarta','quinta','sexta','sábado'][new Date(data + 'T00:00:00').getDay()]}-feira</span>.
                  Que tal bloquear também a <span className="font-semibold">{emenda.nomeEmenda}</span>{' '}
                  ({fmtDataCurta(emenda.dataEmenda)}) para emendar?
                </p>
              </div>
              <button
                type="button"
                onClick={handleEmenda}
                disabled={criandoEmenda}
                className="flex items-center gap-1.5 text-xs font-semibold text-[#E67E22] hover:bg-[#E67E22]/10 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
              >
                {criandoEmenda ? <RefreshCw size={12} className="animate-spin" /> : <Plus size={12} />}
                {criandoEmenda ? 'Criando emenda…' : `Criar emenda na ${emenda.nomeEmenda}`}
              </button>
            </div>
          )}

          {emenda && emendaOk && (
            <div className="bg-[#27AE60]/8 border border-[#27AE60]/30 rounded-xl px-4 py-3 flex items-center gap-2 text-xs text-[#27AE60] font-semibold">
              <Check size={14} />
              Emenda criada para {emenda.nomeEmenda} ({fmtDataCurta(emenda.dataEmenda)})!
            </div>
          )}

          {/* ── Recorrente ── */}
          <label className="flex items-center justify-between p-4 border border-[#E8E8E8] rounded-xl cursor-pointer hover:border-[#3498DB]/40 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#3498DB]/10 flex items-center justify-center flex-shrink-0">
                <Repeat size={16} className="text-[#3498DB]" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[#2C3E50]">Recorrente</p>
                <p className="text-xs text-[#7F8C8D]">Repete automaticamente todo ano na mesma data</p>
              </div>
            </div>
            <div className="relative flex-shrink-0">
              <input
                type="checkbox"
                checked={recorrente}
                onChange={e => setRecorrente(e.target.checked)}
                className="peer sr-only"
              />
              <span className="relative inline-flex h-6 w-11 items-center rounded-full bg-[#E8E8E8] peer-checked:bg-[#3498DB] transition-colors">
                <span className="inline-block h-5 w-5 transform rounded-full bg-white shadow translate-x-0.5 peer-checked:translate-x-[22px] transition-transform" />
              </span>
            </div>
          </label>

          {/* ── Info box ── */}
          <div className="flex items-start gap-2 bg-[#E74C3C]/5 border border-[#E74C3C]/20 rounded-xl px-3 py-2.5 text-xs text-[#2C3E50]">
            <Flag size={13} className="mt-0.5 flex-shrink-0 text-[#E74C3C]" />
            <p>
              Feriados bloqueiam <strong>toda a clínica</strong> — o motor de agendamento não gera
              slots nesse dia para nenhum profissional.
            </p>
          </div>

          {err && (
            <div className="text-xs text-[#E74C3C] bg-[#E74C3C]/10 border border-[#E74C3C]/30 rounded-lg px-3 py-2 flex items-center gap-2">
              <AlertTriangle size={13} />
              {err}
            </div>
          )}

          {/* ── Rodapé ── */}
          <div className="flex items-center justify-between pt-4 border-t border-[#E8E8E8]">
            {feriado ? (
              <button
                type="button"
                onClick={async () => {
                  if (!confirm(`Excluir "${feriado.nome}"?`)) return
                  await excluirFeriadoAction(feriado.id)
                  onClose(); window.location.reload()
                }}
                className="flex items-center gap-1.5 text-sm text-[#E74C3C] hover:bg-[#E74C3C]/10 px-3 py-2 rounded-full font-semibold"
              >
                <Trash2 size={14} />
                Excluir
              </button>
            ) : <div />}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-full text-sm font-medium text-[#7F8C8D] hover:bg-[#F8F9FA]"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading || !nome || !data}
                className="bg-[#E74C3C] text-white px-6 py-2 rounded-full text-sm font-semibold hover:bg-[#c0392b] disabled:opacity-50 shadow-md"
              >
                {loading ? 'Salvando…' : feriado ? 'Salvar' : 'Criar feriado'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
