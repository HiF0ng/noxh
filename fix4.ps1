$path = "f:\noxh.help\assets\js\admin.js"
$lines = Get-Content $path -Encoding UTF8
$correct = Get-Content "f:\noxh.help\correct_strings.txt" -Encoding UTF8

for ($i=0; $i -lt $lines.Length; $i++) {
    if ($lines[$i].Contains("countEl.textContent =") -and $lines[$i].Contains("filteredList.length")) {
        $lines[$i] = $correct[1]
    }
    if ($lines[$i].Contains("container.innerHTML =") -and $lines[$i].Contains("searchInput.value.trim()") -and $lines[$i].Contains("p-8")) {
        $lines[$i] = $correct[2]
    }
    if ($lines[$i].Contains("container.innerHTML =") -and $lines[$i].Contains("FAQ") -and $lines[$i].Contains("p-8")) {
        $lines[$i] = $correct[3]
    }
    if ($lines[$i].Contains("alert(") -and $lines[$i].Contains("Vui")) {
        $lines[$i] = $correct[0]
    }
}
Set-Content $path -Value $lines -Encoding UTF8
