'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Calendar, TrendingUp, DollarSign, CheckCircle,
  Clock, Activity, ChevronRight, LogOut, Sparkles, AlertTriangle
} from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts'
import { createClient } from '@/lib/supabase/client'
import { confirmarPresencaAction } from './actions'

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface Consulta {
  id: string
  data_hora: string
  status: string
  tipo: string
  profissional_nome: string | null
  profissional_avatar: string | null
  servico_nome: string | null
}

interface Pacote {
  sessoes_total: number
  sessoes_utilizadas: number
  data_expiracao: string | null
}

interface Plano {
  sessoes_previstas: number
  sessoes_realizadas: number
  diagnostico: string | null
  data_previsao_alta: string | null
}

interface Escala {
  tipo: string
  score: number
  data: string
  aplicacao: string
}

interface UltimaEvolucao {
  conteudo: string
  data: string
  profissional_nome: string | null
}

interface Props {
  paciente: { id: string; nome: string; foto_url: string | null }
  clinicaNome: string
  proximaConsulta: Consulta | null
  pacoteAtivo: Pacote | null
  planoAtivo: Plano | null
  escalas: Escala[]
  ultimaEvolucao: UltimaEvolucao | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function saudacao() {
  const h = new Date().getHours()
  if (h < 12) return 'Bom dia'
  if (h < 18) return 'Boa tarde'
  return 'Boa noite'
}

function formatarDataHora(iso: string) {
  const d = new Date(iso)
  const dia = d.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
  const hora = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  return { dia: dia.charAt(0).toUpperCase() + dia.slice(1), hora }
}

function diasParaVencer(iso: string | null): number | null {
  if (!iso) return null
  const diff = new Date(iso).getTime() - Date.now()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

// Agrupa escalas para o gráfico: usa EVA quando disponível, senão qualquer score
function prepararGrafico(escalas: Escala[]) {
  return escalas.map((e, i) => ({
    sessao: `S${i + 1}`,
    score: e.score,
    tipo: e.tipo,
    data: new Date(e.data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
  }))
}

// ─── Componente ───────────────────────────────────────────────────────────────
export default function HomeClient({
  paciente,
  clinicaNome,
  proximaConsulta,
  pacoteAtivo,
  planoAtivo,
  escalas,
  ultimaEvolucao,
}: Props) {
  const router = useRouter()
  const [confirmando, setConfirmando] = useState(false)
  const [confirmado, setConfirmado] = useState(
    proximaConsulta?.status === 'confirmado'
  )

  const primeiroNome = paciente.nome.split(' ')[0]
  const dadosGrafico = prepararGrafico(escalas)
  const diasExpiracao = pacoteAtivo ? diasParaVencer(pacoteAtivo.data_expiracao) : null
  const sessoesRestantes = pacoteAtivo
    ? pacoteAtivo.sessoes_total - pacoteAtivo.sessoes_utilizadas
    : null

  async function handleConfirmar() {
    if (!proximaConsulta || confirmado || confirmando) return
    setConfirmando(true)
    const r = await confirmarPresencaAction(proximaConsulta.id)
    setConfirmando(false)
    if (!r?.error) setConfirmado(true)
  }

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/paciente/login')
  }

  return (
    <div className="space-y-4 px-4 pt-5 pb-2">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-[#7F8C8D]">{saudacao()},</p>
          <h1 className="text-xl font-bold text-[#2C3E50]">{primeiroNome} 👋</h1>
          <p className="text-xs text-[#7F8C8D] mt-0.5">{clinicaNome}</p>
        </div>
        <button
          onClick={handleLogout}
          className="w-9 h-9 rounded-full bg-white border border-[#E8E8E8] flex items-center justify-center text-[#7F8C8D] hover:text-[#E74C3C] hover:border-[#E74C3C]/30 transition"
          title="Sair"
        >
          <LogOut size={15} />
        </button>
      </div>

      {/* ── Próxima Consulta ───────────────────────────────────────────── */}
      {proximaConsulta ? (
        <div className="bg-[#4A3AE8] rounded-2xl p-5 text-white relative overflow-hidden">
          {/* Decoração */}
          <div className="absolute -right-6 -top-6 w-32 h-32 bg-white/5 rounded-full" />
          <div className="absolute right-10 -bottom-8 w-24 h-24 bg-white/5 rounded-full" />

          <div className="relative">
            <div className="flex items-center gap-2 mb-3">
              <Calendar size={14} className="text-white/70" />
              <span className="text-xs text-white/70 font-medium uppercase tracking-wide">
                Próxima sessão
              </span>
            </div>

            {(() => {
              const { dia, hora } = formatarDataHora(proximaConsulta.data_hora)
              return (
                <>
                  <p className="text-lg font-bold leading-tight">{dia}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <div className="flex items-center gap-1">
                      <Clock size={13} className="text-white/70" />
                      <span className="text-sm font-semibold">{hora}</span>
                    </div>
                    {proximaConsulta.servico_nome && (
                      <span className="text-xs bg-white/15 px-2 py-0.5 rounded-full">
                        {proximaConsulta.servico_nome}
                      </span>
                    )}
                    {proximaConsulta.tipo === 'teleconsulta' && (
                      <span className="text-xs bg-white/15 px-2 py-0.5 rounded-full">
                        📱 Online
                      </span>
                    )}
                  </div>
                  {proximaConsulta.profissional_nome && (
                    <p className="text-xs text-white/70 mt-1">
                      com {proximaConsulta.profissional_nome}
                    </p>
                  )}
                </>
              )
            })()}

            <button
              onClick={handleConfirmar}
              disabled={confirmado || confirmando}
              className={`mt-4 flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition ${
                confirmado
                  ? 'bg-[#27AE60] text-white cursor-default'
                  : 'bg-white text-[#4A3AE8] hover:bg-white/90'
              }`}
            >
              {confirmado ? (
                <><CheckCircle size={14} /> Presença confirmada!</>
              ) : confirmando ? (
                'Confirmando...'
              ) : (
                <><CheckCircle size={14} /> Confirmar presença</>
              )}
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl p-5 border border-[#E8E8E8] text-center">
          <Calendar size={28} className="text-[#7F8C8D] mx-auto mb-2" />
          <p className="text-sm font-medium text-[#2C3E50]">Nenhuma consulta agendada</p>
          <p className="text-xs text-[#7F8C8D] mt-1">
            Entre em contato com a clínica para agendar
          </p>
        </div>
      )}

      {/* ── Saldo do Pacote ────────────────────────────────────────────── */}
      {pacoteAtivo ? (
        <div className="bg-white rounded-2xl p-4 border border-[#E8E8E8]">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <DollarSign size={15} className="text-[#27AE60]" />
              <span className="text-sm font-semibold text-[#2C3E50]">Meu pacote</span>
            </div>
            <span className="text-xs text-[#7F8C8D]">
              {pacoteAtivo.sessoes_utilizadas}/{pacoteAtivo.sessoes_total} sessões usadas
            </span>
          </div>

          {/* Barra de progresso */}
          <div className="h-2.5 bg-[#F0F0F0] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${(pacoteAtivo.sessoes_utilizadas / pacoteAtivo.sessoes_total) * 100}%`,
                background: sessoesRestantes && sessoesRestantes <= 2
                  ? '#E74C3C'
                  : '#4A3AE8',
              }}
            />
          </div>

          <div className="flex items-center justify-between mt-2">
            <span className="text-xs font-bold text-[#2C3E50]">
              {sessoesRestantes} sessão{sessoesRestantes !== 1 ? 'ões' : ''} restante{sessoesRestantes !== 1 ? 's' : ''}
            </span>
            {diasExpiracao !== null && diasExpiracao <= 15 && (
              <div className="flex items-center gap-1 text-[10px] text-orange-500">
                <AlertTriangle size={11} />
                Vence em {diasExpiracao}d
              </div>
            )}
          </div>
        </div>
      ) : null}

      {/* ── Progresso ──────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl p-4 border border-[#E8E8E8]">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp size={15} className="text-[#4A3AE8]" />
            <span className="text-sm font-semibold text-[#2C3E50]">Meu Progresso</span>
          </div>
          {planoAtivo && (
            <span className="text-xs text-[#7F8C8D]">
              {planoAtivo.sessoes_realizadas}/{planoAtivo.sessoes_previstas ?? '?'} sessões
            </span>
          )}
        </div>

        {dadosGrafico.length > 1 ? (
          <>
            <div className="h-36">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dadosGrafico}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" />
                  <XAxis
                    dataKey="sessao"
                    tick={{ fontSize: 10, fill: '#7F8C8D' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    domain={[0, 10]}
                    tick={{ fontSize: 10, fill: '#7F8C8D' }}
                    axisLine={false}
                    tickLine={false}
                    width={20}
                  />
                  <Tooltip
                    contentStyle={{ fontSize: 11, borderRadius: 8, border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
                    formatter={(v) => [`${v ?? 0}/10`, 'Score']}
                    labelFormatter={(l, p) => p?.[0]?.payload?.data ?? l}
                  />
                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke="#4A3AE8"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: '#4A3AE8', strokeWidth: 0 }}
                    activeDot={{ r: 5 }}
                    name="Score"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            {/* Insight automático */}
            {dadosGrafico.length >= 2 && (() => {
              const primeiro = dadosGrafico[0].score
              const ultimo = dadosGrafico[dadosGrafico.length - 1].score
              const delta = primeiro - ultimo
              const melhora = delta > 0
              return (
                <p className={`text-xs font-medium mt-2 text-center ${melhora ? 'text-[#27AE60]' : 'text-[#7F8C8D]'}`}>
                  {melhora
                    ? `🎉 Redução de ${delta.toFixed(1)} pontos desde o início — continue assim!`
                    : '📊 Continue seu tratamento para ver sua evolução aqui.'}
                </p>
              )
            })()}
          </>
        ) : (
          <div className="h-36 flex flex-col items-center justify-center text-center">
            <Activity size={28} className="text-[#E8E8E8] mb-2" />
            <p className="text-xs text-[#7F8C8D]">
              Seu gráfico de evolução aparecerá aqui conforme as avaliações forem registradas.
            </p>
          </div>
        )}
      </div>

      {/* ── Plano de Tratamento ────────────────────────────────────────── */}
      {planoAtivo && (
        <div className="bg-white rounded-2xl p-4 border border-[#E8E8E8]">
          <div className="flex items-center gap-2 mb-3">
            <Activity size={15} className="text-[#27AE60]" />
            <span className="text-sm font-semibold text-[#2C3E50]">Plano de Tratamento</span>
          </div>

          {planoAtivo.diagnostico && (
            <p className="text-xs text-[#7F8C8D] mb-3">{planoAtivo.diagnostico}</p>
          )}

          {/* Barra de progresso do plano */}
          <div className="h-2 bg-[#F0F0F0] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#27AE60] rounded-full transition-all"
              style={{
                width: planoAtivo.sessoes_previstas
                  ? `${Math.min((planoAtivo.sessoes_realizadas / planoAtivo.sessoes_previstas) * 100, 100)}%`
                  : '0%',
              }}
            />
          </div>
          <div className="flex items-center justify-between mt-1.5">
            <span className="text-[10px] text-[#7F8C8D]">
              {planoAtivo.sessoes_realizadas} realizadas
            </span>
            {planoAtivo.data_previsao_alta && (
              <span className="text-[10px] text-[#7F8C8D]">
                Alta prevista: {new Date(planoAtivo.data_previsao_alta).toLocaleDateString('pt-BR')}
              </span>
            )}
          </div>
        </div>
      )}

      {/* ── Última Sessão (insight do profissional) ────────────────────── */}
      {ultimaEvolucao && (
        <div className="bg-[#8E44AD]/5 border border-[#8E44AD]/20 rounded-2xl p-4">
          <div className="flex items-center gap-1.5 mb-2">
            <Sparkles size={13} className="text-[#8E44AD]" />
            <span className="text-xs font-bold text-[#8E44AD]">Nota da última sessão</span>
          </div>
          <p className="text-xs text-[#2C3E50] leading-relaxed line-clamp-3">
            "{ultimaEvolucao.conteudo}"
          </p>
          <p className="text-[10px] text-[#7F8C8D] mt-2">
            — {ultimaEvolucao.profissional_nome ?? 'Seu profissional'},{' '}
            {new Date(ultimaEvolucao.data).toLocaleDateString('pt-BR', {
              day: '2-digit', month: 'long',
            })}
          </p>
        </div>
      )}

      {/* ── Atalho para Perfil ─────────────────────────────────────────── */}
      <a
        href="/paciente/perfil"
        className="flex items-center justify-between bg-white rounded-2xl p-4 border border-[#E8E8E8] hover:border-[#4A3AE8]/30 transition group"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-[#4A3AE8]/10 flex items-center justify-center">
            <span className="text-base">{paciente.nome.charAt(0).toUpperCase()}</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-[#2C3E50]">{paciente.nome}</p>
            <p className="text-xs text-[#7F8C8D]">Ver e editar perfil</p>
          </div>
        </div>
        <ChevronRight size={16} className="text-[#7F8C8D] group-hover:text-[#4A3AE8] transition" />
      </a>

    </div>
  )
}
