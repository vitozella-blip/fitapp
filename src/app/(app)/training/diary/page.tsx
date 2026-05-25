'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { Plus, Trash2, Dumbbell, Check, Minus, Flame, X, Loader2, ChevronDown, ChevronLeft, ChevronRight, FileText, StickyNote, Clock, Link2, Play, Pause, RotateCcw, Timer } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { PageHeader } from '@/components/shared/PageHeader'
import { DateNav } from '@/components/shared/DateNav'
import { cn } from '@/lib/utils'
import { useRefreshOnFocus } from '@/hooks/useRefreshOnFocus'
import { useDateSwipe } from '@/hooks/useDateSwipe'
import { WorkoutBadge, SCHEDA_COLORS } from '@/components/training/WorkoutBadge'

const CT            = '#7aafc8'
const C_WARM        = '#f0aa78'
const C_TENNIS      = '#6aaa6a'
const TENNIS_NAME   = 'Tennis'

function schedaAbbrev(name: string) {
  return name
    .replace(/^(workout|wo)\s*\d+\s*[—–\-]\s*/i, '')
    .split(/[\s+]+/)
    .filter(w => /[a-zA-Z]/.test(w))
    .map(w => w[0].toUpperCase())
    .join('')
}
const WARMUP_KEY    = 'workout_warmup_v1'
const COMPLETED_KEY = 'workout_completed_v1'
const SET_TAGS_KEY  = 'workout_set_tags_v1'
const PAIRS_KEY     = 'workout_pairs_v1'
const EX_STATUS_KEY = 'workout_ex_status_v2'
type ExStatus = 'done' | 'partial' | 'skipped'

type Exercise   = { id: string; name: string; muscleGroup: string }
type TemplateEx = { id: string; exercise: Exercise; sets: number; reps: string | null; restSeconds: number | null; noteScheda: string | null; notePersonali: string | null; isAbs: boolean }
type SchedaInfo = { id: string; name: string; weekId?: string | null; weekName?: string | null; exercises: TemplateEx[] }
type WorkoutSet = { id: string; setNumber: number; reps: number; weight: number | null; exerciseId: string; isWarmup?: boolean; tag?: string; exercise: Exercise }
type Workout    = { id: string; sets: WorkoutSet[] }
type Template   = { id: string; name: string; exercises: TemplateEx[] }
type Plan       = { id: string; name: string; isActive?: boolean }
type Week       = { id: string; name: string; order: number }
type WeekParamRow = { weekId: string; templateExId: string; sets: number; reps: string | null; restSeconds: number | null }
type ExPair  = { partnerId: string; partnerName: string; type: 'SS' | 'JS' }
type AbsSel  = { id: string; type: 'SS' | 'JS' }

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
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm">
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
            className="w-8 h-8 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400 shrink-0">
            <X size={16} />
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
                  <WorkoutBadge color={color} shapeIdx={i} size={36} />
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
  const [tennisCollapsed, setTennisCollapsed] = useState(true)
  const [tennisMeta, setTennisMetaRaw] = useState<{ type: 'allenamento' | 'partita'; hours: string }>({ type: 'partita', hours: '' })
  const [warmups,    setWarmups]    = useState<Set<string>>(new Set())
  const [exStatus,   setExStatus]   = useState<Record<string, ExStatus>>({})
  const [tennisLoading, setTennisLoading] = useState(false)
  const [expandedExId,  setExpandedExId]  = useState<string | null>(null)
  const [noteEdit, setNoteEdit] = useState<{ exId: string; teId: string; type: 'scheda' | 'personali'; text: string } | null>(null)
  const [noteSaving, setNoteSaving] = useState(false)
  const [recTimer,  setRecTimer]  = useState<{
    mode: 'countdown' | 'stopwatch'
    rem: number; init: number; on: boolean
    endTs?: number    // absolute ms when countdown ends (background sync)
    startTs?: number  // absolute ms offset for stopwatch (Date.now() - elapsed)
  } | null>(null)
  const [timerSheet, setTimerSheet] = useState<{ teId: string; defaultSec: number | null } | null>(null)
  const [timerSheetMin, setTimerSheetMin] = useState(0)
  const [timerSheetSec, setTimerSheetSec] = useState(30)
  const recRef          = useRef<NodeJS.Timeout | undefined>(undefined)
  const pendingNextUpRef = useRef<string | null>(null)
  const recTimerRef     = useRef<typeof recTimer>(null)
  const vibratedRef     = useRef(false)
  const checkLpMap      = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  const [addExId,       setAddExId]       = useState<string | null>(null)
  const [formReps,      setFormReps]      = useState('')
  const [formTargetReps, setFormTargetReps] = useState('')
  const [formWeight,    setFormWeight]    = useState('')
  const [formTag,       setFormTag]       = useState('')
  const [tagPickerOpen, setTagPickerOpen] = useState(false)
  const [formSaving,    setFormSaving]    = useState(false)

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
      // Detect the changed set ID and sync to DB
      const allKeys = new Set([...Object.keys(prev), ...Object.keys(next)])
      for (const k of allKeys) {
        if (prev[k] !== next[k]) {
          fetch(`/api/workout/set/${k}`, {
            method: 'PATCH', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tag: next[k] ?? null }),
          }).catch(() => {})
          break
        }
      }
      return next
    })
  }
  function setPairs(fn: (prev: Record<string, ExPair>) => Record<string, ExPair>) {
    setPairsRaw(prev => {
      const next = fn(prev)
      try { localStorage.setItem(PAIRS_KEY, JSON.stringify(next)) } catch {}
      fetch('/api/exercise-pairs', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, pairs: next }),
      }).catch(() => {})
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
  function toggleAbsExercise(id: string, type: 'SS' | 'JS' = 'SS') {
    setAbsExIds(prev => {
      const existing = prev.find(x => x.id === id)
      const next = existing?.type === type
        ? prev.filter(x => x.id !== id)
        : existing
          ? prev.map(x => x.id === id ? { ...x, type } : x)
          : [...prev, { id, type }]
      if (schedaInfo) {
        try { localStorage.setItem(`abs_sel_${schedaInfo.id}`, JSON.stringify(next)) } catch {}
        fetch('/api/abs-selections', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, templateId: schedaInfo.id, selections: next }),
        }).catch(() => {})
      }
      return next
    })
  }

  const [absOptions, setAbsOptions] = useState<{ id: string; name: string; schedaName: string }[]>([])
  const [absExIds,   setAbsExIds]   = useState<AbsSel[]>([])
  const [absPickerOpen, setAbsPickerOpen] = useState(false)

  // Sync ABS pairs whenever selection or options change
  useEffect(() => {
    if (absOptions.length === 0) return
    const absOptionIds = new Set(absOptions.map(o => o.id))
    setPairs(prev => {
      const cleaned: Record<string, ExPair> = {}
      for (const [k, v] of Object.entries(prev)) {
        if (!absOptionIds.has(k) && !absOptionIds.has(v.partnerId)) cleaned[k] = v
      }
      const ssSels = absExIds.filter(x => x.type === 'SS')
      const jsSels = absExIds.filter(x => x.type === 'JS')
      for (let i = 0; i + 1 < ssSels.length; i += 2) {
        const a = ssSels[i], b = ssSels[i + 1]
        const aName = absOptions.find(o => o.id === a.id)?.name ?? a.id
        const bName = absOptions.find(o => o.id === b.id)?.name ?? b.id
        cleaned[a.id] = { partnerId: b.id, partnerName: bName, type: 'SS' }
        cleaned[b.id] = { partnerId: a.id, partnerName: aName, type: 'SS' }
      }
      for (let i = 0; i + 1 < jsSels.length; i += 2) {
        const a = jsSels[i], b = jsSels[i + 1]
        const aName = absOptions.find(o => o.id === a.id)?.name ?? a.id
        const bName = absOptions.find(o => o.id === b.id)?.name ?? b.id
        cleaned[a.id] = { partnerId: b.id, partnerName: bName, type: 'JS' }
        cleaned[b.id] = { partnerId: a.id, partnerName: aName, type: 'JS' }
      }
      return cleaned
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [absExIds, absOptions])

  const [historyExId,   setHistoryExId]   = useState<string | null>(null)
  const [historyData,   setHistoryData]   = useState<{ date: string; sets: { id: string; reps: number; weight: number | null }[] } | null>(null)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyDates,  setHistoryDates]  = useState<string[]>([])
  const [historySelDate, setHistorySelDate] = useState<string | null>(null)
  const [pairPickerExId, setPairPickerExId] = useState<string | null>(null)
  const [nextUpExId,     setNextUpExId]     = useState<string | null>(null)
  const [pairs, setPairsRaw] = useState<Record<string, ExPair>>(() => {
    try { return JSON.parse(localStorage.getItem(PAIRS_KEY) ?? '{}') } catch { return {} }
  })

  useEffect(() => {
    setWarmups(loadSet(WARMUP_KEY))
    fetch(`/api/exercise-completion?userId=${userId}`)
      .then(r => r.json())
      .then((arr: string[]) => {
        const merged: Record<string, ExStatus> = {}
        arr.forEach((k: string) => { merged[k] = 'done' })
        try {
          const local = JSON.parse(localStorage.getItem(EX_STATUS_KEY) ?? '{}')
          for (const k of Object.keys(local)) { if (!merged[k]) merged[k] = local[k] }
        } catch {}
        setExStatus(merged)
      })
      .catch(() => {
        try { setExStatus(JSON.parse(localStorage.getItem(EX_STATUS_KEY) ?? '{}')) } catch {}
      })
  }, [userId])

  // Load pairs from API (authoritative), fallback to localStorage
  useEffect(() => {
    fetch(`/api/exercise-pairs?userId=${userId}`)
      .then(r => r.json())
      .then((dbPairs: Record<string, { partnerId: string; partnerName: string; type: 'SS' | 'JS' }>) => {
        if (Object.keys(dbPairs).length > 0) setPairsRaw(dbPairs)
      })
      .catch(() => {})
  }, [userId])

  const fetchWorkout = useCallback(async () => {
    const r = await fetch(`/api/workout?userId=${userId}&date=${selectedDate}`)
    const w: Workout = await r.json()
    setWorkout(w)
    if (w?.sets) {
      // Merge DB isWarmup/tag with localStorage (DB wins for each set)
      const dbWarmups = new Set(w.sets.filter(s => s.isWarmup).map(s => s.id))
      setWarmups(prev => new Set([...prev, ...dbWarmups]))
      const dbTags = Object.fromEntries(w.sets.filter(s => s.tag).map(s => [s.id, s.tag as string]))
      if (Object.keys(dbTags).length > 0) setSetTagsRaw(prev => ({ ...prev, ...dbTags }))
    }
  }, [userId, selectedDate])

  useEffect(() => { fetchWorkout() }, [fetchWorkout])
  useRefreshOnFocus(fetchWorkout)

  // Keep ref in sync for visibilitychange handler
  useEffect(() => { recTimerRef.current = recTimer }, [recTimer])

  // Trigger superset next-up when countdown ends
  useEffect(() => {
    if (recTimer?.mode === 'countdown' && recTimer.rem === 0 && !recTimer.on && pendingNextUpRef.current) {
      setNextUpExId(pendingNextUpRef.current)
      pendingNextUpRef.current = null
    }
  }, [recTimer?.rem, recTimer?.on, recTimer?.mode])

  // Vibrate on countdown end (once per completion)
  useEffect(() => {
    const done = recTimer?.mode === 'countdown' && recTimer.rem === 0 && !recTimer.on
    if (done && !vibratedRef.current) {
      vibratedRef.current = true
      try { navigator.vibrate?.([300, 100, 300, 100, 600]) } catch {}
    }
    if (!done) vibratedRef.current = false
  }, [recTimer?.rem, recTimer?.on, recTimer?.mode])

  // Tick — use timestamps for background accuracy
  useEffect(() => {
    clearInterval(recRef.current)
    if (!recTimer?.on) return
    recRef.current = setInterval(() => {
      setRecTimer(t => {
        if (!t) { clearInterval(recRef.current); return null }
        if (t.mode === 'stopwatch') {
          const rem = t.startTs != null ? Math.round((Date.now() - t.startTs) / 1000) : t.rem + 1
          return { ...t, rem }
        }
        const rem = t.endTs != null ? Math.max(0, Math.ceil((t.endTs - Date.now()) / 1000)) : Math.max(0, t.rem - 1)
        if (rem <= 0) { clearInterval(recRef.current); return { ...t, rem: 0, on: false } }
        return { ...t, rem }
      })
    }, 500)
    return () => clearInterval(recRef.current)
  }, [recTimer?.on])

  // Resync when app returns from background
  useEffect(() => {
    function onVisible() {
      if (document.hidden) return
      const t = recTimerRef.current
      if (!t?.on) return
      setRecTimer(prev => {
        if (!prev?.on) return prev
        if (prev.mode === 'countdown' && prev.endTs) {
          const rem = Math.max(0, Math.ceil((prev.endTs - Date.now()) / 1000))
          return { ...prev, rem, on: rem > 0 }
        }
        if (prev.mode === 'stopwatch' && prev.startTs != null) {
          return { ...prev, rem: Math.round((Date.now() - prev.startTs) / 1000) }
        }
        return prev
      })
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [])


  function openTimerSheet(teId: string, defaultSec: number | null) {
    const sec = defaultSec ?? 90
    setTimerSheetMin(Math.floor(sec / 60))
    setTimerSheetSec(sec % 60)
    setTimerSheet({ teId, defaultSec })
  }
  function startCountdown(totalSec: number) {
    clearInterval(recRef.current)
    setRecTimer({ mode: 'countdown', rem: totalSec, init: totalSec, on: true, endTs: Date.now() + totalSec * 1000 })
    setTimerSheet(null)
  }
  function startStopwatch() {
    clearInterval(recRef.current)
    setRecTimer({ mode: 'stopwatch', rem: 0, init: 0, on: true, startTs: Date.now() })
    setTimerSheet(null)
  }

  function setTennisMeta(update: Partial<{ type: 'allenamento' | 'partita'; hours: string }>) {
    setTennisMetaRaw(prev => {
      const next = { ...prev, ...update }
      try { localStorage.setItem(`tennis_meta_${selectedDate}`, JSON.stringify(next)) } catch {}
      fetch('/api/tennis-session', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, date: selectedDate, type: next.type, hours: next.hours }),
      }).catch(() => {})
      return next
    })
  }

  // Load tennis meta when date changes — DB authoritative, localStorage fallback
  useEffect(() => {
    setTennisCollapsed(true)
    fetch(`/api/tennis-session?userId=${userId}&date=${selectedDate}`)
      .then(r => r.json())
      .then(dbMeta => {
        if (dbMeta) {
          setTennisMetaRaw(dbMeta)
          try { localStorage.setItem(`tennis_meta_${selectedDate}`, JSON.stringify(dbMeta)) } catch {}
        } else {
          try {
            const raw = localStorage.getItem(`tennis_meta_${selectedDate}`)
            setTennisMetaRaw(raw ? JSON.parse(raw) : { type: 'partita', hours: '' })
          } catch { setTennisMetaRaw({ type: 'partita', hours: '' }) }
        }
      })
      .catch(() => {
        try {
          const raw = localStorage.getItem(`tennis_meta_${selectedDate}`)
          setTennisMetaRaw(raw ? JSON.parse(raw) : { type: 'partita', hours: '' })
        } catch { setTennisMetaRaw({ type: 'partita', hours: '' }) }
      })
  }, [selectedDate, userId])

  // Load scheda + week params — DB authoritative, localStorage fallback
  useEffect(() => {
    setSchedaInfo(null)
    if (typeof window === 'undefined') return

    async function loadScheda(info: { templateId: string; weekId?: string | null; weekName?: string | null }) {
      const t: Template = await fetch(`/api/workout-templates/${info.templateId}`).then(r => r.json())
      if (!t?.id) return
      const merged = await mergeWeekParams(t.exercises, info.weekId ?? null)
      setSchedaInfo({ id: t.id, name: t.name, weekId: info.weekId ?? null, weekName: info.weekName ?? null, exercises: merged })
    }

    // Load from DB first
    fetch(`/api/workout-scheda?userId=${userId}&date=${selectedDate}`)
      .then(r => r.json())
      .then(async dbInfo => {
        if (dbInfo?.templateId) {
          try {
            await loadScheda(dbInfo)
            // Sync back to localStorage
            try { localStorage.setItem(`workout_scheda_${selectedDate}`, JSON.stringify(dbInfo)) } catch {}
          } catch {}
        } else {
          // Fallback to localStorage
          try {
            const raw = localStorage.getItem(`workout_scheda_${selectedDate}`)
            if (!raw) return
            const info = JSON.parse(raw)
            if (info.templateId) await loadScheda(info)
          } catch {}
        }
      })
      .catch(async () => {
        // On network error, use localStorage
        try {
          const raw = localStorage.getItem(`workout_scheda_${selectedDate}`)
          if (!raw) return
          const info = JSON.parse(raw)
          if (info.templateId) await loadScheda(info)
        } catch {}
      })
  }, [selectedDate, userId])

  useEffect(() => {
    if (!schedaInfo) { setAbsOptions([]); setAbsExIds([]); return }
    // Load abs selections from DB (authoritative), fallback to localStorage
    fetch(`/api/abs-selections?userId=${userId}&templateId=${schedaInfo.id}`)
      .then(r => r.json())
      .then((dbSels: { id: string; type: string }[]) => {
        if (dbSels.length > 0) {
          setAbsExIds(dbSels as AbsSel[])
        } else {
          try {
            const saved = JSON.parse(localStorage.getItem(`abs_sel_${schedaInfo.id}`) ?? '[]')
            setAbsExIds(Array.isArray(saved) ? saved.filter((x: unknown) => x && typeof x === 'object' && 'id' in x && 'type' in x) : [])
          } catch { setAbsExIds([]) }
        }
      })
      .catch(() => {
        try {
          const saved = JSON.parse(localStorage.getItem(`abs_sel_${schedaInfo.id}`) ?? '[]')
          setAbsExIds(Array.isArray(saved) ? saved.filter((x: unknown) => x && typeof x === 'object' && 'id' in x && 'type' in x) : [])
        } catch { setAbsExIds([]) }
      })
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
    const schedaPayload = { templateId: t.id, name: t.name, order: idx + 1, color, weekId, weekName, weekOrder }
    localStorage.setItem(`workout_scheda_${selectedDate}`, JSON.stringify(schedaPayload))
    fetch('/api/workout-scheda', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, date: selectedDate, ...schedaPayload }),
    }).catch(() => {})
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
      body: JSON.stringify({ userId, date: selectedDate, exerciseId: exId, sets: 1, reps: Number(formReps), weight: formWeight ? Number(formWeight) : null, weekId: schedaInfo?.weekId ?? null, isWarmup }),
    })
    const r = await fetch(`/api/workout?userId=${userId}&date=${selectedDate}`)
    const w: Workout = await r.json()
    const prevIds = new Set((workout?.sets ?? []).map(s => s.id))
    const newSet  = (w?.sets ?? []).find(s => !prevIds.has(s.id) && s.exerciseId === exId)
    if (newSet) {
      if (isWarmup) {
        const nw = new Set(warmups); nw.add(newSet.id)
        setWarmups(nw); saveSet(WARMUP_KEY, nw)
      }
      if (formTag) {
        setSetTags(prev => ({ ...prev, [newSet.id]: formTag }))
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
    setFormReps(formTargetReps); setFormWeight('')
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

  function cycleStatus(exerciseId: string) {
    const key     = `${selectedDate}_${exerciseId}`
    const current = exStatus[key]
    const next: ExStatus | null =
      !current ? 'done' : current === 'done' ? 'partial' : current === 'partial' ? 'skipped' : null
    setExStatus(prev => {
      const updated = { ...prev }
      if (next) updated[key] = next; else delete updated[key]
      try { localStorage.setItem(EX_STATUS_KEY, JSON.stringify(updated)) } catch {}
      return updated
    })
    fetch('/api/exercise-completion', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, date: selectedDate, exerciseId, completed: next === 'done' }),
    }).catch(() => {})
    bumpWorkoutVersion()
  }

  function removeScheda() {
    localStorage.removeItem(`workout_scheda_${selectedDate}`)
    fetch(`/api/workout-scheda?userId=${userId}&date=${selectedDate}`, { method: 'DELETE' }).catch(() => {})
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
    if (historyExId === exId) {
      setHistoryExId(null); setHistoryData(null)
      setHistoryDates([]); setHistorySelDate(null)
      return
    }
    setHistoryExId(exId)
    setHistoryData(null)
    setHistoryDates([])
    setHistorySelDate(null)
    setHistoryLoading(true)
    try {
      const dates: string[] = await fetch(
        `/api/workout/exercise-history?userId=${userId}&exerciseId=${exerciseId}&dates=1`
      ).then(r => r.json())
      const past = dates.filter(d => d < selectedDate)
      setHistoryDates(past)
      const target = past[0] ?? null
      setHistorySelDate(target)
      if (target) {
        const r = await fetch(`/api/workout/exercise-history?userId=${userId}&exerciseId=${exerciseId}&date=${target}`)
        setHistoryData(await r.json())
      }
    } catch {}
    setHistoryLoading(false)
  }

  async function selectHistoryDate(exerciseId: string, date: string) {
    setHistorySelDate(date)
    setHistoryData(null)
    setHistoryLoading(true)
    try {
      const r = await fetch(`/api/workout/exercise-history?userId=${userId}&exerciseId=${exerciseId}&date=${date}`)
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
    const num = targetReps?.match(/\d+/)?.[0] ?? ''
    setFormTargetReps(num)
    if (!isSame) { setFormReps(num); setFormWeight(''); setFormTag(''); setTagPickerOpen(false) }
  }

  const allSets    = (workout?.sets ?? []).filter(Boolean)
  const tennisSets = allSets.filter(s => s.exercise?.name === TENNIS_NAME)
  const tennisActive = tennisSets.length > 0
  const workoutSets  = allSets.filter(s => s.exercise?.name !== TENNIS_NAME)

  const schedaExIds = new Set([
    ...(schedaInfo?.exercises ?? []).map(te => te.exercise.id),
    ...absExIds.map(x => x.id),
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
        body: JSON.stringify({ userId, date: selectedDate, exerciseId: ex.id, sets: 1, reps: 1, weight: null, weekId: schedaInfo?.weekId ?? null }),
      })
    }
    await fetchWorkout(); setTennisLoading(false); bumpWorkoutVersion()
  }

  const schedaColor = getSchedaColor(selectedDate) ?? CT
  const hasAny = schedaInfo || Object.keys(extraGrouped).length > 0 || tennisActive

  const allExercisesForPicker: { id: string; name: string }[] = [
    ...(schedaInfo?.exercises.filter(te => !te.isAbs).map(te => ({ id: te.exercise.id, name: te.exercise.name })) ?? []),
    ...absExIds.map(({ id }) => ({ id, name: absOptions.find(o => o.id === id)?.name ?? id })),
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

      {/* Tennis pill (collapsible) */}
      {tennisActive && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden shadow-sm">
          <div className="px-4 py-2.5 flex items-center gap-2" style={{ backgroundColor: C_TENNIS + '22' }}>
            <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: C_TENNIS }} />
            <button className="text-sm font-bold flex-1 text-left uppercase tracking-wide" style={{ color: C_TENNIS }}
              onClick={() => setTennisCollapsed(c => !c)}>
              Tennis{tennisMeta.type ? ` — ${tennisMeta.type}` : ''}{tennisMeta.hours ? <span className="normal-case font-semibold"> {tennisMeta.hours}h</span> : ''}
            </button>
            <button onClick={toggleTennis} disabled={tennisLoading}
              className="w-6 h-6 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 transition-colors shrink-0 disabled:opacity-50">
              <X size={13} />
            </button>
          </div>
          {!tennisCollapsed && (
            <div className="px-4 pb-3 space-y-2 border-t border-gray-100 dark:border-gray-700">
              <div className="flex gap-2 pt-2">
                {(['partita', 'allenamento'] as const).map(t => (
                  <button key={t} onClick={() => setTennisMeta({ type: t })}
                    className="flex-1 py-2 rounded-xl text-sm font-semibold border transition-colors capitalize"
                    style={tennisMeta.type === t
                      ? { backgroundColor: C_TENNIS, borderColor: C_TENNIS, color: '#fff' }
                      : { borderColor: '#e5e7eb', color: '#6b7280' }}>
                    {t}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-gray-500 dark:text-gray-400 shrink-0">Ore</span>
                <input type="number" min="0" max="24" step="0.5"
                  value={tennisMeta.hours}
                  onChange={e => setTennisMeta({ hours: e.target.value })}
                  placeholder="—"
                  className="flex-1 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-center outline-none bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:border-gray-400" />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Scheda exercises */}
      {schedaInfo && (() => {
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
        const exSt    = exStatus[compKey]
        const isDone  = exSt === 'done'
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
              {historyDates.length > 1 && (
                <div className="flex gap-1 flex-wrap pb-2">
                  {historyDates.map(d => {
                    const label = new Date(d + 'T12:00:00').toLocaleDateString('it-IT', { day: 'numeric', month: 'short' }).toUpperCase()
                    const active = d === historySelDate
                    return (
                      <button key={d}
                        onClick={() => selectHistoryDate(exId, d)}
                        className="px-2 py-1 rounded-lg text-[10px] font-bold border transition-colors"
                        style={active
                          ? { backgroundColor: CT, borderColor: CT, color: '#fff' }
                          : { borderColor: CT + '60', color: CT }}>
                        {label}
                      </button>
                    )
                  })}
                </div>
              )}
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
            className={cn('transition-colors',
              nextUpExId === exId ? 'bg-blue-50/40 dark:bg-blue-950/20' :
              (isOpen || addOpen) ? 'bg-[#7aafc8]/[0.07] dark:bg-[#7aafc8]/[0.08]' :
              exSt === 'done'    ? 'bg-green-50/30 dark:bg-green-950/10' :
              exSt === 'partial' ? 'bg-amber-50/30 dark:bg-amber-950/10' :
              exSt === 'skipped' ? 'bg-gray-100/60 dark:bg-gray-800/60' : '')}>

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
              <button
                onClick={() => cycleStatus(exId)}
                className="w-6 h-6 rounded-md flex items-center justify-center shrink-0 transition-all border"
                style={
                  exSt === 'done'    ? { backgroundColor: '#7dbf7d', borderColor: 'transparent', color: '#fff' } :
                  exSt === 'partial' ? { backgroundColor: '#f0aa78', borderColor: 'transparent', color: '#fff' } :
                  exSt === 'skipped' ? { backgroundColor: '#94a3b8', borderColor: 'transparent', color: '#fff' } :
                  { borderColor: '#d1d5db' }
                }>
                {exSt === 'done'    && <Check  size={12} />}
                {exSt === 'partial' && <Minus  size={12} />}
                {exSt === 'skipped' && <X      size={12} />}
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
                style={pairs[exId] || pairPickerExId === te.id ? { backgroundColor: CT + '20', color: CT } : { color: '#9ca3af' }}>
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
                          <button onClick={() => {
                              if (pairs[exId]?.partnerId === e.id && pairs[exId]?.type === 'SS') { removePair(exId); setPairPickerExId(null) }
                              else addPair(exId, te.exercise.name, e.id, e.name, 'SS')
                            }}
                            className="px-2 py-1 rounded-lg text-[10px] font-bold border transition-colors"
                            style={pairs[exId]?.partnerId === e.id && pairs[exId]?.type === 'SS'
                              ? { backgroundColor: CT, borderColor: CT, color: '#fff' }
                              : { borderColor: CT, color: CT }}>SS</button>
                          <button onClick={() => {
                              if (pairs[exId]?.partnerId === e.id && pairs[exId]?.type === 'JS') { removePair(exId); setPairPickerExId(null) }
                              else addPair(exId, te.exercise.name, e.id, e.name, 'JS')
                            }}
                            className="px-2 py-1 rounded-lg text-[10px] font-bold border transition-colors"
                            style={pairs[exId]?.partnerId === e.id && pairs[exId]?.type === 'JS'
                              ? { backgroundColor: '#9d8fcc', borderColor: '#9d8fcc', color: '#fff' }
                              : { borderColor: '#9d8fcc', color: '#9d8fcc' }}>JS</button>
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
                <div className="px-4 pt-2.5 pb-0">
                  {/* Stats row: SET · REP · REC */}
                  <div className="grid grid-cols-3 mb-2">
                    <div className="flex flex-col items-center gap-0.5">
                      <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400">Set</p>
                      <p className="text-xs font-bold" style={{ color: CT }}>{te.sets}</p>
                    </div>
                    <div className="flex flex-col items-center gap-0.5 border-x border-gray-100 dark:border-gray-800">
                      <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400">Rep</p>
                      <p className="text-xs font-bold" style={{ color: CT }}>{te.reps || '—'}</p>
                    </div>
                    <div className="flex flex-col items-center gap-0.5">
                      <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400">Rec</p>
                      <button
                        className="text-xs font-bold leading-none"
                        style={{ color: CT }}
                        onClick={() => openTimerSheet(te.id, te.restSeconds ?? null)}
                      >{rest || '—'}</button>
                    </div>
                  </div>
                </div>
                {/* Actions row: full-width icon bar */}
                <div className="grid grid-cols-4 border-t border-gray-100 dark:border-gray-800">
                  <button
                    className="flex items-center justify-center py-3"
                    onClick={() => setNoteEdit(n => n?.exId === te.id && n.type === 'scheda' ? null : { exId: te.id, teId: te.id, type: 'scheda', text: te.noteScheda ?? '' })}
                    title="Note scheda">
                    <StickyNote size={16} style={{ color: te.noteScheda ? (noteEdit?.exId === te.id && noteEdit.type === 'scheda' ? '#e8924a' : '#f0aa78') : '#d1d5db' }} />
                  </button>
                  <button
                    className="flex items-center justify-center py-3 border-l border-gray-100 dark:border-gray-800"
                    onClick={() => setNoteEdit(n => n?.exId === te.id && n.type === 'personali' ? null : { exId: te.id, teId: te.id, type: 'personali', text: te.notePersonali ?? '' })}
                    title="Note personali">
                    <StickyNote size={16} style={{ color: te.notePersonali ? (noteEdit?.exId === te.id && noteEdit.type === 'personali' ? '#7b6db0' : '#9d8fcc') : '#d1d5db' }} />
                  </button>
                  <button
                    className="flex items-center justify-center py-3 border-l border-gray-100 dark:border-gray-800"
                    onClick={() => openTimerSheet(te.id, te.restSeconds ?? null)}
                    title="Cronometro / Timer">
                    <Clock size={16} style={{ color: timerSheet?.teId === te.id || recTimer ? CT : '#d1d5db' }} />
                  </button>
                  <button
                    className="flex items-center justify-center py-3 border-l border-gray-100 dark:border-gray-800 transition-colors"
                    onClick={() => toggleHistory(te.id, exId)}
                    title="Carichi sessione precedente">
                    <Dumbbell size={16} style={{ color: historyExId === te.id ? CT : '#d1d5db' }} />
                  </button>
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


                {/* Add set form */}
                {addOpen && (
                  <div className="border-2 rounded-xl mx-2 mb-2 px-3 py-3 flex flex-col gap-2" style={{ borderColor: CT, backgroundColor: CT + '18' }}>
                    <div className="grid grid-cols-2 gap-2">
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
                    </div>
                    {tagPickerOpen && (
                      <div className="flex gap-1 flex-wrap">
                        {['D', 'S', 'DS', 'BO', 'TS', 'PR', 'MR', 'WD'].map(tag => (
                          <button key={tag} onClick={() => { setFormTag(t => t === tag ? '' : tag); setTagPickerOpen(false) }}
                            className="px-2 py-1 rounded-md text-[10px] font-bold transition-colors"
                            style={formTag === tag
                              ? { backgroundColor: CT, color: '#fff' }
                              : { backgroundColor: CT + '20', color: CT }}>
                            {tag}
                          </button>
                        ))}
                      </div>
                    )}
                    <div className="grid grid-cols-3 gap-2">
                      <button onClick={() => setTagPickerOpen(o => !o)}
                        className="py-2 rounded-lg text-xs font-bold flex items-center justify-center transition-colors"
                        style={formTag
                          ? { backgroundColor: CT, color: '#fff' }
                          : { backgroundColor: CT + '20', color: CT }}>
                        {formTag || 'Tag'}
                      </button>
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
                  </div>
                )}

                {/* Logged sets — comparison view when history active, normal list otherwise */}
                {historyView ?? (exSets.length > 0 ? (
                  <div className="border-t border-gray-50 dark:border-gray-800">
                    {groupSets(exSets, setTags, warmups).map((group, gi) => {
                      // ── helper: renders one set row (no left padding when grouped) ──
                      const renderSetRow = ({ s, isW, label }: { s: WorkoutSet; isW: boolean; label: string }, showIndividualTag: boolean) => {
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
                                  {showIndividualTag && setTags[s.id] && (
                                    <span className="text-[10px] font-bold shrink-0 px-1.5 py-0.5 rounded border" style={{ color: CT, borderColor: CT + '99', backgroundColor: CT + '18' }}>{setTags[s.id]}</span>
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
                      }

                      const anyEditing = group.isGrouped && group.items.some(i => editSetId === i.s.id)

                      return (
                        <div key={group.key} className={cn(gi > 0 && 'border-t border-gray-50 dark:border-gray-800')}>
                          {group.isGrouped && !anyEditing ? (
                            // Grouped: CSS grid — [set btn | spanning badge | reps | trash]
                            <div className="grid" style={{ gridTemplateColumns: 'auto auto 1fr auto', gridTemplateRows: `repeat(${group.items.length}, auto)` }}>
                              {/* Spanning badge — col 2, all rows */}
                              <div
                                style={{ gridColumn: 2, gridRow: `1 / span ${group.items.length}`, color: CT, borderColor: CT + '99', backgroundColor: CT + '18' }}
                                className="flex flex-col mx-1.5 my-px rounded border shrink-0 w-7">
                                {group.items.map((item, idx) => (
                                  <span key={idx} className="flex-1 flex items-center justify-center text-[9px] font-bold leading-none">{setTags[item.s.id] ?? ''}</span>
                                ))}
                              </div>
                              {group.items.map(({ s, isW, label }, ii) => [
                                // col 1: set button — h-10 fixed height
                                <div key={`${s.id}-l`} style={{ gridColumn: 1, gridRow: ii + 1 }}
                                  className={cn('flex items-center gap-1 pl-4 h-10 pr-0', ii > 0 && 'border-t border-gray-50 dark:border-gray-800')}>
                                  <button onClick={() => setLabelMenuSetId(id => id === s.id ? null : s.id)}
                                    className="w-6 h-6 rounded-md text-[10px] font-bold flex items-center justify-center shrink-0"
                                    style={isW ? { backgroundColor: C_WARM + '20', color: C_WARM } : { backgroundColor: CT + '18', color: CT }}>
                                    {label}
                                  </button>
                                  {isW && <Flame size={10} style={{ color: C_WARM }} className="shrink-0" />}
                                </div>,
                                // col 3: reps — h-10 fixed height
                                <button key={`${s.id}-r`} style={{ gridColumn: 3, gridRow: ii + 1 }}
                                  className={cn('flex items-center h-10 pl-1 text-left text-sm text-gray-900 dark:text-gray-100', ii > 0 && 'border-t border-gray-50 dark:border-gray-800')}
                                  onClick={() => openEdit(s)}>
                                  {s.reps} reps{s.weight ? ` · ${s.weight} kg` : ''}
                                </button>,
                                // col 4: trash — h-10 fixed height
                                <div key={`${s.id}-t`} style={{ gridColumn: 4, gridRow: ii + 1 }}
                                  className={cn('flex items-center h-10 pr-4', ii > 0 && 'border-t border-gray-50 dark:border-gray-800')}>
                                  <button onClick={() => deleteSet(s.id)}
                                    className="w-7 h-7 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/50 text-gray-300 hover:text-red-400 flex items-center justify-center transition-colors">
                                    <Trash2 size={12} />
                                  </button>
                                </div>,
                                // label menu — full width below its row
                                labelMenuSetId === s.id && (
                                  <div key={`${s.id}-menu`} style={{ gridColumn: '1 / -1' }}
                                    className="flex flex-wrap gap-1.5 px-4 pb-2">
                                    {['D', 'S', 'DS', 'BO', 'TS', 'PR', 'MR', 'WD'].map(opt => {
                                      const active = setTags[s.id] === opt
                                      return (
                                        <button key={opt}
                                          onClick={() => { setSetTags(prev => { const next = { ...prev }; if (active) delete next[s.id]; else next[s.id] = opt; return next }); setLabelMenuSetId(null) }}
                                          className="px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors"
                                          style={active ? { backgroundColor: CT, borderColor: CT, color: '#fff' } : { borderColor: CT, color: CT }}>
                                          {opt}
                                        </button>
                                      )
                                    })}
                                  </div>
                                ),
                              ])}
                            </div>
                          ) : (
                            // Ungrouped or editing: flat render
                            group.items.map(item => renderSetRow(item, !group.isGrouped))
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
              <div key={te.id + '_pg'} className="border-l-4 divide-y divide-gray-100 dark:divide-gray-700" style={{ borderLeftColor: color }}>
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
          .map(x => absOptions.find(o => o.id === x.id))
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
              <div key={te.id + '_pg'} className="border-l-4 divide-y divide-gray-100 dark:divide-gray-700" style={{ borderLeftColor: color }}>
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
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden shadow-sm">
            {/* Scheda header */}
            <div className="flex items-center gap-2 px-4 py-2.5 cursor-pointer"
              style={{ backgroundColor: schedaColor + '22' }}
              onClick={() => setSchedaCollapsed(c => !c)}>
              <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: schedaColor }} />
              <span className="text-sm font-bold truncate flex-1 text-left" style={{ color: schedaColor }}>
                {schedaInfo.name}
              </span>
              {schedaInfo.weekName && (
                <span className="text-xs font-semibold shrink-0" style={{ color: schedaColor + 'cc' }}>
                  {schedaInfo.weekName}
                </span>
              )}
              <button onClick={e => { e.stopPropagation(); removeScheda() }}
                className="w-6 h-6 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 transition-colors shrink-0">
                <X size={13} />
              </button>
            </div>

            {/* Exercise rows (hidden when collapsed) */}
            {!schedaCollapsed && (
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {schedaCards}
                {absCards}
              </div>
            )}
          </div>

          {/* ABS picker — standalone dashed card */}
          {!schedaCollapsed && (
            <div className="bg-white dark:bg-gray-800 border border-dashed border-gray-300 dark:border-gray-600 rounded-2xl overflow-hidden shadow-sm">
              <button className="w-full flex items-center gap-2 px-4 py-3"
                onClick={() => setAbsPickerOpen(p => !p)}>
                <span className="text-xs font-bold" style={{ color: schedaColor }}>ABS</span>
                <span className="flex-1 text-xs text-gray-400 text-left">
                  {absExIds.length > 0
                    ? absExIds.map(x => absOptions.find(o => o.id === x.id)?.name ?? x.id).join(' · ')
                    : 'Seleziona esercizi addominali'}
                </span>
                <ChevronDown size={14} className={cn('text-gray-400 transition-transform', absPickerOpen && 'rotate-180')} />
              </button>
              {absPickerOpen && (
                <div className="border-t border-gray-100 dark:border-gray-800 px-4 py-3 space-y-1">
                  {absOptions.map(o => {
                    const isSelected = absExIds.some(x => x.id === o.id)
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
          )}
          </>
        )
      })()}

      {/* ABS section — disabled, abs cards now inside scheda card */}
      {false && schedaInfo && (() => {
        return (
          <>
            {absExIds.map(({ id: absId, type: absType }) => {
              const opt = absOptions.find(o => o.id === absId)
              if (!opt) return null
              const exId = absId
              const exSets = workoutSets
                .filter(s => s.exerciseId === exId)
                .sort((a, b) => {
                  const aW = warmups.has(a.id) ? 0 : 1
                  const bW = warmups.has(b.id) ? 0 : 1
                  if (aW !== bW) return aW - bW
                  return Number(a.id) - Number(b.id)
                })
              const compKey = `${selectedDate}_${exId}`
              const isDone = completed.has(compKey)
              const isOpen = expandedExId === exId
              const addOpen = addExId === exId
              let workIdx = 0, warmIdx = 0
              return (
                <div key={exId}
                  className={cn('bg-white dark:bg-gray-900 border rounded-2xl overflow-hidden transition-colors',
                    nextUpExId === exId ? 'border-blue-300 dark:border-blue-600' :
                    (isOpen || addOpen) ? 'border-[#7aafc8]/60 dark:border-[#7aafc8]/40' :
                    isDone ? 'border-green-200/60 dark:border-green-900/40' : 'border-gray-100 dark:border-gray-800')}>
                  {nextUpExId === exId && (
                    <div className="px-4 py-1.5 flex items-center justify-between" style={{ backgroundColor: schedaColor + '28' }}>
                      <span className="text-[11px] font-bold animate-pulse" style={{ color: schedaColor }}>↑ VAI ORA</span>
                      <button onClick={() => setNextUpExId(null)} className="text-gray-400 hover:text-gray-600"><X size={11} /></button>
                    </div>
                  )}
                  {pairs[exId] && (
                    <div className="flex items-center gap-1.5 px-4 py-1 border-b border-gray-50 dark:border-gray-800">
                      <Link2 size={9} style={{ color: schedaColor }} />
                      <span className="text-[10px] font-bold" style={{ color: schedaColor }}>{pairs[exId].type}</span>
                      <span className="text-[10px] text-gray-400 flex-1 truncate">↔ {pairs[exId].partnerName}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 px-4 py-3">
                    <button onClick={() => toggleCompleted(exId)}
                      className={cn('w-6 h-6 rounded-md flex items-center justify-center shrink-0 transition-colors border',
                        isDone ? 'border-transparent text-white' : 'border-gray-200 dark:border-gray-700 hover:border-gray-400')}
                      style={isDone ? { backgroundColor: '#7dbf7d' } : {}}>
                      {isDone && <Check size={13} />}
                    </button>
                    <button className="flex-1 min-w-0 text-left"
                      onClick={() => { setExpandedExId(id => id === exId ? null : exId); setAddExId(null) }}>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                          style={{ backgroundColor: schedaColor + '20', color: schedaColor }}>
                          {absType}
                        </span>
                        <p className="font-semibold text-sm truncate text-gray-900 dark:text-gray-100">{opt.name}</p>
                      </div>
                      {exSets.length > 0 && (
                        <p className="text-[10px] mt-0.5" style={{ color: schedaColor }}>{exSets.length} eseguiti</p>
                      )}
                    </button>
                    {exSets.length > 0 && (
                      <button onClick={() => deleteExerciseSets(exId, exSets)}
                        className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-gray-300 hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50">
                        <Trash2 size={15} />
                      </button>
                    )}
                    <button onClick={() => openAdd(exId, null)}
                      className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-white"
                      style={{ backgroundColor: addOpen ? schedaColor : schedaColor + '99' }}>
                      <Plus size={15} />
                    </button>
                  </div>
                  {isOpen && (
                    <div className="border-t border-gray-50 dark:border-gray-800">
                      {addOpen && (
                        <div className="border-t border-gray-100 dark:border-gray-800 px-3 py-2 flex flex-col gap-2">
                          <div className="grid grid-cols-2 gap-1.5">
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
                          </div>
                          {tagPickerOpen && (
                            <div className="flex gap-1 flex-wrap">
                              {['D', 'S', 'DS', 'BO', 'TS', 'PR', 'MR', 'WD'].map(tag => (
                                <button key={tag} onClick={() => { setFormTag(t => t === tag ? '' : tag); setTagPickerOpen(false) }}
                                  className="px-2 py-1 rounded-md text-[10px] font-bold transition-colors"
                                  style={formTag === tag
                                    ? { backgroundColor: schedaColor, color: '#fff' }
                                    : { backgroundColor: (schedaColor ?? CT) + '20', color: schedaColor ?? CT }}>
                                  {tag}
                                </button>
                              ))}
                            </div>
                          )}
                          <div className="grid grid-cols-3 gap-1.5">
                            <button onClick={() => setTagPickerOpen(o => !o)}
                              className="py-2 rounded-lg text-xs font-bold flex items-center justify-center transition-colors"
                              style={formTag
                                ? { backgroundColor: schedaColor, color: '#fff' }
                                : { backgroundColor: (schedaColor ?? CT) + '20', color: schedaColor ?? CT }}>
                              {formTag || 'Tag'}
                            </button>
                            <button onClick={() => addSet(exId, true)} disabled={formSaving || !formReps.trim()}
                              className="py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 disabled:opacity-40"
                              style={{ backgroundColor: C_WARM + '20', color: C_WARM }}>
                              <Flame size={11} /> Risc.
                            </button>
                            <button onClick={() => addSet(exId, false)} disabled={formSaving || !formReps.trim()}
                              className="py-2 rounded-lg text-white text-xs font-semibold flex items-center justify-center gap-1 disabled:opacity-40"
                              style={{ backgroundColor: schedaColor }}>
                              {formSaving ? <Loader2 size={11} className="animate-spin" /> : <Plus size={11} />} Serie
                            </button>
                          </div>
                        </div>
                      )}
                      {exSets.length > 0 && (
                        <div className="divide-y divide-gray-50 dark:divide-gray-800 border-t border-gray-50 dark:border-gray-800">
                          {exSets.map(s => {
                            const isW = warmups.has(s.id)
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
                                        style={{ backgroundColor: schedaColor }}>
                                        {editSaving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} Salva
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <div>
                                    <div className="flex items-center gap-2 px-4 py-2">
                                      <button onClick={() => setLabelMenuSetId(id => id === s.id ? null : s.id)}
                                        className="w-6 h-6 rounded-md text-[10px] font-bold flex items-center justify-center shrink-0"
                                        style={isW ? { backgroundColor: C_WARM + '20', color: C_WARM } : { backgroundColor: schedaColor + '18', color: schedaColor }}>
                                        {label}
                                      </button>
                                      {isW && <Flame size={10} style={{ color: C_WARM }} className="shrink-0" />}
                                      {setTags[s.id] && (
                                        <span className="text-[10px] font-bold shrink-0 px-1.5 py-0.5 rounded border" style={{ color: schedaColor, borderColor: schedaColor + '99', backgroundColor: schedaColor + '18' }}>{setTags[s.id]}</span>
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
                                        {['D', 'S', 'DS', 'BO', 'TS', 'SS', 'JS', 'PR', 'MR', 'WD'].map(opt => {
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
                                                ? { backgroundColor: schedaColor, borderColor: schedaColor, color: '#fff' }
                                                : { borderColor: schedaColor, color: schedaColor }}>
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
                  )}
                </div>
              )
            })}

          </>
        )
      })()}

      {/* Extra exercises (not in scheda) */}
      {Object.entries(extraGrouped).map(([exId, { name, group, sets }]) => {
        const compKey = `${selectedDate}_${exId}`
        const exSt    = exStatus[compKey]
        const isDone  = exSt === 'done'
        const isOpen  = expandedExId === exId
        let workIdx = 0, warmIdx = 0
        return (
          <div key={exId}
            className={cn('bg-white dark:bg-gray-800 border rounded-2xl overflow-hidden transition-colors shadow-sm',
              nextUpExId === exId ? 'border-blue-300 dark:border-blue-500' :
              exSt === 'done'    ? 'border-green-200/60 dark:border-green-800/60' :
              exSt === 'partial' ? 'border-amber-200/60 dark:border-amber-800/60' :
              exSt === 'skipped' ? 'border-gray-300/60 dark:border-gray-600/60' :
              'border-gray-200 dark:border-gray-700')}>
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
              <button onClick={() => cycleStatus(exId)}
                className="w-6 h-6 rounded-md flex items-center justify-center shrink-0 transition-all border"
                style={
                  exSt === 'done'    ? { backgroundColor: '#7dbf7d', borderColor: 'transparent', color: '#fff' } :
                  exSt === 'partial' ? { backgroundColor: '#f0aa78', borderColor: 'transparent', color: '#fff' } :
                  exSt === 'skipped' ? { backgroundColor: '#94a3b8', borderColor: 'transparent', color: '#fff' } :
                  { borderColor: '#d1d5db' }
                }>
                {exSt === 'done'    && <Check  size={12} />}
                {exSt === 'partial' && <Minus  size={12} />}
                {exSt === 'skipped' && <X      size={12} />}
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
                          <button onClick={() => {
                              if (pairs[exId]?.partnerId === e.id && pairs[exId]?.type === 'SS') { removePair(exId); setPairPickerExId(null) }
                              else addPair(exId, name, e.id, e.name, 'SS')
                            }}
                            className="px-2 py-1 rounded-lg text-[10px] font-bold border transition-colors"
                            style={pairs[exId]?.partnerId === e.id && pairs[exId]?.type === 'SS'
                              ? { backgroundColor: CT, borderColor: CT, color: '#fff' }
                              : { borderColor: CT, color: CT }}>SS</button>
                          <button onClick={() => {
                              if (pairs[exId]?.partnerId === e.id && pairs[exId]?.type === 'JS') { removePair(exId); setPairPickerExId(null) }
                              else addPair(exId, name, e.id, e.name, 'JS')
                            }}
                            className="px-2 py-1 rounded-lg text-[10px] font-bold border transition-colors"
                            style={pairs[exId]?.partnerId === e.id && pairs[exId]?.type === 'JS'
                              ? { backgroundColor: '#9d8fcc', borderColor: '#9d8fcc', color: '#fff' }
                              : { borderColor: '#9d8fcc', color: '#9d8fcc' }}>JS</button>
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
        <div className="fixed inset-0 z-40 flex items-center justify-center backdrop-blur-sm bg-black/40 px-6">
          <div className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-sm shadow-2xl px-5 py-6"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div className="w-8" />
              <h2 className="font-bold text-gray-900 dark:text-gray-100 flex-1 text-center">Aggiungi allenamento</h2>
              <button onClick={() => setShowAllenamentoPicker(false)} className="w-8 h-8 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400 shrink-0"><X size={16} /></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => { toggleTennis(); setShowAllenamentoPicker(false) }}
                className="flex flex-col items-center gap-2 py-5 rounded-2xl border-2 transition-colors"
                style={tennisActive
                  ? { borderColor: C_TENNIS, backgroundColor: C_TENNIS + '22' }
                  : { borderColor: '#e5e7eb' }}>
                <span className="text-2xl">🎾</span>
                <span className="text-sm font-bold" style={{ color: tennisActive ? C_TENNIS : undefined }}>Tennis</span>
              </button>
              <button
                onClick={() => { setShowPicker(true); setShowAllenamentoPicker(false) }}
                className="flex flex-col items-center gap-2 py-5 rounded-2xl border-2 transition-colors"
                style={schedaInfo ? { borderColor: schedaColor, backgroundColor: schedaColor + '18' } : { borderColor: '#e5e7eb' }}>
                <Dumbbell size={24} style={{ color: schedaInfo ? schedaColor : '#9ca3af' }} />
                <span className="text-sm font-bold" style={{ color: schedaInfo ? schedaColor : undefined }}>Palestra</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Scheda + week picker */}
      {showPicker && (
        <SchedaPickerPanel userId={userId} onPick={pickScheda} onClose={() => setShowPicker(false)} />
      )}

      {/* Timer sheet — bottom sheet */}
      {timerSheet && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => setTimerSheet(null)}>
          <div className="bg-white dark:bg-gray-900 rounded-t-3xl w-full shadow-2xl"
            onClick={e => e.stopPropagation()}>

            {/* Handle + header */}
            <div className="flex items-center justify-between px-5 pt-4 pb-3">
              <div className="flex items-center gap-2">
                <Timer size={17} style={{ color: CT }} />
                <p className="font-bold text-gray-900 dark:text-gray-100">Timer</p>
              </div>
              <button onClick={() => setTimerSheet(null)}
                className="w-8 h-8 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400">
                <X size={15} />
              </button>
            </div>

            <div className="px-5 pb-7 space-y-4">
              {/* Duration picker */}
              <div className="flex items-center justify-center gap-5 py-2">
                {/* Minutes */}
                <div className="flex flex-col items-center gap-2">
                  <button onClick={() => setTimerSheetMin(m => m + 1)}
                    className="w-11 h-11 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500 text-xl font-light">+</button>
                  <div className="w-16 text-center">
                    <p className="text-5xl font-bold tabular-nums text-gray-900 dark:text-gray-100 leading-tight">{String(timerSheetMin).padStart(2, '0')}</p>
                    <p className="text-[9px] text-gray-400 uppercase font-bold tracking-widest mt-0.5">min</p>
                  </div>
                  <button onClick={() => setTimerSheetMin(m => Math.max(0, m - 1))}
                    className="w-11 h-11 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500 text-xl font-light">−</button>
                </div>

                <p className="text-4xl font-bold text-gray-200 dark:text-gray-700 mb-4">:</p>

                {/* Seconds (steps of 5) */}
                <div className="flex flex-col items-center gap-2">
                  <button onClick={() => setTimerSheetSec(s => s >= 55 ? 0 : s + 5)}
                    className="w-11 h-11 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500 text-xl font-light">+</button>
                  <div className="w-16 text-center">
                    <p className="text-5xl font-bold tabular-nums text-gray-900 dark:text-gray-100 leading-tight">{String(timerSheetSec).padStart(2, '0')}</p>
                    <p className="text-[9px] text-gray-400 uppercase font-bold tracking-widest mt-0.5">sec</p>
                  </div>
                  <button onClick={() => setTimerSheetSec(s => s < 5 ? 55 : s - 5)}
                    className="w-11 h-11 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500 text-xl font-light">−</button>
                </div>
              </div>

              {/* Quick presets */}
              <div className="grid grid-cols-3 gap-2">
                {([[0,30],[1,0],[1,30],[2,0],[2,30],[3,0]] as [number,number][]).map(([m, s]) => {
                  const label = m > 0 ? (s > 0 ? `${m}:${String(s).padStart(2,'0')}` : `${m}:00`) : `0:${String(s).padStart(2,'0')}`
                  const active = timerSheetMin === m && timerSheetSec === s
                  return (
                    <button key={label} onClick={() => { setTimerSheetMin(m); setTimerSheetSec(s) }}
                      className="py-2 rounded-xl text-xs font-bold border transition-colors"
                      style={active
                        ? { backgroundColor: CT, borderColor: CT, color: '#fff' }
                        : { borderColor: CT + '40', color: CT }}>
                      {label}
                    </button>
                  )
                })}
              </div>

              {/* Action buttons */}
              <div className="space-y-2">
                <button
                  onClick={() => { const t = timerSheetMin * 60 + timerSheetSec; if (t > 0) startCountdown(t) }}
                  disabled={timerSheetMin === 0 && timerSheetSec === 0}
                  className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-white disabled:opacity-40"
                  style={{ backgroundColor: CT }}>
                  <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                    <Timer size={16} />
                  </div>
                  <div className="text-left flex-1">
                    <p className="text-[9px] font-bold uppercase tracking-widest opacity-70">Countdown</p>
                    <p className="text-base font-bold tabular-nums">
                      {`${timerSheetMin}:${String(timerSheetSec).padStart(2,'0')}`}
                    </p>
                  </div>
                  <Play size={16} className="opacity-60 shrink-0" />
                </button>

                <button onClick={() => startStopwatch()}
                  className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl border"
                  style={{ borderColor: CT + '50', backgroundColor: CT + '0a' }}>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                    style={{ backgroundColor: CT + '20', color: CT }}>
                    <Clock size={16} />
                  </div>
                  <div className="text-left flex-1">
                    <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: CT + '99' }}>Cronometro</p>
                    <p className="text-base font-bold tabular-nums" style={{ color: CT }}>0:00</p>
                  </div>
                  <Play size={16} style={{ color: CT + '60' }} className="shrink-0" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Timer bar */}
      {recTimer && (() => {
        const isCountdown = recTimer.mode === 'countdown'
        const done = isCountdown && recTimer.rem === 0
        const m   = Math.floor(recTimer.rem / 60)
        const sec = recTimer.rem % 60
        const timeLabel = `${m}:${String(sec).padStart(2, '0')}`
        const pct = isCountdown && recTimer.init > 0 ? recTimer.rem / recTimer.init : 0
        const barColor = done ? '#6abf6a' : CT

        function handleMainBtn() {
          if (done) {
            // restart countdown from beginning
            const s = recTimer.init
            setRecTimer(t => t ? { ...t, rem: s, on: true, endTs: Date.now() + s * 1000 } : null)
          } else if (recTimer.on) {
            // pause — clear timestamps, keep rem
            setRecTimer(t => t ? { ...t, on: false, endTs: undefined, startTs: undefined } : null)
          } else {
            // resume with fresh timestamps
            if (recTimer.mode === 'countdown') {
              setRecTimer(t => t ? { ...t, on: true, endTs: Date.now() + t.rem * 1000 } : null)
            } else {
              setRecTimer(t => t ? { ...t, on: true, startTs: Date.now() - t.rem * 1000 } : null)
            }
          }
        }

        return (
          <div className="fixed bottom-20 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none">
            <div className="bg-gray-950 rounded-2xl shadow-2xl overflow-hidden pointer-events-auto max-w-sm w-full border border-white/10">

              {/* Progress bar */}
              {isCountdown && (
                <div className="h-1 bg-white/10">
                  <div className="h-full transition-all duration-1000 ease-linear"
                    style={{ width: `${Math.round(pct * 100)}%`, backgroundColor: barColor }} />
                </div>
              )}

              <div className="px-4 py-3 flex items-center gap-4">
                {/* Time + label */}
                <div className="flex-1 min-w-0">
                  <p className="text-[9px] font-bold uppercase tracking-widest mb-0.5"
                    style={{ color: done ? '#6abf6a' : CT }}>
                    {isCountdown ? 'Recupero' : 'Cronometro'}
                  </p>
                  <p className="text-3xl font-bold tabular-nums leading-none"
                    style={{ color: done ? '#6abf6a' : 'white' }}>
                    {done ? 'VAI!' : timeLabel}
                  </p>
                  {/* Quick adjust row */}
                  <div className="flex items-center gap-2 mt-2">
                    {isCountdown && !done && (<>
                      <button onClick={() => setRecTimer(t => t ? { ...t, rem: Math.max(0, t.rem - 30) } : null)}
                        className="text-[10px] font-bold px-2 py-1 rounded-lg transition-colors text-white/40 hover:text-white hover:bg-white/10">
                        −30s
                      </button>
                      <button onClick={() => setRecTimer(t => t ? { ...t, rem: t.rem + 30 } : null)}
                        className="text-[10px] font-bold px-2 py-1 rounded-lg transition-colors text-white/40 hover:text-white hover:bg-white/10">
                        +30s
                      </button>
                    </>)}
                    {!isCountdown && (
                      <button onClick={() => setRecTimer(t => t ? { ...t, rem: 0, on: false } : null)}
                        className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg transition-colors text-white/40 hover:text-white hover:bg-white/10">
                        <RotateCcw size={10} /> Reset
                      </button>
                    )}
                  </div>
                </div>

                {/* Controls */}
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={handleMainBtn}
                    className="w-12 h-12 rounded-2xl flex items-center justify-center transition-colors"
                    style={{ backgroundColor: done ? '#6abf6a' : recTimer.on ? CT + '30' : CT }}>
                    {done
                      ? <RotateCcw size={18} color="white" />
                      : recTimer.on
                        ? <Pause size={18} color="white" />
                        : <Play  size={18} color="white" />}
                  </button>
                  <button onClick={() => { clearInterval(recRef.current); setRecTimer(null) }}
                    className="w-8 h-8 rounded-xl flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-colors">
                    <X size={15} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
