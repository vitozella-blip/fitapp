import {
  LayoutDashboard,
  BookOpen,
  Apple,
  ChefHat,
  Target,
  CalendarDays,
  Dumbbell,
  ClipboardList,
  History,
  BarChart3,
  Upload,
} from 'lucide-react'

export type NavItem = {
  label: string
  href: string
  icon: React.ElementType
  section?: 'food' | 'training'
}

export type NavGroup = {
  label: string
  accent: 'primary' | 'food' | 'training' | 'tools'
  items: NavItem[]
}

export const NAV: NavGroup[] = [
  {
    label: '',
    accent: 'primary',
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    ],
  },
  {
    label: 'Alimentazione',
    accent: 'food',
    items: [
      { label: 'Diario', href: '/food/diary', icon: BookOpen, section: 'food' },
      { label: 'Alimenti', href: '/food/database', icon: Apple, section: 'food' },
      { label: 'Ricette', href: '/food/recipes', icon: ChefHat, section: 'food' },
      { label: 'Completa Macro', href: '/food/macros', icon: Target, section: 'food' },
      { label: 'Piano Alimentare', href: '/food/plan', icon: CalendarDays, section: 'food' },
    ],
  },
  {
    label: 'Allenamento',
    accent: 'training',
    items: [
      { label: 'Diario Workout', href: '/training/diary', icon: Dumbbell, section: 'training' },
      { label: 'Piano', href: '/training/plan', icon: ClipboardList, section: 'training' },
      { label: 'Storico', href: '/training/history', icon: History, section: 'training' },
      { label: 'Statistiche', href: '/training/stats', icon: BarChart3, section: 'training' },
    ],
  },
  {
    label: 'Strumenti',
    accent: 'tools',
    items: [
      { label: 'Importa dati', href: '/import', icon: Upload },
    ],
  },
]

export const MOBILE_NAV: NavItem[] = [
  { label: 'Home', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Diario', href: '/food/diary', icon: BookOpen, section: 'food' },
  { label: 'Workout', href: '/training/diary', icon: Dumbbell, section: 'training' },
  { label: 'Stats', href: '/training/stats', icon: BarChart3, section: 'training' },
]

export const MACRO_COLORS = {
  protein: 'rgb(var(--primary))',
  carbs: 'rgb(var(--food-accent))',
  fat: 'rgb(var(--training-accent))',
}
