# Kết nối Supabase → n8n khi nhân viên thao tác trên web

## Bối cảnh

Web admin (`llum-admin`) đã có đầy đủ nút bấm cho nhân viên (xác nhận
booking, huỷ, duyệt hoàn tiền, đổi trạng thái lead sự kiện). Mỗi lần bấm,
web gọi 1 API route nội bộ, API route đó `UPDATE` thẳng vào Supabase.

Điều **CHƯA có**: khi Supabase vừa được `UPDATE`, không có gì tự động
báo cho n8n biết để n8n chạy tiếp (ví dụ tự nhắn khách qua Messenger/Zalo
sau khi nhân viên xác nhận booking).

Tài liệu này hướng dẫn nối 2 đầu đó lại bằng **Supabase Database Webhook**
— tính năng có sẵn trong Supabase Dashboard, không cần viết thêm code.

## Cách hoạt động

```
Nhân viên bấm nút trên web (vd "Xác nhận đã nhận đủ tiền")
        ↓
API route /api/bookings/confirm chạy UPDATE bookings SET status='confirmed'
        ↓
Supabase Database Webhook tự phát hiện bảng bookings vừa UPDATE
        ↓
Supabase tự động gọi POST tới URL webhook n8n bạn cấu hình,
kèm toàn bộ dữ liệu record vừa đổi (bao gồm cả giá trị CŨ và MỚI)
        ↓
n8n nhận webhook, đọc payload, biết booking nào vừa chuyển
sang 'confirmed' → tự chạy tiếp: nhắn khách qua Messenger/Zalo
```

## Bước 1 — Tạo webhook endpoint bên n8n trước

1. Trong n8n, tạo 1 workflow mới, node đầu tiên là **Webhook** (Production URL).
2. Copy URL webhook đó (dạng `https://your-n8n-domain/webhook/xxxxx`).
3. Để trống, chưa cần code gì thêm trong workflow này — làm bước 2 trước,
   quay lại xử lý logic n8n ở bước 4.

## Bước 2 — Tạo Database Webhook trong Supabase Dashboard

1. Vào Supabase Dashboard → chọn project → **Database** → **Webhooks** (menu bên trái).
2. Bấm **Create a new hook**.
3. Điền:
   - **Name**: `booking_status_changed` (đặt tên dễ nhớ)
   - **Table**: `bookings`
   - **Events**: chỉ tick **Update** (không cần Insert/Delete cho mục đích này)
   - **Type**: HTTP Request
   - **URL**: dán URL webhook n8n đã copy ở Bước 1
   - **HTTP Headers**: có thể thêm 1 header bí mật để n8n xác thực request
     thật sự đến từ Supabase, ví dụ `X-Webhook-Secret: <chuỗi bí mật tự đặt>`
4. Bấm **Confirm**.
5. Lặp lại y hệt cho bảng `event_inquiries` (đặt tên `event_status_changed`,
   dùng cùng URL webhook n8n hoặc URL khác nếu muốn tách workflow riêng).

## Bước 3 — Hiểu đúng payload Supabase gửi sang n8n

Supabase Database Webhook gửi POST với body dạng:

```json
{
  "type": "UPDATE",
  "table": "bookings",
  "schema": "public",
  "record": {
    "id": "...",
    "booking_code": "LLUM-0842",
    "status": "confirmed",
    "customer_psid": "...",
    "customer_platform": "messenger",
    "...": "toàn bộ các cột khác của dòng SAU KHI update"
  },
  "old_record": {
    "id": "...",
    "status": "pending_hold",
    "...": "toàn bộ các cột khác của dòng TRƯỚC KHI update"
  }
}
```

Điểm quan trọng: **so sánh `record.status` với `old_record.status`** để biết
chính xác vừa chuyển từ trạng thái nào sang trạng thái nào — vì webhook này
bắn cho MỌI lần UPDATE bảng `bookings` (kể cả các field khác đổi mà status
không đổi), n8n cần tự lọc đúng case cần xử lý.

## Bước 4 — Logic xử lý trong n8n (gợi ý, cần bạn tự dựng)

Trong workflow n8n vừa tạo, sau node Webhook, thêm:

1. **IF node**: kiểm tra `{{$json.body.record.status}}` khác `{{$json.body.old_record.status}}`
   — nếu bằng nhau (status không đổi), dừng workflow, không làm gì thêm.

2. **Switch node**: rẽ nhánh theo `{{$json.body.record.status}}`:
   - `confirmed` → gửi tin nhắn xác nhận cho khách (dùng `customer_psid`,
     `customer_platform` trong record để biết gửi Messenger hay Zalo)
   - `refunded` → gửi tin nhắn báo đã hoàn tiền, kèm `refund_amount`
   - `cancelled` → gửi tin nhắn báo đã huỷ (chỉ nếu `old_record.status`
     là `payment_mismatch`, vì case huỷ từ `pending_hold` do khách tự huỷ
     thì có thể không cần bot nhắn lại)
   - `cancel_requested` → có thể không cần nhắn khách ngay, chỉ để nhân
     viên xử lý tiếp trên web

3. Với mỗi nhánh, dùng đúng node gửi tin nhắn (Messenger Send API / Zalo OA
   API) đã có sẵn trong workflow WF1 cũ — tái sử dụng lại phần "trả lời
   khách" ở đó, không cần viết lại từ đầu.

## Bước 5 — Test thử

1. Vào web admin, mở 1 booking đang `pending_hold` (ví dụ TEST-0001 từ file
   seed dữ liệu), bấm "Xác nhận đã nhận đủ tiền".
2. Vào n8n, mở tab **Executions** của workflow vừa tạo, kiểm tra có
   execution mới chạy ngay sau khi bấm không.
3. Nếu không thấy execution nào chạy: kiểm tra lại URL webhook đã đúng
   chưa (Bước 2), và kiểm tra Supabase Dashboard → Database → Webhooks →
   xem log của webhook đó có báo lỗi gì không (ví dụ network timeout,
   sai URL).

## Lưu ý bảo mật

- Webhook secret (header `X-Webhook-Secret` ở Bước 2) giúp n8n xác thực
  request thật sự từ Supabase, tránh ai đó gọi giả webhook này. Trong n8n,
  thêm 1 IF node kiểm tra header đó khớp đúng giá trị bí mật trước khi xử
  lý tiếp.
- Không cần thêm xác thực phức tạp hơn (như JWT) cho webhook nội bộ này,
  vì đây là giao tiếp server-to-server giữa Supabase và n8n, không phải
  endpoint công khai cho người dùng.
