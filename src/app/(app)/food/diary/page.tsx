'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { Plus, BookOpen, Copy, Pencil, Trash2 } from 'lucide-react'
import { MealIcon } from '@/components/shared/icons'
import { useAppStore } from '@/store/useAppStore'
import { PageHeader } from '@/components/shared/PageHeader'
import { DateNav } from '@/components/shared/DateNav'
import { AddFoodModal } from '@/components/food/AddFoodModal'
import { cn, localToday, shiftDate } from '@/lib/utils'
import { useRefreshOnFocus } from '@/hooks/useRefreshOnFocus'
import { useDateSwipe } from '@/hooks/useDateSwipe'
import { useNutritionTargets } from '@/hooks/useNutritionTargets'

const C = {
  kcal:    '#6abf6a',
  protein: '#9d8fcc',
  carbs:   '#f0aa78',
  fat:     '#5b9bd5',
} as const

const MEALS = ['Colazione', 'Spuntino mattina', 'Pranzo', 'Spuntino pomeriggio', 'Cena']

type Entry = {
  id: string; meal: string; quantity: number
  food: { name: string; calories: number; protein: number; carbs: number; fat: number }
}

const calc = (v: number, q: number) => Math.round((v * q) / 100)

// ── Swipeable row ──────────────────────────────────────────────────────────────
const SNAP   = 72   // px revealed when snapped open
const THRESH = 36   // px to decide snap vs reset

interface SwipeableRowProps {
  children: React.ReactNode
  onDelete: () => void
  onEdit:   () => void
}
function SwipeableRow({ children, onDelete, onEdit }: SwipeableRowProps) {
  const rowRef    = useRef<HTMLDivElement>(null)
  const startX    = useRef(0)
  const startY    = useRef(0)
  const currentX  = useRef(0)
  const snapped   = useRef<'left' | 'right' | null>(null)
  const dirLocked = useRef<'h' | 'v' | null>(null)

  function setTranslate(x: number) {
    currentX.current = x
    if (rowRef.current) rowRef.current.style.transform = `translateX(${x}px)`
  }

  function snapTo(dir: 'left' | 'right' | null) {
    snapped.current = dir
    const x = dir === 'left' ? -SNAP : dir === 'right' ? SNAP : 0
    if (rowRef.current) {
      rowRef.current.style.transition = 'transform 0.2s ease'
      rowRef.current.style.transform  = `translateX(${x}px)`
      setTimeout(() => { if (rowRef.current) rowRef.current.style.transition = '' }, 210)
    }
    currentX.current = x
  }

  function handleTouchStart(e: React.TouchEvent) {
    startX.current = e.touches[0].clientX
    startY.current = e.touches[0].clientY
    dirLocked.current = null
    if (rowRef.current) rowRef.current.style.transition = ''
  }

  function handleTouchMove(e: React.TouchEvent) {
    const dx = e.touches[0].clientX - startX.current
    const dy = Math.abs(e.touches[0].clientY - startY.current)
    if (dirLocked.current === null) {
      if (Math.abs(dx) < 5 && dy < 5) return
      dirLocked.current = Math.abs(dx) >= dy * 3 ? 'h' : 'v'
    }
    if (dirLocked.current !== 'h') return
    const base = snapped.current === 'left' ? -SNAP : snapped.current === 'right' ? SNAP : 0
    setTranslate(Math.max(-SNAP, Math.min(SNAP, base + dx)))
  }

  function handleTouchEnd() {
    const x = currentX.current
    if      (x < -THRESH) snapTo('left')
    else if (x >  THRESH) snapTo('right')
    else                   snapTo(null)
  }

  function handleDeleteClick() {
    snapTo(null)
    onDelete()
  }

  function handleEditClick() {
    snapTo(null)
    onEdit()
  }

  // Tap on content when snapped → close
  function handleContentClick() {
    if (snapped.current) snapTo(null)
  }

  return (
    <div className="relative overflow-hidden">
      {/* Left action: Modifica (revealed by swipe right) */}
      <div className="absolute inset-y-0 left-0 flex items-center justify-center"
        style={{ width: SNAP, backgroundColor: C.carbs }}
        onClick={handleEditClick}>
        <Pencil size={18} className="text-white" />
      </div>

      {/* Right action: Elimina (revealed by swipe left) */}
      <div className="absolute inset-y-0 right-0 flex items-center justify-center"
        style={{ width: SNAP, backgroundColor: '#ef4444' }}
        onClick={handleDeleteClick}>
        <Trash2 size={18} className="text-white" />
      </div>

      {/* Content */}
      <div
        ref={rowRef}
        className="relative bg-white dark:bg-gray-900 z-10 touch-pan-y"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={handleContentClick}
      >
        {children}
      </div>
    </div>
  )
}

// ── Edit quantity modal ────────────────────────────────────────────────────────
interface EditModalProps {
  entry:    Entry
  onClose:  () => void
  onSaved:  (newQty: number) => void
}
function EditQuantityModal({ entry, onClose, onSaved }: EditModalProps) {
  const [qty, setQty] = useState(String(entry.quantity))
  const [saving, setSaving] = useState(false)

  async function save() {
    const n = parseInt(qty)
    if (!n || n <= 0) return
    setSaving(true)
    await fetch(`/api/diary/${entry.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quantity: n }),
    })
    onSaved(n)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center pb-6 px-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-sm p-5 shadow-xl">
        <p className="font-bold text-gray-800 dark:text-gray-100 mb-1">{entry.food.name}</p>
        <p className="text-xs text-gray-400 mb-4">Modifica quantità</p>
        <div className="flex items-center gap-3">
          <input
            type="number" min={1} value={qty}
            onChange={e => setQty(e.target.value)}
            onFocus={e => e.target.select()}
            className="flex-1 py-2.5 px-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-lg font-bold text-center text-gray-900 dark:text-gray-100 outline-none focus:border-orange-300"
            autoFocus
          />
          <span className="text-sm text-gray-400 shrink-0">g</span>
        </div>
        <div className="flex gap-2 mt-4">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-500">
            Annulla
          </button>
          <button onClick={save} disabled={saving}
            className="flex-1 py-2.5 rounded-xl text-white text-sm font-semibold"
            style={{ backgroundColor: C.carbs }}>
            {saving ? '…' : 'Salva'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function FoodDiaryPage() {
  const userId      = useAppStore(s => s.userId)
  const userProfile = useAppStore(s => s.userProfile)
  const [selectedDate, setSelectedDate] = useState(localToday)
  const dateTargets = useNutritionTargets(selectedDate)
  const [entries, setEntries] = useState<Entry[]>([])
  const [modal, setModal] = useState<string | null>(null)
  const [editEntry, setEditEntry] = useState<Entry | null>(null)
  const [freeMeals, setFreeMeals] = useState<Set<string>>(new Set())
  const abortRef = useRef<AbortController | null>(null)
  const [expandedMeal, setExpandedMeal] = useState<string | null>(null)
  useEffect(() => { setExpandedMeal(null) }, [selectedDate])

  const fetchEntries = useCallback(async () => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    try {
      const [diary, freeList] = await Promise.all([
        fetch(`/api/diary?userId=${userId}&date=${selectedDate}`, { signal: controller.signal }).then(r => r.json()),
        fetch(`/api/freemeals?userId=${userId}&date=${selectedDate}`, { signal: controller.signal }).then(r => r.json()).catch((e: unknown) => {
          if ((e as { name?: string })?.name === 'AbortError') throw e
          return []
        }),
      ])
      setEntries(diary)
      setFreeMeals(new Set(Array.isArray(freeList) ? freeList : []))
    } catch (e) {
      if ((e as { name?: string })?.name !== 'AbortError') throw e
    }
  }, [userId, selectedDate])

  useEffect(() => { fetchEntries() }, [fetchEntries])
  useRefreshOnFocus(fetchEntries)

  useEffect(() => {
    fetch('/api/user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, name: userProfile.name }),
    })
  }, [userId, userProfile.name])

  async function deleteEntry(id: string) {
    await fetch(`/api/diary/${id}`, { method: 'DELETE' })
    setEntries(e => e.filter(x => x.id !== id))
  }

  function handleEditSaved(id: string, newQty: number) {
    setEntries(es => es.map(e => e.id === id ? { ...e, quantity: newQty } : e))
    setEditEntry(null)
  }

  async function copyFromYesterday(meal: string) {
    const yesterday = shiftDate(selectedDate, -1)
    try {
      const r = await fetch('/api/diary/copy-from-date', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, fromDate: yesterday, meal, toDate: selectedDate }),
      })
      const data = await r.json()
      if ((data.copied ?? 0) > 0) fetchEntries()
    } catch { /* ignore */ }
  }

  function toggleFreeMeal(meal: string) {
    setFreeMeals(prev => {
      const next = new Set(prev)
      next.has(meal) ? next.delete(meal) : next.add(meal)
      return next
    })
    fetch('/api/freemeals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, date: selectedDate, meal }),
    }).catch(() => {})
  }

  const activeMealEntries = entries.filter(e => !freeMeals.has(e.meal))
  const totals = activeMealEntries.reduce((acc, e) => ({
    calories: acc.calories + calc(e.food.calories, e.quantity),
    protein:  acc.protein  + calc(e.food.protein,  e.quantity),
    carbs:    acc.carbs    + calc(e.food.carbs,    e.quantity),
    fat:      acc.fat      + calc(e.food.fat,      e.quantity),
  }), { calories: 0, protein: 0, carbs: 0, fat: 0 })

  const calPct  = dateTargets.targetCalories > 0
    ? Math.min(100, Math.round((totals.calories / dateTargets.targetCalories) * 100))
    : 0
  const calOver = totals.calories > dateTargets.targetCalories
  const pct = (v: number, mx: number) => mx > 0 ? Math.min(100, Math.round((v / mx) * 100)) : 0
  const left = {
    calories: Math.max(0, dateTargets.targetCalories - totals.calories),
    fat:      Math.max(0, dateTargets.targetFat      - totals.fat),
    carbs:    Math.max(0, dateTargets.targetCarbs    - totals.carbs),
    protein:  Math.max(0, dateTargets.targetProtein  - totals.protein),
  }

  const swipe = useDateSwipe(selectedDate, setSelectedDate)

  return (
    <div className="flex flex-col gap-3 max-w-2xl mx-auto md:max-w-none md:h-full">
      <div className="shrink-0">
        <PageHeader title="Diario Alimentare" icon={BookOpen} accent="food" />
      </div>

      <div className="shrink-0">
        <DateNav selectedDate={selectedDate} onChange={setSelectedDate} accent={C.carbs} showWorkoutColors={false} />
      </div>

      {/* Macro — identica alla dashboard */}
      <div className="shrink-0 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden"
        style={{ borderTopColor: C.carbs, borderTopWidth: 3 }} {...swipe}>

        {/* Header */}
        <div className="px-4 py-2 shrink-0 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between"
          style={{ backgroundColor: C.carbs + '14' }}>
          <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: C.carbs }}>Macro</p>
          <div className="flex items-center gap-2.5 flex-wrap justify-end">
            {[['Calorie', C.kcal], ['Grassi', C.fat], ['Carboidrati', C.carbs], ['Proteine', C.protein]].map(([lbl, col]) => (
              <span key={lbl} className="flex items-center gap-1">
                <span style={{ width: 7, height: 7, borderRadius: 9999, backgroundColor: col, display: 'inline-block' }} />
                <span className="text-[10px] text-gray-400">{lbl}</span>
              </span>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2.5 px-4 py-3">

          {/* Kcal */}
          <div className="flex items-baseline justify-between">
            <div className="flex items-center gap-2">
              <span style={{ width: 9, height: 9, borderRadius: 9999, backgroundColor: calOver ? '#f87171' : C.kcal, display: 'inline-block' }} />
              <span className="text-3xl font-extrabold leading-none tracking-tight" style={{ color: calOver ? '#f87171' : C.kcal }}>{totals.calories}</span>
              <span className="text-xs text-gray-400 font-medium">/ {dateTargets.targetCalories} kcal</span>
              {freeMeals.size > 0 && <span className="text-[10px] font-medium" style={{ color: C.carbs }}>({freeMeals.size} libero)</span>}
            </div>
            <span className="text-lg font-extrabold" style={{ color: calOver ? '#f87171' : C.kcal }}>
              {calOver ? `+${totals.calories - dateTargets.targetCalories}` : `${calPct}%`}
            </span>
          </div>

          {/* Barra calorie */}
          <div className="h-1.5 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-800">
            <div className="h-full rounded-full transition-all duration-500"
              style={{ width: `${calPct}%`, backgroundColor: calOver ? '#f87171' : C.kcal }} />
          </div>

          {/* 3 Macro */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { val: totals.fat,     tgt: dateTargets.targetFat,     color: C.fat },
              { val: totals.carbs,   tgt: dateTargets.targetCarbs,   color: C.carbs },
              { val: totals.protein, tgt: dateTargets.targetProtein, color: C.protein },
            ].map((m, i) => (
              <div key={i}>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <span style={{ width: 7, height: 7, borderRadius: 9999, backgroundColor: m.color, display: 'inline-block' }} />
                  <span className="text-xs font-semibold text-gray-900 dark:text-gray-100">{m.val}<span className="text-gray-400 font-medium">/{m.tgt} g</span></span>
                </div>
                <div className="rounded-full overflow-hidden bg-gray-100 dark:bg-gray-800" style={{ height: 6 }}>
                  <div className="h-full rounded-full transition-all" style={{ width: `${pct(m.val, m.tgt)}%`, backgroundColor: m.color }} />
                </div>
              </div>
            ))}
          </div>

          {/* Ti restano */}
          <div className="flex items-center justify-between rounded-xl px-3 py-2" style={{ backgroundColor: C.kcal + '1f' }}>
            <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">Ti restano</span>
            <span className="flex items-baseline gap-1.5">
              <span className="text-sm font-extrabold" style={{ color: C.kcal }}>{left.calories}<span className="text-[10px] font-medium text-gray-400"> kcal</span></span>
              <span className="text-gray-300 dark:text-gray-600">·</span>
              <span className="text-[13px] font-medium" style={{ color: C.fat }}>{left.fat}<span className="text-[9px] text-gray-400">g</span></span>
              <span className="text-gray-300 dark:text-gray-600">/</span>
              <span className="text-[13px] font-medium" style={{ color: C.carbs }}>{left.carbs}<span className="text-[9px] text-gray-400">g</span></span>
              <span className="text-gray-300 dark:text-gray-600">/</span>
              <span className="text-[13px] font-medium" style={{ color: C.protein }}>{left.protein}<span className="text-[9px] text-gray-400">g</span></span>
            </span>
          </div>

        </div>
      </div>

      {/* Pasti */}
      <div className="flex flex-col gap-2.5 md:grid md:grid-cols-5 md:gap-3 md:flex-1 md:min-h-0">
        {MEALS.map(meal => {
          const mealEntries = entries.filter(e => e.meal === meal)
          const isFree  = freeMeals.has(meal)
          const mealCal  = mealEntries.reduce((s, e) => s + calc(e.food.calories, e.quantity), 0)
          const mealFat  = mealEntries.reduce((s, e) => s + calc(e.food.fat,      e.quantity), 0)
          const mealCarb = mealEntries.reduce((s, e) => s + calc(e.food.carbs,    e.quantity), 0)
          const mealProt = mealEntries.reduce((s, e) => s + calc(e.food.protein,  e.quantity), 0)
          const isOpen  = expandedMeal === meal
          const hasData = mealCal > 0 || isFree

          return (
            <div key={meal}
              className="bg-white dark:bg-gray-900 rounded-2xl overflow-hidden shadow-sm md:flex md:flex-col md:min-h-0"
              style={{ borderLeft: `3px solid ${hasData ? C.carbs : 'rgba(209,213,219,0.5)'}` }}>

              {/* Header */}
              <div className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none"
                onClick={() => setExpandedMeal(isOpen ? null : meal)}>
                <MealIcon name={meal} size={18} color={hasData ? C.carbs : '#9ca3af'} />
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-gray-900 dark:text-gray-100 truncate">{meal}</p>
                  {hasData && (
                    <p className="text-[11px] mt-0.5 flex items-center gap-1">
                      {isFree ? (
                        <span style={{ color: C.carbs }}>Libero 🍟</span>
                      ) : (
                        <>
                          <span style={{ color: C.kcal, fontWeight: 700 }}>{mealCal}</span>
                          <span className="text-gray-300 dark:text-gray-600">·</span>
                          <span style={{ color: C.fat }}>{mealFat}</span>
                          <span className="text-gray-300 dark:text-gray-600">·</span>
                          <span style={{ color: C.carbs }}>{mealCarb}</span>
                          <span className="text-gray-300 dark:text-gray-600">·</span>
                          <span style={{ color: C.protein }}>{mealProt}</span>
                        </>
                      )}
                    </p>
                  )}
                </div>
              </div>

              {/* Body — hidden on mobile until open, always visible on desktop */}
              <div className={cn(
                'border-t border-gray-50 dark:border-gray-800 md:flex-1 md:overflow-y-auto md:flex md:flex-col',
                isOpen ? 'block' : 'hidden md:block'
              )}>
                {/* Pasto libero + Copia ieri */}
                <div className="flex gap-2 px-4 py-2.5">
                  <button onClick={() => toggleFreeMeal(meal)}
                    className="flex-1 py-2 rounded-xl text-xs font-bold"
                    style={{
                      border: `1.5px solid ${isFree ? C.carbs : C.carbs + '40'}`,
                      background: isFree ? C.carbs + '1a' : 'transparent',
                      color: C.carbs,
                    }}>
                    {isFree ? '✓ Pasto libero' : 'Pasto libero'}
                  </button>
                  <button onClick={() => copyFromYesterday(meal)}
                    className="flex-1 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 text-gray-400 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                    <Copy size={12} /> Copia ieri
                  </button>
                </div>

                {/* Alimenti */}
                {!isFree && mealEntries.length > 0 && (
                  <div className="divide-y divide-gray-50 dark:divide-gray-800">
                    {mealEntries.map(e => {
                      const eKcal  = calc(e.food.calories, e.quantity)
                      const eFat   = calc(e.food.fat,      e.quantity)
                      const eCarbs = calc(e.food.carbs,    e.quantity)
                      const eProt  = calc(e.food.protein,  e.quantity)
                      return (
                        <SwipeableRow key={e.id} onDelete={() => deleteEntry(e.id)} onEdit={() => setEditEntry(e)}>
                          <div className="flex items-center px-4 py-2.5 gap-2">
                            <div className="flex-1 min-w-0">
                              <span className="text-sm text-gray-800 dark:text-gray-200 truncate">{e.food.name}</span>
                              <span className="text-xs text-gray-400 ml-1.5">{e.quantity}g</span>
                            </div>
                            <div className="grid shrink-0 items-center text-[11px]"
                              style={{ gridTemplateColumns: '28px 5px 14px 5px 18px 5px 18px' }}>
                              <span style={{ color: C.kcal, fontWeight: 600, textAlign: 'right' }}>{eKcal}</span>
                              <span className="text-center text-gray-300 dark:text-gray-600">·</span>
                              <span style={{ color: C.fat, textAlign: 'right' }}>{eFat}</span>
                              <span className="text-center text-gray-300 dark:text-gray-600">·</span>
                              <span style={{ color: C.carbs, textAlign: 'right' }}>{eCarbs}</span>
                              <span className="text-center text-gray-300 dark:text-gray-600">·</span>
                              <span style={{ color: C.protein, textAlign: 'right' }}>{eProt}</span>
                            </div>
                          </div>
                        </SwipeableRow>
                      )
                    })}
                  </div>
                )}

                {/* Aggiungi alimento */}
                <button onClick={() => setModal(meal)}
                  className="flex items-center gap-2 px-4 py-3 w-full hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  style={{ borderTop: mealEntries.length > 0 ? '1px solid rgba(243,244,246,1)' : 'none' }}>
                  <Plus size={13} style={{ color: C.carbs }} />
                  <span className="text-sm font-semibold" style={{ color: C.carbs }}>Aggiungi alimento</span>
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {modal && (
        <AddFoodModal meal={modal} date={selectedDate} onClose={() => setModal(null)} onAdded={fetchEntries}
          isFree={freeMeals.has(modal)} onFreeMeal={() => toggleFreeMeal(modal)} />
      )}

      {editEntry && (
        <EditQuantityModal
          entry={editEntry}
          onClose={() => setEditEntry(null)}
          onSaved={(newQty) => handleEditSaved(editEntry.id, newQty)}
        />
      )}
    </div>
  )
}
