import { useEffect, useRef, useState } from 'react'

export function usePullToRefresh(onRefresh: () => Promise<void> | void, enabled = true) {
  const startY = useRef(0)
  const [pulling, setPulling] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const THRESHOLD = 72

  useEffect(() => {
    if (!enabled) return

    function onTouchStart(e: TouchEvent) {
      if (window.scrollY > 0) return
      startY.current = e.touches[0].clientY
    }

    async function onTouchEnd(e: TouchEvent) {
      const dy = e.changedTouches[0].clientY - startY.current
      setPulling(false)
      if (dy > THRESHOLD && window.scrollY === 0) {
        setRefreshing(true)
        try { await onRefresh() } finally { setRefreshing(false) }
      }
    }

    function onTouchMove(e: TouchEvent) {
      if (window.scrollY > 0) return
      const dy = e.touches[0].clientY - startY.current
      setPulling(dy > 20)
    }

    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchmove', onTouchMove, { passive: true })
    window.addEventListener('touchend', onTouchEnd, { passive: true })
    return () => {
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('touchend', onTouchEnd)
    }
  }, [onRefresh, enabled])

  return { pulling, refreshing }
}
