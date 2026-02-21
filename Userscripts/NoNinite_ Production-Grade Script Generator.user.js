// ==UserScript==
// @name         NoNinite: Production-Grade Script Generator
// @namespace    https://github.com/SysAdminDoc/NoNinite
// @version      5.3.0
// @description  A professional, modern, and powerful UI for generating Winget and Chocolatey installation scripts. Features fully implemented faceted search, canonical categories, live script preview, presets, and a high-quality, responsive, SaaS-like interface.
// @author       Matthew Parker 
// @match        https://ninite.com/
// @icon         https://raw.githubusercontent.com/SysAdminDoc/NoNinite/refs/heads/main/assets/icons/favicon.ico
// @downloadURL  https://github.com/SysAdminDoc/NoNinite/raw/main/src/NoNinite.user.js
// @updateURL    https://github.com/SysAdminDoc/NoNinite/raw/main/src/NoNinite.user.js
// @grant        GM_addStyle
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_setClipboard
// @grant        GM_xmlhttpRequest
// @connect      raw.githubusercontent.com
// @connect      community.chocolatey.org
// @require      https://code.jquery.com/jquery-3.7.1.min.js
// @require      https://cdn.jsdelivr.net/npm/fuse.js@6.6.2/dist/fuse.min.js
// @run-at       document-start
// ==/UserScript==

/* jshint esversion: 11 */

// Hide the body immediately to prevent FOUC (Flash of Unstyled Content)
GM_addStyle('body { visibility: hidden; }');

(async function () {
    'use strict';

    // -----------------------------------------------------------------------------
    //  CONFIG, CONSTANTS & DATA MAPS
    // -----------------------------------------------------------------------------

    const SCRIPT_VERSION = '5.3.0';
    const GH_REPO_RAW = 'https://raw.githubusercontent.com/SysAdminDoc/NoNinite/main';
    const DATA_URL_PRIMARY = `https://raw.githubusercontent.com/SysAdminDoc/NoNinite/refs/heads/main/data/ChocolateyPackageExporter/chocoapplications.json`;
    const DATA_URL_FALLBACK = `https://raw.githubusercontent.com/SysAdminDoc/NoNinite/main/data/ChocolateyPackageExporter/chocoapplications.json`;
    const GENERIC_ICON_URL = `${GH_REPO_RAW}/assets/icons/favicon.ico`;
    const CACHE_DURATION_MS = 12 * 60 * 60 * 1000; // 12 hours
    const ALL_APPS_BATCH_SIZE = 50;
    const CATEGORY_COLUMN_INITIAL_COUNT = 8;
    const CATEGORY_COLUMN_BATCH_SIZE = 10;
    const SEARCH_DEBOUNCE_MS = 220;

    const CANONICAL_CATEGORIES = [
        "Browsers & Internet", "Communication & Collaboration", "Productivity & Office", "Media & Design",
        "Development", "Utilities & Tools", "Security & Privacy", "Networking & Remote", "Gaming & Game Tools",
        "Virtualization & Emulation", "Data & Analytics", "Education & Reference", "Science & Engineering",
        "Business & Finance", "System & OS", "Cloud & DevOps"
    ];

    const PINNED_CATEGORIES = ["Browsers & Internet", "Productivity & Office", "Utilities & Tools"];

    const CANONICAL_CATEGORY_MAP = {
        'web browsers': "Browsers & Internet", 'internet': "Browsers & Internet", 'browsers': "Browsers & Internet", 'browser extensions': "Browsers & Internet",
        'messaging': "Communication & Collaboration", 'chat': "Communication & Collaboration", 'communication': "Communication & Collaboration", 'social and communication': "Communication & Collaboration", 'communication and collaboration': "Communication & Collaboration", 'communication and messaging': "Communication & Collaboration", 'communication and social': "Communication & Collaboration", 'communication tools': "Communication & Collaboration", 'social media': "Communication & Collaboration",
        'documents': "Productivity & Office", 'office': "Productivity & Office", 'productivity': "Productivity & Office", 'office and productivity': "Productivity & Office", 'document management': "Productivity & Office", 'document tools': "Productivity & Office", 'productivity tools': "Productivity & Office",
        'media': "Media & Design", 'imaging': "Media & Design", 'graphics': "Media & Design", 'design': "Media & Design", 'music and video': "Media & Design", 'creative tools': "Media & Design", 'creativity': "Media & Design", 'design and graphics': "Media & Design", 'design and media': "Media & Design", 'design and photography': "Media & Design", 'design and publishing': "Media & Design", 'design assets': "Media & Design", 'design tools': "Media & Design", 'entertainment': "Media & Design", 'graphic design': "Media & Design", 'graphics and design': "Media & Design", 'media and design': "Media & Design", 'media tools': "Media & Design", 'multimedia': "Media & Design", 'fonts': "Media & Design",
        'developer': "Development", 'development tools': "Development", 'dev': "Development",
        'utilities': "Utilities & Tools", 'tools': "Utilities & Tools", 'other': "Utilities & Tools", 'compression': "Utilities & Tools", 'accessibility': "Utilities & Tools", 'customization': "Utilities & Tools", 'general utilities': "Utilities & Tools", 'hardware utilities': "Utilities & Tools", 'hobbies and interests': "Utilities & Tools", 'hobbies and leisure': "Utilities & Tools", 'home automation': "Utilities & Tools", 'information and news': "Utilities & Tools", 'lifestyle': "Utilities & Tools", 'smart home': "Utilities & Tools", 'specialized tools': "Utilities & Tools", 'sports and fitness': "Utilities & Tools", 'sports and recreation': "Utilities & Tools", 'system utilities': "Utilities & Tools", 'travel and navigation': "Utilities & Tools", 'error': 'Utilities & Tools',
        'security': "Security & Privacy", 'security and privacy': "Security & Privacy", 'security tools': "Security & Privacy",
        'file sharing': "Networking & Remote", 'networking': "Networking & Remote", 'internet and network': "Networking & Remote", 'internet tools': "Networking & Remote", 'internet utilities': "Networking & Remote", 'network tools': "Networking & Remote", 'network utilities': "Networking & Remote", 'networking tools': "Networking & Remote",
        'gaming': "Gaming & Game Tools", 'games': "Gaming & Game Tools", 'gaming tools': "Gaming & Game Tools", 'gaming utilities': "Gaming & Game Tools",
        'virtualization and emulation': "Virtualization & Emulation",
        'data and analytics': "Data & Analytics",
        'education': "Education & Reference", 'education and reference': "Education & Reference", 'education and science': "Education & Reference", 'education software': "Education & Reference",
        'science and education': "Science & Engineering", 'science and engineering': "Science & Engineering", 'engineering software': "Science & Engineering", 'industrial and engineering': "Science & Engineering", 'science and gis': "Science & Engineering", 'science and research': "Science & Engineering", 'scientific': "Science & Engineering", 'scientific software': "Science & Engineering", 'scientific tools': "Science & Engineering",
        'business': "Business & Finance", 'business and finance': "Business & Finance", 'business and productivity': "Business & Finance", 'business software': "Business & Finance", 'business tools': "Business & Finance", 'cryptocurrency tools': "Business & Finance", 'finance': "Business & Finance", 'finance and blockchain tools': "Business & Finance",
        'runtimes': "System & OS", 'it and management': "System & OS", 'it and remote management': "System & OS", 'it management': "System & OS", 'it tools': "System & OS", 'system administration': "System & OS", 'system and customization': "System & OS", 'system monitoring': "System & OS", 'system tool': "System & OS", 'system tools': "System & OS",
        'online storage': "Cloud & DevOps", 'cloud services': "Cloud & DevOps", 'cloud tools': "Cloud & DevOps",
    };

    const KEYWORD_CATEGORY_MAP = [
        { keywords: ['browser', 'web'], category: "Browsers & Internet" },
        { keywords: ['chat', 'collaboration', 'voip', 'remote desktop', 'rdp', 'vnc', 'messaging'], category: "Communication & Collaboration" },
        { keywords: ['office', 'word processor', 'spreadsheet', 'presentation', 'notes', 'email', 'pdf', 'document'], category: "Productivity & Office" },
        { keywords: ['video', 'audio', 'music', 'image', 'photo', 'editor', 'player', 'design', 'cad', '3d', 'font'], category: "Media & Design" },
        { keywords: ['ide', 'code', 'git', 'database', 'devops', 'terminal', 'api', 'compiler', 'sdk'], category: "Development" },
        { keywords: ['uninstaller', 'backup', 'recovery', 'launcher', 'cleaner', 'registry', 'archive', 'zip'], category: "Utilities & Tools" },
        { keywords: ['antivirus', 'password', 'encryption', 'vpn', 'privacy', 'firewall', 'malware'], category: "Security & Privacy" },
        { keywords: ['ftp', 'ssh', 'sftp', 'torrent', 'p2p', 'network'], category: "Networking & Remote" },
        { keywords: ['gaming', 'game'], category: "Gaming & Game Tools" },
        { keywords: ['virtualization', 'emulator', 'vm', 'container', 'docker'], category: "Virtualization & Emulation" },
        { keywords: ['data', 'analytics', 'bi', 'statistics'], category: "Data & Analytics" },
        { keywords: ['education', 'reference', 'learning'], category: "Education & Reference" },
        { keywords: ['science', 'engineering', 'math', 'gis'], category: "Science & Engineering" },
        { keywords: ['finance', 'business', 'crypto', 'accounting'], category: "Business & Finance" },
        { keywords: ['runtime', 'framework', 'driver', 'system', 'wsl'], category: "System & OS" },
        { keywords: ['cloud', 'storage', 'dropbox', 'gdrive'], category: "Cloud & DevOps" },
    ];

    const SEARCH_ALIASES = {
        'vscode': 'visual studio code', 'vs code': 'visual studio code', '7zip': '7-zip', 'pwsh': 'powershell', 'winrar': 'winrar',
        'ps': 'powershell', 'node': 'nodejs'
    };

    const INTENT_CHIPS = {
        'pdf': [
            { label: 'PDF Reader', filters: { tags: ['Pdf', 'Viewer'] } },
            { label: 'PDF Editor', filters: { tags: ['Pdf', 'Editor'] } },
            { label: 'PDF Printer', filters: { tags: ['Pdf', 'Printer'] } },
        ]
    };

    const defaultPresets = [
        { name: "Fresh Windows Install", icon: "💻", items: ["Google Chrome", "7-Zip", "VLC", "Spotify", "PowerShell", "PowerToys", "Microsoft Edge", "Everything"] },
        { name: "Helpdesk Tools", icon: "🛠️", items: ["AnyDesk", "TeamViewer", "7-Zip", "Everything", "Revo Uninstaller", "WizTree", "PuTTY", "WinSCP"] },
        { name: "Developer Workstation", icon: "🚀", items: ["Visual Studio Code", "Git", "NodeJS", "Python 3", "Windows Terminal", "Docker Desktop", "Notepad++", "Postman"] },
        { name: "Media & Streaming", icon: "🎬", items: ["VLC", "Audacity", "HandBrake", "ShareX", "OBS Studio", "K-Lite Codec Pack Full"] },
        { name: "Security Toolkit", icon: "🛡️", items: ["Bitwarden", "KeePassXC", "VeraCrypt", "Mozilla Firefox", "Wireshark", "Nmap"] },
    ];

    const FACET_KEYWORDS = [
        'pdf', 'ssh', 'vpn', 'sftp', 'rdp', 'open source', 'oss', 'portable',
        'x86', 'x64', '32-bit', '64-bit', 'gis', 'forensics', 'blockchain', 'crypto', 'cad',
        'emulator', 'streaming', 'backup', 'uninstaller', 'torrent'
    ];

    // Polyfill for requestIdleCallback
    const idleCallback = window.requestIdleCallback || function (handler) { return setTimeout(() => handler({ didTimeout: false, timeRemaining: () => 50 }), 1); };
    const cancelIdleCallback = window.cancelIdleCallback || function (id) { clearTimeout(id); };

    // -----------------------------------------------------------------------------
    //  STATE MANAGEMENT
    // -----------------------------------------------------------------------------

    const state = {
        allApps: [],
        filteredApps: [],
        topTags: [],
        theme: 'dark',
        viewMode: 'category', // category, all-apps, tasks
        density: 'comfy',    // comfy, compact
        selection: {}, // { "AppName": "winget" | "choco" }
        isSelectionDrawerOpen: false,
        isHelpOpen: false,
        filters: {
            search: '',
            installer: 'any', // any, winget, choco
            license: [],      // Open Source, Freeware, Commercial
            arch: [],         // x86, x64
            installType: [],  // Portable
            popularity: 'all',// all, very-popular
            tags: []
        },
        scriptOptions: {
            type: 'powershell', // powershell, cmd
            verbose: false,
            scope: 'machine', // machine, user
            nonInteractive: true,
            acceptEulas: true,
            continueOnError: false
        },
        options: {
            sortBy: 'smart', // smart, name, downloads, updated
        },
        presets: [],
        __caps: { winget: true, choco: true }, // Dataset capabilities, default to true
    };

    function loadState() {
        // Invalidate stale settings if the script version changes significantly
        const lastVersion = GM_getValue('scriptVersion');
        if (lastVersion !== SCRIPT_VERSION) {
            GM_setValue('filters', {}); // Reset filters which are schema-dependent
            GM_setValue('options', {});
            GM_setValue('scriptVersion', SCRIPT_VERSION);
            console.log(`NoNinite: Upgraded from ${lastVersion} to ${SCRIPT_VERSION}. Resetting filters.`);
        }

        const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        state.theme = GM_getValue('theme', systemTheme);
        state.density = GM_getValue('density', 'comfy');
        state.filters = { ...state.filters, ...GM_getValue('filters', {}) };
        state.options = { ...state.options, ...GM_getValue('options', {}) };
        state.scriptOptions = { ...state.scriptOptions, ...GM_getValue('scriptOptions', {}) };
        state.presets = GM_getValue('presets', structuredClone(defaultPresets));
        state.selection = GM_getValue('selection', {});
    }

    function saveState(key) {
        const stateToSave = {
            theme: state.theme,
            density: state.density,
            filters: state.filters,
            options: state.options,
            scriptOptions: state.scriptOptions,
            selection: state.selection,
            presets: state.presets
        };
        if (key && stateToSave.hasOwnProperty(key)) {
            GM_setValue(key, stateToSave[key]);
        } else {
            for (const [k, v] of Object.entries(stateToSave)) GM_setValue(k, v);
        }
    }

    // -----------------------------------------------------------------------------
    //  UI - STYLES
    // -----------------------------------------------------------------------------

    function injectStyles() {
        GM_addStyle(`
:root {
    --nn-font-sans: Segoe UI, Inter, system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
    --nn-font-mono: 'Cascadia Code', 'Fira Code', 'JetBrains Mono', Consolas, monaco, monospace;
    --nn-z-modal: 10000;
    --nn-z-drawer: 9990;
    --nn-z-header: 9980;
    --nn-z-selection-bar: 9970;
    --nn-z-toast: 10010;
    --nn-header-height: 60px;
    --nn-nav-height: 50px;
    --nn-toolbar-height: 50px;
    --nn-selection-bar-height: 55px;
    --nn-filter-rail-width: 260px;
    --nn-drawer-width: 550px;
    --nn-ease-out: cubic-bezier(0.25, 0.46, 0.45, 0.94);
    --nn-ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
}
/* Themes */
:root, [data-theme="dark"] {
    --nn-bg-base: #121212;
    --nn-bg-surface: #1e1e1e;
    --nn-bg-surface-2: #2a2a2a;
    --nn-bg-surface-3: #333333;
    --nn-bg-surface-hover: #3c3c3c;
    --nn-bg-surface-active: #4a4a4a;
    --nn-text-primary: #e0e0e0;
    --nn-text-secondary: #a0a0a0;
    --nn-text-tertiary: #757575;
    --nn-text-link: #64b5f6;
    --nn-text-danger: #f47174;
    --nn-text-success: #81c784;
    --nn-text-warning: #ffd54f;
    --nn-border-color: #424242;
    --nn-border-color-strong: #616161;
    --nn-accent-primary: #2979ff;
    --nn-accent-primary-text: #ffffff;
    --nn-accent-secondary: #323232;
    --nn-scrollbar-thumb: #555;
    --nn-scrollbar-track: var(--nn-bg-surface);
    --nn-shadow-sm: 0 1px 3px rgba(0,0,0,0.3);
    --nn-shadow-md: 0 4px 6px rgba(0,0,0,0.4);
    --nn-shadow-lg: 0 10px 15px rgba(0,0,0,0.5);
}
[data-theme="light"] {
    --nn-bg-base: #f5f5f5;
    --nn-bg-surface: #ffffff;
    --nn-bg-surface-2: #f0f0f0;
    --nn-bg-surface-3: #e0e0e0;
    --nn-bg-surface-hover: #eeeeee;
    --nn-bg-surface-active: #e0e0e0;
    --nn-text-primary: #212121;
    --nn-text-secondary: #616161;
    --nn-text-tertiary: #9e9e9e;
    --nn-text-link: #1976d2;
    --nn-border-color: #e0e0e0;
    --nn-border-color-strong: #bdbdbd;
    --nn-accent-primary: #1e88e5;
    --nn-accent-secondary: #e3f2fd;
    --nn-scrollbar-thumb: #bdbdbd;
    --nn-scrollbar-track: var(--nn-bg-surface-2);
    --nn-shadow-sm: 0 1px 3px rgba(0,0,0,0.1);
    --nn-shadow-md: 0 4px 6px rgba(0,0,0,0.1);
    --nn-shadow-lg: 0 10px 15px rgba(0,0,0,0.1);
}
/* Reset & Base */
#noninite-root *, #noninite-root *::before, #noninite-root *::after { box-sizing: border-box; }
#noninite-root {
    font-family: var(--nn-font-sans);
    background-color: var(--nn-bg-base);
    color: var(--nn-text-primary);
    font-size: 14px;
    line-height: 1.5;
    height: 100vh;
    width: 100vw;
    position: fixed;
    top: 0; left: 0;
    display: grid;
    grid-template-rows: var(--nn-header-height) auto 1fr;
    grid-template-columns: var(--nn-filter-rail-width) 1fr;
    grid-template-areas:
        "header header"
        "rail   nav"
        "rail   main";
    transition: background-color 0.3s var(--nn-ease-out), color 0.3s var(--nn-ease-out);
}
#noninite-root a { color: var(--nn-text-link); text-decoration: none; }
#noninite-root button {
    font-family: inherit; color: inherit; background: none; border: none;
    cursor: pointer; padding: 0;
}
#noninite-root button:disabled { cursor: not-allowed; opacity: 0.5; }
#noninite-root ::-webkit-scrollbar { width: 10px; height: 10px; }
#noninite-root ::-webkit-scrollbar-track { background: var(--nn-scrollbar-track); }
#noninite-root ::-webkit-scrollbar-thumb { background: var(--nn-scrollbar-thumb); border-radius: 5px; }
#noninite-root ::-webkit-scrollbar-thumb:hover { background: #777; }
/* Focus Ring */
#noninite-root :focus-visible {
    outline: 2px solid var(--nn-accent-primary) !important;
    outline-offset: 2px;
    box-shadow: 0 0 0 4px color-mix(in srgb, var(--nn-accent-primary) 30%, transparent) !important;
    border-radius: 4px;
}
/* Layout components */
.nn-header {
    grid-area: header; z-index: var(--nn-z-header); display: flex; align-items: center;
    padding: 0 24px; background-color: var(--nn-bg-surface);
    border-bottom: 1px solid var(--nn-border-color); box-shadow: var(--nn-shadow-sm);
}
.nn-filter-rail {
    grid-area: rail; z-index: var(--nn-z-header); display: flex; flex-direction: column;
    background-color: var(--nn-bg-surface); border-right: 1px solid var(--nn-border-color);
    overflow-y: auto; padding: 16px; gap: 24px;
}
.nn-main-nav { grid-area: nav; display: flex; align-items: center; padding: 8px 24px;
    border-bottom: 1px solid var(--nn-border-color);
}
.nn-main-content {
    grid-area: main; position: relative; display: flex; flex-direction: column;
    overflow: hidden;
}
.nn-content-toolbar { display: flex; align-items: center; justify-content: flex-end; padding: 0 24px;
    height: var(--nn-toolbar-height); min-height: var(--nn-toolbar-height);
    border-bottom: 1px solid var(--nn-border-color); gap: 16px;
}
.nn-results-area {
    flex-grow: 1; overflow-y: auto; padding: 24px;
}
/* Header */
.nn-header__logo { display: flex; align-items: center; gap: 12px; font-size: 1.25rem; font-weight: 600; }
.nn-header__logo img { height: 28px; }
.nn-header__search-container { flex-grow: 1; margin: 0 40px; }
.nn-search-wrapper { position: relative; }
.nn-search-wrapper .nn-icon { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: var(--nn-text-tertiary); }
.nn-search-input {
    width: 100%; height: 40px; padding: 0 16px 0 45px; font-size: 1rem;
    background-color: var(--nn-bg-base); color: var(--nn-text-primary);
    border: 1px solid var(--nn-border-color); border-radius: 8px;
    transition: border-color 0.2s, box-shadow 0.2s;
}
.nn-search-input:focus { border-color: var(--nn-accent-primary); box-shadow: 0 0 0 3px color-mix(in srgb, var(--nn-accent-primary) 20%, transparent); }
.nn-header__actions { display: flex; align-items: center; gap: 8px; }
.nn-icon-btn { display: inline-flex; justify-content: center; align-items: center; width: 36px; height: 36px;
    border-radius: 50%; color: var(--nn-text-secondary);
    transition: background-color 0.2s, color 0.2s; }
.nn-icon-btn:hover { background-color: var(--nn-bg-surface-hover); color: var(--nn-text-primary); }
/* Filter Rail */
.nn-filter-group__title { font-size: 0.8rem; font-weight: 600; text-transform: uppercase;
    letter-spacing: 0.5px; color: var(--nn-text-secondary); margin: 0 0 12px; }
.nn-filter-options { display: flex; flex-direction: column; gap: 8px; }
.nn-filter-options--row { flex-direction: row; flex-wrap: wrap; }
.nn-checkbox-label, .nn-radio-label { display: flex; align-items: center; gap: 8px; cursor: pointer; }
.nn-checkbox-label input, .nn-radio-label input { accent-color: var(--nn-accent-primary); }
.nn-tag-chip {
    padding: 4px 10px; border-radius: 16px; font-size: 0.85rem;
    background-color: var(--nn-bg-surface-2); border: 1px solid var(--nn-border-color);
    color: var(--nn-text-secondary); transition: all 0.2s; cursor: pointer;
}
.nn-tag-chip:hover { background-color: var(--nn-bg-surface-hover); border-color: var(--nn-border-color-strong); color: var(--nn-text-primary); }
.nn-tag-chip.nn-active { background-color: var(--nn-accent-secondary); border-color: var(--nn-accent-primary); color: var(--nn-accent-primary); font-weight: 500; }
[data-theme="dark"] .nn-tag-chip.nn-active { color: var(--nn-text-link); }
.nn-intent-chips { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; }
/* Main Nav & Toolbar */
.nn-main-nav__tabs { display: flex; gap: 8px; }
.nn-tab-btn {
    padding: 10px 16px;
    border-radius: 999px;
    border: 1px solid var(--nn-border-color);
    background: var(--nn-bg-surface);
    color: var(--nn-text-secondary);
    transition: all .15s ease;
    font-weight: 500;
    position: relative;
}
.nn-tab-btn:hover { background: var(--nn-bg-surface-hover); color: var(--nn-text-primary); }
.nn-tab-btn.nn-active {
    color: var(--nn-accent-primary-text);
    background: linear-gradient(180deg, var(--nn-accent-primary) 0%, #1a5cff 100%);
    border-color: var(--nn-accent-primary);
    box-shadow: 0 2px 8px rgba(0,0,0,.35);
}
.nn-tab-btn.nn-active::after { display: none; }
.nn-select-control {
    padding: 6px 12px; border-radius: 6px; background-color: var(--nn-bg-surface-2);
    border: 1px solid var(--nn-border-color);
}
/* Results Area - Category View */
.nn-pinned-categories-container, .nn-other-categories-container {
    display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 24px;
}
.nn-other-categories-container { margin-top: 24px; }
.nn-category-column {
    display: flex; flex-direction: column; background-color: var(--nn-bg-surface);
    border: 1px solid var(--nn-border-color); border-radius: 8px;
    height: 420px; overflow: hidden;
}
.nn-category-column__title {
    font-size: 1.1rem; font-weight: 600; padding: 6px 12px;
    border-bottom: 1px solid var(--nn-border-color);
    flex-shrink: 0;
}
.nn-app-list { list-style: none; margin: 0; padding: 8px; flex-grow: 1; overflow-y: auto; }
/* App List Item (Category View) */
.nn-app-list-item {
    display: grid; grid-template-columns: auto 1fr auto; align-items: center;
    gap: 12px; padding: 8px; border-radius: 6px; cursor: pointer;
    transition: background-color 0.2s;
    outline: 2px solid transparent;
    outline-offset: 0;
}
.nn-app-list-item:hover { background-color: var(--nn-bg-surface-hover); }
.nn-app-list-item.nn-selected {
    background-color: color-mix(in srgb, var(--nn-accent-primary) 15%, transparent);
    outline: 2px solid color-mix(in srgb, var(--nn-accent-primary) 40%, transparent);
}
.nn-app-list-item:focus-within { background-color: var(--nn-bg-surface-hover); }
.nn-app-list-item__icon { width: 32px; height: 32px; object-fit: contain; border-radius: 4px; }
.nn-app-list-item__info { overflow: hidden; }
.nn-app-list-item__name { font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.nn-app-list-item__desc { font-size: 0.85rem; color: var(--nn-text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.nn-app-list-item__actions { display: flex; }
.nn-installer-toggle {
    font-weight: 700; font-size: 0.75rem; width: 24px; height: 24px;
    border-radius: 4px; border: 1px solid var(--nn-border-color-strong);
    background-color: var(--nn-bg-surface-3); color: var(--nn-text-secondary);
    transition: all 0.2s;
}
.nn-installer-toggle:first-of-type { border-top-right-radius: 0; border-bottom-right-radius: 0; }
.nn-installer-toggle:last-of-type { border-top-left-radius: 0; border-bottom-left-radius: 0; border-left: none; }
.nn-installer-toggle:hover:not(:disabled) { background-color: var(--nn-bg-surface-hover); color: var(--nn-text-primary); }
.nn-installer-toggle.nn-selected {
    background: linear-gradient(180deg, var(--nn-accent-primary) 0%, #1a5cff 100%);
    color: var(--nn-accent-primary-text);
    border-color: var(--nn-accent-primary);
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--nn-accent-primary) 35%, transparent);
    transform: translateY(-1px);
}
/* Results Area - All Apps View */
.nn-all-apps-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 16px; }
.nn-app-card {
    display: flex; flex-direction: column; align-items: center; text-align: center;
    padding: 16px; background-color: var(--nn-bg-surface); border-radius: 8px;
    border: 1px solid var(--nn-border-color); cursor: pointer;
    transition: transform 0.2s, box-shadow 0.2s, outline 0.2s;
    outline: 2px solid transparent;
    outline-offset: 0;
}
.nn-app-card:hover { transform: translateY(-3px); box-shadow: var(--nn-shadow-md); }
.nn-app-card.nn-selected {
    border-color: var(--nn-accent-primary);
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--nn-accent-primary) 50%, transparent);
    outline: 2px solid color-mix(in srgb, var(--nn-accent-primary) 40%, transparent);
}
.nn-app-card__icon { width: 48px; height: 48px; margin-bottom: 12px; }
.nn-app-card__name { font-weight: 600; margin-bottom: 4px; }
.nn-app-card__desc { font-size: 0.85rem; color: var(--nn-text-secondary); flex-grow: 1; margin-bottom: 12px; }
/* Results Area - Tasks View */
.nn-tasks-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 16px; }
.nn-preset-card {
    display: flex; flex-direction: column; padding: 20px;
    background-color: var(--nn-bg-surface); border-radius: 8px;
    border: 1px solid var(--nn-border-color); cursor: pointer;
    transition: transform 0.2s, box-shadow 0.2s;
}
.nn-preset-card:hover { transform: translateY(-3px); box-shadow: var(--nn-shadow-md); }
.nn-preset-card__header { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
.nn-preset-card__icon { font-size: 2rem; }
.nn-preset-card__name { font-size: 1.1rem; font-weight: 600; }
.nn-preset-card__items { list-style: none; padding: 0; margin: 0; color: var(--nn-text-secondary); font-size: 0.9rem; }
/* Selection Bar */
.nn-selection-bar {
    grid-column: 1 / -1; position: fixed; bottom: 0; left: 0; right: 0; height: 0;
    z-index: var(--nn-z-selection-bar);
    background-color: var(--nn-bg-surface);
    box-shadow: 0 -2px 10px rgba(0,0,0,0.3);
    transform: translateY(100%); transition: transform 0.3s var(--nn-ease-in-out), height 0.3s var(--nn-ease-in-out);
}
.nn-selection-bar.nn-visible { transform: translateY(0); height: var(--nn-selection-bar-height); }
.nn-selection-bar__content {
    max-width: 1200px; margin: 0 auto; display: flex; align-items: center; justify-content: flex-end;
    height: 100%; padding: 0 24px; position: relative;
}
#nn-selection-count {
    position: absolute; left: 50%; transform: translateX(-50%);
    text-align: center; font-weight: 700;
}
.nn-btn {
    padding: 8px 16px; border-radius: 6px; font-weight: 500;
    transition: background-color 0.2s;
}
#nn-open-drawer-btn {
    font-weight: 700; border-radius: 999px; padding: 10px 20px;
    background: linear-gradient(180deg, #00a2ff 0%, #006eff 100%);
    color: white; border: 1px solid #0a5cff;
    box-shadow: 0 6px 16px rgba(0, 82, 204, 0.35);
}
#nn-open-drawer-btn.nn-pulse { animation: nn-pulse 0.7s ease-out 1; }
@keyframes nn-pulse {
    0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(0, 82, 204, 0.5); }
    70% { transform: scale(1.03); box-shadow: 0 0 0 8px rgba(0, 82, 204, 0); }
    100% { transform: scale(1); }
}
.nn-btn--primary { background-color: var(--nn-accent-primary); color: var(--nn-accent-primary-text); }
.nn-btn--primary:hover { background-color: color-mix(in srgb, var(--nn-accent-primary) 85%, black); }
.nn-btn--secondary { background-color: var(--nn-bg-surface-3); color: var(--nn-text-primary); }
.nn-btn--secondary:hover { background-color: var(--nn-bg-surface-hover); }
/* Selection Drawer */
.nn-selection-drawer-scrim {
    position: fixed; inset: 0; background-color: rgba(0,0,0,0.5);
    z-index: calc(var(--nn-z-drawer) - 1);
    opacity: 0; visibility: hidden; transition: opacity 0.3s;
}
.nn-selection-drawer {
    position: fixed; top: 0; right: 0; bottom: 0; width: var(--nn-drawer-width);
    max-width: 100vw; background-color: var(--nn-bg-base);
    z-index: var(--nn-z-drawer); display: flex; flex-direction: column;
    box-shadow: var(--nn-shadow-lg);
    transform: translateX(100%); transition: transform 0.3s var(--nn-ease-in-out);
}
.nn-selection-drawer.nn-open { transform: translateX(0); }
.nn-selection-drawer.nn-open + .nn-selection-drawer-scrim { opacity: 1; visibility: visible; }
.nn-drawer-header {
    display: flex; justify-content: space-between; align-items: center;
    padding: 16px 24px; border-bottom: 1px solid var(--nn-border-color);
    flex-shrink: 0;
}
.nn-drawer-header__title { font-size: 1.25rem; font-weight: 600; }
.nn-drawer-body { flex-grow: 1; display: flex; flex-direction: column; overflow-y: auto; }
.nn-drawer-section { padding: 24px; border-bottom: 1px solid var(--nn-border-color); }
.nn-drawer-section__title { font-weight: 600; margin-bottom: 16px; }
.nn-selected-apps-list { list-style: none; padding: 0; margin: 0; }
.nn-selected-app-item { display: flex; align-items: center; gap: 12px; padding: 8px 0; }
.nn-selected-app-item__icon { width: 24px; height: 24px; }
.nn-selected-app-item__name { flex-grow: 1; }
.nn-remove-item { margin-left: auto; width: 28px; height: 28px; font-size: 1.2rem; color: var(--nn-text-tertiary); }
.nn-remove-item:hover { color: var(--nn-text-danger); background-color: color-mix(in srgb, var(--nn-text-danger) 15%, transparent); }
.nn-fallback-badge {
    font-size: 0.7rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;
    background-color: var(--nn-text-warning); color: #000;
    padding: 2px 6px; border-radius: 4px; margin-left: 8px;
}
.nn-script-options-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px 24px; }
.nn-drawer-footer {
    flex-shrink: 0; padding: 16px 24px; background-color: var(--nn-bg-surface);
    display: flex; flex-direction: column; gap: 16px;
    border-top: 1px solid var(--nn-border-color);
}
.nn-script-preview-tabs { display: flex; border-bottom: 1px solid var(--nn-border-color); margin: -24px -24px 16px; }
.nn-script-preview-tab { flex: 1; text-align: center; padding: 12px; font-weight: 500; color: var(--nn-text-secondary); cursor: pointer; border-bottom: 2px solid transparent; }
.nn-script-preview-tab.nn-active { color: var(--nn-text-primary); border-color: var(--nn-accent-primary); }
#nn-script-preview-container {
    background-color: var(--nn-bg-base); border: 1px solid var(--nn-border-color);
    border-radius: 6px; min-height: 200px; max-height: 40vh; overflow: auto;
}
#nn-script-preview {
    font-family: var(--nn-font-mono); font-size: 0.9rem; white-space: pre;
    padding: 16px;
}
.nn-drawer-footer__actions { display: flex; gap: 12px; }
.nn-drawer-footer__actions .nn-btn {
    flex-grow: 1; padding: 10px 16px;
    border: 1px solid var(--nn-border-color);
    background: linear-gradient(180deg, var(--nn-bg-surface-2) 0%, var(--nn-bg-surface-3) 100%);
    box-shadow: 0 3px 10px rgba(0,0,0,0.25);
}
.nn-drawer-footer__actions .nn-btn--primary {
    background: linear-gradient(180deg, var(--nn-accent-primary) 0%, #1a5cff 100%);
    border-color: var(--nn-accent-primary);
    color: var(--nn-accent-primary-text);
}
/* Utility Classes */
.nn-no-results, .nn-loading { text-align: center; padding: 40px; color: var(--nn-text-secondary); font-size: 1.1rem; }
.nn-sentinel { height: 1px; }
/* Toast Notifications */
#nn-toast-container { position: fixed; bottom: 20px; right: 20px; z-index: var(--nn-z-toast); display: flex; flex-direction: column; gap: 10px; }
.nn-toast {
    padding: 12px 20px; border-radius: 6px; color: var(--nn-accent-primary-text);
    box-shadow: var(--nn-shadow-lg); opacity: 0; transform: translateX(100%);
    animation: nn-toast-in 0.3s forwards, nn-toast-out 0.3s 2.7s forwards;
    display: flex; align-items: center; gap: 10px;
}
.nn-toast.nn-success { background-color: #4CAF50; }
.nn-toast.nn-error { background-color: #F44336; }
@keyframes nn-toast-in { from { opacity: 0; transform: translateX(100%); } to { opacity: 1; transform: translateX(0); } }
@keyframes nn-toast-out { from { opacity: 1; transform: translateX(0); } to { opacity: 0; transform: translateX(100%); } }
/* Help Modal */
.nn-modal-scrim {
    position: fixed; inset: 0; background-color: rgba(0,0,0,0.6); z-index: var(--nn-z-modal);
    opacity: 0; visibility: hidden; transition: opacity 0.3s;
}
.nn-modal-scrim.nn-visible { opacity: 1; visibility: visible; }
.nn-modal-dialog {
    position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) scale(0.95);
    background-color: var(--nn-bg-surface); border-radius: 12px;
    width: 90vw; max-width: 600px; box-shadow: var(--nn-shadow-lg);
    opacity: 0; visibility: hidden; transition: all 0.3s;
}
.nn-modal-scrim.nn-visible .nn-modal-dialog { transform: translate(-50%, -50%) scale(1); opacity: 1; visibility: visible; }
.nn-modal-header { display: flex; justify-content: space-between; align-items: center; padding: 16px 24px; border-bottom: 1px solid var(--nn-border-color); }
.nn-modal-title { font-size: 1.25rem; font-weight: 600; }
.nn-modal-body { padding: 24px; max-height: 70vh; overflow-y: auto; }
.nn-modal-body kbd {
    background-color: var(--nn-bg-surface-3); border: 1px solid var(--nn-border-color-strong);
    padding: 2px 6px; border-radius: 4px; font-family: var(--nn-font-mono);
}
#loading-indicator {
    position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
    font-size: 1.2rem; color: var(--nn-text-secondary);
}
        `);
    }


    // -----------------------------------------------------------------------------
    //  UI - SKELETON
    // -----------------------------------------------------------------------------

    function buildSkeleton() {
        $('body > *').not('script, style').hide();

        const skeletonHTML = `
<div id="noninite-root" class="nn-root">
    <header class="nn-header">
        <div class="nn-header__logo">
            <img src="${GENERIC_ICON_URL}" alt="NoNinite Logo">
            <span>NoNinite</span>
        </div>
        <div class="nn-header__search-container">
            <div class="nn-search-wrapper">
                <svg class="nn-icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                <input type="search" id="nn-search-input" class="nn-search-input" placeholder="Search for apps (Type ≥ 3 chars for fuzzy search)">
            </div>
            <div id="nn-intent-chips-container" class="nn-intent-chips"></div>
        </div>
        <div class="nn-header__actions">
            <button type="button" id="nn-help-btn" class="nn-icon-btn" title="Help (?)">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
            </button>
            <button type="button" id="nn-theme-toggle" class="nn-icon-btn" title="Toggle Theme (t)">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="nn-sun-icon"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="nn-moon-icon"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
            </button>
        </div>
    </header>

    <aside id="nn-filter-rail" class="nn-filter-rail"></aside>

    <nav class="nn-main-nav">
        <div id="nn-view-tabs" class="nn-main-nav__tabs">
            <button type="button" class="nn-tab-btn" data-view="category" aria-label="View by Category">Categories</button>
            <button type="button" class="nn-tab-btn" data-view="all-apps" aria-label="View All Apps">All Apps</button>
            <button type="button" class="nn-tab-btn" data-view="tasks" aria-label="View Tasks and Presets">Tasks & Presets</button>
        </div>
    </nav>

    <main class="nn-main-content">
        <div class="nn-content-toolbar">
            <select id="nn-sort-by" class="nn-select-control">
                <option value="smart">Sort: Smart</option>
                <option value="name">Sort: Name (A-Z)</option>
                <option value="downloads">Sort: Most Installed</option>
                <option value="updated">Sort: Recently Updated</option>
            </select>
        </div>
        <div class="nn-results-area">
            <div class="nn-loading">Loading application catalog...</div>
        </div>
    </main>

    <div id="nn-selection-bar" class="nn-selection-bar">
        <div class="nn-selection-bar__content">
            <span id="nn-selection-count" class="nn-selection-bar__count"></span>
            <button type="button" id="nn-open-drawer-btn" class="nn-btn" aria-label="Open script generator">Generate Script</button>
        </div>
    </div>

    <div id="nn-selection-drawer" class="nn-selection-drawer">
        <div class="nn-drawer-header">
            <h2 class="nn-drawer-header__title">Generate Installation Script</h2>
            <button type="button" id="nn-close-drawer-btn" class="nn-icon-btn" title="Close (g or Esc)" aria-label="Close script generator">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
        </div>
        <div class="nn-drawer-body">
            <div id="nn-drawer-selected-list-section" class="nn-drawer-section"></div>
            <div class="nn-drawer-section">
                <h3 class="nn-drawer-section__title">Script Options</h3>
                <div id="nn-script-options-form" class="nn-script-options-grid"></div>
            </div>
            <div class="nn-drawer-footer">
                <div class="nn-script-preview-tabs">
                     <button type="button" data-type="powershell" class="nn-script-preview-tab nn-active">PowerShell</button>
                     <button type="button" data-type="cmd" class="nn-script-preview-tab">CMD</button>
                </div>
                <div id="nn-script-preview-container">
                    <pre><code id="nn-script-preview"></code></pre>
                </div>
                <div class="nn-drawer-footer__actions">
                    <button type="button" id="nn-copy-script-btn" class="nn-btn nn-btn--secondary">Copy Script</button>
                    <button type="button" id="nn-download-script-btn" class="nn-btn nn-btn--primary">Download</button>
                </div>
            </div>
        </div>
    </div>
    <div class="nn-selection-drawer-scrim"></div>

    <div id="nn-help-modal-scrim" class="nn-modal-scrim">
      <div id="nn-help-modal" class="nn-modal-dialog" role="dialog" aria-modal="true" aria-labelledby="nn-help-modal-title">
        <header class="nn-modal-header">
            <h2 id="nn-help-modal-title" class="nn-modal-title">Help & Shortcuts</h2>
            <button type="button" id="nn-close-modal-btn" class="nn-icon-btn" title="Close (? or Esc)">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
        </header>
        <div class="nn-modal-body">
            <p><strong>Keyboard Shortcuts:</strong></p>
            <ul>
                <li><kbd>/</kbd> - Focus search bar</li>
                <li><kbd>↑</kbd> / <kbd>↓</kbd> - Navigate items in the current view</li>
                <li><kbd>Space</kbd> / <kbd>Enter</kbd> - Toggle selection for focused item</li>
                <li><kbd>g</kbd> - Toggle script generator drawer</li>
                <li><kbd>t</kbd> - Toggle theme (dark/light)</li>
                <li><kbd>?</kbd> - Toggle this help modal</li>
                <li><kbd>Esc</kbd> - Close drawer/modal, clear search</li>
            </ul>
        </div>
      </div>
    </div>

    <div id="nn-toast-container"></div>
    <div id="loading-indicator">Initializing NoNinite...</div>
</div>
`;
        $('body').append(skeletonHTML);
        $('#noninite-root').on('submit', e => e.preventDefault());
    }


    // -----------------------------------------------------------------------------
    //  DATA FETCHING & PROCESSING
    // -----------------------------------------------------------------------------
    function normalizeRootArray(raw) {
        if (Array.isArray(raw)) return raw;
        const keys = ['packages', 'applications', 'items', 'data', 'results', 'apps'];
        for (const k of keys) {
            if (Array.isArray(raw?.[k])) return raw[k];
        }
        for (const [k, v] of Object.entries(raw || {})) {
            if (Array.isArray(v)) return v;
        }
        return [];
    }

    function parseWingetId(pkg) {
        const direct = pkg?.packageManagers?.winget?.id || pkg?.packageManagers?.Winget?.id;
        if (direct) return String(direct).trim();
        const cmd = pkg?.packageManagers?.winget?.command || pkg?.packageManagers?.Winget?.command || pkg?.installCommand || '';
        const m = cmd.match(/winget\s+install\s+(?:--id\s+)?["']?([\w\.\-]+)["']?/i);
        return m ? m[1] : '';
    }

    function parseChocoId(pkg) {
        const direct = pkg?.packageManagers?.choco?.id || pkg?.packageManagers?.Chocolatey?.id || pkg?.chocoId || pkg?.packageId || pkg?.packageName;
        if (direct) return String(direct).trim();
        const cmd = pkg?.installCommand || '';
        const m = cmd.match(/choco(?:latey)?\s+install\s+([^\s"]+)/i);
        return m ? m[1] : '';
    }

    function safeSlug(name, fallback = '') {
        const s = (fallback || name || '').toString().toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
        return s || 'app';
    }

    async function fetchCatalogData() {
        const lastFetch = GM_getValue('catalogLastFetchTime', 0);
        const cachedData = GM_getValue('catalogData');
        if (cachedData && (Date.now() - lastFetch < CACHE_DURATION_MS)) {
            return JSON.parse(cachedData);
        }

        const tryFetch = (url) => new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'GET', url,
                onload: res => {
                    try {
                        const data = JSON.parse(res.responseText);
                        GM_setValue('catalogData', res.responseText);
                        GM_setValue('catalogLastFetchTime', Date.now());
                        resolve(data);
                    } catch (e) { reject(`Failed to parse catalog data from ${url}`); }
                },
                onerror: () => reject(`Failed to fetch catalog data from ${url}.`)
            });
        });

        try {
            return await tryFetch(DATA_URL_PRIMARY);
        } catch (error) {
            console.warn(`NoNinite: Primary URL failed (${error}). Trying fallback.`);
            return await tryFetch(DATA_URL_FALLBACK);
        }
    }

    function processAndEnrichData(rawData) {
        const rawApps = normalizeRootArray(rawData);
        if (!rawApps || rawApps.length === 0) {
            console.error("NoNinite Error: The fetched data is not an array or is empty. Schema might have changed.");
            if (rawData) console.error("NoNinite Diagnostics: Root object keys are:", Object.keys(rawData));
            return;
        }

        const unmappedCategories = new Set();
        let enrichedApps = rawApps.map(pkg => {
            const name = pkg.name;
            if (!name) return null;

            const wingetId = parseWingetId(pkg);
            const chocoId = parseChocoId(pkg);

            if (!wingetId && !chocoId) return null; // Skip if no usable installer ID

            const slug = safeSlug(name, pkg.slug);
            const description = pkg.summary || pkg.shortDescription || pkg.oneLiner || pkg.description || pkg.notes || '';
            const tagContent = Array.isArray(pkg.tags) ? pkg.tags.join(' ') : (typeof pkg.tags === 'string' ? pkg.tags : '');
            const allTextContent = `${name} ${description} ${tagContent}`.toLowerCase();

            let category = "Utilities & Tools"; // Default
            const sourceCat = (pkg.categorization?.mainCategory || '').toLowerCase().trim().replace(/ & /g, ' and ');
            if (CANONICAL_CATEGORY_MAP[sourceCat]) {
                category = CANONICAL_CATEGORY_MAP[sourceCat];
            } else {
                let found = false;
                for (const mapping of KEYWORD_CATEGORY_MAP) {
                    if (mapping.keywords.some(kw => allTextContent.includes(kw))) {
                        category = mapping.category;
                        found = true;
                        break;
                    }
                }
                if (!found && sourceCat && pkg.categorization?.mainCategory) {
                    unmappedCategories.add(pkg.categorization.mainCategory);
                }
            }

            const lastUpdated = pkg.lastUpdated ? new Date(pkg.lastUpdated) : null;
            const daysSinceUpdate = lastUpdated ? (Date.now() - lastUpdated.getTime()) / (1000 * 3600 * 24) : 9999;

            // Icon Fallback Chain
            const iconSrcs = [];
            if (chocoId) {
                iconSrcs.push(`https://community.chocolatey.org/content/packageimages/${encodeURIComponent(chocoId)}.png`);
                iconSrcs.push(`https://community.chocolatey.org/content/packageimages/${encodeURIComponent(chocoId)}.jpg`);
            }
            if (pkg.iconUrl) iconSrcs.push(pkg.iconUrl);
            iconSrcs.push(`${GH_REPO_RAW}/assets/appicons/${slug}.png`);
            iconSrcs.push(`${GH_REPO_RAW}/assets/appicons/${slug}.svg`);
            iconSrcs.push(GENERIC_ICON_URL);

            const sourceTags = pkg.categorization?.subCategories || [];
            const appTags = new Set(sourceTags.map(t => t.charAt(0).toUpperCase() + t.slice(1)));

            return {
                id: slug, name, wingetId, chocoId,
                description, iconSrcs, downloads: pkg.downloads || 0, lastUpdated,
                sourceTags: sourceTags,
                nameLower: name.toLowerCase(),
                descLower: description.toLowerCase(),
                tagsLower: sourceTags.join(' ').toLowerCase(),
                facets: {
                    installers: { winget: !!wingetId, choco: !!chocoId },
                    license: "Unknown", arch: [], installType: [], popularity: 'all',
                    tags: [...appTags],
                },
                category,
                smartScore: (pkg.downloads || 1) * (1 + 0.5 * Math.max(0, 1 - (daysSinceUpdate / 365))),
            };
        }).filter(Boolean);

        const uniqueApps = new Map();
        enrichedApps.forEach(app => {
            const existing = uniqueApps.get(app.name.toLowerCase());
            if (!existing || (app.facets.installers.winget && !existing.facets.installers.winget) || app.downloads > existing.downloads) {
                uniqueApps.set(app.name.toLowerCase(), app);
            }
        });

        if (unmappedCategories.size > 0) {
            console.warn('NoNinite Audit: Unmapped Source Categories ->', [...unmappedCategories]);
        }

        state.allApps = [...uniqueApps.values()];
        console.log('NoNinite: Processed', state.allApps.length, 'unique applications.');

        // Determine dataset capabilities and reconcile filters
        const DATASET_CAPS = {
            winget: state.allApps.some(a => a.facets.installers.winget),
            choco:  state.allApps.some(a => a.facets.installers.choco),
        };
        state.__caps = DATASET_CAPS;

        const f = state.filters.installer;
        const impossibleWinget = (f === 'winget' && !DATASET_CAPS.winget);
        const impossibleChoco = (f === 'choco' && !DATASET_CAPS.choco);

        if (impossibleWinget || impossibleChoco) {
            let newF = 'any';
            let reason = 'the dataset';
            if (impossibleWinget && DATASET_CAPS.choco) {
                newF = 'choco';
                reason = 'Chocolatey is available';
            } else if (impossibleChoco && DATASET_CAPS.winget) {
                newF = 'winget';
                reason = 'Winget is available';
            }
            state.filters.installer = newF;
            saveState('filters');
            showToast(`Installer filter auto-set to "${newF}" (${reason})`, 4000, 'success');
        }


        if (state.allApps.length > 0) {
            showToast(`Loaded ${state.allApps.length} applications`, 3000, 'success');
        } else {
            showToast('Failed to parse apps. Check console for details.', 5000, 'error');
        }
    }

    function processDeferredData() {
        const tagFrequency = new Map();

        // Popularity Tiers
        const downloadCounts = state.allApps.map(a => a.downloads).sort((a, b) => b - a);
        const p90_threshold = downloadCounts[Math.floor(0.1 * downloadCounts.length)] || 0;

        state.allApps.forEach(app => {
            // Text content for facet detection
            const text = `${app.nameLower} ${app.descLower} ${app.tagsLower}`;

            // Popularity
            if (app.downloads >= p90_threshold && p90_threshold > 0) app.facets.popularity = 'very-popular';

            // License
            if (/\b(oss|open source)\b/i.test(text)) app.facets.license = "Open Source";
            else if (/\b(freeware|free to use)\b/i.test(text)) app.facets.license = "Freeware";
            else if (/\b(commercial|paid|proprietary)\b/i.test(text)) app.facets.license = "Commercial";

            // Arch
            if (/\b(x64|64-bit)\b/i.test(text)) app.facets.arch.push('x64');
            if (/\b(x86|32-bit)\b/i.test(text)) app.facets.arch.push('x86');

            // Install Type
            if (/\b(portable)\b/i.test(text)) app.facets.installType.push('Portable');

            // Tags
            const appTags = new Set(app.facets.tags);
            FACET_KEYWORDS.forEach(kw => {
                if (text.includes(kw)) {
                    appTags.add(kw.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '));
                }
            });
            app.facets.tags = [...appTags];
            app.facets.tags.forEach(tag => tagFrequency.set(tag, (tagFrequency.get(tag) || 0) + 1));
        });

        // Compute top tags
        state.topTags = [...tagFrequency.entries()]
            .sort(([, a], [, b]) => b - a)
            .slice(0, 30)
            .map(([tag]) => tag);

        console.log('NoNinite: Deferred processing complete.');
    }


    // -----------------------------------------------------------------------------
    //  UI - RENDERING & LOGIC
    // -----------------------------------------------------------------------------
    let fuse;
    let allAppsObserver;
    const categoryObservers = [];
    let lastSearchQuery = null;

    function initializeSearch() {
        if (!state.allApps.length) return;
        const options = {
           keys: [{ name:'name', weight:1.0 }, { name:'description', weight:0.6 }, { name:'facets.tags', weight:0.4 }],
           threshold: 0.3,
           distance: 100,
           minMatchCharLength: 3,
           ignoreLocation: true,
           includeScore: false,
        };
        fuse = new Fuse(state.allApps, options);
    }

    function applyFiltersAndSort() {
        let results = state.allApps;
        const { search, ...activeFilters } = state.filters;
        const searchQuery = search.trim().toLowerCase();

        if (searchQuery === lastSearchQuery) return;
        lastSearchQuery = searchQuery;

        // 1. Search
        if (searchQuery) {
            if (searchQuery.length < 3 || !fuse) { // Fast path for short queries or before Fuse is ready
                results = results.filter(app =>
                    app.nameLower.includes(searchQuery) ||
                    app.descLower.includes(searchQuery) ||
                    app.tagsLower.includes(searchQuery)
                );
            } else { // Fuzzy path with Fuse.js
                let finalQuery = SEARCH_ALIASES[searchQuery] || searchQuery;
                results = fuse.search(finalQuery, { limit: 500 });
            }
        }

        // 2. Facet Filtering
        results = results.filter(app => {
            const f = activeFilters;
            if (f.installer === 'winget' && !app.facets.installers.winget) return false;
            if (f.installer === 'choco' && !app.facets.installers.choco) return false;
            if (f.popularity === 'very-popular' && app.facets.popularity !== 'very-popular') return false;
            if (f.license.length && !f.license.includes(app.facets.license)) return false;
            if (f.arch.length && !f.arch.some(a => app.facets.arch.includes(a))) return false;
            if (f.installType.length && !f.installType.some(it => app.facets.installType.includes(it))) return false;
            if (f.tags.length && !f.tags.every(t => app.facets.tags.includes(t))) return false;
            return true;
        });

        // 3. Sorting
        const { sortBy } = state.options;
        results.sort((a, b) => {
            if (sortBy === 'smart' && !searchQuery) return b.smartScore - a.smartScore; // Smart score only when not searching
            if (sortBy === 'name') return a.name.localeCompare(b.name);
            if (sortBy === 'downloads') return b.downloads - a.downloads;
            if (sortBy === 'updated') return (b.lastUpdated?.getTime() || 0) - (a.lastUpdated?.getTime() || 0);
            return a.name.localeCompare(b.name); // Default to name sort if smart score is off
        });

        state.filteredApps = results;
    }

    function masterRender() {
        requestAnimationFrame(() => {
            applyFiltersAndSort();
            switch (state.viewMode) {
                case 'category': renderCategoryView(state.filteredApps); break;
                case 'all-apps': renderAllAppsView(state.filteredApps); break;
                case 'tasks': renderTasksView(); break;
            }
            wireIconFallbacks();
            updateSelectionStateOnItems();
        });
    }

    function createAppListItemHTML(app) {
        const { winget, choco } = app.facets.installers;
        return `
            <li class="nn-app-list-item" data-app-name="${escapeHtml(app.name)}" tabindex="0" role="listitem">
                <img src="${app.iconSrcs[0]}" data-srcs='${JSON.stringify(app.iconSrcs.slice(1))}' class="nn-app-list-item__icon" alt="" loading="lazy">
                <div class="nn-app-list-item__info">
                    <div class="nn-app-list-item__name" title="${escapeHtml(app.name)}">${escapeHtml(app.name)}</div>
                    <div class="nn-app-list-item__desc" title="${escapeHtml(app.description)}">${escapeHtml(app.description)}</div>
                </div>
                <div class="nn-app-list-item__actions">
                    <button type="button" class="nn-installer-toggle" data-type="winget" title="Install with Winget" aria-pressed="false" ${!winget ? 'disabled' : ''}>W</button>
                    <button type="button" class="nn-installer-toggle" data-type="choco" title="Install with Chocolatey" aria-pressed="false" ${!choco ? 'disabled' : ''}>C</button>
                </div>
            </li>`;
    }

    function createAppCardHTML(app) {
        const { winget, choco } = app.facets.installers;
        return `
            <div class="nn-app-card" data-app-name="${escapeHtml(app.name)}" tabindex="0" role="listitem">
                <img src="${app.iconSrcs[0]}" data-srcs='${JSON.stringify(app.iconSrcs.slice(1))}' class="nn-app-card__icon" alt="" loading="lazy">
                <div class="nn-app-card__name">${escapeHtml(app.name)}</div>
                <p class="nn-app-card__desc">${escapeHtml(app.description)}</p>
                <div class="nn-app-list-item__actions">
                    <button type="button" class="nn-installer-toggle" data-type="winget" title="Install with Winget" aria-pressed="false" ${!winget ? 'disabled' : ''}>W</button>
                    <button type="button" class="nn-installer-toggle" data-type="choco" title="Install with Chocolatey" aria-pressed="false" ${!choco ? 'disabled' : ''}>C</button>
                </div>
            </div>`;
    }

    function renderCategoryView(apps) {
        const $resultsArea = $('.nn-results-area').empty().removeClass('nn-tasks-grid nn-all-apps-grid');
        categoryObservers.forEach(obs => obs.disconnect());
        categoryObservers.length = 0;

        if (apps.length === 0) {
            $resultsArea.html('<p class="nn-no-results">No applications match your criteria.</p>');
            return;
        }

        const grouped = apps.reduce((acc, app) => {
            (acc[app.category] = acc[app.category] || []).push(app);
            return acc;
        }, {});

        const $pinnedContainer = $('<div class="nn-pinned-categories-container"></div>').appendTo($resultsArea);
        const $otherContainer = $('<div class="nn-other-categories-container"></div>').appendTo($resultsArea);

        let columnsRendered = 0;
        const renderColumn = (category, container) => {
            if (!grouped[category] || grouped[category].length === 0) return;

            columnsRendered++;
            const $column = $(`
                <div class="nn-category-column" data-category="${escapeHtml(category)}">
                    <h3 class="nn-category-column__title">${escapeHtml(category)}</h3>
                    <ul class="nn-app-list"></ul>
                </div>
            `).appendTo(container);

            const allAppsInCat = grouped[category];
            const initialApps = allAppsInCat.slice(0, CATEGORY_COLUMN_INITIAL_COUNT);
            const $list = $column.find('.nn-app-list');
            $list.html(initialApps.map(createAppListItemHTML).join(''));
            $column.data('app-buffer', allAppsInCat.slice(CATEGORY_COLUMN_INITIAL_COUNT));

            if (allAppsInCat.length > CATEGORY_COLUMN_INITIAL_COUNT) {
                 $list.append('<div class="nn-sentinel"></div>');
                 setupColumnObserver($column[0]);
            }
        };

        CANONICAL_CATEGORIES.forEach(cat => {
            const container = PINNED_CATEGORIES.includes(cat) ? $pinnedContainer : $otherContainer;
            renderColumn(cat, container);
        });

        if (columnsRendered === 0) {
            $resultsArea.html(`
                <div class="nn-no-results">
                    <p>No categories to show for your current filters.</p>
                </div>`);
        }
    }

    function setupColumnObserver(columnElement) {
        const sentinel = columnElement.querySelector('.nn-sentinel');
        if (!sentinel) return;

        const observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting) {
                const $column = $(columnElement);
                const buffer = $column.data('app-buffer') || [];
                if (buffer.length === 0) {
                    if(observer) observer.disconnect();
                    sentinel.remove();
                    return;
                }

                const nextBatch = buffer.splice(0, CATEGORY_COLUMN_BATCH_SIZE);
                const html = nextBatch.map(createAppListItemHTML).join('');
                $(sentinel).before(html);
                $column.data('app-buffer', buffer);

                wireIconFallbacks($column.find('.nn-app-list-item:not(.wired)'));
                updateSelectionStateOnItems($column.find('.nn-app-list-item:not(.wired-selection)'));
            }
        }, { root: columnElement.querySelector('.nn-app-list') });

        observer.observe(sentinel);
        categoryObservers.push(observer);
    }

    function renderAllAppsView(apps) {
        if (allAppsObserver) {
            allAppsObserver.disconnect();
            allAppsObserver = null;
        }
        const $resultsArea = $('.nn-results-area').empty().addClass('nn-all-apps-grid').removeClass('nn-tasks-grid');

        if (apps.length === 0) {
            $resultsArea.html('<p class="nn-no-results">No applications match your criteria.</p>');
            return;
        }

        let currentOffset = 0;

        const renderBatch = () => {
            const batch = apps.slice(currentOffset, currentOffset + ALL_APPS_BATCH_SIZE);
            if (batch.length === 0) {
                if(allAppsObserver) {
                    allAppsObserver.disconnect();
                    allAppsObserver = null;
                }
                return;
            }
            const html = batch.map(createAppCardHTML).join('');
            const $sentinel = $resultsArea.find('.nn-sentinel');
            if ($sentinel.length) {
                $(html).insertBefore($sentinel);
            } else {
                $resultsArea.append(html);
            }
            currentOffset += batch.length;

            wireIconFallbacks($resultsArea.find('.nn-app-card:not(.wired)'));
            updateSelectionStateOnItems($resultsArea.find('.nn-app-card:not(.wired-selection)'));

            if (currentOffset >= apps.length) {
                 if(allAppsObserver) {
                     allAppsObserver.disconnect();
                     allAppsObserver = null;
                 }
                 $sentinel.remove();
            }
        };

        $resultsArea.append('<div class="nn-sentinel"></div>');
        allAppsObserver = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting) {
                renderBatch();
            }
        }, { root: null, rootMargin: '500px' });

        allAppsObserver.observe($resultsArea.find('.nn-sentinel')[0]);
        renderBatch(); // Render the first batch immediately
    }

    function renderTasksView() {
        if (allAppsObserver) {
            allAppsObserver.disconnect();
            allAppsObserver = null;
        }
        const $resultsArea = $('.nn-results-area').empty().addClass('nn-tasks-grid').removeClass('nn-all-apps-grid');

        const html = state.presets.map(preset => `
            <div class="nn-preset-card" data-preset-name="${escapeHtml(preset.name)}">
                <div class="nn-preset-card__header">
                    <span class="nn-preset-card__icon">${preset.icon}</span>
                    <h3 class="nn-preset-card__name">${escapeHtml(preset.name)}</h3>
                </div>
                <ul class="nn-preset-card__items">
                    ${preset.items.slice(0, 5).map(item => `<li>- ${escapeHtml(item)}</li>`).join('')}
                    ${preset.items.length > 5 ? `<li>...and ${preset.items.length - 5} more</li>` : ''}
                </ul>
            </div>
        `).join('');
        $resultsArea.html(html);
    }

    function renderFilterRail() {
        const { installer, license, arch, installType, popularity, tags } = state.filters;
        const caps = state.__caps;
        const html = `
            <div class="nn-filter-group">
                <h3 class="nn-filter-group__title">Installer</h3>
                <div class="nn-filter-options" data-filter="installer">
                    <label class="nn-radio-label"><input type="radio" name="installer" value="any" ${installer === 'any' ? 'checked' : ''}> Any</label>
                    <label class="nn-radio-label"><input type="radio" name="installer" value="winget" ${installer === 'winget' ? 'checked' : ''} ${!caps.winget ? 'disabled' : ''}> Winget</label>
                    <label class="nn-radio-label"><input type="radio" name="installer" value="choco" ${installer === 'choco' ? 'checked' : ''} ${!caps.choco ? 'disabled' : ''}> Chocolatey</label>
                </div>
            </div>
             <div class="nn-filter-group">
                <h3 class="nn-filter-group__title">Install Type</h3>
                <div class="nn-filter-options" data-filter="installType">
                    <label class="nn-checkbox-label"><input type="checkbox" name="installType" value="Portable" ${installType.includes('Portable') ? 'checked' : ''}> Portable</label>
                </div>
            </div>
            <div class="nn-filter-group">
                <h3 class="nn-filter-group__title">Architecture</h3>
                <div class="nn-filter-options" data-filter="arch">
                    <label class="nn-checkbox-label"><input type="checkbox" name="arch" value="x64" ${arch.includes('x64') ? 'checked' : ''}> x64</label>
                    <label class="nn-checkbox-label"><input type="checkbox" name="arch" value="x86" ${arch.includes('x86') ? 'checked' : ''}> x86</label>
                </div>
            </div>
            <div class="nn-filter-group">
                <h3 class="nn-filter-group__title">License</h3>
                <div class="nn-filter-options" data-filter="license">
                    ${['Open Source', 'Freeware', 'Commercial'].map(l => `<label class="nn-checkbox-label"><input type="checkbox" name="license" value="${l}" ${license.includes(l) ? 'checked' : ''}> ${l}</label>`).join('')}
                </div>
            </div>
            <div class="nn-filter-group">
                <h3 class="nn-filter-group__title">Popularity</h3>
                 <div class="nn-filter-options" data-filter="popularity">
                    <label class="nn-radio-label"><input type="radio" name="popularity" value="all" ${popularity === 'all' ? 'checked' : ''}> All</label>
                    <label class="nn-radio-label"><input type="radio" name="popularity" value="very-popular" ${popularity === 'very-popular' ? 'checked' : ''}> Very Popular</label>
                </div>
            </div>
            <div class="nn-filter-group">
                <h3 class="nn-filter-group__title">Tags</h3>
                <div class="nn-filter-options nn-filter-options--row" data-filter="tags">
                    ${state.topTags.map(t => `<button type="button" class="nn-tag-chip ${tags.includes(t) ? 'nn-active' : ''}" data-tag="${escapeHtml(t)}">${escapeHtml(t)}</button>`).join('')}
                </div>
            </div>`;
        $('#nn-filter-rail').html(html);
    }

    function renderSelectionDrawer() {
        const hasSelection = Object.keys(state.selection).length > 0;
        if (!hasSelection) {
            $('#nn-drawer-selected-list-section').html('<p class="nn-text-secondary">No applications selected.</p>');
            generateScript();
            return;
        }

        let wingetAppsHTML = '';
        let chocoAppsHTML = '';

        Object.entries(state.selection).forEach(([appName, installerType]) => {
            const app = state.allApps.find(a => a.name === appName);
            if (!app) return;

            const { winget, choco } = app.facets.installers;
            let finalInstaller = installerType;
            let isFallback = false;

            // Corrected fallback logic
            if (finalInstaller === 'winget' && !winget && choco) {
                finalInstaller = 'choco';
                isFallback = true;
            } else if (finalInstaller === 'choco' && !choco && winget) {
                finalInstaller = 'winget';
                isFallback = true;
            }

            const itemHTML = `
                <li class="nn-selected-app-item" data-app-name="${escapeHtml(app.name)}">
                    <img src="${app.iconSrcs[0]}" data-srcs='${JSON.stringify(app.iconSrcs.slice(1))}' class="nn-selected-app-item__icon" alt="">
                    <span class="nn-selected-app-item__name">${escapeHtml(app.name)}</span>
                    ${isFallback ? '<span class="nn-fallback-badge">Fallback</span>' : ''}
                    <div class="nn-app-list-item__actions">
                        <button type="button" class="nn-installer-toggle ${finalInstaller === 'winget' ? 'nn-selected' : ''}" data-type="winget" title="Install with Winget" aria-pressed="${finalInstaller === 'winget'}" ${!winget ? 'disabled' : ''}>W</button>
                        <button type="button" class="nn-installer-toggle ${finalInstaller === 'choco' ? 'nn-selected' : ''}" data-type="choco" title="Install with Chocolatey" aria-pressed="${finalInstaller === 'choco'}" ${!choco ? 'disabled' : ''}>C</button>
                    </div>
                     <button type="button" class="nn-icon-btn nn-remove-item" title="Remove" aria-label="Remove ${escapeHtml(app.name)}">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                     </button>
                </li>`;

            const effectiveInstaller = app.facets.installers[finalInstaller] ? finalInstaller : (finalInstaller === 'winget' ? 'choco' : 'winget');

            if (effectiveInstaller === 'winget' && app.facets.installers.winget) {
                 wingetAppsHTML += itemHTML;
            } else if (app.facets.installers.choco) {
                 chocoAppsHTML += itemHTML;
            }
        });

        const selectedListHTML = `
            ${wingetAppsHTML ? `<h3 class="nn-drawer-section__title">Winget Apps</h3><ul class="nn-selected-apps-list">${wingetAppsHTML}</ul>` : ''}
            ${chocoAppsHTML ? `<h3 class="nn-drawer-section__title" style="margin-top: 16px;">Chocolatey Apps</h3><ul class="nn-selected-apps-list">${chocoAppsHTML}</ul>` : ''}
        `;
        $('#nn-drawer-selected-list-section').html(selectedListHTML);

        // Render script options
        const { type, scope, nonInteractive, acceptEulas, continueOnError, verbose } = state.scriptOptions;
        const optionsHTML = `
            ${ type === 'powershell' ? `
            <label class="nn-checkbox-label"><input type="checkbox" name="verbose" ${verbose ? 'checked' : ''}> Verbose Output</label>
            <label class="nn-checkbox-label"><input type="checkbox" name="continueOnError" ${continueOnError ? 'checked' : ''}> Continue on Error</label>
            <div class="nn-filter-options" data-filter="scope">
                <label class="nn-radio-label"><input type="radio" name="scope" value="machine" ${scope === 'machine' ? 'checked' : ''}> For All Users (Machine)</label>
                <label class="nn-radio-label"><input type="radio" name="scope" value="user" ${scope === 'user' ? 'checked' : ''}> For Current User</label>
            </div>
            `: '' }
            <label class="nn-checkbox-label"><input type="checkbox" name="nonInteractive" ${nonInteractive ? 'checked' : ''}> Non-Interactive / Silent</label>
            <label class="nn-checkbox-label"><input type="checkbox" name="acceptEulas" ${acceptEulas ? 'checked' : ''}> Accept EULAs</label>
        `;
        $('#nn-script-options-form').html(optionsHTML);
        wireIconFallbacks($('#nn-drawer-selected-list-section'));
        generateScript();
    }

    const SCRIPT_PRELUDE_PS = `
# --- NoNinite Script Prelude ---
# Ensures Winget and Chocolatey are ready for use.

# Ensure Chocolatey
if (-not (Get-Command choco -ErrorAction SilentlyContinue)) {
  Write-Host "Chocolatey not found. Installing..." -ForegroundColor Yellow
  Set-ExecutionPolicy Bypass -Scope Process -Force
  [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
  iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
}
choco upgrade chocolatey -y --no-progress

# Ensure Winget / update sources
if (Get-Command winget -ErrorAction SilentlyContinue) {
  try {
    Write-Host "Updating Winget sources..."
    winget source update
  } catch {}
  try {
    Write-Host "Attempting to upgrade Winget client..."
    winget upgrade --id Microsoft.DesktopAppInstaller -e --accept-package-agreements --accept-source-agreements --silent
  } catch {}
} else {
  Write-Host "Winget not found. Attempting to install Desktop App Installer..." -ForegroundColor Yellow
  try {
    Invoke-WebRequest https://aka.ms/getwinget -OutFile "$env:TEMP\\WinGet.appxbundle"
    Add-AppxPackage "$env:TEMP\\WinGet.appxbundle"
  } catch {
    Write-Host "Failed to install winget automatically. Please install 'App Installer' from Microsoft Store." -ForegroundColor Red
  }
}

# --- End Prelude ---

`;

const SCRIPT_PRELUDE_CMD = `
@echo off
REM --- NoNinite Script Prelude ---
echo Checking for prerequisites...

where choco >nul 2>&1 || (
  echo Chocolatey not found. Installing...
  powershell -NoProfile -ExecutionPolicy Bypass -Command "Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol=[System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))"
)
echo Upgrading Chocolatey...
choco upgrade chocolatey -y --no-progress

where winget >nul 2>&1
if %errorlevel% neq 0 (
    echo Winget not found. Please install 'App Installer' from the Microsoft Store.
) else (
    echo Updating Winget sources...
    winget source update
)

echo.
echo --- Starting Installations ---
echo.
`;


    function generateScript() {
        const { type, verbose, scope, nonInteractive, acceptEulas, continueOnError } = state.scriptOptions;
        const wingetApps = [], chocoApps = [];

        Object.entries(state.selection).forEach(([appName, installerType]) => {
            const app = state.allApps.find(a => a.name === appName);
            if (!app) return;

            let finalInstaller = installerType;
            if (finalInstaller === 'winget' && !app.facets.installers.winget && app.facets.installers.choco) {
                finalInstaller = 'choco';
            } else if (finalInstaller === 'choco' && !app.facets.installers.choco && app.facets.installers.winget) {
                finalInstaller = 'winget';
            }

            if (finalInstaller === 'winget' && app.wingetId) {
                wingetApps.push(app);
            } else if (finalInstaller === 'choco' && app.chocoId) {
                chocoApps.push(app);
            }
        });

        const hasApps = wingetApps.length > 0 || chocoApps.length > 0;
        let script = '';

        if (type === 'powershell') {
            if (hasApps) script += SCRIPT_PRELUDE_PS;
            if(verbose && hasApps) script += `Write-Host "--- Starting NoNinite Installations ---" -ForegroundColor Green\n`;
            if(continueOnError) script += `$ErrorActionPreference = "Continue"\n\n`;
            if (chocoApps.length) {
                if (verbose) script += `Write-Host "Installing Chocolatey packages..."\n`;
                const chocoIds = chocoApps.map(a => a.chocoId).join(' ');
                let chocoArgs = ['install', chocoIds, '-y'];
                if (nonInteractive) chocoArgs.push('--no-progress');
                script += `choco ${chocoArgs.join(' ')}\n`;
            }
            if (wingetApps.length) {
                if (verbose) script += `\nWrite-Host "Installing Winget packages..."\n`;
                wingetApps.forEach(app => {
                    let wingetArgs = ['install', `--id "${app.wingetId}"`, '-e'];
                    if (scope) wingetArgs.push(`--scope ${scope}`);
                    if (nonInteractive) wingetArgs.push('--silent');
                    if (acceptEulas) wingetArgs.push('--accept-package-agreements', '--accept-source-agreements');
                    script += `winget ${wingetArgs.join(' ')}\n`;
                });
            }
            if(verbose && hasApps) script += `\nWrite-Host "--- Script Finished ---" -ForegroundColor Green\n`;
        } else { // CMD
            if (hasApps) script += SCRIPT_PRELUDE_CMD;
            if (chocoApps.length) {
                script += 'echo Installing Chocolatey packages...\n';
                const chocoIds = chocoApps.map(a => a.chocoId).join(' ');
                let chocoArgs = ['install', chocoIds, '-y'];
                 if (nonInteractive && !acceptEulas) chocoArgs.push('--no-progress'); // -y covers most cases
                script += `choco ${chocoArgs.join(' ')}\n`;
            }
             if (wingetApps.length) {
                script += '\necho Installing Winget packages...\n';
                 wingetApps.forEach(app => {
                    let wingetArgs = ['install', `--id "${app.wingetId}"`, '-e'];
                     if (acceptEulas) wingetArgs.push('--accept-package-agreements');
                     if (nonInteractive) wingetArgs.push('--silent');
                    script += `winget ${wingetArgs.join(' ')}\n`;
                });
            }
        }
        $('#nn-script-preview').text(script || 'Select applications to generate a script.');
    }


    // -----------------------------------------------------------------------------
    //  UI - HELPERS & STATE SYNC
    // -----------------------------------------------------------------------------

    function escapeHtml(str) {
        const s = String(str ?? '');
        return s.replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[m]);
    }

    function showToast(message, duration = 3000, type = 'success') {
        const toast = $(`<div class="nn-toast nn-${type}">${message}</div>`);
        $('#nn-toast-container').append(toast);
        setTimeout(() => toast.remove(), duration + 300); // Add animation time
    }

    function wireIconFallbacks(context = document) {
        const images = $(context).is('img') ? $(context) : $(context).find('.nn-app-list-item__icon, .nn-app-card__icon, .nn-selected-app-item__icon').not('.wired');
        images.each(function() {
            const $img = $(this);
            $img.addClass('wired');
            $img.on('error', function() {
                const $this = $(this);
                let srcs = $this.data('srcs');
                if (typeof srcs === 'string') {
                    try { srcs = JSON.parse(srcs); } catch { srcs = srcs.split(','); }
                }
                if (!Array.isArray(srcs)) { srcs = []; }

                if (srcs.length > 0) {
                    const nextSrc = srcs.shift();
                    $this.data('srcs', srcs);
                    $this.attr('src', nextSrc);
                } else {
                    $this.off('error');
                }
            });
        });
    }

    function applyTheme() {
        $('#noninite-root').attr('data-theme', state.theme);
        if (state.theme === 'dark') {
            $('.nn-sun-icon').hide();
            $('.nn-moon-icon').show();
        } else {
            $('.nn-sun-icon').show();
            $('.nn-moon-icon').hide();
        }
    }

    function populateStaticControls() {
        $('#nn-sort-by').val(state.options.sortBy);
    }

    function switchView(view, isInitial = false) {
        state.viewMode = view;
        $('.nn-tab-btn').removeClass('nn-active');
        $(`.nn-tab-btn[data-view="${view}"]`).addClass('nn-active');
        lastSearchQuery = null; // Force re-filter on view switch
        if (!isInitial) {
            masterRender();
        }
    }

    function updateSelectionStateOnItems(context = document) {
        const items = $(context).is('[data-app-name]') ? $(context) : $(context).find('[data-app-name]');
        items.each(function() {
            const $item = $(this);
            const appName = $item.attr('data-app-name');
            const selectedVia = state.selection[appName];
            $item.addClass('wired-selection');
            const $toggles = $item.find('.nn-installer-toggle');

            if (selectedVia) {
                $item.addClass('nn-selected');
                $toggles.removeClass('nn-selected').attr('aria-pressed', 'false');
                $toggles.filter(`[data-type="${selectedVia}"]`).addClass('nn-selected').attr('aria-pressed', 'true');
            } else {
                $item.removeClass('nn-selected');
                $toggles.removeClass('nn-selected').attr('aria-pressed', 'false');
            }
        });
    }

    function updateSelectionUI() {
        const count = Object.keys(state.selection).length;
        const $bar = $('#nn-selection-bar');
        const $count = $('#nn-selection-count');
        const $cta = $('#nn-open-drawer-btn');

        if (count > 0) {
            $count.text(`${count} Application${count > 1 ? 's' : ''} Selected`);
            $bar.addClass('nn-visible');
            $cta.addClass('nn-pulse');
            setTimeout(() => $cta.removeClass('nn-pulse'), 700);
        } else {
            $count.text('');
            $bar.removeClass('nn-visible');
            if (state.isSelectionDrawerOpen) toggleDrawer(false);
        }

        if (state.isSelectionDrawerOpen) {
            renderSelectionDrawer();
        }
    }

    function toggleDrawer(force) {
        state.isSelectionDrawerOpen = typeof force === 'boolean' ? force : !state.isSelectionDrawerOpen;
        const $drawer = $('#nn-selection-drawer');
        if (state.isSelectionDrawerOpen) {
            renderSelectionDrawer();
            $drawer.addClass('nn-open').next('.nn-selection-drawer-scrim').addClass('nn-visible');
        } else {
            $drawer.removeClass('nn-open').next('.nn-selection-drawer-scrim').removeClass('nn-visible');
        }
    }

    function toggleHelpModal(force) {
        state.isHelpOpen = typeof force === 'boolean' ? force : !state.isHelpOpen;
        $('#nn-help-modal-scrim').toggleClass('nn-visible', state.isHelpOpen);
    }

    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // -----------------------------------------------------------------------------
    //  EVENT LISTENERS
    // -----------------------------------------------------------------------------

    function attachEventListeners() {
        const $root = $('#noninite-root');

        // Header
        $root.on('click', '#nn-theme-toggle', (e) => {
            e.preventDefault();
            state.theme = state.theme === 'dark' ? 'light' : 'dark';
            applyTheme();
            saveState('theme');
        });
        $root.on('click', '#nn-help-btn, #nn-close-modal-btn', e => {
            e.preventDefault();
            toggleHelpModal();
        });
        const debouncedSearch = debounce(() => masterRender(), SEARCH_DEBOUNCE_MS);
        $root.on('input', '#nn-search-input', e => {
            const newSearch = $(e.currentTarget).val();
            if(newSearch !== state.filters.search){
                 state.filters.search = newSearch;
                 debouncedSearch();
            }
        });

        // Nav & Toolbar
        $root.on('click', '#nn-view-tabs .nn-tab-btn', e => {
            e.preventDefault();
            switchView($(e.currentTarget).data('view'));
        });
        $root.on('change', '#nn-sort-by', e => {
            state.options.sortBy = $(e.currentTarget).val();
            saveState('options');
            masterRender();
        });

        // Filter Rail
        $root.on('change', '#nn-filter-rail input', e => {
            const $input = $(e.currentTarget);
            const name = $input.attr('name');
            const value = $input.val();
            const type = $input.attr('type');
            lastSearchQuery = null; // Force re-filter

            if (type === 'radio') {
                state.filters[name] = value;
            } else if (type === 'checkbox') {
                const current = state.filters[name] || [];
                if ($input.is(':checked')) {
                    current.push(value);
                } else {
                    const index = current.indexOf(value);
                    if (index > -1) current.splice(index, 1);
                }
                state.filters[name] = [...new Set(current)];
            }
            saveState('filters');
            masterRender();
        });
        $root.on('click', '#nn-filter-rail .nn-tag-chip', e => {
            const $chip = $(e.currentTarget);
            const tag = $chip.data('tag');
            const current = state.filters.tags || [];
            const index = current.indexOf(tag);
            lastSearchQuery = null; // Force re-filter

            if (index > -1) current.splice(index, 1);
            else current.push(tag);

            state.filters.tags = current;
            $chip.toggleClass('nn-active');
            saveState('filters');
            masterRender();
        });

        // App Selection
        $root.on('click', '.nn-installer-toggle', e => {
            e.preventDefault(); e.stopPropagation();
            const $btn = $(e.currentTarget);
            const appName = $btn.closest('[data-app-name]').attr('data-app-name');
            const installerType = $btn.data('type');

            if ($btn.hasClass('nn-selected')) {
                delete state.selection[appName];
            } else {
                state.selection[appName] = installerType;
            }
            saveState('selection');
            updateSelectionStateOnItems();
            updateSelectionUI();
        });
        $root.on('click', '.nn-app-list-item, .nn-app-card', e => {
            const $target = $(e.target);
            if ($target.is('button') || $target.closest('button').length) return;
             const $item = $(e.currentTarget);
             const appName = $item.attr('data-app-name');
             const app = state.allApps.find(a => a.name === appName);
             if (!app) return;

             const preferredInstaller = app.facets.installers.winget ? 'winget' : 'choco';
             if (state.selection[appName]) {
                 delete state.selection[appName];
             } else {
                 state.selection[appName] = preferredInstaller;
             }
            saveState('selection');
            updateSelectionStateOnItems();
            updateSelectionUI();
        });
        $root.on('click', '.nn-preset-card', (e) => {
            const presetName = $(e.currentTarget).data('preset-name');
            const preset = state.presets.find(p => p.name === presetName);
            if (!preset) return;

            preset.items.forEach(appName => {
                const app = state.allApps.find(a => a.name === appName);
                if (app) {
                    const installer = app.facets.installers.winget ? 'winget' : 'choco';
                    state.selection[appName] = installer;
                }
            });
            saveState('selection');
            updateSelectionStateOnItems();
            updateSelectionUI();
            showToast(`Preset "${preset.name}" added to selection.`, 3000, 'success');
        });

        // Drawer
        $root.on('click', '#nn-open-drawer-btn, #nn-close-drawer-btn, .nn-selection-drawer-scrim', e => {
             e.preventDefault();
             toggleDrawer();
        });
        $root.on('click', '#nn-selection-drawer .nn-installer-toggle', e => {
            const $btn = $(e.currentTarget);
            const appName = $btn.closest('[data-app-name]').attr('data-app-name');
            const newType = $btn.data('type');
            state.selection[appName] = newType;
            saveState('selection');
            renderSelectionDrawer();
        });
        $root.on('click', '#nn-selection-drawer .nn-remove-item', e => {
            const $btn = $(e.currentTarget);
            const appName = $btn.closest('[data-app-name]').attr('data-app-name');
            delete state.selection[appName];
            saveState('selection');
            updateSelectionStateOnItems();
            updateSelectionUI();
            renderSelectionDrawer();
        });

        $root.on('change', '#nn-script-options-form input', e => {
            const $input = $(e.currentTarget);
            const name = $input.attr('name');
            state.scriptOptions[name] = $input.is(':checkbox') ? $input.is(':checked') : $input.val();
            saveState('scriptOptions');
            generateScript();
        });
        $root.on('click', '.nn-script-preview-tab', e => {
            const type = $(e.currentTarget).data('type');
            state.scriptOptions.type = type;
            $('.nn-script-preview-tab').removeClass('nn-active');
            $(e.currentTarget).addClass('nn-active');
            renderSelectionDrawer();
        });
        $root.on('click', '#nn-copy-script-btn', () => {
            GM_setClipboard($('#nn-script-preview').text());
            showToast('Script copied to clipboard!', 2000, 'success');
        });
        $root.on('click', '#nn-download-script-btn', () => {
            const scriptContent = $('#nn-script-preview').text();
            const type = state.scriptOptions.type;
            const ext = type === 'powershell' ? 'ps1' : 'cmd';
            const filename = `NoNinite-Install-${new Date().toISOString().slice(0,10)}.${ext}`;
            const blob = new Blob([scriptContent], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        });


        // Keyboard shortcuts
        $(document).on('keydown', e => {
            const activeEl = document.activeElement;
            const isInput = ['input', 'select', 'textarea'].includes(activeEl.tagName.toLowerCase());

            if (e.key === '?' && !isInput) {
                e.preventDefault();
                toggleHelpModal();
            } else if (e.key === 't' && !isInput) {
                e.preventDefault();
                $('#nn-theme-toggle').click();
            } else if (e.key === 'g' && !isInput) {
                e.preventDefault();
                toggleDrawer();
            } else if (e.key === '/' && !isInput) {
                e.preventDefault();
                $('#nn-search-input').focus().select();
            } else if (e.key === 'Escape') {
                if (state.isHelpOpen) toggleHelpModal(false);
                else if (state.isSelectionDrawerOpen) toggleDrawer(false);
                else if ($('#nn-search-input').val()) {
                    $('#nn-search-input').val('').trigger('input');
                } else if(activeEl !== document.body) {
                    activeEl.blur();
                }
            } else if (['ArrowDown', 'ArrowUp'].includes(e.key) && !isInput) {
                 e.preventDefault();
                 const navigatables = $('.nn-results-area [tabindex="0"]:visible');
                 let index = navigatables.index(activeEl);
                 if (e.key === 'ArrowDown') index = (index + 1) % navigatables.length;
                 else if (e.key === 'ArrowUp') index = (index - 1 + navigatables.length) % navigatables.length;
                 navigatables.eq(index).focus();
            } else if ([' ', 'Enter'].includes(e.key) && $(activeEl).is('[tabindex="0"]')) {
                 e.preventDefault();
                 $(activeEl).click();
            }
        });
    }

    // -----------------------------------------------------------------------------
    //  INITIALIZATION
    // -----------------------------------------------------------------------------

    async function init() {
        document.title = 'NoNinite Installer';
        if ($('link[rel="icon"]').length) {
            $('link[rel="icon"]').attr('href', GENERIC_ICON_URL);
        } else {
            $('head').append(`<link rel="icon" href="${GENERIC_ICON_URL}" type="image/x-icon">`);
        }

        injectStyles();
        buildSkeleton();
        loadState();

        const $loading = $('#loading-indicator');
        try {
            const rawData = await fetchCatalogData();
            processAndEnrichData(rawData);

            applyTheme();
            populateStaticControls();
            renderFilterRail(); // Render rail with disabled options if needed
            switchView(state.viewMode, true);
            masterRender();
            updateSelectionUI();

            $('body').css('visibility', 'visible');
            $loading.hide();

            idleCallback(() => {
                processDeferredData();
                initializeSearch();
                renderFilterRail(); // Re-render with tags
                masterRender();
            });

            attachEventListeners();

        } catch (error) {
            $loading.text(String(error)).css({ color: 'var(--nn-text-danger)' });
            console.error('NoNinite Init Error:', error);
            showToast(String(error), 5000, 'error');
            $('body').css('visibility', 'visible');
            return;
        }
    }

    init();

})();
