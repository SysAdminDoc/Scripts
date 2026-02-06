# ExtractorX

A modern, open-source bulk archive extraction tool built in PowerShell WPF. Designed as a comprehensive replacement for ExtractNow with a dark-themed interface, async extraction engine, directory watchers, password cycling, and more.

![PowerShell](https://img.shields.io/badge/PowerShell-5.1%2B-blue?logo=powershell&logoColor=white)
![Platform](https://img.shields.io/badge/Platform-Windows-0078D6?logo=windows&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green)
![7-Zip](https://img.shields.io/badge/Engine-7--Zip-red)

---

## Features

**Extraction Engine**
- Supports **56 archive formats** including ZIP, 7Z, RAR, TAR, GZ, BZ2, XZ, ISO, CAB, WIM, VMDK, VHD, QCOW2, APK, EPUB, and more
- Magic bytes detection identifies archives regardless of file extension
- Automatic nested archive extraction with configurable depth (3/5/10/20 levels)
- Password list cycling — tries every saved password against encrypted archives automatically
- Duplicate folder flattening eliminates redundant `archive/archive/` nesting
- Async 7-Zip process I/O prevents buffer deadlocks on large archives
- Non-blocking extraction keeps the GUI fully responsive

**Watch Folders**
- Monitor directories for new archives with FileSystemWatcher
- Optional recursive subdirectory monitoring
- Auto-extract immediately on detection
- Delete archives after successful extraction (synced with Queue tab)
- Debounced file detection with write-lock checking to handle incomplete downloads

**Queue Management**
- Drag & drop files and folders onto the window
- Paste files from clipboard with `Ctrl+V`
- Scan entire directories for archives recursively
- Per-item status tracking: Queued, Extracting, Success, Success (pw), Failed
- Elapsed time per extraction
- Remove items with `Delete` key

**Password Manager**
- Passwords encrypted at rest via Windows DPAPI (`ConvertTo-SecureString`)
- Masked display with first/last two characters visible
- Import password lists from text files
- Add, remove, and manage individual entries

**Post-Extraction Actions**
- Delete archive permanently (checkbox on Queue and Watch tabs)
- Send archive to Recycle Bin
- Move archive to a specified folder
- Configurable per-session, saved to config

**Output Path Macros**

| Macro | Description |
|---|---|
| `{ArchiveFolder}` | Parent directory of the archive |
| `{ArchiveName}` | Filename without extension |
| `{ArchiveNameUnique}` | Filename with `(n)` suffix if folder exists |
| `{ArchiveExtension}` | Original file extension |
| `{Desktop}` | User's Desktop path |
| `{Guid}` | Random 8-character ID |
| `{Date}` | Current date as `yyyyMMdd` |
| `{Time}` | Current time as `HHmmss` |
| `{Env:VARNAME}` | Any environment variable |

Default: `{ArchiveFolder}\{ArchiveName}`

**Interface**
- Dark theme with accent colors throughout
- Full `ControlTemplate` ComboBox styling for consistent dark mode dropdowns
- Tabbed layout: Queue, Watch Folders, Passwords, Settings, Log
- Always-on-top toggle
- Window size persisted across sessions
- Status bar with live queue counts, progress, and watcher status

**Shell Integration**
- Right-click context menu for all supported archive types
- Directory context menu to open ExtractorX
- One-click install/uninstall from Settings tab
- Registered under `HKCU` — no admin required

**Logging**
- Color-coded, timestamped log with auto-scroll
- Daily log files written to `%APPDATA%\ExtractorX\logs\`
- Export log to text file
- Open log directory from Log tab
- Capped at 2000 entries to prevent memory growth

---

## Requirements

- **Windows** with PowerShell 5.1 or later (ships with Windows 10/11)
- **7-Zip** — auto-downloaded on first use if not found on the system

The script checks for 7-Zip in these locations:
1. `%APPDATA%\ExtractorX\7z.exe` (downloaded copy)
2. `C:\Program Files\7-Zip\7z.exe`
3. `C:\Program Files (x86)\7-Zip\7z.exe`
4. `%LOCALAPPDATA%\Programs\7-Zip\7z.exe`
5. System `PATH`

If none are found, ExtractorX downloads the 7-Zip extra package automatically when you first click Extract All.

---

## Installation

No installation required. Download and run:

```powershell
# Option 1: Right-click ExtractorX.ps1 > "Run with PowerShell"

# Option 2: From a terminal
powershell -ExecutionPolicy Bypass -File .\ExtractorX.ps1

# Option 3: Extract specific files on launch
powershell -ExecutionPolicy Bypass -File .\ExtractorX.ps1 "C:\Downloads\archive1.zip" "C:\Downloads\archive2.7z"
```

The script automatically relaunches in STA mode if needed for WPF.

---

## Usage

### Quick Start
1. **Drag archives** onto the window or click **+ Add Files**
2. Set the **Output** path (or use the default `{ArchiveFolder}\{ArchiveName}`)
3. Click **Extract All**

### Watch Folders
1. Go to the **Watch Folders** tab
2. Click **+ Add Folder** to select directories to monitor
3. Check **Auto-extract immediately** for hands-free operation
4. Check **Delete archives after successful extraction** if desired
5. Click **Start Watching**

New archives appearing in watched folders are automatically queued and extracted. When one batch finishes, any archives that arrived during extraction are processed next.

### Encrypted Archives
1. Go to the **Passwords** tab
2. Add passwords manually or import a text file (one password per line)
3. When an archive fails with a password error, ExtractorX automatically retries with every saved password

### Context Menu
From the **Settings** tab, click **Install Context Menu** to add right-click entries for all 56 supported archive types. This registers under `HKCU` so no admin elevation is needed.

---

## Configuration

All settings are stored in `%APPDATA%\ExtractorX\config.json`. Passwords are stored separately in `%APPDATA%\ExtractorX\passwords.dat`, encrypted with Windows DPAPI (machine + user-scoped).

| Setting | Default | Description |
|---|---|---|
| `OutputPath` | `{ArchiveFolder}\{ArchiveName}` | Output path template with macro support |
| `OverwriteMode` | `Always` | `Always`, `Never`, or `Rename` |
| `PostAction` | `None` | `None`, `Recycle`, or `MoveToFolder` |
| `DeleteAfterExtract` | `false` | Permanently delete archives after success |
| `NestedExtraction` | `true` | Extract archives found inside archives |
| `NestedMaxDepth` | `5` | Maximum nesting depth |
| `RemoveDuplicateFolder` | `true` | Flatten `output/name/name/` to `output/name/` |
| `ScanMagicBytes` | `true` | Detect archives by file signature, not just extension |
| `FileExclusions` | `Thumbs.db;desktop.ini;.DS_Store` | Semicolon-separated exclusion patterns |
| `WatchRecursive` | `true` | Monitor subdirectories in watch folders |
| `WatchAutoExtract` | `true` | Auto-extract watched files immediately |
| `AlwaysOnTop` | `false` | Keep window above all others |

---

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl+V` | Paste files from clipboard into queue |
| `Delete` | Remove selected items from queue |
| Drag & Drop | Add files or folders to queue |

---

## Supported Formats

<details>
<summary>Full list of 56 supported archive extensions</summary>

**Common:** `.zip` `.7z` `.rar` `.tar` `.gz` `.gzip` `.tgz` `.bz2` `.bzip2` `.tbz2` `.xz` `.txz` `.lzma` `.tlz` `.lz` `.z` `.zst` `.zstd`

**Disk Images:** `.iso` `.dmg` `.fat` `.hfs` `.ntfs` `.vhd` `.vhdx` `.vmdk` `.qcow2`

**System/Packages:** `.cab` `.arj` `.lzh` `.lha` `.cpio` `.rpm` `.deb` `.wim` `.swm` `.esd` `.nsis` `.msi` `.msp` `.chm`

**Application:** `.apk` `.jar` `.war` `.ear` `.xpi`

**Documents:** `.odt` `.ods` `.odp` `.epub`

**Comic Books:** `.cbz` `.cbr` `.cb7`

**Filesystem:** `.squashfs` `.cramfs`

**Split Archives:** `.001`

</details>

**Magic Bytes Detection** identifies the following formats regardless of file extension: ZIP, 7Z, RAR, GZ, BZ2, XZ, CAB, TAR.

---

## Architecture

ExtractorX uses an async architecture to keep the GUI responsive during extraction:

```
 UI Thread (STA)
 ──────────────────────────────────────────────
  WPF Window  <──  DispatcherTimer (100ms)  <──┐
      |                reads from              |
      v                    |                   |
  Event Handlers     ConcurrentQueue           |
      |                    ^                   |
      v                    |                   |
  Start-Queue          writes to               |
  Extraction  ───>  Background Runspace        |
                      |                        |
                      |── 7-Zip Process (async) |
                      |── Password Cycling      |
                      '── Nested Extraction     |
                                               |
  FileSystemWatcher ───> ConcurrentQueue ──────┘
  (Watch Folders)        Auto-Extract Trigger
```

Background threads **never** touch UI elements directly. All communication goes through a `ConcurrentQueue<hashtable>` polled by a `DispatcherTimer` on the UI thread. 7-Zip processes use async `OutputDataReceived`/`ErrorDataReceived` events to prevent stdout buffer deadlocks.

---

## License

[MIT](LICENSE)

---

## Credits

- **7-Zip** by Igor Pavlov — [7-zip.org](https://www.7-zip.org/) (LGPL)
- Built with PowerShell WPF
