# Mã 03 — Public build allowlist

Ngày: 10/09/2026. Mục tiêu là chỉ đưa artifact cần cho website vào `dist/public/`, không đưa nguyên repository lên web server.

## Thành phần đã thêm

- `package.json`: các lệnh `build:public`, `verify:public` và `build`.
- `scripts/build-public.mjs`: tạo mới artifact từ allowlist; chỉ ghi vào `dist/`.
- `scripts/verify-public.mjs`: kiểm tra manifest/hash, cấm các path nội bộ và marker secret.
- `deploy/README.md`: hướng dẫn duy nhất cho web root sau này.

Chạy bằng Node.js:

```powershell
npm run build
```

Nếu Node được cài nhưng `npm` chưa nằm trong PATH trên máy local, có thể chạy trực tiếp:

```powershell
node scripts/build-public.mjs
node scripts/verify-public.mjs
```

## Allowlist hiện tại

Build xuất 20 HTML cho giao diện người dùng, `admin.html`, `admin-login.html`, navbar/footer, logo và local assets mà HTML/CSS tham chiếu. Component navbar/footer được xử lý theo đúng cách browser chèn DOM: asset relative của component được resolve theo document root.

Hai admin shell được giữ để giao diện tiếp tục hoạt động, nhưng không được coi là nội dung public. `noindex`, Auth/RLS và, nếu duyệt, chặn route phía Nginx sẽ thực hiện ở mã 05/06B/04.

## Nội dung bị loại

- `server/`, C#/PowerShell server legacy, SQL migration/schema, Git metadata, planning và source build.
- `.env`, database dump, `data.json`, log, binary, key/certificate và file lock Office.
- `docs/` (50.7 MB) và archive `projects/` (597.7 MB): nguồn hiện tại không tham chiếu trực tiếp các thư mục này; ảnh/tài liệu live cần được đọc qua Supabase Storage và RLS. Không tự publish archive để tránh mở công khai tài liệu/dữ liệu chưa phân loại.
- HTML admin legacy rời và `working.html` không được coi là route deploy riêng. `working.html` được xuất vì các trang đăng ký hiện còn liên kết tới nó; mã 06B/04 sẽ chốt chính sách route/private chính thức.

## Kết quả kiểm tra local

- Build sạch tạo 46 file allowlist trong `dist/public/`.
- Manifest `dist/build-manifest.json` nằm ngoài web root, lưu hash/byte để kiểm tra artifact.
- Verify đạt: hash đúng, đủ entry, không có server/planning/Git/.env/SQL/dump/log/binary và không có `sb_secret_`, `SUPABASE_SERVICE_ROLE`, `service_role` hoặc gán `JWT_SECRET` trong artifact.
- `dist/` bị ignore, không được commit. Không có Nginx, HTTPS, direct friendly-route fallback hoặc browser staging trong mã 03; chúng thuộc mã 04/09.

## Điều kiện bàn giao cho mã 04

1. Build chạy trong môi trường deploy bằng Node.js đầy đủ.
2. Chỉ đồng bộ `dist/public/` tới thư mục release trên VPS, với quyền đọc cho Nginx.
3. Không đồng bộ repository root, `dist/build-manifest.json` hoặc thư mục local/legacy.
4. Nginx phải map route có chủ đích, không fallback mọi URL thành HTTP 200; yêu cầu này sẽ thực hiện và kiểm tra ở mã 04.
