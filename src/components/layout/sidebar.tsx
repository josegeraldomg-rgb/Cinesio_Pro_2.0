'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const navItems = [
  { href: '/dashboard',      label: 'Painel',             icon: 'dashboard' },
  { href: '/agenda',         label: 'Agenda',              icon: 'calendar_month' },
  { href: '/horarios',       label: 'Horários',            icon: 'schedule' },
  { href: '/pacientes',      label: 'Pacientes',           icon: 'groups' },
  { href: '/turmas',         label: 'Turmas',              icon: 'sports_gymnastics' },
  { href: '/servicos',       label: 'Serviços',            icon: 'medical_services' },
  { href: '/financeiro',     label: 'Financeiro',          icon: 'payments' },
  { href: '/relatorios',     label: 'Relatórios',          icon: 'description' },
  { href: '/whatsapp',       label: 'WhatsApp',            icon: 'chat' },
  { href: '/portal',         label: 'Portal do Paciente',  icon: 'favorite' },
  { href: '/usuarios',       label: 'Usuários e Perfis',   icon: 'manage_accounts' },
  { href: '/configuracoes',  label: 'Configurações',       icon: 'settings' },
]

// Cor do fundo do item ativo — deve ser idêntica ao fundo da página
// (definido em globals.css como --color-surface) para o efeito de "continuidade".
const PAGE_BG = '#EDEFF3'
const SIDEBAR  = '#5b5fcf'
const CORNER   = 20

function getInitial(name: string) {
  return (name || 'U').charAt(0).toUpperCase()
}

interface SidebarProps {
  userName?:    string
  userEmail?:   string
  empresaNome?: string
}

export function Sidebar({ userName = 'Usuário', userEmail = '', empresaNome = 'CinesioPro' }: SidebarProps) {
  const pathname = usePathname()
  const router   = useRouter()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <aside
      className="fixed left-4 top-4 bottom-4 z-50 flex flex-col overflow-hidden"
      style={{ width: 260, borderRadius: 24, background: SIDEBAR, boxShadow: '0 8px 32px rgba(91,95,207,0.25)' }}
    >
      {/* ── Bloco de Perfil ── */}
      <div className="flex flex-col items-center pt-7 pb-5 border-b border-white/10 px-4 flex-shrink-0">
        <div
          className="flex items-center justify-center text-white font-bold text-2xl select-none"
          style={{
            width: 80, height: 80,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.15)',
            boxShadow: '0 0 0 2px rgba(255,255,255,0.4), 0 0 0 6px rgba(91,95,207,0.6)',
          }}
        >
          {getInitial(userName)}
        </div>
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

      {/* ── Navegação ── */}
      {/*
        overflow-x: hidden aqui é importante: impede que os cantos côncavos
        (que ficam exatamente na borda direita do aside) causem scroll horizontal.
        overflow-y: auto para rolar quando houver muitos itens.
      */}
      <nav className="flex-1 py-2 overflow-y-auto overflow-x-hidden">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')

          if (isActive) {
            return (
              /*
                O wrapper tem paddingTop e paddingBottom iguais a CORNER.
                Isso "reserva" espaço para os cantos côncavos dentro dos limites
                do próprio div, evitando que o overflow-y:auto do <nav> os corte.
              */
              <div
                key={item.href}
                className="relative"
                style={{ paddingTop: CORNER, paddingBottom: CORNER }}
              >
                {/*
                  Canto superior côncavo
                  Técnica: outer = PAGE_BG (fundo da página), inner = SIDEBAR.
                  O inner SIDEBAR tem o canto inferior-direito arredondado,
                  deixando PAGE_BG aparecer nesse canto → cria a curva côncava
                  entre o sidebar e o pill ativo.
                */}
                <div
                  className="absolute right-0 pointer-events-none"
                  style={{ top: 0, width: CORNER, height: CORNER, background: PAGE_BG }}
                >
                  <div
                    className="absolute inset-0"
                    style={{ background: SIDEBAR, borderRadius: `0 0 ${CORNER}px 0` }}
                  />
                </div>

                {/* Canto inferior côncavo */}
                <div
                  className="absolute right-0 pointer-events-none"
                  style={{ bottom: 0, width: CORNER, height: CORNER, background: PAGE_BG }}
                >
                  <div
                    className="absolute inset-0"
                    style={{ background: SIDEBAR, borderRadius: `0 ${CORNER}px 0 0` }}
                  />
                </div>

                {/* Link ativo */}
                <Link
                  href={item.href}
                  className="flex items-center gap-3 select-none"
                  style={{
                    marginLeft: 14,
                    marginRight: 0,
                    padding: '12px 0 12px 18px',
                    background: PAGE_BG,
                    color: SIDEBAR,
                    fontWeight: 700,
                    fontSize: 15,
                    borderRadius: `${CORNER}px 0 0 ${CORNER}px`,
                  }}
                >
                  <span
                    className="material-symbols-outlined leading-none flex-shrink-0"
                    style={{ fontSize: 22, fontVariationSettings: "'FILL' 1, 'wght' 600" }}
                  >
                    {item.icon}
                  </span>
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
                marginRight: 0,
                marginTop: 2,
                marginBottom: 2,
                padding: '12px 0 12px 18px',
                color: 'rgba(255,255,255,0.85)',
                fontSize: 15,
                fontWeight: 500,
                borderRadius: '9999px 0 0 9999px',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.10)'
                e.currentTarget.style.color = '#ffffff'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.color = 'rgba(255,255,255,0.85)'
              }}
            >
              <span
                className="material-symbols-outlined leading-none flex-shrink-0"
                style={{ fontSize: 22, fontVariationSettings: "'FILL' 0, 'wght' 400" }}
              >
                {item.icon}
              </span>
              <span className="truncate">{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* ── Sair ── */}
      <div className="px-4 pb-3 border-t border-white/10 pt-3 flex-shrink-0">
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 w-full px-4 py-2 rounded-full transition-all text-white/85 hover:text-white hover:bg-white/10"
          style={{ fontSize: 13, fontWeight: 600 }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>logout</span>
          Sair
        </button>
      </div>

      {/* ── Equipe Ativa ── */}
      <div className="px-4 pb-5 flex-shrink-0">
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
    </aside>
  )
}
