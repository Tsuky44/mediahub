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

# Lire la version actuelle depuis package.json
$PackageJsonPath = Join-Path $NextAppPath "package.json"
$CurrentVersion = "0.1.0"
if (Test-Path $PackageJsonPath) {
    $PackageJson = Get-Content $PackageJsonPath | ConvertFrom-Json
    if ($PackageJson.version) {
        $CurrentVersion = $PackageJson.version
    }
}

Write-Host ""
Write-Host "Version actuelle détectée dans package.json : $CurrentVersion" -ForegroundColor Green
$InputCurrent = Read-Host "Confirmez ou entrez la version ACTUELLE (Appuyez sur Entrée pour '$CurrentVersion')"
if (-not [string]::IsNullOrEmpty($InputCurrent)) {
    $CurrentVersion = $InputCurrent
}

$TargetVersion = Read-Host "Entrez la NOUVELLE version à appliquer (ex: 1.0.0)"
if ([string]::IsNullOrEmpty($TargetVersion)) {
    Write-Error "ERREUR : La nouvelle version ne peut pas être vide."
    exit 1
}

# Nettoyer les préfixes 'v' si l'utilisateur l'a saisi
$TargetVersion = $TargetVersion -replace '^v', ''

# Mettre à jour package.json avec la nouvelle version
if (Test-Path $PackageJsonPath) {
    Write-Host "Mise à jour de package.json vers la version $TargetVersion..." -ForegroundColor Yellow
    $PackageContent = Get-Content $PackageJsonPath -Raw
    # Remplacer la ligne "version": "..." par la nouvelle version
    $PackageContent = $PackageContent -replace '"version"\s*:\s*"[^"]+"', "`"version`": `"$TargetVersion`""
    Set-Content $PackageJsonPath $PackageContent
}

# Générer les tags Docker
$VersionTag = "v$TargetVersion"
$MinorVersion = $TargetVersion -replace '\.\d+$', '' # ex: 1.0.0 -> 1.0
$MinorVersionTag = "v$MinorVersion"

# --- Saisie du changelog ---
Write-Host ""
Write-Host "=== Saisie du changelog pour la version $TargetVersion ===" -ForegroundColor Cyan
Write-Host "Entrez les modifications pour chaque catégorie."
Write-Host "Pour chaque catégorie, tapez vos entrées une par une."
Write-Host "Laissez vide et appuyez sur Entrée pour passer à la suivante."
Write-Host "Si vous ne mettez rien du tout, aucune section ne sera ajoutée."
Write-Host ""

$Categories = @("Added", "Changed", "Fixed", "In Progress")
$ChangelogSections = @{}

foreach ($Category in $Categories) {
    Write-Host "[$Category] - Appuyez sur Entrée sans rien taper pour passer cette catégorie" -ForegroundColor Yellow
    $Entries = @()
    while ($true) {
        $Entry = Read-Host "  - $Category (Entrée pour terminer cette catégorie)"
        if ([string]::IsNullOrWhiteSpace($Entry)) {
            break
        }
        $Entries += $Entry.Trim()
    }
    if ($Entries.Count -gt 0) {
        $ChangelogSections[$Category] = $Entries
    }
}

# Construire la section changelog si au moins une catégorie a des entrées
$ChangelogBlock = ""
if ($ChangelogSections.Count -gt 0) {
    $Today = Get-Date -Format "yyyy-MM-dd"
    $ChangelogBlock = "## [$TargetVersion] - $Today`r`n`r`n"
    foreach ($Category in $Categories) {
        if ($ChangelogSections.ContainsKey($Category)) {
            $ChangelogBlock += "### $Category`r`n"
            foreach ($Entry in $ChangelogSections[$Category]) {
                $ChangelogBlock += "- $Entry`r`n"
            }
            $ChangelogBlock += "`r`n"
        }
    }
}

# Écrire le changelog dans CHANGELOG.md
$ChangelogPath = Join-Path $NextAppPath "CHANGELOG.md"
if ($ChangelogBlock -ne "") {
    Write-Host ""
    Write-Host "Écriture du changelog dans CHANGELOG.md..." -ForegroundColor Yellow
    if (Test-Path $ChangelogPath) {
        $ExistingContent = Get-Content $ChangelogPath -Raw
        # Insérer le nouveau bloc après l'en-tête (après la ligne d'introduction)
        # On cherche la première occurrence de "## [" pour insérer avant
        if ($ExistingContent -match "(?s)^(.*?)(## \[)") {
            $Header = $Matches[1]
            $Rest = $ExistingContent.Substring($Matches[1].Length)
            $NewContent = $Header + $ChangelogBlock + $Rest
            Set-Content $ChangelogPath $NewContent -NoNewline
        } else {
            # Pas de version existante, on ajoute à la fin
            $NewContent = $ExistingContent.TrimEnd() + "`r`n`r`n" + $ChangelogBlock
            Set-Content $ChangelogPath $NewContent -NoNewline
        }
    } else {
        # Créer le fichier s'il n'existe pas
        $Header = "# Changelog`r`n`r`nToutes les modifications notables de ce projet seront documentées dans ce fichier.`r`n`r`n"
        Set-Content $ChangelogPath ($Header + $ChangelogBlock) -NoNewline
    }
    Write-Host "Changelog mis à jour avec succès." -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "Aucune entrée de changelog saisie - CHANGELOG.md non modifié." -ForegroundColor DarkGray
}

Write-Host ""
Write-Host "--- Résumé de la publication ---" -ForegroundColor Cyan
Write-Host "Version cible : $TargetVersion" -ForegroundColor Green
Write-Host "Tags Docker : latest, $VersionTag, $MinorVersionTag" -ForegroundColor Green
Write-Host "--------------------------------" -ForegroundColor Cyan
Write-Host ""

# Login
Write-Host "1. Connexion à ghcr.io..." -ForegroundColor Yellow
Write-Host "Veuillez entrer votre Personal Access Token (PAT) GitHub:"
$Token = Read-Host -AsSecureString
$PlainToken = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto([System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($Token))
echo $PlainToken | docker login ghcr.io -u $GitHubUser --password-stdin
Check-Error "Échec de la connexion à GitHub Packages."

# Build & Push App
Write-Host "2. Build & Push : Application..." -ForegroundColor Yellow
docker build --target runner -t "ghcr.io/$GitHubUser/mediahub-app:latest" -t "ghcr.io/$GitHubUser/mediahub-app:$VersionTag" -t "ghcr.io/$GitHubUser/mediahub-app:$MinorVersionTag" "$NextAppPath"
Check-Error "Échec du build de l'application"

docker push "ghcr.io/$GitHubUser/mediahub-app:latest"
Check-Error "Échec du push de l'application (latest)"

docker push "ghcr.io/$GitHubUser/mediahub-app:$VersionTag"
Check-Error "Échec du push de l'application ($VersionTag)"

docker push "ghcr.io/$GitHubUser/mediahub-app:$MinorVersionTag"
Check-Error "Échec du push de l'application ($MinorVersionTag)"

Write-Host "=== Terminé ! ===" -ForegroundColor Green
Write-Host "L'image est disponible sur :"
Write-Host "- ghcr.io/$GitHubUser/mediahub-app:latest"
Write-Host "- ghcr.io/$GitHubUser/mediahub-app:$VersionTag"
Write-Host "- ghcr.io/$GitHubUser/mediahub-app:$MinorVersionTag"
Write-Host ""
Write-Host "Vous pouvez distribuer le fichier 'docker-compose.public.yml' (renommé en docker-compose.yml) aux utilisateurs."
