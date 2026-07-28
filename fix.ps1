$path = "f:\noxh.help\assets\js\admin.js"
$lines = Get-Content $path -Encoding UTF8
$lines[1768] = "                        alert('Vui lòng nhập đầy đủ câu hỏi và câu trả lời!');"
$lines[1806] = "                countEl.textContent = 'Tìm thấy ' + filteredList.length + ' câu hỏi phù hợp với từ khóa `"' + searchInput.value.trim() + '`"';"
$lines[1816] = "                container.innerHTML = '<div class=`"p-8 text-center bg-surface-container-lowest border border-outline-variant rounded-2xl text-on-surface-variant text-sm`">Không tìm thấy câu hỏi nào phù hợp với từ khóa `"' + searchInput.value.trim() + '`".</div>';"
$lines[1818] = "                container.innerHTML = '<div class=`"p-8 text-center bg-surface-container-lowest border border-outline-variant rounded-2xl text-on-surface-variant text-sm`">Chưa có câu hỏi FAQ nào trong mục này. Nhấp `"+ Thêm FAQ mới`" để thêm.</div>';"
Set-Content $path -Value $lines -Encoding UTF8
