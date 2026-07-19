import { apiFailure, apiSuccess, ApiError, getRequestId, optionalText, readJsonObject, requireUuid } from '@/lib/api'
import { requireSameOrigin } from '@/lib/security'
import { createServiceClient } from '@/lib/supabase-server'

export async function POST(request: Request) {
  const requestId = getRequestId(request)
  try {
    requireSameOrigin(request)
    const body = await readJsonObject(request)
    const bookingId = requireUuid(body.bookingId, 'bookingId')
    const reason = optionalText(body.reason, 'Lý do huỷ', 1000)
    const supabase = createServiceClient()

    const { data: booking } = await supabase.from('bookings')
      .select('status, amount_paid, payment_screenshot_url, payment_transaction_id')
      .eq('id', bookingId).maybeSingle()
    if (!booking) throw new ApiError(404, 'Không tìm thấy booking', 'BOOKING_NOT_FOUND')

    const hasPaymentSignal = (booking.amount_paid ?? 0) > 0 || Boolean(booking.payment_screenshot_url || booking.payment_transaction_id)
    const directCancellation = booking.status === 'pending_hold' && !hasPaymentSignal
    const requiresReview = booking.status === 'confirmed' || booking.status === 'payment_submitted' || hasPaymentSignal
    if (!directCancellation && !requiresReview) {
      throw new ApiError(409, `Booking đang ở trạng thái "${booking.status}", không thể huỷ`, 'INVALID_TRANSITION')
    }

    const nextStatus = directCancellation ? 'cancelled' : 'cancel_requested'
    const allowedStatuses = directCancellation ? ['pending_hold'] : ['pending_hold', 'payment_submitted', 'confirmed']
    const { data, error } = await supabase.from('bookings')
      .update({ status: nextStatus, cancel_reason: reason })
      .eq('id', bookingId).in('status', allowedStatuses)
      .select('id, booking_code, status, updated_at').maybeSingle()
    if (error) throw error
    if (!data) throw new ApiError(409, 'Booking vừa được người khác xử lý', 'STALE_BOOKING')
    return apiSuccess(requestId, { booking: data, action: directCancellation ? 'cancelled_directly' : 'moved_to_cancel_requested' })
  } catch (error) {
    return apiFailure(error, requestId)
  }
}
