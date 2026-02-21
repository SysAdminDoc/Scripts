// ==UserScript==
// @name         AdNull Power - Facebook Ad Blocker
// @namespace    https://github.com/SysAdminDoc/AdNull
// @version      1.3.0
// @description  Comprehensive Facebook ad blocker. Feed & Reels both collect AND queue for blocking. Sync & Block auto-pulls from GitHub/master list. Auto-syncs every 5 detections.
// @author       Matthew Parker
// @match        https://www.facebook.com/*
// @match        https://m.facebook.com/*
// @match        https://web.facebook.com/*
// @icon         https://www.facebook.com/favicon.ico
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @grant        GM_registerMenuCommand
// @grant        GM_openInTab
// @grant        unsafeWindow
// @grant        window.close
// @run-at       document-start
// @connect      raw.githubusercontent.com
// @connect      gist.githubusercontent.com
// @connect      api.github.com
// @connect      *
// @license      MIT
// ==/UserScript==

// ══════════════════════════════════════════════════════════════════════════════
// VISIBILITY OVERRIDE - Trick Facebook into thinking page is always visible
// ══════════════════════════════════════════════════════════════════════════════
(function applyVisibilityOverride() {
    'use strict';
    const pageWindow = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;
    const pageDocument = pageWindow.document;

    if (pageWindow.__adnullVisibilityOverride) return;
    pageWindow.__adnullVisibilityOverride = true;

    const spoofProps = ['hidden', 'webkitHidden', 'mozHidden', 'msHidden'];
    const spoofStateProps = ['visibilityState', 'webkitVisibilityState', 'mozVisibilityState', 'msVisibilityState'];

    spoofProps.forEach(prop => {
        try {
            Object.defineProperty(pageWindow.Document.prototype, prop, {
                get: () => false, configurable: true, enumerable: true
            });
        } catch (e) {}
    });

    spoofStateProps.forEach(prop => {
        try {
            Object.defineProperty(pageWindow.Document.prototype, prop, {
                get: () => 'visible', configurable: true, enumerable: true
            });
        } catch (e) {}
    });

    const noop = e => e.stopImmediatePropagation();
    const events = ['visibilitychange', 'webkitvisibilitychange', 'blur', 'focus'];
    events.forEach(evt => {
        pageDocument.addEventListener(evt, noop, true);
        pageWindow.addEventListener(evt, noop, true);
    });

    console.log('[AdNull Power] ✓ Visibility override active');
})();

(function() {
    'use strict';

    const VERSION = '1.3.0';
    const MASTER_BLOCKLIST_URL = 'https://raw.githubusercontent.com/SysAdminDoc/AdNull/refs/heads/main/Blocklists/facebook_master_blocklist.csv';

    // ══════════════════════════════════════════════════════════════════════════════
    // CONFIG
    // ══════════════════════════════════════════════════════════════════════════════
    const DEFAULT_CONFIG = {
        // Mode (auto-detected based on URL)
        currentMode: 'auto',

        // Reels Skipper
        reelsSkipSpeed: 2000,
        reelsSkipMethod: 'button',
        skipSponsoredReels: true,

        // Feed Scanner (collector only)
        feedScanInterval: 500,
        feedScrollDelay: 1500,
        feedScrollAmount: 1000,
        currentSpeed: 'fast',
        speeds: {
            slow:   { delay: 2500, amount: 600 },
            normal: { delay: 1800, amount: 900 },
            fast:   { delay: 1200, amount: 1200 },
            turbo:  { delay: 600,  amount: 1500 }
        },
        noNewContentThreshold: 5,
        refreshCooldown: 5000,

        // Batch Blocking (reels only)
        batchMode: true,
        batchSize: 10,

        // Blocking Timing
        blockDelay: 500,
        pageLoadWait: 800,
        clickDelay: 400,
        tabCloseDelay: 100,
        blockTimeout: 20000,

        // Nuclear Mode
        nuclearModeEnabled: false,

        // GitHub Sync
        githubSyncEnabled: false,
        githubToken: '',
        githubRepo: '',
        githubPath: '',
        githubBranch: 'main',
        githubSyncThreshold: 5,

        // Sync & Block (Reels auto-import and block)
        syncAndBlockEnabled: false,
        syncAndBlockInterval: 300000, // 5 minutes in ms
        syncAndBlockSource: 'github', // 'github' or 'master'
        lastSyncAndBlockTime: 0,

        // UI
        showNotifications: true,
        dashboardPosition: { x: null, y: null },
        dashboardMinimized: false,
        logPanelHeight: 200
    };

    // ══════════════════════════════════════════════════════════════════════════════
    // STATE
    // ══════════════════════════════════════════════════════════════════════════════
    let state = {
        config: { ...DEFAULT_CONFIG },
        blockedSponsors: new Set(),
        whitelist: [],
        whitelistIndex: new Set(),
        detectionLog: [], // Unified log for both feed and reels
        detectionIndex: {},
        blockQueue: [],
        totalBlocked: 0,
        totalDetected: 0,
        sessionDetected: 0,
        sessionBlocked: 0,
        failedCount: 0,
        isRunning: false,
        isPaused: false,
        isBlocking: false,
        currentBlockItem: null,
        batchInProgress: false,
        skipperWasActive: false,
        consecutiveSkipFailures: 0,
        detectionsSinceLastSync: 0,
        currentMode: 'feed',
        isGroupFeed: false,
        lastScrollHeight: 0,
        noNewContentCount: 0,
        lastRefreshTime: 0
    };

    // Reels specific
    let reelsSkipperRunning = false;
    let lastScannedVideoId = null;
    const processedReels = new Set();
    const scannedFeedPosts = new Set();

    // Dashboard reference
    let dashboard = null;
    let isDragging = false;
    let dragOffset = { x: 0, y: 0 };

    // ══════════════════════════════════════════════════════════════════════════════
    // UTILITIES
    // ══════════════════════════════════════════════════════════════════════════════
    const sleep = ms => new Promise(r => setTimeout(r, ms));

    function log(...args) {
        const mode = state.currentMode === 'reels' ? '🎬' : '📰';
        console.log(`[AdNull Power ${mode}]`, ...args);
    }

    function isVisible(el) {
        if (!el) return false;
        const rect = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);
        return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
    }

    function waitFor(fn, maxTries = 50, interval = 100) {
        return new Promise((resolve) => {
            let tries = 0;
            const check = () => {
                const result = fn();
                if (result) return resolve(result);
                if (++tries >= maxTries) return resolve(null);
                setTimeout(check, interval);
            };
            check();
        });
    }

    function normalizeUrl(url) {
        if (!url) return '';
        try {
            const u = new URL(url.startsWith('http') ? url : `https://www.facebook.com/${url}`);
            let path = u.pathname.replace(/\/+$/, '');
            if (path.includes('profile.php') && u.searchParams.has('id')) {
                return `profile.php?id=${u.searchParams.get('id')}`;
            }
            return path.replace(/^\//, '').toLowerCase();
        } catch (e) {
            return url.toLowerCase().replace(/[^a-z0-9._-]/g, '');
        }
    }

    function isBlocked(url) {
        return state.blockedSponsors.has(normalizeUrl(url));
    }

    function isWhitelisted(url) {
        return state.whitelistIndex.has(normalizeUrl(url));
    }

    function getPageType() {
        const path = location.pathname;
        if (path.includes('/reel')) return 'reels';
        if (path.includes('/watch')) return 'watch';
        if (path === '/' || path === '/home' || path === '/home.php' || path.length <= 1) return 'feed';
        if (/^\/(profile\.php|[^\/]+\/?$)/.test(path) &&
            !/^\/(watch|reel|marketplace|groups|gaming|events|pages)/.test(path)) return 'profile';
        return 'other';
    }

    function isReelsPage() {
        const type = getPageType();
        return type === 'reels' || type === 'watch';
    }

    function isFeedPage() {
        return getPageType() === 'feed';
    }

    function isProfilePage() {
        return getPageType() === 'profile';
    }

    function isBlockingPopup() {
        return location.search.includes('__adnull_block=1') ||
               sessionStorage.getItem('adnull_blocking_active') === '1';
    }

    // ══════════════════════════════════════════════════════════════════════════════
    // URL CHANGE MONITORING - Detect SPA navigation
    // ══════════════════════════════════════════════════════════════════════════════
    let lastKnownPath = location.pathname;
    let urlMonitorInitialized = false;

    function checkForModeChange() {
        const currentPath = location.pathname;
        if (currentPath === lastKnownPath) return;

        lastKnownPath = currentPath;
        const oldMode = state.currentMode;
        let newMode = null;

        if (isReelsPage()) {
            newMode = 'reels';
        } else if (isFeedPage()) {
            newMode = 'feed';
        }

        if (newMode && newMode !== oldMode) {
            log(`🔄 Mode change detected: ${oldMode} → ${newMode}`);
            state.currentMode = newMode;

            // Stop any running processes from old mode
            if (oldMode === 'reels' && reelsSkipperRunning) {
                stopSkipper();
            } else if (oldMode === 'feed' && state.isRunning) {
                stopFeedScanner();
            }

            // Update dashboard to reflect new mode
            if (dashboard) {
                // Recreate dashboard for new mode UI
                dashboard.remove();
                dashboard = null;
                createDashboard();
            }

            // Do initial scan for new mode
            setTimeout(() => {
                if (newMode === 'reels') {
                    scanReels();
                    // Start Sync & Block timer if enabled
                    if (state.config.syncAndBlockEnabled) {
                        startSyncAndBlockTimer();
                    }
                } else if (newMode === 'feed') {
                    scanFeed();
                }
                updateDashboard();
                updateLogPanel();
            }, 500);

            showToast(`Switched to ${newMode === 'reels' ? '🎬 Reels' : '📰 Feed'} mode`, 'info');
        }
    }

    function initUrlMonitor() {
        if (urlMonitorInitialized) return;
        urlMonitorInitialized = true;

        // Intercept history.pushState
        const originalPushState = history.pushState;
        history.pushState = function(...args) {
            originalPushState.apply(this, args);
            setTimeout(checkForModeChange, 100);
        };

        // Intercept history.replaceState
        const originalReplaceState = history.replaceState;
        history.replaceState = function(...args) {
            originalReplaceState.apply(this, args);
            setTimeout(checkForModeChange, 100);
        };

        // Listen for popstate (back/forward buttons)
        window.addEventListener('popstate', () => {
            setTimeout(checkForModeChange, 100);
        });

        // Fallback: periodic check every 2 seconds
        setInterval(checkForModeChange, 2000);

        log('✓ URL monitor initialized');
    }

    // ══════════════════════════════════════════════════════════════════════════════
    // TOAST NOTIFICATIONS
    // ══════════════════════════════════════════════════════════════════════════════
    function showToast(message, type = 'info') {
        if (!state.config.showNotifications) return;

        const existing = document.querySelectorAll('.adnull-toast');
        existing.forEach(t => t.remove());

        const toast = document.createElement('div');
        toast.className = 'adnull-toast';
        const colors = {
            success: '#22c55e',
            error: '#ef4444',
            warning: '#f59e0b',
            info: '#3b82f6'
        };
        toast.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: ${colors[type] || colors.info};
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            font-family: -apple-system, sans-serif;
            font-size: 13px;
            font-weight: 600;
            z-index: 999999;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            animation: slideIn 0.3s ease;
        `;
        toast.textContent = message;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }

    // ══════════════════════════════════════════════════════════════════════════════
    // STORAGE - Shared detection log between modes
    // ══════════════════════════════════════════════════════════════════════════════
    function loadState() {
        try {
            const config = GM_getValue('adnull_power_config_v2');
            if (config) state.config = { ...DEFAULT_CONFIG, ...JSON.parse(config) };

            // Load blocked list (shared)
            const blocked = GM_getValue('blocked');
            if (blocked) {
                const arr = JSON.parse(blocked);
                state.blockedSponsors = new Set(arr);
                state.totalBlocked = arr.length;
            }

            // Load whitelist (shared)
            const whitelist = GM_getValue('whitelist');
            if (whitelist) {
                state.whitelist = JSON.parse(whitelist);
                state.whitelistIndex = new Set(state.whitelist.map(e => normalizeUrl(e.url)));
            }

            // Load unified detection log
            const detectionLog = GM_getValue('detectionLog');
            if (detectionLog) {
                state.detectionLog = JSON.parse(detectionLog);
                rebuildDetectionIndex();
                state.totalDetected = state.detectionLog.length;
            }

            // Load block queue
            const blockQueue = GM_getValue('blockQueue');
            if (blockQueue) {
                state.blockQueue = JSON.parse(blockQueue).filter(q => q.url?.startsWith('http'));
            }

            state.failedCount = state.detectionLog.filter(e => e.status === 'failed').length;
            state.detectionsSinceLastSync = GM_getValue('detectionsSinceLastSync', 0);

            log('State loaded:', {
                detected: state.totalDetected,
                blocked: state.totalBlocked,
                queue: state.blockQueue.length,
                sincesync: state.detectionsSinceLastSync
            });
        } catch (e) {
            console.error('[AdNull Power] Load error:', e);
        }
    }

    function rebuildDetectionIndex() {
        state.detectionIndex = {};
        state.detectionLog.forEach((entry, i) => {
            state.detectionIndex[normalizeUrl(entry.url)] = i;
        });
    }

    function saveConfig() {
        GM_setValue('adnull_power_config_v2', JSON.stringify(state.config));
    }

    function saveBlocked() {
        GM_setValue('blocked', JSON.stringify(Array.from(state.blockedSponsors)));
    }

    function saveWhitelist() {
        GM_setValue('whitelist', JSON.stringify(state.whitelist));
    }

    function saveDetectionLog() {
        GM_setValue('detectionLog', JSON.stringify(state.detectionLog));
    }

    function saveBlockQueue() {
        GM_setValue('blockQueue', JSON.stringify(state.blockQueue));
    }

    function saveSkipperState(active) {
        GM_setValue('skipperActive', active);
    }

    function saveSyncCounter() {
        GM_setValue('detectionsSinceLastSync', state.detectionsSinceLastSync);
    }

    function shouldAutoStart() {
        return GM_getValue('adnull_autostart', false);
    }

    function setAutoStart(v) {
        GM_setValue('adnull_autostart', v);
    }

    // ══════════════════════════════════════════════════════════════════════════════
    // DETECTION LOG & RECORDS
    // ══════════════════════════════════════════════════════════════════════════════
    function addToDetectionLog(entry) {
        const normalized = normalizeUrl(entry.url);
        if (!normalized) return false;
        if (state.detectionIndex[normalized] !== undefined) return false;
        if (state.whitelistIndex.has(normalized)) return false;

        const logEntry = {
            id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
            url: entry.url,
            author: entry.author || 'Unknown',
            content: entry.content || '',
            source: entry.source || state.currentMode, // 'feed' or 'reel'
            method: entry.method || 'unknown',
            detectedAt: new Date().toISOString(),
            timestamp: Date.now(),
            status: state.blockedSponsors.has(normalized) ? 'blocked' : 'detected'
        };

        state.detectionLog.unshift(logEntry);
        rebuildDetectionIndex();
        state.totalDetected = state.detectionLog.length;
        saveDetectionLog();

        // Track detections since last sync
        state.detectionsSinceLastSync++;
        saveSyncCounter();

        // Auto-sync if threshold reached
        if (state.config.githubSyncEnabled && state.detectionsSinceLastSync >= state.config.githubSyncThreshold) {
            log(`Sync threshold reached (${state.detectionsSinceLastSync}), syncing...`);
            syncToGitHub();
        }

        return true;
    }

    function updateLogStatus(url, status, extra = {}) {
        const normalized = normalizeUrl(url);
        const idx = state.detectionIndex[normalized];
        if (idx !== undefined && state.detectionLog[idx]) {
            state.detectionLog[idx].status = status;
            Object.assign(state.detectionLog[idx], extra);
            saveDetectionLog();
            state.failedCount = state.detectionLog.filter(e => e.status === 'failed').length;
            return state.detectionLog[idx];
        }
        return null;
    }

    function markAsBlocked(url) {
        const normalized = normalizeUrl(url);
        if (!normalized) return false;

        state.blockedSponsors.add(normalized);
        state.totalBlocked = state.blockedSponsors.size;
        state.sessionBlocked++;

        updateLogStatus(url, 'blocked', { blockedAt: new Date().toISOString() });
        saveBlocked();

        log(`✓ Blocked! Total: ${state.totalBlocked}`);
        return true;
    }

    function addToWhitelist(url, name) {
        const normalized = normalizeUrl(url);
        if (!normalized || state.whitelistIndex.has(normalized)) return false;

        state.whitelist.push({ url, name, addedAt: new Date().toISOString() });
        state.whitelistIndex.add(normalized);

        const idx = state.blockQueue.findIndex(q => normalizeUrl(q.url) === normalized);
        if (idx >= 0) {
            state.blockQueue.splice(idx, 1);
            saveBlockQueue();
        }

        state.blockedSponsors.delete(normalized);
        saveBlocked();
        saveWhitelist();
        updateLogStatus(url, 'whitelisted');

        return true;
    }

    // ══════════════════════════════════════════════════════════════════════════════
    // QUEUE MANAGEMENT (for blocking)
    // ══════════════════════════════════════════════════════════════════════════════
    function queueForBlocking(url, author, source = 'auto') {
        if (!url || !url.startsWith('http')) return false;

        const normalized = normalizeUrl(url);
        if (!normalized) return false;
        if (isBlocked(url)) return false;
        if (isWhitelisted(url)) return false;
        if (state.blockQueue.some(q => normalizeUrl(q.url) === normalized)) return false;

        state.blockQueue.push({
            id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
            url,
            author: author || 'Unknown',
            source: source === 'auto' ? state.currentMode : source,
            addedAt: Date.now(),
            attempts: 0
        });

        updateLogStatus(url, 'queued');
        saveBlockQueue();
        log(`Queued: ${author} (${state.blockQueue.length} in queue)`);

        return true;
    }

    // ══════════════════════════════════════════════════════════════════════════════
    // FEED SPONSOR DETECTION
    // ══════════════════════════════════════════════════════════════════════════════
    function checkFeedContext() {
        const path = window.location.pathname;
        state.isGroupFeed = path.includes('/groups/') && !path.includes('/groups/feed/');
    }

    function isFeedSponsored(post) {
        // 1. Direct "Sponsored" text in span
        const autoSpans = post.querySelectorAll('span[dir="auto"]');
        for (const span of autoSpans) {
            if (span.innerText === 'Sponsored') return { method: 'text' };
        }

        // 2. Structural check for tracking params
        const adLinks = Array.from(post.querySelectorAll('a[href*="__cft__[0]="]'));
        for (let link of adLinks) {
            if (!link.href.includes('/groups/') && !link.href.includes('/events/')) {
                return { method: 'cft_tracking' };
            }
        }

        // 3. Shadow Root / Aria LabelledBy
        const elCanvas = post.querySelector('a > span > span[aria-labelledby] > canvas');
        if (elCanvas) {
            const id = elCanvas.parentElement.getAttribute('aria-labelledby');
            if (id) {
                const escapedId = id.replace(/(:)/g, '\\$1');
                const elLabel = document.querySelector(`[id="${escapedId}"]`);
                if (elLabel && /Sponsored|Sponsorisé|Publicidad/i.test(elLabel.innerText)) {
                    return { method: 'canvas_aria' };
                }
            }
        }

        // 4. Aria Label Fallback
        const els = post.querySelectorAll('span, a, div[aria-label]');
        for (let el of els) {
            if (el.getAttribute('aria-label') === 'Sponsored') return { method: 'aria_label' };
        }

        // 5. Link to Ad Preferences
        if (post.querySelector('a[href*="/ads/about"]')) return { method: 'ads_link' };
        if (post.querySelector('a[href*="/ads/preferences"]')) return { method: 'ads_link' };

        // 6. External links with fbclid
        for (const link of post.querySelectorAll('a[href*="fbclid"]')) {
            try {
                const url = new URL(link.href);
                if (!url.hostname.includes('facebook.com') && !url.hostname.includes('fb.com')) {
                    return { method: 'external_fbclid' };
                }
            } catch (e) {}
        }

        // 7. rel="nofollow" to external
        for (const link of post.querySelectorAll('a[rel="nofollow"]')) {
            try {
                const url = new URL(link.href);
                if (!url.hostname.includes('facebook.com') && !url.hostname.includes('fb.com')) {
                    return { method: 'nofollow_external' };
                }
            } catch (e) {}
        }

        // 8. CTA buttons to external
        const ctaPatterns = /^(learn more|shop now|sign up|get offer|buy now|install now|download|subscribe|get started|book now|order now|apply now|try now|watch more|see more details|get quote|contact us|visit site)$/i;
        for (const link of post.querySelectorAll('a[href]')) {
            const linkText = link.innerText?.trim();
            if (linkText && ctaPatterns.test(linkText)) {
                try {
                    const url = new URL(link.href);
                    if (!url.hostname.includes('facebook.com')) {
                        return { method: 'cta_external' };
                    }
                } catch (e) {}
            }
        }

        return null;
    }

    function scrapeFeedPostData(post) {
        const data = {
            id: null,
            author: 'Unknown',
            url: null,
            content: ''
        };

        const posInset = post.getAttribute('aria-posinset');
        data.id = posInset ? `pos_${posInset}` : 'gen_' + Math.random().toString(36).substr(2, 9);

        const headerLinks = post.querySelectorAll('h2 a, h3 a, h4 a, strong a');
        for (const link of headerLinks) {
            const href = link.href;
            if (href.includes('/groups/') || href.includes('/events/') ||
                href.includes('/ads/') || href.includes('/watch/') ||
                href.includes('/reel/') || href.includes('/photo/') ||
                href.includes('/video/') || href.includes('#')) continue;

            try {
                const url = new URL(href);
                const parts = url.pathname.split('/').filter(p => p);
                if (parts.length >= 1) {
                    const username = parts[0];
                    if (/^[a-zA-Z0-9._-]+$/.test(username) &&
                        !['home', 'watch', 'marketplace', 'gaming', 'events', 'pages', 'groups'].includes(username)) {
                        data.author = link.innerText || username;
                        data.url = `https://www.facebook.com/${username}`;
                        break;
                    }
                    if (username === 'profile.php' && url.searchParams.has('id')) {
                        data.author = link.innerText || 'Profile';
                        data.url = `https://www.facebook.com/profile.php?id=${url.searchParams.get('id')}`;
                        break;
                    }
                }
            } catch(e) {}
        }

        const contentDiv = post.querySelector('div[dir="auto"]');
        if (contentDiv) {
            data.content = contentDiv.innerText.substring(0, 80).replace(/\n/g, ' ');
        }

        return data;
    }

    // ══════════════════════════════════════════════════════════════════════════════
    // REEL SPONSOR DETECTION
    // ══════════════════════════════════════════════════════════════════════════════
    function isReelSponsored(container) {
        const text = container.innerText || '';

        // Method 1: "Sponsored" text
        if (/\bSponsored\b/i.test(text)) return { method: 'text' };

        // Method 2: External links with fbclid
        for (const link of container.querySelectorAll('a[href*="fbclid"]')) {
            try {
                const url = new URL(link.href);
                if (!url.hostname.includes('facebook.com') && !url.hostname.includes('fb.com')) {
                    return { method: 'external_fbclid' };
                }
            } catch (e) {}
        }

        // Method 3: rel="nofollow" to external
        for (const link of container.querySelectorAll('a[rel="nofollow"]')) {
            try {
                const url = new URL(link.href);
                if (!url.hostname.includes('facebook.com') && !url.hostname.includes('fb.com')) {
                    return { method: 'nofollow_external' };
                }
            } catch (e) {}
        }

        // Method 4: Profile link with tracking
        const profileLink = container.querySelector('a[aria-label="See Owner Profile"]');
        if (profileLink) {
            const href = profileLink.getAttribute('href') || '';
            if (profileLink.getAttribute('target') === '_blank' && href.includes('__cft__')) {
                return { method: 'profile_tracking' };
            }
        }

        // Method 5: CTA buttons to external
        const ctaPatterns = /^(learn more|shop now|sign up|get offer|buy now|install now|download|subscribe|get started|book now|order now|apply now|try now|watch more|see more details|get quote|contact us|visit site)$/i;
        for (const link of container.querySelectorAll('a[href]')) {
            const linkText = link.innerText?.trim();
            if (linkText && ctaPatterns.test(linkText)) {
                try {
                    const url = new URL(link.href);
                    if (!url.hostname.includes('facebook.com')) {
                        return { method: 'cta_external' };
                    }
                } catch (e) {}
            }
        }

        // Method 6: UTM parameters
        for (const link of container.querySelectorAll('a[href*="utm_"]')) {
            if (link.href.includes('utm_source=fb') || link.href.includes('utm_medium=paid')) {
                try {
                    const url = new URL(link.href);
                    if (!url.hostname.includes('facebook.com')) {
                        return { method: 'utm_external' };
                    }
                } catch (e) {}
            }
        }

        return null;
    }

    function extractReelData(container) {
        const data = { author: 'Unknown', url: null, source: 'reel' };

        const profileLink = container.querySelector('a[aria-label="See Owner Profile"]');
        if (profileLink) {
            const href = profileLink.getAttribute('href') || '';
            try {
                const url = new URL(href.startsWith('http') ? href : 'https://www.facebook.com' + href);
                if (url.pathname.includes('profile.php') && url.searchParams.has('id')) {
                    data.url = `https://www.facebook.com/profile.php?id=${url.searchParams.get('id')}`;
                } else {
                    const parts = url.pathname.split('/').filter(p => p);
                    if (parts[0] && /^[a-zA-Z0-9._-]+$/.test(parts[0]) &&
                        !['profile.php', 'watch', 'reel', 'reels', 'groups'].includes(parts[0])) {
                        data.url = `https://www.facebook.com/${parts[0]}`;
                    }
                }
            } catch (e) {}
        }

        const h2 = container.querySelector('h2');
        if (h2) {
            const text = h2.innerText?.trim();
            if (text && text.length < 100) data.author = text.split('\n')[0];
        }

        if (data.author === 'Unknown' && data.url) {
            const parts = data.url.split('/');
            data.author = parts[parts.length - 1].split('?')[0];
        }

        return data;
    }

    function getCurrentReelContainer() {
        for (const container of document.querySelectorAll('[data-video-id]')) {
            const rect = container.getBoundingClientRect();
            if (rect.top > -100 && rect.top < 300 && rect.height > 400) return container;
        }
        return null;
    }

    function getCurrentVideoId() {
        for (const container of document.querySelectorAll('[data-video-id]')) {
            const rect = container.getBoundingClientRect();
            const centerY = window.innerHeight / 2;
            if (rect.top < centerY && rect.bottom > centerY) {
                return container.getAttribute('data-video-id');
            }
        }
        return null;
    }

    function tagPost(element, mode = 'feed') {
        if (element.querySelector('.adnull-tag')) return;
        const tag = document.createElement('div');
        tag.className = 'adnull-tag';
        tag.innerHTML = '⛔ SPONSORED';
        if (getComputedStyle(element).position === 'static') {
            element.style.position = 'relative';
        }
        if (mode === 'feed') {
            element.style.border = '2px solid #ff4444';
        }
        element.appendChild(tag);
    }

    // ══════════════════════════════════════════════════════════════════════════════
    // SCANNING - Feed (Collect Only) & Reels (Collect + Queue)
    // ══════════════════════════════════════════════════════════════════════════════
    function scanFeed() {
        if (!isFeedPage()) return { found: 0 };
        checkFeedContext();
        let found = 0;

        const selectors = [
            'div[aria-posinset]',
            'div[role="article"]',
            'div[data-pagelet^="FeedUnit"]',
            'div.x1lliihq'
        ];

        const candidates = document.querySelectorAll(selectors.join(','));
        candidates.forEach(post => {
            if (post.innerText.length < 10) return;
            if (post.dataset.adnullScanned === 'true') return;
            post.dataset.adnullScanned = 'true';

            const sponsored = isFeedSponsored(post);
            if (!sponsored) return;

            const data = scrapeFeedPostData(post);
            if (!data.url) {
                return;
            }

            const normalized = normalizeUrl(data.url);
            if (scannedFeedPosts.has(normalized)) return;
            scannedFeedPosts.add(normalized);

            log('🎯 Feed Sponsor:', sponsored.method, '| Author:', data.author);
            tagPost(post, 'feed');

            // Add to detection log AND queue for blocking
            if (addToDetectionLog({ ...data, method: sponsored.method, source: 'feed' })) {
                state.sessionDetected++;
                found++;

                // Queue for blocking (so reels mode can block feed detections)
                queueForBlocking(data.url, data.author, 'feed');

                updateDashboard();
                updateLogPanel();
            }
        });

        return { found };
    }

    function scanReels() {
        if (!isReelsPage()) return { found: 0 };
        let found = 0;

        for (const container of document.querySelectorAll('[data-video-id]')) {
            const rect = container.getBoundingClientRect();
            if (rect.bottom < 0 || rect.top > window.innerHeight) continue;

            const videoId = container.getAttribute('data-video-id');
            if (!videoId || processedReels.has(videoId)) continue;
            processedReels.add(videoId);

            const sponsored = isReelSponsored(container);
            if (sponsored) {
                const data = extractReelData(container);
                log('🎯 Reel Sponsor:', sponsored.method, '| Author:', data.author);
                tagPost(container, 'reel');

                if (data.url) {
                    // Add to detection log
                    if (addToDetectionLog({ ...data, method: sponsored.method, source: 'reel' })) {
                        state.sessionDetected++;
                        found++;

                        // Queue for blocking (reels mode blocks)
                        queueForBlocking(data.url, data.author, 'reel');

                        updateDashboard();
                        updateLogPanel();
                    }

                    // Skip sponsored reel
                    if (state.config.skipSponsoredReels && !reelsSkipperRunning) {
                        setTimeout(skipReel, 500);
                    }
                }
            }
        }

        return { found };
    }

    // ══════════════════════════════════════════════════════════════════════════════
    // FEED SCANNER ENGINE (Continuous Collector)
    // ══════════════════════════════════════════════════════════════════════════════
    async function startFeedScanner() {
        if (state.isRunning) return;
        state.isRunning = true;
        setAutoStart(true);
        state.lastScrollHeight = document.documentElement.scrollHeight;
        state.noNewContentCount = 0;

        updateDashboard();
        log('📰 Feed Collector started');
        showToast('📰 Feed Collector started', 'success');

        const speed = state.config.speeds[state.config.currentSpeed];

        while (state.isRunning) {
            // Scan for sponsors
            scanFeed();

            // Scroll down
            window.scrollBy({ top: speed.amount, behavior: 'smooth' });

            // Check for feed end
            if (checkFeedEnd()) {
                // Feed end detected - refresh to continue collecting
                log('📰 Feed end - refreshing to continue...');
                setAutoStart(true);
                await sleep(1000);
                location.reload();
                return;
            }

            await sleep(speed.delay);
        }

        state.isRunning = false;
        updateDashboard();
    }

    function stopFeedScanner() {
        state.isRunning = false;
        setAutoStart(false);
        log('📰 Feed Collector stopped');
        showToast('📰 Feed Collector stopped', 'info');
        updateDashboard();
    }

    function checkFeedEnd() {
        const currentHeight = document.documentElement.scrollHeight;

        if (currentHeight === state.lastScrollHeight) {
            state.noNewContentCount++;

            if (state.noNewContentCount >= state.config.noNewContentThreshold) {
                const now = Date.now();
                if (now - state.lastRefreshTime >= state.config.refreshCooldown) {
                    state.lastRefreshTime = now;
                    return true; // Signal to refresh
                }
            }
        } else {
            state.noNewContentCount = 0;
            state.lastScrollHeight = currentHeight;
        }

        return false;
    }

    // ══════════════════════════════════════════════════════════════════════════════
    // REELS SKIPPER
    // ══════════════════════════════════════════════════════════════════════════════
    function skipReel() {
        const notif = document.createElement('div');
        notif.className = 'adnull-skip-notif';
        notif.innerHTML = '<span>⏭️</span><span>SKIPPING AD</span>';
        document.body.appendChild(notif);
        setTimeout(() => notif.remove(), 1000);

        const beforeId = getCurrentVideoId();

        if (state.config.reelsSkipMethod === 'button') {
            if (!clickNextButton()) simulateDownKey();
        } else {
            simulateDownKey();
        }

        setTimeout(() => {
            const afterId = getCurrentVideoId();
            if (afterId === beforeId) {
                state.consecutiveSkipFailures++;
                if (state.consecutiveSkipFailures >= 3) {
                    log('⚠️ Skip failed 3x - refreshing');
                    state.consecutiveSkipFailures = 0;
                    location.href = 'https://www.facebook.com/reel/?s=tab';
                }
            } else {
                state.consecutiveSkipFailures = 0;
            }
        }, 1000);
    }

    function simulateDownKey() {
        document.body.dispatchEvent(new KeyboardEvent('keydown', {
            key: 'ArrowDown', code: 'ArrowDown', keyCode: 40, which: 40, bubbles: true, cancelable: true
        }));
    }

    function clickNextButton() {
        const nextBtn = document.querySelector('[aria-label="Next Card"]');
        if (nextBtn) { nextBtn.click(); return true; }
        const downArrow = document.querySelector('div[role="button"] svg path[d*="57.47"]')?.closest('[role="button"]');
        if (downArrow) { downArrow.click(); return true; }
        return false;
    }

    async function waitForReel() {
        for (let i = 0; i < 30; i++) {
            const video = document.querySelector('video');
            if (video && video.readyState >= 2) return;
            await sleep(100);
        }
    }

    async function reelsSkipperLoop() {
        if (!reelsSkipperRunning) return;

        try {
            await waitForReel();

            const videoId = getCurrentVideoId();
            if (videoId && videoId !== lastScannedVideoId) {
                lastScannedVideoId = videoId;
                const result = scanReels();
                log('Scanned reel:', videoId, '| Found:', result.found);
                updateDashboard();
                await sleep(200);
            }

            await sleep(state.config.reelsSkipSpeed);

            const shouldContinue = !state.batchInProgress;

            if (reelsSkipperRunning && shouldContinue) {
                skipReel();
                await sleep(500);
            }

            if (reelsSkipperRunning && shouldContinue) {
                requestAnimationFrame(() => reelsSkipperLoop());
            } else if (reelsSkipperRunning && state.batchInProgress) {
                setTimeout(() => reelsSkipperLoop(), 1000);
            }
        } catch (e) {
            console.error('[AdNull Power] Skipper error:', e);
            if (reelsSkipperRunning) setTimeout(() => reelsSkipperLoop(), 1000);
        }
    }

    function startSkipper() {
        if (reelsSkipperRunning) return;
        reelsSkipperRunning = true;
        lastScannedVideoId = null;
        saveSkipperState(true);
        log('▶ Skipper started');
        showToast('▶ Skipper started', 'success');
        updateDashboard();
        reelsSkipperLoop();
    }

    function stopSkipper(temporary = false) {
        if (!reelsSkipperRunning) return;
        reelsSkipperRunning = false;
        lastScannedVideoId = null;
        if (!temporary) saveSkipperState(false);
        log('⏹ Skipper stopped');
        if (!temporary) showToast('⏹ Skipper stopped', 'info');
        updateDashboard();
    }

    // ══════════════════════════════════════════════════════════════════════════════
    // BLOCKING EXECUTION (Reels & Block Ads tab)
    // ══════════════════════════════════════════════════════════════════════════════
    async function triggerBatchBlock() {
        if (state.isBlocking) return;
        if (state.batchInProgress) return;
        if (state.blockQueue.length === 0) {
            showToast('Queue is empty', 'info');
            return;
        }

        state.batchInProgress = true;
        state.skipperWasActive = reelsSkipperRunning;

        log('🎬 Batch blocking:', state.blockQueue.length, 'items');
        showToast(`🎬 Blocking ${state.blockQueue.length} accounts...`, 'warning');

        if (reelsSkipperRunning) {
            stopSkipper(true);
        }

        state.isRunning = true;
        await processBlockQueue();
    }

    async function processBlockQueue() {
        if (state.isBlocking || state.isPaused || state.blockQueue.length === 0) return;
        if (!state.isRunning && !state.batchInProgress) return;

        state.isBlocking = true;
        updateDashboard();

        while (state.blockQueue.length > 0 && (state.isRunning || state.batchInProgress) && !state.isPaused) {
            const sponsor = state.blockQueue[0];
            const normalized = normalizeUrl(sponsor.url);

            if (state.blockedSponsors.has(normalized) || isWhitelisted(sponsor.url)) {
                state.blockQueue.shift();
                saveBlockQueue();
                continue;
            }

            sponsor.attempts = (sponsor.attempts || 0) + 1;
            state.currentBlockItem = sponsor;

            log(`Blocking: ${sponsor.author} (attempt ${sponsor.attempts})`);
            updateLogStatus(sponsor.url, 'blocking');
            updateDashboard();

            GM_setValue('adnull_block_complete', 0);
            GM_setValue('adnull_block_result', '');

            let blockUrl = sponsor.url + (sponsor.url.includes('?') ? '&' : '?') + '__adnull_block=1';
            if (sponsor.attempts > 1) {
                blockUrl += '&__adnull_retry=' + sponsor.attempts + '&t=' + Date.now();
            }

            const tabRef = GM_openInTab(blockUrl, { active: false, setParent: true });

            const startTime = Date.now();
            const startSignal = GM_getValue('adnull_block_complete', 0);
            const timeout = sponsor.attempts > 1 ? state.config.blockTimeout * 1.5 : state.config.blockTimeout;
            let result = null;

            while (Date.now() - startTime < timeout) {
                await sleep(200);
                const currentSignal = GM_getValue('adnull_block_complete', 0);
                if (currentSignal > startSignal) {
                    result = GM_getValue('adnull_block_result', '');
                    try { tabRef.close(); } catch(e) {}
                    break;
                }
                if (tabRef.closed) { result = 'closed'; break; }
            }

            if (!result) {
                log('Block timeout');
                try { tabRef.close(); } catch(e) {}
            }

            if (result === 'success' || result === 'already_blocked') {
                markAsBlocked(sponsor.url);
                showToast(`✓ Blocked: ${sponsor.author}`, 'success');
            } else {
                updateLogStatus(sponsor.url, 'failed', { error: result || 'timeout', attempts: sponsor.attempts });
                if (sponsor.attempts < 3) {
                    state.blockQueue.push(sponsor);
                }
            }

            state.blockQueue.shift();
            state.currentBlockItem = null;
            saveBlockQueue();
            updateDashboard();
            updateLogPanel();

            if (state.blockQueue.length > 0 && !state.isPaused) {
                await sleep(state.config.blockDelay);
            }
        }

        state.isBlocking = false;
        state.currentBlockItem = null;
        updateDashboard();

        if (state.batchInProgress) {
            state.batchInProgress = false;
            state.isRunning = false;
            log('✓ Batch complete');
            showToast('✓ Batch complete!', 'success');

            // Sync after blocking
            if (state.config.githubSyncEnabled && state.sessionBlocked > 0) {
                await syncToGitHub();
            }

            await sleep(1000);
            const shouldRestart = state.skipperWasActive || GM_getValue('skipperActive', false);

            if (shouldRestart && state.currentMode === 'reels') {
                log('Resuming skipper...');
                saveSkipperState(true);
                startSkipper();
            }
        }
    }

    // ══════════════════════════════════════════════════════════════════════════════
    // BLOCKING POPUP
    // ══════════════════════════════════════════════════════════════════════════════
    async function runBlockingPopup() {
        sessionStorage.setItem('adnull_blocking_active', '1');

        const urlParams = new URLSearchParams(location.search);
        const isRetry = urlParams.has('__adnull_retry');
        const retryNum = parseInt(urlParams.get('__adnull_retry')) || 1;

        log('Running as blocking popup', isRetry ? `(retry #${retryNum})` : '');

        // Check immediately if page shows blocked/unavailable (before waiting)
        if (document.body && isPageUnavailable()) {
            log('Page unavailable - already blocked or deleted (immediate)');
            GM_setValue('adnull_block_complete', Date.now());
            GM_setValue('adnull_block_result', 'already_blocked');
            tryCloseWindow();
            return;
        }

        // Short wait for page to load
        const waitTime = isRetry ? state.config.pageLoadWait * 1.5 : state.config.pageLoadWait;
        await sleep(waitTime);

        // Check again after page load
        if (isPageUnavailable()) {
            log('Page unavailable - already blocked or deleted');
            GM_setValue('adnull_block_complete', Date.now());
            GM_setValue('adnull_block_result', 'already_blocked');
            tryCloseWindow();
            return;
        }

        showBlockingOverlay('🚫', isRetry ? `Blocking (retry ${retryNum})...` : 'Blocking...', '#fa3e3e', 'Please wait');

        let success = false;
        for (let attempt = 1; attempt <= 2 && !success; attempt++) {
            if (attempt > 1) {
                log(`Internal retry ${attempt}...`);
                await sleep(300);
            }
            success = await executeBlockSequence();
        }

        if (success) {
            GM_setValue('adnull_block_complete', Date.now());
            GM_setValue('adnull_block_result', 'success');
        } else {
            GM_setValue('adnull_block_complete', Date.now());
            GM_setValue('adnull_block_result', 'failed');
        }

        await sleep(state.config.tabCloseDelay);
        tryCloseWindow();
    }

    function isPageUnavailable() {
        const text = document.body?.innerText || '';
        const patterns = [
            /this content isn't available/i,
            /this page isn't available/i,
            /this account has been disabled/i,
            /sorry, this content isn't available/i,
            /the link you followed may be broken/i,
            /you('ve)?\s*(have\s*)?blocked/i
        ];
        return patterns.some(p => p.test(text));
    }

    async function executeBlockSequence() {
        const clickDelay = state.config.clickDelay;

        let success = await tryBlockMethod1(clickDelay);
        if (success) return true;

        log('Method 1 failed, trying Method 2...');
        await sleep(200);
        success = await tryBlockMethod2(clickDelay);
        if (success) return true;

        return false;
    }

    async function tryBlockMethod1(clickDelay) {
        try {
            log('Method 1: Looking for menu button...');
            const menuBtn = await waitFor(() => {
                const selectors = [
                    '[aria-label="More"]',
                    '[aria-label="Actions for this profile"]',
                    '[aria-label="Actions for this page"]',
                    'div[aria-haspopup="menu"]:not([aria-label*="see more options"])'
                ];
                for (const sel of selectors) {
                    for (const btn of document.querySelectorAll(sel)) {
                        if (isVisible(btn)) return btn;
                    }
                }
                return null;
            }, 40, 100);

            if (!menuBtn) throw new Error('Menu not found');
            menuBtn.click();
            await sleep(clickDelay);

            log('Method 1: Looking for Block option...');
            const blockOption = await waitFor(() => {
                for (const item of document.querySelectorAll('[role="menuitem"]')) {
                    const text = (item.textContent || '').toLowerCase();
                    if (text.includes('block') && !text.includes('unblock') && isVisible(item)) return item;
                }
                return null;
            }, 30, 80);

            if (!blockOption) throw new Error('Block option not found');
            blockOption.click();
            await sleep(clickDelay);

            return await confirmBlockDialog(clickDelay);
        } catch (e) {
            log('Method 1 failed:', e.message);
            document.body.click();
            await sleep(150);
            return false;
        }
    }

    async function tryBlockMethod2(clickDelay) {
        try {
            log('Method 2: Looking for profile settings button...');
            const threeDotsBtn = await waitFor(() => {
                const exactMatch = document.querySelector('[aria-label="Profile settings see more options"]');
                if (exactMatch && isVisible(exactMatch)) return exactMatch;

                const candidates = document.querySelectorAll('[aria-haspopup="menu"][role="button"]');
                for (const btn of candidates) {
                    const label = btn.getAttribute('aria-label') || '';
                    if (label.toLowerCase().includes('profile') && label.toLowerCase().includes('options')) {
                        if (isVisible(btn)) return btn;
                    }
                }

                for (const btn of candidates) {
                    const svg = btn.querySelector('svg');
                    if (svg && isVisible(btn)) {
                        const circles = svg.querySelectorAll('circle');
                        if (circles.length === 3) return btn;
                    }
                }

                return null;
            }, 40, 100);

            if (!threeDotsBtn) throw new Error('Three dots button not found');
            threeDotsBtn.click();
            await sleep(clickDelay);

            log('Method 2: Looking for Block menu item...');
            const blockItem = await waitFor(() => {
                for (const item of document.querySelectorAll('[role="menuitem"]')) {
                    const text = (item.textContent || '').toLowerCase().trim();
                    if ((text === 'block' || text.startsWith('block ')) && !text.includes('unblock') && isVisible(item)) {
                        return item;
                    }
                }
                return null;
            }, 30, 80);

            if (!blockItem) throw new Error('Block menu item not found');
            blockItem.click();
            await sleep(clickDelay);

            return await confirmBlockDialog(clickDelay);
        } catch (e) {
            log('Method 2 failed:', e.message);
            document.body.click();
            await sleep(150);
            return false;
        }
    }

    async function confirmBlockDialog(clickDelay) {
        try {
            log('Looking for confirm dialog...');
            const dialog = await waitFor(() => {
                for (const d of document.querySelectorAll('[role="dialog"]')) {
                    if (isVisible(d) && /block|confirm/i.test(d.textContent)) return d;
                }
                return null;
            }, 50, 80);

            if (!dialog) throw new Error('Dialog not found');

            const confirmBtn = await waitFor(() => {
                for (const btn of dialog.querySelectorAll('[role="button"]')) {
                    const text = (btn.textContent || '').toLowerCase();
                    if ((text.includes('block') || text.includes('confirm')) &&
                        !text.includes('cancel') && isVisible(btn)) return btn;
                }
                return null;
            }, 30, 80);

            if (!confirmBtn) throw new Error('Confirm button not found');
            confirmBtn.click();
            await sleep(clickDelay);

            const success = await waitFor(() => {
                const text = document.body?.innerText || '';
                return /you('ve)?\s*(have\s*)?blocked|has been blocked/i.test(text);
            }, 20, 150);

            return !!success;
        } catch (e) {
            log('Confirm dialog failed:', e.message);
            return false;
        }
    }

    function showBlockingOverlay(icon, title, color, subtitle = '') {
        let overlay = document.getElementById('adnull-block-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'adnull-block-overlay';
            document.body.appendChild(overlay);
        }
        overlay.innerHTML = `
            <div style="position:fixed;inset:0;background:rgba(0,0,0,0.95);z-index:999999;
                display:flex;align-items:center;justify-content:center;">
                <div style="background:#1a1a2e;color:white;padding:40px 60px;border-radius:20px;text-align:center;border:3px solid ${color};">
                    <div style="font-size:60px;margin-bottom:20px;">${icon}</div>
                    <div id="block-status" style="font-size:24px;font-weight:bold;color:${color};">${title}</div>
                    ${subtitle ? `<div style="font-size:14px;color:#888;margin-top:10px;">${subtitle}</div>` : ''}
                </div>
            </div>`;
    }

    function tryCloseWindow() {
        try { window.close(); } catch(e) {}
        try { self.close(); } catch(e) {}

        setTimeout(() => {
            if (!window.closed) {
                document.body.innerHTML = `
                    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;
                        height:100vh;background:#111;color:#4CAF50;font-family:sans-serif;text-align:center;">
                        <div style="font-size:48px;margin-bottom:20px;">✓</div>
                        <div style="font-size:24px;margin-bottom:10px;">Complete</div>
                        <div style="color:#888;font-size:14px;">You can close this window</div>
                    </div>`;
            }
        }, 500);
    }

    // ══════════════════════════════════════════════════════════════════════════════
    // NUCLEAR MODE
    // ══════════════════════════════════════════════════════════════════════════════
    async function runNuclearBlock() {
        const profileUrl = location.href.split('?')[0];
        const normalized = normalizeUrl(profileUrl);

        const pathMatch = location.pathname.match(/^\/([^\/]+)/);
        const profileName = pathMatch ? pathMatch[1] : 'Unknown';

        log('☢️ NUCLEAR: Processing:', profileName);

        if (normalized && state.blockedSponsors.has(normalized)) {
            log('☢️ NUCLEAR: Already blocked');
            showNuclearOverlay('Already Blocked', '#4CAF50', '✓');
            return;
        }

        if (isWhitelisted(profileUrl)) {
            log('☢️ NUCLEAR: Whitelisted');
            showNuclearOverlay('Whitelisted', '#f7b928', '⏭️');
            return;
        }

        showNuclearOverlay('☢️ NUCLEAR MODE', '#fa3e3e', '🔄', 'Blocking: ' + profileName);

        addToDetectionLog({
            url: profileUrl,
            author: profileName,
            source: 'nuclear',
            method: 'nuclear-mode'
        });

        await sleep(2000);

        const success = await executeBlockSequence();

        if (success) {
            log('☢️ NUCLEAR: Success!');
            markAsBlocked(profileUrl);
            showNuclearOverlay('BLOCKED', '#4CAF50', '✓', profileName);

            if (state.config.githubSyncEnabled) {
                await syncToGitHub();
            }

            await sleep(1500);
            tryCloseWindow();
        } else {
            log('☢️ NUCLEAR: Failed');
            updateLogStatus(profileUrl, 'failed');
            showNuclearOverlay('FAILED', '#fa3e3e', '✗', 'Could not block');
            await sleep(2000);
            tryCloseWindow();
        }
    }

    function showNuclearOverlay(title, color, icon, subtitle = '') {
        let overlay = document.getElementById('adnull-nuclear-overlay');
        if (overlay) overlay.remove();

        overlay = document.createElement('div');
        overlay.id = 'adnull-nuclear-overlay';
        overlay.innerHTML = `
            <div style="position:fixed;inset:0;background:rgba(0,0,0,0.95);z-index:999999;
                display:flex;align-items:center;justify-content:center;">
                <div style="background:#1a1a2e;color:white;padding:40px 60px;border-radius:20px;text-align:center;border:3px solid ${color};">
                    <div style="font-size:60px;margin-bottom:20px;">${icon}</div>
                    <div style="font-size:24px;font-weight:bold;color:${color};">${title}</div>
                    ${subtitle ? `<div style="font-size:16px;color:#888;margin-top:10px;">${subtitle}</div>` : ''}
                </div>
            </div>`;
        document.body.appendChild(overlay);
    }

    // ══════════════════════════════════════════════════════════════════════════════
    // COMPREHENSIVE CSV/DATA PARSING - Handles any format
    // ══════════════════════════════════════════════════════════════════════════════

    /**
     * Parse a single CSV line respecting quoted fields
     */
    function parseCSVLine(line) {
        const parts = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
                // Handle escaped quotes ""
                if (inQuotes && line[i + 1] === '"') {
                    current += '"';
                    i++;
                } else {
                    inQuotes = !inQuotes;
                }
            } else if ((char === ',' || char === '\t' || char === ';') && !inQuotes) {
                parts.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        parts.push(current.trim());
        return parts;
    }

    /**
     * Detect column indices from header row
     * Handles various naming conventions - only author and url
     */
    function detectColumns(headerParts) {
        const columns = {
            url: -1,
            author: -1
        };

        const urlPatterns = ['url', 'link', 'profile', 'page', 'facebook', 'fb_url', 'profile_url', 'page_url', 'advertiser_url'];
        const authorPatterns = ['author', 'name', 'advertiser', 'sponsor', 'account', 'username', 'page_name', 'profile_name', 'display_name'];

        headerParts.forEach((header, i) => {
            const h = header.toLowerCase().replace(/[^a-z0-9_]/g, '');

            if (columns.url === -1 && urlPatterns.some(p => h.includes(p))) columns.url = i;
            if (columns.author === -1 && authorPatterns.some(p => h.includes(p))) columns.author = i;
        });

        return columns;
    }

    /**
     * Extract Facebook URL from text
     */
    function extractFacebookUrl(text) {
        if (!text) return null;
        text = text.toString().trim();

        // Already a full URL
        if (text.includes('facebook.com/') || text.includes('fb.com/')) {
            // Clean up URL
            const match = text.match(/https?:\/\/(?:www\.)?(?:facebook|fb)\.com\/[^\s,)"'<>]+/i);
            if (match) {
                let url = match[0];
                // Remove tracking params but keep profile.php?id=
                if (!url.includes('profile.php')) {
                    url = url.split('?')[0];
                }
                return url;
            }
            return text;
        }

        // Profile ID
        if (/^\d{10,}$/.test(text)) {
            return `https://www.facebook.com/profile.php?id=${text}`;
        }

        // Username only (alphanumeric, dots, underscores)
        if (/^[a-zA-Z][a-zA-Z0-9._-]{2,}$/.test(text) && text.length < 100) {
            const reserved = ['home', 'watch', 'marketplace', 'gaming', 'events', 'pages', 'groups', 'reel', 'reels', 'photo', 'video', 'story', 'stories', 'feed', 'notifications', 'messages', 'friends', 'settings', 'profile', 'search'];
            if (!reserved.includes(text.toLowerCase())) {
                return `https://www.facebook.com/${text}`;
            }
        }

        return null;
    }

    /**
     * Try to parse as JSON
     */
    function tryParseJSON(text) {
        try {
            const data = JSON.parse(text);

            // Array of entries
            if (Array.isArray(data)) {
                return data.map(item => {
                    if (typeof item === 'string') {
                        return { url: extractFacebookUrl(item), author: 'Unknown' };
                    }
                    return {
                        url: extractFacebookUrl(item.url || item.link || item.profile || item.page || item.facebook_url),
                        author: item.author || item.name || item.advertiser || item.sponsor || 'Unknown'
                    };
                }).filter(e => e.url);
            }

            // Object with a data/entries/items array
            const arrayKey = ['data', 'entries', 'items', 'sponsors', 'blocked', 'accounts', 'advertisers', 'results']
                .find(k => Array.isArray(data[k]));
            if (arrayKey) {
                return tryParseJSON(JSON.stringify(data[arrayKey]));
            }

            // Single object
            if (data.url || data.link || data.profile) {
                return [{
                    url: extractFacebookUrl(data.url || data.link || data.profile),
                    author: data.author || data.name || 'Unknown'
                }];
            }

            return null;
        } catch (e) {
            return null;
        }
    }

    /**
     * Main parsing function - handles CSV, TSV, JSON, plain text
     */
    function parseImportData(text) {
        if (!text || typeof text !== 'string') return [];

        text = text.trim();
        if (!text) return [];

        // Try JSON first
        const jsonResult = tryParseJSON(text);
        if (jsonResult && jsonResult.length > 0) {
            log(`Parsed ${jsonResult.length} entries as JSON`);
            return jsonResult;
        }

        // Split into lines
        const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l);
        if (lines.length === 0) return [];

        const entries = [];

        // Check if first line is a header
        const firstLine = lines[0].toLowerCase();
        const isHeader = /^(author|name|url|link|profile|advertiser|sponsor|source|status|date|timestamp)/i.test(firstLine);

        let columns = null;
        let startIndex = 0;

        if (isHeader) {
            const headerParts = parseCSVLine(lines[0]);
            columns = detectColumns(headerParts);
            startIndex = 1;
            log('Detected columns:', columns);
        }

        // Process data lines
        for (let i = startIndex; i < lines.length; i++) {
            const line = lines[i];
            if (!line) continue;

            // Check if it's just a plain URL or username
            if (!line.includes(',') && !line.includes('\t') && !line.includes(';')) {
                const url = extractFacebookUrl(line);
                if (url) {
                    entries.push({
                        url: url,
                        author: 'Unknown'
                    });
                }
                continue;
            }

            // Parse as CSV/TSV line
            const parts = parseCSVLine(line);
            if (parts.length === 0) continue;

            let entry = {
                url: null,
                author: 'Unknown'
            };

            if (columns && columns.url >= 0) {
                // Use detected column positions
                if (columns.url >= 0 && parts[columns.url]) {
                    entry.url = extractFacebookUrl(parts[columns.url]);
                }
                if (columns.author >= 0 && parts[columns.author]) {
                    entry.author = parts[columns.author].replace(/^"|"$/g, '') || 'Unknown';
                }
            } else {
                // Auto-detect from content
                for (const part of parts) {
                    const cleaned = part.replace(/^"|"$/g, '').trim();
                    if (!cleaned) continue;

                    // URL detection
                    if (!entry.url) {
                        const url = extractFacebookUrl(cleaned);
                        if (url) {
                            entry.url = url;
                            continue;
                        }
                    }

                    // Skip source/status/date values during auto-detect
                    if (['feed', 'reel', 'reels', 'nuclear', 'import', 'video', 'timeline'].includes(cleaned.toLowerCase())) {
                        continue;
                    }
                    if (['blocked', 'detected', 'queued', 'failed', 'whitelisted', 'pending'].includes(cleaned.toLowerCase())) {
                        continue;
                    }
                    if (/^\d{4}-\d{2}-\d{2}/.test(cleaned) || /^\d{1,2}\/\d{1,2}\/\d{2,4}/.test(cleaned)) {
                        continue;
                    }

                    // Otherwise, treat as author if we don't have one yet
                    if (entry.author === 'Unknown' && cleaned.length > 0 && cleaned.length < 150) {
                        entry.author = cleaned;
                    }
                }
            }

            // Extract author from URL if still unknown
            if (entry.url && entry.author === 'Unknown') {
                try {
                    const urlObj = new URL(entry.url);
                    const pathParts = urlObj.pathname.split('/').filter(p => p);
                    if (pathParts[0] === 'profile.php') {
                        entry.author = 'Profile ' + urlObj.searchParams.get('id');
                    } else if (pathParts[0]) {
                        entry.author = pathParts[0];
                    }
                } catch (e) {}
            }

            if (entry.url) {
                entries.push(entry);
            }
        }

        log(`Parsed ${entries.length} entries from ${lines.length} lines`);
        return entries;
    }

    /**
     * Legacy wrapper for backward compatibility
     */
    function parseCSV(csvText) {
        return parseImportData(csvText);
    }

    // ══════════════════════════════════════════════════════════════════════════════
    // COMPREHENSIVE EXPORT - All lists combined
    // ══════════════════════════════════════════════════════════════════════════════

    /**
     * Export all data as comprehensive CSV - Author and URL only
     */
    function exportAllData() {
        const allEntries = new Map(); // Keyed by normalized URL to dedupe

        // 1. Add all detection log entries
        for (const entry of state.detectionLog) {
            const normalized = normalizeUrl(entry.url);
            if (normalized && !allEntries.has(normalized)) {
                allEntries.set(normalized, {
                    author: entry.author || 'Unknown',
                    url: entry.url
                });
            }
        }

        // 2. Add blocked sponsors not in detection log
        for (const normalizedUrl of state.blockedSponsors) {
            if (!allEntries.has(normalizedUrl)) {
                const fullUrl = normalizedUrl.startsWith('http') ? normalizedUrl : `https://www.facebook.com/${normalizedUrl}`;
                allEntries.set(normalizedUrl, {
                    author: extractAuthorFromUrl(fullUrl),
                    url: fullUrl
                });
            }
        }

        // 3. Add queued items
        for (const item of state.blockQueue) {
            const normalized = normalizeUrl(item.url);
            if (normalized && !allEntries.has(normalized)) {
                allEntries.set(normalized, {
                    author: item.author || 'Unknown',
                    url: item.url
                });
            }
        }

        // 4. Add whitelisted items
        for (const item of state.whitelist) {
            const normalized = normalizeUrl(item.url);
            if (normalized && !allEntries.has(normalized)) {
                allEntries.set(normalized, {
                    author: item.name || 'Unknown',
                    url: item.url
                });
            }
        }

        // Build CSV - Author and URL only
        const header = 'Author,URL';
        const rows = [];

        for (const [, entry] of allEntries) {
            const row = [
                `"${(entry.author || '').replace(/"/g, '""')}"`,
                entry.url
            ];
            rows.push(row.join(','));
        }

        // Sort alphabetically by author
        rows.sort((a, b) => a.localeCompare(b));

        const csv = header + '\n' + rows.join('\n');

        // Stats
        const stats = {
            total: allEntries.size
        };

        return { csv, stats };
    }

    /**
     * Extract author from URL
     */
    function extractAuthorFromUrl(url) {
        try {
            const urlObj = new URL(url);
            const pathParts = urlObj.pathname.split('/').filter(p => p);
            if (pathParts[0] === 'profile.php') {
                return 'Profile ' + urlObj.searchParams.get('id');
            }
            return pathParts[0] || 'Unknown';
        } catch (e) {
            return 'Unknown';
        }
    }

    /**
     * Export as JSON - Author and URL only
     */
    function exportAllDataJSON() {
        const { stats } = exportAllData();

        // Build simple entries with only author and url
        const entries = [];
        const seen = new Set();

        // Add from detection log
        for (const entry of state.detectionLog) {
            const normalized = normalizeUrl(entry.url);
            if (normalized && !seen.has(normalized)) {
                seen.add(normalized);
                entries.push({
                    author: entry.author || 'Unknown',
                    url: entry.url
                });
            }
        }

        // Add from blocked sponsors
        for (const normalizedUrl of state.blockedSponsors) {
            if (!seen.has(normalizedUrl)) {
                seen.add(normalizedUrl);
                const fullUrl = normalizedUrl.startsWith('http') ? normalizedUrl : `https://www.facebook.com/${normalizedUrl}`;
                entries.push({
                    author: extractAuthorFromUrl(fullUrl),
                    url: fullUrl
                });
            }
        }

        // Add from block queue
        for (const item of state.blockQueue) {
            const normalized = normalizeUrl(item.url);
            if (normalized && !seen.has(normalized)) {
                seen.add(normalized);
                entries.push({
                    author: item.author || 'Unknown',
                    url: item.url
                });
            }
        }

        // Add from whitelist
        for (const item of state.whitelist) {
            const normalized = normalizeUrl(item.url);
            if (normalized && !seen.has(normalized)) {
                seen.add(normalized);
                entries.push({
                    author: item.name || 'Unknown',
                    url: item.url
                });
            }
        }

        const data = {
            exportedAt: new Date().toISOString(),
            version: VERSION,
            stats: stats,
            entries: entries
        };
        return JSON.stringify(data, null, 2);
    }

    // ══════════════════════════════════════════════════════════════════════════════
    // GITHUB SYNC - ALWAYS ADDITIVE (merge, never overwrite)
    // ══════════════════════════════════════════════════════════════════════════════
    async function syncToGitHub() {
        if (!state.config.githubSyncEnabled || !state.config.githubToken || !state.config.githubRepo) {
            log('GitHub sync not configured');
            showToast('Configure GitHub settings first', 'error');
            return { success: false, error: 'not_configured' };
        }

        log('☁️ Syncing to GitHub (ADDITIVE merge mode)...');
        showToast('☁️ Syncing...', 'info');

        const path = state.config.githubPath || 'adnull_blocklist.csv';

        return new Promise((resolve) => {
            // Step 1: Fetch existing file from GitHub
            GM_xmlhttpRequest({
                method: 'GET',
                url: `https://api.github.com/repos/${state.config.githubRepo}/contents/${path}?ref=${state.config.githubBranch}`,
                headers: {
                    'Authorization': `Bearer ${state.config.githubToken}`,
                    'Accept': 'application/vnd.github.v3+json'
                },
                onload: (getResponse) => {
                    let sha = null;
                    let existingEntries = new Map();

                    // Parse existing entries from GitHub using the comprehensive parser
                    if (getResponse.status === 200) {
                        try {
                            const data = JSON.parse(getResponse.responseText);
                            sha = data.sha;
                            const existingContent = decodeURIComponent(escape(atob(data.content)));
                            const parsed = parseImportData(existingContent);

                            for (const entry of parsed) {
                                const normalized = normalizeUrl(entry.url);
                                if (normalized && !existingEntries.has(normalized)) {
                                    existingEntries.set(normalized, {
                                        author: entry.author || 'Unknown',
                                        url: entry.url
                                    });
                                }
                            }

                            log(`Found ${existingEntries.size} existing entries on GitHub`);
                        } catch (e) {
                            console.error('[AdNull Power] Error parsing existing file:', e);
                        }
                    } else if (getResponse.status === 404) {
                        log('No existing file on GitHub - will create new');
                    }

                    // Step 2: Merge local data
                    let newCount = 0;
                    let updatedCount = 0;

                    // Add all detection log entries
                    for (const entry of state.detectionLog) {
                        const normalized = normalizeUrl(entry.url);
                        if (!normalized) continue;

                        if (existingEntries.has(normalized)) {
                            // Update if local has better author info
                            const existing = existingEntries.get(normalized);
                            if (entry.author && entry.author !== 'Unknown' && existing.author === 'Unknown') {
                                existing.author = entry.author;
                                updatedCount++;
                            }
                        } else {
                            existingEntries.set(normalized, {
                                author: entry.author || 'Unknown',
                                url: entry.url
                            });
                            newCount++;
                        }
                    }

                    // Add blocked sponsors not in detection log
                    for (const normalizedUrl of state.blockedSponsors) {
                        if (!existingEntries.has(normalizedUrl)) {
                            const fullUrl = normalizedUrl.startsWith('http') ? normalizedUrl : `https://www.facebook.com/${normalizedUrl}`;
                            existingEntries.set(normalizedUrl, {
                                author: extractAuthorFromUrl(fullUrl),
                                url: fullUrl
                            });
                            newCount++;
                        }
                    }

                    // Add queued items
                    for (const item of state.blockQueue) {
                        const normalized = normalizeUrl(item.url);
                        if (normalized && !existingEntries.has(normalized)) {
                            existingEntries.set(normalized, {
                                author: item.author || 'Unknown',
                                url: item.url
                            });
                            newCount++;
                        }
                    }

                    if (newCount === 0 && updatedCount === 0) {
                        log('No changes to sync');
                        showToast('Already synced ✓', 'info');
                        state.detectionsSinceLastSync = 0;
                        saveSyncCounter();
                        updateDashboard();
                        resolve({ success: true, added: 0 });
                        return;
                    }

                    // Step 3: Build merged CSV with Author,URL only
                    const header = 'Author,URL';
                    const rows = [];

                    // Sort alphabetically by author
                    const sortedEntries = Array.from(existingEntries.values()).sort((a, b) => {
                        return (a.author || '').localeCompare(b.author || '');
                    });

                    for (const entry of sortedEntries) {
                        rows.push([
                            `"${(entry.author || '').replace(/"/g, '""')}"`,
                            entry.url
                        ].join(','));
                    }

                    const csv = header + '\n' + rows.join('\n');
                    const content = btoa(unescape(encodeURIComponent(csv)));

                    // Step 4: Push to GitHub
                    const commitMsg = newCount > 0 && updatedCount > 0 ?
                        `AdNull Power: +${newCount} new, ${updatedCount} updated (${existingEntries.size} total)` :
                        newCount > 0 ?
                            `AdNull Power: +${newCount} new (${existingEntries.size} total)` :
                            `AdNull Power: ${updatedCount} updated (${existingEntries.size} total)`;

                    const body = {
                        message: commitMsg,
                        content: content,
                        branch: state.config.githubBranch
                    };
                    if (sha) body.sha = sha;

                    GM_xmlhttpRequest({
                        method: 'PUT',
                        url: `https://api.github.com/repos/${state.config.githubRepo}/contents/${path}`,
                        headers: {
                            'Authorization': `Bearer ${state.config.githubToken}`,
                            'Accept': 'application/vnd.github.v3+json',
                            'Content-Type': 'application/json'
                        },
                        data: JSON.stringify(body),
                        onload: (putResponse) => {
                            if (putResponse.status === 200 || putResponse.status === 201) {
                                log(`☁️ GitHub sync: +${newCount} new, ${updatedCount} updated (${existingEntries.size} total)`);
                                showToast(`Synced: +${newCount} new, ${updatedCount} updated`, 'success');
                                state.detectionsSinceLastSync = 0;
                                saveSyncCounter();
                                updateDashboard();
                                resolve({ success: true, added: newCount, updated: updatedCount, total: existingEntries.size });
                            } else {
                                console.error('[AdNull Power] GitHub sync failed:', putResponse.status, putResponse.responseText);
                                showToast('GitHub sync failed', 'error');
                                resolve({ success: false, error: putResponse.status });
                            }
                        },
                        onerror: (e) => {
                            console.error('[AdNull Power] GitHub sync error:', e);
                            showToast('GitHub sync error', 'error');
                            resolve({ success: false, error: e });
                        }
                    });
                },
                onerror: (e) => {
                    console.error('[AdNull Power] GitHub fetch error:', e);
                    showToast('GitHub connection error', 'error');
                    resolve({ success: false, error: e });
                }
            });
        });
    }

    // ══════════════════════════════════════════════════════════════════════════════
    // IMPORT FUNCTIONS - Using comprehensive parser
    // ══════════════════════════════════════════════════════════════════════════════
    function importBlocklist(content, source = 'import', queueForBlock = false) {
        log('Processing import with comprehensive parser...');

        const entries = parseImportData(content);
        let imported = 0;
        let skipped = 0;
        let updated = 0;
        let queued = 0;

        for (const entry of entries) {
            if (!entry.url) continue;

            const normalized = normalizeUrl(entry.url);
            if (!normalized) continue;

            // Skip whitelisted
            if (state.whitelistIndex.has(normalized)) {
                skipped++;
                continue;
            }

            // Check if already in detection log
            const existingIdx = state.detectionIndex[normalized];
            if (existingIdx !== undefined) {
                // Update existing entry if the import has more info
                const existing = state.detectionLog[existingIdx];
                let wasUpdated = false;

                if (entry.author && entry.author !== 'Unknown' && existing.author === 'Unknown') {
                    existing.author = entry.author;
                    wasUpdated = true;
                }

                // Queue for blocking if requested and not already blocked
                if (queueForBlock && !state.blockedSponsors.has(normalized)) {
                    if (!state.blockQueue.some(q => normalizeUrl(q.url) === normalized)) {
                        const success = queueForBlocking(entry.url, entry.author || existing.author || 'Unknown', source);
                        if (success) {
                            existing.status = 'queued';
                            queued++;
                            wasUpdated = true;
                        }
                    }
                }

                if (wasUpdated) updated++;
                else skipped++;
                continue;
            }

            // Create new detection log entry
            const logEntry = {
                id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
                url: entry.url,
                author: entry.author || 'Unknown',
                source: source,
                method: 'imported',
                content: '',
                detectedAt: new Date().toISOString(),
                timestamp: Date.now(),
                status: queueForBlock ? 'queued' : 'detected',
                blockedAt: null
            };

            state.detectionLog.unshift(logEntry);
            imported++;

            // Queue for blocking if requested
            if (queueForBlock) {
                const success = queueForBlocking(entry.url, entry.author || 'Unknown', source);
                if (success) queued++;
            }
        }

        rebuildDetectionIndex();
        state.totalBlocked = state.blockedSponsors.size;
        state.totalDetected = state.detectionLog.length;
        saveBlocked();
        saveDetectionLog();
        saveBlockQueue();
        updateDashboard();
        updateLogPanel();

        if (queueForBlock) {
            log(`Import complete: ${imported} new, ${updated} updated, ${skipped} skipped, ${queued} queued for blocking`);
            showToast(`Import: +${imported} new, ${queued} queued for blocking`, 'success');
        } else {
            log(`Import complete: ${imported} new, ${updated} updated, ${skipped} skipped`);
            showToast(`Import: +${imported} new, ${updated} updated`, 'success');
        }

        return { success: true, imported, updated, skipped, queued, total: entries.length };
    }

    function requeueToBlock(content, source = 'requeue') {
        log('Processing requeue with comprehensive parser...');

        const entries = parseImportData(content);
        let queued = 0;
        let skipped = 0;
        let alreadyBlocked = 0;

        for (const entry of entries) {
            if (!entry.url) continue;

            const normalized = normalizeUrl(entry.url);
            if (!normalized) continue;

            if (state.blockedSponsors.has(normalized)) {
                alreadyBlocked++;
                continue;
            }

            if (state.whitelistIndex.has(normalized)) {
                skipped++;
                continue;
            }

            if (state.blockQueue.some(q => normalizeUrl(q.url) === normalized)) {
                skipped++;
                continue;
            }

            // Add to detection log first if not exists
            if (state.detectionIndex[normalized] === undefined) {
                const logEntry = {
                    id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
                    url: entry.url,
                    author: entry.author || 'Unknown',
                    source: entry.source || source,
                    method: entry.method || 'requeued',
                    content: entry.content || '',
                    detectedAt: entry.detectedAt || new Date().toISOString(),
                    timestamp: Date.now(),
                    status: 'queued'
                };
                state.detectionLog.unshift(logEntry);
                rebuildDetectionIndex();
            }

            const success = queueForBlocking(entry.url, entry.author || 'Unknown', source);
            if (success) {
                queued++;
            } else {
                skipped++;
            }
        }

        state.totalDetected = state.detectionLog.length;
        saveDetectionLog();
        updateDashboard();
        updateLogPanel();

        log(`Requeue complete: ${queued} queued, ${alreadyBlocked} already blocked, ${skipped} skipped`);
        showToast(`Queued: ${queued} | Blocked: ${alreadyBlocked} | Skip: ${skipped}`, 'success');

        return { success: true, queued, alreadyBlocked, skipped, total: entries.length };
    }

    async function fetchAndImport(url, asRequeue = false, queueForBlock = false) {
        let fetchUrl = url;
        if (url.includes('github.com') && url.includes('/blob/')) {
            fetchUrl = url.replace('github.com', 'raw.githubusercontent.com').replace('/blob/', '/');
        }

        log('Fetching:', fetchUrl);
        showToast('📥 Fetching...', 'info');

        return new Promise((resolve) => {
            GM_xmlhttpRequest({
                method: 'GET',
                url: fetchUrl,
                headers: { 'Accept': 'text/plain, text/csv, application/json, */*' },
                onload: (response) => {
                    if (response.status === 200) {
                        let result;
                        if (asRequeue) {
                            result = requeueToBlock(response.responseText, 'url');
                        } else {
                            result = importBlocklist(response.responseText, 'url', queueForBlock);
                        }
                        resolve(result);
                    } else {
                        showToast('Failed to fetch: ' + response.status, 'error');
                        resolve({ success: false, error: response.status });
                    }
                },
                onerror: (e) => {
                    showToast('Connection error', 'error');
                    resolve({ success: false, error: e });
                }
            });
        });
    }

    // ══════════════════════════════════════════════════════════════════════════════
    // SYNC & BLOCK - Auto-pull and block from remote list (Reels mode)
    // ══════════════════════════════════════════════════════════════════════════════
    let syncAndBlockTimer = null;
    let syncAndBlockInProgress = false;

    function startSyncAndBlockTimer() {
        if (syncAndBlockTimer) {
            clearInterval(syncAndBlockTimer);
        }

        if (!state.config.syncAndBlockEnabled) {
            log('🔄 Sync & Block disabled');
            return;
        }

        log(`🔄 Sync & Block enabled - checking every ${state.config.syncAndBlockInterval / 1000}s`);

        // Run immediately on start
        setTimeout(() => {
            if (state.config.syncAndBlockEnabled) {
                runSyncAndBlock();
            }
        }, 5000); // Wait 5 seconds after page load

        // Then run on interval
        syncAndBlockTimer = setInterval(() => {
            if (state.config.syncAndBlockEnabled && !syncAndBlockInProgress) {
                runSyncAndBlock();
            }
        }, state.config.syncAndBlockInterval);
    }

    function stopSyncAndBlockTimer() {
        if (syncAndBlockTimer) {
            clearInterval(syncAndBlockTimer);
            syncAndBlockTimer = null;
        }
        log('🔄 Sync & Block timer stopped');
    }

    async function runSyncAndBlock() {
        if (syncAndBlockInProgress) {
            log('🔄 Sync & Block already in progress, skipping...');
            return;
        }

        if (state.isBlocking || state.batchInProgress) {
            log('🔄 Blocking in progress, will retry later...');
            return;
        }

        syncAndBlockInProgress = true;
        state.config.lastSyncAndBlockTime = Date.now();
        saveConfig();

        log('🔄 Sync & Block: Fetching remote blocklist...');
        updateSyncAndBlockStatus('Fetching...');

        try {
            let fetchUrl;
            let sourceName;

            if (state.config.syncAndBlockSource === 'github' && state.config.githubToken && state.config.githubRepo) {
                // Fetch from GitHub repo
                sourceName = 'GitHub';
                const path = state.config.githubPath || 'adnull_blocklist.csv';
                fetchUrl = `https://api.github.com/repos/${state.config.githubRepo}/contents/${path}?ref=${state.config.githubBranch}`;

                const result = await fetchFromGitHubAPI(fetchUrl);
                if (result.success) {
                    await processRemoteBlocklist(result.content, sourceName);
                } else {
                    log('🔄 Sync & Block: GitHub fetch failed:', result.error);
                    showToast('Sync & Block: GitHub fetch failed', 'error');
                }
            } else {
                // Fetch from master blocklist
                sourceName = 'Master';
                fetchUrl = MASTER_BLOCKLIST_URL;

                const result = await fetchFromURL(fetchUrl);
                if (result.success) {
                    await processRemoteBlocklist(result.content, sourceName);
                } else {
                    log('🔄 Sync & Block: Master fetch failed:', result.error);
                    showToast('Sync & Block: Fetch failed', 'error');
                }
            }
        } catch (e) {
            console.error('[AdNull Power] Sync & Block error:', e);
            showToast('Sync & Block error', 'error');
        }

        syncAndBlockInProgress = false;
        updateSyncAndBlockStatus('Idle');
        updateDashboard();
    }

    function fetchFromGitHubAPI(url) {
        return new Promise((resolve) => {
            GM_xmlhttpRequest({
                method: 'GET',
                url: url,
                headers: {
                    'Authorization': `Bearer ${state.config.githubToken}`,
                    'Accept': 'application/vnd.github.v3+json'
                },
                onload: (response) => {
                    if (response.status === 200) {
                        try {
                            const data = JSON.parse(response.responseText);
                            const content = decodeURIComponent(escape(atob(data.content)));
                            resolve({ success: true, content });
                        } catch (e) {
                            resolve({ success: false, error: 'parse_error' });
                        }
                    } else {
                        resolve({ success: false, error: response.status });
                    }
                },
                onerror: (e) => {
                    resolve({ success: false, error: e });
                }
            });
        });
    }

    function fetchFromURL(url) {
        return new Promise((resolve) => {
            GM_xmlhttpRequest({
                method: 'GET',
                url: url,
                headers: { 'Accept': 'text/plain, text/csv, application/json, */*' },
                onload: (response) => {
                    if (response.status === 200) {
                        resolve({ success: true, content: response.responseText });
                    } else {
                        resolve({ success: false, error: response.status });
                    }
                },
                onerror: (e) => {
                    resolve({ success: false, error: e });
                }
            });
        });
    }

    async function processRemoteBlocklist(content, sourceName) {
        const entries = parseImportData(content);
        let queuedCount = 0;
        let alreadyBlockedCount = 0;
        let skippedCount = 0;

        log(`🔄 Sync & Block: Parsed ${entries.length} entries from ${sourceName}`);

        for (const entry of entries) {
            if (!entry.url) continue;

            const normalized = normalizeUrl(entry.url);
            if (!normalized) continue;

            // Skip if already blocked
            if (state.blockedSponsors.has(normalized)) {
                alreadyBlockedCount++;
                continue;
            }

            // Skip if whitelisted
            if (state.whitelistIndex.has(normalized)) {
                skippedCount++;
                continue;
            }

            // Skip if already in queue
            if (state.blockQueue.some(q => normalizeUrl(q.url) === normalized)) {
                skippedCount++;
                continue;
            }

            // Add to detection log if not exists
            if (state.detectionIndex[normalized] === undefined) {
                const logEntry = {
                    id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
                    url: entry.url,
                    author: entry.author || 'Unknown',
                    source: entry.source || 'sync',
                    method: 'sync-and-block',
                    detectedAt: new Date().toISOString(),
                    timestamp: Date.now(),
                    status: 'queued'
                };
                state.detectionLog.unshift(logEntry);
                rebuildDetectionIndex();
            }

            // Queue for blocking
            state.blockQueue.push({
                id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
                url: entry.url,
                author: entry.author || 'Unknown',
                source: 'sync-and-block',
                addedAt: Date.now(),
                attempts: 0
            });

            updateLogStatus(entry.url, 'queued');
            queuedCount++;
        }

        if (queuedCount > 0) {
            saveBlockQueue();
            saveDetectionLog();
            state.totalDetected = state.detectionLog.length;

            log(`🔄 Sync & Block: Queued ${queuedCount} new accounts for blocking`);
            showToast(`🔄 Queued ${queuedCount} for blocking`, 'warning');

            updateDashboard();
            updateLogPanel();

            // Trigger blocking if we have items
            await triggerSyncAndBlockBatch();
        } else {
            log(`🔄 Sync & Block: No new accounts to block (${alreadyBlockedCount} already blocked)`);
            if (alreadyBlockedCount > 0) {
                showToast(`✓ All ${alreadyBlockedCount} already blocked`, 'success');
            }
        }
    }

    async function triggerSyncAndBlockBatch() {
        if (state.blockQueue.length === 0) return;
        if (state.isBlocking || state.batchInProgress) return;

        // Remember if skipper was running
        const skipperWasRunning = reelsSkipperRunning;

        // Pause skipper if running
        if (reelsSkipperRunning) {
            log('🔄 Pausing skipper for Sync & Block...');
            stopSkipper(true); // temporary stop
        }

        state.batchInProgress = true;
        state.skipperWasActive = skipperWasRunning;

        log(`🔄 Sync & Block: Starting batch block of ${state.blockQueue.length} accounts`);
        showToast(`🔄 Blocking ${state.blockQueue.length} accounts...`, 'warning');

        updateDashboard();

        // Process the queue
        state.isRunning = true;
        await processBlockQueue();

        // Queue processing complete
        state.batchInProgress = false;
        state.isRunning = false;

        log('🔄 Sync & Block: Batch complete');
        showToast('🔄 Sync & Block complete!', 'success');

        // Resume skipper if it was running before
        if (skipperWasRunning || GM_getValue('skipperActive', false)) {
            log('🔄 Resuming skipper after Sync & Block...');
            await sleep(1000);
            startSkipper();
        }

        updateDashboard();
    }

    function updateSyncAndBlockStatus(status) {
        const statusEl = dashboard?.querySelector('#sync-block-status');
        if (statusEl) {
            statusEl.textContent = status;
            statusEl.className = 'sync-block-status ' + (status === 'Idle' ? '' : 'active');
        }
    }

    function getNextSyncAndBlockTime() {
        if (!state.config.syncAndBlockEnabled) return 'Disabled';
        if (!state.config.lastSyncAndBlockTime) return 'Soon...';

        const nextTime = state.config.lastSyncAndBlockTime + state.config.syncAndBlockInterval;
        const remaining = Math.max(0, nextTime - Date.now());
        const minutes = Math.floor(remaining / 60000);
        const seconds = Math.floor((remaining % 60000) / 1000);

        if (remaining <= 0) return 'Now...';
        return `${minutes}m ${seconds}s`;
    }

    // ══════════════════════════════════════════════════════════════════════════════
    // DASHBOARD
    // ══════════════════════════════════════════════════════════════════════════════
    function updateDashboard() {
        if (!dashboard) return;

        const statDetected = dashboard.querySelector('#stat-detected');
        const statBlocked = dashboard.querySelector('#stat-blocked');
        const statQueue = dashboard.querySelector('#stat-queue');
        const statSession = dashboard.querySelector('#stat-session');
        const statSync = dashboard.querySelector('#stat-sync');

        if (statDetected) statDetected.textContent = state.totalDetected;
        if (statBlocked) statBlocked.textContent = state.totalBlocked;
        if (statQueue) statQueue.textContent = state.blockQueue.length;
        if (statSession) statSession.textContent = state.sessionDetected;
        if (statSync) statSync.textContent = state.detectionsSinceLastSync;

        // Mode indicator
        const modeIndicator = dashboard.querySelector('#mode-indicator');
        if (modeIndicator) {
            modeIndicator.textContent = state.currentMode === 'reels' ? '🎬 Reels' : '📰 Feed';
            modeIndicator.className = `mode-indicator ${state.currentMode}`;
        }

        // Status indicator
        const statusIndicator = dashboard.querySelector('#status-indicator');
        if (statusIndicator) {
            statusIndicator.className = 'status-indicator';
            if (state.isBlocking) {
                statusIndicator.textContent = 'Blocking';
                statusIndicator.classList.add('blocking');
            } else if (reelsSkipperRunning || state.isRunning) {
                statusIndicator.textContent = state.currentMode === 'reels' ? 'Skipping' : 'Collecting';
                statusIndicator.classList.add('running');
            } else if (state.isPaused) {
                statusIndicator.textContent = 'Paused';
                statusIndicator.classList.add('paused');
            } else {
                statusIndicator.textContent = 'Ready';
            }
        }

        // Start/Stop buttons
        const startBtn = dashboard.querySelector('#btn-start');
        const stopBtn = dashboard.querySelector('#btn-stop');
        if (startBtn && stopBtn) {
            const isActive = state.currentMode === 'reels' ? reelsSkipperRunning : state.isRunning;
            startBtn.classList.toggle('hidden', isActive);
            stopBtn.classList.toggle('hidden', !isActive);
        }

        // Current blocking item
        const currentBlock = dashboard.querySelector('#current-block');
        const currentName = dashboard.querySelector('#current-name');
        if (currentBlock && currentName) {
            if (state.currentBlockItem) {
                currentBlock.classList.remove('hidden');
                currentName.textContent = state.currentBlockItem.author;
            } else {
                currentBlock.classList.add('hidden');
            }
        }

        // Sync progress bar
        const syncBar = dashboard.querySelector('#sync-bar');
        const syncProgressText = dashboard.querySelector('#sync-progress-text');
        if (syncBar) {
            const pct = Math.min(100, (state.detectionsSinceLastSync / state.config.githubSyncThreshold) * 100);
            syncBar.style.width = pct + '%';
            if (pct >= 100) {
                syncBar.classList.add('full');
            } else {
                syncBar.classList.remove('full');
            }
        }
        if (syncProgressText) {
            syncProgressText.textContent = `${state.detectionsSinceLastSync}/${state.config.githubSyncThreshold}`;
        }
    }

    function updateLogPanel() {
        const logList = dashboard?.querySelector('#detection-log-list');
        if (!logList) return;

        // Show last 50 entries
        const entries = state.detectionLog.slice(0, 50);

        logList.innerHTML = entries.map(entry => {
            const sourceIcon = entry.source === 'reel' ? '🎬' : entry.source === 'feed' ? '📰' : entry.source === 'nuclear' ? '☢️' : '📥';
            const statusClass = entry.status === 'blocked' ? 'blocked' : entry.status === 'queued' ? 'queued' : entry.status === 'failed' ? 'failed' : 'detected';
            const statusIcon = entry.status === 'blocked' ? '✓' : entry.status === 'queued' ? '⏳' : entry.status === 'failed' ? '✗' : '○';

            return `
                <div class="log-entry ${statusClass}">
                    <span class="log-source">${sourceIcon}</span>
                    <span class="log-author" title="${entry.url}">${entry.author}</span>
                    <span class="log-status">${statusIcon}</span>
                </div>
            `;
        }).join('');
    }

    function createDashboard() {
        if (document.getElementById('adnull-dashboard')) return;

        dashboard = document.createElement('div');
        dashboard.id = 'adnull-dashboard';

        // Restore position
        let posX = state.config.dashboardPosition.x;
        let posY = state.config.dashboardPosition.y;

        if (posX === null || posY === null) {
            posX = window.innerWidth - 360;
            posY = 80;
        }

        // Ensure on screen
        posX = Math.max(0, Math.min(posX, window.innerWidth - 340));
        posY = Math.max(0, Math.min(posY, window.innerHeight - 100));

        dashboard.style.left = posX + 'px';
        dashboard.style.top = posY + 'px';

        if (state.config.dashboardMinimized) {
            dashboard.classList.add('minimized');
        }

        const modeDesc = state.currentMode === 'reels' ? 'Collect + Block' : 'Collect + Queue';

        dashboard.innerHTML = `
            <div class="panel-header" id="dash-header">
                <div class="header-left">
                    <span class="title">⚡ AdNull Power</span>
                    <span class="mode-indicator ${state.currentMode}" id="mode-indicator">${state.currentMode === 'reels' ? '🎬 Reels' : '📰 Feed'}</span>
                </div>
                <div class="header-right">
                    <span class="status-indicator" id="status-indicator">Ready</span>
                    <button class="close-btn" id="dash-minimize">−</button>
                </div>
            </div>
            <div class="panel-body">
                <div class="mode-desc">${modeDesc}</div>

                <div class="stats-grid">
                    <div class="stat-card"><div class="stat-value" id="stat-session">${state.sessionDetected}</div><div class="stat-label">Session</div></div>
                    <div class="stat-card total"><div class="stat-value" id="stat-detected">${state.totalDetected}</div><div class="stat-label">Detected</div></div>
                    <div class="stat-card success"><div class="stat-value" id="stat-blocked">${state.totalBlocked}</div><div class="stat-label">Blocked</div></div>
                    <div class="stat-card accent"><div class="stat-value" id="stat-queue">${state.blockQueue.length}</div><div class="stat-label">Queue</div></div>
                    <div class="stat-card sync"><div class="stat-value" id="stat-sync">${state.detectionsSinceLastSync}</div><div class="stat-label">To Sync</div></div>
                </div>

                <div class="sync-progress">
                    <div class="sync-progress-label">
                        <span>Sync Progress</span>
                        <span id="sync-progress-text">${state.detectionsSinceLastSync}/${state.config.githubSyncThreshold}</span>
                    </div>
                    <div class="sync-progress-bar">
                        <div class="sync-progress-fill" id="sync-bar" style="width: ${Math.min(100, (state.detectionsSinceLastSync / state.config.githubSyncThreshold) * 100)}%"></div>
                    </div>
                </div>

                <div class="control-row">
                    <button class="ctrl-btn primary" id="btn-start">▶ ${state.currentMode === 'reels' ? 'Start Skipper' : 'Start Collector'}</button>
                    <button class="ctrl-btn danger hidden" id="btn-stop">⏹ Stop</button>
                    <button class="ctrl-btn sync-btn" id="btn-sync-now">☁️ Sync</button>
                </div>

                <div class="current-block hidden" id="current-block">
                    <span class="cb-label">Blocking:</span>
                    <span class="cb-name" id="current-name">-</span>
                    <button class="cb-skip" id="btn-skip-block">Skip</button>
                </div>

                <div class="tabs">
                    <button class="tab active" data-tab="log">📋 Log</button>
                    <button class="tab" data-tab="blockads">🚫 Block</button>
                    <button class="tab" data-tab="settings">⚙️ Settings</button>
                </div>

                <!-- LOG TAB -->
                <div id="tab-log" class="tab-content active">
                    <div class="log-header">
                        <span>Recent Detections</span>
                        <span class="log-legend">🎬=Reel 📰=Feed ☢️=Nuclear</span>
                    </div>
                    <div class="log-panel" id="detection-log-list"></div>
                </div>

                <!-- BLOCK ADS TAB -->
                <div id="tab-blockads" class="tab-content">
                    <div class="section-title">⚡ Quick Block</div>
                    <button class="action-btn danger" id="btn-block-queue">🚫 Block Queue (${state.blockQueue.length})</button>
                    ${state.currentMode === 'feed' ? `<p class="section-desc" style="margin-top: -5px;">Switch to Reels to auto-block, or click to block from here</p>` : ''}

                    <div class="section-title">📥 Import Blocklists</div>
                    <p class="section-desc">Import accounts and optionally queue for blocking</p>

                    <div class="import-section" style="display: flex; gap: 6px; margin-bottom: 8px;">
                        <button class="import-btn" id="btn-import-master" style="flex: 1;">📥 Import Only</button>
                        <button class="import-btn" id="btn-import-queue-master" style="flex: 1; background: linear-gradient(135deg, #3b82f6, #1d4ed8);">📥+ Import & Queue</button>
                    </div>

                    <div class="import-section">
                        <input type="text" id="import-url" placeholder="URL to CSV/TXT file...">
                        <div style="display: flex; gap: 6px; margin-top: 6px;">
                            <button class="import-btn small" id="btn-import-url" style="flex: 1;">Import</button>
                            <button class="import-btn small" id="btn-import-queue-url" style="flex: 1; background: linear-gradient(135deg, #3b82f6, #1d4ed8);">Import & Queue</button>
                        </div>
                    </div>

                    <div class="import-section">
                        <input type="file" id="import-file" accept=".csv,.txt,.json">
                        <div style="display: flex; gap: 6px; margin-top: 6px;">
                            <button class="import-btn small" id="btn-import-file" style="flex: 1;">Import</button>
                            <button class="import-btn small" id="btn-import-queue-file" style="flex: 1; background: linear-gradient(135deg, #3b82f6, #1d4ed8);">Import & Queue</button>
                        </div>
                    </div>

                    <div class="section-divider"></div>

                    <div class="section-title">🔄 Requeue to Block</div>
                    <p class="section-desc">Queue accounts for actual blocking (opens tabs)</p>

                    <button class="requeue-btn" id="btn-requeue-master">🔄 Requeue Master List</button>

                    <div class="import-section">
                        <input type="text" id="requeue-url" placeholder="URL to CSV/TXT file...">
                        <button class="requeue-btn small" id="btn-requeue-url">Requeue URL</button>
                    </div>
                </div>

                <!-- SETTINGS TAB -->
                <div id="tab-settings" class="tab-content">
                    ${state.currentMode === 'reels' ? `
                    <div class="section-title">🎬 Reels Settings</div>
                    <div class="setting-row">
                        <label>Skip Speed: <span id="skip-speed-val">${(state.config.reelsSkipSpeed / 1000).toFixed(1)}s</span></label>
                        <input type="range" id="skip-speed" min="500" max="5000" step="250" value="${state.config.reelsSkipSpeed}">
                    </div>
                    <div class="opt"><input type="checkbox" id="opt-skip-sponsored" ${state.config.skipSponsoredReels ? 'checked' : ''}><label for="opt-skip-sponsored">Auto-skip sponsored</label></div>
                    <div class="opt"><input type="checkbox" id="opt-batch-mode" ${state.config.batchMode ? 'checked' : ''}><label for="opt-batch-mode">Batch mode (size: ${state.config.batchSize})</label></div>

                    <div class="section-divider"></div>

                    <div class="section-title">🔄 Sync & Block</div>
                    <p class="section-desc">Auto-pull blocklist and block new entries</p>
                    <div class="opt sync-block-opt"><input type="checkbox" id="opt-sync-block" ${state.config.syncAndBlockEnabled ? 'checked' : ''}><label for="opt-sync-block">Enable Sync & Block</label></div>

                    <div class="sync-block-fields ${state.config.syncAndBlockEnabled ? '' : 'disabled'}">
                        <div class="setting-row">
                            <label>Interval:</label>
                            <select id="sync-block-interval">
                                <option value="60000" ${state.config.syncAndBlockInterval === 60000 ? 'selected' : ''}>1 min</option>
                                <option value="180000" ${state.config.syncAndBlockInterval === 180000 ? 'selected' : ''}>3 min</option>
                                <option value="300000" ${state.config.syncAndBlockInterval === 300000 ? 'selected' : ''}>5 min</option>
                                <option value="600000" ${state.config.syncAndBlockInterval === 600000 ? 'selected' : ''}>10 min</option>
                                <option value="900000" ${state.config.syncAndBlockInterval === 900000 ? 'selected' : ''}>15 min</option>
                            </select>
                        </div>
                        <div class="setting-row">
                            <label>Source:</label>
                            <select id="sync-block-source">
                                <option value="github" ${state.config.syncAndBlockSource === 'github' ? 'selected' : ''}>GitHub Repo</option>
                                <option value="master" ${state.config.syncAndBlockSource === 'master' ? 'selected' : ''}>Master Blocklist</option>
                            </select>
                        </div>
                        <div class="sync-block-info">
                            <span>Status: <span id="sync-block-status" class="sync-block-status">Idle</span></span>
                            <span>Next: <span id="sync-block-next">-</span></span>
                        </div>
                        <button class="set-btn" id="btn-sync-block-now">🔄 Sync & Block Now</button>
                    </div>
                    ` : `
                    <div class="section-title">📰 Feed Settings</div>
                    <div class="setting-row">
                        <label>Scroll Speed:</label>
                        <div class="speed-btns">
                            <button class="speed-btn ${state.config.currentSpeed === 'slow' ? 'active' : ''}" data-speed="slow">🐢</button>
                            <button class="speed-btn ${state.config.currentSpeed === 'normal' ? 'active' : ''}" data-speed="normal">🚶</button>
                            <button class="speed-btn ${state.config.currentSpeed === 'fast' ? 'active' : ''}" data-speed="fast">🏃</button>
                            <button class="speed-btn ${state.config.currentSpeed === 'turbo' ? 'active' : ''}" data-speed="turbo">🚀</button>
                        </div>
                    </div>
                    `}

                    <div class="section-divider"></div>

                    <div class="section-title">☁️ GitHub Sync</div>
                    <div class="opt"><input type="checkbox" id="opt-github-enabled" ${state.config.githubSyncEnabled ? 'checked' : ''}><label for="opt-github-enabled">Enable auto-sync</label></div>

                    <div class="github-fields ${state.config.githubSyncEnabled ? '' : 'disabled'}">
                        <input type="password" id="github-token" value="${state.config.githubToken}" placeholder="GitHub Token (PAT)">
                        <input type="text" id="github-repo" value="${state.config.githubRepo}" placeholder="username/repo">
                        <input type="text" id="github-path" value="${state.config.githubPath}" placeholder="path/to/blocklist.csv">
                        <div class="field-row">
                            <input type="text" id="github-branch" value="${state.config.githubBranch}" placeholder="branch" class="small">
                            <select id="github-threshold" class="small" title="Sync after X detections">
                                <option value="3" ${state.config.githubSyncThreshold === 3 ? 'selected' : ''}>3 new</option>
                                <option value="5" ${state.config.githubSyncThreshold === 5 ? 'selected' : ''}>5 new</option>
                                <option value="10" ${state.config.githubSyncThreshold === 10 ? 'selected' : ''}>10 new</option>
                                <option value="25" ${state.config.githubSyncThreshold === 25 ? 'selected' : ''}>25 new</option>
                                <option value="50" ${state.config.githubSyncThreshold === 50 ? 'selected' : ''}>50 new</option>
                            </select>
                        </div>
                        <button class="set-btn" id="btn-github-save">💾 Save GitHub Settings</button>
                    </div>

                    <div class="sync-row">
                        <button class="set-btn" id="btn-github-push">☁️ Push Now</button>
                        <button class="set-btn" id="btn-github-pull">📥 Pull</button>
                    </div>

                    <div class="section-divider"></div>

                    <div class="section nuclear-section">
                        <div class="opt nuclear-opt"><input type="checkbox" id="opt-nuclear-mode" ${state.config.nuclearModeEnabled ? 'checked' : ''}><label for="opt-nuclear-mode">☢️ Nuclear Mode</label></div>
                        <p class="section-desc">Auto-block ANY profile page visited</p>
                    </div>

                    <div class="section-divider"></div>

                    <div class="section-title">📤 Export Data</div>
                    <div class="export-btns">
                        <button class="set-btn" id="btn-export-csv">📤 Export CSV</button>
                        <button class="set-btn" id="btn-export-json">📤 Export JSON</button>
                    </div>
                    <button class="set-btn danger" id="btn-clear-all">🗑️ Reset All Data</button>
                </div>
            </div>
        `;

        injectStyles();
        document.body.appendChild(dashboard);
        attachEventListeners();
        updateDashboard();
        updateLogPanel();
    }

    function attachEventListeners() {
        // Dragging
        const header = dashboard.querySelector('#dash-header');
        header.addEventListener('mousedown', startDrag);
        document.addEventListener('mousemove', drag);
        document.addEventListener('mouseup', stopDrag);

        // Tab switching
        dashboard.querySelectorAll('.tab').forEach(tab => {
            tab.onclick = () => {
                dashboard.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
                dashboard.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
                tab.classList.add('active');
                document.getElementById('tab-' + tab.dataset.tab).classList.add('active');
            };
        });

        // Minimize
        dashboard.querySelector('#dash-minimize').onclick = () => {
            dashboard.classList.toggle('minimized');
            state.config.dashboardMinimized = dashboard.classList.contains('minimized');
            saveConfig();
        };

        // Start/Stop
        dashboard.querySelector('#btn-start').onclick = () => {
            if (state.currentMode === 'reels') {
                startSkipper();
            } else {
                startFeedScanner();
            }
        };

        dashboard.querySelector('#btn-stop').onclick = () => {
            if (state.currentMode === 'reels') {
                stopSkipper();
            } else {
                stopFeedScanner();
            }
        };

        // Sync Now
        dashboard.querySelector('#btn-sync-now').onclick = syncToGitHub;

        // Skip current block
        dashboard.querySelector('#btn-skip-block').onclick = () => {
            if (state.currentBlockItem) {
                state.blockQueue.shift();
                state.currentBlockItem = null;
                saveBlockQueue();
                updateDashboard();
                showToast('Skipped', 'info');
            }
        };

        // Block Queue button (works in both modes now)
        dashboard.querySelector('#btn-block-queue').onclick = triggerBatchBlock;

        // Reels-specific
        if (state.currentMode === 'reels') {
            dashboard.querySelector('#skip-speed').oninput = (e) => {
                state.config.reelsSkipSpeed = parseInt(e.target.value);
                dashboard.querySelector('#skip-speed-val').textContent = (state.config.reelsSkipSpeed / 1000).toFixed(1) + 's';
                saveConfig();
            };

            dashboard.querySelector('#opt-skip-sponsored').onchange = (e) => {
                state.config.skipSponsoredReels = e.target.checked;
                saveConfig();
            };

            dashboard.querySelector('#opt-batch-mode').onchange = (e) => {
                state.config.batchMode = e.target.checked;
                saveConfig();
            };

            // Sync & Block controls
            dashboard.querySelector('#opt-sync-block').onchange = (e) => {
                state.config.syncAndBlockEnabled = e.target.checked;
                saveConfig();
                dashboard.querySelector('.sync-block-fields').classList.toggle('disabled', !e.target.checked);

                if (e.target.checked) {
                    startSyncAndBlockTimer();
                    showToast('🔄 Sync & Block enabled', 'success');
                } else {
                    stopSyncAndBlockTimer();
                    showToast('🔄 Sync & Block disabled', 'info');
                }
            };

            dashboard.querySelector('#sync-block-interval').onchange = (e) => {
                state.config.syncAndBlockInterval = parseInt(e.target.value);
                saveConfig();
                if (state.config.syncAndBlockEnabled) {
                    startSyncAndBlockTimer(); // Restart with new interval
                }
            };

            dashboard.querySelector('#sync-block-source').onchange = (e) => {
                state.config.syncAndBlockSource = e.target.value;
                saveConfig();
            };

            dashboard.querySelector('#btn-sync-block-now').onclick = () => {
                if (syncAndBlockInProgress) {
                    showToast('Sync already in progress...', 'info');
                    return;
                }
                runSyncAndBlock();
            };

            // Update next sync time every second
            setInterval(() => {
                const nextEl = dashboard?.querySelector('#sync-block-next');
                if (nextEl && state.config.syncAndBlockEnabled) {
                    nextEl.textContent = getNextSyncAndBlockTime();
                }
            }, 1000);
        } else {
            // Feed-specific
            dashboard.querySelectorAll('.speed-btn').forEach(btn => {
                btn.onclick = () => {
                    dashboard.querySelectorAll('.speed-btn').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    state.config.currentSpeed = btn.dataset.speed;
                    saveConfig();
                };
            });
        }

        // Block Ads Tab - Import
        dashboard.querySelector('#btn-import-master').onclick = async () => {
            await fetchAndImport(MASTER_BLOCKLIST_URL, false, false);
        };

        dashboard.querySelector('#btn-import-queue-master').onclick = async () => {
            await fetchAndImport(MASTER_BLOCKLIST_URL, false, true);
        };

        dashboard.querySelector('#btn-import-url').onclick = async () => {
            const url = dashboard.querySelector('#import-url').value.trim();
            if (url) await fetchAndImport(url, false, false);
            else showToast('Enter a URL', 'error');
        };

        dashboard.querySelector('#btn-import-queue-url').onclick = async () => {
            const url = dashboard.querySelector('#import-url').value.trim();
            if (url) await fetchAndImport(url, false, true);
            else showToast('Enter a URL', 'error');
        };

        dashboard.querySelector('#btn-import-file').onclick = () => {
            const fileInput = dashboard.querySelector('#import-file');
            if (fileInput.files.length === 0) {
                showToast('Select a file first', 'error');
                return;
            }
            const reader = new FileReader();
            reader.onload = (e) => importBlocklist(e.target.result, 'file', false);
            reader.readAsText(fileInput.files[0]);
        };

        dashboard.querySelector('#btn-import-queue-file').onclick = () => {
            const fileInput = dashboard.querySelector('#import-file');
            if (fileInput.files.length === 0) {
                showToast('Select a file first', 'error');
                return;
            }
            const reader = new FileReader();
            reader.onload = (e) => importBlocklist(e.target.result, 'file', true);
            reader.readAsText(fileInput.files[0]);
        };

        // Block Ads Tab - Requeue
        dashboard.querySelector('#btn-requeue-master').onclick = async () => {
            await fetchAndImport(MASTER_BLOCKLIST_URL, true);
        };

        dashboard.querySelector('#btn-requeue-url').onclick = async () => {
            const url = dashboard.querySelector('#requeue-url').value.trim();
            if (url) await fetchAndImport(url, true);
            else showToast('Enter a URL', 'error');
        };

        // Settings Tab - GitHub
        dashboard.querySelector('#opt-github-enabled').onchange = (e) => {
            state.config.githubSyncEnabled = e.target.checked;
            saveConfig();
            dashboard.querySelector('.github-fields').classList.toggle('disabled', !e.target.checked);
        };

        dashboard.querySelector('#btn-github-save').onclick = () => {
            state.config.githubToken = dashboard.querySelector('#github-token').value.trim();
            state.config.githubRepo = dashboard.querySelector('#github-repo').value.trim();
            state.config.githubPath = dashboard.querySelector('#github-path').value.trim() || 'adnull_blocklist.csv';
            state.config.githubBranch = dashboard.querySelector('#github-branch').value.trim() || 'main';
            state.config.githubSyncThreshold = parseInt(dashboard.querySelector('#github-threshold').value) || 5;
            saveConfig();
            showToast('GitHub settings saved', 'success');
        };

        // Auto-save threshold when changed
        dashboard.querySelector('#github-threshold').onchange = (e) => {
            state.config.githubSyncThreshold = parseInt(e.target.value) || 5;
            saveConfig();
            updateDashboard();
        };

        dashboard.querySelector('#btn-github-push').onclick = syncToGitHub;

        dashboard.querySelector('#btn-github-pull').onclick = async () => {
            if (!state.config.githubToken || !state.config.githubRepo) {
                showToast('Configure GitHub settings first', 'error');
                return;
            }
            showToast('📥 Pulling from GitHub...', 'info');

            const path = state.config.githubPath || 'adnull_blocklist.csv';

            GM_xmlhttpRequest({
                method: 'GET',
                url: `https://api.github.com/repos/${state.config.githubRepo}/contents/${path}?ref=${state.config.githubBranch}`,
                headers: {
                    'Authorization': `Bearer ${state.config.githubToken}`,
                    'Accept': 'application/vnd.github.v3+json'
                },
                onload: (response) => {
                    if (response.status === 200) {
                        try {
                            const data = JSON.parse(response.responseText);
                            const content = decodeURIComponent(escape(atob(data.content)));
                            // Use the comprehensive import which handles any format
                            importBlocklist(content, 'github');
                        } catch (e) {
                            console.error('[AdNull Power] Parse error:', e);
                            showToast('Failed to parse file', 'error');
                        }
                    } else if (response.status === 404) {
                        showToast('File not found on GitHub', 'error');
                    } else {
                        showToast('GitHub pull failed: ' + response.status, 'error');
                    }
                },
                onerror: () => {
                    showToast('GitHub connection error', 'error');
                }
            });
        };

        // Nuclear mode
        dashboard.querySelector('#opt-nuclear-mode').onchange = (e) => {
            state.config.nuclearModeEnabled = e.target.checked;
            saveConfig();
            showToast(e.target.checked ? '☢️ Nuclear Mode ENABLED' : 'Nuclear Mode disabled', e.target.checked ? 'warning' : 'info');
        };

        // Export CSV
        dashboard.querySelector('#btn-export-csv').onclick = () => {
            const { csv, stats } = exportAllData();
            const blob = new Blob([csv], { type: 'text/csv' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `adnull-power-export-${Date.now()}.csv`;
            a.click();
            showToast(`Exported ${stats.total} entries`, 'success');
        };

        // Export JSON
        dashboard.querySelector('#btn-export-json').onclick = () => {
            const json = exportAllDataJSON();
            const blob = new Blob([json], { type: 'application/json' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `adnull-power-export-${Date.now()}.json`;
            a.click();
            showToast('Exported complete data as JSON', 'success');
        };

        // Reset
        dashboard.querySelector('#btn-clear-all').onclick = () => {
            if (confirm('This will delete ALL data including blocklist. Continue?')) {
                GM_deleteValue('blocked');
                GM_deleteValue('detectionLog');
                GM_deleteValue('blockQueue');
                GM_deleteValue('whitelist');
                GM_deleteValue('detectionsSinceLastSync');
                state.blockedSponsors = new Set();
                state.detectionLog = [];
                state.detectionIndex = {};
                state.blockQueue = [];
                state.whitelist = [];
                state.whitelistIndex = new Set();
                state.totalBlocked = 0;
                state.totalDetected = 0;
                state.sessionDetected = 0;
                state.sessionBlocked = 0;
                state.failedCount = 0;
                state.detectionsSinceLastSync = 0;
                updateDashboard();
                updateLogPanel();
                showToast('All data cleared', 'warning');
            }
        };
    }

    // Drag functions
    function startDrag(e) {
        if (e.target.tagName === 'BUTTON') return;
        isDragging = true;
        const rect = dashboard.getBoundingClientRect();
        dragOffset.x = e.clientX - rect.left;
        dragOffset.y = e.clientY - rect.top;
        dashboard.style.cursor = 'grabbing';
    }

    function drag(e) {
        if (!isDragging) return;
        e.preventDefault();

        let newX = e.clientX - dragOffset.x;
        let newY = e.clientY - dragOffset.y;

        newX = Math.max(0, Math.min(newX, window.innerWidth - 340));
        newY = Math.max(0, Math.min(newY, window.innerHeight - 50));

        dashboard.style.left = newX + 'px';
        dashboard.style.top = newY + 'px';
        dashboard.style.right = 'auto';
    }

    function stopDrag() {
        if (!isDragging) return;
        isDragging = false;
        dashboard.style.cursor = '';

        const rect = dashboard.getBoundingClientRect();
        state.config.dashboardPosition.x = rect.left;
        state.config.dashboardPosition.y = rect.top;
        saveConfig();
    }

    // ══════════════════════════════════════════════════════════════════════════════
    // STYLES
    // ══════════════════════════════════════════════════════════════════════════════
    function injectStyles() {
        GM_addStyle(`
            @keyframes slideIn { from { transform: translateX(100px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }

            #adnull-dashboard {
                position: fixed;
                width: 340px;
                background: linear-gradient(145deg, #0f172a, #1e293b);
                border: 1px solid rgba(99,102,241,0.3);
                border-radius: 16px;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                font-size: 12px;
                color: white;
                z-index: 99999;
                box-shadow: 0 20px 60px rgba(0,0,0,0.5), 0 0 40px rgba(99,102,241,0.1);
                display: flex;
                flex-direction: column;
                max-height: 85vh;
                user-select: none;
            }

            #adnull-dashboard.minimized { height: auto; max-height: 50px; overflow: hidden; }
            #adnull-dashboard.minimized .panel-body { display: none; }
            .hidden { display: none !important; }

            .panel-header {
                padding: 12px 14px;
                background: linear-gradient(90deg, rgba(99,102,241,0.2), rgba(168,85,247,0.2));
                border-radius: 16px 16px 0 0;
                display: flex;
                justify-content: space-between;
                align-items: center;
                cursor: grab;
                border-bottom: 1px solid rgba(255,255,255,0.1);
            }
            .panel-header:active { cursor: grabbing; }

            .header-left { display: flex; align-items: center; gap: 8px; }
            .header-right { display: flex; align-items: center; gap: 8px; }

            .title {
                font-weight: 700;
                font-size: 14px;
                background: linear-gradient(90deg, #818cf8, #c084fc);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
            }

            .mode-indicator {
                padding: 3px 8px;
                border-radius: 6px;
                font-size: 10px;
                font-weight: 600;
            }
            .mode-indicator.reels { background: rgba(239,68,68,0.3); color: #fca5a5; }
            .mode-indicator.feed { background: rgba(59,130,246,0.3); color: #93c5fd; }

            .status-indicator {
                padding: 3px 10px;
                border-radius: 6px;
                font-size: 10px;
                font-weight: 600;
                background: rgba(255,255,255,0.1);
            }
            .status-indicator.running { background: rgba(34,197,94,0.3); color: #86efac; }
            .status-indicator.blocking { background: rgba(251,191,36,0.3); color: #fde047; }
            .status-indicator.paused { background: rgba(251,146,60,0.3); color: #fdba74; }

            .close-btn {
                background: rgba(255,255,255,0.1);
                border: none;
                color: rgba(255,255,255,0.6);
                cursor: pointer;
                font-size: 16px;
                width: 24px;
                height: 24px;
                border-radius: 6px;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .close-btn:hover { background: rgba(255,255,255,0.2); color: white; }

            .panel-body { flex: 1; overflow-y: auto; padding: 12px; }

            .mode-desc {
                text-align: center;
                font-size: 10px;
                color: rgba(255,255,255,0.4);
                margin-bottom: 10px;
                text-transform: uppercase;
                letter-spacing: 1px;
            }

            .stats-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 5px; margin-bottom: 12px; }
            .stat-card {
                background: rgba(255,255,255,0.05);
                border-radius: 8px;
                padding: 8px 4px;
                text-align: center;
                border: 1px solid rgba(255,255,255,0.05);
            }
            .stat-card.total { background: rgba(168,85,247,0.15); border-color: rgba(168,85,247,0.3); }
            .stat-card.success { background: rgba(34,197,94,0.15); border-color: rgba(34,197,94,0.3); }
            .stat-card.accent { background: rgba(99,102,241,0.15); border-color: rgba(99,102,241,0.3); }
            .stat-card.sync { background: rgba(251,191,36,0.15); border-color: rgba(251,191,36,0.3); }
            .stat-value { font-size: 16px; font-weight: 700; color: white; }
            .stat-card.total .stat-value { color: #c4b5fd; }
            .stat-card.success .stat-value { color: #86efac; }
            .stat-card.accent .stat-value { color: #a5b4fc; }
            .stat-card.sync .stat-value { color: #fde047; }
            .stat-label { font-size: 8px; color: rgba(255,255,255,0.4); text-transform: uppercase; margin-top: 2px; }

            /* Sync Progress Bar */
            .sync-progress { margin-bottom: 12px; }
            .sync-progress-label {
                display: flex;
                justify-content: space-between;
                font-size: 9px;
                color: rgba(255,255,255,0.5);
                margin-bottom: 4px;
                text-transform: uppercase;
            }
            .sync-progress-bar {
                height: 6px;
                background: rgba(255,255,255,0.1);
                border-radius: 3px;
                overflow: hidden;
            }
            .sync-progress-fill {
                height: 100%;
                background: linear-gradient(90deg, #6366f1, #8b5cf6);
                border-radius: 3px;
                transition: width 0.3s ease;
            }
            .sync-progress-fill.full {
                background: linear-gradient(90deg, #22c55e, #16a34a);
                animation: pulse 1s infinite;
            }

            .control-row { display: flex; gap: 6px; margin-bottom: 10px; }
            .ctrl-btn {
                flex: 1;
                padding: 10px;
                border: none;
                border-radius: 10px;
                cursor: pointer;
                font-size: 11px;
                font-weight: 600;
                transition: all 0.2s;
            }
            .ctrl-btn.primary {
                background: linear-gradient(135deg, #6366f1, #8b5cf6);
                color: white;
            }
            .ctrl-btn.primary:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(99,102,241,0.4); }
            .ctrl-btn.danger { background: linear-gradient(135deg, #ef4444, #dc2626); color: white; }
            .ctrl-btn.sync-btn { background: linear-gradient(135deg, #f59e0b, #d97706); color: white; flex: 0.6; }
            .ctrl-btn:not(.primary):not(.danger):not(.sync-btn) { background: rgba(255,255,255,0.1); color: white; }
            .ctrl-btn:hover { opacity: 0.9; }

            .current-block {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 10px;
                background: rgba(251,191,36,0.15);
                border: 1px solid rgba(251,191,36,0.3);
                border-radius: 10px;
                margin-bottom: 10px;
            }
            .cb-label { font-size: 10px; color: rgba(255,255,255,0.5); }
            .cb-name { flex: 1; font-size: 12px; font-weight: 600; color: #fde047; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
            .cb-skip { padding: 5px 10px; background: rgba(255,255,255,0.1); border: none; border-radius: 6px; color: white; cursor: pointer; font-size: 10px; }

            .tabs { display: flex; gap: 4px; margin-bottom: 10px; }
            .tab {
                flex: 1;
                padding: 8px 4px;
                background: rgba(255,255,255,0.05);
                border: 1px solid transparent;
                border-radius: 8px;
                cursor: pointer;
                font-size: 10px;
                font-weight: 600;
                color: rgba(255,255,255,0.5);
                transition: all 0.2s;
            }
            .tab:hover { background: rgba(255,255,255,0.1); color: rgba(255,255,255,0.8); }
            .tab.active {
                background: linear-gradient(135deg, rgba(99,102,241,0.3), rgba(168,85,247,0.2));
                border-color: rgba(99,102,241,0.5);
                color: white;
            }
            .tab-content { display: none; }
            .tab-content.active { display: block; }

            /* LOG TAB */
            .log-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 8px;
                font-size: 11px;
                color: rgba(255,255,255,0.6);
            }
            .log-legend { font-size: 9px; color: rgba(255,255,255,0.4); }

            .log-panel {
                background: rgba(0,0,0,0.3);
                border-radius: 8px;
                max-height: 200px;
                overflow-y: auto;
                padding: 4px;
            }

            .log-entry {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 6px 8px;
                border-radius: 6px;
                margin-bottom: 2px;
                background: rgba(255,255,255,0.03);
                font-size: 11px;
            }
            .log-entry:hover { background: rgba(255,255,255,0.08); }
            .log-entry.blocked { border-left: 3px solid #22c55e; }
            .log-entry.queued { border-left: 3px solid #f59e0b; }
            .log-entry.failed { border-left: 3px solid #ef4444; }
            .log-entry.detected { border-left: 3px solid #6366f1; }

            .log-source { font-size: 12px; }
            .log-author { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: rgba(255,255,255,0.8); }
            .log-status { font-size: 10px; }

            /* BLOCK ADS TAB */
            .section-title {
                font-size: 11px;
                font-weight: 700;
                color: rgba(255,255,255,0.7);
                margin: 10px 0 6px 0;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            .section-desc { font-size: 10px; color: rgba(255,255,255,0.4); margin: 0 0 8px 0; }
            .section-divider { height: 1px; background: rgba(255,255,255,0.1); margin: 12px 0; }

            .action-btn {
                width: 100%;
                padding: 12px;
                border: none;
                border-radius: 10px;
                cursor: pointer;
                font-size: 12px;
                font-weight: 700;
                margin-bottom: 10px;
            }
            .action-btn.danger {
                background: linear-gradient(135deg, #ef4444, #dc2626);
                color: white;
            }

            .import-section { margin-bottom: 8px; }
            .import-section input[type="text"], .import-section input[type="file"] {
                width: 100%;
                padding: 8px 10px;
                background: rgba(255,255,255,0.08);
                border: 1px solid rgba(255,255,255,0.15);
                border-radius: 8px;
                color: white;
                font-size: 11px;
                margin-bottom: 6px;
                box-sizing: border-box;
            }

            .import-btn, .requeue-btn {
                width: 100%;
                padding: 10px;
                border: none;
                border-radius: 8px;
                cursor: pointer;
                font-size: 11px;
                font-weight: 600;
                transition: all 0.2s;
                margin-bottom: 6px;
            }
            .import-btn {
                background: linear-gradient(135deg, rgba(59,130,246,0.4), rgba(99,102,241,0.3));
                border: 1px solid rgba(59,130,246,0.5);
                color: white;
            }
            .import-btn:hover { background: linear-gradient(135deg, rgba(59,130,246,0.6), rgba(99,102,241,0.5)); }
            .import-btn.small, .requeue-btn.small { padding: 8px; font-size: 10px; }

            .requeue-btn {
                background: linear-gradient(135deg, rgba(34,197,94,0.4), rgba(22,163,74,0.3));
                border: 1px solid rgba(34,197,94,0.5);
                color: white;
            }
            .requeue-btn:hover { background: linear-gradient(135deg, rgba(34,197,94,0.6), rgba(22,163,74,0.5)); }

            /* SETTINGS TAB */
            .setting-row { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
            .setting-row label { flex: 1; font-size: 11px; color: rgba(255,255,255,0.6); }
            .setting-row input[type="range"] { flex: 2; accent-color: #8b5cf6; }

            .speed-btns { display: flex; gap: 4px; }
            .speed-btn {
                padding: 6px 10px;
                background: rgba(255,255,255,0.05);
                border: 1px solid transparent;
                border-radius: 6px;
                color: rgba(255,255,255,0.5);
                cursor: pointer;
                font-size: 11px;
                transition: all 0.2s;
            }
            .speed-btn.active {
                background: rgba(99,102,241,0.3);
                border-color: rgba(99,102,241,0.5);
                color: white;
            }

            .opt { display: flex; align-items: center; gap: 8px; padding: 6px 0; cursor: pointer; font-size: 11px; }
            .opt input[type="checkbox"] { width: 16px; height: 16px; accent-color: #8b5cf6; }
            .opt label { color: rgba(255,255,255,0.7); cursor: pointer; }

            .github-fields { margin: 10px 0; }
            .github-fields.disabled { opacity: 0.4; pointer-events: none; }
            .github-fields input {
                width: 100%;
                padding: 8px 10px;
                background: rgba(255,255,255,0.08);
                border: 1px solid rgba(255,255,255,0.15);
                border-radius: 8px;
                color: white;
                font-size: 11px;
                box-sizing: border-box;
                margin-bottom: 6px;
            }
            .github-fields .field-row { display: flex; gap: 6px; }
            .github-fields .field-row input.small { flex: 1; }
            .github-fields .field-row select.small {
                flex: 1;
                background: rgba(255,255,255,0.08);
                border: 1px solid rgba(255,255,255,0.15);
                border-radius: 8px;
                color: white;
                padding: 8px 10px;
                font-size: 11px;
                cursor: pointer;
            }

            .sync-row { display: flex; gap: 6px; margin: 10px 0; }
            .sync-row .set-btn { flex: 1; }

            .set-btn {
                display: block;
                width: 100%;
                padding: 10px;
                margin-top: 6px;
                background: rgba(255,255,255,0.1);
                border: 1px solid rgba(255,255,255,0.15);
                border-radius: 8px;
                cursor: pointer;
                font-size: 11px;
                color: white;
                transition: all 0.2s;
            }
            .set-btn:hover { background: rgba(255,255,255,0.15); }
            .set-btn.danger {
                background: rgba(239,68,68,0.2);
                border-color: rgba(239,68,68,0.4);
            }

            .nuclear-section {
                background: rgba(251,146,60,0.1);
                padding: 10px;
                border-radius: 8px;
                border: 1px solid rgba(251,146,60,0.3);
            }
            .nuclear-opt label { color: #fdba74 !important; font-weight: bold; }

            .export-btns { display: flex; gap: 6px; margin-bottom: 8px; }
            .export-btns .set-btn { flex: 1; margin-top: 0; }

            /* Sync & Block */
            .sync-block-opt { margin-bottom: 8px; }
            .sync-block-opt label { color: #93c5fd !important; font-weight: 600; }
            .sync-block-fields { margin-top: 8px; }
            .sync-block-fields.disabled { opacity: 0.4; pointer-events: none; }
            .sync-block-fields select {
                background: rgba(255,255,255,0.08);
                border: 1px solid rgba(255,255,255,0.15);
                border-radius: 6px;
                color: white;
                padding: 6px 10px;
                font-size: 11px;
                cursor: pointer;
            }
            .sync-block-info {
                display: flex;
                justify-content: space-between;
                padding: 8px 10px;
                background: rgba(59,130,246,0.1);
                border: 1px solid rgba(59,130,246,0.3);
                border-radius: 8px;
                margin: 8px 0;
                font-size: 10px;
                color: rgba(255,255,255,0.6);
            }
            .sync-block-status { color: #86efac; font-weight: 600; }
            .sync-block-status.active { color: #fde047; animation: pulse 1s infinite; }
            @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }

            .adnull-tag {
                position: absolute;
                top: 10px;
                left: 10px;
                background: linear-gradient(135deg, #ef4444, #dc2626);
                color: white;
                padding: 6px 12px;
                border-radius: 8px;
                font-weight: bold;
                font-size: 11px;
                z-index: 9999;
                box-shadow: 0 2px 10px rgba(239,68,68,0.5);
            }

            .adnull-skip-notif {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: rgba(0,0,0,0.9);
                color: #86efac;
                padding: 20px 40px;
                border-radius: 16px;
                font-size: 18px;
                font-weight: bold;
                z-index: 999999;
                display: flex;
                align-items: center;
                gap: 12px;
                border: 2px solid #22c55e;
                box-shadow: 0 20px 60px rgba(0,0,0,0.5);
            }
            .adnull-skip-notif span:first-child { font-size: 28px; }
        `);
    }

    // ══════════════════════════════════════════════════════════════════════════════
    // INITIALIZE
    // ══════════════════════════════════════════════════════════════════════════════
    async function initialize() {
        log('═══════════════════════════════════════');
        log('⚡ AdNull Power v' + VERSION);
        log('═══════════════════════════════════════');

        loadState();

        // Handle blocking popup
        if (isBlockingPopup()) {
            log('Running as blocking popup');
            await runBlockingPopup();
            return;
        }

        // Determine mode
        if (isReelsPage()) {
            state.currentMode = 'reels';
            log('Mode: Reels (Collect + Block)');
        } else if (isFeedPage()) {
            state.currentMode = 'feed';
            log('Mode: Feed (Collect + Queue)');
        } else if (isProfilePage()) {
            // Nuclear mode on profile pages
            if (state.config.nuclearModeEnabled) {
                log('☢️ Nuclear mode triggered');
                await sleep(2000);
                await runNuclearBlock();
                return;
            }

            GM_registerMenuCommand('📰 Go to Feed', () => {
                location.href = 'https://www.facebook.com/';
            });
            GM_registerMenuCommand('🎬 Go to Reels', () => {
                location.href = 'https://www.facebook.com/reel/?s=tab';
            });
            return;
        } else {
            GM_registerMenuCommand('📰 Go to Feed', () => {
                location.href = 'https://www.facebook.com/';
            });
            GM_registerMenuCommand('🎬 Go to Reels', () => {
                location.href = 'https://www.facebook.com/reel/?s=tab';
            });
            return;
        }

        // Wait for DOM
        if (document.readyState === 'loading') {
            await new Promise(r => document.addEventListener('DOMContentLoaded', r));
        }
        await sleep(1000);

        createDashboard();
        initUrlMonitor(); // Start watching for URL/mode changes

        // Menu commands
        GM_registerMenuCommand('▶ Start', () => {
            if (state.currentMode === 'reels') startSkipper();
            else startFeedScanner();
        });
        GM_registerMenuCommand('⏹ Stop', () => {
            if (state.currentMode === 'reels') stopSkipper();
            else stopFeedScanner();
        });
        GM_registerMenuCommand('☁️ Sync to GitHub', syncToGitHub);

        // Auto-restart skipper if it was active (reels mode)
        if (state.currentMode === 'reels' && GM_getValue('skipperActive', false)) {
            log('Auto-restarting skipper...');
            setTimeout(startSkipper, 2000);
        }

        // Start Sync & Block timer if enabled (reels mode)
        if (state.currentMode === 'reels' && state.config.syncAndBlockEnabled) {
            setTimeout(startSyncAndBlockTimer, 3000);
        }

        // Auto-start feed scanner if previously running
        if (state.currentMode === 'feed' && shouldAutoStart()) {
            setTimeout(startFeedScanner, 2000);
        }

        // Background scan - runs for both modes, checks current mode
        setInterval(() => {
            if (state.currentMode === 'reels') {
                if (!reelsSkipperRunning && isReelsPage()) {
                    scanReels();
                    updateDashboard();
                    updateLogPanel();
                }
            } else if (state.currentMode === 'feed') {
                if (isFeedPage()) {
                    scanFeed();
                    updateDashboard();
                    updateLogPanel();
                }
            }
        }, 2000);

        log('✓ Ready');
    }

    initialize().catch(err => console.error('[AdNull Power] Error:', err));

})();