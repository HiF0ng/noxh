# Quy chuẩn Trạng thái Dự án (Project Status Standards)

Tất cả các thẻ dự án, bảng danh sách dự án trên toàn bộ website và trang quản trị Admin đều áp dụng **duy nhất 1 trong 4 trạng thái chuẩn** sau đây:

---

## 🎨 Bảng Quy chuẩn 4 Trạng thái Dự án

| STT | Tên trạng thái | Mã màu Nền (Background) | Mã màu Chữ (Text) | Class Tailwind mẫu | Ý nghĩa / Sử dụng |
|---|---|---|---|---|---|
| 1 | **Chờ xây dựng** | Nền đỏ nhạt (`#ef4444` / `#f87171`) | Chữ trắng (`#ffffff`) | `bg-red-500 text-white` | Dự án đã có quy hoạch, chuẩn bị khởi công hoặc đang làm thủ tục mặt bằng |
| 2 | **Đang xây dựng** | Nền cam biển (`#f97316` / `#ea580c`) | Chữ trắng (`#ffffff`) | `bg-orange-500 text-white` | Dự án đang trong quá trình thi công xây dựng phần móng/phần thân |
| 3 | **Đang nhận hồ sơ** | Nền xanh biển (`#2563eb` / `#1d4ed8`) | Chữ trắng (`#ffffff`) | `bg-blue-600 text-white` | Dự án chính thức mở cổng thu nộp hồ sơ đăng ký mua/thuê NOXH |
| 4 | **Bàn giao** | Nền xanh lá (`#10b981` / `#059669`) | Chữ trắng (`#ffffff`) | `bg-emerald-600 text-white` | Dự án đã hoàn thiện và bước vào giai đoạn bàn giao căn hộ |

---

## 📌 Quy tắc áp dụng
- Không sử dụng thêm bất kỳ trạng thái nào ngoài 4 trạng thái trên.
- Tất cả các Badge/Pill hiển thị trạng thái dự án phải có nền màu theo đúng quy định và **chữ màu trắng (100% white)**.
- Áp dụng đồng bộ cho: `homepage.html`, `all-projects.html`, `details.html`, `admin.html`, các bảng và thẻ bài viết dự án liên quan.
