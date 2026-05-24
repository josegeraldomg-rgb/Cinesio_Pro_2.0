import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'CinesioPro — Gestão de Clínicas',
  description: 'Sistema SaaS para Fisioterapia e Pilates — COFFITO 424/2013',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className="h-full">
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=block"
        />
      </head>
      <body className="min-h-full antialiased">{children}</body>
    </html>
  )
}
