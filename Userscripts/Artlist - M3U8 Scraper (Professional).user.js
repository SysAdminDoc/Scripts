// ==UserScript==
// @name         Artlist - M3U8 Scraper (Professional)
// @namespace    http://tampermonkey.net/
// @version      6.2
// @description  A professional-grade tool to discover, crawl, and collect m3u8 URLs from artlist.io. Optimized for performance with large datasets and enhanced with features like search, JSON import/export with source tracking, and link verification.
// @author       Gemini & You
// @match        https://artlist.io/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=artlist.io
// @connect      artlist.io
// @grant        GM_addStyle
// @grant        GM_setClipboard
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// ==/UserScript==

(function() {
    'use strict';

    // --- UTILITY FUNCTIONS ---
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

    // O(1) Queue Implementation
    class Queue {
        constructor() {
            this.elements = {};
            this.head = 0;
            this.tail = 0;
        }
        enqueue(element) {
            this.elements[this.tail] = element;
            this.tail++;
        }
        dequeue() {
            if (this.isEmpty()) return undefined;
            const item = this.elements[this.head];
            delete this.elements[this.head];
            this.head++;
            if (this.head === this.tail) {
                this.head = 0;
                this.tail = 0;
            }
            return item;
        }
        size() {
            return this.tail - this.head;
        }
        isEmpty() {
            return this.size() === 0;
        }
    }


    // --- SVG ICONS ---
    const ICONS = {
        copy: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`,
        upload: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>`,
        download: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>`,
        trash: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>`,
        play: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>`,
        pause: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>`,
        scan: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`,
        arrowDown: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><polyline points="19 12 12 19 5 12"></polyline></svg>`,
        plus: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>`,
        x: `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`,
        chevron: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg>`,
        check: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`,
    };

    // --- STATE MANAGEMENT ---
    const state = {
        isScanning: true,
        isMinimized: false,
        isAutoScrolling: false,
        isCrawlingActive: false,
        observer: null,
        autoScrollInterval: null,
        foundLinks: new Map(), // Changed from Set to Map
        processedPageUrls: new Set(),
        crawledUrls: new Set(),
        urlsToCrawl: new Queue(),
        sessionFoundCount: 0,
        statsInterval: null,
        logBuffer: [],
        displayBuffer: [],
        saveTimeout: null,
        newLinksSinceSave: 0,
        observerTimeout: null
    };

    // --- CONFIGURATION ---
    const config = {
        crawlDelay: 2000,
        maxCrawlQueueSize: 5000,
        m3u8Regex: /https:\/\/cms-public-artifacts\.artlist\.io\/content\/artgrid\/[^\s"]+\.m3u8/g,
        customPatterns: [
            'a[href*="/stock-footage/clip/"]',
            'a[href*="/artist/"]',
            'a[href*="/filmmaker/"]'
        ],
        maxLogEntries: 500,
        maxDisplayLinks: 1000,
    };

    const EXCLUDED_PATHS = [
        'https://artlist.io/voice-over', 'https://artlist.io/royalty-free-music',
        'https://artlist.io/sfx', 'https://artlist.io/video-templates', 'https://artlist.io/luts',
        'https://artlist.io/tools', 'https://artlist.io/favorites/music', 'https://artlist.io/downloads/music',
        'https://artlist.io/spotlight/collection', 'https://artlist.io/page/pricing/max', 'https://artlist.io/enterprise'
    ];


    // --- UI CREATION ---
    function createUI() {
        const container = document.createElement('div');
        container.innerHTML = `
            <div id="scraper-panel" class="dark-theme">
                <div class="panel-header">
                    <h3>M3U8 Scraper 6.2</h3>
                    <div id="header-stats-total" class="header-stats">TOTAL: 0</div>
                    <div class="header-icons">
                         <button id="toggle-panel-btn" class="icon-btn" title="Minimize">${ICONS.chevron}</button>
                    </div>
                </div>
                <div id="scraper-panel-body">
                    <div class="status-section">
                         <p id="scraper-status">Initializing...</p>
                         <div class="button-group main-controls">
                             <button id="autoscroll-btn" title="Scroll to bottom of page to load more content">${ICONS.arrowDown} Auto-Scroll Page</button>
                             <button id="force-scan-btn" title="Manually scan the current page for links">${ICONS.scan} Force Scan</button>
                             <button id="toggle-scan-btn" class="danger" title="Pause or resume all scanning and crawling operations">${ICONS.pause} Pause All</button>
                         </div>
                    </div>

                    <div class="tabs">
                        <button class="tab-link active" data-tab="results-tab">Results</button>
                        <button class="tab-link" data-tab="settings-tab">Settings</button>
                        <button class="tab-link" data-tab="diagnostics-tab">Diagnostics</button>
                        <button class="tab-link" data-tab="log-tab">Log</button>
                    </div>

                    <div id="results-tab" class="tab-content active">
                        <div class="input-group">
                            <input type="search" id="results-filter-input" placeholder="Filter results...">
                            <button id="verify-links-btn" title="Check all links for 200 OK status">${ICONS.check} Verify</button>
                        </div>
                        <textarea id="scraper-results" readonly placeholder="Found m3u8 links will appear here..."></textarea>
                        <div class="button-group">
                            <button id="copy-btn">${ICONS.copy} Copy All (0)</button>
                            <button id="import-btn">${ICONS.upload} Import</button>
                            <select id="export-format-select"><option value="txt">TXT</option><option value="json">JSON</option></select>
                            <button id="export-btn">${ICONS.download} Export</button>
                            <button id="clear-btn" class="danger">${ICONS.trash} Clear All</button>
                        </div>
                    </div>

                     <div id="settings-tab" class="tab-content">
                        <div class="setting-item">
                            <label>Active Site Crawler</label>
                            <label class="switch">
                                <input type="checkbox" id="active-crawl-toggle">
                                <span class="slider round"></span>
                            </label>
                             <small>When enabled, actively crawls every link found on the site. Use with caution. <strong>Not enabled by default.</strong></small>
                        </div>
                        <hr class="divider">
                        <div class="setting-item">
                            <label for="m3u8-regex-input">M3U8 Regex Pattern</label>
                            <input type="text" id="m3u8-regex-input">
                        </div>
                         <div class="setting-item">
                             <label for="crawl-delay-input">Base Crawl Delay (ms)</label>
                             <input type="number" id="crawl-delay-input" min="0" step="100">
                         </div>
                         <div class="setting-item">
                             <label for="max-queue-input">Max Crawl Queue Size</label>
                             <input type="number" id="max-queue-input" min="0" step="100">
                         </div>
                         <div class="setting-item">
                             <h4>Custom URL Patterns</h4>
                             <small>CSS selectors for links that lead to video pages.</small>
                             <div id="pattern-list"></div>
                             <div class="input-group">
                                 <input type="text" id="pattern-input" placeholder="e.g., a[href*='/video/']">
                                 <button id="add-pattern-btn">${ICONS.plus}</button>
                             </div>
                         </div>
                         <button id="save-settings-btn" class="primary">Save Settings</button>
                     </div>

                    <div id="diagnostics-tab" class="tab-content">
                        <div class="stat-grid">
                            <div class="stat-item"><h4>Session Found</h4><p id="stat-session-found">0</p></div>
                            <div class="stat-item"><h4>Total Stored</h4><p id="stat-total-stored">0</p></div>
                             <div class="stat-item"><h4>Pages Processed</h4><p id="stat-pages-processed">0</p></div>
                            <div class="stat-item"><h4>Crawl Queue</h4><p id="stat-crawl-queue">0</p></div>
                        </div>
                    </div>

                    <div id="log-tab" class="tab-content">
                        <textarea id="scraper-log" readonly placeholder="Activity log..."></textarea>
                        <div class="button-group" style="margin-top: 10px;">
                            <button id="clear-log-btn">Clear Log</button>
                        </div>
                    </div>
                </div>
            </div>
            <div id="toast-container"></div>
        `;
        document.body.appendChild(container);
        applyStyles();
    }

    function applyStyles() {
        GM_addStyle(`
            :root {
                --bg-primary: #1e1f22; --bg-secondary: #2b2d31; --bg-tertiary: #313338;
                --text-normal: #dbdee1; --text-muted: #949ba4; --text-interactive: #ffffff;
                --border-color: #40444b; --border-focus: #00a8fc;
                --accent-primary: #5865f2; --accent-primary-hover: #4752c4;
                --accent-success: #2dc770; --accent-success-hover: #23a059;
                --accent-danger: #f23f42; --accent-danger-hover: #c83235;
                --font-primary: "gg sans", "Helvetica Neue", Helvetica, Arial, sans-serif;
            }
            #scraper-panel {
                position: fixed; bottom: 20px; right: 20px; width: 480px; max-height: 90vh;
                background-color: var(--bg-primary); color: var(--text-normal);
                border-radius: 12px; z-index: 10000; box-shadow: 0 10px 30px rgba(0,0,0,0.4);
                display: flex; flex-direction: column; font-family: var(--font-primary);
                transition: transform 0.3s ease-in-out, opacity 0.3s ease-in-out;
            }
            #scraper-panel.minimized { transform: translateY(calc(100% - 50px)); }
            #scraper-panel.minimized #toggle-panel-btn svg { transform: rotate(180deg); }
            .panel-header {
                display: flex; justify-content: space-between; align-items: center; padding: 12px 18px;
                background: var(--bg-secondary); cursor: default;
                border-bottom: 1px solid var(--border-color);
                border-top-left-radius: 12px; border-top-right-radius: 12px;
            }
            .panel-header h3 { margin: 0; font-size: 16px; font-weight: 600; }
            .header-stats { font-size: 14px; color: var(--text-muted); font-weight: 500; }
            .header-icons { display: flex; align-items: center; gap: 8px; }
            .icon-btn { background: none; border: none; color: var(--text-muted); cursor: pointer; padding: 4px; display: flex; align-items: center; justify-content: center; transition: color 0.2s; }
            .icon-btn:hover { color: var(--text-interactive); }
            #toggle-panel-btn svg { transition: transform 0.3s ease; }
            #scraper-panel-body { padding: 18px; overflow-y: auto; display: flex; flex-direction: column; gap: 18px; }
            #scraper-status { margin: 0 0 12px; color: var(--text-muted); font-size: 14px; text-align: center;}
            .button-group { display: flex; gap: 10px; }
            .button-group.main-controls button { flex-grow: 1; }
            #scraper-panel button, #scraper-panel select {
                display: flex; align-items: center; justify-content: center; gap: 8px;
                padding: 10px 16px; border: none; border-radius: 6px; font-size: 14px; font-weight: 500;
                cursor: pointer; transition: background-color 0.2s, transform 0.1s;
                background-color: var(--bg-tertiary); color: var(--text-interactive);
            }
            #scraper-panel select { padding: 10px 8px; -webkit-appearance: none; appearance: none; }
            #scraper-panel button:hover { background-color: #3a3d44; }
            #scraper-panel button:active { transform: translateY(1px); }
            #scraper-panel button.primary { background-color: var(--accent-primary); }
            #scraper-panel button.primary:hover { background-color: var(--accent-primary-hover); }
            #scraper-panel button.danger { background-color: var(--accent-danger); }
            #scraper-panel button.danger:hover { background-color: var(--accent-danger-hover); }
            #scraper-panel button.success { background-color: var(--accent-success); }
            #scraper-panel button.success:hover { background-color: var(--accent-success-hover); }

            textarea, input[type="text"], input[type="number"], input[type="search"] {
                width: 100%; box-sizing: border-box; resize: vertical; padding: 10px;
                background-color: var(--bg-primary); border: 1px solid var(--border-color);
                border-radius: 6px; color: var(--text-normal); font-size: 13px; font-family: "Consolas", monospace;
                transition: border-color 0.2s, box-shadow 0.2s;
            }
            textarea:focus, input:focus { border-color: var(--border-focus); box-shadow: 0 0 0 2px rgba(0, 168, 252, 0.2); outline: none; }
            textarea { height: 180px; }
            #scraper-log { height: 250px; }

            .tabs { display: flex; border-bottom: 1px solid var(--border-color); }
            .tab-link { background: none; color: var(--text-muted); border: none; border-bottom: 2px solid transparent; border-radius: 0; padding: 8px 12px; margin-bottom: -1px; font-size: 14px; font-weight: 500; transition: color 0.2s, border-color 0.2s; }
            .tab-link.active { color: var(--text-interactive); border-bottom-color: var(--accent-primary); }
            .tab-content { display: none; flex-direction: column; gap: 10px;}
            .tab-content.active { display: flex; animation: fadeIn 0.3s ease; }
            @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

            .setting-item { margin-bottom: 15px; }
            .setting-item label:not(.switch) { display: block; font-weight: 600; margin-bottom: 8px; font-size: 14px; }
            .setting-item small { color: var(--text-muted); font-size: 12px; margin-top: 6px; display: block; line-height: 1.4; }
            .divider { border: none; height: 1px; background-color: var(--border-color); margin: 20px 0; }
            .switch { position: relative; display: inline-block; width: 44px; height: 24px; }
            .switch input { opacity: 0; width: 0; height: 0; }
            .slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: var(--bg-tertiary); transition: .4s; }
            .slider:before { position: absolute; content: ""; height: 16px; width: 16px; left: 4px; bottom: 4px; background-color: white; transition: .4s; }
            input:checked + .slider { background-color: var(--accent-success); }
            input:focus + .slider { box-shadow: 0 0 1px var(--accent-success); }
            input:checked + .slider:before { transform: translateX(20px); }
            .slider.round { border-radius: 24px; }
            .slider.round:before { border-radius: 50%; }

            #pattern-list { display: flex; flex-direction: column; gap: 8px; margin: 12px 0; }
            .pattern-item { display: flex; justify-content: space-between; align-items: center; background: var(--bg-secondary); padding: 8px 12px; border-radius: 6px; font-family: "Consolas", monospace; font-size: 13px; }
            .pattern-item button { background: var(--accent-danger); min-width: 28px; height: 28px; padding: 0; }
            .input-group { display: flex; gap: 8px; }
            .input-group input { flex-grow: 1; }
            .input-group button { background-color: var(--accent-success); flex-shrink: 0; padding: 0 12px; }

            .stat-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; text-align: center; }
            .stat-item { background: var(--bg-secondary); padding: 15px; border-radius: 8px; }
            .stat-item h4 { margin: 0 0 8px; font-size: 14px; font-weight: 500; color: var(--text-muted); text-transform: uppercase; }
            .stat-item p { margin: 0; font-size: 24px; font-weight: 600; color: var(--text-interactive); }

            #toast-container { position: fixed; top: 20px; right: 20px; z-index: 10001; display: flex; flex-direction: column; gap: 10px; }
            .toast { padding: 12px 18px; background-color: var(--bg-tertiary); color: var(--text-interactive); border-radius: 8px; box-shadow: 0 5px 15px rgba(0,0,0,0.3); font-size: 14px; animation: slideIn 0.3s ease, fadeOut 0.3s ease 2.7s; }
            .toast.success { background-color: var(--accent-success); }
            .toast.error { background-color: var(--accent-danger); }
            @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
            @keyframes fadeOut { from { opacity: 1; } to { opacity: 0; } }
        `);
    }

    // --- EVENT LISTENERS ---
    function addEventListeners() {
        document.getElementById('toggle-panel-btn').addEventListener('click', () => {
             document.getElementById('scraper-panel').classList.toggle('minimized');
             state.isMinimized = !state.isMinimized;
        });
        document.getElementById('copy-btn').addEventListener('click', copyResultsToClipboard);
        document.getElementById('import-btn').addEventListener('click', importLinks);
        document.getElementById('export-btn').addEventListener('click', exportLinks);
        document.getElementById('clear-btn').addEventListener('click', clearStoredData);
        document.getElementById('force-scan-btn').addEventListener('click', () => {
             showToast('Forcing scan of current page...', 'info');
             findAndProcessLinks(document.body);
        });
        document.getElementById('toggle-scan-btn').addEventListener('click', toggleScan);
        document.getElementById('autoscroll-btn').addEventListener('click', toggleAutoScroll);
        document.getElementById('add-pattern-btn').addEventListener('click', addPattern);
        document.getElementById('save-settings-btn').addEventListener('click', saveSettings);
        document.getElementById('active-crawl-toggle').addEventListener('change', (e) => {
            state.isCrawlingActive = e.target.checked;
            logMessage(`Active Site Crawler ${state.isCrawlingActive ? 'ENABLED' : 'DISABLED'}.`, 'CONFIG');
        });
        document.getElementById('results-filter-input').addEventListener('input', debounce(() => updateResultsDisplay(true), 300));
        document.getElementById('clear-log-btn').addEventListener('click', () => {
            state.logBuffer = [];
            document.getElementById('scraper-log').value = '';
            showToast('Log cleared.', 'info');
        });
        document.getElementById('verify-links-btn').addEventListener('click', verifyLinks);

        document.querySelectorAll('.tab-link').forEach(button => {
            button.addEventListener('click', () => {
                document.querySelectorAll('.tab-link, .tab-content').forEach(el => el.classList.remove('active'));
                button.classList.add('active');
                document.getElementById(button.dataset.tab).classList.add('active');
            });
        });

        window.addEventListener('beforeunload', () => { if (state.newLinksSinceSave > 0) saveLinksToStorage(); });
    }

    // --- UI HELPERS ---
    function showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        container.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }

    function logMessage(message, level = 'INFO') {
        const logArea = document.getElementById('scraper-log');
        if (!logArea) return;
        const timestamp = new Date().toLocaleTimeString();
        const logEntry = `[${timestamp}][${level}] ${message}`;

        state.logBuffer.push(logEntry);
        if (state.logBuffer.length > config.maxLogEntries) {
            state.logBuffer.shift();
        }

        logArea.value = state.logBuffer.join('\n');
        logArea.scrollTop = logArea.scrollHeight;
    }

    function setStatus(message) {
        document.getElementById('scraper-status').textContent = message;
    }

    function addLinkToDisplay(link) {
        const resultsArea = document.getElementById('scraper-results');
        const filterValue = document.getElementById('results-filter-input').value.toLowerCase();
        if (filterValue && !link.toLowerCase().includes(filterValue)) return;

        state.displayBuffer.push(link);
        if (state.displayBuffer.length > config.maxDisplayLinks) {
            state.displayBuffer.shift();
            const firstNewline = resultsArea.value.indexOf('\n');
            if (firstNewline !== -1) {
                resultsArea.value = resultsArea.value.substring(firstNewline + 1) + '\n' + link;
            } else {
                 resultsArea.value = link;
            }
        } else {
             resultsArea.value += (resultsArea.value ? '\n' : '') + link;
        }
        resultsArea.scrollTop = resultsArea.scrollHeight;
    }


    function updateResultsDisplay(forceFullUpdate = false) {
        const resultsArea = document.getElementById('scraper-results');
        const filterValue = document.getElementById('results-filter-input').value.toLowerCase();

        if (forceFullUpdate) {
            const allLinks = [...state.foundLinks.keys()];
            let linksToShow;
            if (filterValue) {
                linksToShow = allLinks.filter(link => link.toLowerCase().includes(filterValue));
            } else {
                linksToShow = allLinks;
            }
            state.displayBuffer = linksToShow.slice(-config.maxDisplayLinks);
            resultsArea.value = state.displayBuffer.join('\n');
        }

        resultsArea.scrollTop = resultsArea.scrollHeight;
        document.getElementById('copy-btn').innerHTML = `${ICONS.copy} Copy All (${state.foundLinks.size})`;
        document.getElementById('header-stats-total').textContent = `TOTAL: ${state.foundLinks.size}`;
        updateDiagnostics();
    }


    function updatePatternDisplay() {
        const list = document.getElementById('pattern-list');
        list.innerHTML = '';
        config.customPatterns.forEach((pattern, index) => {
            const item = document.createElement('div');
            item.className = 'pattern-item';
            item.innerHTML = `<span>${pattern}</span><button data-index="${index}" title="Remove pattern">${ICONS.x}</button>`;
            list.appendChild(item);
        });
        list.querySelectorAll('button').forEach(btn => btn.addEventListener('click', (e) => removePattern(e.currentTarget.dataset.index)));
    }

    function updateDiagnostics() {
        document.getElementById('stat-session-found').textContent = state.sessionFoundCount;
        document.getElementById('stat-total-stored').textContent = state.foundLinks.size;
        document.getElementById('stat-pages-processed').textContent = state.processedPageUrls.size;
        document.getElementById('stat-crawl-queue').textContent = state.urlsToCrawl.size();
    }

    // --- DATA & STORAGE ---
    function copyResultsToClipboard() {
        const text = [...state.foundLinks.keys()].join('\n');
        if (text) { GM_setClipboard(text); showToast('All m3u8 links copied to clipboard!', 'success'); }
        else { showToast('No links to copy.', 'error'); }
    }

    function exportLinks() {
        if (state.foundLinks.size === 0) {
            showToast('No links to export.', 'error');
            return;
        }
        const format = document.getElementById('export-format-select').value;
        const timestamp = new Date().toISOString().replace(/:/g, '-').slice(0, 19);

        let content, filename, mimeType;
        if (format === 'json') {
            const data = {
                export_version: '2.0',
                timestamp: new Date().toISOString(),
                source: 'Artlist M3U8 Scraper v6.2',
                count: state.foundLinks.size,
                links: Array.from(state.foundLinks, ([url, metadata]) => ({
                    m3u8_url: url,
                    source_page: metadata.sourceUrl,
                    found_at: metadata.foundAt
                }))
            };
            content = JSON.stringify(data, null, 2);
            filename = `artlist_m3u8_links_${timestamp}.json`;
            mimeType = 'application/json;charset=utf-8;';
        } else {
            // TXT format as CSV: m3u8_url,source_page_url
            const header = 'm3u8_url,source_page_url\n';
            content = header + [...state.foundLinks.entries()].map(([url, metadata]) => `${url},${metadata.sourceUrl}`).join('\n');
            filename = `artlist_m3u8_links_${timestamp}.txt`;
            mimeType = 'text/csv;charset=utf-8;';
        }

        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        showToast(`Exporting ${state.foundLinks.size} links as ${format.toUpperCase()}...`, 'success');
    }

    function importLinks() {
        const input = prompt("Paste links (TXT/CSV or JSON) to import. JSON will overwrite existing data.");
        if (!input) return;

        let addedCount = 0;
        const initialSize = state.foundLinks.size;

        try { // Try parsing as JSON first
            const data = JSON.parse(input);
            if (data && Array.isArray(data.links)) {
                if (data.export_version && data.export_version.startsWith('2')) {
                     state.foundLinks.clear(); // Overwrite as requested
                     data.links.forEach(item => {
                         if(item.m3u8_url) {
                            state.foundLinks.set(item.m3u8_url, { sourceUrl: item.source_page || 'imported', foundAt: item.found_at || new Date().toISOString() });
                         }
                     });
                } else { // Handle old JSON format
                    state.foundLinks.clear();
                    data.links.forEach(url => {
                        if (typeof url === 'string' && url.includes('.m3u8')) {
                             state.foundLinks.set(url, { sourceUrl: 'imported_legacy_json', foundAt: new Date().toISOString() });
                        }
                    });
                }
                addedCount = state.foundLinks.size;
                showToast(`Imported ${addedCount} links from JSON, overwriting previous data.`, 'success');
            } else { throw new Error("Invalid JSON format"); }
        } catch (e) { // Fallback to plain text / CSV
            const lines = input.split(/[\n]+/).filter(line => line.trim() !== '');
            lines.forEach(line => {
                const parts = line.split(',');
                const url = parts[0].trim();
                 if (url.includes('.m3u8')) {
                     const source = parts[1] ? parts[1].trim() : 'imported_text';
                     if (!state.foundLinks.has(url)) {
                        state.foundLinks.set(url, { sourceUrl: source, foundAt: new Date().toISOString() });
                     }
                 }
            });
            addedCount = state.foundLinks.size - initialSize;
            showToast(`Imported ${addedCount} new unique links.`, 'success');
        }

        if (addedCount > 0) {
            updateResultsDisplay(true);
            requestSave();
        }
    }

    function loadFromStorage() {
        const savedData = GM_getValue('artlist_m3u8_links_v6', null);
        if (savedData && Array.isArray(savedData)) {
            // New Map format
            state.foundLinks = new Map(savedData);
        } else {
            // Legacy Set format (from v5)
            const savedLinks = GM_getValue('artlist_m3u8_links_v5', []);
            savedLinks.forEach(link => state.foundLinks.set(link, { sourceUrl: 'migrated_from_v5', foundAt: new Date().toISOString() }));
        }


        state.isCrawlingActive = GM_getValue('artlist_active_crawl_v5', false);
        config.customPatterns = GM_getValue('artlist_patterns_v5', config.customPatterns);
        config.m3u8Regex = new RegExp(GM_getValue('artlist_regex_v5', config.m3u8Regex.source), 'g');
        config.crawlDelay = GM_getValue('artlist_crawl_delay_v5', config.crawlDelay);
        config.maxCrawlQueueSize = GM_getValue('artlist_max_queue_v5', config.maxCrawlQueueSize);

        logMessage(`Loaded ${state.foundLinks.size} links and settings.`);
        updateResultsDisplay(true);
        updatePatternDisplay();
        document.getElementById('active-crawl-toggle').checked = state.isCrawlingActive;
        document.getElementById('m3u8-regex-input').value = config.m3u8Regex.source;
        document.getElementById('crawl-delay-input').value = config.crawlDelay;
        document.getElementById('max-queue-input').value = config.maxCrawlQueueSize;
    }

    function requestSave() {
        state.newLinksSinceSave++;
        if (state.saveTimeout) clearTimeout(state.saveTimeout);
        if (state.newLinksSinceSave >= 100) {
            saveLinksToStorage();
        } else {
            state.saveTimeout = setTimeout(saveLinksToStorage, 30000);
        }
    }

    function saveLinksToStorage() {
        if (state.saveTimeout) clearTimeout(state.saveTimeout);
        state.saveTimeout = null;
        state.newLinksSinceSave = 0;
        // Convert Map to array for storage
        GM_setValue('artlist_m3u8_links_v6', [...state.foundLinks]);
        logMessage(`Saved ${state.foundLinks.size} links to storage.`, 'DEBUG');
    }

    function saveSettings() {
        try {
            const newRegex = document.getElementById('m3u8-regex-input').value;
            config.m3u8Regex = new RegExp(newRegex, 'g');
            GM_setValue('artlist_regex_v5', newRegex);
            config.crawlDelay = parseInt(document.getElementById('crawl-delay-input').value, 10);
            GM_setValue('artlist_crawl_delay_v5', config.crawlDelay);
            config.maxCrawlQueueSize = parseInt(document.getElementById('max-queue-input').value, 10);
            GM_setValue('artlist_max_queue_v5', config.maxCrawlQueueSize);
            GM_setValue('artlist_patterns_v5', config.customPatterns);
            GM_setValue('artlist_active_crawl_v5', state.isCrawlingActive);
            showToast('Settings saved successfully!', 'success');
            logMessage('All settings saved to storage.');
        } catch (e) {
            showToast('Invalid Regex pattern!', 'error');
            logMessage(`Failed to save settings: ${e.message}`, 'ERROR');
        }
    }

    function clearStoredData() {
        if (confirm('Are you sure you want to delete all stored links and custom patterns? This cannot be undone.')) {
            state.foundLinks.clear(); state.sessionFoundCount = 0; state.displayBuffer = [];
            config.customPatterns = ['a[href*="/stock-footage/clip/"]'];
            saveLinksToStorage(); GM_setValue('artlist_patterns_v5', config.customPatterns);
            updateResultsDisplay(true); updatePatternDisplay();
            showToast('All stored data has been cleared.', 'success');
        }
    }

    // --- PATTERN MANAGEMENT ---
    function addPattern() {
        const input = document.getElementById('pattern-input');
        const newPattern = input.value.trim();
        if (newPattern && !config.customPatterns.includes(newPattern)) {
            config.customPatterns.push(newPattern);
            input.value = '';
            logMessage(`Added pattern: ${newPattern}`); updatePatternDisplay();
        }
    }

    function removePattern(index) {
        const removed = config.customPatterns.splice(index, 1);
        logMessage(`Removed pattern: ${removed}`); updatePatternDisplay();
    }

    // --- CORE LOGIC ---
    function toggleAutoScroll() {
        state.isAutoScrolling = !state.isAutoScrolling;
        const btn = document.getElementById('autoscroll-btn');
        if (state.isAutoScrolling) {
            btn.innerHTML = `${ICONS.pause} Stop Scrolling`;
            btn.classList.add('danger');
            let lastHeight = 0;
            let consecutiveStops = 0;
            state.autoScrollInterval = setInterval(() => {
                window.scrollTo(0, document.documentElement.scrollHeight);
                const currentHeight = document.documentElement.scrollHeight;
                if (currentHeight === lastHeight) {
                    consecutiveStops++;
                    if (consecutiveStops > 5) {
                        showToast('Reached bottom of page.', 'success');
                        toggleAutoScroll();
                    }
                } else {
                    consecutiveStops = 0;
                }
                lastHeight = currentHeight;
            }, 500);
            showToast('Auto-scrolling started...', 'info');
        } else {
            clearInterval(state.autoScrollInterval);
            btn.innerHTML = `${ICONS.arrowDown} Auto-Scroll Page`;
            btn.classList.remove('danger');
        }
    }

    function toggleScan() {
        state.isScanning = !state.isScanning;
        const btn = document.getElementById('toggle-scan-btn');
        if (state.isScanning) {
            btn.innerHTML = `${ICONS.pause} Pause All`; btn.classList.add("danger");
            setStatus('Scanning & Crawling Active...'); logMessage('Scanning resumed.');
            initializeObserver(); crawlNextUrl();
        } else {
            if (state.observer) state.observer.disconnect();
            btn.innerHTML = `${ICONS.play} Resume All`; btn.classList.remove("danger"); btn.classList.add("success");
            setStatus('Scanning Paused.'); logMessage('Scanning paused by user.');
        }
    }

    async function processUrlForM3U8(url) {
        if (state.processedPageUrls.has(url)) return;
        state.processedPageUrls.add(url);
        logMessage(`Processing: ${url}`, 'PROCESS');
        try {
            const htmlText = await fetchPage(url);
            config.m3u8Regex.lastIndex = 0;
            const matches = htmlText.match(config.m3u8Regex);
            if (matches) {
                let newLinksFound = 0;
                matches.forEach(match => {
                    if (!state.foundLinks.has(match)) {
                        state.foundLinks.set(match, { sourceUrl: url, foundAt: new Date().toISOString() });
                        addLinkToDisplay(match);
                        newLinksFound++;
                    }
                });
                if (newLinksFound > 0) {
                    state.sessionFoundCount += newLinksFound;
                    logMessage(`Success! Found ${newLinksFound} new link(s). Total: ${state.foundLinks.size}`, 'SUCCESS');
                    updateResultsDisplay(); // Update counts
                    requestSave();
                }
            }
        } catch (error) { logMessage(`Failed to process ${url}: ${error.message}`, 'ERROR'); }
    }

    function fetchPage(url) {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'GET', url: url,
                onload: res => (res.status >= 200 && res.status < 400) ? resolve(res.responseText) : reject(new Error(`HTTP ${res.status}`)),
                onerror: err => reject(new Error(`Network error: ${JSON.stringify(err)}`))
            });
        });
    }

    function findAndProcessLinks(node) {
        if (!state.isScanning || !node || node.nodeType !== Node.ELEMENT_NODE) return;
        try {
            const selector = config.customPatterns.join(', ');
            if (selector) { node.querySelectorAll(selector).forEach(el => processUrlForM3U8(el.href)); }
        } catch (e) { logMessage(`Invalid CSS selector in patterns: ${e.message}`, 'ERROR'); }

        node.querySelectorAll('a[href]').forEach(el => {
            if (state.urlsToCrawl.size() >= config.maxCrawlQueueSize) return;
            try {
                const url = new URL(el.href, document.baseURI);
                if (url.hostname !== 'artlist.io' || state.crawledUrls.has(url.href)) return;
                if (EXCLUDED_PATHS.some(path => url.href.startsWith(path))) return;
                state.crawledUrls.add(url.href);
                state.urlsToCrawl.enqueue(url.href);
            } catch (e) { /* Ignore invalid URLs */ }
        });
    }

    async function crawlNextUrl() {
        if (!state.isScanning || state.urlsToCrawl.isEmpty()) {
            setTimeout(crawlNextUrl, 5000); // Check again later
            return;
        }
        const url = state.urlsToCrawl.dequeue();
        logMessage(`Crawling [${state.urlsToCrawl.size()} left]: ${url}`, 'CRAWL');
        setStatus(`Crawling... ${state.urlsToCrawl.size()} in queue.`);

        if (state.isCrawlingActive) {
            await processUrlForM3U8(url);
        } else {
            try {
                const htmlText = await fetchPage(url);
                const tempDoc = document.implementation.createHTMLDocument();
                tempDoc.documentElement.innerHTML = htmlText;
                findAndProcessLinks(tempDoc.body);
            } catch (error) { logMessage(`Failed to crawl ${url}: ${error.message}`, 'ERROR'); }
        }

        const queueSize = state.urlsToCrawl.size();
        let dynamicDelay = config.crawlDelay;
        if (queueSize > config.maxCrawlQueueSize * 0.9) {
            dynamicDelay *= 2;
        } else if (queueSize < 100) {
            dynamicDelay = Math.max(500, config.crawlDelay / 2);
        }
        setTimeout(crawlNextUrl, dynamicDelay + Math.random() * 200);
    }

    function initializeObserver() {
        if (state.observer) state.observer.disconnect();
        state.observer = new MutationObserver((mutationsList) => {
            if (!state.isScanning) return;
            if (state.observerTimeout) clearTimeout(state.observerTimeout);
            state.observerTimeout = setTimeout(() => {
                for (const mutation of mutationsList) {
                    if (mutation.type === 'childList') {
                        mutation.addedNodes.forEach(node => findAndProcessLinks(node));
                    }
                }
            }, 200);
        });
        state.observer.observe(document.body, { childList: true, subtree: true });
        logMessage('DOM observer is now active.');
    }

    // --- NEW FEATURES ---
    function checkLinkStatus(url) {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'HEAD',
                url: url,
                onload: res => resolve(res.status),
                onerror: err => reject(err),
                ontimeout: () => reject(new Error('Timeout'))
            });
        });
    }

    async function verifyLinks() {
        const btn = document.getElementById('verify-links-btn');
        if (btn.disabled) return;

        const linksToVerify = [...state.foundLinks.keys()];
        if (linksToVerify.length === 0) {
            showToast('No links to verify.', 'info');
            return;
        }

        btn.disabled = true;
        btn.innerHTML = `${ICONS.check} Verifying...`;
        logMessage(`Starting verification for ${linksToVerify.length} links...`, 'VERIFY');

        let verified = 0; let failed = 0; const BATCH_SIZE = 10;

        for (let i = 0; i < linksToVerify.length; i += BATCH_SIZE) {
            const batch = linksToVerify.slice(i, i + BATCH_SIZE);
            await Promise.all(batch.map(async link => {
                try {
                    const status = await checkLinkStatus(link);
                    if (status === 200) {
                        verified++;
                    } else {
                        failed++;
                        logMessage(`Verification FAILED (${status}) for: ${link}`, 'WARN');
                    }
                } catch (e) {
                    failed++;
                    logMessage(`Verification ERROR for: ${link}`, 'ERROR');
                }
            }));
            setStatus(`Verifying... ${i + batch.length}/${linksToVerify.length} (Failed: ${failed})`);
            if (!state.isScanning) { // Allow user to cancel
                 showToast('Verification cancelled.', 'info');
                 break;
            }
        }

        showToast(`Verification complete! ${verified} OK, ${failed} failed.`, failed > 0 ? 'error' : 'success');
        logMessage(`Verification complete. OK: ${verified}, Failed: ${failed}.`, 'VERIFY');
        setStatus('Scanning & Crawling Active...');
        btn.disabled = false;
        btn.innerHTML = `${ICONS.check} Verify`;
    }

    // --- SCRIPT INITIALIZATION ---
    function init() {
        createUI();
        addEventListeners();
        loadFromStorage();
        findAndProcessLinks(document.body);
        initializeObserver();
        crawlNextUrl();
        setStatus('Scanning & Crawling Active...');
        state.statsInterval = setInterval(updateDiagnostics, 1000);
    }
    window.addEventListener('load', init);
})();

