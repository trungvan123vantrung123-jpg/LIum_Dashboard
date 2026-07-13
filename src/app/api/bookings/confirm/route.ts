import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'

// API route: nhân viên xác nhận booking sau khi xem ảnh chuyển khoản.
// Áp dụng đúng logic đã thiết kế ở WF3: PHẢI đọc lại status hiện tại
// trước khi ghi đè, vì slot có thể đã bị cron tự động expire trong lúc
// nhân viên đang xem xét — không bao giờ tự ý ghi đè 'confirmed' lên
// một booking đã 'expired'.
//
// LƯU Ý QUAN TRỌNG: chỉ cho phép xác nhận từ 'payment_submitted' (khách
// đã gửi ảnh CK) hoặc 'payment_mismatch' (NV xem lại thấy thực ra khớp).
// KHÔNG còn cho phép xác nhận trực tiếp từ 'pending_hold' nữa — vì
// 'pending_hold' giờ chỉ có nghĩa "chưa có gì để xác nhận" (khách chưa
// gửi ảnh CK). Việc tách 2 trạng thái này giúp nhân viên phân biệt rõ
// "đang chờ khách chuyển khoản" và "khách đã chuyển, đang chờ mình duyệt".
export async function POST(req: NextRequest) {
  const { bookingId } = await req.json()

  if (!bookingId) {
    return NextResponse.json({ error: 'Thiếu bookingId' }, { status: 400 })
  }

  const supabase = createServiceClient()

  // Bước 1: đọc lại trạng thái MỚI NHẤT — không tin trạng thái hiển thị trên UI
  const { data: booking, error: fetchError } = await supabase
    .from('bookings')
    .select('*')
    .eq('id', bookingId)
    .single()

  if (fetchError || !booking) {
    return NextResponse.json({ error: 'Không tìm thấy booking' }, { status: 404 })
  }

  // Bước 2: chỉ cho phép xác nhận khi đang payment_submitted hoặc payment_mismatch
  if (booking.status !== 'payment_submitted' && booking.status !== 'payment_mismatch') {
    return NextResponse.json(
      {
        error: `Booking hiện đang ở trạng thái "${booking.status}", không thể xác nhận. Có thể chưa có ảnh chuyển khoản, đã hết hạn giữ chỗ, hoặc đã được xử lý trước đó.`,
        currentStatus: booking.status,
      },
      { status: 409 }
    )
  }

  // Bước 3: ghi đè có điều kiện — dùng .eq('status', ...) ngay trong câu UPDATE
  // để Postgres tự đảm bảo atomic, tránh 2 nhân viên cùng bấm xác nhận 1 lúc
  const { data: updated, error: updateError } = await supabase
    .from('bookings')
    .update({ status: 'confirmed' })
    .eq('id', bookingId)
    .in('status', ['payment_submitted', 'payment_mismatch'])
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
