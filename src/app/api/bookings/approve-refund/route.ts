import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'

// API route: nhân viên duyệt hoàn tiền cho booking đang ở trạng thái
// 'cancel_requested'. Nhân viên nhập refundPercent (theo chính sách 7
// ngày/3 ngày), hệ thống tự tính refund_amount = amount_paid * percent/100.
export async function POST(req: NextRequest) {
  const { bookingId, refundPercent } = await req.json()

  if (!bookingId || refundPercent === undefined) {
    return NextResponse.json({ error: 'Thiếu bookingId hoặc refundPercent' }, { status: 400 })
  }

  if (refundPercent < 0 || refundPercent > 100) {
    return NextResponse.json({ error: 'refundPercent phải trong khoảng 0-100' }, { status: 400 })
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

  if (booking.status !== 'cancel_requested') {
    return NextResponse.json(
      {
        error: `Booking đang ở trạng thái "${booking.status}", không phải đang chờ duyệt huỷ.`,
        currentStatus: booking.status,
      },
      { status: 409 }
    )
  }

  const amountPaid = booking.amount_paid ?? 0
  const refundAmount = Math.round((amountPaid * refundPercent) / 100)

  const { data: updated, error: updateError } = await supabase
    .from('bookings')
    .update({
      status: 'refunded',
      refund_percent: refundPercent,
      refund_amount: refundAmount,
    })
    .eq('id', bookingId)
    .eq('status', 'cancel_requested')
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
