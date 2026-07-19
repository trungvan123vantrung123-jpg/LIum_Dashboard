import { createServiceClient } from '@/lib/supabase-server'
import { BOOKING_STATUS_COLOR } from '@/types/database'
import type { BookingStatus, Resource } from '@/types/database'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

const LIVE_STATUSES: BookingStatus[] = ['pending_hold', 'payment_submitted', 'confirmed', 'payment_mismatch', 'cancel_requested']

type CalendarBooking = {
  id: string
  booking_code: string
  resource_id: string
  booking_type: 'stay'
  check_in: string | null
  check_out: string | null
  status: BookingStatus
  customer_name: string
}

async function getCalendarData(year: number, month: number) {
  const supabase = createServiceClient()
  const firstDay = new Date(Date.UTC(year, month - 1, 1))
  const nextMonthDay = new Date(Date.UTC(year, month, 1))
  const lastDay = new Date(Date.UTC(year, month, 0))
  const firstDayStr = firstDay.toISOString().slice(0, 10)
  const nextMonthStr = nextMonthDay.toISOString().slice(0, 10)

  const [resourceResult, bookingResult] = await Promise.all([
    supabase.from('resources').select('id, resource_type, code, name, area, standard_capacity, max_capacity, requires_booking, is_active, metadata, lark_record_id, created_at').eq('resource_type', 'room').eq('is_active', true).order('code'),
    supabase.from('bookings').select('id, booking_code, resource_id, booking_type, check_in, check_out, status, customer_name').eq('booking_type', 'stay').in('status', LIVE_STATUSES).lt('check_in', nextMonthStr).gt('check_out', firstDayStr),
  ])
  if (resourceResult.error) throw resourceResult.error
  if (bookingResult.error) throw bookingResult.error

  return {
    resources: (resourceResult.data ?? []) as Resource[],
    bookings: (bookingResult.data ?? []) as CalendarBooking[],
    daysInMonth: lastDay.getUTCDate(),
  }
}

export default async function CalendarPage({ searchParams }: { searchParams: Promise<{ year?: string; month?: string }> }) {
  const params = await searchParams
  const now = new Date()
  const requestedYear = Number(params.year)
  const requestedMonth = Number(params.month)
  const year = Number.isInteger(requestedYear) && requestedYear >= 2020 && requestedYear <= 2100 ? requestedYear : now.getFullYear()
  const month = Number.isInteger(requestedMonth) && requestedMonth >= 1 && requestedMonth <= 12 ? requestedMonth : now.getMonth() + 1
  const { resources, bookings, daysInMonth } = await getCalendarData(year, month)
  const bookingsByResource = new Map<string, CalendarBooking[]>()
  for (const booking of bookings) {
    const group = bookingsByResource.get(booking.resource_id) ?? []
    group.push(booking)
    bookingsByResource.set(booking.resource_id, group)
  }
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
        <div className="flex flex-wrap items-center gap-2">
          <Link id="calendar-create-booking" href="/bookings/new" className="rounded-lg bg-[#1a73e8] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[#1765cc]">+ Tạo booking</Link>
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
              <RoomRow key={resource.id} year={year} month={month} resource={resource} bookings={bookingsByResource.get(resource.id) ?? []} daysInMonth={daysInMonth} />
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

function RoomRow({ year, month, resource, bookings, daysInMonth }: { year: number; month: number; resource: Resource; bookings: CalendarBooking[]; daysInMonth: number }) {
  const cells: React.ReactNode[] = []
  let day = 1
  while (day <= daysInMonth) {
    const booking = findBookingForDay(bookings, day, year, month)
    if (!booking) {
      const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      cells.push(<Link key={day} href={`/bookings/new?resourceId=${resource.id}&date=${date}`} aria-label={`Tạo booking ${resource.name} ngày ${date}`} className="group flex min-h-10 items-center justify-center border-b border-r border-[#e8eaed] bg-white text-[#bdc1c6] transition hover:bg-[#e8f0fe] hover:text-[#1a73e8]" style={{ gridColumn: 'span 1' }}><span className="opacity-0 transition group-hover:opacity-100">+</span></Link>)
      day += 1
      continue
    }
    const span = getSpanInMonth(booking, day, daysInMonth, year, month)
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

function findBookingForDay(bookings: CalendarBooking[], day: number, year: number, month: number): CalendarBooking | undefined {
  const current = Date.UTC(year, month - 1, day)
  return bookings.find((b) => {
    if (!b.check_in || !b.check_out) return false
    return current >= Date.parse(`${b.check_in}T00:00:00Z`) && current < Date.parse(`${b.check_out}T00:00:00Z`)
  })
}

function getSpanInMonth(booking: CalendarBooking, fromDay: number, daysInMonth: number, year: number, month: number): number {
  if (!booking.check_out) return 1
  const monthEnd = Date.UTC(year, month - 1, daysInMonth + 1)
  const end = Math.min(Date.parse(`${booking.check_out}T00:00:00Z`), monthEnd)
  const start = Date.UTC(year, month - 1, fromDay)
  return Math.max(1, Math.round((end - start) / 86_400_000))
}

function Legend({ color, label }: { color: string; label: string }) {
  const bgClass = color.split(' ')[0]
  return <div className="flex items-center gap-1.5"><span className={`h-2.5 w-2.5 ${bgClass}`} />{label}</div>
}
