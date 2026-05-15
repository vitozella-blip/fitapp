'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { LogIn, Loader2 } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'

export default function LoginPage() {
  const router = useRouter()
  const { users, addUser, switchUser } = useAppStore()
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleLogin() {
    const trimmed = name.trim()
    if (!trimmed || busy) return
    setBusy(true)

    const existing = users.find(u => u.name.toLowerCase() === trimmed.toLowerCase())
    const id = existing ? existing.id : addUser(trimmed)
    switchUser(id, trimmed)

    try {
      await fetch('/api/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: id, name: trimmed }),
      })
    } catch { /* offline-safe: store già aggiornato */ }

    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
      <div className="w-full max-w-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-6 shadow-sm">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-violet-100 dark:bg-violet-950 flex items-center justify-center mb-3">
            <LogIn size={22} className="text-violet-500" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Accedi</h1>
          <p className="text-sm text-gray-400 mt-1">Inserisci il tuo nome per continuare</p>
        </div>

        <input
          autoFocus
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleLogin()}
          placeholder="Il tuo nome"
          className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 outline-none focus:border-violet-400 transition-colors"
        />

        <button
          onClick={handleLogin}
          disabled={!name.trim() || busy}
          className="w-full mt-3 py-3 rounded-xl bg-violet-500 hover:bg-violet-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm flex items-center justify-center gap-2 transition-colors">
          {busy ? <Loader2 size={16} className="animate-spin" /> : <LogIn size={16} />}
          Accedi
        </button>

        {users.length > 1 && (
          <div className="mt-5 pt-4 border-t border-gray-100 dark:border-gray-800">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Utenti recenti</p>
            <div className="space-y-1">
              {users.map(u => (
                <button key={u.id}
                  onClick={() => { setName(u.name) }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left">
                  <div className="w-6 h-6 rounded-full bg-violet-100 dark:bg-violet-900 flex items-center justify-center text-violet-600 dark:text-violet-400 text-xs font-bold">
                    {u.name[0]?.toUpperCase()}
                  </div>
                  <span className="text-sm text-gray-700 dark:text-gray-300">{u.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
