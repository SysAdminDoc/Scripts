// ==UserScript==
// @name         IMDb Enhanced
// @namespace    https://github.com/SysAdminDoc
// @version      2.0.0
// @description  All-in-one IMDb overhaul: ad/bloat removal, modern themes, inline RT & Metacritic scores, collapsible sections, spoiler blur, quick-nav, expanded external links, TV show tools, multi-site search, settings with export/import
// @author       SysAdminDoc
// @match        https://www.imdb.com/title/*
// @match        https://www.imdb.com/name/*
// @match        https://www.imdb.com/*/title/*
// @match        https://www.imdb.com/*/name/*
// @match        https://www.cineby.app/search
// @match        https://www.cineby.gd/search
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_addStyle
// @grant        GM_setClipboard
// @grant        GM_xmlhttpRequest
// @grant        GM_listValues
// @connect      www.rottentomatoes.com
// @connect      backend.metacritic.com
// @connect      www.opensubtitles.org
// @connect      *
// @run-at       document-idle
// @license      MIT
// @downloadURL  https://github.com/SysAdminDoc/IMDb-Enhanced/raw/main/IMDb_Enhanced.user.js
// @updateURL    https://github.com/SysAdminDoc/IMDb-Enhanced/raw/main/IMDb_Enhanced.user.js
// ==/UserScript==

(function () {
    'use strict';

    // =========================================================================
    //  CONSTANTS & CONFIG
    // =========================================================================
    const VERSION = '2.0.0';
    const PREFIX  = 'imdb_enh_';
    const CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

    const DEFAULTS = {
        // Cleanup
        removeAds: true, removeProUpsell: true, removeNewsSection: true,
        removeRelatedInterests: true, removeContribution: true,
        removeSponsoredRecs: true, removeAppBanner: true,
        // Appearance
        modernUI: true, compactHeader: true, enhancedRatingDisplay: true,
        widerLayout: true, ratingColorCoding: true,
        // Theme
        themeVariant: 'dark', // dark | oled | midnight
        // Sections
        collapsibleSections: true, spoilerBlur: true, quickNav: true,
        // Scores
        inlineRTScore: true, inlineMetacriticScore: true,
        // Links
        searchButtons: true, externalLinks: true, expandedLinkMenu: true,
        // TV
        tvShowEnhancements: true, subtitleLinks: true,
        // Utility
        quickCopyID: true, keyboardShortcuts: true,
    };

    // =========================================================================
    //  STORAGE HELPERS
    // =========================================================================
    const get = (k) => GM_getValue(PREFIX + k, DEFAULTS[k]);
    const set = (k, v) => GM_setValue(PREFIX + k, v);

    function cacheGet(key) {
        try {
            const raw = GM_getValue('cache_' + key, null);
            if (!raw) return null;
            const { data, ts } = JSON.parse(raw);
            if (Date.now() - ts > CACHE_TTL) return null;
            return data;
        } catch { return null; }
    }
    function cacheSet(key, data) {
        GM_setValue('cache_' + key, JSON.stringify({ data, ts: Date.now() }));
    }

    // =========================================================================
    //  DOM UTILITIES
    // =========================================================================
    function waitFor(sel, timeout = 8000) {
        return new Promise((resolve, reject) => {
            const el = document.querySelector(sel);
            if (el) return resolve(el);
            const obs = new MutationObserver(() => {
                const el = document.querySelector(sel);
                if (el) { obs.disconnect(); resolve(el); }
            });
            obs.observe(document.body, { childList: true, subtree: true });
            setTimeout(() => { obs.disconnect(); reject(); }, timeout);
        });
    }

    function addCSS(css, id) {
        let s = document.getElementById(id);
        if (s) { s.textContent = css; return s; }
        s = document.createElement('style');
        s.id = id; s.textContent = css;
        document.head.appendChild(s);
        return s;
    }
    function removeCSS(id) { document.getElementById(id)?.remove(); }

    function makeEl(tag, attrs = {}, ...children) {
        const e = document.createElement(tag);
        for (const [k, v] of Object.entries(attrs)) {
            if (k === 'style' && typeof v === 'object') Object.assign(e.style, v);
            else if (k === 'className') e.className = v;
            else if (k === 'innerHTML') e.innerHTML = v;
            else if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2).toLowerCase(), v);
            else if (k === 'dataset') Object.assign(e.dataset, v);
            else e.setAttribute(k, v);
        }
        for (const c of children) {
            if (typeof c === 'string') e.appendChild(document.createTextNode(c));
            else if (c) e.appendChild(c);
        }
        return e;
    }

    // =========================================================================
    //  PAGE DATA EXTRACTION
    // =========================================================================
    function getIMDbID()   { return window.location.pathname.match(/\/(tt\d+)/)?.[1] || null; }
    function getTitleText() {
        return (document.querySelector('[data-testid="hero__primary-text"]') ||
                document.querySelector('h1'))?.textContent?.trim() || '';
    }

    let _ldData = null;
    function getLDData() {
        if (_ldData) return _ldData;
        try {
            const s = document.querySelector('script[type="application/ld+json"]');
            if (s) _ldData = JSON.parse(s.textContent);
        } catch { /* ignore */ }
        return _ldData || {};
    }

    function getTitleYear() {
        const ld = getLDData();
        if (ld.datePublished) return ld.datePublished.substring(0, 4);
        const inlines = document.querySelectorAll('.sc-af040695-0 ul a, [data-testid="hero-subnav-bar-left-block"] a');
        for (const a of inlines) { const m = a.textContent.match(/\b(19|20)\d{2}\b/); if (m) return m[0]; }
        return '';
    }

    function getMediaType() {
        const ld = getLDData();
        if (ld['@type'] === 'TVSeries' || ld['@type'] === 'TVEpisode') return 'tv';
        return 'movie';
    }

    function getIMDbRating() {
        const ld = getLDData();
        return ld.aggregateRating?.ratingValue || null;
    }

    // =========================================================================
    //  TOAST
    // =========================================================================
    function showToast(msg, duration = 2500) {
        document.getElementById('enh-toast')?.remove();
        const t = makeEl('div', { id: 'enh-toast' }, msg);
        document.body.appendChild(t);
        requestAnimationFrame(() => t.classList.add('visible'));
        setTimeout(() => { t.classList.remove('visible'); setTimeout(() => t.remove(), 350); }, duration);
    }

    // =========================================================================
    //  ASYNC HTTP
    // =========================================================================
    function httpGet(url, opts = {}) {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'GET', url,
                timeout: opts.timeout || 10000,
                ...opts,
                onload: (r) => r.status >= 400 ? reject(r) : resolve(r),
                onerror: reject, ontimeout: reject,
            });
        });
    }

    // =========================================================================
    //  FEATURE REGISTRY
    // =========================================================================
    const features = [];
    function reg(f) { features.push(f); }

    // #########################################################################
    //
    //  CLEANUP FEATURES
    //
    // #########################################################################

    reg({
        key: 'removeAds', name: 'Remove Ads & Tracking', group: 'Cleanup',
        css: `.nas-slot,.slot_wrapper,[id*="gpt-ad"],[id*="inline20"],[id*="inline50"],
            [id="sis_pixel_r2"],[id="cookie_sync_pixel"],.inline20-page-background,
            [class*="AdSlot"],[class*="adslot"],iframe[src*="amazon-adsystem"],
            .ipc-wrap-background,#ipc-wrap-background-id,.sponsored_label,.sponsored-content,
            [data-testid="inline-video-playback-container"]
            {display:none!important;height:0!important;overflow:hidden!important}`,
        init() { addCSS(this.css, 'enh-removeAds'); },
        destroy() { removeCSS('enh-removeAds'); }
    });

    reg({
        key: 'removeProUpsell', name: 'Remove IMDbPro Upsells', group: 'Cleanup',
        css: `[data-testid="hero-subnav-bar-imdb-pro-link"],[data-testid="hero-proupsell"],
            a[href*="pro.imdb.com"],[class*="ProUpsell"],[class*="proupsell"],
            [data-testid="tm-box-addtolist-button"]{display:none!important}`,
        init() { addCSS(this.css, 'enh-proUpsell'); },
        destroy() { removeCSS('enh-proUpsell'); }
    });

    reg({ key: 'removeNewsSection', name: 'Remove News Section', group: 'Cleanup',
        css: `section[data-testid="News"]{display:none!important}`,
        init() { addCSS(this.css, 'enh-news'); }, destroy() { removeCSS('enh-news'); } });

    reg({ key: 'removeRelatedInterests', name: 'Remove Related Interests', group: 'Cleanup',
        css: `section[data-testid="RelatedInterests"]{display:none!important}`,
        init() { addCSS(this.css, 'enh-relInt'); }, destroy() { removeCSS('enh-relInt'); } });

    reg({ key: 'removeContribution', name: 'Remove Contribution CTA', group: 'Cleanup',
        css: `section[data-testid="contribution"]{display:none!important}`,
        init() { addCSS(this.css, 'enh-contrib'); }, destroy() { removeCSS('enh-contrib'); } });

    reg({ key: 'removeSponsoredRecs', name: 'Remove Sponsored Recs', group: 'Cleanup',
        css: `[cel_widget_id*="Sponsored"],[class*="Sponsored"]{display:none!important}`,
        init() { addCSS(this.css, 'enh-sponsRecs'); }, destroy() { removeCSS('enh-sponsRecs'); } });

    reg({ key: 'removeAppBanner', name: 'Remove App Banner', group: 'Cleanup',
        css: `.footer__app,.imdb-footer__open-in-app-button,[class*="AppBanner"],#announcement-text{display:none!important}`,
        init() { addCSS(this.css, 'enh-appBanner'); }, destroy() { removeCSS('enh-appBanner'); } });

    // #########################################################################
    //
    //  THEME SYSTEM
    //
    // #########################################################################

    // ===================== DESIGN SYSTEM =====================
    // 4px grid, 3-tier elevation, semantic color roles, consistent radius scale
    const THEMES = {
        dark: {
            // Surfaces (elevation layers)
            bg:     '#101014',  // base canvas
            sf0:    '#18181c',  // card level 0
            sf1:    '#1e1e24',  // card level 1 (hover, nested)
            sf2:    '#26262e',  // card level 2 (active, popovers)
            // Borders
            bd0:    'rgba(255,255,255,0.05)',  // subtle dividers
            bd1:    'rgba(255,255,255,0.08)',  // card borders
            bd2:    'rgba(255,255,255,0.12)',  // hover borders
            // Shadows
            sh1:    '0 1px 3px rgba(0,0,0,0.3), 0 1px 2px rgba(0,0,0,0.2)',
            sh2:    '0 4px 16px rgba(0,0,0,0.35), 0 1px 4px rgba(0,0,0,0.25)',
            sh3:    '0 12px 40px rgba(0,0,0,0.5), 0 2px 8px rgba(0,0,0,0.3)',
            // Text hierarchy
            tx0:    '#f0f0f2',  // primary headings
            tx1:    '#c8c8d0',  // body text
            tx2:    '#8888a0',  // secondary / muted
            tx3:    '#55556a',  // disabled / tertiary
            // Accent palette
            accent: '#f5c518',  // IMDb gold
            accentMuted: 'rgba(245,197,24,0.12)',
            accentBorder: 'rgba(245,197,24,0.20)',
            blue:   '#4da8f0',  // links, info
            blueHi: '#7dc4ff',  // link hover
            blueMuted: 'rgba(77,168,240,0.10)',
            red:    '#e84057',  // ratings, alerts
            redMuted: 'rgba(232,64,87,0.10)',
            green:  '#3dd68c',  // positive
            // Header / chrome
            hdr:    'rgba(16,16,20,0.82)',
            hdrBorder: 'rgba(255,255,255,0.04)',
            // Scrollbar
            sT:     '#2a2a34', sH: '#3e3e4a',
            // Quote accent
            quoteBar: '#4da8f0',
        },
        oled: {
            bg:     '#000000',
            sf0:    '#0c0c0e',
            sf1:    '#141418',
            sf2:    '#1c1c22',
            bd0:    'rgba(255,255,255,0.04)',
            bd1:    'rgba(255,255,255,0.06)',
            bd2:    'rgba(255,255,255,0.10)',
            sh1:    '0 1px 3px rgba(0,0,0,0.6), 0 1px 2px rgba(0,0,0,0.4)',
            sh2:    '0 4px 16px rgba(0,0,0,0.6), 0 1px 4px rgba(0,0,0,0.4)',
            sh3:    '0 12px 40px rgba(0,0,0,0.7), 0 2px 8px rgba(0,0,0,0.5)',
            tx0:    '#e4e4e8',
            tx1:    '#b0b0bc',
            tx2:    '#6e6e80',
            tx3:    '#444458',
            accent: '#f5c518',
            accentMuted: 'rgba(245,197,24,0.10)',
            accentBorder: 'rgba(245,197,24,0.18)',
            blue:   '#3d98e0',
            blueHi: '#6cb8ff',
            blueMuted: 'rgba(61,152,224,0.08)',
            red:    '#d63850',
            redMuted: 'rgba(214,56,80,0.08)',
            green:  '#30c47c',
            hdr:    'rgba(0,0,0,0.92)',
            hdrBorder: 'rgba(255,255,255,0.03)',
            sT:     '#1a1a22', sH: '#2a2a34',
            quoteBar: '#3d98e0',
        },
        midnight: {
            bg:     '#0a0e1c',
            sf0:    '#10152a',
            sf1:    '#161c34',
            sf2:    '#1e2644',
            bd0:    'rgba(120,160,255,0.05)',
            bd1:    'rgba(120,160,255,0.08)',
            bd2:    'rgba(120,160,255,0.14)',
            sh1:    '0 1px 3px rgba(0,0,20,0.4), 0 1px 2px rgba(0,0,20,0.3)',
            sh2:    '0 4px 16px rgba(0,0,20,0.45), 0 1px 4px rgba(0,0,20,0.3)',
            sh3:    '0 12px 40px rgba(0,0,20,0.6), 0 2px 8px rgba(0,0,20,0.35)',
            tx0:    '#e4e8f4',
            tx1:    '#b4bcda',
            tx2:    '#6c78a8',
            tx3:    '#445080',
            accent: '#f5c518',
            accentMuted: 'rgba(245,197,24,0.10)',
            accentBorder: 'rgba(245,197,24,0.20)',
            blue:   '#5eaaff',
            blueHi: '#8ec8ff',
            blueMuted: 'rgba(94,170,255,0.10)',
            red:    '#f06070',
            redMuted: 'rgba(240,96,112,0.10)',
            green:  '#48e098',
            hdr:    'rgba(10,14,28,0.88)',
            hdrBorder: 'rgba(120,160,255,0.05)',
            sT:     '#1c2444', sH: '#283460',
            quoteBar: '#5eaaff',
        },
    };

    function getThemeCSS(id) {
        const t = THEMES[id] || THEMES.dark;
        return `
/* ════════════════════════════════════════════
   BASE CANVAS & TYPOGRAPHY
   ════════════════════════════════════════════ */
body, .ipc-page-background, .ipc-page-background--base,
.ipc-page-background--baseAlt { background: ${t.bg} !important; }

*, *::before, *::after { scroll-behavior: smooth; }

/* Type scale — tighten the whole page */
[data-testid="hero__primary-text"] {
    font-weight: 700 !important; letter-spacing: -0.025em !important;
    line-height: 1.1 !important; color: ${t.tx0} !important;
}
.ipc-title__text {
    font-weight: 600 !important; letter-spacing: -0.015em !important;
    color: ${t.tx0} !important;
}
h3.ipc-title__text { color: ${t.blue} !important; }
a h3 span, a h3 .ipc-title__text { color: ${t.blue} !important; }
.ipc-title__description { color: ${t.tx2} !important; margin-top: 2px !important; }

/* Body text */
.ipc-html-content-inner-div { color: ${t.tx1} !important; }
.ipc-overflowText--children { color: ${t.tx1} !important; }

/* Metadata labels & values */
.ipc-metadata-list-item__label { color: ${t.tx2} !important; }
span.ipc-metadata-list-item__label.ipc-btn--not-interactable { color: ${t.tx2} !important; }
a.ipc-metadata-list-item__label--link { color: ${t.blue} !important; }
a.ipc-metadata-list-item__label--link:hover { color: ${t.blueHi} !important; }
.ipc-metadata-list-item__list-content-item--link,
.ipc-metadata-list-item__list-content-item a { color: ${t.blue} !important; }
.ipc-metadata-list-item__list-content-item--link:hover,
.ipc-metadata-list-item__list-content-item a:hover { color: ${t.blueHi} !important; }

/* Muted / secondary text */
span.sc-8eb6700a-4, .sc-2df17e0-0 { color: ${t.tx3} !important; }
span.sc-8eb6700a-9 { color: ${t.red} !important; }
a.sc-8eb6700a-1 { color: ${t.tx0} !important; }
div.sc-734856d5-2 { color: ${t.blue} !important; }

/* Links — global */
.ipc-link, .ipc-link--base { color: ${t.blue} !important; transition: color .15s ease !important; }
.ipc-link:hover, .ipc-link--base:hover { color: ${t.blueHi} !important; }
.ipc-md-link--entity { color: ${t.blue} !important; }

/* Rating star */
span.ipc-rating-star--rating { color: ${t.accent} !important; font-weight: 700 !important; }
span.ipc-rating-star--maxRating { color: ${t.tx3} !important; }

/* ════════════════════════════════════════════
   ELEVATION SYSTEM — CARDS & SECTIONS
   ════════════════════════════════════════════ */

/* Title page main sections → elevation 0 cards */
section[data-testid="title-cast"],
section[data-testid="UserReviews"],
section[data-testid="MoreLikeThis"],
section[data-testid="Details"],
section[data-testid="BoxOffice"],
section[data-testid="TechSpecs"],
section[data-testid="DidYouKnow"],
section[data-testid="videos-section"],
section[data-testid="Photos"],
section[data-testid="Filmography"],
section[data-testid="PersonalDetails"] {
    background: ${t.sf0} !important;
    border: 1px solid ${t.bd1} !important;
    border-radius: 12px !important;
    padding: 20px 24px !important;
    margin-bottom: 12px !important;
    box-shadow: ${t.sh1} !important;
    transition: border-color .2s ease !important;
}

/* Hero section */
section[data-testid="hero-parent"] {
    background: linear-gradient(180deg, ${t.sf0} 0%, ${t.bg} 100%) !important;
    border-radius: 0 0 16px 16px !important;
    padding-bottom: 24px !important;
    border-bottom: 1px solid ${t.bd0} !important;
}

/* Transparent base sections (prevent double-backgrounds) */
section.ipc-page-section.ipc-page-section--base { background: transparent !important; }
section.ipc-page-section.ipc-page-section--none { background: transparent !important; }

/* Generic list cards → transparent or elevation 0 */
.ipc-list-card--border-line { border-color: ${t.bd0} !important; }
.ipc-list-card--border-line.ipc-list-card--tp-none.ipc-list-card--bp-none { background: transparent !important; }
.ipc-list-card--span.ipc-list-card--border-shadow { background: transparent !important; }
.ipc-inline-list--show-dividers .ipc-inline-list__item::after { border-color: ${t.bd0} !important; }

/* ════════════════════════════════════════════
   CAST CARDS — elevation 1 with hover lift
   ════════════════════════════════════════════ */
[data-testid="title-cast-item"] {
    background: ${t.sf1} !important;
    border: 1px solid ${t.bd1} !important;
    border-radius: 10px !important;
    overflow: hidden !important;
    box-shadow: ${t.sh1} !important;
    transition: transform .2s cubic-bezier(.4,0,.2,1),
                border-color .2s ease,
                box-shadow .2s ease !important;
}
[data-testid="title-cast-item"]:hover {
    transform: translateY(-3px) !important;
    border-color: ${t.accentBorder} !important;
    box-shadow: ${t.sh2} !important;
}

/* ════════════════════════════════════════════
   POSTER CARDS (More Like This, shovelers)
   ════════════════════════════════════════════ */
.ipc-poster-card {
    border-radius: 10px !important;
    overflow: hidden !important;
    transition: transform .2s cubic-bezier(.4,0,.2,1),
                box-shadow .2s ease !important;
}
.ipc-poster-card:hover {
    transform: translateY(-4px) !important;
    box-shadow: ${t.sh2} !important;
}

/* Hero poster */
[data-testid="hero-media__poster"] img {
    border-radius: 10px !important;
    box-shadow: ${t.sh2} !important;
    transition: transform .25s cubic-bezier(.4,0,.2,1),
                box-shadow .25s ease !important;
}
[data-testid="hero-media__poster"]:hover img {
    transform: scale(1.03) !important;
    box-shadow: ${t.sh3} !important;
}

/* ════════════════════════════════════════════
   SQUIRCLE SYSTEM — circles → rounded squares
   ════════════════════════════════════════════ */
.ipc-avatar, .ipc-avatar__avatar-image,
[class*="avatar"] img, [class*="Avatar"] img,
.ipc-media--circle, .ipc-media--avatar,
img[class*="avatar"], img[class*="Avatar"],
[class*="ipc-avatar"] {
    border-radius: 22% !important;
}
[style*="border-radius: 50%"], [style*="border-radius:50%"] {
    border-radius: 22% !important;
}

/* ════════════════════════════════════════════
   BUTTONS & CHIPS
   ════════════════════════════════════════════ */
.ipc-btn--core-accent1 {
    border-radius: 8px !important;
    transition: transform .15s ease, box-shadow .15s ease, background .15s ease !important;
}
.ipc-btn--core-accent1:hover {
    transform: translateY(-1px) !important;
    box-shadow: 0 4px 16px ${t.accentMuted} !important;
}
.ipc-chip, .ipc-chip--on-base, .ipc-chip--on-baseAlt {
    border-radius: 20px !important;
    border-color: ${t.bd1} !important;
    background: ${t.sf0} !important;
    transition: all .15s ease !important;
}
.ipc-chip:hover, .ipc-chip--on-base:hover {
    background: ${t.sf1} !important;
    border-color: ${t.bd2} !important;
}
.ipc-chip--filled {
    background: ${t.sf1} !important;
}

/* ════════════════════════════════════════════
   REVIEW PAGE
   ════════════════════════════════════════════ */
[data-testid="review-card-parent"] {
    background: ${t.sf0} !important;
    border: 1px solid ${t.bd1} !important;
    border-radius: 10px !important;
    padding: 16px 20px !important;
    margin: 0 0 10px 0 !important;
    box-shadow: ${t.sh1} !important;
    transition: border-color .2s ease !important;
}
[data-testid="review-card-parent"]:hover {
    border-color: ${t.bd2} !important;
}
[data-testid="review-summary"] .ipc-title__text {
    color: ${t.tx0} !important;
    font-weight: 600 !important;
}
[data-testid="author-link"], [data-testid="reviews-author"] {
    color: ${t.blue} !important;
}
[data-testid="review-overflow"] .ipc-html-content-inner-div {
    color: ${t.tx1} !important;
    line-height: 1.65 !important;
}
.ipc-list-card__content { padding: 8px 0 !important; }
/* Review rating stars inline */
.sc-fa7e37dc-4, .sc-fa7e37dc-5 { color: ${t.tx2} !important; }

/* ════════════════════════════════════════════
   QUOTES PAGE — blockquote style with accent bar
   ════════════════════════════════════════════ */
.sc-a25cb019-0, [class*="sc-a25cb019"] > .ipc-list-card {
    background: ${t.sf0} !important;
    border: 1px solid ${t.bd1} !important;
    border-left: 3px solid ${t.quoteBar} !important;
    border-radius: 0 10px 10px 0 !important;
    padding: 12px 16px !important;
    margin: 0 0 8px 0 !important;
    box-shadow: ${t.sh1} !important;
}
.sc-a25cb019-5, .sc-a25cb019-8, .sc-a25cb019-10, .sc-a25cb019-11 {
    padding: 4px 0 !important;
    margin: 0 !important;
}
.sc-a25cb019-11 .ipc-html-content-inner-div {
    color: ${t.tx1} !important;
    line-height: 1.6 !important;
    font-style: italic !important;
}

/* ════════════════════════════════════════════
   NAME / PERSON PAGE
   ════════════════════════════════════════════ */
/* Hero photo → squircle with shadow */
[data-testid="name-overview-widget"] img,
.name-overview-widget img,
.sc-b8154748-0 .ipc-media img {
    border-radius: 14px !important;
    box-shadow: ${t.sh2} !important;
}
/* Bio text */
[data-testid="bio-content"] { color: ${t.tx1} !important; }
[data-testid="bio-content"] .ipc-html-content-inner-div {
    color: ${t.tx1} !important;
    line-height: 1.65 !important;
}
/* Filmography accordion */
.ipc-accordion__item {
    border-color: ${t.bd0} !important;
    transition: background .15s ease !important;
}
.ipc-accordion__item:hover { background: ${t.sf1} !important; }
.ipc-accordion__item__header {
    padding: 10px 0 !important;
}
.ipc-accordion__item__title { color: ${t.tx0} !important; font-weight: 600 !important; }
.ipc-accordion__item__content { padding: 0 !important; }
/* Personal details */
[data-testid="PersonalDetails"] .ipc-metadata-list-item__label { color: ${t.tx2} !important; }
[data-testid="PersonalDetails"] a { color: ${t.blue} !important; }

/* ════════════════════════════════════════════
   SIDEBAR (all subpages)
   ════════════════════════════════════════════ */
[data-testid="sidebar-sticky-block"] .ipc-slate-card {
    border-radius: 10px !important;
    overflow: hidden !important;
    box-shadow: ${t.sh1} !important;
}
.sc-3a3777a6-2 {
    background: ${t.sf0} !important;
    border-color: ${t.bd0} !important;
    border-radius: 8px !important;
    transition: background .15s ease !important;
}
.sc-3a3777a6-2:hover { background: ${t.sf1} !important; }
.sc-3a3777a6-5.listName { color: ${t.tx0} !important; }
.sc-2df17e0-0 { color: ${t.tx3} !important; }

/* ════════════════════════════════════════════
   SCROLLBAR
   ════════════════════════════════════════════ */
::-webkit-scrollbar { width: 8px; height: 8px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: ${t.sT}; border-radius: 4px; }
::-webkit-scrollbar-thumb:hover { background: ${t.sH}; }

/* ════════════════════════════════════════════
   FOOTER & CHROME CLEANUP
   ════════════════════════════════════════════ */
footer.imdb-footer { display: none !important; }
button.FavoritePeopleCTA_favPeopleCTAOnAvatar__ZQ2LQ { display: none !important; }
div.sc-9194d746-1 { display: none !important; }
div.sc-5df4a22b-1 { display: none !important; }
div.nav__userMenu { display: none !important; }

/* ════════════════════════════════════════════
   SUBTITLE & CUSTOM ROWS
   ════════════════════════════════════════════ */
#enh-sub-row { color: ${t.blue} !important; }
#enh-sub-row a { color: ${t.blue} !important; }
#enh-sub-row a:hover { color: ${t.blueHi} !important; }

/* ════════════════════════════════════════════
   GLOBAL SPACING RHYTHM (4px grid)
   ════════════════════════════════════════════ */
.ipc-page-section { margin-top: 0 !important; margin-bottom: 0 !important; }
.ipc-page-section--tp-none { padding-top: 0 !important; }
.ipc-page-section--bp-none { padding-bottom: 0 !important; }
.ipc-title { margin-bottom: 8px !important; }
.ipc-chip-list__scroller { gap: 6px !important; }
.ipc-overflowText--children { margin: 0 !important; }

/* ════════════════════════════════════════════
   FOCUS STATES (accessibility)
   ════════════════════════════════════════════ */
a:focus-visible, button:focus-visible, .ipc-chip:focus-visible {
    outline: 2px solid ${t.accent} !important;
    outline-offset: 2px !important;
}
        `;
    }

    reg({
        key: 'modernUI', name: 'Modern UI Theme', group: 'Appearance',
        init() { addCSS(getThemeCSS(get('themeVariant')), 'enh-modernUI'); },
        destroy() { removeCSS('enh-modernUI'); }
    });

    reg({
        key: 'compactHeader', name: 'Compact Header', group: 'Appearance',
        init() {
            const t = THEMES[get('themeVariant')] || THEMES.dark;
            addCSS(`
                #imdbHeader {
                    padding: 4px 0 !important;
                    backdrop-filter: blur(16px) saturate(1.5) !important;
                    -webkit-backdrop-filter: blur(16px) saturate(1.5) !important;
                    background: ${t.hdr} !important;
                    border-bottom: 1px solid ${t.hdrBorder} !important;
                    transition: background .2s ease !important;
                }
                .navbar__inner { min-height: 46px !important; }
                #imdbHeader .imdb-header__logo-link svg { height: 24px !important; width: auto !important; }
            `, 'enh-compactHdr');
        },
        destroy() { removeCSS('enh-compactHdr'); }
    });

    reg({
        key: 'enhancedRatingDisplay', name: 'Enhanced Rating Display', group: 'Appearance',
        init() {
            const t = THEMES[get('themeVariant')] || THEMES.dark;
            addCSS(`
                [data-testid="hero-rating-bar__aggregate-rating"] {
                    background: ${t.accentMuted} !important;
                    border: 1px solid ${t.accentBorder} !important;
                    border-radius: 12px !important;
                    padding: 8px 16px !important;
                    box-shadow: 0 0 24px ${t.accentMuted} !important;
                    transition: background .2s ease, box-shadow .2s ease !important;
                }
                [data-testid="hero-rating-bar__aggregate-rating"]:hover {
                    background: rgba(245,197,24,0.16) !important;
                    box-shadow: 0 0 32px rgba(245,197,24,0.12) !important;
                }
                [data-testid="hero-rating-bar__aggregate-rating__score"] span:first-child {
                    font-size: 1.6em !important; font-weight: 800 !important;
                    color: ${t.accent} !important;
                    text-shadow: 0 0 24px ${t.accentMuted} !important;
                }
                [data-testid="hero-rating-bar__popularity"] {
                    background: ${t.blueMuted} !important;
                    border: 1px solid rgba(77,168,240,0.12) !important;
                    border-radius: 12px !important; padding: 8px 16px !important;
                }
            `, 'enh-enhRating');
        },
        destroy() { removeCSS('enh-enhRating'); }
    });

    reg({ key: 'widerLayout', name: 'Wider Page Layout', group: 'Appearance',
        css: `
/* ── Full-width containers ── */
.ipc-page-content-container--center { max-width: 100% !important; padding: 0 32px !important; }
.ipc-page-section--base.celwidget { width: 100% !important; max-width: 100% !important; }
.bRimta { width: 100% !important; max-width: 100% !important; }
.ipc-page-grid { max-width: 100% !important; width: 100% !important; padding: 0 32px !important; }
.ipc-page-content-container--full { max-width: 100% !important; width: 100% !important; }
.ipc-page-wrapper { max-width: 100% !important; }
[data-testid="atf-wrapper-bg"] { max-width: 100% !important; }

/* ── Poster card compaction ── */
div.ipc-rating-star-group.ipc-poster-card__rating-star-group {
    padding: 0 !important; margin: 0 !important;
}
a.ipc-poster-card__title.ipc-poster-card__title--clamp-2.ipc-poster-card__title--clickable {
    padding: 0 !important; margin: 0 0 -29px 0 !important;
}

/* ── Grid & shoveler spacing ── */
div.ipc-sub-grid.ipc-sub-grid--page-span-2.ipc-sub-grid--nowrap.ipc-shoveler__grid {
    padding: 0 !important; margin: 0 !important;
}

/* ── Section vertical compression ── */
section.ipc-page-section.ipc-page-section--base.celwidget {
    padding: 0 !important; margin: 0 !important;
}
div.ipc-html-content-inner-div { padding: 0 !important; margin: 0 !important; }
li.ipc-metadata-list__item.ipc-metadata-list__item--align-end.ipc-metadata-list-item--link {
    padding: 0 !important; margin: 0 !important;
}
h3.ipc-title__text.ipc-title__text--reduced { padding: 0 !important; margin: 0 !important; }
.sc-14a487d5-7 { padding: 0 !important; margin: 0 !important; }

/* ── Accordion (filmography) ── */
.ipc-accordion__item__content_inner { padding: 4px 0 !important; }
.ipc-accordion__item__header { padding: 8px 0 !important; min-height: auto !important; }

/* ── Review / quote specific ── */
[data-testid="review-overflow"] { margin: 4px 0 !important; }
.sc-a25cb019-5 { padding: 4px 0 !important; margin: 2px 0 !important; }
.sc-a25cb019-8 { padding: 2px 0 !important; }
.sc-a25cb019-10 { margin: 2px 0 !important; }
.ipc-chip-list__scroller { padding: 4px 0 !important; }

/* ── Sidebar compression ── */
.sc-2f4a6fec-3, .sc-2f4a6fec-4 { gap: 0 !important; }
.ipc-page-section--none { margin: 0 !important; padding: 4px 0 !important; }

/* ── Name page ── */
[data-testid="bio-content"] { padding: 4px 0 !important; }
[data-testid="PersonalDetails"] { padding: 4px 0 !important; }
[data-testid="Filmography"] { padding: 4px 0 !important; }
        `,
        init() { addCSS(this.css, 'enh-wider'); }, destroy() { removeCSS('enh-wider'); } });

    // ===================== RATING COLOR CODING =====================
    function ratingColor(val) {
        const n = parseFloat(val);
        if (isNaN(n)) return { bg:'#555', text:'#ccc', label:'N/A' };
        if (n >= 8.0) return { bg:'#22c55e', text:'#fff', label:'Great' };
        if (n >= 7.0) return { bg:'#84cc16', text:'#000', label:'Good' };
        if (n >= 6.0) return { bg:'#eab308', text:'#000', label:'Average' };
        if (n >= 5.0) return { bg:'#f97316', text:'#000', label:'Below Avg' };
        return { bg:'#ef4444', text:'#fff', label:'Poor' };
    }
    function mcColor(s) { return s >= 75 ? '#6c3' : s >= 50 ? '#ffbd3f' : s >= 25 ? '#ff6874' : '#f00'; }
    function rtColorFn(s) { return s >= 60 ? '#fa320a' : '#6b7280'; }

    reg({
        key: 'ratingColorCoding', name: 'Rating Color Coding', group: 'Appearance',
        init() {
            waitFor('[data-testid="hero-rating-bar__aggregate-rating__score"]').then(el => {
                const rating = getIMDbRating();
                if (!rating) return;
                const c = ratingColor(rating);
                const scoreEl = el.querySelector('span:first-child');
                if (scoreEl) { scoreEl.style.color = c.bg; scoreEl.style.textShadow = `0 0 20px ${c.bg}44`; }
                if (!document.getElementById('enh-rating-badge')) {
                    const badge = document.createElement('span');
                    badge.id = 'enh-rating-badge';
                    badge.textContent = c.label;
                    badge.style.cssText = `display:inline-block;font-size:10px;font-weight:700;padding:2px 8px;
                        border-radius:4px;margin-left:6px;vertical-align:middle;
                        background:${c.bg};color:${c.text};letter-spacing:.03em;`;
                    el.appendChild(badge);
                }
            }).catch(() => {});
        },
        destroy() { document.getElementById('enh-rating-badge')?.remove(); }
    });

    // #########################################################################
    //
    //  INLINE SCORES (RT + Metacritic)
    //
    // #########################################################################

    function findRatingBar() {
        const agg = document.querySelector('[data-testid="hero-rating-bar__aggregate-rating"]');
        if (!agg) return null;
        // Walk up to find the flex container holding all rating widgets
        let parent = agg.parentElement;
        for (let i = 0; i < 3 && parent; i++) {
            if (parent.children.length >= 2) return parent;
            parent = parent.parentElement;
        }
        return agg.parentElement;
    }

    reg({
        key: 'inlineRTScore', name: 'Rotten Tomatoes Score', group: 'Scores',
        async init() {
            const imdbId = getIMDbID(), title = getTitleText();
            if (!imdbId || !title) return;

            const cached = cacheGet('rt_' + imdbId);
            if (cached) { this._render(cached); return; }

            const type = getMediaType();
            const slug = title.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '_');
            const path = type === 'tv' ? `/tv/${slug}` : `/m/${slug}`;

            try {
                const res = await httpGet('https://www.rottentomatoes.com' + path);
                const data = this._parse(res.responseText);
                if (data) { cacheSet('rt_' + imdbId, data); this._render(data); return; }
            } catch { /* fallback below */ }

            // Fallback: search page
            try {
                const res2 = await httpGet(`https://www.rottentomatoes.com/search?search=${encodeURIComponent(title)}`);
                const tm = res2.responseText.match(/"tomatoScore"\s*:\s*(\d+)/);
                const au = res2.responseText.match(/"audienceScore"\s*:\s*(\d+)/);
                if (tm) {
                    const d = { tomatometer: parseInt(tm[1]), audience: au ? parseInt(au[1]) : null };
                    cacheSet('rt_' + imdbId, d); this._render(d);
                }
            } catch { /* silent */ }
        },
        _parse(html) {
            try {
                const ldM = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
                if (ldM) {
                    const ld = JSON.parse(ldM[1]);
                    if (ld.aggregateRating)
                        return { tomatometer: Math.round(ld.aggregateRating.ratingValue), audience: null };
                }
                const tm = html.match(/tomatometer[^}]*?"value"\s*:\s*(\d+)/);
                const au = html.match(/audienceScore[^}]*?"value"\s*:\s*(\d+)/);
                if (tm) return { tomatometer: parseInt(tm[1]), audience: au ? parseInt(au[1]) : null };
            } catch { /* ignore */ }
            return null;
        },
        _render(data) {
            if (document.getElementById('enh-rt-widget')) return;
            const bar = findRatingBar();
            if (!bar) return;
            const color = data.tomatometer !== null ? rtColorFn(data.tomatometer) : '#555';
            const w = makeEl('div', { id: 'enh-rt-widget', className: 'enh-score-widget' });
            w.innerHTML = `
                <div class="enh-score-widget__label">TOMATOMETER</div>
                <a href="https://www.rottentomatoes.com/search?search=${encodeURIComponent(getTitleText())}"
                   target="_blank" rel="noopener" class="enh-score-widget__score" style="--score-color:${color}">
                    <span class="enh-score-widget__icon">${data.tomatometer >= 60 ? '\ud83c\udf45' : '\ud83e\uddc3'}</span>
                    <span class="enh-score-widget__value">${data.tomatometer !== null ? data.tomatometer + '%' : '--'}</span>
                </a>
                ${data.audience !== null ? `<div class="enh-score-widget__sub">Audience: ${data.audience}%</div>` : ''}
            `;
            bar.appendChild(w);
        },
        destroy() { document.getElementById('enh-rt-widget')?.remove(); }
    });

    reg({
        key: 'inlineMetacriticScore', name: 'Metacritic Score', group: 'Scores',
        async init() {
            const imdbId = getIMDbID(), title = getTitleText();
            if (!imdbId || !title) return;

            const cached = cacheGet('mc_' + imdbId);
            if (cached) { this._render(cached); return; }

            const type = getMediaType() === 'tv' ? '1' : '2';
            const url = `https://backend.metacritic.com/finder/metacritic/search/${encodeURIComponent(title)}/web?componentName=search-tabs&componentDisplayName=Search+Page+Tab+Filters&componentType=FilterConfig&mcoTypeId=${type}&offset=0&limit=5`;

            try {
                const res = await httpGet(url);
                const obj = JSON.parse(res.responseText);
                const items = obj?.data?.items || [];
                if (items.length > 0) {
                    const best = items[0];
                    const score = best.criticScoreSummary?.score || null;
                    const userScore = best.userScoreSummary?.score || null;
                    let metaUrl = best.criticScoreSummary?.url
                        ? 'https://www.metacritic.com' + best.criticScoreSummary.url.replace('/critic-reviews/', '/')
                        : `https://www.metacritic.com/search/${encodeURIComponent(title)}/`;
                    const d = { score, userScore, url: metaUrl, title: best.title };
                    cacheSet('mc_' + imdbId, d); this._render(d);
                }
            } catch { /* silent */ }
        },
        _render(data) {
            if (document.getElementById('enh-mc-widget')) return;
            const bar = findRatingBar();
            if (!bar) return;
            const color = data.score !== null ? mcColor(data.score) : '#555';
            const w = makeEl('div', { id: 'enh-mc-widget', className: 'enh-score-widget' });
            w.innerHTML = `
                <div class="enh-score-widget__label">METASCORE</div>
                <a href="${data.url}" target="_blank" rel="noopener" class="enh-score-widget__score" style="--score-color:${color}">
                    <span class="enh-score-widget__badge" style="background:${color};color:${data.score >= 60 ? '#000' : '#fff'}">${data.score !== null ? data.score : '--'}</span>
                </a>
                ${data.userScore ? `<div class="enh-score-widget__sub">User: ${data.userScore.toFixed(1)}</div>` : ''}
            `;
            bar.appendChild(w);
        },
        destroy() { document.getElementById('enh-mc-widget')?.remove(); }
    });

    // #########################################################################
    //
    //  LAYOUT FEATURES
    //
    // #########################################################################

    reg({
        key: 'collapsibleSections', name: 'Collapsible Sections', group: 'Layout',
        _ids: ['title-cast','UserReviews','MoreLikeThis','Details','BoxOffice','TechSpecs','DidYouKnow','videos-section','Photos'],
        init() {
            addCSS(`
                .enh-collapse-btn{position:absolute;top:12px;right:12px;width:28px;height:28px;
                    background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.08);
                    border-radius:6px;cursor:pointer;color:#a1a1aa;font-size:16px;z-index:10;
                    display:flex;align-items:center;justify-content:center;transition:all .12s ease;
                    line-height:1;padding:0}
                .enh-collapse-btn:hover{background:rgba(255,255,255,0.1);color:#fff}
                .enh-section--collapsed>*:not(.ipc-title):not(.enh-collapse-btn):not([class*="title"]):not(h3):not(header){display:none!important}
                .enh-section--collapsed{min-height:auto!important;padding-bottom:12px!important}
                section[data-testid]{position:relative}
            `, 'enh-collapsible');

            this._ids.forEach(id => {
                const sec = document.querySelector(`section[data-testid="${id}"]`);
                if (!sec || sec.querySelector('.enh-collapse-btn')) return;
                const collapsed = GM_getValue('enh_coll_' + id, false);
                if (collapsed) sec.classList.add('enh-section--collapsed');
                const btn = makeEl('button', {
                    className: 'enh-collapse-btn', title: 'Collapse/Expand',
                    innerHTML: collapsed ? '\u25b6' : '\u25bc',
                    onClick: () => {
                        const now = sec.classList.toggle('enh-section--collapsed');
                        btn.innerHTML = now ? '\u25b6' : '\u25bc';
                        GM_setValue('enh_coll_' + id, now);
                    }
                });
                sec.appendChild(btn);
            });
        },
        destroy() {
            removeCSS('enh-collapsible');
            document.querySelectorAll('.enh-collapse-btn').forEach(b => b.remove());
            document.querySelectorAll('.enh-section--collapsed').forEach(s => s.classList.remove('enh-section--collapsed'));
        }
    });

    reg({
        key: 'spoilerBlur', name: 'Spoiler Blur on Plot', group: 'Layout',
        init() {
            addCSS(`
                .enh-blur{filter:blur(6px);transition:filter .3s ease;cursor:pointer;user-select:none;position:relative}
                .enh-blur::after{content:'Click to reveal';position:absolute;top:50%;left:50%;
                    transform:translate(-50%,-50%);color:#f5c518;font-weight:600;font-size:12px;
                    background:rgba(0,0,0,0.5);padding:4px 12px;border-radius:6px;pointer-events:none;
                    opacity:1;transition:opacity .3s ease}
                .enh-blur.enh-revealed{filter:none;cursor:default}
                .enh-blur.enh-revealed::after{opacity:0}
            `, 'enh-spoilerBlur');

            const plotFull = document.querySelector('[data-testid="plot-l"],[data-testid="plot-xl"]');
            if (plotFull && plotFull.textContent.length > 200) {
                plotFull.classList.add('enh-blur');
                plotFull.addEventListener('click', function h() {
                    plotFull.classList.add('enh-revealed');
                    plotFull.removeEventListener('click', h);
                });
            }
        },
        destroy() {
            removeCSS('enh-spoilerBlur');
            document.querySelectorAll('.enh-blur').forEach(e => e.classList.remove('enh-blur','enh-revealed'));
        }
    });

    reg({
        key: 'quickNav', name: 'Quick Navigation TOC', group: 'Layout',
        _navItems: [
            { id:'hero-parent', label:'Overview', icon:'\u2302' },
            { id:'title-cast', label:'Cast', icon:'\ud83c\udfad' },
            { id:'UserReviews', label:'Reviews', icon:'\u2606' },
            { id:'MoreLikeThis', label:'Similar', icon:'\u29c9' },
            { id:'Details', label:'Details', icon:'\u2139' },
            { id:'BoxOffice', label:'Box Office', icon:'$' },
            { id:'DidYouKnow', label:'Trivia', icon:'?' },
        ],
        init() {
            addCSS(`
                #enh-quicknav{position:fixed;right:16px;top:50%;transform:translateY(-50%);
                    z-index:99999;display:flex;flex-direction:column;gap:4px}
                .enh-qn-dot{width:36px;height:36px;border-radius:10px;
                    background:rgba(22,22,26,0.9);border:1px solid rgba(255,255,255,0.06);
                    backdrop-filter:blur(8px);color:#71717a;font-size:13px;cursor:pointer;
                    display:flex;align-items:center;justify-content:center;transition:all .15s ease;
                    text-decoration:none;position:relative}
                .enh-qn-dot:hover{background:rgba(245,197,24,0.12);border-color:rgba(245,197,24,0.25);
                    color:#f5c518;transform:scale(1.1)}
                .enh-qn-dot::before{content:attr(data-label);position:absolute;right:calc(100% + 8px);
                    padding:4px 10px;border-radius:6px;font-size:11px;font-weight:600;
                    background:#1c1c22;color:#e4e4e7;white-space:nowrap;border:1px solid rgba(255,255,255,0.08);
                    opacity:0;transform:translateX(4px);pointer-events:none;transition:opacity .15s ease,transform .15s ease}
                .enh-qn-dot:hover::before{opacity:1;transform:translateX(0)}
                @media(max-width:1200px){#enh-quicknav{display:none}}
            `, 'enh-quickNav');

            const nav = makeEl('div', { id: 'enh-quicknav' });
            this._navItems.forEach(s => {
                const sec = document.querySelector(`section[data-testid="${s.id}"]`);
                if (!sec) return;
                nav.appendChild(makeEl('a', {
                    className:'enh-qn-dot', href:'#', dataset:{ label:s.label }, innerHTML:s.icon,
                    onClick: (e) => { e.preventDefault(); sec.scrollIntoView({behavior:'smooth',block:'start'}); }
                }));
            });
            if (nav.children.length) document.body.appendChild(nav);
        },
        destroy() { removeCSS('enh-quickNav'); document.getElementById('enh-quicknav')?.remove(); }
    });

    // #########################################################################
    //
    //  SEARCH & LINKS
    //
    // #########################################################################

    reg({
        key: 'searchButtons', name: 'Streaming Search Buttons', group: 'Features',
        init() {
            if (!window.location.hostname.includes('imdb.com')) return;
            waitFor('[data-testid="hero__pageTitle"]').then(tc => {
                const title = getTitleText();
                if (!title) return;
                const h = title.replace(/\s+/g,'-'), e = encodeURIComponent(title);
                const ch = title.toLowerCase().replace(/[^a-z0-9\s]/g,'').replace(/\s+/g,'-');
                const sites = [
                    { name:'Cineby', color:'#6366f1', action:'cineby' },
                    { name:'P-Stream', color:'#10b981', url:`https://pstream.mov/browse/${h}` },
                    { name:'SFlix', color:'#f59e0b', url:`https://sflix2.to/search/${h}` },
                    { name:'Aether', color:'#8b5cf6', url:`https://aether.mom/browse/${e}` },
                    { name:'Arc018', color:'#ef4444', url:`https://arc018.to/search/${ch}` },
                ];
                const wrap = makeEl('div', { id:'enh-search-buttons' });
                wrap.innerHTML = `<div class="enh-search-row">${
                    sites.map(s => `<button class="enh-search-btn" data-url="${s.url||''}" data-action="${s.action||''}" style="--btn-color:${s.color}"><span>${s.name}</span></button>`).join('')
                }</div>`;
                tc.parentElement?.insertBefore(wrap, tc.nextSibling);
                wrap.querySelectorAll('.enh-search-btn').forEach(btn => {
                    btn.addEventListener('click', () => {
                        if (btn.dataset.action === 'cineby') { GM_setValue('movieTitle',title); window.open('https://www.cineby.gd/search','_blank'); }
                        else window.open(btn.dataset.url,'_blank');
                    });
                });
            }).catch(() => {});
        },
        destroy() { document.getElementById('enh-search-buttons')?.remove(); }
    });

    reg({
        key: 'externalLinks', name: 'External Links Bar', group: 'Features',
        init() {
            waitFor('[data-testid="hero__pageTitle"]').then(() => {
                const title = getTitleText(), year = getTitleYear(), imdbId = getIMDbID();
                if (!title || !imdbId) return;
                const enc = encodeURIComponent(title);
                const links = [
                    { name:'Rotten Tomatoes', url:`https://www.rottentomatoes.com/search?search=${enc}`, color:'#fa320a' },
                    { name:'Letterboxd', url:`https://letterboxd.com/imdb/${imdbId}/`, color:'#00d735' },
                    { name:'TMDB', url:`https://www.themoviedb.org/search/movie?query=${enc}`, color:'#01b4e4' },
                    { name:'YouTube', url:`https://www.youtube.com/results?search_query=${enc}%20trailer`, color:'#ff0000' },
                    { name:'Wikipedia', url:`https://en.wikipedia.org/w/index.php?search=${enc}+film`, color:'#636466' },
                    { name:'JustWatch', url:`https://www.justwatch.com/us/search?q=${enc}`, color:'#fbc500' },
                    { name:'Trakt', url:`https://trakt.tv/search/imdb?query=${imdbId}`, color:'#ed1c24' },
                ];
                const bar = makeEl('div', { id:'enh-external-links' });
                bar.innerHTML = links.map(l =>
                    `<a href="${l.url}" target="_blank" rel="noopener" class="enh-ext-link" style="--link-color:${l.color}">${l.name}</a>`
                ).join('');
                const insertAfter = document.getElementById('enh-search-buttons') || document.querySelector('[data-testid="hero__pageTitle"]');
                insertAfter?.parentElement?.insertBefore(bar, insertAfter.nextSibling);
            }).catch(() => {});
        },
        destroy() { document.getElementById('enh-external-links')?.remove(); }
    });

    // ===================== EXPANDED LINK MENU =====================
    reg({
        key: 'expandedLinkMenu', name: 'Expanded Link Menu', group: 'Features',
        _DB: {
            'Movie Sites': [
                { n:'Letterboxd', u:'https://letterboxd.com/imdb/{{ID}}/' },
                { n:'TMDB', u:'https://www.themoviedb.org/search/movie?query={{T}}' },
                { n:'AllMovie', u:'http://www.allmovie.com/search/movies/{{T}}' },
                { n:'Box Office Mojo', u:'https://www.boxofficemojo.com/search/?q={{T}}' },
                { n:'Criticker', u:'https://www.criticker.com/?search=tt{{ID}}' },
                { n:'Trakt', u:'https://trakt.tv/search/imdb?query={{ID}}' },
            ],
            'Reviews': [
                { n:'Rotten Tomatoes', u:'https://www.rottentomatoes.com/search?search={{T}}' },
                { n:'Metacritic', u:'https://www.metacritic.com/search/all/{{T}}/results' },
            ],
            'Search': [
                { n:'Google', u:'https://www.google.com/search?q={{T}}+{{Y}}' },
                { n:'DuckDuckGo', u:'https://duckduckgo.com/?q={{T}}+{{Y}}' },
                { n:'YouTube', u:'https://www.youtube.com/results?search_query={{T}}%20trailer' },
                { n:'Wikipedia', u:'https://en.wikipedia.org/w/index.php?search={{T}}' },
            ],
            'Subtitles': [
                { n:'OpenSubtitles', u:'https://www.opensubtitles.org/en/search/imdbid-{{ID}}' },
                { n:'OpenSubs.com', u:'https://www.opensubtitles.com/en/en/search-all/q-tt{{ID}}' },
                { n:'Subscene', u:'https://subscene.com/subtitles/searchbytitle?query={{T}}' },
            ],
            'TV': [
                { n:'TheTVDB', u:'https://www.thetvdb.com/search?query=tt{{ID}}' },
                { n:'TVMaze', u:'https://www.tvmaze.com/search?q={{T}}' },
                { n:'Ep Calendar', u:'https://episodecalendar.com/en/shows?q%5Bname_cont%5D={{T}}' },
            ],
            'Torrents': [
                { n:'YTS', u:'https://yts.mx/browse-movies/tt{{ID}}' },
                { n:'1337x', u:'https://1337x.to/search/{{T}}+{{Y}}/1/' },
            ],
        },
        init() {
            waitFor('#enh-search-buttons .enh-search-row').then(searchRow => {
                const title = getTitleText(), year = getTitleYear(), imdbId = getIMDbID();
                if (!title || !imdbId) return;
                const buildUrl = (tpl) => tpl.replace(/\{\{ID\}\}/g, imdbId)
                    .replace(/\{\{T\}\}/g, encodeURIComponent(title)).replace(/\{\{Y\}\}/g, year);

                const container = makeEl('div', { style: { position:'relative', display:'inline-flex' } });
                const trigger = makeEl('button', {
                    id:'enh-link-menu-trigger', className:'enh-search-btn',
                    style: { '--btn-color':'#71717a' },
                    innerHTML:'<span>\u2630 More Links</span>',
                    onClick: () => { dropdown.classList.toggle('enh-visible'); }
                });

                const dropdown = makeEl('div', { id:'enh-link-menu-dropdown', className:'enh-link-dropdown' });
                for (const [cat, links] of Object.entries(this._DB)) {
                    if (cat === 'TV' && getMediaType() !== 'tv') continue;
                    dropdown.appendChild(makeEl('div', { className:'enh-link-dropdown__cat' }, cat));
                    const row = makeEl('div', { className:'enh-link-dropdown__row' });
                    links.forEach(l => row.appendChild(makeEl('a', {
                        href: buildUrl(l.u), target:'_blank', rel:'noopener', className:'enh-link-dropdown__item'
                    }, l.n)));
                    dropdown.appendChild(row);
                }

                container.appendChild(trigger);
                container.appendChild(dropdown);
                searchRow.appendChild(container);

                document.addEventListener('click', (e) => {
                    if (!e.target.closest('#enh-link-menu-trigger') && !e.target.closest('#enh-link-menu-dropdown'))
                        dropdown.classList.remove('enh-visible');
                });
            }).catch(() => {});
        },
        destroy() { document.getElementById('enh-link-menu-trigger')?.closest('div[style]')?.remove(); }
    });

    // #########################################################################
    //
    //  TV SHOW FEATURES
    //
    // #########################################################################

    reg({
        key: 'tvShowEnhancements', name: 'TV Show Quick Links', group: 'TV',
        init() {
            if (getMediaType() !== 'tv') return;
            addCSS(`
                #enh-tv-bar{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0}
                .enh-tv-chip{padding:4px 12px;border-radius:8px;
                    font:600 11px/1.5 -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
                    color:#a78bfa;background:rgba(167,139,250,0.08);
                    border:1px solid rgba(167,139,250,0.15);text-decoration:none!important;
                    transition:all .12s ease}
                .enh-tv-chip:hover{background:rgba(167,139,250,0.18);color:#c4b5fd;border-color:rgba(167,139,250,0.3)}
            `, 'enh-tvShow');

            waitFor('[data-testid="hero__pageTitle"]').then(() => {
                const imdbId = getIMDbID(), title = getTitleText();
                if (!imdbId) return;
                const bar = makeEl('div', { id: 'enh-tv-bar' });
                [
                    { l:'Episodes List', u:`https://www.imdb.com/title/${imdbId}/episodes/` },
                    { l:'TheTVDB', u:`https://www.thetvdb.com/search?query=tt${imdbId}` },
                    { l:'TVMaze', u:`https://www.tvmaze.com/search?q=${encodeURIComponent(title)}` },
                    { l:'Trakt', u:`https://trakt.tv/search/imdb?query=${imdbId}` },
                    { l:'Ep Calendar', u:`https://episodecalendar.com/en/shows?q%5Bname_cont%5D=${encodeURIComponent(title)}` },
                ].forEach(c => bar.appendChild(makeEl('a', { href:c.u, target:'_blank', rel:'noopener', className:'enh-tv-chip' }, c.l)));

                const insertPoint = document.getElementById('enh-external-links') || document.getElementById('enh-search-buttons') || document.querySelector('[data-testid="hero__pageTitle"]');
                insertPoint?.parentElement?.insertBefore(bar, insertPoint.nextSibling);
            }).catch(() => {});
        },
        destroy() { removeCSS('enh-tvShow'); document.getElementById('enh-tv-bar')?.remove(); }
    });

    reg({
        key: 'subtitleLinks', name: 'Subtitle Links', group: 'TV',
        init() {
            const imdbId = getIMDbID(), title = getTitleText();
            if (!imdbId) return;
            waitFor('section[data-testid="Details"]').then(sec => {
                if (document.getElementById('enh-sub-row')) return;
                const row = makeEl('div', { id:'enh-sub-row', style: { marginTop:'12px', display:'flex', flexWrap:'wrap', gap:'6px', alignItems:'center' } });
                row.appendChild(makeEl('span', { style: { color:'#71717a', fontSize:'12px', fontWeight:'600', marginRight:'4px' } }, 'Subtitles:'));
                [
                    { n:'OpenSubtitles', u:`https://www.opensubtitles.org/en/search/imdbid-${imdbId}` },
                    { n:'OpenSubs.com', u:`https://www.opensubtitles.com/en/en/search-all/q-tt${imdbId}` },
                    { n:'Subscene', u:`https://subscene.com/subtitles/searchbytitle?query=${encodeURIComponent(title)}` },
                    { n:'Addic7ed', u:`https://www.addic7ed.com/search.php?search=${encodeURIComponent(title)}&Submit=Search` },
                ].forEach(s => row.appendChild(makeEl('a', {
                    href:s.u, target:'_blank', rel:'noopener', className:'enh-ext-link', style:{ '--link-color':'#22d3ee' }
                }, s.n)));
                sec.appendChild(row);
            }).catch(() => {});
        },
        destroy() { document.getElementById('enh-sub-row')?.remove(); }
    });

    // #########################################################################
    //
    //  UTILITY FEATURES
    //
    // #########################################################################

    reg({
        key: 'quickCopyID', name: 'Quick Copy IMDb ID', group: 'Utility',
        init() {
            waitFor('[data-testid="hero__pageTitle"]').then(titleEl => {
                const imdbId = getIMDbID();
                if (!imdbId) return;
                const btn = makeEl('button', {
                    id:'enh-copy-id', className:'enh-action-btn', title:`Copy ${imdbId}`,
                    innerHTML: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg><span>${imdbId}</span>`,
                    onClick: () => { GM_setClipboard(imdbId); showToast(`Copied ${imdbId}`); }
                });
                titleEl.parentElement?.appendChild(btn);
            }).catch(() => {});
        },
        destroy() { document.getElementById('enh-copy-id')?.remove(); }
    });

    reg({
        key: 'keyboardShortcuts', name: 'Keyboard Shortcuts', group: 'Utility',
        _h: null,
        init() {
            this._h = (e) => {
                if (['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName) || e.target.isContentEditable) return;
                if (e.key === ',' || e.key === 's') { e.preventDefault(); toggleSettings(); }
                else if (e.key === 'c' && !e.ctrlKey && !e.metaKey) { const id = getIMDbID(); if (id) { GM_setClipboard(id); showToast(`Copied ${id}`); } }
                else if (e.key === 'r') { document.querySelector('[data-testid="hero-rating-bar__aggregate-rating"]')?.scrollIntoView({behavior:'smooth',block:'center'}); }
                else if (e.key === 't') { window.scrollTo({top:0,behavior:'smooth'}); }
                else if (e.key === 'Escape') { const o = document.getElementById('enh-settings-overlay'); if (o?.classList.contains('enh-visible')) toggleSettings(); }
            };
            document.addEventListener('keydown', this._h);
        },
        destroy() { if (this._h) document.removeEventListener('keydown', this._h); }
    });

    // #########################################################################
    //
    //  GLOBAL STYLES
    //
    // #########################################################################
    function injectGlobalStyles() {
        const t = THEMES[get('themeVariant')] || THEMES.dark;
        addCSS(`
/* ════ Toast ════ */
#enh-toast {
    position: fixed; bottom: 24px; right: 24px;
    background: ${t.sf1}; color: ${t.tx0};
    padding: 10px 20px; border-radius: 10px; z-index: 2147483647;
    font: 600 13px/1.4 -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    box-shadow: ${t.sh3};
    border: 1px solid ${t.bd1};
    transform: translateY(20px); opacity: 0;
    transition: transform .3s cubic-bezier(.4,0,.2,1), opacity .3s ease;
    pointer-events: none;
}
#enh-toast.visible { transform: translateY(0); opacity: 1; }

/* ════ Search Buttons ════ */
#enh-search-buttons { margin: 10px 0 6px; }
.enh-search-row { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
.enh-search-btn {
    display: inline-flex; align-items: center; gap: 5px;
    padding: 6px 14px;
    background: color-mix(in srgb, var(--btn-color) 12%, ${t.sf1});
    border: 1px solid color-mix(in srgb, var(--btn-color) 20%, transparent);
    border-radius: 8px;
    color: color-mix(in srgb, var(--btn-color) 85%, #fff);
    font: 600 12px/1.4 -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    cursor: pointer; transition: all .2s cubic-bezier(.4,0,.2,1); outline: none;
}
.enh-search-btn:hover {
    background: color-mix(in srgb, var(--btn-color) 22%, ${t.sf1});
    border-color: color-mix(in srgb, var(--btn-color) 40%, transparent);
    transform: translateY(-2px);
    box-shadow: 0 4px 14px color-mix(in srgb, var(--btn-color) 18%, transparent);
}

/* ════ External Links ════ */
#enh-external-links { display: flex; flex-wrap: wrap; gap: 6px; margin: 8px 0 4px; }
.enh-ext-link {
    padding: 4px 12px; border-radius: 6px;
    font: 500 11px/1.5 -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    color: color-mix(in srgb, var(--link-color) 75%, ${t.tx1}) !important;
    background: color-mix(in srgb, var(--link-color) 8%, transparent);
    border: 1px solid color-mix(in srgb, var(--link-color) 12%, transparent);
    text-decoration: none !important;
    transition: all .15s cubic-bezier(.4,0,.2,1);
}
.enh-ext-link:hover {
    background: color-mix(in srgb, var(--link-color) 18%, transparent);
    border-color: color-mix(in srgb, var(--link-color) 30%, transparent);
    color: #fff !important;
    transform: translateY(-1px);
}

/* ════ Expanded Link Dropdown ════ */
.enh-link-dropdown {
    position: absolute; top: calc(100% + 8px); left: 0; min-width: 340px;
    background: ${t.sf1}; border: 1px solid ${t.bd1};
    border-radius: 12px; padding: 14px 16px; z-index: 100000;
    box-shadow: ${t.sh3}; display: none;
    backdrop-filter: blur(12px);
}
.enh-link-dropdown.enh-visible { display: block; }
.enh-link-dropdown__cat {
    font-size: 10px; font-weight: 700; text-transform: uppercase;
    letter-spacing: .08em; color: ${t.tx3}; padding: 10px 0 4px;
    border-top: 1px solid ${t.bd0}; margin-top: 4px;
}
.enh-link-dropdown__cat:first-child { border-top: none; margin-top: 0; }
.enh-link-dropdown__row { display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: 4px; }
.enh-link-dropdown__item {
    padding: 4px 10px; border-radius: 6px;
    font: 500 11px/1.5 -apple-system, sans-serif;
    color: ${t.tx2} !important;
    background: ${t.sf0}; border: 1px solid ${t.bd0};
    text-decoration: none !important;
    transition: all .15s cubic-bezier(.4,0,.2,1);
}
.enh-link-dropdown__item:hover {
    background: ${t.accentMuted}; border-color: ${t.accentBorder};
    color: ${t.accent} !important; transform: translateY(-1px);
}

/* ════ Copy ID ════ */
#enh-copy-id {
    display: inline-flex; align-items: center; gap: 5px;
    padding: 3px 10px; margin-left: 10px;
    background: ${t.sf1}; border: 1px solid ${t.bd1};
    border-radius: 6px; cursor: pointer; color: ${t.tx2};
    font: 500 12px/1.4 -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    transition: all .15s cubic-bezier(.4,0,.2,1); vertical-align: middle;
}
#enh-copy-id:hover {
    background: ${t.accentMuted}; border-color: ${t.accentBorder};
    color: ${t.accent};
}
#enh-copy-id svg { flex-shrink: 0; }

/* ════ Score Widgets ════ */
.enh-score-widget {
    display: inline-flex; flex-direction: column; align-items: center;
    padding: 8px 16px; min-width: 80px;
}
.enh-score-widget__label {
    font-size: 10px; font-weight: 600; letter-spacing: .05em;
    color: ${t.tx2}; margin-bottom: 4px; text-transform: uppercase;
}
.enh-score-widget__score {
    display: flex; align-items: center; gap: 4px; text-decoration: none !important;
    color: var(--score-color) !important; font-size: 20px; font-weight: 800;
    transition: transform .15s cubic-bezier(.4,0,.2,1);
}
.enh-score-widget__score:hover { transform: scale(1.08); }
.enh-score-widget__icon { font-size: 18px; }
.enh-score-widget__value { color: var(--score-color); }
.enh-score-widget__badge {
    display: inline-block; padding: 2px 10px; border-radius: 6px;
    font-size: 18px; font-weight: 800; min-width: 36px; text-align: center;
}
.enh-score-widget__sub { font-size: 10px; color: ${t.tx3}; margin-top: 2px; }

/* ════ Settings Overlay ════ */
#enh-settings-overlay {
    position: fixed; inset: 0;
    background: rgba(0,0,0,0.55);
    backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px);
    z-index: 2147483640; opacity: 0;
    transition: opacity .3s ease; pointer-events: none;
}
#enh-settings-overlay.enh-visible { opacity: 1; pointer-events: auto; }

/* ════ Settings Panel ════ */
#enh-settings-panel {
    position: fixed; top: 50%; left: 50%;
    transform: translate(-50%, -50%) scale(0.96);
    background: ${t.sf0}; color: ${t.tx1};
    border: 1px solid ${t.bd1};
    border-radius: 16px; z-index: 2147483641;
    min-width: 480px; max-width: 540px; max-height: 82vh;
    box-shadow: ${t.sh3};
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    opacity: 0;
    transition: transform .3s cubic-bezier(.4,0,.2,1), opacity .25s ease;
    overflow: hidden; display: flex; flex-direction: column;
}
#enh-settings-overlay.enh-visible #enh-settings-panel {
    transform: translate(-50%, -50%) scale(1); opacity: 1;
}
.enh-settings-header {
    display: flex; justify-content: space-between; align-items: center;
    padding: 18px 24px 14px;
    border-bottom: 1px solid ${t.bd0}; flex-shrink: 0;
}
.enh-settings-header h2 {
    font-size: 16px; font-weight: 700; margin: 0;
    color: ${t.accent}; letter-spacing: -0.02em;
}
.enh-settings-close {
    background: ${t.sf1}; border: 1px solid ${t.bd0};
    width: 32px; height: 32px; border-radius: 8px;
    color: ${t.tx2}; cursor: pointer; font-size: 18px;
    display: flex; align-items: center; justify-content: center;
    transition: all .15s ease;
}
.enh-settings-close:hover { background: ${t.sf2}; color: ${t.tx0}; }

.enh-settings-body { padding: 8px 24px 20px; overflow-y: auto; flex: 1; }

.enh-settings-group-label {
    font-size: 10px; font-weight: 700; text-transform: uppercase;
    letter-spacing: .08em; color: ${t.tx3};
    padding: 16px 0 6px;
}
.enh-settings-row {
    display: flex; align-items: center; justify-content: space-between;
    padding: 10px 0; gap: 12px;
    border-bottom: 1px solid ${t.bd0};
}
.enh-settings-row:last-child { border-bottom: none; }
.enh-settings-label { font-size: 13px; font-weight: 500; color: ${t.tx1}; }

/* Toggle switch */
.enh-toggle { position: relative; width: 40px; height: 22px; flex-shrink: 0; }
.enh-toggle input { opacity: 0; width: 0; height: 0; position: absolute; }
.enh-toggle-track {
    position: absolute; inset: 0;
    background: ${t.sf2}; border-radius: 12px;
    transition: background .2s ease; cursor: pointer;
}
.enh-toggle-track::after {
    content: ''; position: absolute; top: 2px; left: 2px;
    width: 18px; height: 18px;
    background: ${t.tx3}; border-radius: 50%;
    transition: transform .2s cubic-bezier(.4,0,.2,1), background .2s ease;
}
.enh-toggle input:checked + .enh-toggle-track { background: ${t.accentMuted}; }
.enh-toggle input:checked + .enh-toggle-track::after {
    transform: translateX(18px); background: ${t.accent};
}

/* ════ Theme Swatches ════ */
.enh-theme-selector { display: flex; gap: 8px; }
.enh-theme-swatch {
    width: 30px; height: 30px; border-radius: 8px; cursor: pointer;
    border: 2px solid transparent;
    transition: all .15s cubic-bezier(.4,0,.2,1); position: relative;
    box-shadow: inset 0 0 0 1px ${t.bd1};
}
.enh-theme-swatch.active { border-color: ${t.accent}; box-shadow: 0 0 12px ${t.accentMuted}; }
.enh-theme-swatch:hover { transform: scale(1.15); }
.enh-theme-swatch::after {
    content: attr(data-label); position: absolute; bottom: calc(100% + 6px); left: 50%;
    transform: translateX(-50%); font-size: 9px; font-weight: 600;
    color: ${t.tx2}; white-space: nowrap;
    opacity: 0; transition: opacity .12s ease; pointer-events: none;
}
.enh-theme-swatch:hover::after { opacity: 1; }

/* ════ Settings Footer ════ */
.enh-settings-footer {
    padding: 12px 24px; border-top: 1px solid ${t.bd0};
    display: flex; justify-content: space-between; align-items: center;
    flex-shrink: 0; gap: 8px;
}
.enh-settings-footer span { font-size: 11px; color: ${t.tx3}; }
.enh-settings-footer-actions { display: flex; gap: 6px; }
.enh-settings-footer-btn {
    padding: 5px 14px; border-radius: 6px;
    font: 500 11px -apple-system, sans-serif;
    background: ${t.sf1}; border: 1px solid ${t.bd1};
    color: ${t.tx2}; cursor: pointer;
    transition: all .15s cubic-bezier(.4,0,.2,1);
}
.enh-settings-footer-btn:hover { background: ${t.sf2}; color: ${t.tx0}; border-color: ${t.bd2}; }
.enh-settings-footer-shortcuts { font-size: 11px; color: ${t.tx3}; }
.enh-settings-footer-shortcuts kbd {
    display: inline-block; padding: 1px 6px;
    background: ${t.sf1}; border-radius: 4px;
    font-family: inherit; font-size: 11px; color: ${t.tx2};
    border: 1px solid ${t.bd0};
}

/* ════ FAB ════ */
#enh-settings-fab {
    position: fixed; bottom: 20px; left: 20px;
    width: 44px; height: 44px;
    background: ${t.sf1}; border: 1px solid ${t.bd1};
    border-radius: 12px; cursor: pointer; z-index: 2147483630;
    display: flex; align-items: center; justify-content: center;
    color: ${t.tx2};
    box-shadow: ${t.sh2};
    transition: all .2s cubic-bezier(.4,0,.2,1);
}
#enh-settings-fab:hover {
    background: ${t.sf2}; border-color: ${t.accentBorder};
    color: ${t.accent}; transform: rotate(30deg) scale(1.05);
    box-shadow: ${t.sh3};
}
        `, 'enh-global');
    }

    // #########################################################################
    //
    //  SETTINGS PANEL
    //
    // #########################################################################
    let settingsOpen = false;

    function createSettingsPanel() {
        const overlay = makeEl('div', { id: 'enh-settings-overlay' });
        overlay.innerHTML = `<div id="enh-settings-panel">
            <div class="enh-settings-header">
                <h2>IMDb Enhanced v${VERSION}</h2>
                <button class="enh-settings-close" title="Close (Esc)">&times;</button>
            </div>
            <div class="enh-settings-body" id="enh-settings-body"></div>
            <div class="enh-settings-footer">
                <span>v${VERSION}</span>
                <div class="enh-settings-footer-actions">
                    <button class="enh-settings-footer-btn" id="enh-export-btn" title="Copy all settings to clipboard">Export</button>
                    <button class="enh-settings-footer-btn" id="enh-import-btn" title="Import settings from JSON">Import</button>
                    <button class="enh-settings-footer-btn" id="enh-clearcache-btn" title="Clear cached RT/MC scores">Clear Cache</button>
                </div>
                <span class="enh-settings-footer-shortcuts">
                    <kbd>S</kbd> Settings <kbd>C</kbd> Copy <kbd>R</kbd> Rating <kbd>T</kbd> Top
                </span>
            </div>
        </div>`;

        const body = overlay.querySelector('#enh-settings-body');

        // Theme Selector
        body.appendChild(makeEl('div', { className:'enh-settings-group-label' }, 'Theme'));
        const themeRow = makeEl('div', { className:'enh-settings-row' });
        themeRow.appendChild(makeEl('span', { className:'enh-settings-label' }, 'Theme Variant'));
        const themeSelector = makeEl('div', { className:'enh-theme-selector' });
        const curTheme = get('themeVariant');
        [
            { id:'dark', color:'#101014', label:'Dark' },
            { id:'oled', color:'#000000', label:'OLED' },
            { id:'midnight', color:'#0a0e1c', label:'Midnight' },
        ].forEach(th => {
            const sw = makeEl('div', {
                className:'enh-theme-swatch' + (curTheme === th.id ? ' active' : ''),
                style: { background:th.color },
                dataset: { label:th.label, theme:th.id },
                onClick: () => {
                    set('themeVariant', th.id);
                    themeSelector.querySelectorAll('.enh-theme-swatch').forEach(s => s.classList.remove('active'));
                    sw.classList.add('active');
                    if (get('modernUI')) addCSS(getThemeCSS(th.id), 'enh-modernUI');
                }
            });
            themeSelector.appendChild(sw);
        });
        themeRow.appendChild(themeSelector);
        body.appendChild(themeRow);

        // Feature Toggles
        const groups = {};
        features.forEach(f => { if (!groups[f.group]) groups[f.group] = []; groups[f.group].push(f); });
        for (const [gName, gFeatures] of Object.entries(groups)) {
            body.appendChild(makeEl('div', { className:'enh-settings-group-label' }, gName));
            gFeatures.forEach(f => {
                const row = makeEl('div', { className:'enh-settings-row' });
                row.appendChild(makeEl('span', { className:'enh-settings-label' }, f.name));
                const toggle = makeEl('label', { className:'enh-toggle' });
                const input = makeEl('input', { type:'checkbox' });
                input.checked = get(f.key);
                const track = makeEl('div', { className:'enh-toggle-track' });
                input.addEventListener('change', () => {
                    set(f.key, input.checked);
                    if (input.checked) { try { f.init(); } catch(e) { console.warn(e); } }
                    else f.destroy?.();
                });
                toggle.appendChild(input); toggle.appendChild(track);
                row.appendChild(toggle); body.appendChild(row);
            });
        }

        // Event handlers
        overlay.querySelector('.enh-settings-close').addEventListener('click', toggleSettings);
        overlay.addEventListener('click', e => { if (e.target === overlay) toggleSettings(); });
        overlay.querySelector('#enh-export-btn').addEventListener('click', () => {
            const data = {};
            for (const key of Object.keys(DEFAULTS)) data[key] = get(key);
            data.themeVariant = get('themeVariant');
            GM_setClipboard(JSON.stringify(data, null, 2));
            showToast('Settings copied to clipboard');
        });
        overlay.querySelector('#enh-import-btn').addEventListener('click', () => {
            const input = prompt('Paste your exported settings JSON:');
            if (!input) return;
            try {
                const data = JSON.parse(input);
                for (const [k, v] of Object.entries(data)) {
                    if (k in DEFAULTS || k === 'themeVariant') set(k, v);
                }
                showToast('Settings imported - reloading...');
                setTimeout(() => location.reload(), 1000);
            } catch { showToast('Invalid JSON'); }
        });
        overlay.querySelector('#enh-clearcache-btn').addEventListener('click', () => {
            try {
                const allKeys = GM_listValues();
                let cleared = 0;
                allKeys.forEach(k => { if (k.startsWith('cache_')) { GM_setValue(k, null); cleared++; } });
                showToast(`Cleared ${cleared} cached entries - reload to re-fetch`);
            } catch { showToast('Cache cleared'); }
        });

        document.body.appendChild(overlay);
    }

    function createFAB() {
        const fab = makeEl('button', {
            id:'enh-settings-fab', title:'IMDb Enhanced Settings (S)',
            innerHTML: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`,
            onClick: toggleSettings,
        });
        document.body.appendChild(fab);
    }

    function toggleSettings() {
        settingsOpen = !settingsOpen;
        document.getElementById('enh-settings-overlay')?.classList.toggle('enh-visible', settingsOpen);
    }

    // =========================================================================
    //  CINEBY AUTO-FILL
    // =========================================================================
    function handleCineby() {
        if (!window.location.hostname.includes('cineby')) return;
        const t = GM_getValue('movieTitle', '');
        if (!t) return;
        setTimeout(() => {
            const input = document.querySelector('input[type="search"],input[type="text"],input[placeholder*="search" i]');
            if (input) { input.value = t; input.dispatchEvent(new Event('input', { bubbles: true })); GM_setValue('movieTitle', ''); }
        }, 600);
    }

    // =========================================================================
    //  INIT
    // =========================================================================
    function init() {
        if (window.location.hostname.includes('cineby')) { handleCineby(); return; }
        if (!window.location.hostname.includes('imdb.com')) return;

        injectGlobalStyles();
        features.forEach(f => {
            if (get(f.key)) { try { f.init(); } catch (e) { console.warn(`[IMDb Enhanced] ${f.key}:`, e); } }
        });
        createSettingsPanel();
        createFAB();
    }

    if (document.readyState === 'complete' || document.readyState === 'interactive') init();
    else document.addEventListener('DOMContentLoaded', init);

})();