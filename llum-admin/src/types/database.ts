// Types khớp chính xác với schema.sql đã thiết kế cho hệ thống Đồi Llum.
// Cập nhật file này ngay khi có ALTER TABLE mới bên Supabase, để tránh
// lệch giữa code và database thật.

export type ResourceType = 'room' | 'table'

export interface Resource {
  id: string
  resource_type: ResourceType
  code: string
  name: string
  area: string | null
  standard_capacity: number
  max_capacity: number
  requires_booking: boolean
  is_active: boolean
  metadata: Record<string, unknown>
  lark_record_id: string | null // còn sót lại từ thời dùng Lark, có thể bỏ dần
  created_at: string
}

export type BookingStatus =
  | 'pending_hold'
  | 'confirmed'
  | 'expired'
  | 'cancelled'
  | 'payment_mismatch'
  | 'cancel_requested'
  | 'refunded'

export type BookingType = 'stay' | 'dining'

export interface Booking {
  id: string
  booking_code: string
  resource_id: string
  booking_type: BookingType

  // Lưu trú
  check_in: string | null // date, dạng 'YYYY-MM-DD'
  check_out: string | null

  // Đặt bàn (hiện không dùng nữa vì đặt bàn xử lý thủ công, giữ lại cho tương lai)
  slot_start: string | null
  slot_end: string | null

  status: BookingStatus
  hold_expires_at: string | null // timestamptz

  customer_name: string
  customer_phone: string
  adult_count: number
  child_count: number
  pet_count: number
  customer_platform: string | null
  customer_psid: string | null

  room_base_price: number | null
  extra_guest_fee: number
  pet_fee: number
  outside_food_fee: number
  other_fees: number
  total_amount: number
  deposit_percent: number
  amount_due: number
  amount_paid: number | null
  payment_screenshot_url: string | null
  payment_transaction_id: string | null

  refund_percent: number | null
  refund_amount: number | null
  cancel_reason: string | null

  idempotency_key: string | null
  lark_record_id: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

// Booking kèm theo thông tin resource đã join sẵn — dùng cho hiển thị danh sách/calendar
export interface BookingWithResource extends Booking {
  resource: Resource
}

export type EventInquiryStatus =
  | 'new_lead'
  | 'contacted'
  | 'quoted'
  | 'confirmed'
  | 'lost'

export interface EventInquiry {
  id: string
  inquiry_code: string
  event_type: string
  proposed_start: string | null
  proposed_end: string | null
  guest_count: number | null
  special_requests: string | null
  customer_name: string
  customer_phone: string
  customer_platform: string | null
  customer_psid: string | null
  status: EventInquiryStatus
  assigned_staff: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

// Nhãn tiếng Việt cho từng trạng thái — dùng chung cho toàn bộ UI để nhất quán
export const BOOKING_STATUS_LABEL: Record<BookingStatus, string> = {
  pending_hold: 'Đang giữ chỗ',
  confirmed: 'Đã xác nhận',
  expired: 'Hết hạn',
  cancelled: 'Đã huỷ',
  payment_mismatch: 'Lệch tiền',
  cancel_requested: 'Chờ duyệt huỷ',
  refunded: 'Đã hoàn tiền',
}

// Màu tương ứng từng trạng thái — dùng class Tailwind, đồng bộ toàn bộ UI
export const BOOKING_STATUS_COLOR: Record<BookingStatus, string> = {
  pending_hold: 'bg-amber-100 text-amber-800 border-amber-200',
  confirmed: 'bg-green-100 text-green-800 border-green-200',
  expired: 'bg-gray-100 text-gray-600 border-gray-200',
  cancelled: 'bg-gray-200 text-gray-700 border-gray-300',
  payment_mismatch: 'bg-red-100 text-red-800 border-red-200',
  cancel_requested: 'bg-orange-100 text-orange-800 border-orange-200',
  refunded: 'bg-blue-100 text-blue-800 border-blue-200',
}

export const EVENT_STATUS_LABEL: Record<EventInquiryStatus, string> = {
  new_lead: 'Lead mới',
  contacted: 'Đã liên hệ',
  quoted: 'Đã báo giá',
  confirmed: 'Đã chốt',
  lost: 'Không chốt',
}
