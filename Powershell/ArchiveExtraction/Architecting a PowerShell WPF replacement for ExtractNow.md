# Architecting a PowerShell WPF replacement for ExtractNow

**No open-source tool replicates ExtractNow's full feature set — but every capability it offers is technically feasible in PowerShell WPF.** ExtractNow's three killer features — password list cycling, directory watching with auto-extraction, and automatic nested archive extraction — exist in zero open-source alternatives. The closest contender, PeaZip, covers batch extraction and post-extraction actions but misses all three. Meanwhile, the PowerShell ecosystem has proven patterns for every building block: 7z.exe CLI integration, `FileSystemWatcher`, WPF drag-and-drop, runspace-based parallelism, and registry-based shell integration. The gap is clear and the path is well-lit.

---

## ExtractNow's feature set is deeper than most realize

ExtractNow (v4.8.3.0, last updated April 2017) is a freeware, closed-source Windows utility written in C against the Windows API by Nathan Moinvaziri. Despite its age, it remains remarkably full-featured. It uses **7z.dll**, **unrar.dll**, **unacev2.dll**, and **StuffIt SDK** internally, supporting over **50 archive formats** including ZIP, RAR (with RAR5), 7z, TAR, GZ, BZ2, XZ, ISO, CAB, LZH, NSIS, WIM, DMG, VHD, CPIO, RPM, DEB, and compound formats like MSI/DOC/XLS. It also features **deep archive detection** — scanning file signatures (magic bytes) rather than just extensions.

The core workflow centers on a **queue-based batch extraction model**. Archives enter the queue through five channels: drag-and-drop from Explorer, a "Search for Archives" folder scanner, Explorer context menu integration, command-line arguments, or directory monitoring. Users set inclusion/exclusion filter masks (e.g., `*.rar;*.zip`) to control which files are recognized. The queue displays filename, path, size, extension, elapsed time, and status with embedded per-archive progress bars — all in a sortable, reorderable list view.

**Password list management** works by pointing to an external plain-text file (one password per line). When an encrypted archive is encountered, ExtractNow cycles through every password until one succeeds. Macros like `{ArchiveName}` can be used as passwords. If the list is exhausted, it optionally prompts the user. A "one password per archive" optimization skips checking multiple passwords per file within a single archive. Unicode passwords are supported, and a **45-second configurable timeout** auto-dismisses the dialog for unattended batch runs.

**Directory watching** (Monitor tab) lets users add multiple folders with optional recursive subdirectory monitoring. New archives are automatically detected and either added to the queue or immediately extracted. State persists across sessions — changes while ExtractNow is closed are caught on restart. The documentation warns against extracting into a monitored directory to avoid infinite loops.

**Nested archive extraction** automatically detects archives within extracted output and re-queues them. It handles `.tar` files inside `.gz`/`.bz2` automatically. Post-extraction fate (delete, move, recycle) can optionally apply recursively to inner archives, controlled by a "Decide archive fate during recursion" toggle.

Beyond these headline features, ExtractNow provides:

- **Output path macros**: `{ArchiveFolder}`, `{ArchiveName}`, `{ArchiveNameUnique}`, `{ArchiveExtension}`, `{ArchiveFolderStructure}`, `{Guid}`, `{Env:TEMP}`, `{Desktop}`, `{BrowseForFolder}`, and more — enabling dynamic extraction paths like `{ArchiveFolder}\{ArchiveName}`
- **Overwrite modes**: Always overwrite, never overwrite, always ask (with Yes/No to All), or keep-and-rename
- **Post-extraction actions**: Delete archive, move to recycle bin, move to specific folder, delete containing directory, open destination folder, or touch destination timestamp
- **File exclusion filters**: Skip writing files matching patterns (e.g., `*.db;thumbs.db;desktop.ini`)
- **Duplicate folder removal**: Prevents `archive/archive/` nesting when an archive's root folder matches the archive name
- **Explorer context menu**: Enqueue, Extract Here, Extract Automatically, Extract to Folder, Extract to `<Folder>\` — all configurable, with 64-bit shell extension support and submenu grouping
- **Lua 5.2 scripting**: Event-driven hooks for advanced automation
- **External processors**: Define custom extraction commands per file extension with macro support
- **Command-line interface**: `extractnow.exe path1 path2 /target "{ArchiveFolder}\Extracted\" -minimize -minimizetotray`
- **Logging**: Extraction history view (simple/detailed modes), file export, sound notifications (`complete.wav`/`incomplete.wav`), system tray balloon tips
- **UI polish**: Themes via `.icl` files, always-on-top, minimize-to-tray, multi-language support (9 languages), portable mode via INI, disk space checking before extraction, multi-volume archive detection

---

## No open-source tool fills the gap

A systematic comparison of every viable alternative reveals that **ExtractNow's three differentiating features are completely absent from the open-source ecosystem**.

**PeaZip** (LGPLv3, very active development, v10.8.0 in 2025) is the strongest overall alternative. It supports batch extraction across **200+ formats**, post-extraction actions (including secure delete), context menu integration on Windows/Linux/macOS, and CLI script export. However, it lacks password list cycling (it has a password manager for storing passwords, but cannot auto-cycle through a list), has no directory watching, and only handles compressed tarballs natively — not arbitrary nested archives.

**7-Zip / NanaZip** (LGPL) offers the most powerful CLI and the broadest extraction engine, but batch extraction requires external scripting — there is no GUI batch mode. No password list support, no directory watching, no nested extraction. NanaZip adds modern Windows 11 context menus and Brotli/Zstandard support but inherits the same functional gaps.

**Universal Extractor 2** (GPLv2, active) has dedicated batch mode and extracts from hundreds of formats including installers (NSIS, InnoSetup, InstallShield, MSI) and game archives — format breadth unmatched by any other tool. But it also lacks password lists, directory watching, and true nested archive auto-extraction.

| Feature | ExtractNow | PeaZip | 7-Zip | NanaZip | UniExtract 2 |
|---|---|---|---|---|---|
| **Batch GUI extraction** | ✅ Core | ✅ | ❌ CLI only | ❌ CLI only | ✅ |
| **Password list cycling** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Directory watching** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Nested archive auto-extract** | ✅ | ⚠️ Partial | ❌ | ❌ | ⚠️ Partial |
| **Output path macros** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Lua/script hooks** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Post-extraction actions** | ✅ Full | ✅ Full | ❌ | ⚠️ Limited | ❌ |
| **Context menu integration** | ✅ | ✅ | ✅ | ✅ Best | ✅ |
| **Format count** | ~50 | 200+ | ~50+ | ~50+ | Hundreds |
| **Open source** | ❌ | ✅ | ✅ | ✅ | ✅ |

The three red-flag gaps — password cycling, directory monitoring, and nested extraction — are precisely the features most valued by power users running unattended extraction workflows (e.g., torrent clients feeding Sonarr/Radarr). This confirms the opportunity for your tool.

---

## Every component is proven in PowerShell WPF

### 7z.exe CLI integration is straightforward

Call `7z.exe` via the `&` operator with `$LASTEXITCODE` for return code handling. The key commands: `x` (extract with paths), `e` (extract flat), `l` (list contents), `t` (test integrity). Critical switches: `-o{dir}` (output, no space), `-p{password}` (password, no space), `-y` (assume yes), `-ao{a|s|t|u}` (overwrite: all/skip/rename-existing/rename-new), `-slt` (technical listing), `-bb[0-3]` (log verbosity).

```powershell
& $7zPath x $archive -o"$outputDir" -p"$password" -y -aoa
switch ($LASTEXITCODE) {
    0 { "Success" }
    1 { "Warning (non-fatal)" }
    2 { "Fatal error" }
    7 { "Bad command line" }
    8 { "Out of memory" }
    255 { "User cancelled" }
}
```

7z.exe extracts **40+ formats** — everything ExtractNow supports and more, including QCOW2, VMDK, VDI, EXT, APM, and iHEX. **Only ZIP, 7z, and RAR support encryption**, which simplifies your password-cycling logic: skip password attempts for non-encryptable formats.

### FileSystemWatcher needs debouncing and lock-retry

`System.IO.FileSystemWatcher` supports recursive subdirectory monitoring and filtering by extension. The critical gotchas: a single file copy triggers **multiple events**, events fire **before writing completes** (file still locked), and the default **8KB internal buffer** overflows in busy directories. The proven pattern uses `Register-ObjectEvent` for async event handling, a timestamp-based debounce (skip duplicates within 500ms), and a lock-retry loop that attempts `[IO.File]::Open()` up to 10 times with 500ms delays. Increase `InternalBufferSize` to 64KB for production use. Filter archive extensions in the event handler since FSW only supports a single `Filter` pattern.

### WPF drag-and-drop requires STA mode and transparent backgrounds

PowerShell must run in **STA apartment state** for WPF drag-and-drop. Set `AllowDrop="True"` on the target control. In the `DragEnter` handler, check `$_.Data.GetDataPresent([Windows.DataFormats]::FileDrop)`. In the `Drop` handler, `$_.Data.GetData([Windows.DataFormats]::FileDrop)` returns a `string[]` of file paths. **Critical pitfall**: containers with no background set (Grid, Canvas) fail hit-testing — always set `Background="Transparent"` on drop targets.

### Runspaces with Dispatcher keep the UI responsive

This is the most architecturally important pattern. The proven approach uses a **synchronized hashtable** (`[hashtable]::Synchronized(@{})`) shared between the UI runspace and worker runspaces. The UI runspace must be STA. All worker runspaces update the UI exclusively through `$syncHash.Window.Dispatcher.Invoke([action]{...}, "Normal")`. For parallel extraction of multiple archives, use a **RunspacePool** with configurable concurrency (`[runspacefactory]::CreateRunspacePool(1, 4)`). Poll for completion using a `DispatcherTimer` on the UI thread that checks `$job.Handle.IsCompleted` every second, then calls `EndInvoke()` and `Dispose()` on finished jobs. Variables and modules from the parent scope are **not inherited** by child runspaces — pass everything via `SessionStateProxy.SetVariable()` or script arguments.

### Password storage uses DPAPI or SecureString with a practical caveat

For a single-user local tool, **DPAPI via `ConvertTo-SecureString`** is simplest — encrypted to the current user on the current machine with zero key management. Store passwords as PSCredential objects via `Export-Clixml` where the UserName field serves as a label. For portability, use AES key-based encryption with a 256-bit key file. The `Microsoft.PowerShell.SecretManagement` module offers vault-backed storage for maximum security. **However**, since 7z.exe accepts passwords only as plaintext command-line arguments, you must convert `SecureString` to plaintext at extraction time — this is unavoidable and represents the security boundary.

### Nested extraction uses recursive scanning with depth limits

The algorithm: extract the outer archive, scan extracted output for files matching archive extensions (or magic bytes), recursively extract each inner archive with depth tracking. **Safety mechanisms are essential**: a configurable max depth (default 5), MD5-based circular reference detection (hash each archive, skip if seen before), path length protection (use `\\?\` prefix for long paths), and zip bomb detection (monitor compression ratio, abort above threshold). Magic byte detection covers the major formats: `504B0304` (ZIP), `377ABCAF271C` (7z), `526172211A07` (RAR), `1F8B` (GZIP), `425A68` (BZ2), `FD377A585A00` (XZ).

### Context menu integration is simple registry manipulation

Add entries under `HKCU:\Software\Classes\SystemFileAssociations\<ext>\shell\YourTool\command` for per-extension menus (no admin required). The command value calls `powershell.exe -NoProfile -WindowStyle Hidden -File "Script.ps1" "%1"`. For folder context menus, use `HKCU:\Software\Classes\Directory\shell\`. Add an `Extended` string value for Shift+Right-click-only visibility. On Windows 11, entries appear under "Show more options" unless you implement the newer `IExplorerCommand` COM interface — for a PowerShell tool, the classic registry approach is the pragmatic choice.

---

## The PowerShell ecosystem has pieces but no integrated tool

The **7Zip4Powershell** module (19.9M downloads, LGPL-2.1) is the most mature building block. It bundles 7z.dll directly (no 7-Zip installation required), provides `Expand-7Zip` with `-Password`/`-SecurePassword` support, and handles progress reporting. However, it's explicitly marked as unmaintained by its author, processes single archives only, and has no batch orchestration, directory watching, or GUI.

Microsoft's built-in `Expand-Archive` is **ZIP-only, has no password support**, and benchmarks show it's roughly **6x slower** than 7-Zip for large archives. It's unsuitable as a primary extraction engine.

Several GitHub scripts demonstrate individual patterns — `Win_Bulk_Zip_Extractor` for batch ZIP extraction, `PS_Unrar` for batch RAR, blog posts showing `FileSystemWatcher` + auto-extract pipelines — but all are single-format, single-purpose, and console-only. **No existing PowerShell tool combines batch multi-format extraction, directory watching, password lists, nested extraction, and a WPF GUI.** This is a confirmed gap.

---

## Architectural recommendations for your tool

Based on all findings, the optimal architecture for a PowerShell WPF ExtractNow replacement should follow these principles:

**Use 7z.exe as the extraction engine rather than 7Zip4Powershell.** The CLI gives you direct control over exit codes, output parsing, and the full format catalog. The module's unmaintained status and single-archive-at-a-time design make it a liability. Bundling a portable 7z.exe with your tool (permitted under LGPL) eliminates installation dependencies.

**Implement the synchronized-hashtable + runspace + Dispatcher pattern from day one.** Every extraction operation should run in a background runspace via a RunspacePool (suggested default: 4 concurrent extractions). The UI thread should never block. A DispatcherTimer polling at 500ms–1s intervals handles job completion and UI updates.

**Build the password cycling logic as a wrapper around 7z.exe's `-p` flag.** Attempt extraction with no password first (exit code 0 = unencrypted). On failure (exit code 2), iterate through the password list. The "one password per archive" optimization from ExtractNow is worth replicating — it skips individual file password checking and significantly speeds up batch runs against large password lists. Store passwords encrypted via DPAPI with `Export-Clixml`, decrypt to plaintext only at the moment of 7z.exe invocation.

**Implement directory watching as an always-on background service runspace.** Dedicated FileSystemWatcher instances per monitored folder, events pushed to a thread-safe queue (`[System.Collections.Concurrent.ConcurrentQueue[string]]`), consumed by the extraction pipeline. Debounce with timestamps, retry file locks, and never extract into a monitored directory by default.

**Model the output path system on ExtractNow's macro engine.** The macros (`{ArchiveFolder}`, `{ArchiveName}`, `{Env:*}`, etc.) are simple string replacements but extremely powerful for user configuration. Implementing the full set from day one avoids painful refactoring later.

**Prioritize these ExtractNow features for your MVP**: batch queue with drag-and-drop, password list cycling, output path macros, overwrite modes, nested extraction, and post-extraction actions (delete/recycle/move). Directory watching and context menu integration are high-value second-phase features. Lua scripting and external processors are nice-to-haves that can come last.

This project fills a genuine, confirmed gap in both the open-source archive tool ecosystem and the PowerShell ecosystem specifically. Every technical component has proven implementation patterns, and the feature set you're targeting has no existing competitor.