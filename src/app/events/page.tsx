import { createServiceClient } from '@/lib/supabase-server'
import type { EventInquiry, EventInquiryStatus } from '@/types/database'
import { EVENT_STATUS_LABEL } from '@/types/database'
import { EventStatusSelect } from '@/components/EventStatusSelect'

export const dynamic = 'force-dynamic'

const PIPELINE_ORDER: EventInquiryStatus[] = [
  'new_lead',
  'contacted',
  'quoted',
  'confirmed',
  'lost',
]

async function getEventInquiries() {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('event_inquiries')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error(error)
    return []
  }
  return data as EventInquiry[]
}

export default async function EventsPage() {
  const inquiries = await getEventInquiries()

  const grouped = PIPELINE_ORDER.map((status) => ({
    status,
    items: inquiries.filter((i) => i.status === status),
  }))

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-lg font-medium text-gray-900 mb-1">Sự kiện</h1>
      <p className="text-sm text-gray-500 mb-5">
        Danh sách lead từ khách quan tâm tổ chức sự kiện, chờ nhân viên tư vấn
        báo giá riêng.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        {grouped.map(({ status, items }) => (
          <div key={status} className="bg-gray-50 rounded-lg p-3">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-medium text-gray-600">
                {EVENT_STATUS_LABEL[status]}
              </h2>
              <span className="text-xs text-gray-400">{items.length}</span>
            </div>

            <div className="flex flex-col gap-2">
              {items.length === 0 && (
                <p className="text-xs text-gray-400 italic">Không có lead</p>
              )}
              {items.map((item) => (
                <div key={item.id} className="bg-white border border-gray-200 rounded-lg p-3">
                  <div className="text-xs font-medium text-gray-900 mb-1">
                    {item.inquiry_code}
                  </div>
                  <div className="text-xs text-gray-600 mb-1">{item.event_type}</div>
                  <div className="text-xs text-gray-500 mb-1">
                    {item.customer_name} — {item.customer_phone}
                  </div>
                  {item.guest_count && (
                    <div className="text-xs text-gray-500 mb-2">
                      {item.guest_count} khách
                      {item.proposed_start && ` — ${formatDate(item.proposed_start)}`}
                    </div>
                  )}
                  <EventStatusSelect inquiryId={item.id} currentStatus={item.status} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })
}
