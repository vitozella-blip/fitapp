'use client'
import { useState, useEffect, useRef, useCallback, Suspense } from 'react'
import { Search, Plus, Trash2, Star, ChevronDown, Pencil, X, Loader2, Settings, Check } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { PageHeader } from '@/components/shared/PageHeader'
import { Apple } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSearchParams, useRouter } from 'next/navigation'

type Food = {
  id: string; name: string; brand?: string; calories: number
  protein: number; carbs: number; fat: number
  saturatedFat?: number; sugars?: number; salt?: number
  userId?: string | null; categoryId?: string | null
}
type Category = { id: string; name: string }
type FoodForm = { name: string; brand: string; calories: string; protein: string; carbs: string; fat: string; saturatedFat: string; sugars: string; salt: string; categoryId: string }

const emptyForm = (): FoodForm => ({ name: '', brand: '', calories: '', protein: '', carbs: '', fat: '', saturatedFat: '', sugars: '', salt: '', categoryId: '' })

const fmt = (v: number | undefined | null, unit = 'g') =>
  v == null || v === 0 ? '—' : `${v} ${unit}`

const DETAIL_ROWS: { label: string; key: keyof Food; color: string; sub?: boolean }[] = [
  { label: 'Energia',         key: 'calories',     color: '#6c5ce7' },
  { label: 'Grassi',          key: 'fat',          color: '#9b59b6' },
  { label: 'di cui saturi',   key: 'saturatedFat', color: '#c4a0d6', sub: true },
  { label: 'Carboidrati',     key: 'carbs',        color: '#e8813a' },
  { label: 'di cui zuccheri', key: 'sugars',       color: '#f0aa78', sub: true },
  { label: 'Proteine',        key: 'protein',      color: '#5a9e5a' },
  { label: 'Sale',            key: 'salt',         color: '#94a3b8' },
]

function FoodCard({ food, isFav, onToggleFav, onEdit, onDelete }: {
  food: Food; isFav: boolean
  onToggleFav: () => void; onEdit: () => void; onDelete: () => void
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-gray-50 dark:border-gray-800 last:border-0">
      <div className="flex items-center gap-2 px-4 py-3">
        <button onClick={onToggleFav} className="shrink-0">
          <Star size={16} className={cn('transition-colors', isFav ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300')} />
        </button>
        <button onClick={() => setOpen(o => !o)} className="flex-1 min-w-0 text-left">
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{food.name}</p>
          {food.brand && <p className="text-xs text-gray-400 truncate">{food.brand}</p>}
          <div className="flex items-center gap-2 text-xs mt-0.5 flex-wrap">
            <span className="font-bold text-gray-600 dark:text-gray-400">{food.calories} kcal</span>
            <span style={{ color: '#9b59b6' }}>G {food.fat}g</span>
            <span style={{ color: '#e8813a' }}>C {food.carbs}g</span>
            <span style={{ color: '#5a9e5a' }}>P {food.protein}g</span>
          </div>
        </button>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={onEdit} className="w-7 h-7 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950 text-gray-400 hover:text-blue-500 flex items-center justify-center transition-colors">
            <Pencil size={13} />
          </button>
          <button onClick={onDelete} className="w-7 h-7 rounded-lg hover:bg-red-50 dark:hover:bg-red-950 text-gray-400 hover:text-red-500 flex items-center justify-center transition-colors">
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {open && (
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
  )
}

function FoodFormModal({ form, setForm, categories, onSave, onClose, editing, saving }: {
  form: FoodForm; setForm: (f: FoodForm) => void; categories: Category[]
  onSave: () => void; onClose: () => void; editing: boolean; saving: boolean
}) {
  const f = (k: keyof FoodForm, v: string) => setForm({ ...form, [k]: v })
  const inp = "w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 outline-none focus:border-orange-400"

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white dark:bg-gray-900 rounded-t-3xl md:rounded-2xl w-full md:max-w-md max-h-[92vh] flex flex-col shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800 shrink-0">
          <p className="font-bold text-gray-900 dark:text-gray-100">{editing ? 'Modifica alimento' : 'Nuovo alimento'}</p>
          <button onClick={onClose} className="w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500"><X size={14} /></button>
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
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1">Energia (kcal)</label>
            <input type="number" value={form.calories} onChange={e => f('calories', e.target.value)} placeholder="0" className={inp} />
          </div>
          <div className="rounded-xl border border-purple-100 dark:border-purple-900/50 p-3 space-y-2">
            <label className="text-xs font-bold block" style={{ color: '#9b59b6' }}>Grassi (g)</label>
            <input type="number" value={form.fat} onChange={e => f('fat', e.target.value)} placeholder="0" className={inp} />
            <label className="text-xs text-gray-400 block">di cui saturi (g)</label>
            <input type="number" value={form.saturatedFat} onChange={e => f('saturatedFat', e.target.value)} placeholder="0" className={inp} />
          </div>
          <div className="rounded-xl border border-orange-100 dark:border-orange-900/50 p-3 space-y-2">
            <label className="text-xs font-bold block" style={{ color: '#e8813a' }}>Carboidrati (g)</label>
            <input type="number" value={form.carbs} onChange={e => f('carbs', e.target.value)} placeholder="0" className={inp} />
            <label className="text-xs text-gray-400 block">di cui zuccheri (g)</label>
            <input type="number" value={form.sugars} onChange={e => f('sugars', e.target.value)} placeholder="0" className={inp} />
          </div>
          <div className="rounded-xl border border-green-100 dark:border-green-900/50 p-3 space-y-2">
            <label className="text-xs font-bold block" style={{ color: '#5a9e5a' }}>Proteine (g)</label>
            <input type="number" value={form.protein} onChange={e => f('protein', e.target.value)} placeholder="0" className={inp} />
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">Sale (g)</label>
            <input type="number" value={form.salt} onChange={e => f('salt', e.target.value)} placeholder="0" className={inp} />
          </div>
          <div className="pt-1 border-t border-gray-100 dark:border-gray-800">
            <label className="text-xs text-gray-400 block mb-1">Categoria</label>
            <div className="relative">
              <select value={form.categoryId} onChange={e => f('categoryId', e.target.value)} className={inp + ' appearance-none pr-8'}>
                <option value="">Nessuna categoria</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
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

function FoodDatabasePage() {
  const userId = useAppStore((s) => s.userId)
  const router = useRouter()
  const searchParams = useSearchParams()
  const [foods, setFoods] = useState<Food[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [favorites, setFavorites] = useState<Set<string>>(new Set())
  const [q, setQ] = useState(searchParams.get('q') ?? '')
  const [catFilter, setCatFilter] = useState('')
  const [favOnly, setFavOnly] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(searchParams.get('new') === '1')
  const [editFood, setEditFood] = useState<Food | null>(null)
  const [form, setForm] = useState<FoodForm>({ ...emptyForm(), name: searchParams.get('q') ?? '' })
  const [saving, setSaving] = useState(false)
  const [showCatManager, setShowCatManager] = useState(false)
  const [catInput, setCatInput] = useState('')
  const [editCat, setEditCat] = useState<Category | null>(null)
  const timer = useRef<NodeJS.Timeout | undefined>(undefined)

  const fetchAll = useCallback(async (query = q, cat = catFilter, fav = favOnly) => {
    setLoading(true)
    const p = new URLSearchParams({ q: query || '', userId, ...(cat ? { categoryId: cat } : {}), ...(fav ? { fav: '1' } : {}) })
    const [fr, favr] = await Promise.all([
      fetch(`/api/food?${p}`).then(r => r.json()),
      fetch(`/api/favorites?userId=${userId}`).then(r => r.json()),
    ])
    setFoods(Array.isArray(fr) ? fr : [])
    setFavorites(new Set(Array.isArray(favr) ? favr : []))
    setLoading(false)
  }, [userId, q, catFilter, favOnly])

  const fetchCats = useCallback(async () => {
    const r = await fetch(`/api/categories?userId=${userId}`)
    setCategories(await r.json())
  }, [userId])

  useEffect(() => { fetchAll('', '', false); fetchCats() }, [userId])

  function handleSearch(val: string) {
    setQ(val); clearTimeout(timer.current)
    timer.current = setTimeout(() => fetchAll(val, catFilter, favOnly), 300)
  }

  async function toggleFav(foodId: string) {
    await fetch('/api/favorites', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId, foodId }) })
    setFavorites(prev => { const n = new Set(prev); n.has(foodId) ? n.delete(foodId) : n.add(foodId); return n })
    if (favOnly) setFoods(f => f.filter(x => x.id !== foodId))
  }

  function openEdit(food: Food) {
    setEditFood(food)
    setForm({ name: food.name, brand: food.brand ?? '', calories: String(food.calories), protein: String(food.protein), carbs: String(food.carbs), fat: String(food.fat), saturatedFat: String(food.saturatedFat ?? 0), sugars: String(food.sugars ?? 0), salt: String(food.salt ?? 0), categoryId: food.categoryId ?? '' })
    setShowForm(true)
  }

  async function handleSave() {
    if (!form.name.trim() || !form.calories) return
    setSaving(true)
    const payload = { name: form.name, brand: form.brand, calories: Number(form.calories), protein: Number(form.protein), carbs: Number(form.carbs), fat: Number(form.fat), saturatedFat: Number(form.saturatedFat), sugars: Number(form.sugars), salt: Number(form.salt), categoryId: form.categoryId || null, userId }
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

  async function saveCat() {
    if (!catInput.trim()) return
    if (editCat) await fetch(`/api/categories/${editCat.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: catInput }) })
    else await fetch('/api/categories', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId, name: catInput }) })
    setCatInput(''); setEditCat(null); fetchCats()
  }

  async function deleteCat(id: string) {
    await fetch(`/api/categories/${id}`, { method: 'DELETE' })
    if (catFilter === id) { setCatFilter(''); fetchAll(q, '', favOnly) }
    fetchCats()
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

      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input value={q} onChange={e => handleSearch(e.target.value)} placeholder="Cerca per nome o marca..."
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-gray-100 outline-none focus:border-orange-400" />
        {loading && <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 animate-spin" />}
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <select value={catFilter} onChange={e => { setCatFilter(e.target.value); fetchAll(q, e.target.value, favOnly) }}
            className="w-full appearance-none pl-3 pr-8 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-gray-100 outline-none">
            <option value="">Tutte le categorie</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
        <button onClick={() => { const n = !favOnly; setFavOnly(n); fetchAll(q, catFilter, n) }}
          className={cn('px-3 py-2 rounded-xl border text-sm font-medium flex items-center gap-1.5 transition-colors', favOnly ? 'border-yellow-400 bg-yellow-50 dark:bg-yellow-950 text-yellow-500' : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-500')}>
          <Star size={14} fill={favOnly ? 'currentColor' : 'none'} />
        </button>
        <button onClick={() => setShowCatManager(true)}
          className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-500">
          <Settings size={14} />
        </button>
      </div>

      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">
        {foods.map(f => (
          <FoodCard key={f.id} food={f} isFav={favorites.has(f.id)}
            onToggleFav={() => toggleFav(f.id)}
            onEdit={() => openEdit(f)}
            onDelete={() => handleDelete(f.id)}
          />
        ))}
        {foods.length === 0 && !loading && (
          <p className="text-sm text-gray-400 text-center py-6">Nessun alimento trovato</p>
        )}
      </div>

      {q.trim() && (
        <button onClick={() => openNew(q)}
          className="w-full flex items-center gap-3 px-4 py-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl hover:bg-orange-50 dark:hover:bg-orange-950/30 transition-colors">
          <div className="w-7 h-7 rounded-lg bg-orange-100 dark:bg-orange-900 flex items-center justify-center shrink-0">
            <Plus size={14} className="text-orange-500" />
          </div>
          <p className="text-sm text-orange-500 font-semibold">Aggiungi &ldquo;{q}&rdquo; al database</p>
        </button>
      )}

      {showForm && (
        <FoodFormModal form={form} setForm={setForm} categories={categories}
          onSave={handleSave} onClose={() => { setShowForm(false); setEditFood(null) }}
          editing={!!editFood} saving={saving} />
      )}

      {showCatManager && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40" onClick={() => setShowCatManager(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-t-3xl md:rounded-2xl w-full md:max-w-md p-5 shadow-xl space-y-3 max-h-[70vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between shrink-0">
              <p className="font-bold text-gray-900 dark:text-gray-100">Categorie</p>
              <button onClick={() => { setShowCatManager(false); setEditCat(null); setCatInput('') }} className="w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500"><X size={14} /></button>
            </div>
            <div className="flex gap-2 shrink-0">
              <input value={catInput} onChange={e => setCatInput(e.target.value)} placeholder={editCat ? 'Modifica...' : 'Nuova categoria...'}
                className="flex-1 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 outline-none focus:border-orange-400" />
              <button onClick={saveCat} className="px-4 py-2 rounded-xl bg-orange-400 text-white text-sm font-semibold">{editCat ? 'Salva' : 'Aggiungi'}</button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-1">
              {categories.map(c => (
                <div key={c.id} className="flex items-center gap-2 px-3 py-2.5 bg-gray-50 dark:bg-gray-800 rounded-xl">
                  <p className="flex-1 text-sm font-medium text-gray-900 dark:text-gray-100">{c.name}</p>
                  <button onClick={() => { setEditCat(c); setCatInput(c.name) }} className="w-7 h-7 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950 text-gray-400 hover:text-blue-500 flex items-center justify-center"><Pencil size={13} /></button>
                  <button onClick={() => deleteCat(c.id)} className="w-7 h-7 rounded-lg hover:bg-red-50 dark:hover:bg-red-950 text-gray-400 hover:text-red-500 flex items-center justify-center"><Trash2 size={13} /></button>
                </div>
              ))}
            </div>
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
