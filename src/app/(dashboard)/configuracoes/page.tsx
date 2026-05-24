import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Settings, Building2, Shield, Bell, CreditCard } from 'lucide-react'

export default function ConfiguracoesPage() {
  return (
    <div className="space-y-6 max-w-3xl">
      {/* Dados da Empresa */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Building2 size={16} className="text-[#4A3AE8]" />
            <CardTitle>Dados da Clínica</CardTitle>
          </div>
        </CardHeader>
        <div className="grid grid-cols-2 gap-4">
          <Input label="Nome da Clínica" defaultValue="CinesioPro Demo" />
          <Input label="CNPJ" defaultValue="" placeholder="00.000.000/0001-00" />
          <Input label="Telefone" defaultValue="" placeholder="(00) 00000-0000" />
          <Input label="E-mail" defaultValue="" placeholder="contato@clinica.com.br" />
        </div>
        <div className="mt-4">
          <Button size="sm">Salvar Alterações</Button>
        </div>
      </Card>

      {/* Segurança */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield size={16} className="text-[#4A3AE8]" />
            <CardTitle>Segurança e Acesso</CardTitle>
          </div>
        </CardHeader>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-[#F8F9FA] rounded-xl">
            <div>
              <p className="text-sm font-medium text-[#2C3E50]">Autenticação em 2 Fatores (MFA)</p>
              <p className="text-xs text-[#7F8C8D]">Obrigatório para Admin e Profissionais</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" defaultChecked />
              <div className="w-11 h-6 bg-[#E8E8E8] peer-focus:ring-2 peer-focus:ring-[#4A3AE8]/30 rounded-full peer peer-checked:bg-[#4A3AE8] transition-colors after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-5" />
            </label>
          </div>
          <div className="flex items-center justify-between p-3 bg-[#F8F9FA] rounded-xl">
            <div>
              <p className="text-sm font-medium text-[#2C3E50]">Expiração de Sessão</p>
              <p className="text-xs text-[#7F8C8D]">Desconectar após inatividade</p>
            </div>
            <select className="h-8 px-2 text-xs border border-[#E8E8E8] rounded-lg bg-white outline-none">
              <option>30 minutos</option>
              <option>1 hora</option>
              <option>4 horas</option>
              <option>8 horas</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Notificações */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bell size={16} className="text-[#4A3AE8]" />
            <CardTitle>Notificações e Automações</CardTitle>
          </div>
        </CardHeader>
        <div className="space-y-3">
          {[
            { label: 'Lembrete de sessão 24h antes', desc: 'Enviar WhatsApp automático ao paciente', checked: true },
            { label: 'Confirmação de agendamento', desc: 'Solicitar confirmação via WhatsApp', checked: true },
            { label: 'Alerta de pacote expirando', desc: 'Notificar quando restam ≤ 2 sessões', checked: true },
            { label: 'Cobrança automática', desc: 'Régua de cobrança para inadimplentes', checked: false },
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between p-3 bg-[#F8F9FA] rounded-xl">
              <div>
                <p className="text-sm font-medium text-[#2C3E50]">{item.label}</p>
                <p className="text-xs text-[#7F8C8D]">{item.desc}</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" defaultChecked={item.checked} />
                <div className="w-11 h-6 bg-[#E8E8E8] rounded-full peer peer-checked:bg-[#4A3AE8] transition-colors after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-5" />
              </label>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
