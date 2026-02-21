// ==UserScript==
// @name         GeminiBuddy Ultimate Edition (with Conversation Navigator)
// @namespace    https://github.com/SysAdminDoc/GeminiBuddy
// @version      57.0-Ultimate
// @description  Complete Gemini enhancement: Sidebar replacement, prompt management, conversation navigator, and response tracking
// @author       Matthew Parker & Gemini (Enhanced by Claude)
// @match        https://gemini.google.com/*
// @grant        GM_addStyle
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_xmlhttpRequest
// @run-at       document-idle
// @license      MIT
// ==/UserScript==

(function() {
    'use strict';

    if (window.geminiPanelEnhanced) return;
    window.geminiPanelEnhanced = true;
    console.log('GeminiBuddy Ultimate v57.0 loaded');

    // --- CONFIG ---
    const DEFAULT_PROMPTS_URL = "https://raw.githubusercontent.com/SysAdminDoc/Gemini-Prompt-Panel/refs/heads/main/Prompts/defaultpromptlist.json";
    const GM_PROMPTS_KEY = 'gemini_custom_prompts_lite_v4';
    const GM_SETTINGS_KEY = 'gemini_panel_settings_lite_v5';
    const GM_CHAT_CACHE_KEY = 'gemini_chat_cache_v1';
    const CACHE_DURATION_MS = 24 * 60 * 60 * 1000;
    const THINKING_CHECK_INTERVAL = 1000;
    const UI_STATE_CHECK_INTERVAL = 500;
    const NAV_UPDATE_DEBOUNCE = 300;
    const TARGET_MODEL = "Thinking";

    // --- STATE ---
    let currentPrompts = {};
    let settings = {
        panelWidth: 300,
        wideMode: true,
        enhanceCode: true,
        alwaysThinking: false,
        pinnedTitles: [],
        pinnedPromptIds: [],
        promptsExpanded: false,
        reducedMotion: false,
        showNavigator: true,
        navigatorExpanded: true
    };

    let chatCache = [];
    let searchQuery = '';
    let isScraping = false;
    let isConfigMode = false;
    let selectedChatIndices = new Set();
    const processedPres = new WeakSet();
    let userMsgCounter = 0;
    let navUpdateTimeout = null;

    // DOM Elements
    let panel, promptFormModal, importExportModal, settingsModal, toast, searchInput;
    let chatListContainer, statusLabel, configControls, promptZone, loadingIndicator;
    let navigatorContainer, navigatorContent;

    // --- CSS ---
    const CSS = `
        :root {
            --panel-font: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            --base-font-size: 14px;
            --bg-tier-1: #1e1e20;
            --bg-tier-2: #2a2a2e;
            --bg-tier-3: #3a3a3e;
            --bg-tier-4: #4e4e52;
            --text-primary: #e8eaed;
            --text-secondary: #9aa0a6;
            --text-tertiary: #5f6368;
            --border-subtle: #444746;
            --border-active: #76797d;
            --accent-primary: #8ab4f8;
            --accent-danger: #ff8b8b;
            --accent-warning: #fdd663;
            --accent-success: #81c995;
            --z-panel: 9010;
            --z-modal: 9100;
            --z-toast: 9200;
            --z-navigator: 9015;
        }

        /* --- NATIVE SIDEBAR HIDING --- */
        body.gm-sidebar-replaced bard-sidenav-container > bard-sidenav,
        body.gm-sidebar-replaced .mystuff-side-nav-update {
            position: fixed !important;
            left: -10000px !important;
            top: 0 !important;
            width: 0 !important;
            height: 100vh !important;
            opacity: 0 !important;
            pointer-events: none !important;
            z-index: -9999 !important;
            overflow: hidden !important;
        }

        body.gm-sidebar-replaced bard-sidenav-content {
            margin-left: var(--panel-width, 300px) !important;
            width: calc(100% - var(--panel-width, 300px)) !important;
            transition: margin-left 0.2s;
        }

        .gm-hidden { display: none !important; }

        /* --- MAIN PANEL --- */
        .gemini-prompt-panel {
            font-family: var(--panel-font);
            font-size: var(--base-font-size);
            position: fixed;
            top: 0;
            bottom: 0;
            left: 0;
            z-index: var(--z-panel);
            background: var(--bg-tier-1);
            color: var(--text-primary);
            border-right: 1px solid var(--border-subtle);
            display: flex;
            flex-direction: column;
            width: var(--panel-width, 300px);
            box-sizing: border-box;
        }

        /* --- HEADER --- */
        .gemini-prompt-panel-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 14px;
            background: var(--bg-tier-3);
            border-bottom: 1px solid var(--border-subtle);
            flex-shrink: 0;
        }

        .header-left-group {
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .header-brand-text {
            font-weight: 800;
            font-size: 18px;
            letter-spacing: -0.5px;
            background-image: linear-gradient(90deg, #a855f7 0%, #fbbf24 25%, #ec4899 50%, #3b82f6 75%, #22c55e 100%);
            -webkit-background-clip: text;
            background-clip: text;
            color: transparent;
            text-shadow: 0px 0px 15px rgba(236, 72, 153, 0.2);
            filter: drop-shadow(0 0 1px rgba(255,255,255,0.1));
        }

        .header-loading-icon {
            width: 20px;
            height: 20px;
            border-radius: 50%;
            object-fit: contain;
            opacity: 0;
            transition: opacity 0.3s ease-in-out;
            pointer-events: none;
        }

        .header-loading-icon.visible {
            opacity: 1;
        }

        .header-actions {
            display: flex;
            gap: 8px;
        }

        /* --- CONTENT WRAPPER --- */
        .gemini-prompt-panel-content {
            padding: 0;
            display: flex;
            flex-direction: column;
            flex-grow: 1;
            overflow: hidden;
            background: var(--bg-tier-1);
        }

        /* --- TOP CONTROLS --- */
        .top-controls {
            padding: 14px;
            gap: 10px;
            display: flex;
            flex-direction: column;
            background: var(--bg-tier-1);
            flex-shrink: 0;
        }

        .google-gradient-btn {
            width: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            border: none;
            color: white !important;
            position: relative;
            overflow: hidden;
            padding: 10px 20px;
            border-radius: 20px;
            font-weight: bold;
            cursor: pointer;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1), 0 1px 3px rgba(0,0,0,0.08);
            background: linear-gradient(90deg, #4285F4, #DB4437, #F4B400, #0F9D58, #4285F4);
            background-size: 200% 100%;
            animation: google-gradient-animation 4s linear infinite;
            transition: transform 0.15s ease, box-shadow 0.15s ease;
        }

        @keyframes google-gradient-animation {
            0% { background-position: 0% 50%; }
            100% { background-position: 200% 50%; }
        }

        .google-gradient-btn::after {
            content: '';
            position: absolute;
            top: -50%;
            left: -50%;
            width: 200%;
            height: 200%;
            background: linear-gradient(to right, rgba(255, 255, 255, 0) 0%, rgba(255, 255, 255, 0.35) 50%, rgba(255, 255, 255, 0) 100%);
            transform: translateX(-150%);
            transition: transform 0.6s ease;
            pointer-events: none;
        }

        .google-gradient-btn:hover::after {
            transform: translateX(150%);
        }

        .google-gradient-btn:active {
            transform: translateY(1px);
            box-shadow: 0 2px 4px rgba(0,0,0,0.1), 0 1px 1px rgba(0,0,0,0.08);
        }

        .search-input {
            width: 100%;
            padding: 8px 10px;
            border-radius: 6px;
            background: var(--bg-tier-2);
            border: 1px solid var(--border-subtle);
            color: var(--text-primary);
            font-size: 13px;
            box-sizing: border-box;
        }

        .search-input:focus {
            outline: none;
            border-color: var(--accent-primary);
        }

        /* --- CONFIG CONTROLS --- */
        .config-controls {
            padding: 10px;
            background: #2f2f33;
            border-bottom: 1px solid var(--border-subtle);
            display: flex;
            gap: 8px;
            align-items: center;
            display: none;
            flex-shrink: 0;
        }

        .config-controls.visible {
            display: flex;
        }

        .bulk-btn {
            padding: 6px 12px;
            border-radius: 16px;
            font-size: 12px;
            font-weight: 600;
            cursor: pointer;
            border: none;
            flex: 1;
        }

        .btn-select-all {
            background: var(--bg-tier-3);
            color: var(--text-primary);
            border: 1px solid var(--border-subtle);
        }

        .btn-delete-sel {
            background: #5c2b2b;
            color: #ffcccc;
            border: 1px solid #7a3b3b;
        }

        .btn-delete-sel:hover {
            background: #7a3b3b;
        }

        /* --- PROMPT ZONE --- */
        .prompts-zone {
            display: flex;
            flex-direction: column;
            border-bottom: 1px solid var(--border-subtle);
            background: var(--bg-tier-1);
            flex-shrink: 0;
            max-height: 40vh;
        }

        .pinned-prompts-container {
            padding: 8px 14px;
            background: rgba(138, 180, 248, 0.05);
            border-bottom: 1px solid var(--border-subtle);
            display: flex;
            flex-direction: column;
            gap: 4px;
            max-height: 150px;
            overflow-y: auto;
        }

        .pinned-prompts-header {
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: var(--accent-primary);
            font-weight: 700;
            margin-bottom: 4px;
        }

        .prompt-drawer-header {
            padding: 8px 14px;
            background: var(--bg-tier-2);
            color: var(--text-secondary);
            font-size: 12px;
            font-weight: 600;
            display: flex;
            justify-content: space-between;
            align-items: center;
            cursor: pointer;
            border-bottom: 1px solid var(--border-subtle);
            user-select: none;
        }

        .prompt-drawer-header:hover {
            color: var(--text-primary);
            background: var(--bg-tier-3);
        }

        .prompt-drawer-content {
            overflow-y: auto;
            background: var(--bg-tier-1);
            display: none;
        }

        .prompt-drawer-content.expanded {
            display: block;
        }

        .prompt-item {
            padding: 6px 14px 6px 24px;
            cursor: pointer;
            font-size: 13px;
            color: var(--text-secondary);
            display: flex;
            justify-content: space-between;
            align-items: center;
            position: relative;
        }

        .prompt-item:hover {
            color: var(--text-primary);
            background: var(--bg-tier-2);
        }

        .prompt-pin-btn {
            opacity: 0;
            transition: opacity 0.2s;
            color: var(--text-tertiary);
            padding: 2px;
        }

        .prompt-item:hover .prompt-pin-btn,
        .prompt-pin-btn.active {
            opacity: 1;
        }

        .prompt-pin-btn.active {
            color: var(--accent-primary);
        }

        .prompt-category-header {
            display: flex;
            justify-content: space-between;
            padding: 6px 14px;
            cursor: pointer;
            font-weight: 600;
            color: var(--text-secondary);
            font-size: 12px;
        }

        /* --- CHAT LIST --- */
        .chat-list-container {
            overflow-y: auto;
            display: flex;
            flex-direction: column;
            flex-grow: 1;
            padding: 8px 0;
            min-height: 0;
        }

        .chat-section-divider {
            padding: 4px 14px;
            font-size: 10px;
            text-transform: uppercase;
            color: var(--text-tertiary);
            font-weight: 700;
            margin-top: 8px;
            margin-bottom: 4px;
        }

        .navigator-item {
            padding: 8px 14px;
            margin: 0 8px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 13px;
            color: var(--text-secondary);
            display: flex;
            align-items: center;
            gap: 10px;
            transition: background-color 0.1s;
            white-space: nowrap;
            overflow: hidden;
            flex-shrink: 0;
            position: relative;
        }

        .navigator-item span {
            overflow: hidden;
            text-overflow: ellipsis;
            flex-grow: 1;
        }

        .navigator-item:hover {
            background: var(--bg-tier-2);
            color: var(--text-primary);
        }

        .navigator-item.active {
            background: #3c4043;
            color: var(--text-primary);
            font-weight: 500;
        }

        .navigator-item.pinned {
            border-left: 3px solid var(--accent-primary);
            padding-left: 11px;
            background: rgba(138, 180, 248, 0.03);
        }

        .config-mode .navigator-item {
            padding-left: 8px;
        }

        .item-checkbox {
            width: 16px;
            height: 16px;
            cursor: pointer;
            accent-color: var(--accent-primary);
        }

        .pin-btn {
            opacity: 0.2;
            transition: opacity 0.2s;
            padding: 4px;
            cursor: pointer;
            display: flex;
        }

        .navigator-item:hover .pin-btn,
        .pin-btn.active {
            opacity: 1;
            color: var(--accent-primary);
        }

        /* --- CONVERSATION NAVIGATOR --- */
        .conversation-navigator {
            position: fixed;
            top: 60px;
            right: 20px;
            width: 280px;
            max-height: calc(100vh - 80px);
            background: var(--bg-tier-2);
            border: 1px solid var(--border-subtle);
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            z-index: var(--z-navigator);
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }

        .conversation-navigator.hidden {
            display: none;
        }

        .conv-nav-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px 14px;
            background: var(--bg-tier-3);
            border-bottom: 1px solid var(--border-subtle);
            cursor: pointer;
            user-select: none;
        }

        .conv-nav-header:hover {
            background: var(--bg-tier-4);
        }

        .conv-nav-title {
            font-weight: 600;
            font-size: 13px;
            color: var(--text-primary);
        }

        .conv-nav-toggle {
            background: none;
            border: none;
            color: var(--text-secondary);
            cursor: pointer;
            font-size: 16px;
            padding: 0;
        }

        .conv-nav-content {
            overflow-y: auto;
            padding: 8px;
            flex-grow: 1;
        }

        .conv-nav-content.collapsed {
            display: none;
        }

        .conv-nav-list {
            list-style: none;
            padding: 0;
            margin: 0;
        }

        .conv-nav-item {
            padding: 8px 10px;
            margin-bottom: 4px;
            background: var(--bg-tier-1);
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
            color: var(--text-secondary);
            border-left: 3px solid transparent;
            transition: all 0.2s;
        }

        .conv-nav-item:hover {
            background: var(--bg-tier-3);
            color: var(--text-primary);
            border-left-color: var(--accent-primary);
        }

        .conv-nav-item-number {
            display: inline-block;
            min-width: 20px;
            font-weight: 600;
            color: var(--accent-primary);
        }

        .conv-nav-empty {
            padding: 20px;
            text-align: center;
            color: var(--text-tertiary);
            font-size: 12px;
        }

        /* --- STATUS BAR --- */
        .status-bar {
            padding: 8px 14px;
            font-size: 12px;
            color: var(--text-tertiary);
            border-top: 1px solid var(--border-subtle);
            text-align: center;
            background: var(--bg-tier-2);
            cursor: pointer;
            flex-shrink: 0;
        }

        .status-bar.syncing {
            color: var(--accent-primary);
            font-weight: 600;
            cursor: wait;
        }

        /* --- COMMON ELEMENTS --- */
        .icon-btn {
            padding: 6px;
            border: none;
            background: transparent;
            color: var(--text-secondary);
            cursor: pointer;
            border-radius: 4px;
        }

        .icon-btn:hover {
            color: var(--text-primary);
            background: rgba(255,255,255,0.1);
        }

        .icon-btn.active-mode {
            color: var(--accent-primary);
            background: rgba(138, 180, 248, 0.1);
        }

        /* --- RESIZE HANDLE --- */
        .gemini-resize-handle {
            position: absolute;
            top: 0;
            bottom: 0;
            right: -5px;
            width: 10px;
            cursor: ew-resize;
            z-index: var(--z-panel);
            background: transparent;
        }

        .gemini-resize-handle:hover {
            background: rgba(255,255,255,0.05);
        }

        /* --- MODALS --- */
        .modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.6);
            z-index: var(--z-modal);
            display: none;
            align-items: center;
            justify-content: center;
        }

        .modal-content {
            background: var(--bg-tier-2);
            color: var(--text-primary);
            padding: 20px;
            border-radius: 12px;
            width: 350px;
            display: flex;
            flex-direction: column;
            gap: 15px;
            border: 1px solid var(--border-subtle);
        }

        .button-group {
            display: flex;
            gap: 10px;
            justify-content: flex-end;
        }

        .gemini-btn {
            padding: 6px 12px;
            border-radius: 6px;
            border: 1px solid var(--border-subtle);
            background: var(--bg-tier-1);
            color: var(--text-primary);
            cursor: pointer;
        }

        .checkbox-row {
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .toast-notification {
            position: fixed;
            bottom: 30px;
            left: 50%;
            transform: translateX(-50%);
            background: var(--bg-tier-3);
            padding: 8px 16px;
            border-radius: 20px;
            z-index: var(--z-toast);
            opacity: 0;
            transition: opacity 0.3s;
            pointer-events: none;
            border: 1px solid var(--border-active);
        }

        .toast-notification.show {
            opacity: 1;
        }

        /* --- CODE ENHANCEMENT --- */
        .gm-overlay-container {
            position: absolute;
            top: 0;
            right: 0;
            padding: 8px 48px 0 0;
            z-index: 10;
            pointer-events: none;
            opacity: 0.3;
            transition: opacity 0.2s;
        }

        .gm-overlay-container.is-hidden-state,
        pre[data-gm-enhanced]:hover .gm-overlay-container {
            opacity: 1;
        }

        .gm-collapse-btn {
            pointer-events: auto;
            color: #e0e0e0;
            cursor: pointer;
            border-radius: 50%;
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
            border: none;
            background: transparent;
        }

        .gm-code-footer {
            display: flex;
            justify-content: flex-end;
            gap: 8px;
            padding: 8px;
            background: #2b2b2b;
            border-top: 1px solid #444;
            border-radius: 0 0 8px 8px;
            margin-top: -10px;
            margin-bottom: 10px;
        }

        .gm-code-btn {
            background: transparent;
            border: 1px solid #555;
            color: #e0e0e0;
            border-radius: 4px;
            padding: 4px 8px;
            font-size: 11px;
            cursor: pointer;
            margin-right: 5px;
        }

        .gm-hidden-code {
            display: none !important;
        }

        /* --- CUSTOM CSS --- */
        div.input-area.with-toolbox-drawer.children-ready {
            width: 1100px;
        }

        div.text-input-field.with-toolbox-drawer.pre-fullscreen.fullscreen.height-expanded-past-single-line {
            width: 1100px;
        }

        a.gb_B.gb_0a.gb_1,
        span.mat-mdc-button-touch-target {
            display: none;
        }

        button.gm-collapse-btn {
            margin-right: 20px;
        }

        button.gm-code-btn {
            margin-top: 4px;
        }

        .conversation-container,
        user-query,
        .user-query-bubble-with-background {
            max-width: 100% !important;
        }

        upsell-button,
        hallucination-disclaimer,
        announcement-banner,
        intent-card-bar,
        .buttons-container.referral,
        .location-icon,
        .location-footer-name,
        .location-footer-atl-text,
        .update-location-text,
        .location-buttons-dot,
        my-stuff-recents-preview {
            display: none !important;
        }

        .bard-avatar.thinking {
            background-image: url("https://raw.githubusercontent.com/SysAdminDoc/GeminiBuddy/refs/heads/main/assets/favicon/loader.gif") !important;
            background-size: contain !important;
            background-repeat: no-repeat !important;
            background-position: center !important;
            width: 40px !important;
            height: 40px !important;
            min-width: 40px !important;
            display: block !important;
        }

        .bard-avatar.thinking .avatar-container,
        .bard-avatar.thinking .avatar_spinner_animation,
        .bard-avatar.thinking svg {
            display: none !important;
            visibility: hidden !important;
        }
    `;

    // --- DOM HELPERS ---
    function el(tag, className, text) {
        const e = document.createElement(tag);
        if (className) e.className = className;
        if (text) e.textContent = text;
        return e;
    }

    function makeIcon(d, size=18) {
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("viewBox", "0 0 24 24");
        svg.setAttribute("width", size);
        svg.setAttribute("height", size);
        svg.setAttribute("fill", "currentColor");
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("d", d);
        svg.appendChild(path);
        return svg;
    }

    const icons = {
        settings: makeIcon('M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41h-3.84 c-0.24,0-0.44,0.17-0.48,0.41L9.22,5.25C8.63,5.5,8.1,5.82,7.6,6.2L5.21,5.24C4.99,5.16,4.74,5.23,4.62,5.45L2.7,8.77 c-0.11,0.2-0.06,0.47,0.12,0.61l2.03,1.58C4.82,11.36,4.8,11.68,4.8,12s0.02,0.64,0.07,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.38,2.44 c0.04,0.24,0.24,0.41-0.48-0.41h3.84c0.24,0,0.44-0.17-0.48,0.41l0.38-2.44c0.59-0.24,1.12-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0.01,0.59-0.22l1.92-3.32c0.11-0.2,0.06-0.47-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z'),
        close: makeIcon('M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z'),
        plus: makeIcon('M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z'),
        minus: makeIcon('M19 13H5v-2h14v2z'),
        importExport: makeIcon('M9 3L5 7h3v7h2V7h3l-4-4zM16 17v-7h-2v7H9l4 4 4-4h-3z'),
        chat: makeIcon('M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 9h12v2H6V9zm8 5H6v-2h8v2zm4-6H6V6h12v2z', 16),
        sync: makeIcon('M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z'),
        pencil: makeIcon('M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a.9959.9959 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z', 16),
        pin: makeIcon('M16 9V4l1 0c0.55 0 1-0.45 1-1s-0.45-1-1-1H7C6.45 2 6 2.45 6 3s0.45 1 1 1l1 0v5c0 1.66-1.34 3-3 3v2h5.97v7l1 1l1-1v-7H19v-2C17.34 12 16 10.66 16 9z', 16),
        pinFilled: makeIcon('M16 9V4l1 0c0.55 0 1-0.45 1-1s-0.45-1-1-1H7C6.45 2 6 2.45 6 3s0.45 1 1 1l1 0v5c0 1.66-1.34 3-3 3v2h5.97v7l1 1l1-1v-7H19v-2C17.34 12 16 10.66 16 9z', 16),
        chevronRight: makeIcon('M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z'),
        chevronDown: makeIcon('M16.59 8.59L12 13.17 7.41 8.59 6 10l6 6 6-6z'),
        list: makeIcon('M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z', 16)
    };

    const sleep = (ms) => new Promise(r => setTimeout(r, ms));

    // --- DATA HANDLING ---
    async function loadData() {
        GM_addStyle(CSS);
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
                    console.log('GeminiBuddy: Loading chats from cache.');
                    chatCache = parsed.data;
                    isScraping = false;
                }
            } catch (e) { console.error('GeminiBuddy: Cache parse error', e); }
        }

        if (Object.keys(currentPrompts).length === 0) {
            console.log("GeminiBuddy: Importing default prompts automatically...");
            GM_xmlhttpRequest({
                method: "GET", url: DEFAULT_PROMPTS_URL,
                onload: (res) => {
                    try {
                        const p = JSON.parse(res.responseText);
                        if (p && typeof p === 'object') {
                            currentPrompts = p;
                            Object.values(currentPrompts).flat().forEach(i => {
                                if(!i.id) i.id = Date.now() + Math.random().toString(16).slice(2);
                            });
                            savePrompts();
                            renderPrompts();
                            showToast("Default prompts loaded.");
                        }
                    } catch(e) {
                        console.error("GeminiBuddy: Failed to load defaults", e);
                    }
                }
            });
        }
    }

    function savePrompts() { GM_setValue(GM_PROMPTS_KEY, JSON.stringify(currentPrompts)); }
    function saveSettings() { GM_setValue(GM_SETTINGS_KEY, JSON.stringify(settings)); }

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

    function showToast(msg, type='') {
        if (!toast) return;
        toast.textContent = msg;
        toast.className = `toast-notification ${type} show`;
        setTimeout(() => toast && toast.classList.remove('show'), 2000);
    }

    // --- CONVERSATION NAVIGATOR ---
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

        // Clear if conversation changed (use DOM methods)
        if (userMessages.length < existingItems.length) {
            while (list.firstChild) {
                list.removeChild(list.firstChild);
            }
        }

        // Add new messages
        if (userMessages.length > existingItems.length) {
            for (let i = existingItems.length; i < userMessages.length; i++) {
                const msgElem = userMessages[i];
                assignIdToMessage(msgElem);

                const text = msgElem.innerText.trim();
                const preview = text.length > 80 ? text.slice(0, 80) + '...' : text;
                const index = msgElem.dataset.index || '?';

                const item = el('li', 'conv-nav-item');

                // Create elements instead of using innerHTML
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

        // Show empty state if no messages
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

    // --- ALWAYS THINKING MODE ---
    function enforceThinkingModel() {
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

    // --- UI STATE CHECK ---
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

    // --- SCRAPING & SYNC ---
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
            showToast(`GeminiBuddy: Loaded ${chatCache.length} chats.`);
        }
    }

    function updateStatus(text, isBusy = false) {
        if (statusLabel) {
            statusLabel.textContent = text;
            statusLabel.className = `status-bar ${isBusy ? 'syncing' : ''}`;
            statusLabel.onclick = isBusy ? null : autoSyncHistory;
        }
    }

    // --- CONFIG & DELETION ---
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
        if(btn) {
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
        if(btn) btn.textContent = `Delete Selected (${selectedChatIndices.size})`;
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
        if (!row || !row.isConnected) return false;

        const sibling = row.nextElementSibling;
        if (!sibling || !sibling.classList.contains('conversation-actions-container')) {
            console.warn("Delete failed: Action container not found for", chatObj.title);
            return false;
        }

        const menuBtn = sibling.querySelector('button[data-test-id="actions-menu-button"]');
        if (!menuBtn) return false;

        menuBtn.click();
        await sleep(250);

        const deleteBtn = document.querySelector('div[role="menu"] button[data-test-id="delete-button"]') ||
                          Array.from(document.querySelectorAll('div[role="menu"] button')).find(b => b.textContent.includes('Delete'));

        if (!deleteBtn) {
            document.body.click();
            return false;
        }
        deleteBtn.click();
        await sleep(300);

        const confirmBtn = document.querySelector('button[data-test-id="confirm-button"]');
        if (!confirmBtn) return false;

        confirmBtn.click();
        await sleep(800);
        return true;
    }

    async function deleteSelectedChats() {
        const indices = Array.from(selectedChatIndices).sort((a,b) => b - a);
        if (indices.length === 0) return;

        if(!confirm(`Permanently delete ${indices.length} chats? This cannot be undone.`)) return;

        updateStatus(`Deleting ${indices.length} chats...`, true);
        let deletedCount = 0;

        for (const idx of indices) {
            const chat = chatCache[idx];
            if (chat && chat.element) {
                const success = await deleteChatNative(chat);
                if (success) {
                    deletedCount++;
                    const uiRow = document.getElementById(`nav-item-${idx}`);
                    if(uiRow) uiRow.style.opacity = '0.3';
                }
            }
        }

        selectedChatIndices.clear();
        isConfigMode = false;
        document.getElementById('btn-config-mode').classList.remove('active-mode');
        configControls.classList.remove('visible');

        await autoSyncHistory();
        showToast(`Deleted ${deletedCount} chats.`);
    }

    // --- RENDERERS ---
    function renderChatList() {
        if (!chatListContainer) return;
        while(chatListContainer.firstChild) chatListContainer.removeChild(chatListContainer.firstChild);

        const indexedCache = chatCache.map((c, i) => ({...c, origIndex: i}));

        let displayList = indexedCache;
        if (searchQuery) {
            displayList = displayList.filter(c => c.title.toLowerCase().includes(searchQuery.toLowerCase()));
        }

        displayList.sort((a, b) => (b.isPinned - a.isPinned));

        if (displayList.length === 0) {
             chatListContainer.appendChild(el('div', 'navigator-item', 'No chats found.'));
             return;
        }

        let pinnedHeaderAdded = false;
        let recentHeaderAdded = false;

        displayList.forEach(chat => {
            if (chat.isPinned && !pinnedHeaderAdded) {
                chatListContainer.appendChild(el('div', 'chat-section-divider', 'Pinned Chats'));
                pinnedHeaderAdded = true;
            }
            if (!chat.isPinned && !recentHeaderAdded && pinnedHeaderAdded) {
                chatListContainer.appendChild(el('div', 'chat-section-divider', 'Recent Chats'));
                recentHeaderAdded = true;
            }

            const row = el('div', `navigator-item ${chat.isPinned ? 'pinned' : ''}`);
            row.id = `nav-item-${chat.origIndex}`;
            row.title = chat.title;

            if (isConfigMode) {
                const cb = el('input', 'item-checkbox');
                cb.type = 'checkbox';
                cb.checked = selectedChatIndices.has(chat.origIndex);
                cb.onclick = (e) => { e.stopPropagation(); toggleChatSelection(chat.origIndex); };
                row.appendChild(cb);

                const span = el('span', '', chat.title);
                span.style.paddingLeft = '8px';
                row.appendChild(span);

                row.onclick = () => cb.click();

            } else {
                const pinBtn = el('div', `pin-btn ${chat.isPinned ? 'active' : ''}`);
                pinBtn.appendChild(chat.isPinned ? icons.pinFilled.cloneNode(true) : icons.pin.cloneNode(true));
                pinBtn.onclick = (e) => {
                    e.stopPropagation();
                    const realChat = chatCache[chat.origIndex];
                    realChat.isPinned = !realChat.isPinned;

                    if(realChat.isPinned) {
                        if(!settings.pinnedTitles.includes(realChat.title)) settings.pinnedTitles.push(realChat.title);
                    } else {
                        settings.pinnedTitles = settings.pinnedTitles.filter(t => t !== realChat.title);
                    }
                    saveSettings();
                    saveChatCache();
                    renderChatList();
                };

                row.appendChild(pinBtn);

                const span = el('span', '', chat.title);
                row.appendChild(span);

                if(chat.element && chat.element.classList.contains('selected')) row.classList.add('active');

                row.onclick = () => {
                    Array.from(chatListContainer.children).forEach(c => c.classList.remove('active'));
                    row.classList.add('active');

                    if (chat.element && chat.element.isConnected) {
                        chat.element.click();
                    } else if (chat.url) {
                        window.location.href = chat.url;
                    } else {
                        updateStatus('Locating chat...', true);
                        autoSyncHistory();
                    }
                };
            }

            chatListContainer.appendChild(row);
        });
    }

    function renderPanel() {
        if (panel) return;

        panel = el('div', 'gemini-prompt-panel');

        // Header
        const header = el('div', 'gemini-prompt-panel-header');

        const leftGroup = el('div', 'header-left-group');
        const titleArea = el('div', 'header-brand-text', 'GeminiBuddy');

        loadingIndicator = el('img', 'header-loading-icon');
        loadingIndicator.id = 'gemini-loading-gif';
        loadingIndicator.src = "https://raw.githubusercontent.com/SysAdminDoc/GeminiBuddy/refs/heads/main/assets/favicon/loader.gif";

        leftGroup.append(titleArea, loadingIndicator);

        const actions = el('div', 'header-actions');
        const configBtn = createButton(null, icons.pencil, toggleConfigMode, 'icon-btn', 'btn-config-mode');
        configBtn.title = "Manage Chats";

        const navBtn = createButton(null, icons.list, () => {
            settings.showNavigator = !settings.showNavigator;
            navigatorContainer.classList.toggle('hidden', !settings.showNavigator);
            saveSettings();
        }, 'icon-btn', 'btn-toggle-navigator');
        navBtn.title = "Toggle Conversation Navigator";

        actions.append(
            navBtn,
            configBtn,
            createButton(null, icons.settings, () => showSettingsModal(), 'icon-btn'),
            createButton(null, icons.importExport, () => importExportModal.style.display = 'flex', 'icon-btn')
        );
        header.append(leftGroup, actions);

        const content = el('div', 'gemini-prompt-panel-content');

        // Commands
        const topControls = el('div', 'top-controls');
        const newChatBtn = el('button', 'google-gradient-btn', 'New Chat');
        newChatBtn.prepend(icons.plus.cloneNode(true));
        newChatBtn.onclick = () => {
            const nativeBtn = document.querySelector('button[aria-label="New chat"]');
            if(nativeBtn) nativeBtn.click();
        };

        searchInput = el('input', 'search-input');
        searchInput.placeholder = "Search Chat History...";
        searchInput.oninput = (e) => { searchQuery = e.target.value; renderChatList(); };

        topControls.append(newChatBtn, searchInput);

        // Config controls
        configControls = el('div', 'config-controls');
        const selAllBtn = el('button', 'bulk-btn btn-select-all', 'Select All');
        selAllBtn.onclick = selectAllChats;

        const delSelBtn = el('button', 'bulk-btn btn-delete-sel', 'Delete Selected (0)');
        delSelBtn.id = 'btn-delete-sel';
        delSelBtn.onclick = deleteSelectedChats;

        configControls.append(selAllBtn, delSelBtn);

        // Prompts
        promptZone = el('div', 'prompts-zone');

        // Chat List
        chatListContainer = el('div', 'chat-list-container');

        // Status
        statusLabel = el('div', 'status-bar', 'Ready');

        content.append(topControls, configControls, promptZone, chatListContainer, statusLabel);

        // Resize
        const resizeHandle = el('div', 'gemini-resize-handle');
        let startX;
        resizeHandle.onmousedown = (e) => {
            startX = e.clientX; const startW = settings.panelWidth;
            document.onmousemove = (ev) => {
                settings.panelWidth = Math.max(250, Math.min(500, startW + (ev.clientX - startX)));
                panel.style.setProperty('--panel-width', settings.panelWidth + 'px');
                const mainContent = document.querySelector('bard-sidenav-content');
                if(mainContent) {
                    mainContent.style.marginLeft = settings.panelWidth + 'px';
                    mainContent.style.width = `calc(100% - ${settings.panelWidth}px)`;
                }
            };
            document.onmouseup = () => { document.onmousemove = null; saveSettings(); };
        };

        panel.append(header, content, resizeHandle);
        document.body.appendChild(panel);

        panel.style.setProperty('--panel-width', settings.panelWidth + 'px');
        renderPrompts();

        if (chatCache.length > 0) {
            renderChatList();
            updateStatus(`Cached: ${chatCache.length} chats`);
        } else {
            setTimeout(autoSyncHistory, 1500);
        }
    }

    // --- PROMPTS ---
    function togglePromptPin(promptId) {
        if (!promptId) return;
        const idx = settings.pinnedPromptIds.indexOf(promptId);
        if (idx !== -1) {
            settings.pinnedPromptIds.splice(idx, 1);
        } else {
            settings.pinnedPromptIds.push(promptId);
        }
        saveSettings();
        renderPrompts();
    }

    function createPromptItem(p) {
        if (!p.id) p.id = p.name + p.text.substring(0,5);

        const item = el('div', 'prompt-item');
        const pinBtn = el('div', `prompt-pin-btn ${settings.pinnedPromptIds.includes(p.id) ? 'active' : ''}`);
        pinBtn.appendChild(settings.pinnedPromptIds.includes(p.id) ? icons.pinFilled.cloneNode(true) : icons.pin.cloneNode(true));
        pinBtn.onclick = (e) => { e.stopPropagation(); togglePromptPin(p.id); };

        const label = el('span', '', p.name);

        item.append(label, pinBtn);
        item.onclick = () => insertSafeText(p.text);
        return item;
    }

    function renderPrompts() {
        if(!promptZone) return;
        while(promptZone.firstChild) promptZone.removeChild(promptZone.firstChild);

        const allPromptsFlat = Object.values(currentPrompts).flat();
        const pinnedPrompts = allPromptsFlat.filter(p => p.id && settings.pinnedPromptIds.includes(p.id));

        if (pinnedPrompts.length > 0) {
            const pinnedContainer = el('div', 'pinned-prompts-container');
            const pinnedHeader = el('div', 'pinned-prompts-header', 'Pinned Prompts');
            pinnedContainer.appendChild(pinnedHeader);
            pinnedPrompts.forEach(p => {
                pinnedContainer.appendChild(createPromptItem(p));
            });
            promptZone.appendChild(pinnedContainer);
        }

        const drawerHeader = el('div', 'prompt-drawer-header');
        const headerTitle = el('span', '', 'Prompt Library');
        const toggleIcon = settings.promptsExpanded ? icons.chevronDown.cloneNode(true) : icons.chevronRight.cloneNode(true);

        drawerHeader.append(headerTitle, toggleIcon);
        drawerHeader.onclick = () => {
            settings.promptsExpanded = !settings.promptsExpanded;
            saveSettings();
            renderPrompts();
        };
        promptZone.appendChild(drawerHeader);

        const drawerContent = el('div', `prompt-drawer-content ${settings.promptsExpanded ? 'expanded' : ''}`);

        Object.keys(currentPrompts).sort().forEach(cat => {
            const catHeader = el('div', 'prompt-category-header', cat);
            const catItems = el('div', 'gm-hidden');
            catHeader.onclick = () => catItems.classList.toggle('gm-hidden');

            currentPrompts[cat].forEach(p => {
                catItems.appendChild(createPromptItem(p));
            });
            drawerContent.append(catHeader, catItems);
        });

        const addBtn = el('div', 'prompt-category-header', '+ Add New Prompt');
        addBtn.style.color = 'var(--accent-primary)';
        addBtn.onclick = () => showPromptForm();
        drawerContent.appendChild(addBtn);

        promptZone.appendChild(drawerContent);
    }

    function insertSafeText(text) {
        const editor = document.querySelector('div.ql-editor') || document.querySelector('[contenteditable="true"]');
        if (!editor) return;
        editor.focus();
        document.execCommand('insertText', false, text);
    }

    function createButton(text, icon, onClick, cls = '', id = '') {
        const btn = document.createElement('button');
        btn.className = cls || 'gemini-btn';
        if(id) btn.id = id;
        if (icon) btn.appendChild(icon.cloneNode(true));
        if (text) btn.appendChild(el('span', '', text));
        if (onClick) btn.onclick = onClick;
        return btn;
    }

    function buildModals() {
        promptFormModal = el('div', 'modal-overlay');
        const pf = el('div', 'modal-content');
        pf.appendChild(el('h3', '', 'Add Prompt'));
        const pName = el('input'); pName.id = 'p-name'; pName.placeholder = 'Name';
        const pText = el('textarea'); pText.id = 'p-text'; pText.placeholder = 'Text'; pText.rows = 4;
        const pCat = el('input'); pCat.id = 'p-cat'; pCat.placeholder = 'Category';
        const pfBtns = el('div', 'button-group');
        pfBtns.append(
            createButton('Save', null, () => {
                const n = pName.value.trim(), t = pText.value.trim(), c = pCat.value.trim() || 'General';
                if(n && t) {
                    if(!currentPrompts[c]) currentPrompts[c] = [];
                    currentPrompts[c].push({ id: Date.now(), name: n, text: t });
                    savePrompts(); renderPrompts(); promptFormModal.style.display = 'none';
                    pName.value = ''; pText.value = ''; pCat.value = '';
                }
            }),
            createButton('Cancel', null, () => promptFormModal.style.display = 'none')
        );
        pf.append(pName, pText, pCat, pfBtns);
        promptFormModal.appendChild(pf);

        importExportModal = el('div', 'modal-overlay');
        const io = el('div', 'modal-content');
        io.appendChild(el('h3', '', 'Import/Export JSON'));
        const ioText = el('textarea'); ioText.id = 'io-text'; ioText.rows = 10;
        const ioBtns = el('div', 'button-group');
        ioBtns.append(
            createButton('Import', null, () => {
                try {
                    currentPrompts = JSON.parse(ioText.value);
                    savePrompts();
                    renderPrompts();
                    importExportModal.style.display = 'none';
                    showToast('Prompts imported successfully');
                } catch(e){
                    showToast('Invalid JSON format');
                }
            }),
            createButton('Export', null, () => ioText.value = JSON.stringify(currentPrompts, null, 2)),
            createButton('Close', null, () => importExportModal.style.display = 'none')
        );
        io.append(ioText, ioBtns);
        importExportModal.appendChild(io);

        settingsModal = el('div', 'modal-overlay');
        const sm = el('div', 'modal-content');
        sm.appendChild(el('h3', '', 'Settings'));
        const checks = [
            ['s-wide', 'Wide Mode'],
            ['s-code', 'Enhance Code Blocks'],
            ['s-thinking', 'Always Thinking Mode'],
            ['s-navigator', 'Show Conversation Navigator']
        ];
        checks.forEach(([id, lbl]) => {
            const r = el('div', 'checkbox-row');
            const chk = el('input'); chk.type='checkbox'; chk.id=id;
            const sp = el('span', '', lbl);
            r.append(chk, sp);
            sm.appendChild(r);
        });
        const smBtns = el('div', 'button-group');
        smBtns.append(
            createButton('Save', null, () => {
                settings.wideMode = document.getElementById('s-wide').checked;
                settings.enhanceCode = document.getElementById('s-code').checked;
                settings.alwaysThinking = document.getElementById('s-thinking').checked;
                const prevNavigator = settings.showNavigator;
                settings.showNavigator = document.getElementById('s-navigator').checked;

                if (prevNavigator !== settings.showNavigator && navigatorContainer) {
                    navigatorContainer.classList.toggle('hidden', !settings.showNavigator);
                }

                saveSettings();
                settingsModal.style.display = 'none';
                showToast('Settings saved');
            }),
            createButton('Close', null, () => settingsModal.style.display = 'none')
        );
        sm.appendChild(smBtns);
        settingsModal.appendChild(sm);
        document.body.append(promptFormModal, importExportModal, settingsModal);
    }

    function showPromptForm() {
        promptFormModal.style.display = 'flex';
        document.getElementById('p-name').focus();
    }

    function showSettingsModal() {
        document.getElementById('s-wide').checked = settings.wideMode;
        document.getElementById('s-code').checked = settings.enhanceCode;
        document.getElementById('s-thinking').checked = settings.alwaysThinking;
        document.getElementById('s-navigator').checked = settings.showNavigator;
        settingsModal.style.display = 'flex';
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
                if(window.getComputedStyle(wrapper).position === 'static') wrapper.style.position = 'relative';
                const overlay = el('div', 'gm-overlay-container');
                const btn = el('button', 'gm-collapse-btn');
                const code = pre.querySelector('code');
                const updateIcon = () => {
                    while(btn.firstChild) btn.removeChild(btn.firstChild);
                    btn.appendChild(code?.classList.contains('gm-hidden-code') ? icons.plus.cloneNode(true) : icons.minus.cloneNode(true));
                };
                updateIcon();
                btn.onclick = () => { code?.classList.toggle('gm-hidden-code'); updateIcon(); };
                overlay.appendChild(btn);
                wrapper.appendChild(overlay);
                const footer = el('div', 'gm-code-footer');
                const copyBtn = createButton('Copy', null, async () => {
                    await navigator.clipboard.writeText(code.innerText);
                    copyBtn.textContent = 'Copied!';
                    setTimeout(() => copyBtn.textContent = 'Copy', 2000);
                }, 'gm-code-btn');
                footer.appendChild(copyBtn);
                pre.parentNode.insertBefore(footer, pre.nextSibling);
            }
        });
    }

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
            // Use DOM methods instead of innerHTML to avoid TrustedHTML policy issues
            while (list.firstChild) {
                list.removeChild(list.firstChild);
            }
        }

        debouncedUpdateNavigator();
    }

    function init() {
        const check = setInterval(async () => {
            if (document.querySelector('bard-sidenav-content')) {
                clearInterval(check);
                await loadData();
                toast = el('div', 'toast-notification');
                document.body.appendChild(toast);
                buildModals();
                renderPanel();
                createNavigator();

                const mainContent = document.querySelector('bard-sidenav-content');
                if(mainContent) {
                    mainContent.style.marginLeft = settings.panelWidth + 'px';
                    mainContent.style.width = `calc(100% - ${settings.panelWidth}px)`;
                }

                new MutationObserver((mutations) => {
                    mutations.forEach(m => m.addedNodes.forEach(node => {
                        if(node.nodeType === 1) enhanceCodeBlocks(node);
                    }));
                }).observe(document.body, { childList: true, subtree: true });

                enhanceCodeBlocks(document.body);
                observeConversation();
                waitForChatToLoad();

                // Watch for URL changes (conversation switches)
                let lastUrl = location.href;
                new MutationObserver(() => {
                    if (location.href !== lastUrl) {
                        lastUrl = location.href;
                        waitForChatToLoad();
                    }
                }).observe(document.body, { childList: true, subtree: true });
            }
        }, 500);

        // Background intervals
        setInterval(enforceThinkingModel, THINKING_CHECK_INTERVAL);
        setInterval(checkUIState, UI_STATE_CHECK_INTERVAL);
    }

    if (document.readyState === 'complete') init();
    else window.addEventListener('load', init);

})();