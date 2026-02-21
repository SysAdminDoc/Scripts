// ==UserScript==
// @name         GodLikeProductions Enhanced Suite
// @namespace    https://github.com/SysAdminDoc/GLP_Enhancement_Suite
// @version      9.0.0
// @description  Hides threads, blocks ads, bypasses nags, provides a modern UI, and other features for the GodLikeProductions forums.
// @author       Matthew Parker
// @match        https://www.godlikeproductions.com/*
// @match        https://godlike.com/*
// @require      http://ajax.googleapis.com/ajax/libs/jquery/3.6.0/jquery.min.js
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @run-at       document-start
// @downloadURL  https://github.com/SysAdminDoc/GLP_Enhancement_Suite/raw/refs/heads/main/GodLikeProductions%20Enhanced%20Suite.user.js
// @updateURL    https://github.com/SysAdminDoc/GLP_Enhancement_Suite/raw/refs/heads/main/GodLikeProductions%20Enhanced%20Suite.user.js
// ==/UserScript==

(function() {
    'use strict';

    // --- IMMEDIATE EXECUTION (to prevent theme and content flashing) ---
    const immediateConfig = {
        theme: GM_getValue('theme', 'saas-dark'),
        roundify: GM_getValue('roundify', false),
        squarify: GM_getValue('squarify', false),
        minimalistView: GM_getValue('minimalistView', true),
        hideBanner: GM_getValue('hideBanner', false),
        hideFooter: GM_getValue('hideFooter', true),
        hideRelatedThreads: GM_getValue('hideRelatedThreads', true),
        hideKarmaBar: GM_getValue('hideKarmaBar', true),
        hidePostActions: GM_getValue('hidePostActions', false),
        declutterTopNav: GM_getValue('declutterTopNav', true),
        declutterThreadNav: GM_getValue('declutterThreadNav', false),
        declutterPolls: GM_getValue('declutterPolls', true),
        declutterLastEdit: GM_getValue('declutterLastEdit', true),
        declutterSignatures: GM_getValue('declutterSignatures', true),
        declutterReportLinks: GM_getValue('declutterReportLinks', true),
        hidePageTopLinks2: GM_getValue('hidePageTopLinks2', false),
        hideTabNav: GM_getValue('hideTabNav', true),
        hideThreadTitle: GM_getValue('hideThreadTitle', true),
        hideRightPanelBox: GM_getValue('hideRightPanelBox', true),
        hideThreadsHeader: GM_getValue('hideThreadsHeader', true),
        // Display+ Options (Early Load)
        displayCompactPosts: GM_getValue('displayCompactPosts', true),
        displayWiderContent: GM_getValue('displayWiderContent', true),
        displayCompactQuotes: GM_getValue('displayCompactQuotes', true),
        displayHideUserID: GM_getValue('displayHideUserID', false),
        displayHideGeoLocation: GM_getValue('displayHideGeoLocation', false),
        displayHidePostDate: GM_getValue('displayHidePostDate', false),
        displayCompactThreadList: GM_getValue('displayCompactThreadList', true),
        displayHighlightPinned: GM_getValue('displayHighlightPinned', true),
        displayStickyNav: GM_getValue('displayStickyNav', false),
        displaySmoothScrolling: GM_getValue('displaySmoothScrolling', true),
        displayFontSize: GM_getValue('displayFontSize', 14),
        displayLineHeight: GM_getValue('displayLineHeight', 1.6),
        displayQuoteBorderColor: GM_getValue('displayQuoteBorderColor', '#007BFF'),
    };

    document.documentElement.setAttribute('data-theme', immediateConfig.theme);
    if (immediateConfig.roundify) document.documentElement.classList.add('roundify-theme');
    if (immediateConfig.squarify) document.documentElement.classList.add('squarify-theme');
    if (immediateConfig.minimalistView) document.documentElement.classList.add('minimalist-view');
    if (immediateConfig.hideKarmaBar) document.documentElement.classList.add('declutter-karma');
    if (immediateConfig.hidePostActions) document.documentElement.classList.add('declutter-postactions');
    if (immediateConfig.hidePageTopLinks2) document.documentElement.classList.add('declutter-pagetoplinks2');
    if (immediateConfig.hideTabNav) document.documentElement.classList.add('declutter-tabnav');
    if (immediateConfig.hideThreadTitle) document.documentElement.classList.add('declutter-threadtitle');
    if (immediateConfig.hideRightPanelBox) document.documentElement.classList.add('declutter-rightpanelbox');
    if (immediateConfig.hideThreadsHeader) document.documentElement.classList.add('declutter-threadsheader');
    // Display+ Early Classes
    if (immediateConfig.displayCompactPosts) document.documentElement.classList.add('display-compact-posts');
    if (immediateConfig.displayWiderContent) document.documentElement.classList.add('display-wider-content');
    if (immediateConfig.displayCompactQuotes) document.documentElement.classList.add('display-compact-quotes');
    if (immediateConfig.displayHideUserID) document.documentElement.classList.add('display-hide-userid');
    if (immediateConfig.displayHideGeoLocation) document.documentElement.classList.add('display-hide-geo');
    if (immediateConfig.displayHidePostDate) document.documentElement.classList.add('display-hide-postdate');
    if (immediateConfig.displayCompactThreadList) document.documentElement.classList.add('display-compact-threads');
    if (immediateConfig.displayHighlightPinned) document.documentElement.classList.add('display-highlight-pinned');
    if (immediateConfig.displayStickyNav) document.documentElement.classList.add('display-sticky-nav');
    if (immediateConfig.displaySmoothScrolling) document.documentElement.classList.add('display-smooth-scroll');

    // --- Professional Styling (CSS) ---
    GM_addStyle(`
        /* --- Font --- */
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

        /* --- Theme Definitions (Applied to HTML for early load) --- */
        html[data-theme='saas-dark'] {
            --bg-primary: #101010; --bg-secondary: #181818; --bg-tertiary: #222222;
            --text-primary: #EAEAEA; --text-secondary: #A0A0A0; --text-tertiary: #6B6B6B;
            --border-primary: #333333; --border-secondary: #252525;
            --accent-primary: #007BFF; --accent-secondary: #0056b3;
            --action-danger: #E53E3E; --action-danger-hover: #C53030;
            --action-success: #38A169;
            --shadow-sm: rgba(0, 0, 0, 0.2) 0px 2px 4px; --shadow-md: rgba(0, 0, 0, 0.4) 0px 5px 15px;
        }
        html[data-theme='cappuccino-mocha-dark'] {
            --bg-primary: #1E1E2E; --bg-secondary: #313244; --bg-tertiary: #45475A;
            --text-primary: #C6C8D1; --text-secondary: #A6ADC8; --text-tertiary: #7F849C;
            --border-primary: #585B70; --border-secondary: #45475A;
            --accent-primary: #89B4FA; --accent-secondary: #74C7EC;
            --action-danger: #F38BA8; --action-danger-hover: #E67E80;
            --action-success: #A6E3A1;
            --shadow-sm: rgba(0, 0, 0, 0.2) 0px 2px 4px; --shadow-md: rgba(0, 0, 0, 0.4) 0px 5px 15px;
        }
        html[data-theme='clean-light'] {
            --bg-primary: #FFFFFF; --bg-secondary: #F7F7F7; --bg-tertiary: #EAEAEA;
            --text-primary: #222222; --text-secondary: #555555; --text-tertiary: #888888;
            --border-primary: #E0E0E0; --border-secondary: #D0D0D0;
            --accent-primary: #007BFF; --accent-secondary: #0056b3;
            --action-danger: #E53E3E; --action-danger-hover: #C53030;
            --action-success: #38A169;
            --shadow-sm: rgba(0, 0, 0, 0.05) 0px 2px 4px; --shadow-md: rgba(0, 0, 0, 0.1) 0px 5px 15px;
        }

        /* --- FOUC Prevention & Declutter Styles --- */
        html.minimalist-view table.threads .vfr,
        html.minimalist-view table.threads .vifr,
        html.minimalist-view table.threads .pfr,
        html.minimalist-view table.threads .rfr,
        html.minimalist-view table.threads .mfr,
        html.minimalist-view table.threads .hfr { display: none; }
        html.declutter-karma .karmabar_wrapper { display: none !important; }
        html.declutter-postactions .post_actions { display: none !important; }
        html.declutter-pagetoplinks2 .pagetoplinks2 { display: none !important; }
        html.declutter-tabnav .tabnav { display: none !important; }
        html.declutter-threadtitle .title { display: none !important; }
        html.declutter-rightpanelbox .rightpanel_ipad > div:nth-of-type(2) { display: none !important; }
        html.declutter-threadsheader .threads_header_row { display: none !important; }
        ${Object.keys(immediateConfig).filter(k => k.startsWith('hide') || k.startsWith('declutter')).map(key =>
            immediateConfig[key] ? `html.${key.replace(/([A-Z])/g, "-$1").toLowerCase()}` : ''
        ).join(',\n') + `{visibility: hidden;}`}
        ${immediateConfig.hideBanner ? `html .hdr_banner { display: none !important; }` : ''}
        ${immediateConfig.hideFooter ? `html #footer { display: none !important; }` : ''}
        ${immediateConfig.hideRelatedThreads ? `html table.threads.related { display: none !important; }` : ''}
        ${immediateConfig.declutterTopNav ? `html .rightpanel_ipad > .topnav { display: none !important; }` : ''}
        ${immediateConfig.declutterThreadNav ? `html .topnav:has(.messagebottomnavlinks) { display: none !important; }` : ''}
        ${immediateConfig.declutterPolls ? `html form[action="/bbs/vote.php"] { display: none !important; }` : ''}
        ${immediateConfig.declutterLastEdit ? `html span.lastedit { display: none !important; }` : ''}
        ${immediateConfig.declutterSignatures ? `html .sig1, html .sig2 { display: none !important; }` : ''}
        ${immediateConfig.declutterReportLinks ? `html a[href*="/abusive"], html a[href*="/copyright"] { display: none !important; }` : ''}

        /* --- Display+ Early Styles --- */
        html.display-compact-posts .messageauthor,
        html.display-compact-posts .replyauthor { padding: 10px 12px !important; }
        html.display-compact-posts .messagecontent,
        html.display-compact-posts .replycontent { padding: 12px 15px !important; }
        html.display-compact-posts .author_inner { gap: 4px !important; }
        html.display-compact-posts .post_hdr { padding-bottom: 6px !important; margin-bottom: 10px !important; }
        html.display-compact-posts .author_meta_post { margin-top: 5px !important; }

        html.display-wider-content .msg .msgcol_author { width: 130px !important; min-width: 130px !important; max-width: 130px !important; }
        @media (max-width: 900px) {
            html.display-wider-content .msg .msgcol_author { width: 100px !important; min-width: 100px !important; }
        }

        html.display-compact-quotes .quoteo { margin: 8px 0 !important; padding: 10px 14px !important; }
        html.display-compact-quotes .quotei { padding: 0 !important; font-size: 0.95em !important; }

        html.display-hide-userid .author_uid { display: none !important; }
        html.display-hide-geo .author_geo { display: none !important; }
        html.display-hide-postdate .author_date { display: none !important; }

        html.display-compact-threads table.threads td { padding: 8px 10px !important; }
        html.display-compact-threads table.threads .sfr { line-height: 1.4 !important; }
        html.display-compact-threads .mobile-thread-meta { font-size: 11px !important; margin-top: 5px !important; }

        html.display-highlight-pinned tr:has(span[title='Pinned Thread']),
        html.display-highlight-pinned tr:has(span[title='Karma Pin']) {
            background: linear-gradient(90deg, rgba(0, 123, 255, 0.08) 0%, transparent 60%) !important;
            border-left: 3px solid var(--accent-primary) !important;
        }

        html.display-sticky-nav .thread_top_controls,
        html.display-sticky-nav .topnav.topnav_main {
            position: sticky !important;
            top: 0 !important;
            z-index: 1000 !important;
            background: var(--bg-secondary) !important;
            box-shadow: var(--shadow-sm);
        }

        html.display-smooth-scroll { scroll-behavior: smooth !important; }

        /* --- User Blocker & Meme Filter Styles --- */
        .glp-block-btn { background-color: var(--action-danger); color: white; border: none; padding: 4px 8px; border-radius: 5px; cursor: pointer; font-size: 11px; font-weight: bold; margin-top: 5px; display: inline-block; transition: background-color 0.2s; }
        .glp-block-btn:hover { background-color: var(--action-danger-hover); }
        tr.glp-user-blocked, tr.glp-meme-hidden { display: none !important; }
        .blocking-list-controls { display: flex; gap: 10px; margin-bottom: 10px; align-items: center; }
        .blocking-list-controls input { flex-grow: 1; }
        .scrollable-list { max-height: 250px; min-height: 100px; overflow-y: auto; background: var(--bg-tertiary); padding: 10px; border-radius: 8px; border: 1px solid var(--border-primary); }
        .list-item { display: flex; justify-content: space-between; align-items: center; padding: 8px 5px; border-bottom: 1px solid var(--border-secondary); }
        .list-item:last-child { border-bottom: none; }
        .list-item-title { flex-grow: 1; margin-right: 15px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .list-item-action-btn { background: var(--bg-primary); border: 1px solid var(--border-primary); color: var(--text-secondary); cursor: pointer; padding: 2px 8px; border-radius: 4px; flex-shrink: 0; }
        .list-item-action-btn:hover { background: var(--action-danger); color: white; }


        /* --- Autopager Styles --- */
        .glp-pager-separator td { text-align: center; padding: 15px; font-size: 14px; color: var(--text-tertiary); background: var(--bg-secondary); border-top: 2px solid var(--border-primary); border-bottom: 2px solid var(--border-primary); }
        #autopager-loading { text-align: center; padding: 20px; font-weight: bold; color: var(--text-secondary); background: var(--bg-primary); }
        .pages, .navpages, .navbottom { transition: opacity 0.3s ease; }

        /* --- Base & Layout --- */
        html[data-theme] body { font-family: 'Inter', sans-serif; background: var(--bg-primary) !important; color: var(--text-primary) !important; line-height: 1.6; transition: background 0.3s ease, color 0.3s ease; }
        #sitewrap, #wrap_in, html[data-theme] body, html { width: 100% !important; max-width: 100% !important; min-width: auto !important; box-sizing: border-box; overflow-x: hidden; background: transparent !important; }
        #content-wrap, .main-content-box { width: 95% !important; max-width: 1600px !important; margin: 0 auto !important; }
        #header { position: fixed; top: 0; left: 0; width: 100%; z-index: 10001; transition: top 0.4s ease-in-out; border-bottom: 1px solid var(--border-primary); background: var(--bg-secondary); }

        /* --- Header Handle & Integrated Settings Button --- */
        #header-handle { position: fixed; top: 0; left: 50%; transform: translateX(-50%); width: auto; height: 35px; background: var(--bg-tertiary); color: var(--text-secondary); text-align: center; border-radius: 0 0 12px 12px; z-index: 10002; box-shadow: var(--shadow-md); transition: all 0.3s ease; display: flex; align-items: center; padding: 0 10px; }
        #homepage-link { display:flex; align-items: center; gap: 8px; padding: 0 15px; font-size: 13px; user-select: none; height: 100%; color: var(--text-secondary); text-decoration: none !important; }
        #homepage-link:hover { color: var(--text-primary); }
        #open-settings-btn { background: transparent; border: none; border-left: 1px solid var(--border-primary); height: 100%; padding: 0 12px; cursor: pointer; line-height: 0; }
        #open-settings-btn:hover svg { fill: var(--accent-primary); }
        #open-settings-btn svg { width: 22px; height: 22px; fill: var(--text-secondary); transition: all 0.2s ease; }
        #open-settings-btn:hover svg { transform: rotate(15deg); }

        /* --- Settings Panel --- */
        #settings-panel { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) scale(0.95); width: 950px; max-width: 95%; background: var(--bg-primary); border: 1px solid var(--border-primary); border-radius: 16px; box-shadow: var(--shadow-md); z-index: 10004; opacity: 0; visibility: hidden; transition: opacity 0.3s ease, visibility 0.3s ease, transform 0.3s ease; display: flex; flex-direction: column; height: 85vh; }
        #settings-panel.visible { opacity: 1; visibility: visible; transform: translate(-50%, -50%) scale(1); }
        .settings-header { display: flex; justify-content: space-between; align-items: center; padding: 15px 25px; background: var(--bg-secondary); border-radius: 16px 16px 0 0; border-bottom: 1px solid var(--border-primary); flex-shrink: 0; }
        .settings-header h2 { margin: 0; font-size: 20px; color: var(--text-primary); display: flex; align-items: center; gap: 12px; font-weight: 600; flex: 1; }
        .settings-header svg { fill: var(--accent-primary); width: 24px; height: 24px; }
        .settings-preset-toggle { flex: 2; text-align: center; padding: 0 20px; }
        #close-settings { background: none; border: none; cursor: pointer; padding: 5px; border-radius: 50%; line-height: 0; flex-shrink: 0; }
        #close-settings svg { width: 20px; height: 20px; fill: var(--text-secondary); transition: fill 0.2s ease, transform 0.3s ease; }
        #close-settings:hover svg { fill: var(--action-danger); transform: rotate(90deg); }
        .settings-body { display: flex; flex-grow: 1; overflow: hidden; }
        .settings-tabs { width: 180px; flex-shrink: 0; border-right: 1px solid var(--border-primary); background: var(--bg-secondary); padding: 15px 0; display: flex; flex-direction: column; }
        .tab-btn { display: block; width: 100%; background: none; border: none; text-align: left; padding: 12px 18px; font-size: 14px; color: var(--text-secondary); cursor: pointer; border-left: 3px solid transparent; transition: all 0.2s ease; }
        .tab-btn:hover { background: var(--bg-tertiary); color: var(--text-primary); }
        .tab-btn.active { color: var(--text-primary); font-weight: 600; border-left-color: var(--accent-primary); background: var(--bg-tertiary); }
        .tab-btn .tab-icon { margin-right: 8px; opacity: 0.7; }
        .settings-content { padding: 25px; flex-grow: 1; overflow-y: auto; }
        .settings-pane { display: none; flex-direction: column; gap: 12px; }
        .settings-pane.active { display: flex; }
        .settings-section-header { font-size: 16px; color: var(--accent-primary); border-bottom: 1px solid var(--border-primary); padding-bottom: 8px; margin: 20px 0 8px 0; font-weight: 600; display: flex; align-items: center; gap: 8px; }
        .settings-section-header:first-child { margin-top: 0; }
        .settings-section-header svg { width: 18px; height: 18px; fill: var(--accent-primary); }
        .setting-row { display: grid; grid-template-columns: 1fr auto; align-items: center; gap: 15px; padding: 14px 16px; background: var(--bg-secondary); border-radius: 10px; border: 1px solid var(--border-secondary); transition: border-color 0.2s, background 0.2s; }
        .setting-row:hover { border-color: var(--border-primary); background: var(--bg-tertiary); }
        .setting-row label { font-size: 14px; color: var(--text-primary); cursor: pointer; }
        .setting-row small { color: var(--text-secondary); grid-column: 1 / 2; margin-top: -8px; font-size: 12px; line-height: 1.4; }
        .switch { position: relative; display: inline-block; width: 48px; height: 26px; }
        .switch input { opacity: 0; width: 0; height: 0; }
        .slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: var(--bg-tertiary); transition: 0.3s; border-radius: 26px; }
        .slider:before { position: absolute; content: ""; height: 18px; width: 18px; left: 4px; bottom: 4px; background-color: white; transition: 0.3s; border-radius: 50%; }
        input:checked + .slider { background-color: var(--accent-primary); }
        input:checked + .slider:before { transform: translateX(22px); }
        input:disabled + .slider { cursor: not-allowed; opacity: 0.5; }

        /* --- Custom Input Styles for Display+ --- */
        .setting-row-inline { display: flex; align-items: center; gap: 15px; padding: 14px 16px; background: var(--bg-secondary); border-radius: 10px; border: 1px solid var(--border-secondary); }
        .setting-row-inline label { font-size: 14px; color: var(--text-primary); flex: 1; }
        .setting-row-inline input[type="number"],
        .setting-row-inline input[type="text"] {
            width: 80px;
            padding: 8px 12px;
            background: var(--bg-tertiary);
            border: 1px solid var(--border-primary);
            border-radius: 6px;
            color: var(--text-primary);
            font-size: 14px;
            text-align: center;
        }
        .setting-row-inline input[type="color"] {
            width: 50px;
            height: 36px;
            padding: 2px;
            background: var(--bg-tertiary);
            border: 1px solid var(--border-primary);
            border-radius: 6px;
            cursor: pointer;
        }
        .setting-row-inline .input-suffix {
            color: var(--text-tertiary);
            font-size: 12px;
            margin-left: -8px;
        }

        /* Settings Grid for Display+ */
        .settings-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
        @media (max-width: 800px) { .settings-grid { grid-template-columns: 1fr; } }

        /* --- Buttons --- */
        .glp-btn { background-color: var(--accent-primary); color: white; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; transition: all 0.3s ease; font-weight: 500; font-size: 14px; }
        .glp-btn:hover { background-color: var(--accent-secondary); box-shadow: 0 4px 12px rgba(0, 123, 255, 0.3); }
        .glp-btn.danger { background-color: var(--action-danger); }
        .glp-btn.danger:hover { background-color: var(--action-danger-hover); box-shadow: 0 4px 12px rgba(229, 62, 62, 0.3); }

        /* --- Theme Selector --- */
        .theme-selector { display: flex; gap: 10px; }
        .theme-option { cursor: pointer; padding: 10px; border-radius: 8px; border: 2px solid var(--border-primary); transition: all 0.2s ease; }
        .theme-option.selected { border-color: var(--accent-primary); background-color: var(--bg-secondary); }
        .theme-option span { display: block; width: 40px; height: 20px; border-radius: 4px; }
        .theme-option[data-theme-name="saas-dark"] span { background: #181818; }
        .theme-option[data-theme-name="cappuccino-mocha-dark"] span { background: #313244; }
        .theme-option[data-theme-name="clean-light"] span { background: #F7F7F7; border: 1px solid #E0E0E0;}

        /* --- Toast Notification --- */
        #toast-notification { position: fixed; bottom: 30px; left: 50%; transform: translate(-50%, 150px); background: var(--bg-tertiary); color: var(--text-primary); padding: 16px 32px; border-radius: 12px; box-shadow: var(--shadow-md); z-index: 10005; opacity: 0; visibility: hidden; transition: all 0.4s cubic-bezier(0.25, 1, 0.5, 1); font-size: 16px; border-left: 4px solid var(--action-success); }
        #toast-notification.show { transform: translate(-50%, 0); opacity: 1; visibility: visible; }

        /* --- Feature Specific Styles --- */
        .glp-suite-hidden-thread { display: none !important; }
        .glp-suite-hide-cell { width: 40px; text-align: center; }
        .glp-suite-hide-btn { cursor: pointer; font-size: 10px; color: var(--text-tertiary); border: 1px solid var(--border-primary); padding: 2px 5px; border-radius: 4px; transition: all 0.2s ease; }
        .glp-suite-hide-btn:hover { color: white; background: var(--action-danger); border-color: var(--action-danger); }

        /* --- Thread Controls --- */
        #thread-controls { margin: 15px 0; padding: 10px; background: var(--bg-secondary); border: 1px solid var(--border-primary); border-radius: 12px; display: flex; flex-wrap: wrap; gap: 10px; align-items: center; justify-content: center; }
        .sort-group { display: flex; align-items: center; }
        .sort-btn { background-color: var(--bg-tertiary); color: var(--text-secondary); border: 1px solid var(--border-primary); padding: 6px 12px; cursor: pointer; transition: all 0.2s ease; font-size: 13px; }
        .sort-btn:hover { background-color: var(--accent-primary); color: white; border-color: var(--accent-primary); }
        .sort-btn.main { border-radius: 6px 0 0 6px; }
        .sort-btn.asc, .sort-btn.desc { border-radius: 0; border-left: none; padding: 6px 8px; }
        .sort-btn.desc { border-radius: 0 6px 6px 0; }
        .sort-btn.active { background-color: var(--accent-secondary); color: white; border-color: var(--accent-secondary); }
        .control-separator { width: 1px; background: var(--border-primary); align-self: stretch; margin: 0 5px; }
        .action-btn { background-color: var(--bg-tertiary); color: var(--text-secondary); border: 1px solid var(--border-primary); padding: 6px 12px; cursor: pointer; transition: all 0.2s ease; font-size: 13px; border-radius: 6px; }
        .action-btn:hover { background-color: var(--accent-primary); color: white; border-color: var(--accent-primary); }
        .action-btn.danger:hover { background-color: var(--action-danger); border-color: var(--action-danger); }

        /* Collapsible Quotes */
        .quote-toggle { margin-bottom: 5px; }
        .quote-toggle-btn { cursor: pointer; background: var(--bg-tertiary); color: var(--text-secondary); padding: 4px 10px; border-radius: 6px; font-size: 12px; display: inline-block; user-select: none; transition: all 0.2s ease; border: 1px solid var(--border-primary); }
        .quote-toggle-btn:hover { background: var(--accent-primary); color: white; border-color: var(--accent-primary); }
        div.quotei.glp-collapsed { max-height: 25px; overflow: hidden; opacity: 0.6; padding-top: 0 !important; padding-bottom: 0 !important; border-left-width: 3px; border-left-style: dotted; }
        div.quotei { transition: max-height 0.4s ease-out, opacity 0.4s ease, padding 0.4s ease; background-color: var(--bg-secondary) !important; border-color: var(--accent-primary) !important; }
        div.quoteo { background: transparent !important; border-left: 3px solid var(--accent-primary) !important; }

        /* Site element theming */
        .hdr_banner, .hdr_top, #rightpanel_inner, .footer, .sitestats, .sitestats td, table.threads th, form[action*="/bbs/vote.php"], .tabnav, .tabnav li, .tabnav a, table.msg td.nav, table.msg td.navbottom, table.msg .msgtitle, .post_hdr { background: var(--bg-secondary) !important; color: var(--text-primary) !important; border-color: var(--border-primary) !important; }
        table.threads tr.even, table.threads tr.odd, table.msg .messagecontent, table.msg .replycontent, .replycontent.p2 { background: var(--bg-primary) !important; }
        table.threads tr:hover { background: var(--bg-secondary) !important; }
        table.threads tr.even { background: var(--bg-secondary) !important; }
        table.msg .messageauthor, table.msg .replyauthor, .replyauthor.p1, .replycontent.p1 { background: var(--bg-secondary) !important; }
        a, .thread a { color: var(--accent-primary) !important; text-decoration: none !important; }
        a:hover { color: var(--accent-secondary) !important; }
        table.threads, table.threads td { border-color: var(--border-primary) !important; }
        input, select, textarea { background: var(--bg-tertiary) !important; color: var(--text-primary) !important; border: 1px solid var(--border-primary) !important; border-radius: 6px; padding: 8px; }
        ::-webkit-scrollbar { width: 10px; background: var(--bg-primary); }
        ::-webkit-scrollbar-thumb { background: var(--bg-tertiary); border-radius: 5px; }
        ::-webkit-scrollbar-thumb:hover { background: var(--text-tertiary); }

        /* --- FIX for Dark Theme Text Color --- */
        html[data-theme='saas-dark'] body, html[data-theme='cappuccino-mocha-dark'] body { background-color: #212121 !important; }
        html[data-theme='saas-dark'] #wrap, html[data-theme='cappuccino-mocha-dark'] #wrap { background-color: #212121; }
        html[data-theme='saas-dark'] div.post_main, html[data-theme='cappuccino-mocha-dark'] div.post_main { color: #ffebee; }
        html[data-theme='saas-dark'] td.nav, html[data-theme='cappuccino-mocha-dark'] td.nav { border-style: none; }
        html[data-theme='saas-dark'] #wrap_in, html[data-theme='cappuccino-mocha-dark'] #wrap_in { border-style: none; }
        html[data-theme='saas-dark'] td.messageauthor, html[data-theme='cappuccino-mocha-dark'] td.messageauthor,
        html[data-theme='saas-dark'] td.replyauthor, html[data-theme='cappuccino-mocha-dark'] td.replyauthor,
        html[data-theme='saas-dark'] td.vifr, html[data-theme='cappuccino-mocha-dark'] td.vifr,
        html[data-theme='saas-dark'] td.pfr, html[data-theme='cappuccino-mocha-dark'] td.pfr,
        html[data-theme='saas-dark'] td.vfr, html[data-theme='cappuccino-mocha-dark'] td.vfr,
        html[data-theme='saas-dark'] td.hfr, html[data-theme='cappuccino-mocha-dark'] td.hfr,
        html[data-theme='saas-dark'] td.rfr, html[data-theme='cappuccino-mocha-dark'] td.rfr,
        html[data-theme='saas-dark'] td.mfr, html[data-theme='cappuccino-mocha-dark'] td.mfr { color: #fafafa; }
        html[data-theme='saas-dark'] table.threads td, html[data-theme='cappuccino-mocha-dark'] table.threads td { color: var(--text-secondary); }
        html[data-theme='saas-dark'] table.threads .tfr a, html[data-theme='cappuccino-mocha-dark'] table.threads .tfr a { color: var(--text-primary) !important; }

        /* Shape Theming */
        html.roundify-theme .glp-btn, html.roundify-theme #settings-panel, html.roundify-theme .setting-row, html.roundify-theme input, html.roundify-theme select, html.roundify-theme textarea, html.roundify-theme .theme-option, html.roundify-theme #toast-notification, html.roundify-theme #thread-controls, html.roundify-theme .sort-btn, html.roundify-theme .action-btn, html.roundify-theme .glp-loading-indicator, html.roundify-theme .quote-toggle-btn, html.roundify-theme .post_wrap { border-radius: 12px !important; }
        html.roundify-theme .slider { border-radius: 34px !important; }
        html.roundify-theme #header-handle { border-radius: 0 0 16px 16px !important; }
        html.squarify-theme * { border-radius: 0 !important; }

        /* --- Keyboard Shortcut Indicator --- */
        .glp-kb-focused { outline: 2px solid var(--accent-primary) !important; outline-offset: -2px; }
    `);

    // --- DEFERRED EXECUTION (DOM manipulation) ---
    $(document).ready(init);

    // --- State & Configuration ---
    let config = {
        // Preset
        nonAccountPreset: GM_getValue('nonAccountPreset', false),
        // General
        adBlocker: GM_getValue('adBlocker', true),
        bypassNag: GM_getValue('bypassNag', true),
        bypassClubNag: GM_getValue('bypassClubNag', true),
        autoPager: GM_getValue('autoPager', true),
        // Appearance
        theme: GM_getValue('theme', 'saas-dark'),
        roundify: GM_getValue('roundify', false),
        squarify: GM_getValue('squarify', false),
        minimalistView: GM_getValue('minimalistView', true),
        // Content Filtering
        collapsibleQuotes: GM_getValue('collapsibleQuotes', true),
        collapseQuotesByDefault: GM_getValue('collapseQuotesByDefault', true),
        sortByNew: GM_getValue('sortByNew', false),
        hideMemeReplies: GM_getValue('hideMemeReplies', true),
        hideAvatars: GM_getValue('hideAvatars', false),
        hideBoomerGifs: GM_getValue('hideBoomerGifs', false),
        // Blocking
        manualThreadHiding: GM_getValue('manualThreadHiding', true),
        blockedUsers: JSON.parse(GM_getValue('blockedUsers', '[]')),
        hiddenThreads: JSON.parse(GM_getValue('hiddenThreads', '[]')),
        // Declutter
        hidePinnedThreads: GM_getValue('hidePinnedThreads', true),
        hideBanner: GM_getValue('hideBanner', false),
        hideFooter: GM_getValue('hideFooter', true),
        hideRelatedThreads: GM_getValue('hideRelatedThreads', true),
        hideKarmaBar: GM_getValue('hideKarmaBar', true),
        hidePostActions: GM_getValue('hidePostActions', false),
        declutterTopNav: GM_getValue('declutterTopNav', true),
        declutterThreadNav: GM_getValue('declutterThreadNav', false),
        declutterPolls: GM_getValue('declutterPolls', true),
        declutterLastEdit: GM_getValue('declutterLastEdit', true),
        declutterSignatures: GM_getValue('declutterSignatures', true),
        declutterReportLinks: GM_getValue('declutterReportLinks', true),
        hidePageTopLinks2: GM_getValue('hidePageTopLinks2', false),
        hideTabNav: GM_getValue('hideTabNav', true),
        hideThreadTitle: GM_getValue('hideThreadTitle', true),
        hideRightPanelBox: GM_getValue('hideRightPanelBox', true),
        hideThreadsHeader: GM_getValue('hideThreadsHeader', true),
        // Display+ Options
        displayCompactPosts: GM_getValue('displayCompactPosts', true),
        displayWiderContent: GM_getValue('displayWiderContent', true),
        displayCompactQuotes: GM_getValue('displayCompactQuotes', true),
        displayHideUserID: GM_getValue('displayHideUserID', false),
        displayHideGeoLocation: GM_getValue('displayHideGeoLocation', false),
        displayHidePostDate: GM_getValue('displayHidePostDate', false),
        displayCompactThreadList: GM_getValue('displayCompactThreadList', true),
        displayHighlightPinned: GM_getValue('displayHighlightPinned', true),
        displayStickyNav: GM_getValue('displayStickyNav', false),
        displaySmoothScrolling: GM_getValue('displaySmoothScrolling', true),
        displayFontSize: GM_getValue('displayFontSize', 14),
        displayLineHeight: GM_getValue('displayLineHeight', 1.6),
        displayQuoteBorderColor: GM_getValue('displayQuoteBorderColor', '#007BFF'),
        displayKeyboardShortcuts: GM_getValue('displayKeyboardShortcuts', true),
    };

    // --- State variables for Autopager ---
    let isPagerLoading = false;
    let currentPage = 1;
    let noMorePages = false;

    function saveConfig() {
        for (const key in config) {
            if (key !== 'hiddenThreads' && key !== 'blockedUsers') {
                GM_setValue(key, config[key]);
            }
        }
        GM_setValue('hiddenThreads', JSON.stringify(config.hiddenThreads));
        GM_setValue('blockedUsers', JSON.stringify(config.blockedUsers));
    }

    function buildUI() {
        $('body').prepend(`
            <div id="header-handle">
                <a id="homepage-link" href="https://www.godlikeproductions.com" title="Go to Homepage">
                    <span>Homepage</span>
                </a>
                <button id="open-settings-btn" title="Open Settings">
                    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41h-3.84 c-0.24,0-0.44,0.17-0.48,0.41L9.22,5.72C8.63,5.96,8.1,6.29,7.6,6.67L5.21,5.71C4.99,5.62,4.74,5.69,4.62,5.91L2.7,9.23 c-0.11,0.2-0.06,0.47,0.12,0.61l2.03,1.58C4.8,11.69,4.78,12,4.78,12.31c0,0.31,0.02,0.62,0.07,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.04,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.44-0.17,0.48-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0.01,0.59-0.22l1.92-3.32c0.11-0.2,0.06-0.47-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z"></path></svg>
                </button>
            </div>
        `);

        $('body').append(`
            <div id="settings-panel">
                <div class="settings-header">
                    <h2><svg viewBox="0 0 24 24" fill="currentColor"><path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41h-3.84 c-0.24,0-0.44,0.17-0.48,0.41L9.22,5.72C8.63,5.96,8.1,6.29,7.6,6.67L5.21,5.71C4.99,5.62,4.74,5.69,4.62,5.91L2.7,9.23 c-0.11,0.2-0.06,0.47,0.12,0.61l2.03,1.58C4.8,11.69,4.78,12,4.78,12.31c0,0.31,0.02,0.62,0.07,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.04,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.44-0.17,0.48-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0.01,0.59-0.22l1.92-3.32c0.11-0.2,0.06-0.47-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z"></path></svg>Enhanced Suite Settings</h2>
                    <div class="settings-preset-toggle">
                        ${createToggle('nonAccountPreset', 'Non-Account User Preset', 'Applies recommended settings for users without an account.')}
                    </div>
                    <button id="close-settings" title="Close"><svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg></button>
                </div>
                <div class="settings-body">
                    <div class="settings-tabs">
                        <button class="tab-btn active" data-tab="general"><span class="tab-icon">⚙</span>General</button>
                        <button class="tab-btn" data-tab="appearance"><span class="tab-icon">🎨</span>Appearance</button>
                        <button class="tab-btn" data-tab="display"><span class="tab-icon">📐</span>Display+</button>
                        <button class="tab-btn" data-tab="content"><span class="tab-icon">📝</span>Content</button>
                        <button class="tab-btn" data-tab="blocking"><span class="tab-icon">🚫</span>Blocking</button>
                        <button class="tab-btn" data-tab="declutter"><span class="tab-icon">🧹</span>Declutter</button>
                    </div>
                    <div class="settings-content">
                        <!-- General Tab -->
                        <div id="pane-general" class="settings-pane active">
                            ${createToggle('adBlocker', 'Persistent Ad-Blocker', 'Removes ad containers and sponsored content.')}
                            ${createToggle('bypassNag', 'Bypass Registration Nag', 'Automatically bypasses the registration nag screen.')}
                            ${createToggle('bypassClubNag', 'Bypass Country Club Nag', 'Automatically accepts the "Private Virtual Country Club" disclaimer.')}
                            ${createToggle('autoPager', 'Infinite Scroll (Autopager)', 'Automatically loads the next page when you scroll to the bottom.')}
                        </div>

                        <!-- Appearance Tab -->
                        <div id="pane-appearance" class="settings-pane">
                            ${createThemeSelector()}
                            ${createToggle('roundify', 'Roundify Theme', 'Makes all corners round for a softer look.')}
                            ${createToggle('squarify', 'Squarify Theme', 'Makes all corners square for a sharper look.')}
                            ${createToggle('minimalistView', 'Minimalist Thread View', 'Hides all columns except the title on the main thread list.')}
                        </div>

                        <!-- Display+ Tab (NEW) -->
                        <div id="pane-display" class="settings-pane">
                            <h3 class="settings-section-header">
                                <svg viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14z"/></svg>
                                Post Layout
                            </h3>
                            <div class="settings-grid">
                                ${createToggle('displayCompactPosts', 'Compact Posts', 'Reduces padding and spacing in posts for denser content.')}
                                ${createToggle('displayWiderContent', 'Wider Content Area', 'Narrows the author column to give more space to post content.')}
                                ${createToggle('displayCompactQuotes', 'Compact Quotes', 'Makes quoted content more compact with less padding.')}
                            </div>

                            <h3 class="settings-section-header">
                                <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/></svg>
                                Author Info Visibility
                            </h3>
                            <div class="settings-grid">
                                ${createToggle('displayHideUserID', 'Hide User ID', 'Hides the User ID number in posts.')}
                                ${createToggle('displayHideGeoLocation', 'Hide Geo Location', 'Hides the country/location flag and text.')}
                                ${createToggle('displayHidePostDate', 'Hide Post Date', 'Hides the date/time below the author name.')}
                            </div>

                            <h3 class="settings-section-header">
                                <svg viewBox="0 0 24 24"><path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z"/></svg>
                                Thread List
                            </h3>
                            <div class="settings-grid">
                                ${createToggle('displayCompactThreadList', 'Compact Thread List', 'Reduces spacing in the thread list for more threads on screen.')}
                                ${createToggle('displayHighlightPinned', 'Highlight Pinned Threads', 'Adds a subtle accent to pinned/karma threads.')}
                            </div>

                            <h3 class="settings-section-header">
                                <svg viewBox="0 0 24 24"><path d="M12 8l-6 6 1.41 1.41L12 10.83l4.59 4.58L18 14z"/></svg>
                                Navigation & Scrolling
                            </h3>
                            <div class="settings-grid">
                                ${createToggle('displayStickyNav', 'Sticky Navigation', 'Keeps the thread navigation bar fixed at the top when scrolling.')}
                                ${createToggle('displaySmoothScrolling', 'Smooth Scrolling', 'Enables smooth animated scrolling throughout the site.')}
                                ${createToggle('displayKeyboardShortcuts', 'Keyboard Shortcuts', 'Enable keyboard navigation (J/K to navigate, O to open, T/B for top/bottom).')}
                            </div>

                            <h3 class="settings-section-header">
                                <svg viewBox="0 0 24 24"><path d="M3 17v2h6v-2H3zM3 5v2h10V5H3zm10 16v-2h8v-2h-8v-2h-2v6h2zM7 9v2H3v2h4v2h2V9H7zm14 4v-2H11v2h10zm-6-4h2V7h4V5h-4V3h-2v6z"/></svg>
                                Typography
                            </h3>
                            <div class="setting-row-inline">
                                <label for="displayFontSize-input">Font Size</label>
                                <input type="number" id="displayFontSize-input" value="${config.displayFontSize}" min="10" max="24" step="1">
                                <span class="input-suffix">px</span>
                            </div>
                            <div class="setting-row-inline">
                                <label for="displayLineHeight-input">Line Height</label>
                                <input type="number" id="displayLineHeight-input" value="${config.displayLineHeight}" min="1" max="2.5" step="0.1">
                            </div>
                            <div class="setting-row-inline">
                                <label for="displayQuoteBorderColor-input">Quote Border Color</label>
                                <input type="color" id="displayQuoteBorderColor-input" value="${config.displayQuoteBorderColor}">
                            </div>
                        </div>

                        <!-- Content Tab -->
                        <div id="pane-content" class="settings-pane">
                            ${createToggle('collapsibleQuotes', 'Collapsible Quotes', 'Adds a button to collapse long quotes in posts.')}
                            ${createToggle('collapseQuotesByDefault', 'Collapse Quotes by Default', 'Automatically collapses all quotes when a thread loads.')}
                            ${createToggle('sortByNew', 'Always Sort by Newest', 'Permanently sorts threads by newest post date.')}
                            ${createToggle('hideMemeReplies', 'Hide Meme Replies', 'Hides posts that only contain images/gifs with little or no text.')}
                            ${createToggle('hideAvatars', 'Hide Avatars', 'Hides user avatars in threads.')}
                            ${createToggle('hideBoomerGifs', 'Hide Boomer Gifs', 'Hides common reaction gifs and images from the /sm/ directory.')}
                        </div>

                        <!-- Blocking Tab -->
                        <div id="pane-blocking" class="settings-pane">
                            <h3 class="settings-section-header">
                                <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8 0-1.85.63-3.55 1.69-4.9L16.9 18.31C15.55 19.37 13.85 20 12 20zm6.31-3.1L7.1 5.69C8.45 4.63 10.15 4 12 4c4.42 0 8 3.58 8 8 0 1.85-.63 3.55-1.69 4.9z"/></svg>
                                User Blocker
                            </h3>
                            <div id="user-blocker-section">
                                <div class="blocking-list-controls">
                                    <input type="text" id="manual-block-input" placeholder="Enter User ID to block">
                                    <button id="manual-block-add" class="glp-btn">Add</button>
                                </div>
                                <div class="blocking-list-controls">
                                     <input type="text" id="blocked-user-search" placeholder="Search blocked users...">
                                </div>
                                <div class="scrollable-list" id="blocked-users-list-container"></div>
                            </div>

                            <h3 class="settings-section-header">
                                <svg viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14H5v-2h7v2zm5-4H5v-2h12v2zm0-4H5V7h12v2z"/></svg>
                                Manual Thread Hiding
                            </h3>
                             <div id="thread-hiding-section">
                                ${createToggle('manualThreadHiding', 'Enable Manual Thread Hiding', 'Adds a "Hide" button to each thread for manual filtering.')}
                                <div class="blocking-list-controls">
                                    <input type="text" id="hidden-thread-search" placeholder="Search hidden threads...">
                                    <button id="unhide-all" class="glp-btn danger">Unhide All</button>
                                </div>
                                <div class="scrollable-list" id="hidden-threads-list-container"></div>
                            </div>
                        </div>

                        <!-- Declutter Tab -->
                        <div id="pane-declutter" class="settings-pane">
                             ${createToggle('hidePinnedThreads', 'Hide Pinned & Karma Threads', 'Hides globally pinned and karma-pinned threads from the main list.')}
                            ${createToggle('hideBanner', 'Hide Main Site Header', 'Hides the top banner of the site.')}
                            ${createToggle('hideFooter', 'Hide Main Site Footer', 'Hides the bottom footer of the site.')}
                            ${createToggle('hideRelatedThreads', 'Hide Related Threads Table', 'Hides the "Related Threads" section at the bottom of a thread.')}
                            <h3 class="settings-section-header">
                                <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
                                Advanced Declutter
                            </h3>
                            ${createToggle('hideKarmaBar', 'Hide Karma Bar', 'Hides the karma bar in posts.')}
                            ${createToggle('hidePostActions', 'Hide Post Actions', 'Hides the post action links (e.g., reply, quote).')}
                            ${createToggle('declutterTopNav', 'Hide Forum Top Nav/Login', 'Hides the top navigation bar with login/user info.')}
                            ${createToggle('declutterThreadNav', 'Hide Thread Nav (Reply, etc)', 'Hides the navigation bar with "Reply", "Post New", etc., links within threads.')}
                            ${createToggle('declutterPolls', 'Hide "Rate this Thread" Polls', 'Hides the poll for rating a thread.')}
                            ${createToggle('declutterLastEdit', 'Hide "Last Edited by" Info', 'Hides the "Last edited by..." line in posts.')}
                            ${createToggle('declutterSignatures', 'Hide User Signatures', 'Hides user signatures at the bottom of posts.')}
                            ${createToggle('declutterReportLinks', 'Hide "Report Post" Links', 'Hides the "Report Abusive Post" links.')}
                            ${createToggle('hidePageTopLinks2', 'Hide Secondary Top Links', 'Hides the secondary links (FAQ, Search, etc.) at the top.')}
                            ${createToggle('hideTabNav', 'Hide Tab Navigation', 'Hides the main tab navigation (Forums, New Posts, etc.).')}
                            ${createToggle('hideThreadTitle', 'Hide Thread Title Block', 'Hides the main title block on a thread page.')}
                            ${createToggle('hideRightPanelBox', 'Hide Second Right Panel Box', 'Hides the second misc. box in the right sidebar.')}
                            ${createToggle('hideThreadsHeader', 'Hide Threads List Header', 'Hides the header row of the threads list (Author, Replies, etc.).')}
                        </div>
                    </div>
                </div>
            </div>
            <div id="toast-notification"></div>
        `);

        function createToggle(id, label, description = '') {
            const descriptionHtml = description ? `<small>${description}</small>` : '';
            return `<div class="setting-row" title="${description}"><label for="${id}-toggle">${label}</label><label class="switch"><input type="checkbox" id="${id}-toggle" ${config[id] ? 'checked' : ''}><span class="slider"></span></label>${descriptionHtml}</div>`;
        }

        function createThemeSelector() {
            return `<div class="setting-row">
                        <label>Color Theme</label>
                        <div class="theme-selector">
                            <div class="theme-option" data-theme-name="saas-dark" title="SaaS Dark (Default)"><span></span></div>
                            <div class="theme-option" data-theme-name="cappuccino-mocha-dark" title="Cappuccino Mocha"><span></span></div>
                            <div class="theme-option" data-theme-name="clean-light" title="Clean Light"><span></span></div>
                        </div>
                    </div>`;
        }

        // --- Event Handlers ---
        $('#open-settings-btn').on('click', () => {
            renderBlockedUsersList();
            renderHiddenThreadsList();
            $('#settings-panel').addClass('visible');
        });
        $('#close-settings').on('click', () => $('#settings-panel').removeClass('visible'));
        $(document).on('click', e => { if ($(e.target).is('#settings-panel')) $('#settings-panel').removeClass('visible'); });

        $('.tab-btn').on('click', function() {
            const tabId = $(this).data('tab');
            $('.tab-btn').removeClass('active');
            $(this).addClass('active');
            $('.settings-pane').removeClass('active');
            $(`#pane-${tabId}`).addClass('active');
        });

        $('input[type="checkbox"]').on('change', function() {
            const id = this.id.replace('-toggle', '');
            config[id] = this.checked;

            if (id === 'nonAccountPreset') {
                applyNonAccountPreset(this.checked);
            }
            if (id === 'roundify' && this.checked) { config.squarify = false; $('#squarify-toggle').prop('checked', false); }
            if (id === 'squarify' && this.checked) { config.roundify = false; $('#roundify-toggle').prop('checked', false); }
            saveConfig();
            showToast(`${$(this).closest('.setting-row, .settings-preset-toggle').find('label').first().text()} has been ${this.checked ? 'enabled' : 'disabled'}.`);

            applyShapeTheme();
            applyDisplayPlusClasses();
            runAllFeatures();
        });

        // Display+ number/color inputs
        $('#displayFontSize-input, #displayLineHeight-input, #displayQuoteBorderColor-input').on('change', function() {
            const id = this.id.replace('-input', '');
            const value = this.type === 'number' ? parseFloat(this.value) : this.value;
            config[id] = value;
            saveConfig();
            applyDisplayPlusStyles();
            showToast('Display setting updated.');
        });

        $('.theme-option').on('click', function() {
            const themeName = $(this).data('theme-name');
            config.theme = themeName;
            saveConfig();
            applyTheme(themeName);
            showToast(`Theme changed to ${$(this).attr('title')}.`);
        });

        $('#unhide-all').on('click', function() {
            if (confirm('Are you sure you want to show all manually hidden threads?')) {
                config.hiddenThreads = [];
                saveConfig();
                renderHiddenThreadsList();
                showToast('All hidden threads have been restored.');
                runAllFeatures();
            }
        });

        // Search Handlers
        $('#blocked-user-search').on('input', function() { renderBlockedUsersList($(this).val()); });
        $('#hidden-thread-search').on('input', function() { renderHiddenThreadsList($(this).val()); });

        // User Blocker Event Handlers
        $('#manual-block-add').on('click', () => {
            const userId = $('#manual-block-input').val().trim();
            if (userId && !isNaN(userId)) {
                addUserToBlocklist(userId, `User ID: ${userId}`);
                $('#manual-block-input').val('');
            } else {
                showToast('Invalid User ID.');
            }
        });

        applyNonAccountPreset(config.nonAccountPreset);
    }

    function showToast(message) {
        const toast = $('#toast-notification');
        toast.text(message).addClass('show');
        setTimeout(() => toast.removeClass('show'), 3000);
    }

    function applyTheme(themeName) {
        document.documentElement.setAttribute('data-theme', themeName);
        $('.theme-option').removeClass('selected');
        $(`.theme-option[data-theme-name="${themeName}"]`).addClass('selected');
    }

    function applyShapeTheme() {
        $('html').toggleClass('roundify-theme', config.roundify).toggleClass('squarify-theme', config.squarify);
    }

    // --- Display+ Functions ---
    function applyDisplayPlusClasses() {
        const classMap = {
            'display-compact-posts': config.displayCompactPosts,
            'display-wider-content': config.displayWiderContent,
            'display-compact-quotes': config.displayCompactQuotes,
            'display-hide-userid': config.displayHideUserID,
            'display-hide-geo': config.displayHideGeoLocation,
            'display-hide-postdate': config.displayHidePostDate,
            'display-compact-threads': config.displayCompactThreadList,
            'display-highlight-pinned': config.displayHighlightPinned,
            'display-sticky-nav': config.displayStickyNav,
            'display-smooth-scroll': config.displaySmoothScrolling,
        };

        Object.entries(classMap).forEach(([className, enabled]) => {
            $('html').toggleClass(className, enabled);
        });
    }

    function applyDisplayPlusStyles() {
        // Remove existing dynamic styles
        $('#glp-display-plus-dynamic').remove();

        // Create dynamic CSS based on settings
        const dynamicCSS = `
            body, .post_main, .sfr a, td, .replycontent, .messagecontent {
                font-size: ${config.displayFontSize}px !important;
            }
            .post_main {
                line-height: ${config.displayLineHeight} !important;
            }
            div.quoteo {
                border-left-color: ${config.displayQuoteBorderColor} !important;
            }
            div.quotei {
                border-color: ${config.displayQuoteBorderColor} !important;
            }
        `;

        $('head').append(`<style id="glp-display-plus-dynamic">${dynamicCSS}</style>`);
    }

    function initKeyboardShortcuts() {
        if (!config.displayKeyboardShortcuts) return;

        $(document).on('keydown', function(e) {
            // Don't trigger if typing in input
            if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) return;
            if ($('#settings-panel').hasClass('visible')) return;

            const key = e.key.toLowerCase();

            // j/k navigation
            if (key === 'j' || key === 'k') {
                const rows = $('table.threads tr:not(.threads_header_row):visible, table.msg tr[id^="post_"]:visible');
                if (rows.length === 0) return;

                let currentIndex = -1;
                rows.each(function(i) {
                    if ($(this).hasClass('glp-kb-focused')) currentIndex = i;
                });

                rows.removeClass('glp-kb-focused');

                let newIndex;
                if (key === 'j') {
                    newIndex = currentIndex < rows.length - 1 ? currentIndex + 1 : 0;
                } else {
                    newIndex = currentIndex > 0 ? currentIndex - 1 : rows.length - 1;
                }

                $(rows[newIndex]).addClass('glp-kb-focused');
                rows[newIndex].scrollIntoView({ behavior: 'smooth', block: 'center' });
            }

            // o or Enter to open thread
            if ((key === 'o' || key === 'enter') && !e.ctrlKey && !e.metaKey) {
                const focused = $('table.threads tr.glp-kb-focused .sfr a').first();
                if (focused.length) {
                    window.location.href = focused.attr('href');
                }
            }

            // t = scroll to top
            if (key === 't' && !e.ctrlKey) {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }

            // b = scroll to bottom
            if (key === 'b' && !e.ctrlKey) {
                window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
            }

            // Escape to close settings
            if (key === 'escape') {
                $('#settings-panel').removeClass('visible');
            }

            // ? to show shortcuts help
            if (key === '?' || (e.shiftKey && key === '/')) {
                showToast('Shortcuts: J/K navigate, O/Enter open, T top, B bottom, Esc close');
            }
        });
    }

    // --- Core Feature Logic ---
    function initHeader() {
        const $header = $('#header');
        if($header.length) {
            const headerHeight = $header.outerHeight();
            $('body').css('padding-top', `${headerHeight + 20}px`);
        }
    }

    function bypassNagScreen() {
        if (!config.bypassNag) return;
        if ($('body:contains("Why not register for a free account?")').length > 0 || $('body:contains("To continue reading this thread you must")').length > 0) {
            const bypassLink = $('p:contains("Otherwise, continue to the page you were about to visit by clicking") a[href*="?regp="], a[href*="&regp="]:contains("here")').first();
            if (bypassLink.length > 0) {
                window.location.href = bypassLink.attr('href');
            }
        }
    }

    function bypassCountryClubNag() {
        if (!config.bypassClubNag) return;
        const disclaimerText = $('b:contains("You are attempting to enter a Private Virtual Country Club.")');
        if (disclaimerText.length > 0) {
            $('#c1').prop('checked', true);
            $('#c2').prop('checked', true);
            $('input[type="submit"][name="disclaimer"]').click();
        }
    }

    function highlightActiveSortButton() {
        const params = new URLSearchParams(window.location.search);
        const sort = params.get('sort');
        const order = params.get('order');
        if (sort && order) {
            $(`.sort-btn[data-sort="${sort}"][data-order="${order}"]`).addClass('active');
        }
    }

    function buildSortControls() {
        const controls = [
            { label: 'Updated', key: 'updated' },
            { label: 'Posted', key: 'posted' },
            { label: 'Rating', key: 'rating' },
            { label: 'Views', key: 'views' },
            { label: 'Replies', key: 'replies' }
        ];

        let html = '';
        controls.forEach(control => {
            html += `
                <div class="sort-group">
                    <button class="sort-btn main" data-sort="${control.key}">${control.label}</button>
                    <button class="sort-btn asc" data-sort="${control.key}" data-order="asc" title="Sort Ascending">▲</button>
                    <button class="sort-btn desc" data-sort="${control.key}" data-order="desc" title="Sort Descending">▼</button>
                </div>
            `;
        });

        html += `<div class="control-separator"></div>`;
        html += `<button id="toggle-pinned-btn" class="action-btn">Toggle Pinned</button>`;
        html += `<button id="reset-view-btn" class="action-btn danger">Reset View</button>`;

        $('#thread-controls').html(html);

        // Add event listeners
        $('.sort-btn').on('click', function() {
            const sort = $(this).data('sort');
            const order = $(this).data('order') || 'desc';
            window.location.href = `https://www.godlikeproductions.com/forum1/pg1?sort=${sort}&order=${order}`;
        });

        $('#toggle-pinned-btn').on('click', () => {
            config.hidePinnedThreads = !config.hidePinnedThreads;
            $('#hidePinnedThreads-toggle').prop('checked', config.hidePinnedThreads);
            saveConfig();
            applyPinnedThreadsVisibility();
            showToast(`Pinned threads ${config.hidePinnedThreads ? 'hidden' : 'shown'}.`);
        });

        $('#reset-view-btn').on('click', () => {
            window.location.href = 'https://www.godlikeproductions.com/forum1/pg1';
        });

        highlightActiveSortButton();
    }

    function manageThreads(context = document) {
        const threadsTable = $('table.threads', context);
        if (!threadsTable.length) return;

        if (context === document && !$('#thread-controls').length) {
            threadsTable.before('<div id="thread-controls"></div>');
            buildSortControls();
        }

        if (threadsTable.find('tr.threads_header_row .glp-suite-hide-cell').length === 0) {
            threadsTable.find('tr.threads_header_row .sfr, tr.threads_header_row .sh').after('<th class="glp-suite-hide-cell">Hide</th>');
        }

        $('tbody > tr:not(.threads_header_row):not(.glp-pager-separator)', threadsTable).each(function() {
            const row = $(this);
            if (row.find('.glp-suite-hide-cell').length) return;
            const threadLink = row.find('.sfr a');
            if (!threadLink.length) return;
            const threadId = threadLink.attr('href');
            const threadTitle = threadLink.text().trim();
            row.find('.sfr').after('<td class="glp-suite-hide-cell"><span class="glp-suite-hide-btn" title="Hide this thread">Hide</span></td>');
            row.find('.glp-suite-hide-btn').on('click', function(e) {
                e.preventDefault(); e.stopPropagation();
                if (!config.hiddenThreads.find(t => (typeof t === 'object' ? t.id : t) === threadId)) {
                    config.hiddenThreads.push({ id: threadId, title: threadTitle });
                    saveConfig();
                    row.addClass('glp-suite-hidden-thread');
                    showToast('Thread hidden.');
                }
            });
            const isHidden = !!config.hiddenThreads.find(t => (typeof t === 'string' && t === threadId) || (typeof t === 'object' && t.id === threadId));
            row.toggleClass('glp-suite-hidden-thread', config.manualThreadHiding && isHidden);
        });
        $('.glp-suite-hide-cell').toggle(config.manualThreadHiding);
    }

    function initCollapsibleQuotes(context = document) {
        if (!config.collapsibleQuotes) {
            $('.quote-toggle', context).remove();
            $('div.quotei', context).removeClass('glp-collapsed');
            return;
        }
        $('div.quotei:not(.glp-quote-processed)', context).each(function() {
            const $quote = $(this).addClass('glp-quote-processed');
            const $toggleBtn = $('<div class="quote-toggle"><span class="quote-toggle-btn"></span></div>');
            $quote.before($toggleBtn);
            const isInitiallyCollapsed = config.collapseQuotesByDefault;
            $quote.toggleClass('glp-collapsed', isInitiallyCollapsed);
            $toggleBtn.find('.quote-toggle-btn').text(isInitiallyCollapsed ? 'Expand Quote' : 'Collapse Quote');
            $toggleBtn.on('click', function() {
                $quote.toggleClass('glp-collapsed');
                const isCollapsed = $quote.hasClass('glp-collapsed');
                $(this).find('.quote-toggle-btn').text(isCollapsed ? 'Expand Quote' : 'Collapse Quote');
            });
        });
    }

    function runSortByNew() {
        if (!config.sortByNew || window.location.pathname.includes('/message')) return;
        const params = new URLSearchParams(window.location.search);
        if (params.get('sort') !== 'posted' || params.get('order') !== 'desc') {
            params.set('sort', 'posted');
            params.set('order', 'desc');
            window.location.search = params.toString();
        }
    }

    function removeAds() {
        if (!config.adBlocker) return;
        const adSelectors = ['div[id^="ad-"]', '.msgad', 'div[data-type="_mgwidget"]', 'div.mgbox', 'amp-embed[type="mgid"]', 'center > div[style*="text-align: center"]'];
        $(adSelectors.join(', ')).each(function() {
            const adElement = $(this);
            if (adElement.closest('#g_m, #g_m_s').length > 0) return;
            let parentToRemove = adElement.closest('div[style*="margin-bottom"], center');
            (parentToRemove.length > 1 && parentToRemove.parent().prop('tagName') !== 'BODY' ? parentToRemove : adElement).remove();
        });
    }

    // --- Blockers & Filters ---
    function addUserToBlocklist(userId, userName) {
        const alreadyExists = config.blockedUsers.some(u => (typeof u === 'object' ? u.id : u) === userId);
        if (!alreadyExists) {
            config.blockedUsers.push({ id: userId, name: userName });
            saveConfig();
            renderBlockedUsersList();
            applyUserBlocks();
            showToast(`User ${userName} (${userId}) blocked.`);
        } else {
            showToast('User is already blocked.');
        }
    }

    function renderBlockedUsersList(filter = '') {
        const $listContainer = $('#blocked-users-list-container');
        if (!$listContainer.length) return;
        $listContainer.empty();
        const lowerCaseFilter = filter.toLowerCase();

        const filteredUsers = config.blockedUsers.filter(user => {
            if (typeof user === 'object' && user.name && user.id) {
                return user.name.toLowerCase().includes(lowerCaseFilter) || user.id.includes(filter);
            } else if (typeof user === 'string') {
                return user.includes(filter);
            }
            return false;
        });

        if (filteredUsers.length === 0) {
            $listContainer.text(filter ? 'No matching users found.' : 'No users blocked.');
            return;
        }

        filteredUsers.forEach(user => {
            const isObject = typeof user === 'object';
            const id = isObject ? user.id : user;
            const name = isObject ? user.name : `User ID: ${user}`;
            const $item = $(`<div class="list-item"><span class="list-item-title" title="${name} (ID: ${id})">${name}</span><button class="list-item-action-btn" data-id="${id}">Unblock</button></div>`);
            $listContainer.append($item);
        });

        $('.list-item-action-btn', $listContainer).on('click', function() {
            const userIdToRemove = $(this).data('id').toString();
            config.blockedUsers = config.blockedUsers.filter(u => (typeof u === 'object' ? u.id : u) !== userIdToRemove);
            saveConfig();
            renderBlockedUsersList($('#blocked-user-search').val());
            applyUserBlocks();
            showToast(`User ID ${userIdToRemove} unblocked.`);
        });
    }

    function renderHiddenThreadsList(filter = '') {
        const $listContainer = $('#hidden-threads-list-container');
        if (!$listContainer.length) return;
        $listContainer.empty();
        const lowerCaseFilter = filter.toLowerCase();

        const filteredThreads = config.hiddenThreads.filter(thread => {
            if (typeof thread === 'object' && thread.title) {
                return thread.title.toLowerCase().includes(lowerCaseFilter);
            } else if (typeof thread === 'string') {
                return thread.toLowerCase().includes(lowerCaseFilter);
            }
            return false;
        });

        if (filteredThreads.length === 0) {
            $listContainer.text(filter ? 'No matching threads found.' : 'No threads hidden.');
            return;
        }

        filteredThreads.forEach(thread => {
            const isObject = typeof thread === 'object';
            const id = isObject ? thread.id : thread;
            const title = isObject ? thread.title : `Legacy Entry: ${thread}`;
            const $item = $(`<div class="list-item"><span class="list-item-title" title="${title}">${title}</span><button class="list-item-action-btn" data-id="${id}">Unhide</button></div>`);
            $listContainer.append($item);
        });

        $('.list-item-action-btn', $listContainer).on('click', function() {
            const threadIdToUnhide = $(this).data('id');
            config.hiddenThreads = config.hiddenThreads.filter(t => (typeof t === 'object' ? t.id : t) !== threadIdToUnhide);
            saveConfig();
            renderHiddenThreadsList($('#hidden-thread-search').val());
            $(`tr a[href="${threadIdToUnhide}"]`).closest('tr').removeClass('glp-suite-hidden-thread');
            showToast(`Thread unhidden.`);
        });
    }

    function applyUserBlocks(context = document) {
        $('tr[class*="post_uid_"]', context).removeClass('glp-user-blocked');
        if (config.blockedUsers.length > 0) {
            config.blockedUsers.forEach(user => {
                const userId = typeof user === 'object' ? user.id : user;
                $(`tr.post_uid_${userId}`, context).addClass('glp-user-blocked');
            });
        }
    }

    function addUserBlockButtons(context = document) {
        $('td.replyauthor, td.messageauthor', context).each(function() {
            const $authorCell = $(this);
            if ($authorCell.find('.glp-block-btn').length > 0) return;
            const postRowClass = $authorCell.parent().attr('class');
            if (!postRowClass) return;
            const match = postRowClass.match(/post_uid_(\d+)/);
            if (match && match[1]) {
                const userId = match[1];
                const userName = $authorCell.contents().filter((_, el) => el.nodeType === 3).text().trim();
                const $blockBtn = $('<button class="glp-block-btn">Block User</button>');
                $blockBtn.on('click', () => addUserToBlocklist(userId, userName));
                $authorCell.append('<br />', $blockBtn);
            }
        });
    }

    function applyMemeFilter(context = document) {
        if (!config.hideMemeReplies) {
            $('tr[id^="post_"].glp-meme-hidden', context).removeClass('glp-meme-hidden').show();
            return;
        }
        $('tr[id^="post_"]', context).each(function() {
            const $post = $(this);
            const $postMain = $post.find('.post_main');
            if ($postMain.length === 0) return;

            const $contentClone = $postMain.clone();
            $contentClone.find('.quoteo, .sig1, .sig2, font[size="1"]').remove();

            const mediaCount = $contentClone.find('img, iframe, video').length;
            if (mediaCount === 0) return;

            const textContent = $contentClone.text().replace(/\s+/g, ' ').trim();
            if (textContent.length < 20) {
                $post.addClass('glp-meme-hidden').hide();
            }
        });
    }

    function applyBoomerGifsFilter(context = document) {
        const images = $('img[src*="/sm/"]', context);
        if (config.hideBoomerGifs) {
            images.hide();
        } else {
            images.show();
        }
    }

    function applyAvatarVisibility(context = document) {
        const avatars = $('img[src*="/av/"]', context);
        if (config.hideAvatars) {
            avatars.hide();
        } else {
            avatars.show();
        }
    }

    function applyPinnedThreadsVisibility(context = document) {
        $("tr.odd, tr.even", context).has("span[title='Pinned Thread'], span[title='Karma Pin']").toggle(!config.hidePinnedThreads);
    }

    // --- Autopager Engine ---
    const pagerConfigs = {
        main: { trigger: 'table.threads', content: 'table.threads tbody > tr:not(.threads_header_row)', insertionPoint: 'table.threads tbody', pagination: '.footer .navpages', scrollDistance: 800,
            onNewContent: (newContent) => {
                manageThreads(newContent.parent().parent());
                applyPinnedThreadsVisibility(newContent);
            }
        },
        thread: { trigger: 'table.msg', content: 'table.msg tr[id^="reply"]', insertionPoint: 'table.msg tbody', pagination: 'td.nav, td.navbottom', scrollDistance: 1200,
            onNewContent: (newContent) => {
                initCollapsibleQuotes(newContent);
                addUserBlockButtons(newContent);
                applyUserBlocks(newContent);
                applyMemeFilter(newContent);
                applyBoomerGifsFilter(newContent);
                applyAvatarVisibility(newContent);
            }
        }
    };

    function initPager() {
        $(window).off('scroll.pager');
        $('#autopager-loading').remove();
        noMorePages = false;
        isPagerLoading = false;
        if (!config.autoPager) return;
        const activeConfig = $(pagerConfigs.main.trigger).length ? pagerConfigs.main : ($(pagerConfigs.thread.trigger).length ? pagerConfigs.thread : null);
        if (activeConfig) runPager(activeConfig);
    }

    function runPager(pagerConfig) {
        const pageMatch = window.location.href.match(/\/pg(\d+)/);
        currentPage = pageMatch ? parseInt(pageMatch[1], 10) : 1;
        $(pagerConfig.trigger).after('<div id="autopager-loading" style="display:none;"></div>');
        $(pagerConfig.pagination).hide();
        $(window).on('scroll.pager', () => {
            if (isPagerLoading || noMorePages) return;
            if ($(window).scrollTop() + $(window).height() >= $(document).height() - pagerConfig.scrollDistance) {
                loadNextPage(pagerConfig);
            }
        });
    }

    function loadNextPage(pagerConfig) {
        isPagerLoading = true;
        const nextPageNum = currentPage + 1;
        let baseUrl = window.location.href.split('?')[0].replace(/#.*$/, '');
        let nextPageUrl = baseUrl.match(/\/pg\d+/) ? baseUrl.replace(/\/pg\d+/, `/pg${nextPageNum}`) : `${baseUrl.replace(/\/$/, '')}/pg${nextPageNum}`;
        const searchParams = window.location.search;
        if (searchParams) nextPageUrl += searchParams;
        $('#autopager-loading').text('Loading...').show();
        $.get(nextPageUrl).done(data => {
            const $html = $(data);
            const $newContent = $html.find(pagerConfig.content);
            if ($newContent.length) {
                currentPage++;
                const $separator = $(`<tr class="glp-pager-separator"><td colspan="100%">--- Page ${currentPage} ---</td></tr>`);
                $(pagerConfig.insertionPoint).append($separator, $newContent);
                pagerConfig.onNewContent($newContent);
            } else {
                noMorePages = true;
                $('#autopager-loading').text('End of list.');
            }
        }).fail(() => {
            noMorePages = true;
            $('#autopager-loading').text('End of list or error.');
        }).always(() => {
            isPagerLoading = false;
            if (!noMorePages) $('#autopager-loading').hide();
        });
    }

    // --- Preset Logic ---
    const presetKeys = [
        'adBlocker', 'bypassNag', 'bypassClubNag', 'autoPager', 'minimalistView',
        'collapsibleQuotes', 'collapseQuotesByDefault', 'hideMemeReplies', 'hideFooter',
        'hideRelatedThreads', 'hideKarmaBar', 'declutterTopNav', 'declutterPolls',
        'declutterLastEdit', 'declutterSignatures', 'declutterReportLinks', 'hideTabNav',
        'hideThreadTitle', 'hideRightPanelBox', 'hideThreadsHeader', 'hideBanner',
        'hidePostActions', 'declutterThreadNav', 'hidePageTopLinks2',
        // Display+ preset keys
        'displayCompactPosts', 'displayWiderContent', 'displayCompactQuotes',
        'displayCompactThreadList', 'displayHighlightPinned', 'displaySmoothScrolling'
    ];

    function applyNonAccountPreset(isApplied) {
        const defaults = {
            adBlocker: true, bypassNag: true, bypassClubNag: true, autoPager: true, minimalistView: true, collapsibleQuotes: true,
            collapseQuotesByDefault: true, hideMemeReplies: true, hideFooter: true, hideRelatedThreads: true, hideKarmaBar: true,
            declutterTopNav: true, declutterPolls: true, declutterLastEdit: true, declutterSignatures: true, declutterReportLinks: true,
            hideTabNav: true, hideThreadTitle: true, hideRightPanelBox: true, hideThreadsHeader: true, hideBanner: true,
            hidePostActions: true, declutterThreadNav: true, hidePageTopLinks2: true,
            // Display+ defaults for preset
            displayCompactPosts: true, displayWiderContent: true, displayCompactQuotes: true,
            displayCompactThreadList: true, displayHighlightPinned: true, displaySmoothScrolling: true
        };

        presetKeys.forEach(key => {
            const toggle = $(`#${key}-toggle`);
            if (isApplied) {
                config[key] = true;
                toggle.prop('checked', true).prop('disabled', true);
            } else {
                config[key] = GM_getValue(key, defaults[key] || false);
                toggle.prop('checked', config[key]).prop('disabled', false);
            }
        });
        saveConfig();
        applyDisplayPlusClasses();
        runAllFeatures();
    }

    // --- Main Execution Logic ---
    function runAllFeatures() {
        // Toggle classes on the HTML element for FOUC prevention
        $('html').toggleClass('minimalist-view', config.minimalistView);
        $('html').toggleClass('declutter-karma', config.hideKarmaBar);
        $('html').toggleClass('declutter-postactions', config.hidePostActions);
        $('html').toggleClass('declutter-pagetoplinks2', config.hidePageTopLinks2);
        $('html').toggleClass('declutter-tabnav', config.hideTabNav);
        $('html').toggleClass('declutter-threadtitle', config.hideThreadTitle);
        $('html').toggleClass('declutter-rightpanelbox', config.hideRightPanelBox);
        $('html').toggleClass('declutter-threadsheader', config.hideThreadsHeader);

        // Direct element hiding for elements that might not have a dedicated class
        $('.hdr_banner').toggle(!config.hideBanner);
        $('#footer').toggle(!config.hideFooter);
        $('table.threads.related').closest('.threads-wrapper').toggle(!config.hideRelatedThreads);
        $('.rightpanel_ipad > .topnav').toggle(!config.declutterTopNav);
        $('.topnav:has(.messagebottomnavlinks)').toggle(!config.declutterThreadNav);
        $('form[action="/bbs/vote.php"]').toggle(!config.declutterPolls);
        $('span.lastedit').toggle(!config.declutterLastEdit);
        $('.sig1, .sig2').toggle(!config.declutterSignatures);
        $('a[href*="/abusive"], a[href*="/copyright"]').toggle(!config.declutterReportLinks);

        // Run functions that apply to the whole page
        applyPinnedThreadsVisibility();

        if ($('table.threads').length) {
            manageThreads();
        }
        if ($('table.msg').length) {
            initCollapsibleQuotes();
            addUserBlockButtons();
            applyUserBlocks();
            applyMemeFilter();
            applyBoomerGifsFilter();
            applyAvatarVisibility();
        }
    }

    // --- Initialization ---
    function init() {
        // Calls that don't depend on the full DOM
        bypassNagScreen();
        bypassCountryClubNag();
        runSortByNew();

        // Build UI and apply initial styles
        buildUI();
        initHeader();
        applyDisplayPlusClasses();
        applyDisplayPlusStyles();
        initKeyboardShortcuts();
        runAllFeatures();
        removeAds();
        initPager();

        // Observer for dynamically loaded content
        const contentObserver = new MutationObserver((mutations) => {
            removeAds();
            for (const mutation of mutations) {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach(node => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            applyMemeFilter(node);
                            applyUserBlocks(node);
                            applyBoomerGifsFilter(node);
                            applyAvatarVisibility(node);
                        }
                    });
                }
            }
        });
        contentObserver.observe(document.body, { childList: true, subtree: true });

        $(window).on('load', initHeader);
    }
})();
