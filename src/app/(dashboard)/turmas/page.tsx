import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Plus, Users } from 'lucide-react'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

export default async function TurmasPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: usuario } = await supabase.from('usuarios').select('empresa_id').eq('id', user.id).single()

  const { data: turmas } = await supabase
    .from('turmas')
    .select('*, profissionais(nome), salas(nome), turma_alunos(count)')
    .eq('empresa_id', usuario?.empresa_id)
    .eq('ativo', true)
    .order('dia_semana')

  const nivelBadge: Record<string, 'info' | 'warning' | 'danger'> = {
    iniciante: 'info',
    intermediario: 'warning',
    avancado: 'danger',
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-[#7F8C8D] text-sm">{turmas?.length ?? 0} turmas ativas</p>
        <Button>
          <Plus size={16} />
          Nova Turma
        </Button>
      </div>

      {turmas && turmas.length > 0 ? (
        <div className="grid grid-cols-3 gap-4">
          {turmas.map((turma: any) => {
            const alunos = turma.turma_alunos?.[0]?.count || 0
            const ocupacao = turma.capacidade_maxima > 0
              ? Math.round((alunos / turma.capacidade_maxima) * 100)
              : 0

            return (
              <Card key={turma.id} className="hover:shadow-md transition-shadow cursor-pointer">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-[#2C3E50]">{turma.nome}</h3>
                    <p className="text-xs text-[#7F8C8D] mt-0.5">{turma.profissionais?.nome}</p>
                  </div>
                  <Badge variant={nivelBadge[turma.nivel] || 'info'}>
                    {turma.nivel === 'iniciante' ? 'Iniciante' :
                     turma.nivel === 'intermediario' ? 'Intermediário' : 'Avançado'}
                  </Badge>
                </div>

                <div className="space-y-2 text-sm text-[#7F8C8D]">
                  <div className="flex items-center gap-2">
                    <span className="text-[#2C3E50] font-medium">
                      {DIAS_SEMANA[turma.dia_semana || 0]}
                    </span>
                    <span>{turma.hora_inicio} – {turma.hora_fim}</span>
                  </div>
                  {turma.salas?.nome && (
                    <p className="text-xs">📍 {turma.salas.nome}</p>
                  )}
                </div>

                <div className="mt-4">
                  <div className="flex justify-between mb-1">
                    <div className="flex items-center gap-1 text-xs text-[#7F8C8D]">
                      <Users size={12} />
                      <span>{alunos}/{turma.capacidade_maxima} alunos</span>
                    </div>
                    <span className="text-xs font-semibold text-[#2C3E50]">{ocupacao}%</span>
                  </div>
                  <div className="h-1.5 bg-[#E8E8E8] rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${ocupacao >= 90 ? 'bg-[#E74C3C]' : ocupacao >= 70 ? 'bg-[#F39C12]' : 'bg-[#27AE60]'}`}
                      style={{ width: `${ocupacao}%` }}
                    />
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      ) : (
        <Card>
          <div className="text-center py-16 text-[#7F8C8D]">
            <Users size={40} className="mx-auto mb-3 opacity-20" />
            <p className="font-medium">Nenhuma turma cadastrada</p>
            <p className="text-sm mt-1">Crie a primeira turma de Pilates</p>
            <Button className="mt-4">
              <Plus size={14} />
              Criar Turma
            </Button>
          </div>
        </Card>
      )}
    </div>
  )
}
