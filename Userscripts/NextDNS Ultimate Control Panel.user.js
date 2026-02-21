// ==UserScript==
// @name         NextDNS Ultimate Control Panel
// @namespace    https://github.com/SysAdminDoc
// @version      3.2.0
// @description  Enhanced control panel for NextDNS with condensed view, quick actions, keyboard shortcuts, and consistent UI state across pages.
// @author       Matt Parker, with community patches
// @match        https://my.nextdns.io/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=nextdns.io
// @connect      api.nextdns.io
// @connect      raw.githubusercontent.com
// @grant        GM_addStyle
// @grant        GM.setValue
// @grant        GM.getValue
// @grant        GM.deleteValue
// @grant        GM_xmlhttpRequest
// @license      MIT
// ==/UserScript==

const storage = {
  get: async (keys) => {
    const results = {};
    const keysToFetch = Array.isArray(keys) ? keys : Object.keys(keys);
    const defaults = Array.isArray(keys) ? {} : keys;
    for (const key of keysToFetch) {
      results[key] = await GM.getValue(key, defaults[key]);
    }
    return results;
  },
  set: (items) => {
    const promises = Object.entries(items).map(([key, value]) => GM.setValue(key, value));
    return Promise.all(promises);
  },
  remove: (keys) => {
    const keysToRemove = Array.isArray(keys) ? keys : [keys];
    const promises = keysToRemove.map(key => GM.deleteValue(key));
    return Promise.all(promises);
  }
};

function addGlobalStyle(css) {
    GM_addStyle(css);
}

(function() {
    'use strict';

    // --- CONFIGURATION & STORAGE KEYS ---
    let NDNS_API_KEY = null;
    let globalProfileId = null;
    const KEY_PREFIX = 'ndns_';
    const KEY_POSITION_TOP = `${KEY_PREFIX}panel_position_top_v2`;
    const KEY_POSITION_SIDE = `${KEY_PREFIX}panel_position_side_v2`;
    const KEY_FILTER_STATE = `${KEY_PREFIX}filter_state_v2`;
    const KEY_HIDDEN_DOMAINS = `${KEY_PREFIX}hidden_domains_v2`;
    const KEY_LOCK_STATE = `${KEY_PREFIX}lock_state_v1`;
    const KEY_THEME = `${KEY_PREFIX}theme_v1`;
    const KEY_WIDTH = `${KEY_PREFIX}panel_width_v1`;
    const KEY_API_KEY = `${KEY_PREFIX}api_key`;
    const KEY_PROFILE_ID = `${KEY_PREFIX}profile_id_v1`;
    const KEY_DOMAIN_ACTIONS = `${KEY_PREFIX}domain_actions_v1`;
    const KEY_LIST_PAGE_THEME = `${KEY_PREFIX}list_page_theme_v1`;
    const KEY_HAGEZI_ADDED_TLDS = `${KEY_PREFIX}hagezi_added_tlds_v1`;
    const KEY_HAGEZI_ADDED_ALLOWLIST = `${KEY_PREFIX}hagezi_added_allowlist_v1`;
    // NEW KEYS for v2.0
    const KEY_ULTRA_CONDENSED = `${KEY_PREFIX}ultra_condensed_v1`;
    const KEY_SHORTCUTS_ENABLED = `${KEY_PREFIX}shortcuts_enabled_v1`;
    const KEY_CUSTOM_CSS_ENABLED = `${KEY_PREFIX}custom_css_enabled_v1`;
    const KEY_HIDE_HEADER = `${KEY_PREFIX}hide_header_v1`;
    // NEW KEYS for v2.5 (NDNS features)
    const KEY_DOMAIN_DESCRIPTIONS = `${KEY_PREFIX}domain_descriptions_v1`;
    const KEY_LIST_SORT_AZ = `${KEY_PREFIX}list_sort_az_v1`;
    const KEY_LIST_SORT_TLD = `${KEY_PREFIX}list_sort_tld_v1`;
    const KEY_LIST_BOLD_ROOT = `${KEY_PREFIX}list_bold_root_v1`;
    const KEY_LIST_LIGHTEN_SUB = `${KEY_PREFIX}list_lighten_sub_v1`;
    const KEY_LIST_RIGHT_ALIGN = `${KEY_PREFIX}list_right_align_v1`;
    const KEY_MULTI_DOMAIN_INPUT = `${KEY_PREFIX}multi_domain_input_v1`;
    const KEY_SHOW_LOG_COUNTERS = `${KEY_PREFIX}show_log_counters_v1`;
    const KEY_COLLAPSE_BLOCKLISTS = `${KEY_PREFIX}collapse_blocklists_v1`;
    const KEY_COLLAPSE_TLDS = `${KEY_PREFIX}collapse_tlds_v1`;

    // --- HAGEZI CONFIG ---
    const HAGEZI_TLDS_URL = "https://raw.githubusercontent.com/hagezi/dns-blocklists/main/adblock/spam-tlds-adblock-aggressive.txt";
    const HAGEZI_ALLOWLIST_URL = "https://raw.githubusercontent.com/hagezi/dns-blocklists/main/adblock/spam-tlds-adblock-allow.txt";

    // --- GLOBAL STATE ---
    let panel, lockButton, settingsModal, togglePosButton, settingsButton;
    let leftHeaderControls, rightHeaderControls;
    let isManuallyLocked = false;
    let filters = {};
    let hiddenDomains = new Set();
    let domainActions = {};
    let autoRefreshInterval = null;
    let currentTheme = 'dark';
    let panelWidth = 240;
    let isPreloadingCancelled = false;
    let enableListPageTheme = true;
    let listPageThemeStyleElement = null;
    // NEW STATE for v2.0
    let isUltraCondensed = true;
    let shortcutsEnabled = true;
    let customCssEnabled = true;
    let ultraCondensedStyleElement = null;
    let hideHeader = false;
    let hideHeaderStyleElement = null;
    // NEW STATE for v2.5 (NDNS features)
    let domainDescriptions = {};
    let listSortAZ = false;
    let listSortTLD = false;
    let listBoldRoot = true;
    let listLightenSub = true;
    let listRightAlign = false;
    let multiDomainInput = true;
    let showLogCounters = true;
    let collapseBlocklists = false;
    let collapseTLDs = false;
    // SLDs for proper root domain detection
    const SLDs = ["co", "com", "org", "edu", "gov", "mil", "net", "ac", "or", "ne", "go"];

    // --- SVG ICON BUILDER ---
    function buildSvgIcon(pathData, viewBox = '0 0 24 24') {
        const svgNS = 'http://www.w3.org/2000/svg';
        const svg = document.createElementNS(svgNS, 'svg');
        svg.setAttribute('width', '18');
        svg.setAttribute('height', '18');
        svg.setAttribute('fill', 'currentColor');
        svg.setAttribute('viewBox', viewBox);
        const path = document.createElementNS(svgNS, 'path');
        path.setAttribute('d', pathData);
        svg.appendChild(path);
        return svg;
    }

    const icons = {
        unlocked: buildSvgIcon("M12 2C9.24 2 7 4.24 7 7v3H6c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2v-8c0-1.1-.9-2-2-2h-1V7c0-2.76-2.24-5-5-5zm3 5V7c0-1.66-1.34-3-3-3S9 5.34 9 7h2c0-.55.45-1 1-1s1 .45 1 1v2h-4v8h12v-8h-5z"),
        locked: buildSvgIcon("M12 2C9.24 2 7 4.24 7 7v3H6c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2v-8c0-1.1-.9-2-2-2h-1V7c0-2.76-2.24-5-5-5zm0 2c1.66 0 3 1.34 3 3v3H9V7c0-1.66 1.34-3 3-3z"),
        arrowLeft: buildSvgIcon("M15 19l-7-7 7-7"),
        arrowRight: buildSvgIcon("M9 5l7 7-7 7"),
        settings: buildSvgIcon("M3 17v2h6v-2H3zM3 5v2h10V5H3zm10 16v-2h8v-2h-8v-2h-2v6h2zM7 9v2H3v2h4v2h2V9H7zm14 4v-2H11v2h10zm-6-4h2V7h4V5h-4V3h-2v6z"),
        eye: buildSvgIcon("M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5C21.27 7.61 17 4.5 12 4.5zm0 12c-2.48 0-4.5-2.02-4.5-4.5S9.52 7.5 12 7.5s4.5 2.02 4.5 4.5-2.02 4.5-4.5 4.5zm0-7C10.62 9.5 9.5 10.62 9.5 12s1.12 2.5 2.5 2.5 2.5-1.12 2.5-2.5S13.38 9.5 12 9.5z"),
        eyeSlash: buildSvgIcon("M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75C21.27 7.11 17 4.5 12 4.5c-1.6 0-3.14.35-4.6.98l2.1 2.1C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"),
        remove: buildSvgIcon("M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"),
        github: buildSvgIcon("M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.207 11.387.6.11.82-.26.82-.577 0-.285-.01-1.04-.015-2.04-3.338.725-4.042-1.61-4.042-1.61-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.085 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.108-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.93 0-1.31.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222 0 1.606-.015 2.898-.015 3.291 0 .319.217.694.824.576C20.565 21.795 24 17.295 24 12 24 5.37 18.63 0 12 0z"),
        // New icons for v2.0
        download: buildSvgIcon("M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"),
        trash: buildSvgIcon("M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"),
        refresh: buildSvgIcon("M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"),
        star: buildSvgIcon("M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"),
        starOutline: buildSvgIcon("M22 9.24l-7.19-.62L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.63-7.03L22 9.24zM12 15.4l-3.76 2.27 1-4.28-3.32-2.88 4.38-.38L12 6.1l1.71 4.04 4.38.38-3.32 2.88 1 4.28L12 15.4z"),
        keyboard: buildSvgIcon("M20 5H4c-1.1 0-1.99.9-1.99 2L2 17c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm-9 3h2v2h-2V8zm0 3h2v2h-2v-2zM8 8h2v2H8V8zm0 3h2v2H8v-2zm-1 2H5v-2h2v2zm0-3H5V8h2v2zm9 7H8v-2h8v2zm0-4h-2v-2h2v2zm0-3h-2V8h2v2zm3 3h-2v-2h2v2zm0-3h-2V8h2v2z"),
        compress: buildSvgIcon("M4 14h4v4h2v-6H4v2zm4-4H4v2h6V6H8v4zm8 8h-2v-6h6v2h-4v4zm-2-12v4h4V6h2v6h-6V6h2z"),
        expand: buildSvgIcon("M21 11V3h-8l3.29 3.29-10 10L3 13v8h8l-3.29-3.29 10-10z"),
        chart: buildSvgIcon("M3.5 18.49l6-6.01 4 4L22 6.92l-1.41-1.41-7.09 7.97-4-4L2 16.99z"),
        copy: buildSvgIcon("M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"),
        link: buildSvgIcon("M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z"),
        filter: buildSvgIcon("M10 18h4v-2h-4v2zM3 6v2h18V6H3zm3 7h12v-2H6v2z"),
        clock: buildSvgIcon("M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"),
        shield: buildSvgIcon("M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"),
        zap: buildSvgIcon("M7 2v11h3v9l7-12h-4l4-8z"),
        menu: buildSvgIcon("M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"),
        chevronDown: buildSvgIcon("M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"),
        chevronUp: buildSvgIcon("M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6 1.41 1.41z"),
        close: buildSvgIcon("M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z")
    };

    // --- INJECTED CSS ---
    addGlobalStyle(`
        :root, html[data-ndns-theme="dark"] {
            --panel-bg: rgba(22, 22, 26, 0.95);
            --panel-bg-solid: #16161a;
            --panel-text: #fffffe;
            --panel-text-secondary: #94a1b2;
            --panel-header-bg: rgba(32, 32, 38, 0.98);
            --panel-border: rgba(148, 161, 178, 0.1);
            --btn-bg: rgba(148, 161, 178, 0.1);
            --btn-hover-bg: rgba(148, 161, 178, 0.2);
            --btn-border: rgba(148, 161, 178, 0.15);
            --btn-active-bg: linear-gradient(135deg, #7f5af0 0%, #6246ea 100%);
            --scrollbar-track: rgba(148, 161, 178, 0.05);
            --scrollbar-thumb: rgba(148, 161, 178, 0.2);
            --handle-color: #7f5af0;
            --input-bg: rgba(148, 161, 178, 0.08);
            --input-text: #fffffe;
            --input-border: rgba(148, 161, 178, 0.15);
            --input-focus: #7f5af0;
            --success-color: #2cb67d;
            --danger-color: #e53170;
            --info-color: #7f5af0;
            --warning-color: #ffc857;
            --section-bg: rgba(148, 161, 178, 0.05);
            --accent-color: #7f5af0;
            --accent-secondary: #2cb67d;
            --card-shadow: 0 4px 24px rgba(0, 0, 0, 0.3);
            --glow-color: rgba(127, 90, 240, 0.15);
        }
        html[data-ndns-theme="light"] {
            --panel-bg: rgba(255, 255, 255, 0.95);
            --panel-bg-solid: #ffffff;
            --panel-text: #16161a;
            --panel-text-secondary: #555b6e;
            --panel-header-bg: rgba(248, 249, 252, 0.98);
            --panel-border: rgba(22, 22, 26, 0.08);
            --btn-bg: rgba(22, 22, 26, 0.05);
            --btn-hover-bg: rgba(22, 22, 26, 0.1);
            --btn-border: rgba(22, 22, 26, 0.1);
            --btn-active-bg: linear-gradient(135deg, #6246ea 0%, #7f5af0 100%);
            --scrollbar-track: rgba(22, 22, 26, 0.03);
            --scrollbar-thumb: rgba(22, 22, 26, 0.15);
            --input-bg: rgba(22, 22, 26, 0.04);
            --input-text: #16161a;
            --input-border: rgba(22, 22, 26, 0.12);
            --input-focus: #6246ea;
            --section-bg: rgba(22, 22, 26, 0.03);
            --accent-color: #6246ea;
            --accent-secondary: #1f9d5c;
            --card-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);
            --glow-color: rgba(98, 70, 234, 0.1);
        }
        html[data-ndns-theme="darkblue"] {
            --panel-bg: rgba(25, 32, 40, 0.95);
            --panel-bg-solid: #192028;
            --panel-text: #e8f1ff;
            --panel-text-secondary: #7a8a9a;
            --panel-header-bg: rgba(31, 40, 51, 0.98);
            --panel-border: rgba(90, 155, 207, 0.12);
            --btn-bg: rgba(90, 155, 207, 0.1);
            --btn-hover-bg: rgba(90, 155, 207, 0.18);
            --btn-border: rgba(90, 155, 207, 0.15);
            --btn-active-bg: linear-gradient(135deg, #5a9bcf 0%, #4a8bbf 100%);
            --scrollbar-track: rgba(90, 155, 207, 0.05);
            --scrollbar-thumb: rgba(90, 155, 207, 0.2);
            --handle-color: #5a9bcf;
            --input-bg: rgba(90, 155, 207, 0.08);
            --input-text: #e8f1ff;
            --input-border: rgba(90, 155, 207, 0.15);
            --input-focus: #5a9bcf;
            --success-color: #41b883;
            --danger-color: #e06c75;
            --info-color: #61afef;
            --warning-color: #e5c07b;
            --section-bg: rgba(90, 155, 207, 0.05);
            --accent-color: #5a9bcf;
            --accent-secondary: #41b883;
            --card-shadow: 0 4px 24px rgba(0, 0, 0, 0.4);
            --glow-color: rgba(90, 155, 207, 0.12);
        }

        /* Dark Blue Theme - Full Page Styles */
        html[data-ndns-theme="darkblue"] body {
            background-color: #192028 !important;
            color: #b8c5d6 !important;
        }
        html[data-ndns-theme="darkblue"] .Header {
            background-color: #192028 !important;
            border-bottom-color: #2d3a4a !important;
        }
        html[data-ndns-theme="darkblue"] .Header img {
            filter: brightness(0) invert(1);
        }
        html[data-ndns-theme="darkblue"] .nav {
            background: #1f2833 !important;
            border: none !important;
        }
        html[data-ndns-theme="darkblue"] .nav .nav-link {
            color: #b8c5d6 !important;
        }
        html[data-ndns-theme="darkblue"] .nav .nav-link.active {
            background-color: transparent !important;
            border-bottom-color: #5a9bcf !important;
        }
        html[data-ndns-theme="darkblue"] .card,
        html[data-ndns-theme="darkblue"] .list-group-item {
            background-color: #1f2833 !important;
            color: #b8c5d6 !important;
            border-color: #2d3a4a !important;
        }
        html[data-ndns-theme="darkblue"] .list-group-item:hover {
            background-color: #243040 !important;
        }
        html[data-ndns-theme="darkblue"] .btn-primary {
            background-color: #5a9bcf !important;
            border-color: #5a9bcf !important;
            color: #192028 !important;
        }
        html[data-ndns-theme="darkblue"] .btn-light {
            background-color: #243040 !important;
            color: #b8c5d6 !important;
            border-color: #3d4a5a !important;
        }
        html[data-ndns-theme="darkblue"] .form-control,
        html[data-ndns-theme="darkblue"] .custom-select,
        html[data-ndns-theme="darkblue"] .form-select {
            background-color: #1f2833 !important;
            color: #b8c5d6 !important;
            border-color: #3d4a5a !important;
        }
        html[data-ndns-theme="darkblue"] .modal-content {
            background-color: #1f2833 !important;
        }
        html[data-ndns-theme="darkblue"] .modal-header {
            background-color: #243040 !important;
            border-bottom-color: #3d4a5a !important;
        }
        html[data-ndns-theme="darkblue"] .dropdown-menu {
            background-color: #243040 !important;
            border-color: #3d4a5a !important;
        }
        html[data-ndns-theme="darkblue"] .dropdown-item {
            color: #b8c5d6 !important;
        }
        html[data-ndns-theme="darkblue"] .dropdown-item:hover {
            background-color: #2d3a4a !important;
        }
        html[data-ndns-theme="darkblue"] a {
            color: #61afef !important;
        }
        html[data-ndns-theme="darkblue"] a:hover {
            color: #8ac7f4 !important;
        }
        html[data-ndns-theme="darkblue"] .text-muted {
            color: #7a8a9a !important;
        }
        html[data-ndns-theme="darkblue"] .settings-button path,
        html[data-ndns-theme="darkblue"] .stream-button path {
            fill: #b8c5d6 !important;
        }

        /* Log Entry Row Coloring Based on Status */
        .Logs .log.list-group-item.ndns-row-blocked {
            background-color: rgba(113, 14, 14, 0.35) !important;
        }
        .Logs .log.list-group-item.ndns-row-allowed {
            background-color: rgba(14, 113, 35, 0.35) !important;
        }
        /* Dark Blue Theme - Log Entry Row Coloring */
        html[data-ndns-theme="darkblue"] .Logs .log.list-group-item.ndns-row-blocked {
            background-color: rgba(224, 108, 117, 0.2) !important;
        }
        html[data-ndns-theme="darkblue"] .Logs .log.list-group-item.ndns-row-allowed {
            background-color: rgba(65, 184, 131, 0.2) !important;
        }
        /* Light Theme - Log Entry Row Coloring */
        html[data-ndns-theme="light"] .Logs .log.list-group-item.ndns-row-blocked {
            background-color: rgba(220, 53, 69, 0.15) !important;
        }
        html[data-ndns-theme="light"] .Logs .log.list-group-item.ndns-row-allowed {
            background-color: rgba(40, 167, 69, 0.15) !important;
        }

        /* ============================================
           MODERN PANEL DESIGN
           ============================================ */

        .ndns-panel {
            position: fixed;
            z-index: 9999;
            background: var(--panel-bg);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            color: var(--panel-text);
            border-radius: 16px;
            box-shadow: var(--card-shadow), 0 0 0 1px var(--panel-border);
            user-select: none;
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            box-sizing: border-box;
            transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.3s ease;
            font-size: 13px;
            overflow: hidden;
        }
        .ndns-panel:hover {
            box-shadow: var(--card-shadow), 0 0 40px var(--glow-color), 0 0 0 1px var(--panel-border);
        }
        .ndns-panel.left-side {
            left: 0;
            border-left: none;
            border-right: 4px solid var(--handle-color);
            transform: translateX(calc(-100% + 4px));
            border-radius: 0 16px 16px 0;
        }
        .ndns-panel.right-side {
            right: 0;
            border-right: none;
            border-left: 4px solid var(--handle-color);
            transform: translateX(calc(100% - 4px));
            border-radius: 16px 0 0 16px;
        }
        .ndns-panel.visible { transform: translateX(0); }
        div.ndns-panel.right-side.visible, div.ndns-panel.left-side.visible { margin: 0; padding: 0; }

        /* Panel Header */
        .ndns-panel-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 12px 14px;
            cursor: move;
            background: var(--panel-header-bg);
            border-bottom: 1px solid var(--panel-border);
        }
        .ndns-header-title {
            font-size: 14px;
            font-weight: 700;
            letter-spacing: 0.5px;
            background: linear-gradient(135deg, var(--accent-color) 0%, var(--accent-secondary) 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }
        .ndns-panel.left-side .ndns-panel-header { border-top-right-radius: 16px; }
        .ndns-panel.right-side .ndns-panel-header { border-top-left-radius: 16px; }

        .panel-header-controls { display: flex; align-items: center; gap: 4px; }
        .panel-header-controls button, .panel-header-controls a {
            background: var(--btn-bg);
            border: none;
            color: var(--panel-text-secondary);
            cursor: pointer;
            padding: 6px;
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s ease;
        }
        .panel-header-controls button:hover, .panel-header-controls a:hover {
            background: var(--btn-hover-bg);
            color: var(--panel-text);
            transform: translateY(-1px);
        }
        .panel-header-controls svg { pointer-events: none; width: 16px; height: 16px; }

        /* Panel Content */
        div.ndns-panel-content {
            padding: 8px;
            margin: 0;
            display: flex;
            flex-direction: column;
            gap: 6px;
            max-height: calc(100vh - 120px);
            overflow-y: auto;
            overflow-x: hidden;
        }
        .ndns-panel-content::-webkit-scrollbar { width: 5px; }
        .ndns-panel-content::-webkit-scrollbar-track { background: transparent; }
        .ndns-panel-content::-webkit-scrollbar-thumb {
            background: var(--scrollbar-thumb);
            border-radius: 10px;
        }
        .ndns-panel-content::-webkit-scrollbar-thumb:hover {
            background: var(--panel-text-secondary);
        }

        /* Panel Footer */
        .ndns-panel-footer {
            padding: 10px 14px;
            background: var(--panel-header-bg);
            border-top: 1px solid var(--panel-border);
            text-align: center;
            font-size: 10px;
            color: var(--panel-text-secondary);
            letter-spacing: 0.3px;
        }
        .ndns-panel.left-side .ndns-panel-footer { border-bottom-right-radius: 16px; }
        .ndns-panel.right-side .ndns-panel-footer { border-bottom-left-radius: 16px; }

        /* ============================================
           MODERN BUTTON STYLES
           ============================================ */

        button.ndns-panel-button {
            background: var(--btn-bg);
            color: var(--panel-text);
            border: 1px solid var(--btn-border);
            border-radius: 10px;
            padding: 8px 12px;
            margin: 0;
            font-size: 12px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
            text-align: center;
            width: 100%;
            box-sizing: border-box;
            position: relative;
            overflow: hidden;
        }
        .ndns-panel-button::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: linear-gradient(135deg, transparent 0%, rgba(255,255,255,0.05) 100%);
            opacity: 0;
            transition: opacity 0.2s ease;
        }
        .ndns-panel-button:hover::before { opacity: 1; }
        .ndns-panel-button:disabled { cursor: not-allowed; opacity: 0.4; }
        .ndns-panel-button:hover:not(:disabled) {
            background: var(--btn-hover-bg);
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        .ndns-panel-button:active:not(:disabled) {
            transform: translateY(0);
        }
        .ndns-panel-button.active {
            background: var(--btn-active-bg);
            color: white;
            border-color: transparent;
            box-shadow: 0 4px 16px rgba(127, 90, 240, 0.3);
        }
        .ndns-panel-button.danger {
            background: linear-gradient(135deg, var(--danger-color) 0%, #c42860 100%);
            color: white;
            border-color: transparent;
        }
        .ndns-panel-button.danger:hover { box-shadow: 0 4px 16px rgba(229, 49, 112, 0.3); }
        .ndns-panel-button.warning {
            background: linear-gradient(135deg, var(--warning-color) 0%, #e6b32a 100%);
            color: #16161a;
            border-color: transparent;
        }
        .ndns-panel-button.info {
            background: linear-gradient(135deg, var(--info-color) 0%, #6246ea 100%);
            color: white;
            border-color: transparent;
        }

        /* Small Buttons */
        .ndns-btn-sm {
            padding: 6px 10px;
            font-size: 11px;
            border-radius: 8px;
        }
        .ndns-btn-icon {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 32px;
            height: 32px;
            padding: 0;
            border-radius: 10px;
        }
        .ndns-btn-icon svg { width: 14px; height: 14px; }

        /* Button Groups */
        .ndns-btn-group { display: flex; gap: 6px; }
        .ndns-btn-group-vertical { display: flex; flex-direction: column; gap: 6px; }
        .ndns-btn-row { display: flex; gap: 6px; }
        .ndns-btn-row > * { flex: 1; }

        /* Section Styles */
        .ndns-section {
            display: flex;
            flex-direction: column;
            gap: 6px;
            padding: 10px;
            background: var(--section-bg);
            border-radius: 12px;
            border: 1px solid var(--panel-border);
        }
        .ndns-section-content { display: flex; flex-direction: column; gap: 6px; }

        /* Quick Actions Bar */
        .ndns-quick-actions {
            display: flex;
            gap: 8px;
            padding: 8px;
            background: var(--section-bg);
            border-radius: 12px;
            border: 1px solid var(--panel-border);
            flex-wrap: wrap;
        }
        button.ndns-quick-action-btn {
            flex: 1;
            min-width: 60px;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 6px;
            padding: 12px 8px;
            margin: 0;
            background: var(--btn-bg);
            border: 1px solid var(--btn-border);
            border-radius: 12px;
            cursor: pointer;
            transition: all 0.2s ease;
            color: var(--panel-text);
            font-size: 11px;
            font-weight: 600;
            text-align: center;
            white-space: nowrap;
        }
        .ndns-quick-action-btn:hover {
            background: var(--btn-hover-bg);
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        .ndns-quick-action-btn svg { width: 22px; height: 22px; opacity: 0.8; }
        .ndns-quick-action-btn:hover svg { opacity: 1; }
        .ndns-quick-action-btn.download svg { color: var(--info-color); }
        .ndns-quick-action-btn.clear svg { color: var(--danger-color); }
        button.ndns-quick-action-btn.active { display: none; }

        /* Stats Display */
        .ndns-stats-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px 12px;
            font-size: 11px;
            background: var(--section-bg);
            border-radius: 10px;
            border: 1px solid var(--panel-border);
        }
        .ndns-stats-label {
            color: var(--panel-text-secondary);
            font-weight: 500;
        }
        .ndns-stats-value {
            font-weight: 700;
            font-family: 'SF Mono', 'Fira Code', monospace;
        }
        .ndns-stats-value.blocked { color: var(--danger-color); }
        .ndns-stats-value.allowed { color: var(--success-color); }

        /* Dividers */
        .ndns-divider {
            height: 1px;
            background: linear-gradient(90deg, transparent 0%, var(--panel-border) 50%, transparent 100%);
            margin: 4px 0;
        }

        /* Collapsible Sections */
        .ndns-collapsible-section summary {
            cursor: pointer;
            font-weight: 600;
            color: var(--panel-text-secondary);
            font-size: 11px;
            padding: 6px 0;
            list-style: none;
            transition: color 0.2s ease;
        }
        .ndns-collapsible-section summary:hover { color: var(--panel-text); }
        .ndns-collapsible-section summary::-webkit-details-marker { display: none; }
        .ndns-collapsible-section-content {
            display: flex;
            flex-direction: column;
            gap: 8px;
            padding: 10px 0 4px 0;
        }

        /* Toggle Switches - Modern */
        .ndns-toggle-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 6px 0;
            font-size: 12px;
        }
        .ndns-toggle-row label {
            cursor: pointer;
            flex: 1;
            color: var(--panel-text);
            font-weight: 500;
        }
        .ndns-toggle-switch {
            position: relative;
            width: 40px;
            height: 22px;
            background: var(--btn-bg);
            border-radius: 11px;
            cursor: pointer;
            transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
            border: 1px solid var(--btn-border);
        }
        .ndns-toggle-switch.active {
            background: linear-gradient(135deg, var(--success-color) 0%, #1f9d5c 100%);
            border-color: transparent;
        }
        .ndns-toggle-switch::after {
            content: '';
            position: absolute;
            top: 2px;
            left: 2px;
            width: 16px;
            height: 16px;
            background: white;
            border-radius: 50%;
            transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
        .ndns-toggle-switch.active::after { transform: translateX(18px); }

        /* Input Styles - Modern */
        .ndns-input {
            width: 100%;
            padding: 10px 14px;
            background: var(--input-bg);
            color: var(--input-text);
            border: 1px solid var(--input-border);
            border-radius: 10px;
            font-size: 13px;
            box-sizing: border-box;
            transition: all 0.2s ease;
        }
        .ndns-input:focus {
            outline: none;
            border-color: var(--input-focus);
            box-shadow: 0 0 0 3px var(--glow-color);
        }
        .ndns-input::placeholder {
            color: var(--panel-text-secondary);
        }

        /* Recent Domains List */
        .ndns-recent-domains {
            max-height: 120px;
            overflow-y: auto;
            font-size: 11px;
            border-radius: 10px;
            border: 1px solid var(--panel-border);
        }
        .ndns-recent-domain-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px 12px;
            border-bottom: 1px solid var(--panel-border);
            transition: background 0.15s ease;
        }
        .ndns-recent-domain-item:last-child { border-bottom: none; }
        .ndns-recent-domain-item:hover { background: var(--btn-hover-bg); }
        .ndns-recent-domain-name {
            flex: 1;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            font-family: 'SF Mono', 'Fira Code', monospace;
            font-size: 11px;
        }
        .ndns-recent-domain-actions { display: flex; gap: 4px; }
        .ndns-recent-domain-actions button {
            background: none;
            border: none;
            padding: 4px;
            cursor: pointer;
            color: var(--panel-text-secondary);
            border-radius: 6px;
            transition: all 0.15s ease;
        }
        .ndns-recent-domain-actions button:hover {
            color: var(--panel-text);
            background: var(--btn-bg);
        }

        /* Keyboard Shortcuts Hint */
        .ndns-kbd {
            display: inline-block;
            padding: 2px 6px;
            background: var(--btn-bg);
            border: 1px solid var(--btn-border);
            border-radius: 6px;
            font-family: 'SF Mono', 'Fira Code', monospace;
            font-size: 10px;
            font-weight: 600;
        }

        /* Toast Notifications - Modern */
        .ndns-toast-countdown {
            position: fixed;
            bottom: 24px;
            right: 24px;
            padding: 14px 20px;
            border-radius: 12px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.3);
            z-index: 20000;
            transform: translateY(100px);
            opacity: 0;
            transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
            font-size: 13px;
            font-weight: 500;
            max-width: 380px;
            backdrop-filter: blur(10px);
        }

        /* Preload Container */
        .preload-container { display: flex; gap: 6px; }
        .preload-container select {
            flex-grow: 1;
            background: var(--input-bg);
            color: var(--input-text);
            border: 1px solid var(--input-border);
            border-radius: 10px;
            font-size: 12px;
            padding: 8px 12px;
        }
        .preload-container button {
            background: var(--btn-active-bg);
            color: white;
            border-radius: 10px;
        }
        .danger-button {
            background: linear-gradient(135deg, var(--danger-color) 0%, #c42860 100%) !important;
            color: white !important;
            border-color: transparent !important;
        }

        /* ============================================
           MODERN SETTINGS MODAL
           ============================================ */

        .ndns-settings-modal-overlay {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.6);
            backdrop-filter: blur(8px);
            -webkit-backdrop-filter: blur(8px);
            z-index: 10000;
            justify-content: center;
            align-items: center;
        }
        .ndns-settings-modal-content {
            background: var(--panel-bg-solid);
            color: var(--panel-text);
            padding: 0;
            border-radius: 20px;
            width: 92%;
            max-width: 650px;
            box-shadow: 0 25px 80px rgba(0, 0, 0, 0.5), 0 0 0 1px var(--panel-border);
            position: relative;
            max-height: 90vh;
            overflow: hidden;
            display: flex;
            flex-direction: column;
        }
        .ndns-settings-modal-header {
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
            padding: 24px 24px 20px;
            background: var(--panel-header-bg);
            border-bottom: 1px solid var(--panel-border);
        }
        .ndns-settings-modal-header h3 {
            margin: 0 0 8px 0;
            font-size: 22px;
            font-weight: 700;
            background: linear-gradient(135deg, var(--accent-color) 0%, var(--accent-secondary) 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }
        .ndns-settings-modal-header .github-link {
            display: inline-flex;
            align-items: center;
            text-decoration: none;
            color: var(--panel-text-secondary);
            font-size: 12px;
            font-weight: 500;
            padding: 6px 12px;
            background: var(--btn-bg);
            border-radius: 20px;
            transition: all 0.2s ease;
        }
        .ndns-settings-modal-header .github-link:hover {
            color: var(--panel-text);
            background: var(--btn-hover-bg);
        }
        .ndns-settings-modal-header .github-link svg {
            width: 14px;
            height: 14px;
            margin-right: 6px;
        }
        .ndns-settings-close-btn {
            position: absolute;
            top: 16px;
            right: 16px;
            background: var(--btn-bg);
            border: none;
            cursor: pointer;
            color: var(--panel-text-secondary);
            font-size: 18px;
            width: 36px;
            height: 36px;
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s ease;
        }
        .ndns-settings-close-btn:hover {
            background: var(--btn-hover-bg);
            color: var(--panel-text);
            transform: rotate(90deg);
        }

        .ndns-settings-modal-body {
            padding: 20px 24px 40px 24px;
            overflow-y: auto;
            flex: 1;
            min-height: 0;
        }

        .ndns-settings-section {
            margin-bottom: 24px;
            background: var(--section-bg);
            border-radius: 16px;
            padding: 16px;
            border: 1px solid var(--panel-border);
        }
        .ndns-settings-section:last-child { margin-bottom: 0; }
        .ndns-settings-section > label {
            display: block;
            margin-bottom: 12px;
            font-weight: 700;
            font-size: 14px;
            color: var(--panel-text);
        }
        .ndns-settings-section > .settings-section-description {
            font-size: 12px;
            color: var(--panel-text-secondary);
            margin-top: -8px;
            margin-bottom: 14px;
            line-height: 1.5;
        }
        .ndns-settings-controls {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }
        .settings-control-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px 14px;
            background: var(--btn-bg);
            border-radius: 12px;
            border: 1px solid var(--btn-border);
            transition: all 0.2s ease;
        }
        .settings-control-row:hover {
            background: var(--btn-hover-bg);
        }
        .settings-control-row span {
            font-size: 13px;
            font-weight: 500;
            color: var(--panel-text);
        }
        .settings-control-row .btn-group {
            display: flex;
            gap: 6px;
        }

        /* Custom Switches for Settings - Modern */
        .custom-switch { display: flex; align-items: center; }
        .custom-switch label {
            margin-left: 10px;
            user-select: none;
            cursor: pointer;
            font-size: 13px;
            font-weight: 500;
        }
        .custom-switch input[type="checkbox"] {
            appearance: none;
            width: 44px;
            height: 24px;
            background: var(--btn-bg);
            border-radius: 12px;
            position: relative;
            cursor: pointer;
            transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
            border: 1px solid var(--btn-border);
        }
        .custom-switch input[type="checkbox"]:checked {
            background: linear-gradient(135deg, var(--success-color) 0%, #1f9d5c 100%);
            border-color: transparent;
        }
        .custom-switch input[type="checkbox"]::after {
            content: '';
            position: absolute;
            top: 2px;
            left: 2px;
            width: 18px;
            height: 18px;
            background: white;
            border-radius: 50%;
            transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
        .custom-switch input[type="checkbox"]:checked::after {
            transform: translateX(20px);
        }

        /* API Key Section - Modern */
        .api-key-wrapper {
            position: relative;
            display: flex;
            align-items: center;
            background: var(--input-bg);
            border: 1px solid var(--input-border);
            border-radius: 12px;
            overflow: hidden;
            transition: all 0.2s ease;
        }
        .api-key-wrapper:focus-within {
            border-color: var(--input-focus);
            box-shadow: 0 0 0 3px var(--glow-color);
        }
        .api-key-wrapper .ndns-input {
            border: none;
            border-radius: 0;
            background: transparent;
        }
        .api-key-wrapper .ndns-input:focus {
            box-shadow: none;
        }
        .api-key-toggle-visibility {
            background: transparent;
            border: none;
            padding: 10px 14px;
            cursor: pointer;
            color: var(--panel-text-secondary);
            transition: color 0.2s ease;
        }
        .api-key-toggle-visibility:hover {
            color: var(--panel-text);
        }
        .api-key-toggle-visibility svg {
            width: 18px;
            height: 18px;
        }

        /* Inline Controls for Log Rows */
        .ndns-reason-info { margin-left: 8px; font-size: 0.8em; font-style: italic; user-select: text; white-space: nowrap; opacity: 0.9; }
        .list-group-item.log .reason-icon { opacity: 1 !important; visibility: visible !important; display: inline-block !important; }
        .ndns-inline-controls { display: flex; align-items: center; gap: 4px; margin-left: auto; }
        .ndns-inline-controls button { cursor: pointer; background: transparent; border: none; font-size: 12px; padding: 0 3px; }
        .ndns-inline-controls span { margin-left: 2px; }
        .ndns-inline-controls .divider { border-left: 1px solid rgba(150, 150, 150, 0.3); margin: 0 6px; height: 16px; align-self: center; }
        .list-group-item .notranslate strong { font-weight: bold !important; color: var(--panel-text) !important; }
        .list-group-item .notranslate .subdomain { opacity: 0.5; }

        /* List Page Features CSS */
        .ndns-options-container {
            border: 1px solid var(--panel-border); border-radius: 12px; padding: 12px 15px;
            background: var(--panel-bg); position: absolute; right: 50px; top: 50px; z-index: 100;
            display: none; min-width: 220px; box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        }
        .ndns-options-container.show { display: block; }
        .ndns-options-btn {
            background: var(--btn-bg); border: 1px solid var(--btn-border); border-radius: 8px;
            padding: 6px 10px; cursor: pointer; color: var(--panel-text); font-size: 16px;
        }
        .ndns-options-btn:hover { background: var(--btn-hover-bg); }
        .ndns-switch { display: flex; align-items: center; padding: 6px 0; }
        .ndns-switch input[type="checkbox"] {
            appearance: none; width: 32px; height: 18px; background: var(--btn-bg);
            border-radius: 9px; position: relative; cursor: pointer; transition: background 0.2s;
            flex-shrink: 0;
        }
        .ndns-switch input[type="checkbox"]:checked { background: var(--success-color); }
        .ndns-switch input[type="checkbox"]::after {
            content: ''; position: absolute; top: 2px; left: 2px;
            width: 14px; height: 14px; background: white; border-radius: 50%;
            transition: transform 0.2s;
        }
        .ndns-switch input[type="checkbox"]:checked::after { transform: translateX(14px); }
        .ndns-switch label { margin-left: 10px; user-select: none; cursor: pointer; font-size: 12px; color: var(--panel-text); }

        /* Domain Description Input */
        .ndns-description-input {
            border: 0; background: transparent; color: gray; width: 100%; height: 24px;
            padding-left: 10px; padding-top: 2px; margin-top: 2px; font-size: 11px;
            outline: none; display: none;
        }
        .ndns-description-input::placeholder { color: #888; font-style: italic; }
        .ndns-description-input:focus, .ndns-description-input.has-value { display: block !important; }
        .list-group-item:hover .ndns-description-input { display: block !important; }

        /* Multi-Domain Textarea */
        .ndns-multi-domain-container { margin-bottom: 15px; }
        .ndns-multi-domain-textarea {
            width: 100%; min-height: 80px; max-height: 200px; resize: vertical;
            background: var(--input-bg); color: var(--input-text); border: 1px solid var(--input-border);
            border-radius: 8px; padding: 10px; font-size: 13px; font-family: inherit;
        }
        .ndns-multi-domain-textarea::placeholder { color: #888; }
        .ndns-multi-domain-btn {
            margin-top: 8px; padding: 8px 16px; background: var(--success-color); color: white;
            border: none; border-radius: 6px; cursor: pointer; font-size: 13px;
        }
        .ndns-multi-domain-btn:hover { opacity: 0.9; }
        .ndns-multi-domain-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .ndns-progress-text { margin-left: 10px; font-size: 12px; color: var(--panel-text); }

        /* Log Counters */
        .ndns-log-counters {
            display: flex; gap: 15px; padding: 8px 15px; background: var(--section-bg);
            border-radius: 8px; margin-bottom: 10px; font-size: 12px; align-items: center;
        }
        .ndns-log-counters span { color: var(--panel-text); }
        .ndns-log-counters .counter-value { font-weight: bold; margin-left: 4px; }
        .ndns-log-counters .visible-count { color: var(--success-color); }
        .ndns-log-counters .filtered-count { color: var(--warning-color); }
        .ndns-log-counters .total-count { color: var(--info-color); }

        /* Collapsible Lists */
        .ndns-collapse-container { display: flex; align-items: center; gap: 10px; margin-top: 10px; }
        .ndns-collapse-btn {
            padding: 6px 12px; background: var(--btn-bg); color: var(--panel-text);
            border: 1px solid var(--btn-border); border-radius: 6px; cursor: pointer; font-size: 12px;
        }
        .ndns-collapse-btn:hover { background: var(--btn-hover-bg); }
        .ndns-always-collapse { display: flex; align-items: center; font-size: 11px; }
        .ndns-always-collapse input { margin-right: 5px; }

        /* Styled Domain in Lists */
        .ndns-root-domain { font-weight: bold; color: inherit; }
        .ndns-subdomain { opacity: 0.5; }
        .ndns-wildcard { opacity: 0.3; }
        .list-group-item.ndns-right-align .d-flex { justify-content: flex-end; }
        .list-group-item.ndns-right-align img { order: 2; margin-left: 6px; margin-right: 0; }

        /* Onboarding Modal */
        #ndns-onboarding-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); backdrop-filter: blur(5px); z-index: 10002; display: flex; align-items: center; justify-content: center; animation: fadeIn 0.3s ease-out; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        #ndns-onboarding-modal { background: #1e1e1e; color: #fff; padding: 30px; border-radius: 12px; width: 90%; max-width: 480px; box-shadow: 0 15px 40px rgba(0,0,0,0.6); text-align: center; border: 1px solid #333; }
        #ndns-onboarding-modal h3 { font-size: 22px; margin-top: 0; margin-bottom: 12px; }
        #ndns-onboarding-modal p { color: #aaa; font-size: 14px; margin-bottom: 20px; }
        #ndns-onboarding-modal .api-input-wrapper { display: flex; gap: 8px; margin-top: 15px; }
        #ndns-onboarding-modal input { flex-grow: 1; padding: 10px; border-radius: 6px; border: 1px solid #444; background: #2a2a2a; color: #fff; font-size: 14px; }
        .ndns-flashy-button { background: linear-gradient(45deg, #a855f7, #ec4899, #22d3ee, #f59e0b); background-size: 300% 300%; animation: gradient-shift 4s ease infinite; border: none; color: white !important; width: 100%; padding: 12px; margin-top: 15px; border-radius: 6px; font-size: 16px; font-weight: 600; cursor: pointer; transition: transform 0.2s; }
        .ndns-flashy-button:hover { transform: scale(1.02); }
        @keyframes gradient-shift { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }

        /* Login Spotlight */
        .ndns-spotlight-overlay { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(20, 20, 20, 0.8); backdrop-filter: blur(5px); z-index: 10000; }
        .ndns-login-focus { position: relative !important; z-index: 10001 !important; background: var(--panel-bg, #1e1e1e); padding: 20px; border-radius: 12px; }
        .ndns-affiliate-pitch { position: fixed; z-index: 10001; top: 50%; left: 50%; transform: translate(-50%, -50%); color: white; text-align: center; max-width: 480px; font-size: 15px; line-height: 1.6; }
        .ndns-affiliate-pitch p { margin-bottom: 1em; }
        .ndns-affiliate-pitch a { color: var(--info-color); font-weight: 600; }
        .ndns-spotlight-close { position: fixed; top: 20px; right: 20px; z-index: 10002; font-size: 28px; color: white; cursor: pointer; opacity: 0.7; }
        .ndns-spotlight-close:hover { opacity: 1; }

        /* API Helper Bar */
        .ndns-api-helper {
            position: sticky; top: 0; z-index: 10001; background: #1e1e1e; color: white;
            padding: 12px 20px; text-align: center; box-shadow: 0 4px 12px rgba(0,0,0,0.5); border-bottom: 1px solid #333;
            display: flex; align-items: center; justify-content: center; gap: 15px;
        }
        .ndns-api-helper p { margin: 0; font-size: 14px; font-weight: 600; }
        .ndns-api-helper button { padding: 8px 16px; font-size: 13px; font-weight: 600; border-radius: 5px; border: none; cursor: pointer; transition: all 0.2s ease; }
        .ndns-api-helper .save-key-btn { background-color: var(--info-color); color: white; }
        .ndns-api-helper .save-key-btn:hover { background-color: #19b9d1; }
        .ndns-api-helper .generate-key-btn { background: linear-gradient(45deg, #a855f7, #ec4899); color: white; }
        .ndns-api-helper button:disabled { background-color: var(--success-color) !important; cursor: not-allowed; animation: none; }

        /* Auto Refresh Animation */
        .ndns-panel-button.auto-refresh-active {
            background: linear-gradient(270deg, #17a2b8, #28a745, #17a2b8);
            background-size: 200% 200%;
            animation: gradient-shine 2s linear infinite;
            color: white;
        }
        @keyframes gradient-shine { 0%{background-position:200% 0} 100%{background-position:-200% 0} }

        /* Compact Mode */
        html.ndns-compact-mode .ndns-panel-button { padding: 4px 6px; font-size: 10px; }
        html.ndns-compact-mode .ndns-panel-content { gap: 4px; }
        html.ndns-compact-mode .ndns-inline-controls { gap: 3px; }
        html.ndns-compact-mode .ndns-inline-controls button { font-size: 10px; }
        html.ndns-compact-mode .log .text-end .fa-lock { display: none; }
        html.ndns-compact-mode .log .text-end > .notranslate { display: none; }

        /* API Key Visibility Toggle */
        .api-key-wrapper { position: relative; display: flex; align-items: center; }
        .api-key-wrapper input { padding-right: 36px !important; }
        .api-key-toggle-visibility { position: absolute; right: 8px; background: none; border: none; cursor: pointer; color: var(--panel-text); opacity: 0.6; }
        .api-key-toggle-visibility:hover { opacity: 1; }
        .api-key-toggle-visibility svg { width: 18px; height: 18px; }

        /* Export Button */
        #export-hosts-btn { display: inline-flex; align-items: center; justify-content: center; transition: all 0.2s ease; }
        #export-hosts-btn .spinner { display: none; margin-left: 6px; border: 2px solid #f3f3f3; border-top: 2px solid #3498db; border-radius: 50%; width: 12px; height: 12px; animation: spin 1s linear infinite; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

        /* Stream Button - Always visible refresh icon */
        .stream-button {
            display: inline-flex !important; align-items: center; justify-content: center;
            padding: 4px; cursor: pointer;
        }
        .stream-button svg {
            width: 18px !important; height: 18px !important;
            fill: currentColor !important;
            transition: transform 0.2s ease;
        }
        .stream-button:hover svg {
            transform: rotate(30deg);
        }
        .stream-button.streaming svg,
        .stream-button.auto-refresh-active svg {
            animation: spin 1s linear infinite !important;
        }
        .stream-button.streaming,
        .stream-button.auto-refresh-active {
            background: linear-gradient(270deg, #17a2b8, #28a745, #17a2b8);
            background-size: 200% 200%;
            animation: gradient-shine 2s linear infinite;
            border-radius: 50% !important;
        }
        .stream-button.streaming svg,
        .stream-button.auto-refresh-active svg {
            fill: white !important;
        }

        /* Keyboard Shortcuts Overlay */
        .ndns-shortcuts-overlay {
            display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.85); backdrop-filter: blur(3px); z-index: 10003;
            justify-content: center; align-items: center;
        }
        .ndns-shortcuts-content {
            background: var(--panel-bg); border-radius: 12px; padding: 25px; max-width: 400px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.5);
        }
        .ndns-shortcuts-content h3 { margin: 0 0 15px; font-size: 18px; }
        .ndns-shortcut-item { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid var(--panel-border); }
        .ndns-shortcut-item:last-child { border-bottom: none; }

        /* Live Stats Widget */
        .ndns-live-stats {
            background: linear-gradient(135deg, var(--section-bg), var(--panel-bg));
            border-radius: 6px; padding: 8px; border: 1px solid var(--panel-border);
        }
        .ndns-live-stats-header {
            display: flex; justify-content: space-between; align-items: center;
            font-size: 10px; font-weight: 600; text-transform: uppercase; opacity: 0.7;
            margin-bottom: 6px;
        }
        .ndns-live-stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
        .ndns-stat-box {
            background: var(--btn-bg); border-radius: 4px; padding: 6px;
            text-align: center;
        }
        .ndns-stat-box-value { font-size: 16px; font-weight: 700; font-family: monospace; }
        .ndns-stat-box-label { font-size: 9px; opacity: 0.6; text-transform: uppercase; }
        .ndns-stat-pulse { animation: pulse 2s ease-in-out infinite; }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }

        /* Navigation Quick Links */
        .ndns-nav-links { display: flex; flex-wrap: wrap; gap: 3px; }
        a.ndns-nav-link {
            flex: 1; min-width: calc(50% - 3px); padding: 4px 0; margin: 0; background: var(--btn-bg);
            border: 1px solid var(--btn-border); border-radius: 4px; text-align: center;
            font-size: 18px; cursor: pointer; transition: all 0.15s ease; color: var(--panel-text);
            text-decoration: none; display: block;
        }
        .ndns-nav-link:hover { background: var(--btn-hover-bg); }
        .ndns-nav-link.active { background: var(--accent-color); color: white; border-color: var(--accent-color); }

        /* Tooltip Styles */
        .ndns-tooltip { position: relative; }
        .ndns-tooltip::after {
            content: attr(data-tooltip); position: absolute; bottom: 100%; left: 50%;
            transform: translateX(-50%) translateY(-4px); padding: 4px 8px;
            background: rgba(0,0,0,0.9); color: white; font-size: 10px; white-space: nowrap;
            border-radius: 4px; opacity: 0; visibility: hidden; transition: all 0.2s ease;
            z-index: 10000; pointer-events: none;
        }
        .ndns-tooltip:hover::after { opacity: 1; visibility: visible; }

        /* List group item border fix */
        div.px-3.bg-2.list-group-item { border-top-width: 1px; border-style: solid; }
    `);

    // --- ULTRA CONDENSED CSS (User's Custom CSS) ---
    const ultraCondensedCSS = `
        button.dropdown-toggle.btn.btn-light {
            padding-left: 5px;
            padding-bottom: 3px;
            padding-top: 3px;
            padding-right: 4px;
            display: none;
        }
        div.flex-grow-1.ms-3 { display: none; }
        div.mb-4.d-flex.col { display: none; }
        div.col {
            margin: 0;
            padding: 0;
            border-width: 0;
        }
        .col {
            padding: 0;
            margin: 0;
            border-width: 0;
        }
        input.form-control.form-control-sm {
            padding-top: 0px;
            padding-bottom: 0px;
            border-style: outset;
            border-top-width: 0px;
        }
        div.nav.nav-tabs {
            border-style: none;
            margin-top: -62px;
        }
        div.mt-4.Logs.mb-5 {
            border-style: none;
            margin: 0;
        }
        div.log.list-group-item {
            padding-top: 0px;
            padding-bottom: 0px;
        }
        div.text-muted.list-group-item {
            display: none;
            border-style: none;
        }
        div.card {
            border-top-width: 0px;
            border-bottom-width: 0px;
            margin-bottom: 0px;
            padding: 0;
        }
        div.mt-4 {
            margin-top: 0px;
            border-style: none;
            margin-bottom: 0px;
            padding: 0;
        }
        div.card-header {
            padding: 0;
            border-style: none;
            margin: 0;
            margin-top: -17px;
        }
        svg.injected-svg {
            border-width: 0;
        }
        div.settings-button {
            margin-right: -10px;
            margin-top: 0px;
            margin-left: -10px;
            margin-bottom: 0px;
        }
        span.divider {
            border-left-width: 2px;
            border-right-width: 1px;
            border-style: groove;
            padding: 0;
        }
        * { border-radius: 0 !important; }
        div.list-group-item {
            padding-top: 0px;
            padding-bottom: 0px;
        }
        .mt-1 { display: none; }
        div.card-body {
            border-style: outset;
            border-color: #999999;
            padding: 10px;
            border-width: 1px;
        }
        div.px-3.text-center { display: none; }
        .card > .list-group-flush.list-group .flex-grow-1 > div > div:nth-of-type(2) { display: none; }
        div.py-3.list-group-item {
            padding-top: 0px;
            padding-bottom: 0px;
        }
        div.d-block.d-md-flex {
            margin-left: -195px;
            margin-top: -6px;
            padding-bottom: 12px;
        }
        div[role="alert"] { display: none !important; }
        div span span { font-size: 16px; }
        div.pe-1.list-group-item {
            padding-top: 0px;
            padding-bottom: 0px;
        }
        button.btn.btn-link {
            padding: 0;
            margin: 0;
        }
        div.text-end { display: none; }
        div.px-3.bg-2.list-group-item {
            border-top-width: 1px;
            border-style: solid;
            border-bottom-width: 1px;
            padding-left: 0px;
            padding-right: 4px;
        }
        div.text-center.py-2.mb-4.card {
            border-top-width: 0px;
            border-bottom-width: 1px;
            border-left-width: 0px;
            border-right-width: 0px;
            border-style: none;
        }
        svg.recharts-surface {
            height: 105px;
        }
        .recharts-surface {
            margin-top: -114px;
        }
        path.recharts-sector {
            display: none;
        }
        svg.rsm-svg {
            margin-bottom: -35px;
            padding-top: 0px;
            margin-top: -45px;
        }
        div div h5 {
            margin-bottom: 0px;
        }
        div.col-md-4 {
            padding-top: 0px;
            padding-bottom: 0px;
            margin-bottom: -22px;
            margin-top: -28px;
        }
        div.d-flex.mt-3 {
            margin-top: 0px;
        }
        div.d-md-flex {
            display: none;
        }
    `;


    // --- HELPER FUNCTIONS ---
    const sleep = (ms = 500) => new Promise(resolve => setTimeout(resolve, ms));

    const toHex = (text) => {
        let hex = '';
        for (let i = 0; i < text.length; i++) {
            hex += text.charCodeAt(i).toString(16).padStart(2, '0');
        }
        return hex;
    };

    function showToast(msg, isError = false, duration = 4000) {
        let existingToast = document.querySelector('.ndns-toast-countdown');
        if (existingToast) existingToast.remove();

        const n = document.createElement('div');
        n.className = 'ndns-toast-countdown';
        n.textContent = msg;
        Object.assign(n.style, {
            position: 'fixed', bottom: '20px', right: '20px',
            background: isError ? 'var(--danger-color)' : 'var(--success-color)',
            color: '#fff', padding: '12px 18px', borderRadius: '6px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)', zIndex: 20000,
            transform: 'translateY(100px)', opacity: '0',
            transition: 'transform 0.4s ease, opacity 0.4s ease',
            fontSize: '13px', maxWidth: '350px'
        });
        document.body.appendChild(n);
        setTimeout(() => {
            n.style.transform = 'translateY(0)';
            n.style.opacity = '1';
        }, 10);
        setTimeout(() => {
            n.style.transform = 'translateY(100px)';
            n.style.opacity = '0';
            n.addEventListener('transitionend', () => n.remove());
        }, duration);
        return n;
    }

    async function initializeState() {
        const defaultFilters = { hideList: false, hideBlocked: false, showOnlyWhitelisted: false, autoRefresh: false };
        const values = await storage.get({
            [KEY_FILTER_STATE]: defaultFilters,
            [KEY_HIDDEN_DOMAINS]: ['nextdns.io'],
            [KEY_LOCK_STATE]: true,
            [KEY_THEME]: 'dark',
            [KEY_WIDTH]: 180,
            [KEY_API_KEY]: null,
            [KEY_PROFILE_ID]: null,
            [KEY_DOMAIN_ACTIONS]: {},
            [KEY_LIST_PAGE_THEME]: true,
            [KEY_ULTRA_CONDENSED]: true,
            [KEY_SHORTCUTS_ENABLED]: true,
            [KEY_CUSTOM_CSS_ENABLED]: true,
            [KEY_HIDE_HEADER]: false,
            // NDNS features
            [KEY_DOMAIN_DESCRIPTIONS]: {},
            [KEY_LIST_SORT_AZ]: false,
            [KEY_LIST_SORT_TLD]: false,
            [KEY_LIST_BOLD_ROOT]: true,
            [KEY_LIST_LIGHTEN_SUB]: true,
            [KEY_LIST_RIGHT_ALIGN]: false,
            [KEY_MULTI_DOMAIN_INPUT]: true,
            [KEY_SHOW_LOG_COUNTERS]: true,
            [KEY_COLLAPSE_BLOCKLISTS]: false,
            [KEY_COLLAPSE_TLDS]: false
        });
        filters = { ...defaultFilters, ...values[KEY_FILTER_STATE] };
        hiddenDomains = new Set(values[KEY_HIDDEN_DOMAINS]);
        isManuallyLocked = values[KEY_LOCK_STATE];
        currentTheme = values[KEY_THEME];
        panelWidth = values[KEY_WIDTH];
        NDNS_API_KEY = values[KEY_API_KEY];
        globalProfileId = values[KEY_PROFILE_ID];
        domainActions = values[KEY_DOMAIN_ACTIONS];
        enableListPageTheme = values[KEY_LIST_PAGE_THEME];
        isUltraCondensed = values[KEY_ULTRA_CONDENSED];
        shortcutsEnabled = values[KEY_SHORTCUTS_ENABLED];
        customCssEnabled = values[KEY_CUSTOM_CSS_ENABLED];
        hideHeader = values[KEY_HIDE_HEADER];
        // NDNS features
        domainDescriptions = values[KEY_DOMAIN_DESCRIPTIONS];
        listSortAZ = values[KEY_LIST_SORT_AZ];
        listSortTLD = values[KEY_LIST_SORT_TLD];
        listBoldRoot = values[KEY_LIST_BOLD_ROOT];
        listLightenSub = values[KEY_LIST_LIGHTEN_SUB];
        listRightAlign = values[KEY_LIST_RIGHT_ALIGN];
        multiDomainInput = values[KEY_MULTI_DOMAIN_INPUT];
        showLogCounters = values[KEY_SHOW_LOG_COUNTERS];
        collapseBlocklists = values[KEY_COLLAPSE_BLOCKLISTS];
        collapseTLDs = values[KEY_COLLAPSE_TLDS];
    }

    async function makeApiRequest(method, endpoint, body = null, apiKey = NDNS_API_KEY, customUrl = null) {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: method,
                url: customUrl || `https://api.nextdns.io${endpoint}`,
                headers: {
                    'X-Api-Key': apiKey,
                    'Content-Type': body ? 'application/json;charset=utf-8' : undefined
                },
                data: body ? JSON.stringify(body) : undefined,
                responseType: 'json',
                onload: (response) => {
                    if (response.status >= 200 && response.status < 300) {
                        resolve(response.response || {});
                    } else if (response.status === 404 && method === 'DELETE') {
                        resolve({});
                    } else {
                        const errorMsg = response.response?.errors?.[0]?.detail || `${response.status}: ${response.statusText}`;
                        reject(new Error(errorMsg));
                    }
                },
                onerror: (response) => {
                    reject(new Error(`Network request failed: ${response.statusText}`));
                }
            });
        });
    }

    function getProfileID() {
        const m = window.location.pathname.match(/\/([a-z0-9]+)\//);
        return m ? m[1] : null;
    }

    function getCurrentProfileId() {
        return globalProfileId || getProfileID();
    }

    function extractRootDomain(domain) {
        const parts = domain.split('.');
        if (parts.length < 2) return domain;
        const slds = new Set(['co', 'com', 'org', 'gov', 'edu', 'net', 'ac', 'ltd']);
        if (parts.length > 2 && slds.has(parts[parts.length - 2])) {
            return parts.slice(-3).join('.');
        }
        return parts.slice(-2).join('.');
    }

    function downloadFile(content, fileName, mimeType = 'text/plain') {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // --- NEW: Quick Actions from Panel (Download/Clear Logs) ---
    async function quickDownloadLogs() {
        const profileId = getCurrentProfileId();
        if (!profileId || !NDNS_API_KEY) {
            showToast('API Key or Profile ID missing.', true);
            return;
        }

        showToast('Downloading logs...', false, 2000);

        try {
            const response = await fetch(
                `https://api.nextdns.io/profiles/${profileId}/logs/download`,
                {
                    method: 'GET',
                    credentials: 'include',
                    headers: { 'X-Api-Key': NDNS_API_KEY }
                }
            );

            if (!response.ok) throw new Error(`API Error: ${response.status}`);

            const csvText = await response.text();
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
            downloadFile(csvText, `nextdns-logs-${profileId}-${timestamp}.csv`, 'text/csv');
            showToast('Logs downloaded successfully!');
        } catch (error) {
            showToast(`Failed to download logs: ${error.message}`, true);
        }
    }

    async function quickClearLogs() {
        const profileId = getCurrentProfileId();
        if (!profileId || !NDNS_API_KEY) {
            showToast('API Key or Profile ID missing.', true);
            return;
        }

        if (!confirm('Are you sure you want to clear ALL logs? This cannot be undone.')) {
            return;
        }

        showToast('Clearing logs...', false, 2000);

        try {
            await makeApiRequest('DELETE', `/profiles/${profileId}/logs`);
            showToast('Logs cleared successfully!');

            // Refresh page if on logs page
            if (location.pathname.includes('/logs')) {
                setTimeout(() => location.reload(), 1000);
            }
        } catch (error) {
            showToast(`Failed to clear logs: ${error.message}`, true);
        }
    }

    // --- NEW: Toggle Ultra Condensed Mode ---
    function applyUltraCondensedMode(enabled) {
        if (ultraCondensedStyleElement) {
            ultraCondensedStyleElement.remove();
            ultraCondensedStyleElement = null;
        }

        if (enabled && customCssEnabled) {
            ultraCondensedStyleElement = document.createElement('style');
            ultraCondensedStyleElement.id = 'ndns-ultra-condensed';
            ultraCondensedStyleElement.textContent = ultraCondensedCSS;
            document.head.appendChild(ultraCondensedStyleElement);
        }

        isUltraCondensed = enabled;
    }

    // --- Hide Header Toggle ---
    function applyHideHeader(enabled) {
        if (hideHeaderStyleElement) {
            hideHeaderStyleElement.remove();
            hideHeaderStyleElement = null;
        }

        if (enabled) {
            hideHeaderStyleElement = document.createElement('style');
            hideHeaderStyleElement.id = 'ndns-hide-header';
            hideHeaderStyleElement.textContent = `div.Header { display: none !important; }`;
            document.head.appendChild(hideHeaderStyleElement);
        }

        hideHeader = enabled;
    }

    // --- NEW: Keyboard Shortcuts ---
    function setupKeyboardShortcuts() {
        if (!shortcutsEnabled) return;

        document.addEventListener('keydown', async (e) => {
            // Don't trigger when typing in inputs
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

            const profileId = getCurrentProfileId();

            // Ctrl/Cmd + Shift + shortcuts
            if ((e.ctrlKey || e.metaKey) && e.shiftKey) {
                switch(e.key.toLowerCase()) {
                    case 'd': // Download logs
                        e.preventDefault();
                        quickDownloadLogs();
                        break;
                    case 'x': // Clear logs
                        e.preventDefault();
                        quickClearLogs();
                        break;
                    case 'r': // Refresh/reload logs
                        e.preventDefault();
                        document.querySelector('.stream-button svg')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
                        showToast('Refreshing logs...', false, 1500);
                        break;
                    case 'p': // Toggle panel
                        e.preventDefault();
                        if (panel) panel.classList.toggle('visible');
                        break;
                    case 'l': // Toggle lock
                        e.preventDefault();
                        toggleLock();
                        break;
                    case 'c': // Toggle condensed mode
                        e.preventDefault();
                        isUltraCondensed = !isUltraCondensed;
                        applyUltraCondensedMode(isUltraCondensed);
                        await storage.set({ [KEY_ULTRA_CONDENSED]: isUltraCondensed });
                        showToast(`Condensed mode ${isUltraCondensed ? 'enabled' : 'disabled'}`, false, 1500);
                        break;
                    case 's': // Open settings
                        e.preventDefault();
                        if (settingsModal) settingsModal.style.display = 'flex';
                        break;
                    case 'k': // Show shortcuts help
                        e.preventDefault();
                        toggleShortcutsOverlay();
                        break;
                }
            }

            // Number keys for quick navigation (without modifiers)
            if (!e.ctrlKey && !e.metaKey && !e.altKey && profileId) {
                const navMap = {
                    '1': 'logs',
                    '2': 'analytics',
                    '3': 'denylist',
                    '4': 'allowlist',
                    '5': 'security',
                    '6': 'privacy',
                    '7': 'settings'
                };
                if (navMap[e.key]) {
                    // Only if ? key shortcut overlay is visible, don't navigate
                    const shortcutsOverlay = document.querySelector('.ndns-shortcuts-overlay');
                    if (!shortcutsOverlay || shortcutsOverlay.style.display === 'none') {
                        // Don't navigate - let user press Ctrl+number for nav
                    }
                }
            }

            // ? key to show shortcuts
            if (e.key === '?' && !e.ctrlKey && !e.metaKey) {
                e.preventDefault();
                toggleShortcutsOverlay();
            }

            // Escape to close overlays
            if (e.key === 'Escape') {
                const shortcutsOverlay = document.querySelector('.ndns-shortcuts-overlay');
                if (shortcutsOverlay && shortcutsOverlay.style.display !== 'none') {
                    shortcutsOverlay.style.display = 'none';
                }
                if (settingsModal && settingsModal.style.display !== 'none') {
                    settingsModal.style.display = 'none';
                }
            }
        });
    }

    function toggleShortcutsOverlay() {
        let overlay = document.querySelector('.ndns-shortcuts-overlay');

        if (!overlay) {
            overlay = document.createElement('div');
            overlay.className = 'ndns-shortcuts-overlay';
            overlay.innerHTML = `
                <div class="ndns-shortcuts-content">
                    <h3>⌨️ Keyboard Shortcuts</h3>
                    <div class="ndns-shortcut-item"><span>Download Logs</span><span class="ndns-kbd">Ctrl+Shift+D</span></div>
                    <div class="ndns-shortcut-item"><span>Clear Logs</span><span class="ndns-kbd">Ctrl+Shift+X</span></div>
                    <div class="ndns-shortcut-item"><span>Refresh Logs</span><span class="ndns-kbd">Ctrl+Shift+R</span></div>
                    <div class="ndns-shortcut-item"><span>Toggle Panel</span><span class="ndns-kbd">Ctrl+Shift+P</span></div>
                    <div class="ndns-shortcut-item"><span>Lock/Unlock Panel</span><span class="ndns-kbd">Ctrl+Shift+L</span></div>
                    <div class="ndns-shortcut-item"><span>Condensed Mode</span><span class="ndns-kbd">Ctrl+Shift+C</span></div>
                    <div class="ndns-shortcut-item"><span>Open Settings</span><span class="ndns-kbd">Ctrl+Shift+S</span></div>
                    <div class="ndns-shortcut-item"><span>Show This Help</span><span class="ndns-kbd">?</span></div>
                    <div class="ndns-shortcut-item"><span>Close Overlays</span><span class="ndns-kbd">Esc</span></div>
                    <p style="margin-top: 15px; font-size: 11px; opacity: 0.6; text-align: center;">Press Escape or click outside to close</p>
                </div>
            `;
            overlay.onclick = (e) => {
                if (e.target === overlay) overlay.style.display = 'none';
            };
            document.body.appendChild(overlay);
        }

        overlay.style.display = overlay.style.display === 'none' || !overlay.style.display ? 'flex' : 'none';
    }

    // --- NEW: Copy to Clipboard ---
    function copyToClipboard(text) {
        navigator.clipboard.writeText(text).then(() => {
            showToast('Copied to clipboard!', false, 1500);
        }).catch(() => {
            showToast('Failed to copy', true, 1500);
        });
    }

    // --- HAGEZI INTEGRATION ---
    async function fetchHageziList(url, type) {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'GET',
                url: url,
                onload: (response) => {
                    if (response.status >= 200 && response.status < 300) {
                        const content = response.responseText.trim();
                        let items;
                        if (type === 'tld') {
                            items = content.match(/^\|\|(xn--)?\w+\^$/gm)?.map(e => e.slice(2, -1)) || [];
                        } else {
                            items = content.split("\n").map(e => e.slice(4, -1));
                        }
                        resolve(new Set(items));
                    } else {
                        reject(new Error(`Failed to fetch list: ${response.statusText}`));
                    }
                },
                onerror: (err) => reject(new Error('Network error fetching list.'))
            });
        });
    }

    async function manageHageziLists(action, listType, button) {
        const profileId = getCurrentProfileId();
        if (!profileId || !NDNS_API_KEY) return showToast("Profile ID or API Key missing.", true);

        const originalText = button.textContent;
        button.disabled = true;
        button.textContent = 'Processing...';

        const config = {
            tlds: {
                url: HAGEZI_TLDS_URL,
                parseType: 'tld',
                getEndpoint: `/profiles/${profileId}/security`,
                addEndpoint: `/profiles/${profileId}/security/tlds`,
                removeEndpoint: (item) => `/profiles/${profileId}/security/tlds/hex:${toHex(item)}`,
                storageKey: KEY_HAGEZI_ADDED_TLDS,
                navUrl: `https://my.nextdns.io/${profileId}/security`,
                name: 'TLD Blocklist'
            },
            allowlist: {
                url: HAGEZI_ALLOWLIST_URL,
                parseType: 'domain',
                getEndpoint: `/profiles/${profileId}/allowlist`,
                addEndpoint: `/profiles/${profileId}/allowlist`,
                removeEndpoint: (item) => `/profiles/${profileId}/allowlist/${item}`,
                storageKey: KEY_HAGEZI_ADDED_ALLOWLIST,
                navUrl: `https://my.nextdns.io/${profileId}/allowlist`,
                name: 'Domain Allowlist'
            }
        };

        const currentConfig = config[listType];

        try {
            if (action === 'apply') {
                const remoteList = await fetchHageziList(currentConfig.url, currentConfig.parseType);
                const apiResponse = await makeApiRequest('GET', currentConfig.getEndpoint);
                const currentItems = new Set(
                    listType === 'tlds' ? apiResponse.data.tlds.map(t => t.id) : apiResponse.data.map(d => d.id)
                );

                const itemsToAdd = [...remoteList].filter(item => !currentItems.has(item));

                if (itemsToAdd.length === 0) {
                    showToast(`Your ${currentConfig.name} is already up to date.`, false);
                } else {
                    const toast = showToast(`Adding ${itemsToAdd.length} entries to ${currentConfig.name}... 0%`, false, itemsToAdd.length * 600);
                    for (let i = 0; i < itemsToAdd.length; i++) {
                        const item = itemsToAdd[i];
                        const body = listType === 'tlds' ? { id: item } : { id: item, active: true };
                        await makeApiRequest('POST', currentConfig.addEndpoint, body);
                        toast.textContent = `Adding to ${currentConfig.name}... ${Math.round((i + 1) / itemsToAdd.length * 100)}%`;
                        await sleep();
                    }
                    const existingAdded = (await storage.get({ [currentConfig.storageKey]: [] }))[currentConfig.storageKey];
                    const newlyAdded = new Set([...existingAdded, ...itemsToAdd]);
                    await storage.set({ [currentConfig.storageKey]: [...newlyAdded] });
                    showToast(`Successfully added ${itemsToAdd.length} entries.`, false);
                }

            } else if (action === 'remove') {
                const itemsToRemove = (await storage.get({ [currentConfig.storageKey]: [] }))[currentConfig.storageKey];
                if (itemsToRemove.length === 0) {
                    showToast(`No managed ${currentConfig.name} entries found to remove.`, false);
                } else {
                    const toast = showToast(`Removing ${itemsToRemove.length} entries from ${currentConfig.name}... 0%`, false, itemsToRemove.length * 600);
                    for (let i = 0; i < itemsToRemove.length; i++) {
                        const item = itemsToRemove[i];
                        await makeApiRequest('DELETE', currentConfig.removeEndpoint(item));
                        toast.textContent = `Removing from ${currentConfig.name}... ${Math.round((i + 1) / itemsToRemove.length * 100)}%`;
                        await sleep();
                    }
                    await storage.remove(currentConfig.storageKey);
                    showToast(`Successfully removed ${itemsToRemove.length} entries.`, false);
                }
            }

            sessionStorage.setItem('ndns_reopen_settings', 'true');
            window.location.href = currentConfig.navUrl;

        } catch (error) {
            showToast(`Error: ${error.message}`, true, 6000);
            button.disabled = false;
            button.textContent = originalText;
        }
    }

    // --- ONBOARDING & ACCOUNT HANDLING ---
    function showOnboardingModal(options = {}) {
        let existingOverlay = document.getElementById('ndns-onboarding-overlay');
        if (existingOverlay) existingOverlay.remove();

        const overlay = document.createElement('div');
        overlay.id = 'ndns-onboarding-overlay';

        let modalHTML = `
            <h3>🔑 API Key Required</h3>
            <p>Let's grab your API key from your NextDNS account page to unlock full features.</p>
            <button id="ndns-get-api-key-btn" class="ndns-flashy-button">Take me there!</button>
        `;

        if (options.manual) {
            const profileId = getCurrentProfileId();
            modalHTML = `
                <h3>📋 Manual API Key Entry</h3>
                <p>Your API Key has been copied. Paste it below:</p>
                <div class="api-input-wrapper">
                    <input type="text" id="ndns-manual-api-input" placeholder="Paste API Key here...">
                </div>
                <button id="ndns-manual-api-submit" class="ndns-flashy-button">Accept API Key</button>
                <a href="https://my.nextdns.io/${profileId}/api" target="_blank" style="display: block; font-size: 11px; color: #888; margin-top: 12px; text-decoration: underline;">Didn't copy the key? Click here to return to the API page.</a>
            `;
        }

        overlay.innerHTML = `<div id="ndns-onboarding-modal">${modalHTML}</div>`;
        document.body.appendChild(overlay);

        if (options.manual) {
            document.getElementById('ndns-manual-api-submit').onclick = async () => {
                const key = document.getElementById('ndns-manual-api-input').value;
                if (key) {
                    const settingsSaveBtn = settingsModal.querySelector('#ndns-settings-save-api-key-btn');
                    const settingsInput = settingsModal.querySelector('.api-key-wrapper input');
                    if (settingsInput && settingsSaveBtn) {
                        settingsInput.value = key;
                        settingsSaveBtn.click();
                        overlay.remove();
                    }
                } else {
                    showToast("Please paste a key.", true);
                }
            };
        } else {
            document.getElementById('ndns-get-api-key-btn').onclick = () => {
                sessionStorage.setItem('ndnsRedirectUrl', window.location.href);
                window.location.href = 'https://my.nextdns.io/account';
            };
        }
    }

    function createLoginSpotlight() {
        const loginForm = document.querySelector('.col-xl-4.col-lg-5');
        if (!loginForm) return;

        const overlay = document.createElement('div');
        overlay.className = 'ndns-spotlight-overlay';

        const pitch = document.createElement('div');
        pitch.className = 'ndns-affiliate-pitch';
        pitch.innerHTML = `
            <p>To get the most out of this extension, you'll want to sign in and use an API key for full automation.</p>
            <p>NextDNS Pro is just $1.99/month and gives you network-wide DNS blocking.</p>
            <p>Support the project by signing up through my affiliate link:<br><a href="https://nextdns.io/?from=6mrqtjw2" target="_blank">https://nextdns.io/?from=6mrqtjw2</a></p>
        `;

        const closeBtn = document.createElement('span');
        closeBtn.className = 'ndns-spotlight-close';
        closeBtn.innerHTML = '&times;';
        closeBtn.onclick = () => {
            overlay.remove();
            pitch.remove();
            closeBtn.remove();
            loginForm.classList.remove('ndns-login-focus');
        };

        document.body.appendChild(overlay);
        document.body.appendChild(pitch);
        document.body.appendChild(closeBtn);
        loginForm.classList.add('ndns-login-focus');
    }

    function handleAccountPage() {
        if (document.getElementById('ndns-api-helper')) return;

        const dimOverlay = document.createElement('div');
        dimOverlay.className = 'ndns-dim-overlay';
        document.body.appendChild(dimOverlay);

        const helper = document.createElement('div');
        helper.id = 'ndns-api-helper';
        helper.className = 'ndns-api-helper';
        document.body.prepend(helper);

        const updateHelperUI = () => {
            const apiKeyDiv = document.querySelector('div.font-monospace');
            const generateButton = Array.from(document.querySelectorAll('button')).find(btn => btn.textContent.includes('Generate API key'));
            const proPlanCard = Array.from(document.querySelectorAll('.card-title')).find(el => el.textContent.includes('Pro'))?.closest('.row');

            helper.innerHTML = '';
            const message = document.createElement('p');
            const actionButton = document.createElement('button');
            helper.appendChild(message);
            helper.appendChild(actionButton);
            actionButton.style.display = 'block';

            if (apiKeyDiv && apiKeyDiv.textContent.trim()) {
                message.textContent = '✅ API Key found!';
                actionButton.textContent = 'Capture Key & Return to Logs';
                actionButton.className = 'save-key-btn';
                actionButton.onclick = async () => {
                    const apiKey = apiKeyDiv.textContent.trim();
                    navigator.clipboard.writeText(apiKey);
                    await storage.set({
                        'ndns_api_key_to_transfer': apiKey,
                        'ndns_return_from_account': true
                    });
                    const redirectUrl = globalProfileId ? `https://my.nextdns.io/${globalProfileId}/logs` : 'https://my.nextdns.io/';
                    showToast('API Key captured! Returning...', false, 2000);
                    setTimeout(() => { window.location.href = redirectUrl; }, 800);
                };
            } else if (generateButton) {
                message.textContent = '❗️ Your API Key isn\'t generated yet.';
                actionButton.textContent = 'Generate API Key';
                actionButton.className = 'generate-key-btn';
                actionButton.onclick = () => {
                    generateButton.click();
                    showToast('Generating key... Page will reload.', false, 2000);
                    setTimeout(() => location.reload(), 1000);
                };
            } else if (proPlanCard) {
                helper.style.transition = 'opacity 0.5s';
                helper.style.opacity = '0.5';
                helper.style.pointerEvents = 'none';
                message.innerHTML = `<b>Couldn't create an API key.</b><br>You'll need to upgrade to <b>NextDNS Pro</b> to use this feature.`;
                actionButton.textContent = 'Upgrade to Pro';
                actionButton.className = 'save-key-btn';
                actionButton.onclick = () => window.open('https://nextdns.io/?from=6mrqtjw2', '_blank');
                proPlanCard.style.boxShadow = '0 0 0 3px var(--info-color)';
                proPlanCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
            } else {
                message.textContent = 'Please create an account or login to access your API key.';
                actionButton.style.display = 'none';
            }
        };

        helper.innerHTML = `<p>⏳ Looking for the API section...</p>`;
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });

        setTimeout(() => {
            updateHelperUI();
            const observer = new MutationObserver(() => updateHelperUI());
            const targetNode = Array.from(document.querySelectorAll('h5')).find(h => h.textContent === 'API Keys')?.closest('.card');
            if (targetNode) {
                observer.observe(targetNode, { childList: true, subtree: true });
            }
        }, 1500);
    }

    async function finalizeApiKeySetup() {
        try {
            const data = await storage.get(['ndns_api_key_to_transfer']);
            const apiKey = data.ndns_api_key_to_transfer;

            await storage.remove(['ndns_api_key_to_transfer', 'ndns_return_from_account']);

            if (!apiKey || !/^[a-f0-9]{60,}/i.test(apiKey)) {
                throw new Error("Failed to retrieve a valid API key.");
            }

            const profileId = getCurrentProfileId();
            if (!profileId) {
                throw new Error("Could not find Profile ID.");
            }

            await makeApiRequest('GET', `/profiles/${profileId}`, null, apiKey);

            const apiKeyInput = settingsModal.querySelector('.api-key-wrapper input');
            const apiKeySaveBtn = settingsModal.querySelector('#ndns-settings-save-api-key-btn');

            if (!apiKeyInput || !apiKeySaveBtn) {
                throw new Error("Could not find settings elements.");
            }

            apiKeyInput.value = apiKey.trim();
            showToast("API Key validated. Submitting automatically...", false, 2500);

            setTimeout(() => apiKeySaveBtn.click(), 2000);

        } catch (err) {
            showOnboardingModal({ manual: true });
        }
    }

    // --- THEMING ---
    function applyListPageTheme() {
        if (listPageThemeStyleElement) {
            listPageThemeStyleElement.remove();
            listPageThemeStyleElement = null;
        }

        if (!enableListPageTheme) return;

        const isAllowlistPage = window.location.href.includes('/allowlist');
        const isDenylistPage = window.location.href.includes('/denylist');

        if (!isAllowlistPage && !isDenylistPage) return;

        let cssRules = `
            div.mb-4.card { width: 1300px; margin-left: -50px; }
            div.text-end { margin-right: 11px; }
            div div button { margin-left: -5px; padding: 0; }
            div.ndns-inline-controls { margin-right: 5px; }
            div.log.list-group-item { padding-top: 0px; padding-bottom: 0px; }
            svg.svg-inline--fa.fa-xmark { padding-left: 17px; }
            div.pe-1.list-group-item { padding-top: 0px; padding-bottom: 0px; border-style: outset; border-bottom-width: 1px; border-top-width: 1px; }
            div div div { border-style: none; }
            .list-group.list-group-flush { border-style: none; }
            a.menu.nav-link.active { background-color: #209528; }
        `;

        if (isDenylistPage) {
            cssRules += `
                div.pe-1.list-group-item, .flex-grow-1.d-flex.gap-2.align-items-center, .d-flex.align-items-center,
                .form-control, .list-group.list-group-flush, button.notranslate, span.d-none.d-lg-inline, button.dropdown-toggle {
                    background-color: #260600 !important;
                }
                #root { background-color: #260600; border-style: none; }
                div.pe-1.list-group-item { border-color: #5b0f00; }
                div.mt-4 { background-color: #4d0e00; }
                div.card-header, div.Header { background-color: #5b0f00; }
                button svg path { color: #ed8181; }
            `;
        } else if (isAllowlistPage) {
            cssRules += `
                div.pe-1.list-group-item, .flex-grow-1.d-flex.gap-2.align-items-center, .d-flex.align-items-center,
                .form-control, .list-group.list-group-flush, button.notranslate, span.d-none.d-lg-inline, button.dropdown-toggle {
                    background-color: #0a2915 !important;
                }
                #root { background-color: #0a2915; border-style: none; }
                div.pe-1.list-group-item { border-color: #134e27; }
                div.mt-4 { background-color: #1b3b24; }
                div.card-header, div.Header { background-color: #134e27; }
                button svg path { color: #81ed9d; }
            `;
        }

        listPageThemeStyleElement = document.createElement('style');
        listPageThemeStyleElement.id = 'ndns-list-page-theme';
        listPageThemeStyleElement.textContent = cssRules;
        document.head.appendChild(listPageThemeStyleElement);
    }

    // --- AUTO SCROLL / PRELOAD ---
    async function autoScrollLog() {
        const preloadBtn = document.getElementById('preload-btn');
        if (!preloadBtn) return;

        isPreloadingCancelled = false;
        const originalOnClick = preloadBtn.onclick;

        preloadBtn.textContent = 'Stop Loading';
        preloadBtn.classList.add('danger-button');
        preloadBtn.onclick = () => { isPreloadingCancelled = true; };

        const originalFilters = { ...filters };
        const hadActiveFilters = Object.values(originalFilters).some(v => v === true);
        const originalScrollY = window.scrollY;

        try {
            if (hadActiveFilters) {
                showToast('Temporarily showing all logs to preload...', false, 2000);
                Object.keys(filters).forEach(k => { if (typeof filters[k] === 'boolean') filters[k] = false; });
                cleanLogs();
                await new Promise(resolve => setTimeout(resolve, 300));
            }

            showToast('Loading all logs... (Click "Stop" to cancel)', false, 2000);

            let previousHeight = document.body.scrollHeight;
            let noNewDataCount = 0;
            const waitTime = 800;
            const maxRetries = 5;

            while (!isPreloadingCancelled) {
                window.scrollTo(0, document.body.scrollHeight);
                await new Promise(resolve => setTimeout(resolve, waitTime));
                const newHeight = document.body.scrollHeight;

                if (newHeight === previousHeight) {
                    noNewDataCount++;
                    if (noNewDataCount >= maxRetries) {
                        showToast('Finished loading logs.', false, 3000);
                        break;
                    }
                    showToast(`Waiting for data... (${noNewDataCount}/${maxRetries})`, false, 900);
                } else {
                    noNewDataCount = 0;
                    previousHeight = newHeight;
                }
            }

            if (isPreloadingCancelled) {
                showToast('Preloading stopped.', true, 2000);
            }

        } catch (error) {
            console.error('Auto-scroll error:', error);
            showToast('Error during auto-scroll.', true);
        } finally {
            if (hadActiveFilters) {
                Object.assign(filters, originalFilters);
                cleanLogs();
                await storage.set({ [KEY_FILTER_STATE]: filters });
            }

            preloadBtn.textContent = 'Load All Logs';
            preloadBtn.classList.remove('danger-button');
            preloadBtn.onclick = originalOnClick;
            window.scrollTo({ top: originalScrollY, behavior: 'instant' });
        }
    }

    async function clearHiddenDomains() {
        if (confirm('Are you sure you want to clear all hidden domains?')) {
            hiddenDomains.clear();
            hiddenDomains.add('nextdns.io');
            await storage.set({ [KEY_HIDDEN_DOMAINS]: [...hiddenDomains] });
            showToast('Cleared hidden domains.');
            cleanLogs();
            return true;
        }
        return false;
    }

    async function updateDomainAction(domain, type, level) {
        if (type === 'remove') {
            delete domainActions[domain];
        } else {
            domainActions[domain] = { type, level };
        }
        await storage.set({ [KEY_DOMAIN_ACTIONS]: domainActions });
    }

    async function sendDomainViaApi(domain, mode = 'deny') {
        if (!NDNS_API_KEY) {
            showToast('API Key not set.', true);
            return;
        }
        const pid = getCurrentProfileId();
        if (!pid) {
            showToast('Could not find NextDNS profile ID.', true);
            return;
        }
        const domainToSend = domain.replace(/^\*\./, '');
        const endpoint = mode === 'deny' ? 'denylist' : 'allowlist';
        const apiUrl = `/profiles/${pid}/${endpoint}`;
        try {
            await makeApiRequest('POST', apiUrl, { "id": domainToSend, "active": true }, NDNS_API_KEY);
            hiddenDomains.add(domain);
            await storage.set({ [KEY_HIDDEN_DOMAINS]: [...hiddenDomains] });
            const level = domain === extractRootDomain(domain) ? 'root' : 'sub';
            await updateDomainAction(domain, mode, level);
            showToast(`${domain} added to ${endpoint} and hidden!`);
            cleanLogs();
        } catch (error) {
            showToast(`API Error: ${error.message || 'Unknown'}`, true);
        }
    }

    async function removeDomainViaApi(domain, listType) {
        if (!NDNS_API_KEY) return showToast('API Key not set.', true);
        const pid = getCurrentProfileId();
        if (!pid) return showToast('Could not find Profile ID.', true);

        const endpoint = `/profiles/${pid}/${listType}/${domain}`;
        try {
            await makeApiRequest('DELETE', endpoint, null, NDNS_API_KEY);
            await updateDomainAction(domain, 'remove');
            showToast(`${domain} removed from ${listType}.`);
            cleanLogs();
            if (/\/denylist|\/allowlist/.test(location.href)) {
                document.querySelectorAll(".list-group-item").forEach(item => {
                    const domainEl = item.querySelector('.notranslate');
                    if (domainEl && domainEl.textContent.trim() === domain) {
                        item.style.transition = 'opacity 0.3s';
                        item.style.opacity = '0';
                        setTimeout(() => item.remove(), 300);
                    }
                });
            }
        } catch (error) {
            showToast(`Error: ${error.message}`, true);
        }
    }

    // --- BULK DELETE FUNCTIONALITY ---
    let bulkDeleteActive = false;
    const BULK_DELETE_BATCH_SIZE = 30;
    const BULK_DELETE_COOLDOWN_MS = 10000;
    const BULK_DELETE_CLICK_DELAY_MS = 300;
    const BULK_DELETE_STORAGE_KEY = 'ndns_bulk_deleter_next_run';

    function updateBulkDeleteStatus(text) {
        const statusEl = document.getElementById('bulk-delete-status');
        if (statusEl) {
            statusEl.style.display = 'flex';
            statusEl.querySelector('.ndns-stats-value').textContent = text;
        }
    }

    function stopBulkDelete() {
        bulkDeleteActive = false;
        localStorage.removeItem(BULK_DELETE_STORAGE_KEY);

        const bulkBtn = document.getElementById('bulk-delete-btn');
        const stopBtn = document.getElementById('stop-bulk-delete-btn');
        const statusEl = document.getElementById('bulk-delete-status');

        if (bulkBtn) bulkBtn.style.display = '';
        if (stopBtn) stopBtn.style.display = 'none';
        if (statusEl) statusEl.style.display = 'none';

        showToast('Bulk delete stopped.');
    }

    async function runBulkDeleteBatch() {
        updateBulkDeleteStatus('Scanning for entries...');

        // Find all delete buttons (buttons containing the X icon)
        const deleteIcons = Array.from(document.querySelectorAll('svg.fa-xmark, .remove-list-item-btn svg'));
        const buttons = deleteIcons.map(icon => icon.closest('button')).filter(btn => btn !== null);

        if (buttons.length === 0) {
            updateBulkDeleteStatus('No entries found. Done!');
            localStorage.removeItem(BULK_DELETE_STORAGE_KEY);
            bulkDeleteActive = false;

            const bulkBtn = document.getElementById('bulk-delete-btn');
            const stopBtn = document.getElementById('stop-bulk-delete-btn');
            if (bulkBtn) bulkBtn.style.display = '';
            if (stopBtn) stopBtn.style.display = 'none';

            showToast('Bulk delete complete! No more entries.');
            return;
        }

        const buttonsToClick = buttons.slice(0, BULK_DELETE_BATCH_SIZE);
        updateBulkDeleteStatus(`Found ${buttons.length}. Deleting ${buttonsToClick.length}...`);

        for (let i = 0; i < buttonsToClick.length; i++) {
            if (!bulkDeleteActive) {
                updateBulkDeleteStatus('Stopped by user.');
                return;
            }
            updateBulkDeleteStatus(`Deleting ${i + 1}/${buttonsToClick.length}...`);
            buttonsToClick[i].click();
            await new Promise(r => setTimeout(r, BULK_DELETE_CLICK_DELAY_MS));
        }

        updateBulkDeleteStatus('Batch done. Cooldown...');

        // Set the timer for the next run
        localStorage.setItem(BULK_DELETE_STORAGE_KEY, Date.now() + BULK_DELETE_COOLDOWN_MS);

        // Wait a moment for requests to fire, then reload
        setTimeout(() => {
            if (bulkDeleteActive) {
                window.location.reload();
            }
        }, 2000);
    }

    function startBulkDelete() {
        bulkDeleteActive = true;

        const bulkBtn = document.getElementById('bulk-delete-btn');
        const stopBtn = document.getElementById('stop-bulk-delete-btn');

        if (bulkBtn) bulkBtn.style.display = 'none';
        if (stopBtn) stopBtn.style.display = '';

        // Check if we're in a cooldown period
        const nextRun = localStorage.getItem(BULK_DELETE_STORAGE_KEY);
        const now = Date.now();

        if (nextRun && now < parseInt(nextRun)) {
            // We are in the cooling period - start countdown
            const countdownInterval = setInterval(() => {
                if (!bulkDeleteActive) {
                    clearInterval(countdownInterval);
                    return;
                }

                const remaining = parseInt(nextRun) - Date.now();
                if (remaining <= 0) {
                    clearInterval(countdownInterval);
                    runBulkDeleteBatch();
                } else {
                    const secondsLeft = Math.ceil(remaining / 1000);
                    updateBulkDeleteStatus(`Cooldown: ${secondsLeft}s...`);
                }
            }, 1000);
        } else {
            // No wait needed, run after a short delay
            setTimeout(runBulkDeleteBatch, 500);
        }
    }

    // Auto-resume bulk delete if we were in the middle of it
    function checkBulkDeleteResume() {
        const nextRun = localStorage.getItem(BULK_DELETE_STORAGE_KEY);
        if (nextRun && /\/denylist|\/allowlist/.test(location.href)) {
            // Resume bulk delete after page load
            setTimeout(() => {
                const bulkBtn = document.getElementById('bulk-delete-btn');
                if (bulkBtn) {
                    showToast('Resuming bulk delete...', false, 2000);
                    startBulkDelete();
                }
            }, 2000);
        }
    }

    async function createRowButtons(row, domain) {
        if (row.querySelector('.ndns-inline-controls')) return;
        const wrapper = document.createElement('div');
        wrapper.className = 'ndns-inline-controls';

        const createBtn = (icon, title, action, className = '') => {
            const b = document.createElement('button');
            b.innerHTML = icon;
            b.title = title;
            b.className = className;
            b.onclick = action;
            return b;
        };

        const createDivider = () => {
            const d = document.createElement('span');
            d.className = 'divider';
            return d;
        };

        const onHide = async (domToHide) => {
            hiddenDomains.add(domToHide);
            await storage.set({ [KEY_HIDDEN_DOMAINS]: [...hiddenDomains] });
            cleanLogs();
            showToast(`Hidden: ${domToHide}`);
        };

        const rootDomain = extractRootDomain(domain);

        const buttons = [
            createBtn('🚫', 'Block Full Domain', () => sendDomainViaApi(domain, 'deny')),
            createBtn('⛔', 'Block Root Domain', () => sendDomainViaApi(rootDomain, 'deny')),
            createDivider(),
            createBtn('✅', 'Allow Full Domain', () => sendDomainViaApi(domain, 'allow')),
            createBtn('🟢', 'Allow Root Domain', () => sendDomainViaApi(rootDomain, 'allow')),
            createDivider(),
            createBtn('👁️', 'Hide Full', () => onHide(domain)),
            createBtn('🙈', 'Hide Root', () => onHide(rootDomain)),
            createDivider(),
            createBtn('📋', 'Copy Domain', () => copyToClipboard(domain)),
            createBtn('🔍', 'Google', () => window.open(`https://www.google.com/search?q=${encodeURIComponent(domain)}`, '_blank')),
            createBtn('🕵️', 'Who.is', () => window.open(`https://www.who.is/whois/${encodeURIComponent(rootDomain)}`, '_blank'))
        ];

        buttons.forEach(btn => wrapper.appendChild(btn));
        const targetEl = row.querySelector('.flex-grow-1.d-flex.align-items-center.text-break');
        if (targetEl) targetEl.appendChild(wrapper);
    }

    let isCleaningLogs = false; // Guard against re-entry

    function cleanLogs() {
        if (isCleaningLogs) return;
        isCleaningLogs = true;

        try {
            document.querySelectorAll('div.list-group-item.log').forEach(row => {
                row.querySelector('svg[data-icon="ellipsis-vertical"]')?.closest('.dropdown')?.style.setProperty('display', 'none', 'important');
                let domain = row.querySelector('.text-break > div > span')?.innerText.trim() || row.querySelector('.text-break')?.innerText.trim().match(/^([a-zA-Z0-9.-]+)/)?.[0];
                if (!domain) return;
                createRowButtons(row, domain);

            const rootDomain = extractRootDomain(domain);
            const domainAction = domainActions[domain];
            const rootAction = domainActions[rootDomain];
            let historicalAction = domainAction || rootAction;

            if (historicalAction) {
                const borderStyle = historicalAction.level === 'root' ? 'solid' : 'dotted';
                const borderColor = historicalAction.type === 'deny' ? 'var(--danger-color)' : 'var(--success-color)';
                row.style.borderLeft = `4px ${borderStyle} ${borderColor}`;
            }

            if (!row.querySelector('.ndns-reason-info')) {
                // Try to find reason info from various sources
                let reasonText = null;
                let reasonColor = null;

                // Method 1: Check .reason[title] element
                const reasonEl = row.querySelector('.reason[title]');
                if (reasonEl) {
                    const tooltipText = reasonEl.getAttribute('title');
                    const blockedByMatch = tooltipText.match(/Blocked by\s+(.+)/i);
                    const allowedByMatch = tooltipText.match(/Allowed by\s+(.+)/i);
                    if (blockedByMatch?.[1]) {
                        reasonText = `Blocked by ${blockedByMatch[1].replace(/\.$/, '').trim()}`;
                        reasonColor = 'var(--danger-color)';
                    } else if (allowedByMatch?.[1]) {
                        reasonText = `Allowed by ${allowedByMatch[1].replace(/\.$/, '').trim()}`;
                        reasonColor = 'var(--success-color)';
                    }
                }

                // Method 2: Check reason-icon parent for title/data-bs-original-title
                if (!reasonText) {
                    const reasonIcon = row.querySelector('.reason-icon');
                    if (reasonIcon) {
                        // Check all possible tooltip data locations
                        const possibleSources = [
                            reasonIcon,
                            reasonIcon.parentElement,
                            reasonIcon.closest('[title]'),
                            reasonIcon.closest('[data-bs-original-title]'),
                            reasonIcon.closest('[data-original-title]'),
                            reasonIcon.closest('[data-bs-title]'),
                            row.querySelector('[data-bs-original-title]'),
                            row.querySelector('[data-original-title]'),
                            row.querySelector('[title*="Blocked"]'),
                            row.querySelector('[title*="Allowed"]')
                        ].filter(Boolean);

                        let tooltipText = '';
                        for (const source of possibleSources) {
                            tooltipText = source.getAttribute('title') ||
                                         source.getAttribute('data-bs-original-title') ||
                                         source.getAttribute('data-original-title') ||
                                         source.getAttribute('data-bs-title') || '';
                            if (tooltipText.includes('Blocked') || tooltipText.includes('Allowed')) break;
                        }

                        const blockedMatch = tooltipText.match(/Blocked by\s+(.+)/i);
                        const allowedMatch = tooltipText.match(/Allowed by\s+(.+)/i);

                        if (blockedMatch?.[1]) {
                            reasonText = `Blocked by ${blockedMatch[1].replace(/\.$/, '').trim()}`;
                            reasonColor = 'var(--danger-color)';
                        } else if (allowedMatch?.[1]) {
                            reasonText = `Allowed by ${allowedMatch[1].replace(/\.$/, '').trim()}`;
                            reasonColor = 'var(--success-color)';
                        } else {
                            // Fallback: check icon color to determine if blocked or allowed
                            const iconStyle = reasonIcon.getAttribute('style') || '';
                            if (iconStyle.includes('rgb(255, 65, 54)') || iconStyle.includes('rgb(255, 69, 58)')) {
                                reasonText = 'Blocked';
                                reasonColor = 'var(--danger-color)';
                            } else if (iconStyle.includes('rgb(46, 204, 64)') || iconStyle.includes('rgb(50, 205, 50)')) {
                                reasonText = 'Allowed';
                                reasonColor = 'var(--success-color)';
                            }
                        }
                    }
                }

                // Create inline reason display
                if (reasonText) {
                    const infoElement = document.createElement('span');
                    infoElement.className = 'ndns-reason-info';
                    infoElement.textContent = `(${reasonText})`;
                    if (reasonColor) infoElement.style.color = reasonColor;

                    const targetContainer = row.querySelector('.flex-grow-1.d-flex.align-items-center.text-break > div') ||
                                           row.querySelector('.flex-grow-1.d-flex.align-items-center.text-break');
                    targetContainer?.appendChild(infoElement);
                }
            }

            const isBlockedByReason = !!row.querySelector('.reason-icon');
            const isWhitelisted = row.style.borderLeft.includes('rgb(46, 204, 64)');
            const hideByDomainList = filters.hideList && [...hiddenDomains].some(h => domain.includes(h));

            const isHistoricallyAllowed = historicalAction?.type === 'allow';
            const isHistoricallyBlocked = historicalAction?.type === 'deny';

            const isConsideredAllowed = isWhitelisted || isHistoricallyAllowed;
            const isConsideredBlocked = isBlockedByReason || isHistoricallyBlocked;

            // Apply row background coloring based on status (using inline style check)
            const styleAttr = row.getAttribute('style') || '';
            const borderLeftStyle = row.style.borderLeft || '';

            // Check for blocked (red/orange colors) - NextDNS uses rgb(255, 69, 58) for blocked
            const isBlockedColor = styleAttr.includes('rgb(255') ||
                                   borderLeftStyle.includes('rgb(255') ||
                                   borderLeftStyle.includes('orangered') ||
                                   isConsideredBlocked;

            // Check for allowed (green colors) - NextDNS uses rgb(46, 204, 64) or rgb(50, 205, 50)
            const isAllowedColor = styleAttr.includes('rgb(46, 204') ||
                                   styleAttr.includes('rgb(50, 205') ||
                                   borderLeftStyle.includes('limegreen') ||
                                   borderLeftStyle.includes('rgb(46') ||
                                   borderLeftStyle.includes('rgb(50, 205') ||
                                   isConsideredAllowed;

            // Apply background class (only if not already set correctly)
            const hasBlockedClass = row.classList.contains('ndns-row-blocked');
            const hasAllowedClass = row.classList.contains('ndns-row-allowed');

            if (isBlockedColor && !isAllowedColor) {
                if (!hasBlockedClass) {
                    row.classList.remove('ndns-row-allowed');
                    row.classList.add('ndns-row-blocked');
                }
            } else if (isAllowedColor) {
                if (!hasAllowedClass) {
                    row.classList.remove('ndns-row-blocked');
                    row.classList.add('ndns-row-allowed');
                }
            } else {
                if (hasBlockedClass || hasAllowedClass) {
                    row.classList.remove('ndns-row-blocked', 'ndns-row-allowed');
                }
            }

            let isVisible = true;
            if (filters.hideList && hideByDomainList) isVisible = false;
            if (filters.hideBlocked && isConsideredBlocked) isVisible = false;
            if (filters.showOnlyWhitelisted && !isConsideredAllowed) isVisible = false;

            row.style.display = isVisible ? '' : 'none';
        });

        // Update log counters after processing
        if (showLogCounters && logCountersElement) {
            updateLogCounters();
        }
        } finally {
            isCleaningLogs = false;
        }
    }

    function observeLogs() {
        const logContainer = document.querySelector('div.logs') || document.body;
        let debounceTimer = null;

        const observer = new MutationObserver(() => {
            if (isCleaningLogs) return;

            // Debounce to avoid rapid-fire calls
            if (debounceTimer) clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                cleanLogs();
            }, 50);
        });

        observer.observe(logContainer, { childList: true, subtree: true });

        // Fallback: periodically check for rows without buttons (catches any missed entries)
        setInterval(() => {
            if (isCleaningLogs) return;
            const allRows = document.querySelectorAll('div.list-group-item.log');
            const hasRowsWithoutButtons = Array.from(allRows).some(row => !row.querySelector('.ndns-inline-controls'));
            if (hasRowsWithoutButtons) {
                cleanLogs();
            }
        }, 1000);
    }

    // Replace stream button SVG with proper refresh icon
    function replaceStreamButtonIcon() {
        const streamButton = document.querySelector('.stream-button');
        if (!streamButton) return;

        const existingSvg = streamButton.querySelector('svg');
        if (existingSvg && existingSvg.dataset.ndnsReplaced) return;

        // Create refresh icon SVG
        const refreshSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        refreshSvg.setAttribute('viewBox', '0 0 24 24');
        refreshSvg.setAttribute('width', '18');
        refreshSvg.setAttribute('height', '18');
        refreshSvg.setAttribute('fill', 'currentColor');
        refreshSvg.dataset.ndnsReplaced = 'true';

        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', 'M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z');

        refreshSvg.appendChild(path);

        // Replace the inner content
        const innerDiv = streamButton.querySelector('div');
        if (innerDiv) {
            innerDiv.innerHTML = '';
            innerDiv.appendChild(refreshSvg);
        } else {
            streamButton.innerHTML = '';
            streamButton.appendChild(refreshSvg);
        }
    }

    function startAutoRefresh() {
        if (autoRefreshInterval) return;
        autoRefreshInterval = setInterval(() => {
            if (document.visibilityState === 'visible') {
                document.querySelector('.stream-button svg')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
            }
        }, 5000);
    }

    function stopAutoRefresh() {
        clearInterval(autoRefreshInterval);
        autoRefreshInterval = null;
    }

    function hidePanel() {
        if (panel && !isManuallyLocked) panel.classList.remove('visible');
    }

    async function toggleLock() {
        isManuallyLocked = !isManuallyLocked;
        await storage.set({ [KEY_LOCK_STATE]: isManuallyLocked });
        updateLockIcon();
    }

    function updateLockIcon() {
        if (!lockButton) return;
        while (lockButton.firstChild) lockButton.removeChild(lockButton.firstChild);
        lockButton.appendChild(isManuallyLocked ? icons.locked.cloneNode(true) : icons.unlocked.cloneNode(true));
        if (isManuallyLocked) panel.classList.add('visible');
    }

    function updateTogglePositionIcon() {
        if (!panel || !togglePosButton) return;
        const isLeftSide = panel.classList.contains('left-side');
        while (togglePosButton.firstChild) togglePosButton.removeChild(togglePosButton.firstChild);
        togglePosButton.appendChild(isLeftSide ? icons.arrowRight.cloneNode(true) : icons.arrowLeft.cloneNode(true));
        togglePosButton.title = isLeftSide ? 'Move Panel to Right' : 'Move Panel to Left';
    }

    async function applyPanelPosition() {
        const side = (await storage.get({ [KEY_POSITION_SIDE]: 'right' }))[KEY_POSITION_SIDE];
        const top = (await storage.get({ [KEY_POSITION_TOP]: '10px' }))[KEY_POSITION_TOP];
        panel.style.top = top;
        panel.classList.remove('left-side', 'right-side');
        panel.classList.add(side === 'left' ? 'left-side' : 'right-side');
        leftHeaderControls.innerHTML = '';
        rightHeaderControls.innerHTML = '';

        if (side === 'left') {
            leftHeaderControls.appendChild(settingsButton);
            rightHeaderControls.append(togglePosButton, lockButton);
        } else {
            leftHeaderControls.append(lockButton, togglePosButton);
            rightHeaderControls.appendChild(settingsButton);
        }
        updateTogglePositionIcon();
    }

    function updatePanelBorderColor() {
        if (!panel) return;
        if (filters.showOnlyWhitelisted) {
            panel.style.borderColor = 'var(--success-color)';
        } else {
            panel.style.borderColor = 'var(--handle-color)';
        }
    }

    async function toggleFeature(key) {
        const isTurningOn = !filters[key];
        const exclusiveKeys = ['hideBlocked', 'showOnlyWhitelisted'];

        if (isTurningOn) {
            if (key === 'hideList') filters.showOnlyWhitelisted = false;

            // If turning on Show Allowed Only, deselect Show Blocked Only (native toggle)
            if (key === 'showOnlyWhitelisted') {
                deselectShowBlockedOnly();
            }
        }

        if (exclusiveKeys.includes(key)) {
            if (isTurningOn) {
                exclusiveKeys.forEach(k => { filters[k] = false; });
                filters[key] = true;
            } else {
                filters[key] = false;
            }
        } else {
            filters[key] = isTurningOn;
        }

        if (key === 'autoRefresh') {
            if (isTurningOn) {
                document.querySelector('.stream-button svg')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
                startAutoRefresh();
            } else {
                stopAutoRefresh();
            }
        }

        await storage.set({ [KEY_FILTER_STATE]: filters });
        updateButtonStates();
        updatePanelBorderColor();
        cleanLogs();

        if (/\/denylist|\/allowlist/.test(location.href)) {
            location.reload();
        }
    }

    // --- Native NextDNS Toggle Functions ---
    // Style element for hiding settings box when Show Blocked Only is active
    let blockedOnlyStyleElement = null;

    function toggleNativeCheckbox(checkboxId, buttonId) {
        const checkbox = document.getElementById(checkboxId);
        const button = document.getElementById(buttonId);

        if (checkbox) {
            // Checkbox exists, click it directly
            const wasChecked = checkbox.checked;
            checkbox.click();

            // Update button state after a delay to ensure checkbox state has updated
            setTimeout(() => {
                const isNowChecked = document.getElementById(checkboxId)?.checked || false;
                if (button) {
                    button.classList.toggle('active', isNowChecked);
                }

                // For blocked-queries-only, manage CSS hiding and settings box
                if (checkboxId === 'blocked-queries-only') {
                    applyBlockedOnlyCSS(isNowChecked);
                    // If we just checked it, deselect Show Allowed Only
                    if (isNowChecked) {
                        deselectShowAllowedOnly();
                    }
                    // If we just unchecked it, close the settings box
                    if (!isNowChecked) {
                        setTimeout(() => {
                            const closeBtn = document.querySelector('div.settings-button.active');
                            if (closeBtn) closeBtn.click();
                        }, 100);
                    }
                }
            }, 150);
            return true;
        }

        // Checkbox not visible, need to open settings first
        const settingsBtn = document.querySelector('div.settings-button');
        if (settingsBtn) {
            settingsBtn.click();
            // Wait for settings to appear, then click the checkbox
            setTimeout(() => {
                const cb = document.getElementById(checkboxId);
                const btn = document.getElementById(buttonId);
                if (cb) {
                    cb.click();

                    // Update button state after checkbox click
                    setTimeout(() => {
                        const isChecked = document.getElementById(checkboxId)?.checked || false;
                        if (btn) {
                            btn.classList.toggle('active', isChecked);
                        }

                        // For blocked-queries-only, apply CSS hiding instead of closing settings
                        if (checkboxId === 'blocked-queries-only') {
                            applyBlockedOnlyCSS(isChecked);
                            // Deselect Show Allowed Only when Show Blocked Only is enabled
                            if (isChecked) {
                                deselectShowAllowedOnly();
                            }
                            // Don't close settings - it needs to stay open for the filter to work
                        } else {
                            // Close settings for other toggles
                            setTimeout(() => {
                                const closeBtn = document.querySelector('div.settings-button.active');
                                if (closeBtn) closeBtn.click();
                            }, 100);
                        }
                    }, 150);
                }
            }, 150);
        }
        return false;
    }

    // Function to deselect Show Allowed Only if it's active
    function deselectShowAllowedOnly() {
        if (filters.showOnlyWhitelisted) {
            filters.showOnlyWhitelisted = false;
            storage.set({ [KEY_FILTER_STATE]: filters });
            updateButtonStates();
            updatePanelBorderColor();
            cleanLogs();
        }
    }

    // Function to deselect Show Blocked Only if it's active
    function deselectShowBlockedOnly() {
        const blockedCheckbox = document.getElementById('blocked-queries-only');
        const blockedBtn = document.getElementById('toggle-blockedOnly');

        if (blockedCheckbox && blockedCheckbox.checked) {
            blockedCheckbox.click();
            if (blockedBtn) blockedBtn.classList.remove('active');
            applyBlockedOnlyCSS(false);
            // Close settings box
            setTimeout(() => {
                const closeBtn = document.querySelector('div.settings-button.active');
                if (closeBtn) closeBtn.click();
            }, 100);
        }
    }

    function applyBlockedOnlyCSS(enabled) {
        if (enabled) {
            if (!blockedOnlyStyleElement) {
                blockedOnlyStyleElement = document.createElement('style');
                blockedOnlyStyleElement.id = 'ndns-blocked-only-hide';
                blockedOnlyStyleElement.textContent = `
                    .list-group-item.bg-2.px-3 > .d-md-flex { display: none !important; }
                `;
                document.head.appendChild(blockedOnlyStyleElement);
            }
        } else {
            if (blockedOnlyStyleElement) {
                blockedOnlyStyleElement.remove();
                blockedOnlyStyleElement = null;
            }
        }
    }

    function updateNativeToggleButton(checkboxId, buttonId) {
        setTimeout(() => {
            const checkbox = document.getElementById(checkboxId);
            const button = document.getElementById(buttonId);
            if (checkbox && button) {
                button.classList.toggle('active', checkbox.checked);
            }
        }, 200);
    }

    function initNativeToggleStates() {
        // Update button states based on native checkbox states
        setTimeout(() => {
            const blockedCheckbox = document.getElementById('blocked-queries-only');
            const blockedBtn = document.getElementById('toggle-blockedOnly');
            if (blockedCheckbox && blockedBtn) {
                blockedBtn.classList.toggle('active', blockedCheckbox.checked);
                // Apply CSS hiding if already checked
                if (blockedCheckbox.checked) {
                    applyBlockedOnlyCSS(true);
                }
            }

            const rawCheckbox = document.getElementById('advanced-mode');
            const rawBtn = document.getElementById('toggle-rawDnsLogs');
            if (rawCheckbox && rawBtn) {
                rawBtn.classList.toggle('active', rawCheckbox.checked);
            }
        }, 500);
    }

    function updateButtonStates() {
        Object.keys(filters).forEach(k => {
            const btn = document.getElementById(`toggle-${k}`);
            if (btn) {
                btn.classList.toggle('active', filters[k]);
                if (k === 'autoRefresh') {
                    btn.classList.toggle('auto-refresh-active', filters[k]);
                    document.querySelector('.stream-button')?.classList.toggle('auto-refresh-active', filters[k]);
                }
            }
        });
    }

    function applyTheme(theme) {
        document.documentElement.setAttribute('data-ndns-theme', theme);
        currentTheme = theme;
    }

    function applyPanelWidth(width) {
        panel.style.minWidth = `${width}px`;
        panel.style.width = `${width}px`;
        panelWidth = width;
    }

    async function onDownloadBlockedHosts(event) {
        const button = event.currentTarget;
        const spinner = button.querySelector('.spinner');
        const buttonText = button.querySelector('span');
        const originalText = buttonText.textContent;
        const profileId = getCurrentProfileId();

        if (!profileId) {
            showToast('Error: Could not detect Profile ID.', true);
            return;
        }

        button.disabled = true;
        buttonText.textContent = 'Processing...';
        spinner.style.display = 'inline-block';

        try {
            const response = await fetch(
                `https://api.nextdns.io/profiles/${profileId}/logs/download`,
                {
                    method: 'GET',
                    credentials: 'include',
                    headers: { 'X-Api-Key': NDNS_API_KEY }
                }
            );

            if (!response.ok) throw new Error(`API Request Failed: ${response.status}`);

            const csvText = await response.text();
            const lines = csvText.trim().split('\n');
            const header = lines.shift().split(',').map(h => h.trim());
            const domainIndex = header.indexOf('domain');
            const reasonsIndex = header.indexOf('reasons');

            if (domainIndex === -1 || reasonsIndex === -1) {
                throw new Error('CSV missing required columns.');
            }

            const blockedDomains = new Set();
            lines.forEach(line => {
                const columns = line.split(',');
                const reasons = (columns[reasonsIndex] || '').toLowerCase();
                if (reasons.includes('blacklist') || reasons.includes('blocklist')) {
                    const domain = columns[domainIndex];
                    if (domain) blockedDomains.add(domain);
                }
            });

            const hostsContent = Array.from(blockedDomains).map(domain => `0.0.0.0 ${domain}`).join('\n');
            downloadFile(hostsContent, 'hosts');
            showToast('HOSTS file downloaded.', false);

        } catch (error) {
            showToast(`Failed: ${error.message}`, true, 5000);
        } finally {
            button.disabled = false;
            buttonText.textContent = originalText;
            spinner.style.display = 'none';
        }
    }

    async function exportProfile() {
        const pid = getCurrentProfileId();
        if (!pid || !NDNS_API_KEY) {
            showToast("Profile ID or API Key missing.", true);
            return;
        }
        const exportButton = document.getElementById('ndns-export-profile-btn');
        exportButton.disabled = true;
        exportButton.textContent = 'Exporting...';

        try {
            const result = await makeApiRequest('GET', `/profiles/${pid}`, null, NDNS_API_KEY);
            const content = JSON.stringify(result, null, 2);
            downloadFile(content, `NextDNS-Profile-${pid}-Export.json`, 'application/json');
            showToast("Profile exported!");
        } catch (error) {
            showToast(`Export failed: ${error.message}`, true);
        } finally {
            exportButton.disabled = false;
            exportButton.textContent = 'Export Profile';
        }
    }

    // --- SETTINGS MODAL ---
    function buildSettingsModal() {
        const overlay = document.createElement('div');
        overlay.className = 'ndns-settings-modal-overlay';
        overlay.onclick = (e) => { if (e.target === overlay) overlay.style.display = 'none'; };

        const content = document.createElement('div');
        content.className = 'ndns-settings-modal-content';
        overlay.appendChild(content);

        const header = document.createElement('div');
        header.className = 'ndns-settings-modal-header';
        header.innerHTML = `
            <h3>⚙️ Settings</h3>
            <a href="https://github.com/SysAdminDoc" target="_blank" class="github-link">${icons.github.outerHTML} <span>Open Source on GitHub</span></a>
        `;
        content.appendChild(header);
        content.innerHTML += `<button class="ndns-settings-close-btn">&times;</button>`;
        content.querySelector('.ndns-settings-close-btn').onclick = () => overlay.style.display = 'none';

        // Create scrollable body container
        const modalBody = document.createElement('div');
        modalBody.className = 'ndns-settings-modal-body';
        content.appendChild(modalBody);

        // API Key Section
        const apiSection = document.createElement('div');
        apiSection.className = 'ndns-settings-section';
        apiSection.innerHTML = `<label>🔑 API Key</label>`;

        const apiControls = document.createElement('div');
        apiControls.className = 'ndns-settings-controls';

        const apiWrapper = document.createElement('div');
        apiWrapper.className = 'api-key-wrapper';
        const apiInput = document.createElement('input');
        apiInput.type = 'password';
        apiInput.className = 'ndns-input';
        apiInput.placeholder = 'Paste your API key';
        apiInput.value = NDNS_API_KEY || '';

        const visToggle = document.createElement('button');
        visToggle.className = 'api-key-toggle-visibility';
        visToggle.appendChild(icons.eye.cloneNode(true));
        visToggle.onclick = () => {
            const isPassword = apiInput.type === 'password';
            apiInput.type = isPassword ? 'text' : 'password';
            visToggle.innerHTML = '';
            visToggle.appendChild(isPassword ? icons.eyeSlash.cloneNode(true) : icons.eye.cloneNode(true));
        };
        apiWrapper.append(apiInput, visToggle);

        const apiSaveBtn = document.createElement('button');
        apiSaveBtn.id = 'ndns-settings-save-api-key-btn';
        apiSaveBtn.textContent = 'Save API Key';
        apiSaveBtn.className = 'ndns-panel-button';
        apiSaveBtn.onclick = async () => {
            const newKey = apiInput.value.trim();
            if (newKey) {
                await storage.set({ [KEY_API_KEY]: newKey });
                NDNS_API_KEY = newKey;
                sessionStorage.setItem('ndns_needs_refresh', 'true');
                showToast('API Key saved! Reloading...', false, 1500);
                setTimeout(() => location.reload(), 1000);
            } else {
                showToast('API Key cannot be empty.', true);
            }
        };

        apiControls.append(apiWrapper, apiSaveBtn);
        apiSection.appendChild(apiControls);
        modalBody.appendChild(apiSection);

        // Appearance Section
        const appearSection = document.createElement('div');
        appearSection.className = 'ndns-settings-section';
        appearSection.innerHTML = `<label>🎨 Appearance</label>`;

        const appearControls = document.createElement('div');
        appearControls.className = 'ndns-settings-controls';

        // Theme toggle
        const themeRow = document.createElement('div');
        themeRow.className = 'settings-control-row';
        themeRow.innerHTML = `<span>Theme</span>`;
        const themeBtnGroup = document.createElement('div');
        themeBtnGroup.className = 'btn-group';

        const updateThemeBtns = (activeTheme) => {
            lightBtn.classList.toggle('active', activeTheme === 'light');
            darkBtn.classList.toggle('active', activeTheme === 'dark');
            darkBlueBtn.classList.toggle('active', activeTheme === 'darkblue');
        };

        const lightBtn = document.createElement('button');
        lightBtn.textContent = 'Light';
        lightBtn.className = `ndns-panel-button ndns-btn-sm ${currentTheme === 'light' ? 'active' : ''}`;
        lightBtn.onclick = async () => {
            applyTheme('light');
            await storage.set({ [KEY_THEME]: 'light' });
            updateThemeBtns('light');
        };

        const darkBtn = document.createElement('button');
        darkBtn.textContent = 'Dark';
        darkBtn.className = `ndns-panel-button ndns-btn-sm ${currentTheme === 'dark' ? 'active' : ''}`;
        darkBtn.onclick = async () => {
            applyTheme('dark');
            await storage.set({ [KEY_THEME]: 'dark' });
            updateThemeBtns('dark');
        };

        const darkBlueBtn = document.createElement('button');
        darkBlueBtn.textContent = 'Dark Blue';
        darkBlueBtn.className = `ndns-panel-button ndns-btn-sm ${currentTheme === 'darkblue' ? 'active' : ''}`;
        darkBlueBtn.onclick = async () => {
            applyTheme('darkblue');
            await storage.set({ [KEY_THEME]: 'darkblue' });
            updateThemeBtns('darkblue');
        };

        themeBtnGroup.append(lightBtn, darkBtn, darkBlueBtn);
        themeRow.appendChild(themeBtnGroup);
        appearControls.appendChild(themeRow);

        // Toggle options
        const toggleOptions = [
            { key: KEY_ULTRA_CONDENSED, label: 'Compact Mode', get: () => isUltraCondensed, set: async (v) => { applyUltraCondensedMode(v); await storage.set({ [KEY_ULTRA_CONDENSED]: v }); } },
            { key: KEY_LIST_PAGE_THEME, label: 'List Page Theming', get: () => enableListPageTheme, set: async (v) => { enableListPageTheme = v; await storage.set({ [KEY_LIST_PAGE_THEME]: v }); applyListPageTheme(); } },
            { key: KEY_SHORTCUTS_ENABLED, label: 'Keyboard Shortcuts', get: () => shortcutsEnabled, set: async (v) => { shortcutsEnabled = v; await storage.set({ [KEY_SHORTCUTS_ENABLED]: v }); } },
            { key: KEY_SHOW_LOG_COUNTERS, label: 'Show Log Counters', get: () => showLogCounters, set: async (v) => { showLogCounters = v; await storage.set({ [KEY_SHOW_LOG_COUNTERS]: v }); if (v && /\/logs/.test(location.href)) { createLogCounters(); updateLogCounters(); } else if (!v && logCountersElement) { logCountersElement.remove(); logCountersElement = null; } } },
            { key: KEY_COLLAPSE_BLOCKLISTS, label: 'Collapse Blocklists', get: () => collapseBlocklists, set: async (v) => { collapseBlocklists = v; await storage.set({ [KEY_COLLAPSE_BLOCKLISTS]: v }); } },
            { key: KEY_COLLAPSE_TLDS, label: 'Collapse TLD Lists', get: () => collapseTLDs, set: async (v) => { collapseTLDs = v; await storage.set({ [KEY_COLLAPSE_TLDS]: v }); } }
        ];

        toggleOptions.forEach(opt => {
            const row = document.createElement('div');
            row.className = 'settings-control-row';
            row.innerHTML = `<span>${opt.label}</span>`;

            const toggle = document.createElement('div');
            toggle.className = `ndns-toggle-switch ${opt.get() ? 'active' : ''}`;
            toggle.onclick = async () => {
                const newVal = !opt.get();
                await opt.set(newVal);
                toggle.classList.toggle('active', newVal);
            };

            row.appendChild(toggle);
            appearControls.appendChild(row);
        });

        appearSection.appendChild(appearControls);
        modalBody.appendChild(appearSection);

        // Data Management Section
        const dataSection = document.createElement('div');
        dataSection.className = 'ndns-settings-section';
        dataSection.innerHTML = `<label>📦 Data Management</label>`;

        const dataControls = document.createElement('div');
        dataControls.className = 'ndns-settings-controls';

        const exportHostsBtn = document.createElement('button');
        exportHostsBtn.id = 'export-hosts-btn';
        exportHostsBtn.className = 'ndns-panel-button';
        exportHostsBtn.innerHTML = `<span>Export Blocked as HOSTS</span><div class="spinner"></div>`;
        exportHostsBtn.onclick = onDownloadBlockedHosts;

        const exportProfileBtn = document.createElement('button');
        exportProfileBtn.id = 'ndns-export-profile-btn';
        exportProfileBtn.textContent = 'Export Profile';
        exportProfileBtn.className = 'ndns-panel-button';
        exportProfileBtn.onclick = exportProfile;

        const importBtn = document.createElement('button');
        importBtn.textContent = 'Import Hidden List';
        importBtn.className = 'ndns-panel-button';
        importBtn.onclick = async () => {
            const txt = prompt('Paste JSON hidden list:');
            if (txt) try {
                JSON.parse(txt).forEach(d => hiddenDomains.add(d));
                await storage.set({ [KEY_HIDDEN_DOMAINS]: [...hiddenDomains] });
                showToast('Hidden list imported.');
            } catch { showToast('Invalid JSON', true); }
        };

        const exportListBtn = document.createElement('button');
        exportListBtn.textContent = 'Export Hidden List';
        exportListBtn.className = 'ndns-panel-button';
        exportListBtn.onclick = () => {
            downloadFile(JSON.stringify([...hiddenDomains], null, 2), 'hidden_domains.json', 'application/json');
        };

        const clearBtn = document.createElement('button');
        clearBtn.textContent = 'Clear Hidden List';
        clearBtn.className = 'ndns-panel-button danger';
        clearBtn.onclick = async () => {
            if (await clearHiddenDomains()) {
                overlay.style.display = 'none';
            }
        };

        dataControls.append(exportHostsBtn, exportProfileBtn, importBtn, exportListBtn, clearBtn);
        dataSection.appendChild(dataControls);
        modalBody.appendChild(dataSection);

        // HaGeZi Section
        const hageziSection = document.createElement('div');
        hageziSection.className = 'ndns-settings-section';
        hageziSection.innerHTML = `<label>🛡️ HaGeZi TLD Management</label><div class="settings-section-description">Apply or remove TLDs from HaGeZi Spam TLDs list.</div>`;

        const hageziControls = document.createElement('div');
        hageziControls.className = 'ndns-settings-controls';

        const hageziButtons = [
            { text: 'Apply TLD Blocklist', action: 'apply', type: 'tlds', danger: false },
            { text: 'Remove TLD Blocklist', action: 'remove', type: 'tlds', danger: true },
            { text: 'Apply Domain Allowlist', action: 'apply', type: 'allowlist', danger: false },
            { text: 'Remove Domain Allowlist', action: 'remove', type: 'allowlist', danger: true }
        ];

        hageziButtons.forEach(btn => {
            const button = document.createElement('button');
            button.textContent = btn.text;
            button.className = `ndns-panel-button ${btn.danger ? 'danger' : ''}`;
            button.onclick = (e) => manageHageziLists(btn.action, btn.type, e.target);
            hageziControls.appendChild(button);
        });

        hageziSection.appendChild(hageziControls);
        modalBody.appendChild(hageziSection);

        // Keyboard Shortcuts Section
        const kbSection = document.createElement('div');
        kbSection.className = 'ndns-settings-section';
        kbSection.innerHTML = `<label>⌨️ Keyboard Shortcuts</label><div class="settings-section-description">Press <span class="ndns-kbd">?</span> anytime to see all shortcuts.</div>`;
        modalBody.appendChild(kbSection);

        return overlay;
    }

    // --- PANEL CREATION ---
    async function createPanel() {
        if (document.getElementById('ndns-panel-main')) return;

        panel = document.createElement('div');
        panel.id = 'ndns-panel-main';
        panel.className = 'ndns-panel';

        applyPanelWidth(panelWidth);
        panel.addEventListener('mouseenter', () => panel.classList.add('visible'));
        panel.addEventListener('mouseleave', hidePanel);

        // Header
        const header = document.createElement('div');
        header.className = 'ndns-panel-header';
        leftHeaderControls = document.createElement('div');
        leftHeaderControls.className = 'panel-header-controls';
        const titleSpan = document.createElement('span');
        titleSpan.className = 'ndns-header-title';
        titleSpan.textContent = 'NDNS';
        rightHeaderControls = document.createElement('div');
        rightHeaderControls.className = 'panel-header-controls';
        header.append(leftHeaderControls, titleSpan, rightHeaderControls);
        panel.appendChild(header);

        // Header buttons
        settingsButton = document.createElement('button');
        settingsButton.title = 'Settings';
        settingsButton.appendChild(icons.settings.cloneNode(true));
        settingsButton.onclick = () => { if (settingsModal) settingsModal.style.display = 'flex'; };

        togglePosButton = document.createElement('button');
        togglePosButton.onclick = async () => {
            const currentSide = panel.classList.contains('left-side') ? 'left' : 'right';
            await storage.set({ [KEY_POSITION_SIDE]: (currentSide === 'left' ? 'right' : 'left') });
            await applyPanelPosition();
        };

        lockButton = document.createElement('button');
        lockButton.title = 'Lock/Unlock Panel';
        lockButton.onclick = toggleLock;

        // Content
        const content = document.createElement('div');
        content.className = 'ndns-panel-content';
        panel.appendChild(content);

        // --- HIDE HEADER TOGGLE (only on denylist/allowlist) ---
        const hideHeaderSection = document.createElement('div');
        hideHeaderSection.id = 'ndns-section-hideHeader';
        hideHeaderSection.className = 'ndns-section';

        const hideHeaderBtn = document.createElement('button');
        hideHeaderBtn.id = 'toggle-hideHeader';
        hideHeaderBtn.textContent = 'Hide Header';
        hideHeaderBtn.className = `ndns-panel-button ndns-tooltip ${hideHeader ? 'active' : ''}`;
        hideHeaderBtn.dataset.tooltip = 'Hide the NextDNS header and show navigation in panel';
        hideHeaderBtn.onclick = async () => {
            hideHeader = !hideHeader;
            applyHideHeader(hideHeader);
            await storage.set({ [KEY_HIDE_HEADER]: hideHeader });
            hideHeaderBtn.classList.toggle('active', hideHeader);
            updatePanelVisibility();
        };

        hideHeaderSection.appendChild(hideHeaderBtn);
        content.appendChild(hideHeaderSection);

        // --- NAVIGATION LINKS (shown when hideHeader is active) ---
        const navSection = document.createElement('div');
        navSection.id = 'ndns-section-nav';
        navSection.className = 'ndns-section';

        const navLinks = document.createElement('div');
        navLinks.className = 'ndns-nav-links';

        const profileId = getCurrentProfileId();
        const pages = [
            { name: 'Logs', path: 'logs', tooltip: 'View DNS query logs' },
            { name: 'Analytics', path: 'analytics', tooltip: 'View traffic analytics' },
            { name: 'Denylist', path: 'denylist', tooltip: 'Manage blocked domains' },
            { name: 'Allowlist', path: 'allowlist', tooltip: 'Manage allowed domains' },
            { name: 'Security', path: 'security', tooltip: 'Security settings' },
            { name: 'Privacy', path: 'privacy', tooltip: 'Privacy settings' },
            { name: 'Settings', path: 'settings', tooltip: 'Profile settings' },
            { name: 'Setup', path: 'setup', tooltip: 'Setup instructions' }
        ];

        pages.forEach(page => {
            const link = document.createElement('a');
            link.className = `ndns-nav-link ndns-tooltip`;
            link.textContent = page.name;
            link.href = `https://my.nextdns.io/${profileId}/${page.path}`;
            link.dataset.tooltip = page.tooltip;
            link.dataset.path = page.path;

            // Force full page refresh when navigating to logs/denylist/allowlist (only if API key is set)
            if (['logs', 'denylist', 'allowlist', 'analytics'].includes(page.path)) {
                link.onclick = (e) => {
                    if (NDNS_API_KEY) {
                        e.preventDefault();
                        window.location.href = link.href;
                    }
                };
            }

            navLinks.appendChild(link);
        });

        navSection.appendChild(navLinks);
        content.appendChild(navSection);

        // --- LOG ACTION BUTTONS (only on logs page) ---
        const logActionSection = document.createElement('div');
        logActionSection.id = 'ndns-section-logActions';
        logActionSection.className = 'ndns-section';

        const downloadLogBtn = document.createElement('button');
        downloadLogBtn.className = 'ndns-panel-button ndns-tooltip';
        downloadLogBtn.textContent = 'Download Log';
        downloadLogBtn.dataset.tooltip = 'Download all logs as CSV file (Ctrl+Shift+D)';
        downloadLogBtn.onclick = quickDownloadLogs;

        const clearLogBtn = document.createElement('button');
        clearLogBtn.className = 'ndns-panel-button danger ndns-tooltip';
        clearLogBtn.textContent = 'Clear Log';
        clearLogBtn.dataset.tooltip = 'Delete all log entries (Ctrl+Shift+X)';
        clearLogBtn.onclick = quickClearLogs;

        logActionSection.append(downloadLogBtn, clearLogBtn);
        content.appendChild(logActionSection);

        // --- FILTER BUTTONS (only on logs page) ---
        const filterSection = document.createElement('div');
        filterSection.id = 'ndns-section-filters';
        filterSection.className = 'ndns-section';

        const filterButtons = [
            { key: 'hideList', label: 'Hide Hidden', tooltip: 'Hide domains in your hidden list' },
            { key: 'hideBlocked', label: 'Hide Blocked', tooltip: 'Hide blocked queries from log' },
            { key: 'showOnlyWhitelisted', label: 'Show Allowed Only', tooltip: 'Show only allowed queries' }
        ];

        filterButtons.forEach(({ key, label, tooltip }) => {
            const b = document.createElement('button');
            b.id = `toggle-${key}`;
            b.textContent = label;
            b.className = 'ndns-panel-button ndns-tooltip';
            b.dataset.tooltip = tooltip;
            b.onclick = () => toggleFeature(key);
            filterSection.appendChild(b);
        });

        // Native NextDNS toggle: Show Blocked Only
        const blockedOnlyBtn = document.createElement('button');
        blockedOnlyBtn.id = 'toggle-blockedOnly';
        blockedOnlyBtn.textContent = 'Show Blocked Only';
        blockedOnlyBtn.className = 'ndns-panel-button ndns-tooltip';
        blockedOnlyBtn.dataset.tooltip = 'Use NextDNS native filter to show only blocked queries';
        blockedOnlyBtn.onclick = () => toggleNativeCheckbox('blocked-queries-only', 'toggle-blockedOnly');
        filterSection.appendChild(blockedOnlyBtn);

        // Native NextDNS toggle: Raw DNS Logs
        const rawLogsBtn = document.createElement('button');
        rawLogsBtn.id = 'toggle-rawDnsLogs';
        rawLogsBtn.textContent = 'Raw DNS Logs';
        rawLogsBtn.className = 'ndns-panel-button ndns-tooltip';
        rawLogsBtn.dataset.tooltip = 'Show raw DNS logs with more technical details';
        rawLogsBtn.onclick = () => toggleNativeCheckbox('advanced-mode', 'toggle-rawDnsLogs');
        filterSection.appendChild(rawLogsBtn);

        content.appendChild(filterSection);

        // --- AUTO REFRESH (only on logs page) ---
        const autoRefreshSection = document.createElement('div');
        autoRefreshSection.id = 'ndns-section-autoRefresh';
        autoRefreshSection.className = 'ndns-section';

        const autoRefreshBtn = document.createElement('button');
        autoRefreshBtn.id = 'toggle-autoRefresh';
        autoRefreshBtn.textContent = '🔄 Auto Refresh (5s)';
        autoRefreshBtn.className = 'ndns-panel-button ndns-tooltip';
        autoRefreshBtn.dataset.tooltip = 'Automatically refresh logs every 5 seconds';
        autoRefreshBtn.onclick = () => toggleFeature('autoRefresh');

        autoRefreshSection.appendChild(autoRefreshBtn);
        content.appendChild(autoRefreshSection);

        // --- LOAD ALL LOGS BUTTON (only on logs page) ---
        const preloadSection = document.createElement('div');
        preloadSection.id = 'ndns-section-preload';
        preloadSection.className = 'ndns-section';

        const preloadBtn = document.createElement('button');
        preloadBtn.id = 'preload-btn';
        preloadBtn.textContent = 'Load All Logs';
        preloadBtn.className = 'ndns-panel-button ndns-tooltip';
        preloadBtn.dataset.tooltip = 'Scroll and load all available log entries';
        preloadBtn.onclick = () => autoScrollLog();

        preloadSection.appendChild(preloadBtn);
        content.appendChild(preloadSection);

        // --- BULK DELETE SECTION (only on denylist/allowlist pages) ---
        const bulkDeleteSection = document.createElement('div');
        bulkDeleteSection.id = 'ndns-section-bulkDelete';
        bulkDeleteSection.className = 'ndns-section';

        const bulkDeleteBtn = document.createElement('button');
        bulkDeleteBtn.id = 'bulk-delete-btn';
        bulkDeleteBtn.textContent = '🗑️ Bulk Delete';
        bulkDeleteBtn.className = 'ndns-panel-button danger ndns-tooltip';
        bulkDeleteBtn.dataset.tooltip = 'Delete entries in batches (rate limit safe)';
        bulkDeleteBtn.onclick = startBulkDelete;

        const stopBulkDeleteBtn = document.createElement('button');
        stopBulkDeleteBtn.id = 'stop-bulk-delete-btn';
        stopBulkDeleteBtn.textContent = '⏹️ Stop Deleting';
        stopBulkDeleteBtn.className = 'ndns-panel-button warning ndns-tooltip';
        stopBulkDeleteBtn.dataset.tooltip = 'Stop the bulk delete process';
        stopBulkDeleteBtn.style.display = 'none';
        stopBulkDeleteBtn.onclick = stopBulkDelete;

        const bulkDeleteStatus = document.createElement('div');
        bulkDeleteStatus.id = 'bulk-delete-status';
        bulkDeleteStatus.className = 'ndns-stats-row';
        bulkDeleteStatus.style.display = 'none';
        bulkDeleteStatus.innerHTML = '<span class="ndns-stats-label">Status:</span><span class="ndns-stats-value">Idle</span>';

        bulkDeleteSection.append(bulkDeleteBtn, stopBulkDeleteBtn, bulkDeleteStatus);
        content.appendChild(bulkDeleteSection);

        // --- PANEL FOOTER ---
        const footer = document.createElement('div');
        footer.className = 'ndns-panel-footer';
        footer.textContent = 'NDNS v3.2';
        panel.appendChild(footer);

        document.body.appendChild(panel);

        // --- PANEL VISIBILITY FUNCTION ---
        // Updates which sections are visible based on current page and hideHeader state
        function updatePanelVisibility() {
            const currentPath = location.pathname;
            const isLogsPage = currentPath.includes('/logs');
            const isListPage = /\/denylist|\/allowlist/.test(currentPath);

            // Get section elements
            const hideHeaderSection = document.getElementById('ndns-section-hideHeader');
            const navSection = document.getElementById('ndns-section-nav');
            const logActionSection = document.getElementById('ndns-section-logActions');
            const filterSection = document.getElementById('ndns-section-filters');
            const autoRefreshSection = document.getElementById('ndns-section-autoRefresh');
            const preloadSection = document.getElementById('ndns-section-preload');
            const bulkDeleteSection = document.getElementById('ndns-section-bulkDelete');

            // Hide Header button: show on all pages (globally)
            if (hideHeaderSection) {
                hideHeaderSection.style.display = '';
            }

            // Navigation: only when hideHeader is active (globally)
            if (navSection) {
                navSection.style.display = hideHeader ? '' : 'none';

                // Update active nav link
                const navLinks = navSection.querySelectorAll('.ndns-nav-link');
                navLinks.forEach(link => {
                    const linkPath = link.dataset.path;
                    link.classList.toggle('active', currentPath.includes(`/${linkPath}`));
                });
            }

            // Log page sections: only on logs page
            if (logActionSection) {
                logActionSection.style.display = isLogsPage ? '' : 'none';
            }
            if (filterSection) {
                filterSection.style.display = isLogsPage ? '' : 'none';
            }
            if (autoRefreshSection) {
                autoRefreshSection.style.display = isLogsPage ? '' : 'none';
            }
            if (preloadSection) {
                preloadSection.style.display = isLogsPage ? '' : 'none';
            }

            // Bulk Delete: only on denylist/allowlist pages
            if (bulkDeleteSection) {
                bulkDeleteSection.style.display = isListPage ? '' : 'none';
            }
        }

        // Call immediately
        updatePanelVisibility();

        // Store reference globally for use elsewhere
        window.ndnsUpdatePanelVisibility = updatePanelVisibility;

        // --- URL CHANGE OBSERVER ---
        // Watch for URL changes (SPA navigation) and force refresh on specific pages
        let lastUrl = location.href;
        const REFRESH_PAGES_PATTERN = /\/(logs|denylist|allowlist|analytics)$/;
        const REFRESH_MARKER_KEY = 'ndns_page_refreshed';

        function handleUrlChange() {
            const currentUrl = location.href;
            if (currentUrl === lastUrl) return;

            const oldUrl = lastUrl;
            lastUrl = currentUrl;
            updatePanelVisibility();

            // Check if we navigated TO a page that needs refresh (logs/denylist/allowlist)
            // Only refresh if API key is set (onboarding complete) and we didn't just refresh
            if (NDNS_API_KEY && REFRESH_PAGES_PATTERN.test(currentUrl)) {
                const refreshMarker = sessionStorage.getItem(REFRESH_MARKER_KEY);
                const markerData = refreshMarker ? JSON.parse(refreshMarker) : null;

                // Check if we already refreshed this exact URL recently (within 2 seconds)
                if (!markerData || markerData.url !== currentUrl || Date.now() - markerData.time > 2000) {
                    // Set marker before refresh to prevent loop
                    sessionStorage.setItem(REFRESH_MARKER_KEY, JSON.stringify({
                        url: currentUrl,
                        time: Date.now()
                    }));
                    // Force full page refresh
                    window.location.reload();
                    return;
                }
            }
        }

        const urlObserver = new MutationObserver(handleUrlChange);
        urlObserver.observe(document.body, { childList: true, subtree: true });

        // Also listen for popstate (browser back/forward)
        window.addEventListener('popstate', handleUrlChange);

        // Periodic check as backup (every 500ms)
        setInterval(handleUrlChange, 500);

        // Drag functionality (vertical)
        header.addEventListener('mousedown', function(e) {
            if (e.target.closest('.panel-header-controls')) return;
            let offsetY = e.clientY - panel.getBoundingClientRect().top;
            const mouseMoveHandler = (e) => panel.style.top = (e.clientY - offsetY) + 'px';
            const mouseUpHandler = async () => {
                document.removeEventListener('mousemove', mouseMoveHandler);
                document.removeEventListener('mouseup', mouseUpHandler);
                await storage.set({ [KEY_POSITION_TOP]: panel.style.top });
            };
            document.addEventListener('mousemove', mouseMoveHandler);
            document.addEventListener('mouseup', mouseUpHandler);
        });

        // Resize functionality (horizontal via blue edge)
        let isResizing = false;
        panel.addEventListener('mousedown', async function(e) {
            const rect = panel.getBoundingClientRect();
            const isRightSide = panel.classList.contains('right-side');
            const edgeSize = 12; // Blue border is 8px + some tolerance

            // Check if clicking on the edge (blue border area)
            let onEdge = false;
            if (isRightSide) {
                onEdge = e.clientX <= rect.left + edgeSize;
            } else {
                onEdge = e.clientX >= rect.right - edgeSize;
            }

            if (!onEdge) return;

            e.preventDefault();
            isResizing = true;
            panel.style.cursor = 'ew-resize';
            document.body.style.cursor = 'ew-resize';
            document.body.style.userSelect = 'none';

            const startX = e.clientX;
            const startWidth = panelWidth;

            const resizeMoveHandler = (e) => {
                if (!isResizing) return;
                let newWidth;
                if (isRightSide) {
                    newWidth = startWidth + (startX - e.clientX);
                } else {
                    newWidth = startWidth + (e.clientX - startX);
                }
                newWidth = Math.max(140, Math.min(500, newWidth));
                applyPanelWidth(newWidth);
            };

            const resizeUpHandler = async () => {
                isResizing = false;
                panel.style.cursor = '';
                document.body.style.cursor = '';
                document.body.style.userSelect = '';
                document.removeEventListener('mousemove', resizeMoveHandler);
                document.removeEventListener('mouseup', resizeUpHandler);
                await storage.set({ [KEY_WIDTH]: panelWidth });
            };

            document.addEventListener('mousemove', resizeMoveHandler);
            document.addEventListener('mouseup', resizeUpHandler);
        });
    }

    function initAllowDenyListPage() {
        const listType = location.pathname.includes('/denylist') ? 'denylist' : 'allowlist';

        // --- Inject page-specific CSS for denylist/allowlist ---
        if (!document.getElementById('ndns-list-page-css')) {
            const listPageStyles = document.createElement('style');
            listPageStyles.id = 'ndns-list-page-css';
            listPageStyles.textContent = `
                /* Denylist/Allowlist page-specific styles */
                .list-group-item .remove-list-item-btn { display: none !important; }
                .ndns-description-input { text-align: right; }
                .list-group-item span.notranslate { width: 1000px; display: inline-block; }
                button.ndns-multi-domain-btn { margin-left: 15px; }
            `;
            document.head.appendChild(listPageStyles);
        }

        // --- Helper: Extract root domain ---
        function extractRootDomainFromFull(domain) {
            const parts = domain.replace(/^\*\./, '').split('.');
            if (parts.length <= 2) return domain.replace(/^\*\./, '');
            let rootDomain = parts[parts.length - 2];
            if (SLDs.includes(rootDomain) && parts.length > 2) {
                rootDomain = parts[parts.length - 3] + '.' + rootDomain;
            }
            return rootDomain + '.' + parts[parts.length - 1];
        }

        // --- Helper: Style domain with bold root / lighten subdomain ---
        function styleDomainElement(domainEl) {
            if (!domainEl || domainEl.dataset.ndnsStyled) return;
            domainEl.dataset.ndnsStyled = 'true';

            const fullDomain = domainEl.textContent.trim();
            const hasWildcard = fullDomain.startsWith('*.');
            const cleanDomain = fullDomain.replace(/^\*\./, '');
            const rootDomain = extractRootDomainFromFull(cleanDomain);
            const subdomain = cleanDomain.replace(rootDomain, '').replace(/\.$/, '');

            domainEl.innerHTML = '';

            if (hasWildcard) {
                const wildcardSpan = document.createElement('span');
                wildcardSpan.className = 'ndns-wildcard';
                wildcardSpan.textContent = '*.';
                domainEl.appendChild(wildcardSpan);
            }

            if (subdomain && listLightenSub) {
                const subSpan = document.createElement('span');
                subSpan.className = 'ndns-subdomain';
                subSpan.textContent = subdomain;
                domainEl.appendChild(subSpan);
            } else if (subdomain) {
                domainEl.appendChild(document.createTextNode(subdomain));
            }

            if (listBoldRoot) {
                const rootSpan = document.createElement('span');
                rootSpan.className = 'ndns-root-domain';
                rootSpan.textContent = rootDomain;
                domainEl.appendChild(rootSpan);
            } else {
                domainEl.appendChild(document.createTextNode(rootDomain));
            }
        }

        // --- Helper: Sort domains A-Z ---
        function sortDomainsAZ() {
            const listGroup = document.querySelector('.list-group:nth-child(2)');
            if (!listGroup) return;

            const items = Array.from(listGroup.querySelectorAll('.list-group-item'));
            const header = items.shift(); // Keep first item (input row) at top

            items.sort((a, b) => {
                const domainA = a.querySelector('.notranslate')?.textContent.toLowerCase().replace(/^\*\./, '') || '';
                const domainB = b.querySelector('.notranslate')?.textContent.toLowerCase().replace(/^\*\./, '') || '';

                const partsA = domainA.split('.');
                const partsB = domainB.split('.');

                // Sort TLDs first if enabled
                if (listSortTLD) {
                    const tldA = partsA[partsA.length - 1] || '';
                    const tldB = partsB[partsB.length - 1] || '';
                    if (tldA !== tldB) return tldA.localeCompare(tldB);
                }

                // Then sort by root domain
                let levelA = partsA.length - (listSortTLD ? 1 : 2);
                let levelB = partsB.length - (listSortTLD ? 1 : 2);

                if (levelA < 0) levelA = 0;
                if (levelB < 0) levelB = 0;

                let rootA = partsA[levelA] || '';
                let rootB = partsB[levelB] || '';

                // Handle SLDs
                if (SLDs.includes(rootA) && levelA > 0) rootA = partsA[--levelA] || rootA;
                if (SLDs.includes(rootB) && levelB > 0) rootB = partsB[--levelB] || rootB;

                return rootA.localeCompare(rootB);
            });

            // Re-append in sorted order
            if (header) listGroup.appendChild(header);
            items.forEach(item => listGroup.appendChild(item));
        }

        // --- Helper: Add description input to domain item ---
        function addDescriptionInput(item) {
            if (item.querySelector('.ndns-description-input')) return;

            const domainEl = item.querySelector('.notranslate');
            if (!domainEl) return;

            const domain = domainEl.textContent.trim().replace(/^\*\./, '');
            const container = domainEl.closest('.d-flex') || domainEl.parentElement;

            const descInput = document.createElement('input');
            descInput.className = 'ndns-description-input';
            descInput.placeholder = 'Add description (Enter to save)';
            descInput.value = domainDescriptions[domain] || '';
            if (descInput.value) descInput.classList.add('has-value');

            descInput.onkeypress = async (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    domainDescriptions[domain] = descInput.value;
                    await storage.set({ [KEY_DOMAIN_DESCRIPTIONS]: domainDescriptions });
                    descInput.blur();
                    if (descInput.value) {
                        descInput.classList.add('has-value');
                    } else {
                        descInput.classList.remove('has-value');
                    }
                    showToast('Description saved!', false, 1500);
                }
            };

            descInput.onblur = async () => {
                domainDescriptions[domain] = descInput.value;
                await storage.set({ [KEY_DOMAIN_DESCRIPTIONS]: domainDescriptions });
                if (descInput.value) {
                    descInput.classList.add('has-value');
                } else {
                    descInput.classList.remove('has-value');
                }
            };

            // Insert after the domain text
            if (container.querySelector('.d-flex')) {
                container.querySelector('.d-flex').appendChild(descInput);
            } else {
                container.appendChild(descInput);
            }
        }

        // --- Create Options Menu ---
        function createOptionsMenu() {
            if (document.getElementById('ndns-options-btn')) return;

            const listGroup = document.querySelector('.list-group');
            const firstItem = listGroup?.querySelector('.list-group-item');
            if (!firstItem) return;

            // Options button
            const optionsBtn = document.createElement('button');
            optionsBtn.id = 'ndns-options-btn';
            optionsBtn.className = 'ndns-options-btn';
            optionsBtn.innerHTML = '⚙️';
            optionsBtn.title = 'List Options';
            optionsBtn.style.cssText = 'position: absolute; right: 15px; top: 15px; z-index: 10;';

            // Options container
            const optionsContainer = document.createElement('div');
            optionsContainer.id = 'ndns-options-container';
            optionsContainer.className = 'ndns-options-container';

            // Create switches
            const switches = [
                { id: 'sortAZ', label: 'Sort A-Z by root domain', checked: listSortAZ, key: KEY_LIST_SORT_AZ, var: 'listSortAZ' },
                { id: 'sortTLD', label: 'Sort by TLD', checked: listSortTLD, key: KEY_LIST_SORT_TLD, var: 'listSortTLD' },
                { id: 'boldRoot', label: 'Bold root domain', checked: listBoldRoot, key: KEY_LIST_BOLD_ROOT, var: 'listBoldRoot' },
                { id: 'lightenSub', label: 'Lighten subdomains', checked: listLightenSub, key: KEY_LIST_LIGHTEN_SUB, var: 'listLightenSub' },
                { id: 'rightAlign', label: 'Right-align domains', checked: listRightAlign, key: KEY_LIST_RIGHT_ALIGN, var: 'listRightAlign' },
                { id: 'multiInput', label: 'Multi-domain input', checked: multiDomainInput, key: KEY_MULTI_DOMAIN_INPUT, var: 'multiDomainInput' }
            ];

            switches.forEach(sw => {
                const switchDiv = document.createElement('div');
                switchDiv.className = 'ndns-switch';

                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.id = 'ndns-' + sw.id;
                checkbox.checked = sw.checked;

                const label = document.createElement('label');
                label.htmlFor = 'ndns-' + sw.id;
                label.textContent = sw.label;

                checkbox.onchange = async () => {
                    await storage.set({ [sw.key]: checkbox.checked });
                    // Update local variable
                    if (sw.var === 'listSortAZ') listSortAZ = checkbox.checked;
                    else if (sw.var === 'listSortTLD') listSortTLD = checkbox.checked;
                    else if (sw.var === 'listBoldRoot') listBoldRoot = checkbox.checked;
                    else if (sw.var === 'listLightenSub') listLightenSub = checkbox.checked;
                    else if (sw.var === 'listRightAlign') listRightAlign = checkbox.checked;
                    else if (sw.var === 'multiDomainInput') {
                        multiDomainInput = checkbox.checked;
                        if (checkbox.checked) createMultiDomainInput();
                        else document.querySelector('.ndns-multi-domain-container')?.remove();
                    }

                    // Apply changes
                    if (sw.var.includes('Sort')) {
                        if (listSortAZ || listSortTLD) sortDomainsAZ();
                    }
                    if (sw.var.includes('bold') || sw.var.includes('lighten')) {
                        document.querySelectorAll('.list-group-item .notranslate').forEach(el => {
                            el.dataset.ndnsStyled = '';
                            styleDomainElement(el);
                        });
                    }
                    if (sw.var === 'listRightAlign') {
                        document.querySelectorAll('.list-group-item').forEach(item => {
                            if (listRightAlign) item.classList.add('ndns-right-align');
                            else item.classList.remove('ndns-right-align');
                        });
                    }
                };

                switchDiv.appendChild(checkbox);
                switchDiv.appendChild(label);
                optionsContainer.appendChild(switchDiv);
            });

            // Toggle options
            optionsBtn.onclick = (e) => {
                e.stopPropagation();
                optionsContainer.classList.toggle('show');
            };

            document.body.onclick = () => optionsContainer.classList.remove('show');
            optionsContainer.onclick = (e) => e.stopPropagation();

            firstItem.style.position = 'relative';
            firstItem.appendChild(optionsBtn);
            firstItem.appendChild(optionsContainer);
        }

        // --- Create Multi-Domain Input ---
        function createMultiDomainInput() {
            if (!multiDomainInput) return;
            if (document.querySelector('.ndns-multi-domain-container')) return;

            const listGroup = document.querySelector('.list-group');
            if (!listGroup) return;

            const container = document.createElement('div');
            container.className = 'ndns-multi-domain-container';

            const textarea = document.createElement('textarea');
            textarea.className = 'ndns-multi-domain-textarea';
            textarea.placeholder = `Add multiple domains to ${listType} (one per line).\nPress Enter or click Add button to submit.`;

            const btnRow = document.createElement('div');
            btnRow.style.display = 'flex';
            btnRow.style.alignItems = 'center';

            const addBtn = document.createElement('button');
            addBtn.className = 'ndns-multi-domain-btn';
            addBtn.textContent = `Add to ${listType}`;

            const progressText = document.createElement('span');
            progressText.className = 'ndns-progress-text';

            async function addDomains() {
                const domains = textarea.value.split('\n')
                    .map(d => d.trim())
                    .filter(d => d && !d.startsWith('#'));

                if (domains.length === 0) return;

                addBtn.disabled = true;
                let added = 0, failed = 0;

                for (let i = 0; i < domains.length; i++) {
                    const domain = domains[i];
                    progressText.textContent = `Adding ${i + 1}/${domains.length}: ${domain}`;

                    try {
                        const pid = getCurrentProfileId();
                        await makeApiRequest('POST', `/profiles/${pid}/${listType}`, { id: domain, active: true }, NDNS_API_KEY);
                        added++;
                        await new Promise(r => setTimeout(r, 300)); // Rate limit
                    } catch (e) {
                        failed++;
                    }
                }

                addBtn.disabled = false;
                progressText.textContent = '';
                textarea.value = '';
                showToast(`Added ${added} domain(s)${failed ? `, ${failed} failed` : ''}`, failed > 0);

                // Refresh the page to show new domains
                if (added > 0) {
                    setTimeout(() => location.reload(), 1000);
                }
            }

            addBtn.onclick = addDomains;
            textarea.onkeydown = (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    addDomains();
                }
            };

            btnRow.appendChild(addBtn);
            btnRow.appendChild(progressText);
            container.appendChild(textarea);
            container.appendChild(btnRow);

            listGroup.insertBefore(container, listGroup.firstChild);
        }

        // --- Main enhancement function ---
        const enhanceDomainItems = () => {
            document.querySelectorAll(".list-group-item").forEach(item => {
                const domainEl = item.querySelector('.notranslate');
                if (!domainEl) return;

                // Style domain
                styleDomainElement(domainEl);

                // Add description input
                addDescriptionInput(item);

                // Apply right align if enabled
                if (listRightAlign) item.classList.add('ndns-right-align');
            });

            // Sort if enabled
            if (listSortAZ || listSortTLD) sortDomainsAZ();
        };

        // Wait for list to load then enhance
        const waitForList = setInterval(() => {
            const items = document.querySelectorAll('.list-group-item');
            if (items.length > 1) {
                clearInterval(waitForList);
                createOptionsMenu();
                createMultiDomainInput();
                enhanceDomainItems();

                // Observer for dynamic changes
                const observer = new MutationObserver(enhanceDomainItems);
                const targetNode = document.querySelector('.list-group');
                if (targetNode) {
                    observer.observe(targetNode, { childList: true, subtree: true });
                }
            }
        }, 200);
    }

    // --- NDNS: Log Counters ---
    let logCountersElement = null;
    let visibleCount = 0, filteredCount = 0, totalCount = 0;

    function createLogCounters() {
        if (!showLogCounters || logCountersElement) return;

        const logsContainer = document.querySelector('.Logs .list-group');
        if (!logsContainer) return;

        logCountersElement = document.createElement('div');
        logCountersElement.className = 'ndns-log-counters';
        logCountersElement.innerHTML = `
            <span>Visible: <span class="counter-value visible-count">0</span></span>
            <span>Filtered: <span class="counter-value filtered-count">0</span></span>
            <span>Total: <span class="counter-value total-count">0</span></span>
        `;

        logsContainer.parentElement.insertBefore(logCountersElement, logsContainer);
    }

    function updateLogCounters() {
        if (!logCountersElement) return;

        const allLogs = document.querySelectorAll('.Logs .list-group .log, .Logs .list-group .list-group-item:not(:first-child)');
        totalCount = allLogs.length;
        visibleCount = Array.from(allLogs).filter(el => el.style.display !== 'none').length;
        filteredCount = totalCount - visibleCount;

        const visibleEl = logCountersElement.querySelector('.visible-count');
        const filteredEl = logCountersElement.querySelector('.filtered-count');
        const totalEl = logCountersElement.querySelector('.total-count');

        if (visibleEl) visibleEl.textContent = visibleCount;
        if (filteredEl) filteredEl.textContent = filteredCount;
        if (totalEl) totalEl.textContent = totalCount;
    }

    // --- NDNS: Privacy Page - Collapsible Blocklists ---
    function initPrivacyPageEnhancements() {
        const waitForBlocklists = setInterval(() => {
            const listGroups = document.querySelectorAll('.list-group');
            let blocklistGroup = null;

            listGroups.forEach(lg => {
                if (lg.querySelector('.list-group-item')?.textContent.includes('blocklist')) {
                    blocklistGroup = lg;
                }
            });

            // Find blocklist section by looking for list with toggle switches
            const sections = document.querySelectorAll('.card, .list-group');
            sections.forEach(section => {
                const header = section.querySelector('.list-group-item');
                const items = section.querySelectorAll('.list-group-item');

                if (items.length > 3 && !section.querySelector('.ndns-collapse-btn')) {
                    // Check if this is the blocklist section (has many items with checkboxes)
                    const hasCheckboxes = section.querySelectorAll('input[type="checkbox"], .form-check').length > 2;
                    if (!hasCheckboxes) return;

                    const collapseContainer = document.createElement('div');
                    collapseContainer.className = 'ndns-collapse-container';

                    const collapseBtn = document.createElement('button');
                    collapseBtn.className = 'ndns-collapse-btn';
                    collapseBtn.textContent = collapseBlocklists ? 'Show list' : 'Hide list';

                    const alwaysCollapseLabel = document.createElement('label');
                    alwaysCollapseLabel.className = 'ndns-always-collapse';
                    const alwaysCollapseCheckbox = document.createElement('input');
                    alwaysCollapseCheckbox.type = 'checkbox';
                    alwaysCollapseCheckbox.checked = collapseBlocklists;
                    alwaysCollapseLabel.appendChild(alwaysCollapseCheckbox);
                    alwaysCollapseLabel.appendChild(document.createTextNode(' Always collapse'));

                    const toggleItems = (hide) => {
                        Array.from(items).slice(1).forEach(item => {
                            item.style.display = hide ? 'none' : '';
                        });
                        collapseBtn.textContent = hide ? 'Show list' : 'Hide list';
                    };

                    collapseBtn.onclick = () => {
                        const isHidden = items[1]?.style.display === 'none';
                        toggleItems(!isHidden);
                    };

                    alwaysCollapseCheckbox.onchange = async () => {
                        collapseBlocklists = alwaysCollapseCheckbox.checked;
                        await storage.set({ [KEY_COLLAPSE_BLOCKLISTS]: collapseBlocklists });
                    };

                    collapseContainer.appendChild(collapseBtn);
                    collapseContainer.appendChild(alwaysCollapseLabel);

                    if (header) {
                        header.appendChild(collapseContainer);
                        if (collapseBlocklists) toggleItems(true);
                    }
                }
            });

            if (document.querySelector('.ndns-collapse-btn')) {
                clearInterval(waitForBlocklists);
            }
        }, 500);

        // Clear after 10 seconds to prevent infinite loop
        setTimeout(() => clearInterval(waitForBlocklists), 10000);
    }

    // --- NDNS: Security Page - Collapsible TLDs ---
    function initSecurityPageEnhancements() {
        const waitForTLDs = setInterval(() => {
            const listGroups = document.querySelectorAll('.list-group');

            listGroups.forEach(section => {
                const items = section.querySelectorAll('.list-group-item');

                // Look for TLD list (items that look like .xyz, .top, etc.)
                const hasTLDs = Array.from(items).some(item => {
                    const text = item.textContent.trim();
                    return /^\.[a-z]{2,10}$/i.test(text.split(' ')[0]);
                });

                if (hasTLDs && items.length > 3 && !section.querySelector('.ndns-collapse-btn')) {
                    const header = items[0];

                    const collapseContainer = document.createElement('div');
                    collapseContainer.className = 'ndns-collapse-container';

                    const collapseBtn = document.createElement('button');
                    collapseBtn.className = 'ndns-collapse-btn';
                    collapseBtn.textContent = collapseTLDs ? 'Show list' : 'Hide list';

                    const alwaysCollapseLabel = document.createElement('label');
                    alwaysCollapseLabel.className = 'ndns-always-collapse';
                    const alwaysCollapseCheckbox = document.createElement('input');
                    alwaysCollapseCheckbox.type = 'checkbox';
                    alwaysCollapseCheckbox.checked = collapseTLDs;
                    alwaysCollapseLabel.appendChild(alwaysCollapseCheckbox);
                    alwaysCollapseLabel.appendChild(document.createTextNode(' Always collapse'));

                    const toggleItems = (hide) => {
                        Array.from(items).slice(1).forEach(item => {
                            item.style.display = hide ? 'none' : '';
                        });
                        collapseBtn.textContent = hide ? 'Show list' : 'Hide list';
                    };

                    collapseBtn.onclick = () => {
                        const isHidden = items[1]?.style.display === 'none';
                        toggleItems(!isHidden);
                    };

                    alwaysCollapseCheckbox.onchange = async () => {
                        collapseTLDs = alwaysCollapseCheckbox.checked;
                        await storage.set({ [KEY_COLLAPSE_TLDS]: collapseTLDs });
                    };

                    collapseContainer.appendChild(collapseBtn);
                    collapseContainer.appendChild(alwaysCollapseLabel);

                    header.appendChild(collapseContainer);
                    if (collapseTLDs) toggleItems(true);
                }
            });

            if (document.querySelector('.ndns-collapse-btn')) {
                clearInterval(waitForTLDs);
            }
        }, 500);

        setTimeout(() => clearInterval(waitForTLDs), 10000);
    }

    // --- MAIN FUNCTION ---
    async function main() {
        await initializeState();
        applyTheme(currentTheme);
        applyUltraCondensedMode(isUltraCondensed);
        applyListPageTheme();
        applyHideHeader(hideHeader);
        setupKeyboardShortcuts();

        const isLoggedIn = !document.querySelector('form[action="#submit"]');

        const profileIdFromUrl = getProfileID();
        if (profileIdFromUrl) {
            globalProfileId = profileIdFromUrl;
            await storage.set({ [KEY_PROFILE_ID]: profileIdFromUrl });
        }

        if (!isLoggedIn) {
            if (location.pathname === '/login' || location.pathname === '/signup') {
                createLoginSpotlight();
            } else if (location.pathname === '/') {
                window.location.href = 'https://my.nextdns.io/login';
            }
            return;
        }

        if (location.pathname.includes('/account')) {
            handleAccountPage();
            return;
        }

        if (sessionStorage.getItem('ndns_needs_refresh')) {
            sessionStorage.removeItem('ndns_needs_refresh');
            location.reload();
        }

        let lastUrl = location.href;
        const themeObserver = new MutationObserver(() => {
            if (location.href !== lastUrl) {
                lastUrl = location.href;
                applyListPageTheme();
            }
        });
        themeObserver.observe(document.body, { childList: true, subtree: true });

        if (globalProfileId) {
            sessionStorage.setItem('ndns_profile_id', globalProfileId);
            await createPanel();
            settingsModal = buildSettingsModal();
            document.body.appendChild(settingsModal);

            if (sessionStorage.getItem('ndns_reopen_settings')) {
                sessionStorage.removeItem('ndns_reopen_settings');
                setTimeout(() => {
                    if (settingsModal) settingsModal.style.display = 'flex';
                }, 500);
            }

            const returnFlag = await storage.get(['ndns_return_from_account']);
            if (returnFlag.ndns_return_from_account) {
                await finalizeApiKeySetup();
                return;
            }

            if (!NDNS_API_KEY) {
                showOnboardingModal();
                return;
            }

            await applyPanelPosition();
            updateButtonStates();
            updateLockIcon();
            updatePanelBorderColor();

            if (filters.autoRefresh) startAutoRefresh();

            if (/\/logs/.test(location.href)) {
                const initialLogCheck = () => {
                    if (document.querySelector('div.list-group-item.log')) {
                        cleanLogs();
                        observeLogs();
                        initNativeToggleStates();
                        replaceStreamButtonIcon();
                        // NDNS: Log counters
                        if (showLogCounters) {
                            createLogCounters();
                            updateLogCounters();
                            // Update counters when logs change (childList only, not attributes to avoid loops)
                            const logsContainer = document.querySelector('.Logs .list-group');
                            if (logsContainer) {
                                const counterObserver = new MutationObserver(updateLogCounters);
                                counterObserver.observe(logsContainer, { childList: true, subtree: true });
                            }
                        }
                        return true;
                    }
                    return false;
                };
                if (!initialLogCheck()) {
                    const observer = new MutationObserver(() => {
                        if (initialLogCheck()) {
                            observer.disconnect();
                        }
                    });
                    observer.observe(document.body, { childList: true, subtree: true });
                }
            }

            if (/\/denylist|\/allowlist/.test(location.href)) {
                initAllowDenyListPage();
                checkBulkDeleteResume();
            }

            // NDNS: Privacy page enhancements
            if (/\/privacy/.test(location.href)) {
                initPrivacyPageEnhancements();
            }

            // NDNS: Security page enhancements
            if (/\/security/.test(location.href)) {
                initSecurityPageEnhancements();
            }
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', main);
    } else {
        main();
    }
})();