'use client'
import { StatCard } from '@/components/shared/StatCard'
import { MacroBar } from '@/components/shared/MacroBar'
import { PageHeader } from '@/components/shared/PageHeader'
import { Flame, Dumbbell, TrendingUp, Apple, LayoutDashboard } from 'lucide-react'
import { formatDate } from '@/lib/utils'

const mockMacros = {
  calories: { current: 0, target: 2000 },
  protein: { current: 0, target: 150 },
  carbs: { current: 0, target: 220 },
  fat: { current: 0, target: 65 },
}

export default function DashboardPage() {
  return (
    <div className="space-y-6 max-w-2xl mx-auto md:max-w-none">
      <PageHeader title="Dashboard" subtitle={formatDate(new Date())} icon={LayoutDashboard} accent="primary" />
      <MacroBar {...mockMacros} />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Calorie" value={0} unit="kcal" icon={Flame} accent="food" sub="Obiettivo: 2000" />
        <StatCard label="Proteine" value={0} unit="g" icon={TrendingUp} accent="primary" sub="Obiettivo: 150g" />
        <StatCard label="Workout" value={0} unit="oggi" icon={Dumbbell} accent="training" sub="Serie completate" />
        <StatCard label="Alimenti" value={0} unit="log" icon={Apple} accent="food" sub="Pasti registrati" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <a href="/food/diary" className="bg-orange-50 dark:bg-orange-950 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 flex items-center gap-3 hover:opacity-80 transition-opacity">
          <div className="w-10 h-10 rounded-xl bg-orange-400 flex items-center justify-center">
            <Apple size={18} className="text-white" />
          </div>
          <div>
            <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm">Diario Alimentare</p>
            <p className="text-xs text-gray-400">Registra i pasti di oggi</p>
          </div>
        </a>
        <a href="/training/diary" className="bg-blue-50 dark:bg-blue-950 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 flex items-center gap-3 hover:opacity-80 transition-opacity">
          <div className="w-10 h-10 rounded-xl bg-blue-400 flex items-center justify-center">
            <Dumbbell size={18} className="text-white" />
          </div>
          <div>
            <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm">Diario Workout</p>
            <p className="text-xs text-gray-400">Registra l'allenamento di oggi</p>
          </div>
        </a>
      </div>
    </div>
  )
}
