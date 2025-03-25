# Remove the New Outlook App
Write-Host "Removing New Outlook..." -ForegroundColor Yellow
Get-AppxPackage -Name "microsoft.officehub" -AllUsers | Remove-AppxPackage -AllUsers
# Remove from current user as well
Get-AppxPackage -Name "microsoft.officehub" | Remove-AppxPackage

# Rename Outlook (classic) shortcut

$classicName = "Outlook (classic).lnk"
$newName = "Outlook.lnk"

# Paths to Start Menu locations
$paths = @(
    "$env:ProgramData\Microsoft\Windows\Start Menu\Programs",
    "$env:APPDATA\Microsoft\Windows\Start Menu\Programs"
)

foreach ($path in $paths) {
    $shortcut = Join-Path $path $classicName
    if (Test-Path $shortcut) {
        $newShortcut = Join-Path $path $newName
        Rename-Item -Path $shortcut -NewName $newName -Force
        Write-Host "Renamed shortcut at: $shortcut" -ForegroundColor Green
    }
}

