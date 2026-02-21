// ==UserScript==
// @name         Claude Ultimate Enhancer
// @namespace    https://github.com/SysAdminDoc
// @version      1.1.0
// @description  All-in-one Claude.ai enhancement suite - theme engine, usage monitor, prompt library, auto-scroll, DOM trimmer, visual upgrades, API-powered chat export (JSON/ZIP), and more
// @author       SysAdminDoc
// @match        https://claude.ai/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_addStyle
// @run-at       document-start
// @license      MIT
// ==/UserScript==

(function () {
    'use strict';

    if (window.__claudeUltimateLoaded) return;
    window.__claudeUltimateLoaded = true;

    const VERSION = '1.1.0';
    const PREFIX = 'cue';
    const LOG_TAG = '[CUE]';

    // =====================================================================
    //  SETTINGS MANAGER
    // =====================================================================
    const Settings = {
        _cache: {},
        _defaults: {
            // -- Theme --
            themeEnabled: true,
            themeVariant: 'oceanic',   // oceanic | midnight | none
            fontOverride: true,        // replace serif with sans
            // -- Layout --
            wideMode: true,
            chatWidthPct: 90,
            // -- Visual --
            coloredButtons: true,
            coloredBoldItalic: true,
            smoothAnimations: true,
            customScrollbar: true,
            // -- Usage Monitor --
            usageMonitor: true,
            usageFetchInterval: 300,   // seconds between API polls
            // -- Feature Toggles --
            featureToggles: true,
            // -- DOM Trimmer --
            domTrimmer: false,
            domKeepVisible: 20,
            // -- Auto Features --
            autoScroll: true,
            autoApprove: false,
            // -- Export --
            exportBranchMode: false,
            exportIncludeImages: false,
            // -- Prompt Library --
            promptLibrary: true,
            // -- Response Monitor --
            responseMonitor: true,
            notifySound: true,
            notifyFlash: true,
            // -- Keyboard Shortcuts --
            shortcuts: true,
            // -- Paste Fix --
            pasteFix: true,
            // -- Panel --
            panelPosition: 'bottom-right',
            panelCollapsed: true,
        },
        get(key) {
            if (key in this._cache) return this._cache[key];
            const val = GM_getValue(PREFIX + '_' + key, this._defaults[key]);
            this._cache[key] = val;
            return val;
        },
        set(key, val) {
            this._cache[key] = val;
            GM_setValue(PREFIX + '_' + key, val);
            EventBus.emit('setting:' + key, val);
            EventBus.emit('settings:changed', { key, val });
        },
        toggle(key) {
            const v = !this.get(key);
            this.set(key, v);
            return v;
        },
        defaults() { return { ...this._defaults }; },
        reset() {
            Object.keys(this._defaults).forEach(k => this.set(k, this._defaults[k]));
        }
    };

    // =====================================================================
    //  EVENT BUS
    // =====================================================================
    const EventBus = {
        _listeners: {},
        on(event, fn) {
            (this._listeners[event] ||= []).push(fn);
            return () => this.off(event, fn);
        },
        off(event, fn) {
            const arr = this._listeners[event];
            if (arr) this._listeners[event] = arr.filter(f => f !== fn);
        },
        emit(event, data) {
            (this._listeners[event] || []).forEach(fn => {
                try { fn(data); } catch (e) { console.error(LOG_TAG, 'Event error:', event, e); }
            });
        }
    };

    // =====================================================================
    //  UTILITY HELPERS
    // =====================================================================
    const $ = (sel, ctx = document) => ctx.querySelector(sel);
    const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const esc = s => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
    const fmtNum = n => n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(1) + 'K' : String(n);
    const fmtDur = ms => {
        const s = Math.floor(ms / 1000), m = Math.floor(s / 60), h = Math.floor(m / 60);
        return h > 0 ? `${h}h ${m % 60}m` : m > 0 ? `${m}m ${s % 60}s` : `${s}s`;
    };
    const ts = () => new Date().toLocaleTimeString('en', { hour12: false });

    function waitForElement(sel, timeout = 15000) {
        return new Promise((resolve, reject) => {
            const el = $(sel);
            if (el) return resolve(el);
            const obs = new MutationObserver(() => {
                const el = $(sel);
                if (el) { obs.disconnect(); clearTimeout(t); resolve(el); }
            });
            obs.observe(document.documentElement, { childList: true, subtree: true });
            const t = setTimeout(() => { obs.disconnect(); reject(new Error('Timeout: ' + sel)); }, timeout);
        });
    }

    function injectCSS(id, css) {
        let el = document.getElementById(id);
        if (el) { el.textContent = css; return el; }
        el = document.createElement('style');
        el.id = id;
        el.textContent = css;
        (document.head || document.documentElement).appendChild(el);
        return el;
    }

    function removeCSS(id) {
        const el = document.getElementById(id);
        if (el) el.remove();
    }

    function showToast(msg, duration = 3500, type = 'info') {
        const colors = { info: '#58a6ff', success: '#3fb950', warn: '#d29922', error: '#f85149' };
        const toast = document.createElement('div');
        Object.assign(toast.style, {
            position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)',
            background: '#1a1a2e', color: '#e0e0e0', padding: '12px 24px', borderRadius: '10px',
            boxShadow: `0 4px 24px rgba(0,0,0,0.5), 0 0 0 1px ${colors[type]}40`,
            zIndex: '999999', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
            fontSize: '14px', borderLeft: `4px solid ${colors[type]}`, transition: 'opacity 0.4s, transform 0.4s',
            opacity: '0', maxWidth: '500px'
        });
        toast.textContent = msg;
        document.body.appendChild(toast);
        requestAnimationFrame(() => { toast.style.opacity = '1'; });
        setTimeout(() => { toast.style.opacity = '0'; toast.style.transform = 'translateX(-50%) translateY(10px)'; setTimeout(() => toast.remove(), 400); }, duration);
    }

    // =====================================================================
    //  DOM SELECTORS
    // =====================================================================
    const SEL = {
        editor:     '.ProseMirror',
        editorAlt:  'div[contenteditable="true"][translate="no"].ProseMirror',
        sendBtn:    '[data-testid="send-button"]',
        sendBtnAlt: 'button[aria-label*="Send"]',
        stopBtn:    '[data-testid="stop-button"]',
        stopBtnAlt: 'button[aria-label*="Stop"]',
        userMsg:    '[data-testid="user-message"]',
        msgGroup:   '.group',
        streaming:  '[data-is-streaming="true"]',
        dialog:     '[role="dialog"]',
        dialogOpen: '[role="dialog"][data-state="open"]',
        main:       'main',
    };

    // =====================================================================
    //  DOM INTERFACE (from Prompt Deck v1.4)
    // =====================================================================
    const DOM = {
        find(sel, ...fb) { for (const s of [sel, ...fb]) { const el = document.querySelector(s); if (el) return el; } return null; },
        getEditor()     { return this.find(SEL.editor, SEL.editorAlt); },
        getSendButton() { return this.find(SEL.sendBtn, SEL.sendBtnAlt); },
        getStopButton() { return this.find(SEL.stopBtn, SEL.stopBtnAlt); },
        isGenerating() {
            const stop = this.getStopButton(); if (stop && stop.offsetParent !== null) return true;
            const send = this.getSendButton(); if (send && !send.disabled && send.offsetParent !== null) return false;
            return !!document.querySelector(SEL.streaming);
        },
        async typeMessage(text) {
            const pm = this.getEditor(); if (!pm) throw new Error('Editor not found');
            const editor = pm.editor;
            if (editor?.chain) { try { editor.chain().focus().clearContent().insertContent({ type: 'paragraph', content: [{ type: 'text', text }] }).run(); await sleep(300); return; } catch (e) { /* fb */ } }
            try { pm.focus(); document.execCommand('selectAll', false, null); document.execCommand('delete', false, null); document.execCommand('insertText', false, text); await sleep(300); return; } catch (e) { /* fb */ }
            pm.focus(); const p = document.createElement('p'); p.textContent = text; pm.innerHTML = ''; pm.appendChild(p); pm.dispatchEvent(new Event('input', { bubbles: true })); await sleep(300);
        },
        async sendMessage(text) {
            await this.typeMessage(text); await sleep(500);
            const btn = this.getSendButton(); if (btn && !btn.disabled) { btn.click(); return; }
            const pm = this.getEditor(); if (pm) { pm.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true, cancelable: true })); return; }
            throw new Error('Cannot send');
        },
        getLastResponse() {
            const groups = document.querySelectorAll(SEL.msgGroup);
            for (let i = groups.length - 1; i >= 0; i--) { if (!groups[i].querySelector(SEL.userMsg)) return groups[i].innerText.trim(); }
            return '';
        },
    };

    // =====================================================================
    //  CLAUDE API HELPERS
    // =====================================================================
    const ClaudeAPI = {
        async getOrgs() {
            const r = await fetch('/api/organizations', { credentials: 'include' });
            return r.json();
        },
        async getUsage() {
            try {
                const orgs = await this.getOrgs();
                const orgId = orgs[0]?.uuid;
                if (!orgId) return null;
                const r = await fetch(`/api/organizations/${orgId}/usage`, { credentials: 'include' });
                return r.json();
            } catch (e) { return null; }
        },
        async getSettings() {
            try {
                const r = await fetch('/api/account', { credentials: 'include' });
                const data = await r.json();
                return data.settings;
            } catch (e) { return null; }
        },
        async toggleFeature(key, value, exclusiveKey = null) {
            try {
                const body = { [key]: value };
                if (exclusiveKey && value) body[exclusiveKey] = false;
                const r = await fetch('/api/account/settings', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify(body)
                });
                return r.ok ? await r.json() : null;
            } catch (e) { return null; }
        }
    };

    // =====================================================================
    //  FETCH INTERCEPTOR (SSE stream usage data)
    // =====================================================================
    const StreamMonitor = {
        _installed: false,
        lastUsage: null,
        lastMessageLimit: null,

        install() {
            if (this._installed) return;
            this._installed = true;
            const origFetch = window.fetch;
            const self = this;
            window.fetch = async function (...args) {
                const response = await origFetch.apply(this, args);
                try {
                    const url = typeof args[0] === 'string' ? args[0] : args[0]?.url || '';
                    if (url.includes('/completion') || url.includes('/chat_conversations')) {
                        const ct = response.headers.get('content-type') || '';
                        if (ct.includes('text/event-stream')) {
                            self._processStream(response.clone()).catch(() => {});
                        }
                    }
                } catch (e) { /* never break app */ }
                return response;
            };
        },

        async _processStream(response) {
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';
            try {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split('\n');
                    buffer = lines.pop() || '';
                    for (const line of lines) {
                        if (!line.startsWith('data: ')) continue;
                        const j = line.substring(6).trim();
                        if (!j || j === '[DONE]') continue;
                        try { this._processSSE(JSON.parse(j)); } catch (e) { /* skip */ }
                    }
                }
            } catch (e) { /* stream aborted */ }
            EventBus.emit('stream:end');
        },

        _processSSE(data) {
            // Message limit data
            if (data.message_limit !== undefined) {
                this.lastMessageLimit = data.message_limit;
                EventBus.emit('stream:messageLimit', data.message_limit);
            }
            // Direct utilization value
            if (data.utilization !== undefined && typeof data.utilization === 'number') {
                EventBus.emit('stream:utilization', data.utilization);
            }
            // Token usage data
            if (data.usage) {
                this.lastUsage = data.usage;
                EventBus.emit('stream:usage', data.usage);
            }
            // Message limit within_limit type
            if (data.type === 'message_limit' && data.message_limit?.type === 'within_limit') {
                EventBus.emit('stream:messageLimit', data.message_limit);
            }
            // Rate limit data
            if (data.rate_limit) {
                EventBus.emit('stream:rateLimit', data.rate_limit);
            }
            // Generation lifecycle
            if (data.type === 'message_start') EventBus.emit('stream:start', data);
            if (data.type === 'message_stop') EventBus.emit('stream:stop', data);
        }
    };

    // =====================================================================
    //  MODULE: THEME ENGINE
    // =====================================================================
    const ThemeModule = {
        id: 'theme',

        THEMES: {
            oceanic: {
                name: 'Oceanic Dark',
                vars: `
                    --accent-main-000: 195 54.2% 44.2%; --accent-main-100: 195 63.1% 52.6%;
                    --accent-main-200: 195 63.1% 52.6%; --accent-main-900: 0 0% 0%;
                    --bg-000: 240 8% 11.4%; --bg-100: 240 8% 7.5%; --bg-200: 210 8% 4.8%;
                    --bg-300: var(--bg-000); --bg-400: var(--bg-000); --bg-500: 0 0% 0%;
                    --text-000: 228 33.3% 90.1%; --text-100: 228 33.3% 90.1%;
                    --text-200: 230 9% 66.7%; --text-300: 230 9% 66.7%;
                    --text-400: 228 4.8% 52.2%; --text-500: 228 4.8% 52.2%;
                    --border-100: 231 16.5% 77.5%; --border-200: 231 16.5% 77.5%;
                    --border-300: 231 16.5% 77.5%; --border-400: 231 16.5% 77.5%;
                    --danger-000: 180 98.4% 68.1%; --danger-100: 180 67% 52.6%;
                    --danger-200: 180 67% 52.6%; --danger-900: 180 46.5% 20.8%;
                    --success-000: 277 59.1% 39.1%; --success-100: 277 75% 25.9%;
                    --success-200: 277 75% 25.9%; --success-900: 307 100% 6.9%;
                    --accent-pro-000: 71 84.6% 67.5%; --accent-pro-100: 71 40.2% 47.1%;
                    --accent-secondary-000: 30 65.5% 60.1%; --accent-secondary-100: 30 70.9% 44.6%;
                    --oncolor-100: 0 0% 93%; --oncolor-200: 240 6.7% 90.1%; --oncolor-300: 240 6.7% 90.1%;
                `
            },
            midnight: {
                name: 'Midnight',
                vars: `
                    --accent-main-000: 260 60% 50%; --accent-main-100: 260 70% 60%;
                    --accent-main-200: 260 70% 60%; --accent-main-900: 0 0% 0%;
                    --bg-000: 240 12% 9%; --bg-100: 240 12% 6%; --bg-200: 240 12% 4%;
                    --bg-300: var(--bg-000); --bg-400: var(--bg-000); --bg-500: 0 0% 0%;
                    --text-000: 220 30% 92%; --text-100: 220 30% 92%;
                    --text-200: 220 10% 65%; --text-300: 220 10% 65%;
                    --text-400: 220 5% 50%; --text-500: 220 5% 50%;
                    --border-100: 240 10% 25%; --border-200: 240 10% 25%;
                    --border-300: 240 10% 25%; --border-400: 240 10% 25%;
                    --danger-000: 0 80% 65%; --danger-100: 0 70% 55%;
                    --success-000: 150 60% 45%; --success-100: 150 50% 35%;
                    --oncolor-100: 0 0% 93%; --oncolor-200: 0 0% 88%; --oncolor-300: 0 0% 88%;
                `
            }
        },

        init() {
            this._apply();
            EventBus.on('setting:themeEnabled', () => this._apply());
            EventBus.on('setting:themeVariant', () => this._apply());
            EventBus.on('setting:fontOverride', () => this._apply());
        },

        _apply() {
            if (!Settings.get('themeEnabled') || Settings.get('themeVariant') === 'none') {
                removeCSS(PREFIX + '-theme');
                return;
            }
            const theme = this.THEMES[Settings.get('themeVariant')];
            if (!theme) { removeCSS(PREFIX + '-theme'); return; }
            const fontCSS = Settings.get('fontOverride') ? `
                :root { --font-anthropic-serif: var(--font-anthropic-sans) !important; --font-ui-serif: var(--font-ui) !important; }
            ` : '';
            injectCSS(PREFIX + '-theme', `
                [data-theme=claude][data-mode=dark] { ${theme.vars} }
                ${fontCSS}
                * { scrollbar-color: hsla(var(--bg-300, 240 8% 11.4%)/50%) transparent !important; }
                *, *:after, *:before { --tw-gradient-from-position: none !important; }
            `);
        },

        destroy() { removeCSS(PREFIX + '-theme'); }
    };

    // =====================================================================
    //  MODULE: WIDE LAYOUT
    // =====================================================================
    const LayoutModule = {
        id: 'layout',
        _observer: null,

        init() {
            this._apply();
            EventBus.on('setting:wideMode', () => this._apply());
            EventBus.on('setting:chatWidthPct', () => this._apply());
        },

        _apply() {
            if (!Settings.get('wideMode')) { removeCSS(PREFIX + '-layout'); this._stopObserver(); return; }
            const pct = Settings.get('chatWidthPct');
            injectCSS(PREFIX + '-layout', `
                /* Wide layout override */
                [class*="mx-auto"] { max-width: ${pct}% !important; }
                .mx-auto { max-width: ${pct}% !important; }
                div[data-test-render-count] { max-width: ${pct}% !important; }
                div[data-test-render-count] > * { max-width: 100% !important; }
                /* Also widen parent containers */
                main > div > div > div { max-width: ${pct}% !important; }
            `);
        },

        _stopObserver() { if (this._observer) { this._observer.disconnect(); this._observer = null; } },
        destroy() { removeCSS(PREFIX + '-layout'); this._stopObserver(); }
    };

    // =====================================================================
    //  MODULE: VISUAL ENHANCEMENT
    // =====================================================================
    const VisualModule = {
        id: 'visual',
        _boldObserver: null,

        COLORS: {
            orange: 'darkorange', green: 'springgreen', lime: 'limegreen', darkGreen: '#00ad00',
            red: 'crimson', yellow: 'gold', skyblue: 'deepskyblue', blue: '#4285f4',
            violet: 'darkviolet', purple: '#9c27b0', cyan: '#00bcd4', pink: '#e91e63',
            gray: 'gray', teal: '#009688'
        },

        init() {
            this._applyButtons();
            this._applyBoldItalic();
            this._applyAnimations();
            this._applyScrollbar();
            this._startBoldObserver();
            EventBus.on('setting:coloredButtons', () => this._applyButtons());
            EventBus.on('setting:coloredBoldItalic', () => { this._applyBoldItalic(); this._colorBoldElements(); });
            EventBus.on('setting:smoothAnimations', () => this._applyAnimations());
            EventBus.on('setting:customScrollbar', () => this._applyScrollbar());
        },

        _applyButtons() {
            if (!Settings.get('coloredButtons')) { removeCSS(PREFIX + '-buttons'); return; }
            const C = this.COLORS;
            injectCSS(PREFIX + '-buttons', `
                /* Copy - Orange */
                button[aria-label*="Copy" i] svg { color: ${C.orange} !important; opacity: 0.9; transition: all 0.3s ease !important; }
                button[aria-label*="Copy" i]:hover svg { filter: drop-shadow(0 0 8px ${C.orange}) !important; opacity: 1 !important; }
                /* Edit - Yellow */
                button[aria-label*="Edit" i] svg { color: ${C.yellow} !important; opacity: 0.8; transition: all 0.3s ease !important; }
                button[aria-label*="Edit" i]:hover svg { filter: drop-shadow(0 0 8px ${C.yellow}) !important; opacity: 1 !important; }
                /* Retry - Sky Blue */
                button[aria-label*="Retry" i] svg, button[aria-label*="Regenerate" i] svg { color: ${C.skyblue} !important; opacity: 0.9; transition: all 0.3s ease !important; }
                button[aria-label*="Retry" i]:hover svg { filter: drop-shadow(0 0 8px ${C.skyblue}) !important; opacity: 1 !important; }
                /* Thumbs Up - Green */
                button[aria-label*="Good" i] svg { color: ${C.darkGreen} !important; opacity: 0.9; transition: all 0.3s ease !important; }
                button[aria-label*="Good" i]:hover svg { filter: drop-shadow(0 0 8px ${C.darkGreen}) !important; opacity: 1 !important; }
                button[aria-label*="Good" i]:hover { background: rgba(0,173,0,0.12) !important; }
                /* Thumbs Down - Red */
                button[aria-label*="Bad" i] svg { color: ${C.red} !important; opacity: 0.9; transition: all 0.3s ease !important; }
                button[aria-label*="Bad" i]:hover svg { filter: drop-shadow(0 0 8px ${C.red}) !important; opacity: 1 !important; }
                button[aria-label*="Bad" i]:hover { background: rgba(220,53,69,0.12) !important; }
                /* Delete - Red */
                button[aria-label*="Delete" i] svg { color: #e02e2a !important; }
                button[aria-label*="Delete" i]:hover { background: rgba(224,46,42,0.15) !important; box-shadow: 0 0 15px rgba(224,46,42,0.3) !important; }
                /* Share - Sky Blue */
                button[aria-label*="Share" i] svg { color: ${C.skyblue} !important; opacity: 0.8; transition: all 0.3s ease !important; }
                button[aria-label*="Share" i]:hover svg { filter: drop-shadow(0 0 8px ${C.skyblue}) !important; }
                /* List markers */
                .font-claude-message ul li::marker, [class*="prose"] ul li::marker { color: ${C.green} !important; }
                .font-claude-message ol li::marker, [class*="prose"] ol li::marker { color: ${C.blue} !important; font-weight: bold !important; }
                /* Blockquote */
                blockquote { border-left: 4px solid ${C.green} !important; padding-left: 16px !important; opacity: 0.9; }
                /* Code blocks */
                pre { border-radius: 8px !important; }
            `);
        },

        _applyBoldItalic() {
            if (!Settings.get('coloredBoldItalic')) { removeCSS(PREFIX + '-bold'); return; }
            const C = this.COLORS;
            injectCSS(PREFIX + '-bold', `
                .font-claude-message strong, .font-claude-message b,
                [class*="prose"] strong, [class*="prose"] b { color: ${C.green} !important; }
                .font-claude-message em, .font-claude-message i,
                [class*="prose"] em, [class*="prose"] i { color: ${C.skyblue} !important; }
            `);
        },

        _colorBoldElements() {
            if (!Settings.get('coloredBoldItalic')) return;
            $$('b:not([data-cue-styled]), strong:not([data-cue-styled])').forEach(el => {
                el.setAttribute('data-cue-styled', '1');
                el.style.setProperty('color', this.COLORS.green, 'important');
            });
            $$('i:not([data-cue-styled]), em:not([data-cue-styled])').forEach(el => {
                el.setAttribute('data-cue-styled', '1');
                el.style.setProperty('color', this.COLORS.skyblue, 'important');
            });
        },

        _startBoldObserver() {
            if (this._boldObserver) this._boldObserver.disconnect();
            let timer;
            this._boldObserver = new MutationObserver(() => {
                clearTimeout(timer);
                timer = setTimeout(() => this._colorBoldElements(), 200);
            });
            const start = () => {
                if (document.body) this._boldObserver.observe(document.body, { childList: true, subtree: true });
                else setTimeout(start, 200);
            };
            start();
        },

        _applyAnimations() {
            if (!Settings.get('smoothAnimations')) { removeCSS(PREFIX + '-anim'); return; }
            injectCSS(PREFIX + '-anim', `
                @keyframes cue-fade-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
                button svg { transition: all 0.3s cubic-bezier(0.4,0,0.2,1) !important; }
                button:focus-visible { outline: 2px solid #4285f4 !important; outline-offset: 2px !important; }
            `);
        },

        _applyScrollbar() {
            if (!Settings.get('customScrollbar')) { removeCSS(PREFIX + '-scroll'); return; }
            injectCSS(PREFIX + '-scroll', `
                ::-webkit-scrollbar { width: 10px; height: 10px; }
                ::-webkit-scrollbar-track { background: transparent; }
                ::-webkit-scrollbar-thumb { background: rgba(128,128,128,0.25); border-radius: 5px; }
                ::-webkit-scrollbar-thumb:hover { background: rgba(128,128,128,0.4); }
            `);
        },

        destroy() {
            removeCSS(PREFIX + '-buttons');
            removeCSS(PREFIX + '-bold');
            removeCSS(PREFIX + '-anim');
            removeCSS(PREFIX + '-scroll');
            if (this._boldObserver) this._boldObserver.disconnect();
        }
    };

    // =====================================================================
    //  MODULE: PASTE FIX
    // =====================================================================
    const PasteFixModule = {
        id: 'pasteFix',
        _handler: null,

        init() {
            this._handler = (e) => {
                if (!Settings.get('pasteFix')) return;
                const cd = e.clipboardData || window.clipboardData;
                if (cd.types.includes('text/plain') && cd.types.includes('text/html')) {
                    e.preventDefault();
                    e.stopImmediatePropagation();
                    const plain = cd.getData('text/plain');
                    const dt = new DataTransfer();
                    dt.setData('text/plain', plain.trimStart());
                    e.target.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
                }
            };
            document.addEventListener('paste', this._handler, true);
        },
        destroy() {
            if (this._handler) document.removeEventListener('paste', this._handler, true);
        }
    };

    // =====================================================================
    //  MODULE: AUTO-SCROLL
    // =====================================================================
    const AutoScrollModule = {
        id: 'autoScroll',
        _observer: null,
        _timer: null,

        init() {
            this._start();
            EventBus.on('setting:autoScroll', (v) => v ? this._start() : this._stop());
        },

        scrollToBottom() {
            for (const el of [document.querySelector('main'), document.querySelector('[class*="overflow-y"]'), document.querySelector('[class*="scroll"]')].filter(Boolean)) {
                if (el.scrollHeight > el.clientHeight) { el.scrollTop = el.scrollHeight; return; }
            }
            window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' });
        },

        _start() {
            if (this._observer) this._observer.disconnect();
            this._observer = new MutationObserver(() => {
                if (!Settings.get('autoScroll')) return;
                clearTimeout(this._timer);
                this._timer = setTimeout(() => this.scrollToBottom(), 150);
            });
            this._observer.observe(document.querySelector('main') || document.body, { childList: true, subtree: true, characterData: true });
        },

        _stop() { if (this._observer) this._observer.disconnect(); },
        destroy() { this._stop(); }
    };

    // =====================================================================
    //  MODULE: AUTO-APPROVE
    // =====================================================================
    const AutoApproveModule = {
        id: 'autoApprove',
        _observer: null,

        init() {
            this._start();
            EventBus.on('setting:autoApprove', (v) => v ? this._start() : this._stop());
        },

        _start() {
            if (this._observer) this._observer.disconnect();
            this._observer = new MutationObserver(() => {
                if (!Settings.get('autoApprove')) return;
                const dlg = $(SEL.dialogOpen) || $(SEL.dialog);
                if (!dlg) return;
                for (const btn of dlg.querySelectorAll('button')) {
                    const t = btn.textContent.toLowerCase().trim();
                    if (t.includes('allow for this chat') || t.includes('allow once') || t.includes('allow always')) {
                        btn.click();
                        showToast('Auto-approved: ' + btn.textContent.trim(), 2000, 'info');
                        return;
                    }
                }
            });
            this._observer.observe(document.body, { childList: true, subtree: true });
        },

        _stop() { if (this._observer) this._observer.disconnect(); },
        destroy() { this._stop(); }
    };

    // =====================================================================
    //  MODULE: EXPORT (API-powered, from Lyra Exporter)
    // =====================================================================
    const ExportModule = {
        id: 'export',
        _orgId: null,
        LYRA_EXPORTER_URL: 'https://yalums.github.io/lyra-exporter/',
        LYRA_EXPORTER_ORIGIN: 'https://yalums.github.io',

        init() {
            this._captureOrgId();
        },

        _captureOrgId() {
            // Capture org ID from localStorage or ongoing fetches
            const saved = localStorage.getItem('cue_orgId');
            if (saved) this._orgId = saved;
            // Also listen for it via the StreamMonitor's intercepted fetches
            const origFetch = window.__cueFetchRef || window.fetch;
            window.__cueFetchRef = origFetch;
            const self = this;
            // Intercept to capture org ID from any API call
            const existing = window.fetch;
            const capturer = function(...args) {
                try {
                    const url = typeof args[0] === 'string' ? args[0] : args[0]?.url || '';
                    const match = url.match(/\/api\/organizations\/([a-f0-9-]+)\//);
                    if (match && match[1] && !self._orgId) {
                        self._orgId = match[1];
                        localStorage.setItem('cue_orgId', match[1]);
                    }
                } catch (e) { /* ignore */ }
                return existing.apply(this, args);
            };
            // Only wrap if StreamMonitor hasn't already wrapped with our capturer
            if (!window.__cueExportCapture) {
                window.__cueExportCapture = true;
                window.fetch = capturer;
            }
        },

        async ensureOrgId() {
            if (this._orgId) return this._orgId;
            // Try localStorage
            const saved = localStorage.getItem('cue_orgId');
            if (saved) { this._orgId = saved; return saved; }
            // Try fetching orgs API
            try {
                const r = await fetch('/api/organizations', { credentials: 'include' });
                const orgs = await r.json();
                if (orgs[0]?.uuid) {
                    this._orgId = orgs[0].uuid;
                    localStorage.setItem('cue_orgId', this._orgId);
                    return this._orgId;
                }
            } catch (e) { /* ignore */ }
            // Manual entry fallback
            const manual = prompt('Organization ID not detected.\nEnter your org ID (Settings > Account):');
            if (manual?.trim()) {
                this._orgId = manual.trim();
                localStorage.setItem('cue_orgId', this._orgId);
                return this._orgId;
            }
            return null;
        },

        getCurrentUUID() {
            return window.location.pathname.match(/\/chat\/([a-zA-Z0-9-]+)/)?.[1] || null;
        },

        async getConversation(uuid, includeImages = false) {
            const orgId = await this.ensureOrgId();
            if (!orgId) return null;
            try {
                const tree = Settings.get('exportBranchMode');
                const endpoint = tree
                    ? `/api/organizations/${orgId}/chat_conversations/${uuid}?tree=True&rendering_mode=messages&render_all_tools=true`
                    : `/api/organizations/${orgId}/chat_conversations/${uuid}`;
                const resp = await fetch(endpoint, { credentials: 'include' });
                if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
                const data = await resp.json();
                data.organization_id = orgId;
                if (includeImages && data.chat_messages) {
                    await this._embedImages(data.chat_messages);
                }
                return data;
            } catch (e) {
                console.error(LOG_TAG, 'getConversation error:', e);
                return null;
            }
        },

        async getConversationMeta(uuid) {
            try {
                const allConvs = await this.getAllConversations();
                if (!allConvs) return null;
                return allConvs.find(c => c.uuid === uuid) || null;
            } catch (e) { return null; }
        },

        async getAllConversations() {
            const orgId = await this.ensureOrgId();
            if (!orgId) return null;
            try {
                const resp = await fetch(`/api/organizations/${orgId}/chat_conversations`, { credentials: 'include' });
                if (!resp.ok) throw new Error('Fetch failed');
                return await resp.json();
            } catch (e) {
                console.error(LOG_TAG, 'getAllConversations error:', e);
                return null;
            }
        },

        async _embedImages(messages) {
            for (const msg of messages) {
                for (const key of ['files', 'files_v2', 'attachments']) {
                    if (!Array.isArray(msg[key])) continue;
                    for (const file of msg[key]) {
                        const isImage = file.file_kind === 'image' || file.file_type?.startsWith('image/');
                        const imageUrl = file.preview_url || file.thumbnail_url || file.file_url;
                        if (isImage && imageUrl && !file.embedded_image) {
                            try {
                                const fullUrl = imageUrl.startsWith('http') ? imageUrl : window.location.origin + imageUrl;
                                const imgResp = await fetch(fullUrl, { credentials: 'include' });
                                if (imgResp.ok) {
                                    const blob = await imgResp.blob();
                                    const base64 = await new Promise((res, rej) => {
                                        const r = new FileReader();
                                        r.onloadend = () => res(r.result.split(',')[1]);
                                        r.onerror = rej;
                                        r.readAsDataURL(blob);
                                    });
                                    file.embedded_image = { type: 'image', format: blob.type, size: blob.size, data: base64, original_url: imageUrl };
                                }
                            } catch (err) { /* skip image */ }
                        }
                    }
                }
            }
        },

        async exportCurrentJSON() {
            const uuid = this.getCurrentUUID();
            if (!uuid) { showToast('No conversation open (need /chat/ URL)', 3000, 'warn'); return; }
            const orgId = await this.ensureOrgId();
            if (!orgId) return;
            showToast('Fetching conversation data...', 2000, 'info');
            try {
                const includeImages = Settings.get('exportIncludeImages');
                const [data, meta] = await Promise.all([
                    this.getConversation(uuid, includeImages),
                    this.getConversationMeta(uuid)
                ]);
                if (!data) throw new Error('Failed to fetch conversation');
                if (meta) {
                    if (meta.project_uuid) data.project_uuid = meta.project_uuid;
                    if (meta.project) data.project = meta.project;
                }
                const filename = `claude_${(data.name || 'conversation').replace(/[^a-z0-9]/gi, '_').substring(0, 80)}_${uuid.substring(0, 8)}.json`;
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url; a.download = filename;
                document.body.appendChild(a); a.click(); document.body.removeChild(a);
                URL.revokeObjectURL(url);
                showToast('Exported: ' + filename, 3000, 'success');
            } catch (e) {
                showToast('Export failed: ' + e.message, 4000, 'error');
            }
        },

        async exportAllZIP() {
            const orgId = await this.ensureOrgId();
            if (!orgId) return;
            showToast('Detecting conversations...', 2000, 'info');
            let allConvs;
            try {
                allConvs = await this.getAllConversations();
                if (!allConvs || !Array.isArray(allConvs) || allConvs.length === 0) {
                    showToast('No conversations found', 3000, 'warn');
                    return;
                }
            } catch (e) {
                showToast('Failed to list conversations: ' + e.message, 4000, 'error');
                return;
            }
            const count = allConvs.length;
            const input = prompt(`Found ${count} conversations.\nHow many recent conversations to export? (0 or empty = all):`, String(count));
            if (input === null) { showToast('Export cancelled', 2000, 'info'); return; }
            let exportCount = count;
            const trimmed = input.trim();
            if (trimmed && trimmed !== '0') {
                const parsed = parseInt(trimmed, 10);
                if (isNaN(parsed) || parsed < 0) { showToast('Invalid number', 2000, 'warn'); return; }
                exportCount = Math.min(parsed, count);
            }
            const toExport = allConvs.slice(0, exportCount);
            const includeImages = Settings.get('exportIncludeImages');
            // Build individual JSON files and package as concatenated download
            // (ZIP requires fflate; fall back to sequential downloads if unavailable)
            showToast(`Exporting ${toExport.length} conversations...`, 3000, 'info');
            const files = {};
            for (let i = 0; i < toExport.length; i++) {
                const conv = toExport[i];
                if (i > 0 && i % 5 === 0) await sleep(0);
                else if (i > 0) await sleep(300);
                try {
                    const data = await this.getConversation(conv.uuid, includeImages);
                    if (data) {
                        if (conv.project_uuid) data.project_uuid = conv.project_uuid;
                        if (conv.project) data.project = conv.project;
                        const title = (data.name || conv.uuid).replace(/[^a-z0-9]/gi, '_').substring(0, 80);
                        const fname = `claude_${conv.uuid.substring(0, 8)}_${title}.json`;
                        files[fname] = JSON.stringify(data, null, 2);
                    }
                } catch (e) { /* skip failed conv */ }
                if ((i + 1) % 10 === 0 || i === toExport.length - 1) {
                    showToast(`Exported ${i + 1}/${toExport.length}...`, 2000, 'info');
                }
            }
            const fileCount = Object.keys(files).length;
            if (fileCount === 0) { showToast('No conversations exported', 3000, 'warn'); return; }
            // Try ZIP with fflate if available
            if (typeof fflate !== 'undefined' && fflate.zipSync && fflate.strToU8) {
                const zipEntries = {};
                for (const [name, content] of Object.entries(files)) {
                    zipEntries[name] = fflate.strToU8(content);
                }
                const zipped = fflate.zipSync(zipEntries, { level: 6 });
                const blob = new Blob([zipped], { type: 'application/zip' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url; a.download = `claude_export_${new Date().toISOString().slice(0, 10)}.zip`;
                document.body.appendChild(a); a.click(); document.body.removeChild(a);
                URL.revokeObjectURL(url);
                showToast(`Exported ${fileCount} conversations as ZIP!`, 3500, 'success');
            } else {
                // Fallback: download as single combined JSON
                const combined = Object.values(files).map(f => JSON.parse(f));
                const blob = new Blob([JSON.stringify(combined, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url; a.download = `claude_export_all_${new Date().toISOString().slice(0, 10)}.json`;
                document.body.appendChild(a); a.click(); document.body.removeChild(a);
                URL.revokeObjectURL(url);
                showToast(`Exported ${fileCount} conversations as JSON! (Install fflate for ZIP)`, 4000, 'success');
            }
        },

        async previewInLyra() {
            const uuid = this.getCurrentUUID();
            if (!uuid) { showToast('No conversation open', 3000, 'warn'); return; }
            showToast('Fetching for Lyra preview...', 2000, 'info');
            try {
                const includeImages = Settings.get('exportIncludeImages');
                const [data, meta] = await Promise.all([
                    this.getConversation(uuid, includeImages),
                    this.getConversationMeta(uuid)
                ]);
                if (!data) throw new Error('Failed to fetch conversation');
                if (meta) {
                    if (meta.project_uuid) data.project_uuid = meta.project_uuid;
                    if (meta.project) data.project = meta.project;
                }
                const jsonString = JSON.stringify(data, null, 2);
                const filename = `claude_${(data.name || 'conversation').replace(/[^a-z0-9]/gi, '_').substring(0, 80)}_${uuid.substring(0, 8)}.json`;
                const exporterWindow = window.open(this.LYRA_EXPORTER_URL, '_blank');
                if (!exporterWindow) {
                    showToast('Popup blocked! Allow popups for claude.ai', 4000, 'error');
                    return;
                }
                const checkInterval = setInterval(() => {
                    try { exporterWindow.postMessage({ type: 'LYRA_HANDSHAKE', source: 'cue-script' }, this.LYRA_EXPORTER_ORIGIN); } catch (e) { /* cross-origin expected */ }
                }, 1000);
                const handleMessage = (event) => {
                    if (event.origin !== this.LYRA_EXPORTER_ORIGIN) return;
                    if (event.data?.type === 'LYRA_READY') {
                        clearInterval(checkInterval);
                        exporterWindow.postMessage({
                            type: 'LYRA_LOAD_DATA', source: 'cue-script',
                            data: { content: jsonString, filename }
                        }, this.LYRA_EXPORTER_ORIGIN);
                        window.removeEventListener('message', handleMessage);
                        showToast('Sent to Lyra Exporter!', 2500, 'success');
                    }
                };
                window.addEventListener('message', handleMessage);
                setTimeout(() => { clearInterval(checkInterval); window.removeEventListener('message', handleMessage); }, 30000);
            } catch (e) {
                showToast('Preview failed: ' + e.message, 4000, 'error');
            }
        },

        exportMarkdown() {
            const main = document.querySelector('main');
            if (!main) { showToast('No conversation found', 2000, 'warn'); return; }
            const groups = main.querySelectorAll(SEL.msgGroup);
            if (groups.length === 0) { showToast('No messages found', 2000, 'warn'); return; }
            let md = '# Claude Conversation Export\n_Exported: ' + new Date().toISOString() + '_\n\n---\n\n';
            groups.forEach((g) => {
                const isUser = !!g.querySelector(SEL.userMsg);
                const text = g.innerText.trim();
                if (text) md += '## ' + (isUser ? 'Human' : 'Assistant') + '\n\n' + text + '\n\n---\n\n';
            });
            const blob = new Blob([md], { type: 'text/markdown' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url; a.download = 'claude-chat-' + new Date().toISOString().slice(0, 10) + '.md';
            document.body.appendChild(a); a.click(); document.body.removeChild(a);
            URL.revokeObjectURL(url);
            showToast('Chat exported as Markdown!', 2000, 'success');
        },

        destroy() {}
    };

    // =====================================================================
    //  MODULE: RESPONSE MONITOR
    // =====================================================================
    const ResponseModule = {
        id: 'responseMonitor',
        _interval: null,
        _timerInterval: null,
        _lastLen: 0,
        _lastChangeTs: 0,
        _stableCount: 0,
        _audioCtx: null,
        _flashTimer: null,
        _originalTitle: '',
        status: 'idle',  // idle | generating | stuck | complete | truncated
        genStartTime: null,
        lastDuration: 0,
        lastWords: 0,
        lastChars: 0,

        init() {
            this._lastChangeTs = Date.now();
            this._interval = setInterval(() => this._poll(), 2000);
        },

        _poll() {
            if (!Settings.get('responseMonitor')) return;
            const gen = DOM.isGenerating();
            const convo = (document.querySelector('main') || document.body).innerText;
            const now = Date.now();
            if (convo.length !== this._lastLen) { this._lastLen = convo.length; this._lastChangeTs = now; this._stableCount = 0; }
            else { this._stableCount++; }
            const wasGen = this.status === 'generating';
            if (gen) {
                if (this.status !== 'generating') {
                    this.genStartTime = Date.now();
                    this._startTimer();
                }
                this.status = 'generating';
                if (Settings.get('autoScroll')) AutoScrollModule.scrollToBottom();
                if (now - this._lastChangeTs > 90000) this.status = 'stuck';
                EventBus.emit('response:status', this.status);
            }
            else if (wasGen && this._stableCount >= 2) {
                const resp = DOM.getLastResponse();
                this.lastDuration = this.genStartTime ? Date.now() - this.genStartTime : 0;
                this._stopTimer();
                // Stats
                this.lastChars = resp.length;
                this.lastWords = resp.split(/\s+/).filter(w => w.length > 0).length;
                this.status = this._isTruncated(resp) ? 'truncated' : 'complete';
                this.genStartTime = null;
                EventBus.emit('response:status', this.status);
                EventBus.emit('response:complete', { duration: this.lastDuration, words: this.lastWords, chars: this.lastChars });
                if (Settings.get('autoScroll')) AutoScrollModule.scrollToBottom();
                // Notifications
                if (Settings.get('notifySound')) this._playSound();
                if (Settings.get('notifyFlash')) this._flashTab();
            }
            else if (!gen && this.status !== 'truncated' && this.status !== 'complete') {
                this.status = 'idle';
                EventBus.emit('response:status', this.status);
            }
        },

        _startTimer() {
            this._stopTimer();
            this._timerInterval = setInterval(() => EventBus.emit('response:timer', this.genStartTime ? Date.now() - this.genStartTime : 0), 200);
        },
        _stopTimer() {
            if (this._timerInterval) { clearInterval(this._timerInterval); this._timerInterval = null; }
        },

        _isTruncated(text) {
            if (!text || text.length < 50) return false;
            const t = text.trim();
            if ((t.match(/```/g) || []).length % 2 !== 0) return true;
            const tail = t.toLowerCase().slice(-300);
            for (const s of ['continue to keep the chat going', 'response was cut off', 'character limit', 'length limit', 'hit the limit']) { if (tail.includes(s)) return true; }
            const ll = t.split('\n').filter(l => l.trim()).pop() || '';
            if (!/[.!?:)`}\]>]$|COMPLETE$/i.test(ll.trim()) && !/[{;=,]$/.test(ll.trim()) && ll.length > 30) return true;
            return false;
        },

        _playSound() {
            if (document.hasFocus()) return;
            try {
                if (!this._audioCtx) this._audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                const now = this._audioCtx.currentTime;
                [660, 880].forEach((freq, i) => {
                    const osc = this._audioCtx.createOscillator();
                    const gain = this._audioCtx.createGain();
                    osc.type = 'sine'; osc.frequency.value = freq;
                    gain.gain.setValueAtTime(0.12, now + i * 0.12);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.25);
                    osc.connect(gain); gain.connect(this._audioCtx.destination);
                    osc.start(now + i * 0.12); osc.stop(now + i * 0.12 + 0.25);
                });
            } catch (e) { /* AudioContext not available */ }
        },

        _flashTab() {
            if (document.hasFocus()) return;
            this._stopFlash();
            this._originalTitle = document.title;
            let on = true;
            this._flashTimer = setInterval(() => { document.title = on ? '>> Claude Done <<' : this._originalTitle; on = !on; }, 800);
            const stopOnFocus = () => { this._stopFlash(); window.removeEventListener('focus', stopOnFocus); };
            window.addEventListener('focus', stopOnFocus);
            setTimeout(() => this._stopFlash(), 30000);
        },
        _stopFlash() {
            if (this._flashTimer) { clearInterval(this._flashTimer); this._flashTimer = null; if (this._originalTitle) document.title = this._originalTitle; }
        },

        destroy() { clearInterval(this._interval); this._stopTimer(); this._stopFlash(); }
    };

    // =====================================================================
    //  MODULE: DOM TRIMMER
    // =====================================================================
    const DomTrimmerModule = {
        id: 'domTrimmer',
        _observer: null,
        _cache: new Map(),

        init() {
            EventBus.on('setting:domTrimmer', (v) => { if (!v) this.restoreAll(); });
            this._observer = new MutationObserver(() => {
                if (Settings.get('domTrimmer')) this._prune();
            });
            if (document.body) this._observer.observe(document.body, { childList: true, subtree: true });
        },

        _getMessages() {
            const main = $(SEL.main);
            if (!main) return [];
            // Look for conversation message groups
            return $$('.group, [data-testid="user-message"]', main).map(el => {
                // Walk up to find the actual removable container
                let target = el;
                while (target.parentElement && target.parentElement !== main && !target.parentElement.matches('main, [class*="flex-col"]')) {
                    target = target.parentElement;
                }
                return target;
            }).filter((el, i, arr) => arr.indexOf(el) === i); // deduplicate
        },

        _prune() {
            const msgs = this._getMessages();
            const keep = Settings.get('domKeepVisible');
            if (msgs.length <= keep) return;
            const toRemove = msgs.slice(0, msgs.length - keep);
            toRemove.forEach(el => {
                if (el.dataset.cueTrimmed) return;
                const id = 'trim-' + (this._cache.size + 1);
                const placeholder = document.createElement('div');
                placeholder.className = PREFIX + '-trim-placeholder';
                placeholder.dataset.trimId = id;
                placeholder.style.cssText = 'height:4px;margin:2px 0;background:rgba(128,128,128,0.1);border-radius:2px;';
                this._cache.set(id, { html: el.outerHTML, parent: el.parentElement, next: el.nextSibling });
                el.replaceWith(placeholder);
            });
            EventBus.emit('trimmer:pruned', { removed: toRemove.length, total: msgs.length });
        },

        restoreAll() {
            this._cache.forEach((data, id) => {
                const ph = $(`[data-trim-id="${id}"]`);
                if (ph) {
                    const tmp = document.createElement('div');
                    tmp.innerHTML = data.html;
                    ph.replaceWith(tmp.firstElementChild);
                }
            });
            this._cache.clear();
            EventBus.emit('trimmer:restored');
        },

        destroy() {
            if (this._observer) this._observer.disconnect();
            this.restoreAll();
        }
    };

    // =====================================================================
    //  MODULE: PROMPT LIBRARY
    // =====================================================================
    const PromptModule = {
        id: 'promptLibrary',
        STORAGE_KEY: PREFIX + '_prompts',
        prompts: [],

        DEFAULT_PROMPTS: [
            { id: 'spec', label: 'Spec', cat: 'pipeline', prompt: `You are now in **AUTOPILOT MODE**. A userscript monitors this chat and will send follow-up prompts.\n\n**PROJECT:**\n[DESCRIBE YOUR PROJECT HERE]\n\n**PROTOCOL:**\n1. End EVERY response with: \`STATUS: [STAGE] COMPLETE\` or \`STATUS: [STAGE] CONTINUING\`\n2. If cut off, I will send "CONTINUE" - pick up EXACTLY where you left off\n3. Write **production-ready, complete code** - NO placeholders, NO TODO stubs\n4. Include ALL imports, ALL error handling, ALL edge cases\n5. NEVER hallucinate packages - only use packages you are certain exist\n\n---\n\n**PHASE: SPECIFICATION**\n\nBefore ANY code, create a complete spec:\n1. **Requirements** - Functional + non-functional\n2. **User Stories** - 3-5 key stories\n3. **Inputs & Outputs** - Data flow\n4. **Edge Cases** - Boundary conditions, failure modes\n5. **Acceptance Criteria** - How we verify each feature\n6. **Security** - Auth, validation, sanitization needs\n7. **Dependencies** - Only packages you are 100% certain exist\n\nEnd with: \`STATUS: SPEC COMPLETE\`` },
            { id: 'arch', label: 'Architecture', cat: 'pipeline', prompt: `AUTOPILOT: **ARCHITECTURE PHASE**\n\nDefine the technical architecture from the spec:\n1. **Tech Stack** - Language, frameworks, tools (justify each)\n2. **Project Structure** - Complete directory/file tree\n3. **Data Models** - All types, interfaces, schemas, enums\n4. **Component Map** - Module connections, dependency graph\n5. **API Surface** - Function signatures, entry points, CLI args\n6. **Configuration** - Settings, env vars, defaults\n7. **Error Strategy** - Error types, handling patterns\n\nEnd with: \`STATUS: ARCHITECTURE COMPLETE\`` },
            { id: 'plan', label: 'Plan', cat: 'pipeline', prompt: `AUTOPILOT: **PLANNING PHASE**\n\nBreak implementation into numbered phases. Each must be self-contained and ordered by dependency (data models -> logic -> UI -> integration).\n\nFormat:\nPHASE 1: [Name] - [What gets built]\nPHASE 2: [Name] - [What gets built]\n...\n\nAlso list tests for each phase.\n\nEnd with: \`STATUS: PLAN COMPLETE\`` },
            { id: 'build', label: 'Build Phase', cat: 'pipeline', prompt: `AUTOPILOT: Build **PHASE [N]** now.\n\nRefer to the plan. Write complete, production-ready code:\n- Complete file contents with ALL imports\n- Full error handling and input validation\n- Inline comments for non-obvious logic\n- Consistent with architecture above\n- Only real, verified packages\n\nEnd with: \`STATUS: PHASE [N] COMPLETE\`` },
            { id: 'mid_audit', label: 'Mid Audit', cat: 'pipeline', prompt: `AUTOPILOT: **MID-BUILD AUDIT**\n\nReview ALL code so far:\n1. **Consistency** - Same patterns, naming, types across phases?\n2. **Integration** - Will phases connect? Mismatched signatures?\n3. **Missing imports** - Undefined references across files?\n4. **Data flow** - Data passes correctly between components?\n5. **Error handling** - Unhandled exceptions or silent failures?\n6. **Security** - Input validation, injection, exposed secrets?\n7. **Dependencies** - All packages real and correct versions?\n\nFix every issue. Show corrected code.\n\nEnd with: \`STATUS: MID_AUDIT COMPLETE\`` },
            { id: 'testing', label: 'Testing', cat: 'pipeline', prompt: `AUTOPILOT: **TESTING PHASE**\n\nGenerate comprehensive test suite:\n1. **Unit Tests** - Each function/method independently\n2. **Integration Tests** - Component interactions\n3. **Edge Cases** - Boundary values, empty/malformed inputs\n4. **Error Paths** - Verify error handling works\n5. **Smoke Tests** - End-to-end happy path\n\nUse appropriate framework. Single-command runnable.\n\nEnd with: \`STATUS: TESTING COMPLETE\`` },
            { id: 'final_audit', label: 'Final Audit', cat: 'pipeline', prompt: `AUTOPILOT: **FINAL AUDIT**\n\nComplete final review:\n1. **Code Quality** - Dead code, duplication, complexity\n2. **Security** - SQL injection, XSS, path traversal, hardcoded secrets, input validation\n3. **Completeness** - Compare against original spec\n4. **Performance** - Bottlenecks, N+1 queries, unbounded loops\n5. **Error Messages** - Helpful and user-friendly?\n6. **Documentation** - Functions documented? README complete?\n7. **Dependencies** - All packages real and necessary?\n8. **Cross-platform** - Works on Win/macOS/Linux?\n\nFix everything. Show corrected code.\n\nEnd with: \`STATUS: FINAL_AUDIT COMPLETE\`` },
            { id: 'features', label: 'Features', cat: 'pipeline', prompt: `AUTOPILOT: **FEATURE ENHANCEMENT**\n\nAdd polish:\n1. Edge cases not yet handled\n2. UX/DX improvements - progress bars, colors, formatting\n3. Configuration - make hardcoded values configurable\n4. Logging - structured with levels\n5. Help/usage - --help, usage examples\n6. Graceful degradation - missing deps, network failures\n7. Performance - caching, lazy loading where applicable\n\nImplement all with complete code.\n\nEnd with: \`STATUS: FEATURES COMPLETE\`` },
            { id: 'branding', label: 'Branding', cat: 'pipeline', prompt: `AUTOPILOT: **BRANDING PHASE**\n\n1. **AI Logo Prompt** - Detailed prompt for DALL-E 3 / Midjourney / Stable Diffusion to generate a professional logo\n2. **Color Palette** - 5-6 hex codes with names and usage\n3. **Tagline** - One-line project description\n4. **Icon Concepts** - 2-3 favicon/app icon ideas\n5. **ASCII Banner** - For CLI/README\n\nEnd with: \`STATUS: BRANDING COMPLETE\`` },
            { id: 'packaging', label: 'Packaging', cat: 'pipeline', prompt: `AUTOPILOT: **PACKAGING PHASE**\n\n1. **Standalone Executable** - Best tool for language (PyInstaller/pkg/nexe/go build), build script, config, icon, metadata, one-command build\n2. **Portable Executable** - No install, runs from USB, self-contained, portable config\n3. **Build README** - Steps, prerequisites, troubleshooting\n4. **Release Script** - Automated build + package + hash\n\nEnd with: \`STATUS: PACKAGING COMPLETE\`` },
            { id: 'summary', label: 'Summary', cat: 'pipeline', prompt: `AUTOPILOT: **FINAL SUMMARY**\n\n1. **File Manifest** - Every file, purpose, path\n2. **Quick Start** - 3 steps or fewer\n3. **Full Setup** - All platforms\n4. **Usage Guide** - Commands, flags, config, examples\n5. **Build Guide** - Standalone + portable compilation\n6. **Architecture Diagram** - ASCII component diagram\n7. **Tech Stack** - Languages, frameworks, tools, versions\n8. **Known Limitations** - Honest assessment\n9. **Future Roadmap** - Suggested next features\n\nEnd with: \`STATUS: PROJECT COMPLETE\`` },
            { id: 'continue', label: 'Continue', cat: 'recovery', prompt: 'CONTINUE - Your response was cut off. Pick up EXACTLY where you stopped. Do not repeat anything.' },
            { id: 'continue_ctx', label: 'Continue +Ctx', cat: 'recovery', prompt: 'CONTINUE - Your response was cut off. Check the roadmap/plan above, find where you stopped, and continue from that exact point. Do not restart or repeat.' },
            { id: 'stuck', label: 'Stuck Recovery', cat: 'recovery', prompt: 'AUTOPILOT RECOVERY: Your last response appears stuck or incomplete.\n\nPlease check the conversation above, identify where you left off, and CONTINUE from that point. Do not restart.\n\nEnd with the appropriate STATUS line when done.' },
            { id: 'next_phase', label: 'Next Phase', cat: 'recovery', prompt: 'AUTOPILOT: Previous phase done. Build the NEXT phase from the plan. Complete, production-ready code.\n\nEnd with: `STATUS: PHASE [N] COMPLETE`' },
            { id: 'analyze', label: 'Analyze Chat', cat: 'resume', prompt: `AUTOPILOT: **RESUME MODE - PROJECT ANALYSIS**\n\nAnalyze the conversation above and determine:\n1. **Project** - What is being built?\n2. **Current State** - What has been completed?\n3. **Files Created** - All code produced so far\n4. **Last Phase** - What was last completed?\n5. **Next Steps** - What needs building?\n6. **Issues** - Incomplete code, broken refs, errors?\n\nProvide numbered remaining phases.\n\nEnd with: \`STATUS: ANALYSIS COMPLETE\`` },
            { id: 'resume_build', label: 'Resume Build', cat: 'resume', prompt: 'AUTOPILOT: **RESUMING BUILD**\n\nContinue building from where the project left off. Build the next incomplete phase.\n\nWrite complete, production-ready code. NO placeholders. All imports, error handling.\n\nEnd with: `STATUS: PHASE COMPLETE`' },
            { id: 'custom1', label: 'Custom 1', cat: 'custom', prompt: '' },
            { id: 'custom2', label: 'Custom 2', cat: 'custom', prompt: '' },
            { id: 'custom3', label: 'Custom 3', cat: 'custom', prompt: '' },
            { id: 'custom4', label: 'Custom 4', cat: 'custom', prompt: '' },
        ],

        CATEGORIES: [
            { id: 'pipeline', label: 'Build Pipeline', color: '#58a6ff' },
            { id: 'recovery', label: 'Recovery', color: '#d29922' },
            { id: 'resume', label: 'Resume Project', color: '#bc8cff' },
            { id: 'custom', label: 'Custom', color: '#3fb950' },
        ],

        init() { this._load(); },

        _load() {
            try {
                const saved = GM_getValue(this.STORAGE_KEY, null);
                if (saved) {
                    const parsed = JSON.parse(saved);
                    this.prompts = this.DEFAULT_PROMPTS.map(def => {
                        const s = parsed.find(p => p.id === def.id);
                        return s ? { ...def, label: s.label, prompt: s.prompt } : { ...def };
                    });
                    // Keep any extra custom prompts
                    parsed.forEach(p => { if (!this.prompts.find(x => x.id === p.id)) this.prompts.push(p); });
                    return;
                }
            } catch (e) { /* ignore */ }
            this.prompts = this.DEFAULT_PROMPTS.map(d => ({ ...d }));
        },

        save() {
            GM_setValue(this.STORAGE_KEY, JSON.stringify(this.prompts.map(p => ({ id: p.id, label: p.label, prompt: p.prompt, cat: p.cat }))));
        },

        add(label, prompt, cat = 'custom') {
            const id = 'user_' + Date.now();
            this.prompts.push({ id, label, prompt, cat });
            this.save();
            return id;
        },

        update(id, label, prompt) {
            const p = this.prompts.find(x => x.id === id);
            if (p) { p.label = label; p.prompt = prompt; this.save(); }
        },

        remove(id) {
            this.prompts = this.prompts.filter(p => p.id !== id);
            this.save();
        },

        async send(promptText) {
            const text = promptText.trim();
            if (!text) { showToast('Prompt is empty', 2000, 'warn'); return; }
            try {
                await DOM.sendMessage(text);
                if (Settings.get('autoScroll')) setTimeout(() => AutoScrollModule.scrollToBottom(), 500);
            } catch (e) { showToast('Send failed: ' + e.message, 3000, 'error'); }
        },

        destroy() {}
    };

    // =====================================================================
    //  CODE BLOCK SCANNER (from Prompt Deck v1.4)
    // =====================================================================
    function extractCleanCode(el) {
        const clone = el.cloneNode(true);
        // Remove line number elements
        const lineNumSelectors = [
            '[class*="line-number"]', '[class*="linenumber"]', '[class*="line-num"]',
            '[class*="LineNumber"]', '[class*="ln-num"]', '[class*="hljs-ln-n"]',
            '[class*="gutter"]', '[class*="Gutter"]',
            '[class*="line-numbers-row"]', '[class*="line-count"]',
            'td.hljs-ln-numbers', '.hljs-ln-numbers',
            '[data-line-number]', '[aria-hidden="true"]',
        ].join(',');
        try { clone.querySelectorAll(lineNumSelectors).forEach(n => n.remove()); } catch (e) { /* selector issue */ }
        // If table layout (hljs-ln pattern), keep only code cells
        const codeCells = clone.querySelectorAll('td.hljs-ln-code, td[class*="code"], td:last-child');
        if (codeCells.length > 0) {
            const lines = []; codeCells.forEach(td => lines.push(td.textContent || ''));
            const joined = lines.join('\n').trim();
            if (joined.length >= 10) return joined;
        }
        let text = clone.innerText || clone.textContent || '';
        // Regex fallback: strip leading line numbers if most lines match
        const rawLines = text.split('\n');
        const numPattern = /^\s*\d{1,5}[\s\t]/;
        const matchCount = rawLines.filter(l => l.trim() && numPattern.test(l)).length;
        const nonEmptyCount = rawLines.filter(l => l.trim()).length;
        if (nonEmptyCount > 2 && matchCount / nonEmptyCount > 0.7) {
            let sequential = 0, lastNum = 0;
            for (const line of rawLines) {
                const m = line.match(/^\s*(\d{1,5})[\s\t]/);
                if (m) { const n = parseInt(m[1], 10); if (n === lastNum + 1) sequential++; lastNum = n; }
            }
            if (sequential >= Math.min(nonEmptyCount - 2, 3)) {
                text = rawLines.map(l => l.replace(/^\s*\d{1,5}[\s\t]/, '')).join('\n');
            }
        }
        return text.trim();
    }

    function scanCodeBlocks() {
        const blocks = [];
        const seen = new Set();
        function addBlock(el, text, source) {
            const t = (text || extractCleanCode(el)).trim();
            if (t.length < 10 || seen.has(t)) return;
            seen.add(t);
            let lang = 'code';
            const codeEl = el.tagName === 'CODE' ? el : el.querySelector('code');
            if (codeEl) { for (const cls of codeEl.classList) { const m = cls.match(/^(?:language-|lang-|hljs-)(.+)$/); if (m) { lang = m[1]; break; } } }
            const wrapper = el.closest('[class*="code"]') || el.closest('[data-language]');
            if (wrapper) {
                const dl = wrapper.getAttribute('data-language'); if (dl) lang = dl;
                const labelEl = wrapper.querySelector('[class*="text-text-"]') || wrapper.querySelector('span');
                if (labelEl && labelEl.textContent.trim().length < 20 && !labelEl.textContent.includes(' ')) {
                    const candidate = labelEl.textContent.trim().toLowerCase();
                    if (candidate && /^[a-z0-9#+._-]+$/i.test(candidate)) lang = candidate;
                }
            }
            const prev = el.previousElementSibling || (el.parentElement && el.parentElement.previousElementSibling);
            if (prev && prev.textContent && prev.textContent.trim().length < 25) {
                const ht = prev.textContent.trim().toLowerCase();
                if (ht && /^[a-z0-9#+._-]+$/i.test(ht) && !ht.includes(' ')) lang = ht;
            }
            const lines = t.split('\n').length;
            const preview = t.split('\n').slice(0, 2).join(' ').substring(0, 55);
            blocks.push({ idx: blocks.length, lang, lines, preview, text: t, el, source });
        }
        // Strategy 1: All <pre> elements
        document.querySelectorAll('pre').forEach(pre => {
            if (pre.closest('#' + PREFIX + '-panel')) return;
            const code = pre.querySelector('code') || pre;
            addBlock(code, null, 'pre');
        });
        // Strategy 2: Multi-line <code> not inside <pre>
        document.querySelectorAll('code').forEach(code => {
            if (code.closest('#' + PREFIX + '-panel') || code.closest('pre')) return;
            const raw = code.innerText || code.textContent || '';
            if (raw.includes('\n') && raw.trim().length >= 10) addBlock(code, null, 'code');
        });
        // Strategy 3: Code-related classes/attributes
        const codeSelectors = [
            '[class*="code-block"]', '[class*="code_block"]', '[class*="codeblock"]',
            '[class*="CodeBlock"]', '[class*="code-content"]', '[class*="hljs"]',
            '[class*="shiki"]', '[class*="prism"]', '[class*="highlight"]',
            '[data-code]', '[data-language]',
        ].join(',');
        try {
            document.querySelectorAll(codeSelectors).forEach(el => {
                if (el.closest('#' + PREFIX + '-panel')) return;
                if (el.querySelector('pre') || el.closest('pre')) return;
                const text = el.innerText || el.textContent || '';
                if (text.includes('\n') && text.trim().length >= 10) addBlock(el, null, 'class');
            });
        } catch (e) { /* invalid selector */ }
        // Strategy 4: Find copy buttons and trace back to code containers
        document.querySelectorAll('button').forEach(btn => {
            if (btn.closest('#' + PREFIX + '-panel')) return;
            const txt = (btn.textContent || '').toLowerCase().trim();
            const ariaLabel = (btn.getAttribute('aria-label') || '').toLowerCase();
            if (txt === 'copy' || txt === 'copy code' || ariaLabel.includes('copy')) {
                let container = btn.closest('[class*="code"]') || btn.closest('[class*="Code"]') || btn.parentElement?.parentElement;
                if (!container) return;
                const pre = container.querySelector('pre');
                const code = container.querySelector('code');
                const target = pre || code || container;
                const text = target.innerText || target.textContent || '';
                if (text.trim().length >= 10) addBlock(target, null, 'copy-btn');
            }
        });
        return blocks;
    }

    // =====================================================================
    //  MODULE: KEYBOARD SHORTCUTS
    // =====================================================================
    const ShortcutsModule = {
        id: 'shortcuts',
        _handler: null,

        init() {
            this._handler = (e) => {
                if (!Settings.get('shortcuts')) return;
                // Allow Ctrl+Shift combos even in editors (they're unusual enough)
                const tag = (e.target.tagName || '').toLowerCase();
                const editable = e.target.isContentEditable || tag === 'input' || tag === 'textarea';
                if (!e.ctrlKey || !e.shiftKey) { if (editable) return; }
                if (!e.ctrlKey || !e.shiftKey) return;

                switch (e.key.toUpperCase()) {
                    case 'D': e.preventDefault(); ControlPanel.toggle(); break;
                    case 'K': e.preventDefault(); this._copyLastCode(); break;
                    case 'C':
                        // Only if no text selected (don't override normal Ctrl+Shift+C)
                        if (window.getSelection().toString().length === 0) { e.preventDefault(); this._copyLastResponse(); }
                        break;
                    case 'E': e.preventDefault(); ExportModule.exportCurrentJSON(); break;
                }
            };
            document.addEventListener('keydown', this._handler, true);
        },

        _copyLastCode() {
            const blocks = scanCodeBlocks();
            if (blocks.length > 0) {
                const last = blocks[blocks.length - 1];
                navigator.clipboard.writeText(last.text).then(() => {
                    showToast('Copied ' + last.lang + ' (' + last.lines + 'L)', 2000, 'success');
                }).catch(() => {});
            } else { showToast('No code blocks found', 2000, 'warn'); }
        },

        _copyLastResponse() {
            const text = DOM.getLastResponse();
            if (!text) { showToast('No response to copy', 2000, 'warn'); return; }
            navigator.clipboard.writeText(text).then(() => {
                showToast('Copied response (' + text.split(/\s+/).length + ' words)', 2000, 'success');
            }).catch(() => {
                // Fallback
                const ta = document.createElement('textarea'); ta.value = text;
                ta.style.cssText = 'position:fixed;left:-9999px'; document.body.appendChild(ta);
                ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
                showToast('Copied response (fallback)', 2000, 'success');
            });
        },

        destroy() {
            if (this._handler) document.removeEventListener('keydown', this._handler, true);
        }
    };

    // =====================================================================
    //  CONTROL PANEL UI
    // =====================================================================
    const ControlPanel = {
        _panel: null,
        _visible: false,
        _usageData: null,
        _claudeSettings: null,
        _refreshTimer: null,

        FEATURES: [
            { key: 'enabled_monkeys_in_a_barrel', name: 'Code Execution', desc: 'Virtual code environment', exclusive: 'enabled_artifacts_attachments' },
            { key: 'enabled_artifacts_attachments', name: 'Repl Tool', desc: 'Additional Artifacts features', exclusive: 'enabled_monkeys_in_a_barrel' },
            { key: 'enabled_saffron', name: 'Memory', desc: 'Cross-conversation memory' },
            { key: 'enabled_saffron_search', name: 'Search Chats', desc: 'Chat history search' },
            { key: 'enabled_sourdough', name: 'Projects', desc: 'Project memory' },
        ],

        toggle() {
            if (this._panel) { this._panel.classList.toggle(PREFIX + '-panel-hidden'); this._visible = !this._visible; }
        },

        async build() {
            if (this._panel) return;

            this._createStyles();
            this._panel = document.createElement('div');
            this._panel.id = PREFIX + '-panel';
            this._panel.className = PREFIX + '-panel-hidden';

            this._panel.innerHTML = this._getHTML();
            document.body.appendChild(this._panel);
            this._bindEvents();
            this._loadData();

            // Auto-refresh usage every 60s
            this._refreshTimer = setInterval(() => this._loadData(), 60000);
        },

        _createStyles() {
            injectCSS(PREFIX + '-panel-css', `
                /* Hover trigger strip - invisible 6px strip on right edge */
                #${PREFIX}-hover-strip {
                    position: fixed; top: 20%; right: 0; width: 6px; height: 60vh;
                    z-index: 99998; cursor: pointer;
                }
                #${PREFIX}-hover-strip::after {
                    content: ''; position: absolute; top: 50%; right: 0;
                    transform: translateY(-50%); width: 3px; height: 60px;
                    background: rgba(88,166,255,0.2); border-radius: 2px;
                    transition: opacity 0.3s, background 0.3s;
                }
                #${PREFIX}-hover-strip:hover::after { background: rgba(88,166,255,0.5); width: 4px; }

                /* Panel container */
                #${PREFIX}-panel {
                    position: fixed; top: 0; right: 0; width: 310px; height: 100vh;
                    background: #0d0d14; border-left: 1px solid #2a2a3a;
                    z-index: 99999; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                    color: #c8c8d8; font-size: 11px; overflow-y: auto; overflow-x: hidden;
                    transition: transform 0.3s cubic-bezier(0.4,0,0.2,1);
                    box-shadow: -4px 0 30px rgba(0,0,0,0.5);
                    display: flex; flex-direction: column;
                }
                #${PREFIX}-panel.${PREFIX}-panel-hidden { transform: translateX(100%); pointer-events: none; }
                #${PREFIX}-panel::-webkit-scrollbar { width: 4px; }
                #${PREFIX}-panel::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 2px; }

                /* Header - minimal */
                .${PREFIX}-hdr {
                    display: flex; align-items: center; justify-content: space-between;
                    padding: 4px 8px; background: rgba(255,255,255,0.03);
                    border-bottom: 1px solid #2a2a3a; flex-shrink: 0;
                }
                .${PREFIX}-hdr h2 { margin: 0; font-size: 12px; font-weight: 600; color: #e8e8f0; }
                .${PREFIX}-hdr-ver { font-size: 9px; color: #555; margin-left: 4px; }
                .${PREFIX}-close {
                    background: none; border: none; color: #555; width: 20px; height: 20px;
                    cursor: pointer; font-size: 14px; display: flex; align-items: center;
                    justify-content: center; border-radius: 4px;
                }
                .${PREFIX}-close:hover { color: #f88; background: rgba(255,80,80,0.1); }

                /* Sections - ultra compact */
                .${PREFIX}-section { padding: 2px 8px; border-bottom: 1px solid rgba(255,255,255,0.04); }
                .${PREFIX}-section-title {
                    font-size: 9px; font-weight: 700; text-transform: uppercase;
                    letter-spacing: 1px; color: #58a6ff; margin: 2px 0 1px;
                }

                /* Rows */
                .${PREFIX}-row {
                    display: flex; align-items: center; justify-content: space-between;
                    padding: 1px 0; min-height: 18px;
                }
                .${PREFIX}-row-label { color: #a8a8b8; font-size: 11px; }

                /* Toggle switch - compact */
                .${PREFIX}-toggle {
                    position: relative; width: 28px; height: 14px; cursor: pointer; display: inline-block; flex-shrink: 0;
                }
                .${PREFIX}-toggle input { opacity: 0; width: 0; height: 0; position: absolute; }
                .${PREFIX}-toggle-track {
                    position: absolute; inset: 0; background: #2a2a3a; border-radius: 7px;
                    transition: background 0.2s;
                }
                .${PREFIX}-toggle input:checked + .${PREFIX}-toggle-track { background: #3fb950; }
                .${PREFIX}-toggle-thumb {
                    position: absolute; top: 2px; left: 2px; width: 10px; height: 10px;
                    background: #d0d0d0; border-radius: 50%; transition: transform 0.2s;
                }
                .${PREFIX}-toggle input:checked ~ .${PREFIX}-toggle-thumb { transform: translateX(14px); background: #fff; }

                /* Slider - compact */
                .${PREFIX}-slider {
                    height: 3px; -webkit-appearance: none; appearance: none;
                    background: #2a2a3a; border-radius: 2px; outline: none; margin: 0;
                }
                .${PREFIX}-slider::-webkit-slider-thumb {
                    -webkit-appearance: none; width: 12px; height: 12px;
                    background: #58a6ff; border-radius: 50%; cursor: pointer;
                }

                /* Select - compact */
                .${PREFIX}-select {
                    background: #1a1a2a; color: #c8c8d8; border: 1px solid #2a2a3a;
                    border-radius: 4px; padding: 1px 4px; font-size: 10px; cursor: pointer; outline: none;
                }

                /* Usage bars - compact */
                .${PREFIX}-usage-bar {
                    height: 5px; background: #1a1a2a; border-radius: 3px;
                    overflow: hidden; margin: 2px 0 1px;
                }
                .${PREFIX}-usage-fill {
                    height: 100%; border-radius: 3px; transition: width 0.5s;
                    background: linear-gradient(90deg, #3fb950, #58a6ff);
                }
                .${PREFIX}-usage-fill.warn { background: linear-gradient(90deg, #d29922, #e8a020); }
                .${PREFIX}-usage-fill.danger { background: linear-gradient(90deg, #f85149, #ff6b6b); }
                .${PREFIX}-usage-pct { font-size: 10px; color: #888; }

                /* Feature toggle rows - compact */
                .${PREFIX}-feat-row {
                    display: flex; align-items: center; justify-content: space-between;
                    padding: 1px 0;
                }
                .${PREFIX}-feat-name { font-size: 11px; color: #c8c8d8; }
                .${PREFIX}-feat-desc { display: none; }
                .${PREFIX}-feat-btn {
                    padding: 1px 8px; border-radius: 4px; border: 1px solid #2a2a3a;
                    cursor: pointer; font-size: 9px; font-weight: 600; transition: all 0.2s;
                    min-width: 32px; text-align: center;
                }
                .${PREFIX}-feat-btn.on { background: rgba(63,185,80,0.15); color: #3fb950; border-color: rgba(63,185,80,0.3); }
                .${PREFIX}-feat-btn.off { background: rgba(255,255,255,0.04); color: #888; }
                .${PREFIX}-feat-btn:hover { opacity: 0.8; }

                /* Export buttons */
                .${PREFIX}-export-btn {
                    display: block; width: 100%; padding: 3px 8px; margin: 0;
                    background: rgba(88,166,255,0.08); color: #8cb4e0;
                    border: 1px solid rgba(88,166,255,0.15); border-radius: 4px;
                    cursor: pointer; font-size: 10px; font-weight: 500;
                    text-align: left; transition: all 0.2s;
                }
                .${PREFIX}-export-btn:hover { background: rgba(88,166,255,0.18); color: #b0d4ff; border-color: rgba(88,166,255,0.35); }

                /* Status dot */
                .${PREFIX}-status-dot {
                    width: 6px; height: 6px; border-radius: 50%; display: inline-block; margin-right: 4px;
                }
                .${PREFIX}-status-dot.idle { background: #555; }
                .${PREFIX}-status-dot.generating { background: #d29922; animation: ${PREFIX}-pulse 1.2s infinite; }
                .${PREFIX}-status-dot.complete { background: #3fb950; }
                .${PREFIX}-status-dot.stuck { background: #f85149; }
                .${PREFIX}-status-dot.truncated { background: #f85149; }
                @keyframes ${PREFIX}-pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }

                /* Prompt buttons - compact */
                .${PREFIX}-prompt-btn {
                    display: inline-flex; align-items: center;
                    padding: 2px 6px; border-radius: 4px; border: 1px solid #2a2a3a;
                    background: rgba(255,255,255,0.03); color: #c8c8d8;
                    cursor: pointer; font-size: 10px; transition: all 0.2s; margin: 1px;
                }
                .${PREFIX}-prompt-btn:hover { background: rgba(88,166,255,0.1); border-color: #58a6ff40; color: #fff; }
                .${PREFIX}-prompt-cat { display: none; }

                /* Prompt editor modal */
                .${PREFIX}-modal-overlay {
                    position: fixed; inset: 0; background: rgba(0,0,0,0.6);
                    z-index: 100000; display: flex; align-items: center; justify-content: center;
                    backdrop-filter: blur(4px);
                }
                .${PREFIX}-modal {
                    background: #0d0d14; border: 1px solid #2a2a3a; border-radius: 12px;
                    padding: 16px; width: 500px; max-width: 90vw; max-height: 80vh;
                    overflow-y: auto; box-shadow: 0 20px 60px rgba(0,0,0,0.6);
                }
                .${PREFIX}-modal h3 { margin: 0 0 12px; color: #e8e8f0; font-size: 14px; }
                .${PREFIX}-modal input, .${PREFIX}-modal textarea {
                    width: 100%; background: #1a1a2a; color: #c8c8d8; border: 1px solid #2a2a3a;
                    border-radius: 6px; padding: 8px 10px; font-size: 12px;
                    font-family: inherit; outline: none; box-sizing: border-box;
                }
                .${PREFIX}-modal input:focus, .${PREFIX}-modal textarea:focus { border-color: #58a6ff; }
                .${PREFIX}-modal textarea { min-height: 180px; resize: vertical; margin-top: 8px; }
                .${PREFIX}-modal-actions { display: flex; gap: 6px; justify-content: flex-end; margin-top: 12px; }
                .${PREFIX}-modal-btn {
                    padding: 6px 14px; border-radius: 6px; border: 1px solid #2a2a3a;
                    cursor: pointer; font-size: 12px; font-weight: 500; transition: all 0.2s;
                }
                .${PREFIX}-modal-btn.primary { background: #58a6ff; color: #000; border-color: #58a6ff; }
                .${PREFIX}-modal-btn.primary:hover { background: #79b8ff; }
                .${PREFIX}-modal-btn.secondary { background: transparent; color: #888; }
                .${PREFIX}-modal-btn.secondary:hover { color: #ccc; background: rgba(255,255,255,0.05); }
                .${PREFIX}-modal-btn.danger { background: transparent; color: #f85149; border-color: rgba(248,81,73,0.3); }
                .${PREFIX}-modal-btn.danger:hover { background: rgba(248,81,73,0.1); }

                /* Shortcut keys */
                .${PREFIX}-shortcut-hint {
                    display: inline-block; padding: 0px 4px; background: rgba(255,255,255,0.06);
                    border: 1px solid rgba(255,255,255,0.1); border-radius: 3px;
                    font-size: 9px; color: #666; font-family: monospace;
                }

                /* Settings grid for two-column layout */
                .${PREFIX}-settings-grid {
                    display: grid; grid-template-columns: 1fr 1fr; gap: 0 6px;
                }
            `);
        },

        _getHTML() {
            return `
                <div class="${PREFIX}-hdr">
                    <h2>CUE <span class="${PREFIX}-hdr-ver">v${VERSION}</span></h2>
                    <button class="${PREFIX}-close" id="${PREFIX}-panel-close">&times;</button>
                </div>

                <div class="${PREFIX}-section">
                    <div class="${PREFIX}-row"><span class="${PREFIX}-row-label">Response</span><span id="${PREFIX}-status"><span class="${PREFIX}-status-dot idle"></span>Idle</span></div>
                    <div class="${PREFIX}-row"><span class="${PREFIX}-row-label">Last</span><span id="${PREFIX}-last-resp" style="color:#666;font-size:10px">--</span></div>
                </div>

                <div class="${PREFIX}-section">
                    <div id="${PREFIX}-usage-content"><span style="color:#555;font-size:10px">Loading usage...</span></div>
                </div>

                <div class="${PREFIX}-section">
                    <div class="${PREFIX}-section-title">Export</div>
                    <div style="display:flex;flex-direction:column;gap:2px">
                        <button class="${PREFIX}-export-btn" id="${PREFIX}-export-json" title="Export current chat via API as JSON">Export JSON</button>
                        <button class="${PREFIX}-export-btn" id="${PREFIX}-export-md" title="Export current chat as Markdown">Export MD</button>
                        <button class="${PREFIX}-export-btn" id="${PREFIX}-export-all" title="Export all conversations as ZIP">Export All (ZIP)</button>
                        <button class="${PREFIX}-export-btn" id="${PREFIX}-export-lyra" title="Preview in Lyra Exporter">Lyra Preview</button>
                    </div>
                    <div class="${PREFIX}-settings-grid" style="margin-top:3px">
                        ${this._makeToggle('exportBranchMode', 'Branches')}
                        ${this._makeToggle('exportIncludeImages', 'Images')}
                    </div>
                </div>

                <div class="${PREFIX}-section" id="${PREFIX}-features-section">
                    <div id="${PREFIX}-features-content"><span style="color:#555;font-size:10px">Loading features...</span></div>
                </div>

                <div class="${PREFIX}-section">
                    <div class="${PREFIX}-settings-grid">
                        ${this._makeToggle('themeEnabled', 'Theme')}
                        ${this._makeToggle('fontOverride', 'Sans Fonts')}
                        ${this._makeToggle('wideMode', 'Wide')}
                        ${this._makeToggle('coloredButtons', 'Btn Colors')}
                        ${this._makeToggle('coloredBoldItalic', 'Bold/Ital')}
                        ${this._makeToggle('smoothAnimations', 'Animate')}
                        ${this._makeToggle('customScrollbar', 'Scrollbar')}
                        ${this._makeToggle('pasteFix', 'Paste Fix')}
                        ${this._makeToggle('autoScroll', 'Auto-Scroll')}
                        ${this._makeToggle('autoApprove', 'Auto-Approve')}
                        ${this._makeToggle('responseMonitor', 'Resp Mon')}
                        ${this._makeToggle('notifySound', 'Sound')}
                        ${this._makeToggle('notifyFlash', 'Tab Flash')}
                        ${this._makeToggle('domTrimmer', 'DOM Trim')}
                        ${this._makeToggle('shortcuts', 'Shortcuts')}
                    </div>
                    <div class="${PREFIX}-row" style="margin-top:2px">
                        <span class="${PREFIX}-row-label" style="font-size:10px">Theme</span>
                        <select class="${PREFIX}-select" id="${PREFIX}-set-themeVariant">
                            <option value="oceanic">Oceanic</option>
                            <option value="midnight">Midnight</option>
                            <option value="none">None</option>
                        </select>
                    </div>
                    <div class="${PREFIX}-row">
                        <span class="${PREFIX}-row-label" style="font-size:10px">Width: <span id="${PREFIX}-width-val">${Settings.get('chatWidthPct')}</span>%</span>
                        <input type="range" class="${PREFIX}-slider" id="${PREFIX}-set-chatWidthPct" min="50" max="100" value="${Settings.get('chatWidthPct')}" style="width:100px">
                    </div>
                    <div class="${PREFIX}-row">
                        <span class="${PREFIX}-row-label" style="font-size:10px">Keep: <span id="${PREFIX}-trim-val">${Settings.get('domKeepVisible')}</span> msgs</span>
                        <input type="range" class="${PREFIX}-slider" id="${PREFIX}-set-domKeepVisible" min="5" max="100" value="${Settings.get('domKeepVisible')}" style="width:100px">
                    </div>
                </div>

                <div class="${PREFIX}-section">
                    <div id="${PREFIX}-prompt-list"></div>
                    <button class="${PREFIX}-prompt-btn" id="${PREFIX}-prompt-add" style="width:100%;justify-content:center;color:#58a6ff;margin-top:1px">+ Add Prompt</button>
                </div>

                <div class="${PREFIX}-section" style="border-bottom:none">
                    <div style="display:grid;grid-template-columns:auto 1fr;gap:1px 8px;font-size:9px;color:#555">
                        <span class="${PREFIX}-shortcut-hint">Ctrl+Shift+D</span><span>Panel</span>
                        <span class="${PREFIX}-shortcut-hint">Ctrl+Shift+K</span><span>Copy code</span>
                        <span class="${PREFIX}-shortcut-hint">Ctrl+Shift+C</span><span>Copy resp</span>
                        <span class="${PREFIX}-shortcut-hint">Ctrl+Shift+E</span><span>Export JSON</span>
                    </div>
                    <div style="text-align:center;margin-top:3px"><span style="cursor:pointer;color:#58a6ff;font-size:9px" id="${PREFIX}-reset-settings">Reset All</span></div>
                </div>
            `;
        },

        _makeToggle(key, label) {
            const checked = Settings.get(key) ? 'checked' : '';
            return `<div class="${PREFIX}-row" style="min-height:16px">
                    <span class="${PREFIX}-row-label" style="font-size:10px">${label}</span>
                    <label class="${PREFIX}-toggle">
                        <input type="checkbox" data-setting="${key}" ${checked}>
                        <span class="${PREFIX}-toggle-track"></span>
                        <span class="${PREFIX}-toggle-thumb"></span>
                    </label>
                </div>`;
        },

        _bindEvents() {
            // Close button
            $(`#${PREFIX}-panel-close`).addEventListener('click', () => this.toggle());

            // Toggle switches
            this._panel.querySelectorAll(`input[data-setting]`).forEach(cb => {
                cb.addEventListener('change', () => Settings.set(cb.dataset.setting, cb.checked));
            });

            // Theme variant select
            const themeSelect = $(`#${PREFIX}-set-themeVariant`);
            themeSelect.value = Settings.get('themeVariant');
            themeSelect.addEventListener('change', () => Settings.set('themeVariant', themeSelect.value));

            // Width slider
            const widthSlider = $(`#${PREFIX}-set-chatWidthPct`);
            widthSlider.addEventListener('input', () => {
                $(`#${PREFIX}-width-val`).textContent = widthSlider.value;
                Settings.set('chatWidthPct', parseInt(widthSlider.value));
            });

            // DOM trimmer slider
            const trimSlider = $(`#${PREFIX}-set-domKeepVisible`);
            trimSlider.addEventListener('input', () => {
                $(`#${PREFIX}-trim-val`).textContent = trimSlider.value;
                Settings.set('domKeepVisible', parseInt(trimSlider.value));
            });

            // Reset settings
            $(`#${PREFIX}-reset-settings`).addEventListener('click', () => {
                if (confirm('Reset all settings to defaults?')) { Settings.reset(); location.reload(); }
            });

            // Add prompt button
            $(`#${PREFIX}-prompt-add`).addEventListener('click', () => this._showPromptEditor());

            // Listen for updates
            EventBus.on('response:status', (s) => this._updateStatus(s));
            EventBus.on('response:complete', (d) => this._updateLastResponse(d));
            EventBus.on('stream:messageLimit', (ml) => this._updateUsageFromStream(ml));

            // Bind export buttons
            const expJson = $(`#${PREFIX}-export-json`);
            const expMd = $(`#${PREFIX}-export-md`);
            const expAll = $(`#${PREFIX}-export-all`);
            const expLyra = $(`#${PREFIX}-export-lyra`);
            if (expJson) expJson.addEventListener('click', () => ExportModule.exportCurrentJSON());
            if (expMd) expMd.addEventListener('click', () => ExportModule.exportMarkdown());
            if (expAll) expAll.addEventListener('click', () => ExportModule.exportAllZIP());
            if (expLyra) expLyra.addEventListener('click', () => ExportModule.previewInLyra());

            this._renderPrompts();
        },

        async _loadData() {
            // Load usage from API
            const usage = await ClaudeAPI.getUsage();
            if (usage) {
                this._usageData = usage;
                this._renderUsage(usage);
            }

            // Load Claude features
            const settings = await ClaudeAPI.getSettings();
            if (settings) {
                this._claudeSettings = settings;
                this._renderFeatures(settings);
            }
        },

        _renderUsage(data) {
            const container = $(`#${PREFIX}-usage-content`);
            if (!container) return;
            let html = '';
            const addBar = (label, info) => {
                if (!info) return;
                const pct = Math.round(info.utilization || 0);
                const cls = pct > 80 ? 'danger' : pct > 60 ? 'warn' : '';
                const reset = info.resets_at ? this._fmtReset(info.resets_at) : '';
                html += `<div style="margin-bottom:3px">
                        <div style="display:flex;justify-content:space-between;font-size:10px;color:#888">
                            <span>${label}</span><span>${pct}%${reset ? ' ' + reset : ''}</span>
                        </div>
                        <div class="${PREFIX}-usage-bar"><div class="${PREFIX}-usage-fill ${cls}" style="width:${pct}%"></div></div>
                    </div>`;
            };
            addBar('Session (5h)', data.five_hour);
            addBar('Weekly', data.seven_day);
            addBar('Opus', data.seven_day_opus);
            container.innerHTML = html || '<span style="color:#555;font-size:10px">No usage data</span>';
        },

        _updateUsageFromStream(ml) {
            const container = $(`#${PREFIX}-usage-content`);
            if (!container) return;
            const windows = ml.windows;
            if (!windows) return;
            let html = '';
            const addBar = (label, info) => {
                if (!info) return;
                const pct = Math.round((info.utilization || 0) * 100);
                const cls = pct > 80 ? 'danger' : pct > 60 ? 'warn' : '';
                const reset = info.resets_at ? this._fmtResetUnix(info.resets_at) : '';
                html += `<div style="margin-bottom:3px">
                        <div style="display:flex;justify-content:space-between;font-size:10px;color:#888">
                            <span>${label}</span><span>${pct}%${reset ? ' ' + reset : ''}</span>
                        </div>
                        <div class="${PREFIX}-usage-bar"><div class="${PREFIX}-usage-fill ${cls}" style="width:${pct}%"></div></div>
                    </div>`;
            };
            addBar('Session (5h)', windows['5h']);
            addBar('Weekly', windows['7d']);
            if (html) container.innerHTML = html;
            const session = windows['5h'];
            if (session) this._updateGearBadge(Math.round((session.utilization || 0) * 100));
        },

        _renderFeatures(settings) {
            const container = $(`#${PREFIX}-features-content`);
            if (!container) return;
            container.innerHTML = this.FEATURES.map(f => {
                const on = settings[f.key] === true;
                return `<div class="${PREFIX}-feat-row">
                        <span class="${PREFIX}-feat-name">${f.name}</span>
                        <button class="${PREFIX}-feat-btn ${on ? 'on' : 'off'}"
                                data-feat="${f.key}" data-exclusive="${f.exclusive || ''}">${on ? 'ON' : 'OFF'}</button>
                    </div>`;
            }).join('');
            container.querySelectorAll(`.${PREFIX}-feat-btn`).forEach(btn => {
                btn.addEventListener('click', async () => {
                    const key = btn.dataset.feat;
                    const isOn = btn.classList.contains('on');
                    btn.textContent = '...';
                    btn.disabled = true;
                    const excl = btn.dataset.exclusive || null;
                    const result = await ClaudeAPI.toggleFeature(key, !isOn, excl);
                    if (result) {
                        btn.classList.toggle('on', !isOn);
                        btn.classList.toggle('off', isOn);
                        btn.textContent = !isOn ? 'ON' : 'OFF';
                        // Update exclusive partner
                        if (excl && !isOn) {
                            const partnerBtn = container.querySelector(`[data-feat="${excl}"]`);
                            if (partnerBtn) {
                                partnerBtn.classList.remove('on'); partnerBtn.classList.add('off');
                                partnerBtn.textContent = 'OFF';
                            }
                        }
                    } else {
                        btn.textContent = isOn ? 'ON' : 'OFF';
                    }
                    btn.disabled = false;
                });
            });
        },

        _renderPrompts() {
            const container = $(`#${PREFIX}-prompt-list`);
            if (!container) return;
            container.innerHTML = '';
            PromptModule.CATEGORIES.forEach(cat => {
                const prompts = PromptModule.prompts.filter(p => p.cat === cat.id && p.prompt);
                if (prompts.length === 0) return;
                const catEl = document.createElement('div');
                catEl.className = PREFIX + '-prompt-cat';
                catEl.style.color = cat.color;
                catEl.textContent = cat.label;
                container.appendChild(catEl);
                prompts.forEach(p => {
                    const btn = document.createElement('button');
                    btn.className = PREFIX + '-prompt-btn';
                    btn.innerHTML = `<span>${esc(p.label)}</span>`;
                    btn.title = p.prompt.substring(0, 100) + '...';
                    btn.addEventListener('click', () => { PromptModule.send(p.prompt); this.toggle(); });
                    btn.addEventListener('contextmenu', (e) => { e.preventDefault(); this._showPromptEditor(p); });
                    container.appendChild(btn);
                });
            });
        },

        _showPromptEditor(existing = null) {
            const overlay = document.createElement('div');
            overlay.className = PREFIX + '-modal-overlay';
            const modal = document.createElement('div');
            modal.className = PREFIX + '-modal';
            modal.innerHTML = `
                <h3>${existing ? 'Edit' : 'Add'} Prompt</h3>
                <input id="${PREFIX}-pe-label" placeholder="Button label" value="${existing ? esc(existing.label) : ''}">
                <textarea id="${PREFIX}-pe-text" placeholder="Prompt template...">${existing ? esc(existing.prompt) : ''}</textarea>
                <div style="margin-top:10px">
                    <select class="${PREFIX}-select" id="${PREFIX}-pe-cat">
                        ${PromptModule.CATEGORIES.map(c => `<option value="${c.id}" ${existing?.cat === c.id ? 'selected' : ''}>${c.label}</option>`).join('')}
                    </select>
                </div>
                <div class="${PREFIX}-modal-actions">
                    ${existing && !existing.id.startsWith('spec') && !existing.id.startsWith('arch') ? `<button class="${PREFIX}-modal-btn danger" id="${PREFIX}-pe-delete">Delete</button>` : ''}
                    <button class="${PREFIX}-modal-btn secondary" id="${PREFIX}-pe-cancel">Cancel</button>
                    <button class="${PREFIX}-modal-btn primary" id="${PREFIX}-pe-save">Save</button>
                </div>
            `;
            overlay.appendChild(modal);
            document.body.appendChild(overlay);
            overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
            $(`#${PREFIX}-pe-cancel`, modal).addEventListener('click', () => overlay.remove());
            $(`#${PREFIX}-pe-save`, modal).addEventListener('click', () => {
                const label = $(`#${PREFIX}-pe-label`, modal).value.trim();
                const text = $(`#${PREFIX}-pe-text`, modal).value;
                const cat = $(`#${PREFIX}-pe-cat`, modal).value;
                if (!label) { showToast('Label is required', 2000, 'warn'); return; }
                if (existing) { PromptModule.update(existing.id, label, text); existing.cat = cat; PromptModule.save(); }
                else { PromptModule.add(label, text, cat); }
                this._renderPrompts();
                overlay.remove();
                showToast(`Prompt "${label}" saved!`, 2000, 'success');
            });
            const delBtn = $(`#${PREFIX}-pe-delete`, modal);
            if (delBtn) delBtn.addEventListener('click', () => {
                PromptModule.remove(existing.id);
                this._renderPrompts();
                overlay.remove();
                showToast('Prompt deleted', 2000, 'info');
            });
        },

        _updateStatus(status) {
            const el = $(`#${PREFIX}-status`);
            if (!el) return;
            const labels = {
                idle: ['idle', 'Idle'],
                generating: ['generating', 'Generating...'],
                complete: ['complete', 'Complete'],
                stuck: ['stuck', 'Stuck!'],
                truncated: ['truncated', 'Truncated']
            };
            const [cls, txt] = labels[status] || labels.idle;
            el.innerHTML = `<span class="${PREFIX}-status-dot ${cls}"></span>${txt}`;
        },

        _updateLastResponse(d) {
            const el = $(`#${PREFIX}-last-resp`);
            if (el) el.textContent = `${fmtDur(d.duration)} / ${fmtNum(d.words)} words`;
        },

        _updateGearBadge(pct) {
            // Update hover strip indicator color based on usage
            const strip = $(`#${PREFIX}-hover-strip`);
            if (!strip) return;
            const color = pct > 80 ? 'rgba(248,81,73,0.6)' : pct > 60 ? 'rgba(210,153,34,0.5)' : 'rgba(88,166,255,0.2)';
            strip.style.setProperty('--strip-color', color);
        },

        _fmtReset(iso) {
            if (!iso) return '';
            const d = new Date(iso), diff = d - new Date(), m = Math.floor(diff / 60000);
            if (m < 1) return 'soon';
            if (m < 60) return `in ${m}m`;
            const h = Math.floor(m / 60);
            return h < 24 ? `in ${h}h` : `in ${Math.floor(h / 24)}d`;
        },

        _fmtResetUnix(ts) {
            if (!ts) return '';
            return this._fmtReset(new Date(ts * 1000).toISOString());
        },

        buildGearButton() {
            if ($(`#${PREFIX}-hover-strip`)) return;
            const strip = document.createElement('div');
            strip.id = PREFIX + '-hover-strip';
            document.body.appendChild(strip);

            let hideTimeout = null;
            const showPanel = () => {
                clearTimeout(hideTimeout);
                if (this._panel && this._panel.classList.contains(PREFIX + '-panel-hidden')) {
                    this._panel.classList.remove(PREFIX + '-panel-hidden');
                    this._panel.style.pointerEvents = 'auto';
                    this._visible = true;
                }
            };
            const scheduleHide = () => {
                clearTimeout(hideTimeout);
                hideTimeout = setTimeout(() => {
                    if (this._panel && !this._panel.matches(':hover') && !strip.matches(':hover')) {
                        this._panel.classList.add(PREFIX + '-panel-hidden');
                        this._visible = false;
                    }
                }, 400);
            };

            strip.addEventListener('mouseenter', showPanel);
            strip.addEventListener('mouseleave', scheduleHide);
            if (this._panel) {
                this._panel.addEventListener('mouseenter', () => clearTimeout(hideTimeout));
                this._panel.addEventListener('mouseleave', scheduleHide);
            }
        },

        destroy() { clearInterval(this._refreshTimer); }
    };

    // =====================================================================
    //  INITIALIZATION
    // =====================================================================
    const ALL_MODULES = [
        ThemeModule, LayoutModule, VisualModule, PasteFixModule,
        AutoScrollModule, AutoApproveModule, ExportModule,
        ResponseModule, DomTrimmerModule, PromptModule, ShortcutsModule
    ];

    async function init() {
        console.log(`%c${LOG_TAG} Claude Ultimate Enhancer v${VERSION} initializing...`, 'color:#58a6ff;font-weight:bold;font-size:14px');

        // Install fetch interceptor early (before any fetches)
        StreamMonitor.install();

        // Init modules that work at document-start
        ThemeModule.init();
        LayoutModule.init();
        PasteFixModule.init();

        // DevTools shortcut fix
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.shiftKey && e.key === 'I') e.stopImmediatePropagation();
        }, true);

        // Wait for body to be available
        const waitBody = () => new Promise(r => {
            if (document.body) return r();
            const obs = new MutationObserver(() => { if (document.body) { obs.disconnect(); r(); } });
            obs.observe(document.documentElement, { childList: true });
        });
        await waitBody();

        // Init remaining modules
        VisualModule.init();
        AutoScrollModule.init();
        AutoApproveModule.init();
        ExportModule.init();
        ResponseModule.init();
        DomTrimmerModule.init();
        PromptModule.init();
        ShortcutsModule.init();

        // Build control panel
        ControlPanel.build();
        ControlPanel.buildGearButton();

        // URL change detection for SPA navigation
        let lastUrl = location.href;
        setInterval(() => {
            if (location.href !== lastUrl) {
                lastUrl = location.href;
                ResponseModule.status = 'idle';
                ResponseModule.genStartTime = null;
                ResponseModule.lastDuration = 0;
                ResponseModule.lastWords = 0;
                ResponseModule.lastChars = 0;
                ResponseModule._stopTimer();
                EventBus.emit('response:status', 'idle');
                EventBus.emit('navigation', location.href);
            }
        }, 2000);

        console.log(`%c${LOG_TAG} Ready! Hover right edge or press Ctrl+Shift+D`, 'color:#3fb950;font-weight:bold');
    }

    // Start
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();