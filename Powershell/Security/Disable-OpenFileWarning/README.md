# Disable-OpenFileWarning

A PowerShell utility to disable the Windows "Open File - Security Warning" dialog that appears when running downloaded files.

![Windows Security Warning](https://i.imgur.com/placeholder.png)

## The Problem

Every time you open a file downloaded from the internet, Windows displays a security warning dialog requiring an extra click to proceed. While intended as a safety measure, this becomes tedious for power users who frequently download and run legitimate software.

This warning is triggered by the **Zone.Identifier** (also known as Mark of the Web or MOTW) - an NTFS alternate data stream that Windows attaches to files downloaded from the internet.

## What This Script Does

The script disables the security warning through four registry modifications:

| Setting | Registry Path | Effect |
|---------|---------------|--------|
| SaveZoneInformation | `HKCU:\...\Policies\Attachments` | Stops Windows from tagging new downloads with Zone.Identifier |
| LowRiskFileTypes | `HKCU:\...\Policies\Associations` | Marks common extensions as trusted |
| Zone 3 Policy 1806 | `HKCU:\...\Internet Settings\Zones\3` | Disables launch prompt for Internet zone |
| ScanWithAntiVirus | `HKCU:\...\Policies\Attachments` | Adjusts AV scan prompt behavior |

All changes are made to `HKCU` (Current User) - no administrator privileges required.

## Installation

1. Download `Disable-OpenFileWarning.ps1`
2. Place it anywhere convenient (e.g., `C:\Scripts\`)

## Usage

### Disable the Warning

```powershell
.\Disable-OpenFileWarning.ps1
```

### Re-enable the Warning

```powershell
.\Disable-OpenFileWarning.ps1 -Revert
```

## File Types Whitelisted

The script adds these extensions to the low-risk list:

| Category | Extensions |
|----------|------------|
| Executables | `.exe` `.msi` `.bat` `.cmd` `.ps1` `.vbs` `.js` `.reg` `.com` `.scr` |
| Documents | `.txt` `.log` `.ini` `.cfg` `.conf` `.xml` `.json` `.yaml` `.yml` |
| Office | `.doc` `.docx` `.xls` `.xlsx` `.ppt` `.pptx` `.pdf` |
| Archives | `.zip` `.7z` `.rar` `.tar` `.gz` |
| Images | `.jpg` `.jpeg` `.png` `.gif` `.bmp` `.ico` `.svg` |
| Media | `.mp3` `.mp4` `.avi` `.mkv` `.mov` `.wmv` `.flv` |
| Code | `.html` `.htm` `.css` `.php` `.py` `.rb` `.pl` `.sh` |

## When Changes Take Effect

- **Immediately**: Most files will open without the warning right away
- **After Logoff/Logon**: Full effect for all scenarios

## Existing Files

Files downloaded *before* running this script will still have Zone.Identifier streams attached. To remove them from existing files:

```powershell
# Remove from a single file
Unblock-File -Path "C:\Downloads\setup.exe"

# Remove from all files in a folder
Get-ChildItem -Path "C:\Downloads" -Recurse | Unblock-File
```

## Security Considerations

Disabling this warning removes a layer of protection against accidentally running malicious files. Only use this if you:

- Understand the risks of running untrusted executables
- Have reliable antivirus protection
- Are confident in your ability to identify suspicious files
- Download software from trusted sources

## Reverting Changes

The script includes a built-in revert option that removes all registry modifications:

```powershell
.\Disable-OpenFileWarning.ps1 -Revert
```

This restores Windows default behavior.

## Requirements

- Windows 10 / 11
- PowerShell 5.1 or later
- No administrator privileges required

## How It Works

Windows uses the Attachment Execution Service (AES) to determine how to handle files based on:

1. **Zone Information**: Where the file came from (Internet, Intranet, Local)
2. **File Type**: Whether the extension is considered high or low risk
3. **Publisher**: Whether the file has a valid digital signature

This script modifies the policies that control these checks at the user level, effectively telling Windows to trust files regardless of their origin zone.

## License

MIT License - Use freely at your own risk.
