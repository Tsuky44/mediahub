$GitHubUser = "tsuky44" # Doit être en minuscules pour ghcr.io

# TENTATIVE DE CORRECTION AUTOMATIQUE DU PATH DOCKER
if (-not (Get-Command "docker" -ErrorAction SilentlyContinue)) {
    $PossiblePath = "C:\Program Files\Docker\Docker\resources\bin"
    if (Test-Path $PossiblePath) {
        Write-Host "Docker non trouvé dans le PATH, ajout temporaire de : $PossiblePath" -ForegroundColor Yellow
        $env:PATH = "$env:PATH;$PossiblePath"
    }
}

Write-Host "=== Publication vers GitHub Packages (ghcr.io) ===" -ForegroundColor Cyan
Write-Host "NOTE : Vous devez avoir un Personal Access Token (PAT) avec les droits 'write:packages' et 'delete:packages'."
Write-Host "Créez-en un ici : https://github.com/settings/tokens/new"

function Check-Error {
    param([string]$Message)
    if ($LASTEXITCODE -ne 0) {
        Write-Error "ERREUR : $Message (Code de sortie: $LASTEXITCODE)"
        exit 1
    }
}

# Déterminer le répertoire du script pour utiliser des chemins absolus
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$NextAppPath = Join-Path $ScriptDir "next-app"

# Login
Write-Host "1. Connexion à ghcr.io..." -ForegroundColor Yellow
Write-Host "Veuillez entrer votre Personal Access Token (PAT) GitHub:"
$Token = Read-Host -AsSecureString
$PlainToken = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto([System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($Token))
echo $PlainToken | docker login ghcr.io -u $GitHubUser --password-stdin
Check-Error "Échec de la connexion à GitHub Packages."

# Build & Push App
Write-Host "2. Build & Push : Application..." -ForegroundColor Yellow
docker build --network=host --target runner -t "ghcr.io/$GitHubUser/mediahub-app:latest" "$NextAppPath"
Check-Error "Échec du build de l'application"

docker push "ghcr.io/$GitHubUser/mediahub-app:latest"
Check-Error "Échec du push de l'application"

# Build & Push Tracker
Write-Host "3. Build & Push : Tracker..." -ForegroundColor Yellow
docker build --network=host --target tracker -t "ghcr.io/$GitHubUser/mediahub-tracker:latest" "$NextAppPath"
Check-Error "Échec du build du tracker"

docker push "ghcr.io/$GitHubUser/mediahub-tracker:latest"
Check-Error "Échec du push du tracker"

Write-Host "=== Terminé ! ===" -ForegroundColor Green
Write-Host "Les images sont disponibles sur :"
Write-Host "- ghcr.io/$GitHubUser/mediahub-app:latest"
Write-Host "- ghcr.io/$GitHubUser/mediahub-tracker:latest"
Write-Host ""
Write-Host "Vous pouvez distribuer le fichier 'docker-compose.public.yml' (renommé en docker-compose.yml) aux utilisateurs."
