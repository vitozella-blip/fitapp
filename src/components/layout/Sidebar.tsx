'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { NAV } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/store/useAppStore'
import { useTheme } from 'next-themes'
import { useState } from 'react'
import { formatDate } from '@/lib/utils'
import {
  Zap,
  ChevronUp,
  Pencil,
  Check,
  X,
  Plus,
  LogOut,
  Trash2,
  Utensils,
  Dumbbell as DumbbellIcon,
} from 'lucide-react'

const accentCls = {
  primary:  'text-emerald-700 bg-emerald-50 dark:text-emerald-300 dark:bg-emerald-950',
  food:     'text-orange-600 bg-orange-50 dark:text-orange-300 dark:bg-orange-950',
  training: 'text-blue-600 bg-blue-50 dark:text-blue-300 dark:bg-blue-950',
  tools:    'text-violet-600 bg-violet-50 dark:text-violet-300 dark:bg-violet-950',
}
const accentText = {
  primary:  'text-emerald-600 dark:text-emerald-400',
  food:     'text-orange-500',
  training: 'text-blue-500',
  tools:    'text-violet-500',
}
const sectionIcon: Record<string, React.ElementType> = {
  Alimentazione: Utensils,
  Allenamento:   DumbbellIcon,
}

export function Sidebar() {
  const pathname = usePathname()
  const { theme, setTheme } = useTheme()
  const { userId, users, userProfile, addUser, switchUser, updateCurrentUserName, logout, removeUser } = useAppStore()
  const [panelOpen,   setPanelOpen]   = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [nameInput,   setNameInput]   = useState(userProfile.name)
  const [addingUser,  setAddingUser]  = useState(false)
  const [newName,     setNewName]     = useState('')
  const isDark = theme === 'dark'

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
    setPanelOpen(false)
  }

  function closePanel() {
    setPanelOpen(false)
    setEditingName(false)
    setAddingUser(false)
  }

  return (
    <aside className="hidden md:flex flex-col w-60 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 h-screen sticky top-0 py-5 px-3">
      {/* Logo */}
      <div className="flex items-center gap-2 px-3 mb-6">
        <div className="w-8 h-8 rounded-xl bg-emerald-500 flex items-center justify-center">
          <Zap size={16} className="text-white" />
        </div>
        <span className="font-bold text-lg text-gray-900 dark:text-gray-100">FitApp</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 overflow-y-auto">
        {NAV.map((group) => {
          // Groups with href (food, training): render section link + indented sub-items
          if (group.href) {
            const SectionIcon = sectionIcon[group.label]
            const sectionActive = pathname === group.href
            return (
              <div key={group.label}>
                {/* Section hub link */}
                <Link href={group.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-semibold transition-all',
                    sectionActive ? accentCls[group.accent] : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800'
                  )}>
                  {SectionIcon && (
                    <SectionIcon size={16} className={sectionActive ? '' : accentText[group.accent]} aria-hidden="true" />
                  )}
                  {group.label}
                </Link>
                {/* Sub-items */}
                <div className="ml-3 pl-3 border-l border-gray-100 dark:border-gray-800 mt-0.5 mb-1 space-y-0.5">
                  {group.items.map((item) => {
                    const active = pathname === item.href || pathname.startsWith(item.href)
                    return (
                      <Link key={item.href} href={item.href}
                        className={cn(
                          'flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-sm font-medium transition-all',
                          active ? accentCls[group.accent] : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800'
                        )}>
                        <item.icon size={14} aria-hidden="true" />
                        {item.label}
                      </Link>
                    )
                  })}
                </div>
              </div>
            )
          }

          // Groups without href (primary = Dashboard, tools): render items flat
          return (
            <div key={group.label || 'main'} className={group.label ? 'pt-2' : ''}>
              {group.label && (
                <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                  {group.label}
                </p>
              )}
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const active = pathname === item.href
                  return (
                    <Link key={item.href} href={item.href}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all',
                        active ? accentCls[group.accent] : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800'
                      )}>
                      <item.icon size={16} aria-hidden="true" />
                      {item.label}
                    </Link>
                  )
                })}
              </div>
            </div>
          )
        })}
      </nav>

      {/* Tema toggle — fisso sotto Strumenti */}
      <div className="px-3 py-2 mt-1">
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg">
          <span className="text-sm font-medium text-gray-500 flex-1">{isDark ? 'Tema scuro' : 'Tema chiaro'}</span>
          <button
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            className="relative w-10 h-5 rounded-full transition-colors shrink-0 focus:outline-none"
            style={{ backgroundColor: isDark ? '#7aafc8' : '#d1d5db' }}>
            <span
              className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform"
              style={{ left: 2, transform: isDark ? 'translateX(18px)' : 'translateX(0)' }}
            />
          </button>
        </div>
      </div>

      {/* User panel (slide-up) */}
      {panelOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={closePanel} />
          <div className="absolute bottom-[4.5rem] left-3 right-3 z-50 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl overflow-hidden">

            {/* Header utente */}
            <div className="px-4 pt-3 pb-3 border-b border-gray-100 dark:border-gray-800">
              <p className="text-[10px] text-gray-400 mb-1">{formatDate(new Date())}</p>
              {editingName ? (
                <div className="flex gap-1.5">
                  <input autoFocus value={nameInput} onChange={e => setNameInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && saveUserName()}
                    className="flex-1 px-2.5 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm outline-none focus:border-emerald-400 text-gray-900 dark:text-gray-100" />
                  <button onClick={saveUserName} className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-500 flex items-center justify-center"><Check size={13} /></button>
                  <button onClick={() => setEditingName(false)} className="w-8 h-8 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-400 flex items-center justify-center"><X size={13} /></button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate flex-1">
                    Ciao {userProfile.name} 👋
                  </p>
                  <button onClick={() => { setNameInput(userProfile.name); setEditingName(true) }}
                    className="w-6 h-6 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 flex items-center justify-center transition-colors shrink-0">
                    <Pencil size={11} />
                  </button>
                </div>
              )}
            </div>

            {/* Altri utenti */}
            {users.filter(u => u.id !== userId).length > 0 && (
              <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-800">
                <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide mb-1.5">Cambia utente</p>
                <div className="space-y-0.5">
                  {users.filter(u => u.id !== userId).map(u => (
                    <div key={u.id} className="flex items-center gap-1">
                      <button onClick={() => { switchUser(u.id, u.name); closePanel() }}
                        className="flex-1 flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                        <div className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 text-[10px] font-bold shrink-0">
                          {u.name[0]?.toUpperCase()}
                        </div>
                        <span className="text-sm text-gray-700 dark:text-gray-300 truncate">{u.name}</span>
                      </button>
                      <button onClick={async () => {
                        if (!confirm(`Eliminare l'utente "${u.name}"? Tutti i dati verranno persi.`)) return
                        await fetch(`/api/user?userId=${u.id}`, { method: 'DELETE' })
                        removeUser(u.id)
                      }} className="w-7 h-7 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/30 text-gray-400 hover:text-red-400 flex items-center justify-center transition-colors shrink-0">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Aggiungi utente */}
            <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-800">
              {addingUser ? (
                <div className="flex gap-1.5">
                  <input autoFocus value={newName} onChange={e => setNewName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAddUser()}
                    placeholder="Nome utente..."
                    className="flex-1 px-2.5 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm outline-none focus:border-emerald-400 text-gray-900 dark:text-gray-100" />
                  <button onClick={handleAddUser} className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-500 flex items-center justify-center"><Check size={13} /></button>
                  <button onClick={() => setAddingUser(false)} className="w-8 h-8 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-400 flex items-center justify-center"><X size={13} /></button>
                </div>
              ) : (
                <button onClick={() => setAddingUser(true)}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-500 transition-colors text-sm">
                  <Plus size={13} /> Aggiungi utente
                </button>
              )}
            </div>

            {/* Account */}
            <div className="px-3 py-2">
              {userProfile.email && (
                <p className="text-xs text-gray-400 px-2 mb-1 truncate">{userProfile.email}</p>
              )}
              <button onClick={() => { logout(); closePanel() }}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/30 text-sm font-medium text-red-400 transition-colors">
                <LogOut size={13} /> Esci
              </button>
              <button onClick={async () => {
                if (!confirm('Eliminare definitivamente il tuo account e tutti i dati? Questa azione non è reversibile.')) return
                await fetch(`/api/user?userId=${userId}`, { method: 'DELETE' })
                logout()
                closePanel()
              }} className="w-full flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/30 text-sm font-medium text-red-300 dark:text-red-500 transition-colors">
                <Trash2 size={13} /> Elimina account
              </button>
            </div>
          </div>
        </>
      )}

      {/* User bar */}
      <div className="pt-3 border-t border-gray-200 dark:border-gray-800">
        <button onClick={() => setPanelOpen(o => !o)}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
          <div className="w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center text-emerald-600 dark:text-emerald-400 text-sm font-bold shrink-0">
            {userProfile.name[0]?.toUpperCase()}
          </div>
          <span className="flex-1 text-sm font-medium text-gray-700 dark:text-gray-300 truncate text-left">
            {userProfile.name}
          </span>
          <ChevronUp size={14} className={cn('text-gray-400 transition-transform', panelOpen ? 'rotate-0' : 'rotate-180')} />
        </button>
      </div>
    </aside>
  )
}
