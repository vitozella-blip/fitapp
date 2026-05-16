'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Menu, X, Check, Pencil, Plus, Upload, LogOut, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTheme } from 'next-themes'
import { useAppStore } from '@/store/useAppStore'
import { useState } from 'react'
import { formatDate } from '@/lib/utils'

type Tab = {
  label: string; href: string; match: string
  icon?: React.ComponentType<{ size: number }>
  img?: string
}

const TABS: Tab[] = [
  { label: 'Dashboard',     href: '/dashboard', icon: LayoutDashboard,  match: '/dashboard' },
  { label: 'Alimentazione', href: '/food',       img: '/icon-food.png',  match: '/food'      },
  { label: 'Allenamento',   href: '/training',   img: '/icon-training.png', match: '/training' },
]

const ACTIVE_COLORS: Record<string, string> = {
  '/dashboard': 'text-violet-600 dark:text-violet-400',
  '/food':      'text-orange-500',
  '/training':  'text-blue-500',
}

export function MobileNav() {
  const pathname = usePathname()
  const { theme, setTheme } = useTheme()
  const { userId, users, userProfile, addUser, switchUser, updateCurrentUserName, logout, removeUser } = useAppStore()
  const [menuOpen, setMenuOpen]       = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput]     = useState(userProfile.name)
  const [newName, setNewName]         = useState('')
  const [addingUser, setAddingUser]   = useState(false)

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
    setMenuOpen(false)
  }

  function close() {
    setMenuOpen(false)
    setEditingName(false)
    setAddingUser(false)
  }

  return (
    <>
      {/* Slide-up menu panel */}
      {menuOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={close} />

          {/* Sheet */}
          <div className="relative bg-white dark:bg-gray-900 rounded-t-3xl shadow-2xl overflow-hidden"
            style={{ paddingBottom: 'calc(5rem + env(safe-area-inset-bottom, 0px))' }}>

            {/* Close handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-gray-200 dark:bg-gray-700" />
            </div>

            {/* User info header */}
            <div className="px-4 pt-3 pb-4 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-11 h-11 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center text-emerald-600 dark:text-emerald-400 text-lg font-bold shrink-0">
                  {userProfile.name[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-400 leading-none mb-0.5">{formatDate(new Date())}</p>
                  <p className="text-base font-semibold text-gray-900 dark:text-gray-100 leading-tight truncate">
                    Ciao, {userProfile.name} 👋
                  </p>
                </div>
                <button onClick={close}
                  className="w-8 h-8 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400 shrink-0">
                  <X size={16} />
                </button>
              </div>

              {/* Edit name */}
              <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide mb-2">Utente attivo</p>
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
              <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide mb-2">Cambia utente</p>
                <div className="space-y-1">
                  {users.filter(u => u.id !== userId).map(u => (
                    <div key={u.id} className="flex items-center gap-1">
                      <button onClick={() => { switchUser(u.id, u.name); close() }}
                        className="flex-1 flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                        <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 text-xs font-bold">
                          {u.name[0]?.toUpperCase()}
                        </div>
                        <span className="text-sm text-gray-700 dark:text-gray-300">{u.name}</span>
                      </button>
                      <button onClick={async () => {
                        if (!confirm(`Eliminare l'utente "${u.name}"? Tutti i dati verranno persi.`)) return
                        await fetch(`/api/user?userId=${u.id}`, { method: 'DELETE' })
                        removeUser(u.id)
                      }}
                        className="w-8 h-8 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/30 text-gray-400 hover:text-red-400 flex items-center justify-center transition-colors shrink-0">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Add user */}
            <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
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

            {/* Account */}
            <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
              <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide mb-2">Account</p>
              <div className="flex items-center gap-2 px-1 mb-1">
                <span className="text-xs text-gray-500 truncate flex-1">{userProfile.email}</span>
              </div>
              <button onClick={() => { logout(); close() }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/30 text-sm font-medium text-red-400 transition-colors mt-1">
                <LogOut size={15} /> Esci
              </button>
              <button onClick={async () => {
                if (!confirm('Eliminare definitivamente il tuo account e tutti i dati? Questa azione non è reversibile.')) return
                await fetch(`/api/user?userId=${userId}`, { method: 'DELETE' })
                logout()
                close()
              }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/30 text-sm font-medium text-red-300 dark:text-red-500 transition-colors">
                <Trash2 size={15} /> Elimina account
              </button>
            </div>

            {/* Actions */}
            <div className="px-4 py-3">
              <Link href="/import" onClick={close}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors">
                <Upload size={15} className="text-gray-400" /> Importa
              </Link>
              <button onClick={() => { setTheme(theme === 'dark' ? 'light' : 'dark'); close() }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors">
                <span style={{ fontSize: 15, lineHeight: 1, width: 15, textAlign: 'center' }}>
                  {theme === 'dark' ? '☀️' : '🌙'}
                </span>
                {theme === 'dark' ? 'Tema chiaro' : 'Tema scuro'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom nav bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        <div className="flex">
          {/* Hamburger — leftmost */}
          <button onClick={() => setMenuOpen(o => !o)}
            className={cn(
              'flex-1 flex flex-col items-center gap-1 py-3 text-[10px] font-semibold transition-colors',
              menuOpen ? 'text-emerald-500' : 'text-gray-400'
            )}>
            <Menu size={22} />
            Menu
          </button>

          {TABS.map(tab => {
            const active = pathname === tab.match || (tab.match !== '/dashboard' && pathname.startsWith(tab.match))
            return (
              <Link key={tab.href} href={tab.href} onClick={close}
                className={cn('flex-1 flex flex-col items-center gap-1 py-3 text-[10px] font-semibold transition-colors',
                  active ? ACTIVE_COLORS[tab.match] : 'text-gray-400'
                )}>
                {tab.img
                  ? <img src={tab.img} alt="" style={{ width: 22, height: 22, objectFit: 'contain', opacity: active ? 1 : 0.4 }} />
                  : tab.icon && <tab.icon size={22} />
                }
                {tab.label}
              </Link>
            )
          })}
        </div>
      </nav>
    </>
  )
}
