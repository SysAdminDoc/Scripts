// ==UserScript==
// @name         Google Search Suite Pro
// @namespace    https://github.com/GoogleSearchSuite
// @version      1.0.0
// @description  Premium Google Search enhancement: domain filtering, endless scrolling, custom search engines, professional dark/light themes, and advanced customization. Block unwanted sites, load more results automatically, and customize your search experience.
// @author       Google Search Suite Team
// @match        https://*.google.com/search*
// @match        https://*.google.com/
// @match        https://www.google.co.*/*
// @exclude      *://*.google.com/calendar*
// @exclude      *://mail.google.com/*
// @exclude      *://news.google.com/*
// @exclude      *://accounts.google.*/*
// @exclude      *://myaccount.google.*/*
// @exclude      https://www.google.com/maps*
// @icon         data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='%234285f4' d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z'/%3E%3C/svg%3E
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_deleteValue
// @grant        GM_addStyle
// @grant        GM_registerMenuCommand
// @run-at       document-start
// @updateURL    https://github.com/GoogleSearchSuite/releases/latest/GoogleSearchSuite.user.js
// @downloadURL  https://github.com/GoogleSearchSuite/releases/latest/GoogleSearchSuite.user.js
// ==/UserScript==

/**
 * Google Search Suite Pro
 * A professional, extensible Google Search enhancement suite
 *
 * Features:
 * - Domain blocking with permanent ban support
 * - Endless scrolling with seamless filtering
 * - Custom search engine shortcuts
 * - Professional dark/light themes
 * - Import/Export functionality
 * - Statistics and analytics
 * - Keyboard shortcuts
 * - Comprehensive settings panel
 */

(function() {
    'use strict';

    // ═══════════════════════════════════════════════════════════════════════════════
    // CONFIGURATION & CONSTANTS
    // ═══════════════════════════════════════════════════════════════════════════════

    const APP_NAME = 'Google Search Suite Pro';
    const APP_VERSION = '1.0.0';
    const STORAGE_PREFIX = 'gss_';

    // Default blocked domains (examples)
    const DEFAULT_BLOCKED_DOMAINS = [
        { domain: 'example-spam-site.com', type: 'block', addedAt: Date.now() }
    ];

    // Default search shortcuts
    const DEFAULT_SEARCH_SITES = [
        { name: 'Reddit', modifier: 'site:reddit.com', enabled: true, icon: '🔴', color: '#ff4500' },
        { name: 'YouTube', modifier: 'site:youtube.com', enabled: true, icon: '▶️', color: '#ff0000' },
        { name: 'GitHub', modifier: 'site:github.com', enabled: true, icon: '🐙', color: '#333' },
        { name: 'Stack Overflow', modifier: 'site:stackoverflow.com', enabled: true, icon: '📚', color: '#f48024' },
        { name: 'Wikipedia', modifier: 'site:wikipedia.org', enabled: true, icon: '📖', color: '#000' },
        { name: 'Twitter/X', modifier: 'site:twitter.com OR site:x.com', enabled: false, icon: '🐦', color: '#1da1f2' },
        { name: 'LinkedIn', modifier: 'site:linkedin.com', enabled: false, icon: '💼', color: '#0077b5' },
        { name: 'Amazon', modifier: 'site:amazon.com', enabled: false, icon: '📦', color: '#ff9900' }
    ];

    // Default dropdown menus
    const DEFAULT_DROPDOWNS = [
        {
            title: '🔍 Search Tools',
            links: [
                { name: 'DuckDuckGo', url: 'https://duckduckgo.com/?q={{QUERY}}' },
                { name: 'Bing', url: 'https://www.bing.com/search?q={{QUERY}}' },
                { name: 'Startpage', url: 'https://www.startpage.com/sp/search?query={{QUERY}}' }
            ]
        },
        {
            title: '📁 Archives',
            links: [
                { name: 'Wayback Machine', url: 'https://web.archive.org/web/*/{{URL}}' },
                { name: 'Archive.today', url: 'https://archive.ph/{{URL}}' },
                { name: 'Google Cache', url: 'https://webcache.googleusercontent.com/search?q=cache:{{URL}}' }
            ]
        }
    ];

    // Default settings
    const DEFAULT_SETTINGS = {
        // === Theme & Appearance ===
        theme: 'auto', // 'dark', 'light', 'auto'
        accentColor: '#4285f4',
        resultsWidth: 700,
        centerContent: true,
        compactMode: false,

        // === Domain Filtering ===
        filteringEnabled: true,
        showBlockedNotices: true,
        defaultBlockType: 'block', // 'block' or 'permaban'
        aggressiveBlocking: 'www', // 'none', 'www', 'all'
        animateBlocking: true,

        // === Endless Scrolling ===
        endlessScrollEnabled: true,
        preloadDistance: 1.5, // viewport multiplier
        maxAutoLoadPages: 50,
        showPageIndicators: true,

        // === UI Enhancements ===
        restoreFullURLs: true,
        highlightDates: true,
        showBlockButtons: true,
        blockButtonPosition: 'inline', // 'inline', 'hover', 'corner'
        showStatistics: true,

        // === Element Hiding ===
        hideSponsoredResults: true,
        hideAIOverview: true,
        hideRelatedSearches: false,
        hidePeopleAlsoAsk: false,
        hidePeopleAlsoSearchFor: false,
        hideShortVideos: false,
        hideVideoCarousel: false,
        hideImagePack: false,
        hideTopStories: false,
        hideKnowledgePanel: false,
        hideDiscussions: false,
        hideFooter: true,
        hideSidebar: false,

        // === Keyboard Shortcuts ===
        keyboardShortcutsEnabled: true,
        shortcutOpenSettings: 'ctrl+shift+g',
        shortcutToggleBlocking: 'ctrl+shift+b',

        // === Advanced ===
        debugMode: false,
        telemetry: false,
        cleanURLs: true,
        useClassicFavicon: false
    };

    // ═══════════════════════════════════════════════════════════════════════════════
    // UTILITY CLASSES
    // ═══════════════════════════════════════════════════════════════════════════════

    /**
     * Event Bus for inter-module communication
     */
    class EventBus {
        constructor() {
            this.listeners = new Map();
        }

        on(event, callback) {
            if (!this.listeners.has(event)) {
                this.listeners.set(event, new Set());
            }
            this.listeners.get(event).add(callback);
            return () => this.off(event, callback);
        }

        off(event, callback) {
            if (this.listeners.has(event)) {
                this.listeners.get(event).delete(callback);
            }
        }

        emit(event, data) {
            if (this.listeners.has(event)) {
                this.listeners.get(event).forEach(callback => {
                    try {
                        callback(data);
                    } catch (error) {
                        console.error(`[${APP_NAME}] Event handler error:`, error);
                    }
                });
            }
        }
    }

    /**
     * Storage Manager with caching and migration support
     */
    class StorageManager {
        constructor() {
            this.cache = new Map();
            this.dirty = new Set();
            this.saveDebounceTimer = null;
        }

        get(key, defaultValue = null) {
            const fullKey = STORAGE_PREFIX + key;
            if (this.cache.has(fullKey)) {
                return this.cache.get(fullKey);
            }
            try {
                const stored = GM_getValue(fullKey);
                const value = stored !== undefined ? JSON.parse(stored) : defaultValue;
                this.cache.set(fullKey, value);
                return value;
            } catch (e) {
                console.error(`[${APP_NAME}] Storage get error:`, e);
                return defaultValue;
            }
        }

        set(key, value, immediate = false) {
            const fullKey = STORAGE_PREFIX + key;
            this.cache.set(fullKey, value);
            this.dirty.add(fullKey);

            if (immediate) {
                this.flush();
            } else {
                this.debouncedFlush();
            }
        }

        delete(key) {
            const fullKey = STORAGE_PREFIX + key;
            this.cache.delete(fullKey);
            try {
                GM_deleteValue(fullKey);
            } catch (e) {
                console.error(`[${APP_NAME}] Storage delete error:`, e);
            }
        }

        debouncedFlush() {
            if (this.saveDebounceTimer) {
                clearTimeout(this.saveDebounceTimer);
            }
            this.saveDebounceTimer = setTimeout(() => this.flush(), 500);
        }

        flush() {
            this.dirty.forEach(fullKey => {
                try {
                    const value = this.cache.get(fullKey);
                    GM_setValue(fullKey, JSON.stringify(value));
                } catch (e) {
                    console.error(`[${APP_NAME}] Storage flush error:`, e);
                }
            });
            this.dirty.clear();
        }

        export() {
            const data = {
                version: APP_VERSION,
                exportedAt: new Date().toISOString(),
                settings: this.get('settings', DEFAULT_SETTINGS),
                blockedDomains: this.get('blockedDomains', DEFAULT_BLOCKED_DOMAINS),
                searchSites: this.get('searchSites', DEFAULT_SEARCH_SITES),
                dropdowns: this.get('dropdowns', DEFAULT_DROPDOWNS),
                statistics: this.get('statistics', { blocked: 0, pages: 0, searches: 0 })
            };
            return JSON.stringify(data, null, 2);
        }

        import(jsonString) {
            try {
                const data = JSON.parse(jsonString);
                if (data.settings) this.set('settings', { ...DEFAULT_SETTINGS, ...data.settings });
                if (data.blockedDomains) this.set('blockedDomains', data.blockedDomains);
                if (data.searchSites) this.set('searchSites', data.searchSites);
                if (data.dropdowns) this.set('dropdowns', data.dropdowns);
                this.flush();
                return { success: true, message: 'Import successful!' };
            } catch (e) {
                return { success: false, message: 'Invalid import data: ' + e.message };
            }
        }
    }

    /**
     * Logger with levels and optional debug output
     */
    class Logger {
        constructor(debugMode = false) {
            this.debugMode = debugMode;
            this.prefix = `[${APP_NAME}]`;
        }

        setDebugMode(enabled) {
            this.debugMode = enabled;
        }

        debug(...args) {
            if (this.debugMode) {
                console.log(this.prefix, '🔍', ...args);
            }
        }

        info(...args) {
            console.log(this.prefix, 'ℹ️', ...args);
        }

        warn(...args) {
            console.warn(this.prefix, '⚠️', ...args);
        }

        error(...args) {
            console.error(this.prefix, '❌', ...args);
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // CORE APPLICATION
    // ═══════════════════════════════════════════════════════════════════════════════

    class GoogleSearchSuite {
        constructor() {
            this.events = new EventBus();
            this.storage = new StorageManager();
            this.logger = new Logger();

            // State
            this.settings = null;
            this.blockedDomains = null;
            this.searchSites = null;
            this.dropdowns = null;
            this.statistics = null;

            // Modules
            this.domainFilter = null;
            this.endlessScroll = null;
            this.sectionHider = null;
            this.uiManager = null;
            this.themeManager = null;
            this.searchShortcuts = null;

            // Initialize
            this.init();
        }

        async init() {
            // Load settings
            this.loadData();
            this.logger.setDebugMode(this.settings.debugMode);
            this.logger.info(`Initializing ${APP_NAME} v${APP_VERSION}`);

            // Early execution (before DOM ready)
            this.executeEarly();

            // Wait for DOM
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => this.onDOMReady());
            } else {
                this.onDOMReady();
            }
        }

        loadData() {
            this.settings = { ...DEFAULT_SETTINGS, ...this.storage.get('settings', {}) };
            this.blockedDomains = this.storage.get('blockedDomains', DEFAULT_BLOCKED_DOMAINS);
            this.searchSites = this.storage.get('searchSites', DEFAULT_SEARCH_SITES);
            this.dropdowns = this.storage.get('dropdowns', DEFAULT_DROPDOWNS);
            this.statistics = this.storage.get('statistics', { blocked: 0, pages: 0, searches: 0 });
        }

        saveData() {
            this.storage.set('settings', this.settings);
            this.storage.set('blockedDomains', this.blockedDomains);
            this.storage.set('searchSites', this.searchSites);
            this.storage.set('dropdowns', this.dropdowns);
            this.storage.set('statistics', this.statistics);
        }

        executeEarly() {
            // Apply theme immediately to prevent flash
            this.applyEarlyTheme();

            // Clean URL parameters
            if (this.settings.cleanURLs && window.location.pathname === '/search') {
                this.cleanURLParams();
            }

            // Inject critical CSS early
            this.injectEarlyStyles();
        }

        applyEarlyTheme() {
            let theme = this.settings.theme;
            if (theme === 'auto') {
                theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
            }
            document.documentElement.setAttribute('data-gss-theme', theme);
        }

        cleanURLParams() {
            const url = new URL(window.location.href);
            const paramsToRemove = ['ved', 'oq', 'gs_lcrp', 'sclient', 'source', 'ei', 'sa', 'aqs', 'sxsrf', 'uact', 'gs_lp', 'sourceid'];
            let changed = false;
            paramsToRemove.forEach(param => {
                if (url.searchParams.has(param)) {
                    url.searchParams.delete(param);
                    changed = true;
                }
            });
            if (changed) {
                window.history.replaceState({}, document.title, url.toString());
            }
        }

        injectEarlyStyles() {
            GM_addStyle(this.getEarlyCSS());
        }

        onDOMReady() {
            // Skip non-search pages
            if (window.location.pathname !== '/search') {
                this.logger.debug('Not a search page, limited initialization');
                return;
            }

            // Initialize modules
            this.themeManager = new ThemeManager(this);
            this.sectionHider = new SectionHider(this);
            this.uiManager = new UIManager(this);
            this.domainFilter = new DomainFilter(this);
            this.endlessScroll = new EndlessScroll(this);
            this.searchShortcuts = new SearchShortcuts(this);

            // Setup event listeners
            this.setupEventListeners();

            // Initial run
            this.domainFilter.processResults();
            this.uiManager.render();

            // Track search
            this.statistics.searches++;
            this.saveData();

            this.logger.info('Initialization complete');
        }

        setupEventListeners() {
            // Listen for new results from endless scroll
            this.events.on('newResultsLoaded', (container) => {
                this.logger.debug('New results loaded, processing...');
                this.domainFilter.processResults(container);
                this.sectionHider.hideSections();
            });

            // Listen for domain blocked
            this.events.on('domainBlocked', (data) => {
                this.statistics.blocked++;
                this.saveData();
                this.uiManager.showToast(`Blocked: ${data.domain}`, 'success');
            });

            // Listen for settings changes
            this.events.on('settingsChanged', () => {
                this.saveData();
                this.themeManager.apply();
                this.domainFilter.reprocessAll();
                this.sectionHider.hideSections();
            });

            // Keyboard shortcuts
            if (this.settings.keyboardShortcutsEnabled) {
                document.addEventListener('keydown', (e) => this.handleKeyboard(e));
            }
        }

        handleKeyboard(e) {
            const key = this.getKeyCombo(e);

            if (key === this.settings.shortcutOpenSettings) {
                e.preventDefault();
                this.uiManager.toggleSettingsPanel();
            } else if (key === this.settings.shortcutToggleBlocking) {
                e.preventDefault();
                this.settings.filteringEnabled = !this.settings.filteringEnabled;
                this.events.emit('settingsChanged');
                this.uiManager.showToast(
                    `Filtering ${this.settings.filteringEnabled ? 'enabled' : 'disabled'}`,
                    'info'
                );
            }
        }

        getKeyCombo(e) {
            const parts = [];
            if (e.ctrlKey) parts.push('ctrl');
            if (e.shiftKey) parts.push('shift');
            if (e.altKey) parts.push('alt');
            if (e.key && e.key.length === 1) parts.push(e.key.toLowerCase());
            return parts.join('+');
        }

        getEarlyCSS() {
            return `
                /* ═══════════════════════════════════════════════════════════════════════════════
                   GOOGLE SEARCH SUITE PRO - CORE STYLES
                   ═══════════════════════════════════════════════════════════════════════════════ */

                /* CSS Variables */
                :root {
                    --gss-accent: ${this.settings.accentColor};
                    --gss-accent-rgb: 66, 133, 244;
                    --gss-radius: 12px;
                    --gss-radius-sm: 8px;
                    --gss-transition: 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                    --gss-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
                    --gss-shadow-lg: 0 8px 40px rgba(0, 0, 0, 0.2);
                }

                /* CRITICAL: Prevent text flipping/mirroring issues */
                /* Reset any transforms on text-containing elements */
                [data-gss-theme] h3,
                [data-gss-theme] h3 *,
                [data-gss-theme] a,
                [data-gss-theme] span,
                [data-gss-theme] div.LC20lb,
                [data-gss-theme] .DKV0Md,
                [data-gss-theme] .VuuXrf,
                [data-gss-theme] .qLRx3b,
                [data-gss-theme] cite,
                [data-gss-theme] .tjvcx,
                [data-gss-theme] .VNLkW,
                [data-gss-theme] .fzUZNc,
                [data-gss-theme] .byrV5b,
                [data-gss-theme] .CA5RN,
                [data-gss-theme] .cHaqb,
                [data-gss-theme] .ylgVCe,
                [data-gss-theme] .ob9lvb,
                .gss-result h3,
                .gss-result h3 *,
                .gss-result a,
                .gss-result span,
                /* URL/breadcrumb elements */
                .VuuXrf, .qLRx3b, .tjvcx, cite,
                .byrV5b, .CA5RN, .ylgVCe, .ob9lvb,
                /* Title elements */
                .LC20lb, .DKV0Md, h3.LC20lb,
                /* All Google result text */
                #rso h3, #rso a, #rso span, #rso cite,
                #search h3, #search a, #search span, #search cite {
                    transform: none !important;
                    -webkit-transform: none !important;
                    -moz-transform: none !important;
                    -ms-transform: none !important;
                    writing-mode: horizontal-tb !important;
                    direction: ltr !important;
                    unicode-bidi: normal !important;
                    text-orientation: mixed !important;
                    font-variant: normal !important;
                    font-feature-settings: normal !important;
                    -webkit-font-feature-settings: normal !important;
                    text-rendering: auto !important;
                }

                /* Light Theme */
                [data-gss-theme="light"] {
                    --gss-bg: #ffffff;
                    --gss-bg-secondary: #f8f9fa;
                    --gss-bg-tertiary: #f1f3f4;
                    --gss-text: #202124;
                    --gss-text-secondary: #5f6368;
                    --gss-text-muted: #9aa0a6;
                    --gss-border: #dadce0;
                    --gss-hover: rgba(0, 0, 0, 0.04);
                    --gss-blocked-bg: #fff3cd;
                    --gss-blocked-border: #ffc107;
                }

                /* Dark Theme */
                [data-gss-theme="dark"] {
                    --gss-bg: #1a1a2e;
                    --gss-bg-secondary: #16213e;
                    --gss-bg-tertiary: #0f3460;
                    --gss-text: #e4e6eb;
                    --gss-text-secondary: #b0b3b8;
                    --gss-text-muted: #8a8d91;
                    --gss-border: #3a3b3c;
                    --gss-hover: rgba(255, 255, 255, 0.05);
                    --gss-blocked-bg: rgba(255, 193, 7, 0.1);
                    --gss-blocked-border: #ffc107;
                }

                /* Ensure Google's native elements don't get transformed */
                [data-gss-theme] .g h3,
                [data-gss-theme] .MjjYud h3,
                [data-gss-theme] .LC20lb {
                    transform: none !important;
                }

                /* Print styles */
                @media print {
                    .gss-button, .gss-panel, .gss-toast, .gss-toolbar {
                        display: none !important;
                    }
                }
            `;
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // THEME MANAGER
    // ═══════════════════════════════════════════════════════════════════════════════

    class ThemeManager {
        constructor(app) {
            this.app = app;
            this.styleElement = null;
            this.init();
        }

        init() {
            this.createStyleElement();
            this.apply();
            this.watchSystemTheme();
        }

        createStyleElement() {
            this.styleElement = document.createElement('style');
            this.styleElement.id = 'gss-theme-styles';
            document.head.appendChild(this.styleElement);
        }

        watchSystemTheme() {
            if (this.app.settings.theme === 'auto') {
                window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
                    if (this.app.settings.theme === 'auto') {
                        document.documentElement.setAttribute('data-gss-theme', e.matches ? 'dark' : 'light');
                    }
                });
            }
        }

        apply() {
            let theme = this.app.settings.theme;
            if (theme === 'auto') {
                theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
            }
            document.documentElement.setAttribute('data-gss-theme', theme);
            this.styleElement.textContent = this.generateStyles();
        }

        generateStyles() {
            const s = this.app.settings;
            let css = '';

            // Centered layout (based on Google centered by justDeek)
            if (s.centerContent) {
                css += `
                    :root {
                        --content-width: ${s.resultsWidth}px;
                    }

                    /* Topbar */
                    .XDyW0e { display: none }
                    #tsf { max-width: unset }
                    .YNk70c { display: block }
                    .A8SBwf {
                        margin: auto;
                        width: 100%;
                        max-width: unset;
                    }
                    .RNNXgb, .appbar, .aajZCb, #oFNiHe {
                        max-width: var(--content-width);
                    }
                    .minidiv .RNNXgb, .appbar, .aajZCb, #oFNiHe {
                        margin-left: auto;
                        margin-right: auto;
                    }
                    .logo { left: 0 }
                    .Efnghe {
                        position: absolute;
                        right: 0;
                    }

                    /* Toolbar */
                    .xhjkHe { max-width: unset }
                    .qogDvd, .crJ18e, .sSeWs > div {
                        margin-left: auto;
                        margin-right: auto;
                    }
                    .T7Ko6 { display: none }
                    .PuHHbb {
                        position: absolute;
                        right: 0;
                        top: 5px;
                    }

                    /* Hide extra UI elements */
                    div.zLSRge.w2jn8d.OMqmfd,
                    div.niO4u,
                    .gb_I.gb_1.gb_vd {
                        display: none;
                    }

                    .GG4mbd {
                        margin: auto;
                        display: flex;
                        justify-content: center;
                    }

                    /* Center main content */
                    #rcnt:has(#center_col) {
                        display: flex;
                        flex-direction: column;
                        justify-content: center;
                        max-width: var(--content-width);
                        margin: auto;
                    }
                    #rcnt:has([aria-label="Short videos"]) { display: grid !important }
                    #center_col {
                        order: 99;
                        max-width: var(--content-width);
                    }
                    #rcnt.gIatYd:has(#center_col) { max-width: 800px }
                    #rcnt.YNk70c:not(.B2Ogle):not(:has(.bzXtMb)) {
                        flex-direction: unset !important;
                    }
                    #rcnt.YNk70c:not(.B2Ogle):not(:has(.bzXtMb)) .UFQ0Gb {
                        display: flex !important;
                    }
                    .SLPe5b.VMy2zd { display: flex !important }

                    /* AI mode */
                    .WzWwpc {
                        margin-left: auto;
                        margin-right: auto;
                    }
                    .Zkbeff {
                        display: grid;
                        gap: 5em;
                    }
                    .UxeQfc { display: block !important }

                    /* Put sidebar atop content and limit height */
                    #rcnt:has(#rhs) {
                        flex-direction: column !important;
                    }
                    #rhs {
                        display: block;
                        max-height: 320px;
                        overflow-x: hidden;
                        overflow-y: auto;
                        width: 100%;
                        margin-bottom: 1.5em;
                        padding: 0 10px 0 0;
                    }
                    #rhs .bCwlI.btpNFe { left: 5px !important }
                    #rhs .VdehBf.btpNFe { right: 5px !important }
                    #rhs .VjDLd.liYKde { margin-bottom: 0 !important }

                    .gIatYd .s6JM6d { min-width: unset !important }
                    .TQc1id .I6TXqe { max-width: 600px }
                    .jOAHU { margin-left: 0 !important }
                    .jOAHU, .zWHLnd, .CeIyHb.WY0eLb {
                        padding-left: 0 !important;
                        border: none !important;
                    }
                    .TQc1id .z4oRIf .mgAbYb { font-size: 22px }
                    .WY0eLb .xGj8Mb { margin-top: 0 !important }
                    .Io1WV {
                        width: 97%;
                        margin: auto;
                    }
                    .CeIyHb.WY0eLb {
                        margin-left: 0 !important;
                        max-width: unset !important;
                    }

                    @media (min-width: 800px) and (max-width: 1163.98px) {
                        .YNk70c.NbTBrb:has(> .SLPe5b) {
                            grid-template-columns: 8px repeat(20,26px) minmax(0,230px) !important;
                        }
                    }

                    .MjUjnf {
                        margin-left: auto;
                        margin-right: auto;
                        display: flex;
                        width: 100%;
                        justify-content: space-between;
                        max-width: var(--content-width);
                        padding-top: 0;
                    }

                    .SLPe5b, .bzXtMb { grid-column: 2/-2 }

                    .QZvcUb, .D6lY4c, .YfftMc, .r2VLS, .P7auZc.o7bT3c {
                        display: none;
                    }

                    .FpfXM {
                        margin: auto;
                        max-width: var(--content-width);
                        padding-left: 0;
                    }

                    .SoAPf { width: unset !important }
                    .rQTE8b { justify-content: center !important }

                    /* Make preview images use full size */
                    .v6bUne { max-height: unset !important }
                    .YsLeY img {
                        max-width: 100% !important;
                        max-height: 100% !important;
                        width: unset !important;
                        height: unset !important;
                    }
                `;
            } else {
                // Just apply results width without centering
                css += `
                    #center_col, #rcnt { max-width: ${s.resultsWidth}px !important; }
                `;
            }

            // Element hiding
            if (s.hideSponsoredResults) {
                css += `
                    #tads, #taw, #bottomads, #tadsb,
                    div[data-text-ad], div[aria-label="Ads"],
                    .ads-ad, .commercial-unit-desktop-top,
                    .cu-container {
                        display: none !important;
                    }
                `;
            }

            if (s.hideAIOverview) {
                css += `
                    #aib, .Lz5Cpe.Jz62f, .dRYYxd,
                    div[jsname="txosbe"], .bzXtMb.M8OgIe.dRpWwb,
                    div[data-attrid="PremiumAnswer"],
                    .M8OgIe .XcVN5d, div[jscontroller*="ai-overview"] {
                        display: none !important;
                    }
                `;
            }

            if (s.hideRelatedSearches) {
                css += `
                    #botstuff, #bres, #brs,
                    div[id="bres"], .k8XOCe, .y6Uyqe,
                    .AJLUJb, .oIk2Cb, .b2hzT,
                    div[data-hveid]:has(> .oIk2Cb),
                    .ULSxyf:has([role="heading"]:not(:empty)),
                    #botstuff > div:has(> div[role="heading"]) {
                        display: none !important;
                    }
                `;
            }

            if (s.hidePeopleAlsoAsk) {
                css += `
                    /* People Also Ask section - multiple selectors for robustness */
                    div.wQiwMc.related-question-pair,
                    div:has(> .wQiwMc.related-question-pair),
                    div:has(> div > .wQiwMc.related-question-pair),
                    .MjjYud:has(.related-question-pair),
                    div[jscontroller="SC7lYd"]:has(.related-question-pair),
                    /* Container with "People also ask" heading */
                    div[data-sgrd="true"]:has(.wQiwMc),
                    .LQCGqc:has(.wQiwMc),
                    /* Heading containers */
                    .Wt5Tfe:has(.wQiwMc),
                    div:has(> .Wt5Tfe):has(.wQiwMc) {
                        display: none !important;
                    }
                `;
            }

            if (s.hidePeopleAlsoSearchFor) {
                css += `
                    /* People Also Search For section */
                    .oIk2Cb:has([role="heading"]),
                    .MjjYud:has(.b2Rnsc),
                    div[data-ved]:has(.ngTNl.ggLgoc),
                    .y6Uyqe:has(.b2Rnsc),
                    /* Related search pills/chips */
                    .EIaa9b, .AJLUJb:has(.b2Rnsc),
                    /* Bottom related searches container */
                    #bres, div[id="bres"],
                    .M6HR1c:has([role="heading"]) {
                        display: none !important;
                    }
                `;
            }

            if (s.hideShortVideos) {
                css += `
                    /* Short Videos section and carousel */
                    .Ww4FFb.vt6azd:has(.adDDi [role="heading"]),
                    /* Short videos carousel */
                    .XNfAUb, .EDblX, .RyIFgf,
                    div[jscontroller="s0j7C"],
                    /* Section container with short videos */
                    .MjjYud:has(.XNfAUb),
                    .ULSxyf:has(.XNfAUb),
                    /* Video list items */
                    .XRVJtc.bnmjfe,
                    /* Short video result cards */
                    .VqeGe:has(.oj7Mub) {
                        display: none !important;
                    }
                `;
            }

            if (s.hideVideoCarousel) {
                css += `
                    /* Video results carousel */
                    .WVV5ke, .rIRoqf,
                    div[data-vid], div[data-curl*="youtube.com"],
                    /* Video result containers */
                    .MYHjcd:has(.WVV5ke),
                    .oj7Mub:has(.WVV5ke),
                    /* Inline video players */
                    div[jscontroller="rTuANe"],
                    .aavBce.qvSLpc,
                    /* Video thumbnails in results */
                    .VqeGe:has(.WVV5ke),
                    .XRVJtc:has([data-vid]),
                    /* Video answer box */
                    .L2AgXb:has(.WVV5ke) {
                        display: none !important;
                    }
                `;
            }

            if (s.hideImagePack) {
                css += `
                    /* Image pack / Image carousel */
                    g-img, .islrc, .isv-r,
                    div[data-lpage], .iSv9,
                    /* Image grid containers */
                    .gWSNAe, .GXy8xb,
                    div[jscontroller]:has(.islrc),
                    /* Inline image results */
                    g-section-with-header:has(g-img),
                    .MjjYud:has(.islrc),
                    /* Image carousel */
                    g-scrolling-carousel:has(g-img),
                    /* Image inline container */
                    .ULSxyf:has(g-img) {
                        display: none !important;
                    }
                `;
            }

            if (s.hideTopStories) {
                css += `
                    /* Top Stories section */
                    .MjjYud:has(.SoaBEf),
                    .SoaBEf, .ddmIXe,
                    /* Top stories carousel */
                    div:has(> [role="heading"] span:first-child),
                    .MjjYud:has(.WlydOe[href*="news"]),
                    /* News cards */
                    .JJZKK, .ftSUBd,
                    /* Top stories container identified by heading */
                    .ULSxyf:has(.SoaBEf) {
                        display: none !important;
                    }
                `;
            }

            if (s.hideKnowledgePanel) {
                css += `
                    /* Knowledge Panel (right sidebar info) */
                    .kp-wholepage, .kp-wholepage-osrp,
                    .liYKde, .kp-header,
                    /* Knowledge graph cards */
                    .osrp-blk, .kno-kp,
                    /* Entity info panels */
                    .Jb0Zif, .ss6qqb,
                    /* Inline knowledge cards */
                    div[data-attrid]:has(.wDYxhc),
                    .g-blk:has(.kp-wholepage) {
                        display: none !important;
                    }
                `;
            }

            if (s.hideDiscussions) {
                css += `
                    /* Discussions and forums section */
                    g-section-with-header.yG4QQe,
                    .MjjYud:has(.yG4QQe),
                    /* Forum/Reddit results */
                    .ULSxyf:has(.yl2Dve),
                    .MjjYud:has([href*="reddit.com"]):has(.yG4QQe),
                    /* Discussion cards */
                    .TBC9ub, .yl2Dve,
                    /* Web discussions container */
                    div:has(> .yG4QQe) {
                        display: none !important;
                    }
                `;
            }

            if (s.hideFooter) {
                css += `#sfooter, #footcnt { display: none !important; }`;
            }

            if (s.hideSidebar) {
                css += `#rhs { display: none !important; }`;
            }

            // Highlight dates
            if (s.highlightDates) {
                css += `
                    .LEwnzc, .f, span.xUrNXd {
                        color: var(--gss-accent) !important;
                        font-weight: 500;
                    }
                `;
            }

            return css;
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // SECTION HIDER (JavaScript-based for text detection)
    // ═══════════════════════════════════════════════════════════════════════════════

    class SectionHider {
        constructor(app) {
            this.app = app;
            this.observer = null;
            this.hiddenSections = new WeakSet();
            this.init();
        }

        init() {
            // Initial hide
            this.hideSections();

            // Watch for dynamic content
            this.setupObserver();
        }

        setupObserver() {
            const target = document.getElementById('rso') || document.getElementById('search') || document.body;

            this.observer = new MutationObserver((mutations) => {
                let shouldProcess = false;
                for (const mutation of mutations) {
                    if (mutation.addedNodes.length > 0) {
                        shouldProcess = true;
                        break;
                    }
                }
                if (shouldProcess) {
                    this.hideSections();
                }
            });

            this.observer.observe(target, {
                childList: true,
                subtree: true
            });
        }

        hideSections() {
            const s = this.app.settings;

            // Define sections to hide with their heading text patterns
            const sectionsToHide = [];

            if (s.hidePeopleAlsoAsk) {
                sectionsToHide.push({
                    headings: ['People also ask'],
                    selectors: ['.related-question-pair', '.wQiwMc']
                });
            }

            if (s.hidePeopleAlsoSearchFor) {
                sectionsToHide.push({
                    headings: ['People also search for'],
                    selectors: ['.b2Rnsc', '.oIk2Cb']
                });
            }

            if (s.hideShortVideos) {
                sectionsToHide.push({
                    headings: ['Short videos', 'Videos'],
                    selectors: ['.XNfAUb', '.EDblX', '[jscontroller="s0j7C"]']
                });
            }

            if (s.hideRelatedSearches) {
                sectionsToHide.push({
                    headings: ['Related searches'],
                    selectors: ['#bres', '#botstuff']
                });
            }

            if (s.hideImagePack) {
                sectionsToHide.push({
                    headings: ['Images for', 'Images'],
                    selectors: ['g-img', '.islrc', 'g-scrolling-carousel', '.isv-r']
                });
            }

            if (s.hideVideoCarousel) {
                sectionsToHide.push({
                    headings: [],
                    selectors: ['.WVV5ke', '[data-vid]', '[jscontroller="rTuANe"]', '.L2AgXb']
                });
            }

            if (s.hideTopStories) {
                sectionsToHide.push({
                    headings: ['Top stories'],
                    selectors: ['.SoaBEf', '.ddmIXe', '.JJZKK', '.ftSUBd']
                });
            }

            if (s.hideKnowledgePanel) {
                sectionsToHide.push({
                    headings: [],
                    selectors: ['.kp-wholepage', '.kp-wholepage-osrp', '.liYKde', '.kno-kp', '.osrp-blk']
                });
            }

            if (s.hideDiscussions) {
                sectionsToHide.push({
                    headings: ['Discussions and forums', 'Forums', 'Discussions'],
                    selectors: ['.yG4QQe', '.TBC9ub', '.yl2Dve']
                });
            }

            // Find and hide sections by heading text
            const headings = document.querySelectorAll('[role="heading"], h2, h3, .mgAbYb');

            headings.forEach(heading => {
                const text = heading.textContent?.trim() || '';

                for (const section of sectionsToHide) {
                    const shouldHide = section.headings.some(h =>
                        text.toLowerCase().includes(h.toLowerCase())
                    );

                    if (shouldHide) {
                        // Find the container to hide
                        let container = this.findSectionContainer(heading);
                        if (container && !this.hiddenSections.has(container)) {
                            container.style.display = 'none';
                            this.hiddenSections.add(container);
                        }
                    }
                }
            });

            // Also hide by characteristic selectors
            for (const section of sectionsToHide) {
                for (const selector of section.selectors) {
                    try {
                        const elements = document.querySelectorAll(selector);
                        elements.forEach(el => {
                            const container = this.findSectionContainer(el);
                            if (container && !this.hiddenSections.has(container)) {
                                container.style.display = 'none';
                                this.hiddenSections.add(container);
                            }
                        });
                    } catch (e) {
                        // Invalid selector, skip
                    }
                }
            }

            // Hide "More short videos" links specifically
            if (s.hideShortVideos) {
                document.querySelectorAll('a').forEach(a => {
                    if (a.textContent?.toLowerCase().includes('more short videos')) {
                        const container = this.findSectionContainer(a);
                        if (container && !this.hiddenSections.has(container)) {
                            container.style.display = 'none';
                            this.hiddenSections.add(container);
                        }
                    }
                });
            }
        }

        findSectionContainer(element) {
            // Walk up the DOM to find the appropriate container
            let current = element;
            let lastValidContainer = null;

            // Common Google result container classes
            const containerClasses = ['MjjYud', 'ULSxyf', 'Ww4FFb', 'g', 'hlcw0c', 'vt6azd'];
            const containerIds = ['rso', 'search', 'bres', 'botstuff'];

            while (current && current !== document.body) {
                // Check if this is a known container
                for (const cls of containerClasses) {
                    if (current.classList?.contains(cls)) {
                        lastValidContainer = current;
                    }
                }

                // Don't go past major containers
                if (containerIds.includes(current.id)) {
                    break;
                }

                current = current.parentElement;
            }

            return lastValidContainer;
        }

        destroy() {
            if (this.observer) {
                this.observer.disconnect();
            }
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // DOMAIN FILTER
    // ═══════════════════════════════════════════════════════════════════════════════

    class DomainFilter {
        constructor(app) {
            this.app = app;
            this.observer = null;
            this.processedResults = new WeakSet();
            this.init();
        }

        init() {
            this.setupMutationObserver();
            this.injectStyles();
        }

        injectStyles() {
            GM_addStyle(`
                /* ═══════════════════════════════════════════════════════════════════════════════
                   DOMAIN FILTER STYLES
                   ═══════════════════════════════════════════════════════════════════════════════ */

                /* Block button */
                .gss-block-btn {
                    display: inline-flex;
                    align-items: center;
                    gap: 4px;
                    padding: 4px 10px;
                    margin-left: 8px;
                    font-family: 'Google Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    font-size: 12px;
                    font-weight: 500;
                    color: var(--gss-text-secondary);
                    background: var(--gss-bg-secondary);
                    border: 1px solid var(--gss-border);
                    border-radius: 100px;
                    cursor: pointer;
                    transition: all var(--gss-transition);
                    opacity: 0;
                    transform: translateX(-5px);
                    white-space: nowrap;
                }

                .gss-result:hover .gss-block-btn,
                .gss-block-btn:focus {
                    opacity: 1;
                    transform: translateX(0);
                }

                .gss-block-btn:hover {
                    background: var(--gss-accent);
                    color: white;
                    border-color: var(--gss-accent);
                    transform: translateX(0) scale(1.02);
                }

                .gss-block-btn svg {
                    width: 14px;
                    height: 14px;
                }

                /* Blocked result notice */
                .gss-blocked-notice {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 12px 16px;
                    margin: 8px 0;
                    background: var(--gss-blocked-bg);
                    border: 1px solid var(--gss-blocked-border);
                    border-radius: var(--gss-radius-sm);
                    font-family: 'Google Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    font-size: 13px;
                    color: var(--gss-text);
                    animation: gss-slideIn 0.3s ease-out;
                }

                .gss-blocked-notice-content {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }

                .gss-blocked-notice-icon {
                    font-size: 16px;
                }

                .gss-blocked-notice-domain {
                    font-weight: 600;
                    color: var(--gss-accent);
                }

                .gss-blocked-notice-actions {
                    display: flex;
                    gap: 8px;
                }

                .gss-notice-btn {
                    padding: 6px 12px;
                    font-size: 12px;
                    font-weight: 500;
                    border: none;
                    border-radius: 100px;
                    cursor: pointer;
                    transition: all var(--gss-transition);
                }

                .gss-notice-btn-show {
                    background: var(--gss-bg);
                    color: var(--gss-text);
                    border: 1px solid var(--gss-border);
                }

                .gss-notice-btn-show:hover {
                    background: var(--gss-accent);
                    color: white;
                    border-color: var(--gss-accent);
                }

                .gss-notice-btn-unblock {
                    background: #4caf50;
                    color: white;
                }

                .gss-notice-btn-unblock:hover {
                    background: #43a047;
                    transform: scale(1.02);
                }

                /* Hidden result */
                .gss-hidden {
                    display: none !important;
                }

                .gss-result-hidden > *:not(.gss-blocked-notice) {
                    display: none !important;
                }

                /* Permaban - completely hidden */
                .gss-permaban {
                    display: none !important;
                }

                /* Show temporarily */
                .gss-show-temp > * {
                    display: block !important;
                }

                .gss-show-temp .gss-blocked-notice {
                    background: rgba(76, 175, 80, 0.1);
                    border-color: #4caf50;
                }

                /* Animations */
                @keyframes gss-slideIn {
                    from {
                        opacity: 0;
                        transform: translateY(-10px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }

                @keyframes gss-fadeOut {
                    from {
                        opacity: 1;
                        transform: scale(1);
                    }
                    to {
                        opacity: 0;
                        transform: scale(0.95);
                    }
                }

                .gss-blocking {
                    animation: gss-fadeOut 0.3s ease-out forwards;
                }

                /* Unblock button in results */
                .gss-unblock-btn {
                    display: inline-flex;
                    align-items: center;
                    gap: 4px;
                    padding: 4px 10px;
                    margin-left: 8px;
                    font-family: 'Google Sans', sans-serif;
                    font-size: 12px;
                    font-weight: 500;
                    color: white;
                    background: #4caf50;
                    border: none;
                    border-radius: 100px;
                    cursor: pointer;
                    transition: all var(--gss-transition);
                }

                .gss-unblock-btn:hover {
                    background: #43a047;
                    transform: scale(1.02);
                }

                /* Title row flex */
                .gss-result h3 {
                    display: inline !important;
                }

                .gss-title-row {
                    display: flex;
                    align-items: center;
                    flex-wrap: wrap;
                    gap: 4px;
                }
            `);
        }

        setupMutationObserver() {
            this.observer = new MutationObserver((mutations) => {
                let hasNewResults = false;

                mutations.forEach((mutation) => {
                    if (mutation.type === 'childList') {
                        mutation.addedNodes.forEach((node) => {
                            if (node.nodeType === Node.ELEMENT_NODE) {
                                if (this.isSearchResult(node) || node.querySelector?.('.g, .MjjYud')) {
                                    hasNewResults = true;
                                }
                            }
                        });
                    }
                });

                if (hasNewResults) {
                    this.processResults();
                }
            });

            // Start observing when DOM is ready
            const startObserving = () => {
                const container = document.getElementById('rso') || document.getElementById('search');
                if (container) {
                    this.observer.observe(container, {
                        childList: true,
                        subtree: true
                    });
                    this.app.logger.debug('Mutation observer attached to results container');
                } else {
                    setTimeout(startObserving, 100);
                }
            };

            startObserving();
        }

        isSearchResult(element) {
            return element.classList?.contains('g') ||
                   element.classList?.contains('MjjYud') ||
                   element.matches?.('div[data-hveid]');
        }

        processResults(container = document) {
            if (!this.app.settings.filteringEnabled) return;

            const results = container.querySelectorAll(
                '#rso .g:not(.gss-processed), ' +
                '#rso .MjjYud:not(.gss-processed), ' +
                '#rso > div:not(.gss-processed)'
            );

            this.app.logger.debug(`Processing ${results.length} results`);

            results.forEach((result) => {
                if (this.processedResults.has(result)) return;
                this.processedResults.add(result);
                result.classList.add('gss-processed', 'gss-result');

                this.processResult(result);
            });
        }

        processResult(resultElement) {
            // Extract domain from result
            const linkElement = resultElement.querySelector('a[href][data-ved], a[href]:not([href^="#"])');
            if (!linkElement) return;

            const url = linkElement.href;
            const domain = this.extractDomain(url);
            if (!domain) return;

            resultElement.setAttribute('data-gss-domain', domain);

            // Check if domain is blocked
            const blockInfo = this.isDomainBlocked(domain);

            if (blockInfo) {
                this.hideResult(resultElement, domain, blockInfo);
            } else {
                this.addBlockButton(resultElement, domain);
            }
        }

        extractDomain(url) {
            try {
                const urlObj = new URL(url);
                return urlObj.hostname.replace(/^www\./, '');
            } catch (e) {
                return null;
            }
        }

        isDomainBlocked(domain) {
            const domainParts = domain.split('.');

            for (const blocked of this.app.blockedDomains) {
                // Exact match
                if (blocked.domain === domain) {
                    return blocked;
                }

                // Subdomain match
                if (domain.endsWith('.' + blocked.domain)) {
                    return blocked;
                }

                // Parent domain match based on settings
                if (this.app.settings.aggressiveBlocking !== 'none') {
                    const blockedParts = blocked.domain.split('.');
                    if (domainParts.length > blockedParts.length) {
                        const parentDomain = domainParts.slice(-blockedParts.length).join('.');
                        if (parentDomain === blocked.domain) {
                            return blocked;
                        }
                    }
                }
            }

            return null;
        }

        hideResult(resultElement, domain, blockInfo) {
            if (blockInfo.type === 'permaban') {
                resultElement.classList.add('gss-permaban');
                return;
            }

            if (!this.app.settings.showBlockedNotices) {
                resultElement.classList.add('gss-hidden');
                return;
            }

            resultElement.classList.add('gss-result-hidden');

            // Create notice
            const notice = document.createElement('div');
            notice.className = 'gss-blocked-notice';
            notice.innerHTML = `
                <div class="gss-blocked-notice-content">
                    <span class="gss-blocked-notice-icon">🚫</span>
                    <span>Blocked: <span class="gss-blocked-notice-domain">${domain}</span></span>
                </div>
                <div class="gss-blocked-notice-actions">
                    <button class="gss-notice-btn gss-notice-btn-show" data-action="show">Show Once</button>
                    <button class="gss-notice-btn gss-notice-btn-unblock" data-action="unblock">Unblock</button>
                </div>
            `;

            // Event listeners
            notice.querySelector('[data-action="show"]').addEventListener('click', () => {
                resultElement.classList.add('gss-show-temp');
                resultElement.classList.remove('gss-result-hidden');
            });

            notice.querySelector('[data-action="unblock"]').addEventListener('click', () => {
                this.unblockDomain(domain);
                resultElement.classList.remove('gss-result-hidden', 'gss-show-temp');
                notice.remove();
                this.addBlockButton(resultElement, domain);
            });

            resultElement.insertBefore(notice, resultElement.firstChild);
        }

        addBlockButton(resultElement, domain) {
            if (!this.app.settings.showBlockButtons) return;

            // Find the title element
            const titleContainer = resultElement.querySelector('h3')?.parentElement;
            if (!titleContainer) return;

            // Check if button already exists
            if (resultElement.querySelector('.gss-block-btn')) return;

            const button = document.createElement('button');
            button.className = 'gss-block-btn';
            button.innerHTML = `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
                </svg>
                Block
            `;
            button.title = `Block ${domain}`;

            button.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.showBlockDialog(domain, resultElement);
            });

            titleContainer.appendChild(button);
        }

        showBlockDialog(domain, resultElement) {
            // Create modal overlay
            const overlay = document.createElement('div');
            overlay.className = 'gss-modal-overlay';

            // Calculate domain options
            const domainParts = domain.split('.');
            const domainOptions = [];

            // Full domain
            domainOptions.push({ value: domain, label: domain });

            // Parent domains
            if (domainParts.length > 2) {
                const parentDomain = domainParts.slice(1).join('.');
                domainOptions.push({ value: parentDomain, label: parentDomain + ' (all subdomains)' });
            }

            overlay.innerHTML = `
                <div class="gss-modal">
                    <div class="gss-modal-header">
                        <h2>Block Domain</h2>
                        <button class="gss-modal-close" aria-label="Close">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="18" y1="6" x2="6" y2="18"/>
                                <line x1="6" y1="6" x2="18" y2="18"/>
                            </svg>
                        </button>
                    </div>
                    <div class="gss-modal-body">
                        <div class="gss-form-group">
                            <label class="gss-form-label">Select domain to block:</label>
                            <div class="gss-radio-group">
                                ${domainOptions.map((opt, i) => `
                                    <label class="gss-radio-label">
                                        <input type="radio" name="gss-block-domain" value="${opt.value}" ${i === 0 ? 'checked' : ''}>
                                        <span class="gss-radio-custom"></span>
                                        <span class="gss-radio-text">${opt.label}</span>
                                    </label>
                                `).join('')}
                            </div>
                        </div>
                        <div class="gss-form-group">
                            <label class="gss-form-label">Block type:</label>
                            <div class="gss-radio-group">
                                <label class="gss-radio-label">
                                    <input type="radio" name="gss-block-type" value="block" checked>
                                    <span class="gss-radio-custom"></span>
                                    <span class="gss-radio-text">
                                        <strong>Block</strong>
                                        <small>Show notice, can reveal temporarily</small>
                                    </span>
                                </label>
                                <label class="gss-radio-label">
                                    <input type="radio" name="gss-block-type" value="permaban">
                                    <span class="gss-radio-custom"></span>
                                    <span class="gss-radio-text">
                                        <strong>Permanent Ban</strong>
                                        <small>Completely hide, no notice</small>
                                    </span>
                                </label>
                            </div>
                        </div>
                    </div>
                    <div class="gss-modal-footer">
                        <button class="gss-btn gss-btn-secondary gss-modal-cancel">Cancel</button>
                        <button class="gss-btn gss-btn-primary gss-modal-confirm">Block Domain</button>
                    </div>
                </div>
            `;

            document.body.appendChild(overlay);
            requestAnimationFrame(() => overlay.classList.add('gss-modal-visible'));

            // Event handlers
            const close = () => {
                overlay.classList.remove('gss-modal-visible');
                setTimeout(() => overlay.remove(), 200);
            };

            overlay.querySelector('.gss-modal-close').addEventListener('click', close);
            overlay.querySelector('.gss-modal-cancel').addEventListener('click', close);
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) close();
            });

            overlay.querySelector('.gss-modal-confirm').addEventListener('click', () => {
                const selectedDomain = overlay.querySelector('input[name="gss-block-domain"]:checked').value;
                const blockType = overlay.querySelector('input[name="gss-block-type"]:checked').value;

                this.blockDomain(selectedDomain, blockType);

                // Animate out the result
                if (this.app.settings.animateBlocking) {
                    resultElement.classList.add('gss-blocking');
                    setTimeout(() => {
                        this.processResult(resultElement);
                    }, 300);
                } else {
                    this.processResult(resultElement);
                }

                close();
            });

            // ESC to close
            const escHandler = (e) => {
                if (e.key === 'Escape') {
                    close();
                    document.removeEventListener('keydown', escHandler);
                }
            };
            document.addEventListener('keydown', escHandler);
        }

        blockDomain(domain, type = 'block') {
            // Check if already blocked
            const existing = this.app.blockedDomains.findIndex(b => b.domain === domain);
            if (existing >= 0) {
                this.app.blockedDomains[existing].type = type;
            } else {
                this.app.blockedDomains.push({
                    domain: domain,
                    type: type,
                    addedAt: Date.now()
                });
            }

            this.app.saveData();
            this.app.events.emit('domainBlocked', { domain, type });
            this.reprocessAll();
        }

        unblockDomain(domain) {
            this.app.blockedDomains = this.app.blockedDomains.filter(b => b.domain !== domain);
            this.app.saveData();
            this.app.events.emit('domainUnblocked', { domain });
            this.app.uiManager.showToast(`Unblocked: ${domain}`, 'success');
        }

        reprocessAll() {
            // Reset processed tracking
            document.querySelectorAll('.gss-processed').forEach(el => {
                el.classList.remove('gss-processed', 'gss-result-hidden', 'gss-permaban', 'gss-show-temp', 'gss-hidden');
                el.querySelector('.gss-blocked-notice')?.remove();
                el.querySelector('.gss-block-btn')?.remove();
                el.querySelector('.gss-unblock-btn')?.remove();
                this.processedResults.delete(el);
            });

            this.processResults();
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // ENDLESS SCROLL
    // ═══════════════════════════════════════════════════════════════════════════════

    class EndlessScroll {
        constructor(app) {
            this.app = app;
            this.page = 1;
            this.loading = false;
            this.finished = false;
            this.container = null;
            this.boundOnScroll = null;
            this.init();
        }

        init() {
            if (!this.app.settings.endlessScrollEnabled) return;

            this.container = document.getElementById('rso');
            if (!this.container) {
                this.app.logger.warn('Could not find results container for endless scroll');
                return;
            }

            this.injectStyles();
            this.boundOnScroll = this.onScroll.bind(this);
            window.addEventListener('scroll', this.boundOnScroll, { passive: true });

            // Hide native pagination
            this.hideNativePagination();

            this.app.logger.debug('Endless scroll initialized');
        }

        injectStyles() {
            GM_addStyle(`
                /* ═══════════════════════════════════════════════════════════════════════════════
                   ENDLESS SCROLL STYLES
                   ═══════════════════════════════════════════════════════════════════════════════ */

                /* Hide native pagination */
                #botstuff .AaVjTc,
                .AaVjTc,
                #navcnt,
                .navigation {
                    display: none !important;
                }

                /* Page indicator */
                .gss-page-indicator {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 16px 24px;
                    margin: 24px 0;
                    font-family: 'Google Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    font-size: 13px;
                    font-weight: 500;
                    color: var(--gss-text-secondary);
                    background: var(--gss-bg-secondary);
                    border-radius: var(--gss-radius);
                    border: 1px solid var(--gss-border);
                }

                .gss-page-indicator::before {
                    content: '';
                    display: block;
                    width: 40px;
                    height: 1px;
                    background: var(--gss-border);
                    margin-right: 16px;
                }

                .gss-page-indicator::after {
                    content: '';
                    display: block;
                    width: 40px;
                    height: 1px;
                    background: var(--gss-border);
                    margin-left: 16px;
                }

                /* Loading spinner */
                .gss-loading {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 32px;
                    margin: 24px 0;
                }

                .gss-spinner {
                    width: 32px;
                    height: 32px;
                    border: 3px solid var(--gss-border);
                    border-top-color: var(--gss-accent);
                    border-radius: 50%;
                    animation: gss-spin 0.8s linear infinite;
                }

                @keyframes gss-spin {
                    to { transform: rotate(360deg); }
                }

                /* End message */
                .gss-end-message {
                    text-align: center;
                    padding: 32px;
                    margin: 24px 0;
                    font-family: 'Google Sans', sans-serif;
                    font-size: 14px;
                    color: var(--gss-text-muted);
                }

                .gss-end-message svg {
                    display: block;
                    width: 48px;
                    height: 48px;
                    margin: 0 auto 12px;
                    opacity: 0.5;
                }
            `);
        }

        hideNativePagination() {
            const paginationSelectors = ['#botstuff .AaVjTc', '.AaVjTc', '#navcnt', '.navigation'];
            paginationSelectors.forEach(selector => {
                document.querySelectorAll(selector).forEach(el => el.style.display = 'none');
            });
        }

        onScroll() {
            if (this.loading || this.finished) return;
            if (this.page >= this.app.settings.maxAutoLoadPages) {
                this.showEndMessage('Maximum pages loaded');
                this.finished = true;
                return;
            }

            const scrollBottom = window.scrollY + window.innerHeight;
            const threshold = document.documentElement.scrollHeight - (window.innerHeight * this.app.settings.preloadDistance);

            if (scrollBottom >= threshold) {
                this.loadNextPage();
            }
        }

        async loadNextPage() {
            this.loading = true;
            this.page++;

            this.showLoading();

            const nextUrl = new URL(location.href);
            nextUrl.searchParams.set('start', (this.page - 1) * 10);

            try {
                const response = await fetch(nextUrl.href);
                const text = await response.text();
                const doc = new DOMParser().parseFromString(text, 'text/html');
                const results = doc.getElementById('rso');

                if (!results || results.children.length === 0) {
                    this.finished = true;
                    this.hideLoading();
                    this.showEndMessage('No more results');
                    return;
                }

                // Add page indicator
                if (this.app.settings.showPageIndicators) {
                    const indicator = document.createElement('div');
                    indicator.className = 'gss-page-indicator';
                    indicator.textContent = `Page ${this.page}`;
                    this.container.appendChild(indicator);
                }

                // Append results
                while (results.firstChild) {
                    this.container.appendChild(results.firstChild);
                }

                this.hideLoading();

                // Update statistics
                this.app.statistics.pages++;
                this.app.saveData();

                // Emit event for domain filter
                this.app.events.emit('newResultsLoaded', this.container);

                this.app.logger.debug(`Loaded page ${this.page}`);

            } catch (error) {
                this.app.logger.error('Error loading next page:', error);
                this.finished = true;
                this.hideLoading();
                this.showEndMessage('Error loading more results');
            } finally {
                this.loading = false;
            }
        }

        showLoading() {
            this.hideLoading();
            const loader = document.createElement('div');
            loader.className = 'gss-loading';
            loader.id = 'gss-loader';
            loader.innerHTML = '<div class="gss-spinner"></div>';
            this.container.appendChild(loader);
        }

        hideLoading() {
            document.getElementById('gss-loader')?.remove();
        }

        showEndMessage(text) {
            const msg = document.createElement('div');
            msg.className = 'gss-end-message';
            msg.innerHTML = `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="8" x2="12" y2="12"/>
                    <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                ${text}
            `;
            this.container.appendChild(msg);
        }

        disable() {
            if (this.boundOnScroll) {
                window.removeEventListener('scroll', this.boundOnScroll);
            }
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // UI MANAGER
    // ═══════════════════════════════════════════════════════════════════════════════

    class UIManager {
        constructor(app) {
            this.app = app;
            this.settingsPanelVisible = false;
            this.init();
        }

        init() {
            this.injectStyles();
            this.createToolbar();
            this.createSettingsPanel();
        }

        injectStyles() {
            GM_addStyle(`
                /* ═══════════════════════════════════════════════════════════════════════════════
                   UI MANAGER STYLES
                   ═══════════════════════════════════════════════════════════════════════════════ */

                /* Google Sans font */
                @import url('https://fonts.googleapis.com/css2?family=Google+Sans:wght@400;500;700&display=swap');

                /* Toolbar */
                .gss-toolbar {
                    position: fixed;
                    top: 50%;
                    right: 0;
                    transform: translateY(-50%);
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                    padding: 12px 8px;
                    background: var(--gss-bg);
                    border: 1px solid var(--gss-border);
                    border-right: none;
                    border-radius: var(--gss-radius) 0 0 var(--gss-radius);
                    box-shadow: var(--gss-shadow);
                    z-index: 9999;
                    transition: transform var(--gss-transition);
                }

                .gss-toolbar:hover {
                    transform: translateY(-50%) translateX(0);
                }

                .gss-toolbar-btn {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 40px;
                    height: 40px;
                    padding: 0;
                    background: transparent;
                    border: none;
                    border-radius: var(--gss-radius-sm);
                    color: var(--gss-text-secondary);
                    cursor: pointer;
                    transition: all var(--gss-transition);
                }

                .gss-toolbar-btn:hover {
                    background: var(--gss-hover);
                    color: var(--gss-accent);
                }

                .gss-toolbar-btn svg {
                    width: 22px;
                    height: 22px;
                }

                .gss-toolbar-btn.gss-active {
                    background: rgba(var(--gss-accent-rgb), 0.1);
                    color: var(--gss-accent);
                }

                .gss-toolbar-divider {
                    width: 24px;
                    height: 1px;
                    margin: 4px auto;
                    background: var(--gss-border);
                }

                /* Stats badge */
                .gss-stats-badge {
                    position: absolute;
                    top: -4px;
                    right: -4px;
                    min-width: 18px;
                    height: 18px;
                    padding: 0 5px;
                    font-size: 10px;
                    font-weight: 700;
                    line-height: 18px;
                    text-align: center;
                    color: white;
                    background: #f44336;
                    border-radius: 100px;
                }

                /* Toast notifications */
                .gss-toast-container {
                    position: fixed;
                    bottom: 24px;
                    left: 50%;
                    transform: translateX(-50%);
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                    z-index: 10001;
                    pointer-events: none;
                }

                .gss-toast {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    padding: 14px 20px;
                    font-family: 'Google Sans', sans-serif;
                    font-size: 14px;
                    font-weight: 500;
                    color: white;
                    background: #323232;
                    border-radius: var(--gss-radius);
                    box-shadow: var(--gss-shadow-lg);
                    pointer-events: auto;
                    animation: gss-toastIn 0.3s ease-out;
                }

                .gss-toast-success {
                    background: #4caf50;
                }

                .gss-toast-error {
                    background: #f44336;
                }

                .gss-toast-info {
                    background: var(--gss-accent);
                }

                .gss-toast-icon {
                    font-size: 18px;
                }

                @keyframes gss-toastIn {
                    from {
                        opacity: 0;
                        transform: translateY(20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }

                @keyframes gss-toastOut {
                    from {
                        opacity: 1;
                        transform: translateY(0);
                    }
                    to {
                        opacity: 0;
                        transform: translateY(20px);
                    }
                }

                /* Modal styles */
                .gss-modal-overlay {
                    position: fixed;
                    inset: 0;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: rgba(0, 0, 0, 0.5);
                    backdrop-filter: blur(4px);
                    z-index: 10000;
                    opacity: 0;
                    transition: opacity 0.2s ease;
                }

                .gss-modal-overlay.gss-modal-visible {
                    opacity: 1;
                }

                .gss-modal {
                    width: 90%;
                    max-width: 440px;
                    max-height: 90vh;
                    overflow-y: auto;
                    background: var(--gss-bg);
                    border-radius: var(--gss-radius);
                    box-shadow: var(--gss-shadow-lg);
                    transform: scale(0.95);
                    transition: transform 0.2s ease;
                }

                .gss-modal-visible .gss-modal {
                    transform: scale(1);
                }

                .gss-modal-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 20px 24px;
                    border-bottom: 1px solid var(--gss-border);
                }

                .gss-modal-header h2 {
                    margin: 0;
                    font-family: 'Google Sans', sans-serif;
                    font-size: 18px;
                    font-weight: 500;
                    color: var(--gss-text);
                }

                .gss-modal-close {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 36px;
                    height: 36px;
                    padding: 0;
                    background: transparent;
                    border: none;
                    border-radius: 50%;
                    color: var(--gss-text-secondary);
                    cursor: pointer;
                    transition: all var(--gss-transition);
                }

                .gss-modal-close:hover {
                    background: var(--gss-hover);
                    color: var(--gss-text);
                }

                .gss-modal-close svg {
                    width: 20px;
                    height: 20px;
                }

                .gss-modal-body {
                    padding: 24px;
                }

                .gss-modal-footer {
                    display: flex;
                    justify-content: flex-end;
                    gap: 12px;
                    padding: 16px 24px;
                    border-top: 1px solid var(--gss-border);
                }

                /* Form elements */
                .gss-form-group {
                    margin-bottom: 20px;
                }

                .gss-form-group:last-child {
                    margin-bottom: 0;
                }

                .gss-form-label {
                    display: block;
                    margin-bottom: 10px;
                    font-family: 'Google Sans', sans-serif;
                    font-size: 14px;
                    font-weight: 500;
                    color: var(--gss-text);
                }

                .gss-radio-group {
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                }

                .gss-radio-label {
                    display: flex;
                    align-items: flex-start;
                    gap: 12px;
                    padding: 12px;
                    background: var(--gss-bg-secondary);
                    border: 1px solid var(--gss-border);
                    border-radius: var(--gss-radius-sm);
                    cursor: pointer;
                    transition: all var(--gss-transition);
                }

                .gss-radio-label:hover {
                    border-color: var(--gss-accent);
                }

                .gss-radio-label input {
                    display: none;
                }

                .gss-radio-custom {
                    flex-shrink: 0;
                    width: 20px;
                    height: 20px;
                    margin-top: 2px;
                    border: 2px solid var(--gss-border);
                    border-radius: 50%;
                    transition: all var(--gss-transition);
                }

                .gss-radio-label input:checked + .gss-radio-custom {
                    border-color: var(--gss-accent);
                    background: var(--gss-accent);
                    box-shadow: inset 0 0 0 4px var(--gss-bg);
                }

                .gss-radio-text {
                    flex: 1;
                    font-family: 'Google Sans', sans-serif;
                    font-size: 14px;
                    color: var(--gss-text);
                    line-height: 1.4;
                }

                .gss-radio-text strong {
                    display: block;
                    margin-bottom: 2px;
                }

                .gss-radio-text small {
                    display: block;
                    font-size: 12px;
                    color: var(--gss-text-muted);
                }

                /* Buttons */
                .gss-btn {
                    padding: 10px 20px;
                    font-family: 'Google Sans', sans-serif;
                    font-size: 14px;
                    font-weight: 500;
                    border: none;
                    border-radius: 100px;
                    cursor: pointer;
                    transition: all var(--gss-transition);
                }

                .gss-btn-primary {
                    color: white;
                    background: var(--gss-accent);
                }

                .gss-btn-primary:hover {
                    background: #3367d6;
                    transform: translateY(-1px);
                    box-shadow: 0 2px 8px rgba(66, 133, 244, 0.3);
                }

                .gss-btn-secondary {
                    color: var(--gss-text);
                    background: var(--gss-bg-secondary);
                    border: 1px solid var(--gss-border);
                }

                .gss-btn-secondary:hover {
                    background: var(--gss-hover);
                }

                .gss-btn-danger {
                    color: white;
                    background: #f44336;
                }

                .gss-btn-danger:hover {
                    background: #d32f2f;
                }

                /* Settings Panel */
                .gss-settings-overlay {
                    position: fixed;
                    inset: 0;
                    background: rgba(0, 0, 0, 0.5);
                    backdrop-filter: blur(4px);
                    z-index: 10000;
                    opacity: 0;
                    visibility: hidden;
                    transition: all 0.3s ease;
                }

                .gss-settings-overlay.gss-visible {
                    opacity: 1;
                    visibility: visible;
                }

                .gss-settings-panel {
                    position: fixed;
                    top: 0;
                    right: -500px;
                    width: 480px;
                    max-width: 90vw;
                    height: 100vh;
                    background: var(--gss-bg);
                    box-shadow: var(--gss-shadow-lg);
                    z-index: 10001;
                    display: flex;
                    flex-direction: column;
                    transition: right 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                }

                .gss-settings-overlay.gss-visible + .gss-settings-panel,
                .gss-settings-panel.gss-visible {
                    right: 0;
                }

                .gss-settings-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 20px 24px;
                    background: linear-gradient(135deg, var(--gss-accent) 0%, #3367d6 100%);
                    color: white;
                }

                .gss-settings-header h2 {
                    margin: 0;
                    font-family: 'Google Sans', sans-serif;
                    font-size: 20px;
                    font-weight: 500;
                }

                .gss-settings-version {
                    font-size: 12px;
                    opacity: 0.8;
                    margin-top: 2px;
                }

                .gss-settings-close {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 40px;
                    height: 40px;
                    padding: 0;
                    background: rgba(255, 255, 255, 0.1);
                    border: none;
                    border-radius: 50%;
                    color: white;
                    cursor: pointer;
                    transition: all var(--gss-transition);
                }

                .gss-settings-close:hover {
                    background: rgba(255, 255, 255, 0.2);
                }

                .gss-settings-close svg {
                    width: 24px;
                    height: 24px;
                }

                .gss-settings-tabs {
                    display: flex;
                    border-bottom: 1px solid var(--gss-border);
                    background: var(--gss-bg-secondary);
                }

                .gss-settings-tab {
                    flex: 1;
                    padding: 14px;
                    font-family: 'Google Sans', sans-serif;
                    font-size: 13px;
                    font-weight: 500;
                    color: var(--gss-text-secondary);
                    background: transparent;
                    border: none;
                    border-bottom: 2px solid transparent;
                    cursor: pointer;
                    transition: all var(--gss-transition);
                }

                .gss-settings-tab:hover {
                    color: var(--gss-text);
                    background: var(--gss-hover);
                }

                .gss-settings-tab.gss-active {
                    color: var(--gss-accent);
                    border-bottom-color: var(--gss-accent);
                }

                .gss-settings-content {
                    flex: 1;
                    overflow-y: auto;
                    padding: 0;
                }

                .gss-settings-pane {
                    display: none;
                    padding: 24px;
                }

                .gss-settings-pane.gss-active {
                    display: block;
                }

                .gss-settings-section {
                    margin-bottom: 28px;
                }

                .gss-settings-section:last-child {
                    margin-bottom: 0;
                }

                .gss-settings-section-title {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    margin-bottom: 16px;
                    font-family: 'Google Sans', sans-serif;
                    font-size: 14px;
                    font-weight: 500;
                    color: var(--gss-accent);
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }

                .gss-settings-section-title svg {
                    width: 18px;
                    height: 18px;
                }

                /* Toggle switch */
                .gss-setting-item {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 14px 16px;
                    margin-bottom: 8px;
                    background: var(--gss-bg-secondary);
                    border: 1px solid var(--gss-border);
                    border-radius: var(--gss-radius-sm);
                    transition: all var(--gss-transition);
                }

                .gss-setting-item:hover {
                    border-color: var(--gss-accent);
                }

                .gss-setting-item:last-child {
                    margin-bottom: 0;
                }

                .gss-setting-info {
                    flex: 1;
                    margin-right: 16px;
                }

                .gss-setting-name {
                    font-family: 'Google Sans', sans-serif;
                    font-size: 14px;
                    font-weight: 500;
                    color: var(--gss-text);
                    margin-bottom: 2px;
                }

                .gss-setting-desc {
                    font-size: 12px;
                    color: var(--gss-text-muted);
                    line-height: 1.4;
                }

                .gss-toggle {
                    position: relative;
                    width: 48px;
                    height: 28px;
                    flex-shrink: 0;
                }

                .gss-toggle input {
                    opacity: 0;
                    width: 0;
                    height: 0;
                }

                .gss-toggle-slider {
                    position: absolute;
                    inset: 0;
                    background: var(--gss-border);
                    border-radius: 100px;
                    cursor: pointer;
                    transition: all var(--gss-transition);
                }

                .gss-toggle-slider::before {
                    content: '';
                    position: absolute;
                    top: 3px;
                    left: 3px;
                    width: 22px;
                    height: 22px;
                    background: white;
                    border-radius: 50%;
                    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
                    transition: all var(--gss-transition);
                }

                .gss-toggle input:checked + .gss-toggle-slider {
                    background: var(--gss-accent);
                }

                .gss-toggle input:checked + .gss-toggle-slider::before {
                    transform: translateX(20px);
                }

                /* Range slider */
                .gss-range-container {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }

                .gss-range {
                    flex: 1;
                    -webkit-appearance: none;
                    appearance: none;
                    height: 6px;
                    background: var(--gss-border);
                    border-radius: 100px;
                    outline: none;
                }

                .gss-range::-webkit-slider-thumb {
                    -webkit-appearance: none;
                    appearance: none;
                    width: 18px;
                    height: 18px;
                    background: var(--gss-accent);
                    border-radius: 50%;
                    cursor: pointer;
                    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
                }

                .gss-range-value {
                    min-width: 60px;
                    font-family: 'Google Sans', sans-serif;
                    font-size: 13px;
                    font-weight: 500;
                    color: var(--gss-text);
                    text-align: right;
                }

                /* Select dropdown */
                .gss-select {
                    padding: 10px 36px 10px 14px;
                    font-family: 'Google Sans', sans-serif;
                    font-size: 14px;
                    color: var(--gss-text);
                    background: var(--gss-bg);
                    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%235f6368'%3E%3Cpath d='M7 10l5 5 5-5z'/%3E%3C/svg%3E");
                    background-repeat: no-repeat;
                    background-position: right 8px center;
                    background-size: 20px;
                    border: 1px solid var(--gss-border);
                    border-radius: var(--gss-radius-sm);
                    cursor: pointer;
                    -webkit-appearance: none;
                    appearance: none;
                }

                .gss-select:focus {
                    outline: none;
                    border-color: var(--gss-accent);
                }

                /* Blocked domains list */
                .gss-domains-list {
                    max-height: 300px;
                    overflow-y: auto;
                    border: 1px solid var(--gss-border);
                    border-radius: var(--gss-radius-sm);
                    background: var(--gss-bg);
                }

                .gss-domain-item {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 12px 16px;
                    border-bottom: 1px solid var(--gss-border);
                }

                .gss-domain-item:last-child {
                    border-bottom: none;
                }

                .gss-domain-item:nth-child(odd) {
                    background: var(--gss-bg-secondary);
                }

                .gss-domain-name {
                    font-family: 'Google Sans', sans-serif;
                    font-size: 13px;
                    color: var(--gss-text);
                }

                .gss-domain-type {
                    font-size: 11px;
                    padding: 2px 8px;
                    border-radius: 100px;
                    margin-left: 8px;
                }

                .gss-domain-type-block {
                    background: rgba(255, 193, 7, 0.2);
                    color: #f9a825;
                }

                .gss-domain-type-permaban {
                    background: rgba(244, 67, 54, 0.2);
                    color: #f44336;
                }

                .gss-domain-remove {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 32px;
                    height: 32px;
                    padding: 0;
                    background: transparent;
                    border: none;
                    border-radius: 50%;
                    color: var(--gss-text-muted);
                    cursor: pointer;
                    transition: all var(--gss-transition);
                }

                .gss-domain-remove:hover {
                    background: rgba(244, 67, 54, 0.1);
                    color: #f44336;
                }

                .gss-domain-remove svg {
                    width: 18px;
                    height: 18px;
                }

                .gss-domains-empty {
                    padding: 32px;
                    text-align: center;
                    color: var(--gss-text-muted);
                    font-size: 14px;
                }

                /* Import/Export */
                .gss-import-export {
                    display: flex;
                    gap: 12px;
                    margin-top: 16px;
                }

                .gss-textarea {
                    width: 100%;
                    min-height: 120px;
                    padding: 12px;
                    font-family: 'Consolas', 'Monaco', monospace;
                    font-size: 12px;
                    color: var(--gss-text);
                    background: var(--gss-bg);
                    border: 1px solid var(--gss-border);
                    border-radius: var(--gss-radius-sm);
                    resize: vertical;
                }

                .gss-textarea:focus {
                    outline: none;
                    border-color: var(--gss-accent);
                }

                /* Stats */
                .gss-stats-grid {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 12px;
                }

                .gss-stat-card {
                    padding: 16px;
                    background: var(--gss-bg-secondary);
                    border: 1px solid var(--gss-border);
                    border-radius: var(--gss-radius-sm);
                    text-align: center;
                }

                .gss-stat-value {
                    font-family: 'Google Sans', sans-serif;
                    font-size: 28px;
                    font-weight: 700;
                    color: var(--gss-accent);
                    margin-bottom: 4px;
                }

                .gss-stat-label {
                    font-size: 12px;
                    color: var(--gss-text-muted);
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }

                /* Settings footer */
                .gss-settings-footer {
                    padding: 16px 24px;
                    border-top: 1px solid var(--gss-border);
                    background: var(--gss-bg-secondary);
                }

                .gss-settings-footer-actions {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }

                /* Add domain input */
                .gss-add-domain {
                    display: flex;
                    gap: 8px;
                    margin-bottom: 12px;
                }

                .gss-input {
                    flex: 1;
                    padding: 10px 14px;
                    font-family: 'Google Sans', sans-serif;
                    font-size: 14px;
                    color: var(--gss-text);
                    background: var(--gss-bg);
                    border: 1px solid var(--gss-border);
                    border-radius: var(--gss-radius-sm);
                }

                .gss-input:focus {
                    outline: none;
                    border-color: var(--gss-accent);
                }

                .gss-input::placeholder {
                    color: var(--gss-text-muted);
                }
            `);
        }

        render() {
            // Initial render is done in createToolbar and createSettingsPanel
        }

        createToolbar() {
            const toolbar = document.createElement('div');
            toolbar.className = 'gss-toolbar';
            toolbar.innerHTML = `
                <button class="gss-toolbar-btn" data-action="settings" title="Settings">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="3"/>
                        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                    </svg>
                </button>
                <div class="gss-toolbar-divider"></div>
                <button class="gss-toolbar-btn ${this.app.settings.filteringEnabled ? 'gss-active' : ''}" data-action="toggle-filter" title="Toggle Filtering">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
                    </svg>
                    ${this.app.statistics.blocked > 0 ? `<span class="gss-stats-badge">${this.app.statistics.blocked}</span>` : ''}
                </button>
                <button class="gss-toolbar-btn ${this.app.settings.endlessScrollEnabled ? 'gss-active' : ''}" data-action="toggle-scroll" title="Toggle Endless Scroll">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="12" y1="5" x2="12" y2="19"/>
                        <polyline points="19 12 12 19 5 12"/>
                    </svg>
                </button>
            `;

            toolbar.addEventListener('click', (e) => {
                const btn = e.target.closest('.gss-toolbar-btn');
                if (!btn) return;

                const action = btn.dataset.action;
                switch (action) {
                    case 'settings':
                        this.toggleSettingsPanel();
                        break;
                    case 'toggle-filter':
                        this.app.settings.filteringEnabled = !this.app.settings.filteringEnabled;
                        btn.classList.toggle('gss-active', this.app.settings.filteringEnabled);
                        this.app.events.emit('settingsChanged');
                        this.showToast(
                            `Filtering ${this.app.settings.filteringEnabled ? 'enabled' : 'disabled'}`,
                            'info'
                        );
                        break;
                    case 'toggle-scroll':
                        this.app.settings.endlessScrollEnabled = !this.app.settings.endlessScrollEnabled;
                        btn.classList.toggle('gss-active', this.app.settings.endlessScrollEnabled);
                        this.app.events.emit('settingsChanged');
                        this.showToast(
                            `Endless scroll ${this.app.settings.endlessScrollEnabled ? 'enabled' : 'disabled'}`,
                            'info'
                        );
                        if (this.app.settings.endlessScrollEnabled) {
                            this.app.endlessScroll?.init();
                        } else {
                            this.app.endlessScroll?.disable();
                        }
                        break;
                }
            });

            document.body.appendChild(toolbar);
        }

        createSettingsPanel() {
            const overlay = document.createElement('div');
            overlay.className = 'gss-settings-overlay';
            overlay.id = 'gss-settings-overlay';

            const panel = document.createElement('div');
            panel.className = 'gss-settings-panel';
            panel.id = 'gss-settings-panel';

            panel.innerHTML = this.getSettingsPanelHTML();

            document.body.appendChild(overlay);
            document.body.appendChild(panel);

            // Event listeners
            overlay.addEventListener('click', () => this.toggleSettingsPanel(false));

            panel.querySelector('.gss-settings-close').addEventListener('click', () => {
                this.toggleSettingsPanel(false);
            });

            // Tab switching
            panel.querySelectorAll('.gss-settings-tab').forEach(tab => {
                tab.addEventListener('click', () => {
                    panel.querySelectorAll('.gss-settings-tab').forEach(t => t.classList.remove('gss-active'));
                    panel.querySelectorAll('.gss-settings-pane').forEach(p => p.classList.remove('gss-active'));
                    tab.classList.add('gss-active');
                    panel.querySelector(`[data-pane="${tab.dataset.tab}"]`).classList.add('gss-active');
                });
            });

            // Setting toggles
            panel.querySelectorAll('.gss-toggle input').forEach(input => {
                input.addEventListener('change', () => {
                    const key = input.dataset.setting;
                    this.app.settings[key] = input.checked;
                    this.app.events.emit('settingsChanged');
                });
            });

            // Range sliders
            panel.querySelectorAll('.gss-range').forEach(range => {
                range.addEventListener('input', () => {
                    const key = range.dataset.setting;
                    const value = parseInt(range.value);
                    this.app.settings[key] = value;
                    range.nextElementSibling.textContent = `${value}px`;
                    this.app.events.emit('settingsChanged');
                });
            });

            // Select dropdowns
            panel.querySelectorAll('.gss-select').forEach(select => {
                select.addEventListener('change', () => {
                    const key = select.dataset.setting;
                    this.app.settings[key] = select.value;
                    this.app.events.emit('settingsChanged');
                });
            });

            // Add domain
            const addDomainBtn = panel.querySelector('#gss-add-domain-btn');
            const addDomainInput = panel.querySelector('#gss-add-domain-input');

            if (addDomainBtn && addDomainInput) {
                addDomainBtn.addEventListener('click', () => {
                    const domain = addDomainInput.value.trim().toLowerCase();
                    if (domain) {
                        this.app.domainFilter.blockDomain(domain, this.app.settings.defaultBlockType);
                        addDomainInput.value = '';
                        this.renderBlockedDomainsList();
                    }
                });

                addDomainInput.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        addDomainBtn.click();
                    }
                });
            }

            // Export button
            panel.querySelector('#gss-export-btn')?.addEventListener('click', () => {
                const data = this.app.storage.export();
                const blob = new Blob([data], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `google-search-suite-backup-${new Date().toISOString().split('T')[0]}.json`;
                a.click();
                URL.revokeObjectURL(url);
                this.showToast('Settings exported!', 'success');
            });

            // Import button
            panel.querySelector('#gss-import-btn')?.addEventListener('click', () => {
                const textarea = panel.querySelector('#gss-import-textarea');
                if (textarea?.value) {
                    const result = this.app.storage.import(textarea.value);
                    if (result.success) {
                        this.showToast(result.message, 'success');
                        setTimeout(() => location.reload(), 1000);
                    } else {
                        this.showToast(result.message, 'error');
                    }
                }
            });

            // Reset button
            panel.querySelector('#gss-reset-btn')?.addEventListener('click', () => {
                if (confirm('Are you sure you want to reset all settings to defaults? This cannot be undone.')) {
                    this.app.storage.set('settings', DEFAULT_SETTINGS, true);
                    this.app.storage.set('blockedDomains', DEFAULT_BLOCKED_DOMAINS, true);
                    this.showToast('Settings reset to defaults', 'success');
                    setTimeout(() => location.reload(), 1000);
                }
            });

            // Render blocked domains list
            this.renderBlockedDomainsList();

            // Search sites toggles
            panel.querySelectorAll('.gss-site-toggle').forEach(toggle => {
                toggle.addEventListener('change', () => {
                    const index = parseInt(toggle.dataset.siteIndex);
                    this.app.searchSites[index].enabled = toggle.checked;
                    this.app.saveData();
                    this.app.searchShortcuts?.render();
                });
            });

            // Add new site
            const addSiteBtn = panel.querySelector('#gss-add-site-btn');
            if (addSiteBtn) {
                addSiteBtn.addEventListener('click', () => {
                    const name = panel.querySelector('#gss-new-site-name').value.trim();
                    const modifier = panel.querySelector('#gss-new-site-modifier').value.trim();
                    const icon = panel.querySelector('#gss-new-site-icon').value.trim() || '🔗';

                    if (name && modifier) {
                        this.app.searchSites.push({
                            name,
                            modifier,
                            icon,
                            enabled: true,
                            color: '#666'
                        });
                        this.app.saveData();
                        this.showToast(`Added: ${name}`, 'success');
                        // Refresh panel
                        this.toggleSettingsPanel(false);
                        setTimeout(() => this.toggleSettingsPanel(true), 300);
                    } else {
                        this.showToast('Please fill in name and modifier', 'error');
                    }
                });
            }

            // Remove dropdown
            panel.querySelectorAll('.gss-remove-dropdown').forEach(btn => {
                btn.addEventListener('click', () => {
                    const index = parseInt(btn.dataset.dropdownIndex);
                    this.app.dropdowns.splice(index, 1);
                    this.app.saveData();
                    this.showToast('Dropdown removed', 'success');
                    this.toggleSettingsPanel(false);
                    setTimeout(() => this.toggleSettingsPanel(true), 300);
                });
            });
        }

        getSettingsPanelHTML() {
            const s = this.app.settings;
            const stats = this.app.statistics;

            return `
                <div class="gss-settings-header">
                    <div>
                        <h2>⚡ ${APP_NAME}</h2>
                        <div class="gss-settings-version">Version ${APP_VERSION}</div>
                    </div>
                    <button class="gss-settings-close" aria-label="Close">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"/>
                            <line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                    </button>
                </div>

                <div class="gss-settings-tabs">
                    <button class="gss-settings-tab gss-active" data-tab="general">General</button>
                    <button class="gss-settings-tab" data-tab="shortcuts">Shortcuts</button>
                    <button class="gss-settings-tab" data-tab="filtering">Filtering</button>
                    <button class="gss-settings-tab" data-tab="blocked">Blocked</button>
                    <button class="gss-settings-tab" data-tab="advanced">Advanced</button>
                </div>

                <div class="gss-settings-content">
                    <!-- General Settings -->
                    <div class="gss-settings-pane gss-active" data-pane="general">
                        <div class="gss-settings-section">
                            <div class="gss-settings-section-title">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                                </svg>
                                Statistics
                            </div>
                            <div class="gss-stats-grid">
                                <div class="gss-stat-card">
                                    <div class="gss-stat-value">${stats.blocked}</div>
                                    <div class="gss-stat-label">Blocked</div>
                                </div>
                                <div class="gss-stat-card">
                                    <div class="gss-stat-value">${stats.pages}</div>
                                    <div class="gss-stat-label">Pages</div>
                                </div>
                                <div class="gss-stat-card">
                                    <div class="gss-stat-value">${stats.searches}</div>
                                    <div class="gss-stat-label">Searches</div>
                                </div>
                            </div>
                        </div>

                        <div class="gss-settings-section">
                            <div class="gss-settings-section-title">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <circle cx="12" cy="12" r="5"/>
                                    <line x1="12" y1="1" x2="12" y2="3"/>
                                    <line x1="12" y1="21" x2="12" y2="23"/>
                                    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
                                    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                                    <line x1="1" y1="12" x2="3" y2="12"/>
                                    <line x1="21" y1="12" x2="23" y2="12"/>
                                    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
                                    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
                                </svg>
                                Appearance
                            </div>

                            <div class="gss-setting-item">
                                <div class="gss-setting-info">
                                    <div class="gss-setting-name">Theme</div>
                                    <div class="gss-setting-desc">Choose your preferred color scheme</div>
                                </div>
                                <select class="gss-select" data-setting="theme">
                                    <option value="auto" ${s.theme === 'auto' ? 'selected' : ''}>Auto</option>
                                    <option value="light" ${s.theme === 'light' ? 'selected' : ''}>Light</option>
                                    <option value="dark" ${s.theme === 'dark' ? 'selected' : ''}>Dark</option>
                                </select>
                            </div>

                            <div class="gss-setting-item">
                                <div class="gss-setting-info">
                                    <div class="gss-setting-name">Results Width</div>
                                    <div class="gss-setting-desc">Maximum width of search results</div>
                                </div>
                                <div class="gss-range-container">
                                    <input type="range" class="gss-range" data-setting="resultsWidth" min="600" max="1400" step="50" value="${s.resultsWidth}">
                                    <span class="gss-range-value">${s.resultsWidth}px</span>
                                </div>
                            </div>

                            <div class="gss-setting-item">
                                <div class="gss-setting-info">
                                    <div class="gss-setting-name">Center Content</div>
                                    <div class="gss-setting-desc">Center search results and reorganize layout</div>
                                </div>
                                <label class="gss-toggle">
                                    <input type="checkbox" data-setting="centerContent" ${s.centerContent ? 'checked' : ''}>
                                    <span class="gss-toggle-slider"></span>
                                </label>
                            </div>

                            <div class="gss-setting-item">
                                <div class="gss-setting-info">
                                    <div class="gss-setting-name">Highlight Dates</div>
                                    <div class="gss-setting-desc">Make dates stand out in results</div>
                                </div>
                                <label class="gss-toggle">
                                    <input type="checkbox" data-setting="highlightDates" ${s.highlightDates ? 'checked' : ''}>
                                    <span class="gss-toggle-slider"></span>
                                </label>
                            </div>
                        </div>

                        <div class="gss-settings-section">
                            <div class="gss-settings-section-title">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <rect x="3" y="3" width="7" height="7"/>
                                    <rect x="14" y="3" width="7" height="7"/>
                                    <rect x="14" y="14" width="7" height="7"/>
                                    <rect x="3" y="14" width="7" height="7"/>
                                </svg>
                                Features
                            </div>

                            <div class="gss-setting-item">
                                <div class="gss-setting-info">
                                    <div class="gss-setting-name">Domain Filtering</div>
                                    <div class="gss-setting-desc">Block unwanted sites from results</div>
                                </div>
                                <label class="gss-toggle">
                                    <input type="checkbox" data-setting="filteringEnabled" ${s.filteringEnabled ? 'checked' : ''}>
                                    <span class="gss-toggle-slider"></span>
                                </label>
                            </div>

                            <div class="gss-setting-item">
                                <div class="gss-setting-info">
                                    <div class="gss-setting-name">Endless Scrolling</div>
                                    <div class="gss-setting-desc">Automatically load more results</div>
                                </div>
                                <label class="gss-toggle">
                                    <input type="checkbox" data-setting="endlessScrollEnabled" ${s.endlessScrollEnabled ? 'checked' : ''}>
                                    <span class="gss-toggle-slider"></span>
                                </label>
                            </div>

                            <div class="gss-setting-item">
                                <div class="gss-setting-info">
                                    <div class="gss-setting-name">Show Block Buttons</div>
                                    <div class="gss-setting-desc">Display block button next to results</div>
                                </div>
                                <label class="gss-toggle">
                                    <input type="checkbox" data-setting="showBlockButtons" ${s.showBlockButtons ? 'checked' : ''}>
                                    <span class="gss-toggle-slider"></span>
                                </label>
                            </div>
                        </div>
                    </div>

                    <!-- Search Shortcuts -->
                    <div class="gss-settings-pane" data-pane="shortcuts">
                        <div class="gss-settings-section">
                            <div class="gss-settings-section-title">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <circle cx="11" cy="11" r="8"/>
                                    <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                                </svg>
                                Quick Search Sites
                            </div>
                            <p style="color: var(--gss-text-secondary); font-size: 13px; margin-bottom: 16px;">
                                Toggle which sites appear as quick search buttons. Click a button to search within that site.
                            </p>
                            <div id="gss-search-sites-list">
                                ${this.app.searchSites.map((site, i) => `
                                    <div class="gss-setting-item" data-site-index="${i}">
                                        <div class="gss-setting-info">
                                            <div class="gss-setting-name">${site.icon} ${site.name}</div>
                                            <div class="gss-setting-desc">${site.modifier}</div>
                                        </div>
                                        <label class="gss-toggle">
                                            <input type="checkbox" class="gss-site-toggle" data-site-index="${i}" ${site.enabled ? 'checked' : ''}>
                                            <span class="gss-toggle-slider"></span>
                                        </label>
                                    </div>
                                `).join('')}
                            </div>
                        </div>

                        <div class="gss-settings-section">
                            <div class="gss-settings-section-title">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <line x1="12" y1="5" x2="12" y2="19"/>
                                    <line x1="5" y1="12" x2="19" y2="12"/>
                                </svg>
                                Add Custom Site
                            </div>
                            <div style="display: flex; flex-direction: column; gap: 8px;">
                                <input type="text" class="gss-input" id="gss-new-site-name" placeholder="Site name (e.g., Medium)">
                                <input type="text" class="gss-input" id="gss-new-site-modifier" placeholder="Search modifier (e.g., site:medium.com)">
                                <input type="text" class="gss-input" id="gss-new-site-icon" placeholder="Icon emoji (e.g., 📝)" maxlength="2">
                                <button class="gss-btn gss-btn-primary" id="gss-add-site-btn">Add Site</button>
                            </div>
                        </div>

                        <div class="gss-settings-section">
                            <div class="gss-settings-section-title">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M6 9l6 6 6-6"/>
                                </svg>
                                Dropdown Menus
                            </div>
                            <p style="color: var(--gss-text-secondary); font-size: 13px; margin-bottom: 16px;">
                                Dropdown menus provide quick access to external tools. Use {{QUERY}} in URLs to insert the current search term.
                            </p>
                            <div id="gss-dropdowns-list">
                                ${this.app.dropdowns.map((dropdown, i) => `
                                    <div class="gss-setting-item" style="flex-direction: column; align-items: flex-start;">
                                        <div style="display: flex; justify-content: space-between; width: 100%; margin-bottom: 8px;">
                                            <strong style="color: var(--gss-text);">${dropdown.title}</strong>
                                            <button class="gss-domain-remove gss-remove-dropdown" data-dropdown-index="${i}" title="Remove dropdown">
                                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                                    <line x1="18" y1="6" x2="6" y2="18"/>
                                                    <line x1="6" y1="6" x2="18" y2="18"/>
                                                </svg>
                                            </button>
                                        </div>
                                        <div style="font-size: 12px; color: var(--gss-text-muted);">
                                            ${dropdown.links?.map(l => l.name).join(', ') || 'No links'}
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    </div>

                    <!-- Filtering Settings -->
                    <div class="gss-settings-pane" data-pane="filtering">
                        <div class="gss-settings-section">
                            <div class="gss-settings-section-title">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
                                </svg>
                                Block Behavior
                            </div>

                            <div class="gss-setting-item">
                                <div class="gss-setting-info">
                                    <div class="gss-setting-name">Show Blocked Notices</div>
                                    <div class="gss-setting-desc">Display notice where blocked results would appear</div>
                                </div>
                                <label class="gss-toggle">
                                    <input type="checkbox" data-setting="showBlockedNotices" ${s.showBlockedNotices ? 'checked' : ''}>
                                    <span class="gss-toggle-slider"></span>
                                </label>
                            </div>

                            <div class="gss-setting-item">
                                <div class="gss-setting-info">
                                    <div class="gss-setting-name">Animate Blocking</div>
                                    <div class="gss-setting-desc">Smooth animations when blocking</div>
                                </div>
                                <label class="gss-toggle">
                                    <input type="checkbox" data-setting="animateBlocking" ${s.animateBlocking ? 'checked' : ''}>
                                    <span class="gss-toggle-slider"></span>
                                </label>
                            </div>

                            <div class="gss-setting-item">
                                <div class="gss-setting-info">
                                    <div class="gss-setting-name">Default Block Type</div>
                                    <div class="gss-setting-desc">Default action when blocking domains</div>
                                </div>
                                <select class="gss-select" data-setting="defaultBlockType">
                                    <option value="block" ${s.defaultBlockType === 'block' ? 'selected' : ''}>Block (Show Notice)</option>
                                    <option value="permaban" ${s.defaultBlockType === 'permaban' ? 'selected' : ''}>Permanent Ban (Hide)</option>
                                </select>
                            </div>

                            <div class="gss-setting-item">
                                <div class="gss-setting-info">
                                    <div class="gss-setting-name">Aggressive Blocking</div>
                                    <div class="gss-setting-desc">How to match domain patterns</div>
                                </div>
                                <select class="gss-select" data-setting="aggressiveBlocking">
                                    <option value="none" ${s.aggressiveBlocking === 'none' ? 'selected' : ''}>Exact Match Only</option>
                                    <option value="www" ${s.aggressiveBlocking === 'www' ? 'selected' : ''}>Strip WWW</option>
                                    <option value="all" ${s.aggressiveBlocking === 'all' ? 'selected' : ''}>Match Parent Domains</option>
                                </select>
                            </div>
                        </div>

                        <div class="gss-settings-section">
                            <div class="gss-settings-section-title">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                                    <line x1="3" y1="9" x2="21" y2="9"/>
                                    <line x1="9" y1="21" x2="9" y2="9"/>
                                </svg>
                                Hide Elements
                            </div>

                            <div class="gss-setting-item">
                                <div class="gss-setting-info">
                                    <div class="gss-setting-name">Hide Sponsored Results</div>
                                    <div class="gss-setting-desc">Remove ads from search results</div>
                                </div>
                                <label class="gss-toggle">
                                    <input type="checkbox" data-setting="hideSponsoredResults" ${s.hideSponsoredResults ? 'checked' : ''}>
                                    <span class="gss-toggle-slider"></span>
                                </label>
                            </div>

                            <div class="gss-setting-item">
                                <div class="gss-setting-info">
                                    <div class="gss-setting-name">Hide AI Overview</div>
                                    <div class="gss-setting-desc">Remove AI-generated summaries</div>
                                </div>
                                <label class="gss-toggle">
                                    <input type="checkbox" data-setting="hideAIOverview" ${s.hideAIOverview ? 'checked' : ''}>
                                    <span class="gss-toggle-slider"></span>
                                </label>
                            </div>

                            <div class="gss-setting-item">
                                <div class="gss-setting-info">
                                    <div class="gss-setting-name">Hide Related Searches</div>
                                    <div class="gss-setting-desc">Remove "Related searches" section</div>
                                </div>
                                <label class="gss-toggle">
                                    <input type="checkbox" data-setting="hideRelatedSearches" ${s.hideRelatedSearches ? 'checked' : ''}>
                                    <span class="gss-toggle-slider"></span>
                                </label>
                            </div>

                            <div class="gss-setting-item">
                                <div class="gss-setting-info">
                                    <div class="gss-setting-name">Hide People Also Ask</div>
                                    <div class="gss-setting-desc">Remove "People also ask" section</div>
                                </div>
                                <label class="gss-toggle">
                                    <input type="checkbox" data-setting="hidePeopleAlsoAsk" ${s.hidePeopleAlsoAsk ? 'checked' : ''}>
                                    <span class="gss-toggle-slider"></span>
                                </label>
                            </div>

                            <div class="gss-setting-item">
                                <div class="gss-setting-info">
                                    <div class="gss-setting-name">Hide "People Also Search For"</div>
                                    <div class="gss-setting-desc">Remove related search suggestions</div>
                                </div>
                                <label class="gss-toggle">
                                    <input type="checkbox" data-setting="hidePeopleAlsoSearchFor" ${s.hidePeopleAlsoSearchFor ? 'checked' : ''}>
                                    <span class="gss-toggle-slider"></span>
                                </label>
                            </div>

                            <div class="gss-setting-item">
                                <div class="gss-setting-info">
                                    <div class="gss-setting-name">Hide Short Videos</div>
                                    <div class="gss-setting-desc">Remove "Short videos" carousel section</div>
                                </div>
                                <label class="gss-toggle">
                                    <input type="checkbox" data-setting="hideShortVideos" ${s.hideShortVideos ? 'checked' : ''}>
                                    <span class="gss-toggle-slider"></span>
                                </label>
                            </div>

                            <div class="gss-setting-item">
                                <div class="gss-setting-info">
                                    <div class="gss-setting-name">Hide Video Carousels</div>
                                    <div class="gss-setting-desc">Remove inline video results</div>
                                </div>
                                <label class="gss-toggle">
                                    <input type="checkbox" data-setting="hideVideoCarousel" ${s.hideVideoCarousel ? 'checked' : ''}>
                                    <span class="gss-toggle-slider"></span>
                                </label>
                            </div>

                            <div class="gss-setting-item">
                                <div class="gss-setting-info">
                                    <div class="gss-setting-name">Hide Image Pack</div>
                                    <div class="gss-setting-desc">Remove inline image results</div>
                                </div>
                                <label class="gss-toggle">
                                    <input type="checkbox" data-setting="hideImagePack" ${s.hideImagePack ? 'checked' : ''}>
                                    <span class="gss-toggle-slider"></span>
                                </label>
                            </div>

                            <div class="gss-setting-item">
                                <div class="gss-setting-info">
                                    <div class="gss-setting-name">Hide Top Stories</div>
                                    <div class="gss-setting-desc">Remove news/top stories section</div>
                                </div>
                                <label class="gss-toggle">
                                    <input type="checkbox" data-setting="hideTopStories" ${s.hideTopStories ? 'checked' : ''}>
                                    <span class="gss-toggle-slider"></span>
                                </label>
                            </div>

                            <div class="gss-setting-item">
                                <div class="gss-setting-info">
                                    <div class="gss-setting-name">Hide Knowledge Panel</div>
                                    <div class="gss-setting-desc">Remove entity info cards</div>
                                </div>
                                <label class="gss-toggle">
                                    <input type="checkbox" data-setting="hideKnowledgePanel" ${s.hideKnowledgePanel ? 'checked' : ''}>
                                    <span class="gss-toggle-slider"></span>
                                </label>
                            </div>

                            <div class="gss-setting-item">
                                <div class="gss-setting-info">
                                    <div class="gss-setting-name">Hide Discussions</div>
                                    <div class="gss-setting-desc">Remove forums/discussions section</div>
                                </div>
                                <label class="gss-toggle">
                                    <input type="checkbox" data-setting="hideDiscussions" ${s.hideDiscussions ? 'checked' : ''}>
                                    <span class="gss-toggle-slider"></span>
                                </label>
                            </div>

                            <div class="gss-setting-item">
                                <div class="gss-setting-info">
                                    <div class="gss-setting-name">Hide Footer</div>
                                    <div class="gss-setting-desc">Remove page footer</div>
                                </div>
                                <label class="gss-toggle">
                                    <input type="checkbox" data-setting="hideFooter" ${s.hideFooter ? 'checked' : ''}>
                                    <span class="gss-toggle-slider"></span>
                                </label>
                            </div>

                            <div class="gss-setting-item">
                                <div class="gss-setting-info">
                                    <div class="gss-setting-name">Hide Sidebar</div>
                                    <div class="gss-setting-desc">Remove right sidebar</div>
                                </div>
                                <label class="gss-toggle">
                                    <input type="checkbox" data-setting="hideSidebar" ${s.hideSidebar ? 'checked' : ''}>
                                    <span class="gss-toggle-slider"></span>
                                </label>
                            </div>
                        </div>
                    </div>

                    <!-- Blocked Domains -->
                    <div class="gss-settings-pane" data-pane="blocked">
                        <div class="gss-settings-section">
                            <div class="gss-settings-section-title">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <circle cx="12" cy="12" r="10"/>
                                    <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
                                </svg>
                                Blocked Domains (${this.app.blockedDomains.length})
                            </div>

                            <div class="gss-add-domain">
                                <input type="text" class="gss-input" id="gss-add-domain-input" placeholder="Enter domain to block (e.g., example.com)">
                                <button class="gss-btn gss-btn-primary" id="gss-add-domain-btn">Add</button>
                            </div>

                            <div class="gss-domains-list" id="gss-domains-list">
                                <!-- Populated dynamically -->
                            </div>
                        </div>
                    </div>

                    <!-- Advanced Settings -->
                    <div class="gss-settings-pane" data-pane="advanced">
                        <div class="gss-settings-section">
                            <div class="gss-settings-section-title">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <line x1="12" y1="5" x2="12" y2="19"/>
                                    <polyline points="19 12 12 19 5 12"/>
                                </svg>
                                Endless Scroll
                            </div>

                            <div class="gss-setting-item">
                                <div class="gss-setting-info">
                                    <div class="gss-setting-name">Show Page Indicators</div>
                                    <div class="gss-setting-desc">Display page numbers between results</div>
                                </div>
                                <label class="gss-toggle">
                                    <input type="checkbox" data-setting="showPageIndicators" ${s.showPageIndicators ? 'checked' : ''}>
                                    <span class="gss-toggle-slider"></span>
                                </label>
                            </div>

                            <div class="gss-setting-item">
                                <div class="gss-setting-info">
                                    <div class="gss-setting-name">Max Auto-Load Pages</div>
                                    <div class="gss-setting-desc">Maximum pages to load automatically</div>
                                </div>
                                <div class="gss-range-container">
                                    <input type="range" class="gss-range" data-setting="maxAutoLoadPages" min="10" max="100" step="10" value="${s.maxAutoLoadPages}">
                                    <span class="gss-range-value">${s.maxAutoLoadPages}</span>
                                </div>
                            </div>
                        </div>

                        <div class="gss-settings-section">
                            <div class="gss-settings-section-title">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <polyline points="4 17 10 11 4 5"/>
                                    <line x1="12" y1="19" x2="20" y2="19"/>
                                </svg>
                                Advanced Options
                            </div>

                            <div class="gss-setting-item">
                                <div class="gss-setting-info">
                                    <div class="gss-setting-name">Restore Full URLs</div>
                                    <div class="gss-setting-desc">Show complete URLs instead of truncated</div>
                                </div>
                                <label class="gss-toggle">
                                    <input type="checkbox" data-setting="restoreFullURLs" ${s.restoreFullURLs ? 'checked' : ''}>
                                    <span class="gss-toggle-slider"></span>
                                </label>
                            </div>

                            <div class="gss-setting-item">
                                <div class="gss-setting-info">
                                    <div class="gss-setting-name">Clean URL Parameters</div>
                                    <div class="gss-setting-desc">Remove tracking parameters from URLs</div>
                                </div>
                                <label class="gss-toggle">
                                    <input type="checkbox" data-setting="cleanURLs" ${s.cleanURLs ? 'checked' : ''}>
                                    <span class="gss-toggle-slider"></span>
                                </label>
                            </div>

                            <div class="gss-setting-item">
                                <div class="gss-setting-info">
                                    <div class="gss-setting-name">Keyboard Shortcuts</div>
                                    <div class="gss-setting-desc">Enable keyboard shortcuts</div>
                                </div>
                                <label class="gss-toggle">
                                    <input type="checkbox" data-setting="keyboardShortcutsEnabled" ${s.keyboardShortcutsEnabled ? 'checked' : ''}>
                                    <span class="gss-toggle-slider"></span>
                                </label>
                            </div>

                            <div class="gss-setting-item">
                                <div class="gss-setting-info">
                                    <div class="gss-setting-name">Debug Mode</div>
                                    <div class="gss-setting-desc">Enable console logging for debugging</div>
                                </div>
                                <label class="gss-toggle">
                                    <input type="checkbox" data-setting="debugMode" ${s.debugMode ? 'checked' : ''}>
                                    <span class="gss-toggle-slider"></span>
                                </label>
                            </div>
                        </div>

                        <div class="gss-settings-section">
                            <div class="gss-settings-section-title">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                                    <polyline points="17 8 12 3 7 8"/>
                                    <line x1="12" y1="3" x2="12" y2="15"/>
                                </svg>
                                Import / Export
                            </div>

                            <p style="color: var(--gss-text-secondary); font-size: 13px; margin-bottom: 16px;">
                                Backup your settings and blocked domains, or import from a previous backup.
                            </p>

                            <div class="gss-import-export">
                                <button class="gss-btn gss-btn-primary" id="gss-export-btn">
                                    📤 Export Settings
                                </button>
                            </div>

                            <textarea class="gss-textarea" id="gss-import-textarea" placeholder="Paste exported JSON data here to import..."></textarea>

                            <div class="gss-import-export" style="margin-top: 12px;">
                                <button class="gss-btn gss-btn-secondary" id="gss-import-btn">
                                    📥 Import Settings
                                </button>
                                <button class="gss-btn gss-btn-danger" id="gss-reset-btn">
                                    🔄 Reset to Defaults
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="gss-settings-footer">
                    <div class="gss-settings-footer-actions">
                        <span style="color: var(--gss-text-muted); font-size: 12px;">
                            Press Ctrl+Shift+G to toggle settings
                        </span>
                        <a href="https://github.com/GoogleSearchSuite" target="_blank" style="color: var(--gss-accent); font-size: 13px; text-decoration: none;">
                            ⭐ Star on GitHub
                        </a>
                    </div>
                </div>
            `;
        }

        renderBlockedDomainsList() {
            const container = document.getElementById('gss-domains-list');
            if (!container) return;

            if (this.app.blockedDomains.length === 0) {
                container.innerHTML = '<div class="gss-domains-empty">No blocked domains yet.<br>Block domains from search results or add them manually above.</div>';
                return;
            }

            container.innerHTML = this.app.blockedDomains.map((item, index) => `
                <div class="gss-domain-item" data-index="${index}">
                    <div>
                        <span class="gss-domain-name">${item.domain}</span>
                        <span class="gss-domain-type gss-domain-type-${item.type}">${item.type}</span>
                    </div>
                    <button class="gss-domain-remove" data-domain="${item.domain}" title="Remove">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"/>
                            <line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                    </button>
                </div>
            `).join('');

            // Add remove event listeners
            container.querySelectorAll('.gss-domain-remove').forEach(btn => {
                btn.addEventListener('click', () => {
                    const domain = btn.dataset.domain;
                    this.app.domainFilter.unblockDomain(domain);
                    this.renderBlockedDomainsList();
                });
            });
        }

        toggleSettingsPanel(forceState = null) {
            const overlay = document.getElementById('gss-settings-overlay');
            const panel = document.getElementById('gss-settings-panel');

            if (!overlay || !panel) return;

            const newState = forceState !== null ? forceState : !this.settingsPanelVisible;
            this.settingsPanelVisible = newState;

            if (newState) {
                overlay.classList.add('gss-visible');
                panel.classList.add('gss-visible');
                this.renderBlockedDomainsList();
            } else {
                overlay.classList.remove('gss-visible');
                panel.classList.remove('gss-visible');
            }
        }

        showToast(message, type = 'info') {
            let container = document.querySelector('.gss-toast-container');
            if (!container) {
                container = document.createElement('div');
                container.className = 'gss-toast-container';
                document.body.appendChild(container);
            }

            const icons = {
                success: '✓',
                error: '✕',
                info: 'ℹ',
                warning: '⚠'
            };

            const toast = document.createElement('div');
            toast.className = `gss-toast gss-toast-${type}`;
            toast.innerHTML = `
                <span class="gss-toast-icon">${icons[type] || icons.info}</span>
                <span>${message}</span>
            `;

            container.appendChild(toast);

            // Auto remove after 3 seconds
            setTimeout(() => {
                toast.style.animation = 'gss-toastOut 0.3s ease-out forwards';
                setTimeout(() => toast.remove(), 300);
            }, 3000);
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // SEARCH SHORTCUTS
    // ═══════════════════════════════════════════════════════════════════════════════

    class SearchShortcuts {
        constructor(app) {
            this.app = app;
            this.container = null;
            this.init();
        }

        init() {
            this.injectStyles();
            // Wait for Google's toolbar to load
            this.waitForToolbar();
        }

        waitForToolbar() {
            const checkInterval = setInterval(() => {
                const toolsMenu = document.querySelector('#hdtb-tls, .T47uwc, .crJ18e');
                const searchBox = document.querySelector('textarea[name="q"], input[name="q"]');

                if (toolsMenu || searchBox) {
                    clearInterval(checkInterval);
                    this.render();
                }
            }, 100);

            // Fallback: render after 2 seconds anyway
            setTimeout(() => {
                clearInterval(checkInterval);
                this.render();
            }, 2000);
        }

        injectStyles() {
            GM_addStyle(`
                /* ═══════════════════════════════════════════════════════════════════════════════
                   SEARCH SHORTCUTS STYLES
                   ═══════════════════════════════════════════════════════════════════════════════ */

                .gss-shortcuts-container {
                    display: flex;
                    flex-wrap: wrap;
                    align-items: center;
                    gap: 8px;
                    padding: 12px 16px;
                    margin: 8px 0 16px 0;
                    background: var(--gss-bg-secondary);
                    border: 1px solid var(--gss-border);
                    border-radius: var(--gss-radius);
                    font-family: 'Google Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                }

                .gss-shortcuts-label {
                    font-size: 12px;
                    font-weight: 500;
                    color: var(--gss-text-muted);
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    margin-right: 4px;
                }

                .gss-shortcut-btn {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    padding: 8px 14px;
                    font-family: 'Google Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    font-size: 13px;
                    font-weight: 500;
                    color: var(--gss-text);
                    background: var(--gss-bg);
                    border: 1px solid var(--gss-border);
                    border-radius: 100px;
                    text-decoration: none;
                    cursor: pointer;
                    transition: all var(--gss-transition);
                    /* IMPORTANT: Reset any transforms to prevent flipping */
                    transform: none !important;
                    -webkit-transform: none !important;
                }

                .gss-shortcut-btn:hover {
                    background: var(--gss-accent);
                    color: white;
                    border-color: var(--gss-accent);
                    transform: translateY(-1px) !important;
                    box-shadow: 0 2px 8px rgba(66, 133, 244, 0.3);
                }

                .gss-shortcut-btn.gss-shortcut-active {
                    background: var(--gss-accent);
                    color: white;
                    border-color: var(--gss-accent);
                }

                .gss-shortcut-icon {
                    font-size: 14px;
                    line-height: 1;
                }

                .gss-shortcuts-divider {
                    width: 1px;
                    height: 24px;
                    background: var(--gss-border);
                    margin: 0 4px;
                }

                /* Dropdown menus */
                .gss-dropdown {
                    position: relative;
                }

                .gss-dropdown-toggle {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    padding: 8px 14px;
                    font-family: 'Google Sans', sans-serif;
                    font-size: 13px;
                    font-weight: 500;
                    color: var(--gss-text);
                    background: var(--gss-bg);
                    border: 1px solid var(--gss-border);
                    border-radius: 100px;
                    cursor: pointer;
                    transition: all var(--gss-transition);
                }

                .gss-dropdown-toggle:hover {
                    background: var(--gss-hover);
                    border-color: var(--gss-accent);
                }

                .gss-dropdown-toggle::after {
                    content: '';
                    width: 0;
                    height: 0;
                    border-left: 4px solid transparent;
                    border-right: 4px solid transparent;
                    border-top: 5px solid currentColor;
                    margin-left: 4px;
                }

                .gss-dropdown-menu {
                    position: absolute;
                    top: 100%;
                    left: 0;
                    min-width: 180px;
                    margin-top: 4px;
                    padding: 8px 0;
                    background: var(--gss-bg);
                    border: 1px solid var(--gss-border);
                    border-radius: var(--gss-radius-sm);
                    box-shadow: var(--gss-shadow);
                    opacity: 0;
                    visibility: hidden;
                    transform: translateY(-8px);
                    transition: all 0.15s ease;
                    z-index: 1000;
                }

                .gss-dropdown:hover .gss-dropdown-menu,
                .gss-dropdown-menu:hover {
                    opacity: 1;
                    visibility: visible;
                    transform: translateY(0);
                }

                .gss-dropdown-item {
                    display: block;
                    padding: 10px 16px;
                    font-size: 13px;
                    color: var(--gss-text);
                    text-decoration: none;
                    transition: background var(--gss-transition);
                }

                .gss-dropdown-item:hover {
                    background: var(--gss-hover);
                    color: var(--gss-accent);
                }

                /* Fix for flipped text - reset transforms on all text elements */
                .gss-shortcuts-container *,
                .gss-shortcut-btn *,
                .gss-dropdown * {
                    transform: none !important;
                    -webkit-transform: none !important;
                }
            `);
        }

        getCurrentQuery() {
            const input = document.querySelector('textarea[name="q"], input[name="q"]');
            return input?.value || '';
        }

        getBaseQuery() {
            let query = this.getCurrentQuery();

            // Remove any existing site: modifiers
            this.app.searchSites.forEach(site => {
                const modifier = site.modifier.toLowerCase();
                const queryLower = query.toLowerCase();

                if (queryLower.startsWith(modifier + ' ')) {
                    query = query.substring(modifier.length + 1);
                } else if (queryLower.includes(' ' + modifier)) {
                    query = query.replace(new RegExp('\\s*' + this.escapeRegex(modifier), 'i'), '');
                }
            });

            return query.trim();
        }

        escapeRegex(string) {
            return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        }

        isModifierActive(modifier) {
            const query = this.getCurrentQuery().toLowerCase();
            return query.includes(modifier.toLowerCase());
        }

        render() {
            // Remove existing container if any
            document.getElementById('gss-shortcuts-container')?.remove();

            const baseQuery = this.getBaseQuery();
            if (!baseQuery) return; // Don't show if no search query

            // Find insertion point - after search box area
            const searchArea = document.querySelector('#cnt, #main, #rcnt');
            const resultsContainer = document.querySelector('#rso, #search');

            if (!searchArea && !resultsContainer) return;

            // Create shortcuts container
            this.container = document.createElement('div');
            this.container.id = 'gss-shortcuts-container';
            this.container.className = 'gss-shortcuts-container';

            // Label
            const label = document.createElement('span');
            label.className = 'gss-shortcuts-label';
            label.textContent = 'Search in:';
            this.container.appendChild(label);

            // Render search site buttons
            const enabledSites = this.app.searchSites.filter(site => site.enabled);

            enabledSites.forEach(site => {
                const isActive = this.isModifierActive(site.modifier);
                const newQuery = isActive
                    ? baseQuery  // Remove modifier
                    : `${site.modifier} ${baseQuery}`;  // Add modifier

                const btn = document.createElement('a');
                btn.className = `gss-shortcut-btn ${isActive ? 'gss-shortcut-active' : ''}`;
                btn.href = `/search?q=${encodeURIComponent(newQuery)}`;
                btn.innerHTML = `
                    <span class="gss-shortcut-icon">${site.icon}</span>
                    <span>${site.name}</span>
                `;
                btn.title = isActive ? `Remove ${site.name} filter` : `Search only ${site.name}`;

                this.container.appendChild(btn);
            });

            // Add divider if we have dropdowns
            if (this.app.dropdowns.length > 0) {
                const divider = document.createElement('div');
                divider.className = 'gss-shortcuts-divider';
                this.container.appendChild(divider);
            }

            // Render dropdown menus
            this.app.dropdowns.forEach(dropdown => {
                if (dropdown.links?.length > 0) {
                    this.container.appendChild(this.createDropdown(dropdown, baseQuery));
                }
            });

            // Insert into page
            if (resultsContainer) {
                resultsContainer.parentNode.insertBefore(this.container, resultsContainer);
            } else if (searchArea) {
                searchArea.appendChild(this.container);
            }
        }

        createDropdown(dropdownData, query) {
            const dropdown = document.createElement('div');
            dropdown.className = 'gss-dropdown';

            const toggle = document.createElement('div');
            toggle.className = 'gss-dropdown-toggle';
            toggle.textContent = dropdownData.title;
            dropdown.appendChild(toggle);

            const menu = document.createElement('div');
            menu.className = 'gss-dropdown-menu';

            dropdownData.links.forEach(link => {
                const item = document.createElement('a');
                item.className = 'gss-dropdown-item';
                // Replace placeholders in URL
                item.href = link.url
                    .replace('{{QUERY}}', encodeURIComponent(query))
                    .replace('{{URL}}', encodeURIComponent(window.location.href));
                item.textContent = link.name;
                item.target = '_blank';
                item.rel = 'noopener noreferrer';
                menu.appendChild(item);
            });

            dropdown.appendChild(menu);
            return dropdown;
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // INITIALIZATION
    // ═══════════════════════════════════════════════════════════════════════════════

    // Create global instance
    const app = new GoogleSearchSuite();

    // Register menu command
    if (typeof GM_registerMenuCommand !== 'undefined') {
        GM_registerMenuCommand('⚙️ Open Settings', () => {
            app.uiManager?.toggleSettingsPanel(true);
        });
    }

})();