$port = 3000
$root = "f:\noxh.help"
$listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::IPv6Any, $port)
$listener.Server.SetSocketOption([System.Net.Sockets.SocketOptionLevel]::IPv6, [System.Net.Sockets.SocketOptionName]::IPv6Only, $false)
$listener.Start()
Write-Host "Raw TCP Server listening on port $port (IPv4 & IPv6)"
try {
    while ($true) {
        $client = $listener.AcceptTcpClient()
        $stream = $client.GetStream()
        $reader = New-Object System.IO.StreamReader($stream)
        $writer = New-Object System.IO.StreamWriter($stream)
        
        $requestLine = $reader.ReadLine()
        if ([string]::IsNullOrWhiteSpace($requestLine)) {
            $client.Close()
            continue
        }
        
        $parts = $requestLine.Split(' ')
        if ($parts.Length -lt 2) {
            $client.Close()
            continue
        }
        
        $localPath = $parts[1]
        $localPath = $localPath.Split('?')[0] # remove query string
        if ($localPath -eq "/") { $localPath = "/homepage.html" }
        $filePath = Join-Path $root $localPath.Replace('/', '\')
        
        if (Test-Path $filePath -PathType Leaf) {
            $extension = [System.IO.Path]::GetExtension($filePath).ToLower()
            $mime = "text/plain"
            switch ($extension) {
                ".html" { $mime = "text/html; charset=utf-8" }
                ".css"  { $mime = "text/css" }
                ".js"   { $mime = "application/javascript" }
                ".png"  { $mime = "image/png" }
                ".jpg"  { $mime = "image/jpeg" }
                ".svg"  { $mime = "image/svg+xml" }
                ".json" { $mime = "application/json" }
            }
            
            $bytes = [System.IO.File]::ReadAllBytes($filePath)
            $writer.WriteLine("HTTP/1.1 200 OK")
            $writer.WriteLine("Content-Type: $mime")
            $writer.WriteLine("Content-Length: " + $bytes.Length)
            $writer.WriteLine("Connection: close")
            $writer.WriteLine("")
            $writer.Flush()
            $stream.Write($bytes, 0, $bytes.Length)
        } else {
            $writer.WriteLine("HTTP/1.1 404 Not Found")
            $writer.WriteLine("Connection: close")
            $writer.WriteLine("")
            $writer.WriteLine("Not Found")
            $writer.Flush()
        }
        $client.Close()
    }
} finally {
    $listener.Stop()
}
