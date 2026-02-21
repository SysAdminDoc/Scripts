// ==UserScript==
// @name         4chan X Lite
// @version      1.3.0
// @namespace    4chan-x-lite
// @description  Streamlined 4chan enhancement script with professional UI
// @license      MIT
// @match        *://boards.4chan.org/*
// @match        *://boards.4channel.org/*
// @match        *://sys.4chan.org/*
// @match        *://sys.4channel.org/*
// @match        *://www.4chan.org/*
// @match        *://www.4channel.org/*
// @match        *://i.4cdn.org/*
// @exclude      *://www.4chan.org/advertise*
// @exclude      *://www.4channel.org/advertise*
// @require      https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_deleteValue
// @grant        GM_listValues
// @grant        GM_xmlhttpRequest
// @grant        GM_openInTab
// @grant        GM.getValue
// @grant        GM.setValue
// @grant        GM.deleteValue
// @grant        GM.xmlHttpRequest
// @run-at       document-start
// @icon         data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%23020617" width="100" height="100" rx="12"/><text x="50" y="68" font-size="50" text-anchor="middle" fill="%2322c55e">X</text></svg>
// ==/UserScript==

/*
 * 4chan X Lite
 * A streamlined, professional-grade 4chan enhancement script
 * Based on features from 4chan X by ccd0
 *
 * Features:
 * - Thread/Post Filtering (MD5, regex, keywords)
 * - Image Hover & Expansion
 * - Thread Updater & Watcher
 * - Quote Inlining & Previewing
 * - Embedding (YouTube, etc.)
 * - Gallery Mode
 * - Professional Dark Theme Settings UI
 */

(function() {
'use strict';

// ============================================================================
// EARLY INJECTION (document-start) - Anti-FOUC + Native Extension Disabler
// ============================================================================

// Disable 4chan's native extension before it loads
if (document.currentScript) {
    document.dispatchEvent(new CustomEvent('4chanXInitFinished'));
}
// Fallback: inject into page context to block native ext
try {
    const s = document.createElement('script');
    s.textContent = 'document.dispatchEvent(new CustomEvent("4chanXInitFinished"));';
    (document.head || document.documentElement).appendChild(s);
    s.remove();
} catch(e) {}

// Anti-FOUC: inject critical hiding CSS immediately at document-start
const antiFouc = document.createElement('style');
antiFouc.id = 'xcl-anti-fouc';
antiFouc.textContent = `
    /* Anti-FOUC: Hide elements that will be styled by the script */
    body:not(.xcl-ready) .ad-cnt, body:not(.xcl-ready) .ad-boards,
    body:not(.xcl-ready) .adg-rects, body:not(.xcl-ready) .abovePostForm > .adg,
    body:not(.xcl-ready) #bottomAdg { display: none !important; }
    /* Hide native extension UI when disabled */
    #settingsMenu, .extButton.settingsIcon { display: none !important; }
`;
(document.head || document.documentElement).appendChild(antiFouc);

// ============================================================================
// CONFIGURATION
// ============================================================================

const VERSION = '1.3.0';
const NAMESPACE = '4chanXLite.';

// Default configuration
const DefaultConfig = {
    // Core
    'Disable Native Extension': true,
    'JSON Index': true,
    'Use Catalog': true,

    // Theme
    'Theme': 'dark',
    'Custom Themes': [],

    // Layout - Margins
    'Left Margin': 5,
    'Right Margin': 5,
    'Custom Left Margin': 0,
    'Custom Right Margin': 0,

    // Layout - Sidebar
    'Sidebar Position': 'right',
    'Sidebar Enabled': true,
    'Minimal Sidebar': true,

    // Custom Background
    'Custom Background URL': '',
    'Background Position': 'center',
    'Background Repeat': 'no-repeat',
    'Background Attachment': 'fixed',
    'Background Size': 'cover',

    // Per-Element Visibility
    'Hide Ads': true,
    'Hide Blotter': true,
    'Hide Board Banner': false,
    'Hide Board Title': false,
    'Hide Footer': true,
    'Hide Sticky Threads': false,
    'Hide Post Form': false,
    'Hide Rules': true,
    'Hide Nav Links Top': false,
    'Hide Nav Links Bottom': true,
    'Show Checkboxes': false,
    'Modernize Interface': true,

    // Quick Reply Styling
    'QR Autohide Style': 'normal',
    'Transparent QR': false,
    'QR Remove Background': false,

    // Filtering
    'Filter Enabled': true,
    'MD5 Filters': '',
    'Name Filters': '',
    'Tripcode Filters': '',
    'Subject Filters': '',
    'Comment Filters': '',
    'Filename Filters': '',
    'Flag Filters': '',
    'Recursive Hiding': true,
    'Thread Hiding Buttons': true,
    'Reply Hiding Buttons': true,
    'Stubs': true,
    'Stub Format': 'Post hidden (click to show)',
    'Highlight Filters': '',
    'Highlight Color': '#ffeb3b',
    'Sort Highlighted First': true,

    // Quotes
    'Quote Backlinks': true,
    'Quote Inlining': true,
    'Quote Previewing': true,
    'Quote Highlighting': true,
    'Mark Quotes of You': true,
    'Highlight Own Posts': true,
    'Mark OP Quotes': true,
    'Mark Cross-thread Quotes': true,
    'Remember Your Posts': true,
    'Quote Threading': true,
    'Quote Threading Default': false,

    // Images
    'Image Expansion': true,
    'Image Hover': true,
    'Image Prefetching': true,
    'Fit Width': true,
    'Fit Height': true,
    'Original Filename Download': true,
    'Replace GIF': false,

    // Video
    'Video Expansion': true,
    'Video Hover': true,
    'Video Prefetching': true,
    'Video Hover Sound': false,
    'Video Thumbnail Preview': true,

    // Gallery
    'Gallery': true,
    'Gallery Fit Width': true,
    'Gallery Fit Height': true,

    // Media Embedding
    'Embedding': true,
    'Auto-embed': true,
    'Autoplay': true,
    'Show Controls': true,
    'Default Volume': 0.5,
    'Embed YouTube': true,
    'Embed Streamable': true,
    'Embed Vocaroo': true,
    'Embed SoundCloud': true,
    'Embed Twitter': true,
    'Embed Imgur': true,
    'Embed Catbox': true,
    'Embed Gfycat': true,
    'Embed Coub': true,
    'Embed TikTok': true,
    'Embed Spotify': true,

    // Thread Updater
    'Thread Updater': true,
    'Auto Update': true,
    'Update Interval': 30,
    'Unread Count': true,
    'Unread Favicon': true,
    'Unread Line': true,
    'Desktop Notifications': false,
    'Remember Last Read': true,
    'Scroll to Last Read': true,

    // Thread Watcher
    'Thread Watcher': true,
    'Auto Watch': true,
    'Auto Watch Reply': true,

    // Quick Reply
    'Quick Reply': true,
    'Persistent QR': false,
    'Auto Hide QR': true,
    'Remember Name': false,
    'Remember Subject': false,

    // Index & Catalog
    'Infinite Scroll': true,
    'Catalog Sort': 'bump',
    'Catalog Search': true,
    'Threads Per Page': 15,

    // Appearance
    'Time Formatting': true,
    'Relative Post Dates': true,
    'Color User IDs': true,
    'ID Post Count': true,
    'ID Highlighting': true,
    'Thread Stats': true,
    'Linkify': true,
    'Custom CSS': true,
    'User CSS': '',
    'Post Width': 'auto',
    'Thumbnail Size': 'medium',
    'Hide Sidebar': false,
    'Compact Mode': false,
    'Post Hover Highlight': true,

    // Navigation
    'Board Nav Shortcuts': true,
    'Favorite Boards': 'g,pol,v,a',

    // Batch Download
    'Batch Download': true,
    'ZIP Filename Format': 'original',  // 'original', 'postid', 'combined'
    'Per-Post Download Buttons': true,
    'Max Concurrent Downloads': 5,

    // Advanced
    'Keyboard Shortcuts': false,
    'Archive Redirect': true,

    // Hidden data
    'hiddenThreads': {},
    'hiddenPosts': {},
    'yourPosts': {},
    'watchedThreads': {}
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

const $ = {
    el: (tag, props = {}, children = []) => {
        const el = document.createElement(tag);
        Object.assign(el, props);
        if (typeof children === 'string') {
            el.innerHTML = children;
        } else if (Array.isArray(children)) {
            children.forEach(child => {
                if (typeof child === 'string') {
                    el.appendChild(document.createTextNode(child));
                } else if (child) {
                    el.appendChild(child);
                }
            });
        }
        return el;
    },

    on: (el, event, handler, options) => el.addEventListener(event, handler, options),
    off: (el, event, handler) => el.removeEventListener(event, handler),

    add: (parent, ...children) => children.flat().forEach(c => c && parent.appendChild(c)),
    prepend: (parent, child) => parent.insertBefore(child, parent.firstChild),
    before: (ref, el) => ref.parentNode.insertBefore(el, ref),
    after: (ref, el) => ref.parentNode.insertBefore(el, ref.nextSibling),
    replace: (old, el) => old.parentNode.replaceChild(el, old),
    rm: el => el?.remove(),
    rmAll: el => { while (el.firstChild) el.removeChild(el.firstChild); },

    hasClass: (el, c) => el.classList.contains(c),
    addClass: (el, ...c) => el.classList.add(...c),
    rmClass: (el, ...c) => el.classList.remove(...c),
    toggleClass: (el, c, force) => el.classList.toggle(c, force),

    qs: (sel, root = document) => root.querySelector(sel),
    qsa: (sel, root = document) => [...root.querySelectorAll(sel)],
    id: id => document.getElementById(id),

    ready: cb => {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', cb);
        } else {
            cb();
        }
    },

    // Storage
    get: async (key, def) => {
        try {
            const val = await (typeof GM_getValue !== 'undefined' ?
                GM_getValue(NAMESPACE + key) :
                GM.getValue(NAMESPACE + key));
            return val !== undefined ? JSON.parse(val) : def;
        } catch {
            return def;
        }
    },

    set: async (key, val) => {
        try {
            const fn = typeof GM_setValue !== 'undefined' ? GM_setValue : GM.setValue;
            await fn(NAMESPACE + key, JSON.stringify(val));
        } catch (e) {
            console.error('4chan X Lite: Storage error', e);
        }
    },

    delete: async key => {
        try {
            const fn = typeof GM_deleteValue !== 'undefined' ? GM_deleteValue : GM.deleteValue;
            await fn(NAMESPACE + key);
        } catch (e) {
            console.error('4chan X Lite: Delete error', e);
        }
    }
};

// Escape HTML
const E = str => str.replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
}[c]));

// Save configuration to persistent storage
function saveConfig() {
    $.set('config', Conf);
}

// ============================================================================
// GLOBAL STATE
// ============================================================================

const g = {
    VERSION,
    BOARD: null,
    THREAD: null,
    VIEW: null, // 'index', 'thread', 'catalog'
    posts: new Map(),
    threads: new Map()
};

let Conf = {};

// ============================================================================
// CSS STYLES
// ============================================================================

const CSS = `
/* ============================================================================
   4chan X Lite - Theme System & Core Styles
   ============================================================================ */

/* Theme: Dark (Default) - Slate with Green accents */
:root, [data-theme="dark"] {
    --xcl-bg-page: #0a0f1a;
    --xcl-bg-primary: #0f172a;
    --xcl-bg-secondary: #1e293b;
    --xcl-bg-tertiary: #334155;
    --xcl-bg-hover: #3f4f66;
    --xcl-bg-post: #131c2e;
    --xcl-accent: #22c55e;
    --xcl-accent-hover: #16a34a;
    --xcl-accent-dim: rgba(34, 197, 94, 0.15);
    --xcl-text-primary: #e2e8f0;
    --xcl-text-secondary: #94a3b8;
    --xcl-text-muted: #64748b;
    --xcl-text-link: #60a5fa;
    --xcl-text-quote: #a3e635;
    --xcl-border: #2d3a4f;
    --xcl-error: #ef4444;
    --xcl-warning: #f59e0b;
    --xcl-success: #22c55e;
    --xcl-radius: 6px;
    --xcl-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
    --xcl-transition: 0.15s ease;
}

/* Theme: Midnight - Deep blue with purple accents */
[data-theme="midnight"] {
    --xcl-bg-page: #0c0a1d;
    --xcl-bg-primary: #110e24;
    --xcl-bg-secondary: #1a1533;
    --xcl-bg-tertiary: #251f42;
    --xcl-bg-hover: #312951;
    --xcl-bg-post: #14112a;
    --xcl-accent: #a78bfa;
    --xcl-accent-hover: #8b5cf6;
    --xcl-accent-dim: rgba(167, 139, 250, 0.15);
    --xcl-text-primary: #e0def4;
    --xcl-text-secondary: #908caa;
    --xcl-text-muted: #6e6a86;
    --xcl-text-link: #7dd3fc;
    --xcl-text-quote: #c4b5fd;
    --xcl-border: #2a2545;
}

/* Theme: AMOLED - Pure black for OLED screens */
[data-theme="amoled"] {
    --xcl-bg-page: #000000;
    --xcl-bg-primary: #000000;
    --xcl-bg-secondary: #0a0a0a;
    --xcl-bg-tertiary: #141414;
    --xcl-bg-hover: #1f1f1f;
    --xcl-bg-post: #050505;
    --xcl-accent: #10b981;
    --xcl-accent-hover: #059669;
    --xcl-accent-dim: rgba(16, 185, 129, 0.12);
    --xcl-text-primary: #ffffff;
    --xcl-text-secondary: #a0a0a0;
    --xcl-text-muted: #666666;
    --xcl-text-link: #38bdf8;
    --xcl-text-quote: #4ade80;
    --xcl-border: #1a1a1a;
}

/* Theme: Tomorrow Night */
[data-theme="tomorrow"] {
    --xcl-bg-page: #1d1f21;
    --xcl-bg-primary: #1d1f21;
    --xcl-bg-secondary: #282a2e;
    --xcl-bg-tertiary: #373b41;
    --xcl-bg-hover: #4a4e54;
    --xcl-bg-post: #232527;
    --xcl-accent: #81a2be;
    --xcl-accent-hover: #5f819d;
    --xcl-accent-dim: rgba(129, 162, 190, 0.15);
    --xcl-text-primary: #c5c8c6;
    --xcl-text-secondary: #969896;
    --xcl-text-muted: #707070;
    --xcl-text-link: #81a2be;
    --xcl-text-quote: #b5bd68;
    --xcl-border: #373b41;
}

/* Theme: Nord - Arctic, north-bluish color palette */
[data-theme="nord"] {
    --xcl-bg-page: #242933;
    --xcl-bg-primary: #2e3440;
    --xcl-bg-secondary: #3b4252;
    --xcl-bg-tertiary: #434c5e;
    --xcl-bg-hover: #4c566a;
    --xcl-bg-post: #2e3440;
    --xcl-accent: #88c0d0;
    --xcl-accent-hover: #81a1c1;
    --xcl-accent-dim: rgba(136, 192, 208, 0.15);
    --xcl-text-primary: #eceff4;
    --xcl-text-secondary: #d8dee9;
    --xcl-text-muted: #7b88a1;
    --xcl-text-link: #88c0d0;
    --xcl-text-quote: #a3be8c;
    --xcl-border: #4c566a;
}

/* Theme: Dracula - Popular purple theme */
[data-theme="dracula"] {
    --xcl-bg-page: #21222c;
    --xcl-bg-primary: #282a36;
    --xcl-bg-secondary: #343746;
    --xcl-bg-tertiary: #44475a;
    --xcl-bg-hover: #525568;
    --xcl-bg-post: #2d2f3d;
    --xcl-accent: #bd93f9;
    --xcl-accent-hover: #a679f0;
    --xcl-accent-dim: rgba(189, 147, 249, 0.15);
    --xcl-text-primary: #f8f8f2;
    --xcl-text-secondary: #c0c0c0;
    --xcl-text-muted: #6272a4;
    --xcl-text-link: #8be9fd;
    --xcl-text-quote: #50fa7b;
    --xcl-border: #44475a;
}

/* Theme: Gruvbox Dark */
[data-theme="gruvbox"] {
    --xcl-bg-page: #1d2021;
    --xcl-bg-primary: #282828;
    --xcl-bg-secondary: #32302f;
    --xcl-bg-tertiary: #3c3836;
    --xcl-bg-hover: #504945;
    --xcl-bg-post: #2a2a2a;
    --xcl-accent: #b8bb26;
    --xcl-accent-hover: #98971a;
    --xcl-accent-dim: rgba(184, 187, 38, 0.15);
    --xcl-text-primary: #ebdbb2;
    --xcl-text-secondary: #bdae93;
    --xcl-text-muted: #7c6f64;
    --xcl-text-link: #83a598;
    --xcl-text-quote: #b8bb26;
    --xcl-border: #504945;
}

/* Theme: Monokai */
[data-theme="monokai"] {
    --xcl-bg-page: #1e1f1c;
    --xcl-bg-primary: #272822;
    --xcl-bg-secondary: #2d2e27;
    --xcl-bg-tertiary: #3e3d32;
    --xcl-bg-hover: #49483e;
    --xcl-bg-post: #2a2b25;
    --xcl-accent: #a6e22e;
    --xcl-accent-hover: #8bc01a;
    --xcl-accent-dim: rgba(166, 226, 46, 0.15);
    --xcl-text-primary: #f8f8f2;
    --xcl-text-secondary: #c0c0b0;
    --xcl-text-muted: #75715e;
    --xcl-text-link: #66d9ef;
    --xcl-text-quote: #a6e22e;
    --xcl-border: #49483e;
}

/* Theme: Solarized Dark */
[data-theme="solarized-dark"] {
    --xcl-bg-page: #002b36;
    --xcl-bg-primary: #073642;
    --xcl-bg-secondary: #0a4050;
    --xcl-bg-tertiary: #0d4a5a;
    --xcl-bg-hover: #1a5566;
    --xcl-bg-post: #053540;
    --xcl-accent: #268bd2;
    --xcl-accent-hover: #2aa198;
    --xcl-accent-dim: rgba(38, 139, 210, 0.15);
    --xcl-text-primary: #93a1a1;
    --xcl-text-secondary: #839496;
    --xcl-text-muted: #657b83;
    --xcl-text-link: #268bd2;
    --xcl-text-quote: #859900;
    --xcl-border: #094959;
}

/* Theme: Solarized Light */
[data-theme="solarized-light"] {
    --xcl-bg-page: #fdf6e3;
    --xcl-bg-primary: #eee8d5;
    --xcl-bg-secondary: #e8e2cc;
    --xcl-bg-tertiary: #ddd6c1;
    --xcl-bg-hover: #d4ccb4;
    --xcl-bg-post: #f5eed9;
    --xcl-accent: #268bd2;
    --xcl-accent-hover: #2aa198;
    --xcl-accent-dim: rgba(38, 139, 210, 0.15);
    --xcl-text-primary: #586e75;
    --xcl-text-secondary: #657b83;
    --xcl-text-muted: #93a1a1;
    --xcl-text-link: #268bd2;
    --xcl-text-quote: #859900;
    --xcl-border: #c9c2a8;
}

/* Theme: Zenburned */
[data-theme="zenburned"] {
    --xcl-bg-page: #3f3f3f;
    --xcl-bg-primary: #4a4a4a;
    --xcl-bg-secondary: #575757;
    --xcl-bg-tertiary: #636363;
    --xcl-bg-hover: #6f6f6f;
    --xcl-bg-post: #505050;
    --xcl-accent: #f0dfaf;
    --xcl-accent-hover: #dca3a3;
    --xcl-accent-dim: rgba(240, 223, 175, 0.15);
    --xcl-text-primary: #dcdccc;
    --xcl-text-secondary: #c0c0b0;
    --xcl-text-muted: #888888;
    --xcl-text-link: #efdcbc;
    --xcl-text-quote: #7f9f7f;
    --xcl-border: #5e5e5e;
}

/* Theme: Yotsuba (Light) */
[data-theme="yotsuba"] {
    --xcl-bg-page: #ffe8bd;
    --xcl-bg-primary: #f0e0d6;
    --xcl-bg-secondary: #e8d5c9;
    --xcl-bg-tertiary: #d9c7b8;
    --xcl-bg-hover: #c9b7a7;
    --xcl-bg-post: #f5ebe0;
    --xcl-accent: #800000;
    --xcl-accent-hover: #a00000;
    --xcl-accent-dim: rgba(128, 0, 0, 0.1);
    --xcl-text-primary: #000000;
    --xcl-text-secondary: #333333;
    --xcl-text-muted: #666666;
    --xcl-text-link: #0000ee;
    --xcl-text-quote: #789922;
    --xcl-border: #d9bfb7;
}

/* Theme: Yotsuba B (Light Blue) */
[data-theme="yotsuba-b"] {
    --xcl-bg-page: #eef2ff;
    --xcl-bg-primary: #d6daf0;
    --xcl-bg-secondary: #c9cde5;
    --xcl-bg-tertiary: #b7bbd9;
    --xcl-bg-hover: #a5a9cd;
    --xcl-bg-post: #dfe3f5;
    --xcl-accent: #34345c;
    --xcl-accent-hover: #4a4a7c;
    --xcl-accent-dim: rgba(52, 52, 92, 0.1);
    --xcl-text-primary: #000000;
    --xcl-text-secondary: #333333;
    --xcl-text-muted: #666666;
    --xcl-text-link: #34345c;
    --xcl-text-quote: #789922;
    --xcl-border: #b7c5d9;
}

/* Theme: Photon (Light) */
[data-theme="photon"] {
    --xcl-bg-page: #eeeeee;
    --xcl-bg-primary: #dddddd;
    --xcl-bg-secondary: #d0d0d0;
    --xcl-bg-tertiary: #c0c0c0;
    --xcl-bg-hover: #b0b0b0;
    --xcl-bg-post: #e5e5e5;
    --xcl-accent: #ff6600;
    --xcl-accent-hover: #cc5500;
    --xcl-accent-dim: rgba(255, 102, 0, 0.1);
    --xcl-text-primary: #333333;
    --xcl-text-secondary: #555555;
    --xcl-text-muted: #888888;
    --xcl-text-link: #ff6600;
    --xcl-text-quote: #789922;
    --xcl-border: #c0c0c0;
}

/* Theme: Cold Snap */
[data-theme="cold-snap"] {
    --xcl-bg-page: #ffffff;
    --xcl-bg-primary: #fcfcfc;
    --xcl-bg-secondary: #f5f5f5;
    --xcl-bg-tertiary: #ebebeb;
    --xcl-bg-hover: #e0e0e0;
    --xcl-bg-post: #fafafa;
    --xcl-accent: #6699cc;
    --xcl-accent-hover: #5588bb;
    --xcl-accent-dim: rgba(102, 153, 204, 0.1);
    --xcl-text-primary: #232323;
    --xcl-text-secondary: #555555;
    --xcl-text-muted: #aaaaaa;
    --xcl-text-link: #6699cc;
    --xcl-text-quote: #83bf57;
    --xcl-border: #ebebeb;
}

/* Theme: Midnight Caek */
[data-theme="midnight-caek"] {
    --xcl-bg-page: #101010;
    --xcl-bg-primary: #1c1c1c;
    --xcl-bg-secondary: #252525;
    --xcl-bg-tertiary: #2e2e2e;
    --xcl-bg-hover: #3a3a3a;
    --xcl-bg-post: #1a1a1a;
    --xcl-accent: #57577b;
    --xcl-accent-hover: #47475b;
    --xcl-accent-dim: rgba(87, 87, 123, 0.15);
    --xcl-text-primary: #909090;
    --xcl-text-secondary: #787878;
    --xcl-text-muted: #5a5a5a;
    --xcl-text-link: #57577b;
    --xcl-text-quote: #629755;
    --xcl-border: #2a2a2a;
}

/* Theme: Yasashii */
[data-theme="yasashii"] {
    --xcl-bg-page: #ebebeb;
    --xcl-bg-primary: #f8f8f8;
    --xcl-bg-secondary: #f0f0f0;
    --xcl-bg-tertiary: #e5e5e5;
    --xcl-bg-hover: #d8d8d8;
    --xcl-bg-post: #f5f5f5;
    --xcl-accent: #a6586f;
    --xcl-accent-hover: #8a4a5d;
    --xcl-accent-dim: rgba(166, 88, 111, 0.12);
    --xcl-text-primary: #5b5c5c;
    --xcl-text-secondary: #747575;
    --xcl-text-muted: #9a9b9b;
    --xcl-text-link: #b78087;
    --xcl-text-quote: #7eba6c;
    --xcl-border: #d8d8d8;
}

/* Theme: Blue Tone */
[data-theme="blue-tone"] {
    --xcl-bg-page: #131313;
    --xcl-bg-primary: #1a1a1a;
    --xcl-bg-secondary: #222222;
    --xcl-bg-tertiary: #2a2a2a;
    --xcl-bg-hover: #333333;
    --xcl-bg-post: #1c1c1c;
    --xcl-accent: #3296c8;
    --xcl-accent-hover: #2780b0;
    --xcl-accent-dim: rgba(50, 150, 200, 0.15);
    --xcl-text-primary: #dddddd;
    --xcl-text-secondary: #a0a0a0;
    --xcl-text-muted: #666666;
    --xcl-text-link: #3296c8;
    --xcl-text-quote: #009933;
    --xcl-border: #2a2a2a;
}

/* Theme: AppChan */
[data-theme="appchan"] {
    --xcl-bg-page: #2c2c2c;
    --xcl-bg-primary: #333333;
    --xcl-bg-secondary: #3c3c3c;
    --xcl-bg-tertiary: #454545;
    --xcl-bg-hover: #505050;
    --xcl-bg-post: #363636;
    --xcl-accent: #6688aa;
    --xcl-accent-hover: #5577aa;
    --xcl-accent-dim: rgba(102, 136, 170, 0.15);
    --xcl-text-primary: #aaaaaa;
    --xcl-text-secondary: #888888;
    --xcl-text-muted: #666666;
    --xcl-text-link: #6688aa;
    --xcl-text-quote: #789922;
    --xcl-border: #404040;
}

/* ============================================================================
   SITE CLEANUP - Hide Ads, Clutter, Unwanted Elements
   ============================================================================ */

/* Hide ads */
body.xcl-hide-ads .middlead,
body.xcl-hide-ads .adl,
body.xcl-hide-ads .danbo-slot,
body.xcl-hide-ads .aboveMidAd,
body.xcl-hide-ads [id^="danbo"],
body.xcl-hide-ads [class*="ad-"],
body.xcl-hide-ads .ad,
body.xcl-hide-ads .ads,
body.xcl-hide-ads #bottomReportBtn,
body.xcl-hide-ads .adg-rects,
body.xcl-hide-ads .adp-8,
body.xcl-hide-ads .center:has(> a > img[src*="contest"]),
body.xcl-hide-ads hr.aboveMidAd {
    display: none !important;
}

/* Hide blotter (news/announcements) */
body.xcl-hide-blotter #blotter,
body.xcl-hide-blotter .blotter {
    display: none !important;
}

/* Hide board banner */
body.xcl-hide-banner .boardBanner,
body.xcl-hide-banner #bannerCnt {
    display: none !important;
}

/* Hide board title */
body.xcl-hide-board-title .boardTitle,
body.xcl-hide-board-title .boardSubtitle {
    display: none !important;
}

/* Hide post form (reply form) */
body.xcl-hide-post-form #postForm,
body.xcl-hide-post-form .postForm {
    display: none !important;
}

/* Hide rules */
body.xcl-hide-rules .rules,
body.xcl-hide-rules .board > hr:first-of-type {
    display: none !important;
}

/* Hide top nav links */
body.xcl-hide-nav-top #boardNavDesktop,
body.xcl-hide-nav-top .navLinks:first-of-type {
    display: none !important;
}

/* Hide bottom nav links */
body.xcl-hide-nav-bottom #boardNavDesktopFoot,
body.xcl-hide-nav-bottom .navLinks:last-of-type {
    display: none !important;
}

/* Hide checkboxes */
body.xcl-hide-checkboxes input[type="checkbox"]:not(#xcl-settings input),
body.xcl-hide-checkboxes .delform > div:last-of-type {
    display: none !important;
}

/* Hide footer bloat */
body.xcl-hide-footer #boardNavDesktopFoot,
body.xcl-hide-footer #absbot {
    display: none !important;
}

/* Hide sticky threads in catalog */
body.xcl-hide-stickies .thread:has(.stickyIcon) {
    display: none !important;
}

/* General cleanup */
body.xcl-modernize .navLinks.desktop:not(.navLinksBot),
body.xcl-modernize #boardNavDesktop,
body.xcl-modernize #boardNavMobile,
body.xcl-modernize .navLinksBot,
body.xcl-modernize #togglePostFormLink,
body.xcl-modernize .passNotice,
body.xcl-modernize .rules,
body.xcl-modernize .mobilePostFormToggle,
body.xcl-modernize .globalToggle,
body.xcl-modernize #postPassword,
body.xcl-modernize [name="postpassword"],
body.xcl-modernize .bottomCtrl,
body.xcl-modernize #styleSelector,
body.xcl-modernize .stylechanger,
body.xcl-modernize hr {
    display: none !important;
}

/* ============================================================================
   MODERN 4CHAN INTERFACE - Only apply to non-catalog pages
   ============================================================================ */

/* Custom Background Support */
body.xcl-custom-bg {
    background-image: var(--xcl-custom-bg-url) !important;
    background-position: var(--xcl-custom-bg-position) !important;
    background-repeat: var(--xcl-custom-bg-repeat) !important;
    background-attachment: var(--xcl-custom-bg-attachment) !important;
    background-size: var(--xcl-custom-bg-size) !important;
}

/* Margin Controls */
body {
    --xcl-left-margin: 5px;
    --xcl-right-margin: 5px;
}

body.xcl-margin-left-none { --xcl-left-margin: 0; }
body.xcl-margin-left-small { --xcl-left-margin: 5px; }
body.xcl-margin-left-medium { --xcl-left-margin: 25px; }
body.xcl-margin-left-large { --xcl-left-margin: 65px; }

body.xcl-margin-right-none { --xcl-right-margin: 0; }
body.xcl-margin-right-small { --xcl-right-margin: 5px; }
body.xcl-margin-right-medium { --xcl-right-margin: 25px; }
body.xcl-margin-right-large { --xcl-right-margin: 65px; }

.board, .thread, #delform {
    margin-left: var(--xcl-left-margin) !important;
    margin-right: var(--xcl-right-margin) !important;
}

/* Sidebar Positioning */
body.xcl-sidebar-left #xcl-thread-stats,
body.xcl-sidebar-left #xcl-thread-watcher {
    right: auto !important;
    left: 20px !important;
}

body.xcl-sidebar-disabled #xcl-thread-stats,
body.xcl-sidebar-disabled #xcl-thread-watcher {
    display: none !important;
}

/* Minimal Sidebar */
body.xcl-minimal-sidebar #xcl-thread-stats {
    padding: 4px 8px !important;
    font-size: 11px !important;
}

body.xcl-minimal-sidebar #xcl-thread-watcher {
    max-width: 200px !important;
}

/* Quick Reply Styling */
#xcl-qr.xcl-qr-transparent {
    opacity: 0.9;
    backdrop-filter: blur(4px);
}

#xcl-qr.xcl-qr-no-bg {
    background: transparent !important;
    box-shadow: none !important;
    border: 1px solid var(--xcl-border) !important;
}

/* QR Autohide Styles */
#xcl-qr.xcl-qr-autohide-fade {
    transition: opacity 0.3s ease;
}

#xcl-qr.xcl-qr-autohide-fade:not(:hover):not(:focus-within) {
    opacity: 0.3;
}

#xcl-qr.xcl-qr-autohide-vertical {
    transform: translateX(calc(100% - 30px));
    transition: transform 0.3s ease;
}

#xcl-qr.xcl-qr-autohide-vertical:hover,
#xcl-qr.xcl-qr-autohide-vertical:focus-within {
    transform: translateX(0);
}

#xcl-qr.xcl-qr-autohide-vertical::before {
    content: 'QR';
    position: absolute;
    left: -20px;
    top: 50%;
    transform: translateY(-50%) rotate(-90deg);
    font-size: 10px;
    color: var(--xcl-text-muted);
}

/* Base styles - apply everywhere for theming */
body {
    background: var(--xcl-bg-page) !important;
    color: var(--xcl-text-primary) !important;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif !important;
    font-size: 13px;
    line-height: 1.5;
    margin: 0;
    padding-top: 8px;
}

/* Board wrapper - minimal, safe for all pages */
.board {
    padding: 10px;
}

/* Thread container - ONLY for actual thread view with replies */
.replyContainer {
    /* marker to ensure this is thread view */
}

.board > .thread:has(.replyContainer),
form[name="delform"] > .thread:has(.replyContainer) {
    background: var(--xcl-bg-primary);
    border: 1px solid var(--xcl-border);
    border-radius: var(--xcl-radius);
    margin: 16px 0;
    padding: 0;
}

/* Post styles - only in thread view */
.thread:has(.replyContainer) .post,
.replyContainer .post {
    background: var(--xcl-bg-post);
    padding: 12px 16px;
    border-bottom: 1px solid var(--xcl-border);
    transition: background var(--xcl-transition);
}

.thread:has(.replyContainer) .post:last-child {
    border-bottom: none;
}

.thread:has(.replyContainer) .post:hover {
    background: var(--xcl-bg-secondary);
}

.thread:has(.replyContainer) .post.op {
    background: var(--xcl-bg-primary);
    border-bottom: 2px solid var(--xcl-border);
}

.thread:has(.replyContainer) .postContainer {
    display: block;
}

/* Post info (header) - only in thread view */
.thread:has(.replyContainer) .postInfo,
.replyContainer .postInfo {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
    font-size: 12px;
}

.subject {
    color: var(--xcl-accent) !important;
    font-weight: 600;
    font-size: 14px;
}

.name {
    color: var(--xcl-text-primary) !important;
    font-weight: 500;
}

.postertrip {
    color: var(--xcl-accent) !important;
}

.posteruid {
    font-size: 11px;
}

.posteruid .hand {
    padding: 2px 6px;
    border-radius: 3px;
    font-size: 10px;
    font-weight: 600;
    cursor: pointer;
}

.posteruid .hand:hover {
    filter: brightness(1.2);
}

/* ID Highlighting */
.posteruid .hand {
    cursor: pointer;
    padding: 0 2px;
    border-radius: 2px;
    transition: filter 0.15s ease;
}

.posteruid .hand:hover {
    filter: brightness(1.15);
}

.post.xcl-id-highlight {
    box-shadow: inset 3px 0 0 var(--xcl-accent) !important;
    background: var(--xcl-accent-dim) !important;
}

.post.xcl-id-highlight .postInfo {
    background: rgba(34, 197, 94, 0.1) !important;
}

/* Thread Stats */
#xcl-thread-stats {
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: var(--xcl-bg-secondary);
    border: 1px solid var(--xcl-border);
    border-radius: 6px;
    padding: 8px 12px;
    font-size: 12px;
    color: var(--xcl-text-secondary);
    z-index: 100;
    display: flex;
    gap: 12px;
    box-shadow: var(--xcl-shadow);
}

#xcl-thread-stats span {
    display: flex;
    align-items: center;
    gap: 4px;
}

#xcl-thread-stats .stat-value {
    color: var(--xcl-text-primary);
    font-weight: 600;
}

#xcl-thread-stats .stat-label {
    color: var(--xcl-text-muted);
    font-size: 10px;
}

#xcl-thread-stats .warning {
    color: var(--xcl-warning);
}

/* Batch Download */
#xcl-batch-download {
    display: flex;
    align-items: center;
    gap: 12px;
    margin: 12px 0;
    padding: 10px 15px;
    background: var(--xcl-bg-secondary);
    border: 1px solid var(--xcl-border);
    border-radius: 8px;
}

#xcl-batch-download-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 14px;
    background: var(--xcl-accent);
    color: var(--xcl-bg-primary);
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 12px;
    font-weight: 600;
    transition: all 0.2s ease;
    white-space: nowrap;
}

#xcl-batch-download-btn:hover {
    background: var(--xcl-accent-hover);
    transform: translateY(-1px);
}

#xcl-batch-download-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
}

#xcl-batch-download-btn svg {
    width: 14px;
    height: 14px;
}

.xcl-dl-options {
    display: flex;
    gap: 12px;
    align-items: center;
}

.xcl-dl-option {
    display: flex;
    align-items: center;
    gap: 4px;
    cursor: pointer;
    font-size: 11px;
    color: var(--xcl-text-secondary);
}

.xcl-dl-option input[type="radio"] {
    accent-color: var(--xcl-accent);
    cursor: pointer;
}

.xcl-dl-option:hover {
    color: var(--xcl-text-primary);
}

.xcl-dl-count {
    font-size: 11px;
    color: var(--xcl-text-muted);
    margin-left: auto;
}

/* Per-post download button */
.xcl-post-dl-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 16px;
    height: 16px;
    margin-left: 6px;
    padding: 0;
    background: transparent;
    border: none;
    cursor: pointer;
    opacity: 0.4;
    transition: opacity 0.15s ease;
    vertical-align: middle;
}

.xcl-post-dl-btn:hover {
    opacity: 1;
}

.xcl-post-dl-btn svg {
    width: 12px;
    height: 12px;
    fill: var(--xcl-accent);
}

/* Download Progress Modal */
#xcl-dl-progress {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: var(--xcl-bg-primary);
    border: 1px solid var(--xcl-border);
    border-radius: 12px;
    padding: 20px 24px;
    min-width: 350px;
    z-index: 100002;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
}

#xcl-dl-progress h3 {
    margin: 0 0 12px 0;
    font-size: 14px;
    color: var(--xcl-text-primary);
    display: flex;
    align-items: center;
    gap: 8px;
}

#xcl-dl-progress-bar {
    height: 8px;
    background: var(--xcl-bg-tertiary);
    border-radius: 4px;
    overflow: hidden;
    margin-bottom: 10px;
}

#xcl-dl-progress-fill {
    height: 100%;
    background: linear-gradient(90deg, var(--xcl-accent), var(--xcl-accent-hover));
    width: 0%;
    transition: width 0.2s ease;
    border-radius: 4px;
}

#xcl-dl-progress-text {
    font-size: 11px;
    color: var(--xcl-text-secondary);
    display: flex;
    justify-content: space-between;
}

#xcl-dl-progress-percent {
    color: var(--xcl-accent);
    font-weight: 600;
}

#xcl-dl-progress-file {
    color: var(--xcl-text-muted);
    max-width: 200px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

#xcl-dl-progress-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.6);
    z-index: 100001;
}

.dateTime {
    color: var(--xcl-text-muted) !important;
    font-size: 11px;
}

.postNum a {
    color: var(--xcl-text-secondary) !important;
    text-decoration: none;
}

.postNum a:hover {
    color: var(--xcl-accent) !important;
}

/* Flags */
.flag, .countryFlag, .boardFlag {
    vertical-align: middle;
    margin: 0 4px;
}

/* Post message (content) */
.postMessage {
    color: var(--xcl-text-primary);
    line-height: 1.6;
    word-wrap: break-word;
}

/* Links */
a {
    color: var(--xcl-text-link);
    text-decoration: none;
}

a:hover {
    text-decoration: underline;
}

/* Quote links */
.quotelink {
    color: var(--xcl-accent) !important;
    font-weight: 500;
}

.quotelink:hover {
    color: var(--xcl-accent-hover) !important;
}

/* Greentext */
.quote {
    color: var(--xcl-text-quote) !important;
}

/* Deadlinks */
.deadlink {
    color: var(--xcl-text-muted) !important;
    text-decoration: line-through;
}

/* File info - only in thread view */
.thread:has(.replyContainer) .file,
.replyContainer .file {
    margin: 8px 0;
}

.thread:has(.replyContainer) .fileText,
.replyContainer .fileText {
    font-size: 11px;
    color: var(--xcl-text-secondary);
    margin-bottom: 4px;
}

.thread:has(.replyContainer) .fileText a,
.replyContainer .fileText a {
    color: var(--xcl-text-link);
}

/* Thumbnails - only in thread view */
.thread:has(.replyContainer) .fileThumb,
.replyContainer .fileThumb {
    display: inline-block;
    margin: 4px 16px 4px 0;
    float: left;
}

.thread:has(.replyContainer) .fileThumb img,
.replyContainer .fileThumb img {
    border-radius: 4px;
    transition: opacity var(--xcl-transition);
    max-width: 150px;
    max-height: 150px;
}

.thread:has(.replyContainer) .fileThumb:hover img,
.replyContainer .fileThumb:hover img {
    opacity: 0.8;
}

/* Spoiler image */
.imgspoiler img {
    filter: blur(8px);
    transition: filter var(--xcl-transition);
}

.imgspoiler:hover img {
    filter: none;
}

/* Expanded images */
.expanded-image,
.full-image {
    max-width: 100%;
    height: auto;
}

/* Reply form */
#postForm, .postForm {
    background: var(--xcl-bg-secondary) !important;
    border: 1px solid var(--xcl-border);
    border-radius: var(--xcl-radius);
    padding: 16px;
    margin: 16px auto;
    max-width: 700px;
}

#postForm input[type="text"],
#postForm input[type="password"],
#postForm textarea,
.postForm input[type="text"],
.postForm textarea {
    background: var(--xcl-bg-tertiary) !important;
    border: 1px solid var(--xcl-border) !important;
    border-radius: 4px !important;
    color: var(--xcl-text-primary) !important;
    padding: 8px 12px !important;
    font-size: 13px !important;
    width: 100%;
    box-sizing: border-box;
    transition: border-color var(--xcl-transition);
}

#postForm input:focus,
#postForm textarea:focus,
.postForm input:focus,
.postForm textarea:focus {
    outline: none;
    border-color: var(--xcl-accent) !important;
}

#postForm textarea {
    min-height: 120px;
    resize: vertical;
}

#postForm input[type="submit"],
.postForm input[type="submit"] {
    background: var(--xcl-accent) !important;
    border: none !important;
    border-radius: 4px !important;
    color: var(--xcl-bg-primary) !important;
    padding: 10px 24px !important;
    font-size: 14px !important;
    font-weight: 600 !important;
    cursor: pointer;
    transition: background var(--xcl-transition);
}

#postForm input[type="submit"]:hover,
.postForm input[type="submit"]:hover {
    background: var(--xcl-accent-hover) !important;
}

/* Checkboxes */
input[type="checkbox"] {
    accent-color: var(--xcl-accent);
}

/* Backlinks */
.backlink {
    font-size: 11px;
    margin-top: 8px;
    padding-top: 8px;
    border-top: 1px dashed var(--xcl-border);
}

.backlink a {
    color: var(--xcl-text-secondary) !important;
    margin-right: 4px;
}

.backlink a:hover {
    color: var(--xcl-accent) !important;
}

/* Mobile adjustments - don't hide mobileHide as it affects catalog images */
.mobile {
    display: none !important;
}

/* Selection */
::selection {
    background: var(--xcl-accent-dim);
    color: var(--xcl-text-primary);
}

/* Scrollbar */
::-webkit-scrollbar {
    width: 10px;
    height: 10px;
}

::-webkit-scrollbar-track {
    background: var(--xcl-bg-primary);
}

::-webkit-scrollbar-thumb {
    background: var(--xcl-bg-tertiary);
    border-radius: 5px;
}

::-webkit-scrollbar-thumb:hover {
    background: var(--xcl-bg-hover);
}

/* ============================================================================
   4chan X Lite UI Components
   ============================================================================ */

/* Header Bar - Top Right */
#xcl-header-bar {
    position: fixed;
    top: 0;
    right: 0;
    z-index: 9998;
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 10px;
    background: var(--xcl-bg-secondary);
    border-left: 1px solid var(--xcl-border);
    border-bottom: 1px solid var(--xcl-border);
    border-radius: 0 0 0 8px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

#xcl-header-bar button {
    background: transparent;
    border: 1px solid var(--xcl-border);
    border-radius: 4px;
    padding: 5px 10px;
    color: var(--xcl-text-secondary);
    cursor: pointer;
    font-size: 11px;
    font-weight: 500;
    transition: all var(--xcl-transition);
    display: flex;
    align-items: center;
    gap: 4px;
}

#xcl-header-bar button:hover {
    background: var(--xcl-bg-tertiary);
    border-color: var(--xcl-accent);
    color: var(--xcl-accent);
}

#xcl-header-bar .xcl-brand {
    color: var(--xcl-accent);
    font-weight: 600;
    font-size: 11px;
    padding-right: 6px;
    border-right: 1px solid var(--xcl-border);
    margin-right: 2px;
}

/* Settings Overlay */
#xcl-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.85);
    z-index: 9999;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    visibility: hidden;
    transition: opacity 0.2s ease;
}

#xcl-overlay.active {
    opacity: 1;
    visibility: visible;
}

/* Settings Dialog */
#xcl-settings {
    background: var(--xcl-bg-primary);
    border: 1px solid var(--xcl-border);
    border-radius: 12px;
    width: 95%;
    max-width: 1200px;
    height: 90vh;
    max-height: 900px;
    display: flex;
    flex-direction: column;
    box-shadow: var(--xcl-shadow);
    transform: scale(0.98);
    transition: transform 0.2s ease;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

#xcl-overlay.active #xcl-settings {
    transform: scale(1);
}

/* Settings Header */
#xcl-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 16px;
    border-bottom: 1px solid var(--xcl-border);
    background: var(--xcl-bg-secondary);
    border-radius: 12px 12px 0 0;
    flex-shrink: 0;
}

#xcl-header h1 {
    font-size: 14px;
    font-weight: 600;
    color: var(--xcl-text-primary);
    margin: 0;
    display: flex;
    align-items: center;
    gap: 6px;
}

#xcl-header h1 span {
    color: var(--xcl-accent);
}

#xcl-header .version {
    font-size: 9px;
    color: var(--xcl-text-muted);
    font-weight: 400;
    padding: 2px 5px;
    background: var(--xcl-bg-tertiary);
    border-radius: 3px;
}

#xcl-close {
    background: transparent;
    border: none;
    color: var(--xcl-text-secondary);
    cursor: pointer;
    padding: 6px;
    border-radius: 4px;
    transition: all var(--xcl-transition);
}

#xcl-close:hover {
    background: var(--xcl-bg-tertiary);
    color: var(--xcl-error);
}

/* Settings Navigation */
#xcl-nav {
    display: flex;
    gap: 2px;
    padding: 6px 16px;
    border-bottom: 1px solid var(--xcl-border);
    background: var(--xcl-bg-secondary);
    overflow-x: auto;
    flex-shrink: 0;
}

#xcl-nav button {
    background: transparent;
    border: none;
    color: var(--xcl-text-secondary);
    padding: 4px 10px;
    border-radius: 3px;
    cursor: pointer;
    font-size: 11px;
    font-weight: 500;
    white-space: nowrap;
    transition: all var(--xcl-transition);
}

#xcl-nav button:hover {
    background: var(--xcl-bg-tertiary);
    color: var(--xcl-text-primary);
}

#xcl-nav button.active {
    background: var(--xcl-accent-dim);
    color: var(--xcl-accent);
}

/* Settings Content */
#xcl-content {
    flex: 1;
    overflow-y: auto;
    padding: 10px 16px;
}

#xcl-content::-webkit-scrollbar {
    width: 6px;
}

#xcl-content::-webkit-scrollbar-track {
    background: var(--xcl-bg-secondary);
}

#xcl-content::-webkit-scrollbar-thumb {
    background: var(--xcl-border);
    border-radius: 3px;
}

/* Section */
.xcl-section {
    display: none;
}

.xcl-section.active {
    display: block;
}

.xcl-section h2 {
    font-size: 13px;
    font-weight: 600;
    color: var(--xcl-text-primary);
    margin: 0 0 6px 0;
    padding-bottom: 6px;
    border-bottom: 1px solid var(--xcl-border);
}

.xcl-section h3 {
    font-size: 11px;
    font-weight: 600;
    color: var(--xcl-accent);
    margin: 10px 0 4px 0;
    grid-column: 1 / -1;
}

.xcl-section p {
    color: var(--xcl-text-secondary);
    font-size: 10px;
    line-height: 1.3;
    margin: 0 0 6px 0;
    grid-column: 1 / -1;
}

/* Option Groups - Compact Multi-column */
.xcl-options {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 3px;
}

.xcl-option {
    display: flex;
    align-items: flex-start;
    gap: 6px;
    padding: 4px 6px;
    background: var(--xcl-bg-secondary);
    border: 1px solid transparent;
    border-radius: 3px;
    transition: all var(--xcl-transition);
}

.xcl-option:hover {
    border-color: var(--xcl-border);
}

/* Toggle Switch - Smaller */
.xcl-toggle {
    position: relative;
    width: 28px;
    height: 16px;
    flex-shrink: 0;
    margin-top: 1px;
}

.xcl-toggle input {
    opacity: 0;
    width: 0;
    height: 0;
}

.xcl-toggle-slider {
    position: absolute;
    inset: 0;
    background: var(--xcl-bg-tertiary);
    border: 1px solid var(--xcl-border);
    border-radius: 8px;
    cursor: pointer;
    transition: all var(--xcl-transition);
}

.xcl-toggle-slider::before {
    content: '';
    position: absolute;
    left: 2px;
    top: 50%;
    transform: translateY(-50%);
    width: 10px;
    height: 10px;
    background: var(--xcl-text-muted);
    border-radius: 50%;
    transition: all var(--xcl-transition);
}

.xcl-toggle input:checked + .xcl-toggle-slider {
    background: var(--xcl-accent-dim);
    border-color: var(--xcl-accent);
}

.xcl-toggle input:checked + .xcl-toggle-slider::before {
    left: calc(100% - 12px);
    background: var(--xcl-accent);
}

.xcl-option-info {
    flex: 1;
    min-width: 0;
}

.xcl-option-label {
    display: block;
    font-size: 11px;
    font-weight: 500;
    color: var(--xcl-text-primary);
    cursor: pointer;
    line-height: 1.2;
}

/* Always show description */
.xcl-option-desc {
    display: block;
    font-size: 9px;
    color: var(--xcl-text-muted);
    line-height: 1.2;
    margin-top: 1px;
}

/* Theme Selector - Compact */
.xcl-theme-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(85px, 1fr));
    gap: 4px;
    margin-top: 6px;
    max-height: 200px;
    overflow-y: auto;
}

.xcl-theme-option {
    background: var(--xcl-bg-secondary);
    border: 2px solid var(--xcl-border);
    border-radius: 4px;
    padding: 4px;
    cursor: pointer;
    transition: all var(--xcl-transition);
    text-align: center;
}

.xcl-theme-option:hover {
    border-color: var(--xcl-text-muted);
}

.xcl-theme-option.active {
    border-color: var(--xcl-accent);
    background: var(--xcl-accent-dim);
}

.xcl-theme-preview {
    display: flex;
    gap: 2px;
    margin-bottom: 4px;
    justify-content: center;
}

.xcl-theme-preview span {
    width: 14px;
    height: 14px;
    border-radius: 3px;
}

.xcl-theme-name {
    font-size: 9px;
    font-weight: 600;
    color: var(--xcl-text-primary);
}

/* Filter Presets - Compact */
.xcl-preset-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 6px;
    margin: 6px 0;
}

.xcl-preset-category {
    background: var(--xcl-bg-secondary);
    border: 1px solid var(--xcl-border);
    border-radius: 4px;
    padding: 6px;
}

.xcl-preset-category h4 {
    font-size: 10px;
    font-weight: 600;
    color: var(--xcl-text-primary);
    margin: 0 0 4px 0;
    padding-bottom: 4px;
    border-bottom: 1px solid var(--xcl-border);
}

.xcl-preset-btn {
    display: block;
    width: 100%;
    background: var(--xcl-bg-tertiary);
    border: 1px solid var(--xcl-border);
    color: var(--xcl-text-secondary);
    padding: 3px 6px;
    border-radius: 3px;
    font-size: 10px;
    cursor: pointer;
    margin-bottom: 2px;
    text-align: left;
    transition: all var(--xcl-transition);
}

.xcl-preset-btn:last-child {
    margin-bottom: 0;
}

.xcl-preset-btn:hover {
    background: var(--xcl-bg-hover);
    border-color: var(--xcl-accent);
    color: var(--xcl-text-primary);
}

.xcl-preset-btn.applied {
    background: var(--xcl-accent-dim);
    border-color: var(--xcl-accent);
    color: var(--xcl-accent);
}

/* Input Group - Compact */
.xcl-input-group {
    margin-bottom: 8px;
    grid-column: 1 / -1;
}

.xcl-input-group label {
    display: block;
    font-size: 10px;
    font-weight: 500;
    color: var(--xcl-text-primary);
    margin-bottom: 2px;
}

.xcl-input {
    width: 100%;
    background: var(--xcl-bg-secondary);
    border: 1px solid var(--xcl-border);
    border-radius: 3px;
    padding: 4px 6px;
    color: var(--xcl-text-primary);
    font-size: 11px;
    transition: all var(--xcl-transition);
}

.xcl-input:focus {
    outline: none;
    border-color: var(--xcl-accent);
}

textarea.xcl-input {
    min-height: 60px;
    resize: vertical;
    font-family: 'SF Mono', 'Fira Code', monospace;
    font-size: 10px;
}

/* Range Input */
.xcl-range-group {
    display: flex;
    align-items: center;
    gap: 8px;
}

.xcl-range {
    flex: 1;
    -webkit-appearance: none;
    height: 4px;
    background: var(--xcl-bg-tertiary);
    border-radius: 2px;
}

.xcl-range::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 14px;
    height: 14px;
    background: var(--xcl-accent);
    border-radius: 50%;
    cursor: pointer;
}

.xcl-range-value {
    min-width: 36px;
    text-align: center;
    font-size: 11px;
    color: var(--xcl-text-secondary);
    background: var(--xcl-bg-secondary);
    padding: 2px 6px;
    border-radius: 3px;
}

/* Buttons - Compact */
.xcl-btn {
    background: var(--xcl-bg-tertiary);
    border: 1px solid var(--xcl-border);
    color: var(--xcl-text-primary);
    padding: 4px 10px;
    border-radius: 3px;
    font-size: 10px;
    font-weight: 500;
    cursor: pointer;
    transition: all var(--xcl-transition);
}

.xcl-btn:hover {
    background: var(--xcl-bg-hover);
}

.xcl-btn-primary {
    background: var(--xcl-accent);
    border-color: var(--xcl-accent);
    color: var(--xcl-bg-primary);
}

.xcl-btn-primary:hover {
    background: var(--xcl-accent-hover);
}

.xcl-btn-danger {
    background: transparent;
    border-color: var(--xcl-error);
    color: var(--xcl-error);
}

.xcl-btn-danger:hover {
    background: var(--xcl-error);
    color: white;
}

/* Footer - Compact */
#xcl-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 16px;
    border-top: 1px solid var(--xcl-border);
    background: var(--xcl-bg-secondary);
    border-radius: 0 0 12px 12px;
    flex-shrink: 0;
}

#xcl-footer-actions {
    display: flex;
    gap: 4px;
}

#xcl-footer-links a {
    color: var(--xcl-text-muted);
    text-decoration: none;
    font-size: 9px;
}

/* Status Messages - Compact */
.xcl-status {
    padding: 6px 10px;
    border-radius: 3px;
    font-size: 10px;
    margin-bottom: 8px;
    grid-column: 1 / -1;
}

.xcl-status-success { background: rgba(34, 197, 94, 0.1); border: 1px solid var(--xcl-success); color: var(--xcl-success); }
.xcl-status-error { background: rgba(239, 68, 68, 0.1); border: 1px solid var(--xcl-error); color: var(--xcl-error); }
.xcl-status-warning { background: rgba(245, 158, 11, 0.1); border: 1px solid var(--xcl-warning); color: var(--xcl-warning); }

/* Input Row - Side by side inputs */
.xcl-input-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    margin-bottom: 8px;
}

.xcl-input-row .xcl-input-group {
    margin-bottom: 0;
}

/* ============================================================================
   4chan Enhancement Styles
   ============================================================================ */

/* Colored IDs */
.posteruid .hand {
    padding: 2px 6px;
    border-radius: 3px;
    font-size: 10px;
    font-weight: 600;
}

/* Image hover preview */
#xcl-hover {
    position: fixed;
    z-index: 10000;
    pointer-events: none;
    max-width: 90vw;
    max-height: 90vh;
    box-shadow: var(--xcl-shadow);
    border-radius: 4px;
}

/* Quote preview */
#xcl-preview {
    position: fixed;
    z-index: 10000;
    max-width: 600px;
    background: var(--xcl-bg-secondary);
    border: 1px solid var(--xcl-border);
    border-radius: var(--xcl-radius);
    box-shadow: var(--xcl-shadow);
    padding: 8px;
    display: none;
}

/* Thread updater */
#xcl-updater {
    position: fixed;
    bottom: 10px;
    right: 10px;
    z-index: 9997;
    background: var(--xcl-bg-secondary);
    border: 1px solid var(--xcl-border);
    border-radius: var(--xcl-radius);
    padding: 8px 12px;
    font-size: 11px;
    display: flex;
    gap: 10px;
    align-items: center;
}

#xcl-updater-status { color: var(--xcl-text-secondary); }
#xcl-updater-btn {
    background: var(--xcl-accent);
    border: none;
    color: var(--xcl-bg-primary);
    padding: 4px 10px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 11px;
}

/* Thread watcher */
#xcl-watcher {
    position: fixed;
    top: 72px;
    right: 10px;
    z-index: 9996;
    background: var(--xcl-bg-secondary);
    border: 1px solid var(--xcl-border);
    border-radius: var(--xcl-radius);
    min-width: 250px;
    max-height: 400px;
    overflow-y: auto;
    font-size: 12px;
    display: none;
    box-shadow: var(--xcl-shadow);
}

#xcl-watcher.visible { display: block; }

#xcl-watcher-header {
    padding: 10px 12px;
    background: var(--xcl-bg-tertiary);
    border-bottom: 1px solid var(--xcl-border);
    font-weight: 600;
    display: flex;
    justify-content: space-between;
}

.xcl-watcher-item {
    padding: 8px 12px;
    border-bottom: 1px solid var(--xcl-border);
    display: flex;
    justify-content: space-between;
}

.xcl-watcher-item:hover { background: var(--xcl-bg-tertiary); }
.xcl-watcher-item a { color: var(--xcl-text-primary); flex: 1; }

/* Gallery */
#xcl-gallery {
    position: fixed;
    inset: 0;
    z-index: 10002;
    background: rgba(0, 0, 0, 0.95);
    display: none;
}

#xcl-gallery.active { display: flex; flex-direction: column; }
#xcl-gallery-image { flex: 1; display: flex; align-items: center; justify-content: center; }
#xcl-gallery-image img, #xcl-gallery-image video { max-width: 95%; max-height: 90vh; }

#xcl-gallery-nav {
    display: flex;
    justify-content: center;
    gap: 16px;
    padding: 16px;
    background: var(--xcl-bg-secondary);
}

#xcl-gallery-nav button {
    background: var(--xcl-bg-tertiary);
    border: 1px solid var(--xcl-border);
    color: var(--xcl-text-primary);
    padding: 8px 20px;
    border-radius: 4px;
    cursor: pointer;
}

/* Hidden posts */
.xcl-hidden { display: none !important; }

.xcl-stub {
    font-size: 11px;
    color: var(--xcl-text-muted);
    padding: 6px 10px;
    background: var(--xcl-bg-secondary);
    border-radius: 4px;
    margin: 4px 0;
    cursor: pointer;
    border-left: 3px solid var(--xcl-border);
}

.xcl-stub:hover {
    border-left-color: var(--xcl-accent);
}

/* Highlighted/Own posts */
.xcl-own-post { border-left: 3px solid var(--xcl-accent) !important; }
.xcl-highlighted { box-shadow: inset 0 0 0 2px var(--xcl-accent) !important; }

/* Highlighted posts in thread view - use data attribute for safer targeting */
[data-xcl-highlighted="true"] {
    outline: 3px solid var(--xcl-filter-highlight-color, #ffeb3b) !important;
    outline-offset: -3px;
}

/* Cross-thread marker */
.xcl-cross::after { content: ' →'; color: #f59e0b; }

/* Quote Threading */
.xcl-thread-replies {
    margin-left: 20px;
    padding-left: 12px;
    border-left: 2px solid var(--xcl-border);
    margin-top: 4px;
}

/* Video handling */
.xcl-video-indicator {
    position: absolute;
    bottom: 4px;
    right: 4px;
    background: rgba(0,0,0,0.8);
    color: #fff;
    padding: 2px 6px;
    border-radius: 3px;
    font-size: 10px;
}

.xcl-expanded-video { max-width: 100%; display: block; }

/* Quick Reply */
#xcl-qr {
    position: fixed;
    bottom: 20px;
    right: 20px;
    z-index: 9998;
    background: var(--xcl-bg-primary);
    border: 1px solid var(--xcl-border);
    border-radius: var(--xcl-radius);
    box-shadow: var(--xcl-shadow);
    min-width: 350px;
    font-size: 13px;
}

#xcl-qr.minimized #xcl-qr-form { display: none; }

#xcl-qr-header {
    display: flex;
    justify-content: space-between;
    padding: 10px 12px;
    background: var(--xcl-bg-secondary);
    border-bottom: 1px solid var(--xcl-border);
    border-radius: var(--xcl-radius) var(--xcl-radius) 0 0;
    cursor: move;
}

#xcl-qr-title { font-weight: 600; color: var(--xcl-accent); }

#xcl-qr-controls button {
    background: transparent;
    border: none;
    color: var(--xcl-text-secondary);
    cursor: pointer;
    padding: 4px;
}

#xcl-qr-form { padding: 12px; }

#xcl-qr-form input, #xcl-qr-form textarea {
    width: 100%;
    background: var(--xcl-bg-secondary);
    border: 1px solid var(--xcl-border);
    border-radius: 6px;
    padding: 8px 10px;
    color: var(--xcl-text-primary);
    font-size: 13px;
    margin-bottom: 8px;
}

#xcl-qr-form textarea { min-height: 120px; resize: vertical; }

#xcl-qr-submit {
    width: 100%;
    background: var(--xcl-accent);
    border: none;
    color: var(--xcl-bg-primary);
    padding: 10px;
    border-radius: 6px;
    font-weight: 600;
    cursor: pointer;
}

/* Catalog Controls */
#xcl-catalog-controls {
    position: fixed;
    top: 40px;
    right: 10px;
    z-index: 9995;
    background: var(--xcl-bg-secondary);
    border: 1px solid var(--xcl-border);
    border-radius: var(--xcl-radius);
    min-width: 220px;
    box-shadow: var(--xcl-shadow);
    overflow: hidden;
}

#xcl-catalog-controls.collapsed { display: none; }

#xcl-catalog-header {
    display: flex;
    justify-content: space-between;
    padding: 8px 12px;
    background: var(--xcl-bg-tertiary);
    border-bottom: 1px solid var(--xcl-border);
    font-weight: 500;
}

#xcl-catalog-search {
    width: calc(100% - 24px);
    margin: 12px;
    background: var(--xcl-bg-tertiary);
    border: 1px solid var(--xcl-border);
    border-radius: 6px;
    padding: 8px 10px;
    color: var(--xcl-text-primary);
}

#xcl-catalog-sort {
    display: flex;
    gap: 4px;
    padding: 0 12px 12px;
    flex-wrap: wrap;
}

#xcl-catalog-sort button {
    flex: 1;
    background: var(--xcl-bg-tertiary);
    border: 1px solid var(--xcl-border);
    color: var(--xcl-text-secondary);
    padding: 6px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 11px;
}

#xcl-catalog-sort button.active {
    background: var(--xcl-accent-dim);
    border-color: var(--xcl-accent);
    color: var(--xcl-accent);
}

/* Board Navigation */
#xcl-board-nav {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 9996;
    background: var(--xcl-bg-secondary);
    border-bottom: 1px solid var(--xcl-border);
    padding: 8px 16px;
    display: flex;
    gap: 8px;
    font-size: 12px;
}

#xcl-board-nav a {
    color: var(--xcl-text-secondary);
    padding: 4px 8px;
    border-radius: 4px;
}

#xcl-board-nav a:hover { background: var(--xcl-bg-tertiary); }
#xcl-board-nav a.current { background: var(--xcl-accent-dim); color: var(--xcl-accent); }

/* Infinite Scroll */
#xcl-infinite-loader {
    text-align: center;
    padding: 20px;
    color: var(--xcl-text-muted);
}

#xcl-infinite-loader.loading::after {
    content: '';
    display: inline-block;
    width: 20px;
    height: 20px;
    border: 2px solid var(--xcl-border);
    border-top-color: var(--xcl-accent);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
    margin-left: 8px;
}

@keyframes spin { to { transform: rotate(360deg); } }

/* Embeds */
.xcl-embed-container {
    margin: 8px 0;
    max-width: 640px;
    border-radius: 8px;
    overflow: hidden;
    background: var(--xcl-bg-secondary);
    border: 1px solid var(--xcl-border);
}

.xcl-embed-container iframe { display: block; border: none; width: 100%; }
.xcl-embed-container.youtube iframe { height: 360px; }
.xcl-embed-container.soundcloud iframe { height: 166px; }
.xcl-embed-container.spotify iframe { height: 152px; }

.xcl-embed-toggle {
    cursor: pointer;
    font-size: 11px;
    color: var(--xcl-text-muted);
    margin-left: 4px;
}

/* Download buttons */
.xcl-download-btn {
    display: inline-flex;
    padding: 2px 6px;
    background: var(--xcl-bg-tertiary);
    border: 1px solid var(--xcl-border);
    border-radius: 3px;
    color: var(--xcl-text-secondary);
    font-size: 10px;
    margin-left: 6px;
    cursor: pointer;
}

.xcl-download-btn:hover {
    background: var(--xcl-accent);
    color: var(--xcl-bg-primary);
}

/* Quote Backlinks */
.xcl-backlinks { margin-left: 8px; font-size: 11px; }
.xcl-backlink { margin-left: 4px; color: var(--xcl-accent) !important; }

/* Quote Inlining */
.xcl-inline {
    margin: 8px 0 8px 16px;
    padding-left: 8px;
    border-left: 2px solid var(--xcl-accent);
}

.xcl-inline-post {
    background: var(--xcl-bg-secondary);
    border: 1px solid var(--xcl-border);
    border-radius: 4px;
    padding: 8px;
}

/* Last Read Marker */
.xcl-last-read-marker {
    display: flex;
    align-items: center;
    gap: 12px;
    margin: 16px 0;
    color: var(--xcl-accent);
    font-size: 11px;
}

.xcl-last-read-marker::before,
.xcl-last-read-marker::after {
    content: '';
    flex: 1;
    height: 1px;
    background: var(--xcl-accent);
}

.xcl-last-read-marker span {
    padding: 2px 8px;
    background: var(--xcl-accent-dim);
    border-radius: 3px;
}

/* Post appearance controls */
body.xcl-compact .post { padding: 6px 10px !important; }
body.xcl-compact .postMessage { font-size: 12px !important; }

body.xcl-post-width-narrow .post { max-width: 600px !important; }
body.xcl-post-width-medium .post { max-width: 900px !important; }
body.xcl-post-width-wide .post { max-width: 1200px !important; }

body.xcl-thumb-small .fileThumb img { max-width: 100px !important; max-height: 100px !important; }
body.xcl-thumb-large .fileThumb img { max-width: 250px !important; max-height: 250px !important; }

body.xcl-hover-highlight-enabled .post:hover { background: var(--xcl-bg-secondary) !important; }

/* Toast notifications */
#xcl-toast-container {
    position: fixed;
    bottom: 20px;
    left: 20px;
    z-index: 10001;
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.xcl-toast {
    background: var(--xcl-bg-secondary);
    border: 1px solid var(--xcl-border);
    border-radius: var(--xcl-radius);
    padding: 12px 16px;
    color: var(--xcl-text-primary);
    font-size: 13px;
    box-shadow: var(--xcl-shadow);
    animation: slideIn 0.3s ease;
}

@keyframes slideIn {
    from { opacity: 0; transform: translateX(-20px); }
    to { opacity: 1; transform: translateX(0); }
}

.xcl-toast.success { border-left: 3px solid var(--xcl-success); }
.xcl-toast.error { border-left: 3px solid var(--xcl-error); }
.xcl-toast.warning { border-left: 3px solid var(--xcl-warning); }

/* Image Hover */
#xcl-image-hover {
    position: fixed;
    z-index: 100001;
    max-width: 80vw;
    max-height: 80vh;
    object-fit: contain;
    pointer-events: none;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
    border-radius: 4px;
}

/* User CSS marker */
#xcl-usercss {}
`;

// ============================================================================
// SETTINGS UI
// ============================================================================

const Settings = {
    overlay: null,
    headerBar: null,

    init() {
        // Create header bar with all controls
        this.headerBar = $.el('div', { id: 'xcl-header-bar' });
        this.headerBar.innerHTML = `
            <span class="xcl-brand">4chan X Lite</span>
            <button id="xcl-batch-download-btn" title="Download All Images">⬇ Images</button>
            <button id="xcl-settings-btn" title="Settings">⚙ Settings</button>
        `;
        document.body.appendChild(this.headerBar);

        // Bind events
        $.on($.qs('#xcl-settings-btn', this.headerBar), 'click', () => this.open());
        $.on($.qs('#xcl-batch-download-btn', this.headerBar), 'click', () => DownloadManager.batchDownload());

        // Hide batch download button if not in thread
        if (g.VIEW !== 'thread') {
            $.qs('#xcl-batch-download-btn', this.headerBar).style.display = 'none';
        }
    },

    gearIcon() {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('viewBox', '0 0 24 24');
        svg.setAttribute('fill', 'none');
        svg.setAttribute('stroke', 'currentColor');
        svg.setAttribute('stroke-width', '2');
        svg.innerHTML = '<path d="M12 15a3 3 0 100-6 3 3 0 000 6z"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/>';
        return svg;
    },

    open() {
        if (this.overlay) return;

        this.overlay = $.el('div', { id: 'xcl-overlay' });
        this.overlay.innerHTML = this.render();
        document.body.appendChild(this.overlay);

        // Animate in
        requestAnimationFrame(() => {
            this.overlay.classList.add('active');
        });

        // Bind events
        this.bindEvents();

        // Show first tab
        this.showTab('general');
    },

    close() {
        if (!this.overlay) return;

        this.overlay.classList.remove('active');
        setTimeout(() => {
            this.overlay.remove();
            this.overlay = null;
        }, 300);
    },

    render() {
        return `
            <div id="xcl-settings">
                <div id="xcl-header">
                    <h1>
                        <span>4chan X</span> Lite
                        <span class="version">v${VERSION}</span>
                    </h1>
                    <button id="xcl-close" title="Close">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"/>
                            <line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                    </button>
                </div>

                <nav id="xcl-nav">
                    <button data-tab="general" class="active">General</button>
                    <button data-tab="filtering">Filtering</button>
                    <button data-tab="quotes">Quotes</button>
                    <button data-tab="images">Images</button>
                    <button data-tab="media">Media</button>
                    <button data-tab="embedding">Embedding</button>
                    <button data-tab="monitoring">Monitoring</button>
                    <button data-tab="appearance">Appearance</button>
                    <button data-tab="advanced">Advanced</button>
                </nav>

                <div id="xcl-content">
                    ${this.renderGeneral()}
                    ${this.renderFiltering()}
                    ${this.renderQuotes()}
                    ${this.renderImages()}
                    ${this.renderMedia()}
                    ${this.renderEmbedding()}
                    ${this.renderMonitoring()}
                    ${this.renderAppearance()}
                    ${this.renderAdvanced()}
                </div>

                <div id="xcl-footer">
                    <div id="xcl-footer-actions">
                        <button class="xcl-btn" id="xcl-export">Export</button>
                        <button class="xcl-btn" id="xcl-import">Import</button>
                        <button class="xcl-btn xcl-btn-danger" id="xcl-reset">Reset</button>
                    </div>
                    <div id="xcl-footer-links">
                        <a href="https://github.com/ccd0/4chan-x" target="_blank">Based on 4chan X</a>
                    </div>
                </div>
            </div>
        `;
    },

    renderGeneral() {
        const themes = [
            { id: 'dark', name: 'Dark', colors: ['#0f172a', '#22c55e', '#1e293b'] },
            { id: 'midnight', name: 'Midnight', colors: ['#110e24', '#a78bfa', '#1a1533'] },
            { id: 'amoled', name: 'AMOLED', colors: ['#000000', '#10b981', '#0a0a0a'] },
            { id: 'tomorrow', name: 'Tomorrow', colors: ['#1d1f21', '#81a2be', '#282a2e'] },
            { id: 'nord', name: 'Nord', colors: ['#2e3440', '#88c0d0', '#3b4252'] },
            { id: 'dracula', name: 'Dracula', colors: ['#282a36', '#bd93f9', '#44475a'] },
            { id: 'gruvbox', name: 'Gruvbox', colors: ['#282828', '#b8bb26', '#3c3836'] },
            { id: 'monokai', name: 'Monokai', colors: ['#272822', '#a6e22e', '#3e3d32'] },
            { id: 'solarized-dark', name: 'Solarized Dark', colors: ['#002b36', '#268bd2', '#073642'] },
            { id: 'solarized-light', name: 'Solarized Light', colors: ['#fdf6e3', '#268bd2', '#eee8d5'] },
            { id: 'zenburned', name: 'Zenburned', colors: ['#3f3f3f', '#f0dfaf', '#575757'] },
            { id: 'yotsuba', name: 'Yotsuba', colors: ['#ffe8bd', '#800000', '#f0e0d6'] },
            { id: 'yotsuba-b', name: 'Yotsuba B', colors: ['#eef2ff', '#34345c', '#d6daf0'] },
            { id: 'photon', name: 'Photon', colors: ['#eeeeee', '#ff6600', '#dddddd'] },
            { id: 'cold-snap', name: 'Cold Snap', colors: ['#ffffff', '#6699cc', '#fcfcfc'] },
            { id: 'midnight-caek', name: 'Midnight Caek', colors: ['#101010', '#57577b', '#1c1c1c'] },
            { id: 'yasashii', name: 'Yasashii', colors: ['#ebebeb', '#a6586f', '#f8f8f8'] },
            { id: 'blue-tone', name: 'Blue Tone', colors: ['#131313', '#3296c8', '#222222'] },
            { id: 'appchan', name: 'AppChan', colors: ['#2c2c2c', '#6688aa', '#333333'] }
        ];

        const currentTheme = Conf['Theme'] || 'dark';

        return `
            <div class="xcl-section active" data-section="general">
                <h2>Theme</h2>
                <div class="xcl-theme-grid">
                    ${themes.map(t => `
                        <div class="xcl-theme-option ${t.id === currentTheme ? 'active' : ''}" data-theme="${t.id}">
                            <div class="xcl-theme-preview">
                                ${t.colors.map(c => `<span style="background:${c}"></span>`).join('')}
                            </div>
                            <div class="xcl-theme-name">${t.name}</div>
                        </div>
                    `).join('')}
                </div>

                <div class="xcl-input-row" style="margin-top:10px;">
                    <button class="xcl-btn xcl-btn-small" id="xcl-export-theme">Export Theme</button>
                    <button class="xcl-btn xcl-btn-small" id="xcl-import-theme">Import Theme</button>
                </div>

                <h3>Custom Background</h3>
                <div class="xcl-input-group">
                    <label>Background Image URL</label>
                    <input type="text" class="xcl-input" data-setting="Custom Background URL"
                           value="${E(Conf['Custom Background URL'] || '')}" placeholder="https://example.com/image.jpg">
                </div>
                <div class="xcl-input-row">
                    <div class="xcl-input-group">
                        <label>Position</label>
                        <select class="xcl-select" data-setting="Background Position">
                            <option value="center" ${Conf['Background Position'] === 'center' ? 'selected' : ''}>Center</option>
                            <option value="top" ${Conf['Background Position'] === 'top' ? 'selected' : ''}>Top</option>
                            <option value="bottom" ${Conf['Background Position'] === 'bottom' ? 'selected' : ''}>Bottom</option>
                            <option value="left" ${Conf['Background Position'] === 'left' ? 'selected' : ''}>Left</option>
                            <option value="right" ${Conf['Background Position'] === 'right' ? 'selected' : ''}>Right</option>
                        </select>
                    </div>
                    <div class="xcl-input-group">
                        <label>Size</label>
                        <select class="xcl-select" data-setting="Background Size">
                            <option value="cover" ${Conf['Background Size'] === 'cover' ? 'selected' : ''}>Cover</option>
                            <option value="contain" ${Conf['Background Size'] === 'contain' ? 'selected' : ''}>Contain</option>
                            <option value="auto" ${Conf['Background Size'] === 'auto' ? 'selected' : ''}>Auto</option>
                        </select>
                    </div>
                </div>
                <div class="xcl-input-row">
                    <div class="xcl-input-group">
                        <label>Repeat</label>
                        <select class="xcl-select" data-setting="Background Repeat">
                            <option value="no-repeat" ${Conf['Background Repeat'] === 'no-repeat' ? 'selected' : ''}>No Repeat</option>
                            <option value="repeat" ${Conf['Background Repeat'] === 'repeat' ? 'selected' : ''}>Tile</option>
                            <option value="repeat-x" ${Conf['Background Repeat'] === 'repeat-x' ? 'selected' : ''}>Repeat X</option>
                            <option value="repeat-y" ${Conf['Background Repeat'] === 'repeat-y' ? 'selected' : ''}>Repeat Y</option>
                        </select>
                    </div>
                    <div class="xcl-input-group">
                        <label>Attachment</label>
                        <select class="xcl-select" data-setting="Background Attachment">
                            <option value="fixed" ${Conf['Background Attachment'] === 'fixed' ? 'selected' : ''}>Fixed</option>
                            <option value="scroll" ${Conf['Background Attachment'] === 'scroll' ? 'selected' : ''}>Scroll</option>
                        </select>
                    </div>
                </div>

                <h3>Layout & Margins</h3>
                <div class="xcl-input-row">
                    <div class="xcl-input-group">
                        <label>Left Margin</label>
                        <select class="xcl-select" data-setting="Left Margin">
                            <option value="0" ${Conf['Left Margin'] == 0 ? 'selected' : ''}>None</option>
                            <option value="5" ${Conf['Left Margin'] == 5 ? 'selected' : ''}>Small (5px)</option>
                            <option value="25" ${Conf['Left Margin'] == 25 ? 'selected' : ''}>Medium (25px)</option>
                            <option value="65" ${Conf['Left Margin'] == 65 ? 'selected' : ''}>Large (65px)</option>
                        </select>
                    </div>
                    <div class="xcl-input-group">
                        <label>Right Margin</label>
                        <select class="xcl-select" data-setting="Right Margin">
                            <option value="0" ${Conf['Right Margin'] == 0 ? 'selected' : ''}>None</option>
                            <option value="5" ${Conf['Right Margin'] == 5 ? 'selected' : ''}>Small (5px)</option>
                            <option value="25" ${Conf['Right Margin'] == 25 ? 'selected' : ''}>Medium (25px)</option>
                            <option value="65" ${Conf['Right Margin'] == 65 ? 'selected' : ''}>Large (65px)</option>
                        </select>
                    </div>
                </div>

                <h3>Sidebar</h3>
                <div class="xcl-input-row">
                    <div class="xcl-input-group">
                        <label>Sidebar Position</label>
                        <select class="xcl-select" data-setting="Sidebar Position">
                            <option value="right" ${Conf['Sidebar Position'] === 'right' ? 'selected' : ''}>Right</option>
                            <option value="left" ${Conf['Sidebar Position'] === 'left' ? 'selected' : ''}>Left</option>
                            <option value="disabled" ${Conf['Sidebar Position'] === 'disabled' ? 'selected' : ''}>Disabled</option>
                        </select>
                    </div>
                    <div class="xcl-input-group">
                        ${this.toggle('Minimal Sidebar', 'Compact stats/watcher')}
                    </div>
                </div>

                <h3>Element Visibility</h3>
                <div class="xcl-options">
                    ${this.toggle('Hide Ads', 'Hide ads & promos')}
                    ${this.toggle('Hide Blotter', 'Hide announcements')}
                    ${this.toggle('Hide Board Banner', 'Hide board banner')}
                    ${this.toggle('Hide Board Title', 'Hide board title')}
                    ${this.toggle('Hide Footer', 'Hide footer links')}
                    ${this.toggle('Hide Sticky Threads', 'Hide stickies in catalog')}
                    ${this.toggle('Hide Rules', 'Hide board rules')}
                    ${this.toggle('Hide Nav Links Top', 'Hide top nav')}
                    ${this.toggle('Hide Nav Links Bottom', 'Hide bottom nav')}
                    ${this.toggle('Show Checkboxes', 'Show post checkboxes')}
                    ${this.toggle('Modernize Interface', 'Modern site styling')}
                </div>

                <h3>Quick Reply Style</h3>
                <div class="xcl-input-row">
                    <div class="xcl-input-group">
                        <label>Autohide Style</label>
                        <select class="xcl-select" data-setting="QR Autohide Style">
                            <option value="normal" ${Conf['QR Autohide Style'] === 'normal' ? 'selected' : ''}>Normal</option>
                            <option value="fade" ${Conf['QR Autohide Style'] === 'fade' ? 'selected' : ''}>Fade</option>
                            <option value="vertical" ${Conf['QR Autohide Style'] === 'vertical' ? 'selected' : ''}>Vertical Tab</option>
                        </select>
                    </div>
                    <div class="xcl-input-group">
                        <div class="xcl-options">
                            ${this.toggle('Transparent QR', 'Translucent QR')}
                            ${this.toggle('QR Remove Background', 'No QR background')}
                        </div>
                    </div>
                </div>

                <h3>Features</h3>
                <div class="xcl-options">
                    ${this.toggle('JSON Index', 'Enhanced index')}
                    ${this.toggle('Time Formatting', 'Readable timestamps')}
                    ${this.toggle('Relative Post Dates', 'Relative times')}
                    ${this.toggle('Color User IDs', 'Colorize IDs')}
                    ${this.toggle('ID Post Count', 'ID hover count')}
                    ${this.toggle('ID Highlighting', 'Click ID to highlight')}
                    ${this.toggle('Thread Stats', 'Posts/files counter')}
                    ${this.toggle('Linkify', 'Clickable URLs')}
                </div>

                <h3>Navigation & Quick Reply</h3>
                <div class="xcl-options">
                    ${this.toggle('Board Nav Shortcuts', 'Top navigation bar')}
                    ${this.toggle('Infinite Scroll', 'Auto-load on scroll')}
                    ${this.toggle('Catalog Search', 'Search in catalog')}
                    ${this.toggle('Quick Reply', 'Quick reply panel (Q)')}
                    ${this.toggle('Persistent QR', 'Keep QR open')}
                    ${this.toggle('Auto Hide QR', 'Hide after posting')}
                    ${this.toggle('Remember Name', 'Remember name')}
                </div>

                <div class="xcl-input-row">
                    <div class="xcl-input-group">
                        <label>Favorite Boards</label>
                        <input type="text" class="xcl-input" data-setting="Favorite Boards"
                               value="${E(Conf['Favorite Boards'] || 'g,pol,v,a')}" placeholder="g,pol,v,a">
                    </div>
                    <div class="xcl-input-group">
                        <label>Custom CSS</label>
                        ${this.toggle('Custom CSS', 'Enable custom styles')}
                    </div>
                </div>

                <div class="xcl-input-group">
                    <label>User Stylesheet</label>
                    <textarea class="xcl-input" data-setting="User CSS" placeholder="/* Your CSS */" style="min-height:50px;">${E(Conf['User CSS'] || '')}</textarea>
                </div>
            </div>
        `;
    },

    renderFiltering() {
        return `
            <div class="xcl-section" data-section="filtering">
                <h2>Post Filtering</h2>

                <div class="xcl-options">
                    ${this.toggle('Filter Enabled', 'Enable filtering')}
                    ${this.toggle('Recursive Hiding', 'Hide quote chains')}
                    ${this.toggle('Thread Hiding Buttons', 'Thread hide buttons')}
                    ${this.toggle('Reply Hiding Buttons', 'Reply hide buttons')}
                    ${this.toggle('Stubs', 'Show stubs')}
                    ${this.toggle('Sort Highlighted First', 'Highlights to top')}
                </div>

                <h3>Filter Presets</h3>
                <div class="xcl-preset-grid">
                    <div class="xcl-preset-category">
                        <h4>🛡️ Quality</h4>
                        <button class="xcl-preset-btn" data-preset="spam">Spam & Ads</button>
                        <button class="xcl-preset-btn" data-preset="loweffort">Low Effort</button>
                        <button class="xcl-preset-btn" data-preset="bots">Bot Posts</button>
                        <button class="xcl-preset-btn" data-preset="mobile">Mobile</button>
                    </div>
                    <div class="xcl-preset-category">
                        <h4>🎭 Content</h4>
                        <button class="xcl-preset-btn" data-preset="wojak">Wojak/Pepe</button>
                        <button class="xcl-preset-btn" data-preset="greentext">Greentext</button>
                        <button class="xcl-preset-btn" data-preset="avatarfags">Avatarfags</button>
                        <button class="xcl-preset-btn" data-preset="generals">Generals</button>
                    </div>
                    <div class="xcl-preset-category">
                        <h4>⚠️ Astroturf</h4>
                        <button class="xcl-preset-btn" data-preset="shill">Shilling</button>
                        <button class="xcl-preset-btn" data-preset="political">Political</button>
                        <button class="xcl-preset-btn" data-preset="ragebait">Rage Bait</button>
                        <button class="xcl-preset-btn" data-preset="discord">Discord</button>
                    </div>
                    <div class="xcl-preset-category">
                        <h4>🌍 Region</h4>
                        <button class="xcl-preset-btn" data-preset="memeflags">Meme Flags</button>
                        <button class="xcl-preset-btn" data-preset="nonwestern">Non-Western</button>
                        <button class="xcl-preset-btn" data-preset="proxies">VPN/Proxy</button>
                    </div>
                    <div class="xcl-preset-category">
                        <h4>📁 Files</h4>
                        <button class="xcl-preset-btn" data-preset="knownspam">Spam Images</button>
                        <button class="xcl-preset-btn" data-preset="screenshots">Screenshots</button>
                        <button class="xcl-preset-btn" data-preset="reaction">Reactions</button>
                    </div>
                    <div class="xcl-preset-category">
                        <h4>🧹 Cleanup</h4>
                        <button class="xcl-preset-btn" data-preset="namefags">Namefags</button>
                        <button class="xcl-preset-btn" data-preset="tripfags">Tripfags</button>
                        <button class="xcl-preset-btn" data-preset="newfags">Newfags</button>
                        <button class="xcl-preset-btn" data-preset="copypasta">Copypasta</button>
                    </div>
                    <div class="xcl-preset-category" style="background:var(--xcl-accent-dim);border-color:var(--xcl-accent);">
                        <h4>✨ Highlight</h4>
                        <button class="xcl-preset-btn" data-preset="happenings">Breaking</button>
                        <button class="xcl-preset-btn" data-preset="quality">Quality</button>
                        <button class="xcl-preset-btn" data-preset="nsfw">NSFW</button>
                    </div>
                </div>

                <div style="margin:12px 0;display:flex;gap:8px;flex-wrap:wrap;">
                    <button class="xcl-btn xcl-btn-primary" id="xcl-apply-recommended">Apply Recommended Set</button>
                    <button class="xcl-btn" id="xcl-clear-filters">Clear All Filters</button>
                </div>

                <div class="xcl-input-group">
                    <label>Stub Format</label>
                    <input type="text" class="xcl-input" data-setting="Stub Format"
                           value="${E(Conf['Stub Format'] || 'Post hidden (click to show)')}"
                           placeholder="Post hidden (click to show)">
                </div>

                <h3>Hide Filters</h3>

                <div class="xcl-input-row">
                    <div class="xcl-input-group">
                        <label>MD5 Hash Filters (one per line)</label>
                        <textarea class="xcl-input" id="xcl-md5-filters" data-setting="MD5 Filters" placeholder="Base64 encoded MD5 hashes">${E(Conf['MD5 Filters'] || '')}</textarea>
                    </div>

                    <div class="xcl-input-group">
                        <label>Filename Filters</label>
                        <textarea class="xcl-input" id="xcl-filename-filters" data-setting="Filename Filters" placeholder="wojak&#10;soyjak">${E(Conf['Filename Filters'] || '')}</textarea>
                    </div>
                </div>

                <div class="xcl-input-row">
                    <div class="xcl-input-group">
                        <label>Name Filters</label>
                        <textarea class="xcl-input" id="xcl-name-filters" data-setting="Name Filters" placeholder="/^(?!Anonymous$)/">${E(Conf['Name Filters'] || '')}</textarea>
                    </div>

                    <div class="xcl-input-group">
                        <label>Tripcode Filters</label>
                        <textarea class="xcl-input" id="xcl-trip-filters" data-setting="Tripcode Filters" placeholder="/^!/">${E(Conf['Tripcode Filters'] || '')}</textarea>
                    </div>
                </div>

                <div class="xcl-input-row">
                    <div class="xcl-input-group">
                        <label>Flag/Country Filters</label>
                        <textarea class="xcl-input" id="xcl-flag-filters" data-setting="Flag Filters" placeholder="flag-us&#10;flag-il">${E(Conf['Flag Filters'] || '')}</textarea>
                    </div>

                    <div class="xcl-input-group">
                        <label>Subject Filters</label>
                        <textarea class="xcl-input" id="xcl-subject-filters" data-setting="Subject Filters" placeholder="/general$/i">${E(Conf['Subject Filters'] || '')}</textarea>
                    </div>
                </div>

                <div class="xcl-input-group">
                    <label>Comment Filters</label>
                    <textarea class="xcl-input" id="xcl-comment-filters" data-setting="Comment Filters" placeholder="/based|cringe|cope|seethe/i" style="min-height:80px;">${E(Conf['Comment Filters'] || '')}</textarea>
                </div>

                <h3>Highlight</h3>
                <div class="xcl-input-row">
                    <div class="xcl-input-group">
                        <label>Highlight Patterns</label>
                        <textarea class="xcl-input" id="xcl-highlight-filters" data-setting="Highlight Filters" placeholder="/important|breaking/i" style="min-height:50px;">${E(Conf['Highlight Filters'] || '')}</textarea>
                    </div>
                    <div class="xcl-input-group">
                        <label>Highlight Color</label>
                        <div style="display:flex;gap:6px;align-items:center;">
                            <input type="color" data-setting="Highlight Color" value="${Conf['Highlight Color'] || '#ffeb3b'}" style="width:40px;height:28px;border:none;cursor:pointer;">
                            <input type="text" class="xcl-input" data-setting="Highlight Color" value="${E(Conf['Highlight Color'] || '#ffeb3b')}" style="width:80px;margin:0;">
                        </div>
                    </div>
                </div>

                <h3>Import/Export</h3>
                <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px;">
                    <button class="xcl-btn" id="xcl-export-filters">Export JSON</button>
                    <button class="xcl-btn" id="xcl-export-4chanx">Export 4chan X</button>
                    <button class="xcl-btn xcl-btn-primary" id="xcl-import-filters">Import</button>
                </div>

                <h3>Paste 4chan X Filters</h3>
                <p>Paste filters in 4chan X format (pattern;options). Supports: /regex/i, ;highlight, ;only:board, ;exclude:board</p>
                <div class="xcl-input-group">
                    <textarea class="xcl-input" id="xcl-4chanx-paste" placeholder="/happening/i;highlight
/breaking/i;highlight
/pattern/i;only:pol,news
exclude:b/spam/i" style="min-height:100px;font-family:monospace;"></textarea>
                </div>
                <div style="display:flex;gap:8px;">
                    <button class="xcl-btn xcl-btn-primary" id="xcl-convert-4chanx">Convert & Apply</button>
                    <button class="xcl-btn" id="xcl-preview-4chanx">Preview Conversion</button>
                </div>
                <div id="xcl-conversion-preview" style="display:none;margin-top:12px;padding:10px;background:var(--xcl-bg-tertiary);border-radius:4px;font-family:monospace;font-size:11px;white-space:pre-wrap;"></div>
            </div>
        `;
    },

    renderQuotes() {
        return `
            <div class="xcl-section" data-section="quotes">
                <h2>Quote Features</h2>

                <h3>Quote Links & Threading</h3>
                <div class="xcl-options">
                    ${this.toggle('Quote Backlinks', 'Show backlinks')}
                    ${this.toggle('Quote Inlining', 'Click to inline')}
                    ${this.toggle('Quote Previewing', 'Hover preview')}
                    ${this.toggle('Quote Highlighting', 'Highlight on hover')}
                    ${this.toggle('Quote Threading', 'Threading toggle (T)')}
                    ${this.toggle('Quote Threading Default', 'Thread by default')}
                </div>

                <h3>Post Markers</h3>
                <div class="xcl-options">
                    ${this.toggle('Mark Quotes of You', 'Add (You) marker')}
                    ${this.toggle('Highlight Own Posts', 'Highlight your posts')}
                    ${this.toggle('Remember Your Posts', 'Remember across sessions')}
                    ${this.toggle('Mark OP Quotes', 'Add (OP) marker')}
                    ${this.toggle('Mark Cross-thread Quotes', 'Mark cross-thread')}
                </div>
            </div>
        `;
    },

    renderImages() {
        return `
            <div class="xcl-section" data-section="images">
                <h2>Images & Video</h2>

                <h3>Images</h3>
                <div class="xcl-options">
                    ${this.toggle('Image Expansion', 'Click to expand')}
                    ${this.toggle('Image Hover', 'Hover to preview')}
                    ${this.toggle('Image Prefetching', 'Preload images')}
                    ${this.toggle('Original Filename Download', 'Download button')}
                    ${this.toggle('Replace GIF', 'GIF indicator')}
                    ${this.toggle('Fit Width', 'Fit to width')}
                    ${this.toggle('Fit Height', 'Fit to height')}
                </div>

                <h3>Video (WebM/MP4)</h3>
                <div class="xcl-options">
                    ${this.toggle('Video Expansion', 'Click to expand')}
                    ${this.toggle('Video Hover', 'Hover to preview')}
                    ${this.toggle('Video Prefetching', 'Preload metadata')}
                    ${this.toggle('Video Hover Sound', 'Sound on hover')}
                    ${this.toggle('Video Thumbnail Preview', 'Video indicator')}
                </div>

                <h3>Gallery (G)</h3>
                <div class="xcl-options">
                    ${this.toggle('Gallery', 'Fullscreen gallery')}
                    ${this.toggle('Gallery Fit Width', 'Fit to width')}
                    ${this.toggle('Gallery Fit Height', 'Fit to height')}
                </div>

                <h3>Batch Download (ZIP)</h3>
                <div class="xcl-options">
                    ${this.toggle('Batch Download', 'Download all as ZIP')}
                    ${this.toggle('Per-Post Download Buttons', 'Per-post ZIP buttons')}
                </div>
            </div>
        `;
    },

    renderMedia() {
        return `
            <div class="xcl-section" data-section="media">
                <h2>Playback Settings</h2>

                <div class="xcl-options">
                    ${this.toggle('Autoplay', 'Autoplay videos')}
                    ${this.toggle('Show Controls', 'Show controls')}
                </div>

                <div class="xcl-input-group">
                    <label>Default Volume</label>
                    <div class="xcl-range-group">
                        <input type="range" class="xcl-range" data-setting="Default Volume"
                               min="0" max="1" step="0.05" value="${Conf['Default Volume'] || 0.5}">
                        <span class="xcl-range-value">${Math.round((Conf['Default Volume'] || 0.5) * 100)}%</span>
                    </div>
                </div>
            </div>
        `;
    },

    renderEmbedding() {
        return `
            <div class="xcl-section" data-section="embedding">
                <h2>Media Embedding</h2>
                <p>Embed media from external sites directly in posts.</p>

                <div class="xcl-options">
                    ${this.toggle('Embedding', 'Enable media embedding.')}
                    ${this.toggle('Auto-embed', 'Automatically embed links (vs click to embed).')}
                </div>

                <h3>Video Platforms</h3>
                <div class="xcl-options">
                    ${this.toggle('Embed YouTube', 'Embed YouTube videos.')}
                    ${this.toggle('Embed Streamable', 'Embed Streamable videos.')}
                    ${this.toggle('Embed Coub', 'Embed Coub videos.')}
                    ${this.toggle('Embed TikTok', 'Embed TikTok videos.')}
                    ${this.toggle('Embed Gfycat', 'Embed Gfycat/Redgifs.')}
                </div>

                <h3>Audio Platforms</h3>
                <div class="xcl-options">
                    ${this.toggle('Embed Vocaroo', 'Embed Vocaroo audio clips.')}
                    ${this.toggle('Embed SoundCloud', 'Embed SoundCloud tracks.')}
                    ${this.toggle('Embed Spotify', 'Embed Spotify tracks/albums/playlists.')}
                </div>

                <h3>Image & Social</h3>
                <div class="xcl-options">
                    ${this.toggle('Embed Imgur', 'Embed Imgur images and albums.')}
                    ${this.toggle('Embed Catbox', 'Embed Catbox files.')}
                    ${this.toggle('Embed Twitter', 'Embed Twitter/X posts.')}
                </div>
            </div>
        `;
    },

    renderMonitoring() {
        return `
            <div class="xcl-section" data-section="monitoring">
                <h2>Thread Monitoring</h2>
                <p>Configure thread watching and automatic updates.</p>

                <h3>Thread Updater</h3>
                <div class="xcl-options">
                    ${this.toggle('Thread Updater', 'Automatically check for new posts.')}
                    ${this.toggle('Auto Update', 'Enable automatic updates by default.')}
                    ${this.toggle('Unread Count', 'Show unread post count in tab title.')}
                    ${this.toggle('Unread Favicon', 'Show unread indicator on favicon.')}
                    ${this.toggle('Unread Line', 'Show line separating read/unread posts.')}
                    ${this.toggle('Desktop Notifications', 'Show desktop notifications for new posts.')}
                </div>

                <div class="xcl-input-group">
                    <label>Update Interval (seconds)</label>
                    <div class="xcl-range-group">
                        <input type="range" class="xcl-range"
                               data-setting="Update Interval"
                               min="5" max="120" step="5"
                               value="${Conf['Update Interval'] || 30}">
                        <span class="xcl-range-value">${Conf['Update Interval'] || 30}s</span>
                    </div>
                </div>

                <h3>Last Read Position</h3>
                <div class="xcl-options">
                    ${this.toggle('Remember Last Read', 'Remember your last read position in threads.')}
                    ${this.toggle('Scroll to Last Read', 'Automatically scroll to last read post when revisiting thread.')}
                </div>

                <h3>Thread Watcher</h3>
                <div class="xcl-options">
                    ${this.toggle('Thread Watcher', 'Enable thread watcher panel.')}
                    ${this.toggle('Auto Watch', 'Automatically watch threads you create.')}
                    ${this.toggle('Auto Watch Reply', 'Automatically watch threads you reply to.')}
                </div>
            </div>
        `;
    },

    renderAppearance() {
        return `
            <div class="xcl-section" data-section="appearance">
                <h2>Appearance</h2>
                <p>Customize the look and feel of the interface.</p>

                <h3>Layout</h3>
                <div class="xcl-options">
                    ${this.toggle('Compact Mode', 'Reduce padding and font sizes for more content.')}
                    ${this.toggle('Hide Sidebar', 'Hide banners, ads, and navigation links.')}
                    ${this.toggle('Post Hover Highlight', 'Highlight posts when hovering over them.')}
                </div>

                <h3>Post Width</h3>
                <div class="xcl-input-group">
                    <label>Maximum Post Width</label>
                    <select class="xcl-input" data-setting="Post Width" style="width:auto;">
                        <option value="auto" ${Conf['Post Width'] === 'auto' ? 'selected' : ''}>Auto (default)</option>
                        <option value="narrow" ${Conf['Post Width'] === 'narrow' ? 'selected' : ''}>Narrow (600px)</option>
                        <option value="medium" ${Conf['Post Width'] === 'medium' ? 'selected' : ''}>Medium (900px)</option>
                        <option value="wide" ${Conf['Post Width'] === 'wide' ? 'selected' : ''}>Wide (1200px)</option>
                        <option value="full" ${Conf['Post Width'] === 'full' ? 'selected' : ''}>Full Width</option>
                    </select>
                </div>

                <h3>Thumbnail Size</h3>
                <div class="xcl-input-group">
                    <label>Thumbnail Maximum Size</label>
                    <select class="xcl-input" data-setting="Thumbnail Size" style="width:auto;">
                        <option value="small" ${Conf['Thumbnail Size'] === 'small' ? 'selected' : ''}>Small (100px)</option>
                        <option value="medium" ${Conf['Thumbnail Size'] === 'medium' ? 'selected' : ''}>Medium (150px)</option>
                        <option value="large" ${Conf['Thumbnail Size'] === 'large' ? 'selected' : ''}>Large (250px)</option>
                    </select>
                </div>

                <div class="xcl-status xcl-status-warning" style="margin-top:16px;">
                    Changes to appearance settings apply immediately. Use Custom CSS in General tab for more advanced styling.
                </div>
            </div>
        `;
    },

    renderAdvanced() {
        return `
            <div class="xcl-section" data-section="advanced">
                <h2>Advanced Settings</h2>
                <p>Advanced options and debugging features.</p>

                <div class="xcl-options">
                    ${this.toggle('Disable Native Extension', 'Disable 4chan\'s native extension.')}
                    ${this.toggle('Keyboard Shortcuts', 'Enable keyboard shortcuts.')}
                    ${this.toggle('Archive Redirect', 'Redirect dead threads to archives.')}
                </div>

                <h3>Keyboard Shortcuts</h3>
                <div class="xcl-status xcl-status-warning">
                    <strong>Q</strong> = Quick Reply &nbsp;|&nbsp;
                    <strong>G</strong> = Gallery &nbsp;|&nbsp;
                    <strong>R</strong> = Update Thread &nbsp;|&nbsp;
                    <strong>W</strong> = Watch Thread &nbsp;|&nbsp;
                    <strong>T</strong> = Toggle Threading &nbsp;|&nbsp;
                    <strong>ESC</strong> = Close overlays
                </div>

                <h3>Data Management</h3>
                <p>Export your settings to back them up, or import previously exported settings.</p>
                <div class="xcl-status xcl-status-warning">
                    <strong>Hidden Posts:</strong> ${Object.keys(Conf.hiddenPosts || {}).length} boards with hidden posts<br>
                    <strong>Hidden Threads:</strong> ${Object.keys(Conf.hiddenThreads || {}).length} boards with hidden threads<br>
                    <strong>Watched Threads:</strong> ${Object.keys(Conf.watchedThreads || {}).length} watched threads
                </div>

                <button class="xcl-btn xcl-btn-danger" id="xcl-clear-data" style="margin-top: 12px;">
                    Clear All Hidden Posts/Threads
                </button>
            </div>
        `;
    },

    toggle(name, desc) {
        const checked = Conf[name] ? 'checked' : '';
        const id = name.replace(/\s+/g, '-').toLowerCase();
        return `
            <div class="xcl-option">
                <label class="xcl-toggle">
                    <input type="checkbox" id="xcl-${id}" data-setting="${name}" ${checked}>
                    <span class="xcl-toggle-slider"></span>
                </label>
                <div class="xcl-option-info">
                    <label class="xcl-option-label" for="xcl-${id}">${E(name)}</label>
                    <span class="xcl-option-desc">${E(desc)}</span>
                </div>
            </div>
        `;
    },

    showTab(tabName) {
        // Update nav
        $.qsa('#xcl-nav button').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });

        // Update sections
        $.qsa('.xcl-section').forEach(section => {
            section.classList.toggle('active', section.dataset.section === tabName);
        });
    },

    bindEvents() {
        // Close button
        $.on($.qs('#xcl-close'), 'click', () => this.close());

        // Click outside to close
        $.on(this.overlay, 'click', e => {
            if (e.target === this.overlay) this.close();
        });

        // ESC to close
        const escHandler = e => {
            if (e.key === 'Escape') {
                this.close();
                document.removeEventListener('keydown', escHandler);
            }
        };
        document.addEventListener('keydown', escHandler);

        // Tab navigation
        $.qsa('#xcl-nav button').forEach(btn => {
            $.on(btn, 'click', () => this.showTab(btn.dataset.tab));
        });

        // Toggle settings
        $.qsa('[data-setting]').forEach(el => {
            if (el.type === 'checkbox') {
                $.on(el, 'change', () => this.updateSetting(el.dataset.setting, el.checked));
            } else if (el.type === 'range') {
                $.on(el, 'input', () => {
                    const val = parseFloat(el.value);
                    this.updateSetting(el.dataset.setting, val);
                    const display = el.nextElementSibling;
                    if (display) {
                        if (el.dataset.setting === 'Default Volume') {
                            display.textContent = Math.round(val * 100) + '%';
                        } else {
                            display.textContent = val + 's';
                        }
                    }
                });
            } else if (el.type === 'color') {
                $.on(el, 'input', () => {
                    this.updateSetting(el.dataset.setting, el.value);
                    // Sync with text input if exists
                    const textInput = el.parentNode.querySelector('input[type="text"]');
                    if (textInput && textInput !== el) {
                        textInput.value = el.value;
                    }
                });
            } else if (el.tagName === 'SELECT') {
                $.on(el, 'change', () => {
                    const setting = el.dataset.setting;
                    let value = el.value;

                    // Convert numeric values for margin settings
                    if (['Left Margin', 'Right Margin'].includes(setting)) {
                        value = parseInt(value, 10);
                    }

                    this.updateSetting(setting, value);

                    // Apply appearance changes immediately
                    if (['Post Width', 'Thumbnail Size'].includes(setting)) {
                        Appearance[`apply${setting.replace(/\s/g, '')}`]?.();
                    }
                    // Apply margin changes
                    if (['Left Margin', 'Right Margin'].includes(setting)) {
                        Appearance.applyMargins();
                    }
                    // Apply sidebar changes
                    if (setting === 'Sidebar Position') {
                        Appearance.applySidebar();
                    }
                    // Apply background changes
                    if (['Background Position', 'Background Repeat', 'Background Attachment', 'Background Size'].includes(setting)) {
                        Appearance.applyCustomBackground();
                    }
                    // Apply QR style changes
                    if (setting === 'QR Autohide Style') {
                        Appearance.applyQRStyle();
                    }
                });
            } else if (el.tagName === 'TEXTAREA' || el.type === 'text') {
                $.on(el, 'input', () => {
                    this.updateSetting(el.dataset.setting, el.value);
                    // Apply custom background URL changes
                    if (el.dataset.setting === 'Custom Background URL') {
                        Appearance.applyCustomBackground();
                    }
                });
            }
        });

        // Export/Import/Reset
        $.on($.qs('#xcl-export'), 'click', () => this.exportSettings());
        $.on($.qs('#xcl-import'), 'click', () => this.importSettings());
        $.on($.qs('#xcl-reset'), 'click', () => this.resetSettings());

        // Theme export/import buttons
        const exportThemeBtn = $.qs('#xcl-export-theme');
        if (exportThemeBtn) {
            $.on(exportThemeBtn, 'click', () => this.exportTheme());
        }
        const importThemeBtn = $.qs('#xcl-import-theme');
        if (importThemeBtn) {
            $.on(importThemeBtn, 'click', () => this.importTheme());
        }

        // Filter import/export buttons
        const exportFiltersBtn = $.qs('#xcl-export-filters');
        if (exportFiltersBtn) {
            $.on(exportFiltersBtn, 'click', () => Filter.exportFilters());
        }
        const importFiltersBtn = $.qs('#xcl-import-filters');
        if (importFiltersBtn) {
            $.on(importFiltersBtn, 'click', () => Filter.importFilters());
        }

        // 4chan X format export
        const export4chanXBtn = $.qs('#xcl-export-4chanx');
        if (export4chanXBtn) {
            $.on(export4chanXBtn, 'click', () => Filter.export4chanX());
        }

        // 4chan X paste convert & apply
        const convert4chanXBtn = $.qs('#xcl-convert-4chanx');
        if (convert4chanXBtn) {
            $.on(convert4chanXBtn, 'click', async () => {
                const textarea = $.qs('#xcl-4chanx-paste');
                if (!textarea || !textarea.value.trim()) {
                    Toast.show('Paste some filters first', 'warning');
                    return;
                }

                Filter.import4chanXFilters(textarea.value);
                await $.set('config', Conf);
                Filter.parseFilters();
                this.updateFilterTextareas();
                textarea.value = '';
                $.qs('#xcl-conversion-preview').style.display = 'none';
                Toast.show('Filters converted and applied!', 'success');
            });
        }

        // 4chan X paste preview
        const preview4chanXBtn = $.qs('#xcl-preview-4chanx');
        if (preview4chanXBtn) {
            $.on(preview4chanXBtn, 'click', () => {
                const textarea = $.qs('#xcl-4chanx-paste');
                const previewDiv = $.qs('#xcl-conversion-preview');
                if (!textarea || !previewDiv) return;

                if (!textarea.value.trim()) {
                    Toast.show('Paste some filters first', 'warning');
                    return;
                }

                const { commentFilters, highlightFilters } = Filter.convertAndApply4chanXFilters(textarea.value);

                let preview = '';
                if (highlightFilters.length > 0) {
                    preview += '<strong style="color:var(--xcl-accent)">Highlight Filters:</strong>\n' + highlightFilters.join('\n') + '\n\n';
                }
                if (commentFilters.length > 0) {
                    preview += '<strong style="color:var(--xcl-text-primary)">Hide Filters:</strong>\n' + commentFilters.join('\n');
                }

                if (!preview) {
                    preview = 'No valid filters found';
                }

                previewDiv.innerHTML = preview;
                previewDiv.style.display = 'block';
            });
        }

        // Clear data button
        const clearBtn = $.qs('#xcl-clear-data');
        if (clearBtn) {
            $.on(clearBtn, 'click', () => this.clearHiddenData());
        }

        // Theme selection
        $.qsa('.xcl-theme-option').forEach(el => {
            $.on(el, 'click', () => {
                const theme = el.dataset.theme;
                $.qsa('.xcl-theme-option').forEach(t => t.classList.remove('active'));
                el.classList.add('active');
                this.updateSetting('Theme', theme);
                Theme.apply(theme);
            });
        });

        // Filter preset buttons
        $.qsa('.xcl-preset-btn').forEach(btn => {
            $.on(btn, 'click', () => {
                const presetId = btn.dataset.preset;
                if (FilterPresets.applyPreset(presetId)) {
                    btn.classList.add('applied');
                    this.updateFilterTextareas();
                    this.saveAllFilters();
                    Toast.show(`Applied "${FilterPresets[presetId]?.title || presetId}" filters`, 'success');
                }
            });
        });

        // Apply recommended preset
        const recommendedBtn = $.qs('#xcl-apply-recommended');
        if (recommendedBtn) {
            $.on(recommendedBtn, 'click', () => {
                FilterPresets.applyPreset('recommended');
                this.updateFilterTextareas();
                this.saveAllFilters();
                Toast.show('Applied recommended filter set', 'success');
            });
        }

        // Clear all filters
        const clearFiltersBtn = $.qs('#xcl-clear-filters');
        if (clearFiltersBtn) {
            $.on(clearFiltersBtn, 'click', () => {
                if (confirm('Clear all filters? This cannot be undone.')) {
                    Conf['Comment Filters'] = '';
                    Conf['Subject Filters'] = '';
                    Conf['Name Filters'] = '';
                    Conf['Tripcode Filters'] = '';
                    Conf['Flag Filters'] = '';
                    Conf['Filename Filters'] = '';
                    Conf['MD5 Filters'] = '';
                    Conf['Highlight Filters'] = '';
                    this.updateFilterTextareas();
                    this.saveAllFilters();
                    $.qsa('.xcl-preset-btn').forEach(b => b.classList.remove('applied'));
                    Toast.show('All filters cleared', 'success');
                }
            });
        }
    },

    // Update filter textareas from Conf
    updateFilterTextareas() {
        const mappings = {
            '#xcl-comment-filters': 'Comment Filters',
            '#xcl-subject-filters': 'Subject Filters',
            '#xcl-name-filters': 'Name Filters',
            '#xcl-trip-filters': 'Tripcode Filters',
            '#xcl-flag-filters': 'Flag Filters',
            '#xcl-filename-filters': 'Filename Filters',
            '#xcl-md5-filters': 'MD5 Filters',
            '#xcl-highlight-filters': 'Highlight Filters'
        };

        Object.entries(mappings).forEach(([selector, setting]) => {
            const el = $.qs(selector);
            if (el) {
                el.value = Conf[setting] || '';
            }
        });
    },

    // Save all filter settings
    async saveAllFilters() {
        await $.set('config', Conf);
    },

    async updateSetting(name, value) {
        Conf[name] = value;
        await $.set('config', Conf);

        // Apply immediate effects
        if (name === 'Custom CSS' || name === 'User CSS') {
            CustomCSS.update();
        }

        // Theme and site cleanup
        if (name === 'Theme') {
            Theme.apply(value);
        }

        // All visibility/cleanup settings
        const cleanupSettings = [
            'Hide Ads', 'Hide Blotter', 'Hide Board Banner', 'Hide Board Title',
            'Hide Footer', 'Hide Sticky Threads', 'Hide Post Form', 'Hide Rules',
            'Hide Nav Links Top', 'Hide Nav Links Bottom', 'Show Checkboxes',
            'Modernize Interface'
        ];
        if (cleanupSettings.includes(name)) {
            Theme.applyCleanup();
        }

        // Layout settings
        if (name === 'Minimal Sidebar') {
            Appearance.applySidebar();
        }

        // QR style settings
        if (['Transparent QR', 'QR Remove Background'].includes(name)) {
            Appearance.applyQRStyle();
        }
    },

    async exportSettings() {
        const data = {
            version: VERSION,
            date: Date.now(),
            config: Conf
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = $.el('a', {
            href: url,
            download: `4chan-x-lite-${Date.now()}.json`
        });
        a.click();
        URL.revokeObjectURL(url);

        Toast.show('Settings exported!', 'success');
    },

    importSettings() {
        const input = $.el('input', { type: 'file', accept: '.json' });
        $.on(input, 'change', async () => {
            if (!input.files[0]) return;

            try {
                const text = await input.files[0].text();
                const data = JSON.parse(text);

                if (!data.config) {
                    throw new Error('Invalid settings file');
                }

                if (!confirm('This will overwrite your current settings. Continue?')) {
                    return;
                }

                Conf = { ...DefaultConfig, ...data.config };
                await $.set('config', Conf);

                Toast.show('Settings imported! Reloading...', 'success');
                setTimeout(() => location.reload(), 1000);

            } catch (e) {
                Toast.show('Failed to import settings: ' + e.message, 'error');
            }
        });
        input.click();
    },

    async resetSettings() {
        if (!confirm('Reset all settings to defaults? This cannot be undone.')) {
            return;
        }

        Conf = { ...DefaultConfig };
        await $.set('config', Conf);

        Toast.show('Settings reset! Reloading...', 'success');
        setTimeout(() => location.reload(), 1000);
    },

    exportTheme() {
        // Export current theme settings including custom background
        const themeData = {
            version: VERSION,
            type: 'theme',
            date: Date.now(),
            theme: Conf['Theme'],
            customBackground: {
                url: Conf['Custom Background URL'] || '',
                position: Conf['Background Position'] || 'center',
                repeat: Conf['Background Repeat'] || 'no-repeat',
                attachment: Conf['Background Attachment'] || 'fixed',
                size: Conf['Background Size'] || 'cover'
            },
            layout: {
                leftMargin: Conf['Left Margin'] || 5,
                rightMargin: Conf['Right Margin'] || 5,
                sidebarPosition: Conf['Sidebar Position'] || 'right',
                minimalSidebar: Conf['Minimal Sidebar'] || false
            },
            qrStyle: {
                autohideStyle: Conf['QR Autohide Style'] || 'normal',
                transparent: Conf['Transparent QR'] || false,
                removeBackground: Conf['QR Remove Background'] || false
            },
            visibility: {
                hideAds: Conf['Hide Ads'],
                hideBlotter: Conf['Hide Blotter'],
                hideBoardBanner: Conf['Hide Board Banner'],
                hideBoardTitle: Conf['Hide Board Title'],
                hideFooter: Conf['Hide Footer'],
                hideStickyThreads: Conf['Hide Sticky Threads'],
                hidePostForm: Conf['Hide Post Form'],
                hideRules: Conf['Hide Rules'],
                hideNavLinksTop: Conf['Hide Nav Links Top'],
                hideNavLinksBottom: Conf['Hide Nav Links Bottom'],
                showCheckboxes: Conf['Show Checkboxes']
            },
            customThemes: Conf['Custom Themes'] || []
        };

        const blob = new Blob([JSON.stringify(themeData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = $.el('a', {
            href: url,
            download: `4chan-x-lite-theme-${Date.now()}.json`
        });
        a.click();
        URL.revokeObjectURL(url);

        Toast.show('Theme exported!', 'success');
    },

    importTheme() {
        const input = $.el('input', { type: 'file', accept: '.json' });
        $.on(input, 'change', async () => {
            if (!input.files[0]) return;

            try {
                const text = await input.files[0].text();
                const data = JSON.parse(text);

                if (data.type !== 'theme') {
                    throw new Error('Not a theme file');
                }

                // Apply theme
                if (data.theme) {
                    Conf['Theme'] = data.theme;
                    Theme.apply(data.theme);
                }

                // Apply custom background
                if (data.customBackground) {
                    Conf['Custom Background URL'] = data.customBackground.url || '';
                    Conf['Background Position'] = data.customBackground.position || 'center';
                    Conf['Background Repeat'] = data.customBackground.repeat || 'no-repeat';
                    Conf['Background Attachment'] = data.customBackground.attachment || 'fixed';
                    Conf['Background Size'] = data.customBackground.size || 'cover';
                }

                // Apply layout
                if (data.layout) {
                    Conf['Left Margin'] = data.layout.leftMargin ?? 5;
                    Conf['Right Margin'] = data.layout.rightMargin ?? 5;
                    Conf['Sidebar Position'] = data.layout.sidebarPosition || 'right';
                    Conf['Minimal Sidebar'] = data.layout.minimalSidebar ?? false;
                }

                // Apply QR style
                if (data.qrStyle) {
                    Conf['QR Autohide Style'] = data.qrStyle.autohideStyle || 'normal';
                    Conf['Transparent QR'] = data.qrStyle.transparent ?? false;
                    Conf['QR Remove Background'] = data.qrStyle.removeBackground ?? false;
                }

                // Apply visibility
                if (data.visibility) {
                    Conf['Hide Ads'] = data.visibility.hideAds ?? true;
                    Conf['Hide Blotter'] = data.visibility.hideBlotter ?? true;
                    Conf['Hide Board Banner'] = data.visibility.hideBoardBanner ?? false;
                    Conf['Hide Board Title'] = data.visibility.hideBoardTitle ?? false;
                    Conf['Hide Footer'] = data.visibility.hideFooter ?? true;
                    Conf['Hide Sticky Threads'] = data.visibility.hideStickyThreads ?? false;
                    Conf['Hide Post Form'] = data.visibility.hidePostForm ?? false;
                    Conf['Hide Rules'] = data.visibility.hideRules ?? true;
                    Conf['Hide Nav Links Top'] = data.visibility.hideNavLinksTop ?? false;
                    Conf['Hide Nav Links Bottom'] = data.visibility.hideNavLinksBottom ?? true;
                    Conf['Show Checkboxes'] = data.visibility.showCheckboxes ?? false;
                }

                // Apply custom themes
                if (data.customThemes) {
                    Conf['Custom Themes'] = data.customThemes;
                }

                await $.set('config', Conf);

                // Apply changes
                Appearance.applyMargins();
                Appearance.applySidebar();
                Appearance.applyCustomBackground();
                Appearance.applyQRStyle();
                Theme.applyCleanup();

                Toast.show('Theme imported!', 'success');
                setTimeout(() => location.reload(), 1000);

            } catch (e) {
                Toast.show('Failed to import theme: ' + e.message, 'error');
            }
        });
        input.click();
    },

    async clearHiddenData() {
        if (!confirm('Clear all hidden posts and threads?')) {
            return;
        }

        Conf.hiddenPosts = {};
        Conf.hiddenThreads = {};
        await $.set('config', Conf);

        Toast.show('Hidden data cleared!', 'success');
    }
};

// ============================================================================
// TOAST NOTIFICATIONS
// ============================================================================

const Toast = {
    container: null,

    init() {
        this.container = $.el('div', { id: 'xcl-toast-container' });
        document.body.appendChild(this.container);
    },

    show(message, type = 'info', duration = 3000) {
        const toast = $.el('div', { className: `xcl-toast ${type}` }, message);
        this.container.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(-20px)';
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }
};

// ============================================================================
// CUSTOM CSS
// ============================================================================

const CustomCSS = {
    style: null,

    init() {
        if (Conf['Custom CSS'] && Conf['User CSS']) {
            this.update();
        }
    },

    update() {
        if (!Conf['Custom CSS']) {
            if (this.style) {
                this.style.remove();
                this.style = null;
            }
            return;
        }

        if (!this.style) {
            this.style = $.el('style', { id: 'xcl-usercss' });
            document.head.appendChild(this.style);
        }

        this.style.textContent = Conf['User CSS'] || '';
    }
};

// ============================================================================
// COLOR USER IDs
// ============================================================================

const ColorIDs = {
    cache: new Map(),
    highlightedID: null,

    init() {
        if (!Conf['Color User IDs'] && !Conf['ID Post Count'] && !Conf['ID Highlighting']) return;
        this.processAll();
    },

    processAll() {
        $.qsa('.posteruid').forEach(el => this.process(el));
    },

    process(el) {
        const id = el.textContent.replace(/[()]/g, '').replace('ID:', '').trim();
        if (!id) return;

        const hand = $.qs('.hand', el);
        if (!hand) return;

        // Color the ID
        if (Conf['Color User IDs'] && !hand.dataset.colored) {
            hand.dataset.colored = 'true';
            const color = this.getColor(id);
            hand.style.backgroundColor = color;
            hand.style.color = this.getTextColor(color);
        }

        // Store ID on element for easy access
        hand.dataset.odaUid = id;

        // Add post count on hover
        if (Conf['ID Post Count'] && !hand.dataset.countBound) {
            hand.dataset.countBound = 'true';
            $.on(hand, 'mouseover', () => this.showPostCount(hand, id));
        }

        // Add click to highlight
        if (Conf['ID Highlighting'] && !hand.dataset.highlightBound) {
            hand.dataset.highlightBound = 'true';
            $.on(hand, 'click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.toggleHighlight(id);
            });
        }
    },

    showPostCount(el, id) {
        const count = this.countPostsByID(id);
        el.title = `${count} post${count === 1 ? '' : 's'} by this ID`;
    },

    countPostsByID(id) {
        let count = 0;
        $.qsa('.posteruid .hand').forEach(hand => {
            const handId = hand.dataset.odaUid || hand.textContent.replace(/[()]/g, '').trim();
            if (handId === id) count++;
        });
        return count;
    },

    toggleHighlight(id) {
        // If clicking same ID, remove highlight
        if (this.highlightedID === id) {
            this.clearHighlight();
            return;
        }

        // Clear previous highlight
        this.clearHighlight();

        // Highlight all posts with this ID
        this.highlightedID = id;
        $.qsa('.posteruid .hand').forEach(hand => {
            const handId = hand.dataset.odaUid || hand.textContent.replace(/[()]/g, '').trim();
            if (handId === id) {
                const post = hand.closest('.post, .op');
                if (post) post.classList.add('xcl-id-highlight');
            }
        });
    },

    clearHighlight() {
        this.highlightedID = null;
        $.qsa('.xcl-id-highlight').forEach(el => el.classList.remove('xcl-id-highlight'));
    },

    color(el) {
        // Legacy method for compatibility
        this.process(el);
    },

    getColor(id) {
        if (this.cache.has(id)) return this.cache.get(id);

        let hash = 0;
        for (let i = 0; i < id.length; i++) {
            hash = id.charCodeAt(i) + ((hash << 5) - hash);
        }

        const h = Math.abs(hash % 360);
        const s = 50 + (hash % 30);
        const l = 40 + (hash % 20);

        const color = `hsl(${h}, ${s}%, ${l}%)`;
        this.cache.set(id, color);
        return color;
    },

    getTextColor(bgColor) {
        // Simple luminance check
        const match = bgColor.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
        if (match) {
            const l = parseInt(match[3]);
            return l > 50 ? '#000' : '#fff';
        }
        return '#fff';
    }
};

// ============================================================================
// RELATIVE TIMESTAMPS
// ============================================================================

const RelativeTime = {
    init() {
        if (!Conf['Relative Post Dates']) return;
        this.processAll();
        // Update every 60 seconds
        setInterval(() => this.processAll(), 60000);
    },

    processAll() {
        $.qsa('.dateTime[data-utc]:not(.xcl-relative-processed), .dateTime:not(.xcl-relative-processed)').forEach(el => {
            const utc = el.dataset.utc;
            if (!utc) return;
            el.classList.add('xcl-relative-processed');
            el.dataset.originalTitle = el.title || el.textContent;
            this.update(el);
        });
        // Update already processed ones
        $.qsa('.dateTime.xcl-relative-processed').forEach(el => this.update(el));
    },

    update(el) {
        const utc = parseInt(el.dataset.utc);
        if (!utc || isNaN(utc)) return;
        const relative = this.format(utc * 1000);
        el.title = el.dataset.originalTitle || el.textContent;
        el.textContent = relative;
    },

    format(timestamp) {
        const now = Date.now();
        const diff = Math.floor((now - timestamp) / 1000);

        if (diff < 5) return 'just now';
        if (diff < 60) return `${diff}s ago`;
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
        if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
        if (diff < 2592000) return `${Math.floor(diff / 604800)}w ago`;
        return new Date(timestamp).toLocaleDateString();
    }
};

// ============================================================================
// THREAD STATS
// ============================================================================

const ThreadStats = {
    el: null,
    postCount: 0,
    fileCount: 0,
    uniqueIDs: 0,
    updateTimeout: null,

    init() {
        if (g.VIEW !== 'thread' || !Conf['Thread Stats']) return;

        this.createUI();
        this.count();
        this.update();

        // Watch for new posts being added (debounced)
        const thread = $.qs('.thread');
        if (thread) {
            const observer = new MutationObserver(() => {
                clearTimeout(this.updateTimeout);
                this.updateTimeout = setTimeout(() => {
                    this.count();
                    this.update();
                    // Also update ID processing for new posts
                    ColorIDs.processAll();
                }, 250);
            });
            observer.observe(thread, { childList: true, subtree: true });
        }
    },

    createUI() {
        this.el = $.el('div', { id: 'xcl-thread-stats' });
        document.body.appendChild(this.el);
    },

    count() {
        // Count posts (excluding hidden)
        const posts = $.qsa('.postContainer:not(.hidden)');
        this.postCount = posts.length;

        // Count files
        this.fileCount = $.qsa('.file').length;

        // Count unique IDs
        const ids = new Set();
        $.qsa('.posteruid .hand').forEach(hand => {
            const id = hand.dataset.odaUid || hand.textContent.replace(/[()]/g, '').trim();
            if (id) ids.add(id);
        });
        this.uniqueIDs = ids.size;
    },

    update() {
        if (!this.el) return;

        // Check post limit (thread is about to be pruned at 310 posts typically)
        const isNearLimit = this.postCount >= 300;
        const postClass = isNearLimit ? 'warning' : '';

        // Check file limit (typically 150 images)
        const isFileLimit = this.fileCount >= 150;
        const fileClass = isFileLimit ? 'warning' : '';

        let html = `
            <span title="Posts in thread">
                <span class="stat-value ${postClass}">${this.postCount}</span>
                <span class="stat-label">P</span>
            </span>
            <span title="Files/images in thread">
                <span class="stat-value ${fileClass}">${this.fileCount}</span>
                <span class="stat-label">F</span>
            </span>
        `;

        // Only show unique IDs if the board has them
        if (this.uniqueIDs > 0) {
            html += `
                <span title="Unique poster IDs">
                    <span class="stat-value">${this.uniqueIDs}</span>
                    <span class="stat-label">IDs</span>
                </span>
            `;
        }

        this.el.innerHTML = html;
    }
};

// ============================================================================
// BATCH DOWNLOAD (ZIP)
// ============================================================================

const BatchDownload = {
    isDownloading: false,
    progressEl: null,

    init() {
        if (g.VIEW !== 'thread' || !Conf['Batch Download']) return;

        // Check if JSZip is available
        if (typeof JSZip === 'undefined') {
            console.warn('4chan X Lite: JSZip not loaded, batch download disabled');
            return;
        }

        this.createUI();

        // Add per-post download buttons if enabled
        if (Conf['Per-Post Download Buttons']) {
            this.addPostButtons();
        }
    },

    createUI() {
        const thread = $.qs('.thread');
        if (!thread) return;

        const mediaCount = this.getMediaLinks().length;

        const container = $.el('div', { id: 'xcl-batch-download' });
        container.innerHTML = `
            <button id="xcl-batch-download-btn" title="Download all ${mediaCount} files as ZIP">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                Download All as ZIP
            </button>
            <div class="xcl-dl-options">
                <label class="xcl-dl-option" title="Use original uploaded filename">
                    <input type="radio" name="xcl-dl-format" value="original" ${Conf['ZIP Filename Format'] === 'original' ? 'checked' : ''}>
                    Original
                </label>
                <label class="xcl-dl-option" title="Use 4chan's timestamp filename">
                    <input type="radio" name="xcl-dl-format" value="postid" ${Conf['ZIP Filename Format'] === 'postid' ? 'checked' : ''}>
                    Timestamp
                </label>
                <label class="xcl-dl-option" title="Combine: timestamp_originalname">
                    <input type="radio" name="xcl-dl-format" value="combined" ${Conf['ZIP Filename Format'] === 'combined' ? 'checked' : ''}>
                    Combined
                </label>
            </div>
            <span class="xcl-dl-count">${mediaCount} files</span>
        `;

        thread.parentElement.insertBefore(container, thread);

        // Event listeners
        $.on($.id('xcl-batch-download-btn'), 'click', () => this.downloadAll());

        $.qsa('input[name="xcl-dl-format"]').forEach(radio => {
            $.on(radio, 'change', (e) => {
                Conf['ZIP Filename Format'] = e.target.value;
                saveConfig();
            });
        });
    },

    addPostButtons() {
        $.qsa('.postInfo').forEach(postInfo => {
            if ($.qs('.xcl-post-dl-btn', postInfo)) return;

            const postContainer = postInfo.closest('.postContainer');
            if (!postContainer) return;

            const postId = postContainer.id.replace('pc', '');

            const btn = $.el('button', {
                className: 'xcl-post-dl-btn',
                title: 'Download all files from this post onwards as ZIP'
            });
            btn.innerHTML = `<svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>`;

            $.on(btn, 'click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.downloadAll(postId);
            });

            postInfo.appendChild(btn);
        });
    },

    getMediaLinks(startFromPostId = '') {
        const mediaLinks = [];
        let startFound = !startFromPostId;

        $.qsa('.postContainer').forEach(post => {
            const postId = post.id.replace('pc', '');

            if (!startFound) {
                if (postId === startFromPostId) {
                    startFound = true;
                } else {
                    return;
                }
            }

            // Find file info
            const fileText = $.qs('.fileText', post);
            if (!fileText) return;

            const fileLink = $.qs('a[href*="i.4cdn.org"]', fileText);
            if (!fileLink) return;

            const url = fileLink.href;

            // Get original filename from title or text
            const originalNameEl = $.qs('a[title]', fileText) || fileLink;
            let originalName = originalNameEl.title || originalNameEl.textContent || '';
            originalName = originalName.trim();

            // Get timestamp filename from URL
            const timestampName = url.split('/').pop().split('?')[0];

            // Determine extension
            const ext = timestampName.match(/\.(\w+)$/)?.[1] || '';

            // If original name doesn't have extension, add it
            if (originalName && ext && !originalName.toLowerCase().endsWith('.' + ext.toLowerCase())) {
                originalName += '.' + ext;
            }

            if (!originalName) {
                originalName = timestampName;
            }

            mediaLinks.push({
                url,
                originalName,
                timestampName,
                postId
            });
        });

        return mediaLinks;
    },

    generateFilename(mediaData) {
        const format = Conf['ZIP Filename Format'] || 'original';
        let filename;

        switch (format) {
            case 'postid':
                filename = mediaData.timestampName;
                break;
            case 'combined':
                const base = mediaData.timestampName.replace(/\.\w+$/, '');
                filename = `${base}_${mediaData.originalName}`;
                break;
            case 'original':
            default:
                filename = mediaData.originalName;
                break;
        }

        // Sanitize filename
        return filename.replace(/[<>:"/\\|?*]/g, '_');
    },

    showProgress() {
        const overlay = $.el('div', { id: 'xcl-dl-progress-overlay' });
        const modal = $.el('div', { id: 'xcl-dl-progress' });
        modal.innerHTML = `
            <h3>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--xcl-accent)" stroke-width="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                Downloading...
            </h3>
            <div id="xcl-dl-progress-bar">
                <div id="xcl-dl-progress-fill"></div>
            </div>
            <div id="xcl-dl-progress-text">
                <span id="xcl-dl-progress-file">Initializing...</span>
                <span id="xcl-dl-progress-percent">0%</span>
            </div>
        `;

        document.body.appendChild(overlay);
        document.body.appendChild(modal);
        this.progressEl = modal;
    },

    updateProgress(current, total, filename = '') {
        if (!this.progressEl) return;

        const percent = Math.round((current / total) * 100);
        const fill = $.id('xcl-dl-progress-fill');
        const fileEl = $.id('xcl-dl-progress-file');
        const percentEl = $.id('xcl-dl-progress-percent');

        if (fill) fill.style.width = `${percent}%`;
        if (fileEl) fileEl.textContent = filename || `${current}/${total}`;
        if (percentEl) percentEl.textContent = `${percent}%`;
    },

    hideProgress() {
        $.id('xcl-dl-progress-overlay')?.remove();
        $.id('xcl-dl-progress')?.remove();
        this.progressEl = null;
    },

    async downloadAll(startFromPostId = '') {
        if (this.isDownloading) {
            alert('Download already in progress');
            return;
        }

        const mediaLinks = this.getMediaLinks(startFromPostId);

        if (mediaLinks.length === 0) {
            alert('No media files found!');
            return;
        }

        this.isDownloading = true;
        this.showProgress();

        const zip = new JSZip();
        const usedFilenames = new Set();
        let completed = 0;
        let successful = 0;
        const maxConcurrent = Conf['Max Concurrent Downloads'] || 5;

        this.updateProgress(0, mediaLinks.length, 'Starting...');

        const downloadFile = async (mediaData) => {
            let filename = this.generateFilename(mediaData);

            // Handle duplicate filenames
            let counter = 1;
            const originalFilename = filename;
            while (usedFilenames.has(filename.toLowerCase())) {
                const dotIndex = originalFilename.lastIndexOf('.');
                if (dotIndex > 0) {
                    const name = originalFilename.substring(0, dotIndex);
                    const ext = originalFilename.substring(dotIndex);
                    filename = `${name}_${counter}${ext}`;
                } else {
                    filename = `${originalFilename}_${counter}`;
                }
                counter++;
            }
            usedFilenames.add(filename.toLowerCase());

            try {
                this.updateProgress(completed, mediaLinks.length, filename);

                const response = await fetch(mediaData.url);
                if (!response.ok) throw new Error(`HTTP ${response.status}`);

                const blob = await response.blob();
                zip.file(filename, blob);
                successful++;
                console.log(`✓ Added: ${filename}`);
            } catch (error) {
                console.error(`✗ Failed: ${mediaData.url}`, error);
            } finally {
                completed++;
                this.updateProgress(completed, mediaLinks.length, filename);
            }
        };

        // Process downloads with concurrency limit
        const promises = [];
        for (const mediaData of mediaLinks) {
            promises.push(downloadFile(mediaData));
            if (promises.length >= maxConcurrent) {
                await Promise.all(promises.splice(0, maxConcurrent));
            }
        }
        if (promises.length > 0) {
            await Promise.all(promises);
        }

        try {
            this.updateProgress(mediaLinks.length, mediaLinks.length, 'Creating ZIP...');

            const zipBlob = await zip.generateAsync({
                type: 'blob',
                compression: 'DEFLATE',
                compressionOptions: { level: 6 }
            });

            // Generate filename from page title
            const pageTitle = document.title
                .replace(/\s*-\s*4chan.*$/i, '')
                .replace(/[<>:"/\\|?*]/g, '_')
                .slice(0, 50)
                .trim();
            const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
            const zipFilename = `${pageTitle || 'thread'}_${timestamp}.zip`;

            this.updateProgress(mediaLinks.length, mediaLinks.length, 'Downloading ZIP...');

            // Trigger download
            const downloadLink = $.el('a');
            downloadLink.href = URL.createObjectURL(zipBlob);
            downloadLink.download = zipFilename;
            downloadLink.style.display = 'none';
            document.body.appendChild(downloadLink);
            downloadLink.click();
            document.body.removeChild(downloadLink);

            setTimeout(() => URL.revokeObjectURL(downloadLink.href), 5000);

            const sizeInMB = (zipBlob.size / (1024 * 1024)).toFixed(2);

            setTimeout(() => {
                this.hideProgress();
                alert(
                    `✅ ZIP Download Complete!\n\n` +
                    `📁 File: ${zipFilename}\n` +
                    `📊 Total files: ${mediaLinks.length}\n` +
                    `✅ Successful: ${successful}\n` +
                    `❌ Failed: ${mediaLinks.length - successful}\n` +
                    `💾 ZIP size: ${sizeInMB} MB`
                );
            }, 500);

        } catch (error) {
            console.error('Error creating ZIP:', error);
            this.hideProgress();
            alert(`❌ Error creating ZIP: ${error.message}`);
        } finally {
            this.isDownloading = false;
        }
    }
};

// ============================================================================
// IMAGE HOVER
// ============================================================================

const ImageHover = {
    el: null,

    init() {
        if (!Conf['Image Hover']) return;

        this.el = $.el('img', { id: 'xcl-hover' });
        this.el.style.display = 'none';
        document.body.appendChild(this.el);

        $.on(document, 'mouseover', e => this.show(e));
        $.on(document, 'mouseout', e => this.hide(e));
        $.on(document, 'mousemove', e => this.move(e));
    },

    show(e) {
        // Check for thumbnail images - multiple selectors for threads, catalog, etc.
        const thumb = e.target.closest('.fileThumb img, .file img, .thread img, a[href*="i.4cdn.org"] img');
        if (!thumb) return;

        // Find the parent link
        const link = thumb.closest('a[href*="i.4cdn.org"], a.fileThumb');
        if (!link) return;

        // Don't show hover if image is already expanded (native 4chan expansion)
        // Check if the thumbnail is hidden or if there's an expanded image
        if (link.querySelector('.full-image, .expanded-image')) return;
        if (thumb.classList.contains('full-image') || thumb.classList.contains('expanded-image')) return;
        // Check if thumbnail is hidden (common expansion pattern)
        if (thumb.style.display === 'none') return;
        // Check if the clicked image IS the full-size image (src matches href)
        if (thumb.src === link.href) return;

        const fullUrl = link.href;
        // Match common image extensions
        if (!fullUrl.match(/\.(jpg|jpeg|png|gif|webp|avif|jfif|jxl)$/i)) return;

        this.el.src = fullUrl;
        this.el.style.display = 'block';
        this.move(e);
    },

    hide(e) {
        // Don't hide if still over an image area
        if (e.target.closest('.fileThumb, .file, .thread img, a[href*="i.4cdn.org"]')) return;
        this.el.style.display = 'none';
        this.el.src = '';
    },

    move(e) {
        if (this.el.style.display === 'none') return;

        const margin = 20;
        let x = e.clientX + margin;
        let y = e.clientY + margin;

        // Fit in viewport
        const rect = this.el.getBoundingClientRect();
        if (x + rect.width > window.innerWidth) {
            x = e.clientX - rect.width - margin;
        }
        if (y + rect.height > window.innerHeight) {
            y = window.innerHeight - rect.height - margin;
        }

        this.el.style.left = x + 'px';
        this.el.style.top = y + 'px';
    }
};

// ============================================================================
// QUOTE THREADING
// ============================================================================

const QuoteThreading = {
    enabled: false,
    threadedPosts: new Set(),

    init() {
        if (!Conf['Quote Threading']) return;
        if (g.VIEW !== 'thread') return;

        this.addToggle();

        if (Conf['Quote Threading Default']) {
            this.enable();
        }
    },

    addToggle() {
        const container = $.qs('.navLinks.desktop, .navLinks') || $.qs('.thread');
        if (!container) return;

        const btn = $.el('button', {
            id: 'xcl-threading-toggle',
            className: 'xcl-btn',
            style: 'margin-left: 10px; font-size: 11px; padding: 4px 8px;'
        });
        btn.textContent = 'Threading: OFF';

        $.on(btn, 'click', () => this.toggle());

        if (container.classList.contains('thread')) {
            container.insertBefore(btn, container.firstChild);
        } else {
            container.appendChild(btn);
        }

        this.toggleBtn = btn;
    },

    toggle() {
        if (this.enabled) {
            this.disable();
        } else {
            this.enable();
        }
    },

    enable() {
        this.enabled = true;
        if (this.toggleBtn) {
            this.toggleBtn.textContent = 'Threading: ON';
            this.toggleBtn.classList.add('xcl-btn-primary');
        }
        this.buildThreads();
    },

    disable() {
        this.enabled = false;
        if (this.toggleBtn) {
            this.toggleBtn.textContent = 'Threading: OFF';
            this.toggleBtn.classList.remove('xcl-btn-primary');
        }
        this.flatten();
    },

    buildThreads() {
        const thread = $.qs('.thread');
        if (!thread) return;

        const posts = $.qsa('.post.reply', thread);
        const postMap = new Map();
        const replies = new Map(); // parent -> children

        // Build post map
        posts.forEach(post => {
            const id = post.id.replace(/^pc?/, '');
            postMap.set(id, post);

            // Find first quote link
            const firstQuote = $.qs('.postMessage .quotelink', post);
            if (firstQuote) {
                const match = firstQuote.hash.match(/#p(\d+)/);
                if (match) {
                    const parentId = match[1];
                    if (!replies.has(parentId)) {
                        replies.set(parentId, []);
                    }
                    replies.get(parentId).push(id);
                }
            }
        });

        // Nest posts
        const nested = new Set();

        replies.forEach((children, parentId) => {
            const parent = postMap.get(parentId);
            if (!parent) return;

            // Create or get reply container
            let container = $.qs('.xcl-thread-replies', parent.closest('.postContainer') || parent);
            if (!container) {
                container = $.el('div', { className: 'xcl-thread-replies' });
                const postContainer = parent.closest('.postContainer') || parent;
                postContainer.appendChild(container);
            }

            children.forEach(childId => {
                const child = postMap.get(childId);
                if (!child || nested.has(childId)) return;

                const childContainer = child.closest('.postContainer') || child;
                container.appendChild(childContainer);
                nested.add(childId);
                this.threadedPosts.add(childId);
            });
        });
    },

    flatten() {
        const thread = $.qs('.thread');
        if (!thread) return;

        // Move all nested posts back to thread root
        $.qsa('.xcl-thread-replies .postContainer, .xcl-thread-replies .post').forEach(post => {
            // Find correct position based on post ID
            const id = parseInt(post.id.replace(/^pc?/, ''));
            const posts = $.qsa('.postContainer, .post.reply', thread);

            let inserted = false;
            for (const existingPost of posts) {
                const existingId = parseInt(existingPost.id.replace(/^pc?/, ''));
                if (existingId > id && !existingPost.closest('.xcl-thread-replies')) {
                    thread.insertBefore(post, existingPost);
                    inserted = true;
                    break;
                }
            }

            if (!inserted) {
                thread.appendChild(post);
            }
        });

        // Remove empty containers
        $.qsa('.xcl-thread-replies').forEach(c => c.remove());
        this.threadedPosts.clear();
    }
};

// ============================================================================
// VIDEO HANDLING (WebM/MP4)
// ============================================================================

const VideoHandler = {
    preloadQueue: [],
    preloading: false,
    cache: new Map(),
    hoverEl: null,
    currentLink: null,
    visibilityObserver: null,

    init() {
        if (!Conf['Video Hover'] && !Conf['Video Expansion']) return;

        // Create hover element
        this.hoverEl = $.el('video', {
            id: 'xcl-video-hover',
            loop: true,
            muted: !Conf['Video Hover Sound']
        });
        this.hoverEl.style.cssText = `
            position: fixed;
            z-index: 10001;
            max-width: 90vw;
            max-height: 90vh;
            pointer-events: none;
            box-shadow: 0 8px 32px rgba(0,0,0,0.5);
            border-radius: 4px;
            display: none;
        `;
        document.body.appendChild(this.hoverEl);

        // Create IntersectionObserver to mute videos when out of view
        this.visibilityObserver = new IntersectionObserver(
            (entries) => this.handleVisibilityChange(entries),
            { threshold: 0.1 } // Trigger when less than 10% visible
        );

        // Bind events
        $.on(document, 'mouseover', e => this.handleHover(e));
        $.on(document, 'mouseout', e => this.handleOut(e));
        $.on(document, 'mousemove', e => this.handleMove(e));
        $.on(document, 'click', e => this.handleClick(e));

        // Start preloading if enabled
        if (Conf['Video Prefetching']) {
            this.startPreloading();
        }

        // Replace thumbnails with video previews
        if (Conf['Video Thumbnail Preview']) {
            this.setupThumbnailPreviews();
        }

        // Observe any existing video elements on the page for visibility-based muting
        this.observeExistingVideos();
    },

    observeExistingVideos() {
        if (!this.visibilityObserver) return;

        // Find all video elements (native 4chan, expanded, embedded direct videos)
        $.qsa('video').forEach(video => {
            // Skip our hover preview element
            if (video.id === 'xcl-video-hover') return;
            this.visibilityObserver.observe(video);
        });

        // Also observe for dynamically added videos
        const videoObserver = new MutationObserver(mutations => {
            mutations.forEach(mutation => {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType !== 1) return;

                    // Check if the node itself is a video
                    if (node.tagName === 'VIDEO' && node.id !== 'xcl-video-hover') {
                        this.visibilityObserver.observe(node);
                    }

                    // Check for video descendants
                    if (node.querySelectorAll) {
                        node.querySelectorAll('video').forEach(video => {
                            if (video.id !== 'xcl-video-hover') {
                                this.visibilityObserver.observe(video);
                            }
                        });
                    }
                });
            });
        });

        videoObserver.observe(document.body, { childList: true, subtree: true });
    },

    setupThumbnailPreviews() {
        // Find all video thumbnails and add hover preview
        $.qsa('.fileThumb').forEach(thumb => {
            const link = thumb.closest('a');
            if (!link) return;

            const href = link.href;
            if (!href.match(/\.(webm|mp4)$/i)) return;

            // Add indicator that this is a video
            const indicator = $.el('span', {
                className: 'xcl-video-indicator',
                textContent: '▶'
            });
            indicator.style.cssText = `
                position: absolute;
                bottom: 4px;
                right: 4px;
                background: rgba(0,0,0,0.7);
                color: white;
                padding: 2px 6px;
                border-radius: 3px;
                font-size: 10px;
                pointer-events: none;
            `;

            const container = thumb.parentElement;
            if (container && getComputedStyle(container).position === 'static') {
                container.style.position = 'relative';
            }
            thumb.parentElement?.appendChild(indicator);
        });
    },

    startPreloading() {
        // Collect all video links
        $.qsa('.fileThumb[href$=".webm"], .fileThumb[href$=".mp4"], a[href*=".4cdn.org"][href$=".webm"], a[href*=".4cdn.org"][href$=".mp4"]').forEach(link => {
            const url = link.href;
            if (!this.cache.has(url)) {
                this.preloadQueue.push(url);
            }
        });

        this.processPreloadQueue();
    },

    processPreloadQueue() {
        if (this.preloading || this.preloadQueue.length === 0) return;

        this.preloading = true;
        const url = this.preloadQueue.shift();

        // Create a video element to preload
        const video = document.createElement('video');
        video.preload = 'metadata'; // Just preload metadata for faster initial display

        video.onloadedmetadata = () => {
            this.cache.set(url, {
                duration: video.duration,
                width: video.videoWidth,
                height: video.videoHeight,
                preloaded: true
            });
            this.preloading = false;

            // Continue with next in queue
            setTimeout(() => this.processPreloadQueue(), 100);
        };

        video.onerror = () => {
            this.preloading = false;
            setTimeout(() => this.processPreloadQueue(), 100);
        };

        video.src = url;
    },

    isVideoLink(el) {
        const link = el.closest('a[href$=".webm"], a[href$=".mp4"]');
        if (!link) return null;
        if (!link.href.includes('.4cdn.org') && !link.href.includes('.4chan.org')) return null;
        return link;
    },

    handleHover(e) {
        if (!Conf['Video Hover']) return;

        const link = this.isVideoLink(e.target);
        if (!link) return;

        // Don't show hover popup if video is already expanded inline
        if (link.classList.contains('xcl-video-expanded')) return;

        this.currentLink = link;
        this.hoverEl.src = link.href;
        this.hoverEl.volume = Conf['Default Volume'] || 0.5;
        this.hoverEl.muted = !Conf['Video Hover Sound'];
        this.hoverEl.style.display = 'block';
        this.hoverEl.play().catch(() => {});

        this.handleMove(e);
    },

    handleOut(e) {
        if (!this.currentLink) return;

        const related = e.relatedTarget;
        if (related && (related === this.hoverEl || related.closest('a') === this.currentLink)) {
            return;
        }

        this.hoverEl.style.display = 'none';
        this.hoverEl.pause();
        this.hoverEl.src = '';
        this.currentLink = null;
    },

    handleMove(e) {
        if (this.hoverEl.style.display === 'none') return;

        const margin = 20;
        let x = e.clientX + margin;
        let y = e.clientY + margin;

        const rect = this.hoverEl.getBoundingClientRect();
        if (x + rect.width > window.innerWidth) {
            x = e.clientX - rect.width - margin;
        }
        if (y + rect.height > window.innerHeight) {
            y = Math.max(margin, window.innerHeight - rect.height - margin);
        }

        this.hoverEl.style.left = x + 'px';
        this.hoverEl.style.top = y + 'px';
    },

    handleClick(e) {
        if (!Conf['Video Expansion']) return;

        const link = this.isVideoLink(e.target);
        if (!link) return;

        // Don't expand if clicking the filename
        if (e.target.closest('.fileText')) return;

        e.preventDefault();

        const thumb = $.qs('img', link);
        if (!thumb) return;

        // Check if already expanded
        const existing = link.querySelector('.xcl-expanded-video');
        if (existing) {
            // Unobserve before removing
            this.unobserveVideo(existing);
            existing.remove();
            thumb.style.display = '';
            link.classList.remove('xcl-video-expanded');
            return;
        }

        // Create expanded video
        const video = $.el('video', {
            className: 'xcl-expanded-video',
            src: link.href,
            controls: Conf['Show Controls'],
            autoplay: Conf['Autoplay'],
            loop: true
        });

        video.volume = Conf['Default Volume'] || 0.5;

        // Style based on fit settings
        const maxWidth = Conf['Fit Width'] ? '100%' : 'none';
        const maxHeight = Conf['Fit Height'] ? `${window.innerHeight - 100}px` : 'none';

        video.style.cssText = `
            max-width: ${maxWidth};
            max-height: ${maxHeight};
            display: block;
        `;

        thumb.style.display = 'none';
        link.appendChild(video);
        link.classList.add('xcl-video-expanded');

        // Observe video for visibility changes (mute when scrolled out of view)
        if (this.visibilityObserver) {
            this.visibilityObserver.observe(video);
        }

        // Scroll into view if needed
        video.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    },

    handleVisibilityChange(entries) {
        entries.forEach(entry => {
            const video = entry.target;
            if (!video || video.tagName !== 'VIDEO') return;

            if (!entry.isIntersecting) {
                // Video scrolled out of view - mute it
                video.muted = true;
            }
            // Note: We don't auto-unmute when back in view to avoid jarring audio
        });
    },

    // Unobserve video when collapsed
    unobserveVideo(video) {
        if (this.visibilityObserver && video) {
            this.visibilityObserver.unobserve(video);
        }
    }
};

// ============================================================================
// QUICK REPLY
// ============================================================================

const QuickReply = {
    el: null,
    isMinimized: false,
    dragOffset: { x: 0, y: 0 },

    init() {
        if (!Conf['Quick Reply']) return;

        this.createUI();
        this.bindEvents();

        // Add reply button handlers
        $.qsa('a[href*="#q"]').forEach(link => {
            $.on(link, 'click', e => {
                e.preventDefault();
                const postId = link.href.match(/#q(\d+)/)?.[1];
                if (postId) this.quote(postId);
            });
        });
    },

    createUI() {
        this.el = $.el('div', { id: 'xcl-qr' });
        this.el.innerHTML = `
            <div id="xcl-qr-header">
                <span id="xcl-qr-title">Quick Reply</span>
                <div id="xcl-qr-controls">
                    <button id="xcl-qr-minimize" title="Minimize">−</button>
                    <button id="xcl-qr-close" title="Close">×</button>
                </div>
            </div>
            <form id="xcl-qr-form">
                <input type="text" name="name" placeholder="Name" ${Conf['Remember Name'] ? '' : ''}>
                <input type="text" name="sub" placeholder="Subject">
                <input type="text" name="email" placeholder="Options (sage)">
                <textarea name="com" placeholder="Comment"></textarea>
                <div id="xcl-qr-file-row">
                    <input type="file" id="xcl-qr-file-input" name="upfile" accept="image/*,video/webm,video/mp4,.pdf">
                    <div id="xcl-qr-file-preview"></div>
                </div>
                <div id="xcl-qr-options">
                    <label><input type="checkbox" name="spoiler"> Spoiler</label>
                </div>
                <button type="submit" id="xcl-qr-submit">Post</button>
            </form>
        `;

        if (!Conf['Persistent QR']) {
            this.el.style.display = 'none';
        }

        document.body.appendChild(this.el);

        // Apply QR style settings
        this.applyStyles();
    },

    applyStyles() {
        if (!this.el) return;

        const autohideStyle = Conf['QR Autohide Style'] || 'normal';
        const transparent = Conf['Transparent QR'];
        const noBackground = Conf['QR Remove Background'];

        // Remove existing QR style classes
        this.el.classList.remove('xcl-qr-autohide-fade', 'xcl-qr-autohide-vertical', 'xcl-qr-transparent', 'xcl-qr-no-bg');

        // Apply autohide style
        if (autohideStyle === 'fade') this.el.classList.add('xcl-qr-autohide-fade');
        else if (autohideStyle === 'vertical') this.el.classList.add('xcl-qr-autohide-vertical');

        // Apply transparency
        if (transparent) this.el.classList.add('xcl-qr-transparent');
        if (noBackground) this.el.classList.add('xcl-qr-no-bg');
    },

    bindEvents() {
        // Minimize
        $.on($.qs('#xcl-qr-minimize'), 'click', () => this.toggleMinimize());

        // Close
        $.on($.qs('#xcl-qr-close'), 'click', () => this.close());

        // Drag
        const header = $.qs('#xcl-qr-header');
        $.on(header, 'mousedown', e => this.startDrag(e));

        // File preview
        $.on($.qs('#xcl-qr-file-input'), 'change', e => this.previewFile(e));

        // Submit
        $.on($.qs('#xcl-qr-form'), 'submit', e => this.submit(e));

        // Keyboard shortcut
        $.on(document, 'keydown', e => {
            if (e.key === 'q' && !e.target.matches('input, textarea')) {
                e.preventDefault();
                this.open();
            }
        });
    },

    open(quoteId = null) {
        this.el.style.display = 'block';
        this.el.classList.remove('minimized');

        if (quoteId) {
            this.quote(quoteId);
        }

        $.qs('#xcl-qr-form textarea').focus();
    },

    close() {
        if (Conf['Auto Hide QR']) {
            this.el.style.display = 'none';
        } else {
            this.toggleMinimize();
        }
    },

    toggleMinimize() {
        this.isMinimized = !this.isMinimized;
        this.el.classList.toggle('minimized', this.isMinimized);
        $.qs('#xcl-qr-minimize').textContent = this.isMinimized ? '+' : '−';
    },

    quote(postId) {
        this.open();
        const textarea = $.qs('#xcl-qr-form textarea');
        const quote = `>>${postId}\n`;

        // Insert at cursor or append
        const start = textarea.selectionStart;
        const before = textarea.value.slice(0, start);
        const after = textarea.value.slice(textarea.selectionEnd);
        textarea.value = before + quote + after;
        textarea.selectionStart = textarea.selectionEnd = start + quote.length;
        textarea.focus();
    },

    previewFile(e) {
        const file = e.target.files[0];
        const preview = $.qs('#xcl-qr-file-preview');

        if (!file) {
            preview.innerHTML = '';
            return;
        }

        if (file.type.startsWith('image/')) {
            const img = $.el('img');
            img.src = URL.createObjectURL(file);
            preview.innerHTML = '';
            preview.appendChild(img);
        } else {
            preview.innerHTML = `<span style="font-size:10px;color:var(--xcl-text-muted)">${file.name.slice(0, 10)}...</span>`;
        }
    },

    startDrag(e) {
        if (e.target.tagName === 'BUTTON') return;

        const rect = this.el.getBoundingClientRect();
        this.dragOffset = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };

        const onMove = (e) => {
            this.el.style.right = 'auto';
            this.el.style.bottom = 'auto';
            this.el.style.left = (e.clientX - this.dragOffset.x) + 'px';
            this.el.style.top = (e.clientY - this.dragOffset.y) + 'px';
        };

        const onUp = () => {
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
        };

        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
    },

    async submit(e) {
        e.preventDefault();

        const form = e.target;
        const submitBtn = $.qs('#xcl-qr-submit');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Posting...';

        try {
            // Build form data
            const formData = new FormData(form);
            formData.append('mode', 'regist');
            formData.append('resto', g.THREAD || '0');

            // This would need CORS handling via GM_xmlhttpRequest
            // For now, just show what would be posted
            Toast.show('QR submits via native form. Use the built-in form for now.', 'warning');

        } catch (err) {
            Toast.show('Post failed: ' + err.message, 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Post';
        }
    }
};

// ============================================================================
// BOARD NAVIGATION
// ============================================================================

const BoardNav = {
    init() {
        if (!Conf['Board Nav Shortcuts']) return;

        const favorites = (Conf['Favorite Boards'] || 'g,pol,v,a').split(',').map(b => b.trim());

        const nav = $.el('div', { id: 'xcl-board-nav' });

        // Home link
        nav.innerHTML = `<a href="/" title="Home">🏠</a><span class="separator">|</span>`;

        // Favorite boards - link to catalog
        favorites.forEach(board => {
            const link = $.el('a', {
                href: `/${board}/catalog`,
                textContent: `/${board}/`
            });
            if (g.BOARD === board) {
                link.classList.add('current');
            }
            nav.appendChild(link);
        });

        // Catalog link for current board
        if (g.BOARD) {
            nav.innerHTML += `
                <span class="separator">|</span>
                <a href="/${g.BOARD}/catalog">[Catalog]</a>
            `;
        }

        document.body.appendChild(nav);
        document.body.style.paddingTop = '40px';
    }
};

// ============================================================================
// CATALOG CONTROLS (Search & Sort)
// ============================================================================

const CatalogControls = {
    threads: [],
    originalOrder: [],
    isExpanded: false,

    init() {
        if (g.VIEW !== 'catalog') return;
        if (!Conf['Catalog Search']) return;

        this.collectThreads();
        this.createUI();
        this.bindEvents();
    },

    collectThreads() {
        this.threads = $.qsa('.thread').map(el => ({
            el,
            subject: $.qs('.subject', el)?.textContent || '',
            comment: $.qs('.comment', el)?.textContent || '',
            replies: parseInt($.qs('.meta .r', el)?.textContent) || 0,
            images: parseInt($.qs('.meta .i', el)?.textContent) || 0,
            page: parseInt(el.closest('[data-page]')?.dataset.page) || 0
        }));
        this.originalOrder = [...this.threads];
    },

    createUI() {
        // Add toggle button to header bar
        const headerBar = $.qs('#xcl-header-bar');
        if (headerBar) {
            const toggleBtn = $.el('button', {
                id: 'xcl-catalog-toggle',
                title: 'Search & Sort Catalog'
            });
            toggleBtn.textContent = '🔍 Search';
            headerBar.insertBefore(toggleBtn, headerBar.firstChild.nextSibling);
        }

        // Create collapsible panel
        const controls = $.el('div', { id: 'xcl-catalog-controls', className: 'collapsed' });
        controls.innerHTML = `
            <div id="xcl-catalog-header">
                <span>Catalog Search & Sort</span>
                <button id="xcl-catalog-close">×</button>
            </div>
            <input type="text" id="xcl-catalog-search" placeholder="Search threads...">
            <div id="xcl-catalog-sort">
                <button data-sort="bump" class="active">Bump</button>
                <button data-sort="replies">Replies</button>
                <button data-sort="images">Images</button>
                <button data-sort="new">Newest</button>
            </div>
        `;
        document.body.appendChild(controls);
    },

    bindEvents() {
        // Toggle button
        const toggleBtn = $.qs('#xcl-catalog-toggle');
        if (toggleBtn) {
            $.on(toggleBtn, 'click', () => this.toggle());
        }

        // Close button
        $.on($.qs('#xcl-catalog-close'), 'click', () => this.collapse());

        // Search
        $.on($.qs('#xcl-catalog-search'), 'input', e => this.search(e.target.value));

        // Sort buttons
        $.qsa('#xcl-catalog-sort button').forEach(btn => {
            $.on(btn, 'click', () => {
                $.qsa('#xcl-catalog-sort button').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.sort(btn.dataset.sort);
            });
        });
    },

    toggle() {
        this.isExpanded = !this.isExpanded;
        $.qs('#xcl-catalog-controls').classList.toggle('collapsed', !this.isExpanded);
        if (this.isExpanded) {
            $.qs('#xcl-catalog-search').focus();
        }
    },

    collapse() {
        this.isExpanded = false;
        $.qs('#xcl-catalog-controls').classList.add('collapsed');
    },

    search(query) {
        query = query.toLowerCase();

        this.threads.forEach(t => {
            const matches = !query ||
                t.subject.toLowerCase().includes(query) ||
                t.comment.toLowerCase().includes(query);
            t.el.style.display = matches ? '' : 'none';
        });
    },

    sort(type) {
        const container = $.qs('#threads, .threads, .board');
        if (!container) return;

        let sorted;
        switch (type) {
            case 'replies':
                sorted = [...this.threads].sort((a, b) => b.replies - a.replies);
                break;
            case 'images':
                sorted = [...this.threads].sort((a, b) => b.images - a.images);
                break;
            case 'new':
                sorted = [...this.threads].reverse();
                break;
            case 'bump':
            default:
                sorted = [...this.originalOrder];
        }

        sorted.forEach(t => container.appendChild(t.el));

        Conf['Catalog Sort'] = type;
        $.set('config', Conf);
    }
};

// ============================================================================
// INFINITE SCROLL
// ============================================================================

const InfiniteScroll = {
    page: 1,
    loading: false,
    maxPages: 10,

    init() {
        if (!Conf['Infinite Scroll']) return;
        if (g.VIEW !== 'index') return;

        this.createLoader();
        this.bindScroll();
    },

    createLoader() {
        this.loader = $.el('div', {
            id: 'xcl-infinite-loader',
            textContent: 'Scroll for more...'
        });

        const board = $.qs('.board');
        if (board) {
            board.appendChild(this.loader);
        }
    },

    bindScroll() {
        let ticking = false;

        $.on(window, 'scroll', () => {
            if (!ticking) {
                requestAnimationFrame(() => {
                    this.checkScroll();
                    ticking = false;
                });
                ticking = true;
            }
        });
    },

    checkScroll() {
        if (this.loading || this.page >= this.maxPages) return;

        const rect = this.loader.getBoundingClientRect();
        if (rect.top < window.innerHeight + 500) {
            this.loadMore();
        }
    },

    async loadMore() {
        this.loading = true;
        this.loader.classList.add('loading');
        this.loader.textContent = 'Loading';

        try {
            this.page++;
            const url = `/${g.BOARD}/${this.page}`;

            const response = await fetch(url);
            if (!response.ok) throw new Error('Failed to load');

            const html = await response.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');

            const threads = doc.querySelectorAll('.thread');
            if (threads.length === 0) {
                this.loader.textContent = 'No more threads';
                this.page = this.maxPages; // Stop loading
                return;
            }

            const board = $.qs('.board');
            threads.forEach(thread => {
                board.insertBefore(thread, this.loader);
            });

            // Re-process new content
            ColorIDs.processAll();
            Filter.processAll();

            this.loader.textContent = 'Scroll for more...';

        } catch (err) {
            this.loader.textContent = 'Failed to load';
            this.page--; // Allow retry
        } finally {
            this.loading = false;
            this.loader.classList.remove('loading');
        }
    }
};

// ============================================================================
// MEDIA EMBEDDING
// ============================================================================

const Embedding = {
    patterns: {
        youtube: /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
        streamable: /streamable\.com\/([a-zA-Z0-9]+)/,
        vocaroo: /(?:vocaroo\.com|voca\.ro)\/([a-zA-Z0-9]+)/,
        soundcloud: /soundcloud\.com\/([^\s]+)/,
        twitter: /(?:twitter\.com|x\.com)\/\w+\/status\/(\d+)/,
        imgur: /imgur\.com\/(?:a\/|gallery\/)?([a-zA-Z0-9]+)/,
        catbox: /(?:catbox\.moe|files\.catbox\.moe)\/([^\s]+)/,
        gfycat: /(?:gfycat\.com|redgifs\.com)\/(?:watch\/)?([a-zA-Z]+)/,
        coub: /coub\.com\/(?:view|embed)\/([a-zA-Z0-9]+)/,
        tiktok: /tiktok\.com\/@[\w.]+\/video\/(\d+)/,
        spotify: /open\.spotify\.com\/(track|album|playlist)\/([a-zA-Z0-9]+)/
    },

    init() {
        if (!Conf['Embedding']) return;

        this.processAll();

        // Observe for new posts
        const observer = new MutationObserver(() => this.processAll());
        const board = $.qs('.board, .thread');
        if (board) {
            observer.observe(board, { childList: true, subtree: true });
        }
    },

    processAll() {
        $.qsa('.postMessage a:not(.xcl-embed-processed)').forEach(link => {
            link.classList.add('xcl-embed-processed');
            this.processLink(link);
        });
    },

    processPost(postEl) {
        if (!postEl) return;
        $.qsa('.postMessage a:not(.xcl-embed-processed)', postEl).forEach(link => {
            link.classList.add('xcl-embed-processed');
            this.processLink(link);
        });
    },

    processLink(link) {
        const url = link.href;

        for (const [type, pattern] of Object.entries(this.patterns)) {
            const match = url.match(pattern);
            if (match && Conf[`Embed ${type.charAt(0).toUpperCase() + type.slice(1)}`] !== false) {
                this.createEmbed(link, type, match);
                break;
            }
        }
    },

    createEmbed(link, type, match) {
        const toggle = $.el('span', {
            className: 'xcl-embed-toggle',
            textContent: Conf['Auto-embed'] ? '[−]' : '[+]'
        });

        $.on(toggle, 'click', () => {
            const container = link.parentNode.querySelector('.xcl-embed-container');
            if (container) {
                const visible = container.style.display !== 'none';
                container.style.display = visible ? 'none' : 'block';
                toggle.textContent = visible ? '[+]' : '[−]';
            } else {
                this.insertEmbed(link, type, match);
                toggle.textContent = '[−]';
            }
        });

        link.parentNode.insertBefore(toggle, link.nextSibling);

        if (Conf['Auto-embed']) {
            this.insertEmbed(link, type, match);
        }
    },

    insertEmbed(link, type, match) {
        // Remove existing embed
        const existing = link.parentNode.querySelector('.xcl-embed-container');
        if (existing) existing.remove();

        const container = $.el('div', {
            className: `xcl-embed-container ${type}`
        });

        let embedHtml = '';

        switch (type) {
            case 'youtube':
                embedHtml = `<iframe src="https://www.youtube.com/embed/${match[1]}?autoplay=${Conf['Autoplay'] ? 1 : 0}" allowfullscreen></iframe>`;
                break;
            case 'streamable':
                embedHtml = `<iframe src="https://streamable.com/e/${match[1]}" allowfullscreen></iframe>`;
                break;
            case 'vocaroo':
                embedHtml = `<iframe src="https://vocaroo.com/embed/${match[1]}" frameborder="0"></iframe>`;
                break;
            case 'soundcloud':
                embedHtml = `<iframe src="https://w.soundcloud.com/player/?url=https://soundcloud.com/${match[1]}&color=%2322c55e" scrolling="no"></iframe>`;
                break;
            case 'twitter':
                embedHtml = `<blockquote class="twitter-tweet"><a href="${link.href}">Loading tweet...</a></blockquote>`;
                // Load Twitter widget
                if (!window.twttr) {
                    const script = $.el('script', { src: 'https://platform.twitter.com/widgets.js' });
                    document.head.appendChild(script);
                } else {
                    setTimeout(() => window.twttr?.widgets?.load(), 100);
                }
                break;
            case 'imgur':
                embedHtml = `<a href="${link.href}" target="_blank"><img src="https://i.imgur.com/${match[1]}.jpg" style="max-width:100%;max-height:400px"></a>`;
                break;
            case 'catbox':
                const catUrl = match[1].includes('.') ? `https://files.catbox.moe/${match[1]}` : link.href;
                if (catUrl.match(/\.(webm|mp4)$/i)) {
                    embedHtml = `<video src="${catUrl}" controls ${Conf['Autoplay'] ? 'autoplay' : ''} loop style="max-width:100%"></video>`;
                } else if (catUrl.match(/\.(jpg|jpeg|png|gif|webp|avif|jfif|jxl)$/i)) {
                    embedHtml = `<img src="${catUrl}" style="max-width:100%;max-height:400px">`;
                } else {
                    embedHtml = `<a href="${catUrl}" target="_blank" class="xcl-embed-link">📁 ${match[1]}</a>`;
                }
                break;
            case 'gfycat':
                const isRedgifs = link.href.includes('redgifs');
                const gfyDomain = isRedgifs ? 'redgifs.com' : 'gfycat.com';
                embedHtml = `<iframe src="https://${gfyDomain}/ifr/${match[1]}" allowfullscreen></iframe>`;
                break;
            case 'coub':
                embedHtml = `<iframe src="https://coub.com/embed/${match[1]}?muted=false&autostart=${Conf['Autoplay']}&originalSize=false" allowfullscreen></iframe>`;
                break;
            case 'tiktok':
                embedHtml = `<blockquote class="tiktok-embed" data-video-id="${match[1]}"><a href="${link.href}">View on TikTok</a></blockquote>`;
                break;
            case 'spotify':
                embedHtml = `<iframe src="https://open.spotify.com/embed/${match[1]}/${match[2]}" allowfullscreen allow="encrypted-media"></iframe>`;
                break;
        }

        container.innerHTML = embedHtml;
        link.parentNode.insertBefore(container, link.nextSibling.nextSibling);
    }
};

// ============================================================================
// DOWNLOAD MANAGER
// ============================================================================

const DownloadManager = {
    init() {
        if (!Conf['Original Filename Download']) return;

        this.addDownloadButtons();
        // Batch button is now in the header bar
    },

    addDownloadButtons() {
        $.qsa('.fileText').forEach(fileText => {
            if (fileText.querySelector('.xcl-download-btn')) return;

            const link = $.qs('a', fileText);
            if (!link) return;

            // Get original filename
            const titleLink = $.qs('a[title]', fileText) || $.qs('a', fileText);
            const originalName = titleLink?.title || titleLink?.textContent || 'file';

            const btn = $.el('a', {
                className: 'xcl-download-btn',
                href: link.href,
                download: this.sanitizeFilename(originalName),
                title: 'Download with original filename'
            });
            btn.textContent = '⬇';

            fileText.appendChild(btn);
        });
    },

    sanitizeFilename(name) {
        return name.replace(/[<>:"/\\|?*]/g, '_');
    },

    async batchDownload() {
        const files = $.qsa('.fileText a[href*=".4cdn.org"]').map(link => {
            const titleLink = link.closest('.fileText')?.querySelector('a[title]') || link;
            return {
                url: link.href,
                name: this.sanitizeFilename(titleLink.title || titleLink.textContent || 'file')
            };
        });

        if (files.length === 0) {
            Toast.show('No files found', 'warning');
            return;
        }

        Toast.show(`Downloading ${files.length} files...`, 'info');

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            try {
                const a = $.el('a', {
                    href: file.url,
                    download: file.name
                });
                a.click();

                // Delay between downloads
                await new Promise(r => setTimeout(r, 500));
            } catch (err) {
                console.error('Download failed:', file.name, err);
            }
        }

        Toast.show(`Downloaded ${files.length} files`, 'success');
    }
};

// ============================================================================
// GIF REPLACEMENT
// ============================================================================

const GifReplace = {
    init() {
        if (!Conf['Replace GIF']) return;

        $.qsa('.fileThumb[href$=".gif"]').forEach(link => {
            // Check if there's a webm version (some boards have this)
            const webmUrl = link.href.replace(/\.gif$/, '.webm');

            // Add indicator that this could be replaced
            const indicator = $.el('span', {
                className: 'xcl-gif-indicator',
                textContent: 'GIF',
                style: 'position:absolute;top:2px;left:2px;background:#ff5722;color:#fff;padding:1px 4px;font-size:9px;border-radius:2px;'
            });

            const container = link.closest('.file');
            if (container) {
                container.style.position = 'relative';
                container.appendChild(indicator);
            }
        });
    }
};

// ============================================================================
// APPEARANCE CONTROLS
// ============================================================================

// ============================================================================
// THEME SYSTEM
// ============================================================================

const Theme = {
    init() {
        // Apply saved theme
        this.apply(Conf['Theme'] || 'dark');
        this.applyCleanup();
    },

    apply(theme) {
        // Remove old theme
        document.documentElement.removeAttribute('data-theme');

        // Apply new theme
        if (theme && theme !== 'dark') {
            document.documentElement.setAttribute('data-theme', theme);
        }

        // Save
        Conf['Theme'] = theme;
    },

    applyCleanup() {
        // Site cleanup classes - per-element visibility
        document.body.classList.toggle('xcl-hide-ads', Conf['Hide Ads'] !== false);
        document.body.classList.toggle('xcl-hide-blotter', Conf['Hide Blotter'] !== false);
        document.body.classList.toggle('xcl-hide-banner', Conf['Hide Board Banner'] === true);
        document.body.classList.toggle('xcl-hide-board-title', Conf['Hide Board Title'] === true);
        document.body.classList.toggle('xcl-hide-footer', Conf['Hide Footer'] !== false);
        document.body.classList.toggle('xcl-hide-stickies', Conf['Hide Sticky Threads'] === true);
        document.body.classList.toggle('xcl-hide-post-form', Conf['Hide Post Form'] === true);
        document.body.classList.toggle('xcl-hide-rules', Conf['Hide Rules'] !== false);
        document.body.classList.toggle('xcl-hide-nav-top', Conf['Hide Nav Links Top'] === true);
        document.body.classList.toggle('xcl-hide-nav-bottom', Conf['Hide Nav Links Bottom'] !== false);
        document.body.classList.toggle('xcl-hide-checkboxes', Conf['Show Checkboxes'] !== true);
        document.body.classList.toggle('xcl-modernize', Conf['Modernize Interface'] !== false);
    }
};

// ============================================================================
// APPEARANCE CONTROLS
// ============================================================================

const Appearance = {
    init() {
        // Apply settings
        this.applyPostWidth();
        this.applyThumbnailSize();
        this.applyCompactMode();
        this.applyHideSidebar();
        this.applyPostHoverHighlight();
        this.applyMargins();
        this.applySidebar();
        this.applyCustomBackground();
        this.applyQRStyle();
    },

    applyPostWidth() {
        const width = Conf['Post Width'] || 'auto';
        document.body.classList.remove('xcl-post-width-narrow', 'xcl-post-width-medium', 'xcl-post-width-wide', 'xcl-post-width-full');
        if (width !== 'auto') {
            document.body.classList.add(`xcl-post-width-${width}`);
        }
    },

    applyThumbnailSize() {
        const size = Conf['Thumbnail Size'] || 'medium';
        document.body.classList.remove('xcl-thumb-small', 'xcl-thumb-medium', 'xcl-thumb-large');
        document.body.classList.add(`xcl-thumb-${size}`);
    },

    applyCompactMode() {
        document.body.classList.toggle('xcl-compact', Conf['Compact Mode']);
    },

    applyHideSidebar() {
        document.body.classList.toggle('xcl-hide-sidebar', Conf['Hide Sidebar']);
    },

    applyPostHoverHighlight() {
        document.body.classList.toggle('xcl-hover-highlight-enabled', Conf['Post Hover Highlight']);
    },

    applyMargins() {
        const leftMargin = Conf['Left Margin'] || 5;
        const rightMargin = Conf['Right Margin'] || 5;

        // Remove existing margin classes
        document.body.classList.remove(
            'xcl-margin-left-none', 'xcl-margin-left-small', 'xcl-margin-left-medium', 'xcl-margin-left-large',
            'xcl-margin-right-none', 'xcl-margin-right-small', 'xcl-margin-right-medium', 'xcl-margin-right-large'
        );

        // Apply left margin
        if (leftMargin == 0) document.body.classList.add('xcl-margin-left-none');
        else if (leftMargin == 5) document.body.classList.add('xcl-margin-left-small');
        else if (leftMargin == 25) document.body.classList.add('xcl-margin-left-medium');
        else if (leftMargin == 65) document.body.classList.add('xcl-margin-left-large');

        // Apply right margin
        if (rightMargin == 0) document.body.classList.add('xcl-margin-right-none');
        else if (rightMargin == 5) document.body.classList.add('xcl-margin-right-small');
        else if (rightMargin == 25) document.body.classList.add('xcl-margin-right-medium');
        else if (rightMargin == 65) document.body.classList.add('xcl-margin-right-large');
    },

    applySidebar() {
        const position = Conf['Sidebar Position'] || 'right';
        const minimal = Conf['Minimal Sidebar'];

        document.body.classList.remove('xcl-sidebar-left', 'xcl-sidebar-disabled', 'xcl-minimal-sidebar');

        if (position === 'left') document.body.classList.add('xcl-sidebar-left');
        else if (position === 'disabled') document.body.classList.add('xcl-sidebar-disabled');

        if (minimal) document.body.classList.add('xcl-minimal-sidebar');
    },

    applyCustomBackground() {
        const url = Conf['Custom Background URL'];

        if (url && url.trim()) {
            document.body.classList.add('xcl-custom-bg');
            document.body.style.setProperty('--xcl-custom-bg-url', `url("${url}")`);
            document.body.style.setProperty('--xcl-custom-bg-position', Conf['Background Position'] || 'center');
            document.body.style.setProperty('--xcl-custom-bg-repeat', Conf['Background Repeat'] || 'no-repeat');
            document.body.style.setProperty('--xcl-custom-bg-attachment', Conf['Background Attachment'] || 'fixed');
            document.body.style.setProperty('--xcl-custom-bg-size', Conf['Background Size'] || 'cover');
        } else {
            document.body.classList.remove('xcl-custom-bg');
            document.body.style.removeProperty('--xcl-custom-bg-url');
        }
    },

    applyQRStyle() {
        // Use QuickReply's applyStyles if available
        if (typeof QuickReply !== 'undefined' && QuickReply.el) {
            QuickReply.applyStyles();
        }
    }
};

// ============================================================================
// QUOTE BACKLINKS
// ============================================================================

const QuoteBacklinks = {
    init() {
        if (!Conf['Quote Backlinks']) return;

        this.processAll();

        // Observe for new posts
        const observer = new MutationObserver(() => this.processAll());
        const board = $.qs('.board, .thread');
        if (board) {
            observer.observe(board, { childList: true, subtree: true });
        }
    },

    processAll() {
        $.qsa('.postMessage .quotelink:not(.xcl-backlink-processed)').forEach(link => {
            link.classList.add('xcl-backlink-processed');

            const match = link.hash.match(/#p(\d+)/);
            if (!match) return;

            const quotedId = match[1];
            const quotedPost = $.qs(`#p${quotedId}, #pc${quotedId}`);
            if (!quotedPost) return;

            // Get the post that contains this quote link
            const quotingPost = link.closest('.post');
            if (!quotingPost) return;

            const quotingId = quotingPost.id.replace(/^pc?/, '');

            // Add backlink to the quoted post
            this.addBacklink(quotedPost, quotingId);
        });
    },

    addBacklink(post, quotingId) {
        let container = $.qs('.xcl-backlinks', post);
        if (!container) {
            container = $.el('span', { className: 'xcl-backlinks' });
            const postInfo = $.qs('.postInfo, .post-info', post);
            if (postInfo) {
                postInfo.appendChild(container);
            }
        }

        // Check if backlink already exists
        if ($.qs(`a[href="#p${quotingId}"]`, container)) return;

        const backlink = $.el('a', {
            className: 'quotelink xcl-backlink',
            href: `#p${quotingId}`,
            textContent: `>>${quotingId}`
        });

        container.appendChild(backlink);
    }
};

// ============================================================================
// QUOTE INLINING
// ============================================================================

const QuoteInlining = {
    init() {
        if (!Conf['Quote Inlining']) return;

        $.on(document, 'click', e => this.handleClick(e));
    },

    handleClick(e) {
        const link = e.target.closest('a.quotelink, a.xcl-backlink');
        if (!link) return;

        const match = link.hash.match(/#p(\d+)/);
        if (!match) return;

        e.preventDefault();

        const postId = match[1];

        // Check if already inlined - toggle off
        const existingInline = link.parentNode.querySelector(`.xcl-inline[data-id="${postId}"]`);
        if (existingInline) {
            existingInline.remove();
            link.classList.remove('xcl-inlined');
            return;
        }

        const post = $.qs(`#p${postId}, #pc${postId}`);
        if (!post) return;

        // Create inline container
        const inline = $.el('div', {
            className: 'xcl-inline',
            'data-id': postId
        });

        const clone = post.cloneNode(true);
        clone.id = '';
        clone.classList.add('xcl-inline-post');
        inline.appendChild(clone);

        // Insert after the link
        link.parentNode.insertBefore(inline, link.nextSibling);
        link.classList.add('xcl-inlined');
    }
};

// ============================================================================
// LAST READ POST
// ============================================================================

const LastReadPost = {
    storageKey: null,
    lastReadId: null,

    init() {
        if (!Conf['Remember Last Read']) return;
        if (g.VIEW !== 'thread') return;

        this.storageKey = `lastRead_${g.BOARD}_${g.THREAD}`;
        this.lastReadId = localStorage.getItem(this.storageKey);

        // Show last read marker
        if (this.lastReadId && Conf['Scroll to Last Read']) {
            this.scrollToLastRead();
        }

        this.markLastRead();

        // Update on scroll
        let scrollTimeout;
        $.on(window, 'scroll', () => {
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(() => this.updateLastRead(), 500);
        });
    },

    scrollToLastRead() {
        const post = $.qs(`#p${this.lastReadId}, #pc${this.lastReadId}`);
        if (post) {
            // Add marker line
            this.addMarkerLine(post);

            // Scroll to post
            setTimeout(() => {
                post.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 100);
        }
    },

    addMarkerLine(post) {
        // Remove any existing marker
        $.qs('.xcl-last-read-marker')?.remove();

        const marker = $.el('div', { className: 'xcl-last-read-marker' });
        marker.innerHTML = `<span>Last read position</span>`;

        const container = post.closest('.postContainer') || post;
        container.parentNode.insertBefore(marker, container);
    },

    markLastRead() {
        // Mark the current last read post
        if (this.lastReadId) {
            const post = $.qs(`#p${this.lastReadId}, #pc${this.lastReadId}`);
            if (post) {
                post.classList.add('xcl-last-read');
            }
        }
    },

    updateLastRead() {
        // Find the last visible post
        const posts = $.qsa('.post.reply');
        let lastVisible = null;

        for (const post of posts) {
            const rect = post.getBoundingClientRect();
            if (rect.top < window.innerHeight && rect.bottom > 0) {
                lastVisible = post;
            }
        }

        if (lastVisible) {
            const newId = lastVisible.id.replace(/^pc?/, '');
            if (newId !== this.lastReadId) {
                this.lastReadId = newId;
                localStorage.setItem(this.storageKey, newId);
            }
        }
    }
};

// ============================================================================
// QUOTE PREVIEW
// ============================================================================

const QuotePreview = {
    el: null,
    currentQuote: null,

    init() {
        if (!Conf['Quote Previewing']) return;

        $.on(document, 'mouseover', e => this.show(e));
        $.on(document, 'mouseout', e => this.hide(e));
    },

    show(e) {
        const link = e.target.closest('a.quotelink');
        if (!link) return;

        const match = link.hash.match(/#p(\d+)/);
        if (!match) return;

        const postId = match[1];
        const post = $.qs(`#p${postId}, #pc${postId}`);
        if (!post) return;

        this.currentQuote = link;

        if (!this.el) {
            this.el = $.el('div', { id: 'xcl-preview' });
            document.body.appendChild(this.el);
        }

        const clone = post.cloneNode(true);
        clone.id = '';
        clone.style.margin = '0';

        this.el.innerHTML = '';
        this.el.appendChild(clone);
        this.el.style.display = 'block';

        this.position(e);
    },

    hide(e) {
        if (!this.el) return;

        const related = e.relatedTarget;
        if (related && (related.closest('#xcl-preview') || related === this.currentQuote)) {
            return;
        }

        this.el.style.display = 'none';
        this.currentQuote = null;
    },

    position(e) {
        if (!this.el) return;

        const margin = 15;
        const rect = this.el.getBoundingClientRect();

        let x = e.clientX + margin;
        let y = e.clientY + margin;

        if (x + rect.width > window.innerWidth) {
            x = e.clientX - rect.width - margin;
        }
        if (y + rect.height > window.innerHeight) {
            y = Math.max(margin, window.innerHeight - rect.height - margin);
        }

        this.el.style.left = x + 'px';
        this.el.style.top = y + 'px';
    }
};

// ============================================================================
// THREAD UPDATER
// ============================================================================

const ThreadUpdater = {
    el: null,
    timer: null,
    lastModified: null,
    unreadCount: 0,
    originalTitle: null,

    init() {
        if (!Conf['Thread Updater']) return;
        if (g.VIEW !== 'thread') return;

        this.originalTitle = document.title;
        this.createUI();

        if (Conf['Auto Update']) {
            this.start();
        }
    },

    createUI() {
        this.el = $.el('div', { id: 'xcl-updater' });
        this.el.innerHTML = `
            <span id="xcl-updater-status">Ready</span>
            <button id="xcl-updater-btn">Update</button>
        `;
        document.body.appendChild(this.el);

        $.on($.qs('#xcl-updater-btn'), 'click', () => this.update());
    },

    start() {
        if (this.timer) return;
        this.timer = setInterval(() => this.update(), (Conf['Update Interval'] || 30) * 1000);
    },

    stop() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    },

    async update() {
        const status = $.qs('#xcl-updater-status');
        status.textContent = 'Updating...';

        try {
            const url = location.href.replace(/#.*$/, '') + '.json';
            const response = await fetch(url, {
                headers: this.lastModified ? { 'If-Modified-Since': this.lastModified } : {}
            });

            if (response.status === 304) {
                status.textContent = 'No new posts';
                return;
            }

            if (!response.ok) {
                throw new Error(response.statusText);
            }

            this.lastModified = response.headers.get('Last-Modified');
            const data = await response.json();

            const newPosts = this.processNewPosts(data.posts);

            if (newPosts > 0) {
                status.textContent = `+${newPosts} new`;
                this.unreadCount += newPosts;
                this.updateTitle();

                if (Conf['Desktop Notifications']) {
                    this.notify(newPosts);
                }
            } else {
                status.textContent = 'Up to date';
            }

        } catch (e) {
            status.textContent = 'Error';
            console.error('Thread update failed:', e);
        }
    },

    processNewPosts(posts) {
        const thread = $.qs('.thread');
        if (!thread) return 0;

        const existingIds = new Set(
            $.qsa('.post', thread).map(p => p.id.replace(/^(pc|p)/, ''))
        );

        let newCount = 0;

        posts.forEach(post => {
            if (existingIds.has(String(post.no))) return;

            try {
                const postEl = this.buildPost(post);
                if (postEl) {
                    thread.appendChild(postEl);
                    newCount++;

                    // Process new post through active modules
                    if (Conf['Color User IDs']) ColorIDs.process($.qs('.posteruid', postEl));
                    if (Conf['Quote Backlinks']) QuoteBacklinks.processAll();
                    if (Conf['Filter Enabled']) Filter.processPost?.(postEl);
                    if (Conf['Embedding']) Embedding.processPost?.(postEl);
                }
            } catch(e) {
                console.error('4chan X Lite: Failed to build post', post.no, e);
                newCount++;
            }
        });

        return newCount;
    },

    buildPost(post) {
        const container = $.el('div', {
            className: 'postContainer replyContainer',
            id: `pc${post.no}`
        });

        const board = g.BOARD;
        const hasFile = post.tim && post.ext;
        const dateStr = new Date(post.time * 1000).toLocaleString();
        const name = E(post.name || 'Anonymous');
        const sub = post.sub ? `<span class="subject">${E(post.sub)}</span> ` : '';
        const trip = post.trip ? ` <span class="postertrip">${E(post.trip)}</span>` : '';
        const userId = post.id ? ` <span class="posteruid id_${post.id}">(ID: <span class="hand" title="Highlight posts by this ID">${E(post.id)}</span>)</span>` : '';
        const flag = post.country ? ` <span title="${E(post.country_name || '')}" class="flag flag-${post.country.toLowerCase()}"></span>` : '';
        const capcode = post.capcode ? ` <strong class="capcode hand id_${post.capcode}">## ${E(post.capcode)}</strong>` : '';

        let fileHtml = '';
        if (hasFile) {
            const ext = post.ext;
            const thumbUrl = `https://i.4cdn.org/${board}/${post.tim}s.jpg`;
            const fullUrl = `https://i.4cdn.org/${board}/${post.tim}${ext}`;
            const filename = post.filename ? E(post.filename + ext) : `${post.tim}${ext}`;
            const fsize = post.fsize > 1048576 ? (post.fsize / 1048576).toFixed(2) + ' MB' :
                          post.fsize > 1024 ? (post.fsize / 1024).toFixed(0) + ' KB' :
                          post.fsize + ' B';

            fileHtml = `
                <div class="file" id="f${post.no}">
                    <div class="fileText" id="fT${post.no}">
                        File: <a href="${fullUrl}" target="_blank">${filename}</a> (${fsize}, ${post.w}x${post.h})
                    </div>
                    <a class="fileThumb" href="${fullUrl}" target="_blank">
                        <img src="${thumbUrl}" alt="${post.tn_w}x${post.tn_h}" style="height:${post.tn_h}px;width:${post.tn_w}px;">
                    </a>
                </div>`;
        }

        const comment = post.com || '';

        container.innerHTML = `
            <div class="sideArrows" id="sa${post.no}">&gt;&gt;</div>
            <div id="p${post.no}" class="post reply">
                <div class="postInfoM mobile" id="pim${post.no}"></div>
                <div class="postInfo desktop" id="pi${post.no}">
                    <input type="checkbox" name="${post.no}" value="delete">
                    ${sub}<span class="nameBlock">
                        <span class="name">${name}</span>${trip}${capcode}${userId}${flag}
                    </span>
                    <span class="dateTime" data-utc="${post.time}">${dateStr}</span>
                    <span class="postNum desktop">
                        <a href="/${board}/thread/${g.THREAD}#p${post.no}" title="Link to this post">No.</a>
                        <a href="/${board}/thread/${g.THREAD}#p${post.no}" title="Reply to this post">${post.no}</a>
                    </span>
                </div>
                ${fileHtml}
                <blockquote class="postMessage" id="m${post.no}">${comment}</blockquote>
            </div>
        `;

        return container;
    },

    updateTitle() {
        if (Conf['Unread Count'] && this.unreadCount > 0) {
            document.title = `(${this.unreadCount}) ${this.originalTitle}`;
        } else {
            document.title = this.originalTitle;
        }
    },

    notify(count) {
        if (Notification.permission === 'granted') {
            new Notification('4chan X Lite', {
                body: `${count} new post${count > 1 ? 's' : ''} in thread`,
                icon: 'https://s.4cdn.org/image/favicon.ico'
            });
        }
    }
};

// ============================================================================
// FILTERING
// ============================================================================

// ============================================================================
// FILTER PRESETS
// ============================================================================

const FilterPresets = {
    // Quality Control Presets
    spam: {
        title: 'Spam & Ads',
        description: 'Common spam patterns, cryptocurrency scams, advertising',
        comment: [
            '/\\b(telegram|whatsapp|discord\\.gg|t\\.me|bit\\.ly|tinyurl)\\b/i',
            '/\\b(join|add|contact)\\s+(me|us)\\s+(on|at|via)\\b/i',
            '/\\b(make|earn|get)\\s+\\$?\\d+[kK]?\\+?\\s*(per|a|every)?\\s*(day|week|month|hour)?/i',
            '/\\b(investment|crypto|bitcoin|ethereum|nft|airdrop|giveaway)\\s*(opportunity|chance|offer)?/i',
            '/\\b(check|visit)\\s+(my|our|the)\\s+(bio|profile|link|channel)/i',
            '/\\bfree\\s+(money|crypto|bitcoin|gift|giveaway)/i',
            '/\\b(dm|pm|message)\\s+(me|us)\\s+(for|now)/i',
            '/\\b(work\\s+from\\s+home|passive\\s+income|financial\\s+freedom)/i',
            '/\\b1000x\\b|\\b100x\\b|\\bpump\\b.*\\bdump\\b/i',
            '/\\b(legit|legitimate)\\s+(site|website|platform|opportunity)/i',
            '/\\bclick\\s+(here|this|the\\s+link)/i',
            '/\\b(nigger|faggot|kike|tranny).*\\b(buy|sell|invest|join)/i'
        ],
        subject: [
            '/\\$\\$\\$|💰|🚀.*moon/i',
            '/\\b(crypto|bitcoin|nft|airdrop)\\s*(opportunity|giveaway)?/i'
        ]
    },

    loweffort: {
        title: 'Low Effort',
        description: 'Single word replies, reaction-only posts, low-quality bait',
        comment: [
            '/^(this|based|cringe|cope|seethe|dilate|sneed|kek|lol|lmao|bump|sage|>>/i',
            '/^.{0,15}$/m',
            '/^(fake|gay|real|true|false|yes|no|wrong|right|bad|good)\\s*$/i',
            '/^>\\w+\\n*$/m',
            '/^(first|kek|checked|witnessed|nice|noice|based|redpilled)$/i',
            '/^(idk|tbh|desu|senpai|baka|kys|neck yourself)\\s*$/i',
            '/^\\s*(\\.|\\?|!|\\.\\.\\.|lol|lmao|rofl|xd)\\s*$/i'
        ]
    },

    bots: {
        title: 'Bot Posts',
        description: 'AI-generated content, copy-paste templates, bot signatures',
        comment: [
            '/\\bAs an AI\\b|\\bI cannot|\\bI apologize,? but\\b/i',
            '/\\bGenerated by\\b|\\bPowered by\\b.*\\bAI\\b/i',
            '/\\[automated (message|post|reply)\\]/i',
            '/(ChatGPT|GPT-4|Claude|Gemini|Copilot)\\s*(says?|wrote|generated)/i',
            '/\\bI\'m (just )?an AI\\b/i',
            '/\\bDelve\\b.*\\bdelve\\b/i',
            '/^(?:(?!\\n).)*\\bdelve\\b(?:(?!\\n).)*$/im',
            '/\\bIt\'s important to note that\\b/i',
            '/\\bI don\'t have personal (opinions|feelings|experiences)\\b/i'
        ]
    },

    mobile: {
        title: 'Mobile Posters',
        description: 'Mobile filename patterns indicating phone posts',
        filename: [
            '/^IMG_\\d{4,}/i',
            '/^DSC_\\d{4,}/i',
            '/^Screenshot_\\d{4,}/i',
            '/^Photo_\\d+/i',
            '/^PXL_\\d{8}/i',
            '/^DCIM/i',
            '/^\\d{13,}\\.jpg$/i'
        ]
    },

    // Content Type Presets
    wojak: {
        title: 'Wojak/Pepe',
        description: 'Filter wojak and pepe variant images and discussions',
        filename: [
            '/wojak/i',
            '/soyjak/i',
            '/soijak/i',
            '/\\bsoy\\b/i',
            '/\\bjak\\b/i',
            '/pepe/i',
            '/apu/i',
            '/\\bfrog\\b/i',
            '/smug.*frog/i',
            '/feelsbadman/i',
            '/feelsgoodman/i',
            '/basedjak/i',
            '/chudjak/i',
            '/gigachad/i',
            '/chad.*vs.*virgin/i',
            '/nordic.*gamer/i',
            '/poljak/i',
            '/npc.*meme/i',
            '/\\bzoomer\\b/i',
            '/\\bboomer\\b/i',
            '/\\bdoomer\\b/i',
            '/\\bbloomer\\b/i',
            '/\\bgloomer\\b/i'
        ],
        comment: [
            '/>.*jak$/im',
            '/\\bseethe\\b.*\\bcope\\b|\\bcope\\b.*\\bseethe\\b/i',
            '/\\brent.?free\\b/i'
        ]
    },

    greentext: {
        title: 'Greentext Stories',
        description: 'Filter greentext story threads',
        subject: [
            '/^>/m',
            '/\\bgreentext\\b/i',
            '/\\bgt\\b.*thread/i',
            '/\\bbe me\\b/i'
        ],
        comment: [
            '/^>be me\\n>be/im',
            '/^(>.*\\n){5,}/m'
        ]
    },

    avatarfags: {
        title: 'Avatarfags',
        description: 'Users who consistently post with the same images',
        comment: [
            '/\\b(avatar|avatarfag)\\b/i',
            '/\\balways post(s|ing)?\\s+(this|same|with)/i'
        ],
        name: [
            '/^(?!Anonymous).{1,20}$/i'
        ]
    },

    generals: {
        title: 'Generals',
        description: 'Hide recurring general threads',
        subject: [
            '/\\/\\w{1,6}g\\//i',
            '/general$/i',
            '/general thread/i',
            '/edition$/i',
            '/bread$/i',
            '/#\\d+/i'
        ]
    },

    // Astroturfing Presets
    shill: {
        title: 'Shilling',
        description: 'Product shilling, viral marketing, astroturfing patterns',
        comment: [
            '/\\bjust (bought|ordered|got|received)\\b.*\\b(mine|my|one)\\b/i',
            '/\\byou (should|need to|have to|gotta)\\s+(buy|get|try|check out)/i',
            '/\\bbest\\s+\\w+\\s+I\'ve\\s+ever\\s+(used|bought|had|owned)/i',
            '/\\blife.?changing\\b/i',
            '/\\bgame.?changer\\b/i',
            '/\\bhighly\\s+recommend\\b/i',
            '/\\b(shill|shilling|shilled|paid\\s+ad)\\b/i',
            '/\\b(not\\s+sponsored|not\\s+an?\\s+ad)\\b/i',
            '/\\bunironically\\s+(the\\s+)?best\\b/i',
            '/\\bI\\s+work\\s+(for|at)\\b.*\\bbut\\b/i',
            '/\\b(trust\\s+me|believe\\s+me)\\b.*\\bbuy\\b/i'
        ]
    },

    political: {
        title: 'Political Bait',
        description: 'Political derailment, election content, partisan spam',
        comment: [
            '/\\b(vote|voting)\\s+(for|against)\\s+\\w+/i',
            '/\\b(democrat|republican|liberal|conservative)s?\\s+(are|is|always|never)/i',
            '/\\b(maga|brandon|drumpf|libtard|conservatard|leftist|rightoid)/i',
            '/\\b(red|blue)\\s+state/i',
            '/\\b(own|destroy)(ing|ed)?\\s+the\\s+(libs|cons)/i',
            '/\\bTDS\\b|\\btrump\\s+derangement/i',
            '/\\bwoke\\s+(mind\\s+virus|mob|cult|ideology)/i',
            '/\\b(far|alt|extreme)\\s*-?\\s*(left|right)/i',
            '/\\b(commie|marxist|fascist|nazi)s?\\s+(are|is)/i',
            '/\\bpolitical\\s+compass/i',
            '/\\bauth(left|right|center)/i',
            '/\\blib(left|right|center)/i'
        ],
        subject: [
            '/\\b(trump|biden|election|vote|politic)/i'
        ]
    },

    ragebait: {
        title: 'Rage Bait',
        description: 'Inflammatory posts designed to provoke anger',
        comment: [
            '/\\bwhy\\s+(do|are|is)\\s+\\w+\\s+(so|always|never)/i',
            '/\\b(imagine|imagine being)\\s+(still|actually|unironically)/i',
            '/\\b(you|anons?)\\s+(will|can)\\s+never/i',
            '/\\bsimple\\s+as\\b/i',
            '/\\bstay\\s+(mad|poor|coping|seething)/i',
            '/\\bhave\\s+sex\\b|\\btouch\\s+grass\\b/i',
            '/\\bincel(s)?\\b.*\\b(cope|seethe|mad)/i',
            '/\\b(women|men|boomers|zoomers|millennials)\\s+(are\\s+)?ruined/i',
            '/\\b(hate|hating)\\s+(to|this)/i',
            '/\\bpic\\s+related/i',
            '/\\bprove\\s+me\\s+wrong\\b/i',
            '/\\bhard\\s+mode/i',
            '/\\bpro\\s*tip/i',
            '/\\byou\\s+(literally\\s+)?can(no|\')?t\\b/i'
        ],
        subject: [
            '/\\b(hate|cringe|wojak|btfo|rekt)\\b/i',
            '/\\bwhy\\s+(do|are|is)/i'
        ]
    },

    discord: {
        title: 'Discord Raids',
        description: 'Coordinated raid patterns from Discord servers',
        comment: [
            '/\\b(raid|raiding)\\s+(this|the)\\s+(thread|board)/i',
            '/\\bdiscord\\s*(raid|army|gang)/i',
            '/\\b(bump|sage)\\s+(this\\s+)?thread/i',
            '/\\bfrom\\s+(reddit|discord|twitter|tumblr)/i',
            '/\\bjannies\\b.*\\bdo\\s+(it|your\\s+job)/i',
            '/\\b(reddit|discord)fag/i',
            '/\\bgo\\s+back\\b/i',
            '/\\b(we|they)\\s+are\\s+(legion|anonymous)/i'
        ]
    },

    // Region Filters
    memeflags: {
        title: 'Meme Flags',
        description: 'Filter meme/novelty flags on boards that support them',
        flag: [
            'troll',
            'memeflag',
            'anarcho',
            'commie',
            'nazi',
            'ancap',
            'gadsden',
            'confederate',
            'kekistan',
            'templar',
            'pirate',
            'lgbt',
            'trans',
            'black-lives',
            'antifa',
            'proud-boys',
            'anonymous'
        ]
    },

    nonwestern: {
        title: 'Non-Western',
        description: 'Filter common VPN exit points and non-Western countries',
        flag: [
            'flag-in',
            'flag-br',
            'flag-ph',
            'flag-id',
            'flag-my',
            'flag-pk',
            'flag-bd',
            'flag-ng',
            'flag-ke',
            'flag-za',
            'flag-eg',
            'flag-ar',
            'flag-mx',
            'flag-co',
            'flag-pe',
            'flag-ve',
            'flag-tr',
            'flag-ru',
            'flag-ua'
        ]
    },

    proxies: {
        title: 'VPN/Proxy',
        description: 'Common VPN and proxy exit countries',
        flag: [
            'flag-ro',
            'flag-md',
            'flag-bg',
            'flag-pa',
            'flag-hn',
            'flag-lu',
            'flag-li',
            'flag-mc',
            'flag-ad',
            'flag-sm',
            'flag-va',
            'flag-sg',
            'flag-hk'
        ]
    },

    // File Filters
    knownspam: {
        title: 'Known Spam Images',
        description: 'MD5 hashes of known spam images (add your own)',
        md5: [
            '# Add known spam image MD5s here',
            '# Format: base64 encoded MD5 hash'
        ]
    },

    screenshots: {
        title: 'Screenshots',
        description: 'Filter screenshot images from phones/desktops',
        filename: [
            '/^Screenshot/i',
            '/^Screen Shot/i',
            '/^Capture/i',
            '/^Bildschirmfoto/i',
            '/^Captura/i',
            '/^Schermata/i',
            '/^Zrzut ekranu/i',
            '/\\.png$.*\\d{10,}/i'
        ]
    },

    reaction: {
        title: 'Reaction Images',
        description: 'Common reaction image filenames',
        filename: [
            '/reaction/i',
            '/smug/i',
            '/angry/i',
            '/happy/i',
            '/sad/i',
            '/mfw/i',
            '/tfw/i',
            '/mrw/i',
            '/yfw/i',
            '/face/i',
            '/\\bfw\\b/i'
        ]
    },

    // Cleanup Presets
    namefags: {
        title: 'Namefags',
        description: 'Hide posts from users with custom names',
        name: [
            '/^(?!Anonymous$).+$/i'
        ]
    },

    tripfags: {
        title: 'Tripfags',
        description: 'Hide posts from users with tripcodes',
        trip: [
            '/^!/i',
            '/^!!/i'
        ]
    },

    newfags: {
        title: 'Newfag Tells',
        description: 'Reddit spacing, emoji usage, newfag behavior',
        comment: [
            '/\\n\\n(?=\\S)/g',
            '/[😀-🙏🌀-🗿🚀-🛿🇦-🇿]+/u',
            '/\\bReddit\\b/i',
            '/\\br\\/\\w+/i',
            '/\\bupvote|downvote\\b/i',
            '/\\bOP\\s+(is|here)\\b/i',
            '/\\bEdit:\\s/i',
            '/\\bSource:\\s+Trust me/i',
            '/\\b(thanks for the gold|kind stranger)\\b/i',
            '/\\bTIL\\b.*\\bTIL\\b/i'
        ]
    },

    copypasta: {
        title: 'Copypasta',
        description: 'Famous copypastas and repeated content',
        comment: [
            '/\\bNavy Seal\\b.*\\bgorilla warfare\\b/i',
            '/\\bI sexually identify\\b/i',
            '/\\btop of my class\\b.*\\bconfirmed kills\\b/i',
            '/\\bnothing personnel\\b/i',
            '/\\bwhile you were\\b.*\\bI studied\\b/i',
            '/\\bRick\\s+and\\s+Morty\\b.*\\bIQ\\b/i',
            '/\\b(18|naked|cowboys)\\b.*\\bRam\\s+Ranch\\b/i',
            '/\\bin this moment\\b.*\\beuphoric\\b/i',
            '/\\bgentlemen.*scholar\\b/i',
            '/\\bbased\\s+and\\s+\\w+pilled\\b/i'
        ]
    },

    // Highlight presets (these go to Highlight Filters, not Comment Filters)
    happenings: {
        title: 'Breaking News / Happenings',
        description: 'Highlight breaking news, shootings, terror events, wars',
        highlight: [
            '/happening/i',
            '/breaking/i',
            '/shooting/i',
            '/terror/i',
            '/isis/i',
            '/war\\b/i',
            '/ww3/i',
            '/wwiii/i',
            '/imminent/i',
            '/invasion/i',
            '/nuclear/i',
            '/attack/i',
            '/emergency/i',
            '/evacuat/i',
            '/explosion/i',
            '/casualties/i',
            '/confirmed\\s+(dead|killed)/i'
        ]
    },

    quality: {
        title: 'Quality Posts',
        description: 'Highlight effortful and informative content',
        highlight: [
            '/\\bsource:\\s*http/i',
            '/\\bproof:\\s/i',
            '/\\bcitation/i',
            '/\\bpeer.?review/i',
            '/\\bstud(y|ies)\\s+show/i',
            '/\\baccording\\s+to/i',
            '/\\bresearch\\s+(shows|indicates|suggests)/i',
            '/\\bdata\\s+(shows|indicates|suggests)/i',
            '/\\bOC\\b/i',
            '/\\boriginal\\s+content/i',
            '/\\bI\\s+(work|worked)\\s+(at|for|in)/i',
            '/\\bAMA\\b/i',
            '/\\bin\\s+my\\s+experience/i'
        ]
    },

    nsfw: {
        title: 'NSFW Content',
        description: 'Highlight adult content keywords',
        highlight: [
            '/milf/i',
            '/cougar/i',
            '/mature/i',
            '/gilf/i',
            '/\\bnsfw\\b/i',
            '/\\blewd\\b/i',
            '/\\bnude/i',
            '/\\bporn/i',
            '/\\bxxx\\b/i',
            '/\\bhentai/i',
            '/\\becchi/i'
        ]
    },

    // Recommended combined preset
    recommended: {
        title: 'Recommended',
        description: 'Balanced set of filters for improved browsing',
        presets: ['spam', 'bots', 'loweffort', 'ragebait', 'discord']
    },

    // Helper to get all filters from a preset
    getFilters(presetId) {
        const preset = this[presetId];
        if (!preset) return null;

        // Handle combined presets
        if (preset.presets) {
            const combined = { comment: [], subject: [], name: [], trip: [], flag: [], filename: [], md5: [], highlight: [] };
            preset.presets.forEach(p => {
                const subPreset = this.getFilters(p);
                if (subPreset) {
                    Object.keys(subPreset).forEach(key => {
                        if (combined[key] && subPreset[key]) {
                            combined[key] = [...combined[key], ...subPreset[key]];
                        }
                    });
                }
            });
            return combined;
        }

        return {
            comment: preset.comment || [],
            subject: preset.subject || [],
            name: preset.name || [],
            trip: preset.trip || [],
            flag: preset.flag || [],
            filename: preset.filename || [],
            md5: preset.md5 || [],
            highlight: preset.highlight || []
        };
    },

    // Apply preset to current filters
    applyPreset(presetId) {
        const filters = this.getFilters(presetId);
        if (!filters) return false;

        // Append to existing filters
        const append = (setting, newFilters) => {
            if (!newFilters || !Array.isArray(newFilters) || newFilters.length === 0) return;

            const current = (Conf[setting] || '').trim();
            const currentLines = current ? current.split('\n').map(l => l.trim()).filter(l => l) : [];
            const newLines = newFilters.filter(f => f && !currentLines.includes(f));
            if (newLines.length > 0) {
                Conf[setting] = current ? current + '\n' + newLines.join('\n') : newLines.join('\n');
            }
        };

        append('Comment Filters', filters.comment);
        append('Subject Filters', filters.subject);
        append('Name Filters', filters.name);
        append('Tripcode Filters', filters.trip);
        append('Flag Filters', filters.flag);
        append('Filename Filters', filters.filename);
        append('MD5 Filters', filters.md5);
        append('Highlight Filters', filters.highlight);

        return true;
    }
};

// ============================================================================
// POST FILTERING
// ============================================================================

const Filter = {
    md5Filters: [],
    nameFilters: [],
    tripFilters: [],
    commentFilters: [],
    subjectFilters: [],
    filenameFilters: [],
    flagFilters: [],
    highlightFilters: [],
    initialized: false,

    init() {
        this.parseFilters();

        // Always process even if filtering is "disabled" - we still want highlighting
        const hasFilters = this.highlightFilters.length > 0 ||
            (Conf['Filter Enabled'] && (
                this.commentFilters.length > 0 ||
                this.nameFilters.length > 0 ||
                this.subjectFilters.length > 0 ||
                this.filenameFilters.length > 0 ||
                this.flagFilters.length > 0 ||
                this.md5Filters.length > 0
            ));

        if (!hasFilters) {
            console.log('[4chan X Lite] No filters configured');
            return;
        }

        console.log('[4chan X Lite] Filters loaded:', {
            highlight: this.highlightFilters.length,
            comment: this.commentFilters.length,
            subject: this.subjectFilters.length,
            name: this.nameFilters.length,
            filename: this.filenameFilters.length,
            flag: this.flagFilters.length,
            md5: this.md5Filters.length
        });

        this.isProcessing = false;
        this.sortRetries = 0;
        this.observer = null;
        this.processTimeout = null;

        // Try to process immediately
        this.tryProcess();

        // Also set up observer on document.body to catch dynamic content
        this.setupObserver();

        // Retry a few times with delays in case content loads slowly
        setTimeout(() => this.tryProcess(), 500);
        setTimeout(() => this.tryProcess(), 1500);
        setTimeout(() => this.tryProcess(), 3000);
    },

    tryProcess() {
        // Prevent re-entry
        if (this.isProcessing) return;

        const posts = document.querySelectorAll('.post, .postContainer');
        const threads = document.querySelectorAll('.thread, [class*="catalog"]');

        if (posts.length > 0 || threads.length > 0) {
            this.processAll();
        }
    },

    setupObserver() {
        // Watch the entire document body for changes
        this.observer = new MutationObserver((mutations) => {
            // Skip if we're currently processing (prevents infinite loop)
            if (this.isProcessing) return;

            let shouldProcess = false;

            mutations.forEach(m => {
                m.addedNodes.forEach(node => {
                    if (node.nodeType === 1) {
                        // Skip nodes that have already been processed (they're just being moved)
                        if (node.dataset?.xclProcessed || node.dataset?.xclHighlighted) return;

                        // Check if any relevant elements were added
                        if (node.classList?.contains('post') ||
                            node.classList?.contains('postContainer') ||
                            node.classList?.contains('thread') ||
                            node.id?.startsWith('t') ||
                            node.id?.startsWith('pc') ||
                            node.querySelector?.('.post, .thread')) {
                            shouldProcess = true;
                        }
                    }
                });
            });

            if (shouldProcess) {
                // Debounce - wait 200ms before processing to batch multiple mutations
                if (this.processTimeout) {
                    clearTimeout(this.processTimeout);
                }
                this.processTimeout = setTimeout(() => {
                    this.processAll();
                }, 200);
            }
        });

        // Observe document body
        if (document.body) {
            this.observer.observe(document.body, {
                childList: true,
                subtree: true
            });
        }

        // Also observe when body is available
        if (!document.body) {
            const bodyObserver = new MutationObserver(() => {
                if (document.body) {
                    bodyObserver.disconnect();
                    this.observer.observe(document.body, { childList: true, subtree: true });
                    this.tryProcess();
                }
            });
            bodyObserver.observe(document.documentElement, { childList: true });
        }
    },

    parseFilters() {
        const parseLines = (str) => {
            if (!str) return [];
            return str.split('\n')
                .map(line => line.trim())
                .filter(line => line && !line.startsWith('#'))
                .map(line => {
                    const match = line.match(/^\/(.+)\/([gimsuy]*)$/);
                    if (match) {
                        try {
                            return new RegExp(match[1], match[2]);
                        } catch {
                            return line;
                        }
                    }
                    return line;
                });
        };

        this.md5Filters = parseLines(Conf['MD5 Filters']);
        this.nameFilters = parseLines(Conf['Name Filters']);
        this.tripFilters = parseLines(Conf['Tripcode Filters']);
        this.commentFilters = parseLines(Conf['Comment Filters']);
        this.subjectFilters = parseLines(Conf['Subject Filters']);
        this.filenameFilters = parseLines(Conf['Filename Filters']);
        this.flagFilters = parseLines(Conf['Flag Filters']);
        this.highlightFilters = parseLines(Conf['Highlight Filters']);
    },

    processAll() {
        // Prevent re-entry during processing
        if (this.isProcessing) return;
        this.isProcessing = true;

        try {
            // Process regular thread posts with multiple selectors
            const posts = document.querySelectorAll('.post, .postContainer .post, [id^="p"]:not([id^="pc"])');
            posts.forEach(post => this.processPost(post));

            // Always try catalog processing - use broader selectors
            this.processCatalog();

            // Sort highlighted threads to top if enabled (catalog only)
            // Use a small delay to ensure highlighting is complete
            if (Conf['Sort Highlighted First'] && g.VIEW !== 'thread') {
                setTimeout(() => this.sortHighlightedFirst(), 50);
            }
        } finally {
            // Release lock after a small delay to let DOM settle
            setTimeout(() => {
                this.isProcessing = false;
            }, 100);
        }
    },

    processCatalog() {
        // Don't apply outline highlighting in thread view - only catalog/index
        if (g.VIEW === 'thread') return;

        // Try many different selectors for catalog/thread content
        const threadSelectors = [
            '.thread',
            '.catalog-thread',
            '.catBlock',
            '.catalog-small',
            '.catalog-large',
            '#threads > .thread'
        ];

        let catalogThreads = [];
        for (const sel of threadSelectors) {
            const found = document.querySelectorAll(sel);
            if (found.length > 0) {
                catalogThreads = [...catalogThreads, ...found];
            }
        }

        // Also get threads by ID pattern, but ONLY actual thread divs (not containers)
        document.querySelectorAll('[id^="t"]').forEach(el => {
            // Skip if it's a known container
            if (el.id === 'threads' || el.id === 'thread-container' || el.id === 'top') return;
            // Only include if it looks like a thread (has thread class or is inside #threads)
            if (el.classList.contains('thread') || el.closest('#threads')) {
                catalogThreads.push(el);
            }
        });

        // Deduplicate
        catalogThreads = [...new Set(catalogThreads)];

        let highlightCount = 0;

        catalogThreads.forEach(thread => {
            // Skip if already processed
            if (thread.dataset.xclProcessed) return;

            // Skip containers - they should never be highlighted
            if (thread.id === 'threads' || thread.id === 'thread-container') return;

            // Mark as processed
            thread.dataset.xclProcessed = 'true';

            // Get ALL text content from the thread element
            const allText = thread.textContent || '';

            // Also try specific elements
            const teaser = thread.querySelector('.teaser, .comment, .catBlock, .postMessage')?.textContent || '';
            const subject = thread.querySelector('.subject, .catSubject')?.textContent || '';
            const combined = subject + ' ' + teaser + ' ' + allText;

            if (this.highlightFilters.length > 0 && this.matchesAny(combined, this.highlightFilters)) {
                const color = Conf['Highlight Color'] || '#ffeb3b';

                // Mark as highlighted with data attribute
                thread.dataset.xclHighlighted = 'true';

                // Apply ONLY outline via inline style - safest, won't break layout
                thread.style.outline = `3px solid ${color}`;
                thread.style.outlineOffset = '-3px';

                highlightCount++;
            }
        });

        // Log highlight results
        if (highlightCount > 0) {
            console.log(`[4chan X Lite] Highlighted ${highlightCount} threads`);
        }
    },

    processPost(post) {
        // Always check for highlight first
        if (this.shouldHighlight(post)) {
            this.highlightPost(post);
            return; // Don't hide highlighted posts
        }

        // Only hide if filtering is enabled
        if (Conf['Filter Enabled'] && this.shouldHide(post)) {
            this.hidePost(post);
        }
    },

    sortHighlightedFirst() {
        const container = document.querySelector('#threads, .board');
        if (!container) return;

        // Check if already sorted
        if (container.dataset.xclSorted === 'true') return;

        // Temporarily disconnect observer to prevent infinite loop
        if (this.observer) {
            this.observer.disconnect();
        }

        try {
            // Get all thread elements
            let threads = [...container.querySelectorAll(':scope > .thread')];
            if (threads.length === 0) {
                threads = [...container.querySelectorAll('.thread')];
            }

            if (threads.length === 0) return;

            const highlighted = threads.filter(t => t.dataset.xclHighlighted === 'true');
            const normal = threads.filter(t => t.dataset.xclHighlighted !== 'true');

            // If no highlights found yet, retry up to 5 times
            if (highlighted.length === 0) {
                this.sortRetries++;
                if (this.sortRetries < 5) {
                    console.log(`[4chan X Lite] Sort: No highlights yet, retry ${this.sortRetries}/5...`);
                    setTimeout(() => this.sortHighlightedFirst(), 300);
                } else {
                    console.log(`[4chan X Lite] Sort: No highlights found after 5 retries`);
                    container.dataset.xclSorted = 'true';
                }
                return;
            }

            // Mark container as sorted
            container.dataset.xclSorted = 'true';

            // Use DocumentFragment for efficient DOM manipulation
            const fragment = document.createDocumentFragment();
            [...highlighted, ...normal].forEach(thread => {
                fragment.appendChild(thread);
            });
            container.appendChild(fragment);

            console.log(`[4chan X Lite] Sorted ${highlighted.length} highlighted threads to top`);

        } finally {
            // Reconnect observer after a delay
            setTimeout(() => {
                if (this.observer && document.body) {
                    this.observer.observe(document.body, { childList: true, subtree: true });
                }
            }, 500);
        }
    },

    shouldHighlight(post) {
        if (this.highlightFilters.length === 0) return false;

        const commentEl = $.qs('.postMessage', post);
        if (commentEl && this.matchesAny(commentEl.textContent, this.highlightFilters)) {
            return true;
        }

        const nameEl = $.qs('.name', post);
        if (nameEl && this.matchesAny(nameEl.textContent, this.highlightFilters)) {
            return true;
        }

        const subjectEl = $.qs('.subject', post);
        if (subjectEl && this.matchesAny(subjectEl.textContent, this.highlightFilters)) {
            return true;
        }

        return false;
    },

    highlightPost(post) {
        const color = Conf['Highlight Color'] || '#ffeb3b';
        const bgColor = color + '26'; // Add alpha for background (15%)

        // Apply to the post
        post.classList.add('xcl-filter-highlighted');
        post.style.setProperty('--xcl-filter-highlight-color', color);
        post.style.setProperty('--xcl-filter-highlight-bg', bgColor);

        // Also apply to parent container if exists
        const container = post.closest('.postContainer');
        if (container && container !== post) {
            container.classList.add('xcl-filter-highlighted');
            container.style.setProperty('--xcl-filter-highlight-color', color);
            container.style.setProperty('--xcl-filter-highlight-bg', bgColor);
        }

        // For catalog threads, apply to thread element
        const thread = post.closest('.thread');
        if (thread && g.VIEW === 'catalog') {
            thread.classList.add('xcl-filter-highlighted');
            thread.style.setProperty('--xcl-filter-highlight-color', color);
            thread.style.setProperty('--xcl-filter-highlight-bg', bgColor);
        }

        console.log('[4chan X Lite] Highlighted post:', post.id || 'unknown');
    },

    shouldHide(post) {
        // Check MD5
        const fileText = $.qs('.fileText-original, .fileText', post);
        if (fileText) {
            const md5Link = $.qs('a[href*=".4cdn.org"]', fileText);
            if (md5Link) {
                const md5 = md5Link.getAttribute('data-md5');
                if (md5 && this.matchesAny(md5, this.md5Filters)) {
                    return true;
                }
            }

            // Filename filter
            const filename = $.qs('a[title], a', fileText)?.title || $.qs('a', fileText)?.textContent;
            if (filename && this.matchesAny(filename, this.filenameFilters)) {
                return true;
            }
        }

        // Check name
        const nameEl = $.qs('.name', post);
        if (nameEl && this.matchesAny(nameEl.textContent, this.nameFilters)) {
            return true;
        }

        // Check tripcode
        const tripEl = $.qs('.postertrip', post);
        if (tripEl && this.matchesAny(tripEl.textContent, this.tripFilters)) {
            return true;
        }

        // Check flag
        const flagEl = $.qs('.flag, .countryFlag, .boardFlag', post);
        if (flagEl) {
            const flagTitle = flagEl.title || flagEl.alt || '';
            const flagClass = flagEl.className;
            if (this.matchesAny(flagTitle, this.flagFilters) ||
                this.matchesAny(flagClass, this.flagFilters)) {
                return true;
            }
        }

        // Check comment
        const commentEl = $.qs('.postMessage', post);
        if (commentEl && this.matchesAny(commentEl.textContent, this.commentFilters)) {
            return true;
        }

        // Check subject
        const subjectEl = $.qs('.subject', post);
        if (subjectEl && this.matchesAny(subjectEl.textContent, this.subjectFilters)) {
            return true;
        }

        return false;
    },

    matchesAny(text, filters) {
        return filters.some(filter => {
            if (filter instanceof RegExp) {
                return filter.test(text);
            }
            return text.toLowerCase().includes(filter.toLowerCase());
        });
    },

    hidePost(post) {
        const stubText = Conf['Stub Format'] || 'Post hidden (click to show)';

        if (Conf['Stubs']) {
            const stub = $.el('div', { className: 'xcl-stub' });
            stub.textContent = stubText;
            $.on(stub, 'click', () => {
                post.classList.remove('xcl-hidden');
                stub.remove();
            });
            post.parentNode.insertBefore(stub, post);
        }
        post.classList.add('xcl-hidden');
    },

    // Export in 4chan X Lite JSON format
    exportFilters() {
        const data = {
            format: '4chan-x-lite',
            version: VERSION,
            filters: {
                'MD5 Filters': Conf['MD5 Filters'],
                'Name Filters': Conf['Name Filters'],
                'Tripcode Filters': Conf['Tripcode Filters'],
                'Subject Filters': Conf['Subject Filters'],
                'Comment Filters': Conf['Comment Filters'],
                'Filename Filters': Conf['Filename Filters'],
                'Flag Filters': Conf['Flag Filters'],
                'Highlight Filters': Conf['Highlight Filters'],
                'Highlight Color': Conf['Highlight Color']
            }
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = $.el('a', { href: url, download: `4chanx-lite-filters-${Date.now()}.json` });
        a.click();
        URL.revokeObjectURL(url);

        Toast.show('Filters exported!', 'success');
    },

    // Export in native 4chan X format for compatibility
    export4chanX() {
        const lines = [];

        // Helper to format filter lines
        const addFilters = (filters, type) => {
            if (!filters) return;
            filters.split('\n').filter(f => f.trim()).forEach(f => {
                // If it's already in our format, convert to 4chan X format
                lines.push(`# ${type}`);
                lines.push(f.trim());
            });
        };

        // Add highlight filters with ;highlight suffix
        if (Conf['Highlight Filters']) {
            lines.push('# Highlight Filters');
            Conf['Highlight Filters'].split('\n').filter(f => f.trim()).forEach(f => {
                lines.push(f.trim() + ';boards:all;highlight');
            });
        }

        addFilters(Conf['Comment Filters'], 'Comment Filters');
        addFilters(Conf['Subject Filters'], 'Subject Filters');
        addFilters(Conf['Name Filters'], 'Name Filters');
        addFilters(Conf['Tripcode Filters'], 'Tripcode Filters');
        addFilters(Conf['Filename Filters'], 'Filename Filters');

        const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = $.el('a', { href: url, download: `4chanx-filters-${Date.now()}.txt` });
        a.click();
        URL.revokeObjectURL(url);

        Toast.show('Exported in 4chan X format!', 'success');
    },

    async importFilters() {
        const input = $.el('input', { type: 'file', accept: '.json,.txt' });

        input.onchange = async () => {
            if (!input.files[0]) return;

            try {
                const text = await input.files[0].text();
                const filename = input.files[0].name.toLowerCase();

                if (filename.endsWith('.json')) {
                    // JSON format (our format or 4chan X settings export)
                    const data = JSON.parse(text);

                    if (data.format === '4chan-x-lite' && data.filters) {
                        // Our format
                        for (const key of Object.keys(data.filters)) {
                            if (Conf.hasOwnProperty(key)) {
                                Conf[key] = data.filters[key];
                            }
                        }
                    } else if (data.Filter) {
                        // 4chan X settings export format
                        this.import4chanXSettings(data);
                    } else {
                        // Legacy or direct filter object
                        for (const key of Object.keys(data)) {
                            if (Conf.hasOwnProperty(key)) {
                                Conf[key] = data[key];
                            }
                        }
                    }
                } else {
                    // Plain text format (native 4chan X filter format)
                    this.import4chanXFilters(text);
                }

                await $.set('config', Conf);
                this.parseFilters();
                this.processAll();

                // Update textareas if settings panel is open
                if (Settings.overlay) {
                    Settings.updateFilterTextareas();
                }

                Toast.show('Filters imported!', 'success');

            } catch (e) {
                console.error('Filter import error:', e);
                Toast.show('Import failed: ' + e.message, 'error');
            }
        };

        input.click();
    },

    // Import from 4chan X settings JSON export
    import4chanXSettings(data) {
        if (!data.Filter) return;

        const filterData = data.Filter;

        // 4chan X stores filters by type
        const typeMapping = {
            'postID': null, // We don't support post ID filters
            'name': 'Name Filters',
            'uniqueID': null, // User ID
            'tripcode': 'Tripcode Filters',
            'capcode': null,
            'pass': null,
            'email': null,
            'subject': 'Subject Filters',
            'comment': 'Comment Filters',
            'flag': 'Flag Filters',
            'filename': 'Filename Filters',
            'dimensions': null,
            'filesize': null,
            'MD5': 'MD5 Filters'
        };

        for (const [type, setting] of Object.entries(typeMapping)) {
            if (setting && filterData[type]) {
                const filters = filterData[type];
                if (typeof filters === 'string' && filters.trim()) {
                    const current = (Conf[setting] || '').trim();
                    const parsed = this.parse4chanXFilterString(filters);

                    // Separate highlight vs hide filters
                    const hideFilters = parsed.filter(f => !f.highlight).map(f => f.pattern);
                    const highlightFilters = parsed.filter(f => f.highlight).map(f => f.pattern);

                    if (hideFilters.length > 0) {
                        Conf[setting] = current ? current + '\n' + hideFilters.join('\n') : hideFilters.join('\n');
                    }
                    if (highlightFilters.length > 0 && setting === 'Comment Filters') {
                        const currentHL = (Conf['Highlight Filters'] || '').trim();
                        Conf['Highlight Filters'] = currentHL ? currentHL + '\n' + highlightFilters.join('\n') : highlightFilters.join('\n');
                    }
                }
            }
        }
    },

    // Import from 4chan X plain text filter format
    import4chanXFilters(text) {
        const lines = text.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'));

        const parsed = this.parse4chanXFilterString(lines.join('\n'));

        const commentFilters = [];
        const highlightFilters = [];

        for (const filter of parsed) {
            if (filter.highlight) {
                highlightFilters.push(filter.pattern);
            } else {
                commentFilters.push(filter.pattern);
            }
        }

        // Append to existing
        if (commentFilters.length > 0) {
            const current = (Conf['Comment Filters'] || '').trim();
            Conf['Comment Filters'] = current ? current + '\n' + commentFilters.join('\n') : commentFilters.join('\n');
        }

        if (highlightFilters.length > 0) {
            const current = (Conf['Highlight Filters'] || '').trim();
            Conf['Highlight Filters'] = current ? current + '\n' + highlightFilters.join('\n') : highlightFilters.join('\n');
        }
    },

    // Parse 4chan X filter format: pattern;option1;option2
    parse4chanXFilterString(text) {
        const results = [];
        const lines = text.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'));

        for (const line of lines) {
            // Split by semicolon to get pattern and options
            const parts = line.split(';');
            let pattern = parts[0].trim();

            // Skip empty patterns
            if (!pattern) continue;

            const options = parts.slice(1).map(o => o.trim().toLowerCase());

            // Check for exclude: prefix in pattern (e.g., "exclude:pol/pattern/i")
            let excludeBoards = [];
            let onlyBoards = [];

            if (pattern.startsWith('exclude:')) {
                const match = pattern.match(/^exclude:([^\/]+)(\/.*)/);
                if (match) {
                    excludeBoards = match[1].split(',').map(b => b.trim());
                    pattern = match[2];
                }
            }

            // Check options for board filters
            for (const opt of options) {
                if (opt.startsWith('only:')) {
                    onlyBoards = opt.slice(5).split(',').map(b => b.trim());
                } else if (opt.startsWith('exclude:')) {
                    excludeBoards = opt.slice(8).split(',').map(b => b.trim());
                }
            }

            // Normalize pattern - ensure it's proper regex format
            if (!pattern.startsWith('/')) {
                // Check if it looks like a regex missing the leading slash (e.g., "pattern/i")
                const maybeRegex = pattern.match(/^(.+)\/([gimsuy]*)$/);
                if (maybeRegex) {
                    // Pattern like "secrets/i" -> "/secrets/i"
                    pattern = '/' + maybeRegex[1] + '/' + maybeRegex[2];
                } else {
                    // Plain text, convert to case-insensitive regex
                    pattern = '/' + pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '/i';
                }
            }

            results.push({
                pattern,
                highlight: options.includes('highlight'),
                top: options.includes('top'),
                stub: options.includes('stub'),
                onlyBoards,
                excludeBoards
            });
        }

        return results;
    },

    // Convert user's 4chan X filters and show in textarea
    convertAndApply4chanXFilters(filterText) {
        const parsed = this.parse4chanXFilterString(filterText);

        const commentFilters = [];
        const highlightFilters = [];

        for (const filter of parsed) {
            if (filter.highlight) {
                highlightFilters.push(filter.pattern);
            } else {
                commentFilters.push(filter.pattern);
            }
        }

        return { commentFilters, highlightFilters };
    }
};

// ============================================================================
// KEYBOARD SHORTCUTS
// ============================================================================

const Keybinds = {
    init() {
        if (!Conf['Keyboard Shortcuts']) return;

        $.on(document, 'keydown', e => this.handle(e));
    },

    handle(e) {
        // Ignore if typing in input
        if (e.target.matches('input, textarea, [contenteditable]')) return;

        const key = e.key.toLowerCase();

        switch (key) {
            case 'g':
                Gallery.open();
                break;
            case 'r':
                ThreadUpdater.update?.();
                break;
            case 'w':
                ThreadWatcher.toggleCurrent?.();
                break;
            case 't':
                QuoteThreading.toggle?.();
                break;
            case 'q':
                QuickReply.open?.();
                break;
            case 'escape':
                Settings.close();
                Gallery.close?.();
                QuickReply.close?.();
                break;
        }
    }
};

// ============================================================================
// GALLERY (Simplified)
// ============================================================================

const Gallery = {
    el: null,
    images: [],
    currentIndex: 0,

    open() {
        if (!Conf['Gallery']) return;
        if (this.el) return;

        this.collectImages();
        if (this.images.length === 0) return;

        this.el = $.el('div', { id: 'xcl-gallery' });
        this.el.innerHTML = `
            <div id="xcl-gallery-header">
                <span id="xcl-gallery-title">Gallery</span>
                <div id="xcl-gallery-controls">
                    <button class="xcl-btn" id="xcl-gallery-close">Close</button>
                </div>
            </div>
            <div id="xcl-gallery-content"></div>
            <button id="xcl-gallery-prev" class="xcl-gallery-nav">&lt;</button>
            <button id="xcl-gallery-next" class="xcl-gallery-nav">&gt;</button>
            <div id="xcl-gallery-thumbs"></div>
        `;

        document.body.appendChild(this.el);
        this.el.classList.add('active');

        // Bind events
        $.on($.qs('#xcl-gallery-close'), 'click', () => this.close());
        $.on($.qs('#xcl-gallery-prev'), 'click', () => this.prev());
        $.on($.qs('#xcl-gallery-next'), 'click', () => this.next());
        $.on(document, 'keydown', this.keyHandler = e => {
            if (e.key === 'ArrowLeft') this.prev();
            if (e.key === 'ArrowRight') this.next();
            if (e.key === 'Escape') this.close();
        });

        this.renderThumbs();
        this.show(0);
    },

    close() {
        if (!this.el) return;
        this.el.classList.remove('active');
        this.el.remove();
        this.el = null;
        this.images = [];
        this.currentIndex = 0;
        if (this.keyHandler) {
            document.removeEventListener('keydown', this.keyHandler);
        }
    },

    collectImages() {
        this.images = $.qsa('.fileThumb, .file a[href*=".4cdn.org"]').map(el => {
            const link = el.closest('a') || el;
            const href = link.href;
            if (!href.match(/\.(jpg|jpeg|png|gif|webp|avif|jfif|jxl|webm|mp4)$/i)) return null;
            const thumb = $.qs('img', el) || el;
            return {
                full: href,
                thumb: thumb.src,
                type: href.match(/\.(webm|mp4)$/i) ? 'video' : 'image'
            };
        }).filter(Boolean);
    },

    renderThumbs() {
        const container = $.qs('#xcl-gallery-thumbs');
        this.images.forEach((img, i) => {
            const thumb = $.el('img', { src: img.thumb });
            $.on(thumb, 'click', () => this.show(i));
            container.appendChild(thumb);
        });
    },

    show(index) {
        this.currentIndex = index;
        const img = this.images[index];
        const content = $.qs('#xcl-gallery-content');

        if (img.type === 'video') {
            content.innerHTML = `<video src="${img.full}" controls autoplay loop></video>`;
        } else {
            content.innerHTML = `<img src="${img.full}">`;
        }

        // Update thumbs
        $.qsa('#xcl-gallery-thumbs img').forEach((t, i) => {
            t.classList.toggle('active', i === index);
        });

        // Update title
        $.qs('#xcl-gallery-title').textContent = `Gallery (${index + 1}/${this.images.length})`;
    },

    prev() {
        const index = this.currentIndex > 0 ? this.currentIndex - 1 : this.images.length - 1;
        this.show(index);
    },

    next() {
        const index = this.currentIndex < this.images.length - 1 ? this.currentIndex + 1 : 0;
        this.show(index);
    }
};

// ============================================================================
// THREAD WATCHER (Simplified)
// ============================================================================

const ThreadWatcher = {
    el: null,
    toggleBtn: null,

    init() {
        if (!Conf['Thread Watcher']) return;
        this.createUI();
        this.createToggleButton();
        this.render();
    },

    createToggleButton() {
        this.toggleBtn = $.el('button', {
            id: 'xcl-watcher-toggle',
            title: 'Toggle Thread Watcher'
        });
        this.toggleBtn.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
        Object.assign(this.toggleBtn.style, {
            position: 'fixed',
            top: '40px',
            right: '10px',
            zIndex: '9995',
            background: 'var(--xcl-bg-secondary)',
            border: '1px solid var(--xcl-border)',
            borderRadius: 'var(--xcl-radius)',
            padding: '6px 10px',
            color: 'var(--xcl-text-secondary)',
            cursor: 'pointer',
            fontSize: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
        });
        document.body.appendChild(this.toggleBtn);
        $.on(this.toggleBtn, 'click', () => this.toggle());

        // Add Watch Thread button in thread view
        if (g.VIEW === 'thread' && g.THREAD) {
            const watchBtn = $.el('button', {
                id: 'xcl-watch-thread-btn',
                title: 'Watch/Unwatch Thread'
            });
            watchBtn.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>`;
            Object.assign(watchBtn.style, {
                position: 'fixed',
                top: '40px',
                right: '50px',
                zIndex: '9995',
                background: Conf.watchedThreads?.[g.THREAD] ? 'var(--xcl-accent-dim)' : 'var(--xcl-bg-secondary)',
                border: `1px solid ${Conf.watchedThreads?.[g.THREAD] ? 'var(--xcl-accent)' : 'var(--xcl-border)'}`,
                borderRadius: 'var(--xcl-radius)',
                padding: '6px 10px',
                color: Conf.watchedThreads?.[g.THREAD] ? 'var(--xcl-accent)' : 'var(--xcl-text-secondary)',
                cursor: 'pointer',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
            });
            document.body.appendChild(watchBtn);
            $.on(watchBtn, 'click', () => {
                this.toggleCurrent();
                const isWatched = Conf.watchedThreads?.[g.THREAD];
                watchBtn.style.background = isWatched ? 'var(--xcl-accent-dim)' : 'var(--xcl-bg-secondary)';
                watchBtn.style.borderColor = isWatched ? 'var(--xcl-accent)' : 'var(--xcl-border)';
                watchBtn.style.color = isWatched ? 'var(--xcl-accent)' : 'var(--xcl-text-secondary)';
            });
        }
    },

    toggle() {
        if (!this.el) return;
        this.el.classList.toggle('visible');
    },

    createUI() {
        this.el = $.el('div', { id: 'xcl-watcher' });
        this.el.innerHTML = `
            <div id="xcl-watcher-header">
                <span id="xcl-watcher-title">Thread Watcher</span>
                <button id="xcl-watcher-close" style="background:none;border:none;color:var(--xcl-text-secondary);cursor:pointer;font-size:16px;">&times;</button>
            </div>
            <div id="xcl-watcher-list"></div>
        `;
        document.body.appendChild(this.el);

        $.on($.qs('#xcl-watcher-close'), 'click', () => {
            this.el.classList.remove('visible');
        });
    },

    render() {
        const list = $.qs('#xcl-watcher-list');
        const threads = Conf.watchedThreads || {};

        if (Object.keys(threads).length === 0) {
            list.innerHTML = '<div style="padding: 12px; color: var(--xcl-text-muted);">No watched threads</div>';
            return;
        }

        list.innerHTML = Object.entries(threads).map(([id, data]) => `
            <div class="xcl-watched-thread" data-id="${id}">
                <a href="${data.url}" target="_blank">${E(data.title || 'Thread ' + id)}</a>
                ${data.unread ? `<span class="unread">${data.unread}</span>` : ''}
                <span class="close" data-id="${id}">&times;</span>
            </div>
        `).join('');

        // Bind remove buttons
        $.qsa('.xcl-watched-thread .close').forEach(btn => {
            $.on(btn, 'click', e => {
                e.preventDefault();
                this.unwatch(btn.dataset.id);
            });
        });
    },

    watch(id, title, url) {
        if (!Conf.watchedThreads) Conf.watchedThreads = {};
        Conf.watchedThreads[id] = { title, url, added: Date.now() };
        $.set('config', Conf);
        this.render();
    },

    unwatch(id) {
        if (Conf.watchedThreads) {
            delete Conf.watchedThreads[id];
            $.set('config', Conf);
            this.render();
        }
    },

    toggleCurrent() {
        if (g.VIEW !== 'thread') return;

        const threadId = g.THREAD;
        if (!threadId) return;

        if (Conf.watchedThreads?.[threadId]) {
            this.unwatch(threadId);
            Toast.show('Thread unwatched', 'success');
        } else {
            const title = $.qs('.subject')?.textContent || $.qs('.postMessage')?.textContent?.slice(0, 50) || 'Thread';
            this.watch(threadId, title, location.href);
            Toast.show('Thread watched!', 'success');
        }
    }
};

// ============================================================================
// INITIALIZATION
// ============================================================================

async function init() {
    // Detect page type
    const path = location.pathname;
    const match = path.match(/\/(\w+)\/(thread\/(\d+)|catalog)?/);

    if (match) {
        g.BOARD = match[1];
        g.THREAD = match[3] || null;
        g.VIEW = match[3] ? 'thread' : (match[2] === 'catalog' ? 'catalog' : 'index');
    }

    // Load config
    const savedConfig = await $.get('config', {});
    Conf = { ...DefaultConfig, ...savedConfig };

    // Inject styles
    const style = $.el('style', { id: 'xcl-styles' });
    style.textContent = CSS;
    document.head.appendChild(style);

    // Wait for DOM
    $.ready(() => {
        // Initialize modules
        Toast.init();
        Settings.init();
        CustomCSS.init();
        Theme.init();
        Appearance.init();
        BoardNav.init();
        ColorIDs.init();
        RelativeTime.init();
        ThreadStats.init();
        BatchDownload.init();
        ImageHover.init();
        VideoHandler.init();
        QuoteBacklinks.init();
        QuoteInlining.init();
        QuotePreview.init();
        QuoteThreading.init();
        LastReadPost.init();
        Filter.init();
        Embedding.init();
        DownloadManager.init();
        GifReplace.init();
        QuickReply.init();
        CatalogControls.init();
        InfiniteScroll.init();
        ThreadUpdater.init();
        ThreadWatcher.init();

        // Mark body as ready (anti-FOUC)
        document.body.classList.add('xcl-ready');

        console.log(`4chan X Lite v${VERSION} initialized`);
    });
}

// Start
init();

})();