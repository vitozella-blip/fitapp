import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Today's date as YYYY-MM-DD in the browser's local timezone (not UTC). */
export function localToday(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Shift an ISO date string by `days` using local calendar arithmetic. */
export function shiftDate(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  const next = new Date(y, m - 1, d + days)
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-${String(next.getDate()).padStart(2, '0')}`
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

export type SetTarget = { min: number; max: number; failure?: boolean; label?: string }

/** Parse a reps string like "1x5/7 + 1x8/10 + RP" into individual set targets and modifiers. */
export function parseRepsTargets(reps: string | null): { sets: SetTarget[]; mods: string[] } {
  if (!reps) return { sets: [], mods: [] }
  // Handle dash-separated format like "7-6-6-4" or "6-x-x" (numbers/x separated by dashes)
  if (/^[\dx](-[\dx])+$/i.test(reps.trim())) {
    const parts = reps.trim().split('-')
    return {
      sets: parts.map(p => /^x$/i.test(p.trim()) ? { min: 0, max: 0, failure: true } : { min: Number(p), max: Number(p) }),
      mods: [],
    }
  }
  const tokens = reps.split(/\s*\+\s*/)
  const isAlone = tokens.length === 1
  const sets: SetTarget[] = []
  const mods: string[] = []
  for (const tok of tokens) {
    const t = tok.trim()
    if (!t) continue

    // NxM[/R], NxX, NxTEXT — e.g. "3x8", "2x6/8", "1xX", "1xMAX", "1xPB"
    const structured = t.match(/^(\d+)x(\d+|[a-zA-Z]+)(?:\/(\d+))?$/i)
    if (structured) {
      const count = parseInt(structured[1])
      const repStr = structured[2]
      if (/^\d+$/.test(repStr)) {
        const minR = parseInt(repStr)
        const maxR = structured[3] ? parseInt(structured[3]) : minR
        for (let i = 0; i < count; i++) sets.push({ min: minR, max: maxR })
      } else {
        const isX = /^x$/i.test(repStr)
        const label = isX ? undefined : repStr.toUpperCase()
        for (let i = 0; i < count; i++) sets.push({ min: 0, max: 0, failure: true, ...(label && { label }) })
      }
      continue
    }

    // "1x" alone — 1 failure set
    const failureOnly = t.match(/^(\d+)x$/i)
    if (failureOnly) {
      const count = parseInt(failureOnly[1])
      for (let i = 0; i < count; i++) sets.push({ min: 0, max: 0, failure: true })
      continue
    }

    // Plain number or range: "8", "6/10"
    const plain = t.match(/^(\d+)(?:\/(\d+))?$/)
    if (plain) {
      const minR = parseInt(plain[1])
      const maxR = plain[2] ? parseInt(plain[2]) : minR
      sets.push({ min: minR, max: maxR })
      continue
    }

    // NRM notation: "10RM", "8RM"
    const rm = t.match(/^(\d+)RM$/i)
    if (rm) {
      sets.push({ min: parseInt(rm[1]), max: parseInt(rm[1]), label: rm[1] + 'RM' })
      continue
    }

    // N-M range with optional trailing ellipsis: "3-4…", "3-4..."
    const dashRange = t.match(/^(\d+)-(\d+)[…\.]*$/)
    if (dashRange) {
      sets.push({ min: parseInt(dashRange[1]), max: parseInt(dashRange[2]) })
      continue
    }

    // Pure text labels (Max, WTD): standalone → rep target per set; inside compound → technique mod
    if (/^[a-zA-Z]+$/.test(t)) {
      if (isAlone) sets.push({ min: 0, max: 0, failure: true, label: t })
      else mods.push(t)
      continue
    }

    mods.push(t)
  }
  return { sets, mods }
}
