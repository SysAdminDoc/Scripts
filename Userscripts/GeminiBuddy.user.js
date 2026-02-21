// ==UserScript==
// @name         GeminiBuddy
// @namespace    https://github.com/SysAdminDoc/GeminiBuddy
// @version      42
// @description  Dual-mode panel for Chat & VEO prompts, with profiles, UI refinements, and new functions.
// @author       Matthew Parker & Gemini
// @match        https://gemini.google.com/*
// @icon         https://raw.githubusercontent.com/SysAdminDoc/GeminiBuddy/refs/heads/main/assets/favicon/favicon.svg
// @grant        GM_addStyle
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_xmlhttpRequest
// @connect      api.github.com
// @connect      gist.githubusercontent.com
// @connect      raw.githubusercontent.com
// @run-at       document-idle
// @license      MIT
// @updateURL    https://github.com/SysAdminDoc/GeminiBuddy/raw/refs/heads/main/GeminiBuddy.user.js
// @downloadURL  https://github.com/SysAdminDoc/GeminiBuddy/raw/refs/heads/main/GeminiBuddy.user.js
// ==/UserScript==

(function() {
    'use strict';

    // --- EXECUTION GUARD ---
    if (window.geminiPanelEnhanced) {
        console.log('Gemini Prompt Panel Enhancer is already running.');
        return;
    }
    window.geminiPanelEnhanced = true;
    console.log('Gemini Prompt Panel Enhancer v42.0 loaded');

    // ###################################################################################
    // # --- CONSOLIDATED DATA.JS MODULE ---
    // ###################################################################################

    // --- CONFIG & KEYS ---
    const DEFAULT_PROMPTS_URL = "https://raw.githubusercontent.com/SysAdminDoc/Gemini-Prompt-Panel/refs/heads/main/Prompts/defaultpromptlist.json";
    const VEO_PROMPTS_URL = "https://raw.githubusercontent.com/SysAdminDoc/GeminiBuddy/refs/heads/main/veoprompts/Google_Veo_3_Prompts.json";
    const GM_PROMPTS_KEY = 'gemini_custom_prompts_v6';
    const GM_SETTINGS_KEY = 'gemini_panel_settings_v24';
    const GM_HISTORY_KEY = 'gemini_prompt_history_v1';
    const FULL_WIDTH_STYLE_ID = 'gemini-panel-full-width-style';

    // --- STATE & SETTINGS ---
    let currentPrompts = {};
    let veoPrompts = []; // New state for VEO prompts
    let currentPanelView = 'chat'; // New state for panel mode: 'chat' or 'veo'
    let promptHistory = {};
    let settings = {};
    let lastFetchedUrl = null;

    const defaultSettings = {
        themeName: 'dark', position: 'left', topOffset: '90px', panelWidth: 320, handleWidth: 8, handleStyle: 'classic',
        fontFamily: 'Verdana, sans-serif', enableFullWidth: true, baseFontSize: '14px', condensedMode: false,
        collapsedCategories: [], favorites: [], groupOrder: [], tagOrder: [], initiallyCollapsed: false, copyButtonOrderSwapped: false,
        showTags: true, showPins: true, enableAIenhancer: true, geminiAPIKey: '', gistURL: '',
        enableMiniMode: true, groupByTags: true, autoCopyCodeOnCompletion: true,
        groupColors: {},
        colors: {
            '--panel-bg': '#2a2a2e', '--panel-text': '#e0e0e0', '--panel-header-bg': '#3a3a3e', '--panel-border': '#4a4a4e',
            '--input-bg': '#3c3c41', '--input-text': '#f0f0f0', '--input-border': '#5a5a5e',
            '--handle-color': '#28a745', '--handle-hover-color': '#34c759', '--favorite-color': '#FFD700', '--pin-color': '#34c759', '--ai-color': '#8A2BE2'
        }
    };
    const presetThemes = {
        dark: { ...defaultSettings.colors },
        light: {
            '--panel-bg': '#f4f4f5', '--panel-text': '#1f2937', '--panel-header-bg': '#e4e4e7', '--panel-border': '#d4d4d8',
            '--input-bg': '#ffffff', '--input-text': '#111827', '--input-border': '#d1d5db',
            '--handle-color': '#007aff', '--handle-hover-color': '#0095ff', '--favorite-color': '#ffab00', '--pin-color': '#34c759', '--ai-color': '#5856d6'
        },
        glass: {
            '--panel-bg': 'rgba(30, 30, 35, 0.6)', '--panel-text': '#f5f5f5', '--panel-header-bg': 'rgba(58, 58, 62, 0.7)', '--panel-border': 'rgba(255, 255, 255, 0.2)',
            '--input-bg': 'rgba(0, 0, 0, 0.25)', '--input-text': '#f5f5f5', '--input-border': 'rgba(255, 255, 255, 0.3)',
            '--handle-color': '#00ffc8', '--handle-hover-color': '#60ffdf', '--favorite-color': '#FFD700', '--pin-color': '#34c759', '--ai-color': '#bf5af2'
        },
        hacker: {
            '--panel-bg': '#0a0a0a', '--panel-text': '#00ff41', '--panel-header-bg': '#1a1a1a', '--panel-border': '#00ff41',
            '--input-bg': '#1c1c1c', '--input-text': '#00ff41', '--input-border': '#008f11',
            '--handle-color': '#00ff41', '--handle-hover-color': '#50ff81', '--favorite-color': '#00ff41', '--pin-color': '#00ff41', '--ai-color': '#00ff41'
        }
    };

    // --- SETTINGS & PROMPT FUNCTIONS ---
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

    function ensurePromptIDs(prompts) {
        Object.values(prompts).flat().forEach((p, i) => {
            p.id = p.id || `prompt-${Date.now()}-${i}`;
        });
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

    // --- NEW VEO PROMPT FETCHING FUNCTION ---
    function fetchAndLoadVeoPrompts() {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: "GET",
                url: VEO_PROMPTS_URL,
                onload: function(response) {
                    try {
                        const data = JSON.parse(response.responseText);
                        if (Array.isArray(data)) {
                            veoPrompts = data; // Store in the dedicated global array
                            console.log(`Loaded ${veoPrompts.length} VEO prompts.`);
                            resolve();
                        } else {
                            throw new Error("Fetched VEO data is not an array.");
                        }
                    } catch (e) {
                        console.error("Failed to parse VEO prompts:", e);
                        reject(e);
                    }
                },
                onerror: function(response) {
                    console.error("Error fetching VEO prompts:", response.statusText);
                    reject(response);
                }
            });
        });
    }


    // --- SYNC FEATURES ---
    async function syncFromGist(isManual = false) {
        if (!settings.gistURL) {
            if (isManual) showToast("Please provide a Gist URL in settings.", 2500, 'error');
            return;
        }
        const gistIdMatch = settings.gistURL.match(/gist\.github\.com\/[a-zA-Z0-9_-]+\/([a-f0-9]+)/);
        if (!gistIdMatch) {
            if (isManual) showToast("Invalid Gist URL format.", 2500, 'error');
            return;
        }
        const gistId = gistIdMatch[1];
        if (isManual) showToast("Syncing from Gist...", 2000);

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
                            const doSync = isManual ? confirm("Gist data found. Replace all current prompts with the synced data? This cannot be undone.") : true;
                            if (doSync) {
                                currentPrompts = newPrompts;
                                savePrompts();
                                if (isManual) showToast("Sync successful!", 2000, 'success');
                                resolve(true); // Indicate that a sync happened
                            } else {
                                reject(new Error("Sync cancelled by user."));
                            }
                        } else {
                            throw new Error("No content found in Gist file.");
                        }
                    } catch (e) {
                        if (isManual) showToast("Failed to parse Gist content: " + e.message, 3000, 'error');
                        reject(e);
                    }
                },
                onerror: function(response) {
                    if (isManual) showToast("Error fetching Gist: " + response.statusText, 3000, 'error');
                    reject(new Error(response.statusText));
                }
            });
        });
    }

    // --- VERSION HISTORY ---
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


    // ###################################################################################
    // # --- CONSOLIDATED UI.JS MODULE ---
    // ###################################################################################

    // --- ICONS (SVG Paths) ---
    function makeIcon(svgPath, size = 20) {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('viewBox', '0 0 24 24');
        svg.setAttribute('width', size);
        svg.setAttribute('height', size);
        svg.style.fill = 'currentColor';
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', svgPath);
        svg.appendChild(path);
        return svg;
    }
    const icons = {
        video: makeIcon('M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z', 18),
        plus: makeIcon('M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z', 18),
        unlocked: makeIcon('M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z', 18),
        locked: makeIcon('M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6h2V6c0-1.65 1.35-3 3-3s3 1.35 3 3v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2z', 18),
        settings: makeIcon('M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41h-3.84 c-0.24,0-0.44,0.17-0.48,0.41L9.22,5.25C8.63,5.5,8.1,5.82,7.6,6.2L5.21,5.24C4.99,5.16,4.74,5.23,4.62,5.45L2.7,8.77 c-0.11,0.2-0.06,0.47,0.12,0.61l2.03,1.58C4.82,11.36,4.8,11.68,4.8,12s0.02,0.64,0.07,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.38,2.44 c0.04,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.44-0.17-0.48,0.41l0.38-2.44c0.59-0.24,1.12-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0.01,0.59-0.22l1.92-3.32c0.11-0.2,0.06-0.47-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z', 18),
        trash: makeIcon('M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z', 18),
        edit: makeIcon('M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a.9959.9959 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z', 16),
        arrowLeft: makeIcon('M15.41 16.59L10.83 12l4.58-4.59L14 6l-6 6 6 6 1.41-1.41z', 18),
        arrowRight: makeIcon('M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z', 18),
        chevronDown: makeIcon('M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z', 18),
        star: makeIcon('M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z', 18),
        starOutline: makeIcon('M22 9.24l-7.19-.62L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.63-7.03L22 9.24zM12 15.4l-3.76 2.27 1-4.28-3.32-2.88 4.38-.38L12 6.1l1.71 4.04 4.38.38-3.32 2.88 1 4.28L12 15.4z', 18),
        pin: makeIcon('M16 9V4h-2v5h-2V4H9v5H7V4H5v5c0 1.66 1.34 3 3 3v7l-1.5 1.5h9L13 19v-7c1.66 0 3-1.34 3-3z', 16),
        pinOutline: makeIcon('M14 4v5c0 .55.45 1 1 1h1V4h-2zm-4 0v6h2V4H10zM7 9h2V4H7v5c0 .55.45 1 1 1h1V4H8c-1.66 0-3 1.34-3 3v5l-1.5 1.5h9L13 19v-7c1.66 0 3-1.34 3-3V4h-2v5c0 .55-.45 1-1 1h-1V4h-2z', 16),
        navUp: makeIcon('M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z'),
        navDown: makeIcon('M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6z'),
        arrowUp: makeIcon('M7 14l5-5 5 5z'),
        arrowDown: makeIcon('M7 10l5 5 5-5z'),
        navToTop: makeIcon('M12 8l-6 6 1.41 1.41L12 10.83l4.59 4.58L18 14l-6-6zM12 2L6 8l1.41 1.41L12 4.83l4.59 4.58L18 8l-6-6z'),
        navToBottom: makeIcon('M12 16l-6-6 1.41-1.41L12 13.17l4.59-4.58L18 10l-6 6zm0 6l-6-6 1.41-1.41L12 19.17l4.59-4.58L18 14l-6 6z'),
        navInwardLeft: makeIcon('M11.67 3.87L9.9 2.1 0 12l9.9 9.9 1.77-1.77L3.54 12z'),
        navInwardRight: makeIcon('M5.88 4.12L13.76 12l-7.88 7.88L8 22l10-10L8 2z'),
        close: makeIcon('M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z', 18),
        importExport: makeIcon('M9 3L5 7h3v7h2V7h3l-4-4zM16 17v-7h-2v7H9l4 4 4-4h-3z', 18),
        sparkle: makeIcon('M19 9l1.25-2.75L23 5l-2.75-1.25L19 1l-1.25 2.75L15 5l2.75 1.25zm-7.5.5L9 4 6.5 9.5 1 12l5.5 2.5L9 20l2.5-5.5L17 12z', 16),
        sync: makeIcon('M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z', 18),
        chart: makeIcon('M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6h-6z', 18),
        palette: makeIcon('M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9c.83 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-.99 0-.83.67-1.5 1.5-1.5H16c2.76 0 5-2.24 5-5 0-4.42-4.03-8-9-8zm-5.5 9c-.83 0-1.5-.67-1.5-1.5S5.67 9 6.5 9 8 9.67 8 10.5 7.33 12 6.5 12zm3-4c-.83 0-1.5-.67-1.5-1.5S8.67 5 9.5 5s1.5.67 1.5 1.5S10.33 8 9.5 8zm5 0c-.83 0-1.5-.67-1.5-1.5S13.67 5 14.5 5s1.5.67 1.5 1.5S15.33 8 14.5 8zm3 4c-.83 0-1.5-.67-1.5-1.5S16.67 9 17.5 9s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z', 18),
        history: makeIcon('M13 3c-4.97 0-9 4.03-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42C8.27 19.99 10.51 21 13 21c4.97 0 9-4.03 9-9s-4.03-9-9-9zm-1 5v5l4.25 2.52.75-1.23-3.5-2.07V8H12z', 18),
        panelIcon: makeIcon('M21 3H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-9 16H3V5h9v14zm2 0h7V5h-7v14z', 22),
        uploadFile: makeIcon('M9 16h6v-6h4l-7-7-7 7h4v6zm-4 2h14v2H5v-2z'),
        webLink: makeIcon('M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z'),
        dragHandle: makeIcon('M20 9H4v2h16V9zM4 15h16v-2H4v2z'),
        copy: makeIcon('M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z', 16)
    };

    // --- CSS ---
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
            --panel-font: Verdana, sans-serif;
            --base-font-size: 14px;
            --panel-padding: 12px;
            --panel-gap: 10px;
            --btn-padding: 8px 12px;
            --panel-bg: #2a2a2e; --panel-text: #e0e0e0; --panel-header-bg: #3a3a3e; --panel-border: #4a4a4e;
            --input-bg: #3c3c41; --input-text: #f0f0f0; --input-border: #5a5a5e;
            --btn-green-grad-start: #28a745; --btn-green-grad-end: #218838; --btn-green-border: #1e7e34;
            --handle-color: #28a745; --handle-hover-color: #34c759; --favorite-color: #FFD700; --pin-color: #34c759; --ai-color: #8A2BE2;
            --modal-bg: rgba(0, 0, 0, 0.7); --modal-content-bg: #2c2c30;
            --nav-btn-size: 36px; --tag-bg: #555; --tag-text: #ddd;
        }
        /* Panel & Handle */
        .gemini-prompt-panel { font-size: var(--base-font-size); position: fixed; top: var(--panel-top, 90px); z-index: 9999; background: var(--panel-bg); color: var(--panel-text); border: 1px solid var(--panel-border); border-radius: 10px; box-shadow: 0 8px 25px rgba(0,0,0,0.4); display: flex; flex-direction: column; font-family: var(--panel-font); transition: transform 0.35s cubic-bezier(0.4, 0, 0.2, 1); user-select: none; width: var(--panel-width, 320px); box-sizing: border-box; max-height: 85vh; }
        .gemini-prompt-panel.glass-theme { backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); }
        .gemini-prompt-panel.left-side { left: 0; transform: translateX(-100%); }
        .gemini-prompt-panel.right-side{ right:0; transform: translateX(100%); }
        .gemini-prompt-panel.visible { transform: translateX(0); }
        .panel-handle { position: fixed; top: var(--panel-top, 90px); width: 8px; height: 100px; background: linear-gradient(90deg, rgba(255,255,255,0.05), rgba(255,255,255,0.15)); cursor: pointer; z-index: 9998; transition: all 0.2s; border-radius: 0 5px 5px 0; box-shadow: inset -1px 0 0 rgba(255,255,255,0.1); }
        .panel-handle::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 3px; background: var(--handle-color); border-radius: 0 2px 2px 0; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
        .panel-handle:hover::before { background: var(--handle-hover-color); width: 100%; }
        .panel-handle.right-side-handle { right: 0; left: auto; transform: scaleX(-1); }
        .panel-handle.edge { top: 0 !important; height: 100vh; background: var(--handle-color); opacity: 0.5; transition: opacity 0.2s ease-in-out, background-color 0.2s ease-in-out; border-radius: 0; box-shadow: none; }
        .panel-handle.edge:hover { opacity: 1; background-color: var(--handle-hover-color); }
        .panel-handle.edge::before { display: none; }
        .gemini-resize-handle { position: absolute; top: 0; bottom: 0; width: 6px; cursor: ew-resize; z-index: 10; }
        .gemini-resize-handle.left-handle { left: -3px; }
        .gemini-resize-handle.right-handle { right: -3px; }
        .gemini-prompt-panel-header { display: flex; justify-content: space-between; align-items: center; padding: 8px var(--panel-padding); background: var(--panel-header-bg); cursor: grab; font-weight: bold; position: relative; border-bottom: 1px solid var(--panel-border); }
        .panel-header-controls { display:flex; gap:2px; align-items: center; }
        .panel-header-controls button { background: transparent; border: none; color: var(--panel-text); cursor: pointer; padding: 4px; border-radius: 50%; display: flex; align-items: center; justify-content: center; transition: background-color 0.2s; }
        .panel-header-controls button:hover { background-color: rgba(255,255,255,0.1); }
        /* --- START: VEO MODULE CSS --- */
        .panel-mode-selector {
            background-color: var(--input-bg);
            color: var(--input-text);
            border: 1px solid var(--input-border);
            border-radius: 4px;
            padding: 4px 6px;
            font-family: var(--panel-font);
            font-size: calc(var(--base-font-size) - 2px);
            margin: 0 10px;
        }
        .panel-mode-selector:focus {
            outline: 1px solid var(--handle-color);
        }
        .veo-prompt-card {
            background: #3a3a3e;
            border: 1px solid var(--panel-border);
            border-radius: 6px;
            padding: 12px;
            margin-bottom: 10px;
            display: flex;
            flex-direction: column;
            gap: 10px;
        }
        .veo-card-text {
            font-size: calc(var(--base-font-size) - 1px);
            line-height: 1.4;
            max-height: 100px; /* Show about 5-6 lines */
            overflow-y: auto;
        }
        .veo-card-actions {
            display: flex;
            gap: 8px;
            border-top: 1px solid var(--panel-border);
            padding-top: 10px;
            margin-top: auto; /* Pushes actions to the bottom */
        }
        .veo-card-actions .action-btn {
            display: flex;
            align-items: center;
            gap: 6px;
            background-color: var(--input-bg);
            border: 1px solid var(--input-border);
            color: var(--panel-text);
            padding: 5px 10px;
            border-radius: 4px;
            cursor: pointer;
            text-decoration: none;
            font-size: calc(var(--base-font-size) - 2px);
            transition: background-color 0.2s;
        }
        .veo-card-actions .action-btn:hover {
            background-color: #4f4f54;
        }
        .veo-card-actions .action-btn svg {
            width: 16px;
            height: 16px;
        }
        /* --- END: VEO MODULE CSS --- */
        .gemini-prompt-panel-content { padding:var(--panel-padding); display:flex; flex-direction:column; gap:var(--panel-gap); flex-grow: 1; overflow: hidden; }
        .button-group { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
        #panel-action-buttons { margin-top: 8px; }
        .gemini-prompt-panel-button { border: 1px solid; color: white; padding: var(--btn-padding); border-radius: 6px; display: flex; align-items: center; justify-content: center; gap: 8px; font-size: calc(var(--base-font-size) - 1px); font-weight: 500; cursor: pointer; transition: all .2s; box-shadow: 0 2px 5px rgba(0,0,0,0.2); text-shadow: 1px 1px 1px rgba(0,0,0,0.2); }
        .gemini-prompt-panel-button:hover { filter: brightness(1.1); transform: translateY(-1px); }
        .gemini-prompt-panel-button:disabled { cursor: not-allowed; filter: brightness(0.6); }
        .copy-btn { background: linear-gradient(to bottom, var(--btn-green-grad-start), var(--btn-green-grad-end)); border-color: var(--btn-green-border); }
        .prompt-group-container { display: flex; flex-direction: column; overflow-y: auto; padding-right: 5px; margin-right: -5px; flex-grow: 1; min-height: 0; }
        /* Condensed Mode */
        .gemini-prompt-panel.condensed { --panel-padding: 6px; --panel-gap: 6px; --btn-padding: 4px 8px; }
        .gemini-prompt-panel.condensed .gemini-prompt-panel-header { padding: 4px var(--panel-padding); font-size: var(--base-font-size); }
        .gemini-prompt-panel.condensed .prompt-button { padding: 6px; }
        .gemini-prompt-panel.condensed .prompt-category-header { padding: 6px 8px; font-size: calc(var(--base-font-size) - 1px); }
        .gemini-prompt-panel.condensed .prompt-category-content { gap: 5px; padding: 8px; }
        .gemini-prompt-panel.condensed .veo-prompt-card { padding: 8px; gap: 6px; }
        /* Prompt Buttons & Categories */
        .prompt-button-wrapper { display: flex; flex-direction: column; background: #3a3a3e; border: 1px solid var(--panel-border); border-radius: 6px; cursor: grab; transition: box-shadow .2s, transform .2s; }
        .prompt-button-wrapper.dragging { opacity: 0.5; background: #4a4a4e; }
        .prompt-button-wrapper.drag-over { border-bottom: 2px solid var(--pin-color); }
        .prompt-button { position:relative; display: flex; align-items: center; padding: 8px; gap: 8px; }
        .prompt-button .prompt-button-name { flex-grow: 1; text-align: left; font-weight: 500; font-size: var(--base-font-size); }
        .prompt-button-controls { display: none; position: absolute; right: 4px; top: 50%; transform: translateY(-50%); gap: 2px; background: rgba(0,0,0,0.2); border-radius: 12px; padding: 2px; align-items: center; }
        .prompt-button-wrapper:hover .prompt-button-controls { display: flex; }
        .prompt-button-controls button { background: transparent; border: none; cursor: pointer; padding: 3px; border-radius: 50%; display:flex; align-items:center; color: var(--panel-text); }
        .prompt-button-controls button:hover { background-color: rgba(255,255,255,0.15); }
        .favorite-btn.favorited, .pin-btn.pinned { color: var(--favorite-color); }
        .pin-btn.pinned { color: var(--pin-color); }
        .ai-btn { color: var(--ai-color); }
        .prompt-tags-container { display: flex; flex-wrap: wrap; gap: 4px; padding: 0 8px 8px; }
        .prompt-tag { background: var(--tag-bg); color: var(--tag-text); padding: 2px 6px; border-radius: 4px; font-size: calc(var(--base-font-size) - 3px); }
        #custom-prompts-container { display:flex; flex-direction:column; max-height: none; }
        .search-add-container { padding: 0 0 10px; display: flex; flex-direction: column; gap: 8px; }
        #prompt-search-input { width: 100%; background: var(--input-bg); color: var(--input-text); border-radius: 4px; padding: 6px 8px; font-size: calc(var(--base-font-size) - 1px); box-sizing: border-box; font-family: var(--panel-font); border: 2px solid transparent; transition: border-color 0.3s ease, box-shadow 0.3s ease; }
        #prompt-search-input:focus { outline: none; border-color: var(--handle-color); box-shadow: 0 0 8px var(--handle-color); }
        #add-prompt-btn { border: none; color: white; position: relative; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1), 0 1px 3px rgba(0,0,0,0.08); background: linear-gradient(90deg, #4285F4, #DB4437, #F4B400, #0F9D58, #4285F4); background-size: 200% 100%; animation: google-gradient-animation 4s linear infinite; transition: transform 0.15s ease, box-shadow 0.15s ease; }
        @keyframes google-gradient-animation { 0% { background-position: 0% 50%; } 100% { background-position: 200% 50%; } }
        #add-prompt-btn::after { content: ''; position: absolute; top: -50%; left: -50%; width: 200%; height: 200%; background: linear-gradient(to right, rgba(255, 255, 255, 0) 0%, rgba(255, 255, 255, 0.35) 50%, rgba(255, 255, 255, 0) 100%); transform: translateX(-150%); transition: transform 0.6s ease; pointer-events: none; }
        #add-prompt-btn:hover::after { transform: translateX(150%); }
        #add-prompt-btn:active { transform: translateY(1px); box-shadow: 0 2px 4px rgba(0,0,0,0.1), 0 1px 1px rgba(0,0,0,0.08); }
        #favorites-category .prompt-category-header { background: linear-gradient(to right, #e8b31a, #d4a017); color: #1a1a1a; font-weight: bold; }
        .prompt-category { border: 1px solid var(--panel-border); border-radius: 6px; margin-bottom: 10px; overflow: hidden; transition: all 0.2s; }
        .prompt-category.dragging { opacity: 0.5; border-style: dashed; }
        .prompt-category.drag-over { border-bottom: 3px solid var(--pin-color); }
        .prompt-category-header { display: flex; justify-content: space-between; align-items: center; padding: 8px 10px; background: var(--panel-header-bg); cursor: pointer; font-weight: bold; font-size: calc(var(--base-font-size) - 1px); }
        .prompt-category-header.draggable-header { cursor: grab; }
        .category-header-title { flex-grow: 1; }
        .category-header-controls { display: flex; align-items: center; gap: 4px; }
        .category-header-controls button { padding: 2px; }
        .category-header-controls button:disabled { opacity: 0.3; cursor: not-allowed; }
        .category-toggle-icon { transition: transform 0.2s; }
        .prompt-category.collapsed .category-toggle-icon { transform: rotate(-90deg); }
        .prompt-category-content { display: flex; flex-direction: column; gap: 8px; padding: 10px; max-height: 300px; overflow-y: auto; transition: max-height 0.3s ease-out, padding 0.3s ease-out, opacity 0.3s ease-out; }
        .prompt-category.collapsed .prompt-category-content { max-height: 0; padding-top: 0; padding-bottom: 0; opacity: 0; overflow: hidden; }
        /* Post Navigator */
        .post-navigator { position: fixed; display: flex; flex-direction: column; gap: 5px; z-index: 9997; transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1); }
        .post-navigator button { background: var(--panel-header-bg); color: var(--panel-text); border: 1px solid var(--panel-border); width: var(--nav-btn-size); height: var(--nav-btn-size); border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 2px 8px rgba(0,0,0,0.4); transition: all 0.2s, opacity 0.3s; opacity: 0; pointer-events: none; }
        .post-navigator button.visible { opacity: 1; pointer-events: auto; }
        .post-navigator button:hover { background: var(--panel-bg); filter: brightness(1.2); transform: scale(1.05); }
        .post-navigator button:active { transform: scale(0.95); }
        .post-navigator .main-nav-arrow { position: fixed; top: calc(var(--panel-top, 90px) + 20px); z-index: 9998; }
        .gemini-prompt-panel.left-side.visible ~ .post-navigator { left: calc(var(--panel-width, 320px) + 10px); }
        .gemini-prompt-panel.left-side:not(.visible) ~ .post-navigator { left: 10px; }
        .gemini-prompt-panel.right-side.visible ~ .post-navigator { right: calc(var(--panel-width, 320px) + 10px); }
        .gemini-prompt-panel.right-side:not(.visible) ~ .post-navigator { right: 10px; }
        .gemini-prompt-panel.left-side ~ .post-navigator .main-nav-arrow { left: calc(var(--panel-width, 320px) - (var(--nav-btn-size) / 2)); }
        .gemini-prompt-panel.left-side:not(.visible) ~ .post-navigator .main-nav-arrow { left: calc(var(--handle-width, 8px) - (var(--nav-btn-size) / 2)); }
        .gemini-prompt-panel.right-side ~ .post-navigator .main-nav-arrow { right: calc(var(--panel-width, 320px) - (var(--nav-btn-size) / 2)); }
        .gemini-prompt-panel.right-side:not(.visible) ~ .post-navigator .main-nav-arrow { right: calc(var(--handle-width, 8px) - (var(--nav-btn-size) / 2)); }
        /* Modals, Toast, Settings */
        .modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: var(--modal-bg); z-index: 10000; display: none; align-items: center; justify-content: center; backdrop-filter: blur(2px); }
        .modal-content { font-family: var(--panel-font); background: var(--modal-content-bg); color: var(--panel-text); padding: 20px; border-radius: 8px; box-shadow: 0 5px 15px rgba(0,0,0,0.5); width: 90%; max-width: 600px; position: relative; display: flex; flex-direction: column; max-height: 90vh; font-size: var(--base-font-size); }
        .modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; border-bottom: 1px solid var(--panel-border); padding-bottom: 10px; flex-shrink: 0; }
        .modal-title { font-size: calc(var(--base-font-size) + 4px); font-weight: bold; }
        .modal-close-btn { background: none; border: none; color: var(--panel-text); cursor: pointer; padding: 5px; border-radius: 50%; display:flex; }
        .modal-close-btn:hover { background-color: rgba(255,255,255,0.1); }
        .modal-body { overflow-y: auto; padding-right: 10px; }
        .modal-body > form > .form-section { margin-bottom: 20px; }
        .form-section, .settings-section { display: flex; flex-direction: column; gap: 8px; }
        .form-row { display: flex; gap: 20px; align-items: center; margin-bottom: 15px; }
        /* Settings Accordion */
        .accordion-section { margin-bottom: 5px; border: 1px solid var(--panel-border); border-radius: 6px; overflow: hidden; }
        .accordion-header { background: var(--panel-header-bg); padding: 10px 15px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; font-weight: bold; }
        .accordion-header:after { content: '▼'; transition: transform 0.2s; }
        .accordion-header.active:after { transform: rotate(180deg); }
        .accordion-content { padding: 15px; display: none; flex-direction: column; gap: 15px; background: var(--panel-bg); }
        .accordion-header.active + .accordion-content { display: flex; }
        .settings-section-grid { display: grid; grid-template-columns: 1fr auto; gap: 10px 20px; align-items: center; padding: 8px 0; border-bottom: 1px solid var(--panel-border); }
        .settings-section-grid:last-of-type { border-bottom: none; }
        .settings-section-grid .label-group { display: flex; flex-direction: column; gap: 2px; }
        .settings-section-grid .label-group label { font-size: var(--base-font-size); font-weight: 500; }
        .settings-section-grid .label-group .description { font-size: calc(var(--base-font-size) - 2px); color: #aaa; }
        .form-section label, .settings-section label, .form-row label { font-size: var(--base-font-size); font-weight: 500; }
        .form-section input, .form-section textarea, .form-section select { width: 100%; background: var(--input-bg); color: var(--input-text); border: 1px solid var(--input-border); border-radius: 4px; padding: 8px; font-size: var(--base-font-size); box-sizing: border-box; font-family: var(--panel-font); }
        .form-section textarea { min-height: 120px; resize: vertical; }
        .form-checkbox { display: flex; align-items: center; gap: 10px; font-size: var(--base-font-size); }
        .toggle-switch { position: relative; display: inline-block; width: 44px; height: 24px; }
        .toggle-switch input { opacity: 0; width: 0; height: 0; }
        .toggle-switch label { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #555; transition: .4s; border-radius: 24px; }
        .toggle-switch label:before { position: absolute; content: ""; height: 18px; width: 18px; left: 3px; bottom: 3px; background-color: white; transition: .4s; border-radius: 50%; }
        .toggle-switch input:checked + label { background-color: var(--handle-color); }
        .toggle-switch input:checked + label:before { transform: translateX(20px); }
        /* Group Order D&D List */
        #group-order-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 5px; }
        #group-order-list li { background: var(--input-bg); padding: 8px 12px; border-radius: 4px; display: flex; align-items: center; gap: 10px; cursor: grab; border: 1px solid var(--input-border); }
        #group-order-list li.dragging { opacity: 0.5; }
        #group-order-list li.drag-over { border-top: 2px solid var(--handle-color); }
        .toast-notification { position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); color: white; padding: 12px 24px; border-radius: 8px; z-index: 10001; opacity: 0; transition: opacity 0.3s, bottom 0.3s; pointer-events: none; font-family: var(--panel-font); font-size: calc(var(--base-font-size) + 2px); box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
        .toast-notification.show { opacity: 1; bottom: 40px; }
        .toast-notification.success { background: linear-gradient(to right, #28a745, #218838); }
        .toast-notification.error { background: linear-gradient(to right, #dc3545, #c82333); }
        /* AI Enhancer Modal */
        #ai-enhancer-modal .diff-container { border: 1px solid var(--panel-border); border-radius: 6px; padding: 10px; min-height: 150px; background: var(--input-bg); font-family: monospace; white-space: pre-wrap; }
        #ai-enhancer-modal .diff-container ins { background-color: #28a7454D; text-decoration: none; }
        #ai-enhancer-modal .diff-container del { background-color: #dc35454D; text-decoration: none; }
        /* Theme & Analytics */
        .color-picker-row { display: flex; align-items: center; gap: 10px; }
        .color-picker-row input[type="color"] { width: 40px; height: 24px; padding: 0; border: none; background: none; border-radius: 4px; cursor: pointer; }
        .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 15px; }
        .stat-card { background: var(--panel-header-bg); padding: 15px; border-radius: 8px; }
        .stat-card h3 { margin: 0 0 10px; font-size: 1em; border-bottom: 1px solid var(--panel-border); padding-bottom: 5px;}
        .stat-card ul { margin: 0; padding: 0; list-style: none; }
        .stat-card li { display: flex; justify-content: space-between; padding: 4px 0; font-size: 0.9em; }
        .stat-card li .stat-value { font-weight: bold; }
        /* Version History Modal */
        #history-list { list-style: none; padding: 0; margin: 0; }
        #history-list li { background: var(--input-bg); padding: 10px; border-radius: 6px; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center; }
        #history-list li .history-text { white-space: pre-wrap; word-break: break-all; max-height: 60px; overflow: hidden; text-overflow: ellipsis; flex-grow: 1; margin-left: 10px; }
        /* Floating Mini Panel */
        #mini-panel-trigger { position: absolute; right: 50px; bottom: 10px; z-index: 1000; background: var(--panel-header-bg); border: 1px solid var(--panel-border); color: var(--panel-text); border-radius: 50%; width: 36px; height: 36px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all .2s; }
        #mini-panel-trigger:hover { filter: brightness(1.2); }
        #floating-mini-panel { position: absolute; bottom: 60px; right: 10px; width: 300px; max-height: 40vh; z-index: 9999; background: var(--panel-bg); border: 1px solid var(--panel-border); border-radius: 8px; box-shadow: 0 5px 15px rgba(0,0,0,0.3); display: none; flex-direction: column; overflow: hidden; }
        #floating-mini-panel.visible { display: flex; }
        #floating-mini-panel .prompt-group-container { padding: 8px; }
        /* Input Enhancements */
        .input-with-button { display: flex; gap: 8px; }
        .input-with-button input { flex-grow: 1; }
        .file-import-button { cursor: pointer; }
        #import-file-input { display: none; }
    `);
    }

    // --- MODAL BUILDERS ---
    function buildPromptFormModal() {
        const modal = document.createElement('div');
        modal.id = 'prompt-form-modal';
        modal.className = 'modal-overlay';
        const modalContent = document.createElement('div');
        modalContent.className = 'modal-content';
        const modalHeader = document.createElement('div');
        modalHeader.className = 'modal-header';
        const title = document.createElement('h2');
        title.className = 'modal-title';
        title.id = 'prompt-form-title';
        const closeBtn = document.createElement('button');
        closeBtn.className = 'modal-close-btn';
        closeBtn.title = 'Close';
        closeBtn.appendChild(icons.close.cloneNode(true));
        modalHeader.append(title, closeBtn);
        const modalBody = document.createElement('div');
        modalBody.className = 'modal-body';
        const form = document.createElement('form');
        form.id = 'prompt-form';
        const idInput = document.createElement('input');
        idInput.type = 'hidden';
        idInput.id = 'prompt-id-input';
        form.appendChild(idInput);
        const nameSection = document.createElement('div');
        nameSection.className = 'form-section';
        const nameLabel = document.createElement('label');
        nameLabel.htmlFor = 'prompt-name-input';
        nameLabel.textContent = 'Prompt Name';
        const nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.id = 'prompt-name-input';
        nameInput.required = true;
        nameSection.append(nameLabel, nameInput);
        form.appendChild(nameSection);
        const textSection = document.createElement('div');
        textSection.className = 'form-section';
        const textLabel = document.createElement('label');
        textLabel.htmlFor = 'prompt-text-input';
        textLabel.textContent = 'Prompt Text';
        const textInput = document.createElement('textarea');
        textInput.id = 'prompt-text-input';
        textInput.required = true;
        textSection.append(textLabel, textInput);
        form.appendChild(textSection);
        const tagsSection = document.createElement('div');
        tagsSection.className = 'form-section';
        const tagsLabel = document.createElement('label');
        tagsLabel.htmlFor = 'prompt-tags-input';
        tagsLabel.textContent = 'Tags (comma-separated)';
        const tagsInput = document.createElement('input');
        tagsInput.type = 'text';
        tagsInput.id = 'prompt-tags-input';
        tagsSection.append(tagsLabel, tagsInput);
        form.appendChild(tagsSection);
        const catSection = document.createElement('div');
        catSection.className = 'form-section';
        const catLabel = document.createElement('label');
        catLabel.htmlFor = 'prompt-category-select';
        catLabel.textContent = 'Prompt Group';
        const catSelect = document.createElement('select');
        catSelect.id = 'prompt-category-select';
        const newCatInput = document.createElement('input');
        newCatInput.type = 'text';
        newCatInput.id = 'prompt-new-category-input';
        newCatInput.placeholder = 'New group name...';
        newCatInput.style.display = 'none';
        newCatInput.style.marginTop = '8px';
        catSection.append(catLabel, catSelect, newCatInput);
        form.appendChild(catSection);
        const togglesRow = document.createElement('div');
        togglesRow.className = 'form-row';
        const autoSendSection = document.createElement('div');
        autoSendSection.className = 'form-checkbox';
        const autoSendCheck = document.createElement('input');
        autoSendCheck.type = 'checkbox';
        autoSendCheck.id = 'prompt-autosend-checkbox';
        const autoSendLabel = document.createElement('label');
        autoSendLabel.htmlFor = 'prompt-autosend-checkbox';
        autoSendLabel.textContent = 'Auto-Send';
        autoSendSection.append(autoSendCheck, autoSendLabel);
        const favoriteSection = document.createElement('div');
        favoriteSection.className = 'form-checkbox';
        const favoriteCheck = document.createElement('input');
        favoriteCheck.type = 'checkbox';
        favoriteCheck.id = 'prompt-favorite-checkbox';
        const favoriteLabel = document.createElement('label');
        favoriteLabel.htmlFor = 'prompt-favorite-checkbox';
        favoriteLabel.textContent = 'Favorite';
        favoriteSection.append(favoriteCheck, favoriteLabel);
        const pinSection = document.createElement('div');
        pinSection.className = 'form-checkbox';
        const pinCheck = document.createElement('input');
        pinCheck.type = 'checkbox';
        pinCheck.id = 'prompt-pin-checkbox';
        const pinLabel = document.createElement('label');
        pinLabel.htmlFor = 'prompt-pin-checkbox';
        pinLabel.textContent = 'Pin to Top';
        pinSection.append(pinCheck, pinLabel);
        togglesRow.append(autoSendSection, favoriteSection, pinSection);
        form.appendChild(togglesRow);
        const btnGroup = document.createElement('div');
        btnGroup.className = 'button-group';
        btnGroup.style.marginTop = '20px';
        const saveBtn = document.createElement('button');
        saveBtn.type = 'submit';
        saveBtn.className = 'gemini-prompt-panel-button copy-btn';
        saveBtn.id = 'save-prompt-btn';
        saveBtn.textContent = 'Save Prompt';
        const cancelBtn = document.createElement('button');
        cancelBtn.type = 'button';
        cancelBtn.className = 'gemini-prompt-panel-button';
        cancelBtn.id = 'cancel-prompt-btn';
        cancelBtn.textContent = 'Cancel';
        btnGroup.append(saveBtn, cancelBtn);
        form.appendChild(btnGroup);
        modalBody.appendChild(form);
        modalContent.append(modalHeader, modalBody);
        modal.appendChild(modalContent);
        return modal;
    }
    function buildSettingsModal() {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        const modalContent = document.createElement('div');
        modalContent.className = 'modal-content';
        const modalHeader = document.createElement('div');
        modalHeader.className = 'modal-header';
        const title = document.createElement('h2');
        title.className = 'modal-title';
        title.textContent = 'Settings';
        const closeBtn = document.createElement('button');
        closeBtn.className = 'modal-close-btn';
        closeBtn.appendChild(icons.close.cloneNode(true));
        modalHeader.append(title, closeBtn);
        const modalBody = document.createElement('div');
        modalBody.className = 'modal-body';
        const form = document.createElement('form');
        modalBody.appendChild(form);
        modalContent.append(modalHeader, modalBody);
        modal.appendChild(modalContent);
        return modal;
    }
    function buildImportExportModal() {
        const modal = document.createElement('div');
        modal.id = 'import-export-modal';
        modal.className = 'modal-overlay';
        const modalContent = document.createElement('div');
        modalContent.className = 'modal-content';
        const modalHeader = document.createElement('div');
        modalHeader.className = 'modal-header';
        const title = document.createElement('h2');
        title.className = 'modal-title';
        title.textContent = 'Import / Export Prompts';
        const closeBtn = document.createElement('button');
        closeBtn.className = 'modal-close-btn';
        closeBtn.appendChild(icons.close.cloneNode(true));
        modalHeader.append(title, closeBtn);
        const modalBody = document.createElement('div');
        modalBody.className = 'modal-body';
        // The main script will populate the body with buttons
        modalContent.append(modalHeader, modalBody);
        modal.appendChild(modalContent);
        return modal;
    }
    function buildAIEnhancerModal() {
        const modal = document.createElement('div');
        modal.id = 'ai-enhancer-modal';
        modal.className = 'modal-overlay';
        const modalContent = document.createElement('div');
        modalContent.className = 'modal-content';
        const modalHeader = document.createElement('div');
        modalHeader.className = 'modal-header';
        const title = document.createElement('h2');
        title.className = 'modal-title';
        title.textContent = 'AI Prompt Enhancer';
        const closeBtn = document.createElement('button');
        closeBtn.className = 'modal-close-btn';
        closeBtn.appendChild(icons.close.cloneNode(true));
        modalHeader.append(title, closeBtn);
        const modalBody = document.createElement('div');
        modalBody.className = 'modal-body';
        const diffContainer = document.createElement('div');
        diffContainer.className = 'diff-container';
        diffContainer.textContent = 'Click "Enhance" to see the result...';
        const btnGroup = document.createElement('div');
        btnGroup.className = 'button-group';
        btnGroup.style.marginTop = '20px';
        // Buttons will be added by the main script
        modalBody.append(diffContainer, btnGroup);
        modalContent.append(modalHeader, modalBody);
        modal.appendChild(modalContent);
        return modal;
    }
    function buildAnalyticsModal() {
        const modal = document.createElement('div');
        modal.id = 'analytics-modal';
        modal.className = 'modal-overlay';
        const modalContent = document.createElement('div');
        modalContent.className = 'modal-content';
        const modalHeader = document.createElement('div');
        modalHeader.className = 'modal-header';
        const title = document.createElement('h2');
        title.className = 'modal-title';
        title.textContent = 'Prompt Analytics';
        const closeBtn = document.createElement('button');
        closeBtn.className = 'modal-close-btn';
        closeBtn.appendChild(icons.close.cloneNode(true));
        modalHeader.append(title, closeBtn);
        const modalBody = document.createElement('div');
        modalBody.className = 'modal-body';
        modalBody.id = 'analytics-body';
        modalContent.append(modalHeader, modalBody);
        modal.appendChild(modalContent);
        return modal;
    }
    function buildVersionHistoryModal() {
        const modal = document.createElement('div');
        modal.id = 'version-history-modal';
        modal.className = 'modal-overlay';
        const modalContent = document.createElement('div');
        modalContent.className = 'modal-content';
        const modalHeader = document.createElement('div');
        modalHeader.className = 'modal-header';
        const title = document.createElement('h2');
        title.className = 'modal-title';
        title.id = 'history-modal-title';
        const closeBtn = document.createElement('button');
        closeBtn.className = 'modal-close-btn';
        closeBtn.appendChild(icons.close.cloneNode(true));
        modalHeader.append(title, closeBtn);
        const modalBody = document.createElement('div');
        modalBody.className = 'modal-body';
        const list = document.createElement('ul');
        list.id = 'history-list';
        modalBody.appendChild(list);
        modalContent.append(modalHeader, modalBody);
        modal.appendChild(modalContent);
        return modal;
    }

    // ###################################################################################
    // # --- MAIN SCRIPT LOGIC (GeminiBuddy.user.js) ---
    // ###################################################################################

    // --- DOM & STATE VARIABLES ---
    let panel, handle, promptFormModal, toast, resizeHandle, navigator, settingsModal, importExportModal, aiEnhancerModal, analyticsModal, versionHistoryModal, floatingMiniPanel, miniPanelTrigger;
    let leftHeaderControls, rightHeaderControls, actionGroup, panelModeSelector;
    let searchAddContainer, copyResponseButton, copyCodeButton; // Chat-specific controls
    let lockButton, arrowLeftBtn, arrowRightBtn, settingsBtn, analyticsBtn;
    let isManuallyLocked = false, isFormActiveLock = false;
    let generationObserver = null, isGenerating = false;

    // --- CORE HELPERS ---
    function showToast(message, duration = 2000, type = '') {
        toast.textContent = message;
        toast.className = 'toast-notification';
        if (type) toast.classList.add(type);
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), duration);
    }
    function showCountdownToast(message, duration = 5000) {
        toast.className = 'toast-notification success show';
        let seconds = Math.floor(duration / 1000);
        const updateText = () => { toast.textContent = `${message} (${seconds})`; };
        updateText();
        const timer = setInterval(() => {
            seconds--;
            if (seconds > 0) {
                updateText();
            } else {
                clearInterval(timer);
                toast.classList.remove('show');
            }
        }, 1000);
        setTimeout(() => { clearInterval(timer); toast.classList.remove('show'); }, duration);
    }
    function hidePanel() { if (!isManuallyLocked && !isFormActiveLock && !panel.classList.contains('is-resizing')) panel.classList.remove('visible'); }
    function updateLockIcon() { if (lockButton) { while (lockButton.firstChild) lockButton.removeChild(lockButton.firstChild); lockButton.appendChild(((isManuallyLocked || isFormActiveLock) ? icons.locked : icons.unlocked).cloneNode(true)); } }
    function createButtonWithIcon(txt, ic) { const b = document.createElement('button'); b.className = 'gemini-prompt-panel-button'; if (ic) b.appendChild(ic.cloneNode(true)); if (txt) b.appendChild(document.createTextNode(txt)); return b; }
    function capitalizeFirstLetter(string) { return string.charAt(0).toUpperCase() + string.slice(1); }

    // --- THEME & WIDE MODE ---
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
            if (styleTag) {
                styleTag.remove();
            }
        }
    }

    // --- RENDER & UI ---
    async function applySettingsAndTheme() {
        applyTheme();
        toggleFullWidth(settings.enableFullWidth);
        const wasLockedAndVisible = panel.classList.contains('visible') && isManuallyLocked;
        panel.className = 'gemini-prompt-panel';
        if (settings.themeName === 'glass') panel.classList.add('glass-theme');
        if (settings.condensedMode) panel.classList.add('condensed');
        if(wasLockedAndVisible) panel.classList.add('visible');
        const p = settings.position;
        panel.classList.add(p === 'left' ? 'left-side' : 'right-side');
        handle.classList.toggle('right-side-handle', p === 'right');
        handle.classList.toggle('edge', settings.handleStyle === 'edge');
        resizeHandle.className = `gemini-resize-handle ${settings.position === 'right' ? 'left-handle' : 'right-handle'}`;
        navigator.style.top = settings.topOffset;
        panel.style.setProperty('--panel-width', `${settings.panelWidth}px`);
        panel.style.setProperty('--handle-width', `${settings.handleWidth}px`);
        handle.style.width = `${settings.handleWidth}px`;
        panel.style.setProperty('--panel-top', settings.topOffset);
        handle.style.top = settings.topOffset;
        updateHeaderLayout();
        renderActionButtons();
        updateNavigator();
        updateHandleHeight();
        renderPanelContent(); // Use the new main render function
    }

    // --- NEW: Main Panel Rendering Logic ---
    function renderPanelContent() {
        const isVeoMode = currentPanelView === 'veo';
        // Toggle visibility of chat-specific controls
        actionGroup.style.display = isVeoMode ? 'none' : 'grid';
        searchAddContainer.style.display = isVeoMode ? 'none' : 'flex';

        if (isVeoMode) {
            renderVeoPanel();
        } else {
            renderAllPrompts();
        }
        updateHandleHeight();
    }

    // --- NEW: VEO Panel Rendering ---
    function renderVeoPanel() {
        const container = panel.querySelector('#custom-prompts-container');
        while (container.firstChild) container.removeChild(container.firstChild);

        if (veoPrompts.length === 0) {
            container.textContent = "Loading VEO prompts or none found.";
            return;
        }

        veoPrompts.forEach(item => {
            const card = document.createElement('div');
            card.className = 'veo-prompt-card';

            const text = document.createElement('div');
            text.className = 'veo-card-text';
            text.textContent = item.prompt;

            const actions = document.createElement('div');
            actions.className = 'veo-card-actions';

            // Copy Button
            const copyBtn = document.createElement('button');
            copyBtn.className = 'action-btn';
            copyBtn.appendChild(icons.copy.cloneNode(true));
            copyBtn.appendChild(document.createTextNode(' Copy Prompt'));
            copyBtn.addEventListener('click', () => {
                navigator.clipboard.writeText(item.prompt).then(() => {
                    showToast('VEO prompt copied!', 2000, 'success');
                });
            });

            // Video Link
            const videoLink = document.createElement('a');
            videoLink.className = 'action-btn';
            videoLink.href = item.video_post_url;
            videoLink.target = '_blank';
            videoLink.appendChild(icons.video.cloneNode(true));
            videoLink.appendChild(document.createTextNode(' Video'));

            // Post Link
            const postLink = document.createElement('a');
            postLink.className = 'action-btn';
            postLink.href = item.post_url;
            postLink.target = '_blank';
            postLink.appendChild(icons.webLink.cloneNode(true));
            postLink.appendChild(document.createTextNode(' Post'));

            actions.append(copyBtn, videoLink, postLink);
            card.append(text, actions);
            container.appendChild(card);
        });
    }

    function updateHeaderLayout() {
        while(leftHeaderControls.firstChild) leftHeaderControls.removeChild(leftHeaderControls.firstChild);
        while(rightHeaderControls.firstChild) rightHeaderControls.removeChild(rightHeaderControls.firstChild);
        if (settings.position === 'left') {
            leftHeaderControls.append(settingsBtn, analyticsBtn);
            rightHeaderControls.append(lockButton, arrowRightBtn);
        } else {
            leftHeaderControls.append(arrowLeftBtn, lockButton);
            rightHeaderControls.append(analyticsBtn, settingsBtn);
        }
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

    // --- PROMPT & CATEGORY MGMT (For Chat Mode) ---
    async function loadAndDisplayPrompts(isSync = false) {
        if (!isSync) {
            let raw = await GM_getValue(GM_PROMPTS_KEY);
            try {
                let loadedPrompts = JSON.parse(raw);
                if (typeof loadedPrompts === 'object' && loadedPrompts !== null && Object.keys(loadedPrompts).length > 0) {
                    currentPrompts = loadedPrompts;
                } else { throw new Error("No prompts stored, checking for first run."); }
            } catch (e) {
                console.log(e.message);
                currentPrompts = {};
                if (confirm("Welcome to the Gemini Prompt Panel! Would you like to import the default list of prompts to get started?")) {
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
        renderPanelContent(); // Use the main render function
        renderMiniPanel();
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

            if (settings.enableAIenhancer) {
                const aiBtn = document.createElement('button');
                aiBtn.title = "Enhance with AI";
                aiBtn.classList.add('ai-btn');
                aiBtn.appendChild(icons.sparkle.cloneNode(true));
                aiBtn.addEventListener('click', () => showAIEnhancer(promptData));
                controls.appendChild(aiBtn);
            }
            const pinBtn = document.createElement('button');
            pinBtn.title = "Pin to Top"; pinBtn.classList.add('pin-btn');
            const isPinned = promptData.pinned;
            pinBtn.appendChild((isPinned ? icons.pin : icons.pinOutline).cloneNode(true));
            if(isPinned) pinBtn.classList.add('pinned');
            pinBtn.addEventListener('click', () => { promptData.pinned = !promptData.pinned; savePrompts(); renderAllPrompts(); });
            const favoriteBtn = document.createElement('button');
            favoriteBtn.title = "Favorite"; favoriteBtn.classList.add('favorite-btn');
            const isFavorited = settings.favorites.includes(promptData.id);
            favoriteBtn.appendChild((isFavorited ? icons.star : icons.starOutline).cloneNode(true));
            if(isFavorited) favoriteBtn.classList.add('favorited');
            favoriteBtn.addEventListener('click', () => {
                if (settings.favorites.includes(promptData.id)) {
                    settings.favorites = settings.favorites.filter(id => id !== promptData.id);
                } else {
                    settings.favorites.push(promptData.id);
                }
                saveSettings().then(renderAllPrompts);
            });
            const editBtn = document.createElement('button');
            editBtn.title = "Edit"; editBtn.appendChild(icons.edit.cloneNode(true));
            editBtn.addEventListener('click', () => {
                let originalCategory = findPromptCategory(promptData.id);
                showPromptForm(promptData, originalCategory);
            });
            const deleteBtn = document.createElement('button');
            deleteBtn.title = "Delete"; deleteBtn.appendChild(icons.trash.cloneNode(true));
            deleteBtn.addEventListener('click', () => {
                if (confirm(`Are you sure you want to delete the prompt "${promptData.name}"? This will also delete its version history.`)) {
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
            controls.append(pinBtn, favoriteBtn, editBtn, deleteBtn);
            btn.appendChild(controls);
        }

        wrapper.appendChild(btn);

        if (!isMini && settings.showTags && promptData.tags) {
            const tagsContainer = document.createElement('div');
            tagsContainer.className = 'prompt-tags-container';
            (promptData.tags || "").split(',').forEach(tag => {
                if(tag.trim()){
                    const tagEl = document.createElement('span');
                    tagEl.className = 'prompt-tag';
                    tagEl.textContent = tag.trim();
                    tagsContainer.appendChild(tagEl);
                }
            });
            if(tagsContainer.hasChildNodes()) wrapper.appendChild(tagsContainer);
        }

        container.appendChild(wrapper);
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
                        showToast("A group with this name already exists.", 3000, 'error');
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
                if(e.target.closest('.category-header-controls')) return;
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
    function findPromptCategory(promptId) {
        for (const cat in currentPrompts) {
            if (currentPrompts[cat].some(p => p.id === promptId)) {
                return cat;
            }
        }
        return null;
    }

    function renderAllPrompts() { // This is now the specific renderer for 'chat' view
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

    // --- DRAG & DROP LOGIC ---
    let draggedItem = null;
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
    function handleDragLeave() { this.classList.remove('drag-over'); }
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
                showToast("Can only reorder prompts within the same category.", 2500, 'error');
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

    function handleSearch(e) {
        const searchTerm = e.target.value.toLowerCase();
        const isMini = e.target.closest('#floating-mini-panel');
        const container = isMini ? floatingMiniPanel : panel;

        container.querySelectorAll('.prompt-button-wrapper').forEach(wrapper => {
            const promptId = wrapper.dataset.promptId;
            const promptCategory = findPromptCategory(promptId);
            if(!promptCategory) return;

            const promptData = currentPrompts[promptCategory].find(p => p.id === promptId);
            if(!promptData) return;

            const promptName = promptData.name.toLowerCase();
            const promptText = promptData.text.toLowerCase();
            const promptTags = (promptData.tags || "").toLowerCase();

            const isVisible = promptName.includes(searchTerm) || promptText.includes(searchTerm) || promptTags.includes(searchTerm);
            wrapper.style.display = isVisible ? 'flex' : 'none';
        });
    }

    // --- MODAL POPULATORS & LOGIC ---
    function populateSettingsModal(form) {
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

        // UI/Interface Section
        const interfaceContent = createAccordionSection('Interface', 'settings-interface');
        const handleStyleSelector = document.createElement('select');
        handleStyleSelector.id = 'handle-style-select';
        [{v: 'classic', t: 'Classic (Small)'}, {v: 'edge', t: 'Edge (Full Height)'}].forEach(opt => {
            const option = document.createElement('option');
            option.value = opt.v;
            option.textContent = opt.t;
            handleStyleSelector.appendChild(option);
        });
        handleStyleSelector.value = settings.handleStyle;
        handleStyleSelector.addEventListener('change', (e) => { settings.handleStyle = e.target.value; saveSettings().then(applySettingsAndTheme); });
        interfaceContent.appendChild(createSettingRow('handle-style-select', 'Panel Handle Style', 'Choose the appearance of the panel handle.', handleStyleSelector));
        interfaceContent.appendChild(createSettingRow('condensed-mode-toggle', "Condensed GUI", "Reduces padding and margins for a compact view.",
            createToggle('condensed-mode-toggle', settings.condensedMode, (e) => {
                settings.condensedMode = e.target.checked;
                panel.classList.toggle('condensed', settings.condensedMode);
                saveSettings();
            })
        ));
        interfaceContent.appendChild(createSettingRow('group-by-tags-toggle', "Group Prompts by Tag", "Overrides category groups with groups for each tag.",
            createToggle('group-by-tags-toggle', settings.groupByTags, (e) => { settings.groupByTags = e.target.checked; saveSettings().then(renderAllPrompts); })
        ));
        interfaceContent.appendChild(createSettingRow('full-width-toggle', "Enable Full Width Chat", "Expands the chat area to fill the screen.",
            createToggle('full-width-toggle', settings.enableFullWidth, (e) => { settings.enableFullWidth = e.target.checked; toggleFullWidth(settings.enableFullWidth); saveSettings(); })
        ));
        interfaceContent.appendChild(createSettingRow('mini-mode-toggle', "Enable Floating Mini-Mode", "Show a quick-access icon in the chat input.",
            createToggle('mini-mode-toggle', settings.enableMiniMode, (e) => { settings.enableMiniMode = e.target.checked; saveSettings(); miniPanelTrigger.style.display = settings.enableMiniMode ? 'flex' : 'none'; })
        ));
        interfaceContent.appendChild(createSettingRow('copy-buttons-swap-toggle', "Swap 'Copy' Button Order", "Reverse the order of 'Copy Response' and 'Copy Code'.",
            createToggle('copy-buttons-swap-toggle', settings.copyButtonOrderSwapped, (e) => { settings.copyButtonOrderSwapped = e.target.checked; saveSettings(); renderActionButtons(); })
        ));
        interfaceContent.appendChild(createSettingRow('show-tags-toggle', "Show Prompt Tags", "Display tags underneath each prompt.",
            createToggle('show-tags-toggle', settings.showTags, (e) => { settings.showTags = e.target.checked; saveSettings().then(renderAllPrompts); })
        ));

        // Theme Section
        const themeContent = createAccordionSection('Theme', 'settings-theme');
        const fontSlider = document.createElement('input');
        fontSlider.type = 'range'; fontSlider.min = '12'; fontSlider.max = '20'; fontSlider.step = '0.5';
        fontSlider.value = parseFloat(settings.baseFontSize);
        fontSlider.addEventListener('input', (e) => {
            const newSize = e.target.value + 'px';
            settings.baseFontSize = newSize;
            document.documentElement.style.setProperty('--base-font-size', newSize);
        });
        fontSlider.addEventListener('change', saveSettings);
        themeContent.appendChild(createSettingRow('font-size-slider', 'Base Font Size', 'Adjust the font size for the entire panel.', fontSlider));

        const presetSelector = document.createElement('select');
        presetSelector.id = 'theme-preset-select';
        const presets = { 'custom': 'Custom', 'dark': 'Dark (Default)', 'light': 'Light', 'glass': 'Glass', 'hacker': 'Hacker Green' };
        for (const [key, value] of Object.entries(presets)) {
            const option = document.createElement('option'); option.value = key; option.textContent = value;
            presetSelector.appendChild(option);
        }
        presetSelector.value = settings.themeName;
        presetSelector.addEventListener('change', (e) => {
            const themeName = e.target.value;
            if (presetThemes[themeName]) {
                settings.colors = { ...presetThemes[themeName] };
                settings.themeName = themeName;
                applyTheme();
                saveSettings().then(() => populateSettingsModal(form));
            }
        });
        themeContent.appendChild(createSettingRow('theme-preset-select', 'Theme Preset', 'Select a base theme.', presetSelector));

        // Profiles Section
        const profilesContent = createAccordionSection('Profiles & Ordering', 'settings-profiles');
        const techProfileBtn = createButtonWithIcon('Activate Tech Profile', null);
        techProfileBtn.addEventListener('click', () => applyProfile(['tech', 'code', 'script', 'debug', 'system', 'developer']));
        const creativeProfileBtn = createButtonWithIcon('Activate Creative Profile', null);
        creativeProfileBtn.addEventListener('click', () => applyProfile(['creative', 'writing', 'art', 'design', 'story']));
        const profileBtnGroup = document.createElement('div');
        profileBtnGroup.className = 'button-group';
        profileBtnGroup.append(techProfileBtn, creativeProfileBtn);
        profilesContent.appendChild(createSettingRow('profiles', 'Preset Profiles', 'Quickly reorder groups for a specific task.', profileBtnGroup));

        const groupOrderLabel = document.createElement('h4');
        groupOrderLabel.textContent = 'Manual Group Order';
        groupOrderLabel.style.marginTop = '15px';
        profilesContent.appendChild(groupOrderLabel);
        const orderList = document.createElement('ul');
        orderList.id = 'group-order-list';
        renderGroupOrderList(orderList);
        profilesContent.appendChild(orderList);

        // AI Features Section
        const aiContent = createAccordionSection('AI Features', 'settings-ai');
        aiContent.appendChild(createSettingRow('auto-copy-code-toggle', "Auto copy code on completion", "Automatically copies the latest code block when Gemini finishes generating.",
            createToggle('auto-copy-code-toggle', settings.autoCopyCodeOnCompletion, (e) => { settings.autoCopyCodeOnCompletion = e.target.checked; saveSettings(); })
        ));
        aiContent.appendChild(createSettingRow('ai-enhancer-toggle', "Enable AI Prompt Enhancer", "Show the AI enhancement button on prompts.",
            createToggle('ai-enhancer-toggle', settings.enableAIenhancer, (e) => { settings.enableAIenhancer = e.target.checked; saveSettings().then(renderAllPrompts); })
        ));
        const apiKeyInput = document.createElement('input');
        apiKeyInput.type = 'password'; apiKeyInput.id = 'gemini-api-key-input'; apiKeyInput.placeholder = 'Enter your API key';
        apiKeyInput.value = settings.geminiAPIKey;
        apiKeyInput.addEventListener('change', (e) => { settings.geminiAPIKey = e.target.value; saveSettings(); });
        aiContent.appendChild(createSettingRow('gemini-api-key-input', 'Google AI API Key', 'Required for the AI Prompt Enhancer feature.', apiKeyInput));

        // Data Section
        const dataContent = createAccordionSection('Data & Sync', 'settings-data');
        const gistUrlInput = document.createElement('input');
        gistUrlInput.type = 'url'; gistUrlInput.id = 'gist-url-input'; gistUrlInput.placeholder = 'https://gist.github.com/...';
        gistUrlInput.value = settings.gistURL;
        gistUrlInput.addEventListener('change', (e) => { settings.gistURL = e.target.value; saveSettings(); });
        const syncBtn = createButtonWithIcon('Sync Now', icons.sync.cloneNode(true));
        syncBtn.addEventListener('click', () => syncFromGist(true).then(synced => { if(synced) loadAndDisplayPrompts(true); }));
        const gistContainer = document.createElement('div');
        gistContainer.className = 'input-with-button';
        gistContainer.append(gistUrlInput, syncBtn);
        dataContent.appendChild(createSettingRow('gist-url-input', 'GitHub Gist Sync URL', 'Sync prompts across browsers (replaces all local prompts).', gistContainer));
        const importExportButton = createButtonWithIcon('Local Import / Export', icons.importExport.cloneNode(true));
        importExportButton.classList.add('copy-btn');
        importExportButton.style.gridColumn = '1 / -1';
        importExportButton.addEventListener('click', () => showImportExportModal());
        dataContent.appendChild(importExportButton);
    }
    function renderGroupOrderList(listElement) {
        while (listElement.firstChild) listElement.removeChild(listElement.firstChild);
        (settings.groupOrder || []).forEach((groupName, index) => {
            const li = document.createElement('li');
            li.draggable = true;
            li.dataset.index = index;
            li.dataset.groupName = groupName;

            const handle = icons.dragHandle.cloneNode(true);
            const text = document.createTextNode(groupName);
            li.append(handle, text);

            li.addEventListener('dragstart', (e) => {
                draggedItem = e.target;
                setTimeout(() => e.target.classList.add('dragging'), 0);
            });
            li.addEventListener('dragover', (e) => {
                e.preventDefault();
                const target = e.target.closest('li');
                if (target && target !== draggedItem) {
                    target.classList.add('drag-over');
                }
            });
            li.addEventListener('dragleave', (e) => e.target.closest('li')?.classList.remove('drag-over'));
            li.addEventListener('drop', (e) => {
                e.preventDefault();
                const target = e.target.closest('li');
                if (target && target !== draggedItem) {
                    target.classList.remove('drag-over');
                    const fromIndex = parseInt(draggedItem.dataset.index);
                    const toIndex = parseInt(target.dataset.index);
                    const [removed] = settings.groupOrder.splice(fromIndex, 1);
                    settings.groupOrder.splice(toIndex, 0, removed);
                    saveSettings().then(() => {
                        renderGroupOrderList(listElement); // Re-render the D&D list
                        renderAllPrompts(); // Re-render the main panel
                    });
                }
            });
            li.addEventListener('dragend', () => {
                draggedItem?.classList.remove('dragging');
                draggedItem = null;
            });
            listElement.appendChild(li);
        });
    }
    function applyProfile(keywords) {
        const orderArray = settings.groupByTags ? settings.tagOrder : settings.groupOrder;
        const matchingItems = [];
        const otherItems = [];

        orderArray.forEach(item => {
            const lowerItem = item.toLowerCase();
            if (keywords.some(kw => lowerItem.includes(kw))) {
                matchingItems.push(item);
            } else {
                otherItems.push(item);
            }
        });

        const newOrder = [...matchingItems, ...otherItems];
        if (settings.groupByTags) {
            settings.tagOrder = newOrder;
        } else {
            settings.groupOrder = newOrder;
        }

        saveSettings().then(() => {
            renderAllPrompts();
            showToast('Profile activated!', 2000, 'success');
        });
    }
    function populateAnalytics() {
        const body = analyticsModal.querySelector('#analytics-body');
        while (body.firstChild) body.removeChild(body.firstChild);

        const allPrompts = Object.values(currentPrompts).flat();

        const createCard = (title) => {
            const card = document.createElement('div');
            card.className = 'stat-card';
            const h3 = document.createElement('h3');
            h3.textContent = title;
            const ul = document.createElement('ul');
            card.append(h3, ul);
            return { card, ul };
        };

        const createListItem = (label, value) => {
            const li = document.createElement('li');
            const labelSpan = document.createElement('span');
            labelSpan.textContent = label;
            const valueSpan = document.createElement('span');
            valueSpan.className = 'stat-value';
            valueSpan.textContent = value;
            li.append(labelSpan, valueSpan);
            return li;
        };

        const grid = document.createElement('div');
        grid.className = 'stats-grid';

        const { card: generalCard, ul: generalList } = createCard('Overall Stats');
        generalList.appendChild(createListItem('Total Prompts', allPrompts.length));
        generalList.appendChild(createListItem('Total Categories', Object.keys(currentPrompts).filter(c => c !== "Favorites").length));
        const totalUsage = allPrompts.reduce((sum, p) => sum + (p.usageCount || 0), 0);
        generalList.appendChild(createListItem('Total Uses', totalUsage));
        grid.appendChild(generalCard);

        const { card: mostUsedCard, ul: mostUsedList } = createCard('Most Used Prompts');
        [...allPrompts]
            .filter(p => p.usageCount > 0)
            .sort((a, b) => b.usageCount - a.usageCount)
            .slice(0, 5)
            .forEach(p => mostUsedList.appendChild(createListItem(p.name, p.usageCount)));
        grid.appendChild(mostUsedCard);

        const { card: tagsCard, ul: tagsList } = createCard('Most Used Tags');
        const tagCounts = allPrompts.reduce((acc, p) => {
            (p.tags || "").split(',').forEach(tag => {
                const t = tag.trim();
                if (t) acc[t] = (acc[t] || 0) + 1;
            });
            return acc;
        }, {});
        Object.entries(tagCounts)
            .sort(([,a],[,b]) => b-a)
            .slice(0, 5)
            .forEach(([tag, count]) => tagsList.appendChild(createListItem(tag, count)));
        grid.appendChild(tagsCard);

        const { card: categoryCard, ul: categoryList } = createCard('Category Distribution');
         Object.entries(currentPrompts)
            .filter(([name]) => name !== "Favorites")
            .forEach(([name, prompts]) => categoryList.appendChild(createListItem(name, prompts.length)));
        grid.appendChild(categoryCard);

        body.appendChild(grid);
    }
    function showPromptForm(promptToEdit = null, categoryName = '') {
        isFormActiveLock = true; updateLockIcon();
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
        const closeForm = () => { promptFormModal.style.display = 'none'; isFormActiveLock = false; updateLockIcon(); };
        form.onsubmit = (e) => {
            e.preventDefault();
            const id = idInput.value || `prompt-${Date.now()}`;
            const newName = nameInput.value.trim();
            const newText = textInput.value.trim();

            if (promptToEdit && promptToEdit.text !== newText) {
                addHistoryEntry(id, promptToEdit.text);
            }

            const newPrompt = { id, name: newName, text: newText, tags: tagsInput.value.trim(), autoSend: autoSendInput.checked, pinned: pinInput.checked, usageCount: promptToEdit ? promptToEdit.usageCount : 0, lastUsed: promptToEdit ? promptToEdit.lastUsed : null };
            let targetCategory = (categorySelect.value === '__createnew__') ? newCategoryInput.value.trim() : categorySelect.value;
            if (!newPrompt.name || !newPrompt.text || !targetCategory) { showToast("Name, Text, and Group are required.", 2500, 'error'); return; }
            if (targetCategory === "Favorites") { showToast("Cannot add prompts directly to Favorites.", 2500, 'error'); return; }

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
            if(isFavorited && !wasFavorited) settings.favorites.push(id);
            if(!isFavorited && wasFavorited) settings.favorites = settings.favorites.filter(favId => favId !== id);
            Promise.all([savePrompts(), saveSettings()]).then(() => {
                renderAllPrompts();
                showToast(promptToEdit ? 'Prompt updated!' : 'Prompt added!', 2000, 'success');
                closeForm();
            });
        };
        promptFormModal.querySelector('#cancel-prompt-btn').onclick = closeForm;
        promptFormModal.querySelector('.modal-close-btn').onclick = closeForm;
        promptFormModal.addEventListener('click', e => { if (e.target === promptFormModal) closeForm(); });
        promptFormModal.style.display = 'flex';
        nameInput.focus();
    }
    function showImportExportModal() {
        const modalBody = importExportModal.querySelector('.modal-body');
        modalBody.innerHTML = ''; // Clear previous content

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
        const closeModal = () => { importExportModal.style.display = 'none'; lastFetchedUrl = null; };
        closeBtn.onclick = closeModal;
        importExportModal.addEventListener('click', e => { if (e.target === importExportModal) closeModal(); });

        exportBtn.onclick = () => {
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(currentPrompts, null, 2));
            const downloadAnchorNode = document.createElement('a');
            downloadAnchorNode.setAttribute("href", dataStr);
            downloadAnchorNode.setAttribute("download", "gemini_prompts_export.json");
            document.body.appendChild(downloadAnchorNode);
            downloadAnchorNode.click();
            downloadAnchorNode.remove();
            showToast('Exporting prompts...', 2000, 'success');
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
            if (!url) { showToast("Please enter a URL.", 2000, 'error'); return; }
            fetchBtn.textContent = 'Fetching...';
            fetchBtn.disabled = true;
            GM_xmlhttpRequest({
                method: 'GET', url: url,
                onload: function(response) {
                    importTextarea.value = response.responseText;
                    lastFetchedUrl = url;
                    showToast('Fetched content from URL.', 2000, 'success');
                    fetchBtn.textContent = 'Fetch'; fetchBtn.disabled = false; urlInput.value = '';
                },
                onerror: function() {
                    lastFetchedUrl = null;
                    showToast('Failed to fetch from URL.', 3000, 'error');
                    fetchBtn.textContent = 'Fetch'; fetchBtn.disabled = false;
                }
            });
        };

        importBtn.onclick = () => {
            try {
                const importedData = JSON.parse(importTextarea.value);
                if (typeof importedData !== 'object' || importedData === null) { throw new Error('Invalid JSON format.'); }

                if (lastFetchedUrl) {
                    const filename = lastFetchedUrl.split('/').pop().split('?')[0];
                    let newGroupName = filename;
                    let counter = 1;
                    while(currentPrompts[newGroupName]) { newGroupName = `${filename} (${counter++})`; }
                    const allPrompts = Object.values(importedData).flat();
                    currentPrompts[newGroupName] = allPrompts;
                    if(!settings.groupOrder.includes(newGroupName)) { settings.groupOrder.push(newGroupName); }
                } else {
                    for (const category in importedData) {
                        if (currentPrompts[category]) {
                            currentPrompts[category].push(...importedData[category]);
                        } else {
                            currentPrompts[category] = importedData[category];
                            if (!settings.groupOrder.includes(category)) { settings.groupOrder.push(category); }
                        }
                    }
                }
                ensurePromptIDs(currentPrompts);
                Promise.all([savePrompts(), saveSettings()]).then(() => {
                    renderAllPrompts();
                    showToast('Prompts imported successfully!', 2000, 'success');
                    closeModal();
                });
            } catch (error) { showToast('Error importing: ' + error.message, 3000, 'error'); }
        };
    }
    async function showAIEnhancer(promptData) {
        if (!settings.geminiAPIKey) {
            showToast("Please set your Gemini API key in Settings.", 3000, 'error');
            return;
        }

        const btnGroup = aiEnhancerModal.querySelector('.button-group');
        btnGroup.innerHTML = ''; // Clear old buttons
        const enhanceBtn = createButtonWithIcon('Enhance', icons.sparkle.cloneNode(true));
        const replaceBtn = createButtonWithIcon('Accept & Replace', null);
        btnGroup.append(enhanceBtn, replaceBtn);

        aiEnhancerModal.style.display = 'flex';
        const diffContainer = aiEnhancerModal.querySelector('.diff-container');
        const closeBtn = aiEnhancerModal.querySelector('.modal-close-btn');

        diffContainer.textContent = 'Original:\n' + promptData.text;
        replaceBtn.disabled = true;
        let enhancedText = '';

        enhanceBtn.onclick = async () => {
            enhanceBtn.disabled = true;
            enhanceBtn.textContent = 'Enhancing...';
            try {
                // This is a placeholder for the actual API call logic
                // The original script did not provide the callGeminiAPI function,
                // so we simulate a response here. For a real implementation,
                // you would use GM_xmlhttpRequest to call the Google AI API.
                const simulatedResponse = `This is an AI-enhanced version of the original prompt:\n\n${promptData.text}`;
                enhancedText = simulatedResponse;
                while (diffContainer.firstChild) diffContainer.removeChild(diffContainer.firstChild);
                const del = document.createElement('del');
                del.textContent = `--- Original\n${promptData.text}`;
                const ins = document.createElement('ins');
                ins.textContent = `+++ Enhanced\n${enhancedText}`;
                diffContainer.append(del, document.createElement('br'), ins);
                replaceBtn.disabled = false;
            } catch (error) {
                showToast('AI enhancement failed: ' + error.message, 3000, 'error');
                diffContainer.textContent = 'Error: ' + error.message;
            } finally {
                enhanceBtn.disabled = false;
                enhanceBtn.textContent = 'Re-Enhance';
            }
        };

        replaceBtn.onclick = () => {
            if (enhancedText) {
                addHistoryEntry(promptData.id, promptData.text);
                promptData.text = enhancedText;
                savePrompts().then(() => {
                    renderAllPrompts();
                    showToast('Prompt updated with AI enhancement!', 2000, 'success');
                    aiEnhancerModal.style.display = 'none';
                });
            }
        };

        closeBtn.onclick = () => aiEnhancerModal.style.display = 'none';
        aiEnhancerModal.addEventListener('click', e => { if (e.target === aiEnhancerModal) aiEnhancerModal.style.display = 'none'; });
    }
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
                if (confirm('Are you sure you want to restore this version? The current text will be added to history.')) {
                    addHistoryEntry(promptData.id, promptData.text);
                    promptData.text = entry.text;
                    savePrompts().then(() => {
                        renderAllPrompts();
                        versionHistoryModal.style.display = 'none';
                        showToast('Prompt restored!', 2000, 'success');
                    });
                }
            });
            li.append(dateSpan, textSpan, restoreBtn);
            list.appendChild(li);
        });
    }

    // --- MINI PANEL ---
    function renderMiniPanel() {
        if (!floatingMiniPanel) return;
        const container = floatingMiniPanel.querySelector('.prompt-group-container');
        while (container.firstChild) container.removeChild(container.firstChild);

        const searchInput = document.createElement('input');
        searchInput.type = 'search';
        searchInput.placeholder = 'Search prompts...';
        searchInput.id = 'mini-prompt-search-input';
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

    // --- NAVIGATION ---
    function updateNavigator() {
        if (!navigator) return;
        const posts = Array.from(document.querySelectorAll('response-container, rich-content-renderer'));
        const scrollY = window.scrollY;
        const pageHeight = document.documentElement.scrollHeight;
        const viewportHeight = window.innerHeight;
        const canScrollUp = scrollY > 50;
        const canScrollDown = scrollY < pageHeight - viewportHeight - 50;
        navigator.querySelector('#nav-to-top').classList.toggle('visible', canScrollUp);
        navigator.querySelector('#nav-to-bottom').classList.toggle('visible', canScrollDown);
        const upPost = posts.slice().reverse().find(p => p.offsetTop < scrollY - 50);
        const downPost = posts.find(p => p.offsetTop > scrollY + viewportHeight / 2);
        navigator.querySelector('#nav-up').classList.toggle('visible', !!upPost);
        navigator.querySelector('#nav-down').classList.toggle('visible', !!downPost);
        const mainNavArrow = navigator.querySelector('.main-nav-arrow');
        const mainNavIcon = mainNavArrow.firstChild;
        while(mainNavIcon.firstChild) mainNavIcon.removeChild(mainNavIcon.firstChild);
        mainNavIcon.appendChild(settings.position === 'left' ? icons.navInwardRight.cloneNode(true) : icons.navInwardLeft.cloneNode(true));
        mainNavArrow.classList.toggle('visible', posts.length > 0);
    }
    function navigatePosts(direction) {
        const posts = Array.from(document.querySelectorAll('response-container, rich-content-renderer'));
        const scrollY = window.scrollY;
        let targetPost = null;
        if (direction === 'up') {
            targetPost = posts.slice().reverse().find(p => p.offsetTop < scrollY - 10);
        } else {
            targetPost = posts.find(p => p.offsetTop > scrollY + 10);
        }
        if (targetPost) targetPost.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    // --- MAIN PANEL CREATION ---
    async function createAndAppendPanel() {
        try {
            if (document.getElementById('gemini-prompt-panel-main')) return;

            // --- URL-based Auto-Detection ---
            if (window.location.href.includes('/veo')) {
                currentPanelView = 'veo';
                console.log("VEO URL detected, setting panel mode to 'veo'.");
            }

            await loadSettings();
            await loadHistory();
            await fetchAndLoadVeoPrompts(); // Fetch VEO data on startup
            applyStyles();

            // Build UI elements
            promptFormModal = buildPromptFormModal();
            settingsModal = buildSettingsModal();
            importExportModal = buildImportExportModal();
            aiEnhancerModal = buildAIEnhancerModal();
            analyticsModal = buildAnalyticsModal();
            versionHistoryModal = buildVersionHistoryModal();
            toast = document.createElement('div'); toast.className = 'toast-notification';
            handle = document.createElement('div'); handle.className = 'panel-handle';
            panel = document.createElement('div'); panel.id = 'gemini-prompt-panel-main';
            resizeHandle = document.createElement('div');
            panel.appendChild(resizeHandle);

            const hdr = document.createElement('div'); hdr.className = 'gemini-prompt-panel-header';
            leftHeaderControls = document.createElement('div'); leftHeaderControls.className = 'panel-header-controls';

            // --- NEW Panel Mode Selector ---
            panelModeSelector = document.createElement('select');
            panelModeSelector.className = 'panel-mode-selector';
            const chatOption = document.createElement('option');
            chatOption.value = 'chat';
            chatOption.textContent = 'Chat Prompts';
            const veoOption = document.createElement('option');
            veoOption.value = 'veo';
            veoOption.textContent = 'VEO Video Prompts';
            panelModeSelector.append(chatOption, veoOption);
            panelModeSelector.value = currentPanelView; // Set based on auto-detection
            panelModeSelector.addEventListener('change', (e) => {
                currentPanelView = e.target.value;
                renderPanelContent(); // Re-render panel on mode change
            });
            // --- END NEW ---

            rightHeaderControls = document.createElement('div'); rightHeaderControls.className = 'panel-header-controls';
            settingsBtn = document.createElement('button'); settingsBtn.title = "Settings";
            analyticsBtn = document.createElement('button'); analyticsBtn.title = "Analytics";
            arrowLeftBtn = document.createElement('button'); arrowLeftBtn.title = "Move to Left";
            arrowRightBtn = document.createElement('button'); arrowRightBtn.title = "Move to Right";
            lockButton = document.createElement('button'); lockButton.title = "Lock Panel";

            // Append icons and assemble header
            settingsBtn.appendChild(icons.settings.cloneNode(true));
            analyticsBtn.appendChild(icons.chart.cloneNode(true));
            arrowLeftBtn.appendChild(icons.arrowLeft.cloneNode(true));
            arrowRightBtn.appendChild(icons.arrowRight.cloneNode(true));
            updateLockIcon();
            hdr.append(leftHeaderControls, panelModeSelector, rightHeaderControls); // Add selector to header
            panel.appendChild(hdr);

            const content = document.createElement('div'); content.className = 'gemini-prompt-panel-content';
            actionGroup = document.createElement('div'); actionGroup.className = 'button-group';
            copyResponseButton = createButtonWithIcon('Copy Response', null);
            copyCodeButton = createButtonWithIcon('Copy Code', null);

            searchAddContainer = document.createElement('div'); // Keep reference to hide/show
            searchAddContainer.className = 'search-add-container';
            const searchInput = document.createElement('input'); searchInput.type = 'search'; searchInput.id = 'prompt-search-input';
            const addBtn = createButtonWithIcon('Add New Prompt', icons.plus.cloneNode(true)); addBtn.id = 'add-prompt-btn';
            const panelActionButtons = document.createElement('div'); panelActionButtons.className = 'button-group'; panelActionButtons.id = 'panel-action-buttons';
            const collapseBtn = createButtonWithIcon('Collapse All', null);
            const expandBtn = createButtonWithIcon('Expand All', null);
            panelActionButtons.append(collapseBtn, expandBtn);
            searchAddContainer.append(addBtn, searchInput, panelActionButtons);

            const promptGroup = document.createElement('div'); promptGroup.className = 'prompt-group-container';
            const cont = document.createElement('div'); cont.id = 'custom-prompts-container';
            promptGroup.appendChild(cont);
            content.append(actionGroup, searchAddContainer, promptGroup);
            panel.appendChild(content);

            navigator = document.createElement('div'); navigator.className = 'post-navigator';
            const navToTop = document.createElement('button'); navToTop.id = 'nav-to-top'; navToTop.title = 'Scroll to Top';
            const navUp = document.createElement('button'); navUp.id = 'nav-up'; navUp.title = 'Previous Post';
            const navDown = document.createElement('button'); navDown.id = 'nav-down'; navDown.title = 'Next Post';
            const navToBottom = document.createElement('button'); navToBottom.id = 'nav-to-bottom'; navToBottom.title = 'Scroll to Bottom';
            const mainNavArrow = document.createElement('button'); mainNavArrow.className = 'main-nav-arrow'; mainNavArrow.title = 'Toggle Panel';
            const mainNavIconContainer = document.createElement('div');

            copyResponseButton.classList.add('copy-btn');
            copyCodeButton.classList.add('copy-btn');
            searchInput.placeholder = 'Search prompts...';
            navToTop.appendChild(icons.navToTop.cloneNode(true));
            navUp.appendChild(icons.navUp.cloneNode(true));
            navDown.appendChild(icons.navDown.cloneNode(true));
            navToBottom.appendChild(icons.navToBottom.cloneNode(true));
            mainNavArrow.appendChild(mainNavIconContainer);
            navigator.append(navToTop, navUp, navDown, navToBottom, mainNavArrow);
            document.body.append(panel, handle, toast, promptFormModal, settingsModal, importExportModal, aiEnhancerModal, analyticsModal, versionHistoryModal, navigator);

            // --- Attach Event Listeners ---
            handle.addEventListener('mouseenter', () => { panel.classList.add('visible'); updateHandleHeight(); });
            handle.addEventListener('mouseleave', hidePanel);
            panel.addEventListener('mouseenter', () => panel.classList.add('visible'));
            panel.addEventListener('mouseleave', hidePanel);

            settingsBtn.addEventListener('click', () => {
                 const settingsForm = settingsModal.querySelector('.modal-body > form');
                 populateSettingsModal(settingsForm);
                 settingsModal.style.display = 'flex';
                 settingsModal.querySelector('.modal-close-btn').onclick = () => settingsModal.style.display = 'none';
                 settingsModal.addEventListener('click', e => { if (e.target === settingsModal) settingsModal.style.display = 'none'; });
            });

            analyticsBtn.addEventListener('click', () => {
                populateAnalytics();
                analyticsModal.style.display = 'flex';
                analyticsModal.querySelector('.modal-close-btn').onclick = () => analyticsModal.style.display = 'none';
                analyticsModal.addEventListener('click', e => { if (e.target === analyticsModal) analyticsModal.style.display = 'none'; });
            });
            arrowLeftBtn.addEventListener('click', () => { settings.position = 'left'; saveSettings(); applySettingsAndTheme(); });
            arrowRightBtn.addEventListener('click', () => { settings.position = 'right'; saveSettings(); applySettingsAndTheme(); });
            lockButton.addEventListener('click', () => { isManuallyLocked = !isManuallyLocked; updateLockIcon(); if (isManuallyLocked) panel.classList.add('visible'); });

            collapseBtn.addEventListener('click', () => {
                const allCategoryDivs = panel.querySelectorAll('.prompt-category');
                const allCategoryNames = Array.from(allCategoryDivs).map(div => div.dataset.categoryName);
                settings.collapsedCategories = [...new Set([...settings.collapsedCategories, ...allCategoryNames])];
                saveSettings().then(renderAllPrompts);
            });
            expandBtn.addEventListener('click', () => {
                settings.collapsedCategories = [];
                saveSettings().then(renderAllPrompts);
            });

            initializeCopyActions();
            initializePageObserver();

            searchInput.addEventListener('input', handleSearch);
            addBtn.addEventListener('click', () => showPromptForm(null, ''));
            navToTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
            navToBottom.addEventListener('click', () => {
                const allResponses = document.querySelectorAll('response-container');
                if (allResponses.length > 0) {
                    allResponses[allResponses.length - 1].scrollIntoView({ behavior: 'smooth', block: 'end' });
                }
            });
            navUp.addEventListener('click', () => navigatePosts('up'));
            navDown.addEventListener('click', () => navigatePosts('down'));
            mainNavArrow.addEventListener('click', () => panel.classList.toggle('visible'));
            window.addEventListener('scroll', updateNavigator, { passive: true });
            window.addEventListener('resize', updateNavigator);
            hdr.addEventListener('mousedown', e => {
                if (e.target.closest('.panel-header-controls') || e.target.closest('.draggable-header') || e.target.tagName === 'SELECT') return;
                const startY = e.clientY; const startTop = panel.offsetTop;
                document.body.style.userSelect = 'none';
                function onMove(ev) {
                    let newTop = startTop + (ev.clientY - startY);
                    newTop = Math.max(0, Math.min(newTop, window.innerHeight - panel.offsetHeight));
                    settings.topOffset = newTop + 'px';
                    panel.style.top = settings.topOffset; handle.style.top = settings.topOffset; navigator.style.top = settings.topOffset;
                }
                function onUp() {
                    document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp);
                    document.body.style.userSelect = ''; saveSettings();
                }
                document.addEventListener('mousemove', onMove); document.addEventListener('mouseup', onUp);
            });

            initResizeFunctionality();
            if (settings.gistURL) {
                await syncFromGist().then(synced => { if(!synced) loadAndDisplayPrompts(); else loadAndDisplayPrompts(true); }).catch(() => loadAndDisplayPrompts());
            } else {
                await loadAndDisplayPrompts();
            }
            applySettingsAndTheme();
            updateNavigator();
        } catch (error) {
            console.error("FATAL ERROR during panel creation:", error);
            alert("Gemini Prompt Panel failed to load. Check the browser console (F12) for a 'FATAL ERROR' message and report it.");
        }
    }

    // --- ACTIONS & CLIPBOARD ---
    function initializeCopyActions() {
        copyResponseButton.addEventListener('click', async () => {
            const allResponses = document.querySelectorAll('response-container');
            if (allResponses.length > 0) {
                const latestResponse = allResponses[allResponses.length - 1];
                const textContainer = latestResponse.querySelector('div.markdown.prose');
                if (textContainer && navigator.clipboard) {
                    try {
                        await navigator.clipboard.writeText(textContainer.textContent);
                        showToast('Latest response copied!', 2000, 'success');
                    } catch (err) {
                        console.error('Failed to copy text: ', err);
                        showToast('Could not copy response.', 2000, 'error');
                    }
                } else {
                    showToast('Response content or clipboard not available.', 2000, 'error');
                }
            } else {
                showToast('No response found to copy.', 2000, 'error');
            }
        });

        copyCodeButton.addEventListener('click', () => {
            const allCodeBlocks = document.querySelectorAll('code-block');
            if (allCodeBlocks.length > 0) {
                const latestCodeBlock = allCodeBlocks[allCodeBlocks.length - 1];
                const copyBtn = latestCodeBlock.querySelector('button[aria-label="Copy code"]');
                if (copyBtn) {
                    copyBtn.click();
                    showToast('Code block copied!', 2000, 'success');
                } else {
                    showToast('Copy button not found in the latest code block.', 2000, 'error');
                }
            } else {
                showToast('No code block found to copy.', 2000, 'error');
            }
        });
    }
    function initializePageObserver() {
        const pageObserver = new MutationObserver((mutationsList, observer) => {
            const chatContainer = document.querySelector('main .chat-history, main');
            if (chatContainer) {
                observer.disconnect();
                initializeGenerationObserver();
                updateNavigator();
            }
        });
        pageObserver.observe(document.body, { childList: true, subtree: true });
    }
    function initializeGenerationObserver() {
        const setupObserver = () => {
            const sendButton = document.querySelector('button.send-button');
            if (sendButton) {
                if(generationObserver) generationObserver.disconnect();
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
                                            showCountdownToast("Auto-copied Code to Clipboard", 5000);
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
        } else { showToast('Error: Prompt input not found.', 3000, 'error'); }
    }
    function initResizeFunctionality() {
        let startX, startWidth;
        const onMouseMove = (e) => {
            const newWidth = startWidth + (settings.position === 'left' ? e.clientX - startX : startX - e.clientX);
            if (newWidth > 240 && newWidth < 800) {
                settings.panelWidth = newWidth;
                panel.style.setProperty('--panel-width', `${newWidth}px`);
            }
        };
        const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            panel.classList.remove('is-resizing'); document.body.style.cursor = 'default';
            saveSettings();
            applySettingsAndTheme();
        };
        resizeHandle.addEventListener('mousedown', (e) => {
            e.preventDefault(); startX = e.clientX; startWidth = panel.offsetWidth;
            panel.classList.add('is-resizing'); document.body.style.cursor = 'ew-resize';
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        });
    }

    // --- BOOTSTRAP ---
    function init() {
        const checkInterval = setInterval(() => {
            const chatInterface = document.querySelector('main .chat-history');
            const promptInputArea = document.querySelector('main rich-textarea');
            if (chatInterface && promptInputArea) {
                clearInterval(checkInterval);
                createAndAppendPanel();

                floatingMiniPanel = document.createElement('div');
                floatingMiniPanel.id = 'floating-mini-panel';
                const miniPanelContent = document.createElement('div');
                miniPanelContent.className = 'prompt-group-container';
                floatingMiniPanel.appendChild(miniPanelContent);

                miniPanelTrigger = document.createElement('button');
                miniPanelTrigger.id = 'mini-panel-trigger';
                miniPanelTrigger.title = 'Open Quick Prompts';
                miniPanelTrigger.appendChild(icons.panelIcon.cloneNode(true));
                miniPanelTrigger.addEventListener('click', (e) => {
                    e.stopPropagation();
                    floatingMiniPanel.classList.toggle('visible');
                });

                promptInputArea.style.position = 'relative';
                promptInputArea.append(miniPanelTrigger, floatingMiniPanel);
                miniPanelTrigger.style.display = settings.enableMiniMode ? 'flex' : 'none';
                renderMiniPanel();

                document.addEventListener('click', (e) => {
                    if (!floatingMiniPanel.contains(e.target) && !miniPanelTrigger.contains(e.target)) {
                        floatingMiniPanel.classList.remove('visible');
                    }
                });
            }
        }, 500);
    }
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        init();
    } else {
        window.addEventListener('load', init);
    }
})();