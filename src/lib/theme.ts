// ════════════════════════════════════════════════════════════════════════
// DESIGN TOKENS — punto unico per colori e stili dell'app
// Modifica qui per cambiare i colori in TUTTA l'app.
// ════════════════════════════════════════════════════════════════════════

// ── Colori MACRO (fissi e coerenti in ogni sezione) ─────────────────────────
export const MACRO = {
  kcal:    '#6abf6a',   // Calorie  — verde
  fat:     '#5b9bd5',   // Grassi   — azzurro
  carbs:   '#e0a06a',   // Carboidrati — arancione tenue
  protein: '#9d8fcc',   // Proteine — viola
  over:    '#f87171',   // sopra il target — rosso
} as const

export const MACRO_META = [
  { key: 'fat'     as const, label: 'Grassi',      short: 'G' },
  { key: 'carbs'   as const, label: 'Carboidrati', short: 'C' },
  { key: 'protein' as const, label: 'Proteine',    short: 'P' },
]

// ── Colori SEZIONE (colore guida di ciascuna area) ──────────────────────────
export const SECTION = {
  food:      '#e8924a',   // Alimentazione — arancione
  training:  '#5b9ec9',   // Allenamento  — azzurro
  primary:   '#5b9ec9',   // Dashboard / generico
} as const

// ── Colori ATTIVITÀ ─────────────────────────────────────────────────────────
export const ACTIVITY = {
  gym:    SECTION.training,  // palestra — azzurro
  tennis: '#6aaa6a',         // tennis  — verde
} as const

// ── Schede: colori distinti + sigla ─────────────────────────────────────────
// Ogni scheda (per ordine) ha un colore distinto; la sigla deriva dal nome.
export const SCHEDA_PALETTE = ['#5b9ec9', '#9d8fcc', '#5fb3a3', '#e0a06a', '#c98aa8', '#7aa0d0']

export function schedaColorByOrder(order: number): string {
  // order è 1-based; fallback robusto
  const i = (Math.max(1, order) - 1) % SCHEDA_PALETTE.length
  return SCHEDA_PALETTE[i]
}

// "WORKOUT 1 — CHEST + BACK" → "CB" · "LEGS" → "L" · "SHOULDERS + MIX" → "SM"
export function schedaAbbrev(name: string): string {
  if (!name) return '?'
  const cleaned = name.replace(/^(workout|wo|scheda)\s*\d*\s*[—–\-:]*\s*/i, '')
  const letters = cleaned
    .split(/[\s+&,/]+/)
    .filter(w => /[a-zA-Zàèéìòù]/.test(w))
    .map(w => w[0].toUpperCase())
    .join('')
  return (letters || cleaned.slice(0, 2) || name.slice(0, 2)).slice(0, 3).toUpperCase()
}

// ── Helper opacità (es. accentBg(SECTION.food, 0.12)) ──────────────────────
export function alpha(hex: string, a: number): string {
  const v = Math.round(Math.min(1, Math.max(0, a)) * 255).toString(16).padStart(2, '0')
  return hex + v
}
