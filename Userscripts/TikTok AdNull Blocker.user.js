// ==UserScript==
// @name         TikTok AdNull Blocker
// @namespace    https://github.com/SysAdminDoc/AdNull
// @version      2.3.1
// @description  Professional TikTok blocker with configurable features: auto-skip, auto-download, GitHub sync, filtering, and more.
// @author       Matthew Parker
// @match        https://www.tiktok.com/*
// @icon         https://www.tiktok.com/favicon.ico
// @grant        GM_addStyle
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @grant        GM_openInTab
// @grant        GM_xmlhttpRequest
// @grant        GM_download
// @grant        GM_setClipboard
// @grant        GM_registerMenuCommand
// @grant        GM_notification
// @grant        window.close
// @connect      raw.githubusercontent.com
// @connect      api.github.com
// @connect      v0-tik-tok-downloader-design.vercel.app
// @connect      tiktokcdn.com
// @run-at       document-start
// @license      MIT
// ==/UserScript==

(function() {
    'use strict';

    // ==================== BACKGROUND PLAY ====================
    // Trick TikTok into thinking the tab is always in focus
    // This allows videos to continue playing when tab is in background
    Object.defineProperty(document, 'hidden', {
        get: function() {
            return false;
        },
        configurable: true
    });

    Object.defineProperty(document, 'visibilityState', {
        get: function() {
            return 'visible';
        },
        configurable: true
    });

    // Also prevent visibilitychange events from firing
    document.addEventListener('visibilitychange', function(e) {
        e.stopImmediatePropagation();
    }, true);

    console.log('[TT Blocker] Script version 2.2.0 starting...');

    // ==================== DOWNLOAD API ====================
    const DOWNLOAD_API_URL = 'https://v0-tik-tok-downloader-design.vercel.app/api/download?url=';

    // Download Icons
    const DOWNLOAD_ICONS = {
        download: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
        video: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>',
        copy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>',
        loading: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>',
        check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
        error: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>'
    };

    // ==================== CONFIGURATION ====================
    const CONFIG = {
        debug: true,
        scanInterval: 1000,
        dashboardRows: 150,

        // Ad detection keywords
        adKeywords: [
            "anúncio", "anuncio", "patrocinado", "patrocinada",
            "publicidade", "publi", "sponsored", "ad", "promo",
            "advertisement", "promoted"
        ],

        // Selectors - using data-e2e attributes where possible for stability
        selectors: {
            adContainer: "div[class*='DivItemTagsContainer'] > div",
            videoArticle: "article[data-e2e='recommend-list-item-container']",
            posterAvatar: "a[data-e2e='video-author-avatar']",
            posterName: "a[href^='/@'] p.TUXText",
            // Comment selectors - multiple fallbacks
            commentWrapper: "[class*='DivCommentObjectWrapper'], [class*='DivCommentItemWrapper']",
            commentUsernameWrapper: "[data-e2e='comment-username-1']",
            commentUserLink: "a.link-a11y-focus[href^='/@']",
            actionBar: "section[class*='SectionActionBarContainer']",
            nextButton: "button[data-e2e='arrow-right'], aside button:nth-child(2)"
        },

        // Blocking settings - increased for captcha scenarios
        pollInterval: 500,
        maxPolls: 120,  // 60 seconds total wait time for captcha
        tabOpenDelay: 2000,

        // Auto-skip settings
        autoSkip: {
            minInterval: 3,
            maxInterval: 300,
            defaultInterval: 15
        },

        // Colors
        colors: {
            blockBtn: '#fe2c55',
            blocked: '#4CAF50',
            pending: '#ff9800',
            panel: '#1a1a2e',
            accent: '#fe2c55',
            cyan: '#25f4ee'
        },

        // GitHub Sync Settings
        github: {
            syncEnabled: false,
            token: '',
            repo: '',
            path: 'tiktok_blocklist.csv',
            branch: 'main',
            syncThreshold: 25,  // Sync every N new blocks
            foundationUrl: 'https://raw.githubusercontent.com/SysAdminDoc/AdNull/refs/heads/main/Blocklists/tiktok_master_blocklist.csv'
        }
    };

    // ==================== STATE ====================
    const state = {
        // Block list - persisted
        blockList: [],           // Array of {url, username, timestamp, source}
        blockListUrls: new Set(),

        // Session state
        blockQueue: [],
        sessionBlocked: 0,
        totalBlocked: 0,
        adsDetected: 0,
        adsBlocked: 0,
        isRunning: false,
        isBlocking: false,
        processedPosts: new WeakSet(),
        processedComments: new WeakSet(),

        // Feature flags (all enabled by default)
        features: {
            autoBlockAds: true,         // Auto-block ad posters
            autoSkipOnAd: true,         // Skip video when ad detected
            autoSkipTimer: false,       // Timed auto-skip
            downloadButton: true,       // Show download button on videos
            autoDownload: false,        // Auto-download every video as it loads
            backgroundPlay: true,       // Enable background play
            sidebarFiltering: true,     // Hide blocked users from sidebar
            liveStreamBlocking: true,   // Hide blocked users' live streams
            feedFiltering: true,        // Hide videos from blocked users
            autoRetryOnError: true,     // Auto-click retry on error pages
            blockButtons: true,         // Show block buttons on posts/comments
            githubAutoSync: true,       // Auto-sync to GitHub when threshold reached
            keyboardShortcuts: true     // Enable keyboard navigation (disable when typing comments)
        },

        // Download settings
        downloadFolder: 'TikTok',       // Subfolder for downloads
        downloadedVideos: new Set(),    // Track already downloaded videos this session
        lastDownloadedUrl: null,        // Last URL that was auto-downloaded

        // Auto-skip state
        autoSkipInterval: CONFIG.autoSkip.defaultInterval,
        autoSkipTimer: null,
        autoSkipCountdown: 0,
        videosAutoSkipped: 0,
        pendingAdSkip: null,
        lastAdSkipTime: 0,

        // GitHub sync state
        githubConfig: { ...CONFIG.github },
        blocksSinceLastSync: 0,
        foundationImported: false,
        dashboardReady: false
    };

    // ==================== UTILS ====================
    function log(msg, ...args) {
        if (CONFIG.debug) console.log(`[TT Blocker] ${msg}`, ...args);
    }

    function sleep(ms) {
        return new Promise(r => setTimeout(r, ms));
    }

    function waitFor(fn, tries = CONFIG.maxPolls, interval = CONFIG.pollInterval) {
        return new Promise((resolve, reject) => {
            let count = 0;
            const t = setInterval(() => {
                count++;
                try {
                    const val = fn();
                    if (val) { clearInterval(t); resolve(val); }
                    else if (count >= tries) { clearInterval(t); reject(new Error("Timed out")); }
                } catch (e) { clearInterval(t); reject(e); }
            }, interval);
        });
    }

    function formatDate(ts) {
        const d = new Date(ts);
        return d.toLocaleDateString() + ' ' + d.toLocaleTimeString();
    }

    function extractUsername(href) {
        if (!href) return null;
        const match = href.match(/\/@([^/?]+)/);
        return match ? match[1] : null;
    }

    function buildProfileUrl(username) {
        return `https://www.tiktok.com/@${username}`;
    }

    // ==================== PERSISTENCE ====================
    function loadBlockList() {
        try {
            const saved = GM_getValue('tt_block_list_v1', '[]');
            state.blockList = JSON.parse(saved);
            state.blockListUrls = new Set(state.blockList.map(e => e.url));
            state.totalBlocked = state.blockList.length;
            log(`Loaded ${state.blockList.length} blocked profiles`);
        } catch(e) {
            state.blockList = [];
            state.blockListUrls = new Set();
        }
    }

    function saveBlockList() {
        GM_setValue('tt_block_list_v1', JSON.stringify(state.blockList));
    }

    function loadSettings() {
        // Load feature flags
        const savedFeatures = GM_getValue('tt_features', null);
        if (savedFeatures) {
            state.features = { ...state.features, ...savedFeatures };
        }

        // Load auto-skip interval separately (it's a value, not a toggle)
        state.autoSkipInterval = GM_getValue('tt_auto_skip_interval', CONFIG.autoSkip.defaultInterval);

        // Load download folder
        state.downloadFolder = GM_getValue('tt_download_folder', 'TikTok');

        // Load GitHub settings
        const savedGithub = GM_getValue('tt_github_config', null);
        if (savedGithub) {
            state.githubConfig = { ...CONFIG.github, ...savedGithub };
        }
        state.blocksSinceLastSync = GM_getValue('tt_blocks_since_sync', 0);
        state.foundationImported = GM_getValue('tt_foundation_imported', false);
    }

    function saveSettings() {
        GM_setValue('tt_features', state.features);
        GM_setValue('tt_auto_skip_interval', state.autoSkipInterval);
        GM_setValue('tt_download_folder', state.downloadFolder);
    }

    function saveGithubConfig() {
        GM_setValue('tt_github_config', state.githubConfig);
        GM_setValue('tt_blocks_since_sync', state.blocksSinceLastSync);
        GM_setValue('tt_foundation_imported', state.foundationImported);
    }

    function addToBlockList(username, source = 'manual') {
        const url = buildProfileUrl(username);

        if (state.blockListUrls.has(url)) {
            log(`Already in block list: ${username}`);
            return false;
        }

        const entry = {
            url: url,
            username: username,
            timestamp: Date.now(),
            source: source // 'manual', 'ad', 'commenter'
        };

        state.blockList.unshift(entry);
        state.blockListUrls.add(url);
        state.totalBlocked++;
        saveBlockList();
        updateDashboardCounts();

        // Track for GitHub sync
        state.blocksSinceLastSync++;
        saveGithubConfig();
        updateGitHubProgress();
        checkGitHubSyncThreshold();

        return true;
    }

    // ==================== EXPORT ====================
    function exportBlockList() {
        const csv = [
            ['Username', 'URL', 'Date Blocked', 'Source'].join(','),
            ...state.blockList.map(e => [
                `"${(e.username || '').replace(/"/g, '""')}"`,
                e.url,
                formatDate(e.timestamp),
                e.source || 'manual'
            ].join(','))
        ].join('\n');

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `tiktok_blocklist_${new Date().toISOString().slice(0,10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);

        log(`Exported ${state.blockList.length} entries`);
        updateDashboardStatus(`✓ Exported ${state.blockList.length} profiles`);
    }

    // ==================== IMPORT ====================
    function parseCSVLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
                if (inQuotes && line[i + 1] === '"') {
                    current += '"';
                    i++;
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (char === ',' && !inQuotes) {
                result.push(current);
                current = '';
            } else {
                current += char;
            }
        }
        result.push(current);
        return result;
    }

    function importBlockList(file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const csv = e.target.result;
            const lines = csv.split('\n');

            if (lines.length < 2) {
                alert('Invalid CSV file - no data found');
                return;
            }

            let imported = 0;
            let skipped = 0;

            for (let i = 1; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line) continue;

                const fields = parseCSVLine(line);
                if (fields.length < 2) continue;

                const username = fields[0].replace(/^"|"$/g, '').replace(/""/g, '"');
                const url = fields[1].trim();

                if (!url || !url.includes('tiktok.com')) {
                    skipped++;
                    continue;
                }

                if (state.blockListUrls.has(url)) {
                    skipped++;
                    continue;
                }

                const entry = {
                    url: url,
                    username: username,
                    timestamp: Date.now(),
                    source: 'imported'
                };

                state.blockList.push(entry);
                state.blockListUrls.add(url);
                imported++;
            }

            state.totalBlocked = state.blockList.length;
            saveBlockList();
            updateDashboardCounts();
            refreshDashboardTable();

            alert(`Import complete!\nImported: ${imported}\nSkipped (duplicates/invalid): ${skipped}`);
            log(`Imported ${imported} profiles, skipped ${skipped}`);
        };

        reader.readAsText(file);
    }

    // ==================== GITHUB SYNC ====================
    function showToast(msg, type = 'info') {
        const existing = document.querySelector('.tt-toast');
        if (existing) existing.remove();

        const toast = document.createElement('div');
        toast.className = `tt-toast ${type}`;
        toast.innerHTML = `<span>${msg}</span>`;
        document.body.appendChild(toast);

        requestAnimationFrame(() => toast.classList.add('visible'));
        setTimeout(() => {
            toast.classList.remove('visible');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    async function syncToGitHub() {
        // Get fresh values
        const token = state.githubConfig.token?.trim();
        const repo = state.githubConfig.repo?.trim();
        const branch = state.githubConfig.branch || 'main';
        const path = state.githubConfig.path || 'tiktok_blocklist.csv';

        if (!state.githubConfig.syncEnabled || !token || !repo) {
            console.log('[TT Blocker] GitHub sync not configured');
            console.log('[TT Blocker] Enabled:', state.githubConfig.syncEnabled);
            console.log('[TT Blocker] Token length:', token?.length || 0);
            console.log('[TT Blocker] Repo:', repo);
            showToast('Configure GitHub settings first', 'warning');
            return { success: false, error: 'not_configured' };
        }

        console.log('[TT Blocker] ════════════════════════════════════════');
        console.log('[TT Blocker] Starting GitHub sync...');
        console.log('[TT Blocker] Repo:', repo);
        console.log('[TT Blocker] Path:', path);
        console.log('[TT Blocker] Branch:', branch);
        console.log('[TT Blocker] Token length:', token.length);
        console.log('[TT Blocker] Entries to sync:', state.blockList.length);
        console.log('[TT Blocker] ════════════════════════════════════════');

        updateDashboardStatus('☁️ Syncing to GitHub...');

        return new Promise((resolve) => {
            // First get the current file to merge with
            GM_xmlhttpRequest({
                method: 'GET',
                url: `https://api.github.com/repos/${repo}/contents/${path}?ref=${branch}`,
                headers: {
                    'Authorization': `token ${token}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'User-Agent': 'TikTok-AdNull-Blocker'
                },
                onload: (getResponse) => {
                    console.log('[TT Blocker] GET response:', getResponse.status);

                    if (getResponse.status === 401) {
                        console.error('[TT Blocker] GitHub 401 - Bad credentials');
                        showToast('GitHub: Bad credentials (401)', 'error');
                        resolve({ success: false, error: 'bad_credentials' });
                        return;
                    }
                    if (getResponse.status === 403) {
                        console.error('[TT Blocker] GitHub 403 - Forbidden');
                        console.error('[TT Blocker] Response:', getResponse.responseText);
                        showToast('GitHub: Forbidden - check permissions', 'error');
                        resolve({ success: false, error: 'forbidden' });
                        return;
                    }

                    let sha = null;
                    let existingUrls = new Set();
                    let existingRows = [];

                    if (getResponse.status === 200) {
                        try {
                            const fileData = JSON.parse(getResponse.responseText);
                            sha = fileData.sha;
                            console.log('[TT Blocker] Existing file SHA:', sha);

                            const existingContent = decodeURIComponent(escape(atob(fileData.content)));
                            const lines = existingContent.split('\n');

                            for (let i = 1; i < lines.length; i++) {
                                const line = lines[i].trim();
                                if (!line) continue;
                                existingRows.push(line);

                                const match = line.match(/^"[^"]*",([^,]+)/);
                                if (match) {
                                    existingUrls.add(match[1].trim());
                                }
                            }
                            console.log('[TT Blocker] Found', existingUrls.size, 'existing entries on GitHub');
                        } catch (e) {
                            console.error('[TT Blocker] Could not parse existing file:', e);
                        }
                    } else if (getResponse.status === 404) {
                        console.log('[TT Blocker] File does not exist yet, will create');
                    }

                    // Get new entries
                    const newEntries = state.blockList.filter(e => !existingUrls.has(e.url));
                    console.log('[TT Blocker] New entries to add:', newEntries.length);

                    if (newEntries.length === 0 && existingRows.length > 0) {
                        state.blocksSinceLastSync = 0;
                        saveGithubConfig();
                        showToast('GitHub already up to date', 'info');
                        updateDashboardStatus('✓ GitHub up to date');
                        resolve({ success: true, added: 0 });
                        return;
                    }

                    // Create merged CSV
                    const newRows = newEntries.map(e => [
                        `"${(e.username || '').replace(/"/g, '""')}"`,
                        e.url,
                        e.source || 'manual',
                        formatDate(e.timestamp),
                        'blocked'
                    ].join(','));

                    const allRows = [...existingRows, ...newRows];
                    const csv = [
                        ['Username', 'URL', 'Source', 'Date', 'Status'].join(','),
                        ...allRows
                    ].join('\n');

                    const content = btoa(unescape(encodeURIComponent(csv)));

                    const body = {
                        message: `TikTok AdNull sync: +${newEntries.length} new (${allRows.length} total)`,
                        content: content,
                        branch: branch
                    };
                    if (sha) body.sha = sha;

                    console.log('[TT Blocker] Uploading', allRows.length, 'total entries...');

                    GM_xmlhttpRequest({
                        method: 'PUT',
                        url: `https://api.github.com/repos/${repo}/contents/${path}`,
                        headers: {
                            'Authorization': `token ${token}`,
                            'Accept': 'application/vnd.github.v3+json',
                            'Content-Type': 'application/json',
                            'User-Agent': 'TikTok-AdNull-Blocker'
                        },
                        data: JSON.stringify(body),
                        onload: (putResponse) => {
                            console.log('[TT Blocker] PUT response:', putResponse.status);

                            if (putResponse.status === 200 || putResponse.status === 201) {
                                console.log('[TT Blocker] ✅ GitHub sync successful');
                                state.blocksSinceLastSync = 0;
                                saveGithubConfig();
                                showToast(`GitHub: +${newEntries.length} entries synced`, 'success');
                                updateDashboardStatus(`✓ Synced ${newEntries.length} to GitHub`);
                                updateGitHubProgress();
                                resolve({ success: true, added: newEntries.length });
                            } else {
                                console.error('[TT Blocker] GitHub sync failed:', putResponse.status);
                                console.error('[TT Blocker] Response:', putResponse.responseText);
                                showToast(`GitHub sync failed: ${putResponse.status}`, 'error');
                                resolve({ success: false, error: putResponse.status });
                            }
                        },
                        onerror: (e) => {
                            console.error('[TT Blocker] GitHub sync error:', e);
                            showToast('GitHub sync error', 'error');
                            resolve({ success: false, error: e });
                        }
                    });
                },
                onerror: (e) => {
                    console.error('[TT Blocker] GitHub GET error:', e);
                    showToast('GitHub connection error', 'error');
                    resolve({ success: false, error: e });
                }
            });
        });
    }

    function testGitHubToken() {
        // Get fresh values from input fields (in case not saved yet)
        const tokenField = document.getElementById('github-token');
        const repoField = document.getElementById('github-repo');

        const token = (tokenField?.value || state.githubConfig.token || '').trim();
        const repo = (repoField?.value || state.githubConfig.repo || '').trim();

        if (!token || !repo) {
            showToast('Enter token and repo first', 'warning');
            return;
        }

        showToast('Testing GitHub connection...', 'info');

        console.log('[TT Blocker] ════════════════════════════════════════');
        console.log('[TT Blocker] Testing GitHub token...');
        console.log('[TT Blocker] Repo:', repo);
        console.log('[TT Blocker] Token length:', token.length);
        console.log('[TT Blocker] Token prefix:', token.substring(0, 10) + '...');

        // Detect token type
        let tokenType = 'unknown';
        if (token.startsWith('ghp_')) tokenType = 'classic PAT';
        else if (token.startsWith('github_pat_')) tokenType = 'fine-grained PAT';
        else if (token.startsWith('gho_')) tokenType = 'oauth';
        console.log('[TT Blocker] Token type:', tokenType);
        console.log('[TT Blocker] ════════════════════════════════════════');

        GM_xmlhttpRequest({
            method: 'GET',
            url: `https://api.github.com/repos/${repo}`,
            headers: {
                'Authorization': `token ${token}`,
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'TikTok-AdNull-Blocker'
            },
            onload: (r) => {
                console.log('[TT Blocker] Response status:', r.status);

                if (r.status === 200) {
                    const data = JSON.parse(r.responseText);
                    console.log('[TT Blocker] ✅ Repo access confirmed:', data.full_name);
                    console.log('[TT Blocker] Permissions:', data.permissions);

                    if (data.permissions?.push) {
                        showToast(`✅ Connected to ${data.full_name} with push access`, 'success');
                    } else {
                        showToast(`⚠️ Connected but no push access`, 'warning');
                    }
                } else if (r.status === 401) {
                    console.error('[TT Blocker] ❌ 401 - Invalid token');
                    console.error('[TT Blocker] Response:', r.responseText);
                    showToast('❌ Invalid token (401)', 'error');
                } else if (r.status === 404) {
                    console.error('[TT Blocker] ❌ 404 - Repo not found');
                    showToast('Repository not found (404)', 'error');
                } else {
                    console.error('[TT Blocker] Error:', r.status, r.responseText);
                    showToast(`Error: ${r.status}`, 'error');
                }
            },
            onerror: (e) => {
                console.error('[TT Blocker] Connection error:', e);
                showToast('Connection failed', 'error');
            }
        });
    }

    async function importFoundation(force = false) {
        if (state.foundationImported && !force) {
            log('Foundation already imported');
            return;
        }

        log('Importing foundation blocklist...');
        showToast('Importing foundation list...', 'info');

        return new Promise((resolve) => {
            GM_xmlhttpRequest({
                method: 'GET',
                url: state.githubConfig.foundationUrl,
                onload: (r) => {
                    if (r.status !== 200) {
                        showToast('Failed to fetch foundation list', 'error');
                        resolve(false);
                        return;
                    }

                    const lines = r.responseText.split('\n');
                    let imported = 0;

                    for (let i = 1; i < lines.length; i++) {
                        const line = lines[i].trim();
                        if (!line) continue;

                        const fields = parseCSVLine(line);
                        if (fields.length < 2) continue;

                        const username = fields[0].replace(/^"|"$/g, '');
                        const url = fields[1].trim();

                        if (!url || state.blockListUrls.has(url)) continue;

                        state.blockList.push({
                            url: url,
                            username: username,
                            timestamp: Date.now(),
                            source: 'foundation'
                        });
                        state.blockListUrls.add(url);
                        imported++;
                    }

                    if (imported > 0) {
                        state.totalBlocked = state.blockList.length;
                        saveBlockList();
                        updateDashboardCounts();
                        refreshDashboardTable();
                    }

                    state.foundationImported = true;
                    saveGithubConfig();

                    showToast(`Imported ${imported} from foundation`, 'success');
                    log(`Foundation import complete: ${imported} new entries`);
                    resolve(true);
                },
                onerror: () => {
                    showToast('Foundation import failed', 'error');
                    resolve(false);
                }
            });
        });
    }

    function checkGitHubSyncThreshold() {
        if (state.features.githubAutoSync && state.githubConfig.syncEnabled && state.blocksSinceLastSync >= state.githubConfig.syncThreshold) {
            log(`GitHub sync threshold reached (${state.blocksSinceLastSync}/${state.githubConfig.syncThreshold})`);
            syncToGitHub();
        }
    }

    function updateGitHubProgress() {
        const counter = document.getElementById('sync-counter');
        const bar = document.getElementById('sync-bar');
        if (counter) counter.textContent = state.blocksSinceLastSync;
        if (bar) {
            const pct = Math.min(100, (state.blocksSinceLastSync / state.githubConfig.syncThreshold) * 100);
            bar.style.width = `${pct}%`;
        }
    }

    // ==================== AUTO-SKIP FUNCTIONALITY ====================
    function findDownButton() {
        // The down arrow button has a VERY specific SVG path that forms a downward chevron
        // Full path: "m24 27.76 13.17-13.17a1 1 0 0 1 1.42 0l2.82 2.82a1 1 0 0 1 0 1.42L25.06 35.18a1.5 1.5 0 0 1-2.12 0L6.59 18.83a1 1 0 0 1 0-1.42L9.4 14.6a1 1 0 0 1 1.42 0L24 27.76Z"
        // Key identifier: The path must start with "m24 27.76 13.17-13.17" - this is UNIQUE to the down chevron

        const allButtons = document.querySelectorAll('button');

        for (const btn of allButtons) {
            const svg = btn.querySelector('svg');
            if (!svg) continue;

            const path = svg.querySelector('path');
            if (!path) continue;

            const d = path.getAttribute('d');
            if (!d) continue;

            // EXACT match for down arrow: must start with "m24 27.76 13.17-13.17"
            // This is the unique signature of the down chevron - distinguishes from mute, like, share, etc.
            if (d.startsWith('m24 27.76 13.17-13.17')) {
                log('Found down button by exact path signature');
                return btn;
            }
        }

        // Strategy 2: Try data-e2e attribute
        const arrowDown = document.querySelector('button[data-e2e="arrow-down"]');
        if (arrowDown) {
            log('Found down button by data-e2e');
            return arrowDown;
        }

        // Strategy 3: Try arrow-right as fallback (older TikTok layout)
        const arrowRight = document.querySelector('button[data-e2e="arrow-right"]');
        if (arrowRight) {
            log('Found down button by arrow-right data-e2e');
            return arrowRight;
        }

        log('Down button not found with any strategy');
        return null;
    }

    function clickDownButton() {
        const btn = findDownButton();
        if (btn) {
            btn.click();
            state.videosAutoSkipped++;
            updateDashboardCounts();
            log('Clicked down button - auto-skipped to next video');
            return true;
        }

        // Fallback: Use keyboard event (only if keyboard shortcuts enabled)
        if (!state.features.keyboardShortcuts) {
            log('Keyboard shortcuts disabled, cannot skip via keyboard fallback');
            return false;
        }

        log('Down button not found, using keyboard ArrowDown');

        // Simulate pressing the down arrow key
        const event = new KeyboardEvent('keydown', {
            key: 'ArrowDown',
            code: 'ArrowDown',
            keyCode: 40,
            which: 40,
            bubbles: true,
            cancelable: true,
            view: window
        });

        document.dispatchEvent(event);
        state.videosAutoSkipped++;
        updateDashboardCounts();
        return true;
    }

    // ==================== VIDEO ACTION BUTTONS ====================
    function clickLikeButton() {
        const likeBtn = document.querySelector('button[aria-label*="Like video"], span[data-e2e="like-icon"]');
        if (likeBtn) {
            const btn = likeBtn.closest('button') || likeBtn;
            btn.click();
            log('Clicked like button');
            showToast('❤️ Liked!', 'success');
            return true;
        }
        log('Like button not found');
        showToast('Like button not found', 'error');
        return false;
    }

    function clickSaveButton() {
        const saveBtn = document.querySelector('button[aria-label*="Favorites"], button[aria-label*="Save"]');
        if (saveBtn) {
            saveBtn.click();
            log('Clicked save button');
            showToast('🔖 Saved!', 'success');
            return true;
        }
        log('Save button not found');
        showToast('Save button not found', 'error');
        return false;
    }

    function clickVideoDownloadButton() {
        // First try our custom download button
        const customBtn = document.querySelector('.ttd-download-btn');
        if (customBtn) {
            customBtn.click();
            log('Clicked custom download button');
            return true;
        }

        // Fallback: trigger download directly
        const currentUrl = window.location.href;
        if (currentUrl.includes('/video/')) {
            showToast('📥 Downloading...', 'info');
            // Use the auto-download logic
            autoDownloadCurrentVideo();
            return true;
        }

        showToast('Download button not found', 'error');
        return false;
    }

    function clickCommentsButton() {
        // Multiple selectors for the comments button
        const selectors = [
            'span[data-e2e="comment-icon"]',
            'button[aria-label*="comment" i]',
            'button[aria-label*="Comment" i]',
            'strong[data-e2e="comment-count"]'
        ];

        for (const selector of selectors) {
            const el = document.querySelector(selector);
            if (el) {
                const btn = el.closest('button') || el;
                btn.click();
                log('Clicked comments button via:', selector);
                return true;
            }
        }
        log('Comments button not found');
        return false;
    }

    function waitForCommentsButtonAndClick(maxAttempts = 20, interval = 250) {
        let attempts = 0;

        const checkAndClick = () => {
            attempts++;

            // Check if comments button exists
            const commentBtn = document.querySelector('span[data-e2e="comment-icon"], button[aria-label*="comment" i], strong[data-e2e="comment-count"]');

            if (commentBtn) {
                const btn = commentBtn.closest('button') || commentBtn;
                btn.click();
                log(`Comments button found and clicked after ${attempts} attempts`);
                showToast('💬 Comments opened', 'info');
                return;
            }

            if (attempts < maxAttempts) {
                setTimeout(checkAndClick, interval);
            } else {
                log('Comments button not found after max attempts');
            }
        };

        // Start checking after a brief initial delay
        setTimeout(checkAndClick, 500);
    }

    function skipToForYouAndOpenComments() {
        // Click "For You" navigation
        const forYouBtn = document.querySelector('a[data-e2e="nav-foryou"], a[href="/"] button');
        if (forYouBtn) {
            const btn = forYouBtn.closest('a') || forYouBtn;
            btn.click();
            log('Clicked For You button');

            // Poll for video to load and comments button to appear
            waitForCommentsButtonAndClick();

            state.videosAutoSkipped++;
            updateDashboardCounts();
            showToast('⏭️ Skipped to For You', 'success');
            return true;
        }

        // Fallback to regular skip if For You not found
        log('For You button not found, using regular skip');
        const result = clickDownButton();
        if (result) {
            waitForCommentsButtonAndClick();
        }
        return result;
    }

    function startAutoSkip() {
        if (state.autoSkipTimer) {
            stopAutoSkip();
        }

        state.autoSkipCountdown = state.autoSkipInterval;
        updateAutoSkipDisplay();

        // Countdown timer - updates every second
        state.autoSkipTimer = setInterval(() => {
            state.autoSkipCountdown--;

            if (state.autoSkipCountdown <= 0) {
                // Time to skip
                clickDownButton();
                state.autoSkipCountdown = state.autoSkipInterval;
            }

            updateAutoSkipDisplay();
        }, 1000);

        log(`Auto-skip started: ${state.autoSkipInterval} seconds`);
        updateDashboardStatus(`⏱️ Auto-skip active: ${state.autoSkipInterval}s`);
    }

    function stopAutoSkip() {
        if (state.autoSkipTimer) {
            clearInterval(state.autoSkipTimer);
            state.autoSkipTimer = null;
        }
        state.autoSkipCountdown = 0;
        updateAutoSkipDisplay();
        log('Auto-skip stopped');
        updateDashboardStatus('✓ Ready');
    }

    function resetAutoSkipTimer() {
        // Reset the countdown (used when manually navigating or when ad skipped)
        if (state.features.autoSkipTimer && state.autoSkipTimer) {
            state.autoSkipCountdown = state.autoSkipInterval;
            updateAutoSkipDisplay();
        }
    }

    function updateAutoSkipDisplay() {
        const display = document.getElementById('auto-skip-countdown');
        const timerBar = document.getElementById('auto-skip-timer-bar');

        if (display) {
            if (state.features.autoSkipTimer && state.autoSkipCountdown > 0) {
                display.textContent = `Next skip in: ${state.autoSkipCountdown}s`;
                display.style.display = 'block';
            } else {
                display.style.display = 'none';
            }
        }

        if (timerBar) {
            if (state.features.autoSkipTimer && state.autoSkipInterval > 0) {
                const progress = (state.autoSkipCountdown / state.autoSkipInterval) * 100;
                timerBar.style.width = `${progress}%`;
                timerBar.style.display = 'block';
            } else {
                timerBar.style.display = 'none';
            }
        }
    }

    function isElementInViewport(el) {
        const rect = el.getBoundingClientRect();
        const windowHeight = window.innerHeight || document.documentElement.clientHeight;
        // Check if element is at least 50% visible vertically
        const visibleHeight = Math.min(rect.bottom, windowHeight) - Math.max(rect.top, 0);
        const elementHeight = rect.bottom - rect.top;
        return visibleHeight > elementHeight * 0.5;
    }

    function isActiveVideo(article) {
        // Check if this article is the currently active/playing video
        // TikTok's active video is the one that's most centered in the viewport

        const rect = article.getBoundingClientRect();
        const windowHeight = window.innerHeight || document.documentElement.clientHeight;
        const windowCenter = windowHeight / 2;

        // Calculate how centered the article is
        const articleCenter = rect.top + (rect.height / 2);
        const distanceFromCenter = Math.abs(windowCenter - articleCenter);

        // The article should be very close to center (within 20% of viewport height)
        // This ensures we only skip when we're actually ON the ad, not just approaching it
        const isNearCenter = distanceFromCenter < windowHeight * 0.2;

        // Also check the video is mostly visible (at least 70%)
        const visibleHeight = Math.min(rect.bottom, windowHeight) - Math.max(rect.top, 0);
        const elementHeight = rect.height || 1;
        const visibilityRatio = visibleHeight / elementHeight;
        const isMostlyVisible = visibilityRatio > 0.7;

        // Additional check: see if video inside this article is playing
        const video = article.querySelector('video');
        const isPlaying = video && !video.paused && video.currentTime > 0;

        log(`Ad check - nearCenter: ${isNearCenter}, mostlyVisible: ${isMostlyVisible}, playing: ${isPlaying}, distance: ${distanceFromCenter.toFixed(0)}`);

        // Must be near center AND mostly visible
        // If video exists and is playing, that's a strong signal we're on this video
        return (isNearCenter && isMostlyVisible) || isPlaying;
    }

    function skipOnAdDetected(adArticle) {
        if (!state.features.autoSkipOnAd) return;

        // Cooldown check - don't skip again within 2 seconds
        const now = Date.now();
        if (now - state.lastAdSkipTime < 2000) {
            log('Ad skip on cooldown - ignoring');
            return;
        }

        // Check if the ad is currently the active video (we're actually watching it)
        if (isActiveVideo(adArticle)) {
            log('Ad is active video - skipping now');
            state.lastAdSkipTime = now;
            setTimeout(() => {
                clickDownButton();
                resetAutoSkipTimer();
            }, 500);  // Slightly longer delay to ensure we're settled on the ad
            state.pendingAdSkip = null;
        } else {
            // Ad is not active yet, set it as pending
            log('Ad detected but not active - will skip when it becomes active');
            state.pendingAdSkip = adArticle;
        }
    }

    function checkPendingAdSkip() {
        if (state.pendingAdSkip && state.features.autoSkipOnAd) {
            // Cooldown check
            const now = Date.now();
            if (now - state.lastAdSkipTime < 2000) {
                return;
            }

            // Verify the pending ad element is still in the DOM
            if (!document.contains(state.pendingAdSkip)) {
                log('Pending ad no longer in DOM - clearing');
                state.pendingAdSkip = null;
                return;
            }

            if (isActiveVideo(state.pendingAdSkip)) {
                log('Pending ad is now active - skipping');
                state.lastAdSkipTime = now;
                setTimeout(() => {
                    clickDownButton();
                    resetAutoSkipTimer();
                }, 500);
                state.pendingAdSkip = null;
            }
        }
    }

    // ==================== AD DETECTION ====================
    function isAd(element) {
        const text = (element.innerText || '').toLowerCase();
        return CONFIG.adKeywords.some(k => text.includes(k.toLowerCase()));
    }

    function detectAdsInFeed() {
        // Strategy 1: Find ads by data-e2e="ad-tag" attribute (most reliable)
        const adTags = document.querySelectorAll('[data-e2e="ad-tag"]');
        adTags.forEach(el => {
            processAdElement(el);
        });

        // Strategy 2: Find ad containers by class pattern with keyword matching
        const adContainers = document.querySelectorAll(
            '[class*="DivItemTagsContainer"] > div, ' +
            '[class*="TagContainer"] > div, ' +
            '[class*="AdTag"]'
        );

        adContainers.forEach(el => {
            if (isAd(el)) {
                processAdElement(el);
            }
        });
    }

    function processAdElement(el) {
        // Find the article containing this ad
        const article = el.closest('article') ||
                       el.closest('[class*="DivContentFlexLayout"]')?.closest('article') ||
                       el.closest('[class*="ArticleItemContainer"]');

        if (!article) {
            log('Ad element found but no parent article');
            return;
        }

        // Check if already processed using article ID or a data attribute
        if (article.dataset.ttAdProcessed) {
            return;
        }
        article.dataset.ttAdProcessed = 'true';

        state.adsDetected++;
        log('=== AD DETECTED ===');
        log('Article ID:', article.id);

        // Tag it visually
        tagAsAd(article);

        // Get poster info
        const posterInfo = getPosterInfo(article);

        log('Poster info result:', posterInfo);
        log('Auto-block ads enabled:', state.features.autoBlockAds);
        log('Auto-skip on ad enabled:', state.features.autoSkipOnAd);

        if (posterInfo && posterInfo.username) {
            if (state.features.autoBlockAds) {
                log(`Auto-blocking ad poster: ${posterInfo.username}`);
                queueBlock(posterInfo.username, 'ad');
            }
        } else {
            log('Could not get poster info for ad');
        }

        // Auto-skip on ad detection
        if (state.features.autoSkipOnAd) {
            skipOnAdDetected(article);
        }

        updateDashboardCounts();
    }

    function tagAsAd(article) {
        if (article.querySelector('.tt-ad-tag')) return;

        const tag = document.createElement('div');
        tag.className = 'tt-ad-tag';
        tag.innerText = state.features.autoSkipOnAd ? '🚫 AD - AUTO SKIPPING' : '🚫 AD DETECTED';
        tag.style.cssText = `
            position: absolute;
            top: 10px;
            left: 10px;
            background: ${CONFIG.colors.blockBtn};
            color: white;
            padding: 8px 16px;
            border-radius: 8px;
            font-weight: bold;
            font-size: 14px;
            z-index: 9999;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        `;

        if (getComputedStyle(article).position === 'static') {
            article.style.position = 'relative';
        }
        article.appendChild(tag);
    }

    function skipToNextVideo() {
        // Use the new down button click function
        clickDownButton();
    }

    // ==================== BLOCKING LOGIC ====================
    function queueBlock(username, source = 'manual') {
        const url = buildProfileUrl(username);

        if (state.blockListUrls.has(url)) {
            log(`Already blocked: ${username}`);
            return;
        }

        // Check if already in queue
        if (state.blockQueue.some(q => q.username === username)) {
            log(`Already in queue: ${username}`);
            return;
        }

        state.blockQueue.push({ username, source });
        addToDashboard({ username, url }, 'pending');
        updateDashboardCounts();

        if (!state.isBlocking) {
            processBlockQueue();
        }
    }

    async function processBlockQueue() {
        if (state.isBlocking || state.blockQueue.length === 0) return;

        state.isBlocking = true;
        updateDashboardStatus('🔄 Blocking in progress...');

        while (state.blockQueue.length > 0) {
            const item = state.blockQueue[0];
            const url = buildProfileUrl(item.username);

            log(`Processing block: ${item.username}`);
            updateRowStatus(url, 'blocking');

            try {
                // Open profile in new tab
                const tab = GM_openInTab(url + '?tt_block_action=1', { active: false });

                // Wait for block to complete (signaled by tab close or timeout)
                await sleep(CONFIG.tabOpenDelay);
                await waitForBlockComplete(item.username);

                // Mark as blocked
                addToBlockList(item.username, item.source);
                state.sessionBlocked++;
                if (item.source === 'ad') state.adsBlocked++;

                updateRowStatus(url, 'blocked');
                log(`Blocked: ${item.username}`);

            } catch (e) {
                log(`Block failed for ${item.username}: ${e.message}`);
                updateRowStatus(url, 'failed');
            }

            state.blockQueue.shift();
            updateDashboardCounts();
            await sleep(1000);
        }

        state.isBlocking = false;
        if (state.features.autoSkipTimer) {
            updateDashboardStatus(`⏱️ Auto-skip active: ${state.autoSkipInterval}s`);
        } else {
            updateDashboardStatus('✓ Ready');
        }
    }

    async function waitForBlockComplete(username) {
        // Wait for the blocking tab to signal completion
        // This is done via localStorage message passing
        const key = `tt_block_complete_${username}`;

        try {
            await waitFor(() => {
                const val = localStorage.getItem(key);
                if (val) {
                    localStorage.removeItem(key);
                    return true;
                }
                return false;
            }, 100, 200);
        } catch (e) {
            // Timeout - assume it worked if tab was opened
            log(`Block timeout for ${username}, assuming success`);
        }
    }

    // ==================== BLOCKING TAB LOGIC ====================
    function isBlockingTab() {
        return window.location.search.includes('tt_block_action=1');
    }

    function isProfilePage() {
        return window.location.pathname.match(/^\/@[^/]+\/?$/);
    }

    async function runBlockingTab() {
        const username = extractUsername(window.location.pathname);
        if (!username) {
            log('Could not extract username');
            window.close();
            return;
        }

        log(`Blocking tab for: ${username}`);

        // Show a visual indicator that we're waiting
        showBlockingIndicator(`Waiting to block @${username}...`);

        try {
            // Wait for page to fully load - this also handles captcha
            // The script will keep waiting until the more button appears
            await sleep(2000);

            // Find and click the "..." more menu button - wait indefinitely for captcha
            log('Looking for more button (will wait for captcha if needed)...');
            const moreBtn = await waitFor(() => {
                return document.querySelector('button[data-e2e="user-more"]');
            }, CONFIG.maxPolls, CONFIG.pollInterval);

            if (!moreBtn) throw new Error('More button not found after waiting');

            showBlockingIndicator(`Found profile, clicking menu...`);
            moreBtn.click();
            log('Clicked more button');

            await sleep(800);

            // Find and click the Block button in the menu
            log('Looking for Block option in menu...');
            const blockOption = await waitFor(() => {
                // Try multiple selectors for the block option
                const selectors = [
                    'div[role="button"][aria-label="Block"]',
                    'div[tabindex="0"][role="button"] p:contains("Block")',
                    '[class*="DivActionContainer"] [class*="DivActionItem"]'
                ];

                // First try by aria-label
                let btn = document.querySelector('div[role="button"][aria-label="Block"]');
                if (btn) return btn;

                // Then try finding by text content
                const allBtns = document.querySelectorAll('div[role="button"], [class*="ActionItem"]');
                for (const btn of allBtns) {
                    const text = btn.innerText?.trim().toLowerCase();
                    if (text === 'block') return btn;
                    // Check for Block text in child elements
                    const pTag = btn.querySelector('p');
                    if (pTag && pTag.innerText?.trim().toLowerCase() === 'block') return btn;
                }
                return null;
            }, 30, 200);

            if (!blockOption) throw new Error('Block option not found in menu');

            showBlockingIndicator(`Clicking Block option...`);
            blockOption.click();
            log('Clicked block option');

            await sleep(1000);

            // Now wait for and click the confirmation dialog button
            log('Looking for confirmation dialog...');
            const confirmBtn = await waitFor(() => {
                // Look for the confirm button in the popup
                return document.querySelector('button[data-e2e="block-popup-block-btn"]') ||
                       document.querySelector('[data-e2e="block-popup"] button:last-child') ||
                       document.querySelector('button[class*="StyledButtonBlock"]');
            }, 30, 200);

            if (!confirmBtn) throw new Error('Confirmation button not found');

            showBlockingIndicator(`Confirming block...`);
            confirmBtn.click();
            log('Clicked confirmation button');

            await sleep(1500);

            // Signal completion
            localStorage.setItem(`tt_block_complete_${username}`, 'true');
            log(`Block complete: ${username}`);

            showBlockingIndicator(`✓ Blocked @${username}! Closing...`);
            await sleep(1000);
            window.close();

        } catch (e) {
            log(`Block error: ${e.message}`);
            showBlockingIndicator(`❌ Error: ${e.message}`);
            localStorage.setItem(`tt_block_complete_${username}`, 'error');
            await sleep(2000);
            window.close();
        }
    }

    function showBlockingIndicator(message) {
        let indicator = document.getElementById('tt-block-indicator');
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.id = 'tt-block-indicator';
            indicator.style.cssText = `
                position: fixed;
                top: 20px;
                left: 50%;
                transform: translateX(-50%);
                background: linear-gradient(135deg, #fe2c55, #25f4ee);
                color: white;
                padding: 16px 32px;
                border-radius: 12px;
                font-size: 16px;
                font-weight: bold;
                z-index: 999999;
                box-shadow: 0 4px 20px rgba(0,0,0,0.5);
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            `;
            document.body.appendChild(indicator);
        }
        indicator.textContent = message;
    }

    // ==================== UI - BLOCK BUTTONS ====================
    function addBlockButtonToPosters() {
        if (!state.features.blockButtons) return;

        // Find video articles on the feed
        const articles = document.querySelectorAll(
            'article[data-e2e="recommend-list-item-container"], ' +
            'article[class*="ArticleItemContainer"]'
        );

        articles.forEach(article => {
            if (article.querySelector('.tt-block-poster-btn')) return;

            // Find the avatar link - multiple strategies
            let avatarLink = article.querySelector('a[data-e2e="video-author-avatar"]');

            // Fallback: find avatar link by href pattern
            if (!avatarLink) {
                const links = article.querySelectorAll('a[href^="/@"]');
                for (const link of links) {
                    if (link.querySelector('img[class*="Avatar"]') || link.querySelector('span[class*="Avatar"]')) {
                        avatarLink = link;
                        break;
                    }
                }
            }

            if (!avatarLink) return;

            const username = extractUsername(avatarLink.getAttribute('href'));
            if (!username) return;

            // Create block button
            const btn = createBlockButton(username, 'poster');

            // Find the action bar section to insert the button
            const actionBar = article.querySelector('section[class*="ActionBar"]');
            if (actionBar) {
                btn.style.marginTop = '12px';
                btn.style.display = 'block';
                btn.style.width = '48px';
                btn.style.height = 'auto';
                btn.style.fontSize = '10px';
                btn.style.padding = '6px 4px';
                btn.style.textAlign = 'center';
                actionBar.insertBefore(btn, actionBar.firstChild);
                return;
            }

            // Fallback: Insert near the avatar
            const avatarContainer = avatarLink.closest('div');
            if (avatarContainer && avatarContainer.parentElement) {
                btn.style.marginTop = '8px';
                avatarContainer.parentElement.insertBefore(btn, avatarContainer.nextSibling);
            }
        });

        // Also handle the video detail page (when watching a specific video)
        addBlockButtonToVideoPage();
    }

    function addBlockButtonToVideoPage() {
        // Check if we're on a video detail page
        if (!window.location.pathname.includes('/video/')) return;

        // Find the author info section
        const authorSection = document.querySelector('[class*="DivAuthorContainer"], [data-e2e="video-author-uniqueid"]');
        if (!authorSection) return;
        if (authorSection.querySelector('.tt-block-poster-btn')) return;

        // Find author link
        const authorLink = document.querySelector('a[data-e2e="video-author-avatar"], a[href^="/@"][class*="Avatar"]');
        if (!authorLink) return;

        const username = extractUsername(authorLink.getAttribute('href'));
        if (!username) return;

        const btn = createBlockButton(username, 'poster');
        btn.style.marginLeft = '12px';

        // Insert near the author name
        const authorName = document.querySelector('[data-e2e="video-author-uniqueid"], [class*="AuthorTitle"]');
        if (authorName && authorName.parentElement) {
            authorName.parentElement.appendChild(btn);
        }
    }

    function addBlockButtonToCommenters() {
        if (!state.features.blockButtons) return;

        // Strategy 1: Find comment items by class pattern
        let commentItems = document.querySelectorAll(
            '[class*="DivCommentObjectWrapper"], ' +
            '[class*="DivCommentItemWrapper"], ' +
            '[data-e2e="comment-item"]'
        );

        // Strategy 2: If no items found, look in the comment list container
        if (commentItems.length === 0) {
            const commentList = document.querySelector('[class*="DivCommentListContainer"], [class*="CommentList"]');
            if (commentList) {
                // Find all divs that contain user links (likely comments)
                commentItems = commentList.querySelectorAll('div:has(> div a[href^="/@"])');
            }
        }

        // Strategy 3: Look for elements with comment-related data attributes
        if (commentItems.length === 0) {
            commentItems = document.querySelectorAll('[data-e2e^="comment"]');
        }

        commentItems.forEach(wrapper => {
            if (state.processedComments.has(wrapper)) return;
            if (wrapper.querySelector('.tt-block-commenter-btn')) return;

            state.processedComments.add(wrapper);

            // Find the user link within this comment - multiple strategies
            let userLink = null;

            // Strategy 1: Direct link with class
            userLink = wrapper.querySelector('a.link-a11y-focus[href^="/@"]');

            // Strategy 2: Link in username area
            if (!userLink) {
                const usernameArea = wrapper.querySelector('[data-e2e="comment-username-1"], [data-e2e*="username"]');
                if (usernameArea) {
                    userLink = usernameArea.querySelector('a[href^="/@"]');
                }
            }

            // Strategy 3: Link in trigger wrapper
            if (!userLink) {
                const triggerWrapper = wrapper.querySelector('[class*="TriggerWrapper"]');
                if (triggerWrapper) {
                    userLink = triggerWrapper.querySelector('a[href^="/@"]');
                }
            }

            // Strategy 4: Any profile link that's not in a nested comment
            if (!userLink) {
                const allLinks = wrapper.querySelectorAll('a[href^="/@"]');
                // Get the first one that looks like a username link (near the top of the comment)
                for (const link of allLinks) {
                    // Skip if it's in a nested reply container
                    const replyContainer = link.closest('[class*="ReplyContainer"]');
                    if (replyContainer && replyContainer !== wrapper) continue;
                    userLink = link;
                    break;
                }
            }

            if (!userLink) return;

            const username = extractUsername(userLink.getAttribute('href'));
            if (!username) return;

            // Don't add button if already blocked
            const url = buildProfileUrl(username);

            // Create block button
            const btn = createBlockButton(username, 'commenter');

            // Find the best place to insert the button
            // Strategy 1: After the username in the header area
            const usernameWrapper = wrapper.querySelector('[data-e2e="comment-username-1"]') ||
                                   wrapper.querySelector('[class*="DivUsernameContentWrapper"]') ||
                                   wrapper.querySelector('[class*="CommentHeaderWrapper"]');

            if (usernameWrapper) {
                // Check if there's a "more" menu next to it - insert before that
                const moreMenu = usernameWrapper.querySelector('[class*="DivMore"]');
                if (moreMenu) {
                    moreMenu.insertAdjacentElement('beforebegin', btn);
                } else {
                    usernameWrapper.appendChild(btn);
                }
                return;
            }

            // Strategy 2: Next to the user link's parent container
            const linkContainer = userLink.closest('[class*="TriggerWrapper"]') || userLink.parentElement;
            if (linkContainer && linkContainer.parentElement) {
                linkContainer.parentElement.insertBefore(btn, linkContainer.nextSibling);
                return;
            }

            // Strategy 3: After the user link itself
            userLink.insertAdjacentElement('afterend', btn);
        });

        // Also try to find comments in a different structure (video detail page)
        scanVideoPageComments();
    }

    function scanVideoPageComments() {
        // Look for the comment panel on video detail pages
        const commentPanel = document.querySelector('[class*="DivCommentMain"], [class*="CommentContainer"]');
        if (!commentPanel) return;

        // Find all profile links in comments
        const profileLinks = commentPanel.querySelectorAll('a[href^="/@"]');

        profileLinks.forEach(link => {
            // Skip if already processed
            if (link.dataset.ttBlockProcessed) return;
            link.dataset.ttBlockProcessed = 'true';

            // Find the parent comment container
            const commentContainer = link.closest('[class*="DivCommentObjectWrapper"], [class*="DivCommentItemWrapper"]');
            if (!commentContainer) return;

            // Skip if already has button
            if (commentContainer.querySelector('.tt-block-commenter-btn')) return;

            const username = extractUsername(link.getAttribute('href'));
            if (!username) return;

            // Only add to profile links that are usernames (not @ mentions in text)
            const isInHeader = link.closest('[class*="Header"], [class*="Username"], [data-e2e*="username"]');
            if (!isInHeader) return;

            const btn = createBlockButton(username, 'commenter');
            link.insertAdjacentElement('afterend', btn);
        });
    }

    function createBlockButton(username, type) {
        const btn = document.createElement('button');
        btn.className = `tt-block-${type}-btn`;
        btn.innerText = '🚫';
        btn.title = `Block @${username}`;
        btn.dataset.username = username;

        const isBlocked = state.blockListUrls.has(buildProfileUrl(username));
        const isPending = state.blockQueue.some(q => q.username === username);

        let bgColor = CONFIG.colors.blockBtn;
        let text = '🚫';

        if (isBlocked) {
            bgColor = CONFIG.colors.blocked;
            text = '✓';
        } else if (isPending) {
            bgColor = CONFIG.colors.pending;
            text = '⏳';
        }

        btn.style.cssText = `
            background: ${bgColor};
            color: white;
            border: none;
            padding: 4px 8px;
            border-radius: 4px;
            cursor: ${isBlocked ? 'default' : 'pointer'};
            font-size: 12px;
            font-weight: bold;
            opacity: ${isBlocked ? '0.7' : '1'};
            transition: all 0.2s;
            min-width: 28px;
            height: 24px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            vertical-align: middle;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        `;

        btn.innerText = text;

        if (isBlocked || isPending) {
            btn.disabled = true;
        } else {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                queueBlock(username, type);
                btn.innerText = '⏳';
                btn.title = `Pending block: @${username}`;
                btn.style.background = CONFIG.colors.pending;
                btn.disabled = true;
            });

            btn.addEventListener('mouseenter', () => {
                if (!btn.disabled) {
                    btn.style.opacity = '0.8';
                    btn.style.transform = 'scale(1.1)';
                }
            });
            btn.addEventListener('mouseleave', () => {
                if (!btn.disabled) {
                    btn.style.opacity = '1';
                    btn.style.transform = 'scale(1)';
                }
            });
        }

        return btn;
    }

    function getPosterInfo(article) {
        // Try multiple strategies to find the poster's username
        let username = null;

        log('getPosterInfo: Starting search...');

        // Strategy 1: Look for profile link in creator info section (works for ads)
        // The class contains "DivCreatorInfoContainer" as a substring
        const creatorInfoSelectors = [
            '[class*="DivCreatorInfoContainer"]',
            '[class*="CreatorInfo"]',
            '[class*="e1td56050"]'  // Backup: use the emotion class
        ];

        for (const selector of creatorInfoSelectors) {
            const creatorInfo = article.querySelector(selector);
            if (creatorInfo) {
                log(`getPosterInfo: Found creator info with selector: ${selector}`);
                const profileLink = creatorInfo.querySelector('a[href^="/@"]');
                if (profileLink) {
                    username = extractUsername(profileLink.getAttribute('href'));
                    if (username) {
                        log(`getPosterInfo: Found username from creator info: ${username}`);
                        return { username, url: buildProfileUrl(username) };
                    }
                }
            }
        }

        // Strategy 2: Find ALL profile links in the article and use the first valid one
        const allProfileLinks = article.querySelectorAll('a[href^="/@"]');
        log(`getPosterInfo: Found ${allProfileLinks.length} profile links`);
        for (const link of allProfileLinks) {
            username = extractUsername(link.getAttribute('href'));
            if (username) {
                log(`getPosterInfo: Found username from profile link: ${username}`);
                return { username, url: buildProfileUrl(username) };
            }
        }

        // Strategy 3: Check video-author-avatar link (only if it's a TikTok profile)
        const avatarLink = article.querySelector('a[data-e2e="video-author-avatar"]');
        if (avatarLink) {
            const href = avatarLink.getAttribute('href');
            log(`getPosterInfo: Avatar link href: ${href}`);
            if (href && href.startsWith('/@')) {
                username = extractUsername(href);
                if (username) {
                    log(`getPosterInfo: Found username from avatar link: ${username}`);
                    return { username, url: buildProfileUrl(username) };
                }
            }
        }

        // Strategy 4: Look for username in avatar alt text
        const avatarImg = article.querySelector('img[class*="Avatar"], img[class*="ImgAvatar"]');
        if (avatarImg) {
            const alt = avatarImg.getAttribute('alt');
            log(`getPosterInfo: Avatar alt text: ${alt}`);
            if (alt && alt.length < 50 && !alt.includes(' ')) {
                // Looks like a username
                log(`getPosterInfo: Using avatar alt as username: ${alt}`);
                return { username: alt, url: buildProfileUrl(alt) };
            }
        }

        // Strategy 5: Look for username text in TUXText elements near the creator area
        const textElements = article.querySelectorAll('[class*="StyledTUXText"] p, [class*="TUXText"]');
        for (const el of textElements) {
            const text = el.innerText?.trim();
            // Username criteria: no spaces, reasonable length, not a number-only string
            if (text && text.length > 0 && text.length < 30 && !text.includes(' ') && !/^\d+$/.test(text)) {
                // Check if parent is in creator info area
                const parentCreator = el.closest('[class*="CreatorInfo"], [class*="DivCreatorInfoContainer"]');
                if (parentCreator) {
                    log(`getPosterInfo: Found username from text element: ${text}`);
                    return { username: text, url: buildProfileUrl(text) };
                }
            }
        }

        log('getPosterInfo: Could not find poster info');
        return null;
    }

    // ==================== DOWNLOAD FUNCTIONALITY ====================
    function getPageType() {
        const path = window.location.pathname;
        if (path === '/' || path.startsWith('/foryou')) return 'FORYOU';
        if (path.startsWith('/video/') || (path.includes('/video/') && path.startsWith('/@'))) return 'VIDEO';
        if (path.startsWith('/explore')) return 'EXPLORE';
        if (path.startsWith('/@')) return 'USER';
        return 'UNKNOWN';
    }

    function showDownloadToast(msg, type = 'info') {
        const t = document.createElement('div');
        t.className = `ttd-toast ${type}`;
        t.innerHTML = `${type === 'error' ? DOWNLOAD_ICONS.error : (type === 'success' ? DOWNLOAD_ICONS.check : DOWNLOAD_ICONS.loading)}<span>${msg}</span>`;
        document.body.appendChild(t);
        t.offsetHeight;
        setTimeout(() => t.classList.add('visible'), 10);
        setTimeout(() => {
            t.classList.remove('visible');
            setTimeout(() => t.remove(), 400);
        }, 3000);
    }

    function findVideoContainer(el) {
        return el.closest('[data-e2e="recommend-list-item-container"]') ||
            el.closest('[data-e2e="feed-video"]') ||
            el.closest('div[class*="DivItemContainer"]') ||
            el.closest('div[class*="DivContentContainer"]') ||
            el.closest('div[role="article"]') ||
            el.closest('article');
    }

    function findVideoId(el) {
        if (getPageType() === 'VIDEO') {
            const match = window.location.pathname.match(/video\/(\d+)/);
            if (match) return match[1];
        }

        let link = el.tagName === 'A' ? el : el.querySelector('a[href*="/video/"]');
        if (link) {
            const match = link.href.match(/video\/(\d+)/);
            if (match) return match[1];
        }

        const container = findVideoContainer(el);
        if (container) {
            link = container.querySelector('a[href*="/video/"]');
            if (link) {
                const match = link.href.match(/video\/(\d+)/);
                if (match) return match[1];
            }
            const xg = container.querySelector('[id*="xgwrapper"]');
            if (xg) {
                const parts = xg.id.split('-');
                const vid = parts[parts.length - 1];
                if (/^\d+$/.test(vid)) return vid;
            }
        }

        let parent = el.closest('[id*="xgwrapper"]');
        if (parent) {
            const parts = parent.id.split('-');
            const vid = parts[parts.length - 1];
            if (/^\d+$/.test(vid)) return vid;
        }

        return null;
    }

    function findVideoAuthor(el) {
        if (getPageType() === 'VIDEO') {
            const match = window.location.pathname.match(/@([\w\.]+)/);
            if (match) return match[1];
        }

        const container = findVideoContainer(el);
        if (container) {
            const authorEl = container.querySelector('[data-e2e="video-author-uniqueid"]');
            if (authorEl) return authorEl.textContent.trim();

            const link = container.querySelector('a[href^="/@"]');
            if (link) {
                const match = link.href.match(/@([\w\.]+)/);
                if (match) return match[1];
            }
        }

        const link = el.closest('a[href^="/@"]');
        if (link) {
            const match = link.href.match(/@([\w\.]+)/);
            if (match) return match[1];
        }

        return null;
    }

    function constructVideoUrl(el) {
        const vid = findVideoId(el);
        const author = findVideoAuthor(el);

        if (vid && author) {
            return `https://www.tiktok.com/@${author}/video/${vid}`;
        }

        const container = findVideoContainer(el);
        if (container) {
            const link = container.querySelector('a[href*="/video/"]');
            if (link) return link.href;
        }

        if (window.location.href.includes('/video/')) return window.location.href;
        return null;
    }

    async function processVideoDownload(type, el, btn) {
        const url = constructVideoUrl(el);
        const author = findVideoAuthor(el) || 'Unknown';
        const vid = findVideoId(el) || Date.now();

        if (!url) {
            showDownloadToast('Could not find video URL', 'error');
            return;
        }

        if (type === 'copy') {
            GM_setClipboard(url);
            showDownloadToast('Link copied to clipboard!', 'success');
            return;
        }

        btn.classList.add('loading');
        const originalContent = btn.innerHTML;

        try {
            const res = await new Promise((resolve, reject) => {
                GM_xmlhttpRequest({
                    method: 'GET',
                    url: DOWNLOAD_API_URL + encodeURIComponent(url),
                    onload: (r) => {
                        if (r.status === 200) resolve(JSON.parse(r.responseText));
                        else reject(new Error('API Error'));
                    },
                    onerror: reject
                });
            });

            if (res && res.data) {
                let targetUrl = res.data.play || res.data.download_url;

                if (targetUrl) {
                    const safeAuthor = author.replace(/[<>:"/\\|?*]/g, '_');
                    const filename = `TikTok - @${safeAuthor} - ${vid}.mp4`;

                    if (typeof GM_download !== 'undefined') {
                        showDownloadToast('Downloading video...', 'info');
                        GM_download({
                            url: targetUrl,
                            name: filename,
                            onload: () => showDownloadToast('Download finished!', 'success'),
                            onerror: (e) => {
                                console.error(e);
                                window.open(targetUrl, '_blank');
                                showDownloadToast('Download started in tab', 'success');
                            }
                        });
                    } else {
                        window.open(targetUrl, '_blank');
                        showDownloadToast('Opened in new tab', 'success');
                    }
                } else {
                    showDownloadToast('Video not found', 'error');
                }
            } else {
                showDownloadToast('Failed to fetch info', 'error');
            }
        } catch (e) {
            console.error(e);
            showDownloadToast('Error downloading', 'error');
        } finally {
            btn.classList.remove('loading');
            btn.innerHTML = DOWNLOAD_ICONS.download;
        }
    }

    // ==================== AUTO-DOWNLOAD FUNCTIONALITY ====================
    async function autoDownloadCurrentVideo() {
        if (!state.features.autoDownload) return;

        const currentUrl = window.location.href;

        // Only process video URLs
        if (!currentUrl.includes('/video/')) return;

        // Check if we already downloaded this video
        if (state.downloadedVideos.has(currentUrl)) {
            log('Video already downloaded this session:', currentUrl);
            return;
        }

        // Extract video info from URL
        const videoIdMatch = currentUrl.match(/\/video\/(\d+)/);
        if (!videoIdMatch) return;

        const videoId = videoIdMatch[1];

        // Find author from page
        let author = 'Unknown';
        const authorMatch = currentUrl.match(/\/@([^/]+)/);
        if (authorMatch) {
            author = authorMatch[1];
        } else {
            // Try to find from page elements
            const authorEl = document.querySelector('[data-e2e="browse-username"], [data-e2e="video-author-uniqueid"]');
            if (authorEl) {
                author = authorEl.textContent.replace('@', '').trim();
            }
        }

        log(`Auto-downloading video: @${author} - ${videoId}`);
        state.downloadedVideos.add(currentUrl);
        state.lastDownloadedUrl = currentUrl;

        try {
            const res = await new Promise((resolve, reject) => {
                GM_xmlhttpRequest({
                    method: 'GET',
                    url: DOWNLOAD_API_URL + encodeURIComponent(currentUrl),
                    onload: (r) => {
                        if (r.status === 200) resolve(JSON.parse(r.responseText));
                        else reject(new Error('API Error'));
                    },
                    onerror: reject
                });
            });

            if (res && res.data) {
                let targetUrl = res.data.play || res.data.download_url;

                if (targetUrl) {
                    const safeAuthor = author.replace(/[<>:"/\\|?*]/g, '_');
                    const folder = state.downloadFolder ? `${state.downloadFolder}/` : '';
                    const filename = `${folder}TikTok - @${safeAuthor} - ${videoId}.mp4`;

                    if (typeof GM_download !== 'undefined') {
                        showDownloadToast(`Auto-downloading @${author}...`, 'info');
                        GM_download({
                            url: targetUrl,
                            name: filename,
                            onload: () => {
                                showDownloadToast(`Downloaded: @${author}`, 'success');
                                updateAutoDownloadCount();
                            },
                            onerror: (e) => {
                                console.error('[TT Blocker] Auto-download error:', e);
                                // Remove from set so it can be retried
                                state.downloadedVideos.delete(currentUrl);
                                showDownloadToast('Auto-download failed', 'error');
                            }
                        });
                    }
                }
            }
        } catch (e) {
            console.error('[TT Blocker] Auto-download error:', e);
            state.downloadedVideos.delete(currentUrl);
        }
    }

    function updateAutoDownloadCount() {
        const countEl = document.getElementById('stat-downloaded');
        if (countEl) {
            countEl.textContent = state.downloadedVideos.size;
        }
    }

    // Monitor URL changes for auto-download
    let lastCheckedUrl = '';
    function checkForNewVideo() {
        if (!state.features.autoDownload) return;

        const currentUrl = window.location.href;
        if (currentUrl !== lastCheckedUrl && currentUrl.includes('/video/')) {
            lastCheckedUrl = currentUrl;
            // Small delay to ensure page has loaded
            setTimeout(autoDownloadCurrentVideo, 1000);
        }
    }

    function createDownloadButton(container) {
        const wrapper = document.createElement('div');
        wrapper.className = 'ttd-download-wrapper';

        const btn = document.createElement('button');
        btn.className = 'ttd-download-btn';
        btn.innerHTML = DOWNLOAD_ICONS.download;
        btn.title = 'Download Video';

        const menu = document.createElement('div');
        menu.className = 'ttd-menu';

        const opts = [
            { id: 'video', icon: DOWNLOAD_ICONS.video, text: 'Download Video' },
            { id: 'copy', icon: DOWNLOAD_ICONS.copy, text: 'Copy Link' }
        ];

        opts.forEach((opt) => {
            const item = document.createElement('div');
            item.className = 'ttd-menu-item';
            item.innerHTML = `${opt.icon}<span>${opt.text}</span>`;
            item.onclick = (e) => {
                e.stopPropagation();
                processVideoDownload(opt.id, container, btn);
            };
            menu.appendChild(item);
        });

        btn.onclick = (e) => {
            e.stopPropagation();
            e.preventDefault();
            processVideoDownload('video', container, btn);
        };

        wrapper.appendChild(btn);
        wrapper.appendChild(menu);

        return wrapper;
    }

    function addDownloadButtons() {
        if (!state.features.downloadButton) return;

        const selectors = [
            '[data-e2e="share-icon"]',
            '[data-e2e="video-share-btn"]',
            '.share-action',
            'button[aria-label="Share"]'
        ];

        document.querySelectorAll(selectors.join(',')).forEach(shareEl => {
            const actionBar = shareEl.closest('[class*="DivActionItemContainer"]') ||
                shareEl.closest('.DivActionItemContainer') ||
                shareEl.parentElement;

            if (!actionBar) return;
            if (actionBar.querySelector('.ttd-download-wrapper')) return;

            const btn = createDownloadButton(actionBar);

            const shareWrapper = shareEl.closest('button') || shareEl;
            if (shareWrapper && shareWrapper.parentElement === actionBar) {
                actionBar.insertBefore(btn, shareWrapper.nextSibling);
            } else {
                actionBar.appendChild(btn);
            }
        });
    }

    // ==================== UI - DASHBOARD ====================
    function initDashboard() {
        GM_addStyle(`
            #tt-blocker-panel {
                position: fixed;
                top: 80px;
                right: 20px;
                width: 400px;
                max-height: 85vh;
                background: ${CONFIG.colors.panel};
                border-radius: 12px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.5);
                z-index: 99999;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                color: #fff;
                overflow: hidden;
                display: flex;
                flex-direction: column;
            }

            #tt-blocker-panel.minimized {
                width: auto;
                max-height: none;
            }

            #tt-blocker-panel.minimized .panel-body {
                display: none;
            }

            .panel-header {
                background: linear-gradient(135deg, #fe2c55, #25f4ee);
                padding: 12px 16px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                cursor: move;
                flex-shrink: 0;
            }

            .panel-header h3 {
                margin: 0;
                font-size: 16px;
                display: flex;
                align-items: center;
                gap: 8px;
            }

            .panel-toggle {
                background: rgba(255,255,255,0.2);
                border: none;
                color: white;
                width: 28px;
                height: 28px;
                border-radius: 50%;
                cursor: pointer;
                font-size: 14px;
            }

            .panel-body {
                padding: 12px;
                overflow-y: auto;
                flex: 1;
                min-height: 0;
            }

            .panel-body::-webkit-scrollbar {
                width: 6px;
            }

            .panel-body::-webkit-scrollbar-track {
                background: rgba(255,255,255,0.05);
                border-radius: 3px;
            }

            .panel-body::-webkit-scrollbar-thumb {
                background: rgba(255,255,255,0.2);
                border-radius: 3px;
            }

            .panel-body::-webkit-scrollbar-thumb:hover {
                background: rgba(255,255,255,0.3);
            }

            .stats-row {
                display: flex;
                gap: 8px;
                margin-bottom: 12px;
                flex-wrap: wrap;
            }

            .stat-box {
                background: rgba(255,255,255,0.1);
                padding: 8px 10px;
                border-radius: 8px;
                flex: 1;
                min-width: 60px;
                text-align: center;
            }

            .stat-box .value {
                font-size: 18px;
                font-weight: bold;
                color: #25f4ee;
            }

            .stat-box .label {
                font-size: 10px;
                color: rgba(255,255,255,0.7);
                margin-top: 2px;
            }

            .controls-row {
                display: flex;
                gap: 8px;
                margin-bottom: 12px;
                flex-wrap: wrap;
            }

            .tt-btn {
                flex: 1;
                padding: 8px 12px;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                font-size: 12px;
                font-weight: bold;
                transition: all 0.2s;
                min-width: 70px;
            }

            .tt-btn:hover {
                opacity: 0.9;
                transform: translateY(-1px);
            }

            .tt-btn.primary {
                background: #fe2c55;
                color: white;
            }

            .tt-btn.secondary {
                background: rgba(255,255,255,0.15);
                color: white;
            }

            .tt-btn.success {
                background: #4CAF50;
                color: white;
            }

            .toggle-row {
                display: flex;
                align-items: center;
                gap: 10px;
                margin-bottom: 8px;
                padding: 8px;
                background: rgba(255,255,255,0.05);
                border-radius: 6px;
            }

            .toggle-switch {
                position: relative;
                width: 44px;
                height: 24px;
                background: #555;
                border-radius: 12px;
                cursor: pointer;
                transition: background 0.2s;
                flex-shrink: 0;
            }

            .toggle-switch.active {
                background: #4CAF50;
            }

            .toggle-switch::after {
                content: '';
                position: absolute;
                width: 20px;
                height: 20px;
                background: white;
                border-radius: 50%;
                top: 2px;
                left: 2px;
                transition: left 0.2s;
            }

            .toggle-switch.active::after {
                left: 22px;
            }

            .toggle-label {
                flex: 1;
                font-size: 13px;
            }

            .auto-skip-settings {
                background: rgba(255,255,255,0.05);
                border-radius: 6px;
                padding: 10px;
                margin-bottom: 12px;
            }

            .auto-skip-settings .section-title {
                font-size: 12px;
                font-weight: bold;
                color: #25f4ee;
                margin-bottom: 8px;
                display: flex;
                align-items: center;
                gap: 6px;
            }

            .timer-row {
                display: flex;
                align-items: center;
                gap: 8px;
                margin-top: 8px;
            }

            .timer-input {
                width: 60px;
                padding: 6px 8px;
                border: 1px solid rgba(255,255,255,0.2);
                border-radius: 4px;
                background: rgba(0,0,0,0.3);
                color: white;
                font-size: 14px;
                text-align: center;
            }

            .timer-input:focus {
                outline: none;
                border-color: #25f4ee;
            }

            .timer-label {
                font-size: 12px;
                color: rgba(255,255,255,0.7);
            }

            .countdown-display {
                background: rgba(37, 244, 238, 0.2);
                padding: 8px 12px;
                border-radius: 6px;
                text-align: center;
                font-size: 14px;
                font-weight: bold;
                color: #25f4ee;
                margin-top: 8px;
                display: none;
            }

            .timer-bar-container {
                height: 4px;
                background: rgba(255,255,255,0.1);
                border-radius: 2px;
                margin-top: 8px;
                overflow: hidden;
            }

            .timer-bar {
                height: 100%;
                background: linear-gradient(90deg, #25f4ee, #fe2c55);
                border-radius: 2px;
                transition: width 1s linear;
                display: none;
            }

            .action-btn {
                flex: 1;
                padding: 8px 4px;
                background: rgba(255,255,255,0.1);
                border: 1px solid rgba(255,255,255,0.2);
                border-radius: 6px;
                color: white;
                font-size: 11px;
                cursor: pointer;
                transition: all 0.2s;
            }

            .action-btn:hover {
                background: rgba(255,255,255,0.2);
                transform: scale(1.02);
            }

            .action-btn:active {
                transform: scale(0.98);
            }

            .skip-now-btn {
                width: 100%;
                padding: 8px;
                margin-top: 8px;
                background: linear-gradient(135deg, #fe2c55, #25f4ee);
                border: none;
                border-radius: 6px;
                color: white;
                font-weight: bold;
                cursor: pointer;
                font-size: 12px;
                transition: all 0.2s;
            }

            .skip-now-btn:hover {
                opacity: 0.9;
                transform: scale(1.02);
            }

            .status-bar {
                padding: 8px;
                background: rgba(255,255,255,0.05);
                border-radius: 6px;
                margin-bottom: 12px;
                font-size: 12px;
                text-align: center;
            }

            .table-container {
                max-height: 200px;
                overflow-y: auto;
                border-radius: 6px;
                background: rgba(0,0,0,0.2);
            }

            #dash-table {
                width: 100%;
                border-collapse: collapse;
                font-size: 11px;
            }

            #dash-table th {
                background: rgba(255,255,255,0.1);
                padding: 8px;
                text-align: left;
                position: sticky;
                top: 0;
            }

            #dash-table td {
                padding: 6px 8px;
                border-bottom: 1px solid rgba(255,255,255,0.05);
                max-width: 120px;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }

            #dash-table a {
                color: #25f4ee;
                text-decoration: none;
            }

            #dash-table a:hover {
                text-decoration: underline;
            }

            .status-pending { color: #ff9800; }
            .status-blocking { color: #2196F3; }
            .status-blocked { color: #4CAF50; }
            .status-failed { color: #f44336; }

            .tt-ad-tag {
                animation: pulse 1s infinite;
            }

            @keyframes pulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.7; }
            }

            /* Block button styles for comments */
            .tt-block-commenter-btn {
                background: #fe2c55 !important;
                color: white !important;
                border: none !important;
                padding: 2px 6px !important;
                border-radius: 4px !important;
                cursor: pointer !important;
                font-size: 10px !important;
                font-weight: bold !important;
                margin-left: 6px !important;
                vertical-align: middle !important;
                display: inline-flex !important;
                align-items: center !important;
                justify-content: center !important;
                min-width: 22px !important;
                height: 20px !important;
                line-height: 1 !important;
            }

            .tt-block-commenter-btn:hover {
                opacity: 0.8 !important;
                transform: scale(1.1);
            }

            .tt-block-poster-btn {
                background: #fe2c55 !important;
                color: white !important;
                border: none !important;
                border-radius: 4px !important;
                cursor: pointer !important;
                font-weight: bold !important;
            }

            .tt-block-poster-btn:hover {
                opacity: 0.8 !important;
            }

            /* Download Button Styles */
            .ttd-download-wrapper {
                display: flex;
                align-items: center;
                justify-content: center;
                margin-top: 8px;
                position: relative;
                z-index: 999;
            }

            .ttd-download-btn {
                width: 48px;
                height: 48px;
                border-radius: 50%;
                background: rgba(255, 255, 255, 0.08);
                border: 1px solid rgba(255, 255, 255, 0.12);
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
                color: white;
                position: relative;
                overflow: hidden;
            }

            .ttd-download-btn::before {
                content: '';
                position: absolute;
                inset: 0;
                background: linear-gradient(135deg, #fe2c55, #25f4ee);
                opacity: 0;
                transition: opacity 0.3s ease;
                z-index: 0;
            }

            .ttd-download-btn:hover {
                transform: translateY(-2px) scale(1.05);
                border-color: transparent;
                box-shadow: 0 0 20px rgba(254, 44, 85, 0.4);
            }

            .ttd-download-btn:hover::before {
                opacity: 1;
            }

            .ttd-download-btn svg {
                width: 24px;
                height: 24px;
                fill: currentColor;
                z-index: 1;
                filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));
                transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
            }

            .ttd-download-btn:hover svg {
                transform: rotate(-10deg) scale(1.1);
            }

            .ttd-download-btn.loading svg {
                animation: ttd-spin 0.8s linear infinite;
            }

            /* Download Hover Menu */
            .ttd-menu {
                position: absolute;
                bottom: calc(100% + 12px);
                left: 50%;
                transform: translateX(-50%) translateY(10px) scale(0.95);
                background: rgba(22, 24, 35, 0.9);
                backdrop-filter: blur(16px);
                border-radius: 12px;
                box-shadow: 0 12px 40px rgba(0,0,0,0.25);
                padding: 8px;
                width: 160px;
                opacity: 0;
                visibility: hidden;
                transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
                pointer-events: none;
                border: 1px solid rgba(255, 255, 255, 0.08);
                display: flex;
                flex-direction: column;
                gap: 4px;
            }

            .ttd-menu::before {
                content: '';
                position: absolute;
                top: 100%;
                left: 0;
                width: 100%;
                height: 16px;
            }

            .ttd-download-wrapper:hover .ttd-menu {
                opacity: 1;
                visibility: visible;
                transform: translateX(-50%) translateY(0) scale(1);
                pointer-events: auto;
            }

            .ttd-menu-item {
                display: flex;
                align-items: center;
                gap: 10px;
                padding: 10px 12px;
                font-size: 13px;
                font-weight: 600;
                cursor: pointer;
                color: rgba(255, 255, 255, 0.9);
                border-radius: 8px;
                transition: all 0.2s;
            }

            .ttd-menu-item:hover {
                background: rgba(255, 255, 255, 0.1);
                color: white;
                transform: translateX(4px);
            }

            .ttd-menu-item svg {
                width: 18px;
                height: 18px;
                stroke: currentColor;
                stroke-width: 2;
                fill: none;
            }

            @keyframes ttd-spin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
            }

            /* Download Toast */
            .ttd-toast {
                position: fixed;
                top: 32px;
                left: 50%;
                transform: translateX(-50%) translateY(-20px);
                background: rgba(22, 24, 35, 0.9);
                backdrop-filter: blur(20px);
                color: white;
                padding: 12px 24px;
                border-radius: 50px;
                font-size: 14px;
                font-weight: 600;
                z-index: 100000;
                transition: all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
                display: flex;
                align-items: center;
                gap: 12px;
                box-shadow: 0 10px 40px rgba(0,0,0,0.4);
                border: 1px solid rgba(255,255,255,0.08);
                opacity: 0;
                pointer-events: none;
            }

            .ttd-toast.visible {
                transform: translateX(-50%) translateY(0);
                opacity: 1;
            }

            .ttd-toast svg { width: 20px; height: 20px; }
            .ttd-toast.success svg { fill: #00e676; stroke: #00e676; }
            .ttd-toast.error svg { fill: #ff1744; stroke: #ff1744; }
            .ttd-toast.info svg { fill: #2979ff; stroke: #2979ff; }

            /* Tab styles */
            .tt-tabs { display: flex; gap: 4px; margin-bottom: 12px; position: sticky; top: 0; background: ${CONFIG.colors.panel}; padding: 4px 0; z-index: 10; }
            .tt-tab { flex: 1; padding: 8px 4px; background: rgba(255,255,255,0.05); border: none; border-radius: 6px; cursor: pointer; font-size: 11px; color: rgba(255,255,255,0.6); transition: all 0.2s; }
            .tt-tab:hover { background: rgba(255,255,255,0.1); }
            .tt-tab.active { background: rgba(254,44,85,0.3); color: white; }
            .tt-tab-content { display: none; }
            .tt-tab-content.active { display: block; }

            /* GitHub section styles */
            /* Settings section styles */
            .settings-section { margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid rgba(255,255,255,0.1); }
            .settings-section:last-child { border-bottom: none; margin-bottom: 0; }
            .settings-header { margin: 0 0 10px 0; font-size: 11px; color: #25f4ee; font-weight: 600; }

            .github-section { padding: 8px; }
            .github-section h4 { margin: 0 0 8px 0; font-size: 12px; color: white; }
            .github-info { font-size: 10px; color: rgba(255,255,255,0.5); margin-bottom: 12px; }
            .github-fields { margin: 12px 0; }
            .github-fields.disabled { opacity: 0.5; pointer-events: none; }
            .gh-field { margin-bottom: 10px; }
            .gh-field label { display: block; font-size: 10px; color: rgba(255,255,255,0.6); margin-bottom: 4px; }
            .gh-field input { width: 100%; padding: 8px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); border-radius: 6px; color: white; font-size: 11px; box-sizing: border-box; }
            .gh-field input::placeholder { color: rgba(255,255,255,0.3); }
            .sync-status { background: rgba(0,0,0,0.2); padding: 8px; border-radius: 6px; margin-bottom: 10px; font-size: 11px; }
            .sync-progress { height: 4px; background: rgba(255,255,255,0.1); border-radius: 2px; margin-top: 6px; overflow: hidden; }
            .sync-bar { height: 100%; background: linear-gradient(90deg, #fe2c55, #25f4ee); border-radius: 2px; transition: width 0.3s; }
            .gh-btn { display: block; width: 100%; padding: 8px; margin-top: 8px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.15); border-radius: 6px; cursor: pointer; font-size: 11px; color: white; transition: all 0.2s; }
            .gh-btn:hover { background: rgba(255,255,255,0.15); }
            .gh-btn.primary { background: linear-gradient(135deg, #fe2c55, #25f4ee); border: none; }
            .gh-btn.primary:hover { opacity: 0.9; }

            /* Toast styles */
            .tt-toast { position: fixed; bottom: 20px; right: 20px; background: #1a1a2e; border: 1px solid rgba(255,255,255,0.1); padding: 10px 16px; border-radius: 8px; display: flex; align-items: center; gap: 8px; font-size: 12px; color: white; opacity: 0; transform: translateY(20px); transition: all 0.3s; z-index: 999999; }
            .tt-toast.visible { opacity: 1; transform: translateY(0); }
            .tt-toast.success { border-color: #4CAF50; }
            .tt-toast.error { border-color: #fa3e3e; }
            .tt-toast.warning { border-color: #f7b928; }
        `);

        const panel = document.createElement('div');
        panel.id = 'tt-blocker-panel';
        panel.innerHTML = `
            <div class="panel-header">
                <h3>🚫 TikTok AdNull v2.3.1</h3>
                <button class="panel-toggle" id="panel-toggle">−</button>
            </div>
            <div class="panel-body">
                <div class="tt-tabs">
                    <button class="tt-tab active" data-tab="main">Main</button>
                    <button class="tt-tab" data-tab="skip">Skip</button>
                    <button class="tt-tab" data-tab="settings">Settings</button>
                    <button class="tt-tab" data-tab="github">GitHub</button>
                </div>

                <div id="tab-main" class="tt-tab-content active">
                    <div class="stats-row">
                        <div class="stat-box">
                            <div class="value" id="stat-total">0</div>
                            <div class="label">Blocked</div>
                        </div>
                        <div class="stat-box">
                            <div class="value" id="stat-session">0</div>
                            <div class="label">Session</div>
                        </div>
                        <div class="stat-box">
                            <div class="value" id="stat-ads">0</div>
                            <div class="label">Ads</div>
                        </div>
                        <div class="stat-box">
                            <div class="value" id="stat-queue">0</div>
                            <div class="label">Queue</div>
                        </div>
                    </div>

                    <div class="status-bar" id="dash-status">✓ Ready</div>

                    <div class="table-container">
                        <table id="dash-table">
                            <thead>
                                <tr>
                                    <th>Username</th>
                                    <th>Source</th>
                                    <th>Status</th>
                                    <th>Time</th>
                                </tr>
                            </thead>
                            <tbody></tbody>
                        </table>
                    </div>
                </div>

                <div id="tab-skip" class="tt-tab-content">
                    <div class="auto-skip-settings" style="margin-bottom: 0;">
                        <div class="section-title">⏱️ Auto-Skip Controls</div>

                        <div class="timer-row">
                            <span class="timer-label">Skip every</span>
                            <input type="number" class="timer-input" id="skip-interval" value="${state.autoSkipInterval}" min="${CONFIG.autoSkip.minInterval}" max="${CONFIG.autoSkip.maxInterval}">
                            <span class="timer-label">seconds</span>
                        </div>

                        <div class="countdown-display" id="auto-skip-countdown">Next skip in: --s</div>

                        <div class="timer-bar-container">
                            <div class="timer-bar" id="auto-skip-timer-bar"></div>
                        </div>

                        <div class="action-buttons-row" style="display: flex; gap: 8px; margin: 12px 0;">
                            <button class="action-btn" id="btn-like" title="Like Video">❤️ Like</button>
                            <button class="action-btn" id="btn-download-action" title="Download Video">📥 Download</button>
                            <button class="action-btn" id="btn-save" title="Save to Favorites">🔖 Save</button>
                        </div>

                        <button class="skip-now-btn" id="btn-skip-now">⏭️ Skip Now</button>

                        <p style="font-size: 10px; color: rgba(255,255,255,0.5); margin-top: 8px; text-align: center;">
                            💡 Skip goes to For You and opens comments
                        </p>
                    </div>

                    <div style="margin-top: 12px; text-align: center;">
                        <div class="stat-box" style="display: inline-block; min-width: 100px;">
                            <div class="value" id="stat-skipped">0</div>
                            <div class="label">Videos Skipped</div>
                        </div>
                    </div>
                </div>

                <div id="tab-settings" class="tt-tab-content">
                    <div class="settings-section">
                        <h4 class="settings-header">🎯 Blocking Features</h4>
                        <div class="toggle-row">
                            <div class="toggle-switch ${state.features.autoBlockAds ? 'active' : ''}" id="toggle-autoBlockAds"></div>
                            <span class="toggle-label">Auto-block ad posters</span>
                        </div>
                        <div class="toggle-row">
                            <div class="toggle-switch ${state.features.blockButtons ? 'active' : ''}" id="toggle-blockButtons"></div>
                            <span class="toggle-label">Show block buttons</span>
                        </div>
                        <div class="toggle-row">
                            <div class="toggle-switch ${state.features.feedFiltering ? 'active' : ''}" id="toggle-feedFiltering"></div>
                            <span class="toggle-label">Hide blocked users in feed</span>
                        </div>
                        <div class="toggle-row">
                            <div class="toggle-switch ${state.features.sidebarFiltering ? 'active' : ''}" id="toggle-sidebarFiltering"></div>
                            <span class="toggle-label">Hide blocked from sidebar</span>
                        </div>
                        <div class="toggle-row">
                            <div class="toggle-switch ${state.features.liveStreamBlocking ? 'active' : ''}" id="toggle-liveStreamBlocking"></div>
                            <span class="toggle-label">Hide blocked live streams</span>
                        </div>
                    </div>

                    <div class="settings-section">
                        <h4 class="settings-header">⏭️ Skip Features</h4>
                        <div class="toggle-row">
                            <div class="toggle-switch ${state.features.autoSkipOnAd ? 'active' : ''}" id="toggle-autoSkipOnAd"></div>
                            <span class="toggle-label">Auto-skip when ad detected</span>
                        </div>
                        <div class="toggle-row">
                            <div class="toggle-switch ${state.features.autoSkipTimer ? 'active' : ''}" id="toggle-autoSkipTimer"></div>
                            <span class="toggle-label">Timed auto-skip</span>
                        </div>
                    </div>

                    <div class="settings-section">
                        <h4 class="settings-header">🎬 Video Features</h4>
                        <div class="toggle-row">
                            <div class="toggle-switch ${state.features.downloadButton ? 'active' : ''}" id="toggle-downloadButton"></div>
                            <span class="toggle-label">Show download button</span>
                        </div>
                        <div class="toggle-row">
                            <div class="toggle-switch ${state.features.autoDownload ? 'active' : ''}" id="toggle-autoDownload"></div>
                            <span class="toggle-label">Auto-download all videos</span>
                        </div>
                        <div class="download-folder-setting" style="margin: 8px 0; padding: 8px; background: rgba(255,255,255,0.05); border-radius: 6px;">
                            <label style="display: block; font-size: 10px; color: rgba(255,255,255,0.6); margin-bottom: 4px;">Download Folder:</label>
                            <input type="text" id="download-folder" value="${state.downloadFolder}" placeholder="TikTok" style="width: 100%; padding: 6px 8px; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.2); border-radius: 4px; color: white; font-size: 11px; box-sizing: border-box;">
                            <p style="font-size: 9px; color: rgba(255,255,255,0.4); margin: 4px 0 0 0;">Subfolder in your Downloads directory</p>
                        </div>
                        <div class="auto-download-stats" style="display: flex; align-items: center; gap: 8px; font-size: 11px; color: rgba(255,255,255,0.7);">
                            <span>Session downloads: <strong id="stat-downloaded" style="color: #25f4ee;">${state.downloadedVideos.size}</strong></span>
                        </div>
                        <div class="toggle-row">
                            <div class="toggle-switch ${state.features.backgroundPlay ? 'active' : ''}" id="toggle-backgroundPlay"></div>
                            <span class="toggle-label">Background play</span>
                        </div>
                    </div>

                    <div class="settings-section">
                        <h4 class="settings-header">⚙️ Other Features</h4>
                        <div class="toggle-row">
                            <div class="toggle-switch ${state.features.keyboardShortcuts ? 'active' : ''}" id="toggle-keyboardShortcuts"></div>
                            <span class="toggle-label">Keyboard navigation</span>
                        </div>
                        <p style="font-size: 9px; color: rgba(255,255,255,0.4); margin: -4px 0 8px 52px;">Disable when typing comments</p>
                        <div class="toggle-row">
                            <div class="toggle-switch ${state.features.autoRetryOnError ? 'active' : ''}" id="toggle-autoRetryOnError"></div>
                            <span class="toggle-label">Auto-retry on errors</span>
                        </div>
                        <div class="toggle-row">
                            <div class="toggle-switch ${state.features.githubAutoSync ? 'active' : ''}" id="toggle-githubAutoSync"></div>
                            <span class="toggle-label">GitHub auto-sync</span>
                        </div>
                    </div>

                    <div class="settings-section">
                        <h4 class="settings-header">📁 Data Management</h4>
                        <div class="controls-row" style="margin-bottom: 8px;">
                            <button class="tt-btn primary" id="btn-export">📤 Export</button>
                            <button class="tt-btn secondary" id="btn-import">📥 Import</button>
                        </div>
                        <input type="file" id="import-file" accept=".csv" style="display:none;">
                        <button class="tt-btn secondary" id="btn-foundation" style="margin-bottom: 8px;">🔄 Import Foundation List</button>
                        <button class="tt-btn secondary" id="btn-clear" style="background: rgba(250,62,62,0.2); border-color: rgba(250,62,62,0.4);">🗑️ Clear Block List</button>
                    </div>
                </div>

                <div id="tab-github" class="tt-tab-content">
                    <div class="github-section">
                        <h4>☁️ GitHub Sync</h4>
                        <p class="github-info">Backup your blocklist to GitHub. Auto-syncs every ${state.githubConfig.syncThreshold} new blocks.</p>

                        <div class="sync-status">
                            <span>Progress: <strong id="sync-counter">${state.blocksSinceLastSync}</strong> / ${state.githubConfig.syncThreshold}</span>
                            <div class="sync-progress">
                                <div class="sync-bar" id="sync-bar" style="width: ${Math.min(100, (state.blocksSinceLastSync / state.githubConfig.syncThreshold) * 100)}%"></div>
                            </div>
                        </div>

                        <div class="toggle-row" style="padding: 6px 0;">
                            <div class="toggle-switch ${state.githubConfig.syncEnabled ? 'active' : ''}" id="toggle-github"></div>
                            <span class="toggle-label">Enable GitHub Sync</span>
                        </div>

                        <div class="github-fields ${state.githubConfig.syncEnabled ? '' : 'disabled'}" id="github-fields">
                            <div class="gh-field">
                                <label>Token (PAT):</label>
                                <input type="password" id="github-token" value="${state.githubConfig.token}" placeholder="ghp_xxxx...">
                            </div>
                            <div class="gh-field">
                                <label>Repository:</label>
                                <input type="text" id="github-repo" value="${state.githubConfig.repo}" placeholder="username/repo">
                            </div>
                            <div class="gh-field">
                                <label>File Path:</label>
                                <input type="text" id="github-path" value="${state.githubConfig.path}" placeholder="tiktok_blocklist.csv">
                            </div>
                            <div class="gh-field">
                                <label>Branch:</label>
                                <input type="text" id="github-branch" value="${state.githubConfig.branch}" placeholder="main">
                            </div>
                        </div>

                        <button class="gh-btn" id="btn-github-save">💾 Save Settings</button>
                        <button class="gh-btn" id="btn-github-test">🔌 Test Connection</button>
                        <button class="gh-btn primary" id="btn-github-sync">☁️ Sync Now</button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(panel);

        // Event listeners
        document.getElementById('panel-toggle').onclick = () => {
            panel.classList.toggle('minimized');
            document.getElementById('panel-toggle').textContent =
                panel.classList.contains('minimized') ? '+' : '−';
        };

        // Helper function to create feature toggle handlers
        function setupFeatureToggle(elementId, featureName, callback) {
            const el = document.getElementById(elementId);
            if (el) {
                el.onclick = function() {
                    state.features[featureName] = !state.features[featureName];
                    this.classList.toggle('active', state.features[featureName]);
                    saveSettings();
                    log(`${featureName}: ${state.features[featureName]}`);
                    if (callback) callback(state.features[featureName]);
                };
            }
        }

        // Setup all feature toggles
        setupFeatureToggle('toggle-autoBlockAds', 'autoBlockAds');
        setupFeatureToggle('toggle-blockButtons', 'blockButtons');
        setupFeatureToggle('toggle-feedFiltering', 'feedFiltering');
        setupFeatureToggle('toggle-sidebarFiltering', 'sidebarFiltering');
        setupFeatureToggle('toggle-liveStreamBlocking', 'liveStreamBlocking');
        setupFeatureToggle('toggle-autoSkipOnAd', 'autoSkipOnAd');
        setupFeatureToggle('toggle-autoSkipTimer', 'autoSkipTimer', (enabled) => {
            if (enabled) {
                startAutoSkip();
            } else {
                stopAutoSkip();
            }
        });
        setupFeatureToggle('toggle-downloadButton', 'downloadButton');
        setupFeatureToggle('toggle-autoDownload', 'autoDownload', (enabled) => {
            if (enabled) {
                showToast('Auto-download enabled - videos will download as you scroll', 'success');
                // Start monitoring immediately
                checkForNewVideo();
            } else {
                showToast('Auto-download disabled', 'info');
            }
        });
        setupFeatureToggle('toggle-backgroundPlay', 'backgroundPlay');
        setupFeatureToggle('toggle-autoRetryOnError', 'autoRetryOnError');
        setupFeatureToggle('toggle-keyboardShortcuts', 'keyboardShortcuts', (enabled) => {
            if (enabled) {
                showToast('Keyboard navigation enabled', 'success');
            } else {
                showToast('Keyboard navigation disabled - safe to type comments', 'info');
            }
        });
        setupFeatureToggle('toggle-githubAutoSync', 'githubAutoSync');

        // Download folder setting
        document.getElementById('download-folder').onchange = function() {
            state.downloadFolder = this.value.trim().replace(/[<>:"|?*]/g, '_');
            this.value = state.downloadFolder;
            saveSettings();
            showToast(`Download folder set to: ${state.downloadFolder || 'Downloads root'}`, 'success');
        };

        document.getElementById('skip-interval').onchange = function() {
            let val = parseInt(this.value);
            if (isNaN(val) || val < CONFIG.autoSkip.minInterval) val = CONFIG.autoSkip.minInterval;
            if (val > CONFIG.autoSkip.maxInterval) val = CONFIG.autoSkip.maxInterval;
            this.value = val;
            state.autoSkipInterval = val;
            saveSettings();

            // Restart timer if running
            if (state.features.autoSkipTimer) {
                startAutoSkip();
            }
        };

        document.getElementById('btn-skip-now').onclick = () => {
            skipToForYouAndOpenComments();
            resetAutoSkipTimer();
        };

        // Action buttons
        document.getElementById('btn-like').onclick = () => {
            clickLikeButton();
        };

        document.getElementById('btn-download-action').onclick = () => {
            clickVideoDownloadButton();
        };

        document.getElementById('btn-save').onclick = () => {
            clickSaveButton();
        };

        document.getElementById('btn-export').onclick = exportBlockList;

        document.getElementById('btn-import').onclick = () => {
            document.getElementById('import-file').click();
        };

        document.getElementById('import-file').onchange = function() {
            if (this.files.length > 0) {
                importBlockList(this.files[0]);
                this.value = '';
            }
        };

        document.getElementById('btn-clear').onclick = () => {
            if (confirm('Clear entire block list? This cannot be undone.')) {
                state.blockList = [];
                state.blockListUrls.clear();
                state.totalBlocked = 0;
                saveBlockList();
                document.querySelector('#dash-table tbody').innerHTML = '';
                updateDashboardCounts();
                log('Block list cleared');
            }
        };

        // Tab switching
        panel.querySelectorAll('.tt-tab').forEach(tab => {
            tab.onclick = () => {
                panel.querySelectorAll('.tt-tab').forEach(t => t.classList.remove('active'));
                panel.querySelectorAll('.tt-tab-content').forEach(c => c.classList.remove('active'));
                tab.classList.add('active');
                document.getElementById(`tab-${tab.dataset.tab}`).classList.add('active');
            };
        });

        // Foundation import
        document.getElementById('btn-foundation').onclick = () => importFoundation(true);

        // GitHub event handlers
        document.getElementById('toggle-github').onclick = function() {
            state.githubConfig.syncEnabled = !state.githubConfig.syncEnabled;
            this.classList.toggle('active', state.githubConfig.syncEnabled);
            document.getElementById('github-fields').classList.toggle('disabled', !state.githubConfig.syncEnabled);
            saveGithubConfig();
        };

        document.getElementById('btn-github-save').onclick = () => {
            state.githubConfig.token = document.getElementById('github-token').value.trim();
            state.githubConfig.repo = document.getElementById('github-repo').value.trim();
            state.githubConfig.path = document.getElementById('github-path').value.trim() || 'tiktok_blocklist.csv';
            state.githubConfig.branch = document.getElementById('github-branch').value.trim() || 'main';

            console.log('[TT Blocker] Saving GitHub config:');
            console.log('[TT Blocker] Token length:', state.githubConfig.token.length);
            console.log('[TT Blocker] Repo:', state.githubConfig.repo);
            console.log('[TT Blocker] Path:', state.githubConfig.path);
            console.log('[TT Blocker] Branch:', state.githubConfig.branch);

            saveGithubConfig();
            showToast('GitHub settings saved', 'success');
        };

        document.getElementById('btn-github-test').onclick = () => {
            // Save first, then test
            document.getElementById('btn-github-save').click();
            setTimeout(testGitHubToken, 100);
        };

        document.getElementById('btn-github-sync').onclick = () => {
            // Save first, then sync
            document.getElementById('btn-github-save').click();
            setTimeout(() => syncToGitHub(), 100);
        };

        // Make panel draggable
        makeDraggable(panel, panel.querySelector('.panel-header'));

        // Populate table with existing blocked profiles
        refreshDashboardTable();
        updateDashboardCounts();

        // Start auto-skip if it was enabled
        if (state.features.autoSkipTimer) {
            startAutoSkip();
        }
    }

    function makeDraggable(element, handle) {
        let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;

        handle.onmousedown = dragMouseDown;

        function dragMouseDown(e) {
            e.preventDefault();
            pos3 = e.clientX;
            pos4 = e.clientY;
            document.onmouseup = closeDragElement;
            document.onmousemove = elementDrag;
        }

        function elementDrag(e) {
            e.preventDefault();
            pos1 = pos3 - e.clientX;
            pos2 = pos4 - e.clientY;
            pos3 = e.clientX;
            pos4 = e.clientY;
            element.style.top = (element.offsetTop - pos2) + "px";
            element.style.left = (element.offsetLeft - pos1) + "px";
            element.style.right = 'auto';
        }

        function closeDragElement() {
            document.onmouseup = null;
            document.onmousemove = null;
        }
    }

    function updateDashboardCounts() {
        const statTotal = document.getElementById('stat-total');
        const statSession = document.getElementById('stat-session');
        const statAds = document.getElementById('stat-ads');
        const statSkipped = document.getElementById('stat-skipped');
        const statQueue = document.getElementById('stat-queue');

        if (statTotal) statTotal.textContent = state.totalBlocked;
        if (statSession) statSession.textContent = state.sessionBlocked;
        if (statAds) statAds.textContent = state.adsBlocked;
        if (statSkipped) statSkipped.textContent = state.videosAutoSkipped;
        if (statQueue) statQueue.textContent = state.blockQueue.length;
    }

    function updateDashboardStatus(msg) {
        const status = document.getElementById('dash-status');
        if (status) status.textContent = msg;
    }

    function addToDashboard(data, status) {
        const tbody = document.querySelector('#dash-table tbody');
        if (!tbody) return;

        const row = document.createElement('tr');
        row.dataset.url = data.url;

        let statusClass = `status-${status}`;
        let statusText = status;
        if (status === 'pending') statusText = '⏳ Pending';
        else if (status === 'blocking') statusText = '🔄 Blocking';
        else if (status === 'blocked') statusText = '✓ Blocked';

        row.innerHTML = `
            <td><a href="${data.url}" target="_blank">@${data.username}</a></td>
            <td>${data.source || 'manual'}</td>
            <td class="${statusClass}">${statusText}</td>
            <td>${new Date().toLocaleTimeString()}</td>
        `;

        tbody.insertBefore(row, tbody.firstChild);

        if (tbody.children.length > CONFIG.dashboardRows) {
            tbody.removeChild(tbody.lastChild);
        }
    }

    function updateRowStatus(url, status) {
        const tbody = document.querySelector('#dash-table tbody');
        if (!tbody) return;

        for (const row of tbody.querySelectorAll('tr')) {
            if (row.dataset.url === url) {
                const statusCell = row.children[2];
                if (statusCell) {
                    let statusText = status;
                    if (status === 'pending') statusText = '⏳ Pending';
                    else if (status === 'blocking') statusText = '🔄 Blocking';
                    else if (status === 'blocked') statusText = '✓ Blocked';
                    else if (status === 'failed') statusText = '❌ Failed';
                    statusCell.textContent = statusText;
                    statusCell.className = `status-${status}`;
                }
                break;
            }
        }
    }

    function refreshDashboardTable() {
        const tbody = document.querySelector('#dash-table tbody');
        if (!tbody) return;

        tbody.innerHTML = '';

        const entries = state.blockList.slice(0, CONFIG.dashboardRows);
        entries.forEach(entry => {
            const row = document.createElement('tr');
            row.dataset.url = entry.url;
            row.innerHTML = `
                <td><a href="${entry.url}" target="_blank">@${entry.username}</a></td>
                <td>${entry.source || 'manual'}</td>
                <td class="status-blocked">✓ Blocked</td>
                <td>${formatDate(entry.timestamp)}</td>
            `;
            tbody.appendChild(row);
        });
    }

    // ==================== SIDEBAR & LIVE FILTERING ====================
    function hideBlockedFromSidebar() {
        if (!state.features.sidebarFiltering) return;

        // Hide blocked users from sidebar recommendations
        const sidebarItems = document.querySelectorAll(
            'div[data-e2e="live-side-nav-item"], ' +
            '[class*="DivSideNavChannelWrapper"], ' +
            '[class*="SideNavChannel"]'
        );

        sidebarItems.forEach(item => {
            const anchor = item.querySelector('a[href*="/@"]');
            if (!anchor) return;

            const href = anchor.getAttribute('href') || '';
            const username = extractUsername(href);

            if (username && state.blockListUrls.has(buildProfileUrl(username))) {
                item.style.display = 'none';
                log(`Hidden blocked user from sidebar: ${username}`);
            }
        });

        // Also check for live stream recommendations in sidebar
        const liveItems = document.querySelectorAll('a[href*="/live"]');
        liveItems.forEach(anchor => {
            const href = anchor.getAttribute('href') || '';
            const match = href.match(/\/@([^/]+)\/live/);
            if (match) {
                const username = match[1];
                if (state.blockListUrls.has(buildProfileUrl(username))) {
                    const container = anchor.closest('[class*="DivSideNav"], [class*="ChannelItem"]') || anchor.parentElement;
                    if (container) {
                        container.style.display = 'none';
                        log(`Hidden blocked live stream from sidebar: ${username}`);
                    }
                }
            }
        });
    }

    function hideBlockedLiveStreams() {
        if (!state.features.liveStreamBlocking) return;

        // Hide blocked users' live streams from the main content area
        const liveCards = document.querySelectorAll(
            'div[class*="DivLiveCard"], ' +
            'div[class*="LiveCard"], ' +
            'a[href*="/live"]'
        );

        liveCards.forEach(card => {
            let anchor = card;
            if (card.tagName !== 'A') {
                anchor = card.querySelector('a[href*="/live"]');
            }
            if (!anchor) return;

            const href = anchor.getAttribute('href') || '';
            const match = href.match(/\/@([^/]+)\/live/);
            if (match) {
                const username = match[1];
                if (state.blockListUrls.has(buildProfileUrl(username))) {
                    const container = card.closest('[class*="DivLiveCard"], [class*="esdn37i0"]') || card;
                    if (container) {
                        container.style.display = 'none';
                        log(`Hidden blocked live stream: ${username}`);
                    }
                }
            }
        });
    }

    function hideBlockedFromFeed() {
        if (!state.features.feedFiltering) return;

        // Hide videos from blocked users in the main feed
        const feedItems = document.querySelectorAll(
            'article[data-e2e="recommend-list-item-container"], ' +
            'article[class*="ArticleItemContainer"], ' +
            'div[class*="DivItemContainer"]'
        );

        feedItems.forEach(item => {
            if (item.dataset.ttBlockFiltered) return;

            const authorLink = item.querySelector('a[href^="/@"]');
            if (!authorLink) return;

            const username = extractUsername(authorLink.getAttribute('href'));
            if (username && state.blockListUrls.has(buildProfileUrl(username))) {
                item.style.display = 'none';
                item.dataset.ttBlockFiltered = 'true';
                log(`Hidden blocked user's video from feed: ${username}`);
            }
        });
    }

    function autoRetryOnError() {
        if (!state.features.autoRetryOnError) return;

        // Auto-retry if TikTok shows an error page
        const errorContainer = document.querySelector(
            'div[class*="DivErrorContainer"], ' +
            'div.tiktok-17btlil, ' +
            '[class*="ErrorPage"]'
        );

        if (errorContainer) {
            const retryButton = errorContainer.querySelector(
                'button[class*="retry" i], ' +
                'button[class*="Retry"], ' +
                'button.tiktok-1xrybjt'
            );

            if (retryButton) {
                log('Detected error page, clicking retry...');
                retryButton.click();
            }
        }
    }

    // ==================== MAIN LOOP ====================
    function scanPage() {
        addBlockButtonToPosters();
        addBlockButtonToCommenters();
        detectAdsInFeed();
        addDownloadButtons();
        checkPendingAdSkip();
        checkForNewVideo();  // Auto-download monitoring
        // Filtering functions
        hideBlockedFromSidebar();
        hideBlockedLiveStreams();
        hideBlockedFromFeed();
        autoRetryOnError();
    }

    // ==================== INIT ====================
    function init() {
        log('TikTok Blocker v2.3.0 Starting...');

        // Check if this is a blocking tab
        if (isBlockingTab() && isProfilePage()) {
            log('Running as blocking tab');
            setTimeout(runBlockingTab, 1500);
            return;
        }

        // Load saved data
        loadBlockList();
        loadSettings();

        // Initialize dashboard
        initDashboard();

        // Start scanning
        setInterval(scanPage, CONFIG.scanInterval);
        scanPage();

        // MutationObserver for dynamic content
        const observer = new MutationObserver(() => {
            scanPage();
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        // Listen for keyboard navigation to reset timer
        document.addEventListener('keydown', (e) => {
            // Skip if keyboard shortcuts are disabled
            if (!state.features.keyboardShortcuts) return;

            // Skip if user is typing in an input field
            const activeEl = document.activeElement;
            if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.isContentEditable)) {
                return;
            }

            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                resetAutoSkipTimer();
                // Check pending ad skip on navigation
                setTimeout(checkPendingAdSkip, 100);
            }
        });

        // Listen for scroll to check pending ad skip
        let scrollTimeout;
        window.addEventListener('scroll', () => {
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(checkPendingAdSkip, 150);
        }, { passive: true });

        // Register Tampermonkey menu commands for quick access
        GM_registerMenuCommand('📤 Export Block List', exportBlockList);
        GM_registerMenuCommand('📥 Import Block List', () => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.csv';
            input.onchange = (e) => {
                if (e.target.files.length > 0) {
                    importBlockList(e.target.files[0]);
                }
            };
            input.click();
        });
        GM_registerMenuCommand('🔄 Import Foundation', () => importFoundation(true));
        GM_registerMenuCommand('☁️ Sync to GitHub', syncToGitHub);
        GM_registerMenuCommand('🗑️ Clear Block List', () => {
            if (confirm('Clear entire block list? This cannot be undone.')) {
                state.blockList = [];
                state.blockListUrls.clear();
                state.totalBlocked = 0;
                saveBlockList();
                updateDashboardCounts();
                refreshDashboardTable();
                log('Block list cleared via menu');
            }
        });
        GM_registerMenuCommand('📊 Show Stats', () => {
            alert(`TikTok AdNull Blocker v2.3.0 Stats:\n\n` +
                  `Total Blocked: ${state.totalBlocked}\n` +
                  `Session Blocked: ${state.sessionBlocked}\n` +
                  `Ads Blocked: ${state.adsBlocked}\n` +
                  `Videos Skipped: ${state.videosAutoSkipped}\n` +
                  `Queue Size: ${state.blockQueue.length}\n` +
                  `GitHub Sync Progress: ${state.blocksSinceLastSync}/${state.githubConfig.syncThreshold}`);
        });

        log('Initialization complete - v2.0 with GitHub sync & tabbed UI');
    }

    // Start when ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();