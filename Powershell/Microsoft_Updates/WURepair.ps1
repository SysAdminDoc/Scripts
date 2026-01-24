<#
.SYNOPSIS
    WURepair - Comprehensive Windows Update Repair Tool
.DESCRIPTION
    Thoroughly diagnoses, repairs, and resets Windows Update components.
    Includes service management, cache clearing, component re-registration,
    DISM/SFC integration, network resets, and detailed logging.
.NOTES
    Author: Matt Parker
    Requires: Administrator privileges
    Version: 1.0.0
#>

#Requires -RunAsAdministrator

# ============================================================================
# CONFIGURATION
# ============================================================================

$Script:Config = @{
    LogPath        = "$env:USERPROFILE\Desktop\WURepair_$(Get-Date -Format 'yyyyMMdd_HHmmss').log"
    BackupPath     = "$env:SystemRoot\WURepair_Backup_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
    TempPath       = "$env:TEMP\WURepair"
    Verbose        = $true
    CreateBackup   = $true
    FullReset      = $true
}

# Windows Update related services
$Script:WUServices = @(
    'wuauserv',      # Windows Update
    'bits',          # Background Intelligent Transfer Service
    'cryptsvc',      # Cryptographic Services
    'msiserver',     # Windows Installer
    'trustedinstaller', # Windows Modules Installer
    'appidsvc',      # Application Identity
    'dosvc'          # Delivery Optimization
)

# DLLs to re-register
$Script:WUDlls = @(
    'atl.dll', 'urlmon.dll', 'mshtml.dll', 'shdocvw.dll', 'browseui.dll',
    'jscript.dll', 'vbscript.dll', 'scrrun.dll', 'msxml.dll', 'msxml3.dll',
    'msxml6.dll', 'actxprxy.dll', 'softpub.dll', 'wintrust.dll', 'dssenh.dll',
    'rsaenh.dll', 'gpkcsp.dll', 'sccbase.dll', 'slbcsp.dll', 'cryptdlg.dll',
    'oleaut32.dll', 'ole32.dll', 'shell32.dll', 'initpki.dll', 'wuapi.dll',
    'wuaueng.dll', 'wuaueng1.dll', 'wucltui.dll', 'wups.dll', 'wups2.dll',
    'wuweb.dll', 'qmgr.dll', 'qmgrprxy.dll', 'wucltux.dll', 'muweb.dll',
    'wuwebv.dll', 'wudriver.dll'
)

# Folders to clear/reset
$Script:WUFolders = @(
    "$env:SystemRoot\SoftwareDistribution",
    "$env:SystemRoot\System32\catroot2"
)

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

function Write-Log {
    param(
        [string]$Message,
        [ValidateSet('INFO', 'SUCCESS', 'WARNING', 'ERROR', 'SECTION')]
        [string]$Level = 'INFO'
    )
    
    $timestamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
    $logMessage = "[$timestamp] [$Level] $Message"
    
    # Console colors
    $colors = @{
        'INFO'    = 'Cyan'
        'SUCCESS' = 'Green'
        'WARNING' = 'Yellow'
        'ERROR'   = 'Red'
        'SECTION' = 'Magenta'
    }
    
    # Console output with formatting
    switch ($Level) {
        'SECTION' {
            Write-Host ""
            Write-Host ("=" * 70) -ForegroundColor $colors[$Level]
            Write-Host "  $Message" -ForegroundColor $colors[$Level]
            Write-Host ("=" * 70) -ForegroundColor $colors[$Level]
        }
        'SUCCESS' {
            Write-Host "[+] $Message" -ForegroundColor $colors[$Level]
        }
        'WARNING' {
            Write-Host "[!] $Message" -ForegroundColor $colors[$Level]
        }
        'ERROR' {
            Write-Host "[X] $Message" -ForegroundColor $colors[$Level]
        }
        default {
            Write-Host "    $Message" -ForegroundColor $colors[$Level]
        }
    }
    
    # File logging
    Add-Content -Path $Script:Config.LogPath -Value $logMessage -ErrorAction SilentlyContinue
}

function Show-Banner {
    Clear-Host
    $banner = @"

    ╦ ╦╦ ╦  ╦═╗┌─┐┌─┐┌─┐┬┬─┐
    ║║║║ ║  ╠╦╝├┤ ├─┘├─┤│├┬┘
    ╚╩╝╚═╝  ╩╚═└─┘┴  ┴ ┴┴┴└─
    Windows Update Repair Tool v1.0
    ─────────────────────────────────

"@
    Write-Host $banner -ForegroundColor Cyan
}

function Test-AdminRights {
    $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($identity)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Get-ServiceStatus {
    param([string]$ServiceName)
    try {
        $service = Get-Service -Name $ServiceName -ErrorAction Stop
        return @{
            Name = $service.Name
            DisplayName = $service.DisplayName
            Status = $service.Status
            StartType = $service.StartType
        }
    }
    catch {
        return $null
    }
}

function Invoke-WithRetry {
    param(
        [scriptblock]$ScriptBlock,
        [int]$MaxAttempts = 3,
        [int]$DelaySeconds = 2
    )
    
    $attempt = 1
    while ($attempt -le $MaxAttempts) {
        try {
            & $ScriptBlock
            return $true
        }
        catch {
            if ($attempt -eq $MaxAttempts) {
                return $false
            }
            Start-Sleep -Seconds $DelaySeconds
            $attempt++
        }
    }
}

# ============================================================================
# DIAGNOSTIC FUNCTIONS
# ============================================================================

function Get-WUDiagnostics {
    Write-Log "DIAGNOSTICS - Gathering System Information" -Level SECTION
    
    # OS Information
    $os = Get-CimInstance -ClassName Win32_OperatingSystem
    Write-Log "OS: $($os.Caption) ($($os.Version)) Build $($os.BuildNumber)"
    Write-Log "Architecture: $($os.OSArchitecture)"
    Write-Log "Install Date: $($os.InstallDate)"
    Write-Log "Last Boot: $($os.LastBootUpTime)"
    
    # Disk Space
    $systemDrive = Get-CimInstance -ClassName Win32_LogicalDisk -Filter "DeviceID='$($env:SystemDrive)'"
    $freeGB = [math]::Round($systemDrive.FreeSpace / 1GB, 2)
    $totalGB = [math]::Round($systemDrive.Size / 1GB, 2)
    Write-Log "System Drive: $freeGB GB free of $totalGB GB"
    
    if ($freeGB -lt 10) {
        Write-Log "Low disk space may cause Windows Update issues!" -Level WARNING
    }
    
    # Service Status
    Write-Log ""
    Write-Log "Windows Update Service Status:"
    foreach ($svcName in $Script:WUServices) {
        $svc = Get-ServiceStatus -ServiceName $svcName
        if ($svc) {
            $statusColor = if ($svc.Status -eq 'Running') { 'Running' } else { 'Stopped' }
            Write-Log "  $($svc.DisplayName): $($svc.Status) ($($svc.StartType))"
        }
        else {
            Write-Log "  $svcName: Not Found" -Level WARNING
        }
    }
    
    # Check for pending reboot
    $pendingReboot = $false
    $rebootPaths = @(
        'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Component Based Servicing\RebootPending',
        'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\WindowsUpdate\Auto Update\RebootRequired',
        'HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\PendingFileRenameOperations'
    )
    
    foreach ($path in $rebootPaths) {
        if (Test-Path $path) {
            $pendingReboot = $true
            break
        }
    }
    
    Write-Log ""
    if ($pendingReboot) {
        Write-Log "Pending reboot detected - may need to restart before updates work" -Level WARNING
    }
    else {
        Write-Log "No pending reboot detected" -Level SUCCESS
    }
    
    # Check Windows Update folder sizes
    Write-Log ""
    Write-Log "Windows Update Folder Sizes:"
    foreach ($folder in $Script:WUFolders) {
        if (Test-Path $folder) {
            $size = (Get-ChildItem -Path $folder -Recurse -Force -ErrorAction SilentlyContinue | 
                     Measure-Object -Property Length -Sum).Sum
            $sizeMB = [math]::Round($size / 1MB, 2)
            Write-Log "  $folder : $sizeMB MB"
        }
        else {
            Write-Log "  $folder : Not Found" -Level WARNING
        }
    }
    
    # Check for stuck pending.xml
    $pendingXml = "$env:SystemRoot\WinSxS\pending.xml"
    if (Test-Path $pendingXml) {
        Write-Log ""
        Write-Log "pending.xml exists - may indicate stuck updates" -Level WARNING
    }
    
    return @{
        OSVersion = $os.Version
        Build = $os.BuildNumber
        FreeSpaceGB = $freeGB
        PendingReboot = $pendingReboot
    }
}

function Test-WindowsUpdateConnectivity {
    Write-Log "CONNECTIVITY - Testing Windows Update Servers" -Level SECTION
    
    $endpoints = @(
        @{ Name = "Windows Update"; URL = "https://update.microsoft.com" },
        @{ Name = "Microsoft Update"; URL = "https://www.update.microsoft.com" },
        @{ Name = "Download Center"; URL = "https://download.windowsupdate.com" },
        @{ Name = "Windows Update Catalog"; URL = "https://catalog.update.microsoft.com" },
        @{ Name = "Delivery Optimization"; URL = "https://download.delivery.mp.microsoft.com" }
    )
    
    $allSuccess = $true
    foreach ($endpoint in $endpoints) {
        try {
            $response = Invoke-WebRequest -Uri $endpoint.URL -UseBasicParsing -TimeoutSec 10 -ErrorAction Stop
            Write-Log "$($endpoint.Name): Reachable" -Level SUCCESS
        }
        catch {
            Write-Log "$($endpoint.Name): UNREACHABLE - $($_.Exception.Message)" -Level ERROR
            $allSuccess = $false
        }
    }
    
    return $allSuccess
}

# ============================================================================
# REPAIR FUNCTIONS
# ============================================================================

function Stop-WUServices {
    Write-Log "SERVICES - Stopping Windows Update Services" -Level SECTION
    
    # Stop in reverse dependency order
    $stopOrder = @('wuauserv', 'bits', 'dosvc', 'cryptsvc', 'msiserver')
    
    foreach ($svcName in $stopOrder) {
        $svc = Get-Service -Name $svcName -ErrorAction SilentlyContinue
        if ($svc) {
            if ($svc.Status -eq 'Running') {
                Write-Log "Stopping $($svc.DisplayName)..."
                try {
                    Stop-Service -Name $svcName -Force -ErrorAction Stop
                    # Wait for service to stop
                    $timeout = 30
                    $timer = [Diagnostics.Stopwatch]::StartNew()
                    while ((Get-Service -Name $svcName).Status -ne 'Stopped' -and $timer.Elapsed.TotalSeconds -lt $timeout) {
                        Start-Sleep -Milliseconds 500
                    }
                    
                    if ((Get-Service -Name $svcName).Status -eq 'Stopped') {
                        Write-Log "$($svc.DisplayName) stopped" -Level SUCCESS
                    }
                    else {
                        Write-Log "$($svc.DisplayName) did not stop within timeout" -Level WARNING
                        # Force kill
                        $processName = switch ($svcName) {
                            'wuauserv' { 'svchost' }
                            'bits' { 'svchost' }
                            default { $null }
                        }
                    }
                }
                catch {
                    Write-Log "Failed to stop $($svc.DisplayName): $($_.Exception.Message)" -Level ERROR
                }
            }
            else {
                Write-Log "$($svc.DisplayName) already stopped"
            }
        }
    }
}

function Start-WUServices {
    Write-Log "SERVICES - Starting Windows Update Services" -Level SECTION
    
    # Start in dependency order
    $startOrder = @('cryptsvc', 'bits', 'wuauserv', 'dosvc', 'msiserver')
    
    foreach ($svcName in $startOrder) {
        $svc = Get-Service -Name $svcName -ErrorAction SilentlyContinue
        if ($svc) {
            # Ensure service is set to start
            try {
                Set-Service -Name $svcName -StartupType Manual -ErrorAction SilentlyContinue
            }
            catch {}
            
            if ($svc.Status -ne 'Running') {
                Write-Log "Starting $($svc.DisplayName)..."
                try {
                    Start-Service -Name $svcName -ErrorAction Stop
                    Write-Log "$($svc.DisplayName) started" -Level SUCCESS
                }
                catch {
                    Write-Log "Failed to start $($svc.DisplayName): $($_.Exception.Message)" -Level WARNING
                }
            }
            else {
                Write-Log "$($svc.DisplayName) already running"
            }
        }
    }
}

function Reset-WUServiceConfig {
    Write-Log "SERVICES - Resetting Service Configurations" -Level SECTION
    
    # Reset service security descriptors to default
    $serviceConfigs = @(
        @{ Name = 'wuauserv'; StartType = 'Manual'; SD = 'D:(A;;CCLCSWRPWPDTLOCRRC;;;SY)(A;;CCDCLCSWRPWPDTLOCRSDRCWDWO;;;BA)(A;;CCLCSWLOCRRC;;;AU)(A;;CCLCSWRPWPDTLOCRRC;;;PU)' },
        @{ Name = 'bits'; StartType = 'Manual'; SD = 'D:(A;;CCLCSWRPWPDTLOCRRC;;;SY)(A;;CCDCLCSWRPWPDTLOCRSDRCWDWO;;;BA)(A;;CCLCSWLOCRRC;;;AU)(A;;CCLCSWRPWPDTLOCRRC;;;PU)' },
        @{ Name = 'cryptsvc'; StartType = 'Automatic'; SD = $null }
    )
    
    foreach ($config in $serviceConfigs) {
        try {
            # Set start type
            Set-Service -Name $config.Name -StartupType $config.StartType -ErrorAction Stop
            Write-Log "$($config.Name): StartType set to $($config.StartType)" -Level SUCCESS
            
            # Reset security descriptor if specified
            if ($config.SD) {
                $null = sc.exe sdset $config.Name $config.SD 2>&1
            }
        }
        catch {
            Write-Log "Failed to configure $($config.Name): $($_.Exception.Message)" -Level WARNING
        }
    }
    
    # Reset BITS jobs
    Write-Log "Clearing BITS transfer queue..."
    try {
        Get-BitsTransfer -AllUsers -ErrorAction SilentlyContinue | Remove-BitsTransfer -ErrorAction SilentlyContinue
        Write-Log "BITS queue cleared" -Level SUCCESS
    }
    catch {
        Write-Log "Could not clear BITS queue (may be empty)" -Level WARNING
    }
}

function Backup-WUFolders {
    Write-Log "BACKUP - Creating Backup of Windows Update Folders" -Level SECTION
    
    if (-not (Test-Path $Script:Config.BackupPath)) {
        New-Item -Path $Script:Config.BackupPath -ItemType Directory -Force | Out-Null
    }
    
    foreach ($folder in $Script:WUFolders) {
        if (Test-Path $folder) {
            $folderName = Split-Path $folder -Leaf
            $backupDest = Join-Path $Script:Config.BackupPath $folderName
            
            Write-Log "Backing up $folderName..."
            try {
                # Just rename instead of copy for speed
                $backupName = "$folder.bak.$(Get-Date -Format 'yyyyMMdd_HHmmss')"
                Rename-Item -Path $folder -NewName $backupName -Force -ErrorAction Stop
                Write-Log "$folderName backed up to $backupName" -Level SUCCESS
            }
            catch {
                Write-Log "Could not backup $folderName : $($_.Exception.Message)" -Level WARNING
            }
        }
    }
}

function Clear-WUCache {
    Write-Log "CACHE - Clearing Windows Update Cache" -Level SECTION
    
    foreach ($folder in $Script:WUFolders) {
        if (Test-Path $folder) {
            Write-Log "Clearing $folder..."
            try {
                Remove-Item -Path "$folder\*" -Recurse -Force -ErrorAction Stop
                Write-Log "$folder cleared" -Level SUCCESS
            }
            catch {
                Write-Log "Could not fully clear $folder (files may be in use)" -Level WARNING
                # Try individual deletion
                Get-ChildItem -Path $folder -Recurse -Force -ErrorAction SilentlyContinue | 
                    ForEach-Object {
                        Remove-Item -Path $_.FullName -Recurse -Force -ErrorAction SilentlyContinue
                    }
            }
        }
        else {
            # Recreate folder
            New-Item -Path $folder -ItemType Directory -Force | Out-Null
            Write-Log "$folder recreated" -Level SUCCESS
        }
    }
    
    # Clear Windows Update download cache
    $downloadCache = "$env:SystemRoot\SoftwareDistribution\Download"
    if (Test-Path $downloadCache) {
        Write-Log "Clearing download cache..."
        Remove-Item -Path "$downloadCache\*" -Recurse -Force -ErrorAction SilentlyContinue
    }
    
    # Clear pending.xml if exists
    $pendingXml = "$env:SystemRoot\WinSxS\pending.xml"
    if (Test-Path $pendingXml) {
        Write-Log "Removing stuck pending.xml..."
        try {
            # Take ownership and remove
            takeown /f $pendingXml /a 2>&1 | Out-Null
            icacls $pendingXml /grant Administrators:F 2>&1 | Out-Null
            Remove-Item -Path $pendingXml -Force -ErrorAction Stop
            Write-Log "pending.xml removed" -Level SUCCESS
        }
        catch {
            Write-Log "Could not remove pending.xml (may require Safe Mode)" -Level WARNING
        }
    }
}

function Register-WUDlls {
    Write-Log "DLLS - Re-registering Windows Update DLLs" -Level SECTION
    
    $registered = 0
    $failed = 0
    
    foreach ($dll in $Script:WUDlls) {
        $dllPath = "$env:SystemRoot\System32\$dll"
        if (Test-Path $dllPath) {
            $result = regsvr32.exe /s $dllPath 2>&1
            $registered++
        }
        else {
            # Try SysWOW64 for 64-bit systems
            $dllPath = "$env:SystemRoot\SysWOW64\$dll"
            if (Test-Path $dllPath) {
                $result = regsvr32.exe /s $dllPath 2>&1
                $registered++
            }
            else {
                $failed++
            }
        }
    }
    
    Write-Log "$registered DLLs registered, $failed not found (normal for some)" -Level SUCCESS
}

function Reset-WinsockCatalog {
    Write-Log "NETWORK - Resetting Network Components" -Level SECTION
    
    # Reset Winsock
    Write-Log "Resetting Winsock catalog..."
    $result = netsh winsock reset 2>&1
    Write-Log "Winsock reset complete" -Level SUCCESS
    
    # Reset TCP/IP stack
    Write-Log "Resetting TCP/IP stack..."
    $result = netsh int ip reset 2>&1
    Write-Log "TCP/IP reset complete" -Level SUCCESS
    
    # Flush DNS
    Write-Log "Flushing DNS cache..."
    $result = ipconfig /flushdns 2>&1
    Write-Log "DNS cache flushed" -Level SUCCESS
    
    # Reset proxy settings for Windows Update
    Write-Log "Resetting proxy settings..."
    $result = netsh winhttp reset proxy 2>&1
    Write-Log "Proxy settings reset" -Level SUCCESS
}

function Reset-WURegistry {
    Write-Log "REGISTRY - Resetting Windows Update Registry Keys" -Level SECTION
    
    # Remove problematic registry keys
    $keysToRemove = @(
        'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\WindowsUpdate\Auto Update\RebootRequired',
        'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\WindowsUpdate\Auto Update\PostRebootReporting',
        'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Component Based Servicing\RebootPending',
        'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Component Based Servicing\RebootInProgress',
        'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Component Based Servicing\PackagesPending'
    )
    
    foreach ($key in $keysToRemove) {
        if (Test-Path $key) {
            try {
                Remove-Item -Path $key -Force -Recurse -ErrorAction Stop
                Write-Log "Removed: $key" -Level SUCCESS
            }
            catch {
                Write-Log "Could not remove: $key" -Level WARNING
            }
        }
    }
    
    # Reset Windows Update policies
    $policyPaths = @(
        'HKLM:\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate',
        'HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\WindowsUpdate'
    )
    
    foreach ($path in $policyPaths) {
        if (Test-Path $path) {
            Write-Log "Found Windows Update policy at $path"
            # Don't remove, but warn - might be intentional
            Write-Log "  (Keeping policy - remove manually if blocking updates)" -Level WARNING
        }
    }
    
    # Ensure Windows Update registry settings are correct
    $wuRegPath = 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\WindowsUpdate'
    if (-not (Test-Path $wuRegPath)) {
        New-Item -Path $wuRegPath -Force | Out-Null
    }
    
    # Reset AU settings
    $auPath = 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\WindowsUpdate\Auto Update'
    if (-not (Test-Path $auPath)) {
        New-Item -Path $auPath -Force | Out-Null
    }
    
    Write-Log "Registry cleanup complete" -Level SUCCESS
}

function Invoke-DISM {
    Write-Log "DISM - Running System Image Repairs" -Level SECTION
    
    # Check health first
    Write-Log "Checking component store health..."
    $result = DISM /Online /Cleanup-Image /CheckHealth 2>&1
    Write-Log "Health check complete"
    
    # Scan health
    Write-Log "Scanning component store (this may take several minutes)..."
    $result = DISM /Online /Cleanup-Image /ScanHealth 2>&1
    $scanOutput = $result -join "`n"
    
    if ($scanOutput -match "component store is repairable") {
        Write-Log "Component store corruption detected, repairing..." -Level WARNING
        
        # Try restore health
        Write-Log "Running RestoreHealth (this may take 15-30 minutes)..."
        $result = DISM /Online /Cleanup-Image /RestoreHealth 2>&1
        $restoreOutput = $result -join "`n"
        
        if ($LASTEXITCODE -eq 0) {
            Write-Log "Component store repaired successfully" -Level SUCCESS
        }
        else {
            Write-Log "RestoreHealth completed with issues - may need Windows media" -Level WARNING
        }
    }
    elseif ($scanOutput -match "No component store corruption detected") {
        Write-Log "No component store corruption detected" -Level SUCCESS
    }
    else {
        Write-Log "Scan completed"
    }
    
    # Start component cleanup
    Write-Log "Cleaning up superseded components..."
    $result = DISM /Online /Cleanup-Image /StartComponentCleanup 2>&1
    Write-Log "Component cleanup complete" -Level SUCCESS
}

function Invoke-SFC {
    Write-Log "SFC - Running System File Checker" -Level SECTION
    
    Write-Log "Scanning system files (this may take 10-15 minutes)..."
    
    # Run SFC
    $sfcOutput = sfc /scannow 2>&1
    $sfcResult = $sfcOutput -join "`n"
    
    if ($sfcResult -match "did not find any integrity violations") {
        Write-Log "No integrity violations found" -Level SUCCESS
    }
    elseif ($sfcResult -match "successfully repaired") {
        Write-Log "Corrupted files were found and repaired" -Level SUCCESS
    }
    elseif ($sfcResult -match "found corrupt files but was unable to fix") {
        Write-Log "Corrupt files found but could not be repaired" -Level WARNING
        Write-Log "Try running DISM again, then SFC" -Level WARNING
    }
    else {
        Write-Log "SFC scan completed"
    }
    
    # Check CBS log for details
    $cbsLog = "$env:SystemRoot\Logs\CBS\CBS.log"
    if (Test-Path $cbsLog) {
        Write-Log "Detailed results in: $cbsLog"
    }
}

function Reset-WindowsUpdateAgent {
    Write-Log "AGENT - Resetting Windows Update Agent" -Level SECTION
    
    # Delete qmgr*.dat files
    Write-Log "Removing BITS data files..."
    $bitsFiles = Get-ChildItem -Path "$env:ALLUSERSPROFILE\Application Data\Microsoft\Network\Downloader" -Filter "qmgr*.dat" -ErrorAction SilentlyContinue
    foreach ($file in $bitsFiles) {
        Remove-Item -Path $file.FullName -Force -ErrorAction SilentlyContinue
    }
    
    # Also check newer location
    $bitsFiles2 = Get-ChildItem -Path "$env:ALLUSERSPROFILE\Microsoft\Network\Downloader" -Filter "qmgr*.dat" -ErrorAction SilentlyContinue
    foreach ($file in $bitsFiles2) {
        Remove-Item -Path $file.FullName -Force -ErrorAction SilentlyContinue
    }
    Write-Log "BITS data files removed" -Level SUCCESS
    
    # Reset Windows Update authorization
    Write-Log "Resetting Windows Update authorization..."
    
    # Remove SUS client ID to force re-registration
    $susClientId = 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\WindowsUpdate'
    if (Test-Path $susClientId) {
        Remove-ItemProperty -Path $susClientId -Name 'SusClientId' -ErrorAction SilentlyContinue
        Remove-ItemProperty -Path $susClientId -Name 'SusClientIdValidation' -ErrorAction SilentlyContinue
    }
    Write-Log "Authorization reset complete" -Level SUCCESS
}

function Update-GroupPolicy {
    Write-Log "POLICY - Refreshing Group Policy" -Level SECTION
    
    Write-Log "Forcing Group Policy update..."
    $result = gpupdate /force 2>&1
    Write-Log "Group Policy refreshed" -Level SUCCESS
}

function Invoke-WindowsUpdateCheck {
    Write-Log "CHECK - Initiating Windows Update Check" -Level SECTION
    
    Write-Log "Triggering Windows Update scan..."
    try {
        # Use UsoClient on Windows 10/11
        $result = Start-Process -FilePath "UsoClient.exe" -ArgumentList "StartScan" -Wait -PassThru -WindowStyle Hidden -ErrorAction Stop
        Write-Log "Update scan initiated via UsoClient" -Level SUCCESS
    }
    catch {
        # Fallback to wuauclt
        try {
            $result = wuauclt.exe /detectnow /updatenow 2>&1
            Write-Log "Update scan initiated via wuauclt" -Level SUCCESS
        }
        catch {
            Write-Log "Could not trigger update scan automatically" -Level WARNING
        }
    }
    
    Write-Log "Open Windows Update settings to check for updates manually"
}

# ============================================================================
# MAIN EXECUTION
# ============================================================================

function Start-WURepair {
    param(
        [switch]$SkipDISM,
        [switch]$SkipSFC,
        [switch]$SkipBackup,
        [switch]$QuickMode
    )
    
    Show-Banner
    
    # Verify admin rights
    if (-not (Test-AdminRights)) {
        Write-Log "This script requires Administrator privileges!" -Level ERROR
        Write-Log "Please right-click and 'Run as Administrator'"
        return
    }
    
    $startTime = Get-Date
    Write-Log "WURepair started at $startTime"
    Write-Log "Log file: $($Script:Config.LogPath)"
    
    # Create restore point
    Write-Log ""
    Write-Log "Creating system restore point..."
    try {
        Enable-ComputerRestore -Drive "$env:SystemDrive\" -ErrorAction SilentlyContinue
        Checkpoint-Computer -Description "WURepair - Before Windows Update Reset" -RestorePointType MODIFY_SETTINGS -ErrorAction Stop
        Write-Log "Restore point created" -Level SUCCESS
    }
    catch {
        Write-Log "Could not create restore point (may be disabled)" -Level WARNING
    }
    
    # Run diagnostics
    $diag = Get-WUDiagnostics
    
    # Test connectivity
    Test-WindowsUpdateConnectivity
    
    # Confirm before proceeding
    Write-Host ""
    Write-Host "Ready to perform Windows Update reset." -ForegroundColor Yellow
    Write-Host "This will:" -ForegroundColor Yellow
    Write-Host "  - Stop Windows Update services" -ForegroundColor White
    Write-Host "  - Clear update cache and temporary files" -ForegroundColor White
    Write-Host "  - Re-register system DLLs" -ForegroundColor White
    Write-Host "  - Reset network components" -ForegroundColor White
    Write-Host "  - Clean up registry entries" -ForegroundColor White
    if (-not $SkipDISM) {
        Write-Host "  - Run DISM repairs (can take 15-30 minutes)" -ForegroundColor White
    }
    if (-not $SkipSFC) {
        Write-Host "  - Run System File Checker" -ForegroundColor White
    }
    Write-Host ""
    
    $confirm = Read-Host "Continue? (Y/N)"
    if ($confirm -notmatch '^[Yy]') {
        Write-Log "Operation cancelled by user" -Level WARNING
        return
    }
    
    # Execute repairs
    Stop-WUServices
    
    if (-not $SkipBackup -and $Script:Config.CreateBackup) {
        Backup-WUFolders
    }
    
    Clear-WUCache
    Reset-WUServiceConfig
    Register-WUDlls
    Reset-WinsockCatalog
    Reset-WURegistry
    Reset-WindowsUpdateAgent
    
    if (-not $SkipDISM -and -not $QuickMode) {
        Invoke-DISM
    }
    
    if (-not $SkipSFC -and -not $QuickMode) {
        Invoke-SFC
    }
    
    Start-WUServices
    Update-GroupPolicy
    Invoke-WindowsUpdateCheck
    
    # Summary
    $endTime = Get-Date
    $duration = $endTime - $startTime
    
    Write-Log "COMPLETE - Windows Update Repair Finished" -Level SECTION
    Write-Log "Duration: $([math]::Round($duration.TotalMinutes, 1)) minutes"
    Write-Log "Log saved to: $($Script:Config.LogPath)"
    
    Write-Host ""
    Write-Host "╔══════════════════════════════════════════════════════════════════╗" -ForegroundColor Green
    Write-Host "║                      REPAIR COMPLETE                             ║" -ForegroundColor Green
    Write-Host "║                                                                  ║" -ForegroundColor Green
    Write-Host "║  A system restart is RECOMMENDED to complete all repairs.        ║" -ForegroundColor Green
    Write-Host "║  After restart, check for Windows Updates in Settings.           ║" -ForegroundColor Green
    Write-Host "║                                                                  ║" -ForegroundColor Green
    Write-Host "╚══════════════════════════════════════════════════════════════════╝" -ForegroundColor Green
    Write-Host ""
    
    $restart = Read-Host "Restart now? (Y/N)"
    if ($restart -match '^[Yy]') {
        Write-Log "Initiating restart..."
        Restart-Computer -Force
    }
}

# ============================================================================
# COMMAND LINE INTERFACE
# ============================================================================

# Parse arguments and run
$params = @{}

if ($args -contains '-SkipDISM') { $params['SkipDISM'] = $true }
if ($args -contains '-SkipSFC') { $params['SkipSFC'] = $true }
if ($args -contains '-SkipBackup') { $params['SkipBackup'] = $true }
if ($args -contains '-QuickMode' -or $args -contains '-Quick') { $params['QuickMode'] = $true }

if ($args -contains '-Help' -or $args -contains '-?') {
    Write-Host @"

WURepair - Windows Update Repair Tool

USAGE:
    .\WURepair.ps1 [options]

OPTIONS:
    -Quick, -QuickMode  Skip DISM and SFC scans (faster, less thorough)
    -SkipDISM           Skip DISM component store repair
    -SkipSFC            Skip System File Checker
    -SkipBackup         Skip backup of Windows Update folders
    -Help               Show this help message

EXAMPLES:
    .\WURepair.ps1                    Full repair (recommended)
    .\WURepair.ps1 -Quick             Quick repair without DISM/SFC
    .\WURepair.ps1 -SkipDISM          Skip only DISM repair

"@
    exit
}

# Run the repair
Start-WURepair @params
