'use client'
import { useState, useEffect, useCallback } from 'react'
import { Scale, Trash2, Plus } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { useAppStore } from '@/store/useAppStore'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts'

const C = '#7aafc8'

type Entry = { id: string; date: string; value: number }

function toIso(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function fmtDate(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })
}

function bmi(weight: number, height: number) {
  const h = height / 100
  return weight / (h * h)
}

function bmiLabel(b: number) {
  if (b < 18.5) return { label: 'Sottopeso', color: '#60a5fa' }
  if (b < 25)   return { label: 'Normopeso', color: '#34d399' }
  if (b < 30)   return { label: 'Sovrappeso', color: '#fbbf24' }
  return         { label: 'Obeso', color: '#f87171' }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function WeightTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl px-3 py-2 shadow-lg text-xs">
      <p className="font-bold text-gray-500 dark:text-gray-400 mb-0.5">{fmtDate(label)}</p>
      <p className="font-semibold" style={{ color: C }}>{payload[0].value} kg</p>
    </div>
  )
}

function StatChip({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="flex flex-col items-center justify-center bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl px-2 py-2 gap-0.5">
      <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400">{label}</p>
      <p className="text-base font-bold leading-none" style={{ color: color ?? C }}>{value}</p>
      {sub && <p className="text-[9px] text-gray-400 leading-none">{sub}</p>}
    </div>
  )
}

export default function PesoPage() {
  const { userId } = useAppStore()
  const [entries, setEntries] = useState<Entry[]>([])
  const [height, setHeight] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  const [inputVal, setInputVal] = useState('')
  const [inputDate, setInputDate] = useState(toIso(new Date()))
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch(`/api/weight?userId=${userId}`)
      const data = await r.json()
      setEntries(Array.isArray(data.entries) ? data.entries : [])
      setHeight(data.height ?? null)
    } catch { /* ignore */ }
    setLoading(false)
  }, [userId])

  useEffect(() => { load() }, [load])

  async function save() {
    const v = parseFloat(inputVal.replace(',', '.'))
    if (!v || v <= 0 || v > 300) return
    setSaving(true)
    try {
      const r = await fetch('/api/weight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, date: inputDate, value: v }),
      })
      const entry = await r.json()
      if (entry.id) {
        setEntries(prev => {
          const updated = [...prev.filter(e => e.id !== entry.id), entry]
          return updated.sort((a, b) => a.date.localeCompare(b.date))
        })
        setInputVal('')
      }
    } catch { /* ignore */ }
    setSaving(false)
  }

  async function remove(id: string) {
    setEntries(prev => prev.filter(e => e.id !== id))
    try {
      await fetch(`/api/weight?id=${id}&userId=${userId}`, { method: 'DELETE' })
    } catch { /* ignore */ }
  }

  // stats
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date))
  const current = sorted.at(-1)?.value ?? null
  const first   = sorted.at(0)?.value ?? null
  const delta   = current != null && first != null ? +(current - first).toFixed(1) : null
  const minW    = sorted.length ? Math.min(...sorted.map(e => e.value)) : null
  const maxW    = sorted.length ? Math.max(...sorted.map(e => e.value)) : null
  const bmiVal  = current != null && height ? +bmi(current, height).toFixed(1) : null
  const bmiInfo = bmiVal ? bmiLabel(bmiVal) : null

  // chart data — last 60 entries
  const chartData = sorted.slice(-60).map(e => ({ date: e.date, value: e.value }))

  // y-axis domain with padding
  const yMin = minW ? Math.floor(minW - 1) : 50
  const yMax = maxW ? Math.ceil(maxW + 1)  : 100

  // recent list — last 20 reversed
  const recent = [...sorted].reverse().slice(0, 20)

  return (
    <div className="flex flex-col gap-4 pb-2">
      <PageHeader title="Peso" icon={Scale} accent="training" subtitle="Monitora il tuo peso nel tempo" />

      {/* Input */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden">
        <div className="px-4 py-2.5 border-b border-gray-100 dark:border-gray-800">
          <p className="text-xs font-bold uppercase tracking-widest" style={{ color: C }}>Aggiungi misurazione</p>
        </div>
        <div className="p-4 flex flex-col gap-3">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <input
              type="number" step="0.1" min="30" max="300"
              value={inputVal}
              onChange={e => setInputVal(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && save()}
              placeholder="es. 74.5"
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm font-semibold text-gray-800 dark:text-gray-100 outline-none focus:border-[#7aafc8]"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-semibold">kg</span>
          </div>
          <input
            type="date" value={inputDate}
            onChange={e => setInputDate(e.target.value)}
            className="px-2 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs font-semibold text-gray-700 dark:text-gray-200 outline-none focus:border-[#7aafc8]"
          />
          <button
            onClick={save} disabled={saving || !inputVal}
            className="flex items-center justify-center w-10 h-10 rounded-xl text-white disabled:opacity-40 shrink-0"
            style={{ backgroundColor: C }}
          >
            <Plus size={18} />
          </button>
        </div>
        </div>
      </div>

      {/* Stats */}
      {sorted.length > 0 && (
        <div className={`grid gap-2 ${bmiVal ? 'grid-cols-5' : 'grid-cols-4'}`}>
          <StatChip label="Attuale" value={current ? `${current}` : '—'} sub="kg" />
          <StatChip
            label="Δ inizio"
            value={delta != null ? (delta > 0 ? `+${delta}` : `${delta}`) : '—'}
            sub="kg"
            color={delta == null ? C : delta > 0 ? '#f87171' : '#34d399'}
          />
          <StatChip label="Min" value={minW ? `${minW}` : '—'} sub="kg" color="#34d399" />
          <StatChip label="Max" value={maxW ? `${maxW}` : '—'} sub="kg" color="#f87171" />
          {bmiVal && bmiInfo && (
            <StatChip label="BMI" value={`${bmiVal}`} sub={bmiInfo.label} color={bmiInfo.color} />
          )}
        </div>
      )}

      {/* Chart */}
      {chartData.length > 1 && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden">
          <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-800">
            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: C }}>
              Andamento — {chartData.length} misurazioni
            </p>
          </div>
          <div className="p-4">
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.5} />
              <XAxis
                dataKey="date"
                tickFormatter={fmtDate}
                tick={{ fontSize: 9, fill: '#9ca3af' }}
                interval="preserveStartEnd"
              />
              <YAxis
                domain={[yMin, yMax]}
                tick={{ fontSize: 9, fill: '#9ca3af' }}
                tickFormatter={v => `${v}`}
              />
              <Tooltip content={<WeightTooltip />} />
              {current && (
                <ReferenceLine y={current} stroke={C} strokeDasharray="4 4" strokeOpacity={0.5} />
              )}
              <Line
                type="monotone" dataKey="value"
                stroke={C} strokeWidth={2}
                dot={{ r: 3, fill: C, strokeWidth: 0 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Storico */}
      {recent.length > 0 && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden">
          <div className="px-4 py-2.5 border-b border-gray-100 dark:border-gray-800" style={{ backgroundColor: C + '12' }}>
            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: C }}>Storico</p>
          </div>
          {recent.map((e, i) => (
            <div
              key={e.id}
              className={`flex items-center justify-between px-4 py-2.5 ${i < recent.length - 1 ? 'border-b border-gray-50 dark:border-gray-800' : ''}`}
            >
              <span className="text-xs text-gray-500 dark:text-gray-400">{fmtDate(e.date)}</span>
              <span className="text-sm font-bold" style={{ color: C }}>{e.value} kg</span>
              <button
                onClick={() => remove(e.id)}
                className="p-1.5 rounded-lg text-gray-300 hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && sorted.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
          <Scale size={40} className="text-gray-200 dark:text-gray-700" />
          <p className="text-sm font-semibold text-gray-400">Nessuna misurazione ancora</p>
          <p className="text-xs text-gray-300 dark:text-gray-600">Inserisci il tuo primo peso qui sopra</p>
        </div>
      )}
    </div>
  )
}
