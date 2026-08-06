param([int]$Port = 8080, [string]$Root = $PSScriptRoot)

$mime = @{
  '.html'='text/html; charset=utf-8'; '.css'='text/css; charset=utf-8'
  '.js'='application/javascript; charset=utf-8'; '.json'='application/json'
  '.png'='image/png'; '.jpg'='image/jpeg'; '.jpeg'='image/jpeg'
  '.gif'='image/gif'; '.svg'='image/svg+xml'; '.webp'='image/webp'
  '.ico'='image/x-icon'; '.woff'='font/woff'; '.woff2'='font/woff2'
  '.pdf'='application/pdf'; '.txt'='text/plain; charset=utf-8'
}

$listener = [System.Net.HttpListener]::new()
$listener.Prefixes.Add("http://localhost:$Port/")
$listener.Start()
Write-Host "Serving $Root at http://localhost:$Port/  (Ctrl+C to stop)"

try {
  while ($listener.IsListening) {
    $ctx = $listener.GetContext()
    try {
    $rel = [Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath).TrimStart('/')
    if ($rel -eq '') { $rel = 'index.html' }
    $path = Join-Path $Root ($rel -replace '/', '\')

    if (Test-Path $path -PathType Container) { $path = Join-Path $path 'index.html' }
    if (-not (Test-Path $path -PathType Leaf) -and -not [IO.Path]::HasExtension($path)) { $path += '.html' }

    $full = [IO.Path]::GetFullPath($path)
    if (-not $full.StartsWith([IO.Path]::GetFullPath($Root), 'OrdinalIgnoreCase')) {
      $ctx.Response.StatusCode = 403; $ctx.Response.Close(); continue
    }

    $isHead = $ctx.Request.HttpMethod -eq 'HEAD'

    if (Test-Path $full -PathType Leaf) {
      $bytes = [IO.File]::ReadAllBytes($full)
      $ext = [IO.Path]::GetExtension($full).ToLower()
      $ctx.Response.ContentType = if ($mime.ContainsKey($ext)) { $mime[$ext] } else { 'application/octet-stream' }
      $ctx.Response.Headers.Add('Cache-Control','no-store')
      $ctx.Response.ContentLength64 = $bytes.Length
      if (-not $isHead) { $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length) }
      Write-Host ("200 /{0}" -f $rel)
    } else {
      $ctx.Response.StatusCode = 404
      $msg = [Text.Encoding]::UTF8.GetBytes("404 Not Found: /$rel")
      $ctx.Response.ContentLength64 = $msg.Length
      if (-not $isHead) { $ctx.Response.OutputStream.Write($msg, 0, $msg.Length) }
      Write-Host ("404 /{0}" -f $rel) -ForegroundColor Yellow
    }
    } catch {
      Write-Host ("ERR /{0}  {1}" -f $rel, $_.Exception.Message) -ForegroundColor Red
    } finally {
      try { $ctx.Response.Close() } catch {}
    }
  }
} finally { $listener.Stop(); $listener.Close() }
