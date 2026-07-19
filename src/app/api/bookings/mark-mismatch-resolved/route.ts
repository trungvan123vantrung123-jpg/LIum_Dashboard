import { apiFailure, apiSuccess, ApiError, getRequestId, optionalText, readJsonObject, requireUuid } from '@/lib/api'
import { requireSameOrigin } from '@/lib/security'
import { createServiceClient } from '@/lib/supabase-server'

export async function POST(request: Request) {
  const requestId = getRequestId(request)
  try {
    requireSameOrigin(request)
    const body = await readJsonObject(request)
    const bookingId = requireUuid(body.bookingId, 'bookingId')
    const reason = optionalText(body.reason, 'Lý do huỷ', 1000) ?? 'Khách chuyển thiếu tiền và không bổ sung, nhân viên huỷ giữ chỗ'
    const supabase = createServiceClient()
    const { data, error } = await supabase.from('bookings')
      .update({ status: 'cancelled', cancel_reason: reason })
      .eq('id', bookingId).eq('status', 'payment_mismatch')
      .select('id, booking_code, status, updated_at').maybeSingle()
    if (error) throw error
    if (!data) throw new ApiError(409, 'Booking không còn ở trạng thái lệch tiền', 'INVALID_TRANSITION')
    return apiSuccess(requestId, { booking: data })
  } catch (error) {
    return apiFailure(error, requestId)
  }
}
