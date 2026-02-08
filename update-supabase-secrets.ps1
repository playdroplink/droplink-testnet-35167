# Update Supabase Secrets with New Pi API Key
# Run this to update edge function environment variables

Write-Host "🔧 Updating Supabase Edge Function Secrets..." -ForegroundColor Cyan
Write-Host ""

# New Pi API Key
$PI_API_KEY = "epbig4kjt1evsdir4jr5nzxsgxg4f8jhqsmeuf3ijo1bshis1qhq50irzx9wotzg"
$PI_VALIDATION_KEY = "26ec4458680b98edc16b18ed68c2fb7841ee2c9d3b9cfdcfa82de36bea71f64074a2ee5d1fbea04762df431edb1458b44a2ff50679b16d93935b0b645e98174a"

Write-Host "📋 Secrets to update:" -ForegroundColor Yellow
Write-Host "  • PI_API_KEY: $($PI_API_KEY.Substring(0, 20))..." -ForegroundColor Gray
Write-Host "  • VITE_PI_API_KEY: $($PI_API_KEY.Substring(0, 20))..." -ForegroundColor Gray
Write-Host "  • PI_VALIDATION_KEY: $($PI_VALIDATION_KEY.Substring(0, 20))..." -ForegroundColor Gray
Write-Host ""

# Method 1: Using Supabase Dashboard (RECOMMENDED)
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "METHOD 1: Update via Supabase Dashboard (Recommended)" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Go to: https://supabase.com/dashboard/project/jzzbmoopwnvgxxirulga/settings/vault" -ForegroundColor White
Write-Host ""
Write-Host "2. Add/Update these secrets:" -ForegroundColor White
Write-Host ""
Write-Host "   Name: PI_API_KEY" -ForegroundColor Yellow
Write-Host "   Value: $PI_API_KEY" -ForegroundColor Gray
Write-Host ""
Write-Host "   Name: VITE_PI_API_KEY" -ForegroundColor Yellow
Write-Host "   Value: $PI_API_KEY" -ForegroundColor Gray
Write-Host ""
Write-Host "   Name: PI_VALIDATION_KEY" -ForegroundColor Yellow
Write-Host "   Value: $PI_VALIDATION_KEY" -ForegroundColor Gray
Write-Host ""

# Method 2: Using Supabase CLI
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "METHOD 2: Update via Supabase CLI" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""
Write-Host "Run these commands:" -ForegroundColor White
Write-Host ""
Write-Host "npx supabase secrets set PI_API_KEY=`"$PI_API_KEY`"" -ForegroundColor Yellow
Write-Host "npx supabase secrets set VITE_PI_API_KEY=`"$PI_API_KEY`"" -ForegroundColor Yellow
Write-Host "npx supabase secrets set PI_VALIDATION_KEY=`"$PI_VALIDATION_KEY`"" -ForegroundColor Yellow
Write-Host ""

# Copy commands to clipboard option
$copyToClipboard = Read-Host "Copy CLI commands to clipboard? (y/n)"
if ($copyToClipboard -eq 'y') {
    $commands = @"
npx supabase secrets set PI_API_KEY="$PI_API_KEY"
npx supabase secrets set VITE_PI_API_KEY="$PI_API_KEY"
npx supabase secrets set PI_VALIDATION_KEY="$PI_VALIDATION_KEY"
"@
    Set-Clipboard -Value $commands
    Write-Host "✅ Commands copied to clipboard!" -ForegroundColor Green
}

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "EDGE FUNCTIONS THAT USE PI_API_KEY:" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""
Write-Host "✓ pi-auth" -ForegroundColor Gray
Write-Host "✓ pi-payment-approve" -ForegroundColor Gray
Write-Host "✓ pi-payment-complete" -ForegroundColor Gray
Write-Host "✓ verify-payment" -ForegroundColor Gray
Write-Host "✓ verify-ad-reward" -ForegroundColor Gray
Write-Host "✓ pi-ad-verify" -ForegroundColor Gray
Write-Host ""
Write-Host "After updating secrets, these functions will use the new API key automatically." -ForegroundColor Cyan
Write-Host ""
