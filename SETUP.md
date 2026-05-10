# FitApp — F1 Setup

## 1. Crea il progetto
```bash
npx create-next-app@latest fitapp --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
cd fitapp
```

## 2. Installa dipendenze
```bash
npm install next-themes zustand lucide-react clsx tailwind-merge
npx shadcn@latest init
```
Config shadcn: style=default, baseColor=neutral, cssVariables=yes

## 3. Struttura file — COPIA I FILE GENERATI in questi percorsi:

| File generato            | Posizione nel progetto               |
|--------------------------|--------------------------------------|
| globals.css              | src/app/globals.css                  |
| layout.tsx               | src/app/layout.tsx                   |
| app-layout.tsx           | src/app/(app)/layout.tsx             |
| dashboard-page.tsx       | src/app/(app)/dashboard/page.tsx     |
| constants.ts             | src/lib/constants.ts                 |
| utils.ts                 | src/lib/utils.ts                     |
| useAppStore.ts           | src/store/useAppStore.ts             |
| ThemeProvider.tsx        | src/components/shared/ThemeProvider.tsx |
| Sidebar.tsx              | src/components/layout/Sidebar.tsx    |
| Header.tsx               | src/components/layout/Header.tsx     |
| MobileNav.tsx            | src/components/layout/MobileNav.tsx  |
| tailwind.config.ts       | tailwind.config.ts (sostituisci)     |

## 4. Crea anche queste pagine placeholder (1 riga ciascuna)
Crea `page.tsx` con `export default function Page() { return <div /> }` in:
- src/app/(app)/food/diary/
- src/app/(app)/food/database/
- src/app/(app)/food/recipes/
- src/app/(app)/food/macros/
- src/app/(app)/food/plan/
- src/app/(app)/training/diary/
- src/app/(app)/training/plan/
- src/app/(app)/training/history/
- src/app/(app)/training/stats/

## 5. Redirect root → dashboard
In src/app/page.tsx:
```tsx
import { redirect } from 'next/navigation'
export default function Home() { redirect('/dashboard') }
```

## 6. Avvia
```bash
npm run dev
```
