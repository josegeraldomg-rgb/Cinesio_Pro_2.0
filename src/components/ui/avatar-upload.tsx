'use client'

import { useRef, useState, useTransition } from 'react'
import { Camera, Loader2 } from 'lucide-react'

const COLORS = ['#4A3AE8', '#27AE60', '#3498DB', '#E67E22', '#8E44AD', '#E74C3C']

function getBg(name: string) {
  return COLORS[(name || 'U').charCodeAt(0) % COLORS.length]
}

function getInitials(name: string) {
  return (name || 'U')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0].toUpperCase())
    .join('')
}

interface Props {
  /** Nome da pessoa (para iniciais e cor de fallback) */
  name: string
  /** URL atual da foto (null = sem foto → usa iniciais) */
  src?: string | null
  /** Tamanho em px do avatar (largura e altura). Padrão: 80 */
  size?: number
  /**
   * Chamado quando o usuário escolhe um arquivo.
   * Deve fazer upload e retornar { error? } | { url? }.
   */
  onUpload: (formData: FormData) => Promise<{ error?: string; url?: string } | void>
  className?: string
  /** Desabilita o clique de upload (ex: somente leitura) */
  readonly?: boolean
}

export function AvatarUpload({
  name,
  src,
  size = 80,
  onUpload,
  className = '',
  readonly = false,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview]     = useState<string | null>(src ?? null)
  const [errMsg, setErrMsg]       = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Sync se a prop src mudar externamente
  if (src && src !== preview && !isPending) {
    setPreview(src)
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setErrMsg(null)

    // Pré-visualização local imediata
    const reader = new FileReader()
    reader.onload = ev => setPreview(ev.target?.result as string)
    reader.readAsDataURL(file)

    // Upload em background
    const fd = new FormData()
    fd.append('file', file)

    startTransition(async () => {
      const res = await onUpload(fd)
      if (res?.error) {
        setErrMsg(res.error)
        setPreview(src ?? null) // reverte preview em caso de erro
      } else if (res?.url) {
        setPreview(res.url)
      }
    })

    // Limpa o input para permitir re-upload do mesmo arquivo
    e.target.value = ''
  }

  const fontSize = Math.round(size * 0.35)

  return (
    <div className={`relative flex-shrink-0 ${className}`} style={{ width: size, height: size }}>
      {/* Avatar (foto ou iniciais) */}
      {preview ? (
        <img
          src={preview}
          alt={name}
          className="w-full h-full rounded-full object-cover"
        />
      ) : (
        <div
          className="w-full h-full rounded-full flex items-center justify-center text-white font-bold select-none"
          style={{ background: getBg(name), fontSize }}
        >
          {getInitials(name)}
        </div>
      )}

      {/* Overlay de câmera — só aparece em modo editável */}
      {!readonly && (
        <button
          type="button"
          title="Alterar foto"
          onClick={() => inputRef.current?.click()}
          className="absolute inset-0 rounded-full flex items-center justify-center bg-black/40 opacity-0 hover:opacity-100 transition-opacity focus:opacity-100 outline-none"
          disabled={isPending}
        >
          {isPending ? (
            <Loader2 className="text-white animate-spin" size={Math.round(size * 0.3)} />
          ) : (
            <Camera className="text-white" size={Math.round(size * 0.3)} />
          )}
        </button>
      )}

      {/* Indicador de carregamento (mini-ring) no canto */}
      {isPending && (
        <span className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-white flex items-center justify-center shadow-sm">
          <Loader2 size={10} className="animate-spin text-[#4A3AE8]" />
        </span>
      )}

      {/* Input oculto */}
      {!readonly && (
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleFileChange}
        />
      )}

      {/* Erro inline (tooltip-like abaixo do avatar) */}
      {errMsg && (
        <p className="absolute top-full mt-1 left-1/2 -translate-x-1/2 whitespace-nowrap text-[11px] text-[#E74C3C] bg-white border border-[#E74C3C]/30 rounded-lg px-2 py-0.5 shadow-sm z-10">
          {errMsg}
        </p>
      )}
    </div>
  )
}
