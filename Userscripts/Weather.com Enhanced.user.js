// ==UserScript==
// @name         Weather.com Enhanced
// @namespace    https://github.com/SysAdminDoc
// @version      6.0.0
// @description  Dark theme + debloat for weather.com. Dual-engine targeting both legacy BEM and Tailwind CSS systems. Full-width, in-header tab navigation, weather.gov radar, custom branding, ad/tracking removal.
// @author       SysAdminDoc
// @match        https://weather.com/*
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @run-at       document-start
// @noframes
// ==/UserScript==

(function() {
    'use strict';

    // =====================================================================
    //  PALETTE
    // =====================================================================
    const C = {
        bg:       '#0c1018',
        bgCard:   '#131a26',
        bgRaise:  '#1a2234',
        bgDeep:   '#0a0e18',
        bgTable:  '#111824',
        fg:       '#dce4f0',
        fgMid:    '#b0bcc8',
        fgDim:    '#8ba0b8',
        fgMute:   '#6b8aaa',
        fgGhost:  '#4a6080',
        border:   '#243049',
        borderLt: '#1a2234',
        borderMd: '#344868',
        accent:   '#4a7dff',
        accentLt: '#5b8cff',
        tabColor: '#1e88e5',
    };

    // =====================================================================
    //  CONFIG
    // =====================================================================
    const DEFAULTS = {
        removeAds:      true,
        removePremium:  true,
        removeVideo:    true,
        removeNews:     true,
        removeFooter:   true,
        compactMode:    false,
        reduceMotion:   true,
        blockTracking:  true,
    };
    function opt(k) { return GM_getValue(k, DEFAULTS[k]); }
    function setOpt(k, v) { GM_setValue(k, v); }

    // =====================================================================
    //  LOCATION TABS STORAGE
    // =====================================================================
    // Stores: [{ name: 'Venice, FL', hash: 'f17f0e5c...', active: true }]
    function getLocationTabs() { return GM_getValue('locationTabs', []); }
    function setLocationTabs(tabs) { GM_setValue('locationTabs', tabs); }

    // =====================================================================
    //  PHASE 0 - ANTI-FOUC + ALWAYS-ON LAYOUT (document-start)
    // =====================================================================
    document.documentElement.classList.add('dark');

    const earlyCSS = document.createElement('style');
    earlyCSS.id = 'wdc-early';
    earlyCSS.textContent = `
        html, body { background: ${C.bg} !important; color: ${C.fg} !important; }

        /* ALWAYS-ON: Kill ALL sidebar navigation */
        [class*="SidebarNavigation--sidebarWrapper"],
        [class*="SidebarNavigation--sidebar"],
        .regionSidebarNavigation,
        [class*="FullViewportLargeScreen--forceCollapsedNavigation"],
        [data-testid="sidebar-navigation"],
        .sticky:has(nav[data-testid="sidebar-navigation"]) {
            display: none !important;
            width: 0 !important;
        }

        /* ALWAYS-ON: Kill existing LocalsuiteNav (we replace it) */
        [class*="styles--LocalsuiteNavBkgnd"],
        [class*="styles--LocalsuiteNav"],
        [id*="LocalsuiteNav"] {
            display: none !important;
        }

        /* ALWAYS-ON: Kill premium banner + combined top ads + signin bar */
        [class*="PremiumBanner--banner"],
        .premium-merchandising-banner,
        div.region-combinedTopAds.regionCombinedTopAds,
        .regionCombinedTopAds,
        div.combinedTopAdsSectionWrapper,
        .combinedTopAdsSectionWrapper,
        div.box-border.flex.min-h-12.items-center.gap-2.px-3.py-2.text-white {
            display: none !important;
        }

        /* ALWAYS-ON: BEM header dark background */
        [class*="MainMenuHeader--MainMenuHeader"],
        [class*="MainMenuHeader--wrapper"],
        .regionHeader {
            background-color: ${C.bgDeep} !important;
        }
        /* Hide native BEM logo SVG (will be replaced by custom) */
        svg[class*="MainMenuHeader--twcLogo"] { visibility: hidden !important; }
        /* BEM search: dark bg early */
        input[class*="SearchInput--InputField"],
        input[class*="HeaderLargeScreen--searchInputClass"],
        input[data-testid="searchModalInputBox"] {
            background-color: ${C.bgRaise} !important;
            background: ${C.bgRaise} !important;
            color: ${C.fg} !important;
            border-color: ${C.border} !important;
        }

        /* ALWAYS-ON: Full-width, no right sidebar - Legacy BEM */
        [class*="DaybreakLargeScreen--regionSidebar"] { display: none !important; }
        [class*="DaybreakLargeScreen--gridWrapper"] {
            grid-template-columns: 1fr !important;
            max-width: 100% !important;
        }
        [class*="DaybreakLargeScreen--regionMain"] {
            max-width: 100% !important;
            width: 100% !important;
            grid-column: 1 / -1 !important;
        }

        /* ALWAYS-ON: Full-width - Radar page */
        [class*="FullViewportLargeScreen--regionSidebar"] { display: none !important; }
        [class*="FullViewportLargeScreen--flexWrapper"] { max-width: 100% !important; }

        /* ALWAYS-ON: Full-width - Tailwind pages */
        [data-region="sidebar"] { display: none !important; }
        [data-layout="responsive-sidebar"] {
            grid-template-columns: 1fr !important;
            grid-template-areas: "contentTop" "main" "contentBottom" !important;
            max-width: 100% !important;
        }
        [style*="grid-template-columns"][style*="340px"],
        [style*="grid-template-columns"][style*="350px"],
        [style*="grid-template-columns"][style*="300px"] {
            grid-template-columns: 1fr !important;
        }

        /* ALWAYS-ON: Remove Today page bloat sections */
        section[aria-label="Don't Miss"],
        section[aria-label="Seasonal Hub"],
        section[aria-label="Travel"],
        section[aria-label="We Love Our Critters"],
        section[aria-label="Lonely Planet"],
        section[aria-label="Home, Garage & Garden"],
        section[aria-label="Home, Garage &amp; Garden"],
        section[aria-label="Editor's Pick"],
        section[aria-label="Product Reviews & Deals"],
        section[aria-label="Product Reviews &amp; Deals"],
        section[aria-label="Planning A Trip?"],
        div.hide-empty:has(> section[aria-label="Don't Miss"]),
        div.hide-empty:has(> section[aria-label="Seasonal Hub"]),
        div.hide-empty:has(> section[aria-label="Travel"]),
        div.hide-empty:has(> section[aria-label="We Love Our Critters"]),
        div.hide-empty:has(> section[aria-label="Lonely Planet"]),
        div.hide-empty:has(> section[aria-label="Home, Garage & Garden"]),
        div.hide-empty:has(> section[aria-label="Home, Garage &amp; Garden"]),
        div.hide-empty:has(> section[aria-label="Editor's Pick"]),
        div.hide-empty:has(> section[aria-label="Product Reviews & Deals"]),
        div.hide-empty:has(> section[aria-label="Product Reviews &amp; Deals"]),
        div.hide-empty:has(> section[aria-label="Planning A Trip?"]) {
            display: none !important;
        }
    `;
    document.documentElement.appendChild(earlyCSS);

    // =====================================================================
    //  CSS ENGINE
    // =====================================================================
    const _inj = {};
    function injectCSS(id, css) {
        if (_inj[id]) return;
        const el = document.createElement('style');
        el.id = 'wdc-' + id;
        el.textContent = css;
        (document.head || document.documentElement).appendChild(el);
        _inj[id] = el;
    }
    function removeCSS(id) { if (_inj[id]) { _inj[id].remove(); delete _inj[id]; } }

    // =====================================================================
    //  NAVIGATION SYSTEM (in-header tabs)
    // =====================================================================
    const NAV_TABS = [
        { label: 'Today',   path: '/weather/today/l/' },
        { label: 'Hourly',  path: '/weather/hourbyhour/l/' },
        { label: '10 Day',  path: '/weather/tenday/l/' },
        { label: 'Monthly', path: '/weather/monthly/l/' },
        { label: 'Radar',   path: '/weather/radar/interactive/l/' },
    ];

    function getLocationHash() {
        const m = window.location.pathname.match(/\/l\/([a-f0-9]+)/);
        if (m) return m[1];
        const link = document.querySelector('a[href*="/weather/today/l/"], a[href*="/weather/tenday/l/"], a[href*="/weather/hourbyhour/l/"]');
        if (link) {
            const hm = link.href.match(/\/l\/([a-f0-9]+)/);
            if (hm) return hm[1];
        }
        return null;
    }

    function getActivePath() {
        const p = window.location.pathname;
        if (p.includes('/weather/today/'))               return '/weather/today/l/';
        if (p.includes('/weather/hourbyhour/'))           return '/weather/hourbyhour/l/';
        if (p.includes('/weather/tenday/'))               return '/weather/tenday/l/';
        if (p.includes('/weather/monthly/'))              return '/weather/monthly/l/';
        if (p.includes('/weather/radar/'))                return '/weather/radar/interactive/l/';
        return null;
    }

    function getLocationName() {
        // Try to extract location name from page
        const el = document.querySelector('[data-testid="CurrentConditions--header"] h1, [class*="LocationPageTitle--LocationPageTitle"], [class*="CurrentConditions--header"], h1[class*="CurrentConditions"]');
        if (el) {
            const txt = el.textContent.trim();
            const m = txt.match(/(?:Weather|Forecast)?\s*(?:for|in)?\s*(.*)/i);
            return m ? m[1].replace(/\s+Weather$/i, '').trim() : txt;
        }
        // Fallback: page title
        const title = document.title || '';
        const tm = title.match(/(?:for|in)\s+([^-|]+)/i);
        return tm ? tm[1].trim() : 'Location';
    }

    function createHeaderTabs() {
        if (document.getElementById('wdc-header-tabs')) return false;

        const hash = getLocationHash();
        const activePath = getActivePath();

        const tabBar = document.createElement('div');
        tabBar.id = 'wdc-header-tabs';

        for (const tab of NAV_TABS) {
            const a = document.createElement('a');
            const isActive = activePath === tab.path;
            a.href = hash ? `https://weather.com${tab.path}${hash}` : '#';
            a.className = 'wdc-tab' + (isActive ? ' wdc-tab-active' : '');
            a.textContent = tab.label;
            a.style.setProperty('color', isActive ? '#64b5f6' : C.tabColor, 'important');
            if (!hash) {
                a.style.opacity = '0.4';
                a.style.pointerEvents = 'none';
            }
            tabBar.appendChild(a);
        }

        // Location tabs (user-added)
        const locTabs = getLocationTabs();
        const currentHash = getLocationHash();
        for (const loc of locTabs) {
            const wrapper = document.createElement('div');
            wrapper.className = 'wdc-loc-tab';

            const a = document.createElement('a');
            const isThisLoc = loc.hash === currentHash;
            a.href = `https://weather.com/weather/today/l/${loc.hash}`;
            a.className = 'wdc-tab wdc-tab-loc' + (isThisLoc ? ' wdc-tab-loc-active' : '');
            a.textContent = loc.name;
            a.title = loc.name;
            a.style.setProperty('color', isThisLoc ? '#64b5f6' : C.tabColor, 'important');
            wrapper.appendChild(a);

            const xBtn = document.createElement('span');
            xBtn.className = 'wdc-tab-close';
            xBtn.textContent = '\u00D7';
            xBtn.title = 'Close tab';
            xBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const tabs = getLocationTabs().filter(t => t.hash !== loc.hash);
                setLocationTabs(tabs);
                updateHeaderTabs();
            });
            wrapper.appendChild(xBtn);
            tabBar.appendChild(wrapper);
        }

        // "+" button
        const plus = document.createElement('button');
        plus.className = 'wdc-tab-plus';
        plus.textContent = '+';
        plus.title = 'Add location tab';
        plus.addEventListener('click', showAddLocationDialog);
        tabBar.appendChild(plus);

        return tabBar;
    }

    function injectHeaderTabs() {
        if (document.getElementById('wdc-header-tabs')) return;

        const tabBar = createHeaderTabs();
        if (!tabBar) return;

        // Try to inject into header
        // TW header: [data-testid="header-main"] > inner div
        const twHeader = document.querySelector('[data-testid="header-main"] > div');
        if (twHeader) {
            twHeader.appendChild(tabBar);
            return true;
        }
        // BEM header: .MainMenuHeader--wrapper
        const bemWrapper = document.querySelector('[class*="MainMenuHeader--wrapper"]');
        if (bemWrapper) {
            bemWrapper.appendChild(tabBar);
            return true;
        }
        return false;
    }

    function updateHeaderTabs() {
        const old = document.getElementById('wdc-header-tabs');
        if (old) old.remove();
        injectHeaderTabs();
    }

    // =====================================================================
    //  ADD LOCATION DIALOG
    // =====================================================================
    function showAddLocationDialog() {
        if (document.getElementById('wdc-add-loc')) return;

        const overlay = document.createElement('div');
        overlay.id = 'wdc-add-loc';
        Object.assign(overlay.style, {
            position: 'fixed', inset: '0',
            background: 'rgba(0,0,0,0.65)',
            backdropFilter: 'blur(6px)',
            zIndex: '2200000',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            opacity: '0', transition: 'opacity 0.2s',
        });

        const dialog = document.createElement('div');
        Object.assign(dialog.style, {
            background: '#111824', color: C.fg,
            borderRadius: '16px', width: '440px', maxWidth: '92vw',
            boxShadow: '0 30px 80px rgba(0,0,0,0.9), 0 0 0 1px ' + C.border,
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            padding: '24px',
            transform: 'scale(0.96)', transition: 'transform 0.2s',
        });

        dialog.innerHTML = `
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
                <h3 style="margin:0;font-size:16px;font-weight:700;">Add Location Tab</h3>
                <button id="wdc-add-loc-close" style="background:transparent;border:none;color:${C.fgMute};font-size:18px;cursor:pointer;padding:4px 8px;border-radius:6px;line-height:1;">\u2715</button>
            </div>
            <div style="margin-bottom:12px;">
                <label style="display:block;font-size:12px;color:${C.fgDim};margin-bottom:6px;">Option 1: Add current page location</label>
                <button id="wdc-add-current" style="width:100%;padding:10px;border-radius:8px;border:1px solid ${C.border};background:${C.bgRaise};color:${C.fg};cursor:pointer;font-size:13px;transition:background 0.15s;">Add Current Location</button>
            </div>
            <div style="border-top:1px solid ${C.border};padding-top:12px;">
                <label style="display:block;font-size:12px;color:${C.fgDim};margin-bottom:6px;">Option 2: Search for a location</label>
                <div style="display:flex;gap:8px;">
                    <input id="wdc-loc-search" type="text" placeholder="City name or zip code" style="flex:1;padding:10px 12px;border-radius:8px;border:1px solid ${C.border};background:${C.bgRaise};color:${C.fg};font-size:13px;outline:none;" />
                    <button id="wdc-loc-go" style="padding:10px 16px;border-radius:8px;border:none;background:${C.accent};color:#fff;cursor:pointer;font-size:13px;font-weight:600;white-space:nowrap;">Search</button>
                </div>
                <div id="wdc-loc-results" style="margin-top:8px;max-height:200px;overflow-y:auto;"></div>
            </div>
        `;

        overlay.appendChild(dialog);
        document.body.appendChild(overlay);
        requestAnimationFrame(() => { overlay.style.opacity = '1'; dialog.style.transform = 'scale(1)'; });

        const closeDialog = () => { overlay.style.opacity = '0'; setTimeout(() => overlay.remove(), 200); };
        overlay.addEventListener('click', e => { if (e.target === overlay) closeDialog(); });
        document.getElementById('wdc-add-loc-close').onclick = closeDialog;

        // Add current location
        document.getElementById('wdc-add-current').onclick = () => {
            const hash = getLocationHash();
            if (!hash) { alert('No location detected on this page.'); return; }
            const name = getLocationName();
            const tabs = getLocationTabs();
            if (tabs.some(t => t.hash === hash)) { closeDialog(); return; }
            tabs.push({ name, hash });
            setLocationTabs(tabs);
            updateHeaderTabs();
            closeDialog();
            toast('Added: ' + name);
        };

        // Search for location
        const searchInput = document.getElementById('wdc-loc-search');
        const resultsDiv = document.getElementById('wdc-loc-results');
        const doSearch = () => {
            const q = searchInput.value.trim();
            if (!q) return;
            resultsDiv.innerHTML = '<div style="padding:8px;color:' + C.fgDim + ';font-size:12px;">Searching...</div>';
            fetch(`https://weather.com/api/v1/p/redux-dal/getSunV3LocationSearchUrlConfig?query=${encodeURIComponent(q)}&language=en-US&locationType=locale`)
                .then(r => r.json())
                .then(data => {
                    resultsDiv.innerHTML = '';
                    // Navigate the response to find locations
                    let locations = [];
                    try {
                        const root = data?.dal?.getSunV3LocationSearchUrlConfig;
                        if (root) {
                            const key = Object.keys(root)[0];
                            const d = root[key]?.data;
                            if (d?.location) {
                                const loc = d.location;
                                for (let i = 0; i < (loc.address?.length || 0); i++) {
                                    locations.push({
                                        name: loc.address[i],
                                        placeId: loc.placeId?.[i],
                                    });
                                }
                            }
                        }
                    } catch {}
                    if (!locations.length) {
                        resultsDiv.innerHTML = '<div style="padding:8px;color:' + C.fgDim + ';font-size:12px;">No results found. Try opening weather.com/weather/today for that location in a new tab, then use "Add Current Location".</div>';
                        return;
                    }
                    for (const loc of locations.slice(0, 8)) {
                        const btn = document.createElement('button');
                        Object.assign(btn.style, {
                            display: 'block', width: '100%', textAlign: 'left',
                            padding: '8px 12px', margin: '2px 0', borderRadius: '6px',
                            border: '1px solid ' + C.border, background: 'transparent',
                            color: C.fg, cursor: 'pointer', fontSize: '13px',
                            transition: 'background 0.12s',
                        });
                        btn.textContent = loc.name;
                        btn.onmouseenter = () => btn.style.background = C.bgRaise;
                        btn.onmouseleave = () => btn.style.background = 'transparent';
                        btn.onclick = () => {
                            if (loc.placeId) {
                                const tabs = getLocationTabs();
                                if (!tabs.some(t => t.hash === loc.placeId)) {
                                    tabs.push({ name: loc.name, hash: loc.placeId });
                                    setLocationTabs(tabs);
                                    updateHeaderTabs();
                                }
                                closeDialog();
                                toast('Added: ' + loc.name);
                            }
                        };
                        resultsDiv.appendChild(btn);
                    }
                })
                .catch(() => {
                    resultsDiv.innerHTML = '<div style="padding:8px;color:' + C.fgDim + ';font-size:12px;">Search failed. Try opening the location on weather.com in a new tab, then use "Add Current Location".</div>';
                });
        };
        document.getElementById('wdc-loc-go').onclick = doSearch;
        searchInput.addEventListener('keydown', e => { if (e.key === 'Enter') doSearch(); });
        searchInput.focus();
    }

    // =====================================================================
    //  HEADER TABS CSS
    // =====================================================================
    const CSS_HEADER_TABS = `
        #wdc-header-tabs {
            display: flex;
            align-items: center;
            gap: 0;
            margin-left: 8px;
            overflow-x: auto;
            scrollbar-width: none;
            flex-shrink: 0;
        }
        #wdc-header-tabs::-webkit-scrollbar { display: none; }
        a.wdc-tab,
        a.wdc-tab:link,
        a.wdc-tab:visited,
        #wdc-header-tabs a.wdc-tab,
        #wdc-header-tabs > a.wdc-tab,
        header a.wdc-tab,
        [data-testid="header-main"] a.wdc-tab,
        [class*="MainMenuHeader"] a.wdc-tab {
            display: flex;
            align-items: center;
            padding: 8px 14px;
            font-size: 13px;
            font-weight: 500;
            color: ${C.tabColor} !important;
            text-decoration: none !important;
            white-space: nowrap;
            border-bottom: 2px solid transparent;
            transition: color 0.15s, border-color 0.15s, background 0.15s;
            letter-spacing: -0.01em;
            border-radius: 6px 6px 0 0;
        }
        a.wdc-tab:hover,
        #wdc-header-tabs a.wdc-tab:hover,
        header a.wdc-tab:hover {
            color: #64b5f6 !important;
            background: rgba(30,136,229,0.08);
        }
        a.wdc-tab.wdc-tab-active,
        #wdc-header-tabs a.wdc-tab.wdc-tab-active,
        header a.wdc-tab.wdc-tab-active {
            color: #64b5f6 !important;
            border-bottom-color: ${C.tabColor} !important;
            font-weight: 600;
        }
        /* Location tabs */
        .wdc-loc-tab {
            display: flex;
            align-items: center;
            position: relative;
            margin-left: 2px;
        }
        a.wdc-tab.wdc-tab-loc,
        a.wdc-tab.wdc-tab-loc:link,
        a.wdc-tab.wdc-tab-loc:visited,
        #wdc-header-tabs a.wdc-tab.wdc-tab-loc {
            padding-right: 22px;
            max-width: 160px;
            overflow: hidden;
            text-overflow: ellipsis;
            font-size: 12px;
            color: ${C.tabColor} !important;
            background: ${C.bgRaise};
            border-radius: 6px 6px 0 0;
            border: 1px solid ${C.border};
            border-bottom: 2px solid transparent;
        }
        a.wdc-tab.wdc-tab-loc-active,
        #wdc-header-tabs a.wdc-tab.wdc-tab-loc-active {
            background: ${C.bgCard} !important;
            border-bottom-color: ${C.tabColor} !important;
            color: #64b5f6 !important;
        }
        .wdc-tab-close {
            position: absolute;
            right: 4px;
            top: 50%;
            transform: translateY(-50%);
            width: 16px;
            height: 16px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 14px;
            color: ${C.fgGhost};
            cursor: pointer;
            border-radius: 3px;
            line-height: 1;
            transition: color 0.12s, background 0.12s;
        }
        .wdc-tab-close:hover {
            color: ${C.fg};
            background: rgba(255,255,255,0.1);
        }
        /* Plus button */
        .wdc-tab-plus {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 28px;
            height: 28px;
            margin-left: 4px;
            border-radius: 6px;
            border: 1px dashed ${C.border};
            background: transparent;
            color: ${C.tabColor};
            font-size: 18px;
            font-weight: 400;
            cursor: pointer;
            transition: all 0.15s;
            flex-shrink: 0;
            line-height: 1;
        }
        .wdc-tab-plus:hover {
            background: rgba(30,136,229,0.1);
            border-color: ${C.tabColor};
            color: #fff;
        }
    `;

    // =====================================================================
    //  WEATHER.GOV RADAR EMBED
    // =====================================================================
    const RADAR_URL = 'https://radar.weather.gov/?settings=v1_eyJhZ2VuZGEiOnsiaWQiOiJuYXRpb25hbCIsImNlbnRlciI6Wy03OS4yNCwzNy44NjddLCJsb2NhdGlvbiI6bnVsbCwiem9vbSI6NS45NTI3MTMwOTYxNDgyOSwibGF5ZXIiOiJicmVmX3FjZCJ9LCJhbmltYXRpbmciOnRydWUsImJhc2UiOiJkYXJrY2FudmFzIiwiYXJ0Y2MiOnRydWUsImNvdW50eSI6dHJ1ZSwiY3dhIjp0cnVlLCJyZmMiOnRydWUsInN0YXRlIjp0cnVlLCJtZW51Ijp0cnVlLCJzaG9ydEZ1c2VkT25seSI6dHJ1ZSwib3BhY2l0eSI6eyJhbGVydHMiOjAuOCwibG9jYWwiOjAuNiwibG9jYWxTdGF0aW9ucyI6MC44LCJuYXRpb25hbCI6MC42fX0%3D';

    function isRadarPage() {
        return window.location.pathname.includes('/weather/radar/');
    }

    function embedRadar() {
        if (!isRadarPage()) return;
        // Already embedded?
        if (document.getElementById('wdc-radar-frame')) return;

        // Find the radar container
        const nativeContainer = document.querySelector('#WXU-RADAR-CONTAINER, [class*="Wrapper--radarContainer"], [class*="Wrapper--radarWrapper"], [class*="Wrapper--contentContainer"]');
        const radarSection = document.querySelector('section[class*="radarWrapper"], [id*="WxuRadar"]');
        const target = radarSection || (nativeContainer ? nativeContainer.closest('section') || nativeContainer.parentElement : null);

        if (!target) return;

        // Hide native radar
        target.style.display = 'none';

        // Create iframe container
        const container = document.createElement('div');
        container.id = 'wdc-radar-embed';
        Object.assign(container.style, {
            width: '100%',
            height: 'calc(100vh - 80px)',
            minHeight: '600px',
            borderRadius: '8px',
            overflow: 'hidden',
            border: '1px solid ' + C.border,
            marginTop: '8px',
        });

        const iframe = document.createElement('iframe');
        iframe.id = 'wdc-radar-frame';
        iframe.src = RADAR_URL;
        Object.assign(iframe.style, {
            width: '100%', height: '100%',
            border: 'none',
        });
        iframe.setAttribute('allowfullscreen', '');
        iframe.setAttribute('loading', 'lazy');

        container.appendChild(iframe);
        target.parentElement.insertBefore(container, target.nextSibling);
    }

    // =====================================================================
    //  DARK THEME CSS
    // =====================================================================
    const CSS_DARK = `
        /* ---- SYSTEM A: Legacy BEM Variable Overrides ---- */
        :root {
            --backgroundDefault: ${C.bg} !important;
            --backgroundCard: ${C.bgCard} !important;
            --backgroundPage: ${C.bg} !important;
            --backgroundCardDark: ${C.bgRaise} !important;
            --backgroundLightGray: ${C.bgCard} !important;
            --backgroundOverlay: ${C.bgCard} !important;
            --backgroundLegal: ${C.bgDeep} !important;
            --backgroundTableBody: ${C.bgTable} !important;
            --backgroundHeading: ${C.bgTable} !important;
            --backgroundLight: ${C.bgRaise} !important;
            --PureWhite: ${C.bgDeep} !important;
            --PureWhite5: rgba(220,228,240,0.05) !important;
            --PureWhite10: rgba(220,228,240,0.1) !important;
            --PureWhite80: rgba(220,228,240,0.8) !important;
            --Panther: ${C.fg} !important;
            --Panther5: rgba(12,16,24,0.05) !important;
            --Panther10: rgba(12,16,24,0.1) !important;
            --Panther70: rgba(12,16,24,0.7) !important;
            --Panther80: rgba(12,16,24,0.8) !important;
            --Panther90: rgba(12,16,24,0.9) !important;
            --Dove: ${C.bgCard} !important;
            --textDefault: ${C.fg} !important;
            --textDark: ${C.fg} !important;
            --textMedium: ${C.fgMid} !important;
            --textLight: ${C.fgDim} !important;
            --textSecondary: ${C.fgDim} !important;
            --textGray: ${C.fgMute} !important;
            --textInfo: ${C.fgMute} !important;
            --textBrand: ${C.fg} !important;
            --textBrandDark: ${C.accentLt} !important;
            --textDisabled: ${C.fgGhost} !important;
            --cardHeadingText: ${C.fgDim} !important;
            --samsung-text-medium: ${C.fgMid} !important;
            --borderDefault: ${C.border} !important;
            --borderLight: ${C.borderLt} !important;
            --borderMedium: ${C.borderMd} !important;
            --borderDark: ${C.fgGhost} !important;
            --borderGrayMedium: ${C.border} !important;
            --dividerDefault: ${C.border} !important;
            --buttonBackground: ${C.bgRaise} !important;
            --buttonText: ${C.fg} !important;
            --buttonInactive: ${C.border} !important;
            --secondaryButtonBackground: ${C.bgRaise} !important;
            --secondaryButtonText: ${C.fg} !important;
            --iconDark: ${C.fg} !important;
            --iconLight: ${C.fg} !important;
            --iconGray: ${C.fgMute} !important;
            --iconInactiveGray: ${C.fgGhost} !important;
        }

        /* PureWhite counter-cases (text/fill usage) */
        [class*="PremiumButton--link"],
        [class*="SidebarNavigation--newBadge"],
        [class*="MediaObject--liveTag"],
        [class*="BreakingNewsTicker"] *,
        [class*="PremiumBanner--banner"],
        [class*="AccountLinks--accountButton"],
        [class*="LanguageSelector--menuButtonInner"],
        [class*="LanguageSelector--globeIcon"],
        [class*="LanguageSelector--unitDisplay"] {
            color: ${C.fg} !important; fill: ${C.fg} !important;
        }
        [class*="BreakingNewsTicker--ticker"] { background-color: ${C.bgCard} !important; }
        [class*="styles--newBadge"] { background-color: ${C.bgCard} !important; }
        [class*="AccountLinks--accountButton"] { background-color: transparent !important; }

        /* ---- SYSTEM B: Tailwind/shadcn Variable Overrides ---- */
        :root, :root.dark, html, html.dark {
            --background: ${C.bg} !important;
            --foreground: ${C.fg} !important;
            --card: ${C.bgCard} !important;
            --card-foreground: ${C.fg} !important;
            --popover: ${C.bgCard} !important;
            --popover-foreground: ${C.fg} !important;
            --primary: ${C.fg} !important;
            --primary-foreground: ${C.bg} !important;
            --secondary: ${C.bgRaise} !important;
            --secondary-foreground: ${C.fg} !important;
            --muted: ${C.bgRaise} !important;
            --muted-foreground: ${C.fgMute} !important;
            --accent: ${C.bgRaise} !important;
            --accent-foreground: ${C.fg} !important;
            --border: ${C.border} !important;
            --input: ${C.border} !important;
            --ring: ${C.accent} !important;
            --sidebar: ${C.bgDeep} !important;
            --sidebar-foreground: ${C.fg} !important;
            --sidebar-primary: ${C.accent} !important;
            --sidebar-primary-foreground: ${C.fg} !important;
            --sidebar-accent: ${C.bgRaise} !important;
            --sidebar-accent-foreground: ${C.fg} !important;
            --sidebar-border: ${C.border} !important;
            color-scheme: dark !important;
            --color-white: ${C.fg} !important;
            --color-black: ${C.bg} !important;
            --color-gray-100: ${C.bgCard} !important;
            --color-gray-200: ${C.bgRaise} !important;
            --color-gray-300: ${C.border} !important;
            --color-gray-400: #3a4d6b !important;
            --color-gray-500: #5f7494 !important;
            --color-gray-600: ${C.fgMute} !important;
            --color-gray-700: ${C.fgDim} !important;
            --color-gray-800: ${C.fgMid} !important;
            --color-gray-900: ${C.fg} !important;
            --color-slate-100: #111a28 !important;
            --color-slate-200: #1a2c40 !important;
            --color-slate-800: #c0d4e6 !important;
            --color-slate-900: #e0eaf4 !important;
            --color-blue-500: ${C.accentLt} !important;
            --color-blue-600: ${C.accent} !important;
            --color-blue-700: #3d6de0 !important;
            --color-blue-800: #162040 !important;
            --color-brand-100: #0e1828 !important;
            --color-brand-200: #162040 !important;
            --color-brand-300: #1a3060 !important;
            --color-brand-400: #2050a0 !important;
            --color-brand-dark: #162040 !important;
            --color-brand-light: ${C.accentLt} !important;
            --color-brand-active: ${C.accent} !important;
        }

        /* ---- Root / Page Backgrounds ---- */
        html, body { background-color: ${C.bg} !important; color: ${C.fg} !important; }
        .lightTheme, .twcTheme, #appWrapper { background-color: ${C.bg} !important; color: ${C.fg} !important; }
        [class*="DaybreakLargeScreen--gridWrapper"],
        [class*="DaybreakLargeScreen--regionTopAds"],
        [class*="FullViewportLargeScreen--appWrapper"],
        [class*="FullViewportLargeScreen--appContentWrapper"] { background-color: ${C.bg} !important; }

        /* ---- Legacy BEM Components ---- */
        [class*="Card--card"], .card { background-color: ${C.bgCard} !important; border-color: ${C.border} !important; }
        [class*="Card--content"], [class*="Card--cardHeader"], [class*="Card--cardHeading"], [class*="Card--cardHeaderWrap"] { color: ${C.fg} !important; }
        [class*="Card--cardFooter"] { border-color: ${C.border} !important; }
        [class*="LocationPageTitle"] { color: ${C.fg} !important; background-color: transparent !important; }

        /* 10-Day */
        [class*="DailyForecast--CardContent"], [class*="DailyForecast--timestamp"], [class*="DailyForecast--DisclosureList"] { color: ${C.fg} !important; }
        [class*="Disclosure--themeList"], [class*="Disclosure--Summary"], [class*="Disclosure--SummaryDefault"] { color: ${C.fg} !important; border-color: ${C.border} !important; }
        [class*="DaypartDetails--DayPartDetail"] { background-color: ${C.bgCard} !important; border-color: ${C.border} !important; }
        [class*="DaypartDetails--Summary"], [class*="DaypartDetails--DetailSummaryContent"],
        [class*="DaypartDetails--Content"], [class*="DaypartDetails--col1"], [class*="DaypartDetails--col2"] { background-color: ${C.bgTable} !important; color: ${C.fg} !important; }
        [class*="DaypartDetails--DetailsTable"] { background-color: transparent !important; }
        .DaypartDetails--DetailsTable--a4Nfo { background-color: transparent !important; }
        [class*="DetailsSummary"], [class*="DetailsSummary--daypartName"],
        [class*="DetailsSummary--highTempValue"], [class*="DetailsSummary--lowTempValue"],
        [class*="DetailsSummary--precip"], [class*="DetailsSummary--extendedData"] { color: ${C.fg} !important; }
        [class*="DetailsSummary--precipIcon"] { color: ${C.accentLt} !important; }
        [class*="DetailsTable--DetailsTable"], [class*="DetailsTable--field"],
        [class*="DetailsTable--label"], [class*="DetailsTable--listItem"],
        [class*="DetailsTable--value"] { color: ${C.fg} !important; border-color: ${C.border} !important; }
        [class*="DetailsTable--icon"] { color: ${C.fgDim} !important; }
        [class*="DetailsTable--moonIcon"] { fill: ${C.fgDim} !important; }
        [class*="DailyContent--narrative"], [class*="DailyContent--DailyContent"],
        [class*="DailyContent--daypartName"], [class*="DailyContent--ConditionSummary"],
        [class*="DailyContent--label"], [class*="DailyContent--dataPoints"],
        [class*="DailyContent--Condition"], [class*="DailyContent--degreeSymbol"],
        [class*="DailyContent--temp"] { color: ${C.fg} !important; }
        [class*="DailyContent--windIcon"] { color: ${C.fgDim} !important; }

        /* Hourly */
        [class*="HourlyForecast"], [class*="HourlyContent"] { color: ${C.fg} !important; }

        /* Monthly / Calendar */
        [class*="Calendar--Card"] { background-color: ${C.bgCard} !important; }
        [class*="Calendar--CardHeader"], [class*="Calendar--timestamp"] { color: ${C.fg} !important; }
        [class*="Calendar--gridWrapper"] { background-color: ${C.bgCard} !important; }
        [class*="Calendar--line"] { border-color: ${C.border} !important; }
        [class*="Calendar--dayInfoCard"] { background-color: ${C.bgRaise} !important; color: ${C.fg} !important; border-color: ${C.border} !important; }
        [class*="Calendar--daypartDetails"] { background-color: ${C.bgTable} !important; color: ${C.fg} !important; }
        [class*="CalendarDateCell--dayCell"] { color: ${C.fg} !important; border-color: ${C.border} !important; }
        [class*="CalendarDateCell--selected"] { background-color: ${C.accent} !important; color: ${C.bg} !important; }
        [class*="CalendarDateCell--active"]:not([class*="selected"]) { background-color: ${C.bgRaise} !important; }
        [class*="CalendarDateCell--label"], [class*="CalendarDateCell--tempHigh"],
        [class*="CalendarDateCell--tempLow"] { color: ${C.fg} !important; }
        [class*="CalendarDateCell--date"] { color: ${C.fgMid} !important; }
        [class*="CalendarMonthPicker"] { color: ${C.fg} !important; background-color: transparent !important; }
        nav[class*="CalendarMonthPicker--forecastMonthlyNav"] { background-color: transparent !important; }
        [class*="CalendarMonthPicker--arrow"], [class*="CalendarMonthPicker--arrowIcon"] { color: ${C.fg} !important; fill: ${C.fg} !important; }
        [class*="CalendarMonthPicker--monthText"] { color: ${C.fg} !important; }
        [class*="Almanac--header"], [class*="Almanac--columnLabel"], [class*="Almanac--rowLabel"],
        [class*="Almanac--tableItem"], [class*="Almanac--tableTitle"], [class*="Almanac--recordYear"] { color: ${C.fg} !important; }
        [class*="Almanac--table"], [class*="Almanac--row"] { border-color: ${C.border} !important; }

        /* Header (BEM) */
        .regionHeader, [class*="MainMenuHeader--MainMenuHeader"], [class*="MainMenuHeader--wrapper"] { background-color: ${C.bgDeep} !important; border-color: ${C.border} !important; }
        [class*="Accordion--accordionHeader"] { color: ${C.fg} !important; }
        [class*="SearchTitle--text"], [class*="SearchTitle--container"] { color: ${C.fgDim} !important; }
        [class*="RecentLocations--clearButton"] { color: ${C.accent} !important; }

        /* Account / Unit buttons */
        [class*="AccountLinks--desktopLoginButton"] { background: ${C.bgRaise} !important; color: ${C.fg} !important; }
        [class*="UnitSelector--UnitSelectorButton"] { background-color: ${C.bgRaise} !important; color: ${C.fg} !important; border-color: ${C.border} !important; }

        /* Data widgets */
        [class*="AirQuality--AirQualityCard"], [class*="AirQuality--airQualitySuite"], [class*="AirQualityText"] { color: ${C.fg} !important; }
        [class*="HealthActivitiesCard"], [class*="HealthActivitiesListItem"] { color: ${C.fg} !important; }
        [class*="DonutChart"] svg text, [data-testid="DonutChart"] svg text,
        [data-testid="DonutChartValue"], [data-testid="PercentageValue"] { fill: ${C.fg} !important; color: ${C.fg} !important; }
        [class*="DonutChart--track"] { stroke: ${C.border} !important; }
        [class*="Wind--windWrapper"] { color: ${C.fg} !important; }
        [class*="Timestamp--time"], [data-testid="TimeStamp"] { color: ${C.fgDim} !important; }
        [class*="ListItem--listItem"] { color: ${C.fg} !important; }
        [class*="ListView--listViewBody"], [class*="ListView--listViewTitle"], [class*="ContentMedia--mediaTitle"] { color: ${C.fg} !important; }
        [class*="LinkList--Link"] { color: ${C.fgDim} !important; }
        [class*="PromoDriver--cardContent"] { color: ${C.fg} !important; }
        [class*="ExpandableMenu--inner"] { background-color: ${C.bgCard} !important; }
        [class*="AlertHeadline--alertText"] { color: ${C.fg} !important; }
        [class*="VideoWithoutPlaylist--VideoWithoutPlaylistContainer"],
        [class*="VideoWithoutPlaylist--activeVideoTitle"],
        [class*="VideoWithoutPlaylist--playerContainer"] { background: ${C.bgCard} !important; color: ${C.fg} !important; }
        [class*="Wrapper--radarWrapper"], [class*="Wrapper--contentContainer"],
        [class*="Wrapper--radarContainer"] { background-color: ${C.bg} !important; }
        [class*="Footer--container"] { background-color: ${C.bgDeep} !important; }
        [class*="Footer--Footer"] { color: ${C.fgMute} !important; }

        /* ---- Tailwind Utility Overrides ---- */
        .bg-white { background-color: ${C.bgCard} !important; }
        .bg-white\\/75 { background-color: rgba(19,26,38,0.9) !important; }
        .bg-gray-100, .\\!bg-gray-100 { background-color: ${C.bgCard} !important; }
        .bg-gray-200 { background-color: ${C.bgRaise} !important; }
        .bg-gray-900 { background-color: ${C.fg} !important; }
        .bg-card { background-color: ${C.bgCard} !important; }
        .bg-transparent { background-color: transparent !important; }
        .bg-\\[\\#e9e9e9\\] { background-color: ${C.bgRaise} !important; }
        .bg-\\[\\#9fcbf9\\] { background-color: #1a3050 !important; }
        .bg-\\[\\#2524221A\\] { background-color: rgba(220,228,240,0.1) !important; }
        .bg-\\[rgba\\(37\\,36\\,34\\,0\\.10\\)\\] { background-color: rgba(220,228,240,0.1) !important; }
        .bg-\\[rgba\\(37\\,36\\,34\\,0\\.8\\)\\] { background-color: rgba(12,16,24,0.8) !important; }
        .bg-\\[rgba\\(53\\,45\\,35\\,0\\.102\\)\\] { background-color: rgba(220,228,240,0.1) !important; }
        .bg-black\\/40 { background-color: rgba(12,16,24,0.4) !important; }

        .text-gray-900, .text-black { color: ${C.fg} !important; }
        .text-gray-800 { color: ${C.fgMid} !important; }
        .text-gray-700 { color: ${C.fgDim} !important; }
        .text-gray-600, .text-\\[\\#6f7585\\] { color: ${C.fgMute} !important; }
        .text-gray-500, .text-gray-400 { color: ${C.fgGhost} !important; }
        .text-\\[\\#003399\\] { color: ${C.accentLt} !important; }
        .text-blue-500, .text-blue-600 { color: ${C.accentLt} !important; }
        .text-brand-active { color: ${C.accent} !important; }
        .text-brand-light { color: ${C.accentLt} !important; }
        .text-card-foreground { color: ${C.fg} !important; }
        .text-text-secondary { color: ${C.fgDim} !important; }
        .text-primary-foreground { color: ${C.bg} !important; }

        .border-\\[\\#dedede\\] { border-color: ${C.border} !important; }
        .border-\\[\\#2524221A\\] { border-color: ${C.border} !important; }
        .border-gray-200 { border-color: ${C.border} !important; }
        .border-gray-500, .border-grey-500 { border-color: ${C.borderMd} !important; }
        .border-gray-900\\/10 { border-color: rgba(220,228,240,0.1) !important; }
        .border-white { border-color: ${C.border} !important; }
        .border-input { border-color: ${C.border} !important; }
        svg.text-gray-900, svg[class*="text-gray-9"] { color: ${C.fg} !important; }

        /* Tailwind header */
        [data-testid="header-main"] { background-color: ${C.bgDeep} !important; color: ${C.fg} !important; border-color: ${C.border} !important; }
        [data-testid="header-main"] svg:not(.wdc-tab svg) { color: ${C.fg} !important; }

        /* Force header logo visible at all breakpoints */
        [data-testid="header-logo"],
        a[data-testid="header-logo"] {
            display: flex !important;
            visibility: visible !important;
            opacity: 1 !important;
        }
        div:has(> [data-testid="header-logo"]),
        .xl\\:hidden:has([data-testid="header-logo"]) {
            display: flex !important;
            visibility: visible !important;
        }
        @media (min-width: 1280px) {
            div:has(> [data-testid="header-logo"]),
            .xl\\:hidden:has([data-testid="header-logo"]) {
                display: flex !important;
            }
        }
        [data-testid="header-logo"] svg,
        .wdc-custom-logo svg {
            display: block !important;
            height: 36px !important;
            width: auto !important;
        }

        /* BEM logo container */
        [class*="MainMenuHeader--logoLink"] {
            display: flex !important;
            align-items: center !important;
        }
        [class*="MainMenuHeader--logoLink"] [class*="Icon--iconWrapper"] {
            display: flex !important;
            align-items: center !important;
        }

        /* ---- SEARCH BAR (both systems) ---- */
        /* Tailwind search */
        [data-testid="header-search"] { position: relative; z-index: 100; }
        [data-testid="header-search"] input,
        [data-testid="header-search"] input[data-slot="input"],
        html.dark [data-testid="header-search"] input,
        html.dark [data-testid="header-search"] input[data-slot="input"] {
            background-color: ${C.bgRaise} !important;
            background: ${C.bgRaise} !important;
            color: ${C.fg} !important;
            border: 1px solid ${C.border} !important;
            border-radius: 8px !important;
            pointer-events: auto !important;
            cursor: text !important;
            opacity: 1 !important;
            caret-color: ${C.fg} !important;
        }
        [data-testid="header-search"] input::placeholder { color: ${C.fgMute} !important; opacity: 1 !important; }
        [data-testid="header-search"] input:focus {
            outline: 2px solid ${C.accent} !important;
            outline-offset: -2px !important;
            background: ${C.bgRaise} !important;
        }
        [data-testid="header-search"] svg { color: ${C.fgDim} !important; pointer-events: none; }
        [data-testid="header-search"],
        [data-testid="header-search"] > div,
        [data-testid="header-search"] > div > div {
            display: flex !important;
            visibility: visible !important;
            pointer-events: auto !important;
        }
        .max-md\\:hidden:has(input[placeholder*="Search"]) { display: flex !important; }

        /* BEM search - high specificity dark overrides */
        [class*="SearchInput--InputField"],
        [data-testid="searchModalInputBox"],
        input[class*="SearchInput--InputField"],
        input[class*="HeaderLargeScreen--searchInputClass"],
        input[data-testid="searchModalInputBox"],
        header input[class*="SearchInput--InputField"],
        [class*="MainMenuHeader"] input[class*="SearchInput"],
        [class*="MainMenuHeader"] input {
            background-color: ${C.bgRaise} !important;
            background: ${C.bgRaise} !important;
            color: ${C.fg} !important;
            border: 1px solid ${C.border} !important;
            border-radius: 8px !important;
            pointer-events: auto !important;
            cursor: text !important;
            caret-color: ${C.fg} !important;
            opacity: 1 !important;
        }
        [class*="SearchInput--InputField"]::placeholder,
        input[class*="SearchInput--InputField"]::placeholder { color: ${C.fgMute} !important; opacity: 1 !important; }
        [class*="SearchInput--InputField"]:focus,
        input[class*="SearchInput--InputField"]:focus {
            outline: 2px solid ${C.accent} !important;
            border-color: ${C.accent} !important;
            background: ${C.bgRaise} !important;
        }
        /* BEM search icon - beat Icon--lightTheme */
        [class*="SearchInput--searchIcon"],
        svg[class*="SearchInput--searchIcon"],
        svg[class*="SearchInput--searchIcon"][class*="Icon--lightTheme"],
        svg[class*="HeaderLargeScreen--searchIcon"],
        svg[class*="HeaderLargeScreen--searchIcon"][class*="Icon--lightTheme"] {
            color: ${C.fgDim} !important;
            fill: ${C.fgDim} !important;
        }
        /* BEM search wrapper */
        [class*="Search--Search"],
        [class*="SearchCombobox"],
        [class*="HeaderLargeScreen--searchContainer"],
        fieldset:has(input[class*="SearchInput--InputField"]) {
            background: transparent !important;
            pointer-events: auto !important;
        }

        /* Search results dropdown */
        [data-testid="header-search"] [role="listbox"],
        [data-testid="header-search"] [role="option"],
        [data-testid="header-search"] ul,
        [data-testid="header-search"] li,
        [class*="SearchResults--SearchResults"],
        [class*="RecentLocations--container"],
        [class*="RecentLocations--Listbox"],
        [class*="SearchResults--Listbox"] {
            background-color: ${C.bgCard} !important;
            color: ${C.fg} !important;
            border-color: ${C.border} !important;
        }
        [data-testid="header-search"] [role="option"]:hover,
        [data-testid="header-search"] li:hover,
        [class*="SearchResults--SearchResults"] li:hover,
        [class*="RecentLocations--Listbox"] li:hover { background-color: ${C.bgRaise} !important; }

        /* Homepage hero */
        #labBG { opacity: 0.15 !important; filter: brightness(0.3) !important; }
        [data-testid="current-conditions"] { border-color: ${C.border} !important; }

        /* ---- Inline Style Catch-alls ---- */
        [style*="background-color: rgb(255, 255, 255)"],
        [style*="background-color: rgb(255,255,255)"],
        [style*="background-color:#fff"],
        [style*="background-color: #fff"],
        [style*="background-color: white"],
        [style*="background: rgb(255, 255, 255)"],
        [style*="background: rgb(255,255,255)"],
        [style*="background: white"],
        [style*="background:#fff"],
        [style*="background: #fff"] {
            background-color: ${C.bgCard} !important;
            background: ${C.bgCard} !important;
        }
        [style*="linear-gradient"][style*="rgba(255, 255, 255"],
        [style*="linear-gradient"][style*="rgba(255,255,255"] { background: transparent !important; }
        [style*="linear-gradient(90deg, rgb(32, 71, 148)"]:not(nav):not([data-testid="sidebar-navigation"]):not([class*="SidebarNavigation"]) {
            background: linear-gradient(90deg, #0e1828 0%, #0e2040 50%, #0e2838 100%) !important;
        }

        /* ---- Radar (fallback for non-embed pages with mini maps) ---- */
        [class*="DynamicMap--dynamicMapContainer"] { border: 1px solid ${C.border} !important; border-radius: 8px; overflow: hidden; }
        [class*="Slideshow--Slideshow"], [class*="Slideshow--slide"] {
            filter: invert(1) hue-rotate(180deg) brightness(0.95) contrast(0.9) !important;
        }
        [class*="DynamicMap--dynamicMapContainer"] [class*="LocationPin"],
        [class*="DynamicMap--dynamicMapContainer"] [class*="Timestamp"],
        [class*="DynamicMap--dynamicMapContainer"] [class*="MapboxAttribution"] {
            filter: invert(1) hue-rotate(180deg) !important;
        }
        [class*="MapboxAttribution"] { background-color: rgba(12,16,24,0.7) !important; }
        .mapboxgl-canvas, canvas.mapboxgl-canvas {
            filter: invert(1) hue-rotate(180deg) brightness(0.95) contrast(0.9) !important;
        }
        .mapboxgl-ctrl-group, .mapboxgl-ctrl-attrib, .mapboxgl-ctrl, .mapboxgl-popup {
            filter: invert(1) hue-rotate(180deg) !important;
        }

        /* ---- Inputs / Popovers ---- */
        input, select, textarea { background-color: ${C.bgRaise} !important; color: ${C.fg} !important; border-color: ${C.border} !important; }
        input::placeholder { color: #5f7494 !important; }
        [role="menu"], [role="listbox"], [role="dialog"],
        [data-radix-popper-content-wrapper], [role="tooltip"] {
            background-color: ${C.bgCard} !important; border-color: ${C.border} !important; color: ${C.fg} !important;
        }

        /* ---- Cookie/Consent ---- */
        [class*="cookie"], [class*="consent"], [id*="cookie"], [id*="consent"],
        #onetrust-banner-sdk, .onetrust-pc-dark-filter { display: none !important; }

        /* ==== PROFESSIONAL POLISH ==== */

        /* ---- Enhanced Alert/Warning/Watch Banners ---- */
        :root {
            --alertLevel1: #ea3c5c !important;
            --alertLevel2: #fc9831 !important;
            --alertLevel3: #efc03e !important;
            --alertLevel4: #cc53ca !important;
            --alertSevere: #ea3c5c !important;
        }
        [class*="AlertHeadline--AlertHeadline"] {
            background: linear-gradient(135deg, rgba(234,60,92,0.15) 0%, rgba(252,152,49,0.08) 100%) !important;
            border: 1px solid rgba(252,152,49,0.35) !important;
            border-radius: 12px !important;
            padding: 12px 16px !important;
            margin: 8px 0 !important;
            backdrop-filter: blur(8px) !important;
            transition: all 0.2s ease !important;
            box-shadow: 0 2px 12px rgba(252,152,49,0.08), inset 0 1px 0 rgba(255,255,255,0.04) !important;
        }
        [class*="AlertHeadline--AlertHeadline"]:hover {
            border-color: rgba(252,152,49,0.55) !important;
            box-shadow: 0 4px 20px rgba(252,152,49,0.15), inset 0 1px 0 rgba(255,255,255,0.06) !important;
            transform: translateY(-1px) !important;
        }
        [class*="AlertHeadline--alertText"] {
            color: ${C.fg} !important;
            font-weight: 600 !important;
            letter-spacing: -0.01em !important;
        }
        [class*="AlertHeadline--alertCountBadge"] {
            background: rgba(255,255,255,0.08) !important;
            border-radius: 8px !important;
            padding: 4px 10px !important;
            font-weight: 600 !important;
            color: ${C.fg} !important;
        }
        /* TW alerts */
        section[aria-label*="alert"] button,
        section[aria-label*="Alert"] button,
        button[aria-label*="alert"] {
            border-radius: 12px !important;
            border: 1px solid rgba(252,152,49,0.35) !important;
            transition: all 0.2s !important;
        }
        .uppercase.text-white:has(svg[viewBox="0 0 24 24"]) {
            font-weight: 600 !important;
            letter-spacing: 0.02em !important;
        }

        /* ---- Enhanced Card Styling ---- */
        [class*="Card--card"], .card, section.bg-card {
            background: linear-gradient(180deg, ${C.bgCard} 0%, rgba(19,26,38,0.95) 100%) !important;
            border: 1px solid ${C.border} !important;
            border-radius: 16px !important;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.03) !important;
            overflow: hidden !important;
        }
        [class*="Card--cardHeader"], [class*="Card--cardHeading"] {
            font-weight: 700 !important;
            letter-spacing: -0.02em !important;
        }

        /* ---- Enhanced Disclosure/Accordion Items (10-Day) ---- */
        [class*="Disclosure--Summary"]:not([class*="Open"]) {
            border-radius: 12px !important;
            margin: 3px 0 !important;
            transition: all 0.2s ease !important;
        }
        [class*="Disclosure--Summary"]:hover {
            background: rgba(74,125,255,0.06) !important;
        }
        [class*="DetailsSummary--daypartName"] {
            font-weight: 700 !important;
            letter-spacing: -0.01em !important;
        }
        [class*="DetailsSummary--highTempValue"] {
            font-weight: 800 !important;
            font-size: 1.1em !important;
        }
        [class*="DetailsSummary--lowTempValue"] {
            color: ${C.fgMute} !important;
        }
        [class*="DetailsSummary--precipIcon"] {
            color: #4fc3f7 !important;
        }
        [class*="DetailsSummary--precip"] {
            color: #4fc3f7 !important;
            font-weight: 600 !important;
        }

        /* ---- Enhanced Hourly Items ---- */
        [data-testid="HourlyWeatherCard"],
        [class*="HourlyForecast"] [class*="Disclosure--Summary"] {
            transition: background 0.15s ease !important;
        }
        [data-testid="HourlyWeatherCard"]:hover,
        [class*="HourlyForecast"] [class*="Disclosure--Summary"]:hover {
            background: rgba(74,125,255,0.05) !important;
        }

        /* ---- Enhanced Temperature Display ---- */
        [data-testid="TemperatureValue"],
        [class*="CurrentConditions--tempValue"],
        h1[class*="CurrentConditions"] span {
            font-weight: 800 !important;
            letter-spacing: -0.03em !important;
        }

        /* ---- Monthly Calendar Enhancement ---- */
        [class*="CalendarDateCell--dayCell"] {
            border-radius: 8px !important;
            transition: all 0.15s ease !important;
        }
        [class*="CalendarDateCell--dayCell"]:hover:not([class*="selected"]) {
            background: rgba(74,125,255,0.08) !important;
            transform: scale(1.02) !important;
        }
        [class*="CalendarDateCell--selected"] {
            background: linear-gradient(135deg, ${C.accent}, #2060d0) !important;
            border-radius: 8px !important;
            box-shadow: 0 2px 12px rgba(74,125,255,0.3) !important;
        }

        /* ---- Weather Icon Enhancement ---- */
        [class*="WxIcon--Icon"], [class*="weatherIcon"] {
            filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3)) !important;
        }
        svg[class*="WxIcon--Icon"] {
            --cloud: #8ab4e8 !important;
            --precip: #4fc3f7 !important;
            --rain: #4fc3f7 !important;
            --snow: #b8d4f0 !important;
            --freezing: #80d8ff !important;
            --sun: #ffd54f !important;
            --moon: #b0bec5 !important;
            --thunder: #ffab40 !important;
            --fog: #78909c !important;
        }

        /* ---- Detail Table Enhancement ---- */
        [class*="DetailsTable--field"] {
            border-color: rgba(36,48,73,0.5) !important;
            padding: 10px 12px !important;
        }
        [class*="DetailsTable--field"]:hover {
            background: rgba(74,125,255,0.04) !important;
        }
        [class*="DetailsTable--label"] {
            color: ${C.fgDim} !important;
            font-size: 0.85em !important;
            text-transform: uppercase !important;
            letter-spacing: 0.04em !important;
            font-weight: 600 !important;
        }
        [class*="DetailsTable--value"] {
            font-weight: 600 !important;
            color: ${C.fg} !important;
        }

        /* ---- Location Title Enhancement ---- */
        [class*="LocationPageTitle--PageHeader"],
        h1[class*="LocationPageTitle"] {
            font-weight: 800 !important;
            letter-spacing: -0.03em !important;
        }
        [class*="LocationPageTitle--LocationText"] {
            color: ${C.fgDim} !important;
            font-weight: 400 !important;
        }

        /* ---- Timestamp Styling ---- */
        [class*="Timestamp--time"],
        [class*="DailyForecast--timestamp"],
        [data-testid="TimeStamp"] {
            color: ${C.fgMute} !important;
            font-size: 0.78em !important;
            text-transform: uppercase !important;
            letter-spacing: 0.05em !important;
            font-weight: 500 !important;
        }

        /* ---- TW Section Headers ---- */
        .text-xl.leading-normal.tracking-tight.font-bold {
            letter-spacing: -0.02em !important;
            font-weight: 800 !important;
        }

        /* ---- Donut Charts / Gauges ---- */
        [class*="DonutChart"], [data-testid="DonutChart"] {
            filter: drop-shadow(0 0 8px rgba(74,125,255,0.15)) !important;
        }

        /* ---- Header Polish ---- */
        [data-testid="header-main"],
        [class*="MainMenuHeader--MainMenuHeader"] {
            box-shadow: 0 1px 0 rgba(255,255,255,0.03), 0 4px 16px rgba(0,0,0,0.3) !important;
        }
        .wdc-custom-logo {
            display: inline-flex !important;
            align-items: center !important;
        }

        /* ---- Link / Button Polish ---- */
        a[class*="Button--default"]:not([class*="AlertHeadline"]) {
            border-radius: 8px !important;
            transition: all 0.15s ease !important;
        }
        [class*="UnitSelector--UnitSelectorButton"] {
            border-radius: 8px !important;
            transition: all 0.15s ease !important;
        }
        [class*="UnitSelector--UnitSelectorButton"]:hover {
            background: ${C.bgRaise} !important;
            border-color: ${C.accent} !important;
        }

        /* ---- Subtle Background Texture ---- */
        body::before {
            content: '';
            position: fixed;
            inset: 0;
            background: radial-gradient(ellipse at 20% 0%, rgba(74,125,255,0.03) 0%, transparent 60%),
                        radial-gradient(ellipse at 80% 100%, rgba(30,136,229,0.02) 0%, transparent 50%);
            pointer-events: none;
            z-index: -1;
        }

        /* ---- Scrollbar ---- */
        * { scrollbar-color: ${C.border} ${C.bg}; }
        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-track { background: ${C.bg}; }
        ::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: #3a4d6b; }
    `;

    // =====================================================================
    //  DEBLOAT CSS
    // =====================================================================
    const CSS_ADS = `
        [id^="WX_"], [data-testid^="WX_"],
        [id^="MW_"], [data-testid^="MW_"],
        [id^="google_ads"], [id^="div-gpt-ad"], [class*="gpt-ad"], google-ad,
        iframe[src*="doubleclick"], iframe[src*="googlesyndication"],
        iframe[src*="amazon-adsystem"], iframe[src*="adsrvr.org"],
        iframe[src*="connatix"], iframe[src*="taboola"], iframe[id*="google_ads"],
        [id*="connatix"], [class*="connatix"], [data-testid*="Connatix"],
        [id*="taboola"], [class*="taboola"],
        [id*="outbrain"], [class*="outbrain"],
        [class*="ad-container"], [class*="adWrapper"], [class*="adSlot"], [class*="ad-label"],
        [class*="BaseAd--adWrapper"], [class*="BaseAd--adBackground"],
        [class*="BaseAd--adLabel"], [class*="BaseAd--card"], [class*="BaseAd--ad_module"],
        .regionTopAds, [class*="DaybreakLargeScreen--regionTopAds"], [class*="StickyRailAd"],
        .regionCombinedTopAds, .combinedTopAdsSectionWrapper {
            display: none !important; height: 0 !important; max-height: 0 !important;
            min-height: 0 !important; padding: 0 !important; margin: 0 !important;
            overflow: hidden !important; visibility: hidden !important;
        }
        .hide-empty:has(> .hidden) { display: none !important; }
    `;
    const CSS_PREMIUM = `
        [class*="PremiumBanner"], [data-testid="WX_SubsInterstitial"], [id="WX_SubsInterstitial"],
        [data-testid="MW_Interstitial"], [id="MW_Interstitial"] { display: none !important; height: 0 !important; }
        a[href*="/subscribe"], li:has(> a[href*="/subscribe"]),
        a[href*="/subscribe/checkout"] { display: none !important; }
        li:has(a[href*="/subscribe"]) { display: none !important; }
    `;
    const CSS_VIDEO = `[class*="VideoWithoutPlaylist"], [class*="DaypartDetails--videoContainer"], [class*="JwPlayer"] { display: none !important; }`;
    const CSS_NEWS = `
        [class*="ContentMedia--sidebarListViewContentMedia"], [class*="ContentMedia--secondaryContainer"],
        [class*="ListView--sidebarListViewContentMedia"],
        [data-testid="ContentMediaModule"], [data-testid="promoDriverModule"],
        [class*="PromoDriver--ad"] { display: none !important; }
    `;
    const CSS_FOOTER = `footer, [class*="Footer--Footer"], [class*="DaybreakLargeScreen--regionFooter"], [data-testid="Footer"] { display: none !important; }`;
    const CSS_COMPACT = `.gap-6{gap:0.75rem!important}.gap-4{gap:0.5rem!important}.p-6{padding:0.75rem!important}section{margin-bottom:0.25rem!important}[class*="Card--cardPadded"]{padding:12px!important}`;
    const CSS_MOTION = `*,*::before,*::after{transition-duration:0.05s!important;animation-duration:0.05s!important}`;

    // =====================================================================
    //  FEATURE MAP
    // =====================================================================
    const FEATURES = [
        { key: 'removeAds',     name: 'Remove Ads',               group: 'Debloat', css: CSS_ADS },
        { key: 'removePremium', name: 'Remove Premium Nags',      group: 'Debloat', css: CSS_PREMIUM },
        { key: 'removeVideo',   name: 'Remove Video Cards',       group: 'Debloat', css: CSS_VIDEO },
        { key: 'removeNews',    name: 'Remove News / Articles',   group: 'Debloat', css: CSS_NEWS },
        { key: 'removeFooter',  name: 'Remove Footer',            group: 'Debloat', css: CSS_FOOTER },
        { key: 'compactMode',   name: 'Compact Mode',             group: 'Layout',  css: CSS_COMPACT },
        { key: 'reduceMotion',  name: 'Reduce Animations',        group: 'Layout',  css: CSS_MOTION },
        { key: 'blockTracking', name: 'Block Ad/Tracking Scripts', group: 'Privacy', css: null },
    ];

    function applyAllCSS() {
        injectCSS('darkTheme', CSS_DARK);
        injectCSS('headerTabs', CSS_HEADER_TABS);
        document.documentElement.classList.add('dark');
        for (const f of FEATURES) {
            if (f.css && opt(f.key)) injectCSS(f.key, f.css);
            else removeCSS(f.key);
        }
    }
    applyAllCSS();

    // =====================================================================
    //  NETWORK INTERCEPTION
    // =====================================================================
    const BH = ['doubleclick.net','googlesyndication.com','googleadservices.com','google-analytics.com','googletagmanager.com','amazon-adsystem.com','aax.amazon-adsystem.com','taboola.com','cdn.taboola.com','trc.taboola.com','outbrain.com','widgets.outbrain.com','connatix.com','cds.connatix.com','adsrvr.org','adnxs.com','rubiconproject.com','pubmatic.com','openx.net','casalemedia.com','indexexchange.com','moatads.com','scorecardresearch.com','quantserve.com','bluekai.com','krxd.net','exelator.com','criteo.com','criteo.net','bidswitch.net','liveramp.com','rlcdn.com','permutive.com','permutive.app','chartbeat.com','chartbeat.net','omtrdc.net','2o7.net','demdex.net'];
    function isBlocked(url) {
        if (!opt('blockTracking') && !opt('removeAds')) return false;
        try { const u = typeof url === 'string' ? url : url?.url || url?.href || ''; return BH.some(h => u.includes(h)); } catch { return false; }
    }
    const _fetch = window.fetch;
    window.fetch = function(input, init) { return isBlocked(input) ? Promise.resolve(new Response('', {status:204})) : _fetch.call(this, input, init); };
    const _xo = XMLHttpRequest.prototype.open, _xs = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.open = function(m,url) { this._wb = isBlocked(url); return _xo.apply(this, arguments); };
    XMLHttpRequest.prototype.send = function() { if (this._wb) return; return _xs.apply(this, arguments); };
    const _ce = document.createElement.bind(document);
    document.createElement = function(tag) {
        const el = _ce(tag);
        if (tag === 'script' || tag === 'iframe') {
            const _sa = el.setAttribute.bind(el);
            el.setAttribute = function(n,v) { if ((n==='src'||n==='href') && isBlocked(v)) return; return _sa(n,v); };
        }
        return el;
    };

    // =====================================================================
    //  DOM ENGINE
    // =====================================================================
    const AS = ['[id^="WX_"]','[data-testid^="WX_"]','[id^="MW_"]','[data-testid^="MW_"]','[id^="google_ads"]','[id^="div-gpt-ad"]','iframe[src*="doubleclick"]','iframe[src*="googlesyndication"]','iframe[src*="amazon-adsystem"]','iframe[src*="connatix"]','[id*="taboola"]','[id*="outbrain"]','[id*="connatix"]','[class*="connatix"]','.regionTopAds','.regionCombinedTopAds','.combinedTopAdsSectionWrapper','[class*="BaseAd--adWrapper"]','[class*="BaseAd--card"]','script[src*="doubleclick"]','script[src*="googlesyndication"]','script[src*="taboola"]','script[src*="connatix"]','script[src*="amazon-adsystem"]','script[src*="chartbeat"]','script[src*="permutive"]','script[src*="demdex"]'];
    function nuke(n) { try { n.remove(); } catch {} }
    function nukeAds(r) { if (!opt('removeAds')) return; for (const s of AS) { try { r.querySelectorAll(s).forEach(nuke); } catch {} } }
    function nukePrem(r) { if (!opt('removePremium')) return; r.querySelectorAll('a[href*="/subscribe"]').forEach(el => { const li=el.closest('li'); if(li) nuke(li); else nuke(el); }); }

    function fixInline(r) {
        r.querySelectorAll('[style]').forEach(el => {
            const s = el.getAttribute('style') || '';
            if (/background(-color)?\s*:\s*(#fff\b|#ffffff|white\b|rgb\(\s*255\s*,\s*255\s*,\s*255)/i.test(s))
                el.style.setProperty('background-color', C.bgCard, 'important');
            if (s.includes('background-image') && s.includes('map=light')) {
                const m = s.match(/url\([^)]+\)/);
                if (m) el.style.backgroundImage = m[0].replace('map=light', 'map=dark');
            }
        });
    }

    function fixSearch() {
        // BEM: remove disabled attribute + force dark background
        document.querySelectorAll('[data-testid="searchModalInputBox"], input[class*="SearchInput--InputField"], input[class*="HeaderLargeScreen--searchInputClass"]').forEach(el => {
            if (el.disabled) el.disabled = false;
            if (el.hasAttribute('disabled')) el.removeAttribute('disabled');
            el.style.setProperty('background-color', C.bgRaise, 'important');
            el.style.setProperty('background', C.bgRaise, 'important');
            el.style.setProperty('color', C.fg, 'important');
            el.style.setProperty('border-color', C.border, 'important');
            el.style.setProperty('pointer-events', 'auto', 'important');
            el.style.setProperty('cursor', 'text', 'important');
            el.style.setProperty('caret-color', C.fg, 'important');
        });
        // BEM: fix search icon color
        document.querySelectorAll('svg[class*="SearchInput--searchIcon"], svg[class*="HeaderLargeScreen--searchIcon"]').forEach(svg => {
            svg.style.setProperty('color', C.fgDim, 'important');
            svg.style.setProperty('fill', C.fgDim, 'important');
        });
        // TW: ensure search containers are visible
        document.querySelectorAll('[data-testid="header-search"]').forEach(container => {
            let parent = container;
            for (let i = 0; i < 5 && parent; i++) {
                if (parent.classList && parent.classList.contains('max-md:hidden'))
                    parent.style.setProperty('display', 'flex', 'important');
                parent = parent.parentElement;
            }
        });
        document.querySelectorAll('[data-testid="header-search"] input').forEach(el => {
            el.style.setProperty('pointer-events', 'auto', 'important');
            el.style.setProperty('cursor', 'text', 'important');
            el.style.setProperty('background', C.bgRaise, 'important');
            el.style.setProperty('background-color', C.bgRaise, 'important');
            if (el.disabled) el.disabled = false;
            if (el.hasAttribute('disabled')) el.removeAttribute('disabled');
        });
        document.querySelectorAll('[class*="SearchCombobox"], [class*="Search--Search"]').forEach(el => {
            el.style.setProperty('pointer-events', 'auto', 'important');
        });
    }

    // Custom logo SVG - replaces the native TWC logo on all pages
    const CUSTOM_LOGO_SVG = `<svg viewBox="0 0 180 40" xmlns="http://www.w3.org/2000/svg" style="height:36px;width:auto;display:block;">
      <defs>
        <linearGradient id="wdc-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#4a9eff"/>
          <stop offset="50%" style="stop-color:#1e88e5"/>
          <stop offset="100%" style="stop-color:#0d6ecc"/>
        </linearGradient>
        <filter id="wdc-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="1.5" result="blur"/>
          <feComposite in="SourceGraphic" in2="blur" operator="over"/>
        </filter>
      </defs>
      <!-- Cloud icon -->
      <g filter="url(#wdc-glow)" transform="translate(2,4)">
        <path d="M26 28H8a6 6 0 0 1-1.2-11.88 7.5 7.5 0 0 1 14.4-2.62A5 5 0 0 1 26 18.5V28z" fill="none" stroke="url(#wdc-grad)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <circle cx="10" cy="31" r="1" fill="#4a9eff" opacity="0.7"/>
        <circle cx="15" cy="33" r="1" fill="#1e88e5" opacity="0.5"/>
        <circle cx="20" cy="31" r="1" fill="#4a9eff" opacity="0.7"/>
      </g>
      <!-- Text -->
      <text x="40" y="27" font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" font-size="18" font-weight="700" fill="#dce4f0" letter-spacing="-0.5">Weather</text>
      <text x="121" y="27" font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" font-size="18" font-weight="300" fill="#5b8cff" letter-spacing="-0.5">Hub</text>
    </svg>`;

    function fixLogo() {
        // Replace TW header logo
        document.querySelectorAll('[data-testid="header-logo"]').forEach(logo => {
            logo.style.setProperty('display', 'flex', 'important');
            let parent = logo.parentElement;
            if (parent) {
                parent.style.setProperty('display', 'flex', 'important');
                parent.style.setProperty('visibility', 'visible', 'important');
                parent.classList.remove('xl:hidden');
            }
            if (!logo.querySelector('.wdc-custom-logo')) {
                logo.innerHTML = '<span class="wdc-custom-logo">' + CUSTOM_LOGO_SVG + '</span>';
            }
        });
        // Replace BEM header logo
        document.querySelectorAll('[class*="MainMenuHeader--logoLink"]').forEach(el => {
            el.style.setProperty('display', 'flex', 'important');
            el.style.setProperty('align-items', 'center', 'important');
            if (!el.querySelector('.wdc-custom-logo')) {
                const wrapper = el.querySelector('[class*="Icon--iconWrapper"]');
                if (wrapper) {
                    wrapper.innerHTML = '<span class="wdc-custom-logo">' + CUSTOM_LOGO_SVG + '</span>';
                } else {
                    el.innerHTML = '<span class="wdc-custom-logo">' + CUSTOM_LOGO_SVG + '</span>';
                }
            }
        });
    }

    function cleanup() { nukeAds(document); nukePrem(document); fixInline(document); fixSearch(); fixLogo(); }

    function setupObserver() {
        let t;
        new MutationObserver(muts => {
            let d = false;
            for (const m of muts) for (const n of m.addedNodes) {
                if (n.nodeType !== 1) continue; d = true;
                if (opt('removeAds')) for (const s of AS) { try { if (n.matches?.(s)){nuke(n);break;} n.querySelectorAll?.(s).forEach(nuke); } catch {} }
                if (n.tagName==='IFRAME'&&isBlocked(n.src)) nuke(n);
                if (n.tagName==='SCRIPT'&&isBlocked(n.src)) nuke(n);
            }
            if (d) { clearTimeout(t); t = setTimeout(cleanup, 150); }
        }).observe(document.documentElement, { childList: true, subtree: true });
    }

    function watchDark() {
        new MutationObserver(() => {
            if (!document.documentElement.classList.contains('dark'))
                document.documentElement.classList.add('dark');
        }).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    }

    // =====================================================================
    //  SETTINGS PANEL
    // =====================================================================
    let pOpen = false;
    function buildPanel() {
        if (document.getElementById('wdc-ov')) return;
        const ov = document.createElement('div'); ov.id = 'wdc-ov';
        Object.assign(ov.style, { position:'fixed',inset:'0',background:'rgba(0,0,0,0.65)',backdropFilter:'blur(6px)',zIndex:'2100000',display:'flex',alignItems:'center',justifyContent:'center',opacity:'0',transition:'opacity 0.2s' });
        const p = document.createElement('div');
        Object.assign(p.style, { background:'#111824',color:C.fg,borderRadius:'16px',width:'460px',maxWidth:'92vw',maxHeight:'88vh',overflowY:'auto',boxShadow:'0 30px 80px rgba(0,0,0,0.9),0 0 0 1px '+C.border,fontFamily:'-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',transform:'scale(0.96)',transition:'transform 0.2s' });
        const hd = document.createElement('div');
        hd.style.cssText = 'padding:20px 24px 14px;border-bottom:1px solid '+C.border+';display:flex;align-items:center;justify-content:space-between;';
        hd.innerHTML = '<div><div style="font-size:17px;font-weight:700;letter-spacing:-0.3px;display:flex;align-items:center;gap:8px;"><span style="display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:8px;background:linear-gradient(135deg,'+C.accent+',#2a5ad0);"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round"><path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32l1.41 1.41M2 12h2m16 0h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/><circle cx="12" cy="12" r="5"/></svg></span>Weather.com Enhanced</div><div style="font-size:11px;color:#5f7494;margin-top:3px;padding-left:36px;">v6.0 - Custom Branding + Pro Polish</div></div>';
        const xb = document.createElement('button');
        xb.style.cssText = 'background:transparent;border:none;color:#5f7494;font-size:18px;cursor:pointer;padding:6px 10px;border-radius:8px;line-height:1;';
        xb.textContent = '\u2715'; xb.onmouseenter=()=>{xb.style.color=C.fg;xb.style.background=C.bgRaise}; xb.onmouseleave=()=>{xb.style.color='#5f7494';xb.style.background='transparent'}; xb.onclick=closeP;
        hd.appendChild(xb); p.appendChild(hd);
        const bd = document.createElement('div'); bd.style.padding = '6px 24px 20px';
        const groups = {};
        for (const f of FEATURES) (groups[f.group] = groups[f.group] || []).push(f);
        for (const [gn, items] of Object.entries(groups)) {
            const gl = document.createElement('div'); gl.style.cssText = 'font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:'+C.accent+';padding:14px 0 6px;'; gl.textContent = gn; bd.appendChild(gl);
            for (const f of items) {
                const row = document.createElement('label'); row.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:9px 12px;cursor:pointer;border-radius:8px;transition:background 0.12s;margin-bottom:1px;';
                row.onmouseenter=()=>row.style.background=C.bgRaise; row.onmouseleave=()=>row.style.background='transparent';
                const nm = document.createElement('span'); nm.textContent = f.name; nm.style.fontSize = '13.5px';
                const w = document.createElement('div'); w.style.cssText = 'position:relative;width:38px;height:20px;flex-shrink:0;margin-left:12px;';
                const cb = document.createElement('input'); cb.type='checkbox'; cb.checked=opt(f.key); cb.style.cssText='position:absolute;opacity:0;width:0;height:0;';
                const tr = document.createElement('div'), kn = document.createElement('div');
                function ren(){tr.style.cssText='position:absolute;inset:0;border-radius:10px;transition:background 0.15s;background:'+(cb.checked?C.accent:C.border)+';';kn.style.cssText='position:absolute;top:2px;left:'+(cb.checked?'20px':'2px')+';width:16px;height:16px;border-radius:50%;background:#fff;transition:left 0.15s;box-shadow:0 1px 3px rgba(0,0,0,0.3);';}ren();
                cb.addEventListener('change',()=>{setOpt(f.key,cb.checked);ren();if(f.css)cb.checked?injectCSS(f.key,f.css):removeCSS(f.key);cleanup();});
                w.append(cb,tr,kn); row.append(nm,w); bd.appendChild(row);
            }
        }
        // Location tabs management
        const locHd = document.createElement('div'); locHd.style.cssText = 'font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:'+C.accent+';padding:14px 0 6px;'; locHd.textContent = 'Location Tabs'; bd.appendChild(locHd);
        const locInfo = document.createElement('div'); locInfo.style.cssText = 'font-size:12px;color:'+C.fgDim+';padding:4px 12px;';
        const tabs = getLocationTabs();
        locInfo.textContent = tabs.length ? tabs.map(t => t.name).join(', ') : 'No custom location tabs. Use the + button in the header.';
        bd.appendChild(locInfo);
        if (tabs.length) {
            const clearBtn = document.createElement('button');
            clearBtn.style.cssText = 'margin:8px 12px;padding:6px 12px;border-radius:6px;border:1px solid '+C.border+';background:transparent;color:'+C.fgMute+';cursor:pointer;font-size:12px;';
            clearBtn.textContent = 'Clear All Location Tabs';
            clearBtn.onclick = () => { setLocationTabs([]); updateHeaderTabs(); locInfo.textContent = 'Cleared.'; clearBtn.remove(); };
            bd.appendChild(clearBtn);
        }

        const nt = document.createElement('div'); nt.style.cssText = 'font-size:11px;color:#3a4d6b;text-align:center;padding:14px 0 0;border-top:1px solid '+C.borderLt+';margin-top:10px;'; nt.textContent = 'Some changes may require a page refresh.';
        bd.appendChild(nt); p.appendChild(bd); ov.appendChild(p); document.body.appendChild(ov);
        requestAnimationFrame(()=>{ov.style.opacity='1';p.style.transform='scale(1)';});
        ov.addEventListener('click',e=>{if(e.target===ov)closeP();}); document.addEventListener('keydown',escH); pOpen=true;
    }
    function escH(e){if(e.key==='Escape')closeP();}
    function closeP(){const o=document.getElementById('wdc-ov');if(o){o.style.opacity='0';setTimeout(()=>o.remove(),200);}document.removeEventListener('keydown',escH);pOpen=false;}
    function toggleP(){pOpen?closeP():buildPanel();}

    // =====================================================================
    //  FAB + TOAST
    // =====================================================================
    function createFAB() {
        if (document.getElementById('wdc-fab')) return;
        const b = document.createElement('div'); b.id = 'wdc-fab';
        Object.assign(b.style, { position:'fixed',bottom:'20px',right:'20px',width:'42px',height:'42px',borderRadius:'12px',background:'linear-gradient(135deg,#111824,'+C.bgRaise+')',border:'1px solid '+C.border,cursor:'pointer',zIndex:'2099999',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 4px 16px rgba(0,0,0,0.5)',transition:'all 0.15s' });
        b.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="'+C.accent+'" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.32 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>';
        b.title = 'Weather.com Enhanced Settings';
        b.onmouseenter=()=>{b.style.transform='scale(1.1)';b.style.borderColor=C.accent;}; b.onmouseleave=()=>{b.style.transform='scale(1)';b.style.borderColor=C.border;};
        b.onclick = toggleP; document.body.appendChild(b);
    }
    function toast(msg) {
        const t = document.createElement('div');
        Object.assign(t.style, { position:'fixed',bottom:'72px',right:'20px',background:C.bgCard,color:C.fg,padding:'8px 16px',borderRadius:'10px',boxShadow:'0 4px 20px rgba(0,0,0,0.6)',border:'1px solid '+C.border,zIndex:'2100002',fontSize:'12.5px',fontFamily:'-apple-system,sans-serif',opacity:'0',transition:'opacity 0.15s',display:'flex',alignItems:'center',gap:'6px' });
        t.innerHTML = '<span style="color:'+C.accent+';">&#10003;</span> '+msg;
        document.body.appendChild(t); requestAnimationFrame(()=>t.style.opacity='1');
        setTimeout(()=>{t.style.opacity='0';setTimeout(()=>t.remove(),150);},2500);
    }

    // =====================================================================
    //  INIT
    // =====================================================================
    function init() {
        applyAllCSS();
        cleanup();
        setupObserver();
        watchDark();
        injectHeaderTabs();
        embedRadar();
        createFAB();
        toast('Weather.com Enhanced v6.0');
    }
    try { GM_registerMenuCommand('Settings', toggleP); } catch {}
    const _push = history.pushState;
    history.pushState = function() { _push.apply(this, arguments); setTimeout(()=>{applyAllCSS();cleanup();updateHeaderTabs();embedRadar();},250); };
    window.addEventListener('popstate', ()=>setTimeout(()=>{applyAllCSS();cleanup();updateHeaderTabs();embedRadar();},250));
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
    let sc = 0; const si = setInterval(()=>{cleanup();if(!document.getElementById('wdc-header-tabs'))injectHeaderTabs();if(isRadarPage()&&!document.getElementById('wdc-radar-frame'))embedRadar();if(++sc>=20)clearInterval(si);},500);
})();