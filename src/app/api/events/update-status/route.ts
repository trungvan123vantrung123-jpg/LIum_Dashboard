import { apiFailure, apiSuccess, ApiError, getRequestId, optionalText, readJsonObject, requireUuid } from '@/lib/api'
import { requireSameOrigin } from '@/lib/security'
import { createServiceClient } from '@/lib/supabase-server'
import type { EventInquiryStatus } from '@/types/database'

const VALID_STATUSES: EventInquiryStatus[] = ['new_lead', 'contacted', 'quoted', 'confirmed', 'lost']

export async function POST(request: Request) {
  const requestId = getRequestId(request)
  try {
    requireSameOrigin(request)
    const body = await readJsonObject(request)
    const inquiryId = requireUuid(body.inquiryId, 'inquiryId')
    const status = body.status
    if (typeof status !== 'string' || !VALID_STATUSES.includes(status as EventInquiryStatus)) {
      throw new ApiError(400, 'Trạng thái không hợp lệ', 'INVALID_STATUS')
    }
    const expectedUpdatedAt = typeof body.expectedUpdatedAt === 'string' ? body.expectedUpdatedAt : ''
    if (!expectedUpdatedAt) throw new ApiError(400, 'Thiếu phiên bản lead', 'MISSING_VERSION')
    const assignedStaff = optionalText(body.assignedStaff, 'Nhân viên phụ trách', 120)
    const notes = optionalText(body.notes, 'Ghi chú', 2000)
    const supabase = createServiceClient()
    const { data, error } = await supabase.from('event_inquiries')
      .update({ status, ...(body.assignedStaff !== undefined ? { assigned_staff: assignedStaff } : {}), ...(body.notes !== undefined ? { notes } : {}) })
      .eq('id', inquiryId).eq('updated_at', expectedUpdatedAt)
      .select('id, status, updated_at').maybeSingle()
    if (error) throw error
    if (!data) throw new ApiError(409, 'Lead vừa được nhân viên khác cập nhật', 'STALE_INQUIRY')
    return apiSuccess(requestId, { inquiry: data })
  } catch (error) {
    return apiFailure(error, requestId)
  }
}
