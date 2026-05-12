'use client'
import { useState, useEffect, useCallback } from 'react'
import { Plus, Trash2, Pencil, Copy, ChevronUp, ChevronDown, Check, X, ClipboardList, Loader2 } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { PageHeader } from '@/components/shared/PageHeader'
import { cn } from '@/lib/utils'

type WorkoutPlan = { id: string; name: string; order: number; createdAt: string }

const DEFAULT_WORKOUTS = [
  'Workout 1 — Chest + Back',
  'Workout 2 — Legs',
  'Workout 3 — Shoulders + Secondary Session',
]

export default function TrainingPlanPage() {
  const userId = useAppStore((s) => s.userId)
  const [plans, setPlans] = useState<WorkoutPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [newName, setNewName] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [saving, setSaving] = useState(false)

  const fetchPlans = useCallback(async () => {
    setLoading(true)
    const r = await fetch(`/api/workout-plans?userId=${userId}`)
    const data = await r.json()
    setPlans(data)
    setLoading(false)
  }, [userId])

  useEffect(() => { fetchPlans() }, [fetchPlans])

  // Seed default workouts if empty
  useEffect(() => {
    if (!loading && plans.length === 0) {
      seedDefaults()
    }
  }, [loading, plans.length])

  async function seedDefaults() {
    for (const name of DEFAULT_WORKOUTS) {
      await fetch('/api/workout-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, name }),
      })
    }
    fetchPlans()
  }

  async function handleCreate() {
    if (!newName.trim()) return
    setSaving(true)
    await fetch('/api/workout-plans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, name: newName }),
    })
    setNewName(''); setShowNew(false); setSaving(false)
    fetchPlans()
  }

  async function handleSaveEdit(id: string) {
    if (!editName.trim()) return
    setSaving(true)
    await fetch(`/api/workout-plans/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editName }),
    })
    setEditingId(null); setSaving(false)
    fetchPlans()
  }

  async function handleDelete(id: string) {
    if (!confirm('Eliminare questo workout?')) return
    await fetch(`/api/workout-plans/${id}`, { method: 'DELETE' })
    setPlans(p => p.filter(x => x.id !== id))
  }

  async function handleDuplicate(id: string) {
    await fetch(`/api/workout-plans/${id}/duplicate`, { method: 'POST' })
    fetchPlans()
  }

  async function handleReorder(id: string, direction: 'up' | 'down') {
    await fetch(`/api/workout-plans/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reorder', direction, userId }),
    })
    fetchPlans()
  }

  return (
    <div className="space-y-4 max-w-2xl mx-auto md:max-w-none pb-2">
      <PageHeader title="Piano Allenamento" icon={ClipboardList} accent="training"
        action={
          <button onClick={() => setShowNew(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold transition-colors">
            <Plus size={15} /> Nuovo
          </button>
        }
      />

      {/* New workout form */}
      {showNew && (
        <div className="bg-white dark:bg-gray-900 border border-blue-200 dark:border-blue-800 rounded-2xl p-4 flex gap-2">
          <input autoFocus value={newName} onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCreate()}
            placeholder="Nome workout (es. Chest + Back)"
            className="flex-1 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 outline-none focus:border-blue-400" />
          <button onClick={handleCreate} disabled={saving || !newName.trim()}
            className="w-9 h-9 rounded-xl bg-blue-500 text-white flex items-center justify-center disabled:opacity-50">
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
          </button>
          <button onClick={() => { setShowNew(false); setNewName('') }}
            className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-500 flex items-center justify-center">
            <X size={15} />
          </button>
        </div>
      )}

      {/* Plans list */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-2">
          {plans.map((plan, idx) => (
            <div key={plan.id}
              className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-3.5">
                {/* Order number */}
                <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950 flex items-center justify-center shrink-0">
                  <span className="text-sm font-bold text-blue-500">{idx + 1}</span>
                </div>

                {/* Name or edit input */}
                {editingId === plan.id ? (
                  <input autoFocus value={editName} onChange={e => setEditName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleSaveEdit(plan.id); if (e.key === 'Escape') setEditingId(null) }}
                    className="flex-1 px-3 py-1.5 rounded-xl border border-blue-300 dark:border-blue-700 bg-gray-50 dark:bg-gray-800 text-sm font-semibold text-gray-900 dark:text-gray-100 outline-none" />
                ) : (
                  <p className="flex-1 text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{plan.name}</p>
                )}

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  {editingId === plan.id ? (
                    <>
                      <button onClick={() => handleSaveEdit(plan.id)}
                        className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-500 flex items-center justify-center">
                        <Check size={14} />
                      </button>
                      <button onClick={() => setEditingId(null)}
                        className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-500 flex items-center justify-center">
                        <X size={14} />
                      </button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => handleReorder(plan.id, 'up')} disabled={idx === 0}
                        className={cn('w-7 h-7 rounded-lg flex items-center justify-center transition-colors',
                          idx === 0 ? 'text-gray-200 dark:text-gray-700' : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800')}>
                        <ChevronUp size={14} />
                      </button>
                      <button onClick={() => handleReorder(plan.id, 'down')} disabled={idx === plans.length - 1}
                        className={cn('w-7 h-7 rounded-lg flex items-center justify-center transition-colors',
                          idx === plans.length - 1 ? 'text-gray-200 dark:text-gray-700' : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800')}>
                        <ChevronDown size={14} />
                      </button>
                      <button onClick={() => { setEditingId(plan.id); setEditName(plan.name) }}
                        className="w-7 h-7 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950 text-gray-400 hover:text-blue-500 flex items-center justify-center transition-colors">
                        <Pencil size={13} />
                      </button>
                      <button onClick={() => handleDuplicate(plan.id)}
                        className="w-7 h-7 rounded-lg hover:bg-violet-50 dark:hover:bg-violet-950 text-gray-400 hover:text-violet-500 flex items-center justify-center transition-colors">
                        <Copy size={13} />
                      </button>
                      <button onClick={() => handleDelete(plan.id)}
                        className="w-7 h-7 rounded-lg hover:bg-red-50 dark:hover:bg-red-950 text-gray-400 hover:text-red-500 flex items-center justify-center transition-colors">
                        <Trash2 size={13} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}

          {plans.length === 0 && (
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-8 text-center">
              <ClipboardList size={32} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500 font-medium">Nessun workout</p>
              <p className="text-sm text-gray-400 mt-1">Clicca "Nuovo" per crearne uno</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
