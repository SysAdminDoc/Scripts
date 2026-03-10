# Scripts

![License](https://img.shields.io/badge/license-MIT-blue)
![Languages](https://img.shields.io/badge/languages-PowerShell%20%7C%20JavaScript-blue)

A collection of PowerShell scripts and userscripts for Windows system administration, debloating, network management, security hardening, browser customization, and more. Each script is standalone and self-contained.

## PowerShell Scripts

### Adobe
| Script | Description |
|--------|-------------|
| [Disable-AdobeTelemetry.ps1](Powershell/Adobe/Disable-AdobeTelemetry.ps1) | Disables Adobe telemetry, tracking, and background reporting across all installed Adobe products |

### Archive Extraction
| Script | Description |
|--------|-------------|
| [ExtractorX.ps1](Powershell/ArchiveExtraction/ExtractorX.ps1) | Full-featured WPF GUI for extracting archives (ZIP, RAR, 7z, TAR, etc.) with batch processing and progress tracking |

### Debloat
| Script | Description |
|--------|-------------|
| [NuclearDellRemover.ps1](Powershell/Debloat/NuclearDellRemover.ps1) | Aggressively removes all Dell bloatware, OEM apps, and manufacturer telemetry from Dell systems |
| [SoftwareScannerGUI.ps1](Powershell/Debloat/SoftwareScannerGUI.ps1) | WPF GUI scanner that inventories installed software and flags bloatware, trials, and unwanted apps |
| [Debloat-Win11/](Powershell/Debloat/Debloat-Win11) | Windows 11 debloat scripts — removes pre-installed apps, disables telemetry, and cleans up the Start menu |
| [Restore-Rebloat/](Powershell/Debloat/Restore-Rebloat) | Companion scripts to restore any previously removed Windows apps and features |

### File Associations
| Script | Description |
|--------|-------------|
| [PS1FileAssociation.ps1](Powershell/FileAssoc/PS1FileAssociation.ps1) | Fixes `.ps1` file associations so PowerShell scripts open correctly in ISE or the default editor instead of Notepad |

### Network
| Script | Description |
|--------|-------------|
| [NetForge.ps1](Powershell/Network/NetForge.ps1) | Comprehensive WPF network management GUI — configure adapters, DNS, firewall rules, diagnostics, and ping/trace tools |

### Personalization
| Script | Description |
|--------|-------------|
| [ThemeCleaner.ps1](Powershell/Personalization/ThemeCleaner.ps1) | Removes orphaned Windows theme files, cleans up custom theme cache, and resets theme settings to defaults |

### Security
| Script | Description |
|--------|-------------|
| [Defender/DefenderControl/](Powershell/Security/Defender/DefenderControl) | Scripts to enable, disable, and configure Windows Defender programmatically |
| [Defender/DefenderShield/](Powershell/Security/Defender/DefenderShield) | Hardened Windows Defender configuration scripts for locking down Defender settings |
| [Disable-OpenFileWarning/](Powershell/Security/Disable-OpenFileWarning) | Suppresses the "Do you want to run this file?" security warning for trusted network shares |
| [Firewall/](Powershell/Security/Firewall) | Firewall rule management scripts — bulk import/export, rule auditing, and lockdown templates |
| [TelemetrySlayer/](Powershell/Security/TelemetrySlayer) | Kills Windows telemetry services, disables data collection tasks, and blocks telemetry endpoints in the hosts file |

### Updates
| Script | Description |
|--------|-------------|
| [Updates/SystemUpdatePro/](Powershell/Updates/SystemUpdatePro) | GUI tool for managing Windows Update — trigger updates, pause updates, and view update history |
| [Updates/WURepair/](Powershell/Updates/WURepair) | Repairs broken Windows Update installations by resetting the update stack, clearing caches, and re-registering DLLs |

### Utilities
| Script | Description |
|--------|-------------|
| [WinForge.ps1](Powershell/WinForge.ps1) | All-in-one Windows system configuration and provisioning script — sets preferences, installs software, and applies tweaks |
| [Get-TopLevelFolders.ps1](Powershell/Get-TopLevelFolders.ps1) | Lists top-level folders at a given path with size and file count — useful for quick disk usage audits |

## Userscripts

Browser enhancement and customization scripts. See the [Userscripts/](Userscripts/) folder for the full list. Install with [Tampermonkey](https://www.tampermonkey.net/) or [Violentmonkey](https://violentmonkey.github.io/).

## Voidtools Everything

| File | Description |
|------|-------------|
| [Bookmarks.csv](Voidtools.Everything/Bookmarks.csv) | Pre-built search bookmarks for Everything — common search queries for system files, logs, and media |
| [Filters.csv](Voidtools.Everything/Filters.csv) | Custom file type filters for Everything — organizes searches by category (documents, images, video, code, etc.) |

## Usage

All scripts are standalone. Download the specific script you need and run it directly:

```powershell
# PowerShell scripts — right-click > Run with PowerShell
# Or from a terminal:
.\Powershell\Debloat\NuclearDellRemover.ps1
```

Scripts that require admin elevation will auto-elevate when run.

## License

MIT License
