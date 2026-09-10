# Mã 02 — Secrets và Git

Ngày: 10/09/2026. Phạm vi được duyệt gồm 02A–C. Báo cáo này không ghi giá trị secret, token, hash hay thông tin đăng nhập.

## Kết quả

| Phần | Kết quả |
|---|---|
| 02A — kiểm kê và ngăn lộ lại | Hoàn tất local: `.gitignore`, `.env.example`, cấu hình Gitleaks và bỏ theo dõi dữ liệu local/log/binary/Office lock/.env. |
| 02B — rotate/revoke | JWT của backend legacy local đã được tạo lại bằng 64 byte ngẫu nhiên; fallback JWT hardcode đã bị loại. Không có host khác sử dụng backend legacy theo xác nhận của người dùng, nên không cần rollout server. Publishable key Supabase được giữ nguyên vì nó là cấu hình public cho frontend. |
| 02C — lịch sử Git | Đã tạo bundle backup có kiểm tra toàn bộ lịch sử, clone mirror cô lập và viết lại 25 commit. Bản đã viết lại loại file nhạy cảm và các literal credential lịch sử. Cập nhật remote được thực hiện sau khi quét cuối và force push; các clone cũ cần clone lại. |

## Phân loại kiểm kê

- `server/.env`: JWT local legacy và Supabase publishable config. File đã ngừng theo dõi, còn giữ cục bộ và được ignore.
- `assets/js/supabase-config.js`: publishable key Supabase dùng trong browser. Đây không phải service-role/secret key và cần giữ trong frontend; dữ liệu an toàn phụ thuộc RLS, không phải việc che key này.
- `ApiServer.cs`, `server/src/utils/auth.ts`: JWT legacy fallback và seed credential. Fallback đã bị loại; entrypoint C# legacy dừng với thông báo retired.
- `database.json`, schema/seed legacy, binary/log/Office lock: không còn được Git theo dõi. Dữ liệu local không bị xóa trong quá trình `git rm --cached`.

## Kiểm tra

- Quét Gitleaks full-history trên lịch sử gốc: 6 findings, trong đó publishable Supabase và legacy local credentials.
- Quét full-history trên bản đã viết lại với `.gitleaks.toml`: 0 findings. Publishable key có allowlist hẹp theo đúng định dạng `sb_publishable_`; service-role/secret key vẫn bị quét.
- Đối chiếu file đã purge: `server/.env`, `database.json`, log, binary và Office lock không còn trong lịch sử viết lại.
- Bundle backup của toàn bộ refs đã được xác minh trước rewrite, được giữ ngoài web root cùng công cụ/audit report hạn chế truy cập.

## Điều cần biết khi remote cập nhật

Lịch sử public sẽ đổi commit SHA. Không có fork, tag hay pull request mở tại thời điểm kiểm tra. Khi force push hoàn tất, các clone cũ phải clone mới; không merge/push từ clone cũ để tránh đưa lịch sử nhạy cảm trở lại. Rotation là biện pháp chính: secret cũ không còn được backend legacy mới sử dụng.

## Phần không khẳng định

- Chưa xác minh Supabase production RLS, Storage policy, Site URL hoặc key inventory trong Dashboard; việc này thuộc mã 05.
- Không khẳng định browser/API live sau thay đổi vì backend legacy không còn dùng và chưa có staging. Mã 03/04/09 sẽ xác minh artifact/Nginx/browser.
