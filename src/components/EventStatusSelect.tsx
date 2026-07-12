'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { EVENT_STATUS_LABEL, type EventInquiryStatus } from '@/types/database'

const STATUS_OPTIONS: EventInquiryStatus[] = [
  'new_lead',
  'contacted',
  'quoted',
  'confirmed',
  'lost',
]

export function EventStatusSelect({
  inquiryId,
  currentStatus,
}: {
  inquiryId: string
  currentStatus: EventInquiryStatus
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleChange(newStatus: string) {
    setLoading(true)
    await fetch('/api/events/update-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ inquiryId, status: newStatus }),
    })
    router.refresh()
    setLoading(false)
  }

  return (
    <select
      value={currentStatus}
      disabled={loading}
      onChange={(e) => handleChange(e.target.value)}
      className="text-xs border border-gray-200 rounded-md px-2 py-1 bg-white disabled:opacity-50"
    >
      {STATUS_OPTIONS.map((s) => (
        <option key={s} value={s}>
          {EVENT_STATUS_LABEL[s]}
        </option>
      ))}
    </select>
  )
}
