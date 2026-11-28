# GetSavDown Health Monitoring Setup Script
# Run this script to set up the health monitoring system

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "GetSavDown Health Monitoring Setup" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Check if .env.local exists
Write-Host "Step 1: Checking environment configuration..." -ForegroundColor Yellow
if (!(Test-Path ".env.local")) {
    Write-Host "  WARNING: .env.local not found!" -ForegroundColor Red
    Write-Host "  Please create .env.local from .env.example" -ForegroundColor Red
    Write-Host "  Make sure to configure a DEVELOPMENT database (not production)!" -ForegroundColor Red
    Write-Host ""
    $continue = Read-Host "Do you want to continue anyway? (y/n)"
    if ($continue -ne "y") {
        exit 1
    }
}
Write-Host "  OK: Environment configuration found" -ForegroundColor Green
Write-Host ""

# Step 2: Generate Prisma Client
Write-Host "Step 2: Generating Prisma Client..." -ForegroundColor Yellow
npx prisma generate
if ($LASTEXITCODE -ne 0) {
    Write-Host "  ERROR: Failed to generate Prisma client" -ForegroundColor Red
    exit 1
}
Write-Host "  OK: Prisma client generated successfully" -ForegroundColor Green
Write-Host ""

# Step 3: Create Migration
Write-Host "Step 3: Creating database migration..." -ForegroundColor Yellow
Write-Host "  This will create tool_health and tool_health_logs tables" -ForegroundColor Gray
npx prisma migrate dev --name add_tool_health_monitoring
if ($LASTEXITCODE -ne 0) {
    Write-Host "  ERROR: Migration failed" -ForegroundColor Red
    Write-Host "  Check the error message above" -ForegroundColor Red
    exit 1
}
Write-Host "  OK: Migration completed successfully" -ForegroundColor Green
Write-Host ""

# Step 4: Verify Tables Created
Write-Host "Step 4: Verifying database setup..." -ForegroundColor Yellow
Write-Host "  Opening Prisma Studio to verify tables..." -ForegroundColor Gray
Write-Host "  Press Ctrl+C to close Prisma Studio when done" -ForegroundColor Gray
Write-Host ""
npx prisma studio

Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Setup Complete!" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Start dev server: npm run dev" -ForegroundColor White
Write-Host "2. Test a downloader to generate health data" -ForegroundColor White
Write-Host "3. Visit http://localhost:3000/admin/health" -ForegroundColor White
Write-Host "4. Run testing script: npx tsx scripts/test-all-tools.ts" -ForegroundColor White
Write-Host ""
