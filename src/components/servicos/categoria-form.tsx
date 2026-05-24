'use client'

import { useState } from 'react'
import { X, AlertCircle } from 'lucide-react'
import { salvarCategoriaAction } from '@/app/(dashboard)/servicos/actions'
import type { Categoria } from '@/app/(dashboard)/servicos/servicos-client'

const CORES = [
  '#4A3AE8', '#27AE60', '#F39C12', '#E91E63', '#3498DB',
  '#8E44AD', '#E67E22', '#E74C3C', '#16A085', '#34495E',
]

const ICONES = [
  'medical_services', 'fact_check', 'spa', 'self_improvement', 'sports_gymnastics',
  'directions_run', 'fitness_center', 'video_call', 'healing', 'accessibility',
  'psychology', 'monitor_heart', 'favorite',
]

interface Props {
  categoria: Categoria | null
  onClose: () => void
}

export function CategoriaForm({ categoria, onClose }: Props) {
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [cor, setCor] = useState<string>(categoria?.cor ?? '#4A3AE8')
  const [icone, setIcone] = useState<string>(categoria?.icone ?? 'medical_services')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setErr(null)
    const fd = new FormData(e.currentTarget)
    fd.set('cor', cor)
    fd.set('icone', icone)
    const r = await salvarCategoriaAction(fd)
    setLoading(false)
    if (r?.error) setErr(r.error)
    else { onClose(); window.location.reload() }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg my-8">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E8E8E8]">
          <h2 className="font-bold text-[#2C3E50] text-lg">
            {categoria ? 'Editar Categoria' : 'Nova Categoria'}
          </h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-[#F8F9FA] text-[#7F8C8D]">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {categoria && <input type="hidden" name="id" value={categoria.id} />}

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="text-xs font-semibold text-[#7F8C8D] mb-1 block">Nome *</label>
              <input
                name="nome"
                required
                defaultValue={categoria?.nome ?? ''}
                placeholder="Ex: Fisioterapia da Face"
                className="w-full h-10 px-3 rounded-lg border border-[#E8E8E8] text-sm outline-none focus:border-[#4A3AE8] focus:ring-2 focus:ring-[#4A3AE8]/10"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-[#7F8C8D] mb-1 block">Ordem</label>
              <input
                name="ordem"
                type="number"
                defaultValue={categoria?.ordem ?? 0}
                className="w-full h-10 px-3 rounded-lg border border-[#E8E8E8] text-sm outline-none focus:border-[#4A3AE8] focus:ring-2 focus:ring-[#4A3AE8]/10"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-[#7F8C8D] mb-1 block">Descrição</label>
            <textarea
              name="descricao"
              defaultValue={categoria?.descricao ?? ''}
              rows={2}
              className="w-full px-3 py-2 rounded-lg border border-[#E8E8E8] text-sm outline-none focus:border-[#4A3AE8] focus:ring-2 focus:ring-[#4A3AE8]/10 resize-none"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-[#7F8C8D] mb-1.5 block">Cor</label>
            <div className="flex flex-wrap gap-2">
              {CORES.map(c => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setCor(c)}
                  className={`w-8 h-8 rounded-full transition-all ${cor === c ? 'ring-2 ring-offset-2 ring-[#2C3E50] scale-110' : ''}`}
                  style={{ background: c }}
                />
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-[#7F8C8D] mb-1.5 block">Ícone</label>
            <div className="flex flex-wrap gap-2">
              {ICONES.map(i => (
                <button
                  type="button"
                  key={i}
                  onClick={() => setIcone(i)}
                  className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${
                    icone === i ? 'text-white shadow-md' : 'text-[#7F8C8D] bg-[#F8F9FA] hover:bg-[#E8E8E8]'
                  }`}
                  style={icone === i ? { background: cor } : undefined}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 22 }}>{i}</span>
                </button>
              ))}
            </div>
          </div>

          {err && (
            <div className="flex items-start gap-2 text-xs text-[#E74C3C] bg-[#E74C3C]/10 border border-[#E74C3C]/30 rounded-lg px-3 py-2">
              <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
              <span>{err}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-[#E8E8E8]">
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
              {loading ? 'Salvando…' : 'Salvar categoria'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
