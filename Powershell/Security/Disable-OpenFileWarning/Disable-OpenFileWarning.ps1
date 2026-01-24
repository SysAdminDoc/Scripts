<#
.SYNOPSIS
    Disables the "Open File - Security Warning" dialog for downloaded files.

.DESCRIPTION
    This script modifies Windows settings to prevent the security warning prompt
    that appears when opening files downloaded from the internet (Zone.Identifier/MOTW).

.NOTES
    Author: Claude
    Requires: Run as Administrator for HKLM changes (optional)
    Changes take effect immediately for new files; may require logoff for full effect.
#>

#Requires -Version 5.1

param(
    [switch]$Revert
)

$ErrorActionPreference = 'Stop'

function Write-Status {
    param([string]$Message, [string]$Type = 'Info')
    $prefix = switch ($Type) {
        'Info'    { '[*]' }
        'Success' { '[+]' }
        'Warning' { '[!]' }
        'Error'   { '[-]' }
    }
    Write-Host "$prefix $Message" -ForegroundColor $(switch ($Type) {
        'Info'    { 'Cyan' }
        'Success' { 'Green' }
        'Warning' { 'Yellow' }
        'Error'   { 'Red' }
    })
}

function Set-RegistryValue {
    param(
        [string]$Path,
        [string]$Name,
        [object]$Value,
        [string]$Type = 'DWord'
    )
    
    if (-not (Test-Path $Path)) {
        New-Item -Path $Path -Force | Out-Null
    }
    Set-ItemProperty -Path $Path -Name $Name -Value $Value -Type $Type
}

function Remove-RegistryValue {
    param(
        [string]$Path,
        [string]$Name
    )
    
    if (Test-Path $Path) {
        $prop = Get-ItemProperty -Path $Path -Name $Name -ErrorAction SilentlyContinue
        if ($prop) {
            Remove-ItemProperty -Path $Path -Name $Name -ErrorAction SilentlyContinue
        }
    }
}

# Registry paths
$AttachmentsPath = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Policies\Attachments'
$AssociationsPath = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Policies\Associations'
$InternetZonePath = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Internet Settings\Zones\3'

# Common file extensions to whitelist
$LowRiskExtensions = '.exe;.msi;.bat;.cmd;.ps1;.vbs;.js;.reg;.com;.scr;' +
                     '.txt;.log;.ini;.cfg;.conf;.xml;.json;.yaml;.yml;' +
                     '.doc;.docx;.xls;.xlsx;.ppt;.pptx;.pdf;' +
                     '.zip;.7z;.rar;.tar;.gz;' +
                     '.jpg;.jpeg;.png;.gif;.bmp;.ico;.svg;' +
                     '.mp3;.mp4;.avi;.mkv;.mov;.wmv;.flv;' +
                     '.html;.htm;.css;.php;.py;.rb;.pl;.sh'

Write-Host ''
Write-Host '================================================' -ForegroundColor Magenta
Write-Host '      Open File Security Warning Manager        ' -ForegroundColor Magenta
Write-Host '================================================' -ForegroundColor Magenta
Write-Host ''

if ($Revert) {
    Write-Status 'Reverting changes - Re-enabling security warnings...' 'Warning'
    
    try {
        # Remove our custom settings
        Remove-RegistryValue -Path $AttachmentsPath -Name 'SaveZoneInformation'
        Remove-RegistryValue -Path $AttachmentsPath -Name 'ScanWithAntiVirus'
        Remove-RegistryValue -Path $AssociationsPath -Name 'LowRiskFileTypes'
        Remove-RegistryValue -Path $InternetZonePath -Name '1806'
        
        Write-Status 'Security warnings have been re-enabled.' 'Success'
        Write-Status 'You may need to log off for all changes to take effect.' 'Info'
    }
    catch {
        Write-Status "Error reverting: $_" 'Error'
        exit 1
    }
}
else {
    Write-Status 'Disabling Open File Security Warning dialog...' 'Info'
    Write-Host ''
    
    try {
        # Method 1: Disable Zone.Identifier (Mark of the Web) saving
        # Value 1 = Do not preserve zone information
        Write-Status 'Disabling Zone.Identifier preservation...' 'Info'
        Set-RegistryValue -Path $AttachmentsPath -Name 'SaveZoneInformation' -Value 1
        
        # Method 2: Set file types as low risk
        Write-Status 'Adding common file types to low-risk list...' 'Info'
        Set-RegistryValue -Path $AssociationsPath -Name 'LowRiskFileTypes' -Value $LowRiskExtensions -Type 'String'
        
        # Method 3: Disable the launching applications prompt for Internet zone
        # Value 0 = Enable (prompt), 3 = Disable (no prompt)
        Write-Status 'Disabling launch prompt for Internet zone...' 'Info'
        Set-RegistryValue -Path $InternetZonePath -Name '1806' -Value 0
        
        # Method 4: Disable antivirus scan prompt (optional, reduces another prompt)
        # Value 1 = Off, 2 = Optional, 3 = On
        Write-Status 'Adjusting antivirus scan behavior...' 'Info'
        Set-RegistryValue -Path $AttachmentsPath -Name 'ScanWithAntiVirus' -Value 1
        
        Write-Host ''
        Write-Host '------------------------------------------------' -ForegroundColor DarkGray
        Write-Status 'All changes applied successfully!' 'Success'
        Write-Host '------------------------------------------------' -ForegroundColor DarkGray
        Write-Host ''
        Write-Status 'Changes take effect immediately for most files.' 'Info'
        Write-Status 'Log off and back on for complete effect.' 'Info'
        Write-Host ''
        Write-Status 'To revert these changes, run:' 'Info'
        Write-Host '    .\Disable-OpenFileWarning.ps1 -Revert' -ForegroundColor White
        Write-Host ''
    }
    catch {
        Write-Status "Error applying changes: $_" 'Error'
        exit 1
    }
}

Write-Host ''
