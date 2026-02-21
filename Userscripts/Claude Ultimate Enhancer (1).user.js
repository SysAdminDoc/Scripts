// ==UserScript==
// @name         Claude Ultimate Enhancer
// @namespace    https://github.com/SysAdminDoc
// @version      1.2.2
// @description  All-in-one Claude.ai enhancement suite - theme engine, usage monitor, prompt manager, lockable/resizable panel, auto-scroll, DOM trimmer, visual upgrades, API-powered chat export (JSON/ZIP), and more
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

    const VERSION = '1.2.2';
    const PREFIX = 'cue';
    const LOG_TAG = '[CUE]';

    // =====================================================================
    //  TRUSTED TYPES (CSP compatibility)
    // =====================================================================
    let _trustedPolicy = null;
    if (typeof window.trustedTypes !== 'undefined' && window.trustedTypes.createPolicy) {
        try { _trustedPolicy = window.trustedTypes.createPolicy('cue-policy', { createHTML: (input) => input }); }
        catch (e) { /* policy already exists or unsupported */ }
    }
    function safeHTML(html) { return _trustedPolicy ? _trustedPolicy.createHTML(html) : html; }
    function setSafeHTML(el, html) { if (!el) return; el.innerHTML = safeHTML(html); }

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
            // -- DOM Trimmer --
            domTrimmer: false,
            domKeepVisible: 20,
            // -- Auto Features --
            autoScroll: true,
            autoApprove: false,
            // -- Export --
            exportBranchMode: false,
            exportIncludeImages: false,
            // -- Panel --
            panelWidth: 310,
            panelLocked: false,
            // -- Prompt Library --
            promptLibrary: true,
            // -- Response Monitor --
            responseMonitor: true,
            notifySound: true,
            notifyFlash: true,
            // -- Paste Fix --
            pasteFix: true,
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
            // Batch: write all defaults without emitting individual events
            Object.keys(this._defaults).forEach(k => {
                this._cache[k] = this._defaults[k];
                GM_setValue(PREFIX + '_' + k, this._defaults[k]);
            });
            EventBus.emit('settings:reset');
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
        _orgIdCache: null,

        async getOrgId() {
            if (this._orgIdCache) return this._orgIdCache;
            const saved = localStorage.getItem('cue_orgId');
            if (saved) { this._orgIdCache = saved; return saved; }
            try {
                const r = await fetch('/api/organizations', { credentials: 'include' });
                const orgs = await r.json();
                if (orgs[0]?.uuid) {
                    this._orgIdCache = orgs[0].uuid;
                    localStorage.setItem('cue_orgId', this._orgIdCache);
                    return this._orgIdCache;
                }
            } catch (e) { /* ignore */ }
            return null;
        },
        setOrgId(id) {
            this._orgIdCache = id;
            localStorage.setItem('cue_orgId', id);
        },
        async getUsage() {
            try {
                const orgId = await this.getOrgId();
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
                // Capture org ID from any API call (#1: single fetch wrapper)
                try {
                    const url = typeof args[0] === 'string' ? args[0] : args[0]?.url || '';
                    const match = url.match(/\/api\/organizations\/([a-f0-9-]+)\//);
                    if (match && match[1]) {
                        ClaudeAPI.setOrgId(match[1]);
                        ExportModule._orgId = match[1];
                    }
                } catch (e) { /* ignore */ }
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
            // Detect if dark mode is active — warn once if not
            const root = document.documentElement;
            if (root && root.dataset.mode && root.dataset.mode !== 'dark' && !this._lightWarnShown) {
                this._lightWarnShown = true;
                setTimeout(() => showToast('CUE themes are designed for dark mode — switch to dark mode in Claude settings for best results', 5000, 'warn'), 3000);
            }
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
            const scope = document.querySelector('.font-claude-message, [class*="prose"]');
            const root = scope || document.querySelector('main') || document.body;
            root.querySelectorAll('b:not([data-cue-styled]), strong:not([data-cue-styled])').forEach(el => {
                el.setAttribute('data-cue-styled', '1');
                el.style.setProperty('color', this.COLORS.green, 'important');
            });
            root.querySelectorAll('i:not([data-cue-styled]), em:not([data-cue-styled])').forEach(el => {
                el.setAttribute('data-cue-styled', '1');
                el.style.setProperty('color', this.COLORS.skyblue, 'important');
            });
        },

        _startBoldObserver() {
            if (this._boldObserver) this._boldObserver.disconnect();
            let timer;
            this._boldObserver = new MutationObserver(() => {
                clearTimeout(timer);
                timer = setTimeout(() => this._colorBoldElements(), 300);
            });
            const start = () => {
                const root = document.querySelector('main') || document.body;
                this._boldObserver.observe(root, { childList: true, subtree: true });
            };
            if (document.querySelector('main')) start();
            else setTimeout(start, 500);
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
        _dispatching: false,

        init() {
            this._handler = (e) => {
                if (!Settings.get('pasteFix') || this._dispatching) return;
                const cd = e.clipboardData || window.clipboardData;
                if (cd.types.includes('text/plain') && cd.types.includes('text/html')) {
                    e.preventDefault();
                    e.stopImmediatePropagation();
                    const plain = cd.getData('text/plain');
                    const dt = new DataTransfer();
                    dt.setData('text/plain', plain.trimStart());
                    this._dispatching = true;
                    e.target.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
                    this._dispatching = false;
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
        _scrollEl: null,
        _scrollElTime: 0,

        init() {
            this._start();
            EventBus.on('setting:autoScroll', (v) => v ? this._start() : this._stop());
            EventBus.on('navigation', () => { this._scrollEl = null; });
        },

        _findScrollContainer() {
            // Cache for 5s to avoid repeated DOM walks
            if (this._scrollEl && document.contains(this._scrollEl) && Date.now() - this._scrollElTime < 5000) return this._scrollEl;
            // Strategy 1: look inside main for the deepest scrollable element
            const main = document.querySelector('main');
            if (main) {
                // Walk candidates: elements that have scrollable overflow and meaningful height
                const candidates = main.querySelectorAll('div');
                let best = null, bestDepth = -1;
                for (const el of candidates) {
                    if (el.scrollHeight > el.clientHeight + 10 && el.clientHeight > 100) {
                        const style = getComputedStyle(el);
                        if (style.overflowY === 'auto' || style.overflowY === 'scroll') {
                            // Prefer the deepest (most specific) scrollable container
                            let depth = 0;
                            let p = el;
                            while (p) { depth++; p = p.parentElement; }
                            if (depth > bestDepth) { best = el; bestDepth = depth; }
                        }
                    }
                }
                if (best) { this._scrollEl = best; this._scrollElTime = Date.now(); return best; }
                // Fallback: main itself might scroll
                if (main.scrollHeight > main.clientHeight + 10) { this._scrollEl = main; this._scrollElTime = Date.now(); return main; }
            }
            return null;
        },

        scrollToBottom() {
            const el = this._findScrollContainer();
            if (el) {
                el.scrollTop = el.scrollHeight;
            } else {
                window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' });
            }
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
        _debounce: null,

        init() {
            this._start();
            EventBus.on('setting:autoApprove', (v) => v ? this._start() : this._stop());
        },

        _start() {
            if (this._observer) this._observer.disconnect();
            this._observer = new MutationObserver(() => {
                if (!Settings.get('autoApprove')) return;
                clearTimeout(this._debounce);
                this._debounce = setTimeout(() => this._check(), 150);
            });
            this._observer.observe(document.body, { childList: true, subtree: false });
            // Also observe direct children for portal mounts
            const portalRoot = document.getElementById('__next') || document.body;
            if (portalRoot !== document.body) {
                this._observer.observe(portalRoot, { childList: true, subtree: false });
            }
        },

        _check() {
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
        },

        _stop() { if (this._observer) this._observer.disconnect(); },
        destroy() { this._stop(); }
    };

    // =====================================================================
    //  MODULE: EXPORT (API-powered)
    // =====================================================================
    const ExportModule = {
        id: 'export',
        _orgId: null,
        _exporting: false,
        _convListCache: null,
        _convListCacheTime: 0,
        CONV_CACHE_TTL: 30000,

        init() {
            // Org ID is captured by StreamMonitor's unified fetch wrapper and ClaudeAPI cache
            const cached = ClaudeAPI._orgIdCache || localStorage.getItem('cue_orgId');
            if (cached) this._orgId = cached;
        },

        _setExportButtons(disabled) {
            for (const id of ['export-json', 'export-md', 'export-all']) {
                const btn = $(`#${PREFIX}-${id}`);
                if (btn) { btn.disabled = disabled; btn.style.opacity = disabled ? '0.4' : ''; }
            }
        },

        async ensureOrgId() {
            if (this._orgId) return this._orgId;
            const id = await ClaudeAPI.getOrgId();
            if (id) { this._orgId = id; return id; }
            showToast('Could not detect organization ID — try refreshing the page', 4000, 'error');
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
            // #2: Cache with 30s TTL to avoid redundant full-list fetches
            if (this._convListCache && (Date.now() - this._convListCacheTime < this.CONV_CACHE_TTL)) {
                return this._convListCache;
            }
            const orgId = await this.ensureOrgId();
            if (!orgId) return null;
            try {
                const resp = await fetch(`/api/organizations/${orgId}/chat_conversations`, { credentials: 'include' });
                if (!resp.ok) throw new Error('Fetch failed');
                const data = await resp.json();
                this._convListCache = data;
                this._convListCacheTime = Date.now();
                return data;
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

        _downloadBlob(blob, filename) {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url; a.download = filename;
            document.body.appendChild(a); a.click(); document.body.removeChild(a);
            URL.revokeObjectURL(url);
        },

        async exportCurrentJSON() {
            if (this._exporting) { showToast('Export already in progress', 2000, 'warn'); return; }
            const uuid = this.getCurrentUUID();
            if (!uuid) { showToast('No conversation open (need /chat/ URL)', 3000, 'warn'); return; }
            const orgId = await this.ensureOrgId();
            if (!orgId) return;
            this._exporting = true;
            this._setExportButtons(true);
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
                this._downloadBlob(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }), filename);
                showToast('Exported: ' + filename, 3000, 'success');
            } catch (e) {
                showToast('Export failed: ' + e.message, 4000, 'error');
            } finally {
                this._exporting = false;
                this._setExportButtons(false);
            }
        },

        async exportAllZIP() {
            if (this._exporting) { showToast('Export already in progress', 2000, 'warn'); return; }
            const orgId = await this.ensureOrgId();
            if (!orgId) return;
            this._exporting = true;
            this._setExportButtons(true);
            showToast('Detecting conversations...', 2000, 'info');
            try {
                this._convListCache = null; // force fresh list
                const allConvs = await this.getAllConversations();
                if (!allConvs || !Array.isArray(allConvs) || allConvs.length === 0) {
                    showToast('No conversations found', 3000, 'warn');
                    return;
                }
                const toExport = allConvs;
                showToast(`Exporting ${toExport.length} conversations...`, 3000, 'info');
                const includeImages = Settings.get('exportIncludeImages');
                const CHUNK_SIZE = 50;
                const hasZip = typeof fflate !== 'undefined' && fflate.zipSync && fflate.strToU8;
                const allChunkBlobs = [];
                let exported = 0, failed = 0;
                for (let chunk = 0; chunk < toExport.length; chunk += CHUNK_SIZE) {
                    const batch = toExport.slice(chunk, chunk + CHUNK_SIZE);
                    const files = {};
                    for (let i = 0; i < batch.length; i++) {
                        const conv = batch[i];
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
                                exported++;
                            }
                        } catch (e) { failed++; }
                        if ((exported + failed) % 5 === 0 || (chunk + i) === toExport.length - 1) {
                            showToast(`Exporting ${exported + failed}/${toExport.length}...`, 2000, 'info');
                        }
                    }
                    if (hasZip) {
                        const zipEntries = {};
                        for (const [name, content] of Object.entries(files)) zipEntries[name] = fflate.strToU8(content);
                        allChunkBlobs.push({ entries: zipEntries });
                    } else {
                        for (const [name, content] of Object.entries(files)) allChunkBlobs.push({ name, content });
                    }
                }
                if (hasZip) {
                    // Merge all chunk entries into one ZIP
                    const merged = {};
                    for (const c of allChunkBlobs) Object.assign(merged, c.entries);
                    const fileCount = Object.keys(merged).length;
                    if (fileCount === 0) { showToast('No conversations exported', 3000, 'warn'); return; }
                    const zipped = fflate.zipSync(merged, { level: 6 });
                    this._downloadBlob(new Blob([zipped], { type: 'application/zip' }), `claude_export_${new Date().toISOString().slice(0, 10)}.zip`);
                    showToast(`Exported ${fileCount} conversations as ZIP${failed ? ` (${failed} failed)` : ''}!`, 3500, 'success');
                } else {
                    // Fallback: combined JSON
                    const combined = allChunkBlobs.map(c => JSON.parse(c.content));
                    if (combined.length === 0) { showToast('No conversations exported', 3000, 'warn'); return; }
                    this._downloadBlob(new Blob([JSON.stringify(combined, null, 2)], { type: 'application/json' }), `claude_export_all_${new Date().toISOString().slice(0, 10)}.json`);
                    showToast(`Exported ${combined.length} conversations as JSON (install fflate for ZIP)`, 4000, 'success');
                }
            } catch (e) {
                showToast('Export failed: ' + e.message, 4000, 'error');
            } finally {
                this._exporting = false;
                this._setExportButtons(false);
            }
        },

        exportMarkdown() {
            if (this._exporting) { showToast('Export already in progress', 2000, 'warn'); return; }
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
            this._downloadBlob(new Blob([md], { type: 'text/markdown' }), 'claude-chat-' + new Date().toISOString().slice(0, 10) + '.md');
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
        _audioCtx: null,
        _flashTimer: null,
        _originalTitle: '',
        _streamActive: false,
        _pollFallbackCount: 0,
        status: 'idle',  // idle | generating | stuck | complete | truncated
        genStartTime: null,
        lastDuration: 0,
        lastWords: 0,
        lastChars: 0,

        init() {
            // Primary: stream events from fetch interceptor
            EventBus.on('stream:start', () => this._onStreamStart());
            EventBus.on('stream:stop', () => this._onStreamEnd());
            EventBus.on('stream:end', () => { if (this._streamActive) this._onStreamEnd(); });
            // Fallback: poll every 3s for edge cases where stream events don't fire
            this._interval = setInterval(() => this._pollFallback(), 3000);
        },

        _onStreamStart() {
            if (!Settings.get('responseMonitor')) return;
            this._streamActive = true;
            this._pollFallbackCount = 0;
            if (this.status !== 'generating') {
                this.genStartTime = Date.now();
                this._startTimer();
            }
            this.status = 'generating';
            EventBus.emit('response:status', this.status);
        },

        _onStreamEnd() {
            if (!Settings.get('responseMonitor')) return;
            this._streamActive = false;
            // Small delay to let the DOM settle before reading the response
            setTimeout(() => this._finalize(), 500);
        },

        _finalize() {
            const resp = DOM.getLastResponse();
            this.lastDuration = this.genStartTime ? Date.now() - this.genStartTime : 0;
            this._stopTimer();
            this.lastChars = resp.length;
            this.lastWords = resp.split(/\s+/).filter(w => w.length > 0).length;
            this.status = this._isTruncated(resp) ? 'truncated' : 'complete';
            this.genStartTime = null;
            EventBus.emit('response:status', this.status);
            EventBus.emit('response:complete', { duration: this.lastDuration, words: this.lastWords, chars: this.lastChars });
            if (Settings.get('autoScroll')) AutoScrollModule.scrollToBottom();
            if (Settings.get('notifySound')) this._playSound();
            if (Settings.get('notifyFlash')) this._flashTab();
        },

        _pollFallback() {
            if (!Settings.get('responseMonitor') || this._streamActive) return;
            const gen = DOM.isGenerating();
            if (gen && this.status !== 'generating') {
                // Stream events missed — fall back to DOM detection
                this._pollFallbackCount++;
                if (this._pollFallbackCount >= 2) this._onStreamStart();
            } else if (!gen && this.status === 'generating') {
                this._pollFallbackCount++;
                if (this._pollFallbackCount >= 2) this._onStreamEnd();
            } else {
                this._pollFallbackCount = 0;
            }
            // Stuck detection: generating for >90s with no stream end
            if (this.status === 'generating' && this.genStartTime && Date.now() - this.genStartTime > 90000) {
                this.status = 'stuck';
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
            // Unclosed code fences are a strong signal
            if ((t.match(/```/g) || []).length % 2 !== 0) return true;
            // Explicit truncation phrases in the tail
            const tail = t.toLowerCase().slice(-300);
            for (const s of ['response was cut off', 'character limit', 'length limit', 'hit the limit']) {
                if (tail.includes(s)) return true;
            }
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
        _trimTimer: null,

        init() {
            EventBus.on('setting:domTrimmer', (v) => { if (!v) this.restoreAll(); });
            this._observer = new MutationObserver(() => {
                if (!Settings.get('domTrimmer')) return;
                clearTimeout(this._trimTimer);
                this._trimTimer = setTimeout(() => this._prune(), 500);
            });
            if (document.body) this._observer.observe(document.body, { childList: true, subtree: true });
        },

        _getMessages() {
            const main = $(SEL.main);
            if (!main) return [];
            return $$('.group, [data-testid="user-message"]', main).map(el => {
                let target = el;
                while (target.parentElement && target.parentElement !== main && !target.parentElement.matches('main, [class*="flex-col"]')) {
                    target = target.parentElement;
                }
                return target;
            }).filter((el, i, arr) => arr.indexOf(el) === i);
        },

        _prune() {
            const msgs = this._getMessages();
            const keep = Settings.get('domKeepVisible');
            if (msgs.length <= keep) return;
            const toHide = msgs.slice(0, msgs.length - keep);
            let hiddenCount = 0;
            toHide.forEach(el => {
                if (el.dataset.cueTrimmed) return;
                el.dataset.cueTrimmed = '1';
                el.style.display = 'none';
                hiddenCount++;
            });
            // Restore elements that should now be visible
            const toShow = msgs.slice(msgs.length - keep);
            toShow.forEach(el => {
                if (el.dataset.cueTrimmed) {
                    delete el.dataset.cueTrimmed;
                    el.style.display = '';
                }
            });
            if (hiddenCount > 0) EventBus.emit('trimmer:pruned', { hidden: hiddenCount, total: msgs.length });
        },

        restoreAll() {
            $$('[data-cue-trimmed]').forEach(el => {
                delete el.dataset.cueTrimmed;
                el.style.display = '';
            });
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
        CATEGORIES_KEY: PREFIX + '_categories',
        prompts: [],
        categories: [],

        DEFAULT_PROMPTS: [
            // -- Writing --
            { id: 'summarize', label: 'Summarize', cat: 'writing', prompt: 'Summarize the above concisely. Lead with the single most important takeaway, then cover key points in order of importance. Keep it brief.' },
            { id: 'rewrite', label: 'Rewrite', cat: 'writing', prompt: 'Rewrite the above to be clearer, more concise, and more engaging. Preserve the original meaning and tone. Show only the rewritten version.' },
            { id: 'proofread', label: 'Proofread', cat: 'writing', prompt: 'Proofread the above for grammar, spelling, punctuation, and clarity. List each issue found with the correction. Then provide the fully corrected version.' },
            { id: 'simplify', label: 'Simplify', cat: 'writing', prompt: 'Explain the above in plain language that anyone could understand. Avoid jargon. Use short sentences and concrete examples.' },
            { id: 'expand', label: 'Expand', cat: 'writing', prompt: 'Expand on the above with more detail, examples, and depth. Maintain the same style and tone. Add supporting evidence or context where appropriate.' },
            { id: 'tone_pro', label: 'Professional', cat: 'writing', prompt: 'Rewrite the above in a professional, polished tone suitable for business communication. Remove casual language, tighten the structure, and keep it direct.' },
            // -- Code --
            { id: 'review', label: 'Code Review', cat: 'code', prompt: 'Review the code above. Check for:\n- Bugs, logic errors, edge cases\n- Security vulnerabilities\n- Performance issues\n- Code style and readability\n- Missing error handling\n\nList issues by severity (critical > warning > suggestion). For each issue, show the fix.' },
            { id: 'debug', label: 'Debug', cat: 'code', prompt: 'The code above has a bug. Analyze it step by step:\n1. What is the expected behavior?\n2. What is actually happening?\n3. Where is the root cause?\n4. What is the fix?\n\nShow the corrected code.' },
            { id: 'refactor', label: 'Refactor', cat: 'code', prompt: 'Refactor the code above for better readability, maintainability, and performance. Apply best practices for the language. Explain what you changed and why. Show the complete refactored code.' },
            { id: 'tests', label: 'Write Tests', cat: 'code', prompt: 'Write comprehensive tests for the code above. Cover:\n- Happy path\n- Edge cases and boundary values\n- Error conditions\n- Input validation\n\nUse the most appropriate testing framework for the language.' },
            { id: 'explain_code', label: 'Explain Code', cat: 'code', prompt: 'Explain the code above step by step. Cover what it does, how it works, and why key decisions were made. Assume I understand programming basics but am unfamiliar with this specific codebase.' },
            { id: 'optimize', label: 'Optimize', cat: 'code', prompt: 'Optimize the code above for performance. Identify bottlenecks, reduce complexity, minimize memory usage, and apply language-specific optimizations. Show the optimized code with explanations of what changed.' },
            // -- Analysis --
            { id: 'pros_cons', label: 'Pros & Cons', cat: 'analysis', prompt: 'Analyze the above by listing the pros and cons. Be balanced and objective. Consider short-term and long-term implications. End with a brief bottom-line assessment.' },
            { id: 'compare', label: 'Compare', cat: 'analysis', prompt: 'Compare and contrast the options discussed above. Cover key differences, strengths and weaknesses of each, and which scenarios favor which option. End with a recommendation.' },
            { id: 'fact_check', label: 'Fact Check', cat: 'analysis', prompt: 'Fact-check the claims made above. For each claim, state whether it is accurate, partially accurate, or inaccurate, and provide the correct information with reasoning.' },
            { id: 'deep_dive', label: 'Deep Dive', cat: 'analysis', prompt: 'Take a deep dive into the topic above. Cover aspects that are commonly overlooked, provide nuanced analysis, cite relevant context, and explore implications. Go beyond surface-level understanding.' },
            { id: 'eli5', label: 'ELI5', cat: 'analysis', prompt: 'Explain the above like I\'m 5 years old. Use simple analogies, everyday examples, and short sentences. Make it fun and easy to understand.' },
            // -- Productivity --
            { id: 'continue', label: 'Continue', cat: 'productivity', prompt: 'Continue from where you left off. Pick up EXACTLY where you stopped. Do not repeat anything already written.' },
            { id: 'action_items', label: 'Action Items', cat: 'productivity', prompt: 'Extract all action items from the above conversation. For each item, identify: what needs to be done, who should do it (if mentioned), priority level, and any deadlines or dependencies.' },
            { id: 'brainstorm', label: 'Brainstorm', cat: 'productivity', prompt: 'Brainstorm creative ideas and solutions related to the above. Think broadly, include unconventional approaches, and don\'t self-censor. Aim for quantity and variety. Group ideas by theme.' },
            { id: 'outline', label: 'Outline', cat: 'productivity', prompt: 'Create a detailed outline for the above topic. Include main sections, subsections, key points to cover, and a logical flow. This should serve as a complete roadmap for writing the full piece.' },
            { id: 'tldr', label: 'TL;DR', cat: 'productivity', prompt: 'Give me a TL;DR of everything above in 2-3 sentences maximum. Be direct, skip qualifiers, just the essential information.' },
            { id: 'next_steps', label: 'Next Steps', cat: 'productivity', prompt: 'Based on our conversation above, what are the concrete next steps? List them in order of priority with brief explanations of why each matters.' },
        ],

        DEFAULT_CATEGORIES: [
            { id: 'writing', label: 'Writing', color: '#58a6ff' },
            { id: 'code', label: 'Code', color: '#d29922' },
            { id: 'analysis', label: 'Analysis', color: '#bc8cff' },
            { id: 'productivity', label: 'Productivity', color: '#3fb950' },
        ],

        init() { this._load(); },

        _load() {
            // Load categories
            try {
                const savedCats = GM_getValue(this.CATEGORIES_KEY, null);
                if (savedCats) this.categories = JSON.parse(savedCats);
                else this.categories = this.DEFAULT_CATEGORIES.map(c => ({ ...c }));
            } catch (e) {
                this.categories = this.DEFAULT_CATEGORIES.map(c => ({ ...c }));
            }
            // Load prompts
            try {
                const saved = GM_getValue(this.STORAGE_KEY, null);
                if (saved) { this.prompts = JSON.parse(saved); return; }
            } catch (e) { /* ignore */ }
            this.prompts = this.DEFAULT_PROMPTS.map(d => ({ ...d }));
        },

        save() {
            GM_setValue(this.STORAGE_KEY, JSON.stringify(this.prompts.map(p => ({ id: p.id, label: p.label, prompt: p.prompt, cat: p.cat }))));
        },

        saveCategories() {
            GM_setValue(this.CATEGORIES_KEY, JSON.stringify(this.categories));
        },

        addCategory(label, color = '#888') {
            const id = 'cat_' + Date.now();
            this.categories.push({ id, label, color });
            this.saveCategories();
            return id;
        },

        renameCategory(id, newLabel) {
            const cat = this.categories.find(c => c.id === id);
            if (cat) { cat.label = newLabel; this.saveCategories(); }
        },

        setCategoryColor(id, color) {
            const cat = this.categories.find(c => c.id === id);
            if (cat) { cat.color = color; this.saveCategories(); }
        },

        removeCategory(id) {
            const fallback = this.categories.find(c => c.id !== id)?.id || 'custom';
            this.prompts.forEach(p => { if (p.cat === id) p.cat = fallback; });
            this.categories = this.categories.filter(c => c.id !== id);
            this.save();
            this.saveCategories();
        },

        add(label, prompt, cat) {
            if (!cat) cat = this.categories[0]?.id || 'custom';
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
    //  CONTROL PANEL UI
    // =====================================================================
    const ControlPanel = {
        _panel: null,
        _visible: false,
        _locked: false,
        _usageData: null,
        _claudeSettings: null,
        _refreshTimer: null,
        _resizing: false,

        FEATURES: [
            { key: 'enabled_monkeys_in_a_barrel', name: 'Code Execution', desc: 'Virtual code environment', exclusive: 'enabled_artifacts_attachments', tip: 'Let Claude run code in a sandbox — use this for data analysis, file processing, or testing snippets' },
            { key: 'enabled_artifacts_attachments', name: 'Repl Tool', desc: 'Additional Artifacts features', exclusive: 'enabled_monkeys_in_a_barrel', tip: 'An alternative code tool that produces interactive artifacts and file attachments — cannot be active at the same time as Code Execution' },
            { key: 'enabled_saffron', name: 'Memory', desc: 'Cross-conversation memory', tip: 'Claude remembers details about you across chats — like your name, preferences, and past projects' },
            { key: 'enabled_saffron_search', name: 'Search Chats', desc: 'Chat history search', tip: 'Claude can search through your past conversations to recall things you discussed before' },
            { key: 'enabled_sourdough', name: 'Projects', desc: 'Project memory', tip: 'Group related chats into projects with shared context and instructions that persist across conversations' },
        ],

        _applyWidth(w) {
            document.documentElement.style.setProperty('--cue-panel-w', w + 'px');
        },

        toggle() {
            if (!this._panel) return;
            if (this._locked) return; // locked panel ignores toggle
            this._panel.classList.toggle(PREFIX + '-panel-hidden');
            this._visible = !this._panel.classList.contains(PREFIX + '-panel-hidden');
        },

        _setLocked(locked) {
            this._locked = locked;
            Settings.set('panelLocked', locked);
            const lockBtn = $(`#${PREFIX}-panel-lock`);
            if (lockBtn) {
                lockBtn.classList.toggle('locked', locked);
                const lockedPath = '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>';
                const unlockedPath = '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 019.9-1"/>';
                const svg = lockBtn.querySelector('svg');
                if (svg) setSafeHTML(svg, locked ? lockedPath : unlockedPath);
            }
            if (locked) {
                this._panel.classList.remove(PREFIX + '-panel-hidden');
                this._panel.style.pointerEvents = 'auto';
                this._visible = true;
                document.body.classList.add(PREFIX + '-panel-locked');
            } else {
                document.body.classList.remove(PREFIX + '-panel-locked');
            }
        },

        _initResize() {
            const handle = $(`#${PREFIX}-resize-handle`);
            if (!handle) return;
            let startX, startW;
            const onMove = (e) => {
                if (!this._resizing) return;
                const dx = startX - e.clientX;
                const newW = Math.max(240, Math.min(800, startW + dx));
                this._applyWidth(newW);
            };
            const onUp = () => {
                if (!this._resizing) return;
                this._resizing = false;
                handle.classList.remove('active');
                this._panel.classList.remove(PREFIX + '-resizing');
                document.removeEventListener('mousemove', onMove);
                document.removeEventListener('mouseup', onUp);
                const w = parseInt(getComputedStyle(this._panel).width);
                if (w) Settings.set('panelWidth', w);
            };
            handle.addEventListener('mousedown', (e) => {
                e.preventDefault();
                this._resizing = true;
                startX = e.clientX;
                startW = this._panel.offsetWidth;
                handle.classList.add('active');
                this._panel.classList.add(PREFIX + '-resizing');
                document.addEventListener('mousemove', onMove);
                document.addEventListener('mouseup', onUp);
            });
        },

        async build() {
            if (this._panel) return;

            // Apply saved width before styles render
            this._applyWidth(Settings.get('panelWidth'));

            this._createStyles();
            this._panel = document.createElement('div');
            this._panel.id = PREFIX + '-panel';
            if (!Settings.get('panelLocked')) {
                this._panel.className = PREFIX + '-panel-hidden';
            }

            setSafeHTML(this._panel, this._getHTML());
            document.body.appendChild(this._panel);
            this._bindEvents();
            this._initResize();
            this._loadData();

            // Restore lock state
            if (Settings.get('panelLocked')) {
                this._setLocked(true);
            }

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
                    background: var(--strip-color, rgba(88,166,255,0.2)); border-radius: 2px;
                    transition: opacity 0.3s, background 0.3s;
                }
                #${PREFIX}-hover-strip:hover::after { background: var(--strip-hover, rgba(88,166,255,0.5)); width: 4px; }

                /* Panel container */
                #${PREFIX}-panel {
                    position: fixed; top: 0; right: 0; width: var(--cue-panel-w, 310px); height: 100vh;
                    background: #0d0d14; border-left: 1px solid #2a2a3a;
                    z-index: 99999; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                    color: #c8c8d8; font-size: 11px; overflow-y: auto; overflow-x: hidden;
                    transition: transform 0.3s cubic-bezier(0.4,0,0.2,1), width 0s;
                    box-shadow: -4px 0 30px rgba(0,0,0,0.5);
                    display: flex; flex-direction: column;
                }
                #${PREFIX}-panel.${PREFIX}-panel-hidden { transform: translateX(100%); pointer-events: none; }
                #${PREFIX}-panel.${PREFIX}-resizing { transition: none !important; }
                #${PREFIX}-panel::-webkit-scrollbar { width: 4px; }
                #${PREFIX}-panel::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 2px; }

                /* Locked state - push page */
                body.${PREFIX}-panel-locked { margin-right: var(--cue-panel-w, 310px) !important; transition: margin-right 0.3s cubic-bezier(0.4,0,0.2,1); }
                body.${PREFIX}-panel-locked #${PREFIX}-hover-strip { display: none; }

                /* Resize handle */
                .${PREFIX}-resize-handle {
                    position: absolute; top: 0; left: -3px; width: 6px; height: 100%;
                    cursor: col-resize; z-index: 100000;
                }
                .${PREFIX}-resize-handle::after {
                    content: ''; position: absolute; top: 50%; left: 2px;
                    transform: translateY(-50%); width: 2px; height: 40px;
                    background: rgba(88,166,255,0); border-radius: 2px;
                    transition: background 0.2s;
                }
                .${PREFIX}-resize-handle:hover::after,
                .${PREFIX}-resize-handle.active::after { background: rgba(88,166,255,0.5); }

                /* Header - minimal */
                .${PREFIX}-hdr {
                    display: flex; align-items: center; justify-content: space-between;
                    padding: 4px 8px; background: rgba(255,255,255,0.03);
                    border-bottom: 1px solid #2a2a3a; flex-shrink: 0;
                }
                .${PREFIX}-hdr h2 { margin: 0; font-size: 12px; font-weight: 600; color: #e8e8f0; }
                .${PREFIX}-hdr-ver { font-size: 9px; color: #555; margin-left: 4px; }
                .${PREFIX}-hdr-actions { display: flex; align-items: center; gap: 2px; }
                .${PREFIX}-lock-btn {
                    background: none; border: none; color: #555; width: 20px; height: 20px;
                    cursor: pointer; font-size: 12px; display: flex; align-items: center;
                    justify-content: center; border-radius: 4px; transition: all 0.2s;
                }
                .${PREFIX}-lock-btn:hover { color: #58a6ff; background: rgba(88,166,255,0.1); }
                .${PREFIX}-lock-btn.locked { color: #58a6ff; }
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

                /* Prompt section */
                .${PREFIX}-prompts-section { padding-bottom: 0 !important; }
                .${PREFIX}-prompt-tabs {
                    display: flex; gap: 2px; margin-bottom: 4px; flex-wrap: wrap;
                }
                .${PREFIX}-ptab {
                    padding: 2px 6px; border-radius: 4px; border: 1px solid #2a2a3a;
                    background: rgba(255,255,255,0.02); color: #777; cursor: pointer;
                    font-size: 9px; font-weight: 600; transition: all 0.2s;
                }
                .${PREFIX}-ptab:hover { color: #bbb; background: rgba(255,255,255,0.05); }
                .${PREFIX}-ptab.active { color: var(--tab-color, #58a6ff); border-color: var(--tab-color, #58a6ff); background: rgba(88,166,255,0.08); }
                .${PREFIX}-prompt-row {
                    display: flex; align-items: center; gap: 2px; margin: 1px 0;
                }
                .${PREFIX}-prompt-btn {
                    display: flex; align-items: center; flex: 1; min-width: 0;
                    padding: 3px 6px; border-radius: 4px; border: 1px solid #2a2a3a;
                    background: rgba(255,255,255,0.03); color: #c8c8d8;
                    cursor: pointer; font-size: 10px; transition: all 0.2s;
                    text-align: left; overflow: hidden; white-space: nowrap;
                }
                .${PREFIX}-prompt-btn span { overflow: hidden; text-overflow: ellipsis; }
                .${PREFIX}-prompt-btn:hover { background: rgba(88,166,255,0.1); border-color: #58a6ff40; color: #fff; }
                .${PREFIX}-prompt-edit-btn {
                    background: none; border: 1px solid transparent; color: #555; cursor: pointer;
                    font-size: 11px; width: 20px; height: 20px; border-radius: 4px;
                    display: flex; align-items: center; justify-content: center; flex-shrink: 0;
                    transition: all 0.2s;
                }
                .${PREFIX}-prompt-edit-btn:hover { color: #58a6ff; background: rgba(88,166,255,0.1); border-color: #58a6ff40; }
                .${PREFIX}-prompt-mgr-btn {
                    padding: 1px 6px; border-radius: 4px; border: 1px solid #2a2a3a;
                    background: rgba(255,255,255,0.03); color: #888; cursor: pointer;
                    font-size: 9px; font-weight: 600; transition: all 0.2s;
                }
                .${PREFIX}-prompt-mgr-btn:hover { color: #58a6ff; background: rgba(88,166,255,0.08); border-color: #58a6ff40; }

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

                /* Prompt Manager overlay */
                .${PREFIX}-prompt-mgr {
                    width: 680px; max-width: 95vw; max-height: 85vh;
                    display: flex; flex-direction: column; padding: 0; overflow: hidden;
                }
                .${PREFIX}-mgr-header {
                    display: flex; align-items: center; justify-content: space-between;
                    padding: 12px 16px; border-bottom: 1px solid #2a2a3a;
                }
                .${PREFIX}-mgr-toolbar {
                    padding: 8px 16px; border-bottom: 1px solid #2a2a3a;
                    display: flex; flex-direction: column; gap: 6px;
                }
                .${PREFIX}-mgr-tabs { display: flex; gap: 3px; flex-wrap: wrap; }
                .${PREFIX}-mgr-search {
                    width: 100%; background: #1a1a2a; color: #c8c8d8; border: 1px solid #2a2a3a;
                    border-radius: 6px; padding: 6px 10px; font-size: 12px; outline: none;
                    box-sizing: border-box;
                }
                .${PREFIX}-mgr-search:focus { border-color: #58a6ff; }
                .${PREFIX}-mgr-list {
                    flex: 1; overflow-y: auto; padding: 4px 16px;
                }
                .${PREFIX}-mgr-item {
                    padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.04);
                    transition: background 0.15s;
                }
                .${PREFIX}-mgr-item:hover { background: rgba(255,255,255,0.02); margin: 0 -8px; padding-left: 8px; padding-right: 8px; border-radius: 6px; }
                .${PREFIX}-mgr-item-head {
                    display: flex; align-items: center; gap: 6px;
                }
                .${PREFIX}-mgr-item-dot {
                    width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0;
                }
                .${PREFIX}-mgr-item-label {
                    font-size: 12px; font-weight: 600; color: #e0e0f0; flex: 1; min-width: 0;
                    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
                }
                .${PREFIX}-mgr-item-cat {
                    font-size: 9px; color: #666; text-transform: uppercase; letter-spacing: 0.5px; flex-shrink: 0;
                }
                .${PREFIX}-mgr-item-actions {
                    display: flex; gap: 2px; flex-shrink: 0; opacity: 0; transition: opacity 0.15s;
                }
                .${PREFIX}-mgr-item:hover .${PREFIX}-mgr-item-actions { opacity: 1; }
                .${PREFIX}-mgr-act {
                    background: none; border: 1px solid transparent; cursor: pointer;
                    width: 22px; height: 22px; border-radius: 4px; font-size: 12px;
                    display: flex; align-items: center; justify-content: center; transition: all 0.15s;
                }
                .${PREFIX}-mgr-act.edit { color: #58a6ff; }
                .${PREFIX}-mgr-act.edit:hover { background: rgba(88,166,255,0.1); border-color: #58a6ff40; }
                .${PREFIX}-mgr-act.del { color: #f85149; }
                .${PREFIX}-mgr-act.del:hover { background: rgba(248,81,73,0.1); border-color: rgba(248,81,73,0.3); }
                .${PREFIX}-mgr-act.move { color: #8b949e; font-size: 8px; padding: 2px 4px; min-width: 16px; }
                .${PREFIX}-mgr-act.move:hover { background: rgba(139,148,158,0.15); color: #c9d1d9; }
                .${PREFIX}-mgr-item-preview {
                    font-size: 10px; color: #666; margin-top: 2px; line-height: 1.3;
                    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
                }
                .${PREFIX}-mgr-footer {
                    display: flex; gap: 6px; padding: 12px 16px; flex-wrap: wrap;
                    border-top: 1px solid #2a2a3a;
                }
                .${PREFIX}-cat-editor {
                    width: 100%; display: flex; flex-direction: column; gap: 4px; padding: 8px 16px;
                    border-bottom: 1px solid #2a2a3a; background: rgba(0,0,0,0.15);
                }
                .${PREFIX}-cat-row {
                    display: flex; align-items: center; gap: 6px; height: 28px;
                }
                .${PREFIX}-cat-row input[type="text"] {
                    flex: 1; background: #1a1a2a; color: #c8c8d8; border: 1px solid #2a2a3a;
                    border-radius: 4px; padding: 3px 8px; font-size: 11px; outline: none;
                    min-width: 0;
                }
                .${PREFIX}-cat-row input[type="text"]:focus { border-color: #58a6ff; }
                .${PREFIX}-cat-row input[type="color"] {
                    width: 24px; height: 24px; border: none; background: none; cursor: pointer;
                    padding: 0; border-radius: 4px;
                }
                .${PREFIX}-cat-row .${PREFIX}-cat-count {
                    font-size: 9px; color: #555; min-width: 20px; text-align: center;
                }
                .${PREFIX}-cat-row .${PREFIX}-cat-del {
                    background: none; border: none; color: #f85149; cursor: pointer;
                    font-size: 14px; width: 22px; height: 22px; display: flex; align-items: center;
                    justify-content: center; border-radius: 4px; opacity: 0.5; transition: all 0.15s;
                }
                .${PREFIX}-cat-row .${PREFIX}-cat-del:hover { opacity: 1; background: rgba(248,81,73,0.1); }
                .${PREFIX}-cat-add-row {
                    display: flex; gap: 6px; margin-top: 2px;
                }
                .${PREFIX}-cat-add-row button {
                    background: none; border: 1px dashed #333; color: #666; cursor: pointer;
                    border-radius: 4px; padding: 3px 10px; font-size: 10px; transition: all 0.15s;
                    flex: 1;
                }
                .${PREFIX}-cat-add-row button:hover { border-color: #58a6ff; color: #58a6ff; }

                /* Settings grid for two-column layout */
                .${PREFIX}-settings-grid {
                    display: grid; grid-template-columns: 1fr 1fr; gap: 0 6px;
                }
            `);
        },

        _getHTML() {
            return `
                <div class="${PREFIX}-resize-handle" id="${PREFIX}-resize-handle"></div>
                <div class="${PREFIX}-hdr">
                    <h2>CUE <span class="${PREFIX}-hdr-ver">v${VERSION}</span></h2>
                    <div class="${PREFIX}-hdr-actions">
                        <button class="${PREFIX}-lock-btn${Settings.get('panelLocked') ? ' locked' : ''}" id="${PREFIX}-panel-lock" title="Lock panel open">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                ${Settings.get('panelLocked')
                                    ? '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>'
                                    : '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 019.9-1"/>'
                                }
                            </svg>
                        </button>
                        <button class="${PREFIX}-close" id="${PREFIX}-panel-close" title="Close the panel (unlocks if locked)">&times;</button>
                    </div>
                </div>

                <div class="${PREFIX}-section">
                    <div class="${PREFIX}-row" title="Shows whether Claude is currently generating, finished, stuck, or idle"><span class="${PREFIX}-row-label">Response</span><span id="${PREFIX}-status"><span class="${PREFIX}-status-dot idle"></span>Idle</span></div>
                    <div class="${PREFIX}-row" title="Duration and word count of Claude's most recent response"><span class="${PREFIX}-row-label">Last</span><span id="${PREFIX}-last-resp" style="color:#666;font-size:10px">--</span></div>
                </div>

                <div class="${PREFIX}-section" title="Your current message usage for this billing period — resets daily or per-period depending on your plan">
                    <div id="${PREFIX}-usage-content"><span style="color:#555;font-size:10px">Loading usage...</span></div>
                </div>

                <div class="${PREFIX}-section">
                    <div class="${PREFIX}-section-title" title="Download your conversations in different formats for backup, sharing, or analysis">Export</div>
                    <div style="display:flex;flex-direction:column;gap:2px">
                        <button class="${PREFIX}-export-btn" id="${PREFIX}-export-json" title="Download the current chat as a structured JSON file using Claude's API — includes full message data, metadata, and optionally images">Export JSON</button>
                        <button class="${PREFIX}-export-btn" id="${PREFIX}-export-md" title="Download a simple Markdown copy of the current chat scraped from the page — good for quick notes or pasting into docs">Export MD</button>
                        <button class="${PREFIX}-export-btn" id="${PREFIX}-export-all" title="Batch-download all your Claude conversations as a ZIP of JSON files — useful for full account backups">Export All (ZIP)</button>
                    </div>
                    <div class="${PREFIX}-settings-grid" style="margin-top:3px">
                        ${this._makeToggle('exportBranchMode', 'Branches', 'Include all message branches and edits in the export — useful if you want to preserve alternate responses or edited messages')}
                        ${this._makeToggle('exportIncludeImages', 'Images', 'Embed images as base64 data inside the JSON export — makes the file self-contained but larger')}
                    </div>
                </div>

                <div class="${PREFIX}-section" id="${PREFIX}-features-section" title="Toggle Claude.ai beta features on or off — these are server-side flags that affect what Claude can do in your conversations">
                    <div id="${PREFIX}-features-content"><span style="color:#555;font-size:10px">Loading features...</span></div>
                </div>

                <div class="${PREFIX}-section">
                    <div class="${PREFIX}-settings-grid">
                        ${this._makeToggle('themeEnabled', 'Theme', 'Apply a custom dark color theme to Claude.ai — choose between Oceanic and Midnight variants below')}
                        ${this._makeToggle('fontOverride', 'Sans Fonts', 'Replace Claude\'s default serif font with a clean sans-serif font for easier reading')}
                        ${this._makeToggle('wideMode', 'Wide', 'Expand the chat area to use more of your screen — adjust the exact width with the slider below')}
                        ${this._makeToggle('coloredButtons', 'Btn Colors', 'Colorize action buttons (copy, edit, retry, thumbs up/down) so they\'re easier to identify at a glance')}
                        ${this._makeToggle('coloredBoldItalic', 'Bold/Ital', 'Make bold text green and italic text blue in Claude\'s responses for better visual scanning')}
                        ${this._makeToggle('smoothAnimations', 'Animate', 'Add subtle hover transitions and focus outlines to buttons throughout the interface')}
                        ${this._makeToggle('customScrollbar', 'Scrollbar', 'Replace the browser\'s default scrollbar with a slim, dark-themed scrollbar that matches the UI')}
                        ${this._makeToggle('pasteFix', 'Paste Fix', 'Strip rich formatting when pasting into the editor — pastes plain text instead of HTML, preventing broken formatting')}
                        ${this._makeToggle('autoScroll', 'Auto-Scroll', 'Automatically scroll to the bottom as Claude generates a response — keeps the latest text in view')}
                        ${this._makeToggle('autoApprove', 'Auto-Approve', 'Automatically click "Allow" on tool-use permission dialogs — saves clicks when using code execution or artifacts')}
                        ${this._makeToggle('responseMonitor', 'Resp Mon', 'Track response status (generating, complete, stuck, truncated) and measure response time and word count')}
                        ${this._makeToggle('notifySound', 'Sound', 'Play a short tone when Claude finishes generating — useful when you tab away while waiting')}
                        ${this._makeToggle('notifyFlash', 'Tab Flash', 'Flash the browser tab title when a response completes — catches your eye if you\'re in another tab')}
                        ${this._makeToggle('domTrimmer', 'DOM Trim', 'Hide older messages from the page to reduce browser memory usage in very long conversations — they reappear on scroll')}
                    </div>
                    <div class="${PREFIX}-row" style="margin-top:2px" title="Pick a color palette — Oceanic is blue-toned, Midnight is deeper and warmer, None disables theming entirely">
                        <span class="${PREFIX}-row-label" style="font-size:10px">Theme</span>
                        <select class="${PREFIX}-select" id="${PREFIX}-set-themeVariant">
                            <option value="oceanic">Oceanic</option>
                            <option value="midnight">Midnight</option>
                            <option value="none">None</option>
                        </select>
                    </div>
                    <div class="${PREFIX}-row" title="Set how much of the screen the chat uses — drag right for a wider conversation area">
                        <span class="${PREFIX}-row-label" style="font-size:10px">Width: <span id="${PREFIX}-width-val">${Settings.get('chatWidthPct')}</span>%</span>
                        <input type="range" class="${PREFIX}-slider" id="${PREFIX}-set-chatWidthPct" min="50" max="100" value="${Settings.get('chatWidthPct')}" style="width:100px">
                    </div>
                    <div class="${PREFIX}-row" title="How many messages stay visible in the DOM — lower values save memory in very long chats (hidden messages reappear when you scroll up)">
                        <span class="${PREFIX}-row-label" style="font-size:10px">Keep: <span id="${PREFIX}-trim-val">${Settings.get('domKeepVisible')}</span> msgs</span>
                        <input type="range" class="${PREFIX}-slider" id="${PREFIX}-set-domKeepVisible" min="5" max="100" value="${Settings.get('domKeepVisible')}" style="width:100px">
                    </div>
                </div>

                <div class="${PREFIX}-section ${PREFIX}-prompts-section" style="flex:1;overflow:hidden;display:flex;flex-direction:column;border-bottom:none">
                    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:3px">
                        <div class="${PREFIX}-section-title" style="margin:0" title="One-click prompt buttons — click any prompt to send it instantly, or use Manage to edit, add, and delete prompts">Prompts</div>
                        <div style="display:flex;gap:3px">
                            <button class="${PREFIX}-prompt-mgr-btn" id="${PREFIX}-prompt-add-quick" title="Create a new prompt and add it to the list">+</button>
                            <button class="${PREFIX}-prompt-mgr-btn" id="${PREFIX}-prompt-manage" title="Open the full prompt manager — edit, delete, search, and organize all your prompts">Manage</button>
                        </div>
                    </div>
                    <div class="${PREFIX}-prompt-tabs" id="${PREFIX}-prompt-tabs"></div>
                    <div id="${PREFIX}-prompt-list" style="flex:1;overflow-y:auto;overflow-x:hidden"></div>
                </div>

                <div style="text-align:center;padding:4px 8px;border-top:1px solid rgba(255,255,255,0.04)"><span style="cursor:pointer;color:#58a6ff;font-size:9px" id="${PREFIX}-reset-settings" title="Reset every CUE setting to factory defaults and reload the page">Reset All</span></div>
            `;
        },

        _makeToggle(key, label, tip = '') {
            const checked = Settings.get(key) ? 'checked' : '';
            return `<div class="${PREFIX}-row" style="min-height:16px"${tip ? ` title="${esc(tip)}"` : ''}>
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
            $(`#${PREFIX}-panel-close`).addEventListener('click', () => {
                if (this._locked) this._setLocked(false);
                this.toggle();
            });

            // Lock button
            $(`#${PREFIX}-panel-lock`).addEventListener('click', () => {
                this._setLocked(!this._locked);
            });

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
                Settings.reset();
                showToast('Settings reset to defaults, reloading...', 1500, 'info');
                setTimeout(() => location.reload(), 1500);
            });

            // Prompt management buttons
            $(`#${PREFIX}-prompt-add-quick`).addEventListener('click', () => this._showPromptEditor());
            $(`#${PREFIX}-prompt-manage`).addEventListener('click', () => this._showPromptManager());

            // Listen for updates
            EventBus.on('response:status', (s) => this._updateStatus(s));
            EventBus.on('response:complete', (d) => this._updateLastResponse(d));
            EventBus.on('stream:messageLimit', (ml) => this._updateUsageFromStream(ml));

            // Bind export buttons
            const expJson = $(`#${PREFIX}-export-json`);
            const expMd = $(`#${PREFIX}-export-md`);
            const expAll = $(`#${PREFIX}-export-all`);
            if (expJson) expJson.addEventListener('click', () => ExportModule.exportCurrentJSON());
            if (expMd) expMd.addEventListener('click', () => ExportModule.exportMarkdown());
            if (expAll) expAll.addEventListener('click', () => ExportModule.exportAllZIP());

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
            setSafeHTML(container, html || '<span style="color:#555;font-size:10px">No usage data</span>');
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
            if (html) setSafeHTML(container, html);
            const session = windows['5h'];
            if (session) this._updateGearBadge(Math.round((session.utilization || 0) * 100));
        },

        _renderFeatures(settings) {
            const container = $(`#${PREFIX}-features-content`);
            if (!container) return;
            setSafeHTML(container, this.FEATURES.map(f => {
                const on = settings[f.key] === true;
                const tip = f.tip || f.desc || '';
                return `<div class="${PREFIX}-feat-row" title="${esc(tip)}">
                        <span class="${PREFIX}-feat-name">${f.name}</span>
                        <button class="${PREFIX}-feat-btn ${on ? 'on' : 'off'}"
                                data-feat="${f.key}" data-exclusive="${f.exclusive || ''}">${on ? 'ON' : 'OFF'}</button>
                    </div>`;
            }).join(''));
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

        _activePromptCat: 'all',

        _renderPromptTabs() {
            const tabs = $(`#${PREFIX}-prompt-tabs`);
            if (!tabs) return;
            tabs.textContent = '';
            const allTab = document.createElement('button');
            allTab.className = `${PREFIX}-ptab${this._activePromptCat === 'all' ? ' active' : ''}`;
            allTab.textContent = 'All';
            allTab.addEventListener('click', () => { this._activePromptCat = 'all'; this._renderPromptTabs(); this._renderPrompts(); });
            tabs.appendChild(allTab);
            PromptModule.categories.forEach(cat => {
                const count = PromptModule.prompts.filter(p => p.cat === cat.id && p.prompt).length;
                if (count === 0) return;
                const tab = document.createElement('button');
                tab.className = `${PREFIX}-ptab${this._activePromptCat === cat.id ? ' active' : ''}`;
                tab.textContent = cat.label;
                tab.style.setProperty('--tab-color', cat.color);
                tab.addEventListener('click', () => { this._activePromptCat = cat.id; this._renderPromptTabs(); this._renderPrompts(); });
                tabs.appendChild(tab);
            });
        },

        _renderPrompts() {
            const container = $(`#${PREFIX}-prompt-list`);
            if (!container) return;
            container.textContent = '';
            this._renderPromptTabs();
            const filtered = this._activePromptCat === 'all'
                ? PromptModule.prompts.filter(p => p.prompt)
                : PromptModule.prompts.filter(p => p.cat === this._activePromptCat && p.prompt);
            if (filtered.length === 0) {
                const empty = document.createElement('div');
                empty.style.cssText = 'color:#555;font-size:10px;text-align:center;padding:12px 0';
                empty.textContent = 'No prompts in this category';
                container.appendChild(empty);
                return;
            }
            filtered.forEach(p => {
                const cat = PromptModule.categories.find(c => c.id === p.cat);
                const row = document.createElement('div');
                row.className = `${PREFIX}-prompt-row`;
                const btn = document.createElement('button');
                btn.className = `${PREFIX}-prompt-btn`;
                btn.title = p.prompt.substring(0, 150);
                const dot = cat ? `<span style="color:${cat.color};margin-right:3px">&#9679;</span>` : '';
                setSafeHTML(btn, `${dot}<span>${esc(p.label)}</span>`);
                btn.addEventListener('click', () => { PromptModule.send(p.prompt); this.toggle(); });
                const editBtn = document.createElement('button');
                editBtn.className = `${PREFIX}-prompt-edit-btn`;
                editBtn.textContent = '\u270E';
                editBtn.title = 'Edit prompt';
                editBtn.addEventListener('click', (e) => { e.stopPropagation(); this._showPromptEditor(p); });
                row.appendChild(btn);
                row.appendChild(editBtn);
                container.appendChild(row);
            });
        },

        _showPromptEditor(existing = null) {
            const overlay = document.createElement('div');
            overlay.className = PREFIX + '-modal-overlay';
            const modal = document.createElement('div');
            modal.className = PREFIX + '-modal';
            setSafeHTML(modal, `
                <h3>${existing ? 'Edit' : 'New'} Prompt</h3>
                <input id="${PREFIX}-pe-label" placeholder="Button label" value="${existing ? esc(existing.label) : ''}">
                <textarea id="${PREFIX}-pe-text" placeholder="Prompt text...">${existing ? esc(existing.prompt) : ''}</textarea>
                <div style="margin-top:10px">
                    <select class="${PREFIX}-select" id="${PREFIX}-pe-cat" style="width:100%">
                        ${PromptModule.categories.map(c => `<option value="${c.id}" ${existing?.cat === c.id ? 'selected' : ''}>${c.label}</option>`).join('')}
                    </select>
                </div>
                <div class="${PREFIX}-modal-actions">
                    ${existing ? `<button class="${PREFIX}-modal-btn danger" id="${PREFIX}-pe-delete">Delete</button>` : ''}
                    <button class="${PREFIX}-modal-btn secondary" id="${PREFIX}-pe-cancel">Cancel</button>
                    <button class="${PREFIX}-modal-btn primary" id="${PREFIX}-pe-save">Save</button>
                </div>
            `);
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

        _showPromptManager() {
            const overlay = document.createElement('div');
            overlay.className = PREFIX + '-modal-overlay';
            const mgr = document.createElement('div');
            mgr.className = `${PREFIX}-modal ${PREFIX}-prompt-mgr`;

            const renderManager = () => {
                const activeCat = mgr._filterCat || 'all';
                const search = (mgr._search || '').toLowerCase();
                let prompts = activeCat === 'all'
                    ? [...PromptModule.prompts]
                    : PromptModule.prompts.filter(p => p.cat === activeCat);
                if (search) prompts = prompts.filter(p =>
                    p.label.toLowerCase().includes(search) || p.prompt.toLowerCase().includes(search)
                );

                let html = `<div class="${PREFIX}-mgr-header">
                    <h3 style="margin:0;font-size:15px;color:#e8e8f0">Prompt Manager</h3>
                    <button class="${PREFIX}-close" id="${PREFIX}-mgr-close">&times;</button>
                </div>
                <div class="${PREFIX}-mgr-toolbar">
                    <div class="${PREFIX}-mgr-tabs">
                        <button class="${PREFIX}-ptab${activeCat === 'all' ? ' active' : ''}" data-mgr-cat="all">All (${PromptModule.prompts.length})</button>
                        ${PromptModule.categories.map(c => {
                            const cnt = PromptModule.prompts.filter(p => p.cat === c.id).length;
                            return `<button class="${PREFIX}-ptab${activeCat === c.id ? ' active' : ''}" data-mgr-cat="${c.id}" style="--tab-color:${c.color}">${c.label} (${cnt})</button>`;
                        }).join('')}
                    </div>
                    <input type="text" class="${PREFIX}-mgr-search" id="${PREFIX}-mgr-search" placeholder="Search prompts..." value="${esc(mgr._search || '')}">
                </div>
                <div class="${PREFIX}-mgr-list">`;

                if (prompts.length === 0) {
                    html += `<div style="text-align:center;color:#555;padding:24px">No prompts found</div>`;
                } else {
                    prompts.forEach((p, i) => {
                        const cat = PromptModule.categories.find(c => c.id === p.cat);
                        const catColor = cat ? cat.color : '#888';
                        const catLabel = cat ? cat.label : p.cat;
                        const preview = p.prompt ? p.prompt.substring(0, 120).replace(/\n/g, ' ') : '(empty)';
                        // Find real index in full prompts array for reorder
                        const realIdx = PromptModule.prompts.indexOf(p);
                        const isFirst = realIdx === 0;
                        const isLast = realIdx === PromptModule.prompts.length - 1;
                        html += `<div class="${PREFIX}-mgr-item" data-mgr-idx="${i}">
                            <div class="${PREFIX}-mgr-item-head">
                                <span class="${PREFIX}-mgr-item-dot" style="background:${catColor}"></span>
                                <span class="${PREFIX}-mgr-item-label">${esc(p.label)}</span>
                                <span class="${PREFIX}-mgr-item-cat">${esc(catLabel)}</span>
                                <div class="${PREFIX}-mgr-item-actions">
                                    <button class="${PREFIX}-mgr-act move" data-mgr-id="${esc(p.id)}" data-dir="up" title="Move up"${isFirst ? ' disabled style="opacity:0.2;pointer-events:none"' : ''}>\u25B2</button>
                                    <button class="${PREFIX}-mgr-act move" data-mgr-id="${esc(p.id)}" data-dir="down" title="Move down"${isLast ? ' disabled style="opacity:0.2;pointer-events:none"' : ''}>\u25BC</button>
                                    <button class="${PREFIX}-mgr-act edit" data-mgr-id="${esc(p.id)}" title="Edit">\u270E</button>
                                    <button class="${PREFIX}-mgr-act del" data-mgr-id="${esc(p.id)}" title="Delete">&times;</button>
                                </div>
                            </div>
                            <div class="${PREFIX}-mgr-item-preview">${esc(preview)}</div>
                        </div>`;
                    });
                }

                html += `</div>
                <div class="${PREFIX}-mgr-footer">
                    <button class="${PREFIX}-modal-btn primary" id="${PREFIX}-mgr-add">+ New Prompt</button>
                    <button class="${PREFIX}-modal-btn secondary" id="${PREFIX}-mgr-groups" title="Edit group names, colors, and create new groups">Groups</button>
                    <button class="${PREFIX}-modal-btn secondary" id="${PREFIX}-mgr-export" title="Download all prompts as a JSON file for backup or sharing">Export</button>
                    <button class="${PREFIX}-modal-btn secondary" id="${PREFIX}-mgr-import" title="Import prompts from a previously exported JSON file">Import</button>
                    <button class="${PREFIX}-modal-btn secondary" id="${PREFIX}-mgr-restore">Restore Defaults</button>
                </div>`;

                if (mgr._showGroups) {
                    // Insert groups editor before footer
                    const groupsHTML = `<div class="${PREFIX}-cat-editor" id="${PREFIX}-cat-editor">
                        <div style="font-size:10px;color:#888;margin-bottom:2px;text-transform:uppercase;letter-spacing:0.5px">Groups</div>
                        ${PromptModule.categories.map((c, i) => {
                            const cnt = PromptModule.prompts.filter(p => p.cat === c.id).length;
                            return `<div class="${PREFIX}-cat-row" data-cat-idx="${i}">
                                <input type="color" value="${c.color}" data-cat-color="${c.id}" title="Change color">
                                <input type="text" value="${esc(c.label)}" data-cat-rename="${c.id}" title="Rename group">
                                <span class="${PREFIX}-cat-count">${cnt}</span>
                                <button class="${PREFIX}-cat-del" data-cat-del="${c.id}" title="Delete group${cnt ? ' (' + cnt + ' prompts will move)' : ''}">&times;</button>
                            </div>`;
                        }).join('')}
                        <div class="${PREFIX}-cat-add-row">
                            <button id="${PREFIX}-cat-add-btn">+ Add Group</button>
                        </div>
                    </div>`;
                    html = html.replace(`<div class="${PREFIX}-mgr-footer">`, groupsHTML + `<div class="${PREFIX}-mgr-footer">`);
                }

                setSafeHTML(mgr, html);

                // Bind events inside manager
                $(`#${PREFIX}-mgr-close`, mgr).addEventListener('click', () => overlay.remove());
                $(`#${PREFIX}-mgr-search`, mgr).addEventListener('input', (e) => { mgr._search = e.target.value; renderManager(); });
                mgr.querySelectorAll(`[data-mgr-cat]`).forEach(tab => {
                    tab.addEventListener('click', () => { mgr._filterCat = tab.dataset.mgrCat; renderManager(); });
                });
                mgr.querySelectorAll(`.${PREFIX}-mgr-act.edit`).forEach(btn => {
                    btn.addEventListener('click', () => {
                        const p = PromptModule.prompts.find(x => x.id === btn.dataset.mgrId);
                        if (p) { overlay.remove(); this._showPromptEditor(p); }
                    });
                });
                mgr.querySelectorAll(`.${PREFIX}-mgr-act.del`).forEach(btn => {
                    btn.addEventListener('click', () => {
                        PromptModule.remove(btn.dataset.mgrId);
                        this._renderPrompts();
                        renderManager();
                        showToast('Prompt deleted', 1500, 'info');
                    });
                });
                // #12: Reorder buttons
                mgr.querySelectorAll(`.${PREFIX}-mgr-act.move`).forEach(btn => {
                    btn.addEventListener('click', () => {
                        const id = btn.dataset.mgrId;
                        const dir = btn.dataset.dir;
                        const arr = PromptModule.prompts;
                        const idx = arr.findIndex(p => p.id === id);
                        if (idx < 0) return;
                        const swap = dir === 'up' ? idx - 1 : idx + 1;
                        if (swap < 0 || swap >= arr.length) return;
                        [arr[idx], arr[swap]] = [arr[swap], arr[idx]];
                        PromptModule.save();
                        this._renderPrompts();
                        renderManager();
                    });
                });
                const addBtn = $(`#${PREFIX}-mgr-add`, mgr);
                if (addBtn) addBtn.addEventListener('click', () => { overlay.remove(); this._showPromptEditor(); });
                // Groups toggle
                const groupsBtn = $(`#${PREFIX}-mgr-groups`, mgr);
                if (groupsBtn) groupsBtn.addEventListener('click', () => { mgr._showGroups = !mgr._showGroups; renderManager(); });
                // Category editor bindings
                mgr.querySelectorAll(`[data-cat-rename]`).forEach(input => {
                    const debounce = () => {
                        const val = input.value.trim();
                        if (val) { PromptModule.renameCategory(input.dataset.catRename, val); this._renderPrompts(); }
                    };
                    input.addEventListener('change', debounce);
                    input.addEventListener('blur', debounce);
                });
                mgr.querySelectorAll(`[data-cat-color]`).forEach(input => {
                    input.addEventListener('input', () => {
                        PromptModule.setCategoryColor(input.dataset.catColor, input.value);
                        this._renderPrompts();
                        renderManager();
                    });
                });
                mgr.querySelectorAll(`[data-cat-del]`).forEach(btn => {
                    btn.addEventListener('click', () => {
                        if (PromptModule.categories.length <= 1) { showToast('Need at least one group', 2000, 'warn'); return; }
                        PromptModule.removeCategory(btn.dataset.catDel);
                        this._renderPrompts();
                        renderManager();
                        showToast('Group deleted', 1500, 'info');
                    });
                });
                const catAddBtn = $(`#${PREFIX}-cat-add-btn`, mgr);
                if (catAddBtn) catAddBtn.addEventListener('click', () => {
                    const colors = ['#ff6b6b','#ffa94d','#ffd43b','#69db7c','#38d9a9','#4dabf7','#748ffc','#da77f2','#f783ac'];
                    const color = colors[PromptModule.categories.length % colors.length];
                    PromptModule.addCategory('New Group', color);
                    this._renderPrompts();
                    renderManager();
                    // Auto-focus the new group's name input
                    setTimeout(() => {
                        const inputs = mgr.querySelectorAll(`[data-cat-rename]`);
                        const last = inputs[inputs.length - 1];
                        if (last) { last.focus(); last.select(); }
                    }, 50);
                });
                // #9: Export prompts as JSON
                const exportBtn = $(`#${PREFIX}-mgr-export`, mgr);
                if (exportBtn) exportBtn.addEventListener('click', () => {
                    const data = JSON.stringify({
                        categories: PromptModule.categories,
                        prompts: PromptModule.prompts.map(p => ({ id: p.id, label: p.label, prompt: p.prompt, cat: p.cat }))
                    }, null, 2);
                    const blob = new Blob([data], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url; a.download = `cue_prompts_${new Date().toISOString().slice(0, 10)}.json`;
                    document.body.appendChild(a); a.click(); a.remove();
                    URL.revokeObjectURL(url);
                    showToast(`Exported ${PromptModule.prompts.length} prompts + ${PromptModule.categories.length} groups`, 2000, 'success');
                });
                // #9: Import prompts from JSON file
                const importBtn = $(`#${PREFIX}-mgr-import`, mgr);
                if (importBtn) importBtn.addEventListener('click', () => {
                    const input = document.createElement('input');
                    input.type = 'file'; input.accept = '.json';
                    input.addEventListener('change', () => {
                        const file = input.files[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = () => {
                            try {
                                const raw = JSON.parse(reader.result);
                                // Support both formats: {categories, prompts} or plain array
                                const imported = Array.isArray(raw) ? raw : (raw.prompts || []);
                                const importedCats = raw.categories || [];
                                // Import categories first
                                let catsAdded = 0;
                                for (const c of importedCats) {
                                    if (!c.id || !c.label) continue;
                                    if (!PromptModule.categories.find(x => x.id === c.id)) {
                                        PromptModule.categories.push({ id: c.id, label: c.label, color: c.color || '#888' });
                                        catsAdded++;
                                    }
                                }
                                if (catsAdded) PromptModule.saveCategories();
                                // Import prompts
                                let added = 0;
                                for (const p of imported) {
                                    if (!p.label || typeof p.prompt !== 'string') continue;
                                    if (p.id && PromptModule.prompts.find(x => x.id === p.id)) continue;
                                    let cat = p.cat;
                                    if (!cat || !PromptModule.categories.find(c => c.id === cat)) {
                                        if (p.cat && typeof p.cat === 'string') { PromptModule.addCategory(p.cat); cat = PromptModule.categories[PromptModule.categories.length - 1].id; }
                                        else cat = PromptModule.categories[0]?.id || 'writing';
                                    }
                                    PromptModule.add(p.label, p.prompt, cat);
                                    added++;
                                }
                                this._renderPrompts();
                                renderManager();
                                showToast(`Imported ${added} prompts${catsAdded ? ', ' + catsAdded + ' groups' : ''} (${imported.length - added} skipped)`, 3000, 'success');
                            } catch (e) {
                                showToast('Invalid prompts file: ' + e.message, 3000, 'error');
                            }
                        };
                        reader.readAsText(file);
                    });
                    input.click();
                });
                const restoreBtn = $(`#${PREFIX}-mgr-restore`, mgr);
                if (restoreBtn) restoreBtn.addEventListener('click', () => {
                    PromptModule.prompts = PromptModule.DEFAULT_PROMPTS.map(d => ({ ...d }));
                    PromptModule.categories = PromptModule.DEFAULT_CATEGORIES.map(c => ({ ...c }));
                    PromptModule.save();
                    PromptModule.saveCategories();
                    this._renderPrompts();
                    renderManager();
                    showToast('Defaults restored (prompts + groups)', 2000, 'success');
                });
            };

            overlay.appendChild(mgr);
            document.body.appendChild(overlay);
            overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
            renderManager();
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
            setSafeHTML(el, `<span class="${PREFIX}-status-dot ${cls}"></span>${txt}`);
        },

        _updateLastResponse(d) {
            const el = $(`#${PREFIX}-last-resp`);
            if (el) el.textContent = `${fmtDur(d.duration)} / ${fmtNum(d.words)} words`;
        },

        _updateGearBadge(pct) {
            const strip = $(`#${PREFIX}-hover-strip`);
            if (!strip) return;
            const color = pct > 80 ? 'rgba(248,81,73,0.6)' : pct > 60 ? 'rgba(210,153,34,0.5)' : 'rgba(88,166,255,0.2)';
            const hover = pct > 80 ? 'rgba(248,81,73,0.8)' : pct > 60 ? 'rgba(210,153,34,0.7)' : 'rgba(88,166,255,0.5)';
            strip.style.setProperty('--strip-color', color);
            strip.style.setProperty('--strip-hover', hover);
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
                if (this._locked) return; // locked panel is always visible
                clearTimeout(hideTimeout);
                if (this._panel && this._panel.classList.contains(PREFIX + '-panel-hidden')) {
                    this._panel.classList.remove(PREFIX + '-panel-hidden');
                    this._panel.style.pointerEvents = 'auto';
                    this._visible = true;
                }
            };
            const scheduleHide = () => {
                if (this._locked || this._resizing) return; // never auto-hide when locked or resizing
                clearTimeout(hideTimeout);
                hideTimeout = setTimeout(() => {
                    if (this._locked || this._resizing) return;
                    if (this._panel && !this._panel.matches(':hover') && !strip.matches(':hover')) {
                        this._panel.classList.add(PREFIX + '-panel-hidden');
                        this._visible = false;
                    }
                }, 400);
            };

            strip.addEventListener('mouseenter', showPanel);
            strip.addEventListener('mouseleave', scheduleHide);
            if (this._panel) {
                this._panel.addEventListener('mouseenter', () => { if (!this._locked) clearTimeout(hideTimeout); });
                this._panel.addEventListener('mouseleave', scheduleHide);
            }
        },

        destroy() {
            clearInterval(this._refreshTimer);
            document.body.classList.remove(PREFIX + '-panel-locked');
        }
    };

    // =====================================================================
    //  INITIALIZATION
    // =====================================================================
    async function init() {
        console.log(`%c${LOG_TAG} Claude Ultimate Enhancer v${VERSION} initializing...`, 'color:#58a6ff;font-weight:bold;font-size:14px');

        // Install fetch interceptor early (before any fetches)
        StreamMonitor.install();

        // Init modules that work at document-start
        ThemeModule.init();
        LayoutModule.init();
        PasteFixModule.init();

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
                ResponseModule._streamActive = false;
                ResponseModule._pollFallbackCount = 0;
                ResponseModule.lastDuration = 0;
                ResponseModule.lastWords = 0;
                ResponseModule.lastChars = 0;
                ResponseModule._stopTimer();
                EventBus.emit('response:status', 'idle');
                EventBus.emit('navigation', location.href);
            }
        }, 2000);

        console.log(`%c${LOG_TAG} Ready! Hover right edge to open panel`, 'color:#3fb950;font-weight:bold');
    }

    // Start
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();