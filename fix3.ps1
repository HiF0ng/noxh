$path = "f:\noxh.help\assets\js\admin.js"
$lines = Get-Content $path -Encoding UTF8
for ($i=0; $i -lt $lines.Length; $i++) {
    if ($lines[$i].Contains("countEl.textContent =") -and $lines[$i].Contains("filteredList.length")) {
        $lines[$i] = "                countEl.textContent = 'Tìm thấy ' + filteredList.length + ' câu hỏi phù hợp với từ khóa `"' + searchInput.value.trim() + '`"';"
    }
    if ($lines[$i].Contains("container.innerHTML =") -and $lines[$i].Contains("searchInput.value.trim()") -and $lines[$i].Contains("p-8")) {
        $lines[$i] = "                container.innerHTML = '<div class=`"p-8 text-center bg-surface-container-lowest border border-outline-variant rounded-2xl text-on-surface-variant text-sm`">Không tìm thấy câu hỏi nào phù hợp với từ khóa `"' + searchInput.value.trim() + '`".</div>';"
    }
    if ($lines[$i].Contains("container.innerHTML =") -and $lines[$i].Contains("FAQ") -and $lines[$i].Contains("p-8")) {
        $lines[$i] = "                container.innerHTML = '<div class=`"p-8 text-center bg-surface-container-lowest border border-outline-variant rounded-2xl text-on-surface-variant text-sm`">Chưa có câu hỏi FAQ nào trong mục này. Nhấp `"+ Thêm FAQ mới`" để thêm.</div>';"
    }
    if ($lines[$i].Contains("alert(") -and $lines[$i].Contains("Vui")) {
        $lines[$i] = "                        alert('Vui lòng nhập đầy đủ câu hỏi và câu trả lời!');"
    }
}
Set-Content $path -Value $lines -Encoding UTF8
