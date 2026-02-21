// ==UserScript==
// @name         GLP Enhancement Suite
// @namespace    https://github.com/SysAdminDoc/GLP_Enhancement_Suite
// @version      1.0.0
// @description  Dark-themed forum enhancement for GodlikeProductions — ad nuking, nag bypass, thread/user blocking, collapsible quotes, autopager, declutter, and a premium settings UI.
// @author       SysAdminDoc
// @match        https://www.godlikeproductions.com/*
// @match        https://godlike.com/*
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @run-at       document-start
// @downloadURL  https://github.com/SysAdminDoc/GLP_Enhancement_Suite/raw/refs/heads/main/GLP_Enhancement_Suite.user.js
// @updateURL    https://github.com/SysAdminDoc/GLP_Enhancement_Suite/raw/refs/heads/main/GLP_Enhancement_Suite.user.js
// ==/UserScript==

(function() {
    'use strict';

    const VERSION = '1.0.0';

    // =========================================================================
    //  CONFIGURATION & DEFAULTS
    // =========================================================================
    const DEFAULTS = {
        // Theme
        theme: 'oled-dark',
        // General
        adBlocker: true,
        bypassNag: true,
        bypassClubNag: true,
        autoPager: true,
        sortByNew: false,
        // Content
        collapsibleQuotes: true,
        collapseByDefault: true,
        hideMemeReplies: true,
        hideBoomerGifs: false,
        hideAvatars: false,
        // Blocking
        manualThreadHiding: true,
        hidePinnedThreads: true,
        blockedUsers: '[]',
        hiddenThreads: '[]',
        // Declutter
        minimalistView: true,
        hideBanner: true,
        hideFooter: true,
        hideRelatedThreads: true,
        hideKarmaBar: true,
        hidePostActions: false,
        hideTopNav: true,
        hideThreadNav: false,
        hidePolls: true,
        hideLastEdit: true,
        hideSignatures: true,
        hideReportLinks: true,
        hideSecondaryLinks: false,
        hideTabNav: true,
        hideTitleBlock: true,
        hideRightPanel: true,
        hideThreadsHeader: true,
        // Display
        compactPosts: true,
        widerContent: true,
        compactQuotes: true,
        compactThreads: true,
        highlightPinned: true,
        stickyNav: false,
    };

    // Load config — single pass
    const CFG = {};
    for (const [k, v] of Object.entries(DEFAULTS)) {
        CFG[k] = GM_getValue(k, v);
    }
    // Parse JSON lists
    CFG._blockedUsers = JSON.parse(CFG.blockedUsers || '[]');
    CFG._hiddenThreads = JSON.parse(CFG.hiddenThreads || '[]');

    function saveCfg() {
        for (const [k, v] of Object.entries(CFG)) {
            if (k.startsWith('_')) continue;
            GM_setValue(k, v);
        }
    }
    function saveList(key) {
        const json = JSON.stringify(CFG['_' + key]);
        CFG[key] = json;
        GM_setValue(key, json);
    }

    // =========================================================================
    //  ANTI-FOUC: Immediate class injection (document-start)
    // =========================================================================
    const HTML = document.documentElement;
    HTML.setAttribute('data-glp-theme', CFG.theme);

    const FLAG_MAP = {
        minimalistView: 'glp-minimal',
        hideKarmaBar: 'glp-no-karma',
        hidePostActions: 'glp-no-postactions',
        hideSecondaryLinks: 'glp-no-seclinks',
        hideTabNav: 'glp-no-tabnav',
        hideTitleBlock: 'glp-no-titleblock',
        hideRightPanel: 'glp-no-rightpanel',
        hideThreadsHeader: 'glp-no-threadsheader',
        compactPosts: 'glp-compact-posts',
        widerContent: 'glp-wider',
        compactQuotes: 'glp-compact-quotes',
        compactThreads: 'glp-compact-threads',
        highlightPinned: 'glp-hl-pinned',
        stickyNav: 'glp-sticky-nav',
    };

    for (const [key, cls] of Object.entries(FLAG_MAP)) {
        if (CFG[key]) HTML.classList.add(cls);
    }

    // =========================================================================
    //  THEME DEFINITIONS & CORE CSS
    // =========================================================================
    GM_addStyle(`
        /* ===== FONT ===== */
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

        /* ===== THEME: OLED Dark ===== */
        html[data-glp-theme='oled-dark'] {
            --bg-0: #000000; --bg-1: #0a0a0a; --bg-2: #141414; --bg-3: #1e1e1e;
            --tx-0: #f0f0f0; --tx-1: #a8a8a8; --tx-2: #666666;
            --bd-0: #2a2a2a; --bd-1: #1a1a1a;
            --ac: #3b82f6; --ac-h: #2563eb; --ac-glow: rgba(59,130,246,0.25);
            --danger: #ef4444; --danger-h: #dc2626;
            --success: #22c55e;
            --glass-bg: rgba(10,10,10,0.85); --glass-blur: 20px;
            --shadow: 0 8px 32px rgba(0,0,0,0.6);
        }

        /* ===== THEME: Catppuccin Mocha ===== */
        html[data-glp-theme='catppuccin-mocha'] {
            --bg-0: #1e1e2e; --bg-1: #181825; --bg-2: #313244; --bg-3: #45475a;
            --tx-0: #cdd6f4; --tx-1: #a6adc8; --tx-2: #7f849c;
            --bd-0: #585b70; --bd-1: #45475a;
            --ac: #89b4fa; --ac-h: #74c7ec; --ac-glow: rgba(137,180,250,0.25);
            --danger: #f38ba8; --danger-h: #e67e80;
            --success: #a6e3a1;
            --glass-bg: rgba(30,30,46,0.85); --glass-blur: 20px;
            --shadow: 0 8px 32px rgba(0,0,0,0.5);
        }

        /* ===== THEME: GitHub Dark ===== */
        html[data-glp-theme='github-dark'] {
            --bg-0: #0d1117; --bg-1: #161b22; --bg-2: #21262d; --bg-3: #30363d;
            --tx-0: #e6edf3; --tx-1: #8b949e; --tx-2: #6e7681;
            --bd-0: #30363d; --bd-1: #21262d;
            --ac: #58a6ff; --ac-h: #79c0ff; --ac-glow: rgba(88,166,255,0.25);
            --danger: #f85149; --danger-h: #da3633;
            --success: #3fb950;
            --glass-bg: rgba(13,17,23,0.88); --glass-blur: 20px;
            --shadow: 0 8px 32px rgba(0,0,0,0.5);
        }

        /* ===== ANTI-FOUC HIDES ===== */
        html.glp-minimal table.threads .vfr,
        html.glp-minimal table.threads .vifr,
        html.glp-minimal table.threads .pfr,
        html.glp-minimal table.threads .rfr,
        html.glp-minimal table.threads .mfr,
        html.glp-minimal table.threads .hfr { display: none !important; }

        html.glp-no-karma .karmabar_wrapper { display: none !important; }
        html.glp-no-postactions .post_actions { display: none !important; }
        html.glp-no-seclinks .pagetoplinks2 { display: none !important; }
        html.glp-no-tabnav .tabnav { display: none !important; }
        html.glp-no-titleblock .title { display: none !important; }
        html.glp-no-rightpanel .rightpanel_ipad > div:nth-of-type(2) { display: none !important; }
        html.glp-no-threadsheader .threads_header_row { display: none !important; }

        /* ===== BASE RESET ===== */
        html[data-glp-theme] body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif !important;
            background: var(--bg-0) !important;
            color: var(--tx-0) !important;
            line-height: 1.55;
            scroll-behavior: smooth;
        }
        #sitewrap, #wrap_in, html[data-glp-theme] body, html {
            width: 100% !important; max-width: 100% !important; min-width: auto !important;
            box-sizing: border-box; overflow-x: hidden; background: transparent !important;
        }
        #content-wrap, .main-content-box {
            width: 96% !important; max-width: 1600px !important; margin: 0 auto !important;
        }
        html[data-glp-theme] #wrap { background: var(--bg-0) !important; }
        html[data-glp-theme] #wrap_in { border: none !important; }

        /* ===== BRANDED SCROLLBAR ===== */
        ::-webkit-scrollbar { width: 8px; background: var(--bg-0); }
        ::-webkit-scrollbar-thumb { background: var(--bg-3); border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: var(--tx-2); }

        /* ===== SITE ELEMENT THEMING ===== */
        .hdr_banner, .hdr_top, #rightpanel_inner, .footer, .sitestats, .sitestats td,
        table.threads th, form[action*="/bbs/vote.php"], .tabnav, .tabnav li, .tabnav a,
        table.msg td.nav, table.msg td.navbottom, table.msg .msgtitle, .post_hdr,
        .hdr_time_login_row {
            background: var(--bg-1) !important; color: var(--tx-0) !important;
            border-color: var(--bd-0) !important;
        }
        table.threads tr.even { background: var(--bg-1) !important; }
        table.threads tr.odd { background: var(--bg-0) !important; }
        table.threads tr:hover { background: var(--bg-2) !important; }
        table.msg .messagecontent, table.msg .replycontent, .replycontent.p2 { background: var(--bg-0) !important; }
        table.msg .messageauthor, table.msg .replyauthor, .replyauthor.p1, .replycontent.p1 { background: var(--bg-1) !important; }
        div.post_main { color: var(--tx-0) !important; }
        td.messageauthor, td.replyauthor, td.vifr, td.pfr, td.vfr, td.hfr, td.rfr, td.mfr { color: var(--tx-0) !important; }
        table.threads td { color: var(--tx-1) !important; border-color: var(--bd-0) !important; }
        table.threads .sfr a, table.threads .tfr a { color: var(--tx-0) !important; }
        table.threads, table.threads td { border-color: var(--bd-0) !important; }
        td.nav, td.navbottom { border: none !important; }

        a, .thread a { color: var(--ac) !important; text-decoration: none !important; }
        a:hover { color: var(--ac-h) !important; }

        input, select, textarea {
            background: var(--bg-2) !important; color: var(--tx-0) !important;
            border: 1px solid var(--bd-0) !important; border-radius: 6px; padding: 8px;
        }

        /* ===== DISPLAY MODIFIERS ===== */
        html.glp-compact-posts .messageauthor,
        html.glp-compact-posts .replyauthor { padding: 8px 10px !important; }
        html.glp-compact-posts .messagecontent,
        html.glp-compact-posts .replycontent { padding: 10px 14px !important; }
        html.glp-compact-posts .author_inner { gap: 3px !important; }
        html.glp-compact-posts .post_hdr { padding-bottom: 4px !important; margin-bottom: 8px !important; }

        html.glp-wider .msg .msgcol_author { width: 120px !important; min-width: 120px !important; max-width: 120px !important; }
        @media (max-width: 900px) {
            html.glp-wider .msg .msgcol_author { width: 90px !important; min-width: 90px !important; }
        }

        html.glp-compact-quotes .quoteo { margin: 6px 0 !important; padding: 8px 12px !important; }
        html.glp-compact-quotes .quotei { padding: 0 !important; font-size: 0.93em !important; }

        html.glp-compact-threads table.threads td { padding: 6px 8px !important; }
        html.glp-compact-threads table.threads .sfr { line-height: 1.35 !important; }

        html.glp-hl-pinned tr:has(span[title='Pinned Thread']),
        html.glp-hl-pinned tr:has(span[title='Karma Pin']) {
            background: linear-gradient(90deg, var(--ac-glow) 0%, transparent 50%) !important;
            border-left: 3px solid var(--ac) !important;
        }

        html.glp-sticky-nav .thread_top_controls,
        html.glp-sticky-nav .topnav.topnav_main {
            position: sticky !important; top: 0 !important; z-index: 1000 !important;
            background: var(--bg-1) !important;
        }

        /* ===== QUOTE THEMING ===== */
        div.quoteo { background: transparent !important; border-left: 3px solid var(--ac) !important; }
        div.quotei {
            background: var(--bg-1) !important; border-color: var(--ac) !important;
            transition: max-height 0.35s ease, opacity 0.3s ease, padding 0.3s ease;
        }
        div.quotei.glp-collapsed {
            max-height: 22px; overflow: hidden; opacity: 0.5;
            padding-top: 0 !important; padding-bottom: 0 !important;
            border-left: 3px dotted var(--ac);
        }
        .glp-quote-toggle {
            cursor: pointer; background: var(--bg-2); color: var(--tx-1);
            padding: 3px 10px; border-radius: 5px; font-size: 11px; display: inline-block;
            border: 1px solid var(--bd-0); margin-bottom: 4px;
            transition: all 0.2s ease;
        }
        .glp-quote-toggle:hover { background: var(--ac); color: #fff; border-color: var(--ac); }

        /* ===== USER BLOCKER ===== */
        .glp-block-btn {
            background: var(--danger); color: #fff; border: none; padding: 3px 7px;
            border-radius: 4px; cursor: pointer; font-size: 10px; font-weight: 600;
            margin-top: 4px; display: inline-block; transition: background 0.2s;
        }
        .glp-block-btn:hover { background: var(--danger-h); }
        tr.glp-user-blocked, tr.glp-meme-hidden { display: none !important; }

        /* ===== THREAD HIDING ===== */
        .glp-hidden-thread { display: none !important; }
        .glp-hide-cell { width: 36px; text-align: center; }
        .glp-hide-btn {
            cursor: pointer; font-size: 9px; color: var(--tx-2);
            border: 1px solid var(--bd-0); padding: 2px 5px; border-radius: 3px;
            transition: all 0.2s; user-select: none;
        }
        .glp-hide-btn:hover { color: #fff; background: var(--danger); border-color: var(--danger); }

        /* ===== AUTOPAGER ===== */
        .glp-page-sep td {
            text-align: center; padding: 12px; font-size: 13px; color: var(--tx-2);
            background: var(--bg-1); border-top: 1px solid var(--bd-0); border-bottom: 1px solid var(--bd-0);
        }
        #glp-pager-status {
            text-align: center; padding: 16px; font-weight: 600; color: var(--tx-1);
            background: var(--bg-0); display: none;
        }
        .navpages, .navbottom, .footer .navpages { transition: opacity 0.3s; }

        /* ===== TOAST ===== */
        #glp-toast {
            position: fixed; bottom: 24px; left: 50%;
            transform: translateX(-50%) translateY(100px);
            background: var(--glass-bg); backdrop-filter: blur(var(--glass-blur));
            -webkit-backdrop-filter: blur(var(--glass-blur));
            color: var(--tx-0); padding: 12px 28px; border-radius: 10px;
            border: 1px solid var(--bd-0); box-shadow: var(--shadow);
            z-index: 99999; opacity: 0; pointer-events: none;
            transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
            font-size: 14px; border-left: 3px solid var(--success);
        }
        #glp-toast.glp-show {
            transform: translateX(-50%) translateY(0);
            opacity: 1; pointer-events: auto;
        }

        /* ===== HEADER HANDLE ===== */
        #glp-handle {
            position: fixed; top: 0; left: 50%; transform: translateX(-50%);
            height: 32px; z-index: 50000;
            background: var(--glass-bg); backdrop-filter: blur(var(--glass-blur));
            -webkit-backdrop-filter: blur(var(--glass-blur));
            border: 1px solid var(--bd-0); border-top: none;
            border-radius: 0 0 10px 10px; box-shadow: var(--shadow);
            display: flex; align-items: center; padding: 0 6px; gap: 0;
        }
        #glp-handle a, #glp-handle button {
            display: flex; align-items: center; gap: 6px;
            padding: 0 12px; font-size: 12px; height: 100%;
            color: var(--tx-1) !important; text-decoration: none !important;
            background: transparent; border: none; cursor: pointer;
            transition: color 0.2s;
        }
        #glp-handle a:hover, #glp-handle button:hover { color: var(--tx-0) !important; }
        #glp-handle .glp-sep { width: 1px; height: 60%; background: var(--bd-0); }
        #glp-handle svg { width: 16px; height: 16px; fill: currentColor; transition: transform 0.3s; }
        #glp-handle button:hover svg { transform: rotate(20deg); }
        #glp-handle .glp-ver { font-size: 10px; color: var(--tx-2); padding: 0 8px; }

        /* ===== SETTINGS PANEL ===== */
        #glp-settings-overlay {
            position: fixed; inset: 0; z-index: 60000;
            background: rgba(0,0,0,0.6); backdrop-filter: blur(4px);
            -webkit-backdrop-filter: blur(4px);
            opacity: 0; visibility: hidden; transition: all 0.3s ease;
        }
        #glp-settings-overlay.glp-open { opacity: 1; visibility: visible; }

        #glp-settings {
            position: fixed; top: 50%; left: 50%;
            transform: translate(-50%, -50%) scale(0.92);
            width: 880px; max-width: 94vw; height: 80vh;
            background: var(--glass-bg); backdrop-filter: blur(var(--glass-blur));
            -webkit-backdrop-filter: blur(var(--glass-blur));
            border: 1px solid var(--bd-0); border-radius: 14px;
            box-shadow: var(--shadow); z-index: 60001;
            display: flex; flex-direction: column;
            opacity: 0; visibility: hidden;
            transition: all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        #glp-settings-overlay.glp-open #glp-settings {
            opacity: 1; visibility: visible; transform: translate(-50%, -50%) scale(1);
        }

        .glp-s-head {
            display: flex; align-items: center; justify-content: space-between;
            padding: 14px 22px; border-bottom: 1px solid var(--bd-0);
            background: var(--bg-2); border-radius: 14px 14px 0 0; flex-shrink: 0;
        }
        .glp-s-head h2 {
            margin: 0; font-size: 17px; color: var(--tx-0); font-weight: 600;
            display: flex; align-items: center; gap: 8px;
        }
        .glp-s-head h2 svg { width: 20px; height: 20px; fill: var(--ac); }
        .glp-s-close {
            background: none; border: none; cursor: pointer; padding: 4px;
            border-radius: 50%; line-height: 0;
        }
        .glp-s-close svg { width: 18px; height: 18px; fill: var(--tx-2); transition: all 0.2s; }
        .glp-s-close:hover svg { fill: var(--danger); transform: rotate(90deg); }

        .glp-s-body { display: flex; flex: 1; overflow: hidden; }

        .glp-s-tabs {
            width: 160px; flex-shrink: 0; border-right: 1px solid var(--bd-0);
            background: var(--bg-1); padding: 12px 0; display: flex; flex-direction: column;
            border-radius: 0 0 0 14px; overflow-y: auto;
        }
        .glp-tab {
            display: block; width: 100%; background: none; border: none; text-align: left;
            padding: 10px 16px; font-size: 13px; color: var(--tx-1); cursor: pointer;
            border-left: 3px solid transparent; transition: all 0.2s;
            font-family: inherit;
        }
        .glp-tab:hover { background: var(--bg-2); color: var(--tx-0); }
        .glp-tab.glp-active {
            color: var(--ac); font-weight: 600; border-left-color: var(--ac); background: var(--bg-2);
        }

        .glp-s-content {
            flex: 1; padding: 20px; overflow-y: auto; display: flex; flex-direction: column; gap: 10px;
        }
        .glp-pane { display: none; flex-direction: column; gap: 10px; }
        .glp-pane.glp-active { display: flex; }

        .glp-section-hdr {
            font-size: 13px; color: var(--ac); text-transform: uppercase; letter-spacing: 0.8px;
            border-bottom: 1px solid var(--bd-0); padding-bottom: 6px; margin: 14px 0 4px;
            font-weight: 600;
        }
        .glp-section-hdr:first-child { margin-top: 0; }

        /* Setting rows with staggered entrance */
        .glp-row {
            display: flex; align-items: center; justify-content: space-between;
            gap: 12px; padding: 10px 14px;
            background: var(--bg-2); border-radius: 8px; border: 1px solid var(--bd-1);
            transition: border-color 0.2s, transform 0.2s, box-shadow 0.2s;
            opacity: 0; transform: translateY(8px);
            animation: glpRowIn 0.3s ease forwards;
        }
        .glp-row:hover { border-color: var(--bd-0); transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,0,0,0.2); }
        .glp-row label { font-size: 13px; color: var(--tx-0); cursor: pointer; flex: 1; }
        .glp-row small { font-size: 11px; color: var(--tx-2); margin-top: 2px; display: block; }

        @keyframes glpRowIn {
            to { opacity: 1; transform: translateY(0); }
        }
        .glp-pane.glp-active .glp-row:nth-child(1) { animation-delay: 0s; }
        .glp-pane.glp-active .glp-row:nth-child(2) { animation-delay: 0.03s; }
        .glp-pane.glp-active .glp-row:nth-child(3) { animation-delay: 0.06s; }
        .glp-pane.glp-active .glp-row:nth-child(4) { animation-delay: 0.09s; }
        .glp-pane.glp-active .glp-row:nth-child(5) { animation-delay: 0.12s; }
        .glp-pane.glp-active .glp-row:nth-child(6) { animation-delay: 0.15s; }
        .glp-pane.glp-active .glp-row:nth-child(7) { animation-delay: 0.18s; }
        .glp-pane.glp-active .glp-row:nth-child(8) { animation-delay: 0.21s; }
        .glp-pane.glp-active .glp-row:nth-child(9) { animation-delay: 0.24s; }
        .glp-pane.glp-active .glp-row:nth-child(10) { animation-delay: 0.27s; }
        .glp-pane.glp-active .glp-row:nth-child(n+11) { animation-delay: 0.3s; }

        /* Toggle switch */
        .glp-sw { position: relative; display: inline-block; width: 42px; height: 22px; flex-shrink: 0; }
        .glp-sw input { opacity: 0; width: 0; height: 0; }
        .glp-sw .glp-slider {
            position: absolute; cursor: pointer; inset: 0;
            background: var(--bg-3); border-radius: 22px; transition: 0.3s;
        }
        .glp-sw .glp-slider::before {
            content: ''; position: absolute; height: 16px; width: 16px;
            left: 3px; bottom: 3px; background: #fff; border-radius: 50%; transition: 0.3s;
        }
        .glp-sw input:checked + .glp-slider { background: var(--ac); }
        .glp-sw input:checked + .glp-slider::before { transform: translateX(20px); }

        /* Theme selector */
        .glp-themes { display: flex; gap: 8px; flex-wrap: wrap; }
        .glp-theme-chip {
            cursor: pointer; padding: 8px 14px; border-radius: 8px;
            border: 2px solid var(--bd-0); font-size: 12px; color: var(--tx-1);
            transition: all 0.2s; display: flex; align-items: center; gap: 8px;
        }
        .glp-theme-chip:hover { border-color: var(--tx-2); }
        .glp-theme-chip.glp-selected { border-color: var(--ac); color: var(--ac); background: var(--ac-glow); }
        .glp-theme-swatch {
            width: 20px; height: 14px; border-radius: 3px; display: inline-block;
        }

        /* Blocking lists */
        .glp-list-controls { display: flex; gap: 8px; margin-bottom: 8px; align-items: center; }
        .glp-list-controls input { flex: 1; }
        .glp-scroll-list {
            max-height: 220px; overflow-y: auto; background: var(--bg-2);
            padding: 8px; border-radius: 8px; border: 1px solid var(--bd-0);
        }
        .glp-list-item {
            display: flex; align-items: center; justify-content: space-between;
            padding: 6px 4px; border-bottom: 1px solid var(--bd-1); font-size: 12px;
        }
        .glp-list-item:last-child { border-bottom: none; }
        .glp-list-item span { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--tx-1); }
        .glp-list-rm {
            background: var(--bg-1); border: 1px solid var(--bd-0); color: var(--tx-2);
            cursor: pointer; padding: 2px 8px; border-radius: 3px; font-size: 11px;
            transition: all 0.2s; flex-shrink: 0;
        }
        .glp-list-rm:hover { background: var(--danger); color: #fff; }
        .glp-btn-sm {
            background: var(--danger); color: #fff; border: none; padding: 6px 12px;
            border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 600;
            transition: background 0.2s;
        }
        .glp-btn-sm:hover { background: var(--danger-h); }

        /* ===== SORT CONTROLS BAR ===== */
        #glp-sort-bar {
            margin: 10px 0; padding: 8px 12px;
            background: var(--bg-1); border: 1px solid var(--bd-0); border-radius: 10px;
            display: flex; flex-wrap: wrap; gap: 6px; align-items: center; justify-content: center;
        }
        .glp-sort-grp { display: flex; }
        .glp-sort-btn {
            background: var(--bg-2); color: var(--tx-1); border: 1px solid var(--bd-0);
            padding: 5px 10px; cursor: pointer; font-size: 12px; transition: all 0.2s;
            font-family: inherit;
        }
        .glp-sort-btn:first-child { border-radius: 5px 0 0 5px; }
        .glp-sort-btn:last-child { border-radius: 0 5px 5px 0; }
        .glp-sort-btn:not(:first-child) { border-left: none; }
        .glp-sort-btn:hover, .glp-sort-btn.glp-active { background: var(--ac); color: #fff; border-color: var(--ac); }
        .glp-bar-sep { width: 1px; background: var(--bd-0); align-self: stretch; margin: 0 4px; }
        .glp-action-btn {
            background: var(--bg-2); color: var(--tx-1); border: 1px solid var(--bd-0);
            padding: 5px 10px; border-radius: 5px; cursor: pointer; font-size: 12px;
            transition: all 0.2s; font-family: inherit;
        }
        .glp-action-btn:hover { background: var(--ac); color: #fff; border-color: var(--ac); }
        .glp-action-btn.glp-danger:hover { background: var(--danger); border-color: var(--danger); }

        /* ===== AD NUKE ===== */
        div[data-type="_mgwidget"], div.mgbox, amp-embed[type="mgid"],
        .msgad, div[id^="ad-"], center > div[style*="text-align: center"],
        div[id^="mgid-"], iframe[src*="mgid"], iframe[src*="doubleclick"],
        ins.adsbygoogle, [data-ad-slot], [data-ad-client] {
            display: none !important; height: 0 !important; overflow: hidden !important;
        }
    `);

    // =========================================================================
    //  DEFERRED EXECUTION (DOM ready)
    // =========================================================================
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    function init() {
        bypassNag();
        bypassClubNag();
        applySortByNew();
        buildUI();
        applyDeclutter();
        applyPinned();
        nukeAds();

        if (document.querySelector('table.threads')) {
            setupThreads();
        }
        if (document.querySelector('table.msg')) {
            setupQuotes();
            setupBlockButtons();
            applyUserBlocks();
            applyMemeFilter();
            applyGifFilter();
            applyAvatarFilter();
        }

        setupPager();
        observeDOM();
    }

    // =========================================================================
    //  UI CONSTRUCTION
    // =========================================================================
    function buildUI() {
        // Toast
        const toast = document.createElement('div');
        toast.id = 'glp-toast';
        document.body.appendChild(toast);

        // Handle bar
        const handle = document.createElement('div');
        handle.id = 'glp-handle';
        handle.innerHTML = `
            <a href="https://www.godlikeproductions.com/" title="Homepage">Home</a>
            <div class="glp-sep"></div>
            <button id="glp-open-settings" title="Settings">
                <svg viewBox="0 0 24 24"><path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41h-3.84c-0.24,0-0.44,0.17-0.48,0.41L9.22,5.72C8.63,5.96,8.1,6.29,7.6,6.67L5.21,5.71C4.99,5.62,4.74,5.69,4.62,5.91L2.7,9.23c-0.11,0.2-0.06,0.47,0.12,0.61l2.03,1.58C4.8,11.69,4.78,12,4.78,12.31c0,0.31,0.02,0.62,0.07,0.94l-2.03,1.58c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54c0.04,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.44-0.17,0.48-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96c0.22,0.08,0.47,0.01,0.59-0.22l1.92-3.32c0.11-0.2,0.06-0.47-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z"/></svg>
            </button>
            <span class="glp-ver">v${VERSION}</span>
        `;
        document.body.prepend(handle);

        // Settings overlay + panel
        const overlay = document.createElement('div');
        overlay.id = 'glp-settings-overlay';
        overlay.innerHTML = buildSettingsHTML();
        document.body.appendChild(overlay);

        // Event wiring
        document.getElementById('glp-open-settings').addEventListener('click', () => overlay.classList.add('glp-open'));
        overlay.addEventListener('click', e => { if (e.target === overlay) overlay.classList.remove('glp-open'); });
        document.getElementById('glp-s-close').addEventListener('click', () => overlay.classList.remove('glp-open'));
        document.addEventListener('keydown', e => { if (e.key === 'Escape') overlay.classList.remove('glp-open'); });

        // Tab switching
        overlay.querySelectorAll('.glp-tab').forEach(btn => {
            btn.addEventListener('click', () => {
                overlay.querySelectorAll('.glp-tab').forEach(b => b.classList.remove('glp-active'));
                overlay.querySelectorAll('.glp-pane').forEach(p => { p.classList.remove('glp-active'); });
                btn.classList.add('glp-active');
                const pane = document.getElementById('glp-pane-' + btn.dataset.tab);
                if (pane) {
                    pane.classList.add('glp-active');
                    // Re-trigger animations
                    pane.querySelectorAll('.glp-row').forEach(r => {
                        r.style.animation = 'none';
                        r.offsetHeight;
                        r.style.animation = '';
                    });
                }
            });
        });

        // Toggle handlers
        overlay.querySelectorAll('input[type="checkbox"][data-cfg]').forEach(cb => {
            cb.addEventListener('change', () => {
                const key = cb.dataset.cfg;
                CFG[key] = cb.checked;
                saveCfg();
                applyToggle(key);
                const lbl = cb.closest('.glp-row')?.querySelector('label')?.textContent || key;
                showToast(`${lbl} ${cb.checked ? 'enabled' : 'disabled'}`);
            });
        });

        // Theme chips
        overlay.querySelectorAll('.glp-theme-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                const t = chip.dataset.theme;
                CFG.theme = t;
                saveCfg();
                HTML.setAttribute('data-glp-theme', t);
                overlay.querySelectorAll('.glp-theme-chip').forEach(c => c.classList.remove('glp-selected'));
                chip.classList.add('glp-selected');
                showToast('Theme: ' + chip.textContent.trim());
            });
        });

        // Blocking tab handlers
        setupBlockingUI();
    }

    function buildSettingsHTML() {
        const sw = (key, label, desc) => {
            const chk = CFG[key] ? 'checked' : '';
            return `<div class="glp-row">
                <div><label>${label}</label>${desc ? `<small>${desc}</small>` : ''}</div>
                <label class="glp-sw"><input type="checkbox" data-cfg="${key}" ${chk}><span class="glp-slider"></span></label>
            </div>`;
        };

        const themes = [
            { id: 'oled-dark', name: 'OLED Dark', color: '#000' },
            { id: 'catppuccin-mocha', name: 'Catppuccin Mocha', color: '#313244' },
            { id: 'github-dark', name: 'GitHub Dark', color: '#161b22' },
        ];
        const themeHTML = themes.map(t =>
            `<div class="glp-theme-chip ${CFG.theme === t.id ? 'glp-selected' : ''}" data-theme="${t.id}">
                <span class="glp-theme-swatch" style="background:${t.color};border:1px solid #444"></span>${t.name}
            </div>`
        ).join('');

        return `<div id="glp-settings">
            <div class="glp-s-head">
                <h2><svg viewBox="0 0 24 24"><path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41h-3.84c-0.24,0-0.44,0.17-0.48,0.41L9.22,5.72C8.63,5.96,8.1,6.29,7.6,6.67L5.21,5.71C4.99,5.62,4.74,5.69,4.62,5.91L2.7,9.23c-0.11,0.2-0.06,0.47,0.12,0.61l2.03,1.58C4.8,11.69,4.78,12,4.78,12.31c0,0.31,0.02,0.62,0.07,0.94l-2.03,1.58c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54c0.04,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.44-0.17,0.48-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96c0.22,0.08,0.47,0.01,0.59-0.22l1.92-3.32c0.11-0.2,0.06-0.47-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z"/></svg>GLP Enhancement Suite</h2>
                <button id="glp-s-close" class="glp-s-close"><svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg></button>
            </div>
            <div class="glp-s-body">
                <div class="glp-s-tabs">
                    <button class="glp-tab glp-active" data-tab="general">General</button>
                    <button class="glp-tab" data-tab="theme">Theme</button>
                    <button class="glp-tab" data-tab="content">Content</button>
                    <button class="glp-tab" data-tab="display">Display</button>
                    <button class="glp-tab" data-tab="blocking">Blocking</button>
                    <button class="glp-tab" data-tab="declutter">Declutter</button>
                </div>
                <div class="glp-s-content">
                    <!-- GENERAL -->
                    <div id="glp-pane-general" class="glp-pane glp-active">
                        ${sw('adBlocker', 'Ad Blocker', 'Nukes ad containers, widgets, and sponsored content')}
                        ${sw('bypassNag', 'Bypass Registration Nag', 'Auto-skip the "why not register?" screen')}
                        ${sw('bypassClubNag', 'Bypass Country Club Nag', 'Auto-accept the Country Club disclaimer')}
                        ${sw('autoPager', 'Infinite Scroll', 'Auto-loads next page on scroll')}
                        ${sw('sortByNew', 'Default Sort by New', 'Always sort threads by newest first')}
                    </div>

                    <!-- THEME -->
                    <div id="glp-pane-theme" class="glp-pane">
                        <div class="glp-section-hdr">Color Theme</div>
                        <div class="glp-row"><div class="glp-themes">${themeHTML}</div></div>
                    </div>

                    <!-- CONTENT -->
                    <div id="glp-pane-content" class="glp-pane">
                        ${sw('collapsibleQuotes', 'Collapsible Quotes', 'Adds expand/collapse toggle to quoted text')}
                        ${sw('collapseByDefault', 'Collapse Quotes by Default', 'Quotes start collapsed')}
                        ${sw('hideMemeReplies', 'Hide Meme-Only Replies', 'Hides posts that are just images with no text')}
                        ${sw('hideBoomerGifs', 'Hide Reaction GIFs', 'Hides /sm/ reaction images')}
                        ${sw('hideAvatars', 'Hide Avatars', 'Hides user avatar images')}
                    </div>

                    <!-- DISPLAY -->
                    <div id="glp-pane-display" class="glp-pane">
                        <div class="glp-section-hdr">Post Layout</div>
                        ${sw('compactPosts', 'Compact Posts', 'Tighter padding on posts')}
                        ${sw('widerContent', 'Wider Content', 'Narrows author column for more content space')}
                        ${sw('compactQuotes', 'Compact Quotes', 'Reduces quote padding')}
                        <div class="glp-section-hdr">Thread List</div>
                        ${sw('compactThreads', 'Compact Thread List', 'Tighter thread row spacing')}
                        ${sw('highlightPinned', 'Highlight Pinned Threads', 'Accent glow on pinned/karma threads')}
                        ${sw('minimalistView', 'Minimalist View', 'Hides reply/view/date columns')}
                        <div class="glp-section-hdr">Navigation</div>
                        ${sw('stickyNav', 'Sticky Navigation', 'Nav bar stays at top on scroll')}
                    </div>

                    <!-- BLOCKING -->
                    <div id="glp-pane-blocking" class="glp-pane">
                        <div class="glp-section-hdr">Blocked Users</div>
                        <div class="glp-row" style="flex-direction:column;align-items:stretch">
                            <div class="glp-list-controls">
                                <input type="text" id="glp-block-search" placeholder="Search blocked users...">
                                <input type="text" id="glp-block-input" placeholder="User ID" style="width:80px;flex:0">
                                <button class="glp-btn-sm" id="glp-block-add" style="background:var(--ac)">Add</button>
                            </div>
                            <div class="glp-scroll-list" id="glp-blocked-list"></div>
                        </div>
                        ${sw('manualThreadHiding', 'Thread Hide Buttons', 'Show hide buttons on each thread row')}
                        <div class="glp-section-hdr">Hidden Threads</div>
                        <div class="glp-row" style="flex-direction:column;align-items:stretch">
                            <div class="glp-list-controls">
                                <input type="text" id="glp-thread-search" placeholder="Search hidden threads...">
                                <button class="glp-btn-sm" id="glp-unhide-all">Unhide All</button>
                            </div>
                            <div class="glp-scroll-list" id="glp-hidden-list"></div>
                        </div>
                    </div>

                    <!-- DECLUTTER -->
                    <div id="glp-pane-declutter" class="glp-pane">
                        ${sw('hidePinnedThreads', 'Hide Pinned Threads', 'Hides pinned and karma-pinned threads')}
                        ${sw('hideBanner', 'Hide Site Banner', 'Top banner image')}
                        ${sw('hideFooter', 'Hide Footer', 'Bottom footer area')}
                        ${sw('hideRelatedThreads', 'Hide Related Threads', 'Bottom related threads table')}
                        <div class="glp-section-hdr">Advanced</div>
                        ${sw('hideKarmaBar', 'Hide Karma Bar', 'Karma bar in posts')}
                        ${sw('hidePostActions', 'Hide Post Actions', 'Reply/quote action links')}
                        ${sw('hideTopNav', 'Hide Top Nav/Login', 'Top navigation with login')}
                        ${sw('hideThreadNav', 'Hide Thread Nav', 'In-thread Reply/Post nav')}
                        ${sw('hidePolls', 'Hide Thread Polls', 'Rate this thread polls')}
                        ${sw('hideLastEdit', 'Hide Last Edit Info', '"Last edited by" text')}
                        ${sw('hideSignatures', 'Hide Signatures', 'User signatures')}
                        ${sw('hideReportLinks', 'Hide Report Links', 'Report abusive post links')}
                        ${sw('hideSecondaryLinks', 'Hide Secondary Links', 'FAQ/Search/Topics top links')}
                        ${sw('hideTabNav', 'Hide Tab Navigation', 'Forums/New Posts tabs')}
                        ${sw('hideTitleBlock', 'Hide Title Block', 'Thread page title block')}
                        ${sw('hideRightPanel', 'Hide Right Panel Box', 'Sidebar misc box')}
                        ${sw('hideThreadsHeader', 'Hide Thread List Header', 'Column headers row')}
                    </div>
                </div>
            </div>
        </div>`;
    }

    // =========================================================================
    //  APPLY TOGGLE CHANGES
    // =========================================================================
    function applyToggle(key) {
        // Class-based toggles
        if (FLAG_MAP[key] !== undefined) {
            HTML.classList.toggle(FLAG_MAP[key], CFG[key]);
        }

        // Declutter toggles
        const declutterKeys = [
            'hideBanner', 'hideFooter', 'hideRelatedThreads', 'hideTopNav',
            'hideThreadNav', 'hidePolls', 'hideLastEdit', 'hideSignatures',
            'hideReportLinks',
        ];
        if (declutterKeys.includes(key)) applyDeclutter();
        if (key === 'hidePinnedThreads') applyPinned();
        if (key === 'adBlocker') nukeAds();
        if (key === 'collapsibleQuotes' || key === 'collapseByDefault') setupQuotes();
        if (key === 'hideMemeReplies') applyMemeFilter();
        if (key === 'hideBoomerGifs') applyGifFilter();
        if (key === 'hideAvatars') applyAvatarFilter();
        if (key === 'autoPager') setupPager();
        if (key === 'manualThreadHiding') {
            document.querySelectorAll('.glp-hide-cell').forEach(el => {
                el.style.display = CFG.manualThreadHiding ? '' : 'none';
            });
        }
    }

    // =========================================================================
    //  TOAST
    // =========================================================================
    let toastTimer;
    function showToast(msg) {
        const t = document.getElementById('glp-toast');
        if (!t) return;
        t.textContent = msg;
        t.classList.add('glp-show');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => t.classList.remove('glp-show'), 2500);
    }

    // =========================================================================
    //  DECLUTTER
    // =========================================================================
    function applyDeclutter() {
        const map = [
            ['hideBanner', '.hdr_banner'],
            ['hideFooter', '#footer'],
            ['hideRelatedThreads', 'table.threads.related'],
            ['hideTopNav', '.rightpanel_ipad > .topnav'],
            ['hideThreadNav', '.topnav:has(.messagebottomnavlinks)'],
            ['hidePolls', 'form[action="/bbs/vote.php"]'],
            ['hideLastEdit', 'span.lastedit'],
            ['hideSignatures', '.sig1, .sig2'],
            ['hideReportLinks', 'a[href*="/abusive"], a[href*="/copyright"]'],
        ];
        for (const [key, sel] of map) {
            document.querySelectorAll(sel).forEach(el => {
                el.style.display = CFG[key] ? 'none' : '';
            });
        }
    }

    // =========================================================================
    //  BYPASS NAG / COUNTRY CLUB
    // =========================================================================
    function bypassNag() {
        if (!CFG.bypassNag) return;
        const body = document.body;
        if (!body) return;
        const text = body.textContent || '';
        if (text.includes('Why not register for a free account?') || text.includes('To continue reading this thread you must')) {
            const link = document.querySelector('a[href*="regp="]');
            if (link) window.location.href = link.href;
        }
    }

    function bypassClubNag() {
        if (!CFG.bypassClubNag) return;
        const disc = document.querySelector('b');
        if (disc && disc.textContent.includes('Private Virtual Country Club')) {
            const c1 = document.getElementById('c1');
            const c2 = document.getElementById('c2');
            if (c1) c1.checked = true;
            if (c2) c2.checked = true;
            const submit = document.querySelector('input[type="submit"][name="disclaimer"]');
            if (submit) submit.click();
        }
    }

    function applySortByNew() {
        if (!CFG.sortByNew || window.location.pathname.includes('/message')) return;
        const params = new URLSearchParams(window.location.search);
        if (params.get('sort') !== 'posted' || params.get('order') !== 'desc') {
            params.set('sort', 'posted');
            params.set('order', 'desc');
            window.location.search = params.toString();
        }
    }

    // =========================================================================
    //  AD NUKING
    // =========================================================================
    function nukeAds() {
        if (!CFG.adBlocker) return;
        const sels = [
            'div[data-type="_mgwidget"]', 'div.mgbox', 'amp-embed[type="mgid"]',
            '.msgad', 'div[id^="ad-"]', 'div[id^="mgid-"]',
            'iframe[src*="mgid"]', 'iframe[src*="doubleclick"]',
            'ins.adsbygoogle', '[data-ad-slot]', '[data-ad-client]',
        ];
        const sel = sels.join(',');
        document.querySelectorAll(sel).forEach(el => {
            // Don't remove post content containers
            if (el.closest('#g_m, #g_m_s')) return;
            // Try to remove wrapping center/div if it's only ads
            const parent = el.closest('center, div[style*="margin-bottom"]');
            if (parent && parent.parentElement?.tagName !== 'BODY' && parent.querySelectorAll(sel).length === parent.children.length) {
                parent.remove();
            } else {
                el.remove();
            }
        });
        // Nuke empty centered ad wrappers
        document.querySelectorAll('center').forEach(c => {
            if (c.children.length === 0 && c.textContent.trim() === '') c.remove();
        });
    }

    // =========================================================================
    //  THREAD MANAGEMENT
    // =========================================================================
    function setupThreads() {
        const table = document.querySelector('table.threads');
        if (!table) return;

        // Sort controls
        if (!document.getElementById('glp-sort-bar')) {
            const bar = document.createElement('div');
            bar.id = 'glp-sort-bar';
            bar.innerHTML = buildSortBar();
            table.parentNode.insertBefore(bar, table);
            wireSortBar(bar);
        }

        processThreadRows(table);
    }

    function buildSortBar() {
        const sorts = [
            ['updated', 'Updated'], ['posted', 'Posted'], ['rating', 'Rating'],
            ['views', 'Views'], ['replies', 'Replies'],
        ];
        let h = '';
        for (const [key, lbl] of sorts) {
            h += `<div class="glp-sort-grp">
                <button class="glp-sort-btn" data-sort="${key}">${lbl}</button>
                <button class="glp-sort-btn" data-sort="${key}" data-order="asc" title="Ascending">&#9650;</button>
                <button class="glp-sort-btn" data-sort="${key}" data-order="desc" title="Descending">&#9660;</button>
            </div>`;
        }
        h += '<div class="glp-bar-sep"></div>';
        h += '<button class="glp-action-btn" id="glp-toggle-pinned">Toggle Pinned</button>';
        h += '<button class="glp-action-btn glp-danger" id="glp-reset-view">Reset</button>';
        return h;
    }

    function wireSortBar(bar) {
        // Highlight active sort
        const params = new URLSearchParams(window.location.search);
        const sort = params.get('sort'), order = params.get('order');
        if (sort && order) {
            bar.querySelectorAll(`.glp-sort-btn[data-sort="${sort}"][data-order="${order}"]`).forEach(b => b.classList.add('glp-active'));
        }

        bar.querySelectorAll('.glp-sort-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const s = btn.dataset.sort;
                const o = btn.dataset.order || 'desc';
                window.location.href = `https://www.godlikeproductions.com/forum1/pg1?sort=${s}&order=${o}`;
            });
        });

        document.getElementById('glp-toggle-pinned')?.addEventListener('click', () => {
            CFG.hidePinnedThreads = !CFG.hidePinnedThreads;
            saveCfg();
            applyPinned();
            const cb = document.querySelector('input[data-cfg="hidePinnedThreads"]');
            if (cb) cb.checked = CFG.hidePinnedThreads;
            showToast(`Pinned threads ${CFG.hidePinnedThreads ? 'hidden' : 'shown'}`);
        });

        document.getElementById('glp-reset-view')?.addEventListener('click', () => {
            window.location.href = 'https://www.godlikeproductions.com/forum1/pg1';
        });
    }

    function processThreadRows(ctx) {
        const table = ctx.querySelector ? ctx : document;
        const rows = table.querySelectorAll('table.threads tbody > tr:not(.threads_header_row):not(.glp-page-sep)');

        rows.forEach(row => {
            if (row.dataset.glpProcessed) return;
            row.dataset.glpProcessed = '1';

            const link = row.querySelector('.sfr a');
            if (!link) return;

            const threadId = link.getAttribute('href');
            const threadTitle = link.textContent.trim();

            // Add hide button cell
            const hideCell = document.createElement('td');
            hideCell.className = 'glp-hide-cell';
            hideCell.style.display = CFG.manualThreadHiding ? '' : 'none';
            const hideBtn = document.createElement('span');
            hideBtn.className = 'glp-hide-btn';
            hideBtn.textContent = 'X';
            hideBtn.title = 'Hide thread';
            hideBtn.addEventListener('click', e => {
                e.preventDefault();
                e.stopPropagation();
                if (!CFG._hiddenThreads.find(t => (t.id || t) === threadId)) {
                    CFG._hiddenThreads.push({ id: threadId, title: threadTitle });
                    saveList('hiddenThreads');
                    row.classList.add('glp-hidden-thread');
                    showToast('Thread hidden');
                }
            });
            hideCell.appendChild(hideBtn);
            const sfr = row.querySelector('.sfr');
            if (sfr) sfr.after(hideCell);

            // Apply hidden state
            const isHidden = CFG._hiddenThreads.some(t => (t.id || t) === threadId);
            if (CFG.manualThreadHiding && isHidden) row.classList.add('glp-hidden-thread');
        });

        // Also add header cell if missing
        const headerRow = document.querySelector('table.threads .threads_header_row');
        if (headerRow && !headerRow.querySelector('.glp-hide-cell')) {
            const th = document.createElement('th');
            th.className = 'glp-hide-cell';
            th.style.display = CFG.manualThreadHiding ? '' : 'none';
            const sh = headerRow.querySelector('.sh');
            if (sh) sh.after(th);
        }
    }

    function applyPinned() {
        document.querySelectorAll('table.threads tr.odd, table.threads tr.even').forEach(row => {
            const pin = row.querySelector("span[title='Pinned Thread'], span[title='Karma Pin']");
            if (pin) row.style.display = CFG.hidePinnedThreads ? 'none' : '';
        });
    }

    // =========================================================================
    //  COLLAPSIBLE QUOTES
    // =========================================================================
    function setupQuotes(ctx) {
        const root = ctx || document;
        if (!CFG.collapsibleQuotes) {
            root.querySelectorAll('.glp-quote-toggle').forEach(el => el.remove());
            root.querySelectorAll('div.quotei').forEach(el => el.classList.remove('glp-collapsed'));
            return;
        }
        root.querySelectorAll('div.quotei:not(.glp-q-done)').forEach(quote => {
            quote.classList.add('glp-q-done');
            const btn = document.createElement('span');
            btn.className = 'glp-quote-toggle';
            const collapsed = CFG.collapseByDefault;
            if (collapsed) quote.classList.add('glp-collapsed');
            btn.textContent = collapsed ? 'Expand' : 'Collapse';
            btn.addEventListener('click', () => {
                quote.classList.toggle('glp-collapsed');
                btn.textContent = quote.classList.contains('glp-collapsed') ? 'Expand' : 'Collapse';
            });
            quote.parentNode.insertBefore(btn, quote);
        });
    }

    // =========================================================================
    //  USER BLOCKING
    // =========================================================================
    function setupBlockButtons(ctx) {
        const root = ctx || document;
        root.querySelectorAll('td.replyauthor, td.messageauthor').forEach(cell => {
            if (cell.querySelector('.glp-block-btn')) return;
            const rowClass = cell.parentElement?.className || '';
            const match = rowClass.match(/post_uid_(\d+)/);
            if (!match) return;
            const uid = match[1];
            const name = Array.from(cell.childNodes).filter(n => n.nodeType === 3).map(n => n.textContent.trim()).join('') || uid;
            const btn = document.createElement('button');
            btn.className = 'glp-block-btn';
            btn.textContent = 'Block';
            btn.addEventListener('click', () => blockUser(uid, name));
            cell.appendChild(document.createElement('br'));
            cell.appendChild(btn);
        });
    }

    function blockUser(uid, name) {
        if (CFG._blockedUsers.some(u => (u.id || u) === uid)) {
            showToast('Already blocked');
            return;
        }
        CFG._blockedUsers.push({ id: uid, name });
        saveList('blockedUsers');
        applyUserBlocks();
        showToast(`Blocked ${name}`);
    }

    function applyUserBlocks(ctx) {
        const root = ctx || document;
        root.querySelectorAll('tr.glp-user-blocked').forEach(r => r.classList.remove('glp-user-blocked'));
        for (const u of CFG._blockedUsers) {
            const uid = u.id || u;
            root.querySelectorAll(`tr.post_uid_${uid}`).forEach(r => r.classList.add('glp-user-blocked'));
        }
    }

    // =========================================================================
    //  CONTENT FILTERS
    // =========================================================================
    function applyMemeFilter(ctx) {
        const root = ctx || document;
        if (!CFG.hideMemeReplies) {
            root.querySelectorAll('tr.glp-meme-hidden').forEach(r => { r.classList.remove('glp-meme-hidden'); r.style.display = ''; });
            return;
        }
        root.querySelectorAll('tr[id^="post_"]').forEach(post => {
            const main = post.querySelector('.post_main');
            if (!main) return;
            const clone = main.cloneNode(true);
            clone.querySelectorAll('.quoteo, .sig1, .sig2, font[size="1"]').forEach(e => e.remove());
            const media = clone.querySelectorAll('img, iframe, video').length;
            if (media === 0) return;
            const text = clone.textContent.replace(/\s+/g, ' ').trim();
            if (text.length < 20) {
                post.classList.add('glp-meme-hidden');
                post.style.display = 'none';
            }
        });
    }

    function applyGifFilter(ctx) {
        const root = ctx || document;
        root.querySelectorAll('img[src*="/sm/"]').forEach(img => {
            img.style.display = CFG.hideBoomerGifs ? 'none' : '';
        });
    }

    function applyAvatarFilter(ctx) {
        const root = ctx || document;
        root.querySelectorAll('img[src*="/av/"]').forEach(img => {
            img.style.display = CFG.hideAvatars ? 'none' : '';
        });
    }

    // =========================================================================
    //  BLOCKING UI (Settings panel lists)
    // =========================================================================
    function setupBlockingUI() {
        renderBlockedList();
        renderHiddenList();

        document.getElementById('glp-block-add')?.addEventListener('click', () => {
            const inp = document.getElementById('glp-block-input');
            const uid = inp?.value.trim();
            if (uid && !isNaN(uid)) {
                blockUser(uid, `User ID: ${uid}`);
                inp.value = '';
                renderBlockedList();
            } else {
                showToast('Enter a valid numeric User ID');
            }
        });

        document.getElementById('glp-block-search')?.addEventListener('input', function() { renderBlockedList(this.value); });
        document.getElementById('glp-thread-search')?.addEventListener('input', function() { renderHiddenList(this.value); });

        document.getElementById('glp-unhide-all')?.addEventListener('click', () => {
            CFG._hiddenThreads = [];
            saveList('hiddenThreads');
            renderHiddenList();
            document.querySelectorAll('.glp-hidden-thread').forEach(r => r.classList.remove('glp-hidden-thread'));
            showToast('All threads restored');
        });
    }

    function renderBlockedList(filter = '') {
        const container = document.getElementById('glp-blocked-list');
        if (!container) return;
        const f = filter.toLowerCase();
        container.innerHTML = '';
        const items = CFG._blockedUsers.filter(u => {
            const name = u.name || u.id || String(u);
            const id = u.id || String(u);
            return name.toLowerCase().includes(f) || id.includes(f);
        });
        if (!items.length) {
            container.textContent = f ? 'No matches' : 'No blocked users';
            return;
        }
        for (const u of items) {
            const id = u.id || String(u);
            const name = u.name || `UID: ${id}`;
            const row = document.createElement('div');
            row.className = 'glp-list-item';
            row.innerHTML = `<span title="${name} (${id})">${name}</span>`;
            const btn = document.createElement('button');
            btn.className = 'glp-list-rm';
            btn.textContent = 'Unblock';
            btn.addEventListener('click', () => {
                CFG._blockedUsers = CFG._blockedUsers.filter(x => (x.id || x) !== id);
                saveList('blockedUsers');
                applyUserBlocks();
                renderBlockedList(document.getElementById('glp-block-search')?.value || '');
                showToast(`Unblocked ${id}`);
            });
            row.appendChild(btn);
            container.appendChild(row);
        }
    }

    function renderHiddenList(filter = '') {
        const container = document.getElementById('glp-hidden-list');
        if (!container) return;
        const f = filter.toLowerCase();
        container.innerHTML = '';
        const items = CFG._hiddenThreads.filter(t => {
            const title = t.title || t.id || String(t);
            return title.toLowerCase().includes(f);
        });
        if (!items.length) {
            container.textContent = f ? 'No matches' : 'No hidden threads';
            return;
        }
        for (const t of items) {
            const id = t.id || String(t);
            const title = t.title || id;
            const row = document.createElement('div');
            row.className = 'glp-list-item';
            row.innerHTML = `<span title="${title}">${title}</span>`;
            const btn = document.createElement('button');
            btn.className = 'glp-list-rm';
            btn.textContent = 'Unhide';
            btn.addEventListener('click', () => {
                CFG._hiddenThreads = CFG._hiddenThreads.filter(x => (x.id || x) !== id);
                saveList('hiddenThreads');
                document.querySelectorAll(`tr a[href="${id}"]`).forEach(a => {
                    a.closest('tr')?.classList.remove('glp-hidden-thread');
                });
                renderHiddenList(document.getElementById('glp-thread-search')?.value || '');
                showToast('Thread restored');
            });
            row.appendChild(btn);
            container.appendChild(row);
        }
    }

    // =========================================================================
    //  AUTOPAGER
    // =========================================================================
    let pagerState = { loading: false, page: 1, done: false };

    function setupPager() {
        window.removeEventListener('scroll', pagerScroll);
        const old = document.getElementById('glp-pager-status');
        if (old) old.remove();
        pagerState = { loading: false, page: 1, done: false };

        if (!CFG.autoPager) return;

        const isThreadList = !!document.querySelector('table.threads');
        const isThread = !!document.querySelector('table.msg');
        if (!isThreadList && !isThread) return;

        // Determine current page
        const pageMatch = window.location.href.match(/\/pg(\d+)/);
        pagerState.page = pageMatch ? parseInt(pageMatch[1]) : 1;

        // Hide native pagination
        document.querySelectorAll('.navpages, .navbottom, .footer .navpages').forEach(el => el.style.display = 'none');

        // Status indicator
        const target = isThreadList ? document.querySelector('table.threads') : document.querySelector('table.msg');
        if (target) {
            const status = document.createElement('div');
            status.id = 'glp-pager-status';
            target.after(status);
        }

        pagerState.mode = isThreadList ? 'list' : 'thread';
        window.addEventListener('scroll', pagerScroll);
    }

    function pagerScroll() {
        if (pagerState.loading || pagerState.done) return;
        if (window.scrollY + window.innerHeight >= document.body.scrollHeight - 1000) {
            loadNextPage();
        }
    }

    async function loadNextPage() {
        pagerState.loading = true;
        const status = document.getElementById('glp-pager-status');
        if (status) { status.textContent = 'Loading...'; status.style.display = 'block'; }

        const nextNum = pagerState.page + 1;
        let base = window.location.href.split('?')[0].replace(/#.*$/, '');
        let nextUrl = base.match(/\/pg\d+/) ? base.replace(/\/pg\d+/, `/pg${nextNum}`) : `${base.replace(/\/$/, '')}/pg${nextNum}`;
        const search = window.location.search;
        if (search) nextUrl += search;

        try {
            const resp = await fetch(nextUrl);
            if (!resp.ok) throw new Error('fetch failed');
            const html = await resp.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');

            if (pagerState.mode === 'list') {
                const newRows = doc.querySelectorAll('table.threads tbody > tr:not(.threads_header_row)');
                if (newRows.length === 0) throw new Error('empty');
                const tbody = document.querySelector('table.threads tbody');
                // Add separator
                const sep = document.createElement('tr');
                sep.className = 'glp-page-sep';
                sep.innerHTML = `<td colspan="99">Page ${nextNum}</td>`;
                tbody.appendChild(sep);
                newRows.forEach(r => {
                    tbody.appendChild(r);
                });
                pagerState.page = nextNum;
                // Process new rows
                processThreadRows(tbody);
                applyPinned();
            } else {
                const newPosts = doc.querySelectorAll('table.msg tr[id^="reply"]');
                if (newPosts.length === 0) throw new Error('empty');
                const tbody = document.querySelector('table.msg tbody');
                const sep = document.createElement('tr');
                sep.className = 'glp-page-sep';
                sep.innerHTML = `<td colspan="99">Page ${nextNum}</td>`;
                tbody.appendChild(sep);
                newPosts.forEach(r => tbody.appendChild(r));
                pagerState.page = nextNum;
                setupQuotes(tbody);
                setupBlockButtons(tbody);
                applyUserBlocks(tbody);
                applyMemeFilter(tbody);
                applyGifFilter(tbody);
                applyAvatarFilter(tbody);
            }

            if (status) status.style.display = 'none';
        } catch {
            pagerState.done = true;
            if (status) status.textContent = 'End of content';
        }
        pagerState.loading = false;
    }

    // =========================================================================
    //  MUTATION OBSERVER
    // =========================================================================
    function observeDOM() {
        const observer = new MutationObserver(mutations => {
            let needsAdCheck = false;
            for (const m of mutations) {
                for (const node of m.addedNodes) {
                    if (node.nodeType !== 1) continue;
                    needsAdCheck = true;
                    // Check if new posts were added
                    if (node.matches?.('tr[id^="post_"]') || node.querySelector?.('tr[id^="post_"]')) {
                        applyMemeFilter(node.closest?.('table') || node);
                        applyUserBlocks(node.closest?.('table') || node);
                        applyGifFilter(node.closest?.('table') || node);
                        applyAvatarFilter(node.closest?.('table') || node);
                    }
                }
            }
            if (needsAdCheck && CFG.adBlocker) nukeAds();
        });
        observer.observe(document.body, { childList: true, subtree: true });
    }

})();