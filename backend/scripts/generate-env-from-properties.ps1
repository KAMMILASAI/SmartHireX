Param(
  [string]$PropertiesPath = "src/main/resources/application.properties",
  [string]$OutputPath = ".env",
  [switch]$Force
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

if (!(Test-Path -Path $PropertiesPath)) {
  throw "application.properties not found: $PropertiesPath"
}

if ((Test-Path -Path $OutputPath) -and -not $Force) {
  throw "$OutputPath already exists. Re-run with -Force to overwrite."
}

$lines = Get-Content -Path $PropertiesPath
$regex = '\$\{([A-Za-z_][A-Za-z0-9_]*):(.*?)\}'
$envMap = [ordered]@{}

foreach ($line in $lines) {
  if ([string]::IsNullOrWhiteSpace($line)) { continue }
  if ($line.TrimStart().StartsWith('#')) { continue }

  $matches = [regex]::Matches($line, $regex)
  foreach ($m in $matches) {
    $name = $m.Groups[1].Value.Trim()
    $default = $m.Groups[2].Value

    if (-not $envMap.Contains($name)) {
      $envMap[$name] = $default
    }
  }
}

$out = New-Object System.Collections.Generic.List[string]
$out.Add('# Auto-generated from application.properties placeholders')
$out.Add('# Review and replace secret values before production use')
$out.Add('')

foreach ($key in $envMap.Keys) {
  $val = [string]$envMap[$key]
  # keep plain values; if empty default keep empty assignment
  $out.Add("$key=$val")
}

Set-Content -Path $OutputPath -Value $out -Encoding UTF8
Write-Host "Generated $OutputPath with $($envMap.Count) variables from $PropertiesPath"
