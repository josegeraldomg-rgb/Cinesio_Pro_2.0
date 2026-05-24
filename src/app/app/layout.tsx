// Layout público (sem sidebar/header da clínica) usado por páginas
// que pacientes acessam sem login — ex: /app/completar/[token]
export default function PublicAppLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
