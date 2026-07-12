// Supabase client dùng ở phía TRÌNH DUYỆT (Client Component, 'use client').
// Dùng anon key — chỉ có quyền theo Row Level Security (RLS) đã cấu hình trên Supabase.
// Dùng cho: đọc dữ liệu để hiển thị, subscribe Realtime.
// KHÔNG dùng client này cho các thao tác ghi quan trọng (xác nhận, hoàn tiền) —
// những thao tác đó phải đi qua API route ở server (xem supabase-server.ts).

import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
