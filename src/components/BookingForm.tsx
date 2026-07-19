'use client'

import type { Booking, Resource } from '@/types/database'
import { LoaderCircle, Save } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { FormEvent, useState } from 'react'

type Props = { resources: Resource[]; booking?: Booking; presetResourceId?: string; presetCheckIn?: string }

function numberValue(value: FormDataEntryValue | null) {
  const result = Number(value ?? 0)
  return Number.isFinite(result) ? result : 0
}

export function BookingForm({ resources, booking, presetResourceId, presetCheckIn }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError(null)
    const form = new FormData(event.currentTarget)
    const payload = {
      resourceId: form.get('resourceId'), checkIn: form.get('checkIn'), checkOut: form.get('checkOut'),
      customerName: form.get('customerName'), customerPhone: form.get('customerPhone'),
      adultCount: numberValue(form.get('adultCount')), childCount: numberValue(form.get('childCount')),
      petCount: numberValue(form.get('petCount')), roomBasePrice: numberValue(form.get('roomBasePrice')),
      extraGuestFee: numberValue(form.get('extraGuestFee')), petFee: numberValue(form.get('petFee')),
      outsideFoodFee: numberValue(form.get('outsideFoodFee')), otherFees: numberValue(form.get('otherFees')),
      depositPercent: numberValue(form.get('depositPercent')), notes: form.get('notes'),
      ...(booking ? { expectedUpdatedAt: booking.updated_at } : {}),
    }
    try {
      const response = await fetch(booking ? `/api/bookings/${booking.id}` : '/api/bookings', {
        method: booking ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error?.message ?? result.error ?? 'Không thể lưu booking')
      const id = booking?.id ?? result.data.booking.id
      router.push(`/bookings/${id}`)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể lưu booking')
      setLoading(false)
    }
  }

  const field = 'mt-1 w-full rounded-lg border border-[#dadce0] bg-white px-3 py-2.5 text-sm text-[#202124] shadow-sm transition focus:border-[#1a73e8] focus:ring-2 focus:ring-[#d2e3fc]'
  const label = 'text-xs font-semibold uppercase tracking-[0.05em] text-[#5f6368]'
  const tomorrow = presetCheckIn ? new Date(new Date(`${presetCheckIn}T00:00:00Z`).getTime() + 86400000).toISOString().slice(0, 10) : ''

  return <form onSubmit={submit} className="space-y-6">
    {error && <div role="alert" className="rounded-lg border border-[#f4c7c3] bg-[#fce8e6] px-4 py-3 text-sm text-[#b3261e]">{error}</div>}
    <section className="form-section"><div><h2 className="form-heading">Lịch lưu trú</h2><p className="form-hint">Hệ thống sẽ chặn nếu bot hoặc nhân viên khác vừa giữ cùng phòng.</p></div>
      <div className="grid gap-4 sm:grid-cols-3">
        <label className={label}>Phòng<select id="booking-resource" name="resourceId" required defaultValue={booking?.resource_id ?? presetResourceId ?? ''} className={field}><option value="" disabled>Chọn phòng</option>{resources.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}</select></label>
        <label className={label}>Nhận phòng<input id="booking-check-in" name="checkIn" type="date" required defaultValue={booking?.check_in ?? presetCheckIn ?? ''} className={field}/></label>
        <label className={label}>Trả phòng<input id="booking-check-out" name="checkOut" type="date" required defaultValue={booking?.check_out ?? tomorrow} className={field}/></label>
      </div>
    </section>
    <section className="form-section"><div><h2 className="form-heading">Khách hàng</h2><p className="form-hint">Booking do nhân viên tạo bắt đầu ở trạng thái giữ chỗ, không tự xác nhận thanh toán.</p></div>
      <div className="grid gap-4 sm:grid-cols-2"><label className={label}>Tên khách<input id="booking-customer-name" name="customerName" required maxLength={120} defaultValue={booking?.customer_name} className={field}/></label><label className={label}>Số điện thoại<input id="booking-customer-phone" name="customerPhone" required maxLength={30} defaultValue={booking?.customer_phone} className={field}/></label></div>
      <div className="grid gap-4 sm:grid-cols-3"><NumberField id="booking-adults" name="adultCount" label="Người lớn" min={1} value={booking?.adult_count ?? 1} css={field}/><NumberField id="booking-children" name="childCount" label="Trẻ em" min={0} value={booking?.child_count ?? 0} css={field}/><NumberField id="booking-pets" name="petCount" label="Thú cưng" min={0} value={booking?.pet_count ?? 0} css={field}/></div>
    </section>
    <section className="form-section"><div><h2 className="form-heading">Chi phí</h2><p className="form-hint">Tổng tiền và số cọc cần thu được tính lại phía máy chủ.</p></div>
      <div className="grid gap-4 sm:grid-cols-3"><NumberField id="booking-base-price" name="roomBasePrice" label="Giá phòng" min={0} value={booking?.room_base_price ?? 0} css={field}/><NumberField id="booking-extra-guest" name="extraGuestFee" label="Phụ thu khách" min={0} value={booking?.extra_guest_fee ?? 0} css={field}/><NumberField id="booking-pet-fee" name="petFee" label="Phụ thu thú cưng" min={0} value={booking?.pet_fee ?? 0} css={field}/><NumberField id="booking-food-fee" name="outsideFoodFee" label="Phụ thu đồ ăn" min={0} value={booking?.outside_food_fee ?? 0} css={field}/><NumberField id="booking-other-fees" name="otherFees" label="Phụ phí khác" min={0} value={booking?.other_fees ?? 0} css={field}/><NumberField id="booking-deposit" name="depositPercent" label="Cọc (%)" min={0} max={100} value={booking?.deposit_percent ?? 50} css={field}/></div>
      <label className={label}>Ghi chú<textarea id="booking-notes" name="notes" maxLength={2000} rows={4} defaultValue={booking?.notes ?? ''} className={field}/></label>
    </section>
    <div className="flex justify-end"><button id="booking-save" disabled={loading} className="inline-flex items-center gap-2 rounded-lg bg-[#1a73e8] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1765cc] disabled:opacity-60">{loading ? <LoaderCircle size={17} className="animate-spin"/> : <Save size={17}/>} {booking ? 'Lưu thay đổi' : 'Tạo booking'}</button></div>
  </form>
}

function NumberField({ id, name, label, min, max, value, css }: { id: string; name: string; label: string; min: number; max?: number; value: number; css: string }) {
  return <label className="text-xs font-semibold uppercase tracking-[0.05em] text-[#5f6368]">{label}<input id={id} name={name} type="number" min={min} max={max} required defaultValue={value} className={css}/></label>
}
