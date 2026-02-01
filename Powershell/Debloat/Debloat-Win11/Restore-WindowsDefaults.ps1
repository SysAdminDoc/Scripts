#Requires -Version 5.1

<#
.SYNOPSIS
    Windows Registry & Settings Restoration Script - Comprehensive Edition v3.1
    Restores Windows to factory default settings by reversing debloat scripts,
    privacy.sexy tweaks, group policy modifications, and registry changes.

.DESCRIPTION
    This script comprehensively restores Windows settings to their default values.
    Includes reversals for common privacy.sexy configurations.
    Run with Administrator privileges. Creates a detailed log on your Desktop.

.NOTES
    Author: Maven Imaging IT
    Version: 3.1.0
    Requires: Administrator privileges
#>

# ============================================================================
# CONFIGURATION
# ============================================================================

$script:Version = "3.1.0"
$script:LogPath = "$env:USERPROFILE\Desktop\WindowsRestore_$(Get-Date -Format 'yyyyMMdd_HHmmss').log"
$script:ChangesCount = 0
$script:ErrorsCount = 0

# ============================================================================
# SELF-ELEVATION
# ============================================================================

if (-not ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    $arguments = "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`""
    Start-Process powershell -Verb RunAs -ArgumentList $arguments
    exit
}

# ============================================================================
# ASSEMBLY LOADING
# ============================================================================

Add-Type -AssemblyName PresentationFramework
Add-Type -AssemblyName PresentationCore
Add-Type -AssemblyName WindowsBase
Add-Type -AssemblyName System.Windows.Forms

# ============================================================================
# LOGGING
# ============================================================================

$script:ConsoleBox = $null
$script:ConsoleWindow = $null

function Write-Log {
    param(
        [string]$Message,
        [ValidateSet('Info', 'Success', 'Warning', 'Error', 'Section')]
        [string]$Level = 'Info'
    )
    $timestamp = Get-Date -Format "HH:mm:ss"
    $logEntry = "[$timestamp] $Message"
    $logFull = "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] [$Level] $Message"
    Add-Content -Path $script:LogPath -Value $logFull -ErrorAction SilentlyContinue
    switch ($Level) {
        'Success' { Write-Host $logFull -ForegroundColor Green }
        'Warning' { Write-Host $logFull -ForegroundColor Yellow }
        'Error'   { Write-Host $logFull -ForegroundColor Red; $script:ErrorsCount++ }
        'Section' { Write-Host $logFull -ForegroundColor Magenta }
        default   { Write-Host $logFull -ForegroundColor Cyan }
    }
    # Push to GUI console
    if ($script:ConsoleBox -and $script:ConsoleWindow) {
        try {
            $colorMap = @{ Success='#6BCB77'; Warning='#FFD93D'; Error='#FF6B6B'; Section='#BB86FC'; Info='#8BB4CC' }
            $color = $colorMap[$Level]
            if (!$color) { $color = '#8BB4CC' }
            $prefix = switch ($Level) { 'Success'{' + '};'Warning'{' ! '};'Error'{' X '};'Section'{'>> '};default{' . '} }
            $doc = $script:ConsoleBox.Document
            $para = New-Object System.Windows.Documents.Paragraph
            $para.Margin = [System.Windows.Thickness]::new(0)
            $para.LineHeight = 1
            # Timestamp
            $tsRun = New-Object System.Windows.Documents.Run("[$timestamp] ")
            $tsRun.Foreground = [System.Windows.Media.BrushConverter]::new().ConvertFromString('#555566')
            $para.Inlines.Add($tsRun) | Out-Null
            # Prefix
            $pfxRun = New-Object System.Windows.Documents.Run($prefix)
            $pfxRun.Foreground = [System.Windows.Media.BrushConverter]::new().ConvertFromString($color)
            $pfxRun.FontWeight = [System.Windows.FontWeights]::SemiBold
            $para.Inlines.Add($pfxRun) | Out-Null
            # Message
            $msgRun = New-Object System.Windows.Documents.Run($Message)
            $msgRun.Foreground = [System.Windows.Media.BrushConverter]::new().ConvertFromString($color)
            $para.Inlines.Add($msgRun) | Out-Null
            $doc.Blocks.Add($para) | Out-Null
            $script:ConsoleBox.ScrollToEnd()
            $script:ConsoleWindow.Dispatcher.Invoke([action]{}, "Render")
        } catch { }
    }
}

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

function Remove-RegistryValue {
    param([string]$Path, [string]$Name, [switch]$Silent)
    try {
        if (Test-Path $Path) {
            $current = Get-ItemProperty -Path $Path -Name $Name -ErrorAction SilentlyContinue
            if ($null -ne $current.$Name) {
                Remove-ItemProperty -Path $Path -Name $Name -Force -ErrorAction Stop
                if (-not $Silent) { Write-Log "Removed: $Path\$Name" -Level Success }
                $script:ChangesCount++
                return $true
            }
        }
    } catch {
        if (-not $Silent) { Write-Log "Failed to remove $Path\$Name - $($_.Exception.Message)" -Level Warning }
    }
    return $false
}

function Set-RegistryValue {
    param([string]$Path, [string]$Name, $Value, [string]$Type = "DWord", [switch]$Silent)
    try {
        if (!(Test-Path $Path)) { New-Item -Path $Path -Force | Out-Null }
        Set-ItemProperty -Path $Path -Name $Name -Value $Value -Type $Type -Force -ErrorAction Stop
        if (-not $Silent) { Write-Log "Set: $Path\$Name = $Value" -Level Success }
        $script:ChangesCount++
        return $true
    } catch {
        if (-not $Silent) { Write-Log "Failed to set $Path\$Name - $($_.Exception.Message)" -Level Warning }
    }
    return $false
}

function Remove-RegistryKey {
    param([string]$Path, [switch]$Silent)
    try {
        if (Test-Path $Path) {
            Remove-Item -Path $Path -Recurse -Force -ErrorAction Stop
            if (-not $Silent) { Write-Log "Removed key: $Path" -Level Success }
            $script:ChangesCount++
            return $true
        }
    } catch {
        if (-not $Silent) { Write-Log "Failed to remove key $Path - $($_.Exception.Message)" -Level Warning }
    }
    return $false
}

function Restore-ServiceStartup {
    param([string]$ServiceName, [string]$StartupType, [switch]$Silent)
    try {
        $svc = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
        if ($svc) {
            Set-Service -Name $ServiceName -StartupType $StartupType -ErrorAction Stop
            if (-not $Silent) { Write-Log "Service '$ServiceName' set to $StartupType" -Level Success }
            $script:ChangesCount++
            return $true
        }
    } catch {
        if (-not $Silent) { Write-Log "Failed to configure service $ServiceName - $($_.Exception.Message)" -Level Warning }
    }
    return $false
}

function Enable-ScheduledTaskSafe {
    param([string]$TaskPath, [string]$TaskName, [switch]$Silent)
    try {
        $task = Get-ScheduledTask -TaskPath $TaskPath -TaskName $TaskName -ErrorAction SilentlyContinue
        if ($task) {
            Enable-ScheduledTask -TaskPath $TaskPath -TaskName $TaskName -ErrorAction Stop | Out-Null
            if (-not $Silent) { Write-Log "Enabled task: $TaskPath$TaskName" -Level Success }
            $script:ChangesCount++
            return $true
        }
    } catch {
        if (-not $Silent) { Write-Log "Failed to enable task $TaskPath$TaskName - $($_.Exception.Message)" -Level Warning }
    }
    return $false
}

# ============================================================================
# CATEGORY 1: PRIVACY & TELEMETRY (COMPREHENSIVE)
# ============================================================================

# ============================================================================
# RESTORATION FUNCTIONS - COMPREHENSIVE v3.1
# Covers: privacy.sexy, debloat scripts, group policies, registry tweaks
# ============================================================================

function Restore-PrivacyTelemetry {
    Write-Log "=== PRIVACY & TELEMETRY (COMPREHENSIVE) ===" -Level Section

    # ---- CapabilityAccessManager ConsentStore (restore ALL to Allow) ----
    Write-Log "Restoring app capability access permissions..." -Level Info
    @(
        "documentsLibrary","picturesLibrary","videosLibrary","musicLibrary",
        "broadFileSystemAccess","phoneCallHistory","phoneCall","chat",
        "bluetooth","bluetoothSync","activity","appointments","contacts",
        "email","userDataTasks","userNotificationListener","radios",
        "userAccountInformation","webcam","microphone","location",
        "appDiagnostics","gazeInput","graphicsCaptureProgrammatic",
        "graphicsCaptureWithoutBorder","humanInterfaceDevice","humanPresence",
        "backgroundSpatialPerception","spatialPerception"
    ) | ForEach-Object {
        Set-RegistryValue -Path "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\CapabilityAccessManager\ConsentStore\$_" -Name "Value" -Value "Allow" -Type "String" -Silent
    }
    $script:ChangesCount++

    # ---- AppPrivacy GPO (remove ALL forced deny/allow) ----
    Write-Log "Removing AppPrivacy group policies..." -Level Info
    @(
        "LetAppsAccessCallHistory","LetAppsAccessPhone","LetAppsAccessMessaging",
        "LetAppsSyncWithDevices","LetAppsAccessTrustedDevices","LetAppsAccessMotion",
        "LetAppsAccessCamera","LetAppsAccessMicrophone","LetAppsAccessLocation",
        "LetAppsAccessAccountInfo","LetAppsAccessContacts","LetAppsAccessCalendar",
        "LetAppsAccessEmail","LetAppsAccessTasks","LetAppsAccessRadios",
        "LetAppsAccessNotifications","LetAppsGetDiagnosticInfo","LetAppsAccessGazeInput",
        "LetAppsRunInBackground","LetAppsActivateWithVoice","LetAppsActivateWithVoiceAboveLock",
        "LetAppsAccessBackgroundSpatialPerception","LetAppsAccessGraphicsCaptureProgrammatic",
        "LetAppsAccessGraphicsCaptureWithoutBorder","LetAppsAccessHumanPresence"
    ) | ForEach-Object {
        $base = $_
        Remove-RegistryValue -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\AppPrivacy" -Name $base -Silent
        Remove-RegistryValue -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\AppPrivacy" -Name "${base}_UserInControlOfTheseApps" -Silent
        Remove-RegistryValue -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\AppPrivacy" -Name "${base}_ForceAllowTheseApps" -Silent
        Remove-RegistryValue -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\AppPrivacy" -Name "${base}_ForceDenyTheseApps" -Silent
    }
    Remove-RegistryKey -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\AppPrivacy" -Silent
    $script:ChangesCount++

    # ---- Legacy DeviceAccess GUIDs (pre-1903) ----
    Write-Log "Restoring legacy device access settings..." -Level Info
    @(
        "LooselyCoupled",
        "{C1D23ACC-752B-43E5-8448-8D0E519CD6D6}",
        "{2EEF81BE-33FA-4800-9670-1CD474972C3F}",
        "{52079E78-A92B-413F-B213-E8FE35712E72}",
        "{7D7E8402-7C54-4821-A34E-AEEFD62DED93}",
        "{D89823BA-7180-4B81-B50C-7E471E6121A3}",
        "{8BC668CF-7728-45BD-93F8-CF2B3B41D7AB}",
        "{9231CB4C-BF57-4AF3-8C55-FDA7BFCC04C5}",
        "{E6AD100E-5F4E-44CD-BE0F-2265D88D14F5}",
        "{2297E4E2-5DBE-466D-A12B-0F8286F0D9CA}",
        "{E390DF20-07DF-446D-B962-F5C953062741}",
        "{992AFA70-6F47-4148-B3E9-3003349C1548}",
        "{21157C1F-2651-4CC1-90CA-1F28B02263F6}",
        "{BFA794E4-F964-4FDB-90F6-51056BFE4B44}",
        "{E5323777-F976-4f5b-9B55-B94699C46E44}",
        "{A8804298-2D5F-42E3-9531-9C8C39EB29CE}"
    ) | ForEach-Object {
        Remove-RegistryValue -Path "HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\DeviceAccess\Global\$_" -Name "Value" -Silent
    }

    # ---- Telemetry & Diagnostics ----
    Write-Log "Restoring telemetry and diagnostics settings..." -Level Info
    # DataCollection policies
    Remove-RegistryKey -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\DataCollection" -Silent
    Remove-RegistryValue -Path "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\DataCollection" -Name "AllowTelemetry" -Silent
    Remove-RegistryValue -Path "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\DataCollection" -Name "MaxTelemetryAllowed" -Silent
    Remove-RegistryValue -Path "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\DataCollection" -Name "DoNotShowFeedbackNotifications" -Silent
    Remove-RegistryValue -Path "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\DataCollection" -Name "AllowDeviceNameInTelemetry" -Silent
    Remove-RegistryValue -Path "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\DataCollection" -Name "AllowCommercialDataPipeline" -Silent
    Remove-RegistryValue -Path "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\DataCollection" -Name "MicrosoftEdgeDataOptIn" -Silent
    Remove-RegistryValue -Path "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\DataCollection" -Name "AllowDesktopAnalyticsProcessing" -Silent
    Remove-RegistryValue -Path "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\DataCollection" -Name "AllowUpdateComplianceProcessing" -Silent
    Remove-RegistryValue -Path "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\DataCollection" -Name "AllowWUfBCloudProcessing" -Silent
    Remove-RegistryValue -Path "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\DataCollection" -Name "LimitEnhancedDiagnosticDataWindowsAnalytics" -Silent
    Remove-RegistryValue -Path "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\DataCollection" -Name "DisableOneSettingsDownloads" -Silent

    # SQM Client
    Remove-RegistryValue -Path "HKLM:\Software\Microsoft\SQMClient\Windows" -Name "CEIPEnable" -Silent
    Remove-RegistryValue -Path "HKLM:\Software\Policies\Microsoft\SQMClient\Windows" -Name "CEIPEnable" -Silent
    Remove-RegistryValue -Path "HKLM:\Software\Microsoft\SQMClient" -Name "MSFTInternal" -Silent

    # VS/CEIP SQM
    @("14.0","15.0","16.0","17.0") | ForEach-Object {
        Remove-RegistryValue -Path "HKLM:\SOFTWARE\Microsoft\VSCommon\$_\SQM" -Name "OptIn" -Silent
        Remove-RegistryValue -Path "HKLM:\SOFTWARE\Wow6432Node\Microsoft\VSCommon\$_\SQM" -Name "OptIn" -Silent
    }

    # License telemetry
    Remove-RegistryValue -Path "HKLM:\Software\Policies\Microsoft\Windows NT\CurrentVersion\Software Protection Platform" -Name "NoGenTicket" -Silent

    # Customer Experience
    Remove-RegistryValue -Path "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Device Metadata" -Name "PreventDeviceMetadataFromNetwork" -Silent

    # TIPC (text input telemetry)
    Remove-RegistryValue -Path "HKCU:\SOFTWARE\Microsoft\Input\TIPC" -Name "Enabled" -Silent
    Remove-RegistryValue -Path "HKLM:\SOFTWARE\Microsoft\Input\TIPC" -Name "Enabled" -Silent

    # Input personalization
    Remove-RegistryValue -Path "HKCU:\SOFTWARE\Microsoft\InputPersonalization\TrainedDataStore" -Name "HarvestContacts" -Silent
    Remove-RegistryValue -Path "HKCU:\SOFTWARE\Microsoft\Personalization\Settings" -Name "AcceptedPrivacyPolicy" -Silent
    Remove-RegistryKey -Path "HKLM:\SOFTWARE\Policies\Microsoft\InputPersonalization" -Silent

    # Handwriting error reports
    Remove-RegistryKey -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\HandwritingErrorReports" -Silent
    Remove-RegistryKey -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\TabletPC" -Silent

    # Advertising ID
    Remove-RegistryValue -Path "HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\AdvertisingInfo" -Name "Enabled" -Silent
    Remove-RegistryKey -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\AdvertisingInfo" -Silent

    # Feedback
    Remove-RegistryValue -Path "HKCU:\SOFTWARE\Microsoft\Siuf\Rules" -Name "NumberOfSIUFInPeriod" -Silent
    Remove-RegistryValue -Path "HKCU:\SOFTWARE\Microsoft\Siuf\Rules" -Name "PeriodInNanoSeconds" -Silent

    # Privacy consent
    Remove-RegistryValue -Path "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\OOBE" -Name "DisablePrivacyExperience" -Silent

    # App Compatibility / Telemetry collector
    Remove-RegistryKey -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\AppCompat" -Silent
    Remove-RegistryKey -Path "HKLM:\Software\Policies\Microsoft\Windows\AppCompat" -Silent

    # IFEO blocks on telemetry executables (remove debugger redirects)
    @("CompatTelRunner.exe","DeviceCensus.exe","upfc.exe") | ForEach-Object {
        Remove-RegistryKey -Path "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Image File Execution Options\$_" -Silent
    }

    # Restore CompatTelRunner.exe and DeviceCensus.exe if renamed to .OLD
    @("$env:SystemRoot\System32\CompatTelRunner.exe","$env:SystemRoot\System32\DeviceCensus.exe") | ForEach-Object {
        $oldPath = "$_.OLD"
        if ((Test-Path $oldPath) -and !(Test-Path $_)) {
            try { Rename-Item -Path $oldPath -NewName (Split-Path $_ -Leaf) -Force -EA Stop; $script:ChangesCount++ } catch { }
        }
    }

    # Bluetooth telemetry
    Remove-RegistryValue -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\DataCollection" -Name "AllowBuildPreview" -Silent

    # Disk diagnostics
    Remove-RegistryValue -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\WDI\{9c5a40da-b965-4fc3-8781-88dd50a6299d}" -Name "ScenarioExecutionEnabled" -Silent
    Remove-RegistryValue -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\WDI\{29689E29-2CE9-4751-B4FC-8EFF5066E3FD}" -Name "ScenarioExecutionEnabled" -Silent

    # Experimentation
    Remove-RegistryValue -Path "HKLM:\SOFTWARE\Microsoft\PolicyManager\default\System\AllowExperimentation" -Name "value" -Silent

    # Location sensor overrides
    Remove-RegistryValue -Path "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Sensor\Overrides\{BFA794E4-F964-4FDB-90F6-51056BFE4B44}" -Name "SensorPermissionState" -Silent

    # Location/sensors policy
    Remove-RegistryKey -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\LocationAndSensors" -Silent

    # Location service configuration
    Remove-RegistryValue -Path "HKLM:\SYSTEM\CurrentControlSet\Services\lfsvc\Service\Configuration" -Name "Status" -Silent

    # Wi-Fi Sense
    Remove-RegistryValue -Path "HKLM:\SOFTWARE\Microsoft\PolicyManager\default\WiFi\AllowAutoConnectToWiFiSenseHotspots" -Name "value" -Silent
    Remove-RegistryValue -Path "HKLM:\SOFTWARE\Microsoft\PolicyManager\default\WiFi\AllowWiFiHotSpotReporting" -Name "value" -Silent
    Remove-RegistryValue -Path "HKLM:\SOFTWARE\Microsoft\WcmSvc\wifinetworkmanager\config" -Name "AutoConnectAllowedOEM" -Silent

    # Website Language List access
    Remove-RegistryValue -Path "HKCU:\Control Panel\International\User Profile" -Name "HttpAcceptLanguageOptOut" -Silent

    # Activity Feed / Timeline
    Remove-RegistryKey -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\System" -Silent

    # App launch tracking
    Remove-RegistryValue -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced" -Name "Start_TrackProgs" -Silent

    # Maps auto-download
    Remove-RegistryKey -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\Maps" -Silent

    # Game DVR/screen recording
    Remove-RegistryKey -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\GameDVR" -Silent
    Remove-RegistryValue -Path "HKCU:\System\GameConfigStore" -Name "GameDVR_Enabled" -Silent

    # DRM internet access
    Remove-RegistryKey -Path "HKLM:\SOFTWARE\Policies\Microsoft\WMDRM" -Silent

    # Cloud speech recognition
    Remove-RegistryValue -Path "HKCU:\Software\Microsoft\Speech_OneCore\Settings\OnlineSpeechPrivacy" -Name "HasAccepted" -Silent
    Remove-RegistryValue -Path "HKLM:\Software\Microsoft\Speech_OneCore\Preferences" -Name "ModelDownloadAllowed" -Silent
    Remove-RegistryValue -Path "HKCU:\Software\Microsoft\Speech_OneCore\Preferences" -Name "VoiceActivationOn" -Silent
    Remove-RegistryValue -Path "HKCU:\Software\Microsoft\Speech_OneCore\Settings\VoiceActivation\UserPreferenceForAllApps" -Name "AgentActivationEnabled" -Silent
    Remove-RegistryValue -Path "HKCU:\Software\Microsoft\Speech_OneCore\Settings\VoiceActivation\UserPreferenceForAllApps" -Name "AgentActivationOnLockScreenEnabled" -Silent
    Remove-RegistryValue -Path "HKCU:\Software\Microsoft\Speech_OneCore\Settings\VoiceActivation\UserPreferenceForAllApps" -Name "AgentActivationLastUsed" -Silent
    Remove-RegistryValue -Path "HKCU:\Software\Microsoft\Speech_OneCore\Settings\VoiceActivation\UserPreferenceForAllApps" -Name "ActiveAboveLockLastUsed" -Silent

    # Recall
    Remove-RegistryValue -Path "HKCU:\Software\Policies\Microsoft\Windows\WindowsAI" -Name "DisableAIDataAnalysis" -Silent
    Remove-RegistryValue -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\WindowsAI" -Name "DisableAIDataAnalysis" -Silent

    # Restore DiagTrack / diagnostics services
    @(
        @{N="DiagTrack"; T="Automatic"},
        @{N="dmwappushservice"; T="Manual"},
        @{N="diagnosticshub.standardcollector.service"; T="Manual"},
        @{N="diagsvc"; T="Manual"},
        @{N="PcaSvc"; T="Manual"},
        @{N="wercplsupport"; T="Manual"},
        @{N="wersvc"; T="Manual"}
    ) | ForEach-Object { Restore-ServiceStartup -ServiceName $_.N -StartupType $_.T -Silent }

    # Restore telemetry scheduled tasks
    @(
        @{P="\Microsoft\Windows\Application Experience\"; N="Microsoft Compatibility Appraiser"},
        @{P="\Microsoft\Windows\Application Experience\"; N="ProgramDataUpdater"},
        @{P="\Microsoft\Windows\Application Experience\"; N="AitAgent"},
        @{P="\Microsoft\Windows\Application Experience\"; N="StartupAppTask"},
        @{P="\Microsoft\Windows\Application Experience\"; N="PcaPatchDbTask"},
        @{P="\Microsoft\Windows\Application Experience\"; N="SdbinstMergeDbTask"},
        @{P="\Microsoft\Windows\Application Experience\"; N="MareBackup"},
        @{P="\Microsoft\Windows\Autochk\"; N="Proxy"},
        @{P="\Microsoft\Windows\Customer Experience Improvement Program\"; N="Consolidator"},
        @{P="\Microsoft\Windows\Customer Experience Improvement Program\"; N="UsbCeip"},
        @{P="\Microsoft\Windows\Customer Experience Improvement Program\"; N="KernelCeipTask"},
        @{P="\Microsoft\Windows\Device Information\"; N="Device"},
        @{P="\Microsoft\Windows\Device Information\"; N="Device User"},
        @{P="\Microsoft\Windows\DiskDiagnostic\"; N="Microsoft-Windows-DiskDiagnosticDataCollector"},
        @{P="\Microsoft\Windows\DiskDiagnostic\"; N="Microsoft-Windows-DiskDiagnosticResolver"},
        @{P="\Microsoft\Windows\Feedback\Siuf\"; N="DmClient"},
        @{P="\Microsoft\Windows\Feedback\Siuf\"; N="DmClientOnScenarioDownload"},
        @{P="\Microsoft\Windows\PI\"; N="Sqm-Tasks"},
        @{P="\Microsoft\Windows\NetTrace\"; N="GatherNetworkInfo"}
    ) | ForEach-Object { Enable-ScheduledTaskSafe -TaskPath $_.P -TaskName $_.N -Silent }

    Write-Log "Privacy & Telemetry: Complete" -Level Success
}

function Restore-CopilotCortanaAI {
    Write-Log "=== COPILOT, CORTANA & AI ===" -Level Section

    # ---- Copilot ----
    Remove-RegistryKey -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\WindowsCopilot" -Silent
    Remove-RegistryValue -Path "HKCU:\Software\Policies\Microsoft\Windows\WindowsCopilot" -Name "TurnOffWindowsCopilot" -Silent
    Remove-RegistryValue -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced" -Name "ShowCopilotButton" -Silent

    # ---- Cortana (comprehensive) ----
    Remove-RegistryValue -Path "HKLM:\SOFTWARE\Microsoft\PolicyManager\default\Experience\AllowCortana" -Name "value" -Silent
    # Cortana policies
    @(
        "HKLM:\SOFTWARE\Policies\Microsoft\Windows\Windows Search",
        "HKCU:\SOFTWARE\Policies\Microsoft\Windows\Windows Search"
    ) | ForEach-Object {
        Remove-RegistryValue -Path $_ -Name "AllowCortana" -Silent
        Remove-RegistryValue -Path $_ -Name "AllowCortanaAboveLock" -Silent
        Remove-RegistryValue -Path $_ -Name "AllowSearchToUseLocation" -Silent
        Remove-RegistryValue -Path $_ -Name "ConnectedSearchUseWeb" -Silent
        Remove-RegistryValue -Path $_ -Name "ConnectedSearchUseWebOverMeteredConnections" -Silent
        Remove-RegistryValue -Path $_ -Name "DisableWebSearch" -Silent
        Remove-RegistryValue -Path $_ -Name "AllowCloudSearch" -Silent
        Remove-RegistryValue -Path $_ -Name "EnableDynamicContentInWSB" -Silent
    }
    # Cortana user settings
    Remove-RegistryValue -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\Search" -Name "VoiceShortcut" -Silent
    Remove-RegistryValue -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\Search" -Name "CanCortanaBeEnabled" -Silent
    Remove-RegistryValue -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\Search" -Name "DeviceHistoryEnabled" -Silent
    Remove-RegistryValue -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\Search" -Name "CortanaEnabled" -Silent
    Remove-RegistryValue -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\Search" -Name "CortanaConsent" -Silent
    Remove-RegistryValue -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\Search" -Name "HasAboveLockTips" -Silent
    Remove-RegistryValue -Path "HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Search" -Name "HistoryViewEnabled" -Silent
    Remove-RegistryValue -Path "HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Search" -Name "IsAssignedAccess" -Silent

    # Cortana indexing settings
    Remove-RegistryValue -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\Windows Search" -Name "AllowIndexingEncryptedStoresOrItems" -Silent
    Remove-RegistryValue -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\Windows Search" -Name "AlwaysUseAutoLangDetection" -Silent
    Remove-RegistryValue -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\Windows Search" -Name "PreventRemoteQueries" -Silent
    Remove-RegistryValue -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\Windows Search" -Name "PreventUnindexedItemsInSearchResults" -Silent

    Write-Log "Copilot, Cortana & AI: Complete" -Level Success
}

function Restore-BingSearchWidgets {
    Write-Log "=== BING SEARCH & WIDGETS ===" -Level Section

    Remove-RegistryValue -Path "HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Search" -Name "BingSearchEnabled" -Silent
    Remove-RegistryValue -Path "HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Search" -Name "BingSearchSpokenEnabled" -Silent
    Remove-RegistryValue -Path "HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Search" -Name "CortanaConsent" -Silent
    Remove-RegistryValue -Path "HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\SearchSettings" -Name "IsAADCloudSearchEnabled" -Silent
    Remove-RegistryValue -Path "HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\SearchSettings" -Name "IsMSACloudSearchEnabled" -Silent
    Remove-RegistryValue -Path "HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\SearchSettings" -Name "IsDeviceSearchHistoryEnabled" -Silent
    Remove-RegistryValue -Path "HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\SearchSettings" -Name "IsDynamicSearchBoxEnabled" -Silent
    Remove-RegistryValue -Path "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Search" -Name "BingSearchEnabled" -Silent
    Remove-RegistryValue -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\Explorer" -Name "DisableSearchBoxSuggestions" -Silent
    Remove-RegistryValue -Path "HKCU:\Software\Policies\Microsoft\Windows\Explorer" -Name "DisableSearchBoxSuggestions" -Silent

    # Widgets / Web Experience Pack
    Remove-RegistryValue -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced" -Name "TaskbarDa" -Silent
    Remove-RegistryValue -Path "HKLM:\SOFTWARE\Policies\Microsoft\Dsh" -Name "AllowNewsAndInterests" -Silent

    # Windows search highlights
    Remove-RegistryValue -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\Windows Search" -Name "EnableDynamicContentInWSB" -Silent
    Remove-RegistryValue -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\SearchSettings" -Name "IsDynamicSearchBoxEnabled" -Silent

    Write-Log "Bing Search & Widgets: Complete" -Level Success
}

function Restore-TaskbarUI {
    Write-Log "=== TASKBAR & UI ===" -Level Section

    Remove-RegistryValue -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced" -Name "ShowTaskViewButton" -Silent
    Remove-RegistryValue -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced" -Name "TaskbarDa" -Silent
    Remove-RegistryValue -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced" -Name "TaskbarMn" -Silent
    Remove-RegistryValue -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced" -Name "TaskbarAl" -Silent
    Remove-RegistryValue -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced" -Name "ShowCopilotButton" -Silent
    Remove-RegistryValue -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced\People" -Name "PeopleBand" -Silent
    # Meet Now
    Remove-RegistryValue -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\Policies\Explorer" -Name "HideSCAMeetNow" -Silent
    Remove-RegistryValue -Path "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\Explorer" -Name "HideSCAMeetNow" -Silent

    Write-Log "Taskbar & UI: Complete" -Level Success
}

function Restore-ExplorerSettings {
    Write-Log "=== EXPLORER SETTINGS ===" -Level Section

    # This PC folder restores (remove registry deletions that hid folders)
    @(
        "{B4BFCC3A-DB2C-424C-B029-7FE99A87C641}",  # Desktop
        "{d3162b92-9365-467a-956b-92703aca08af}",    # Documents
        "{088e3905-0323-4b02-9826-5d99428e115f}",    # Downloads
        "{3dfdf296-dbec-4fb4-81d1-6a3438bcf4de}",    # Music
        "{24ad3ad4-a569-4530-98e1-ab02f9417aa8}",    # Pictures
        "{f86fa3ab-70d2-4fc7-9c99-fcbf05467f3a}",    # Videos
        "{0DB7E03F-FC29-4DC6-9020-FF41B59E513A}"     # 3D Objects
    ) | ForEach-Object {
        $keyPath = "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\MyComputer\NameSpace\$_"
        if (!(Test-Path $keyPath)) { New-Item -Path $keyPath -Force -EA 0 | Out-Null; $script:ChangesCount++ }
    }
    # FolderDescriptions PropertyBag (restore ThisPCPolicy to Show)
    @(
        "0ddd015d-b06c-45d5-8c4c-f59713854639",  # Documents
        "35286a68-3c57-41a1-bbb1-0eae73d76c95",   # Videos
        "7d83ee9b-2244-4e70-b1f5-5393042af1e4",   # Downloads
        "a0c69a99-21c8-4671-8703-7934162fcf1d",    # Music
        "f42ee2d3-909f-4907-8871-4c22fc0bf756"     # Pictures
    ) | ForEach-Object {
        Set-RegistryValue -Path "HKLM:\Software\Microsoft\Windows\CurrentVersion\Explorer\FolderDescriptions\{$_}\PropertyBag" -Name "ThisPCPolicy" -Value "Show" -Type "String" -Silent
        Set-RegistryValue -Path "HKLM:\Software\Wow6432Node\Microsoft\Windows\CurrentVersion\Explorer\FolderDescriptions\{$_}\PropertyBag" -Name "ThisPCPolicy" -Value "Show" -Type "String" -Silent
    }

    # Explorer policies
    Remove-RegistryValue -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\Explorer" -Name "NoNewAppAlert" -Silent
    Remove-RegistryValue -Path "HKCU:\Software\Policies\Microsoft\Windows\Explorer" -Name "NoNewAppAlert" -Silent
    Remove-RegistryValue -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced" -Name "ShowSyncProviderNotifications" -Silent
    Remove-RegistryValue -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced" -Name "Start_TrackDocs" -Silent
    Remove-RegistryValue -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced" -Name "LaunchTo" -Silent
    Remove-RegistryValue -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced" -Name "HideFileExt" -Silent
    Remove-RegistryValue -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced" -Name "Hidden" -Silent

    # Recent documents
    Remove-RegistryValue -Path "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\Explorer" -Name "NoRecentDocsHistory" -Silent
    Remove-RegistryValue -Path "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\Explorer" -Name "ClearRecentDocsOnExit" -Silent

    # Sync provider notifications
    Remove-RegistryValue -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced" -Name "ShowSyncProviderNotifications" -Silent

    # Internet file association / web publishing
    Remove-RegistryValue -Path "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\Explorer" -Name "NoInternetOpenWith" -Silent
    Remove-RegistryValue -Path "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\Explorer" -Name "NoOnlinePrintsWizard" -Silent
    Remove-RegistryValue -Path "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\Explorer" -Name "NoPublishingWizard" -Silent
    Remove-RegistryValue -Path "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\Explorer" -Name "NoWebServices" -Silent

    Write-Log "Explorer Settings: Complete" -Level Success
}

function Restore-StartMenuSettings {
    Write-Log "=== START MENU ===" -Level Section
    Remove-RegistryValue -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced" -Name "Start_TrackProgs" -Silent
    Remove-RegistryValue -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced" -Name "Start_IrisRecommendations" -Silent
    Remove-RegistryValue -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced" -Name "Start_AccountNotifications" -Silent
    Remove-RegistryValue -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced" -Name "Start_Layout" -Silent
    Write-Log "Start Menu: Complete" -Level Success
}

function Restore-ThemeSettings {
    Write-Log "=== THEME & PERSONALIZATION ===" -Level Section
    # Windows Tips
    Remove-RegistryKey -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\CloudContent" -Silent
    Remove-RegistryKey -Path "HKLM:\Software\Policies\Microsoft\Windows\CloudContent" -Silent
    # Content Delivery Manager
    @(
        "SubscribedContent-338387Enabled","SubscribedContent-338389Enabled",
        "SubscribedContent-338393Enabled","SubscribedContent-353694Enabled",
        "SubscribedContent-353696Enabled","SubscribedContent-310093Enabled",
        "SubscribedContent-338388Enabled","SubscribedContent-314563Enabled",
        "SubscribedContent-353698Enabled","RotatingLockScreenEnabled",
        "RotatingLockScreenOverlayEnabled","SilentInstalledAppsEnabled",
        "SoftLandingEnabled","SystemPaneSuggestionsEnabled",
        "ContentDeliveryAllowed","OemPreInstalledAppsEnabled",
        "PreInstalledAppsEnabled","PreInstalledAppsEverEnabled",
        "FeatureManagementEnabled","RemediationRequired"
    ) | ForEach-Object {
        Remove-RegistryValue -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\ContentDeliveryManager" -Name $_ -Silent
    }
    # Suggested content in Settings
    Remove-RegistryValue -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\ContentDeliveryManager" -Name "SubscribedContent-338393Enabled" -Silent
    Remove-RegistryValue -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\ContentDeliveryManager" -Name "SubscribedContent-353694Enabled" -Silent
    Remove-RegistryValue -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\ContentDeliveryManager" -Name "SubscribedContent-353696Enabled" -Silent
    # Spotlight / lock screen
    Remove-RegistryValue -Path "HKCU:\Software\Policies\Microsoft\Windows\CloudContent" -Name "DisableWindowsSpotlightFeatures" -Silent
    # Camera on/off OSD
    Remove-RegistryValue -Path "HKLM:\SOFTWARE\Microsoft\OEM\Device\Capture" -Name "NoPhysicalCameraLED" -Silent

    Write-Log "Theme & Personalization: Complete" -Level Success
}

function Restore-ContentDeliveryManager {
    Write-Log "=== CONTENT DELIVERY / ADS ===" -Level Section
    @(
        "SubscribedContent-338387Enabled","SubscribedContent-338389Enabled",
        "SubscribedContent-338393Enabled","SubscribedContent-353694Enabled",
        "SubscribedContent-353696Enabled","SubscribedContent-310093Enabled",
        "SubscribedContent-338388Enabled","SubscribedContent-314563Enabled",
        "SubscribedContent-353698Enabled","RotatingLockScreenEnabled",
        "RotatingLockScreenOverlayEnabled","SilentInstalledAppsEnabled",
        "SoftLandingEnabled","SystemPaneSuggestionsEnabled",
        "ContentDeliveryAllowed","OemPreInstalledAppsEnabled",
        "PreInstalledAppsEnabled","PreInstalledAppsEverEnabled",
        "FeatureManagementEnabled","RemediationRequired"
    ) | ForEach-Object {
        Remove-RegistryValue -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\ContentDeliveryManager" -Name $_ -Silent
    }
    Remove-RegistryKey -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\CloudContent" -Silent
    Remove-RegistryKey -Path "HKLM:\Software\Policies\Microsoft\Windows\CloudContent" -Silent
    Write-Log "Content Delivery: Complete" -Level Success
}

function Restore-BluetoothSettings {
    Write-Log "=== BLUETOOTH ===" -Level Section
    @(
        @{N="bthserv"; T="Manual"},
        @{N="BTAGService"; T="Manual"},
        @{N="BthAvctpSvc"; T="Manual"}
    ) | ForEach-Object { Restore-ServiceStartup -ServiceName $_.N -StartupType $_.T -Silent }
    Write-Log "Bluetooth: Complete" -Level Success
}

function Restore-NotificationSettings {
    Write-Log "=== NOTIFICATIONS ===" -Level Section
    Remove-RegistryValue -Path "HKCU:\Software\Policies\Microsoft\Windows\CurrentVersion\PushNotifications" -Name "NoToastApplicationNotification" -Silent
    Remove-RegistryValue -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\Notifications\Settings" -Name "NOC_GLOBAL_SETTING_ALLOW_TOASTS_ABOVE_LOCK" -Silent
    Remove-RegistryValue -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\PushNotifications" -Name "LockScreenToastEnabled" -Silent
    # Live tiles
    Remove-RegistryValue -Path "HKCU:\Software\Policies\Microsoft\Windows\CurrentVersion\PushNotifications" -Name "NoCloudApplicationNotification" -Silent
    # App suggestions (Look for app in Store)
    Remove-RegistryValue -Path "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\AppHost" -Name "EnableWebContentEvaluation" -Silent

    Write-Log "Notifications: Complete" -Level Success
}

function Restore-OOBESettings {
    Write-Log "=== OOBE & SETUP ===" -Level Section
    Remove-RegistryValue -Path "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\OOBE" -Name "DisablePrivacyExperience" -Silent
    # Reserved storage
    Remove-RegistryValue -Path "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\ReserveManager" -Name "ShippedWithReserves" -Silent
    # NTP server restore
    Set-RegistryValue -Path "HKLM:\SYSTEM\CurrentControlSet\Services\W32Time\Parameters" -Name "NtpServer" -Value "time.windows.com,0x9" -Type "String" -Silent
    Write-Log "OOBE & Setup: Complete" -Level Success
}

function Restore-DefenderSettings {
    Write-Log "=== WINDOWS DEFENDER (EXHAUSTIVE) ===" -Level Section

    # ---- Remove ALL Defender group policies ----
    Remove-RegistryKey -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows Defender" -Silent
    Remove-RegistryKey -Path "HKLM:\SOFTWARE\Policies\Microsoft\Microsoft Antimalware" -Silent

    # ---- Individual policy reversals (extensive - every known GPO value) ----
    $defBase = "HKLM:\SOFTWARE\Policies\Microsoft\Windows Defender"
    @(
        @{P=$defBase; N="DisableAntiSpyware"},
        @{P=$defBase; N="DisableAntiVirus"},
        @{P=$defBase; N="DisableRoutinelyTakingAction"},
        @{P=$defBase; N="ServiceKeepAlive"},
        @{P=$defBase; N="AllowFastServiceStartup"},
        @{P=$defBase; N="PUAProtection"},
        @{P=$defBase; N="RandomizeScheduleTaskTimes"},
        @{P="$defBase\Real-Time Protection"; N="DisableRealtimeMonitoring"},
        @{P="$defBase\Real-Time Protection"; N="DisableBehaviorMonitoring"},
        @{P="$defBase\Real-Time Protection"; N="DisableOnAccessProtection"},
        @{P="$defBase\Real-Time Protection"; N="DisableScanOnRealtimeEnable"},
        @{P="$defBase\Real-Time Protection"; N="DisableIOAVProtection"},
        @{P="$defBase\Real-Time Protection"; N="DisableIntrusionPreventionSystem"},
        @{P="$defBase\Real-Time Protection"; N="DisableRawWriteNotification"},
        @{P="$defBase\Real-Time Protection"; N="DisableInformationProtectionControl"},
        @{P="$defBase\Real-Time Protection"; N="RealtimeScanDirection"},
        @{P="$defBase\Real-Time Protection"; N="LocalSettingOverrideDisableRealtimeMonitoring"},
        @{P="$defBase\Real-Time Protection"; N="IOAVMaxSize"},
        @{P="$defBase\Spynet"; N="SpyNetReporting"},
        @{P="$defBase\Spynet"; N="SubmitSamplesConsent"},
        @{P="$defBase\Spynet"; N="DisableBlockAtFirstSeen"},
        @{P="$defBase\Spynet"; N="LocalSettingOverrideSpynetReporting"},
        @{P="$defBase\MpEngine"; N="MpEnablePus"},
        @{P="$defBase\MpEngine"; N="MpCloudBlockLevel"},
        @{P="$defBase\MpEngine"; N="MpBafsExtendedTimeout"},
        @{P="$defBase\MpEngine"; N="EnableFileHashComputation"},
        @{P="$defBase\Reporting"; N="DisableEnhancedNotifications"},
        @{P="$defBase\Reporting"; N="DisableGenericRePorts"},
        @{P="$defBase\Scan"; N="DisableArchiveScanning"},
        @{P="$defBase\Scan"; N="DisableRemovableDriveScanning"},
        @{P="$defBase\Scan"; N="DisableEmailScanning"},
        @{P="$defBase\Scan"; N="DisableScanningMappedNetworkDrivesForFullScan"},
        @{P="$defBase\Scan"; N="DisableScanningNetworkFiles"},
        @{P="$defBase\Scan"; N="DisablePackedExeScanning"},
        @{P="$defBase\Scan"; N="DisableReparsePointScanning"},
        @{P="$defBase\Scan"; N="DisableHeuristics"},
        @{P="$defBase\Scan"; N="DisableScanOnUpdate"},
        @{P="$defBase\Scan"; N="DisableCatchupFullScan"},
        @{P="$defBase\Scan"; N="DisableCatchupQuickScan"},
        @{P="$defBase\Scan"; N="DisableRestorePoint"},
        @{P="$defBase\Scan"; N="CheckForSignaturesBeforeRunningScan"},
        @{P="$defBase\Scan"; N="ScanParameters"},
        @{P="$defBase\Scan"; N="ScheduleDay"},
        @{P="$defBase\Scan"; N="ScheduleTime"},
        @{P="$defBase\Scan"; N="ScheduleQuickScanTime"},
        @{P="$defBase\Scan"; N="AvgCPULoadFactor"},
        @{P="$defBase\Scan"; N="LowCpuPriority"},
        @{P="$defBase\Scan"; N="ScanOnlyIfIdle"},
        @{P="$defBase\Scan"; N="PurgeItemsAfterDelay"},
        @{P="$defBase\Scan"; N="MissedScheduledScanCountBeforeCatchup"},
        @{P="$defBase\Scan"; N="ArchiveMaxDepth"},
        @{P="$defBase\Scan"; N="ArchiveMaxSize"},
        @{P="$defBase\Signature Updates"; N="ForceUpdateFromMU"},
        @{P="$defBase\Signature Updates"; N="UpdateOnStartUp"},
        @{P="$defBase\Signature Updates"; N="SignatureUpdateInterval"},
        @{P="$defBase\Signature Updates"; N="ScheduleDay"},
        @{P="$defBase\Signature Updates"; N="ScheduleTime"},
        @{P="$defBase\Signature Updates"; N="ASSignatureDue"},
        @{P="$defBase\Signature Updates"; N="AVSignatureDue"},
        @{P="$defBase\Signature Updates"; N="SignatureUpdateCatchupInterval"},
        @{P="$defBase\Signature Updates"; N="DisableUpdateOnStartupWithoutEngine"},
        @{P="$defBase\Signature Updates"; N="SignatureDisableNotification"},
        @{P="$defBase\Signature Updates"; N="FallbackOrder"},
        @{P="$defBase\Signature Updates"; N="DefinitionUpdateFileSharesSources"},
        @{P="$defBase\Signature Updates"; N="SignatureFirstAuGracePeriod"},
        @{P="$defBase\Windows Defender Exploit Guard\ASR"; N="ExploitGuard_ASR_Rules"},
        @{P="$defBase\Windows Defender Exploit Guard\Network Protection"; N="EnableNetworkProtection"},
        @{P="$defBase\Windows Defender Exploit Guard\Controlled Folder Access"; N="EnableControlledFolderAccess"},
        @{P="$defBase\Features"; N="TamperProtection"},
        @{P="$defBase\UX Configuration"; N="Notification_Suppress"},
        @{P="$defBase\UX Configuration"; N="UILockdown"},
        @{P="$defBase\Remediation"; N="Scan_ScheduleDay"},
        @{P="$defBase\Remediation"; N="LocalSettingOverrideScan_ScheduleDay"},
        @{P="$defBase\Quarantine"; N="PurgeItemsAfterDelay"},
        @{P="$defBase\Quarantine"; N="LocalPurgeItemsAfterDelay"}
    ) | ForEach-Object { Remove-RegistryValue -Path $_.P -Name $_.N -Silent }

    # ---- User-level Defender overrides ----
    @("DisableAntiSpyware","DisableAntiVirus","PassiveMode") | ForEach-Object {
        Remove-RegistryValue -Path "HKLM:\SOFTWARE\Microsoft\Windows Defender" -Name $_ -Silent
    }
    Remove-RegistryValue -Path "HKLM:\SOFTWARE\Microsoft\Windows Defender\Real-Time Protection" -Name "DisableRealtimeMonitoring" -Silent
    Remove-RegistryValue -Path "HKLM:\SOFTWARE\Microsoft\Windows Defender\Features" -Name "TamperProtection" -Silent

    # ---- Remove exclusions added by debloat scripts ----
    @("Paths","Extensions","Processes","TemporaryPaths","IpAddresses") | ForEach-Object {
        Remove-RegistryKey -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows Defender\Exclusions\$_" -Silent
    }
    Remove-RegistryKey -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows Defender\Exclusions" -Silent

    # ---- IFEO blocks (remove debugger redirects that block Defender EXEs) ----
    Write-Log "Removing Image File Execution Options blocks on Defender..." -Level Info
    @(
        "MsMpEng.exe","NisSrv.exe","MpCmdRun.exe","MpCopyAccelerator.exe",
        "MpDefenderCoreService.exe","MpDlpCmd.exe","MpDlpService.exe",
        "ConfigSecurityPolicy.exe","SecurityHealthHost.exe","SecurityHealthService.exe",
        "SgrmBroker.exe","SgrmLpac.exe","smartscreen.exe"
    ) | ForEach-Object {
        Remove-RegistryKey -Path "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Image File Execution Options\$_" -Silent
    }
    $script:ChangesCount++

    # ---- Restore renamed Defender EXEs (.OLD files) ----
    Write-Log "Checking for renamed Defender executables..." -Level Info
    $defenderPaths = @(
        "$env:ProgramFiles\Windows Defender",
        "$env:ProgramFiles\Windows Defender Advanced Threat Protection",
        "$env:ProgramData\Microsoft\Windows Defender\Platform"
    )
    foreach ($dp in $defenderPaths) {
        if (Test-Path $dp) {
            Get-ChildItem -Path $dp -Filter "*.OLD" -Recurse -EA 0 | ForEach-Object {
                $newName = $_.FullName -replace '\.OLD$',''
                if (!(Test-Path $newName)) {
                    try { Rename-Item -Path $_.FullName -NewName (Split-Path $newName -Leaf) -Force -EA Stop
                        Write-Log "Restored: $($_.Name)" -Level Success; $script:ChangesCount++
                    } catch { Write-Log "Could not restore $($_.Name): $($_.Exception.Message)" -Level Warning }
                }
            }
        }
    }

    # ---- Restore Defender services (comprehensive) ----
    Write-Log "Restoring Defender services..." -Level Info
    @(
        @{N="WinDefend"; T="Automatic"},
        @{N="WdNisSvc"; T="Manual"},
        @{N="WdFilter"; T="Boot"},
        @{N="WdBoot"; T="Boot"},
        @{N="WdNisDrv"; T="Manual"},
        @{N="SecurityHealthService"; T="Manual"},
        @{N="wscsvc"; T="Automatic"},
        @{N="Sense"; T="Manual"},
        @{N="SgrmAgent"; T="Manual"},
        @{N="SgrmBroker"; T="Automatic"},
        @{N="MsSecCore"; T="Manual"},
        @{N="MsSecFlt"; T="Boot"},
        @{N="MsSecWfp"; T="Boot"},
        @{N="MDDlpSvc"; T="Manual"},
        @{N="webthreatdefsvc"; T="Manual"},
        @{N="webthreatdefusersvc"; T="Manual"}
    ) | ForEach-Object {
        Restore-ServiceStartup -ServiceName $_.N -StartupType $_.T -Silent
        # Boot/System drivers: also fix via registry Start value
        if ($_.T -eq "Boot") {
            $regPath = "HKLM:\SYSTEM\CurrentControlSet\Services\$($_.N)"
            if (Test-Path $regPath) { Set-ItemProperty -Path $regPath -Name "Start" -Value 0 -Force -EA 0 }
        }
    }

    # ---- ETW / Event Log providers ----
    Set-RegistryValue -Path "HKLM:\System\CurrentControlSet\Control\WMI\Autologger\DefenderApiLogger" -Name "Start" -Value 1 -Silent
    Set-RegistryValue -Path "HKLM:\System\CurrentControlSet\Control\WMI\Autologger\DefenderAuditLogger" -Name "Start" -Value 1 -Silent
    Remove-RegistryValue -Path "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\WINEVT\Channels\Microsoft-Windows-Windows Defender/Operational" -Name "Enabled" -Silent
    Remove-RegistryValue -Path "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\WINEVT\Channels\Microsoft-Windows-Windows Defender/WHC" -Name "Enabled" -Silent

    # ---- AMSI (re-enable) ----
    Remove-RegistryValue -Path "HKCU:\Software\Microsoft\Windows Script Host\Settings" -Name "Enabled" -Silent
    Remove-RegistryValue -Path "HKLM:\SOFTWARE\Microsoft\AMSI\Providers" -Name "ForceDisable" -Silent

    # ---- Scheduled Tasks ----
    @(
        "Windows Defender Cache Maintenance","Windows Defender Cleanup",
        "Windows Defender Scheduled Scan","Windows Defender Verification",
        "Windows Defender ExploitGuard MDM Refresh"
    ) | ForEach-Object { Enable-ScheduledTaskSafe -TaskPath "\Microsoft\Windows\Windows Defender\" -TaskName $_ -Silent }

    # ---- Security Center notifications ----
    Remove-RegistryKey -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows Defender Security Center" -Silent

    # ---- Restore Security Health tray ----
    Set-RegistryValue -Path "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Run" -Name "SecurityHealth" -Value "%ProgramFiles%\Windows Defender\MSASCuiL.exe" -Type "ExpandString" -Silent

    # ---- Malicious Software Removal Tool ----
    Remove-RegistryValue -Path "HKLM:\SOFTWARE\Policies\Microsoft\MRT" -Name "DontReportInfectionInformation" -Silent
    Remove-RegistryValue -Path "HKLM:\SOFTWARE\Policies\Microsoft\MRT" -Name "DontOfferThroughWUAU" -Silent

    # ---- Start WinDefend if stopped ----
    try {
        $def = Get-Service -Name "WinDefend" -EA 0
        if ($def -and $def.Status -eq 'Stopped') {
            Start-Service -Name "WinDefend" -EA 0
            Write-Log "Started WinDefend service" -Level Success
        }
    } catch { Write-Log "Could not start WinDefend - reboot required" -Level Warning }

    # ---- Force signature update ----
    try {
        $mpCmd = "$env:ProgramFiles\Windows Defender\MpCmdRun.exe"
        if (Test-Path $mpCmd) {
            Start-Process -FilePath $mpCmd -ArgumentList "-SignatureUpdate" -NoNewWindow -Wait -EA 0
            Write-Log "Defender signature update triggered" -Level Success
        }
    } catch { Write-Log "Could not trigger signature update" -Level Warning }

    Write-Log "Windows Defender: Complete" -Level Success
    # Also restore Windows Security UI
    Restore-WindowsSecurityUI
}

function Restore-SmartScreenSettings {
    Write-Log "=== SMARTSCREEN (COMPREHENSIVE) ===" -Level Section

    # IFEO block on smartscreen.exe
    Remove-RegistryKey -Path "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Image File Execution Options\smartscreen.exe" -Silent

    # SmartScreen policies
    Remove-RegistryValue -Path "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer" -Name "SmartScreenEnabled" -Silent
    Remove-RegistryValue -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\System" -Name "EnableSmartScreen" -Silent
    Remove-RegistryValue -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\System" -Name "ShellSmartScreenLevel" -Silent
    Remove-RegistryValue -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\System" -Name "ConfigureAppInstallControl" -Silent
    Remove-RegistryValue -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\System" -Name "ConfigureAppInstallControlEnabled" -Silent

    # SmartScreen for Store apps
    Remove-RegistryValue -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\AppHost" -Name "EnableWebContentEvaluation" -Silent
    Remove-RegistryValue -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\AppHost" -Name "PreventOverride" -Silent

    # Edge SmartScreen
    Remove-RegistryValue -Path "HKLM:\SOFTWARE\Policies\Microsoft\Edge" -Name "SmartScreenEnabled" -Silent
    Remove-RegistryValue -Path "HKLM:\SOFTWARE\Policies\Microsoft\Edge" -Name "SmartScreenPuaEnabled" -Silent
    Remove-RegistryValue -Path "HKLM:\SOFTWARE\Policies\Microsoft\Edge" -Name "PreventSmartScreenPromptOverride" -Silent
    Remove-RegistryValue -Path "HKLM:\SOFTWARE\Policies\Microsoft\Edge" -Name "PreventSmartScreenPromptOverrideForFiles" -Silent
    Remove-RegistryValue -Path "HKLM:\SOFTWARE\Policies\Microsoft\Edge" -Name "SmartScreenDnsRequestsEnabled" -Silent
    Remove-RegistryValue -Path "HKLM:\SOFTWARE\Policies\Microsoft\Edge" -Name "SmartScreenForTrustedDownloadsEnabled" -Silent

    # Edge Legacy SmartScreen
    Remove-RegistryValue -Path "HKCU:\Software\Classes\Local Settings\Software\Microsoft\Windows\CurrentVersion\AppContainer\Storage\microsoft.microsoftedge_8wekyb3d8bbwe\MicrosoftEdge\PhishingFilter" -Name "EnabledV9" -Silent
    Remove-RegistryValue -Path "HKCU:\Software\Classes\Local Settings\Software\Microsoft\Windows\CurrentVersion\AppContainer\Storage\microsoft.microsoftedge_8wekyb3d8bbwe\MicrosoftEdge\PhishingFilter" -Name "PreventOverride" -Silent

    # IE SmartScreen
    Remove-RegistryValue -Path "HKLM:\SOFTWARE\Policies\Microsoft\Internet Explorer\PhishingFilter" -Name "EnabledV9" -Silent
    Remove-RegistryValue -Path "HKLM:\SOFTWARE\Policies\Microsoft\Internet Explorer\PhishingFilter" -Name "PreventOverride" -Silent

    # Enhanced Phishing Protection
    Remove-RegistryKey -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\WTDS\Components" -Silent

    # Restore SmartScreen EXE if renamed
    $ssPath = "$env:SystemRoot\System32\smartscreen.exe"
    if ((Test-Path "$ssPath.OLD") -and !(Test-Path $ssPath)) {
        try { Rename-Item -Path "$ssPath.OLD" -NewName "smartscreen.exe" -Force -EA Stop; $script:ChangesCount++ } catch { }
    }

    Write-Log "SmartScreen: Complete" -Level Success
}

function Restore-FirewallSettings {
    Write-Log "=== WINDOWS FIREWALL (COMPREHENSIVE) ===" -Level Section

    # ---- Firewall registry (all profiles) ----
    @("DomainProfile","PublicProfile","StandardProfile") | ForEach-Object {
        Set-RegistryValue -Path "HKLM:\SYSTEM\CurrentControlSet\Services\SharedAccess\Parameters\FirewallPolicy\$_" -Name "EnableFirewall" -Value 1 -Silent
        Remove-RegistryValue -Path "HKLM:\SYSTEM\CurrentControlSet\Services\SharedAccess\Parameters\FirewallPolicy\$_" -Name "DoNotAllowExceptions" -Silent
    }

    # ---- Firewall policies ----
    Remove-RegistryKey -Path "HKLM:\SOFTWARE\Policies\Microsoft\WindowsFirewall" -Silent

    # ---- Firewall services ----
    @(
        @{N="MpsSvc"; T="Automatic"},
        @{N="mpsdrv"; T="Manual"},
        @{N="BFE"; T="Automatic"},
        @{N="SharedAccess"; T="Manual"}
    ) | ForEach-Object { Restore-ServiceStartup -ServiceName $_.N -StartupType $_.T -Silent }

    # ---- WFP callout driver ----
    Restore-ServiceStartup -ServiceName "MsSecWfp" -StartupType "Boot" -Silent

    # ---- Enable firewall via netsh ----
    try {
        Start-Process -FilePath "netsh" -ArgumentList "advfirewall set allprofiles state on" -NoNewWindow -Wait -EA 0
        Write-Log "Firewall enabled via netsh" -Level Success
        $script:ChangesCount++
    } catch { Write-Log "Could not enable firewall via netsh" -Level Warning }

    # ---- Windows Security Firewall section ----
    Remove-RegistryValue -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows Defender Security Center\Firewall and network protection" -Name "UILockdown" -Silent

    Write-Log "Windows Firewall: Complete" -Level Success
}

function Restore-WindowsSecurityUI {
    Write-Log "=== WINDOWS SECURITY UI ===" -Level Section

    # ---- Security Center sections (re-enable all hidden sections) ----
    @(
        "Virus and threat protection",
        "Firewall and network protection",
        "App and browser control",
        "Device security",
        "Device performance and health",
        "Family options",
        "Account protection"
    ) | ForEach-Object {
        Remove-RegistryValue -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows Defender Security Center\$_" -Name "UILockdown" -Silent
    }
    Remove-RegistryValue -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows Defender Security Center\Device security" -Name "DisableClearTpmButton" -Silent
    Remove-RegistryValue -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows Defender Security Center\Device security" -Name "HideSecureBoot" -Silent
    Remove-RegistryValue -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows Defender Security Center\Device security" -Name "HideTPMTroubleshooting" -Silent
    Remove-RegistryValue -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows Defender Security Center\Device security" -Name "DisableTpmFirmwareUpdateWarning" -Silent
    Remove-RegistryKey -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows Defender Security Center" -Silent

    # ---- Security and Maintenance notifications ----
    Remove-RegistryValue -Path "HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Notifications\Settings\Windows.SystemToast.SecurityAndMaintenance" -Name "Enabled" -Silent
    Remove-RegistryValue -Path "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Notifications\Settings\Windows.SystemToast.SecurityAndMaintenance" -Name "Enabled" -Silent
    Remove-RegistryValue -Path "HKCU:\SOFTWARE\Policies\Microsoft\Windows\Explorer" -Name "DisableNotificationCenter" -Silent

    # ---- Defender notification settings ----
    Remove-RegistryValue -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows Defender\UX Configuration" -Name "Notification_Suppress" -Silent
    Remove-RegistryValue -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows Defender\Reporting" -Name "DisableEnhancedNotifications" -Silent
    Remove-RegistryValue -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows Defender" -Name "UILockdown" -Silent

    # ---- Restore "Scan with Defender" context menu ----
    Remove-RegistryValue -Path "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Shell Extensions\Blocked" -Name "{09A47860-11B0-4DA5-AFA5-26D86198A780}" -Silent

    # ---- Security Health Agent ----
    Remove-RegistryValue -Path "HKLM:\SYSTEM\CurrentControlSet\Services\SecurityHealthService" -Name "Start" -Silent

    # ---- VBS / Device Guard (restore defaults, don't force enable) ----
    Remove-RegistryValue -Path "HKLM:\SYSTEM\CurrentControlSet\Control\DeviceGuard" -Name "EnableVirtualizationBasedSecurity" -Silent
    Remove-RegistryValue -Path "HKLM:\SYSTEM\CurrentControlSet\Control\DeviceGuard" -Name "RequirePlatformSecurityFeatures" -Silent
    Remove-RegistryValue -Path "HKLM:\SYSTEM\CurrentControlSet\Control\DeviceGuard\Scenarios\HypervisorEnforcedCodeIntegrity" -Name "Enabled" -Silent

    Write-Log "Windows Security UI: Complete" -Level Success
}

function Restore-WindowsUpdateSettings {
    Write-Log "=== WINDOWS UPDATE (FULL REPAIR) ===" -Level Section

    # ---- Remove ALL WU policies ----
    Remove-RegistryKey -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate" -Silent
    Remove-RegistryKey -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\DeliveryOptimization" -Silent
    Remove-RegistryKey -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\DriverSearching" -Silent

    # ---- AU policy reversals ----
    @("NoAutoUpdate","AUOptions","AutoInstallMinorUpdates","NoAutoRebootWithLoggedOnUsers",
      "RebootRelaunchTimeout","RebootRelaunchTimeoutEnabled","RebootWarningTimeout",
      "RebootWarningTimeoutEnabled","ScheduledInstallDay","ScheduledInstallTime","UseWUServer",
      "AlwaysAutoRebootAtScheduledTime","AlwaysAutoRebootAtScheduledTimeMinutes",
      "IncludeRecommendedUpdates","AutomaticMaintenanceEnabled","DetectionFrequency",
      "DetectionFrequencyEnabled","RescheduleWaitTime","RescheduleWaitTimeEnabled"
    ) | ForEach-Object { Remove-RegistryValue -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate\AU" -Name $_ -Silent }

    # ---- WU base policies ----
    @("WUServer","WUStatusServer","UpdateServiceUrlAlternate","DisableWindowsUpdateAccess",
      "SetDisableUXWUAccess","ExcludeWUDriversInQualityUpdate","ManagePreviewBuilds",
      "ManagePreviewBuildsPolicyValue","DeferFeatureUpdates","DeferFeatureUpdatesPeriodInDays",
      "BranchReadinessLevel","DeferQualityUpdates","DeferQualityUpdatesPeriodInDays",
      "TargetReleaseVersion","TargetReleaseVersionInfo","ProductVersion",
      "SetPolicyDrivenUpdateSourceForFeatureUpdates","SetPolicyDrivenUpdateSourceForQualityUpdates",
      "SetPolicyDrivenUpdateSourceForDriverUpdates","SetPolicyDrivenUpdateSourceForOtherUpdates",
      "DisableDualScan","DoNotEnforceEnterpriseTLSCertPinningForUpdateDetection",
      "SetProxyBehaviorForUpdateDetection","AllowAutoWindowsUpdateDownloadOverMeteredNetwork",
      "SetAutoRestartNotificationDisable","SetEDURestart","SetRestartWarningSchd",
      "SetUpdateNotificationLevel","ConfigureDeadlineForFeatureUpdates",
      "ConfigureDeadlineForQualityUpdates","ConfigureDeadlineGracePeriod",
      "ConfigureDeadlineNoAutoReboot","DoNotConnectToWindowsUpdateInternetLocations",
      "SetPolicyDrivenUpdateSourceForFeatureUpdates","SetPolicyDrivenUpdateSourceForQualityUpdates",
      "SetPolicyDrivenUpdateSourceForDriverUpdates","SetPolicyDrivenUpdateSourceForOtherUpdates"
    ) | ForEach-Object { Remove-RegistryValue -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate" -Name $_ -Silent }

    # ---- UX Settings ----
    @("ActiveHoursStart","ActiveHoursEnd","PauseFeatureUpdatesStartTime","PauseFeatureUpdatesEndTime",
      "PauseQualityUpdatesStartTime","PauseQualityUpdatesEndTime","PauseUpdatesStartTime",
      "PauseUpdatesExpiryTime","FlightSettingsMaxPauseDays","IsExpedited","LastActiveHoursState"
    ) | ForEach-Object { Remove-RegistryValue -Path "HKLM:\SOFTWARE\Microsoft\WindowsUpdate\UX\Settings" -Name $_ -Silent }

    # ---- PolicyManager update policies ----
    @("Pause","PauseFeatureUpdates","PauseQualityUpdates","RequireDeferUpgrade",
      "DeferFeatureUpdatesPeriodInDays","DeferQualityUpdatesPeriodInDays",
      "ExcludeWUDriversInQualityUpdate","ConfigureDeadlineForFeatureUpdates",
      "ConfigureDeadlineForQualityUpdates"
    ) | ForEach-Object {
        Remove-RegistryValue -Path "HKLM:\SOFTWARE\Microsoft\PolicyManager\default\Update\$_" -Name "value" -Silent
    }

    # ---- WU driver search ----
    Remove-RegistryValue -Path "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\DriverSearching" -Name "SearchOrderConfig" -Silent
    Remove-RegistryValue -Path "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\DriverSearching" -Name "DontSearchWindowsUpdate" -Silent
    Remove-RegistryKey -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\DriverSearching" -Silent

    # ---- Delivery Optimization ----
    Remove-RegistryValue -Path "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\DeliveryOptimization\Config" -Name "DODownloadMode" -Silent
    Remove-RegistryValue -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\DeliveryOptimization" -Name "SystemSettingsDownloadMode" -Silent
    Remove-RegistryValue -Path "HKU:\S-1-5-20\Software\Microsoft\Windows\CurrentVersion\DeliveryOptimization\Settings" -Name "DownloadMode" -Silent

    # ---- WSUS/SCCM cleanup ----
    Remove-RegistryValue -Path "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\WindowsUpdate\Auto Update" -Name "AUOptions" -Silent
    Remove-RegistryValue -Path "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\WindowsUpdate\Auto Update" -Name "EnableFeaturedSoftware" -Silent
    Remove-RegistryValue -Path "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\WindowsUpdate\Auto Update" -Name "IncludeRecommendedUpdates" -Silent

    # ---- IFEO blocks on WU executables ----
    Remove-RegistryKey -Path "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Image File Execution Options\WaaSMedicAgent.exe" -Silent
    Remove-RegistryKey -Path "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Image File Execution Options\upfc.exe" -Silent

    # ---- UpdatePolicy ----
    Remove-RegistryValue -Path "HKLM:\SOFTWARE\Microsoft\WindowsUpdate\UpdatePolicy\Settings" -Name "PausedQualityDate" -Silent
    Remove-RegistryValue -Path "HKLM:\SOFTWARE\Microsoft\WindowsUpdate\UpdatePolicy\Settings" -Name "PausedFeatureDate" -Silent
    Remove-RegistryValue -Path "HKLM:\SOFTWARE\Microsoft\WindowsUpdate\UpdatePolicy\PolicyState" -Name "PausedQualityDate" -Silent
    Remove-RegistryValue -Path "HKLM:\SOFTWARE\Microsoft\WindowsUpdate\UpdatePolicy\PolicyState" -Name "PausedFeatureDate" -Silent

    # ---- Restore WU services ----
    @(
        @{N="wuauserv"; T="Manual"},
        @{N="WaaSMedicSvc"; T="Manual"},
        @{N="UsoSvc"; T="Automatic"},
        @{N="DoSvc"; T="Automatic"},
        @{N="BITS"; T="Manual"},
        @{N="TrustedInstaller"; T="Manual"},
        @{N="InstallService"; T="Manual"},
        @{N="msiserver"; T="Manual"},
        @{N="CryptSvc"; T="Automatic"},
        @{N="AppReadiness"; T="Manual"},
        @{N="uhssvc"; T="Manual"}
    ) | ForEach-Object { Restore-ServiceStartup -ServiceName $_.N -StartupType $_.T -Silent }

    # ---- Start critical services ----
    @("CryptSvc","BITS","wuauserv") | ForEach-Object {
        try { $s = Get-Service -Name $_ -EA 0; if ($s -and $s.Status -eq 'Stopped') { Start-Service -Name $_ -EA 0 } } catch { }
    }

    # ---- Restore WU scheduled tasks (exhaustive) ----
    @(
        @{P="\Microsoft\Windows\WindowsUpdate\"; N="Scheduled Start"},
        @{P="\Microsoft\Windows\WindowsUpdate\"; N="sih"},
        @{P="\Microsoft\Windows\WindowsUpdate\"; N="sihboot"},
        @{P="\Microsoft\Windows\UpdateOrchestrator\"; N="Schedule Scan"},
        @{P="\Microsoft\Windows\UpdateOrchestrator\"; N="Schedule Scan Static Task"},
        @{P="\Microsoft\Windows\UpdateOrchestrator\"; N="USO_UxBroker"},
        @{P="\Microsoft\Windows\UpdateOrchestrator\"; N="Report policies"},
        @{P="\Microsoft\Windows\UpdateOrchestrator\"; N="Schedule Maintenance Work"},
        @{P="\Microsoft\Windows\UpdateOrchestrator\"; N="Schedule Work"},
        @{P="\Microsoft\Windows\UpdateOrchestrator\"; N="Schedule Wake To Work"},
        @{P="\Microsoft\Windows\UpdateOrchestrator\"; N="UpdateModelTask"},
        @{P="\Microsoft\Windows\UpdateOrchestrator\"; N="Refresh Settings"},
        @{P="\Microsoft\Windows\UpdateOrchestrator\"; N="Reboot"},
        @{P="\Microsoft\Windows\UpdateOrchestrator\"; N="Reboot_AC"},
        @{P="\Microsoft\Windows\UpdateOrchestrator\"; N="Reboot_Battery"},
        @{P="\Microsoft\Windows\UpdateOrchestrator\"; N="RestoreDevice"},
        @{P="\Microsoft\Windows\UpdateOrchestrator\"; N="ScanForUpdates"},
        @{P="\Microsoft\Windows\UpdateOrchestrator\"; N="ScanForUpdatesAsUser"},
        @{P="\Microsoft\Windows\UpdateOrchestrator\"; N="SmartRetry"},
        @{P="\Microsoft\Windows\UpdateOrchestrator\"; N="WakeUpAndContinueUpdates"},
        @{P="\Microsoft\Windows\UpdateOrchestrator\"; N="WakeUpAndScanForUpdates"},
        @{P="\Microsoft\Windows\UpdateOrchestrator\"; N="Start Oobe Expedite Work"},
        @{P="\Microsoft\Windows\UpdateOrchestrator\"; N="StartOobeAppsScan_LicenseAccepted"},
        @{P="\Microsoft\Windows\UpdateOrchestrator\"; N="StartOobeAppsScan_OobeAppReady"},
        @{P="\Microsoft\Windows\UpdateOrchestrator\"; N="StartOobeAppsScanAfterUpdate"},
        @{P="\Microsoft\Windows\UpdateOrchestrator\"; N="UUS Failover Task"},
        @{P="\Microsoft\Windows\WaaSMedic\"; N="PerformRemediation"},
        @{P="\Microsoft\Windows\Servicing\"; N="StartComponentCleanup"}
    ) | ForEach-Object { Enable-ScheduledTaskSafe -TaskPath $_.P -TaskName $_.N -Silent }

    # ---- Reset SoftwareDistribution and catroot2 ----
    Write-Log "Resetting Windows Update component stores..." -Level Info
    try {
        @("wuauserv","BITS","CryptSvc","msiserver") | ForEach-Object { Stop-Service -Name $_ -Force -EA 0 }
        $sdPath = "$env:SystemRoot\SoftwareDistribution"
        $sdBak = "$env:SystemRoot\SoftwareDistribution.bak"
        if (Test-Path $sdPath) {
            if (Test-Path $sdBak) { Remove-Item -Path $sdBak -Recurse -Force -EA 0 }
            try { Rename-Item -Path $sdPath -NewName "SoftwareDistribution.bak" -Force -EA Stop
                Write-Log "Renamed SoftwareDistribution to .bak" -Level Success; $script:ChangesCount++
            } catch { Write-Log "SoftwareDistribution in use - will reset after reboot" -Level Warning }
        }
        $crPath = "$env:SystemRoot\System32\catroot2"
        $crBak = "$env:SystemRoot\System32\catroot2.bak"
        if (Test-Path $crPath) {
            if (Test-Path $crBak) { Remove-Item -Path $crBak -Recurse -Force -EA 0 }
            try { Rename-Item -Path $crPath -NewName "catroot2.bak" -Force -EA Stop
                Write-Log "Renamed catroot2 to .bak" -Level Success; $script:ChangesCount++
            } catch { Write-Log "catroot2 in use - will reset after reboot" -Level Warning }
        }
        @("CryptSvc","BITS","wuauserv") | ForEach-Object { Start-Service -Name $_ -EA 0 }
    } catch { Write-Log "Component reset partial - reboot recommended" -Level Warning }

    # ---- Re-register WU DLLs ----
    Write-Log "Re-registering Windows Update DLLs..." -Level Info
    @("atl.dll","urlmon.dll","mshtml.dll","shdocvw.dll","browseui.dll","jscript.dll","vbscript.dll",
      "scrrun.dll","msxml.dll","msxml3.dll","msxml6.dll","actxprxy.dll","softpub.dll","wintrust.dll",
      "dssenh.dll","rsaenh.dll","gpkcsp.dll","sccbase.dll","slbcsp.dll","cryptdlg.dll","oleaut32.dll",
      "ole32.dll","shell32.dll","initpki.dll","wuapi.dll","wuaueng.dll","wuaueng1.dll","wucltui.dll",
      "wups.dll","wups2.dll","wuweb.dll","qmgr.dll","qmgrprxy.dll","wucltux.dll","muweb.dll","wuwebv.dll"
    ) | ForEach-Object {
        $dll = "$env:SystemRoot\System32\$_"
        if (Test-Path $dll) { Start-Process -FilePath "regsvr32.exe" -ArgumentList "/s `"$dll`"" -NoNewWindow -Wait -EA 0 }
    }
    Write-Log "WU DLLs re-registered" -Level Success; $script:ChangesCount++

    # ---- Winsock and proxy reset ----
    Start-Process -FilePath "netsh" -ArgumentList "winsock reset" -NoNewWindow -Wait -EA 0
    Start-Process -FilePath "netsh" -ArgumentList "winhttp reset proxy" -NoNewWindow -Wait -EA 0
    Write-Log "Winsock and proxy reset" -Level Success; $script:ChangesCount++

    # ---- Settings visibility ----
    Remove-RegistryValue -Path "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\Explorer" -Name "SettingsPageVisibility" -Silent

    # ---- Zone information / attachments ----
    Remove-RegistryValue -Path "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\Attachments" -Name "SaveZoneInformation" -Silent
    Remove-RegistryValue -Path "HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\Attachments" -Name "SaveZoneInformation" -Silent
    Remove-RegistryValue -Path "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\Attachments" -Name "ScanWithAntiVirus" -Silent

    # ---- Trigger WU scan ----
    try {
        Start-Process -FilePath "UsoClient.exe" -ArgumentList "StartScan" -NoNewWindow -Wait -EA 0
        Write-Log "Windows Update scan triggered" -Level Success
    } catch { Write-Log "Could not trigger WU scan - will happen after reboot" -Level Warning }

    Write-Log "Windows Update: Complete (reboot recommended)" -Level Success
}

function Restore-EdgeSettings {
    Write-Log "=== MICROSOFT EDGE (COMPREHENSIVE) ===" -Level Section

    # Remove all Edge policies (massive list)
    Remove-RegistryKey -Path "HKLM:\SOFTWARE\Policies\Microsoft\Edge" -Silent
    Remove-RegistryKey -Path "HKCU:\SOFTWARE\Policies\Microsoft\Edge" -Silent
    Remove-RegistryKey -Path "HKLM:\SOFTWARE\Policies\Microsoft\EdgeUpdate" -Silent
    Remove-RegistryKey -Path "HKCU:\SOFTWARE\Policies\Microsoft\EdgeUpdate" -Silent

    # Edge (Legacy)
    Remove-RegistryValue -Path "HKCU:\Software\Classes\Local Settings\Software\Microsoft\Windows\CurrentVersion\AppContainer\Storage\microsoft.microsoftedge_8wekyb3d8bbwe\MicrosoftEdge\Main" -Name "DoNotTrack" -Silent
    Remove-RegistryValue -Path "HKCU:\Software\Classes\Local Settings\Software\Microsoft\Windows\CurrentVersion\AppContainer\Storage\microsoft.microsoftedge_8wekyb3d8bbwe\MicrosoftEdge\FlipAhead" -Name "FPEnabled" -Silent
    Remove-RegistryValue -Path "HKCU:\Software\Classes\Local Settings\Software\Microsoft\Windows\CurrentVersion\AppContainer\Storage\microsoft.microsoftedge_8wekyb3d8bbwe\MicrosoftEdge\ServiceUI" -Name "ShowSearchHistory" -Silent

    # Edge update IFEO
    Remove-RegistryKey -Path "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Image File Execution Options\MicrosoftEdgeUpdate.exe" -Silent

    # Edge update services
    @(
        @{N="edgeupdate"; T="Automatic"},
        @{N="edgeupdatem"; T="Manual"},
        @{N="MicrosoftEdgeElevationService"; T="Manual"}
    ) | ForEach-Object { Restore-ServiceStartup -ServiceName $_.N -StartupType $_.T -Silent }

    # Edge update scheduled tasks
    Get-ScheduledTask -TaskName "MicrosoftEdgeUpdate*" -EA 0 | ForEach-Object {
        Enable-ScheduledTask -InputObject $_ -EA 0 | Out-Null; $script:ChangesCount++
    }

    Write-Log "Edge: Complete" -Level Success
}

function Restore-ChromeSettings {
    Write-Log "=== CHROME & GOOGLE ===" -Level Section
    Remove-RegistryKey -Path "HKLM:\SOFTWARE\Policies\Google\Chrome" -Silent
    Remove-RegistryKey -Path "HKCU:\SOFTWARE\Policies\Google\Chrome" -Silent
    Remove-RegistryKey -Path "HKLM:\SOFTWARE\Policies\Google\Update" -Silent
    # Software Reporter Tool IFEO
    Remove-RegistryKey -Path "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Image File Execution Options\software_reporter_tool.exe" -Silent
    # Google update services
    @(
        @{N="gupdate"; T="Automatic"},
        @{N="gupdatem"; T="Manual"},
        @{N="GoogleChromeElevationService"; T="Manual"}
    ) | ForEach-Object { Restore-ServiceStartup -ServiceName $_.N -StartupType $_.T -Silent }
    # Google update tasks
    Get-ScheduledTask -TaskName "GoogleUpdate*" -EA 0 | ForEach-Object {
        Enable-ScheduledTask -InputObject $_ -EA 0 | Out-Null; $script:ChangesCount++
    }
    Write-Log "Chrome & Google: Complete" -Level Success
    # Also restore Firefox
    Restore-FirefoxSettings
}

function Restore-FirefoxSettings {
    Write-Log "=== FIREFOX ===" -Level Section
    Remove-RegistryKey -Path "HKLM:\SOFTWARE\Policies\Mozilla\Firefox" -Silent
    Remove-RegistryKey -Path "HKCU:\SOFTWARE\Policies\Mozilla\Firefox" -Silent
    Write-Log "Firefox: Complete" -Level Success
}

function Restore-OfficeSettings {
    Write-Log "=== MICROSOFT OFFICE ===" -Level Section
    @("15.0","16.0") | ForEach-Object {
        Remove-RegistryValue -Path "HKCU:\Software\Microsoft\Office\$_\Common\General" -Name "ShownFirstRunOptin" -Silent
        Remove-RegistryValue -Path "HKCU:\Software\Microsoft\Office\$_\Common" -Name "QMEnable" -Silent
        Remove-RegistryValue -Path "HKCU:\Software\Microsoft\Office\$_\Common" -Name "UpdateReliabilityData" -Silent
        Remove-RegistryValue -Path "HKCU:\Software\Microsoft\Office\$_\Common\Feedback" -Name "Enabled" -Silent
        Remove-RegistryValue -Path "HKCU:\Software\Microsoft\Office\$_\Common\ClientTelemetry" -Name "DisableTelemetry" -Silent
        Remove-RegistryValue -Path "HKCU:\Software\Microsoft\Office\$_\Outlook\Options\Mail" -Name "EnableLogging" -Silent
        Remove-RegistryValue -Path "HKCU:\Software\Microsoft\Office\$_\Word\Options" -Name "EnableLogging" -Silent
    }
    # Office telemetry agent task
    Get-ScheduledTask -TaskPath "\Microsoft\Office\" -TaskName "OfficeTelemetryAgentFallBack*" -EA 0 | ForEach-Object {
        Enable-ScheduledTask -InputObject $_ -EA 0 | Out-Null
    }
    Get-ScheduledTask -TaskPath "\Microsoft\Office\" -TaskName "OfficeTelemetryAgentLogOn*" -EA 0 | ForEach-Object {
        Enable-ScheduledTask -InputObject $_ -EA 0 | Out-Null
    }
    # Subscription heartbeat
    Get-ScheduledTask -TaskPath "\Microsoft\Office\" -TaskName "Office*" -EA 0 | ForEach-Object {
        Enable-ScheduledTask -InputObject $_ -EA 0 | Out-Null
    }
    Write-Log "Office: Complete" -Level Success
}

function Restore-NetworkSettings {
    Write-Log "=== NETWORK CONNECTIVITY ===" -Level Section

    # ---- NCSI (Network Connectivity Status Indicator) ----
    Remove-RegistryKey -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\NetworkConnectivityStatusIndicator" -Silent
    Remove-RegistryValue -Path "HKLM:\SYSTEM\CurrentControlSet\Services\NlaSvc\Parameters\Internet" -Name "EnableActiveProbing" -Silent

    # ---- Restore NCSI EXE if renamed ----
    $ncsiPath = "$env:SystemRoot\System32\NCSI.dll"
    if ((Test-Path "$ncsiPath.OLD") -and !(Test-Path $ncsiPath)) {
        try { Rename-Item "$ncsiPath.OLD" -NewName "NCSI.dll" -Force -EA Stop } catch { }
    }

    # ---- NLA and network services ----
    @(
        @{N="NlaSvc"; T="Automatic"},
        @{N="netprofm"; T="Manual"},
        @{N="Dnscache"; T="Automatic"},
        @{N="WinHttpAutoProxySvc"; T="Manual"},
        @{N="LanmanServer"; T="Automatic"},
        @{N="LanmanWorkstation"; T="Automatic"},
        @{N="lmhosts"; T="Manual"},
        @{N="iphlpsvc"; T="Automatic"},
        @{N="SSDPSRV"; T="Manual"},
        @{N="upnphost"; T="Manual"},
        @{N="Dhcp"; T="Automatic"},
        @{N="WlanSvc"; T="Automatic"}
    ) | ForEach-Object { Restore-ServiceStartup -ServiceName $_.N -StartupType $_.T -Silent }

    # ---- Admin shares ----
    Remove-RegistryValue -Path "HKLM:\SYSTEM\CurrentControlSet\Services\LanManServer\Parameters" -Name "AutoShareServer" -Silent
    Remove-RegistryValue -Path "HKLM:\SYSTEM\CurrentControlSet\Services\LanManServer\Parameters" -Name "AutoShareWks" -Silent

    Write-Log "Network Connectivity: Complete" -Level Success
}

function Restore-HostsFile {
    Write-Log "=== HOSTS FILE CLEANUP ===" -Level Section

    $hostsPath = "$env:SystemRoot\System32\drivers\etc\hosts"
    if (!(Test-Path $hostsPath)) { Write-Log "Hosts file not found" -Level Warning; return }

    try {
        $content = [System.IO.File]::ReadAllText($hostsPath, [System.Text.Encoding]::UTF8)
        $originalLen = $content.Length

        # Remove all privacy.sexy managed entries
        $content = $content -replace "(?m)^0\.0\.0\.0\t[^\r\n]+# managed by privacy\.sexy\r?\n?", ""
        $content = $content -replace "(?m)^::1\t[^\r\n]+# managed by privacy\.sexy\r?\n?", ""

        # Also remove common debloat script host blocks (0.0.0.0 entries for MS telemetry)
        $knownBlockedDomains = @(
            "vortex-win.data.microsoft.com","v10.events.data.microsoft.com",
            "v10c.events.data.microsoft.com","v10.vortex-win.data.microsoft.com",
            "watson.telemetry.microsoft.com","settings-win.data.microsoft.com",
            "settings.data.microsoft.com","telecommand.telemetry.microsoft.com",
            "self.events.data.microsoft.com","umwatson.events.data.microsoft.com",
            "functional.events.data.microsoft.com","oca.telemetry.microsoft.com",
            "eu-v10c.events.data.microsoft.com","us-v10c.events.data.microsoft.com"
        )
        foreach ($domain in $knownBlockedDomains) {
            $content = $content -replace "(?m)^0\.0\.0\.0\s+$([regex]::Escape($domain))\s*.*\r?\n?", ""
            $content = $content -replace "(?m)^::1\s+$([regex]::Escape($domain))\s*.*\r?\n?", ""
            $content = $content -replace "(?m)^127\.0\.0\.1\s+$([regex]::Escape($domain))\s*.*\r?\n?", ""
        }

        # Clean up excessive blank lines
        $content = $content -replace "(\r?\n){3,}", "`r`n`r`n"

        if ($content.Length -ne $originalLen) {
            [System.IO.File]::WriteAllText($hostsPath, $content, [System.Text.Encoding]::UTF8)
            Write-Log "Removed blocked host entries from hosts file" -Level Success
            $script:ChangesCount++
        } else {
            Write-Log "No blocked entries found in hosts file" -Level Info
        }
    } catch {
        Write-Log "Could not modify hosts file: $($_.Exception.Message)" -Level Warning
    }

    # ---- Flush DNS cache ----
    try {
        Start-Process -FilePath "ipconfig" -ArgumentList "/flushdns" -NoNewWindow -Wait -EA 0
        Write-Log "DNS cache flushed" -Level Success
    } catch { }

    Write-Log "Hosts File Cleanup: Complete" -Level Success
}

function Restore-GamingSettings {
    Write-Log "=== GAMING & XBOX ===" -Level Section
    Remove-RegistryKey -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\GameDVR" -Silent
    Remove-RegistryValue -Path "HKCU:\System\GameConfigStore" -Name "GameDVR_Enabled" -Silent
    Remove-RegistryValue -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\GameDVR" -Name "AppCaptureEnabled" -Silent
    @(
        @{N="XblAuthManager"; T="Manual"},
        @{N="XblGameSave"; T="Manual"},
        @{N="XboxGipSvc"; T="Manual"},
        @{N="XboxNetApiSvc"; T="Manual"},
        @{N="GamingServices"; T="Manual"},
        @{N="GamingServicesNet"; T="Manual"}
    ) | ForEach-Object { Restore-ServiceStartup -ServiceName $_.N -StartupType $_.T -Silent }
    Write-Log "Gaming & Xbox: Complete" -Level Success
}

function Restore-BiometricsSettings {
    Write-Log "=== BIOMETRICS ===" -Level Section
    Remove-RegistryKey -Path "HKLM:\SOFTWARE\Policies\Microsoft\Biometrics" -Silent
    Remove-RegistryKey -Path "HKLM:\SOFTWARE\Policies\Microsoft\Biometrics\Credential Provider" -Silent
    Restore-ServiceStartup -ServiceName "WbioSrvc" -StartupType "Manual" -Silent
    Write-Log "Biometrics: Complete" -Level Success
}

function Restore-ClipboardSettings {
    Write-Log "=== CLIPBOARD ===" -Level Section
    Remove-RegistryValue -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\System" -Name "AllowClipboardHistory" -Silent
    Remove-RegistryValue -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\System" -Name "AllowCrossDeviceClipboard" -Silent
    # Clipboard service
    @("cbdhsvc","cbdhsvc_*") | ForEach-Object {
        $svc = Get-Service -Name $_ -EA 0
        if ($svc) { Restore-ServiceStartup -ServiceName $svc.Name -StartupType "Automatic" -Silent }
    }
    Write-Log "Clipboard: Complete" -Level Success
}

function Restore-ErrorReporting {
    Write-Log "=== ERROR REPORTING ===" -Level Section
    Remove-RegistryKey -Path "HKLM:\Software\Policies\Microsoft\Windows\Windows Error Reporting" -Silent
    Remove-RegistryValue -Path "HKLM:\Software\Microsoft\Windows\Windows Error Reporting" -Name "Disabled" -Silent
    Remove-RegistryValue -Path "HKLM:\Software\Microsoft\Windows\Windows Error Reporting\Consent" -Name "DefaultConsent" -Silent
    Remove-RegistryValue -Path "HKLM:\Software\Microsoft\Windows\Windows Error Reporting\Consent" -Name "DefaultOverrideBehavior" -Silent
    Remove-RegistryValue -Path "HKLM:\SOFTWARE\Microsoft\Windows\Windows Error Reporting" -Name "DontSendAdditionalData" -Silent
    Remove-RegistryValue -Path "HKLM:\SOFTWARE\Microsoft\Windows\Windows Error Reporting" -Name "LoggingDisabled" -Silent
    Restore-ServiceStartup -ServiceName "wersvc" -StartupType "Manual" -Silent
    Restore-ServiceStartup -ServiceName "wercplsupport" -StartupType "Manual" -Silent
    Write-Log "Error Reporting: Complete" -Level Success
}

function Restore-SecurityProtocols {
    Write-Log "=== SECURITY PROTOCOLS ===" -Level Section
    Write-Log "Note: Security protocol changes are left as-is (hardening) unless explicitly requested" -Level Info
    # These are SECURITY HARDENING changes - we restore the registry keys but don't weaken security
    # Only restore things that might break functionality

    # ---- LSA protections (restore defaults, not weaken) ----
    Remove-RegistryValue -Path "HKLM:\SYSTEM\CurrentControlSet\Control\LSA" -Name "RestrictAnonymousSAM" -Silent
    Remove-RegistryValue -Path "HKLM:\SYSTEM\CurrentControlSet\Control\LSA" -Name "RestrictAnonymous" -Silent
    Remove-RegistryValue -Path "HKLM:\SYSTEM\CurrentControlSet\Control\LSA" -Name "NoLMHash" -Silent
    Remove-RegistryValue -Path "HKLM:\SYSTEM\CurrentControlSet\Control\LSA" -Name "LmCompatibilityLevel" -Silent

    # ---- Admin shares (restore) ----
    Remove-RegistryValue -Path "HKLM:\SYSTEM\CurrentControlSet\Services\LanManServer\Parameters" -Name "RestrictNullSessAccess" -Silent
    Remove-RegistryValue -Path "HKLM:\SYSTEM\CurrentControlSet\Services\LanManServer\Parameters" -Name "AutoShareServer" -Silent
    Remove-RegistryValue -Path "HKLM:\SYSTEM\CurrentControlSet\Services\LanManServer\Parameters" -Name "AutoShareWks" -Silent

    # ---- Remote Assistance ----
    Remove-RegistryValue -Path "HKLM:\SYSTEM\CurrentControlSet\Control\Remote Assistance" -Name "fAllowToGetHelp" -Silent

    # ---- Windows Connect Now ----
    Remove-RegistryKey -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\WCN\Registrars" -Silent

    # ---- SMBv1 driver (restore if disabled) ----
    Restore-ServiceStartup -ServiceName "mrxsmb10" -StartupType "Manual" -Silent

    Write-Log "Security Protocols: Complete" -Level Success
}

function Restore-RemoteDesktopSettings {
    Write-Log "=== REMOTE DESKTOP ===" -Level Section
    Remove-RegistryValue -Path "HKLM:\SYSTEM\CurrentControlSet\Control\Terminal Server" -Name "fDenyTSConnections" -Silent
    @(
        @{N="TermService"; T="Manual"},
        @{N="UmRdpService"; T="Manual"},
        @{N="SessionEnv"; T="Manual"}
    ) | ForEach-Object { Restore-ServiceStartup -ServiceName $_.N -StartupType $_.T -Silent }
    Write-Log "Remote Desktop: Complete" -Level Success
}

function Restore-AccessibilitySettings {
    Write-Log "=== ACCESSIBILITY ===" -Level Section
    Remove-RegistryValue -Path "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\System" -Name "DisableCAD" -Silent
    Restore-ServiceStartup -ServiceName "TabletInputService" -StartupType "Manual" -Silent
    Write-Log "Accessibility: Complete" -Level Success
}

function Restore-InputSettings {
    Write-Log "=== INPUT ===" -Level Section
    Remove-RegistryValue -Path "HKCU:\SOFTWARE\Microsoft\InputPersonalization\TrainedDataStore" -Name "HarvestContacts" -Silent
    Remove-RegistryValue -Path "HKCU:\SOFTWARE\Microsoft\Personalization\Settings" -Name "AcceptedPrivacyPolicy" -Silent
    Remove-RegistryKey -Path "HKLM:\SOFTWARE\Policies\Microsoft\InputPersonalization" -Silent
    Write-Log "Input: Complete" -Level Success
}

function Restore-PowerSettings {
    Write-Log "=== POWER & HIBERNATION ===" -Level Section
    # Restore hibernation if it was disabled
    try {
        Start-Process -FilePath "powercfg" -ArgumentList "/hibernate on" -NoNewWindow -Wait -EA 0
        Write-Log "Hibernation re-enabled" -Level Success
        $script:ChangesCount++
    } catch { Write-Log "Could not re-enable hibernation" -Level Warning }
    Remove-RegistryValue -Path "HKLM:\SYSTEM\CurrentControlSet\Control\Power" -Name "HibernateEnabled" -Silent
    Write-Log "Power: Complete" -Level Success
}

function Restore-MemoryPerformance {
    Write-Log "=== MEMORY & PERFORMANCE ===" -Level Section
    Remove-RegistryValue -Path "HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\Memory Management" -Name "ClearPageFileAtShutdown" -Silent
    Remove-RegistryValue -Path "HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\Memory Management\PrefetchParameters" -Name "EnablePrefetcher" -Silent
    Remove-RegistryValue -Path "HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\Memory Management\PrefetchParameters" -Name "EnableSuperfetch" -Silent
    # SideBySide configuration
    Remove-RegistryValue -Path "HKLM:\Software\Microsoft\Windows\CurrentVersion\SideBySide\Configuration" -Name "DisableResetbase" -Silent
    Write-Log "Memory & Performance: Complete" -Level Success
}

function Restore-StorageSettings {
    Write-Log "=== STORAGE ===" -Level Section
    Remove-RegistryValue -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\StorageSense" -Name "AllowStorageSenseGlobal" -Silent
    Remove-RegistryValue -Path "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\ReserveManager" -Name "ShippedWithReserves" -Silent
    Write-Log "Storage: Complete" -Level Success
}

function Restore-PrintingSettings {
    Write-Log "=== PRINTING ===" -Level Section
    Restore-ServiceStartup -ServiceName "Spooler" -StartupType "Automatic" -Silent
    Restore-ServiceStartup -ServiceName "PrintNotify" -StartupType "Manual" -Silent
    Write-Log "Printing: Complete" -Level Success
}

function Restore-UACSettings {
    Write-Log "=== UAC & SECURITY POLICIES ===" -Level Section
    Remove-RegistryValue -Path "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\System" -Name "EnableLUA" -Silent
    Remove-RegistryValue -Path "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\System" -Name "ConsentPromptBehaviorAdmin" -Silent
    Remove-RegistryValue -Path "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\System" -Name "ConsentPromptBehaviorUser" -Silent
    Remove-RegistryValue -Path "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\System" -Name "PromptOnSecureDesktop" -Silent
    Remove-RegistryValue -Path "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\System" -Name "EnableInstallerDetection" -Silent
    Remove-RegistryValue -Path "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\System" -Name "EnableSecureUIAPaths" -Silent
    Remove-RegistryValue -Path "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\System" -Name "FilterAdministratorToken" -Silent
    Remove-RegistryValue -Path "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\System" -Name "EnableVirtualization" -Silent
    # Windows Installer elevated privileges
    Remove-RegistryValue -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\Installer" -Name "AlwaysInstallElevated" -Silent
    Remove-RegistryValue -Path "HKCU:\SOFTWARE\Policies\Microsoft\Windows\Installer" -Name "AlwaysInstallElevated" -Silent
    # CMD disable
    Remove-RegistryValue -Path "HKCU:\SOFTWARE\Policies\Microsoft\Windows\System" -Name "DisableCMD" -Silent
    # Lock screen
    Remove-RegistryValue -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\Personalization" -Name "NoLockScreen" -Silent
    Remove-RegistryValue -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\Personalization" -Name "NoLockScreenCamera" -Silent
    Write-Log "UAC: Complete" -Level Success
}

function Restore-OneDriveSettings {
    Write-Log "=== ONEDRIVE ===" -Level Section
    Remove-RegistryKey -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\OneDrive" -Silent
    Set-RegistryValue -Path "HKCU:\SOFTWARE\Classes\CLSID\{018D5C66-4533-4307-9B53-224DE2ED1FE6}" -Name "System.IsPinnedToNameSpaceTree" -Value 1 -Silent
    Set-RegistryValue -Path "HKCU:\SOFTWARE\Classes\Wow6432Node\CLSID\{018D5C66-4533-4307-9B53-224DE2ED1FE6}" -Name "System.IsPinnedToNameSpaceTree" -Value 1 -Silent
    Remove-RegistryValue -Path "HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\StartupApproved\Run" -Name "OneDrive" -Silent
    Set-RegistryValue -Path "HKCU:\Environment" -Name "OneDrive" -Value "%USERPROFILE%\OneDrive" -Type "ExpandString" -Silent
    Get-ScheduledTask -TaskPath "\" -TaskName "OneDrive*" -EA 0 | ForEach-Object {
        Enable-ScheduledTask -InputObject $_ -EA 0 | Out-Null; $script:ChangesCount++
    }
    Write-Log "OneDrive: Complete" -Level Success
}

function Restore-SyncSettings {
    Write-Log "=== SYNC ===" -Level Section
    Remove-RegistryKey -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\SettingSync" -Silent
    # Individual sync group overrides
    @("Credentials","Language") | ForEach-Object {
        Remove-RegistryValue -Path "HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\SettingSync\Groups\$_" -Name "Enabled" -Silent
    }
    # Sync services
    @("OneSyncSvc","OneSyncSvc_*") | ForEach-Object {
        $svc = Get-Service -Name $_ -EA 0
        if ($svc) { Restore-ServiceStartup -ServiceName $svc.Name -StartupType "Automatic" -Silent }
    }
    Write-Log "Sync: Complete" -Level Success
}

function Restore-WindowsInsiderSettings {
    Write-Log "=== INSIDER ===" -Level Section
    Remove-RegistryKey -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\PreviewBuilds" -Silent
    Remove-RegistryValue -Path "HKLM:\SOFTWARE\Microsoft\WindowsSelfHost\UI\Visibility" -Name "HideInsiderPage" -Silent
    Restore-ServiceStartup -ServiceName "wisvc" -StartupType "Manual" -Silent
    Write-Log "Insider: Complete" -Level Success
}

function Restore-ContextMenus {
    Write-Log "=== CONTEXT MENUS ===" -Level Section
    Remove-RegistryKey -Path "HKCU:\SOFTWARE\Classes\CLSID\{86ca1aa0-34aa-4e8b-a509-50c905bae2a2}" -Silent
    Remove-RegistryValue -Path "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Shell Extensions\Blocked" -Name "{7AD84985-87B4-4a16-BE58-8B72A5B390F7}" -Silent
    Remove-RegistryValue -Path "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Shell Extensions\Blocked" -Name "{1d27f844-3a1f-4410-85ac-14651078412d}" -Silent
    Write-Log "Context Menus: Complete" -Level Success
}

function Restore-NvidiaTelemetry {
    Write-Log "=== NVIDIA TELEMETRY ===" -Level Section
    # Nvidia telemetry tasks
    @("NvTmMon_{B2FE1952-0186-46C3-BAEC-A80AA35AC5B8}",
      "NvTmRep_{B2FE1952-0186-46C3-BAEC-A80AA35AC5B8}",
      "NvTmRepOnLogon_{B2FE1952-0186-46C3-BAEC-A80AA35AC5B8}"
    ) | ForEach-Object {
        Enable-ScheduledTaskSafe -TaskPath "\" -TaskName $_ -Silent
    }
    Restore-ServiceStartup -ServiceName "NvTelemetryContainer" -StartupType "Automatic" -Silent
    # Nvidia driver telemetry registry
    Remove-RegistryValue -Path "HKLM:\SYSTEM\CurrentControlSet\Services\nvlddmkm\Global\Startup" -Name "SendTelemetryData" -Silent
    Remove-RegistryValue -Path "HKLM:\Software\Nvidia Corporation\NvControlPanel2\Client" -Name "OptInOrOutPreference" -Silent
    Write-Log "Nvidia: Complete" -Level Success
}

function Restore-ThirdPartyServices {
    Write-Log "=== THIRD-PARTY SERVICES ===" -Level Section
    @(
        @{N="AdobeARMservice"; T="Automatic"; Opt=$true},
        @{N="adobeupdateservice"; T="Automatic"; Opt=$true},
        @{N="dbupdate"; T="Automatic"; Opt=$true},
        @{N="dbupdatem"; T="Automatic"; Opt=$true},
        @{N="WMPNetworkSvc"; T="Manual"; Opt=$false},
        @{N="Razer Game Scanner Service"; T="Manual"; Opt=$true},
        @{N="LogiRegistryService"; T="Automatic"; Opt=$true},
        @{N="VSStandardCollectorService150"; T="Manual"; Opt=$true}
    ) | ForEach-Object {
        $svc = Get-Service -Name $_.N -EA 0
        if ($svc -or !$_.Opt) { Restore-ServiceStartup -ServiceName $_.N -StartupType $_.T -Silent }
    }
    # Adobe update task
    Get-ScheduledTask -TaskName "Adobe Acrobat Update Task" -EA 0 | ForEach-Object {
        Enable-ScheduledTask -InputObject $_ -EA 0 | Out-Null
    }
    # Dropbox tasks
    Get-ScheduledTask -TaskName "DropboxUpdate*" -EA 0 | ForEach-Object {
        Enable-ScheduledTask -InputObject $_ -EA 0 | Out-Null
    }
    # CCleaner
    Remove-RegistryValue -Path "HKCU:\Software\Piriform\CCleaner" -Name "Monitoring" -Silent
    Remove-RegistryValue -Path "HKCU:\Software\Piriform\CCleaner" -Name "HelpImproveCCleaner" -Silent
    Remove-RegistryValue -Path "HKCU:\Software\Piriform\CCleaner" -Name "SystemMonitoring" -Silent
    Write-Log "Third-Party Services: Complete" -Level Success
}

function Restore-MiscPolicies {
    Write-Log "=== MISC POLICIES & SETTINGS ===" -Level Section

    # ---- Snipping Tool ----
    Remove-RegistryValue -Path "HKLM:\SOFTWARE\Policies\Microsoft\TabletPC" -Name "DisableSnippingTool" -Silent
    Remove-RegistryValue -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced" -Name "DisabledHotkeys" -Silent
    Remove-RegistryValue -Path "HKCU:\Control Panel\Keyboard" -Name "PrintScreenKeyForSnippingEnabled" -Silent

    # ---- Copilot auto-launch ----
    Remove-RegistryValue -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced" -Name "ShowCopilotButton" -Silent

    # ---- Retail Demo ----
    Restore-ServiceStartup -ServiceName "RetailDemo" -StartupType "Manual" -Silent

    # ---- Microsoft Account Sign-in Assistant ----
    Restore-ServiceStartup -ServiceName "wlidsvc" -StartupType "Manual" -Silent

    # ---- Downloaded Maps Manager ----
    Restore-ServiceStartup -ServiceName "MapsBroker" -StartupType "Automatic" -Silent

    # ---- User Data services ----
    @("UserDataSvc","UserDataSvc_*","UnistoreSvc","UnistoreSvc_*") | ForEach-Object {
        $svc = Get-Service -Name $_ -EA 0
        if ($svc) { Restore-ServiceStartup -ServiceName $svc.Name -StartupType "Manual" -Silent }
    }

    # ---- Messaging Service ----
    @("MessagingService","MessagingService_*") | ForEach-Object {
        $svc = Get-Service -Name $_ -EA 0
        if ($svc) { Restore-ServiceStartup -ServiceName $svc.Name -StartupType "Manual" -Silent }
    }

    # ---- Push Notifications ----
    @(
        @{N="WpnService"; T="Automatic"},
        @{N="WpnUserService"; T="Automatic"}
    ) | ForEach-Object {
        $svc = Get-Service -Name $_.N -EA 0
        if ($svc) { Restore-ServiceStartup -ServiceName $_.N -StartupType $_.T -Silent }
        # Also wildcard versions
        $wc = Get-Service -Name "$($_.N)_*" -EA 0
        if ($wc) { Restore-ServiceStartup -ServiceName $wc.Name -StartupType $_.T -Silent }
    }

    # ---- Shadow Copy (Volume Snapshot) ----
    Restore-ServiceStartup -ServiceName "VSS" -StartupType "Manual" -Silent

    # ---- Location Service ----
    Restore-ServiceStartup -ServiceName "lfsvc" -StartupType "Manual" -Silent

    # ---- DEP (Data Execution Prevention) - restore default ----
    try {
        Start-Process -FilePath "bcdedit" -ArgumentList "/set {current} nx OptIn" -NoNewWindow -Wait -EA 0
        Write-Log "DEP restored to OptIn" -Level Success
    } catch { }

    # ---- AutoPlay/AutoRun ----
    Remove-RegistryValue -Path "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\Explorer" -Name "NoDriveTypeAutoRun" -Silent
    Remove-RegistryValue -Path "HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\AutoplayHandlers" -Name "DisableAutoplay" -Silent

    # ---- Steps Recorder (restore if renamed) ----
    $psrPath = "$env:SystemRoot\System32\psr.exe"
    if ((Test-Path "$psrPath.OLD") -and !(Test-Path $psrPath)) {
        try { Rename-Item "$psrPath.OLD" -NewName "psr.exe" -Force -EA Stop } catch { }
    }

    Write-Log "Misc Policies: Complete" -Level Success
    # Also restore clipboard settings
    Restore-ClipboardSettings
}

function Restore-Services {
    Write-Log "=== CORE WINDOWS SERVICES ===" -Level Section
    $servicesToRestore = @{
        'wscsvc'='Automatic';'MpsSvc'='Automatic';'BFE'='Automatic'
        'TrkWks'='Automatic';'iphlpsvc'='Automatic';'lmhosts'='Manual';'NlaSvc'='Automatic'
        'Dnscache'='Automatic';'WinHttpAutoProxySvc'='Manual';'LanmanServer'='Automatic'
        'LanmanWorkstation'='Automatic';'SSDPSRV'='Manual';'upnphost'='Manual';'netprofm'='Manual'
        'bthserv'='Manual';'BTAGService'='Manual';'BthAvctpSvc'='Manual'
        'TermService'='Manual';'UmRdpService'='Manual';'SessionEnv'='Manual';'RemoteRegistry'='Disabled'
        'Audiosrv'='Automatic';'AudioEndpointBuilder'='Automatic'
        'Spooler'='Automatic';'PrintNotify'='Manual'
        'PhoneSvc'='Manual';'TapiSrv'='Manual';'SmsRouter'='Manual'
        'XblAuthManager'='Manual';'XblGameSave'='Manual';'XboxGipSvc'='Manual';'XboxNetApiSvc'='Manual'
        'GamingServices'='Manual';'GamingServicesNet'='Manual'
        'wlidsvc'='Manual';'MapsBroker'='Automatic';'lfsvc'='Manual';'VSS'='Manual'
        'WalletService'='Manual';'WpcMonSvc'='Manual';'WbioSrvc'='Manual'
        'TabletInputService'='Manual';'Fax'='Manual';'WMPNetworkSvc'='Manual';'icssvc'='Manual'
        'wisvc'='Manual';'CDPSvc'='Automatic';'ShellHWDetection'='Automatic'
        'Themes'='Automatic';'FontCache'='Automatic';'EventLog'='Automatic';'Schedule'='Automatic'
        'Power'='Automatic';'ProfSvc'='Automatic';'gpsvc'='Automatic';'Winmgmt'='Automatic'
        'CryptSvc'='Automatic';'Dhcp'='Automatic';'RpcSs'='Automatic';'SamSs'='Automatic'
        'WpnService'='Automatic';'W32Time'='Manual';'WlanSvc'='Automatic';'RetailDemo'='Manual'
    }
    $counter = 0
    foreach ($svc in $servicesToRestore.GetEnumerator()) {
        $counter++; Restore-ServiceStartup -ServiceName $svc.Key -StartupType $svc.Value -Silent
    }
    Write-Log "Services: $counter processed" -Level Success
    # Also restore third-party services
    Restore-ThirdPartyServices
}

function Restore-ScheduledTasks {
    Write-Log "=== SCHEDULED TASKS ===" -Level Section
    $tasksToEnable = @(
        @{P="\Microsoft\Windows\Application Experience\"; N="Microsoft Compatibility Appraiser"},
        @{P="\Microsoft\Windows\Application Experience\"; N="ProgramDataUpdater"},
        @{P="\Microsoft\Windows\Application Experience\"; N="StartupAppTask"},
        @{P="\Microsoft\Windows\Application Experience\"; N="PcaPatchDbTask"},
        @{P="\Microsoft\Windows\Autochk\"; N="Proxy"},
        @{P="\Microsoft\Windows\Customer Experience Improvement Program\"; N="Consolidator"},
        @{P="\Microsoft\Windows\Customer Experience Improvement Program\"; N="UsbCeip"},
        @{P="\Microsoft\Windows\Customer Experience Improvement Program\"; N="KernelCeipTask"},
        @{P="\Microsoft\Windows\Defrag\"; N="ScheduledDefrag"},
        @{P="\Microsoft\Windows\Device Information\"; N="Device"},
        @{P="\Microsoft\Windows\Device Information\"; N="Device User"},
        @{P="\Microsoft\Windows\DiskDiagnostic\"; N="Microsoft-Windows-DiskDiagnosticDataCollector"},
        @{P="\Microsoft\Windows\DiskFootprint\"; N="Diagnostics"},
        @{P="\Microsoft\Windows\DiskFootprint\"; N="StorageSense"},
        @{P="\Microsoft\Windows\Feedback\Siuf\"; N="DmClient"},
        @{P="\Microsoft\Windows\Feedback\Siuf\"; N="DmClientOnScenarioDownload"},
        @{P="\Microsoft\Windows\Maps\"; N="MapsToastTask"},
        @{P="\Microsoft\Windows\Maps\"; N="MapsUpdateTask"},
        @{P="\Microsoft\Windows\PI\"; N="Sqm-Tasks"},
        @{P="\Microsoft\Windows\Power Efficiency Diagnostics\"; N="AnalyzeSystem"},
        @{P="\Microsoft\Windows\RemoteAssistance\"; N="RemoteAssistanceTask"},
        @{P="\Microsoft\Windows\Servicing\"; N="StartComponentCleanup"},
        @{P="\Microsoft\Windows\SettingSync\"; N="NetworkStateChangeTask"},
        @{P="\Microsoft\Windows\SettingSync\"; N="BackgroundUploadTask"},
        @{P="\Microsoft\Windows\SettingSync\"; N="BackupTask"},
        @{P="\Microsoft\Windows\Windows Defender\"; N="Windows Defender Cache Maintenance"},
        @{P="\Microsoft\Windows\Windows Defender\"; N="Windows Defender Cleanup"},
        @{P="\Microsoft\Windows\Windows Defender\"; N="Windows Defender Scheduled Scan"},
        @{P="\Microsoft\Windows\Windows Defender\"; N="Windows Defender Verification"},
        @{P="\Microsoft\Windows\Windows Defender\"; N="Windows Defender ExploitGuard MDM Refresh"},
        @{P="\Microsoft\Windows\WindowsUpdate\"; N="Scheduled Start"},
        @{P="\Microsoft\Windows\WindowsUpdate\"; N="sih"},
        @{P="\Microsoft\Windows\WindowsUpdate\"; N="sihboot"},
        @{P="\Microsoft\Windows\UpdateOrchestrator\"; N="Schedule Scan"},
        @{P="\Microsoft\Windows\UpdateOrchestrator\"; N="Schedule Scan Static Task"},
        @{P="\Microsoft\Windows\UpdateOrchestrator\"; N="USO_UxBroker"},
        @{P="\Microsoft\Windows\UpdateOrchestrator\"; N="Report policies"},
        @{P="\Microsoft\Windows\UpdateOrchestrator\"; N="Schedule Maintenance Work"},
        @{P="\Microsoft\Windows\UpdateOrchestrator\"; N="Schedule Work"},
        @{P="\Microsoft\Windows\UpdateOrchestrator\"; N="Schedule Wake To Work"},
        @{P="\Microsoft\Windows\UpdateOrchestrator\"; N="UpdateModelTask"},
        @{P="\Microsoft\Windows\UpdateOrchestrator\"; N="Refresh Settings"},
        @{P="\Microsoft\Windows\UpdateOrchestrator\"; N="Reboot"},
        @{P="\Microsoft\Windows\UpdateOrchestrator\"; N="Reboot_AC"},
        @{P="\Microsoft\Windows\UpdateOrchestrator\"; N="Reboot_Battery"},
        @{P="\Microsoft\Windows\UpdateOrchestrator\"; N="RestoreDevice"},
        @{P="\Microsoft\Windows\UpdateOrchestrator\"; N="ScanForUpdates"},
        @{P="\Microsoft\Windows\UpdateOrchestrator\"; N="ScanForUpdatesAsUser"},
        @{P="\Microsoft\Windows\UpdateOrchestrator\"; N="SmartRetry"},
        @{P="\Microsoft\Windows\UpdateOrchestrator\"; N="WakeUpAndContinueUpdates"},
        @{P="\Microsoft\Windows\UpdateOrchestrator\"; N="WakeUpAndScanForUpdates"},
        @{P="\Microsoft\Windows\UpdateOrchestrator\"; N="Start Oobe Expedite Work"},
        @{P="\Microsoft\Windows\UpdateOrchestrator\"; N="StartOobeAppsScan_LicenseAccepted"},
        @{P="\Microsoft\Windows\UpdateOrchestrator\"; N="StartOobeAppsScan_OobeAppReady"},
        @{P="\Microsoft\Windows\UpdateOrchestrator\"; N="StartOobeAppsScanAfterUpdate"},
        @{P="\Microsoft\Windows\UpdateOrchestrator\"; N="UUS Failover Task"},
        @{P="\Microsoft\Windows\WaaSMedic\"; N="PerformRemediation"},
        @{P="\Microsoft\Windows\Maintenance\"; N="WinSAT"},
        @{P="\Microsoft\Windows\NetTrace\"; N="GatherNetworkInfo"},
        @{P="\Microsoft\Windows\Diagnosis\"; N="Scheduled"},
        @{P="\Microsoft\Windows\Diagnosis\"; N="RecommendedTroubleshootingScanner"},
        @{P="\Microsoft\Windows\Clip\"; N="License Validation"},
        @{P="\Microsoft\Windows\File Classification Infrastructure\"; N="Property Definition Sync"},
        @{P="\Microsoft\Windows\Management\Provisioning\"; N="Logon"},
        @{P="\Microsoft\Windows\CloudExperienceHost\"; N="CreateObjectTask"},
        @{P="\Microsoft\Windows\Windows Error Reporting\"; N="QueueReporting"}
    ) | ForEach-Object { Enable-ScheduledTaskSafe -TaskPath $_.P -TaskName $_.N -Silent }

    Write-Log "Scheduled Tasks: Complete" -Level Success
}

function Restore-CryptoProtocols {
    Write-Log "=== CRYPTO PROTOCOLS & SCHANNEL ===" -Level Section

    # ---- SCHANNEL Protocol Defaults (remove all explicit Enabled/DisabledByDefault overrides) ----
    # Restoring to Windows defaults means removing explicit registry entries
    # Windows will use its built-in defaults (TLS 1.2/1.3 enabled, SSL 2.0/3.0/TLS 1.0/1.1 disabled)
    Write-Log "Restoring SCHANNEL protocol settings to Windows defaults..." -Level Info
    $schBase = "HKLM:\SYSTEM\CurrentControlSet\Control\SecurityProviders\SCHANNEL"

    # Protocols - remove all explicit overrides (let Windows manage defaults)
    @("SSL 2.0","SSL 3.0","TLS 1.0","TLS 1.1","TLS 1.2","TLS 1.3","DTLS 1.0","DTLS 1.2") | ForEach-Object {
        $proto = $_
        @("Client","Server") | ForEach-Object {
            $path = "$schBase\Protocols\$proto\$_"
            Remove-RegistryValue -Path $path -Name "Enabled" -Silent
            Remove-RegistryValue -Path $path -Name "DisabledByDefault" -Silent
        }
    }
    $script:ChangesCount++

    # ---- Ciphers (remove explicit disable overrides, let Windows manage) ----
    Write-Log "Restoring cipher settings..." -Level Info
    @(
        "DES 56/56","NULL","RC2 128/128","RC2 40/128","RC2 56/128",
        "RC4 128/128","RC4 40/128","RC4 56/128","RC4 64/128",
        "Triple DES 168","Triple DES 168/168"
    ) | ForEach-Object {
        $cipherPath = "$schBase\Ciphers\$_"
        Remove-RegistryValue -Path $cipherPath -Name "Enabled" -Silent
        if (Test-Path $cipherPath) {
            $props = (Get-Item $cipherPath -EA 0).Property
            if (!$props -or $props.Count -eq 0) { Remove-Item -Path $cipherPath -Force -EA 0 }
        }
    }

    # ---- Hashes ----
    Write-Log "Restoring hash algorithm settings..." -Level Info
    @("MD5","SHA") | ForEach-Object {
        $hashPath = "$schBase\Hashes\$_"
        Remove-RegistryValue -Path $hashPath -Name "Enabled" -Silent
        if (Test-Path $hashPath) {
            $props = (Get-Item $hashPath -EA 0).Property
            if (!$props -or $props.Count -eq 0) { Remove-Item -Path $hashPath -Force -EA 0 }
        }
    }

    # ---- Key Exchange Algorithms (remove minimum key length overrides) ----
    Write-Log "Restoring key exchange settings..." -Level Info
    @("Diffie-Hellman","PKCS") | ForEach-Object {
        $kePath = "$schBase\KeyExchangeAlgorithms\$_"
        Remove-RegistryValue -Path $kePath -Name "ClientMinKeyBitLength" -Silent
        Remove-RegistryValue -Path $kePath -Name "ServerMinKeyBitLength" -Silent
    }

    # ---- SCHANNEL base settings ----
    Remove-RegistryValue -Path $schBase -Name "AllowInsecureRenegoClients" -Silent
    Remove-RegistryValue -Path $schBase -Name "AllowInsecureRenegoServers" -Silent
    Remove-RegistryValue -Path $schBase -Name "DisableRenegoOnClient" -Silent
    Remove-RegistryValue -Path $schBase -Name "DisableRenegoOnServer" -Silent
    Remove-RegistryValue -Path $schBase -Name "UseScsvForTls" -Silent

    # ---- .NET Framework Strong Crypto (remove forced overrides) ----
    Write-Log "Restoring .NET Framework crypto settings..." -Level Info
    @(
        "HKLM:\SOFTWARE\Microsoft\.NETFramework\v2.0.50727",
        "HKLM:\SOFTWARE\Microsoft\.NETFramework\v4.0.30319",
        "HKLM:\SOFTWARE\WOW6432Node\Microsoft\.NETFramework\v2.0.50727",
        "HKLM:\SOFTWARE\WOW6432Node\Microsoft\.NETFramework\v4.0.30319"
    ) | ForEach-Object {
        Remove-RegistryValue -Path $_ -Name "SchUseStrongCrypto" -Silent
        Remove-RegistryValue -Path $_ -Name "SystemDefaultTlsVersions" -Silent
    }

    # ---- WinRM basic auth (remove policy override) ----
    Remove-RegistryValue -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\WinRM\Client" -Name "AllowBasic" -Silent
    Remove-RegistryValue -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\WinRM\Service" -Name "AllowBasic" -Silent

    # ---- NetBIOS (restore to default DHCP-controlled) ----
    Write-Log "Restoring NetBIOS to default (DHCP-controlled)..." -Level Info
    try {
        $key = "HKLM:\SYSTEM\CurrentControlSet\services\NetBT\Parameters\Interfaces"
        if (Test-Path $key) {
            Get-ChildItem $key -EA 0 | ForEach-Object {
                Set-ItemProperty -Path "$key\$($_.PSChildName)" -Name "NetbiosOptions" -Value 0 -Force -EA 0
            }
            $script:ChangesCount++
        }
    } catch { Write-Log "Could not restore NetBIOS settings" -Level Warning }

    # ---- SEHOP (Structured Exception Handler Overwrite Protection) ----
    Remove-RegistryValue -Path "HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\kernel" -Name "DisableExceptionChainValidation" -Silent

    Write-Log "Crypto Protocols: Complete" -Level Success
    # Also handle related security protocol settings
    Restore-SecurityProtocols
}

function Restore-WindowsFeatures {
    Write-Log "=== WINDOWS OPTIONAL FEATURES ===" -Level Section
    Write-Log "Re-enabling Windows optional features (this may take several minutes)..." -Level Info

    # Features that are enabled by default on a fresh Windows install
    $defaultEnabledFeatures = @(
        "MicrosoftWindowsPowerShellV2",
        "MicrosoftWindowsPowerShellV2Root",
        "WCF-TCP-PortSharing45",
        "SmbDirect",
        "Printing-Foundation-Features",
        "Printing-PrintToPDFServices-Features",
        "Printing-XPSServices-Features",
        "SearchEngine-Client-Package",
        "MediaPlayback",
        "WindowsMediaPlayer",
        "WorkFolders-Client"
    )

    # Features disabled by default (skip restoring these - they were disabled for security)
    $defaultDisabledFeatures = @(
        "SMB1Protocol","SMB1Protocol-Client","SMB1Protocol-Server",
        "TelnetClient","TFTP","DirectPlay","LegacyComponents",
        "FaxServicesClientPackage",
        "Internet-Explorer-Optional-amd64","Internet-Explorer-Optional-x64",
        "Xps-Foundation-Xps-Viewer","ScanManagementConsole",
        "Printing-Foundation-InternetPrinting-Client",
        "Printing-Foundation-LPDPrintService","Printing-Foundation-LPRPortMonitor"
    )

    foreach ($feature in $defaultEnabledFeatures) {
        try {
            $f = Get-WindowsOptionalFeature -FeatureName $feature -Online -EA Stop
            if ($f -and $f.State -ne 'Enabled') {
                Write-Log "Re-enabling feature: $feature" -Level Info
                Enable-WindowsOptionalFeature -FeatureName $feature -Online -NoRestart -LogLevel Errors -WarningAction SilentlyContinue -EA Stop | Out-Null
                Write-Log "Enabled: $feature" -Level Success
                $script:ChangesCount++
            }
        } catch {
            Write-Log "Could not enable $feature : $($_.Exception.Message)" -Level Warning
        }
    }

    Write-Log "Note: Security features (SMB1, Telnet, TFTP, DirectPlay) left disabled intentionally" -Level Info
    Write-Log "Windows Features: Complete" -Level Success
}

function Restore-AppxPackages {
    Write-Log "=== APPX PACKAGE RESTORATION ===" -Level Section
    Write-Log "Attempting to reinstall removed Windows Store apps..." -Level Info

    # Core Windows packages that should be present on a stock install
    $corePackages = @(
        @{N="Microsoft.WindowsStore"; P="cw5n1h2txyewy"},
        @{N="Microsoft.StorePurchaseApp"; P="cw5n1h2txyewy"},
        @{N="Microsoft.DesktopAppInstaller"; P="cw5n1h2txyewy"},
        @{N="Microsoft.WindowsCalculator"; P="cw5n1h2txyewy"},
        @{N="Microsoft.Windows.Photos"; P="cw5n1h2txyewy"},
        @{N="Microsoft.WindowsCamera"; P="cw5n1h2txyewy"},
        @{N="Microsoft.WindowsAlarms"; P="cw5n1h2txyewy"},
        @{N="Microsoft.WindowsSoundRecorder"; P="cw5n1h2txyewy"},
        @{N="Microsoft.WindowsMaps"; P="cw5n1h2txyewy"},
        @{N="Microsoft.WindowsFeedbackHub"; P="cw5n1h2txyewy"},
        @{N="Microsoft.GetHelp"; P="cw5n1h2txyewy"},
        @{N="Microsoft.Getstarted"; P="cw5n1h2txyewy"},
        @{N="Microsoft.MSPaint"; P="cw5n1h2txyewy"},
        @{N="Microsoft.People"; P="cw5n1h2txyewy"},
        @{N="Microsoft.ScreenSketch"; P="cw5n1h2txyewy"},
        @{N="Microsoft.MicrosoftStickyNotes"; P="8wekyb3d8bbwe"},
        @{N="Microsoft.MicrosoftOfficeHub"; P="cw5n1h2txyewy"},
        @{N="microsoft.windowscommunicationsapps"; P="cw5n1h2txyewy"},
        @{N="Microsoft.YourPhone"; P="cw5n1h2txyewy"},
        @{N="Microsoft.HEIFImageExtension"; P="cw5n1h2txyewy"},
        @{N="Microsoft.VP9VideoExtensions"; P="cw5n1h2txyewy"},
        @{N="Microsoft.WebMediaExtensions"; P="cw5n1h2txyewy"},
        @{N="Microsoft.WebpImageExtension"; P="cw5n1h2txyewy"},
        @{N="Microsoft.RawImageExtension"; P="cw5n1h2txyewy"},
        @{N="Microsoft.HEVCVideoExtension"; P="cw5n1h2txyewy"},
        @{N="Microsoft.Xbox.TCUI"; P="cw5n1h2txyewy"},
        @{N="Microsoft.XboxIdentityProvider"; P="cw5n1h2txyewy"},
        @{N="Microsoft.XboxGamingOverlay"; P="cw5n1h2txyewy"},
        @{N="Microsoft.XboxGameOverlay"; P="cw5n1h2txyewy"},
        @{N="Microsoft.XboxSpeechToTextOverlay"; P="cw5n1h2txyewy"},
        @{N="Microsoft.GamingApp"; P="cw5n1h2txyewy"},
        @{N="Microsoft.BingWeather"; P="cw5n1h2txyewy"},
        @{N="Microsoft.BingNews"; P="cw5n1h2txyewy"},
        @{N="Microsoft.ZuneMusic"; P="cw5n1h2txyewy"},
        @{N="Microsoft.ZuneVideo"; P="cw5n1h2txyewy"},
        @{N="Microsoft.Todos"; P="cw5n1h2txyewy"}
    )

    # Critical system packages (must be present for Windows to function)
    $systemPackages = @(
        @{N="Microsoft.Windows.SecHealthUI"; P="cw5n1h2txyewy"},
        @{N="Microsoft.SecHealthUI"; P="8wekyb3d8bbwe"},
        @{N="Microsoft.AAD.BrokerPlugin"; P="cw5n1h2txyewy"},
        @{N="Microsoft.AccountsControl"; P="cw5n1h2txyewy"},
        @{N="Microsoft.Windows.CloudExperienceHost"; P="cw5n1h2txyewy"},
        @{N="Microsoft.Windows.ContentDeliveryManager"; P="cw5n1h2txyewy"},
        @{N="Microsoft.Windows.Search"; P="cw5n1h2txyewy"},
        @{N="Microsoft.Windows.ShellExperienceHost"; P="cw5n1h2txyewy"},
        @{N="Microsoft.Windows.PeopleExperienceHost"; P="cw5n1h2txyewy"},
        @{N="Microsoft.CredDialogHost"; P="cw5n1h2txyewy"},
        @{N="Microsoft.BioEnrollment"; P="cw5n1h2txyewy"},
        @{N="Microsoft.LockApp"; P="cw5n1h2txyewy"},
        @{N="Microsoft.ECApp"; P="cw5n1h2txyewy"},
        @{N="Microsoft.AsyncTextService"; P="cw5n1h2txyewy"},
        @{N="Microsoft.Win32WebViewHost"; P="cw5n1h2txyewy"},
        @{N="Microsoft.PPIProjection"; P="cw5n1h2txyewy"},
        @{N="Microsoft.Windows.Apprep.ChxApp"; P="cw5n1h2txyewy"},
        @{N="Microsoft.Windows.CapturePicker"; P="cw5n1h2txyewy"},
        @{N="Microsoft.Windows.OOBENetworkCaptivePortal"; P="cw5n1h2txyewy"},
        @{N="Microsoft.Windows.OOBENetworkConnectionFlow"; P="cw5n1h2txyewy"},
        @{N="Microsoft.Windows.PinningConfirmationDialog"; P="cw5n1h2txyewy"},
        @{N="Microsoft.Windows.ParentalControls"; P="cw5n1h2txyewy"},
        @{N="Microsoft.XboxGameCallableUI"; P="cw5n1h2txyewy"},
        @{N="NcsiUwpApp"; P="cw5n1h2txyewy"},
        @{N="Microsoft.Windows.PrintQueueActionCenter"; P="cw5n1h2txyewy"},
        @{N="MicrosoftWindows.Client.CBS"; P="cw5n1h2txyewy"},
        @{N="MicrosoftWindows.UndockedDevKit"; P="cw5n1h2txyewy"},
        @{N="Microsoft.Windows.SecondaryTileExperience"; P="cw5n1h2txyewy"},
        @{N="Microsoft.Windows.XGpuEjectDialog"; P="cw5n1h2txyewy"}
    )

    $allPackages = $systemPackages + $corePackages
    $installed = 0; $failed = 0; $skipped = 0

    foreach ($pkg in $allPackages) {
        $name = $pkg.N
        $pub = $pkg.P

        # Check if already installed
        if (Get-AppxPackage -Name $name -EA 0) {
            $skipped++; continue
        }

        # Method 1: Try manifest from another user profile
        $otherPkgs = @(Get-AppxPackage -AllUsers $name -EA 0)
        $success = $false
        foreach ($op in $otherPkgs) {
            if ($op.InstallLocation -and (Test-Path "$($op.InstallLocation)\AppxManifest.xml")) {
                try {
                    Add-AppxPackage -DisableDevelopmentMode -Register "$($op.InstallLocation)\AppxManifest.xml" -EA Stop
                    $installed++; $success = $true
                    Write-Log "Reinstalled: $name (manifest)" -Level Success
                    break
                } catch { }
            }
        }
        if ($success) { continue }

        # Method 2: Try package family name
        $familyName = "${name}_${pub}"
        try {
            Add-AppxPackage -RegisterByFamilyName -MainPackage $familyName -EA Stop
            $installed++
            Write-Log "Reinstalled: $name (family)" -Level Success
            continue
        } catch { }

        $failed++
        Write-Log "Could not reinstall: $name (may need Store or Windows Update)" -Level Warning
    }

    Write-Log "AppX Packages: $installed reinstalled, $skipped already present, $failed unavailable" -Level Success
    $script:ChangesCount += $installed
}

function Restore-EnvironmentVariables {
    Write-Log "=== ENVIRONMENT VARIABLES ===" -Level Section

    # Remove telemetry opt-out variables (restore to default = telemetry enabled)
    @("DOTNET_CLI_TELEMETRY_OPTOUT","POWERSHELL_TELEMETRY_OPTOUT") | ForEach-Object {
        $val = [System.Environment]::GetEnvironmentVariable($_, "User")
        if ($null -ne $val) {
            [System.Environment]::SetEnvironmentVariable($_, $null, "User")
            Write-Log "Removed user env var: $_" -Level Success
            $script:ChangesCount++
        }
        $val = [System.Environment]::GetEnvironmentVariable($_, "Machine")
        if ($null -ne $val) {
            [System.Environment]::SetEnvironmentVariable($_, $null, "Machine")
            Write-Log "Removed machine env var: $_" -Level Success
            $script:ChangesCount++
        }
    }

    Write-Log "Environment Variables: Complete" -Level Success
}

function Restore-BackgroundApps {
    Write-Log "=== BACKGROUND APPS ===" -Level Section
    Remove-RegistryValue -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\BackgroundAccessApplications" -Name "GlobalUserDisabled" -Silent
    Remove-RegistryValue -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\BackgroundAccessApplications" -Name "Migrated" -Silent
    Remove-RegistryValue -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\Search" -Name "BackgroundAppGlobalToggle" -Silent
    # Group Policy
    Remove-RegistryValue -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\AppPrivacy" -Name "LetAppsRunInBackground" -Silent
    Write-Log "Background Apps: Complete" -Level Success
}
function Show-MainWindow {
    [xml]$xaml = @"
<Window xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
        xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
        Title="Maven Imaging - Windows Restoration Tool v$($script:Version)"
        Height="880" Width="1340" MinHeight="700" MinWidth="1100"
        WindowStartupLocation="CenterScreen" Background="#0d1117"
        ResizeMode="CanResize">
    <Window.Resources>
        <!-- Checkbox Style -->
        <Style TargetType="CheckBox">
            <Setter Property="Foreground" Value="#c9d1d9"/>
            <Setter Property="Margin" Value="4,3"/>
            <Setter Property="FontSize" Value="11.5"/>
            <Setter Property="FontFamily" Value="Segoe UI"/>
            <Setter Property="Cursor" Value="Hand"/>
        </Style>
        <!-- Button Base Style -->
        <Style TargetType="Button" x:Key="BtnBase">
            <Setter Property="FontFamily" Value="Segoe UI"/>
            <Setter Property="FontSize" Value="11"/>
            <Setter Property="Cursor" Value="Hand"/>
            <Setter Property="BorderThickness" Value="1"/>
            <Setter Property="Padding" Value="14,7"/>
            <Setter Property="Margin" Value="3"/>
            <Setter Property="Template">
                <Setter.Value>
                    <ControlTemplate TargetType="Button">
                        <Border x:Name="border" Background="{TemplateBinding Background}" 
                                BorderBrush="{TemplateBinding BorderBrush}" 
                                BorderThickness="{TemplateBinding BorderThickness}" 
                                CornerRadius="4" Padding="{TemplateBinding Padding}">
                            <ContentPresenter HorizontalAlignment="Center" VerticalAlignment="Center"/>
                        </Border>
                        <ControlTemplate.Triggers>
                            <Trigger Property="IsMouseOver" Value="True">
                                <Setter TargetName="border" Property="Opacity" Value="0.85"/>
                            </Trigger>
                            <Trigger Property="IsPressed" Value="True">
                                <Setter TargetName="border" Property="Opacity" Value="0.7"/>
                            </Trigger>
                            <Trigger Property="IsEnabled" Value="False">
                                <Setter TargetName="border" Property="Opacity" Value="0.4"/>
                            </Trigger>
                        </ControlTemplate.Triggers>
                    </ControlTemplate>
                </Setter.Value>
            </Setter>
        </Style>
        <!-- Action Button -->
        <Style TargetType="Button" x:Key="BtnAction" BasedOn="{StaticResource BtnBase}">
            <Setter Property="Background" Value="#21262d"/>
            <Setter Property="Foreground" Value="#c9d1d9"/>
            <Setter Property="BorderBrush" Value="#30363d"/>
        </Style>
        <!-- Primary Button -->
        <Style TargetType="Button" x:Key="BtnPrimary" BasedOn="{StaticResource BtnBase}">
            <Setter Property="Background" Value="#238636"/>
            <Setter Property="Foreground" Value="White"/>
            <Setter Property="BorderBrush" Value="#2ea043"/>
            <Setter Property="FontWeight" Value="SemiBold"/>
        </Style>
        <!-- Danger Button -->
        <Style TargetType="Button" x:Key="BtnDanger" BasedOn="{StaticResource BtnBase}">
            <Setter Property="Background" Value="#da3633"/>
            <Setter Property="Foreground" Value="White"/>
            <Setter Property="BorderBrush" Value="#f85149"/>
        </Style>
        <!-- GroupBox -->
        <Style TargetType="GroupBox">
            <Setter Property="BorderBrush" Value="#21262d"/>
            <Setter Property="BorderThickness" Value="1"/>
            <Setter Property="Margin" Value="4"/>
            <Setter Property="Padding" Value="4,2"/>
            <Setter Property="Foreground" Value="#58a6ff"/>
            <Setter Property="FontWeight" Value="SemiBold"/>
            <Setter Property="FontSize" Value="10.5"/>
            <Setter Property="FontFamily" Value="Segoe UI"/>
            <Setter Property="Template">
                <Setter.Value>
                    <ControlTemplate TargetType="GroupBox">
                        <Grid>
                            <Grid.RowDefinitions>
                                <RowDefinition Height="Auto"/>
                                <RowDefinition Height="*"/>
                            </Grid.RowDefinitions>
                            <Border Grid.Row="0" Background="#161b22" CornerRadius="6,6,0,0" 
                                    BorderBrush="#21262d" BorderThickness="1,1,1,0" Padding="10,5">
                                <ContentPresenter ContentSource="Header" RecognizesAccessKey="True"/>
                            </Border>
                            <Border Grid.Row="1" Background="#0d1117" CornerRadius="0,0,6,6" 
                                    BorderBrush="#21262d" BorderThickness="1,0,1,1" Padding="6,4">
                                <ContentPresenter/>
                            </Border>
                        </Grid>
                    </ControlTemplate>
                </Setter.Value>
            </Setter>
        </Style>
    </Window.Resources>
    <Border Background="#0d1117" CornerRadius="0">
        <Grid Margin="16">
            <Grid.RowDefinitions>
                <RowDefinition Height="Auto"/>
                <RowDefinition Height="*"/>
                <RowDefinition Height="Auto"/>
            </Grid.RowDefinitions>
            <!-- HEADER -->
            <Border Grid.Row="0" Background="#161b22" CornerRadius="8" Padding="16,12" Margin="0,0,0,12"
                    BorderBrush="#21262d" BorderThickness="1">
                <Grid>
                    <Grid.ColumnDefinitions>
                        <ColumnDefinition Width="*"/>
                        <ColumnDefinition Width="Auto"/>
                    </Grid.ColumnDefinitions>
                    <StackPanel Grid.Column="0">
                        <StackPanel Orientation="Horizontal">
                            <TextBlock Text="&#x25A0; " Foreground="#58a6ff" FontSize="18" VerticalAlignment="Center"/>
                            <TextBlock Text="Windows Restoration Tool" FontSize="20" FontWeight="Bold" Foreground="#e6edf3" FontFamily="Segoe UI"/>
                            <Border Background="#1f6feb" CornerRadius="10" Padding="8,2" Margin="10,0,0,0" VerticalAlignment="Center">
                                <TextBlock Text="v3.1" FontSize="10" Foreground="White" FontWeight="SemiBold"/>
                            </Border>
                            <Border Background="#238636" CornerRadius="10" Padding="8,2" Margin="6,0,0,0" VerticalAlignment="Center">
                                <TextBlock Text="privacy.sexy" FontSize="10" Foreground="White" FontWeight="SemiBold"/>
                            </Border>
                        </StackPanel>
                        <TextBlock Text="Restore Windows to factory defaults by reversing debloat scripts, privacy.sexy tweaks, group policies, and registry modifications"
                                   FontSize="11" Foreground="#8b949e" Margin="18,4,0,0" FontFamily="Segoe UI"/>
                    </StackPanel>
                    <StackPanel Grid.Column="1" VerticalAlignment="Center" HorizontalAlignment="Right">
                        <TextBlock FontSize="10" Foreground="#8b949e" FontFamily="Segoe UI" HorizontalAlignment="Right">
                            <Run Text="Maven Imaging IT"/>
                        </TextBlock>
                        <TextBlock FontSize="10" Foreground="#484f58" FontFamily="Segoe UI" HorizontalAlignment="Right">
                            <Run Text="44 restoration categories"/>
                        </TextBlock>
                    </StackPanel>
                </Grid>
            </Border>
            <!-- MAIN CONTENT: Left Panel + Right Console -->
            <Grid Grid.Row="1">
                <Grid.ColumnDefinitions>
                    <ColumnDefinition Width="3*" MinWidth="500"/>
                    <ColumnDefinition Width="12"/>
                    <ColumnDefinition Width="2*" MinWidth="320"/>
                </Grid.ColumnDefinitions>
                <!-- LEFT PANEL: Categories -->
                <Border Grid.Column="0" Background="#0d1117">
                    <ScrollViewer VerticalScrollBarVisibility="Auto" Padding="0,0,4,0">
                        <Grid>
                            <Grid.ColumnDefinitions>
                                <ColumnDefinition Width="*"/>
                                <ColumnDefinition Width="*"/>
                                <ColumnDefinition Width="*"/>
                            </Grid.ColumnDefinitions>
                            <Grid.RowDefinitions>
                                <RowDefinition Height="Auto"/>
                                <RowDefinition Height="Auto"/>
                                <RowDefinition Height="Auto"/>
                                <RowDefinition Height="Auto"/>
                                <RowDefinition Height="Auto"/>
                            </Grid.RowDefinitions>
                            <!-- Col 0 -->
                            <GroupBox Header="  Privacy &amp; Telemetry" Grid.Row="0" Grid.Column="0"><StackPanel>
                                <CheckBox x:Name="chkPrivacy" Content="Privacy &amp; Telemetry" IsChecked="True"/>
                                <CheckBox x:Name="chkCopilot" Content="Copilot, Cortana &amp; AI" IsChecked="True"/>
                                <CheckBox x:Name="chkBing" Content="Bing Search &amp; Widgets" IsChecked="True"/>
                                <CheckBox x:Name="chkCDM" Content="Content Delivery / Ads" IsChecked="True"/>
                                <CheckBox x:Name="chkSync" Content="Sync Settings" IsChecked="True"/>
                                <CheckBox x:Name="chkInsider" Content="Windows Insider" IsChecked="True"/>
                            </StackPanel></GroupBox>
                            <GroupBox Header="  User Interface" Grid.Row="1" Grid.Column="0"><StackPanel>
                                <CheckBox x:Name="chkTaskbar" Content="Taskbar &amp; UI" IsChecked="True"/>
                                <CheckBox x:Name="chkExplorer" Content="Explorer Settings" IsChecked="True"/>
                                <CheckBox x:Name="chkStartMenu" Content="Start Menu" IsChecked="True"/>
                                <CheckBox x:Name="chkTheme" Content="Theme (Light Mode)" IsChecked="False" Foreground="#8b949e"/>
                                <CheckBox x:Name="chkContextMenus" Content="Context Menus" IsChecked="True"/>
                            </StackPanel></GroupBox>
                            <GroupBox Header="  System" Grid.Row="2" Grid.Column="0"><StackPanel>
                                <CheckBox x:Name="chkNotifications" Content="Notifications" IsChecked="True"/>
                                <CheckBox x:Name="chkOOBE" Content="OOBE &amp; Setup" IsChecked="True"/>
                                <CheckBox x:Name="chkWindowsUpdate" Content="Windows Update" IsChecked="True"/>
                                <CheckBox x:Name="chkErrorReport" Content="Error Reporting" IsChecked="True"/>
                                <CheckBox x:Name="chkMisc" Content="Misc Policies" IsChecked="True"/>
                            </StackPanel></GroupBox>
                            <!-- Col 1 -->
                            <GroupBox Header="  Applications" Grid.Row="0" Grid.Column="1"><StackPanel>
                                <CheckBox x:Name="chkEdge" Content="Microsoft Edge" IsChecked="True"/>
                                <CheckBox x:Name="chkChrome" Content="Google Chrome" IsChecked="True"/>
                                <CheckBox x:Name="chkOffice" Content="Microsoft Office" IsChecked="True"/>
                                <CheckBox x:Name="chkNvidia" Content="NVIDIA Telemetry" IsChecked="True"/>
                            </StackPanel></GroupBox>
                            <GroupBox Header="  Security" Grid.Row="1" Grid.Column="1"><StackPanel>
                                <CheckBox x:Name="chkDefender" Content="Windows Defender" IsChecked="True"/>
                                <CheckBox x:Name="chkSmartScreen" Content="SmartScreen" IsChecked="True"/>
                                <CheckBox x:Name="chkFirewall" Content="Firewall" IsChecked="True"/>
                                <CheckBox x:Name="chkUAC" Content="UAC &amp; Security" IsChecked="True"/>
                                <CheckBox x:Name="chkBiometrics" Content="Biometrics" IsChecked="True"/>
                            </StackPanel></GroupBox>
                            <GroupBox Header="  Features" Grid.Row="2" Grid.Column="1"><StackPanel>
                                <CheckBox x:Name="chkGaming" Content="Gaming &amp; Xbox" IsChecked="True"/>
                                <CheckBox x:Name="chkOneDrive" Content="OneDrive" IsChecked="True"/>
                                <CheckBox x:Name="chkRemoteDesktop" Content="Remote Desktop" IsChecked="True"/>
                            </StackPanel></GroupBox>
                            <!-- Col 2 -->
                            <GroupBox Header="  Network" Grid.Row="0" Grid.Column="2"><StackPanel>
                                <CheckBox x:Name="chkNetwork" Content="Network (IPv6, DNS)" IsChecked="True"/>
                                <CheckBox x:Name="chkBluetooth" Content="Bluetooth" IsChecked="True"/>
                            </StackPanel></GroupBox>
                            <GroupBox Header="  Hardware" Grid.Row="1" Grid.Column="2"><StackPanel>
                                <CheckBox x:Name="chkAccessibility" Content="Accessibility" IsChecked="True"/>
                                <CheckBox x:Name="chkInput" Content="Input Settings" IsChecked="True"/>
                                <CheckBox x:Name="chkPrinting" Content="Printing" IsChecked="True"/>
                            </StackPanel></GroupBox>
                            <GroupBox Header="  Performance" Grid.Row="2" Grid.Column="2"><StackPanel>
                                <CheckBox x:Name="chkPower" Content="Power Management" IsChecked="True"/>
                                <CheckBox x:Name="chkMemory" Content="Memory &amp; Perf" IsChecked="True"/>
                                <CheckBox x:Name="chkStorage" Content="Storage" IsChecked="True"/>
                            </StackPanel></GroupBox>
                            <!-- Services/Tasks -->
                            <GroupBox Header="  Services &amp; Tasks" Grid.Row="3" Grid.Column="0" Grid.ColumnSpan="3">
                                <StackPanel Orientation="Horizontal">
                                    <CheckBox x:Name="chkServices" Content="Restore Services (100+)" IsChecked="True" Margin="6,3"/>
                                    <CheckBox x:Name="chkTasks" Content="Restore Scheduled Tasks (80+)" IsChecked="True" Margin="20,3,6,3"/>
                                    <CheckBox x:Name="chkCrypto" Content="Crypto/SCHANNEL Protocols" IsChecked="True" Margin="6,3"/>
                                    <CheckBox x:Name="chkFeatures" Content="Windows Optional Features" IsChecked="True" Margin="20,3,6,3"/>
                                    <CheckBox x:Name="chkAppx" Content="Reinstall AppX Packages" IsChecked="False" Foreground="#8b949e" Margin="6,3"/>
                                    <CheckBox x:Name="chkEnvVars" Content="Environment Variables" IsChecked="True" Margin="20,3,6,3"/>
                                    <CheckBox x:Name="chkBgApps" Content="Background Apps" IsChecked="True" Margin="6,3"/>
                                    <CheckBox x:Name="chkHostsFile" Content="Clean Hosts File" IsChecked="True" Margin="20,3,6,3"/>
                                </StackPanel>
                            </GroupBox>
                            <!-- Quick Actions -->
                            <Border Grid.Row="4" Grid.Column="0" Grid.ColumnSpan="3" Margin="4,4" Padding="8,6"
                                    Background="#161b22" CornerRadius="6" BorderBrush="#21262d" BorderThickness="1">
                                <WrapPanel>
                                    <Button x:Name="btnSelectAll" Content="Select All" Style="{StaticResource BtnAction}"/>
                                    <Button x:Name="btnSelectNone" Content="Select None" Style="{StaticResource BtnAction}"/>
                                    <Button x:Name="btnSelectSafe" Content="Safe Defaults" Style="{StaticResource BtnAction}"/>
                                    <Button x:Name="btnCreateRestore" Content=" Create Restore Point" Style="{StaticResource BtnPrimary}"/>
                                    <Button x:Name="btnOpenLog" Content="Open Log" Style="{StaticResource BtnAction}"/>
                                </WrapPanel>
                            </Border>
                        </Grid>
                    </ScrollViewer>
                </Border>
                <!-- SEPARATOR -->
                <Border Grid.Column="1" Width="1" Background="#21262d" VerticalAlignment="Stretch" HorizontalAlignment="Center"/>
                <!-- RIGHT PANEL: Console Output -->
                <Grid Grid.Column="2">
                    <Grid.RowDefinitions>
                        <RowDefinition Height="Auto"/>
                        <RowDefinition Height="*"/>
                        <RowDefinition Height="Auto"/>
                    </Grid.RowDefinitions>
                    <!-- Console Header -->
                    <Border Grid.Row="0" Background="#161b22" CornerRadius="6,6,0,0" 
                            BorderBrush="#21262d" BorderThickness="1,1,1,0" Padding="10,7">
                        <StackPanel Orientation="Horizontal">
                            <Ellipse Width="8" Height="8" Fill="#3fb950" Margin="0,0,6,0"/>
                            <TextBlock Text="CONSOLE OUTPUT" FontSize="10" Foreground="#8b949e" 
                                       FontWeight="Bold" FontFamily="Segoe UI"/>
                        </StackPanel>
                    </Border>
                    <!-- Console Body -->
                    <Border Grid.Row="1" Background="#010409" BorderBrush="#21262d" BorderThickness="1,0,1,0">
                        <RichTextBox x:Name="rtbConsole" IsReadOnly="True" 
                                     Background="#010409" Foreground="#8b949e" 
                                     FontFamily="Cascadia Mono, Consolas, Courier New" FontSize="11"
                                     BorderThickness="0" Padding="8,4" VerticalScrollBarVisibility="Auto"
                                     HorizontalScrollBarVisibility="Disabled">
                            <RichTextBox.Resources>
                                <Style TargetType="Paragraph">
                                    <Setter Property="Margin" Value="0,1"/>
                                </Style>
                            </RichTextBox.Resources>
                            <FlowDocument/>
                        </RichTextBox>
                    </Border>
                    <!-- Console Stats Footer -->
                    <Border Grid.Row="2" Background="#161b22" CornerRadius="0,0,6,6" 
                            BorderBrush="#21262d" BorderThickness="1,0,1,1" Padding="10,6">
                        <Grid>
                            <Grid.ColumnDefinitions>
                                <ColumnDefinition Width="*"/>
                                <ColumnDefinition Width="Auto"/>
                                <ColumnDefinition Width="Auto"/>
                            </Grid.ColumnDefinitions>
                            <TextBlock Grid.Column="0" x:Name="txtConsoleStatus" Text="Waiting..." 
                                       Foreground="#484f58" FontSize="10" FontFamily="Segoe UI" VerticalAlignment="Center"/>
                            <StackPanel Grid.Column="1" Orientation="Horizontal" Margin="10,0">
                                <TextBlock Text="Changes: " Foreground="#484f58" FontSize="10" FontFamily="Segoe UI"/>
                                <TextBlock x:Name="txtChanges" Text="0" Foreground="#3fb950" FontSize="10" FontWeight="Bold" FontFamily="Segoe UI"/>
                            </StackPanel>
                            <StackPanel Grid.Column="2" Orientation="Horizontal">
                                <TextBlock Text="Errors: " Foreground="#484f58" FontSize="10" FontFamily="Segoe UI"/>
                                <TextBlock x:Name="txtErrors" Text="0" Foreground="#f85149" FontSize="10" FontWeight="Bold" FontFamily="Segoe UI"/>
                            </StackPanel>
                        </Grid>
                    </Border>
                </Grid>
            </Grid>
            <!-- FOOTER -->
            <Border Grid.Row="2" Margin="0,12,0,0">
                <Grid>
                    <Grid.ColumnDefinitions>
                        <ColumnDefinition Width="*"/>
                        <ColumnDefinition Width="Auto"/>
                    </Grid.ColumnDefinitions>
                    <!-- Progress Section -->
                    <StackPanel Grid.Column="0" VerticalAlignment="Center">
                        <TextBlock x:Name="txtStatus" Text="Ready - Select categories and click Restore" 
                                   Foreground="#8b949e" FontSize="11" FontFamily="Segoe UI" Margin="0,0,0,6"/>
                        <Border Background="#161b22" CornerRadius="3" Height="8" BorderBrush="#21262d" BorderThickness="1">
                            <ProgressBar x:Name="progressBar" Height="6" Margin="1" 
                                         Background="Transparent" Foreground="#1f6feb" BorderThickness="0"/>
                        </Border>
                    </StackPanel>
                    <!-- Action Buttons -->
                    <StackPanel Grid.Column="1" Orientation="Horizontal" Margin="16,0,0,0" VerticalAlignment="Center">
                        <Button x:Name="btnRestore" Content="   RESTORE SETTINGS   " Style="{StaticResource BtnPrimary}" 
                                FontSize="13" Padding="24,10"/>
                        <Button x:Name="btnCancel" Content="Exit" Style="{StaticResource BtnAction}" Padding="18,10"/>
                    </StackPanel>
                </Grid>
            </Border>
        </Grid>
    </Border>
</Window>
"@

    $reader = New-Object System.Xml.XmlNodeReader $xaml
    $window = [Windows.Markup.XamlReader]::Load($reader)
    
    $controls = @{}
    @("chkPrivacy","chkCopilot","chkBing","chkCDM","chkSync","chkInsider","chkTaskbar","chkExplorer",
      "chkStartMenu","chkTheme","chkContextMenus","chkNotifications","chkOOBE","chkWindowsUpdate",
      "chkErrorReport","chkMisc","chkEdge","chkChrome","chkOffice","chkNvidia","chkDefender",
      "chkSmartScreen","chkFirewall","chkUAC","chkBiometrics","chkGaming","chkOneDrive",
      "chkRemoteDesktop","chkNetwork","chkBluetooth","chkAccessibility","chkInput","chkPrinting",
      "chkPower","chkMemory","chkStorage","chkServices","chkTasks",
      "chkCrypto","chkFeatures","chkAppx","chkEnvVars","chkBgApps","chkHostsFile",
      "btnSelectAll","btnSelectNone","btnSelectSafe","btnCreateRestore","btnOpenLog",
      "btnRestore","btnCancel","txtStatus","progressBar","rtbConsole",
      "txtConsoleStatus","txtChanges","txtErrors"
    ) | ForEach-Object { $controls[$_] = $window.FindName($_) }
    
    # Wire up console for Write-Log
    $script:ConsoleBox = $controls.rtbConsole
    $script:ConsoleWindow = $window
    
    $allCheckboxes = $controls.Keys | Where-Object { $_ -like "chk*" } | ForEach-Object { $controls[$_] }
    
    $controls.btnSelectAll.Add_Click({ $allCheckboxes | ForEach-Object { $_.IsChecked = $true } })
    $controls.btnSelectNone.Add_Click({ $allCheckboxes | ForEach-Object { $_.IsChecked = $false } })
    $controls.btnSelectSafe.Add_Click({ $allCheckboxes | ForEach-Object { $_.IsChecked = $true }; $controls.chkTheme.IsChecked = $false })
    
    $controls.btnCreateRestore.Add_Click({
        $controls.txtStatus.Text = "Creating restore point..."
        $controls.txtConsoleStatus.Text = "Creating restore point..."
        $window.Dispatcher.Invoke([action]{}, "Render")
        try {
            # Enable System Restore via registry (works on all editions)
            $srKey = "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\SystemRestore"
            if (!(Test-Path $srKey)) { New-Item -Path $srKey -Force | Out-Null }
            Set-ItemProperty -Path $srKey -Name "RPSessionInterval" -Value 1 -Type DWord -Force -EA 0
            # Enable VSS service
            $vss = Get-Service -Name "VSS" -EA 0
            if ($vss -and $vss.Status -ne 'Running') { Start-Service -Name "VSS" -EA 0 }
            $srService = Get-Service -Name "swprv" -EA 0
            if ($srService -and $srService.Status -ne 'Running') { Start-Service -Name "swprv" -EA 0 }
            # Try Enable-ComputerRestore first (Pro/Enterprise), fall back to registry
            try { Enable-ComputerRestore -Drive "C:\" -EA Stop } catch {
                Set-ItemProperty -Path $srKey -Name "DisableSR" -Value 0 -Type DWord -Force -EA 0
            }
            # Create restore point via CIM (works on all editions and PS 5.1+/7+)
            $cimResult = Invoke-CimMethod -Namespace "root\default" -ClassName "SystemRestore" -MethodName "CreateRestorePoint" -Arguments @{
                Description = "Before Windows Registry Restoration"
                RestorePointType = [uint32]12
                EventType = [uint32]100
            } -ErrorAction Stop
            if ($cimResult.ReturnValue -eq 0) {
                Write-Log "Restore point created successfully" -Level Success
                [System.Windows.MessageBox]::Show("Restore point created successfully!", "Success", "OK", "Information")
                $controls.txtStatus.Text = "Restore point created"
                $controls.txtConsoleStatus.Text = "Restore point created"
            } elseif ($cimResult.ReturnValue -eq 1) {
                Write-Log "Restore point skipped - recent one exists" -Level Warning
                [System.Windows.MessageBox]::Show("Restore point skipped - one was already created recently.`nWindows limits restore points to one per 24 hours.", "Info", "OK", "Information")
                $controls.txtStatus.Text = "Restore point skipped (recent one exists)"
                $controls.txtConsoleStatus.Text = "Restore point exists"
            } else {
                throw "CreateRestorePoint returned code: $($cimResult.ReturnValue)"
            }
        } catch {
            Write-Log "Restore point failed: $($_.Exception.Message)" -Level Error
            [System.Windows.MessageBox]::Show("Failed: $($_.Exception.Message)`n`nYou can manually create one via:`nSystem Properties > System Protection > Create", "Error", "OK", "Error")
            $controls.txtStatus.Text = "Restore point failed - try manually"
            $controls.txtConsoleStatus.Text = "Restore point failed"
        }
    })
    
    $controls.btnOpenLog.Add_Click({ Start-Process explorer.exe -ArgumentList (Split-Path $script:LogPath -Parent) })
    $controls.btnCancel.Add_Click({ $window.Close() })
    
    $controls.btnRestore.Add_Click({
        $result = [System.Windows.MessageBox]::Show(
            "This will restore Windows registry settings to defaults.`n`nReverses privacy.sexy and other debloat scripts.`nThis cannot be easily undone. Create a restore point first!`n`nContinue?",
            "Confirm Restoration", "YesNo", "Warning")
        
        if ($result -eq "Yes") {
            $controls.btnRestore.IsEnabled = $false
            $controls.btnCancel.IsEnabled = $false
            $controls.btnCreateRestore.IsEnabled = $false
            $controls.btnSelectAll.IsEnabled = $false
            $controls.btnSelectNone.IsEnabled = $false
            $controls.btnSelectSafe.IsEnabled = $false
            Write-Log "=== Windows Registry Restoration Started ===" -Level Section
            Write-Log "Running as $env:USERNAME on $env:COMPUTERNAME" -Level Info
            
            $taskList = @()
            $map = [ordered]@{
                chkPrivacy="Privacy & Telemetry"; chkCopilot="Copilot & AI"; chkBing="Bing & Widgets"; chkCDM="Content Delivery"
                chkSync="Sync Settings"; chkInsider="Windows Insider"; chkTaskbar="Taskbar & UI"; chkExplorer="Explorer"
                chkStartMenu="Start Menu"; chkTheme="Theme"; chkContextMenus="Context Menus"
                chkNotifications="Notifications"; chkOOBE="OOBE & Setup"; chkWindowsUpdate="Windows Update"
                chkErrorReport="Error Reporting"; chkMisc="Misc Policies"; chkEdge="Microsoft Edge"; chkChrome="Google Chrome"
                chkOffice="Microsoft Office"; chkNvidia="NVIDIA"; chkDefender="Windows Defender"; chkSmartScreen="SmartScreen"
                chkFirewall="Firewall"; chkUAC="UAC & Security"; chkBiometrics="Biometrics"; chkGaming="Gaming & Xbox"
                chkOneDrive="OneDrive"; chkRemoteDesktop="Remote Desktop"; chkNetwork="Network"
                chkBluetooth="Bluetooth"; chkAccessibility="Accessibility"; chkInput="Input"
                chkPrinting="Printing"; chkPower="Power"; chkMemory="Memory & Performance"; chkStorage="Storage"
                chkServices="Services"; chkTasks="Scheduled Tasks"
                chkCrypto="Crypto Protocols"; chkFeatures="Windows Features"; chkAppx="AppX Packages"
                chkEnvVars="Environment Variables"; chkBgApps="Background Apps"; chkHostsFile="Hosts File"
            }
            $funcMap = @{
                chkPrivacy={Restore-PrivacyTelemetry}; chkCopilot={Restore-CopilotCortanaAI}
                chkBing={Restore-BingSearchWidgets}; chkCDM={Restore-ContentDeliveryManager}
                chkSync={Restore-SyncSettings}; chkInsider={Restore-WindowsInsiderSettings}
                chkTaskbar={Restore-TaskbarUI}; chkExplorer={Restore-ExplorerSettings}
                chkStartMenu={Restore-StartMenuSettings}; chkTheme={Restore-ThemeSettings}
                chkContextMenus={Restore-ContextMenus}; chkNotifications={Restore-NotificationSettings}
                chkOOBE={Restore-OOBESettings}; chkWindowsUpdate={Restore-WindowsUpdateSettings}
                chkErrorReport={Restore-ErrorReporting}; chkMisc={Restore-MiscPolicies}
                chkEdge={Restore-EdgeSettings}; chkChrome={Restore-ChromeSettings}
                chkOffice={Restore-OfficeSettings}; chkNvidia={Restore-NvidiaTelemetry}
                chkDefender={Restore-DefenderSettings}; chkSmartScreen={Restore-SmartScreenSettings}
                chkFirewall={Restore-FirewallSettings}; chkUAC={Restore-UACSettings}
                chkBiometrics={Restore-BiometricsSettings}; chkGaming={Restore-GamingSettings}
                chkOneDrive={Restore-OneDriveSettings}; chkRemoteDesktop={Restore-RemoteDesktopSettings}
                chkNetwork={Restore-NetworkSettings}; chkBluetooth={Restore-BluetoothSettings}
                chkAccessibility={Restore-AccessibilitySettings}; chkInput={Restore-InputSettings}
                chkPrinting={Restore-PrintingSettings}; chkPower={Restore-PowerSettings}
                chkMemory={Restore-MemoryPerformance}; chkStorage={Restore-StorageSettings}
                chkServices={Restore-Services}; chkTasks={Restore-ScheduledTasks}
                chkCrypto={Restore-CryptoProtocols}; chkFeatures={Restore-WindowsFeatures}; chkAppx={Restore-AppxPackages}
                chkEnvVars={Restore-EnvironmentVariables}; chkBgApps={Restore-BackgroundApps}; chkHostsFile={Restore-HostsFile}
            }
            
            foreach ($key in $map.Keys) {
                if ($controls[$key].IsChecked) {
                    $taskList += @{N=$map[$key]; A=$funcMap[$key]}
                }
            }
            
            Write-Log "Processing $($taskList.Count) categories..." -Level Info
            $controls.progressBar.Maximum = $taskList.Count
            $controls.progressBar.Value = 0
            
            for ($i = 0; $i -lt $taskList.Count; $i++) {
                $controls.txtStatus.Text = "[$($i+1)/$($taskList.Count)] Restoring: $($taskList[$i].N)"
                $controls.txtConsoleStatus.Text = "Processing $($taskList[$i].N)..."
                $window.Dispatcher.Invoke([action]{}, "Render")
                try { & $taskList[$i].A } catch { Write-Log "Error in $($taskList[$i].N): $($_.Exception.Message)" -Level Error }
                $controls.progressBar.Value = $i + 1
                $controls.txtChanges.Text = "$($script:ChangesCount)"
                $controls.txtErrors.Text = "$($script:ErrorsCount)"
                $window.Dispatcher.Invoke([action]{}, "Render")
            }
            
            Write-Log "=== Restoration Complete ===" -Level Section
            Write-Log "$($script:ChangesCount) changes applied, $($script:ErrorsCount) errors" -Level Info
            Write-Log "Log saved: $($script:LogPath)" -Level Info
            
            $controls.txtStatus.Text = "Complete! $($script:ChangesCount) changes, $($script:ErrorsCount) errors"
            $controls.txtConsoleStatus.Text = "Finished - restart recommended"
            $controls.txtChanges.Text = "$($script:ChangesCount)"
            $controls.txtErrors.Text = "$($script:ErrorsCount)"
            $controls.progressBar.Foreground = [System.Windows.Media.BrushConverter]::new().ConvertFromString('#3fb950')
            $controls.btnCancel.IsEnabled = $true
            $controls.btnCancel.Content = "Close"
            
            [System.Windows.MessageBox]::Show(
                "Restoration complete!`n`nChanges: $($script:ChangesCount)`nErrors: $($script:ErrorsCount)`n`nPlease restart your computer to apply all changes.`n`nLog saved to:`n$($script:LogPath)",
                "Restoration Complete", "OK", "Information")
        }
    })
    
    # Initial console messages
    Write-Log "=== Windows Restoration Tool v$($script:Version) ===" -Level Section
    Write-Log "Ready - select categories and click Restore" -Level Info
    Write-Log "Tip: Create a restore point before making changes" -Level Warning
    
    $window.ShowDialog() | Out-Null
}

# ============================================================================
# MAIN ENTRY POINT
# ============================================================================

Write-Log "=== Windows Restoration Tool v$($script:Version) ===" -Level Section
Show-MainWindow
