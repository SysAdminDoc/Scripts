// ==UserScript==
// @name         Google Multi Search 
// @namespace    https://github.com/SysAdminDoc/Google-Multi-Search
// @version      8.1
// @description  Adds premium search page customization: professionally themed UI, full-width layout, advanced element hiding with granular controls, custom search engine shortcuts, and dynamic dropdown menus.
// @author       Matthew Parker
// @match        https://*.google.com/search?*
// @match        https://*.google.com/
// @exclude      *://*.google.com/calendar*
// @exclude      *://*.googleusercontent.com/maps.google.com/0
// @exclude      *://mail.google.com/*
// @exclude      *://news.google.com/*
// @exclude      *://*.googleusercontent.com/photos.google.com/1
// @exclude      https://webcache.googleusercontent.com/*
// @exclude      https://images.google.*/*
// @exclude      https://books.google.*/*
// @exclude      https://support.google.*/*
// @exclude      https://accounts.google.*/*
// @exclude      https://myaccount.google.*/*
// @exclude      https://aboutme.google.*/*
// @exclude      https://cse.google.*/*
// @exclude      https://www.google.com/cloudprint*
// @exclude      https://www.google.com/calendar*
// @exclude      https://www.google.com/intl/*/drive*
// @exclude      https://www.google.com/earth*
// @exclude      https://www.google.com/finance*
// @exclude      https://www.google.com/maps*
// @exclude      https://www.google.com/voice*
// @icon         https://raw.githubusercontent.com/SysAdminDoc/Google-Multi-Search/main/goog.ico
// @run-at       document-start
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @updateURL    https://github.com/SysAdminDoc/Google-Multi-Search/raw/refs/heads/main/Google%20Multi%20Search.js
// @downloadURL  https://github.com/SysAdminDoc/Google-Multi-Search/raw/refs/heads/main/Google%20Multi%20Search.js
// ==/UserScript==

(function() {
    'use strict';

    // --- Configuration ---
    const DEFAULT_SITES = [
        { name: 'Reddit', modifier: 'site:reddit.com', enabled: true },
        { name: 'YouTube', modifier: 'site:youtube.com', enabled: true },
        { name: 'GitHub', modifier: 'site:github.com', enabled: true }
    ];

    const REPLACEMENT_TOOLS = [
        { name: 'Images', setting: 'showCustomImages', urlTemplate: 'https://www.google.com/search?udm=2&q={{SEARCH TERM}}' },
        { name: 'News', setting: 'showCustomNews', urlTemplate: 'https://www.google.com/search?tbm=nws&q={{SEARCH TERM}}' },
        { name: 'Videos', setting: 'showCustomVideos', urlTemplate: 'https://www.google.com/search?udm=7&tbm=vid&q={{SEARCH TERM}}' }
    ];

    const DEFAULT_DROPDOWNS = [
        {
            title: 'Search',
            links: [
                { name: 'FilePursuit', url: 'https://filepursuit.com/' }, { name: 'WebOasis', url: 'https://weboas.is/' },
                { name: 'FileSearch', url: 'https://filesearch.link/' }, { name: 'IPFS Search', url: 'https://ipfs-search.com/' }
            ]
        },
        {
            title: 'Open Directory',
            links: [
                { name: 'ODCrawler', url: 'https://odcrawler.xyz/' }, { name: 'FileChef', url: 'https://www.filechef.com/' },
                { name: 'OpenDirSearch', url: 'https://opendirsearch.abifog.com/' }, { name: 'Palined', url: 'http://palined.com/search/' },
            ]
        },
        {
            title: 'Archives',
            links: [
                { name: 'The Eye', url: 'https://the-eye.eu/' }, { name: 'Archive.ph', url: 'http://archive.ph/' },
                { name: 'Internet Archive', url: 'https://archive.org/' }, { name: 'Wayback Machine', url: 'https://archive.org/web/' }
            ]
        }
    ];

    const DEFAULT_SETTINGS = {
        // Feature Toggles
        cleanURL: true,
        endlessGoogle: true,
        restoreFullURLs: true,
        useClassicFavicon: false,
        cleanupHomepage: true,
        useFullWidth: true,
        hideSidebar: true,

        // Theme & Style
        theme: 'dark', // 'dark', 'light'
        resultsWidth: 1200,
        highlightDate: true,
        searchBarTheme: 'default', // 'default', 'glow', 'strangerThings'
        searchBarWidth: 700,
        headerWidth: 900,
        searchBarFont: 'system-ui',
        changeVisitedLinks: true,

        // Element Hiding Toggles
        hideSponsoredResults: true,
        removeAI: true,
        hideRelatedSearches: true,
        hidePeopleAlsoSearchFor: true,
        hideVideoThumbnails: true,
        hideKeyMoments: true,
        hideTopAnswers: true,
        hideAppRatings: true,
        hide3DotMenu: true,
        hideBottomButtons: true,
        hideLabsButton: true,
        hideFooter: true,
        hideMoreResultsBar: true,
        hideDefaultTools: true,
        hideRelatedQuestions: true, // For the uBlock selector

        // Granular PAA hiding
        hidePAA_Container: true,
        hidePAA_Title: false,
        hidePAA_ImagesInAnswers: false,
        hidePAA_AIOverviewsInAnswers: false,
        hidePAA_ShowMoreButton: false,


        // New Custom Toolbar Links
        showCustomImages: true,
        showCustomNews: true,
        showCustomVideos: true,
    };

    // --- Early Execution (runs before the page loads) ---
    function executeEarly() {
        const earlySettings = JSON.parse(GM_getValue('gms_settings', JSON.stringify(DEFAULT_SETTINGS)));

        if (earlySettings.theme === 'dark') {
            document.documentElement.classList.add('gms-dark');
        }

        if (earlySettings.cleanupHomepage && window.location.pathname === '/') {
            GM_addStyle(`
                .c93Gbe, a:has-text(/Store/), a:has-text(/About/),
                a[aria-label="Search Labs"], div.bvUkz, .Y5MKCd.plR5qb, .olrp5b {
                    display: none !important;
                }
            `);
        }

        if (earlySettings.cleanURL && window.location.pathname === '/search') {
            const url = new URL(window.location.href);
            const paramsToRemove = ['ved', 'oq', 'gs_lcrp', 'sclient', 'source', 'ei', 'sa', 'aqs', 'sxsrf', 'uact', 'gs_lp', 'sourceid'];
            let paramsChanged = false;
            paramsToRemove.forEach(param => {
                if (url.searchParams.has(param)) {
                    url.searchParams.delete(param);
                    paramsChanged = true;
                }
            });
            if (paramsChanged) {
                window.history.replaceState({}, document.title, url.toString());
            }
        }
    }
    executeEarly();

    if (window.location.pathname !== '/search' || new URL(window.location.href).searchParams.get('tbm')) {
        return;
    }

    // --- Main Script ---
    let settings = {};
    let customSites = [];
    let customDropdowns = [];
    const DYNAMIC_STYLE_ID = 'gms-dynamic-styles';

    const ICONS = {
        cog: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.69-1.62-0.92L14.4,2.23c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.44,0.17-0.48,0.41L9.2,4.65c-0.59,0.23-1.12,0.54-1.62,0.92L5.19,4.61c-0.22-0.08-0.47,0-0.59,0.22L2.69,8.15 c-0.11,0.2-0.06,0.47,0.12,0.61l2.03,1.58C4.78,10.69,4.76,11,4.76,11.33c0,0.33,0.02,0.64,0.07,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.69,1.62,0.92L9.6,21.77 c0.04,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.44-0.17,0.48-0.41l0.41-2.42c0.59-0.23,1.12-0.54,1.62-0.92l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.11-0.2,0.06-0.47-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z"></path></svg>`,
        close: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"></path></svg>`,
        delete: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"></path></svg>`,
        add: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"></path></svg>`
    };

    // --- Modules ---
    const classicFavicon = {
        ICON_HREF: 'https://raw.githubusercontent.com/SysAdminDoc/Google-Multi-Search/main/goog.ico',
        observer: null,
        update() {
            if (!document.head) return;
            document.querySelectorAll('link[rel="icon"], link[rel="shortcut icon"]').forEach(l => {
                if (l.href !== this.ICON_HREF) l.remove();
            });
            if (!document.querySelector(`link[href="${this.ICON_HREF}"]`)) {
                const newLink = document.createElement('link');
                newLink.rel = 'icon';
                newLink.type = 'image/x-icon';
                newLink.href = this.ICON_HREF;
                document.head.appendChild(newLink);
            }
        },
        init() {
            if (this.observer) this.observer.disconnect();
            this.update();
            this.observer = new MutationObserver(() => this.update());
            this.observer.observe(document.head, { childList: true, subtree: true });
        }
    };

    const pageModifier = {
        observer: null,
        runModifications() {
            if (settings.restoreFullURLs) {
                document.querySelectorAll('#rso .g:not(.btr-processed), #rso .MjjYud:not(.btr-processed)').forEach(el => {
                    const linkEl = el.querySelector('a[href][data-ved]');
                    const citeEl = el.querySelector('cite');
                    if (linkEl && citeEl && !citeEl.textContent.startsWith('http')) {
                        citeEl.textContent = linkEl.href;
                    }
                    el.classList.add('btr-processed');
                });
            }
        },
        init() {
            this.runModifications();
            const rcnt = document.getElementById('rcnt');
            if (!rcnt) return;
            if (this.observer) this.observer.disconnect();
            this.observer = new MutationObserver(() => this.runModifications());
            this.observer.observe(rcnt, { childList: true, subtree: true });
        }
    };

    const endlessGoogle = {
        page: 1,
        loading: false,
        finished: false,
        container: null,
        onScroll() {
            if (this.loading || this.finished) return;
            if (window.scrollY > document.documentElement.scrollHeight - window.innerHeight * 1.5) {
                this.loadNextPage();
            }
        },
        async loadNextPage() {
            this.loading = true;
            this.page++;
            const nextUrl = new URL(location.href);
            nextUrl.searchParams.set('start', (this.page - 1) * 10);
            try {
                const response = await fetch(nextUrl.href);
                const text = await response.text();
                const doc = new DOMParser().parseFromString(text, 'text/html');
                const results = doc.getElementById('rso');
                if (!results || results.children.length === 0) {
                    this.finished = true;
                    window.removeEventListener('scroll', this.boundOnScroll);
                    return;
                }
                this.container.appendChild(results);
                pageModifier.runModifications();
            } catch (error) {
                console.error("GMS Error (Endless Google):", error);
                this.finished = true;
            } finally {
                this.loading = false;
            }
        },
        init() {
            this.container = document.getElementById('rso');
            if (!this.container) return;
            this.boundOnScroll = this.onScroll.bind(this);
            window.addEventListener('scroll', this.boundOnScroll, { passive: true });
        },
        disable() {
            if(this.boundOnScroll) window.removeEventListener('scroll', this.boundOnScroll);
        }
    };

    // --- Core UI & Style Functions ---

    function renderCustomTools() {
        try {
            const CONTAINER_ID = 'gms-custom-tools';
            const toolsMenu = document.querySelector('#hdtb-tls');
            if (!toolsMenu) return;

            const parentContainer = toolsMenu.parentNode;
            if (!parentContainer) return;

            document.getElementById(CONTAINER_ID)?.remove();

            const container = document.createElement('div');
            container.id = CONTAINER_ID;
            container.style.display = 'contents';

            const queryInput = document.querySelector('textarea[name="q"], input[name="q"]');
            const currentQuery = queryInput?.value || '';

            // Render Replacement Tools
            REPLACEMENT_TOOLS.forEach(tool => {
                if (settings[tool.setting] && currentQuery) {
                    const newHref = tool.urlTemplate.replace('{{SEARCH TERM}}', encodeURIComponent(currentQuery));
                    container.appendChild(createToolButton(tool.name, newHref));
                }
            });

            // Render Custom Search Buttons
            let baseQuery = currentQuery;
            if (currentQuery) {
                 customSites.forEach(site => {
                    const modifier = site.modifier.endsWith(' ') ? site.modifier : `${site.modifier} `;
                    if (baseQuery.toLowerCase().startsWith(modifier.toLowerCase())) {
                        baseQuery = baseQuery.substring(modifier.length);
                    }
                });
                customSites.forEach(site => {
                    if (site.enabled) {
                        const newHref = `/search?q=${encodeURIComponent(`${site.modifier} ${baseQuery}`)}`;
                        container.appendChild(createToolButton(site.name, newHref));
                    }
                });
            }

            // Render Dropdowns
            customDropdowns.forEach(dropdownData => {
                if (dropdownData.links?.length > 0) {
                    container.appendChild(createDropdownMenu(dropdownData));
                }
            });

            if (container.hasChildNodes()) {
                parentContainer.insertBefore(container, toolsMenu);
            }
        } catch (error) {
            console.error("GMS Error (renderCustomTools):", error);
        }
    }

    function createToolButton(name, href) {
        const wrapper = document.createElement('div');
        wrapper.className = 'YmvwI';
        wrapper.setAttribute('role', 'listitem');
        const link = document.createElement('a');
        link.href = href;
        link.className = 'LatpMc nPDzT T3FoJb';
        const text = document.createElement('div');
        text.textContent = name;
        text.className = 'Y35s6d';
        link.appendChild(text);
        wrapper.appendChild(link);
        return wrapper;
    }

    function createDropdownMenu(dropdownData) {
        const dropdownWrapper = document.createElement('div');
        dropdownWrapper.className = 'YmvwI gms-dropdown';
        dropdownWrapper.setAttribute('role', 'listitem');

        const dropdownToggle = document.createElement('div');
        dropdownToggle.className = 'LatpMc nPDzT T3FoJb';
        dropdownToggle.style.cursor = 'pointer';

        const dropdownToggleText = document.createElement('div');
        dropdownToggleText.textContent = dropdownData.title;
        dropdownToggleText.className = 'Y35s6d';
        dropdownToggle.appendChild(dropdownToggleText);

        const dropdownMenu = document.createElement('div');
        dropdownMenu.className = 'gms-dropdown-menu';

        dropdownData.links.forEach(link => {
            const item = document.createElement('a');
            item.className = 'gms-dropdown-item';
            item.href = link.url;
            item.textContent = link.name;
            item.target = '_blank';
            item.rel = 'noopener noreferrer';
            dropdownMenu.appendChild(item);
        });

        dropdownWrapper.appendChild(dropdownToggle);
        dropdownWrapper.appendChild(dropdownMenu);
        return dropdownWrapper;
    }

    function updateDynamicStyles(s = settings) {
        const styleEl = document.getElementById(DYNAMIC_STYLE_ID);
        if (!styleEl) return;

        let styles = '';
        const PAA_SELECTOR = `div[jscontroller="SC7lYd"]`; // A relatively stable controller for the PAA block.
        const dictionaryExclusion = `:not(:has([data-attrid="DictionaryHeader"]))`;

        // --- Page Element Hiding ---
        if (s.hideDefaultTools) styles += '.O1uzAe.beZ0tf { display: none !important; }';
        if (s.hideSponsoredResults) styles += '#tads, #taw, #bottomads, #tadsb, div[data-text-ad], div[aria-label="Ads"], div[aria-label="Sponsored"] { display: none !important; }';
        if (s.removeAI) styles += `#aib, .Lz5Cpe.Jz62f, .dRYYxd, div[jsname="txosbe"], .bzXtMb.M8OgIe.dRpWwb, block-component[type="web-answers-container"]${dictionaryExclusion} { display: none !important; }`;
        if (s.hideVideoThumbnails) styles += '.rIRoqf, .ITCGwe, .GfA8Hd, div[data-vido] { display: none !important; }';
        if (s.hideBottomButtons) styles += 'li.KTAFWb, .X5OiLe { display: none !important; }';
        if (s.hideAppRatings) styles += '.uo4vr, .R1i63b { display: none !important; }';
        if (s.hideLabsButton) styles += '.gb_I.gb_0.gb_dd { display: none !important; }';
        if (s.hideFooter) styles += '#sfooter, #footcnt { display: none !important; }';
        if (s.hidePeopleAlsoSearchFor) styles += 'div.ULSxyf { display: none !important; }';
        if (s.hideRelatedSearches) styles += '#botstuff > div:has(> div[role="heading"][aria-level="3"]), #related-search-payload { display: none !important; }';
        if (s.hide3DotMenu) styles += '.L48a4c, .eFM0qc { display: none !important; }';
        if (s.hideKeyMoments) styles += '[data-header-feature="KEY_MOMENTS"] { display: none !important; }';
        if (s.hideTopAnswers) styles += `.yaX1fe${dictionaryExclusion} { display: none !important; }`;
        if (s.highlightDate) styles += 'span.YrbPuc, span.MUxGbd.wuQ4Ob.WZ8Tjf, .LEsW5e { background-color: #c00 !important; color: #fff !important; padding: 2px 4px; border-radius: 4px; }';
        if (s.hideMoreResultsBar) styles += '.d86Vh { display: none !important; }';
        if (s.hideSidebar) styles += '#rhs { display: none !important; }';
        if (s.hideRelatedQuestions) styles += '.qzPQNd.yWNJXb.qB9BY.JI5uCe.xfX4Ac { display: none !important; }';

        // Granular PAA Hiding
        if (s.hidePAA_Container) styles += `${PAA_SELECTOR} { display: none !important; }`;
        if (s.hidePAA_Title) styles += `${PAA_SELECTOR} .sz3HNePJI6ge { display: none !important; }`;
        if (s.hidePAA_ImagesInAnswers) styles += `${PAA_SELECTOR} .iKjSFe { display: none !important; }`;
        if (s.hidePAA_AIOverviewsInAnswers) styles += `${PAA_SELECTOR} .nk9vdc:has(> .FzsovccwYVJeRJPOee) { display: none !important; }`;
        if (s.hidePAA_ShowMoreButton) styles += `${PAA_SELECTOR} .biJ8pb { display: none !important; }`;


        // --- Theme and Style ---
        styles += `#cnt { max-width: ${s.resultsWidth}px !important; }`;
        if (s.searchBarTheme === 'glow') styles += `.RNNXgb { box-shadow: 0 0 12px 2px rgba(70, 130, 180, 0.7) !important; border: 1px solid rgba(70, 130, 180, 0.5) !important; }`;
        if (s.searchBarTheme === 'strangerThings') styles += `.RNNXgb { background-color: #111 !important; border: 2px solid #e50914 !important; box-shadow: 0 0 10px #e50914, inset 0 0 5px #e50914 !important; }`;
        if (s.changeVisitedLinks) styles += '#search a > h3 { color: var(--gms-link-color) !important; } #search a:visited > h3 { color: var(--gms-link-visited-color) !important; } cite, cite a:link, cite a:visited { color: var(--gms-cite-color) !important; }';
        if (s.useFullWidth) styles += '#center_col { margin-left: 20px !important; } .s6JM6d #center_col { margin-left: 0 !important; }';
        styles += `.RNNXgb { max-width: ${s.searchBarWidth}px !important; }`;
        styles += `.sfbg { max-width: ${s.headerWidth}px !important; }`;
        if (s.searchBarFont) styles += `form[role="search"] textarea { font-family: ${s.searchBarFont}, monospace !important; }`;

        styleEl.textContent = styles;
    }

    function injectStyles() {
        if (document.getElementById(DYNAMIC_STYLE_ID)) return;
        document.head.insertAdjacentHTML('beforeend', `<style id="${DYNAMIC_STYLE_ID}"></style>`);
        GM_addStyle(`
            /* --- Themes --- */
            :root {
                --gms-bg: #ffffff; --gms-bg-panel: #f8f9fa; --gms-bg-alt: #f1f3f4; --gms-text: #202124; --gms-text-muted: #5f6368;
                --gms-border: #dadce0; --gms-border-light: #e0e0e0; --gms-accent: #1a73e8; --gms-accent-text: #ffffff;
                --gms-danger: #d93025; --gms-danger-text: #ffffff; --gms-success: #1e8e3e; --gms-success-text: #ffffff;
                --gms-link-color: #1a0dab; --gms-link-visited-color: #681da8; --gms-cite-color: #006621;
                --shadow-sm: 0 1px 2px 0 rgba(0,0,0,0.05); --shadow-md: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06);
            }
            html.gms-dark {
                --gms-bg: #202124; --gms-bg-panel: #292a2d; --gms-bg-alt: #303134; --gms-text: #e8eaed; --gms-text-muted: #969ba1;
                --gms-border: #3c4043; --gms-border-light: #44484c; --gms-accent: #8ab4f8; --gms-accent-text: #202124;
                --gms-link-color: #8ab4f8; --gms-link-visited-color: #c58af9; --gms-cite-color: #bdc1c6;
            }

            /* --- Settings Panel --- */
            #gms-settings-cog { cursor: pointer; background: transparent; border: none; padding: 8px; border-radius: 50%; display: grid; place-items: center; margin: 0 8px; color: var(--gms-text-muted); }
            #gms-settings-cog:hover { background-color: var(--gms-bg-alt); color: var(--gms-text); }
            #gms-settings-cog svg { width: 24px; height: 24px; }

            #gms-settings-overlay { position: fixed; inset: 0; z-index: 99999; background: rgba(0,0,0,0.6); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; opacity: 0; transition: opacity 0.2s ease; }
            #gms-settings-overlay.visible { opacity: 1; }
            #settings-panel { background: var(--gms-bg-panel); color: var(--gms-text); width: 95%; max-width: 900px; height: 90vh; border-radius: 12px; box-shadow: var(--shadow-md); display: flex; flex-direction: column; border: 1px solid var(--gms-border); transform: scale(0.95); transition: transform 0.2s ease; }
            #gms-settings-overlay.visible #settings-panel { transform: scale(1); }
            .settings-header { padding: 16px 24px; border-bottom: 1px solid var(--gms-border); display: flex; justify-content: space-between; align-items: center; flex-shrink: 0; }
            .settings-header h2 { margin: 0; font-size: 1.2rem; font-weight: 600; }
            .settings-title-group { display: flex; align-items: center; gap: 12px; }
            .settings-header .close-button { background: none; border: none; cursor: pointer; color: var(--gms-text-muted); padding: 4px; border-radius: 50%; display: grid; place-items: center; }
            .settings-header .close-button:hover { background: var(--gms-bg-alt); color: var(--gms-text); }
            .settings-header .close-button svg { width: 24px; height: 24px; }

            .settings-content { display: flex; flex-grow: 1; overflow: hidden; }
            .settings-tabs { list-style: none; margin: 0; padding: 16px 8px; border-right: 1px solid var(--gms-border); flex-shrink: 0; }
            .settings-tab { padding: 10px 16px; margin: 4px 0; border-radius: 6px; cursor: pointer; font-weight: 500; color: var(--gms-text-muted); user-select: none; }
            .settings-tab:hover { background: var(--gms-bg-alt); color: var(--gms-text); }
            .settings-tab.active { background: var(--gms-accent); color: var(--gms-accent-text); font-weight: 600; }

            .settings-body { flex-grow: 1; padding: 24px; overflow-y: auto; }
            .settings-pane { display: none; }
            .settings-pane.active { display: block; }
            .settings-section { margin-bottom: 24px; }
            .settings-section h3, .settings-section h4 { margin-top: 0; margin-bottom: 16px; padding-bottom: 8px; border-bottom: 1px solid var(--gms-border-light); font-size: 1.1rem; font-weight: 600; }
            .settings-section h4 { margin-bottom: 12px; border: none; font-size: 1rem; font-weight: 600; color: var(--gms-text); }
            .settings-subsection { padding: 12px; border: 1px solid var(--gms-border-light); border-radius: 8px; margin-top: 16px; }

            .settings-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 12px; }
            .settings-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; padding: 8px 4px; }
            .settings-toggle { display: flex; justify-content: space-between; align-items: center; padding: 8px 4px; border-radius: 6px; transition: background-color 0.2s; }
            .settings-toggle:hover { background-color: var(--gms-bg-alt); }
            .settings-toggle[data-disabled="true"] { opacity: 0.5; pointer-events: none; }
            .settings-toggle[data-disabled="true"]:hover { background-color: transparent; }

            .settings-footer { padding: 16px 24px; border-top: 1px solid var(--gms-border); text-align: right; display: flex; justify-content: flex-end; align-items: center; gap: 12px; flex-shrink: 0; }
            .settings-button { background: var(--gms-bg-alt); color: var(--gms-text); border: 1px solid var(--gms-border); font-size: 0.9rem; padding: 8px 16px; border-radius: 8px; cursor: pointer; transition: all 0.2s; font-weight: 600; }
            .settings-button:hover { border-color: var(--gms-text-muted); }
            #save-settings { background-color: var(--gms-success); color: var(--gms-success-text); border-color: var(--gms-success); }
            #save-settings:hover { opacity: 0.9; }

            /* --- Form Controls --- */
            .toggle-switch { position: relative; display: inline-block; width: 44px; height: 24px; flex-shrink: 0; }
            .toggle-switch input { opacity: 0; width: 0; height: 0; }
            .slider { position: absolute; cursor: pointer; inset: 0; background-color: var(--gms-bg-alt); transition: .4s; border-radius: 24px; border: 1px solid var(--gms-border); }
            .slider:before { position: absolute; content: ""; height: 16px; width: 16px; left: 3px; bottom: 3px; background-color: var(--gms-text-muted); transition: .4s; border-radius: 50%; }
            input:checked + .slider { background-color: var(--gms-accent); border-color: var(--gms-accent); }
            input:checked + .slider:before { background-color: var(--gms-accent-text); transform: translateX(20px); }

            input[type="range"] { flex-grow: 1; margin-left: 15px; accent-color: var(--gms-accent); }
            input[type="text"], select { width: 100%; padding: 8px 12px; background-color: var(--gms-bg-alt); border: 1px solid var(--gms-border); border-radius: 6px; color: var(--gms-text); transition: all 0.2s; }
            input[type="text"]:focus, select:focus { border-color: var(--gms-accent); box-shadow: 0 0 0 2px color-mix(in srgb, var(--gms-accent) 25%, transparent); }

            /* --- Custom Items Editor --- */
            .custom-item-list { display: flex; flex-direction: column; gap: 12px; margin-bottom: 16px; }
            .custom-item { background: var(--gms-bg); padding: 12px; border: 1px solid var(--gms-border); border-radius: 8px; }
            .custom-item-header { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
            .custom-item-header .drag-handle { cursor: grab; color: var(--gms-text-muted); }
            .custom-item-header input { flex-grow: 1; font-weight: bold; }
            .custom-item-controls { display: flex; gap: 8px; }
            .icon-button { background: transparent; border: none; border-radius: 50%; width: 32px; height: 32px; display: grid; place-items: center; cursor: pointer; color: var(--gms-text-muted); }
            .icon-button:hover { background: var(--gms-bg-alt); color: var(--gms-text); }
            .icon-button.delete-button:hover { background: color-mix(in srgb, var(--gms-danger) 15%, transparent); color: var(--gms-danger); }
            .icon-button svg { width: 20px; height: 20px; }

            .custom-item-grid { display: grid; grid-template-columns: auto 1fr 2fr auto; gap: 10px; align-items: center; }
            .custom-item-grid.link-item { grid-template-columns: 1fr 2fr auto; }

            .add-button { display: inline-flex; align-items: center; gap: 6px; }
            .confirm-delete-button { background-color: var(--gms-danger); color: var(--gms-danger-text); border-color: var(--gms-danger); }

            /* --- Injected UI --- */
            #gms-custom-tools .LatpMc { border: 1px solid var(--gms-border); border-radius: 18px; margin: 0 4px; transition: background-color 0.15s; text-decoration: none !important; display: inline-flex; align-items: center; height: 36px; box-sizing: border-box; background-color: var(--gms-bg-alt); }
            #gms-custom-tools .LatpMc:hover { background-color: var(--gms-border); }
            .YmvwI.gms-dropdown { position: relative; }
            .gms-dropdown-menu { display: none; position: absolute; top: calc(100% + 5px); left: 0; z-index: 1000; background-color: var(--gms-bg-panel); border: 1px solid var(--gms-border); border-radius: 12px; box-shadow: var(--shadow-md); min-width: 220px; padding: 8px 0; animation: fadeIn 0.1s ease-out; }
            @keyframes fadeIn { from { opacity: 0; transform: translateY(-5px); } to { opacity: 1; transform: translateY(0); } }
            .YmvwI.gms-dropdown:hover .gms-dropdown-menu { display: block; }
            .gms-dropdown-item { display: block; padding: 8px 16px; color: var(--gms-text); text-decoration: none; font-size: 14px; white-space: nowrap; }
            .gms-dropdown-item:hover { background-color: var(--gms-bg-alt); }

            /* --- Toast Notification --- */
            #gms-toast { position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); background-color: #323232; color: white; padding: 12px 24px; border-radius: 8px; z-index: 100000; font-size: 1rem; opacity: 0; transition: opacity 0.3s, bottom 0.3s; pointer-events: none; }
            #gms-toast.show { opacity: 1; bottom: 40px; }
        `);
    }

    function showToast(message) {
        let toast = document.getElementById('gms-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'gms-toast';
            document.body.appendChild(toast);
        }
        toast.textContent = message;
        toast.classList.add('show');
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }


    // --- Initialization ---
    async function init() {
        const savedSettings = JSON.parse(await GM_getValue('gms_settings', '{}'));
        // Migrate old setting to new granular one
        if (savedSettings.hasOwnProperty('hidePeopleAlsoAsk')) {
            savedSettings.hidePAA_Container = savedSettings.hidePeopleAlsoAsk;
            delete savedSettings.hidePeopleAlsoAsk;
        }
        settings = { ...DEFAULT_SETTINGS, ...savedSettings };

        const savedSites = await GM_getValue('gms_search_sites', null);
        customSites = savedSites ? JSON.parse(savedSites) : DEFAULT_SITES;
        const savedDropdowns = await GM_getValue('gms_dropdown_links', null);
        customDropdowns = savedDropdowns ? JSON.parse(savedDropdowns) : DEFAULT_DROPDOWNS;

        // Apply theme immediately
        if (settings.theme === 'dark') document.documentElement.classList.add('gms-dark');
        else document.documentElement.classList.remove('gms-dark');

        new MutationObserver((_, obs) => {
            const rso = document.getElementById('rso');
            if (rso) {
                injectStyles();
                updateDynamicStyles();

                if (settings.endlessGoogle) endlessGoogle.init(); else endlessGoogle.disable();
                if (settings.restoreFullURLs) pageModifier.init();
                if (settings.useClassicFavicon && document.head) classicFavicon.init();

                obs.disconnect();
            }
        }).observe(document.documentElement, { childList: true, subtree: true });

        new MutationObserver(() => {
            const headerActions = document.querySelector('#gbwa');
            if (headerActions && !document.getElementById('gms-settings-cog')) {
                const cog = document.createElement('button');
                cog.id = 'gms-settings-cog';
                cog.title = 'Configure Multi Search (GMS)';
                cog.innerHTML = ICONS.cog;
                cog.addEventListener('click', showSettingsPanel);
                headerActions.insertAdjacentElement('beforebegin', cog);
            }

            const toolsAnchor = document.querySelector('#hdtb-tls');
            if (toolsAnchor && !document.getElementById('gms-custom-tools')) {
                renderCustomTools();
            }

        }).observe(document.documentElement, { childList: true, subtree: true });
    }

    function showSettingsPanel() {
        const panelBuilder = new SettingsPanelBuilder();
        panelBuilder.show();
    }


    class SettingsPanelBuilder {
        constructor() {
            this.tempSites = JSON.parse(JSON.stringify(customSites));
            this.tempDropdowns = JSON.parse(JSON.stringify(customDropdowns));
            this.tempSettings = JSON.parse(JSON.stringify(settings));
        }

        show() {
            document.getElementById('gms-settings-overlay')?.remove();
            const generalHideToggles = Object.keys(DEFAULT_SETTINGS)
                .filter(k => (k.startsWith('hide') || k.startsWith('remove')) && !k.startsWith('hidePAA_'))
                .map(key => {
                    const label = key.replace(/([A-Z])/g, ' $1').replace(/^hide|^remove/i, '').trim();
                    return this.createToggle(`setting-${key}`, `Hide ${label}`, this.tempSettings[key]);
                }).join('');

            const overlay = document.createElement('div');
            overlay.id = 'gms-settings-overlay';
            overlay.innerHTML = `
                <div id="settings-panel">
                    <div class="settings-header">
                        <div class="settings-title-group">
                            ${ICONS.cog}
                            <h2>Multi Search Settings</h2>
                        </div>
                        <button class="close-button" title="Close">${ICONS.close}</button>
                    </div>
                    <div class="settings-content">
                        <ul class="settings-tabs">
                           <li class="settings-tab active" data-tab="general">General</li>
                           <li class="settings-tab" data-tab="appearance">Appearance</li>
                           <li class="settings-tab" data-tab="elements">Elements</li>
                           <li class="settings-tab" data-tab="searches">Custom Searches</li>
                           <li class="settings-tab" data-tab="dropdowns">Dropdowns</li>
                        </ul>
                        <div class="settings-body">
                           <div class="settings-pane active" data-pane="general">
                                <div class="settings-section">
                                    <h3>Core Features</h3>
                                    ${this.createToggle('setting-cleanURL', 'Clean URLs (Removes Trackers)', this.tempSettings.cleanURL)}
                                    ${this.createToggle('setting-endlessGoogle', 'Enable Endless Scrolling', this.tempSettings.endlessGoogle)}
                                    ${this.createToggle('setting-restoreFullURLs', 'Restore Full URLs Under Results', this.tempSettings.restoreFullURLs)}
                                    ${this.createToggle('setting-cleanupHomepage', 'Cleanup Google Homepage', this.tempSettings.cleanupHomepage)}
                                </div>
                                <div class="settings-section">
                                    <h3>Toolbar Links</h3>
                                    ${this.createToggle('setting-hideDefaultTools', "Hide Google's Default Tools", this.tempSettings.hideDefaultTools)}
                                    ${this.createToggle('setting-showCustomImages', "Show Custom 'Images' Link", this.tempSettings.showCustomImages)}
                                    ${this.createToggle('setting-showCustomNews', "Show Custom 'News' Link", this.tempSettings.showCustomNews)}
                                    ${this.createToggle('setting-showCustomVideos', "Show Custom 'Videos' Link", this.tempSettings.showCustomVideos)}
                                </div>
                           </div>
                           <div class="settings-pane" data-pane="appearance">
                               <div class="settings-section">
                                   <h3>Theme</h3>
                                    ${this.createToggle('setting-theme', 'Enable Dark Mode', this.tempSettings.theme === 'dark')}
                               </div>
                               <div class="settings-section">
                                    <h3>Layout & Sizing</h3>
                                    ${this.createToggle('setting-useFullWidth', 'Use Full Width Layout', this.tempSettings.useFullWidth)}
                                    <div class="settings-row"><label for="setting-resultsWidth">Results Width: <span id="width-value">${this.tempSettings.resultsWidth}px</span></label><input type="range" id="setting-resultsWidth" min="652" max="2000" step="4" value="${this.tempSettings.resultsWidth}"></div>
                                    <div class="settings-row"><label for="setting-headerWidth">Search Header Width: <span id="width-value-header">${this.tempSettings.headerWidth}px</span></label><input type="range" id="setting-headerWidth" min="500" max="1200" step="10" value="${this.tempSettings.headerWidth}"></div>
                                    <div class="settings-row"><label for="setting-searchBarWidth">Search Input Width: <span id="width-value-searchbar">${this.tempSettings.searchBarWidth}px</span></label><input type="range" id="setting-searchBarWidth" min="400" max="1100" step="10" value="${this.tempSettings.searchBarWidth}"></div>
                               </div>
                                <div class="settings-section">
                                   <h3>Style</h3>
                                    <div class="settings-row"><label for="setting-searchBarFont">Search Bar Font:</label><select id="setting-searchBarFont" name="searchBarFont"><option value="system-ui">System Default</option><option value="monospace">Monospace</option><option value="Arial">Arial</option><option value="Verdana">Verdana</option></select></div>
                                    <div class="settings-row"><h4>Search Bar Theme</h4><div class="radio-group">${this.createRadioGroup('searchBarTheme', ['default', 'glow', 'strangerThings'], this.tempSettings.searchBarTheme)}</div></div>
                                    ${this.createToggle('setting-highlightDate', 'Highlight Result Date', this.tempSettings.highlightDate)}
                                    ${this.createToggle('setting-changeVisitedLinks', 'Change Visited Link Color', this.tempSettings.changeVisitedLinks)}
                                    ${this.createToggle('setting-useClassicFavicon', 'Use Classic Favicon', this.tempSettings.useClassicFavicon)}
                               </div>
                           </div>
                           <div class="settings-pane" data-pane="elements">
                                <div class="settings-section">
                                    <h3>General Elements</h3>
                                    <div class="settings-grid">${generalHideToggles}</div>
                                </div>
                                <div class="settings-section">
                                    <h3>People Also Ask</h3>
                                    <div id="paa-settings-container">
                                        ${this.createToggle('setting-hidePAA_Container', 'Hide "People Also Ask" Block', this.tempSettings.hidePAA_Container)}
                                        <div class="settings-subsection" id="paa-sub-settings">
                                            ${this.createToggle('setting-hidePAA_Title', 'Hide Title Only', this.tempSettings.hidePAA_Title)}
                                            ${this.createToggle('setting-hidePAA_ImagesInAnswers', 'Hide Images in Answers', this.tempSettings.hidePAA_ImagesInAnswers)}
                                            ${this.createToggle('setting-hidePAA_AIOverviewsInAnswers', 'Hide AI Overviews in Answers', this.tempSettings.hidePAA_AIOverviewsInAnswers)}
                                            ${this.createToggle('setting-hidePAA_ShowMoreButton', 'Hide "Show More" Button', this.tempSettings.hidePAA_ShowMoreButton)}
                                        </div>
                                    </div>
                                </div>
                           </div>
                           <div class="settings-pane" data-pane="searches">
                                <div class="settings-section">
                                    <h3>Custom Search Buttons</h3>
                                    <div id="custom-sites-list" class="custom-item-list"></div>
                                    <button id="add-site-button" class="settings-button add-button">${ICONS.add} Add New Site</button>
                                </div>
                           </div>
                           <div class="settings-pane" data-pane="dropdowns">
                               <div class="settings-section">
                                   <h3>Custom Dropdown Menus</h3>
                                   <div id="custom-dropdowns-list" class="custom-item-list"></div>
                                   <button id="add-dropdown-button" class="settings-button add-button">${ICONS.add} Add New Dropdown</button>
                               </div>
                           </div>
                        </div>
                    </div>
                    <div class="settings-footer">
                        <button id="save-settings" class="settings-button">Save & Reload</button>
                    </div>
                </div>`;
            document.body.appendChild(overlay);
            document.getElementById('setting-searchBarFont').value = this.tempSettings.searchBarFont;

            this.renderSitesInPanel();
            this.renderDropdownsInPanel();
            this.attachEventListeners();

            setTimeout(() => overlay.classList.add('visible'), 10);
        }

        createToggle(id, label, isChecked, isDisabled = false) {
            return `
                <div class="settings-toggle" data-disabled="${isDisabled}">
                    <label for="${id}">${label}</label>
                    <label class="toggle-switch">
                        <input type="checkbox" id="${id}" ${isChecked ? 'checked' : ''} ${isDisabled ? 'disabled' : ''}>
                        <span class="slider"></span>
                    </label>
                </div>`;
        }

        createRadioGroup(name, values, selectedValue) {
             return values.map(v => `<label><input type="radio" name="${name}" value="${v}" ${v === selectedValue ? 'checked' : ''}> ${v.charAt(0).toUpperCase() + v.slice(1)}</label>`).join('');
        }

        renderSitesInPanel() {
            const container = document.getElementById('custom-sites-list');
            container.innerHTML = this.tempSites.map((site, index) => `
                <div class="custom-item" data-index="${index}">
                    <div class="custom-item-grid">
                        <label class="toggle-switch"><input type="checkbox" class="site-enabled" ${site.enabled ? 'checked' : ''}><span class="slider"></span></label>
                        <input type="text" class="site-name" placeholder="Name (e.g., Reddit)" value="${site.name || ''}" title="Button display name">
                        <input type="text" class="site-modifier" placeholder="Modifier (e.g., site:reddit.com)" value="${site.modifier || ''}" title="Google search modifier">
                        <button class="icon-button delete-button delete-site-button" title="Delete Site">${ICONS.delete}</button>
                    </div>
                </div>`).join('');
        }

        renderDropdownsInPanel() {
            const container = document.getElementById('custom-dropdowns-list');
            container.innerHTML = this.tempDropdowns.map((dropdown, dIndex) => `
                 <div class="custom-item" data-dropdown-index="${dIndex}">
                    <div class="custom-item-header">
                        <input type="text" class="dropdown-title" placeholder="Dropdown Title" value="${dropdown.title || ''}">
                        <div class="custom-item-controls">
                            <button class="icon-button add-link-button" title="Add Link">${ICONS.add}</button>
                            <button class="icon-button delete-button delete-dropdown-button" title="Delete Dropdown">${ICONS.delete}</button>
                        </div>
                    </div>
                    <div class="dropdown-links-list">
                        ${(dropdown.links || []).map((link, lIndex) => `
                            <div class="link-item custom-item-grid" data-link-index="${lIndex}">
                                <input type="text" class="link-name" placeholder="Link Name" value="${link.name || ''}">
                                <input type="text" class="link-url" placeholder="URL" value="${link.url || ''}">
                                <button class="icon-button delete-button delete-link-button" title="Delete Link">${ICONS.delete}</button>
                            </div>`).join('')}
                    </div>
                 </div>`).join('');
        }

        updatePAASubSettingsState(isDisabled) {
            const container = document.getElementById('paa-sub-settings');
            container.querySelectorAll('input[type="checkbox"]').forEach(input => input.disabled = isDisabled);
            container.querySelectorAll('.settings-toggle').forEach(toggle => toggle.dataset.disabled = isDisabled);
        }

        attachEventListeners() {
            const overlay = document.getElementById('gms-settings-overlay');
            const panel = document.getElementById('settings-panel');
            if (!overlay || !panel) return;

            const closePanel = () => {
                overlay.classList.remove('visible');
                setTimeout(() => {
                    overlay.remove();
                    updateDynamicStyles(settings); // Revert to saved styles
                }, 200);
            };

            overlay.addEventListener('click', e => { if (e.target === overlay) closePanel(); });
            panel.querySelector('.close-button').addEventListener('click', closePanel);

            panel.querySelector('.settings-tabs').addEventListener('click', e => {
                if(e.target.matches('.settings-tab')) {
                    panel.querySelector('.settings-tab.active').classList.remove('active');
                    panel.querySelector('.settings-pane.active').classList.remove('active');
                    e.target.classList.add('active');
                    panel.querySelector(`.settings-pane[data-pane="${e.target.dataset.tab}"]`).classList.add('active');
                }
            });

            const mainPAAToggle = document.getElementById('setting-hidePAA_Container');
            this.updatePAASubSettingsState(mainPAAToggle.checked);
            mainPAAToggle.addEventListener('change', (e) => this.updatePAASubSettingsState(e.target.checked));

            panel.addEventListener('input', e => {
                const liveSettings = {...this.tempSettings};
                panel.querySelectorAll('input[id^="setting-"], select[id^="setting-"]').forEach(input => {
                    const key = input.id.replace('setting-', '');
                    if (DEFAULT_SETTINGS.hasOwnProperty(key)) {
                        if(input.type === 'checkbox') liveSettings[key] = input.checked;
                        else if (key === 'theme') liveSettings[key] = input.checked ? 'dark' : 'light';
                        else liveSettings[key] = isNaN(input.value) ? input.value : Number(input.value);
                    }
                });
                const themeRadio = panel.querySelector('input[name="searchBarTheme"]:checked');
                if(themeRadio) liveSettings.searchBarTheme = themeRadio.value;

                if(e.target.id === 'setting-resultsWidth') panel.querySelector('#width-value').textContent = `${e.target.value}px`;
                if(e.target.id === 'setting-headerWidth') panel.querySelector('#width-value-header').textContent = `${e.target.value}px`;
                if(e.target.id === 'setting-searchBarWidth') panel.querySelector('#width-value-searchbar').textContent = `${e.target.value}px`;
                if(e.target.id === 'setting-theme') document.documentElement.classList.toggle('gms-dark', e.target.checked);

                updateDynamicStyles(liveSettings);
            });


            const sitesList = document.getElementById('custom-sites-list');
            document.getElementById('add-site-button').addEventListener('click', () => { this.tempSites.push({ name: '', modifier: '', enabled: true }); this.renderSitesInPanel(); });
            sitesList.addEventListener('input', e => {
                const item = e.target.closest('.custom-item');
                if(!item) return;
                const i = item.dataset.index;
                if(e.target.classList.contains('site-name')) this.tempSites[i].name = e.target.value;
                if(e.target.classList.contains('site-modifier')) this.tempSites[i].modifier = e.target.value;
                if(e.target.classList.contains('site-enabled')) this.tempSites[i].enabled = e.target.checked;
            });
            sitesList.addEventListener('click', e => {
                 const button = e.target.closest('.delete-site-button');
                 if(button){
                    const i = button.closest('.custom-item').dataset.index;
                    this.tempSites.splice(i, 1);
                    this.renderSitesInPanel();
                 }
            });

            const dropdownsList = document.getElementById('custom-dropdowns-list');
            document.getElementById('add-dropdown-button').addEventListener('click', () => { this.tempDropdowns.push({ title: 'New Dropdown', links: []}); this.renderDropdownsInPanel(); });
            dropdownsList.addEventListener('input', e => {
                const dItem = e.target.closest('.custom-item');
                if(!dItem) return;
                const dIndex = dItem.dataset.dropdownIndex;
                if(e.target.classList.contains('dropdown-title')) this.tempDropdowns[dIndex].title = e.target.value;
                const lItem = e.target.closest('.link-item');
                if(lItem) {
                    const lIndex = lItem.dataset.linkIndex;
                    if(e.target.classList.contains('link-name')) this.tempDropdowns[dIndex].links[lIndex].name = e.target.value;
                    if(e.target.classList.contains('link-url')) this.tempDropdowns[dIndex].links[lIndex].url = e.target.value;
                }
            });
             dropdownsList.addEventListener('click', e => {
                const dItem = e.target.closest('.custom-item');
                if(!dItem) return;
                const dIndex = dItem.dataset.dropdownIndex;
                 if (e.target.closest('.delete-dropdown-button')) {
                    this.tempDropdowns.splice(dIndex, 1);
                    this.renderDropdownsInPanel();
                 } else if (e.target.closest('.add-link-button')) {
                    if(!this.tempDropdowns[dIndex].links) this.tempDropdowns[dIndex].links = [];
                    this.tempDropdowns[dIndex].links.push({ name: '', url: '' });
                    this.renderDropdownsInPanel();
                 } else if (e.target.closest('.delete-link-button')) {
                    const lIndex = e.target.closest('.link-item').dataset.linkIndex;
                    this.tempDropdowns[dIndex].links.splice(lIndex, 1);
                    this.renderDropdownsInPanel();
                 }
            });

            document.getElementById('save-settings').addEventListener('click', () => {
                const newSettings = {};
                panel.querySelectorAll('input[id^="setting-"]').forEach(i => {
                    const key = i.id.replace('setting-', '');
                     if (DEFAULT_SETTINGS.hasOwnProperty(key)) {
                        newSettings[key] = i.type === 'checkbox' ? i.checked : (isNaN(i.value) ? i.value : Number(i.value));
                    }
                });
                newSettings.theme = panel.querySelector('#setting-theme').checked ? 'dark' : 'light';
                newSettings.searchBarFont = panel.querySelector('#setting-searchBarFont').value;
                const themeRadio = panel.querySelector('input[name="searchBarTheme"]:checked');
                if(themeRadio) newSettings.searchBarTheme = themeRadio.value;

                GM_setValue('gms_settings', JSON.stringify(newSettings));
                GM_setValue('gms_search_sites', JSON.stringify(this.tempSites.filter(s => s.name && s.modifier)));
                GM_setValue('gms_dropdown_links', JSON.stringify(this.tempDropdowns.filter(d => d.title && d.links?.every(l => l.name && l.url))));

                showToast('Settings saved. Reloading...');
                setTimeout(() => location.reload(), 1000);
            });
        }
    }


    init();

})();
