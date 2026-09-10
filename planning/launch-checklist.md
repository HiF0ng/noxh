# Danh sách triển khai NOXH

Cập nhật: 10/09/2026. Đây là danh sách đã trao đổi với người dùng, bổ sung việc mua VPS/domain.

## Quy tắc duyệt

- Người dùng yêu cầu xác nhận từng hạng mục trước khi làm.
- Đã duyệt: **01** và **02A–C**. Yêu cầu mới nhất: “01 đã hoàn thành và chỉ chờ có VPS và domain thôi là được đúng không? Thực hiện mã 02 A đến C”.
- Chưa duyệt: các mã còn lại, kể cả mua dịch vụ, migration RLS live, DNS và go-live.
- Một mã được duyệt không tự động duyệt các mã phụ thuộc. Ghi riêng kết quả khảo sát, thay đổi local, kiểm thử staging và xác minh production.
- Không lưu secret hoặc thông tin thanh toán trong tài liệu/Git.

## Bảng thứ tự

| Thứ tự | Mã duyệt | Nội dung | Trạng thái |
|---:|---|---|---|
| 1 | 01 | Chốt kiến trúc và kiểm kê phụ thuộc server cũ | Đã duyệt; đã chốt và kiểm kê, nghiệm thu runtime còn chờ staging |
| 2 | 02A–C | Secrets, Git và xử lý lịch sử | Hoàn tất; lịch sử GitHub đã làm sạch |
| 3 | 05A–C | Supabase: RLS, Storage, admin và Auth | 05A hoàn tất; 05B source/migration đã chuẩn bị, chờ staging; 05C chờ duyệt production |
| 4 | 11A–E | Chọn/mua VPS, domain; thiết lập tài khoản, VPS và DNS ban đầu | Chờ duyệt phương án và chi phí trước khi mua |
| 5 | 03 | Tách public build | Hoàn tất; artifact allowlist đã kiểm tra |
| 6 | 04A–B | Nginx, staging và HTTPS staging | Chờ duyệt |
| 7 | 06A–C | Metadata, trang riêng tư, robots/sitemap/404 | Chờ duyệt từng phần |
| 8 | 07 | HTML từng dự án và cơ chế xuất bản | Chờ duyệt |
| 9 | 08 | CSS, ảnh và hiệu năng | Chờ duyệt |
| 10 | 09A | QA staging | Chờ duyệt |
| 11 | 04C + 09B | DNS/HTTPS production, kiểm tra và mở website chính thức | Duyệt sau kết quả QA |
| 12 | 10 | Search Console, analytics, backup và monitoring | Chờ duyệt |

Domain được chọn/mua sớm để kiểm tra HTTPS và Auth callback bằng domain thật. Chuyển traffic production sau QA. Chuẩn bị backup, cảnh báo thiết yếu và phương án rollback trước go-live; Search Console và theo dõi index sau khi mở site.

## 01 — Kiến trúc và server cũ

- Chốt Nginx + frontend sinh HTML sẵn + Supabase; giữ HTML/JS hiện có, không yêu cầu chuyển toàn bộ sang React/Next.js.
- Rà đăng nhập, dự án, tài liệu, upload, dashboard và các phụ thuộc C#/PowerShell/Express/JSON local.
- Chuyển phụ thuộc server cũ còn hoạt động nếu phát hiện; loại các tham chiếu không dùng.
- Quy định loại server cũ khỏi bản triển khai; chỉ xóa sau khi đủ bằng chứng không còn cần dữ liệu/chức năng của chúng.
- Đầu ra: [quyết định kiến trúc, bảng giữ/bỏ/chuyển và cách vận hành](architecture-01.md).
- Nghiệm thu nguồn: không còn tham chiếu API localhost/server cũ trong frontend được kiểm kê.
- Nghiệm thu runtime: các luồng chính chạy trên staging không có backend cũ; ghi nhận network trình duyệt. Điều kiện này còn chờ mã 03/04/09, không đánh dấu đạt chỉ từ quét mã.

## 02 — Secrets và Git

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

- **04A:** chuẩn bị cấu hình staging/production; host chuẩn, HTTP→HTTPS, dấu `/` cuối, routing và redirect `.html`/`?id=` bằng bảng ánh xạ.
- **04B:** áp dụng staging có kiểm soát truy cập và HTTPS; kiểm tra direct URL/reload, cache, nén, headers và rollback.
- **04C:** sau QA, áp dụng DNS/HTTPS production, kiểm tra trước và sau khi mở traffic.
- URL sai trả HTTP 404; không fallback tất cả URL về trang chủ 200. Asset có hash cache dài; HTML/sitemap cập nhật được; dữ liệu riêng tư không cache chung.
- CSP triển khai ở chế độ báo cáo trước khi siết; kiểm tra script inline, font và Supabase. Cấu hình gia hạn chứng chỉ, log, quyền triển khai và firewall phối hợp mã 11.
- Đầu ra: cấu hình Nginx, hướng dẫn triển khai/khôi phục và kiểm tra HTTP.
- Nghiệm thu: cấu hình hợp lệ, không redirect loop/mixed content/lộ file; HTTPS và routing đúng.

## 05 — Supabase production

- **05A:** đọc trực tiếp RLS, grants, policies, functions, triggers, buckets, Site URL và redirect allowlist; báo cáo hiện trạng.
- **05B:** sửa và thử migration trên staging, gồm điều kiện công khai/draft thống nhất; sửa thứ tự cài mới để không khôi phục policy mở.
- **05C:** backup, duyệt và áp dụng production; đọc lại cấu hình và thử quyền thực tế.
- Khách chỉ đọc nội dung công khai; user chỉ thao tác dữ liệu riêng; admin lấy quyền từ nguồn đáng tin phía server; build dùng quyền tối thiểu và chỉ xuất trường public.
- Chống tự nâng role/đổi chủ sở hữu; rà upload/ghi đè/xóa/tải file; tách private bucket khi tài liệu yêu cầu đăng nhập.
- Rà Site URL, staging/production callback, email recovery. Rà các hàm legacy thao tác `password_hash`/profile, không coi profile row là tài khoản Supabase Auth.
- Đầu ra: ma trận quyền, báo cáo live, migration và kết quả kiểm tra.
- Nghiệm thu: thử API bằng khách, user A, user B và admin; khách không đọc draft, A không đọc dữ liệu B, user không nâng quyền, admin thao tác đúng.

## 06 — SEO nền tảng, trang riêng tư và crawl

- **06A:** bảng URL/title/description/canonical/OG/Twitter/robots; chuẩn hóa tiếng Việt và thương hiệu; metadata trong HTML ban đầu và cập nhật đúng khi SPA/Back/Forward; rà H1, nội dung public tải bằng JS, query/filter/pagination/compare.
- **06B:** `noindex, nofollow` cho admin/login/signup/recovery/settings/saved; loại sitemap; auth/RLS bảo vệ dữ liệu. Login/recovery vẫn truy cập được khi chưa đăng nhập. Chờ chốt có yêu cầu chặn cả HTML riêng tư phía server hay không; nếu có, thêm gateway kiểm tra phiên, không dùng localStorage làm bằng chứng cho Nginx.
- **06C:** robots theo môi trường; sitemap chỉ canonical public trả 200, `lastmod` theo thay đổi nội dung; giao diện 404 đi cùng HTTP 404 thật.
- Không dùng noindex thay cho xác thực; không chặn robots rồi kỳ vọng crawler đọc noindex trên trang đó.
- Đầu ra: bảng SEO, metadata, sitemap/robots/404 và chính sách truy cập.
- Nghiệm thu: không thiếu/trùng metadata, không sai canonical sau điều hướng, không có draft/private/error/redirect trong sitemap, dữ liệu riêng tư không truy cập trái quyền.

## 07 — SEO dự án và xuất bản

- Lưu slug duy nhất trong database, xử lý tên trùng; đổi tên không tự đổi URL; đổi slug có 301 từ slug cũ.
- Sinh HTML và metadata theo từng dự án published: nội dung chính, H1, breadcrumb, canonical, OG/Twitter, JSON-LD đúng dữ liệu thật.
- Escape/sanitize nội dung admin trước khi xuất HTML/JSON-LD; không tạo thông tin còn thiếu hoặc dữ liệu nội bộ.
- Hàng đợi build có retry, trạng thái đang xuất bản/đã xuất bản/lỗi; xuất bản HTML và sitemap cùng phiên bản, chuyển bản phát hành đồng bộ.
- Đề xuất độ trễ tối đa 5 phút, còn chờ duyệt. Nếu cần tức thì mỗi lượt truy cập, đánh giá render phía server riêng.
- Gỡ công khai ưu tiên chặn URL, xóa khỏi HTML/sitemap và xử lý cache; rollback không được phục hồi dự án đã gỡ. Phải kiểm tra cả ảnh/tài liệu liên quan nếu cần thu hồi quyền đọc.
- Đầu ra: bộ sinh trang, quản lý slug/redirect và cơ chế publish/unpublish.
- Nghiệm thu: không JS vẫn có nội dung chính; thử tạo/sửa/đổi slug/gỡ/build lỗi; draft không có trang public.

## 08 — CSS, ảnh, hiệu năng

- Build Tailwind phiên bản tương thích; quét HTML/JS và class động; bỏ CDN runtime, tài nguyên trùng và giảm script chặn hiển thị.
- Ảnh card/hero/gallery có kích thước phù hợp, WebP/AVIF khi có lợi, fallback, `srcset/sizes`, width/height; lazy-load ngoài màn hình, ưu tiên ảnh LCP.
- Áp dụng ảnh cũ và upload mới; giữ hero/gallery độc lập và skeleton khi thiếu ảnh; kiểm tra chữ trên mặt bằng sau nén.
- Chuyển/xóa ảnh gốc Storage là bước riêng sau backup và kiểm chứng.
- Đầu ra: CSS build, pipeline ảnh, so sánh dung lượng và tốc độ.
- Nghiệm thu: không lệch desktop/mobile, ảnh rõ; mục tiêu field p75 LCP ≤2,5s, INP ≤200ms, CLS ≤0,1. Lighthouse staging là dữ liệu thử, không phải xác nhận field CWV.

## 09 — QA và go-live

- **09A:** browser thật desktop/mobile/tablet; URL dán/reload/Back/Forward/URL cũ/slug sai/gỡ dự án; auth/lưu dự án/profile/upload/download/role; lọc kết hợp/phân trang/carousel/ảnh thiếu.
- Reset password bằng email thật: nhập tay, paste, OTP/liên kết theo cấu hình Auth, hết hạn, đổi mật khẩu hoàn tất.
- Crawl, metadata/canonical/status/sitemap/structured data, Lighthouse; lỗi mạng/Supabase/build/cache cũ; thử rollback.
- **09B:** xem báo cáo staging rồi duyệt go-live; kiểm tra nhanh lại domain production sau chuyển traffic.
- Đầu ra: ca kiểm thử, bằng chứng, lỗi còn lại và quyết định go-live.
- Nghiệm thu: luồng cốt lõi đạt; không còn lỗi nghiêm trọng về quyền, dữ liệu, xuất bản, auth hoặc routing.

## 10 — Vận hành

- Search Console: tài khoản sở hữu, xác minh domain, submit sitemap, kiểm tra URL mẫu, index/canonical/crawl/CWV khi có dữ liệu.
- Chọn analytics và chi phí; pageview SPA không trùng/thiếu, đo tìm/lọc/xem dự án và chuyển đổi; thay thống kê local bằng nguồn tập trung khi được duyệt.
- Monitoring uptime/5xx/JS/Supabase/build/disk/chứng chỉ; xác định người nhận cảnh báo.
- Backup database, Storage và cấu hình; thời gian lưu và kiểm thử restore. Chuẩn bị backup và cảnh báo cốt lõi trước go-live, hoàn thiện đo lường sau launch.
- Đề xuất kiểm tra hằng ngày tuần đầu, hằng tuần trong tháng đầu; chỉ là kế hoạch, chưa tạo automation.
- Đầu ra: dashboard, cảnh báo, lịch backup và runbook.
- Nghiệm thu: sự kiện đúng, cảnh báo thử đến người nhận, restore thử thành công; submit sitemap không đảm bảo Google index tất cả.

## 11 — VPS, domain và thiết lập ban đầu

- **11A:** so sánh cấu hình/nhà cung cấp VPS, domain, phí ban đầu/gia hạn; người dùng duyệt trước thanh toán.
- **11B:** mua bằng tài khoản thuộc người dùng; email khôi phục, 2FA, khóa chuyển domain và gia hạn.
- **11C:** hệ điều hành, SSH key, tài khoản triển khai, firewall, cập nhật bảo mật, múi giờ, quyền thư mục.
- **11D:** quản lý DNS, staging subdomain, bản ghi cần thiết và chuẩn bị domain production; không chuyển traffic chính trước QA.
- **11E:** bàn giao cấu hình, phí định kỳ, ngày gia hạn, cách truy cập/khôi phục; secret ngoài Git.
- Đầu ra: phương án chi phí đã duyệt, VPS/domain thuộc người dùng, hồ sơ cấu hình đã che thông tin bí mật.
- Nghiệm thu: SSH key hoạt động, firewall đúng, DNS staging phân giải; Nginx/HTTPS website ở mã 04.

## Nhật ký

- 10/09/2026: lưu toàn bộ danh sách 01–11 và thứ tự triển khai; duyệt duy nhất mã 01.
- 10/09/2026: hoàn tất quyết định kiến trúc và kiểm kê nguồn mã 01; xóa hằng API localhost không dùng, tăng phiên bản script admin. Ghi các chức năng chưa hoàn chỉnh và điều kiện nghiệm thu runtime trong tài liệu kiến trúc; chưa thực hiện các mã khác.
- 10/09/2026: mã 02 đã kiểm kê 25 commit và remote public; thêm ignore/template/secret scanner; thay JWT legacy local, loại default credential, chuẩn bị lịch sử đã làm sạch và bản sao lưu xác minh. Remote sẽ chỉ được cập nhật sau khi quét lại bản lịch sử đã viết lại.
- 10/09/2026: mã 02 force-push lịch sử GitHub đã làm sạch sau khi quét 0 finding; không có fork/tag/PR mở tại lúc xử lý. Mã 03 đã hoàn tất: build allowlist xuất 46 file vào `dist/public`, kiểm tra không có đường dẫn/marker restricted.
- 10/09/2026: thực hiện phần REST/source của 05A chỉ đọc: REST production xác nhận khách đang đọc dự án/tài liệu/FAQ; chưa có draft ở thời điểm kiểm tra. Source policy public chưa chặn draft và script schema cũ có thể mở toàn bộ RLS/Storage. Dashboard chưa đăng nhập nên bucket, Site URL và redirect allowlist cần xác minh trước khi chốt 05A. Xem `planning/supabase-audit-05a.md`.
- 10/09/2026: chốt 05A bằng Dashboard chỉ đọc: xác nhận live policy đọc public cho projects/documents đang là `true`; Storage `project-images` public, nhưng upload/update/delete giới hạn bằng `is_admin()`; Site URL và redirect allowlist chỉ có localhost. Quyền admin thật, tài khoản A/B, tạo profile Auth và migration khắc phục sẽ thực hiện ở 05B/05C.
- 10/09/2026: người dùng xác nhận đã kiểm thử thành công luồng reset password đầy đủ ở môi trường local. Cần lặp lại ở HTTPS staging sau khi có VPS/domain để xác nhận callback và email với domain thật.
- 10/09/2026: 05B đã chuẩn bị migration RLS/Storage, chuyển draft dự án sang SQL column, private bucket cho tài liệu mới, signed download, loại API `password_hash` legacy và chặn schema bootstrap mở quyền. Đã chạy kiểm tra cú pháp, contract bảo mật và public build; chưa chạy SQL hay thay đổi Supabase. Xem `planning/supabase-05b.md`.
