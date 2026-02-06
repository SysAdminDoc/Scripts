<#
.SYNOPSIS
    ExtractorX - Open Source Bulk Archive Extraction Tool
.DESCRIPTION
    A comprehensive, modern replacement for ExtractNow built in PowerShell WPF.
    Features: Batch extraction, password list cycling, directory watch/auto-extract,
    nested archive extraction, output path macros, post-extraction actions, and more.
.AUTHOR
    SysAdminDoc
.VERSION
    1.0.0
.LICENSE
    MIT
#>

#Requires -Version 5.1
param([string[]]$FilesToExtract)

# =====================================================================
# STA Check - relaunch if needed
# =====================================================================
Add-Type -AssemblyName PresentationFramework
Add-Type -AssemblyName PresentationCore
Add-Type -AssemblyName WindowsBase
Add-Type -AssemblyName System.Windows.Forms

if ([Threading.Thread]::CurrentThread.GetApartmentState() -ne 'STA') {
    $scriptPath = $MyInvocation.MyCommand.Definition
    $argList = @('-NoProfile', '-STA', '-ExecutionPolicy', 'Bypass', '-File', "`"$scriptPath`"")
    if ($FilesToExtract) { $argList += $FilesToExtract }
    Start-Process powershell.exe -ArgumentList $argList
    exit
}

# =====================================================================
# Configuration & Globals
# =====================================================================
$script:AppName    = "ExtractorX"
$script:AppVersion = "1.0.0"
$script:AppDataDir = Join-Path $env:APPDATA $script:AppName
$script:ConfigPath = Join-Path $script:AppDataDir "config.json"
$script:PasswordFile = Join-Path $script:AppDataDir "passwords.dat"
$script:LogDir     = Join-Path $script:AppDataDir "logs"
$script:ScriptPath = $PSCommandPath
if (-not $script:ScriptPath) { $script:ScriptPath = $MyInvocation.MyCommand.Definition }
$script:7zPath     = $null

$script:ArchiveExtensions = @(
    '.zip','.7z','.rar','.tar','.gz','.gzip','.tgz','.bz2','.bzip2','.tbz2',
    '.xz','.txz','.lzma','.tlz','.lz','.iso','.cab','.arj','.lzh','.lha',
    '.cpio','.rpm','.deb','.dmg','.fat','.hfs','.ntfs','.vhd','.vhdx',
    '.vmdk','.wim','.swm','.esd','.nsis','.msi','.msp','.chm',
    '.z','.zst','.zstd','.apk','.jar','.war','.ear',
    '.xpi','.odt','.ods','.odp','.epub','.cbz','.cbr','.cb7',
    '.squashfs','.cramfs','.qcow2','.001'
)

$script:MagicBytes = @{
    '504B0304'         = '.zip'
    '504B0506'         = '.zip'
    '504B0708'         = '.zip'
    '377ABCAF271C'     = '.7z'
    '526172211A0700'   = '.rar'
    '526172211A07'     = '.rar'
    '1F8B'             = '.gz'
    '425A68'           = '.bz2'
    'FD377A585A00'     = '.xz'
    '4D534346'         = '.cab'
    '7573746172'       = '.tar'
}

$script:DefaultConfig = @{
    OutputPath             = '{ArchiveFolder}\{ArchiveName}'
    OverwriteMode          = 'Always'
    PostAction             = 'None'
    PostActionFolder       = ''
    DeleteAfterExtract     = $false
    NestedExtraction       = $true
    NestedMaxDepth         = 5
    RemoveDuplicateFolder  = $true
    ScanMagicBytes         = $true
    WatchFolders           = @()
    WatchRecursive         = $true
    WatchAutoExtract       = $true
    FileExclusions         = 'Thumbs.db;desktop.ini;.DS_Store'
    AlwaysOnTop            = $false
    ShowNotifications      = $true
    WindowWidth            = 1100
    WindowHeight           = 720
}

# =====================================================================
# Thread-safe message queue - background threads NEVER touch UI
# =====================================================================
$script:UIQueue = [System.Collections.Concurrent.ConcurrentQueue[hashtable]]::new()

function Send-UIMessage {
    param([string]$Type, [hashtable]$Data = @{})
    $msg = @{ Type = $Type } + $Data
    $script:UIQueue.Enqueue($msg)
}

# =====================================================================
# Helper Functions
# =====================================================================
function Initialize-AppDirectories {
    @($script:AppDataDir, $script:LogDir) | ForEach-Object {
        if (-not (Test-Path $_)) { New-Item -Path $_ -ItemType Directory -Force | Out-Null }
    }
}

function Load-Config {
    if (Test-Path $script:ConfigPath) {
        try {
            $json = Get-Content $script:ConfigPath -Raw | ConvertFrom-Json
            $config = @{}
            $script:DefaultConfig.Keys | ForEach-Object {
                if ($null -ne $json.$_) { $config[$_] = $json.$_ } else { $config[$_] = $script:DefaultConfig[$_] }
            }
            return $config
        } catch { return $script:DefaultConfig.Clone() }
    }
    return $script:DefaultConfig.Clone()
}

function Save-Config {
    param([hashtable]$Config)
    try { $Config | ConvertTo-Json -Depth 5 | Set-Content $script:ConfigPath -Force } catch {}
}

function Find-7Zip {
    $locations = @(
        (Join-Path $script:AppDataDir "7z.exe"),
        "C:\Program Files\7-Zip\7z.exe",
        "C:\Program Files (x86)\7-Zip\7z.exe",
        (Join-Path $env:LOCALAPPDATA "Programs\7-Zip\7z.exe")
    )
    $pathExe = Get-Command 7z.exe -ErrorAction SilentlyContinue
    if ($pathExe) { $locations = @($pathExe.Source) + $locations }
    foreach ($loc in $locations) { if (Test-Path $loc) { return $loc } }
    return $null
}

function Get-ArchiveFileSize {
    param([string]$FilePath)
    try {
        $size = (Get-Item $FilePath -Force).Length
        if ($size -ge 1GB) { return "{0:N2} GB" -f ($size / 1GB) }
        if ($size -ge 1MB) { return "{0:N1} MB" -f ($size / 1MB) }
        if ($size -ge 1KB) { return "{0:N0} KB" -f ($size / 1KB) }
        return "$size B"
    } catch { return "N/A" }
}

function Test-IsArchive {
    param([string]$FilePath)
    return ([IO.Path]::GetExtension($FilePath).ToLower() -in $script:ArchiveExtensions)
}

function Resolve-OutputPath {
    param([string]$Template, [string]$ArchivePath)
    $archiveDir  = [IO.Path]::GetDirectoryName($ArchivePath)
    $archiveName = [IO.Path]::GetFileNameWithoutExtension($ArchivePath)
    if ($archiveName -match '\.tar$') { $archiveName = [IO.Path]::GetFileNameWithoutExtension($archiveName) }
    $archiveExt = [IO.Path]::GetExtension($ArchivePath).TrimStart('.')
    $result = $Template
    $result = $result -replace '\{ArchiveFolder\}', $archiveDir
    $result = $result -replace '\{ArchiveName\}', $archiveName
    $result = $result -replace '\{ArchiveExtension\}', $archiveExt
    $result = $result -replace '\{Guid\}', ([Guid]::NewGuid().ToString('N').Substring(0,8))
    $result = $result -replace '\{Desktop\}', [Environment]::GetFolderPath('Desktop')
    $result = $result -replace '\{Date\}', (Get-Date -Format 'yyyyMMdd')
    $result = $result -replace '\{Time\}', (Get-Date -Format 'HHmmss')
    if ($result -match '\{Env:([^}]+)\}') {
        $result = [regex]::Replace($result, '\{Env:([^}]+)\}', { param($m) [Environment]::GetEnvironmentVariable($m.Groups[1].Value) })
    }
    if ($result -match '\{ArchiveNameUnique\}') {
        $base = $result -replace '\{ArchiveNameUnique\}', $archiveName
        if (Test-Path $base) {
            $c = 1; do { $tp = $result -replace '\{ArchiveNameUnique\}', "${archiveName} ($c)"; $c++ } while (Test-Path $tp)
            $result = $tp
        } else { $result = $base }
    }
    return $result
}

# =====================================================================
# Password Management
# =====================================================================
function Load-Passwords {
    if (Test-Path $script:PasswordFile) {
        try {
            $lines = Get-Content $script:PasswordFile -Force
            $passwords = @()
            foreach ($line in $lines) {
                if ([string]::IsNullOrWhiteSpace($line)) { continue }
                try {
                    $secure = $line | ConvertTo-SecureString -ErrorAction Stop
                    $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
                    $plain = [Runtime.InteropServices.Marshal]::PtrToStringAuto($bstr)
                    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
                    $passwords += $plain
                } catch { $passwords += $line }
            }
            return $passwords
        } catch { return @() }
    }
    return @()
}

function Save-Passwords {
    param([string[]]$Passwords)
    try {
        $encrypted = $Passwords | Where-Object { -not [string]::IsNullOrWhiteSpace($_) } | ForEach-Object {
            $_ | ConvertTo-SecureString -AsPlainText -Force | ConvertFrom-SecureString
        }
        $encrypted | Set-Content $script:PasswordFile -Force
    } catch {}
}

# =====================================================================
# Context Menu
# =====================================================================
function Install-ContextMenu {
    $sp = $script:ScriptPath
    if (-not $sp) { return }
    $menuName = "ExtractorX"
    $command = "powershell.exe -NoProfile -STA -ExecutionPolicy Bypass -File `"$sp`" `"%1`""
    foreach ($ext in $script:ArchiveExtensions) {
        $regPath = "HKCU:\Software\Classes\SystemFileAssociations\$ext\shell\$menuName"
        try {
            New-Item -Path "$regPath\command" -Force -Value $command | Out-Null
            Set-ItemProperty -Path $regPath -Name "(Default)" -Value "Extract with ExtractorX" -Force
        } catch {}
    }
    $dirPath = "HKCU:\Software\Classes\Directory\shell\$menuName"
    try {
        New-Item -Path "$dirPath\command" -Force -Value "powershell.exe -NoProfile -STA -ExecutionPolicy Bypass -File `"$sp`"" | Out-Null
        Set-ItemProperty -Path $dirPath -Name "(Default)" -Value "Open ExtractorX" -Force
    } catch {}
}

function Uninstall-ContextMenu {
    $menuName = "ExtractorX"
    foreach ($ext in $script:ArchiveExtensions) {
        $regPath = "HKCU:\Software\Classes\SystemFileAssociations\$ext\shell\$menuName"
        if (Test-Path $regPath) { Remove-Item $regPath -Recurse -Force -ErrorAction SilentlyContinue }
    }
    $dirPath = "HKCU:\Software\Classes\Directory\shell\$menuName"
    if (Test-Path $dirPath) { Remove-Item $dirPath -Recurse -Force -ErrorAction SilentlyContinue }
}

# =====================================================================
# Initialize
# =====================================================================
Initialize-AppDirectories
$script:Config = Load-Config
$script:7zPath = Find-7Zip
$script:Passwords = Load-Passwords

# =====================================================================
# WPF XAML
# =====================================================================
[xml]$xaml = @"
<Window
    xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
    xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
    Title="ExtractorX v1.0.0 - Bulk Archive Extraction Tool"
    Width="1100" Height="720" MinWidth="900" MinHeight="600"
    WindowStartupLocation="CenterScreen"
    Background="#FF101014" Foreground="#FFE0E0E0" AllowDrop="True">
    <Window.Resources>
        <SolidColorBrush x:Key="AccentBrush" Color="#FF00B4D8"/>
        <SolidColorBrush x:Key="AccentHoverBrush" Color="#FF0096C7"/>
        <SolidColorBrush x:Key="AccentDarkBrush" Color="#FF023E8A"/>
        <SolidColorBrush x:Key="SuccessBrush" Color="#FF6BCB77"/>
        <SolidColorBrush x:Key="ErrorBrush" Color="#FFFF6B6B"/>
        <SolidColorBrush x:Key="WarningBrush" Color="#FFFFD93D"/>
        <SolidColorBrush x:Key="SurfaceBrush" Color="#FF1A1A22"/>
        <SolidColorBrush x:Key="Surface2Brush" Color="#FF232330"/>
        <SolidColorBrush x:Key="Surface3Brush" Color="#FF2A2A3A"/>
        <SolidColorBrush x:Key="BorderBrush" Color="#FF3A3A4A"/>
        <SolidColorBrush x:Key="TextBrush" Color="#FFE0E0E0"/>
        <SolidColorBrush x:Key="TextDimBrush" Color="#FF888899"/>
        <Style x:Key="AccentButton" TargetType="Button">
            <Setter Property="Background" Value="{StaticResource AccentBrush}"/>
            <Setter Property="Foreground" Value="White"/>
            <Setter Property="BorderThickness" Value="0"/>
            <Setter Property="Padding" Value="16,8"/>
            <Setter Property="FontSize" Value="12"/>
            <Setter Property="FontWeight" Value="SemiBold"/>
            <Setter Property="Cursor" Value="Hand"/>
            <Setter Property="Template">
                <Setter.Value>
                    <ControlTemplate TargetType="Button">
                        <Border x:Name="bd" Background="{TemplateBinding Background}" CornerRadius="6" Padding="{TemplateBinding Padding}">
                            <ContentPresenter HorizontalAlignment="Center" VerticalAlignment="Center"/>
                        </Border>
                        <ControlTemplate.Triggers>
                            <Trigger Property="IsMouseOver" Value="True"><Setter TargetName="bd" Property="Background" Value="{StaticResource AccentHoverBrush}"/></Trigger>
                            <Trigger Property="IsEnabled" Value="False"><Setter TargetName="bd" Property="Opacity" Value="0.4"/></Trigger>
                        </ControlTemplate.Triggers>
                    </ControlTemplate>
                </Setter.Value>
            </Setter>
        </Style>
        <Style x:Key="SubtleButton" TargetType="Button">
            <Setter Property="Background" Value="{StaticResource Surface3Brush}"/>
            <Setter Property="Foreground" Value="{StaticResource TextBrush}"/>
            <Setter Property="BorderThickness" Value="1"/>
            <Setter Property="BorderBrush" Value="{StaticResource BorderBrush}"/>
            <Setter Property="Padding" Value="14,7"/>
            <Setter Property="FontSize" Value="12"/>
            <Setter Property="Cursor" Value="Hand"/>
            <Setter Property="Template">
                <Setter.Value>
                    <ControlTemplate TargetType="Button">
                        <Border x:Name="bd" Background="{TemplateBinding Background}" CornerRadius="6" Padding="{TemplateBinding Padding}" BorderThickness="{TemplateBinding BorderThickness}" BorderBrush="{TemplateBinding BorderBrush}">
                            <ContentPresenter HorizontalAlignment="Center" VerticalAlignment="Center"/>
                        </Border>
                        <ControlTemplate.Triggers>
                            <Trigger Property="IsMouseOver" Value="True"><Setter TargetName="bd" Property="Background" Value="#FF3A3A4E"/></Trigger>
                            <Trigger Property="IsEnabled" Value="False"><Setter TargetName="bd" Property="Opacity" Value="0.4"/></Trigger>
                        </ControlTemplate.Triggers>
                    </ControlTemplate>
                </Setter.Value>
            </Setter>
        </Style>
        <Style x:Key="DangerButton" TargetType="Button" BasedOn="{StaticResource SubtleButton}">
            <Setter Property="Foreground" Value="{StaticResource ErrorBrush}"/>
            <Setter Property="BorderBrush" Value="#44FF6B6B"/>
        </Style>
        <Style TargetType="TextBox">
            <Setter Property="Background" Value="{StaticResource Surface2Brush}"/>
            <Setter Property="Foreground" Value="{StaticResource TextBrush}"/>
            <Setter Property="BorderBrush" Value="{StaticResource BorderBrush}"/>
            <Setter Property="BorderThickness" Value="1"/>
            <Setter Property="Padding" Value="8,6"/>
            <Setter Property="FontSize" Value="12.5"/>
            <Setter Property="CaretBrush" Value="{StaticResource AccentBrush}"/>
            <Setter Property="Template">
                <Setter.Value>
                    <ControlTemplate TargetType="TextBox">
                        <Border x:Name="bd" Background="{TemplateBinding Background}" CornerRadius="6" BorderThickness="{TemplateBinding BorderThickness}" BorderBrush="{TemplateBinding BorderBrush}" Padding="{TemplateBinding Padding}">
                            <ScrollViewer x:Name="PART_ContentHost"/>
                        </Border>
                        <ControlTemplate.Triggers>
                            <Trigger Property="IsFocused" Value="True"><Setter TargetName="bd" Property="BorderBrush" Value="{StaticResource AccentBrush}"/></Trigger>
                        </ControlTemplate.Triggers>
                    </ControlTemplate>
                </Setter.Value>
            </Setter>
        </Style>
        <Style TargetType="CheckBox">
            <Setter Property="Foreground" Value="{StaticResource TextBrush}"/>
            <Setter Property="FontSize" Value="12.5"/>
            <Setter Property="Margin" Value="0,3"/>
            <Setter Property="Template">
                <Setter.Value>
                    <ControlTemplate TargetType="CheckBox">
                        <StackPanel Orientation="Horizontal">
                            <Border x:Name="box" Width="18" Height="18" CornerRadius="4" BorderThickness="1.5" BorderBrush="{StaticResource BorderBrush}" Background="{StaticResource Surface2Brush}" VerticalAlignment="Center" Margin="0,0,8,0">
                                <TextBlock x:Name="check" Text="&#x2713;" FontSize="12" FontWeight="Bold" Foreground="White" HorizontalAlignment="Center" VerticalAlignment="Center" Visibility="Collapsed"/>
                            </Border>
                            <ContentPresenter VerticalAlignment="Center"/>
                        </StackPanel>
                        <ControlTemplate.Triggers>
                            <Trigger Property="IsChecked" Value="True">
                                <Setter TargetName="box" Property="Background" Value="{StaticResource AccentBrush}"/>
                                <Setter TargetName="box" Property="BorderBrush" Value="{StaticResource AccentBrush}"/>
                                <Setter TargetName="check" Property="Visibility" Value="Visible"/>
                            </Trigger>
                        </ControlTemplate.Triggers>
                    </ControlTemplate>
                </Setter.Value>
            </Setter>
        </Style>
        <ControlTemplate x:Key="ComboBoxToggleButton" TargetType="ToggleButton">
            <Grid><Grid.ColumnDefinitions><ColumnDefinition/><ColumnDefinition Width="28"/></Grid.ColumnDefinitions>
                <Border x:Name="Border" Grid.ColumnSpan="2" CornerRadius="6" Background="{StaticResource Surface2Brush}" BorderBrush="{StaticResource BorderBrush}" BorderThickness="1"/>
                <Path Grid.Column="1" Fill="{StaticResource TextDimBrush}" HorizontalAlignment="Center" VerticalAlignment="Center" Data="M 0 0 L 5 5 L 10 0 Z"/>
            </Grid>
            <ControlTemplate.Triggers><Trigger Property="IsMouseOver" Value="True"><Setter TargetName="Border" Property="BorderBrush" Value="{StaticResource AccentBrush}"/></Trigger></ControlTemplate.Triggers>
        </ControlTemplate>
        <Style TargetType="ComboBox">
            <Setter Property="Foreground" Value="{StaticResource TextBrush}"/><Setter Property="FontSize" Value="12.5"/><Setter Property="Height" Value="32"/>
            <Setter Property="Template">
                <Setter.Value>
                    <ControlTemplate TargetType="ComboBox">
                        <Grid>
                            <ToggleButton Template="{StaticResource ComboBoxToggleButton}" IsChecked="{Binding IsDropDownOpen, Mode=TwoWay, RelativeSource={RelativeSource TemplatedParent}}" Focusable="False" ClickMode="Press"/>
                            <ContentPresenter IsHitTestVisible="False" Content="{TemplateBinding SelectionBoxItem}" Margin="10,0,28,0" VerticalAlignment="Center" HorizontalAlignment="Left"/>
                            <Popup Placement="Bottom" IsOpen="{TemplateBinding IsDropDownOpen}" AllowsTransparency="True" Focusable="False" PopupAnimation="Slide">
                                <Grid SnapsToDevicePixels="True" MinWidth="{TemplateBinding ActualWidth}" MaxHeight="{TemplateBinding MaxDropDownHeight}">
                                    <Border Background="{StaticResource Surface2Brush}" BorderBrush="{StaticResource BorderBrush}" BorderThickness="1" CornerRadius="6" Margin="0,2,0,0"/>
                                    <ScrollViewer Margin="4,6" SnapsToDevicePixels="True"><StackPanel IsItemsHost="True"/></ScrollViewer>
                                </Grid>
                            </Popup>
                        </Grid>
                    </ControlTemplate>
                </Setter.Value>
            </Setter>
        </Style>
        <Style TargetType="ComboBoxItem">
            <Setter Property="Foreground" Value="{StaticResource TextBrush}"/><Setter Property="Padding" Value="8,5"/>
            <Setter Property="Template"><Setter.Value>
                <ControlTemplate TargetType="ComboBoxItem">
                    <Border x:Name="bd" Background="Transparent" Padding="{TemplateBinding Padding}" CornerRadius="4"><ContentPresenter/></Border>
                    <ControlTemplate.Triggers>
                        <Trigger Property="IsHighlighted" Value="True"><Setter TargetName="bd" Property="Background" Value="{StaticResource Surface3Brush}"/></Trigger>
                        <Trigger Property="IsSelected" Value="True"><Setter TargetName="bd" Property="Background" Value="{StaticResource AccentDarkBrush}"/></Trigger>
                    </ControlTemplate.Triggers>
                </ControlTemplate>
            </Setter.Value></Setter>
        </Style>
        <Style TargetType="TabControl"><Setter Property="Background" Value="Transparent"/><Setter Property="BorderThickness" Value="0"/></Style>
        <Style TargetType="TabItem">
            <Setter Property="Foreground" Value="{StaticResource TextDimBrush}"/><Setter Property="FontSize" Value="13"/><Setter Property="Padding" Value="18,10"/>
            <Setter Property="Template"><Setter.Value>
                <ControlTemplate TargetType="TabItem">
                    <Border x:Name="bd" Padding="{TemplateBinding Padding}" Background="Transparent" Cursor="Hand">
                        <StackPanel><ContentPresenter x:Name="cp" ContentSource="Header" HorizontalAlignment="Center"/>
                            <Border x:Name="ind" Height="2" CornerRadius="1" Margin="0,6,0,0" Background="Transparent"/></StackPanel>
                    </Border>
                    <ControlTemplate.Triggers>
                        <Trigger Property="IsSelected" Value="True">
                            <Setter TargetName="cp" Property="TextBlock.Foreground" Value="{StaticResource AccentBrush}"/>
                            <Setter TargetName="cp" Property="TextBlock.FontWeight" Value="SemiBold"/>
                            <Setter TargetName="ind" Property="Background" Value="{StaticResource AccentBrush}"/>
                        </Trigger>
                        <Trigger Property="IsMouseOver" Value="True"><Setter TargetName="cp" Property="TextBlock.Foreground" Value="{StaticResource TextBrush}"/></Trigger>
                    </ControlTemplate.Triggers>
                </ControlTemplate>
            </Setter.Value></Setter>
        </Style>
        <Style TargetType="ListView"><Setter Property="Background" Value="{StaticResource SurfaceBrush}"/><Setter Property="Foreground" Value="{StaticResource TextBrush}"/><Setter Property="BorderBrush" Value="{StaticResource BorderBrush}"/><Setter Property="BorderThickness" Value="1"/><Setter Property="FontSize" Value="12"/></Style>
        <Style TargetType="ListViewItem">
            <Setter Property="Foreground" Value="{StaticResource TextBrush}"/><Setter Property="Padding" Value="4,6"/>
            <Setter Property="Template"><Setter.Value>
                <ControlTemplate TargetType="ListViewItem">
                    <Border x:Name="bd" Background="Transparent" Padding="{TemplateBinding Padding}" BorderThickness="0,0,0,1" BorderBrush="#15FFFFFF">
                        <GridViewRowPresenter Content="{TemplateBinding Content}"/></Border>
                    <ControlTemplate.Triggers>
                        <Trigger Property="IsMouseOver" Value="True"><Setter TargetName="bd" Property="Background" Value="#18FFFFFF"/></Trigger>
                        <Trigger Property="IsSelected" Value="True"><Setter TargetName="bd" Property="Background" Value="#25FFFFFF"/></Trigger>
                    </ControlTemplate.Triggers>
                </ControlTemplate>
            </Setter.Value></Setter>
        </Style>
        <Style TargetType="GridViewColumnHeader"><Setter Property="Background" Value="{StaticResource Surface3Brush}"/><Setter Property="Foreground" Value="{StaticResource TextDimBrush}"/><Setter Property="BorderThickness" Value="0,0,1,1"/><Setter Property="BorderBrush" Value="{StaticResource BorderBrush}"/><Setter Property="Padding" Value="10,8"/><Setter Property="FontSize" Value="11"/><Setter Property="FontWeight" Value="SemiBold"/><Setter Property="HorizontalContentAlignment" Value="Left"/></Style>
        <Style TargetType="ListBox"><Setter Property="Background" Value="{StaticResource SurfaceBrush}"/><Setter Property="Foreground" Value="{StaticResource TextBrush}"/><Setter Property="BorderBrush" Value="{StaticResource BorderBrush}"/><Setter Property="BorderThickness" Value="1"/></Style>
        <Style TargetType="ListBoxItem">
            <Setter Property="Foreground" Value="{StaticResource TextBrush}"/><Setter Property="Padding" Value="10,6"/>
            <Setter Property="Template"><Setter.Value>
                <ControlTemplate TargetType="ListBoxItem">
                    <Border x:Name="bd" Background="Transparent" Padding="{TemplateBinding Padding}"><ContentPresenter/></Border>
                    <ControlTemplate.Triggers>
                        <Trigger Property="IsMouseOver" Value="True"><Setter TargetName="bd" Property="Background" Value="#18FFFFFF"/></Trigger>
                        <Trigger Property="IsSelected" Value="True"><Setter TargetName="bd" Property="Background" Value="#22FFFFFF"/></Trigger>
                    </ControlTemplate.Triggers>
                </ControlTemplate>
            </Setter.Value></Setter>
        </Style>
        <Style TargetType="ScrollBar"><Setter Property="Background" Value="Transparent"/><Setter Property="Width" Value="10"/></Style>
    </Window.Resources>
    <Grid>
        <Grid.RowDefinitions><RowDefinition Height="Auto"/><RowDefinition Height="*"/><RowDefinition Height="Auto"/></Grid.RowDefinitions>
        <Border Grid.Row="0" Background="{StaticResource SurfaceBrush}" BorderBrush="{StaticResource BorderBrush}" BorderThickness="0,0,0,1" Padding="20,14">
            <Grid><Grid.ColumnDefinitions><ColumnDefinition Width="Auto"/><ColumnDefinition Width="*"/><ColumnDefinition Width="Auto"/></Grid.ColumnDefinitions>
                <StackPanel Orientation="Horizontal" VerticalAlignment="Center">
                    <TextBlock Text="&#x2B1B;" FontSize="18" Margin="0,0,10,0" VerticalAlignment="Center" Foreground="{StaticResource AccentBrush}"/>
                    <StackPanel><TextBlock Text="ExtractorX" FontSize="18" FontWeight="Bold" Foreground="{StaticResource AccentBrush}"/><TextBlock Text="Bulk Archive Extraction" FontSize="10" Foreground="{StaticResource TextDimBrush}"/></StackPanel>
                </StackPanel>
                <StackPanel Grid.Column="2" Orientation="Horizontal" VerticalAlignment="Center">
                    <TextBlock x:Name="StatusText" Text="Ready" Foreground="{StaticResource SuccessBrush}" VerticalAlignment="Center" Margin="0,0,16,0" FontSize="12"/>
                    <TextBlock x:Name="SevenZipStatus" Foreground="{StaticResource TextDimBrush}" VerticalAlignment="Center" FontSize="11"/>
                </StackPanel>
            </Grid>
        </Border>
        <TabControl x:Name="MainTabs" Grid.Row="1">
            <TabItem Header="  Queue  ">
                <Grid Margin="16">
                    <Grid.RowDefinitions><RowDefinition Height="Auto"/><RowDefinition Height="*"/><RowDefinition Height="Auto"/><RowDefinition Height="Auto"/></Grid.RowDefinitions>
                    <WrapPanel Margin="0,0,0,12">
                        <Button x:Name="BtnAddFiles" Content="+ Add Files" Style="{StaticResource AccentButton}" Margin="0,0,8,4"/>
                        <Button x:Name="BtnAddFolder" Content="+ Scan Folder" Style="{StaticResource SubtleButton}" Margin="0,0,8,4"/>
                        <Button x:Name="BtnRemoveSelected" Content="Remove Selected" Style="{StaticResource SubtleButton}" Margin="0,0,8,4"/>
                        <Button x:Name="BtnClearQueue" Content="Clear Queue" Style="{StaticResource SubtleButton}" Margin="0,0,24,4"/>
                        <Button x:Name="BtnExtractAll" Content="Extract All" Style="{StaticResource AccentButton}" Margin="0,0,8,4" FontSize="13" Padding="24,9"/>
                        <Button x:Name="BtnStopAll" Content="Stop" Style="{StaticResource DangerButton}" Margin="0,0,8,4" IsEnabled="False"/>
                    </WrapPanel>
                    <Border Grid.Row="1" CornerRadius="8" BorderBrush="{StaticResource BorderBrush}" BorderThickness="1" ClipToBounds="True">
                        <Grid>
                            <ListView x:Name="QueueList" AllowDrop="True" Background="{StaticResource SurfaceBrush}" SelectionMode="Extended">
                                <ListView.View><GridView>
                                    <GridViewColumn Header="Filename" Width="280" DisplayMemberBinding="{Binding Filename}"/>
                                    <GridViewColumn Header="Path" Width="260" DisplayMemberBinding="{Binding Directory}"/>
                                    <GridViewColumn Header="Size" Width="80" DisplayMemberBinding="{Binding Size}"/>
                                    <GridViewColumn Header="Type" Width="60" DisplayMemberBinding="{Binding Extension}"/>
                                    <GridViewColumn Header="Status" Width="200" DisplayMemberBinding="{Binding Status}"/>
                                    <GridViewColumn Header="Time" Width="70" DisplayMemberBinding="{Binding Elapsed}"/>
                                </GridView></ListView.View>
                            </ListView>
                            <Border x:Name="DropOverlay" Background="#CC101014" Visibility="Collapsed" CornerRadius="8">
                                <StackPanel VerticalAlignment="Center" HorizontalAlignment="Center">
                                    <TextBlock Text="&#x2B07;" FontSize="42" HorizontalAlignment="Center" Margin="0,0,0,8" Foreground="{StaticResource AccentBrush}"/>
                                    <TextBlock Text="Drop archives here" FontSize="18" Foreground="{StaticResource AccentBrush}" HorizontalAlignment="Center" FontWeight="SemiBold"/>
                                </StackPanel>
                            </Border>
                        </Grid>
                    </Border>
                    <Grid Grid.Row="2" Margin="0,12,0,0">
                        <Grid.ColumnDefinitions><ColumnDefinition Width="Auto"/><ColumnDefinition Width="*"/><ColumnDefinition Width="Auto"/></Grid.ColumnDefinitions>
                        <TextBlock Text="Output:" VerticalAlignment="Center" Margin="0,0,10,0" Foreground="{StaticResource TextDimBrush}" FontSize="12"/>
                        <TextBox x:Name="TxtOutputPath" Grid.Column="1"/>
                        <Button x:Name="BtnBrowseOutput" Grid.Column="2" Content="Browse" Style="{StaticResource SubtleButton}" Margin="8,0,0,0"/>
                    </Grid>
                    <CheckBox x:Name="ChkDeleteAfterExtract" Grid.Row="3" Content="Delete archives after successful extraction" Margin="0,8,0,0" Foreground="{StaticResource ErrorBrush}"/>
                </Grid>
            </TabItem>
            <TabItem Header="  Watch Folders  ">
                <Grid Margin="16">
                    <Grid.RowDefinitions><RowDefinition Height="Auto"/><RowDefinition Height="Auto"/><RowDefinition Height="*"/><RowDefinition Height="Auto"/></Grid.RowDefinitions>
                    <TextBlock Text="Monitor directories for new archives" Foreground="{StaticResource TextDimBrush}" FontSize="12" Margin="0,0,0,12"/>
                    <WrapPanel Grid.Row="1" Margin="0,0,0,12">
                        <Button x:Name="BtnAddWatch" Content="+ Add Folder" Style="{StaticResource AccentButton}" Margin="0,0,8,4"/>
                        <Button x:Name="BtnRemoveWatch" Content="Remove" Style="{StaticResource SubtleButton}" Margin="0,0,8,4"/>
                        <Button x:Name="BtnToggleWatch" Content="Start Watching" Style="{StaticResource AccentButton}" Margin="0,0,8,4" Background="#FF2D6A4F" Padding="20,8"/>
                    </WrapPanel>
                    <ListBox x:Name="WatchList" Grid.Row="2"/>
                    <StackPanel Grid.Row="3" Margin="0,12,0,0">
                        <CheckBox x:Name="ChkWatchRecursive" Content="Monitor subdirectories recursively"/>
                        <CheckBox x:Name="ChkWatchAutoExtract" Content="Auto-extract immediately"/>
                        <CheckBox x:Name="ChkDeleteAfterExtractWatch" Content="Delete archives after successful extraction" Margin="0,4,0,0" Foreground="{StaticResource ErrorBrush}"/>
                    </StackPanel>
                </Grid>
            </TabItem>
            <TabItem Header="  Passwords  ">
                <Grid Margin="16">
                    <Grid.RowDefinitions><RowDefinition Height="Auto"/><RowDefinition Height="*"/><RowDefinition Height="Auto"/></Grid.RowDefinitions>
                    <TextBlock Text="Passwords stored encrypted via Windows DPAPI" Foreground="{StaticResource TextDimBrush}" FontSize="12" Margin="0,0,0,12"/>
                    <ListBox x:Name="PasswordListBox" Grid.Row="1"/>
                    <Grid Grid.Row="2" Margin="0,12,0,0">
                        <Grid.ColumnDefinitions><ColumnDefinition Width="*"/><ColumnDefinition Width="Auto"/><ColumnDefinition Width="Auto"/><ColumnDefinition Width="Auto"/></Grid.ColumnDefinitions>
                        <TextBox x:Name="TxtNewPassword" Margin="0,0,8,0"/>
                        <Button x:Name="BtnAddPassword" Grid.Column="1" Content="Add" Style="{StaticResource AccentButton}" Margin="0,0,8,0"/>
                        <Button x:Name="BtnRemovePassword" Grid.Column="2" Content="Remove" Style="{StaticResource SubtleButton}" Margin="0,0,8,0"/>
                        <Button x:Name="BtnImportPasswords" Grid.Column="3" Content="Import File" Style="{StaticResource SubtleButton}"/>
                    </Grid>
                </Grid>
            </TabItem>
            <TabItem Header="  Settings  ">
                <ScrollViewer VerticalScrollBarVisibility="Auto" Padding="16">
                    <StackPanel MaxWidth="700" HorizontalAlignment="Left">
                        <TextBlock Text="E X T R A C T I O N" FontSize="11" FontWeight="Bold" Foreground="{StaticResource AccentBrush}" Margin="0,8,0,12"/>
                        <Grid Margin="0,0,0,10"><Grid.ColumnDefinitions><ColumnDefinition Width="180"/><ColumnDefinition Width="*"/></Grid.ColumnDefinitions>
                            <TextBlock Text="Overwrite Mode:" VerticalAlignment="Center" Foreground="{StaticResource TextDimBrush}"/>
                            <ComboBox x:Name="CmbOverwrite" Grid.Column="1" Width="200" HorizontalAlignment="Left"><ComboBoxItem Content="Always Overwrite" IsSelected="True"/><ComboBoxItem Content="Never Overwrite"/><ComboBoxItem Content="Rename New"/></ComboBox></Grid>
                        <Grid Margin="0,0,0,10"><Grid.ColumnDefinitions><ColumnDefinition Width="180"/><ColumnDefinition Width="*"/></Grid.ColumnDefinitions>
                            <TextBlock Text="Post-Extraction:" VerticalAlignment="Center" Foreground="{StaticResource TextDimBrush}"/>
                            <ComboBox x:Name="CmbPostAction" Grid.Column="1" Width="200" HorizontalAlignment="Left"><ComboBoxItem Content="Do Nothing" IsSelected="True"/><ComboBoxItem Content="Recycle Archive"/><ComboBoxItem Content="Move to Folder"/></ComboBox></Grid>
                        <Grid x:Name="PostActionFolderGrid" Margin="0,0,0,10" Visibility="Collapsed"><Grid.ColumnDefinitions><ColumnDefinition Width="180"/><ColumnDefinition Width="*"/><ColumnDefinition Width="Auto"/></Grid.ColumnDefinitions>
                            <TextBlock Text="Move To Folder:" VerticalAlignment="Center" Foreground="{StaticResource TextDimBrush}"/>
                            <TextBox x:Name="TxtPostActionFolder" Grid.Column="1"/>
                            <Button x:Name="BtnBrowsePostFolder" Grid.Column="2" Content="..." Style="{StaticResource SubtleButton}" Width="36" Margin="4,0,0,0"/></Grid>
                        <Grid Margin="0,0,0,10"><Grid.ColumnDefinitions><ColumnDefinition Width="180"/><ColumnDefinition Width="*"/></Grid.ColumnDefinitions>
                            <TextBlock Text="File Exclusions:" VerticalAlignment="Center" Foreground="{StaticResource TextDimBrush}"/>
                            <TextBox x:Name="TxtExclusions" Grid.Column="1"/></Grid>
                        <CheckBox x:Name="ChkNested" Content="Extract nested archives" Margin="0,4"/>
                        <CheckBox x:Name="ChkRemoveDupe" Content="Remove duplicate folder nesting" Margin="0,4"/>
                        <CheckBox x:Name="ChkMagicBytes" Content="Detect archives by file signature (magic bytes)" Margin="0,4"/>
                        <Grid Margin="0,8,0,10"><Grid.ColumnDefinitions><ColumnDefinition Width="180"/><ColumnDefinition Width="*"/></Grid.ColumnDefinitions>
                            <TextBlock Text="Nested Max Depth:" VerticalAlignment="Center" Foreground="{StaticResource TextDimBrush}"/>
                            <ComboBox x:Name="CmbNestedDepth" Grid.Column="1" Width="100" HorizontalAlignment="Left"><ComboBoxItem Content="3"/><ComboBoxItem Content="5" IsSelected="True"/><ComboBoxItem Content="10"/><ComboBoxItem Content="20"/></ComboBox></Grid>
                        <Border Height="1" Background="{StaticResource BorderBrush}" Margin="0,16"/>
                        <TextBlock Text="S H E L L" FontSize="11" FontWeight="Bold" Foreground="{StaticResource AccentBrush}" Margin="0,12,0,12"/>
                        <WrapPanel Margin="0,0,0,12"><Button x:Name="BtnInstallCtx" Content="Install Context Menu" Style="{StaticResource AccentButton}" Margin="0,0,8,4"/><Button x:Name="BtnRemoveCtx" Content="Remove Context Menu" Style="{StaticResource DangerButton}" Margin="0,0,8,4"/></WrapPanel>
                        <Border Height="1" Background="{StaticResource BorderBrush}" Margin="0,4,0,16"/>
                        <TextBlock Text="I N T E R F A C E" FontSize="11" FontWeight="Bold" Foreground="{StaticResource AccentBrush}" Margin="0,0,0,12"/>
                        <CheckBox x:Name="ChkAlwaysOnTop" Content="Always on top"/>
                        <CheckBox x:Name="ChkShowNotifications" Content="Show notifications" IsChecked="True"/>
                        <Border Height="1" Background="{StaticResource BorderBrush}" Margin="0,16"/>
                        <TextBlock Text="O U T P U T   M A C R O S" FontSize="11" FontWeight="Bold" Foreground="{StaticResource AccentBrush}" Margin="0,12,0,8"/>
                        <Border Background="{StaticResource Surface2Brush}" CornerRadius="8" Padding="14,10">
                            <TextBlock Foreground="{StaticResource TextDimBrush}" FontSize="11.5" FontFamily="Consolas" TextWrapping="Wrap" LineHeight="22">
                                <Run Text="{}{ArchiveFolder}" FontWeight="SemiBold" Foreground="{StaticResource TextBrush}"/> - Parent dir<LineBreak/>
                                <Run Text="{}{ArchiveName}" FontWeight="SemiBold" Foreground="{StaticResource TextBrush}"/> - Name w/o ext<LineBreak/>
                                <Run Text="{}{ArchiveNameUnique}" FontWeight="SemiBold" Foreground="{StaticResource TextBrush}"/> - Name + (n)<LineBreak/>
                                <Run Text="{}{Desktop}" FontWeight="SemiBold" Foreground="{StaticResource TextBrush}"/> - Desktop<LineBreak/>
                                <Run Text="{}{Guid}" FontWeight="SemiBold" Foreground="{StaticResource TextBrush}"/> - Random ID<LineBreak/>
                                <Run Text="{}{Date}" FontWeight="SemiBold" Foreground="{StaticResource TextBrush}"/> - yyyyMMdd<LineBreak/>
                                <Run Text="{}{Env:VAR}" FontWeight="SemiBold" Foreground="{StaticResource TextBrush}"/> - Env variable</TextBlock>
                        </Border>
                        <Button x:Name="BtnSaveSettings" Content="Save Settings" Style="{StaticResource AccentButton}" HorizontalAlignment="Left" Margin="0,12,0,20" Padding="24,10"/>
                    </StackPanel>
                </ScrollViewer>
            </TabItem>
            <TabItem Header="  Log  ">
                <Grid Margin="16">
                    <Grid.RowDefinitions><RowDefinition Height="*"/><RowDefinition Height="Auto"/></Grid.RowDefinitions>
                    <Border CornerRadius="8" BorderBrush="{StaticResource BorderBrush}" BorderThickness="1" ClipToBounds="True">
                        <ScrollViewer x:Name="LogScroll" VerticalScrollBarVisibility="Auto" Background="{StaticResource SurfaceBrush}" Padding="12,8">
                            <TextBlock x:Name="LogBox" TextWrapping="Wrap" FontFamily="Consolas" FontSize="11.5"/></ScrollViewer>
                    </Border>
                    <WrapPanel Grid.Row="1" Margin="0,10,0,0">
                        <Button x:Name="BtnClearLog" Content="Clear Log" Style="{StaticResource SubtleButton}" Margin="0,0,8,0"/>
                        <Button x:Name="BtnExportLog" Content="Export Log" Style="{StaticResource SubtleButton}" Margin="0,0,8,0"/>
                        <Button x:Name="BtnOpenLogDir" Content="Open Log Folder" Style="{StaticResource SubtleButton}"/>
                    </WrapPanel>
                </Grid>
            </TabItem>
        </TabControl>
        <Border Grid.Row="2" Background="{StaticResource SurfaceBrush}" BorderBrush="{StaticResource BorderBrush}" BorderThickness="0,1,0,0" Padding="16,8">
            <Grid><Grid.ColumnDefinitions><ColumnDefinition Width="*"/><ColumnDefinition Width="Auto"/><ColumnDefinition Width="Auto"/></Grid.ColumnDefinitions>
                <StackPanel Orientation="Horizontal" VerticalAlignment="Center">
                    <TextBlock x:Name="QueueCount" Text="Queue: 0 items" Foreground="{StaticResource TextDimBrush}" FontSize="11.5" Margin="0,0,20,0"/>
                    <TextBlock x:Name="ProgressText" Foreground="{StaticResource TextBrush}" FontSize="11.5"/></StackPanel>
                <TextBlock Grid.Column="1" x:Name="WatchStatus" Foreground="{StaticResource WarningBrush}" FontSize="11" VerticalAlignment="Center" Margin="0,0,16,0"/>
                <TextBlock Grid.Column="2" Text="v1.0.0" Foreground="{StaticResource TextDimBrush}" FontSize="10" VerticalAlignment="Center"/>
            </Grid>
        </Border>
    </Grid>
</Window>
"@

# =====================================================================
# Build Window & Map Controls
# =====================================================================
$reader = New-Object System.Xml.XmlNodeReader $xaml
$window = [Windows.Markup.XamlReader]::Load($reader)

$ui = @{}
@(
    'QueueList','DropOverlay','TxtOutputPath','BtnBrowseOutput',
    'BtnAddFiles','BtnAddFolder','BtnRemoveSelected','BtnClearQueue','BtnExtractAll','BtnStopAll',
    'ChkDeleteAfterExtract',
    'BtnAddWatch','BtnRemoveWatch','BtnToggleWatch','WatchList','ChkWatchRecursive','ChkWatchAutoExtract','ChkDeleteAfterExtractWatch',
    'PasswordListBox','TxtNewPassword','BtnAddPassword','BtnRemovePassword','BtnImportPasswords',
    'CmbOverwrite','CmbPostAction','PostActionFolderGrid','TxtPostActionFolder','BtnBrowsePostFolder',
    'TxtExclusions','ChkNested','ChkRemoveDupe','ChkMagicBytes','CmbNestedDepth',
    'BtnInstallCtx','BtnRemoveCtx','ChkAlwaysOnTop','ChkShowNotifications',
    'BtnSaveSettings','StatusText','SevenZipStatus','QueueCount','ProgressText','WatchStatus',
    'LogBox','LogScroll','BtnClearLog','BtnExportLog','BtnOpenLogDir','MainTabs'
) | ForEach-Object { $el = $window.FindName($_); if ($el) { $ui[$_] = $el } }

# Shared thread-safe state
$script:State = [hashtable]::Synchronized(@{
    IsExtracting   = $false
    StopRequested  = $false
    WatchersActive = $false
    Watchers       = [System.Collections.ArrayList]::new()
    SevenZipPath   = $script:7zPath
    Downloading7z  = $false
})

# =====================================================================
# UI-thread log helper (only called from dispatcher timer on UI thread)
# =====================================================================
function Write-UILog {
    param([string]$Message, [string]$Color = '#FFB0B0B0')
    $ts = Get-Date -Format "HH:mm:ss"
    $run = New-Object System.Windows.Documents.Run("[$ts] $Message`n")
    $run.Foreground = [System.Windows.Media.BrushConverter]::new().ConvertFromString($Color)
    $ui['LogBox'].Inlines.Add($run)
    # Cap log to 2000 inlines to prevent memory growth
    while ($ui['LogBox'].Inlines.Count -gt 2000) { $ui['LogBox'].Inlines.Remove($ui['LogBox'].Inlines.FirstInline) }
    $ui['LogScroll'].ScrollToEnd()
    $logFile = Join-Path $script:LogDir "ExtractorX_$(Get-Date -Format 'yyyyMMdd').log"
    try { "[$ts] $Message" | Add-Content -Path $logFile -Force -ErrorAction SilentlyContinue } catch {}
}

# =====================================================================
# Load Settings into UI
# =====================================================================
# Apply saved window dimensions
if ($script:Config.WindowWidth -gt 0) { $window.Width = $script:Config.WindowWidth }
if ($script:Config.WindowHeight -gt 0) { $window.Height = $script:Config.WindowHeight }

$ui['TxtOutputPath'].Text = $script:Config.OutputPath
$ui['TxtExclusions'].Text = $script:Config.FileExclusions
$ui['ChkDeleteAfterExtract'].IsChecked = [bool]$script:Config.DeleteAfterExtract
$ui['ChkDeleteAfterExtractWatch'].IsChecked = [bool]$script:Config.DeleteAfterExtract

switch ($script:Config.OverwriteMode) {
    'Always' { $ui['CmbOverwrite'].SelectedIndex = 0 }
    'Never'  { $ui['CmbOverwrite'].SelectedIndex = 1 }
    'Rename' { $ui['CmbOverwrite'].SelectedIndex = 2 }
    default  { $ui['CmbOverwrite'].SelectedIndex = 0 }
}
# PostAction: 0=None, 1=Recycle, 2=MoveToFolder
switch ($script:Config.PostAction) {
    'None'         { $ui['CmbPostAction'].SelectedIndex = 0 }
    'Recycle'      { $ui['CmbPostAction'].SelectedIndex = 1 }
    'MoveToFolder' { $ui['CmbPostAction'].SelectedIndex = 2; $ui['PostActionFolderGrid'].Visibility = 'Visible' }
    default        { $ui['CmbPostAction'].SelectedIndex = 0 }
}
$ui['TxtPostActionFolder'].Text = $script:Config.PostActionFolder
switch ($script:Config.NestedMaxDepth) {
    3  { $ui['CmbNestedDepth'].SelectedIndex = 0 }
    10 { $ui['CmbNestedDepth'].SelectedIndex = 2 }
    20 { $ui['CmbNestedDepth'].SelectedIndex = 3 }
    default { $ui['CmbNestedDepth'].SelectedIndex = 1 }
}
$ui['ChkNested'].IsChecked       = [bool]$script:Config.NestedExtraction
$ui['ChkRemoveDupe'].IsChecked   = [bool]$script:Config.RemoveDuplicateFolder
$ui['ChkMagicBytes'].IsChecked   = [bool]$script:Config.ScanMagicBytes
$ui['ChkAlwaysOnTop'].IsChecked  = [bool]$script:Config.AlwaysOnTop
$ui['ChkShowNotifications'].IsChecked = [bool]$script:Config.ShowNotifications
$ui['ChkWatchRecursive'].IsChecked    = [bool]$script:Config.WatchRecursive
$ui['ChkWatchAutoExtract'].IsChecked  = [bool]$script:Config.WatchAutoExtract
foreach ($wf in $script:Config.WatchFolders) { $ui['WatchList'].Items.Add($wf) }

# Passwords (masked display)
foreach ($pw in $script:Passwords) {
    $m = if ($pw.Length -le 4) { '*' * $pw.Length } else { $pw.Substring(0,2) + ('*' * ($pw.Length - 4)) + $pw.Substring($pw.Length - 2) }
    $ui['PasswordListBox'].Items.Add($m)
}

# 7-Zip status
if ($script:7zPath) {
    $ui['SevenZipStatus'].Text = "7-Zip: $($script:7zPath)"
    $ui['SevenZipStatus'].Foreground = [System.Windows.Media.BrushConverter]::new().ConvertFromString('#FF6BCB77')
} else {
    $ui['SevenZipStatus'].Text = "7-Zip: Not found (will download)"
    $ui['SevenZipStatus'].Foreground = [System.Windows.Media.BrushConverter]::new().ConvertFromString('#FFFFD93D')
}

# =====================================================================
# UI TIMER - Polls ConcurrentQueue. Background threads NEVER touch UI.
# =====================================================================
$script:UITimer = New-Object System.Windows.Threading.DispatcherTimer
$script:UITimer.Interval = [TimeSpan]::FromMilliseconds(100)
$script:UITimer.Add_Tick({
    $msg = $null
    $processed = 0
    while ($script:UIQueue.TryDequeue([ref]$msg) -and $processed -lt 50) {
        $processed++
        switch ($msg.Type) {
            'Log'      { Write-UILog -Message $msg.Message -Color $msg.Color }
            'Status'   { $ui['StatusText'].Text = $msg.Text; $ui['StatusText'].Foreground = [System.Windows.Media.BrushConverter]::new().ConvertFromString($msg.Color) }
            'Progress' { $ui['ProgressText'].Text = $msg.Text }
            'QueueUpdate' {
                $idx = $msg.Index
                if ($idx -ge 0 -and $idx -lt $ui['QueueList'].Items.Count) {
                    $old = $ui['QueueList'].Items[$idx]
                    $ui['QueueList'].Items[$idx] = [PSCustomObject]@{
                        Filename = $old.Filename; Directory = $old.Directory; Size = $old.Size
                        Extension = $old.Extension; Status = $msg.Status
                        Elapsed = if ($msg.Elapsed) { $msg.Elapsed } else { $old.Elapsed }
                        FullPath = $old.FullPath
                    }
                }
            }
            'QueueCountRefresh' {
                $t = $ui['QueueList'].Items.Count; $q = 0; $d = 0; $f = 0
                foreach ($i in $ui['QueueList'].Items) {
                    if ($i.Status -eq 'Queued') { $q++ }
                    elseif ($i.Status -like '*Success*') { $d++ }
                    elseif ($i.Status -like '*Failed*' -or $i.Status -like '*Error*') { $f++ }
                }
                $ui['QueueCount'].Text = "Queue: $t | Pending: $q | Done: $d | Failed: $f"
            }
            'ExtractionDone' {
                $script:State.IsExtracting = $false
                $ui['BtnExtractAll'].IsEnabled = $true
                $ui['BtnStopAll'].IsEnabled = $false
                $ui['BtnRemoveSelected'].IsEnabled = $true
                $ui['BtnClearQueue'].IsEnabled = $true
                Send-UIMessage -Type 'QueueCountRefresh'
                # If watchers are active and auto-extract is on, check for new queued items
                if ($script:State.WatchersActive -and [bool]$ui['ChkWatchAutoExtract'].IsChecked) {
                    $hasQueued = $false
                    foreach ($item in $ui['QueueList'].Items) { if ($item.Status -eq 'Queued') { $hasQueued = $true; break } }
                    if ($hasQueued) { Start-QueueExtraction -Silent }
                }
            }
            'SevenZipFound' {
                $script:State.Downloading7z = $false
                $ui['SevenZipStatus'].Text = "7-Zip: $($msg.Path)"
                $ui['SevenZipStatus'].Foreground = [System.Windows.Media.BrushConverter]::new().ConvertFromString('#FF6BCB77')
                $ui['BtnExtractAll'].IsEnabled = $true
                # Auto-extract pending items if watchers active
                if ($script:State.WatchersActive -and [bool]$ui['ChkWatchAutoExtract'].IsChecked) {
                    Start-QueueExtraction -Silent
                }
            }
            'SevenZipFailed' {
                $script:State.Downloading7z = $false
                $ui['SevenZipStatus'].Text = "7-Zip: Download failed"
                $ui['SevenZipStatus'].Foreground = [System.Windows.Media.BrushConverter]::new().ConvertFromString('#FFFF6B6B')
                $ui['BtnExtractAll'].IsEnabled = $true
            }
            'WatchFileDetected' {
                $fp = $msg.FilePath
                if (Test-Path $fp) {
                    $fi = Get-Item $fp -Force -ErrorAction SilentlyContinue
                    if ($fi -and -not $fi.PSIsContainer) {
                        $dup = $false
                        foreach ($ex in $ui['QueueList'].Items) { if ($ex.FullPath -eq $fp) { $dup = $true; break } }
                        if (-not $dup) {
                            $ui['QueueList'].Items.Add([PSCustomObject]@{
                                Filename = $fi.Name; Directory = $fi.DirectoryName
                                Size = (Get-ArchiveFileSize $fp); Extension = $fi.Extension.TrimStart('.').ToUpper()
                                Status = 'Queued'; Elapsed = ''; FullPath = $fp
                            })
                            Send-UIMessage -Type 'QueueCountRefresh'
                            # Auto-extract if enabled
                            if ([bool]$ui['ChkWatchAutoExtract'].IsChecked) {
                                Start-QueueExtraction -Silent
                            }
                        }
                    }
                }
            }
        }
    }
})
$script:UITimer.Start()

# =====================================================================
# Magic Bytes Detection
# =====================================================================
function Test-MagicBytes {
    param([string]$FilePath)
    try {
        $stream = [System.IO.File]::OpenRead($FilePath)
        try {
            $buf = New-Object byte[] 16
            $read = $stream.Read($buf, 0, 16)
            if ($read -lt 2) { return $false }
            $hex = ($buf[0..($read - 1)] | ForEach-Object { $_.ToString('X2') }) -join ''
            foreach ($sig in $script:MagicBytes.Keys) {
                if ($hex.StartsWith($sig)) { return $true }
            }
        } finally { $stream.Dispose() }
    } catch {}
    return $false
}

# =====================================================================
# Queue Management
# =====================================================================
function Add-ToQueue {
    param([string[]]$Files)
    $scanMagic = [bool]$ui['ChkMagicBytes'].IsChecked
    foreach ($file in $Files) {
        if (-not (Test-Path $file)) { continue }
        $item = Get-Item $file -Force -ErrorAction SilentlyContinue
        if (-not $item) { continue }
        if ($item.PSIsContainer) {
            $archives = Get-ChildItem -Path $file -Recurse -File -ErrorAction SilentlyContinue | Where-Object {
                (Test-IsArchive $_.FullName) -or ($scanMagic -and (Test-MagicBytes $_.FullName))
            }
            foreach ($a in $archives) { Add-ToQueue -Files @($a.FullName) }
            continue
        }
        $isArchive = (Test-IsArchive $file) -or ($scanMagic -and (Test-MagicBytes $file))
        if (-not $isArchive) { continue }
        # Deduplicate
        $dup = $false
        foreach ($ex in $ui['QueueList'].Items) { if ($ex.FullPath -eq $file) { $dup = $true; break } }
        if ($dup) { continue }
        $ui['QueueList'].Items.Add([PSCustomObject]@{
            Filename = $item.Name; Directory = $item.DirectoryName
            Size = (Get-ArchiveFileSize $file); Extension = $item.Extension.TrimStart('.').ToUpper()
            Status = 'Queued'; Elapsed = ''; FullPath = $file
        })
    }
    Send-UIMessage -Type 'QueueCountRefresh'
}

# =====================================================================
# Event Handlers
# =====================================================================

# Drag & Drop
$window.Add_DragEnter({ if ($_.Data.GetDataPresent([Windows.DataFormats]::FileDrop)) { $_.Effects = [Windows.DragDropEffects]::Copy; $ui['DropOverlay'].Visibility = 'Visible' } })
$window.Add_DragLeave({ $ui['DropOverlay'].Visibility = 'Collapsed' })
$window.Add_Drop({ $ui['DropOverlay'].Visibility = 'Collapsed'; if ($_.Data.GetDataPresent([Windows.DataFormats]::FileDrop)) { Add-ToQueue -Files $_.Data.GetData([Windows.DataFormats]::FileDrop) } })

# Add Files / Folder
$ui['BtnAddFiles'].Add_Click({
    $dlg = New-Object Microsoft.Win32.OpenFileDialog
    $dlg.Title = "Select Archives"
    $dlg.Filter = "Archives|*.zip;*.7z;*.rar;*.tar;*.gz;*.tgz;*.bz2;*.xz;*.iso;*.cab;*.wim|All|*.*"
    $dlg.Multiselect = $true
    if ($dlg.ShowDialog()) { Add-ToQueue -Files $dlg.FileNames }
})
$ui['BtnAddFolder'].Add_Click({
    $dlg = New-Object System.Windows.Forms.FolderBrowserDialog
    $dlg.Description = "Scan for archives"
    if ($dlg.ShowDialog() -eq 'OK') { Add-ToQueue -Files @($dlg.SelectedPath) }
})

# Remove / Clear
$ui['BtnRemoveSelected'].Add_Click({
    $sel = @($ui['QueueList'].SelectedItems)
    foreach ($s in $sel) { $ui['QueueList'].Items.Remove($s) }
    Send-UIMessage -Type 'QueueCountRefresh'
})
$ui['BtnClearQueue'].Add_Click({
    $ui['QueueList'].Items.Clear()
    Send-UIMessage -Type 'QueueCountRefresh'
})

# Browse Output
$ui['BtnBrowseOutput'].Add_Click({
    $dlg = New-Object System.Windows.Forms.FolderBrowserDialog
    if ($dlg.ShowDialog() -eq 'OK') { $ui['TxtOutputPath'].Text = $dlg.SelectedPath }
})

# PostAction combo (0=None, 1=Recycle, 2=MoveToFolder)
$ui['CmbPostAction'].Add_SelectionChanged({
    $ui['PostActionFolderGrid'].Visibility = if ($ui['CmbPostAction'].SelectedIndex -eq 2) { 'Visible' } else { 'Collapsed' }
})
$ui['BtnBrowsePostFolder'].Add_Click({
    $dlg = New-Object System.Windows.Forms.FolderBrowserDialog
    if ($dlg.ShowDialog() -eq 'OK') { $ui['TxtPostActionFolder'].Text = $dlg.SelectedPath }
})

# Always on top
$ui['ChkAlwaysOnTop'].Add_Checked({ $window.Topmost = $true })
$ui['ChkAlwaysOnTop'].Add_Unchecked({ $window.Topmost = $false })

# Delete After Extract - two-way sync between Queue tab and Watch tab checkboxes
$ui['ChkDeleteAfterExtract'].Add_Checked({ $ui['ChkDeleteAfterExtractWatch'].IsChecked = $true })
$ui['ChkDeleteAfterExtract'].Add_Unchecked({ $ui['ChkDeleteAfterExtractWatch'].IsChecked = $false })
$ui['ChkDeleteAfterExtractWatch'].Add_Checked({ $ui['ChkDeleteAfterExtract'].IsChecked = $true })
$ui['ChkDeleteAfterExtractWatch'].Add_Unchecked({ $ui['ChkDeleteAfterExtract'].IsChecked = $false })

# =====================================================================
# EXTRACTION LAUNCHER - Reusable from button click, watch auto-extract
# =====================================================================
function Start-QueueExtraction {
    param([switch]$Silent)

    # Guard: prevent double-launch
    if ($script:State.IsExtracting) { return }
    if ($script:State.Downloading7z) {
        if (-not $Silent) { [System.Windows.MessageBox]::Show("7-Zip is still downloading. Please wait.", "ExtractorX", 'OK', 'Information') }
        return
    }

    # Collect queued items
    $queuedItems = @()
    for ($i = 0; $i -lt $ui['QueueList'].Items.Count; $i++) {
        if ($ui['QueueList'].Items[$i].Status -eq 'Queued') {
            $queuedItems += @{ Index = $i; FullPath = $ui['QueueList'].Items[$i].FullPath; Filename = $ui['QueueList'].Items[$i].Filename }
        }
    }
    if ($queuedItems.Count -eq 0) {
        if (-not $Silent) { [System.Windows.MessageBox]::Show("No items in queue.", "ExtractorX", 'OK', 'Information') }
        return
    }

    # Validate output path template
    $outTemplate = $ui['TxtOutputPath'].Text.Trim()
    if (-not $outTemplate) {
        if (-not $Silent) { [System.Windows.MessageBox]::Show("Output path cannot be empty. Set an output path first.", "ExtractorX", 'OK', 'Warning') }
        return
    }

    # If 7-Zip not found, download in background
    if (-not $script:State.SevenZipPath) {
        $script:State.Downloading7z = $true
        $ui['BtnExtractAll'].IsEnabled = $false
        Send-UIMessage -Type 'Status' -Data @{ Text = "Downloading 7-Zip..."; Color = '#FFFFD93D' }
        Send-UIMessage -Type 'Log' -Data @{ Message = "Downloading 7-Zip..."; Color = '#FFFFD93D' }

        $dlRS = [runspacefactory]::CreateRunspace(); $dlRS.Open()
        $dlRS.SessionStateProxy.SetVariable('state', $script:State)
        $dlRS.SessionStateProxy.SetVariable('uiQueue', $script:UIQueue)
        $dlRS.SessionStateProxy.SetVariable('appDir', $script:AppDataDir)
        $dlPS = [powershell]::Create().AddScript({
            function Send-Msg($Type, $Data) { $uiQueue.Enqueue((@{ Type = $Type } + $Data)) }
            try {
                [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
                $t = Join-Path $appDir "7zr.exe"
                Invoke-WebRequest -Uri "https://www.7-zip.org/a/7zr.exe" -OutFile $t -UseBasicParsing
                $t7 = Join-Path $appDir "7z.exe"; Copy-Item $t $t7 -Force
                try {
                    $ex = Join-Path $appDir "7z-extra.7z"
                    Invoke-WebRequest -Uri "https://www.7-zip.org/a/7z2408-extra.7z" -OutFile $ex -UseBasicParsing
                    & $t x $ex -o"$appDir" -y 2>$null
                    Remove-Item $ex -Force -ErrorAction SilentlyContinue
                } catch {}
                if (Test-Path $t7) {
                    $state.SevenZipPath = $t7
                    Send-Msg 'SevenZipFound' @{ Path = $t7 }
                    Send-Msg 'Log' @{ Message = "7-Zip ready: $t7"; Color = '#FF6BCB77' }
                } else {
                    $state.SevenZipPath = $t
                    Send-Msg 'SevenZipFound' @{ Path = $t }
                }
                Send-Msg 'Status' @{ Text = "Ready - click Extract All"; Color = '#FF6BCB77' }
            } catch {
                Send-Msg 'SevenZipFailed' @{}
                Send-Msg 'Status' @{ Text = "7-Zip download failed"; Color = '#FFFF6B6B' }
                Send-Msg 'Log' @{ Message = "7-Zip download error: $_"; Color = '#FFFF6B6B' }
            }
        })
        $dlPS.Runspace = $dlRS
        $dlPS.BeginInvoke() | Out-Null
        $script:dl7zPS = $dlPS; $script:dl7zRS = $dlRS
        return
    }

    # Lock UI - disable queue manipulation to prevent index corruption
    $script:State.IsExtracting = $true
    $script:State.StopRequested = $false
    $ui['BtnExtractAll'].IsEnabled = $false
    $ui['BtnStopAll'].IsEnabled = $true
    $ui['BtnRemoveSelected'].IsEnabled = $false
    $ui['BtnClearQueue'].IsEnabled = $false
    Send-UIMessage -Type 'Status' -Data @{ Text = "Extracting..."; Color = '#FFFFD93D' }

    if ($Silent) {
        Send-UIMessage -Type 'Log' -Data @{ Message = "Auto-extracting $($queuedItems.Count) file(s)"; Color = '#FF00B4D8' }
    }

    # Snapshot settings from UI thread
    $settings = @{
        OutputTemplate     = $ui['TxtOutputPath'].Text
        Overwrite          = @('Always','Never','Rename')[$ui['CmbOverwrite'].SelectedIndex]
        PostAction         = @('None','Recycle','MoveToFolder')[$ui['CmbPostAction'].SelectedIndex]
        PostFolder         = $ui['TxtPostActionFolder'].Text
        DeleteAfterExtract = [bool]$ui['ChkDeleteAfterExtract'].IsChecked
        Exclusions         = @(($ui['TxtExclusions'].Text -split ';') | ForEach-Object { $_.Trim() } | Where-Object { $_ })
        NestedEnabled      = [bool]$ui['ChkNested'].IsChecked
        NestedDepth        = @(3,5,10,20)[$ui['CmbNestedDepth'].SelectedIndex]
        RemoveDupe         = [bool]$ui['ChkRemoveDupe'].IsChecked
        Passwords          = @($script:Passwords)
        SevenZip           = $script:State.SevenZipPath
        ArchiveExts        = @($script:ArchiveExtensions)
    }

    $rs = [runspacefactory]::CreateRunspace(); $rs.Open()
    $rs.SessionStateProxy.SetVariable('state', $script:State)
    $rs.SessionStateProxy.SetVariable('uiQueue', $script:UIQueue)
    $rs.SessionStateProxy.SetVariable('queuedItems', $queuedItems)
    $rs.SessionStateProxy.SetVariable('settings', $settings)

    $ps = [powershell]::Create().AddScript({
        function Send-Msg($Type, $Data) { $uiQueue.Enqueue((@{ Type = $Type } + $Data)) }
        # Load once for Recycle Bin support
        try { Add-Type -AssemblyName Microsoft.VisualBasic } catch {}

        # Run 7z with ASYNC stdout/stderr capture (prevents buffer deadlock)
        function Run-7z {
            param([string]$Archive, [string]$OutDir, [string]$Pw = '')
            $a = @('x', "`"$Archive`"", "-o`"$OutDir`"", '-y')
            switch ($settings.Overwrite) { 'Always' { $a += '-aoa' } 'Never' { $a += '-aos' } 'Rename' { $a += '-aou' } }
            if ($Pw) { $a += "-p`"$Pw`"" }
            foreach ($e in $settings.Exclusions) { if ($e) { $a += "-xr!$e" } }

            $psi = New-Object System.Diagnostics.ProcessStartInfo
            $psi.FileName = $settings.SevenZip
            $psi.Arguments = ($a -join ' ')
            $psi.UseShellExecute = $false
            $psi.RedirectStandardOutput = $true
            $psi.RedirectStandardError = $true
            $psi.CreateNoWindow = $true

            $proc = New-Object System.Diagnostics.Process
            $proc.StartInfo = $psi
            $errSB = [System.Text.StringBuilder]::new()
            $outSB = [System.Text.StringBuilder]::new()
            $errEvt = Register-ObjectEvent $proc ErrorDataReceived -Action {
                if ($null -ne $EventArgs.Data) { $Event.MessageData.AppendLine($EventArgs.Data) }
            } -MessageData $errSB
            $outEvt = Register-ObjectEvent $proc OutputDataReceived -Action {
                if ($null -ne $EventArgs.Data) { $Event.MessageData.AppendLine($EventArgs.Data) }
            } -MessageData $outSB

            try { $proc.Start() | Out-Null } catch {
                Unregister-Event $errEvt.Name -ErrorAction SilentlyContinue
                Unregister-Event $outEvt.Name -ErrorAction SilentlyContinue
                return @{ Success = $false; ExitCode = -1; NeedsPassword = $false; Error = "Failed to start 7z: $_" }
            }
            $proc.BeginOutputReadLine()
            $proc.BeginErrorReadLine()

            # Non-blocking wait with stop check every 500ms
            $killed = $false
            while (-not $proc.WaitForExit(500)) {
                if ($state.StopRequested) {
                    try { $proc.Kill(); $killed = $true } catch {}
                    break
                }
            }
            # Parameterless WaitForExit() flushes async stdout/stderr handlers (.NET requirement)
            try { $proc.WaitForExit() } catch {}
            Unregister-Event $errEvt.Name -ErrorAction SilentlyContinue
            Unregister-Event $outEvt.Name -ErrorAction SilentlyContinue

            $ec = if ($killed) { -1 } else { try { $proc.ExitCode } catch { -1 } }
            $stderr = $errSB.ToString()
            $proc.Dispose()

            return @{
                Success       = ($ec -eq 0 -or $ec -eq 1)
                ExitCode      = $ec
                NeedsPassword = ($ec -eq 2 -and ($stderr -match 'password|Wrong password|encrypted|Can not open encrypted'))
                Error         = if ($stderr) { $stderr } else { '' }
            }
        }

        function Resolve-Out($Template, $ArchivePath) {
            $d = [IO.Path]::GetDirectoryName($ArchivePath)
            $n = [IO.Path]::GetFileNameWithoutExtension($ArchivePath)
            if ($n -match '\.tar$') { $n = [IO.Path]::GetFileNameWithoutExtension($n) }
            $e = [IO.Path]::GetExtension($ArchivePath).TrimStart('.')
            $r = $Template
            $r = $r -replace '\{ArchiveFolder\}', $d
            $r = $r -replace '\{ArchiveName\}', $n
            $r = $r -replace '\{ArchiveExtension\}', $e
            $r = $r -replace '\{Guid\}', ([Guid]::NewGuid().ToString('N').Substring(0,8))
            $r = $r -replace '\{Desktop\}', [Environment]::GetFolderPath('Desktop')
            $r = $r -replace '\{Date\}', (Get-Date -Format 'yyyyMMdd')
            $r = $r -replace '\{Time\}', (Get-Date -Format 'HHmmss')
            if ($r -match '\{Env:([^}]+)\}') {
                $r = [regex]::Replace($r, '\{Env:([^}]+)\}', { param($m) [Environment]::GetEnvironmentVariable($m.Groups[1].Value) })
            }
            if ($r -match '\{ArchiveNameUnique\}') {
                $b = $r -replace '\{ArchiveNameUnique\}', $n
                if (Test-Path $b) {
                    $c = 1; do { $t = $r -replace '\{ArchiveNameUnique\}', "$n ($c)"; $c++ } while (Test-Path $t)
                    $r = $t
                } else { $r = $b }
            }
            return $r
        }

        # --- Main extraction loop ---
        $completed = 0; $failed = 0; $total = $queuedItems.Count
        foreach ($qi in $queuedItems) {
            if ($state.StopRequested) { break }
            $idx = $qi.Index; $archPath = $qi.FullPath; $archName = $qi.Filename
            $sw = [System.Diagnostics.Stopwatch]::StartNew()

            Send-Msg 'QueueUpdate' @{ Index = $idx; Status = 'Extracting...' }
            Send-Msg 'Progress' @{ Text = "$($completed + $failed + 1)/$total : $archName" }
            Send-Msg 'Log' @{ Message = "Extracting: $archName"; Color = '#FF00B4D8' }

            $outDir = Resolve-Out $settings.OutputTemplate $archPath
            if (-not (Test-Path $outDir)) {
                try { New-Item -Path $outDir -ItemType Directory -Force | Out-Null }
                catch {
                    $failed++
                    Send-Msg 'QueueUpdate' @{ Index = $idx; Status = 'Error: cannot create output dir' }
                    Send-Msg 'Log' @{ Message = "  FAIL: Cannot create $outDir"; Color = '#FFFF6B6B' }
                    continue
                }
            }

            $result = Run-7z -Archive $archPath -OutDir $outDir
            $pwUsed = ''

            # Password cycling
            if ($result.NeedsPassword -and $settings.Passwords.Count -gt 0) {
                Send-Msg 'Log' @{ Message = "  Encrypted - trying $($settings.Passwords.Count) passwords"; Color = '#FFFFD93D' }
                Send-Msg 'QueueUpdate' @{ Index = $idx; Status = 'Trying passwords...' }
                foreach ($pw in $settings.Passwords) {
                    if ($state.StopRequested) { break }
                    $result = Run-7z -Archive $archPath -OutDir $outDir -Pw $pw
                    if ($result.Success) { $pwUsed = $pw; break }
                }
            }

            $sw.Stop()
            $elapsed = "{0:mm\:ss}" -f $sw.Elapsed

            if ($result.Success) {
                $completed++
                $st = if ($pwUsed) { "Success (pw)" } else { "Success" }
                Send-Msg 'QueueUpdate' @{ Index = $idx; Status = $st; Elapsed = $elapsed }
                Send-Msg 'Log' @{ Message = "  Done: $archName ($elapsed)"; Color = '#FF6BCB77' }

                # Flatten duplicate folder nesting (archive/archive/ -> archive/)
                if ($settings.RemoveDupe) {
                    $aName = [IO.Path]::GetFileNameWithoutExtension($archPath)
                    if ($aName -match '\.tar$') { $aName = [IO.Path]::GetFileNameWithoutExtension($aName) }
                    $inner = Join-Path $outDir $aName
                    if (Test-Path $inner) {
                        $items = @(Get-ChildItem $outDir -Force)
                        if ($items.Count -eq 1 -and $items[0].PSIsContainer -and $items[0].Name -eq $aName) {
                            try {
                                $tmp = "${outDir}_flat$(Get-Random)"
                                Rename-Item $outDir $tmp -Force
                                Move-Item (Join-Path $tmp $aName) $outDir -Force
                                Remove-Item $tmp -Recurse -Force -ErrorAction SilentlyContinue
                            } catch {}
                        }
                    }
                }

                # Nested extraction
                if ($settings.NestedEnabled) {
                    $seen = New-Object 'System.Collections.Generic.HashSet[string]'
                    $nq = @(Get-ChildItem -Path $outDir -Recurse -File -ErrorAction SilentlyContinue |
                        Where-Object { $_.Extension.ToLower() -in $settings.ArchiveExts } | ForEach-Object {
                            try {
                                $h = (Get-FileHash $_.FullName -Algorithm MD5 -ErrorAction Stop).Hash
                                if ($seen.Add($h)) { $_.FullName }
                            } catch { $_.FullName }
                        })
                    $depth = 1
                    while ($nq.Count -gt 0 -and $depth -le $settings.NestedDepth -and -not $state.StopRequested) {
                        Send-Msg 'Log' @{ Message = "  Nested depth $depth : $($nq.Count) archive(s)"; Color = '#FFFFD93D' }
                        $next = @()
                        foreach ($na in $nq) {
                            if ($state.StopRequested) { break }
                            $nn = [IO.Path]::GetFileNameWithoutExtension($na)
                            $no = Join-Path ([IO.Path]::GetDirectoryName($na)) $nn
                            if (-not (Test-Path $no)) { New-Item $no -ItemType Directory -Force | Out-Null }
                            $nr = Run-7z -Archive $na -OutDir $no
                            if ($nr.NeedsPassword -and $settings.Passwords.Count -gt 0) {
                                foreach ($pw in $settings.Passwords) {
                                    $nr = Run-7z -Archive $na -OutDir $no -Pw $pw
                                    if ($nr.Success) { break }
                                }
                            }
                            if ($nr.Success) {
                                Remove-Item $na -Force -ErrorAction SilentlyContinue
                                Get-ChildItem -Path $no -Recurse -File -ErrorAction SilentlyContinue |
                                    Where-Object { $_.Extension.ToLower() -in $settings.ArchiveExts } | ForEach-Object {
                                        try {
                                            $h = (Get-FileHash $_.FullName -Algorithm MD5 -ErrorAction Stop).Hash
                                            if ($seen.Add($h)) { $next += $_.FullName }
                                        } catch { $next += $_.FullName }
                                    }
                            }
                        }
                        $nq = $next; $depth++
                    }
                }

                # Delete archive after successful extraction (explicit checkbox)
                if ($settings.DeleteAfterExtract) {
                    try {
                        Remove-Item $archPath -Force -ErrorAction Stop
                        Send-Msg 'Log' @{ Message = "  Deleted: $archName"; Color = '#FFB0B0B0' }
                    } catch {
                        Send-Msg 'Log' @{ Message = "  Delete failed: $archName - $_"; Color = '#FFFF6B6B' }
                    }
                }
                # Post-extraction action (only runs if archive still exists)
                elseif (Test-Path $archPath) {
                    switch ($settings.PostAction) {
                        'Recycle' {
                            try {
                                [Microsoft.VisualBasic.FileIO.FileSystem]::DeleteFile($archPath, 'OnlyErrorDialogs', 'SendToRecycleBin')
                                Send-Msg 'Log' @{ Message = "  Recycled: $archName"; Color = '#FFB0B0B0' }
                            } catch {}
                        }
                        'MoveToFolder' {
                            if ($settings.PostFolder -and (Test-Path $settings.PostFolder)) {
                                try {
                                    Move-Item $archPath $settings.PostFolder -Force
                                    Send-Msg 'Log' @{ Message = "  Moved: $archName -> $($settings.PostFolder)"; Color = '#FFB0B0B0' }
                                } catch {}
                            }
                        }
                    }
                }
            } else {
                $failed++
                $em = if ($result.NeedsPassword) { "Failed - Password required" } else { "Failed" }
                Send-Msg 'QueueUpdate' @{ Index = $idx; Status = $em; Elapsed = $elapsed }
                $errText = $result.Error
                if ($errText -and $errText.Length -gt 100) { $errText = $errText.Substring(0,100) }
                Send-Msg 'Log' @{ Message = "  FAIL: $archName - $errText"; Color = '#FFFF6B6B' }
            }
        }

        $state.IsExtracting = $false
        $fm = if ($state.StopRequested) { "Stopped ($completed done, $failed failed)" }
              else { "Complete: $completed extracted, $failed failed" }
        $fc = if ($failed -gt 0) { '#FFFFD93D' } elseif ($state.StopRequested) { '#FFFF6B6B' } else { '#FF6BCB77' }
        Send-Msg 'Status' @{ Text = $fm; Color = $fc }
        Send-Msg 'Progress' @{ Text = '' }
        Send-Msg 'Log' @{ Message = $fm; Color = $fc }
        Send-Msg 'ExtractionDone' @{}
    })
    $ps.Runspace = $rs
    $script:extractHandle = $ps.BeginInvoke()
    $script:extractPS = $ps; $script:extractRS = $rs
}

# Button click wrapper - calls the shared function with message boxes enabled
$ui['BtnExtractAll'].Add_Click({ Start-QueueExtraction })

# Stop button
$ui['BtnStopAll'].Add_Click({
    $script:State.StopRequested = $true
    Send-UIMessage -Type 'Status' -Data @{ Text = "Stopping..."; Color = '#FFFF6B6B' }
    Send-UIMessage -Type 'Log' -Data @{ Message = "Stop requested by user"; Color = '#FFFF6B6B' }
})

# =====================================================================
# Watch Folder Events
# =====================================================================
$ui['BtnAddWatch'].Add_Click({
    $dlg = New-Object System.Windows.Forms.FolderBrowserDialog
    $dlg.Description = "Select folder to monitor"
    if ($dlg.ShowDialog() -eq 'OK') {
        $dup = $false; foreach ($i in $ui['WatchList'].Items) { if ($i -eq $dlg.SelectedPath) { $dup = $true; break } }
        if (-not $dup) { $ui['WatchList'].Items.Add($dlg.SelectedPath) }
    }
})
$ui['BtnRemoveWatch'].Add_Click({
    $s = $ui['WatchList'].SelectedItem
    if ($s) { $ui['WatchList'].Items.Remove($s) }
})

$ui['BtnToggleWatch'].Add_Click({
    if ($script:State.WatchersActive) {
        foreach ($w in $script:State.Watchers) {
            try { $w.EnableRaisingEvents = $false; $w.Dispose() } catch {}
        }
        $script:State.Watchers.Clear()
        $script:State.WatchersActive = $false
        $ui['BtnToggleWatch'].Content = "Start Watching"
        $ui['BtnToggleWatch'].Background = [System.Windows.Media.BrushConverter]::new().ConvertFromString('#FF2D6A4F')
        $ui['WatchStatus'].Text = ""
        Send-UIMessage -Type 'Log' -Data @{ Message = "Watching stopped"; Color = '#FFFFD93D' }
    } else {
        if ($ui['WatchList'].Items.Count -eq 0) {
            [System.Windows.MessageBox]::Show("Add a folder first.", "ExtractorX", 'OK', 'Information')
            return
        }
        $recur = [bool]$ui['ChkWatchRecursive'].IsChecked
        foreach ($folder in $ui['WatchList'].Items) {
            if (-not (Test-Path $folder)) { continue }
            $w = New-Object System.IO.FileSystemWatcher
            $w.Path = $folder
            $w.IncludeSubdirectories = $recur
            $w.InternalBufferSize = 65536
            $w.NotifyFilter = [IO.NotifyFilters]::FileName -bor [IO.NotifyFilters]::LastWrite
            $db = [hashtable]::Synchronized(@{})
            $act = {
                $p = $Event.SourceEventArgs.FullPath
                $n = [DateTime]::Now
                $d = $Event.MessageData.DB
                $q = $Event.MessageData.Q
                $x = $Event.MessageData.Exts
                if ($d.ContainsKey($p) -and ($n - $d[$p]).TotalSeconds -lt 2) { return }
                $d[$p] = $n
                # Wait for file to finish writing
                Start-Sleep -Milliseconds 1000
                $r = 0
                while ($r -lt 8) {
                    try {
                        $s = [IO.File]::Open($p, 'Open', 'Read', 'None')
                        $s.Close(); break
                    } catch { $r++; Start-Sleep -Milliseconds 500 }
                }
                if ([IO.Path]::GetExtension($p).ToLower() -in $x) {
                    $q.Enqueue(@{ Type = 'WatchFileDetected'; FilePath = $p })
                    $q.Enqueue(@{ Type = 'Log'; Message = "Watcher: $([IO.Path]::GetFileName($p))"; Color = '#FF00B4D8' })
                }
            }
            $md = @{ DB = $db; Q = $script:UIQueue; Exts = $script:ArchiveExtensions }
            Register-ObjectEvent $w Created -Action $act -MessageData $md | Out-Null
            Register-ObjectEvent $w Renamed -Action $act -MessageData $md | Out-Null
            $w.EnableRaisingEvents = $true
            $script:State.Watchers.Add($w) | Out-Null
            Send-UIMessage -Type 'Log' -Data @{ Message = "Watching: $folder"; Color = '#FF6BCB77' }
        }
        $script:State.WatchersActive = $true
        $ui['BtnToggleWatch'].Content = "Stop Watching"
        $ui['BtnToggleWatch'].Background = [System.Windows.Media.BrushConverter]::new().ConvertFromString('#FF922B21')
        $ui['WatchStatus'].Text = "Watching $($ui['WatchList'].Items.Count) folder(s)"
    }
})

# =====================================================================
# Password Events
# =====================================================================
$ui['BtnAddPassword'].Add_Click({
    $pw = $ui['TxtNewPassword'].Text.Trim()
    if ($pw) {
        $script:Passwords += $pw
        $m = if ($pw.Length -le 4) { '*' * $pw.Length }
             else { $pw.Substring(0,2) + ('*' * ($pw.Length - 4)) + $pw.Substring($pw.Length - 2) }
        $ui['PasswordListBox'].Items.Add($m)
        Save-Passwords -Passwords $script:Passwords
        $ui['TxtNewPassword'].Text = ''
    }
})
$ui['BtnRemovePassword'].Add_Click({
    $idx = $ui['PasswordListBox'].SelectedIndex
    if ($idx -ge 0 -and $idx -lt $script:Passwords.Count) {
        # PS 5.1 compatible removal (no Select-Object -SkipIndex)
        $newList = @()
        for ($i = 0; $i -lt $script:Passwords.Count; $i++) {
            if ($i -ne $idx) { $newList += $script:Passwords[$i] }
        }
        $script:Passwords = $newList
        $ui['PasswordListBox'].Items.RemoveAt($idx)
        Save-Passwords -Passwords $script:Passwords
    }
})
$ui['BtnImportPasswords'].Add_Click({
    $dlg = New-Object Microsoft.Win32.OpenFileDialog
    $dlg.Title = "Import Password List"
    $dlg.Filter = "Text|*.txt|All|*.*"
    if ($dlg.ShowDialog()) {
        $c = 0
        Get-Content $dlg.FileName | Where-Object { $_.Trim() } | ForEach-Object {
            $pw = $_.Trim()
            if ($pw -notin $script:Passwords) {
                $script:Passwords += $pw
                $m = if ($pw.Length -le 4) { '*' * $pw.Length }
                     else { $pw.Substring(0,2) + ('*' * ($pw.Length - 4)) + $pw.Substring($pw.Length - 2) }
                $ui['PasswordListBox'].Items.Add($m)
                $c++
            }
        }
        Save-Passwords -Passwords $script:Passwords
        Send-UIMessage -Type 'Log' -Data @{ Message = "Imported $c passwords"; Color = '#FF6BCB77' }
    }
})

# =====================================================================
# Settings Events
# =====================================================================
$ui['BtnSaveSettings'].Add_Click({
    $script:Config.OutputPath            = $ui['TxtOutputPath'].Text
    $script:Config.OverwriteMode         = @('Always','Never','Rename')[$ui['CmbOverwrite'].SelectedIndex]
    $script:Config.PostAction            = @('None','Recycle','MoveToFolder')[$ui['CmbPostAction'].SelectedIndex]
    $script:Config.PostActionFolder      = $ui['TxtPostActionFolder'].Text
    $script:Config.DeleteAfterExtract    = [bool]$ui['ChkDeleteAfterExtract'].IsChecked
    $script:Config.FileExclusions        = $ui['TxtExclusions'].Text
    $script:Config.NestedExtraction      = [bool]$ui['ChkNested'].IsChecked
    $script:Config.RemoveDuplicateFolder = [bool]$ui['ChkRemoveDupe'].IsChecked
    $script:Config.ScanMagicBytes        = [bool]$ui['ChkMagicBytes'].IsChecked
    $script:Config.NestedMaxDepth        = @(3,5,10,20)[$ui['CmbNestedDepth'].SelectedIndex]
    $script:Config.AlwaysOnTop           = [bool]$ui['ChkAlwaysOnTop'].IsChecked
    $script:Config.ShowNotifications     = [bool]$ui['ChkShowNotifications'].IsChecked
    $script:Config.WatchRecursive        = [bool]$ui['ChkWatchRecursive'].IsChecked
    $script:Config.WatchAutoExtract      = [bool]$ui['ChkWatchAutoExtract'].IsChecked
    $script:Config.WatchFolders          = @($ui['WatchList'].Items | ForEach-Object { $_ })
    Save-Config -Config $script:Config
    Send-UIMessage -Type 'Status' -Data @{ Text = "Settings saved"; Color = '#FF6BCB77' }
    Send-UIMessage -Type 'Log' -Data @{ Message = "Settings saved"; Color = '#FF6BCB77' }
})

$ui['BtnInstallCtx'].Add_Click({
    Install-ContextMenu
    [System.Windows.MessageBox]::Show("Context menu installed for all archive types.", "ExtractorX", 'OK', 'Information')
})
$ui['BtnRemoveCtx'].Add_Click({
    Uninstall-ContextMenu
    [System.Windows.MessageBox]::Show("Context menu removed.", "ExtractorX", 'OK', 'Information')
})

# =====================================================================
# Log Events
# =====================================================================
$ui['BtnClearLog'].Add_Click({ $ui['LogBox'].Inlines.Clear() })
$ui['BtnExportLog'].Add_Click({
    $dlg = New-Object Microsoft.Win32.SaveFileDialog
    $dlg.Filter = "Text|*.txt"
    $dlg.FileName = "ExtractorX_$(Get-Date -Format 'yyyyMMdd_HHmmss').txt"
    if ($dlg.ShowDialog()) {
        $sb = [System.Text.StringBuilder]::new()
        foreach ($il in $ui['LogBox'].Inlines) {
            if ($il -is [System.Windows.Documents.Run]) { [void]$sb.Append($il.Text) }
        }
        $sb.ToString() | Set-Content $dlg.FileName -Force
    }
})
$ui['BtnOpenLogDir'].Add_Click({
    if (Test-Path $script:LogDir) { Start-Process explorer.exe $script:LogDir }
})

# =====================================================================
# Window Lifecycle
# =====================================================================
$window.Add_Loaded({
    Write-UILog "ExtractorX v$($script:AppVersion) started" '#FF6BCB77'
    if ($script:7zPath) {
        Write-UILog "7-Zip: $($script:7zPath)" '#FF6BCB77'
    } else {
        Write-UILog "7-Zip not found - will download on first use" '#FFFFD93D'
    }
    Write-UILog "Passwords: $($script:Passwords.Count) loaded" '#FFB0B0B0'
    Write-UILog "Watch folders: $($ui['WatchList'].Items.Count) configured" '#FFB0B0B0'
    if ($FilesToExtract -and $FilesToExtract.Count -gt 0) {
        Add-ToQueue -Files $FilesToExtract
    }
})

$window.Add_Closing({
    $script:UITimer.Stop()
    # Dispose watchers
    foreach ($w in $script:State.Watchers) {
        try { $w.EnableRaisingEvents = $false; $w.Dispose() } catch {}
    }
    # Save window dimensions
    $script:Config.WindowWidth = [int]$window.ActualWidth
    $script:Config.WindowHeight = [int]$window.ActualHeight
    Save-Config -Config $script:Config
    # Dispose background runspaces
    if ($script:extractPS) { try { $script:extractPS.Stop(); $script:extractPS.Dispose() } catch {} }
    if ($script:extractRS) { try { $script:extractRS.Dispose() } catch {} }
    if ($script:dl7zPS) { try { $script:dl7zPS.Stop(); $script:dl7zPS.Dispose() } catch {} }
    if ($script:dl7zRS) { try { $script:dl7zRS.Dispose() } catch {} }
})

# Keyboard shortcuts
$window.Add_KeyDown({
    if ($_.Key -eq 'V' -and [System.Windows.Input.Keyboard]::Modifiers -eq 'Control') {
        if ([System.Windows.Clipboard]::ContainsFileDropList()) {
            Add-ToQueue -Files @([System.Windows.Clipboard]::GetFileDropList())
        }
    }
    if ($_.Key -eq 'Delete' -and -not $script:State.IsExtracting) {
        $sel = @($ui['QueueList'].SelectedItems)
        foreach ($s in $sel) { $ui['QueueList'].Items.Remove($s) }
        Send-UIMessage -Type 'QueueCountRefresh'
    }
})

if ($script:Config.AlwaysOnTop) { $window.Topmost = $true }
[void]$window.ShowDialog()
