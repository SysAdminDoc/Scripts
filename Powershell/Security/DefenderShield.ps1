<#
.SYNOPSIS
    DefenderShield - Windows Defender & Firewall Repair Tool (GUI Version)
.DESCRIPTION
    Comprehensive repair tool for restoring Windows Defender and Windows Firewall
    after they've been disabled by privacy tools like privacy.sexy, O&O ShutUp10,
    Debloaters, or manual modifications.
    
    Features a GUI for selecting which components to repair.
.NOTES
    Author: Generated for Matt
    Requires: Administrator privileges
    Version: 2.0.0
#>

# ============================================================================
# ELEVATION CHECK
# ============================================================================

$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    try {
        Start-Process powershell.exe -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`"" -Verb RunAs -ErrorAction Stop
        exit
    }
    catch {
        Add-Type -AssemblyName PresentationFramework -ErrorAction SilentlyContinue
        [System.Windows.MessageBox]::Show("This tool requires Administrator privileges.`n`nPlease right-click and select 'Run as Administrator'.", "DefenderShield", "OK", "Error") | Out-Null
        exit
    }
}

# ============================================================================
# ASSEMBLIES
# ============================================================================

Add-Type -AssemblyName PresentationFramework, PresentationCore, WindowsBase, System.Windows.Forms -ErrorAction SilentlyContinue

# ============================================================================
# CONFIGURATION
# ============================================================================

$Script:Config = @{
    LogPath    = "$env:USERPROFILE\Desktop\DefenderShield_$(Get-Date -Format 'yyyyMMdd_HHmmss').log"
    BackupPath = "$env:USERPROFILE\Desktop\DefenderShield_Backup_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
}

$Script:DefenderServices = @(
    @{ Name = 'WinDefend'; DisplayName = 'Microsoft Defender Antivirus Service'; StartType = 'Automatic' },
    @{ Name = 'WdNisSvc'; DisplayName = 'Microsoft Defender Antivirus Network Inspection Service'; StartType = 'Manual' },
    @{ Name = 'WdNisDrv'; DisplayName = 'Microsoft Defender Antivirus Network Inspection Driver'; StartType = 'Manual' },
    @{ Name = 'WdFilter'; DisplayName = 'Microsoft Defender Antivirus Mini-Filter Driver'; StartType = 'Boot' },
    @{ Name = 'WdBoot'; DisplayName = 'Microsoft Defender Antivirus Boot Driver'; StartType = 'Boot' },
    @{ Name = 'Sense'; DisplayName = 'Windows Defender Advanced Threat Protection Service'; StartType = 'Manual' },
    @{ Name = 'SecurityHealthService'; DisplayName = 'Windows Security Service'; StartType = 'Manual' }
)

$Script:FirewallServices = @(
    @{ Name = 'mpssvc'; DisplayName = 'Windows Defender Firewall'; StartType = 'Automatic' },
    @{ Name = 'BFE'; DisplayName = 'Base Filtering Engine'; StartType = 'Automatic' },
    @{ Name = 'IKEEXT'; DisplayName = 'IKE and AuthIP IPsec Keying Modules'; StartType = 'Manual' },
    @{ Name = 'PolicyAgent'; DisplayName = 'IPsec Policy Agent'; StartType = 'Manual' }
)

# ============================================================================
# LOGGING
# ============================================================================

function Write-Log {
    param(
        [string]$Message,
        [ValidateSet('INFO', 'SUCCESS', 'WARNING', 'ERROR', 'SECTION')]
        [string]$Level = 'INFO'
    )
    
    $timestamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
    $logMessage = "[$timestamp] [$Level] $Message"
    
    try {
        Add-Content -Path $Script:Config.LogPath -Value $logMessage -ErrorAction SilentlyContinue
    }
    catch { }
    
    return $logMessage
}

function Update-Status {
    param(
        [string]$Message,
        [string]$Level = 'INFO'
    )
    
    $logMsg = Write-Log -Message $Message -Level $Level
    
    if ($Script:StatusTextBox) {
        try {
            $Script:StatusTextBox.Dispatcher.Invoke([action]{
                $color = switch ($Level) {
                    'SUCCESS' { 'Lime' }
                    'WARNING' { 'Yellow' }
                    'ERROR'   { 'OrangeRed' }
                    'SECTION' { 'Cyan' }
                    default   { 'White' }
                }
                
                $paragraph = New-Object System.Windows.Documents.Paragraph
                $run = New-Object System.Windows.Documents.Run($Message)
                $run.Foreground = $color
                $paragraph.Inlines.Add($run)
                $paragraph.Margin = [System.Windows.Thickness]::new(0, 2, 0, 2)
                $Script:StatusTextBox.Document.Blocks.Add($paragraph)
                $Script:StatusTextBox.ScrollToEnd()
            }, [System.Windows.Threading.DispatcherPriority]::Background)
        }
        catch { }
    }
}

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

function Set-RegistryValue {
    param(
        [string]$Path,
        [string]$Name,
        [object]$Value,
        [string]$Type = 'DWord'
    )
    
    try {
        if (-not (Test-Path $Path)) {
            New-Item -Path $Path -Force -ErrorAction SilentlyContinue | Out-Null
        }
        Set-ItemProperty -Path $Path -Name $Name -Value $Value -Type $Type -Force -ErrorAction SilentlyContinue
        return $true
    }
    catch {
        return $false
    }
}

function Remove-RegistryValue {
    param(
        [string]$Path,
        [string]$Name
    )
    
    try {
        if (Test-Path $Path) {
            Remove-ItemProperty -Path $Path -Name $Name -Force -ErrorAction SilentlyContinue
            return $true
        }
        return $false
    }
    catch {
        return $false
    }
}

function Backup-RegistryKey {
    param(
        [string]$KeyPath,
        [string]$BackupName
    )
    
    try {
        if (-not (Test-Path $Script:Config.BackupPath)) {
            New-Item -Path $Script:Config.BackupPath -ItemType Directory -Force -ErrorAction SilentlyContinue | Out-Null
        }
        
        $exportPath = Join-Path $Script:Config.BackupPath "$BackupName.reg"
        $regPath = $KeyPath -replace '^HKLM:\\', 'HKEY_LOCAL_MACHINE\' -replace '^HKCU:\\', 'HKEY_CURRENT_USER\'
        
        $null = reg export $regPath $exportPath /y 2>&1
        return $true
    }
    catch {
        return $false
    }
}

# ============================================================================
# FIREWALL REPAIR FUNCTIONS
# ============================================================================

function Repair-FirewallServices {
    Update-Status "Repairing Firewall Services..." -Level SECTION
    
    foreach ($svc in $Script:FirewallServices) {
        try {
            $regPath = "HKLM:\SYSTEM\CurrentControlSet\Services\$($svc.Name)"
            
            $startValue = switch ($svc.StartType) {
                'Automatic' { 2 }
                'Manual' { 3 }
                'Disabled' { 4 }
                'Boot' { 0 }
                'System' { 1 }
                default { 2 }
            }
            
            if (Test-Path $regPath) {
                Set-ItemProperty -Path $regPath -Name 'Start' -Value $startValue -Type DWord -Force -ErrorAction SilentlyContinue
                Update-Status "$($svc.DisplayName): Registry repaired" -Level SUCCESS
            }
            
            # Also try sc.exe
            $null = sc.exe config $svc.Name start= $svc.StartType.ToLower() 2>&1
        }
        catch {
            Update-Status "$($svc.DisplayName): Could not repair (continuing...)" -Level WARNING
        }
    }
}

function Repair-FirewallRegistry {
    Update-Status "Removing Firewall Blocking Policies..." -Level SECTION
    
    $policiesToRemove = @(
        'HKLM:\SOFTWARE\Policies\Microsoft\WindowsFirewall',
        'HKLM:\SOFTWARE\Policies\Microsoft\WindowsFirewall\DomainProfile',
        'HKLM:\SOFTWARE\Policies\Microsoft\WindowsFirewall\PrivateProfile',
        'HKLM:\SOFTWARE\Policies\Microsoft\WindowsFirewall\PublicProfile',
        'HKLM:\SOFTWARE\Policies\Microsoft\WindowsFirewall\StandardProfile'
    )
    
    foreach ($policy in $policiesToRemove) {
        try {
            if (Test-Path $policy) {
                Remove-Item -Path $policy -Recurse -Force -ErrorAction SilentlyContinue
                Update-Status "Removed: $policy" -Level SUCCESS
            }
        }
        catch {
            Update-Status "Could not remove: $policy (continuing...)" -Level WARNING
        }
    }
    
    # Reset profile settings
    $profilePaths = @(
        'HKLM:\SYSTEM\CurrentControlSet\Services\SharedAccess\Parameters\FirewallPolicy\DomainProfile',
        'HKLM:\SYSTEM\CurrentControlSet\Services\SharedAccess\Parameters\FirewallPolicy\PublicProfile',
        'HKLM:\SYSTEM\CurrentControlSet\Services\SharedAccess\Parameters\FirewallPolicy\StandardProfile'
    )
    
    foreach ($profilePath in $profilePaths) {
        try {
            if (Test-Path $profilePath) {
                Set-ItemProperty -Path $profilePath -Name 'EnableFirewall' -Value 1 -Type DWord -Force -ErrorAction SilentlyContinue
            }
        }
        catch { }
    }
    
    Update-Status "Firewall registry cleanup complete" -Level SUCCESS
}

function Start-FirewallServices {
    Update-Status "Starting Firewall Services..." -Level SECTION
    
    $startOrder = @('BFE', 'mpssvc', 'IKEEXT', 'PolicyAgent')
    
    foreach ($svcName in $startOrder) {
        try {
            $svc = Get-Service -Name $svcName -ErrorAction SilentlyContinue
            if ($svc -and $svc.Status -ne 'Running') {
                Start-Service -Name $svcName -ErrorAction SilentlyContinue
                Start-Sleep -Milliseconds 500
                
                $svc = Get-Service -Name $svcName -ErrorAction SilentlyContinue
                if ($svc.Status -eq 'Running') {
                    Update-Status "$($svc.DisplayName): Started" -Level SUCCESS
                }
                else {
                    Update-Status "$($svc.DisplayName): Could not start (may need reboot)" -Level WARNING
                }
            }
            elseif ($svc) {
                Update-Status "$($svc.DisplayName): Already running" -Level SUCCESS
            }
        }
        catch {
            Update-Status "$svcName : Error starting (continuing...)" -Level WARNING
        }
    }
}

function Enable-FirewallProfiles {
    Update-Status "Enabling Firewall Profiles..." -Level SECTION
    
    try {
        Set-NetFirewallProfile -Profile Domain,Public,Private -Enabled True -ErrorAction SilentlyContinue
        Update-Status "All firewall profiles enabled" -Level SUCCESS
    }
    catch {
        # Fallback to netsh
        try {
            $null = netsh advfirewall set domainprofile state on 2>&1
            $null = netsh advfirewall set privateprofile state on 2>&1
            $null = netsh advfirewall set publicprofile state on 2>&1
            Update-Status "Firewall profiles enabled via netsh" -Level SUCCESS
        }
        catch {
            Update-Status "Could not enable profiles (may need reboot)" -Level WARNING
        }
    }
    
    # Reset to defaults
    try {
        $null = netsh advfirewall reset 2>&1
        Update-Status "Firewall reset to defaults" -Level SUCCESS
    }
    catch { }
}

# ============================================================================
# DEFENDER REPAIR FUNCTIONS
# ============================================================================

function Repair-DefenderServices {
    Update-Status "Repairing Defender Services..." -Level SECTION
    
    foreach ($svc in $Script:DefenderServices) {
        try {
            $regPath = "HKLM:\SYSTEM\CurrentControlSet\Services\$($svc.Name)"
            
            $startValue = switch ($svc.StartType) {
                'Automatic' { 2 }
                'Manual' { 3 }
                'Disabled' { 4 }
                'Boot' { 0 }
                'System' { 1 }
                default { 3 }
            }
            
            if (Test-Path $regPath) {
                Set-ItemProperty -Path $regPath -Name 'Start' -Value $startValue -Type DWord -Force -ErrorAction SilentlyContinue
                Update-Status "$($svc.DisplayName): Registry repaired" -Level SUCCESS
            }
        }
        catch {
            Update-Status "$($svc.DisplayName): Could not repair (Tamper Protection?)" -Level WARNING
        }
    }
    
    # Repair drivers
    $drivers = @(
        @{ Name = 'WdFilter'; Start = 0 },
        @{ Name = 'WdNisDrv'; Start = 3 },
        @{ Name = 'WdBoot'; Start = 0 }
    )
    
    foreach ($driver in $drivers) {
        try {
            $drvPath = "HKLM:\SYSTEM\CurrentControlSet\Services\$($driver.Name)"
            if (Test-Path $drvPath) {
                Set-ItemProperty -Path $drvPath -Name 'Start' -Value $driver.Start -Type DWord -Force -ErrorAction SilentlyContinue
            }
        }
        catch { }
    }
}

function Repair-DefenderRegistry {
    Update-Status "Removing Defender Blocking Policies..." -Level SECTION
    
    # Backup first
    Backup-RegistryKey -KeyPath 'HKLM:\SOFTWARE\Policies\Microsoft\Windows Defender' -BackupName 'Policies_WindowsDefender'
    Backup-RegistryKey -KeyPath 'HKLM:\SOFTWARE\Microsoft\Windows Defender' -BackupName 'WindowsDefender'
    
    $disablingValues = @(
        @{ Path = 'HKLM:\SOFTWARE\Policies\Microsoft\Windows Defender'; Name = 'DisableAntiSpyware' },
        @{ Path = 'HKLM:\SOFTWARE\Policies\Microsoft\Windows Defender'; Name = 'DisableAntiVirus' },
        @{ Path = 'HKLM:\SOFTWARE\Policies\Microsoft\Windows Defender'; Name = 'DisableRoutinelyTakingAction' },
        @{ Path = 'HKLM:\SOFTWARE\Policies\Microsoft\Windows Defender'; Name = 'ServiceKeepAlive' },
        @{ Path = 'HKLM:\SOFTWARE\Policies\Microsoft\Windows Defender\Real-Time Protection'; Name = 'DisableBehaviorMonitoring' },
        @{ Path = 'HKLM:\SOFTWARE\Policies\Microsoft\Windows Defender\Real-Time Protection'; Name = 'DisableOnAccessProtection' },
        @{ Path = 'HKLM:\SOFTWARE\Policies\Microsoft\Windows Defender\Real-Time Protection'; Name = 'DisableScanOnRealtimeEnable' },
        @{ Path = 'HKLM:\SOFTWARE\Policies\Microsoft\Windows Defender\Real-Time Protection'; Name = 'DisableRealtimeMonitoring' },
        @{ Path = 'HKLM:\SOFTWARE\Policies\Microsoft\Windows Defender\Real-Time Protection'; Name = 'DisableIOAVProtection' },
        @{ Path = 'HKLM:\SOFTWARE\Policies\Microsoft\Windows Defender\Spynet'; Name = 'SpynetReporting' },
        @{ Path = 'HKLM:\SOFTWARE\Policies\Microsoft\Windows Defender\Spynet'; Name = 'SubmitSamplesConsent' },
        @{ Path = 'HKLM:\SOFTWARE\Policies\Microsoft\Windows Defender\MpEngine'; Name = 'MpEnablePus' },
        @{ Path = 'HKLM:\SOFTWARE\Microsoft\Windows Defender'; Name = 'DisableAntiSpyware' },
        @{ Path = 'HKLM:\SOFTWARE\Microsoft\Windows Defender'; Name = 'DisableAntiVirus' },
        @{ Path = 'HKLM:\SOFTWARE\Microsoft\Windows Defender\Real-Time Protection'; Name = 'DisableRealtimeMonitoring' },
        @{ Path = 'HKLM:\SOFTWARE\Microsoft\Windows Defender\Real-Time Protection'; Name = 'DisableBehaviorMonitoring' },
        @{ Path = 'HKLM:\SOFTWARE\Microsoft\Windows Defender\Real-Time Protection'; Name = 'DisableOnAccessProtection' },
        @{ Path = 'HKLM:\SOFTWARE\Microsoft\Windows Defender\Real-Time Protection'; Name = 'DisableScanOnRealtimeEnable' },
        @{ Path = 'HKLM:\SOFTWARE\Microsoft\Windows Defender\Real-Time Protection'; Name = 'DisableIOAVProtection' }
    )
    
    $removed = 0
    foreach ($item in $disablingValues) {
        try {
            if (Test-Path $item.Path) {
                $value = Get-ItemProperty -Path $item.Path -Name $item.Name -ErrorAction SilentlyContinue
                if ($null -ne $value) {
                    Remove-ItemProperty -Path $item.Path -Name $item.Name -Force -ErrorAction SilentlyContinue
                    $removed++
                }
            }
        }
        catch {
            # Try setting to 0 instead
            try {
                Set-ItemProperty -Path $item.Path -Name $item.Name -Value 0 -Type DWord -Force -ErrorAction SilentlyContinue
            }
            catch { }
        }
    }
    
    Update-Status "Removed/reset $removed blocking policies" -Level SUCCESS
    
    # Remove policy trees
    $policyTrees = @(
        'HKLM:\SOFTWARE\Policies\Microsoft\Windows Defender\Policy Manager',
        'HKLM:\SOFTWARE\Policies\Microsoft\Windows Defender\UX Configuration'
    )
    
    foreach ($tree in $policyTrees) {
        try {
            if (Test-Path $tree) {
                Remove-Item -Path $tree -Recurse -Force -ErrorAction SilentlyContinue
            }
        }
        catch { }
    }
}

function Repair-DefenderScheduledTasks {
    Update-Status "Repairing Defender Scheduled Tasks..." -Level SECTION
    
    $defenderTasks = @(
        'Windows Defender Cache Maintenance',
        'Windows Defender Cleanup',
        'Windows Defender Scheduled Scan',
        'Windows Defender Verification'
    )
    
    foreach ($taskName in $defenderTasks) {
        try {
            $task = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
            if ($task -and $task.State -eq 'Disabled') {
                Enable-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
                Update-Status "Enabled: $taskName" -Level SUCCESS
            }
            elseif ($task) {
                Update-Status "Already enabled: $taskName" -Level SUCCESS
            }
        }
        catch {
            Update-Status "Could not enable: $taskName (continuing...)" -Level WARNING
        }
    }
    
    # Remove malicious tasks
    try {
        $suspiciousTasks = Get-ScheduledTask -ErrorAction SilentlyContinue | Where-Object {
            $_.TaskName -match 'DisableDefender|DisableWinDefend|KillDefender|StopDefender'
        }
        
        foreach ($task in $suspiciousTasks) {
            try {
                Unregister-ScheduledTask -TaskName $task.TaskName -Confirm:$false -ErrorAction SilentlyContinue
                Update-Status "Removed malicious task: $($task.TaskName)" -Level SUCCESS
            }
            catch { }
        }
    }
    catch { }
}

function Repair-DefenderWMI {
    Update-Status "Checking WMI Subscriptions..." -Level SECTION
    
    try {
        $filters = Get-WmiObject -Query "SELECT * FROM __EventFilter WHERE Name LIKE '%Defender%' OR Name LIKE '%WinDefend%'" -Namespace 'root\subscription' -ErrorAction SilentlyContinue
        
        if ($filters) {
            foreach ($filter in $filters) {
                try {
                    $bindingQuery = "SELECT * FROM __FilterToConsumerBinding WHERE Filter=""__EventFilter.Name='$($filter.Name)'"""
                    Get-WmiObject -Query $bindingQuery -Namespace 'root\subscription' -ErrorAction SilentlyContinue | Remove-WmiObject -ErrorAction SilentlyContinue
                    $filter | Remove-WmiObject -ErrorAction SilentlyContinue
                    Update-Status "Removed WMI subscription: $($filter.Name)" -Level SUCCESS
                }
                catch { }
            }
        }
        else {
            Update-Status "No malicious WMI subscriptions found" -Level SUCCESS
        }
    }
    catch {
        Update-Status "Could not query WMI (continuing...)" -Level WARNING
    }
}

function Start-DefenderServices {
    Update-Status "Starting Defender Services..." -Level SECTION
    
    # Start Security Center first
    try {
        $secCenter = Get-Service -Name 'wscsvc' -ErrorAction SilentlyContinue
        if ($secCenter -and $secCenter.Status -ne 'Running') {
            Set-Service -Name 'wscsvc' -StartupType Automatic -ErrorAction SilentlyContinue
            Start-Service -Name 'wscsvc' -ErrorAction SilentlyContinue
        }
    }
    catch { }
    
    foreach ($svc in $Script:DefenderServices) {
        try {
            $service = Get-Service -Name $svc.Name -ErrorAction SilentlyContinue
            if ($service -and $service.Status -ne 'Running') {
                Start-Service -Name $svc.Name -ErrorAction SilentlyContinue
                Start-Sleep -Milliseconds 300
                
                $service = Get-Service -Name $svc.Name -ErrorAction SilentlyContinue
                if ($service.Status -eq 'Running') {
                    Update-Status "$($svc.DisplayName): Started" -Level SUCCESS
                }
                else {
                    Update-Status "$($svc.DisplayName): Could not start (may need reboot)" -Level WARNING
                }
            }
            elseif ($service) {
                Update-Status "$($svc.DisplayName): Already running" -Level SUCCESS
            }
        }
        catch {
            Update-Status "$($svc.DisplayName): Error (continuing...)" -Level WARNING
        }
    }
}

function Enable-DefenderFeatures {
    Update-Status "Enabling Defender Protection Features..." -Level SECTION
    
    try {
        Set-MpPreference -DisableRealtimeMonitoring $false -ErrorAction SilentlyContinue
        Set-MpPreference -DisableBehaviorMonitoring $false -ErrorAction SilentlyContinue
        Set-MpPreference -DisableBlockAtFirstSeen $false -ErrorAction SilentlyContinue
        Set-MpPreference -DisableIOAVProtection $false -ErrorAction SilentlyContinue
        Set-MpPreference -DisablePrivacyMode $false -ErrorAction SilentlyContinue
        Set-MpPreference -DisableScriptScanning $false -ErrorAction SilentlyContinue
        Set-MpPreference -DisableArchiveScanning $false -ErrorAction SilentlyContinue
        Set-MpPreference -DisableIntrusionPreventionSystem $false -ErrorAction SilentlyContinue
        Set-MpPreference -MAPSReporting Advanced -ErrorAction SilentlyContinue
        Set-MpPreference -SubmitSamplesConsent SendAllSamples -ErrorAction SilentlyContinue
        Set-MpPreference -PUAProtection Enabled -ErrorAction SilentlyContinue
        
        Update-Status "Protection features enabled" -Level SUCCESS
    }
    catch {
        Update-Status "Some features could not be enabled (continuing...)" -Level WARNING
    }
    
    # Update signatures
    try {
        Update-Status "Updating virus definitions..."
        Update-MpSignature -ErrorAction SilentlyContinue
        Update-Status "Definitions updated" -Level SUCCESS
    }
    catch {
        Update-Status "Could not update definitions (try manually later)" -Level WARNING
    }
}

function Reset-GroupPolicy {
    Update-Status "Resetting Group Policy..." -Level SECTION
    
    try {
        $machinePolPath = "$env:SystemRoot\System32\GroupPolicy\Machine\Registry.pol"
        
        if (Test-Path $machinePolPath) {
            $backupPol = Join-Path $Script:Config.BackupPath "Registry.pol"
            Copy-Item -Path $machinePolPath -Destination $backupPol -Force -ErrorAction SilentlyContinue
            Remove-Item -Path $machinePolPath -Force -ErrorAction SilentlyContinue
            Update-Status "Machine policy file removed" -Level SUCCESS
        }
        
        $null = gpupdate /force 2>&1
        Update-Status "Group Policy refreshed" -Level SUCCESS
    }
    catch {
        Update-Status "Could not reset Group Policy (continuing...)" -Level WARNING
    }
}

function Repair-WindowsSecurity {
    Update-Status "Repairing Windows Security App..." -Level SECTION
    
    try {
        Get-AppxPackage -Name 'Microsoft.SecHealthUI' -ErrorAction SilentlyContinue | 
            ForEach-Object {
                Add-AppxPackage -DisableDevelopmentMode -Register "$($_.InstallLocation)\AppXManifest.xml" -ErrorAction SilentlyContinue
            }
        Update-Status "Windows Security app re-registered" -Level SUCCESS
    }
    catch {
        Update-Status "Could not re-register app (continuing...)" -Level WARNING
    }
}

# ============================================================================
# MAIN REPAIR FUNCTION
# ============================================================================

function Start-Repair {
    param(
        [bool]$RepairFirewall,
        [bool]$RepairDefender,
        [bool]$CreateRestorePoint
    )
    
    $startTime = Get-Date
    
    Update-Status "DefenderShield Repair Started" -Level SECTION
    Update-Status "Log file: $($Script:Config.LogPath)"
    
    # Create restore point
    if ($CreateRestorePoint) {
        Update-Status "Creating System Restore Point..." -Level SECTION
        try {
            Enable-ComputerRestore -Drive "$env:SystemDrive\" -ErrorAction SilentlyContinue
            Checkpoint-Computer -Description "DefenderShield - Before Repair" -RestorePointType MODIFY_SETTINGS -ErrorAction SilentlyContinue
            Update-Status "Restore point created" -Level SUCCESS
        }
        catch {
            Update-Status "Could not create restore point (continuing...)" -Level WARNING
        }
    }
    
    # Repair Firewall
    if ($RepairFirewall) {
        Update-Status ""
        Update-Status "========== FIREWALL REPAIR ==========" -Level SECTION
        Repair-FirewallServices
        Repair-FirewallRegistry
        Start-FirewallServices
        Enable-FirewallProfiles
    }
    
    # Repair Defender
    if ($RepairDefender) {
        Update-Status ""
        Update-Status "========== DEFENDER REPAIR ==========" -Level SECTION
        Repair-DefenderServices
        Repair-DefenderRegistry
        Repair-DefenderScheduledTasks
        Repair-DefenderWMI
        Reset-GroupPolicy
        Start-DefenderServices
        Enable-DefenderFeatures
        Repair-WindowsSecurity
    }
    
    # Complete
    $duration = (Get-Date) - $startTime
    
    Update-Status ""
    Update-Status "========== REPAIR COMPLETE ==========" -Level SECTION
    Update-Status "Duration: $([math]::Round($duration.TotalSeconds, 1)) seconds" -Level SUCCESS
    Update-Status ""
    Update-Status "A RESTART is strongly recommended!" -Level WARNING
    Update-Status "Check Windows Security after restart." -Level INFO
    
    return $true
}

# ============================================================================
# GUI
# ============================================================================

[xml]$xaml = @"
<Window
    xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
    xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
    Title="DefenderShield - Windows Security Repair Tool"
    Height="650" Width="700"
    WindowStartupLocation="CenterScreen"
    ResizeMode="CanMinimize"
    Background="#1a1a2e">
    
    <Window.Resources>
        <Style TargetType="CheckBox">
            <Setter Property="Foreground" Value="White"/>
            <Setter Property="FontSize" Value="14"/>
            <Setter Property="Margin" Value="0,8,0,8"/>
            <Setter Property="VerticalContentAlignment" Value="Center"/>
        </Style>
        <Style TargetType="Button">
            <Setter Property="Background" Value="#0f3460"/>
            <Setter Property="Foreground" Value="White"/>
            <Setter Property="FontSize" Value="14"/>
            <Setter Property="FontWeight" Value="SemiBold"/>
            <Setter Property="Padding" Value="20,12"/>
            <Setter Property="BorderThickness" Value="0"/>
            <Setter Property="Cursor" Value="Hand"/>
        </Style>
    </Window.Resources>
    
    <Grid Margin="20">
        <Grid.RowDefinitions>
            <RowDefinition Height="Auto"/>
            <RowDefinition Height="Auto"/>
            <RowDefinition Height="Auto"/>
            <RowDefinition Height="*"/>
            <RowDefinition Height="Auto"/>
        </Grid.RowDefinitions>
        
        <!-- Header -->
        <StackPanel Grid.Row="0" Margin="0,0,0,20">
            <TextBlock Text="DefenderShield" FontSize="28" FontWeight="Bold" Foreground="#e94560" HorizontalAlignment="Center"/>
            <TextBlock Text="Windows Defender and Firewall Repair Tool" FontSize="14" Foreground="#aaa" HorizontalAlignment="Center" Margin="0,5,0,0"/>
        </StackPanel>
        
        <!-- Options Panel -->
        <Border Grid.Row="1" Background="#16213e" CornerRadius="8" Padding="20" Margin="0,0,0,15">
            <StackPanel>
                <TextBlock Text="Select Components to Repair:" FontSize="16" FontWeight="SemiBold" Foreground="White" Margin="0,0,0,15"/>
                
                <CheckBox x:Name="chkFirewall" IsChecked="True">
                    <StackPanel>
                        <TextBlock Text="Windows Firewall" FontWeight="SemiBold" Foreground="White"/>
                        <TextBlock Text="Repairs services, removes blocking policies, enables all profiles" FontSize="11" Foreground="#888"/>
                    </StackPanel>
                </CheckBox>
                
                <CheckBox x:Name="chkDefender" IsChecked="True">
                    <StackPanel>
                        <TextBlock Text="Windows Defender Antivirus" FontWeight="SemiBold" Foreground="White"/>
                        <TextBlock Text="Repairs services, registry, scheduled tasks, WMI, enables protection" FontSize="11" Foreground="#888"/>
                    </StackPanel>
                </CheckBox>
                
                <Rectangle Height="1" Fill="#333" Margin="0,10"/>
                
                <CheckBox x:Name="chkRestorePoint" IsChecked="True">
                    <StackPanel>
                        <TextBlock Text="Create System Restore Point" FontWeight="SemiBold" Foreground="White"/>
                        <TextBlock Text="Recommended - allows you to undo changes if needed" FontSize="11" Foreground="#888"/>
                    </StackPanel>
                </CheckBox>
            </StackPanel>
        </Border>
        
        <!-- Warning Panel -->
        <Border Grid.Row="2" Background="#3d1a1a" CornerRadius="8" Padding="15" Margin="0,0,0,15">
            <TextBlock TextWrapping="Wrap" Foreground="#ffaa00">
                <Run FontWeight="SemiBold">Tamper Protection Notice:</Run>
                <Run>If Defender won't start after repair, disable Tamper Protection in Windows Security (Virus and threat protection - Manage settings), then run this tool again.</Run>
            </TextBlock>
        </Border>
        
        <!-- Status Output -->
        <Border Grid.Row="3" Background="#0d1117" CornerRadius="8" Padding="10">
            <RichTextBox x:Name="txtStatus" 
                         Background="Transparent" 
                         Foreground="White" 
                         FontFamily="Consolas" 
                         FontSize="12"
                         IsReadOnly="True"
                         BorderThickness="0"
                         VerticalScrollBarVisibility="Auto">
                <FlowDocument>
                    <Paragraph>
                        <Run Foreground="#888">Ready. Select options above and click Start Repair.</Run>
                    </Paragraph>
                </FlowDocument>
            </RichTextBox>
        </Border>
        
        <!-- Buttons -->
        <StackPanel Grid.Row="4" Orientation="Horizontal" HorizontalAlignment="Right" Margin="0,15,0,0">
            <Button x:Name="btnStart" Content="Start Repair" Margin="0,0,10,0" Width="150"/>
            <Button x:Name="btnRestart" Content="Restart PC" Width="120" Background="#4a1942" IsEnabled="False"/>
        </StackPanel>
    </Grid>
</Window>
"@

# Parse XAML
$reader = New-Object System.Xml.XmlNodeReader($xaml)
$window = [System.Windows.Markup.XamlReader]::Load($reader)

# Get controls
$chkFirewall = $window.FindName('chkFirewall')
$chkDefender = $window.FindName('chkDefender')
$chkRestorePoint = $window.FindName('chkRestorePoint')
$txtStatus = $window.FindName('txtStatus')
$btnStart = $window.FindName('btnStart')
$btnRestart = $window.FindName('btnRestart')

# Store reference for logging
$Script:StatusTextBox = $txtStatus

# Start button click
$btnStart.Add_Click({
    if (-not $chkFirewall.IsChecked -and -not $chkDefender.IsChecked) {
        [System.Windows.MessageBox]::Show("Please select at least one component to repair.", "DefenderShield", "OK", "Warning") | Out-Null
        return
    }
    
    # Clear status
    $txtStatus.Document.Blocks.Clear()
    
    # Disable controls during repair
    $btnStart.IsEnabled = $false
    $chkFirewall.IsEnabled = $false
    $chkDefender.IsEnabled = $false
    $chkRestorePoint.IsEnabled = $false
    $btnStart.Content = "Repairing..."
    
    # Store selections
    $repairFW = $chkFirewall.IsChecked
    $repairDef = $chkDefender.IsChecked
    $createRP = $chkRestorePoint.IsChecked
    
    # Process UI events then run repair
    [System.Windows.Forms.Application]::DoEvents()
    
    # Run repair
    Start-Repair -RepairFirewall $repairFW -RepairDefender $repairDef -CreateRestorePoint $createRP
    
    # Re-enable controls
    $btnStart.Content = "Start Repair"
    $btnStart.IsEnabled = $true
    $btnRestart.IsEnabled = $true
    $chkFirewall.IsEnabled = $true
    $chkDefender.IsEnabled = $true
    $chkRestorePoint.IsEnabled = $true
})

# Restart button click
$btnRestart.Add_Click({
    $result = [System.Windows.MessageBox]::Show("Are you sure you want to restart your computer now?", "Restart Computer", "YesNo", "Question")
    if ($result -eq 'Yes') {
        Restart-Computer -Force
    }
})

# Show window
$null = $window.ShowDialog()
