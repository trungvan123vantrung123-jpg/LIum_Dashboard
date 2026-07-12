import Link from 'next/link'
import { AlertTriangle, ChevronRight, Clock, Hourglass } from 'lucide-react'

type Tone = 'danger' | 'warning' | 'muted'

const TONE_STYLES: Record<Tone, { border: string; text: string; icon: React.ReactNode }> = {
  danger: {
    border: 'border-l-[#c5221f]',
    text: 'text-[#c5221f]',
    icon: <AlertTriangle size={17} className="text-[#c5221f]" />,
  },
  warning: {
    border: 'border-l-[#f9ab00]',
    text: 'text-[#b06000]',
    icon: <Clock size={17} className="text-[#b06000]" />,
  },
  muted: {
    border: 'border-l-[#9aa0a6]',
    text: 'text-[#3c4043]',
    icon: <Hourglass size={17} className="text-[#5f6368]" />,
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
      className={`flex items-center gap-3 border border-l-4 border-[#dadce0] bg-white px-3 py-3 transition-colors hover:bg-[#f8fafd] ${style.border}`}
    >
      {style.icon}
      <div className="min-w-0 flex-1">
        <div className={`text-sm font-medium ${style.text}`}>{title}</div>
        <div className="truncate text-xs text-[#5f6368]">{description}</div>
      </div>
      <ChevronRight size={16} className="flex-shrink-0 text-[#9aa0a6]" />
    </Link>
  )
}
