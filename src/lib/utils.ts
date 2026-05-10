import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })
}

export function formatShortDate(date: Date): string {
  return date.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })
}

export function calcCalories(p: number, c: number, f: number): number {
  return Math.round(p * 4 + c * 4 + f * 9)
}

export function calcMacroPercent(value: number, target: number): number {
  if (target === 0) return 0
  return Math.min(100, Math.round((value / target) * 100))
}
