'use client'

const C = {
  kcal:    '#6abf6a',
  protein: '#9d8fcc',
  carbs:   '#f0aa78',
  fat:     '#5b9bd5',
} as const

type MacroProps = { label: string; current: number; target: number; color: string; unit?: string }

function MacroItem({ label, current, target, color, unit = 'g' }: MacroProps) {
  const pct = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex justify-between text-xs">
        <span className="text-gray-400 font-medium">{label}</span>
        <span className="text-gray-900 dark:text-gray-100 font-semibold">
          {current}<span className="text-gray-400 font-normal">/{target}{unit}</span>
        </span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: color + '22' }}>
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  )
}

type Props = { calories: { current: number; target: number }; protein: { current: number; target: number }; carbs: { current: number; target: number }; fat: { current: number; target: number } }

export function MacroBar({ calories, protein, carbs, fat }: Props) {
  const pct = calories.target > 0 ? Math.min(100, Math.round((calories.current / calories.target) * 100)) : 0
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-4 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">Calorie oggi</span>
        <span className="text-xs font-bold px-2 py-0.5 rounded-lg text-white"
          style={{ backgroundColor: C.kcal + 'bb' }}>
          {pct}%
        </span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-3xl font-bold" style={{ color: C.kcal }}>{calories.current}</span>
        <span className="text-sm text-gray-400">/ {calories.target} kcal</span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: C.kcal + '22' }}>
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: C.kcal }} />
      </div>
      <div className="grid grid-cols-3 gap-3 pt-1">
        <MacroItem label="Proteine"    current={protein.current} target={protein.target} color={C.protein} />
        <MacroItem label="Carboidrati" current={carbs.current}   target={carbs.target}   color={C.carbs} />
        <MacroItem label="Grassi"      current={fat.current}     target={fat.target}     color={C.fat} />
      </div>
    </div>
  )
}
