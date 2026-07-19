import { BookingForm } from '@/components/BookingForm'
import { createServiceClient } from '@/lib/supabase-server'
import type { Resource } from '@/types/database'
import { ArrowLeft, Sparkles } from 'lucide-react'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function NewBookingPage({ searchParams }: { searchParams: Promise<{ resourceId?: string; date?: string }> }) {
  const params = await searchParams
  const { data } = await createServiceClient().from('resources').select('*').eq('resource_type', 'room').eq('is_active', true).order('code')
  return <main className="app-container max-w-[960px] py-7">
    <Link href="/bookings" className="mb-5 inline-flex items-center gap-1.5 text-sm text-[#5f6368] hover:text-[#202124]"><ArrowLeft size={16}/> Quay lại booking</Link>
    <header className="mb-6 overflow-hidden rounded-2xl border border-[#d2e3fc] bg-gradient-to-br from-[#e8f0fe] via-white to-[#f3e8ff] px-6 py-6 shadow-sm">
      <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-[#174ea6]"><Sparkles size={14}/> Luồng chăm sóc từ nhân viên</div>
      <h1 className="text-2xl font-semibold tracking-tight text-[#202124]">Tạo booking thủ công</h1>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-[#5f6368]">Dùng cho khách gọi điện, walk-in hoặc nhân viên trực tiếp tư vấn. Booking sẽ vào cùng nguồn dữ liệu với chatbot.</p>
    </header>
    <BookingForm resources={(data ?? []) as Resource[]} presetResourceId={params.resourceId} presetCheckIn={params.date}/>
  </main>
}
