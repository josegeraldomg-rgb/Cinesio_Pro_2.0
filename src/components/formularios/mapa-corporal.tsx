'use client'

import { useState } from 'react'
import { Brain, Globe, X, Zap } from 'lucide-react'

// ─── Tipos ────────────────────────────────────────────────────────────────────
type Shape =
  | { t: 'e'; cx: number; cy: number; rx: number; ry: number }
  | { t: 'r'; x: number; y: number; w: number; h: number; rx?: number }
  | { t: 'p'; d: string }

interface ZonaCorporal {
  id: string
  nome: string
  cor: string
  corBg: string
  shapes: Shape[]
}

// ─── Zonas corporais (viewBox 0 0 160 340) ───────────────────────────────────
// Corpo centrado em x=80. Lado Esquerdo = x < 80 (perspectiva do observador).
// Renderizadas em ordem: as primeiras ficam abaixo, as últimas ficam no topo.
const ZONAS: ZonaCorporal[] = [

  // ── TRONCO ─────────────────────────────────────────────────────────────────
  {
    id: 'torax', nome: 'Tórax / Respiratório',
    cor: '#dc2626', corBg: '#fee2e2',
    shapes: [{
      t: 'p',
      d: 'M73,54 L87,54 C90,58 92,63 92,69 C93,83 93,100 92,112 C90,115 86,116 80,116 C74,116 70,115 68,112 C67,100 67,83 68,69 C68,63 70,58 73,54',
    }],
  },
  {
    id: 'abdomen', nome: 'Abdômen',
    cor: '#ea580c', corBg: '#fff7ed',
    shapes: [{
      t: 'p',
      d: 'M68,116 C67,122 65,133 64,142 C63,146 63,149 65,150 L95,150 C97,149 97,146 96,142 C95,133 93,122 92,116',
    }],
  },

  // ── QUADRIL ────────────────────────────────────────────────────────────────
  {
    id: 'quadril_e', nome: 'Quadril Esquerdo',
    cor: '#db2777', corBg: '#fce7f3',
    shapes: [{
      t: 'p',
      d: 'M65,150 C62,153 57,158 52,163 C49,168 49,173 51,177 C53,180 57,183 62,183 L80,183 L80,150',
    }],
  },
  {
    id: 'quadril_d', nome: 'Quadril Direito',
    cor: '#db2777', corBg: '#fce7f3',
    shapes: [{
      t: 'p',
      d: 'M95,150 L80,150 L80,183 L98,183 C103,183 107,180 109,177 C111,173 111,168 108,163 C103,158 98,153 95,150',
    }],
  },

  // ── COLUNA / LOMBAR (faixa central sobre o tronco) ────────────────────────
  {
    id: 'coluna_lombar', nome: 'Coluna / Lombar',
    cor: '#d97706', corBg: '#fef3c7',
    shapes: [{ t: 'r', x: 75, y: 104, w: 10, h: 66, rx: 5 }],
  },

  // ── COXAS ──────────────────────────────────────────────────────────────────
  {
    id: 'coxa_e', nome: 'Coxa Esquerda',
    cor: '#16a34a', corBg: '#dcfce7',
    shapes: [{
      t: 'p',
      d: 'M62,183 C61,190 59,205 57,218 C56,225 55,232 55,238 L77,238 C78,232 78,226 78,218 C79,205 80,192 80,183',
    }],
  },
  {
    id: 'coxa_d', nome: 'Coxa Direita',
    cor: '#16a34a', corBg: '#dcfce7',
    shapes: [{
      t: 'p',
      d: 'M80,183 C80,192 81,205 82,218 C82,226 82,232 82,238 L104,238 C104,232 104,226 103,218 C102,205 100,190 98,183',
    }],
  },

  // ── PERNAS ─────────────────────────────────────────────────────────────────
  {
    id: 'perna_e', nome: 'Perna Esquerda',
    cor: '#0f766e', corBg: '#f0fdfa',
    shapes: [{
      t: 'p',
      d: 'M54,254 C53,264 52,278 52,290 C52,295 53,297 54,298 L77,298 C78,297 78,295 78,290 C77,278 77,264 78,254',
    }],
  },
  {
    id: 'perna_d', nome: 'Perna Direita',
    cor: '#0f766e', corBg: '#f0fdfa',
    shapes: [{
      t: 'p',
      d: 'M82,254 C83,264 83,278 82,290 C82,295 83,297 84,298 L107,298 C107,297 108,295 108,290 C107,278 107,264 106,254',
    }],
  },

  // ── JOELHOS (sobre coxas + pernas) ─────────────────────────────────────────
  {
    id: 'joelho_e', nome: 'Joelho Esquerdo',
    cor: '#15803d', corBg: '#f0fdf4',
    shapes: [{ t: 'e', cx: 66, cy: 245, rx: 13, ry: 10 }],
  },
  {
    id: 'joelho_d', nome: 'Joelho Direito',
    cor: '#15803d', corBg: '#f0fdf4',
    shapes: [{ t: 'e', cx: 94, cy: 245, rx: 13, ry: 10 }],
  },

  // ── TORNOZELOS / PÉS ───────────────────────────────────────────────────────
  {
    id: 'tornozelo_pe_e', nome: 'Tornozelo / Pé Esq.',
    cor: '#4f46e5', corBg: '#e0e7ff',
    shapes: [{
      t: 'p',
      d: 'M56,298 L76,298 C78,302 77,308 75,313 C71,317 63,319 55,319 C47,319 41,316 39,311 C37,306 38,301 41,299 C46,298 52,298 56,298',
    }],
  },
  {
    id: 'tornozelo_pe_d', nome: 'Tornozelo / Pé Dir.',
    cor: '#4f46e5', corBg: '#e0e7ff',
    shapes: [{
      t: 'p',
      d: 'M84,298 L104,298 C108,298 114,299 119,301 C122,306 121,311 119,316 C113,319 105,319 97,319 C89,319 83,317 81,313 C79,308 82,302 84,298',
    }],
  },

  // ── OMBROS (sobre o tórax) ─────────────────────────────────────────────────
  {
    id: 'ombro_e', nome: 'Ombro Esquerdo',
    cor: '#2563eb', corBg: '#dbeafe',
    shapes: [{
      t: 'p',
      d: 'M73,54 C70,56 66,59 60,62 C53,65 44,67 38,70 C34,72 31,76 30,81 L38,84 C40,80 44,77 49,75 C55,73 64,71 68,67 C72,64 73,59 73,56',
    }],
  },
  {
    id: 'ombro_d', nome: 'Ombro Direito',
    cor: '#2563eb', corBg: '#dbeafe',
    shapes: [{
      t: 'p',
      d: 'M87,54 C90,56 94,59 100,62 C107,65 116,67 122,70 C126,72 129,76 130,81 L122,84 C120,80 116,77 111,75 C105,73 96,71 92,67 C88,64 87,59 87,56',
    }],
  },

  // ── BRAÇOS ─────────────────────────────────────────────────────────────────
  {
    id: 'braco_e', nome: 'Braço Esquerdo',
    cor: '#1d4ed8', corBg: '#eff6ff',
    shapes: [{
      t: 'p',
      d: 'M30,81 C29,89 27,102 26,114 C26,121 27,127 29,131 L44,131 C45,127 45,121 44,114 C43,102 42,89 39,84 C37,82 34,81 30,81',
    }],
  },
  {
    id: 'braco_d', nome: 'Braço Direito',
    cor: '#1d4ed8', corBg: '#eff6ff',
    shapes: [{
      t: 'p',
      d: 'M130,81 C131,89 133,102 134,114 C134,121 133,127 131,131 L116,131 C115,127 115,121 116,114 C117,102 118,89 121,84 C123,82 126,81 130,81',
    }],
  },

  // ── ANTEBRAÇOS ─────────────────────────────────────────────────────────────
  {
    id: 'antebraco_e', nome: 'Antebraço Esquerdo',
    cor: '#0284c7', corBg: '#f0f9ff',
    shapes: [{
      t: 'p',
      d: 'M27,147 C26,157 24,170 23,182 C23,188 24,193 24,196 L42,196 C42,193 43,188 43,182 C42,170 40,157 43,147',
    }],
  },
  {
    id: 'antebraco_d', nome: 'Antebraço Direito',
    cor: '#0284c7', corBg: '#f0f9ff',
    shapes: [{
      t: 'p',
      d: 'M133,147 C134,157 136,170 137,182 C137,188 136,193 136,196 L118,196 C118,193 117,188 117,182 C118,170 120,157 117,147',
    }],
  },

  // ── PUNHOS / MÃOS ──────────────────────────────────────────────────────────
  {
    id: 'punho_mao_e', nome: 'Punho / Mão Esq.',
    cor: '#0d9488', corBg: '#ccfbf1',
    shapes: [{
      t: 'p',
      d: 'M22,196 L41,196 C43,200 43,207 43,213 C42,219 38,222 33,222 C28,222 23,219 21,213 C20,207 20,200 22,196',
    }],
  },
  {
    id: 'punho_mao_d', nome: 'Punho / Mão Dir.',
    cor: '#0d9488', corBg: '#ccfbf1',
    shapes: [{
      t: 'p',
      d: 'M138,196 L119,196 C117,200 117,207 117,213 C118,219 122,222 127,222 C132,222 137,219 139,213 C140,207 140,200 138,196',
    }],
  },

  // ── COTOVELOS (sobre braços + antebraços) ───────────────────────────────────
  {
    id: 'cotovelo_e', nome: 'Cotovelo Esquerdo',
    cor: '#0369a1', corBg: '#e0f2fe',
    shapes: [{ t: 'e', cx: 35, cy: 139, rx: 12, ry: 9 }],
  },
  {
    id: 'cotovelo_d', nome: 'Cotovelo Direito',
    cor: '#0369a1', corBg: '#e0f2fe',
    shapes: [{ t: 'e', cx: 125, cy: 139, rx: 12, ry: 9 }],
  },

  // ── PESCOÇO + CABEÇA (renderizados por último, ficam no topo) ──────────────
  {
    id: 'pescoco', nome: 'Pescoço / Cervical',
    cor: '#6d28d9', corBg: '#f5f3ff',
    shapes: [{
      t: 'p',
      d: 'M75,36 C74,42 73,47 73,54 L87,54 C87,47 86,42 85,36 C83,35 80,35 77,35',
    }],
  },
  {
    id: 'cabeca', nome: 'Cabeça',
    cor: '#7c3aed', corBg: '#ede9fe',
    shapes: [{ t: 'e', cx: 80, cy: 19, rx: 15, ry: 18 }],
  },
]

/** Mapa id → nome para uso externo (ex: título na biblioteca) */
export const ZONA_NOMES: Record<string, string> = Object.fromEntries([
  ...ZONAS.map(z => [z.id, z.nome]),
  ['neurologia', 'Neurológico'],
  ['geral', 'Geral / Sistêmico'],
])

// Chips especiais (sem representação no SVG)
const CHIPS_ESPECIAIS = [
  { id: 'neurologia', nome: 'Neurológico',       cor: '#a855f7', corBg: '#faf5ff', Icon: Brain  },
  { id: 'geral',      nome: 'Geral / Sistêmico', cor: '#64748b', corBg: '#f8fafc', Icon: Globe  },
]

// ─── Helpers de renderização ──────────────────────────────────────────────────
function renderShape(shape: Shape, fill: string, stroke: string, sw: number, key: number) {
  const base = { fill, stroke, strokeWidth: sw }
  switch (shape.t) {
    case 'e':
      return <ellipse key={key} {...base} cx={shape.cx} cy={shape.cy} rx={shape.rx} ry={shape.ry} />
    case 'r':
      return <rect key={key} {...base} x={shape.x} y={shape.y} width={shape.w} height={shape.h} rx={shape.rx ?? 4} />
    case 'p':
      return <path key={key} {...base} d={shape.d + ' Z'} />
  }
}

// ─── Componente principal ─────────────────────────────────────────────────────
export interface MapaCorporalProps {
  zonaSelecionada: string | null
  onSelect: (zona: string | null) => void
}

export function MapaCorporal({ zonaSelecionada, onSelect }: MapaCorporalProps) {
  const [hovered, setHovered] = useState<string | null>(null)

  const zonaInfoAtiva   = ZONAS.find(z => z.id === zonaSelecionada)
                       ?? CHIPS_ESPECIAIS.find(c => c.id === zonaSelecionada)
  const zonaInfoHovered = ZONAS.find(z => z.id === hovered)
  const infoVisivel     = zonaInfoHovered ?? zonaInfoAtiva

  function toggleZona(id: string) {
    onSelect(zonaSelecionada === id ? null : id)
  }

  return (
    <div className="flex flex-col items-center gap-0 w-full select-none">

      {/* ── Label de instrução ───────────────────────────────────────────── */}
      <div className="flex items-center gap-1.5 mb-2 self-start">
        <Zap size={11} className="text-[#5b5fcf]" />
        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Filtrar por Região</p>
      </div>

      {/* ── SVG do corpo ─────────────────────────────────────────────────── */}
      <div className="relative w-full flex justify-center">
        <svg
          viewBox="0 0 160 340"
          width={148}
          height={296}
          className="overflow-visible"
          aria-label="Mapa corporal clicável"
        >
          {ZONAS.map(zona => {
            const isActive  = zonaSelecionada === zona.id
            const isHovered = hovered === zona.id

            let fill: string, stroke: string, sw: number
            if (isActive) {
              fill = zona.cor; stroke = 'white'; sw = 1.5
            } else if (isHovered) {
              fill = zona.corBg; stroke = zona.cor; sw = 2
            } else {
              fill = '#dde1eb'; stroke = 'white'; sw = 1.5
            }

            return (
              <g
                key={zona.id}
                onClick={() => toggleZona(zona.id)}
                onMouseEnter={() => setHovered(zona.id)}
                onMouseLeave={() => setHovered(null)}
                style={{ cursor: 'pointer' }}
                role="button"
                aria-label={zona.nome}
                aria-pressed={isActive}
              >
                {zona.shapes.map((s, i) => renderShape(s, fill, stroke, sw, i))}
              </g>
            )
          })}
        </svg>
      </div>

      {/* ── Indicador da zona ────────────────────────────────────────────── */}
      <div className="h-7 flex items-center justify-center w-full mt-1">
        {infoVisivel ? (
          <span
            className="text-xs font-semibold px-3 py-1 rounded-full transition-all"
            style={{ background: infoVisivel.corBg, color: infoVisivel.cor }}
          >
            {infoVisivel.nome}
          </span>
        ) : (
          <span className="text-xs text-gray-400">Clique em uma região</span>
        )}
      </div>

      {/* ── Chips especiais ──────────────────────────────────────────────── */}
      <div className="w-full flex flex-col gap-1.5 mt-3">
        {CHIPS_ESPECIAIS.map(({ id, nome, cor, corBg, Icon }) => {
          const ativo = zonaSelecionada === id
          return (
            <button
              key={id}
              onClick={() => toggleZona(id)}
              className="flex items-center gap-2 w-full px-3 py-2 rounded-xl text-sm transition-all border-2 font-medium"
              style={ativo
                ? { background: corBg, color: cor, borderColor: cor }
                : { background: 'transparent', color: '#6b7280', borderColor: '#e5e7eb' }
              }
              onMouseEnter={e => { if (!ativo) (e.currentTarget as HTMLElement).style.borderColor = cor }}
              onMouseLeave={e => { if (!ativo) (e.currentTarget as HTMLElement).style.borderColor = '#e5e7eb' }}
            >
              <Icon size={14} />
              {nome}
            </button>
          )
        })}
      </div>

      {/* ── Limpar ───────────────────────────────────────────────────────── */}
      {zonaSelecionada && (
        <button
          onClick={() => onSelect(null)}
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-700 mt-2 transition-colors"
        >
          <X size={12} /> Limpar filtro
        </button>
      )}
    </div>
  )
}
