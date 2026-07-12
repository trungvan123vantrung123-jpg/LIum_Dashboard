import { EventStatusSelect } from '@/components/EventStatusSelect'
import { createServiceClient } from '@/lib/supabase-server'
import { EVENT_STATUS_LABEL } from '@/types/database'
import type { EventInquiry, EventInquiryStatus } from '@/types/database'

export const dynamic = 'force-dynamic'

const PIPELINE_ORDER: EventInquiryStatus[] = ['new_lead', 'contacted', 'quoted', 'confirmed', 'lost']

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
  const grouped = PIPELINE_ORDER.map((status) => ({ status, items: inquiries.filter((i) => i.status === status) }))

  return (
    <div className="app-container py-6">
      <header className="mb-5 border-b border-[#dadce0] pb-5">
        <h1 className="page-title">Sự kiện</h1>
        <p className="page-description mt-1">Lead khách quan tâm tổ chức sự kiện, theo dõi theo từng bước xử lý.</p>
      </header>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-5">
        {grouped.map(({ status, items }) => (
          <section key={status} className="surface min-h-[240px] bg-white">
            <div className="flex items-center justify-between border-b border-[#dadce0] bg-[#f8fafd] px-3 py-2.5">
              <h2 className="text-xs font-medium uppercase tracking-[0.04em] text-[#5f6368]">{EVENT_STATUS_LABEL[status]}</h2>
              <span className="text-xs font-medium text-[#202124]">{items.length}</span>
            </div>

            <div className="space-y-2 p-2">
              {items.length === 0 && <p className="px-2 py-6 text-center text-xs text-[#9aa0a6]">Không có lead</p>}
              {items.map((item) => (
                <article key={item.id} className="border border-[#e8eaed] bg-white p-3">
                  <div className="mb-1 text-xs font-medium text-[#1a73e8]">{item.inquiry_code}</div>
                  <div className="mb-1 text-sm font-medium text-[#202124]">{item.event_type}</div>
                  <div className="mb-1 text-xs text-[#5f6368]">{item.customer_name} — {item.customer_phone}</div>
                  {item.guest_count && (
                    <div className="mb-3 text-xs text-[#5f6368]">
                      {item.guest_count} khách{item.proposed_start && ` — ${formatDate(item.proposed_start)}`}
                    </div>
                  )}
                  <EventStatusSelect inquiryId={item.id} currentStatus={item.status} />
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })
}
