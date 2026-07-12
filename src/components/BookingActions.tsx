'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Booking } from '@/types/database'

interface BookingActionsProps {
  booking: Booking
}

const buttonBase =
  'inline-flex items-center justify-center border px-3 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50'

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
    <div className="mt-5 border-t border-[#e8eaed] pt-5">
      <h2 className="mb-3 text-sm font-medium text-[#202124]">Hành động</h2>

      {error && (
        <div className="mb-3 border border-[#f4c7c3] bg-[#fce8e6] px-3 py-2 text-sm text-[#c5221f]">
          {error}
        </div>
      )}

      {(booking.status === 'pending_hold' || booking.status === 'payment_mismatch') && (
        <button
          disabled={loading}
          onClick={() => callApi('/api/bookings/confirm', { bookingId: booking.id })}
          className={`${buttonBase} mb-2 w-full border-[#1a73e8] bg-[#1a73e8] text-white hover:bg-[#1765cc]`}
        >
          Xác nhận đã nhận đủ tiền
        </button>
      )}

      {booking.status === 'payment_mismatch' && (
        <button
          disabled={loading}
          onClick={() =>
            callApi('/api/bookings/mark-mismatch-resolved', {
              bookingId: booking.id,
              reason: 'Khách không bổ sung đủ tiền, nhân viên huỷ giữ chỗ',
            })
          }
          className={`${buttonBase} mb-2 w-full border-[#f4c7c3] bg-white text-[#c5221f] hover:bg-[#fce8e6]`}
        >
          Khách không bổ sung tiền — huỷ giữ chỗ
        </button>
      )}

      {(booking.status === 'pending_hold' || booking.status === 'confirmed') && (
        <>
          {!showCancelForm ? (
            <button
              disabled={loading}
              onClick={() => setShowCancelForm(true)}
              className={`${buttonBase} w-full border-[#dadce0] bg-white text-[#3c4043] hover:bg-[#f8fafd]`}
            >
              Huỷ booking
            </button>
          ) : (
            <div className="border border-[#dadce0] bg-white p-3">
              <label className="mb-1 block text-xs font-medium text-[#5f6368]">
                Lý do huỷ (tuỳ chọn)
              </label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="mb-2 w-full border border-[#dadce0] bg-white p-2 text-sm"
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
                  className={`${buttonBase} flex-1 border-[#202124] bg-[#202124] text-white hover:bg-black`}
                >
                  {booking.status === 'confirmed'
                    ? 'Gửi yêu cầu huỷ (chờ duyệt hoàn tiền)'
                    : 'Xác nhận huỷ'}
                </button>
                <button
                  onClick={() => setShowCancelForm(false)}
                  className={`${buttonBase} border-[#dadce0] bg-white text-[#5f6368] hover:bg-[#f8fafd]`}
                >
                  Đóng
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {booking.status === 'cancel_requested' && (
        <>
          {!showRefundForm ? (
            <button
              disabled={loading}
              onClick={() => setShowRefundForm(true)}
              className={`${buttonBase} w-full border-[#1a73e8] bg-[#1a73e8] text-white hover:bg-[#1765cc]`}
            >
              Duyệt hoàn tiền
            </button>
          ) : (
            <div className="border border-[#dadce0] bg-white p-3">
              <label className="mb-1 block text-xs font-medium text-[#5f6368]">
                Phần trăm hoàn tiền theo chính sách
              </label>
              <div className="mb-2 flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={refundPercent}
                  onChange={(e) => setRefundPercent(Number(e.target.value))}
                  className="w-20 border border-[#dadce0] bg-white p-2 text-sm"
                />
                <span className="text-sm text-[#5f6368]">
                  % của {(booking.amount_paid ?? 0).toLocaleString('vi-VN')}đ ={' '}
                  <strong className="text-[#202124]">
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
                  className={`${buttonBase} flex-1 border-[#1a73e8] bg-[#1a73e8] text-white hover:bg-[#1765cc]`}
                >
                  Xác nhận hoàn {refundPercent}%
                </button>
                <button
                  onClick={() => setShowRefundForm(false)}
                  className={`${buttonBase} border-[#dadce0] bg-white text-[#5f6368] hover:bg-[#f8fafd]`}
                >
                  Đóng
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {['expired', 'cancelled', 'refunded'].includes(booking.status) && (
        <p className="text-sm text-[#5f6368]">
          Booking này đã kết thúc vòng đời, không còn hành động nào khả dụng.
        </p>
      )}
    </div>
  )
}
