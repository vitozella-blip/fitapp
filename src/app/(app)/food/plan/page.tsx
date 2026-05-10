'use client'
import { PageHeader } from '@/components/shared/PageHeader'
import { CalendarDays } from 'lucide-react'

export default function FoodPlanPage() {
  return (
    <div className="max-w-2xl mx-auto md:max-w-none">
      <PageHeader title="Piano Alimentare" icon={CalendarDays} accent="food" />
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-8 text-center">
        <CalendarDays size={32} className="mx-auto text-gray-300 mb-3" />
        <p className="text-gray-500 font-medium">Piano alimentare in arrivo</p>
        <p className="text-sm text-gray-400 mt-1">Questa sezione sarà disponibile a breve</p>
      </div>
    </div>
  )
}
