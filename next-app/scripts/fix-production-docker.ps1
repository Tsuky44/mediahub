Write-Host "🔧 Fixing production database schema in Docker container..." -ForegroundColor Cyan

# Vérifier si le container existe
$container = docker ps -q -f "name=mediahub-app"
if (-not $container) {
    Write-Error "❌ Container mediahub-app not found. Make sure the container is running."
    exit 1
}

Write-Host "📋 Executing database fix script in container..." -ForegroundColor Yellow
try {
    # Exécuter le script de fix dans le container
    docker exec $container npx tsx scripts/fix-production-db.ts
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Database fix completed!" -ForegroundColor Green
        
        Write-Host "🔄 Restarting the container to apply changes..." -ForegroundColor Yellow
        docker restart $container
        
        Write-Host "🎉 Production database fixed and container restarted!" -ForegroundColor Green
    } else {
        Write-Error "❌ Database fix failed with exit code: $LASTEXITCODE"
        exit 1
    }
} catch {
    Write-Error "❌ Error executing database fix: $_"
    exit 1
}
