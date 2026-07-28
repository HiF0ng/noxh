$files = Get-ChildItem -Path '.' -Filter '*.html' -Exclude 'admin*.html'
foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    if ($content -notmatch 'supabase-config.js' -and $content -match 'assets/js/main.js') {
        $content = $content.Replace('<script src="assets/js/main.js"></script>', "<script src=`"assets/js/supabase-config.js`"></script>`r`n<script src=`"assets/js/supabase-service.js`"></script>`r`n<script src=`"assets/js/main.js`"></script>")
        Set-Content -Path $file.FullName -Value $content -Encoding UTF8
        Write-Host "Updated $($file.Name)"
    }
}
