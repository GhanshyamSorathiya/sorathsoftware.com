<#
  Stamps each <lastmod> in sitemap.xml from the actual last-write time of the
  matching local HTML file, so the sitemap never drifts stale after an edit.
  Run this after any content change, before deploying:

      powershell -File scripts\update-sitemap.ps1

  Site root is assumed to be the parent of this scripts\ folder.
#>

$ErrorActionPreference = "Stop"

$siteRoot = Split-Path -Parent $PSScriptRoot
$sitemapPath = Join-Path $siteRoot "sitemap.xml"

if (-not (Test-Path $sitemapPath)) {
    Write-Error "sitemap.xml not found at $sitemapPath"
    exit 1
}

[xml]$xml = Get-Content -Path $sitemapPath -Raw

$ns = New-Object System.Xml.XmlNamespaceManager($xml.NameTable)
$ns.AddNamespace("s", "http://www.sitemaps.org/schemas/sitemap/0.9")

$urlNodes = $xml.SelectNodes("//s:url", $ns)
$updated = 0

foreach ($urlNode in $urlNodes) {
    $locNode = $urlNode.SelectSingleNode("s:loc", $ns)
    $lastmodNode = $urlNode.SelectSingleNode("s:lastmod", $ns)
    if (-not $locNode -or -not $lastmodNode) { continue }

    $loc = $locNode.InnerText.Trim()
    $relativePath = ([Uri]$loc).AbsolutePath.TrimStart("/")
    if ([string]::IsNullOrWhiteSpace($relativePath)) { $relativePath = "index.html" }

    $filePath = Join-Path $siteRoot $relativePath
    if (-not (Test-Path $filePath)) {
        Write-Warning "No local file for $loc (expected $filePath) - leaving lastmod as-is."
        continue
    }

    $mtime = (Get-Item $filePath).LastWriteTime.ToString("yyyy-MM-dd")
    if ($lastmodNode.InnerText -ne $mtime) {
        $lastmodNode.InnerText = $mtime
        $updated++
        Write-Host "  $relativePath -> $mtime"
    }
}

if ($updated -gt 0) {
    $xml.Save($sitemapPath)
    Write-Host ("sitemap.xml updated - {0} URL(s) changed." -f $updated)
} else {
    Write-Host "sitemap.xml already up to date."
}

