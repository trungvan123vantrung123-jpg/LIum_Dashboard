// Supabase client dùng ở phía SERVER (Server Component, API routes).
// Dùng service role key — bỏ qua RLS, có toàn quyền đọc/ghi.
//
// QUAN TRỌNG VỀ AN TOÀN: file này chỉ được import trong code chạy ở server
// (Server Component không có 'use client', hoặc file trong src/app/api/).
// Next.js tự đảm bảo SUPABASE_SERVICE_ROLE_KEY (không có tiền tố NEXT_PUBLIC_)
// không bao giờ được đóng gói vào bundle gửi cho trình duyệt — nhưng để chắc
// chắn, không import file này vào bất kỳ Client Component nào.

import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export function createServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}
