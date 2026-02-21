// ==UserScript==
// @name         Artlist - M3U8 Scraper (Professional - JDownloader Optimized)
// @namespace    http://tampermonkey.net/
// @version      7.0
// @description  Discovers and collects m3u8 URLs from artlist.io with title extraction for JDownloader. Optimized for CSV export with filename hints.
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

    class Queue {
        constructor() { this.elements = {}; this.head = 0; this.tail = 0; }
        enqueue(element) { this.elements[this.tail] = element; this.tail++; }
        dequeue() {
            if (this.isEmpty()) return undefined;
            const item = this.elements[this.head];
            delete this.elements[this.head];
            this.head++;
            if (this.head === this.tail) { this.head = 0; this.tail = 0; }
            return item;
        }
        size() { return this.tail - this.head; }
        isEmpty() { return this.size() === 0; }
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
        foundLinks: new Map(), // Stores: m3u8Url -> { sourceUrl, title, foundAt }
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
                    <h3>M3U8 Scraper 7.0</h3>
                    <div id="header-stats-total" class="header-stats">TOTAL: 0</div>
                    <div class="header-icons">
                         <button id="toggle-panel-btn" class="icon-btn" title="Minimize">${ICONS.chevron}</button>
                    </div>
                </div>
                <div id="scraper-panel-body">
                    <div class="status-section">
                         <p id="scraper-status">Initializing...</p>
                         <div class="button-group main-controls">
                             <button id="autoscroll-btn" title="Scroll to bottom">${ICONS.arrowDown} Auto-Scroll</button>
                             <button id="force-scan-btn" title="Scan page">${ICONS.scan} Force Scan</button>
                             <button id="toggle-scan-btn" class="danger" title="Pause">${ICONS.pause} Pause All</button>
                         </div>
                    </div>

                    <div class="tabs">
                        <button class="tab-link active" data-tab="results-tab">Results</button>
                        <button class="tab-link" data-tab="settings-tab">Settings</button>
                        <button class="tab-link" data-tab="diagnostics-tab">Stats</button>
                        <button class="tab-link" data-tab="log-tab">Log</button>
                    </div>

                    <div id="results-tab" class="tab-content active">
                        <div class="input-group">
                            <input type="search" id="results-filter-input" placeholder="Filter results...">
                            <button id="verify-links-btn" title="Verify Status">${ICONS.check} Verify</button>
                        </div>
                        <textarea id="scraper-results" readonly placeholder="Links will appear here..."></textarea>
                        <div class="button-group">
                            <button id="copy-btn">${ICONS.copy} Copy All (0)</button>
                            <button id="import-btn">${ICONS.upload} Import</button>
                            <select id="export-format-select"><option value="txt">JD2 TXT</option><option value="json">JSON</option></select>
                            <button id="export-btn" class="primary">${ICONS.download} Export</button>
                            <button id="clear-btn" class="danger">${ICONS.trash}</button>
                        </div>
                    </div>

                     <div id="settings-tab" class="tab-content">
                        <div class="setting-item">
                            <label>Active Site Crawler</label>
                            <label class="switch">
                                <input type="checkbox" id="active-crawl-toggle">
                                <span class="slider round"></span>
                            </label>
                             <small>Deep-crawls every discovered link to find hidden files.</small>
                        </div>
                        <hr class="divider">
                        <div class="setting-item">
                            <label for="m3u8-regex-input">Regex Pattern</label>
                            <input type="text" id="m3u8-regex-input">
                        </div>
                         <div class="setting-item">
                             <label for="crawl-delay-input">Crawl Delay (ms)</label>
                             <input type="number" id="crawl-delay-input">
                         </div>
                         <div class="setting-item">
                             <h4>Selectors</h4>
                             <div id="pattern-list"></div>
                             <div class="input-group">
                                 <input type="text" id="pattern-input" placeholder="a[href*='/video/']">
                                 <button id="add-pattern-btn">${ICONS.plus}</button>
                             </div>
                         </div>
                         <button id="save-settings-btn" class="primary">Save Configuration</button>
                     </div>

                    <div id="diagnostics-tab" class="tab-content">
                        <div class="stat-grid">
                            <div class="stat-item"><h4>Session</h4><p id="stat-session-found">0</p></div>
                            <div class="stat-item"><h4>Total</h4><p id="stat-total-stored">0</p></div>
                             <div class="stat-item"><h4>Processed</h4><p id="stat-pages-processed">0</p></div>
                            <div class="stat-item"><h4>Queue</h4><p id="stat-crawl-queue">0</p></div>
                        </div>
                    </div>

                    <div id="log-tab" class="tab-content">
                        <textarea id="scraper-log" readonly></textarea>
                        <button id="clear-log-btn" style="width:100%; margin-top:10px;">Clear Activity Log</button>
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
            }
            #scraper-panel {
                position: fixed; bottom: 20px; right: 20px; width: 480px; max-height: 90vh;
                background-color: var(--bg-primary); color: var(--text-normal);
                border-radius: 12px; z-index: 10000; box-shadow: 0 10px 30px rgba(0,0,0,0.4);
                display: flex; flex-direction: column; font-family: system-ui, -apple-system, sans-serif;
            }
            #scraper-panel.minimized { transform: translateY(calc(100% - 50px)); }
            .panel-header { display: flex; justify-content: space-between; align-items: center; padding: 12px 18px; background: var(--bg-secondary); border-bottom: 1px solid var(--border-color); border-radius: 12px 12px 0 0; }
            #scraper-panel-body { padding: 18px; overflow-y: auto; display: flex; flex-direction: column; gap: 15px; }
            .button-group { display: flex; gap: 8px; }
            button, select { display: flex; align-items: center; justify-content: center; gap: 6px; padding: 8px 12px; border: none; border-radius: 6px; font-size: 13px; cursor: pointer; background: var(--bg-tertiary); color: white; transition: 0.2s; }
            button:hover { filter: brightness(1.2); }
            button.primary { background: var(--accent-primary); }
            button.danger { background: var(--accent-danger); }
            textarea, input { width: 100%; background: var(--bg-secondary); border: 1px solid var(--border-color); color: white; border-radius: 6px; padding: 8px; font-family: monospace; font-size: 12px; }
            .tabs { display: flex; gap: 5px; border-bottom: 1px solid var(--border-color); }
            .tab-link { background: none; border-radius: 0; border-bottom: 2px solid transparent; color: var(--text-muted); }
            .tab-link.active { color: white; border-bottom-color: var(--accent-primary); }
            .tab-content { display: none; flex-direction: column; gap: 10px; }
            .tab-content.active { display: flex; }
            .stat-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
            .stat-item { background: var(--bg-secondary); padding: 12px; border-radius: 8px; text-align: center; }
            .stat-item h4 { margin: 0; font-size: 11px; color: var(--text-muted); text-transform: uppercase; }
            .stat-item p { margin: 5px 0 0; font-size: 20px; font-weight: bold; }
            #toast-container { position: fixed; top: 20px; right: 20px; z-index: 10001; }
            .toast { background: var(--bg-tertiary); color: white; padding: 10px 20px; border-radius: 6px; margin-bottom: 10px; box-shadow: 0 4px 12px rgba(0,0,0,0.5); animation: slideIn 0.3s; }
            @keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
            .switch { position: relative; display: inline-block; width: 40px; height: 20px; }
            .switch input { opacity: 0; width: 0; height: 0; }
            .slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #ccc; transition: .4s; border-radius: 20px; }
            .slider:before { position: absolute; content: ""; height: 16px; width: 16px; left: 2px; bottom: 2px; background-color: white; transition: .4s; border-radius: 50%; }
            input:checked + .slider { background-color: var(--accent-success); }
            input:checked + .slider:before { transform: translateX(20px); }
        `);
    }

    // --- CORE LOGIC ---

    async function processUrlForM3U8(url) {
        if (state.processedPageUrls.has(url)) return;
        state.processedPageUrls.add(url);
        logMessage(`Scanning: ${url}`, 'PROCESS');

        try {
            const htmlText = await fetchPage(url);

            // --- METHOD 2: TITLE EXTRACTION ---
            let trackTitle = "Artlist_Asset";
            const tempDoc = document.implementation.createHTMLDocument();
            tempDoc.documentElement.innerHTML = htmlText;

            const h1 = tempDoc.querySelector('h1');
            const ogTitle = tempDoc.querySelector('meta[property="og:title"]');
            if (h1 && h1.innerText.trim()) {
                trackTitle = h1.innerText.trim();
            } else if (ogTitle && ogTitle.content) {
                trackTitle = ogTitle.content.split('|')[0].trim();
            } else if (tempDoc.title) {
                trackTitle = tempDoc.title.split('–')[0].split('|')[0].trim();
            }

            // Cleanup filename
            const safeTitle = trackTitle.replace(/[/\\?%*:|"<>]/g, '-').replace(/\s+/g, '_');

            config.m3u8Regex.lastIndex = 0;
            const matches = htmlText.match(config.m3u8Regex);

            if (matches) {
                let newFound = 0;
                matches.forEach(match => {
                    if (!state.foundLinks.has(match)) {
                        state.foundLinks.set(match, {
                            sourceUrl: url,
                            title: safeTitle,
                            foundAt: new Date().toISOString()
                        });
                        addLinkToDisplay(match);
                        newFound++;
                    }
                });
                if (newFound > 0) {
                    state.sessionFoundCount += newFound;
                    logMessage(`Found ${newFound} link(s) for: ${trackTitle}`, 'SUCCESS');
                    updateResultsDisplay();
                    requestSave();
                }
            }
        } catch (e) { logMessage(`Error scanning ${url}: ${e.message}`, 'ERROR'); }
    }

    function exportLinks() {
        if (state.foundLinks.size === 0) return showToast('Nothing to export', 'error');
        const format = document.getElementById('export-format-select').value;
        const timestamp = new Date().toISOString().replace(/:/g, '-').slice(0, 19);

        let content, filename, mime;
        if (format === 'json') {
            const data = {
                source: "Artlist Scraper 7.0",
                links: Array.from(state.foundLinks, ([url, meta]) => ({ url, ...meta }))
            };
            content = JSON.stringify(data, null, 2);
            filename = `artlist_data_${timestamp}.json`;
            mime = 'application/json';
        } else {
            // JDownloader 2 CSV Format: URL,Filename
            content = [...state.foundLinks.entries()].map(([url, meta]) => {
                return `${url},${meta.title || 'Artlist_Video'}.mp4`;
            }).join('\n');
            filename = `artlist_jdownloader_${timestamp}.txt`;
            mime = 'text/plain';
        }

        const blob = new Blob([content], { type: mime });
        const downloadUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl; a.download = filename;
        document.body.appendChild(a); a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(downloadUrl);
        showToast(`Exported ${state.foundLinks.size} links for JDownloader`, 'success');
    }

    // --- OTHER HELPERS ---

    function fetchPage(url) {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'GET', url: url,
                onload: res => (res.status < 400) ? resolve(res.responseText) : reject(new Error(`HTTP ${res.status}`)),
                onerror: err => reject(new Error('Network error'))
            });
        });
    }

    function addLinkToDisplay(link) {
        const area = document.getElementById('scraper-results');
        const meta = state.foundLinks.get(link);
        const line = `${meta.title} -> ${link}`;
        state.displayBuffer.push(line);
        if (state.displayBuffer.length > config.maxDisplayLinks) state.displayBuffer.shift();
        area.value = state.displayBuffer.join('\n');
        area.scrollTop = area.scrollHeight;
    }

    function updateResultsDisplay(full = false) {
        const count = state.foundLinks.size;
        document.getElementById('copy-btn').innerText = `Copy All (${count})`;
        document.getElementById('header-stats-total').innerText = `TOTAL: ${count}`;
        if (full) {
            state.displayBuffer = [...state.foundLinks.entries()].slice(-config.maxDisplayLinks).map(([url, meta]) => `${meta.title} -> ${url}`);
            document.getElementById('scraper-results').value = state.displayBuffer.join('\n');
        }
    }

    function logMessage(msg, level = 'INFO') {
        const area = document.getElementById('scraper-log');
        const entry = `[${new Date().toLocaleTimeString()}][${level}] ${msg}`;
        state.logBuffer.push(entry);
        if (state.logBuffer.length > 500) state.logBuffer.shift();
        if (area) { area.value = state.logBuffer.join('\n'); area.scrollTop = area.scrollHeight; }
    }

    function showToast(msg, type = 'info') {
        const container = document.getElementById('toast-container');
        const t = document.createElement('div');
        t.className = `toast ${type}`; t.innerText = msg;
        container.appendChild(t);
        setTimeout(() => t.remove(), 3000);
    }

    // --- INITIALIZATION & EVENTS ---

    function addEventListeners() {
        document.getElementById('toggle-panel-btn').onclick = () => {
            document.getElementById('scraper-panel').classList.toggle('minimized');
        };
        document.getElementById('export-btn').onclick = exportLinks;
        document.getElementById('copy-btn').onclick = () => {
            const txt = [...state.foundLinks.keys()].join('\n');
            GM_setClipboard(txt); showToast('Copied to clipboard');
        };
        document.getElementById('clear-btn').onclick = () => {
            if (confirm('Clear all?')) { state.foundLinks.clear(); updateResultsDisplay(true); saveLinksToStorage(); }
        };
        document.getElementById('autoscroll-btn').onclick = toggleAutoScroll;
        document.getElementById('force-scan-btn').onclick = () => findAndProcessLinks(document.body);
        document.getElementById('toggle-scan-btn').onclick = toggleScan;
        document.getElementById('save-settings-btn').onclick = saveSettings;
        document.getElementById('active-crawl-toggle').onchange = (e) => state.isCrawlingActive = e.target.checked;

        document.querySelectorAll('.tab-link').forEach(btn => {
            btn.onclick = () => {
                document.querySelectorAll('.tab-link, .tab-content').forEach(el => el.classList.remove('active'));
                btn.classList.add('active');
                document.getElementById(btn.dataset.tab).classList.add('active');
            };
        });
    }

    function toggleAutoScroll() {
        state.isAutoScrolling = !state.isAutoScrolling;
        const btn = document.getElementById('autoscroll-btn');
        if (state.isAutoScrolling) {
            btn.classList.add('danger');
            state.autoScrollInterval = setInterval(() => {
                window.scrollTo(0, document.documentElement.scrollHeight);
            }, 800);
        } else {
            btn.classList.remove('danger');
            clearInterval(state.autoScrollInterval);
        }
    }

    function toggleScan() {
        state.isScanning = !state.isScanning;
        const btn = document.getElementById('toggle-scan-btn');
        btn.innerText = state.isScanning ? "Pause All" : "Resume All";
        btn.classList.toggle('danger', state.isScanning);
    }

    function findAndProcessLinks(node) {
        if (!state.isScanning || !node || node.nodeType !== 1) return;
        const selectors = config.customPatterns.join(', ');
        node.querySelectorAll(selectors).forEach(el => processUrlForM3U8(el.href));

        node.querySelectorAll('a[href]').forEach(el => {
            try {
                const url = new URL(el.href, location.origin);
                if (url.hostname === 'artlist.io' && !state.crawledUrls.has(url.href)) {
                    if (!EXCLUDED_PATHS.some(p => url.href.startsWith(p))) {
                        state.crawledUrls.add(url.href);
                        state.urlsToCrawl.enqueue(url.href);
                    }
                }
            } catch(e) {}
        });
    }

    async function crawlLoop() {
        if (state.isScanning && !state.urlsToCrawl.isEmpty()) {
            const url = state.urlsToCrawl.dequeue();
            document.getElementById('scraper-status').innerText = `Crawling: ${state.urlsToCrawl.size()} left`;
            if (state.isCrawlingActive) {
                await processUrlForM3U8(url);
            } else {
                try {
                    const html = await fetchPage(url);
                    const d = document.implementation.createHTMLDocument();
                    d.documentElement.innerHTML = html;
                    findAndProcessLinks(d.body);
                } catch(e) {}
            }
        }
        setTimeout(crawlLoop, config.crawlDelay);
    }

    function loadFromStorage() {
        const saved = GM_getValue('artlist_m3u8_v7', []);
        state.foundLinks = new Map(saved);
        config.customPatterns = GM_getValue('artlist_patterns_v7', config.customPatterns);
        updateResultsDisplay(true);
    }

    function saveLinksToStorage() {
        GM_setValue('artlist_m3u8_v7', [...state.foundLinks]);
        state.newLinksSinceSave = 0;
    }

    function requestSave() {
        state.newLinksSinceSave++;
        if (state.saveTimeout) clearTimeout(state.saveTimeout);
        state.saveTimeout = setTimeout(saveLinksToStorage, 5000);
    }

    function saveSettings() {
        GM_setValue('artlist_patterns_v7', config.customPatterns);
        showToast('Settings Saved');
    }

    function init() {
        createUI();
        addEventListeners();
        loadFromStorage();

        const observer = new MutationObserver(muts => {
            muts.forEach(m => m.addedNodes.forEach(n => findAndProcessLinks(n)));
        });
        observer.observe(document.body, { childList: true, subtree: true });

        findAndProcessLinks(document.body);
        crawlLoop();
        setInterval(() => {
            document.getElementById('stat-session-found').innerText = state.sessionFoundCount;
            document.getElementById('stat-total-stored').innerText = state.foundLinks.size;
            document.getElementById('stat-pages-processed').innerText = state.processedPageUrls.size;
            document.getElementById('stat-crawl-queue').innerText = state.urlsToCrawl.size();
        }, 1000);

        document.getElementById('scraper-status').innerText = "Ready & Monitoring";
    }

    window.addEventListener('load', init);

})();