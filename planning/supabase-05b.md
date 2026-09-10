# Chuẩn bị Supabase 05B

Ngày: 10/09/2026. Mục tiêu là chuẩn bị mã nguồn và migration để sửa các phát hiện của 05A. Không có SQL, bucket, policy hay Auth URL nào được thay đổi trên Supabase trong 05B.

## Đã chuẩn bị

| Hạng mục | Thay đổi |
|---|---|
| Draft dự án/tài liệu | Migration thêm `projects.is_draft`, chuyển dữ liệu legacy từ `details_json.isDraft`, xóa cờ JSON và cho khách chỉ đọc `is_draft = false`. `documents.is_draft` cũng được bảo vệ cùng nguyên tắc. |
| Policy | Migration gỡ toàn bộ policy của bảy bảng ứng dụng rồi tạo lại policy owner/admin/public tối thiểu. News chỉ public khi `status = 'published'`. |
| Storage | Ảnh tiếp tục ở `project-images` public. Tài liệu upload mới dùng bucket private `private-documents`; người đăng nhập nhận URL có chữ ký 60 giây. |
| Credentials | Xóa `resetPasswordByEmail`, `addUser` tạo `default_hash` và mọi cách dùng `password_hash` khỏi frontend/bootstrap. Migration sẽ xóa cột profile legacy sau backup ở 05C. |
| Bootstrap | `supabase_schema.sql` không còn policy anonymous full-access; file auth compatibility không còn hard-code email admin và không mở public write. |
| Auth URL | Không đổi Dashboard khi chưa có staging/domain. Reset password OTP hiện có vẫn giữ nguyên; cấu hình HTTPS staging/prod thuộc 05C. |

Migration chính: `supabase_migrations/20260910_05b_security_hardening.sql`.

## Kiểm thử đã chạy

- `node scripts/verify-security-05b.mjs`: đạt. Kiểm tra payload draft đi vào SQL column, upload mới dùng private bucket, download dùng chữ ký có phiên đăng nhập và 60 giây, frontend không còn API reset profile/password, bootstrap không còn tạo policy full-access.
- `node --check` cho `supabase-service.js`, `main.js`, `admin.js`: đạt.
- public build và verifier: 46 file, đạt; không có đường dẫn restricted hay secret marker.

Các kiểm tra trên là hợp đồng mã nguồn, không phải kiểm thử Supabase staging hay production.

## Cần làm ở staging trước 05C

1. Tạo backup database và Storage của staging, rồi chạy migration chính một lần.
2. Tạo một dự án draft và một tài liệu draft: khách phải nhận 0 bản ghi; admin vẫn xem/sửa được.
3. Dùng user A và user B kiểm tra saved/followed: A không đọc/sửa dữ liệu B; user thường không tự đổi `role` hoặc ghi Storage.
4. Admin upload tài liệu mới: object phải vào `private-documents`; khách không tải được; người dùng đã đăng nhập tải được qua signed URL; URL hết hạn sau 60 giây.
5. Sao chép từng tệp tài liệu cũ từ `project-images/documents/` sang `private-documents`, thay URL database bằng `storage://private-documents/<path>`, rồi kiểm thử. Chỉ xóa public object cũ sau khi dữ liệu mới hoạt động.
6. Khi có HTTPS staging, đặt Site URL và Redirect URL staging, sau đó lặp lại reset password bằng email thật.

Không áp dụng migration này lên production cho đến 05C, sau backup đã xác minh và khi các ca staging đạt.
