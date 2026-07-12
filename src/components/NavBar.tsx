'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Calendar, List, Users } from 'lucide-react'

const NAV_ITEMS = [
  { href: '/', label: 'Tổng quan', icon: LayoutDashboard },
  { href: '/calendar', label: 'Lịch phòng', icon: Calendar },
  { href: '/bookings', label: 'Booking', icon: List },
  { href: '/events', label: 'Sự kiện', icon: Users },
]

export function NavBar() {
  const pathname = usePathname()

  return (
    <nav className="border-b border-gray-100 bg-white sticky top-0 z-10">
      <div className="max-w-6xl mx-auto px-6 flex items-center gap-1 h-12">
        <span className="text-sm font-medium text-gray-900 mr-4">Đồi Llum</span>
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition ${
                isActive
                  ? 'bg-gray-100 text-gray-900 font-medium'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Icon size={14} />
              {item.label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
