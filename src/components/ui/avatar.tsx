import { cn, getInitials } from '@/lib/utils'

interface AvatarProps {
  name: string
  src?: string | null
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

const sizeClasses = {
  sm: 'w-7 h-7 text-xs',
  md: 'w-9 h-9 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-16 h-16 text-xl',
}

const colors = [
  'bg-[#4A3AE8]',
  'bg-[#27AE60]',
  'bg-[#3498DB]',
  'bg-[#E67E22]',
  'bg-[#8E44AD]',
  'bg-[#E74C3C]',
]

function getColor(name: string) {
  const idx = name.charCodeAt(0) % colors.length
  return colors[idx]
}

export function Avatar({ name, src, size = 'md', className }: AvatarProps) {
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={cn('rounded-full object-cover', sizeClasses[size], className)}
      />
    )
  }
  return (
    <div className={cn(
      'rounded-full flex items-center justify-center font-semibold text-white flex-shrink-0',
      sizeClasses[size],
      getColor(name),
      className
    )}>
      {getInitials(name)}
    </div>
  )
}
