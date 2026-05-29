'use client'

import { useState, useEffect } from 'react'
import { Sidebar } from './sidebar'
import { Header } from './header'

const EXPANDED_W  = 260
const COLLAPSED_W = 72
const GAP         = 20   // espaço entre o sidebar e o conteúdo (left-4 = 16px)

interface Props {
  children:    React.ReactNode
  userName:    string
  userEmail:   string
  empresaNome: string
}

export function SidebarProvider({ children, userName, userEmail, empresaNome }: Props) {
  const [collapsed, setCollapsed] = useState(false)
  const [mounted,   setMounted]   = useState(false)

  // Lê preferência salva após montar no client
  useEffect(() => {
    setMounted(true)
    try {
      if (localStorage.getItem('sidebar-collapsed') === 'true') setCollapsed(true)
    } catch {}
  }, [])

  function toggle() {
    setCollapsed(v => {
      const next = !v
      try { localStorage.setItem('sidebar-collapsed', String(next)) } catch {}
      return next
    })
  }

  const sidebarW   = collapsed ? COLLAPSED_W : EXPANDED_W
  const marginLeft = sidebarW + GAP   // ex: 260+20=280 ou 72+20=92

  // Antes de montar no client, usa o valor padrão expandido para evitar flash
  const ml = mounted ? marginLeft : EXPANDED_W + GAP

  // Borda direita do sidebar: left-4 (16px) + largura
  const sidebarRightEdge = 16 + (mounted ? sidebarW : EXPANDED_W)

  return (
    <>
      <Sidebar
        userName={userName}
        userEmail={userEmail}
        empresaNome={empresaNome}
        collapsed={collapsed}
      />

      {/* ── Botão de colapso — flutuante na borda do menu ── */}
      <button
        onClick={toggle}
        title={collapsed ? 'Expandir menu' : 'Recolher menu'}
        className="fixed z-[55] flex items-center justify-center transition-[left] duration-300 ease-in-out"
        style={{
          left:        sidebarRightEdge - 14,  // metade do botão para fora
          top:         88,                      // logo abaixo do header
          width:       28,
          height:      28,
          borderRadius: '50%',
          background:  '#ffffff',
          boxShadow:   '0 2px 8px rgba(0,0,0,0.18), 0 0 0 1.5px rgba(91,95,207,0.25)',
          color:       '#5b5fcf',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 14px rgba(91,95,207,0.35), 0 0 0 1.5px rgba(91,95,207,0.4)' }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 8px rgba(0,0,0,0.18), 0 0 0 1.5px rgba(91,95,207,0.25)' }}
      >
        <span
          className="material-symbols-outlined transition-transform duration-300"
          style={{
            fontSize:  16,
            transform: collapsed ? 'rotate(0deg)' : 'rotate(180deg)',
          }}
        >
          chevron_right
        </span>
      </button>

      <div
        className="transition-[margin-left] duration-300 ease-in-out"
        style={{ marginLeft: ml }}
      >
        <Header marginLeft={ml} />
        <main className="pt-20 min-h-screen">
          <div className="p-6 animate-fade-in">
            {children}
          </div>
        </main>
      </div>
    </>
  )
}
