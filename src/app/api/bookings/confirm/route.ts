import { apiFailure, apiSuccess, ApiError, getRequestId, readJsonObject, requireUuid } from '@/lib/api'
import { requireSameOrigin } from '@/lib/security'
import { createServiceClient } from '@/lib/supabase-server'

export async function POST(request: Request) {
  const requestId = getRequestId(request)
  try {
    requireSameOrigin(request)
    const body = await readJsonObject(request)
    const bookingId = requireUuid(body.bookingId, 'bookingId')
    const supabase = createServiceClient()

    const { data: booking } = await supabase
      .from('bookings')
      .select('status, payment_screenshot_url, payment_transaction_id, amount_paid')
      .eq('id', bookingId)
      .maybeSingle()
    if (!booking) throw new ApiError(404, 'Không tìm thấy booking', 'BOOKING_NOT_FOUND')
    if (!['payment_submitted', 'payment_mismatch'].includes(booking.status)) {
      throw new ApiError(409, `Booking đang ở trạng thái "${booking.status}", không thể xác nhận`, 'INVALID_TRANSITION')
    }
    if (!booking.payment_screenshot_url && !booking.payment_transaction_id && !(booking.amount_paid > 0)) {
      throw new ApiError(409, 'Booking chưa có bằng chứng hoặc số tiền thanh toán để xác nhận', 'MISSING_PAYMENT_EVIDENCE')
    }

    const { data, error } = await supabase.from('bookings')
      .update({ status: 'confirmed' })
      .eq('id', bookingId)
      .in('status', ['payment_submitted', 'payment_mismatch'])
      .select('id, booking_code, status, updated_at')
      .maybeSingle()
    if (error) throw error
    if (!data) throw new ApiError(409, 'Booking vừa được người khác xử lý', 'STALE_BOOKING')
    return apiSuccess(requestId, { booking: data })
  } catch (error) {
    return apiFailure(error, requestId)
  }
}
