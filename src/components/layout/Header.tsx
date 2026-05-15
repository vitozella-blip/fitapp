'use client'
import { useTheme } from 'next-themes'
import { Sun, Moon, ChevronDown, Plus, Check, Pencil, X } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { useAppStore } from '@/store/useAppStore'
import { useState, useRef, useEffect } from 'react'

export function Header() {
  const { theme, setTheme } = useTheme()
  const { userId, users, userProfile, addUser, switchUser, updateCurrentUserName } = useAppStore()
  const [open, setOpen] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState(userProfile.name)
  const [newName, setNewName] = useState('')
  const [addingUser, setAddingUser] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handle(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  async function saveUserName() {
    if (!nameInput.trim()) return
    updateCurrentUserName(nameInput)
    await fetch('/api/user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, name: nameInput }),
    })
    setEditingName(false)
  }

  async function handleAddUser() {
    if (!newName.trim()) return
    const id = addUser(newName)
    await fetch('/api/user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: id, name: newName }),
    })
    switchUser(id, newName)
    setNewName('')
    setAddingUser(false)
    setOpen(false)
  }

  return (
    <header className="h-14 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 flex items-center justify-between sticky top-0 z-10">
      <div ref={ref} className="relative">
        <button onClick={() => setOpen(o => !o)}
          className="flex items-center gap-1.5 py-1 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 px-2 transition-colors">
          <div className="w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center text-emerald-600 dark:text-emerald-400 text-xs font-bold">
            {userProfile.name[0]?.toUpperCase()}
          </div>
          <div className="text-left">
            <p className="text-xs text-gray-400 leading-none">{formatDate(new Date())}</p>
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 leading-tight">Ciao, {userProfile.name} 👋</p>
          </div>
          <ChevronDown size={14} className="text-gray-400" />
        </button>

        {open && (
          <div className="absolute top-full left-0 mt-1 w-64 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-xl z-50 overflow-hidden">
            {/* Edit current user */}
            <div className="p-3 border-b border-gray-100 dark:border-gray-800">
              <p className="text-xs text-gray-400 mb-2 font-medium uppercase tracking-wide">Utente attivo</p>
              {editingName ? (
                <div className="flex gap-2">
                  <input autoFocus value={nameInput} onChange={e => setNameInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && saveUserName()}
                    className="flex-1 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm outline-none focus:border-emerald-400 text-gray-900 dark:text-gray-100" />
                  <button onClick={saveUserName} className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-500 flex items-center justify-center"><Check size={14} /></button>
                  <button onClick={() => setEditingName(false)} className="w-8 h-8 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-400 flex items-center justify-center"><X size={14} /></button>
                </div>
              ) : (
                <div className="flex items-center justify-between px-1">
                  <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{userProfile.name}</span>
                  <button onClick={() => { setNameInput(userProfile.name); setEditingName(true) }}
                    className="w-7 h-7 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 flex items-center justify-center transition-colors">
                    <Pencil size={13} />
                  </button>
                </div>
              )}
            </div>

            {/* Other users */}
            {users.filter(u => u.id !== userId).length > 0 && (
              <div className="p-3 border-b border-gray-100 dark:border-gray-800">
                <p className="text-xs text-gray-400 mb-2 font-medium uppercase tracking-wide">Cambia utente</p>
                <div className="space-y-1">
                  {users.filter(u => u.id !== userId).map(u => (
                    <button key={u.id} onClick={() => { switchUser(u.id, u.name); setOpen(false) }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                      <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 text-xs font-bold">
                        {u.name[0]?.toUpperCase()}
                      </div>
                      <span className="text-sm text-gray-700 dark:text-gray-300">{u.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Add user */}
            <div className="p-3">
              {addingUser ? (
                <div className="flex gap-2">
                  <input autoFocus value={newName} onChange={e => setNewName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAddUser()}
                    placeholder="Nome utente..."
                    className="flex-1 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm outline-none focus:border-emerald-400 text-gray-900 dark:text-gray-100" />
                  <button onClick={handleAddUser} className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-500 flex items-center justify-center"><Check size={14} /></button>
                  <button onClick={() => setAddingUser(false)} className="w-8 h-8 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-400 flex items-center justify-center"><X size={14} /></button>
                </div>
              ) : (
                <button onClick={() => setAddingUser(true)}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-500 transition-colors text-sm">
                  <Plus size={14} /> Aggiungi utente
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center transition-colors">
        <span style={{ fontSize: 16, lineHeight: 1 }}>{theme === 'dark' ? '🌙' : '☀️'}</span>
      </button>
    </header>
  )
}
