export function PageSkeleton() {
  return (
    <div className="space-y-5 animate-pulse" aria-hidden="true">
      {/* Título */}
      <div className="h-7 w-52 bg-[#E8E8E8] rounded-lg" />

      {/* Toolbar / tabs */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-80 bg-[#E8E8E8] rounded-full" />
        <div className="ml-auto h-10 w-36 bg-[#E8E8E8] rounded-full" />
        <div className="h-10 w-44 bg-[#E8E8E8] rounded-full" />
      </div>

      {/* Bloco principal */}
      <div className="h-[520px] bg-[#E8E8E8] rounded-2xl" />

      {/* Linha de cards menores */}
      <div className="grid grid-cols-3 gap-4">
        <div className="h-24 bg-[#E8E8E8] rounded-2xl" />
        <div className="h-24 bg-[#E8E8E8] rounded-2xl" />
        <div className="h-24 bg-[#E8E8E8] rounded-2xl" />
      </div>
    </div>
  )
}
