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
  Upload,
  TrendingUp,
  ShoppingCart,
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
      { label: 'Diario Pasti',      href: '/food/diary',     icon: BookOpen,      section: 'food' },
      { label: 'Alimenti',          href: '/food/database',  icon: Apple,         section: 'food' },
      { label: 'Lista della Spesa', href: '/food/shopping',  icon: ShoppingCart,  section: 'food' },
      { label: 'Ricette',           href: '/food/recipes',   icon: ChefHat,       section: 'food' },
      { label: 'Completa Macro',    href: '/food/macros',    icon: Target,        section: 'food' },
      { label: 'Piano Alimentare',  href: '/food/plan',      icon: CalendarDays,  section: 'food' },
    ],
  },
  {
    label: 'Allenamento',
    accent: 'training',
    items: [
      { label: 'Diario Allenamenti', href: '/training/diary',      icon: Dumbbell,     section: 'training' },
      { label: 'Progressi',          href: '/training/progressi',  icon: TrendingUp,   section: 'training' },
      { label: 'Storico',            href: '/training/history',    icon: History,      section: 'training' },
      { label: 'Piano Allenamento',  href: '/training/plan',       icon: ClipboardList, section: 'training' },
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
