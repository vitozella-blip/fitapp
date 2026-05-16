'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAppStore } from '@/store/useAppStore'

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const email = useAppStore(s => s.userProfile.email)
  const router = useRouter()
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => { setHydrated(true) }, [])

  useEffect(() => {
    if (hydrated && !email) router.replace('/login')
  }, [hydrated, email, router])

  if (!hydrated || !email) return null
  return <>{children}</>
}
