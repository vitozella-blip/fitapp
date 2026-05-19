'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { Plus, Trash2, Dumbbell, Check, Flame, X, Loader2, ChevronDown, ChevronLeft, ChevronRight, FileText, StickyNote, Clock } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { PageHeader } from '@/components/shared/PageHeader'
import { DateNav } from '@/components/shared/DateNav'
import { cn } from '@/lib/utils'
import { useRefreshOnFocus } from '@/hooks/useRefreshOnFocus'
import { useDateSwipe } from '@/hooks/useDateSwipe'

const CT            = '#7aafc8'
const C_WARM        = '#f0aa78'
const C_TENNIS      = '#a8d8a8'
const TENNIS_NAME   = 'Tennis'
const SCHEDA_COLORS = ['#7aafc8', '#9d8fcc', '#f0aa78', '#7dbf7d', '#c4a0d6', '#e8a5a5']
const WARMUP_KEY    = 'workout_warmup_v1'
const COMPLETED_KEY = 'workout_completed_v1'

type Exercise   = { id: string; name: string; muscleGroup: string }
type TemplateEx = { id: string; exercise: Exercise; sets: number; reps: string | null; restSeconds: number | null; noteScheda: string | null; notePersonali: string | null }
type SchedaInfo = { id: string; name: string; weekId?: string | null; weekName?: string | null; exercises: TemplateEx[] }
type WorkoutSet = { id: string; setNumber: number; reps: number; weight: number | null; exerciseId: string; exercise: Exercise }
type Workout    = { id: string; sets: WorkoutSet[] }
type Template   = { id: string; name: string; exercises: TemplateEx[] }
type Plan       = { id: string; name: string; isActive?: boolean }
type Week       = { id: string; name: string; order: number }
type WeekParamRow = { weekId: string; templateExId: string; sets: number; reps: string | null; restSeconds: number | null }

function loadSet(key: string): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try { return new Set(JSON.parse(localStorage.getItem(key) ?? '[]')) }
  catch { return new Set() }
}
function saveSet(key: string, s: Set<string>) {
  if (typeof window !== 'undefined') localStorage.setItem(key, JSON.stringify([...s]))
}
function getSchedaColor(date: string): string | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(`workout_scheda_${date}`)
    if (!raw) return null
    const info = JSON.parse(raw)
    return info.color ?? CT
  } catch { return null }
}
function fmtRest(s: number | null): string | null {
  if (!s) return null
  const m = Math.floor(s / 60), sec = s % 60
  if (m > 0 && sec > 0) return `${m}'${sec}''`
  if (m > 0) return `${m}'`
  return `${s}''`
}

// ── Scheda + Week picker (bottom sheet) ───────────────────────────────────────
function SchedaPickerPanel({ userId, onPick, onClose }: {
  userId: string
  onPick: (t: Template, idx: number, weekId: string | null, weekName: string | null, weekOrder: number | null) => void
  onClose: () => void
}) {
  const [step, setStep]         = useState<'scheda' | 'week'>('scheda')
  const [templates, setTemplates] = useState<Template[]>([])
  const [weeks, setWeeks]         = useState<Week[]>([])
  const [picked, setPicked]       = useState<{ t: Template; idx: number } | null>(null)
  const [loading, setLoading]       = useState(true)
  const [loadingWeeks, setLoadingWeeks] = useState(false)

  useEffect(() => {
    ;(async () => {
      setLoading(true)
      try {
        const plans: Plan[] = await fetch(`/api/workout-plans?userId=${userId}`).then(r => r.json())
        const active = plans.find(p => p.isActive) ?? plans[0]
        if (active) {
          const tmps: Template[] = await fetch(`/api/workout-templates?planId=${active.id}`).then(r => r.json())
          setTemplates(tmps)
        }
      } catch (e) { console.error(e) }
      setLoading(false)
    })()
  }, [userId])

  async function selectTemplate(t: Template, idx: number) {
    setPicked({ t, idx })
    setLoadingWeeks(true)
    try {
      const wks: Week[] = await fetch(`/api/workout-weeks?templateId=${t.id}`).then(r => r.json())
      setWeeks(wks)
    } catch { setWeeks([]) }
    setLoadingWeeks(false)
    setStep('week')
  }

  function confirm(weekId: string | null, weekName: string | null, weekOrder: number | null) {
    if (!picked) return
    onPick(picked.t, picked.idx, weekId, weekName, weekOrder)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white dark:bg-gray-900 rounded-t-3xl w-full max-h-[75vh] flex flex-col shadow-xl"
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 shrink-0">
          <div className="flex items-center gap-2">
            {step === 'week' && (
              <button onClick={() => setStep('scheda')}
                className="w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500">
                <ChevronLeft size={14} />
              </button>
            )}
            <p className="font-bold text-gray-900 dark:text-gray-100">
              {step === 'scheda' ? 'Scegli scheda' : picked?.t.name}
            </p>
          </div>
          <button onClick={onClose}
            className="w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500">
            <X size={14} />
          </button>
        </div>

        {/* Step 1: schede */}
        {step === 'scheda' && (
          <div className="flex-1 overflow-y-auto px-5 pb-6 space-y-2">
            {loading && <div className="flex justify-center py-10"><Loader2 size={20} className="animate-spin" style={{ color: CT }} /></div>}
            {!loading && templates.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-8">Nessuna scheda. Creala nella sezione Piano.</p>
            )}
            {templates.map((t, i) => {
              const color = SCHEDA_COLORS[i % SCHEDA_COLORS.length]
              const sepIdx = t.name.indexOf(' — ')
              const label1 = sepIdx >= 0 ? t.name.slice(0, sepIdx) : t.name
              const label2 = sepIdx >= 0 ? t.name.slice(sepIdx + 3) : null
              return (
                <button key={t.id} onClick={() => selectTemplate(t, i)}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-bold shrink-0"
                    style={{ backgroundColor: color }}>
                    {String(i + 1).padStart(2, '0')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-semibold text-gray-400 truncate">{label1}</p>
                    <p className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">{label2 ?? label1}</p>
                    <p className="text-[10px] text-gray-400">{t.exercises?.length ?? 0} esercizi</p>
                  </div>
                  <ChevronRight size={15} className="text-gray-300 shrink-0" />
                </button>
              )
            })}
          </div>
        )}

        {/* Step 2: weeks */}
        {step === 'week' && (
          <div className="flex-1 overflow-y-auto px-5 pb-6 space-y-2">
            {loadingWeeks && <div className="flex justify-center py-6"><Loader2 size={18} className="animate-spin" style={{ color: CT }} /></div>}
            {!loadingWeeks && weeks.length === 0 && (
              <div className="text-center py-6 space-y-3">
                <p className="text-sm text-gray-400">Nessuna week definita per questa scheda</p>
                <button onClick={() => confirm(null, null, null)}
                  className="px-5 py-2.5 rounded-xl text-white text-sm font-semibold"
                  style={{ backgroundColor: CT }}>
                  Usa parametri scheda
                </button>
              </div>
            )}
            {!loadingWeeks && weeks.length > 0 && (
              <>
                <p className="text-xs text-gray-400 pb-1">Seleziona la settimana</p>
                {weeks.map(w => (
                  <button key={w.id} onClick={() => confirm(w.id, w.name, w.order + 1)}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-bold shrink-0"
                      style={{ backgroundColor: CT }}>
                      {w.order + 1}
                    </div>
                    <p className="text-sm font-bold text-gray-900 dark:text-gray-100 flex-1">{w.name}</p>
                    <ChevronRight size={15} className="text-gray-300 shrink-0" />
                  </button>
                ))}
                <button onClick={() => confirm(null, null, null)}
                  className="w-full py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors mt-1">
                  Senza week — usa default scheda
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

async function mergeWeekParams(exercises: TemplateEx[], weekId: string | null): Promise<TemplateEx[]> {
  if (!weekId) return exercises
  try {
    const params: WeekParamRow[] = await fetch(`/api/week-exercise-params?weekId=${weekId}`).then(r => r.json())
    const map = new Map(params.map(p => [p.templateExId, p]))
    return exercises.map(ex => {
      const wp = map.get(ex.id)
      if (!wp) return ex
      return {
        ...ex,
        sets:        wp.sets        ?? ex.sets,
        reps:        wp.reps        ?? ex.reps,
        restSeconds: wp.restSeconds ?? ex.restSeconds,
      }
    })
  } catch { return exercises }
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function TrainingDiaryPage() {
  const { userId, selectedDate, setSelectedDate, userProfile, bumpWorkoutVersion } = useAppStore()
  const [workout,    setWorkout]    = useState<Workout | null>(null)
  const [schedaInfo, setSchedaInfo] = useState<SchedaInfo | null>(null)
  const [showPicker, setShowPicker] = useState(false)
  const [warmups,    setWarmups]    = useState<Set<string>>(new Set())
  const [completed,  setCompleted]  = useState<Set<string>>(new Set())
  const [tennisLoading, setTennisLoading] = useState(false)
  const [expandedExId,  setExpandedExId]  = useState<string | null>(null)
  const [noteEdit, setNoteEdit] = useState<{ exId: string; teId: string; type: 'scheda' | 'personali'; text: string } | null>(null)
  const [noteSaving, setNoteSaving] = useState(false)
  const [recTimer,  setRecTimer]  = useState<{ mode: 'countdown' | 'stopwatch'; rem: number; init: number; on: boolean } | null>(null)
  const [timerPicker, setTimerPicker] = useState<string | null>(null)
  const recRef = useRef<NodeJS.Timeout | undefined>(undefined)

  const [addExId,    setAddExId]    = useState<string | null>(null)
  const [formReps,   setFormReps]   = useState('')
  const [formWeight, setFormWeight] = useState('')
  const [formSaving, setFormSaving] = useState(false)

  const [editSetId,     setEditSetId]     = useState<string | null>(null)
  const [editReps,      setEditReps]      = useState('')
  const [editWeight,    setEditWeight]    = useState('')
  const [editSaving,    setEditSaving]    = useState(false)
  const [labelMenuSetId, setLabelMenuSetId] = useState<string | null>(null)

  const [absOptions, setAbsOptions] = useState<{ id: string; name: string }[]>([])
  const [absExId,    setAbsExId]    = useState<string | null>(null)

  const [historyExId,   setHistoryExId]   = useState<string | null>(null)
  const [historyData,   setHistoryData]   = useState<{ date: string; sets: { reps: number; weight: number | null; isWarmup: boolean }[] } | null>(null)
  const [historyLoading, setHistoryLoading] = useState(false)

  useEffect(() => {
    setWarmups(loadSet(WARMUP_KEY))
    setCompleted(loadSet(COMPLETED_KEY))
  }, [])

  const fetchWorkout = useCallback(async () => {
    const r = await fetch(`/api/workout?userId=${userId}&date=${selectedDate}`)
    setWorkout(await r.json())
  }, [userId, selectedDate])

  useEffect(() => { fetchWorkout() }, [fetchWorkout])
  useRefreshOnFocus(fetchWorkout)

  useEffect(() => {
    clearInterval(recRef.current)
    if (!recTimer?.on) return
    recRef.current = setInterval(() => {
      setRecTimer(t => {
        if (!t) { clearInterval(recRef.current); return null }
        if (t.mode === 'stopwatch') return { ...t, rem: t.rem + 1 }
        if (t.rem <= 1) { clearInterval(recRef.current); return { ...t, rem: 0, on: false } }
        return { ...t, rem: t.rem - 1 }
      })
    }, 1000)
    return () => clearInterval(recRef.current)
  }, [recTimer?.on])


  // Load scheda + week params from localStorage when date changes
  useEffect(() => {
    setSchedaInfo(null)
    if (typeof window === 'undefined') return
    const raw = localStorage.getItem(`workout_scheda_${selectedDate}`)
    if (!raw) return
    ;(async () => {
      try {
        const info = JSON.parse(raw)
        if (!info.templateId) return
        const t: Template = await fetch(`/api/workout-templates/${info.templateId}`).then(r => r.json())
        if (!t?.id) return
        const merged = await mergeWeekParams(t.exercises, info.weekId ?? null)
        setSchedaInfo({ id: t.id, name: t.name, weekId: info.weekId ?? null, weekName: info.weekName ?? null, exercises: merged })
      } catch {}
    })()
  }, [selectedDate])

  useEffect(() => {
    if (!schedaInfo) { setAbsOptions([]); setAbsExId(null); return }
    const defaultAbsId = schedaInfo.exercises[schedaInfo.exercises.length - 1]?.exercise.id ?? null
    setAbsExId(defaultAbsId)
    ;(async () => {
      try {
        const plans: Plan[] = await fetch(`/api/workout-plans?userId=${userId}`).then(r => r.json())
        const active = plans.find(p => p.isActive) ?? plans[0]
        if (!active) return
        const tmps: Template[] = await fetch(`/api/workout-templates?planId=${active.id}`).then(r => r.json())
        const seen = new Set<string>()
        const opts = tmps
          .map(t => t.exercises[t.exercises.length - 1])
          .filter(Boolean)
          .map(te => ({ id: te.exercise.id, name: te.exercise.name }))
          .filter(e => { if (seen.has(e.id)) return false; seen.add(e.id); return true })
        setAbsOptions(opts)
      } catch {}
    })()
  }, [schedaInfo, userId])

  async function pickScheda(t: Template, idx: number, weekId: string | null, weekName: string | null, weekOrder: number | null) {
    const color = SCHEDA_COLORS[idx % SCHEDA_COLORS.length]
    localStorage.setItem(`workout_scheda_${selectedDate}`, JSON.stringify({ templateId: t.id, name: t.name, order: idx + 1, color, weekId, weekName, weekOrder }))
    const merged = await mergeWeekParams(t.exercises, weekId)
    setSchedaInfo({ id: t.id, name: t.name, weekId, weekName, exercises: merged })
    setShowPicker(false)
    bumpWorkoutVersion()
  }

  async function addSet(exId: string, isWarmup: boolean) {
    if (!formReps.trim()) return
    setFormSaving(true)
    await fetch('/api/workout', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, date: selectedDate, exerciseId: exId, sets: 1, reps: Number(formReps), weight: formWeight ? Number(formWeight) : null }),
    })
    const r = await fetch(`/api/workout?userId=${userId}&date=${selectedDate}`)
    const w: Workout = await r.json()
    if (isWarmup) {
      const prevIds = new Set((workout?.sets ?? []).map(s => s.id))
      const newSet  = (w?.sets ?? []).find(s => !prevIds.has(s.id) && s.exerciseId === exId)
      if (newSet) {
        const nw = new Set(warmups); nw.add(newSet.id)
        setWarmups(nw); saveSet(WARMUP_KEY, nw)
      }
    }
    setWorkout(w)
    setFormReps(''); setFormWeight('')
    setFormSaving(false)
    bumpWorkoutVersion()
  }

  async function deleteSet(id: string) {
    await fetch(`/api/workout/set/${id}`, { method: 'DELETE' })
    setWorkout(w => w ? { ...w, sets: w.sets.filter(s => s.id !== id) } : null)
    if (warmups.has(id)) {
      const nw = new Set(warmups); nw.delete(id); setWarmups(nw); saveSet(WARMUP_KEY, nw)
    }
    bumpWorkoutVersion()
  }

  function openEdit(s: WorkoutSet) {
    setEditSetId(s.id)
    setEditReps(String(s.reps))
    setEditWeight(s.weight != null ? String(s.weight) : '')
  }

  async function updateSet() {
    if (!editSetId || !editReps.trim()) return
    setEditSaving(true)
    try {
      await fetch(`/api/workout/set/${editSetId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reps: Number(editReps), weight: editWeight ? Number(editWeight) : null }),
      })
      setWorkout(w => w ? {
        ...w,
        sets: w.sets.map(s => s.id === editSetId
          ? { ...s, reps: Number(editReps), weight: editWeight ? Number(editWeight) : null }
          : s
        ),
      } : null)
      setEditSetId(null)
      bumpWorkoutVersion()
    } finally { setEditSaving(false) }
  }

  function handleDateChange(d: string) {
    setSelectedDate(d); setExpandedExId(null); setAddExId(null); setEditSetId(null)
  }

  function toggleCompleted(exerciseId: string) {
    const key = `${selectedDate}_${exerciseId}`
    const nc  = new Set(completed)
    nc.has(key) ? nc.delete(key) : nc.add(key)
    setCompleted(nc); saveSet(COMPLETED_KEY, nc)
    bumpWorkoutVersion()
  }

  function removeScheda() {
    localStorage.removeItem(`workout_scheda_${selectedDate}`)
    setSchedaInfo(null)
    setAbsOptions([])
    setAbsExId(null)
    bumpWorkoutVersion()
  }

  async function deleteExerciseSets(exerciseId: string, sets: WorkoutSet[]) {
    await Promise.all(sets.map(s => fetch(`/api/workout/set/${s.id}`, { method: 'DELETE' })))
    const setIds = new Set(sets.map(s => s.id))
    setWorkout(w => w ? { ...w, sets: w.sets.filter(s => !setIds.has(s.id)) } : null)
    const newWarmups = new Set(warmups)
    sets.forEach(s => newWarmups.delete(s.id))
    if (newWarmups.size !== warmups.size) { setWarmups(newWarmups); saveSet(WARMUP_KEY, newWarmups) }
    const compKey = `${selectedDate}_${exerciseId}`
    if (completed.has(compKey)) {
      const nc = new Set(completed); nc.delete(compKey); setCompleted(nc); saveSet(COMPLETED_KEY, nc)
    }
    bumpWorkoutVersion()
  }

  async function toggleHistory(exId: string, exerciseId: string) {
    if (historyExId === exId) { setHistoryExId(null); setHistoryData(null); return }
    setHistoryExId(exId)
    setHistoryData(null)
    setHistoryLoading(true)
    try {
      const r = await fetch(`/api/workout/exercise-history?userId=${userId}&exerciseId=${exerciseId}&beforeDate=${selectedDate}`)
      setHistoryData(await r.json())
    } catch {}
    setHistoryLoading(false)
  }

  async function saveNote(te: TemplateEx) {
    if (!noteEdit) return
    setNoteSaving(true)
    const isScheda = noteEdit.type === 'scheda'
    const newNoteScheda     = isScheda ? (noteEdit.text || null) : te.noteScheda
    const newNotePersonali  = !isScheda ? (noteEdit.text || null) : te.notePersonali
    await fetch(`/api/template-exercises/${te.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sets: te.sets, reps: te.reps, restSeconds: te.restSeconds, noteScheda: newNoteScheda, notePersonali: newNotePersonali }),
    })
    setSchedaInfo(s => s ? { ...s, exercises: s.exercises.map(ex => ex.id === te.id ? { ...ex, noteScheda: newNoteScheda, notePersonali: newNotePersonali } : ex) } : null)
    setNoteSaving(false)
    setNoteEdit(null)
  }

  function openAdd(exId: string, targetReps: string | null) {
    const isSame = addExId === exId
    setAddExId(isSame ? null : exId)
    setExpandedExId(exId)
    const num = !isSame && targetReps?.match(/^\d+$/) ? targetReps : ''
    setFormReps(num); setFormWeight('')
  }

  const allSets    = (workout?.sets ?? []).filter(Boolean)
  const tennisSets = allSets.filter(s => s.exercise?.name === TENNIS_NAME)
  const tennisActive = tennisSets.length > 0
  const workoutSets  = allSets.filter(s => s.exercise?.name !== TENNIS_NAME)

  const schedaExIds = new Set((schedaInfo?.exercises ?? []).map(te => te.exercise.id))
  const extraGrouped = workoutSets
    .filter(s => !schedaExIds.has(s.exerciseId))
    .reduce((acc, s) => {
      if (!s?.exercise) return acc
      if (!acc[s.exerciseId]) acc[s.exerciseId] = { name: s.exercise.name, group: s.exercise.muscleGroup, sets: [] }
      acc[s.exerciseId].sets.push(s)
      return acc
    }, {} as Record<string, { name: string; group: string; sets: WorkoutSet[] }>)

  async function findOrCreateTennis(): Promise<Exercise> {
    const r = await fetch(`/api/exercises?q=${encodeURIComponent(TENNIS_NAME)}&userId=${userId}`)
    const arr: Exercise[] = await r.json()
    const f = arr.find(e => e.name.toLowerCase() === TENNIS_NAME.toLowerCase())
    if (f) return f
    const cr = await fetch('/api/exercises', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: TENNIS_NAME, muscleGroup: 'Cardio', userId }),
    })
    return await cr.json()
  }

  async function toggleTennis() {
    if (tennisLoading) return
    setTennisLoading(true)
    if (tennisActive) {
      for (const s of tennisSets) await fetch(`/api/workout/set/${s.id}`, { method: 'DELETE' })
    } else {
      const ex = await findOrCreateTennis()
      await fetch('/api/workout', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, date: selectedDate, exerciseId: ex.id, sets: 1, reps: 1, weight: null }),
      })
    }
    await fetchWorkout(); setTennisLoading(false); bumpWorkoutVersion()
  }

  const schedaColor = getSchedaColor(selectedDate) ?? CT
  const hasAny = schedaInfo || Object.keys(extraGrouped).length > 0 || tennisActive
  const swipe = useDateSwipe(selectedDate, handleDateChange)

  return (
    <div className="space-y-3 max-w-2xl mx-auto md:max-w-none" {...swipe}>
      <PageHeader title="Diario Workout" icon={Dumbbell} accent="training"
        action={
          <div className="flex items-center gap-1.5">
            <button onClick={toggleTennis} disabled={tennisLoading}
              className={cn('px-3 py-2 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50', tennisActive ? 'text-white' : '')}
              style={tennisActive ? { backgroundColor: C_TENNIS } : { backgroundColor: C_TENNIS + '22', color: '#5a8a5a' }}>
              Tennis
            </button>
            <button onClick={() => setShowPicker(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-white text-sm font-semibold"
              style={{ backgroundColor: CT }}>
              <Plus size={15} /> Workout
            </button>
          </div>
        }
      />

      <DateNav selectedDate={selectedDate} onChange={handleDateChange} accent={CT} schedaColor={getSchedaColor(selectedDate) ?? undefined} />

      {/* Empty state */}
      {!hasAny && (
        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-8 text-center">
          <Dumbbell size={28} className="mx-auto mb-3" style={{ color: CT + '80' }} />
          <p className="text-gray-500 font-medium text-sm">Nessun allenamento oggi</p>
          <p className="text-xs text-gray-400 mt-1">Scegli una scheda o aggiungi Tennis per iniziare</p>
        </div>
      )}

      {/* Scheda header band */}
      {schedaInfo && (
        <div className="px-4 py-2.5 rounded-2xl flex items-center gap-2" style={{ backgroundColor: schedaColor + '22' }}>
          <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: schedaColor }} />
          <span className="text-sm font-bold truncate flex-1" style={{ color: schedaColor }}>{schedaInfo.name}</span>
          {schedaInfo.weekName && (
            <span className="text-xs font-semibold shrink-0" style={{ color: schedaColor + 'cc' }}>
              {schedaInfo.weekName}
            </span>
          )}
          <button onClick={removeScheda}
            className="w-6 h-6 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 transition-colors shrink-0">
            <X size={13} />
          </button>
        </div>
      )}

      {/* Scheda exercises */}
      {schedaInfo && schedaInfo.exercises.map((te, teIdx) => {
        const isLastEx = teIdx === schedaInfo.exercises.length - 1
        const exId    = isLastEx && absExId ? absExId : te.exercise.id
        const exSets  = workoutSets
          .filter(s => s.exerciseId === exId)
          .sort((a, b) => (warmups.has(a.id) ? 0 : 1) - (warmups.has(b.id) ? 0 : 1))
        const compKey = `${selectedDate}_${exId}`
        const isDone  = completed.has(compKey)
        const isOpen  = expandedExId === exId
        const addOpen = addExId === exId
        let workIdx = 0, warmIdx = 0
        const rest = fmtRest(te.restSeconds)

        const historyView = (() => {
          if (historyExId !== te.id) return null
          if (historyLoading) return (
            <div className="border-t border-gray-50 dark:border-gray-800 px-4 pt-2 pb-1 flex justify-center py-2">
              <Loader2 size={12} className="animate-spin" style={{ color: CT }} />
            </div>
          )
          const currWarm = exSets.filter(s => warmups.has(s.id))
          const currWork = exSets.filter(s => !warmups.has(s.id))
          const hist = historyData?.sets ?? []
          const hWarm = hist.slice(0, currWarm.length)
          const hWork = hist.slice(currWarm.length)
          const maxW = Math.max(currWarm.length, hWarm.length)
          const maxS = Math.max(currWork.length, hWork.length)
          if (maxW === 0 && maxS === 0 && !historyData) return (
            <div className="border-t border-gray-50 dark:border-gray-800 px-4 pt-2 pb-1">
              <p className="text-[11px] text-gray-400 text-center py-1">Nessuna sessione precedente</p>
            </div>
          )
          const fmt = (s: { reps: number; weight: number | null }) => `${s.reps}×${s.weight ?? '—'}`
          const prevLabel = historyData
            ? new Date(historyData.date + 'T12:00:00').toLocaleDateString('it-IT', { day: 'numeric', month: 'short' }).toUpperCase()
            : '—'
          const currLabel = new Date(selectedDate + 'T12:00:00').toLocaleDateString('it-IT', { day: 'numeric', month: 'short' }).toUpperCase()
          return (
            <div className="border-t border-gray-50 dark:border-gray-800 px-4 pt-2 pb-1">
              <div className="grid grid-cols-[1.5rem_1fr_1px_1fr] gap-x-2 mb-1 items-center">
                <div />
                <p className="text-[9px] font-bold uppercase tracking-widest text-center text-gray-400">{prevLabel}</p>
                <div className="self-stretch bg-gray-200 dark:bg-gray-700" />
                <p className="text-[9px] font-bold uppercase tracking-widest text-center" style={{ color: CT }}>{currLabel}</p>
              </div>
              {Array.from({ length: maxW }, (_, i) => {
                const hS = hWarm[i]; const cS = currWarm[i]
                return (
                  <div key={`R${i+1}`} className="grid grid-cols-[1.5rem_1fr_1px_1fr] gap-x-2 py-0.5 items-center">
                    <span className="text-[10px] font-bold text-center" style={{ color: C_WARM }}>R{i+1}</span>
                    <span className="text-[11px] text-center text-gray-400">{hS ? fmt(hS) : '—'}</span>
                    <div className="self-stretch bg-gray-100 dark:bg-gray-800" />
                    <span className="text-[12px] font-bold text-center" style={{ color: cS ? CT : '#9ca3af' }}>{cS ? fmt({ reps: cS.reps, weight: cS.weight }) : '—'}</span>
                  </div>
                )
              })}
              {Array.from({ length: maxS }, (_, i) => {
                const hS = hWork[i]; const cS = currWork[i]
                return (
                  <div key={`S${i+1}`} className="grid grid-cols-[1.5rem_1fr_1px_1fr] gap-x-2 py-0.5 items-center">
                    <span className="text-[10px] font-bold text-center" style={{ color: CT }}>S{i+1}</span>
                    <span className="text-[11px] text-center text-gray-400">{hS ? fmt(hS) : '—'}</span>
                    <div className="self-stretch bg-gray-100 dark:bg-gray-800" />
                    <span className="text-[12px] font-bold text-center" style={{ color: cS ? CT : '#9ca3af' }}>{cS ? fmt({ reps: cS.reps, weight: cS.weight }) : '—'}</span>
                  </div>
                )
              })}
            </div>
          )
        })()

        return (
          <div key={te.id}
            className={cn('bg-white dark:bg-gray-900 border rounded-2xl overflow-hidden transition-colors',
              isDone ? 'border-green-200/60 dark:border-green-900/40' : 'border-gray-100 dark:border-gray-800')}>

            {/* Header row */}
            <div className="flex items-center gap-2 px-4 py-3">
              <button onClick={() => toggleCompleted(exId)}
                className={cn('w-6 h-6 rounded-md flex items-center justify-center shrink-0 transition-colors border',
                  isDone ? 'border-transparent text-white' : 'border-gray-200 dark:border-gray-700 hover:border-gray-400')}
                style={isDone ? { backgroundColor: '#7dbf7d' } : {}}>
                {isDone && <Check size={13} />}
              </button>

              <button className="flex-1 min-w-0 text-left"
                onClick={() => { setExpandedExId(id => id === exId ? null : exId); setAddExId(null) }}>
                {isLastEx && absOptions.length > 1 ? (
                  <select
                    value={absExId ?? te.exercise.id}
                    onChange={e => { setAbsExId(e.target.value); setAddExId(null); setExpandedExId(null); setEditSetId(null) }}
                    onClick={e => e.stopPropagation()}
                    className="font-semibold text-sm text-gray-900 dark:text-gray-100 dark:bg-gray-900 bg-transparent outline-none w-full cursor-pointer">
                    {absOptions.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                  </select>
                ) : (
                  <p className="font-semibold text-sm truncate text-gray-900 dark:text-gray-100">
                    {te.exercise.name}
                  </p>
                )}
                {exSets.length > 0 && (
                  <p className="text-[10px] mt-0.5" style={{ color: CT }}>{exSets.length} eseguiti</p>
                )}
              </button>

              {exSets.length > 0 && (
                <button onClick={() => deleteExerciseSets(exId, exSets)}
                  className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors text-gray-300 hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50">
                  <Trash2 size={15} />
                </button>
              )}
              <button onClick={() => openAdd(exId, te.reps)}
                className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors text-white"
                style={{ backgroundColor: addOpen ? CT : CT + '99' }}>
                <Plus size={15} />
              </button>
            </div>

            {/* Expanded: target + logged sets */}
            {isOpen && (
              <div className="border-t border-gray-50 dark:border-gray-800">
                {/* Target table */}
                <div className="px-4 py-2.5">
                  <div className="grid gap-x-2 items-center" style={{ gridTemplateColumns: '2rem 7rem 3rem auto' }}>
                    <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400 text-center mb-0.5">Set</p>
                    <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400 text-center mb-0.5">Rep</p>
                    <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400 text-center mb-0.5">Rec</p>
                    <div />
                    <p className="text-xs font-bold text-center" style={{ color: CT }}>{te.sets}</p>
                    <p className="text-xs font-bold text-center" style={{ color: CT }}>{te.reps || '—'}</p>
                    <button
                      className="text-xs font-bold text-center w-full"
                      style={{ color: CT }}
                      disabled={!te.restSeconds}
                      onClick={() => te.restSeconds && setRecTimer({ mode: 'countdown', rem: te.restSeconds, init: te.restSeconds, on: true })}
                    >{rest || '—'}</button>
                    <div className="flex gap-2.5 justify-center items-center">
                      <button onClick={() => setNoteEdit(n => n?.exId === te.id && n.type === 'scheda' ? null : { exId: te.id, teId: te.id, type: 'scheda', text: te.noteScheda ?? '' })}
                        title="Note scheda">
                        <StickyNote size={16} style={{ color: te.noteScheda ? (noteEdit?.exId === te.id && noteEdit.type === 'scheda' ? '#e8924a' : '#f0aa78') : '#d1d5db' }} />
                      </button>
                      <button onClick={() => setNoteEdit(n => n?.exId === te.id && n.type === 'personali' ? null : { exId: te.id, teId: te.id, type: 'personali', text: te.notePersonali ?? '' })}
                        title="Note personali">
                        <StickyNote size={16} style={{ color: te.notePersonali ? (noteEdit?.exId === te.id && noteEdit.type === 'personali' ? '#7b6db0' : '#9d8fcc') : '#d1d5db' }} />
                      </button>
                      <button onClick={() => setTimerPicker(p => p === te.id ? null : te.id)}
                        title="Cronometro / Timer">
                        <Clock size={16} style={{ color: timerPicker === te.id || recTimer ? CT : '#d1d5db' }} />
                      </button>
                      <button onClick={() => toggleHistory(te.id, exId)}
                        className="transition-colors"
                        title="Carichi sessione precedente">
                        <Dumbbell size={16} style={{ color: historyExId === te.id ? CT : '#d1d5db' }} />
                      </button>
                    </div>
                  </div>
                </div>
                {noteEdit?.exId === te.id && (
                  <div className="px-4 pb-2 space-y-1.5">
                    <textarea
                      value={noteEdit.text}
                      onChange={e => setNoteEdit(n => n ? { ...n, text: e.target.value } : null)}
                      placeholder={noteEdit.type === 'scheda' ? 'Note scheda...' : 'Note personali...'}
                      rows={2}
                      className="w-full text-xs px-3 py-2 rounded-xl border bg-gray-50 dark:bg-gray-800 outline-none resize-none placeholder-gray-300"
                      style={{ borderColor: noteEdit.type === 'scheda' ? '#f0aa7880' : '#9d8fcc80', color: noteEdit.type === 'scheda' ? '#f0aa78' : '#9d8fcc' }}
                    />
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => setNoteEdit(null)}
                        className="text-xs text-gray-400 px-3 py-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
                        Annulla
                      </button>
                      <button onClick={() => saveNote(te)} disabled={noteSaving}
                        className="text-xs font-bold px-3 py-1.5 rounded-lg text-white disabled:opacity-50"
                        style={{ backgroundColor: noteEdit.type === 'scheda' ? '#f0aa78' : '#9d8fcc' }}>
                        {noteSaving ? '...' : 'Salva'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Timer picker */}
                {timerPicker === te.id && (
                  <div className="mx-4 mb-2 flex gap-2">
                    {te.restSeconds && (
                      <button
                        onClick={() => { setRecTimer({ mode: 'countdown', rem: te.restSeconds!, init: te.restSeconds!, on: true }); setTimerPicker(null) }}
                        className="flex-1 py-2 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-1.5"
                        style={{ backgroundColor: CT }}>
                        <Clock size={12} /> Timer {fmtRest(te.restSeconds)}
                      </button>
                    )}
                    <button
                      onClick={() => { setRecTimer({ mode: 'stopwatch', rem: 0, init: 0, on: true }); setTimerPicker(null) }}
                      className="flex-1 py-2 rounded-xl text-xs font-bold border"
                      style={{ borderColor: CT, color: CT }}>
                      Cronometro
                    </button>
                  </div>
                )}

                {/* Add set form */}
                {addOpen && (
                  <div className="border-t border-gray-100 dark:border-gray-800 px-3 py-2 grid grid-cols-4 gap-1.5">
                    <div className="flex items-center rounded-lg bg-gray-100 dark:bg-gray-800 overflow-hidden">
                      <button className="px-2 py-2 text-sm font-bold text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 flex-shrink-0"
                        onClick={() => setFormReps(v => String(Math.max(0, (Number(v) || 0) - 1)))}>–</button>
                      <span className="flex-1 text-center text-xs font-bold text-gray-900 dark:text-gray-100 truncate">{formReps || ''}</span>
                      <button className="px-2 py-2 text-sm font-bold text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 flex-shrink-0"
                        onClick={() => setFormReps(v => String((Number(v) || 0) + 1))}>+</button>
                    </div>
                    <input type="number" step="0.5" min="0" value={formWeight} onChange={e => setFormWeight(e.target.value)}
                      placeholder="kg"
                      className="py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs text-center font-bold text-gray-900 dark:text-gray-100 outline-none focus:border-blue-300 w-full" />
                    <button onClick={() => addSet(exId, true)} disabled={formSaving || !formReps.trim()}
                      className="py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 disabled:opacity-40"
                      style={{ backgroundColor: C_WARM + '20', color: C_WARM }}>
                      <Flame size={11} /> Risc.
                    </button>
                    <button onClick={() => addSet(exId, false)} disabled={formSaving || !formReps.trim()}
                      className="py-2 rounded-lg text-white text-xs font-semibold flex items-center justify-center gap-1 disabled:opacity-40"
                      style={{ backgroundColor: CT }}>
                      {formSaving ? <Loader2 size={11} className="animate-spin" /> : <Plus size={11} />} Serie
                    </button>
                  </div>
                )}

                {/* Logged sets — comparison view when history active, normal list otherwise */}
                {historyView ?? (exSets.length > 0 ? (
                  <div className="divide-y divide-gray-50 dark:divide-gray-800 border-t border-gray-50 dark:border-gray-800">
                    {exSets.map(s => {
                      const isW  = warmups.has(s.id)
                      const label = isW ? `R${++warmIdx}` : String(++workIdx)
                      const isEditing = editSetId === s.id
                      return (
                        <div key={s.id}>
                          {isEditing ? (
                            <div className="px-4 py-2 space-y-2">
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="text-[10px] text-gray-400 block mb-1">Reps</label>
                                  <div className="flex items-center rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 overflow-hidden">
                                    <button className="px-3 py-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-base font-bold"
                                      onClick={() => setEditReps(v => String(Math.max(0, (Number(v)||0) - 1)))}>–</button>
                                    <span className="flex-1 text-center text-sm font-bold text-gray-900 dark:text-gray-100">{editReps || '—'}</span>
                                    <button className="px-3 py-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-base font-bold"
                                      onClick={() => setEditReps(v => String((Number(v)||0) + 1))}>+</button>
                                  </div>
                                </div>
                                <div>
                                  <label className="text-[10px] text-gray-400 block mb-1">Peso (kg)</label>
                                  <input type="number" step="0.5" min="0" value={editWeight}
                                    onChange={e => setEditWeight(e.target.value)} placeholder="—"
                                    className="w-full px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-center font-bold text-gray-900 dark:text-gray-100 outline-none focus:border-blue-300" />
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <button onClick={() => setEditSetId(null)}
                                  className="py-1.5 rounded-xl text-sm font-semibold text-gray-500 bg-gray-100 dark:bg-gray-800">
                                  Annulla
                                </button>
                                <button onClick={updateSet} disabled={editSaving || !editReps.trim()}
                                  className="py-1.5 rounded-xl text-sm font-semibold text-white disabled:opacity-40 flex items-center justify-center gap-1"
                                  style={{ backgroundColor: CT }}>
                                  {editSaving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} Salva
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div>
                              <div className="flex items-center gap-2 px-4 py-2">
                                <button
                                  onClick={() => setLabelMenuSetId(id => id === s.id ? null : s.id)}
                                  className="w-6 h-6 rounded-md text-[10px] font-bold flex items-center justify-center shrink-0 transition-opacity"
                                  style={isW ? { backgroundColor: C_WARM + '20', color: C_WARM } : { backgroundColor: CT + '18', color: CT }}>
                                  {label}
                                </button>
                                {isW && <Flame size={10} style={{ color: C_WARM }} className="shrink-0" />}
                                <button className="flex-1 text-left text-sm text-gray-900 dark:text-gray-100"
                                  onClick={() => openEdit(s)}>
                                  {s.reps} reps{s.weight ? ` · ${s.weight} kg` : ''}
                                </button>
                                <button onClick={() => deleteSet(s.id)}
                                  className="w-7 h-7 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/50 text-gray-300 hover:text-red-400 flex items-center justify-center transition-colors">
                                  <Trash2 size={12} />
                                </button>
                              </div>
                              {labelMenuSetId === s.id && (
                                <div className="flex gap-1.5 px-4 pb-2">
                                  {['D', 'S', 'DS', 'BO'].map(opt => (
                                    <button key={opt}
                                      onClick={() => setLabelMenuSetId(null)}
                                      className="px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors hover:text-white"
                                      style={{ borderColor: CT, color: CT }}
                                      onMouseEnter={e => (e.currentTarget.style.backgroundColor = CT)}
                                      onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}>
                                      {opt}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                ) : null)}
              </div>
            )}

          </div>
        )
      })}

      {/* Extra exercises (not in scheda) */}
      {Object.entries(extraGrouped).map(([exId, { name, group, sets }]) => {
        const compKey = `${selectedDate}_${exId}`
        const isDone  = completed.has(compKey)
        const isOpen  = expandedExId === exId
        let workIdx = 0, warmIdx = 0
        return (
          <div key={exId}
            className={cn('bg-white dark:bg-gray-900 border rounded-2xl overflow-hidden transition-colors',
              isDone ? 'border-green-200/60 dark:border-green-900/40' : 'border-gray-100 dark:border-gray-800')}>
            <div className="flex items-center gap-2 px-4 py-3">
              <button onClick={() => toggleCompleted(exId)}
                className={cn('w-6 h-6 rounded-md flex items-center justify-center shrink-0 transition-colors border',
                  isDone ? 'border-transparent text-white' : 'border-gray-200 dark:border-gray-700')}
                style={isDone ? { backgroundColor: '#7dbf7d' } : {}}>
                {isDone && <Check size={13} />}
              </button>
              <button className="flex-1 min-w-0 text-left"
                onClick={() => setExpandedExId(id => id === exId ? null : exId)}>
                <p className="font-semibold text-sm truncate text-gray-900 dark:text-gray-100">{name}</p>
                {group && <p className="text-[10px] text-gray-400 mt-0.5">{group}</p>}
              </button>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-lg shrink-0" style={{ color: CT, backgroundColor: CT + '18' }}>
                {sets.length} set
              </span>
              <button onClick={() => deleteExerciseSets(exId, sets)}
                className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors text-gray-300 hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50">
                <Trash2 size={13} />
              </button>
            </div>
            {isOpen && (
              <div className="border-t border-gray-50 dark:border-gray-800 divide-y divide-gray-50 dark:divide-gray-800">
                {sets.map(s => {
                  const isW  = warmups.has(s.id)
                  const label = isW ? `R${++warmIdx}` : String(++workIdx)
                  const isEditing = editSetId === s.id
                  return (
                    <div key={s.id}>
                      {isEditing ? (
                        <div className="px-4 py-2 space-y-2">
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[10px] text-gray-400 block mb-1">Reps</label>
                              <div className="flex items-center rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 overflow-hidden">
                                <button className="px-3 py-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-base font-bold"
                                  onClick={() => setEditReps(v => String(Math.max(0, (Number(v)||0) - 1)))}>–</button>
                                <span className="flex-1 text-center text-sm font-bold text-gray-900 dark:text-gray-100">{editReps || '—'}</span>
                                <button className="px-3 py-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-base font-bold"
                                  onClick={() => setEditReps(v => String((Number(v)||0) + 1))}>+</button>
                              </div>
                            </div>
                            <div>
                              <label className="text-[10px] text-gray-400 block mb-1">Peso (kg)</label>
                              <input type="number" step="0.5" min="0" value={editWeight}
                                onChange={e => setEditWeight(e.target.value)} placeholder="—"
                                className="w-full px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-center font-bold text-gray-900 dark:text-gray-100 outline-none focus:border-blue-300" />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <button onClick={() => setEditSetId(null)}
                              className="py-1.5 rounded-xl text-sm font-semibold text-gray-500 bg-gray-100 dark:bg-gray-800">
                              Annulla
                            </button>
                            <button onClick={updateSet} disabled={editSaving || !editReps.trim()}
                              className="py-1.5 rounded-xl text-sm font-semibold text-white disabled:opacity-40 flex items-center justify-center gap-1"
                              style={{ backgroundColor: CT }}>
                              {editSaving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} Salva
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div className="flex items-center gap-2 px-4 py-2">
                            <button
                              onClick={() => setLabelMenuSetId(id => id === s.id ? null : s.id)}
                              className="w-6 h-6 rounded-md text-[10px] font-bold flex items-center justify-center shrink-0"
                              style={isW ? { backgroundColor: C_WARM + '20', color: C_WARM } : { backgroundColor: CT + '18', color: CT }}>
                              {label}
                            </button>
                            {isW && <Flame size={10} style={{ color: C_WARM }} className="shrink-0" />}
                            <button className="flex-1 text-left text-sm text-gray-900 dark:text-gray-100"
                              onClick={() => openEdit(s)}>
                              {s.reps} reps{s.weight ? ` · ${s.weight} kg` : ''}
                            </button>
                            <button onClick={() => deleteSet(s.id)}
                              className="w-7 h-7 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/50 text-gray-300 hover:text-red-400 flex items-center justify-center transition-colors">
                              <Trash2 size={12} />
                            </button>
                          </div>
                          {labelMenuSetId === s.id && (
                            <div className="flex gap-1.5 px-4 pb-2">
                              {['D', 'S', 'DS', 'BO'].map(opt => (
                                <button key={opt}
                                  onClick={() => setLabelMenuSetId(null)}
                                  className="px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors hover:text-white"
                                  style={{ borderColor: CT, color: CT }}
                                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = CT)}
                                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}>
                                  {opt}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}

      {/* Scheda + week picker */}
      {showPicker && (
        <SchedaPickerPanel userId={userId} onPick={pickScheda} onClose={() => setShowPicker(false)} />
      )}

      {/* Timer bar */}
      {recTimer && (() => {
        const isCountdown = recTimer.mode === 'countdown'
        const done = isCountdown && recTimer.rem === 0
        const m = Math.floor(recTimer.rem / 60), sec = recTimer.rem % 60
        const label = `${m > 0 ? m + '\'' : ''}${String(sec).padStart(m > 0 ? 2 : 1, '0')}''`
        const pct = isCountdown && recTimer.init > 0 ? recTimer.rem / recTimer.init : 0
        return (
          <div className="fixed bottom-20 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none">
            <div className="bg-gray-900 dark:bg-gray-800 rounded-2xl shadow-2xl px-4 py-3 pointer-events-auto max-w-sm w-full">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: CT }}>
                  {isCountdown ? 'Timer' : 'Cronometro'}
                </span>
                <button onClick={() => { clearInterval(recRef.current); setRecTimer(null) }}
                  className="text-gray-500 hover:text-gray-300"><X size={11} /></button>
              </div>
              <div className="text-2xl font-bold text-white tabular-nums">{done ? 'FINE!' : label}</div>
              {isCountdown && (
                <div className="mt-1.5 h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-1000"
                    style={{ width: `${Math.round(pct * 100)}%`, backgroundColor: done ? '#6abf6a' : CT }} />
                </div>
              )}
              <div className="flex items-center gap-3 mt-2">
                <button onClick={() => setRecTimer(t => t ? { ...t, on: !t.on } : null)}
                  className="text-[10px] font-bold text-white/60 hover:text-white transition-colors">
                  {done ? '↺ Riavvia' : recTimer.on ? '⏸ Pausa' : '▶ Riprendi'}
                </button>
                {!isCountdown && (
                  <button onClick={() => setRecTimer(t => t ? { ...t, rem: 0, on: false } : null)}
                    className="text-[10px] font-bold text-white/40 hover:text-white transition-colors">
                    Reset
                  </button>
                )}
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
