import { Coffee, Cookie, Drumstick, Banana, Fish } from 'lucide-react'
import type { ReactElement } from 'react'

// ── Pallina da tennis in stile lucide (stroke, no fill) ─────────────────────
export function TennisBall({ size = 24, color = 'currentColor', strokeWidth = 2 }: {
  size?: number; color?: string; strokeWidth?: number
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <path d="M5 5 C 9 9, 9 15, 5 19" />
      <path d="M19 5 C 15 9, 15 15, 19 19" />
    </svg>
  )
}

// ── Icone pasti coerenti (linea) — niente emoji ─────────────────────────────
export const MEAL_ICON: Record<string, React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>> = {
  'Colazione':           Coffee,
  'Spuntino mattina':    Cookie,
  'Pranzo':              Drumstick,
  'Spuntino pomeriggio': Banana,
  'Cena':                Fish,
}

export function MealIcon({ name, size = 20, color, strokeWidth = 1.7 }: {
  name: string; size?: number; color?: string; strokeWidth?: number
}): ReactElement {
  const Icon = MEAL_ICON[name] ?? Coffee
  return <Icon size={size} color={color} strokeWidth={strokeWidth} />
}
