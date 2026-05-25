'use client'

import { useState, useRef } from 'react'
import { X, Dumbbell, Upload, Link as LinkIcon } from 'lucide-react'
import type { ExercicioBiblioteca } from '@/app/(dashboard)/biblioteca-exercicios/actions'
import { salvarExercicioBibliotecaAction, salvarUrlMidiaAction } from '@/app/(dashboard)/biblioteca-exercicios/actions'

interface Props {
  exercicio?: ExercicioBiblioteca
  onClose: () => void
  onSalvo: () => void
}

const NIVEIS = ['leve', 'moderado', 'intenso'] as const
const NIVEL_COR: Record<string, string> = { leve: '#27AE60', moderado: '#E67E22', intenso: '#E74C3C' }

export function ExercicioFormModal({ exercicio, onClose, onSalvo }: Props) {
  const isEdit = !!exercicio?.id && !exercicio.is_sistema

  const [nome, setNome] = useState(exercicio?.nome ?? '')
  const [descricao, setDescricao] = useState(exercicio?.descricao ?? '')
  const [grupoMuscular, setGrupoMuscular] = useState(exercicio?.grupo_muscular ?? '')
  const [nivel, setNivel] = useState<string>(exercicio?.nivel ?? '')
  const [objetivo, setObjetivo] = useState(exercicio?.objetivo ?? '')
  const [regiaoCorporal, setRegiao] = useState(exercicio?.regiao_corporal ?? '')
  const [aparelho, setAparelho] = useState(exercicio?.aparelho ?? '')
  const [seriesPadrao, setSeries] = useState(String(exercicio?.series_padrao ?? ''))
  const [repPadrao, setRep] = useState(exercicio?.repeticoes_padrao ?? '')
  const [videoUrl, setVideoUrl] = useState(exercicio?.video_url ?? '')
  const [imagemUrl, setImagemUrl] = useState(exercicio?.imagem_url ?? '')

  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const [uploadando, setUploadando] = useState(false)

  const fileRef = useRef<HTMLInputElement>(null)

  async function salvar() {
    if (!nome.trim()) { setErr('Informe o nome do exercício.'); return }
    setSaving(true); setErr('')
    try {
      const r = await salvarExercicioBibliotecaAction({
        id: isEdit ? exercicio?.id : undefined,
        nome,
        descricao: descricao || null,
        grupo_muscular: grupoMuscular || null,
        nivel: (nivel as any) || null,
        objetivo: objetivo || null,
        regiao_corporal: regiaoCorporal || null,
        aparelho: aparelho || null,
        series_padrao: seriesPadrao ? Number(seriesPadrao) : null,
        repeticoes_padrao: repPadrao || null,
        video_url: videoUrl || null,
        imagem_url: imagemUrl || null,
      })
      if ('error' in r) { setErr(r.error); return }
      onSalvo()
    } finally { setSaving(false) }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !exercicio?.id) return
    setUploadando(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const tipo = file.type.startsWith('video') ? 'video' : 'imagem'
      const { uploadMidiaExercicio } = await import('@/lib/supabase/storage-upload')
      const r = await uploadMidiaExercicio(exercicio.id, tipo, fd)
      if ('error' in r) { setErr(r.error); return }
      if (tipo === 'imagem') setImagemUrl(r.url)
      else setVideoUrl(r.url)
      // Persiste URL no banco
      await salvarUrlMidiaAction(exercicio.id, tipo === 'imagem' ? 'imagem_url' : 'video_url', r.url)
    } finally { setUploadando(false) }
  }

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh] overflow-hidden">

        <div className="flex items-center justify-between px-6 py-5 border-b border-[#F0F0F0] flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#4A3AE8] flex items-center justify-center">
              <Dumbbell size={16} className="text-white" />
            </div>
            <p className="font-bold text-[#2C3E50] text-sm">{isEdit ? 'Editar Exercício' : 'Novo Exercício'}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-[#7F8C8D] hover:bg-[#F8F9FA] transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">

          <div>
            <label className="label-xs">Nome *</label>
            <input value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Hundred" className="input-base w-full" />
          </div>

          <div>
            <label className="label-xs">Descrição / Instrução</label>
            <textarea value={descricao} onChange={e => setDescricao(e.target.value)} rows={2} placeholder="Como executar…" className="input-base w-full resize-none" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-xs">Grupo Muscular</label>
              <input value={grupoMuscular} onChange={e => setGrupoMuscular(e.target.value)} placeholder="Ex: Core, Glúteo…" className="input-base w-full" />
            </div>
            <div>
              <label className="label-xs">Região Corporal</label>
              <input value={regiaoCorporal} onChange={e => setRegiao(e.target.value)} placeholder="Ex: Abdômen, Joelho…" className="input-base w-full" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-xs">Aparelho / Equipamento</label>
              <input value={aparelho} onChange={e => setAparelho(e.target.value)} placeholder="Ex: Reformer, Solo…" className="input-base w-full" />
            </div>
            <div>
              <label className="label-xs">Objetivo</label>
              <input value={objetivo} onChange={e => setObjetivo(e.target.value)} placeholder="Ex: Fortalecimento…" className="input-base w-full" />
            </div>
          </div>

          <div>
            <label className="label-xs">Nível</label>
            <div className="flex gap-2">
              {NIVEIS.map(n => (
                <button key={n} type="button"
                  onClick={() => setNivel(prev => prev === n ? '' : n)}
                  className={`flex-1 h-9 rounded-xl text-xs font-semibold border-2 transition-all capitalize ${
                    nivel === n ? 'text-white border-transparent shadow-sm' : 'border-[#E8E8E8] text-[#7F8C8D] bg-white hover:border-current'
                  }`}
                  style={nivel === n ? { background: NIVEL_COR[n], borderColor: NIVEL_COR[n] } : { color: NIVEL_COR[n] }}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-xs">Séries padrão</label>
              <input type="number" min={1} value={seriesPadrao} onChange={e => setSeries(e.target.value)} placeholder="Ex: 3" className="input-base w-full" />
            </div>
            <div>
              <label className="label-xs">Repetições padrão</label>
              <input value={repPadrao} onChange={e => setRep(e.target.value)} placeholder="Ex: 12 ou 30s" className="input-base w-full" />
            </div>
          </div>

          {/* Mídia */}
          <div>
            <label className="label-xs">URL do Vídeo (YouTube, Vimeo ou direto)</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <LinkIcon size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7F8C8D]" />
                <input value={videoUrl} onChange={e => setVideoUrl(e.target.value)} placeholder="https://…" className="input-base w-full pl-9" />
              </div>
            </div>
          </div>

          <div>
            <label className="label-xs">URL da Imagem</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <LinkIcon size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7F8C8D]" />
                <input value={imagemUrl} onChange={e => setImagemUrl(e.target.value)} placeholder="https://…" className="input-base w-full pl-9" />
              </div>
              {isEdit && (
                <>
                  <input ref={fileRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleFileUpload} />
                  <button
                    onClick={() => fileRef.current?.click()}
                    disabled={uploadando}
                    className="flex items-center gap-1.5 px-3 py-2 border border-[#E8E8E8] rounded-lg text-xs text-[#7F8C8D] hover:bg-[#F8F9FA] transition-colors disabled:opacity-50"
                  >
                    <Upload size={13} />
                    {uploadando ? 'Enviando…' : 'Upload'}
                  </button>
                </>
              )}
            </div>
          </div>

          {err && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5">
              <span className="text-red-400 mt-0.5">⚠</span>
              <p className="text-xs text-red-600">{err}</p>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-[#F0F0F0] flex gap-3 flex-shrink-0 bg-[#FAFAFA] rounded-b-2xl">
          <button onClick={onClose} className="h-11 px-5 rounded-xl border-2 border-[#E8E8E8] text-sm font-semibold text-[#7F8C8D] hover:border-[#D0D0D0] transition-colors">
            Cancelar
          </button>
          <button onClick={salvar} disabled={saving} className="flex-1 h-11 rounded-xl bg-[#4A3AE8] text-white font-semibold text-sm hover:bg-[#3D2ED6] disabled:opacity-50 shadow-sm transition-colors">
            {saving ? 'Salvando…' : isEdit ? 'Salvar Alterações' : 'Criar Exercício'}
          </button>
        </div>
      </div>
    </div>
  )
}
