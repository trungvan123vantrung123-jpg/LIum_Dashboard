import { createServiceClient } from '@/lib/supabase-server'
import type { BookingWithResource, BookingStatus } from '@/types/database'
import { StatusBadge } from '@/components/StatusBadge'
import Link from 'next/link'
import { BOOKING_STATUS_LABEL } from '@/types/database'

export const dynamic = 'force-dynamic'

const FILTER_OPTIONS: { value: BookingStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'Tất cả' },
  { value: 'pending_hold', label: BOOKING_STATUS_LABEL.pending_hold },
  { value: 'confirmed', label: BOOKING_STATUS_LABEL.confirmed },
  { value: 'payment_mismatch', label: BOOKING_STATUS_LABEL.payment_mismatch },
  { value: 'cancel_requested', label: BOOKING_STATUS_LABEL.cancel_requested },
  { value: 'expired', label: BOOKING_STATUS_LABEL.expired },
  { value: 'cancelled', label: BOOKING_STATUS_LABEL.cancelled },
  { value: 'refunded', label: BOOKING_STATUS_LABEL.refunded },
]

async function getBookings(statusFilter?: string) {
  const supabase = createServiceClient()
  let query = supabase
    .from('bookings')
    .select('*, resource:resources(*)')
    .eq('booking_type', 'stay')
    .order('created_at', { ascending: false })
    .limit(100)

  if (statusFilter && statusFilter !== 'all') {
    query = query.eq('status', statusFilter)
  }

  const { data, error } = await query
  if (error) {
    console.error(error)
    return []
  }
  return data as BookingWithResource[]
}

export default async function BookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const { status } = await searchParams
  const currentFilter = status ?? 'all'
  const bookings = await getBookings(currentFilter)

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-lg font-medium text-gray-900 mb-4">Danh sách booking</h1>

      <div className="flex flex-wrap gap-2 mb-5">
        {FILTER_OPTIONS.map((opt) => (
          <Link
            key={opt.value}
            href={opt.value === 'all' ? '/bookings' : `/bookings?status=${opt.value}`}
            className={`text-xs px-3 py-1.5 rounded-full border transition ${
              currentFilter === opt.value
                ? 'bg-gray-900 text-white border-gray-900'
                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
            }`}
          >
            {opt.label}
          </Link>
        ))}
      </div>

      {bookings.length === 0 ? (
        <p className="text-sm text-gray-500">Không có booking nào phù hợp bộ lọc.</p>
      ) : (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm" style={{ tableLayout: 'fixed' }}>
            <thead className="bg-gray-50 text-left text-xs text-gray-500">
              <tr>
                <th className="px-3 py-2 font-medium" style={{ width: '14%' }}>Mã booking</th>
                <th className="px-3 py-2 font-medium" style={{ width: '18%' }}>Phòng</th>
                <th className="px-3 py-2 font-medium" style={{ width: '18%' }}>Ngày</th>
                <th className="px-3 py-2 font-medium" style={{ width: '16%' }}>Khách</th>
                <th className="px-3 py-2 font-medium" style={{ width: '16%' }}>Trạng thái</th>
                <th className="px-3 py-2 font-medium text-right" style={{ width: '18%' }}>Số tiền</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {bookings.map((b) => (
                <tr key={b.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2.5">
                    <Link
                      href={`/bookings/${b.id}`}
                      className="text-blue-600 hover:underline font-medium"
                    >
                      {b.booking_code}
                    </Link>
                  </td>
                  <td className="px-3 py-2.5 truncate">{b.resource.name}</td>
                  <td className="px-3 py-2.5 text-gray-600 text-xs">
                    {formatDateRange(b.check_in, b.check_out)}
                  </td>
                  <td className="px-3 py-2.5 truncate">{b.customer_name}</td>
                  <td className="px-3 py-2.5">
                    <StatusBadge status={b.status} />
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums">
                    {formatVND(b.amount_due)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function formatVND(amount: number): string {
  return amount.toLocaleString('vi-VN') + 'đ'
}

function formatDateRange(checkIn: string | null, checkOut: string | null): string {
  if (!checkIn || !checkOut) return '-'
  const inD = new Date(checkIn).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })
  const outD = new Date(checkOut).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })
  return `${inD} - ${outD}`
}
