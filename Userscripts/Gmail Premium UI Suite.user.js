// ==UserScript==
// @name         Gmail Premium UI Suite
// @namespace    https://github.com/SysAdminDoc/MailPro-Enhancement-Suite
// @version      7.1
// @description  The ultimate Gmail transformation. 52 toggleable features: Simplify layout, tracker blocking, dark mode, thread declutter, and more.
// @author       Matthew Parker
// @match        https://mail.google.com/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @downloadURL  https://raw.githubusercontent.com/SysAdminDoc/MailPro-Enhancement-Suite/main/Gmail%20Premium%20UI%20Suite.user.js
// @updateURL    https://raw.githubusercontent.com/SysAdminDoc/MailPro-Enhancement-Suite/main/Gmail%20Premium%20UI%20Suite.meta.js
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    // ——————————————————————————————————————————————————————————————————————————
    //  ~ V7.1 UPDATES ~ "The Fix"
    //
    //  1. Fixed all :contains() CSS pseudo-selectors (not valid CSS) —
    //     replaced with [title=], [aria-label], and JS-based alternatives.
    //  2. Fixed Google Account bar selectors (.gb_*) that rotate every build —
    //     now uses aria-label attribute selectors that are stable.
    //  3. Fixed Gemini/AI selectors (.QT9oZc, .einvLd, etc.) — now uses
    //     JS-based text/attribute matching for resilience.
    //  4. Fixed dark mode to use self-contained CSS instead of stale external URL.
    //  5. Fixed collapseChatSidebar — CSS-only approach replacing fragile JS traversal.
    //  6. Fixed hideChatWithHoverLip — broadened selector from .aeN.WR.a6o.
    //  7. Fixed squarifyTheme — scoped to exclude dropdowns/popovers/tooltips.
    //  8. Fixed fmtToolbar observer — added subtree:true to find compose windows.
    //  9. Fixed showEmail observer — added debounce to prevent performance death.
    // 10. Fixed blockTrackerPixels — uses data URI instead of removing src.
    // 11. Fixed trustedTypes — graceful fallback when Gmail's own policy blocks ours.
    // 12. Fixed simplifyInbox — read messages no longer look broken on hover.
    // 13. Fixed inboxPause — SVG icons instead of unicode chars.
    // 14. All features now use resilient aria-label/role/data-* selectors where possible.
    //
    // ——————————————————————————————————————————————————————————————————————————


    // —————————————————————
    // TRUSTED TYPES POLICY
    // —————————————————————
    let gmTrustedPolicy = null;
    try {
        if (window.trustedTypes && trustedTypes.createPolicy) {
            gmTrustedPolicy = trustedTypes.createPolicy('gmPremium', {
                createHTML: (s) => s,
            });
        }
    } catch (e) { /* Gmail may already have a default policy or restrict creation */ }

    function safeSetHTML(el, html) {
        try {
            el.innerHTML = gmTrustedPolicy ? gmTrustedPolicy.createHTML(html) : html;
        } catch (e) {
            // Fallback: build via textContent (no HTML rendering)
            el.textContent = html.replace(/<[^>]+>/g, '');
        }
    }


    // —————————————————————
    // 0. DYNAMIC CONTENT HIDING ENGINE
    // —————————————————————
    let dynamicHidingObserver = null;
    const activeHidingRules = new Map();

    const observerCallback = (mutationsList) => {
        for (const mutation of mutationsList) {
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === 1) {
                        for (const rule of activeHidingRules.values()) {
                            try { rule(node); } catch (e) {
                                console.error('[Gmail Premium] Hiding rule error:', e);
                            }
                        }
                    }
                });
            }
        }
    };

    function startObserver() {
        if (dynamicHidingObserver) return;
        dynamicHidingObserver = new MutationObserver(observerCallback);
        dynamicHidingObserver.observe(document.body, { childList: true, subtree: true });
    }
    function stopObserver() {
        if (dynamicHidingObserver) { dynamicHidingObserver.disconnect(); dynamicHidingObserver = null; }
    }
    function addHidingRule(id, ruleFn) {
        activeHidingRules.set(id, ruleFn);
        if (activeHidingRules.size === 1) startObserver();
        ruleFn(document.body);
    }
    function removeHidingRule(id) {
        activeHidingRules.delete(id);
        if (activeHidingRules.size === 0) stopObserver();
        document.querySelectorAll(`[data-gm-hidden-by="${id}"]`).forEach(el => {
            el.style.display = '';
            el.removeAttribute('data-gm-hidden-by');
        });
    }

    // Debounce utility
    function debounce(fn, ms) {
        let timer;
        return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), ms); };
    }


    // —————————————————————
    // 1. SETTINGS MANAGER
    // —————————————————————
    const settingsManager = {
        defaults: {
            // UI & Visuals
            settingsButton: true,
            glowingStarred: true,
            squarifyTheme: false,
            animatedCompose: true,
            animatedStars: true,
            styleDateTime: true,
            // Themes
            gmailDarkMode: false,
            gmailDarkModePane: true,
            // Layout
            customCSS: true,
            styleReplyButton: true,
            composeRecipientBorder: true,
            collapseChatSidebar: false,
            hideChatWithHoverLip: false,
            // Productivity
            showEmail: true,
            fmtToolbar: true,
            uiTweaks: true,
            contactChipDoubleClick: true,
            // Header Elements
            hideAppsGrid: false,
            hideProfileBox: false,
            hideTopBarSupport: false,
            hideTopBarSettings: false,
            // Hubspot
            hubspotActivityIndicator: false,
            hideHubspotControls: false,
            hideHubspotLogTracker: false,
            hideHubspotProfileButton: false,
            hideHubspotContactIcon: false,
            // AI & Tools
            hideGeminiHelpMeWrite: false,
            hideAskGemini: false,
            hideLoomButton: true,
            hideSummarizeEmail: true,
            hideSmartFeaturesBanner: true,
            // Declutter
            hideOrgWarnings: true,
            hideMiscClutter: false,
            hideEmailLabels: false,
            hideLabelsSection: false,
            hideDiscoverMore: false,
            hideProfilePicture: false,
            hideEverythingElseHeader: false,
            hideStarredHeader: false,
            hideSubjectToolbar: false,
            // Email Thread Declutter
            nukeReplyMetadata: true,
            nukeReplyMetadataSimple: false,
            nukeReplyMetadataShowCc: false,
            nukeReplyMetadataShowBcc: false,
            nukeReplyMetadataRemovePleasantries: true,
            flatReplyChain: false,
            hideReactionButton: true,
            hideAllSignaturesInChain: true,
            // Simplify Layout
            simplifyNav: false,
            simplifyInbox: false,
            simplifyConversation: false,
            simplifyComposer: false,
            simplifyAds: true,
            // Privacy
            blockTrackerPixels: true,
            stripTrackingParams: false,
            // Automation
            autoShowImages: false,
            inboxPause: false,
        },
        async load() {
            let saved = await GM_getValue('gmPremiumSettings', {});
            const oldKeys = ['hideReplyHeaders', 'hideSignaturesInReplies', 'hideDeviceSignatures', 'hideOutlookMobileSignature', 'hideReplyForwardMetadata', 'hideExternalSignatures', 'hideMySignatureInChains', 'mySignatureKeywords', 'themeToggle', 'darkLoadingScreen'];
            oldKeys.forEach(k => delete saved[k]);
            return { ...this.defaults, ...saved };
        },
        async save(settings) { await GM_setValue('gmPremiumSettings', settings); },
        async getFirstRunStatus() { return await GM_getValue('hasRunBefore', false); },
        async setFirstRunStatus(v) { await GM_setValue('hasRunBefore', v); }
    };


    // —————————————————————
    // 2. FEATURE DEFINITIONS
    // —————————————————————
    const features = [

        // =========================================================
        // GROUP: UI & Visuals
        // =========================================================
        {
            id: 'settingsButton',
            name: 'Floating Settings Button',
            description: 'Shows a floating gear icon to open the settings panel.',
            group: 'UI & Visuals',
            _element: null,
            init() {
                const btn = document.createElement('button');
                btn.id = 'gm-floating-settings-btn';
                btn.title = 'Open Gmail Premium Settings';
                btn.appendChild(createCogSvg());
                btn.onclick = () => document.body.classList.toggle('gm-panel-open');
                document.body.appendChild(btn);
                this._element = btn;
            },
            destroy() { this._element?.remove(); }
        },
        {
            id: 'glowingStarred',
            name: 'Glowing Starred Section',
            description: 'Adds a subtle glow effect to the "Starred" email section.',
            group: 'UI & Visuals',
            _styleElement: null,
            init() {
                // FIX: Removed :contains() (not valid CSS). Uses [title="Starred"] only.
                this._styleElement = document.createElement('style');
                this._styleElement.id = 'gm-glowing-starred';
                this._styleElement.textContent = `
                    div.ae4:has(span.qh[title="Starred"]) {
                        box-shadow: 0 0 12px 2px rgba(250, 215, 60, 0.7) !important;
                        border: 1px solid rgba(250, 215, 60, 0.8) !important;
                        border-radius: 8px !important;
                        margin-bottom: 10px !important;
                    }
                    div.ae4:has(span.qh[title="Starred"]) .F.cf.zt {
                        border-radius: 8px;
                    }
                `;
                document.head.appendChild(this._styleElement);
            },
            destroy() { this._styleElement?.remove(); }
        },
        {
            id: 'squarifyTheme',
            name: 'Squarify UI Elements',
            description: 'Removes rounded corners from main UI elements (excludes dropdowns/tooltips).',
            group: 'UI & Visuals',
            _styleElement: null,
            init() {
                // FIX: Scoped to Gmail containers only. Old version used * which nuked dropdown/tooltip rendering.
                this._styleElement = document.createElement('style');
                this._styleElement.id = 'gm-squarify-theme';
                this._styleElement.textContent = `
                    .nH *, .nH *::before, .nH *::after,
                    .zA, .T-I, .z0 > .L3, .bAn, .aDP,
                    .gm-panel, .gm-feature-group,
                    #gm-floating-settings-btn {
                        border-radius: 0 !important;
                    }
                `;
                document.head.appendChild(this._styleElement);
            },
            destroy() { this._styleElement?.remove(); }
        },
        {
            id: 'animatedCompose',
            name: 'Animated Compose Button',
            description: 'Applies a breathing animation and sheen hover effect to the Compose button.',
            group: 'UI & Visuals',
            _styleElement: null,
            init() {
                this._styleElement = document.createElement('style');
                this._styleElement.id = 'gm-animated-compose';
                this._styleElement.textContent = `
                    .aic > .z0 > .T-I.T-I-KE {
                        background: linear-gradient(135deg, #a8e063, #56ab2f) !important;
                        color: white !important;
                        font-weight: bold !important;
                        text-shadow: 1px 1px 2px rgba(0,0,0,0.25);
                        border: 1px solid rgba(255,255,255,0.2) !important;
                        width: 220px !important;
                        position: relative;
                        overflow: hidden;
                        animation: gm-breathing-pulse 4s ease-in-out infinite !important;
                        transition: all 0.3s ease !important;
                    }
                    .aic > .z0 > .T-I.T-I-KE::before {
                        content: '';
                        position: absolute; top: 0; left: -85%;
                        width: 60%; height: 100%;
                        background: linear-gradient(to right, rgba(255,255,255,0) 0%, rgba(255,255,255,0.25) 50%, rgba(255,255,255,0) 100%);
                        transform: skewX(-25deg);
                    }
                    .aic > .z0 > .T-I.T-I-KE:hover::before {
                        animation: gm-sheen 1s ease-out 1;
                    }
                    @keyframes gm-breathing-pulse {
                        0% { transform: scale(1); opacity: 0.95; box-shadow: 0 2px 4px rgba(0,0,0,0.2); }
                        50% { transform: scale(1.02); opacity: 1; box-shadow: 0 4px 15px rgba(86,171,47,0.4); }
                        100% { transform: scale(1); opacity: 0.95; box-shadow: 0 2px 4px rgba(0,0,0,0.2); }
                    }
                    @keyframes gm-sheen { from { left: -85%; } to { left: 125%; } }
                    .Cr.ada { padding-left: 16px !important; }
                    .aic .T-I-KE .T-I-J3 { justify-content: center !important; }
                `;
                document.head.appendChild(this._styleElement);
            },
            destroy() { this._styleElement?.remove(); }
        },
        {
            id: 'animatedStars',
            name: 'Animated Star Icons',
            description: 'Replaces static star icons with a glowing, animated version.',
            group: 'UI & Visuals',
            _styleElement: null,
            init() {
                // FIX: Broadened selectors using aria-checked and parent containers
                this._styleElement = document.createElement('style');
                this._styleElement.id = 'gm-animated-stars';
                this._styleElement.textContent = `
                    td.apU span[aria-checked="true"],
                    .T-KT-Jp {
                        background-image: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23FFC107"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>') !important;
                        background-position: center !important;
                        background-repeat: no-repeat !important;
                        background-size: 20px !important;
                        animation: gm-star-glow 1.5s infinite alternate !important;
                    }
                    td.apU span[aria-checked="true"] img,
                    .T-KT-Jp img {
                        opacity: 0 !important;
                    }
                    @keyframes gm-star-glow {
                        from { filter: drop-shadow(0 0 2px #ffc107); }
                        to { filter: drop-shadow(0 0 6px #ffeb3b); }
                    }
                `;
                document.head.appendChild(this._styleElement);
            },
            destroy() { this._styleElement?.remove(); }
        },
        {
            id: 'styleDateTime',
            name: 'Style Email Date/Time',
            description: 'Applies custom colors and background to date/time stamps in emails.',
            group: 'UI & Visuals',
            _styleElement: null,
            init() {
                // FIX: Added td.xW span[title] as a broader fallback selector
                this._styleElement = document.createElement('style');
                this._styleElement.id = 'gm-style-datetime';
                this._styleElement.textContent = `
                    span.g3,
                    td.xW span[title] {
                        color: #999 !important;
                        background-color: #d0e0e3 !important;
                        font-weight: 700 !important;
                        font-style: normal !important;
                        padding: 2px 4px;
                        border-radius: 3px;
                    }
                `;
                document.head.appendChild(this._styleElement);
            },
            destroy() { this._styleElement?.remove(); }
        },

        // =========================================================
        // GROUP: Themes
        // =========================================================
        {
            id: 'gmailDarkMode',
            name: 'Enable Gmail Dark Mode',
            description: "Applies a comprehensive dark theme and dark loading screen to prevent white flash.",
            group: 'Themes',
            _styleElement: null,
            _loadingStyleElement: null,
            _paneStyleElement: null,
            preInit() {
                this._loadingStyleElement = document.createElement('style');
                this._loadingStyleElement.id = 'gm-dark-loading-screen';
                this._loadingStyleElement.textContent = `
                    html, body { background-color: #121212 !important; }
                    *, *::before, *::after { animation: none !important; transition: none !important; }
                    #loading, .la-i > div, .la-k .la-m, .la-i > .la-m, .la-k .la-l, .la-k .la-r {
                        background-color: #121212 !important; border: none !important;
                    }
                    .msg, .msgb, .submit_as_link, #loading a { color: #e0e0e0 !important; }
                `;
                (document.head || document.documentElement).appendChild(this._loadingStyleElement);
            },
            init() {
                if (this._styleElement) return;
                // FIX: Self-contained dark mode CSS instead of fetching stale external URL that 404s.
                this._styleElement = document.createElement('style');
                this._styleElement.id = 'gm-native-dark-theme';
                this._styleElement.textContent = `
                    /* === GMAIL DARK MODE (self-contained) === */

                    /* Global backgrounds */
                    html, body,
                    .nH, .bkK, .no, .AO, .aeF, .bq9,
                    div[role="banner"],
                    .aeH, .aDP, .iY,
                    .nH.oy8Mbf, .nH.bkK > .nH {
                        background-color: #1a1a1a !important;
                        color: #e0e0e0 !important;
                    }

                    /* Header / App bar */
                    header, #gb, .gb_Bd,
                    div[role="banner"] > div {
                        background-color: #202020 !important;
                        border-color: #333 !important;
                    }

                    /* Sidebar / Navigation */
                    .aeN, .wT, .n3, .aim,
                    div[role="navigation"] {
                        background-color: #1a1a1a !important;
                        color: #ccc !important;
                    }
                    .TN.aHS-bnt { color: #e0e0e0 !important; }
                    .TN:hover, .n6 { background-color: #2a2a2a !important; }
                    .TN.aHS-bnq { background-color: #333 !important; }

                    /* Inbox list */
                    .aeF, div[gh="tl"] { background-color: #1a1a1a !important; }
                    tr.zA { background-color: #222 !important; color: #ddd !important; border-bottom-color: #333 !important; }
                    tr.zA:hover { background-color: #2a2a2a !important; }
                    tr.zA.zE { background-color: #282828 !important; }
                    tr.zA .y6, tr.zA .bog span, tr.zA .bqe { color: #ddd !important; }
                    tr.zA .y2 { color: #999 !important; }
                    .x7 { background-color: #1a3a5c !important; }

                    /* Conversation / Reading pane */
                    .aDP, .gs, .ii.gt, .a3s,
                    div[role="listitem"] { background-color: #1e1e1e !important; }
                    .ha > .hP, .h7, .hx .gD, .hx .hb { color: #ddd !important; }

                    /* Compose */
                    .AD, .nH .Hy, .aDg > .aDj, .Am, .aoP .Ar,
                    .agP, .wO, .aGb, .bbV, .agh {
                        background-color: #222 !important;
                        color: #ddd !important;
                    }
                    .agh .afV, .agh .af6 { color: #ddd !important; }
                    .aoT, .az9 { color: #999 !important; }
                    div[contenteditable="true"] { color: #ddd !important; }

                    /* Search */
                    form[role="search"], form[role="search"] table,
                    form[role="search"] div, form[role="search"] td {
                        background-color: #2a2a2a !important;
                        color: #ddd !important;
                    }

                    /* Buttons */
                    .T-I:not(.T-I-KE), .J-M, [role="navigation"] [role="button"] {
                        background-color: #333 !important;
                        color: #ddd !important;
                        border-color: #444 !important;
                    }

                    /* Links */
                    .gt a, .ii.gt a { color: #8bc4ff !important; }

                    /* Category tabs */
                    .aKh { background-color: #222 !important; }
                    .aKh .aAy { color: #bbb !important; }
                    .aKh .aAy[aria-selected="true"] { color: #fff !important; }

                    /* Borders and dividers */
                    .aeH, .afC, .aDP, .adI { border-color: #333 !important; }

                    /* Dropdowns/menus */
                    .J-M, .J-N, .bAp.b8.UC .vh, .ajA {
                        background-color: #2a2a2a !important;
                        color: #ddd !important;
                    }

                    /* Toolbar icons - invert for visibility */
                    .Hl, .Hq, .Ha, div.ajR .ajT,
                    .btC .dv, .btC .aaA,
                    [role="toolbar"] [role="button"]:not(.H2):not(.Ol) {
                        filter: invert(0.85) !important;
                    }

                    /* Chat */
                    #talk_roster, .VK.s.ik, .aay {
                        background-color: #1a1a1a !important;
                        color: #e0e0e0 !important;
                        border-color: #333 !important;
                    }
                `;
                document.head.appendChild(this._styleElement);

                // Add dark email pane if sub-setting enabled
                if (appState.settings.gmailDarkModePane) {
                    this._paneStyleElement = document.createElement('style');
                    this._paneStyleElement.id = 'gm-dark-email-view';
                    this._paneStyleElement.textContent = `
                        /* Email body content dark */
                        .ii.gt, .a3s, .gs, .gt,
                        .gt div, .gt p, .gt h1, .gt h2, .gt h3, .gt h4, .gt h5, .gt h6,
                        .gt td, .gt span, .gt font, .gt figcaption,
                        .ha > .hP, .hx, .hx .gD, .hx .hb, .ac2,
                        .Am, .bs1 + .bs3, .btj + .aD, .ado b {
                            color: #ddd !important;
                        }
                        .gt div:not([role]):not(.aYy),
                        .gt td, .gt table, .gt span:not([style*="background"]),
                        .gt p, .gt h1, .gt h2, .gt h3, .gt center {
                            background-color: transparent !important;
                        }
                        .iY, .iY .Bu { background: transparent !important; }
                        /* Star icon (white outline for dark bg) */
                        .bi4 > .T-KT:not(.T-KT-Jp):not(.byM)::before {
                            background-image: url("https://www.gstatic.com/images/icons/material/system/1x/star_border_white_20dp.png") !important;
                        }
                        /* Reply/Forward icons */
                        .hB { background-image: url("https://www.gstatic.com/images/icons/material/system/1x/reply_white_20dp.png") !important; }
                        .mK { background-image: url("https://www.gstatic.com/images/icons/material/system/1x/reply_all_white_20dp.png") !important; }
                        .mI { background-image: url("https://www.gstatic.com/images/icons/material/system/1x/forward_white_20dp.png") !important; }
                    `;
                    document.head.appendChild(this._paneStyleElement);
                }
            },
            destroy() {
                this._styleElement?.remove(); this._styleElement = null;
                this._loadingStyleElement?.remove(); this._loadingStyleElement = null;
                this._paneStyleElement?.remove(); this._paneStyleElement = null;
            },
        },

        // =========================================================
        // GROUP: Layout
        // =========================================================
        {
            id: 'customCSS',
            name: 'Core Layout Fixes',
            description: 'Applies essential CSS tweaks for a cleaner, full-width layout.',
            group: 'Layout',
            _styleElement: null,
            init() {
                this._styleElement = document.createElement('style');
                this._styleElement.id = 'gm-custom-css';
                this._styleElement.textContent = `div[role="main"] { padding-top: 10px; }`;
                document.head.appendChild(this._styleElement);
            },
            destroy() { this._styleElement?.remove(); }
        },
        {
            id: 'styleReplyButton',
            name: 'Style Reply Button',
            description: 'Applies custom borders and padding to the main reply button.',
            group: 'Layout',
            _styleElement: null,
            init() {
                this._styleElement = document.createElement('style');
                this._styleElement.id = 'gm-style-reply-button';
                this._styleElement.textContent = `
                    div.T-I.J-J5-Ji.T-I-Js-IF.bsQ.T-I-ax7.L3 {
                        border-style: solid !important;
                        border-color: #d9d9d9 !important;
                        height: 25px !important;
                        padding: 0 !important;
                    }
                `;
                document.head.appendChild(this._styleElement);
            },
            destroy() { this._styleElement?.remove(); }
        },
        {
            id: 'composeRecipientBorder',
            name: 'Compose Recipient Border',
            description: 'Adds a border below the To/Cc/Subject fields in compose.',
            group: 'Layout',
            _styleElement: null,
            init() {
                this._styleElement = document.createElement('style');
                this._styleElement.id = 'gm-compose-recipient-border';
                this._styleElement.textContent = `
                    div.et { border-color: #efefef !important; border-style: solid !important; border-width: 0 0 1px 0 !important; }
                `;
                document.head.appendChild(this._styleElement);
            },
            destroy() { this._styleElement?.remove(); }
        },
        {
            id: 'collapseChatSidebar',
            name: 'Collapse Chat Sidebar',
            description: 'Shrinks the chat/spaces sidebar to a minimal width, expands on hover.',
            group: 'Layout',
            _styleElement: null,
            init() {
                // FIX: Pure CSS approach — old version used fragile JS traversal with closest() that failed
                this._styleElement = document.createElement('style');
                this._styleElement.id = 'gm-collapse-chat';
                this._styleElement.textContent = `
                    .aeN {
                        width: 56px !important;
                        min-width: 56px !important;
                        overflow: hidden !important;
                        transition: width 0.2s ease;
                    }
                    .aeN:hover {
                        width: 256px !important;
                        overflow: visible !important;
                        z-index: 100;
                        box-shadow: 2px 0 8px rgba(0,0,0,0.15);
                    }
                    .aeN + .bkK, .bkK > .nH.oy8Mbf {
                        margin-left: 4px !important;
                    }
                `;
                document.head.appendChild(this._styleElement);
            },
            destroy() { this._styleElement?.remove(); }
        },
        {
            id: 'hideChatWithHoverLip',
            name: 'Hover to Reveal Chat',
            description: 'Hides the chat/nav panel completely, revealing on hover over a left-side lip.',
            group: 'Layout',
            _styleElement: null,
            init() {
                // FIX: Targets .aeN broadly instead of fragile .aeN.WR.a6o compound class
                this._styleElement = document.createElement('style');
                this._styleElement.id = 'gm-hide-chat-hover';
                this._styleElement.textContent = `
                    .aeN {
                        position: fixed !important;
                        left: 0;
                        top: 64px;
                        height: calc(100vh - 64px) !important;
                        z-index: 1001;
                        transform: translateX(calc(-100% + 5px));
                        transition: transform 0.25s ease-in-out;
                        border-right: 1px solid #d3d3d3;
                    }
                    .aeN::after {
                        content: '';
                        position: absolute; right: 0; top: 0;
                        width: 5px; height: 100%;
                        background: #5e97f6; cursor: pointer;
                        opacity: 0.7; transition: opacity 0.2s;
                    }
                    .aeN:hover {
                        transform: translateX(0);
                        box-shadow: 2px 0 10px rgba(0,0,0,0.2);
                    }
                    .aeN:hover::after { opacity: 1; }
                    .bkK > .nH.oy8Mbf {
                        padding-left: 15px !important;
                    }
                `;
                document.head.appendChild(this._styleElement);
            },
            destroy() { this._styleElement?.remove(); }
        },

        // =========================================================
        // GROUP: Productivity
        // =========================================================
        {
            id: 'showEmail',
            name: 'Show Raw Emails',
            description: 'Displays the full email address instead of sender name.',
            group: 'Productivity',
            _observer: null,
            init() {
                // FIX: Debounced to prevent performance death — old version fired on every single mutation
                const showRawAddress = debounce(() => {
                    document.querySelectorAll('span[email]').forEach(el => {
                        const email = el.getAttribute('email');
                        if (email && el.textContent !== email) {
                            el.textContent = email;
                        }
                    });
                }, 200);
                this._observer = new MutationObserver(showRawAddress);
                this._observer.observe(document.body, { childList: true, subtree: true });
                showRawAddress();
            },
            destroy() { this._observer?.disconnect(); }
        },
        {
            id: 'fmtToolbar',
            name: 'Toggleable Formatting Bar',
            description: 'Adds a button to toggle the compose formatting toolbar.',
            group: 'Productivity',
            _observer: null,
            init() {
                const enhanceComposeWindow = (root) => {
                    if (root.dataset?.gmFmt) return;
                    const toolbar = root.querySelector('.aX');
                    if (!toolbar) return;
                    root.dataset.gmFmt = '1';
                    const btn = document.createElement('button');
                    btn.textContent = 'Formatting';
                    btn.className = 'gm-btn-secondary';
                    toolbar.style.visibility = 'hidden';
                    btn.onclick = () => {
                        const isHidden = toolbar.style.visibility === 'hidden';
                        toolbar.style.visibility = isHidden ? 'visible' : 'hidden';
                        btn.classList.toggle('active', isHidden);
                    };
                    toolbar.parentNode.insertBefore(btn, toolbar);
                };
                // FIX: Added subtree:true — compose windows are deeply nested, not direct body children
                this._observer = new MutationObserver(muts => {
                    muts.forEach(m => m.addedNodes.forEach(n => {
                        if (n.nodeType === 1) {
                            if (n.matches?.('.AD')) enhanceComposeWindow(n);
                            n.querySelectorAll?.('.AD').forEach(enhanceComposeWindow);
                        }
                    }));
                });
                this._observer.observe(document.body, { childList: true, subtree: true });
                document.querySelectorAll('.AD').forEach(enhanceComposeWindow);
            },
            destroy() {
                this._observer?.disconnect();
                document.querySelectorAll('.gm-btn-secondary').forEach(btn => btn.remove());
                document.querySelectorAll('.AD[data-gm-fmt]').forEach(el => {
                    const toolbar = el.querySelector('.aX');
                    if (toolbar) toolbar.style.visibility = 'visible';
                    delete el.dataset.gmFmt;
                });
            }
        },
        {
            id: 'uiTweaks',
            name: 'Disable Compose Hover-Cards',
            description: 'Disables distracting hover-card popups on email addresses in compose.',
            group: 'Productivity',
            _styleElement: null,
            init() {
                this._styleElement = document.createElement('style');
                this._styleElement.id = 'gm-uiTweaks';
                this._styleElement.textContent = `
                    .agh .afV > .afW { pointer-events: none !important; }
                    .agh .af6 { pointer-events: auto !important; }
                `;
                document.head.appendChild(this._styleElement);
            },
            destroy() { this._styleElement?.remove(); }
        },
        {
            id: 'contactChipDoubleClick',
            name: 'Double-Click to Copy Email',
            description: 'Double-click a contact chip to copy their email address.',
            group: 'Productivity',
            _clickHandler: null,
            init() {
                this._clickHandler = (e) => {
                    // FIX: Also check email attribute as fallback alongside data-hovercard-id
                    const chip = e.target.closest('.afV[data-hovercard-id], span[email]');
                    if (!chip) return;
                    const email = chip.getAttribute('data-hovercard-id') || chip.getAttribute('email');
                    if (!email) return;
                    navigator.clipboard.writeText(email).then(() => {
                        showToast('Email copied!');
                    }).catch(() => showToast('Copy failed.', true));
                };
                document.body.addEventListener('dblclick', this._clickHandler);
            },
            destroy() {
                if (this._clickHandler) document.body.removeEventListener('dblclick', this._clickHandler);
            }
        },

        // =========================================================
        // GROUP: Header Elements
        // =========================================================
        {
            id: 'hideAppsGrid',
            name: 'Hide Google Apps Grid',
            description: 'Hides the 9-dot Google Apps grid menu in the header.',
            group: 'Header Elements',
            _styleElement: null,
            init() {
                // FIX: Uses aria-label which is stable. Old .gb_Vc class rotated every Gmail build.
                this._styleElement = document.createElement('style');
                this._styleElement.id = 'gm-hide-apps-grid';
                this._styleElement.textContent = `
                    [aria-label="Google apps"], [data-tooltip="Google apps"] { display: none !important; }
                `;
                document.head.appendChild(this._styleElement);
            },
            destroy() { this._styleElement?.remove(); }
        },
        {
            id: 'hideProfileBox',
            name: 'Hide Account Profile Box',
            description: 'Hides your Google Account profile picture in the header.',
            group: 'Header Elements',
            _styleElement: null,
            init() {
                // FIX: Uses aria-label which is stable across builds. Old .gb_Wa rotated.
                this._styleElement = document.createElement('style');
                this._styleElement.id = 'gm-hide-profile-box';
                this._styleElement.textContent = `
                    a[aria-label*="Google Account"], img[aria-label*="Google Account"] {
                        display: none !important;
                    }
                `;
                document.head.appendChild(this._styleElement);
            },
            destroy() { this._styleElement?.remove(); }
        },
        {
            id: 'hideTopBarSupport',
            name: 'Hide Top Bar Support Icon',
            description: 'Hides the "?" support icon in the header.',
            group: 'Header Elements',
            _styleElement: null,
            init() {
                // FIX: Uses both data-tooltip and aria-label for resilience
                this._styleElement = document.createElement('style');
                this._styleElement.id = 'gm-hide-top-support';
                this._styleElement.textContent = `
                    [data-tooltip="Support"], [aria-label="Support"],
                    [data-tooltip="Help"], [aria-label="Help"] { display: none !important; }
                `;
                document.head.appendChild(this._styleElement);
            },
            destroy() { this._styleElement?.remove(); }
        },
        {
            id: 'hideTopBarSettings',
            name: 'Hide Top Bar Settings Icon',
            description: 'Hides the Gmail "Settings" gear icon in the header.',
            group: 'Header Elements',
            _styleElement: null,
            init() {
                this._styleElement = document.createElement('style');
                this._styleElement.id = 'gm-hide-top-settings';
                this._styleElement.textContent = `
                    [data-tooltip="Settings"], [aria-label="Settings"] { display: none !important; }
                `;
                document.head.appendChild(this._styleElement);
            },
            destroy() { this._styleElement?.remove(); }
        },

        // =========================================================
        // GROUP: Hubspot
        // =========================================================
        {
            id: 'hubspotActivityIndicator',
            name: 'Hubspot Activity Indicator',
            description: 'Shows a colored bar at the top indicating Hubspot status.',
            group: 'Hubspot',
            _elements: [], _observers: [],
            init() {
                const lip = document.createElement('div');
                lip.id = 'gm-header-lip';
                Object.assign(lip.style, {
                    position: 'fixed', top: '0', left: '0', right: '0', height: '6px',
                    zIndex: '10000', transition: 'background .3s ease',
                });
                document.body.appendChild(lip);
                this._elements.push(lip);
                const colorLip = () => {
                    const img = document.querySelector('img.kratos__button_img');
                    lip.style.background = img?.src.includes('sprocket-ok') ? '#2ecc71' : img?.src.includes('sprocket-off') ? '#e74c3c' : '#95a5a6';
                };
                const obs = new MutationObserver(colorLip);
                obs.observe(document.body, { subtree: true, attributes: true, attributeFilter: ['src'] });
                this._observers.push(obs);
                colorLip();
            },
            destroy() {
                this._elements.forEach(el => el.remove()); this._elements = [];
                this._observers.forEach(obs => obs.disconnect()); this._observers = [];
            }
        },
        {
            id: 'hideHubspotControls', name: 'Hide Hubspot Compose Toolbar',
            description: 'Hides Hubspot toolbar in compose.', group: 'Hubspot',
            _styleElement: null,
            init() {
                this._styleElement = document.createElement('style');
                this._styleElement.id = 'gm-hide-hubspot-controls';
                this._styleElement.textContent = `div#tool-row { display: none !important; }`;
                document.head.appendChild(this._styleElement);
            },
            destroy() { this._styleElement?.remove(); }
        },
        {
            id: 'hideHubspotLogTracker', name: 'Hide Log Tracker Indicator',
            description: 'Hides Hubspot log/track status above compose.', group: 'Hubspot',
            _styleElement: null,
            init() {
                this._styleElement = document.createElement('style');
                this._styleElement.id = 'gm-hide-hubspot-log-tracker';
                this._styleElement.textContent = `.hubspot-logtrack-indicator { display: none !important; }`;
                document.head.appendChild(this._styleElement);
            },
            destroy() { this._styleElement?.remove(); }
        },
        {
            id: 'hideHubspotProfileButton', name: 'Hide Sender Profile Button',
            description: 'Hides "View Profile" in Hubspot sidebar.', group: 'Hubspot',
            _styleElement: null,
            init() {
                this._styleElement = document.createElement('style');
                this._styleElement.id = 'gm-hide-hubspot-profile-btn';
                this._styleElement.textContent = `span.hubspot[data-add-or-view-contact-button-container] { display: none !important; }`;
                document.head.appendChild(this._styleElement);
            },
            destroy() { this._styleElement?.remove(); }
        },
        {
            id: 'hideHubspotContactIcon', name: 'Hide Hubspot Icon on Chips',
            description: 'Hides sprocket icon on contact chips.', group: 'Hubspot',
            _styleElement: null,
            init() {
                this._styleElement = document.createElement('style');
                this._styleElement.id = 'gm-hide-hubspot-contact-icon';
                this._styleElement.textContent = `.agh .hubspot.indicator-container { display: none !important; }`;
                document.head.appendChild(this._styleElement);
            },
            destroy() { this._styleElement?.remove(); }
        },

        // =========================================================
        // GROUP: AI & Tools
        // =========================================================
        {
            id: 'hideGeminiHelpMeWrite',
            name: 'Hide Gemini "Help me write"',
            description: 'Hides the AI writing prompt in compose.',
            group: 'AI & Tools',
            _observer: null,
            init() {
                // FIX: Old version used stale obfuscated classes (.QT9oZc, .e5IPTd).
                // Now uses JS text/attribute matching that survives class rotation.
                const hide = debounce(() => {
                    document.querySelectorAll('[data-promo-id*="mako"], [data-promo-id*="compose"]').forEach(el => {
                        el.style.display = 'none';
                    });
                    document.querySelectorAll('.AD button, .AD [role="button"]').forEach(el => {
                        const text = (el.textContent || '').toLowerCase();
                        const label = (el.getAttribute('aria-label') || '').toLowerCase();
                        if (text.includes('help me write') || label.includes('help me write')) {
                            el.style.display = 'none';
                        }
                    });
                }, 300);
                this._observer = new MutationObserver(hide);
                this._observer.observe(document.body, { childList: true, subtree: true });
                hide();
            },
            destroy() { this._observer?.disconnect(); }
        },
        {
            id: 'hideAskGemini',
            name: 'Hide "Ask Gemini" Button',
            description: 'Hides the Gemini button in the top header.',
            group: 'AI & Tools',
            _observer: null,
            init() {
                // FIX: JS-based matching instead of stale obfuscated class
                const hide = debounce(() => {
                    document.querySelectorAll('button, [role="button"], a').forEach(el => {
                        const text = (el.textContent || '').trim().toLowerCase();
                        const label = (el.getAttribute('aria-label') || '').toLowerCase();
                        if ((text === 'ask gemini' || label.includes('gemini')) &&
                            el.closest('header, [role="banner"], #gb, .gb_Bd')) {
                            el.style.display = 'none';
                        }
                    });
                }, 300);
                this._observer = new MutationObserver(hide);
                this._observer.observe(document.body, { childList: true, subtree: true });
                hide();
            },
            destroy() { this._observer?.disconnect(); }
        },
        {
            id: 'hideSummarizeEmail',
            name: 'Hide "Summarize Email" Button',
            description: 'Hides the Gemini summarize button on email threads.',
            group: 'AI & Tools',
            _observer: null,
            init() {
                // FIX: JS-based instead of stale .einvLd class
                const hide = debounce(() => {
                    document.querySelectorAll('button, [role="button"]').forEach(el => {
                        const text = (el.textContent || '').toLowerCase();
                        const label = (el.getAttribute('aria-label') || '').toLowerCase();
                        if (text.includes('summarize') || label.includes('summarize')) {
                            const inThread = el.closest('.AO, .aDP, [role="main"], div[gh="tl"]');
                            if (inThread) el.style.display = 'none';
                        }
                    });
                }, 300);
                this._observer = new MutationObserver(hide);
                this._observer.observe(document.body, { childList: true, subtree: true });
                hide();
            },
            destroy() { this._observer?.disconnect(); }
        },
        {
            id: 'hideSmartFeaturesBanner',
            name: 'Hide "Smart Features" Banner',
            description: 'Hides the "Turn on smart features" banner.',
            group: 'AI & Tools',
            _styleElement: null,
            init() {
                this._styleElement = document.createElement('style');
                this._styleElement.id = 'gm-hide-smart-features';
                this._styleElement.textContent = `.ahS { display: none !important; }`;
                document.head.appendChild(this._styleElement);
            },
            destroy() { this._styleElement?.remove(); }
        },
        {
            id: 'hideLoomButton',
            name: 'Hide Loom Button',
            description: 'Hides the Loom recording button in compose.',
            group: 'AI & Tools',
            _styleElement: null,
            init() {
                this._styleElement = document.createElement('style');
                this._styleElement.id = 'gm-hide-loom';
                this._styleElement.textContent = `.loom-button-td, [data-loom-button] { display: none !important; }`;
                document.head.appendChild(this._styleElement);
            },
            destroy() { this._styleElement?.remove(); }
        },

        // =========================================================
        // GROUP: Declutter
        // =========================================================
        {
            id: 'hideOrgWarnings',
            name: 'Hide "Outside Org" Warning',
            description: 'Hides the yellow external recipient warning banner.',
            group: 'Declutter',
            _styleElement: null,
            init() {
                this._styleElement = document.createElement('style');
                this._styleElement.id = 'gm-hide-org-warnings';
                this._styleElement.textContent = `.ac4:has(.aeM) { display: none !important; }`;
                document.head.appendChild(this._styleElement);
            },
            destroy() { this._styleElement?.remove(); }
        },
        {
            id: 'hideEmailLabels', name: 'Hide Labels in Emails',
            description: 'Hides label tags at the top of emails.', group: 'Declutter',
            _styleElement: null,
            init() {
                this._styleElement = document.createElement('style');
                this._styleElement.id = 'gm-hide-email-labels';
                this._styleElement.textContent = `span[jsname="SjW3R"] { display: none !important; }`;
                document.head.appendChild(this._styleElement);
            },
            destroy() { this._styleElement?.remove(); }
        },
        {
            id: 'hideProfilePicture', name: 'Hide Profile Picture in Emails',
            description: 'Hides sender profile picture in email view.', group: 'Declutter',
            _styleElement: null,
            init() {
                this._styleElement = document.createElement('style');
                this._styleElement.id = 'gm-hide-profile-picture';
                this._styleElement.textContent = `td.aoY { display: none !important; }`;
                document.head.appendChild(this._styleElement);
            },
            destroy() { this._styleElement?.remove(); }
        },
        {
            id: 'hideEverythingElseHeader',
            name: 'Hide "Everything else" Header',
            description: 'Hides the "Everything else" group header.', group: 'Declutter',
            _styleElement: null,
            init() {
                this._styleElement = document.createElement('style');
                this._styleElement.id = 'gm-hide-everything-else';
                this._styleElement.textContent = `div.ae4:has(div.aDa:not([title])) .aAr.Wg { display: none !important; }`;
                document.head.appendChild(this._styleElement);
            },
            destroy() { this._styleElement?.remove(); }
        },
        {
            id: 'hideLabelsSection',
            name: 'Hide "Labels" Section',
            description: 'Hides the Labels section in the sidebar.', group: 'Declutter',
            _observer: null,
            init() {
                // FIX: :contains("Labels") is NOT valid CSS. Using JS-based text matching.
                const hide = debounce(() => {
                    document.querySelectorAll('.ajl h2, .aWk').forEach(el => {
                        if (el.textContent.trim() === 'Labels') {
                            const section = el.closest('.ajl, .aAw');
                            if (section) section.style.display = 'none';
                        }
                    });
                }, 300);
                this._observer = new MutationObserver(hide);
                this._observer.observe(document.body, { childList: true, subtree: true });
                hide();
            },
            destroy() {
                this._observer?.disconnect();
                document.querySelectorAll('.ajl, .aAw').forEach(el => el.style.display = '');
            }
        },
        {
            id: 'hideStarredHeader',
            name: 'Hide "Starred" Section Header',
            description: 'Hides the Starred group header.', group: 'Declutter',
            _styleElement: null,
            init() {
                // FIX: Uses [title="Starred"] instead of :contains("Starred")
                this._styleElement = document.createElement('style');
                this._styleElement.id = 'gm-hide-starred-header';
                this._styleElement.textContent = `
                    div.ae4:has(span.qh[title="Starred"]) > .Wg.aAD.aAr { display: none !important; }
                `;
                document.head.appendChild(this._styleElement);
            },
            destroy() { this._styleElement?.remove(); }
        },
        {
            id: 'hideSubjectToolbar', name: 'Hide Empty Subject Toolbar',
            description: 'Hides the empty toolbar space.', group: 'Declutter',
            _styleElement: null,
            init() {
                // FIX: Broadened selector from fragile .SubjectToolbar.az6.aoD compound
                this._styleElement = document.createElement('style');
                this._styleElement.id = 'gm-hide-subject-toolbar';
                this._styleElement.textContent = `
                    .SubjectToolbar, .az6.aoD:empty { display: none !important; }
                `;
                document.head.appendChild(this._styleElement);
            },
            destroy() { this._styleElement?.remove(); }
        },
        {
            id: 'hideDiscoverMore', name: 'Hide "Discover More" Button',
            description: 'Hides sidebar "Discover more" button.', group: 'Declutter',
            _observer: null,
            init() {
                // FIX: Old obfuscated class .E0E5jb may rotate. Using JS text matching.
                const hide = debounce(() => {
                    document.querySelectorAll('button, [role="button"], a').forEach(el => {
                        if ((el.textContent || '').trim().toLowerCase().includes('discover more')) {
                            el.style.display = 'none';
                        }
                    });
                }, 500);
                this._observer = new MutationObserver(hide);
                this._observer.observe(document.body, { childList: true, subtree: true });
                hide();
            },
            destroy() { this._observer?.disconnect(); }
        },
        {
            id: 'hideMiscClutter',
            name: 'Hide Misc. Clutter',
            description: 'Hides meeting ads, bottom banners, and other noise.',
            group: 'Declutter',
            _styleElement: null,
            init() {
                this._styleElement = document.createElement('style');
                this._styleElement.id = 'gm-hide-misc-clutter';
                this._styleElement.textContent = `.aT, .aV2, .bq9, .Bs.nH.iY, .aLO, .apO { display: none !important; }`;
                document.head.appendChild(this._styleElement);
            },
            destroy() { this._styleElement?.remove(); }
        },

        // =========================================================
        // GROUP: Email Thread Declutter
        // =========================================================
        {
            id: 'nukeReplyMetadata',
            name: 'Nuke Reply Metadata',
            group: 'Email Thread Declutter',
            description: 'Replaces reply/forward headers with a clean divider.',
            init() {
                const featId = this.id;
                const gmailDividerSelector = 'hr[style*="display:inline-block"][style*="width:98%"]';
                const TAIL_LINES = 5;
                const PLEASANTRIES = [
                    /^(thank you|thanks|many thanks|thanks in advance)[!.,]?$/i,
                    /^(best|best regards|best wishes|warm regards|kind regards|warmly)[!.,]?$/i,
                    /^(sincerely|sincerely yours|yours truly|yours faithfully)[!.,]?$/i,
                    /^(all the best|cheers|take care)[!.,]?$/i,
                    /^(have a (?:great|nice) day)[!.,]?$/i,
                    /^(appreciate (?:your )?help)[!.,]?$/i,
                    /^(looking forward to hearing from you)[!.,]?$/i,
                    /^(with gratitude|respectfully|enjoy)[!.,]?$/i
                ];

                function stripPleasantries(el) {
                    if (el.dataset.gmPleasantriesProcessed) return;
                    el.dataset.gmPleasantriesProcessed = 'true';
                    const parts = el.innerHTML.split(/(<br\s*\/?>|<\/div>|\r?\n)/gi);
                    const lines = [];
                    parts.forEach((chunk, idx) => {
                        const text = chunk.replace(/<[^>]+>/g, '').trim();
                        if (text) lines.push({ text, idx });
                    });
                    const tail = lines.slice(-TAIL_LINES);
                    let cutAt = parts.length;
                    for (let { text, idx } of tail.reverse()) {
                        if (PLEASANTRIES.some(rx => rx.test(text))) { cutAt = idx; break; }
                    }
                    if (cutAt < parts.length) {
                        safeSetHTML(el, parts.slice(0, cutAt).join(''));
                    }
                }

                const processMetadataBlock = div => {
                    if (div.dataset.gmProcessed) return;
                    div.dataset.gmProcessed = 'true';
                    const text = div.textContent.split('\n').map(l => l.trim()).filter(l => l).join(' ');

                    const fromMatch = text.match(/From:\s*(.*?)\s*<([^>]+)>/i);
                    let name = '', email = '';
                    if (fromMatch) { name = fromMatch[1].trim(); email = fromMatch[2].trim(); }

                    const ccMatch = text.match(/Cc:\s*(.*?)\s*<([^>]+)>/i);
                    let ccName = '', ccEmail = '';
                    if (ccMatch) { ccName = ccMatch[1].trim(); ccEmail = ccMatch[2].trim(); }

                    const bccMatch = text.match(/Bcc:\s*(.*?)\s*<([^>]+)>/i);
                    let bccName = '', bccEmail = '';
                    if (bccMatch) { bccName = bccMatch[1].trim(); bccEmail = bccMatch[2].trim(); }

                    div.style.display = 'none';
                    div.dataset.gmHiddenBy = featId;

                    const hr = document.createElement('hr');
                    hr.style.cssText = 'border:none; border-top:2px dashed #5e97f6; margin:12px 0';
                    hr.dataset.gmHiddenBy = `${featId}_hr`;
                    div.parentNode.insertBefore(hr, div);

                    let last = hr;
                    const insertLine = (label, addr, addrName, suffix) => {
                        const line = document.createElement('div');
                        line.dataset.gmHiddenBy = `${featId}_${suffix}`;
                        line.style.cssText = 'margin:4px 0 12px; font-size:12px; color:#999';
                        const strong = document.createElement('strong');
                        strong.textContent = `${label}: `;
                        const a = document.createElement('a');
                        a.href = `mailto:${addr}`;
                        a.style.cssText = 'color:#8ab4f8; text-decoration:none;';
                        a.textContent = addrName || addr;
                        line.append(strong, a);
                        last.insertAdjacentElement('afterend', line);
                        last = line;
                    };
                    if (appState.settings.nukeReplyMetadataSimple && email) insertLine('From', email, name, 'simple');
                    if (appState.settings.nukeReplyMetadataShowCc && ccEmail) insertLine('Cc', ccEmail, ccName, 'cc');
                    if (appState.settings.nukeReplyMetadataShowBcc && bccEmail) insertLine('Bcc', bccEmail, bccName, 'bcc');
                };

                const findAndProcessMetadata = rootNode => {
                    if (!rootNode.querySelectorAll) return;
                    rootNode.querySelectorAll(gmailDividerSelector).forEach(el => el.remove());
                    const selectors = [
                        'blockquote div[id*="divRplyFwdMsg"]',
                        'div.gmail_quote',
                        'div[style*="1pt solid"]',
                        'p',
                        'blockquote *'
                    ];
                    rootNode.querySelectorAll(selectors.join(',')).forEach(el => {
                        const txt = el.textContent.trim();
                        if (
                            el.matches('blockquote div[id*="divRplyFwdMsg"], div.gmail_quote') ||
                            /^-+ Forwarded message -+$/i.test(txt) ||
                            /^On\s.+\swrote:$/i.test(txt) ||
                            (el.tagName === 'P' && txt.includes('From:') && txt.includes('Sent:') && txt.includes('To:') && txt.includes('Subject:')) ||
                            (el.matches('div[style*="1pt solid"]') && txt.includes('From:'))
                        ) {
                            processMetadataBlock(el);
                        }
                    });
                    if (appState.settings.nukeReplyMetadataRemovePleasantries) {
                        rootNode.querySelectorAll('.ii.gt, .a3s').forEach(stripPleasantries);
                    }
                };
                addHidingRule(featId, findAndProcessMetadata);
            },
            destroy() {
                ['_simple', '_cc', '_bcc', '_hr'].forEach(s => {
                    document.querySelectorAll(`[data-gm-hidden-by="${this.id}${s}"]`).forEach(el => el.remove());
                });
                removeHidingRule(this.id);
                document.querySelectorAll('[data-gm-processed], [data-gm-pleasantries-processed]').forEach(el => {
                    el.removeAttribute('data-gm-processed');
                    el.removeAttribute('data-gm-pleasantries-processed');
                });
            }
        },
        {
            id: 'flatReplyChain',
            name: 'Flatten Reply Indentation',
            description: 'Removes indentation and vertical lines from quoted replies.',
            group: 'Email Thread Declutter',
            _styleElement: null,
            init() {
                this._styleElement = document.createElement('style');
                this._styleElement.id = 'gm-flat-replies';
                this._styleElement.textContent = `
                    blockquote.gmail_quote, .gmail_quote, div.gmail_quote, .ii.gt blockquote {
                        margin-left: 0 !important; padding-left: 0 !important; border-left: none !important;
                    }
                `;
                document.head.appendChild(this._styleElement);
            },
            destroy() { this._styleElement?.remove(); }
        },
        {
            id: 'hideReactionButton',
            name: 'Hide "Add reaction" Button',
            group: 'Email Thread Declutter',
            description: 'Hides emoji reaction buttons on messages.',
            _styleElement: null,
            init() {
                this._styleElement = document.createElement('style');
                this._styleElement.id = 'gm-hide-reactions';
                this._styleElement.textContent = `
                    button[aria-label="Add reaction"], div.wrsVRe { display: none !important; }
                `;
                document.head.appendChild(this._styleElement);
            },
            destroy() { this._styleElement?.remove(); }
        },
        {
            id: 'hideAllSignaturesInChain',
            name: 'Hide All Signatures in Reply Chain',
            description: 'Removes signatures and "Sent from" lines from reply chains.',
            init() {
                const selfId = this.id;
                const hideSignatures = (rootNode) => {
                    if (!rootNode.querySelectorAll) return;
                    rootNode.querySelectorAll('blockquote td[style*="border-top"]').forEach(td => {
                        const tbl = td.closest('table');
                        if (tbl && tbl.style.display !== 'none') {
                            tbl.style.display = 'none'; tbl.dataset.gmHiddenBy = selfId;
                        }
                    });
                    rootNode.querySelectorAll('blockquote .gmail_signature_prefix, blockquote .gmail_signature').forEach(el => {
                        if (el.style.display !== 'none') {
                            el.style.display = 'none'; el.dataset.gmHiddenBy = selfId;
                        }
                    });
                    const hideNodeAndPrevBr = (node) => {
                        if (node.style.display !== 'none') {
                            node.style.display = 'none'; node.dataset.gmHiddenBy = selfId;
                        }
                        const prev = node.previousElementSibling;
                        if (prev && prev.tagName === 'BR' && prev.style.display !== 'none') {
                            prev.style.display = 'none'; prev.dataset.gmHiddenBy = selfId;
                        }
                    };
                    rootNode.querySelectorAll('div[dir="ltr"]').forEach(div => {
                        if (div.textContent.trim() === 'Sent from my iPhone') hideNodeAndPrevBr(div);
                    });
                    rootNode.querySelectorAll('blockquote a').forEach(a => {
                        if (/^Sent from .*Mail for iPhone$/i.test(a.textContent.trim())) {
                            hideNodeAndPrevBr(a.closest('div') || a);
                        }
                    });
                    rootNode.querySelectorAll('blockquote div[id*="ms-outlook-mobile-signature"], blockquote div:has(> a[href*="aka.ms/"])').forEach(el => {
                        if (el.style.display !== 'none') {
                            el.style.display = 'none'; el.dataset.gmHiddenBy = selfId;
                        }
                    });
                };
                addHidingRule(selfId, hideSignatures);
            },
            destroy() { removeHidingRule(this.id); }
        },

        // =========================================================
        // GROUP: Simplify Layout
        // =========================================================
        {
            id: 'simplifyNav', name: 'Streamlined Navigation',
            description: 'Hides Chat/Meet sections, tightens nav spacing.', group: 'Simplify Layout',
            _styleElement: null,
            init() {
                this._styleElement = document.createElement('style');
                this._styleElement.id = 'gm-simplify-nav';
                this._styleElement.textContent = `
                    .aeN div[role="complementary"], .aeN div[gh="ns"] { display: none !important; }
                    .aeN div[role="navigation"] { height: calc(100vh - 95px) !important; }
                    .z0 > .L3 { box-shadow: 0 1px 2px 0 rgba(60,64,67,0.3) !important; }
                    .wT { padding-top: 12px; }
                    .aeN .ajj:before { box-shadow: none !important; }
                `;
                document.head.appendChild(this._styleElement);
            },
            destroy() { this._styleElement?.remove(); }
        },
        {
            id: 'simplifyInbox', name: 'Polished Inbox',
            description: 'Centers inbox, dims read messages, softens hover, hides tab clutter.', group: 'Simplify Layout',
            _styleElement: null,
            init() {
                // FIX: Read messages no longer dim on hover (looked broken). Uses :not(:hover) guard.
                this._styleElement = document.createElement('style');
                this._styleElement.id = 'gm-simplify-inbox';
                this._styleElement.textContent = `
                    .AO .aeF > .nH { margin: 30px auto 0 auto; max-width: 1100px; }
                    .aeF { padding-right: 40px !important; margin-bottom: 120px; }
                    .zA:hover { box-shadow: inset 1px 0 0 #dadce0, 0 1px 2px 0 rgba(60,64,67,0.15) !important; }
                    .yO:not(.aps):not(:hover):not(.x7) { opacity: 0.7; }
                    .zA .cL { font-weight: normal; opacity: 0.8; }
                    .zA.yO .cL { opacity: 0.4; }
                    .aKh .aAy[aria-selected="false"] { opacity: 0.5; transition: opacity 0.2s ease; }
                    .aKh .aAy[aria-selected="false"]:hover, .aKh .aAy[aria-selected="true"] { opacity: 1; }
                    .aKh .aDG { filter: grayscale(100%); }
                    div[role="main"] .J-KU-KO.aAy:before { background-color: transparent !important; }
                    div[gh="tl"] tr.yO img.brf { opacity: 0.6; }
                    div[gh="tl"] div[role="tabpanel"] { padding-bottom: 1em; }
                    .aeF div[gh="tl"] { border-top: 0; }
                `;
                document.head.appendChild(this._styleElement);
            },
            destroy() { this._styleElement?.remove(); }
        },
        {
            id: 'simplifyConversation', name: 'Cleaner Conversation View',
            description: 'Rounds thread cards, dims icons, constrains images.', group: 'Simplify Layout',
            _styleElement: null,
            init() {
                this._styleElement = document.createElement('style');
                this._styleElement.id = 'gm-simplify-conversation';
                this._styleElement.textContent = `
                    .bAn { border-radius: 8px; }
                    .bAn .ade { opacity: 0.2; transition: opacity 0.3s ease; }
                    .bAn .ade:hover { opacity: 1; }
                    div[role="listitem"] .a3s { padding-right: 48px; }
                    div[role="listitem"] h3.iw .go { opacity: 0.5; }
                    table.Bs .gs > div:not(.gE) img:not([src*="cleardot.gif"]) { max-width: 100%; height: auto; }
                    .pfiaof { padding-bottom: 0 !important; }
                    .ata-asE { right: auto; left: 24px; bottom: 24px; font-size: 0.875rem; color: #fff; background-color: #202124; padding: 18px; border: none; box-shadow: 0 1px 3px 0 rgba(60,64,67,0.3), 0 4px 8px 3px rgba(60,64,67,0.15); }
                    .ata-asE .ata-asJ { color: #8ab4f8; padding-left: 12px; }
                `;
                document.head.appendChild(this._styleElement);
            },
            destroy() { this._styleElement?.remove(); }
        },
        {
            id: 'simplifyComposer', name: 'Improved Compose Window',
            description: 'Constrains full-screen compose width, darkens scrim.', group: 'Simplify Layout',
            _styleElement: null,
            init() {
                this._styleElement = document.createElement('style');
                this._styleElement.id = 'gm-simplify-composer';
                this._styleElement.textContent = `
                    .aSs > .aSt { width: 900px !important; left: calc(50vw - 450px) !important; }
                    .aSs .aDg > .aDj { width: 865px !important; left: calc(50vw - 435px) !important; }
                    .aSs { background-color: rgba(0,0,0,0.7); }
                    .dw form.bAs, .aSs .aSt .I5 > form.bAs { padding-top: 6px; }
                `;
                document.head.appendChild(this._styleElement);
            },
            destroy() { this._styleElement?.remove(); }
        },
        {
            id: 'simplifyAds', name: 'Hide Inbox Ads & Promos',
            description: 'Removes Google ads from inbox category tabs.', group: 'Simplify Layout',
            _styleElement: null,
            init() {
                this._styleElement = document.createElement('style');
                this._styleElement.id = 'gm-simplify-ads';
                this._styleElement.textContent = `
                    div[gh="tl"] .aKB,
                    div[gh="tl"] div[role="tabpanel"] > div.Cp:first-child,
                    div[gh="tl"] .U9:first-child + .Cp + .Cp { display: none !important; }
                `;
                document.head.appendChild(this._styleElement);
            },
            destroy() { this._styleElement?.remove(); }
        },

        // =========================================================
        // GROUP: Privacy
        // =========================================================
        {
            id: 'blockTrackerPixels',
            name: 'Block Tracker Pixels',
            description: 'Detects and blocks ~80 known email trackers. Shows shield icon.',
            group: 'Privacy',
            _observer: null, _styleElement: null,
            _trackerDomains: [
                'mailtrack.io','readnotify.com','bananatag.com','getnotify.com',
                'yesware.com','app.yesware.com','streak.com','mailfoogae.appspot.com',
                'boomeranggmail.com','postmarkapp.com','mandrillapp.com','sendgrid.net',
                'list-manage.com','mailchimp.com','ct.sendgrid.net','open.convertkit.com',
                'app.mailgun.net','brevo.com','track.hubspot.com','t.sidekickopen',
                'go.pardot.com','click.mailerlite.com','track.customer.io',
                'links.mixmax.com','track.mixmax.com','constantcontact.com',
                'r20.rs6.net','cmail20.com','cmail19.com','createsend.com',
                'email-links.superhuman.com','links.superhuman.com','salesforceiq.com',
                'cirrusinsight.com','activecampaign.com','drip.com','aweber.com',
                'moosend.com','omnisend.com','gmass.co','yamm-track.appspot.com',
                'mailmeteor.com','lemlist.com','snov.io','woodpecker.co',
                'reply.io','outreach.io','salesloft.com','apollo.io',
                'smartlead.ai','emailoctopus.com','benchmark.email'
            ],
            init() {
                const self = this;
                this._styleElement = document.createElement('style');
                this._styleElement.id = 'gm-tracker-styles';
                this._styleElement.textContent = `
                    .gm-tracker-shield {
                        display: inline-flex; align-items: center; justify-content: center;
                        width: 16px; height: 16px; margin-left: 4px;
                        background: rgba(220,53,69,0.15); border-radius: 50%;
                        vertical-align: middle; cursor: help; position: relative;
                    }
                    .gm-tracker-shield svg { width: 10px; height: 10px; fill: #dc3545; }
                    .gm-tracker-shield::after {
                        content: attr(data-tracker-name);
                        position: absolute; bottom: 100%; left: 50%; transform: translateX(-50%);
                        margin-bottom: 6px; background: #1a1a2e; color: #fff;
                        padding: 4px 8px; border-radius: 4px; font-size: 11px;
                        white-space: nowrap; opacity: 0; pointer-events: none;
                        transition: opacity 0.2s; z-index: 10;
                    }
                    .gm-tracker-shield:hover::after { opacity: 1; }
                `;
                document.head.appendChild(this._styleElement);

                const SHIELD_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-1 6h2v2h-2V7zm0 4h2v6h-2v-6z"/></svg>';
                const BLANK_GIF = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

                function isTrackerImg(img) {
                    const src = (img.src || img.getAttribute('data-src') || '').toLowerCase();
                    if (!src || src.startsWith('data:')) return null;
                    const w = parseInt(img.getAttribute('width'), 10);
                    const h = parseInt(img.getAttribute('height'), 10);
                    const isTiny = (w <= 1 && h <= 1) || (w === 0 && h === 0) ||
                        img.style.width === '1px' || img.style.width === '0px' ||
                        img.style.height === '1px' || img.style.height === '0px';
                    for (const domain of self._trackerDomains) {
                        if (src.includes(domain)) return domain.split('.').slice(-2, -1)[0] || domain;
                    }
                    if (isTiny && !src.includes('cleardot.gif') && !src.includes('spacer.gif')) {
                        if (/[?&](id|uid|eid|mid|tid|token|hash|key|ref)=/i.test(src) ||
                            /\/track(ing)?[/.]/.test(src) || /\/open[/.]/.test(src) || /\/pixel[/.]/.test(src)) {
                            try { return new URL(src).hostname.split('.').slice(-2).join('.'); } catch(e) { return 'tracker'; }
                        }
                    }
                    return null;
                }

                const scanForTrackers = debounce((rootNode) => {
                    if (!rootNode?.querySelectorAll) return;
                    rootNode.querySelectorAll('.ii.gt img, .a3s img, .gs img').forEach(img => {
                        if (img.dataset.gmTrackerScanned) return;
                        img.dataset.gmTrackerScanned = 'true';
                        const trackerName = isTrackerImg(img);
                        if (trackerName) {
                            // FIX: Set to blank GIF instead of removing src (Gmail may re-add removed src)
                            img.src = BLANK_GIF;
                            img.style.display = 'none';
                            img.dataset.gmTrackerBlocked = 'true';
                            const message = img.closest('div[role="listitem"], .gs, .adn');
                            if (message) {
                                const header = message.querySelector('.gE, h3.iw, .gH .gD, .go, .hP');
                                if (header && !header.querySelector('.gm-tracker-shield')) {
                                    const shield = document.createElement('span');
                                    shield.className = 'gm-tracker-shield';
                                    shield.dataset.trackerName = trackerName;
                                    safeSetHTML(shield, SHIELD_SVG);
                                    header.appendChild(shield);
                                }
                            }
                        }
                    });
                }, 200);

                this._observer = new MutationObserver(muts => {
                    for (const m of muts) {
                        for (const node of m.addedNodes) { if (node.nodeType === 1) scanForTrackers(node); }
                    }
                });
                this._observer.observe(document.body, { childList: true, subtree: true });
                scanForTrackers(document.body);
            },
            destroy() {
                this._observer?.disconnect();
                this._styleElement?.remove();
                document.querySelectorAll('.gm-tracker-shield').forEach(el => el.remove());
                document.querySelectorAll('[data-gm-tracker-scanned]').forEach(el => {
                    el.removeAttribute('data-gm-tracker-scanned');
                    el.removeAttribute('data-gm-tracker-blocked');
                    el.style.display = '';
                });
            }
        },
        {
            id: 'stripTrackingParams',
            name: 'Strip Tracking URL Params',
            description: 'Removes UTM and 50+ tracking params from email links.',
            group: 'Privacy',
            _observer: null,
            init() {
                const paramSet = new Set([
                    'utm_source','utm_medium','utm_campaign','utm_term','utm_content',
                    'utm_id','utm_cid','fbclid','gclid','gclsrc','dclid','gbraid','wbraid',
                    'msclkid','twclid','li_fat_id','igshid','mc_cid','mc_eid',
                    '_hsenc','_hsmi','hsa_cam','hsa_grp','hsa_mt','hsa_src','hsa_ad',
                    'hsa_acc','hsa_net','hsa_ver','hsa_la','hsa_ol','hsa_kw',
                    'vero_id','oly_enc_id','oly_anon_id','rb_clickid','wickedid',
                    'srsltid','mkt_tok','trk','trkCampaign','sc_campaign','sc_channel',
                    'sc_content','sc_medium','sc_outcome','sc_geo','sc_country'
                ]);
                const cleanLinks = debounce((rootNode) => {
                    if (!rootNode?.querySelectorAll) return;
                    rootNode.querySelectorAll('.ii.gt a[href], .a3s a[href]').forEach(a => {
                        if (a.dataset.gmCleanedLink) return;
                        a.dataset.gmCleanedLink = 'true';
                        try {
                            const url = new URL(a.href);
                            let changed = false;
                            for (const key of [...url.searchParams.keys()]) {
                                if (paramSet.has(key.toLowerCase())) { url.searchParams.delete(key); changed = true; }
                            }
                            if (changed) a.href = url.toString();
                        } catch(e) {}
                    });
                }, 200);
                this._observer = new MutationObserver(muts => {
                    for (const m of muts) {
                        for (const node of m.addedNodes) { if (node.nodeType === 1) cleanLinks(node); }
                    }
                });
                this._observer.observe(document.body, { childList: true, subtree: true });
                cleanLinks(document.body);
            },
            destroy() {
                this._observer?.disconnect();
                document.querySelectorAll('[data-gm-cleaned-link]').forEach(el => el.removeAttribute('data-gm-cleaned-link'));
            }
        },

        // =========================================================
        // GROUP: Automation
        // =========================================================
        {
            id: 'autoShowImages',
            name: 'Auto-Show Images',
            description: 'Automatically clicks "Show images" when opening emails.',
            group: 'Automation',
            _observer: null,
            init() {
                const clickShowImages = debounce((root) => {
                    if (!root?.querySelectorAll) return;
                    root.querySelectorAll('button').forEach(btn => {
                        if (btn.offsetParent !== null && (btn.innerText || '').toLowerCase().includes('show images')) {
                            btn.click();
                        }
                    });
                }, 300);
                this._observer = new MutationObserver(muts => {
                    for (const m of muts) {
                        for (const node of m.addedNodes) { if (node.nodeType === 1) clickShowImages(node); }
                    }
                });
                this._observer.observe(document.body, { childList: true, subtree: true });
                setTimeout(() => clickShowImages(document.body), 2000);
            },
            destroy() { this._observer?.disconnect(); }
        },
        {
            id: 'inboxPause',
            name: 'Inbox Pause',
            description: 'Toggle button to hide unread messages for distraction-free focus.',
            group: 'Automation',
            _styleElement: null, _button: null, _paused: false,
            init() {
                const self = this;
                this._styleElement = document.createElement('style');
                this._styleElement.id = 'gm-inbox-pause';
                document.head.appendChild(this._styleElement);

                const btn = document.createElement('button');
                btn.id = 'gm-inbox-pause-btn';
                btn.title = 'Pause/Resume Inbox';
                btn.style.cssText = `
                    position: fixed; bottom: 24px; left: 90px;
                    width: 40px; height: 40px; border-radius: 50%;
                    background: #444; color: white; border: none;
                    cursor: pointer; z-index: 9999; display: flex;
                    align-items: center; justify-content: center;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                    transition: background 0.2s, transform 0.2s;
                `;
                // FIX: SVG icons instead of unicode chars that may not render
                const pauseSvg = '<svg width="16" height="16" viewBox="0 0 24 24" fill="white"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>';
                const playSvg = '<svg width="16" height="16" viewBox="0 0 24 24" fill="white"><polygon points="5,3 19,12 5,21"/></svg>';
                safeSetHTML(btn, pauseSvg);
                btn.onclick = () => {
                    self._paused = !self._paused;
                    if (self._paused) {
                        self._styleElement.textContent = `div[gh="tl"] tr.zE { opacity: 0.05; pointer-events: none; transition: opacity 0.3s; }`;
                        safeSetHTML(btn, playSvg);
                        btn.style.background = '#dc3545';
                        showToast('Inbox paused.');
                    } else {
                        self._styleElement.textContent = '';
                        safeSetHTML(btn, pauseSvg);
                        btn.style.background = '#444';
                        showToast('Inbox resumed.');
                    }
                };
                document.body.appendChild(btn);
                this._button = btn;
            },
            destroy() { this._styleElement?.remove(); this._button?.remove(); }
        }
    ];


    // —————————————————————
    // 3. DOM HELPERS & TOAST
    // —————————————————————
    let appState = {};

    function createCogSvg() {
        const svgNS = "http://www.w3.org/2000/svg";
        const svg = document.createElementNS(svgNS, "svg");
        svg.setAttribute("viewBox", "0 0 24 24");
        svg.setAttribute("fill", "currentColor");
        svg.setAttribute("width", "24");
        svg.setAttribute("height", "24");
        const path = document.createElementNS(svgNS, "path");
        path.setAttribute("d", "M19.43 12.98c.04-.32.07-.64.07-.98s-.03-.66-.07-.98l2.11-1.65c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.3-.61-.22l-2.49 1c-.52-.4-1.08-.73-1.69-.98l-.38-2.65C14.46 2.18 14.25 2 14 2h-4c-.25 0-.46.18-.49.42l-.38 2.65c-.61.25-1.17.59-1.69-.98l-2.49-1c-.23-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64l2.11 1.65c-.04.32-.07.65-.07.98s.03.66.07.98l-2.11 1.65c-.19.15-.24.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1c.52.4 1.08.73 1.69.98l.38 2.65c.03.24.24.42.49.42h4c.25 0 .46-.18.49-.42l.38-2.65c.61-.25 1.17-.59 1.69-.98l2.49 1c.23.09.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.65zM12 15.5c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5z");
        svg.appendChild(path);
        return svg;
    }

    function showToast(message, isError = false) {
        let toast = document.getElementById('gm-toast-notification');
        if (toast) toast.remove();
        toast = document.createElement('div');
        toast.id = 'gm-toast-notification';
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed; bottom: 20px; right: 20px;
            background-color: ${isError ? '#d9534f' : '#5cb85c'};
            color: white; padding: 10px 20px; border-radius: 5px; z-index: 10002;
            opacity: 0; transition: opacity 0.3s, bottom 0.3s;
            font-family: -apple-system, BlinkMacSystemFont, sans-serif; font-size: 14px;
        `;
        document.body.appendChild(toast);
        setTimeout(() => { toast.style.opacity = '1'; toast.style.bottom = '30px'; }, 10);
        setTimeout(() => {
            toast.style.opacity = '0'; toast.style.bottom = '20px';
            toast.addEventListener('transitionend', () => toast.remove());
        }, 3000);
    }


    // —————————————————————
    // 4. UI & SETTINGS PANEL
    // —————————————————————
    function buildPanel(appState) {
        const groups = features.reduce((acc, f) => {
            acc[f.group] = acc[f.group] || [];
            acc[f.group].push(f);
            return acc;
        }, {});

        const panelContainer = document.createElement('div');
        panelContainer.id = 'gm-panel-container';
        const overlay = document.createElement('div');
        overlay.className = 'gm-panel-overlay';
        overlay.onclick = () => document.body.classList.remove('gm-panel-open');
        const panel = document.createElement('div');
        panel.className = 'gm-panel';
        panel.setAttribute('role', 'dialog');
        panel.setAttribute('aria-labelledby', 'gm-panel-title');
        const header = document.createElement('header');
        const title = document.createElement('h2');
        title.id = 'gm-panel-title';
        title.textContent = 'Gmail Premium Suite';
        const version = document.createElement('span');
        version.className = 'version';
        version.textContent = 'v7.1';
        header.append(title, version);

        const main = document.createElement('main');
        const groupOrder = ['UI & Visuals', 'Themes', 'Layout', 'Simplify Layout', 'Header Elements', 'Email Thread Declutter', 'Productivity', 'Privacy', 'Automation', 'Hubspot', 'AI & Tools', 'Declutter'];

        const createSubSetting = (id, name, description, parentInput, parentFeatureId) => {
            const wrapper = document.createElement('div');
            wrapper.className = 'gm-switch-wrapper gm-sub-setting-wrapper';
            wrapper.dataset.tooltip = description;
            const label = document.createElement('label');
            label.className = 'gm-switch';
            label.htmlFor = `switch-${id}`;
            const input = document.createElement('input');
            input.type = 'checkbox';
            input.id = `switch-${id}`;
            input.checked = appState.settings[id];
            input.onchange = async (e) => {
                appState.settings[id] = e.target.checked;
                const parentFeat = features.find(x => x.id === parentFeatureId);
                if (parentFeat) { parentFeat.destroy(); if (appState.settings[parentFeatureId]) parentFeat.init(); }
                await settingsManager.save(appState.settings);
            };
            const slider = document.createElement('span');
            slider.className = 'slider';
            const nameSpan = document.createElement('span');
            nameSpan.className = 'label';
            nameSpan.textContent = name;
            label.append(input, slider);
            wrapper.append(label, nameSpan);
            wrapper.style.display = parentInput.checked ? 'flex' : 'none';
            parentInput.addEventListener('change', (e) => { wrapper.style.display = e.target.checked ? 'flex' : 'none'; });
            return wrapper;
        };

        groupOrder.forEach(groupName => {
            if (!groups[groupName] || groups[groupName].length === 0) return;
            const fieldset = document.createElement('fieldset');
            fieldset.className = 'gm-feature-group';
            const legend = document.createElement('legend');
            legend.textContent = groupName;
            fieldset.appendChild(legend);

            groups[groupName].forEach(f => {
                const wrapper = document.createElement('div');
                wrapper.className = 'gm-switch-wrapper';
                wrapper.dataset.tooltip = f.description;
                const label = document.createElement('label');
                label.className = 'gm-switch';
                label.htmlFor = `switch-${f.id}`;
                const input = document.createElement('input');
                input.type = 'checkbox';
                input.id = `switch-${f.id}`;
                input.dataset.featureId = f.id;
                input.checked = appState.settings[f.id];
                input.onchange = async (e) => {
                    const id = e.target.dataset.featureId;
                    appState.settings[id] = e.target.checked;
                    const feat = features.find(x => x.id === id);
                    if (feat.destroy) feat.destroy();
                    if (appState.settings[id] && feat.init) feat.init();
                    await settingsManager.save(appState.settings);
                };
                const slider = document.createElement('span');
                slider.className = 'slider';
                const nameSpan = document.createElement('span');
                nameSpan.className = 'label';
                nameSpan.textContent = f.name;
                label.append(input, slider);
                wrapper.append(label, nameSpan);
                fieldset.appendChild(wrapper);

                if (f.id === 'gmailDarkMode') {
                    fieldset.append(createSubSetting('gmailDarkModePane', "Darken email viewing pane", "Applies dark theme to email content area.", input, 'gmailDarkMode'));
                }
                if (f.id === 'nukeReplyMetadata') {
                    fieldset.append(
                        createSubSetting('nukeReplyMetadataSimple', "Show simple 'From:' header", "Shows compact From line.", input, 'nukeReplyMetadata'),
                        createSubSetting('nukeReplyMetadataShowCc', "Show Cc:", "Show Cc line if available.", input, 'nukeReplyMetadata'),
                        createSubSetting('nukeReplyMetadataShowBcc', "Show Bcc:", "Show Bcc line if available.", input, 'nukeReplyMetadata'),
                        createSubSetting('nukeReplyMetadataRemovePleasantries', "Remove pleasantries", "Strips 'Thanks', 'Best regards', etc.", input, 'nukeReplyMetadata')
                    );
                }
            });
            main.appendChild(fieldset);
        });

        const footer = document.createElement('footer');
        const footerControls = document.createElement('div');
        footerControls.className = 'gm-footer-controls';

        const exportBtn = document.createElement('button');
        exportBtn.textContent = 'Export Settings';
        exportBtn.className = 'gm-btn-secondary';
        exportBtn.onclick = () => {
            const blob = new Blob([JSON.stringify(appState.settings, null, 2)], { type: 'application/json' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = 'gmail-premium-settings.json';
            a.click();
            showToast('Settings exported.');
        };

        const importBtn = document.createElement('button');
        importBtn.textContent = 'Import Settings';
        importBtn.className = 'gm-btn-secondary';
        importBtn.onclick = () => document.getElementById('gm-import-input')?.click();

        const importInput = document.createElement('input');
        importInput.type = 'file';
        importInput.id = 'gm-import-input';
        importInput.accept = '.json';
        importInput.style.display = 'none';
        importInput.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = async (event) => {
                try {
                    const imported = JSON.parse(event.target.result);
                    if (typeof imported.settingsButton !== 'boolean') throw new Error("Invalid");
                    await settingsManager.save(imported);
                    showToast('Settings imported. Reloading...');
                    setTimeout(() => window.location.reload(), 1500);
                } catch (err) {
                    showToast('Error: Invalid settings file.', true);
                }
            };
            reader.readAsText(file);
        };

        footerControls.append(importInput, importBtn, exportBtn);
        const closeBtn = document.createElement('button');
        closeBtn.id = 'gm-close-btn';
        closeBtn.className = 'gm-btn-primary';
        closeBtn.textContent = 'Close';
        closeBtn.onclick = () => document.body.classList.remove('gm-panel-open');
        footer.append(footerControls, closeBtn);

        panel.append(header, main, footer);
        panelContainer.append(overlay, panel);
        document.body.appendChild(panelContainer);
    }


    // —————————————————————
    // 5. STYLES
    // —————————————————————
    function injectStyles() {
        const style = document.createElement('style');
        style.textContent = `
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&display=swap');
            :root { --panel-font: 'Inter', sans-serif; --panel-radius: 12px; --panel-shadow: 0 10px 30px -5px rgba(0,0,0,0.3); --gm-panel-bg: #2c2c2c; --gm-panel-fg: #f0f0f0; --gm-border-color: #444; --gm-accent-color: #5e97f6; }
            body.gm-panel-open #gm-panel-container .gm-panel-overlay { opacity: 1; pointer-events: auto; }
            .gm-panel-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.5); z-index: 10000; opacity: 0; pointer-events: none; transition: opacity .3s ease; }
            .gm-panel { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) scale(0.95); width: 90%; max-width: 520px; background: var(--gm-panel-bg); color: var(--gm-panel-fg); border-radius: var(--panel-radius); box-shadow: var(--panel-shadow); font-family: var(--panel-font); opacity: 0; pointer-events: none; transition: opacity .3s ease, transform .3s ease; z-index: 10001; display: flex; flex-direction: column; }
            body.gm-panel-open .gm-panel { opacity: 1; pointer-events: auto; transform: translate(-50%, -50%) scale(1); }
            .gm-panel header { padding: 20px 24px; border-bottom: 1px solid var(--gm-border-color); display: flex; justify-content: space-between; align-items: center; }
            .gm-panel h2 { margin: 0; font-size: 18px; font-weight: 700; }
            .gm-panel .version { font-size: 12px; opacity: 0.6; }
            .gm-panel main { padding: 16px 24px; flex-grow: 1; max-height: 70vh; overflow-y: auto; }
            .gm-panel footer { padding: 16px 24px; border-top: 1px solid var(--gm-border-color); display: flex; justify-content: space-between; align-items: center; }
            .gm-feature-group { border: 1px solid var(--gm-border-color); border-radius: 8px; padding: 16px; margin: 0 0 16px; }
            .gm-feature-group legend { padding: 0 8px; font-size: 14px; font-weight: 500; color: var(--gm-accent-color); }
            .gm-switch-wrapper { display: flex; align-items: center; margin-bottom: 12px; position: relative; }
            .gm-switch-wrapper:last-child { margin-bottom: 0; }
            .gm-switch { display: flex; align-items: center; cursor: pointer; }
            .gm-switch-wrapper .label { margin-left: 12px; flex: 1; font-size: 15px; }
            .gm-switch input { display: none; }
            .gm-switch .slider { width: 40px; height: 22px; background: #555; border-radius: 11px; position: relative; transition: background .2s ease; }
            .gm-switch .slider:before { content: ''; position: absolute; top: 3px; left: 3px; width: 16px; height: 16px; background: #fff; border-radius: 50%; transition: transform .2s ease; }
            .gm-switch input:checked + .slider { background: var(--gm-accent-color); }
            .gm-switch input:checked + .slider:before { transform: translateX(18px); }
            .gm-switch-wrapper::after { content: attr(data-tooltip); position: absolute; bottom: 100%; left: 50%; transform: translateX(-50%); margin-bottom: 8px; background: #111; color: #fff; padding: 6px 10px; border-radius: 4px; font-size: 12px; white-space: nowrap; opacity: 0; pointer-events: none; transition: opacity .2s; z-index: 1; max-width: 300px; }
            .gm-switch-wrapper:hover::after { opacity: 1; }
            .gm-sub-setting-wrapper { margin-left: 20px; }
            .gm-footer-controls { display: flex; gap: 10px; }
            .gm-btn-primary { background-color: var(--gm-accent-color); color: white; border: none; padding: 10px 20px; border-radius: 6px; font-family: var(--panel-font); font-weight: 500; cursor: pointer; transition: background-color .2s; }
            .gm-btn-primary:hover { background-color: #4a80d3; }
            .gm-btn-secondary { background-color: #444; color: #ddd; border: 1px solid #666; padding: 8px 12px; border-radius: 6px; font-size: 13px; font-family: var(--panel-font); cursor: pointer; transition: background-color .2s, border-color .2s; }
            .gm-btn-secondary:hover { background-color: #555; border-color: #777; }
            .gm-btn-secondary.active { background-color: #5e97f6; border-color: #5e97f6; }
            #gm-floating-settings-btn {
                position: fixed; bottom: 24px; left: 24px; width: 56px; height: 56px;
                background-color: var(--gm-accent-color); color: white; border: none;
                border-radius: 50%; box-shadow: 0 4px 12px rgba(0,0,0,0.2); cursor: pointer;
                display: flex; align-items: center; justify-content: center; z-index: 9999;
                transition: transform .2s ease, background-color .2s ease;
            }
            #gm-floating-settings-btn:hover { transform: scale(1.05); background-color: #4a80d3; }
            /* Panel scrollbar */
            .gm-panel main::-webkit-scrollbar { width: 6px; }
            .gm-panel main::-webkit-scrollbar-track { background: transparent; }
            .gm-panel main::-webkit-scrollbar-thumb { background: #555; border-radius: 3px; }
            .gm-panel main::-webkit-scrollbar-thumb:hover { background: #777; }
        `;
        document.head.appendChild(style);
    }


    // —————————————————————
    // 6. MAIN BOOTSTRAP
    // —————————————————————
    async function main() {
        appState.settings = await settingsManager.load();

        // Dark mode pre-init at document-start to prevent white flash
        if (appState.settings.gmailDarkMode) {
            const darkModeFeat = features.find(f => f.id === 'gmailDarkMode');
            if (darkModeFeat?.preInit) darkModeFeat.preInit();
        }

        const bootstrapObserver = new MutationObserver((mutations, obs) => {
            // FIX: Also check div[role="main"] as fallback — .nH.bkK may not exist in all Gmail layouts
            if (document.querySelector('.nH.bkK') || document.querySelector('div[role="main"]')) {
                obs.disconnect();
                injectStyles();
                buildPanel(appState);
                features.forEach(f => {
                    if (appState.settings[f.id]) {
                        try { if (f.init) f.init(); }
                        catch (error) { console.error(`[Gmail Premium] Error in "${f.id}":`, error); }
                    }
                });
                settingsManager.getFirstRunStatus().then(hasRun => {
                    if (!hasRun) {
                        document.body.classList.add('gm-panel-open');
                        settingsManager.setFirstRunStatus(true);
                    }
                });
            }
        });

        // Wait for body to exist before observing (runs at document-start)
        const waitForBody = () => {
            if (document.body) {
                bootstrapObserver.observe(document.body, { childList: true, subtree: true });
            } else {
                requestAnimationFrame(waitForBody);
            }
        };
        waitForBody();
    }

    main().catch(error => {
        console.error("[Gmail Premium] Failed to initialize:", error);
    });

})();