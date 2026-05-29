'use client'

import { useState, useEffect } from 'react'
import { Sidebar } from './sidebar'
import { Header } from './header'

const EXPANDED_W  = 260
const COLLAPSED_W = 72
const GAP         = 20

interface Props {
  children:    React.ReactNode
  userName:    string
  userEmail:   string
  empresaNome: string
  userFoto?:   string | null
}

export function SidebarProvider({ children, userName, userEmail, empresaNome, userFoto }: Props) {
  const [pinned,  setPinned]  = useState(false)
  const [hovered, setHovered] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    try {
      if (localStorage.getItem('sidebar-pinned') === 'true') setPinned(true)
    } catch {}
  }, [])

  function togglePin() {
    setPinned(v => {
      const next = !v
      // Ao desafixar, garante que hover não fique travado
      if (!next) setHovered(false)
      try { localStorage.setItem('sidebar-pinned', String(next)) } catch {}
      return next
    })
  }

  const isExpanded = pinned || hovered

  // Conteúdo só se desloca quando fixada (pinned)
  const contentW   = pinned ? EXPANDED_W : COLLAPSED_W
  const marginLeft = contentW + GAP

  // Evita flash no SSR: antes de montar usa colapsado
  const ml = mounted ? marginLeft : COLLAPSED_W + GAP

  return (
    <>
      <Sidebar
        userName={userName}
        userEmail={userEmail}
        empresaNome={empresaNome}
        userFoto={userFoto}
        expanded={isExpanded}
        pinned={pinned}
        onHoverChange={setHovered}
        onPinToggle={togglePin}
      />

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
