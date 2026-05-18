'use client'
import { usePathname, useRouter } from 'next/navigation'
import { useRef } from 'react'

const SECTIONS = ['/dashboard', '/food', '/training']

function getSectionIndex(pathname: string) {
  if (pathname.startsWith('/training')) return 2
  if (pathname.startsWith('/food'))     return 1
  return 0
}

export function SwipeNav({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router   = useRouter()
  const startX   = useRef(0)
  const startY   = useRef(0)

  function onTouchStart(e: React.TouchEvent) {
    startX.current = e.touches[0].clientX
    startY.current = e.touches[0].clientY
  }

  function onTouchEnd(e: React.TouchEvent) {
    const dx = e.changedTouches[0].clientX - startX.current
    const dy = e.changedTouches[0].clientY - startY.current
    if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) return
    const idx = getSectionIndex(pathname)
    if (dx < 0 && idx < SECTIONS.length - 1) router.push(SECTIONS[idx + 1])
    if (dx > 0 && idx > 0)                   router.push(SECTIONS[idx - 1])
    if (dx > 0 && idx === 0)                  window.dispatchEvent(new CustomEvent('openHamburgerMenu'))
  }

  return (
    <div className="h-full" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      {children}
    </div>
  )
}
