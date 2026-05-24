import { cn } from '@/lib/utils'
import { InputHTMLAttributes, forwardRef } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label className="text-sm font-medium text-[#2C3E50]">{label}</label>
        )}
        <input
          ref={ref}
          className={cn(
            'h-10 w-full rounded-lg border border-[#E8E8E8] bg-white px-3 py-2 text-sm text-[#2C3E50] placeholder:text-[#7F8C8D] outline-none transition-colors',
            'focus:border-[#4A3AE8] focus:ring-2 focus:ring-[#4A3AE8]/20',
            error && 'border-red-400 focus:border-red-400 focus:ring-red-400/20',
            className
          )}
          {...props}
        />
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>
    )
  }
)

Input.displayName = 'Input'
