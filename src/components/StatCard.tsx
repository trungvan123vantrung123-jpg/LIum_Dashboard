type Tone = 'default' | 'warning' | 'danger' | 'accent'

const TONE_TEXT: Record<Tone, string> = {
  default: 'text-[#202124]',
  warning: 'text-[#b06000]',
  danger: 'text-[#c5221f]',
  accent: 'text-[#1a73e8]',
}

interface StatCardProps {
  label: string
  value: string | number
  tone?: Tone
}

export function StatCard({ label, value, tone = 'default' }: StatCardProps) {
  return (
    <div className="surface bg-white px-4 py-3">
      <div className="text-xs font-medium uppercase tracking-[0.04em] text-[#5f6368]">
        {label}
      </div>
      <div className={`mt-2 text-2xl font-medium tracking-[-0.02em] ${TONE_TEXT[tone]}`}>
        {value}
      </div>
    </div>
  )
}
