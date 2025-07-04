# ===================== ConfigMaker_Final.ps1 =====================
# Standalone GUI tool to generate custom Voyance config files

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

# --- Configuration Variables (Moved to top for easy access) ---
$DefaultInstallPath = 'C:\Program Files\Voyance'
$PanelHardwareRoot  = Join-Path $DefaultInstallPath 'Hardware'

# --- UI Theming ---
$darkBack = [System.Drawing.Color]::FromArgb(30, 30, 30)
$darkFore = [System.Drawing.Color]::White
$btnBack  = [System.Drawing.Color]::FromArgb(60, 60, 60)
$btnBlue  = [System.Drawing.Color]::FromArgb(50, 150, 255)
$btnGreen = [System.Drawing.Color]::FromArgb(50, 180, 85)

# --- Main Form ---
$form = New-Object System.Windows.Forms.Form -Property @{
    Text            = 'Voyance Config Maker'
    Size            = New-Object System.Drawing.Size(700, 600)
    BackColor       = $darkBack
    ForeColor       = $darkFore
    StartPosition   = 'CenterScreen'
    FormBorderStyle = 'FixedDialog'
    MaximizeBox     = $false
}

# --- Install Path Controls ---
$form.Controls.Add((New-Object System.Windows.Forms.Label -Property @{ Text = 'Install Path:'; Location = New-Object System.Drawing.Point(10, 15); Size = New-Object System.Drawing.Size(100, 20) }))
$txtPath = New-Object System.Windows.Forms.TextBox -Property @{ Text = $DefaultInstallPath; Location = New-Object System.Drawing.Point(110, 12); Size = New-Object System.Drawing.Size(460, 20); BackColor = $darkBack; ForeColor = $darkFore }
$form.Controls.Add($txtPath)
$btnBrowse = New-Object System.Windows.Forms.Button -Property @{ Text = 'Browse'; Location = New-Object System.Drawing.Point(580, 10); Size = New-Object System.Drawing.Size(80, 24); BackColor = $btnBlue; ForeColor = $darkFore }
$form.Controls.Add($btnBrowse)
$btnBrowse.Add_Click({
    $dlg = New-Object System.Windows.Forms.FolderBrowserDialog
    if ($dlg.ShowDialog() -eq 'OK') { $txtPath.Text = $dlg.SelectedPath }
})

# Helper to add a checkbox to a parent control
function Add-Cb {
    param($parent, $text, $default)
    $cb = New-Object System.Windows.Forms.CheckBox -Property @{
        Text      = $text
        Size      = New-Object System.Drawing.Size(180, 20) # Wider for longer names
        Checked   = $default
        BackColor = $darkBack
        ForeColor = $darkFore
        Margin    = New-Object System.Windows.Forms.Padding(10, 5, 10, 5) # Spacing
    }
    $parent.Controls.Add($cb)
    return $cb
}

# --- Core & Image Processing Options ---
$groupCore = New-Object System.Windows.Forms.GroupBox -Property @{ Text = "Core Components"; Location = New-Object System.Drawing.Point(10, 45); Size = New-Object System.Drawing.Size(660, 130); ForeColor = $darkFore }
$form.Controls.Add($groupCore)
$cbVoyance   = Add-Cb $groupCore 'Voyance Acquisition' $true
$cbViewer    = Add-Cb $groupCore 'Voyance Viewer' $false
$cbStandard  = Add-Cb $groupCore 'Standard Processing' $true
$cbHarmonica = Add-Cb $groupCore 'Harmonica' $false
$cbHDR       = Add-Cb $groupCore 'HDR' $false
# Set locations within the group box
$cbVoyance.Location   = New-Object System.Drawing.Point(10, 25)
$cbViewer.Location    = New-Object System.Drawing.Point(10, 50)
$cbStandard.Location  = New-Object System.Drawing.Point(220, 25)
$cbHarmonica.Location = New-Object System.Drawing.Point(220, 50)
$cbHDR.Location       = New-Object System.Drawing.Point(220, 75)

# Ensure only one of the two processors
$cbStandard.Add_CheckedChanged({ if ($cbStandard.Checked) { $cbHarmonica.Checked = $false } })
$cbHarmonica.Add_CheckedChanged({ if ($cbHarmonica.Checked){ $cbStandard.Checked = $false } })

# --- DR Panel GroupBox ---
$groupPanels = New-Object System.Windows.Forms.GroupBox -Property @{ Text = "Select DR Panels"; Location = New-Object System.Drawing.Point(10, 185); Size = New-Object System.Drawing.Size(660, 310); ForeColor = $darkFore }
$form.Controls.Add($groupPanels)

# --- Use FlowLayoutPanel for dynamic layout ---
$panelContainer = New-Object System.Windows.Forms.FlowLayoutPanel -Property @{
    Dock          = 'Fill' # Fills the parent GroupBox
    FlowDirection = 'TopDown'
    AutoScroll    = $true # Add scrollbars if content overflows
}
$groupPanels.Controls.Add($panelContainer)

# --- Panel Selection Buttons ---
$btnSelectAll = New-Object System.Windows.Forms.Button -Property @{ Text = 'Select All'; Size = New-Object System.Drawing.Size(120, 24); BackColor = $btnBlue; ForeColor = $darkFore }
$btnClearAll  = New-Object System.Windows.Forms.Button -Property @{ Text = 'Clear All'; Size = New-Object System.Drawing.Size(120, 24); BackColor = $btnBack; ForeColor = $darkFore }
# Add buttons to a small panel for alignment at the top right of the groupbox
$buttonPanel = New-Object System.Windows.Forms.FlowLayoutPanel -Property @{ FlowDirection = 'LeftToRight'; Dock = 'Top'; Height = 30; RightToLeft = 'Yes' }
$buttonPanel.Controls.AddRange(@($btnClearAll, $btnSelectAll))
$groupPanels.Controls.Add($buttonPanel)

# --- Known Panels & Checkbox Creation ---
$knownPanels = [ordered]@{
    'CareRay'='careray'; 'CPI Generator'='cpi'; 'Drgem'='drgem'; 'DRTECH'='drtech'; 'FutrewayTec'='futuraytec'; 'Hamamatsu'='hamamatsu'; 'iRay'='iray'; 'IQFlex'='iqflex'; 'MasterX800'='masterx800'; 'MasterX900'='masterx900'; 'MasterX'='masterx'; 'PaXscan'='paxscan'; 'Perkin Elmer'='perkinelmer'; 'PowerSite'='powersite'; 'PZ Medical'='pzmedical'; 'Simulator'='simulator'; 'Toshiba'='toshiba'; 'Vieworks'='vieworks'
}

$installedPanels = if (Test-Path $PanelHardwareRoot) { Get-ChildItem -Path $PanelHardwareRoot -Directory | Select-Object -ExpandProperty Name } else { @() }

$panelCheckboxes = foreach ($key in $knownPanels.Keys) {
    $isInstalled = $installedPanels -contains $knownPanels[$key]
    Add-Cb $panelContainer $key $isInstalled
}

# Hook up button events
$btnSelectAll.Add_Click({ foreach ($cb in $panelCheckboxes) { $cb.Checked = $true } })
$btnClearAll.Add_Click({ foreach ($cb in $panelCheckboxes) { $cb.Checked = $false } })

# --- Create Config Button ---
$btnCreate = New-Object System.Windows.Forms.Button -Property @{ Text = 'Create Config'; Location = New-Object System.Drawing.Point(285, 510); Size = New-Object System.Drawing.Size(120, 30); BackColor = $btnGreen; ForeColor = $darkFore }
$form.Controls.Add($btnCreate)
$btnCreate.Add_Click({
    # 1. Collect all selected components into a temporary list
    $selectedComponents = [System.Collections.Generic.List[string]]::new()
    if ($cbVoyance.Checked)   { $selectedComponents.Add('acq') }
    if ($cbViewer.Checked)    { $selectedComponents.Add('viewer') }
    if ($cbHDR.Checked)       { $selectedComponents.Add('imageprocessing') }
    if ($cbStandard.Checked)  { $selectedComponents.AddRange([string[]]@('imageprocessingalgorithm','imageprocessingalgorithm\old')) }
    if ($cbHarmonica.Checked) { $selectedComponents.AddRange([string[]]@('imageprocessingalgorithm','imageprocessingalgorithm\harmonica')) }
    
    $selectedPanels = $panelCheckboxes | Where-Object { $_.Checked } | ForEach-Object { "plugins\$($knownPanels[$_.Text])" }
    if ($selectedPanels.Count -gt 0) {
        $selectedComponents.Add('plugins')
        $selectedComponents.AddRange([string[]]$selectedPanels)
    }
    $uniqueSelected = $selectedComponents.ToArray() | Select-Object -Unique

    # 2. Define the absolute master order for all possible components
    $masterOrder = [System.Collections.Generic.List[string]]::new()
    $masterOrder.AddRange([string[]]@(
        'acq',
        'viewer',
        'imageprocessing',
        'imageprocessingalgorithm',
        'imageprocessingalgorithm\old',
        'imageprocessingalgorithm\harmonica',
        'plugins'
    ))
    # Add all known plugins to the master order list, sorted alphabetically
    $sortedPlugins = $knownPanels.Values | ForEach-Object { "plugins\$_" } | Sort-Object
    $masterOrder.AddRange([string[]]$sortedPlugins)

    # 3. Filter the master list to include only the selected components, preserving the master order
    $orderedComponents = $masterOrder | Where-Object { $uniqueSelected -contains $_ }
    $componentString = $orderedComponents -join ','

    # 4. Create the final config file content
    $configFileContent = @"
[Setup]
Lang=english
Dir={0}
Group=Voyance
NoIcons=0
SetupType=custom
Components={1}
Tasks=desktopicon
"@ -f $txtPath.Text, $componentString

    $outputPath = Join-Path -Path $PSScriptRoot -ChildPath 'voyance.inf'
    
    try {
        Set-Content -Encoding ASCII -Path $outputPath -Value $configFileContent -ErrorAction Stop
        [System.Windows.Forms.MessageBox]::Show("Config saved successfully to:`n$outputPath", "Success", "OK", "Information")
    } catch {
        [System.Windows.Forms.MessageBox]::Show("Failed to save config file:`n$($_.Exception.Message)", "Error", "OK", "Error")
    }
})

# --- Show Form ---
$form.Add_Shown({ $form.Activate() })
$form.ShowDialog()
$form.Dispose()