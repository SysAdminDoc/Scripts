<#
.SYNOPSIS
    FirewallRulesEditor - Offline Firewall Rules Editor
.DESCRIPTION
    A standalone tool for importing, editing, and exporting firewall rules from backups.
    Does NOT modify your system's actual firewall - purely an offline editor.
.NOTES
    Author: Matt
    Version: 1.0
#>

Add-Type -AssemblyName PresentationFramework
Add-Type -AssemblyName PresentationCore
Add-Type -AssemblyName WindowsBase
Add-Type -AssemblyName System.Windows.Forms

# ============================================================
# XAML GUI Definition
# ============================================================
[xml]$XAML = @"
<Window xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
        xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
        Title="Firewall Rules Editor v1.0 (Offline)" 
        Height="800" Width="1200"
        WindowStartupLocation="CenterScreen"
        Background="#1E1E1E"
        ResizeMode="CanResizeWithGrip">
    <Window.Resources>
        <SolidColorBrush x:Key="ComboBoxBackground" Color="#3C3C3C"/>
        <SolidColorBrush x:Key="ComboBoxBorder" Color="#555555"/>
        <SolidColorBrush x:Key="ComboBoxForeground" Color="#E0E0E0"/>
        <SolidColorBrush x:Key="ComboBoxHoverBackground" Color="#4A4A4A"/>
        <SolidColorBrush x:Key="ComboBoxDropdownBackground" Color="#2D2D30"/>
        <SolidColorBrush x:Key="ComboBoxItemHover" Color="#3E3E42"/>
        <SolidColorBrush x:Key="ComboBoxItemSelected" Color="#0078D4"/>
        
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
        <Style x:Key="WarningButton" TargetType="Button">
            <Setter Property="Background" Value="#F57C00"/>
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
                                <Setter Property="Background" Value="#FF9800"/>
                            </Trigger>
                            <Trigger Property="IsPressed" Value="True">
                                <Setter Property="Background" Value="#E65100"/>
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
        <Style TargetType="DataGridRow">
            <Style.Triggers>
                <DataTrigger Binding="{Binding Selected}" Value="True">
                    <Setter Property="Background" Value="#1B3E1B"/>
                </DataTrigger>
            </Style.Triggers>
        </Style>
        <Style TargetType="TextBox">
            <Setter Property="Background" Value="#3C3C3C"/>
            <Setter Property="Foreground" Value="#E0E0E0"/>
            <Setter Property="BorderBrush" Value="#555555"/>
            <Setter Property="Padding" Value="8,6"/>
            <Setter Property="FontSize" Value="13"/>
        </Style>
        <Style TargetType="Label">
            <Setter Property="Foreground" Value="#B0B0B0"/>
            <Setter Property="FontSize" Value="13"/>
        </Style>
        <Style TargetType="CheckBox">
            <Setter Property="Foreground" Value="#E0E0E0"/>
            <Setter Property="FontSize" Value="13"/>
        </Style>
        
        <ControlTemplate x:Key="ComboBoxToggleButton" TargetType="ToggleButton">
            <Grid>
                <Grid.ColumnDefinitions>
                    <ColumnDefinition/>
                    <ColumnDefinition Width="30"/>
                </Grid.ColumnDefinitions>
                <Border x:Name="Border" Grid.ColumnSpan="2" Background="{StaticResource ComboBoxBackground}" 
                        BorderBrush="{StaticResource ComboBoxBorder}" BorderThickness="1" CornerRadius="3"/>
                <Path x:Name="Arrow" Grid.Column="1" Fill="#E0E0E0" HorizontalAlignment="Center" 
                      VerticalAlignment="Center" Data="M 0 0 L 6 6 L 12 0 Z"/>
            </Grid>
            <ControlTemplate.Triggers>
                <Trigger Property="IsMouseOver" Value="True">
                    <Setter TargetName="Border" Property="Background" Value="{StaticResource ComboBoxHoverBackground}"/>
                </Trigger>
            </ControlTemplate.Triggers>
        </ControlTemplate>
        
        <Style TargetType="ComboBoxItem">
            <Setter Property="Background" Value="Transparent"/>
            <Setter Property="Foreground" Value="#E0E0E0"/>
            <Setter Property="Padding" Value="10,6"/>
            <Setter Property="Template">
                <Setter.Value>
                    <ControlTemplate TargetType="ComboBoxItem">
                        <Border x:Name="Border" Background="{TemplateBinding Background}" Padding="{TemplateBinding Padding}">
                            <ContentPresenter/>
                        </Border>
                        <ControlTemplate.Triggers>
                            <Trigger Property="IsHighlighted" Value="True">
                                <Setter TargetName="Border" Property="Background" Value="{StaticResource ComboBoxItemHover}"/>
                            </Trigger>
                            <Trigger Property="IsSelected" Value="True">
                                <Setter TargetName="Border" Property="Background" Value="{StaticResource ComboBoxItemSelected}"/>
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
            <Setter Property="Padding" Value="8,6"/>
            <Setter Property="FontSize" Value="13"/>
            <Setter Property="Template">
                <Setter.Value>
                    <ControlTemplate TargetType="ComboBox">
                        <Grid>
                            <ToggleButton Name="ToggleButton" Template="{StaticResource ComboBoxToggleButton}" 
                                          Focusable="False" 
                                          IsChecked="{Binding Path=IsDropDownOpen, Mode=TwoWay, RelativeSource={RelativeSource TemplatedParent}}" 
                                          ClickMode="Press"/>
                            <ContentPresenter Name="ContentSite" IsHitTestVisible="False" 
                                              Content="{TemplateBinding SelectionBoxItem}" 
                                              Margin="10,3,30,3" VerticalAlignment="Center" HorizontalAlignment="Left"/>
                            <Popup Name="Popup" Placement="Bottom" IsOpen="{TemplateBinding IsDropDownOpen}" 
                                   AllowsTransparency="True" Focusable="False" PopupAnimation="Slide">
                                <Grid Name="DropDown" SnapsToDevicePixels="True" 
                                      MinWidth="{TemplateBinding ActualWidth}" MaxHeight="{TemplateBinding MaxDropDownHeight}">
                                    <Border Background="{StaticResource ComboBoxDropdownBackground}" 
                                            BorderThickness="1" BorderBrush="{StaticResource ComboBoxBorder}" CornerRadius="3">
                                        <ScrollViewer Margin="4,6,4,6" SnapsToDevicePixels="True">
                                            <StackPanel IsItemsHost="True"/>
                                        </ScrollViewer>
                                    </Border>
                                </Grid>
                            </Popup>
                        </Grid>
                    </ControlTemplate>
                </Setter.Value>
            </Setter>
        </Style>
    </Window.Resources>
    
    <Grid Margin="15">
        <Grid.RowDefinitions>
            <RowDefinition Height="Auto"/>
            <RowDefinition Height="Auto"/>
            <RowDefinition Height="Auto"/>
            <RowDefinition Height="*"/>
            <RowDefinition Height="Auto"/>
            <RowDefinition Height="Auto"/>
        </Grid.RowDefinitions>
        
        <!-- Header -->
        <StackPanel Grid.Row="0" Margin="0,0,0,10">
            <TextBlock Text="Firewall Rules Editor" FontSize="28" FontWeight="Bold" Foreground="#0078D4"/>
            <TextBlock Text="Import, Edit, and Export Firewall Rules (Offline - Does NOT affect your system firewall)" 
                       FontSize="13" Foreground="#808080"/>
        </StackPanel>
        
        <!-- Import/Export Buttons -->
        <WrapPanel Grid.Row="1" Margin="0,0,0,10">
            <Button x:Name="btnImportBackup" Content="Import .fwbackup" Width="140"/>
            <Button x:Name="btnImportCSV" Content="Import CSV" Width="120"/>
            <Button x:Name="btnExportBackup" Content="Export Selected to .fwbackup" Style="{StaticResource SuccessButton}" Width="200"/>
            <Button x:Name="btnExportCSV" Content="Export Selected to CSV" Style="{StaticResource SuccessButton}" Width="180"/>
            <Button x:Name="btnClearAll" Content="Clear All" Style="{StaticResource DangerButton}" Width="100"/>
        </WrapPanel>
        
        <!-- Selection and Filter Tools -->
        <WrapPanel Grid.Row="2" Margin="0,0,0,10" VerticalAlignment="Center">
            <Button x:Name="btnSelectAll" Content="Select All" Style="{StaticResource WarningButton}" Width="100"/>
            <Button x:Name="btnSelectNone" Content="Select None" Style="{StaticResource WarningButton}" Width="110"/>
            <Button x:Name="btnInvertSelection" Content="Invert Selection" Style="{StaticResource WarningButton}" Width="130"/>
            <Button x:Name="btnSelectFiltered" Content="Select Filtered" Style="{StaticResource WarningButton}" Width="120"/>
            <TextBox x:Name="txtSearch" Width="250" Margin="20,0,5,0" VerticalAlignment="Center"
                     ToolTip="Search by name, program, port, etc."/>
            <Button x:Name="btnSearch" Content="Filter" Width="80"/>
            <Button x:Name="btnClearSearch" Content="Clear Filter" Width="100"/>
            <Button x:Name="btnDeleteSelected" Content="Delete Selected" Style="{StaticResource DangerButton}" Width="130" Margin="20,0,0,0"/>
            <Button x:Name="btnRefreshCounts" Content="Refresh Count" Width="110" Margin="10,0,0,0"/>
        </WrapPanel>
        
        <!-- Rules DataGrid with Checkbox -->
        <DataGrid x:Name="dgRules" Grid.Row="3" 
                  AutoGenerateColumns="False" 
                  IsReadOnly="False"
                  SelectionMode="Extended"
                  CanUserAddRows="False"
                  CanUserDeleteRows="False"
                  CanUserReorderColumns="True"
                  CanUserSortColumns="True">
            <DataGrid.Columns>
                <DataGridTemplateColumn Header="Export" Width="60">
                    <DataGridTemplateColumn.CellTemplate>
                        <DataTemplate>
                            <CheckBox IsChecked="{Binding Selected, Mode=TwoWay, UpdateSourceTrigger=PropertyChanged}" 
                                      HorizontalAlignment="Center" VerticalAlignment="Center"/>
                        </DataTemplate>
                    </DataGridTemplateColumn.CellTemplate>
                </DataGridTemplateColumn>
                <DataGridTextColumn Header="Name" Binding="{Binding DisplayName}" Width="200" IsReadOnly="True"/>
                <DataGridComboBoxColumn Header="Direction" SelectedItemBinding="{Binding Direction}" Width="90">
                    <DataGridComboBoxColumn.ElementStyle>
                        <Style TargetType="ComboBox">
                            <Setter Property="Background" Value="#3C3C3C"/>
                            <Setter Property="Foreground" Value="#E0E0E0"/>
                        </Style>
                    </DataGridComboBoxColumn.ElementStyle>
                    <DataGridComboBoxColumn.ItemsSource>
                        <x:Array Type="sys:String" xmlns:sys="clr-namespace:System;assembly=mscorlib">
                            <sys:String>Inbound</sys:String>
                            <sys:String>Outbound</sys:String>
                        </x:Array>
                    </DataGridComboBoxColumn.ItemsSource>
                </DataGridComboBoxColumn>
                <DataGridComboBoxColumn Header="Action" SelectedItemBinding="{Binding Action}" Width="80">
                    <DataGridComboBoxColumn.ItemsSource>
                        <x:Array Type="sys:String" xmlns:sys="clr-namespace:System;assembly=mscorlib">
                            <sys:String>Allow</sys:String>
                            <sys:String>Block</sys:String>
                        </x:Array>
                    </DataGridComboBoxColumn.ItemsSource>
                </DataGridComboBoxColumn>
                <DataGridComboBoxColumn Header="Enabled" SelectedItemBinding="{Binding Enabled}" Width="80">
                    <DataGridComboBoxColumn.ItemsSource>
                        <x:Array Type="sys:String" xmlns:sys="clr-namespace:System;assembly=mscorlib">
                            <sys:String>True</sys:String>
                            <sys:String>False</sys:String>
                        </x:Array>
                    </DataGridComboBoxColumn.ItemsSource>
                </DataGridComboBoxColumn>
                <DataGridComboBoxColumn Header="Profile" SelectedItemBinding="{Binding Profile}" Width="120">
                    <DataGridComboBoxColumn.ItemsSource>
                        <x:Array Type="sys:String" xmlns:sys="clr-namespace:System;assembly=mscorlib">
                            <sys:String>Any</sys:String>
                            <sys:String>Domain</sys:String>
                            <sys:String>Private</sys:String>
                            <sys:String>Public</sys:String>
                            <sys:String>Domain, Private</sys:String>
                            <sys:String>Domain, Public</sys:String>
                            <sys:String>Private, Public</sys:String>
                            <sys:String>Domain, Private, Public</sys:String>
                        </x:Array>
                    </DataGridComboBoxColumn.ItemsSource>
                </DataGridComboBoxColumn>
                <DataGridTextColumn Header="Protocol" Binding="{Binding Protocol}" Width="80"/>
                <DataGridTextColumn Header="Local Port" Binding="{Binding LocalPort}" Width="100"/>
                <DataGridTextColumn Header="Remote Port" Binding="{Binding RemotePort}" Width="100"/>
                <DataGridTextColumn Header="Program" Binding="{Binding Program}" Width="300"/>
            </DataGrid.Columns>
        </DataGrid>
        
        <!-- Add New Rule Panel -->
        <GroupBox Grid.Row="4" Header="Add New Rule" Margin="0,10,0,0" Foreground="#B0B0B0" BorderBrush="#3C3C3C">
            <Grid Margin="10">
                <Grid.ColumnDefinitions>
                    <ColumnDefinition Width="*"/>
                    <ColumnDefinition Width="*"/>
                    <ColumnDefinition Width="*"/>
                    <ColumnDefinition Width="*"/>
                    <ColumnDefinition Width="*"/>
                    <ColumnDefinition Width="Auto"/>
                </Grid.ColumnDefinitions>
                
                <StackPanel Grid.Column="0" Margin="5">
                    <Label Content="Display Name"/>
                    <TextBox x:Name="txtNewName"/>
                </StackPanel>
                <StackPanel Grid.Column="1" Margin="5">
                    <Label Content="Direction"/>
                    <ComboBox x:Name="cmbNewDirection">
                        <ComboBoxItem Content="Inbound" IsSelected="True"/>
                        <ComboBoxItem Content="Outbound"/>
                    </ComboBox>
                </StackPanel>
                <StackPanel Grid.Column="2" Margin="5">
                    <Label Content="Action"/>
                    <ComboBox x:Name="cmbNewAction">
                        <ComboBoxItem Content="Allow" IsSelected="True"/>
                        <ComboBoxItem Content="Block"/>
                    </ComboBox>
                </StackPanel>
                <StackPanel Grid.Column="3" Margin="5">
                    <Label Content="Protocol"/>
                    <ComboBox x:Name="cmbNewProtocol">
                        <ComboBoxItem Content="Any" IsSelected="True"/>
                        <ComboBoxItem Content="TCP"/>
                        <ComboBoxItem Content="UDP"/>
                    </ComboBox>
                </StackPanel>
                <StackPanel Grid.Column="4" Margin="5">
                    <Label Content="Local Port"/>
                    <TextBox x:Name="txtNewPort" Text="Any"/>
                </StackPanel>
                <StackPanel Grid.Column="5" Margin="5" VerticalAlignment="Bottom">
                    <Button x:Name="btnAddRule" Content="Add Rule" Style="{StaticResource SuccessButton}" Width="120"/>
                </StackPanel>
            </Grid>
        </GroupBox>
        
        <!-- Status Bar -->
        <Border Grid.Row="5" Background="#252526" Margin="0,10,0,0" Padding="10,8" CornerRadius="4">
            <Grid>
                <Grid.ColumnDefinitions>
                    <ColumnDefinition Width="*"/>
                    <ColumnDefinition Width="Auto"/>
                    <ColumnDefinition Width="Auto"/>
                </Grid.ColumnDefinitions>
                <TextBlock x:Name="txtStatus" Text="Ready - Import a backup or CSV to begin" Foreground="#808080" VerticalAlignment="Center"/>
                <TextBlock x:Name="txtSelectedCount" Grid.Column="1" Text="Selected: 0" Foreground="#00FF00" VerticalAlignment="Center" Margin="0,0,20,0"/>
                <TextBlock x:Name="txtRuleCount" Grid.Column="2" Text="Total: 0" Foreground="#808080" VerticalAlignment="Center"/>
            </Grid>
        </Border>
    </Grid>
</Window>
"@

# ============================================================
# Load XAML
# ============================================================
$Reader = New-Object System.Xml.XmlNodeReader $XAML
$Window = [Windows.Markup.XamlReader]::Load($Reader)

# Get controls
$btnImportBackup = $Window.FindName("btnImportBackup")
$btnImportCSV = $Window.FindName("btnImportCSV")
$btnExportBackup = $Window.FindName("btnExportBackup")
$btnExportCSV = $Window.FindName("btnExportCSV")
$btnClearAll = $Window.FindName("btnClearAll")
$btnSelectAll = $Window.FindName("btnSelectAll")
$btnSelectNone = $Window.FindName("btnSelectNone")
$btnInvertSelection = $Window.FindName("btnInvertSelection")
$btnSelectFiltered = $Window.FindName("btnSelectFiltered")
$btnDeleteSelected = $Window.FindName("btnDeleteSelected")
$btnRefreshCounts = $Window.FindName("btnRefreshCounts")
$btnSearch = $Window.FindName("btnSearch")
$btnClearSearch = $Window.FindName("btnClearSearch")
$btnAddRule = $Window.FindName("btnAddRule")
$txtSearch = $Window.FindName("txtSearch")
$txtStatus = $Window.FindName("txtStatus")
$txtSelectedCount = $Window.FindName("txtSelectedCount")
$txtRuleCount = $Window.FindName("txtRuleCount")
$dgRules = $Window.FindName("dgRules")
$txtNewName = $Window.FindName("txtNewName")
$cmbNewDirection = $Window.FindName("cmbNewDirection")
$cmbNewAction = $Window.FindName("cmbNewAction")
$cmbNewProtocol = $Window.FindName("cmbNewProtocol")
$txtNewPort = $Window.FindName("txtNewPort")

# Global variables
$Script:AllRules = [System.Collections.Generic.List[PSObject]]::new()
$Script:FilteredView = $null

# ============================================================
# Rule Class using PowerShell class (avoids C# assembly issues)
# ============================================================
class FirewallRuleItem {
    [bool]$Selected
    [string]$Name
    [string]$DisplayName
    [string]$Description
    [string]$Direction
    [string]$Action
    [string]$Enabled
    [string]$Profile
    [string]$Protocol
    [string]$LocalPort
    [string]$RemotePort
    [string]$Program
}

# ============================================================
# Functions
# ============================================================
function Update-Status {
    param([string]$Message)
    $txtStatus.Text = $Message
}

function Update-Counts {
    $total = $Script:AllRules.Count
    $selected = ($Script:AllRules | Where-Object { $_.Selected }).Count
    $txtRuleCount.Text = "Total: $total"
    $txtSelectedCount.Text = "Selected: $selected"
}

function New-RuleObject {
    param(
        [string]$Name = "",
        [string]$DisplayName = "",
        [string]$Description = "",
        [string]$Direction = "Inbound",
        [string]$Action = "Allow",
        [string]$Enabled = "True",
        [string]$Profile = "Any",
        [string]$Protocol = "Any",
        [string]$LocalPort = "Any",
        [string]$RemotePort = "Any",
        [string]$Program = "Any",
        [bool]$Selected = $false
    )
    
    $rule = [FirewallRuleItem]::new()
    $rule.Name = $Name
    $rule.DisplayName = $DisplayName
    $rule.Description = $Description
    $rule.Direction = $Direction
    $rule.Action = $Action
    $rule.Enabled = $Enabled
    $rule.Profile = $Profile
    $rule.Protocol = $Protocol
    $rule.LocalPort = $LocalPort
    $rule.RemotePort = $RemotePort
    $rule.Program = $Program
    $rule.Selected = $Selected
    
    return $rule
}

function Import-FWBackup {
    $openDialog = New-Object Microsoft.Win32.OpenFileDialog
    $openDialog.Filter = "Firewall Backup (*.fwbackup)|*.fwbackup|JSON Files (*.json)|*.json|All Files (*.*)|*.*"
    $openDialog.Title = "Import Firewall Backup"
    
    if ($openDialog.ShowDialog()) {
        try {
            Update-Status "Importing backup..."
            $content = Get-Content $openDialog.FileName -Raw -Encoding UTF8
            $backup = $content | ConvertFrom-Json
            
            $Script:AllRules = [System.Collections.Generic.List[PSObject]]::new()
            $Script:FilteredView = $null
            
            $ruleData = if ($backup.RuleDetails) { $backup.RuleDetails } else { $backup }
            
            foreach ($r in $ruleData) {
                $rule = New-RuleObject `
                    -Name $r.Name `
                    -DisplayName $r.DisplayName `
                    -Description $r.Description `
                    -Direction $r.Direction `
                    -Action $r.Action `
                    -Enabled $r.Enabled `
                    -Profile $r.Profile `
                    -Protocol $r.Protocol `
                    -LocalPort $r.LocalPort `
                    -RemotePort $r.RemotePort `
                    -Program $r.Program `
                    -Selected $false
                    
                $Script:AllRules.Add($rule)
            }
            
            $dgRules.ItemsSource = $Script:AllRules
            Update-Counts
            Update-Status "Imported $($Script:AllRules.Count) rules from backup"
            
            if ($backup.BackupDate) {
                [System.Windows.MessageBox]::Show(
                    "Backup imported successfully!`n`nBackup Date: $($backup.BackupDate)`nComputer: $($backup.ComputerName)`nRules: $($Script:AllRules.Count)",
                    "Import Complete",
                    [System.Windows.MessageBoxButton]::OK,
                    [System.Windows.MessageBoxImage]::Information
                )
            }
        }
        catch {
            Update-Status "Import failed: $($_.Exception.Message)"
            [System.Windows.MessageBox]::Show(
                "Failed to import backup.`n`nError: $($_.Exception.Message)",
                "Import Error",
                [System.Windows.MessageBoxButton]::OK,
                [System.Windows.MessageBoxImage]::Error
            )
        }
    }
}

function Import-CSV {
    $openDialog = New-Object Microsoft.Win32.OpenFileDialog
    $openDialog.Filter = "CSV Files (*.csv)|*.csv|All Files (*.*)|*.*"
    $openDialog.Title = "Import CSV"
    
    if ($openDialog.ShowDialog()) {
        try {
            Update-Status "Importing CSV..."
            $csvData = Import-Csv $openDialog.FileName -Encoding UTF8
            
            $Script:AllRules = [System.Collections.Generic.List[PSObject]]::new()
            $Script:FilteredView = $null
            
            foreach ($r in $csvData) {
                $rule = New-RuleObject `
                    -Name $(if ($r.Name) { $r.Name } else { [guid]::NewGuid().ToString() }) `
                    -DisplayName $(if ($r.DisplayName) { $r.DisplayName } else { $r.Name }) `
                    -Description $(if ($r.Description) { $r.Description } else { "" }) `
                    -Direction $(if ($r.Direction) { $r.Direction } else { "Inbound" }) `
                    -Action $(if ($r.Action) { $r.Action } else { "Allow" }) `
                    -Enabled $(if ($r.Enabled) { $r.Enabled } else { "True" }) `
                    -Profile $(if ($r.Profile) { $r.Profile } else { "Any" }) `
                    -Protocol $(if ($r.Protocol) { $r.Protocol } else { "Any" }) `
                    -LocalPort $(if ($r.LocalPort) { $r.LocalPort } else { "Any" }) `
                    -RemotePort $(if ($r.RemotePort) { $r.RemotePort } else { "Any" }) `
                    -Program $(if ($r.Program) { $r.Program } else { "Any" }) `
                    -Selected $false
                    
                $Script:AllRules.Add($rule)
            }
            
            $dgRules.ItemsSource = $Script:AllRules
            Update-Counts
            Update-Status "Imported $($Script:AllRules.Count) rules from CSV"
        }
        catch {
            Update-Status "Import failed: $($_.Exception.Message)"
            [System.Windows.MessageBox]::Show(
                "Failed to import CSV.`n`nError: $($_.Exception.Message)",
                "Import Error",
                [System.Windows.MessageBoxButton]::OK,
                [System.Windows.MessageBoxImage]::Error
            )
        }
    }
}

function Export-SelectedToBackup {
    $selectedRules = @($Script:AllRules | Where-Object { $_.Selected })
    
    if ($selectedRules.Count -eq 0) {
        [System.Windows.MessageBox]::Show(
            "No rules selected for export.`nUse the checkboxes to select rules.",
            "No Selection",
            [System.Windows.MessageBoxButton]::OK,
            [System.Windows.MessageBoxImage]::Warning
        )
        return
    }
    
    $saveDialog = New-Object Microsoft.Win32.SaveFileDialog
    $saveDialog.Filter = "Firewall Backup (*.fwbackup)|*.fwbackup|All Files (*.*)|*.*"
    $saveDialog.DefaultExt = ".fwbackup"
    $saveDialog.FileName = "FirewallRules_Custom_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
    
    if ($saveDialog.ShowDialog()) {
        try {
            $ruleDetails = $selectedRules | ForEach-Object {
                [PSCustomObject]@{
                    Name = $_.Name
                    DisplayName = $_.DisplayName
                    Description = $_.Description
                    Direction = $_.Direction
                    Action = $_.Action
                    Enabled = $_.Enabled
                    Profile = $_.Profile
                    Protocol = $_.Protocol
                    LocalPort = $_.LocalPort
                    RemotePort = $_.RemotePort
                    Program = $_.Program
                }
            }
            
            $backup = @{
                BackupDate = (Get-Date).ToString("o")
                ComputerName = "Custom Export"
                RuleCount = $selectedRules.Count
                RuleDetails = $ruleDetails
            }
            
            $backup | ConvertTo-Json -Depth 10 | Out-File $saveDialog.FileName -Encoding UTF8
            
            Update-Status "Exported $($selectedRules.Count) rules to backup"
            [System.Windows.MessageBox]::Show(
                "Export successful!`n`nRules exported: $($selectedRules.Count)`nFile: $($saveDialog.FileName)",
                "Export Complete",
                [System.Windows.MessageBoxButton]::OK,
                [System.Windows.MessageBoxImage]::Information
            )
        }
        catch {
            Update-Status "Export failed: $($_.Exception.Message)"
            [System.Windows.MessageBox]::Show(
                "Failed to export.`n`nError: $($_.Exception.Message)",
                "Export Error",
                [System.Windows.MessageBoxButton]::OK,
                [System.Windows.MessageBoxImage]::Error
            )
        }
    }
}

function Export-SelectedToCSV {
    $selectedRules = @($Script:AllRules | Where-Object { $_.Selected })
    
    if ($selectedRules.Count -eq 0) {
        [System.Windows.MessageBox]::Show(
            "No rules selected for export.`nUse the checkboxes to select rules.",
            "No Selection",
            [System.Windows.MessageBoxButton]::OK,
            [System.Windows.MessageBoxImage]::Warning
        )
        return
    }
    
    $saveDialog = New-Object Microsoft.Win32.SaveFileDialog
    $saveDialog.Filter = "CSV Files (*.csv)|*.csv|All Files (*.*)|*.*"
    $saveDialog.DefaultExt = ".csv"
    $saveDialog.FileName = "FirewallRules_Custom_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
    
    if ($saveDialog.ShowDialog()) {
        try {
            $selectedRules | Select-Object Name, DisplayName, Description, Direction, Action, Enabled, Profile, Protocol, LocalPort, RemotePort, Program |
                Export-Csv -Path $saveDialog.FileName -NoTypeInformation -Encoding UTF8
            
            Update-Status "Exported $($selectedRules.Count) rules to CSV"
            [System.Windows.MessageBox]::Show(
                "Export successful!`n`nRules exported: $($selectedRules.Count)`nFile: $($saveDialog.FileName)",
                "Export Complete",
                [System.Windows.MessageBoxButton]::OK,
                [System.Windows.MessageBoxImage]::Information
            )
        }
        catch {
            Update-Status "Export failed: $($_.Exception.Message)"
        }
    }
}

function Filter-Rules {
    $searchText = $txtSearch.Text.Trim()
    
    if ([string]::IsNullOrEmpty($searchText)) {
        $Script:FilteredView = $null
        $dgRules.ItemsSource = $Script:AllRules
        Update-Status "Showing all $($Script:AllRules.Count) rules"
    }
    else {
        $Script:FilteredView = [System.Collections.Generic.List[PSObject]]::new()
        foreach ($rule in $Script:AllRules) {
            if ($rule.DisplayName -like "*$searchText*" -or
                $rule.Program -like "*$searchText*" -or
                $rule.LocalPort -like "*$searchText*" -or
                $rule.RemotePort -like "*$searchText*" -or
                $rule.Protocol -like "*$searchText*" -or
                $rule.Direction -like "*$searchText*" -or
                $rule.Action -like "*$searchText*") {
                $Script:FilteredView.Add($rule)
            }
        }
        $dgRules.ItemsSource = $Script:FilteredView
        Update-Status "Showing $($Script:FilteredView.Count) of $($Script:AllRules.Count) rules"
    }
    Update-Counts
}

# ============================================================
# Event Handlers
# ============================================================
$btnImportBackup.Add_Click({ Import-FWBackup })
$btnImportCSV.Add_Click({ Import-CSV })
$btnExportBackup.Add_Click({ Export-SelectedToBackup })
$btnExportCSV.Add_Click({ Export-SelectedToCSV })

$btnClearAll.Add_Click({
    $Script:AllRules = [System.Collections.Generic.List[PSObject]]::new()
    $Script:FilteredView = $null
    $dgRules.ItemsSource = $Script:AllRules
    Update-Counts
    Update-Status "All rules cleared"
})

$btnSelectAll.Add_Click({
    foreach ($rule in $Script:AllRules) {
        $rule.Selected = $true
    }
    # Force UI refresh
    $dgRules.ItemsSource = $null
    $dgRules.ItemsSource = if ($Script:FilteredView) { $Script:FilteredView } else { $Script:AllRules }
    Update-Counts
})

$btnSelectNone.Add_Click({
    foreach ($rule in $Script:AllRules) {
        $rule.Selected = $false
    }
    # Force UI refresh
    $dgRules.ItemsSource = $null
    $dgRules.ItemsSource = if ($Script:FilteredView) { $Script:FilteredView } else { $Script:AllRules }
    Update-Counts
})

$btnInvertSelection.Add_Click({
    foreach ($rule in $Script:AllRules) {
        $rule.Selected = -not $rule.Selected
    }
    # Force UI refresh
    $dgRules.ItemsSource = $null
    $dgRules.ItemsSource = if ($Script:FilteredView) { $Script:FilteredView } else { $Script:AllRules }
    Update-Counts
})

$btnSelectFiltered.Add_Click({
    $currentSource = if ($Script:FilteredView) { $Script:FilteredView } else { $Script:AllRules }
    foreach ($rule in $currentSource) {
        $rule.Selected = $true
    }
    # Force UI refresh
    $dgRules.ItemsSource = $null
    $dgRules.ItemsSource = $currentSource
    Update-Counts
})

$btnDeleteSelected.Add_Click({
    # Get rules that are either checkbox-selected OR row-selected in the DataGrid
    $checkboxSelected = @($Script:AllRules | Where-Object { $_.Selected })
    $rowSelected = @($dgRules.SelectedItems)
    
    # Combine both selections (unique)
    $toDelete = @{}
    foreach ($rule in $checkboxSelected) {
        $toDelete[$rule.Name] = $rule
    }
    foreach ($rule in $rowSelected) {
        if ($rule -and $rule.Name) {
            $toDelete[$rule.Name] = $rule
        }
    }
    
    $selectedRules = @($toDelete.Values)
    
    if ($selectedRules.Count -eq 0) {
        [System.Windows.MessageBox]::Show(
            "No rules selected.`n`nYou can select rules by:`n- Checking the 'Export' checkbox`n- Clicking on rows (Ctrl+Click for multiple)", 
            "No Selection", 
            [System.Windows.MessageBoxButton]::OK, 
            [System.Windows.MessageBoxImage]::Warning)
        return
    }
    
    $confirm = [System.Windows.MessageBox]::Show(
        "Delete $($selectedRules.Count) selected rule(s)?`n`nThis cannot be undone.",
        "Confirm Delete",
        [System.Windows.MessageBoxButton]::YesNo,
        [System.Windows.MessageBoxImage]::Warning
    )
    
    if ($confirm -eq [System.Windows.MessageBoxResult]::Yes) {
        foreach ($rule in $selectedRules) {
            $Script:AllRules.Remove($rule) | Out-Null
            if ($Script:FilteredView) {
                $Script:FilteredView.Remove($rule) | Out-Null
            }
        }
        
        # Refresh the view
        $dgRules.ItemsSource = $null
        $dgRules.ItemsSource = if ($Script:FilteredView) { $Script:FilteredView } else { $Script:AllRules }
        Update-Counts
        Update-Status "Deleted $($selectedRules.Count) rule(s)"
    }
})

$btnSearch.Add_Click({ Filter-Rules })
$btnRefreshCounts.Add_Click({ Update-Counts })
$btnClearSearch.Add_Click({
    $txtSearch.Text = ""
    $Script:FilteredView = $null
    $dgRules.ItemsSource = $Script:AllRules
    Update-Status "Showing all $($Script:AllRules.Count) rules"
    Update-Counts
})

$txtSearch.Add_KeyDown({
    if ($_.Key -eq [System.Windows.Input.Key]::Enter) {
        Filter-Rules
    }
})

$btnAddRule.Add_Click({
    $displayName = $txtNewName.Text.Trim()
    
    if ([string]::IsNullOrEmpty($displayName)) {
        [System.Windows.MessageBox]::Show("Please enter a display name for the rule.", "Missing Name",
            [System.Windows.MessageBoxButton]::OK, [System.Windows.MessageBoxImage]::Warning)
        return
    }
    
    $rule = New-RuleObject `
        -Name ("Custom_" + [guid]::NewGuid().ToString().Substring(0, 8)) `
        -DisplayName $displayName `
        -Direction $cmbNewDirection.SelectedItem.Content `
        -Action $cmbNewAction.SelectedItem.Content `
        -Enabled "True" `
        -Profile "Any" `
        -Protocol $cmbNewProtocol.SelectedItem.Content `
        -LocalPort $txtNewPort.Text `
        -RemotePort "Any" `
        -Program "Any" `
        -Selected $true
    
    $Script:AllRules.Add($rule)
    
    # Clear filter and refresh view
    $Script:FilteredView = $null
    $txtSearch.Text = ""
    $dgRules.ItemsSource = $null
    $dgRules.ItemsSource = $Script:AllRules
    
    Update-Counts
    Update-Status "Added rule: $displayName"
    
    # Clear input fields
    $txtNewName.Text = ""
    $txtNewPort.Text = "Any"
    
    # Scroll to the new rule
    $dgRules.ScrollIntoView($rule)
})

# Initialize
$Script:AllRules = [System.Collections.Generic.List[PSObject]]::new()
$dgRules.ItemsSource = $Script:AllRules

# Update counts when cells are edited (including checkboxes)
$dgRules.Add_CellEditEnding({
    $Window.Dispatcher.BeginInvoke([Action]{ Update-Counts }, [System.Windows.Threading.DispatcherPriority]::Background)
})

# Handle checkbox clicks specifically
$dgRules.Add_PreviewMouseLeftButtonUp({
    $Window.Dispatcher.BeginInvoke([Action]{ 
        Start-Sleep -Milliseconds 100
        Update-Counts 
    }, [System.Windows.Threading.DispatcherPriority]::Background)
})

# Show window
$Window.ShowDialog() | Out-Null
