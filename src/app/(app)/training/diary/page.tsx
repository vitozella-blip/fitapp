'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { Plus, Trash2, Dumbbell, Check, Flame, X, Loader2, ChevronDown, ChevronLeft, ChevronRight, FileText, StickyNote, Clock, Link2 } from 'lucide-react'
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
const SET_TAGS_KEY  = 'workout_set_tags_v1'
const PAIRS_KEY     = 'workout_pairs_v1'

type Exercise   = { id: string; name: string; muscleGroup: string }
type TemplateEx = { id: string; exercise: Exercise; sets: number; reps: string | null; restSeconds: number | null; noteScheda: string | null; notePersonali: string | null; isAbs: boolean }
type SchedaInfo = { id: string; name: string; weekId?: string | null; weekName?: string | null; exercises: TemplateEx[] }
type WorkoutSet = { id: string; setNumber: number; reps: number; weight: number | null; exerciseId: string; exercise: Exercise }
type Workout    = { id: string; sets: WorkoutSet[] }
type Template   = { id: string; name: string; exercises: TemplateEx[] }
type Plan       = { id: string; name: string; isActive?: boolean }
type Week       = { id: string; name: string; order: number }
type WeekParamRow = { weekId: string; templateExId: string; sets: number; reps: string | null; restSeconds: number | null }
type ExPair  = { partnerId: string; partnerName: string; type: 'SS' | 'JS' }
type AbsSel  = { id: string; type: 'SS' | 'JS' } // kept for localStorage back-compat

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

// ── Set grouping helpers ──────────────────────────────────────────────────────
type SetItem  = { s: WorkoutSet; isW: boolean; label: string }
type SetGroup = { key: string; type: string; items: SetItem[]; isGrouped: boolean }
const GROUP_TAGS = new Set(['SS', 'JS', 'MR', 'WD'])

function groupColor(type: string): string {
  if (type === 'JS') return '#9d8fcc'
  if (type === 'MR') return '#7dbf7d'
  if (type === 'WD') return '#e8a0a0'
  if (type === 'TSBO') return '#f0aa78'
  return CT
}

function groupSets(sets: WorkoutSet[], tags: Record<string, string>, warmupIds: Set<string>): SetGroup[] {
  let wIdx = 0, rIdx = 0
  const items: SetItem[] = sets.map(s => {
    const isW = warmupIds.has(s.id)
    return { s, isW, label: isW ? `R${++rIdx}` : `S${++wIdx}` }
  })
  const result: SetGroup[] = []
  let i = 0
  while (i < items.length) {
    const item = items[i]
    const tag = tags[item.s.id] ?? ''
    // D+S pairing: different side tags adjacent → group (not D+D or S+S)
    if ((tag === 'D' || tag === 'S') && i + 1 < items.length) {
      const nextTag = tags[items[i + 1].s.id] ?? ''
      if ((tag === 'D' && nextTag === 'S') || (tag === 'S' && nextTag === 'D')) {
        result.push({ key: item.s.id, type: 'DS', items: [item, items[i + 1]], isGrouped: true })
        i += 2; continue
      }
    }
    // TS+BO pairing: different tags adjacent → group (not TS+TS or BO+BO)
    if ((tag === 'TS' || tag === 'BO') && i + 1 < items.length) {
      const nextTag = tags[items[i + 1].s.id] ?? ''
      if ((tag === 'TS' && nextTag === 'BO') || (tag === 'BO' && nextTag === 'TS')) {
        result.push({ key: item.s.id, type: 'TSBO', items: [item, items[i + 1]], isGrouped: true })
        i += 2; continue
      }
    }
    // SS/JS/MR/WD: group consecutive same-tagged sets
    if (GROUP_TAGS.has(tag)) {
      const grp = [item]; let j = i + 1
      while (j < items.length && (tags[items[j].s.id] ?? '') === tag) { grp.push(items[j]); j++ }
      result.push({ key: item.s.id, type: tag, items: grp, isGrouped: grp.length > 1 })
      i = j; continue
    }
    result.push({ key: item.s.id, type: tag, items: [item], isGrouped: false })
    i++
  }
  return result
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
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left">
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
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left">
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
  const [showAllenamentoPicker, setShowAllenamentoPicker] = useState(false)
  const [schedaCollapsed, setSchedaCollapsed] = useState(false)
  const [warmups,    setWarmups]    = useState<Set<string>>(new Set())
  const [completed,  setCompleted]  = useState<Set<string>>(new Set())
  const [tennisLoading, setTennisLoading] = useState(false)
  const [expandedExId,  setExpandedExId]  = useState<string | null>(null)
  const [noteEdit, setNoteEdit] = useState<{ exId: string; teId: string; type: 'scheda' | 'personali'; text: string } | null>(null)
  const [noteSaving, setNoteSaving] = useState(false)
  const [recTimer,  setRecTimer]  = useState<{ mode: 'countdown' | 'stopwatch'; rem: number; init: number; on: boolean } | null>(null)
  const [timerPicker, setTimerPicker] = useState<string | null>(null)
  const recRef          = useRef<NodeJS.Timeout | undefined>(undefined)
  const pendingNextUpRef = useRef<string | null>(null)

  const [addExId,    setAddExId]    = useState<string | null>(null)
  const [formReps,   setFormReps]   = useState('')
  const [formWeight, setFormWeight] = useState('')
  const [formSaving, setFormSaving] = useState(false)

  const [editSetId,     setEditSetId]     = useState<string | null>(null)
  const [editReps,      setEditReps]      = useState('')
  const [editWeight,    setEditWeight]    = useState('')
  const [editSaving,    setEditSaving]    = useState(false)
  const [labelMenuSetId, setLabelMenuSetId] = useState<string | null>(null)
  const [setTags, setSetTagsRaw] = useState<Record<string, string>>(() => {
    try { return JSON.parse(localStorage.getItem(SET_TAGS_KEY) ?? '{}') } catch { return {} }
  })
  function setSetTags(fn: (prev: Record<string, string>) => Record<string, string>) {
    setSetTagsRaw(prev => {
      const next = fn(prev)
      try { localStorage.setItem(SET_TAGS_KEY, JSON.stringify(next)) } catch {}
      return next
    })
  }
  function setPairs(fn: (prev: Record<string, ExPair>) => Record<string, ExPair>) {
    setPairsRaw(prev => {
      const next = fn(prev)
      try { localStorage.setItem(PAIRS_KEY, JSON.stringify(next)) } catch {}
      return next
    })
  }
  function addPair(idA: string, nameA: string, idB: string, nameB: string, type: 'SS' | 'JS') {
    setPairs(prev => {
      // Remove any existing pair entries for or pointing to idA / idB
      const oldPartnerA = prev[idA]?.partnerId
      const oldPartnerB = prev[idB]?.partnerId
      const next: Record<string, ExPair> = {}
      for (const [k, v] of Object.entries(prev)) {
        if (k === idA || k === idB) continue
        if (oldPartnerA && k === oldPartnerA) continue
        if (oldPartnerB && k === oldPartnerB) continue
        next[k] = v
      }
      next[idA] = { partnerId: idB, partnerName: nameB, type }
      next[idB] = { partnerId: idA, partnerName: nameA, type }
      return next
    })
    setPairPickerExId(null)
  }
  function removePair(exId: string) {
    setPairs(prev => {
      const partnerId = prev[exId]?.partnerId
      // Remove all entries for or pointing to exId / partnerId (cleans up stale refs)
      const next: Record<string, ExPair> = {}
      for (const [k, v] of Object.entries(prev)) {
        if (k === exId || k === partnerId) continue
        if (v.partnerId === exId || (partnerId && v.partnerId === partnerId)) continue
        next[k] = v
      }
      return next
    })
  }
  function toggleAbsExercise(id: string) {
    setAbsExIds(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
      if (schedaInfo) {
        try { localStorage.setItem(`abs_sel_${schedaInfo.id}`, JSON.stringify(next)) } catch {}
      }
      return next
    })
  }

  const [absOptions, setAbsOptions] = useState<{ id: string; name: string; schedaName: string }[]>([])
  const [absExIds,   setAbsExIds]   = useState<string[]>([])
  const [absPickerOpen, setAbsPickerOpen] = useState(false)


  const [historyExId,   setHistoryExId]   = useState<string | null>(null)
  const [historyData,   setHistoryData]   = useState<{ date: string; sets: { id: string; reps: number; weight: number | null }[] } | null>(null)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [pairPickerExId, setPairPickerExId] = useState<string | null>(null)
  const [nextUpExId,     setNextUpExId]     = useState<string | null>(null)
  const [pairs, setPairsRaw] = useState<Record<string, ExPair>>(() => {
    try { return JSON.parse(localStorage.getItem(PAIRS_KEY) ?? '{}') } catch { return {} }
  })

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
    if (recTimer?.mode === 'countdown' && recTimer.rem === 0 && !recTimer.on && pendingNextUpRef.current) {
      setNextUpExId(pendingNextUpRef.current)
      pendingNextUpRef.current = null
    }
  }, [recTimer?.rem, recTimer?.on, recTimer?.mode])

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
    if (!schedaInfo) { setAbsOptions([]); setAbsExIds([]); return }
    try {
      const saved = JSON.parse(localStorage.getItem(`abs_sel_${schedaInfo.id}`) ?? '[]')
      // support both old format [{id,type}] and new format [string]
      setAbsExIds(Array.isArray(saved)
        ? saved.flatMap((x: unknown) => typeof x === 'string' ? [x] : (x && typeof x === 'object' && 'id' in x ? [(x as AbsSel).id] : []))
        : [])
    } catch { setAbsExIds([]) }
    ;(async () => {
      try {
        const plans: Plan[] = await fetch(`/api/workout-plans?userId=${userId}`).then(r => r.json())
        const allTmps: Template[] = (await Promise.all(
          plans.map(pl => fetch(`/api/workout-templates?planId=${pl.id}`).then(r => r.json()))
        )).flat()
        const seen = new Set<string>()
        const opts: { id: string; name: string; schedaName: string }[] = []
        allTmps.forEach(t => {
          t.exercises.forEach(te => {
            if (te.isAbs && !seen.has(te.exercise.id)) {
              seen.add(te.exercise.id)
              opts.push({ id: te.exercise.id, name: te.exercise.name, schedaName: t.name })
            }
          })
        })
        setAbsOptions(opts)
      } catch {}
    })()
  }, [schedaInfo, userId])

  async function pickScheda(t: Template, idx: number, weekId: string | null, weekName: string | null, weekOrder: number | null) {
    const color = SCHEDA_COLORS[idx % SCHEDA_COLORS.length]
    localStorage.setItem(`workout_scheda_${selectedDate}`, JSON.stringify({ templateId: t.id, name: t.name, order: idx + 1, color, weekId, weekName, weekOrder }))
    const merged = await mergeWeekParams(t.exercises, weekId)
    setSchedaInfo({ id: t.id, name: t.name, weekId, weekName, exercises: merged })
    setSchedaCollapsed(false)
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
    const pair = pairs[exId]
    if (pair) {
      if (pair.type === 'SS') {
        setNextUpExId(pair.partnerId)
      } else {
        pendingNextUpRef.current = pair.partnerId
        setRecTimer({ mode: 'countdown', rem: 60, init: 60, on: true })
      }
    }
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
    setAbsExIds([])
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
    if (nextUpExId === exId) setNextUpExId(null)
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

  const schedaExIds = new Set([
    ...(schedaInfo?.exercises ?? []).map(te => te.exercise.id),
    ...absExIds,
  ])
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

  const allExercisesForPicker: { id: string; name: string }[] = [
    ...(schedaInfo?.exercises.filter(te => !te.isAbs).map(te => ({ id: te.exercise.id, name: te.exercise.name })) ?? []),
    ...absExIds.map(id => ({ id, name: absOptions.find(o => o.id === id)?.name ?? id })),
    ...Object.entries(extraGrouped).map(([eId, { name }]) => ({ id: eId, name })),
  ]

  const swipe = useDateSwipe(selectedDate, handleDateChange)

  return (
    <div className="space-y-3 max-w-2xl mx-auto md:max-w-none" {...swipe}>
      <PageHeader title="Diario Workout" icon={Dumbbell} accent="training"
        action={
          <div className="flex items-center gap-1.5">
            <button onClick={() => setShowAllenamentoPicker(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-white text-sm font-semibold"
              style={{ backgroundColor: CT }}>
              <Plus size={15} /> Allenamento
            </button>
          </div>
        }
      />

      <DateNav selectedDate={selectedDate} onChange={handleDateChange} accent={CT} schedaColor={getSchedaColor(selectedDate) ?? undefined} />

      {/* Empty state */}
      {!hasAny && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-8 text-center shadow-sm">
          <Dumbbell size={28} className="mx-auto mb-3" style={{ color: CT + '80' }} />
          <p className="text-gray-500 font-medium text-sm">Nessun allenamento oggi</p>
          <p className="text-xs text-gray-400 mt-1">Scegli una scheda o aggiungi Tennis per iniziare</p>
        </div>
      )}

      {/* Tennis pill */}
      {tennisActive && (
        <div className="px-4 py-2.5 rounded-2xl flex items-center gap-2" style={{ backgroundColor: C_TENNIS + '22' }}>
          <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: C_TENNIS }} />
          <span className="text-sm font-bold truncate flex-1" style={{ color: '#5a8a5a' }}>Tennis</span>
          <button onClick={toggleTennis} disabled={tennisLoading}
            className="w-6 h-6 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 transition-colors shrink-0 disabled:opacity-50">
            <X size={13} />
          </button>
        </div>
      )}

      {/* Scheda header band (collapsible) */}
      {schedaInfo && (
        <button onClick={() => setSchedaCollapsed(c => !c)}
          className="w-full px-4 py-2.5 rounded-2xl flex items-center gap-2 text-left"
          style={{ backgroundColor: schedaColor + '22' }}>
          <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: schedaColor }} />
          <span className="text-sm font-bold truncate flex-1" style={{ color: schedaColor }}>{schedaInfo.name}</span>
          {schedaInfo.weekName && (
            <span className="text-xs font-semibold shrink-0" style={{ color: schedaColor + 'cc' }}>
              {schedaInfo.weekName}
            </span>
          )}
          <ChevronDown size={14} className={cn('shrink-0 transition-transform', schedaCollapsed && 'rotate-180')}
            style={{ color: schedaColor + 'cc' }} />
          <span onClick={e => { e.stopPropagation(); removeScheda() }}
            role="button"
            className="w-6 h-6 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 transition-colors shrink-0">
            <X size={13} />
          </span>
        </button>
      )}

      {/* Scheda exercises */}
      {schedaInfo && !schedaCollapsed && (() => {
        const filteredExes = schedaInfo.exercises.filter(te => !te.isAbs)
        const renderCard = (te: TemplateEx) => {
        const exId = te.exercise.id
        const exSets  = workoutSets
          .filter(s => s.exerciseId === exId)
          .sort((a, b) => {
            const aW = warmups.has(a.id) ? 0 : 1
            const bW = warmups.has(b.id) ? 0 : 1
            if (aW !== bW) return aW - bW
            return a.setNumber - b.setNumber
          })
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
                const hTag = hS ? setTags[hS.id] : undefined
                const cTag = cS ? setTags[cS.id] : undefined
                return (
                  <div key={`R${i+1}`} className="grid grid-cols-[1.5rem_1fr_1px_1fr] gap-x-2 py-0.5 items-center">
                    <span className="text-[10px] font-bold text-center" style={{ color: C_WARM }}>R{i+1}</span>
                    <span className="text-[11px] text-center text-gray-400">{hS ? fmt(hS) : '—'}{hTag && <span className="ml-1 text-[9px] font-bold" style={{ color: '#9ca3af' }}>{hTag}</span>}</span>
                    <div className="self-stretch bg-gray-100 dark:bg-gray-800" />
                    <div className="relative flex items-center justify-center" style={{ color: cS ? CT : '#9ca3af' }}>
                      {cTag && <span className="absolute left-0 text-[9px] font-bold">{cTag}</span>}
                      <span className="text-[12px] font-bold">{cS ? fmt({ reps: cS.reps, weight: cS.weight }) : '—'}</span>
                    </div>
                  </div>
                )
              })}
              {Array.from({ length: maxS }, (_, i) => {
                const hS = hWork[i]; const cS = currWork[i]
                const hTag = hS ? setTags[hS.id] : undefined
                const cTag = cS ? setTags[cS.id] : undefined
                return (
                  <div key={`S${i+1}`} className="grid grid-cols-[1.5rem_1fr_1px_1fr] gap-x-2 py-0.5 items-center">
                    <span className="text-[10px] font-bold text-center" style={{ color: CT }}>S{i+1}</span>
                    <span className="text-[11px] text-center text-gray-400">{hS ? fmt(hS) : '—'}{hTag && <span className="ml-1 text-[9px] font-bold" style={{ color: '#9ca3af' }}>{hTag}</span>}</span>
                    <div className="self-stretch bg-gray-100 dark:bg-gray-800" />
                    <div className="relative flex items-center justify-center" style={{ color: cS ? CT : '#9ca3af' }}>
                      {cTag && <span className="absolute left-0 text-[9px] font-bold">{cTag}</span>}
                      <span className="text-[12px] font-bold">{cS ? fmt({ reps: cS.reps, weight: cS.weight }) : '—'}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )
        })()

        return (
          <div key={te.id}
            className={cn('bg-white dark:bg-gray-800 border rounded-2xl overflow-hidden transition-colors shadow-sm',
              nextUpExId === exId ? 'border-blue-300 dark:border-blue-500' :
              isDone ? 'border-green-200/60 dark:border-green-800/60' : 'border-gray-200 dark:border-gray-700')}>

            {/* Next-up banner (superset/jumpset) */}
            {nextUpExId === exId && (
              <div className="px-4 py-1.5 flex items-center justify-between"
                style={{ backgroundColor: CT + '28' }}>
                <span className="text-[11px] font-bold animate-pulse" style={{ color: CT }}>↑ VAI ORA</span>
                <button onClick={() => setNextUpExId(null)} className="text-gray-400 hover:text-gray-600"><X size={11} /></button>
              </div>
            )}

            {/* Pairing badge */}
            {pairs[exId] && (
              <div className="flex items-center gap-1.5 px-4 py-1 border-b border-gray-50 dark:border-gray-800">
                <Link2 size={9} style={{ color: CT }} />
                <span className="text-[10px] font-bold" style={{ color: CT }}>{pairs[exId].type}</span>
                <span className="text-[10px] text-gray-400 flex-1 truncate">↔ {pairs[exId].partnerName}</span>
                <button onClick={() => removePair(exId)} className="text-gray-300 hover:text-red-400"><X size={10} /></button>
              </div>
            )}

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
                <p className="font-semibold text-sm truncate text-gray-900 dark:text-gray-100">
                  {te.exercise.name}
                </p>
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
              <button onClick={() => setPairPickerExId(p => p === te.id ? null : te.id)}
                className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors"
                style={pairs[exId] || pairPickerExId === te.id ? { backgroundColor: CT + '20', color: CT } : { color: '#d1d5db' }}>
                <Link2 size={14} />
              </button>
              <button onClick={() => openAdd(exId, te.reps)}
                className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors text-white"
                style={{ backgroundColor: addOpen ? CT : CT + '99' }}>
                <Plus size={15} />
              </button>
            </div>

            {/* Pair picker panel */}
            {pairPickerExId === te.id && (
              <div className="border-t border-gray-100 dark:border-gray-800 px-4 py-3">
                <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-2">Collega con...</p>
                {allExercisesForPicker.filter(e => e.id !== exId).length === 0
                  ? <p className="text-xs text-gray-400">Nessun altro esercizio</p>
                  : <div className="space-y-1.5">
                      {allExercisesForPicker.filter(e => e.id !== exId).map(e => (
                        <div key={e.id} className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gray-50 dark:bg-gray-800">
                          <span className="flex-1 text-xs text-gray-700 dark:text-gray-300 truncate">{e.name}</span>
                          <button onClick={() => addPair(exId, te.exercise.name, e.id, e.name, 'SS')}
                            className="px-2 py-1 rounded-lg text-[10px] font-bold border"
                            style={{ borderColor: CT, color: CT }}>SS</button>
                          <button onClick={() => addPair(exId, te.exercise.name, e.id, e.name, 'JS')}
                            className="px-2 py-1 rounded-lg text-[10px] font-bold border"
                            style={{ borderColor: '#9d8fcc', color: '#9d8fcc' }}>JS</button>
                        </div>
                      ))}
                    </div>
                }
              </div>
            )}

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
                  <div className="border-t border-gray-50 dark:border-gray-800">
                    {groupSets(exSets, setTags, warmups).map((group, gi) => (
                      <div key={group.key}
                        className={cn(gi > 0 && 'border-t border-gray-50 dark:border-gray-800', group.isGrouped && 'border-l-2 ml-2')}
                        style={group.isGrouped ? { borderLeftColor: groupColor(group.type) } : {}}>
                        {group.items.map(({ s, isW, label }, ii) => {
                      const isEditing = editSetId === s.id
                      return (
                        <div key={s.id} className={cn(ii > 0 && 'border-t border-gray-50 dark:border-gray-800')}>
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
                                {setTags[s.id] && (
                                  <span className="text-[10px] font-bold shrink-0" style={{ color: CT }}>{setTags[s.id]}</span>
                                )}
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
                                <div className="flex flex-wrap gap-1.5 px-4 pb-2">
                                  {['D', 'S', 'DS', 'BO', 'TS', 'PR', 'MR', 'WD'].map(opt => {
                                    const active = setTags[s.id] === opt
                                    return (
                                      <button key={opt}
                                        onClick={() => {
                                          setSetTags(prev => {
                                            const next = { ...prev }
                                            if (active) delete next[s.id]; else next[s.id] = opt
                                            return next
                                          })
                                          setLabelMenuSetId(null)
                                        }}
                                        className="px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors"
                                        style={active
                                          ? { backgroundColor: CT, borderColor: CT, color: '#fff' }
                                          : { borderColor: CT, color: CT }}>
                                        {opt}
                                      </button>
                                    )
                                  })}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )
                        })}
                      </div>
                    ))}
                  </div>
                ) : null)}
              </div>
            )}

          </div>
        )
        }
        // ── Scheda exercise groups ────────────────────────────────────────
        const seen1 = new Set<string>()
        const schedaCards = filteredExes.flatMap(te => {
          const exId = te.exercise.id
          if (seen1.has(exId)) return []
          const pair = pairs[exId]
          const partnerTe = pair ? filteredExes.find(x => x.exercise.id === pair.partnerId) : null
          if (partnerTe) {
            seen1.add(exId); seen1.add(pair!.partnerId)
            const color = pair!.type === 'JS' ? '#9d8fcc' : CT
            return [(
              <div key={te.id + '_pg'} className="border-l-2 space-y-2" style={{ borderLeftColor: color }}>
                {renderCard(te)}
                {renderCard(partnerTe)}
              </div>
            )]
          }
          seen1.add(exId)
          return [renderCard(te)]
        })

        // ── ABS exercise groups ───────────────────────────────────────────
        const absTes: TemplateEx[] = absExIds
          .map(id => absOptions.find(o => o.id === id))
          .filter((o): o is { id: string; name: string; schedaName: string } => !!o)
          .map(o => ({
            id: `abs_${o.id}`,
            exercise: { id: o.id, name: o.name, muscleGroup: '' },
            sets: 0, reps: null, restSeconds: null, noteScheda: null, notePersonali: null, isAbs: true,
          }))
        const seen2 = new Set<string>()
        const absCards = absTes.flatMap(te => {
          const exId = te.exercise.id
          if (seen2.has(exId)) return []
          const pair = pairs[exId]
          const partnerTe = pair ? absTes.find(x => x.exercise.id === pair.partnerId) : null
          if (partnerTe) {
            seen2.add(exId); seen2.add(pair!.partnerId)
            const color = pair!.type === 'JS' ? '#9d8fcc' : CT
            return [(
              <div key={te.id + '_pg'} className="border-l-2 space-y-2" style={{ borderLeftColor: color }}>
                {renderCard(te)}
                {renderCard(partnerTe)}
              </div>
            )]
          }
          seen2.add(exId)
          return [renderCard(te)]
        })

        return (
          <>
            {schedaCards}
            {absCards}

            {/* ABS picker */}
            <div className="bg-white dark:bg-gray-800 border border-dashed border-gray-300 dark:border-gray-600 rounded-2xl overflow-hidden shadow-sm">
              <button className="w-full flex items-center gap-2 px-4 py-3"
                onClick={() => setAbsPickerOpen(p => !p)}>
                <span className="text-xs font-bold" style={{ color: schedaColor }}>ABS</span>
                <span className="flex-1 text-xs text-gray-400 text-left">
                  {absExIds.length > 0
                    ? absExIds.map(id => absOptions.find(o => o.id === id)?.name ?? id).join(' · ')
                    : 'Seleziona esercizi addominali'}
                </span>
                <ChevronDown size={14} className={cn('text-gray-400 transition-transform', absPickerOpen && 'rotate-180')} />
              </button>
              {absPickerOpen && (
                <div className="border-t border-gray-100 dark:border-gray-800 px-4 py-3 space-y-1">
                  {absOptions.map(o => {
                    const isSelected = absExIds.includes(o.id)
                    return (
                      <div key={o.id} className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gray-50 dark:bg-gray-800">
                        <span className="flex-1 text-xs text-gray-700 dark:text-gray-300 truncate">{o.name}</span>
                        <button onClick={() => toggleAbsExercise(o.id)}
                          className="px-2 py-1 rounded-lg text-[10px] font-bold border transition-colors"
                          style={isSelected
                            ? { backgroundColor: schedaColor, borderColor: schedaColor, color: '#fff' }
                            : { borderColor: schedaColor, color: schedaColor }}>
                          {isSelected ? '✓' : '+'}
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </>
        )
      })()}

      {/* Extra exercises (not in scheda) */}
      {Object.entries(extraGrouped).map(([exId, { name, group, sets }]) => {
        const compKey = `${selectedDate}_${exId}`
        const isDone  = completed.has(compKey)
        const isOpen  = expandedExId === exId
        let workIdx = 0, warmIdx = 0
        return (
          <div key={exId}
            className={cn('bg-white dark:bg-gray-800 border rounded-2xl overflow-hidden transition-colors shadow-sm',
              nextUpExId === exId ? 'border-blue-300 dark:border-blue-500' :
              isDone ? 'border-green-200/60 dark:border-green-800/60' : 'border-gray-200 dark:border-gray-700')}>
            {nextUpExId === exId && (
              <div className="px-4 py-1.5 flex items-center justify-between" style={{ backgroundColor: CT + '28' }}>
                <span className="text-[11px] font-bold animate-pulse" style={{ color: CT }}>↑ VAI ORA</span>
                <button onClick={() => setNextUpExId(null)} className="text-gray-400 hover:text-gray-600"><X size={11} /></button>
              </div>
            )}
            {pairs[exId] && (
              <div className="flex items-center gap-1.5 px-4 py-1 border-b border-gray-50 dark:border-gray-800">
                <Link2 size={9} style={{ color: CT }} />
                <span className="text-[10px] font-bold" style={{ color: CT }}>{pairs[exId].type}</span>
                <span className="text-[10px] text-gray-400 flex-1 truncate">↔ {pairs[exId].partnerName}</span>
                <button onClick={() => removePair(exId)} className="text-gray-300 hover:text-red-400"><X size={10} /></button>
              </div>
            )}
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
              <button onClick={() => setPairPickerExId(p => p === exId ? null : exId)}
                className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors"
                style={pairs[exId] || pairPickerExId === exId ? { backgroundColor: CT + '20', color: CT } : { color: '#d1d5db' }}>
                <Link2 size={13} />
              </button>
              <button onClick={() => deleteExerciseSets(exId, sets)}
                className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors text-gray-300 hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50">
                <Trash2 size={13} />
              </button>
            </div>
            {pairPickerExId === exId && (
              <div className="border-t border-gray-100 dark:border-gray-800 px-4 py-3">
                <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-2">Collega con...</p>
                {allExercisesForPicker.filter(e => e.id !== exId).length === 0
                  ? <p className="text-xs text-gray-400">Nessun altro esercizio</p>
                  : <div className="space-y-1.5">
                      {allExercisesForPicker.filter(e => e.id !== exId).map(e => (
                        <div key={e.id} className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gray-50 dark:bg-gray-800">
                          <span className="flex-1 text-xs text-gray-700 dark:text-gray-300 truncate">{e.name}</span>
                          <button onClick={() => addPair(exId, name, e.id, e.name, 'SS')}
                            className="px-2 py-1 rounded-lg text-[10px] font-bold border"
                            style={{ borderColor: CT, color: CT }}>SS</button>
                          <button onClick={() => addPair(exId, name, e.id, e.name, 'JS')}
                            className="px-2 py-1 rounded-lg text-[10px] font-bold border"
                            style={{ borderColor: '#9d8fcc', color: '#9d8fcc' }}>JS</button>
                        </div>
                      ))}
                    </div>
                }
              </div>
            )}
            {isOpen && (
              <div className="border-t border-gray-50 dark:border-gray-800 divide-y divide-gray-50 dark:divide-gray-800">
                {sets.map(s => {
                  const isW  = warmups.has(s.id)
                  const label = isW ? `R${++warmIdx}` : `S${++workIdx}`
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
                            <div className="flex flex-wrap gap-1.5 px-4 pb-2">
                              {['D', 'S', 'DS', 'BO', 'TS', 'PR', 'MR', 'WD'].map(opt => {
                                const active = setTags[s.id] === opt
                                return (
                                  <button key={opt}
                                    onClick={() => {
                                      setSetTags(prev => {
                                        const next = { ...prev }
                                        if (active) delete next[s.id]; else next[s.id] = opt
                                        return next
                                      })
                                      setLabelMenuSetId(null)
                                    }}
                                    className="px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors"
                                    style={active
                                      ? { backgroundColor: CT, borderColor: CT, color: '#fff' }
                                      : { borderColor: CT, color: CT }}>
                                    {opt}
                                  </button>
                                )
                              })}
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

      {/* Allenamento type picker */}
      {showAllenamentoPicker && (
        <div className="fixed inset-0 z-40 flex items-end" onClick={() => setShowAllenamentoPicker(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-t-3xl w-full shadow-xl px-5 py-6"
            onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 rounded-full bg-gray-200 dark:bg-gray-700 mx-auto mb-5" />
            <p className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-4">Aggiungi allenamento</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => { toggleTennis(); setShowAllenamentoPicker(false) }}
                className={cn('flex flex-col items-center gap-2 py-5 rounded-2xl border-2 transition-colors',
                  tennisActive ? 'border-[#a8d8a8]' : 'border-gray-200 dark:border-gray-700')}
                style={tennisActive ? { backgroundColor: C_TENNIS + '22' } : {}}>
                <span className="text-2xl">🎾</span>
                <span className="text-sm font-bold" style={{ color: tennisActive ? '#5a8a5a' : undefined }}>Tennis</span>
                {tennisActive && <span className="text-[10px] text-green-600 font-semibold">Attivo · rimuovi</span>}
              </button>
              <button
                onClick={() => { setShowPicker(true); setShowAllenamentoPicker(false) }}
                className={cn('flex flex-col items-center gap-2 py-5 rounded-2xl border-2 transition-colors',
                  schedaInfo ? '' : 'border-gray-200 dark:border-gray-700')}
                style={schedaInfo ? { borderColor: schedaColor, backgroundColor: schedaColor + '18' } : {}}>
                <Dumbbell size={24} style={{ color: schedaInfo ? schedaColor : '#9ca3af' }} />
                <span className="text-sm font-bold" style={{ color: schedaInfo ? schedaColor : undefined }}>Palestra</span>
                {schedaInfo
                  ? <span className="text-[10px] font-semibold truncate px-2" style={{ color: schedaColor + 'bb' }}>{schedaInfo.name}</span>
                  : <span className="text-[10px] text-gray-400">Scegli scheda</span>}
              </button>
            </div>
          </div>
        </div>
      )}

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
