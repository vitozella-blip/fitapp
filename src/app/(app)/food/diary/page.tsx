'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { Plus, BookOpen, Copy, Check, X } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { PageHeader } from '@/components/shared/PageHeader'
import { DateNav } from '@/components/shared/DateNav'
import { AddFoodModal } from '@/components/food/AddFoodModal'
import { cn, localToday, shiftDate } from '@/lib/utils'
import { useRefreshOnFocus } from '@/hooks/useRefreshOnFocus'
import { useDateSwipe } from '@/hooks/useDateSwipe'

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
  const currentX  = useRef(0)
  const snapped   = useRef<'left' | 'right' | null>(null)

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
    if (rowRef.current) rowRef.current.style.transition = ''
  }

  function handleTouchMove(e: React.TouchEvent) {
    const dx   = e.touches[0].clientX - startX.current
    const base = snapped.current === 'left' ? -SNAP : snapped.current === 'right' ? SNAP : 0
    const raw  = base + dx
    const clamped = Math.max(-SNAP, Math.min(SNAP, raw))
    setTranslate(clamped)
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
      <div className="absolute inset-y-0 left-0 flex items-center pl-2"
        style={{ width: SNAP, backgroundColor: C.carbs + '22' }}>
        <button onClick={handleEditClick}
          className="w-10 h-10 rounded-xl flex flex-col items-center justify-center gap-0.5"
          style={{ backgroundColor: C.carbs }}>
          <Check size={14} className="text-white" />
          <span className="text-[9px] font-bold text-white leading-none">mod</span>
        </button>
      </div>

      {/* Right action: Elimina (revealed by swipe left) */}
      <div className="absolute inset-y-0 right-0 flex items-center justify-end pr-2"
        style={{ width: SNAP, backgroundColor: '#fee2e2' }}>
        <button onClick={handleDeleteClick}
          className="w-10 h-10 rounded-xl flex flex-col items-center justify-center gap-0.5 bg-red-500">
          <X size={14} className="text-white" />
          <span className="text-[9px] font-bold text-white leading-none">del</span>
        </button>
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
  const [entries, setEntries] = useState<Entry[]>([])
  const [modal, setModal] = useState<string | null>(null)
  const [editEntry, setEditEntry] = useState<Entry | null>(null)
  const [freeMeals, setFreeMeals] = useState<Set<string>>(new Set())
  const abortRef = useRef<AbortController | null>(null)

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

  const calPct  = userProfile.targetCalories > 0
    ? Math.min(100, Math.round((totals.calories / userProfile.targetCalories) * 100))
    : 0
  const calOver = totals.calories > userProfile.targetCalories
  const pct = (v: number, mx: number) => mx > 0 ? Math.min(100, Math.round((v / mx) * 100)) : 0

  const swipe = useDateSwipe(selectedDate, setSelectedDate)

  return (
    <div className="flex flex-col gap-3 max-w-2xl mx-auto md:max-w-none md:h-full" {...swipe}>
      <div className="shrink-0">
        <PageHeader title="Diario Alimentare" icon={BookOpen} accent="food" />
      </div>

      <div className="shrink-0">
        <DateNav selectedDate={selectedDate} onChange={setSelectedDate} accent={C.carbs} showWorkoutColors={false} />
      </div>

      {/* Macro summary */}
      <div className="shrink-0 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden">
        <div className="px-4 py-1.5 border-b border-gray-100 dark:border-gray-800">
          <p className="text-center text-[10px] font-bold uppercase tracking-widest"
            style={{ color: C.kcal }}>Macro</p>
        </div>
        <div className="px-4 pt-2 pb-3">
          <div className="flex items-baseline justify-between mb-1.5">
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold" style={{ color: calOver ? '#f87171' : C.kcal }}>
                {totals.calories}
              </span>
              <span className="text-sm font-medium text-gray-500">/ {userProfile.targetCalories} kcal</span>
              {freeMeals.size > 0 && (
                <span className="text-[10px] font-medium ml-1" style={{ color: C.carbs }}>
                  ({freeMeals.size} libero)
                </span>
              )}
            </div>
            <span className="text-xl font-bold" style={{ color: calOver ? '#f87171' : C.kcal }}>
              {calOver ? `+${totals.calories - userProfile.targetCalories} kcal` : `${calPct}%`}
            </span>
          </div>

          <div className="h-1.5 rounded-full overflow-hidden mb-2.5"
            style={{ backgroundColor: C.kcal + '38' }}>
            <div className="h-full rounded-full transition-all duration-500"
              style={{ width: `${calPct}%`, backgroundColor: calOver ? '#f87171' : C.kcal }} />
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              { label: 'Grassi',      val: totals.fat,     tgt: userProfile.targetFat,     color: C.fat },
              { label: 'Carboidrati', val: totals.carbs,   tgt: userProfile.targetCarbs,   color: C.carbs },
              { label: 'Proteine',    val: totals.protein, tgt: userProfile.targetProtein, color: C.protein },
            ].map(m => (
              <div key={m.label}>
                <p className="text-[10px] font-bold mb-0.5" style={{ color: m.color }}>{m.label}</p>
                <p className="text-lg font-bold leading-none" style={{ color: m.color }}>
                  {m.val}<span className="text-xs font-medium text-gray-500"> / {m.tgt} g</span>
                </p>
                <div className="h-1 rounded-full overflow-hidden mt-1"
                  style={{ backgroundColor: m.color + '40' }}>
                  <div className="h-full rounded-full transition-all"
                    style={{ width: `${pct(m.val, m.tgt)}%`, backgroundColor: m.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Meals */}
      <div className="grid grid-cols-1 gap-3 md:flex-1 md:min-h-0 md:grid-cols-5">
        {MEALS.map(meal => {
          const mealEntries = entries.filter(e => e.meal === meal)
          const isFree = freeMeals.has(meal)
          const mealCal = mealEntries.reduce((s, e) => s + calc(e.food.calories, e.quantity), 0)

          return (
            <div key={meal} className={cn(
              'flex flex-col bg-white dark:bg-gray-900 border rounded-2xl overflow-hidden md:min-h-0',
              isFree ? 'border-amber-100 dark:border-amber-900/50' : 'border-gray-100 dark:border-gray-800'
            )}>
              {/* Header */}
              <div className="flex justify-between items-center px-3 py-2 border-b border-gray-100 dark:border-gray-800 shrink-0"
                style={{ backgroundColor: C.carbs + '18' }}>
                <div className="flex items-center gap-2 min-w-0 flex-1 mr-2">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: C.carbs }} />
                  <div className="min-w-0">
                    <p className="font-bold text-sm uppercase leading-tight" style={{ color: C.carbs }}>{meal}</p>
                    {(isFree || mealCal > 0) && (
                      <p className="text-xs leading-none mt-0.5" style={{ color: C.carbs + 'bb' }}>
                        {isFree ? 'Libero' : `${mealCal} kcal`}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0 self-center">
                  <button onClick={() => copyFromYesterday(meal)} title="Copia da ieri"
                    className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    style={{ backgroundColor: C.carbs + '22' }}>
                    <Copy size={12} />
                  </button>
                  <button onClick={() => setModal(meal)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors text-white"
                    style={{ backgroundColor: C.carbs + 'cc' }}>
                    <Plus size={14} />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="md:flex-1 md:overflow-y-auto">
                {isFree ? (
                  <div className="px-3 py-3 flex items-center gap-2">
                    <p className="text-sm font-medium" style={{ color: C.carbs }}>Cheat meal</p>
                    <span className="text-base">🍟</span>
                  </div>
                ) : mealEntries.length === 0 ? (
                  <p className="text-sm text-gray-400 px-3 py-3">Nessun alimento</p>
                ) : (
                  <div className="divide-y divide-gray-50 dark:divide-gray-800">
                    {mealEntries.map(e => (
                      <SwipeableRow
                        key={e.id}
                        onDelete={() => deleteEntry(e.id)}
                        onEdit={() => setEditEntry(e)}
                      >
                        <div className="px-3 py-2.5">
                          <div className="flex items-baseline gap-1.5 min-w-0">
                            <p className="text-sm text-gray-700 dark:text-gray-300 truncate">{e.food.name}</p>
                            <span className="text-xs text-gray-400 shrink-0">{e.quantity}g</span>
                          </div>
                          <p className="text-xs text-gray-400 mt-0.5">
                            <span style={{ color: C.kcal }}>{calc(e.food.calories, e.quantity)} kcal</span> ·{' '}
                            <span style={{ color: C.fat }}>{calc(e.food.fat, e.quantity)}g</span> ·{' '}
                            <span style={{ color: C.carbs }}>{calc(e.food.carbs, e.quantity)}g</span> ·{' '}
                            <span style={{ color: C.protein }}>{calc(e.food.protein, e.quantity)}g</span>
                          </p>
                        </div>
                      </SwipeableRow>
                    ))}
                  </div>
                )}
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
