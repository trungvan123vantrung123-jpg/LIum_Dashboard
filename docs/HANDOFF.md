# HANDOFF DOCS — Đồi Llum Admin (llum-admin)

Tài liệu này dành cho AI hoặc lập trình viên khác tiếp nhận dự án. Đọc file
này trước khi sửa bất kỳ dòng code nào, để không phá vỡ các quyết định
thiết kế đã có chủ đích.

## 1. Bối cảnh dự án — bức tranh lớn

Đồi Llum là homestay/cafe/nhà hàng/tổ chức sự kiện tại Sóc Sơn, Hà Nội.
Toàn bộ hệ thống gồm 3 mảnh ghép:

1. **Supabase (Postgres)** — nguồn sự thật duy nhất, có constraint chống
   double-booking cho phòng lưu trú (bảng `bookings`).
2. **n8n** — chạy AI chatbot (Messenger/Zalo), nhận tin khách, gọi tool
   `check_room_available1`/`room_holding1` để check/giữ phòng, gọi
   `Warning_Notice1`/`Pause_Chat1` khi cần người xử lý.
3. **Web admin này (`llum-admin`)** — thay thế cho Lark Base trước đây,
   là nơi NHÂN VIÊN xem lịch, xử lý các case cần con người quyết định
   (xác nhận thanh toán, duyệt hoàn tiền, tư vấn sự kiện).

Nguyên tắc xuyên suốt không được vi phạm: **AI/bot KHÔNG BAO GIỜ tự ý xác
nhận booking đã thanh toán**. Bot chỉ tạo `pending_hold` (giữ chỗ tạm).
Việc chuyển sang `confirmed` LUÔN cần một người bấm nút trên web admin
này, sau khi tự mắt xem ảnh chuyển khoản khách gửi.

## 2. Trạng thái hiện tại — ĐÃ XONG

### 2.0 Trạng thái booking — ĐÃ CẬP NHẬT: thêm `payment_submitted`

Vòng đời booking giờ có 8 trạng thái (trước đây 7). Điểm thay đổi quan
trọng: tách `pending_hold` cũ (từng gộp chung 2 giai đoạn) thành 2 trạng
thái riêng biệt:

| Trạng thái | Ý nghĩa |
|---|---|
| `pending_hold` | Vừa giữ chỗ, **CHƯA có ảnh CK**, chờ khách chuyển khoản |
| `payment_submitted` | **MỚI** — khách đã gửi ảnh CK, bot đã ghi nhận `amount_paid`/`payment_screenshot_url`, đang chờ nhân viên xác nhận cuối cùng trên web |
| `confirmed` | Nhân viên đã xem ảnh và bấm xác nhận |
| ...(5 trạng thái còn lại không đổi) | |

**YÊU CẦU BẮT BUỘC với n8n (WF2 — xử lý ảnh chuyển khoản):** workflow xử
lý ảnh CK giờ phải UPDATE status thành `payment_submitted` (KHÔNG còn giữ
nguyên `pending_hold` như thiết kế cũ). Câu UPDATE cần dạng:

```sql
UPDATE bookings
SET status = 'payment_submitted',
    amount_paid = ...,
    payment_screenshot_url = ...
WHERE id = ... AND status = 'pending_hold'
```

Lưu ý điều kiện `WHERE status = 'pending_hold'` — KHÔNG thêm điều kiện
`hold_expires_at > now()`. Quyết định nghiệp vụ đã chốt: nếu khách gửi
ảnh CK dù sát giờ hết hạn (còn vài giây), vẫn ưu tiên chuyển sang
`payment_submitted`, không để cron WF4 giành quyền expire trước. Vì cả 2
workflow (bot xử lý ảnh CK và cron expire) đều dùng điều kiện WHERE dựa
trên `status = 'pending_hold'`, Postgres tự đảm bảo chỉ 1 trong 2 UPDATE
thắng — không cần thêm logic khoá gì phức tạp hơn.

**YÊU CẦU với WF4 (cron tự động expire):** không cần sửa gì — cron vẫn
chỉ lọc đúng `status = 'pending_hold'`, tự động sẽ không đụng tới các
booking đã kịp chuyển sang `payment_submitted`.

**Migration đã chuẩn bị sẵn:** file `migrate_payment_submitted.sql` (ở
thư mục gốc dự án Supabase, không phải trong repo `llum-admin` này) —
gồm: thêm giá trị vào CHECK constraint, cập nhật 2 constraint EXCLUDE
chống trùng để bao gồm `payment_submitted`, và migrate dữ liệu cũ (booking
nào đang `pending_hold` mà đã có `amount_paid` thì tự chuyển sang
`payment_submitted`).

### 2.1 Kết nối Supabase
- `src/lib/supabase-client.ts` — client phía trình duyệt (anon key)
- `src/lib/supabase-server.ts` — client phía server (service role key,
  toàn quyền, dùng trong Server Component và API routes)
- `src/types/database.ts` — TypeScript types khớp 100% với schema SQL
  (7 trạng thái booking, đầy đủ field phụ thu/cọc/hoàn tiền)

### 2.2 Trang Dashboard (`/`)
- Server Component, đọc dữ liệu thật từ Supabase, KHÔNG cache
  (`export const dynamic = 'force-dynamic'`)
- Hiển thị 4 số liệu tổng quan + danh sách "cần xử lý ngay" gồm 3 loại:
  booking lệch tiền (`payment_mismatch`), chờ duyệt huỷ
  (`cancel_requested`), sắp hết hạn giữ chỗ (`pending_hold` còn dưới 30 phút)

### 2.3 Trang Calendar (`/calendar`)
- Lưới 8 phòng × ngày trong tháng, mỗi ô màu theo trạng thái booking
- Bấm vào ô booking → mở trang chi tiết
- Chuyển tháng qua query param `?year=&month=`
- Logic tính `span` (booking kéo dài mấy ngày) nằm trong
  `getSpanInMonth()` — ĐÃ xử lý được case booking bắt đầu/kết thúc
  ngoài tháng đang xem, nhưng CHỈ xử lý đúng trong phạm vi 1 tháng hiển
  thị. Nếu sau này cần lịch dạng tuần hoặc nhiều tháng liền, cần viết
  lại hàm này.

### 2.4 Trang Bookings (`/bookings`, `/bookings/[id]`)
- `/bookings`: bảng danh sách, lọc theo 7 trạng thái qua query param
  `?status=`
- `/bookings/[id]`: trang chi tiết, hiển thị đầy đủ thông tin + ảnh
  chuyển khoản (nếu có) + component `BookingActions` chứa các nút hành động

### 2.5 Trang Events (`/events`)
- Pipeline 5 cột theo `EventInquiryStatus`
  (`new_lead`/`contacted`/`quoted`/`confirmed`/`lost`)
- Mỗi lead có dropdown đổi trạng thái ngay tại chỗ
  (component `EventStatusSelect`)

### 2.6 API Routes — ĐÃ HOẠT ĐỘNG, có ghi thật vào Supabase
Toàn bộ nút bấm trên web đều gọi các route sau, KHÔNG có route nào là
placeholder/giả:

| Route | Dùng khi | Logic quan trọng |
|---|---|---|
| `POST /api/bookings/confirm` | Xác nhận đã nhận đủ tiền | Chỉ cho phép từ `payment_submitted` hoặc `payment_mismatch` — KHÔNG còn cho phép từ `pending_hold` nữa (đã tách rõ 2 giai đoạn, xem mục 2.0) |
| `POST /api/bookings/cancel` | Huỷ booking | Tự rẽ nhánh: `pending_hold`/`payment_submitted` → huỷ thẳng thành `cancelled`; `confirmed` → chuyển `cancel_requested` (chờ duyệt hoàn tiền riêng) |
| `POST /api/bookings/approve-refund` | Duyệt hoàn tiền | Chỉ cho phép từ `cancel_requested`; tự tính `refund_amount = amount_paid * refundPercent/100` |
| `POST /api/bookings/mark-mismatch-resolved` | Khách lệch tiền, không bổ sung | Chuyển `payment_mismatch` → `cancelled` |
| `POST /api/events/update-status` | Đổi trạng thái lead sự kiện | Không có race condition cần lo, ghi thẳng |

**Đã xác nhận qua `npm run build` và `npx eslint` — không có lỗi
TypeScript, không có lỗi lint.**

## 3. CHƯA XONG — việc cần làm tiếp

### 3.1 Kết nối Supabase → n8n (QUAN TRỌNG NHẤT, làm trước)

Hiện tại: nhân viên bấm nút → Supabase được UPDATE thành công → **DỪNG Ở
ĐÓ**. Không có gì tự động báo cho n8n biết để bot nhắn lại khách (ví dụ
"Đồi Llum đã xác nhận booking của mình rồi ạ").

Đã viết sẵn hướng dẫn chi tiết ở `docs/supabase-to-n8n-webhook.md` —
dùng tính năng **Supabase Database Webhook** (có sẵn trong Dashboard,
không cần code) để bắn HTTP request sang n8n mỗi khi bảng `bookings`
hoặc `event_inquiries` có UPDATE. Việc còn lại là:
1. Làm theo đúng 5 bước trong file docs đó (tạo webhook trong Supabase
   Dashboard, trỏ tới URL webhook n8n).
2. Dựng logic trong n8n để đọc payload, so sánh `record.status` với
   `old_record.status`, rẽ nhánh gửi đúng tin nhắn cho khách.

### 3.2 Đăng nhập / phân quyền nhân viên
Hiện tại web KHÔNG có đăng nhập — ai có link đều thao tác được. Đây là
quyết định CÓ CHỦ ĐÍCH của người dùng ở giai đoạn đầu ("chưa cần, để sau
tính"), không phải thiếu sót. Khi cần bổ sung, gợi ý dùng Supabase Auth
(Magic Link hoặc Email/Password đơn giản), bọc toàn bộ route trong
`middleware.ts` để chặn truy cập chưa đăng nhập.

### 3.3 Realtime — trang tự cập nhật không cần F5
Hiện tại mọi trang đọc dữ liệu 1 lần khi load (Server Component). Nếu 2
nhân viên cùng mở web, người A xác nhận 1 booking, người B sẽ KHÔNG thấy
thay đổi cho tới khi B tự F5. Có thể bổ sung Supabase Realtime
subscription (Client Component riêng) để tự động refresh khi có UPDATE —
xem code mẫu comment trong `src/lib/supabase-client.ts` (client này đã
sẵn sàng cho việc này, chỉ chưa có component nào dùng subscribe).

### 3.4 Booking thủ công và cập nhật hai chiều — ĐÃ BỔ SUNG

Nhân viên có thể tạo booking từ `/bookings/new`, nút “Tạo booking” ở danh
sách hoặc bấm ô trống trên lịch để điền sẵn phòng/ngày. Booking nhân viên
tạo dùng `customer_platform = 'staff'`, bắt đầu ở `pending_hold` và tuyệt
đối không tự xác nhận thanh toán.

Trang chi tiết có nút “Chỉnh sửa” cho thông tin vận hành: phòng, ngày,
khách, số người, phụ phí và ghi chú. API `PATCH /api/bookings/[id]` dùng
`updated_at` làm optimistic concurrency token; nếu bot hoặc nhân viên khác
đã sửa trước thì trả `409`, không ghi đè âm thầm. Các field status, thanh
toán, huỷ và hoàn tiền không nằm trong DTO chỉnh sửa chung.

Insert/update ngày/phòng dựa thêm vào EXCLUDE constraint Postgres hiện có;
lỗi overlap `23P01` được chuyển thành thông báo trùng lịch thân thiện.
Supabase Realtime được subscribe ở root layout để thay đổi từ bot/người
tự refresh các Server Component.

> Bảo mật: web vẫn chưa có đăng nhập theo quyết định giai đoạn trước. Vì
> API dùng service role, cần bổ sung Supabase Auth trước khi phát hành URL
> CRUD rộng rãi ra Internet.

### 3.5 Đặt bàn nhà hàng — hiện KHÔNG quản lý trên web
Theo quyết định nghiệp vụ đã chốt, đặt bàn nhà hàng xử lý HOÀN TOÀN THỦ
CÔNG qua lễ tân gọi điện, KHÔNG đi qua Supabase/constraint. Vì vậy web
admin này KHÔNG có trang quản lý đặt bàn — đây không phải thiếu sót, là
đúng thiết kế. Nếu sau này Đồi Llum muốn số hoá việc đặt bàn, cần quay
lại dùng bảng `resources` (loại `table`) và constraint `no_overlap_dining`
đã có sẵn trong schema nhưng hiện chưa dùng tới.

## 4. Quy tắc bắt buộc khi sửa code — ĐỌC KỸ TRƯỚC KHI ĐỘNG VÀO

1. **KHÔNG BAO GIỜ** thêm code cho phép client (trình duyệt) `UPDATE`
   thẳng bảng `bookings` qua Supabase JS client dùng anon key. Mọi thao
   tác ghi trạng thái PHẢI đi qua API route ở server (dùng
   `supabase-server.ts`), vì đó là nơi duy nhất có logic kiểm tra race
   condition (đọc lại status trước khi ghi đè).

2. **KHÔNG BAO GIỜ** cho phép 1 API route ghi đè status mà không kiểm
   tra status hiện tại trước (xem cách làm trong `confirm/route.ts` —
   luôn `.eq('status', 'pending_hold')` ngay trong câu UPDATE, không chỉ
   dựa vào 1 câu SELECT riêng rồi mới UPDATE, vì giữa 2 câu lệnh đó có
   thể có người khác vừa ghi đè).

3. Khi thêm trạng thái booking mới, PHẢI cập nhật đồng bộ ở 3 nơi:
   `schema.sql` (constraint CHECK), `src/types/database.ts`
   (`BOOKING_STATUS_LABEL`, `BOOKING_STATUS_COLOR`), và bất kỳ API route
   nào có logic rẽ nhánh theo status.

4. File `.env.local` KHÔNG BAO GIỜ được commit — đã có `.gitignore`
   chặn theo pattern `.env*`, chỉ có ngoại lệ `.env.local.example`
   (không chứa secret thật) được phép commit.

## 5. Cách chạy thử local

```bash
npm install
cp .env.local.example .env.local
# điền NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
# SUPABASE_SERVICE_ROLE_KEY lấy từ Supabase Project Settings > API
npm run dev
```

Nếu đã chạy file `seed_bookings_thang7.sql` (data test tháng 7/2026) bên
Supabase, mở `http://localhost:3000` sẽ thấy ngay TEST-0005 (lệch tiền)
và TEST-0008 (chờ duyệt huỷ) hiện trong khối "Cần xử lý ngay".

## 6. Deploy Vercel

1. Push code lên GitHub (repo riêng).
2. Import repo vào Vercel.
3. Trong Vercel Project Settings → Environment Variables, điền đúng 3
   biến giống `.env.local`.
4. Deploy — Vercel tự nhận diện Next.js, không cần cấu hình build command
   thêm.
