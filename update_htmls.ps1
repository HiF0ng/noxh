$files = Get-ChildItem -Path '.' -Filter '*.html' -Exclude 'admin*.html'
foreach ($f in $files) {
    $content = Get-Content $f.FullName -Raw
    if ($content -notmatch 'supabase-config.js') {
        $content = $content -replace '<script src="assets/js/main.js"></script>', "<script src=`"assets/js/supabase-config.js`"></script>`r`n    <script src=`"assets/js/supabase-service.js`"></script>`r`n    <script src=`"assets/js/main.js`"></script>"
        Set-Content -Path $f.FullName -Value $content -Encoding UTF8
        Write-Host "Updated $($f.Name)"
    }
}
