'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Booking } from '@/types/database'

interface BookingActionsProps {
  booking: Booking
}

// Client Component chứa toàn bộ nút hành động — tách riêng khỏi trang
// Server Component vì cần state (loading, input %hoàn tiền) và onClick.
// Mỗi nút gọi đúng 1 API route tương ứng, KHÔNG bao giờ tự UPDATE
// Supabase thẳng từ client — mọi logic kiểm tra race condition nằm ở
// API route phía server.
export function BookingActions({ booking }: BookingActionsProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [refundPercent, setRefundPercent] = useState(50)
  const [showRefundForm, setShowRefundForm] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [showCancelForm, setShowCancelForm] = useState(false)

  async function callApi(url: string, body: Record<string, unknown>) {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Có lỗi xảy ra')
        setLoading(false)
        return
      }
      router.refresh()
    } catch {
      setError('Không kết nối được máy chủ, thử lại nhé')
      setLoading(false)
    }
  }

  return (
    <div className="border-t border-gray-100 pt-4 mt-4">
      {error && (
        <div className="bg-red-50 text-red-700 text-sm rounded-lg px-3 py-2 mb-3">
          {error}
        </div>
      )}

      {/* Đang giữ chỗ hoặc lệch tiền: có thể xác nhận */}
      {(booking.status === 'pending_hold' || booking.status === 'payment_mismatch') && (
        <div className="flex gap-2 mb-2">
          <button
            disabled={loading}
            onClick={() => callApi('/api/bookings/confirm', { bookingId: booking.id })}
            className="flex-1 bg-green-600 text-white text-sm font-medium rounded-lg py-2.5 hover:bg-green-700 disabled:opacity-50 transition"
          >
            Xác nhận đã nhận đủ tiền
          </button>
        </div>
      )}

      {/* Lệch tiền: thêm lựa chọn huỷ vì khách không bổ sung */}
      {booking.status === 'payment_mismatch' && (
        <button
          disabled={loading}
          onClick={() =>
            callApi('/api/bookings/mark-mismatch-resolved', {
              bookingId: booking.id,
              reason: 'Khách không bổ sung đủ tiền, nhân viên huỷ giữ chỗ',
            })
          }
          className="w-full border border-red-200 text-red-700 text-sm font-medium rounded-lg py-2.5 hover:bg-red-50 disabled:opacity-50 transition mb-2"
        >
          Khách không bổ sung tiền — huỷ giữ chỗ
        </button>
      )}

      {/* Đang giữ chỗ hoặc đã xác nhận: có thể huỷ (theo 2 nhánh khác nhau) */}
      {(booking.status === 'pending_hold' || booking.status === 'confirmed') && (
        <>
          {!showCancelForm ? (
            <button
              disabled={loading}
              onClick={() => setShowCancelForm(true)}
              className="w-full border border-gray-200 text-gray-700 text-sm font-medium rounded-lg py-2.5 hover:bg-gray-50 disabled:opacity-50 transition"
            >
              Huỷ booking
            </button>
          ) : (
            <div className="border border-gray-200 rounded-lg p-3">
              <label className="text-xs text-gray-500 block mb-1">
                Lý do huỷ (tuỳ chọn)
              </label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full border border-gray-200 rounded-md text-sm p-2 mb-2"
                rows={2}
                placeholder="Ví dụ: khách đổi ý, gia đình có việc đột xuất..."
              />
              <div className="flex gap-2">
                <button
                  disabled={loading}
                  onClick={() =>
                    callApi('/api/bookings/cancel', {
                      bookingId: booking.id,
                      reason: cancelReason || null,
                    })
                  }
                  className="flex-1 bg-gray-900 text-white text-sm font-medium rounded-lg py-2 hover:bg-gray-800 disabled:opacity-50 transition"
                >
                  {booking.status === 'confirmed'
                    ? 'Gửi yêu cầu huỷ (chờ duyệt hoàn tiền)'
                    : 'Xác nhận huỷ'}
                </button>
                <button
                  onClick={() => setShowCancelForm(false)}
                  className="px-4 text-sm text-gray-500 hover:text-gray-700"
                >
                  Đóng
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Chờ duyệt huỷ: nhập % hoàn tiền */}
      {booking.status === 'cancel_requested' && (
        <>
          {!showRefundForm ? (
            <button
              disabled={loading}
              onClick={() => setShowRefundForm(true)}
              className="w-full bg-blue-600 text-white text-sm font-medium rounded-lg py-2.5 hover:bg-blue-700 disabled:opacity-50 transition"
            >
              Duyệt hoàn tiền
            </button>
          ) : (
            <div className="border border-gray-200 rounded-lg p-3">
              <label className="text-xs text-gray-500 block mb-1">
                Phần trăm hoàn tiền (theo chính sách 7 ngày / 3 ngày trước
                check-in)
              </label>
              <div className="flex items-center gap-2 mb-2">
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={refundPercent}
                  onChange={(e) => setRefundPercent(Number(e.target.value))}
                  className="w-20 border border-gray-200 rounded-md text-sm p-2"
                />
                <span className="text-sm text-gray-500">
                  % của {(booking.amount_paid ?? 0).toLocaleString('vi-VN')}đ ={' '}
                  <strong>
                    {Math.round(((booking.amount_paid ?? 0) * refundPercent) / 100).toLocaleString(
                      'vi-VN'
                    )}
                    đ
                  </strong>
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  disabled={loading}
                  onClick={() =>
                    callApi('/api/bookings/approve-refund', {
                      bookingId: booking.id,
                      refundPercent,
                    })
                  }
                  className="flex-1 bg-blue-600 text-white text-sm font-medium rounded-lg py-2 hover:bg-blue-700 disabled:opacity-50 transition"
                >
                  Xác nhận hoàn {refundPercent}%
                </button>
                <button
                  onClick={() => setShowRefundForm(false)}
                  className="px-4 text-sm text-gray-500 hover:text-gray-700"
                >
                  Đóng
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {['expired', 'cancelled', 'refunded'].includes(booking.status) && (
        <p className="text-sm text-gray-400 italic">
          Booking này đã kết thúc vòng đời, không còn hành động nào khả dụng.
        </p>
      )}
    </div>
  )
}
