import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

export function formatDate(date: string | Date) {
  return new Intl.DateTimeFormat('pt-BR').format(new Date(date))
}

export function formatDateTime(date: string | Date) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

export function getInitials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
}

export const STATUS_LABELS: Record<string, string> = {
  agendado: 'Agendado',
  confirmado: 'Confirmado',
  em_atendimento: 'Em Atendimento',
  realizado: 'Realizado',
  cancelado: 'Cancelado',
  faltou: 'Faltou',
}

export const STATUS_COLORS: Record<string, string> = {
  agendado: 'bg-gray-100 text-gray-700',
  confirmado: 'bg-green-100 text-green-700',
  em_atendimento: 'bg-blue-100 text-blue-700',
  realizado: 'bg-purple-100 text-purple-700',
  cancelado: 'bg-red-100 text-red-700',
  faltou: 'bg-orange-100 text-orange-700',
}
