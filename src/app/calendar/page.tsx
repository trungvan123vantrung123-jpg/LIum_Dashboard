import { createServiceClient } from '@/lib/supabase-server'
import type { BookingWithResource, Resource } from '@/types/database'
import { BOOKING_STATUS_COLOR } from '@/types/database'
import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export const dynamic = 'force-dynamic'

// Chỉ hiển thị các trạng thái "đang sống" trên lịch — trạng thái đã kết
// thúc vòng đời (expired/cancelled/refunded) không cần chiếm chỗ hiển thị,
// tránh làm rối mắt nhân viên khi nhìn lịch tháng.
const LIVE_STATUSES = ['pending_hold', 'confirmed', 'payment_mismatch', 'cancel_requested']

async function getCalendarData(year: number, month: number) {
  const supabase = createServiceClient()

  const firstDay = new Date(Date.UTC(year, month - 1, 1))
  const lastDay = new Date(Date.UTC(year, month, 0))
  const firstDayStr = firstDay.toISOString().split('T')[0]
  const lastDayStr = lastDay.toISOString().split('T')[0]

  const { data: resources } = await supabase
    .from('resources')
    .select('*')
    .eq('resource_type', 'room')
    .eq('is_active', true)
    .order('code')

  // Lấy booking có overlap với tháng đang xem: check_in < lastDay+1 AND check_out > firstDay
  const { data: bookings } = await supabase
    .from('bookings')
    .select('*, resource:resources(*)')
    .eq('booking_type', 'stay')
    .in('status', LIVE_STATUSES)
    .lt('check_in', lastDayStr)
    .gt('check_out', firstDayStr)

  return {
    resources: (resources ?? []) as Resource[],
    bookings: (bookings ?? []) as BookingWithResource[],
    daysInMonth: lastDay.getUTCDate(),
  }
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>
}) {
  const params = await searchParams
  const now = new Date()
  const year = Number(params.year) || now.getFullYear()
  const month = Number(params.month) || now.getMonth() + 1

  const { resources, bookings, daysInMonth } = await getCalendarData(year, month)

  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)

  const prevMonth = month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 }
  const nextMonth = month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 }

  return (
    <div className="max-w-full overflow-x-auto p-6">
      <div className="flex items-center justify-between mb-5 max-w-6xl">
        <h1 className="text-lg font-medium text-gray-900">Lịch phòng</h1>
        <div className="flex items-center gap-3">
          <Link
            href={`/calendar?year=${prevMonth.year}&month=${prevMonth.month}`}
            className="p-1.5 border border-gray-200 rounded-md hover:bg-gray-50"
          >
            <ChevronLeft size={16} />
          </Link>
          <span className="text-sm font-medium min-w-[90px] text-center">
            Tháng {month}/{year}
          </span>
          <Link
            href={`/calendar?year=${nextMonth.year}&month=${nextMonth.month}`}
            className="p-1.5 border border-gray-200 rounded-md hover:bg-gray-50"
          >
            <ChevronRight size={16} />
          </Link>
        </div>
      </div>

      <div
        className="grid text-xs border border-gray-200 rounded-lg overflow-hidden min-w-max"
        style={{
          gridTemplateColumns: `140px repeat(${daysInMonth}, minmax(32px, 1fr))`,
        }}
      >
        {/* Header hàng ngày */}
        <div className="bg-gray-50 border-b border-r border-gray-200 p-2" />
        {days.map((d) => {
          const dow = new Date(Date.UTC(year, month - 1, d)).getUTCDay()
          const isWeekend = dow === 0 || dow === 6
          return (
            <div
              key={d}
              className={`text-center py-2 border-b border-gray-200 ${
                isWeekend ? 'bg-amber-50 text-amber-700 font-medium' : 'bg-gray-50 text-gray-500'
              }`}
            >
              {d}
            </div>
          )
        })}

        {/* Mỗi phòng 1 hàng */}
        {resources.map((resource) => {
          const roomBookings = bookings.filter((b) => b.resource_id === resource.id)

          return (
            <RoomRow
              key={resource.id}
              resource={resource}
              bookings={roomBookings}
              daysInMonth={daysInMonth}
              year={year}
              month={month}
            />
          )
        })}
      </div>

      <div className="flex flex-wrap gap-4 mt-4 text-xs text-gray-500">
        <Legend color={BOOKING_STATUS_COLOR.confirmed} label="Đã xác nhận" />
        <Legend color={BOOKING_STATUS_COLOR.pending_hold} label="Đang giữ chỗ" />
        <Legend color={BOOKING_STATUS_COLOR.payment_mismatch} label="Lệch tiền" />
        <Legend color={BOOKING_STATUS_COLOR.cancel_requested} label="Chờ duyệt huỷ" />
      </div>
    </div>
  )
}

function RoomRow({
  resource,
  bookings,
  daysInMonth,
}: {
  resource: Resource
  bookings: BookingWithResource[]
  daysInMonth: number
  year: number
  month: number
}) {
  // Với mỗi ngày trong tháng, xác định ô đó thuộc booking nào (nếu có) và
  // đây có phải NGÀY BẮT ĐẦU của dải booking đó không (để chỉ render label
  // 1 lần ở ô đầu tiên, dùng grid-column-span kéo dài các ô tiếp theo).
  const cells: React.ReactNode[] = []
  let day = 1

  while (day <= daysInMonth) {
    const booking = findBookingForDay(bookings, day)

    if (!booking) {
      cells.push(
        <div
          key={day}
          className="border-b border-r border-gray-100 bg-white"
          style={{ gridColumn: 'span 1' }}
        />
      )
      day += 1
      continue
    }

    // Tính số ngày còn lại của booking này trong tháng hiện tại, để gộp ô
    const span = getSpanInMonth(booking, day, daysInMonth)

    cells.push(
      <Link
        key={day}
        href={`/bookings/${booking.id}`}
        className={`border-b border-r border-gray-100 flex items-center px-1.5 py-2 text-[11px] font-medium truncate hover:opacity-80 transition ${BOOKING_STATUS_COLOR[booking.status]}`}
        style={{ gridColumn: `span ${span}` }}
        title={`${booking.booking_code} — ${booking.customer_name}`}
      >
        {booking.customer_name}
      </Link>
    )
    day += span
  }

  return (
    <>
      <div className="border-b border-r border-gray-200 px-3 py-2 text-gray-700 truncate bg-white sticky left-0">
        {resource.name}
      </div>
      {cells}
    </>
  )
}

function findBookingForDay(
  bookings: BookingWithResource[],
  day: number
): BookingWithResource | undefined {
  return bookings.find((b) => {
    if (!b.check_in || !b.check_out) return false
    const checkInDay = new Date(b.check_in).getUTCDate()
    const checkInMonth = new Date(b.check_in).getUTCMonth()
    const checkOutDay = new Date(b.check_out).getUTCDate()
    const checkOutMonth = new Date(b.check_out).getUTCMonth()

    const currentMonth = new Date(b.check_in).getUTCMonth()

    // So sánh đơn giản trong phạm vi cùng tháng đang hiển thị — vì query
    // đã lọc overlap với tháng, các mốc ngày ở đây coi như cùng 1 tháng
    // hiển thị (đủ dùng cho UI lịch tháng, không cần xử lý qua năm phức tạp)
    const startDay = checkInMonth === currentMonth ? checkInDay : 1
    const endDay = checkOutMonth === currentMonth ? checkOutDay : 32

    return day >= startDay && day < endDay
  })
}

function getSpanInMonth(booking: BookingWithResource, fromDay: number, daysInMonth: number): number {
  if (!booking.check_out) return 1
  const checkOutDay = new Date(booking.check_out).getUTCDate()
  const checkOutMonth = new Date(booking.check_out).getUTCMonth()
  const checkInMonth = new Date(booking.check_in!).getUTCMonth()

  const endDay = checkOutMonth === checkInMonth ? checkOutDay : daysInMonth + 1
  return Math.max(1, Math.min(endDay, daysInMonth + 1) - fromDay)
}

function Legend({ color, label }: { color: string; label: string }) {
  const bgClass = color.split(' ')[0]
  return (
    <div className="flex items-center gap-1.5">
      <span className={`w-2.5 h-2.5 rounded-sm ${bgClass}`} />
      {label}
    </div>
  )
}
