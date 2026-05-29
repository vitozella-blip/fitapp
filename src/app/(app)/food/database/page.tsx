'use client'
import { useState, useEffect, useRef, useCallback, Suspense, useMemo } from 'react'
import { Search, Plus, Trash2, Star, ChevronDown, Pencil, X, Loader2, Check, Filter, ScanBarcode } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { PageHeader } from '@/components/shared/PageHeader'
import { Apple } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSearchParams } from 'next/navigation'

type Food = {
  id: string; name: string; brand?: string; calories: number
  protein: number; carbs: number; fat: number
  saturatedFat?: number; sugars?: number; salt?: number
  userId?: string | null; categoryId?: string | null; categoryIds?: string[]
}
type Category = { id: string; name: string }
type FoodForm = { name: string; brand: string; calories: string; protein: string; carbs: string; fat: string; saturatedFat: string; sugars: string; salt: string; categoryIds: string[] }

const emptyForm = (): FoodForm => ({ name: '', brand: '', calories: '', protein: '', carbs: '', fat: '', saturatedFat: '', sugars: '', salt: '', categoryIds: [] })

// ── Barcode scanner ──────────────────────────────────────────────────────────
type ScanStatus = 'init' | 'scanning' | 'loading' | 'found' | 'notfound' | 'error' | 'unsupported'

function rnd(v?: number) { return v != null ? Math.round(v * 10) / 10 : 0 }

function BarcodeScannerModal({ onClose, onFound }: {
  onClose: () => void
  onFound: (form: FoodForm) => void
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [status, setStatus] = useState<ScanStatus>('init')
  const [product, setProduct] = useState<FoodForm | null>(null)
  const [manualCode, setManualCode] = useState('')
  const streamRef = useRef<MediaStream | null>(null)
  const animRef   = useRef<number | null>(null)
  const scanning  = useRef(true)

  useEffect(() => {
    initScanner()
    return cleanup
  }, [])

  function cleanup() {
    scanning.current = false
    if (animRef.current) cancelAnimationFrame(animRef.current)
    streamRef.current?.getTracks().forEach(t => t.stop())
  }

  async function initScanner() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const BD = (window as any).BarcodeDetector
    if (!BD) { setStatus('unsupported'); return }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      streamRef.current = stream
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play() }
      setStatus('scanning')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const detector = new BD({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128'] }) as any
      scanLoop(detector)
    } catch { setStatus('error') }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function scanLoop(detector: any) {
    if (!scanning.current) return
    animRef.current = requestAnimationFrame(async () => {
      if (!videoRef.current || !scanning.current) return
      try {
        const results = await detector.detect(videoRef.current)
        if (results.length > 0) { cleanup(); await lookup(results[0].rawValue); return }
      } catch {}
      scanLoop(detector)
    })
  }

  async function lookup(code: string) {
    setStatus('loading')
    try {
      const res  = await fetch(`https://world.openfoodfacts.org/api/v2/product/${code}?fields=product_name,brands,nutriments`)
      const data = await res.json()
      if (data.status === 1 && data.product) {
        const p = data.product; const n = p.nutriments ?? {}
        setProduct({
          name:         p.product_name ?? '',
          brand:        p.brands?.split(',')[0]?.trim() ?? '',
          calories:     String(Math.round(n['energy-kcal_100g'] ?? 0)),
          fat:          String(rnd(n.fat_100g)),
          saturatedFat: String(rnd(n['saturated-fat_100g'])),
          carbs:        String(rnd(n.carbohydrates_100g)),
          sugars:       String(rnd(n.sugars_100g)),
          protein:      String(rnd(n.proteins_100g)),
          salt:         String(rnd(n.salt_100g)),
          categoryIds:  [],
        })
        setStatus('found')
      } else { setStatus('notfound') }
    } catch { setStatus('error') }
  }

  const C = '#e8924a'

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/70">
      <div className="bg-white dark:bg-gray-900 rounded-t-3xl md:rounded-2xl w-full md:max-w-md flex flex-col shadow-xl overflow-hidden max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-100 dark:border-gray-800 shrink-0">
          <p className="font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <ScanBarcode size={16} style={{ color: C }} /> Scansiona barcode
          </p>
          <button onClick={() => { cleanup(); onClose() }}
            className="w-8 h-8 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">

          {/* Camera viewfinder */}
          {(status === 'init' || status === 'scanning') && (
            <div className="relative bg-black" style={{ aspectRatio: '4/3' }}>
              <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
              {/* Scanning frame overlay */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="relative w-56 h-40">
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 rounded-tl-lg" style={{ borderColor: C }} />
                  <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 rounded-tr-lg" style={{ borderColor: C }} />
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 rounded-bl-lg" style={{ borderColor: C }} />
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 rounded-br-lg" style={{ borderColor: C }} />
                  {status === 'scanning' && (
                    <div className="absolute inset-x-0 h-0.5 animate-bounce" style={{ top: '50%', backgroundColor: C + 'cc' }} />
                  )}
                </div>
              </div>
              {status === 'init' && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                  <Loader2 size={28} className="animate-spin text-white" />
                </div>
              )}
            </div>
          )}

          {status === 'loading' && (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader2 size={28} className="animate-spin" style={{ color: C }} />
              <p className="text-sm text-gray-500">Ricerca prodotto...</p>
            </div>
          )}

          {status === 'found' && product && (
            <div className="p-4 space-y-3">
              <div className="rounded-xl p-3 space-y-1" style={{ backgroundColor: C + '12' }}>
                <p className="font-bold text-gray-900 dark:text-gray-100">{product.name || '—'}</p>
                {product.brand && <p className="text-xs text-gray-500">{product.brand}</p>}
              </div>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: 'Kcal', val: product.calories, color: '#6abf6a' },
                  { label: 'Grassi', val: product.fat + 'g', color: '#5b9bd5' },
                  { label: 'Carb', val: product.carbs + 'g', color: C },
                  { label: 'Prot', val: product.protein + 'g', color: '#9d8fcc' },
                ].map(m => (
                  <div key={m.label} className="rounded-lg p-2 text-center" style={{ backgroundColor: m.color + '15' }}>
                    <p className="text-[10px] text-gray-400 font-medium">{m.label}</p>
                    <p className="text-sm font-bold" style={{ color: m.color }}>{m.val}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {status === 'notfound' && (
            <div className="p-4 space-y-3 text-center">
              <p className="text-sm font-semibold text-gray-600 dark:text-gray-400">Prodotto non trovato nel database</p>
              <p className="text-xs text-gray-400">Puoi aggiungerlo manualmente</p>
            </div>
          )}

          {(status === 'error' || status === 'unsupported') && (
            <div className="p-4 space-y-2 text-center">
              <p className="text-sm font-semibold text-gray-600 dark:text-gray-400">
                {status === 'unsupported' ? 'Scanner non supportato dal browser' : 'Errore accesso alla fotocamera'}
              </p>
              <p className="text-xs text-gray-400">Inserisci il codice a mano:</p>
            </div>
          )}

          {/* Manual barcode input (always visible below camera) */}
          {status !== 'found' && status !== 'loading' && (
            <div className="px-4 pb-4 pt-2">
              <div className="flex gap-2">
                <input
                  type="number"
                  value={manualCode}
                  onChange={e => setManualCode(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && manualCode.trim() && lookup(manualCode.trim())}
                  placeholder="Inserisci codice EAN manualmente..."
                  className="flex-1 px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 outline-none focus:border-orange-400"
                />
                <button
                  onClick={() => manualCode.trim() && lookup(manualCode.trim())}
                  disabled={!manualCode.trim()}
                  className="px-3 py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-40"
                  style={{ backgroundColor: C }}>
                  Cerca
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="px-4 pb-6 pt-3 border-t border-gray-100 dark:border-gray-800 shrink-0 flex gap-2">
          {status === 'found' && product ? (
            <>
              <button onClick={() => { cleanup(); onClose() }}
                className="flex-1 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-semibold text-sm">
                Annulla
              </button>
              <button onClick={() => { cleanup(); onFound(product) }}
                className="flex-1 py-3 rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2"
                style={{ backgroundColor: C }}>
                <Check size={15} /> Aggiungi al database
              </button>
            </>
          ) : (
            <button onClick={() => { cleanup(); onClose() }}
              className="flex-1 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-semibold text-sm">
              Chiudi
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

const fmt = (v: number | undefined | null, unit = 'g') =>
  v == null || v === 0 ? '—' : `${v} ${unit}`

const DETAIL_ROWS: { label: string; key: keyof Food; color: string; sub?: boolean }[] = [
  { label: 'Energia',         key: 'calories',     color: '#6abf6a' },
  { label: 'Grassi',          key: 'fat',          color: '#5b9bd5' },
  { label: 'di cui saturi',   key: 'saturatedFat', color: '#93c5e8', sub: true },
  { label: 'Carboidrati',     key: 'carbs',        color: '#f0aa78' },
  { label: 'di cui zuccheri', key: 'sugars',       color: '#f7cc9e', sub: true },
  { label: 'Proteine',        key: 'protein',      color: '#9d8fcc' },
  { label: 'Sale',            key: 'salt',         color: '#f0e080' },
]

function FoodCard({ food, isFav, categories, onToggleFav, onEdit, onDelete, selecting, selected, onSelect, onLongPress }: {
  food: Food; isFav: boolean; categories: Category[]
  onToggleFav: () => void; onEdit: () => void; onDelete: () => void
  selecting: boolean; selected: boolean
  onSelect: () => void; onLongPress: () => void
}) {
  const [open, setOpen] = useState(false)
  const lpTimer = useRef<NodeJS.Timeout | undefined>(undefined)
  const rowRef    = useRef<HTMLDivElement>(null)
  const startX    = useRef(0)
  const startY    = useRef(0)
  const currentX  = useRef(0)
  const snapped   = useRef<'left' | 'right' | null>(null)
  const dirLocked = useRef<'h' | 'v' | null>(null)
  const SNAP   = 72
  const THRESH = 36

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
  function onTouchStart(e: React.TouchEvent) {
    if (selecting) return
    startX.current = e.touches[0].clientX
    startY.current = e.touches[0].clientY
    dirLocked.current = null
    if (rowRef.current) rowRef.current.style.transition = ''
  }
  function onTouchMove(e: React.TouchEvent) {
    if (selecting) return
    const dx = e.touches[0].clientX - startX.current
    const dy = Math.abs(e.touches[0].clientY - startY.current)
    if (dirLocked.current === null) {
      if (Math.abs(dx) < 5 && dy < 5) return
      dirLocked.current = Math.abs(dx) >= dy * 3 ? 'h' : 'v'
    }
    if (dirLocked.current !== 'h') return
    clearTimeout(lpTimer.current)
    const base = snapped.current === 'left' ? -SNAP : snapped.current === 'right' ? SNAP : 0
    setTranslate(Math.max(-SNAP, Math.min(SNAP, base + dx)))
  }
  function onTouchEnd() {
    if (selecting) return
    const x = currentX.current
    if      (x < -THRESH) snapTo('left')
    else if (x >  THRESH) snapTo('right')
    else                   snapTo(null)
  }
  function handleRowClick() {
    if (selecting) { onSelect(); return }
    if (snapped.current) { snapTo(null); return }
    setOpen(o => !o)
  }

  return (
    <div className={cn('border-b border-gray-200 dark:border-gray-700 last:border-0 relative overflow-hidden', selected && 'bg-orange-50 dark:bg-orange-950/20')}>
      {/* Edit / Delete actions — hidden during multi-select */}
      {!selecting && <>
        <div className="absolute inset-y-0 left-0 flex items-center justify-center"
          style={{ width: SNAP, backgroundColor: '#f0aa78' }}
          onClick={() => { snapTo(null); onEdit() }}>
          <Pencil size={18} className="text-white" />
        </div>
        <div className="absolute inset-y-0 right-0 flex items-center justify-center"
          style={{ width: SNAP, backgroundColor: '#ef4444' }}
          onClick={() => { snapTo(null); onDelete() }}>
          <Trash2 size={18} className="text-white" />
        </div>
      </>}

      {/* Sliding card content */}
      <div
        ref={rowRef}
        className={cn('relative z-10 touch-pan-y', selected ? 'bg-orange-50 dark:bg-orange-950/20' : 'bg-white dark:bg-gray-900')}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <div className="flex items-center gap-2 px-4 py-3">
          {selecting && (
            <button onClick={onSelect} className={cn('shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors', selected ? 'bg-orange-400 border-orange-400' : 'border-gray-300 dark:border-gray-600')}>
              {selected && <Check size={11} className="text-white" />}
            </button>
          )}
          <button
            onPointerDown={() => { lpTimer.current = setTimeout(() => { snapTo(null); onLongPress() }, 500) }}
            onPointerUp={() => clearTimeout(lpTimer.current)}
            onPointerLeave={() => clearTimeout(lpTimer.current)}
            onContextMenu={e => e.preventDefault()}
            onClick={handleRowClick}
            className="flex-1 min-w-0 text-left select-none">
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{food.name}</p>
            {food.brand && <p className="text-xs text-gray-500 dark:text-gray-300 truncate">{food.brand}</p>}
            <div className="flex items-center gap-2 text-xs mt-0.5 flex-wrap">
              <span className="font-bold" style={{ color: '#6abf6a' }}>{food.calories} kcal</span>
              <span className="font-semibold" style={{ color: '#5b9bd5' }}>G {food.fat}g</span>
              <span className="font-semibold" style={{ color: '#f0aa78' }}>C {food.carbs}g</span>
              <span className="font-semibold" style={{ color: '#9d8fcc' }}>P {food.protein}g</span>
            </div>
            {food.categoryIds && food.categoryIds.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {food.categoryIds.map(cid => {
                  const name = categories.find(c => c.id === cid)?.name
                  if (!name) return null
                  return <span key={cid} className="inline-block text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-orange-50 dark:bg-orange-950/40 text-orange-400">{name}</span>
                })}
              </div>
            )}
          </button>
          {!selecting && (
            <button
              onClick={e => { e.stopPropagation(); onToggleFav() }}
              onTouchStart={e => e.stopPropagation()}
              onTouchMove={e => e.stopPropagation()}
              onTouchEnd={e => { e.stopPropagation(); e.preventDefault(); onToggleFav() }}
              className="shrink-0 p-1 -m-1">
              <Star size={16} className={cn('transition-colors', isFav ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300')} />
            </button>
          )}
        </div>

        {open && !selecting && (
          <div className="px-4 pb-3 space-y-0.5">
            <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">Valori per 100g</p>
            {DETAIL_ROWS.map(r => {
              const raw = food[r.key] as number | undefined | null
              const val = r.key === 'calories'
                ? (raw ? `${raw} kcal` : '—')
                : fmt(raw)
              return (
                <div key={r.label} className={cn('flex items-center justify-between py-1', r.sub ? 'pl-4' : '')}>
                  <span className={cn('text-xs', r.sub ? 'font-normal' : 'font-semibold')} style={{ color: r.color }}>{r.label}</span>
                  <span className={cn('text-xs', r.sub ? 'font-medium' : 'font-bold')} style={{ color: r.color }}>{val}</span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function CategoryFilterDropdown({ values, cats, userId, onChange, onCatsChanged }: {
  values: string[]; cats: Category[]; userId: string
  onChange: (ids: string[]) => void
  onCatsChanged: (cats: Category[]) => void
}) {
  const [open, setOpen]         = useState(false)
  const [newName, setNewName]   = useState('')
  const [saving, setSaving]     = useState(false)
  const [editId, setEditId]     = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function h(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  async function create() {
    const n = newName.trim(); if (!n) return
    setSaving(true)
    const r = await fetch('/api/categories', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, name: n }),
    })
    const cat: Category = await r.json()
    const next = [...cats, cat].sort((a, b) => a.name.localeCompare(b.name, 'it'))
    onCatsChanged(next)
    onChange([...values, cat.id])
    setNewName(''); setSaving(false)
  }

  async function saveEdit(id: string) {
    const n = editName.trim(); if (!n) return
    await fetch(`/api/categories/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: n }),
    })
    onCatsChanged(cats.map(c => c.id === id ? { ...c, name: n } : c).sort((a, b) => a.name.localeCompare(b.name, 'it')))
    setEditId(null); setEditName('')
  }

  async function deleteCat(id: string) {
    await fetch(`/api/categories/${id}`, { method: 'DELETE' })
    onCatsChanged(cats.filter(c => c.id !== id))
    if (values.includes(id)) onChange(values.filter(v => v !== id))
  }

  function toggle(id: string) {
    onChange(values.includes(id) ? values.filter(v => v !== id) : [...values, id])
  }

  const label = values.length === 0
    ? 'Tutte le categorie'
    : values.length === 1
      ? (cats.find(c => c.id === values[0])?.name ?? 'Categoria')
      : `${values.length} categorie`

  return (
    <div ref={ref} className="relative flex-1">
      <button type="button" onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm outline-none">
        <div className="flex items-center gap-2 min-w-0">
          {values.length > 0 && <Filter size={12} className="text-orange-400 shrink-0" />}
          <span className={values.length > 0 ? 'text-orange-400 font-semibold truncate' : 'text-gray-400'}>
            {label}
          </span>
        </div>
        <ChevronDown size={14} className="text-gray-400 shrink-0 ml-1" />
      </button>
      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-40 overflow-hidden">
          <div className="max-h-56 overflow-y-auto">
            {/* clear all */}
            <button type="button"
              onClick={() => onChange([])}
              className={cn('w-full text-left px-3 py-2.5 text-sm transition-colors hover:bg-gray-50 dark:hover:bg-gray-800',
                values.length === 0 ? 'font-semibold text-orange-400' : 'text-gray-500 dark:text-gray-400')}>
              Tutte le categorie
            </button>
            {cats.map(c => (
              <div key={c.id} className="flex items-center gap-1 px-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group">
                {editId === c.id ? (
                  <>
                    <input
                      autoFocus
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') saveEdit(c.id); if (e.key === 'Escape') { setEditId(null) } }}
                      className="flex-1 text-sm py-2.5 bg-transparent outline-none text-gray-900 dark:text-gray-100"
                    />
                    <button onClick={() => saveEdit(c.id)}
                      className="w-6 h-6 rounded-lg bg-orange-400 text-white flex items-center justify-center shrink-0">
                      <Check size={11} />
                    </button>
                    <button onClick={() => setEditId(null)}
                      className="w-6 h-6 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-500 flex items-center justify-center shrink-0">
                      <X size={11} />
                    </button>
                  </>
                ) : (
                  <>
                    <button type="button" onClick={() => toggle(c.id)}
                      className="flex items-center gap-2.5 flex-1 py-2.5 text-sm text-left">
                      <span className={cn('w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors',
                        values.includes(c.id) ? 'bg-orange-400 border-orange-400' : 'border-gray-300 dark:border-gray-600')}>
                        {values.includes(c.id) && <Check size={10} className="text-white" />}
                      </span>
                      <span className={values.includes(c.id) ? 'font-semibold text-orange-400' : 'text-gray-700 dark:text-gray-300'}>
                        {c.name}
                      </span>
                    </button>
                    <button onClick={() => { setEditId(c.id); setEditName(c.name) }}
                      className="w-6 h-6 rounded-lg text-gray-300 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shrink-0">
                      <Pencil size={11} />
                    </button>
                    <button onClick={() => deleteCat(c.id)}
                      className="w-6 h-6 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shrink-0">
                      <Trash2 size={11} />
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
          {/* inline create */}
          <div className="flex items-center gap-2 px-3 py-2 border-t border-gray-100 dark:border-gray-800">
            <Plus size={13} className="text-gray-400 shrink-0" />
            <input
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') create(); if (e.key === 'Escape') setOpen(false) }}
              placeholder="Nuova categoria..."
              className="flex-1 text-sm bg-transparent outline-none text-gray-900 dark:text-gray-100 placeholder-gray-400"
            />
            {newName.trim() && (
              <button onClick={create} disabled={saving}
                className="w-6 h-6 rounded-lg bg-orange-400 text-white flex items-center justify-center shrink-0 disabled:opacity-50">
                {saving ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function CategoryMultiSelect({ values, cats, userId, onChange, onCreated }: {
  values: string[]; cats: Category[]; userId: string
  onChange: (ids: string[]) => void; onCreated: (cat: Category) => void
}) {
  const [open, setOpen]     = useState(false)
  const [name, setName]     = useState('')
  const [saving, setSaving] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    function h(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  async function create() {
    const n = name.trim(); if (!n) return
    setSaving(true)
    const r = await fetch('/api/categories', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, name: n }),
    })
    const cat: Category = await r.json()
    onCreated(cat); onChange([...values, cat.id])
    setName(''); setSaving(false)
  }

  function toggle(id: string) {
    onChange(values.includes(id) ? values.filter(v => v !== id) : [...values, id])
  }

  const selectedNames = cats.filter(c => values.includes(c.id)).map(c => c.name)
  const label = selectedNames.length === 0 ? '–' : selectedNames.join(', ')

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen(o => !o)}
        className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm outline-none flex items-center justify-between gap-2">
        <span className={cn('truncate', values.length === 0 ? 'text-gray-400' : 'text-gray-900 dark:text-gray-100')}>{label}</span>
        <ChevronDown size={14} className="text-gray-400 shrink-0" />
      </button>
      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-50 overflow-hidden">
          <div className="max-h-44 overflow-y-auto">
            {cats.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-3">Nessuna categoria ancora</p>
            ) : (
              cats.map(c => (
                <button key={c.id} type="button" onClick={() => toggle(c.id)}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  <span className={cn('w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors',
                    values.includes(c.id) ? 'bg-orange-400 border-orange-400' : 'border-gray-300 dark:border-gray-600')}>
                    {values.includes(c.id) && <Check size={10} className="text-white" />}
                  </span>
                  <span className={values.includes(c.id) ? 'font-semibold text-orange-400' : 'text-gray-700 dark:text-gray-300'}>{c.name}</span>
                </button>
              ))
            )}
          </div>
          <div className="flex items-center gap-2 px-3 py-2 border-t border-gray-100 dark:border-gray-800">
            <Plus size={13} className="text-gray-400 shrink-0" />
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') create(); if (e.key === 'Escape') setOpen(false) }}
              placeholder="Nuova categoria..."
              className="flex-1 text-sm bg-transparent outline-none text-gray-900 dark:text-gray-100 placeholder-gray-400"
            />
            {name.trim() && (
              <button onClick={create} disabled={saving}
                className="w-6 h-6 rounded-lg bg-orange-400 text-white flex items-center justify-center shrink-0 disabled:opacity-50">
                {saving ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function FoodFormModal({ form, setForm, categories, userId, onSave, onClose, onCategoryCreated, editing, saving }: {
  form: FoodForm; setForm: (f: FoodForm) => void; categories: Category[]
  userId: string; onSave: () => void; onClose: () => void
  onCategoryCreated: (cat: Category) => void
  editing: boolean; saving: boolean
}) {
  const f = (k: keyof FoodForm, v: string) => setForm({ ...form, [k]: v })
  const inp = "w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 outline-none focus:border-orange-400"
  const [cats, setCats] = useState<Category[]>(categories)

  function handleCreated(cat: Category) {
    setCats(prev => [...prev, cat].sort((a, b) => a.name.localeCompare(b.name, 'it')))
    onCategoryCreated(cat)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-t-3xl md:rounded-2xl w-full md:max-w-md max-h-[92vh] flex flex-col shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800 shrink-0">
          <p className="font-bold text-gray-900 dark:text-gray-100">{editing ? 'Modifica alimento' : 'Nuovo alimento'}</p>
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400 shrink-0"><X size={16} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <div>
            <label className="text-xs text-gray-400 block mb-1">Nome prodotto</label>
            <input value={form.name} onChange={e => f('name', e.target.value)} placeholder="Es. Riso Parboiled" className={inp} />
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">Marca</label>
            <input value={form.brand} onChange={e => f('brand', e.target.value)} placeholder="Es. Lidl o GENERICO" className={inp} />
          </div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide pt-1">Valori per 100g</p>
          <div className="rounded-xl border border-green-100 dark:border-green-900/50 p-3 space-y-2">
            <label className="text-xs font-bold block" style={{ color: '#6abf6a' }}>Energia (kcal)</label>
            <input type="number" value={form.calories} onChange={e => f('calories', e.target.value)} placeholder="0" className={inp} />
          </div>
          <div className="rounded-xl border border-blue-100 dark:border-blue-900/50 p-3 space-y-2">
            <label className="text-xs font-bold block" style={{ color: '#5b9bd5' }}>Grassi (g)</label>
            <input type="number" value={form.fat} onChange={e => f('fat', e.target.value)} placeholder="0" className={inp} />
            <label className="text-xs text-gray-400 block">di cui saturi (g)</label>
            <input type="number" value={form.saturatedFat} onChange={e => f('saturatedFat', e.target.value)} placeholder="0" className={inp} />
          </div>
          <div className="rounded-xl border border-orange-100 dark:border-orange-900/50 p-3 space-y-2">
            <label className="text-xs font-bold block" style={{ color: '#f0aa78' }}>Carboidrati (g)</label>
            <input type="number" value={form.carbs} onChange={e => f('carbs', e.target.value)} placeholder="0" className={inp} />
            <label className="text-xs text-gray-400 block">di cui zuccheri (g)</label>
            <input type="number" value={form.sugars} onChange={e => f('sugars', e.target.value)} placeholder="0" className={inp} />
          </div>
          <div className="rounded-xl border border-purple-100 dark:border-purple-900/50 p-3 space-y-2">
            <label className="text-xs font-bold block" style={{ color: '#9d8fcc' }}>Proteine (g)</label>
            <input type="number" value={form.protein} onChange={e => f('protein', e.target.value)} placeholder="0" className={inp} />
          </div>
          <div className="rounded-xl border border-yellow-100 dark:border-yellow-900/50 p-3 space-y-2">
            <label className="text-xs font-bold block" style={{ color: '#c8b800' }}>Sale (g)</label>
            <input type="number" value={form.salt} onChange={e => f('salt', e.target.value)} placeholder="0" className={inp} />
          </div>
          <div className="pt-1 border-t border-gray-100 dark:border-gray-800 space-y-2">
            <label className="text-xs text-gray-400 block">Categorie</label>
            <CategoryMultiSelect
              values={form.categoryIds}
              cats={cats}
              userId={userId}
              onChange={ids => setForm({ ...form, categoryIds: ids })}
              onCreated={handleCreated}
            />
          </div>
        </div>
        <div className="p-4 border-t border-gray-100 dark:border-gray-800 shrink-0">
          <button onClick={onSave} disabled={saving || !form.name.trim() || !form.calories}
            className="w-full py-3 rounded-xl bg-orange-400 hover:bg-orange-500 text-white font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50 transition-colors">
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
            {editing ? 'Salva modifiche' : 'Aggiungi alimento'}
          </button>
        </div>
      </div>
    </div>
  )
}

const PAGE = 100

function FoodDatabasePage() {
  const userId = useAppStore((s) => s.userId)
  const searchParams = useSearchParams()
  const [foods, setFoods] = useState<Food[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [favorites, setFavorites] = useState<Set<string>>(new Set())
  const [q, setQ] = useState(searchParams.get('q') ?? '')
  const [catFilter, setCatFilter] = useState<string[]>([])
  const [favOnly, setFavOnly] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [offset, setOffset] = useState(0)
  const [showForm, setShowForm] = useState(searchParams.get('new') === '1')
  const [editFood, setEditFood] = useState<Food | null>(null)
  const [form, setForm] = useState<FoodForm>({ ...emptyForm(), name: searchParams.get('q') ?? '' })
  const [saving, setSaving] = useState(false)
  const [selecting, setSelecting] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [showScanner, setShowScanner] = useState(false)
  const timer = useRef<NodeJS.Timeout | undefined>(undefined)

  const fetchAll = useCallback(async (query = q, cat = catFilter, fav = favOnly) => {
    setLoading(true)
    setOffset(0)
    const catStr = Array.isArray(cat) ? cat.join(',') : cat
    const p = new URLSearchParams({ q: query || '', userId, limit: String(PAGE), offset: '0', ...(catStr ? { categoryId: catStr } : {}), ...(fav ? { fav: '1' } : {}) })
    try {
      const [fr, favr] = await Promise.all([
        fetch(`/api/food?${p}`).then(r => r.json()),
        fetch(`/api/favorites?userId=${userId}`).then(r => r.json()).catch(() => []),
      ])
      const list = Array.isArray(fr) ? fr : []
      setFoods(list)
      setHasMore(list.length === PAGE)
      setFavorites(new Set(Array.isArray(favr) ? favr : []))
    } catch {
      setFoods([])
    } finally {
      setLoading(false)
    }
  }, [userId, q, catFilter, favOnly])

  async function loadMore() {
    const next = offset + PAGE
    setLoadingMore(true)
    const catStr = catFilter.join(',')
    const p = new URLSearchParams({ q: q || '', userId, limit: String(PAGE), offset: String(next), ...(catStr ? { categoryId: catStr } : {}), ...(favOnly ? { fav: '1' } : {}) })
    const fr = await fetch(`/api/food?${p}`).then(r => r.json())
    const list = Array.isArray(fr) ? fr : []
    setFoods(prev => [...prev, ...list])
    setHasMore(list.length === PAGE)
    setOffset(next)
    setLoadingMore(false)
  }

  const fetchCats = useCallback(async () => {
    const r = await fetch(`/api/categories?userId=${userId}`)
    setCategories(await r.json())
  }, [userId])

  useEffect(() => { fetchAll('', [], false); fetchCats() }, [userId])

  // Instant client-side filter on already-loaded items (zero latency)
  const displayFoods = useMemo(() => {
    if (!q.trim() && catFilter.length === 0 && !favOnly) return foods
    const lower = q.trim().toLowerCase()
    return foods.filter(f => {
      if (lower && !f.name.toLowerCase().includes(lower) && !f.brand?.toLowerCase().includes(lower)) return false
      if (favOnly && !favorites.has(f.id)) return false
      if (catFilter.length > 0 && !catFilter.some(id => f.categoryIds?.includes(id))) return false
      return true
    })
  }, [foods, q, catFilter, favOnly, favorites])

  function handleSearch(val: string) {
    setQ(val)
    clearTimeout(timer.current)
    // Debounce API call to 200ms — client-side filter above is already instant
    timer.current = setTimeout(() => fetchAll(val, catFilter, favOnly), 200)
  }

  function handleCatChange(ids: string[]) {
    setCatFilter(ids); fetchAll(q, ids, favOnly)
  }

  function toggleFav(foodId: string) {
    setFavorites(prev => { const n = new Set(prev); n.has(foodId) ? n.delete(foodId) : n.add(foodId); return n })
    if (favOnly) setFoods(f => f.filter(x => x.id !== foodId))
    fetch('/api/favorites', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId, foodId }) }).catch(() => {})
  }

  function openEdit(food: Food) {
    setEditFood(food)
    setForm({ name: food.name, brand: food.brand ?? '', calories: String(food.calories), protein: String(food.protein), carbs: String(food.carbs), fat: String(food.fat), saturatedFat: String(food.saturatedFat ?? 0), sugars: String(food.sugars ?? 0), salt: String(food.salt ?? 0), categoryIds: food.categoryIds ?? (food.categoryId ? [food.categoryId] : []) })
    setShowForm(true)
  }

  async function handleSave() {
    if (!form.name.trim() || !form.calories) return
    setSaving(true)
    const payload = { name: form.name, brand: form.brand, calories: Number(form.calories), protein: Number(form.protein), carbs: Number(form.carbs), fat: Number(form.fat), saturatedFat: Number(form.saturatedFat), sugars: Number(form.sugars), salt: Number(form.salt), categoryIds: form.categoryIds, userId }
    if (editFood) {
      await fetch(`/api/food/${editFood.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    } else {
      await fetch('/api/food', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    }
    setSaving(false); setShowForm(false); setEditFood(null); setForm(emptyForm()); fetchAll()
  }

  async function handleDelete(id: string) {
    if (!confirm('Eliminare questo alimento?')) return
    await fetch(`/api/food/${id}`, { method: 'DELETE' })
    setFoods(f => f.filter(x => x.id !== id))
  }

  function startSelecting(foodId: string) {
    setSelecting(true)
    setSelectedIds(new Set([foodId]))
  }

  function toggleSelect(foodId: string) {
    setSelectedIds(prev => {
      const n = new Set(prev)
      n.has(foodId) ? n.delete(foodId) : n.add(foodId)
      return n
    })
  }

  function cancelSelecting() {
    setSelecting(false)
    setSelectedIds(new Set())
  }

  async function deleteSelected() {
    const count = selectedIds.size
    if (!confirm(`Eliminare ${count} aliment${count === 1 ? 'o' : 'i'}?`)) return
    await Promise.all([...selectedIds].map(id => fetch(`/api/food/${id}`, { method: 'DELETE' })))
    setFoods(f => f.filter(x => !selectedIds.has(x.id)))
    cancelSelecting()
  }

  function openNew(prefill = '') {
    setEditFood(null)
    setForm({ ...emptyForm(), name: prefill })
    setShowForm(true)
  }

  return (
    <div className="space-y-3 max-w-2xl mx-auto md:max-w-none pb-2">
      <PageHeader title="Alimenti" icon={Apple} accent="food"
        action={<button onClick={() => openNew()}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-orange-400 hover:bg-orange-500 text-white text-sm font-semibold">
          <Plus size={15} /> Nuovo
        </button>}
      />

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={q} onChange={e => handleSearch(e.target.value)} placeholder="Cerca per nome o marca..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-gray-100 outline-none focus:border-orange-400" />
          {/* no spinner here — client-side filter is instant */}
        </div>
        <button
          onClick={() => setShowScanner(true)}
          className="w-10 h-10 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 flex items-center justify-center shrink-0 hover:bg-orange-50 dark:hover:bg-orange-950/30 hover:border-orange-300 dark:hover:border-orange-700 transition-colors"
          title="Scansiona barcode"
        >
          <ScanBarcode size={18} className="text-orange-400" />
        </button>
      </div>

      <div className="flex gap-2">
        <CategoryFilterDropdown
          values={catFilter}
          cats={categories}
          userId={userId}
          onChange={handleCatChange}
          onCatsChanged={setCategories}
        />
        <button onClick={() => { const n = !favOnly; setFavOnly(n); fetchAll(q, catFilter, n) }}
          className={cn('px-3 py-2 rounded-xl border text-sm font-medium flex items-center gap-1.5 transition-colors', favOnly ? 'border-yellow-400 bg-yellow-50 dark:bg-yellow-950 text-yellow-500' : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-500')}>
          <Star size={14} fill={favOnly ? 'currentColor' : 'none'} />
        </button>
      </div>

      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">
        {displayFoods.map(f => (
          <FoodCard key={f.id} food={f} isFav={favorites.has(f.id)} categories={categories}
            onToggleFav={() => toggleFav(f.id)}
            onEdit={() => openEdit(f)}
            onDelete={() => handleDelete(f.id)}
            selecting={selecting}
            selected={selectedIds.has(f.id)}
            onSelect={() => toggleSelect(f.id)}
            onLongPress={() => startSelecting(f.id)}
          />
        ))}
        {displayFoods.length === 0 && !loading && (
          <p className="text-sm text-gray-400 text-center py-6">Nessun alimento trovato</p>
        )}
        {hasMore && (
          <button onClick={loadMore} disabled={loadingMore}
            className="w-full flex items-center justify-center gap-2 py-3 border-t border-gray-50 dark:border-gray-800 text-sm font-semibold text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-950/30 transition-colors disabled:opacity-50">
            {loadingMore ? <Loader2 size={14} className="animate-spin" /> : null}
            {loadingMore ? 'Caricamento...' : 'Carica altri'}
          </button>
        )}
      </div>

      {q.trim() && !selecting && (
        <button onClick={() => openNew(q)}
          className="w-full flex items-center gap-3 px-4 py-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl hover:bg-orange-50 dark:hover:bg-orange-950/30 transition-colors">
          <div className="w-7 h-7 rounded-lg bg-orange-100 dark:bg-orange-900 flex items-center justify-center shrink-0">
            <Plus size={14} className="text-orange-500" />
          </div>
          <p className="text-sm text-orange-500 font-semibold">Aggiungi &ldquo;{q}&rdquo; al database</p>
        </button>
      )}

      {showScanner && (
        <BarcodeScannerModal
          onClose={() => setShowScanner(false)}
          onFound={prefill => {
            setShowScanner(false)
            setEditFood(null)
            setForm(prefill)
            setShowForm(true)
          }}
        />
      )}

      {showForm && (
        <FoodFormModal form={form} setForm={setForm} categories={categories} userId={userId}
          onSave={handleSave} onClose={() => { setShowForm(false); setEditFood(null) }}
          onCategoryCreated={cat => setCategories(prev => [...prev, cat].sort((a, b) => a.name.localeCompare(b.name, 'it')))}
          editing={!!editFood} saving={saving} />
      )}

      {selecting && (
        <div className="fixed bottom-20 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none">
          <div className="bg-gray-900 dark:bg-white rounded-2xl shadow-2xl flex items-center gap-3 px-4 py-3 text-sm font-semibold max-w-sm w-full pointer-events-auto">
            <span className="flex-1 text-white dark:text-gray-900">{selectedIds.size} selezionat{selectedIds.size === 1 ? 'o' : 'i'}</span>
            <button onClick={deleteSelected}
              className="flex items-center gap-1.5 text-red-400 dark:text-red-500 disabled:opacity-50"
              disabled={selectedIds.size === 0}>
              <Trash2 size={15} /> Elimina
            </button>
            <span className="text-gray-600 dark:text-gray-400">·</span>
            <button onClick={cancelSelecting} className="text-gray-400 dark:text-gray-500">Annulla</button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function FoodDatabaseWrapper() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-48"><div className="w-6 h-6 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" /></div>}>
      <FoodDatabasePage />
    </Suspense>
  )
}
