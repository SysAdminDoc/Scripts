# ===================== CONFIG =====================
$baseRoot = "C:\Maven\Voyance"
$notesBase = "C:\Maven\VoyanceReleaseNotes"
$tempProfile = "$env:TEMP\voyance_edge_profile"
$targetPage = "https://medicatechusa.com/voyance/"
$edgePath = "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe"
$qpdfDir = Join-Path $notesBase "qpdf"
$qpdfZip = Join-Path $qpdfDir "qpdf.zip"
$qpdfUrl = "https://github.com/qpdf/qpdf/releases/download/v12.2.0/qpdf-12.2.0-msvc64.zip"

# Known panel mapping
$knownPanels = @{
    "CareRay"     = "careray"
    "CPI Generator" = "cpi"
    "Drgem"       = "drgem"
    "DRTECH"      = "drtech"
    "FutrewayTec" = "futuraytec"
    "Hamamatsu"   = "hamamatsu"
    "iRay"        = "iray"
    "IQFlex"      = "iqflex"
    "MasterX800"  = "masterx800"
    "MasterX900"  = "masterx900"
    "MasterX"     = "masterx"
    "PaXscan"     = "paxscan"
    "Perkin Elmer"= "perkinelmer"
    "PowerSite"   = "powersite"
    "PZ Medical"  = "pzmedical"
    "Simulator"   = "simulator"
    "Toshiba"     = "toshiba"
    "Vieworks"    = "vieworks"
}
$baseComponents = @("acq", "imageprocessingalgorithm", "imageprocessingalgorithm\old", "plugins")

# ===================== FUNCTIONS =====================

function Get-WebContentWithEdge {
    param(
        [string]$Url
    )
    $tempDumpFile = Join-Path $env:TEMP "dom_dump_$(Get-Random).html"
    if (-not (Test-Path $edgePath)) {
        throw "Microsoft Edge application not found at $edgePath"
    }

    $arguments = @(
        "--headless", "--disable-gpu",
        "--user-data-dir=$tempProfile", "--no-first-run",
        "--no-default-browser-check", "--dump-dom", $Url
    )

    Start-Process -FilePath $edgePath -ArgumentList $arguments -RedirectStandardOutput $tempDumpFile -NoNewWindow -Wait

    if (-not (Test-Path $tempDumpFile) -or (Get-Item $tempDumpFile).Length -eq 0) {
        throw "Failed to dump the DOM from $Url"
    }

    $content = Get-Content $tempDumpFile -Raw
    Remove-Item $tempDumpFile -Force
    return $content
}

function Show-GUI {
    param(
        [parameter(Mandatory=$true)]
        [hashtable]$knownPanels
    )

    Add-Type -AssemblyName System.Windows.Forms
    Add-Type -AssemblyName System.Drawing

    $font     = New-Object System.Drawing.Font('Segoe UI', 9)
    $darkBack = [System.Drawing.Color]::FromArgb(45, 45, 48)
    $darkMid  = [System.Drawing.Color]::FromArgb(60, 60, 63)
    $darkFore = [System.Drawing.Color]::White
    $btnGreen = [System.Drawing.Color]::FromArgb(34, 139, 34)

    $form = New-Object System.Windows.Forms.Form -Property @{
        Text            = 'Panel Installation'
        Size            = New-Object System.Drawing.Size(520, 580)
        BackColor       = $darkBack
        ForeColor       = $darkFore
        StartPosition   = 'CenterScreen'
        FormBorderStyle = 'FixedDialog'
        Font            = $font
    }

    $label = New-Object System.Windows.Forms.Label -Property @{
        Text     = "No Voyance panels were detected. Please select the panels to include in the installation."
        Location = New-Object System.Drawing.Point(10, 10)
        Size     = New-Object System.Drawing.Size(480, 40)
    }
    $form.Controls.Add($label)

    $groupPanels = New-Object System.Windows.Forms.GroupBox -Property @{
        Text      = "Available DR Panels"
        Location  = New-Object System.Drawing.Point(10, 55)
        Size      = New-Object System.Drawing.Size(485, 400)
        ForeColor = $darkFore
    }
    $form.Controls.Add($groupPanels)

    $panelContainer = New-Object System.Windows.Forms.FlowLayoutPanel -Property @{
        Dock          = 'Fill'
        FlowDirection = 'TopDown'
        AutoScroll    = $true
        Padding       = New-Object System.Windows.Forms.Padding(10)
    }
    $groupPanels.Controls.Add($panelContainer)

    function Add-ModernButton {
        param($parent, $text, $location, $size, $backColor)
        $btn = New-Object System.Windows.Forms.Button -Property @{ Text = $text; Location = $location; Size = $size; BackColor = $backColor; ForeColor = $darkFore; FlatStyle = 'Flat' }
        $btn.FlatAppearance.BorderSize = 0
        $parent.Controls.Add($btn)
        return $btn
    }

    $btnClearAll  = Add-ModernButton $groupPanels '❌ Clear All' (New-Object System.Drawing.Point(370, -2)) (New-Object System.Drawing.Size(110, 22)) $darkMid

    $checkboxes = @{}
    foreach ($name in $knownPanels.Keys | Sort-Object) {
        $cb = New-Object System.Windows.Forms.CheckBox -Property @{ Text = $name; Size = New-Object System.Drawing.Size(200, 22); Margin  = New-Object System.Windows.Forms.Padding(5) }
        $panelContainer.Controls.Add($cb)
        $checkboxes[$name] = $cb
    }

    $btnClearAll.Add_Click({ foreach ($cb in $checkboxes.Values) { $cb.Checked = $false } })

    $okButton = Add-ModernButton $form 'Continue Installation' (New-Object System.Drawing.Point(150, 475)) (New-Object System.Drawing.Size(200, 35)) $btnGreen
    $okButton.DialogResult = 'OK'
    $form.AcceptButton = $okButton

    $form.Add_FormClosing({
        if ($form.DialogResult -ne 'OK') {
            if ([System.Windows.Forms.MessageBox]::Show("Are you sure you want to cancel the installation?", "Cancel Installation", "YesNo", "Warning") -eq "No") {
                $_.Cancel = $true
            }
        }
    })

    $result = $form.ShowDialog()

    if ($result -ne 'OK') {
        Write-Host "Installation cancelled by user."
        exit
    }

    $selected = @()
    foreach ($name in $checkboxes.Keys) {
        if ($checkboxes[$name].Checked) {
            $selected += $knownPanels[$name]
        }
    }
    return $selected
}

function Download-VoyanceInstaller {
    $content = Get-WebContentWithEdge -Url $targetPage

    $downloadLink = ($content -split "`n" | Where-Object {
        ($_ -match 'href="([^"]+Voyance[^"]+\.exe)"') -and ($_ -notmatch 'Viewer') -and ($_ -notmatch 'beta')
    }) | Select-String -Pattern 'href="([^"]+Voyance[^"]+\.exe)"' |
        ForEach-Object { ($_ -match 'href="([^"]+\.exe)"') | Out-Null; $matches[1] } |
        Select-Object -First 1

    if (-not $downloadLink) { throw "No Voyance installer found." }

    if ($downloadLink -notmatch '^https?://') {
        $uri = [uri]::new($targetPage, $downloadLink)
        $downloadLink = $uri.AbsoluteUri
    }

    $fileName = [System.Net.WebUtility]::UrlDecode([System.IO.Path]::GetFileName($downloadLink))
    if ($fileName -notmatch "Voyance_v([\d\.]+)_") { throw "Version not found in filename." }
    $version = $matches[1]
    $versionDir = Join-Path $baseRoot "v$version"

    if (-not (Test-Path $versionDir)) { New-Item $versionDir -ItemType Directory | Out-Null }

    $installerPath = Join-Path $versionDir $fileName

    if (-not (Test-Path $installerPath)) {
        Write-Host "Downloading Voyance Installer v$version..."
        Start-BitsTransfer -Source $downloadLink -Destination $installerPath -ErrorAction Stop
        Write-Host "Download complete."
    }

    return @{
        Path    = $installerPath
        Version = $version
        WorkDir = $versionDir
    }
}

function Generate-INF($components, $path) {
    $inf = @"
[Setup]
Lang=english
Dir=C:\Program Files\Voyance
Group=Voyance
NoIcons=0
SetupType=custom
Components=$($components -join ",")
Tasks=desktopicon
"@
    $inf | Set-Content -Path $path -Encoding ASCII
}

function Process-ReleaseNotes($versionDir) {
    New-Item -Force -ItemType Directory -Path $notesBase, $qpdfDir, $tempProfile | Out-Null
    
    $html = Get-WebContentWithEdge -Url $targetPage
    
    $pdfLinks = Select-String -InputObject $html -Pattern 'href="([^"]+\.pdf)"' -AllMatches |
        ForEach-Object { $_.Matches } |
        ForEach-Object { $_.Groups[1].Value } |
        ForEach-Object {
            if ($_ -notmatch '^https?://') {
                [uri]::new($targetPage, $_).AbsoluteUri
            } else { $_ }
        } | Sort-Object -Unique

    $releaseNotes = $pdfLinks | Where-Object { $_ -match 'voyance.*release.*\.pdf' -and $_ -notmatch 'beta' }
    if (-not $releaseNotes) { Write-Warning "No release notes found."; return }

    $qpdfExe = Get-ChildItem -Path $qpdfDir -Recurse -Filter qpdf.exe -ErrorAction SilentlyContinue | Select-Object -First 1
    if (-not $qpdfExe) {
        Write-Host "Downloading qpdf..."
        Start-BitsTransfer -Source $qpdfUrl -Destination $qpdfZip -ErrorAction Stop
        Add-Type -AssemblyName System.IO.Compression.FileSystem
        [System.IO.Compression.ZipFile]::ExtractToDirectory($qpdfZip, $qpdfDir)
        Remove-Item $qpdfZip
        $qpdfExe = Get-ChildItem -Path $qpdfDir -Recurse -Filter qpdf.exe | Select-Object -First 1
        if (-not $qpdfExe) { Write-Error "qpdf missing."; return }
    }
    $qpdfExe = $qpdfExe.FullName

    foreach ($url in $releaseNotes) {
        $pdfName = "ReleaseNotes.pdf"
        $inFile = Join-Path $notesBase $pdfName
        $outFile = Join-Path $notesBase "cleaned_$pdfName"

        try {
            Start-BitsTransfer -Source $url -Destination $inFile -ErrorAction Stop
            & $qpdfExe --empty --pages "$inFile" 2-z -- "$outFile"
            if (Test-Path $outFile) {
                Remove-Item $inFile -Force
                Rename-Item $outFile $inFile
                Copy-Item $inFile -Destination (Join-Path $versionDir $pdfName) -Force
            }
        } catch {
            Write-Warning "Failed to process: $url"
        }
    }
    Remove-Item $tempProfile -Recurse -Force -ErrorAction SilentlyContinue
}

# --- Function to create and compile the ConfigMaker EXE ---
function Create-ConfigMaker-Exe {
    Write-Host "🎁 Starting ConfigMaker EXE creation..."

    # Step 1: Define the content of the ConfigMaker script
    # Using a single-quoted here-string (@'') is crucial to prevent PowerShell
    # from trying to expand variables like $form or $PSScriptRoot inside the string.
    $configMakerScriptContent = @'
# ===================== ConfigMaker_Final.ps1 =====================
# Standalone GUI tool to generate custom Voyance config files

# No longer need to detect script path, it will be hardcoded.

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

    # MODIFIED: Hardcode the output path to resolve issues in the compiled EXE.
    $outputPath = "C:\Maven\Voyance\voyance.inf"
    
    try {
        # Ensure the directory exists before saving
        $outputDir = Split-Path -Path $outputPath -Parent
        if (-not (Test-Path $outputDir)) {
            New-Item -ItemType Directory -Path $outputDir -Force | Out-Null
        }
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
'@

    # --- Define paths and download icon ---
    $outputDir = "C:\Maven\Voyance"
    $tempScriptPath = Join-Path $env:TEMP "ConfigMaker.ps1"
    $iconUrl = "https://raw.githubusercontent.com/SysAdminDoc/Scripts/refs/heads/main/MavenLogo.ico"
    $iconPath = Join-Path $env:TEMP "MavenLogo.ico"
    $exeOutputPath = Join-Path $outputDir "ConfigMaker.exe"
    
    try {
        # Create output directory if it doesn't exist
        New-Item -Path $outputDir -ItemType Directory -Force | Out-Null
        
        # Write the script content to a temporary file
        Set-Content -Path $tempScriptPath -Value $configMakerScriptContent

        # Download the icon
        Write-Host "Downloading application icon..."
        Start-BitsTransfer -Source $iconUrl -Destination $iconPath -ErrorAction Stop

        # Ensure PS2EXE is installed
        if (-not (Get-Module -ListAvailable -Name PS2EXE)) {
            Write-Host "PS2EXE module not found. Installing from PSGallery..."
            Install-Module -Name PS2EXE -Repository PSGallery -Force -Scope CurrentUser -ErrorAction Stop
        }

        # Compile the script to an EXE
        Write-Host "Compiling $tempScriptPath to EXE..."
        Import-Module PS2EXE
        ps2exe -inputFile $tempScriptPath -outputFile $exeOutputPath -iconFile $iconPath -noConsole

        if (Test-Path $exeOutputPath) {
            Write-Host "✅ Successfully created ConfigMaker.exe at $exeOutputPath"
        } else {
            Write-Warning "Failed to create ConfigMaker.exe."
        }
    } catch {
        Write-Error "An error occurred during the EXE creation process: $($_.Exception.Message)"
    } finally {
        # Clean up temporary files
        Remove-Item $tempScriptPath -ErrorAction SilentlyContinue
        Remove-Item $iconPath -ErrorAction SilentlyContinue
    }
}


# ===================== RUN =====================
try {
    $dl = Download-VoyanceInstaller
    $installer = $dl.Path
    $versionDir = $dl.WorkDir
    $infPath = Join-Path $versionDir "voyance.inf"
    $hardwarePath = "C:\Program Files\Voyance\Hardware"
    
    # --- Panel detection happens BEFORE backup and uninstall ---
    $panelComponents = @()
    if (Test-Path $hardwarePath) {
        $found = Get-ChildItem -Path $hardwarePath -Directory | Select-Object -ExpandProperty Name
        if ($found.Count -gt 0) {
            Write-Host "Detected installed panels: $($found -join ', ')"
            foreach ($folder in $found) {
                if ($knownPanels.ContainsKey($folder)) {
                    $pluginValue = $knownPanels[$folder]
                    $panelComponents += "plugins\$pluginValue"
                    Write-Host "  -> Matched folder '$folder' to component 'plugins\$pluginValue'"
                }
            }
        }
    }

    # If after checking, no known panels were found, THEN show the GUI
    if ($panelComponents.Count -eq 0) {
        Write-Host "No recognized panels detected. Prompting user for selection."
        $selectedPanels = Show-GUI -knownPanels $knownPanels
        if ($selectedPanels) {
            $panelComponents = $selectedPanels | ForEach-Object { "plugins\$_" }
        } else {
            Write-Host "No panels selected. Continuing with base installation only."
        }
    }
    
    # Backup existing configuration before uninstalling
    $backupDir = Join-Path $versionDir "Backup Config"
    Write-Host "Creating backup directory at $backupDir..."
    New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
    
    $progFilesSource = "C:\Program Files\Voyance\Hardware"
    $progDataSource = "C:\ProgramData\Voyance"

    if (Test-Path $progFilesSource) {
        Write-Host "Backing up $progFilesSource..."
        Copy-Item -Path $progFilesSource -Destination $backupDir -Recurse -Force
    }
    if (Test-Path $progDataSource) {
        Write-Host "Backing up $progDataSource..."
        Copy-Item -Path $progDataSource -Destination $backupDir -Recurse -Force
    }

    # Uninstall previous Voyance version
    Write-Host "Checking for existing Voyance installation to uninstall..."
    $uninstallKey = Get-ItemProperty "HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*" |
        Where-Object { $_.DisplayName -like "Voyance*" }

    if ($uninstallKey -and $uninstallKey.UninstallString) {
        Write-Host "Found existing Voyance version. Uninstalling silently..."
        $cmd = $uninstallKey.UninstallString -replace '"$', '' -replace '^"', ''
        Start-Process $cmd -ArgumentList "/VERYSILENT /NORESTART" -Wait
        Write-Host "Uninstall complete."
    } else {
        Write-Host "No previous Voyance installation found."
    }

    # Generate Config and Install
    Generate-INF ($baseComponents + $panelComponents) $infPath
    Write-Host "Generated voyance.inf with components: $(($baseComponents + $panelComponents) -join ', ')"

    $logPath = Join-Path $versionDir "voyance_install.log"
    $installArgs = "/VERYSILENT /NORESTART /LOADINF=`"$infPath`" /LOG=`"$logPath`""
    
    Write-Host "Starting Voyance installation..."
    Start-Process $installer -ArgumentList $installArgs -Wait
    Write-Host "Voyance installation process finished."

    Process-ReleaseNotes $versionDir
    
    # --- Call the function to create the bonus EXE ---
    Create-ConfigMaker-Exe

    Write-Host "Script finished."

} catch {
    Write-Error "An unhandled error occurred: $($_.Exception.Message)"
    if (Test-Path $tempProfile) {
        Remove-Item $tempProfile -Recurse -Force -ErrorAction SilentlyContinue
    }
} finally {
    if (Test-Path $tempProfile) {
        Remove-Item $tempProfile -Recurse -Force -ErrorAction SilentlyContinue
    }
}