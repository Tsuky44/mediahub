Write-Host "Construction des images Docker pour la production..." -ForegroundColor Cyan

# Build App Image
Write-Host "1/2 Construction de l'image Application (mediahub-app)..." -ForegroundColor Yellow
docker build --target runner -t mediahub-app:latest ./next-app

# Build Tracker Image
Write-Host "2/2 Construction de l'image Tracker (mediahub-tracker)..." -ForegroundColor Yellow
docker build --target tracker -t mediahub-tracker:latest ./next-app

Write-Host "Terminé ! Les images 'mediahub-app:latest' et 'mediahub-tracker:latest' sont prêtes." -ForegroundColor Green
Write-Host "Consultez le dossier 'release' pour les fichiers de déploiement." -ForegroundColor Cyan
