<#
.SYNOPSIS
    FirewallManager - Windows Firewall Rule Backup, Edit, and Restore Tool
.DESCRIPTION
    A professional GUI application for backing up, editing, and restoring Windows Firewall rules.
.NOTES
    Author: Matt
    Version: 1.0
    Requires: Administrator privileges
#>

# ============================================================
# Error Handling Wrapper
# ============================================================
$ErrorActionPreference = "Stop"

try {
    # Check for admin rights
    $isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
    if (-not $isAdmin) {
        throw "This script requires Administrator privileges. Please right-click and 'Run as Administrator'."
    }
    
    Write-Host "Loading assemblies..." -ForegroundColor Cyan
    Add-Type -AssemblyName PresentationFramework
    Write-Host "  - PresentationFramework OK" -ForegroundColor Gray
    Add-Type -AssemblyName PresentationCore
    Write-Host "  - PresentationCore OK" -ForegroundColor Gray
    Add-Type -AssemblyName WindowsBase
    Write-Host "  - WindowsBase OK" -ForegroundColor Gray
    Add-Type -AssemblyName System.Windows.Forms
    Write-Host "  - System.Windows.Forms OK" -ForegroundColor Gray
    Write-Host "All assemblies loaded successfully.`n" -ForegroundColor Green

# ============================================================
# XAML GUI Definition
# ============================================================
[xml]$XAML = @"
<Window xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
        xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
        Title="FirewallManager v1.0" 
        Height="700" Width="1000"
        WindowStartupLocation="CenterScreen"
        Background="#1E1E1E"
        ResizeMode="CanResizeWithGrip">
    <Window.Resources>
        <Style TargetType="Button">
            <Setter Property="Background" Value="#0078D4"/>
            <Setter Property="Foreground" Value="White"/>
            <Setter Property="BorderThickness" Value="0"/>
            <Setter Property="Padding" Value="15,8"/>
            <Setter Property="Margin" Value="5"/>
            <Setter Property="Cursor" Value="Hand"/>
            <Setter Property="FontSize" Value="13"/>
            <Setter Property="Template">
                <Setter.Value>
                    <ControlTemplate TargetType="Button">
                        <Border Background="{TemplateBinding Background}" 
                                CornerRadius="4" 
                                Padding="{TemplateBinding Padding}">
                            <ContentPresenter HorizontalAlignment="Center" VerticalAlignment="Center"/>
                        </Border>
                        <ControlTemplate.Triggers>
                            <Trigger Property="IsMouseOver" Value="True">
                                <Setter Property="Background" Value="#1084D9"/>
                            </Trigger>
                            <Trigger Property="IsPressed" Value="True">
                                <Setter Property="Background" Value="#006CBE"/>
                            </Trigger>
                            <Trigger Property="IsEnabled" Value="False">
                                <Setter Property="Background" Value="#555555"/>
                                <Setter Property="Foreground" Value="#888888"/>
                            </Trigger>
                        </ControlTemplate.Triggers>
                    </ControlTemplate>
                </Setter.Value>
            </Setter>
        </Style>
        <Style x:Key="DangerButton" TargetType="Button">
            <Setter Property="Background" Value="#D32F2F"/>
            <Setter Property="Foreground" Value="White"/>
            <Setter Property="BorderThickness" Value="0"/>
            <Setter Property="Padding" Value="15,8"/>
            <Setter Property="Margin" Value="5"/>
            <Setter Property="Cursor" Value="Hand"/>
            <Setter Property="FontSize" Value="13"/>
            <Setter Property="Template">
                <Setter.Value>
                    <ControlTemplate TargetType="Button">
                        <Border Background="{TemplateBinding Background}" 
                                CornerRadius="4" 
                                Padding="{TemplateBinding Padding}">
                            <ContentPresenter HorizontalAlignment="Center" VerticalAlignment="Center"/>
                        </Border>
                        <ControlTemplate.Triggers>
                            <Trigger Property="IsMouseOver" Value="True">
                                <Setter Property="Background" Value="#E53935"/>
                            </Trigger>
                            <Trigger Property="IsPressed" Value="True">
                                <Setter Property="Background" Value="#B71C1C"/>
                            </Trigger>
                        </ControlTemplate.Triggers>
                    </ControlTemplate>
                </Setter.Value>
            </Setter>
        </Style>
        <Style x:Key="SuccessButton" TargetType="Button">
            <Setter Property="Background" Value="#388E3C"/>
            <Setter Property="Foreground" Value="White"/>
            <Setter Property="BorderThickness" Value="0"/>
            <Setter Property="Padding" Value="15,8"/>
            <Setter Property="Margin" Value="5"/>
            <Setter Property="Cursor" Value="Hand"/>
            <Setter Property="FontSize" Value="13"/>
            <Setter Property="Template">
                <Setter.Value>
                    <ControlTemplate TargetType="Button">
                        <Border Background="{TemplateBinding Background}" 
                                CornerRadius="4" 
                                Padding="{TemplateBinding Padding}">
                            <ContentPresenter HorizontalAlignment="Center" VerticalAlignment="Center"/>
                        </Border>
                        <ControlTemplate.Triggers>
                            <Trigger Property="IsMouseOver" Value="True">
                                <Setter Property="Background" Value="#43A047"/>
                            </Trigger>
                            <Trigger Property="IsPressed" Value="True">
                                <Setter Property="Background" Value="#2E7D32"/>
                            </Trigger>
                        </ControlTemplate.Triggers>
                    </ControlTemplate>
                </Setter.Value>
            </Setter>
        </Style>
        <Style TargetType="DataGrid">
            <Setter Property="Background" Value="#252526"/>
            <Setter Property="Foreground" Value="#E0E0E0"/>
            <Setter Property="BorderBrush" Value="#3C3C3C"/>
            <Setter Property="RowBackground" Value="#2D2D30"/>
            <Setter Property="AlternatingRowBackground" Value="#252526"/>
            <Setter Property="GridLinesVisibility" Value="Horizontal"/>
            <Setter Property="HorizontalGridLinesBrush" Value="#3C3C3C"/>
            <Setter Property="HeadersVisibility" Value="Column"/>
        </Style>
        <Style TargetType="DataGridColumnHeader">
            <Setter Property="Background" Value="#3C3C3C"/>
            <Setter Property="Foreground" Value="#FFFFFF"/>
            <Setter Property="Padding" Value="10,8"/>
            <Setter Property="BorderBrush" Value="#4C4C4C"/>
            <Setter Property="BorderThickness" Value="0,0,1,0"/>
            <Setter Property="FontWeight" Value="SemiBold"/>
        </Style>
        <Style TargetType="DataGridCell">
            <Setter Property="Padding" Value="8,5"/>
            <Setter Property="BorderThickness" Value="0"/>
            <Setter Property="FocusVisualStyle" Value="{x:Null}"/>
            <Style.Triggers>
                <Trigger Property="IsSelected" Value="True">
                    <Setter Property="Background" Value="#0078D4"/>
                    <Setter Property="Foreground" Value="White"/>
                </Trigger>
            </Style.Triggers>
        </Style>
        <Style TargetType="TextBox">
            <Setter Property="Background" Value="#3C3C3C"/>
            <Setter Property="Foreground" Value="#E0E0E0"/>
            <Setter Property="BorderBrush" Value="#555555"/>
            <Setter Property="Padding" Value="8,6"/>
            <Setter Property="FontSize" Value="13"/>
        </Style>
        <SolidColorBrush x:Key="ComboBoxBackground" Color="#3C3C3C"/>
        <SolidColorBrush x:Key="ComboBoxBorder" Color="#555555"/>
        <SolidColorBrush x:Key="ComboBoxForeground" Color="#E0E0E0"/>
        <SolidColorBrush x:Key="ComboBoxHoverBackground" Color="#4A4A4A"/>
        <SolidColorBrush x:Key="ComboBoxDropdownBackground" Color="#2D2D30"/>
        <SolidColorBrush x:Key="ComboBoxItemHover" Color="#3E3E42"/>
        <SolidColorBrush x:Key="ComboBoxItemSelected" Color="#0078D4"/>
        
        <ControlTemplate x:Key="ComboBoxToggleButton" TargetType="ToggleButton">
            <Grid>
                <Grid.ColumnDefinitions>
                    <ColumnDefinition/>
                    <ColumnDefinition Width="30"/>
                </Grid.ColumnDefinitions>
                <Border x:Name="Border" Grid.ColumnSpan="2" Background="{StaticResource ComboBoxBackground}" 
                        BorderBrush="{StaticResource ComboBoxBorder}" BorderThickness="1" CornerRadius="3"/>
                <Border Grid.Column="0" Background="Transparent" Margin="1"/>
                <Path x:Name="Arrow" Grid.Column="1" Fill="#E0E0E0" HorizontalAlignment="Center" 
                      VerticalAlignment="Center" Data="M 0 0 L 6 6 L 12 0 Z"/>
            </Grid>
            <ControlTemplate.Triggers>
                <Trigger Property="IsMouseOver" Value="True">
                    <Setter TargetName="Border" Property="Background" Value="{StaticResource ComboBoxHoverBackground}"/>
                </Trigger>
                <Trigger Property="IsChecked" Value="True">
                    <Setter TargetName="Border" Property="Background" Value="{StaticResource ComboBoxHoverBackground}"/>
                </Trigger>
            </ControlTemplate.Triggers>
        </ControlTemplate>
        
        <ControlTemplate x:Key="ComboBoxTextBox" TargetType="TextBox">
            <Border x:Name="PART_ContentHost" Focusable="False" Background="Transparent"/>
        </ControlTemplate>
        
        <Style TargetType="ComboBoxItem">
            <Setter Property="Background" Value="Transparent"/>
            <Setter Property="Foreground" Value="#E0E0E0"/>
            <Setter Property="Padding" Value="10,6"/>
            <Setter Property="BorderThickness" Value="0"/>
            <Setter Property="Template">
                <Setter.Value>
                    <ControlTemplate TargetType="ComboBoxItem">
                        <Border x:Name="Border" Background="{TemplateBinding Background}" 
                                Padding="{TemplateBinding Padding}" BorderThickness="0">
                            <ContentPresenter/>
                        </Border>
                        <ControlTemplate.Triggers>
                            <Trigger Property="IsHighlighted" Value="True">
                                <Setter TargetName="Border" Property="Background" Value="{StaticResource ComboBoxItemHover}"/>
                            </Trigger>
                            <Trigger Property="IsSelected" Value="True">
                                <Setter TargetName="Border" Property="Background" Value="{StaticResource ComboBoxItemSelected}"/>
                                <Setter Property="Foreground" Value="White"/>
                            </Trigger>
                        </ControlTemplate.Triggers>
                    </ControlTemplate>
                </Setter.Value>
            </Setter>
        </Style>
        
        <Style TargetType="ComboBox">
            <Setter Property="Background" Value="{StaticResource ComboBoxBackground}"/>
            <Setter Property="Foreground" Value="{StaticResource ComboBoxForeground}"/>
            <Setter Property="BorderBrush" Value="{StaticResource ComboBoxBorder}"/>
            <Setter Property="BorderThickness" Value="1"/>
            <Setter Property="Padding" Value="8,6"/>
            <Setter Property="FontSize" Value="13"/>
            <Setter Property="SnapsToDevicePixels" Value="True"/>
            <Setter Property="ScrollViewer.HorizontalScrollBarVisibility" Value="Auto"/>
            <Setter Property="ScrollViewer.VerticalScrollBarVisibility" Value="Auto"/>
            <Setter Property="ScrollViewer.CanContentScroll" Value="True"/>
            <Setter Property="Template">
                <Setter.Value>
                    <ControlTemplate TargetType="ComboBox">
                        <Grid>
                            <ToggleButton Name="ToggleButton" Template="{StaticResource ComboBoxToggleButton}" 
                                          Grid.Column="2" Focusable="False" 
                                          IsChecked="{Binding Path=IsDropDownOpen, Mode=TwoWay, RelativeSource={RelativeSource TemplatedParent}}" 
                                          ClickMode="Press"/>
                            <ContentPresenter Name="ContentSite" IsHitTestVisible="False" 
                                              Content="{TemplateBinding SelectionBoxItem}" 
                                              ContentTemplate="{TemplateBinding SelectionBoxItemTemplate}" 
                                              ContentTemplateSelector="{TemplateBinding ItemTemplateSelector}" 
                                              Margin="10,3,30,3" VerticalAlignment="Center" HorizontalAlignment="Left"/>
                            <Popup Name="Popup" Placement="Bottom" IsOpen="{TemplateBinding IsDropDownOpen}" 
                                   AllowsTransparency="True" Focusable="False" PopupAnimation="Slide">
                                <Grid Name="DropDown" SnapsToDevicePixels="True" 
                                      MinWidth="{TemplateBinding ActualWidth}" MaxHeight="{TemplateBinding MaxDropDownHeight}">
                                    <Border x:Name="DropDownBorder" Background="{StaticResource ComboBoxDropdownBackground}" 
                                            BorderThickness="1" BorderBrush="{StaticResource ComboBoxBorder}" CornerRadius="3">
                                        <ScrollViewer Margin="4,6,4,6" SnapsToDevicePixels="True">
                                            <StackPanel IsItemsHost="True" KeyboardNavigation.DirectionalNavigation="Contained"/>
                                        </ScrollViewer>
                                    </Border>
                                </Grid>
                            </Popup>
                        </Grid>
                    </ControlTemplate>
                </Setter.Value>
            </Setter>
        </Style>
        <Style TargetType="Label">
            <Setter Property="Foreground" Value="#B0B0B0"/>
            <Setter Property="FontSize" Value="13"/>
        </Style>
        <Style TargetType="CheckBox">
            <Setter Property="Foreground" Value="#E0E0E0"/>
            <Setter Property="FontSize" Value="13"/>
        </Style>
    </Window.Resources>
    
    <Grid Margin="15">
        <Grid.RowDefinitions>
            <RowDefinition Height="Auto"/>
            <RowDefinition Height="Auto"/>
            <RowDefinition Height="*"/>
            <RowDefinition Height="Auto"/>
            <RowDefinition Height="Auto"/>
        </Grid.RowDefinitions>
        
        <!-- Header -->
        <StackPanel Grid.Row="0" Margin="0,0,0,15">
            <TextBlock Text="FirewallManager" FontSize="28" FontWeight="Bold" Foreground="#0078D4"/>
            <TextBlock Text="Backup, Edit, and Restore Windows Firewall Rules" FontSize="14" Foreground="#808080"/>
        </StackPanel>
        
        <!-- Action Buttons -->
        <WrapPanel Grid.Row="1" Margin="0,0,0,15">
            <Button x:Name="btnBackup" Content="Backup Rules" Width="140"/>
            <Button x:Name="btnRestore" Content="Restore Rules" Style="{StaticResource SuccessButton}" Width="140"/>
            <Button x:Name="btnRefresh" Content="Refresh List" Width="140"/>
            <Button x:Name="btnExportCSV" Content="Export to CSV" Width="140"/>
            <TextBox x:Name="txtSearch" Width="250" Margin="20,5,5,5" 
                     ToolTip="Search rules by name, program, or port"/>
            <Button x:Name="btnSearch" Content="Search" Width="80"/>
            <Button x:Name="btnClearSearch" Content="Clear" Width="80"/>
        </WrapPanel>
        
        <!-- Rules DataGrid -->
        <DataGrid x:Name="dgRules" Grid.Row="2" 
                  AutoGenerateColumns="False" 
                  IsReadOnly="True"
                  SelectionMode="Extended"
                  CanUserAddRows="False"
                  CanUserDeleteRows="False"
                  CanUserReorderColumns="True"
                  CanUserSortColumns="True"
                  VirtualizingPanel.IsVirtualizing="True"
                  VirtualizingPanel.VirtualizationMode="Recycling">
            <DataGrid.Columns>
                <DataGridTextColumn Header="Name" Binding="{Binding DisplayName}" Width="200"/>
                <DataGridTextColumn Header="Direction" Binding="{Binding Direction}" Width="80"/>
                <DataGridTextColumn Header="Action" Binding="{Binding Action}" Width="70"/>
                <DataGridTextColumn Header="Enabled" Binding="{Binding Enabled}" Width="70"/>
                <DataGridTextColumn Header="Profile" Binding="{Binding Profile}" Width="100"/>
                <DataGridTextColumn Header="Protocol" Binding="{Binding Protocol}" Width="80"/>
                <DataGridTextColumn Header="Local Port" Binding="{Binding LocalPort}" Width="100"/>
                <DataGridTextColumn Header="Remote Port" Binding="{Binding RemotePort}" Width="100"/>
                <DataGridTextColumn Header="Program" Binding="{Binding Program}" Width="250"/>
            </DataGrid.Columns>
        </DataGrid>
        
        <!-- Edit Panel -->
        <GroupBox Grid.Row="3" Header="Edit Selected Rule" Margin="0,15,0,0" 
                  Foreground="#B0B0B0" BorderBrush="#3C3C3C">
            <Grid Margin="10">
                <Grid.ColumnDefinitions>
                    <ColumnDefinition Width="*"/>
                    <ColumnDefinition Width="*"/>
                    <ColumnDefinition Width="*"/>
                    <ColumnDefinition Width="*"/>
                    <ColumnDefinition Width="Auto"/>
                </Grid.ColumnDefinitions>
                <Grid.RowDefinitions>
                    <RowDefinition Height="Auto"/>
                    <RowDefinition Height="Auto"/>
                </Grid.RowDefinitions>
                
                <StackPanel Grid.Column="0" Grid.Row="0" Margin="5">
                    <Label Content="Enabled"/>
                    <ComboBox x:Name="cmbEnabled">
                        <ComboBoxItem Content="True" IsSelected="True"/>
                        <ComboBoxItem Content="False"/>
                    </ComboBox>
                </StackPanel>
                
                <StackPanel Grid.Column="1" Grid.Row="0" Margin="5">
                    <Label Content="Action"/>
                    <ComboBox x:Name="cmbAction">
                        <ComboBoxItem Content="Allow"/>
                        <ComboBoxItem Content="Block"/>
                    </ComboBox>
                </StackPanel>
                
                <StackPanel Grid.Column="2" Grid.Row="0" Margin="5">
                    <Label Content="Direction"/>
                    <ComboBox x:Name="cmbDirection">
                        <ComboBoxItem Content="Inbound"/>
                        <ComboBoxItem Content="Outbound"/>
                    </ComboBox>
                </StackPanel>
                
                <StackPanel Grid.Column="3" Grid.Row="0" Margin="5">
                    <Label Content="Profile"/>
                    <ComboBox x:Name="cmbProfile">
                        <ComboBoxItem Content="Any"/>
                        <ComboBoxItem Content="Domain"/>
                        <ComboBoxItem Content="Private"/>
                        <ComboBoxItem Content="Public"/>
                        <ComboBoxItem Content="Domain, Private"/>
                        <ComboBoxItem Content="Domain, Public"/>
                        <ComboBoxItem Content="Private, Public"/>
                    </ComboBox>
                </StackPanel>
                
                <StackPanel Grid.Column="0" Grid.Row="1" Margin="5">
                    <Label Content="Protocol"/>
                    <ComboBox x:Name="cmbProtocol">
                        <ComboBoxItem Content="Any"/>
                        <ComboBoxItem Content="TCP"/>
                        <ComboBoxItem Content="UDP"/>
                        <ComboBoxItem Content="ICMPv4"/>
                        <ComboBoxItem Content="ICMPv6"/>
                    </ComboBox>
                </StackPanel>
                
                <StackPanel Grid.Column="1" Grid.Row="1" Margin="5">
                    <Label Content="Local Port"/>
                    <TextBox x:Name="txtLocalPort"/>
                </StackPanel>
                
                <StackPanel Grid.Column="2" Grid.Row="1" Margin="5">
                    <Label Content="Remote Port"/>
                    <TextBox x:Name="txtRemotePort"/>
                </StackPanel>
                
                <StackPanel Grid.Column="3" Grid.Row="1" Grid.ColumnSpan="2" Margin="5" Orientation="Horizontal" 
                            VerticalAlignment="Bottom">
                    <Button x:Name="btnApplyEdit" Content="Apply Changes" Style="{StaticResource SuccessButton}"/>
                    <Button x:Name="btnDeleteRule" Content="Delete Rule" Style="{StaticResource DangerButton}"/>
                </StackPanel>
            </Grid>
        </GroupBox>
        
        <!-- Status Bar -->
        <Border Grid.Row="4" Background="#252526" Margin="0,15,0,0" Padding="10,8" CornerRadius="4">
            <Grid>
                <Grid.ColumnDefinitions>
                    <ColumnDefinition Width="*"/>
                    <ColumnDefinition Width="Auto"/>
                </Grid.ColumnDefinitions>
                <TextBlock x:Name="txtStatus" Text="Loading firewall rules, please wait..." Foreground="#FFA500" VerticalAlignment="Center"/>
                <TextBlock x:Name="txtRuleCount" Grid.Column="1" Text="Rules: 0" Foreground="#808080" VerticalAlignment="Center"/>
            </Grid>
        </Border>
    </Grid>
</Window>
"@

# ============================================================
# Load XAML
# ============================================================
Write-Host "Parsing XAML interface..." -ForegroundColor Cyan
$Reader = New-Object System.Xml.XmlNodeReader $XAML
$Window = [Windows.Markup.XamlReader]::Load($Reader)
Write-Host "  - XAML parsed successfully" -ForegroundColor Gray

Write-Host "Binding controls..." -ForegroundColor Cyan
# Get controls
$btnBackup = $Window.FindName("btnBackup")
$btnRestore = $Window.FindName("btnRestore")
$btnRefresh = $Window.FindName("btnRefresh")
$btnExportCSV = $Window.FindName("btnExportCSV")
$btnSearch = $Window.FindName("btnSearch")
$btnClearSearch = $Window.FindName("btnClearSearch")
$btnApplyEdit = $Window.FindName("btnApplyEdit")
$btnDeleteRule = $Window.FindName("btnDeleteRule")
$txtSearch = $Window.FindName("txtSearch")
$txtStatus = $Window.FindName("txtStatus")
$txtRuleCount = $Window.FindName("txtRuleCount")
$dgRules = $Window.FindName("dgRules")
$cmbEnabled = $Window.FindName("cmbEnabled")
$cmbAction = $Window.FindName("cmbAction")
$cmbDirection = $Window.FindName("cmbDirection")
$cmbProfile = $Window.FindName("cmbProfile")
$cmbProtocol = $Window.FindName("cmbProtocol")
$txtLocalPort = $Window.FindName("txtLocalPort")
$txtRemotePort = $Window.FindName("txtRemotePort")

# Global variables
$Script:AllRules = @()
$Script:BackupFolder = Join-Path $env:USERPROFILE "FirewallBackups"
Write-Host "  - Controls bound successfully`n" -ForegroundColor Gray

# ============================================================
# Functions
# ============================================================
function Update-Status {
    param([string]$Message, [string]$Color = "#808080")
    $txtStatus.Text = $Message
    $txtStatus.Foreground = $Color
    $Window.Dispatcher.Invoke([Action]{}, [System.Windows.Threading.DispatcherPriority]::Background)
}

function Get-FirewallRules {
    Update-Status "Loading firewall rules... (this may take a moment)" "#FFA500"
    $Window.Dispatcher.Invoke([Action]{}, [System.Windows.Threading.DispatcherPriority]::Background)
    
    $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
    
    try {
        Write-Host "  Fetching firewall rules..." -ForegroundColor Gray
        $rawRules = @(Get-NetFirewallRule -ErrorAction Stop)
        $ruleCount = $rawRules.Count
        Write-Host "  Found $ruleCount rules" -ForegroundColor Gray
        
        Update-Status "Fetching port filters..." "#FFA500"
        $Window.Dispatcher.Invoke([Action]{}, [System.Windows.Threading.DispatcherPriority]::Background)
        Write-Host "  Fetching port filters..." -ForegroundColor Gray
        $portFilters = @{}
        Get-NetFirewallPortFilter -ErrorAction SilentlyContinue | ForEach-Object {
            $portFilters[$_.InstanceID] = $_
        }
        
        Update-Status "Fetching application filters..." "#FFA500"
        $Window.Dispatcher.Invoke([Action]{}, [System.Windows.Threading.DispatcherPriority]::Background)
        Write-Host "  Fetching application filters..." -ForegroundColor Gray
        $appFilters = @{}
        Get-NetFirewallApplicationFilter -ErrorAction SilentlyContinue | ForEach-Object {
            $appFilters[$_.InstanceID] = $_
        }
        
        Update-Status "Processing $ruleCount rules..." "#FFA500"
        $Window.Dispatcher.Invoke([Action]{}, [System.Windows.Threading.DispatcherPriority]::Background)
        Write-Host "  Processing rules..." -ForegroundColor Gray
        
        $rules = $rawRules | ForEach-Object {
            $ruleId = $_.Name
            $portFilter = $portFilters[$_.InstanceID]
            $appFilter = $appFilters[$_.InstanceID]
            
            [PSCustomObject]@{
                Name = $_.Name
                DisplayName = $_.DisplayName
                Description = $_.Description
                Direction = $_.Direction.ToString()
                Action = $_.Action.ToString()
                Enabled = $_.Enabled.ToString()
                Profile = $_.Profile.ToString()
                Protocol = if ($portFilter) { $portFilter.Protocol } else { "Any" }
                LocalPort = if ($portFilter -and $portFilter.LocalPort) { $portFilter.LocalPort } else { "Any" }
                RemotePort = if ($portFilter -and $portFilter.RemotePort) { $portFilter.RemotePort } else { "Any" }
                Program = if ($appFilter -and $appFilter.Program) { $appFilter.Program } else { "Any" }
            }
        }
        
        $stopwatch.Stop()
        $elapsed = [math]::Round($stopwatch.Elapsed.TotalSeconds, 1)
        
        $Script:AllRules = $rules
        $dgRules.ItemsSource = $rules
        $txtRuleCount.Text = "Rules: $($rules.Count)"
        Update-Status "Loaded $($rules.Count) firewall rules in $elapsed seconds" "#00FF00"
        Write-Host "  Completed in $elapsed seconds" -ForegroundColor Green
    }
    catch {
        $stopwatch.Stop()
        Update-Status "Error loading rules: $($_.Exception.Message)" "#FF0000"
        Write-Host "  ERROR: $($_.Exception.Message)" -ForegroundColor Red
        [System.Windows.MessageBox]::Show(
            "Failed to load firewall rules.`n`nError: $($_.Exception.Message)",
            "Error",
            [System.Windows.MessageBoxButton]::OK,
            [System.Windows.MessageBoxImage]::Error
        )
    }
}

function Backup-FirewallRules {
    Update-Status "Preparing backup..." "#FFA500"
    
    # Ensure backup folder exists
    if (-not (Test-Path $Script:BackupFolder)) {
        New-Item -ItemType Directory -Path $Script:BackupFolder -Force | Out-Null
    }
    
    $saveDialog = New-Object Microsoft.Win32.SaveFileDialog
    $saveDialog.InitialDirectory = $Script:BackupFolder
    $saveDialog.Filter = "Firewall Backup (*.fwbackup)|*.fwbackup|All Files (*.*)|*.*"
    $saveDialog.DefaultExt = ".fwbackup"
    $saveDialog.FileName = "FirewallBackup_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
    
    if ($saveDialog.ShowDialog()) {
        try {
            Update-Status "Exporting firewall rules..." "#FFA500"
            
            # Export using netsh for complete backup
            $tempFile = [System.IO.Path]::GetTempFileName()
            Remove-Item $tempFile -Force -ErrorAction SilentlyContinue  # GetTempFileName creates the file, netsh needs it gone
            $netshResult = netsh advfirewall export $tempFile 2>&1
            
            if ($LASTEXITCODE -eq 0 -and (Test-Path $tempFile)) {
                # Create our backup package with metadata
                $backupData = @{
                    BackupDate = (Get-Date).ToString("o")
                    ComputerName = $env:COMPUTERNAME
                    RuleCount = $Script:AllRules.Count
                    NetshBackup = [Convert]::ToBase64String([System.IO.File]::ReadAllBytes($tempFile))
                    RuleDetails = $Script:AllRules
                }
                
                $backupData | ConvertTo-Json -Depth 10 -Compress | Out-File $saveDialog.FileName -Encoding UTF8
                Remove-Item $tempFile -Force -ErrorAction SilentlyContinue
                
                Update-Status "Backup saved successfully: $($saveDialog.FileName)" "#00FF00"
                [System.Windows.MessageBox]::Show(
                    "Firewall rules backed up successfully!`n`nFile: $($saveDialog.FileName)`nRules: $($Script:AllRules.Count)",
                    "Backup Complete",
                    [System.Windows.MessageBoxButton]::OK,
                    [System.Windows.MessageBoxImage]::Information
                )
            }
            else {
                throw "netsh export failed: $netshResult"
            }
        }
        catch {
            Update-Status "Backup failed: $($_.Exception.Message)" "#FF0000"
            [System.Windows.MessageBox]::Show(
                "Failed to backup firewall rules.`n`nError: $($_.Exception.Message)",
                "Backup Error",
                [System.Windows.MessageBoxButton]::OK,
                [System.Windows.MessageBoxImage]::Error
            )
        }
    }
    else {
        Update-Status "Backup cancelled" "#808080"
    }
}

function Restore-FirewallRules {
    $openDialog = New-Object Microsoft.Win32.OpenFileDialog
    $openDialog.InitialDirectory = $Script:BackupFolder
    $openDialog.Filter = "Firewall Backup (*.fwbackup)|*.fwbackup|All Files (*.*)|*.*"
    $openDialog.DefaultExt = ".fwbackup"
    
    if ($openDialog.ShowDialog()) {
        try {
            Update-Status "Reading backup file..." "#FFA500"
            
            $backupContent = Get-Content $openDialog.FileName -Raw -Encoding UTF8
            $backupData = $backupContent | ConvertFrom-Json
            
            $confirmResult = [System.Windows.MessageBox]::Show(
                "Restore firewall rules from backup?`n`nBackup Date: $($backupData.BackupDate)`nOriginal Computer: $($backupData.ComputerName)`nRules: $($backupData.RuleCount)`n`nWARNING: This will replace your current firewall configuration!",
                "Confirm Restore",
                [System.Windows.MessageBoxButton]::YesNo,
                [System.Windows.MessageBoxImage]::Warning
            )
            
            if ($confirmResult -eq [System.Windows.MessageBoxResult]::Yes) {
                Update-Status "Restoring firewall rules..." "#FFA500"
                
                # Extract and restore netsh backup
                $tempFile = [System.IO.Path]::GetTempFileName()
                $netshBytes = [Convert]::FromBase64String($backupData.NetshBackup)
                [System.IO.File]::WriteAllBytes($tempFile, $netshBytes)
                
                $netshResult = netsh advfirewall import $tempFile 2>&1
                Remove-Item $tempFile -Force -ErrorAction SilentlyContinue
                
                if ($LASTEXITCODE -eq 0) {
                    Update-Status "Restore completed successfully" "#00FF00"
                    [System.Windows.MessageBox]::Show(
                        "Firewall rules restored successfully!",
                        "Restore Complete",
                        [System.Windows.MessageBoxButton]::OK,
                        [System.Windows.MessageBoxImage]::Information
                    )
                    
                    # Refresh the display
                    Get-FirewallRules
                }
                else {
                    throw "netsh import failed: $netshResult"
                }
            }
            else {
                Update-Status "Restore cancelled" "#808080"
            }
        }
        catch {
            Update-Status "Restore failed: $($_.Exception.Message)" "#FF0000"
            [System.Windows.MessageBox]::Show(
                "Failed to restore firewall rules.`n`nError: $($_.Exception.Message)",
                "Restore Error",
                [System.Windows.MessageBoxButton]::OK,
                [System.Windows.MessageBoxImage]::Error
            )
        }
    }
}

function Search-Rules {
    $searchText = $txtSearch.Text.Trim()
    
    if ([string]::IsNullOrEmpty($searchText)) {
        $dgRules.ItemsSource = $Script:AllRules
        $txtRuleCount.Text = "Rules: $($Script:AllRules.Count)"
        Update-Status "Showing all rules" "#808080"
    }
    else {
        $filtered = $Script:AllRules | Where-Object {
            $_.DisplayName -like "*$searchText*" -or
            $_.Program -like "*$searchText*" -or
            $_.LocalPort -like "*$searchText*" -or
            $_.RemotePort -like "*$searchText*" -or
            $_.Description -like "*$searchText*"
        }
        
        $dgRules.ItemsSource = $filtered
        $txtRuleCount.Text = "Rules: $($filtered.Count) / $($Script:AllRules.Count)"
        Update-Status "Found $($filtered.Count) matching rules" "#00FF00"
    }
}

function Export-RulesToCSV {
    $saveDialog = New-Object Microsoft.Win32.SaveFileDialog
    $saveDialog.InitialDirectory = [Environment]::GetFolderPath("Desktop")
    $saveDialog.Filter = "CSV Files (*.csv)|*.csv|All Files (*.*)|*.*"
    $saveDialog.DefaultExt = ".csv"
    $saveDialog.FileName = "FirewallRules_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
    
    if ($saveDialog.ShowDialog()) {
        try {
            $dgRules.ItemsSource | Export-Csv -Path $saveDialog.FileName -NoTypeInformation -Encoding UTF8
            Update-Status "Exported to: $($saveDialog.FileName)" "#00FF00"
            [System.Windows.MessageBox]::Show(
                "Rules exported successfully!`n`nFile: $($saveDialog.FileName)",
                "Export Complete",
                [System.Windows.MessageBoxButton]::OK,
                [System.Windows.MessageBoxImage]::Information
            )
        }
        catch {
            Update-Status "Export failed: $($_.Exception.Message)" "#FF0000"
        }
    }
}

function Update-EditPanel {
    $selectedRule = $dgRules.SelectedItem
    
    if ($null -ne $selectedRule) {
        # Set Enabled
        $cmbEnabled.SelectedIndex = if ($selectedRule.Enabled -eq "True") { 0 } else { 1 }
        
        # Set Action
        $cmbAction.SelectedIndex = if ($selectedRule.Action -eq "Allow") { 0 } else { 1 }
        
        # Set Direction
        $cmbDirection.SelectedIndex = if ($selectedRule.Direction -eq "Inbound") { 0 } else { 1 }
        
        # Set Profile
        $profileMap = @{
            "Any" = 0; "Domain" = 1; "Private" = 2; "Public" = 3;
            "Domain, Private" = 4; "Domain, Public" = 5; "Private, Public" = 6
        }
        $cmbProfile.SelectedIndex = if ($profileMap.ContainsKey($selectedRule.Profile)) { $profileMap[$selectedRule.Profile] } else { 0 }
        
        # Set Protocol
        $protocolMap = @{ "Any" = 0; "TCP" = 1; "UDP" = 2; "ICMPv4" = 3; "ICMPv6" = 4 }
        $cmbProtocol.SelectedIndex = if ($protocolMap.ContainsKey($selectedRule.Protocol)) { $protocolMap[$selectedRule.Protocol] } else { 0 }
        
        # Set Ports
        $txtLocalPort.Text = $selectedRule.LocalPort
        $txtRemotePort.Text = $selectedRule.RemotePort
        
        Update-Status "Selected: $($selectedRule.DisplayName)" "#0078D4"
    }
}

function Apply-RuleChanges {
    $selectedRule = $dgRules.SelectedItem
    
    if ($null -eq $selectedRule) {
        [System.Windows.MessageBox]::Show(
            "Please select a rule to edit.",
            "No Selection",
            [System.Windows.MessageBoxButton]::OK,
            [System.Windows.MessageBoxImage]::Warning
        )
        return
    }
    
    try {
        Update-Status "Applying changes to: $($selectedRule.DisplayName)" "#FFA500"
        
        $params = @{
            Name = $selectedRule.Name
        }
        
        # Enabled
        $params.Enabled = if ($cmbEnabled.SelectedIndex -eq 0) { "True" } else { "False" }
        
        # Action
        $params.Action = if ($cmbAction.SelectedIndex -eq 0) { "Allow" } else { "Block" }
        
        # Direction cannot be changed on existing rules, so we skip it
        
        # Profile
        $profileValues = @("Any", "Domain", "Private", "Public", "Domain, Private", "Domain, Public", "Private, Public")
        $params.Profile = $profileValues[$cmbProfile.SelectedIndex]
        
        Set-NetFirewallRule @params -ErrorAction Stop
        
        # Update port filter if protocol is TCP or UDP
        $protocol = @("Any", "TCP", "UDP", "ICMPv4", "ICMPv6")[$cmbProtocol.SelectedIndex]
        if ($protocol -in @("TCP", "UDP")) {
            $portParams = @{}
            if (-not [string]::IsNullOrWhiteSpace($txtLocalPort.Text) -and $txtLocalPort.Text -ne "Any") {
                $portParams.LocalPort = $txtLocalPort.Text
            }
            if (-not [string]::IsNullOrWhiteSpace($txtRemotePort.Text) -and $txtRemotePort.Text -ne "Any") {
                $portParams.RemotePort = $txtRemotePort.Text
            }
            
            if ($portParams.Count -gt 0) {
                Get-NetFirewallRule -Name $selectedRule.Name | Set-NetFirewallPortFilter @portParams -ErrorAction Stop
            }
        }
        
        Update-Status "Changes applied successfully" "#00FF00"
        [System.Windows.MessageBox]::Show(
            "Rule updated successfully!",
            "Success",
            [System.Windows.MessageBoxButton]::OK,
            [System.Windows.MessageBoxImage]::Information
        )
        
        # Refresh
        Get-FirewallRules
    }
    catch {
        Update-Status "Failed to apply changes: $($_.Exception.Message)" "#FF0000"
        [System.Windows.MessageBox]::Show(
            "Failed to update rule.`n`nError: $($_.Exception.Message)",
            "Error",
            [System.Windows.MessageBoxButton]::OK,
            [System.Windows.MessageBoxImage]::Error
        )
    }
}

function Delete-SelectedRule {
    $selectedRules = @($dgRules.SelectedItems)
    
    if ($selectedRules.Count -eq 0) {
        [System.Windows.MessageBox]::Show(
            "Please select one or more rules to delete.",
            "No Selection",
            [System.Windows.MessageBoxButton]::OK,
            [System.Windows.MessageBoxImage]::Warning
        )
        return
    }
    
    $confirmResult = [System.Windows.MessageBox]::Show(
        "Are you sure you want to delete $($selectedRules.Count) rule(s)?`n`nThis action cannot be undone!",
        "Confirm Delete",
        [System.Windows.MessageBoxButton]::YesNo,
        [System.Windows.MessageBoxImage]::Warning
    )
    
    if ($confirmResult -eq [System.Windows.MessageBoxResult]::Yes) {
        $deleted = 0
        $failed = 0
        
        foreach ($rule in $selectedRules) {
            try {
                Remove-NetFirewallRule -Name $rule.Name -ErrorAction Stop
                $deleted++
            }
            catch {
                $failed++
            }
        }
        
        if ($failed -eq 0) {
            Update-Status "Deleted $deleted rule(s) successfully" "#00FF00"
        }
        else {
            Update-Status "Deleted $deleted rule(s), $failed failed" "#FFA500"
        }
        
        Get-FirewallRules
    }
}

# ============================================================
# Event Handlers
# ============================================================
$btnBackup.Add_Click({ Backup-FirewallRules })
$btnRestore.Add_Click({ Restore-FirewallRules })
$btnRefresh.Add_Click({ Get-FirewallRules })
$btnExportCSV.Add_Click({ Export-RulesToCSV })
$btnSearch.Add_Click({ Search-Rules })
$btnClearSearch.Add_Click({
    $txtSearch.Text = ""
    Search-Rules
})
$btnApplyEdit.Add_Click({ Apply-RuleChanges })
$btnDeleteRule.Add_Click({ Delete-SelectedRule })

$dgRules.Add_SelectionChanged({ Update-EditPanel })

$txtSearch.Add_KeyDown({
    if ($_.Key -eq [System.Windows.Input.Key]::Enter) {
        Search-Rules
    }
})

# ============================================================
# Initialize
# ============================================================
    Write-Host "Launching GUI..." -ForegroundColor Green
    Write-Host "(Firewall rules will load after window appears)" -ForegroundColor Yellow
    
    # Load rules after window is shown
    $Window.Add_ContentRendered({
        Write-Host "Window rendered, now loading firewall rules..." -ForegroundColor Cyan
        Get-FirewallRules
        Write-Host "Firewall rules loaded." -ForegroundColor Green
    })

    # Show window
    $Window.ShowDialog() | Out-Null
    
    Write-Host "Application closed normally." -ForegroundColor Green
}
catch {
    Write-Host "`n============================================" -ForegroundColor Red
    Write-Host "ERROR OCCURRED" -ForegroundColor Red
    Write-Host "============================================" -ForegroundColor Red
    Write-Host "Message: $($_.Exception.Message)" -ForegroundColor Yellow
    Write-Host "`nFull Error:" -ForegroundColor Red
    Write-Host $_.Exception.ToString() -ForegroundColor Gray
    Write-Host "`nStack Trace:" -ForegroundColor Red
    Write-Host $_.ScriptStackTrace -ForegroundColor Gray
    Write-Host "============================================`n" -ForegroundColor Red
}
finally {
    Write-Host "`nPress any key to exit..." -ForegroundColor Cyan
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
}
