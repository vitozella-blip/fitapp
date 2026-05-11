'use client'
import Link from 'next/link'
import { BookOpen, Apple, ChefHat, Target, CalendarDays, ChevronRight } from 'lucide-react'

const SECTIONS = [
  { label: 'Diario', desc: 'Registra i tuoi pasti', href: '/food/diary', icon: BookOpen, color: 'bg-orange-50 dark:bg-orange-950 text-orange-500' },
  { label: 'Alimenti', desc: 'Cerca nel database', href: '/food/database', icon: Apple, color: 'bg-amber-50 dark:bg-amber-950 text-amber-500' },
  { label: 'Ricette', desc: 'Le tue ricette personali', href: '/food/recipes', icon: ChefHat, color: 'bg-yellow-50 dark:bg-yellow-950 text-yellow-500' },
  { label: 'Completa Macro', desc: 'Raggiungi i tuoi obiettivi', href: '/food/macros', icon: Target, color: 'bg-red-50 dark:bg-red-950 text-red-500' },
  { label: 'Piano Alimentare', desc: 'Pianifica la settimana', href: '/food/plan', icon: CalendarDays, color: 'bg-rose-50 dark:bg-rose-950 text-rose-500' },
]

export default function FoodHubPage() {
  return (
    <div className="space-y-4 max-w-2xl mx-auto md:max-w-none">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Alimentazione</h1>
        <p className="text-sm text-gray-400 mt-1">Gestisci la tua nutrizione</p>
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
