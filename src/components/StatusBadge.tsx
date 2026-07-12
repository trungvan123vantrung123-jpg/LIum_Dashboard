import { BOOKING_STATUS_LABEL, type BookingStatus } from '@/types/database'

const STATUS_STYLE: Record<BookingStatus, string> = {
  pending_hold: 'border-[#fbbc04] bg-[#fff8e1] text-[#8a5a00]',
  confirmed: 'border-[#34a853] bg-[#e6f4ea] text-[#137333]',
  payment_mismatch: 'border-[#ea4335] bg-[#fce8e6] text-[#c5221f]',
  cancel_requested: 'border-[#f29900] bg-[#fff4e5] text-[#b06000]',
  expired: 'border-[#dadce0] bg-[#f1f3f4] text-[#5f6368]',
  cancelled: 'border-[#dadce0] bg-[#f1f3f4] text-[#5f6368]',
  refunded: 'border-[#1a73e8] bg-[#e8f0fe] text-[#174ea6]',
}

export function StatusBadge({ status }: { status: BookingStatus }) {
  return (
    <span
      className={`inline-flex items-center border px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[status]}`}
    >
      {BOOKING_STATUS_LABEL[status]}
    </span>
  )
}
