'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { Search, Plus, Trash2, Star, ChevronDown, Pencil, X, Loader2, Settings } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { PageHeader } from '@/components/shared/PageHeader'
import { Apple } from 'lucide-react'
import { cn } from '@/lib/utils'

type Food = { id: string; name: string; calories: number; protein: number; carbs: number; fat: number; userId?: string | null; categoryId?: string | null }
type Category = { id: string; name: string }

type FoodFormData = { name: string; calories: string; protein: string; carbs: string; fat: string; categoryId: string }
const emptyForm: FoodFormData = { name: '', calories: '', protein: '', carbs: '', fat: '', categoryId: '' }

export default function FoodDatabasePage() {
  const userId = useAppStore((s) => s.userId)
  const [foods, setFoods] = useState<Food[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [favorites, setFavorites] = useState<Set<string>>(new Set())
  const [q, setQ] = useState('')
  const [catFilter, setCatFilter] = useState('')
  const [favOnly, setFavOnly] = useState(false)
  const [loading, setLoading] = useState(false)

  // Food form
  const [showForm, setShowForm] = useState(false)
  const [editFood, setEditFood] = useState<Food | null>(null)
  const [form, setForm] = useState<FoodFormData>(emptyForm)
  const [saving, setSaving] = useState(false)

  // Category manager
  const [showCatManager, setShowCatManager] = useState(false)
  const [catInput, setCatInput] = useState('')
  const [editCat, setEditCat] = useState<Category | null>(null)
  const [savingCat, setSavingCat] = useState(false)

  const timer = useRef<NodeJS.Timeout | undefined>(undefined)

  const fetchAll = useCallback(async (query = q, cat = catFilter, fav = favOnly) => {
    setLoading(true)
    const params = new URLSearchParams({ q: query || '', userId, ...(cat ? { categoryId: cat } : {}), ...(fav ? { fav: '1' } : {}) })
    const [foodsRes, favsRes] = await Promise.all([
      fetch(`/api/food?${params}`).then(r => r.json()),
      fetch(`/api/favorites?userId=${userId}`).then(r => r.json()),
    ])
    setFoods(foodsRes)
    setFavorites(new Set(favsRes))
    setLoading(false)
  }, [userId, q, catFilter, favOnly])

  const fetchCategories = useCallback(async () => {
    const res = await fetch(`/api/categories?userId=${userId}`)
    setCategories(await res.json())
  }, [userId])

  useEffect(() => { fetchAll('', '', false); fetchCategories() }, [userId])

  function handleSearch(val: string) {
    setQ(val)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => fetchAll(val, catFilter, favOnly), 300)
  }

  function handleCatFilter(val: string) {
    setCatFilter(val)
    fetchAll(q, val, favOnly)
  }

  function handleFavFilter() {
    const next = !favOnly
    setFavOnly(next)
    fetchAll(q, catFilter, next)
  }

  async function toggleFav(foodId: string, e: React.MouseEvent) {
    e.stopPropagation()
    await fetch('/api/favorites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, foodId }),
    })
    setFavorites(prev => {
      const next = new Set(prev)
      next.has(foodId) ? next.delete(foodId) : next.add(foodId)
      return next
    })
    if (favOnly) setFoods(f => f.filter(x => x.id !== foodId))
  }

  function openAddForm() {
    setEditFood(null)
    setForm(emptyForm)
    setShowForm(true)
  }

  function openEditForm(food: Food, e: React.MouseEvent) {
    e.stopPropagation()
    setEditFood(food)
    setForm({ name: food.name, calories: String(food.calories), protein: String(food.protein), carbs: String(food.carbs), fat: String(food.fat), categoryId: food.categoryId ?? '' })
    setShowForm(true)
  }

  async function handleSave() {
    if (!form.name || !form.calories) return
    setSaving(true)
    if (editFood) {
      await fetch(`/api/food/${editFood.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name, calories: Number(form.calories), protein: Number(form.protein), carbs: Number(form.carbs), fat: Number(form.fat), categoryId: form.categoryId || null }),
      })
    } else {
      await fetch('/api/food', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name, calories: Number(form.calories), protein: Number(form.protein), carbs: Number(form.carbs), fat: Number(form.fat), userId, categoryId: form.categoryId || null }),
      })
    }
    setSaving(false)
    setShowForm(false)
    fetchAll()
  }

  async function handleDelete(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    await fetch(`/api/food/${id}`, { method: 'DELETE' })
    setFoods(f => f.filter(x => x.id !== id))
  }

  async function saveCat() {
    if (!catInput.trim()) return
    setSavingCat(true)
    if (editCat) {
      await fetch(`/api/categories/${editCat.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: catInput }) })
    } else {
      await fetch('/api/categories', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId, name: catInput }) })
    }
    setSavingCat(false)
    setCatInput('')
    setEditCat(null)
    fetchCategories()
  }

  async function deleteCat(id: string) {
    await fetch(`/api/categories/${id}`, { method: 'DELETE' })
    if (catFilter === id) { setCatFilter(''); fetchAll(q, '', favOnly) }
    fetchCategories()
  }

  const selectedCatName = categories.find(c => c.id === catFilter)?.name

  return (
    <div className="space-y-3 max-w-2xl mx-auto md:max-w-none pb-2">
      <PageHeader title="Alimenti" icon={Apple} accent="food"
        action={
          <button onClick={openAddForm}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-orange-400 hover:bg-orange-500 text-white text-sm font-semibold transition-colors">
            <Plus size={15} /> Nuovo
          </button>
        }
      />

      {/* Search */}
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input value={q} onChange={e => handleSearch(e.target.value)} placeholder="Cerca alimento..."
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-gray-100 outline-none focus:border-orange-400" />
        {loading && <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 animate-spin" />}
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <select value={catFilter} onChange={e => handleCatFilter(e.target.value)}
            className="w-full appearance-none pl-3 pr-8 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-gray-100 outline-none focus:border-orange-400">
            <option value="">Tutte le categorie</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
        <button onClick={handleFavFilter}
          className={cn('px-3 py-2 rounded-xl border text-sm font-medium flex items-center gap-1.5 transition-colors',
            favOnly ? 'border-yellow-400 bg-yellow-50 dark:bg-yellow-950 text-yellow-500' : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-500'
          )}>
          <Star size={14} fill={favOnly ? 'currentColor' : 'none'} />
          Preferiti
        </button>
        <button onClick={() => setShowCatManager(true)}
          className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-500 hover:text-gray-700 transition-colors">
          <Settings size={14} />
        </button>
      </div>

      {/* Category label */}
      {(catFilter || favOnly) && (
        <div className="flex items-center gap-2">
          {catFilter && <span className="text-xs bg-orange-50 dark:bg-orange-950 text-orange-500 px-2.5 py-1 rounded-full font-medium flex items-center gap-1">
            {selectedCatName} <button onClick={() => handleCatFilter('')}><X size={11} /></button>
          </span>}
          {favOnly && <span className="text-xs bg-yellow-50 dark:bg-yellow-950 text-yellow-500 px-2.5 py-1 rounded-full font-medium flex items-center gap-1">
            Preferiti <button onClick={handleFavFilter}><X size={11} /></button>
          </span>}
        </div>
      )}

      {/* Food list */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">
        {foods.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">Nessun alimento trovato</p>
        ) : (
          <div className="divide-y divide-gray-50 dark:divide-gray-800">
            {foods.map(f => (
              <div key={f.id} className="flex items-center gap-2 px-4 py-3">
                <button onClick={e => toggleFav(f.id, e)} className="shrink-0">
                  <Star size={16} className={cn('transition-colors', favorites.has(f.id) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300')} />
                </button>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{f.name}</p>
                  <p className="text-xs text-gray-400">{f.calories} kcal · P {f.protein}g · C {f.carbs}g · G {f.fat}g <span className="text-gray-300">/ 100g</span></p>
                </div>
                {f.userId === userId && (
                  <div className="flex gap-1 shrink-0">
                    <button onClick={e => openEditForm(f, e)} className="w-7 h-7 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950 text-gray-400 hover:text-blue-500 flex items-center justify-center transition-colors">
                      <Pencil size={13} />
                    </button>
                    <button onClick={e => handleDelete(f.id, e)} className="w-7 h-7 rounded-lg hover:bg-red-50 dark:hover:bg-red-950 text-gray-400 hover:text-red-500 flex items-center justify-center transition-colors">
                      <Trash2 size={13} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Food Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40" onClick={() => setShowForm(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-t-3xl md:rounded-2xl w-full md:max-w-md p-5 shadow-xl space-y-3" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <p className="font-bold text-gray-900 dark:text-gray-100">{editFood ? 'Modifica alimento' : 'Nuovo alimento'}</p>
              <button onClick={() => setShowForm(false)} className="w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500"><X size={14} /></button>
            </div>
            <input value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} placeholder="Nome alimento"
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 outline-none focus:border-orange-400" />
            <div className="grid grid-cols-2 gap-2">
              {([['calories','Kcal'],['protein','Proteine g'],['carbs','Carboidrati g'],['fat','Grassi g']] as const).map(([k, ph]) => (
                <input key={k} type="number" value={form[k]} onChange={e => setForm(f => ({...f, [k]: e.target.value}))} placeholder={ph}
                  className="px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 outline-none focus:border-orange-400" />
              ))}
            </div>
            <div className="relative">
              <select value={form.categoryId} onChange={e => setForm(f => ({...f, categoryId: e.target.value}))}
                className="w-full appearance-none pl-3 pr-8 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 outline-none focus:border-orange-400">
                <option value="">Nessuna categoria</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
            <button onClick={handleSave} disabled={saving}
              className="w-full py-3 rounded-xl bg-orange-400 hover:bg-orange-500 text-white font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50 transition-colors">
              {saving ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
              {editFood ? 'Salva modifiche' : 'Aggiungi alimento'}
            </button>
          </div>
        </div>
      )}

      {/* Category Manager Modal */}
      {showCatManager && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40" onClick={() => setShowCatManager(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-t-3xl md:rounded-2xl w-full md:max-w-md p-5 shadow-xl space-y-3 max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <p className="font-bold text-gray-900 dark:text-gray-100">Categorie</p>
              <button onClick={() => { setShowCatManager(false); setEditCat(null); setCatInput('') }}
                className="w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500"><X size={14} /></button>
            </div>
            <div className="flex gap-2">
              <input value={catInput} onChange={e => setCatInput(e.target.value)}
                placeholder={editCat ? 'Modifica nome...' : 'Nuova categoria...'}
                className="flex-1 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 outline-none focus:border-orange-400" />
              <button onClick={saveCat} disabled={savingCat}
                className="px-4 py-2 rounded-xl bg-orange-400 hover:bg-orange-500 text-white text-sm font-semibold transition-colors disabled:opacity-50">
                {editCat ? 'Salva' : 'Aggiungi'}
              </button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-1">
              {categories.length === 0 && <p className="text-sm text-gray-400 text-center py-4">Nessuna categoria</p>}
              {categories.map(c => (
                <div key={c.id} className="flex items-center gap-2 px-3 py-2.5 bg-gray-50 dark:bg-gray-800 rounded-xl">
                  <p className="flex-1 text-sm font-medium text-gray-900 dark:text-gray-100">{c.name}</p>
                  <button onClick={() => { setEditCat(c); setCatInput(c.name) }}
                    className="w-7 h-7 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950 text-gray-400 hover:text-blue-500 flex items-center justify-center transition-colors">
                    <Pencil size={13} />
                  </button>
                  <button onClick={() => deleteCat(c.id)}
                    className="w-7 h-7 rounded-lg hover:bg-red-50 dark:hover:bg-red-950 text-gray-400 hover:text-red-500 flex items-center justify-center transition-colors">
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
