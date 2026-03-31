# PowerShell script to clear exam results
$url = "http://localhost:8080/admin/exam-results/clear-all"

try {
    Write-Host "Clearing exam results..." -ForegroundColor Yellow
    
    $response = Invoke-RestMethod -Uri $url -Method DELETE -ContentType "application/json"
    
    Write-Host "Success!" -ForegroundColor Green
    Write-Host "Response: $($response | ConvertTo-Json -Depth 3)" -ForegroundColor Cyan
    
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Make sure the backend server is running on localhost:8080" -ForegroundColor Yellow
}

Write-Host "`nPress any key to continue..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
