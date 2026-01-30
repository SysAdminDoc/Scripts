<#
.SYNOPSIS
    Windows 11 Theme Cleaner and Wallpaper Replacer
.DESCRIPTION
    - Takes ownership of theme and wallpaper directories
    - Removes all themes except Windows Light and Dark
    - Replaces default wallpapers with matching files from Desktop
.NOTES
    Run as Administrator
#>

#Requires -RunAsAdministrator

# ============================================
# CONFIGURATION
# ============================================

$DesktopPath = [Environment]::GetFolderPath('Desktop')
$WallpaperSource = $DesktopPath
$BackupRoot = "$env:USERPROFILE\ThemeBackup_$(Get-Date -Format 'yyyyMMdd_HHmmss')"

# System paths
$SystemThemesPath = "C:\Windows\Resources\Themes"
$WallpaperPath = "C:\Windows\Web\Wallpaper\Windows"
$UserThemesPath = "$env:LOCALAPPDATA\Microsoft\Windows\Themes"

# Themes to keep (Windows 11 default light and dark)
$ThemesToKeep = @(
    "aero.theme",
    "dark.theme"
)

# ============================================
# FUNCTIONS
# ============================================

function Write-Status {
    param(
        [string]$Message,
        [string]$Type = "Info"
    )
    
    $prefix = switch ($Type) {
        "Info"    { "[INFO]" }
        "Success" { "[OK]" }
        "Warning" { "[WARN]" }
        "Error"   { "[ERROR]" }
        default   { "[INFO]" }
    }
    
    $color = switch ($Type) {
        "Info"    { "Cyan" }
        "Success" { "Green" }
        "Warning" { "Yellow" }
        "Error"   { "Red" }
        default   { "White" }
    }
    
    Write-Host "$prefix $Message" -ForegroundColor $color
}

function Take-Ownership {
    param(
        [string]$Path
    )
    
    if (-not (Test-Path $Path)) {
        Write-Status "Path not found: $Path" -Type "Warning"
        return $false
    }
    
    try {
        # Take ownership
        $null = takeown /F $Path /R /A /D Y 2>&1
        
        # Grant full control to Administrators
        $null = icacls $Path /grant Administrators:F /T /C /Q 2>&1
        
        # Grant full control to current user
        $null = icacls $Path /grant "$($env:USERNAME):F" /T /C /Q 2>&1
        
        Write-Status "Ownership taken: $Path" -Type "Success"
        return $true
    }
    catch {
        Write-Status "Failed to take ownership of: $Path - $_" -Type "Error"
        return $false
    }
}

function Backup-Directory {
    param(
        [string]$Source,
        [string]$DestinationName
    )
    
    $backupPath = Join-Path $BackupRoot $DestinationName
    
    try {
        if (Test-Path $Source) {
            New-Item -Path $backupPath -ItemType Directory -Force | Out-Null
            Copy-Item -Path "$Source\*" -Destination $backupPath -Recurse -Force -ErrorAction SilentlyContinue
            Write-Status "Backed up: $Source -> $backupPath" -Type "Success"
            return $true
        }
    }
    catch {
        Write-Status "Backup failed for: $Source - $_" -Type "Warning"
    }
    return $false
}

function Remove-UserThemes {
    Write-Status "Removing user-installed themes..." -Type "Info"
    
    if (Test-Path $UserThemesPath) {
        $userThemes = Get-ChildItem -Path $UserThemesPath -ErrorAction SilentlyContinue
        
        foreach ($item in $userThemes) {
            try {
                Remove-Item -Path $item.FullName -Recurse -Force -ErrorAction Stop
                Write-Status "Removed user theme: $($item.Name)" -Type "Success"
            }
            catch {
                Write-Status "Could not remove: $($item.Name) - $_" -Type "Warning"
            }
        }
    }
}

function Remove-ExtraSystemThemes {
    Write-Status "Removing extra system themes (keeping Light and Dark)..." -Type "Info"
    
    if (-not (Test-Path $SystemThemesPath)) {
        Write-Status "System themes path not found" -Type "Error"
        return
    }
    
    $themeFiles = Get-ChildItem -Path $SystemThemesPath -Filter "*.theme" -ErrorAction SilentlyContinue
    
    foreach ($theme in $themeFiles) {
        if ($ThemesToKeep -notcontains $theme.Name) {
            try {
                Remove-Item -Path $theme.FullName -Force -ErrorAction Stop
                Write-Status "Removed system theme: $($theme.Name)" -Type "Success"
            }
            catch {
                Write-Status "Could not remove: $($theme.Name) - $_" -Type "Warning"
            }
        }
        else {
            Write-Status "Keeping theme: $($theme.Name)" -Type "Info"
        }
    }
    
    # Remove theme folders (but not the main theme files)
    $themeFolders = Get-ChildItem -Path $SystemThemesPath -Directory -ErrorAction SilentlyContinue
    foreach ($folder in $themeFolders) {
        # Keep aero and dark theme resource folders
        if ($folder.Name -notin @("aero", "dark")) {
            try {
                Remove-Item -Path $folder.FullName -Recurse -Force -ErrorAction Stop
                Write-Status "Removed theme folder: $($folder.Name)" -Type "Success"
            }
            catch {
                Write-Status "Could not remove folder: $($folder.Name) - $_" -Type "Warning"
            }
        }
    }
}

function Remove-ExtraWallpaperFolders {
    Write-Status "Removing extra wallpaper folders (keeping Windows only)..." -Type "Info"
    
    $wallpaperRoot = "C:\Windows\Web\Wallpaper"
    
    if (-not (Test-Path $wallpaperRoot)) {
        Write-Status "Wallpaper root path not found" -Type "Error"
        return
    }
    
    # Folders to keep
    $keepFolders = @("Windows")
    
    $folders = Get-ChildItem -Path $wallpaperRoot -Directory -ErrorAction SilentlyContinue
    
    foreach ($folder in $folders) {
        if ($keepFolders -notcontains $folder.Name) {
            try {
                Remove-Item -Path $folder.FullName -Recurse -Force -ErrorAction Stop
                Write-Status "Removed wallpaper folder: $($folder.Name)" -Type "Success"
            }
            catch {
                Write-Status "Could not remove folder: $($folder.Name) - $_" -Type "Warning"
            }
        }
        else {
            Write-Status "Keeping folder: $($folder.Name)" -Type "Info"
        }
    }
}

function Replace-Wallpapers {
    Write-Status "Replacing wallpapers from Desktop..." -Type "Info"
    
    if (-not (Test-Path $WallpaperPath)) {
        Write-Status "Wallpaper path not found: $WallpaperPath" -Type "Error"
        return
    }
    
    # Get existing wallpaper files
    $existingWallpapers = Get-ChildItem -Path $WallpaperPath -File -ErrorAction SilentlyContinue
    
    $replacedCount = 0
    
    foreach ($wallpaper in $existingWallpapers) {
        $desktopFile = Join-Path $WallpaperSource $wallpaper.Name
        
        if (Test-Path $desktopFile) {
            try {
                Copy-Item -Path $desktopFile -Destination $wallpaper.FullName -Force -ErrorAction Stop
                Write-Status "Replaced: $($wallpaper.Name)" -Type "Success"
                $replacedCount++
            }
            catch {
                Write-Status "Could not replace: $($wallpaper.Name) - $_" -Type "Error"
            }
        }
    }
    
    if ($replacedCount -eq 0) {
        Write-Status "No matching wallpaper files found on Desktop" -Type "Warning"
        Write-Status "Expected files in $WallpaperSource :" -Type "Info"
        foreach ($wp in $existingWallpapers) {
            Write-Host "    - $($wp.Name)" -ForegroundColor Gray
        }
    }
    else {
        Write-Status "Replaced $replacedCount wallpaper(s)" -Type "Success"
    }
}

function Show-WallpaperList {
    Write-Status "Current wallpapers in system folder:" -Type "Info"
    
    if (Test-Path $WallpaperPath) {
        $wallpapers = Get-ChildItem -Path $WallpaperPath -File -ErrorAction SilentlyContinue
        foreach ($wp in $wallpapers) {
            $size = [math]::Round($wp.Length / 1KB, 2)
            Write-Host "    - $($wp.Name) ($size KB)" -ForegroundColor Gray
        }
    }
}

# ============================================
# MAIN EXECUTION
# ============================================

Clear-Host
Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "   Windows 11 Theme Cleaner" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Check for admin
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Status "This script must be run as Administrator!" -Type "Error"
    Write-Host ""
    Write-Host "Right-click the script and select 'Run as Administrator'" -ForegroundColor Yellow
    Write-Host ""
    pause
    exit 1
}

# Show current wallpapers for reference
Show-WallpaperList
Write-Host ""

Write-Host ""

# Step 1: Create backups
Write-Host "--- Creating Backups ---" -ForegroundColor Cyan
New-Item -Path $BackupRoot -ItemType Directory -Force | Out-Null
Backup-Directory -Source $SystemThemesPath -DestinationName "SystemThemes"
Backup-Directory -Source "C:\Windows\Web\Wallpaper" -DestinationName "AllWallpapers"
Backup-Directory -Source $UserThemesPath -DestinationName "UserThemes"
Write-Host ""

# Step 2: Take ownership
Write-Host "--- Taking Ownership ---" -ForegroundColor Cyan
Take-Ownership -Path $SystemThemesPath
Take-Ownership -Path $WallpaperPath
Take-Ownership -Path "C:\Windows\Web\Wallpaper"
Write-Host ""

# Step 3: Remove themes
Write-Host "--- Removing Themes ---" -ForegroundColor Cyan
Remove-UserThemes
Remove-ExtraSystemThemes
Write-Host ""

# Step 4: Remove extra wallpaper folders
Write-Host "--- Removing Extra Wallpaper Folders ---" -ForegroundColor Cyan
Remove-ExtraWallpaperFolders
Write-Host ""

# Step 5: Replace wallpapers
Write-Host "--- Replacing Wallpapers ---" -ForegroundColor Cyan
Replace-Wallpapers
Write-Host ""

# Complete
Write-Host "============================================" -ForegroundColor Green
Write-Host "   Operation Complete!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""
Write-Status "Backup location: $BackupRoot" -Type "Info"
Write-Host ""
Write-Host "You may need to:" -ForegroundColor Yellow
Write-Host "  - Log out and back in, or restart Explorer" -ForegroundColor White
Write-Host "  - Re-apply your preferred theme in Settings" -ForegroundColor White
Write-Host ""

pause
