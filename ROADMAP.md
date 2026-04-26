# Scripts Roadmap

Roadmap for the Scripts monorepo - a curated collection of PowerShell sysadmin scripts, userscripts, and Everything filters. Goal: keep scripts standalone and self-contained while improving discoverability and quality gates.

## Planned Features

### Repo structure & discoverability
- Per-script README in each folder with screenshot, requirements, one-line `irm | iex` install
- Top-level catalog page generated from frontmatter (title, category, admin-required, tested-on) - same pattern as SysAdminDoc portfolio
- Tag system (debloat, network, security, provisioning) with filterable table in the main README
- "Tested on" matrix columns: Win10 22H2, Win11 23H2/24H2, Server 2019/2022/2025

### Script hardening
- `#Requires -RunAsAdministrator` and `#Requires -Version 5.1` headers on every admin script
- Standardized `Start-Transcript` logging path (`$env:ProgramData\Scripts\Logs\<script>_<timestamp>.log`)
- Replace all `Start-Service` / `Stop-Service` calls with `sc.exe start/stop` per CLAUDE.md gotcha
- Common bootstrap helper module (`_Common.psm1`) with auto-elevate, logging, progress, toast, and uninstall helpers
- Pester smoke tests that at minimum check each script parses and shows help without error

### New scripts to add
- `Intune-Detector.ps1` - generic MSI/installed-app detection output for Intune `Detection Script`
- `Find-OrphanStartupItems.ps1` - scan Run keys + Startup folders + scheduled-task triggers for broken targets
- `New-RestoreCheckpoint.ps1` - wrap `Checkpoint-Computer` with rate-limit workaround (24h throttle registry key)
- `Export-InstalledDrivers.ps1` - PnP driver export with INF metadata for rollback
- `Get-ADFreshness.ps1` - report last-logon / password-set age across AD for dormant account hunt
- `New-WingetExportProfile.ps1` - export installed winget packages as importable JSON per user profile

### Userscripts
- Single place to list all userscripts with install button, screenshot, changelog link
- Shared build script to stamp `@version`, `@updateURL`, `@downloadURL` consistently at release
- CI check that refuses to release if any userscript has a stale `@version` vs CHANGELOG

### Voidtools Everything
- Add more `Filters.csv` presets (modern media formats, container formats, ebooks, CAD)
- `Bookmarks.csv` presets for common sysadmin searches (open ports config, GPO caches, event log exports)

## Competitive Research

- **ChrisTitusTech/winutil** ships one UI with toggles that map to PS actions - worth wiring selected Scripts entries into MavenWinUtil as togglable checkboxes instead of standalone downloads.
- **PSGallery PowerShell/PowerShell** modules like `PSWindowsUpdate` and `LSUClient` show how to version and publish reusable modules; migrate the common helper module to PSGallery for one-line import.
- **AveYo debloat collection** (gist-based) is popular because every script is a single self-contained file and installs via `irm`; this repo already matches that, but missing SHA pinning in install snippets - add `irm <url> | iex` SHA-validated variants.
- **Mach-Freedom scripts / YourFriendlyCat/Win11Debloat** show that a single idempotent script beats multiple narrow ones for consumer use - consider a consolidated "all-in-one" meta-script that chains the best individual scripts.

## Nice-to-Haves

- `scripts.ps1` dispatcher that fuzzy-lists all scripts and runs the selected one (single entry point)
- Auto-generated changelog fragments from commit messages (`git log` parser)
- Code signing with a self-signed cert committed for transparency (+ trust instructions)
- `scripts-dev` branch with experimental scripts not promoted to main until hardened
- GitHub Actions workflow that runs `Invoke-ScriptAnalyzer` across all `.ps1` files on PR
- A `docs/` site on GitHub Pages that mirrors the catalog with live search

## Open-Source Research (Round 2)

### Related OSS Projects
- https://github.com/BornToBeRoot/PowerShell — `LazyAdmin` module, excellent function/script/snippet template organization
- https://github.com/samersultan/SysAdmin-Tool-List — Curated sysadmin tool/script list, good cross-link target
- https://github.com/topics/powershell-adminscripts — Topic hub
- https://github.com/topics/sysadmin-scripts?l=powershell — PowerShell-specific sysadmin scripts
- https://github.com/awesome-scripts/awesome-userscripts — Curated userscripts list with tooling (vite-plugin-monkey, etc.)
- https://github.com/zachhardesty7/tamper-monkey-scripts-collection — Structured userscript collection reference
- https://github.com/brunocvcunha/awesome-userscripts — Upstream awesome list; potential inclusion target for your userscripts
- https://github.com/topics/powershell-script — Broader PS topic hub

### Features to Borrow
- Module-as-entry-point pattern (`LazyAdmin` module wraps all scripts) — lets users `Import-Module Scripts` and call `Invoke-Debloat-Win11` (BornToBeRoot/PowerShell)
- Curated metadata `.psd1` per category so scripts expose author, min-PS-version, admin-required flag, tags (BornToBeRoot)
- vite-plugin-monkey build pipeline for userscripts (bundler + `@grant` hoisting + auto `@version` sync) (awesome-userscripts)
- GreasyFork / OpenUserJS publish metadata in userscript frontmatter for each script, not just GitHub raw (awesome-userscripts)
- Category READMEs with one-line-per-script table including "last-tested Windows build" column (samersultan/SysAdmin-Tool-List)
- `Pester` smoke test per PS script in CI (BornToBeRoot runs this)

### Patterns & Architectures Worth Studying
- Hybrid module + loose-script repo layout: loose `.ps1` for copy-paste users, compiled `.psm1` for module users, same source of truth (BornToBeRoot pattern)
- Auto-generated `INDEX.md` from script frontmatter comment-block headers (`.SYNOPSIS` / `.DESCRIPTION` / `.TAGS`) (standard PS help-header exploitation)
- Tag-based discovery — every script gets `.TAGS` in its help block, `INDEX.md` build step groups by tag
- CI matrix across PS 5.1 / 7.x / Windows Server 2019+2022+2025 to catch version-specific regressions
