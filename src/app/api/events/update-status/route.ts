import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import type { EventInquiryStatus } from '@/types/database'

// API route: cập nhật trạng thái lead sự kiện. Đơn giản hơn nhiều so với
// booking vì event_inquiries KHÔNG có constraint chống trùng — đây là
// bảng vận hành thủ công thuần tuý, không cần kiểm tra race condition.
const VALID_STATUSES: EventInquiryStatus[] = [
  'new_lead',
  'contacted',
  'quoted',
  'confirmed',
  'lost',
]

export async function POST(req: NextRequest) {
  const { inquiryId, status, assignedStaff, notes } = await req.json()

  if (!inquiryId || !status) {
    return NextResponse.json({ error: 'Thiếu inquiryId hoặc status' }, { status: 400 })
  }

  if (!VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: 'Trạng thái không hợp lệ' }, { status: 400 })
  }

  const supabase = createServiceClient()

  const updatePayload: Record<string, unknown> = { status }
  if (assignedStaff !== undefined) updatePayload.assigned_staff = assignedStaff
  if (notes !== undefined) updatePayload.notes = notes

  const { data: updated, error } = await supabase
    .from('event_inquiries')
    .update(updatePayload)
    .eq('id', inquiryId)
    .select()
    .single()

  if (error || !updated) {
    return NextResponse.json({ error: 'Không cập nhật được lead' }, { status: 500 })
  }

  return NextResponse.json({ success: true, inquiry: updated })
}
