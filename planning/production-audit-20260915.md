# Kiểm tra production ngày 15/09/2026

Phạm vi: `https://noxh.help`, VPS `116.118.3.62`, Supabase production và bản public build hiện tại. Kết quả Lighthouse là dữ liệu phòng lab tại thời điểm đo, không thay cho Core Web Vitals thực tế từ người dùng.

## Kết luận

- **Bảo mật hạ tầng: đạt các kiểm tra tự động hiện có.** VPS chỉ mở 22/80/443; các cổng 21/25/3000/5432/6379/8080/8443 đóng. SSH key hoạt động, đăng nhập SSH bằng mật khẩu đã bị tắt, UFW đang bật.
- **Bề mặt web và dữ liệu công khai: đạt các probe ẩn danh hiện có.** URL sai và các đường dẫn `/.env`, `/.git/config`, `/server/.env`, `/supabase_schema.sql` trả 404. Khách không đọc được draft, bảng dữ liệu cá nhân hoặc danh sách file trong bucket `private-documents`.
- **HTTPS và security headers: đạt.** `https://www.noxh.help/trang-chu` trả 301 trực tiếp tới `https://noxh.help/trang-chu`; HSTS thử nghiệm 1 ngày và CSP Report-Only đã bật. Certbot và dry-run gia hạn đều đạt.
- **Hiệu năng lab sau tối ưu: đạt.** Lần đo ban đầu đạt 56/100 mobile và 74/100 desktop. Sau khi rút gọn/self-host font icon, bỏ request dự án trùng và defer script trang chủ, Lighthouse production đạt 98/100 mobile và 100/100 desktop. Mobile LCP giảm từ 9,8 xuống 1,9 giây; payload giảm từ khoảng 2,9 xuống 1,7 MiB. Chưa có đủ dữ liệu field CWV vì domain mới.
- **Phân quyền sau đăng nhập: đạt.** Ma trận production dùng hai user và một admin đã xác nhận cách ly profile/saved/followed, chặn tự nâng role và sửa profile identity, giữ đúng quyền admin với user/project/Storage; dữ liệu thử được dọn sạch.

## Bằng chứng bảo mật

| Kiểm tra | Kết quả |
|---|---|
| Cổng VPS | Chỉ 22, 80, 443 mở |
| SSH | Key-only đạt; password-only bị từ chối |
| UFW | Active; allow OpenSSH, 80/tcp, 443/tcp |
| Chứng chỉ | Certbot cấp cho apex và `www`; `certbot renew --dry-run` đạt |
| Public artifact | 181 file; các verifier public/security/SEO/publication/performance đều đạt |
| URL nhạy cảm | 404 qua production |
| Draft RLS | Probe khách trả danh sách rỗng |
| Dữ liệu user | Probe khách bị chặn hoặc trả danh sách rỗng |
| Private Storage | Probe list bucket trả danh sách rỗng |
| Upload limits | `project-images`: 10 MB và allowlist ảnh; `private-documents`: 50 MB và allowlist tài liệu/ảnh |
| Profile grants | `authenticated` không có `UPDATE` toàn bảng; `email`, `role`, `auth_user_id` đều không có quyền cập nhật |
| Profile guard | Trigger production tồn tại; user thường chỉ được cập nhật `last_active_at`, admin giữ quyền sửa tên/điện thoại |
| Authenticated matrix | User A/B cách ly; tự nâng role bị chặn; admin/user/project/Storage đúng quyền; dữ liệu tạm đã dọn sạch |

Đã đóng lỗ hổng cấu hình cho phép user tự cập nhật `role` trên dòng profile của mình và kiểm chứng bằng phiên đăng nhập thật. Phần Auth còn lại chưa kiểm chứng là recovery/callback email trên domain production.

## Bằng chứng hiệu năng

| Chỉ số lab | Mobile trước | Mobile sau | Desktop trước | Desktop sau |
|---|---:|---:|---:|---:|
| Performance | 56 | **98** | 74 | **100** |
| FCP | 9,1 giây | **1,9 giây** | 2,4 giây | **0,6 giây** |
| LCP | 9,8 giây | **1,9 giây** | 2,4 giây | **0,7 giây** |
| TBT | 0 ms | 0 ms | 0 ms | 0 ms |
| CLS | 0 | 0,01 | 0,012 | 0,002 |
| Dữ liệu tải | 2.916 KiB | **1.731 KiB** | 2.915 KiB | **1.730 KiB** |
| Request | 42 | **40** | 42 | **40** |

Thay đổi đã triển khai production:

1. Bộ Material Symbols 3.800+ icon được thay bằng font WOFF2 tự host gồm đúng 119 glyph, dung lượng 37.964 byte.
2. Loại lần gọi GET danh sách dự án bị trùng khi tải trang chủ; waterfall sau sửa còn một GET và một CORS preflight.
3. `seo.js`, location data, Supabase config/service và `main.js` trên trang chủ chuyển sang `defer` theo đúng thứ tự phụ thuộc.
4. Artifact mới đã build/verifier, backup bản web cũ và triển khai production. Rollback archive: `/home/noxhadmin/deploy-backups/noxh-current-20260915T043147Z.tar.gz`.

Phần còn có thể cải thiện là ảnh card dự án: bốn ảnh đầu vẫn chiếm khoảng 1,3 MiB. Cần pipeline thumbnail riêng để giảm tiếp mà vẫn giữ ảnh hero chất lượng cao.

## Thứ tự xử lý

1. Rà diff/secret, chạy lại build và verifier, rồi commit/push mốc source tương ứng bản production ngày 15/09; remote hiện vẫn ở `b540dbb` ngày 12/09.
2. Kiểm tra recovery/callback email trên domain production.
3. Theo dõi CSP Report-Only trong lúc QA; chỉ chuyển sang enforce và tăng HSTS sau khi không còn tài nguyên hợp lệ bị chặn.
4. Hiệu năng lab đã đạt; bước tiếp theo của nhóm này là thumbnail responsive cho card và theo dõi field CWV, không cần chặn việc sửa giao diện sau khi đã chốt mốc source.
5. Crawl toàn bộ URL production, thử Back/Forward/reload/slug cũ/404 trên mobile và desktop, rồi hoàn tất Search Console, monitoring và backup Supabase ngoài hệ thống.

## Lệnh kiểm tra lại

```powershell
$env:NOXH_SITE_URL='https://noxh.help'
npm run verify:production-security
```

Script này chỉ đọc production. Sau khi Nginx được vá, toàn bộ probe hiện có phải chạy hết không lỗi.
