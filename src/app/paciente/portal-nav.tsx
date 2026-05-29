'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Calendar, FileText, Dumbbell, User } from 'lucide-react'

const itens = [
  { href: '/paciente/home',       icon: Home,     label: 'Início'      },
  { href: '/paciente/agendar',    icon: Calendar, label: 'Agendar'     },
  { href: '/paciente/documentos', icon: FileText, label: 'Documentos'  },
  { href: '/paciente/exercicios', icon: Dumbbell, label: 'Exercícios', fase: 4 },
  { href: '/paciente/perfil',     icon: User,     label: 'Perfil'      },
]

export default function PortalNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-[#E8E8E8] safe-area-pb">
      <div className="max-w-lg mx-auto flex items-center justify-around h-16 px-2">
        {itens.map(({ href, icon: Icon, label, fase }) => {
          const ativo = pathname.startsWith(href)
          const desabilitado = !!fase

          if (desabilitado) {
            return (
              <span
                key={href}
                className="flex flex-col items-center gap-1 px-4 opacity-35 cursor-not-allowed select-none"
                title={`Disponível na Fase ${fase}`}
              >
                <Icon size={22} />
                <span className="text-[10px] font-medium">{label}</span>
              </span>
            )
          }

          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-1 px-4 transition-colors ${
                ativo
                  ? 'text-[#4A3AE8]'
                  : 'text-[#7F8C8D] hover:text-[#4A3AE8]'
              }`}
            >
              <Icon size={22} strokeWidth={ativo ? 2.5 : 1.8} />
              <span className={`text-[10px] font-medium ${ativo ? 'font-bold' : ''}`}>
                {label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
