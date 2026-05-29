'use client'

import { useState, useRef } from 'react'
import {
  ClipboardList, Upload, FileText, CheckCircle2, Clock,
  AlertTriangle, Loader2, Eye, Trash2, X, Printer,
  ChevronRight, FileImage, FileScan, Pill, FileCheck,
  ExternalLink,
} from 'lucide-react'
import type {
  FormularioPendente, FormularioRespondido,
  ExamePaciente, SessaoRealizada,
} from './actions'
import {
  uploadExameAction, gerarUrlExameAction, excluirExameAction,
} from './actions'

// ─── Helpers ──────────────────────────────────────────────────────────────────
const TIPO_EXAME: Record<string, { label: string; icone: React.FC<{ size?: number; className?: string }> }> = {
  rx:          { label: 'Raio-X',       icone: FileScan },
  ressonancia: { label: 'Ressonância',  icone: FileScan },
  tomografia:  { label: 'Tomografia',   icone: FileScan },
  laudo:       { label: 'Laudo',        icone: FileCheck },
  receita:     { label: 'Receita',      icone: Pill },
  outro:       { label: 'Outro',        icone: FileText },
}

const CATEGORIA_COR: Record<string, string> = {
  anamnese:       'bg-blue-50 text-blue-600',
  escalas_dor:    'bg-red-50 text-red-600',
  funcionalidade: 'bg-green-50 text-green-600',
  consentimentos: 'bg-gray-100 text-gray-600',
  pilates:        'bg-pink-50 text-pink-600',
  saude_mental:   'bg-purple-50 text-purple-600',
}

function formatBytes(bytes: number | null): string {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function diasParaExpirar(iso: string | null): number | null {
  if (!iso) return null
  return Math.ceil((new Date(iso).getTime() - Date.now()) / (1000 * 3600 * 24))
}

type Aba = 'formularios' | 'exames' | 'declaracoes'

// ─── Props ────────────────────────────────────────────────────────────────────
interface Props {
  formulariosPendentes: FormularioPendente[]
  formulariosRespondidos: FormularioRespondido[]
  exames: ExamePaciente[]
  sessoes: SessaoRealizada[]
  paciente: { nome: string; cpf: string | null; data_nascimento: string | null }
  clinicaNome: string
  clinicaEndereco: string | null
  clinicaCnpj: string | null
}

// ════════════════════════════════════════════════════════════════
//  Componente Principal
// ════════════════════════════════════════════════════════════════
export default function DocumentosClient({
  formulariosPendentes, formulariosRespondidos,
  exames: examesIniciais, sessoes,
  paciente, clinicaNome, clinicaEndereco, clinicaCnpj,
}: Props) {
  const [aba, setAba] = useState<Aba>('formularios')
  const [exames, setExames] = useState<ExamePaciente[]>(examesIniciais)
  const [declaracaoModal, setDeclaracaoModal] = useState(false)
  const [periodoDeclaracao, setPeriodoDeclaracao] = useState<'30' | '60' | '90' | '180'>('90')

  const totalPendente = formulariosPendentes.length
  const totalExames = exames.length

  return (
    <div className="px-4 pt-5 pb-2 space-y-4">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-xl font-bold text-[#2C3E50]">Documentos</h1>
        <p className="text-xs text-[#7F8C8D]">Formulários, exames e declarações</p>
      </div>

      {/* ── Abas ────────────────────────────────────────────────────────── */}
      <div className="flex bg-[#F0F0F0] rounded-xl p-1 gap-1">
        {([
          { id: 'formularios', label: 'Formulários', badge: totalPendente },
          { id: 'exames',      label: 'Exames',      badge: totalExames > 0 ? totalExames : 0 },
          { id: 'declaracoes', label: 'Declarações', badge: 0 },
        ] as const).map(({ id, label, badge }) => (
          <button
            key={id}
            onClick={() => setAba(id)}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition relative ${
              aba === id ? 'bg-white text-[#2C3E50] shadow-sm' : 'text-[#7F8C8D]'
            }`}
          >
            {label}
            {badge > 0 && aba !== id && (
              <span className="absolute -top-1 -right-0.5 w-4 h-4 bg-[#4A3AE8] text-white text-[9px] rounded-full flex items-center justify-center font-bold">
                {badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ════════════════════ ABA FORMULÁRIOS ════════════════════════════ */}
      {aba === 'formularios' && (
        <AbaFormularios
          pendentes={formulariosPendentes}
          respondidos={formulariosRespondidos}
        />
      )}

      {/* ════════════════════ ABA EXAMES ═════════════════════════════════ */}
      {aba === 'exames' && (
        <AbaExames
          exames={exames}
          onExameAdicionado={(e) => setExames(prev => [e, ...prev])}
          onExameRemovido={(id) => setExames(prev => prev.filter(x => x.id !== id))}
        />
      )}

      {/* ════════════════════ ABA DECLARAÇÕES ════════════════════════════ */}
      {aba === 'declaracoes' && (
        <AbaDeclaracoes
          sessoes={sessoes}
          paciente={paciente}
          clinicaNome={clinicaNome}
          clinicaEndereco={clinicaEndereco}
          clinicaCnpj={clinicaCnpj}
          periodo={periodoDeclaracao}
          onChangePeriodo={setPeriodoDeclaracao}
          onPrint={() => setDeclaracaoModal(true)}
        />
      )}

      {/* Modal de impressão */}
      {declaracaoModal && (
        <ModalDeclaracao
          sessoes={sessoes}
          paciente={paciente}
          clinicaNome={clinicaNome}
          clinicaEndereco={clinicaEndereco}
          clinicaCnpj={clinicaCnpj}
          periodoMeses={Number(periodoDeclaracao) / 30}
          onFechar={() => setDeclaracaoModal(false)}
        />
      )}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════
//  ABA: FORMULÁRIOS
// ════════════════════════════════════════════════════════════════
function AbaFormularios({
  pendentes, respondidos,
}: { pendentes: FormularioPendente[]; respondidos: FormularioRespondido[] }) {
  return (
    <div className="space-y-4">
      {/* Pendentes */}
      {pendentes.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={14} className="text-orange-500" />
            <span className="text-xs font-bold text-[#2C3E50]">
              Aguardando resposta ({pendentes.length})
            </span>
          </div>
          <div className="space-y-3">
            {pendentes.map((f) => {
              const dias = diasParaExpirar(f.expira_em)
              const urgente = dias !== null && dias <= 3
              return (
                <div
                  key={f.token}
                  className={`bg-white rounded-2xl border p-4 ${urgente ? 'border-orange-200' : 'border-[#E8E8E8]'}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${CATEGORIA_COR[f.categoria] ?? 'bg-gray-100 text-gray-500'}`}>
                        {f.categoria.replace('_', ' ')}
                      </span>
                      <p className="font-semibold text-[#2C3E50] text-sm mt-1.5">{f.nome}</p>
                      {f.descricao && (
                        <p className="text-xs text-[#7F8C8D] mt-0.5 line-clamp-2">{f.descricao}</p>
                      )}
                      {dias !== null && (
                        <p className={`text-xs mt-1 font-medium ${urgente ? 'text-orange-500' : 'text-[#7F8C8D]'}`}>
                          {urgente ? '⚠️ ' : ''}Expira em {dias}d
                        </p>
                      )}
                    </div>
                  </div>
                  <a
                    href={`/responder/${f.token}?origem=portal`}
                    className="mt-3 flex items-center justify-center gap-2 w-full py-2.5 bg-[#4A3AE8] text-white rounded-xl text-sm font-semibold hover:bg-[#3829c7] transition"
                  >
                    <ClipboardList size={14} /> Responder agora
                  </a>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {pendentes.length === 0 && (
        <div className="bg-[#27AE60]/5 border border-[#27AE60]/20 rounded-2xl p-5 text-center">
          <CheckCircle2 size={28} className="text-[#27AE60] mx-auto mb-2" />
          <p className="text-sm font-medium text-[#2C3E50]">Tudo em dia!</p>
          <p className="text-xs text-[#7F8C8D] mt-1">Nenhum formulário pendente no momento.</p>
        </div>
      )}

      {/* Respondidos */}
      {respondidos.length > 0 && (
        <div>
          <p className="text-xs font-bold text-[#7F8C8D] uppercase tracking-wide mb-2">
            Respondidos recentemente
          </p>
          <div className="space-y-2">
            {respondidos.slice(0, 5).map((f, i) => (
              <div
                key={i}
                className="bg-white rounded-xl border border-[#E8E8E8] px-4 py-3 flex items-center gap-3"
              >
                <CheckCircle2 size={16} className="text-[#27AE60] flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#2C3E50] truncate">{f.nome}</p>
                  <p className="text-xs text-[#7F8C8D]">
                    Respondido em {new Date(f.respondido_em).toLocaleDateString('pt-BR', {
                      day: '2-digit', month: 'short', year: 'numeric',
                    })}
                  </p>
                </div>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${CATEGORIA_COR[f.categoria] ?? 'bg-gray-100 text-gray-500'}`}>
                  {f.categoria.replace('_', ' ')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════
//  ABA: EXAMES
// ════════════════════════════════════════════════════════════════
function AbaExames({
  exames, onExameAdicionado, onExameRemovido,
}: {
  exames: ExamePaciente[]
  onExameAdicionado: (e: ExamePaciente) => void
  onExameRemovido: (id: string) => void
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [tipo, setTipo] = useState('outro')
  const [obs, setObs] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')
  const [excluindo, setExcluindo] = useState<string | null>(null)
  const [abrindo, setAbrindo] = useState<string | null>(null)
  const [confirmExcluir, setConfirmExcluir] = useState<string | null>(null)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    if (f.size > 10 * 1024 * 1024) { setErro('Arquivo muito grande. Limite: 10MB.'); return }
    setArquivo(f)
    setErro('')
  }

  async function handleUpload() {
    if (!arquivo) return
    setEnviando(true)
    setErro('')
    const fd = new FormData()
    fd.append('file', arquivo)
    fd.append('tipo', tipo)
    fd.append('observacoes', obs)
    const r = await uploadExameAction(fd)
    setEnviando(false)
    if ('error' in r) {
      setErro(r.error)
    } else {
      // Adiciona o novo exame à lista otimisticamente
      onExameAdicionado({
        id: r.id,
        nome_arquivo: arquivo.name,
        tipo,
        tamanho_bytes: arquivo.size,
        mime_type: arquivo.type,
        observacoes: obs || null,
        created_at: new Date().toISOString(),
      })
      setArquivo(null)
      setObs('')
      setTipo('outro')
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function handleAbrir(id: string) {
    setAbrindo(id)
    const r = await gerarUrlExameAction(id)
    setAbrindo(null)
    if ('error' in r) { alert(r.error); return }
    window.open(r.url, '_blank')
  }

  async function handleExcluir(id: string) {
    setExcluindo(id)
    const r = await excluirExameAction(id)
    setExcluindo(null)
    setConfirmExcluir(null)
    if ('error' in r) { alert(r.error); return }
    onExameRemovido(id)
  }

  return (
    <div className="space-y-4">
      {/* Upload */}
      <div className="bg-white rounded-2xl border border-[#E8E8E8] p-4 space-y-3">
        <p className="text-sm font-semibold text-[#2C3E50]">Enviar novo exame</p>

        {/* Área de upload */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className={`w-full border-2 border-dashed rounded-xl p-5 flex flex-col items-center gap-2 transition ${
            arquivo
              ? 'border-[#4A3AE8] bg-[#4A3AE8]/5'
              : 'border-[#E8E8E8] hover:border-[#4A3AE8]/40'
          }`}
        >
          {arquivo ? (
            <>
              <FileText size={24} className="text-[#4A3AE8]" />
              <p className="text-sm font-medium text-[#4A3AE8]">{arquivo.name}</p>
              <p className="text-xs text-[#7F8C8D]">{formatBytes(arquivo.size)}</p>
            </>
          ) : (
            <>
              <Upload size={24} className="text-[#7F8C8D]" />
              <p className="text-sm font-medium text-[#2C3E50]">Toque para selecionar</p>
              <p className="text-xs text-[#7F8C8D]">PDF, JPG ou PNG • Máximo 10MB</p>
            </>
          )}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf,image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleFileChange}
        />

        {/* Tipo */}
        <div>
          <label className="block text-xs font-semibold text-[#7F8C8D] mb-1">Tipo de exame</label>
          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
            className="w-full h-10 px-3 rounded-xl border border-[#E8E8E8] text-sm text-[#2C3E50] bg-white outline-none focus:border-[#4A3AE8]"
          >
            {Object.entries(TIPO_EXAME).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </div>

        {/* Observações */}
        <div>
          <label className="block text-xs font-semibold text-[#7F8C8D] mb-1">Observações (opcional)</label>
          <input
            value={obs}
            onChange={(e) => setObs(e.target.value)}
            placeholder="Ex: RX de joelho direito, 15/05/2026"
            className="w-full h-10 px-3 rounded-xl border border-[#E8E8E8] text-sm text-[#2C3E50] outline-none focus:border-[#4A3AE8]"
          />
        </div>

        {erro && (
          <div className="flex items-center gap-2 text-xs text-[#E74C3C] bg-red-50 border border-red-200 rounded-xl px-3 py-2">
            <AlertTriangle size={12} />
            {erro}
          </div>
        )}

        <button
          onClick={handleUpload}
          disabled={!arquivo || enviando}
          className="w-full py-3 bg-[#4A3AE8] text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2 hover:bg-[#3829c7] disabled:opacity-50 transition"
        >
          {enviando ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
          {enviando ? 'Enviando...' : 'Enviar exame'}
        </button>
      </div>

      {/* Lista */}
      {exames.length > 0 ? (
        <div>
          <p className="text-xs font-bold text-[#7F8C8D] uppercase tracking-wide mb-2">
            Meus exames ({exames.length})
          </p>
          <div className="space-y-2">
            {exames.map((ex) => {
              const TipoIcone = TIPO_EXAME[ex.tipo]?.icone ?? FileText
              return (
                <div
                  key={ex.id}
                  className="bg-white rounded-2xl border border-[#E8E8E8] p-3 flex items-center gap-3"
                >
                  <div className="w-10 h-10 rounded-xl bg-[#4A3AE8]/8 flex items-center justify-center flex-shrink-0">
                    <TipoIcone size={18} className="text-[#4A3AE8]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#2C3E50] truncate">{ex.nome_arquivo}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] bg-[#F0F0F0] text-[#7F8C8D] px-1.5 py-0.5 rounded-full">
                        {TIPO_EXAME[ex.tipo]?.label ?? ex.tipo}
                      </span>
                      {ex.tamanho_bytes && (
                        <span className="text-[10px] text-[#7F8C8D]">{formatBytes(ex.tamanho_bytes)}</span>
                      )}
                      <span className="text-[10px] text-[#7F8C8D]">
                        {new Date(ex.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                      </span>
                    </div>
                    {ex.observacoes && (
                      <p className="text-[10px] text-[#7F8C8D] mt-0.5 truncate">{ex.observacoes}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => handleAbrir(ex.id)}
                      disabled={abrindo === ex.id}
                      className="w-8 h-8 rounded-lg bg-[#4A3AE8]/8 flex items-center justify-center text-[#4A3AE8] hover:bg-[#4A3AE8]/15 disabled:opacity-50 transition"
                      title="Abrir"
                    >
                      {abrindo === ex.id
                        ? <Loader2 size={14} className="animate-spin" />
                        : <ExternalLink size={14} />
                      }
                    </button>
                    <button
                      onClick={() => setConfirmExcluir(ex.id)}
                      className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center text-[#E74C3C] hover:bg-red-100 transition"
                      title="Excluir"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <div className="bg-[#F8F9FA] rounded-2xl border border-[#E8E8E8] p-6 text-center">
          <FileScan size={28} className="text-[#E8E8E8] mx-auto mb-2" />
          <p className="text-sm font-medium text-[#2C3E50]">Nenhum exame enviado</p>
          <p className="text-xs text-[#7F8C8D] mt-1">
            Envie RX, ressonâncias, laudos e outros documentos para seu prontuário digital.
          </p>
        </div>
      )}

      {/* Modal de confirmação de exclusão */}
      {confirmExcluir && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 space-y-4">
            <h3 className="text-base font-bold text-[#2C3E50]">Excluir exame?</h3>
            <p className="text-sm text-[#7F8C8D]">
              O arquivo será excluído permanentemente. Essa ação não pode ser desfeita.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmExcluir(null)}
                className="flex-1 py-2.5 bg-[#F0F0F0] text-[#2C3E50] rounded-xl text-sm font-semibold"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleExcluir(confirmExcluir)}
                disabled={excluindo === confirmExcluir}
                className="flex-1 py-2.5 bg-[#E74C3C] text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-1 disabled:opacity-50"
              >
                {excluindo === confirmExcluir
                  ? <Loader2 size={14} className="animate-spin" />
                  : 'Excluir'
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════
//  ABA: DECLARAÇÕES
// ════════════════════════════════════════════════════════════════
function AbaDeclaracoes({
  sessoes, paciente, clinicaNome, clinicaEndereco, clinicaCnpj,
  periodo, onChangePeriodo, onPrint,
}: {
  sessoes: SessaoRealizada[]
  paciente: Props['paciente']
  clinicaNome: string
  clinicaEndereco: string | null
  clinicaCnpj: string | null
  periodo: '30' | '60' | '90' | '180'
  onChangePeriodo: (p: '30' | '60' | '90' | '180') => void
  onPrint: () => void
}) {
  const diasFiltro = Number(periodo)
  const corte = new Date(Date.now() - diasFiltro * 24 * 3600 * 1000).toISOString()
  const sessoesFiltradas = sessoes.filter((s) => s.data_hora >= corte)

  return (
    <div className="space-y-4">
      {/* Declaração de Comparecimento */}
      <div className="bg-white rounded-2xl border border-[#E8E8E8] overflow-hidden">
        <div className="bg-[#4A3AE8]/5 px-4 py-3 border-b border-[#E8E8E8]">
          <div className="flex items-center gap-2">
            <FileText size={15} className="text-[#4A3AE8]" />
            <span className="text-sm font-semibold text-[#2C3E50]">Declaração de Comparecimento</span>
          </div>
          <p className="text-xs text-[#7F8C8D] mt-0.5">
            Gera um documento com o histórico de sessões realizadas.
          </p>
        </div>
        <div className="p-4 space-y-4">
          {/* Seletor de período */}
          <div>
            <p className="text-xs font-semibold text-[#7F8C8D] mb-2">Período</p>
            <div className="flex gap-2 flex-wrap">
              {([
                { v: '30',  label: 'Último mês' },
                { v: '60',  label: '2 meses' },
                { v: '90',  label: '3 meses' },
                { v: '180', label: '6 meses' },
              ] as const).map(({ v, label }) => (
                <button
                  key={v}
                  onClick={() => onChangePeriodo(v)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
                    periodo === v
                      ? 'border-[#4A3AE8] bg-[#4A3AE8] text-white'
                      : 'border-[#E8E8E8] text-[#7F8C8D] hover:border-[#4A3AE8]/40'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Preview */}
          {sessoesFiltradas.length > 0 ? (
            <>
              <div className="bg-[#F8F9FA] rounded-xl p-3 space-y-1.5 max-h-48 overflow-y-auto">
                {sessoesFiltradas.map((s) => (
                  <div key={s.id} className="flex items-center gap-2 text-xs">
                    <span className="w-20 text-[#7F8C8D] flex-shrink-0">
                      {new Date(s.data_hora).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                    </span>
                    <span className="text-[10px] text-[#7F8C8D] flex-shrink-0">
                      {new Date(s.data_hora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className="font-medium text-[#2C3E50] truncate">
                      {s.servico_nome ?? 'Sessão'}
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-[#7F8C8D]">
                <strong className="text-[#2C3E50]">{sessoesFiltradas.length}</strong> sessão{sessoesFiltradas.length !== 1 ? 'ões' : ''} no período
              </p>
              <button
                onClick={onPrint}
                className="w-full flex items-center justify-center gap-2 py-3 bg-[#4A3AE8] text-white rounded-xl text-sm font-semibold hover:bg-[#3829c7] transition"
              >
                <Printer size={16} />
                Gerar declaração
              </button>
            </>
          ) : (
            <div className="py-4 text-center">
              <Clock size={24} className="text-[#E8E8E8] mx-auto mb-2" />
              <p className="text-sm text-[#7F8C8D]">
                Nenhuma sessão realizada nesse período.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Nota LGPD */}
      <div className="bg-[#F8F9FA] rounded-2xl p-4 text-center">
        <p className="text-[10px] text-[#7F8C8D] leading-relaxed">
          🔒 Os documentos gerados são para uso pessoal. Dados protegidos conforme a LGPD.
        </p>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════
//  MODAL DE DECLARAÇÃO (imprimível)
// ════════════════════════════════════════════════════════════════
function ModalDeclaracao({
  sessoes, paciente, clinicaNome, clinicaEndereco, clinicaCnpj,
  periodoMeses, onFechar,
}: {
  sessoes: SessaoRealizada[]
  paciente: Props['paciente']
  clinicaNome: string
  clinicaEndereco: string | null
  clinicaCnpj: string | null
  periodoMeses: number
  onFechar: () => void
}) {
  const corte = new Date(Date.now() - periodoMeses * 30 * 24 * 3600 * 1000).toISOString()
  const sessoesFiltradas = sessoes.filter((s) => s.data_hora >= corte)
  const hoje = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })

  function imprimir() {
    window.print()
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-md max-h-[90vh] flex flex-col">
        {/* Header do modal */}
        <div className="flex items-center justify-between p-4 border-b border-[#E8E8E8] print:hidden">
          <p className="font-semibold text-[#2C3E50] text-sm">Declaração de Comparecimento</p>
          <div className="flex items-center gap-2">
            <button
              onClick={imprimir}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#4A3AE8] text-white rounded-xl text-xs font-semibold hover:bg-[#3829c7] transition"
            >
              <Printer size={13} /> Imprimir / PDF
            </button>
            <button
              onClick={onFechar}
              className="w-7 h-7 rounded-full bg-[#F0F0F0] flex items-center justify-center text-[#7F8C8D] hover:bg-[#E8E8E8]"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Conteúdo imprimível */}
        <div
          id="declaracao-print"
          className="overflow-y-auto p-6 flex-1 text-[#2C3E50] print:overflow-visible"
          style={{ fontFamily: 'Arial, sans-serif', fontSize: '12px', lineHeight: '1.6' }}
        >
          {/* Cabeçalho */}
          <div className="text-center mb-6">
            <p className="text-base font-bold uppercase">{clinicaNome}</p>
            {clinicaEndereco && <p className="text-xs text-[#7F8C8D]">{clinicaEndereco}</p>}
            {clinicaCnpj && <p className="text-xs text-[#7F8C8D]">CNPJ: {clinicaCnpj}</p>}
          </div>

          <div className="text-center mb-6">
            <p className="text-sm font-bold uppercase tracking-widest border-b-2 border-[#2C3E50] pb-2 inline-block px-4">
              Declaração de Comparecimento
            </p>
          </div>

          {/* Corpo */}
          <p className="mb-4 text-justify">
            Declaramos, para os devidos fins, que o(a) paciente <strong>{paciente.nome}</strong>
            {paciente.cpf && `, CPF {paciente.cpf},`}
            {' '}compareceu para atendimento de Fisioterapia / Pilates nesta clínica nas
            seguintes datas e horários:
          </p>

          {/* Tabela de sessões */}
          <table className="w-full mb-4 border-collapse text-xs">
            <thead>
              <tr className="border-b-2 border-[#2C3E50]">
                <th className="text-left py-1.5 pr-3 font-bold">Data</th>
                <th className="text-left py-1.5 pr-3 font-bold">Hora</th>
                <th className="text-left py-1.5 pr-3 font-bold">Serviço</th>
                <th className="text-left py-1.5 font-bold">Profissional</th>
              </tr>
            </thead>
            <tbody>
              {sessoesFiltradas.map((s) => (
                <tr key={s.id} className="border-b border-gray-200">
                  <td className="py-1.5 pr-3">
                    {new Date(s.data_hora).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="py-1.5 pr-3">
                    {new Date(s.data_hora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="py-1.5 pr-3">{s.servico_nome ?? '—'}</td>
                  <td className="py-1.5">{s.profissional_nome ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <p className="mb-6">
            Total: <strong>{sessoesFiltradas.length} sessão{sessoesFiltradas.length !== 1 ? 'ões' : ''}</strong> realizadas no período.
          </p>

          {/* Rodapé */}
          <p className="mb-8">{clinicaEndereco ? clinicaEndereco.split(',').pop()?.trim() : 'Brasil'}, {hoje}.</p>

          <div className="mt-10 pt-4 border-t border-[#2C3E50] text-center">
            <p className="font-bold">{clinicaNome}</p>
            {clinicaCnpj && <p className="text-xs text-[#7F8C8D]">CNPJ: {clinicaCnpj}</p>}
            <p className="text-[10px] text-[#7F8C8D] mt-2">
              Documento gerado eletronicamente em {new Date().toLocaleDateString('pt-BR')} às{' '}
              {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
