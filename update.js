const fs = require('fs');
const htmlFile = 'homepage.html';
let content = fs.readFileSync(htmlFile, 'utf-8');

const reviews = [
    {name: "Nguyễn Hữu Dũng", text: "Giao diện thân thiện, dễ sử dụng. Rất hữu ích cho người có thu nhập thấp muốn tìm nhà."},
    {name: "Trần Thị Thanh Trúc", text: "Nhờ có hệ thống, tôi đã tiếp cận được thông tin minh bạch và nộp hồ sơ thành công. Rất cảm ơn đội ngũ hỗ trợ!"},
    {name: "Lê Minh Quang", text: "Đội ngũ tư vấn nhiệt tình, tôi đã tìm được Dự án phù hợp với gia đình mình."},
    {name: "Phạm Văn Cường", text: "Tính năng so sánh rất trực quan, giúp tôi dễ dàng quyết định mua căn hộ ở quận 9 thay vì quận 7."},
    {name: "Bùi Thu Hà", text: "Trước đây tôi không biết mình có đủ điều kiện mua NOXH không, nhờ website tôi đã tự kiểm tra được ngay."},
    {name: "Đặng Xuân Phong", text: "Quy trình thủ tục được giải thích rất rõ ràng, từng bước một. Không còn cảm giác mơ hồ nữa."},
    {name: "Ngô Kim Liên", text: "Công cụ tính khoản vay cực kỳ chính xác. Tôi đã lên được kế hoạch tài chính cụ thể trước khi mua."},
    {name: "Hoàng Chí Bảo", text: "Tôi thích nhất là có thể tra cứu tình trạng pháp lý của các dự án một cách nhanh chóng và an tâm."},
    {name: "Vũ Minh Tuấn", text: "Chỉ mất vài phút tôi đã tìm thấy các dự án đang mở bán gần nơi làm việc. Rất tiện lợi."},
    {name: "Đỗ Mai Phương", text: "Cộng đồng hỗ trợ rất tốt. Những câu hỏi thắc mắc của tôi đều được giải đáp nhanh gọn."}
];

function makeSliderItem(name, text) {
    return `<div class="slider-item">
<div class="bg-surface-container-lowest p-4 md:p-md rounded-lg shadow-[0_4px_20px_rgba(0,0,0,0.04)] text-center relative h-full flex flex-col justify-between">
<span class="material-symbols-outlined absolute top-4 left-4 text-4xl text-outline-variant/50">format_quote</span>
<p class="font-body-md text-[13px] md:text-body-md text-on-surface-variant italic mb-sm z-10 relative">
                                "${text}"
                            </p>
<div class="flex items-center justify-center gap-2 md:gap-sm mt-auto">
<div class="w-10 h-10 md:w-12 md:h-12 flex-shrink-0 rounded-full overflow-hidden bg-surface-container flex items-center justify-center">
<span class="material-symbols-outlined text-outline">person</span>
</div>
<div class="text-left min-w-0">
<h4 class="font-label-md text-[13px] md:text-label-md text-on-surface whitespace-nowrap truncate">${name}</h4>
<p class="font-label-sm text-[11px] md:text-label-sm text-on-surface-variant whitespace-nowrap truncate">Người dùng mới</p>
</div>
</div>
</div>
</div>`;
}

const setHtml = reviews.map(r => makeSliderItem(r.name, r.text)).join('\n');

const startMarker = '<!-- Set 1 -->';
const endMarker = '</div>\n</div>\n</section>';
const startIdx = content.indexOf(startMarker);
const searchArea = content.substring(startIdx);
const sectionEnd = searchArea.indexOf('</section>');
const endIdx = startIdx + sectionEnd;

if (startIdx > -1 && endIdx > -1) {
    const newContent = content.substring(0, startIdx) + "\n<!-- Set 1 -->\n" + setHtml + "\n<!-- Set 2 -->\n" + setHtml + "\n</div>\n</div>\n" + content.substring(endIdx);
    fs.writeFileSync(htmlFile, newContent, 'utf-8');
    console.log("Updated homepage.html");
} else {
    console.log("Could not find markers. startIdx:", startIdx, "endIdx:", endIdx);
}
