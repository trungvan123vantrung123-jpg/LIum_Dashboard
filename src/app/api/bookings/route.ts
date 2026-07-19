import { apiFailure, apiSuccess, ApiError, getRequestId, readJsonObject } from '@/lib/api'
import { isBookingConflict, parseBookingMutation, toBookingRow } from '@/lib/booking-mutation'
import { requireSameOrigin } from '@/lib/security'
import { createServiceClient } from '@/lib/supabase-server'

export async function POST(request: Request) {
  const requestId = getRequestId(request)
  try {
    requireSameOrigin(request)
    const input = parseBookingMutation(await readJsonObject(request))
    const supabase = createServiceClient()

    const { data: resource } = await supabase
      .from('resources')
      .select('id')
      .eq('id', input.resourceId)
      .eq('resource_type', 'room')
      .eq('is_active', true)
      .maybeSingle()
    if (!resource) throw new ApiError(400, 'Phòng không tồn tại hoặc đã ngừng hoạt động', 'INVALID_RESOURCE')

    const bookingCode = `STAFF-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`
    const { data, error } = await supabase
      .from('bookings')
      .insert({
        ...toBookingRow(input),
        booking_code: bookingCode,
        status: 'pending_hold',
        hold_expires_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
        customer_platform: 'staff',
        idempotency_key: `staff:${requestId}`,
      })
      .select('id, booking_code')
      .single()

    if (isBookingConflict(error)) throw new ApiError(409, 'Phòng vừa được giữ trong khoảng ngày này. Hãy chọn phòng hoặc ngày khác.', 'BOOKING_CONFLICT')
    if (error || !data) throw error ?? new Error('Insert failed')
    return apiSuccess(requestId, { booking: data }, 201)
  } catch (error) {
    return apiFailure(error, requestId)
  }
}
