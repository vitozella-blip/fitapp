import { useEffect } from 'react'

export function useRefreshOnFocus(onFocus: () => void) {
  useEffect(() => {
    function handle() {
      if (!document.hidden) onFocus()
    }
    document.addEventListener('visibilitychange', handle)
    return () => document.removeEventListener('visibilitychange', handle)
  }, [onFocus])
}
