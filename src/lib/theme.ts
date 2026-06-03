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

// ── Helper opacità (es. accentBg(SECTION.food, 0.12)) ──────────────────────
export function alpha(hex: string, a: number): string {
  const v = Math.round(Math.min(1, Math.max(0, a)) * 255).toString(16).padStart(2, '0')
  return hex + v
}
