// ==UserScript==
// @name         Chocolatey Package Exporter Pro v2
// @namespace    https://github.com/SysAdminDoc/NoNinite
// @version      2.1.0
// @description  Advanced DOM scraper for Chocolatey Community Repository - exports packages for NoNinite with full metadata, categorization, Winget cross-reference, and auto-pagination
// @author       SysAdminDoc
// @match        https://community.chocolatey.org/packages*
// @icon         https://chocolatey.org/favicon.ico
// @grant        GM_setClipboard
// @grant        GM_download
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_deleteValue
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';

    // ============================================================================
    // CONFIGURATION
    // ============================================================================
    const CONFIG = {
        STORAGE_KEY: 'chocoExporter_packages',
        PROGRESS_KEY: 'chocoExporter_progress',
        SETTINGS_KEY: 'chocoExporter_settings',
        VERSION: '2.1.0',
        SCRAPE_DELAY_MS: 800,
        PAGE_LOAD_DELAY_MS: 2000,
        MAX_RETRIES: 3
    };

    // Category mappings for intelligent categorization
    const CATEGORY_MAPPINGS = {
        // Development
        'ide': 'Development', 'editor': 'Development', 'programming': 'Development',
        'sdk': 'Development', 'compiler': 'Development', 'git': 'Development',
        'vscode': 'Development', 'visual-studio': 'Development', 'nodejs': 'Development',
        'python': 'Development', 'java': 'Development', 'dotnet': 'Development',
        '.net': 'Development', 'docker': 'Development', 'kubernetes': 'Development',
        'devops': 'Development', 'database': 'Development', 'sql': 'Development',
        'mongodb': 'Development', 'redis': 'Development', 'api': 'Development',
        'npm': 'Development', 'yarn': 'Development', 'rust': 'Development',
        'golang': 'Development', 'go': 'Development', 'ruby': 'Development',
        'php': 'Development', 'perl': 'Development', 'lua': 'Development',

        // Browsers
        'browser': 'Web Browsers', 'chrome': 'Web Browsers', 'firefox': 'Web Browsers',
        'edge': 'Web Browsers', 'opera': 'Web Browsers', 'brave': 'Web Browsers',
        'vivaldi': 'Web Browsers', 'chromium': 'Web Browsers', 'webkit': 'Web Browsers',

        // Communication
        'chat': 'Communication', 'email': 'Communication', 'messaging': 'Communication',
        'discord': 'Communication', 'slack': 'Communication', 'teams': 'Communication',
        'zoom': 'Communication', 'skype': 'Communication', 'voip': 'Communication',
        'telegram': 'Communication', 'signal': 'Communication', 'matrix': 'Communication',

        // Media
        'media': 'Multimedia', 'video': 'Multimedia', 'audio': 'Multimedia',
        'music': 'Multimedia', 'player': 'Multimedia', 'codec': 'Multimedia',
        'vlc': 'Multimedia', 'ffmpeg': 'Multimedia', 'streaming': 'Multimedia',
        'spotify': 'Multimedia', 'youtube': 'Multimedia', 'mp3': 'Multimedia',
        'mp4': 'Multimedia', 'mkv': 'Multimedia', 'subtitle': 'Multimedia',

        // Graphics & Design
        'graphics': 'Graphics', 'image': 'Graphics', 'photo': 'Graphics',
        'design': 'Graphics', 'gimp': 'Graphics', 'inkscape': 'Graphics',
        'photoshop': 'Graphics', 'screenshot': 'Graphics', '3d': 'Graphics',
        'cad': 'Graphics', 'blender': 'Graphics', 'svg': 'Graphics',
        'png': 'Graphics', 'jpg': 'Graphics', 'gif': 'Graphics',

        // Security
        'security': 'Security', 'antivirus': 'Security', 'firewall': 'Security',
        'password': 'Security', 'encryption': 'Security', 'vpn': 'Security',
        'privacy': 'Security', 'bitwarden': 'Security', 'keepass': 'Security',
        'malware': 'Security', 'virus': 'Security', 'scanner': 'Security',
        'hash': 'Security', 'gpg': 'Security', 'pgp': 'Security',

        // Utilities
        'utility': 'Utilities', 'utilities': 'Utilities', 'tool': 'Utilities',
        'tools': 'Utilities', 'system': 'Utilities', 'admin': 'Utilities',
        'backup': 'Utilities', 'archive': 'Utilities', 'compression': 'Utilities',
        'zip': 'Utilities', '7zip': 'Utilities', 'winrar': 'Utilities',
        'file-manager': 'Utilities', 'clipboard': 'Utilities', 'launcher': 'Utilities',
        'powertoys': 'Utilities', 'search': 'Utilities', 'everything': 'Utilities',
        'cleanup': 'Utilities', 'uninstaller': 'Utilities', 'registry': 'Utilities',
        'disk': 'Utilities', 'partition': 'Utilities', 'defrag': 'Utilities',

        // Networking
        'network': 'Networking', 'networking': 'Networking', 'ftp': 'Networking',
        'ssh': 'Networking', 'putty': 'Networking', 'remote': 'Networking',
        'rdp': 'Networking', 'teamviewer': 'Networking', 'anydesk': 'Networking',
        'dns': 'Networking', 'proxy': 'Networking', 'download': 'Networking',
        'torrent': 'Networking', 'curl': 'Networking', 'wget': 'Networking',
        'wireshark': 'Networking', 'nmap': 'Networking', 'tcpdump': 'Networking',

        // Documents & Office
        'office': 'Documents', 'document': 'Documents', 'pdf': 'Documents',
        'word': 'Documents', 'excel': 'Documents', 'spreadsheet': 'Documents',
        'libreoffice': 'Documents', 'notepad': 'Documents', 'markdown': 'Documents',
        'ocr': 'Documents', 'ebook': 'Documents', 'epub': 'Documents',
        'latex': 'Documents', 'tex': 'Documents', 'writer': 'Documents',

        // Gaming
        'game': 'Gaming', 'gaming': 'Gaming', 'steam': 'Gaming',
        'gog': 'Gaming', 'epic': 'Gaming', 'emulator': 'Gaming',
        'xbox': 'Gaming', 'playstation': 'Gaming', 'nintendo': 'Gaming',

        // Runtime & Frameworks
        'runtime': 'Runtimes', 'framework': 'Runtimes', 'vcredist': 'Runtimes',
        'directx': 'Runtimes', 'jre': 'Runtimes', 'jdk': 'Runtimes',
        'dotnetfx': 'Runtimes', 'netfx': 'Runtimes', 'redistributable': 'Runtimes',

        // Drivers & Hardware
        'driver': 'Drivers', 'hardware': 'Drivers', 'nvidia': 'Drivers',
        'amd': 'Drivers', 'intel': 'Drivers', 'gpu': 'Drivers',
        'cuda': 'Drivers', 'opencl': 'Drivers',

        // Portable Apps
        'portable': 'Portable',

        // CLI Tools
        'cli': 'CLI Tools', 'command-line': 'CLI Tools', 'terminal': 'CLI Tools',
        'shell': 'CLI Tools', 'powershell': 'CLI Tools', 'bash': 'CLI Tools',
        'console': 'CLI Tools', 'cmd': 'CLI Tools'
    };

    // Known Winget mappings (common packages)
    const WINGET_MAPPINGS = {
        'googlechrome': 'Google.Chrome',
        'firefox': 'Mozilla.Firefox',
        'vscode': 'Microsoft.VisualStudioCode',
        'visualstudiocode': 'Microsoft.VisualStudioCode',
        'git': 'Git.Git',
        'git.install': 'Git.Git',
        'nodejs': 'OpenJS.NodeJS',
        'nodejs-lts': 'OpenJS.NodeJS.LTS',
        'nodejs.install': 'OpenJS.NodeJS',
        'python3': 'Python.Python.3.12',
        'python': 'Python.Python.3.12',
        'python312': 'Python.Python.3.12',
        '7zip': '7zip.7zip',
        '7zip.install': '7zip.7zip',
        'vlc': 'VideoLAN.VLC',
        'notepadplusplus': 'Notepad++.Notepad++',
        'notepadplusplus.install': 'Notepad++.Notepad++',
        'powershell-core': 'Microsoft.PowerShell',
        'pwsh': 'Microsoft.PowerShell',
        'microsoft-windows-terminal': 'Microsoft.WindowsTerminal',
        'powertoys': 'Microsoft.PowerToys',
        'everything': 'voidtools.Everything',
        'discord': 'Discord.Discord',
        'discord.install': 'Discord.Discord',
        'slack': 'SlackTechnologies.Slack',
        'zoom': 'Zoom.Zoom',
        'steam': 'Valve.Steam',
        'steam-client': 'Valve.Steam',
        'spotify': 'Spotify.Spotify',
        'bitwarden': 'Bitwarden.Bitwarden',
        'keepassxc': 'KeePassXCTeam.KeePassXC',
        'keepass': 'DominikReichl.KeePass',
        'docker-desktop': 'Docker.DockerDesktop',
        'docker-cli': 'Docker.DockerCLI',
        'postman': 'Postman.Postman',
        'insomnia-rest-api-client': 'Insomnia.Insomnia',
        'obs-studio': 'OBSProject.OBSStudio',
        'handbrake': 'HandBrake.HandBrake',
        'gimp': 'GIMP.GIMP',
        'inkscape': 'Inkscape.Inkscape',
        'blender': 'BlenderFoundation.Blender',
        'paint.net': 'dotPDN.PaintDotNet',
        'libreoffice-fresh': 'TheDocumentFoundation.LibreOffice',
        'libreoffice-still': 'TheDocumentFoundation.LibreOffice',
        'sumatrapdf': 'SumatraPDF.SumatraPDF',
        'sumatrapdf.install': 'SumatraPDF.SumatraPDF',
        'adobereader': 'Adobe.Acrobat.Reader.64-bit',
        'winscp': 'WinSCP.WinSCP',
        'winscp.install': 'WinSCP.WinSCP',
        'putty': 'PuTTY.PuTTY',
        'putty.install': 'PuTTY.PuTTY',
        'filezilla': 'TimKosse.FileZilla.Client',
        'wireshark': 'WiresharkFoundation.Wireshark',
        'sysinternals': 'Microsoft.Sysinternals.ProcessExplorer',
        'windirstat': 'WinDirStat.WinDirStat',
        'treesizefree': 'JAMSoftware.TreeSize.Free',
        'wiztree': 'AntibodySoftware.WizTree',
        'sharex': 'ShareX.ShareX',
        'greenshot': 'Greenshot.Greenshot',
        'qbittorrent': 'qBittorrent.qBittorrent',
        'audacity': 'Audacity.Audacity',
        'brave': 'Brave.Brave',
        'opera': 'Opera.Opera',
        'vivaldi': 'Vivaldi.Vivaldi',
        'thunderbird': 'Mozilla.Thunderbird',
        'teamviewer': 'TeamViewer.TeamViewer',
        'anydesk': 'AnyDeskSoftware.AnyDesk',
        'anydesk.install': 'AnyDeskSoftware.AnyDesk',
        'rustdesk': 'RustDesk.RustDesk',
        'curl': 'cURL.cURL',
        'jq': 'jqlang.jq',
        'fzf': 'junegunn.fzf',
        'ripgrep': 'BurntSushi.ripgrep.MSVC',
        'wget': 'JernejSimoncic.Wget',
        'ffmpeg': 'Gyan.FFmpeg',
        'imagemagick': 'ImageMagick.ImageMagick',
        'neovim': 'Neovim.Neovim',
        'vim': 'vim.vim',
        'vscode-insiders': 'Microsoft.VisualStudioCode.Insiders',
        'sublimetext3': 'SublimeHQ.SublimeText.3',
        'sublimetext4': 'SublimeHQ.SublimeText.4',
        'atom': 'GitHub.Atom',
        'winmerge': 'WinMerge.WinMerge',
        'beyondcompare': 'ScooterSoftware.BeyondCompare4',
        'k-litecodecpackfull': 'CodecGuide.K-LiteCodecPack.Full',
        'mpv': 'mpv.net',
        'mpc-hc': 'clsid2.mpc-hc',
        'telegram': 'Telegram.TelegramDesktop',
        'signal': 'OpenWhisperSystems.Signal'
    };

    // ============================================================================
    // STATE MANAGEMENT
    // ============================================================================
    let state = {
        packages: [],
        seenIds: new Set(),
        currentPage: 1,
        totalPages: 0,
        isRunning: false,
        isPaused: false,
        errors: [],
        startTime: null,
        autoNavigate: false
    };

    // ============================================================================
    // STYLES
    // ============================================================================
    GM_addStyle(`
        #choco-exporter-panel {
            position: fixed;
            top: 80px;
            right: 20px;
            width: 440px;
            max-height: 90vh;
            background: linear-gradient(145deg, #0f172a, #1e293b);
            border: 1px solid #334155;
            border-radius: 12px;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.6);
            z-index: 99999;
            font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
            color: #e2e8f0;
            overflow: hidden;
        }

        #choco-exporter-panel * {
            box-sizing: border-box;
        }

        .cep-header {
            background: linear-gradient(135deg, #7c3aed, #6366f1);
            padding: 16px 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid #4c1d95;
        }

        .cep-header h3 {
            margin: 0;
            font-size: 16px;
            font-weight: 600;
            color: #fff;
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .cep-header .version {
            background: rgba(255,255,255,0.2);
            padding: 2px 8px;
            border-radius: 10px;
            font-size: 11px;
            font-weight: 500;
        }

        .cep-minimize {
            background: rgba(255,255,255,0.15);
            border: none;
            color: #fff;
            width: 28px;
            height: 28px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 16px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: background 0.2s;
        }

        .cep-minimize:hover {
            background: rgba(255,255,255,0.25);
        }

        .cep-body {
            padding: 20px;
            max-height: calc(90vh - 60px);
            overflow-y: auto;
        }

        .cep-body::-webkit-scrollbar {
            width: 6px;
        }

        .cep-body::-webkit-scrollbar-track {
            background: #1e293b;
        }

        .cep-body::-webkit-scrollbar-thumb {
            background: #475569;
            border-radius: 3px;
        }

        .cep-section {
            margin-bottom: 20px;
        }

        .cep-section-title {
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #94a3b8;
            margin-bottom: 12px;
        }

        .cep-stats-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 10px;
        }

        .cep-stat-card {
            background: rgba(30, 41, 59, 0.6);
            border: 1px solid #334155;
            border-radius: 8px;
            padding: 12px;
            text-align: center;
        }

        .cep-stat-value {
            font-size: 22px;
            font-weight: 700;
            color: #22c55e;
            line-height: 1.2;
        }

        .cep-stat-value.warning {
            color: #f59e0b;
        }

        .cep-stat-value.info {
            color: #60a5fa;
        }

        .cep-stat-label {
            font-size: 10px;
            color: #94a3b8;
            margin-top: 4px;
            text-transform: uppercase;
            letter-spacing: 0.3px;
        }

        .cep-progress-container {
            background: #1e293b;
            border-radius: 8px;
            padding: 16px;
            border: 1px solid #334155;
        }

        .cep-progress-bar-wrapper {
            background: #0f172a;
            height: 8px;
            border-radius: 4px;
            overflow: hidden;
            margin-bottom: 10px;
        }

        .cep-progress-bar {
            height: 100%;
            background: linear-gradient(90deg, #22c55e, #4ade80);
            border-radius: 4px;
            transition: width 0.3s ease;
            width: 0%;
        }

        .cep-progress-text {
            display: flex;
            justify-content: space-between;
            font-size: 12px;
            color: #94a3b8;
        }

        .cep-progress-percentage {
            color: #22c55e;
            font-weight: 600;
        }

        .cep-btn {
            width: 100%;
            padding: 12px 16px;
            border: none;
            border-radius: 8px;
            font-size: 13px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
        }

        .cep-btn-primary {
            background: linear-gradient(135deg, #22c55e, #16a34a);
            color: #fff;
        }

        .cep-btn-primary:hover:not(:disabled) {
            background: linear-gradient(135deg, #16a34a, #15803d);
            transform: translateY(-1px);
        }

        .cep-btn-secondary {
            background: #334155;
            color: #e2e8f0;
        }

        .cep-btn-secondary:hover:not(:disabled) {
            background: #475569;
        }

        .cep-btn-danger {
            background: linear-gradient(135deg, #ef4444, #dc2626);
            color: #fff;
        }

        .cep-btn-danger:hover:not(:disabled) {
            background: linear-gradient(135deg, #dc2626, #b91c1c);
        }

        .cep-btn-warning {
            background: linear-gradient(135deg, #f59e0b, #d97706);
            color: #fff;
        }

        .cep-btn-info {
            background: linear-gradient(135deg, #3b82f6, #2563eb);
            color: #fff;
        }

        .cep-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }

        .cep-btn-group {
            display: flex;
            gap: 10px;
        }

        .cep-btn-group .cep-btn {
            flex: 1;
        }

        .cep-log {
            background: #0f172a;
            border: 1px solid #334155;
            border-radius: 8px;
            padding: 12px;
            max-height: 180px;
            overflow-y: auto;
            font-family: 'Consolas', 'Monaco', monospace;
            font-size: 11px;
            line-height: 1.6;
        }

        .cep-log-entry {
            display: flex;
            gap: 8px;
            padding: 2px 0;
        }

        .cep-log-time {
            color: #64748b;
            flex-shrink: 0;
        }

        .cep-log-msg {
            color: #94a3b8;
            word-break: break-word;
        }

        .cep-log-msg.success {
            color: #22c55e;
        }

        .cep-log-msg.error {
            color: #ef4444;
        }

        .cep-log-msg.warning {
            color: #f59e0b;
        }

        .cep-log-msg.info {
            color: #60a5fa;
        }

        .cep-options {
            background: #1e293b;
            border-radius: 8px;
            padding: 14px;
            border: 1px solid #334155;
        }

        .cep-option-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid #334155;
        }

        .cep-option-row:last-child {
            border-bottom: none;
        }

        .cep-option-label {
            font-size: 12px;
            color: #cbd5e1;
        }

        .cep-checkbox {
            width: 18px;
            height: 18px;
            accent-color: #22c55e;
            cursor: pointer;
        }

        .cep-input {
            background: #0f172a;
            border: 1px solid #334155;
            border-radius: 6px;
            padding: 8px 12px;
            color: #e2e8f0;
            font-size: 12px;
            width: 100px;
            text-align: right;
        }

        .cep-input:focus {
            outline: none;
            border-color: #22c55e;
        }

        .cep-category-summary {
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
            margin-top: 12px;
        }

        .cep-category-tag {
            background: #334155;
            color: #94a3b8;
            padding: 4px 10px;
            border-radius: 12px;
            font-size: 10px;
            display: flex;
            align-items: center;
            gap: 6px;
        }

        .cep-category-tag .count {
            background: #475569;
            padding: 2px 6px;
            border-radius: 8px;
            font-weight: 600;
            color: #e2e8f0;
        }

        .cep-minimized {
            width: auto !important;
            max-height: none !important;
        }

        .cep-minimized .cep-body {
            display: none;
        }

        .cep-alert {
            background: rgba(59, 130, 246, 0.1);
            border: 1px solid #3b82f6;
            border-radius: 8px;
            padding: 12px;
            margin-bottom: 16px;
            font-size: 12px;
            color: #93c5fd;
        }

        .cep-alert-warning {
            background: rgba(245, 158, 11, 0.1);
            border-color: #f59e0b;
            color: #fcd34d;
        }

        .cep-page-info {
            background: #1e293b;
            border-radius: 8px;
            padding: 12px;
            border: 1px solid #334155;
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 12px;
        }

        .cep-page-current {
            font-size: 14px;
            font-weight: 600;
            color: #e2e8f0;
        }

        .cep-page-total {
            font-size: 12px;
            color: #94a3b8;
        }

        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }

        .cep-running .cep-progress-bar {
            animation: pulse 1.5s ease-in-out infinite;
        }

        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }

        .cep-spinner {
            display: inline-block;
            width: 14px;
            height: 14px;
            border: 2px solid rgba(255,255,255,0.3);
            border-radius: 50%;
            border-top-color: #fff;
            animation: spin 0.8s linear infinite;
        }
    `);

    // ============================================================================
    // UTILITY FUNCTIONS
    // ============================================================================
    function formatNumber(num) {
        return new Intl.NumberFormat().format(num);
    }

    function formatTime(ms) {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);

        if (hours > 0) return `${hours}h ${minutes % 60}m`;
        if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
        return `${seconds}s`;
    }

    function getTimestamp() {
        return new Date().toLocaleTimeString('en-US', { hour12: false });
    }

    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    function parseDownloads(str) {
        if (!str) return 0;
        return parseInt(str.replace(/[^0-9]/g, '')) || 0;
    }

    function categorizePackage(pkg) {
        const searchText = `${pkg.id} ${pkg.tags || ''} ${pkg.description || ''}`.toLowerCase();

        for (const [keyword, category] of Object.entries(CATEGORY_MAPPINGS)) {
            if (searchText.includes(keyword)) {
                return category;
            }
        }

        return 'Other';
    }

    function getWingetId(chocoId) {
        if (!chocoId) return null;
        const normalized = chocoId.toLowerCase().replace(/[.\-_]/g, '');
        return WINGET_MAPPINGS[normalized] || WINGET_MAPPINGS[chocoId.toLowerCase()] || null;
    }

    function generateSlug(name) {
        return name.toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '');
    }

    function getCurrentPageNumber() {
        const urlParams = new URLSearchParams(window.location.search);
        return parseInt(urlParams.get('page')) || 1;
    }

    function getTotalPages() {
        // Try to find pagination info
        const paginationLinks = document.querySelectorAll('.pagination .page-link');
        let maxPage = 1;

        paginationLinks.forEach(link => {
            const href = link.getAttribute('href');
            if (href) {
                const match = href.match(/page=(\d+)/);
                if (match) {
                    maxPage = Math.max(maxPage, parseInt(match[1]));
                }
            }
        });

        return maxPage;
    }

    function getNextPageUrl() {
        const nextBtn = document.querySelector('.btn-pager-next, .page-link[rel="next"]');
        return nextBtn ? nextBtn.href : null;
    }

    // ============================================================================
    // DOM SCRAPING
    // ============================================================================
    function scrapeCurrentPage() {
        const packages = [];
        const packageElements = document.querySelectorAll('li.package-listing');

        packageElements.forEach(el => {
            try {
                const id = el.getAttribute('data-package-id');
                const version = el.getAttribute('data-package-version');

                if (!id) return;

                // Skip if already seen
                if (state.seenIds.has(id)) return;

                const titleEl = el.querySelector('.package-listing-title');
                const versionEl = el.querySelector('.package-listing-version');
                const descEl = el.querySelector('.package-listing-description');
                const downloadEl = el.querySelector('.package-listing-downloads');
                const iconEl = el.querySelector('.package-icon img');
                const commandEl = el.querySelector('.package-listing-command');
                const authorEls = el.querySelectorAll('.package-listing-author a');
                const tagEls = el.querySelectorAll('.package-tag');

                // Extract status indicators
                const statusEls = el.querySelectorAll('.status li div');
                let isApproved = false;
                statusEls.forEach(s => {
                    if (s.classList.contains('status-passing') || s.classList.contains('status-exempted')) {
                        isApproved = true;
                    }
                });

                const tags = Array.from(tagEls).map(t => t.getAttribute('data-package-tag') || t.textContent.trim()).filter(t => t);
                const authors = Array.from(authorEls).map(a => a.textContent.trim()).filter(a => a);

                packages.push({
                    id: id,
                    version: version || versionEl?.textContent.trim() || '',
                    title: titleEl?.textContent.trim() || id,
                    description: descEl?.textContent.trim() || '',
                    downloads: parseDownloads(downloadEl?.textContent),
                    iconUrl: iconEl?.src || `https://community.chocolatey.org/content/packageimages/${id}.${version}.png`,
                    installCommand: commandEl?.value || `choco install ${id}`,
                    tags: tags.join(', '),
                    authors: authors.join(', '),
                    isApproved: isApproved,
                    url: `https://community.chocolatey.org/packages/${id}`
                });

                state.seenIds.add(id);

            } catch (e) {
                console.error('Error parsing package element:', e);
            }
        });

        return packages;
    }

    // ============================================================================
    // PACKAGE TRANSFORMATION
    // ============================================================================
    function transformPackage(rawPkg) {
        const category = categorizePackage(rawPkg);
        const wingetId = getWingetId(rawPkg.id);
        const slug = generateSlug(rawPkg.title || rawPkg.id);

        // Determine package type
        let packageType = 'Application';
        const idLower = rawPkg.id.toLowerCase();
        if (idLower.includes('.install')) packageType = 'Installer';
        else if (idLower.includes('.portable')) packageType = 'Portable';
        else if (idLower.includes('.extension') || idLower.includes('extension')) packageType = 'Extension';
        else if (idLower.includes('.commandline') || idLower.includes('-cli') || idLower.includes('.cli')) packageType = 'CLI Tool';

        // Determine subcategories from tags
        const subCategories = new Set([category]);
        const tags = (rawPkg.tags || '').toLowerCase().split(/[\s,]+/);
        tags.forEach(tag => {
            if (CATEGORY_MAPPINGS[tag]) {
                subCategories.add(CATEGORY_MAPPINGS[tag]);
            }
        });

        // License detection from tags
        let licenseType = 'Unknown';
        const tagStr = (rawPkg.tags || '').toLowerCase();
        if (tagStr.includes('foss') || tagStr.includes('open-source') || tagStr.includes('opensource')) licenseType = 'FOSS';
        else if (tagStr.includes('free')) licenseType = 'Freeware';
        else if (tagStr.includes('trial')) licenseType = 'Trial';
        else if (tagStr.includes('commercial')) licenseType = 'Commercial';

        // Target audience
        const audiences = getTargetAudience(category, rawPkg.tags);

        return {
            name: rawPkg.title || rawPkg.id,
            version: rawPkg.version,
            downloads: String(rawPkg.downloads),
            description: rawPkg.description || '',
            installCommand: rawPkg.installCommand || `choco install ${rawPkg.id}`,
            iconUrl: rawPkg.iconUrl || '',
            tags: rawPkg.tags || '',
            isPrerelease: rawPkg.version?.includes('alpha') || rawPkg.version?.includes('beta') || rawPkg.version?.includes('rc'),
            isDeprecated: false,
            isUnofficial: rawPkg.id.toLowerCase().includes('.unofficial'),
            categorization: {
                mainCategory: category,
                packageType: packageType,
                subCategories: Array.from(subCategories),
                uiKeywords: tags.filter(t => t.length > 2).slice(0, 10)
            },
            metadata: {
                alternativeTo: [],
                relatedPackages: [],
                updateFrequency: 'Unknown',
                authors: rawPkg.authors || ''
            },
            officialWebsite: '',
            oneLiner: (rawPkg.description || '').substring(0, 150),
            packageManagers: {
                preference: wingetId ? 'Winget' : 'Chocolatey',
                preferenceReason: wingetId
                    ? 'Winget provides native Windows package management'
                    : 'Chocolatey is the primary source for this package',
                chocolatey: {
                    command: `choco install ${rawPkg.id}`,
                    id: rawPkg.id
                },
                ...(wingetId && {
                    winget: {
                        command: `winget install ${wingetId}`,
                        id: wingetId
                    }
                })
            },
            slug: slug,
            technicalDetails: {
                licenseType: licenseType,
                requiresAdmin: true,
                unattendedInstallConfidence: rawPkg.isApproved ? 'High' : 'Medium'
            },
            userProfile: {
                setupComplexity: 'Simple',
                targetAudience: audiences
            },
            // Additional metadata
            chocoId: rawPkg.id,
            sourceUrl: rawPkg.url
        };
    }

    function getTargetAudience(category, tags) {
        const audiences = [];
        const searchText = (tags || '').toLowerCase();

        if (['Development', 'CLI Tools'].includes(category)) {
            audiences.push('Developer');
        }
        if (['Utilities', 'Networking'].includes(category)) {
            audiences.push('System Administrator', 'Power User');
        }
        if (['Security'].includes(category)) {
            audiences.push('Security Professional');
        }
        if (['Graphics', 'Multimedia'].includes(category)) {
            audiences.push('Creative Professional');
        }
        if (searchText.includes('portable') || searchText.includes('cli')) {
            audiences.push('Power User');
        }

        if (audiences.length === 0) {
            audiences.push('General User');
        }

        return [...new Set(audiences)];
    }

    // ============================================================================
    // STORAGE FUNCTIONS
    // ============================================================================
    function saveProgress() {
        const data = {
            packages: state.packages,
            seenIds: Array.from(state.seenIds),
            currentPage: state.currentPage,
            timestamp: Date.now()
        };
        GM_setValue(CONFIG.PROGRESS_KEY, JSON.stringify(data));
    }

    function loadProgress() {
        try {
            const saved = GM_getValue(CONFIG.PROGRESS_KEY);
            if (saved) {
                const data = JSON.parse(saved);
                // Only restore if less than 24 hours old
                if (Date.now() - data.timestamp < 24 * 60 * 60 * 1000) {
                    state.packages = data.packages || [];
                    state.seenIds = new Set(data.seenIds || []);
                    state.currentPage = data.currentPage || 1;
                    return true;
                }
            }
        } catch (e) {
            console.error('Error loading progress:', e);
        }
        return false;
    }

    function clearProgress() {
        GM_deleteValue(CONFIG.PROGRESS_KEY);
        state.packages = [];
        state.seenIds = new Set();
        state.currentPage = 1;
    }

    // ============================================================================
    // UI COMPONENTS
    // ============================================================================
    function createUI() {
        const panel = document.createElement('div');
        panel.id = 'choco-exporter-panel';

        const currentPage = getCurrentPageNumber();
        const totalPages = getTotalPages();
        state.currentPage = currentPage;
        state.totalPages = totalPages;

        panel.innerHTML = `
            <div class="cep-header">
                <h3>
                    🍫 Choco Exporter
                    <span class="version">v${CONFIG.VERSION}</span>
                </h3>
                <button class="cep-minimize" id="cep-minimize">−</button>
            </div>
            <div class="cep-body">
                <div class="cep-alert">
                    <strong>📍 DOM Scraper Mode</strong><br>
                    Scrapes packages from the current page. Use "Auto-Navigate" to crawl all pages automatically.
                </div>

                <div class="cep-section">
                    <div class="cep-section-title">Current Location</div>
                    <div class="cep-page-info">
                        <span class="cep-page-current">Page <span id="cep-current-page">${currentPage}</span></span>
                        <span class="cep-page-total">of ~<span id="cep-total-pages">${totalPages > 1 ? totalPages + '+' : '?'}</span> pages</span>
                    </div>
                </div>

                <div class="cep-section">
                    <div class="cep-section-title">Options</div>
                    <div class="cep-options">
                        <div class="cep-option-row">
                            <label class="cep-option-label">Min downloads</label>
                            <input type="number" class="cep-input" id="cep-opt-mindownloads" value="100" min="0">
                        </div>
                        <div class="cep-option-row">
                            <label class="cep-option-label">Auto-navigate pages</label>
                            <input type="checkbox" class="cep-checkbox" id="cep-opt-autonav" checked>
                        </div>
                        <div class="cep-option-row">
                            <label class="cep-option-label">Max pages (0 = all)</label>
                            <input type="number" class="cep-input" id="cep-opt-maxpages" value="0" min="0">
                        </div>
                    </div>
                </div>

                <div class="cep-section">
                    <div class="cep-section-title">Statistics</div>
                    <div class="cep-stats-grid">
                        <div class="cep-stat-card">
                            <div class="cep-stat-value" id="cep-stat-collected">0</div>
                            <div class="cep-stat-label">Collected</div>
                        </div>
                        <div class="cep-stat-card">
                            <div class="cep-stat-value info" id="cep-stat-pages">0</div>
                            <div class="cep-stat-label">Pages</div>
                        </div>
                        <div class="cep-stat-card">
                            <div class="cep-stat-value warning" id="cep-stat-time">-</div>
                            <div class="cep-stat-label">Elapsed</div>
                        </div>
                    </div>
                </div>

                <div class="cep-section">
                    <div class="cep-section-title">Progress</div>
                    <div class="cep-progress-container" id="cep-progress-container">
                        <div class="cep-progress-bar-wrapper">
                            <div class="cep-progress-bar" id="cep-progress-bar"></div>
                        </div>
                        <div class="cep-progress-text">
                            <span id="cep-progress-status">Ready to scrape</span>
                            <span class="cep-progress-percentage" id="cep-progress-pct">0%</span>
                        </div>
                    </div>
                </div>

                <div class="cep-section">
                    <div class="cep-section-title">Actions</div>
                    <button class="cep-btn cep-btn-primary" id="cep-btn-start">
                        ▶ Start Scraping
                    </button>
                    <div class="cep-btn-group" style="margin-top: 10px; display: none;" id="cep-controls">
                        <button class="cep-btn cep-btn-warning" id="cep-btn-pause">⏸ Pause</button>
                        <button class="cep-btn cep-btn-danger" id="cep-btn-stop">⏹ Stop</button>
                    </div>
                    <div class="cep-btn-group" style="margin-top: 10px;">
                        <button class="cep-btn cep-btn-secondary" id="cep-btn-export" disabled>
                            💾 Export JSON
                        </button>
                        <button class="cep-btn cep-btn-secondary" id="cep-btn-copy" disabled>
                            📋 Copy
                        </button>
                    </div>
                    <div class="cep-btn-group" style="margin-top: 10px;">
                        <button class="cep-btn cep-btn-info" id="cep-btn-scrape-page">
                            📄 Scrape This Page
                        </button>
                    </div>
                    <div class="cep-btn-group" style="margin-top: 10px;">
                        <button class="cep-btn cep-btn-secondary" id="cep-btn-clear">
                            🗑️ Clear Data
                        </button>
                        <button class="cep-btn cep-btn-secondary" id="cep-btn-restore">
                            ↩️ Restore
                        </button>
                    </div>
                </div>

                <div class="cep-section">
                    <div class="cep-section-title">Categories Found</div>
                    <div class="cep-category-summary" id="cep-categories">
                        <span class="cep-category-tag">None yet</span>
                    </div>
                </div>

                <div class="cep-section">
                    <div class="cep-section-title">Activity Log</div>
                    <div class="cep-log" id="cep-log"></div>
                </div>
            </div>
        `;

        document.body.appendChild(panel);

        // Event listeners
        setupEventListeners();

        // Try to restore previous progress
        if (loadProgress()) {
            log(`Restored ${state.packages.length} packages from previous session`, 'info');
            updateUI();
        }

        log('Chocolatey Package Exporter ready', 'info');
        log(`Current page: ${currentPage}`, 'info');
    }

    function setupEventListeners() {
        // Minimize toggle
        document.getElementById('cep-minimize').addEventListener('click', () => {
            const panel = document.getElementById('choco-exporter-panel');
            const btn = document.getElementById('cep-minimize');
            panel.classList.toggle('cep-minimized');
            btn.textContent = panel.classList.contains('cep-minimized') ? '+' : '−';
        });

        // Start button
        document.getElementById('cep-btn-start').addEventListener('click', startScraping);

        // Scrape current page button
        document.getElementById('cep-btn-scrape-page').addEventListener('click', scrapeCurrentPageOnly);

        // Pause button
        document.getElementById('cep-btn-pause').addEventListener('click', () => {
            state.isPaused = !state.isPaused;
            const btn = document.getElementById('cep-btn-pause');
            btn.textContent = state.isPaused ? '▶ Resume' : '⏸ Pause';
            log(state.isPaused ? 'Scraping paused' : 'Scraping resumed', 'warning');
        });

        // Stop button
        document.getElementById('cep-btn-stop').addEventListener('click', () => {
            state.isRunning = false;
            state.isPaused = false;
            state.autoNavigate = false;
            log('Scraping stopped by user', 'warning');
            saveProgress();
            updateUI();
        });

        // Export button
        document.getElementById('cep-btn-export').addEventListener('click', exportJSON);

        // Copy button
        document.getElementById('cep-btn-copy').addEventListener('click', copyToClipboard);

        // Clear button
        document.getElementById('cep-btn-clear').addEventListener('click', () => {
            if (confirm('Clear all collected data?')) {
                clearProgress();
                log('Data cleared', 'warning');
                updateUI();
            }
        });

        // Restore button
        document.getElementById('cep-btn-restore').addEventListener('click', () => {
            if (loadProgress()) {
                log(`Restored ${state.packages.length} packages`, 'success');
                updateUI();
            } else {
                log('No saved data to restore', 'warning');
            }
        });
    }

    function log(message, type = 'default') {
        const logContainer = document.getElementById('cep-log');
        if (!logContainer) return;

        const entry = document.createElement('div');
        entry.className = 'cep-log-entry';
        entry.innerHTML = `
            <span class="cep-log-time">[${getTimestamp()}]</span>
            <span class="cep-log-msg ${type}">${message}</span>
        `;
        logContainer.appendChild(entry);
        logContainer.scrollTop = logContainer.scrollHeight;

        // Keep only last 100 entries
        while (logContainer.children.length > 100) {
            logContainer.removeChild(logContainer.firstChild);
        }
    }

    function updateUI() {
        const progressBar = document.getElementById('cep-progress-bar');
        const progressPct = document.getElementById('cep-progress-pct');
        const progressStatus = document.getElementById('cep-progress-status');
        const progressContainer = document.getElementById('cep-progress-container');

        // Update stats
        document.getElementById('cep-stat-collected').textContent = formatNumber(state.packages.length);
        document.getElementById('cep-stat-pages').textContent = state.currentPage;
        document.getElementById('cep-current-page').textContent = getCurrentPageNumber();

        if (state.startTime) {
            document.getElementById('cep-stat-time').textContent = formatTime(Date.now() - state.startTime);
        }

        // Progress bar
        if (state.totalPages > 1) {
            const pct = Math.round((state.currentPage / state.totalPages) * 100);
            progressBar.style.width = `${Math.min(pct, 100)}%`;
            progressPct.textContent = `${Math.min(pct, 100)}%`;
        }

        // Update controls visibility
        const startBtn = document.getElementById('cep-btn-start');
        const controls = document.getElementById('cep-controls');
        const exportBtn = document.getElementById('cep-btn-export');
        const copyBtn = document.getElementById('cep-btn-copy');

        if (state.isRunning) {
            startBtn.style.display = 'none';
            controls.style.display = 'flex';
            progressStatus.innerHTML = state.isPaused
                ? 'Paused'
                : `<span class="cep-spinner"></span> Scraping page ${state.currentPage}...`;
            progressContainer.classList.add('cep-running');
        } else {
            startBtn.style.display = 'block';
            controls.style.display = 'none';
            progressStatus.textContent = state.packages.length > 0
                ? `Ready - ${formatNumber(state.packages.length)} packages collected`
                : 'Ready to scrape';
            progressContainer.classList.remove('cep-running');
        }

        exportBtn.disabled = state.packages.length === 0;
        copyBtn.disabled = state.packages.length === 0;

        // Update category summary
        updateCategorySummary();
    }

    function updateCategorySummary() {
        const container = document.getElementById('cep-categories');
        if (!container) return;

        if (state.packages.length === 0) {
            container.innerHTML = '<span class="cep-category-tag">None yet</span>';
            return;
        }

        const categoryCounts = {};
        state.packages.forEach(pkg => {
            const cat = pkg.categorization?.mainCategory || 'Other';
            categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
        });

        const sorted = Object.entries(categoryCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 12);

        container.innerHTML = sorted.map(([cat, count]) =>
            `<span class="cep-category-tag">${cat}<span class="count">${count}</span></span>`
        ).join('');
    }

    // ============================================================================
    // SCRAPING LOGIC
    // ============================================================================
    async function scrapeCurrentPageOnly() {
        const minDownloads = parseInt(document.getElementById('cep-opt-mindownloads').value) || 0;

        log('Scraping current page...', 'info');

        const rawPackages = scrapeCurrentPage();
        let added = 0;

        for (const pkg of rawPackages) {
            if (pkg.downloads < minDownloads) continue;

            const transformed = transformPackage(pkg);
            state.packages.push(transformed);
            added++;
        }

        log(`Found ${rawPackages.length} packages, added ${added} (filtered by ${formatNumber(minDownloads)}+ downloads)`, 'success');
        saveProgress();
        updateUI();
    }

    async function startScraping() {
        const minDownloads = parseInt(document.getElementById('cep-opt-mindownloads').value) || 0;
        const autoNav = document.getElementById('cep-opt-autonav').checked;
        const maxPages = parseInt(document.getElementById('cep-opt-maxpages').value) || 0;

        state.isRunning = true;
        state.isPaused = false;
        state.autoNavigate = autoNav;
        state.startTime = state.startTime || Date.now();

        updateUI();
        log('Starting package collection...', 'info');

        let pagesScraped = 0;

        while (state.isRunning) {
            // Check pause
            while (state.isPaused && state.isRunning) {
                await sleep(500);
            }

            if (!state.isRunning) break;

            // Scrape current page
            const rawPackages = scrapeCurrentPage();
            let pageAdded = 0;

            for (const pkg of rawPackages) {
                if (pkg.downloads < minDownloads) continue;

                const transformed = transformPackage(pkg);
                state.packages.push(transformed);
                pageAdded++;
            }

            pagesScraped++;
            state.currentPage = getCurrentPageNumber();

            log(`Page ${state.currentPage}: Found ${rawPackages.length}, added ${pageAdded}`, 'success');
            saveProgress();
            updateUI();

            // Check max pages
            if (maxPages > 0 && pagesScraped >= maxPages) {
                log(`Reached max pages limit: ${maxPages}`, 'warning');
                break;
            }

            // Navigate to next page if auto-nav enabled
            if (state.autoNavigate) {
                const nextUrl = getNextPageUrl();

                if (nextUrl) {
                    log(`Navigating to next page...`, 'info');
                    await sleep(CONFIG.PAGE_LOAD_DELAY_MS);

                    // Save before navigation
                    saveProgress();

                    // Navigate
                    window.location.href = nextUrl;
                    return; // Script will restart on new page
                } else {
                    log('No more pages to scrape', 'info');
                    break;
                }
            } else {
                // Single page mode
                break;
            }
        }

        state.isRunning = false;
        state.autoNavigate = false;
        updateUI();

        log(`✓ Collection complete! ${formatNumber(state.packages.length)} packages ready for export`, 'success');
    }

    // ============================================================================
    // AUTO-RESUME ON PAGE LOAD
    // ============================================================================
    function checkAutoResume() {
        try {
            const saved = GM_getValue(CONFIG.PROGRESS_KEY);
            if (saved) {
                const data = JSON.parse(saved);
                // Check if we were in the middle of auto-navigation (within last 30 seconds)
                if (data.timestamp && Date.now() - data.timestamp < 30000) {
                    // Restore state
                    state.packages = data.packages || [];
                    state.seenIds = new Set(data.seenIds || []);
                    state.autoNavigate = true;
                    state.startTime = data.startTime || Date.now();

                    log(`Auto-resuming scrape (${state.packages.length} packages collected)...`, 'info');

                    // Wait for page to fully load then continue
                    setTimeout(() => {
                        if (state.autoNavigate) {
                            startScraping();
                        }
                    }, CONFIG.PAGE_LOAD_DELAY_MS);

                    return true;
                }
            }
        } catch (e) {
            console.error('Auto-resume check failed:', e);
        }
        return false;
    }

    // ============================================================================
    // EXPORT FUNCTIONS
    // ============================================================================
    function generateExportData() {
        // Sort by downloads
        const sorted = [...state.packages].sort((a, b) =>
            parseInt(b.downloads) - parseInt(a.downloads)
        );

        return sorted;
    }

    function exportJSON() {
        const data = generateExportData();
        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const timestamp = new Date().toISOString().slice(0, 10);
        const filename = `chocoapplications_${timestamp}.json`;

        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();

        URL.revokeObjectURL(url);
        log(`Exported ${formatNumber(data.length)} packages to ${filename}`, 'success');
    }

    function copyToClipboard() {
        const data = generateExportData();
        const json = JSON.stringify(data, null, 2);

        GM_setClipboard(json);
        log(`Copied ${formatNumber(data.length)} packages to clipboard`, 'success');
    }

    // ============================================================================
    // INITIALIZATION
    // ============================================================================
    function init() {
        // Wait for page to fully load
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                createUI();
                checkAutoResume();
            });
        } else {
            createUI();
            checkAutoResume();
        }
    }

    init();
})();