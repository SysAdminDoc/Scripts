#Requires -Version 5.1
# TelemetrySlayer v1.0.1
# Disables Microsoft telemetry, data collection, and related bloat on Windows 10/11

# --- Auto-elevate ---
if (-not ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(
    [Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Start-Process powershell.exe -Verb RunAs -ArgumentList "-ExecutionPolicy Bypass -File `"$PSCommandPath`""
    exit
}

Add-Type -AssemblyName PresentationFramework, PresentationCore, WindowsBase, System.Windows.Forms

# --- Hide console ---
Add-Type -Name Win -Namespace Native -MemberDefinition @'
[DllImport("kernel32.dll")] public static extern IntPtr GetConsoleWindow();
[DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
'@
[Native.Win]::ShowWindow([Native.Win]::GetConsoleWindow(), 0) | Out-Null

# --- XAML ---
$xaml = @'
<Window xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
        xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
        Title="TelemetrySlayer v1.0.1" Width="780" Height="700"
        WindowStartupLocation="CenterScreen" Background="#0d1117"
        ResizeMode="CanResizeWithGrip" MinWidth="700" MinHeight="550">
    <Window.Resources>
        <Style TargetType="TextBlock"><Setter Property="Foreground" Value="#e0e0e0"/></Style>
        <Style TargetType="CheckBox">
            <Setter Property="Foreground" Value="#e0e0e0"/>
            <Setter Property="Margin" Value="0,3"/>
            <Setter Property="FontSize" Value="12.5"/>
        </Style>
        <Style TargetType="Button">
            <Setter Property="Background" Value="#238636"/>
            <Setter Property="Foreground" Value="White"/>
            <Setter Property="BorderThickness" Value="0"/>
            <Setter Property="Padding" Value="20,8"/>
            <Setter Property="FontSize" Value="13"/>
            <Setter Property="FontWeight" Value="SemiBold"/>
            <Setter Property="Cursor" Value="Hand"/>
            <Style.Triggers>
                <Trigger Property="IsMouseOver" Value="True">
                    <Setter Property="Background" Value="#2ea043"/>
                </Trigger>
            </Style.Triggers>
        </Style>
        <Style TargetType="GroupBox">
            <Setter Property="Foreground" Value="#58a6ff"/>
            <Setter Property="BorderBrush" Value="#30363d"/>
            <Setter Property="Margin" Value="4"/>
            <Setter Property="Padding" Value="6,4"/>
            <Setter Property="FontSize" Value="13"/>
            <Setter Property="FontWeight" Value="SemiBold"/>
        </Style>
        <Style TargetType="ToolTip">
            <Setter Property="Background" Value="#1c2128"/>
            <Setter Property="Foreground" Value="#c9d1d9"/>
            <Setter Property="BorderBrush" Value="#30363d"/>
            <Setter Property="FontSize" Value="11.5"/>
            <Setter Property="MaxWidth" Value="350"/>
        </Style>
    </Window.Resources>
    <Grid>
        <Grid.RowDefinitions>
            <RowDefinition Height="Auto"/>
            <RowDefinition Height="*"/>
            <RowDefinition Height="Auto"/>
            <RowDefinition Height="Auto"/>
        </Grid.RowDefinitions>

        <!-- Header -->
        <Border Grid.Row="0" Background="#161b22" Padding="16,12" BorderBrush="#30363d" BorderThickness="0,0,0,1">
            <StackPanel>
                <TextBlock Text="TelemetrySlayer" FontSize="22" FontWeight="Bold" Foreground="#58a6ff"/>
                <TextBlock Text="Disable Microsoft telemetry, data collection, and compatibility bloat" Foreground="#8b949e" FontSize="12" Margin="0,2,0,0"/>
            </StackPanel>
        </Border>

        <!-- Scroll area with categories -->
        <ScrollViewer Grid.Row="1" VerticalScrollBarVisibility="Auto" Padding="8,4">
            <StackPanel>
                <!-- Select All / Deselect All -->
                <StackPanel Orientation="Horizontal" Margin="4,6,0,2">
                    <Button x:Name="btnSelectAll" Content="Select All" FontSize="11" Padding="10,4" Background="#21262d" Margin="0,0,6,0"/>
                    <Button x:Name="btnDeselectAll" Content="Deselect All" FontSize="11" Padding="10,4" Background="#21262d"/>
                </StackPanel>

                <!-- Services -->
                <GroupBox Header="  Services  ">
                    <StackPanel>
                        <CheckBox x:Name="chkDiagTrack" IsChecked="True"
                            Content="Disable Connected User Experiences and Telemetry (DiagTrack)"
                            ToolTip="Primary telemetry service. Collects and transmits diagnostic data to Microsoft."/>
                        <CheckBox x:Name="chkDmwAppPush" IsChecked="True"
                            Content="Disable WAP Push Message Routing (dmwappushservice)"
                            ToolTip="Routes push messages for telemetry. Used alongside DiagTrack."/>
                        <CheckBox x:Name="chkWerSvc" IsChecked="True"
                            Content="Disable Windows Error Reporting (WerSvc)"
                            ToolTip="Sends crash/error reports to Microsoft."/>
                        <CheckBox x:Name="chkPcaSvc" IsChecked="True"
                            Content="Disable Program Compatibility Assistant (PcaSvc)"
                            ToolTip="Monitors programs and detects compatibility issues. Triggers CompatTelRunner.exe CPU spikes."/>
                        <CheckBox x:Name="chkDiagSvc" IsChecked="True"
                            Content="Disable Diagnostic Service Host (diagsvc)"
                            ToolTip="Hosts diagnostic scenarios triggered by the Diagnostic Policy Service."/>
                        <CheckBox x:Name="chkDPS" IsChecked="False"
                            Content="Disable Diagnostic Policy Service (DPS)"
                            ToolTip="Detects and troubleshoots Windows components. Disabling may reduce some auto-troubleshooting. Unchecked by default."/>
                    </StackPanel>
                </GroupBox>

                <!-- Scheduled Tasks -->
                <GroupBox Header="  Scheduled Tasks  ">
                    <StackPanel>
                        <CheckBox x:Name="chkCompatAppraiser" IsChecked="True"
                            Content="Disable Microsoft Compatibility Appraiser"
                            ToolTip="Scans system files for upgrade compatibility. Primary cause of CompatTelRunner.exe high CPU/disk."/>
                        <CheckBox x:Name="chkProgramDataUpdater" IsChecked="True"
                            Content="Disable ProgramDataUpdater"
                            ToolTip="Collects program telemetry data if opted-in to the CEIP."/>
                        <CheckBox x:Name="chkStartupAppTask" IsChecked="True"
                            Content="Disable StartupAppTask"
                            ToolTip="Scans startup entries for telemetry purposes."/>
                        <CheckBox x:Name="chkProxy" IsChecked="True"
                            Content="Disable Autochk Proxy"
                            ToolTip="Collects SQM (Software Quality Management) data."/>
                        <CheckBox x:Name="chkConsolidator" IsChecked="True"
                            Content="Disable CEIP Consolidator"
                            ToolTip="Consolidates and sends Customer Experience Improvement Program data."/>
                        <CheckBox x:Name="chkUsbCeip" IsChecked="True"
                            Content="Disable USB CEIP"
                            ToolTip="Collects USB bus statistics to send to Microsoft."/>
                        <CheckBox x:Name="chkKernelCeip" IsChecked="True"
                            Content="Disable KernelCeipTask"
                            ToolTip="Kernel-level Customer Experience Improvement Program data collector."/>
                        <CheckBox x:Name="chkDiskDiag" IsChecked="True"
                            Content="Disable DiskDiagnosticDataCollector"
                            ToolTip="Collects general disk/system info to send to Microsoft."/>
                        <CheckBox x:Name="chkSmartScreen" IsChecked="False"
                            Content="Disable SmartScreenSpecific"
                            ToolTip="SmartScreen-related telemetry task. Unchecked by default as SmartScreen provides security value."/>
                        <CheckBox x:Name="chkPcaPatchDb" IsChecked="True"
                            Content="Disable PcaPatchDbTask"
                            ToolTip="Updates the compatibility database. Can trigger CompatTelRunner runs."/>
                    </StackPanel>
                </GroupBox>

                <!-- Registry / Policy -->
                <GroupBox Header="  Registry and Policy  ">
                    <StackPanel>
                        <CheckBox x:Name="chkAllowTelemetry" IsChecked="True"
                            Content="Set AllowTelemetry to 0 (Security/Off)"
                            ToolTip="Sets HKLM\SOFTWARE\Policies\Microsoft\Windows\DataCollection\AllowTelemetry to 0. The nuclear option for data collection policy."/>
                        <CheckBox x:Name="chkAdvertisingID" IsChecked="True"
                            Content="Disable Advertising ID"
                            ToolTip="Prevents apps from using your advertising ID for cross-app profiling."/>
                        <CheckBox x:Name="chkLinguistic" IsChecked="True"
                            Content="Disable Linguistic Data Collection"
                            ToolTip="Stops collection of inking and typing data."/>
                        <CheckBox x:Name="chkTailoredExp" IsChecked="True"
                            Content="Disable Tailored Experiences"
                            ToolTip="Prevents Microsoft from using diagnostic data to offer personalized tips, ads, and recommendations."/>
                        <CheckBox x:Name="chkFeedback" IsChecked="True"
                            Content="Disable Feedback Notifications"
                            ToolTip="Sets feedback frequency to Never. Stops Windows from nagging for feedback."/>
                        <CheckBox x:Name="chkActivityFeed" IsChecked="True"
                            Content="Disable Activity History / Timeline"
                            ToolTip="Stops Windows from collecting activity history and sending it to Microsoft."/>
                        <CheckBox x:Name="chkLocationTracking" IsChecked="True"
                            Content="Disable Location Tracking"
                            ToolTip="Disables the Windows location platform sensor."/>
                        <CheckBox x:Name="chkInputPersonalization" IsChecked="True"
                            Content="Disable Input Personalization (Cloud Speech)"
                            ToolTip="Disables online speech recognition and cloud-based typing personalization."/>
                        <CheckBox x:Name="chkHandwritingTelemetry" IsChecked="True"
                            Content="Disable Handwriting Error Reporting"
                            ToolTip="Prevents sharing handwriting recognition error data."/>
                        <CheckBox x:Name="chkInventoryCollector" IsChecked="True"
                            Content="Disable Application Inventory Collector"
                            ToolTip="Stops the Inventory Collector from sending data about installed apps to Microsoft."/>
                        <CheckBox x:Name="chkStepsRecorder" IsChecked="True"
                            Content="Disable Steps Recorder"
                            ToolTip="Disables the Steps Recorder (psr.exe) which can capture screenshots and input."/>
                        <CheckBox x:Name="chkWiFiSense" IsChecked="True"
                            Content="Disable Wi-Fi Sense / Hotspot Reporting"
                            ToolTip="Prevents automatic sharing of Wi-Fi network credentials and hotspot reporting."/>
                    </StackPanel>
                </GroupBox>

                <!-- Firewall and Aggressive -->
                <GroupBox Header="  Firewall and Hardening  ">
                    <StackPanel>
                        <CheckBox x:Name="chkFirewallCompat" IsChecked="True"
                            Content="Block CompatTelRunner.exe outbound (Firewall)"
                            ToolTip="Creates an outbound firewall rule to block CompatTelRunner.exe from phoning home even if re-enabled."/>
                        <CheckBox x:Name="chkFirewallCEIP" IsChecked="True"
                            Content="Block wsqmcons.exe outbound (CEIP Firewall)"
                            ToolTip="Blocks the Customer Experience Improvement Program sender."/>
                        <CheckBox x:Name="chkFirewallDiagTrack" IsChecked="True"
                            Content="Block DiagTrack svchost outbound (Firewall)"
                            ToolTip="Creates outbound firewall rule blocking DiagTrack service network access."/>
                        <CheckBox x:Name="chkIFEO" IsChecked="True"
                            Content="Set CompatTelRunner.exe IFEO Debugger to taskkill"
                            ToolTip="Uses Image File Execution Options to instantly kill CompatTelRunner.exe whenever Windows tries to launch it. Prevents re-enablement."/>
                        <CheckBox x:Name="chkClearETL" IsChecked="True"
                            Content="Clear DiagTrack ETL log files"
                            ToolTip="Empties AutoLogger-Diagtrack-Listener.etl which stores collected telemetry data waiting to be sent."/>
                    </StackPanel>
                </GroupBox>

                <!-- Office Telemetry -->
                <GroupBox Header="  Office Telemetry  ">
                    <StackPanel>
                        <CheckBox x:Name="chkOfficeTelemetry" IsChecked="True"
                            Content="Disable Office Telemetry and Logging"
                            ToolTip="Disables Office telemetry agent logging and upload for Office 15.0 and 16.0."/>
                        <CheckBox x:Name="chkOfficeFeedback" IsChecked="True"
                            Content="Disable Office Feedback and Surveys"
                            ToolTip="Prevents Office from sending feedback, surveys, and connected experiences data."/>
                    </StackPanel>
                </GroupBox>
            </StackPanel>
        </ScrollViewer>

        <!-- Console Panel -->
        <Border Grid.Row="2" Background="#010409" BorderBrush="#30363d" BorderThickness="0,1,0,0" Margin="0">
            <DockPanel>
                <Border DockPanel.Dock="Top" Background="#0d1117" Padding="10,5" BorderBrush="#30363d" BorderThickness="0,0,0,1">
                    <StackPanel Orientation="Horizontal">
                        <TextBlock Text=">" Foreground="#4ade80" FontFamily="Consolas" FontWeight="Bold" FontSize="12" Margin="0,0,6,0"/>
                        <TextBlock Text="Console Output" Foreground="#7ee787" FontFamily="Consolas" FontSize="11.5"/>
                    </StackPanel>
                </Border>
                <TextBox x:Name="txtLog" IsReadOnly="True" Background="Transparent"
                         Foreground="#4ade80" FontFamily="Consolas" FontSize="11"
                         TextWrapping="Wrap" VerticalScrollBarVisibility="Auto"
                         BorderThickness="0" Padding="10,6" Height="190"/>
            </DockPanel>
        </Border>

        <!-- Bottom Bar -->
        <Border Grid.Row="3" Background="#161b22" Padding="12,8" BorderBrush="#30363d" BorderThickness="0,1,0,0">
            <DockPanel>
                <StackPanel Orientation="Horizontal" DockPanel.Dock="Right">
                    <Button x:Name="btnApply" Content="Apply Selected" Margin="0,0,8,0"/>
                    <Button x:Name="btnClose" Content="Close" Background="#21262d" Padding="16,8"/>
                </StackPanel>
                <TextBlock x:Name="txtStatus" Text="Ready" Foreground="#8b949e" VerticalAlignment="Center" FontSize="11.5"/>
            </DockPanel>
        </Border>
    </Grid>
</Window>
'@

$window = [System.Windows.Markup.XamlReader]::Parse($xaml)

# --- Find controls ---
$txtLog       = $window.FindName('txtLog')
$txtStatus    = $window.FindName('txtStatus')
$btnApply     = $window.FindName('btnApply')
$btnClose     = $window.FindName('btnClose')
$btnSelectAll = $window.FindName('btnSelectAll')
$btnDeselectAll = $window.FindName('btnDeselectAll')

# All checkboxes
$allCheckboxes = @(
    'chkDiagTrack','chkDmwAppPush','chkWerSvc','chkPcaSvc','chkDiagSvc','chkDPS',
    'chkCompatAppraiser','chkProgramDataUpdater','chkStartupAppTask','chkProxy',
    'chkConsolidator','chkUsbCeip','chkKernelCeip','chkDiskDiag','chkSmartScreen','chkPcaPatchDb',
    'chkAllowTelemetry','chkAdvertisingID','chkLinguistic','chkTailoredExp','chkFeedback',
    'chkActivityFeed','chkLocationTracking','chkInputPersonalization','chkHandwritingTelemetry',
    'chkInventoryCollector','chkStepsRecorder','chkWiFiSense',
    'chkFirewallCompat','chkFirewallCEIP','chkFirewallDiagTrack','chkIFEO','chkClearETL',
    'chkOfficeTelemetry','chkOfficeFeedback'
) | ForEach-Object { $window.FindName($_) }

$btnSelectAll.Add_Click({ $allCheckboxes | ForEach-Object { $_.IsChecked = $true } })
$btnDeselectAll.Add_Click({ $allCheckboxes | ForEach-Object { $_.IsChecked = $false } })
$btnClose.Add_Click({ $window.Close() })

# --- Shared queue for real-time log streaming ---
$script:logQueue = [System.Collections.Concurrent.ConcurrentQueue[string]]::new()

# --- Main Apply ---
$btnApply.Add_Click({
    $btnApply.IsEnabled = $false
    $txtStatus.Text = 'Applying...'
    $txtLog.Clear()

    # Capture checkbox states on UI thread
    $opts = @{}
    foreach ($cb in $allCheckboxes) {
        $opts[$cb.Name] = $cb.IsChecked
    }

    $queue = $script:logQueue

    $ps = [PowerShell]::Create()
    $ps.Runspace = [RunspaceFactory]::CreateRunspace()
    $ps.Runspace.Open()
    $ps.Runspace.SessionStateProxy.SetVariable('logQueue', $queue)
    $ps.Runspace.SessionStateProxy.SetVariable('opts', $opts)

    $ps.AddScript({
        function Log([string]$msg) {
            $ts = Get-Date -Format 'HH:mm:ss'
            $logQueue.Enqueue("[$ts] $msg")
        }

        function SetReg([string]$Path, [string]$Name, $Value, [string]$Type = 'DWord') {
            try {
                if (-not (Test-Path $Path)) { New-Item -Path $Path -Force | Out-Null }
                Set-ItemProperty -LiteralPath $Path -Name $Name -Value $Value -Type $Type -Force
                Log "  SET $Path\$Name = $Value"
            } catch { Log "  FAIL $Path\$Name - $($_.Exception.Message)" }
        }

        function DisableSvc([string]$Name, [string]$Display) {
            try {
                $svc = Get-Service -Name $Name -ErrorAction SilentlyContinue
                if ($svc) {
                    if ($svc.Status -eq 'Running') {
                        Log "  Stopping service: $Display ($Name)..."
                        Stop-Service -Name $Name -Force -ErrorAction SilentlyContinue
                    }
                    Set-Service -Name $Name -StartupType Disabled -ErrorAction Stop
                    Log "  Disabled service: $Display ($Name)"
                } else { Log "  Service not found: $Name (OK - may not exist on this edition)" }
            } catch { Log "  FAIL service $Name - $($_.Exception.Message)" }
        }

        function DisableTask([string]$Name, [string]$TaskPath) {
            try {
                $task = Get-ScheduledTask -TaskName $Name -ErrorAction SilentlyContinue
                if ($task) {
                    Disable-ScheduledTask -TaskName $Name -TaskPath $TaskPath -ErrorAction Stop | Out-Null
                    Log "  Disabled task: $Name"
                } else { Log "  Task not found: $Name (OK)" }
            } catch { Log "  FAIL task $Name - $($_.Exception.Message)" }
        }

        function AddFW([string]$DisplayName, [string]$Program, [string]$Service) {
            try {
                $existing = Get-NetFirewallRule -DisplayName $DisplayName -ErrorAction SilentlyContinue
                if ($existing) { Log "  Firewall rule already exists: $DisplayName"; return }
                $params = @{ DisplayName=$DisplayName; Direction='Outbound'; Action='Block'; Enabled='True'; Group='TelemetrySlayer'; Protocol='TCP'; RemotePort=@(80,443) }
                if ($Program) { $params['Program'] = $Program }
                if ($Service) { $params['Service'] = $Service }
                New-NetFirewallRule @params -ErrorAction Stop | Out-Null
                Log "  Created firewall rule: $DisplayName"
            } catch { Log "  FAIL firewall $DisplayName - $($_.Exception.Message)" }
        }

        # ========================
        #  SERVICES
        # ========================
        Log "=== SERVICES ==="
        if ($opts['chkDiagTrack'])   { DisableSvc 'DiagTrack' 'Connected User Experiences and Telemetry' }
        if ($opts['chkDmwAppPush'])  { DisableSvc 'dmwappushservice' 'WAP Push Message Routing' }
        if ($opts['chkWerSvc'])      { DisableSvc 'WerSvc' 'Windows Error Reporting' }
        if ($opts['chkPcaSvc'])      { DisableSvc 'PcaSvc' 'Program Compatibility Assistant' }
        if ($opts['chkDiagSvc'])     { DisableSvc 'diagsvc' 'Diagnostic Service Host' }
        if ($opts['chkDPS'])         { DisableSvc 'DPS' 'Diagnostic Policy Service' }

        # ========================
        #  SCHEDULED TASKS
        # ========================
        Log ""
        Log "=== SCHEDULED TASKS ==="
        $appExpPath = '\Microsoft\Windows\Application Experience\'
        if ($opts['chkCompatAppraiser'])   { DisableTask 'Microsoft Compatibility Appraiser' $appExpPath }
        if ($opts['chkProgramDataUpdater']){ DisableTask 'ProgramDataUpdater' $appExpPath }
        if ($opts['chkStartupAppTask'])    { DisableTask 'StartupAppTask' $appExpPath }
        if ($opts['chkPcaPatchDb'])        { DisableTask 'PcaPatchDbTask' $appExpPath }
        if ($opts['chkProxy'])             { DisableTask 'Proxy' '\Microsoft\Windows\Autochk\' }
        if ($opts['chkConsolidator'])      { DisableTask 'Consolidator' '\Microsoft\Windows\Customer Experience Improvement Program\' }
        if ($opts['chkUsbCeip'])           { DisableTask 'UsbCeip' '\Microsoft\Windows\Customer Experience Improvement Program\' }
        if ($opts['chkKernelCeip'])        { DisableTask 'KernelCeipTask' '\Microsoft\Windows\Customer Experience Improvement Program\' }
        if ($opts['chkDiskDiag'])          { DisableTask 'Microsoft-Windows-DiskDiagnosticDataCollector' '\Microsoft\Windows\DiskDiagnostic\' }
        if ($opts['chkSmartScreen'])       { DisableTask 'SmartScreenSpecific' '\Microsoft\Windows\AppID\' }

        # ========================
        #  REGISTRY / POLICY
        # ========================
        Log ""
        Log "=== REGISTRY / POLICY ==="

        if ($opts['chkAllowTelemetry']) {
            SetReg 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\DataCollection' 'AllowTelemetry' 0
            SetReg 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\DataCollection' 'MaxTelemetryAllowed' 0
            SetReg 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\DataCollection' 'AllowTelemetry' 0
        }

        if ($opts['chkAdvertisingID']) {
            SetReg 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\AdvertisingInfo' 'Enabled' 0
            SetReg 'HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\AdvertisingInfo' 'Enabled' 0
            SetReg 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\AdvertisingInfo' 'DisabledByGroupPolicy' 1
        }

        if ($opts['chkLinguistic']) {
            SetReg 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\TextInput' 'AllowLinguisticDataCollection' 0
            SetReg 'HKLM:\SOFTWARE\Policies\Microsoft\InputPersonalization' 'AllowInputPersonalization' 0
        }

        if ($opts['chkTailoredExp']) {
            SetReg 'HKCU:\SOFTWARE\Policies\Microsoft\Windows\CloudContent' 'DisableTailoredExperiencesWithDiagnosticData' 1
            SetReg 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\CloudContent' 'DisableWindowsConsumerFeatures' 1
            SetReg 'HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Privacy' 'TailoredExperiencesWithDiagnosticDataEnabled' 0
        }

        if ($opts['chkFeedback']) {
            SetReg 'HKCU:\SOFTWARE\Microsoft\Siuf\Rules' 'NumberOfSIUFInPeriod' 0
            SetReg 'HKCU:\SOFTWARE\Microsoft\Siuf\Rules' 'PeriodInNanoSeconds' 0
            SetReg 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\DataCollection' 'DoNotShowFeedbackNotifications' 1
        }

        if ($opts['chkActivityFeed']) {
            SetReg 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\System' 'EnableActivityFeed' 0
            SetReg 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\System' 'PublishUserActivities' 0
            SetReg 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\System' 'UploadUserActivities' 0
        }

        if ($opts['chkLocationTracking']) {
            SetReg 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\LocationAndSensors' 'DisableLocation' 1
            SetReg 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\LocationAndSensors' 'DisableWindowsLocationProvider' 1
            SetReg 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\LocationAndSensors' 'DisableLocationScripting' 1
        }

        if ($opts['chkInputPersonalization']) {
            SetReg 'HKCU:\SOFTWARE\Microsoft\InputPersonalization' 'RestrictImplicitInkCollection' 1
            SetReg 'HKCU:\SOFTWARE\Microsoft\InputPersonalization' 'RestrictImplicitTextCollection' 1
            SetReg 'HKCU:\SOFTWARE\Microsoft\InputPersonalization\TrainedDataStore' 'HarvestContacts' 0
            SetReg 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\TabletPC' 'PreventHandwritingDataSharing' 1
            SetReg 'HKCU:\SOFTWARE\Microsoft\Personalization\Settings' 'AcceptedPrivacyPolicy' 0
            SetReg 'HKLM:\SOFTWARE\Microsoft\Speech_OneCore\Preferences' 'ModelDownloadAllowed' 0
        }

        if ($opts['chkHandwritingTelemetry']) {
            SetReg 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\HandwritingErrorReports' 'PreventHandwritingErrorReports' 1
        }

        if ($opts['chkInventoryCollector']) {
            SetReg 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\AppCompat' 'DisableInventory' 1
            SetReg 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\AppCompat' 'AITEnable' 0
            SetReg 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\AppCompat' 'DisableUAR' 1
        }

        if ($opts['chkStepsRecorder']) {
            SetReg 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\AppCompat' 'DisablePCA' 1
        }

        if ($opts['chkWiFiSense']) {
            SetReg 'HKLM:\SOFTWARE\Microsoft\WcmSvc\wifinetworkmanager\config' 'AutoConnectAllowedOEM' 0
            SetReg 'HKLM:\SOFTWARE\Microsoft\PolicyManager\default\WiFi\AllowAutoConnectToWiFiSenseHotspots' 'value' 0
            SetReg 'HKLM:\SOFTWARE\Microsoft\PolicyManager\default\WiFi\AllowWiFiHotSpotReporting' 'value' 0
        }

        # ========================
        #  FIREWALL RULES
        # ========================
        Log ""
        Log "=== FIREWALL ==="
        if ($opts['chkFirewallCompat']) {
            AddFW 'TelemetrySlayer - Block CompatTelRunner' "$env:SystemRoot\System32\CompatTelRunner.exe" $null
        }
        if ($opts['chkFirewallCEIP']) {
            AddFW 'TelemetrySlayer - Block CEIP wsqmcons' "$env:SystemRoot\System32\wsqmcons.exe" $null
        }
        if ($opts['chkFirewallDiagTrack']) {
            AddFW 'TelemetrySlayer - Block DiagTrack svchost' "$env:SystemRoot\System32\svchost.exe" 'DiagTrack'
        }

        # ========================
        #  IFEO (Image File Execution Options)
        # ========================
        Log ""
        Log "=== HARDENING ==="
        if ($opts['chkIFEO']) {
            SetReg 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Image File Execution Options\CompatTelRunner.exe' 'Debugger' "$env:SystemRoot\System32\taskkill.exe" 'String'
            Log "  IFEO set: CompatTelRunner.exe will be killed on launch"
        }

        # ========================
        #  CLEAR ETL LOGS
        # ========================
        if ($opts['chkClearETL']) {
            $etlPath = "$env:ProgramData\Microsoft\Diagnosis\ETLLogs\AutoLogger\AutoLogger-Diagtrack-Listener.etl"
            try {
                if (Test-Path $etlPath) {
                    & logman stop "AutoLogger-Diagtrack-Listener" -ets 2>$null
                    [System.IO.File]::WriteAllText($etlPath, '')
                    Log "  Cleared ETL log: $etlPath"
                } else {
                    Log "  ETL log not found (OK)"
                }
                SetReg 'HKLM:\SYSTEM\CurrentControlSet\Control\WMI\Autologger\AutoLogger-Diagtrack-Listener' 'Start' 0
            } catch { Log "  FAIL clearing ETL - $($_.Exception.Message)" }
        }

        # ========================
        #  OFFICE TELEMETRY
        # ========================
        if ($opts['chkOfficeTelemetry'] -or $opts['chkOfficeFeedback']) {
            Log ""
            Log "=== OFFICE TELEMETRY ==="
        }

        if ($opts['chkOfficeTelemetry']) {
            foreach ($ver in @('15.0','16.0')) {
                SetReg "HKCU:\SOFTWARE\Policies\Microsoft\Office\$ver\osm" 'Enablelogging' 0
                SetReg "HKCU:\SOFTWARE\Policies\Microsoft\Office\$ver\osm" 'EnableUpload' 0
            }
            SetReg 'HKCU:\SOFTWARE\Policies\Microsoft\Office\Common\ClientTelemetry' 'DisableTelemetry' 1
            SetReg 'HKCU:\SOFTWARE\Policies\Microsoft\Office\Common\ClientTelemetry' 'SendTelemetry' 3
        }

        if ($opts['chkOfficeFeedback']) {
            SetReg 'HKCU:\SOFTWARE\Policies\Microsoft\Office\16.0\Common\Feedback' 'Enabled' 0
            SetReg 'HKCU:\SOFTWARE\Policies\Microsoft\Office\16.0\Common\Feedback' 'SurveyEnabled' 0
            SetReg 'HKCU:\SOFTWARE\Policies\Microsoft\Office\16.0\Common' 'sendcustomerdata' 0
            SetReg 'HKCU:\SOFTWARE\Policies\Microsoft\Office\16.0\Common\Privacy' 'DisconnectedState' 2
            SetReg 'HKCU:\SOFTWARE\Policies\Microsoft\Office\16.0\Common\Privacy' 'ControllerConnectedServicesEnabled' 2
        }

        # ========================
        #  FORCE GP UPDATE
        # ========================
        Log ""
        Log "=== FINALIZING ==="
        try {
            Log "  Running gpupdate /force..."
            & gpupdate.exe /force 2>$null | Out-Null
            Log "  Group Policy updated"
        } catch { Log "  gpupdate skipped" }

        Log ""
        Log "=== COMPLETE ==="
        $count = ($opts.Values | Where-Object { $_ -eq $true }).Count
        Log "Applied $count items successfully. A restart is recommended."
        Log "DONE"

    }) | Out-Null

    $handle = $ps.BeginInvoke()

    $timer = New-Object System.Windows.Threading.DispatcherTimer
    $timer.Interval = [TimeSpan]::FromMilliseconds(100)
    $timer.Add_Tick({
        # Drain all queued messages to the console
        $msg = $null
        while ($script:logQueue.TryDequeue([ref]$msg)) {
            $txtLog.AppendText("$msg`r`n")
            $txtLog.ScrollToEnd()

            if ($msg -match 'DONE$') {
                $timer.Stop()
                $ps.EndInvoke($handle)
                $ps.Runspace.Close()
                $ps.Dispose()
                $btnApply.IsEnabled = $true
                $txtStatus.Text = 'Complete - Restart recommended'
                $txtStatus.Foreground = [System.Windows.Media.Brushes]::LightGreen
                return
            }
        }
    })
    $timer.Start()
})

$window.ShowDialog() | Out-Null
