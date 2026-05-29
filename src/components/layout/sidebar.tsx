'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { createClient } from '@/lib/supabase/client'

// SVG do logo oficial do WhatsApp
function WhatsAppSvg({ size = 22 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  )
}

type NavItem = {
  href:        string
  label:       string
  icon:        string
  customIcon?: React.ReactNode
}

const navItems: NavItem[] = [
  { href: '/dashboard',            label: 'Painel',             icon: 'dashboard' },
  { href: '/agenda',               label: 'Agenda',             icon: 'calendar_month' },
  { href: '/pacientes',            label: 'Pacientes',          icon: 'groups' },
  { href: '/prontuarios',          label: 'Prontuários',        icon: 'clinical_notes' },
  { href: '/formularios',          label: 'Formulários',        icon: 'edit_document' },
  { href: '/turmas',               label: 'Turmas',             icon: 'sports_gymnastics' },
  { href: '/biblioteca-exercicios',label: 'Biblioteca',         icon: 'fitness_center' },
  { href: '/equipe',               label: 'Equipe',             icon: 'badge' },
  { href: '/financeiro',           label: 'Financeiro',         icon: 'payments' },
  { href: '/relatorios',           label: 'Relatórios',         icon: 'description' },
  { href: '/whatsapp',             label: 'WhatsApp',           icon: 'whatsapp', customIcon: <WhatsAppSvg /> },
  { href: '/portal',               label: 'Portal do Paciente', icon: 'favorite' },
  { href: '/configuracoes',        label: 'Configurações',      icon: 'settings' },
]

const PAGE_BG  = '#EDEFF3'
const SIDEBAR  = '#5b5fcf'
const CORNER   = 20

function getInitial(name: string) {
  return (name || 'U').charAt(0).toUpperCase()
}

interface SidebarProps {
  userName?:    string
  userEmail?:   string
  empresaNome?: string
  collapsed?:   boolean
}

export function Sidebar({
  userName    = 'Usuário',
  userEmail   = '',
  empresaNome = 'CinesioPro',
  collapsed   = false,
}: SidebarProps) {
  const pathname = usePathname()
  const router   = useRouter()
  const supabase = createClient()

  // Tooltip portal — necessário porque o aside tem overflow:hidden
  const [tooltip, setTooltip] = useState<{ label: string; y: number } | null>(null)

  const showTooltip = useCallback((label: string, el: HTMLElement) => {
    const rect = el.getBoundingClientRect()
    setTooltip({ label, y: rect.top + rect.height / 2 })
  }, [])

  const hideTooltip = useCallback(() => setTooltip(null), [])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const W = collapsed ? 72 : 260

  // ── Ícone compartilhado ─────────────────────────────────────────────────────
  function NavIcon({ item, active }: { item: NavItem; active: boolean }) {
    return (
      <span
        className="leading-none flex-shrink-0 flex items-center"
        style={{ width: 22, height: 22 }}
      >
        {item.customIcon ?? (
          <span
            className="material-symbols-outlined"
            style={{
              fontSize: 22,
              fontVariationSettings: active
                ? "'FILL' 1, 'wght' 600"
                : "'FILL' 0, 'wght' 400",
            }}
          >
            {item.icon}
          </span>
        )}
      </span>
    )
  }

  return (
  <>
    <aside
      className="fixed left-4 top-4 bottom-4 z-50 flex flex-col overflow-hidden transition-[width] duration-300 ease-in-out"
      style={{
        width: W,
        borderRadius: 24,
        background: SIDEBAR,
        boxShadow: '0 8px 32px rgba(91,95,207,0.25)',
      }}
    >
      {/* ── Bloco de Perfil ─────────────────────────────────────────────────── */}
      <div
        className="flex flex-col items-center border-b border-white/10 flex-shrink-0 transition-all duration-300 overflow-hidden"
        style={{
          paddingTop:    collapsed ? 8  : 20,
          paddingBottom: collapsed ? 10 : 20,
          paddingLeft:   16,
          paddingRight:  16,
        }}
      >
        {/* Avatar */}
        <div
          className="flex items-center justify-center text-white font-bold select-none transition-all duration-300 flex-shrink-0"
          style={{
            width:        collapsed ? 40 : 80,
            height:       collapsed ? 40 : 80,
            borderRadius: '50%',
            fontSize:     collapsed ? 15 : 24,
            background:   'rgba(255,255,255,0.15)',
            boxShadow:    collapsed
              ? '0 0 0 2px rgba(255,255,255,0.35)'
              : '0 0 0 2px rgba(255,255,255,0.4), 0 0 0 6px rgba(91,95,207,0.6)',
          }}
        >
          {getInitial(userName)}
        </div>

        {/* Nome e email — ocultados quando colapsado */}
        <div
          className="overflow-hidden transition-all duration-300 flex flex-col items-center w-full"
          style={{ maxHeight: collapsed ? 0 : 60, opacity: collapsed ? 0 : 1 }}
        >
          <p
            className="mt-4 text-white font-bold truncate max-w-full text-center"
            style={{ fontSize: 13, letterSpacing: '0.15em', textTransform: 'uppercase' }}
          >
            {userName}
          </p>
          <p className="text-white/70 truncate max-w-full text-center" style={{ fontSize: 12 }}>
            {userEmail}
          </p>
        </div>
      </div>

      {/* ── Navegação ─────────────────────────────────────────────────────────── */}
      <nav className="flex-1 py-2 overflow-y-auto overflow-x-hidden">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')

          // ── Modo EXPANDIDO ──────────────────────────────────────────────────
          if (!collapsed) {
            if (isActive) {
              return (
                <div
                  key={item.href}
                  className="relative"
                  style={{ paddingTop: CORNER, paddingBottom: CORNER }}
                >
                  {/* Canto superior côncavo */}
                  <div
                    className="absolute right-0 pointer-events-none"
                    style={{ top: 0, width: CORNER, height: CORNER, background: PAGE_BG }}
                  >
                    <div className="absolute inset-0" style={{ background: SIDEBAR, borderRadius: `0 0 ${CORNER}px 0` }} />
                  </div>

                  {/* Canto inferior côncavo */}
                  <div
                    className="absolute right-0 pointer-events-none"
                    style={{ bottom: 0, width: CORNER, height: CORNER, background: PAGE_BG }}
                  >
                    <div className="absolute inset-0" style={{ background: SIDEBAR, borderRadius: `0 ${CORNER}px 0 0` }} />
                  </div>

                  <Link
                    href={item.href}
                    className="flex items-center gap-3 select-none"
                    style={{
                      marginLeft: 14,
                      padding: '12px 0 12px 18px',
                      background: PAGE_BG,
                      color: SIDEBAR,
                      fontWeight: 700,
                      fontSize: 15,
                      borderRadius: `${CORNER}px 0 0 ${CORNER}px`,
                    }}
                  >
                    <NavIcon item={item} active />
                    <span className="truncate">{item.label}</span>
                  </Link>
                </div>
              )
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 transition-all select-none"
                style={{
                  marginLeft: 14,
                  marginTop: 2,
                  marginBottom: 2,
                  padding: '12px 0 12px 18px',
                  color: 'rgba(255,255,255,0.85)',
                  fontSize: 15,
                  fontWeight: 500,
                  borderRadius: '9999px 0 0 9999px',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.10)'
                  e.currentTarget.style.color = '#ffffff'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'transparent'
                  e.currentTarget.style.color = 'rgba(255,255,255,0.85)'
                }}
              >
                <NavIcon item={item} active={false} />
                <span className="truncate">{item.label}</span>
              </Link>
            )
          }

          // ── Modo COLAPSADO ──────────────────────────────────────────────────
          return (
            <div key={item.href} className="flex justify-center my-0.5 px-2">
              <Link
                href={item.href}
                className="flex items-center justify-center transition-all select-none"
                style={{
                  width: 48,
                  height: 44,
                  borderRadius: 12,
                  background: isActive ? PAGE_BG : 'transparent',
                  color:      isActive ? SIDEBAR : 'rgba(255,255,255,0.85)',
                }}
                onMouseEnter={e => {
                  showTooltip(item.label, e.currentTarget)
                  if (!isActive) {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.12)'
                    e.currentTarget.style.color = '#ffffff'
                  }
                }}
                onMouseLeave={e => {
                  hideTooltip()
                  if (!isActive) {
                    e.currentTarget.style.background = 'transparent'
                    e.currentTarget.style.color = 'rgba(255,255,255,0.85)'
                  }
                }}
              >
                <NavIcon item={item} active={isActive} />
              </Link>
            </div>
          )
        })}
      </nav>

      {/* ── Sair ─────────────────────────────────────────────────────────────── */}
      <div
        className="border-t border-white/10 flex-shrink-0 transition-all duration-300"
        style={{ padding: collapsed ? '10px 0' : '10px 16px' }}
      >
        {collapsed ? (
          /* Colapsado: só o ícone centralizado — tooltip via portal */
          <div className="flex justify-center">
            <button
              onClick={handleLogout}
              className="flex items-center justify-center transition-all text-white/75 hover:text-white"
              style={{ width: 48, height: 40, borderRadius: 12 }}
              onMouseEnter={e => {
                showTooltip('Sair', e.currentTarget)
                e.currentTarget.style.background = 'rgba(255,255,255,0.10)'
              }}
              onMouseLeave={e => {
                hideTooltip()
                e.currentTarget.style.background = 'transparent'
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>logout</span>
            </button>
          </div>
        ) : (
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 w-full px-4 py-2 rounded-full transition-all text-white/85 hover:text-white hover:bg-white/10"
            style={{ fontSize: 13, fontWeight: 600 }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>logout</span>
            Sair
          </button>
        )}
      </div>

      {/* ── Equipe Ativa — oculta quando colapsado ──────────────────────────── */}
      <div
        className="overflow-hidden transition-all duration-300 flex-shrink-0"
        style={{ maxHeight: collapsed ? 0 : 120, opacity: collapsed ? 0 : 1 }}
      >
        <div className="px-4 pb-5">
          <p
            className="text-white/70 font-bold mb-2"
            style={{ fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase' }}
          >
            Equipe Ativa
          </p>
          <div className="flex items-center">
            {[
              'https://i.pravatar.cc/32?img=1',
              'https://i.pravatar.cc/32?img=2',
              'https://i.pravatar.cc/32?img=3',
            ].map((src, i) => (
              <img
                key={i}
                src={src}
                alt=""
                className="rounded-full object-cover flex-shrink-0"
                style={{
                  width: 32, height: 32,
                  marginLeft: i === 0 ? 0 : -8,
                  boxShadow: `0 0 0 2px ${SIDEBAR}`,
                }}
              />
            ))}
            <div
              className="flex items-center justify-center text-white font-bold flex-shrink-0"
              style={{
                width: 32, height: 32,
                borderRadius: '50%',
                background: '#22c55e',
                marginLeft: -8,
                fontSize: 11,
                boxShadow: `0 0 0 2px ${SIDEBAR}`,
              }}
            >
              +12
            </div>
          </div>
        </div>
      </div>
    </aside>

    {/* ── Tooltip portal ─────────────────────────────────────────────────────── */}
    {collapsed && tooltip && typeof document !== 'undefined' && createPortal(
      <div
        className="pointer-events-none"
        style={{
          position:   'fixed',
          left:       16 + 72 + 10,   // sidebar left(16) + collapsed width(72) + gap(10)
          top:        tooltip.y,
          transform:  'translateY(-50%)',
          zIndex:     9999,
          display:    'flex',
          alignItems: 'center',
          gap:        0,
        }}
      >
        {/* Seta */}
        <div style={{
          width:       0,
          height:      0,
          borderTop:   '5px solid transparent',
          borderBottom:'5px solid transparent',
          borderRight: '6px solid #1E293B',
          flexShrink:  0,
        }} />
        {/* Label */}
        <div style={{
          background:   '#1E293B',
          color:        '#F8FAFC',
          fontSize:     12,
          fontWeight:   600,
          padding:      '5px 10px',
          borderRadius: 8,
          whiteSpace:   'nowrap',
          boxShadow:    '0 4px 14px rgba(0,0,0,0.25)',
          letterSpacing:'0.01em',
        }}>
          {tooltip.label}
        </div>
      </div>,
      document.body,
    )}
  </>
  )
}

