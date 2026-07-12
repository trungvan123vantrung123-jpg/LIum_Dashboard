import { StatusBadge } from '@/components/StatusBadge'
import { createServiceClient } from '@/lib/supabase-server'
import { BOOKING_STATUS_LABEL, type BookingStatus, type BookingWithResource } from '@/types/database'
import Link from 'next/link'

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
    <div className="app-container py-6">
      <header className="mb-5 border-b border-[#dadce0] pb-5">
        <h1 className="page-title">Danh sách booking</h1>
        <p className="page-description mt-1">100 booking lưu trú mới nhất, lọc theo trạng thái xử lý.</p>
      </header>

      <div className="mb-4 flex flex-wrap gap-1 border-b border-[#dadce0]">
        {FILTER_OPTIONS.map((opt) => (
          <Link
            key={opt.value}
            href={opt.value === 'all' ? '/bookings' : `/bookings?status=${opt.value}`}
            className={`border-b-2 px-3 py-2 text-sm transition-colors ${
              currentFilter === opt.value
                ? 'border-[#1a73e8] text-[#1a73e8]'
                : 'border-transparent text-[#5f6368] hover:text-[#202124]'
            }`}
          >
            {opt.label}
          </Link>
        ))}
      </div>

      {bookings.length === 0 ? (
        <div className="surface bg-white px-4 py-10 text-center text-sm text-[#5f6368]">
          Không có booking nào phù hợp bộ lọc.
        </div>
      ) : (
        <div className="surface table-scroll bg-white">
          <table className="w-full min-w-[860px] text-sm" style={{ tableLayout: 'fixed' }}>
            <thead className="border-b border-[#dadce0] bg-[#f8fafd] text-left text-xs text-[#5f6368]">
              <tr>
                <th className="px-4 py-3 font-medium" style={{ width: '14%' }}>Mã booking</th>
                <th className="px-4 py-3 font-medium" style={{ width: '18%' }}>Phòng</th>
                <th className="px-4 py-3 font-medium" style={{ width: '18%' }}>Ngày</th>
                <th className="px-4 py-3 font-medium" style={{ width: '18%' }}>Khách</th>
                <th className="px-4 py-3 font-medium" style={{ width: '17%' }}>Trạng thái</th>
                <th className="px-4 py-3 text-right font-medium" style={{ width: '15%' }}>Số tiền</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e8eaed]">
              {bookings.map((b) => (
                <tr key={b.id} className="hover:bg-[#f8fafd]">
                  <td className="px-4 py-3">
                    <Link href={`/bookings/${b.id}`} className="font-medium text-[#1a73e8] hover:underline">
                      {b.booking_code}
                    </Link>
                  </td>
                  <td className="truncate px-4 py-3 text-[#202124]">{b.resource.name}</td>
                  <td className="px-4 py-3 text-xs text-[#5f6368]">{formatDateRange(b.check_in, b.check_out)}</td>
                  <td className="truncate px-4 py-3 text-[#202124]">{b.customer_name}</td>
                  <td className="px-4 py-3"><StatusBadge status={b.status} /></td>
                  <td className="px-4 py-3 text-right tabular-nums text-[#202124]">{formatVND(b.amount_due)}</td>
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
