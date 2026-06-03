// Shared workout template shape badge
// shapeIdx % 3: 0 = circle · 1 = hexagon · 2 = diamond
// Colors mirror the diary picker (also stored in localStorage for the calendar)
const BASE_COLOR = '#5b9ec9'
export const SCHEDA_COLORS = [BASE_COLOR, BASE_COLOR, BASE_COLOR, BASE_COLOR, BASE_COLOR, BASE_COLOR]

// Hexagon (pointy-top) inscribed in 36×36 viewBox (center 18,18 r=14)
const HEXAGON = '18,4 30,11 30,25 18,32 6,25 6,11'
// Diamond inscribed in 36×36 viewBox
const DIAMOND = '18,2 34,18 18,34 2,18'

export function WorkoutBadge({ color, shapeIdx, size = 36 }: {
  color: string; shapeIdx: number; size?: number
}) {
  const s = shapeIdx % 3
  if (s === 0) {
    return <div className="shrink-0" style={{ width: size, height: size, backgroundColor: color, borderRadius: '50%' }} />
  }
  const points = s === 1 ? HEXAGON : DIAMOND
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%' }}>
        <polygon points={points} fill={color} />
      </svg>
    </div>
  )
}
