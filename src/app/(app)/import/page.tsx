'use client'

import React, { useState, useRef } from 'react'
import * as XLSX from 'xlsx'
import { useAppStore } from '@/store/useAppStore'
import { cn } from '@/lib/utils'

// ── Types ─────────────────────────────────────────────────────────────────────

type ImportType = 'food' | 'exercise'

const FOOD_FIELDS = [
  { key: 'name',     label: 'Nome',        required: true  },
  { key: 'brand',    label: 'Brand',       required: false },
  { key: 'calories', label: 'Calorie',     required: true  },
  { key: 'protein',  label: 'Proteine',    required: true  },
  { key: 'carbs',    label: 'Carboidrati', required: true  },
  { key: 'fat',      label: 'Grassi',      required: true  },
] as const

// Alias auto-riconoscimento colonne alimenti (IT + EN + colonne template utente)
const FOOD_ALIASES: Record<string, string> = {
  nome: 'name', name: 'name', alimento: 'name', food: 'name', descrizione: 'name',
  marca: 'brand', brand: 'brand',
  calorie: 'calories', kcal: 'calories', calories: 'calories',
  energia: 'calories', energie: 'calories', 'energia (kcal)': 'calories',
  proteine: 'protein', protein: 'protein', prot: 'protein', 'prot.': 'protein',
  protidi: 'protein', 'proteine (g)': 'protein',
  carboidrati: 'carbs', carbs: 'carbs', glucidi: 'carbs',
  carb: 'carbs', 'carb.': 'carbs', 'carboidrati (g)': 'carbs',
  grassi: 'fat', fat: 'fat', lipidi: 'fat', gras: 'fat',
  'grassi totali': 'fat', 'lip.': 'fat', 'grassi (g)': 'fat',
}

// Trova la riga intestazione scorrendo le prime 5 righe (gestisce titoli in row 0)
function findHeaderRow(rows: string[][]): number {
  let best = 0, bestScore = 0
  for (let i = 0; i < Math.min(5, rows.length); i++) {
    const score = rows[i].filter(c => FOOD_ALIASES[String(c ?? '').toLowerCase().trim()]).length
    if (score > bestScore) { bestScore = score; best = i }
  }
  return best
}

// ── Piano Allenamento ─────────────────────────────────────────────────────────

type PlanExercise = { name: string; noteOp: string; noteEx: string; sets: string; reps: string; rec: string }
type PlanSection  = { name: string; focus: string; exercises: PlanExercise[] }
type PlanData     = { planName: string; sections: PlanSection[] }

function parsePlanWorkbook(wb: XLSX.WorkBook): PlanData {
  const ws   = wb.Sheets[wb.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: '' }) as string[][]

  const firstCell = String(rows[0]?.[0] ?? '')
  const planName  = firstCell.trim()
    ? firstCell.replace('DATA:', '').trim()
    : wb.SheetNames[0]

  const sections: PlanSection[] = []
  let current: PlanSection | null = null

  for (const row of rows) {
    const c0 = String(row[0] ?? '').trim()
    const c1 = String(row[1] ?? '').trim()
    const c2 = String(row[2] ?? '').trim()

    if (/^WORKOUT\s+\d+/i.test(c0)) {
      current = { name: c0, focus: c2, exercises: [] }
      sections.push(current)
      continue
    }
    if (!current || c0 === 'Esercizio' || c0 === '') continue

    const num = parseFloat(c0)
    if (!isNaN(num) && num > 0 && c1) {
      current.exercises.push({
        name:   c1,
        noteOp: c2,
        noteEx: String(row[3] ?? '').trim(),
        sets:   String(row[4] ?? '3').trim(),
        reps:   String(row[5] ?? '').trim(),
        rec:    String(row[6] ?? '').trim(),
      })
    }
  }
  return { planName, sections }
}

// ── Download template ─────────────────────────────────────────────────────────

const WEEK_HEADERS = ['VOLUME\nWEEK 1', '', '', 'VOLUME\nWEEK 2', '', '', 'VOLUME\nWEEK 3', '', '',
  'VOLUME\nWEEK 4', '', '', 'VOLUME\nWEEK 5', '', '', 'VOLUME\nWEEK 6', '', '']
const COL_HEADERS  = ['Esercizio', '', 'Note', '',
  'Set', 'Reps', 'Rec', 'Set', 'Reps', 'Rec', 'Set', 'Reps', 'Rec',
  'Set', 'Reps', 'Rec', 'Set', 'Reps', 'Rec', 'Set', 'Reps', 'Rec']

function makeWoRows(n: number, focus: string, exercises: (string | number)[][]): (string | number)[][] {
  return [
    [`WORKOUT ${n}`, '', focus, 'Note operative', ...WEEK_HEADERS],
    COL_HEADERS,
    ...exercises,
    Array(22).fill(''), // riga separatore
  ]
}

function downloadTemplate(type: ImportType) {
  const wb = XLSX.utils.book_new()

  if (type === 'food') {
    const ws = XLSX.utils.aoa_to_sheet([
      ['Alimento', null, 'Valori nutrizionali per 100g'],
      ['Marca', 'Alimento', 'kcal', 'Gras', 'satu', 'Carb', 'zucc', 'Prot', 'Sale'],
      ['Lidl', 'pollo', 99, 0.8, 0.3, 0, 0, 23, 0.08],
      ['', 'riso parboiled', 350, 1.1, '', 77, '', 7, ''],
      ['Pronutrition', 'barretta hydro', 451.7, 21.3, '', 25.8, '', 50, ''],
    ])
    XLSX.utils.book_append_sheet(wb, ws, 'Alimenti')
    XLSX.writeFile(wb, 'template_alimenti.xlsx')
  } else {
    // Template multi-WO — stesso formato di template_piano_allenamento.xlsx
    const rows: (string | number)[][] = [
      ['DATA: gg/mm/aa - gg/mm/aa'],
      [],
      [],
      ...makeWoRows(1, 'CHEST - BACK', [
        [1, 'Spinte su piana al MP',  'Progressione onde',   'Bilanciere sotto capezzoli',  4, 6, "3'", 4, 7, "3'", 4, 8, "3'", 4, 6, "3'", 4, 7, "3'", 4, 8, "3'"],
        [2, 'Chest Press Incline',    'Progressione onde',   '',                            3, 8, "2'", 3, 9, "2'", 4, 8, "2'", 4, 9, "2'", 3, 8, "2'", 3, 8, "2'"],
        [3, 'Croci ai cavi',          "3-4'' in eccentrica", 'Petto sempre aperto',          3,12, "90''",3,12,"90''",3,12,"90''",3,12,"90''",3,12,"90''",3,12,"90''"],
        [4, '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
        [5, '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
        [6, '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
        [7, '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
        [8, '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
      ]),
      ...makeWoRows(2, 'LEGS', [
        [1, 'Pressa 45',       'Progressione onde', '', 4, 6, "3'", 4, 7, "3'", 3, 8, "3'", 3, 8, "3'", 4, 7, "3'", 4, 6, "3'"],
        [2, 'Leg Curl seduta', 'Progressione onde', '', 3, 8, "2'", 3, 9, "2'", 4, 8, "2'", 4, 9, "2'", 3, 8, "2'", 3, 8, "2'"],
        [3, '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
        [4, '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
        [5, '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
        [6, '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
        [7, '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
        [8, '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
      ]),
      ...makeWoRows(3, 'SHOULDERS + MIX', [
        [1, '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
        [2, '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
        [3, '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
        [4, '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
        [5, '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
        [6, '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
        [7, '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
        [8, '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
      ]),
      ...makeWoRows(4, '', [
        [1, '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
        [2, '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
        [3, '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
        [4, '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
        [5, '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
        [6, '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
        [7, '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
        [8, '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
      ]),
    ]
    const ws = XLSX.utils.aoa_to_sheet(rows)
    XLSX.utils.book_append_sheet(wb, ws, 'Allenamento')
    XLSX.writeFile(wb, 'template_allenamento.xlsx')
  }
}

// ── Costanti UI ───────────────────────────────────────────────────────────────

const TYPES: { type: ImportType; label: string; e: string; color: string }[] = [
  { type: 'food',     label: 'Alimenti', e: '🥚', color: '#e8924a' },
  { type: 'exercise', label: 'Esercizi', e: '🏋🏻', color: '#7aafc8' },
]

// ── Stato ─────────────────────────────────────────────────────────────────────

type Step = 'idle' | 'mapped' | 'plan-preview' | 'importing' | 'done'
type ResultState = { imported: number; errors: number; errorDetails: { row: number; error: string }[] }

// ── Componente ────────────────────────────────────────────────────────────────

export default function ImportPage() {
  const { userId } = useAppStore()
  const fileRef = useRef<HTMLInputElement>(null)

  const [importType, setImportType] = useState<ImportType>('food')
  const [step, setStep]             = useState<Step>('idle')
  const [fileName, setFileName]     = useState('')
  const [headers, setHeaders]       = useState<string[]>([])
  const [rows, setRows]             = useState<string[][]>([])
  const [mapping, setMapping]       = useState<Record<string, string>>({})
  const [planData, setPlanData]     = useState<PlanData | null>(null)
  const [result, setResult]         = useState<ResultState | null>(null)
  const [dragOver, setDragOver]     = useState(false)

  const requiredKeys    = FOOD_FIELDS.filter(f => f.required).map(f => f.key as string)
  const mappedValues    = Object.values(mapping)
  const missingRequired = requiredKeys.filter(k => !mappedValues.includes(k))

  const totalExercises = planData?.sections.reduce((a, s) => a + s.exercises.length, 0) ?? 0

  function parseFile(file: File) {
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = (e) => {
      const wb = XLSX.read(new Uint8Array(e.target!.result as ArrayBuffer), { type: 'array' })

      // Esercizi → parser piano (WORKOUT N sections)
      if (importType === 'exercise') {
        const pd = parsePlanWorkbook(wb)
        if (pd.sections.length === 0) { alert('Nessuna sezione WORKOUT trovata nel file.'); return }
        setPlanData(pd)
        setStep('plan-preview')
        return
      }

      // Alimenti → auto-detect header row + column mapping
      const sheetName = wb.SheetNames.includes('Alimenti') ? 'Alimenti' : wb.SheetNames[0]
      const ws        = wb.Sheets[sheetName]
      const raw       = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: '' }) as string[][]
      if (raw.length < 2) { alert('Il file sembra vuoto.'); return }

      const headerIdx = findHeaderRow(raw)
      const hdrs      = raw[headerIdx].map(String)
      const dataRows  = raw.slice(headerIdx + 1).filter(r => r.some(c => c !== ''))

      setHeaders(hdrs)
      setRows(dataRows)
      const auto: Record<string, string> = {}
      hdrs.forEach(h => { const d = FOOD_ALIASES[h.toLowerCase().trim()]; if (d) auto[h] = d })
      setMapping(auto)
      setStep('mapped')
    }
    reader.readAsArrayBuffer(file)
  }

  function handleFile(file: File | null | undefined) {
    if (!file) return
    const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
    if (!['xlsx', 'xls', 'csv'].includes(ext)) { alert('Usa .xlsx, .xls o .csv'); return }
    parseFile(file)
  }

  async function handleImport() {
    setStep('importing')
    try {
      const body = importType === 'exercise' && planData
        ? { type: 'plan', userId, data: planData }
        : {
            type: 'food', userId,
            data: rows.map(row => {
              const obj: Record<string, unknown> = {}
              headers.forEach((h, i) => { const f = mapping[h]; if (f) obj[f] = row[i] })
              return obj
            }),
          }
      const res = await fetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      setResult(await res.json())
    } catch {
      setResult({ imported: 0, errors: 1, errorDetails: [{ row: 0, error: 'Errore di rete' }] })
    }
    setStep('done')
  }

  function reset() {
    setStep('idle'); setFileName(''); setHeaders([]); setRows([])
    setMapping({}); setPlanData(null); setResult(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  const accent = TYPES.find(x => x.type === importType)!.color

  return (
    <div className="max-w-2xl mx-auto space-y-3">

      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Importa dati</h1>
        <p className="text-sm text-gray-400 mt-1">Carica un Excel o CSV per importare alimenti o il piano di allenamento</p>
      </div>

      {/* ── Tipo ── */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-4">
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">Cosa vuoi importare?</p>
        <div className="grid grid-cols-2 gap-2">
          {TYPES.map(opt => (
            <button key={opt.type} onClick={() => { setImportType(opt.type); reset() }}
              className="flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-sm transition-all"
              style={{
                backgroundColor: opt.color + '28',
                color: opt.color,
                boxShadow: importType === opt.type ? `0 0 0 2px ${opt.color}` : 'none',
              }}>
              <span style={{ fontSize: 20, lineHeight: 1 }}>{opt.e}</span>
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Template ── */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-4">
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">Template Excel</p>
        <p className="text-xs text-gray-500 mb-3">
          {importType === 'food'
            ? 'Colonne: Marca, Alimento, kcal, Gras, satu, Carb, zucc, Prot, Sale'
            : 'Sezioni WORKOUT N con Esercizi, Note, Set/Reps/Rec per 6 settimane. 4 WO × 8 esercizi.'}
        </p>
        <button onClick={() => downloadTemplate(importType)}
          className="text-xs font-semibold px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
          📥 Scarica template {importType === 'food' ? 'Alimenti' : 'Allenamento'}
        </button>
      </div>

      {/* ── Drop zone ── */}
      {step === 'idle' && (
        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]) }}
          onClick={() => fileRef.current?.click()}
          className="border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/40"
          style={{ borderColor: dragOver ? accent : undefined }}>
          <p className="text-4xl mb-3">📂</p>
          <p className="font-semibold text-gray-700 dark:text-gray-300">Trascina il file qui</p>
          <p className="text-sm text-gray-400 mt-1">oppure clicca per selezionare</p>
          <p className="text-xs text-gray-300 dark:text-gray-600 mt-2">.xlsx · .xls · .csv</p>
          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="sr-only"
            onChange={e => handleFile(e.target.files?.[0])} />
        </div>
      )}

      {/* ── Esercizi: anteprima piano ── */}
      {step === 'plan-preview' && planData && (
        <div className="space-y-3">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">📄 {fileName}</p>
              <p className="text-xs text-gray-400 mt-0.5">{planData.sections.length} workout · {totalExercises} esercizi</p>
            </div>
            <button onClick={reset} className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 px-3 py-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
              Cambia file
            </button>
          </div>

          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">Piano rilevato</p>
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3">{planData.planName}</p>
            <div className="space-y-2">
              {planData.sections.map((s, i) => (
                <div key={i} className="rounded-2xl px-3 py-2.5" style={{ backgroundColor: accent + '18' }}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold" style={{ color: accent }}>{s.name}</span>
                    {s.focus && <span className="text-xs text-gray-500">{s.focus}</span>}
                    <span className="text-xs text-gray-400">{s.exercises.length} esercizi</span>
                  </div>
                  <div className="space-y-1">
                    {s.exercises.slice(0, 3).map((ex, j) => (
                      <div key={j} className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                        <span className="text-gray-300 dark:text-gray-600 w-3 text-right shrink-0">{j + 1}.</span>
                        <span className="flex-1 truncate">{ex.name}</span>
                        {ex.sets && ex.reps && <span className="shrink-0 text-gray-400">{ex.sets}×{ex.reps}</span>}
                      </div>
                    ))}
                    {s.exercises.length > 3 && (
                      <p className="text-xs text-gray-300 dark:text-gray-600 pl-5">+{s.exercises.length - 3} altri…</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button onClick={handleImport}
            className="w-full py-4 rounded-2xl font-bold text-sm text-white transition-all active:scale-[0.98]"
            style={{ backgroundColor: accent }}>
            Importa piano ({totalExercises} esercizi)
          </button>
        </div>
      )}

      {/* ── Alimenti: mappatura colonne ── */}
      {step === 'mapped' && (
        <div className="space-y-3">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">📄 {fileName}</p>
              <p className="text-xs text-gray-400 mt-0.5">{rows.length} righe rilevate</p>
            </div>
            <button onClick={reset} className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 px-3 py-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
              Cambia file
            </button>
          </div>

          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">Mappatura colonne</p>
            <div className="space-y-2">
              {headers.map(h => (
                <div key={h} className="flex items-center gap-3">
                  <span className="flex-1 text-sm text-gray-700 dark:text-gray-300 truncate min-w-0 font-medium">{h}</span>
                  <span className="text-gray-300 dark:text-gray-600 text-xs shrink-0">→</span>
                  <select value={mapping[h] ?? ''}
                    onChange={e => setMapping(m => ({ ...m, [h]: e.target.value }))}
                    className="text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-2 py-1.5 outline-none w-40 shrink-0">
                    <option value="">— ignora —</option>
                    {FOOD_FIELDS.map(f => (
                      <option key={f.key} value={f.key}>{f.label}{f.required ? ' *' : ''}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
            {missingRequired.length > 0 && (
              <p className="text-xs text-red-400 mt-3">
                ⚠️ Obbligatori non mappati: {missingRequired.map(k => FOOD_FIELDS.find(x => x.key === k)?.label).join(', ')}
              </p>
            )}
          </div>

          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">
              Anteprima — prime {Math.min(5, rows.length)} righe
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr>
                    {FOOD_FIELDS.map(f => (
                      <th key={f.key} className="text-left font-semibold text-gray-400 pb-2 pr-4 whitespace-nowrap">
                        {f.label}{f.required ? ' *' : ''}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 5).map((row, ri) => {
                    const obj: Record<string, string> = {}
                    headers.forEach((h, hi) => { const f = mapping[h]; if (f) obj[f] = String(row[hi] ?? '') })
                    return (
                      <tr key={ri} className="border-t border-gray-100 dark:border-gray-800">
                        {FOOD_FIELDS.map(f => (
                          <td key={f.key} className={cn('py-1.5 pr-4 whitespace-nowrap',
                            !obj[f.key] && f.required && 'text-red-400')}>
                            {obj[f.key] || <span className="text-gray-300 dark:text-gray-600">—</span>}
                          </td>
                        ))}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <button onClick={handleImport} disabled={missingRequired.length > 0}
            className={cn('w-full py-4 rounded-2xl font-bold text-sm transition-all active:scale-[0.98]',
              missingRequired.length === 0 ? 'text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
            )}
            style={missingRequired.length === 0 ? { backgroundColor: accent } : {}}>
            Importa {rows.length} alimenti
          </button>
        </div>
      )}

      {/* ── Importing ── */}
      {step === 'importing' && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-12 text-center">
          <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin mx-auto mb-4"
            style={{ borderColor: accent, borderTopColor: 'transparent' }} />
          <p className="font-semibold text-gray-700 dark:text-gray-300">Importazione in corso…</p>
        </div>
      )}

      {/* ── Done ── */}
      {step === 'done' && result && (
        <div className="space-y-3">
          <div className={cn('rounded-2xl p-6 text-center border',
            result.errors === 0
              ? 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800'
              : 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800')}>
            <p className="text-4xl mb-3">{result.errors === 0 ? '✅' : '⚠️'}</p>
            <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">{result.imported} importati</p>
            {result.errors > 0 && (
              <p className="text-sm text-amber-600 dark:text-amber-400 mt-1">{result.errors} righe con errori</p>
            )}
          </div>
          {result.errorDetails.length > 0 && (
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">Dettaglio errori</p>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {result.errorDetails.map((e, i) => (
                  <p key={i} className="text-xs text-red-400">Riga {e.row}: {e.error}</p>
                ))}
              </div>
            </div>
          )}
          <button onClick={reset}
            className="w-full py-3 rounded-2xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            Nuova importazione
          </button>
        </div>
      )}
    </div>
  )
}
