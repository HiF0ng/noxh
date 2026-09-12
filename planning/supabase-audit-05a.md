# Báo cáo kiểm tra Supabase production — 05A

Ngày kiểm tra: 10/09/2026. Phạm vi của 05A là **chỉ đọc**: đối chiếu mã SQL với REST API production và Dashboard, không tạo/sửa/xóa dữ liệu và không áp dụng migration.

## Kết quả xác minh trực tiếp

Truy vấn REST bằng publishable key đang có trong frontend, với tài khoản khách chưa đăng nhập, cho kết quả sau. Chỉ đọc `id`, giới hạn một bản ghi và chỉ ghi nhận trạng thái/số lượng; không lấy nội dung hay định danh cá nhân.

| Tài nguyên | Kết quả | Diễn giải |
|---|---:|---|
| `projects` | 116 bản ghi đọc được | Nội dung dự án đang công khai cho khách. |
| `documents` | 17 bản ghi đọc được | Tài liệu đang công khai cho khách. |
| `faqs` | 80 bản ghi đọc được | FAQ đang công khai cho khách. |
| `news` | 0 bản ghi đọc được | Không có bản ghi trả về tại thời điểm kiểm tra. |
| `users` | 0 bản ghi trả về | Phù hợp với kỳ vọng RLS, nhưng cần thử bằng user A/B để kết luận cô lập dữ liệu. |
| `user_saved_projects` | 0 bản ghi trả về | Phù hợp với kỳ vọng RLS, chưa là bằng chứng A/B. |
| `user_followed_projects` | 0 bản ghi trả về | Phù hợp với kỳ vọng RLS, chưa là bằng chứng A/B. |
| Dự án có `details_json.isDraft = true` | 0 bản ghi tại thời điểm kiểm tra | Không có draft để chứng minh policy đang chặn draft. |
| Tài liệu có `is_draft = true` | 0 bản ghi tại thời điểm kiểm tra | Không có draft để chứng minh policy đang chặn draft. |

Endpoint Auth settings trả HTTP 200, cho thấy đăng ký đang bật và email confirmation đang tắt.

## Xác minh trực tiếp trong Supabase Dashboard

Dashboard đã được kiểm tra bằng phiên quản trị vào ngày 10/09/2026. Các policy sau tồn tại và RLS đang bật trên toàn bộ bảng liệt kê:

| Phạm vi | Xác minh live |
|---|---|
| `projects` | `Public read projects`: `SELECT` cho `anon, authenticated`, điều kiện `true`; `Admins manage projects`: `ALL` cho `authenticated`. |
| `documents` | `Public read documents`: `SELECT` cho `anon, authenticated`, điều kiện `true`; `Admins manage documents`: `ALL` cho `authenticated`. |
| `faqs`, `news` | Mỗi bảng có một policy đọc public và một policy quản trị cho `authenticated`. |
| `users` | Chỉ có policy đọc/cập nhật profile của chính người dùng hoặc admin, áp dụng cho `authenticated`. |
| saved/followed | Chỉ có policy `ALL` cho `authenticated`, tên policy giới hạn theo chủ sở hữu. |
| Functions | Có bốn hàm `SECURITY DEFINER`: `handle_new_auth_user`, `is_admin`, `prevent_role_escalation`, `sync_auth_user_email`. |
| Trigger public | `prevent_user_role_escalation` đang bật, chạy `BEFORE UPDATE` trên `public.users`. |

Storage có đúng một bucket `project-images`, đang **PUBLIC**. Bucket có bốn policy: đọc public; upload, update và delete cho `authenticated` theo `is_admin()`. Điều kiện upload đã đọc trực tiếp là `bucket_id = 'project-images' AND is_admin()`.

Auth URL configuration đang là:

| Thiết lập | Giá trị hiện tại |
|---|---|
| Site URL | `http://127.0.0.1:5500` |
| Redirect allowlist | `http://127.0.0.1:5500/**`, `http://localhost:5500/**` |

Đây là cấu hình local hợp lệ cho phát triển, nhưng không dùng được cho staging hay production. Trước khi kiểm thử reset password trên staging, 05B phải thêm đúng HTTPS staging URL. Khi go-live, 05C phải đổi Site URL sang canonical production HTTPS và chỉ giữ các redirect URL cần thiết.

## Phát hiện cần xử lý trong 05B

### P0 — chính sách công khai không chặn dữ liệu nháp

Migration RLS hiện có đặt policy đọc công khai là `USING (true)` cho `projects` và `documents`. Frontend chỉ lọc `details.isDraft`/`is_draft` sau khi đã tải `select=*`, vì vậy một draft sẽ có thể bị đọc trực tiếp qua REST nếu migration này đang chạy.

Hiện chưa có draft trong dữ liệu production để bị lộ, nhưng đây là lỗ hổng sẽ xuất hiện ngay khi admin lưu nháp. 05B cần đưa điều kiện publish vào database:

- thống nhất trạng thái public/draft bằng cột SQL có index (ưu tiên `is_published` hoặc `is_draft`) cho `projects` và `documents`;
- policy khách chỉ `SELECT` dữ liệu published; admin vẫn xem và quản lý toàn bộ;
- chỉ trả các trường công khai qua view hoặc truy vấn chọn cột, thay vì `select=*`;
- thêm ca kiểm thử khách/user/admin và ít nhất một bản ghi draft trên staging.

### P0 — script khởi tạo cũ có thể mở toàn bộ database

`supabase_schema.sql` vẫn tạo các policy `Anon full access ... FOR ALL USING (true) WITH CHECK (true)` cho mọi bảng, và policy Storage cho phép khách upload/update/delete. Nếu script này được chạy sau migration bảo mật, RLS sẽ bị mở lại.

05B cần thay script này bằng bộ migration có thứ tự rõ ràng, idempotent và chỉ chứa policy đích; cấm dùng script khởi tạo cũ trên staging/production. Việc này cũng là điều kiện để xác nhận RLS thực tế thay vì chỉ nhìn file migration.

### P0 — Storage live bảo vệ ghi, nhưng chưa bảo vệ tài liệu cần đăng nhập

Dashboard xác nhận quyền ghi/ghi đè/xóa object đã giới hạn cho admin. Tuy nhiên bucket vẫn public và frontend đang lưu cả ảnh lẫn tệp tài liệu vào `project-images`, sau đó trả về URL `/storage/v1/object/public/...`. Vì vậy bất kỳ tài liệu nào có yêu cầu đăng nhập chỉ được chặn ở giao diện vẫn có thể bị tải trực tiếp khi biết URL.

05B phải giữ ảnh ở bucket public nếu cần, nhưng tạo private bucket riêng cho tài liệu cần đăng nhập; tải file qua URL có chữ ký ngắn hạn hoặc endpoint kiểm tra phiên/quyền. Không dùng một bucket public cho tài liệu riêng tư.

### P1 — luồng profile/password legacy cần loại bỏ

`resetPasswordByEmail()` còn có khả năng PATCH `password_hash` trong bảng profile bằng API. Hiện hàm không được trang recovery gọi, nhưng tồn tại song song với Supabase Auth sẽ gây rủi ro khi bị dùng lại. 05B cần xóa đường code này, dừng dùng `password_hash` cho xác thực, và chỉ dùng recovery/password update của Supabase Auth.

### P1 — Auth callback và chống lạm dụng chưa xác minh

Frontend gọi recovery mà không truyền `redirectTo`, vì vậy luồng email phụ thuộc hoàn toàn vào `Site URL` trong Dashboard. Dashboard xác nhận Site URL và allowlist hiện chỉ là localhost. 05B cần thêm HTTPS staging URL trước khi kiểm thử reset password; 05C đổi Site URL sang canonical production HTTPS rồi loại URL không còn cần. Đăng ký công khai đang bật nhưng email confirmation tắt; 05B cần quyết định bật confirmation và CAPTCHA/rate-limit theo luồng đăng ký mong muốn.

Người dùng đã xác nhận đã tự kiểm thử đầy đủ reset password thành công ở cấu hình local hiện tại. Đây là bằng chứng cho luồng local; cần lặp lại một lần ở HTTPS staging sau khi có VPS/domain để xác minh callback URL và email khi dùng domain thật.

## Những gì có cơ sở đạt và những gì chưa thể kết luận

- Có cơ sở: API khách hiện đọc được các nội dung public; API khách không nhận bản ghi `users`, saved hay followed ở lần kiểm tra này; source có cơ chế profile gắn `auth.uid()` và helper `is_admin()`.
- Chưa thể kết luận: quyền admin thực tế và cô lập user A với user B; cần 05B trên staging và 05C sau backup/duyệt production. Trigger tạo profile trong schema `auth` không hiển thị ở danh sách trigger schema `public`, nên cũng cần được thử bằng một tài khoản staging mới.

## Hạng mục kế tiếp đề nghị: 05B

1. Viết migration RLS đích, thay thế hoàn toàn policy legacy và thêm điều kiện published/draft tại database.
2. Tách bucket ảnh public và tài liệu private; chỉ admin được upload/ghi đè/xóa, người dùng tải tài liệu private qua URL có chữ ký ngắn hạn.
3. Xóa đường `password_hash` legacy khỏi frontend/schema vận hành; chốt Auth URL/callback.
4. Chạy migration trên staging và kiểm thử khách, user A, user B, admin trước khi đề nghị áp dụng production ở 05C.

Không có thay đổi nào được áp dụng lên Supabase production trong 05A.
