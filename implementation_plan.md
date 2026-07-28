# Liên kết Dữ liệu giữa Admin và Website (sử dụng Supabase)

Yêu cầu: Đồng bộ hóa các thao tác quản trị từ giao diện Admin sang hiển thị trên Website chính thức và ngược lại, sử dụng cơ sở dữ liệu Supabase có sẵn.

## User Review Required

Vì bạn đã có sẵn cơ sở dữ liệu Supabase (cấu hình trong `supabase-config.js` và bảng được tạo theo `supabase_schema.sql`), chúng ta sẽ **đấu nối trực tiếp 100% giao diện Admin và Website vào Supabase thông qua REST API**.

- **Ưu điểm**: Dữ liệu thật, thời gian thực, lưu trữ trên Cloud vĩnh viễn, bảo mật và đúng chuẩn dự án thực tế.
- **Yêu cầu**: Cấu hình trong `supabase-config.js` phải đang hoạt động bình thường, và các bảng (`users`, `projects`, `documents`, `faqs`, `news`) đã được tạo thành công trên Supabase.

Nếu bạn đồng ý, hãy chọn **Proceed**. Tôi sẽ tiến hành chỉnh sửa mã nguồn.

## Proposed Changes

### 1. Tạo tập tin Data Service chung (Supabase Service)
Thay vì viết lại code `fetch` nhiều lần, tôi sẽ tạo một file `assets/js/supabase-service.js` để đóng gói toàn bộ các hàm gọi API (Lấy danh sách, Thêm, Sửa, Xóa).
- Bao gồm các hàm: `getProjects()`, `addProject()`, `updateProject()`, `deleteProject()`
- Tương tự cho Users, News, Documents, FAQs.
- Tính toán số liệu thống kê chung (Count) cho Dashboard.

#### [NEW] [supabase-service.js](file:///f:/noxh.help/assets/js/supabase-service.js)

### 2. Tích hợp Supabase Service vào Giao diện Admin
Đấu nối toàn bộ các logic quản trị với cơ sở dữ liệu Supabase.
- Quản lý Dự án: Thay vì mảng tĩnh, bảng dự án sẽ load từ `supabase-service.js`. Bấm Lưu/Xóa dự án sẽ gọi API lên Supabase.
- Tương tự cho Tin tức, Hướng dẫn, Người dùng.
- Cập nhật thông số Dashboard: Các ô "--" sẽ đếm số lượng bản ghi thực tế từ Supabase (vd: tổng số Users, tổng số Projects).

#### [MODIFY] [admin.js](file:///f:/noxh.help/assets/js/admin.js)
- Xóa các logic mock data cũ.
- Viết lại hàm render sử dụng dữ liệu trả về từ Supabase.

### 3. Tích hợp Supabase Service vào Website Frontend
Cập nhật file JS chính của frontend để lấy dữ liệu từ `supabase-service.js` một cách chuẩn xác, bỏ các API localhost fallback.
- Nạp danh sách Dự án nổi bật, danh sách Tài liệu, Tin tức từ Supabase Cloud.

#### [MODIFY] [main.js](file:///f:/noxh.help/assets/js/main.js)
- Tối ưu hóa lại các hàm `fetch` hiện tại bằng cách gọi qua `supabase-service.js` cho đồng bộ với Admin.

#### [MODIFY] Các file HTML
- Đảm bảo chèn thẻ `<script src="assets/js/supabase-config.js"></script>` và `<script src="assets/js/supabase-service.js"></script>` vào tất cả các trang liên quan (cả admin.html và index/homepage.html).

## Verification Plan

### Manual Verification
1. Mở trang Admin Dashboard, kiểm tra xem các thông số Tổng số User, Tổng số Dự án đã đếm đúng dữ liệu từ Supabase chưa.
2. Ở tab Admin, thử đăng một Tin tức mới hoặc Dự án mới (dữ liệu sẽ được lưu lên Cloud).
3. Mở trang Frontend, vào mục Tin tức / Dự án để kiểm tra xem bài viết vừa đăng có hiển thị thành công không.