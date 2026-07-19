import { apiFailure, apiSuccess, ApiError, getRequestId, readJsonObject, requireUuid } from '@/lib/api'
import { isBookingConflict, parseBookingMutation, toBookingRow } from '@/lib/booking-mutation'
import { requireSameOrigin } from '@/lib/security'
import { createServiceClient } from '@/lib/supabase-server'

const EDITABLE_STATUSES = ['pending_hold', 'payment_submitted', 'payment_mismatch']
const SCHEDULE_FIELDS = ['resourceId', 'checkIn', 'checkOut', 'roomBasePrice', 'extraGuestFee', 'petFee', 'outsideFoodFee', 'otherFees', 'depositPercent'] as const

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const requestId = getRequestId(request)
  try {
    requireSameOrigin(request)
    const { id } = await params
    requireUuid(id, 'bookingId')
    const body = await readJsonObject(request)
    const expectedUpdatedAt = typeof body.expectedUpdatedAt === 'string' ? body.expectedUpdatedAt : ''
    if (!expectedUpdatedAt) throw new ApiError(400, 'Thiếu phiên bản booking', 'MISSING_VERSION')
    const input = parseBookingMutation(body)
    const supabase = createServiceClient()

    const { data: current } = await supabase
      .from('bookings')
      .select('status, resource_id, check_in, check_out, room_base_price, extra_guest_fee, pet_fee, outside_food_fee, other_fees, deposit_percent')
      .eq('id', id)
      .maybeSingle()
    if (!current) throw new ApiError(404, 'Không tìm thấy booking', 'BOOKING_NOT_FOUND')
    if (!EDITABLE_STATUSES.includes(current.status)) {
      throw new ApiError(409, 'Booking ở trạng thái này không thể chỉnh sửa bằng form thông thường', 'BOOKING_LOCKED')
    }
    if (current.status !== 'pending_hold') {
      const previous = [current.resource_id, current.check_in, current.check_out, current.room_base_price, current.extra_guest_fee, current.pet_fee, current.outside_food_fee, current.other_fees, current.deposit_percent]
      const next = SCHEDULE_FIELDS.map((field) => input[field])
      if (previous.some((value, index) => value !== next[index])) {
        throw new ApiError(409, 'Không thể đổi phòng, ngày hoặc giá sau khi khách đã gửi thanh toán', 'SENSITIVE_FIELDS_LOCKED')
      }
    }

    const { data: resource } = await supabase.from('resources').select('id').eq('id', input.resourceId).eq('resource_type', 'room').eq('is_active', true).maybeSingle()
    if (!resource) throw new ApiError(400, 'Phòng không tồn tại hoặc đã ngừng hoạt động', 'INVALID_RESOURCE')

    const { data, error } = await supabase
      .from('bookings')
      .update(toBookingRow(input))
      .eq('id', id)
      .eq('updated_at', expectedUpdatedAt)
      .in('status', EDITABLE_STATUSES)
      .select('id, updated_at')
      .maybeSingle()

    if (isBookingConflict(error)) throw new ApiError(409, 'Phòng vừa được giữ trong khoảng ngày này. Dữ liệu chưa được thay đổi.', 'BOOKING_CONFLICT')
    if (error) throw error
    if (!data) throw new ApiError(409, 'Booking đã được bot hoặc nhân viên khác cập nhật. Hãy tải lại trước khi sửa.', 'STALE_BOOKING')
    return apiSuccess(requestId, { booking: data })
  } catch (error) {
    return apiFailure(error, requestId)
  }
}
