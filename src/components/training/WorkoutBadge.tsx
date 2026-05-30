// Shared workout template shape badge
// shapeIdx % 3: 0 = circle · 1 = triangle · 2 = square
// Colors mirror the diary picker (also stored in localStorage for the calendar)
const BASE_COLOR = '#5b9ec9'
export const SCHEDA_COLORS = [BASE_COLOR, BASE_COLOR, BASE_COLOR, BASE_COLOR, BASE_COLOR, BASE_COLOR]

export function WorkoutBadge({ color, shapeIdx, size = 36 }: {
  color: string; shapeIdx: number; size?: number
}) {
  const s = shapeIdx % 3
  if (s === 1) {
    return (
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%' }}>
          <polygon points="18,3 34,33 2,33" fill={color} />
        </svg>
      </div>
    )
  }
  return (
    <div className="shrink-0"
      style={{ width: size, height: size, backgroundColor: color, borderRadius: s === 0 ? '50%' : 4 }} />
  )
}
