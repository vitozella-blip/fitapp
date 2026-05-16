'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Mail, Loader2, LogIn } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'

function isValidEmail(e: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)
}

export default function LoginPage() {
  const router = useRouter()
  const login = useAppStore(s => s.login)
  const [email, setEmail] = useState('')
  const [error, setError]   = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin() {
    const e = email.trim().toLowerCase()
    if (!isValidEmail(e)) { setError("Inserisci un'email valida"); return }
    setLoading(true); setError('')
    try {
      const r = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: e }),
      })
      const user = await r.json()
      if (!user || user.error) { setError('Errore di accesso. Riprova.'); setLoading(false); return }
      login(user)
      router.replace('/dashboard')
    } catch {
      setError('Errore di rete. Riprova.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
      <div className="w-full max-w-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-6 shadow-sm">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-violet-100 dark:bg-violet-950 flex items-center justify-center mb-3">
            <LogIn size={26} className="text-violet-500" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Accedi a FitApp</h1>
          <p className="text-sm text-gray-400 mt-1">
            Usa la stessa email su tutti i dispositivi per sincronizzare i dati
          </p>
        </div>

        <div className="relative mb-3">
          <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            autoFocus
            type="email"
            value={email}
            onChange={e => { setEmail(e.target.value); setError('') }}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            placeholder="la@tua.email"
            className="w-full pl-9 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 outline-none focus:border-violet-400 transition-colors"
          />
        </div>

        {error && <p className="text-xs text-red-400 mb-2 px-1">{error}</p>}

        <button
          onClick={handleLogin}
          disabled={!email.trim() || loading}
          className="w-full py-3 rounded-xl bg-violet-500 hover:bg-violet-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm flex items-center justify-center gap-2 transition-colors">
          {loading ? <Loader2 size={16} className="animate-spin" /> : <LogIn size={16} />}
          {loading ? 'Accesso in corso…' : 'Accedi'}
        </button>

        <p className="text-xs text-gray-400 text-center mt-4 leading-relaxed">
          Se è la prima volta, verrà creato automaticamente un account con questa email.
        </p>
      </div>
    </div>
  )
}
