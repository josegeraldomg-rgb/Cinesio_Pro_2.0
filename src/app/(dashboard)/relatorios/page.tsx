import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { FileText, Sparkles, Download, BarChart2 } from 'lucide-react'

const relatorios = [
  { nome: 'Alta Clínica — Lucas Oliveira', tipo: 'Alta', data: '20/05/2026', status: 'pendente', icon: '📋' },
  { nome: 'Evolução Mensal — Maria Silva', tipo: 'Progresso', data: '18/05/2026', status: 'gerado', icon: '📈' },
  { nome: 'Resumo de Turma — Pilates Avançado', tipo: 'Turma', data: '15/05/2026', status: 'gerado', icon: '🏃' },
  { nome: 'Relatório Financeiro — Maio/2026', tipo: 'Financeiro', data: '01/05/2026', status: 'gerado', icon: '💰' },
]

export default function RelatoriosPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <Button>
          <Sparkles size={14} />
          Gerar com IA
        </Button>
      </div>

      {/* Cards de geração rápida */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Relatório de Alta', icon: '📋', color: 'bg-[#4A3AE8]' },
          { label: 'Evolução Clínica', icon: '📈', color: 'bg-[#27AE60]' },
          { label: 'Resumo Financeiro', icon: '💰', color: 'bg-[#3498DB]' },
          { label: 'KPIs da Clínica', icon: '📊', color: 'bg-[#8E44AD]' },
        ].map((item) => (
          <button
            key={item.label}
            className={`${item.color} text-white rounded-xl p-4 text-left hover:opacity-90 transition-opacity`}
          >
            <span className="text-2xl">{item.icon}</span>
            <p className="text-sm font-semibold mt-2">{item.label}</p>
            <p className="text-xs text-white/70 mt-0.5">Gerar agora</p>
          </button>
        ))}
      </div>

      <Card padding={false}>
        <div className="p-5 border-b border-[#E8E8E8]">
          <CardTitle>Histórico de Relatórios</CardTitle>
        </div>
        <div className="divide-y divide-[#E8E8E8]">
          {relatorios.map((r) => (
            <div key={r.nome} className="flex items-center px-5 py-4 hover:bg-[#F8F9FA] transition-colors">
              <span className="text-2xl mr-4">{r.icon}</span>
              <div className="flex-1">
                <p className="text-sm font-semibold text-[#2C3E50]">{r.nome}</p>
                <p className="text-xs text-[#7F8C8D]">{r.tipo} · {r.data}</p>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant={r.status === 'gerado' ? 'success' : 'warning'}>
                  {r.status === 'gerado' ? 'Gerado' : 'Pendente'}
                </Badge>
                {r.status === 'gerado' && (
                  <button className="p-2 rounded-lg hover:bg-[#E8E8E8] text-[#7F8C8D] hover:text-[#4A3AE8] transition-colors">
                    <Download size={15} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
