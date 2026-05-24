'use client'

import { useState } from 'react'
import { X, AlertCircle, Trash2 } from 'lucide-react'
import { salvarServicoAction, excluirServicoAction } from '@/app/(dashboard)/servicos/actions'
import type { Servico, Categoria } from '@/app/(dashboard)/servicos/servicos-client'

const TIPOS = [
  { value: 'fisioterapia',  label: 'Fisioterapia' },
  { value: 'pilates',       label: 'Pilates' },
  { value: 'avaliacao',     label: 'Avaliação' },
  { value: 'teleconsulta',  label: 'Teleconsulta' },
  { value: 'outro',         label: 'Outro' },
]

const ICONES = [
  'medical_services', 'fact_check', 'spa', 'self_improvement', 'sports_gymnastics',
  'directions_run', 'fitness_center', 'video_call', 'healing', 'accessibility',
  'psychology', 'monitor_heart', 'favorite',
]

const CORES = [
  '#4A3AE8', '#27AE60', '#F39C12', '#E91E63', '#3498DB',
  '#8E44AD', '#E67E22', '#E74C3C', '#16A085', '#34495E',
]

interface Props {
  servico: Servico | null
  categorias: Categoria[]
  onClose: () => void
}

export function ServicoForm({ servico, categorias, onClose }: Props) {
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [cor, setCor] = useState<string>(servico?.cor ?? '#4A3AE8')
  const [icone, setIcone] = useState<string>(servico?.icone ?? 'medical_services')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setErr(null)
    const fd = new FormData(e.currentTarget)
    fd.set('cor', cor)
    fd.set('icone', icone)
    const r = await salvarServicoAction(fd)
    setLoading(false)
    if (r?.error) setErr(r.error)
    else { onClose(); window.location.reload() }
  }

  async function handleDelete() {
    if (!servico) return
    if (!confirm(`Excluir o serviço "${servico.nome}"? Isso é definitivo.`)) return
    setLoading(true)
    const r = await excluirServicoAction(servico.id)
    setLoading(false)
    if (r?.error) setErr(r.error)
    else { onClose(); window.location.reload() }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E8E8E8]">
          <h2 className="font-bold text-[#2C3E50] text-lg">
            {servico ? 'Editar Serviço' : 'Novo Serviço'}
          </h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-[#F8F9FA] text-[#7F8C8D]">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {servico && <input type="hidden" name="id" value={servico.id} />}

          {/* Nome + Categoria */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-[#7F8C8D] mb-1 block">Nome do serviço *</label>
              <input
                name="nome"
                required
                defaultValue={servico?.nome ?? ''}
                placeholder="Ex: Sessão de Fisioterapia"
                className="w-full h-10 px-3 rounded-lg border border-[#E8E8E8] text-sm outline-none focus:border-[#4A3AE8] focus:ring-2 focus:ring-[#4A3AE8]/10"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-[#7F8C8D] mb-1 block">Categoria</label>
              <select
                name="categoria_id"
                defaultValue={servico?.categoria_id ?? ''}
                className="w-full h-10 px-3 rounded-lg border border-[#E8E8E8] text-sm bg-white outline-none focus:border-[#4A3AE8] focus:ring-2 focus:ring-[#4A3AE8]/10"
              >
                <option value="">— Sem categoria —</option>
                {categorias.map(c => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Descrição */}
          <div>
            <label className="text-xs font-semibold text-[#7F8C8D] mb-1 block">Descrição</label>
            <textarea
              name="descricao"
              defaultValue={servico?.descricao ?? ''}
              rows={2}
              placeholder="Descrição opcional que aparece no portal do paciente"
              className="w-full px-3 py-2 rounded-lg border border-[#E8E8E8] text-sm outline-none focus:border-[#4A3AE8] focus:ring-2 focus:ring-[#4A3AE8]/10 resize-none"
            />
          </div>

          {/* Duração + Valor + Tipo */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-semibold text-[#7F8C8D] mb-1 block">Duração (min) *</label>
              <input
                name="duracao_minutos"
                type="number"
                min={1}
                required
                defaultValue={servico?.duracao_minutos ?? 50}
                className="w-full h-10 px-3 rounded-lg border border-[#E8E8E8] text-sm outline-none focus:border-[#4A3AE8] focus:ring-2 focus:ring-[#4A3AE8]/10"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-[#7F8C8D] mb-1 block">Preço base (R$) *</label>
              <input
                name="valor"
                type="number"
                step="0.01"
                min={0}
                required
                defaultValue={servico?.valor ?? 0}
                className="w-full h-10 px-3 rounded-lg border border-[#E8E8E8] text-sm outline-none focus:border-[#4A3AE8] focus:ring-2 focus:ring-[#4A3AE8]/10"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-[#7F8C8D] mb-1 block">Tipo</label>
              <select
                name="tipo"
                defaultValue={servico?.tipo ?? 'fisioterapia'}
                className="w-full h-10 px-3 rounded-lg border border-[#E8E8E8] text-sm bg-white outline-none focus:border-[#4A3AE8] focus:ring-2 focus:ring-[#4A3AE8]/10"
              >
                {TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
          </div>

          {/* Cor */}
          <div>
            <label className="text-xs font-semibold text-[#7F8C8D] mb-1.5 block">Cor (usada na agenda)</label>
            <div className="flex flex-wrap gap-2">
              {CORES.map(c => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setCor(c)}
                  className={`w-8 h-8 rounded-full transition-all ${cor === c ? 'ring-2 ring-offset-2 ring-[#2C3E50] scale-110' : ''}`}
                  style={{ background: c }}
                  aria-label={`Cor ${c}`}
                />
              ))}
            </div>
          </div>

          {/* Ícone */}
          <div>
            <label className="text-xs font-semibold text-[#7F8C8D] mb-1.5 block">Ícone</label>
            <div className="flex flex-wrap gap-2">
              {ICONES.map(i => (
                <button
                  type="button"
                  key={i}
                  onClick={() => setIcone(i)}
                  className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${
                    icone === i
                      ? 'text-white shadow-md'
                      : 'text-[#7F8C8D] bg-[#F8F9FA] hover:bg-[#E8E8E8]'
                  }`}
                  style={icone === i ? { background: cor } : undefined}
                  aria-label={i}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 22 }}>{i}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Toggles */}
          <div className="space-y-3 pt-2">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                name="permite_agendamento_online"
                defaultChecked={servico?.permite_agendamento_online ?? false}
                className="peer sr-only"
              />
              <span className="relative inline-flex h-6 w-11 items-center rounded-full bg-[#E8E8E8] peer-checked:bg-[#4A3AE8] transition-colors">
                <span className="inline-block h-5 w-5 transform rounded-full bg-white shadow translate-x-0.5 peer-checked:translate-x-[22px] transition-transform" />
              </span>
              <div>
                <span className="text-sm font-semibold text-[#2C3E50]">Permitir agendamento online</span>
                <p className="text-xs text-[#7F8C8D]">Exibe esse serviço no Portal do Paciente</p>
              </div>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                name="ativo"
                defaultChecked={servico?.ativo ?? true}
                className="peer sr-only"
              />
              <span className="relative inline-flex h-6 w-11 items-center rounded-full bg-[#E8E8E8] peer-checked:bg-[#27AE60] transition-colors">
                <span className="inline-block h-5 w-5 transform rounded-full bg-white shadow translate-x-0.5 peer-checked:translate-x-[22px] transition-transform" />
              </span>
              <div>
                <span className="text-sm font-semibold text-[#2C3E50]">Serviço ativo</span>
                <p className="text-xs text-[#7F8C8D]">Pode ser agendado pelos profissionais</p>
              </div>
            </label>
          </div>

          {err && (
            <div className="flex items-start gap-2 text-xs text-[#E74C3C] bg-[#E74C3C]/10 border border-[#E74C3C]/30 rounded-lg px-3 py-2">
              <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
              <span>{err}</span>
            </div>
          )}

          {/* Rodapé */}
          <div className="flex items-center justify-between pt-4 border-t border-[#E8E8E8]">
            {servico ? (
              <button
                type="button"
                onClick={handleDelete}
                disabled={loading}
                className="flex items-center gap-1.5 text-sm text-[#E74C3C] hover:bg-[#E74C3C]/10 px-3 py-2 rounded-full font-semibold disabled:opacity-50"
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
                disabled={loading}
                className="bg-[#4A3AE8] text-white px-6 py-2 rounded-full text-sm font-semibold hover:bg-[#3829c7] disabled:opacity-50 shadow-md"
              >
                {loading ? 'Salvando…' : 'Salvar serviço'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
