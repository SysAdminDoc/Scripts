# Windows Restore Tool

A one-click solution to fix Windows PCs broken by debloat scripts, privacy.sexy tweaks, and aggressive registry modifications.

![Version](https://img.shields.io/badge/version-4.2.0-green)
![PowerShell](https://img.shields.io/badge/PowerShell-5.1-blue)
![License](https://img.shields.io/badge/license-MIT-blue)

## The Problem

Debloat scripts and privacy tools like privacy.sexy, Win10Debloater, and similar utilities often go too far. They can disable Windows Defender, break Windows Update, disable critical services, and leave your system in an insecure or non-functional state.

**Windows Restore Tool** scans your system for these issues and restores Windows to safe, working defaults with a single click.

## Features

- **Pre-scan diagnostics** - Automatically detects what's broken before making changes
- **Multiple fix modes** - Recommended, detected-only, security-only, or fully custom
- **47 restoration categories** - Comprehensive coverage of common tweaks
- **Safe by default** - Creates a System Restore point before making changes
- **Detailed logging** - Full log saved to your Desktop
- **Dark themed UI** - Modern interface that's easy on the eyes
- **No installation required** - Single PowerShell script, run and done

## Screenshot

![Windows Restore Tool](screenshot.png)

## Quick Start

### Option 1: Right-click (easiest)
1. Download `Restore-WindowsDefaults.ps1`
2. Right-click the file
3. Select **Run with PowerShell**

### Option 2: PowerShell
```powershell
Set-ExecutionPolicy Bypass -Scope Process -Force
.\Restore-WindowsDefaults.ps1
```

### Option 3: One-liner
```powershell
irm https://raw.githubusercontent.com/YOUR_USERNAME/YOUR_REPO/main/Restore-WindowsDefaults.ps1 | iex
```

The script automatically elevates to Administrator and runs in Windows PowerShell 5.1 for maximum compatibility.

## What It Restores

### Security (Critical)
| Category | What it fixes |
|----------|---------------|
| Windows Defender | Re-enables real-time protection, cloud protection, automatic updates |
| Windows Firewall | Restores all firewall profiles (Domain, Private, Public) |
| SmartScreen | Re-enables app, download, and Edge SmartScreen filters |
| UAC | Restores User Account Control to default settings |
| Windows Update | Removes update blocks, re-enables automatic updates |

### System Services
| Category | What it fixes |
|----------|---------------|
| Core Services | SysMain, Windows Search, BITS, Windows Update services |
| Scheduled Tasks | Disk cleanup, defrag, diagnostics, CEIP tasks |
| Error Reporting | Windows Error Reporting service and settings |

### Privacy & Telemetry
| Category | What it fixes |
|----------|---------------|
| Telemetry | Restores diagnostic data settings to defaults |
| Cortana & Copilot | Re-enables Cortana, Copilot, and AI features |
| Activity History | Restores timeline and activity sync |
| Advertising ID | Restores default ad personalization settings |

### UI & Shell
| Category | What it fixes |
|----------|---------------|
| Taskbar | Restores search box, widgets, Chat, Meet Now icons |
| Explorer | Restores ribbons, OneDrive, recent files, 3D Objects |
| Start Menu | Restores suggestions, recent apps, Bing search |
| Context Menus | Restores full right-click menus (removes Win11 compact) |

### Apps & Features
| Category | What it fixes |
|----------|---------------|
| Microsoft Edge | Removes restrictive policies |
| Microsoft Office | Restores telemetry and macro security defaults |
| Windows Apps | Can reinstall removed Calculator, Photos, Store, etc. |
| OneDrive | Restores OneDrive integration and sync |

### Network & Hardware
| Category | What it fixes |
|----------|---------------|
| Network | Restores NetBIOS, LLMNR, network discovery |
| Bluetooth | Re-enables Bluetooth services |
| Remote Desktop | Restores RDP services |
| Power Settings | Re-enables hibernation, restores power defaults |

### Hosts File
Removes domain blocks commonly added by privacy scripts (telemetry, update, and tracking domains).

## Fix Modes

| Mode | Description |
|------|-------------|
| **Recommended Fix** | Restores all safe defaults. Keeps your dark theme. Does NOT reinstall removed apps. |
| **Fix Detected Only** | Only fixes the specific issues found by the scanner. |
| **Security Only** | Only fixes Defender, Firewall, SmartScreen, Windows Update, and UAC. |
| **Custom** | Pick exactly which categories to restore from all 47 options. |
| **Preview Only** | Shows what would change without making any changes. |

## Safety Features

- **System Restore Point** - Automatically created before changes (optional but recommended)
- **Non-destructive** - Only restores settings to Windows defaults, doesn't delete user data
- **Detailed Logging** - Complete log saved to Desktop with timestamps
- **Preview Mode** - See exactly what would change before committing
- **Graceful Errors** - Continues through errors, reports them at the end

## Requirements

- Windows 10 or Windows 11
- PowerShell 5.1 (included with Windows)
- Administrator privileges

## FAQ

**Q: Will this undo my dark theme?**  
A: No, the Recommended Fix specifically preserves your theme settings.

**Q: Will this reinstall bloatware apps?**  
A: Not by default. App reinstallation is a separate option in Custom mode.

**Q: Is it safe to run?**  
A: Yes. It only restores Windows defaults and creates a restore point first. You can always undo changes via System Restore.

**Q: My antivirus flags this script. Is it malware?**  
A: No. PowerShell scripts that modify system settings often trigger false positives. Review the source code yourself - it's fully readable.

**Q: I ran a specific debloat script. Will this fix it?**  
A: This tool fixes the effects of most common debloat scripts including Win10Debloater, privacy.sexy exports, Sophia Script, and manual registry tweaks.

## Building / Contributing

This is a single self-contained PowerShell script. No build process required.

To contribute:
1. Fork the repository
2. Make your changes
3. Test thoroughly on a VM
4. Submit a pull request

## License

MIT License - See [LICENSE](LICENSE) for details.

## Disclaimer

This tool modifies Windows system settings and registry values. While it's designed to be safe and creates restore points, always ensure you have backups of important data. Use at your own risk.

---

**Made for IT professionals tired of fixing PCs broken by overzealous "optimization" scripts.**
