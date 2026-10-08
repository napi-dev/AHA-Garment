# Manual alert trigger script
# Run this to immediately check for order countdown and delayed order alerts

$url = "https://aha-garment.vercel.app/api/cron/check-alerts"
$secret = "b/vECxnb/yOF1kSM92Ir54Ay2B5YuG1TaHIFeo5gmH0="

Write-Host "Triggering alert checks..." -ForegroundColor Yellow
Write-Host ""

try {
    $response = Invoke-RestMethod -Uri $url -Method POST -Headers @{
        "Authorization" = "Bearer $secret"
    }
    
    Write-Host "✓ Success!" -ForegroundColor Green
    Write-Host "Response: $($response | ConvertTo-Json -Depth 5)" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Check your Telegram for alerts!" -ForegroundColor Green
} catch {
    Write-Host "✗ Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Make sure the Next.js server is running on http://localhost:3000" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
