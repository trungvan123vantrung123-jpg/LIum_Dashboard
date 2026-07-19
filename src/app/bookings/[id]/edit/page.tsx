import { BookingForm } from '@/components/BookingForm'
import { createServiceClient } from '@/lib/supabase-server'
import type { Booking, Resource } from '@/types/database'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function EditBookingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createServiceClient()
  const [{ data: booking }, { data: resources }] = await Promise.all([
    supabase.from('bookings').select('*').eq('id', id).single(),
    supabase.from('resources').select('*').eq('resource_type', 'room').eq('is_active', true).order('code'),
  ])
  if (!booking) notFound()
  return <main className="app-container max-w-[960px] py-7">
    <Link href={`/bookings/${id}`} className="mb-5 inline-flex items-center gap-1.5 text-sm text-[#5f6368] hover:text-[#202124]"><ArrowLeft size={16}/> Quay lại chi tiết</Link>
    <header className="mb-6 border-b border-[#dadce0] pb-5"><h1 className="page-title">Chỉnh sửa {booking.booking_code}</h1><p className="page-description mt-1">Chỉ sửa thông tin vận hành. Xác nhận tiền, huỷ và hoàn tiền vẫn dùng luồng kiểm duyệt riêng.</p></header>
    <BookingForm booking={booking as Booking} resources={(resources ?? []) as Resource[]}/>
  </main>
}
