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
  updatedAt,
}: {
  inquiryId: string
  currentStatus: EventInquiryStatus
  updatedAt: string
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleChange(newStatus: string) {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/events/update-status', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inquiryId, status: newStatus, expectedUpdatedAt: updatedAt }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error?.message ?? result.error ?? 'Không cập nhật được lead')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không cập nhật được lead')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <select
        id={`event-status-${inquiryId}`}
        value={currentStatus}
        disabled={loading}
        onChange={(e) => handleChange(e.target.value)}
        className="w-full border border-[#dadce0] bg-white px-2 py-1.5 text-xs text-[#202124] disabled:opacity-50"
      >
        {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{EVENT_STATUS_LABEL[s]}</option>)}
      </select>
      {error && <p role="alert" className="mt-1 text-xs text-[#b3261e]">{error}</p>}
    </div>
  )
}
