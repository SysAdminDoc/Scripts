# Get-TopLevelFolders.ps1 v1.0
# Lists all top-level folder names in a user-selected directory

Add-Type -AssemblyName System.Windows.Forms

$dialog = New-Object System.Windows.Forms.FolderBrowserDialog
$dialog.Description = "Select a directory to list top-level folders"
$dialog.RootFolder = [System.Environment+SpecialFolder]::MyComputer
$dialog.ShowNewFolderButton = $false

if ($dialog.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) {
    $path = $dialog.SelectedPath
    $folders = Get-ChildItem -Path $path -Directory | Sort-Object Name

    Write-Host "`n  Directory: $path" -ForegroundColor Cyan
    Write-Host "  Top-Level Folders: $($folders.Count)`n" -ForegroundColor DarkGray

    if ($folders.Count -eq 0) {
        Write-Host "  No folders found." -ForegroundColor Yellow
    } else {
        $folders | ForEach-Object { Write-Host "  $($_.Name)" }
    }

    # Copy to clipboard
    $list = ($folders | ForEach-Object { $_.Name }) -join "`r`n"
    Set-Clipboard -Value $list
    Write-Host "`n  Folder list copied to clipboard." -ForegroundColor Green
} else {
    Write-Host "  Cancelled." -ForegroundColor Yellow
}

Write-Host ""
pause
