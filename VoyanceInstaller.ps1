# ===================== Installer-AlwaysManual.ps1 =====================
# This script always launches the manual GUI to configure the Voyance installation.

# ===================== CONFIG =====================
$baseRoot = "C:\Maven\Voyance"
$notesBase = "C:\Maven\VoyanceReleaseNotes"
$tempProfile = "$env:TEMP\voyance_edge_profile"
$targetPage = "https://medicatechusa.com/voyance/"
$edgePath = "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe"
$qpdfDir = Join-Path $notesBase "qpdf"
$qpdfZip = Join-Path $qpdfDir "qpdf.zip"
$qpdfUrl = "https://github.com/qpdf/qpdf/releases/download/v12.2.0/qpdf-12.2.0-msvc64.zip"

# Known panel mapping for the GUI
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

function Show-ConfigMaker-GUI {
    Add-Type -AssemblyName System.Windows.Forms
    Add-Type -AssemblyName System.Drawing

    # UI Theming
    $darkBack = [System.Drawing.Color]::FromArgb(30, 30, 30)
    $darkFore = [System.Drawing.Color]::White
    $btnBack  = [System.Drawing.Color]::FromArgb(60, 60, 60)
    $btnBlue  = [System.Drawing.Color]::FromArgb(50, 150, 255)
    $btnGreen = [System.Drawing.Color]::FromArgb(50, 180, 85)

    # Main Form
    $form = New-Object System.Windows.Forms.Form -Property @{
        Text            = 'Voyance Manual Config'
        Size            = New-Object System.Drawing.Size(700, 600)
        BackColor       = $darkBack
        ForeColor       = $darkFore
        StartPosition   = 'CenterScreen'
        FormBorderStyle = 'FixedDialog'
        MaximizeBox     = $false
        Tag             = $null # Used to return the component string
    }

    # Install Path Controls
    $form.Controls.Add((New-Object System.Windows.Forms.Label -Property @{ Text = 'Install Path:'; Location = New-Object System.Drawing.Point(10, 15); Size = New-Object System.Drawing.Size(100, 20) }))
    $txtPath = New-Object System.Windows.Forms.TextBox -Property @{ Text = 'C:\Program Files\Voyance'; Location = New-Object System.Drawing.Point(110, 12); Size = New-Object System.Drawing.Size(460, 20); BackColor = $darkBack; ForeColor = $darkFore }
    $form.Controls.Add($txtPath)
    $btnBrowse = New-Object System.Windows.Forms.Button -Property @{ Text = 'Browse'; Location = New-Object System.Drawing.Point(580, 10); Size = New-Object System.Drawing.Size(80, 24); BackColor = $btnBlue; ForeColor = $darkFore }
    $form.Controls.Add($btnBrowse)
    $btnBrowse.Add_Click({
        $dlg = New-Object System.Windows.Forms.FolderBrowserDialog
        if ($dlg.ShowDialog() -eq 'OK') { $txtPath.Text = $dlg.SelectedPath }
    })

    # Helper function
    function Add-Cb {
        param($parent, $text, $default)
        $cb = New-Object System.Windows.Forms.CheckBox -Property @{ Text = $text; Size = New-Object System.Drawing.Size(180, 20); Checked = $default; BackColor = $darkBack; ForeColor = $darkFore; Margin = New-Object System.Windows.Forms.Padding(10, 5, 10, 5) }
        $parent.Controls.Add($cb)
        return $cb
    }

    # Core Components
    $groupCore = New-Object System.Windows.Forms.GroupBox -Property @{ Text = "Core Components"; Location = New-Object System.Drawing.Point(10, 45); Size = New-Object System.Drawing.Size(660, 130); ForeColor = $darkFore }
    $form.Controls.Add($groupCore)
    $cbVoyance   = Add-Cb $groupCore 'Voyance Acquisition' $true
    $cbViewer    = Add-Cb $groupCore 'Voyance Viewer' $false
    $cbStandard  = Add-Cb $groupCore 'Standard Processing' $true
    $cbHarmonica = Add-Cb $groupCore 'Harmonica' $false
    $cbHDR       = Add-Cb $groupCore 'HDR' $false
    $cbVoyance.Location   = New-Object System.Drawing.Point(10, 25); $cbViewer.Location = New-Object System.Drawing.Point(10, 50)
    $cbStandard.Location  = New-Object System.Drawing.Point(220, 25); $cbHarmonica.Location = New-Object System.Drawing.Point(220, 50); $cbHDR.Location = New-Object System.Drawing.Point(220, 75)
    $cbStandard.Add_CheckedChanged({ if ($cbStandard.Checked) { $cbHarmonica.Checked = $false } })
    $cbHarmonica.Add_CheckedChanged({ if ($cbHarmonica.Checked){ $cbStandard.Checked = $false } })

    # DR Panels
    $groupPanels = New-Object System.Windows.Forms.GroupBox -Property @{ Text = "Select DR Panels"; Location = New-Object System.Drawing.Point(10, 185); Size = New-Object System.Drawing.Size(660, 310); ForeColor = $darkFore }
    $form.Controls.Add($groupPanels)
    $panelContainer = New-Object System.Windows.Forms.FlowLayoutPanel -Property @{ Dock = 'Fill'; FlowDirection = 'TopDown'; AutoScroll = $true }
    $groupPanels.Controls.Add($panelContainer)
    $btnSelectAll = New-Object System.Windows.Forms.Button -Property @{ Text = 'Select All'; Size = New-Object System.Drawing.Size(120, 24); BackColor = $btnBlue; ForeColor = $darkFore }
    $btnClearAll  = New-Object System.Windows.Forms.Button -Property @{ Text = 'Clear All'; Size = New-Object System.Drawing.Size(120, 24); BackColor = $btnBack; ForeColor = $darkFore }
    $buttonPanel = New-Object System.Windows.Forms.FlowLayoutPanel -Property @{ FlowDirection = 'LeftToRight'; Dock = 'Top'; Height = 30; RightToLeft = 'Yes' }
    $buttonPanel.Controls.AddRange(@($btnClearAll, $btnSelectAll))
    $groupPanels.Controls.Add($buttonPanel)

    $localKnownPanels = [ordered]@{
        'CareRay'='careray'; 'CPI Generator'='cpi'; 'Drgem'='drgem'; 'DRTECH'='drtech'; 'FutrewayTec'='futuraytec'; 'Hamamatsu'='hamamatsu'; 'iRay'='iray'; 'IQFlex'='iqflex'; 'MasterX800'='masterx800'; 'MasterX900'='masterx900'; 'MasterX'='masterx'; 'PaXscan'='paxscan'; 'Perkin Elmer'='perkinelmer'; 'PowerSite'='powersite'; 'PZ Medical'='pzmedical'; 'Simulator'='simulator'; 'Toshiba'='toshiba'; 'Vieworks'='vieworks'
    }
    $panelCheckboxes = foreach ($key in $localKnownPanels.Keys) { Add-Cb $panelContainer $key $false }
    $btnSelectAll.Add_Click({ foreach ($cb in $panelCheckboxes) { $cb.Checked = $true } })
    $btnClearAll.Add_Click({ foreach ($cb in $panelCheckboxes) { $cb.Checked = $false } })

    # Continue Button
    $btnCreate = New-Object System.Windows.Forms.Button -Property @{ Text = 'Use This Configuration'; Location = New-Object System.Drawing.Point(260, 510); Size = New-Object System.Drawing.Size(180, 30); BackColor = $btnGreen; ForeColor = $darkFore }
    $form.Controls.Add($btnCreate)
    $btnCreate.Add_Click({
        $selectedComponents = [System.Collections.Generic.List[string]]::new()
        if ($cbVoyance.Checked)   { $selectedComponents.Add('acq') }
        if ($cbViewer.Checked)    { $selectedComponents.Add('viewer') }
        if ($cbHDR.Checked)       { $selectedComponents.Add('imageprocessing') }
        if ($cbStandard.Checked)  { $selectedComponents.AddRange([string[]]@('imageprocessingalgorithm','imageprocessingalgorithm\old')) }
        if ($cbHarmonica.Checked) { $selectedComponents.AddRange([string[]]@('imageprocessingalgorithm','imageprocessingalgorithm\harmonica')) }
        
        $selectedPanels = $panelCheckboxes | Where-Object { $_.Checked } | ForEach-Object { "plugins\$($localKnownPanels[$_.Text])" }
        if ($selectedPanels.Count -gt 0) {
            $selectedComponents.Add('plugins')
            $selectedComponents.AddRange([string[]]$selectedPanels)
        }
        $uniqueSelected = $selectedComponents.ToArray() | Select-Object -Unique

        $masterOrder = [System.Collections.Generic.List[string]]::new()
        $masterOrder.AddRange([string[]]@('acq','viewer','imageprocessing','imageprocessingalgorithm','imageprocessingalgorithm\old','imageprocessingalgorithm\harmonica','plugins'))
        $sortedPlugins = $localKnownPanels.Values | ForEach-Object { "plugins\$_" } | Sort-Object
        $masterOrder.AddRange([string[]]$sortedPlugins)

        $orderedComponents = $masterOrder | Where-Object { $uniqueSelected -contains $_ }
        
        $form.Tag = $orderedComponents -join ','
        $form.Close()
    })

    $form.ShowDialog() | Out-Null
    return $form.Tag
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
Components=$components
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

# ===================== RUN =====================
try {
    $dl = Download-VoyanceInstaller
    $installer = $dl.Path
    $versionDir = $dl.WorkDir
    $infPath = Join-Path $versionDir "voyance.inf"
    
    # --- MODIFIED: Always launch the GUI for manual configuration ---
    Write-Host "Launching Manual Config Maker..."
    $finalComponentString = Show-ConfigMaker-GUI

    if ([string]::IsNullOrEmpty($finalComponentString)) {
        throw "Configuration was cancelled or no components were selected."
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
    Generate-INF -components $finalComponentString -path $infPath
    Write-Host "Generated voyance.inf with components: $finalComponentString"

    $logPath = Join-Path $versionDir "voyance_install.log"
    $installArgs = "/VERYSILENT /NORESTART /LOADINF=`"$infPath`" /LOG=`"$logPath`""
    
    Write-Host "Starting Voyance installation..."
    Start-Process $installer -ArgumentList $installArgs -Wait
    Write-Host "Voyance installation process finished."

    Process-ReleaseNotes $versionDir

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