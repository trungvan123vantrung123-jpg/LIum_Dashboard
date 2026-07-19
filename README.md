# Đồi Llum Admin

Workspace vận hành booking chung cho chatbot và nhân viên. Supabase là nguồn dữ liệu duy nhất; n8n/chatbot và web admin cùng đọc/ghi vào hệ thống qua các luồng được kiểm soát.

## Chức năng

- Dashboard các booking cần xử lý.
- Calendar phòng theo tháng; bấm ô trống để tạo booking.
- Nhân viên tạo booking cho khách gọi điện/walk-in.
- Chỉnh sửa phòng, ngày, khách, số người, phụ phí và ghi chú.
- Phát hiện trùng lịch bằng constraint Postgres.
- Chống ghi đè khi bot/người khác vừa cập nhật booking.
- Realtime refresh khi booking thay đổi.
- Luồng riêng cho xác nhận thanh toán, huỷ và hoàn tiền.

## Chạy local

```bash
npm install
npm run dev
```

Sao chép `.env.local.example` thành `.env.local` và điền ba biến Supabase trước khi chạy.

## Kiểm tra

```bash
npm run lint
npm run build
```

> **Quan trọng:** API ghi dữ liệu dùng service role phía server. Dự án hiện chưa có đăng nhập theo quyết định giai đoạn đầu; cần bổ sung Supabase Auth trước khi công khai URL quản trị.

Xem [docs/HANDOFF.md](docs/HANDOFF.md) để biết state machine, quy tắc race condition và kết nối n8n.
