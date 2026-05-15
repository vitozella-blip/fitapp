'use client'

import React, { useState, useRef } from 'react'
import * as XLSX from 'xlsx'
import { useAppStore } from '@/store/useAppStore'
import { cn } from '@/lib/utils'

// ── Types ─────────────────────────────────────────────────────────────────────

type ImportType = 'food' | 'exercise' | 'plan'

const FOOD_FIELDS = [
  { key: 'name',     label: 'Nome',        required: true  },
  { key: 'brand',    label: 'Brand',       required: false },
  { key: 'calories', label: 'Calorie',     required: true  },
  { key: 'protein',  label: 'Proteine',    required: true  },
  { key: 'carbs',    label: 'Carboidrati', required: true  },
  { key: 'fat',      label: 'Grassi',      required: true  },
] as const

const EXERCISE_FIELDS = [
  { key: 'name',         label: 'Nome',             required: true  },
  { key: 'muscleGroup',  label: 'Gruppo Muscolare', required: false },
  { key: 'equipment',    label: 'Attrezzatura',     required: false },
  { key: 'instructions', label: 'Note/Istruzioni',  required: false },
] as const

// Alias auto-riconoscimento — include colonne del template utente
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
const EXERCISE_ALIASES: Record<string, string> = {
  nome: 'name', name: 'name', esercizio: 'name', exercise: 'name',
  'gruppo muscolare': 'muscleGroup', muscolo: 'muscleGroup',
  'muscle group': 'muscleGroup', gruppo: 'muscleGroup',
  attrezzatura: 'equipment', equipment: 'equipment',
  note: 'instructions', istruzioni: 'instructions', instructions: 'instructions',
}

// Rileva la riga di intestazione scorrendo le prime 5 righe
function findHeaderRow(rows: string[][], type: 'food' | 'exercise'): number {
  const aliases = type === 'food' ? FOOD_ALIASES : EXERCISE_ALIASES
  let best = 0, bestScore = 0
  for (let i = 0; i < Math.min(5, rows.length); i++) {
    const score = rows[i].filter(c => aliases[String(c ?? '').toLowerCase().trim()]).length
    if (score > bestScore) { bestScore = score; best = i }
  }
  return best
}

function autoDetect(header: string, type: 'food' | 'exercise'): string {
  return (type === 'food' ? FOOD_ALIASES : EXERCISE_ALIASES)[header.toLowerCase().trim()] ?? ''
}

// ── Piano Allenamento ─────────────────────────────────────────────────────────

type PlanExercise = { name: string; noteOp: string; noteEx: string; sets: string; reps: string; rec: string }
type PlanSection  = { name: string; focus: string; exercises: PlanExercise[] }
type PlanData     = { planName: string; sections: PlanSection[] }

function parsePlanWorkbook(wb: XLSX.WorkBook): PlanData {
  // Usa il foglio "Programma" (il primo che non si chiama "Esercizi")
  const sheetName = wb.SheetNames.find(n => n.toLowerCase() !== 'esercizi') ?? wb.SheetNames[0]
  const ws   = wb.Sheets[sheetName]
  const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: '' }) as string[][]

  // Nome piano: riga 0 se contiene "DATA:"
  const firstCell = String(rows[0]?.[0] ?? '')
  const planName  = firstCell.includes('DATA:')
    ? `${sheetName} (${firstCell.replace('DATA:', '').replace('DATA:', '').trim()})`
    : sheetName

  const sections: PlanSection[] = []
  let current: PlanSection | null = null

  for (const row of rows) {
    const c0 = String(row[0] ?? '').trim()
    const c1 = String(row[1] ?? '').trim()
    const c2 = String(row[2] ?? '').trim()

    // Intestazione sezione WORKOUT N
    if (/^WORKOUT\s+\d+/i.test(c0)) {
      current = { name: c0, focus: c2, exercises: [] }
      sections.push(current)
      continue
    }
    if (!current || c0 === 'Esercizio' || c0 === '') continue

    // Riga esercizio: col0 è un numero intero
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

function downloadTemplate(type: ImportType) {
  const wb = XLSX.utils.book_new()

  if (type === 'food') {
    const ws = XLSX.utils.aoa_to_sheet([
      ['Alimento', null, 'Valori nutrizionali per 100g'],
      ['Marca', 'Alimento', 'kcal', 'Gras', 'satu', 'Carb', 'zucc', 'Prot', 'Sale'],
      ['Lidl', 'pollo', 99, 0.8, 0.3, 0, 0, 23, 0.08],
    ])
    XLSX.utils.book_append_sheet(wb, ws, 'Alimenti')
    XLSX.writeFile(wb, 'template_alimenti.xlsx')
  } else if (type === 'exercise') {
    const ws = XLSX.utils.aoa_to_sheet([
      ['Nome', 'Gruppo Muscolare', 'Attrezzatura', 'Note'],
      ['Panca piana', 'Petto', 'Bilanciere', 'Esercizio base per il petto'],
    ])
    XLSX.utils.book_append_sheet(wb, ws, 'Esercizi')
    XLSX.writeFile(wb, 'template_esercizi.xlsx')
  } else {
    const prog = XLSX.utils.aoa_to_sheet([
      ['DATA: gg/mm/aa - gg/mm/aa'],
      [],
      [],
      ['WORKOUT 1', null, 'CHEST - BACK', 'Note operative', 'VOLUME\nWEEK 1', null, null],
      ['Esercizio', null, 'Note', null, 'Set', 'Reps', 'Rec'],
      [1, 'Panca piana', 'Progressione a onde', 'Bilanciere sotto capezzoli', 4, 8, "3'"],
    ])
    XLSX.utils.book_append_sheet(wb, prog, 'Programma')
    const esercizi = XLSX.utils.aoa_to_sheet([
      ['Nome', 'Gruppo Muscolare', 'Attrezzatura', 'Note'],
      ['Panca piana', 'Petto', 'Bilanciere', ''],
    ])
    XLSX.utils.book_append_sheet(wb, esercizi, 'Esercizi')
    XLSX.writeFile(wb, 'template_piano_allenamento.xlsx')
  }
}

// ── Costanti UI ───────────────────────────────────────────────────────────────

const TYPES: { type: ImportType; label: string; e: string; color: string }[] = [
  { type: 'food',     label: 'Alimenti',           e: '🥚', color: '#e8924a' },
  { type: 'exercise', label: 'Esercizi',            e: '🏋🏻', color: '#7aafc8' },
  { type: 'plan',     label: 'Piano Allenamento',   e: '📋', color: '#9d8fcc' },
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

  const fields       = importType === 'food' ? FOOD_FIELDS : EXERCISE_FIELDS
  const requiredKeys = fields.filter(f => f.required).map(f => f.key as string)
  const mappedValues = Object.values(mapping)
  const missingRequired = requiredKeys.filter(k => !mappedValues.includes(k))

  function parseFile(file: File) {
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = (e) => {
      const wb = XLSX.read(new Uint8Array(e.target!.result as ArrayBuffer), { type: 'array' })

      if (importType === 'plan') {
        const pd = parsePlanWorkbook(wb)
        setPlanData(pd)
        setStep('plan-preview')
        return
      }

      // Per food/exercise: scegli il foglio giusto
      let sheetName = wb.SheetNames[0]
      if (importType === 'food' && wb.SheetNames.includes('Alimenti'))   sheetName = 'Alimenti'
      if (importType === 'exercise' && wb.SheetNames.includes('Esercizi')) sheetName = 'Esercizi'

      const ws   = wb.Sheets[sheetName]
      const raw  = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: '' }) as string[][]
      if (raw.length < 2) { alert('Il file sembra vuoto.'); return }

      // Trova la riga di intestazione corretta (gestisce titoli in row 0)
      const headerIdx  = findHeaderRow(raw, importType as 'food' | 'exercise')
      const hdrs       = raw[headerIdx].map(String)
      const dataRows   = raw.slice(headerIdx + 1).filter(r => r.some(c => c !== ''))

      setHeaders(hdrs)
      setRows(dataRows)

      const auto: Record<string, string> = {}
      hdrs.forEach(h => { const d = autoDetect(h, importType as 'food' | 'exercise'); if (d) auto[h] = d })
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
      let body: unknown
      if (importType === 'plan' && planData) {
        body = { type: 'plan', userId, data: planData }
      } else {
        const data = rows.map(row => {
          const obj: Record<string, unknown> = {}
          headers.forEach((h, i) => { const f = mapping[h]; if (f) obj[f] = row[i] })
          return obj
        })
        body = { type: importType, userId, data }
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

  function switchType(t: ImportType) { setImportType(t); reset() }

  const accent = TYPES.find(x => x.type === importType)!.color
  const totalPlanExercises = planData?.sections.reduce((a, s) => a + s.exercises.length, 0) ?? 0

  return (
    <div className="max-w-2xl mx-auto space-y-3">

      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Importa dati</h1>
        <p className="text-sm text-gray-400 mt-1">Carica un Excel o CSV per importare alimenti, esercizi o un piano di allenamento</p>
      </div>

      {/* ── Tipo ── */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-4">
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">Cosa vuoi importare?</p>
        <div className="grid grid-cols-3 gap-2">
          {TYPES.map(opt => (
            <button key={opt.type} onClick={() => switchType(opt.type)}
              className="flex items-center justify-center gap-1.5 py-3 rounded-2xl font-bold text-xs transition-all"
              style={{
                backgroundColor: opt.color + '28',
                color: opt.color,
                boxShadow: importType === opt.type ? `0 0 0 2px ${opt.color}` : 'none',
              }}>
              <span style={{ fontSize: 18, lineHeight: 1 }}>{opt.e}</span>
              <span className="hidden sm:inline">{opt.label}</span>
              <span className="sm:hidden">{opt.label.split(' ')[0]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Template ── */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-4">
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">Template Excel</p>
        <p className="text-xs text-gray-500 mb-3">
          {importType === 'food'     && 'Colonne: Marca, Alimento, kcal, Gras, satu, Carb, zucc, Prot, Sale'}
          {importType === 'exercise' && 'Colonne: Nome, Gruppo Muscolare, Attrezzatura, Note'}
          {importType === 'plan'     && 'Foglio "Programma": sezioni WORKOUT N con esercizi, set/reps per settimana'}
        </p>
        <button onClick={() => downloadTemplate(importType)}
          className="text-xs font-semibold px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
          📥 Scarica template {TYPES.find(t => t.type === importType)!.label}
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

      {/* ── Piano Allenamento — anteprima ── */}
      {step === 'plan-preview' && planData && (
        <div className="space-y-3">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">📄 {fileName}</p>
              <p className="text-xs text-gray-400 mt-0.5">{planData.sections.length} workout · {totalPlanExercises} esercizi totali</p>
            </div>
            <button onClick={reset} className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 px-3 py-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
              Cambia file
            </button>
          </div>

          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Piano rilevato</p>
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3">{planData.planName}</p>
            <div className="space-y-2">
              {planData.sections.map((s, i) => (
                <div key={i} className="rounded-2xl px-3 py-2 flex items-center justify-between"
                  style={{ backgroundColor: accent + '18' }}>
                  <div>
                    <span className="text-xs font-bold" style={{ color: accent }}>{s.name}</span>
                    {s.focus && <span className="text-xs text-gray-500 ml-2">— {s.focus}</span>}
                  </div>
                  <span className="text-xs text-gray-400">{s.exercises.length} esercizi</span>
                </div>
              ))}
            </div>
          </div>

          {planData.sections.some(s => s.exercises.length > 0) && (
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">
                Anteprima esercizi — {planData.sections[0].name}
              </p>
              <div className="space-y-1.5">
                {planData.sections[0].exercises.slice(0, 5).map((ex, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <span className="text-gray-300 dark:text-gray-600 shrink-0 w-4 text-right">{i + 1}.</span>
                    <span className="font-medium text-gray-700 dark:text-gray-300 flex-1 truncate">{ex.name}</span>
                    <span className="text-gray-400 shrink-0">{ex.sets} × {ex.reps}</span>
                  </div>
                ))}
                {planData.sections[0].exercises.length > 5 && (
                  <p className="text-xs text-gray-300 dark:text-gray-600 pl-6">
                    +{planData.sections[0].exercises.length - 5} altri…
                  </p>
                )}
              </div>
            </div>
          )}

          <button onClick={handleImport}
            className="w-full py-4 rounded-2xl font-bold text-sm text-white transition-all active:scale-[0.98]"
            style={{ backgroundColor: accent }}>
            Importa piano ({totalPlanExercises} esercizi)
          </button>
        </div>
      )}

      {/* ── Mappatura colonne (food/exercise) ── */}
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
                    {fields.map(f => (
                      <option key={f.key} value={f.key}>{f.label}{f.required ? ' *' : ''}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
            {missingRequired.length > 0 && (
              <p className="text-xs text-red-400 mt-3">
                ⚠️ Obbligatori non mappati: {missingRequired.map(k => fields.find(x => x.key === k)?.label).join(', ')}
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
                    {fields.map(f => (
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
                        {fields.map(f => (
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
            Importa {rows.length} righe
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
