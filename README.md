# NOXH

Website HTML/JavaScript sử dụng Supabase cho dữ liệu, Auth và Storage.

## Kế hoạch đang thực hiện

- [Danh sách triển khai, thứ tự và trạng thái duyệt](planning/launch-checklist.md).
- [Mã 01: quyết định kiến trúc và kiểm kê phụ thuộc](planning/architecture-01.md).

Ngày 10/09/2026, người dùng duyệt thực hiện **mã 01**. Các mã khác chỉ là kế hoạch, chưa được phép triển khai.

## Kiến trúc đích

Nginx phục vụ HTML/CSS/JS đã build; Supabase là nguồn dữ liệu chính. Tiến trình build sinh HTML public và trang dự án, không chạy như backend Express cũ. Quy trình build, cấu hình Nginx và SEO dự án sẽ được triển khai lần lượt tại mã 03, 04 và 07.

`ApiServer.cs/.exe`, `WebServer.cs/.exe`, `server*.ps1` và `server/` là thành phần legacy, không thuộc bản triển khai đích. Hiện chúng được giữ nguyên để đối chiếu; chưa xóa file hoặc dừng tiến trình trên máy/VPS.

Chưa có lệnh build/preview production ở thư mục gốc. `server/package.json` thuộc backend legacy; không dùng `npm start` trong thư mục đó để triển khai kiến trúc mới. Không phục vụ toàn bộ repo ra Internet.
