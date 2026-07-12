import { createServiceClient } from '@/lib/supabase-server'
import type { BookingWithResource } from '@/types/database'
import { AlertCard } from '@/components/AlertCard'
import { StatCard } from '@/components/StatCard'
import Link from 'next/link'
import { Calendar, List, Users } from 'lucide-react'

// Trang này luôn lấy dữ liệu mới nhất từ Supabase, không dùng cache tĩnh —
// vì đây là dashboard vận hành, nhân viên cần thấy số liệu thật lúc họ mở trang.
export const dynamic = 'force-dynamic'

async function getDashboardData() {
  const supabase = createServiceClient()
  const today = new Date().toISOString().split('T')[0]

  // Số phòng đang có khách hôm nay: check_in <= hôm nay < check_out, status confirmed
  const { data: stayingToday } = await supabase
    .from('bookings')
    .select('id')
    .eq('status', 'confirmed')
    .eq('booking_type', 'stay')
    .lte('check_in', today)
    .gt('check_out', today)

  const { count: totalRooms } = await supabase
    .from('resources')
    .select('id', { count: 'exact', head: true })
    .eq('resource_type', 'room')
    .eq('is_active', true)

  // Booking đang chờ xác nhận (pending_hold)
  const { data: pendingBookings } = await supabase
    .from('bookings')
    .select('id')
    .eq('status', 'pending_hold')

  // Lead sự kiện mới trong 48h gần nhất
  const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()
  const { data: newLeads } = await supabase
    .from('event_inquiries')
    .select('id')
    .eq('status', 'new_lead')
    .gte('created_at', twoDaysAgo)

  // Các case cần xử lý gấp: lệch tiền, chờ duyệt huỷ, sắp hết hạn giữ chỗ (<30 phút)
  const { data: mismatchBookings } = await supabase
    .from('bookings')
    .select('*, resource:resources(*)')
    .eq('status', 'payment_mismatch')
    .order('created_at', { ascending: false })

  const { data: cancelRequestedBookings } = await supabase
    .from('bookings')
    .select('*, resource:resources(*)')
    .eq('status', 'cancel_requested')
    .order('created_at', { ascending: false })

  const soon = new Date(Date.now() + 30 * 60 * 1000).toISOString()
  const now = new Date().toISOString()
  const { data: expiringBookings } = await supabase
    .from('bookings')
    .select('*, resource:resources(*)')
    .eq('status', 'pending_hold')
    .gte('hold_expires_at', now)
    .lte('hold_expires_at', soon)
    .order('hold_expires_at', { ascending: true })

  return {
    stayingCount: stayingToday?.length ?? 0,
    totalRooms: totalRooms ?? 8,
    pendingCount: pendingBookings?.length ?? 0,
    newLeadsCount: newLeads?.length ?? 0,
    mismatchBookings: (mismatchBookings ?? []) as BookingWithResource[],
    cancelRequestedBookings: (cancelRequestedBookings ?? []) as BookingWithResource[],
    expiringBookings: (expiringBookings ?? []) as BookingWithResource[],
  }
}

export default async function DashboardPage() {
  const data = await getDashboardData()

  const todayLabel = new Date().toLocaleDateString('vi-VN', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })

  const totalUrgent =
    data.mismatchBookings.length +
    data.cancelRequestedBookings.length +
    data.expiringBookings.length

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-medium text-gray-900">
          Đồi Llum — Bảng điều khiển
        </h1>
        <span className="text-sm text-gray-500 capitalize">{todayLabel}</span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <StatCard
          label="Khách đang lưu trú"
          value={`${data.stayingCount} / ${data.totalRooms} phòng`}
        />
        <StatCard
          label="Chờ xác nhận cọc"
          value={data.pendingCount}
          tone={data.pendingCount > 0 ? 'warning' : 'default'}
        />
        <StatCard label="Lead sự kiện mới" value={data.newLeadsCount} tone="accent" />
        <StatCard
          label="Cần xử lý gấp"
          value={totalUrgent}
          tone={totalUrgent > 0 ? 'danger' : 'default'}
        />
      </div>

      <div className="mb-8">
        <h2 className="text-sm font-medium text-gray-900 mb-3">Cần xử lý ngay</h2>

        {totalUrgent === 0 && (
          <p className="text-sm text-gray-500">
            Không có việc gấp nào cần xử lý lúc này.
          </p>
        )}

        <div className="flex flex-col gap-2">
          {data.mismatchBookings.map((b) => (
            <AlertCard
              key={b.id}
              tone="danger"
              title={`${b.booking_code} — lệch tiền`}
              description={`Cần ${formatVND(b.amount_due)}, nhận ${formatVND(
                b.amount_paid ?? 0
              )} — ${b.resource.name}`}
              href={`/bookings/${b.id}`}
            />
          ))}
          {data.cancelRequestedBookings.map((b) => (
            <AlertCard
              key={b.id}
              tone="warning"
              title={`${b.booking_code} — chờ duyệt huỷ`}
              description={`${b.resource.name}, khách ${b.customer_name}, đã thanh toán ${formatVND(
                b.amount_paid ?? 0
              )}`}
              href={`/bookings/${b.id}`}
            />
          ))}
          {data.expiringBookings.map((b) => (
            <AlertCard
              key={b.id}
              tone="muted"
              title={`${b.booking_code} — sắp hết hạn giữ chỗ`}
              description={`${b.resource.name}, còn ${minutesUntil(
                b.hold_expires_at
              )} phút, chưa thấy chuyển khoản`}
              href={`/bookings/${b.id}`}
            />
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-sm font-medium text-gray-900 mb-3">Truy cập nhanh</h2>
        <div className="grid grid-cols-3 gap-3">
          <Link
            href="/calendar"
            className="flex items-center justify-center gap-2 border border-gray-200 rounded-lg py-3 text-sm hover:bg-gray-50 transition"
          >
            <Calendar size={16} /> Lịch phòng
          </Link>
          <Link
            href="/bookings"
            className="flex items-center justify-center gap-2 border border-gray-200 rounded-lg py-3 text-sm hover:bg-gray-50 transition"
          >
            <List size={16} /> Danh sách booking
          </Link>
          <Link
            href="/events"
            className="flex items-center justify-center gap-2 border border-gray-200 rounded-lg py-3 text-sm hover:bg-gray-50 transition"
          >
            <Users size={16} /> Sự kiện
          </Link>
        </div>
      </div>
    </div>
  )
}

function formatVND(amount: number): string {
  return amount.toLocaleString('vi-VN') + 'đ'
}

function minutesUntil(isoString: string | null): number {
  if (!isoString) return 0
  const diff = new Date(isoString).getTime() - Date.now()
  return Math.max(0, Math.round(diff / 60000))
}
