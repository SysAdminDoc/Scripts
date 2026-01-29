#Requires -RunAsAdministrator
<#
.SYNOPSIS
    PS1 File Association & Context Menu Setup
.DESCRIPTION
    Installs PowerShell 7 via winget, associates .ps1 files with PowerShell,
    and adds right-click context menu options including "Run as Administrator"
.NOTES
    Author: Claude
    Requires: Administrator privileges, Windows 10/11
#>

param(
    [switch]$SkipPowerShellInstall
)

# ============================================================================
# Configuration
# ============================================================================

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

# Colors for output
function Write-Status { param($Message) Write-Host "[*] " -ForegroundColor Cyan -NoNewline; Write-Host $Message }
function Write-Success { param($Message) Write-Host "[+] " -ForegroundColor Green -NoNewline; Write-Host $Message }
function Write-Failure { param($Message) Write-Host "[-] " -ForegroundColor Red -NoNewline; Write-Host $Message }
function Write-Info { param($Message) Write-Host "    " -NoNewline; Write-Host $Message -ForegroundColor DarkGray }

# ============================================================================
# Admin Check
# ============================================================================

$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Failure "This script requires Administrator privileges."
    Write-Info "Please run PowerShell as Administrator and try again."
    pause
    exit 1
}

Write-Host ""
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host "  PS1 File Association & Context Menu Setup" -ForegroundColor White
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host ""

# ============================================================================
# Step 1: Install PowerShell 7 via Winget
# ============================================================================

if (-not $SkipPowerShellInstall) {
    Write-Status "Checking for winget..."

    $winget = Get-Command winget -ErrorAction SilentlyContinue
    if (-not $winget) {
        Write-Failure "Winget not found. Attempting to install App Installer..."
        try {
            Add-AppxPackage -RegisterByFamilyName -MainPackage Microsoft.DesktopAppInstaller_8wekyb3d8bbwe -ErrorAction Stop
            Start-Sleep -Seconds 3
            $winget = Get-Command winget -ErrorAction SilentlyContinue
            if (-not $winget) { throw "Winget still not available" }
        }
        catch {
            Write-Failure "Could not install winget automatically."
            Write-Info "Please install App Installer from the Microsoft Store and try again."
            pause
            exit 1
        }
    }
    Write-Success "Winget is available."

    Write-Status "Checking for existing PowerShell 7 installation..."
    $pwshPath = $null
    $possiblePaths = @(
        "$env:ProgramFiles\PowerShell\7\pwsh.exe",
        "$env:ProgramFiles\PowerShell\7-preview\pwsh.exe",
        (Get-Command pwsh -ErrorAction SilentlyContinue).Source
    )

    foreach ($path in $possiblePaths) {
        if ($path -and (Test-Path $path)) {
            $pwshPath = $path
            break
        }
    }

    if ($pwshPath) {
        $version = & $pwshPath -NoProfile -Command '$PSVersionTable.PSVersion.ToString()'
        Write-Success "PowerShell 7 already installed: v$version"
        Write-Info "Path: $pwshPath"
    }
    else {
        Write-Status "Installing PowerShell 7 via winget..."
        try {
            $installResult = winget install Microsoft.PowerShell --accept-source-agreements --accept-package-agreements 2>&1
            if ($LASTEXITCODE -eq 0 -or $installResult -match "already installed") {
                Write-Success "PowerShell 7 installed successfully."
            }
            else {
                Write-Info ($installResult | Out-String)
            }
        }
        catch {
            Write-Failure "Failed to install PowerShell: $_"
        }

        # Refresh PATH
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")
    }

    # Find pwsh.exe path
    $pwshPath = "$env:ProgramFiles\PowerShell\7\pwsh.exe"
    if (-not (Test-Path $pwshPath)) {
        $pwshPath = (Get-Command pwsh -ErrorAction SilentlyContinue).Source
    }
    if (-not $pwshPath -or -not (Test-Path $pwshPath)) {
        Write-Failure "Could not locate pwsh.exe after installation."
        Write-Info "Falling back to Windows PowerShell (powershell.exe)"
        $pwshPath = "$env:SystemRoot\System32\WindowsPowerShell\v1.0\powershell.exe"
    }
}
else {
    $pwshPath = "$env:ProgramFiles\PowerShell\7\pwsh.exe"
    if (-not (Test-Path $pwshPath)) {
        $pwshPath = (Get-Command pwsh -ErrorAction SilentlyContinue).Source
    }
    if (-not $pwshPath) {
        $pwshPath = "$env:SystemRoot\System32\WindowsPowerShell\v1.0\powershell.exe"
    }
}

Write-Success "Using PowerShell executable: $pwshPath"
Write-Host ""

# ============================================================================
# Step 2: Create File Association for .ps1
# ============================================================================

Write-Status "Setting up .ps1 file association..."

$progId = "PowerShell.Script"
$fileDescription = "PowerShell Script"

try {
    # Create ProgId entry
    $progIdPath = "HKLM:\SOFTWARE\Classes\$progId"
    
    if (-not (Test-Path $progIdPath)) {
        New-Item -Path $progIdPath -Force | Out-Null
    }
    Set-ItemProperty -Path $progIdPath -Name "(Default)" -Value $fileDescription

    # Set default icon
    $iconPath = "$progIdPath\DefaultIcon"
    if (-not (Test-Path $iconPath)) {
        New-Item -Path $iconPath -Force | Out-Null
    }
    Set-ItemProperty -Path $iconPath -Name "(Default)" -Value "`"$pwshPath`",0"

    # Associate .ps1 extension with ProgId
    $extPath = "HKLM:\SOFTWARE\Classes\.ps1"
    if (-not (Test-Path $extPath)) {
        New-Item -Path $extPath -Force | Out-Null
    }
    Set-ItemProperty -Path $extPath -Name "(Default)" -Value $progId

    Write-Success "File association created for .ps1 files."
}
catch {
    Write-Failure "Failed to create file association: $_"
}

# ============================================================================
# Step 3: Add Shell Context Menu Commands
# ============================================================================

Write-Status "Adding context menu options..."

$shellPath = "HKLM:\SOFTWARE\Classes\$progId\shell"

# Ensure shell key exists
if (-not (Test-Path $shellPath)) {
    New-Item -Path $shellPath -Force | Out-Null
}

# --- Command 1: Run with PowerShell ---
try {
    $runPath = "$shellPath\Run with PowerShell"
    if (-not (Test-Path $runPath)) {
        New-Item -Path $runPath -Force | Out-Null
    }
    Set-ItemProperty -Path $runPath -Name "(Default)" -Value "Run with PowerShell"
    Set-ItemProperty -Path $runPath -Name "Icon" -Value "`"$pwshPath`",0"

    $runCommandPath = "$runPath\command"
    if (-not (Test-Path $runCommandPath)) {
        New-Item -Path $runCommandPath -Force | Out-Null
    }
    $runCommand = "`"$pwshPath`" -NoLogo -ExecutionPolicy Bypass -File `"%1`""
    Set-ItemProperty -Path $runCommandPath -Name "(Default)" -Value $runCommand

    Write-Success "Added: 'Run with PowerShell'"
}
catch {
    Write-Failure "Failed to add 'Run with PowerShell': $_"
}

# --- Command 2: Run as Administrator ---
try {
    $adminPath = "$shellPath\Run as Administrator"
    if (-not (Test-Path $adminPath)) {
        New-Item -Path $adminPath -Force | Out-Null
    }
    Set-ItemProperty -Path $adminPath -Name "(Default)" -Value "Run as Administrator"
    Set-ItemProperty -Path $adminPath -Name "Icon" -Value "`"$pwshPath`",0"
    Set-ItemProperty -Path $adminPath -Name "HasLUAShield" -Value ""

    $adminCommandPath = "$adminPath\command"
    if (-not (Test-Path $adminCommandPath)) {
        New-Item -Path $adminCommandPath -Force | Out-Null
    }
    $adminCommand = "`"$pwshPath`" -NoLogo -ExecutionPolicy Bypass -Command `"Start-Process -Verb RunAs -FilePath '$pwshPath' -ArgumentList '-NoLogo -ExecutionPolicy Bypass -File \`"`"%1\`"`"'`""
    Set-ItemProperty -Path $adminCommandPath -Name "(Default)" -Value $adminCommand

    Write-Success "Added: 'Run as Administrator'"
}
catch {
    Write-Failure "Failed to add 'Run as Administrator': $_"
}

# --- Command 3: Edit with PowerShell ISE ---
try {
    $isePath = "$env:SystemRoot\System32\WindowsPowerShell\v1.0\powershell_ise.exe"
    if (Test-Path $isePath) {
        $editIsePath = "$shellPath\Edit with PowerShell ISE"
        if (-not (Test-Path $editIsePath)) {
            New-Item -Path $editIsePath -Force | Out-Null
        }
        Set-ItemProperty -Path $editIsePath -Name "(Default)" -Value "Edit with PowerShell ISE"
        Set-ItemProperty -Path $editIsePath -Name "Icon" -Value "`"$isePath`",0"

        $editIseCommandPath = "$editIsePath\command"
        if (-not (Test-Path $editIseCommandPath)) {
            New-Item -Path $editIseCommandPath -Force | Out-Null
        }
        Set-ItemProperty -Path $editIseCommandPath -Name "(Default)" -Value "`"$isePath`" `"%1`""

        Write-Success "Added: 'Edit with PowerShell ISE'"
    }
}
catch {
    Write-Info "PowerShell ISE not available, skipping..."
}

# --- Command 4: Open in VS Code (if installed) ---
try {
    $vscodePath = "$env:LocalAppData\Programs\Microsoft VS Code\Code.exe"
    if (-not (Test-Path $vscodePath)) {
        $vscodePath = "$env:ProgramFiles\Microsoft VS Code\Code.exe"
    }
    
    if (Test-Path $vscodePath) {
        $editVsCodePath = "$shellPath\Edit with VS Code"
        if (-not (Test-Path $editVsCodePath)) {
            New-Item -Path $editVsCodePath -Force | Out-Null
        }
        Set-ItemProperty -Path $editVsCodePath -Name "(Default)" -Value "Edit with VS Code"
        Set-ItemProperty -Path $editVsCodePath -Name "Icon" -Value "`"$vscodePath`",0"

        $editVsCodeCommandPath = "$editVsCodePath\command"
        if (-not (Test-Path $editVsCodeCommandPath)) {
            New-Item -Path $editVsCodeCommandPath -Force | Out-Null
        }
        Set-ItemProperty -Path $editVsCodeCommandPath -Name "(Default)" -Value "`"$vscodePath`" `"%1`""

        Write-Success "Added: 'Edit with VS Code'"
    }
}
catch {
    Write-Info "VS Code not found, skipping..."
}

# ============================================================================
# Step 4: Set Default Action (Double-click behavior)
# ============================================================================

Write-Status "Setting default double-click action..."

try {
    # Set the default action to "Run with PowerShell"
    Set-ItemProperty -Path $shellPath -Name "(Default)" -Value "Run with PowerShell"
    Write-Success "Default action set to 'Run with PowerShell'"
}
catch {
    Write-Failure "Failed to set default action: $_"
}

# ============================================================================
# Step 5: Also add to SystemFileAssociations for consistency
# ============================================================================

Write-Status "Adding context menus to SystemFileAssociations..."

try {
    $sysPath = "HKLM:\SOFTWARE\Classes\SystemFileAssociations\.ps1\shell"
    
    if (-not (Test-Path $sysPath)) {
        New-Item -Path $sysPath -Force | Out-Null
    }

    # Run as Admin in SystemFileAssociations
    $sysAdminPath = "$sysPath\RunAsAdmin"
    if (-not (Test-Path $sysAdminPath)) {
        New-Item -Path $sysAdminPath -Force | Out-Null
    }
    Set-ItemProperty -Path $sysAdminPath -Name "(Default)" -Value "Run as Administrator"
    Set-ItemProperty -Path $sysAdminPath -Name "Icon" -Value "`"$pwshPath`",0"
    Set-ItemProperty -Path $sysAdminPath -Name "HasLUAShield" -Value ""

    $sysAdminCommandPath = "$sysAdminPath\command"
    if (-not (Test-Path $sysAdminCommandPath)) {
        New-Item -Path $sysAdminCommandPath -Force | Out-Null
    }
    $adminCommand = "`"$pwshPath`" -NoLogo -ExecutionPolicy Bypass -Command `"Start-Process -Verb RunAs -FilePath '$pwshPath' -ArgumentList '-NoLogo -ExecutionPolicy Bypass -File \`"`"%1\`"`"'`""
    Set-ItemProperty -Path $sysAdminCommandPath -Name "(Default)" -Value $adminCommand

    Write-Success "SystemFileAssociations updated."
}
catch {
    Write-Failure "Failed to update SystemFileAssociations: $_"
}

# ============================================================================
# Step 6: Refresh Shell Icon Cache
# ============================================================================

Write-Status "Refreshing shell icon cache..."

try {
    # Notify shell of changes
    $code = @'
    [System.Runtime.InteropServices.DllImport("Shell32.dll")]
    public static extern int SHChangeNotify(int eventId, int flags, IntPtr item1, IntPtr item2);
'@
    $shell = Add-Type -MemberDefinition $code -Name "ShellNotify" -Namespace "Win32" -PassThru
    $shell::SHChangeNotify(0x08000000, 0x0000, [IntPtr]::Zero, [IntPtr]::Zero) | Out-Null
    Write-Success "Shell cache refreshed."
}
catch {
    Write-Info "Could not refresh shell cache. You may need to restart Explorer."
}

# ============================================================================
# Summary
# ============================================================================

Write-Host ""
Write-Host "======================================================" -ForegroundColor Green
Write-Host "  Setup Complete!" -ForegroundColor White
Write-Host "======================================================" -ForegroundColor Green
Write-Host ""
Write-Host "The following context menu options are now available" -ForegroundColor White
Write-Host "when you right-click on .ps1 files:" -ForegroundColor White
Write-Host ""
Write-Host "  - Run with PowerShell" -ForegroundColor Cyan
Write-Host "  - Run as Administrator" -ForegroundColor Cyan
Write-Host "  - Edit with PowerShell ISE (if available)" -ForegroundColor Cyan
Write-Host "  - Edit with VS Code (if installed)" -ForegroundColor Cyan
Write-Host ""
Write-Host "PowerShell Path: " -NoNewline; Write-Host $pwshPath -ForegroundColor Yellow
Write-Host ""
Write-Host "Note: You may need to restart Explorer or log out/in" -ForegroundColor DarkGray
Write-Host "      for all changes to take effect." -ForegroundColor DarkGray
Write-Host ""
pause
