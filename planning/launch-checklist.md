# Danh sách triển khai NOXH

Cập nhật: 15/09/2026. Website đã chạy production tại `https://noxh.help`. Báo cáo kiểm tra gần nhất: [production-audit-20260915.md](production-audit-20260915.md).

## Quy tắc duyệt

- Trạng thái phải tách rõ kiểm tra source/local, probe production ẩn danh và kiểm thử production sau đăng nhập.
- Không đánh dấu đạt phân quyền chỉ từ SQL, quét source hoặc một tài khoản; mã 05/09 cần ma trận khách, user A, user B và admin.
- Lighthouse là dữ liệu lab; Core Web Vitals thực tế chỉ chốt khi có đủ dữ liệu người dùng.
- Không lưu secret hoặc thông tin thanh toán trong tài liệu/Git.

## Bảng thứ tự

| Thứ tự | Mã duyệt | Nội dung | Trạng thái |
|---:|---|---|---|
| 1 | 01 | Chốt kiến trúc và kiểm kê phụ thuộc server cũ | Hoàn tất ở source; production đang chạy Nginx + static build + Supabase |
| 2 | 02A–C | Secrets, Git và xử lý lịch sử | Hoàn tất theo mốc production 15/09; commit `90d71c7` đã được chốt và xác nhận trên GitHub |
| 3 | 05A–C | Supabase: RLS, Storage, admin và Auth | RLS/Storage/profile guard và ma trận khách-user A-user B-admin đạt; recovery email/OTP production đã kiểm thử thành công; còn backup Supabase ngoài hệ thống |
| 4 | 11A–E | VPS, domain, tài khoản, SSH và DNS | Gần hoàn tất; domain/Cloudflare/VPS/UFW/key-only SSH đạt; 2FA/transfer lock/múi giờ chưa ghi nhận bằng chứng |
| 5 | 03 | Tách public build | Hoàn tất; 181 file production từ allowlist, URL nội bộ nhạy cảm trả 404 |
| 6 | 04A–C | Nginx, routing và HTTPS | HTTPS/Certbot/404 đạt; `www` chuyển thẳng HTTPS, HSTS và CSP Report-Only đã bật; còn kiểm tra redirect URL cũ và theo dõi CSP trước khi enforce |
| 7 | 06A–C | Metadata, trang riêng tư, robots/sitemap/404 | Hoàn tất source/build/deploy; crawl production đạt 137/137 URL HTTP 200, title/canonical/OG/JSON-LD đầy đủ; URL sai vẫn HTTP 404 |
| 8 | 07 | HTML từng dự án và cơ chế xuất bản | 127 trang published, 0 draft qua public API; MK Central City Phan Rang đã build/deploy và hiển thị `MK Holdings` trong HTML tĩnh; còn test publish/unpublish, đổi slug/301 và rollback |
| 9 | 08 | CSS, ảnh và hiệu năng | Lab đạt sau tối ưu: Lighthouse mobile 98, desktop 100, mobile LCP 1,9 giây; còn ảnh card và field CWV |
| 10 | 09A–B | QA staging/production và go-live | Go-live, QA role/data/upload/download, email/OTP và browser/device đã đạt; crawl đã đạt; còn publish/unpublish, rollback và các kiểm tra vận hành |
| 11 | 10 | Search Console, analytics, backup và monitoring | VPS backup có checksum đã tạo; còn Supabase offsite backup/restore, Search Console và monitoring |
| 12 | 12 | Quảng cáo và kiếm tiền từ website | Hoãn đến khi bảo mật, hiệu năng và QA production đạt |

Ưu tiên hiện tại: hoàn tất publish/unpublish và diễn tập rollback, backup Supabase ngoài hệ thống, Search Console và monitoring. Commit production, recovery email/OTP, browser/device QA, production build/deploy và crawl sitemap đã được xác nhận.

## 01 — Kiến trúc và server cũ

- Chốt Nginx + frontend sinh HTML sẵn + Supabase; giữ HTML/JS hiện có, không yêu cầu chuyển toàn bộ sang React/Next.js.
- Rà đăng nhập, dự án, tài liệu, upload, dashboard và các phụ thuộc C#/PowerShell/Express/JSON local.
- Chuyển phụ thuộc server cũ còn hoạt động nếu phát hiện; loại các tham chiếu không dùng.
- Quy định loại server cũ khỏi bản triển khai; chỉ xóa sau khi đủ bằng chứng không còn cần dữ liệu/chức năng của chúng.
- Đầu ra: [quyết định kiến trúc, bảng giữ/bỏ/chuyển và cách vận hành](architecture-01.md).
- Nghiệm thu nguồn: không còn tham chiếu API localhost/server cũ trong frontend được kiểm kê.
- Nghiệm thu runtime: các luồng chính chạy trên staging không có backend cũ; ghi nhận network trình duyệt. Điều kiện này còn chờ mã 03/04/09, không đánh dấu đạt chỉ từ quét mã.

## 02 — Secrets và Git

- **Tiến độ 2026-09-15:** `main` và `origin/main` đang ở commit `b540dbb` ngày 12/09, trong khi toàn bộ thay đổi production ngày 15/09, cấu hình triển khai, migration và script kiểm tra còn nằm trong working tree. Cần chạy lại build/verifier/secret scan, rà diff rồi commit/push một mốc production có thể khôi phục trước khi trộn thêm thay đổi giao diện.
- **02A:** kiểm kê file hiện tại/lịch sử có che giá trị; phân biệt public config và secret; ngừng track `.env`, thêm ignore và `.env.example`; xử lý file local/log.
- **02B:** rotate/revoke secret còn hiệu lực bị lộ, cập nhật nơi sử dụng, kiểm tra dịch vụ với secret mới và xác nhận secret cũ bị vô hiệu.
- **02C:** nếu cần, lập và duyệt phương án viết lại lịch sử Git; phối hợp các clone, branch/tag và remote liên quan.
- Đầu ra: báo cáo đã che giá trị, thay đổi repo, kết quả rotate và kế hoạch lịch sử nếu cần.
- Nghiệm thu: commit/build không chứa secret; secret cũ không còn hoạt động; các chức năng hợp lệ vẫn chạy. Xóa file khỏi commit mới không thay thế rotate.

## 03 — Public build

- Dùng `dist/public/` làm web root, sinh từ danh sách file được phép xuất.
- Tách template, script build, migration và cấu hình khỏi tài nguyên phục vụ HTTP; không copy toàn repo rồi mới lọc.
- Chỉ xuất HTML/CSS/JS/font/ảnh/tài liệu public và JSON đã chọn trường; không xuất dump, SQL, `.env`, `.git`, log hay mã backend.
- Rà đường dẫn asset/component ở `/du-an/{slug}`; tài liệu yêu cầu đăng nhập phải đi qua Storage/API có quyền.
- Đầu ra: cấu trúc, lệnh build, danh sách xuất và kiểm tra nội dung artifact.
- Nghiệm thu: tài nguyên public hoạt động; URL đến file nội bộ trả 403/404. JS gửi cho trình duyệt vẫn là công khai.

## 04 — Nginx và triển khai

- **Tiến độ 2026-09-15:** production phục vụ HTTPS, direct URL và 404 đúng; Certbot dry-run đạt. Đã sửa `www` chuyển thẳng tới `https://noxh.help`, bật HSTS thử nghiệm 1 ngày và CSP Report-Only. `nginx -t`, reload, response headers và toàn bộ probe production đều đạt. Rollback Nginx: `/etc/nginx/sites-available/noxh.help.before-security-20260915T043938Z`.
- **04A:** chuẩn bị cấu hình staging/production; host chuẩn, HTTP→HTTPS, dấu `/` cuối, routing và redirect `.html`/`?id=` bằng bảng ánh xạ.
- **04B:** áp dụng staging có kiểm soát truy cập và HTTPS; kiểm tra direct URL/reload, cache, nén, headers và rollback.
- **04C:** sau QA, áp dụng DNS/HTTPS production, kiểm tra trước và sau khi mở traffic.
- URL sai trả HTTP 404; không fallback tất cả URL về trang chủ 200. Asset có hash cache dài; HTML/sitemap cập nhật được; dữ liệu riêng tư không cache chung.
- CSP triển khai ở chế độ báo cáo trước khi siết; kiểm tra script inline, font và Supabase. Cấu hình gia hạn chứng chỉ, log, quyền triển khai và firewall phối hợp mã 11.
- Đầu ra: cấu hình Nginx, hướng dẫn triển khai/khôi phục và kiểm tra HTTP.
- Nghiệm thu: cấu hình hợp lệ, không redirect loop/mixed content/lộ file; HTTPS và routing đúng.

## 05 — Supabase production

- **Tiến độ 2026-09-15:** migration bảo mật, giới hạn bucket và bản vá chống tự nâng role đã áp dụng production. Probe khách và ma trận đăng nhập user A/user B/admin đều đạt: user không đọc/sửa chéo, không tự nâng role hoặc sửa profile identity; admin đọc/sửa user và quản lý draft; quan hệ lưu/theo dõi tách theo chủ sở hữu; upload/xóa ảnh và tài liệu chỉ dành cho admin, tải ảnh public và ký URL tài liệu cho user đăng nhập hoạt động. Dữ liệu thử đã được dọn sạch. Đã sửa và kiểm tra trên production lỗi lần gửi recovery đầu bị reload; còn kiểm thử hộp thư/OTP thật và backup Supabase ngoài hệ thống.
- **05A:** đọc trực tiếp RLS, grants, policies, functions, triggers, buckets, Site URL và redirect allowlist; báo cáo hiện trạng.
- **05B:** sửa và thử migration trên staging, gồm điều kiện công khai/draft thống nhất; sửa thứ tự cài mới để không khôi phục policy mở.
- **05C:** backup, duyệt và áp dụng production; đọc lại cấu hình và thử quyền thực tế.
- Khách chỉ đọc nội dung công khai; user chỉ thao tác dữ liệu riêng; admin lấy quyền từ nguồn đáng tin phía server; build dùng quyền tối thiểu và chỉ xuất trường public.
- Chống tự nâng role/đổi chủ sở hữu; rà upload/ghi đè/xóa/tải file; tách private bucket khi tài liệu yêu cầu đăng nhập.
- Rà Site URL, staging/production callback, email recovery. Rà các hàm legacy thao tác `password_hash`/profile, không coi profile row là tài khoản Supabase Auth.
- Đầu ra: ma trận quyền, báo cáo live, migration và kết quả kiểm tra.
- Nghiệm thu: thử API bằng khách, user A, user B và admin; khách không đọc draft, A không đọc dữ liệu B, user không nâng quyền, admin thao tác đúng.

## 06 — SEO nền tảng, trang riêng tư và crawl

- **Tiến độ 2026-09-15:** production trả 200 cho `/trang-chu`, 404 cho URL sai và các đường dẫn nội bộ nhạy cảm. Sau deploy JSON-LD, crawl sitemap đạt 137/137 URL HTTP 200; 137/137 có title, canonical, đủ OG title/description/url/image và JSON-LD.
- **06A:** bảng URL/title/description/canonical/OG/Twitter/robots; chuẩn hóa tiếng Việt và thương hiệu; metadata trong HTML ban đầu và cập nhật đúng khi SPA/Back/Forward; rà H1, nội dung public tải bằng JS, query/filter/pagination/compare.
- **06B:** `noindex, nofollow` cho admin/login/signup/recovery/settings/saved; loại sitemap; auth/RLS bảo vệ dữ liệu. Login/recovery vẫn truy cập được khi chưa đăng nhập. Chờ chốt có yêu cầu chặn cả HTML riêng tư phía server hay không; nếu có, thêm gateway kiểm tra phiên, không dùng localStorage làm bằng chứng cho Nginx.
- **06C:** robots theo môi trường; sitemap chỉ canonical public trả 200, `lastmod` theo thay đổi nội dung; giao diện 404 đi cùng HTTP 404 thật.
- Không dùng noindex thay cho xác thực; không chặn robots rồi kỳ vọng crawler đọc noindex trên trang đó.
- Đầu ra: bảng SEO, metadata, sitemap/robots/404 và chính sách truy cập.
- Nghiệm thu: status/title/canonical/OG/JSON-LD và sitemap đã đạt qua crawl production; không có draft/private/error/redirect trong sitemap; URL slug không tồn tại trả HTTP 404.

## 07 — SEO dự án và xuất bản

- **Tiến độ 2026-09-15:** production build có 127 trang dự án published; public Supabase API trả 127 bản ghi `is_draft=false` và 0 bản ghi `is_draft=true`. Verifier publication đạt; route dự án hiện tại trả 200 và slug không tồn tại trả 404. Ca kiểm tra FLC Phúc Khang Đại Mỗ cho thấy nút lưu đã cập nhật Supabase (`updated_at=16:01:17`) nhưng HTML pre-render production vẫn có dữ liệu cũ (`updated_at=14:06:09`), nên save backend chưa tự động publish lại static build. Sau đó đã sửa generator để render `investor` ngay trong HTML tĩnh, build/deploy lại cho MK Central City Phan Rang; production hiện trả `MK Holdings` đúng. Đã sửa thêm lỗi SPA mở chi tiết lần đầu: `getProjects()` nay map trường `investor`, renderer có fallback `investor || owner`, và asset `main.js` đã tăng cache-busting lên `v=101`; build, verifier và asset production đều đạt. Publish dự án mới, kiểm tra mở lần đầu và thời gian cập nhật đã đạt theo ca kiểm tra hiện có. Migration `is_hidden` đã chạy production; menu ba chấm ẩn/hiện/sửa/xóa, RLS, generator và sitemap đã build/deploy. Production trả admin asset `v=37`/service `v=20`, chi tiết asset `main v=102`, sitemap HTTP 200 có 127 dự án đang công khai. Còn cần thao tác admin thật để nghiệm thu ca ẩn rồi hiện lại một dự án. Slug hiện sinh tự động và chưa có field đổi slug, nên chưa thể nghiệm thu redirect 301. Rollback artifact production vẫn cần diễn tập.
- **Tiến độ 2026-09-11:** đã áp dụng migration slug/updated time cho production (121 dự án hợp lệ); bộ build sinh HTML dự án published, sitemap và JSON-LD đã kiểm tra bằng dữ liệu production. Chờ task 04 khi có VPS/domain để Nginx dùng redirect map làm HTTP 301 thật và triển khai release theo lịch tối đa 5 phút.
- Lưu slug duy nhất trong database, xử lý tên trùng; đổi tên không tự đổi URL; đổi slug có 301 từ slug cũ.
- Sinh HTML và metadata theo từng dự án published: nội dung chính, H1, breadcrumb, canonical, OG/Twitter, JSON-LD đúng dữ liệu thật.
- Escape/sanitize nội dung admin trước khi xuất HTML/JSON-LD; không tạo thông tin còn thiếu hoặc dữ liệu nội bộ.
- Hàng đợi build có retry, trạng thái đang xuất bản/đã xuất bản/lỗi; xuất bản HTML và sitemap cùng phiên bản, chuyển bản phát hành đồng bộ.
- Đề xuất độ trễ tối đa 5 phút, còn chờ duyệt. Nếu cần tức thì mỗi lượt truy cập, đánh giá render phía server riêng.
- Gỡ công khai ưu tiên chặn URL, xóa khỏi HTML/sitemap và xử lý cache; rollback không được phục hồi dự án đã gỡ. Phải kiểm tra cả ảnh/tài liệu liên quan nếu cần thu hồi quyền đọc.
- Đầu ra: bộ sinh trang, quản lý slug/redirect và cơ chế publish/unpublish.
- Nghiệm thu source/public read-only: không JS vẫn có nội dung chính, build chỉ xuất published, draft không có public API/page; route hiện tại và slug sai đã kiểm tra. Publish mới và cập nhật nội dung đã kiểm tra. Unpublish và đổi slug/301 là khoảng trống chức năng, không được đánh dấu đạt bằng thao tác xoá dữ liệu; rollback artifact production và quy trình khôi phục vẫn cần diễn tập.

## 08 — CSS, ảnh, hiệu năng

- **Tiến độ 2026-09-15:** lần đo đầu mobile 56/LCP 9,8 giây và desktop 74. Đã self-host font 119 glyph (37 KiB), bỏ GET dự án trùng và defer script trang chủ; bản mới đã deploy. Lighthouse sau sửa đạt mobile 98/LCP 1,9 giây, desktop 100/LCP 0,7 giây; payload còn khoảng 1,7 MiB do ảnh card. Chưa có đủ dữ liệu field CWV. Xem `production-audit-20260915.md`.
- **Tiến độ 2026-09-11:** hoàn tất phần mã nguồn: 33 HTML dùng Tailwind CSS build sẵn thay Play CDN; ảnh card/tài liệu lazy-load và có kích thước giữ bố cục; hero giữ ưu tiên LCP. Admin tự tối ưu ảnh raster mới thành WebP theo từng nhóm; floorplan giới hạn 2560px, chất lượng 94%, giữ SVG/GIF và ảnh nhỏ nguyên gốc. Ảnh Storage cũ chưa bị thay thế/xóa; chưa bật Supabase Image Transformations vì cần gói Pro và có thể phát sinh phí. Cache HTTP thực tế chờ task 04 (Nginx/VPS); đánh giá CWV và mobile thực hiện tại task 09 trên staging.
- Build Tailwind phiên bản tương thích; quét HTML/JS và class động; bỏ CDN runtime, tài nguyên trùng và giảm script chặn hiển thị.
- Ảnh card/hero/gallery có kích thước phù hợp, WebP/AVIF khi có lợi, fallback, `srcset/sizes`, width/height; lazy-load ngoài màn hình, ưu tiên ảnh LCP.
- Áp dụng ảnh cũ và upload mới; giữ hero/gallery độc lập và skeleton khi thiếu ảnh; kiểm tra chữ trên mặt bằng sau nén.
- Chuyển/xóa ảnh gốc Storage là bước riêng sau backup và kiểm chứng.
- Đầu ra: CSS build, pipeline ảnh, so sánh dung lượng và tốc độ.
- Nghiệm thu: không lệch desktop/mobile, ảnh rõ; mục tiêu field p75 LCP ≤2,5s, INP ≤200ms, CLS ≤0,1. Lighthouse staging là dữ liệu thử, không phải xác nhận field CWV.

## 09 — QA và go-live

- **Tiến độ 2026-09-15:** website đã go-live; ma trận role A/B/admin, dữ liệu riêng, upload/download, recovery email/OTP và browser/device QA đã đạt trên production. Crawl sitemap đạt 137/137 URL HTTP 200, metadata title/canonical/OG đầy đủ; còn publish/unpublish và diễn tập rollback.
- **09A:** browser thật desktop/mobile/tablet; URL dán/reload/Back/Forward/URL cũ/slug sai/gỡ dự án; auth/lưu dự án/profile/upload/download/role; lọc kết hợp/phân trang/carousel/ảnh thiếu.
- Reset password bằng email thật: nhập tay, paste, OTP/liên kết theo cấu hình Auth, hết hạn, đổi mật khẩu hoàn tất — đã kiểm thử production.
- Crawl, metadata/canonical/status/sitemap/structured data, Lighthouse; lỗi mạng/Supabase/build/cache cũ; thử rollback. Crawl sau deploy ngày 15/09: 137 URL, 0 lỗi status, 0 thiếu title/canonical/OG/JSON-LD; slug không tồn tại trả 404.
- **09B:** xem báo cáo staging rồi duyệt go-live; kiểm tra nhanh lại domain production sau chuyển traffic.
- Đầu ra: ca kiểm thử, bằng chứng, lỗi còn lại và quyết định go-live.
- Nghiệm thu: luồng cốt lõi đạt; không còn lỗi nghiêm trọng về quyền, dữ liệu, xuất bản, auth hoặc routing.

## 10 — Vận hành

- **Tiến độ 2026-09-15:** đã có backup VPS root-only kèm checksum và kiểm tra archive. Supabase Free không có scheduled backup; còn xuất database/Storage ra nơi khác, thử restore, Search Console và cảnh báo uptime/5xx/chứng chỉ/disk.
- Search Console: tài khoản sở hữu, xác minh domain, submit sitemap, kiểm tra URL mẫu, index/canonical/crawl/CWV khi có dữ liệu.
- Chọn analytics và chi phí; pageview SPA không trùng/thiếu, đo tìm/lọc/xem dự án và chuyển đổi; thay thống kê local bằng nguồn tập trung khi được duyệt.
- Monitoring uptime/5xx/JS/Supabase/build/disk/chứng chỉ; xác định người nhận cảnh báo.
- Backup database, Storage và cấu hình; thời gian lưu và kiểm thử restore. Chuẩn bị backup và cảnh báo cốt lõi trước go-live, hoàn thiện đo lường sau launch.
- Đề xuất kiểm tra hằng ngày tuần đầu, hằng tuần trong tháng đầu; chỉ là kế hoạch, chưa tạo automation.
- Đầu ra: dashboard, cảnh báo, lịch backup và runbook.
- Nghiệm thu: sự kiện đúng, cảnh báo thử đến người nhận, restore thử thành công; submit sitemap không đảm bảo Google index tất cả.

## 11 — VPS, domain và thiết lập ban đầu

- **Tiến độ 2026-09-15:** `noxh.help` dùng Cloudflare, HTTPS hoạt động; VPS Ubuntu/Nginx/UFW chỉ mở 22/80/443; tài khoản `noxhadmin` đăng nhập bằng ED25519 và SSH password đã tắt. Chưa ghi nhận bằng chứng 2FA/transfer lock tài khoản domain, múi giờ VPS và tài liệu khôi phục quyền truy cập.
- **11A:** so sánh cấu hình/nhà cung cấp VPS, domain, phí ban đầu/gia hạn; người dùng duyệt trước thanh toán.
- **11B:** mua bằng tài khoản thuộc người dùng; email khôi phục, 2FA, khóa chuyển domain và gia hạn.
- **11C:** hệ điều hành, SSH key, tài khoản triển khai, firewall, cập nhật bảo mật, múi giờ, quyền thư mục.
- **11D:** quản lý DNS, staging subdomain, bản ghi cần thiết và chuẩn bị domain production; không chuyển traffic chính trước QA.
- **11E:** bàn giao cấu hình, phí định kỳ, ngày gia hạn, cách truy cập/khôi phục; secret ngoài Git.
- Đầu ra: phương án chi phí đã duyệt, VPS/domain thuộc người dùng, hồ sơ cấu hình đã che thông tin bí mật.
- Nghiệm thu: SSH key hoạt động, firewall đúng, DNS staging phân giải; Nginx/HTTPS website ở mã 04.

## 12 — Quảng cáo và kiếm tiền

- Chỉ bắt đầu sau khi production đã HTTPS, QA 09B đạt, các URL public/canonical/404 hoạt động đúng và nội dung public đủ giá trị để xét duyệt.
- Dùng Google AdSense làm lựa chọn đầu tiên. Tài khoản, thông tin thuế và phương thức nhận tiền thuộc người dùng; không gửi thông tin đăng nhập hoặc thanh toán vào Git/chat.
- Trước khi nộp xét duyệt: rà nội dung gốc, nguồn/ngày cập nhật, trang giới thiệu/liên hệ/chính sách/điều khoản, khả năng crawler truy cập và trải nghiệm mobile.
- Khi có publisher ID: thêm script quảng cáo chỉ trên trang public, `ads.txt` ở domain gốc và CMP/cookie consent phù hợp. Không thêm publisher ID mẫu hoặc bật quảng cáo trước khi được duyệt.
- Đặt quảng cáo responsive thủ công sau nội dung có giá trị; không đặt ở admin, login, signup, reset password, settings, saved, quy trình nộp hồ sơ, tài liệu riêng tư hoặc sát nút tải/xác nhận. Không bật Auto Ads toàn site nếu chưa rà giao diện mobile.
- Theo dõi RPM, viewability, Core Web Vitals, lỗi chính sách và phản hồi người dùng; chỉ thử nền tảng khác hoặc bài tài trợ minh bạch khi có số liệu traffic thực tế.
- Đầu ra: cấu hình AdSense/CMP/ads.txt, vị trí quảng cáo đã duyệt, báo cáo tác động doanh thu và hiệu năng.
- Nghiệm thu: website được duyệt, `ads.txt` trả HTTP 200 với publisher ID đúng, không có quảng cáo ở luồng riêng tư, consent hoạt động theo khu vực và không có lỗi chính sách nghiêm trọng.

## Nhật ký

- 10/09/2026: lưu toàn bộ danh sách 01–11 và thứ tự triển khai; duyệt duy nhất mã 01.
- 10/09/2026: hoàn tất quyết định kiến trúc và kiểm kê nguồn mã 01; xóa hằng API localhost không dùng, tăng phiên bản script admin. Ghi các chức năng chưa hoàn chỉnh và điều kiện nghiệm thu runtime trong tài liệu kiến trúc; chưa thực hiện các mã khác.
- 10/09/2026: mã 02 đã kiểm kê 25 commit và remote public; thêm ignore/template/secret scanner; thay JWT legacy local, loại default credential, chuẩn bị lịch sử đã làm sạch và bản sao lưu xác minh. Remote sẽ chỉ được cập nhật sau khi quét lại bản lịch sử đã viết lại.
- 10/09/2026: mã 02 force-push lịch sử GitHub đã làm sạch sau khi quét 0 finding; không có fork/tag/PR mở tại lúc xử lý. Mã 03 đã hoàn tất: build allowlist xuất 46 file vào `dist/public`, kiểm tra không có đường dẫn/marker restricted.
- 10/09/2026: thực hiện phần REST/source của 05A chỉ đọc: REST production xác nhận khách đang đọc dự án/tài liệu/FAQ; chưa có draft ở thời điểm kiểm tra. Source policy public chưa chặn draft và script schema cũ có thể mở toàn bộ RLS/Storage. Dashboard chưa đăng nhập nên bucket, Site URL và redirect allowlist cần xác minh trước khi chốt 05A. Xem `planning/supabase-audit-05a.md`.
- 10/09/2026: chốt 05A bằng Dashboard chỉ đọc: xác nhận live policy đọc public cho projects/documents đang là `true`; Storage `project-images` public, nhưng upload/update/delete giới hạn bằng `is_admin()`; Site URL và redirect allowlist chỉ có localhost. Quyền admin thật, tài khoản A/B, tạo profile Auth và migration khắc phục sẽ thực hiện ở 05B/05C.
- 11/09/2026: hoàn tất source mã 06A–C: metadata HTML cho 12 trang public, cập nhật canonical/OG/Twitter khi SPA hoặc Back/Forward, noindex/nofollow cho 20 trang tài khoản/admin, `robots.txt`, trang `404.html`, và tạo sitemap theo `NOXH_SITE_URL` ở public build. Cần HTTPS/domain và Nginx ở mã 04/11 để kiểm tra HTTP 404, canonical tuyệt đối, sitemap thật và crawl trên staging.
- 10/09/2026: người dùng xác nhận đã kiểm thử thành công luồng reset password đầy đủ ở môi trường local. Cần lặp lại ở HTTPS staging sau khi có VPS/domain để xác nhận callback và email với domain thật.
- 10/09/2026: 05B đã chuẩn bị migration RLS/Storage, chuyển draft dự án sang SQL column, private bucket cho tài liệu mới, signed download, loại API `password_hash` legacy và chặn schema bootstrap mở quyền. Đã chạy kiểm tra cú pháp, contract bảo mật và public build; chưa chạy SQL hay thay đổi Supabase. Xem `planning/supabase-05b.md`.
- 15/09/2026: production Supabase đã áp dụng và đọc lại giới hạn Storage: `project-images` 10 MB với allowlist ảnh raster, `private-documents` 50 MB với allowlist PDF/Word/ZIP/JPG/PNG và vẫn private. Frontend chặn cùng loại/dung lượng, loại SVG công khai và build 179 file đạt toàn bộ verifier. SSH key ED25519 riêng đã đăng nhập thành công; backup VPS root-only có checksum đã được tạo và kiểm tra; SSH password-only bị từ chối sau khi reload cấu hình. Bản frontend bảo mật đã đồng bộ lên web root và production HTTPS tải bình thường.
- 15/09/2026: audit production xác nhận chỉ 22/80/443 mở, URL nội bộ nhạy cảm trả 404, probe khách không đọc draft/dữ liệu user/private Storage. Phát hiện `www` redirect xuống HTTP và thiếu HSTS/CSP; đã chuẩn bị bản vá Nginx an toàn có backup/validate/rollback. Lighthouse ban đầu đạt 56 mobile/74 desktop; sau tối ưu font icon, request dữ liệu và defer script, bản production đạt 98 mobile/100 desktop, mobile LCP 1,9 giây và payload khoảng 1,7 MiB. Xem `planning/production-audit-20260915.md`.
- 15/09/2026: đã áp dụng bản vá Nginx production. Xác minh `www` trả 301 trực tiếp tới HTTPS apex, HSTS `max-age=86400; includeSubDomains`, CSP Report-Only và Nginx active; script `verify:production-security` chạy hết không lỗi. Có bản rollback cấu hình tại `/etc/nginx/sites-available/noxh.help.before-security-20260915T043938Z`.
- 15/09/2026: phát hiện grant `UPDATE` toàn bảng `users` có thể cho user đã đăng nhập tự đổi `role` trên dòng của mình qua REST API dù giao diện không có nút tương ứng. Đã áp dụng `20260915_user_profile_column_privileges.sql`: thu hồi quyền toàn bảng, cấm cập nhật `email`/`role`/`auth_user_id`, cài trigger chỉ cho user thường ghi `last_active_at`; truy vấn sau migration trả `table_update=false` và `profile_guard_trigger=true`. Chờ chạy ma trận live bằng hai user và một admin.
- 15/09/2026: ma trận production bằng hai user và một admin đã đạt toàn bộ: liên kết Auth/profile và role đúng; không đọc/sửa chéo; không tự nâng role/sửa identity; admin sửa user; quyền saved/followed, project draft và Storage đúng thiết kế. Script xác nhận đã dọn toàn bộ row/object tạm sau kiểm tra.
- 15/09/2026: sửa lỗi lần đầu gửi biểu mẫu quên mật khẩu bị reload do router SPA không chạy script riêng của trang và mã khởi tạo phụ thuộc duy nhất vào `DOMContentLoaded`. Liên kết recovery nay dùng điều hướng đầy đủ, bộ khởi tạo chạy an toàn theo `document.readyState`, có chốt chống gắn listener lặp và đã tăng phiên bản asset. Build 181 file cùng các verifier public/security/SEO/publication/performance đều đạt; kiểm tra trực tiếp từ trang đăng nhập production xác nhận lần gửi đầu không reload và hiện lỗi email tại chỗ. Recovery email/OTP thật đã được người dùng xác nhận kiểm thử thành công.
- 15/09/2026: người dùng xác nhận đã hoàn tất xác nhận GitHub cho commit `90d71c7`, recovery email/OTP production và browser/device QA. Crawl sitemap production chỉ-đọc: sitemap HTTP 200, 137 URL; 137/137 URL HTTP 200, có title/canonical và đủ 4 thẻ OG; 11 trang tổng quát chưa có JSON-LD. Báo cáo crawl cần được dùng làm baseline trước khi bổ sung structured data.
- 15/09/2026: bổ sung JSON-LD `WebPage` + `WebSite` cho 12 trang public trong block SEO tĩnh; cập nhật `assets/js/seo.js` để duy trì JSON-LD khi SPA/back-forward; production build đạt 181 file allowlisted, gồm 126 trang dự án published; toàn bộ verifier đạt và đã deploy/crawl xác nhận production.
- 15/09/2026: đã deploy artifact 181 file vào `/var/www/noxh/current`. Crawl production sau deploy đạt 137/137 URL HTTP 200, đủ title/canonical/OG/JSON-LD; `/trang-chu`, `/du-an`, `robots.txt`, `sitemap.xml` trả 200 và slug không tồn tại trả 404.
- 15/09/2026: sửa lỗi dữ liệu chủ đầu tư bị hiện `Đang cập nhật` khi SPA điều hướng lần đầu vào chi tiết dự án. Nguyên nhân là mapping `getProjects()` chỉ có `owner`, thiếu `investor`; reload dùng HTML pre-render nên mới hiển thị đúng. Đã bổ sung mapping, fallback renderer và cache-busting `main.js?v=101`; `node --check`, `git diff --check`, build/verifier và kiểm tra asset production đều đạt.
- 15/09/2026: người dùng xác nhận publish dự án mới, kiểm tra mở lần đầu và cập nhật nội dung đã ổn. Admin chưa có unpublish/ẩn dự án; xoá là xoá database nên không dùng làm ca kiểm thử. Hệ thống chưa có field đổi slug; cần coi unpublish và slug/301 là hạng mục chức năng chưa triển khai. Bước tiếp theo an toàn là diễn tập rollback bằng artifact build trước trên VPS.
- 15/09/2026: đã bổ sung source cho ẩn/hiện dự án: migration `20260915_project_visibility.sql` thêm `projects.is_hidden` và policy public chỉ đọc dự án không nháp, không ẩn; admin dùng menu ba chấm có ẩn/hiện, sửa, xóa; generator/sitemap bỏ dự án ẩn và trang chi tiết kiểm tra lại RLS để không render HTML preloaded cũ. Đã kiểm tra cú pháp, CSS build và fixture publication; chờ chạy migration, build/deploy và kiểm thử production.
- 15/09/2026: migration `20260915_project_visibility.sql` đã chạy thành công trên Supabase. Bản build 182 file/127 trang dự án passed toàn bộ verifier, được deploy bằng `rsync --delete` sau khi tạo archive rollback `/home/noxhadmin/releases/noxh-before-visibility-20260915T094500Z.tgz`. CSS admin đã cache-bust lên `v=6` và có archive trước lần deploy cuối tại `/home/noxhadmin/releases/noxh-before-admin-css-20260915T095500Z.tgz`. Probe production: admin dùng `admin.js?v=37`, service `v=20`, CSS `v=6`; trang chi tiết dùng `main.js?v=102`, `robots.txt`/`sitemap.xml` HTTP 200; sitemap có 127 URL dự án. Chưa thực hiện click ẩn/hiện bằng admin production.
