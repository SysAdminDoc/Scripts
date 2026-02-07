<#
.SYNOPSIS
    SoftwareScanner GUI - Visual Installed Software Auditor for Debloat Script Development
.DESCRIPTION
    GUI tool that scans all installed software from multiple sources with real-time
    verbose output. Exports detailed information useful for creating debloat scripts.
.AUTHOR
    Matt's Debloat Toolkit
.VERSION
    1.0.0
#>

#Requires -Version 5.1

Add-Type -AssemblyName PresentationFramework
Add-Type -AssemblyName PresentationCore
Add-Type -AssemblyName WindowsBase
Add-Type -AssemblyName System.Windows.Forms

# ============================================================================
# XAML GUI DEFINITION
# ============================================================================

[xml]$XAML = @"
<Window
    xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
    xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
    Title="Software Scanner - Debloat Development Tool"
    Height="750" Width="1200"
    MinHeight="600" MinWidth="900"
    WindowStartupLocation="CenterScreen"
    Background="#1a1a2e">
    
    <Window.Resources>
        <Style TargetType="Button" x:Key="PrimaryButton">
            <Setter Property="Background" Value="#4a90d9"/>
            <Setter Property="Foreground" Value="White"/>
            <Setter Property="FontWeight" Value="SemiBold"/>
            <Setter Property="Padding" Value="16,10"/>
            <Setter Property="Margin" Value="4"/>
            <Setter Property="BorderThickness" Value="0"/>
            <Setter Property="Cursor" Value="Hand"/>
            <Setter Property="Template">
                <Setter.Value>
                    <ControlTemplate TargetType="Button">
                        <Border Background="{TemplateBinding Background}" CornerRadius="4" Padding="{TemplateBinding Padding}">
                            <ContentPresenter HorizontalAlignment="Center" VerticalAlignment="Center"/>
                        </Border>
                        <ControlTemplate.Triggers>
                            <Trigger Property="IsMouseOver" Value="True">
                                <Setter Property="Background" Value="#5a9fe9"/>
                            </Trigger>
                            <Trigger Property="IsEnabled" Value="False">
                                <Setter Property="Background" Value="#3a3a4e"/>
                                <Setter Property="Foreground" Value="#666"/>
                            </Trigger>
                        </ControlTemplate.Triggers>
                    </ControlTemplate>
                </Setter.Value>
            </Setter>
        </Style>
        
        <Style TargetType="Button" x:Key="ExportButton">
            <Setter Property="Background" Value="#2d6a4f"/>
            <Setter Property="Foreground" Value="White"/>
            <Setter Property="FontWeight" Value="SemiBold"/>
            <Setter Property="Padding" Value="12,8"/>
            <Setter Property="Margin" Value="4"/>
            <Setter Property="BorderThickness" Value="0"/>
            <Setter Property="Cursor" Value="Hand"/>
            <Setter Property="Template">
                <Setter.Value>
                    <ControlTemplate TargetType="Button">
                        <Border Background="{TemplateBinding Background}" CornerRadius="4" Padding="{TemplateBinding Padding}">
                            <ContentPresenter HorizontalAlignment="Center" VerticalAlignment="Center"/>
                        </Border>
                        <ControlTemplate.Triggers>
                            <Trigger Property="IsMouseOver" Value="True">
                                <Setter Property="Background" Value="#40916c"/>
                            </Trigger>
                            <Trigger Property="IsEnabled" Value="False">
                                <Setter Property="Background" Value="#3a3a4e"/>
                                <Setter Property="Foreground" Value="#666"/>
                            </Trigger>
                        </ControlTemplate.Triggers>
                    </ControlTemplate>
                </Setter.Value>
            </Setter>
        </Style>
        
        <Style TargetType="Button" x:Key="DangerButton">
            <Setter Property="Background" Value="#c1121f"/>
            <Setter Property="Foreground" Value="White"/>
            <Setter Property="FontWeight" Value="SemiBold"/>
            <Setter Property="Padding" Value="12,8"/>
            <Setter Property="Margin" Value="4"/>
            <Setter Property="BorderThickness" Value="0"/>
            <Setter Property="Cursor" Value="Hand"/>
            <Setter Property="Template">
                <Setter.Value>
                    <ControlTemplate TargetType="Button">
                        <Border Background="{TemplateBinding Background}" CornerRadius="4" Padding="{TemplateBinding Padding}">
                            <ContentPresenter HorizontalAlignment="Center" VerticalAlignment="Center"/>
                        </Border>
                        <ControlTemplate.Triggers>
                            <Trigger Property="IsMouseOver" Value="True">
                                <Setter Property="Background" Value="#e63946"/>
                            </Trigger>
                            <Trigger Property="IsEnabled" Value="False">
                                <Setter Property="Background" Value="#3a3a4e"/>
                                <Setter Property="Foreground" Value="#666"/>
                            </Trigger>
                        </ControlTemplate.Triggers>
                    </ControlTemplate>
                </Setter.Value>
            </Setter>
        </Style>
        
        <Style TargetType="CheckBox">
            <Setter Property="Foreground" Value="#e0e0e0"/>
            <Setter Property="Margin" Value="8,4"/>
            <Setter Property="VerticalContentAlignment" Value="Center"/>
        </Style>
        
        <Style TargetType="DataGrid">
            <Setter Property="Background" Value="#16213e"/>
            <Setter Property="Foreground" Value="#e0e0e0"/>
            <Setter Property="BorderBrush" Value="#2a2a4e"/>
            <Setter Property="BorderThickness" Value="1"/>
            <Setter Property="RowBackground" Value="#16213e"/>
            <Setter Property="AlternatingRowBackground" Value="#1a2744"/>
            <Setter Property="GridLinesVisibility" Value="Horizontal"/>
            <Setter Property="HorizontalGridLinesBrush" Value="#2a2a4e"/>
            <Setter Property="VerticalGridLinesBrush" Value="#2a2a4e"/>
            <Setter Property="HeadersVisibility" Value="Column"/>
        </Style>
        
        <Style TargetType="DataGridColumnHeader">
            <Setter Property="Background" Value="#0f3460"/>
            <Setter Property="Foreground" Value="#4cc9f0"/>
            <Setter Property="FontWeight" Value="SemiBold"/>
            <Setter Property="Padding" Value="10,8"/>
            <Setter Property="BorderBrush" Value="#2a2a4e"/>
            <Setter Property="BorderThickness" Value="0,0,1,1"/>
        </Style>
        
        <Style TargetType="DataGridCell">
            <Setter Property="Padding" Value="8,6"/>
            <Setter Property="BorderThickness" Value="0"/>
            <Setter Property="Foreground" Value="#e0e0e0"/>
            <Style.Triggers>
                <Trigger Property="IsSelected" Value="True">
                    <Setter Property="Background" Value="#3a5a8a"/>
                    <Setter Property="Foreground" Value="White"/>
                </Trigger>
            </Style.Triggers>
        </Style>
        
        <Style TargetType="TabItem">
            <Setter Property="Background" Value="#1a1a2e"/>
            <Setter Property="Foreground" Value="#888"/>
            <Setter Property="Padding" Value="16,10"/>
            <Setter Property="Template">
                <Setter.Value>
                    <ControlTemplate TargetType="TabItem">
                        <Border Name="Border" Background="#1a1a2e" Padding="16,10" Margin="2,0" CornerRadius="4,4,0,0">
                            <ContentPresenter ContentSource="Header"/>
                        </Border>
                        <ControlTemplate.Triggers>
                            <Trigger Property="IsSelected" Value="True">
                                <Setter TargetName="Border" Property="Background" Value="#16213e"/>
                                <Setter Property="Foreground" Value="#4cc9f0"/>
                            </Trigger>
                            <Trigger Property="IsMouseOver" Value="True">
                                <Setter TargetName="Border" Property="Background" Value="#222244"/>
                            </Trigger>
                        </ControlTemplate.Triggers>
                    </ControlTemplate>
                </Setter.Value>
            </Setter>
        </Style>
    </Window.Resources>
    
    <Grid Margin="16">
        <Grid.RowDefinitions>
            <RowDefinition Height="Auto"/>
            <RowDefinition Height="Auto"/>
            <RowDefinition Height="*"/>
            <RowDefinition Height="Auto"/>
        </Grid.RowDefinitions>
        
        <!-- Header -->
        <StackPanel Grid.Row="0" Margin="0,0,0,16">
            <TextBlock Text="Software Scanner" FontSize="28" FontWeight="Bold" Foreground="#4cc9f0"/>
            <TextBlock Text="Debloat Script Development Tool" FontSize="14" Foreground="#888" Margin="0,4,0,0"/>
        </StackPanel>
        
        <!-- Controls Row -->
        <Border Grid.Row="1" Background="#16213e" CornerRadius="8" Padding="16" Margin="0,0,0,16">
            <Grid>
                <Grid.ColumnDefinitions>
                    <ColumnDefinition Width="Auto"/>
                    <ColumnDefinition Width="*"/>
                    <ColumnDefinition Width="Auto"/>
                </Grid.ColumnDefinitions>
                
                <!-- Scan Button -->
                <Button Name="btnScan" Content="Start Full Scan" Style="{StaticResource PrimaryButton}" 
                        Grid.Column="0" FontSize="14" Padding="24,12"/>
                
                <!-- Options -->
                <WrapPanel Grid.Column="1" Margin="24,0" VerticalAlignment="Center">
                    <CheckBox Name="chkSystemApps" Content="Include System Apps"/>
                    <CheckBox Name="chkStartup" Content="Scan Startup" IsChecked="True"/>
                    <CheckBox Name="chkServices" Content="Scan Services" IsChecked="True"/>
                    <CheckBox Name="chkTasks" Content="Scan Scheduled Tasks"/>
                    <CheckBox Name="chkBloatOnly" Content="Show Bloatware Only"/>
                </WrapPanel>
                
                <!-- Status -->
                <StackPanel Grid.Column="2" VerticalAlignment="Center">
                    <TextBlock Name="txtStatus" Text="Ready" Foreground="#4cc9f0" FontWeight="SemiBold" FontSize="13"/>
                    <TextBlock Name="txtAdminStatus" Text="" Foreground="#ffd166" FontSize="11" Margin="0,4,0,0"/>
                </StackPanel>
            </Grid>
        </Border>
        
        <!-- Main Content -->
        <Grid Grid.Row="2">
            <Grid.ColumnDefinitions>
                <ColumnDefinition Width="*"/>
                <ColumnDefinition Width="350"/>
            </Grid.ColumnDefinitions>
            
            <!-- Data Tabs -->
            <TabControl Name="tabResults" Grid.Column="0" Background="#16213e" BorderBrush="#2a2a4e" Margin="0,0,16,0">
                <TabItem Header="Registry Software" Name="tabRegistry">
                    <DataGrid Name="gridRegistry" AutoGenerateColumns="False" IsReadOnly="True" 
                              CanUserSortColumns="True" SelectionMode="Extended">
                        <DataGrid.Columns>
                            <DataGridCheckBoxColumn Header="" Binding="{Binding IsSelected}" Width="30"/>
                            <DataGridTextColumn Header="Name" Binding="{Binding Name}" Width="250"/>
                            <DataGridTextColumn Header="Version" Binding="{Binding Version}" Width="100"/>
                            <DataGridTextColumn Header="Publisher" Binding="{Binding Publisher}" Width="180"/>
                            <DataGridTextColumn Header="Arch" Binding="{Binding Architecture}" Width="50"/>
                            <DataGridTextColumn Header="Bloat" Binding="{Binding IsBloatware}" Width="50"/>
                        </DataGrid.Columns>
                    </DataGrid>
                </TabItem>
                
                <TabItem Header="Appx Packages" Name="tabAppx">
                    <DataGrid Name="gridAppx" AutoGenerateColumns="False" IsReadOnly="True"
                              CanUserSortColumns="True" SelectionMode="Extended">
                        <DataGrid.Columns>
                            <DataGridCheckBoxColumn Header="" Binding="{Binding IsSelected}" Width="30"/>
                            <DataGridTextColumn Header="Name" Binding="{Binding Name}" Width="280"/>
                            <DataGridTextColumn Header="Version" Binding="{Binding Version}" Width="120"/>
                            <DataGridTextColumn Header="Framework" Binding="{Binding IsFramework}" Width="70"/>
                            <DataGridTextColumn Header="Removable" Binding="{Binding Removable}" Width="80"/>
                            <DataGridTextColumn Header="Bloat" Binding="{Binding IsBloatware}" Width="50"/>
                        </DataGrid.Columns>
                    </DataGrid>
                </TabItem>
                
                <TabItem Header="Provisioned" Name="tabProvisioned">
                    <DataGrid Name="gridProvisioned" AutoGenerateColumns="False" IsReadOnly="True"
                              CanUserSortColumns="True" SelectionMode="Extended">
                        <DataGrid.Columns>
                            <DataGridCheckBoxColumn Header="" Binding="{Binding IsSelected}" Width="30"/>
                            <DataGridTextColumn Header="Name" Binding="{Binding Name}" Width="350"/>
                            <DataGridTextColumn Header="Version" Binding="{Binding Version}" Width="120"/>
                            <DataGridTextColumn Header="Bloat" Binding="{Binding IsBloatware}" Width="50"/>
                        </DataGrid.Columns>
                    </DataGrid>
                </TabItem>
                
                <TabItem Header="WinGet" Name="tabWinGet">
                    <DataGrid Name="gridWinGet" AutoGenerateColumns="False" IsReadOnly="True"
                              CanUserSortColumns="True" SelectionMode="Extended">
                        <DataGrid.Columns>
                            <DataGridCheckBoxColumn Header="" Binding="{Binding IsSelected}" Width="30"/>
                            <DataGridTextColumn Header="Name" Binding="{Binding Name}" Width="280"/>
                            <DataGridTextColumn Header="ID" Binding="{Binding Id}" Width="200"/>
                            <DataGridTextColumn Header="Version" Binding="{Binding Version}" Width="100"/>
                            <DataGridTextColumn Header="Bloat" Binding="{Binding IsBloatware}" Width="50"/>
                        </DataGrid.Columns>
                    </DataGrid>
                </TabItem>
                
                <TabItem Header="Startup" Name="tabStartup">
                    <DataGrid Name="gridStartup" AutoGenerateColumns="False" IsReadOnly="True"
                              CanUserSortColumns="True" SelectionMode="Extended">
                        <DataGrid.Columns>
                            <DataGridCheckBoxColumn Header="" Binding="{Binding IsSelected}" Width="30"/>
                            <DataGridTextColumn Header="Name" Binding="{Binding Name}" Width="200"/>
                            <DataGridTextColumn Header="Command" Binding="{Binding Command}" Width="350"/>
                            <DataGridTextColumn Header="Source" Binding="{Binding Source}" Width="100"/>
                        </DataGrid.Columns>
                    </DataGrid>
                </TabItem>
                
                <TabItem Header="Services" Name="tabServices">
                    <DataGrid Name="gridServices" AutoGenerateColumns="False" IsReadOnly="True"
                              CanUserSortColumns="True" SelectionMode="Extended">
                        <DataGrid.Columns>
                            <DataGridCheckBoxColumn Header="" Binding="{Binding IsSelected}" Width="30"/>
                            <DataGridTextColumn Header="Name" Binding="{Binding DisplayName}" Width="250"/>
                            <DataGridTextColumn Header="Service" Binding="{Binding Name}" Width="150"/>
                            <DataGridTextColumn Header="State" Binding="{Binding State}" Width="80"/>
                            <DataGridTextColumn Header="Start" Binding="{Binding StartMode}" Width="80"/>
                        </DataGrid.Columns>
                    </DataGrid>
                </TabItem>
                
                <TabItem Header="Tasks" Name="tabTasks">
                    <DataGrid Name="gridTasks" AutoGenerateColumns="False" IsReadOnly="True"
                              CanUserSortColumns="True" SelectionMode="Extended">
                        <DataGrid.Columns>
                            <DataGridCheckBoxColumn Header="" Binding="{Binding IsSelected}" Width="30"/>
                            <DataGridTextColumn Header="Name" Binding="{Binding Name}" Width="250"/>
                            <DataGridTextColumn Header="Path" Binding="{Binding Path}" Width="200"/>
                            <DataGridTextColumn Header="State" Binding="{Binding State}" Width="80"/>
                            <DataGridTextColumn Header="Author" Binding="{Binding Author}" Width="150"/>
                        </DataGrid.Columns>
                    </DataGrid>
                </TabItem>
            </TabControl>
            
            <!-- Log Panel -->
            <Border Grid.Column="1" Background="#0d1321" CornerRadius="8" Padding="12">
                <Grid>
                    <Grid.RowDefinitions>
                        <RowDefinition Height="Auto"/>
                        <RowDefinition Height="*"/>
                        <RowDefinition Height="Auto"/>
                    </Grid.RowDefinitions>
                    
                    <TextBlock Grid.Row="0" Text="Scan Output" FontSize="14" FontWeight="SemiBold" 
                               Foreground="#4cc9f0" Margin="0,0,0,12"/>
                    
                    <Border Grid.Row="1" Background="#0a0e17" CornerRadius="4">
                        <ScrollViewer Name="scrollLog" VerticalScrollBarVisibility="Auto">
                            <TextBox Name="txtLog" Background="Transparent" Foreground="#7bed9f" 
                                     FontFamily="Consolas" FontSize="11" BorderThickness="0"
                                     IsReadOnly="True" TextWrapping="Wrap" Padding="8"
                                     VerticalScrollBarVisibility="Disabled"/>
                        </ScrollViewer>
                    </Border>
                    
                    <Button Name="btnClearLog" Content="Clear Log" Grid.Row="2" 
                            HorizontalAlignment="Right" Margin="0,8,0,0"
                            Background="#333" Foreground="#aaa" Padding="12,6"
                            BorderThickness="0" Cursor="Hand"/>
                </Grid>
            </Border>
        </Grid>
        
        <!-- Footer / Export Buttons -->
        <Border Grid.Row="3" Background="#16213e" CornerRadius="8" Padding="12" Margin="0,16,0,0">
            <Grid>
                <Grid.ColumnDefinitions>
                    <ColumnDefinition Width="*"/>
                    <ColumnDefinition Width="Auto"/>
                </Grid.ColumnDefinitions>
                
                <!-- Export Buttons -->
                <WrapPanel Grid.Column="0" VerticalAlignment="Center">
                    <TextBlock Text="Export:" Foreground="#888" VerticalAlignment="Center" Margin="0,0,12,0" FontWeight="SemiBold"/>
                    <Button Name="btnExportCurrentCSV" Content="Current Tab (CSV)" Style="{StaticResource ExportButton}"/>
                    <Button Name="btnExportAllCSV" Content="All Data (CSV)" Style="{StaticResource ExportButton}"/>
                    <Button Name="btnExportDebloat" Content="Debloat Script" Style="{StaticResource ExportButton}"/>
                    <Button Name="btnExportSelected" Content="Selected Items" Style="{StaticResource DangerButton}"/>
                    <Button Name="btnCopyCommands" Content="Copy Removal Commands" Style="{StaticResource DangerButton}"/>
                </WrapPanel>
                
                <!-- Stats -->
                <StackPanel Grid.Column="1" Orientation="Horizontal" VerticalAlignment="Center">
                    <TextBlock Name="txtStats" Text="Items: 0 | Bloatware: 0" Foreground="#888" 
                               VerticalAlignment="Center" Margin="16,0"/>
                </StackPanel>
            </Grid>
        </Border>
    </Grid>
</Window>
"@

# ============================================================================
# LOAD WINDOW
# ============================================================================

$reader = (New-Object System.Xml.XmlNodeReader $XAML)
$Window = [Windows.Markup.XamlReader]::Load($reader)

# Get controls
$btnScan = $Window.FindName("btnScan")
$btnClearLog = $Window.FindName("btnClearLog")
$btnExportCurrentCSV = $Window.FindName("btnExportCurrentCSV")
$btnExportAllCSV = $Window.FindName("btnExportAllCSV")
$btnExportDebloat = $Window.FindName("btnExportDebloat")
$btnExportSelected = $Window.FindName("btnExportSelected")
$btnCopyCommands = $Window.FindName("btnCopyCommands")

$chkSystemApps = $Window.FindName("chkSystemApps")
$chkStartup = $Window.FindName("chkStartup")
$chkServices = $Window.FindName("chkServices")
$chkTasks = $Window.FindName("chkTasks")
$chkBloatOnly = $Window.FindName("chkBloatOnly")

$txtStatus = $Window.FindName("txtStatus")
$txtAdminStatus = $Window.FindName("txtAdminStatus")
$txtLog = $Window.FindName("txtLog")
$txtStats = $Window.FindName("txtStats")
$scrollLog = $Window.FindName("scrollLog")

$tabResults = $Window.FindName("tabResults")
$gridRegistry = $Window.FindName("gridRegistry")
$gridAppx = $Window.FindName("gridAppx")
$gridProvisioned = $Window.FindName("gridProvisioned")
$gridWinGet = $Window.FindName("gridWinGet")
$gridStartup = $Window.FindName("gridStartup")
$gridServices = $Window.FindName("gridServices")
$gridTasks = $Window.FindName("gridTasks")

# ============================================================================
# GLOBAL STATE
# ============================================================================

$Script:ScanData = @{
    Registry     = @()
    Appx         = @()
    Provisioned  = @()
    WinGet       = @()
    Startup      = @()
    Services     = @()
    Tasks        = @()
}

$Script:BloatPatterns = @(
    '*Candy*', '*Farm*', '*Bubble*', '*Solitaire*', '*Casino*',
    '*Xbox*', '*Zune*', '*Skype*', '*OneNote*',
    '*Spotify*', '*Disney*', '*TikTok*', '*Instagram*', '*Facebook*',
    '*Netflix*', '*Hulu*', '*Twitter*', '*LinkedIn*', '*Amazon*',
    '*McAfee*', '*Norton*', '*Avast*', '*AVG*', '*Kaspersky*',
    '*CCleaner*', '*Driver*Booster*', '*IObit*', '*Auslogics*',
    '*Clipchamp*', '*Teams*', '*ToDo*', '*News*', '*Weather*',
    '*Maps*', '*People*', '*Mail*', '*Calendar*', '*Messaging*',
    '*Phone*', '*YourPhone*', '*PhoneLink*', '*Cortana*', '*Copilot*',
    '*GetHelp*', '*GetStarted*', '*Tips*', '*Feedback*', '*Mixed*Reality*',
    '*3DViewer*', '*3DBuilder*', '*Paint3D*', '*OneConnect*', '*Print3D*',
    '*Wallet*', '*Whiteboard*', '*Family*', '*Advertising*', '*BingSearch*',
    '*Bing*', '*Zune*', '*Gaming*', '*Gamebar*', '*DevHome*'
)

$Script:IsAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

function Write-Log {
    param([string]$Message, [string]$Color = "White")
    
    $timestamp = Get-Date -Format "HH:mm:ss"
    $logEntry = "[$timestamp] $Message`r`n"
    
    $Window.Dispatcher.Invoke([action]{
        $txtLog.AppendText($logEntry)
        $scrollLog.ScrollToEnd()
    })
}

function Update-Status {
    param([string]$Status)
    $Window.Dispatcher.Invoke([action]{
        $txtStatus.Text = $Status
    })
}

function Update-Stats {
    $totalItems = 0
    $totalBloat = 0
    
    foreach ($key in $Script:ScanData.Keys) {
        $data = $Script:ScanData[$key]
        if ($data) {
            $totalItems += $data.Count
            $totalBloat += ($data | Where-Object { $_.IsBloatware -eq $true }).Count
        }
    }
    
    $Window.Dispatcher.Invoke([action]{
        $txtStats.Text = "Items: $totalItems | Bloatware: $totalBloat"
    })
}

function Test-IsBloatware {
    param([string]$Name)
    if ([string]::IsNullOrEmpty($Name)) { return $false }
    foreach ($pattern in $Script:BloatPatterns) {
        if ($Name -like $pattern) { return $true }
    }
    return $false
}

function Refresh-Grid {
    param([string]$GridName, [array]$Data)
    
    $filteredData = $Data
    if ($chkBloatOnly.IsChecked) {
        $filteredData = $Data | Where-Object { $_.IsBloatware -eq $true }
    }
    
    $grid = $Window.FindName($GridName)
    if ($grid) {
        $Window.Dispatcher.Invoke([action]{
            $grid.ItemsSource = $filteredData
        })
    }
}

function Refresh-AllGrids {
    Refresh-Grid "gridRegistry" $Script:ScanData.Registry
    Refresh-Grid "gridAppx" $Script:ScanData.Appx
    Refresh-Grid "gridProvisioned" $Script:ScanData.Provisioned
    Refresh-Grid "gridWinGet" $Script:ScanData.WinGet
    Refresh-Grid "gridStartup" $Script:ScanData.Startup
    Refresh-Grid "gridServices" $Script:ScanData.Services
    Refresh-Grid "gridTasks" $Script:ScanData.Tasks
    Update-Stats
}

function Get-RegistryKeyName {
    param([string]$PSPath)
    if ([string]::IsNullOrEmpty($PSPath)) { return "" }
    $parts = $PSPath.Split('\')
    if ($parts.Count -gt 0) {
        return $parts[-1]
    }
    return ""
}

# ============================================================================
# SCANNING FUNCTIONS
# ============================================================================

function Scan-Registry {
    Write-Log "=== Scanning Registry (Installed Programs) ===" 
    Write-Log "Checking HKLM and HKCU uninstall keys..."
    
    $registryPaths = @(
        @{ Path = "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\*"; Arch = "x64" },
        @{ Path = "HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*"; Arch = "x86" },
        @{ Path = "HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\*"; Arch = "User" }
    )
    
    $software = [System.Collections.ArrayList]@()
    
    foreach ($reg in $registryPaths) {
        Write-Log "  Scanning $($reg.Arch) registry..."
        try {
            $items = Get-ItemProperty -Path $reg.Path -ErrorAction SilentlyContinue | 
                     Where-Object { $_.DisplayName -and $_.DisplayName.Trim() -ne "" }
            
            foreach ($item in $items) {
                $isBloat = Test-IsBloatware $item.DisplayName
                $regKey = Get-RegistryKeyName -PSPath $item.PSPath
                
                $obj = [PSCustomObject]@{
                    IsSelected       = $false
                    Source           = "Registry"
                    Name             = $item.DisplayName
                    Version          = $item.DisplayVersion
                    Publisher        = $item.Publisher
                    InstallDate      = $item.InstallDate
                    InstallLocation  = $item.InstallLocation
                    UninstallString  = $item.UninstallString
                    QuietUninstall   = $item.QuietUninstallString
                    Architecture     = $reg.Arch
                    IsBloatware      = $isBloat
                    RegistryKey      = $regKey
                }
                [void]$software.Add($obj)
            }
            Write-Log "    Found $($items.Count) items"
        } catch {
            Write-Log "    Error: $_"
        }
    }
    
    Write-Log "Registry scan complete: $($software.Count) total programs"
    return $software
}

function Scan-Appx {
    param([bool]$IncludeSystem = $false)
    
    Write-Log "=== Scanning Appx/MSIX Packages ===" 
    
    $packages = [System.Collections.ArrayList]@()
    
    try {
        Write-Log "  Getting current user packages..."
        $userPackages = Get-AppxPackage -ErrorAction SilentlyContinue
        Write-Log "    Found $($userPackages.Count) user packages"
        
        $allPackages = $userPackages
        
        if ($Script:IsAdmin) {
            Write-Log "  Getting all users packages (admin)..."
            $allUsersPackages = Get-AppxPackage -AllUsers -ErrorAction SilentlyContinue
            Write-Log "    Found $($allUsersPackages.Count) all-users packages"
            $allPackages = @($userPackages) + @($allUsersPackages) | Sort-Object -Property PackageFullName -Unique
        }
        
        foreach ($pkg in $allPackages) {
            if (!$IncludeSystem -and $pkg.SignatureKind -eq 'System') { continue }
            
            $isBloat = Test-IsBloatware $pkg.Name
            $obj = [PSCustomObject]@{
                IsSelected          = $false
                Source              = "AppxPackage"
                Name                = $pkg.Name
                Version             = $pkg.Version
                Publisher           = $pkg.Publisher
                InstallLocation     = $pkg.InstallLocation
                PackageFullName     = $pkg.PackageFullName
                PackageFamilyName   = $pkg.PackageFamilyName
                Architecture        = $pkg.Architecture
                IsFramework         = $pkg.IsFramework
                Removable           = -not $pkg.NonRemovable
                SignatureKind       = $pkg.SignatureKind
                IsBloatware         = $isBloat
            }
            [void]$packages.Add($obj)
        }
    } catch {
        Write-Log "  Error: $_"
    }
    
    Write-Log "Appx scan complete: $($packages.Count) packages"
    return $packages
}

function Scan-Provisioned {
    Write-Log "=== Scanning Provisioned Packages ===" 
    
    $packages = [System.Collections.ArrayList]@()
    
    if (!$Script:IsAdmin) {
        Write-Log "  SKIPPED: Requires administrator privileges"
        return $packages
    }
    
    try {
        Write-Log "  Enumerating provisioned packages..."
        $provisioned = Get-AppxProvisionedPackage -Online -ErrorAction SilentlyContinue
        
        foreach ($pkg in $provisioned) {
            $isBloat = Test-IsBloatware $pkg.DisplayName
            $obj = [PSCustomObject]@{
                IsSelected      = $false
                Source          = "Provisioned"
                Name            = $pkg.DisplayName
                Version         = $pkg.Version
                PackageName     = $pkg.PackageName
                IsBloatware     = $isBloat
            }
            [void]$packages.Add($obj)
        }
        Write-Log "  Found $($packages.Count) provisioned packages"
    } catch {
        Write-Log "  Error: $_"
    }
    
    return $packages
}

function Scan-WinGet {
    Write-Log "=== Scanning WinGet Packages ===" 
    
    $packages = [System.Collections.ArrayList]@()
    
    $wingetPath = Get-Command winget -ErrorAction SilentlyContinue
    if (!$wingetPath) {
        Write-Log "  SKIPPED: WinGet not installed"
        return $packages
    }
    
    try {
        Write-Log "  Running winget list..."
        $wingetOutput = winget list --accept-source-agreements 2>$null | Out-String
        $lines = $wingetOutput -split "`n" | Where-Object { $_ -match '\S' }
        
        $dataStarted = $false
        $count = 0
        
        foreach ($line in $lines) {
            if ($line -match '^-+') { 
                $dataStarted = $true
                continue 
            }
            if (!$dataStarted) { continue }
            if ([string]::IsNullOrWhiteSpace($line)) { continue }
            
            $parts = $line -split '\s{2,}'
            if ($parts.Count -ge 2) {
                $name = $parts[0].Trim()
                $id = if ($parts.Count -ge 3) { $parts[1].Trim() } else { "" }
                $version = if ($parts.Count -ge 3) { $parts[2].Trim() } else { $parts[1].Trim() }
                
                $isBloat = Test-IsBloatware $name
                $obj = [PSCustomObject]@{
                    IsSelected  = $false
                    Source      = "WinGet"
                    Name        = $name
                    Id          = $id
                    Version     = $version
                    IsBloatware = $isBloat
                }
                [void]$packages.Add($obj)
                $count++
            }
        }
        Write-Log "  Found $count WinGet packages"
    } catch {
        Write-Log "  Error: $_"
    }
    
    return $packages
}

function Scan-Startup {
    Write-Log "=== Scanning Startup Programs ===" 
    
    $startup = [System.Collections.ArrayList]@()
    
    $registryPaths = @(
        @{ Path = "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Run"; Source = "HKLM Run" },
        @{ Path = "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\RunOnce"; Source = "HKLM RunOnce" },
        @{ Path = "HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Run"; Source = "HKCU Run" },
        @{ Path = "HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\RunOnce"; Source = "HKCU RunOnce" }
    )
    
    foreach ($reg in $registryPaths) {
        Write-Log "  Checking $($reg.Source)..."
        try {
            $items = Get-ItemProperty -Path $reg.Path -ErrorAction SilentlyContinue
            if ($items) {
                $props = $items.PSObject.Properties | Where-Object { $_.Name -notlike 'PS*' }
                foreach ($prop in $props) {
                    $isBloat = Test-IsBloatware $prop.Name
                    $obj = [PSCustomObject]@{
                        IsSelected    = $false
                        Name          = $prop.Name
                        Command       = $prop.Value
                        Source        = $reg.Source
                        Location      = $reg.Path
                        IsBloatware   = $isBloat
                    }
                    [void]$startup.Add($obj)
                }
            }
        } catch {
            Write-Log "    Error: $_"
        }
    }
    
    # Startup folders
    $startupFolders = @(
        @{ Path = "$env:APPDATA\Microsoft\Windows\Start Menu\Programs\Startup"; Source = "User Startup" },
        @{ Path = "$env:ProgramData\Microsoft\Windows\Start Menu\Programs\Startup"; Source = "All Users Startup" }
    )
    
    foreach ($folder in $startupFolders) {
        Write-Log "  Checking $($folder.Source) folder..."
        if (Test-Path $folder.Path) {
            $items = Get-ChildItem -Path $folder.Path -ErrorAction SilentlyContinue
            foreach ($item in $items) {
                $isBloat = Test-IsBloatware $item.BaseName
                $obj = [PSCustomObject]@{
                    IsSelected    = $false
                    Name          = $item.BaseName
                    Command       = $item.FullName
                    Source        = $folder.Source
                    Location      = $folder.Path
                    IsBloatware   = $isBloat
                }
                [void]$startup.Add($obj)
            }
        }
    }
    
    Write-Log "Startup scan complete: $($startup.Count) items"
    return $startup
}

function Scan-Services {
    Write-Log "=== Scanning Third-Party Services ===" 
    
    $services = [System.Collections.ArrayList]@()
    
    try {
        Write-Log "  Querying WMI for non-Microsoft services..."
        $allServices = Get-WmiObject -Class Win32_Service -ErrorAction SilentlyContinue |
                       Where-Object { 
                           $_.PathName -and 
                           $_.PathName -notlike "*\Windows\*" -and 
                           $_.PathName -notlike "*Microsoft*" -and
                           $_.PathName -notlike "*\system32\svchost*"
                       }
        
        foreach ($svc in $allServices) {
            $isBloat = Test-IsBloatware $svc.DisplayName
            $obj = [PSCustomObject]@{
                IsSelected     = $false
                Name           = $svc.Name
                DisplayName    = $svc.DisplayName
                State          = $svc.State
                StartMode      = $svc.StartMode
                PathName       = $svc.PathName
                IsBloatware    = $isBloat
            }
            [void]$services.Add($obj)
        }
        Write-Log "  Found $($services.Count) third-party services"
    } catch {
        Write-Log "  Error: $_"
    }
    
    return $services
}

function Scan-Tasks {
    Write-Log "=== Scanning Scheduled Tasks ===" 
    
    $tasks = [System.Collections.ArrayList]@()
    
    try {
        Write-Log "  Getting non-Windows scheduled tasks..."
        $allTasks = Get-ScheduledTask -ErrorAction SilentlyContinue | 
                    Where-Object { $_.State -ne 'Disabled' -and $_.TaskPath -notlike '\Microsoft\Windows\*' }
        
        foreach ($task in $allTasks) {
            $isBloat = Test-IsBloatware $task.TaskName
            $obj = [PSCustomObject]@{
                IsSelected  = $false
                Name        = $task.TaskName
                Path        = $task.TaskPath
                State       = $task.State
                Author      = $task.Author
                Description = $task.Description
                IsBloatware = $isBloat
            }
            [void]$tasks.Add($obj)
        }
        Write-Log "  Found $($tasks.Count) scheduled tasks"
    } catch {
        Write-Log "  Error: $_"
    }
    
    return $tasks
}

# ============================================================================
# EXPORT FUNCTIONS
# ============================================================================

function Export-CurrentTab {
    $selectedTab = $tabResults.SelectedItem
    $tabName = $selectedTab.Header
    
    $grid = switch ($tabName) {
        "Registry Software" { $gridRegistry }
        "Appx Packages" { $gridAppx }
        "Provisioned" { $gridProvisioned }
        "WinGet" { $gridWinGet }
        "Startup" { $gridStartup }
        "Services" { $gridServices }
        "Tasks" { $gridTasks }
        default { $null }
    }
    
    if (!$grid -or !$grid.ItemsSource) {
        [System.Windows.MessageBox]::Show("No data to export.", "Export", "OK", "Warning")
        return
    }
    
    $saveDialog = New-Object System.Windows.Forms.SaveFileDialog
    $saveDialog.Filter = "CSV Files (*.csv)|*.csv"
    $tabNameClean = $tabName -replace ' ', ''
    $saveDialog.FileName = "${tabNameClean}_$(Get-Date -Format 'yyyyMMdd_HHmmss').csv"
    $saveDialog.InitialDirectory = [Environment]::GetFolderPath("Desktop")
    
    if ($saveDialog.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) {
        $grid.ItemsSource | Export-Csv -Path $saveDialog.FileName -NoTypeInformation -Encoding UTF8
        Write-Log "Exported $tabName to $($saveDialog.FileName)"
        [System.Windows.MessageBox]::Show("Exported to:`n$($saveDialog.FileName)", "Export Complete", "OK", "Information")
    }
}

function Export-AllData {
    $folderDialog = New-Object System.Windows.Forms.FolderBrowserDialog
    $folderDialog.Description = "Select folder for export"
    $folderDialog.SelectedPath = [Environment]::GetFolderPath("Desktop")
    
    if ($folderDialog.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) {
        $basePath = $folderDialog.SelectedPath
        $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
        $exportPath = Join-Path $basePath "SoftwareScan_$timestamp"
        New-Item -ItemType Directory -Path $exportPath -Force | Out-Null
        
        Write-Log "Exporting all data to $exportPath..."
        
        if ($Script:ScanData.Registry.Count -gt 0) {
            $Script:ScanData.Registry | Export-Csv "$exportPath\Registry.csv" -NoTypeInformation -Encoding UTF8
        }
        if ($Script:ScanData.Appx.Count -gt 0) {
            $Script:ScanData.Appx | Export-Csv "$exportPath\Appx.csv" -NoTypeInformation -Encoding UTF8
        }
        if ($Script:ScanData.Provisioned.Count -gt 0) {
            $Script:ScanData.Provisioned | Export-Csv "$exportPath\Provisioned.csv" -NoTypeInformation -Encoding UTF8
        }
        if ($Script:ScanData.WinGet.Count -gt 0) {
            $Script:ScanData.WinGet | Export-Csv "$exportPath\WinGet.csv" -NoTypeInformation -Encoding UTF8
        }
        if ($Script:ScanData.Startup.Count -gt 0) {
            $Script:ScanData.Startup | Export-Csv "$exportPath\Startup.csv" -NoTypeInformation -Encoding UTF8
        }
        if ($Script:ScanData.Services.Count -gt 0) {
            $Script:ScanData.Services | Export-Csv "$exportPath\Services.csv" -NoTypeInformation -Encoding UTF8
        }
        if ($Script:ScanData.Tasks.Count -gt 0) {
            $Script:ScanData.Tasks | Export-Csv "$exportPath\Tasks.csv" -NoTypeInformation -Encoding UTF8
        }
        
        Write-Log "Export complete!"
        [System.Windows.MessageBox]::Show("All data exported to:`n$exportPath", "Export Complete", "OK", "Information")
    }
}

function Export-DebloatScript {
    $saveDialog = New-Object System.Windows.Forms.SaveFileDialog
    $saveDialog.Filter = "PowerShell Scripts (*.ps1)|*.ps1"
    $saveDialog.FileName = "DebloatCommands_$(Get-Date -Format 'yyyyMMdd_HHmmss').ps1"
    $saveDialog.InitialDirectory = [Environment]::GetFolderPath("Desktop")
    
    if ($saveDialog.ShowDialog() -ne [System.Windows.Forms.DialogResult]::OK) { return }
    
    $sb = [System.Text.StringBuilder]::new()
    [void]$sb.AppendLine("#===============================================================================")
    [void]$sb.AppendLine("# DEBLOAT SCRIPT - Generated $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')")
    [void]$sb.AppendLine("# Review carefully before executing!")
    [void]$sb.AppendLine("#===============================================================================")
    [void]$sb.AppendLine("")
    [void]$sb.AppendLine("#Requires -RunAsAdministrator")
    [void]$sb.AppendLine("")
    
    # Appx packages
    $bloatAppx = $Script:ScanData.Appx | Where-Object { $_.IsBloatware -and !$_.IsFramework }
    if ($bloatAppx.Count -gt 0) {
        [void]$sb.AppendLine("#region Remove Appx Packages")
        [void]$sb.AppendLine('$AppxToRemove = @(')
        foreach ($pkg in $bloatAppx) {
            [void]$sb.AppendLine("    `"$($pkg.Name)`"")
        }
        [void]$sb.AppendLine(')')
        [void]$sb.AppendLine('')
        [void]$sb.AppendLine('foreach ($app in $AppxToRemove) {')
        [void]$sb.AppendLine('    Write-Host "Removing $app..." -ForegroundColor Yellow')
        [void]$sb.AppendLine('    Get-AppxPackage -Name $app -AllUsers -EA SilentlyContinue | Remove-AppxPackage -EA SilentlyContinue')
        [void]$sb.AppendLine('    Get-AppxProvisionedPackage -Online | Where-Object DisplayName -eq $app | Remove-AppxProvisionedPackage -Online -EA SilentlyContinue')
        [void]$sb.AppendLine('}')
        [void]$sb.AppendLine('#endregion')
        [void]$sb.AppendLine('')
    }
    
    # Provisioned packages
    $bloatProv = $Script:ScanData.Provisioned | Where-Object { $_.IsBloatware }
    if ($bloatProv.Count -gt 0) {
        [void]$sb.AppendLine("#region Remove Provisioned Packages")
        [void]$sb.AppendLine('$ProvisionedToRemove = @(')
        foreach ($pkg in $bloatProv) {
            [void]$sb.AppendLine("    `"$($pkg.Name)`"")
        }
        [void]$sb.AppendLine(')')
        [void]$sb.AppendLine('')
        [void]$sb.AppendLine('foreach ($app in $ProvisionedToRemove) {')
        [void]$sb.AppendLine('    Write-Host "Removing provisioned: $app..." -ForegroundColor Yellow')
        [void]$sb.AppendLine('    Get-AppxProvisionedPackage -Online | Where-Object DisplayName -eq $app | Remove-AppxProvisionedPackage -Online -AllUsers -EA SilentlyContinue')
        [void]$sb.AppendLine('}')
        [void]$sb.AppendLine('#endregion')
        [void]$sb.AppendLine('')
    }
    
    [void]$sb.AppendLine('Write-Host "`nDebloat complete!" -ForegroundColor Green')
    
    $sb.ToString() | Out-File -FilePath $saveDialog.FileName -Encoding UTF8
    
    Write-Log "Debloat script exported to $($saveDialog.FileName)"
    [System.Windows.MessageBox]::Show("Debloat script exported to:`n$($saveDialog.FileName)", "Export Complete", "OK", "Information")
}

function Copy-RemovalCommands {
    $selectedTab = $tabResults.SelectedItem
    $tabName = $selectedTab.Header
    
    $commands = @()
    
    switch ($tabName) {
        "Appx Packages" {
            $selected = $gridAppx.ItemsSource | Where-Object { $_.IsSelected -or $_.IsBloatware }
            foreach ($item in $selected) {
                $commands += "Get-AppxPackage -Name '$($item.Name)' -AllUsers | Remove-AppxPackage"
            }
        }
        "Provisioned" {
            $selected = $gridProvisioned.ItemsSource | Where-Object { $_.IsSelected -or $_.IsBloatware }
            foreach ($item in $selected) {
                $commands += "Get-AppxProvisionedPackage -Online | Where-Object DisplayName -eq '$($item.Name)' | Remove-AppxProvisionedPackage -Online -AllUsers"
            }
        }
        "WinGet" {
            $selected = $gridWinGet.ItemsSource | Where-Object { $_.IsSelected -or $_.IsBloatware }
            foreach ($item in $selected) {
                if ($item.Id) {
                    $commands += "winget uninstall --id '$($item.Id)' --silent"
                }
            }
        }
        "Services" {
            $selected = $gridServices.ItemsSource | Where-Object { $_.IsSelected -or $_.IsBloatware }
            foreach ($item in $selected) {
                $commands += "Stop-Service -Name '$($item.Name)' -Force; Set-Service -Name '$($item.Name)' -StartupType Disabled"
            }
        }
        default {
            [System.Windows.MessageBox]::Show("Select Appx, Provisioned, WinGet, or Services tab for removal commands.", "Info", "OK", "Information")
            return
        }
    }
    
    if ($commands.Count -gt 0) {
        $commands -join "`r`n" | Set-Clipboard
        Write-Log "Copied $($commands.Count) removal commands to clipboard"
        [System.Windows.MessageBox]::Show("$($commands.Count) removal commands copied to clipboard!", "Copied", "OK", "Information")
    } else {
        [System.Windows.MessageBox]::Show("No items selected or flagged as bloatware.", "Info", "OK", "Information")
    }
}

# ============================================================================
# EVENT HANDLERS
# ============================================================================

$btnScan.Add_Click({
    $btnScan.IsEnabled = $false
    Update-Status "Scanning..."
    $txtLog.Clear()
    
    Write-Log "=========================================="
    Write-Log "SOFTWARE SCAN STARTED"
    Write-Log "Computer: $env:COMPUTERNAME"
    Write-Log "User: $env:USERNAME"
    Write-Log "Admin: $Script:IsAdmin"
    Write-Log "=========================================="
    
    try {
        $Script:ScanData.Registry = Scan-Registry
        Refresh-Grid "gridRegistry" $Script:ScanData.Registry
        
        $Script:ScanData.Appx = Scan-Appx -IncludeSystem $chkSystemApps.IsChecked
        Refresh-Grid "gridAppx" $Script:ScanData.Appx
        
        $Script:ScanData.Provisioned = Scan-Provisioned
        Refresh-Grid "gridProvisioned" $Script:ScanData.Provisioned
        
        $Script:ScanData.WinGet = Scan-WinGet
        Refresh-Grid "gridWinGet" $Script:ScanData.WinGet
        
        if ($chkStartup.IsChecked) {
            $Script:ScanData.Startup = Scan-Startup
            Refresh-Grid "gridStartup" $Script:ScanData.Startup
        }
        
        if ($chkServices.IsChecked) {
            $Script:ScanData.Services = Scan-Services
            Refresh-Grid "gridServices" $Script:ScanData.Services
        }
        
        if ($chkTasks.IsChecked) {
            $Script:ScanData.Tasks = Scan-Tasks
            Refresh-Grid "gridTasks" $Script:ScanData.Tasks
        }
        
        Write-Log "=========================================="
        Write-Log "SCAN COMPLETE"
        Write-Log "=========================================="
        
        Update-Stats
        Update-Status "Scan Complete"
    } catch {
        Write-Log "ERROR: $_"
        Update-Status "Error"
    } finally {
        $btnScan.IsEnabled = $true
    }
})

$btnClearLog.Add_Click({
    $txtLog.Clear()
})

$btnExportCurrentCSV.Add_Click({
    Export-CurrentTab
})

$btnExportAllCSV.Add_Click({
    Export-AllData
})

$btnExportDebloat.Add_Click({
    Export-DebloatScript
})

$btnExportSelected.Add_Click({
    $selectedTab = $tabResults.SelectedItem
    $tabName = $selectedTab.Header
    
    $grid = switch ($tabName) {
        "Registry Software" { $gridRegistry }
        "Appx Packages" { $gridAppx }
        "Provisioned" { $gridProvisioned }
        "WinGet" { $gridWinGet }
        "Startup" { $gridStartup }
        "Services" { $gridServices }
        "Tasks" { $gridTasks }
        default { $null }
    }
    
    if (!$grid -or !$grid.ItemsSource) {
        [System.Windows.MessageBox]::Show("No data to export.", "Export", "OK", "Warning")
        return
    }
    
    $flagged = $grid.ItemsSource | Where-Object { $_.IsBloatware -or $_.IsSelected }
    
    if ($flagged.Count -eq 0) {
        [System.Windows.MessageBox]::Show("No items flagged or selected.", "Export", "OK", "Information")
        return
    }
    
    $saveDialog = New-Object System.Windows.Forms.SaveFileDialog
    $saveDialog.Filter = "CSV Files (*.csv)|*.csv"
    $tabNameClean = $tabName -replace ' ', ''
    $saveDialog.FileName = "${tabNameClean}_Flagged_$(Get-Date -Format 'yyyyMMdd_HHmmss').csv"
    $saveDialog.InitialDirectory = [Environment]::GetFolderPath("Desktop")
    
    if ($saveDialog.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) {
        $flagged | Export-Csv -Path $saveDialog.FileName -NoTypeInformation -Encoding UTF8
        Write-Log "Exported $($flagged.Count) flagged items to $($saveDialog.FileName)"
        [System.Windows.MessageBox]::Show("Exported $($flagged.Count) items to:`n$($saveDialog.FileName)", "Export Complete", "OK", "Information")
    }
})

$btnCopyCommands.Add_Click({
    Copy-RemovalCommands
})

$chkBloatOnly.Add_Checked({
    Refresh-AllGrids
})

$chkBloatOnly.Add_Unchecked({
    Refresh-AllGrids
})

# ============================================================================
# INITIALIZATION
# ============================================================================

# Check admin status
if ($Script:IsAdmin) {
    $txtAdminStatus.Text = "Running as Administrator"
    $txtAdminStatus.Foreground = [System.Windows.Media.Brushes]::LightGreen
} else {
    $txtAdminStatus.Text = "Limited mode - Run as Admin for full scan"
    $txtAdminStatus.Foreground = [System.Windows.Media.Brushes]::Orange
}

Write-Log "Software Scanner GUI initialized"
Write-Log "Click 'Start Full Scan' to begin"

# Show window
$Window.ShowDialog() | Out-Null
