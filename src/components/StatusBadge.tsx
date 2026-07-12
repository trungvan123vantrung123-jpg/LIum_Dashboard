import { BOOKING_STATUS_LABEL, BOOKING_STATUS_COLOR, type BookingStatus } from '@/types/database'

export function StatusBadge({ status }: { status: BookingStatus }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${BOOKING_STATUS_COLOR[status]}`}
    >
      {BOOKING_STATUS_LABEL[status]}
    </span>
  )
}
