import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { MessageSquare, CheckCheck, Clock, Send, Sparkles } from 'lucide-react'
import { Avatar } from '@/components/ui/avatar'

const conversas = [
  { nome: 'Maria Silva', msg: 'Confirmo minha presença amanhã às 9h ✓', hora: '14:32', status: 'confirmado', naoLidas: 0 },
  { nome: 'Carlos Mendes', msg: 'Preciso remarcar para quinta?', hora: '13:15', status: 'pendente', naoLidas: 1 },
  { nome: 'Ana Beatriz', msg: 'Obrigada! Pagamento feito via PIX 🙏', hora: '11:48', status: 'recebido', naoLidas: 0 },
  { nome: 'João Pedro', msg: 'Quando posso repor a aula do mês passado?', hora: '10:20', status: 'pendente', naoLidas: 2 },
]

const automacoes = [
  { nome: 'Lembrete 24h antes', ativa: true, disparos: 248 },
  { nome: 'Confirmação de presença', ativa: true, disparos: 186 },
  { nome: 'Cobrança D+1', ativa: true, disparos: 34 },
  { nome: 'Cobrança D+7', ativa: false, disparos: 12 },
  { nome: 'Pacote expirando', ativa: true, disparos: 67 },
]

export default function WhatsAppPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end gap-2">
        <Button variant="outline" size="sm">
          <Sparkles size={14} />
          Agente IA
        </Button>
        <Button size="sm">
          <Send size={14} />
          Nova Mensagem
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-5">
        {/* Conversas */}
        <div className="col-span-2">
          <Card padding={false}>
            <div className="p-4 border-b border-[#E8E8E8]">
              <CardTitle>Conversas Recentes</CardTitle>
            </div>
            <div className="divide-y divide-[#E8E8E8]">
              {conversas.map((conv) => (
                <div key={conv.nome} className="flex items-center gap-3 p-4 hover:bg-[#F8F9FA] cursor-pointer transition-colors">
                  <Avatar name={conv.nome} size="md" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-[#2C3E50] text-sm">{conv.nome}</p>
                      <span className="text-[10px] text-[#7F8C8D]">{conv.hora}</span>
                    </div>
                    <p className="text-xs text-[#7F8C8D] truncate mt-0.5">{conv.msg}</p>
                  </div>
                  {conv.naoLidas > 0 && (
                    <span className="w-5 h-5 bg-[#27AE60] rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                      {conv.naoLidas}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Automações */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Automações Ativas</CardTitle>
            </CardHeader>
            <div className="space-y-3">
              {automacoes.map((auto) => (
                <div key={auto.nome} className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-xs font-medium text-[#2C3E50]">{auto.nome}</p>
                    <p className="text-[10px] text-[#7F8C8D]">{auto.disparos} disparos</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer ml-2">
                    <input type="checkbox" className="sr-only peer" defaultChecked={auto.ativa} readOnly />
                    <div className="w-9 h-5 bg-[#E8E8E8] rounded-full peer peer-checked:bg-[#27AE60] transition-colors after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-4" />
                  </label>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-[#E8E8E8]">
              <Button size="sm" className="w-full" variant="outline">
                Configurar Régua
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
