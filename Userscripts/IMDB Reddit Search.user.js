// ==UserScript==
// @name         IMDB Reddit Search
// @namespace    http://tampermonkey.net/
// @version      3.1
// @description  Add search icons for Reddit, Google, IMDB, YouTube, Netflix, Fandom, DMM, Stremio, 1337x and Real-Debrid. Features magnet link copying, keyboard shortcuts, and platform preferences.
// @author       r3dhack3r
// @license      MIT
// @match        https://www.imdb.com/*
// @match        https://*.wikipedia.org/*
// @match        https://psa.wf/*
// @match        https://web.stremio.com/*
// @match        https://1337x.to/*
// @match        https://www.1337x.to/*
// @match        https://1337x.st/*
// @match        https://www.1337x.st/*
// @match        https://1337x.is/*
// @match        https://www.1337x.is/*
// @icon         https://www.google.com/s2/favicons?domain=imdb.com
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_registerMenuCommand
// @run-at       document-idle
// @downloadURL https://update.greasyfork.org/scripts/566308/IMDB%20Reddit%20Search.user.js
// @updateURL https://update.greasyfork.org/scripts/566308/IMDB%20Reddit%20Search.meta.js
// ==/UserScript==

(function() {
    'use strict';

    // ============================================
    // PRECOMPILED REGEXES (Performance)
    // ============================================

    const TORRENT_PATTERNS = [
        /\b(480p|720p|1080p|2160p|4k|8k|UHD)\b/gi,
        /\b(WEB-?DL|WEBRip|BluRay|BRRip|DVDRip|HDTV|HDRip|Blu-?Ray|BD-?Rip)\b/gi,
        /\b(HEVC|x264|x265|H\.?264|H\.?265|XviD|AVC|VP9|AV1)\b/gi,
        /\b(AAC|AC3|DD|DTS|FLAC|MP3|Atmos|TrueHD|EAC3|\d\.\d)\b/gi,
        /\b(UNRATED|REMASTERED|EXTENDED|DIRECTOR'?S? CUT|PROPER|REPACK|iNTERNAL|LIMITED)\b/gi,
        /\b(BONE|YIFY|RARBG|YTS|ETRG|PSA|SPARKS|ROVERS|FGT|ION10|CMRG|NTG|W4F|DEFLATE|INFLATE|FLUX|DUBBED|SUBBED)\b/gi,
        /\b(ESub|Multi|Dual Audio|Subs?|Subtitles?)\b/gi,
        /\b(HDR10\+?|HDR|DV|DoVi|Dolby Vision|SDR)\b/gi,
        /\b(COMPLETE|SEASON|S\d+|E\d+|EPISODE)\b/gi,
        /[\._\-]/g
    ];

    const YEAR_PATTERN = /^(.+?)(\d{4})/;
    const IMDB_ID_PATTERN = /\/(tt\d+)/;
    const MAGNET_HASH_PATTERN = /btih:([a-fA-F0-9]+)/;

    // ============================================
    // STATIC SVG MAP (Memory Optimization)
    // ============================================

    const SVG_MAP = {
        reddit: (color) => `<svg width="16" height="16" viewBox="0 0 24 24" fill="${color}"><path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"/></svg>`,
        google: () => `<svg width="16" height="16" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>`,
        imdb: (color) => `<svg width="16" height="16" viewBox="0 0 24 24" fill="${color}"><path d="M22 12c0 5.523-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2s10 4.477 10 10zM8.5 8.5v7h1.5v-7H8.5zm2.5 0v7h1.5V12l1 3.5h1L15.5 12v3.5H17v-7h-1.5l-1 3.5-1-3.5H12zm-5 0v7h1.5v-5.5l.5 2h1l.5-2v5.5H7v-7H5.5z"/></svg>`,
        wikipedia: () => `<svg width="16" height="16" viewBox="0 0 24 24" fill="#FFFFFF"><path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM21 9V7H17.5L16.5 9H21ZM6.5 9L5.5 7H2V9H6.5ZM7.91 10L12 21L16.09 10H7.91Z"/></svg>`,
        youtube: (color) => `<svg width="16" height="16" viewBox="0 0 24 24" fill="${color}"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>`,
        netflix: (color) => `<svg width="16" height="16" viewBox="0 0 24 24" fill="${color}"><path d="M5.398 0v.006c0 .002.002.002.005.006L5.398 0zM18.6 0v9.194l-4.49-8.63V0H18.6zm-6.984 0v24L5.398 0h6.218zm1.388 8.564V24H18.6V0l-5.596 8.564z"/></svg>`,
        fandom: () => `<svg width="16" height="16" viewBox="0 0 174 242"><path fill="#FA005A" d="M166.935 118.154L50.108 1.273C49.504.67 48.735.259 47.898.093c-.837-.166-1.705-.08-2.493.247-.788.327-1.461.88-1.935 1.59-.474.71-.727 1.546-.727 2.4v98.276L7.365 67.22c-.604-.604-1.373-1.014-2.21-1.18-.837-.166-1.704-.08-2.492.247-.789.327-1.462.88-1.936 1.59-.474.71-.727 1.545-.727 2.4v101.487c-.003 3.172.62 6.312 1.833 9.242 1.214 2.929 2.993 5.59 5.237 7.83l46.037 46.099c4.528 4.53 10.666 7.078 17.068 7.085h33.68c6.4-.003 12.537-2.547 17.063-7.075l46.027-46.099c2.239-2.242 4.014-4.904 5.225-7.833 1.21-2.93 1.832-6.069 1.83-9.239v-36.533c.002-3.173-.621-6.315-1.834-9.247-1.212-2.932-2.989-5.596-5.231-7.84z"/><path fill="#FFC500" d="M131.297 160.901c.001 1.915-.757 3.754-2.108 5.111l-37.11 37.3c-.672.677-1.472 1.215-2.354 1.582-.88.366-1.826.555-2.78.555-.954 0-1.9-.189-2.78-.555-.882-.367-1.682-.905-2.355-1.582l-36.99-37.3c-1.352-1.351-2.114-3.184-2.117-5.096v-14.191c0-.951.19-1.892.554-2.77.366-.878.9-1.675 1.574-2.346l13.317-13.328c.672-.675 1.47-1.209 2.35-1.574.879-.365 1.82-.553 2.772-.553.952 0 1.894.188 2.773.553.879.365 1.677.899 2.35 1.574l18.624 18.645 18.596-18.65c.672-.675 1.47-1.209 2.349-1.574.879-.365 1.821-.553 2.773-.553.951 0 1.893.188 2.772.553.879.365 1.677.899 2.349 1.574l13.318 13.328c.673.671 1.207 1.469 1.571 2.347.364.877.552 1.819.552 2.769v14.181z"/></svg>`,
        dmm: (color) => `<svg width="16" height="16" viewBox="0 0 200 200"><circle cx="100" cy="100" r="85" fill="${color}"/><path d="M75,50 L75,150 L150,100 Z" fill="#ECF0F1"/><path d="M45,80 Q75,40 100,80 T155,80" fill="#CC333F"/><path d="M65,115 L70,160 L85,140 L100,160 L115,140 L130,160 L135,115 Z" fill="#EDC951"/></svg>`,
        stremio: (color) => `<svg width="16" height="16" viewBox="0 0 24 24"><rect width="24" height="24" rx="5" fill="${color}"/><path d="M9 7l8 5-8 5V7z" fill="#ffffff"/></svg>`,
        '1337x': (color) => `<svg width="16" height="16" viewBox="0 0 24 24"><rect width="24" height="24" rx="3" fill="#1a1a1a"/><text x="12" y="17" font-family="Arial, sans-serif" font-size="10" font-weight="bold" fill="${color}" text-anchor="middle">1337x</text></svg>`,
        realdebrid: (color) => `<svg width="16" height="16" viewBox="0 0 24 24"><rect width="24" height="24" rx="3" fill="${color}"/><text x="12" y="17" font-family="Arial, sans-serif" font-size="9" font-weight="bold" fill="#ffffff" text-anchor="middle">RD</text></svg>`
    };

    // ============================================
    // CONFIGURATION & STATE
    // ============================================

    const STATE = {
        imdbIdCache: null,
        isProcessing: false,
        lastClickTime: {},
        iconUsageCount: GM_getValue('iconUsageCount', {}),
        enabledPlatforms: GM_getValue('enabledPlatforms', null),
        cachedElements: {},
        isDarkMode: false,
        currentSite: {
            isOnWikipedia: window.location.hostname.includes('wikipedia.org'),
            isOnIMDB: window.location.hostname.includes('imdb.com'),
            isOnPSA: window.location.hostname.includes('psa.wf'),
            isOnStremio: window.location.hostname.includes('stremio.com'),
            isOn1337x: window.location.hostname.includes('1337x')
        }
    };

    const PLATFORM_CONFIGS = new Map([
        ['reddit', { name: 'Reddit', color: '#FF4500', shortcut: 'Alt+R' }],
        ['google', { name: 'Google', color: '#4285F4', shortcut: 'Alt+G' }],
        ['imdb', { name: 'IMDB', color: '#F5C518', shortcut: 'Alt+I', special: 'imdb' }],
        ['youtube', { name: 'YouTube', color: '#FF0000', shortcut: 'Alt+Y' }],
        ['netflix', { name: 'Netflix', color: '#E50914', shortcut: 'Alt+N' }],
        ['fandom', { name: 'Fandom', color: '#FA005A', shortcut: 'Alt+F' }],
        ['dmm', { name: 'Debrid Media Manager', color: '#00A0B0', shortcut: 'Alt+D', supportsImdb: true }],
        ['stremio', { name: 'Stremio', color: '#7c3aed', shortcut: 'Alt+S', supportsImdb: true }],
        ['1337x', { name: '1337x', color: '#ff6b35', shortcut: 'Alt+X' }],
        ['realdebrid', { name: 'Real-Debrid', color: '#0a7d3e', shortcut: 'Alt+B', special: 'realdebrid' }]
    ]);

    const CONFIG = {
        debounceDelay: 500,
        clickCooldown: 1000,
        notificationDuration: 5000
    };

    // Initialize enabled platforms
    if (!STATE.enabledPlatforms) {
        STATE.enabledPlatforms = Array.from(PLATFORM_CONFIGS.keys());
        GM_setValue('enabledPlatforms', STATE.enabledPlatforms);
    }

    // ============================================
    // INJECT STYLES (with check)
    // ============================================

    const injectStyles = () => {
        if (document.getElementById('search-icons-styles')) return;

        const style = document.createElement('style');
        style.id = 'search-icons-styles';
        style.textContent = `
            .search-icons-container {
                margin-left: 8px;
                display: inline-block;
            }

            .search-icon {
                margin-right: 5px;
                cursor: pointer;
                vertical-align: middle;
                display: inline-block;
                transition: transform 0.2s, opacity 0.2s;
            }

            .search-icon:hover {
                transform: scale(1.15);
                opacity: 0.8;
            }

            .search-icon:active {
                transform: scale(0.95);
            }

            .search-icon:focus {
                outline: 2px solid #4285F4;
                outline-offset: 2px;
                border-radius: 2px;
            }

            .search-icon.loading {
                opacity: 0.5;
                cursor: wait;
                animation: pulse 1s infinite;
            }

            @keyframes pulse {
                0%, 100% { opacity: 0.5; }
                50% { opacity: 0.8; }
            }

            @keyframes slideIn {
                from {
                    transform: translateX(400px);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }

            @keyframes slideOut {
                from {
                    transform: translateX(0);
                    opacity: 1;
                }
                to {
                    transform: translateX(400px);
                    opacity: 0;
                }
            }

            .notification {
                position: fixed;
                top: 20px;
                right: 20px;
                color: white;
                padding: 15px 25px;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.4);
                z-index: 10000;
                font-family: Arial, sans-serif;
                font-size: 15px;
                font-weight: 600;
                animation: slideIn 0.3s ease-out;
                max-width: 400px;
                line-height: 1.4;
            }

            .notification.dark {
                background: #1a1a1a;
                color: #ffffff;
            }

            .notification.light {
                background: #0a7d3e;
                color: #ffffff;
            }

            .clipboard-fallback {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: white;
                color: black;
                padding: 20px;
                border-radius: 8px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.3);
                z-index: 10001;
                max-width: 500px;
            }

            .clipboard-fallback textarea {
                width: 100%;
                height: 100px;
                margin: 10px 0;
                padding: 10px;
                border: 1px solid #ccc;
                border-radius: 4px;
                font-family: monospace;
            }

            .clipboard-fallback button {
                background: #0a7d3e;
                color: white;
                border: none;
                padding: 10px 20px;
                border-radius: 4px;
                cursor: pointer;
                margin-right: 10px;
            }

            .clipboard-fallback button:hover {
                background: #085f2e;
            }
        `;
        document.head.appendChild(style);
    };

    // ============================================
    // DARK MODE DETECTION
    // ============================================

    const detectDarkMode = () => {
        try {
            const bgColor = window.getComputedStyle(document.body).backgroundColor;
            const rgb = bgColor.match(/\d+/g);
            if (rgb) {
                const brightness = (parseInt(rgb[0]) * 299 + parseInt(rgb[1]) * 587 + parseInt(rgb[2]) * 114) / 1000;
                STATE.isDarkMode = brightness < 128;
            }
        } catch (e) {
            STATE.isDarkMode = false;
        }
    };

    // ============================================
    // UTILITY FUNCTIONS
    // ============================================

    const debounce = (func, delay) => {
        let timeoutId;
        return function(...args) {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func.apply(this, args), delay);
        };
    };

    const showNotification = (message, duration = CONFIG.notificationDuration) => {
        const notification = document.createElement('div');
        notification.className = `notification ${STATE.isDarkMode ? 'dark' : 'light'}`;
        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease-out';
            setTimeout(() => notification.remove(), 300);
        }, duration);
    };

    const showClipboardFallback = (text) => {
        const fallback = document.createElement('div');
        fallback.className = 'clipboard-fallback';
        fallback.innerHTML = `
            <h3>Copy Magnet Link</h3>
            <p>Your browser doesn't support automatic copying. Please copy manually:</p>
            <textarea readonly>${text}</textarea>
            <button id="copy-btn">Copy</button>
            <button id="close-btn">Close</button>
        `;

        document.body.appendChild(fallback);

        const textarea = fallback.querySelector('textarea');
        textarea.select();

        fallback.querySelector('#copy-btn').onclick = () => {
            textarea.select();
            document.execCommand('copy');
            showNotification('✓ Copied to clipboard!', 2000);
            fallback.remove();
        };

        fallback.querySelector('#close-btn').onclick = () => {
            fallback.remove();
        };
    };

    const canClick = (iconId) => {
        const now = Date.now();
        const lastClick = STATE.lastClickTime[iconId] || 0;
        if (now - lastClick < CONFIG.clickCooldown) {
            showNotification('⚠️ Please wait before clicking again', 2000);
            return false;
        }
        STATE.lastClickTime[iconId] = now;
        return true;
    };

    const trackIconUsage = (iconId) => {
        STATE.iconUsageCount[iconId] = (STATE.iconUsageCount[iconId] || 0) + 1;
        GM_setValue('iconUsageCount', STATE.iconUsageCount);
    };

    const getSortedPlatforms = () => {
        return STATE.enabledPlatforms
            .map(id => ({ id, ...PLATFORM_CONFIGS.get(id) }))
            .filter(p => p.name)
            .sort((a, b) => {
                const countA = STATE.iconUsageCount[a.id] || 0;
                const countB = STATE.iconUsageCount[b.id] || 0;
                return countB - countA;
            });
    };

    // ============================================
    // IMDB ID DETECTION (Cached)
    // ============================================

    const getIMDBId = () => {
        if (STATE.imdbIdCache) return STATE.imdbIdCache;

        try {
            if (STATE.currentSite.isOnIMDB) {
                const match = window.location.pathname.match(IMDB_ID_PATTERN);
                if (match) {
                    STATE.imdbIdCache = match[1];
                    console.log('IMDB ID (IMDB):', match[1]);
                    return match[1];
                }
            }

            if (STATE.currentSite.isOnStremio) {
                const hashMatch = window.location.hash.match(IMDB_ID_PATTERN);
                if (hashMatch) {
                    STATE.imdbIdCache = hashMatch[1];
                    console.log('IMDB ID (Stremio hash):', hashMatch[1]);
                    return hashMatch[1];
                }

                const metaLinks = document.querySelectorAll('a[href*="imdb.com/title/"]');
                for (const link of metaLinks) {
                    const match = link.href.match(/\/title\/(tt\d+)/);
                    if (match) {
                        STATE.imdbIdCache = match[1];
                        console.log('IMDB ID (Stremio link):', match[1]);
                        return match[1];
                    }
                }

                const allElements = document.querySelectorAll('[data-imdb-id], [data-id*="tt"]');
                for (const el of allElements) {
                    const dataId = el.getAttribute('data-imdb-id') || el.getAttribute('data-id');
                    if (dataId?.startsWith('tt')) {
                        STATE.imdbIdCache = dataId;
                        console.log('IMDB ID (Stremio data):', dataId);
                        return dataId;
                    }
                }
            }
        } catch (error) {
            console.error('Error detecting IMDB ID:', error);
        }

        return null;
    };

    // ============================================
    // TORRENT TITLE PARSER (Optimized)
    // ============================================

    const parseTorrentTitle = (title) => {
        let cleanTitle = title;

        const yearMatch = cleanTitle.match(YEAR_PATTERN);
        if (yearMatch) {
            cleanTitle = yearMatch[1];
        }

        TORRENT_PATTERNS.forEach((pattern, idx) => {
            if (idx === TORRENT_PATTERNS.length - 1) {
                cleanTitle = cleanTitle.replace(pattern, ' ');
            } else {
                cleanTitle = cleanTitle.replace(pattern, '');
            }
        });

        cleanTitle = cleanTitle.replace(/\s+/g, ' ').trim();
        cleanTitle = cleanTitle.replace(/^[^\w]+|[^\w]+$/g, '');

        return cleanTitle || title;
    };

    // ============================================
    // SEARCH URL CREATORS
    // ============================================

    const searchFunctions = {
        reddit: (term) => `https://www.reddit.com/search/?q=${encodeURIComponent(term)}`,
        google: (term) => `https://www.google.com/search?q=${encodeURIComponent(term)}`,
        imdb: (term, imdbId) => imdbId ? `https://www.imdb.com/title/${imdbId}/` : `https://www.imdb.com/find?q=${encodeURIComponent(term)}`,
        wikipedia: (term) => `https://en.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(term)}`,
        youtube: (term) => `https://www.youtube.com/results?search_query=${encodeURIComponent(term)}`,
        netflix: (term) => `https://www.netflix.com/search?q=${encodeURIComponent(term)}`,
        fandom: (term) => `https://www.fandom.com/search?query=${encodeURIComponent(term)}`,
        dmm: (term, imdbId) => `https://debridmediamanager.com/search?query=${encodeURIComponent(term)}`,
        stremio: (term, imdbId) => imdbId ? `https://web.stremio.com/#/detail/movie/${imdbId}` : `https://web.stremio.com/#/search?search=${encodeURIComponent(term)}`,
        '1337x': (term) => `https://1337x.to/search/${encodeURIComponent(term)}/1/`,
        realdebrid: () => `https://real-debrid.com/torrents`
    };

    // ============================================
    // MAGNET LINK HANDLER (Enhanced)
    // ============================================

    const findAndCopyMagnetLink = () => {
        const selectors = [
            'a[href^="magnet:"]',
            'button[data-magnet]',
            '[onclick*="magnet:"]',
            '.magnet-link',
            '[data-clipboard*="magnet:"]'
        ];

        let magnetUrl = null;

        for (const selector of selectors) {
            const element = document.querySelector(selector);
            if (element) {
                magnetUrl = element.getAttribute('href') ||
                           element.getAttribute('data-magnet') ||
                           element.getAttribute('onclick')?.match(/magnet:[^"']*/)?.[0] ||
                           element.getAttribute('data-clipboard');
                if (magnetUrl && magnetUrl.startsWith('magnet:')) break;
            }
        }

        if (magnetUrl) {
            const magnetHash = magnetUrl.match(MAGNET_HASH_PATTERN)?.[1] || 'unknown';

            navigator.clipboard.writeText(magnetUrl).then(() => {
                console.log('Magnet copied:', magnetHash);
                showNotification(`✓ Magnet copied (${magnetHash.substring(0, 8)}...)\nPress Ctrl+V in Real-Debrid`);

                setTimeout(() => {
                    window.open('https://real-debrid.com/torrents', '_blank');
                }, 800);
            }).catch(err => {
                console.error('Clipboard error:', err);
                showClipboardFallback(magnetUrl);
                window.open('https://real-debrid.com/torrents', '_blank');
            });

            return true;
        }

        return false;
    };

    // ============================================
    // ICON CREATION (Consolidated & Optimized)
    // ============================================

    const addSearchIcons = (element, searchTerm) => {
        if (element.querySelector('.search-icons-container')) return;

        const imdbId = getIMDBId();
        const iconsContainer = document.createElement('span');
        iconsContainer.className = 'search-icons-container';
        iconsContainer.setAttribute('role', 'toolbar');
        iconsContainer.setAttribute('aria-label', 'Search platforms');

        const platforms = getSortedPlatforms().filter(platform => {
            // Filter logic consolidated
            if (platform.special === 'imdb' && STATE.currentSite.isOnIMDB) return false;
            if (platform.special === 'imdb' && !STATE.currentSite.isOnIMDB) return true;
            return !platform.special || platform.special === 'realdebrid';
        });

        // Add Wikipedia icon on IMDB
        if (STATE.currentSite.isOnIMDB) {
            platforms.unshift({
                id: 'wikipedia',
                name: 'Wikipedia',
                color: '#FFFFFF',
                shortcut: 'Alt+W'
            });
        }

        platforms.forEach(platform => {
            const icon = createIcon(platform, searchTerm, imdbId);
            iconsContainer.appendChild(icon);
        });

        iconsContainer.addEventListener('click', handleIconClick);
        element.appendChild(iconsContainer);
    };

    const createIcon = (platform, searchTerm, imdbId) => {
        const icon = document.createElement('span');
        icon.className = 'search-icon';
        icon.setAttribute('role', 'button');
        icon.setAttribute('tabindex', '0');
        icon.setAttribute('aria-label', `Search ${platform.name} for ${searchTerm}${imdbId ? ' (IMDB: ' + imdbId + ')' : ''}`);

        const svgGenerator = SVG_MAP[platform.id];
        icon.innerHTML = svgGenerator ? svgGenerator(platform.color) : '';

        icon.dataset.platformId = platform.id;
        icon.dataset.searchTerm = searchTerm;
        icon.dataset.imdbId = imdbId || '';

        let tooltipText = `${platform.name}${platform.shortcut ? ' (' + platform.shortcut + ')' : ''}`;
        if (imdbId && platform.supportsImdb) {
            tooltipText += ` - ${imdbId}`;
        }
        if (platform.special === 'realdebrid' && STATE.currentSite.isOn1337x) {
            const magnetLink = document.querySelector('a[href^="magnet:"]');
            if (magnetLink) {
                const magnetHash = magnetLink.href.match(MAGNET_HASH_PATTERN)?.[1];
                if (magnetHash) {
                    tooltipText += ` - Copy ${magnetHash.substring(0, 8)}...`;
                }
            }
        }

        icon.title = tooltipText;

        // Keyboard support
        icon.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                icon.click();
            }
        });

        return icon;
    };

    const handleIconClick = (e) => {
        const icon = e.target.closest('.search-icon');
        if (!icon) return;

        e.preventDefault();
        e.stopPropagation();

        const platformId = icon.dataset.platformId;
        const searchTerm = icon.dataset.searchTerm;
        const imdbId = icon.dataset.imdbId || null;

        if (!canClick(platformId)) return;

        trackIconUsage(platformId);

        try {
            if (platformId === 'realdebrid' && STATE.currentSite.isOn1337x) {
                const found = findAndCopyMagnetLink();
                if (!found) {
                    showNotification('⚠️ No magnet link found', 2000);
                    window.open(searchFunctions[platformId](), '_blank');
                }
            } else if (searchFunctions[platformId]) {
                const url = searchFunctions[platformId](searchTerm, imdbId);
                window.open(url, '_blank');
            }
        } catch (error) {
            console.error('Icon click error:', error);
            showNotification('⚠️ An error occurred', 2000);
        }
    };

    // ============================================
    // TITLE EXTRACTION
    // ============================================

    const extractTitle = (titleElement) => {
        let title = titleElement.textContent.trim();
        title = title.replace(/\(\d{4}.*?\)$/g, '').trim();
        title = title.replace(/\s*-\s*IMDb$/g, '').trim();
        title = title.replace(/^"(.*)"$/, '$1').trim();
        return title;
    };

    // ============================================
    // DOM QUERY CACHE
    // ============================================

    const getCachedElement = (key, selector) => {
        if (STATE.cachedElements[key] && document.contains(STATE.cachedElements[key])) {
            return STATE.cachedElements[key];
        }

        const element = document.querySelector(selector);
        if (element) {
            STATE.cachedElements[key] = element;
        }
        return element;
    };

    const clearElementCache = () => {
        STATE.cachedElements = {};
    };

    // ============================================
    // PAGE PROCESSING (with Error Boundary)
    // ============================================

    const processPageTitle = () => {
        if (STATE.isProcessing) return;
        STATE.isProcessing = true;

        try {
            let titleElement;

            if (STATE.currentSite.isOnWikipedia) {
                titleElement = getCachedElement('wiki', '#firstHeading .mw-page-title-main, #firstHeading');
            } else if (STATE.currentSite.isOnPSA) {
                titleElement = getCachedElement('psa', 'h1.post-title.entry-title.fittexted_for_single_post_title');
            } else if (STATE.currentSite.isOnStremio) {
                const logoImg = getCachedElement('stremio', 'img.logo-X3hTV[title]');
                if (logoImg && logoImg.title && !logoImg.hasAttribute('data-icons-added')) {
                    const title = logoImg.title.trim();
                    const wrapper = logoImg.parentElement;
                    if (wrapper && !wrapper.querySelector('.search-icons-container')) {
                        logoImg.setAttribute('data-icons-added', 'true');
                        addSearchIcons(wrapper, title);
                    }
                }
                STATE.isProcessing = false;
                return;
            } else if (STATE.currentSite.isOn1337x) {
                titleElement = getCachedElement('1337x', '.box-info-heading h1') ||
                              document.querySelector('.torrent-detail-page h1') ||
                              document.querySelector('.box-info h1') ||
                              document.querySelector('h1');

                if (titleElement) {
                    if (titleElement.querySelector('.search-icons-container')) {
                        STATE.isProcessing = false;
                        return;
                    }

                    const rawTitle = titleElement.textContent.trim();
                    const cleanTitle = parseTorrentTitle(rawTitle);

                    titleElement.style.display = 'inline-block';
                    titleElement.style.verticalAlign = 'middle';

                    addSearchIcons(titleElement, cleanTitle);
                }
                STATE.isProcessing = false;
                return;
            } else {
                titleElement = getCachedElement('imdb', 'span.hero__primary-text[data-testid="hero__primary-text"]');
            }

            if (titleElement && !titleElement.querySelector('.search-icons-container')) {
                const title = extractTitle(titleElement);
                addSearchIcons(titleElement, title);
            }
        } catch (error) {
            console.error('Processing error:', error);
            // Error boundary: prevent infinite loops
            STATE.isProcessing = false;
            throw error;
        } finally {
            STATE.isProcessing = false;
        }
    };

    // ============================================
    // KEYBOARD SHORTCUTS
    // ============================================

    const setupKeyboardShortcuts = () => {
        const shortcuts = new Map();
        PLATFORM_CONFIGS.forEach((config, id) => {
            if (config.shortcut) {
                shortcuts.set(config.shortcut.toLowerCase(), id);
            }
        });
        shortcuts.set('alt+w', 'wikipedia'); // Wikipedia shortcut

        document.addEventListener('keydown', (e) => {
            if (!e.altKey) return;

            const key = `alt+${e.key.toLowerCase()}`;
            const platformId = shortcuts.get(key);

            if (platformId) {
                e.preventDefault();
                const icon = document.querySelector(`.search-icon[data-platform-id="${platformId}"]`);
                if (icon) {
                    icon.classList.add('loading');
                    setTimeout(() => {
                        icon.click();
                        icon.classList.remove('loading');
                    }, 100);
                }
            }
        });
    };

    // ============================================
    // CONFIGURATION MENU
    // ============================================

    const setupConfigMenu = () => {
        GM_registerMenuCommand('⚙️ Configure Platforms', () => {
            const enabled = STATE.enabledPlatforms;
            const message = Array.from(PLATFORM_CONFIGS.entries())
                .map(([id, config]) => `${enabled.includes(id) ? '✓' : '✗'} ${config.name}`)
                .join('\n');

            alert(`Current Platform Status:\n\n${message}\n\nUse the individual toggle commands to enable/disable platforms.`);
        });

        PLATFORM_CONFIGS.forEach((config, id) => {
            GM_registerMenuCommand(`${STATE.enabledPlatforms.includes(id) ? '✓' : '✗'} ${config.name}`, () => {
                const index = STATE.enabledPlatforms.indexOf(id);
                if (index > -1) {
                    STATE.enabledPlatforms.splice(index, 1);
                } else {
                    STATE.enabledPlatforms.push(id);
                }
                GM_setValue('enabledPlatforms', STATE.enabledPlatforms);
                alert(`${config.name} ${index > -1 ? 'disabled' : 'enabled'}. Refresh the page to see changes.`);
            });
        });

        GM_registerMenuCommand('🔄 Reset Usage Stats', () => {
            if (confirm('Reset all icon usage statistics?')) {
                STATE.iconUsageCount = {};
                GM_setValue('iconUsageCount', {});
                alert('Usage statistics reset!');
            }
        });
    };

    // ============================================
    // OBSERVERS & INITIALIZATION (Optimized)
    // ============================================

    const processPage = () => {
        detectDarkMode();
        processPageTitle();
    };

    const debouncedProcess = debounce(processPage, CONFIG.debounceDelay);

    // Optimized observer with error boundary
    const observer = new MutationObserver((mutations) => {
        try {
            // Check if mutation is relevant before processing
            let shouldProcess = false;
            for (const mutation of mutations) {
                // Only process if added nodes might contain title elements
                if (mutation.addedNodes.length > 0) {
                    for (const node of mutation.addedNodes) {
                        if (node.nodeType === 1) { // Element node
                            shouldProcess = true;
                            break;
                        }
                    }
                }
                if (shouldProcess) break;
            }

            if (shouldProcess) {
                debouncedProcess();
            }
        } catch (error) {
            console.error('Observer error:', error);
            // Disconnect temporarily to prevent infinite loops
            observer.disconnect();
            setTimeout(() => {
                observer.observe(document.body, {
                    childList: true,
                    subtree: true
                });
            }, 1000);
        }
    });

    // Use requestIdleCallback for non-critical processing
    const scheduleWork = (callback) => {
        if ('requestIdleCallback' in window) {
            requestIdleCallback(callback, { timeout: 2000 });
        } else {
            setTimeout(callback, 0);
        }
    };

    // Replace setInterval with popstate/pushState listeners
    const setupNavigationListeners = () => {
        // Handle browser back/forward
        window.addEventListener('popstate', () => {
            STATE.imdbIdCache = null;
            clearElementCache();
            scheduleWork(processPage);
        });

        // Handle SPA navigation (pushState)
        const originalPushState = history.pushState;
        history.pushState = new Proxy(originalPushState, {
            apply(target, thisArg, argArray) {
                const result = Reflect.apply(target, thisArg, argArray);
                STATE.imdbIdCache = null;
                clearElementCache();
                scheduleWork(processPage);
                return result;
            }
        });

        // Handle replaceState as well
        const originalReplaceState = history.replaceState;
        history.replaceState = new Proxy(originalReplaceState, {
            apply(target, thisArg, argArray) {
                const result = Reflect.apply(target, thisArg, argArray);
                STATE.imdbIdCache = null;
                clearElementCache();
                scheduleWork(processPage);
                return result;
            }
        });

        // Handle hash changes (for sites like Stremio)
        window.addEventListener('hashchange', () => {
            STATE.imdbIdCache = null;
            clearElementCache();
            scheduleWork(processPage);
        });
    };

    // ============================================
    // INITIALIZATION
    // ============================================

    const init = () => {
        try {
            injectStyles();
            detectDarkMode();
            setupKeyboardShortcuts();
            setupConfigMenu();
            setupNavigationListeners();

            // Initial page processing
            scheduleWork(() => {
                setTimeout(processPage, 1000);
            });

            // Start observing
            observer.observe(document.body, {
                childList: true,
                subtree: true
            });

            console.log('🎬 Search Icons initialized - v3.0');
        } catch (error) {
            console.error('Initialization error:', error);
        }
    };

    // Start the script
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();