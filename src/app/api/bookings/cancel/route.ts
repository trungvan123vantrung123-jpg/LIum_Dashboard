import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'

// API route: huỷ booking. Có 2 nhánh khác nhau tuỳ trạng thái hiện tại,
// đúng theo 2 case đã phân tích trong thiết kế nghiệp vụ:
//
// - Nếu đang 'pending_hold' hoặc 'payment_submitted' (chưa được nhân viên
//   xác nhận cuối cùng) -> huỷ thẳng luôn thành 'cancelled', không cần
//   qua bước duyệt hoàn tiền (vì nhân viên chưa từng xác nhận booking
//   này là thật, kể cả khi khách đã lỡ chuyển khoản — trường hợp đó xử
//   lý hoàn tiền tay ngoài hệ thống, không thuộc phạm vi 'refunded').
// - Nếu đang 'confirmed' (nhân viên đã xác nhận, coi như giao dịch chính
//   thức) -> KHÔNG huỷ thẳng. Chuyển sang 'cancel_requested' để chờ
//   nhân viên khác (hoặc quản lý) duyệt hoàn tiền riêng qua API
//   approve-refund. Đây là chỗ tách quyền: người xem yêu cầu huỷ không
//   tự động là người quyết định hoàn bao nhiêu %.
export async function POST(req: NextRequest) {
  const { bookingId, reason } = await req.json()

  if (!bookingId) {
    return NextResponse.json({ error: 'Thiếu bookingId' }, { status: 400 })
  }

  const supabase = createServiceClient()

  const { data: booking, error: fetchError } = await supabase
    .from('bookings')
    .select('*')
    .eq('id', bookingId)
    .single()

  if (fetchError || !booking) {
    return NextResponse.json({ error: 'Không tìm thấy booking' }, { status: 404 })
  }

  if (booking.status === 'pending_hold' || booking.status === 'payment_submitted') {
    const { data: updated, error: updateError } = await supabase
      .from('bookings')
      .update({ status: 'cancelled', cancel_reason: reason ?? null })
      .eq('id', bookingId)
      .in('status', ['pending_hold', 'payment_submitted'])
      .select()
      .single()

    if (updateError || !updated) {
      return NextResponse.json(
        { error: 'Booking đã đổi trạng thái, vui lòng tải lại trang' },
        { status: 409 }
      )
    }

    return NextResponse.json({ success: true, booking: updated, action: 'cancelled_directly' })
  }

  if (booking.status === 'confirmed') {
    const { data: updated, error: updateError } = await supabase
      .from('bookings')
      .update({ status: 'cancel_requested', cancel_reason: reason ?? null })
      .eq('id', bookingId)
      .eq('status', 'confirmed')
      .select()
      .single()

    if (updateError || !updated) {
      return NextResponse.json(
        { error: 'Booking đã đổi trạng thái, vui lòng tải lại trang' },
        { status: 409 }
      )
    }

    return NextResponse.json({
      success: true,
      booking: updated,
      action: 'moved_to_cancel_requested',
    })
  }

  return NextResponse.json(
    {
      error: `Booking đang ở trạng thái "${booking.status}", không thể huỷ từ đây.`,
      currentStatus: booking.status,
    },
    { status: 409 }
  )
}
