# ============================================================================
# Sinapsis — Servidor HTTP estático mínimo (PowerShell + HttpListener)
# Sólo para desarrollo local. NO usar en producción.
#
# Uso:
#   powershell -ExecutionPolicy Bypass -File tools/serve.ps1
#   powershell -ExecutionPolicy Bypass -File tools/serve.ps1 -Port 8080
# ============================================================================

param(
    [int]$Port = 8000,
    [string]$Root = (Resolve-Path (Join-Path $PSScriptRoot ".."))
)

$Root = [System.IO.Path]::GetFullPath($Root)
$prefix = "http://localhost:$Port/"

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add($prefix)
$listener.Start()

Write-Host "Sinapsis dev server escuchando en $prefix"
Write-Host "Raíz: $Root"
Write-Host "Ctrl+C para detener."

$mimeTypes = @{
    ".html" = "text/html; charset=utf-8"
    ".htm"  = "text/html; charset=utf-8"
    ".js"   = "application/javascript; charset=utf-8"
    ".mjs"  = "application/javascript; charset=utf-8"
    ".css"  = "text/css; charset=utf-8"
    ".json" = "application/json; charset=utf-8"
    ".png"  = "image/png"
    ".jpg"  = "image/jpeg"
    ".jpeg" = "image/jpeg"
    ".gif"  = "image/gif"
    ".svg"  = "image/svg+xml"
    ".ico"  = "image/x-icon"
    ".wav"  = "audio/wav"
    ".mp3"  = "audio/mpeg"
    ".ogg"  = "audio/ogg"
    ".woff" = "font/woff"
    ".woff2"= "font/woff2"
    ".ttf"  = "font/ttf"
    ".txt"  = "text/plain; charset=utf-8"
}

try {
    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $req = $context.Request
        $res = $context.Response
        try {
            $rel = [System.Uri]::UnescapeDataString($req.Url.AbsolutePath)
            if ($rel -eq "/" -or $rel -eq "") { $rel = "/index.html" }
            $full = [System.IO.Path]::GetFullPath((Join-Path $Root $rel.TrimStart("/")))

            if (-not $full.StartsWith($Root)) {
                $res.StatusCode = 403
                $msg = [System.Text.Encoding]::UTF8.GetBytes("Forbidden")
                $res.OutputStream.Write($msg, 0, $msg.Length)
            }
            elseif (Test-Path $full -PathType Leaf) {
                $ext = [System.IO.Path]::GetExtension($full).ToLowerInvariant()
                $mime = $mimeTypes[$ext]
                if (-not $mime) { $mime = "application/octet-stream" }
                $bytes = [System.IO.File]::ReadAllBytes($full)
                $res.ContentType = $mime
                $res.ContentLength64 = $bytes.Length
                $res.Headers.Add("Cache-Control", "no-cache")
                $res.OutputStream.Write($bytes, 0, $bytes.Length)
                Write-Host "200 $rel"
            }
            else {
                $res.StatusCode = 404
                $msg = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found: $rel")
                $res.ContentType = "text/plain; charset=utf-8"
                $res.OutputStream.Write($msg, 0, $msg.Length)
                Write-Host "404 $rel"
            }
        }
        catch {
            $res.StatusCode = 500
            $err = [System.Text.Encoding]::UTF8.GetBytes("500: $($_.Exception.Message)")
            try { $res.OutputStream.Write($err, 0, $err.Length) } catch {}
            Write-Host "500 $($_.Exception.Message)"
        }
        finally {
            try { $res.OutputStream.Close() } catch {}
        }
    }
}
finally {
    $listener.Stop()
}
