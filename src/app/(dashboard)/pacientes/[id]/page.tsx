import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { Mic, Plus, ChevronRight, Activity, FileText, TrendingUp } from 'lucide-react'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar } from '@/components/ui/avatar'
import { AvatarPaciente } from './avatar-paciente'
import { GraficoRecuperacao } from './grafico-recuperacao'
import { formatDate } from '@/lib/utils'
import { BtnAplicarFormulario } from '@/components/formularios/btn-aplicar-formulario'

export default async function PacientePerfilPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [
    { data: paciente },
    { data: planoAtivo },
    { data: escalas },
    { data: evolucoes },
  ] = await Promise.all([
    supabase.from('pacientes').select('*').eq('id', params.id).single(),
    supabase.from('planos_tratamento')
      .select('*')
      .eq('paciente_id', params.id)
      .eq('status', 'ativo')
      .single(),
    supabase.from('escalas_aplicadas')
      .select('*')
      .eq('paciente_id', params.id)
      .order('created_at', { ascending: false })
      .limit(6),
    supabase.from('evolucoes_clinicas')
      .select('*, profissionais(nome)')
      .eq('paciente_id', params.id)
      .order('data_atendimento', { ascending: false })
      .limit(5),
  ])

  if (!paciente) notFound()

  const idade = paciente.data_nascimento
    ? Math.floor((Date.now() - new Date(paciente.data_nascimento).getTime()) / (365.25 * 24 * 3600 * 1000))
    : null

  const objetivos: { nome: string; progresso: number }[] = planoAtivo?.objetivos || [
    { nome: 'Força Isométrica do Joelho', progresso: 85 },
    { nome: 'Propriocepção (BOSU)', progresso: 60 },
    { nome: 'Pilates Dinâmico', progresso: 40 },
  ]

  const escalasIniciais = escalas?.filter((e) => e.tipo_aplicacao === 'inicial') || []
  const escalasReav = escalas?.filter((e) => e.tipo_aplicacao === 'reavaliacao') || []

  return (
    <div className="space-y-5">
      {/* Header do Paciente */}
      <Card>
        <div className="flex items-start gap-5">
          <div className="relative">
            <AvatarPaciente
              pacienteId={paciente.id}
              nome={paciente.nome}
              fotoUrl={paciente.foto_url}
            />
            <div className="absolute -bottom-1 -right-1 bg-[#27AE60] text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ bottom: -2, right: -2 }}>
              ATIVO
            </div>
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold text-[#2C3E50]">{paciente.nome}</h1>
              {planoAtivo?.diagnostico_clinico && (
                <Badge variant="info" className="text-xs">{planoAtivo.diagnostico_clinico}</Badge>
              )}
            </div>
            <div className="flex items-center gap-6 text-sm text-[#7F8C8D]">
              {idade && (
                <span><strong className="text-[#2C3E50]">{idade} anos</strong></span>
              )}
              <span>ID do Paciente: <strong className="text-[#2C3E50]">#{params.id.slice(0, 6).toUpperCase()}</strong></span>
              {planoAtivo?.data_inicio && (
                <span>Data de Início: <strong className="text-[#2C3E50]">{formatDate(planoAtivo.data_inicio)}</strong></span>
              )}
              {evolucoes?.[0] && (
                <span>Última Sessão: <strong className="text-[#2C3E50]">{formatDate(evolucoes[0].data_atendimento)}</strong></span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <BtnAplicarFormulario
              pacienteId={paciente.id}
              pacienteNome={paciente.nome}
              pacienteTelefone={paciente.telefone ?? undefined}
              pacienteDdi={paciente.ddi ?? undefined}
            />
            <Button size="sm">
              <Plus size={14} />
              Nova Sessão
            </Button>
            <Button variant="outline" size="sm">
              Editar Perfil
            </Button>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-3 gap-5">
        {/* Coluna central: gráfico + histórico */}
        <div className="col-span-2 space-y-5">
          {/* Inteligência de Recuperação */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Activity size={16} className="text-[#8E44AD]" />
                <CardTitle>Inteligência de Recuperação</CardTitle>
              </div>
              <div className="flex items-center gap-3 text-xs text-[#7F8C8D]">
                <span className="flex items-center gap-1">
                  <span className="w-3 h-0.5 bg-[#4A3AE8] inline-block rounded" /> Real
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-0.5 bg-gray-300 inline-block rounded border-dashed" /> Previsto
                </span>
              </div>
            </CardHeader>
            <p className="text-xs text-[#7F8C8D] mb-3">ADM (Amplitude de Movimento) — curva real vs. prevista</p>
            <GraficoRecuperacao />

            {/* Narrativa IA */}
            {evolucoes?.[0]?.ia_narrativa ? (
              <div className="mt-4 bg-[#27AE60]/8 border border-[#27AE60]/20 rounded-xl p-4">
                <div className="flex items-center gap-1.5 mb-2">
                  <Activity size={13} className="text-[#27AE60]" />
                  <span className="text-xs font-bold text-[#27AE60] uppercase tracking-wider">Narrativa de IA</span>
                </div>
                <p className="text-sm text-[#2C3E50] italic leading-relaxed">
                  "{evolucoes[0].ia_narrativa}"
                </p>
              </div>
            ) : (
              <div className="mt-4 bg-[#27AE60]/8 border border-[#27AE60]/20 rounded-xl p-4">
                <div className="flex items-center gap-1.5 mb-2">
                  <Activity size={13} className="text-[#27AE60]" />
                  <span className="text-xs font-bold text-[#27AE60] uppercase tracking-wider">Narrativa de IA</span>
                </div>
                <p className="text-sm text-[#2C3E50] italic leading-relaxed">
                  "O paciente está superando as expectativas em ADM (115° alcançados), mas relata fadiga durante
                  exercícios com carga. Recomendação: manter a intensidade atual, porém aumentar o intervalo de
                  descanso em 30 segundos."
                </p>
              </div>
            )}
          </Card>

          {/* Histórico de Sessões */}
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Sessões</CardTitle>
              <Button variant="secondary" size="sm" className="bg-[#27AE60]">
                <Mic size={14} />
                Transcrever com IA
              </Button>
            </CardHeader>
            {evolucoes && evolucoes.length > 0 ? (
              <div className="space-y-1">
                {evolucoes.map((ev: any) => (
                  <div
                    key={ev.id}
                    className="flex items-center justify-between p-3 rounded-xl hover:bg-[#F8F9FA] cursor-pointer group transition-colors"
                  >
                    <div>
                      <p className="text-sm font-semibold text-[#4A3AE8]">
                        {formatDate(ev.data_atendimento)}
                      </p>
                      <p className="text-xs text-[#7F8C8D] mt-0.5 line-clamp-1">{ev.conteudo}</p>
                    </div>
                    <ChevronRight size={16} className="text-[#7F8C8D] group-hover:text-[#4A3AE8] transition-colors" />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[#7F8C8D] py-6 text-center">Nenhuma evolução registrada ainda.</p>
            )}
          </Card>
        </div>

        {/* Coluna direita: Plano + Escalas */}
        <div className="space-y-5">
          {/* Plano de Tratamento */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Plano de Tratamento</CardTitle>
            </CardHeader>
            {planoAtivo ? (
              <div className="space-y-3">
                {planoAtivo.cid10 && (
                  <div className="bg-[#F8F9FA] rounded-lg px-3 py-2">
                    <span className="text-[10px] font-bold text-[#7F8C8D] uppercase">CID-10</span>
                    <p className="text-sm font-semibold text-[#2C3E50]">{planoAtivo.cid10}</p>
                  </div>
                )}
                <div className="space-y-3">
                  {objetivos.map((obj: any) => (
                    <div key={obj.nome}>
                      <div className="flex justify-between mb-1">
                        <span className="text-xs text-[#2C3E50]">{obj.nome}</span>
                        <span className="text-xs font-bold text-[#27AE60]">{obj.progresso}%</span>
                      </div>
                      <div className="h-2 bg-[#E8E8E8] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#27AE60] rounded-full transition-all"
                          style={{ width: `${obj.progresso}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="text-center pt-1">
                  <button className="text-xs text-[#4A3AE8] hover:underline flex items-center gap-1 mx-auto">
                    <FileText size={12} />
                    Ajustar Parâmetros
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-6">
                <TrendingUp size={32} className="mx-auto text-[#E8E8E8] mb-2" />
                <p className="text-xs text-[#7F8C8D]">Nenhum plano ativo</p>
                <Button size="sm" className="mt-2">
                  <Plus size={12} />
                  Criar Plano
                </Button>
              </div>
            )}
          </Card>

          {/* Escalas Clínicas */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Escalas Aplicadas</CardTitle>
            </CardHeader>
            {/* Tabs */}
            <div className="flex gap-0 mb-3 bg-[#F8F9FA] rounded-lg p-0.5">
              <button className="flex-1 text-xs py-1.5 rounded-md bg-white shadow-sm font-semibold text-[#4A3AE8]">
                Inicial
              </button>
              <button className="flex-1 text-xs py-1.5 rounded-md text-[#7F8C8D] hover:text-[#2C3E50] transition-colors">
                Reavaliação
              </button>
            </div>

            {escalasIniciais.length > 0 ? (
              <div className="space-y-2">
                {escalasIniciais.slice(0, 3).map((e: any) => (
                  <div key={e.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-[#F8F9FA]">
                    <div>
                      <p className="text-xs font-semibold text-[#2C3E50]">{e.tipo_escala}</p>
                      {e.interpretacao && (
                        <p className="text-[10px] text-[#7F8C8D]">{e.interpretacao}</p>
                      )}
                    </div>
                    {e.score !== null && (
                      <span className="text-xs font-bold text-[#4A3AE8]">{e.score}</span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {[
                  { nome: 'Escore KOOS', score: '68/100', desc: 'Moderado' },
                  { nome: 'Teste de Lachman', score: 'Negativo', desc: 'Estável' },
                  { nome: 'Escala de Dor (EVA)', score: 'Repouso: 1 | Atividade: 4', desc: '' },
                ].map((e) => (
                  <div key={e.nome} className="flex items-center justify-between p-2 rounded-lg hover:bg-[#F8F9FA]">
                    <div>
                      <p className="text-xs font-semibold text-[#2C3E50]">{e.nome}</p>
                      {e.desc && <p className="text-[10px] text-[#7F8C8D]">{e.desc}</p>}
                    </div>
                    <span className="text-[10px] font-semibold text-[#4A3AE8] text-right max-w-20">{e.score}</span>
                  </div>
                ))}
              </div>
            )}

            <button className="w-full mt-3 text-xs text-[#4A3AE8] border border-[#4A3AE8]/30 rounded-lg py-2 hover:bg-[#4A3AE8]/5 transition-colors font-medium">
              + Aplicar Nova Escala
            </button>
          </Card>
        </div>
      </div>
    </div>
  )
}
