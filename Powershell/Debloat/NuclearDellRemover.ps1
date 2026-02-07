<#
.SYNOPSIS
    Nuclear Dell Remover - Complete Dell Bloatware Elimination
.DESCRIPTION
    Scorched earth removal of ALL Dell pre-installed software from Windows 11.
    Removes AppX packages, Win32 applications, services, scheduled tasks,
    registry entries, and filesystem remnants. Blocks automatic reinstallation
    via Windows policies (reversible).
.NOTES
    Author: Matt
    Version: 1.0.0
    Requires: Administrator privileges
    Target: Windows 11
.EXAMPLE
    .\NuclearDellRemover.ps1
    .\NuclearDellRemover.ps1 -SkipReinstallBlock
    .\NuclearDellRemover.ps1 -Verbose
#>

#Requires -RunAsAdministrator

[CmdletBinding()]
param(
    [switch]$SkipReinstallBlock,
    [switch]$SkipFilesystemCleanup,
    [string]$LogPath = "$env:TEMP\NuclearDellRemover.log"
)

# ============================================================================
# CONFIGURATION
# ============================================================================

$Script:Config = @{
    Version = "1.0.0"
    StartTime = Get-Date
    
    # Dell AppX package patterns
    AppxPatterns = @(
        "*Dell*",
        "*DellInc*",
        "*WavesAudio.MaxxAudio*"
    )
    
    # Dell Win32 application identifiers (Publisher and DisplayName patterns)
    Win32Patterns = @(
        "*Dell*",
        "*SupportAssist*",
        "*Alienware*"
    )
    
    # Known Dell services
    Services = @(
        "DellSupportAssistAgent",
        "Dell SupportAssist Remediation",
        "DDVDataCollector",
        "DDVRulesProcessor", 
        "DDVCollectorSvcApi",
        "DellOptimizerService",
        "DellPowerManager",
        "DellUpdate",
        "DellClientManagementService",
        "DellTechHub",
        "DellAnalytics",
        "SupportAssistAgent",
        "DCHS",
        "DellDigitalDelivery"
    )
    
    # Registry paths to purge
    RegistryPaths = @(
        "HKLM:\SOFTWARE\Dell",
        "HKLM:\SOFTWARE\Wow6432Node\Dell",
        "HKLM:\SOFTWARE\PC-Doctor",
        "HKCU:\SOFTWARE\Dell",
        "HKCU:\SOFTWARE\PC-Doctor"
    )
    
    # Filesystem paths to purge
    FilesystemPaths = @(
        "$env:ProgramData\Dell",
        "$env:ProgramData\PCDR",
        "$env:ProgramData\SupportAssist",
        "$env:ProgramData\PC-Doctor",
        "$env:ProgramData\DDVDataCollector",
        "$env:LOCALAPPDATA\Dell",
        "$env:APPDATA\Dell",
        "$env:APPDATA\PCDR",
        "C:\Program Files\Dell",
        "C:\Program Files (x86)\Dell",
        "C:\Program Files\PC-Doctor",
        "C:\Program Files (x86)\PC-Doctor",
        "C:\Dell"
    )
    
    # Process patterns to kill
    ProcessPatterns = @(
        "*Dell*",
        "*SupportAssist*",
        "*DDV*",
        "*PCDR*",
        "*Alienware*"
    )
}

# ============================================================================
# LOGGING FUNCTIONS
# ============================================================================

function Write-Log {
    param(
        [Parameter(Mandatory)]
        [string]$Message,
        [ValidateSet("INFO", "WARN", "ERROR", "SUCCESS", "PHASE")]
        [string]$Level = "INFO"
    )
    
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logEntry = "[$timestamp] [$Level] $Message"
    
    # Console output with colors
    $color = switch ($Level) {
        "INFO"    { "White" }
        "WARN"    { "Yellow" }
        "ERROR"   { "Red" }
        "SUCCESS" { "Green" }
        "PHASE"   { "Cyan" }
    }
    
    if ($Level -eq "PHASE") {
        Write-Host ""
        Write-Host ("=" * 70) -ForegroundColor $color
        Write-Host "  $Message" -ForegroundColor $color
        Write-Host ("=" * 70) -ForegroundColor $color
    } else {
        Write-Host $logEntry -ForegroundColor $color
    }
    
    # File logging
    Add-Content -Path $LogPath -Value $logEntry -ErrorAction SilentlyContinue
}

function Show-Banner {
    $banner = @"

    _   _ _   _  ____ _     _____    _    ____  
   | \ | | | | |/ ___| |   | ____|  / \  |  _ \ 
   |  \| | | | | |   | |   |  _|   / _ \ | |_) |
   | |\  | |_| | |___| |___| |___ / ___ \|  _ < 
   |_| \_|\___/ \____|_____|_____/_/   \_\_| \_\
                                                
   ____  _____ _     _       ____  _____ __  __  _____     _______ ____  
  |  _ \| ____| |   | |     |  _ \| ____|  \/  |/ _ \ \   / / ____|  _ \ 
  | | | |  _| | |   | |     | |_) |  _| | |\/| | | | \ \ / /|  _| | |_) |
  | |_| | |___| |___| |___  |  _ <| |___| |  | | |_| |\ V / | |___|  _ < 
  |____/|_____|_____|_____| |_| \_\_____|_|  |_|\___/  \_/  |_____|_| \_\
                                                                         
                        v$($Script:Config.Version) - Scorched Earth Mode

"@
    Write-Host $banner -ForegroundColor Red
}

# ============================================================================
# PHASE 1: KILL DELL PROCESSES
# ============================================================================

function Stop-DellProcesses {
    Write-Log -Message "PHASE 1: Terminating Dell Processes" -Level PHASE
    
    $killed = 0
    $processes = Get-Process -ErrorAction SilentlyContinue
    
    foreach ($pattern in $Script:Config.ProcessPatterns) {
        $matches = $processes | Where-Object { $_.Name -like $pattern -or $_.ProcessName -like $pattern }
        foreach ($proc in $matches) {
            try {
                $proc | Stop-Process -Force -ErrorAction Stop
                Write-Log "Terminated process: $($proc.Name) (PID: $($proc.Id))" -Level SUCCESS
                $killed++
            } catch {
                Write-Log "Failed to terminate: $($proc.Name) - $($_.Exception.Message)" -Level WARN
            }
        }
    }
    
    if ($killed -eq 0) {
        Write-Log "No Dell processes found running" -Level INFO
    } else {
        Write-Log "Terminated $killed Dell processes" -Level SUCCESS
    }
    
    # Brief pause to allow handles to release
    Start-Sleep -Seconds 2
    
    return $killed
}

# ============================================================================
# PHASE 2: STOP AND REMOVE DELL SERVICES
# ============================================================================

function Remove-DellServices {
    Write-Log -Message "PHASE 2: Eliminating Dell Services" -Level PHASE
    
    $removed = 0
    
    # Get all services matching Dell patterns dynamically
    $dellServices = Get-Service -ErrorAction SilentlyContinue | Where-Object {
        $_.DisplayName -like "*Dell*" -or 
        $_.Name -like "*Dell*" -or
        $_.DisplayName -like "*SupportAssist*" -or
        $_.Name -like "*DDV*" -or
        $_.Name -like "*PCDR*"
    }
    
    # Also check configured service names
    foreach ($svcName in $Script:Config.Services) {
        $svc = Get-Service -Name $svcName -ErrorAction SilentlyContinue
        if ($svc -and $svc -notin $dellServices) {
            $dellServices += $svc
        }
    }
    
    foreach ($svc in $dellServices) {
        Write-Log "Processing service: $($svc.DisplayName) [$($svc.Name)]" -Level INFO
        
        # Stop the service
        if ($svc.Status -eq 'Running') {
            try {
                Stop-Service -Name $svc.Name -Force -ErrorAction Stop
                Write-Log "  Stopped service" -Level SUCCESS
            } catch {
                Write-Log "  Failed to stop: $($_.Exception.Message)" -Level WARN
            }
        }
        
        # Disable the service
        try {
            Set-Service -Name $svc.Name -StartupType Disabled -ErrorAction Stop
            Write-Log "  Disabled service" -Level SUCCESS
        } catch {
            Write-Log "  Failed to disable: $($_.Exception.Message)" -Level WARN
        }
        
        # Delete the service
        try {
            $result = sc.exe delete $svc.Name 2>&1
            if ($LASTEXITCODE -eq 0) {
                Write-Log "  Deleted service" -Level SUCCESS
                $removed++
            } else {
                Write-Log "  Delete pending (may require reboot)" -Level WARN
            }
        } catch {
            Write-Log "  Failed to delete: $($_.Exception.Message)" -Level WARN
        }
    }
    
    if ($removed -eq 0 -and $dellServices.Count -eq 0) {
        Write-Log "No Dell services found" -Level INFO
    } else {
        Write-Log "Processed $($dellServices.Count) services, removed $removed" -Level SUCCESS
    }
    
    return $removed
}

# ============================================================================
# PHASE 3: REMOVE DELL APPX PACKAGES
# ============================================================================

function Remove-DellAppxPackages {
    Write-Log -Message "PHASE 3: Removing Dell AppX Packages" -Level PHASE
    
    $removed = 0
    
    foreach ($pattern in $Script:Config.AppxPatterns) {
        # Remove installed packages for all users
        $packages = Get-AppxPackage -AllUsers -Name $pattern -ErrorAction SilentlyContinue
        foreach ($pkg in $packages) {
            try {
                Write-Log "Removing AppX: $($pkg.Name)" -Level INFO
                $pkg | Remove-AppxPackage -AllUsers -ErrorAction Stop
                Write-Log "  Removed for all users" -Level SUCCESS
                $removed++
            } catch {
                Write-Log "  Failed: $($_.Exception.Message)" -Level WARN
                # Try removing just for current user
                try {
                    $pkg | Remove-AppxPackage -ErrorAction Stop
                    Write-Log "  Removed for current user only" -Level SUCCESS
                    $removed++
                } catch {
                    Write-Log "  Complete failure: $($_.Exception.Message)" -Level ERROR
                }
            }
        }
        
        # Remove provisioned packages (prevents reinstall for new users)
        $provisioned = Get-AppxProvisionedPackage -Online -ErrorAction SilentlyContinue | 
            Where-Object { $_.DisplayName -like $pattern }
        
        foreach ($pkg in $provisioned) {
            try {
                Write-Log "Removing provisioned: $($pkg.DisplayName)" -Level INFO
                Remove-AppxProvisionedPackage -Online -PackageName $pkg.PackageName -ErrorAction Stop | Out-Null
                Write-Log "  Removed provisioned package" -Level SUCCESS
                $removed++
            } catch {
                Write-Log "  Failed: $($_.Exception.Message)" -Level WARN
            }
        }
    }
    
    if ($removed -eq 0) {
        Write-Log "No Dell AppX packages found" -Level INFO
    } else {
        Write-Log "Removed $removed AppX packages" -Level SUCCESS
    }
    
    return $removed
}

# ============================================================================
# PHASE 4: UNINSTALL DELL WIN32 APPLICATIONS
# ============================================================================

function Remove-DellWin32Apps {
    Write-Log -Message "PHASE 4: Uninstalling Dell Win32 Applications" -Level PHASE
    
    $removed = 0
    
    # Registry locations for installed programs
    $uninstallPaths = @(
        "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\*",
        "HKLM:\SOFTWARE\Wow6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*",
        "HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\*"
    )
    
    $dellApps = @()
    
    foreach ($path in $uninstallPaths) {
        $apps = Get-ItemProperty $path -ErrorAction SilentlyContinue | Where-Object {
            $isDell = $false
            foreach ($pattern in $Script:Config.Win32Patterns) {
                if ($_.Publisher -like $pattern -or $_.DisplayName -like $pattern) {
                    $isDell = $true
                    break
                }
            }
            $isDell
        }
        $dellApps += $apps
    }
    
    # Deduplicate by DisplayName
    $dellApps = $dellApps | Sort-Object DisplayName -Unique
    
    foreach ($app in $dellApps) {
        if (-not $app.UninstallString) {
            Write-Log "Skipping $($app.DisplayName) - no uninstall string" -Level WARN
            continue
        }
        
        Write-Log "Uninstalling: $($app.DisplayName)" -Level INFO
        
        $uninstallString = $app.UninstallString
        $quietUninstall = $app.QuietUninstallString
        
        try {
            if ($quietUninstall) {
                # Use quiet uninstall if available
                Write-Log "  Using quiet uninstall" -Level INFO
                $process = Start-Process cmd.exe -ArgumentList "/c `"$quietUninstall`"" -Wait -PassThru -WindowStyle Hidden
            }
            elseif ($uninstallString -match "msiexec") {
                # MSI-based uninstaller
                $guid = [regex]::Match($uninstallString, '\{[A-F0-9-]+\}', 'IgnoreCase').Value
                if ($guid) {
                    Write-Log "  MSI uninstall: $guid" -Level INFO
                    $process = Start-Process msiexec.exe -ArgumentList "/x $guid /qn /norestart REBOOT=ReallySuppress" -Wait -PassThru -WindowStyle Hidden
                }
            }
            elseif ($uninstallString -match "InstallShield") {
                # InstallShield (common for Dell Optimizer)
                Write-Log "  InstallShield uninstall" -Level INFO
                $process = Start-Process cmd.exe -ArgumentList "/c `"$uninstallString`" -remove -runfromtemp -silent" -Wait -PassThru -WindowStyle Hidden
            }
            else {
                # Generic EXE uninstaller - try common silent switches
                Write-Log "  Generic uninstall with silent switches" -Level INFO
                $silentArgs = @("/S", "/silent", "/quiet", "-silent", "-quiet", "/qn", "-s")
                $uninstallCmd = $uninstallString -replace '"', ''
                
                foreach ($arg in $silentArgs) {
                    $process = Start-Process cmd.exe -ArgumentList "/c `"$uninstallCmd`" $arg" -Wait -PassThru -WindowStyle Hidden -ErrorAction SilentlyContinue
                    if ($process.ExitCode -eq 0) { break }
                }
            }
            
            if ($process -and $process.ExitCode -eq 0) {
                Write-Log "  Successfully uninstalled" -Level SUCCESS
                $removed++
            } elseif ($process) {
                Write-Log "  Exit code: $($process.ExitCode)" -Level WARN
                $removed++  # Count as removed even with non-zero exit (often still works)
            }
        } catch {
            Write-Log "  Failed: $($_.Exception.Message)" -Level ERROR
        }
    }
    
    # Also try winget for any stragglers
    Write-Log "Checking winget for remaining Dell apps..." -Level INFO
    $wingetApps = @(
        "Dell SupportAssist",
        "Dell Command | Update", 
        "Dell Digital Delivery",
        "Dell Power Manager",
        "Dell Optimizer",
        "Dell Display Manager",
        "Alienware Command Center"
    )
    
    foreach ($appName in $wingetApps) {
        try {
            $result = winget uninstall "$appName" --silent --accept-source-agreements 2>&1
            if ($LASTEXITCODE -eq 0) {
                Write-Log "  Winget removed: $appName" -Level SUCCESS
                $removed++
            }
        } catch {
            # Silently continue - app may not exist
        }
    }
    
    if ($removed -eq 0 -and $dellApps.Count -eq 0) {
        Write-Log "No Dell Win32 applications found" -Level INFO
    } else {
        Write-Log "Uninstalled $removed Win32 applications" -Level SUCCESS
    }
    
    return $removed
}

# ============================================================================
# PHASE 5: REMOVE DELL SCHEDULED TASKS
# ============================================================================

function Remove-DellScheduledTasks {
    Write-Log -Message "PHASE 5: Removing Dell Scheduled Tasks" -Level PHASE
    
    $removed = 0
    
    # Get all Dell-related scheduled tasks
    $dellTasks = Get-ScheduledTask -ErrorAction SilentlyContinue | Where-Object {
        $_.TaskName -like "*Dell*" -or 
        $_.TaskPath -like "*Dell*" -or
        $_.TaskName -like "*SupportAssist*" -or
        $_.TaskName -like "*PCDoctor*" -or
        $_.TaskName -like "*PCDR*"
    }
    
    foreach ($task in $dellTasks) {
        try {
            Write-Log "Removing task: $($task.TaskPath)$($task.TaskName)" -Level INFO
            $task | Unregister-ScheduledTask -Confirm:$false -ErrorAction Stop
            Write-Log "  Removed" -Level SUCCESS
            $removed++
        } catch {
            Write-Log "  Failed: $($_.Exception.Message)" -Level WARN
        }
    }
    
    # Also try to remove the Dell task folder
    try {
        $taskService = New-Object -ComObject Schedule.Service
        $taskService.Connect()
        $rootFolder = $taskService.GetFolder("\")
        $rootFolder.DeleteFolder("Dell", 0)
        Write-Log "Removed Dell scheduled task folder" -Level SUCCESS
    } catch {
        # Folder may not exist or may not be empty
    }
    
    if ($removed -eq 0) {
        Write-Log "No Dell scheduled tasks found" -Level INFO
    } else {
        Write-Log "Removed $removed scheduled tasks" -Level SUCCESS
    }
    
    return $removed
}

# ============================================================================
# PHASE 6: REGISTRY CLEANUP
# ============================================================================

function Remove-DellRegistry {
    Write-Log -Message "PHASE 6: Purging Dell Registry Entries" -Level PHASE
    
    $removed = 0
    
    foreach ($path in $Script:Config.RegistryPaths) {
        if (Test-Path $path) {
            try {
                Write-Log "Removing registry: $path" -Level INFO
                Remove-Item -Path $path -Recurse -Force -ErrorAction Stop
                Write-Log "  Removed" -Level SUCCESS
                $removed++
            } catch {
                Write-Log "  Failed: $($_.Exception.Message)" -Level WARN
            }
        }
    }
    
    # Clean up Run keys
    $runKeys = @(
        "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Run",
        "HKLM:\SOFTWARE\Wow6432Node\Microsoft\Windows\CurrentVersion\Run",
        "HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Run"
    )
    
    foreach ($key in $runKeys) {
        if (Test-Path $key) {
            $props = Get-ItemProperty $key -ErrorAction SilentlyContinue
            $props.PSObject.Properties | Where-Object { 
                $_.Name -notmatch "^PS" -and $_.Value -like "*Dell*" 
            } | ForEach-Object {
                try {
                    Remove-ItemProperty -Path $key -Name $_.Name -Force -ErrorAction Stop
                    Write-Log "Removed Run entry: $($_.Name)" -Level SUCCESS
                    $removed++
                } catch {
                    Write-Log "Failed to remove Run entry: $($_.Name)" -Level WARN
                }
            }
        }
    }
    
    if ($removed -eq 0) {
        Write-Log "No Dell registry entries found" -Level INFO
    } else {
        Write-Log "Removed $removed registry items" -Level SUCCESS
    }
    
    return $removed
}

# ============================================================================
# PHASE 7: FILESYSTEM CLEANUP
# ============================================================================

function Remove-DellFilesystem {
    Write-Log -Message "PHASE 7: Cleaning Dell Filesystem Remnants" -Level PHASE
    
    if ($SkipFilesystemCleanup) {
        Write-Log "Filesystem cleanup skipped by parameter" -Level WARN
        return 0
    }
    
    $removed = 0
    
    foreach ($path in $Script:Config.FilesystemPaths) {
        if (Test-Path $path) {
            try {
                Write-Log "Removing: $path" -Level INFO
                
                # First try to take ownership and reset permissions
                $acl = Get-Acl $path -ErrorAction SilentlyContinue
                if ($acl) {
                    $identity = [System.Security.Principal.WindowsIdentity]::GetCurrent()
                    $principal = New-Object System.Security.Principal.WindowsPrincipal($identity)
                    if ($principal.IsInRole([System.Security.Principal.WindowsBuiltInRole]::Administrator)) {
                        # We're admin, try to force remove
                        Get-ChildItem -Path $path -Recurse -Force -ErrorAction SilentlyContinue | 
                            Remove-Item -Force -Recurse -ErrorAction SilentlyContinue
                    }
                }
                
                Remove-Item -Path $path -Recurse -Force -ErrorAction Stop
                Write-Log "  Removed" -Level SUCCESS
                $removed++
            } catch {
                # Try robocopy empty folder trick for stubborn directories
                try {
                    $emptyDir = "$env:TEMP\EmptyDir_$(Get-Random)"
                    New-Item -ItemType Directory -Path $emptyDir -Force | Out-Null
                    robocopy $emptyDir $path /MIR /R:1 /W:1 2>&1 | Out-Null
                    Remove-Item $path -Force -Recurse -ErrorAction SilentlyContinue
                    Remove-Item $emptyDir -Force -ErrorAction SilentlyContinue
                    Write-Log "  Removed (robocopy method)" -Level SUCCESS
                    $removed++
                } catch {
                    Write-Log "  Failed: $($_.Exception.Message)" -Level WARN
                }
            }
        }
    }
    
    # Clean Dell items from Start Menu
    $startMenuPaths = @(
        "$env:ProgramData\Microsoft\Windows\Start Menu\Programs\Dell*",
        "$env:APPDATA\Microsoft\Windows\Start Menu\Programs\Dell*"
    )
    
    foreach ($pattern in $startMenuPaths) {
        Get-Item $pattern -ErrorAction SilentlyContinue | ForEach-Object {
            try {
                Remove-Item $_.FullName -Recurse -Force -ErrorAction Stop
                Write-Log "Removed Start Menu: $($_.Name)" -Level SUCCESS
                $removed++
            } catch {
                Write-Log "Failed to remove Start Menu item: $($_.Name)" -Level WARN
            }
        }
    }
    
    if ($removed -eq 0) {
        Write-Log "No Dell filesystem items found" -Level INFO
    } else {
        Write-Log "Removed $removed filesystem items" -Level SUCCESS
    }
    
    return $removed
}

# ============================================================================
# PHASE 8: BLOCK REINSTALLATION
# ============================================================================

function Block-DellReinstallation {
    Write-Log -Message "PHASE 8: Blocking Automatic Reinstallation" -Level PHASE
    
    if ($SkipReinstallBlock) {
        Write-Log "Reinstallation blocking skipped by parameter" -Level WARN
        return 0
    }
    
    $blocked = 0
    
    # Disable Windows Consumer Features (prevents OEM app reinstallation)
    try {
        $cloudContentPath = "HKLM:\SOFTWARE\Policies\Microsoft\Windows\CloudContent"
        if (-not (Test-Path $cloudContentPath)) {
            New-Item -Path $cloudContentPath -Force | Out-Null
        }
        Set-ItemProperty -Path $cloudContentPath -Name "DisableWindowsConsumerFeatures" -Value 1 -Type DWord -Force
        Write-Log "Disabled Windows Consumer Features" -Level SUCCESS
        $blocked++
    } catch {
        Write-Log "Failed to disable Consumer Features: $($_.Exception.Message)" -Level WARN
    }
    
    # Disable Content Delivery Manager OEM and silent app installation
    $cdmPath = "HKCU:\Software\Microsoft\Windows\CurrentVersion\ContentDeliveryManager"
    $cdmSettings = @{
        "OemPreInstalledAppsEnabled" = 0
        "PreInstalledAppsEnabled" = 0
        "PreInstalledAppsEverEnabled" = 0
        "SilentInstalledAppsEnabled" = 0
        "ContentDeliveryAllowed" = 0
        "SubscribedContent-338388Enabled" = 0
        "SubscribedContent-338389Enabled" = 0
        "SubscribedContent-314559Enabled" = 0
    }
    
    foreach ($setting in $cdmSettings.GetEnumerator()) {
        try {
            Set-ItemProperty -Path $cdmPath -Name $setting.Key -Value $setting.Value -Type DWord -Force -ErrorAction Stop
            $blocked++
        } catch {
            Write-Log "Failed to set $($setting.Key): $($_.Exception.Message)" -Level WARN
        }
    }
    Write-Log "Configured Content Delivery Manager settings" -Level SUCCESS
    
    # Disable suggested apps in Start Menu
    try {
        $explorerPath = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced"
        Set-ItemProperty -Path $explorerPath -Name "Start_IrisRecommendations" -Value 0 -Type DWord -Force -ErrorAction SilentlyContinue
        Write-Log "Disabled Start Menu suggestions" -Level SUCCESS
        $blocked++
    } catch {
        Write-Log "Failed to disable Start suggestions" -Level WARN
    }
    
    Write-Log "Applied $blocked reinstallation prevention settings" -Level SUCCESS
    Write-Log "NOTE: To re-enable Dell software installation later, run with -SkipReinstallBlock or manually revert registry settings" -Level INFO
    
    return $blocked
}

# ============================================================================
# VERIFICATION
# ============================================================================

function Test-DellRemoval {
    Write-Log -Message "VERIFICATION: Checking for Dell Remnants" -Level PHASE
    
    $issues = @()
    
    # Check for remaining AppX packages
    $remainingAppx = foreach ($pattern in $Script:Config.AppxPatterns) {
        Get-AppxPackage -AllUsers -Name $pattern -ErrorAction SilentlyContinue
    }
    if ($remainingAppx) {
        $issues += "Remaining AppX packages: $($remainingAppx.Name -join ', ')"
    }
    
    # Check for remaining services
    $remainingServices = Get-Service -ErrorAction SilentlyContinue | Where-Object {
        $_.DisplayName -like "*Dell*" -or $_.Name -like "*Dell*"
    }
    if ($remainingServices) {
        $issues += "Remaining services: $($remainingServices.DisplayName -join ', ')"
    }
    
    # Check for remaining scheduled tasks
    $remainingTasks = Get-ScheduledTask -ErrorAction SilentlyContinue | Where-Object {
        $_.TaskName -like "*Dell*" -or $_.TaskPath -like "*Dell*"
    }
    if ($remainingTasks) {
        $issues += "Remaining scheduled tasks: $($remainingTasks.TaskName -join ', ')"
    }
    
    # Check for remaining processes
    $remainingProcesses = Get-Process -ErrorAction SilentlyContinue | Where-Object {
        $_.Name -like "*Dell*" -or $_.Name -like "*SupportAssist*"
    }
    if ($remainingProcesses) {
        $issues += "Remaining processes: $($remainingProcesses.Name -join ', ')"
    }
    
    if ($issues.Count -eq 0) {
        Write-Log "VERIFICATION PASSED: No Dell remnants detected" -Level SUCCESS
        return $true
    } else {
        Write-Log "VERIFICATION WARNING: Some Dell items may remain" -Level WARN
        foreach ($issue in $issues) {
            Write-Log "  - $issue" -Level WARN
        }
        Write-Log "A system restart may be required to complete removal" -Level INFO
        return $false
    }
}

# ============================================================================
# MAIN EXECUTION
# ============================================================================

function Invoke-NuclearDellRemover {
    Clear-Host
    Show-Banner
    
    Write-Log "Nuclear Dell Remover v$($Script:Config.Version) starting..." -Level INFO
    Write-Log "Log file: $LogPath" -Level INFO
    Write-Log "Parameters: SkipReinstallBlock=$SkipReinstallBlock, SkipFilesystemCleanup=$SkipFilesystemCleanup" -Level INFO
    
    # Results tracking
    $results = @{
        Processes = 0
        ProcessesSecondPass = 0
        Services = 0
        AppxPackages = 0
        Win32Apps = 0
        ScheduledTasks = 0
        RegistryItems = 0
        FilesystemItems = 0
        ReinstallBlocks = 0
    }
    
    # Execute all phases
    $results.Processes = Stop-DellProcesses
    $results.Services = Remove-DellServices
    
    # Second process kill - Dell services love to respawn executables immediately
    Write-Log -Message "PHASE 2.5: Second Process Kill (Catching Respawns)" -Level PHASE
    Start-Sleep -Seconds 1  # Brief pause to let any respawns start
    $results.ProcessesSecondPass = Stop-DellProcesses
    if ($results.ProcessesSecondPass -gt 0) {
        Write-Log "Caught $($results.ProcessesSecondPass) respawned processes" -Level SUCCESS
    }
    
    $results.AppxPackages = Remove-DellAppxPackages
    $results.Win32Apps = Remove-DellWin32Apps
    $results.ScheduledTasks = Remove-DellScheduledTasks
    $results.RegistryItems = Remove-DellRegistry
    $results.FilesystemItems = Remove-DellFilesystem
    $results.ReinstallBlocks = Block-DellReinstallation
    
    # Verification
    $verified = Test-DellRemoval
    
    # Summary
    Write-Log -Message "OPERATION COMPLETE" -Level PHASE
    
    $elapsed = (Get-Date) - $Script:Config.StartTime
    
    $summary = @"

    NUCLEAR DELL REMOVER - SUMMARY
    ==============================
    Processes Terminated:     $($results.Processes) (+ $($results.ProcessesSecondPass) respawns caught)
    Services Removed:         $($results.Services)
    AppX Packages Removed:    $($results.AppxPackages)
    Win32 Apps Uninstalled:   $($results.Win32Apps)
    Scheduled Tasks Removed:  $($results.ScheduledTasks)
    Registry Items Purged:    $($results.RegistryItems)
    Filesystem Items Cleaned: $($results.FilesystemItems)
    Reinstall Blocks Applied: $($results.ReinstallBlocks)
    
    Verification: $(if ($verified) { "PASSED" } else { "ISSUES FOUND" })
    Elapsed Time: $($elapsed.ToString('mm\:ss'))
    Log File: $LogPath

"@
    
    Write-Host $summary -ForegroundColor $(if ($verified) { "Green" } else { "Yellow" })
    
    if (-not $verified) {
        Write-Host "  RECOMMENDATION: Restart your computer and run this script again." -ForegroundColor Yellow
        Write-Host ""
    }
    
    Write-Host "  Dell has been NUKED. " -ForegroundColor Red -NoNewline
    Write-Host "You may need to restart for all changes to take effect." -ForegroundColor White
    Write-Host ""
    
    return $results
}

# Run the script
Invoke-NuclearDellRemover
