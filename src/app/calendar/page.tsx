import { createServiceClient } from '@/lib/supabase-server'
import { BOOKING_STATUS_COLOR } from '@/types/database'
import type { BookingWithResource, Resource } from '@/types/database'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

const LIVE_STATUSES = ['pending_hold', 'payment_submitted', 'confirmed', 'payment_mismatch', 'cancel_requested']

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

export default async function CalendarPage({ searchParams }: { searchParams: Promise<{ year?: string; month?: string }> }) {
  const params = await searchParams
  const now = new Date()
  const year = Number(params.year) || now.getFullYear()
  const month = Number(params.month) || now.getMonth() + 1
  const { resources, bookings, daysInMonth } = await getCalendarData(year, month)
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)
  const prevMonth = month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 }
  const nextMonth = month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 }

  return (
    <div className="py-6">
      <div className="app-container mb-5 flex flex-col gap-3 border-b border-[#dadce0] pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="page-title">Lịch phòng</h1>
          <p className="page-description mt-1">Tổng quan tình trạng giữ chỗ và lưu trú theo tháng.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/calendar?year=${prevMonth.year}&month=${prevMonth.month}`} className="border border-[#dadce0] bg-white p-2 text-[#5f6368] hover:bg-[#f8fafd]">
            <ChevronLeft size={16} />
          </Link>
          <span className="min-w-[110px] text-center text-sm font-medium text-[#202124]">Tháng {month}/{year}</span>
          <Link href={`/calendar?year=${nextMonth.year}&month=${nextMonth.month}`} className="border border-[#dadce0] bg-white p-2 text-[#5f6368] hover:bg-[#f8fafd]">
            <ChevronRight size={16} />
          </Link>
        </div>
      </div>

      <div className="px-6">
        <div className="surface table-scroll bg-white">
          <div className="grid min-w-max text-xs" style={{ gridTemplateColumns: `160px repeat(${daysInMonth}, minmax(34px, 1fr))` }}>
            <div className="sticky left-0 z-[1] border-b border-r border-[#dadce0] bg-[#f8fafd] p-2 font-medium text-[#5f6368]">Phòng</div>
            {days.map((d) => {
              const dow = new Date(Date.UTC(year, month - 1, d)).getUTCDay()
              const isWeekend = dow === 0 || dow === 6
              return (
                <div key={d} className={`border-b border-[#dadce0] py-2 text-center font-medium ${isWeekend ? 'bg-[#fff8e1] text-[#8a5a00]' : 'bg-[#f8fafd] text-[#5f6368]'}`}>
                  {d}
                </div>
              )
            })}
            {resources.map((resource) => (
              <RoomRow key={resource.id} resource={resource} bookings={bookings.filter((b) => b.resource_id === resource.id)} daysInMonth={daysInMonth} />
            ))}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-4 text-xs text-[#5f6368]">
          <Legend color={BOOKING_STATUS_COLOR.confirmed} label="Đã xác nhận" />
          <Legend color={BOOKING_STATUS_COLOR.pending_hold} label="Đang giữ chỗ" />
          <Legend color={BOOKING_STATUS_COLOR.payment_submitted} label="Chờ xác nhận CK" />
          <Legend color={BOOKING_STATUS_COLOR.payment_mismatch} label="Lệch tiền" />
          <Legend color={BOOKING_STATUS_COLOR.cancel_requested} label="Chờ duyệt huỷ" />
        </div>
      </div>
    </div>
  )
}

function RoomRow({ resource, bookings, daysInMonth }: { resource: Resource; bookings: BookingWithResource[]; daysInMonth: number }) {
  const cells: React.ReactNode[] = []
  let day = 1
  while (day <= daysInMonth) {
    const booking = findBookingForDay(bookings, day)
    if (!booking) {
      cells.push(<div key={day} className="min-h-10 border-b border-r border-[#e8eaed] bg-white" style={{ gridColumn: 'span 1' }} />)
      day += 1
      continue
    }
    const span = getSpanInMonth(booking, day, daysInMonth)
    cells.push(
      <Link key={day} href={`/bookings/${booking.id}`} className={`flex min-h-10 items-center border-b border-r border-white px-2 text-[11px] font-medium ${BOOKING_STATUS_COLOR[booking.status]} hover:underline`} style={{ gridColumn: `span ${span}` }} title={`${booking.booking_code} — ${booking.customer_name}`}>
        <span className="truncate">{booking.customer_name}</span>
      </Link>
    )
    day += span
  }
  return (
    <>
      <div className="sticky left-0 z-[1] border-b border-r border-[#dadce0] bg-white px-3 py-2 text-sm font-medium text-[#202124]">{resource.name}</div>
      {cells}
    </>
  )
}

function findBookingForDay(bookings: BookingWithResource[], day: number): BookingWithResource | undefined {
  return bookings.find((b) => {
    if (!b.check_in || !b.check_out) return false
    const checkInDay = new Date(b.check_in).getUTCDate()
    const checkInMonth = new Date(b.check_in).getUTCMonth()
    const checkOutDay = new Date(b.check_out).getUTCDate()
    const checkOutMonth = new Date(b.check_out).getUTCMonth()
    const currentMonth = new Date(b.check_in).getUTCMonth()
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
  return <div className="flex items-center gap-1.5"><span className={`h-2.5 w-2.5 ${bgClass}`} />{label}</div>
}
