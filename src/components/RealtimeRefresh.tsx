'use client'

import { createClient } from '@/lib/supabase-client'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export function RealtimeRefresh() {
  const router = useRouter()
  useEffect(() => {
    const supabase = createClient()
    let timer: ReturnType<typeof setTimeout> | undefined
    let pendingWhileHidden = false
    const performRefresh = () => {
      if (document.visibilityState === 'hidden') {
        pendingWhileHidden = true
        return
      }
      pendingWhileHidden = false
      router.refresh()
    }
    const scheduleRefresh = () => {
      clearTimeout(timer)
      timer = setTimeout(performRefresh, 1000)
    }
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && pendingWhileHidden) scheduleRefresh()
    }
    document.addEventListener('visibilitychange', handleVisibility)
    const channel = supabase.channel('admin-booking-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, scheduleRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'resources' }, scheduleRefresh)
      .subscribe()
    return () => {
      clearTimeout(timer)
      document.removeEventListener('visibilitychange', handleVisibility)
      void supabase.removeChannel(channel)
    }
  }, [router])
  return null
}
