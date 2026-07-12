import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'

// API route: khi booking đang 'payment_mismatch', nhân viên có 2 lựa chọn:
// 1. Xác nhận luôn (dùng chung API /api/bookings/confirm — coi như đã khớp)
// 2. Huỷ giữ chỗ vì khách thực sự không chuyển đủ tiền và không bổ sung
//    -> route này xử lý lựa chọn thứ 2, chuyển thẳng sang 'cancelled'
//    để nhả slot ngay cho khách khác, không cần qua 'cancel_requested'
//    vì bản chất đây chưa phải booking đã thanh toán đủ.
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

  if (booking.status !== 'payment_mismatch') {
    return NextResponse.json(
      {
        error: `Booking đang ở trạng thái "${booking.status}", không phải lệch tiền.`,
        currentStatus: booking.status,
      },
      { status: 409 }
    )
  }

  const { data: updated, error: updateError } = await supabase
    .from('bookings')
    .update({
      status: 'cancelled',
      cancel_reason: reason ?? 'Khách chuyển thiếu tiền và không bổ sung, nhân viên huỷ giữ chỗ',
    })
    .eq('id', bookingId)
    .eq('status', 'payment_mismatch')
    .select()
    .single()

  if (updateError || !updated) {
    return NextResponse.json(
      { error: 'Có người khác vừa xử lý booking này, vui lòng tải lại trang' },
      { status: 409 }
    )
  }

  return NextResponse.json({ success: true, booking: updated })
}
