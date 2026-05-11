'use client'
import Link from 'next/link'
import { Dumbbell, History, ClipboardList, ChevronRight } from 'lucide-react'

const SECTIONS = [
  { label: 'Diario Allenamento', desc: 'Registra il workout di oggi', href: '/training/diary', icon: Dumbbell, color: 'bg-blue-50 dark:bg-blue-950 text-blue-500' },
  { label: 'Storico', desc: 'I tuoi allenamenti passati', href: '/training/history', icon: History, color: 'bg-indigo-50 dark:bg-indigo-950 text-indigo-500' },
  { label: 'Piano Allenamento', desc: 'Organizza la tua settimana', href: '/training/plan', icon: ClipboardList, color: 'bg-violet-50 dark:bg-violet-950 text-violet-500' },
]

export default function TrainingHubPage() {
  return (
    <div className="space-y-4 max-w-2xl mx-auto md:max-w-none">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Allenamento</h1>
        <p className="text-sm text-gray-400 mt-1">Gestisci i tuoi workout</p>
      </div>
      <div className="space-y-2">
        {SECTIONS.map(s => (
          <Link key={s.href} href={s.href}
            className="flex items-center gap-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl px-4 py-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${s.color}`}>
              <s.icon size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{s.label}</p>
              <p className="text-xs text-gray-400 mt-0.5">{s.desc}</p>
            </div>
            <ChevronRight size={16} className="text-gray-300 shrink-0" />
          </Link>
        ))}
      </div>
    </div>
  )
}
