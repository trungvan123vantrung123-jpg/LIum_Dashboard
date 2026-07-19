import { apiFailure, apiSuccess, ApiError, getRequestId, readJsonObject, requireFiniteNumber, requireUuid } from '@/lib/api'
import { requireSameOrigin } from '@/lib/security'
import { createServiceClient } from '@/lib/supabase-server'

export async function POST(request: Request) {
  const requestId = getRequestId(request)
  try {
    requireSameOrigin(request)
    const body = await readJsonObject(request)
    const bookingId = requireUuid(body.bookingId, 'bookingId')
    const refundPercent = requireFiniteNumber(body.refundPercent, 'refundPercent', 0, 100)
    if (!Number.isInteger(refundPercent)) throw new ApiError(400, 'refundPercent phải là số nguyên', 'INVALID_REFUND_PERCENT')
    const supabase = createServiceClient()

    const { data: booking } = await supabase.from('bookings').select('status, amount_paid').eq('id', bookingId).maybeSingle()
    if (!booking) throw new ApiError(404, 'Không tìm thấy booking', 'BOOKING_NOT_FOUND')
    if (booking.status !== 'cancel_requested') throw new ApiError(409, 'Booking không ở trạng thái chờ duyệt huỷ', 'INVALID_TRANSITION')
    const refundAmount = Math.round(((booking.amount_paid ?? 0) * refundPercent) / 100)

    const { data, error } = await supabase.from('bookings')
      .update({ status: 'refunded', refund_percent: refundPercent, refund_amount: refundAmount })
      .eq('id', bookingId).eq('status', 'cancel_requested')
      .select('id, booking_code, status, refund_percent, refund_amount, updated_at').maybeSingle()
    if (error) throw error
    if (!data) throw new ApiError(409, 'Booking vừa được người khác xử lý', 'STALE_BOOKING')
    return apiSuccess(requestId, { booking: data })
  } catch (error) {
    return apiFailure(error, requestId)
  }
}
