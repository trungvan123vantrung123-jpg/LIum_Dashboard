import { BookingActions } from '@/components/BookingActions'
import { StatusBadge } from '@/components/StatusBadge'
import { createServiceClient } from '@/lib/supabase-server'
import type { BookingWithResource } from '@/types/database'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

async function getBooking(id: string) {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('bookings')
    .select('*, resource:resources(*)')
    .eq('id', id)
    .single()

  if (error || !data) return null
  return data as BookingWithResource
}

export default async function BookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const booking = await getBooking(id)

  if (!booking) notFound()

  return (
    <div className="app-container max-w-[860px] py-6">
      <Link href="/bookings" className="mb-4 inline-flex items-center gap-1.5 text-sm text-[#5f6368] hover:text-[#202124]">
        <ArrowLeft size={16} /> Quay lại danh sách
      </Link>

      <article className="surface bg-white">
        <header className="flex flex-col gap-3 border-b border-[#dadce0] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="page-title">{booking.booking_code}</h1>
            <p className="page-description mt-1">{booking.resource.name} · {booking.customer_name}</p>
          </div>
          <StatusBadge status={booking.status} />
        </header>

        <section className="px-5 py-5">
          <h2 className="mb-3 text-sm font-medium text-[#202124]">Thông tin lưu trú</h2>
          <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
            <Field label="Phòng" value={booking.resource.name} />
            <Field label="Ngày" value={`${formatDate(booking.check_in)} - ${formatDate(booking.check_out)}`} />
            <Field label="Khách" value={booking.customer_name} />
            <Field label="SĐT" value={booking.customer_phone} />
            <Field
              label="Số khách"
              value={`${booking.adult_count} người lớn${
                booking.child_count > 0 ? `, ${booking.child_count} trẻ em` : ''
              }${booking.pet_count > 0 ? `, ${booking.pet_count} thú cưng` : ''}`}
            />
            <Field label="Kênh liên hệ" value={booking.customer_platform ?? '-'} />
          </dl>
        </section>

        <section className="border-t border-[#e8eaed] px-5 py-5">
          <h2 className="mb-3 text-sm font-medium text-[#202124]">Thanh toán</h2>
          <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
            <Field label="Tổng tiền" value={formatVND(booking.total_amount)} />
            <Field label="% cọc áp dụng" value={`${booking.deposit_percent}%`} />
            <Field label="Cần thu" value={formatVND(booking.amount_due)} strong />
            <Field
              label="Đã nhận"
              value={booking.amount_paid != null ? formatVND(booking.amount_paid) : 'Chưa có'}
              tone={booking.status === 'payment_mismatch' ? 'danger' : booking.amount_paid ? 'success' : undefined}
            />
            {booking.refund_amount != null && (
              <>
                <Field label="% hoàn tiền" value={`${booking.refund_percent}%`} />
                <Field label="Số tiền hoàn" value={formatVND(booking.refund_amount)} />
              </>
            )}
          </dl>

          {booking.payment_screenshot_url && (
            <div className="mt-5">
              <h3 className="mb-2 text-xs font-medium uppercase tracking-[0.04em] text-[#5f6368]">Ảnh chuyển khoản</h3>
              <a href={booking.payment_screenshot_url} target="_blank" rel="noopener noreferrer" className="inline-block">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={booking.payment_screenshot_url} alt="Ảnh chuyển khoản" className="max-h-80 border border-[#dadce0] object-contain" />
              </a>
            </div>
          )}
        </section>

        {booking.cancel_reason && (
          <section className="border-t border-[#e8eaed] px-5 py-5">
            <h2 className="mb-1 text-sm font-medium text-[#202124]">Lý do huỷ</h2>
            <p className="text-sm text-[#5f6368]">{booking.cancel_reason}</p>
          </section>
        )}

        <div className="px-5 pb-5">
          <BookingActions booking={booking} />
        </div>
      </article>
    </div>
  )
}

function Field({ label, value, strong, tone }: { label: string; value: string; strong?: boolean; tone?: 'danger' | 'success' }) {
  const toneClass = tone === 'danger' ? 'text-[#c5221f]' : tone === 'success' ? 'text-[#137333]' : 'text-[#202124]'
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-[0.04em] text-[#5f6368]">{label}</dt>
      <dd className={`mt-1 text-sm ${strong ? 'font-medium' : ''} ${toneClass}`}>{value}</dd>
    </div>
  )
}

function formatVND(amount: number): string {
  return amount.toLocaleString('vi-VN') + 'đ'
}

function formatDate(d: string | null): string {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
}
