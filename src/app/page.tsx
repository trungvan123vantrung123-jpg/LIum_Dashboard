import { AlertCard } from '@/components/AlertCard'
import { StatCard } from '@/components/StatCard'
import { createServiceClient } from '@/lib/supabase-server'
import type { BookingWithResource } from '@/types/database'
import { Calendar, List, Users } from 'lucide-react'
import Link from 'next/link'

// Trang này luôn lấy dữ liệu mới nhất từ Supabase, không dùng cache tĩnh —
// vì đây là dashboard vận hành, nhân viên cần thấy số liệu thật lúc họ mở trang.
export const dynamic = 'force-dynamic'

async function getDashboardData() {
  const supabase = createServiceClient()
  const today = new Date().toISOString().split('T')[0]

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

  const { data: pendingBookings } = await supabase
    .from('bookings')
    .select('id')
    .eq('status', 'payment_submitted')

  const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()
  const { data: newLeads } = await supabase
    .from('event_inquiries')
    .select('id')
    .eq('status', 'new_lead')
    .gte('created_at', twoDaysAgo)

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
    <div className="app-container py-6">
      <header className="mb-6 flex flex-col gap-1 border-b border-[#dadce0] pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="page-title">Tổng quan vận hành</h1>
          <p className="page-description mt-1">Đồi Llum — cập nhật theo thời gian thực từ Supabase.</p>
        </div>
        <span className="text-sm capitalize text-[#5f6368]">{todayLabel}</span>
      </header>

      <section className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Khách lưu trú" value={`${data.stayingCount} / ${data.totalRooms}`} />
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
      </section>

      <section className="surface mb-6 overflow-hidden">
        <div className="border-b border-[#dadce0] px-4 py-3">
          <h2 className="text-sm font-medium text-[#202124]">Cần xử lý ngay</h2>
          <p className="mt-0.5 text-xs text-[#5f6368]">Các booking cần nhân viên kiểm tra thủ công.</p>
        </div>

        {totalUrgent === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-[#5f6368]">
            Không có việc gấp nào cần xử lý lúc này.
          </div>
        ) : (
          <div className="divide-y divide-[#e8eaed]">
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
        )}
      </section>

      <section className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <QuickLink href="/calendar" icon={<Calendar size={18} />} title="Lịch phòng" text="Xem tình trạng phòng theo tháng" />
        <QuickLink href="/bookings" icon={<List size={18} />} title="Danh sách booking" text="Tra cứu và xử lý đặt phòng" />
        <QuickLink href="/events" icon={<Users size={18} />} title="Sự kiện" text="Theo dõi lead và báo giá" />
      </section>
    </div>
  )
}

function QuickLink({ href, icon, title, text }: { href: string; icon: React.ReactNode; title: string; text: string }) {
  return (
    <Link href={href} className="surface flex items-start gap-3 bg-white p-4 transition-colors hover:bg-[#f8fafd]">
      <span className="mt-0.5 text-[#1a73e8]">{icon}</span>
      <span>
        <span className="block text-sm font-medium text-[#202124]">{title}</span>
        <span className="mt-0.5 block text-xs text-[#5f6368]">{text}</span>
      </span>
    </Link>
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
