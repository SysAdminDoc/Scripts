// ==UserScript==
// @name         Artlist - M3U8 Multi-Tab Scraper (Professional - v8.0)
// @namespace    http://tampermonkey.net/
// @version      8.0
// @description  Multi-tab capable M3U8 scraper with unified collection, cross-tab sync, and distributed crawling
// @author       Enhanced by Claude
// @match        https://artlist.io/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=artlist.io
// @connect      artlist.io
// @grant        GM_addStyle
// @grant        GM_setClipboard
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_addValueChangeListener
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

    // --- MULTI-TAB COORDINATION ---
    const TAB_ID = `tab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const HEARTBEAT_INTERVAL = 2000;
    const TAB_TIMEOUT = 5000;

    class MultiTabCoordinator {
        constructor() {
            this.channel = new BroadcastChannel('artlist_scraper_sync');
            this.activeTabs = new Map();
            this.setupListeners();
            this.startHeartbeat();
        }

        setupListeners() {
            this.channel.onmessage = (event) => {
                const { type, data, tabId, timestamp } = event.data;

                switch(type) {
                    case 'heartbeat':
                        this.activeTabs.set(tabId, timestamp);
                        break;
                    case 'link_found':
                        this.handleRemoteLink(data);
                        break;
                    case 'url_claimed':
                        this.handleUrlClaimed(data);
                        break;
                    case 'crawl_complete':
                        this.handleCrawlComplete(data);
                        break;
                    case 'sync_request':
                        this.sendSyncResponse();
                        break;
                }
            };

            // Clean up dead tabs periodically
            setInterval(() => this.cleanupDeadTabs(), 3000);
        }

        startHeartbeat() {
            this.sendHeartbeat();
            setInterval(() => this.sendHeartbeat(), HEARTBEAT_INTERVAL);
        }

        sendHeartbeat() {
            this.broadcast('heartbeat', null);
            this.activeTabs.set(TAB_ID, Date.now());
        }

        cleanupDeadTabs() {
            const now = Date.now();
            for (const [tabId, lastSeen] of this.activeTabs.entries()) {
                if (now - lastSeen > TAB_TIMEOUT) {
                    this.activeTabs.delete(tabId);
                }
            }
            this.updateTabCount();
        }

        updateTabCount() {
            const count = this.activeTabs.size;
            const elem = document.getElementById('active-tabs-count');
            if (elem) {
                elem.innerText = `Active Tabs: ${count}`;
                elem.style.color = count > 1 ? '#4ade80' : '#94a3b8';
            }
        }

        broadcast(type, data) {
            this.channel.postMessage({
                type,
                data,
                tabId: TAB_ID,
                timestamp: Date.now()
            });
        }

        handleRemoteLink(linkData) {
            if (state.foundLinks.has(linkData.url)) return;
            state.foundLinks.set(linkData.url, linkData);
            state.sessionFoundCount++;
            debouncedUpdateDisplay();
            debouncedSave();
        }

        handleUrlClaimed(url) {
            state.claimedUrls.add(url);
        }

        handleCrawlComplete(url) {
            state.processedPageUrls.add(url);
        }

        sendSyncResponse() {
            // Send all our links to requesting tab
            state.foundLinks.forEach((data, url) => {
                this.broadcast('link_found', data);
            });
        }

        requestSync() {
            this.broadcast('sync_request', null);
        }

        notifyLinkFound(url, data) {
            this.broadcast('link_found', data);
        }

        claimUrl(url) {
            this.broadcast('url_claimed', url);
            state.claimedUrls.add(url);
        }

        notifyCrawlComplete(url) {
            this.broadcast('crawl_complete', url);
        }

        getActiveTabCount() {
            return this.activeTabs.size;
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
        users: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>`,
    };

    // --- STATE MANAGEMENT ---
    const state = {
        isScanning: true,
        isMinimized: false,
        isAutoScrolling: false,
        isCrawlingActive: false,
        observer: null,
        autoScrollInterval: null,
        foundLinks: new Map(),
        processedPageUrls: new Set(),
        crawledUrls: new Set(),
        claimedUrls: new Set(), // URLs claimed by other tabs
        urlsToCrawl: new Queue(),
        sessionFoundCount: 0,
        statsInterval: null,
        logBuffer: [],
        displayBuffer: [],
        saveTimeout: null,
        newLinksSinceSave: 0,
        observerTimeout: null,
        coordinator: null,
        lastSyncTime: 0
    };

    // --- CONFIGURATION ---
    const config = {
        crawlDelay: 1500, // Faster with multi-tab
        maxCrawlQueueSize: 10000,
        m3u8Regex: /https:\/\/cms-public-artifacts\.artlist\.io\/content\/artgrid\/[^\s"]+\.m3u8/g,
        customPatterns: [
            'a[href*="/stock-footage/clip/"]',
            'a[href*="/artist/"]',
            'a[href*="/filmmaker/"]'
        ],
        maxLogEntries: 500,
        maxDisplayLinks: 1000,
        syncInterval: 10000 // Sync with storage every 10s
    };

    const EXCLUDED_PATHS = [
        'https://artlist.io/voice-over', 'https://artlist.io/royalty-free-music',
        'https://artlist.io/sfx', 'https://artlist.io/video-templates', 'https://artlist.io/luts',
        'https://artlist.io/tools', 'https://artlist.io/favorites/music', 'https://artlist.io/downloads/music',
        'https://artlist.io/spotlight/collection', 'https://artlist.io/page/pricing/max', 'https://artlist.io/enterprise'
    ];

    // --- UI STYLES ---
    GM_addStyle(`
        #scraper-panel { position: fixed; top: 10px; right: 10px; width: 480px; background: #1e293b; color: #e2e8f0; border-radius: 12px; box-shadow: 0 10px 40px rgba(0,0,0,0.5); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; z-index: 999999; transition: all 0.3s ease; }
        #scraper-panel.minimized { width: 200px; }
        #scraper-panel.minimized #scraper-panel-body { display: none; }
        .panel-header { background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); padding: 12px 16px; border-radius: 12px 12px 0 0; display: flex; align-items: center; justify-content: space-between; cursor: move; }
        .panel-header h3 { margin: 0; font-size: 14px; font-weight: 600; flex: 1; }
        .header-stats { font-size: 12px; font-weight: 700; background: rgba(255,255,255,0.2); padding: 4px 10px; border-radius: 6px; margin-right: 8px; }
        .header-icons { display: flex; gap: 6px; }
        .icon-btn { background: rgba(255,255,255,0.15); border: none; color: white; padding: 6px; border-radius: 6px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
        .icon-btn:hover { background: rgba(255,255,255,0.25); transform: scale(1.05); }
        #scraper-panel-body { padding: 16px; max-height: 600px; overflow-y: auto; }
        .status-section { margin-bottom: 16px; }
        #scraper-status { font-size: 13px; color: #94a3b8; margin: 0 0 10px 0; padding: 8px; background: #0f172a; border-radius: 6px; border-left: 3px solid #3b82f6; }
        .button-group { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 10px; }
        button { background: #334155; color: #e2e8f0; border: none; padding: 8px 12px; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 500; display: flex; align-items: center; gap: 6px; transition: all 0.2s; }
        button:hover { background: #475569; transform: translateY(-1px); }
        button.primary { background: linear-gradient(135deg, #3b82f6, #2563eb); color: white; }
        button.primary:hover { background: linear-gradient(135deg, #2563eb, #1d4ed8); }
        button.danger { background: linear-gradient(135deg, #ef4444, #dc2626); color: white; }
        button.danger:hover { background: linear-gradient(135deg, #dc2626, #b91c1c); }
        .tabs { display: flex; gap: 4px; margin: 16px 0; border-bottom: 2px solid #334155; }
        .tab-link { background: transparent; border: none; border-bottom: 2px solid transparent; margin-bottom: -2px; padding: 8px 16px; color: #94a3b8; cursor: pointer; transition: all 0.2s; border-radius: 0; }
        .tab-link.active { border-bottom-color: #3b82f6; color: #3b82f6; }
        .tab-link:hover { color: #cbd5e1; }
        .tab-content { display: none; }
        .tab-content.active { display: block; }
        textarea { width: 100%; min-height: 200px; background: #0f172a; color: #e2e8f0; border: 1px solid #334155; border-radius: 6px; padding: 12px; font-family: 'Consolas', 'Monaco', monospace; font-size: 12px; resize: vertical; }
        select, input[type="text"], input[type="search"], input[type="number"] { background: #0f172a; color: #e2e8f0; border: 1px solid #334155; padding: 8px 12px; border-radius: 6px; font-size: 12px; width: 100%; }
        .input-group { display: flex; gap: 8px; margin-bottom: 10px; align-items: center; }
        .input-group input { flex: 1; }
        .diagnostics-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
        .stat-card { background: #0f172a; padding: 12px; border-radius: 8px; border-left: 3px solid #3b82f6; }
        .stat-label { font-size: 11px; color: #94a3b8; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px; }
        .stat-value { font-size: 20px; font-weight: 700; color: #e2e8f0; }
        .setting-row { display: flex; justify-content: space-between; align-items: center; margin: 10px 0; padding: 10px; background: #0f172a; border-radius: 6px; }
        .setting-label { font-size: 13px; color: #cbd5e1; }
        #toast-container { position: fixed; bottom: 20px; right: 20px; z-index: 9999999; display: flex; flex-direction: column; gap: 8px; }
        .toast { background: #334155; color: white; padding: 12px 16px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.3); animation: slideIn 0.3s ease; }
        .toast.success { background: linear-gradient(135deg, #10b981, #059669); }
        .toast.error { background: linear-gradient(135deg, #ef4444, #dc2626); }
        @keyframes slideIn { from { transform: translateX(400px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        .multi-tab-indicator { background: #0f172a; padding: 10px; border-radius: 6px; margin-bottom: 12px; border-left: 3px solid #4ade80; display: flex; align-items: center; gap: 10px; }
        .multi-tab-indicator svg { color: #4ade80; }
        #active-tabs-count { font-weight: 700; color: #4ade80; }
    `);

    // --- UI CREATION ---
    function createUI() {
        const container = document.createElement('div');
        container.innerHTML = `
            <div id="scraper-panel" class="dark-theme">
                <div class="panel-header">
                    <h3>M3U8 Multi-Tab Scraper 8.0</h3>
                    <div id="header-stats-total" class="header-stats">TOTAL: 0</div>
                    <div class="header-icons">
                         <button id="toggle-panel-btn" class="icon-btn" title="Minimize">${ICONS.chevron}</button>
                    </div>
                </div>
                <div id="scraper-panel-body">
                    <div class="multi-tab-indicator">
                        ${ICONS.users}
                        <div>
                            <div id="active-tabs-count">Active Tabs: 1</div>
                            <div style="font-size: 11px; color: #94a3b8;">ID: ${TAB_ID.substr(0, 12)}...</div>
                        </div>
                    </div>
                    <div class="status-section">
                         <p id="scraper-status">Initializing multi-tab coordinator...</p>
                         <div class="button-group main-controls">
                             <button id="autoscroll-btn" title="Scroll to bottom">${ICONS.arrowDown} Auto-Scroll</button>
                             <button id="force-scan-btn" title="Scan page">${ICONS.scan} Force Scan</button>
                             <button id="toggle-scan-btn" class="danger" title="Pause">${ICONS.pause} Pause All</button>
                             <button id="sync-now-btn" title="Sync with other tabs">${ICONS.check} Sync Now</button>
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
                        </div>
                        <textarea id="scraper-results" readonly placeholder="Links will appear here from all tabs..."></textarea>
                        <div class="button-group">
                            <button id="copy-btn">${ICONS.copy} Copy All (0)</button>
                            <button id="import-btn">${ICONS.upload} Import</button>
                            <select id="export-format-select">
                                <option value="txt">JD2 TXT</option>
                                <option value="csv">CSV</option>
                                <option value="json">JSON</option>
                            </select>
                            <button id="export-btn" class="primary">${ICONS.download} Export</button>
                            <button id="clear-btn" class="danger">${ICONS.trash}</button>
                        </div>
                    </div>

                    <div id="settings-tab" class="tab-content">
                        <div class="setting-row">
                            <div class="setting-label">Enable Active Crawling</div>
                            <input type="checkbox" id="active-crawl-toggle">
                        </div>
                        <div class="setting-row">
                            <div class="setting-label">Crawl Delay (ms)</div>
                            <input type="number" id="crawl-delay-input" value="${config.crawlDelay}" min="500" max="10000" step="100">
                        </div>
                        <div class="setting-row">
                            <div class="setting-label">Auto-Sync Interval (s)</div>
                            <input type="number" id="sync-interval-input" value="${config.syncInterval / 1000}" min="5" max="60" step="5">
                        </div>
                        <button id="save-settings-btn" class="primary">Save Settings</button>
                    </div>

                    <div id="diagnostics-tab" class="tab-content">
                        <div class="diagnostics-grid">
                            <div class="stat-card">
                                <div class="stat-label">Session Found</div>
                                <div class="stat-value" id="stat-session-found">0</div>
                            </div>
                            <div class="stat-card">
                                <div class="stat-label">Total Stored</div>
                                <div class="stat-value" id="stat-total-stored">0</div>
                            </div>
                            <div class="stat-card">
                                <div class="stat-label">Pages Processed</div>
                                <div class="stat-value" id="stat-pages-processed">0</div>
                            </div>
                            <div class="stat-card">
                                <div class="stat-label">Crawl Queue</div>
                                <div class="stat-value" id="stat-crawl-queue">0</div>
                            </div>
                            <div class="stat-card">
                                <div class="stat-label">Active Tabs</div>
                                <div class="stat-value" id="stat-active-tabs">1</div>
                            </div>
                            <div class="stat-card">
                                <div class="stat-label">This Tab ID</div>
                                <div class="stat-value" style="font-size: 10px;">${TAB_ID.substr(0, 16)}...</div>
                            </div>
                        </div>
                    </div>

                    <div id="log-tab" class="tab-content">
                        <textarea id="scraper-log" readonly placeholder="Activity log..."></textarea>
                        <button id="clear-log-btn" class="danger" style="margin-top: 10px;">${ICONS.trash} Clear Log</button>
                    </div>
                </div>
            </div>
            <div id="toast-container"></div>
        `;
        document.body.appendChild(container);
    }

    // --- CORE SCRAPING LOGIC ---
    async function processUrlForM3U8(url) {
        if (!url || typeof url !== 'string') return;

        // Skip if already processed or claimed by another tab
        if (state.processedPageUrls.has(url) || state.claimedUrls.has(url)) return;

        // Claim this URL across all tabs
        state.coordinator.claimUrl(url);

        try {
            const html = await fetchPage(url);
            const matches = html.match(config.m3u8Regex);

            if (matches && matches.length > 0) {
                const title = extractTitle(html, url);
                matches.forEach(m3u8Url => {
                    if (!state.foundLinks.has(m3u8Url)) {
                        const linkData = {
                            url: m3u8Url,
                            sourceUrl: url,
                            title: title,
                            foundAt: new Date().toISOString(),
                            foundBy: TAB_ID
                        };
                        state.foundLinks.set(m3u8Url, linkData);
                        state.sessionFoundCount++;

                        // Notify other tabs
                        state.coordinator.notifyLinkFound(m3u8Url, linkData);

                        logMessage(`Found: ${title} (${m3u8Url.substr(0, 50)}...)`, 'SUCCESS');
                    }
                });
            }

            state.processedPageUrls.add(url);
            state.coordinator.notifyCrawlComplete(url);
            debouncedUpdateDisplay();
            debouncedSave();

        } catch(e) {
            logMessage(`Error processing ${url}: ${e.message}`, 'ERROR');
        }
    }

    function extractTitle(html, url) {
        const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        if (titleMatch) {
            return titleMatch[1].replace(/\s*\|\s*Artlist.*$/i, '').trim();
        }
        const pathMatch = url.match(/\/([^\/]+)\/?$/);
        return pathMatch ? decodeURIComponent(pathMatch[1]) : 'Unknown';
    }

    function fetchPage(url) {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'GET',
                url: url,
                onload: (resp) => resolve(resp.responseText),
                onerror: reject,
                ontimeout: reject
            });
        });
    }

    // --- DISPLAY & EXPORT ---
    const debouncedUpdateDisplay = debounce(() => updateResultsDisplay(), 500);
    const debouncedSave = debounce(() => requestSave(), 2000);

    function updateResultsDisplay(force = false) {
        const resultsArea = document.getElementById('scraper-results');
        const filterInput = document.getElementById('results-filter-input');
        const filter = filterInput ? filterInput.value.toLowerCase() : '';

        const linksArray = [...state.foundLinks.entries()]
            .filter(([url, data]) => {
                if (!filter) return true;
                return url.toLowerCase().includes(filter) ||
                       data.title.toLowerCase().includes(filter);
            })
            .slice(0, config.maxDisplayLinks);

        if (force || linksArray.length !== state.displayBuffer.length) {
            resultsArea.value = linksArray
                .map(([url, data]) => `${data.title}\n${url}`)
                .join('\n\n');
            state.displayBuffer = linksArray;
        }

        document.getElementById('header-stats-total').innerText = `TOTAL: ${state.foundLinks.size}`;
        document.getElementById('copy-btn').innerText = `${ICONS.copy} Copy All (${state.foundLinks.size})`;
    }

    function exportLinks() {
        const format = document.getElementById('export-format-select').value;
        let content, filename, mimeType;

        const linksArray = [...state.foundLinks.entries()];

        switch(format) {
            case 'json':
                content = JSON.stringify(linksArray.map(([url, data]) => data), null, 2);
                filename = `artlist_m3u8_export_${Date.now()}.json`;
                mimeType = 'application/json';
                break;
            case 'csv':
                content = 'Title,M3U8 URL,Source URL,Found At,Found By\n' +
                    linksArray.map(([url, data]) =>
                        `"${data.title}","${url}","${data.sourceUrl}","${data.foundAt}","${data.foundBy}"`
                    ).join('\n');
                filename = `artlist_m3u8_export_${Date.now()}.csv`;
                mimeType = 'text/csv';
                break;
            default: // txt
                content = linksArray.map(([url, data]) =>
                    `${data.title}\n${url}`
                ).join('\n\n');
                filename = `artlist_m3u8_export_${Date.now()}.txt`;
                mimeType = 'text/plain';
        }

        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
        showToast(`Exported ${state.foundLinks.size} links as ${format.toUpperCase()}`, 'success');
    }

    function logMessage(msg, level = 'INFO') {
        const area = document.getElementById('scraper-log');
        const entry = `[${new Date().toLocaleTimeString()}][${level}] ${msg}`;
        state.logBuffer.push(entry);
        if (state.logBuffer.length > config.maxLogEntries) state.logBuffer.shift();
        if (area) {
            area.value = state.logBuffer.join('\n');
            area.scrollTop = area.scrollHeight;
        }
    }

    function showToast(msg, type = 'info') {
        const container = document.getElementById('toast-container');
        const t = document.createElement('div');
        t.className = `toast ${type}`;
        t.innerText = msg;
        container.appendChild(t);
        setTimeout(() => t.remove(), 3000);
    }

    // --- EVENT HANDLERS ---
    function addEventListeners() {
        document.getElementById('toggle-panel-btn').onclick = () => {
            document.getElementById('scraper-panel').classList.toggle('minimized');
        };

        document.getElementById('export-btn').onclick = exportLinks;

        document.getElementById('copy-btn').onclick = () => {
            const txt = [...state.foundLinks.keys()].join('\n');
            GM_setClipboard(txt);
            showToast(`Copied ${state.foundLinks.size} links to clipboard`, 'success');
        };

        document.getElementById('clear-btn').onclick = () => {
            if (confirm('Clear all links? This will clear data for ALL tabs.')) {
                state.foundLinks.clear();
                updateResultsDisplay(true);
                saveLinksToStorage();
                showToast('All links cleared', 'success');
            }
        };

        document.getElementById('autoscroll-btn').onclick = toggleAutoScroll;
        document.getElementById('force-scan-btn').onclick = () => findAndProcessLinks(document.body);
        document.getElementById('toggle-scan-btn').onclick = toggleScan;
        document.getElementById('save-settings-btn').onclick = saveSettings;
        document.getElementById('sync-now-btn').onclick = () => {
            syncWithStorage();
            state.coordinator.requestSync();
            showToast('Syncing with other tabs...', 'info');
        };

        document.getElementById('active-crawl-toggle').onchange = (e) => {
            state.isCrawlingActive = e.target.checked;
        };

        document.getElementById('clear-log-btn').onclick = () => {
            state.logBuffer = [];
            document.getElementById('scraper-log').value = '';
        };

        document.getElementById('results-filter-input').oninput = () => {
            updateResultsDisplay(true);
        };

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
            logMessage('Auto-scroll enabled', 'INFO');
        } else {
            btn.classList.remove('danger');
            clearInterval(state.autoScrollInterval);
            logMessage('Auto-scroll disabled', 'INFO');
        }
    }

    function toggleScan() {
        state.isScanning = !state.isScanning;
        const btn = document.getElementById('toggle-scan-btn');
        btn.innerText = state.isScanning ? `${ICONS.pause} Pause All` : `${ICONS.play} Resume All`;
        btn.classList.toggle('danger', state.isScanning);
        logMessage(state.isScanning ? 'Scanning resumed' : 'Scanning paused', 'INFO');
    }

    // --- CRAWLING LOGIC ---
    function findAndProcessLinks(node) {
        if (!state.isScanning || !node || node.nodeType !== 1) return;

        const selectors = config.customPatterns.join(', ');
        node.querySelectorAll(selectors).forEach(el => {
            const url = el.href;
            if (url && !state.claimedUrls.has(url) && !state.processedPageUrls.has(url)) {
                processUrlForM3U8(url);
            }
        });

        node.querySelectorAll('a[href]').forEach(el => {
            try {
                const url = new URL(el.href, location.origin);
                if (url.hostname === 'artlist.io' &&
                    !state.crawledUrls.has(url.href) &&
                    !state.claimedUrls.has(url.href)) {
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
            const queueSize = state.urlsToCrawl.size();

            document.getElementById('scraper-status').innerText =
                `Crawling: ${queueSize} URLs queued | ${state.coordinator.getActiveTabCount()} tabs active`;

            if (state.isCrawlingActive && !state.claimedUrls.has(url)) {
                await processUrlForM3U8(url);
            } else if (!state.claimedUrls.has(url)) {
                try {
                    const html = await fetchPage(url);
                    const d = document.implementation.createHTMLDocument();
                    d.documentElement.innerHTML = html;
                    findAndProcessLinks(d.body);
                } catch(e) {
                    logMessage(`Failed to crawl: ${url}`, 'ERROR');
                }
            }
        } else if (!state.isScanning) {
            document.getElementById('scraper-status').innerText = 'Paused';
        } else {
            document.getElementById('scraper-status').innerText = 'Idle - Monitoring for content';
        }

        setTimeout(crawlLoop, config.crawlDelay);
    }

    // --- STORAGE MANAGEMENT ---
    function loadFromStorage() {
        const saved = GM_getValue('artlist_m3u8_v8', []);
        state.foundLinks = new Map(saved);
        config.customPatterns = GM_getValue('artlist_patterns_v8', config.customPatterns);
        config.crawlDelay = GM_getValue('artlist_crawl_delay_v8', config.crawlDelay);
        config.syncInterval = GM_getValue('artlist_sync_interval_v8', config.syncInterval);
        updateResultsDisplay(true);
        logMessage(`Loaded ${state.foundLinks.size} links from storage`, 'INFO');
    }

    function saveLinksToStorage() {
        GM_setValue('artlist_m3u8_v8', [...state.foundLinks]);
        state.newLinksSinceSave = 0;
        state.lastSyncTime = Date.now();
        logMessage(`Saved ${state.foundLinks.size} links to storage`, 'INFO');
    }

    function syncWithStorage() {
        // Pull latest from storage and merge
        const saved = GM_getValue('artlist_m3u8_v8', []);
        const savedMap = new Map(saved);

        let newCount = 0;
        savedMap.forEach((data, url) => {
            if (!state.foundLinks.has(url)) {
                state.foundLinks.set(url, data);
                newCount++;
            }
        });

        if (newCount > 0) {
            logMessage(`Synced ${newCount} new links from storage`, 'INFO');
            updateResultsDisplay(true);
        }
    }

    function requestSave() {
        state.newLinksSinceSave++;
        if (state.saveTimeout) clearTimeout(state.saveTimeout);
        state.saveTimeout = setTimeout(saveLinksToStorage, 3000);
    }

    function saveSettings() {
        config.crawlDelay = parseInt(document.getElementById('crawl-delay-input').value);
        config.syncInterval = parseInt(document.getElementById('sync-interval-input').value) * 1000;

        GM_setValue('artlist_patterns_v8', config.customPatterns);
        GM_setValue('artlist_crawl_delay_v8', config.crawlDelay);
        GM_setValue('artlist_sync_interval_v8', config.syncInterval);

        showToast('Settings saved', 'success');
        logMessage('Settings saved', 'INFO');
    }

    // --- INITIALIZATION ---
    function init() {
        createUI();
        addEventListeners();

        // Initialize multi-tab coordinator
        state.coordinator = new MultiTabCoordinator();
        logMessage(`Multi-tab coordinator initialized (Tab ID: ${TAB_ID})`, 'SUCCESS');

        loadFromStorage();

        // Set up DOM observer
        const observer = new MutationObserver(mutations => {
            mutations.forEach(m => m.addedNodes.forEach(n => findAndProcessLinks(n)));
        });
        observer.observe(document.body, { childList: true, subtree: true });

        // Initial scan
        findAndProcessLinks(document.body);

        // Start crawl loop
        crawlLoop();

        // Periodic storage sync
        setInterval(syncWithStorage, config.syncInterval);

        // Update stats display
        setInterval(() => {
            document.getElementById('stat-session-found').innerText = state.sessionFoundCount;
            document.getElementById('stat-total-stored').innerText = state.foundLinks.size;
            document.getElementById('stat-pages-processed').innerText = state.processedPageUrls.size;
            document.getElementById('stat-crawl-queue').innerText = state.urlsToCrawl.size();
            document.getElementById('stat-active-tabs').innerText = state.coordinator.getActiveTabCount();
        }, 1000);

        document.getElementById('scraper-status').innerText =
            `Ready & Monitoring | ${state.coordinator.getActiveTabCount()} tabs active`;

        logMessage('Scraper initialized and ready', 'SUCCESS');
        showToast('Multi-tab scraper ready!', 'success');
    }

    window.addEventListener('load', init);

})();