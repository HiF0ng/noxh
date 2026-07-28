# FINALIZE PLAN: Kế Hoạch Triển Khai Full-Stack Dự Án NOXH.HELP

Báo cáo kế hoạch tổng thể kiến trúc, công nghệ và lộ trình 3 bước triển khai hệ thống lưu trữ, đăng nhập, bảo mật và quản lý dự án lâu dài cho `noxh.help`.

---

## 🏛️ 1. Kiến trúc Tổng quan (Architecture Overview)

Hệ thống được xây dựng theo mô hình **Tách biệt Frontend - Backend (Decoupled RESTful Architecture)**:
* **Frontend**: HTML5 / Tailwind CSS / Vanilla JS (Đồng bộ tương lai lên Next.js/React).
* **Backend API**: Node.js (TypeScript + Express/NestJS) xử lý logic xác thực, phân quyền, lưu vết.
* **Database**: PostgreSQL (Relational Database) đảm bảo tính toàn vẹn dữ liệu ACID, hỗ trợ tìm kiếm Tiếng Việt không dấu (`unaccent`, `pg_trgm`).
* **Storage**: Storage Engine (Cloudflare R2 / AWS S3 / Server Storage) quản lý ảnh và tài liệu PDF/DOCX.
* **Security**: JWT token mã hóa lưu tại `HTTP-Only Cookie`, Hash mật khẩu bằng `Argon2id`/`bcrypt`, Rate Limiting chống Brute-force & DDoS.

---

## 📊 2. Bảng Lựa chọn Công nghệ (Tech Stack)

| Thành phần | Công nghệ được chọn | Lý do chọn |
| :--- | :--- | :--- |
| **Backend API** | **Node.js (Express / NestJS + TypeScript)** | Hiệu năng cao, phổ biến, dễ tuyển dụng & bảo trì lâu dài |
| **Database** | **PostgreSQL** | Chuẩn dữ liệu quan hệ, cực kỳ tin cậy, hỗ trợ tìm kiếm Tiếng Việt vượt trội |
| **Authentication** | **JWT + HTTP-Only Cookie + bcrypt** | Chống XSS, chống CSRF, phân quyền RBAC chặt chẽ cho Admin/User |
| **File Storage** | **Cloud Storage (S3 / Local Server Storage)** | Bảo mật tệp tin, cấp Presigned URL cho tài liệu riêng tư |
| **Frontend** | **HTML5 + Tailwind CSS + JavaScript** | Tận dụng 100% mã nguồn hiện tại, sẵn sàng nâng cấp Next.js sau |

---

## 🗄️ 3. Thiết kế Cấu trúc Cơ sở Dữ liệu (Database Schemas)

### `users`
* `id`: UUID (Primary Key)
* `email`: VARCHAR(255) (UNIQUE)
* `password_hash`: VARCHAR(255)
* `full_name`: VARCHAR(255)
* `role`: VARCHAR(50) ('admin', 'user')
* `created_at`: TIMESTAMP

### `projects`
* `id`: UUID (Primary Key)
* `title`: VARCHAR(255)
* `location`: VARCHAR(255)
* `investor`: VARCHAR(255)
* `progress`: INT (0 - 100)
* `status`: VARCHAR(100)
* `details_json`: JSONB (Tiện ích, Mặt bằng, Gallery)
* `created_at`: TIMESTAMP

### `documents`
* `id`: UUID (Primary Key)
* `title`: VARCHAR(255)
* `category`: VARCHAR(100) ('Đơn mua', 'Đơn thuê')
* `doc_type`: VARCHAR(50) ('PDF', 'DOCX')
* `file_url`: TEXT
* `content`: TEXT
* `created_at`: TIMESTAMP

### `faqs`
* `id`: UUID (Primary Key)
* `category`: VARCHAR(100) ('doi-tuong', 'dieu-kien', 'vay-von', 'quyen-so-huu')
* `question`: TEXT
* `answer`: TEXT
* `sort_order`: INT
* `created_at`: TIMESTAMP

### `news`
* `id`: UUID (Primary Key)
* `title`: VARCHAR(255)
* `summary`: TEXT
* `content`: TEXT
* `image_url`: TEXT
* `status`: VARCHAR(50) ('published', 'draft')
* `published_at`: TIMESTAMP
* `created_at`: TIMESTAMP

---

## 🛣️ 4. Lộ trình Triển khai 3 Bước (3-Step Roadmap)

### 📌 **Bước 1: Khởi tạo Backend API & Cơ sở Dữ liệu (Đang tiến hành)**
1. Thiết lập cấu trúc thư mục Server Backend Node.js / Express với TypeScript.
2. Khởi tạo kết nối PostgreSQL & định nghĩa các Schemas / Models.
3. Xây dựng dịch vụ Xác thực (**Authentication API**): Đăng ký, Đăng nhập, Đăng xuất, Phân quyền Admin.
4. Xây dựng dịch vụ Upload tệp tin (**Storage Service**): Tiếp nhận & lưu trữ ảnh dự án, tin tức, tài liệu PDF/DOCX.
5. Viết bộ **RESTful CRUD APIs** hoàn chỉnh cho:
   - Dự án (`/api/v1/projects`)
   - Tài liệu (`/api/v1/documents`)
   - Câu hỏi FAQ (`/api/v1/faqs`)
   - Tin tức (`/api/v1/news`)

### 📌 **Bước 2: Kết nối Giao diện Frontend với Backend API**
1. Đấu nối Form Đăng nhập (`login.html`) & Đăng ký (`signup.html`) với Auth API.
2. Đổi toàn bộ các hàm thao tác Dữ liệu tĩnh trong `assets/js/admin.js` sang gọi `fetch()` tới Backend API.
3. Đấu nối ô Upload File trong Admin (`#page-docs-new`, `#page-news-new`, `#page-projects-new`) với API Upload thực sự.
4. Đấu nối các trang người dùng trên Web (`homepage.html`, `all-projects.html`, `documents.html`, `faq.html`) để hiển thị dữ liệu live từ DB.

### 📌 **Bước 3: Tối ưu Bảo mật, Kiểm thử & Đóng gói Triển khai**
1. Cài đặt các Middleware bảo mật: `helmet` (HTTP Headers), `express-rate-limit` (chống dò mật khẩu/DDoS), `cors` chính xác domain.
2. Tối ưu hóa truy vấn CSDL PostgreSQL & Indexing các trường tìm kiếm.
3. Đóng gói ứng dụng (Docker container / PM2 config) và hướng dẫn triển khai lên VPS/Cloud Server.
