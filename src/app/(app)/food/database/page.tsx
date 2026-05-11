'use client'
import { useState, useEffect, useRef } from 'react'
import { Search, Plus, Trash2, Apple, Loader2, X } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { PageHeader } from '@/components/shared/PageHeader'

type Food = { id: string; name: string; calories: number; protein: number; carbs: number; fat: number; userId?: string | null }

export default function FoodDatabasePage() {
  const userId = useAppStore((s) => s.userId)
  const [foods, setFoods] = useState<Food[]>([])
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', calories: '', protein: '', carbs: '', fat: '' })
  const [saving, setSaving] = useState(false)
  const timer = useRef<NodeJS.Timeout | undefined>(undefined)

  function search(query: string) {
    clearTimeout(timer.current)
    timer.current = setTimeout(async () => {
      setLoading(true)
      const r = await fetch(`/api/food?q=${encodeURIComponent(query)}&userId=${userId}`)
      setFoods(await r.json())
      setLoading(false)
    }, 300)
  }

  useEffect(() => { search('a') }, [])

  function handleQ(val: string) {
    setQ(val)
    search(val || 'a')
  }

  async function handleSave() {
    if (!form.name || !form.calories) return
    setSaving(true)
    await fetch('/api/food', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.name,
        calories: Number(form.calories),
        protein: Number(form.protein),
        carbs: Number(form.carbs),
        fat: Number(form.fat),
        userId,
      }),
    })
    setSaving(false)
    setShowForm(false)
    setForm({ name: '', calories: '', protein: '', carbs: '', fat: '' })
    search(q || 'a')
  }

  async function handleDelete(id: string) {
    await fetch(`/api/food/${id}`, { method: 'DELETE' })
    setFoods(f => f.filter(x => x.id !== id))
  }

  return (
    <div className="space-y-5 max-w-2xl mx-auto md:max-w-none">
      <PageHeader title="Database Alimenti" icon={Apple} accent="food"
        action={
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-orange-400 hover:bg-orange-500 text-white text-sm font-medium transition-colors">
            <Plus size={15} /> Nuovo
          </button>
        }
      />

      {/* Search */}
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input value={q} onChange={e => handleQ(e.target.value)} placeholder="Cerca alimento..."
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-gray-100 outline-none focus:border-orange-400" />
        {loading && <Loader2 size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 animate-spin" />}
      </div>

      {/* Add food form */}
      {showForm && (
        <div className="bg-white dark:bg-gray-900 border border-orange-200 dark:border-orange-900 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-sm text-gray-900 dark:text-gray-100">Nuovo alimento <span className="text-xs text-gray-400 font-normal">/ 100g</span></p>
            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
          </div>
          <input value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} placeholder="Nome alimento"
            className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 outline-none focus:border-orange-400" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {(['calories','protein','carbs','fat'] as const).map(k => (
              <input key={k} type="number" value={form[k]}
                onChange={e => setForm(f => ({...f, [k]: e.target.value}))}
                placeholder={k === 'calories' ? 'Kcal' : k === 'protein' ? 'Proteine g' : k === 'carbs' ? 'Carb g' : 'Grassi g'}
                className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 outline-none focus:border-orange-400" />
            ))}
          </div>
          <button onClick={handleSave} disabled={saving}
            className="w-full py-2.5 rounded-xl bg-orange-400 hover:bg-orange-500 text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50 transition-colors">
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />} Salva
          </button>
        </div>
      )}

      {/* Food list */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">
        {foods.length === 0 && !loading ? (
          <p className="text-sm text-gray-400 text-center py-8">Nessun alimento trovato</p>
        ) : (
          <div className="divide-y divide-gray-50 dark:divide-gray-800">
            {foods.map(f => (
              <div key={f.id} className="flex items-center justify-between px-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{f.name}</p>
                  <p className="text-xs text-gray-400">{f.calories} kcal · P {f.protein}g · C {f.carbs}g · G {f.fat}g <span className="text-gray-300">/ 100g</span></p>
                </div>
                {f.userId === userId && (
                  <button onClick={() => handleDelete(f.id)} className="ml-2 w-7 h-7 rounded-lg hover:bg-red-50 dark:hover:bg-red-950 text-gray-400 hover:text-red-500 flex items-center justify-center transition-colors">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
