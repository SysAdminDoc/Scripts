// ==UserScript==
// @name         GeminiBuddy Ultimate Edition v100
// @namespace    https://github.com/SysAdminDoc/GeminiBuddy
// @version      100.0
// @description  Ultimate Gemini enhancement: Advanced prompt management, chat history, themes, version control, and more!
// @author       Matthew Parker, Gemini & Claude
// @match        https://gemini.google.com/*
// @grant        GM_addStyle
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_xmlhttpRequest
// @connect      api.github.com
// @connect      gist.githubusercontent.com
// @connect      raw.githubusercontent.com
// @run-at       document-idle
// @license      MIT
// ==/UserScript==

(function() {
    'use strict';

    // ═══════════════════════════════════════════════════════════════════════════════
    // EXECUTION GUARD
    // ═══════════════════════════════════════════════════════════════════════════════
    if (window.geminiPanelEnhanced) return;
    window.geminiPanelEnhanced = true;
    console.log('GeminiBuddy Ultimate v100.0 loaded - All Features Enabled');

    // ═══════════════════════════════════════════════════════════════════════════════
    // CONSTANTS & CONFIGURATION
    // ═══════════════════════════════════════════════════════════════════════════════
    const DEFAULT_PROMPTS_URL = "https://raw.githubusercontent.com/SysAdminDoc/Gemini-Prompt-Panel/refs/heads/main/Prompts/defaultpromptlist.json";
    const GM_PROMPTS_KEY = 'gemini_custom_prompts_ultimate_v7';
    const GM_SETTINGS_KEY = 'gemini_panel_settings_ultimate_v7';
    const GM_HISTORY_KEY = 'gemini_prompt_history_v2';
    const GM_CHAT_CACHE_KEY = 'gemini_chat_cache_v2';
    const FULL_WIDTH_STYLE_ID = 'gemini-panel-full-width-style';
    const CACHE_DURATION_MS = 24 * 60 * 60 * 1000;
    const THINKING_CHECK_INTERVAL = 1000;
    const UI_STATE_CHECK_INTERVAL = 500;
    const NAV_UPDATE_DEBOUNCE = 300;
    const TARGET_MODEL = "Thinking";

    // ═══════════════════════════════════════════════════════════════════════════════
    // STATE VARIABLES
    // ═══════════════════════════════════════════════════════════════════════════════
    let currentPrompts = {};
    let promptHistory = {};
    let chatCache = [];
    let searchQuery = '';
    let isScraping = false;
    let isConfigMode = false;
    let selectedChatIndices = new Set();
    let userMsgCounter = 0;
    let navUpdateTimeout = null;
    let lastFetchedUrl = null;
    let isManuallyLocked = false;
    let isFormActiveLock = false;
    let generationObserver = null;
    let isGenerating = false;
    let draggedItem = null;

    const processedPres = new WeakSet();

    // ═══════════════════════════════════════════════════════════════════════════════
    // DEFAULT SETTINGS
    // ═══════════════════════════════════════════════════════════════════════════════
    const defaultSettings = {
        // Panel & Position
        position: 'left',
        panelWidth: 320,
        topOffset: '0px',
        handleWidth: 8,
        handleStyle: 'classic',

        // Theme & Appearance
        themeName: 'dark',
        fontFamily: 'Segoe UI, Roboto, Helvetica, Arial, sans-serif',
        baseFontSize: '14px',
        condensedMode: false,

        // Features
        enableFullWidth: true,
        enableMiniMode: false,
        selectedMode: 'none',
        navigatorPinnedToSidebar: false,
        navigatorPosition: { x: null, y: 60 },
        navigatorSize: { width: 280, height: 400 },
        showTags: true,
        showPins: true,
        wideMode: true,
        enhanceCode: true,
        autoCopyCodeOnCompletion: false,

        // Prompt Organization
        groupByTags: false,
        collapsedCategories: [],
        initiallyCollapsed: false,
        groupOrder: [],
        tagOrder: [],
        groupColors: {},

        // Favorites & Pins
        favorites: [],
        pinnedTitles: [],
        pinnedPromptIds: [],

        // Sync & External
        gistURL: '',

        // Behavior
        alwaysThinking: false,
        copyButtonOrderSwapped: false,
        reducedMotion: false,

        // Navigator
        showNavigator: true,
        navigatorExpanded: true,
        promptsExpanded: false,

        // Colors (Dark theme default)
        colors: {
            '--panel-bg': '#2a2a2e',
            '--panel-text': '#e0e0e0',
            '--panel-header-bg': '#3a3a3e',
            '--panel-border': '#4a4a4e',
            '--input-bg': '#3c3c41',
            '--input-text': '#f0f0f0',
            '--input-border': '#5a5a5e',
            '--handle-color': '#28a745',
            '--handle-hover-color': '#34c759',
            '--favorite-color': '#FFD700',
            '--pin-color': '#34c759'
        }
    };

    // ═══════════════════════════════════════════════════════════════════════════════
    // THEME PRESETS
    // ═══════════════════════════════════════════════════════════════════════════════
    const presetThemes = {
        dark: { ...defaultSettings.colors },
        light: {
            '--panel-bg': '#f4f4f5',
            '--panel-text': '#1f2937',
            '--panel-header-bg': '#e4e4e7',
            '--panel-border': '#d4d4d8',
            '--input-bg': '#ffffff',
            '--input-text': '#111827',
            '--input-border': '#d1d5db',
            '--handle-color': '#007aff',
            '--handle-hover-color': '#0095ff',
            '--favorite-color': '#ffab00',
            '--pin-color': '#34c759'
        },
        glass: {
            '--panel-bg': 'rgba(30, 30, 35, 0.6)',
            '--panel-text': '#f5f5f5',
            '--panel-header-bg': 'rgba(58, 58, 62, 0.7)',
            '--panel-border': 'rgba(255, 255, 255, 0.2)',
            '--input-bg': 'rgba(0, 0, 0, 0.25)',
            '--input-text': '#f5f5f5',
            '--input-border': 'rgba(255, 255, 255, 0.3)',
            '--handle-color': '#00ffc8',
            '--handle-hover-color': '#60ffdf',
            '--favorite-color': '#FFD700',
            '--pin-color': '#34c759'
        },
        hacker: {
            '--panel-bg': '#0a0a0a',
            '--panel-text': '#00ff41',
            '--panel-header-bg': '#1a1a1a',
            '--panel-border': '#00ff41',
            '--input-bg': '#1c1c1c',
            '--input-text': '#00ff41',
            '--input-border': '#008f11',
            '--handle-color': '#00ff41',
            '--handle-hover-color': '#50ff81',
            '--favorite-color': '#00ff41',
            '--pin-color': '#00ff41'
        }
    };

    let settings = { ...defaultSettings };

    // ═══════════════════════════════════════════════════════════════════════════════
    // DOM ELEMENTS
    // ═══════════════════════════════════════════════════════════════════════════════
    let panel, handle, resizeHandle, toast;
    let promptFormModal, importExportModal, settingsModal, versionHistoryModal;
    let chatListContainer, statusLabel, configControls, loadingIndicator;
    let navigatorContainer, navigatorContent;
    let searchInput, miniPanelTrigger, floatingMiniPanel;
    let copyResponseButton, copyCodeButton, actionGroup, searchAddContainer;
    let leftHeaderControls, rightHeaderControls, lockButton;
    // ═══════════════════════════════════════════════════════════════════════════════
    // ICON SYSTEM (SVG)
    // ═══════════════════════════════════════════════════════════════════════════════
    function makeIcon(d, size = 18) {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('viewBox', '0 0 24 24');
        svg.setAttribute('width', size);
        svg.setAttribute('height', size);
        svg.style.fill = 'currentColor';
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', d);
        svg.appendChild(path);
        return svg;
    }

    const icons = {
        plus: makeIcon('M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z', 18),
        minus: makeIcon('M19 13H5v-2h14v2z'),
        unlocked: makeIcon('M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z', 18),
        locked: makeIcon('M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6h2V6c0-1.65 1.35-3 3-3s3 1.35 3 3v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2z', 18),
        settings: makeIcon('M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41h-3.84 c-0.24,0-0.44,0.17-0.48,0.41L9.22,5.25C8.63,5.5,8.1,5.82,7.6,6.2L5.21,5.24C4.99,5.16,4.74,5.23,4.62,5.45L2.7,8.77 c-0.11,0.2-0.06,0.47,0.12,0.61l2.03,1.58C4.82,11.36,4.8,11.68,4.8,12s0.02,0.64,0.07,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.38,2.44 c0.04,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.44-0.17,0.48-0.41l0.38-2.44c0.59-0.24,1.12-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0.01,0.59-0.22l1.92-3.32c0.11-0.2,0.06-0.47-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z', 18),
        trash: makeIcon('M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z', 18),
        edit: makeIcon('M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a.9959.9959 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z', 16),
        arrowLeft: makeIcon('M15.41 16.59L10.83 12l4.58-4.59L14 6l-6 6 6 6 1.41-1.41z', 18),
        arrowRight: makeIcon('M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z', 18),
        chevronDown: makeIcon('M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z', 18),
        chevronRight: makeIcon('M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z'),
        star: makeIcon('M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z', 18),
        starOutline: makeIcon('M22 9.24l-7.19-.62L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.63-7.03L22 9.24zM12 15.4l-3.76 2.27 1-4.28-3.32-2.88 4.38-.38L12 6.1l1.71 4.04 4.38.38-3.32 2.88 1 4.28L12 15.4z', 18),
        pin: makeIcon('M16 9V4h-2v5h-2V4H9v5H7V4H5v5c0 1.66 1.34 3 3 3v7l-1.5 1.5h9L13 19v-7c1.66 0 3-1.34 3-3z', 16),
        pinOutline: makeIcon('M14 4v5c0 .55.45 1 1 1h1V4h-2zm-4 0v6h2V4H10zM7 9h2V4H7v5c0 .55.45 1 1 1h1V4H8c-1.66 0-3 1.34-3 3v5l-1.5 1.5h9L13 19v-7c1.66 0 3-1.34 3-3V4h-2v5c0 .55-.45 1-1 1h-1V4h-2z', 16),
        pinFilled: makeIcon('M16 9V4l1 0c0.55 0 1-0.45 1-1s-0.45-1-1-1H7C6.45 2 6 2.45 6 3s0.45 1 1 1l1 0v5c0 1.66-1.34 3-3 3v2h5.97v7l1 1l1-1v-7H19v-2C17.34 12 16 10.66 16 9z', 16),
        close: makeIcon('M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z', 18),
        importExport: makeIcon('M9 3L5 7h3v7h2V7h3l-4-4zM16 17v-7h-2v7H9l4 4 4-4h-3z', 18),
        sync: makeIcon('M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z', 18),
        chart: makeIcon('M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6h-6z', 18),
        palette: makeIcon('M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9c.83 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-.99 0-.83.67-1.5 1.5-1.5H16c2.76 0 5-2.24 5-5 0-4.42-4.03-8-9-8zm-5.5 9c-.83 0-1.5-.67-1.5-1.5S5.67 9 6.5 9 8 9.67 8 10.5 7.33 12 6.5 12zm3-4c-.83 0-1.5-.67-1.5-1.5S8.67 5 9.5 5s1.5.67 1.5 1.5S10.33 8 9.5 8zm5 0c-.83 0-1.5-.67-1.5-1.5S13.67 5 14.5 5s1.5.67 1.5 1.5S15.33 8 14.5 8zm3 4c-.83 0-1.5-.67-1.5-1.5S16.67 9 17.5 9s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z', 18),
        history: makeIcon('M13 3c-4.97 0-9 4.03-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42C8.27 19.99 10.51 21 13 21c4.97 0 9-4.03 9-9s-4.03-9-9-9zm-1 5v5l4.25 2.52.75-1.23-3.5-2.07V8H12z', 18),
        panelIcon: makeIcon('M21 3H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-9 16H3V5h9v14zm2 0h7V5h-7v14z', 22),
        uploadFile: makeIcon('M9 16h6v-6h4l-7-7-7 7h4v6zm-4 2h14v2H5v-2z'),
        webLink: makeIcon('M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z'),
        dragHandle: makeIcon('M20 9H4v2h16V9zM4 15h16v-2H4v2z'),
        copy: makeIcon('M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z', 16),
        chat: makeIcon('M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 9h12v2H6V9zm8 5H6v-2h8v2zm4-6H6V6h12v2z', 16),
        pencil: makeIcon('M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a.9959.9959 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z', 16),
        list: makeIcon('M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z', 16),
        navUp: makeIcon('M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z'),
        navDown: makeIcon('M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6z'),
        navToTop: makeIcon('M12 8l-6 6 1.41 1.41L12 10.83l4.59 4.58L18 14l-6-6zM12 2L6 8l1.41 1.41L12 4.83l4.59 4.58L18 8l-6-6z'),
        navToBottom: makeIcon('M12 16l-6-6 1.41-1.41L12 13.17l4.59-4.58L18 10l-6 6zm0 6l-6-6 1.41-1.41L12 19.17l4.59-4.58L18 14l-6 6z')
    };

    // ═══════════════════════════════════════════════════════════════════════════════
    // HELPER FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════════
    function el(tag, className, text) {
        const e = document.createElement(tag);
        if (className) e.className = className;
        if (text) e.textContent = text;
        return e;
    }

    function showToast(msg, type = '') {
        if (!toast) return;
        toast.textContent = msg;
        toast.className = `toast-notification ${type} show`;
        setTimeout(() => toast && toast.classList.remove('show'), 2500);
    }

    function capitalizeFirstLetter(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
    }

    const sleep = (ms) => new Promise(r => setTimeout(r, ms));

    function hidePanel() {
        if (!isManuallyLocked && !isFormActiveLock && !panel.classList.contains('is-resizing'))
            panel.classList.remove('visible');
    }

    function updateLockIcon() {
        if (lockButton) {
            while (lockButton.firstChild) lockButton.removeChild(lockButton.firstChild);
            lockButton.appendChild(((isManuallyLocked || isFormActiveLock) ? icons.locked : icons.unlocked).cloneNode(true));
        }
    }

    function createButtonWithIcon(txt, ic) {
        const b = document.createElement('button');
        b.className = 'gemini-prompt-panel-button';
        if (ic) b.appendChild(ic.cloneNode(true));
        if (txt) b.appendChild(document.createTextNode(txt));
        return b;
    }
    // ═══════════════════════════════════════════════════════════════════════════════
    // CSS STYLES - COMPLETE COMBINED STYLES
    // ═══════════════════════════════════════════════════════════════════════════════
    const FULL_WIDTH_CSS = `
        html, html > user-query { max-width: none !important; }
        div.conversation-container { max-width: none !important; }
        div.input-area-container ~ hallucination-disclaimer { display: none !important; }
        div.input-area-container { padding-bottom: 0.5rem !important; }
        div.avatar-gutter { display: none !important; }
    `;

    function applyStyles() {
        GM_addStyle(`
            :root {
                --panel-font: ${settings.fontFamily};
                --base-font-size: ${settings.baseFontSize};
                --panel-padding: 12px;
                --panel-gap: 10px;
                --btn-padding: 8px 12px;
                --panel-width: ${settings.panelWidth}px;
                --panel-top: ${settings.topOffset};
                --handle-width: ${settings.handleWidth}px;
                --panel-bg: #2a2a2e; --panel-text: #e0e0e0; --panel-header-bg: #3a3a3e; --panel-border: #4a4a4e;
                --input-bg: #3c3c41; --input-text: #f0f0f0; --input-border: #5a5a5e;
                --handle-color: #28a745; --handle-hover-color: #34c759; --favorite-color: #FFD700; --pin-color: #34c759;
                --bg-tier-1: #1e1e20; --bg-tier-2: #2a2a2e; --bg-tier-3: #3a3a3e; --bg-tier-4: #4e4e52;
                --text-primary: #e8eaed; --text-secondary: #9aa0a6; --text-tertiary: #5f6368;
                --border-subtle: #444746; --border-active: #76797d;
                --accent-primary: #8ab4f8; --accent-danger: #ff8b8b; --accent-warning: #fdd663; --accent-success: #81c995;
                --z-panel: 9010; --z-handle: 9009; --z-modal: 9100; --z-toast: 9200; --z-navigator: 9015;
                --modal-bg: rgba(0, 0, 0, 0.7); --modal-content-bg: #2c2c30;
                --nav-btn-size: 36px; --tag-bg: #555; --tag-text: #ddd;
            }
            body.gm-sidebar-replaced bard-sidenav-container > bard-sidenav, body.gm-sidebar-replaced .mystuff-side-nav-update {
                position: fixed !important; left: -10000px !important; top: 0 !important; width: 0 !important;
                height: 100vh !important; opacity: 0 !important; pointer-events: none !important;
                z-index: -9999 !important; overflow: hidden !important;
            }
            body.gm-sidebar-replaced bard-sidenav-content {
                margin-left: var(--panel-width, 320px) !important;
                width: calc(100% - var(--panel-width, 320px)) !important;
                transition: margin-left 0.2s;
            }
            .gm-hidden { display: none !important; }
            .gemini-prompt-panel {
                font-size: var(--base-font-size); position: fixed; top: var(--panel-top, 90px); z-index: var(--z-panel);
                background: var(--panel-bg); color: var(--panel-text); border: 1px solid var(--panel-border);
                border-radius: 10px; box-shadow: 0 8px 25px rgba(0,0,0,0.4); display: flex; flex-direction: column;
                font-family: var(--panel-font); transition: transform 0.35s cubic-bezier(0.4, 0, 0.2, 1);
                user-select: none; width: var(--panel-width, 320px); box-sizing: border-box; max-height: 85vh;
            }
            .gemini-prompt-panel.glass-theme { backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); }
            .gemini-prompt-panel.left-side { left: 0; transform: translateX(-100%); border-radius: 0 10px 10px 0; border-left: none; }
            .gemini-prompt-panel.right-side { right: 0; transform: translateX(100%); border-radius: 10px 0 0 10px; border-right: none; }
            .gemini-prompt-panel.visible { transform: translateX(0); }
            .panel-handle {
                position: fixed; top: var(--panel-top, 90px); width: var(--handle-width, 8px); height: 100px;
                background: linear-gradient(90deg, rgba(255,255,255,0.05), rgba(255,255,255,0.15));
                cursor: pointer; z-index: var(--z-handle); transition: all 0.2s; border-radius: 0 5px 5px 0;
                box-shadow: inset -1px 0 0 rgba(255,255,255,0.1);
            }
            .panel-handle::before {
                content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 3px;
                background: var(--handle-color); border-radius: 0 2px 2px 0;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            }
            .panel-handle:hover::before { background: var(--handle-hover-color); width: 100%; }
            .panel-handle.right-side-handle { right: 0; left: auto; transform: scaleX(-1); border-radius: 5px 0 0 5px; }
            .panel-handle.edge {
                top: 0 !important; height: 100vh; background: var(--handle-color); opacity: 0.5;
                transition: opacity 0.2s ease-in-out, background-color 0.2s ease-in-out; border-radius: 0; box-shadow: none;
            }
            .panel-handle.edge:hover { opacity: 1; background-color: var(--handle-hover-color); }
            .panel-handle.edge::before { display: none; }
            .gemini-resize-handle { position: absolute; top: 0; bottom: 0; width: 6px; cursor: ew-resize; z-index: 10; }
            .gemini-resize-handle.left-handle { left: -3px; } .gemini-resize-handle.right-handle { right: -3px; }
            .gemini-prompt-panel-header {
                display: flex; justify-content: space-between; align-items: center; padding: 8px var(--panel-padding);
                background: var(--panel-header-bg); cursor: grab; font-weight: bold; position: relative;
                border-bottom: 1px solid var(--panel-border); flex-shrink: 0;
            }
            .header-brand-text {
                font-weight: 800; font-size: 18px; letter-spacing: -0.5px;
                background-image: linear-gradient(90deg, #a855f7 0%, #fbbf24 25%, #ec4899 50%, #3b82f6 75%, #22c55e 100%);
                -webkit-background-clip: text; background-clip: text; color: transparent;
                text-shadow: 0px 0px 15px rgba(236, 72, 153, 0.2);
                filter: drop-shadow(0 0 1px rgba(255,255,255,0.1));
            }
            .panel-header-controls { display: flex; gap: 2px; align-items: center; }
            .panel-header-controls button {
                background: transparent; border: none; color: var(--panel-text); cursor: pointer; padding: 4px;
                border-radius: 50%; display: flex; align-items: center; justify-content: center; transition: background-color 0.2s;
            }
            .panel-header-controls button:hover { background-color: rgba(255,255,255,0.1); }
            .gemini-prompt-panel-content {
                padding: var(--panel-padding); display: flex; flex-direction: column; gap: var(--panel-gap);
                flex-grow: 1; overflow: hidden;
            }
            .gemini-prompt-panel.condensed { --panel-padding: 6px; --panel-gap: 6px; --btn-padding: 4px 8px; }
            .gemini-prompt-panel.condensed .gemini-prompt-panel-header { padding: 4px var(--panel-padding); font-size: var(--base-font-size); }
            .gemini-prompt-panel.condensed .prompt-button { padding: 6px; }
            .gemini-prompt-panel.condensed .prompt-category-header { padding: 6px 8px; font-size: calc(var(--base-font-size) - 1px); }
            .gemini-prompt-panel.condensed .prompt-category-content { gap: 5px; padding: 8px; }
            .button-group { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
            .gemini-prompt-panel-button {
                border: 1px solid; color: white; padding: var(--btn-padding); border-radius: 6px; display: flex;
                align-items: center; justify-content: center; gap: 8px; font-size: calc(var(--base-font-size) - 1px);
                font-weight: 500; cursor: pointer; transition: all .2s; box-shadow: 0 2px 5px rgba(0,0,0,0.2);
                text-shadow: 1px 1px 1px rgba(0,0,0,0.2);
            }
            .gemini-prompt-panel-button:hover { filter: brightness(1.1); transform: translateY(-1px); }
            .gemini-prompt-panel-button:disabled { cursor: not-allowed; filter: brightness(0.6); }
            .copy-btn { background: linear-gradient(to bottom, #28a745, #218838); border-color: #1e7e34; }
            .google-gradient-btn {
                width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px; border: none;
                color: white !important; position: relative; overflow: hidden; padding: 10px 20px; border-radius: 20px;
                font-weight: bold; cursor: pointer; box-shadow: 0 4px 6px rgba(0,0,0,0.1), 0 1px 3px rgba(0,0,0,0.08);
                background: linear-gradient(90deg, #4285F4, #DB4437, #F4B400, #0F9D58, #4285F4);
                background-size: 200% 100%; animation: google-gradient-animation 4s linear infinite;
                transition: transform 0.15s ease, box-shadow 0.15s ease;
            }
            @keyframes google-gradient-animation { 0% { background-position: 0% 50%; } 100% { background-position: 200% 50%; } }
            .google-gradient-btn::after {
                content: ''; position: absolute; top: -50%; left: -50%; width: 200%; height: 200%;
                background: linear-gradient(to right, rgba(255, 255, 255, 0) 0%, rgba(255, 255, 255, 0.35) 50%, rgba(255, 255, 255, 0) 100%);
                transform: translateX(-150%); transition: transform 0.6s ease; pointer-events: none;
            }
            .google-gradient-btn:hover::after { transform: translateX(150%); }
            .google-gradient-btn:active { transform: translateY(1px); box-shadow: 0 2px 4px rgba(0,0,0,0.1), 0 1px 1px rgba(0,0,0,0.08); }
            .icon-btn {
                padding: 6px; border: none; background: transparent; color: var(--text-secondary); cursor: pointer;
                border-radius: 4px;
            }
            .icon-btn:hover { color: var(--text-primary); background: rgba(255,255,255,0.1); }
            .icon-btn.active-mode { color: var(--accent-primary); background: rgba(138, 180, 248, 0.1); }
            .search-add-container { padding: 0 0 10px; display: flex; flex-direction: column; gap: 8px; }
            #prompt-search-input, .search-input {
                width: 100%; background: var(--input-bg); color: var(--input-text); border-radius: 4px;
                padding: 6px 8px; font-size: calc(var(--base-font-size) - 1px); box-sizing: border-box;
                font-family: var(--panel-font); border: 2px solid transparent;
                transition: border-color 0.3s ease, box-shadow 0.3s ease;
            }
            #prompt-search-input:focus, .search-input:focus {
                outline: none; border-color: var(--handle-color); box-shadow: 0 0 8px var(--handle-color);
            }
            .prompt-group-container {
                display: flex; flex-direction: column; overflow-y: auto; padding-right: 5px; margin-right: -5px;
                flex-grow: 1; min-height: 0;
            }
            #custom-prompts-container { display: flex; flex-direction: column; max-height: none; }
            .prompts-zone {
                display: flex; flex-direction: column; border-bottom: 1px solid var(--border-subtle);
                background: var(--panel-bg); flex-shrink: 0; max-height: 40vh;
            }
            .pinned-prompts-container {
                padding: 8px 14px; background: rgba(138, 180, 248, 0.05); border-bottom: 1px solid var(--panel-border);
                display: flex; flex-direction: column; gap: 4px; max-height: 150px; overflow-y: auto;
            }
            .pinned-prompts-header {
                font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: var(--accent-primary);
                font-weight: 700; margin-bottom: 4px;
            }
            .prompt-drawer-header {
                padding: 8px 14px; background: var(--panel-header-bg); color: var(--text-secondary);
                font-size: 12px; font-weight: 600; display: flex; justify-content: space-between;
                align-items: center; cursor: pointer; border-bottom: 1px solid var(--panel-border); user-select: none;
            }
            .prompt-drawer-header:hover { color: var(--panel-text); background: var(--bg-tier-3); }
            .prompt-drawer-content { overflow-y: auto; background: var(--panel-bg); display: none; }
            .prompt-drawer-content.expanded { display: block; }
            .prompt-button-wrapper {
                display: flex; flex-direction: column; background: #3a3a3e; border: 1px solid var(--panel-border);
                border-radius: 6px; cursor: grab; transition: box-shadow .2s, transform .2s; margin-bottom: 8px;
            }
            .prompt-button-wrapper.dragging { opacity: 0.5; background: #4a4a4e; }
            .prompt-button-wrapper.drag-over { border-bottom: 2px solid var(--pin-color); }
            .prompt-button { position: relative; display: flex; align-items: center; padding: 8px; gap: 8px; }
            .prompt-button .prompt-button-name { flex-grow: 1; text-align: left; font-weight: 500; font-size: var(--base-font-size); }
            .prompt-button-controls {
                display: none; position: absolute; right: 4px; top: 50%; transform: translateY(-50%); gap: 2px;
                background: rgba(0,0,0,0.2); border-radius: 12px; padding: 2px; align-items: center;
            }
            .prompt-button-wrapper:hover .prompt-button-controls { display: flex; }
            .prompt-button-controls button {
                background: transparent; border: none; cursor: pointer; padding: 3px; border-radius: 50%;
                display: flex; align-items: center; color: var(--panel-text);
            }
            .prompt-button-controls button:hover { background-color: rgba(255,255,255,0.15); }
            .favorite-btn.favorited { color: var(--favorite-color); }
            .pin-btn.pinned { color: var(--pin-color); }
            .prompt-item {
                padding: 6px 14px 6px 24px; cursor: pointer; font-size: 13px; color: var(--text-secondary);
                display: flex; justify-content: space-between; align-items: center; position: relative;
            }
            .prompt-item:hover { color: var(--text-primary); background: var(--bg-tier-2); }
            .prompt-pin-btn { opacity: 0; transition: opacity 0.2s; color: var(--text-tertiary); padding: 2px; }
            .prompt-item:hover .prompt-pin-btn, .prompt-pin-btn.active { opacity: 1; }
            .prompt-pin-btn.active { color: var(--accent-primary); }
            .prompt-category { display: flex; flex-direction: column; margin-bottom: 12px; }
            .prompt-category.collapsed .prompt-category-content { display: none; }
            .prompt-category.collapsed .category-toggle-icon { transform: rotate(-90deg); }
            .prompt-category-header {
                display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; cursor: pointer;
                font-weight: 600; color: var(--text-primary); font-size: 13px; background: var(--panel-header-bg);
                border-radius: 6px 6px 0 0; user-select: none;
            }
            .prompt-category-header:hover { background: var(--bg-tier-3); }
            .category-header-title { flex-grow: 1; }
            .category-header-controls { display: flex; gap: 2px; align-items: center; }
            .category-header-controls button {
                background: transparent; border: none; color: var(--panel-text); cursor: pointer; padding: 3px;
                border-radius: 50%; display: flex; align-items: center;
            }
            .category-header-controls button:hover { background-color: rgba(255,255,255,0.15); }
            .category-toggle-icon { transition: transform 0.2s; }
            .prompt-category-content {
                display: flex; flex-direction: column; gap: 8px; padding: 12px; background: var(--panel-bg);
                border-radius: 0 0 6px 6px;
            }
            .prompt-category.dragging { opacity: 0.5; }
            .prompt-category.drag-over { border-top: 2px solid var(--pin-color); }
            .prompt-tags-container { display: flex; flex-wrap: wrap; gap: 4px; padding: 0 8px 8px; }
            .prompt-tag { background: var(--tag-bg); color: var(--tag-text); padding: 2px 6px; border-radius: 4px; font-size: calc(var(--base-font-size) - 3px); }
            .chat-list-container {
                overflow-y: auto; display: flex; flex-direction: column; flex-grow: 1; padding: 8px 0; min-height: 0;
            }
            .chat-section-divider {
                padding: 4px 14px; font-size: 10px; text-transform: uppercase; color: var(--text-tertiary);
                font-weight: 700; margin-top: 8px; margin-bottom: 4px;
            }
            .navigator-item {
                padding: 8px 14px; margin: 0 8px; border-radius: 6px; cursor: pointer; font-size: 13px;
                color: var(--text-secondary); display: flex; align-items: center; gap: 10px;
                transition: background-color 0.1s; white-space: nowrap; overflow: hidden; flex-shrink: 0; position: relative;
            }
            .navigator-item span { overflow: hidden; text-overflow: ellipsis; flex-grow: 1; }
            .navigator-item:hover { background: var(--bg-tier-2); color: var(--text-primary); }
            .navigator-item.active { background: #3c4043; color: var(--text-primary); font-weight: 500; }
            .navigator-item.pinned {
                border-left: 3px solid var(--accent-primary); padding-left: 11px; background: rgba(138, 180, 248, 0.03);
            }
            .config-mode .navigator-item { padding-left: 8px; }
            .item-checkbox { width: 16px; height: 16px; cursor: pointer; accent-color: var(--accent-primary); }
            .pin-btn {
                opacity: 0.2; transition: opacity 0.2s; padding: 4px; cursor: pointer; display: flex;
            }
            .navigator-item:hover .pin-btn, .pin-btn.active { opacity: 1; color: var(--accent-primary); }
            .config-controls {
                padding: 10px; background: #2f2f33; border-bottom: 1px solid var(--border-subtle);
                display: flex; gap: 8px; align-items: center; display: none; flex-shrink: 0;
            }
            .config-controls.visible { display: flex; }
            .bulk-btn {
                padding: 6px 12px; border-radius: 16px; font-size: 12px; font-weight: 600;
                cursor: pointer; border: none; flex: 1;
            }
            .btn-select-all { background: var(--bg-tier-3); color: var(--text-primary); border: 1px solid var(--border-subtle); }
            .btn-delete-sel { background: #5c2b2b; color: #ffcccc; border: 1px solid #7a3b3b; }
            .btn-delete-sel:hover { background: #7a3b3b; }
            .conversation-navigator {
                position: fixed; top: 60px; right: 20px; width: 280px; max-height: calc(100vh - 80px);
                background: var(--bg-tier-2); border: 1px solid var(--border-subtle); border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3); z-index: var(--z-navigator); display: flex;
                flex-direction: column; overflow: hidden;
            }
            .conversation-navigator.hidden { display: none; }
            .conv-nav-header {
                display: flex; justify-content: space-between; align-items: center; padding: 10px 14px;
                background: var(--bg-tier-3); border-bottom: 1px solid var(--border-subtle); cursor: pointer; user-select: none;
            }
            .conv-nav-header:hover { background: var(--bg-tier-4); }
            .conv-nav-title { font-weight: 600; font-size: 13px; color: var(--text-primary); }
            .conv-nav-toggle {
                background: none; border: none; color: var(--text-secondary); cursor: pointer; font-size: 16px; padding: 0;
            }
            .conv-nav-content { overflow-y: auto; padding: 8px; flex-grow: 1; }
            .conv-nav-content.collapsed { display: none; }
            .conv-nav-list { list-style: none; padding: 0; margin: 0; }
            .conv-nav-item {
                padding: 8px 10px; margin-bottom: 4px; background: var(--bg-tier-1); border-radius: 4px;
                cursor: pointer; font-size: 12px; color: var(--text-secondary); border-left: 3px solid transparent;
                transition: all 0.2s;
            }
            .conv-nav-item:hover { background: var(--bg-tier-3); color: var(--text-primary); border-left-color: var(--accent-primary); }
            .conv-nav-item-number { display: inline-block; min-width: 20px; font-weight: 600; color: var(--accent-primary); }
            .conv-nav-empty { padding: 20px; text-align: center; color: var(--text-tertiary); font-size: 12px; }
            .status-bar {
                padding: 8px 14px; font-size: 12px; color: var(--text-tertiary); border-top: 1px solid var(--border-subtle);
                text-align: center; background: var(--bg-tier-2); cursor: pointer; flex-shrink: 0;
            }
            .status-bar.syncing { color: var(--accent-primary); font-weight: 600; cursor: wait; }
            .modal-overlay {
                position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: var(--modal-bg);
                z-index: var(--z-modal); display: none; align-items: center; justify-content: center;
            }
            .modal-content {
                background: var(--modal-content-bg); color: var(--panel-text); padding: 20px; border-radius: 12px;
                max-width: 500px; width: 90%; max-height: 80vh; overflow-y: auto; display: flex;
                flex-direction: column; gap: 15px; border: 1px solid var(--panel-border);
            }
            .modal-header {
                display: flex; justify-content: space-between; align-items: center; padding-bottom: 12px;
                border-bottom: 1px solid var(--panel-border);
            }
            .modal-title { font-size: 18px; font-weight: 600; margin: 0; }
            .modal-close-btn {
                background: transparent; border: none; color: var(--panel-text); cursor: pointer; padding: 4px;
                border-radius: 50%; display: flex; align-items: center;
            }
            .modal-close-btn:hover { background-color: rgba(255,255,255,0.1); }
            .modal-body { display: flex; flex-direction: column; gap: 12px; }
            .form-section { display: flex; flex-direction: column; gap: 8px; }
            .form-section label { font-size: 13px; font-weight: 500; color: var(--text-secondary); }
            .form-section input, .form-section textarea, .form-section select {
                width: 100%; padding: 8px; background: var(--input-bg); border: 1px solid var(--input-border);
                border-radius: 6px; color: var(--input-text); font-size: 14px; font-family: var(--panel-font); box-sizing: border-box;
            }
            .form-section input:focus, .form-section textarea:focus, .form-section select:focus {
                outline: none; border-color: var(--handle-color);
            }
            .checkbox-row { display: flex; align-items: center; gap: 10px; }
            .checkbox-row input[type="checkbox"] { width: auto; }
            .accordion-section {
                border: 1px solid var(--panel-border); border-radius: 6px; margin-bottom: 8px; overflow: hidden;
            }
            .accordion-header {
                padding: 12px; background: var(--panel-header-bg); cursor: pointer; font-weight: 600;
                display: flex; justify-content: space-between; align-items: center; user-select: none;
            }
            .accordion-header:hover { background: var(--bg-tier-3); }
            .accordion-header::after { content: '▼'; font-size: 10px; transition: transform 0.2s; }
            .accordion-header.active::after { transform: rotate(-180deg); }
            .accordion-content {
                display: none; padding: 12px; background: var(--panel-bg); gap: 12px; flex-direction: column;
            }
            .settings-section-grid {
                display: grid; grid-template-columns: 1fr auto; gap: 12px; align-items: center;
            }
            .label-group { display: flex; flex-direction: column; gap: 4px; }
            .label-group .description { font-size: 11px; color: var(--text-tertiary); font-weight: normal; }
            .toggle-switch { position: relative; display: inline-block; width: 46px; height: 24px; }
            .toggle-switch input { opacity: 0; width: 0; height: 0; }
            .toggle-switch label {
                position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0;
                background-color: var(--input-bg); transition: .3s; border-radius: 24px; border: 1px solid var(--input-border);
            }
            .toggle-switch label:before {
                position: absolute; content: ""; height: 18px; width: 18px; left: 2px; bottom: 2px;
                background-color: white; transition: .3s; border-radius: 50%;
            }
            .toggle-switch input:checked + label { background-color: var(--handle-color); border-color: var(--handle-color); }
            .toggle-switch input:checked + label:before { transform: translateX(22px); }
            .input-with-button { display: flex; gap: 8px; }
            .input-with-button input { flex: 1; }
            .stats-grid { display: grid; grid-template-columns: 1fr; gap: 12px; }
            .stat-card {
                background: var(--panel-bg); border: 1px solid var(--panel-border); border-radius: 6px; padding: 12px;
            }
            .stat-card-title { font-weight: 600; margin-bottom: 8px; color: var(--panel-text); font-size: 14px; }
            .stat-card ul { list-style: none; padding: 0; margin: 0; }
            .stat-card li {
                padding: 6px 0; border-bottom: 1px solid var(--panel-border); display: flex;
                justify-content: space-between; font-size: 13px;
            }
            .stat-card li:last-child { border-bottom: none; }
            .stat-label { color: var(--text-secondary); }
            .stat-value { color: var(--panel-text); font-weight: 500; }
            #history-list { list-style: none; padding: 0; margin: 0; }
            #history-list li {
                padding: 12px; background: var(--panel-bg); border: 1px solid var(--panel-border);
                border-radius: 6px; margin-bottom: 8px; display: flex; flex-direction: column; gap: 8px;
            }
            .history-text {
                font-size: 12px; color: var(--text-secondary); white-space: pre-wrap; word-break: break-word;
            }
            .diff-container {
                background: var(--panel-bg); border: 1px solid var(--panel-border); border-radius: 6px; padding: 12px;
                min-height: 150px; white-space: pre-wrap; font-family: monospace; font-size: 12px; overflow-y: auto; max-height: 300px;
            }
            .toast-notification {
                position: fixed; bottom: 30px; left: 50%; transform: translateX(-50%); background: var(--bg-tier-3);
                padding: 12px 20px; border-radius: 20px; z-index: var(--z-toast); opacity: 0; transition: opacity 0.3s;
                pointer-events: none; border: 1px solid var(--border-active); font-size: 14px; font-weight: 500;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            }
            .toast-notification.show { opacity: 1; }
            .toast-notification.success { background: #2d4a2c; border-color: var(--accent-success); color: var(--accent-success); }
            .toast-notification.error { background: #4a2c2c; border-color: var(--accent-danger); color: var(--accent-danger); }
            #floating-mini-panel {
                position: absolute; bottom: calc(100% + 10px); right: 0; width: 300px; max-height: 400px;
                background: var(--panel-bg); border: 1px solid var(--panel-border); border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3); z-index: 1000; opacity: 0; pointer-events: none;
                transition: opacity 0.2s; overflow-y: auto; padding: 8px;
            }
            #floating-mini-panel.visible { opacity: 1; pointer-events: auto; }
            #mini-panel-trigger {
                position: absolute; bottom: 8px; right: 8px; width: 36px; height: 36px; background: var(--panel-bg);
                border: 1px solid var(--panel-border); border-radius: 50%; display: flex; align-items: center;
                justify-content: center; cursor: pointer; z-index: 999; transition: all 0.2s;
                box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            }
            #mini-panel-trigger:hover { background: var(--panel-header-bg); transform: scale(1.1); }
            .gm-overlay-container {
                position: absolute; top: 0; right: 0; padding: 8px 48px 0 0; z-index: 10; pointer-events: none;
                opacity: 0.3; transition: opacity 0.2s;
            }
            .gm-overlay-container.is-hidden-state, pre[data-gm-enhanced]:hover .gm-overlay-container { opacity: 1; }
            .gm-collapse-btn {
                pointer-events: auto; color: #e0e0e0; background: rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.2);
                border-radius: 4px; padding: 4px 8px; cursor: pointer; font-size: 11px; transition: all 0.2s;
            }
            .gm-collapse-btn:hover { background: rgba(0,0,0,0.6); border-color: rgba(255,255,255,0.4); }
            .gm-code-footer {
                display: flex; justify-content: flex-end; padding: 4px 8px; background: rgba(0,0,0,0.2); border-radius: 0 0 4px 4px;
            }
            .gm-code-btn {
                background: var(--input-bg); border: 1px solid var(--input-border); color: var(--input-text);
                padding: 4px 12px; border-radius: 4px; cursor: pointer; font-size: 12px; transition: all 0.2s;
            }
            .gm-code-btn:hover { background: var(--bg-tier-3); }
            code.gm-hidden-code { display: none; }
            button.gm-collapse-btn { margin-right: 20px; }
            button.gm-code-btn { margin-top: 4px; }
            .conversation-container, user-query, .user-query-bubble-with-background { max-width: 100% !important; }
            upsell-button, hallucination-disclaimer, announcement-banner, intent-card-bar, .buttons-container.referral,
            .location-icon, .location-footer-name, .location-footer-atl-text, .update-location-text,
            .location-buttons-dot, my-stuff-recents-preview { display: none !important; }
            .bard-avatar.thinking {
                background-image: url("https://raw.githubusercontent.com/SysAdminDoc/GeminiBuddy/refs/heads/main/assets/favicon/loader.gif") !important;
                background-size: contain !important; background-repeat: no-repeat !important;
                background-position: center !important; width: 40px !important; height: 40px !important;
                min-width: 40px !important; display: block !important;
            }
            .bard-avatar.thinking .avatar-container, .bard-avatar.thinking .avatar_spinner_animation,
            .bard-avatar.thinking svg { display: none !important; visibility: hidden !important; }
            .header-loading-icon {
                width: 20px; height: 20px; border-radius: 50%; object-fit: contain; opacity: 0;
                transition: opacity 0.3s ease-in-out; pointer-events: none;
            }
            .header-loading-icon.visible { opacity: 1; }


            /* === v100 ENHANCEMENTS === */

            /* Full Height Panel */
            .gemini-prompt-panel {
                top: 0 !important;
                height: 100vh !important;
            }
            .panel-handle {
                top: 0 !important;
                height: 100vh !important;
            }

            /* Professional Logo */
            .header-brand-text {
                font-weight: 700;
                letter-spacing: 0.5px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                -webkit-background-clip: text;
                background-clip: text;
                color: transparent;
                font-family: 'Inter', 'Segoe UI', system-ui, sans-serif;
            }

            /* Prominent Prompt Area */
            .prompts-zone {
                border-bottom: 2px solid var(--handle-color) !important;
                background: linear-gradient(to bottom, var(--panel-bg), var(--bg-tier-2)) !important;
                box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            }

            /* Hide Gemini Native Sidebar */
            bard-sidenav-container > bard-sidenav,
            .mystuff-side-nav-update {
                display: none !important;
            }
            bard-sidenav-content {
                margin-left: 0 !important;
            }

            /* Draggable Navigator */
            .conversation-navigator.draggable {
                cursor: move;
                position: fixed !important;
                resize: both;
                overflow: auto;
                min-width: 200px;
                min-height: 150px;
            }
            .conversation-navigator.pinned-to-sidebar {
                position: fixed;
                left: var(--panel-width, 320px);
                top: 0;
                height: 100vh;
                resize: horizontal;
            }
            .conv-nav-header.draggable-header {
                cursor: move;
            }
        `);
    }
    // ═══════════════════════════════════════════════════════════════════════════════
    // DATA MANAGEMENT & STORAGE
    // ═══════════════════════════════════════════════════════════════════════════════
    async function loadSettings() {
        let loadedSettings = await GM_getValue(GM_SETTINGS_KEY, defaultSettings);
        settings = { ...defaultSettings, ...loadedSettings };
        settings.colors = { ...defaultSettings.colors, ...(settings.colors || {}) };
        settings.groupColors = settings.groupColors || {};
        settings.groupOrder = settings.groupOrder || [];
        settings.tagOrder = settings.tagOrder || [];
    }

    async function saveSettings() {
        await GM_setValue(GM_SETTINGS_KEY, settings);
    }

    function savePrompts() {
        GM_setValue(GM_PROMPTS_KEY, JSON.stringify(currentPrompts));
    }

    async function loadHistory() {
        promptHistory = await GM_getValue(GM_HISTORY_KEY, {});
    }

    async function saveHistory() {
        await GM_setValue(GM_HISTORY_KEY, promptHistory);
    }

    function addHistoryEntry(promptId, oldText) {
        if (!promptHistory[promptId]) {
            promptHistory[promptId] = [];
        }
        promptHistory[promptId].unshift({ timestamp: Date.now(), text: oldText });
        if (promptHistory[promptId].length > 10) {
            promptHistory[promptId].pop();
        }
        saveHistory();
    }

    function ensurePromptIDs(prompts) {
        Object.values(prompts).flat().forEach((p, i) => {
            p.id = p.id || `prompt-${Date.now()}-${i}`;
        });
    }

    function saveChatCache() {
        const cacheData = {
            timestamp: Date.now(),
            data: chatCache.map(c => ({
                title: c.title,
                url: c.url,
                isPinned: c.isPinned
            }))
        };
        GM_setValue(GM_CHAT_CACHE_KEY, JSON.stringify(cacheData));
    }

    function fetchDefaultPrompts() {
        return new Promise((resolve) => {
            GM_xmlhttpRequest({
                method: "GET",
                url: DEFAULT_PROMPTS_URL,
                onload: async function(response) {
                    try {
                        const prompts = JSON.parse(response.responseText);
                        if (typeof prompts !== 'object' || prompts === null) throw new Error("Invalid format");
                        const newGroupName = "Default Prompts";
                        currentPrompts[newGroupName] = Object.values(prompts).flat();
                        ensurePromptIDs(currentPrompts);
                        if (!settings.groupOrder.includes(newGroupName)) {
                            settings.groupOrder.push(newGroupName);
                        }
                        await savePrompts();
                        await saveSettings();
                        resolve();
                    } catch (e) {
                        console.error("Failed to process default prompts:", e);
                        resolve();
                    }
                },
                onerror: function(response) {
                    console.error("Error fetching default prompts:", response.statusText);
                    resolve();
                }
            });
        });
    }

    async function syncFromGist(isManual = false) {
        if (!settings.gistURL) {
            if (isManual) showToast("Please provide a Gist URL in settings.", 'error');
            return;
        }
        const gistIdMatch = settings.gistURL.match(/gist\.github\.com\/[a-zA-Z0-9_-]+\/([a-f0-9]+)/);
        if (!gistIdMatch) {
            if (isManual) showToast("Invalid Gist URL format.", 'error');
            return;
        }
        const gistId = gistIdMatch[1];
        if (isManual) showToast("Syncing from Gist...");

        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: "GET",
                url: `https://api.github.com/gists/${gistId}`,
                onload: function(response) {
                    try {
                        const gistData = JSON.parse(response.responseText);
                        const file = Object.values(gistData.files)[0];
                        if (file && file.content) {
                            const newPrompts = JSON.parse(file.content);
                            const doSync = isManual ? confirm("Gist data found. Replace all current prompts? This cannot be undone.") : true;
                            if (doSync) {
                                currentPrompts = newPrompts;
                                savePrompts();
                                if (isManual) showToast("Sync successful!", 'success');
                                resolve(true);
                            } else {
                                reject(new Error("Sync cancelled."));
                            }
                        } else {
                            throw new Error("No content in Gist.");
                        }
                    } catch (e) {
                        if (isManual) showToast("Failed to parse Gist: " + e.message, 'error');
                        reject(e);
                    }
                },
                onerror: function(response) {
                    if (isManual) showToast("Error fetching Gist: " + response.statusText, 'error');
                    reject(new Error(response.statusText));
                }
            });
        });
    }

    async function loadData() {
        GM_addStyle.toString(); // Ensure GM_addStyle is available
        const rawSettings = await GM_getValue(GM_SETTINGS_KEY);
        try { settings = { ...settings, ...JSON.parse(rawSettings) }; } catch(e) {}

        if (settings.wideMode) document.body.classList.add('gemini-wide');
        if (settings.reducedMotion) document.body.classList.add('gm-reduced-motion');

        const rawPrompts = await GM_getValue(GM_PROMPTS_KEY);
        try { currentPrompts = JSON.parse(rawPrompts) || {}; } catch { currentPrompts = {}; }

        const cachedChats = await GM_getValue(GM_CHAT_CACHE_KEY);
        if (cachedChats) {
            try {
                const parsed = JSON.parse(cachedChats);
                if (Date.now() - parsed.timestamp < CACHE_DURATION_MS) {
                    console.log('Loading chats from cache.');
                    chatCache = parsed.data;
                    isScraping = false;
                }
            } catch (e) { console.error('Cache parse error', e); }
        }

        if (Object.keys(currentPrompts).length === 0) {
            console.log("Importing default prompts...");
            if (confirm("Welcome to GeminiBuddy Ultimate! Import default prompts?")) {
                await fetchDefaultPrompts();
            }
        }
    }
    // ═══════════════════════════════════════════════════════════════════════════════
    // THEME & APPEARANCE MANAGEMENT
    // ═══════════════════════════════════════════════════════════════════════════════
    function applyTheme() {
        for (const [key, value] of Object.entries(settings.colors)) {
            document.documentElement.style.setProperty(key, value);
        }
        document.documentElement.style.setProperty('--panel-font', settings.fontFamily);
        document.documentElement.style.setProperty('--base-font-size', settings.baseFontSize);
        panel.classList.toggle('glass-theme', settings.themeName === 'glass');
        panel.classList.toggle('condensed', settings.condensedMode);
    }

    function toggleFullWidth(enable) {
        let styleTag = document.getElementById(FULL_WIDTH_STYLE_ID);
        if (enable) {
            if (!styleTag) {
                styleTag = document.createElement('style');
                styleTag.id = FULL_WIDTH_STYLE_ID;
                document.head.appendChild(styleTag);
            }
            styleTag.textContent = FULL_WIDTH_CSS;
        } else {
            if (styleTag) styleTag.remove();
        }
    }

    async function applySettingsAndTheme() {
        applyTheme();
        toggleFullWidth(settings.enableFullWidth);

        const wasLockedAndVisible = panel.classList.contains('visible') && isManuallyLocked;
        panel.className = 'gemini-prompt-panel';
        if (settings.themeName === 'glass') panel.classList.add('glass-theme');
        if (settings.condensedMode) panel.classList.add('condensed');
        if (wasLockedAndVisible) panel.classList.add('visible');

        const p = settings.position;
        panel.classList.add(p === 'left' ? 'left-side' : 'right-side');
        handle.classList.toggle('right-side-handle', p === 'right');
        handle.classList.toggle('edge', settings.handleStyle === 'edge');
        resizeHandle.className = `gemini-resize-handle ${settings.position === 'right' ? 'left-handle' : 'right-handle'}`;

        panel.style.setProperty('--panel-width', `${settings.panelWidth}px`);
        panel.style.setProperty('--handle-width', `${settings.handleWidth}px`);
        handle.style.width = `${settings.handleWidth}px`;
        panel.style.setProperty('--panel-top', settings.topOffset);
        handle.style.top = settings.topOffset;

        updateHeaderLayout();
        renderActionButtons();
        updateHandleHeight();
    }

    function updateHeaderLayout() {
        while (leftHeaderControls.firstChild) leftHeaderControls.removeChild(leftHeaderControls.firstChild);
        while (rightHeaderControls.firstChild) rightHeaderControls.removeChild(rightHeaderControls.firstChild);

        const settingsBtn = createIconButton('Settings', icons.settings.cloneNode(true), () => showSettingsModal());
        const arrowLeftBtn = createIconButton('Move to Left', icons.arrowLeft.cloneNode(true), () => {
            settings.position = 'left';
            saveSettings();
            applySettingsAndTheme();
        });
        const arrowRightBtn = createIconButton('Move to Right', icons.arrowRight.cloneNode(true), () => {
            settings.position = 'right';
            saveSettings();
            applySettingsAndTheme();
        });

        if (settings.position === 'left') {
            leftHeaderControls.append(settingsBtn);
            rightHeaderControls.append(lockButton, arrowRightBtn);
        } else {
            leftHeaderControls.append(arrowLeftBtn, lockButton);
            rightHeaderControls.append(settingsBtn);
        }
    }

    function createIconButton(title, icon, onClick) {
        const btn = document.createElement('button');
        btn.title = title;
        btn.appendChild(icon);
        btn.addEventListener('click', onClick);
        return btn;
    }

    function renderActionButtons() {
        while (actionGroup.firstChild) actionGroup.removeChild(actionGroup.firstChild);
        let isCodeFirst = (settings.position === 'right');
        if (settings.copyButtonOrderSwapped) isCodeFirst = !isCodeFirst;
        if (isCodeFirst) {
            actionGroup.append(copyCodeButton, copyResponseButton);
        } else {
            actionGroup.append(copyResponseButton, copyCodeButton);
        }
    }

    function updateHandleHeight() {
        if (!panel || !handle || settings.handleStyle === 'edge') return;
        setTimeout(() => {
            const panelHeight = panel.offsetHeight;
            if (panelHeight > 0) handle.style.height = `${panelHeight}px`;
        }, 100);
    }

    function findPromptCategory(promptId) {
        for (const cat in currentPrompts) {
            if (currentPrompts[cat].some(p => p.id === promptId)) {
                return cat;
            }
        }
        return null;
    }
    // ═══════════════════════════════════════════════════════════════════════════════
    // PROMPT MANAGEMENT & RENDERING
    // ═══════════════════════════════════════════════════════════════════════════════
    async function loadAndDisplayPrompts(isSync = false) {
        if (!isSync) {
            let raw = await GM_getValue(GM_PROMPTS_KEY);
            try {
                let loadedPrompts = JSON.parse(raw);
                if (typeof loadedPrompts === 'object' && loadedPrompts !== null && Object.keys(loadedPrompts).length > 0) {
                    currentPrompts = loadedPrompts;
                } else {
                    throw new Error("No prompts stored");
                }
            } catch (e) {
                console.log(e.message);
                currentPrompts = {};
                if (confirm("Welcome! Import default prompts?")) {
                    await fetchDefaultPrompts();
                }
            }
        }
        ensurePromptIDs(currentPrompts);

        const currentGroups = Object.keys(currentPrompts).filter(c => c !== "Favorites");
        const orderedGroups = (settings.groupOrder || []).filter(g => currentGroups.includes(g));
        const newGroups = currentGroups.filter(g => !orderedGroups.includes(g));
        settings.groupOrder = [...orderedGroups, ...newGroups];

        if (!settings.initiallyCollapsed) {
            settings.collapsedCategories = [...Object.keys(currentPrompts), "Favorites"];
            settings.initiallyCollapsed = true;
        }
        await saveSettings();
        renderAllPrompts();
        renderMiniPanel();
    }

    function renderAllPrompts() {
        const container = panel.querySelector('#custom-prompts-container');
        while (container.firstChild) container.removeChild(container.firstChild);

        const allPrompts = Object.values(currentPrompts).flat();
        const favoritePrompts = allPrompts.filter(p => p && p.id && settings.favorites.includes(p.id));

        if (favoritePrompts.length > 0) {
            const favCategoryDiv = createCategory("Favorites", favoritePrompts, true);
            favCategoryDiv.id = 'favorites-category';
            container.appendChild(favCategoryDiv);
        }

        if (settings.groupByTags) {
            const promptsForTagging = allPrompts.filter(p => p && p.id && !settings.favorites.includes(p.id));
            const promptsByTag = {};
            promptsForTagging.forEach(prompt => {
                const tags = (prompt.tags || "").split(',').map(t => t.trim()).filter(Boolean);
                if (tags.length > 0) {
                    tags.forEach(tag => {
                        const capitalizedTag = capitalizeFirstLetter(tag);
                        if (!promptsByTag[capitalizedTag]) promptsByTag[capitalizedTag] = [];
                        promptsByTag[capitalizedTag].push(prompt);
                    });
                } else {
                    const noTagGroup = '(No Tags)';
                    if (!promptsByTag[noTagGroup]) promptsByTag[noTagGroup] = [];
                    promptsByTag[noTagGroup].push(prompt);
                }
            });

            const allTagNames = Object.keys(promptsByTag);
            const orderedTags = (settings.tagOrder || []).filter(t => allTagNames.includes(t));
            const newTags = allTagNames.filter(t => !orderedTags.includes(t)).sort((a, b) => a.localeCompare(b));
            settings.tagOrder = [...orderedTags, ...newTags];

            settings.tagOrder.forEach(tagName => {
                const promptsInTag = promptsByTag[tagName];
                if (promptsInTag && promptsInTag.length > 0) {
                    const sortedPrompts = [...promptsInTag].sort((a, b) => (a.pinned === b.pinned ? 0 : a.pinned ? -1 : 1));
                    const categoryDiv = createCategory(tagName, sortedPrompts, true);
                    container.appendChild(categoryDiv);
                }
            });
        } else {
            (settings.groupOrder || []).forEach(categoryName => {
                const prompts = currentPrompts[categoryName];
                if (prompts && prompts.length > 0) {
                    const nonFavoritePrompts = prompts.filter(p => !settings.favorites.includes(p.id));
                    if (nonFavoritePrompts.length > 0) {
                        const sortedPrompts = [...nonFavoritePrompts].sort((a, b) => (a.pinned === b.pinned ? 0 : a.pinned ? -1 : 1));
                        const categoryDiv = createCategory(categoryName, sortedPrompts, true);
                        container.appendChild(categoryDiv);
                    }
                }
            });
        }
        updateHandleHeight();
    }

    function createCategory(categoryName, prompts, isCollapsible, isMini = false) {
        const categoryDiv = document.createElement('div');
        categoryDiv.className = 'prompt-category';
        categoryDiv.dataset.categoryName = categoryName;

        if (settings.collapsedCategories.includes(categoryName)) {
            categoryDiv.classList.add('collapsed');
        }

        const header = document.createElement('div');
        header.className = 'prompt-category-header';

        const customColor = settings.groupColors[categoryName];
        if (customColor) {
            header.style.backgroundColor = customColor;
        }

        const titleSpan = document.createElement('span');
        titleSpan.className = 'category-header-title';
        titleSpan.textContent = categoryName;

        const controls = document.createElement('div');
        controls.className = 'category-header-controls';

        const isRealCategory = settings.groupOrder.includes(categoryName);

        if (settings.groupByTags && categoryName !== 'Favorites') {
            header.classList.add('draggable-header');
            categoryDiv.draggable = true;
            categoryDiv.addEventListener('dragstart', handleCategoryDragStart);
            categoryDiv.addEventListener('dragover', handleCategoryDragOver);
            categoryDiv.addEventListener('dragleave', handleCategoryDragLeave);
            categoryDiv.addEventListener('drop', handleCategoryDrop);
            categoryDiv.addEventListener('dragend', handleCategoryDragEnd);
        }

        if (!isMini && categoryName !== "Favorites" && isRealCategory && !settings.groupByTags) {
            const editBtn = document.createElement('button');
            editBtn.title = "Rename Group";
            editBtn.appendChild(icons.edit.cloneNode(true));
            editBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const newName = prompt("Enter new name for the group:", categoryName);
                if (newName && newName.trim() !== "" && newName !== categoryName) {
                    if (currentPrompts[newName]) {
                        showToast("A group with this name already exists.", 'error');
                        return;
                    }
                    currentPrompts[newName] = currentPrompts[categoryName];
                    delete currentPrompts[categoryName];
                    if (settings.groupColors[categoryName]) {
                        settings.groupColors[newName] = settings.groupColors[categoryName];
                        delete settings.groupColors[categoryName];
                    }
                    const groupIndex = settings.groupOrder.indexOf(categoryName);
                    if (groupIndex > -1) {
                        settings.groupOrder.splice(groupIndex, 1, newName);
                    }
                    Promise.all([savePrompts(), saveSettings()]).then(renderAllPrompts);
                }
            });
            controls.append(editBtn);
        }

        if (isCollapsible) {
            const icon = icons.chevronDown.cloneNode(true);
            icon.classList.add('category-toggle-icon');
            controls.appendChild(icon);
            header.addEventListener('click', (e) => {
                if (e.target.closest('.category-header-controls')) return;
                categoryDiv.classList.toggle('collapsed');
                if (!isMini) {
                    const isCollapsed = categoryDiv.classList.contains('collapsed');
                    const categoryId = categoryDiv.dataset.categoryName;
                    if (isCollapsed) {
                        if (!settings.collapsedCategories.includes(categoryId)) {
                            settings.collapsedCategories.push(categoryId);
                        }
                    } else {
                        settings.collapsedCategories = settings.collapsedCategories.filter(c => c !== categoryId);
                    }
                    saveSettings();
                    updateHandleHeight();
                }
            });
        }

        header.append(titleSpan, controls);
        const content = document.createElement('div');
        content.className = 'prompt-category-content';
        if (prompts && Array.isArray(prompts)) {
            prompts.forEach(p => addPromptButtonToPanel(p, content, categoryName, isMini));
        }
        categoryDiv.append(header, content);
        return categoryDiv;
    }

    function addPromptButtonToPanel(promptData, container, categoryName, isMini = false) {
        const wrapper = document.createElement('div');
        wrapper.className = 'prompt-button-wrapper';
        wrapper.dataset.promptId = promptData.id;

        const btn = document.createElement('div');
        btn.className = 'prompt-button';

        if (isMini) {
            btn.addEventListener('click', () => {
                sendPromptToGemini(promptData, promptData.autoSend);
                floatingMiniPanel.classList.remove('visible');
            });
        } else {
            wrapper.draggable = true;
            wrapper.addEventListener('dragstart', handleDragStart);
            wrapper.addEventListener('dragover', handleDragOver);
            wrapper.addEventListener('dragleave', handleDragLeave);
            wrapper.addEventListener('drop', handleDrop);
            wrapper.addEventListener('dragend', handleDragEnd);
            btn.addEventListener('click', (e) => {
                if (e.target.closest('.prompt-button-controls')) return;
                sendPromptToGemini(promptData, promptData.autoSend);
            });
        }

        const nameSpan = document.createElement('span');
        nameSpan.className = 'prompt-button-name';
        nameSpan.textContent = promptData.name;
        btn.appendChild(nameSpan);

        if (!isMini) {
            const controls = document.createElement('div');
            controls.className = 'prompt-button-controls';

            const historyBtn = document.createElement('button');
            historyBtn.title = "View History";
            historyBtn.appendChild(icons.history.cloneNode(true));
            historyBtn.addEventListener('click', () => showVersionHistory(promptData));
            controls.appendChild(historyBtn);

            const pinBtn = document.createElement('button');
            pinBtn.title = "Pin to Top";
            pinBtn.classList.add('pin-btn');
            const isPinned = promptData.pinned;
            pinBtn.appendChild((isPinned ? icons.pinFilled : icons.pinOutline).cloneNode(true));
            if (isPinned) pinBtn.classList.add('pinned');
            pinBtn.addEventListener('click', () => {
                promptData.pinned = !promptData.pinned;
                savePrompts();
                renderAllPrompts();
            });

            const favoriteBtn = document.createElement('button');
            favoriteBtn.title = "Favorite";
            favoriteBtn.classList.add('favorite-btn');
            const isFavorited = settings.favorites.includes(promptData.id);
            favoriteBtn.appendChild((isFavorited ? icons.star : icons.starOutline).cloneNode(true));
            if (isFavorited) favoriteBtn.classList.add('favorited');
            favoriteBtn.addEventListener('click', () => {
                if (settings.favorites.includes(promptData.id)) {
                    settings.favorites = settings.favorites.filter(id => id !== promptData.id);
                } else {
                    settings.favorites.push(promptData.id);
                }
                saveSettings().then(renderAllPrompts);
            });

            const editBtn = document.createElement('button');
            editBtn.title = "Edit";
            editBtn.appendChild(icons.edit.cloneNode(true));
            editBtn.addEventListener('click', () => {
                let originalCategory = findPromptCategory(promptData.id);
                showPromptForm(promptData, originalCategory);
            });

            const deleteBtn = document.createElement('button');
            deleteBtn.title = "Delete";
            deleteBtn.appendChild(icons.trash.cloneNode(true));
            deleteBtn.addEventListener('click', () => {
                if (confirm(`Delete prompt "${promptData.name}"? This will also delete its version history.`)) {
                    Object.keys(currentPrompts).forEach(catName => {
                        currentPrompts[catName] = currentPrompts[catName].filter(p => p.id !== promptData.id);
                        if (currentPrompts[catName].length === 0 && catName !== "Favorites") {
                            delete currentPrompts[catName];
                            settings.groupOrder = settings.groupOrder.filter(g => g !== catName);
                        }
                    });
                    delete promptHistory[promptData.id];
                    settings.favorites = settings.favorites.filter(id => id !== promptData.id);
                    Promise.all([savePrompts(), saveSettings(), saveHistory()]).then(() => {
                        renderAllPrompts();
                        showToast('Prompt deleted.');
                    });
                }
            });

            controls.append(pinBtn, favoriteBtn, editBtn, deleteBtn, historyBtn);
            btn.appendChild(controls);
        }

        wrapper.appendChild(btn);

        if (!isMini && settings.showTags && promptData.tags) {
            const tagsContainer = document.createElement('div');
            tagsContainer.className = 'prompt-tags-container';
            (promptData.tags || "").split(',').forEach(tag => {
                if (tag.trim()) {
                    const tagEl = document.createElement('span');
                    tagEl.className = 'prompt-tag';
                    tagEl.textContent = tag.trim();
                    tagsContainer.appendChild(tagEl);
                }
            });
            if (tagsContainer.hasChildNodes()) wrapper.appendChild(tagsContainer);
        }

        container.appendChild(wrapper);
    }

    function sendPromptToGemini(promptData, autoSend = false) {
        const editor = document.querySelector('div.ql-editor');
        if (editor) {
            promptData.usageCount = (promptData.usageCount || 0) + 1;
            promptData.lastUsed = Date.now();
            savePrompts();

            editor.focus();
            document.execCommand('selectAll', false, null);
            document.execCommand('insertText', false, promptData.text);
            if (autoSend) {
                setTimeout(() => {
                    const sendButton = document.querySelector('button.send-button, button[data-testid="send-button"]');
                    if (sendButton && !sendButton.disabled) sendButton.click();
                }, 150);
            }
        } else {
            showToast('Error: Prompt input not found.', 'error');
        }
    }

    function renderMiniPanel() {
        if (!floatingMiniPanel) return;
        const container = floatingMiniPanel.querySelector('.prompt-group-container');
        while (container.firstChild) container.removeChild(container.firstChild);

        const searchInput = document.createElement('input');
        searchInput.type = 'search';
        searchInput.placeholder = 'Search prompts...';
        searchInput.id = 'mini-prompt-search-input';
        searchInput.className = 'search-input';
        searchInput.addEventListener('input', handleSearch);
        container.appendChild(searchInput);

        const allPrompts = Object.values(currentPrompts).flat();
        const favoritePrompts = allPrompts.filter(p => p && p.id && settings.favorites.includes(p.id));

        if (favoritePrompts.length > 0) {
            container.appendChild(createCategory("Favorites", favoritePrompts, true, true));
        }
        (settings.groupOrder || []).forEach(categoryName => {
            const prompts = currentPrompts[categoryName];
            if (prompts) {
                container.appendChild(createCategory(categoryName, prompts, true, true));
            }
        });
    }
    // ═══════════════════════════════════════════════════════════════════════════════
    // DRAG & DROP HANDLERS
    // ═══════════════════════════════════════════════════════════════════════════════
    function handleDragStart(e) {
        draggedItem = this;
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/html', this.innerHTML);
        setTimeout(() => this.classList.add('dragging'), 0);
    }

    function handleDragOver(e) {
        e.preventDefault();
        if (this.classList.contains('prompt-button-wrapper') && this !== draggedItem && this.closest('.prompt-category-content')) {
            this.classList.add('drag-over');
        }
        return false;
    }

    function handleDragLeave() {
        this.classList.remove('drag-over');
    }

    function handleDrop(e) {
        e.stopPropagation();
        if (draggedItem !== this) {
            const sourceCategoryName = findPromptCategory(draggedItem.dataset.promptId);
            const targetCategoryName = findPromptCategory(this.dataset.promptId);
            if (sourceCategoryName === targetCategoryName && sourceCategoryName !== null) {
                const categoryPrompts = currentPrompts[sourceCategoryName];
                const sourceIndex = categoryPrompts.findIndex(p => p.id === draggedItem.dataset.promptId);
                const targetIndex = categoryPrompts.findIndex(p => p.id === this.dataset.promptId);

                if (sourceIndex > -1 && targetIndex > -1) {
                    const [removed] = categoryPrompts.splice(sourceIndex, 1);
                    categoryPrompts.splice(targetIndex, 0, removed);
                    savePrompts();
                    renderAllPrompts();
                }
            } else {
                showToast("Can only reorder prompts within the same category.", 'error');
            }
        }
        return false;
    }

    function handleDragEnd() {
        document.querySelectorAll('.prompt-button-wrapper').forEach(item => {
            item.classList.remove('dragging', 'drag-over');
        });
        draggedItem = null;
    }

    function handleCategoryDragStart(e) {
        draggedItem = this;
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', this.dataset.categoryName);
        setTimeout(() => this.classList.add('dragging'), 0);
    }

    function handleCategoryDragOver(e) {
        e.preventDefault();
        if (this.classList.contains('prompt-category') && this !== draggedItem) {
            this.classList.add('drag-over');
        }
    }

    function handleCategoryDragLeave(e) {
        this.classList.remove('drag-over');
    }

    function handleCategoryDrop(e) {
        e.stopPropagation();
        if (draggedItem !== this) {
            const sourceName = draggedItem.dataset.categoryName;
            const targetName = this.dataset.categoryName;

            const order = settings.groupByTags ? settings.tagOrder : settings.groupOrder;
            const sourceIndex = order.findIndex(t => t === sourceName);
            const targetIndex = order.findIndex(t => t === targetName);

            if (sourceIndex > -1 && targetIndex > -1) {
                const [removed] = order.splice(sourceIndex, 1);
                order.splice(targetIndex, 0, removed);
                saveSettings().then(renderAllPrompts);
            }
        }
        return false;
    }

    function handleCategoryDragEnd(e) {
        document.querySelectorAll('.prompt-category').forEach(item => {
            item.classList.remove('dragging', 'drag-over');
        });
        draggedItem = null;
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // SEARCH FUNCTIONALITY
    // ═══════════════════════════════════════════════════════════════════════════════
    function handleSearch(e) {
        const searchTerm = e.target.value.toLowerCase();
        const isMini = e.target.closest('#floating-mini-panel');
        const container = isMini ? floatingMiniPanel : panel;

        container.querySelectorAll('.prompt-button-wrapper').forEach(wrapper => {
            const promptId = wrapper.dataset.promptId;
            const promptCategory = findPromptCategory(promptId);
            if (!promptCategory) return;

            const promptData = currentPrompts[promptCategory].find(p => p.id === promptId);
            if (!promptData) return;

            const promptName = promptData.name.toLowerCase();
            const promptText = promptData.text.toLowerCase();
            const promptTags = (promptData.tags || "").toLowerCase();

            const isVisible = promptName.includes(searchTerm) || promptText.includes(searchTerm) || promptTags.includes(searchTerm);
            wrapper.style.display = isVisible ? 'flex' : 'none';
        });
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // MODAL FUNCTIONS - PROMPT FORM
    // ═══════════════════════════════════════════════════════════════════════════════
    function showPromptForm(promptToEdit = null, categoryName = '') {
        isFormActiveLock = true;
        updateLockIcon();

        const form = promptFormModal.querySelector('#prompt-form');
        form.reset();

        const title = promptFormModal.querySelector('#prompt-form-title');
        const idInput = promptFormModal.querySelector('#prompt-id-input');
        const nameInput = promptFormModal.querySelector('#prompt-name-input');
        const textInput = promptFormModal.querySelector('#prompt-text-input');
        const tagsInput = promptFormModal.querySelector('#prompt-tags-input');
        const categorySelect = promptFormModal.querySelector('#prompt-category-select');
        const newCategoryInput = promptFormModal.querySelector('#prompt-new-category-input');
        const autoSendInput = promptFormModal.querySelector('#prompt-autosend-checkbox');
        const favoriteInput = promptFormModal.querySelector('#prompt-favorite-checkbox');
        const pinInput = promptFormModal.querySelector('#prompt-pin-checkbox');

        while (categorySelect.firstChild) categorySelect.removeChild(categorySelect.firstChild);
        (settings.groupOrder || []).forEach(cat => {
            const option = document.createElement('option');
            option.value = cat;
            option.textContent = cat;
            categorySelect.appendChild(option);
        });
        const newOption = document.createElement('option');
        newOption.value = '__createnew__';
        newOption.textContent = '--- Create New Group ---';
        categorySelect.appendChild(newOption);

        newCategoryInput.style.display = 'none';
        categorySelect.addEventListener('change', () => {
            newCategoryInput.style.display = categorySelect.value === '__createnew__' ? 'block' : 'none';
        });

        if (promptToEdit) {
            title.textContent = 'Edit Prompt';
            idInput.value = promptToEdit.id;
            nameInput.value = promptToEdit.name;
            textInput.value = promptToEdit.text;
            tagsInput.value = promptToEdit.tags || '';
            categorySelect.value = categoryName;
            autoSendInput.checked = promptToEdit.autoSend;
            favoriteInput.checked = settings.favorites.includes(promptToEdit.id);
            pinInput.checked = promptToEdit.pinned;
        } else {
            title.textContent = 'Add New Prompt';
            idInput.value = '';
            categorySelect.value = categoryName || (settings.groupOrder || [])[0] || '__createnew__';
            if (categorySelect.value === '__createnew__') newCategoryInput.style.display = 'block';
            favoriteInput.checked = false;
            pinInput.checked = false;
        }

        const closeForm = () => {
            promptFormModal.style.display = 'none';
            isFormActiveLock = false;
            updateLockIcon();
        };

        form.onsubmit = (e) => {
            e.preventDefault();
            const id = idInput.value || `prompt-${Date.now()}`;
            const newName = nameInput.value.trim();
            const newText = textInput.value.trim();

            if (promptToEdit && promptToEdit.text !== newText) {
                addHistoryEntry(id, promptToEdit.text);
            }

            const newPrompt = {
                id,
                name: newName,
                text: newText,
                tags: tagsInput.value.trim(),
                autoSend: autoSendInput.checked,
                pinned: pinInput.checked,
                usageCount: promptToEdit ? promptToEdit.usageCount : 0,
                lastUsed: promptToEdit ? promptToEdit.lastUsed : null
            };

            let targetCategory = (categorySelect.value === '__createnew__') ? newCategoryInput.value.trim() : categorySelect.value;
            if (!newPrompt.name || !newPrompt.text || !targetCategory) {
                showToast("Name, Text, and Group are required.", 'error');
                return;
            }
            if (targetCategory === "Favorites") {
                showToast("Cannot add prompts directly to Favorites.", 'error');
                return;
            }

            const isNewCategory = !currentPrompts[targetCategory];
            if (isNewCategory) {
                settings.groupOrder.push(targetCategory);
            }

            if (promptToEdit && categoryName && categoryName !== targetCategory) {
                currentPrompts[categoryName] = currentPrompts[categoryName].filter(p => p.id !== id);
                if (currentPrompts[categoryName].length === 0) {
                    delete currentPrompts[categoryName];
                    settings.groupOrder = settings.groupOrder.filter(g => g !== categoryName);
                }
            }

            if (!currentPrompts[targetCategory]) currentPrompts[targetCategory] = [];
            const existingPromptIndex = currentPrompts[targetCategory].findIndex(p => p.id === id);
            if (existingPromptIndex > -1) {
                currentPrompts[targetCategory][existingPromptIndex] = newPrompt;
            } else {
                currentPrompts[targetCategory].push(newPrompt);
            }

            const isFavorited = favoriteInput.checked;
            const wasFavorited = settings.favorites.includes(id);
            if (isFavorited && !wasFavorited) settings.favorites.push(id);
            if (!isFavorited && wasFavorited) settings.favorites = settings.favorites.filter(favId => favId !== id);

            Promise.all([savePrompts(), saveSettings()]).then(() => {
                renderAllPrompts();
                showToast(promptToEdit ? 'Prompt updated!' : 'Prompt added!', 'success');
                closeForm();
            });
        };

        promptFormModal.querySelector('#cancel-prompt-btn').onclick = closeForm;
        promptFormModal.querySelector('.modal-close-btn').onclick = closeForm;
        promptFormModal.addEventListener('click', e => {
            if (e.target === promptFormModal) closeForm();
        });

        promptFormModal.style.display = 'flex';
        nameInput.focus();
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // MODAL FUNCTIONS - IMPORT/EXPORT
    // ═══════════════════════════════════════════════════════════════════════════════
    function showImportExportModal() {
        const modalBody = importExportModal.querySelector('.modal-body');
        while (modalBody.firstChild) modalBody.removeChild(modalBody.firstChild);

        const exportSection = document.createElement('div');
        exportSection.className = 'form-section';
        const exportLabel = document.createElement('label');
        exportLabel.textContent = 'Export Prompts';
        const exportBtn = createButtonWithIcon('Export to JSON File', icons.importExport.cloneNode(true));
        exportBtn.classList.add('copy-btn');
        exportSection.append(exportLabel, exportBtn);

        const urlSection = document.createElement('div');
        urlSection.className = 'form-section';
        const urlLabel = document.createElement('label');
        urlLabel.textContent = 'Import from URL';
        const urlInputContainer = document.createElement('div');
        urlInputContainer.className = 'input-with-button';
        const urlInput = document.createElement('input');
        urlInput.type = 'url';
        urlInput.placeholder = 'Paste URL to raw .json file...';
        const fetchBtn = createButtonWithIcon('Fetch', icons.webLink.cloneNode(true));
        urlInputContainer.append(urlInput, fetchBtn);
        urlSection.append(urlLabel, urlInputContainer);

        const importSection = document.createElement('div');
        importSection.className = 'form-section';
        const importLabel = document.createElement('label');
        importLabel.htmlFor = 'import-textarea';
        importLabel.textContent = 'Import from File or Paste JSON';
        const importTextarea = document.createElement('textarea');
        importTextarea.id = 'import-textarea';
        importTextarea.placeholder = '...or paste your exported JSON here.';
        importTextarea.style.minHeight = '100px';
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.id = 'import-file-input';
        fileInput.accept = '.json,application/json';
        const fileBtn = createButtonWithIcon('Select JSON File', icons.uploadFile.cloneNode(true));
        fileBtn.classList.add('file-import-button');
        fileBtn.type = 'button';
        const importBtn = createButtonWithIcon('Import and Merge', null);
        const btnGroup = document.createElement('div');
        btnGroup.className = 'button-group';
        btnGroup.append(fileBtn, importBtn);
        importSection.append(importLabel, importTextarea, fileInput, btnGroup);

        modalBody.append(exportSection, urlSection, importSection);
        importExportModal.style.display = 'flex';

        const closeBtn = importExportModal.querySelector('.modal-close-btn');
        const closeModal = () => {
            importExportModal.style.display = 'none';
            lastFetchedUrl = null;
        };
        closeBtn.onclick = closeModal;
        importExportModal.addEventListener('click', e => {
            if (e.target === importExportModal) closeModal();
        });

        exportBtn.onclick = () => {
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(currentPrompts, null, 2));
            const downloadAnchorNode = document.createElement('a');
            downloadAnchorNode.setAttribute("href", dataStr);
            downloadAnchorNode.setAttribute("download", "gemini_prompts_export.json");
            document.body.appendChild(downloadAnchorNode);
            downloadAnchorNode.click();
            downloadAnchorNode.remove();
            showToast('Exporting prompts...', 'success');
        };

        fileBtn.onclick = () => fileInput.click();
        fileInput.onchange = (e) => {
            lastFetchedUrl = null;
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (event) => {
                importTextarea.value = event.target.result;
                showToast(`Loaded ${file.name}`);
            };
            reader.readAsText(file);
            fileInput.value = '';
        };

        fetchBtn.onclick = () => {
            const url = urlInput.value.trim();
            if (!url) {
                showToast("Please enter a URL.", 'error');
                return;
            }
            fetchBtn.textContent = 'Fetching...';
            fetchBtn.disabled = true;
            GM_xmlhttpRequest({
                method: 'GET',
                url: url,
                onload: function(response) {
                    importTextarea.value = response.responseText;
                    lastFetchedUrl = url;
                    showToast('Fetched content from URL.', 'success');
                    fetchBtn.textContent = 'Fetch';
                    fetchBtn.disabled = false;
                    urlInput.value = '';
                },
                onerror: function() {
                    lastFetchedUrl = null;
                    showToast('Failed to fetch from URL.', 'error');
                    fetchBtn.textContent = 'Fetch';
                    fetchBtn.disabled = false;
                }
            });
        };

        importBtn.onclick = () => {
            try {
                const importedData = JSON.parse(importTextarea.value);
                if (typeof importedData !== 'object' || importedData === null) {
                    throw new Error('Invalid JSON format.');
                }

                if (lastFetchedUrl) {
                    const filename = lastFetchedUrl.split('/').pop().split('?')[0];
                    let newGroupName = filename;
                    let counter = 1;
                    while (currentPrompts[newGroupName]) {
                        newGroupName = `${filename} (${counter++})`;
                    }
                    const allPrompts = Object.values(importedData).flat();
                    currentPrompts[newGroupName] = allPrompts;
                    if (!settings.groupOrder.includes(newGroupName)) {
                        settings.groupOrder.push(newGroupName);
                    }
                } else {
                    for (const category in importedData) {
                        if (currentPrompts[category]) {
                            currentPrompts[category].push(...importedData[category]);
                        } else {
                            currentPrompts[category] = importedData[category];
                            if (!settings.groupOrder.includes(category)) {
                                settings.groupOrder.push(category);
                            }
                        }
                    }
                }

                ensurePromptIDs(currentPrompts);
                Promise.all([savePrompts(), saveSettings()]).then(() => {
                    renderAllPrompts();
                    showToast('Prompts imported successfully!', 'success');
                    closeModal();
                });
            } catch (error) {
                showToast('Error importing: ' + error.message, 'error');
            }
        };
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // MODAL FUNCTIONS - VERSION HISTORY
    // ═══════════════════════════════════════════════════════════════════════════════
    function showVersionHistory(promptData) {
        versionHistoryModal.style.display = 'flex';
        const title = versionHistoryModal.querySelector('#history-modal-title');
        title.textContent = `History for "${promptData.name}"`;
        const list = versionHistoryModal.querySelector('#history-list');
        while (list.firstChild) list.removeChild(list.firstChild);

        const history = promptHistory[promptData.id] || [];
        if (history.length === 0) {
            const noHistory = document.createElement('li');
            noHistory.textContent = 'No previous versions found.';
            list.appendChild(noHistory);
            return;
        }

        history.forEach(entry => {
            const li = document.createElement('li');
            const dateSpan = document.createElement('span');
            dateSpan.textContent = new Date(entry.timestamp).toLocaleString();
            const textSpan = document.createElement('span');
            textSpan.className = 'history-text';
            textSpan.textContent = entry.text;
            const restoreBtn = createButtonWithIcon('Restore', null);
            restoreBtn.style.flexShrink = '0';
            restoreBtn.addEventListener('click', () => {
                if (confirm('Restore this version? Current text will be added to history.')) {
                    addHistoryEntry(promptData.id, promptData.text);
                    promptData.text = entry.text;
                    savePrompts().then(() => {
                        renderAllPrompts();
                        versionHistoryModal.style.display = 'none';
                        showToast('Prompt restored!', 'success');
                    });
                }
            });
            li.append(dateSpan, textSpan, restoreBtn);
            list.appendChild(li);
        });
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // MODAL FUNCTIONS - SETTINGS (COMPREHENSIVE)
    // ═══════════════════════════════════════════════════════════════════════════════
    function showSettingsModal() {
        const form = settingsModal.querySelector('.modal-body > form');
        while (form.firstChild) form.removeChild(form.firstChild);

        const createAccordionSection = (title, id) => {
            const section = document.createElement('div');
            section.className = 'accordion-section';
            const header = document.createElement('div');
            header.className = 'accordion-header';
            header.textContent = title;
            const content = document.createElement('div');
            content.className = 'accordion-content';
            content.id = id;

            header.addEventListener('click', () => {
                header.classList.toggle('active');
                content.style.display = content.style.display === 'flex' ? 'none' : 'flex';
            });
            section.append(header, content);
            form.appendChild(section);
            return content;
        };

        const createSettingRow = (id, labelText, descriptionText, controlElement) => {
            const section = document.createElement('div');
            section.className = 'settings-section-grid';
            const labelGroup = document.createElement('div');
            labelGroup.className = 'label-group';
            const label = document.createElement('label');
            label.textContent = labelText;
            label.htmlFor = id;
            if (descriptionText) {
                const description = document.createElement('span');
                description.className = 'description';
                description.textContent = descriptionText;
                labelGroup.append(label, description);
            } else {
                labelGroup.append(label);
            }
            section.append(labelGroup, controlElement);
            return section;
        };

        const createToggle = (id, checked, onChange) => {
            const container = document.createElement('div');
            container.className = 'toggle-switch';
            const input = document.createElement('input');
            input.type = 'checkbox';
            input.id = id;
            input.checked = checked;
            input.addEventListener('change', onChange);
            const label = document.createElement('label');
            label.htmlFor = id;
            container.append(input, label);
            return container;
        };

        // Interface Section
        const interfaceContent = createAccordionSection('Interface', 'settings-interface');

        const handleStyleSelector = document.createElement('select');
        handleStyleSelector.id = 'handle-style-select';
        [{ v: 'classic', t: 'Classic (Small)' }, { v: 'edge', t: 'Edge (Full Height)' }].forEach(opt => {
            const option = document.createElement('option');
            option.value = opt.v;
            option.textContent = opt.t;
            handleStyleSelector.appendChild(option);
        });
        handleStyleSelector.value = settings.handleStyle;
        handleStyleSelector.addEventListener('change', (e) => {
            settings.handleStyle = e.target.value;
            saveSettings().then(applySettingsAndTheme);
        });
        interfaceContent.appendChild(createSettingRow('handle-style-select', 'Panel Handle Style', 'Appearance of panel handle.', handleStyleSelector));

        interfaceContent.appendChild(createSettingRow('condensed-mode-toggle', "Condensed GUI", "Reduces padding/margins for compact view.",
            createToggle('condensed-mode-toggle', settings.condensedMode, (e) => {
                settings.condensedMode = e.target.checked;
                panel.classList.toggle('condensed', settings.condensedMode);
                saveSettings();
            })
        ));

        interfaceContent.appendChild(createSettingRow('group-by-tags-toggle', "Group Prompts by Tag", "Overrides categories with tag groups.",
            createToggle('group-by-tags-toggle', settings.groupByTags, (e) => {
                settings.groupByTags = e.target.checked;
                saveSettings().then(renderAllPrompts);
            })
        ));

        interfaceContent.appendChild(createSettingRow('full-width-toggle', "Enable Full Width Chat", "Expands chat to fill screen.",
            createToggle('full-width-toggle', settings.enableFullWidth, (e) => {
                settings.enableFullWidth = e.target.checked;
                toggleFullWidth(settings.enableFullWidth);
                saveSettings();
            })
        ));

        interfaceContent.appendChild(createSettingRow('mini-mode-toggle', "Enable Floating Mini-Mode", "Quick-access icon in chat input.",
            createToggle('mini-mode-toggle', settings.enableMiniMode, (e) => {
                settings.enableMiniMode = e.target.checked;
                saveSettings();
                if (miniPanelTrigger) miniPanelTrigger.style.display = settings.enableMiniMode ? 'flex' : 'none';
            })
        ));

        interfaceContent.appendChild(createSettingRow('copy-buttons-swap-toggle', "Swap 'Copy' Button Order", "Reverse order of copy buttons.",
            createToggle('copy-buttons-swap-toggle', settings.copyButtonOrderSwapped, (e) => {
                settings.copyButtonOrderSwapped = e.target.checked;
                saveSettings();
                renderActionButtons();
            })
        ));

        interfaceContent.appendChild(createSettingRow('show-tags-toggle', "Show Prompt Tags", "Display tags under prompts.",
            createToggle('show-tags-toggle', settings.showTags, (e) => {
                settings.showTags = e.target.checked;
                saveSettings().then(renderAllPrompts);
            })
        ));

        interfaceContent.appendChild(createSettingRow('show-navigator-toggle', "Show Conversation Navigator", "Display message navigator.",
            createToggle('show-navigator-toggle', settings.showNavigator, (e) => {
                const prevNavigator = settings.showNavigator;
                settings.showNavigator = e.target.checked;
                if (prevNavigator !== settings.showNavigator && navigatorContainer) {
                    navigatorContainer.classList.toggle('hidden', !settings.showNavigator);
                }
                saveSettings();
            })
        ));

        interfaceContent.appendChild(createSettingRow('auto-copy-code-toggle', "Auto-Copy Code on Completion", "Auto-copy code when generation finishes.",
            createToggle('auto-copy-code-toggle', settings.autoCopyCodeOnCompletion, (e) => {
                settings.autoCopyCodeOnCompletion = e.target.checked;
                saveSettings();
            })
        ));

        // Features Section
        const featuresContent = createAccordionSection('Features', 'settings-features');

        featuresContent.appendChild(createSettingRow('enhance-code-toggle', "Enhance Code Blocks", "Add collapse/copy buttons to code.",
            createToggle('enhance-code-toggle', settings.enhanceCode, (e) => {
                settings.enhanceCode = e.target.checked;
                saveSettings();
            })
        ));

        // Mode Selection Dropdown
        const modeSelector = document.createElement('select');
        modeSelector.id = 'mode-select';
        [
            { v: 'none', t: 'No Auto-Switch' },
            { v: 'fast', t: 'Fast' },
            { v: 'thinking', t: 'Thinking' },
            { v: 'pro', t: 'Pro' }
        ].forEach(opt => {
            const option = document.createElement('option');
            option.value = opt.v;
            option.textContent = opt.t;
            modeSelector.appendChild(option);
        });
        modeSelector.value = settings.selectedMode || 'none';
        modeSelector.addEventListener('change', (e) => {
            settings.selectedMode = e.target.value;
            saveSettings();
        });
        featuresContent.appendChild(createSettingRow('mode-select', 'Auto-Switch Mode', 'Automatically switch to this mode.', modeSelector));

        // Theme Section
        const themeContent = createAccordionSection('Theme', 'settings-theme');

        const themeSelector = document.createElement('select');
        themeSelector.id = 'theme-select';
        Object.keys(presetThemes).forEach(themeName => {
            const option = document.createElement('option');
            option.value = themeName;
            option.textContent = capitalizeFirstLetter(themeName);
            themeSelector.appendChild(option);
        });
        themeSelector.value = settings.themeName;
        themeSelector.addEventListener('change', (e) => {
            settings.themeName = e.target.value;
            settings.colors = { ...presetThemes[settings.themeName] };
            saveSettings().then(applySettingsAndTheme);
        });
        themeContent.appendChild(createSettingRow('theme-select', 'Theme Preset', 'Choose a theme.', themeSelector));

        const fontSlider = document.createElement('input');
        fontSlider.type = 'range';
        fontSlider.min = '12';
        fontSlider.max = '20';
        fontSlider.step = '0.5';
        fontSlider.value = parseFloat(settings.baseFontSize);
        fontSlider.addEventListener('input', (e) => {
            const newSize = e.target.value + 'px';
            settings.baseFontSize = newSize;
            document.documentElement.style.setProperty('--base-font-size', newSize);
        });
        fontSlider.addEventListener('change', saveSettings);
        themeContent.appendChild(createSettingRow('font-size-slider', 'Font Size', `Current: ${settings.baseFontSize}`, fontSlider));

        const fontFamilyInput = document.createElement('input');
        fontFamilyInput.type = 'text';
        fontFamilyInput.value = settings.fontFamily;
        fontFamilyInput.addEventListener('change', (e) => {
            settings.fontFamily = e.target.value;
            saveSettings().then(applySettingsAndTheme);
        });
        themeContent.appendChild(createSettingRow('font-family-input', 'Font Family', 'CSS font family.', fontFamilyInput));

        // Sync Section
        const syncContent = createAccordionSection('Sync & External', 'settings-sync');

        const gistInput = document.createElement('input');
        gistInput.type = 'url';
        gistInput.placeholder = 'https://gist.github.com/username/gistid';
        gistInput.value = settings.gistURL || '';
        gistInput.addEventListener('change', (e) => {
            settings.gistURL = e.target.value;
            saveSettings();
        });
        const gistContainer = document.createElement('div');
        gistContainer.className = 'input-with-button';
        const syncBtn = createButtonWithIcon('Sync Now', icons.sync.cloneNode(true));
        syncBtn.addEventListener('click', () => syncFromGist(true).then(() => renderAllPrompts()));
        gistContainer.append(gistInput, syncBtn);
        syncContent.appendChild(createSettingRow('gist-url-input', 'GitHub Gist URL', 'Sync prompts from Gist.', gistContainer));

        // Action Buttons
        const actionRow = document.createElement('div');
        actionRow.className = 'button-group';
        actionRow.style.gridTemplateColumns = '1fr';
        actionRow.style.marginTop = '20px';

        const saveBtn = createButtonWithIcon('Save Settings', null);
        saveBtn.classList.add('copy-btn');
        saveBtn.addEventListener('click', () => {
            saveSettings().then(() => {
                applySettingsAndTheme();
                settingsModal.style.display = 'none';
                showToast('Settings saved!', 'success');
            });
        });
        actionRow.appendChild(saveBtn);

        form.appendChild(actionRow);

        settingsModal.style.display = 'flex';
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // CHAT HISTORY & NAVIGATION
    // ═══════════════════════════════════════════════════════════════════════════════
    function createNavigator() {
        navigatorContainer = el('div', 'conversation-navigator');
        if (!settings.showNavigator) navigatorContainer.classList.add('hidden');

        const header = el('div', 'conv-nav-header');
        const title = el('div', 'conv-nav-title', 'Your Prompts');
        const toggle = el('button', 'conv-nav-toggle', settings.navigatorExpanded ? '▼' : '▶');

        header.appendChild(title);
        header.appendChild(toggle);

        header.onclick = () => {
            settings.navigatorExpanded = !settings.navigatorExpanded;
            toggle.textContent = settings.navigatorExpanded ? '▼' : '▶';
            navigatorContent.classList.toggle('collapsed', !settings.navigatorExpanded);
            saveSettings();
        };

        navigatorContent = el('div', 'conv-nav-content');
        if (!settings.navigatorExpanded) navigatorContent.classList.add('collapsed');

        const list = el('ul', 'conv-nav-list');
        list.id = 'conv-nav-list';
        navigatorContent.appendChild(list);

        navigatorContainer.appendChild(header);
        navigatorContainer.appendChild(navigatorContent);
        document.body.appendChild(navigatorContainer);
    }

    function assignIdToMessage(msgElem) {
        if (!msgElem.id) {
            userMsgCounter++;
            msgElem.id = 'user-msg-' + userMsgCounter;
            msgElem.dataset.index = userMsgCounter;
        }
    }

    function updateNavigator() {
        if (!settings.showNavigator) return;

        const list = document.getElementById('conv-nav-list');
        if (!list) return;

        const userMessages = document.querySelectorAll('user-query span.user-query-bubble-with-background');
        const existingItems = list.querySelectorAll('li');

        if (userMessages.length < existingItems.length) {
            while (list.firstChild) {
                list.removeChild(list.firstChild);
            }
        }

        if (userMessages.length > existingItems.length) {
            for (let i = existingItems.length; i < userMessages.length; i++) {
                const msgElem = userMessages[i];
                assignIdToMessage(msgElem);

                const text = msgElem.innerText.trim();
                const preview = text.length > 80 ? text.slice(0, 80) + '...' : text;
                const index = msgElem.dataset.index || '?';

                const item = el('li', 'conv-nav-item');
                const numberSpan = el('span', 'conv-nav-item-number', `${index}.`);
                const textNode = document.createTextNode(` ${preview}`);
                item.appendChild(numberSpan);
                item.appendChild(textNode);

                item.onclick = () => {
                    msgElem.scrollIntoView({ behavior: 'smooth', block: 'start' });
                };

                list.appendChild(item);
            }
        }

        if (userMessages.length === 0 && !list.querySelector('.conv-nav-empty')) {
            const empty = el('div', 'conv-nav-empty', 'No messages in this conversation yet.');
            list.appendChild(empty);
        } else if (userMessages.length > 0) {
            const empty = list.querySelector('.conv-nav-empty');
            if (empty) empty.remove();
        }
    }

    function debouncedUpdateNavigator() {
        if (navUpdateTimeout) clearTimeout(navUpdateTimeout);
        navUpdateTimeout = setTimeout(updateNavigator, NAV_UPDATE_DEBOUNCE);
    }

    async function autoSyncHistory() {
        if (isScraping) return;
        isScraping = true;

        updateStatus("Initializing Sync...", true);

        const scroller =
            document.querySelector('infinite-scroller') ||
            document.querySelector('[data-test-id="bard-sidenav-container"] infinite-scroller') ||
            document.querySelector('.sidenav-with-history-container');

        if (!scroller) {
            updateStatus("Sync Failed: Native sidebar not found.", false);
            isScraping = false;
            return;
        }

        updateStatus("Scanning History...", true);

        let previousHeight = 0;
        let attempts = 0;
        let count = 0;
        const MAX_IDLE = 15;

        const scrollInterval = setInterval(() => {
            scroller.scrollTop = scroller.scrollHeight + 5000;

            if (scroller.scrollHeight > previousHeight) {
                previousHeight = scroller.scrollHeight;
                attempts = 0;
                const currentCount = document.querySelectorAll('[data-test-id="conversation"]').length;
                if (currentCount > count) {
                    count = currentCount;
                    updateStatus(`Found ${count} chats...`, true);
                }
            } else {
                attempts++;
            }

            if (attempts >= MAX_IDLE) {
                clearInterval(scrollInterval);
                finishScrape();
            }
        }, 600);

        function finishScrape() {
            const nativeItems = document.querySelectorAll('[data-test-id="conversation"]');
            chatCache = [];

            nativeItems.forEach(item => {
                const titleEl = item.querySelector('.conversation-title') || item.querySelector('[class*="title"]');
                const titleText = titleEl ? titleEl.textContent.trim() : "Untitled Conversation";

                const link = item.closest('a') || item.querySelector('a');
                const url = link ? link.getAttribute('href') : null;

                if (titleText) {
                    chatCache.push({
                        title: titleText,
                        element: item,
                        url: url,
                        isPinned: settings.pinnedTitles.includes(titleText)
                    });
                }
            });

            isScraping = false;
            document.body.classList.add('gm-sidebar-replaced');
            saveChatCache();
            renderChatList();
            updateStatus(`Sync Complete. ${chatCache.length} chats.`);
            showToast(`Loaded ${chatCache.length} chats.`);
        }
    }

    function updateStatus(text, isBusy = false) {
        if (statusLabel) {
            statusLabel.textContent = text;
            statusLabel.className = `status-bar ${isBusy ? 'syncing' : ''}`;
            statusLabel.onclick = isBusy ? null : autoSyncHistory;
        }
    }

    function renderChatList() {
        if (!chatListContainer) return;
        while (chatListContainer.firstChild) chatListContainer.removeChild(chatListContainer.firstChild);

        const pinnedChats = chatCache.filter(c => c.isPinned);
        const regularChats = chatCache.filter(c => !c.isPinned);

        if (pinnedChats.length > 0) {
            const pinnedSection = el('div', 'chat-section-divider', '📌 Pinned');
            chatListContainer.appendChild(pinnedSection);
            pinnedChats.forEach((chat, idx) => chatListContainer.appendChild(createChatItem(chat, chatCache.indexOf(chat))));
        }

        if (regularChats.length > 0) {
            if (pinnedChats.length > 0) {
                const allSection = el('div', 'chat-section-divider', '💬 All Chats');
                chatListContainer.appendChild(allSection);
            }
            regularChats.forEach((chat, idx) => chatListContainer.appendChild(createChatItem(chat, chatCache.indexOf(chat))));
        }
    }

    function createChatItem(chat, index) {
        const item = el('div', 'navigator-item');
        if (chat.isPinned) item.classList.add('pinned');

        if (isConfigMode) {
            const checkbox = el('input');
            checkbox.type = 'checkbox';
            checkbox.className = 'item-checkbox';
            checkbox.checked = selectedChatIndices.has(index);
            checkbox.onclick = (e) => {
                e.stopPropagation();
                toggleChatSelection(index);
            };
            item.appendChild(checkbox);
        }

        const span = el('span');
        span.textContent = chat.title;
        item.appendChild(span);

        const pinBtn = el('button', 'icon-btn pin-btn');
        pinBtn.appendChild(chat.isPinned ? icons.pinFilled.cloneNode(true) : icons.pin.cloneNode(true));
        if (chat.isPinned) pinBtn.classList.add('active');
        pinBtn.onclick = (e) => {
            e.stopPropagation();
            togglePinChat(chat);
        };
        item.appendChild(pinBtn);

        item.onclick = () => {
            if (chat.url) window.location.href = chat.url;
        };

        return item;
    }

    function togglePinChat(chat) {
        chat.isPinned = !chat.isPinned;
        if (chat.isPinned) {
            if (!settings.pinnedTitles.includes(chat.title)) settings.pinnedTitles.push(chat.title);
        } else {
            settings.pinnedTitles = settings.pinnedTitles.filter(t => t !== chat.title);
        }
        saveSettings();
        saveChatCache();
        renderChatList();
    }

    function toggleConfigMode() {
        isConfigMode = !isConfigMode;
        selectedChatIndices.clear();

        if (isConfigMode && chatCache.some(c => !c.element)) {
            updateStatus("Refreshing for Management Mode...", true);
            autoSyncHistory();
        }

        if (chatListContainer) chatListContainer.classList.toggle('config-mode', isConfigMode);
        if (configControls) configControls.classList.toggle('visible', isConfigMode);

        const btn = document.getElementById('btn-config-mode');
        if (btn) {
            btn.classList.toggle('active-mode', isConfigMode);
            btn.title = isConfigMode ? "Exit Management Mode" : "Manage Chats";
        }

        renderChatList();
    }

    function toggleChatSelection(index) {
        if (selectedChatIndices.has(index)) selectedChatIndices.delete(index);
        else selectedChatIndices.add(index);
        updateBulkDeleteButton();
    }

    function updateBulkDeleteButton() {
        const btn = document.getElementById('btn-delete-sel');
        if (btn) btn.textContent = `Delete Selected (${selectedChatIndices.size})`;
    }

    function selectAllChats() {
        if (selectedChatIndices.size === chatCache.length) {
            selectedChatIndices.clear();
        } else {
            chatCache.forEach((_, i) => selectedChatIndices.add(i));
        }
        renderChatList();
        updateBulkDeleteButton();
    }

    async function deleteChatNative(chatObj) {
        const row = chatObj.element;
        if (!row) return;
        const deleteBtn = row.querySelector('button[aria-label*="Delete"], button[aria-label*="delete"]');
        if (deleteBtn) deleteBtn.click();
    }

    async function deleteSelectedChats() {
        if (selectedChatIndices.size === 0) return;
        if (!confirm(`Delete ${selectedChatIndices.size} conversation(s)? This cannot be undone.`)) return;

        const toDelete = Array.from(selectedChatIndices).map(i => chatCache[i]);
        for (const chat of toDelete) {
            await deleteChatNative(chat);
            await sleep(300);
        }
        selectedChatIndices.clear();
        showToast(`Deleted ${toDelete.length} conversation(s).`);
        setTimeout(() => autoSyncHistory(), 1500);
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // THINKING MODE & CODE ENHANCEMENT
    // ═══════════════════════════════════════════════════════════════════════════════
    function enforceSelectedMode() {
        if (!settings.alwaysThinking) return;

        const triggerBtn = document.querySelector('[data-test-id="bard-mode-menu-button"]');
        if (!triggerBtn) return;

        const currentLabel = triggerBtn.innerText || "";
        if (currentLabel.includes(TARGET_MODEL)) return;

        const isExpanded = triggerBtn.getAttribute('aria-expanded') === 'true';
        if (!isExpanded) triggerBtn.click();

        setTimeout(() => {
            const menuItems = document.querySelectorAll('[role="menuitem"], .mat-mdc-menu-item');
            let found = false;
            for (const item of menuItems) {
                if (item.innerText.includes(TARGET_MODEL)) {
                    item.click();
                    found = true;
                    showToast(`Switched to Thinking Mode`);
                    break;
                }
            }
            if (!found && !isExpanded) document.body.click();
        }, 150);
    }

    function enhanceCodeBlocks(root) {
        if (!settings.enhanceCode) return;
        const pres = root.querySelectorAll ? root.querySelectorAll('pre') : [];
        pres.forEach(pre => {
            if (processedPres.has(pre)) return;
            processedPres.add(pre);
            pre.setAttribute('data-gm-enhanced', 'true');
            const wrapper = pre.closest('.code-block-wrapper') || pre.parentElement;
            if (wrapper && !wrapper.querySelector('.gm-overlay-container')) {
                if (window.getComputedStyle(wrapper).position === 'static') wrapper.style.position = 'relative';
                const overlay = el('div', 'gm-overlay-container');
                const btn = el('button', 'gm-collapse-btn');
                const code = pre.querySelector('code');
                const updateIcon = () => {
                    while (btn.firstChild) btn.removeChild(btn.firstChild);
                    btn.appendChild(code?.classList.contains('gm-hidden-code') ? icons.plus.cloneNode(true) : icons.minus.cloneNode(true));
                };
                updateIcon();
                btn.onclick = () => {
                    code?.classList.toggle('gm-hidden-code');
                    updateIcon();
                };
                overlay.appendChild(btn);
                wrapper.appendChild(overlay);
                const footer = el('div', 'gm-code-footer');
                const copyBtn = createButtonWithIcon('Copy', null);
                copyBtn.className = 'gm-code-btn';
                copyBtn.onclick = async () => {
                    await navigator.clipboard.writeText(code.innerText);
                    copyBtn.textContent = 'Copied!';
                    setTimeout(() => copyBtn.textContent = 'Copy', 2000);
                };
                footer.appendChild(copyBtn);
                pre.parentNode.insertBefore(footer, pre.nextSibling);
            }
        });
    }

    function checkUIState() {
        const stopButton = document.querySelector('mat-icon[data-mat-icon-name="stop"]') ||
            document.querySelector('.stop-icon');

        if (loadingIndicator) {
            if (stopButton) {
                loadingIndicator.classList.add('visible');
            } else {
                loadingIndicator.classList.remove('visible');
            }
        }
    }

    function initializeGenerationObserver() {
        const setupObserver = () => {
            const sendButton = document.querySelector('button.send-button');
            if (sendButton) {
                if (generationObserver) generationObserver.disconnect();
                generationObserver = new MutationObserver(mutations => {
                    if (!settings.autoCopyCodeOnCompletion) return;
                    mutations.forEach(mutation => {
                        if (mutation.attributeName === 'class') {
                            const target = mutation.target;
                            const hasStopClass = target.classList.contains('stop');
                            if (hasStopClass) {
                                isGenerating = true;
                            } else if (isGenerating) {
                                isGenerating = false;
                                setTimeout(() => {
                                    const allCodeBlocks = document.querySelectorAll('code-block');
                                    if (allCodeBlocks.length > 0) {
                                        const latestCodeBlock = allCodeBlocks[allCodeBlocks.length - 1];
                                        const copyBtn = latestCodeBlock.querySelector('button[aria-label="Copy code"]');
                                        if (copyBtn) {
                                            copyBtn.click();
                                            showToast("Auto-copied Code", 'success');
                                        }
                                    }
                                }, 500);
                            }
                        }
                    });
                });
                generationObserver.observe(sendButton, { attributes: true, attributeFilter: ['class'] });
            }
        };
        const sendButtonObserver = new MutationObserver((mutations, observer) => {
            if (document.querySelector('button.send-button')) {
                setupObserver();
                observer.disconnect();
            }
        });
        sendButtonObserver.observe(document.body, { childList: true, subtree: true });
    }
    // ═══════════════════════════════════════════════════════════════════════════════
    // COPY ACTIONS
    // ═══════════════════════════════════════════════════════════════════════════════
    function initializeCopyActions() {
        copyResponseButton.addEventListener('click', async () => {
            const allResponses = document.querySelectorAll('response-container');
            if (allResponses.length > 0) {
                const latestResponse = allResponses[allResponses.length - 1];
                const textContainer = latestResponse.querySelector('div.markdown.prose');
                if (textContainer && navigator.clipboard) {
                    try {
                        await navigator.clipboard.writeText(textContainer.textContent);
                        showToast('Latest response copied!', 'success');
                    } catch (err) {
                        console.error('Failed to copy text: ', err);
                        showToast('Could not copy response.', 'error');
                    }
                } else {
                    showToast('Response content or clipboard not available.', 'error');
                }
            } else {
                showToast('No response found to copy.', 'error');
            }
        });

        copyCodeButton.addEventListener('click', () => {
            const allCodeBlocks = document.querySelectorAll('code-block');
            if (allCodeBlocks.length > 0) {
                const latestCodeBlock = allCodeBlocks[allCodeBlocks.length - 1];
                const copyBtn = latestCodeBlock.querySelector('button[aria-label="Copy code"]');
                if (copyBtn) {
                    copyBtn.click();
                    showToast('Code block copied!', 'success');
                } else {
                    showToast('Copy button not found in the latest code block.', 'error');
                }
            } else {
                showToast('No code block found to copy.', 'error');
            }
        });
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // RESIZE FUNCTIONALITY
    // ═══════════════════════════════════════════════════════════════════════════════
    function initResizeFunctionality() {
        let startX, startWidth;
        const onMouseMove = (e) => {
            const newWidth = startWidth + (settings.position === 'left' ? e.clientX - startX : startX - e.clientX);
            if (newWidth > 240 && newWidth < 800) {
                settings.panelWidth = newWidth;
                panel.style.setProperty('--panel-width', `${newWidth}px`);
                document.documentElement.style.setProperty('--panel-width', `${newWidth}px`);

                const mainContent = document.querySelector('bard-sidenav-content');
                if (mainContent) {
                    mainContent.style.marginLeft = settings.panelWidth + 'px';
                    mainContent.style.width = `calc(100% - ${settings.panelWidth}px)`;
                }
            }
        };
        const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            panel.classList.remove('is-resizing');
            document.body.style.cursor = 'default';
            saveSettings();
            applySettingsAndTheme();
        };
        resizeHandle.addEventListener('mousedown', (e) => {
            e.preventDefault();
            startX = e.clientX;
            startWidth = panel.offsetWidth;
            panel.classList.add('is-resizing');
            document.body.style.cursor = 'ew-resize';
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        });
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // BUILD MODALS
    // ═══════════════════════════════════════════════════════════════════════════════
    function buildModals() {
        // Prompt Form Modal
        promptFormModal = el('div', 'modal-overlay');
        const promptFormContent = el('div', 'modal-content');
        const promptFormHeader = el('div', 'modal-header');
        const promptFormTitle = el('h2', 'modal-title');
        promptFormTitle.id = 'prompt-form-title';
        promptFormTitle.textContent = 'Add New Prompt';
        const promptFormCloseBtn = el('button', 'modal-close-btn');
        promptFormCloseBtn.appendChild(icons.close.cloneNode(true));
        promptFormHeader.append(promptFormTitle, promptFormCloseBtn);

        const form = el('form');
        form.id = 'prompt-form';
        const modalBody = el('div', 'modal-body');

        const idSection = el('input');
        idSection.type = 'hidden';
        idSection.id = 'prompt-id-input';

        const nameSection = el('div', 'form-section');
        const nameLabel = el('label');
        nameLabel.htmlFor = 'prompt-name-input';
        nameLabel.textContent = 'Prompt Name *';
        nameSection.appendChild(nameLabel);
        const nameInput = el('input');
        nameInput.type = 'text';
        nameInput.id = 'prompt-name-input';
        nameInput.required = true;
        nameSection.appendChild(nameInput);

        const textSection = el('div', 'form-section');
        const textLabel = el('label');
        textLabel.htmlFor = 'prompt-text-input';
        textLabel.textContent = 'Prompt Text *';
        textSection.appendChild(textLabel);
        const textInput = el('textarea');
        textInput.id = 'prompt-text-input';
        textInput.rows = 6;
        textInput.required = true;
        textSection.appendChild(textInput);

        const tagsSection = el('div', 'form-section');
        const tagsLabel = el('label');
        tagsLabel.htmlFor = 'prompt-tags-input';
        tagsLabel.textContent = 'Tags (comma-separated)';
        tagsSection.appendChild(tagsLabel);
        const tagsInput = el('input');
        tagsInput.type = 'text';
        tagsInput.id = 'prompt-tags-input';
        tagsInput.placeholder = 'tag1, tag2, tag3';
        tagsSection.appendChild(tagsInput);

        const categorySection = el('div', 'form-section');
        const categoryLabel = el('label');
        categoryLabel.htmlFor = 'prompt-category-select';
        categoryLabel.textContent = 'Group/Category *';
        categorySection.appendChild(categoryLabel);
        const categorySelect = el('select');
        categorySelect.id = 'prompt-category-select';
        categorySection.appendChild(categorySelect);
        const newCategoryInput = el('input');
        newCategoryInput.type = 'text';
        newCategoryInput.id = 'prompt-new-category-input';
        newCategoryInput.placeholder = 'Enter new group name';
        newCategoryInput.style.display = 'none';
        categorySection.appendChild(newCategoryInput);

        const autoSendRow = el('div', 'checkbox-row');
        const autoSendCheckbox = el('input');
        autoSendCheckbox.type = 'checkbox';
        autoSendCheckbox.id = 'prompt-autosend-checkbox';
        autoSendRow.append(autoSendCheckbox, el('label', '', 'Auto-send on click'));
        autoSendRow.querySelector('label').htmlFor = 'prompt-autosend-checkbox';

        const favoriteRow = el('div', 'checkbox-row');
        const favoriteCheckbox = el('input');
        favoriteCheckbox.type = 'checkbox';
        favoriteCheckbox.id = 'prompt-favorite-checkbox';
        favoriteRow.append(favoriteCheckbox, el('label', '', 'Add to Favorites'));
        favoriteRow.querySelector('label').htmlFor = 'prompt-favorite-checkbox';

        const pinRow = el('div', 'checkbox-row');
        const pinCheckbox = el('input');
        pinCheckbox.type = 'checkbox';
        pinCheckbox.id = 'prompt-pin-checkbox';
        pinRow.append(pinCheckbox, el('label', '', 'Pin to top'));
        pinRow.querySelector('label').htmlFor = 'prompt-pin-checkbox';

        const btnGroup = el('div', 'button-group');
        const submitBtn = createButtonWithIcon('Save', null);
        submitBtn.type = 'submit';
        submitBtn.classList.add('copy-btn');
        const cancelBtn = createButtonWithIcon('Cancel', null);
        cancelBtn.type = 'button';
        cancelBtn.id = 'cancel-prompt-btn';
        btnGroup.append(submitBtn, cancelBtn);

        modalBody.append(idSection, nameSection, textSection, tagsSection, categorySection, autoSendRow, favoriteRow, pinRow, btnGroup);
        form.appendChild(modalBody);
        promptFormContent.append(promptFormHeader, form);
        promptFormModal.appendChild(promptFormContent);
        document.body.appendChild(promptFormModal);

        // Import/Export Modal
        importExportModal = el('div', 'modal-overlay');
        const importExportContent = el('div', 'modal-content');
        const importExportHeader = el('div', 'modal-header');
        const importExportTitle = el('h2', 'modal-title', 'Import/Export Prompts');
        const importExportCloseBtn = el('button', 'modal-close-btn');
        importExportCloseBtn.appendChild(icons.close.cloneNode(true));
        importExportCloseBtn.onclick = () => importExportModal.style.display = 'none';
        importExportHeader.append(importExportTitle, importExportCloseBtn);
        const importExportBody = el('div', 'modal-body');
        importExportContent.append(importExportHeader, importExportBody);
        importExportModal.appendChild(importExportContent);
        document.body.appendChild(importExportModal);

        // Settings Modal
        settingsModal = el('div', 'modal-overlay');
        const settingsContent = el('div', 'modal-content');
        const settingsHeader = el('div', 'modal-header');
        const settingsTitle = el('h2', 'modal-title', 'Settings');
        const settingsCloseBtn = el('button', 'modal-close-btn');
        settingsCloseBtn.appendChild(icons.close.cloneNode(true));
        settingsCloseBtn.onclick = () => settingsModal.style.display = 'none';
        settingsHeader.append(settingsTitle, settingsCloseBtn);
        const settingsBody = el('div', 'modal-body');
        const settingsForm = el('form');
        settingsBody.appendChild(settingsForm);
        settingsContent.append(settingsHeader, settingsBody);
        settingsModal.appendChild(settingsContent);
        document.body.appendChild(settingsModal);

        // Version History Modal
        versionHistoryModal = el('div', 'modal-overlay');
        const historyContent = el('div', 'modal-content');
        const historyHeader = el('div', 'modal-header');
        const historyTitle = el('h2', 'modal-title');
        historyTitle.id = 'history-modal-title';
        historyTitle.textContent = 'Version History';
        const historyCloseBtn = el('button', 'modal-close-btn');
        historyCloseBtn.appendChild(icons.close.cloneNode(true));
        historyCloseBtn.onclick = () => versionHistoryModal.style.display = 'none';
        historyHeader.append(historyTitle, historyCloseBtn);
        const historyBody = el('div', 'modal-body');
        const historyList = el('ul');
        historyList.id = 'history-list';
        historyBody.appendChild(historyList);
        historyContent.append(historyHeader, historyBody);
        versionHistoryModal.appendChild(historyContent);
        versionHistoryModal.addEventListener('click', e => {
            if (e.target === versionHistoryModal) versionHistoryModal.style.display = 'none';
        });
        document.body.appendChild(versionHistoryModal);
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // RENDER MAIN PANEL
    // ═══════════════════════════════════════════════════════════════════════════════
    function renderPanel() {
        // Create main panel
        panel = el('div', 'gemini-prompt-panel');
        panel.classList.add(settings.position === 'left' ? 'left-side' : 'right-side');

        // Create handle
        handle = el('div', 'panel-handle');
        handle.classList.toggle('right-side-handle', settings.position === 'right');
        handle.classList.toggle('edge', settings.handleStyle === 'edge');
        handle.addEventListener('mouseenter', () => panel.classList.add('visible'));
        handle.addEventListener('mouseleave', hidePanel);
        document.body.appendChild(handle);

        // Create resize handle
        resizeHandle = el('div', 'gemini-resize-handle');
        resizeHandle.className = `gemini-resize-handle ${settings.position === 'right' ? 'left-handle' : 'right-handle'}`;
        panel.appendChild(resizeHandle);

        // Header
        const header = el('div', 'gemini-prompt-panel-header');
        const brandText = el('span', 'header-brand-text', 'GeminiBuddy');
        leftHeaderControls = el('div', 'panel-header-controls');
        rightHeaderControls = el('div', 'panel-header-controls');

        lockButton = el('button');
        lockButton.title = 'Lock Panel';
        lockButton.appendChild(icons.unlocked.cloneNode(true));
        lockButton.addEventListener('click', () => {
            isManuallyLocked = !isManuallyLocked;
            updateLockIcon();
            if (isManuallyLocked) {
                panel.classList.add('visible');
            }
        });

        loadingIndicator = el('img', 'header-loading-icon');
        loadingIndicator.src = 'https://raw.githubusercontent.com/SysAdminDoc/GeminiBuddy/refs/heads/main/assets/favicon/loader.gif';

        header.append(leftHeaderControls, brandText, loadingIndicator, rightHeaderControls);
        panel.appendChild(header);

        // Content
        const content = el('div', 'gemini-prompt-panel-content');

        // Action buttons
        actionGroup = el('div', 'button-group');
        copyResponseButton = createButtonWithIcon('Copy Response', icons.copy.cloneNode(true));
        copyResponseButton.classList.add('copy-btn');
        copyCodeButton = createButtonWithIcon('Copy Code', icons.copy.cloneNode(true));
        copyCodeButton.classList.add('copy-btn');
        actionGroup.append(copyResponseButton, copyCodeButton);
        content.appendChild(actionGroup);

        // Search and Add
        searchAddContainer = el('div', 'search-add-container');
        searchInput = el('input');
        searchInput.type = 'search';
        searchInput.placeholder = 'Search prompts...';
        searchInput.id = 'prompt-search-input';
        searchInput.className = 'search-input';
        searchInput.addEventListener('input', handleSearch);

        const addImportGroup = el('div', 'button-group');
        const addBtn = createButtonWithIcon('Add Prompt', icons.plus.cloneNode(true));
        addBtn.addEventListener('click', () => showPromptForm());
        const importExportBtn = createButtonWithIcon('Import/Export', icons.importExport.cloneNode(true));
        importExportBtn.addEventListener('click', showImportExportModal);
        addImportGroup.append(addBtn, importExportBtn);

        searchAddContainer.append(searchInput, addImportGroup);
        content.appendChild(searchAddContainer);

        // Prompts container
        const promptsContainer = el('div', 'prompt-group-container');
        const customPromptsDiv = el('div');
        customPromptsDiv.id = 'custom-prompts-container';
        promptsContainer.appendChild(customPromptsDiv);
        content.appendChild(promptsContainer);

        // Chat list
        chatListContainer = el('div', 'chat-list-container');
        content.appendChild(chatListContainer);

        // Config controls
        configControls = el('div', 'config-controls');
        const selectAllBtn = el('button', 'bulk-btn btn-select-all', 'Select All');
        selectAllBtn.addEventListener('click', selectAllChats);
        const deleteSelBtn = el('button', 'bulk-btn btn-delete-sel');
        deleteSelBtn.id = 'btn-delete-sel';
        deleteSelBtn.textContent = 'Delete Selected (0)';
        deleteSelBtn.addEventListener('click', deleteSelectedChats);
        configControls.append(selectAllBtn, deleteSelBtn);
        content.appendChild(configControls);

        // Status bar
        statusLabel = el('div', 'status-bar', 'Click to sync chat history');
        statusLabel.addEventListener('click', autoSyncHistory);
        content.appendChild(statusLabel);

        panel.appendChild(content);
        panel.addEventListener('mouseenter', () => panel.classList.add('visible'));
        panel.addEventListener('mouseleave', hidePanel);
        document.body.appendChild(panel);

        // Mini panel removed (enableMiniMode set to false)
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // OBSERVERS
    // ═══════════════════════════════════════════════════════════════════════════════
    function observeConversation() {
        const mainElem = document.querySelector('main');
        if (!mainElem) return;

        new MutationObserver(() => {
            debouncedUpdateNavigator();
        }).observe(mainElem, { childList: true, subtree: true });
    }

    function waitForChatToLoad() {
        userMsgCounter = 0;
        const list = document.getElementById('conv-nav-list');
        if (list) {
            while (list.firstChild) {
                list.removeChild(list.firstChild);
            }
        }
        debouncedUpdateNavigator();
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // INITIALIZATION
    // ═══════════════════════════════════════════════════════════════════════════════
    async function init() {
        const check = setInterval(async () => {
            if (document.querySelector('bard-sidenav-content')) {
                clearInterval(check);

                await loadSettings();
                await loadHistory();
                await loadData();

                applyStyles();

                toast = el('div', 'toast-notification');
                document.body.appendChild(toast);

                buildModals();
                renderPanel();
                createNavigator();

                await loadAndDisplayPrompts();
                await applySettingsAndTheme();

                if (settings.gistURL) {
                    syncFromGist(false).then(() => renderAllPrompts()).catch(e => console.log('Gist sync skipped'));
                }

                initializeCopyActions();
                initResizeFunctionality();
                initializeGenerationObserver();

                const mainContent = document.querySelector('bard-sidenav-content');
                if (mainContent) {
                    mainContent.style.marginLeft = settings.panelWidth + 'px';
                    mainContent.style.width = `calc(100% - ${settings.panelWidth}px)`;
                }

                new MutationObserver((mutations) => {
                    mutations.forEach(m => m.addedNodes.forEach(node => {
                        if (node.nodeType === 1) enhanceCodeBlocks(node);
                    }));
                }).observe(document.body, { childList: true, subtree: true });

                enhanceCodeBlocks(document.body);
                observeConversation();
                waitForChatToLoad();

                // Watch for URL changes
                let lastUrl = location.href;
                new MutationObserver(() => {
                    if (location.href !== lastUrl) {
                        lastUrl = location.href;
                        waitForChatToLoad();
                    }
                }).observe(document.body, { childList: true, subtree: true });

                console.log('GeminiBuddy Ultimate v100 initialized successfully! 🎉');
            }
        }, 500);

        // Background intervals
        setInterval(enforceSelectedMode, THINKING_CHECK_INTERVAL);
        setInterval(checkUIState, UI_STATE_CHECK_INTERVAL);
    }

    // Start the script
    if (document.readyState === 'complete') init();
    else window.addEventListener('load', init);

})();