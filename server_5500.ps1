param(
    [int]$Port = 5500
)

$port = $Port
$root = $PSScriptRoot
if ([string]::IsNullOrEmpty($root)) { $root = "d:\noxh" }

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")
try {
    $listener.Start()
    Write-Host "Server started successfully on http://localhost:$port/"
} catch {
    Write-Host "Error starting server: $_"
    exit 1
}

while ($listener.IsListening) {
    try {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response
        
        $localPath = $request.Url.LocalPath.TrimEnd('/')
        if ([string]::IsNullOrEmpty($localPath) -or $localPath -eq "/") { $localPath = "/homepage.html" }
        elseif ($localPath -eq "/trang-chu") { $localPath = "/homepage.html" }
        elseif ($localPath -eq "/du-an") { $localPath = "/all-projects.html" }
        elseif ($localPath -eq "/tai-lieu") { $localPath = "/documents.html" }
        elseif ($localPath -eq "/cau-hoi-thuong-gap") { $localPath = "/faq.html" }
        elseif ($localPath -eq "/so-sanh") { $localPath = "/compare.html" }
        elseif ($localPath -eq "/tinh-khoan-vay") { $localPath = "/loan.html" }
        elseif ($localPath.StartsWith('/du-an/')) { $localPath = "/details.html" }
        $filePath = Join-Path $root $localPath.TrimStart('/').Replace('/', '\')
        
        if (Test-Path $filePath -PathType Leaf) {
            $extension = [System.IO.Path]::GetExtension($filePath).ToLower()
            $mime = "text/html; charset=utf-8"
            switch ($extension) {
                ".html" { $mime = "text/html; charset=utf-8" }
                ".css"  { $mime = "text/css; charset=utf-8" }
                ".js"   { $mime = "application/javascript; charset=utf-8" }
                ".png"  { $mime = "image/png" }
                ".jpg"  { $mime = "image/jpeg" }
                ".svg"  { $mime = "image/svg+xml" }
                ".json" { $mime = "application/json; charset=utf-8" }
                ".woff" { $mime = "font/woff" }
                ".woff2"{ $mime = "font/woff2" }
                ".ttf"  { $mime = "font/ttf" }
            }
            
            $bytes = [System.IO.File]::ReadAllBytes($filePath)
            $response.ContentType = $mime
            $response.ContentLength64 = $bytes.Length
            $response.StatusCode = 200
            $response.AddHeader("Access-Control-Allow-Origin", "*")
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
        } else {
            $response.StatusCode = 404
            $buffer = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found")
            $response.ContentLength64 = $buffer.Length
            $response.OutputStream.Write($buffer, 0, $buffer.Length)
        }
        $response.Close()
    } catch {
        # ignore disconnects
    }
}
