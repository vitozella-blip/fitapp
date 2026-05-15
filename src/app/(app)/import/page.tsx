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

const EXERCISE_FIELDS = [
  { key: 'name',         label: 'Nome',             required: true  },
  { key: 'muscleGroup',  label: 'Gruppo Muscolare', required: false },
  { key: 'equipment',    label: 'Attrezzatura',     required: false },
  { key: 'instructions', label: 'Note/Istruzioni',  required: false },
] as const

// Alias per auto-riconoscimento colonne
const FOOD_ALIASES: Record<string, string> = {
  nome: 'name', name: 'name', alimento: 'name', food: 'name', descrizione: 'name',
  marca: 'brand', brand: 'brand',
  calorie: 'calories', kcal: 'calories', calories: 'calories',
  energia: 'calories', energie: 'calories', 'energia (kcal)': 'calories',
  proteine: 'protein', protein: 'protein', prot: 'protein', 'prot.': 'protein',
  protidi: 'protein', 'proteine (g)': 'protein',
  carboidrati: 'carbs', carbs: 'carbs', glucidi: 'carbs',
  'carb.': 'carbs', 'carboidrati (g)': 'carbs', zuccheri: 'carbs',
  grassi: 'fat', fat: 'fat', lipidi: 'fat', 'grassi totali': 'fat',
  'lip.': 'fat', 'grassi (g)': 'fat',
}
const EXERCISE_ALIASES: Record<string, string> = {
  nome: 'name', name: 'name', esercizio: 'name', exercise: 'name',
  'gruppo muscolare': 'muscleGroup', muscolo: 'muscleGroup',
  'muscle group': 'muscleGroup', gruppo: 'muscleGroup',
  attrezzatura: 'equipment', equipment: 'equipment',
  note: 'instructions', istruzioni: 'instructions', instructions: 'instructions',
}

function autoDetect(header: string, type: ImportType): string {
  const key = header.toLowerCase().trim()
  return (type === 'food' ? FOOD_ALIASES : EXERCISE_ALIASES)[key] ?? ''
}

function downloadTemplate(type: ImportType) {
  const headers = type === 'food'
    ? ['Nome', 'Brand', 'Calorie', 'Proteine', 'Carboidrati', 'Grassi']
    : ['Nome', 'Gruppo Muscolare', 'Attrezzatura', 'Note']
  const exampleFood = [['Petto di pollo', '', 165, 31, 0, 3.6]]
  const exampleEx   = [['Panca piana', 'Petto', 'Bilanciere', 'Esercizio base per il petto']]
  const ws = XLSX.utils.aoa_to_sheet([headers, ...(type === 'food' ? exampleFood : exampleEx)])
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, type === 'food' ? 'Alimenti' : 'Esercizi')
  XLSX.writeFile(wb, `template_${type === 'food' ? 'alimenti' : 'esercizi'}.xlsx`)
}

// ── Component ─────────────────────────────────────────────────────────────────

type Step = 'idle' | 'mapped' | 'importing' | 'done'
type ResultState = { imported: number; errors: number; errorDetails: { row: number; error: string }[] }

const TYPES: { type: ImportType; label: string; e: string; color: string }[] = [
  { type: 'food',     label: 'Alimenti', e: '🥚', color: '#e8924a' },
  { type: 'exercise', label: 'Esercizi', e: '🏋🏻', color: '#7aafc8' },
]

export default function ImportPage() {
  const { userId } = useAppStore()
  const fileRef = useRef<HTMLInputElement>(null)

  const [importType, setImportType] = useState<ImportType>('food')
  const [step, setStep]             = useState<Step>('idle')
  const [fileName, setFileName]     = useState('')
  const [headers, setHeaders]       = useState<string[]>([])
  const [rows, setRows]             = useState<string[][]>([])
  const [mapping, setMapping]       = useState<Record<string, string>>({})
  const [result, setResult]         = useState<ResultState | null>(null)
  const [dragOver, setDragOver]     = useState(false)

  const fields = importType === 'food' ? FOOD_FIELDS : EXERCISE_FIELDS
  const requiredKeys = fields.filter(f => f.required).map(f => f.key as string)
  const mappedValues = Object.values(mapping)
  const missingRequired = requiredKeys.filter(k => !mappedValues.includes(k))

  function parseFile(file: File) {
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = (e) => {
      const wb = XLSX.read(new Uint8Array(e.target!.result as ArrayBuffer), { type: 'array' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const raw = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: '' }) as string[][]
      if (raw.length < 2) { alert('Il file sembra vuoto o ha solo intestazioni.'); return }

      const hdrs = raw[0].map(String)
      const dataRows = raw.slice(1).filter(r => r.some(c => c !== ''))

      setHeaders(hdrs)
      setRows(dataRows)

      const auto: Record<string, string> = {}
      hdrs.forEach(h => { const d = autoDetect(h, importType); if (d) auto[h] = d })
      setMapping(auto)
      setStep('mapped')
    }
    reader.readAsArrayBuffer(file)
  }

  function handleFile(file: File | null | undefined) {
    if (!file) return
    const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
    if (!['xlsx', 'xls', 'csv'].includes(ext)) {
      alert('Formato non supportato. Usa .xlsx, .xls o .csv')
      return
    }
    parseFile(file)
  }

  async function handleImport() {
    setStep('importing')
    const data = rows.map(row => {
      const obj: Record<string, unknown> = {}
      headers.forEach((h, i) => { const f = mapping[h]; if (f) obj[f] = row[i] })
      return obj
    })
    try {
      const res  = await fetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: importType, userId, data }),
      })
      setResult(await res.json())
    } catch {
      setResult({ imported: 0, errors: rows.length, errorDetails: [] })
    }
    setStep('done')
  }

  function reset() {
    setStep('idle'); setFileName(''); setHeaders([]); setRows([])
    setMapping({}); setResult(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  function switchType(t: ImportType) { setImportType(t); reset() }

  const accent = TYPES.find(x => x.type === importType)!.color

  return (
    <div className="max-w-2xl mx-auto space-y-3">

      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Importa dati</h1>
        <p className="text-sm text-gray-400 mt-1">Carica un Excel o CSV per importare alimenti o esercizi</p>
      </div>

      {/* ── Tipo ── */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-4">
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">Cosa vuoi importare?</p>
        <div className="grid grid-cols-2 gap-2">
          {TYPES.map(opt => (
            <button key={opt.type} onClick={() => switchType(opt.type)}
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
          Scarica il template con le colonne giuste, compilalo e caricalo.
        </p>
        <button onClick={() => downloadTemplate(importType)}
          className="text-xs font-semibold px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
          📥 Scarica template {importType === 'food' ? 'Alimenti' : 'Esercizi'}
        </button>
      </div>

      {/* ── Drop zone ── */}
      {step === 'idle' && (
        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]) }}
          onClick={() => fileRef.current?.click()}
          className={cn(
            'border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-colors',
            dragOver ? 'bg-violet-50 dark:bg-violet-950/30' : 'hover:bg-gray-50 dark:hover:bg-gray-800/40',
          )}
          style={{ borderColor: dragOver ? accent : undefined }}>
          <p className="text-4xl mb-3">📂</p>
          <p className="font-semibold text-gray-700 dark:text-gray-300">Trascina il file qui</p>
          <p className="text-sm text-gray-400 mt-1">oppure clicca per selezionare</p>
          <p className="text-xs text-gray-300 dark:text-gray-600 mt-2">.xlsx · .xls · .csv</p>
          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="sr-only"
            onChange={e => handleFile(e.target.files?.[0])} />
        </div>
      )}

      {/* ── Mappatura + Preview ── */}
      {step === 'mapped' && (
        <div className="space-y-3">

          {/* File info */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">📄 {fileName}</p>
              <p className="text-xs text-gray-400 mt-0.5">{rows.length} righe rilevate</p>
            </div>
            <button onClick={reset}
              className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 px-3 py-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
              Cambia file
            </button>
          </div>

          {/* Mappatura colonne */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">Mappatura colonne</p>
            <div className="space-y-2">
              {headers.map(h => (
                <div key={h} className="flex items-center gap-3">
                  <span className="flex-1 text-sm text-gray-700 dark:text-gray-300 truncate min-w-0 font-medium">{h}</span>
                  <span className="text-gray-300 dark:text-gray-600 text-xs shrink-0">→</span>
                  <select
                    value={mapping[h] ?? ''}
                    onChange={e => setMapping(m => ({ ...m, [h]: e.target.value }))}
                    className="text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-2 py-1.5 outline-none w-40 shrink-0"
                    style={{ accentColor: accent }}>
                    <option value="">— ignora —</option>
                    {fields.map(f => (
                      <option key={f.key} value={f.key}>
                        {f.label}{f.required ? ' *' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
            {missingRequired.length > 0 && (
              <p className="text-xs text-red-400 mt-3">
                ⚠️ Obbligatori non mappati:{' '}
                {missingRequired.map(k => fields.find(x => x.key === k)?.label).join(', ')}
              </p>
            )}
          </div>

          {/* Preview */}
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
                          <td key={f.key}
                            className={cn('py-1.5 pr-4 whitespace-nowrap',
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

          {/* Bottone import */}
          <button onClick={handleImport} disabled={missingRequired.length > 0}
            className={cn(
              'w-full py-4 rounded-2xl font-bold text-sm transition-all active:scale-[0.98]',
              missingRequired.length === 0
                ? 'text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
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
          <p className="text-xs text-gray-400 mt-1">{rows.length} righe</p>
        </div>
      )}

      {/* ── Done ── */}
      {step === 'done' && result && (
        <div className="space-y-3">
          <div className={cn(
            'rounded-2xl p-6 text-center border',
            result.errors === 0
              ? 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800'
              : 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800'
          )}>
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
