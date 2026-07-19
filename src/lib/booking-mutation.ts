import 'server-only'

import { ApiError } from '@/lib/api'

export interface BookingMutationInput {
  resourceId: string
  checkIn: string
  checkOut: string
  customerName: string
  customerPhone: string
  adultCount: number
  childCount: number
  petCount: number
  roomBasePrice: number
  extraGuestFee: number
  petFee: number
  outsideFoodFee: number
  otherFees: number
  depositPercent: number
  notes: string | null
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

function text(value: unknown, label: string, max: number, required = true) {
  if (typeof value !== 'string') throw new ApiError(400, `${label} không hợp lệ`, 'INVALID_FIELD')
  const result = value.trim()
  if ((required && !result) || result.length > max) {
    throw new ApiError(400, `${label} ${required ? 'là bắt buộc và ' : ''}tối đa ${max} ký tự`, 'INVALID_FIELD')
  }
  return result
}

function integer(value: unknown, label: string, min: number, max: number) {
  if (!Number.isInteger(value) || (value as number) < min || (value as number) > max) {
    throw new ApiError(400, `${label} phải là số nguyên từ ${min} đến ${max}`, 'INVALID_FIELD')
  }
  return value as number
}

function money(value: unknown, label: string, max = 1_000_000_000) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > max) {
    throw new ApiError(400, `${label} không hợp lệ`, 'INVALID_FIELD')
  }
  return Math.round(value)
}

function parseCalendarDate(value: string, label: string) {
  if (!DATE_PATTERN.test(value)) throw new ApiError(400, `${label} không hợp lệ`, 'INVALID_DATE_RANGE')
  const [year, month, day] = value.split('-').map(Number)
  const timestamp = Date.UTC(year, month - 1, day)
  const parsed = new Date(timestamp)
  if (parsed.getUTCFullYear() !== year || parsed.getUTCMonth() !== month - 1 || parsed.getUTCDate() !== day) {
    throw new ApiError(400, `${label} không tồn tại`, 'INVALID_DATE_RANGE')
  }
  return timestamp
}

export function parseBookingMutation(body: Record<string, unknown>): BookingMutationInput {
  const resourceId = text(body.resourceId, 'Phòng', 36)
  if (!UUID_PATTERN.test(resourceId)) throw new ApiError(400, 'Phòng không hợp lệ', 'INVALID_RESOURCE')

  const checkIn = text(body.checkIn, 'Ngày nhận phòng', 10)
  const checkOut = text(body.checkOut, 'Ngày trả phòng', 10)
  const checkInTime = parseCalendarDate(checkIn, 'Ngày nhận phòng')
  const checkOutTime = parseCalendarDate(checkOut, 'Ngày trả phòng')
  const stayDays = (checkOutTime - checkInTime) / 86_400_000
  if (stayDays < 1 || stayDays > 90) {
    throw new ApiError(400, 'Thời gian lưu trú phải từ 1 đến 90 đêm', 'INVALID_DATE_RANGE')
  }

  return {
    resourceId,
    checkIn,
    checkOut,
    customerName: text(body.customerName, 'Tên khách', 120),
    customerPhone: text(body.customerPhone, 'Số điện thoại', 30),
    adultCount: integer(body.adultCount, 'Số người lớn', 1, 100),
    childCount: integer(body.childCount, 'Số trẻ em', 0, 100),
    petCount: integer(body.petCount, 'Số thú cưng', 0, 20),
    roomBasePrice: money(body.roomBasePrice, 'Giá phòng'),
    extraGuestFee: money(body.extraGuestFee, 'Phụ thu khách'),
    petFee: money(body.petFee, 'Phụ thu thú cưng'),
    outsideFoodFee: money(body.outsideFoodFee, 'Phụ thu đồ ăn'),
    otherFees: money(body.otherFees, 'Phụ phí khác'),
    depositPercent: integer(body.depositPercent, 'Phần trăm cọc', 0, 100),
    notes: text(body.notes ?? '', 'Ghi chú', 2000, false) || null,
  }
}

export function toBookingRow(input: BookingMutationInput) {
  const totalAmount = input.roomBasePrice + input.extraGuestFee + input.petFee + input.outsideFoodFee + input.otherFees
  return {
    resource_id: input.resourceId,
    booking_type: 'stay' as const,
    check_in: input.checkIn,
    check_out: input.checkOut,
    customer_name: input.customerName,
    customer_phone: input.customerPhone,
    adult_count: input.adultCount,
    child_count: input.childCount,
    pet_count: input.petCount,
    room_base_price: input.roomBasePrice,
    extra_guest_fee: input.extraGuestFee,
    pet_fee: input.petFee,
    outside_food_fee: input.outsideFoodFee,
    other_fees: input.otherFees,
    total_amount: totalAmount,
    deposit_percent: input.depositPercent,
    amount_due: Math.round(totalAmount * input.depositPercent / 100),
    notes: input.notes,
  }
}

export function isBookingConflict(error: { code?: string; message?: string } | null) {
  return error?.code === '23P01' || Boolean(error?.message?.toLowerCase().includes('overlap'))
}
