type Tone = 'default' | 'warning' | 'danger' | 'accent'

const TONE_TEXT: Record<Tone, string> = {
  default: 'text-gray-900',
  warning: 'text-amber-600',
  danger: 'text-red-600',
  accent: 'text-blue-600',
}

interface StatCardProps {
  label: string
  value: string | number
  tone?: Tone
}

export function StatCard({ label, value, tone = 'default' }: StatCardProps) {
  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <div className="text-xs text-gray-500">{label}</div>
      <div className={`text-2xl font-medium mt-1 ${TONE_TEXT[tone]}`}>{value}</div>
    </div>
  )
}
