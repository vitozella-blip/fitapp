'use client'
import { usePathname, useRouter } from 'next/navigation'
import { useRef, useState } from 'react'

const SECTIONS = ['/dashboard', '/food', '/training']
const THRESHOLD = 60
const ANIM_MS = 220

function getSectionIndex(pathname: string) {
  if (pathname.startsWith('/training')) return 2
  if (pathname.startsWith('/food'))     return 1
  return 0
}

export function SwipeNav({ children }: { children: React.ReactNode }) {
  const pathname     = usePathname()
  const router       = useRouter()
  const startX       = useRef(0)
  const startY       = useRef(0)
  const committed    = useRef<'none' | 'h' | 'v'>('none')
  const navigating   = useRef(false)
  const [offset, setOffset]         = useState(0)
  const [animated, setAnimated]     = useState(false)

  function onTouchStart(e: React.TouchEvent) {
    if (navigating.current) return
    startX.current = e.touches[0].clientX
    startY.current = e.touches[0].clientY
    committed.current = 'none'
    setAnimated(false)
    setOffset(0)
  }

  function onTouchMove(e: React.TouchEvent) {
    if (navigating.current) return
    const dx = e.touches[0].clientX - startX.current
    const dy = e.touches[0].clientY - startY.current

    if (committed.current === 'none') {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return
      committed.current = Math.abs(dx) > Math.abs(dy) ? 'h' : 'v'
    }
    if (committed.current !== 'h') return

    const idx = getSectionIndex(pathname)
    if (dx > 0 && idx === 0) return
    if (dx < 0 && idx === SECTIONS.length - 1) return

    // Rubber-band resistance at edges
    setOffset(dx)
  }

  function onTouchEnd(e: React.TouchEvent) {
    if (navigating.current || committed.current !== 'h') {
      setAnimated(true)
      setOffset(0)
      return
    }

    const dx = e.changedTouches[0].clientX - startX.current
    const dy = e.changedTouches[0].clientY - startY.current
    const idx = getSectionIndex(pathname)

    if (Math.abs(dx) >= THRESHOLD && Math.abs(dx) > Math.abs(dy) * 1.5) {
      const nextIdx = dx < 0 ? idx + 1 : idx - 1
      if (nextIdx >= 0 && nextIdx < SECTIONS.length) {
        navigating.current = true
        const w = window.innerWidth

        // 1. Animate current content off-screen
        setAnimated(true)
        setOffset(dx < 0 ? -w : w)

        setTimeout(() => {
          // 2. Navigate — children update to new page
          router.push(SECTIONS[nextIdx])
          // 3. Place new content on the entering side (instant, no transition)
          setAnimated(false)
          setOffset(dx < 0 ? w : -w)

          // 4. On next paint, slide in to center
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              setAnimated(true)
              setOffset(0)
              setTimeout(() => {
                navigating.current = false
                setAnimated(false)
              }, ANIM_MS)
            })
          })
        }, ANIM_MS)
        return
      }
    }

    // Snap back
    setAnimated(true)
    setOffset(0)
  }

  return (
    <div
      className="overflow-x-hidden"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <div
        style={{
          transform: `translateX(${offset}px)`,
          transition: animated ? `transform ${ANIM_MS}ms cubic-bezier(0.25,0.46,0.45,0.94)` : 'none',
          willChange: 'transform',
        }}
      >
        {children}
      </div>
    </div>
  )
}
