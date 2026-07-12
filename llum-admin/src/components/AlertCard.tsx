import Link from 'next/link'
import { ChevronRight, AlertTriangle, Clock, Hourglass } from 'lucide-react'

type Tone = 'danger' | 'warning' | 'muted'

const TONE_STYLES: Record<Tone, { bg: string; text: string; icon: React.ReactNode }> = {
  danger: {
    bg: 'bg-red-50',
    text: 'text-red-800',
    icon: <AlertTriangle size={18} className="text-red-600" />,
  },
  warning: {
    bg: 'bg-amber-50',
    text: 'text-amber-800',
    icon: <Clock size={18} className="text-amber-600" />,
  },
  muted: {
    bg: 'bg-gray-50',
    text: 'text-gray-700',
    icon: <Hourglass size={18} className="text-gray-500" />,
  },
}

interface AlertCardProps {
  tone: Tone
  title: string
  description: string
  href: string
}

// Thẻ cảnh báo dùng ở Dashboard, đại diện cho 1 việc "Human in the loop"
// đang chờ nhân viên xử lý — bấm vào để mở chi tiết booking.
export function AlertCard({ tone, title, description, href }: AlertCardProps) {
  const style = TONE_STYLES[tone]
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 rounded-lg px-3 py-2.5 ${style.bg} hover:opacity-90 transition`}
    >
      {style.icon}
      <div className="flex-1 min-w-0">
        <div className={`text-sm font-medium ${style.text}`}>{title}</div>
        <div className="text-xs text-gray-600 truncate">{description}</div>
      </div>
      <ChevronRight size={16} className="text-gray-400 flex-shrink-0" />
    </Link>
  )
}
