'use client'

import { useState } from 'react'
import { CheckCircle, TrendingUp, DollarSign, Calendar, Dumbbell, Sparkles, Play } from 'lucide-react'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

const progressoData = [
  { semana: 'S1', dor: 8, mobilidade: 3 },
  { semana: 'S2', dor: 7, mobilidade: 4 },
  { semana: 'S3', dor: 6, mobilidade: 5 },
  { semana: 'S4', dor: 5, mobilidade: 6 },
  { semana: 'S5', dor: 4, mobilidade: 7 },
  { semana: 'S6', dor: 3, mobilidade: 8 },
  { semana: 'S7', dor: 2, mobilidade: 8.5 },
  { semana: 'S8', dor: 1.5, mobilidade: 9 },
]

const slotsDisponiveis = [
  { data: 'Segunda, 26 Maio', hora: '09:00' },
  { data: 'Segunda, 26 Maio', hora: '14:00' },
  { data: 'Quarta, 28 Maio', hora: '10:30' },
  { data: 'Quinta, 29 Maio', hora: '11:00' },
  { data: 'Sexta, 30 Maio', hora: '16:00' },
]

const exercicios = [
  { nome: 'Ponte para Quadril', duracao: '3x 15 rep', frequencia: 'Diário', video: true },
  { nome: 'Agachamento com Carga', duracao: '3x 10 rep', frequencia: '3x/semana', video: true },
  { nome: 'Alongamento Cadeia Posterior', duracao: '30 seg cada', frequencia: 'Diário', video: false },
]

export default function PortalPacientePage() {
  const [slotSelecionado, setSlotSelecionado] = useState<string | null>(null)
  const [confirmado, setConfirmado] = useState(false)

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Banner de boas-vindas */}
      <div className="bg-[#4A3AE8] rounded-2xl p-6 text-white relative overflow-hidden">
        <div className="absolute right-0 top-0 w-48 h-48 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/4" />
        <div className="absolute right-16 bottom-0 w-32 h-32 bg-white/5 rounded-full translate-y-1/2" />
        <div className="relative">
          <p className="text-white/80 text-sm mb-1">Bom dia,</p>
          <h1 className="text-2xl font-bold mb-2">Lucas!</h1>
          <p className="text-white/90 text-sm">
            Você tem uma sessão hoje às <strong>10:30</strong> com a <strong>Dra. Sarah</strong>
          </p>
          <div className="flex items-center gap-3 mt-4">
            <Button
              variant="ghost"
              size="sm"
              className={`bg-white text-[#4A3AE8] hover:bg-white/90 font-semibold ${confirmado ? 'opacity-80' : ''}`}
              onClick={() => setConfirmado(true)}
            >
              {confirmado ? <CheckCircle size={14} /> : null}
              {confirmado ? 'Presença Confirmada!' : 'Confirmar Presença'}
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-5">
        {/* Meu Progresso */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp size={16} className="text-[#4A3AE8]" />
              Meu Progresso
            </CardTitle>
            <div className="flex gap-3 text-[10px] text-[#7F8C8D]">
              <span className="flex items-center gap-1"><span className="w-2 h-0.5 bg-[#E74C3C] inline-block" /> Nível de Dor</span>
              <span className="flex items-center gap-1"><span className="w-2 h-0.5 bg-[#27AE60] inline-block" /> Mobilidade</span>
            </div>
          </CardHeader>
          <div className="h-36">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={progressoData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" />
                <XAxis dataKey="semana" tick={{ fontSize: 10, fill: '#7F8C8D' }} />
                <YAxis tick={{ fontSize: 10, fill: '#7F8C8D' }} domain={[0, 10]} />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                <Line type="monotone" dataKey="dor" stroke="#E74C3C" strokeWidth={2} dot={false} name="Dor" />
                <Line type="monotone" dataKey="mobilidade" stroke="#27AE60" strokeWidth={2} dot={false} name="Mobilidade" />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-[#27AE60] font-medium mt-2 text-center">
            🎉 Sua mobilidade melhorou 200% em 8 semanas!
          </p>
        </Card>

        <div className="space-y-4">
          {/* Status Financeiro */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <DollarSign size={14} className="text-[#27AE60]" />
                Status Financeiro
              </CardTitle>
            </CardHeader>
            <div className="text-center">
              <p className="text-3xl font-bold text-[#2C3E50]">
                <span className="text-[#4A3AE8]">03</span>
                <span className="text-[#7F8C8D] text-lg">/10</span>
              </p>
              <p className="text-xs text-[#7F8C8D] mt-1">sessões restantes</p>
              <div className="h-2 bg-[#E8E8E8] rounded-full overflow-hidden mt-3">
                <div className="h-full bg-[#4A3AE8] rounded-full" style={{ width: '30%' }} />
              </div>
              <div className="mt-3 bg-orange-50 border border-orange-200 rounded-lg p-2">
                <p className="text-[10px] text-orange-600 font-medium">⚠️ Plano expira em 12 dias</p>
              </div>
              <Button size="sm" variant="secondary" className="mt-3 w-full">
                Renovar Plano
              </Button>
            </div>
          </Card>

          {/* Insight IA */}
          <Card className="bg-[#8E44AD]/5 border border-[#8E44AD]/20">
            <div className="flex items-center gap-1.5 mb-2">
              <Sparkles size={14} className="text-[#8E44AD]" />
              <span className="text-xs font-bold text-[#8E44AD]">Insight de IA</span>
            </div>
            <p className="text-xs text-[#2C3E50] leading-relaxed">
              "Lucas, seu progresso está acima da curva esperada. Continue os exercícios em casa — eles representam
              40% da sua recuperação."
            </p>
            <p className="text-[10px] text-[#7F8C8D] mt-1">— Observação da Dra. Sarah</p>
          </Card>
        </div>
      </div>

      {/* Agendamento Rápido */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar size={16} className="text-[#4A3AE8]" />
            Agendamento Rápido
          </CardTitle>
          <span className="text-xs text-[#4A3AE8] hover:underline cursor-pointer">Ver mais horários →</span>
        </CardHeader>
        <div className="flex gap-2 flex-wrap">
          {slotsDisponiveis.map((slot) => (
            <button
              key={`${slot.data}-${slot.hora}`}
              onClick={() => setSlotSelecionado(`${slot.data}-${slot.hora}`)}
              className={`flex flex-col items-center p-3 rounded-xl border-2 text-xs font-medium transition-all ${
                slotSelecionado === `${slot.data}-${slot.hora}`
                  ? 'border-[#4A3AE8] bg-[#4A3AE8]/10 text-[#4A3AE8]'
                  : 'border-[#E8E8E8] hover:border-[#4A3AE8]/50 text-[#2C3E50]'
              }`}
            >
              <span className="font-bold text-sm">{slot.hora}</span>
              <span className="text-[10px] text-[#7F8C8D] mt-0.5">{slot.data.split(', ')[0]}</span>
              <span className="text-[10px] text-[#7F8C8D]">{slot.data.split(', ')[1]}</span>
            </button>
          ))}
        </div>
        {slotSelecionado && (
          <div className="mt-4 flex items-center gap-3">
            <Button size="sm">
              Confirmar Agendamento
            </Button>
            <button onClick={() => setSlotSelecionado(null)} className="text-xs text-[#7F8C8D] hover:text-[#2C3E50]">
              Cancelar
            </button>
          </div>
        )}
      </Card>

      {/* Programa de Exercícios em Casa */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Dumbbell size={16} className="text-[#27AE60]" />
            Programa de Exercícios em Casa
          </CardTitle>
          <span className="text-xs text-[#4A3AE8] hover:underline cursor-pointer">Ver todos →</span>
        </CardHeader>
        <div className="grid grid-cols-3 gap-3">
          {exercicios.map((ex) => (
            <div key={ex.nome} className="bg-[#F8F9FA] rounded-xl overflow-hidden group cursor-pointer">
              <div className="h-28 bg-gradient-to-br from-[#4A3AE8]/20 to-[#27AE60]/20 flex items-center justify-center relative">
                {ex.video ? (
                  <>
                    <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                      <Play size={16} className="text-[#4A3AE8] ml-0.5" />
                    </div>
                    <span className="absolute bottom-2 right-2 bg-black/60 text-white text-[9px] px-1.5 py-0.5 rounded">
                      {ex.duracao}
                    </span>
                  </>
                ) : (
                  <Dumbbell size={28} className="text-[#4A3AE8]/40" />
                )}
              </div>
              <div className="p-3">
                <p className="text-xs font-semibold text-[#2C3E50] leading-tight">{ex.nome}</p>
                <p className="text-[10px] text-[#7F8C8D] mt-0.5">{ex.frequencia}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
