import { createServiceClient } from '@/lib/supabase-server'
import type { BookingWithResource } from '@/types/database'
import { StatusBadge } from '@/components/StatusBadge'
import { BookingActions } from '@/components/BookingActions'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
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
    <div className="max-w-2xl mx-auto p-6">
      <Link
        href="/bookings"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4"
      >
        <ArrowLeft size={14} /> Quay lại danh sách
      </Link>

      <div className="border border-gray-200 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-lg font-medium text-gray-900">{booking.booking_code}</h1>
          <StatusBadge status={booking.status} />
        </div>

        <dl className="grid grid-cols-2 gap-y-3 gap-x-4 text-sm mb-4">
          <Field label="Phòng" value={booking.resource.name} />
          <Field
            label="Ngày"
            value={`${formatDate(booking.check_in)} - ${formatDate(booking.check_out)}`}
          />
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

        <div className="border-t border-gray-100 pt-4">
          <h2 className="text-xs font-medium text-gray-500 mb-2">THÔNG TIN THANH TOÁN</h2>
          <dl className="grid grid-cols-2 gap-y-3 gap-x-4 text-sm">
            <Field label="Tổng tiền" value={formatVND(booking.total_amount)} />
            <Field label="% cọc áp dụng" value={`${booking.deposit_percent}%`} />
            <Field label="Cần thu" value={formatVND(booking.amount_due)} strong />
            <Field
              label="Đã nhận"
              value={booking.amount_paid != null ? formatVND(booking.amount_paid) : 'Chưa có'}
              tone={
                booking.status === 'payment_mismatch'
                  ? 'danger'
                  : booking.amount_paid
                  ? 'success'
                  : undefined
              }
            />
            {booking.refund_amount != null && (
              <>
                <Field label="% hoàn tiền" value={`${booking.refund_percent}%`} />
                <Field label="Số tiền hoàn" value={formatVND(booking.refund_amount)} />
              </>
            )}
          </dl>

          {booking.payment_screenshot_url && (
            <div className="mt-3">
              <h3 className="text-xs font-medium text-gray-500 mb-2">
                ẢNH CHUYỂN KHOẢN KHÁCH GỬI
              </h3>
              <a
                href={booking.payment_screenshot_url}
                target="_blank"
                rel="noopener noreferrer"
                className="block"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={booking.payment_screenshot_url}
                  alt="Ảnh chuyển khoản"
                  className="rounded-lg border border-gray-200 max-h-80 object-contain"
                />
              </a>
            </div>
          )}
        </div>

        {booking.cancel_reason && (
          <div className="border-t border-gray-100 pt-4 mt-4">
            <h2 className="text-xs font-medium text-gray-500 mb-1">LÝ DO HUỶ</h2>
            <p className="text-sm text-gray-700">{booking.cancel_reason}</p>
          </div>
        )}

        <BookingActions booking={booking} />
      </div>
    </div>
  )
}

function Field({
  label,
  value,
  strong,
  tone,
}: {
  label: string
  value: string
  strong?: boolean
  tone?: 'danger' | 'success'
}) {
  const toneClass =
    tone === 'danger' ? 'text-red-600' : tone === 'success' ? 'text-green-600' : 'text-gray-900'
  return (
    <div>
      <dt className="text-xs text-gray-500">{label}</dt>
      <dd className={`${strong ? 'font-medium' : ''} ${toneClass}`}>{value}</dd>
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
