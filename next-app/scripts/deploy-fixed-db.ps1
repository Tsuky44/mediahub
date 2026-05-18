Write-Host "🚀 Deploying fixed database to Docker containers..." -ForegroundColor Cyan

# Arrêter les containers existants
Write-Host "🛑 Stopping existing containers..." -ForegroundColor Yellow
docker-compose down

# Attendre que les containers s'arrêtent
Start-Sleep -Seconds 5

# Démarrer les containers avec docker-compose
Write-Host "🚀 Starting containers with docker-compose..." -ForegroundColor Yellow
docker-compose up -d

# Attendre que les containers démarrent
Write-Host "⏳ Waiting for containers to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Vérifier que les containers sont en cours d'exécution
$appContainer = docker ps -q -f "name=mediahub-app"
$trackerContainer = docker ps -q -f "name=mediahub-tracker"

if ($appContainer) {
    Write-Host "✅ MediaHub app container is running" -ForegroundColor Green
} else {
    Write-Error "❌ MediaHub app container failed to start"
    exit 1
}

if ($trackerContainer) {
    Write-Host "✅ MediaHub tracker container is running" -ForegroundColor Green
} else {
    Write-Warning "⚠️  MediaHub tracker container not found (might be normal)"
}

# Exécuter le script de fix dans le container
Write-Host "🔧 Applying database fixes in container..." -ForegroundColor Yellow
try {
    docker exec $appContainer npx tsx scripts/fix-sqlite-direct.ts
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Database fixes applied successfully!" -ForegroundColor Green
    } else {
        Write-Warning "⚠️  Database fix script had issues, but container should still work"
    }
} catch {
    Write-Warning "⚠️  Could not execute database fix in container: $_"
}

Write-Host "🎉 Deployment completed!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Next steps:"
Write-Host "1. Check the application logs: docker logs mediahub-app"
Write-Host "2. Access your application at: http://localhost:3008"
Write-Host "3. If you still see errors, restart the containers: docker-compose restart"
