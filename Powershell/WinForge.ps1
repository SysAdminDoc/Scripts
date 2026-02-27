#Requires -Version 5.1
<#
.SYNOPSIS
    WinForge v0.0.1 - Premium Windows System Utility
.DESCRIPTION
    All-in-one Windows utility: Install programs, apply system tweaks,
    configure features, and manage Windows Updates.
    Inspired by Chris Titus Tech's WinUtil - rebuilt with a premium UI.
.NOTES
    Run as Administrator for full functionality.
    Uses winget for package management.
#>

# ── Auto-Elevate ───────────────────────────────────────────────────────────────
if (-not ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(
    [Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Start-Process powershell.exe -Verb RunAs -ArgumentList "-ExecutionPolicy Bypass -File `"$PSCommandPath`""
    exit
}

# ── Assemblies ─────────────────────────────────────────────────────────────────
Add-Type -AssemblyName PresentationFramework
Add-Type -AssemblyName PresentationCore
Add-Type -AssemblyName WindowsBase
Add-Type -AssemblyName System.Windows.Forms

# ── Hide Console ───────────────────────────────────────────────────────────────
Add-Type -Name Win -Namespace Native -MemberDefinition @'
[DllImport("kernel32.dll")] public static extern IntPtr GetConsoleWindow();
[DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
'@
[Native.Win]::ShowWindow([Native.Win]::GetConsoleWindow(), 0) | Out-Null

# ── App Data ───────────────────────────────────────────────────────────────────
$script:AppCategories = [ordered]@{
    'Browsers' = @(
        @{Name='Google Chrome';         Id='Google.Chrome'}
        @{Name='Mozilla Firefox';       Id='Mozilla.Firefox'}
        @{Name='Brave Browser';         Id='Brave.Brave'}
        @{Name='Microsoft Edge';        Id='Microsoft.Edge'}
        @{Name='Vivaldi';               Id='VivaldiTechnologies.Vivaldi'}
        @{Name='Opera';                 Id='Opera.Opera'}
        @{Name='Waterfox';              Id='Waterfox.Waterfox'}
        @{Name='Tor Browser';           Id='TorProject.TorBrowser'}
        @{Name='LibreWolf';             Id='LibreWolf.LibreWolf'}
        @{Name='Ungoogled Chromium';    Id='eloston.ungoogled-chromium'}
    )
    'Communications' = @(
        @{Name='Discord';               Id='Discord.Discord'}
        @{Name='Zoom';                  Id='Zoom.Zoom'}
        @{Name='Microsoft Teams';       Id='Microsoft.Teams'}
        @{Name='Slack';                 Id='SlackTechnologies.Slack'}
        @{Name='Telegram';              Id='Telegram.TelegramDesktop'}
        @{Name='Signal';                Id='OpenWhisperSystems.Signal'}
        @{Name='Thunderbird';           Id='Mozilla.Thunderbird'}
        @{Name='Skype';                 Id='Microsoft.Skype'}
    )
    'Development' = @(
        @{Name='Visual Studio Code';    Id='Microsoft.VisualStudioCode'}
        @{Name='Git';                   Id='Git.Git'}
        @{Name='Node.js LTS';           Id='OpenJS.NodeJS.LTS'}
        @{Name='Python 3';              Id='Python.Python.3.12'}
        @{Name='Windows Terminal';      Id='Microsoft.WindowsTerminal'}
        @{Name='PowerShell 7';          Id='Microsoft.PowerShell'}
        @{Name='Notepad++';             Id='Notepad++.Notepad++'}
        @{Name='Sublime Text';          Id='SublimeHQ.SublimeText.4'}
        @{Name='Docker Desktop';        Id='Docker.DockerDesktop'}
        @{Name='Postman';               Id='Postman.Postman'}
        @{Name='WinSCP';                Id='WinSCP.WinSCP'}
        @{Name='PuTTY';                 Id='PuTTY.PuTTY'}
        @{Name='FileZilla';             Id='TimKosse.FileZilla.Client'}
        @{Name='GitHub Desktop';        Id='GitHub.GitHubDesktop'}
    )
    'Documents' = @(
        @{Name='Adobe Acrobat Reader';  Id='Adobe.Acrobat.Reader.64-bit'}
        @{Name='LibreOffice';           Id='TheDocumentFoundation.LibreOffice'}
        @{Name='Obsidian';              Id='Obsidian.Obsidian'}
        @{Name='Notion';                Id='Notion.Notion'}
        @{Name='SumatraPDF';            Id='SumatraPDF.SumatraPDF'}
        @{Name='Calibre';               Id='calibre.calibre'}
    )
    'Gaming' = @(
        @{Name='Steam';                 Id='Valve.Steam'}
        @{Name='Epic Games Launcher';   Id='EpicGames.EpicGamesLauncher'}
        @{Name='GOG Galaxy';            Id='GOG.Galaxy'}
        @{Name='EA App';                Id='ElectronicArts.EADesktop'}
        @{Name='Prism Launcher';        Id='PrismLauncher.PrismLauncher'}
    )
    'Multimedia' = @(
        @{Name='VLC Media Player';      Id='VideoLAN.VLC'}
        @{Name='Spotify';               Id='Spotify.Spotify'}
        @{Name='Audacity';              Id='Audacity.Audacity'}
        @{Name='OBS Studio';            Id='OBSProject.OBSStudio'}
        @{Name='HandBrake';             Id='HandBrake.HandBrake'}
        @{Name='GIMP';                  Id='GIMP.GIMP'}
        @{Name='Inkscape';              Id='Inkscape.Inkscape'}
        @{Name='paint.net';             Id='dotPDN.PaintDotNet'}
        @{Name='foobar2000';            Id='PeterPawlowski.foobar2000'}
        @{Name='MusicBee';              Id='MusicBee.MusicBee'}
        @{Name='ShareX';                Id='ShareX.ShareX'}
        @{Name='Greenshot';             Id='Greenshot.Greenshot'}
        @{Name='FFmpeg';                Id='Gyan.FFmpeg'}
        @{Name='ImageMagick';           Id='ImageMagick.ImageMagick'}
    )
    'Pro Tools' = @(
        @{Name='PowerToys';             Id='Microsoft.PowerToys'}
        @{Name='Sysinternals Suite';    Id='Microsoft.Sysinternals'}
        @{Name='Wireshark';             Id='WiresharkFoundation.Wireshark'}
        @{Name='VMware Workstation Player'; Id='VMware.WorkstationPlayer'}
        @{Name='VirtualBox';            Id='Oracle.VirtualBox'}
        @{Name='WinDbg Preview';        Id='Microsoft.WinDbg'}
        @{Name='HWiNFO';                Id='REALiX.HWiNFO'}
        @{Name='CPU-Z';                 Id='CPUID.CPU-Z'}
    )
    'Utilities' = @(
        @{Name='7-Zip';                 Id='7zip.7zip'}
        @{Name='WinRAR';                Id='RARLab.WinRAR'}
        @{Name='Everything Search';     Id='voidtools.Everything'}
        @{Name='TreeSize Free';         Id='JAMSoftware.TreeSize.Free'}
        @{Name='Bitwarden';             Id='Bitwarden.Bitwarden'}
        @{Name='KeePassXC';             Id='KeePassXCTeam.KeePassXC'}
        @{Name='qBittorrent';           Id='qBittorrent.qBittorrent'}
        @{Name='NanaZip';               Id='M2Team.NanaZip'}
        @{Name='Revo Uninstaller';      Id='VS Reckoning.RevoUninstaller'}
        @{Name='BleachBit';             Id='BleachBit.BleachBit'}
        @{Name='Rufus';                 Id='Rufus.Rufus'}
        @{Name='Etcher';                Id='Balena.Etcher'}
        @{Name='WizTree';               Id='AntibodySoftware.WizTree'}
        @{Name='CrystalDiskInfo';       Id='CrystalDewWorld.CrystalDiskInfo'}
        @{Name='CrystalDiskMark';       Id='CrystalDewWorld.CrystalDiskMark'}
    )
}

$script:TweakCategories = [ordered]@{
    'Essential Tweaks' = @(
        @{Name='Create Restore Point';              Key='RestorePoint';       Desc='Creates a system restore point before making changes'}
        @{Name='Delete Temporary Files';             Key='TempFiles';          Desc='Removes temporary files to free disk space'}
        @{Name='Disable Telemetry';                  Key='Telemetry';          Desc='Disables Windows telemetry and data collection'}
        @{Name='Disable Activity History';           Key='ActivityHistory';    Desc='Prevents Windows from tracking your activity history'}
        @{Name='Disable Location Tracking';          Key='LocationTracking';   Desc='Disables location tracking services'}
        @{Name='Disable Hibernation';                Key='Hibernation';        Desc='Disables hibernation to free disk space'}
        @{Name='Disable ConsumerFeatures';           Key='ConsumerFeatures';   Desc='Removes suggested apps and consumer features'}
        @{Name='Set Services to Manual';             Key='ServicesManual';     Desc='Sets non-essential services to manual start'}
        @{Name='Disable PowerShell 7 Telemetry';    Key='PS7Telemetry';       Desc='Disables PowerShell 7 telemetry collection'}
        @{Name='Remove Widgets';                     Key='Widgets';            Desc='Removes the Windows 11 Widgets feature'}
        @{Name='Enable End Task in Taskbar';         Key='EndTask';            Desc='Adds End Task option to taskbar right-click'}
        @{Name='Run Disk Cleanup';                   Key='DiskCleanup';        Desc='Runs Windows Disk Cleanup utility'}
    )
    'Advanced Tweaks' = @(
        @{Name='Disable Cortana';                    Key='Cortana';            Desc='Disables Cortana assistant'}
        @{Name='Disable Xbox GameDVR';               Key='GameDVR';            Desc='Disables Xbox Game DVR and Game Bar'}
        @{Name='Disable WiFi Sense';                 Key='WiFiSense';          Desc='Disables WiFi Sense (auto-connect to open hotspots)'}
        @{Name='Disable Storage Sense';              Key='StorageSense';       Desc='Disables automatic storage management'}
        @{Name='Disable Copilot';                    Key='Copilot';            Desc='Disables Windows Copilot AI assistant'}
        @{Name='Disable Recall';                     Key='Recall';             Desc='Disables Windows Recall feature'}
        @{Name='Disable News and Interests';         Key='NewsInterests';      Desc='Removes News and Interests from taskbar'}
        @{Name='Disable Bing Search in Start';       Key='BingSearch';         Desc='Removes Bing web results from Start Menu search'}
        @{Name='Disable Search Highlights';          Key='SearchHighlights';   Desc='Removes search highlights from Start Menu'}
        @{Name='Show File Extensions';               Key='FileExtensions';     Desc='Shows file extensions in Explorer'}
        @{Name='Show Hidden Files';                  Key='HiddenFiles';        Desc='Shows hidden files and folders in Explorer'}
        @{Name='Disable Mouse Acceleration';         Key='MouseAccel';         Desc='Disables mouse acceleration for precision'}
        @{Name='Classic Right-Click Menu (W11)';     Key='ClassicContext';     Desc='Restores the classic right-click context menu'}
        @{Name='Ultimate Performance Power Plan';    Key='UltimatePower';      Desc='Enables the Ultimate Performance power plan'}
    )
    'Privacy Tweaks' = @(
        @{Name='Disable Advertising ID';             Key='AdvertisingID';      Desc='Prevents apps from using your Advertising ID'}
        @{Name='Disable App Launch Tracking';        Key='AppLaunchTracking';  Desc='Stops Windows from tracking which apps you launch'}
        @{Name='Disable Feedback Requests';          Key='FeedbackRequests';   Desc='Disables Windows feedback notifications'}
        @{Name='Disable Tailored Experiences';       Key='TailoredExp';        Desc='Stops personalized tips and suggestions'}
        @{Name='Disable Diagnostic Data';            Key='DiagnosticData';     Desc='Sets diagnostic data to minimum required'}
        @{Name='Disable Clipboard History';          Key='ClipboardHistory';   Desc='Disables cloud clipboard syncing'}
        @{Name='Disable Online Speech Recognition';  Key='SpeechRecognition';  Desc='Disables cloud-based speech recognition'}
        @{Name='Disable Input Personalization';      Key='InputPersonal';      Desc='Stops Windows from learning your typing/inking'}
    )
}

$script:ConfigFeatures = [ordered]@{
    'Windows Features' = @(
        @{Name='.NET Framework 3.5';         Key='NetFX3';         Feature='NetFx3'}
        @{Name='Hyper-V';                    Key='HyperV';         Feature='Microsoft-Hyper-V-All'}
        @{Name='Windows Sandbox';            Key='Sandbox';        Feature='Containers-DisposableClientVM'}
        @{Name='WSL (Linux Subsystem)';      Key='WSL';            Feature='Microsoft-Windows-Subsystem-Linux;VirtualMachinePlatform'}
        @{Name='NFS Client';                 Key='NFS';            Feature='ServicesForNFS-ClientOnly;ClientForNFS-Infrastructure'}
        @{Name='Windows Media Player';       Key='WMP';            Feature='WindowsMediaPlayer'}
        @{Name='DirectPlay';                 Key='DirectPlay';     Feature='DirectPlay'}
    )
    'System Fixes' = @(
        @{Name='Reset Windows Update';       Key='ResetWU';        Fix='WindowsUpdate'}
        @{Name='System File Checker (SFC)';  Key='SFC';            Fix='SFC'}
        @{Name='DISM Repair Image';          Key='DISM';           Fix='DISM'}
        @{Name='Reset Network Stack';        Key='ResetNetwork';   Fix='Network'}
        @{Name='Clear DNS Cache';            Key='ClearDNS';       Fix='DNS'}
        @{Name='Set Up Autologon';           Key='Autologon';      Fix='Autologon'}
    )
    'Legacy Panels' = @(
        @{Name='Control Panel';              Key='CtrlPanel';      Panel='control'}
        @{Name='Network Connections';        Key='NetConn';        Panel='ncpa.cpl'}
        @{Name='Power Options';              Key='PowerOpt';       Panel='powercfg.cpl'}
        @{Name='System Properties';          Key='SysProp';        Panel='sysdm.cpl'}
        @{Name='Sound Settings';             Key='Sound';          Panel='mmsys.cpl'}
        @{Name='Device Manager';             Key='DevMgr';         Panel='devmgmt.msc'}
        @{Name='Disk Management';            Key='DiskMgmt';       Panel='diskmgmt.msc'}
        @{Name='User Accounts';              Key='UserAccts';      Panel='netplwiz'}
        @{Name='Programs and Features';      Key='ProgFeat';       Panel='appwiz.cpl'}
        @{Name='Windows Features';           Key='WinFeat';        Panel='optionalfeatures'}
        @{Name='Services';                   Key='Services';       Panel='services.msc'}
        @{Name='Group Policy Editor';        Key='GroupPolicy';    Panel='gpedit.msc'}
        @{Name='Event Viewer';               Key='EventViewer';    Panel='eventvwr.msc'}
        @{Name='Task Scheduler';             Key='TaskSched';      Panel='taskschd.msc'}
    )
}

# ── XAML ───────────────────────────────────────────────────────────────────────
$xaml = @'
<Window xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
        xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
        Title="WinForge v0.0.1" Width="1100" Height="740" MinWidth="900" MinHeight="600"
        WindowStartupLocation="CenterScreen" Background="#0d0d12"
        FontFamily="Segoe UI" FontSize="13">
    <Window.Resources>
        <!-- ComboBox Toggle Button Template -->
        <ControlTemplate x:Key="ComboBoxToggleButton" TargetType="ToggleButton">
            <Grid>
                <Grid.ColumnDefinitions>
                    <ColumnDefinition/>
                    <ColumnDefinition Width="20"/>
                </Grid.ColumnDefinitions>
                <Border x:Name="Border" Grid.ColumnSpan="2" Background="#1e1e2e" BorderBrush="#333346" BorderThickness="1" CornerRadius="4"/>
                <Border Grid.Column="0" Background="#1e1e2e" BorderBrush="Transparent" BorderThickness="0" CornerRadius="4,0,0,4" Margin="1"/>
                <Path x:Name="Arrow" Grid.Column="1" Fill="#9999aa" HorizontalAlignment="Center" VerticalAlignment="Center" Data="M0,0 L4,4 L8,0 Z"/>
            </Grid>
            <ControlTemplate.Triggers>
                <Trigger Property="IsMouseOver" Value="True">
                    <Setter TargetName="Border" Property="Background" Value="#282840"/>
                </Trigger>
            </ControlTemplate.Triggers>
        </ControlTemplate>
        <ControlTemplate x:Key="ComboBoxTemplate" TargetType="ComboBox">
            <Grid>
                <ToggleButton Name="ToggleButton" Template="{StaticResource ComboBoxToggleButton}"
                              Focusable="False" ClickMode="Press"
                              IsChecked="{Binding Path=IsDropDownOpen, Mode=TwoWay, RelativeSource={RelativeSource TemplatedParent}}"/>
                <ContentPresenter Name="ContentSite" IsHitTestVisible="False"
                                  Content="{TemplateBinding SelectionBoxItem}"
                                  ContentTemplate="{TemplateBinding SelectionBoxItemTemplate}"
                                  Margin="8,3,25,3" VerticalAlignment="Center" HorizontalAlignment="Left"/>
                <Popup Name="Popup" Placement="Bottom" IsOpen="{TemplateBinding IsDropDownOpen}"
                       AllowsTransparency="True" Focusable="False" PopupAnimation="Slide">
                    <Grid Name="DropDown" SnapsToDevicePixels="True"
                          MinWidth="{TemplateBinding ActualWidth}" MaxHeight="{TemplateBinding MaxDropDownHeight}">
                        <Border x:Name="DropDownBorder" Background="#1a1a2e" BorderThickness="1" BorderBrush="#333346" CornerRadius="4">
                            <Border.Effect>
                                <DropShadowEffect Color="Black" BlurRadius="12" ShadowDepth="3" Opacity="0.6"/>
                            </Border.Effect>
                        </Border>
                        <ScrollViewer Margin="4,6,4,6" SnapsToDevicePixels="True">
                            <StackPanel IsItemsHost="True" KeyboardNavigation.DirectionalNavigation="Contained"/>
                        </ScrollViewer>
                    </Grid>
                </Popup>
            </Grid>
        </ControlTemplate>
        <Style TargetType="ComboBox">
            <Setter Property="Foreground" Value="#d4d4e8"/>
            <Setter Property="Background" Value="#1e1e2e"/>
            <Setter Property="Height" Value="32"/>
            <Setter Property="Template" Value="{StaticResource ComboBoxTemplate}"/>
        </Style>
        <Style TargetType="ComboBoxItem">
            <Setter Property="Foreground" Value="#d4d4e8"/>
            <Setter Property="Background" Value="Transparent"/>
            <Setter Property="Padding" Value="8,6"/>
            <Setter Property="Cursor" Value="Hand"/>
            <Setter Property="Template">
                <Setter.Value>
                    <ControlTemplate TargetType="ComboBoxItem">
                        <Border x:Name="Bd" Background="{TemplateBinding Background}" Padding="{TemplateBinding Padding}" CornerRadius="3" Margin="0,1">
                            <ContentPresenter/>
                        </Border>
                        <ControlTemplate.Triggers>
                            <Trigger Property="IsHighlighted" Value="True">
                                <Setter TargetName="Bd" Property="Background" Value="#282840"/>
                            </Trigger>
                            <Trigger Property="IsMouseOver" Value="True">
                                <Setter TargetName="Bd" Property="Background" Value="#282840"/>
                            </Trigger>
                            <Trigger Property="IsSelected" Value="True">
                                <Setter TargetName="Bd" Property="Background" Value="#6c5ce7"/>
                            </Trigger>
                        </ControlTemplate.Triggers>
                    </ControlTemplate>
                </Setter.Value>
            </Setter>
        </Style>
        <!-- Global Styles -->
        <Style TargetType="TextBlock">
            <Setter Property="Foreground" Value="#d4d4e8"/>
        </Style>
        <Style TargetType="TextBox">
            <Setter Property="Background" Value="#1e1e2e"/>
            <Setter Property="Foreground" Value="#d4d4e8"/>
            <Setter Property="BorderBrush" Value="#333346"/>
            <Setter Property="CaretBrush" Value="#fff"/>
            <Setter Property="SelectionBrush" Value="#6c5ce7"/>
            <Setter Property="Padding" Value="8,6"/>
        </Style>
        <Style TargetType="CheckBox">
            <Setter Property="Foreground" Value="#d4d4e8"/>
            <Setter Property="Margin" Value="0,3"/>
            <Setter Property="Cursor" Value="Hand"/>
        </Style>
        <Style TargetType="Label">
            <Setter Property="Foreground" Value="#d4d4e8"/>
        </Style>
        <Style TargetType="ToolTip">
            <Setter Property="Background" Value="#1a1a2e"/>
            <Setter Property="Foreground" Value="#d4d4e8"/>
            <Setter Property="BorderBrush" Value="#333346"/>
        </Style>
        <Style x:Key="AccentBtn" TargetType="Button">
            <Setter Property="Background" Value="#6c5ce7"/>
            <Setter Property="Foreground" Value="White"/>
            <Setter Property="BorderThickness" Value="0"/>
            <Setter Property="Padding" Value="20,10"/>
            <Setter Property="FontSize" Value="13"/>
            <Setter Property="FontWeight" Value="SemiBold"/>
            <Setter Property="Cursor" Value="Hand"/>
            <Setter Property="Template">
                <Setter.Value>
                    <ControlTemplate TargetType="Button">
                        <Border x:Name="bd" Background="{TemplateBinding Background}"
                                CornerRadius="6" Padding="{TemplateBinding Padding}">
                            <ContentPresenter HorizontalAlignment="Center" VerticalAlignment="Center"/>
                        </Border>
                        <ControlTemplate.Triggers>
                            <Trigger Property="IsMouseOver" Value="True">
                                <Setter TargetName="bd" Property="Background" Value="#7c6ff0"/>
                            </Trigger>
                            <Trigger Property="IsPressed" Value="True">
                                <Setter TargetName="bd" Property="Background" Value="#5a4bd4"/>
                            </Trigger>
                            <Trigger Property="IsEnabled" Value="False">
                                <Setter TargetName="bd" Property="Opacity" Value="0.4"/>
                            </Trigger>
                        </ControlTemplate.Triggers>
                    </ControlTemplate>
                </Setter.Value>
            </Setter>
        </Style>
        <Style x:Key="SecondaryBtn" TargetType="Button">
            <Setter Property="Background" Value="#1e1e2e"/>
            <Setter Property="Foreground" Value="#d4d4e8"/>
            <Setter Property="BorderThickness" Value="1"/>
            <Setter Property="BorderBrush" Value="#333346"/>
            <Setter Property="Padding" Value="16,8"/>
            <Setter Property="FontSize" Value="12"/>
            <Setter Property="Cursor" Value="Hand"/>
            <Setter Property="Template">
                <Setter.Value>
                    <ControlTemplate TargetType="Button">
                        <Border x:Name="bd" Background="{TemplateBinding Background}"
                                BorderBrush="{TemplateBinding BorderBrush}" BorderThickness="{TemplateBinding BorderThickness}"
                                CornerRadius="5" Padding="{TemplateBinding Padding}">
                            <ContentPresenter HorizontalAlignment="Center" VerticalAlignment="Center"/>
                        </Border>
                        <ControlTemplate.Triggers>
                            <Trigger Property="IsMouseOver" Value="True">
                                <Setter TargetName="bd" Property="Background" Value="#282840"/>
                                <Setter TargetName="bd" Property="BorderBrush" Value="#6c5ce7"/>
                            </Trigger>
                            <Trigger Property="IsPressed" Value="True">
                                <Setter TargetName="bd" Property="Background" Value="#333346"/>
                            </Trigger>
                        </ControlTemplate.Triggers>
                    </ControlTemplate>
                </Setter.Value>
            </Setter>
        </Style>
        <Style x:Key="DangerBtn" TargetType="Button">
            <Setter Property="Background" Value="#dc2626"/>
            <Setter Property="Foreground" Value="White"/>
            <Setter Property="BorderThickness" Value="0"/>
            <Setter Property="Padding" Value="16,8"/>
            <Setter Property="FontSize" Value="12"/>
            <Setter Property="Cursor" Value="Hand"/>
            <Setter Property="Template">
                <Setter.Value>
                    <ControlTemplate TargetType="Button">
                        <Border x:Name="bd" Background="{TemplateBinding Background}"
                                CornerRadius="5" Padding="{TemplateBinding Padding}">
                            <ContentPresenter HorizontalAlignment="Center" VerticalAlignment="Center"/>
                        </Border>
                        <ControlTemplate.Triggers>
                            <Trigger Property="IsMouseOver" Value="True">
                                <Setter TargetName="bd" Property="Background" Value="#ef4444"/>
                            </Trigger>
                            <Trigger Property="IsPressed" Value="True">
                                <Setter TargetName="bd" Property="Background" Value="#b91c1c"/>
                            </Trigger>
                        </ControlTemplate.Triggers>
                    </ControlTemplate>
                </Setter.Value>
            </Setter>
        </Style>
        <Style x:Key="SuccessBtn" TargetType="Button">
            <Setter Property="Background" Value="#16a34a"/>
            <Setter Property="Foreground" Value="White"/>
            <Setter Property="BorderThickness" Value="0"/>
            <Setter Property="Padding" Value="16,8"/>
            <Setter Property="FontSize" Value="12"/>
            <Setter Property="Cursor" Value="Hand"/>
            <Setter Property="Template">
                <Setter.Value>
                    <ControlTemplate TargetType="Button">
                        <Border x:Name="bd" Background="{TemplateBinding Background}"
                                CornerRadius="5" Padding="{TemplateBinding Padding}">
                            <ContentPresenter HorizontalAlignment="Center" VerticalAlignment="Center"/>
                        </Border>
                        <ControlTemplate.Triggers>
                            <Trigger Property="IsMouseOver" Value="True">
                                <Setter TargetName="bd" Property="Background" Value="#22c55e"/>
                            </Trigger>
                            <Trigger Property="IsPressed" Value="True">
                                <Setter TargetName="bd" Property="Background" Value="#15803d"/>
                            </Trigger>
                        </ControlTemplate.Triggers>
                    </ControlTemplate>
                </Setter.Value>
            </Setter>
        </Style>
        <Style x:Key="NavBtn" TargetType="Button">
            <Setter Property="Background" Value="Transparent"/>
            <Setter Property="Foreground" Value="#8888a0"/>
            <Setter Property="BorderThickness" Value="0"/>
            <Setter Property="Padding" Value="18,12"/>
            <Setter Property="FontSize" Value="13"/>
            <Setter Property="FontWeight" Value="Medium"/>
            <Setter Property="Cursor" Value="Hand"/>
            <Setter Property="HorizontalContentAlignment" Value="Left"/>
            <Setter Property="Template">
                <Setter.Value>
                    <ControlTemplate TargetType="Button">
                        <Border x:Name="bd" Background="{TemplateBinding Background}"
                                CornerRadius="6" Padding="{TemplateBinding Padding}" Margin="4,1">
                            <ContentPresenter HorizontalAlignment="{TemplateBinding HorizontalContentAlignment}" VerticalAlignment="Center"/>
                        </Border>
                        <ControlTemplate.Triggers>
                            <Trigger Property="IsMouseOver" Value="True">
                                <Setter TargetName="bd" Property="Background" Value="#18182a"/>
                                <Setter Property="Foreground" Value="#d4d4e8"/>
                            </Trigger>
                        </ControlTemplate.Triggers>
                    </ControlTemplate>
                </Setter.Value>
            </Setter>
        </Style>
        <Style x:Key="NavBtnActive" TargetType="Button" BasedOn="{StaticResource NavBtn}">
            <Setter Property="Background" Value="#1e1e36"/>
            <Setter Property="Foreground" Value="#a78bfa"/>
            <Setter Property="FontWeight" Value="Bold"/>
        </Style>
        <Style x:Key="PanelBtn" TargetType="Button">
            <Setter Property="Background" Value="#16162a"/>
            <Setter Property="Foreground" Value="#d4d4e8"/>
            <Setter Property="BorderThickness" Value="1"/>
            <Setter Property="BorderBrush" Value="#2a2a42"/>
            <Setter Property="Padding" Value="14,10"/>
            <Setter Property="FontSize" Value="12"/>
            <Setter Property="Cursor" Value="Hand"/>
            <Setter Property="HorizontalContentAlignment" Value="Left"/>
            <Setter Property="Template">
                <Setter.Value>
                    <ControlTemplate TargetType="Button">
                        <Border x:Name="bd" Background="{TemplateBinding Background}"
                                BorderBrush="{TemplateBinding BorderBrush}" BorderThickness="{TemplateBinding BorderThickness}"
                                CornerRadius="6" Padding="{TemplateBinding Padding}">
                            <ContentPresenter HorizontalAlignment="{TemplateBinding HorizontalContentAlignment}" VerticalAlignment="Center"/>
                        </Border>
                        <ControlTemplate.Triggers>
                            <Trigger Property="IsMouseOver" Value="True">
                                <Setter TargetName="bd" Property="Background" Value="#1e1e36"/>
                                <Setter TargetName="bd" Property="BorderBrush" Value="#6c5ce7"/>
                            </Trigger>
                            <Trigger Property="IsPressed" Value="True">
                                <Setter TargetName="bd" Property="Background" Value="#282844"/>
                            </Trigger>
                        </ControlTemplate.Triggers>
                    </ControlTemplate>
                </Setter.Value>
            </Setter>
        </Style>
        <Style TargetType="ScrollBar">
            <Setter Property="Background" Value="Transparent"/>
            <Setter Property="Width" Value="8"/>
        </Style>
    </Window.Resources>

    <Grid>
        <Grid.ColumnDefinitions>
            <ColumnDefinition Width="200"/>
            <ColumnDefinition Width="*"/>
        </Grid.ColumnDefinitions>

        <!-- Left Sidebar -->
        <Border Grid.Column="0" Background="#0a0a14" BorderBrush="#1a1a2e" BorderThickness="0,0,1,0">
            <DockPanel>
                <!-- Logo Area -->
                <Border DockPanel.Dock="Top" Padding="16,20,16,16">
                    <StackPanel>
                        <TextBlock Text="WINFORGE" FontSize="20" FontWeight="Bold" Foreground="#a78bfa" Margin="0,0,0,2"/>
                        <TextBlock Text="v0.0.1" FontSize="10" Foreground="#555570"/>
                        <Border Height="1" Background="#1e1e36" Margin="0,14,0,10"/>
                    </StackPanel>
                </Border>

                <!-- Version Info at Bottom -->
                <Border DockPanel.Dock="Bottom" Padding="16,10" Background="#08080e">
                    <StackPanel>
                        <TextBlock x:Name="txtSysInfo" Text="" FontSize="10" Foreground="#555570" TextWrapping="Wrap"/>
                    </StackPanel>
                </Border>

                <!-- Navigation -->
                <StackPanel Margin="6,0">
                    <TextBlock Text="NAVIGATION" FontSize="9" Foreground="#444460" FontWeight="Bold" Margin="14,4,0,8"/>
                    <Button x:Name="navInstall" Content="  Install" Style="{StaticResource NavBtnActive}"/>
                    <Button x:Name="navTweaks"  Content="  Tweaks" Style="{StaticResource NavBtn}"/>
                    <Button x:Name="navConfig"  Content="  Config" Style="{StaticResource NavBtn}"/>
                    <Button x:Name="navUpdates" Content="  Updates" Style="{StaticResource NavBtn}"/>
                    <Border Height="1" Background="#1e1e36" Margin="8,12"/>
                    <TextBlock Text="QUICK ACTIONS" FontSize="9" Foreground="#444460" FontWeight="Bold" Margin="14,4,0,8"/>
                    <Button x:Name="navExport"  Content="  Export Config" Style="{StaticResource NavBtn}"/>
                    <Button x:Name="navImport"  Content="  Import Config" Style="{StaticResource NavBtn}"/>
                </StackPanel>
            </DockPanel>
        </Border>

        <!-- Main Content -->
        <DockPanel Grid.Column="1">

            <!-- Bottom Log Panel -->
            <Border DockPanel.Dock="Bottom" Background="#08080e" BorderBrush="#1a1a2e" BorderThickness="0,1,0,0" MaxHeight="160">
                <DockPanel>
                    <Border DockPanel.Dock="Top" Padding="12,6" Background="#0c0c16">
                        <DockPanel>
                            <TextBlock Text="OUTPUT LOG" FontSize="10" Foreground="#555570" FontWeight="Bold" VerticalAlignment="Center"/>
                            <Button x:Name="btnClearLog" Content="Clear" Style="{StaticResource SecondaryBtn}" Padding="10,3" FontSize="10" HorizontalAlignment="Right" DockPanel.Dock="Right"/>
                        </DockPanel>
                    </Border>
                    <TextBox x:Name="txtLog" IsReadOnly="True" Background="Transparent"
                             Foreground="#4ade80" FontFamily="Cascadia Mono,Consolas" FontSize="11"
                             TextWrapping="Wrap" VerticalScrollBarVisibility="Auto"
                             BorderThickness="0" Padding="12,6" AcceptsReturn="True"/>
                </DockPanel>
            </Border>

            <!-- Page Container -->
            <Grid x:Name="pageContainer" Margin="0">

                <!-- INSTALL PAGE -->
                <Grid x:Name="pageInstall" Visibility="Visible">
                    <DockPanel>
                        <!-- Top Bar -->
                        <Border DockPanel.Dock="Top" Padding="24,18,24,14" Background="#0d0d16">
                            <DockPanel>
                                <StackPanel>
                                    <TextBlock Text="Install Programs" FontSize="22" FontWeight="Bold" Foreground="#e8e8f0"/>
                                    <TextBlock Text="Select applications and install them with one click via winget" FontSize="12" Foreground="#666680" Margin="0,4,0,0"/>
                                </StackPanel>
                                <StackPanel Orientation="Horizontal" HorizontalAlignment="Right" DockPanel.Dock="Right" VerticalAlignment="Center">
                                    <TextBox x:Name="txtSearch" Width="220" Height="32" Tag="Search applications..."
                                             VerticalContentAlignment="Center" Margin="0,0,10,0"/>
                                    <Button x:Name="btnSelectAll" Content="Select All" Style="{StaticResource SecondaryBtn}" Margin="0,0,6,0"/>
                                    <Button x:Name="btnDeselectAll" Content="Clear All" Style="{StaticResource SecondaryBtn}" Margin="0,0,6,0"/>
                                    <Button x:Name="btnInstallSelected" Content="  Install Selected" Style="{StaticResource AccentBtn}"/>
                                </StackPanel>
                            </DockPanel>
                        </Border>
                        <!-- Preset Buttons -->
                        <Border DockPanel.Dock="Top" Padding="24,8,24,8" Background="#0b0b14">
                            <StackPanel Orientation="Horizontal">
                                <TextBlock Text="PRESETS:" FontSize="10" Foreground="#555570" FontWeight="Bold" VerticalAlignment="Center" Margin="0,0,10,0"/>
                                <Button x:Name="btnPresetDev" Content="Developer" Style="{StaticResource SecondaryBtn}" Padding="12,5" FontSize="11" Margin="0,0,6,0"/>
                                <Button x:Name="btnPresetGamer" Content="Gamer" Style="{StaticResource SecondaryBtn}" Padding="12,5" FontSize="11" Margin="0,0,6,0"/>
                                <Button x:Name="btnPresetProd" Content="Productivity" Style="{StaticResource SecondaryBtn}" Padding="12,5" FontSize="11" Margin="0,0,6,0"/>
                                <Button x:Name="btnPresetBasic" Content="Essentials" Style="{StaticResource SecondaryBtn}" Padding="12,5" FontSize="11" Margin="0,0,6,0"/>
                                <Border Width="1" Background="#333346" Margin="8,2"/>
                                <Button x:Name="btnUpgradeAll" Content="  Upgrade All" Style="{StaticResource SuccessBtn}" Padding="12,5" FontSize="11" Margin="6,0,0,0"/>
                                <Button x:Name="btnUninstallSelected" Content="  Uninstall Selected" Style="{StaticResource DangerBtn}" Padding="12,5" FontSize="11" Margin="6,0,0,0"/>
                                <Button x:Name="btnGetInstalled" Content="  Get Installed" Style="{StaticResource SecondaryBtn}" Padding="12,5" FontSize="11" Margin="6,0,0,0"/>
                            </StackPanel>
                        </Border>
                        <!-- App Grid -->
                        <ScrollViewer VerticalScrollBarVisibility="Auto" Padding="24,10">
                            <WrapPanel x:Name="pnlApps" Orientation="Horizontal"/>
                        </ScrollViewer>
                    </DockPanel>
                </Grid>

                <!-- TWEAKS PAGE -->
                <Grid x:Name="pageTweaks" Visibility="Collapsed">
                    <DockPanel>
                        <Border DockPanel.Dock="Top" Padding="24,18,24,14" Background="#0d0d16">
                            <DockPanel>
                                <StackPanel>
                                    <TextBlock Text="System Tweaks" FontSize="22" FontWeight="Bold" Foreground="#e8e8f0"/>
                                    <TextBlock Text="Optimize Windows for performance, privacy, and usability" FontSize="12" Foreground="#666680" Margin="0,4,0,0"/>
                                </StackPanel>
                                <StackPanel Orientation="Horizontal" HorizontalAlignment="Right" DockPanel.Dock="Right" VerticalAlignment="Center">
                                    <Button x:Name="btnTweakPresetEssential" Content="Essential Preset" Style="{StaticResource SecondaryBtn}" Margin="0,0,6,0"/>
                                    <Button x:Name="btnTweakPresetPrivacy" Content="Privacy Preset" Style="{StaticResource SecondaryBtn}" Margin="0,0,6,0"/>
                                    <Button x:Name="btnTweakSelectAll" Content="Select All" Style="{StaticResource SecondaryBtn}" Margin="0,0,6,0"/>
                                    <Button x:Name="btnTweakDeselectAll" Content="Clear All" Style="{StaticResource SecondaryBtn}" Margin="0,0,10,0"/>
                                    <Button x:Name="btnRunTweaks" Content="  Run Tweaks" Style="{StaticResource AccentBtn}" Margin="0,0,6,0"/>
                                    <Button x:Name="btnUndoTweaks" Content="  Undo Selected" Style="{StaticResource DangerBtn}"/>
                                </StackPanel>
                            </DockPanel>
                        </Border>
                        <ScrollViewer VerticalScrollBarVisibility="Auto" Padding="24,14">
                            <StackPanel x:Name="pnlTweaks"/>
                        </ScrollViewer>
                    </DockPanel>
                </Grid>

                <!-- CONFIG PAGE -->
                <Grid x:Name="pageConfig" Visibility="Collapsed">
                    <DockPanel>
                        <Border DockPanel.Dock="Top" Padding="24,18,24,14" Background="#0d0d16">
                            <StackPanel>
                                <TextBlock Text="System Configuration" FontSize="22" FontWeight="Bold" Foreground="#e8e8f0"/>
                                <TextBlock Text="Windows features, system fixes, and legacy control panels" FontSize="12" Foreground="#666680" Margin="0,4,0,0"/>
                            </StackPanel>
                        </Border>
                        <ScrollViewer VerticalScrollBarVisibility="Auto" Padding="24,14">
                            <StackPanel x:Name="pnlConfig"/>
                        </ScrollViewer>
                    </DockPanel>
                </Grid>

                <!-- UPDATES PAGE -->
                <Grid x:Name="pageUpdates" Visibility="Collapsed">
                    <DockPanel>
                        <Border DockPanel.Dock="Top" Padding="24,18,24,14" Background="#0d0d16">
                            <StackPanel>
                                <TextBlock Text="Windows Updates" FontSize="22" FontWeight="Bold" Foreground="#e8e8f0"/>
                                <TextBlock Text="Control how and when Windows installs updates" FontSize="12" Foreground="#666680" Margin="0,4,0,0"/>
                            </StackPanel>
                        </Border>
                        <ScrollViewer VerticalScrollBarVisibility="Auto" Padding="24,14">
                            <StackPanel x:Name="pnlUpdates" MaxWidth="700" HorizontalAlignment="Left">
                                <!-- DNS Section -->
                                <Border Background="#12121e" CornerRadius="8" Padding="20" Margin="0,0,0,14" BorderBrush="#1e1e36" BorderThickness="1">
                                    <StackPanel>
                                        <TextBlock Text="DNS Configuration" FontSize="16" FontWeight="Bold" Foreground="#e8e8f0" Margin="0,0,0,10"/>
                                        <TextBlock Text="Select a DNS provider to optimize speed and privacy" FontSize="12" Foreground="#666680" Margin="0,0,0,14"/>
                                        <StackPanel Orientation="Horizontal">
                                            <ComboBox x:Name="cmbDNS" Width="250" Margin="0,0,10,0">
                                                <ComboBoxItem Content="Default (DHCP)" IsSelected="True"/>
                                                <ComboBoxItem Content="Google (8.8.8.8)"/>
                                                <ComboBoxItem Content="Cloudflare (1.1.1.1)"/>
                                                <ComboBoxItem Content="Quad9 (9.9.9.9)"/>
                                                <ComboBoxItem Content="OpenDNS (208.67.222.222)"/>
                                                <ComboBoxItem Content="AdGuard (94.140.14.14)"/>
                                            </ComboBox>
                                            <Button x:Name="btnApplyDNS" Content="Apply DNS" Style="{StaticResource AccentBtn}" Padding="16,6"/>
                                        </StackPanel>
                                    </StackPanel>
                                </Border>
                                <!-- Update Policies -->
                                <Border Background="#12121e" CornerRadius="8" Padding="20" Margin="0,0,0,14" BorderBrush="#1e1e36" BorderThickness="1">
                                    <StackPanel>
                                        <TextBlock Text="Windows Update Policy" FontSize="16" FontWeight="Bold" Foreground="#e8e8f0" Margin="0,0,0,10"/>
                                        <TextBlock Text="Choose how Windows handles updates on this system" FontSize="12" Foreground="#666680" Margin="0,0,0,14"/>
                                        <WrapPanel>
                                            <Button x:Name="btnUpdateDefault" Content="  Default (Recommended)" Style="{StaticResource SuccessBtn}" Margin="0,0,8,8" Padding="14,10"/>
                                            <Button x:Name="btnUpdateSecurity" Content="  Security Only" Style="{StaticResource AccentBtn}" Margin="0,0,8,8" Padding="14,10"/>
                                            <Button x:Name="btnUpdateDisable" Content="  Disable Updates" Style="{StaticResource DangerBtn}" Margin="0,0,8,8" Padding="14,10"/>
                                        </WrapPanel>
                                    </StackPanel>
                                </Border>
                                <!-- Update Actions -->
                                <Border Background="#12121e" CornerRadius="8" Padding="20" Margin="0,0,0,14" BorderBrush="#1e1e36" BorderThickness="1">
                                    <StackPanel>
                                        <TextBlock Text="Update Actions" FontSize="16" FontWeight="Bold" Foreground="#e8e8f0" Margin="0,0,0,10"/>
                                        <WrapPanel>
                                            <Button x:Name="btnCheckUpdates" Content="Check for Updates" Style="{StaticResource SecondaryBtn}" Margin="0,0,8,8"/>
                                            <Button x:Name="btnPauseUpdates" Content="Pause Updates (35 days)" Style="{StaticResource SecondaryBtn}" Margin="0,0,8,8"/>
                                            <Button x:Name="btnResetWU" Content="Reset Windows Update" Style="{StaticResource SecondaryBtn}" Margin="0,0,8,8"/>
                                        </WrapPanel>
                                    </StackPanel>
                                </Border>
                            </StackPanel>
                        </ScrollViewer>
                    </DockPanel>
                </Grid>
            </Grid>
        </DockPanel>
    </Grid>
</Window>
'@

# ── Parse XAML & Build Window ──────────────────────────────────────────────────
$window = [System.Windows.Markup.XamlReader]::Parse($xaml)

# ── Find Controls ──────────────────────────────────────────────────────────────
$txtLog             = $window.FindName('txtLog')
$btnClearLog        = $window.FindName('btnClearLog')
$txtSearch          = $window.FindName('txtSearch')
$pnlApps            = $window.FindName('pnlApps')
$pnlTweaks          = $window.FindName('pnlTweaks')
$pnlConfig          = $window.FindName('pnlConfig')
$pnlUpdates         = $window.FindName('pnlUpdates')
$txtSysInfo         = $window.FindName('txtSysInfo')

# Pages
$pageInstall = $window.FindName('pageInstall')
$pageTweaks  = $window.FindName('pageTweaks')
$pageConfig  = $window.FindName('pageConfig')
$pageUpdates = $window.FindName('pageUpdates')

# Nav buttons
$navInstall = $window.FindName('navInstall')
$navTweaks  = $window.FindName('navTweaks')
$navConfig  = $window.FindName('navConfig')
$navUpdates = $window.FindName('navUpdates')
$navExport  = $window.FindName('navExport')
$navImport  = $window.FindName('navImport')

# ── Logging ────────────────────────────────────────────────────────────────────
function Write-Log {
    param([string]$Message, [string]$Color)
    $timestamp = Get-Date -Format 'HH:mm:ss'
    $txtLog.Dispatcher.Invoke([Action]{
        $txtLog.AppendText("[$timestamp] $Message`r`n")
        $txtLog.ScrollToEnd()
    })
}

# ── Navigation ─────────────────────────────────────────────────────────────────
$script:AllPages = @($pageInstall, $pageTweaks, $pageConfig, $pageUpdates)
$script:AllNavBtns = @($navInstall, $navTweaks, $navConfig, $navUpdates)

function Switch-Page {
    param([System.Windows.UIElement]$Page, [System.Windows.Controls.Button]$NavBtn)
    foreach ($p in $script:AllPages) { $p.Visibility = 'Collapsed' }
    $Page.Visibility = 'Visible'
    $activeStyle = $window.FindResource('NavBtnActive')
    $normalStyle = $window.FindResource('NavBtn')
    foreach ($n in $script:AllNavBtns) { $n.Style = $normalStyle }
    $NavBtn.Style = $activeStyle
}

$navInstall.Add_Click({ Switch-Page $pageInstall $navInstall })
$navTweaks.Add_Click({  Switch-Page $pageTweaks  $navTweaks })
$navConfig.Add_Click({  Switch-Page $pageConfig   $navConfig })
$navUpdates.Add_Click({ Switch-Page $pageUpdates $navUpdates })

$btnClearLog.Add_Click({ $txtLog.Text = '' })

# ── System Info ────────────────────────────────────────────────────────────────
try {
    $os = (Get-CimInstance Win32_OperatingSystem).Caption
    $build = [System.Environment]::OSVersion.Version.Build
    $ram = [math]::Round((Get-CimInstance Win32_ComputerSystem).TotalPhysicalMemory / 1GB, 1)
    $txtSysInfo.Text = "$os`nBuild $build | ${ram}GB RAM"
} catch { $txtSysInfo.Text = "Windows" }

# ── BUILD INSTALL TAB ─────────────────────────────────────────────────────────
$script:AppCheckboxes = @{}

function Build-InstallTab {
    $pnlApps.Children.Clear()
    foreach ($category in $script:AppCategories.Keys) {
        # Category card
        $card = New-Object System.Windows.Controls.Border
        $card.Background = [System.Windows.Media.BrushConverter]::new().ConvertFrom('#12121e')
        $card.CornerRadius = [System.Windows.CornerRadius]::new(8)
        $card.BorderBrush = [System.Windows.Media.BrushConverter]::new().ConvertFrom('#1e1e36')
        $card.BorderThickness = [System.Windows.Thickness]::new(1)
        $card.Padding = [System.Windows.Thickness]::new(14)
        $card.Margin = [System.Windows.Thickness]::new(0,0,12,12)
        $card.Width = 235

        $stack = New-Object System.Windows.Controls.StackPanel

        # Category header
        $header = New-Object System.Windows.Controls.TextBlock
        $header.Text = $category.ToUpper()
        $header.FontSize = 10
        $header.FontWeight = 'Bold'
        $header.Foreground = [System.Windows.Media.BrushConverter]::new().ConvertFrom('#6c5ce7')
        $header.Margin = [System.Windows.Thickness]::new(0,0,0,8)
        $stack.Children.Add($header)

        $sep = New-Object System.Windows.Controls.Border
        $sep.Height = 1
        $sep.Background = [System.Windows.Media.BrushConverter]::new().ConvertFrom('#1e1e36')
        $sep.Margin = [System.Windows.Thickness]::new(0,0,0,8)
        $stack.Children.Add($sep)

        foreach ($app in $script:AppCategories[$category]) {
            $cb = New-Object System.Windows.Controls.CheckBox
            $cb.Content = $app.Name
            $cb.Tag = $app.Id
            $cb.Foreground = [System.Windows.Media.BrushConverter]::new().ConvertFrom('#c4c4d8')
            $cb.Margin = [System.Windows.Thickness]::new(0,2,0,2)
            $cb.FontSize = 12
            $stack.Children.Add($cb)
            $script:AppCheckboxes[$app.Id] = $cb
        }
        $card.Child = $stack
        $pnlApps.Children.Add($card)
    }
}
Build-InstallTab

# ── Search Filter ──────────────────────────────────────────────────────────────
$txtSearch.Add_TextChanged({
    $term = $txtSearch.Text.ToLower().Trim()
    foreach ($kvp in $script:AppCheckboxes.GetEnumerator()) {
        $cb = $kvp.Value
        if ([string]::IsNullOrEmpty($term)) {
            $cb.Visibility = 'Visible'
        } else {
            if ($cb.Content.ToString().ToLower().Contains($term) -or $cb.Tag.ToString().ToLower().Contains($term)) {
                $cb.Visibility = 'Visible'
            } else {
                $cb.Visibility = 'Collapsed'
            }
        }
    }
})

# ── Install Actions ────────────────────────────────────────────────────────────
$window.FindName('btnSelectAll').Add_Click({
    foreach ($cb in $script:AppCheckboxes.Values) { if ($cb.Visibility -eq 'Visible') { $cb.IsChecked = $true } }
})
$window.FindName('btnDeselectAll').Add_Click({
    foreach ($cb in $script:AppCheckboxes.Values) { $cb.IsChecked = $false }
})

function Get-SelectedApps {
    $selected = @()
    foreach ($kvp in $script:AppCheckboxes.GetEnumerator()) {
        if ($kvp.Value.IsChecked -eq $true) { $selected += $kvp.Key }
    }
    return $selected
}

function Run-Async {
    param([scriptblock]$Work, [scriptblock]$OnComplete)
    $ps = [PowerShell]::Create()
    $ps.AddScript($Work) | Out-Null
    $handle = $ps.BeginInvoke()
    $timer = New-Object System.Windows.Threading.DispatcherTimer
    $timer.Interval = [TimeSpan]::FromMilliseconds(300)
    $timer.Add_Tick({
        if ($handle.IsCompleted) {
            $timer.Stop()
            try { $result = $ps.EndInvoke($handle) } catch {}
            $ps.Dispose()
            if ($OnComplete) { & $OnComplete $result }
        }
    }.GetNewClosure())
    $timer.Start()
}

$window.FindName('btnInstallSelected').Add_Click({
    $apps = Get-SelectedApps
    if ($apps.Count -eq 0) { Write-Log "No applications selected."; return }
    Write-Log "Installing $($apps.Count) application(s)..."
    $window.FindName('btnInstallSelected').IsEnabled = $false

    foreach ($appId in $apps) {
        $name = $script:AppCheckboxes[$appId].Content
        Write-Log "Installing: $name ($appId)..."
        $id = $appId
        $ps = [PowerShell]::Create()
        $ps.AddScript({
            param($pkgId)
            try {
                $result = & winget install --id $pkgId --accept-source-agreements --accept-package-agreements --silent 2>&1
                return "$pkgId|SUCCESS|$($result -join ' ')"
            } catch {
                return "$pkgId|FAIL|$($_.Exception.Message)"
            }
        }).AddArgument($id) | Out-Null
        $handle = $ps.BeginInvoke()
        $timer = New-Object System.Windows.Threading.DispatcherTimer
        $timer.Interval = [TimeSpan]::FromMilliseconds(500)
        $timer.Tag = @{ PS=$ps; Handle=$handle; Name=$name; Id=$id }
        $timer.Add_Tick({
            $ctx = $this.Tag
            if ($ctx.Handle.IsCompleted) {
                $this.Stop()
                try {
                    $res = $ctx.PS.EndInvoke($ctx.Handle)
                    $parts = "$res".Split('|')
                    if ($parts[1] -eq 'SUCCESS') {
                        Write-Log "[OK] $($ctx.Name) installed successfully."
                    } else {
                        Write-Log "[!] $($ctx.Name): $($parts[2])"
                    }
                } catch {
                    Write-Log "[!] $($ctx.Name) installation error."
                }
                $ctx.PS.Dispose()
            }
        }.GetNewClosure())
        $timer.Start()
    }
    $window.FindName('btnInstallSelected').IsEnabled = $true
})

$window.FindName('btnUpgradeAll').Add_Click({
    Write-Log "Upgrading all packages via winget..."
    $ps = [PowerShell]::Create()
    $ps.AddScript({ & winget upgrade --all --accept-source-agreements --accept-package-agreements --silent 2>&1 }) | Out-Null
    $handle = $ps.BeginInvoke()
    $timer = New-Object System.Windows.Threading.DispatcherTimer
    $timer.Interval = [TimeSpan]::FromMilliseconds(500)
    $timer.Add_Tick({
        if ($handle.IsCompleted) {
            $timer.Stop()
            try { $res = $ps.EndInvoke($handle); Write-Log "[OK] Upgrade complete." } catch { Write-Log "[!] Upgrade error." }
            $ps.Dispose()
        }
    }.GetNewClosure())
    $timer.Start()
})

$window.FindName('btnUninstallSelected').Add_Click({
    $apps = Get-SelectedApps
    if ($apps.Count -eq 0) { Write-Log "No applications selected for uninstall."; return }
    Write-Log "Uninstalling $($apps.Count) application(s)..."
    foreach ($appId in $apps) {
        $name = $script:AppCheckboxes[$appId].Content
        Write-Log "Uninstalling: $name..."
        $id = $appId
        $ps = [PowerShell]::Create()
        $ps.AddScript({ param($pkgId) & winget uninstall --id $pkgId --silent 2>&1 }).AddArgument($id) | Out-Null
        $handle = $ps.BeginInvoke()
        $timer = New-Object System.Windows.Threading.DispatcherTimer
        $timer.Interval = [TimeSpan]::FromMilliseconds(500)
        $timer.Tag = @{ PS=$ps; Handle=$handle; Name=$name }
        $timer.Add_Tick({
            $ctx = $this.Tag
            if ($ctx.Handle.IsCompleted) {
                $this.Stop()
                try { $ctx.PS.EndInvoke($ctx.Handle); Write-Log "[OK] $($ctx.Name) uninstalled." } catch { Write-Log "[!] $($ctx.Name) uninstall error." }
                $ctx.PS.Dispose()
            }
        }.GetNewClosure())
        $timer.Start()
    }
})

$window.FindName('btnGetInstalled').Add_Click({
    Write-Log "Scanning installed packages..."
    $ps = [PowerShell]::Create()
    $ps.AddScript({
        $list = & winget list --accept-source-agreements 2>$null
        return ($list | Out-String)
    }) | Out-Null
    $handle = $ps.BeginInvoke()
    $timer = New-Object System.Windows.Threading.DispatcherTimer
    $timer.Interval = [TimeSpan]::FromMilliseconds(500)
    $timer.Add_Tick({
        if ($handle.IsCompleted) {
            $timer.Stop()
            try {
                $res = $ps.EndInvoke($handle) | Out-String
                $matched = 0
                foreach ($kvp in $script:AppCheckboxes.GetEnumerator()) {
                    $id = $kvp.Key
                    if ($res -match [regex]::Escape($id)) {
                        $kvp.Value.IsChecked = $true
                        $matched++
                    }
                }
                Write-Log "[OK] Found $matched installed applications from catalog."
            } catch { Write-Log "[!] Error scanning packages." }
            $ps.Dispose()
        }
    }.GetNewClosure())
    $timer.Start()
})

# ── Presets ────────────────────────────────────────────────────────────────────
$window.FindName('btnPresetDev').Add_Click({
    foreach ($cb in $script:AppCheckboxes.Values) { $cb.IsChecked = $false }
    $devApps = @('Microsoft.VisualStudioCode','Git.Git','OpenJS.NodeJS.LTS','Python.Python.3.12',
        'Microsoft.WindowsTerminal','Microsoft.PowerShell','Docker.DockerDesktop','GitHub.GitHubDesktop',
        'Notepad++.Notepad++','7zip.7zip','Mozilla.Firefox','Postman.Postman')
    foreach ($id in $devApps) { if ($script:AppCheckboxes.ContainsKey($id)) { $script:AppCheckboxes[$id].IsChecked = $true } }
    Write-Log "Developer preset applied."
})
$window.FindName('btnPresetGamer').Add_Click({
    foreach ($cb in $script:AppCheckboxes.Values) { $cb.IsChecked = $false }
    $gameApps = @('Valve.Steam','EpicGames.EpicGamesLauncher','GOG.Galaxy','Discord.Discord',
        'VideoLAN.VLC','7zip.7zip','Mozilla.Firefox','OBSProject.OBSStudio')
    foreach ($id in $gameApps) { if ($script:AppCheckboxes.ContainsKey($id)) { $script:AppCheckboxes[$id].IsChecked = $true } }
    Write-Log "Gamer preset applied."
})
$window.FindName('btnPresetProd').Add_Click({
    foreach ($cb in $script:AppCheckboxes.Values) { $cb.IsChecked = $false }
    $prodApps = @('Mozilla.Firefox','TheDocumentFoundation.LibreOffice','Obsidian.Obsidian',
        'Adobe.Acrobat.Reader.64-bit','7zip.7zip','Bitwarden.Bitwarden','Zoom.Zoom',
        'Mozilla.Thunderbird','ShareX.ShareX','voidtools.Everything')
    foreach ($id in $prodApps) { if ($script:AppCheckboxes.ContainsKey($id)) { $script:AppCheckboxes[$id].IsChecked = $true } }
    Write-Log "Productivity preset applied."
})
$window.FindName('btnPresetBasic').Add_Click({
    foreach ($cb in $script:AppCheckboxes.Values) { $cb.IsChecked = $false }
    $basicApps = @('Google.Chrome','7zip.7zip','VideoLAN.VLC','Adobe.Acrobat.Reader.64-bit',
        'voidtools.Everything','Notepad++.Notepad++')
    foreach ($id in $basicApps) { if ($script:AppCheckboxes.ContainsKey($id)) { $script:AppCheckboxes[$id].IsChecked = $true } }
    Write-Log "Essentials preset applied."
})

# ── BUILD TWEAKS TAB ──────────────────────────────────────────────────────────
$script:TweakCheckboxes = @{}

function Build-TweaksTab {
    $pnlTweaks.Children.Clear()
    foreach ($category in $script:TweakCategories.Keys) {
        $header = New-Object System.Windows.Controls.TextBlock
        $header.Text = $category.ToUpper()
        $header.FontSize = 11
        $header.FontWeight = 'Bold'
        $header.Foreground = [System.Windows.Media.BrushConverter]::new().ConvertFrom('#6c5ce7')
        $header.Margin = [System.Windows.Thickness]::new(0,10,0,8)
        $pnlTweaks.Children.Add($header)

        $grid = New-Object System.Windows.Controls.WrapPanel
        $grid.Orientation = 'Horizontal'

        foreach ($tweak in $script:TweakCategories[$category]) {
            $card = New-Object System.Windows.Controls.Border
            $card.Background = [System.Windows.Media.BrushConverter]::new().ConvertFrom('#12121e')
            $card.CornerRadius = [System.Windows.CornerRadius]::new(6)
            $card.BorderBrush = [System.Windows.Media.BrushConverter]::new().ConvertFrom('#1e1e36')
            $card.BorderThickness = [System.Windows.Thickness]::new(1)
            $card.Padding = [System.Windows.Thickness]::new(12,8,12,8)
            $card.Margin = [System.Windows.Thickness]::new(0,0,10,8)
            $card.Width = 320

            $sp = New-Object System.Windows.Controls.StackPanel
            $cb = New-Object System.Windows.Controls.CheckBox
            $cb.Content = $tweak.Name
            $cb.Tag = $tweak.Key
            $cb.Foreground = [System.Windows.Media.BrushConverter]::new().ConvertFrom('#d4d4e8')
            $cb.FontSize = 12.5
            $cb.ToolTip = $tweak.Desc
            $sp.Children.Add($cb)

            $desc = New-Object System.Windows.Controls.TextBlock
            $desc.Text = $tweak.Desc
            $desc.FontSize = 10.5
            $desc.Foreground = [System.Windows.Media.BrushConverter]::new().ConvertFrom('#666680')
            $desc.TextWrapping = 'Wrap'
            $desc.Margin = [System.Windows.Thickness]::new(18,2,0,0)
            $sp.Children.Add($desc)

            $card.Child = $sp
            $grid.Children.Add($card)
            $script:TweakCheckboxes[$tweak.Key] = $cb
        }
        $pnlTweaks.Children.Add($grid)
    }
}
Build-TweaksTab

# Tweak Presets
$window.FindName('btnTweakPresetEssential').Add_Click({
    foreach ($cb in $script:TweakCheckboxes.Values) { $cb.IsChecked = $false }
    $essential = @('RestorePoint','TempFiles','Telemetry','ActivityHistory','LocationTracking',
        'ConsumerFeatures','ServicesManual','Widgets','EndTask','DiskCleanup')
    foreach ($k in $essential) { if ($script:TweakCheckboxes.ContainsKey($k)) { $script:TweakCheckboxes[$k].IsChecked = $true } }
    Write-Log "Essential tweak preset applied."
})
$window.FindName('btnTweakPresetPrivacy').Add_Click({
    foreach ($cb in $script:TweakCheckboxes.Values) { $cb.IsChecked = $false }
    $privacy = @('Telemetry','ActivityHistory','LocationTracking','AdvertisingID','AppLaunchTracking',
        'FeedbackRequests','TailoredExp','DiagnosticData','ClipboardHistory','SpeechRecognition','InputPersonal',
        'Cortana','BingSearch')
    foreach ($k in $privacy) { if ($script:TweakCheckboxes.ContainsKey($k)) { $script:TweakCheckboxes[$k].IsChecked = $true } }
    Write-Log "Privacy tweak preset applied."
})
$window.FindName('btnTweakSelectAll').Add_Click({
    foreach ($cb in $script:TweakCheckboxes.Values) { $cb.IsChecked = $true }
})
$window.FindName('btnTweakDeselectAll').Add_Click({
    foreach ($cb in $script:TweakCheckboxes.Values) { $cb.IsChecked = $false }
})

# ── Tweak Execution Engine ────────────────────────────────────────────────────
function Invoke-Tweak {
    param([string]$Key, [bool]$Undo = $false)
    $action = if ($Undo) { "Undoing" } else { "Applying" }
    Write-Log "$action tweak: $Key"
    switch ($Key) {
        'RestorePoint' {
            if (-not $Undo) {
                try { Checkpoint-Computer -Description "WinForge Restore Point" -RestorePointType "MODIFY_SETTINGS" -ErrorAction Stop; Write-Log "[OK] Restore point created." }
                catch { Write-Log "[!] Could not create restore point: $_" }
            }
        }
        'TempFiles' {
            if (-not $Undo) {
                Remove-Item -Path "$env:TEMP\*" -Recurse -Force -ErrorAction SilentlyContinue
                Remove-Item -Path "C:\Windows\Temp\*" -Recurse -Force -ErrorAction SilentlyContinue
                Write-Log "[OK] Temporary files cleaned."
            }
        }
        'Telemetry' {
            $v = if ($Undo) { 3 } else { 0 }
            Set-ItemProperty -LiteralPath "HKLM:\SOFTWARE\Policies\Microsoft\Windows\DataCollection" -Name "AllowTelemetry" -Value $v -Type DWord -Force 2>$null
            if (-not $Undo) {
                Stop-Service -Name "DiagTrack" -Force -ErrorAction SilentlyContinue
                Set-Service -Name "DiagTrack" -StartupType Disabled -ErrorAction SilentlyContinue
            } else {
                Set-Service -Name "DiagTrack" -StartupType Automatic -ErrorAction SilentlyContinue
                Start-Service -Name "DiagTrack" -ErrorAction SilentlyContinue
            }
            Write-Log "[OK] Telemetry $(if($Undo){'enabled'}else{'disabled'})."
        }
        'ActivityHistory' {
            $v = if ($Undo) { 1 } else { 0 }
            $path = "HKLM:\SOFTWARE\Policies\Microsoft\Windows\System"
            if (-not (Test-Path $path)) { New-Item -Path $path -Force | Out-Null }
            Set-ItemProperty -LiteralPath $path -Name "EnableActivityFeed" -Value $v -Type DWord -Force
            Set-ItemProperty -LiteralPath $path -Name "PublishUserActivities" -Value $v -Type DWord -Force
            Write-Log "[OK] Activity History $(if($Undo){'enabled'}else{'disabled'})."
        }
        'LocationTracking' {
            $v = if ($Undo) { "Allow" } else { "Deny" }
            $path = "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\CapabilityAccessManager\ConsentStore\location"
            if (-not (Test-Path $path)) { New-Item -Path $path -Force | Out-Null }
            Set-ItemProperty -LiteralPath $path -Name "Value" -Value $v -Force
            Write-Log "[OK] Location Tracking $(if($Undo){'enabled'}else{'disabled'})."
        }
        'Hibernation' {
            if ($Undo) { & powercfg /h on 2>$null } else { & powercfg /h off 2>$null }
            Write-Log "[OK] Hibernation $(if($Undo){'enabled'}else{'disabled'})."
        }
        'ConsumerFeatures' {
            $v = if ($Undo) { 0 } else { 1 }
            $path = "HKLM:\SOFTWARE\Policies\Microsoft\Windows\CloudContent"
            if (-not (Test-Path $path)) { New-Item -Path $path -Force | Out-Null }
            Set-ItemProperty -LiteralPath $path -Name "DisableWindowsConsumerFeatures" -Value $v -Type DWord -Force
            Write-Log "[OK] Consumer Features $(if($Undo){'disabled'}else{'blocked'})."
        }
        'ServicesManual' {
            $svcs = @('DiagTrack','dmwappushservice','SysMain','WSearch','MapsBroker','lfsvc','RetailDemo','wisvc')
            foreach ($s in $svcs) {
                if ($Undo) { Set-Service -Name $s -StartupType Automatic -ErrorAction SilentlyContinue }
                else { Set-Service -Name $s -StartupType Manual -ErrorAction SilentlyContinue; Stop-Service -Name $s -Force -ErrorAction SilentlyContinue }
            }
            Write-Log "[OK] Non-essential services set to $(if($Undo){'Automatic'}else{'Manual'})."
        }
        'PS7Telemetry' {
            if ($Undo) { [Environment]::SetEnvironmentVariable('POWERSHELL_TELEMETRY_OPTOUT','0','Machine') }
            else { [Environment]::SetEnvironmentVariable('POWERSHELL_TELEMETRY_OPTOUT','1','Machine') }
            Write-Log "[OK] PS7 Telemetry $(if($Undo){'enabled'}else{'disabled'})."
        }
        'Widgets' {
            $v = if ($Undo) { 1 } else { 0 }
            $path = "HKLM:\SOFTWARE\Policies\Microsoft\Dsh"
            if (-not (Test-Path $path)) { New-Item -Path $path -Force | Out-Null }
            Set-ItemProperty -LiteralPath $path -Name "AllowNewsAndInterests" -Value $v -Type DWord -Force
            Write-Log "[OK] Widgets $(if($Undo){'enabled'}else{'removed'})."
        }
        'EndTask' {
            $v = if ($Undo) { 0 } else { 1 }
            $path = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced\TaskbarDeveloperSettings"
            if (-not (Test-Path $path)) { New-Item -Path $path -Force | Out-Null }
            Set-ItemProperty -LiteralPath $path -Name "TaskbarEndTask" -Value $v -Type DWord -Force
            Write-Log "[OK] End Task in taskbar $(if($Undo){'disabled'}else{'enabled'})."
        }
        'DiskCleanup' {
            if (-not $Undo) {
                Start-Process "cleanmgr.exe" -ArgumentList "/sagerun:1" -NoNewWindow -ErrorAction SilentlyContinue
                Write-Log "[OK] Disk Cleanup launched."
            }
        }
        'Cortana' {
            $v = if ($Undo) { 1 } else { 0 }
            $path = "HKLM:\SOFTWARE\Policies\Microsoft\Windows\Windows Search"
            if (-not (Test-Path $path)) { New-Item -Path $path -Force | Out-Null }
            Set-ItemProperty -LiteralPath $path -Name "AllowCortana" -Value $v -Type DWord -Force
            Write-Log "[OK] Cortana $(if($Undo){'enabled'}else{'disabled'})."
        }
        'GameDVR' {
            $v = if ($Undo) { 1 } else { 0 }
            $path = "HKCU:\System\GameConfigStore"
            if (-not (Test-Path $path)) { New-Item -Path $path -Force | Out-Null }
            Set-ItemProperty -LiteralPath $path -Name "GameDVR_Enabled" -Value $v -Type DWord -Force
            $path2 = "HKLM:\SOFTWARE\Policies\Microsoft\Windows\GameDVR"
            if (-not (Test-Path $path2)) { New-Item -Path $path2 -Force | Out-Null }
            Set-ItemProperty -LiteralPath $path2 -Name "AllowGameDVR" -Value $v -Type DWord -Force
            Write-Log "[OK] GameDVR $(if($Undo){'enabled'}else{'disabled'})."
        }
        'WiFiSense' {
            $v = if ($Undo) { 1 } else { 0 }
            $path = "HKLM:\SOFTWARE\Microsoft\WcmSvc\wifinetworkmanager\config"
            if (-not (Test-Path $path)) { New-Item -Path $path -Force | Out-Null }
            Set-ItemProperty -LiteralPath $path -Name "AutoConnectAllowedOEM" -Value $v -Type DWord -Force
            Write-Log "[OK] WiFi Sense $(if($Undo){'enabled'}else{'disabled'})."
        }
        'StorageSense' {
            $v = if ($Undo) { 1 } else { 0 }
            $path = "HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\StorageSense\Parameters\StoragePolicy"
            if (-not (Test-Path $path)) { New-Item -Path $path -Force | Out-Null }
            Set-ItemProperty -LiteralPath $path -Name "01" -Value $v -Type DWord -Force
            Write-Log "[OK] Storage Sense $(if($Undo){'enabled'}else{'disabled'})."
        }
        'Copilot' {
            $v = if ($Undo) { 1 } else { 0 }
            $path = "HKCU:\Software\Policies\Microsoft\Windows\WindowsCopilot"
            if (-not (Test-Path $path)) { New-Item -Path $path -Force | Out-Null }
            Set-ItemProperty -LiteralPath $path -Name "TurnOffWindowsCopilot" -Value $(if($Undo){0}else{1}) -Type DWord -Force
            Write-Log "[OK] Copilot $(if($Undo){'enabled'}else{'disabled'})."
        }
        'Recall' {
            $v = if ($Undo) { 0 } else { 1 }
            $path = "HKCU:\Software\Policies\Microsoft\Windows\WindowsAI"
            if (-not (Test-Path $path)) { New-Item -Path $path -Force | Out-Null }
            Set-ItemProperty -LiteralPath $path -Name "DisableAIDataAnalysis" -Value $v -Type DWord -Force
            Write-Log "[OK] Recall $(if($Undo){'enabled'}else{'disabled'})."
        }
        'NewsInterests' {
            $v = if ($Undo) { 1 } else { 2 }
            $path = "HKLM:\SOFTWARE\Policies\Microsoft\Windows\Windows Feeds"
            if (-not (Test-Path $path)) { New-Item -Path $path -Force | Out-Null }
            Set-ItemProperty -LiteralPath $path -Name "EnableFeeds" -Value $(if($Undo){1}else{0}) -Type DWord -Force
            Write-Log "[OK] News and Interests $(if($Undo){'enabled'}else{'disabled'})."
        }
        'BingSearch' {
            $v = if ($Undo) { 1 } else { 0 }
            $path = "HKCU:\SOFTWARE\Policies\Microsoft\Windows\Explorer"
            if (-not (Test-Path $path)) { New-Item -Path $path -Force | Out-Null }
            Set-ItemProperty -LiteralPath $path -Name "DisableSearchBoxSuggestions" -Value $(if($Undo){0}else{1}) -Type DWord -Force
            Write-Log "[OK] Bing Search $(if($Undo){'enabled'}else{'disabled'})."
        }
        'SearchHighlights' {
            $v = if ($Undo) { 1 } else { 0 }
            $path = "HKLM:\SOFTWARE\Policies\Microsoft\Windows\Windows Search"
            if (-not (Test-Path $path)) { New-Item -Path $path -Force | Out-Null }
            Set-ItemProperty -LiteralPath $path -Name "EnableDynamicContentInWSB" -Value $v -Type DWord -Force
            Write-Log "[OK] Search Highlights $(if($Undo){'enabled'}else{'disabled'})."
        }
        'FileExtensions' {
            $v = if ($Undo) { 1 } else { 0 }
            Set-ItemProperty -LiteralPath "HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced" -Name "HideFileExt" -Value $v -Type DWord -Force
            Write-Log "[OK] File extensions $(if($Undo){'hidden'}else{'visible'})."
        }
        'HiddenFiles' {
            $v = if ($Undo) { 2 } else { 1 }
            Set-ItemProperty -LiteralPath "HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced" -Name "Hidden" -Value $v -Type DWord -Force
            Write-Log "[OK] Hidden files $(if($Undo){'hidden'}else{'visible'})."
        }
        'MouseAccel' {
            if ($Undo) {
                Set-ItemProperty -LiteralPath "HKCU:\Control Panel\Mouse" -Name "MouseSpeed" -Value "1" -Force
            } else {
                Set-ItemProperty -LiteralPath "HKCU:\Control Panel\Mouse" -Name "MouseSpeed" -Value "0" -Force
                Set-ItemProperty -LiteralPath "HKCU:\Control Panel\Mouse" -Name "MouseThreshold1" -Value "0" -Force
                Set-ItemProperty -LiteralPath "HKCU:\Control Panel\Mouse" -Name "MouseThreshold2" -Value "0" -Force
            }
            Write-Log "[OK] Mouse acceleration $(if($Undo){'enabled'}else{'disabled'})."
        }
        'ClassicContext' {
            if ($Undo) {
                Remove-Item -LiteralPath "HKCU:\Software\Classes\CLSID\{86ca1aa0-34aa-4e8b-a509-50c905bae2a2}" -Recurse -Force -ErrorAction SilentlyContinue
            } else {
                $path = "HKCU:\Software\Classes\CLSID\{86ca1aa0-34aa-4e8b-a509-50c905bae2a2}\InprocServer32"
                New-Item -Path $path -Force | Out-Null
                Set-ItemProperty -LiteralPath $path -Name "(Default)" -Value "" -Force
            }
            Write-Log "[OK] Classic context menu $(if($Undo){'reverted'}else{'enabled'}). Restart Explorer to apply."
        }
        'UltimatePower' {
            if ($Undo) {
                & powercfg /setactive 381b4222-f694-41f0-9685-ff5bb260df2e 2>$null
                Write-Log "[OK] Balanced power plan restored."
            } else {
                & powercfg /duplicatescheme e9a42b02-d5df-448d-aa00-03f14749eb61 2>$null
                $plans = & powercfg /list 2>$null | Out-String
                if ($plans -match '([0-9a-f-]{36}).*Ultimate') {
                    & powercfg /setactive $Matches[1] 2>$null
                }
                Write-Log "[OK] Ultimate Performance plan activated."
            }
        }
        'AdvertisingID' {
            $v = if ($Undo) { 1 } else { 0 }
            $path = "HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\AdvertisingInfo"
            if (-not (Test-Path $path)) { New-Item -Path $path -Force | Out-Null }
            Set-ItemProperty -LiteralPath $path -Name "Enabled" -Value $v -Type DWord -Force
            Write-Log "[OK] Advertising ID $(if($Undo){'enabled'}else{'disabled'})."
        }
        'AppLaunchTracking' {
            $v = if ($Undo) { 1 } else { 0 }
            Set-ItemProperty -LiteralPath "HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\Advanced" -Name "Start_TrackProgs" -Value $v -Type DWord -Force
            Write-Log "[OK] App launch tracking $(if($Undo){'enabled'}else{'disabled'})."
        }
        'FeedbackRequests' {
            $v = if ($Undo) { 1 } else { 0 }
            $path = "HKCU:\SOFTWARE\Microsoft\Siuf\Rules"
            if (-not (Test-Path $path)) { New-Item -Path $path -Force | Out-Null }
            Set-ItemProperty -LiteralPath $path -Name "NumberOfSIUFInPeriod" -Value $v -Type DWord -Force
            Write-Log "[OK] Feedback requests $(if($Undo){'enabled'}else{'disabled'})."
        }
        'TailoredExp' {
            $v = if ($Undo) { 1 } else { 0 }
            $path = "HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Privacy"
            if (-not (Test-Path $path)) { New-Item -Path $path -Force | Out-Null }
            Set-ItemProperty -LiteralPath $path -Name "TailoredExperiencesWithDiagnosticDataEnabled" -Value $v -Type DWord -Force
            Write-Log "[OK] Tailored experiences $(if($Undo){'enabled'}else{'disabled'})."
        }
        'DiagnosticData' {
            $v = if ($Undo) { 3 } else { 0 }
            Set-ItemProperty -LiteralPath "HKLM:\SOFTWARE\Policies\Microsoft\Windows\DataCollection" -Name "AllowTelemetry" -Value $v -Type DWord -Force 2>$null
            Write-Log "[OK] Diagnostic data set to $(if($Undo){'Full'}else{'Minimum'})."
        }
        'ClipboardHistory' {
            $v = if ($Undo) { 1 } else { 0 }
            $path = "HKLM:\SOFTWARE\Policies\Microsoft\Windows\System"
            if (-not (Test-Path $path)) { New-Item -Path $path -Force | Out-Null }
            Set-ItemProperty -LiteralPath $path -Name "AllowClipboardHistory" -Value $v -Type DWord -Force
            Write-Log "[OK] Clipboard history $(if($Undo){'enabled'}else{'disabled'})."
        }
        'SpeechRecognition' {
            $v = if ($Undo) { 1 } else { 0 }
            $path = "HKCU:\SOFTWARE\Microsoft\Speech_OneCore\Settings\OnlineSpeechPrivacy"
            if (-not (Test-Path $path)) { New-Item -Path $path -Force | Out-Null }
            Set-ItemProperty -LiteralPath $path -Name "HasAccepted" -Value $v -Type DWord -Force
            Write-Log "[OK] Online speech recognition $(if($Undo){'enabled'}else{'disabled'})."
        }
        'InputPersonal' {
            $v = if ($Undo) { 1 } else { 0 }
            $path = "HKCU:\SOFTWARE\Microsoft\InputPersonalization"
            if (-not (Test-Path $path)) { New-Item -Path $path -Force | Out-Null }
            Set-ItemProperty -LiteralPath $path -Name "RestrictImplicitTextCollection" -Value $(if($Undo){0}else{1}) -Type DWord -Force
            Set-ItemProperty -LiteralPath $path -Name "RestrictImplicitInkCollection" -Value $(if($Undo){0}else{1}) -Type DWord -Force
            Write-Log "[OK] Input personalization $(if($Undo){'enabled'}else{'disabled'})."
        }
        default { Write-Log "[?] Unknown tweak: $Key" }
    }
}

$window.FindName('btnRunTweaks').Add_Click({
    $selected = @()
    foreach ($kvp in $script:TweakCheckboxes.GetEnumerator()) {
        if ($kvp.Value.IsChecked -eq $true) { $selected += $kvp.Key }
    }
    if ($selected.Count -eq 0) { Write-Log "No tweaks selected."; return }
    Write-Log "Running $($selected.Count) tweak(s)..."
    foreach ($key in $selected) { Invoke-Tweak -Key $key -Undo $false }
    Write-Log "--- Tweaks complete ---"
})

$window.FindName('btnUndoTweaks').Add_Click({
    $selected = @()
    foreach ($kvp in $script:TweakCheckboxes.GetEnumerator()) {
        if ($kvp.Value.IsChecked -eq $true) { $selected += $kvp.Key }
    }
    if ($selected.Count -eq 0) { Write-Log "No tweaks selected to undo."; return }
    Write-Log "Undoing $($selected.Count) tweak(s)..."
    foreach ($key in $selected) { Invoke-Tweak -Key $key -Undo $true }
    Write-Log "--- Undo complete ---"
})

# ── BUILD CONFIG TAB ──────────────────────────────────────────────────────────
function Build-ConfigTab {
    $pnlConfig.Children.Clear()
    foreach ($section in $script:ConfigFeatures.Keys) {
        $header = New-Object System.Windows.Controls.TextBlock
        $header.Text = $section.ToUpper()
        $header.FontSize = 11
        $header.FontWeight = 'Bold'
        $header.Foreground = [System.Windows.Media.BrushConverter]::new().ConvertFrom('#6c5ce7')
        $header.Margin = [System.Windows.Thickness]::new(0,10,0,8)
        $pnlConfig.Children.Add($header)

        $wrap = New-Object System.Windows.Controls.WrapPanel
        $wrap.Orientation = 'Horizontal'

        foreach ($item in $script:ConfigFeatures[$section]) {
            $btn = New-Object System.Windows.Controls.Button
            $btn.Content = $item.Name
            $btn.Style = $window.FindResource('PanelBtn')
            $btn.Margin = [System.Windows.Thickness]::new(0,0,8,8)
            $btn.MinWidth = 200
            $btn.Tag = $item

            $btn.Add_Click({
                $data = $this.Tag
                if ($data.ContainsKey('Panel')) {
                    Write-Log "Opening: $($data.Name)..."
                    Start-Process $data.Panel -ErrorAction SilentlyContinue
                }
                elseif ($data.ContainsKey('Feature')) {
                    Write-Log "Installing feature: $($data.Name)..."
                    $features = $data.Feature -split ';'
                    foreach ($f in $features) {
                        try {
                            Enable-WindowsOptionalFeature -Online -FeatureName $f -NoRestart -ErrorAction Stop | Out-Null
                            Write-Log "[OK] $f enabled."
                        } catch {
                            try {
                                & dism /online /enable-feature /featurename:$f /norestart 2>$null
                                Write-Log "[OK] $f enabled via DISM."
                            } catch { Write-Log "[!] Failed to enable $f" }
                        }
                    }
                }
                elseif ($data.ContainsKey('Fix')) {
                    switch ($data.Fix) {
                        'WindowsUpdate' {
                            Write-Log "Resetting Windows Update components..."
                            $svcs = @('wuauserv','cryptSvc','bits','msiserver')
                            foreach ($s in $svcs) { Stop-Service -Name $s -Force -ErrorAction SilentlyContinue }
                            Remove-Item "$env:windir\SoftwareDistribution" -Recurse -Force -ErrorAction SilentlyContinue
                            Remove-Item "$env:windir\System32\catroot2" -Recurse -Force -ErrorAction SilentlyContinue
                            foreach ($s in $svcs) { Start-Service -Name $s -ErrorAction SilentlyContinue }
                            Write-Log "[OK] Windows Update reset."
                        }
                        'SFC' {
                            Write-Log "Running System File Checker..."
                            $ps = [PowerShell]::Create()
                            $ps.AddScript({ & sfc /scannow 2>&1 | Out-String }) | Out-Null
                            $handle = $ps.BeginInvoke()
                            $t = New-Object System.Windows.Threading.DispatcherTimer
                            $t.Interval = [TimeSpan]::FromMilliseconds(1000)
                            $t.Add_Tick({
                                if ($handle.IsCompleted) { $this.Stop(); Write-Log "[OK] SFC complete."; $ps.Dispose() }
                            }.GetNewClosure())
                            $t.Start()
                        }
                        'DISM' {
                            Write-Log "Running DISM repair..."
                            $ps = [PowerShell]::Create()
                            $ps.AddScript({ & DISM /Online /Cleanup-Image /RestoreHealth 2>&1 | Out-String }) | Out-Null
                            $handle = $ps.BeginInvoke()
                            $t = New-Object System.Windows.Threading.DispatcherTimer
                            $t.Interval = [TimeSpan]::FromMilliseconds(1000)
                            $t.Add_Tick({
                                if ($handle.IsCompleted) { $this.Stop(); Write-Log "[OK] DISM repair complete."; $ps.Dispose() }
                            }.GetNewClosure())
                            $t.Start()
                        }
                        'Network' {
                            Write-Log "Resetting network stack..."
                            & netsh winsock reset 2>$null
                            & netsh int ip reset 2>$null
                            & ipconfig /release 2>$null
                            & ipconfig /renew 2>$null
                            Write-Log "[OK] Network stack reset. Restart recommended."
                        }
                        'DNS' {
                            & ipconfig /flushdns 2>$null
                            Write-Log "[OK] DNS cache cleared."
                        }
                        'Autologon' {
                            Start-Process "netplwiz" -ErrorAction SilentlyContinue
                            Write-Log "Autologon dialog opened."
                        }
                    }
                }
            }.GetNewClosure())

            $wrap.Children.Add($btn)
        }
        $pnlConfig.Children.Add($wrap)
    }
}
Build-ConfigTab

# ── UPDATES TAB ────────────────────────────────────────────────────────────────
$window.FindName('btnApplyDNS').Add_Click({
    $sel = $window.FindName('cmbDNS').SelectedItem.Content.ToString()
    Write-Log "Setting DNS to: $sel"
    $dnsMap = @{
        'Default (DHCP)' = @()
        'Google (8.8.8.8)' = @('8.8.8.8','8.8.4.4')
        'Cloudflare (1.1.1.1)' = @('1.1.1.1','1.0.0.1')
        'Quad9 (9.9.9.9)' = @('9.9.9.9','149.112.112.112')
        'OpenDNS (208.67.222.222)' = @('208.67.222.222','208.67.220.220')
        'AdGuard (94.140.14.14)' = @('94.140.14.14','94.140.15.15')
    }
    $adapters = Get-NetAdapter | Where-Object { $_.Status -eq 'Up' }
    foreach ($a in $adapters) {
        if ($dnsMap[$sel].Count -eq 0) {
            Set-DnsClientServerAddress -InterfaceIndex $a.InterfaceIndex -ResetServerAddresses
        } else {
            Set-DnsClientServerAddress -InterfaceIndex $a.InterfaceIndex -ServerAddresses $dnsMap[$sel]
        }
    }
    & ipconfig /flushdns 2>$null
    Write-Log "[OK] DNS configured to $sel on all active adapters."
})

$window.FindName('btnUpdateDefault').Add_Click({
    Write-Log "Setting Windows Update to default..."
    Remove-ItemProperty -LiteralPath "HKLM:\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate\AU" -Name "NoAutoUpdate" -ErrorAction SilentlyContinue
    Remove-ItemProperty -LiteralPath "HKLM:\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate" -Name "DeferQualityUpdates" -ErrorAction SilentlyContinue
    Remove-ItemProperty -LiteralPath "HKLM:\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate" -Name "DeferFeatureUpdates" -ErrorAction SilentlyContinue
    Write-Log "[OK] Windows Update set to default policy."
})

$window.FindName('btnUpdateSecurity').Add_Click({
    Write-Log "Setting Windows Update to security-only..."
    $path = "HKLM:\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate"
    if (-not (Test-Path $path)) { New-Item -Path $path -Force | Out-Null }
    if (-not (Test-Path "$path\AU")) { New-Item -Path "$path\AU" -Force | Out-Null }
    Set-ItemProperty -LiteralPath $path -Name "DeferFeatureUpdates" -Value 1 -Type DWord -Force
    Set-ItemProperty -LiteralPath $path -Name "DeferFeatureUpdatesPeriodInDays" -Value 365 -Type DWord -Force
    Set-ItemProperty -LiteralPath $path -Name "DeferQualityUpdates" -Value 0 -Type DWord -Force
    Write-Log "[OK] Windows Update set to security-only (feature updates deferred 365 days)."
})

$window.FindName('btnUpdateDisable').Add_Click({
    Write-Log "Disabling Windows Update..."
    $path = "HKLM:\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate\AU"
    if (-not (Test-Path $path)) { New-Item -Path $path -Force | Out-Null }
    Set-ItemProperty -LiteralPath $path -Name "NoAutoUpdate" -Value 1 -Type DWord -Force
    Stop-Service -Name "wuauserv" -Force -ErrorAction SilentlyContinue
    Set-Service -Name "wuauserv" -StartupType Disabled -ErrorAction SilentlyContinue
    Write-Log "[OK] Windows Update disabled. Re-enable via Default policy."
})

$window.FindName('btnCheckUpdates').Add_Click({
    Write-Log "Opening Windows Update..."
    Start-Process "ms-settings:windowsupdate" -ErrorAction SilentlyContinue
})

$window.FindName('btnPauseUpdates').Add_Click({
    Write-Log "Pausing updates for 35 days..."
    $date = (Get-Date).AddDays(35).ToString("yyyy-MM-ddTHH:mm:ssZ")
    $path = "HKLM:\SOFTWARE\Microsoft\WindowsUpdate\UX\Settings"
    if (-not (Test-Path $path)) { New-Item -Path $path -Force | Out-Null }
    Set-ItemProperty -LiteralPath $path -Name "PauseUpdatesExpiryTime" -Value $date -Force
    Set-ItemProperty -LiteralPath $path -Name "PauseFeatureUpdatesStartTime" -Value (Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ") -Force
    Set-ItemProperty -LiteralPath $path -Name "PauseFeatureUpdatesEndTime" -Value $date -Force
    Set-ItemProperty -LiteralPath $path -Name "PauseQualityUpdatesStartTime" -Value (Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ") -Force
    Set-ItemProperty -LiteralPath $path -Name "PauseQualityUpdatesEndTime" -Value $date -Force
    Write-Log "[OK] Updates paused until $date"
})

$window.FindName('btnResetWU').Add_Click({
    Write-Log "Resetting Windows Update..."
    $svcs = @('wuauserv','cryptSvc','bits','msiserver')
    foreach ($s in $svcs) { Stop-Service -Name $s -Force -ErrorAction SilentlyContinue }
    Remove-Item "$env:windir\SoftwareDistribution" -Recurse -Force -ErrorAction SilentlyContinue
    Remove-Item "$env:windir\System32\catroot2" -Recurse -Force -ErrorAction SilentlyContinue
    foreach ($s in $svcs) { Start-Service -Name $s -ErrorAction SilentlyContinue }
    Write-Log "[OK] Windows Update components reset."
})

# ── Export/Import Config ───────────────────────────────────────────────────────
$navExport.Add_Click({
    $dlg = New-Object Microsoft.Win32.SaveFileDialog
    $dlg.Filter = "JSON Config|*.json"
    $dlg.FileName = "WinForge-Config.json"
    if ($dlg.ShowDialog()) {
        $config = @{
            WFApps = @(foreach ($kvp in $script:AppCheckboxes.GetEnumerator()) { if ($kvp.Value.IsChecked) { $kvp.Key } })
            WFTweaks = @(foreach ($kvp in $script:TweakCheckboxes.GetEnumerator()) { if ($kvp.Value.IsChecked) { $kvp.Key } })
        }
        $config | ConvertTo-Json | Set-Content -Path $dlg.FileName -Encoding UTF8
        Write-Log "[OK] Config exported to $($dlg.FileName)"
    }
})

$navImport.Add_Click({
    $dlg = New-Object Microsoft.Win32.OpenFileDialog
    $dlg.Filter = "JSON Config|*.json"
    if ($dlg.ShowDialog()) {
        try {
            $config = Get-Content -Path $dlg.FileName -Raw | ConvertFrom-Json
            foreach ($cb in $script:AppCheckboxes.Values) { $cb.IsChecked = $false }
            foreach ($cb in $script:TweakCheckboxes.Values) { $cb.IsChecked = $false }
            if ($config.WFApps) {
                foreach ($id in $config.WFApps) {
                    if ($script:AppCheckboxes.ContainsKey($id)) { $script:AppCheckboxes[$id].IsChecked = $true }
                }
            }
            if ($config.WFTweaks) {
                foreach ($k in $config.WFTweaks) {
                    if ($script:TweakCheckboxes.ContainsKey($k)) { $script:TweakCheckboxes[$k].IsChecked = $true }
                }
            }
            Write-Log "[OK] Config imported from $($dlg.FileName)"
        } catch { Write-Log "[!] Failed to import config: $_" }
    }
})

# ── Launch ─────────────────────────────────────────────────────────────────────
Write-Log "WinForge v0.0.1 initialized. Ready."
Write-Log "System: $($txtSysInfo.Text -replace "`n",' | ')"
$window.ShowDialog() | Out-Null
