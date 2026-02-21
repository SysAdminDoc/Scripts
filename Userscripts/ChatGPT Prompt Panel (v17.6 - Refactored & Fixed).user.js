// ==UserScript==
// @name         ChatGPT Prompt Panel (v17.6 - Refactored & Fixed)
// @namespace    http://tampermonkey.net/
// @version      17.6
// @description  The ultimate, fully-featured panel, refactored for TrustedHTML compliance, with a draggable resize handle, scalable chat width, and extensive customization.
// @author       You
// @match        https://chat.openai.com/*
// @match        https://chatgpt.com/*
// @run-at       document-idle
// @grant        GM_addStyle
// @grant        GM_setValue
// @grant        GM_getValue
// ==/UserScript==

(function() {
    'use strict';

    console.log('ChatGPT Prompt Panel v17.6 loaded');

    // --- CONFIG & KEYS ---
    const DEFAULT_PROMPTS = [
        { id: `prompt-${Date.now()}-1`, name: 'Explain Code', text: 'Explain this code line by line:', autoSend: false },
        { id: `prompt-${Date.now()}-2`, name: 'Refactor Code', text: 'Refactor this code for readability and performance:', autoSend: false }
    ];
    const GM_PROMPTS_KEY = 'chatgpt_custom_prompts_v3';
    const GM_SETTINGS_KEY = 'chatgpt_panel_settings_v9';
    const WIDE_CSS_ID = 'chatgpt-wide-mode-style';

    // --- ICONS ---
    function makeIcon(svgPath, size = 18) {
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
        plus: makeIcon('M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z'),
        unlocked: makeIcon('M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z'),
        locked: makeIcon('M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6h2V6c0-1.65 1.35-3 3-3s3 1.35 3 3v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2z'),
        settings: makeIcon('M19.43 12.98c.04-.32.07-.64.07-.98s-.03-.66-.07-.98l2.11-1.65c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.3-.61-.22l-2.49 1c-.52-.4-1.08-.73-1.69-.98l-.38-2.65C14.46 2.18 14.25 2 14 2h-4c-.25 0-.46.18-.49-.42l-.38 2.65c-.61-.25-1.17-.59-1.69-.98l-2.49-1c-.23-.09-.49 0-.61-.22l-2 3.46c-.13.22-.07.49.12.64l2.11 1.65c-.04.32-.07.65-.07.98s.03.66.07.98l-2.11 1.65c-.19-.15-.24.42-.12-.64l2 3.46c.12.22.39.3.61-.22l2.49-1c.52.4 1.08.73 1.69-.98l.38 2.65c.03.24.24.42.49.42h4c.25 0 .46-.18.49-.42l.38-2.65c.61-.25 1.17-.59-1.69-.98l2.49 1c.23.09.49 0 .61-.22l2-3.46c.12-.22-.07-.49-.12-.64l-2.11-1.65zM12 15.5c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5z'),
        trash: makeIcon('M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z'),
        edit: makeIcon('M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a.9959.9959 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z'),
        arrowLeft: makeIcon('M15.41 16.59L10.83 12l4.58-4.59L14 6l-6 6 6 6 1.41-1.41z'),
        arrowRight: makeIcon('M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z')
    };

    // --- CSS ---
    GM_addStyle(`
        /* --- Themes --- */
        :root { /* Dark Theme (Default) */
            --panel-bg: #2a2a2e; --panel-text: #e0e0e0; --panel-header-bg: #3a3a3e; --panel-border: #4a4a4e;
            --input-bg: #4a4a4e; --input-text: #f0f0f0; --input-border: #5a5a5e;
            --btn-green-grad-start: #28a745; --btn-green-grad-end: #218838; --btn-green-border: #1e7e34;
            --btn-purple-grad-start: #8A2BE2; --btn-purple-grad-end: #7b25c9; --btn-purple-border: #6a20b0;
            --btn-add-grad-start: #17a2b8; --btn-add-grad-end: #138496; --btn-add-border: #117a8b;
        }
        .theme-light {
            --panel-bg: #f0f2f5; --panel-text: #202124; --panel-header-bg: #e0e2e5; --panel-border: #d0d2d5;
            --input-bg: #fff; --input-text: #202124; --input-border: #dadce0;
        }
        .theme-darker {
            --panel-bg: #1e1e1e; --panel-text: #f0f0f0; --panel-header-bg: #282828; --panel-border: #383838;
            --input-bg: #333; --input-text: #f0f0f0; --input-border: #484848;
        }
        .theme-glass {
            --panel-bg: rgba(30, 30, 30, 0.7); --panel-text: #f5f5f5; --panel-header-bg: rgba(40, 40, 40, 0.8); --panel-border: rgba(255, 255, 255, 0.2);
            --input-bg: rgba(0, 0, 0, 0.3); --input-text: #f5f5f5; --input-border: rgba(255, 255, 255, 0.3);
            backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
        }

        /* --- Panel & Handle --- */
        .chatgpt-prompt-panel { position: fixed; top: var(--panel-top, 90px); z-index: 9999; background: var(--panel-bg); color: var(--panel-text); border: 1px solid var(--panel-border); border-radius: 10px; box-shadow: 0 8px 25px rgba(0,0,0,0.4); display: flex; flex-direction: column; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; transition: transform 0.35s cubic-bezier(0.4, 0, 0.2, 1); user-select: none; width: var(--panel-width, 260px); box-sizing: border-box; }
        .chatgpt-prompt-panel.left-side { left: 0; transform: translateX(-100%); }
        .chatgpt-prompt-panel.right-side{ right:0; transform: translateX(100%); }
        .chatgpt-prompt-panel.visible { transform: translateX(0); }
        .panel-handle { position: fixed; top: var(--panel-top, 90px); width: var(--handle-width, 8px); /* height is set dynamically by JS */ background: linear-gradient(90deg, rgba(255,255,255,0.05), rgba(255,255,255,0.15)); cursor: pointer; z-index: 9998; transition: all 0.2s; border-radius: 0 5px 5px 0; box-shadow: inset -1px 0 0 rgba(255,255,255,0.1); }
        .panel-handle::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 3px; background: #28a745; border-radius: 0 2px 2px 0; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
        .panel-handle:hover::before { background: #34c759; width: 100%; }
        .panel-handle.right-side-handle { right: 0; left: auto; transform: scaleX(-1); }
        .chatgpt-resize-handle { position: absolute; top: 0; bottom: 0; width: 6px; cursor: ew-resize; z-index: 10; }
        .chatgpt-resize-handle.left-handle { left: 0; }
        .chatgpt-resize-handle.right-handle { right: 0; }

        /* --- Header & Controls --- */
        .chatgpt-prompt-panel-header { display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: var(--panel-header-bg); cursor: grab; font-size: 14px; font-weight: bold; position: relative; border-bottom: 1px solid var(--panel-border); }
        .panel-title { position: absolute; left: 50%; transform: translateX(-50%); pointer-events: none; }
        .panel-header-controls { display:flex; gap:2px; align-items: center; }
        .panel-header-controls button { background: transparent; border: none; color: var(--panel-text); cursor: pointer; padding: 4px; border-radius: 50%; display: flex; align-items: center; justify-content: center; transition: background-color 0.2s; }
        .panel-header-controls button:hover { background-color: rgba(255,255,255,0.1); }

        /* --- Content & Buttons --- */
        .chatgpt-prompt-panel-content { padding:12px; display:flex; flex-direction:column; gap:10px; }
        .button-group { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
        .chatgpt-prompt-panel-button { border: 1px solid; color: white; padding: 8px 12px; border-radius: 6px; display: flex; align-items: center; justify-content: center; gap: 8px; font-size: 13px; font-weight: 500; cursor: pointer; transition: all .2s; box-shadow: 0 2px 5px rgba(0,0,0,0.2); text-shadow: 1px 1px 1px rgba(0,0,0,0.2); }
        .chatgpt-prompt-panel-button:hover { filter: brightness(1.1); transform: translateY(-1px); box-shadow: 0 4px 8px rgba(0,0,0,0.25); }
        .chatgpt-prompt-panel-button:active { transform: translateY(1px); filter: brightness(0.95); box-shadow: 0 1px 2px rgba(0,0,0,0.2); }
        #new-chat-btn { background: linear-gradient(to bottom, var(--btn-purple-grad-start), var(--btn-purple-grad-end)); border-color: var(--btn-purple-border); grid-column: 1 / -1; }
        .copy-btn { background: linear-gradient(to bottom, var(--btn-green-grad-start), var(--btn-green-grad-end)); border-color: var(--btn-green-border); }
        #add-prompt-btn { background: linear-gradient(to bottom, var(--btn-add-grad-start), var(--btn-add-grad-end)); border-color: var(--btn-add-border); }
        .prompt-group-container { border: 1px solid var(--panel-border); border-radius: 6px; padding: 10px; display: flex; flex-direction: column; gap: 8px; }
        .prompt-button { position:relative; background: linear-gradient(to bottom, var(--btn-green-grad-start), var(--btn-green-grad-end)); border-color: var(--btn-green-border); }
        .prompt-button .prompt-button-name { flex-grow: 1; text-align: left; }
        .prompt-button-controls { display: none; position: absolute; right: 4px; top: 50%; transform: translateY(-50%); gap: 4px; background: rgba(0,0,0,0.2); border-radius: 12px; padding: 2px; }
        .prompt-button:hover .prompt-button-controls { display: flex; }
        .prompt-button-controls button { background: transparent; border: none; cursor: pointer; padding: 3px; border-radius: 50%; display:flex; align-items:center; }
        .prompt-button-controls button:hover { background: rgba(255,255,255,0.2); }
        #custom-prompts-container { display:flex; flex-direction:column; gap:8px; max-height: 250px; overflow-y: auto; padding-right: 5px; }
        .dragging { opacity:0.4; }

        /* --- Modals, Settings & Toast --- */
        .modal-overlay { display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.6); z-index:10000; justify-content:center; align-items:center; }
        .modal-content { background: var(--panel-bg); color:var(--panel-text); padding:20px; border-radius:8px; width: 90%; max-width:450px; box-shadow:0 5px 25px rgba(0,0,0,0.4); position:relative; }
        .modal-close-btn { position:absolute; top:10px; right:10px; background:none; border:none; font-size:24px; cursor:pointer; color:var(--panel-text); }
        .form-section, .settings-section { margin-top:20px; }
        .form-section > label, .settings-section > label { display:block; margin-bottom:8px; font-weight:bold }
        .form-section input[type="text"], .form-section textarea { width: 100%; background: var(--input-bg); color: var(--input-text); border: 1px solid var(--input-border); border-radius: 4px; padding: 8px; font-size: 14px; box-sizing: border-box; }
        .settings-slider-group { display: flex; align-items: center; gap: 10px; }
        .settings-slider-group input[type="range"] { flex-grow: 1; }
        .settings-slider-group span { min-width: 40px; text-align: right; font-size: 12px; }
        .radio-group { display: flex; gap: 10px; flex-wrap: wrap; }
        .radio-group input[type="radio"] { display: none; }
        .radio-group label { background: #555; color: #fff; padding: 5px 10px; border-radius: 5px; cursor: pointer; transition: all 0.2s; }
        .radio-group input[type="radio"]:checked + label { background: #28a745; font-weight: bold; }
        .toggle-switch { position: relative; display: inline-block; width: 44px; height: 24px; }
        .toggle-switch input { opacity: 0; width: 0; height: 0; }
        .toggle-slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #ccc; transition: .4s; border-radius: 24px; }
        .toggle-slider:before { position: absolute; content: ""; height: 18px; width: 18px; left: 3px; bottom: 3px; background-color: white; transition: .4s; border-radius: 50%; }
        input:checked + .toggle-slider { background-color: #4CAF50; }
        input:checked + .toggle-slider:before { transform: translateX(20px); }
        .toast-notification { position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); background-color: #28a745; color: #fff; padding: 10px 20px; border-radius: 5px; z-index: 10001; opacity: 0; transition: opacity 0.5s, bottom 0.5s; font-size: 14px; box-shadow: 0 3px 10px rgba(0,0,0,0.2); }
        .toast-notification.show { bottom: 30px; opacity: 1; }
    `);

    // --- STATE & SETTINGS ---
    let panel, handle, settingsModal, promptFormModal, toast, resizeHandle;
    let leftHeaderControls, rightHeaderControls; // Containers for header buttons
    let settingsBtn, lockButton, arrowLeftBtn, arrowRightBtn; // Button elements
    let currentPrompts = [], isManuallyLocked = false, isFormActiveLock = false;
    let draggedItem = null;
    let settings = {};

    const defaultSettings = {
        theme: 'dark',
        position: 'left',
        topOffset: '90px',
        chatWidth: 90, // Replaces wideMode
        panelWidth: 260,
        handleWidth: 8
    };

    // --- CORE HELPERS ---
    function showToast(message) { toast.textContent = message; toast.classList.add('show'); setTimeout(() => toast.classList.remove('show'), 2000); }
    function hidePanel() { if (!isManuallyLocked && !isFormActiveLock && !panel.classList.contains('is-resizing')) panel.classList.remove('visible'); }
    function updateLockIcon() {
        if(lockButton) {
            // SAFE DOM CLEAR: Avoids TrustedHTML errors
            while (lockButton.firstChild) {
                lockButton.removeChild(lockButton.firstChild);
            }
            lockButton.appendChild((isManuallyLocked || isFormActiveLock) ? icons.locked.cloneNode(true) : icons.unlocked.cloneNode(true));
        }
    }
    function createButtonWithIcon(txt, ic) { const b = document.createElement('button'); b.className = 'chatgpt-prompt-panel-button'; if (ic) b.appendChild(ic.cloneNode(true)); b.appendChild(document.createTextNode(txt)); return b; }
    async function loadSettings() { settings = await GM_getValue(GM_SETTINGS_KEY, defaultSettings); settings = { ...defaultSettings, ...settings }; }
    async function saveSettings() { await GM_setValue(GM_SETTINGS_KEY, settings); }

    async function applySettings() {
        if (!panel) return;
        const wasLockedAndVisible = panel.classList.contains('visible') && isManuallyLocked;
        panel.className = 'chatgpt-prompt-panel'; // Reset classes
        panel.classList.add(`theme-${settings.theme}`);
        if(wasLockedAndVisible) panel.classList.add('visible');

        const p = settings.position;
        panel.classList.add(p === 'left' ? 'left-side' : 'right-side');
        handle.classList.toggle('right-side-handle', p === 'right');
        resizeHandle.classList.toggle('left-handle', p === 'right');
        resizeHandle.classList.toggle('right-handle', p === 'left');
        panel.style.setProperty('--panel-width', `${settings.panelWidth}px`);
        handle.style.width = `${settings.handleWidth}px`;
        panel.style.setProperty('--panel-top', settings.topOffset);
        handle.style.top = settings.topOffset;
        applyChatWidth(settings.chatWidth);
        updateHeaderLayout();
        updateHandleHeight();
    }

    function updateHeaderLayout() {
        if (!leftHeaderControls || !rightHeaderControls) return;
        // Clear current controls
        leftHeaderControls.innerHTML = '';
        rightHeaderControls.innerHTML = '';

        if (settings.position === 'left') {
            // Left side (inside)
            leftHeaderControls.appendChild(settingsBtn);
            // Right side (outside)
            rightHeaderControls.appendChild(lockButton);
            rightHeaderControls.appendChild(arrowRightBtn);
        } else { // right
            // Left side (outside)
            leftHeaderControls.appendChild(arrowLeftBtn);
            leftHeaderControls.appendChild(lockButton);
            // Right side (inside)
            rightHeaderControls.appendChild(settingsBtn);
        }
    }

    function updateHandleHeight() {
        if (!panel || !handle) return;
        setTimeout(() => {
            const panelHeight = panel.offsetHeight;
            if (panelHeight > 0) {
                handle.style.height = `${panelHeight}px`;
            }
        }, 100);
    }

    function applyChatWidth(widthPercent) {
        let styleTag = document.getElementById(WIDE_CSS_ID);
        if (!styleTag) {
            styleTag = document.createElement('style');
            styleTag.id = WIDE_CSS_ID;
            document.head.appendChild(styleTag);
        }
        styleTag.textContent = `
            @container (min-width: 768px) {
                article .\\@\\[64rem\\]\\:\\[--thread-content-max-width\\:48rem\\],
                #thread-bottom-container .\\@\\[64rem\\]\\:\\[--thread-content-max-width\\:48rem\\] {
                    max-width: ${widthPercent}% !important;
                }
            }
        `;
    }

    // --- PROMPT MGMT ---
    function savePrompts() { GM_setValue(GM_PROMPTS_KEY, JSON.stringify(currentPrompts)); }
    async function loadAndDisplayPrompts() {
        try { const raw = await GM_getValue(GM_PROMPTS_KEY); currentPrompts = JSON.parse(raw) || [...DEFAULT_PROMPTS]; }
        catch { currentPrompts = [...DEFAULT_PROMPTS]; }
        if (!currentPrompts.every(p => p.id)) { // Backwards compatibility for prompts without IDs
            currentPrompts.forEach((p, i) => p.id = p.id || `prompt-${Date.now()}-${i}`);
            savePrompts();
        }
        renderAllPrompts();
    }
    function renderAllPrompts() {
        const cont = panel.querySelector('#custom-prompts-container');
        cont.innerHTML = '';
        currentPrompts.forEach(p => addPromptButtonToPanel(p));
        updateHandleHeight();
    }
    function addPromptButtonToPanel(promptData) {
        const btn = createButtonWithIcon('', null);
        btn.classList.add('prompt-button');
        btn.title = promptData.text;
        btn.dataset.promptId = promptData.id;

        const nameSpan = document.createElement('span');
        nameSpan.className = 'prompt-button-name';
        nameSpan.textContent = promptData.name;
        btn.appendChild(nameSpan);

        const controls = document.createElement('div');
        controls.className = 'prompt-button-controls';
        const editBtn = document.createElement('button');
        editBtn.title = 'Edit Prompt';
        editBtn.appendChild(icons.edit.cloneNode(true));
        editBtn.addEventListener('click', (e) => { e.stopPropagation(); showPromptForm(promptData); });
        const deleteBtn = document.createElement('button');
        deleteBtn.title = 'Delete Prompt';
        deleteBtn.appendChild(icons.trash.cloneNode(true));
        deleteBtn.addEventListener('click', (e) => { e.stopPropagation(); if (confirm(`Delete "${promptData.name}"?`)) { currentPrompts = currentPrompts.filter(p => p.id !== promptData.id); savePrompts(); renderAllPrompts(); showToast('Prompt deleted.'); } });
        controls.append(editBtn, deleteBtn);
        btn.appendChild(controls);

        btn.draggable = true;
        btn.addEventListener('dragstart', e => { draggedItem = promptData.id; e.target.classList.add('dragging'); });
        btn.addEventListener('dragend', e => e.target.classList.remove('dragging'));
        btn.addEventListener('click', () => { sendPromptToChatGPT(promptData.text, promptData.autoSend); if (!isManuallyLocked) hidePanel(); });
        panel.querySelector('#custom-prompts-container').appendChild(btn);
    }

    // --- MODAL BUILDERS (Refactored for TrustedHTML safety) ---
    function buildSettingsModal() {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';

        const content = document.createElement('div');
        content.className = 'modal-content';

        const closeBtn = document.createElement('button');
        closeBtn.className = 'modal-close-btn';
        closeBtn.textContent = '×';
        content.appendChild(closeBtn);

        const title = document.createElement('h3');
        title.textContent = 'Panel Settings';
        content.appendChild(title);

        // Helper to create sections
        function createSection(label, children) {
            const section = document.createElement('div');
            section.className = 'settings-section';
            const labelEl = document.createElement('label');
            labelEl.textContent = label;
            section.appendChild(labelEl);
            children.forEach(child => section.appendChild(child));
            return section;
        }

        // Theme Section
        const themeSelector = document.createElement('div');
        themeSelector.className = 'radio-group';
        themeSelector.id = 'theme-selector';
        ['light', 'dark', 'darker', 'glass'].forEach(theme => {
            const input = document.createElement('input');
            input.type = 'radio'; input.id = `theme-${theme}`; input.name = 'theme'; input.value = theme;
            const label = document.createElement('label');
            label.htmlFor = `theme-${theme}`; label.textContent = theme.charAt(0).toUpperCase() + theme.slice(1);
            themeSelector.append(input, label);
        });
        content.appendChild(createSection('Theme', [themeSelector]));

        // Chat Width Section
        const chatWidthSliderGroup = document.createElement('div');
        chatWidthSliderGroup.className = 'settings-slider-group';
        const chatWidthSlider = document.createElement('input');
        chatWidthSlider.type = 'range'; chatWidthSlider.id = 'chat-width-slider'; chatWidthSlider.min = 50; chatWidthSlider.max = 100; chatWidthSlider.step = 1;
        const chatWidthValue = document.createElement('span');
        chatWidthValue.id = 'chat-width-value';
        chatWidthSliderGroup.append(chatWidthSlider, chatWidthValue);
        content.appendChild(createSection('Chat Width', [chatWidthSliderGroup]));

        // Panel Width Section
        const panelWidthSliderGroup = document.createElement('div');
        panelWidthSliderGroup.className = 'settings-slider-group';
        const panelWidthSlider = document.createElement('input');
        panelWidthSlider.type = 'range'; panelWidthSlider.id = 'panel-width-slider'; panelWidthSlider.min = 220; panelWidthSlider.max = 600; panelWidthSlider.step = 10;
        const panelWidthValue = document.createElement('span');
        panelWidthValue.id = 'panel-width-value';
        panelWidthSliderGroup.append(panelWidthSlider, panelWidthValue);
        content.appendChild(createSection('Panel Width', [panelWidthSliderGroup]));

        // Handle Width Section
        const handleWidthSliderGroup = document.createElement('div');
        handleWidthSliderGroup.className = 'settings-slider-group';
        const handleWidthSlider = document.createElement('input');
        handleWidthSlider.type = 'range'; handleWidthSlider.id = 'handle-width-slider'; handleWidthSlider.min = 4; handleWidthSlider.max = 20; handleWidthSlider.step = 1;
        const handleWidthValue = document.createElement('span');
        handleWidthValue.id = 'handle-width-value';
        handleWidthSliderGroup.append(handleWidthSlider, handleWidthValue);
        content.appendChild(createSection('Handle Width', [handleWidthSliderGroup]));

        // Prompt Management Section
        const mgmtGroup = document.createElement('div');
        mgmtGroup.className = 'button-group';
        mgmtGroup.id = 'mgmt-control';
        const importBtn = document.createElement('button');
        importBtn.id = 'import-btn'; importBtn.textContent = 'Import';
        const exportBtn = document.createElement('button');
        exportBtn.id = 'export-btn'; exportBtn.textContent = 'Export';
        const resetBtn = document.createElement('button');
        resetBtn.id = 'reset-btn'; resetBtn.textContent = 'Reset to Defaults'; resetBtn.style.gridColumn = '1 / -1';
        mgmtGroup.append(importBtn, exportBtn, resetBtn);
        content.appendChild(createSection('Prompt Management', [mgmtGroup]));

        overlay.appendChild(content);

        const closeModal = () => overlay.style.display = 'none';
        closeBtn.addEventListener('click', closeModal);
        overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });

        // Listeners
        themeSelector.addEventListener('change', e => { settings.theme = e.target.value; applySettings(); saveSettings(); });
        chatWidthSlider.addEventListener('input', e => { settings.chatWidth = e.target.value; chatWidthValue.textContent = `${settings.chatWidth}%`; applyChatWidth(settings.chatWidth); });
        chatWidthSlider.addEventListener('mouseup', () => saveSettings());
        ['panel-width', 'handle-width'].forEach(type => {
            const slider = overlay.querySelector(`#${type}-slider`);
            const valueLabel = overlay.querySelector(`#${type}-value`);
            const key = type.replace(/-(\w)/g, (_, c) => c.toUpperCase());
            slider.addEventListener('input', e => {
                const value = e.target.value;
                settings[key] = value;
                valueLabel.textContent = `${value}px`;
                if (type === 'panel-width') panel.style.setProperty('--panel-width', `${value}px`);
                else handle.style.width = `${value}px`;
                updateHandleHeight();
            });
            slider.addEventListener('mousedown', () => panel.classList.add('is-resizing', 'visible'));
            slider.addEventListener('mouseup', () => { panel.classList.remove('is-resizing'); hidePanel(); saveSettings(); });
        });
        importBtn.addEventListener('click', importPrompts);
        exportBtn.addEventListener('click', exportPrompts);
        resetBtn.addEventListener('click', resetPrompts);

        return overlay;
    }

    function buildPromptFormModal() {
        const overlay = document.createElement('div');
        overlay.id = 'prompt-form-modal';
        overlay.className = 'modal-overlay';

        const content = document.createElement('div');
        content.className = 'modal-content';

        const closeBtn = document.createElement('button');
        closeBtn.className = 'modal-close-btn';
        closeBtn.textContent = '×';
        content.appendChild(closeBtn);

        const title = document.createElement('h3');
        title.textContent = 'Create New Prompt';
        content.appendChild(title);

        const hiddenInput = document.createElement('input');
        hiddenInput.type = 'hidden'; hiddenInput.id = 'prompt-id-input';
        content.appendChild(hiddenInput);

        // Form sections
        function createFormSection(label, inputElement) {
            const section = document.createElement('div');
            section.className = 'form-section';
            const labelEl = document.createElement('label');
            labelEl.htmlFor = inputElement.id;
            labelEl.textContent = label;
            section.append(labelEl, inputElement);
            return section;
        }

        const nameInput = document.createElement('input');
        nameInput.type = 'text'; nameInput.id = 'prompt-name-input'; nameInput.placeholder = 'e.g., Explain Simply';
        content.appendChild(createFormSection('Button Name', nameInput));

        const textInput = document.createElement('textarea');
        textInput.id = 'prompt-text-input'; textInput.rows = 6; textInput.placeholder = 'Your prompt text here.';
        content.appendChild(createFormSection('Prompt Text', textInput));

        const autoSendSection = document.createElement('div');
        autoSendSection.className = 'form-section';
        autoSendSection.style.display = 'flex'; autoSendSection.style.alignItems = 'center'; autoSendSection.style.justifyContent = 'space-between';
        const autoSendLabel = document.createElement('label');
        autoSendLabel.htmlFor = 'prompt-autosend-input'; autoSendLabel.textContent = 'Auto-send on click'; autoSendLabel.style.marginBottom = '0';
        const autoSendSwitch = document.createElement('label');
        autoSendSwitch.className = 'toggle-switch';
        const autoSendInput = document.createElement('input');
        autoSendInput.type = 'checkbox'; autoSendInput.id = 'prompt-autosend-input';
        const autoSendSlider = document.createElement('span');
        autoSendSlider.className = 'toggle-slider';
        autoSendSwitch.append(autoSendInput, autoSendSlider);
        autoSendSection.append(autoSendLabel, autoSendSwitch);
        content.appendChild(autoSendSection);

        const buttonSection = document.createElement('div');
        buttonSection.className = 'form-section';
        buttonSection.style.textAlign = 'right';
        const saveBtn = document.createElement('button');
        saveBtn.id = 'save-prompt-btn';
        saveBtn.className = 'chatgpt-prompt-panel-button copy-btn';
        saveBtn.textContent = 'Save Prompt';
        buttonSection.appendChild(saveBtn);
        content.appendChild(buttonSection);

        overlay.appendChild(content);

        const closeModal = () => { overlay.style.display = 'none'; isFormActiveLock = false; updateLockIcon(); if (!isManuallyLocked) hidePanel(); };
        closeBtn.addEventListener('click', closeModal);
        saveBtn.addEventListener('click', () => {
            const id = hiddenInput.value;
            const name = nameInput.value.trim();
            const text = textInput.value.trim();
            const autoSend = autoSendInput.checked;
            if (!name || !text) { alert('Please provide a name and text for the prompt.'); return; }
            if (id) { // Editing
                const index = currentPrompts.findIndex(p => p.id === id);
                if (index > -1) currentPrompts[index] = { id, name, text, autoSend };
            } else { // Creating new
                currentPrompts.push({ id: `prompt-${Date.now()}`, name, text, autoSend });
            }
            savePrompts(); renderAllPrompts(); showToast(id ? 'Prompt updated!' : 'Prompt created!');
            closeModal();
        });
        return overlay;
    }

    function showPromptForm(promptToEdit = null) {
        isFormActiveLock = true;
        updateLockIcon();
        const title = promptToEdit ? 'Edit Prompt' : 'Create New Prompt';
        promptFormModal.querySelector('h3').textContent = title;
        promptFormModal.querySelector('#prompt-id-input').value = promptToEdit ? promptToEdit.id : '';
        promptFormModal.querySelector('#prompt-name-input').value = promptToEdit ? promptToEdit.name : '';
        promptFormModal.querySelector('#prompt-text-input').value = promptToEdit ? promptToEdit.text : '';
        promptFormModal.querySelector('#prompt-autosend-input').checked = promptToEdit ? !!promptToEdit.autoSend : false;
        promptFormModal.style.display = 'flex';
    }

    // --- PANEL CREATION ---
    async function createAndAppendPanel() {
        if (document.getElementById('chatgpt-prompt-panel-main')) return;
        await loadSettings();

        // Create Modals first, so they are defined for button listeners
        settingsModal = buildSettingsModal();
        promptFormModal = buildPromptFormModal();

        toast = document.createElement('div');
        toast.className = 'toast-notification';

        handle = document.createElement('div');
        handle.className = 'panel-handle';
        handle.addEventListener('mouseenter', () => {
            panel.classList.add('visible');
            updateHandleHeight();
        });
        handle.addEventListener('mouseleave', hidePanel);

        panel = document.createElement('div');
        panel.id = 'chatgpt-prompt-panel-main';
        panel.addEventListener('mouseenter', () => panel.classList.add('visible'));
        panel.addEventListener('mouseleave', hidePanel);

        resizeHandle = document.createElement('div');
        resizeHandle.className = 'chatgpt-resize-handle';
        panel.appendChild(resizeHandle);

        // -- Header --
        const hdr = document.createElement('div');
        hdr.className = 'chatgpt-prompt-panel-header';
        leftHeaderControls = document.createElement('div');
        leftHeaderControls.className = 'panel-header-controls';
        const titleSpan = document.createElement('span');
        titleSpan.className = 'panel-title';
        titleSpan.textContent = 'Prompt Panel';
        rightHeaderControls = document.createElement('div');
        rightHeaderControls.className = 'panel-header-controls';
        hdr.append(leftHeaderControls, titleSpan, rightHeaderControls);
        panel.appendChild(hdr);

        // Create all header buttons once
        settingsBtn = document.createElement('button');
        settingsBtn.title = "Settings";
        settingsBtn.appendChild(icons.settings.cloneNode(true));
        settingsBtn.addEventListener('click', () => {
            // Populate settings modal with current values before showing
            Object.keys(settings).forEach(key => {
                const slider = settingsModal.querySelector(`#${key.replace(/([A-Z])/g, "-$1").toLowerCase()}-slider`);
                if (slider) {
                    slider.value = settings[key];
                    const valueLabel = settingsModal.querySelector(`#${slider.id.replace('slider', 'value')}`);
                    if(valueLabel) valueLabel.textContent = `${settings[key]}${key === 'chatWidth' ? '%' : 'px'}`;
                }
            });
            settingsModal.querySelector(`#theme-${settings.theme}`).checked = true;
            settingsModal.style.display = 'flex';
        });

        arrowLeftBtn = document.createElement('button');
        arrowLeftBtn.title = "Move to Left";
        arrowLeftBtn.appendChild(icons.arrowLeft.cloneNode(true));
        arrowLeftBtn.addEventListener('click', () => { settings.position = 'left'; saveSettings(); applySettings(); });

        arrowRightBtn = document.createElement('button');
        arrowRightBtn.title = "Move to Right";
        arrowRightBtn.appendChild(icons.arrowRight.cloneNode(true));
        arrowRightBtn.addEventListener('click', () => { settings.position = 'right'; saveSettings(); applySettings(); });

        lockButton = document.createElement('button');
        lockButton.title = "Lock Panel";
        lockButton.addEventListener('click', () => { isManuallyLocked = !isManuallyLocked; updateLockIcon(); if (isManuallyLocked) panel.classList.add('visible'); });
        updateLockIcon(); // Initial call

        // -- Content --
        const content = document.createElement('div');
        content.className = 'chatgpt-prompt-panel-content';
        panel.appendChild(content);

        const newChatBtn = createButtonWithIcon('New Chat', icons.plus.cloneNode(true));
        newChatBtn.id = 'new-chat-btn';
        newChatBtn.addEventListener('click', () => window.location.href = 'https://chat.openai.com/');
        const actionGroup = document.createElement('div');
        actionGroup.className = 'button-group';
        const copyResponseButton = createButtonWithIcon('Copy Response', null);
        copyResponseButton.classList.add('copy-btn');
        const copyCodeButton = createButtonWithIcon('Copy Code', null);
        copyCodeButton.classList.add('copy-btn');
        actionGroup.append(copyResponseButton, copyCodeButton);
        const promptGroup = document.createElement('div');
        promptGroup.className = 'prompt-group-container';
        const addBtn = createButtonWithIcon('Add New Prompt', icons.plus.cloneNode(true));
        addBtn.id = 'add-prompt-btn';
        const cont = document.createElement('div');
        cont.id = 'custom-prompts-container';
        promptGroup.append(cont, addBtn);
        content.append(newChatBtn, actionGroup, promptGroup);

        copyResponseButton.addEventListener('click', copyLastResponse);
        copyCodeButton.addEventListener('click', copyLastCodeBlock);
        addBtn.addEventListener('click', () => showPromptForm());

        cont.addEventListener('dragover', e => { e.preventDefault(); const after = getDragAfter(cont, e.clientY); const dragEl = cont.querySelector('.dragging'); if (dragEl) cont.insertBefore(dragEl, after); });
        cont.addEventListener('drop', () => {
            const fromIndex = currentPrompts.findIndex(p => p.id === draggedItem);
            const orderedIds = [...cont.querySelectorAll('.prompt-button')].map(b => b.dataset.promptId);
            const toIndex = orderedIds.indexOf(draggedItem);
            if (fromIndex !== -1 && toIndex !== -1) {
                const [movedItem] = currentPrompts.splice(fromIndex, 1);
                currentPrompts.splice(toIndex, 0, movedItem);
                savePrompts();
            }
            draggedItem = null;
        });

        // Append all elements to the body at the end in the correct order
        document.body.appendChild(panel);
        document.body.appendChild(handle);
        document.body.appendChild(toast);
        document.body.appendChild(settingsModal);
        document.body.appendChild(promptFormModal);

        hdr.addEventListener('mousedown', e => {
            if (e.target.closest('.panel-header-controls')) return;
            const startY = e.clientY - panel.getBoundingClientRect().top;
            function onMove(ev) { settings.topOffset = ev.clientY - startY + 'px'; panel.style.top = settings.topOffset; handle.style.top = settings.topOffset; }
            function onUp() { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); saveSettings(); }
            document.addEventListener('mousemove', onMove); document.addEventListener('mouseup', onUp);
        });

        initResizeFunctionality();

        applySettings();
        loadAndDisplayPrompts();
    }

    // --- ACTIONS ---
    function initResizeFunctionality() {
        let startX, startWidth;

        function doDrag(e) {
            e.preventDefault();
            const dx = e.clientX - startX;
            let newWidth = settings.position === 'left' ? startWidth + dx : startWidth - dx;

            // Clamp the width
            newWidth = Math.max(220, Math.min(600, newWidth));

            settings.panelWidth = newWidth;
            panel.style.setProperty('--panel-width', `${newWidth}px`);

            // Update slider in settings modal in real-time
            const slider = settingsModal.querySelector('#panel-width-slider');
            const valueLabel = settingsModal.querySelector('#panel-width-value');
            if (slider) slider.value = newWidth;
            if (valueLabel) valueLabel.textContent = `${Math.round(newWidth)}px`;

            updateHandleHeight();
        }

        function stopDrag() {
            document.removeEventListener('mousemove', doDrag);
            document.removeEventListener('mouseup', stopDrag);
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
            saveSettings();
        }

        resizeHandle.addEventListener('mousedown', (e) => {
            e.preventDefault();
            startX = e.clientX;
            startWidth = panel.offsetWidth;
            document.body.style.cursor = 'ew-resize';
            document.body.style.userSelect = 'none';
            document.addEventListener('mousemove', doDrag);
            document.addEventListener('mouseup', stopDrag);
        });
    }

    function getDragAfter(container, y) { const els = [...container.querySelectorAll('.prompt-button:not(.dragging)')]; return els.reduce((closest, child) => { const box = child.getBoundingClientRect(); const offset = y - box.top - box.height / 2; return offset < 0 && offset > closest.offset ? { offset, element: child } : closest; }, { offset: Number.NEGATIVE_INFINITY }).element; }
    function findLastMessage() { const messages = document.querySelectorAll('div[data-message-author-role="assistant"]'); return messages.length > 0 ? messages[messages.length - 1] : null; }
    function copyLastResponse() { const lastMessage = findLastMessage(); if (!lastMessage) { showToast('No response found.'); return; } const copyButton = lastMessage.querySelector('button[data-testid="copy-turn-action-button"]'); if (copyButton) { copyButton.click(); showToast('Response Copied!'); } else { showToast('Copy button not found.'); } }
    function copyLastCodeBlock() { const lastMessage = findLastMessage(); if (!lastMessage) { showToast('No response found.'); return; } const codeBlocks = lastMessage.querySelectorAll('pre'); if (codeBlocks.length === 0) { showToast('No code block in last response.'); return; } const lastCodeBlock = codeBlocks[codeBlocks.length - 1]; const copyButton = lastCodeBlock.querySelector('button.flex.gap-1'); if (copyButton) { copyButton.click(); showToast('Code Copied!'); } else { showToast('Code copy button not found.'); } }

    function sendPromptToChatGPT(text, autoSend = false) {
        const textarea = document.querySelector('textarea#prompt-textarea');
        if (!textarea) {
            console.error("ChatGPT Prompt Panel: Textarea not found.");
            showToast("Error: Textarea not found");
            return;
        }

        // Set the value on the native textarea
        const nativeTextareaSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value").set;
        nativeTextareaSetter.call(textarea, text);

        // Dispatch an event to let React know the value has changed
        const event = new Event('input', { bubbles: true });
        textarea.dispatchEvent(event);

        if (autoSend) {
            setTimeout(() => {
                const sendButton = document.querySelector('button[data-testid="send-button"]');
                if (sendButton && !sendButton.disabled) {
                    sendButton.click();
                } else {
                    // Fallback: try to simulate an Enter key press if the button isn't found
                    const enterEvent = new KeyboardEvent('keydown', {
                        key: 'Enter',
                        code: 'Enter',
                        which: 13,
                        keyCode: 13,
                        bubbles: true
                    });
                    textarea.dispatchEvent(enterEvent);
                }
            }, 150); // Delay to allow UI to update
        }
    }

    function exportPrompts() { const data = JSON.stringify(currentPrompts, null, 2); const blob = new Blob([data], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'chatgpt-prompts.json'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url); }
    function importPrompts() { const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.json'; inp.onchange = e => { const f = e.target.files[0]; if (!f) return; const r = new FileReader(); r.onload = ev => { try { const arr = JSON.parse(ev.target.result); if (Array.isArray(arr) && arr.every(p => p.name && p.text)) { if (confirm(`Add ${arr.length} imported prompts to your existing list?`)) { arr.forEach((p, i) => p.id = p.id || `imported-${Date.now()}-${i}`); currentPrompts.push(...arr); savePrompts(); renderAllPrompts(); } } else throw new Error('Invalid file format'); } catch (err) { alert('Import error: ' + err.message); } }; r.readAsText(f); }; inp.click(); }
    function resetPrompts() { if (confirm('Are you sure you want to reset all prompts to the default set?')) { currentPrompts = [...DEFAULT_PROMPTS]; savePrompts(); renderAllPrompts(); } }

    // --- BOOTSTRAP ---
    if (document.readyState === 'complete' || document.readyState === 'interactive') { createAndAppendPanel(); }
    else { window.addEventListener('load', createAndAppendPanel); }
})();
