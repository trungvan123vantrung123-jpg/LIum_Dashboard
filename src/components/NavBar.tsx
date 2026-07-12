'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Calendar, LayoutDashboard, List, Users } from 'lucide-react'

const NAV_ITEMS = [
  { href: '/', label: 'Tổng quan', icon: LayoutDashboard },
  { href: '/calendar', label: 'Lịch phòng', icon: Calendar },
  { href: '/bookings', label: 'Booking', icon: List },
  { href: '/events', label: 'Sự kiện', icon: Users },
]

export function NavBar() {
  const pathname = usePathname()

  return (
    <nav className="sticky top-0 z-10 border-b border-[#dadce0] bg-white">
      <div className="app-container flex h-14 items-center gap-6">
        <Link href="/" className="text-[15px] font-medium text-[#202124]">
          Đồi Llum Admin
        </Link>
        <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
          {NAV_ITEMS.map((item) => {
            const isActive =
              item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative flex h-14 items-center gap-2 px-3 text-sm transition-colors ${
                  isActive
                    ? 'text-[#1a73e8]'
                    : 'text-[#5f6368] hover:text-[#202124]'
                }`}
              >
                <Icon size={16} strokeWidth={1.8} />
                <span className="whitespace-nowrap">{item.label}</span>
                {isActive && (
                  <span className="absolute inset-x-3 bottom-0 h-0.5 bg-[#1a73e8]" />
                )}
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
