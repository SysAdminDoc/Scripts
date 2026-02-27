// ==UserScript==
// @name         Claude Ultimate Enhancer
// @namespace    https://github.com/SysAdminDoc
// @version      2.1.0
// @description  All-in-one Claude.ai enhancement suite + full history sidebar replacement — theme-aware panel with collapsible groups, Catppuccin themes with code block styling, R89 theme bridge, usage monitor, prompt library with variables, AutoBuild workflow, smart continue with verification, chunked paste, sidebar search/filter, sidebar auto-expand, starred chat highlights, quick rename, settings backup/restore, persistent sparkline, error recovery bar, model badge, session stats, input counter, lockable/resizable panel with help tooltips, auto-scroll, DOM trimmer, visual upgrades, API-powered export with rate limiting, and more
// @author       SysAdminDoc
// @match        https://claude.ai/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_addStyle
// @require      https://cdn.jsdelivr.net/npm/fflate@0.8.2/umd/index.min.js
// @updateURL    https://github.com/SysAdminDoc/Claude-Ultimate-Enhancer/raw/main/Claude_Ultimate_Enhancer.user.js
// @downloadURL  https://github.com/SysAdminDoc/Claude-Ultimate-Enhancer/raw/main/Claude_Ultimate_Enhancer.user.js
// @run-at       document-start
// @license      MIT
// ==/UserScript==

(function () {
    'use strict';

    if (window.__claudeUltimateLoaded) return;
    window.__claudeUltimateLoaded = true;

    const VERSION = '2.1.0';
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
            themeVariant: 'oceanic',   // oceanic | midnight | mocha | macchiato | frappe | latte | none
            themeAccent: 'mauve',      // Catppuccin accent color name
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
            panelWidth: 380,
            panelLocked: false,
            // -- Prompt Library --
            promptLibrary: true,
            // -- Response Monitor --
            responseMonitor: true,
            notifySound: true,
            notifyFlash: true,
            // -- Paste --
            pasteFix: true,
            chunkedPaste: true,
            chunkedLinesPerChunk: 50,
            chunkedMinLines: 5,
            // -- Sidebar --
            sidebarAutoExpand: false,
            starredHighlight: true,
            // -- AutoBuild --
            autoBuildContinueDelay: 8,
            autoBuildMaxRetries: 2,
            // -- Auto Continue --
            autoContinue: false,
            // -- History Panel --
            historyPanel: true,
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
        once(event, fn) {
            const wrapper = (data) => { this.off(event, wrapper); fn(data); };
            return this.on(event, wrapper);
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
    const $ = (sel, ctx) => {
        if (ctx) return ctx.querySelector(sel);
        // Check shadow root first for panel elements, fall back to document
        if (ControlPanel._root) {
            const el = ControlPanel._root.querySelector(sel);
            if (el) return el;
        }
        return document.querySelector(sel);
    };
    const $$ = (sel, ctx) => {
        if (ctx) return [...ctx.querySelectorAll(sel)];
        if (ControlPanel._root) {
            const els = ControlPanel._root.querySelectorAll(sel);
            if (els.length) return [...els];
        }
        return [...document.querySelectorAll(sel)];
    };
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

    const _activeToasts = [];
    function showToast(msg, duration = 3500, type = 'info') {
        const colors = { info: '#58a6ff', success: '#3fb950', warn: '#d29922', error: '#f85149' };
        const toast = document.createElement('div');
        Object.assign(toast.style, {
            position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)',
            background: '#1a1a2e', color: '#e0e0e0', padding: '12px 24px', borderRadius: '10px',
            boxShadow: `0 4px 24px rgba(0,0,0,0.5), 0 0 0 1px ${colors[type]}40`,
            zIndex: '999999', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
            fontSize: '14px', borderLeft: `4px solid ${colors[type]}`, transition: 'opacity 0.4s, transform 0.4s',
            opacity: '0', maxWidth: '500px', pointerEvents: 'none'
        });
        toast.textContent = msg;
        document.body.appendChild(toast);
        _activeToasts.push(toast);
        _repositionToasts();
        requestAnimationFrame(() => { toast.style.opacity = '1'; });
        const remove = () => {
            toast.style.opacity = '0';
            const idx = _activeToasts.indexOf(toast);
            if (idx > -1) _activeToasts.splice(idx, 1);
            _repositionToasts();
            setTimeout(() => toast.remove(), 400);
        };
        setTimeout(remove, duration);
    }
    function _repositionToasts() {
        let offset = 24;
        for (let i = _activeToasts.length - 1; i >= 0; i--) {
            _activeToasts[i].style.bottom = offset + 'px';
            offset += _activeToasts[i].offsetHeight + 8;
        }
    }

    // =====================================================================
    //  DOM SELECTORS (self-healing with fallback chains)
    // =====================================================================
    const SelectorEngine = {
        _cache: new Map(),
        _CACHE_TTL: 10000, // 10s TTL - prevents stale selectors after SPA component swaps
        _defs: {
            editor:    ['.ProseMirror', 'div[contenteditable="true"][translate="no"]', '[data-testid="chat-input"] [contenteditable]', 'main [contenteditable="true"]'],
            sendBtn:   ['[data-testid="send-button"]', 'button[aria-label*="Send"]', 'main button[type="submit"]'],
            stopBtn:   ['[data-testid="stop-button"]', 'button[aria-label*="Stop"]'],
            userMsg:   ['[data-testid="user-message"]', '[data-testid="human-turn"]'],
            msgGroup:  ['.group', '[data-testid="conversation-turn"]', 'main > div > div > div > div'],
            streaming: ['[data-is-streaming="true"]'],
            dialog:    ['[role="dialog"]'],
            dialogOpen:['[role="dialog"][data-state="open"]', '[role="dialog"]'],
            main:      ['main', '#main-content'],
        },
        find(role) {
            const cached = this._cache.get(role);
            if (cached && Date.now() - cached.time < this._CACHE_TTL) {
                const el = document.querySelector(cached.sel);
                if (el) return el;
            }
            this._cache.delete(role);
            const chain = this._defs[role];
            if (!chain) return document.querySelector(role);
            for (const sel of chain) {
                const el = document.querySelector(sel);
                if (el) { this._cache.set(role, { sel, time: Date.now() }); return el; }
            }
            return null;
        },
        findAll(role) {
            const chain = this._defs[role];
            if (!chain) return [...document.querySelectorAll(role)];
            for (const sel of chain) {
                const els = document.querySelectorAll(sel);
                if (els.length > 0) return [...els];
            }
            return [];
        },
        invalidate() { this._cache.clear(); }
    };

    // =====================================================================
    //  CATPPUCCIN PALETTES + COLOR HELPERS
    // =====================================================================
    const CATPPUCCIN = {
        latte: {
            rosewater:'#dc8a78',flamingo:'#dd7878',pink:'#ea76cb',mauve:'#8839ef',red:'#d20f39',maroon:'#e64553',
            peach:'#fe640b',yellow:'#df8e1d',green:'#40a02b',teal:'#179299',sky:'#04a5e5',sapphire:'#209fb5',
            blue:'#1e66f5',lavender:'#7287fd',text:'#4c4f69',subtext1:'#5c5f77',subtext0:'#6c6f85',
            overlay2:'#7c7f93',overlay1:'#8c8fa1',overlay0:'#9ca0b0',surface2:'#acb0be',surface1:'#bcc0cc',
            surface0:'#ccd0da',base:'#eff1f5',mantle:'#e6e9ef',crust:'#dce0e8',
        },
        frappe: {
            rosewater:'#f2d5cf',flamingo:'#eebebe',pink:'#f4b8e4',mauve:'#ca9ee6',red:'#e78284',maroon:'#ea999c',
            peach:'#ef9f76',yellow:'#e5c890',green:'#a6d189',teal:'#81c8be',sky:'#99d1db',sapphire:'#85c1dc',
            blue:'#8caaee',lavender:'#babbf1',text:'#c6d0f5',subtext1:'#b5bfe2',subtext0:'#a5adce',
            overlay2:'#949cbb',overlay1:'#838ba7',overlay0:'#737994',surface2:'#626880',surface1:'#51576d',
            surface0:'#414559',base:'#303446',mantle:'#292c3c',crust:'#232634',
        },
        macchiato: {
            rosewater:'#f4dbd6',flamingo:'#f0c6c6',pink:'#f5bde6',mauve:'#c6a0f6',red:'#ed8796',maroon:'#ee99a0',
            peach:'#f5a97f',yellow:'#eed49f',green:'#a6da95',teal:'#8bd5ca',sky:'#91d7e3',sapphire:'#7dc4e4',
            blue:'#8aadf4',lavender:'#b7bdf8',text:'#cad3f5',subtext1:'#b8c0e0',subtext0:'#a5adcb',
            overlay2:'#939ab7',overlay1:'#8087a2',overlay0:'#6e738d',surface2:'#5b6078',surface1:'#494d64',
            surface0:'#363a4f',base:'#24273a',mantle:'#1e2030',crust:'#181926',
        },
        mocha: {
            rosewater:'#f5e0dc',flamingo:'#f2cdcd',pink:'#f5c2e7',mauve:'#cba6f7',red:'#f38ba8',maroon:'#eba0ac',
            peach:'#fab387',yellow:'#f9e2af',green:'#a6e3a1',teal:'#94e2d5',sky:'#89dceb',sapphire:'#74c7ec',
            blue:'#89b4fa',lavender:'#b4befe',text:'#cdd6f4',subtext1:'#bac2de',subtext0:'#a6adc8',
            overlay2:'#9399b2',overlay1:'#7f849c',overlay0:'#6c7086',surface2:'#585b70',surface1:'#45475a',
            surface0:'#313244',base:'#1e1e2e',mantle:'#181825',crust:'#11111b',
        },
    };

    const ACCENT_NAMES = ['rosewater','flamingo','pink','mauve','red','maroon','peach','yellow','green','teal','sky','sapphire','blue','lavender'];

    function hexToRGB(hex) { const h = hex.replace('#',''); return { r: parseInt(h.slice(0,2),16), g: parseInt(h.slice(2,4),16), b: parseInt(h.slice(4,6),16) }; }
    function rgbToHSL({r,g,b}) {
        r/=255;g/=255;b/=255; const mx=Math.max(r,g,b),mn=Math.min(r,g,b); let h=0,s=0; const l=(mx+mn)/2;
        if(mx!==mn){const d=mx-mn;s=l>0.5?d/(2-mx-mn):d/(mx+mn);switch(mx){case r:h=((g-b)/d+(g<b?6:0))/6;break;case g:h=((b-r)/d+2)/6;break;case b:h=((r-g)/d+4)/6;break;}}
        return{h:Math.round(h*360),s:Math.round(s*100),l:Math.round(l*100)};
    }
    function hslify(hex){const{h,s,l}=rgbToHSL(hexToRGB(hex));return`${h} ${s}% ${l}%`;}
    function darken(hex,amt){const{h,s,l}=rgbToHSL(hexToRGB(hex));return hslToHex(h,s,Math.max(0,l-amt));}
    function lighten(hex,amt){const{h,s,l}=rgbToHSL(hexToRGB(hex));return hslToHex(h,s,Math.min(100,l+amt));}
    function fade(hex,a){const{r,g,b}=hexToRGB(hex);return`rgba(${r},${g},${b},${a})`;}
    function hslToHex(h,s,l){s/=100;l/=100;const a=s*Math.min(l,1-l);const f=n=>{const k=(n+h/30)%12;const c=l-a*Math.max(Math.min(k-3,9-k,1),-1);return Math.round(255*c).toString(16).padStart(2,'0');};return`#${f(0)}${f(8)}${f(4)}`;}

    const _catCSSCache = new Map();
    function buildCatppuccinCSS(palette, accentHex) {
        const cacheKey = palette.base + accentHex;
        if (_catCSSCache.has(cacheKey)) return _catCSSCache.get(cacheKey);
        const p = palette, a = accentHex;
        const css = `
            --accent-brand: ${hslify(a)}; --accent-main-000: ${hslify(a)}; --accent-main-100: ${hslify(a)};
            --accent-main-200: ${hslify(a)}; --accent-main-900: ${hslify(darken(a,30))};
            --bg-000: ${hslify(p.base)}; --bg-100: ${hslify(p.mantle)}; --bg-200: ${hslify(p.crust)};
            --bg-300: ${hslify(p.base)}; --bg-400: ${hslify(p.surface0)}; --bg-500: ${hslify(p.crust)};
            --text-000: ${hslify(p.text)}; --text-100: ${hslify(p.text)}; --text-200: ${hslify(p.subtext0)};
            --text-300: ${hslify(p.subtext1)}; --text-400: ${hslify(p.overlay1)}; --text-500: ${hslify(p.overlay0)};
            --border-100: ${hslify(p.surface1)}; --border-200: ${hslify(p.surface1)};
            --border-300: ${hslify(p.surface2)}; --border-400: ${hslify(p.overlay0)};
            --danger-000: ${hslify(p.red)}; --danger-100: ${hslify(darken(p.red,10))};
            --danger-200: ${hslify(darken(p.red,15))}; --danger-900: ${hslify(darken(p.red,30))};
            --success-000: ${hslify(p.green)}; --success-100: ${hslify(darken(p.green,10))};
            --success-200: ${hslify(darken(p.green,15))}; --success-900: ${hslify(darken(p.green,30))};
            --accent-pro-000: ${hslify(p.yellow)}; --accent-pro-100: ${hslify(darken(p.yellow,15))};
            --accent-secondary-000: ${hslify(p.peach)}; --accent-secondary-100: ${hslify(darken(p.peach,15))};
            --oncolor-100: ${hslify(p.crust)}; --oncolor-200: ${hslify(p.mantle)}; --oncolor-300: ${hslify(p.base)};
        `;
        _catCSSCache.set(cacheKey, css);
        if (_catCSSCache.size > 10) _catCSSCache.delete(_catCSSCache.keys().next().value);
        return css;
    }

    // Legacy compat aliases (deprecated - use SelectorEngine)
    const SEL = new Proxy({}, { get: (_, prop) => SelectorEngine._defs[prop]?.[0] || prop });

    // =====================================================================
    //  DOM WATCHER (consolidated MutationObserver)
    // =====================================================================
    const DOMWatcher = {
        _observer: null,
        _handlers: [],       // { id, fn, debounceMs, _timer }
        _started: false,

        register(id, fn, debounceMs = 150) {
            // Remove existing handler with same id
            this._handlers = this._handlers.filter(h => h.id !== id);
            this._handlers.push({ id, fn, debounceMs, _timer: null });
        },

        unregister(id) {
            const h = this._handlers.find(x => x.id === id);
            if (h && h._timer) clearTimeout(h._timer);
            this._handlers = this._handlers.filter(x => x.id !== id);
        },

        start() {
            if (this._started) return;
            this._started = true;
            this._observer = new MutationObserver((mutations) => {
                for (const h of this._handlers) {
                    if (h.debounceMs > 0) {
                        clearTimeout(h._timer);
                        h._timer = setTimeout(() => {
                            try { h.fn(mutations); } catch (e) { console.error(LOG_TAG, `DOMWatcher [${h.id}]:`, e); }
                        }, h.debounceMs);
                    } else {
                        try { h.fn(mutations); } catch (e) { console.error(LOG_TAG, `DOMWatcher [${h.id}]:`, e); }
                    }
                }
            });
            const target = document.body || document.documentElement;
            this._observer.observe(target, { childList: true, subtree: true });
        },

        stop() {
            if (this._observer) this._observer.disconnect();
            this._handlers.forEach(h => { if (h._timer) clearTimeout(h._timer); });
            this._started = false;
        }
    };

    // =====================================================================
    //  DOM INTERFACE (from Prompt Deck v1.4)
    // =====================================================================
    const DOM = {
        getEditor()     { return SelectorEngine.find('editor'); },
        getSendButton() { return SelectorEngine.find('sendBtn'); },
        getStopButton() { return SelectorEngine.find('stopBtn'); },
        isGenerating() {
            const stop = this.getStopButton(); if (stop && stop.offsetParent !== null) return true;
            const send = this.getSendButton(); if (send && !send.disabled && send.offsetParent !== null) return false;
            return !!SelectorEngine.find('streaming');
        },
        async typeMessage(text) {
            const pm = this.getEditor(); if (!pm) throw new Error('Editor not found');
            const editor = pm.editor;
            if (editor?.chain) { try { editor.chain().focus().clearContent().insertContent({ type: 'paragraph', content: [{ type: 'text', text }] }).run(); await sleep(300); return; } catch (e) { /* fb */ } }
            try {
                pm.focus();
                const sel = window.getSelection();
                if (sel && pm.firstChild) { sel.selectAllChildren(pm); sel.deleteFromDocument(); }
                else { pm.textContent = ''; }
                const textNode = document.createTextNode(text);
                const p = document.createElement('p');
                p.appendChild(textNode);
                pm.appendChild(p);
                pm.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: text }));
                await sleep(300);
                return;
            } catch (e) { /* final fb */ }
            pm.focus(); const p = document.createElement('p'); p.textContent = text; pm.innerHTML = ''; pm.appendChild(p); pm.dispatchEvent(new Event('input', { bubbles: true })); await sleep(300);
        },
        async sendMessage(text) {
            await this.typeMessage(text); await sleep(500);
            const btn = this.getSendButton(); if (btn && !btn.disabled) { btn.click(); return; }
            const pm = this.getEditor(); if (pm) { pm.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true, cancelable: true })); return; }
            throw new Error('Cannot send');
        },
        getLastResponse() {
            const groups = SelectorEngine.findAll('msgGroup');
            const userSel = SelectorEngine._defs.userMsg;
            for (let i = groups.length - 1; i >= 0; i--) {
                let hasUser = false;
                for (const s of userSel) { if (groups[i].querySelector(s)) { hasUser = true; break; } }
                if (!hasUser) return groups[i].innerText.trim();
            }
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
            const saved = GM_getValue(PREFIX + '_orgId', null);
            if (saved) { this._orgIdCache = saved; return saved; }
            try {
                const r = await fetch('/api/organizations', { credentials: 'include' });
                const orgs = await r.json();
                if (orgs[0]?.uuid) {
                    this._orgIdCache = orgs[0].uuid;
                    GM_setValue(PREFIX + '_orgId', this._orgIdCache);
                    return this._orgIdCache;
                }
            } catch (e) { /* ignore */ }
            return null;
        },
        setOrgId(id) {
            this._orgIdCache = id;
            GM_setValue(PREFIX + '_orgId', id);
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
        currentModel: null,
        artifacts: new Map(),    // artifactId -> { content, title, type }
        _currentToolUse: null,   // tracks in-progress tool_use for artifact capture

        install() {
            if (this._installed) return;
            this._installed = true;
            const origFetch = window.fetch;
            const self = this;
            window.fetch = async function (...args) {
                // Capture org ID from any API call
                try {
                    const url = typeof args[0] === 'string' ? args[0] : args[0]?.url || '';
                    const match = url.match(/\/api\/organizations\/([a-f0-9-]+)\//);
                    if (match && match[1]) {
                        ClaudeAPI.setOrgId(match[1]);
                        ExportModule._orgId = match[1];
                    }
                    // Log ALL non-GET API mutations for endpoint discovery
                    const method = (args[1]?.method || 'GET').toUpperCase();
                    if (method !== 'GET' && url.includes('/api/')) {
                        const body = args[1]?.body || '';
                        const shortUrl = url.replace(/\/api\/organizations\/[^/]+/, '/api/org');
                        console.log(`[CUE-NET] ${method} ${shortUrl}`, typeof body === 'string' ? body.substring(0, 200) : '');
                    }
                } catch (e) { /* ignore */ }
                const response = await origFetch.apply(this, args);
                try {
                    const url = typeof args[0] === 'string' ? args[0] : args[0]?.url || '';
                    const method = (args[1]?.method || 'GET').toUpperCase();
                    // Auto-discover star/pin endpoint from native UI success
                    if (method !== 'GET' && response.ok && url.includes('chat_conversations')) {
                        const body = args[1]?.body || '';
                        const bodyStr = typeof body === 'string' ? body : '';
                        const isStarRelated = url.includes('star') || url.includes('pin') || url.includes('favorite')
                            || bodyStr.includes('star') || bodyStr.includes('pin') || bodyStr.includes('favorite');
                        if (isStarRelated) {
                            // Extract template: replace org ID and chat ID with placeholders
                            const tmpl = url.replace(/\/organizations\/[^/]+/, '/organizations/{oid}')
                                            .replace(/\/chat_conversations\/[^/]+/, '/chat_conversations/{cid}');
                            const endpoint = `${method}|${tmpl}`;
                            const prev = GM_getValue('chp_star_endpoint', '');
                            if (prev !== endpoint) {
                                GM_setValue('chp_star_endpoint', endpoint);
                                console.log(`[CUE] Star endpoint DISCOVERED and saved: ${endpoint}`);
                            }
                        }
                    }
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
                    // SSE events are delimited by \n\n, process only complete events
                    let boundary;
                    while ((boundary = buffer.indexOf('\n\n')) !== -1) {
                        const event = buffer.substring(0, boundary);
                        buffer = buffer.substring(boundary + 2);
                        for (const line of event.split('\n')) {
                            if (!line.startsWith('data: ')) continue;
                            const j = line.substring(6).trim();
                            if (!j || j === '[DONE]') continue;
                            try { this._processSSE(JSON.parse(j)); } catch (e) { /* malformed JSON chunk, skip */ }
                        }
                    }
                }
                // Process any remaining data in buffer
                if (buffer.trim()) {
                    for (const line of buffer.split('\n')) {
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
            if (data.type === 'message_limit' && data.message_limit?.type === 'within_limit') {
                EventBus.emit('stream:messageLimit', data.message_limit);
            }
            // Rate limit data
            if (data.rate_limit) {
                EventBus.emit('stream:rateLimit', data.rate_limit);
            }
            // Model detection from message_start
            if (data.type === 'message_start') {
                if (data.message?.model) {
                    this.currentModel = data.message.model;
                    EventBus.emit('stream:model', this.currentModel);
                }
                EventBus.emit('stream:start', data);
            }
            if (data.type === 'message_stop') EventBus.emit('stream:stop', data);
            // Artifact content capture from tool_use blocks
            if (data.type === 'content_block_start' && data.content_block?.type === 'tool_use') {
                this._currentToolUse = { id: data.content_block.id, name: data.content_block.name, input: '' };
            }
            if (data.type === 'content_block_delta' && data.delta?.type === 'input_json_delta' && this._currentToolUse) {
                this._currentToolUse.input += data.delta.partial_json || '';
            }
            if (data.type === 'content_block_stop' && this._currentToolUse) {
                try {
                    const parsed = JSON.parse(this._currentToolUse.input);
                    if (parsed.content) {
                        const artId = this._currentToolUse.id || ('art_' + Date.now());
                        this.artifacts.set(artId, {
                            content: parsed.content,
                            title: parsed.title || parsed.file_name || '',
                            type: parsed.type || parsed.language || '',
                            name: this._currentToolUse.name
                        });
                        EventBus.emit('stream:artifact', { id: artId, ...this.artifacts.get(artId) });
                    }
                } catch (e) { /* partial JSON, skip */ }
                this._currentToolUse = null;
            }
        }
    };

    // =====================================================================
    //  MODULE: THEME ENGINE
    // =====================================================================
    const ThemeModule = {
        id: 'theme',

        LEGACY_THEMES: {
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
            EventBus.on('setting:themeAccent', () => this._apply());
            EventBus.on('setting:fontOverride', () => this._apply());
            // Listen for R89 Catppuccin/Chroma theme bridge
            document.addEventListener('cat-theme-updated', () => {
                const ext = localStorage.getItem('__cat_accentHex');
                if (ext) EventBus.emit('theme:externalAccent', ext);
            });
            // Watch for light/dark mode changes
            this._modeObserver = new MutationObserver(() => {
                const mode = document.documentElement?.dataset?.mode;
                if (mode && mode !== this._lastMode) {
                    this._lastMode = mode;
                    if (mode !== 'dark' && Settings.get('themeEnabled') && Settings.get('themeVariant') !== 'none') {
                        showToast('CUE themes work best in dark mode', 3000, 'warn');
                    }
                    this._apply();
                }
            });
            if (document.documentElement) {
                this._modeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-mode'] });
            }
        },

        _lastMode: null,

        _apply() {
            if (!Settings.get('themeEnabled') || Settings.get('themeVariant') === 'none') {
                removeCSS(PREFIX + '-theme');
                this._updatePanelVars();
                return;
            }
            const variant = Settings.get('themeVariant');
            let themeVars;

            // Check if it's a Catppuccin flavor
            const palette = CATPPUCCIN[variant];
            if (palette) {
                const accentName = Settings.get('themeAccent') || 'mauve';
                const accentHex = palette[accentName] || palette.mauve;
                themeVars = buildCatppuccinCSS(palette, accentHex);
                // Share palette info for R89 compatibility
                try {
                    localStorage.setItem('__cat_accentHex', accentHex);
                    localStorage.setItem('__cat_theme', JSON.stringify({
                        base: palette.base, surface0: palette.surface0, surface1: palette.surface1,
                        crust: palette.crust, text: palette.text, subtext0: palette.subtext0,
                        overlay1: palette.overlay1, green: palette.green, red: palette.red, accent: accentHex,
                    }));
                } catch (e) { /* quota */ }
            } else {
                // Legacy CUE themes
                const legacy = this.LEGACY_THEMES[variant];
                if (!legacy) { removeCSS(PREFIX + '-theme'); return; }
                themeVars = legacy.vars;
            }

            const fontCSS = Settings.get('fontOverride') ? `
                :root { --font-anthropic-serif: var(--font-anthropic-sans) !important; --font-ui-serif: var(--font-ui) !important; }
            ` : '';
            injectCSS(PREFIX + '-theme', `
                [data-theme=claude][data-mode=dark] { ${themeVars} }
                ${fontCSS}
                * { scrollbar-color: hsla(var(--bg-300, 240 8% 11.4%)/50%) transparent !important; }
                *, *:after, *:before { --tw-gradient-from-position: none !important; }
                /* Code block theming */
                [data-theme=claude][data-mode=dark] pre, [data-theme=claude][data-mode=dark] code {
                    background: hsl(var(--bg-100)) !important;
                }
                [data-theme=claude][data-mode=dark] pre code .hljs-keyword,
                [data-theme=claude][data-mode=dark] pre code .token.keyword { color: hsl(var(--accent-main-100)) !important; }
                [data-theme=claude][data-mode=dark] pre code .hljs-string,
                [data-theme=claude][data-mode=dark] pre code .token.string { color: hsl(var(--success-000)) !important; }
                [data-theme=claude][data-mode=dark] pre code .hljs-comment,
                [data-theme=claude][data-mode=dark] pre code .token.comment { color: hsl(var(--text-500)) !important; font-style: italic; }
                [data-theme=claude][data-mode=dark] pre code .hljs-number,
                [data-theme=claude][data-mode=dark] pre code .token.number { color: hsl(var(--accent-secondary-000)) !important; }
                [data-theme=claude][data-mode=dark] pre code .hljs-function,
                [data-theme=claude][data-mode=dark] pre code .token.function { color: hsl(var(--accent-main-000)) !important; }
            `);
            this._updatePanelVars();
        },

        destroy() { removeCSS(PREFIX + '-theme'); if (this._modeObserver) this._modeObserver.disconnect(); },

        // Update panel CSS vars to match active theme
        _updatePanelVars() {
            // Set panel CSS vars on shadow host (isolated from document :root)
            const target = ControlPanel._host || document.documentElement;
            const variant = Settings.get('themeVariant');
            const palette = CATPPUCCIN[variant];
            if (palette && Settings.get('themeEnabled')) {
                const accentName = Settings.get('themeAccent') || 'mauve';
                const accentHex = palette[accentName] || palette.mauve;
                target.style.setProperty('--cue-panel-bg', palette.crust);
                target.style.setProperty('--cue-panel-bg2', palette.mantle);
                target.style.setProperty('--cue-panel-border', palette.surface1);
                target.style.setProperty('--cue-panel-text', palette.text);
                target.style.setProperty('--cue-panel-text-dim', palette.overlay1);
                target.style.setProperty('--cue-panel-text-faint', palette.overlay0);
                target.style.setProperty('--cue-panel-accent', accentHex);
                target.style.setProperty('--cue-panel-success', palette.green);
                target.style.setProperty('--cue-panel-danger', palette.red);
                target.style.setProperty('--cue-panel-warn', palette.yellow);
            } else {
                // Reset to defaults
                const defaults = { '--cue-panel-bg':'#0a0a14','--cue-panel-bg2':'#12121e','--cue-panel-border':'rgba(255,255,255,0.06)',
                    '--cue-panel-text':'#d0d0e0','--cue-panel-text-dim':'#787890','--cue-panel-text-faint':'#4a4a60',
                    '--cue-panel-accent':'#58a6ff','--cue-panel-success':'#3fb950','--cue-panel-danger':'#f85149','--cue-panel-warn':'#d29922' };
                for (const [k, v] of Object.entries(defaults)) target.style.setProperty(k, v);
            }
        }
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
                /* Wide layout override - scoped to main content */
                main [class*="mx-auto"] { max-width: ${pct}% !important; }
                main .mx-auto { max-width: ${pct}% !important; }
                main div[data-test-render-count] { max-width: ${pct}% !important; }
                main div[data-test-render-count] > * { max-width: 100% !important; }
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
            EventBus.on('setting:coloredButtons', () => this._applyButtons());
            EventBus.on('setting:coloredBoldItalic', () => this._applyBoldItalic());
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
        }
    };

    // =====================================================================
    //  MODULE: CODE COPY (inject copy buttons on file output cards)
    // =====================================================================
    const CodeCopyModule = {
        id: 'codeCopy',
        _debounce: null,

        init() {
            this._injectStyles();
            DOMWatcher.register('codeCopy', () => {
                clearTimeout(this._debounce);
                this._debounce = setTimeout(() => this._scan(), 600);
            }, 0);
            EventBus.on('navigation', () => setTimeout(() => this._scan(), 1500));
            setTimeout(() => this._scan(), 2000);
        },

        _injectStyles() {
            injectCSS(PREFIX + '-codecopy', `
                .${PREFIX}-copy-btn {
                    display: inline-flex; align-items: center; justify-content: center;
                    position: relative; flex-shrink: 0;
                    height: 36px; padding: 8px 16px; border-radius: 8px;
                    min-width: 5rem; white-space: nowrap;
                    font-weight: 700; font-size: 0.875rem; line-height: 1.25rem;
                    font-family: inherit;
                    background: transparent; color: inherit;
                    border: 0.5px solid; border-color: var(--border-300, rgba(255,255,255,0.15));
                    cursor: pointer; transition: all 0.1s; backface-visibility: hidden;
                    overflow: hidden;
                }
                .${PREFIX}-copy-btn:active { transform: scale(0.985); }
                .${PREFIX}-copy-btn:hover { opacity: 0.85; }
                .${PREFIX}-copy-btn.copied {
                    color: #3fb950 !important; border-color: rgba(63,185,80,0.4) !important;
                }
            `);
        },

        _scan() {
            // Target: artifact preview cards
            // Structure: div[role="button"][aria-label="Preview contents"]
            //   > .artifact-block-cell
            //     > div.flex (button container with Download button)
            const cards = document.querySelectorAll('div[role="button"][aria-label="Preview contents"]:not([data-cue-cc])');
            let injected = 0;
            cards.forEach(card => {
                card.setAttribute('data-cue-cc', '1');
                const downloadBtn = card.querySelector('button[aria-label="Download"]');
                if (!downloadBtn) return;
                const btnContainer = downloadBtn.parentElement;
                if (!btnContainer || btnContainer.querySelector(`.${PREFIX}-copy-btn`)) return;
                this._injectCopyButton(card, btnContainer, downloadBtn);
                injected++;
            });
            if (injected > 0) console.log(`${LOG_TAG} CodeCopy: injected ${injected} copy button(s)`);
        },

        _injectCopyButton(card, container, downloadBtn) {
            const btn = document.createElement('button');
            btn.className = `${PREFIX}-copy-btn`;
            btn.type = 'button';
            btn.textContent = 'Copy';
            btn.title = 'Copy file contents to clipboard';

            btn.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                if (btn.disabled) return;
                btn.disabled = true;
                btn.textContent = '...';
                try {
                    const text = await this._getContent(card);
                    if (!text) throw new Error('Could not extract content');
                    await navigator.clipboard.writeText(text);
                    btn.textContent = 'Copied!';
                    btn.classList.add('copied');
                    setTimeout(() => { btn.classList.remove('copied'); btn.textContent = 'Copy'; }, 2000);
                } catch (err) {
                    showToast('Copy failed: ' + err.message, 3000, 'error');
                    btn.textContent = 'Copy';
                }
                btn.disabled = false;
            });

            // Insert before the Download button so Copy appears first
            container.insertBefore(btn, downloadBtn);
        },

        async _getContent(card) {
            // Strategy 0 (fastest): Use SSE-captured artifact content
            if (StreamMonitor.artifacts.size > 0) {
                // Find matching artifact by title or most recent
                const title = card.querySelector('[class*="font-"]')?.textContent?.trim() || '';
                let bestMatch = null;
                for (const [id, art] of StreamMonitor.artifacts) {
                    if (title && art.title && art.title.toLowerCase().includes(title.toLowerCase())) {
                        bestMatch = art;
                        break;
                    }
                    bestMatch = art; // fallback to most recent
                }
                if (bestMatch?.content && bestMatch.content.length > 10) {
                    return bestMatch.content;
                }
            }

            // Fallback: DOM-based extraction (original strategies)
            // Snapshot all existing code/pre elements BEFORE opening preview
            const existingEls = new Set(document.querySelectorAll('pre, code, .cm-content, .cm-editor'));

            // Click the card to open the preview/viewer
            card.click();
            await sleep(2500);

            let text = null;

            // Strategy 1 (primary): Find and click the native Copy button in the preview toolbar
            // The preview toolbar has a Copy button with class font-base-bold and !text-xs
            const allBtns = document.querySelectorAll('button');
            for (const b of allBtns) {
                if (b.closest(`#${PREFIX}-panel`) || b.classList.contains(`${PREFIX}-copy-btn`)) continue;
                const bText = b.textContent.trim();
                if (bText === 'Copy' && (b.classList.contains('font-base-bold') || b.className.includes('rounded-l-lg'))) {
                    b.click();
                    await sleep(300);
                    try {
                        text = await navigator.clipboard.readText();
                        if (text && text.length > 10) break;
                        text = null;
                    } catch (e) { /* clipboard read may fail, try next strategy */ }
                }
            }

            // Strategy 2: Look for NEW code elements that appeared after opening the preview
            if (!text) {
                const codeSelectors = ['.cm-content', '.cm-editor', 'pre code', 'pre', '[role="dialog"] pre', '[role="dialog"] code'];
                for (const sel of codeSelectors) {
                    const els = document.querySelectorAll(sel);
                    for (const el of els) {
                        if (existingEls.has(el)) continue; // skip pre-existing elements
                        if (el.closest(`#${PREFIX}-panel`)) continue;
                        const content = el.textContent?.trim();
                        if (content && content.length > 20) {
                            text = content;
                            break;
                        }
                    }
                    if (text) break;
                }
            }

            // Strategy 3: Find the largest NEW text content area (catch-all)
            if (!text) {
                let bestLen = 0;
                const allNew = document.querySelectorAll('div, section, article');
                for (const el of allNew) {
                    if (existingEls.has(el) || el.closest(`#${PREFIX}-panel`)) continue;
                    // Only consider elements in overlay/panel contexts
                    if (!el.closest('[role="dialog"]') && !el.closest('[class*="artifact"]') && !el.closest('[class*="preview"]')) continue;
                    const content = el.textContent?.trim();
                    if (content && content.length > bestLen && content.length > 50) {
                        bestLen = content.length;
                        text = content;
                    }
                }
            }

            // Close the preview
            await sleep(100);
            const closeSelectors = [
                'button[aria-label="Close"]',
                'button[aria-label="close"]',
                'button[aria-label="Dismiss"]',
            ];
            let closed = false;
            for (const sel of closeSelectors) {
                const closeBtn = document.querySelector(sel);
                if (closeBtn && !closeBtn.closest(`#${PREFIX}-panel`)) {
                    closeBtn.click();
                    closed = true;
                    break;
                }
            }
            if (!closed) {
                document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
            }

            return text;
        },

        destroy() { DOMWatcher.unregister('codeCopy'); removeCSS(PREFIX + '-codecopy'); }
    };

    // =====================================================================
    //  MODULE: PASTE FIX
    // =====================================================================
    const PasteFixModule = {
        id: 'pasteFix',
        _handler: null,
        _dispatching: false,
        _isPasting: false,

        init() {
            this._handler = (e) => {
                if (this._dispatching || this._isPasting) return;
                const cd = e.clipboardData || window.clipboardData;
                const text = cd?.getData('text/plain') || '';
                if (!text) return;

                // Chunked paste: bypass attachment detection for large pastes
                if (Settings.get('chunkedPaste') && text.split('\n').length > Settings.get('chunkedMinLines')) {
                    e.preventDefault();
                    e.stopImmediatePropagation();
                    this._chunkedPaste(text);
                    return;
                }

                // Standard paste fix: strip rich formatting
                if (!Settings.get('pasteFix')) return;
                if (cd.types.includes('text/plain') && cd.types.includes('text/html')) {
                    e.preventDefault();
                    e.stopImmediatePropagation();
                    const dt = new DataTransfer();
                    dt.setData('text/plain', text.trimStart());
                    this._dispatching = true;
                    e.target.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
                    this._dispatching = false;
                }
            };
            document.addEventListener('paste', this._handler, true);
        },

        async _chunkedPaste(text) {
            this._isPasting = true;
            const editor = SelectorEngine.find('editor');
            if (!editor) { this._isPasting = false; return; }
            const lines = text.split('\n');
            const chunkSize = Settings.get('chunkedLinesPerChunk');
            const totalChunks = Math.ceil(lines.length / chunkSize);

            editor.focus();
            for (let i = 0; i < totalChunks; i++) {
                const start = i * chunkSize;
                const chunk = lines.slice(start, start + chunkSize);
                const toInsert = (i === 0 ? '' : '\n') + chunk.join('\n');
                document.execCommand('insertText', false, toInsert);
                if (i < totalChunks - 1) await new Promise(r => setTimeout(r, 10));
            }
            this._isPasting = false;
            showToast(`Pasted ${lines.length} lines in ${totalChunks} chunks`, 2000, 'info');
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
        _timer: null,
        _scrollEl: null,
        _scrollElTime: 0,
        _userScrolledUp: false,

        init() {
            this._start();
            EventBus.on('setting:autoScroll', (v) => v ? this._start() : this._stop());
            EventBus.on('navigation', () => { this._scrollEl = null; this._userScrolledUp = false; });
            EventBus.on('stream:start', () => { this._userScrolledUp = false; });
        },

        _findScrollContainer() {
            // Cache for 5s to avoid repeated DOM walks
            if (this._scrollEl && document.contains(this._scrollEl) && Date.now() - this._scrollElTime < 5000) return this._scrollEl;
            const main = document.querySelector('main');
            if (main) {
                // Targeted: check main's direct scrollable children first, then go deeper
                const candidates = main.querySelectorAll('div[style*="overflow"], div[class*="overflow"]');
                let best = null, bestDepth = -1;
                const check = (el) => {
                    if (el.scrollHeight > el.clientHeight + 10 && el.clientHeight > 100) {
                        const style = getComputedStyle(el);
                        if (style.overflowY === 'auto' || style.overflowY === 'scroll') {
                            let depth = 0, p = el;
                            while (p) { depth++; p = p.parentElement; }
                            if (depth > bestDepth) { best = el; bestDepth = depth; }
                        }
                    }
                };
                candidates.forEach(check);
                // If no styled overflow found, scan direct children of main
                if (!best) {
                    for (const el of main.children) {
                        check(el);
                        for (const child of el.children) check(child);
                    }
                }
                if (best) {
                    this._scrollEl = best;
                    this._scrollElTime = Date.now();
                    this._attachScrollListener(best);
                    return best;
                }
                if (main.scrollHeight > main.clientHeight + 10) {
                    this._scrollEl = main;
                    this._scrollElTime = Date.now();
                    this._attachScrollListener(main);
                    return main;
                }
            }
            return null;
        },

        _attachScrollListener(el) {
            if (el._cueScrollBound) return;
            el._cueScrollBound = true;
            el.addEventListener('scroll', () => {
                // User scrolled up if they're more than 150px from the bottom
                const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
                this._userScrolledUp = distFromBottom > 150;
            }, { passive: true });
        },

        _isNearBottom() {
            const el = this._scrollEl;
            if (!el) return true;
            const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
            return distFromBottom <= 150;
        },

        scrollToBottom() {
            const el = this._findScrollContainer();
            if (el) {
                el.scrollTop = el.scrollHeight;
                this._userScrolledUp = false;
            } else {
                window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' });
                this._userScrolledUp = false;
            }
        },

        _start() {
            DOMWatcher.register('autoScroll', () => {
                if (!Settings.get('autoScroll') || this._userScrolledUp) return;
                clearTimeout(this._timer);
                this._timer = setTimeout(() => {
                    if (!this._userScrolledUp) this.scrollToBottom();
                }, 150);
            }, 0);  // no debounce — needs to fire quickly during streaming
        },

        _stop() { DOMWatcher.unregister('autoScroll'); },
        destroy() { this._stop(); }
    };

    // =====================================================================
    //  MODULE: AUTO-APPROVE
    // =====================================================================
    const AutoApproveModule = {
        id: 'autoApprove',
        _debounce: null,

        init() {
            this._start();
            EventBus.on('setting:autoApprove', (v) => v ? this._start() : this._stop());
        },

        _start() {
            DOMWatcher.register('autoApprove', () => {
                if (!Settings.get('autoApprove')) return;
                clearTimeout(this._debounce);
                this._debounce = setTimeout(() => this._check(), 150);
            }, 0);
        },

        _check() {
            const dlg = SelectorEngine.find('dialogOpen') || SelectorEngine.find('dialog');
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

        _stop() { DOMWatcher.unregister('autoApprove'); },
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
            const cached = ClaudeAPI._orgIdCache || GM_getValue(PREFIX + '_orgId', null);
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
                const data = await this.getConversation(uuid, includeImages);
                if (!data) throw new Error('Failed to fetch conversation');
                // Only fetch full list if we need project metadata and it's missing
                if (!data.project_uuid) {
                    const meta = await this.getConversationMeta(uuid);
                    if (meta) {
                        if (meta.project_uuid) data.project_uuid = meta.project_uuid;
                        if (meta.project) data.project = meta.project;
                    }
                }
                const filename = `claude_${(data.name || 'conversation').replace(/[^a-z0-9]/gi, '_').substring(0, 80)}_${uuid.substring(0, 8)}.json`;
                this._downloadBlob(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }), filename);
                showToast('Exported: ' + filename, 3000, 'success');
            } catch (e) {
                showToast('Export failed: ' + e.message, 4000, 'error');
                EventBus.emit('error:show', { msg: 'JSON export failed', retryFn: () => this.exportCurrentJSON() });
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
                if (!hasZip) console.warn(LOG_TAG, 'fflate not loaded - falling back to combined JSON. Ensure @require is intact.');
                const allChunkBlobs = [];
                let exported = 0, failed = 0;
                for (let chunk = 0; chunk < toExport.length; chunk += CHUNK_SIZE) {
                    const batch = toExport.slice(chunk, chunk + CHUNK_SIZE);
                    const files = {};
                    for (let i = 0; i < batch.length; i++) {
                        const conv = batch[i];
                        // Rate limiting: exponential backoff on failures
                        const baseDelay = 300;
                        let retries = 0;
                        const MAX_RETRIES = 3;
                        let data = null;
                        while (retries <= MAX_RETRIES) {
                            try {
                                data = await this.getConversation(conv.uuid, includeImages);
                                break; // success
                            } catch (e) {
                                retries++;
                                if (retries > MAX_RETRIES) { failed++; break; }
                                const backoff = baseDelay * Math.pow(2, retries) + Math.random() * 500;
                                showToast(`Rate limited, retrying in ${(backoff/1000).toFixed(1)}s...`, backoff, 'warn');
                                await sleep(backoff);
                            }
                        }
                        if (data) {
                            if (conv.project_uuid) data.project_uuid = conv.project_uuid;
                            if (conv.project) data.project = conv.project;
                            const title = (data.name || conv.uuid).replace(/[^a-z0-9]/gi, '_').substring(0, 80);
                            const fname = `claude_${conv.uuid.substring(0, 8)}_${title}.json`;
                            files[fname] = JSON.stringify(data, null, 2);
                            exported++;
                        }
                        // Adaptive delay: slower after failures
                        if (i > 0) await sleep(failed > 3 ? 1000 : baseDelay);
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
                EventBus.emit('error:show', { msg: 'ZIP export failed: ' + e.message, retryFn: () => this.exportAllZIP() });
            } finally {
                this._exporting = false;
                this._setExportButtons(false);
            }
        },

        async exportMarkdown() {
            if (this._exporting) { showToast('Export already in progress', 2000, 'warn'); return; }
            const uuid = this.getCurrentUUID();
            if (!uuid) { showToast('No conversation open (need /chat/ URL)', 3000, 'warn'); return; }
            const orgId = await this.ensureOrgId();
            if (!orgId) return;
            this._exporting = true;
            this._setExportButtons(true);
            showToast('Fetching conversation data...', 2000, 'info');
            try {
                const data = await this.getConversation(uuid, false);
                if (!data) throw new Error('Failed to fetch conversation');
                const title = data.name || 'Claude Conversation';
                let md = `# ${title}\n_Exported: ${new Date().toISOString()}_\n\n---\n\n`;
                const messages = data.chat_messages || [];
                for (const msg of messages) {
                    const sender = msg.sender === 'human' ? 'Human' : 'Assistant';
                    let content = '';
                    if (Array.isArray(msg.content)) {
                        content = msg.content.map(c => {
                            if (typeof c === 'string') return c;
                            if (c.type === 'text') return c.text || '';
                            if (c.type === 'tool_use') return `\`\`\`json\n// Tool: ${c.name || 'unknown'}\n${JSON.stringify(c.input, null, 2)}\n\`\`\``;
                            if (c.type === 'tool_result') return typeof c.content === 'string' ? c.content : JSON.stringify(c.content);
                            return '';
                        }).filter(Boolean).join('\n\n');
                    } else if (typeof msg.content === 'string') {
                        content = msg.content;
                    } else if (msg.text) {
                        content = msg.text;
                    }
                    // Include attachments info
                    const files = msg.attachments || msg.files || msg.files_v2 || [];
                    if (files.length > 0) {
                        const fileList = files.map(f => f.file_name || f.extracted_content?.toString().substring(0, 50) || 'file').join(', ');
                        content += `\n\n> Attachments: ${fileList}`;
                    }
                    if (content.trim()) md += `## ${sender}\n\n${content.trim()}\n\n---\n\n`;
                }
                const safeName = title.replace(/[^a-z0-9]/gi, '_').substring(0, 80);
                this._downloadBlob(new Blob([md], { type: 'text/markdown' }), `claude_${safeName}_${new Date().toISOString().slice(0, 10)}.md`);
                showToast('Chat exported as Markdown!', 2000, 'success');
            } catch (e) {
                showToast('Export failed: ' + e.message, 4000, 'error');
                EventBus.emit('error:show', { msg: 'Markdown export failed', retryFn: () => this.exportMarkdown() });
            } finally {
                this._exporting = false;
                this._setExportButtons(false);
            }
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
        history: [],     // last 30 responses: { duration, words, status, time }

        init() {
            // Restore persisted history
            try {
                const saved = GM_getValue(PREFIX + '_respHistory', null);
                if (saved) {
                    const parsed = JSON.parse(saved);
                    // Only keep entries from last 24h
                    const cutoff = Date.now() - 86400000;
                    this.history = parsed.filter(h => h.time > cutoff).slice(-30);
                }
            } catch (e) { /* ignore corrupt data */ }
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
            // Track history for sparkline (keep last 30, persist)
            this.history.push({ duration: this.lastDuration, words: this.lastWords, status: this.status, time: Date.now() });
            if (this.history.length > 30) this.history.shift();
            try { GM_setValue(PREFIX + '_respHistory', JSON.stringify(this.history)); } catch (e) { /* quota */ }
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
            // Also stop on next stream start (user sent new message)
            const unsubStream = EventBus.on('stream:start', () => { this._stopFlash(); unsubStream(); });
            // Hard cap: 30s
            setTimeout(() => { this._stopFlash(); try { unsubStream(); } catch(e){} }, 30000);
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
        _trimTimer: null,

        init() {
            this._injectStyles();
            EventBus.on('setting:domTrimmer', (v) => { if (!v) this.restoreAll(); });
            DOMWatcher.register('domTrimmer', () => {
                if (!Settings.get('domTrimmer')) return;
                clearTimeout(this._trimTimer);
                this._trimTimer = setTimeout(() => this._prune(), 500);
            }, 500);
        },

        _injectStyles() {
            injectCSS(PREFIX + '-trimmer', `
                .${PREFIX}-trim-placeholder {
                    padding: 6px 12px; margin: 4px 0; border-radius: 6px;
                    background: rgba(88,166,255,0.04); border: 1px dashed rgba(88,166,255,0.12);
                    color: #555; font-size: 10px; text-align: center; cursor: pointer;
                    font-family: -apple-system, sans-serif; transition: all 0.2s;
                }
                .${PREFIX}-trim-placeholder:hover {
                    background: rgba(88,166,255,0.08); border-color: rgba(88,166,255,0.25); color: #888;
                }
            `);
        },

        _getMessages() {
            const main = SelectorEngine.find('main');
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
            // Insert or update placeholder
            if (hiddenCount > 0) {
                const totalHidden = msgs.filter(el => el.dataset.cueTrimmed).length;
                let ph = document.querySelector(`.${PREFIX}-trim-placeholder`);
                if (!ph) {
                    ph = document.createElement('div');
                    ph.className = `${PREFIX}-trim-placeholder`;
                    ph.addEventListener('click', () => this.restoreAll());
                    const firstVisible = msgs.find(el => !el.dataset.cueTrimmed);
                    if (firstVisible?.parentElement) firstVisible.parentElement.insertBefore(ph, firstVisible);
                }
                ph.textContent = `${totalHidden} older message${totalHidden !== 1 ? 's' : ''} hidden - click to restore`;
            }
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
            document.querySelectorAll(`.${PREFIX}-trim-placeholder`).forEach(el => el.remove());
            EventBus.emit('trimmer:restored');
        },

        destroy() {
            DOMWatcher.unregister('domTrimmer');
            this.restoreAll();
            removeCSS(PREFIX + '-trimmer');
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
            const resolved = await this._resolveVars(promptText);
            const text = resolved.trim();
            if (!text) { showToast('Prompt is empty', 2000, 'warn'); return; }
            try {
                await DOM.sendMessage(text);
                if (Settings.get('autoScroll')) setTimeout(() => AutoScrollModule.scrollToBottom(), 500);
            } catch (e) { showToast('Send failed: ' + e.message, 3000, 'error'); }
        },

        async _resolveVars(text) {
            const vars = {
                '{{clipboard}}': async () => { try { return await navigator.clipboard.readText(); } catch { return '(clipboard unavailable)'; } },
                '{{selection}}': () => (window.getSelection()?.toString() || ''),
                '{{last_response}}': () => DOM.getLastResponse(),
                '{{url}}': () => window.location.href,
                '{{date}}': () => new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
                '{{time}}': () => new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
                '{{conversation}}': () => {
                    const uuid = ExportModule.getCurrentUUID();
                    const title = document.title.replace(/ - Claude$/, '').trim();
                    return title || uuid || '(no conversation)';
                },
                '{{model}}': () => StreamMonitor.currentModel || '(unknown model)',
            };
            let result = text;
            for (const [token, resolver] of Object.entries(vars)) {
                if (result.includes(token)) {
                    const val = await Promise.resolve(resolver());
                    result = result.replaceAll(token, val);
                }
            }
            return result;
        },

        destroy() {}
    };

    // =====================================================================
    //  MODULE: AUTOBUILD WORKFLOW ENGINE
    // =====================================================================
    const AutoBuildModule = {
        id: 'autoBuild',
        _state: 'idle',       // idle | waiting | sending | done
        _step: -1,
        _retries: 0,
        _errorHits: 0,        // times the "could not be fully generated" banner appeared for current step
        _errorPollTimer: null,
        _errorCooldown: false, // prevents re-detecting the same banner
        _projectDesc: '',
        _projectContext: '',
        _listener: null,
        _overlay: null,
        _statusEl: null,
        _aborted: false,
        _paused: false,
        _pauseResolve: null,

        // Workflow steps - each has a message builder and config
        STEPS: [
            {
                id: 'research',
                label: 'Research',
                desc: 'Researching similar projects',
                enabled: true,
                msg: (ctx) => `I want to build the following:\n\n**Project:** ${ctx.desc}\n\n**Context/Purpose:** ${ctx.context}\n\nBefore we start building, please research similar open-source projects, existing implementations, and established best practices for this type of tool. Summarize your findings including architecture patterns, common features, and any pitfalls to avoid.`,
                retryable: true
            },
            {
                id: 'build',
                label: 'Build',
                desc: 'Building the project',
                enabled: true,
                msg: (ctx) => `Now begin building the project using the research data you gathered. Create a complete, fully working implementation. Do not stop until the entire project is complete.`,
                retryable: true,
                escalateMsg: `Please make a phase plan for this. Post the script results for each phase but keep working through all phases until everything is complete. Do not stop between phases.`
            },
            {
                id: 'audit1',
                label: 'Audit #1',
                desc: 'Running first code audit',
                enabled: true,
                msg: () => `Please do a thorough audit of this code. Check for bugs, logic errors, edge cases, missing error handling, security issues, performance problems, and anything else that could be improved. List everything you find.`,
                retryable: true
            },
            {
                id: 'patch',
                label: 'Patch',
                desc: 'Patching all bugs',
                enabled: true,
                msg: () => `Please patch all bugs and issues found in the audit. If the task is too big to do in one response, make a phased plan approach and patch in phases. Complete all phases, posting the updated results after the completion of each phase. Do not stop until every issue is resolved.`,
                retryable: true,
                escalateMsg: `You stopped before completing all patches. Please make a phased plan for the remaining fixes. Post the results of each phase but continue working through all phases until everything is patched. Do not stop between phases.`
            },
            {
                id: 'improve_ask',
                label: 'Improve?',
                desc: 'Asking for improvement suggestions',
                enabled: true,
                msg: () => `What can be done to improve this? Consider performance, features, UX, code quality, error handling, accessibility, and anything else. List all possible improvements.`,
                retryable: false
            },
            {
                id: 'improve_exec',
                label: 'Improve',
                desc: 'Implementing improvements',
                enabled: true,
                msg: () => `Please implement everything you suggested. Make a phased plan to roll out changes in phases. Post the results of every phase but continue until complete. Do not stop between phases.`,
                retryable: true,
                escalateMsg: `You stopped before completing all improvements. Continue implementing the remaining improvements. Post the results of each phase and keep working through all phases until everything is done.`
            },
            {
                id: 'audit_final',
                label: 'Final Audit',
                desc: 'Running final code audit',
                enabled: true,
                msg: () => `Please do a thorough final audit of the code. Verify all bugs are fixed, all improvements are properly integrated, and the code is production-ready. List any remaining issues.`,
                retryable: true
            }
        ],

        _getEnabledSteps() {
            return this.STEPS.filter(s => s.enabled);
        },

        init() {
            // Listen for response completion events
            this._listener = EventBus.on('response:status', (status) => this._onResponseStatus(status));
        },

        _onResponseStatus(status) {
            if (this._state !== 'waiting' || this._aborted) return;
            if (status === 'complete' || status === 'truncated') {
                this._handleCompletion(status);
            } else if (status === 'stuck') {
                this._handleStuck();
            }
        },

        async _handleCompletion(status) {
            const steps = this._activeSteps || this._getEnabledSteps();
            const step = steps[this._step];
            if (!step) return;

            // If the error banner is visible, let the error watcher handle it instead
            if (this._findErrorBanner()) {
                this._updateHUD(`${step.label}: generation error detected, error handler will recover...`);
                return;
            }

            const isTruncated = status === 'truncated';
            const maxRetries = Settings.get('autoBuildMaxRetries');

            // If truncated or retryable and under retry limit, send continue
            if (isTruncated && step.retryable && this._retries < maxRetries) {
                this._retries++;
                this._updateHUD(`${step.label}: response cut off, sending continue (${this._retries}/${maxRetries})...`);
                await sleep(3000);
                if (this._aborted) return;
                this._state = 'sending';
                await this._send('continue');
                return;
            }

            // If we exhausted retries and there's an escalation message, send it
            if (isTruncated && step.escalateMsg && this._retries >= maxRetries) {
                this._retries = 0;
                this._updateHUD(`${step.label}: escalating to phased approach...`);
                await sleep(3000);
                if (this._aborted) return;
                this._state = 'sending';
                await this._send(step.escalateMsg);
                return;
            }

            // Step complete - advance
            this._retries = 0;

            // Verify response relevance before advancing
            if (step.id !== 'improve_ask') { // skip for question-type steps
                const resp = DOM.getLastResponse().toLowerCase();
                const relevanceKeywords = {
                    research: ['architecture', 'pattern', 'implementation', 'library', 'approach', 'best practice', 'framework', 'recommend', 'strategy'],
                    build: ['function', 'class', 'const', 'import', 'export', 'return', 'code', 'script', 'module', 'async', 'await'],
                    audit1: ['bug', 'issue', 'error', 'fix', 'improve', 'warning', 'vulnerability', 'problem', 'suggest', 'security'],
                    patch: ['fix', 'patch', 'update', 'correct', 'resolve', 'change', 'modify', 'applied', 'corrected'],
                    improve_exec: ['improve', 'enhance', 'add', 'implement', 'update', 'optimize', 'refactor', 'performance'],
                    audit_final: ['audit', 'review', 'check', 'verify', 'issue', 'clean', 'ready', 'no remaining', 'pass', 'complete'],
                };
                const keywords = relevanceKeywords[step.id] || [];
                const MIN_HITS = 2; // Require at least 2 keyword matches to pass
                if (keywords.length > 0 && resp.length > 100) {
                    const respLower = resp.toLowerCase();
                    const hits = keywords.filter(k => respLower.includes(k)).length;
                    if (hits < MIN_HITS) {
                        this._updateHUD(`${step.label}: response may be off-topic (${hits}/${MIN_HITS} min keywords). Pausing for review.`);
                        this._paused = true;
                        const pauseBtn = $(`#${PREFIX}-ab-pause`);
                        if (pauseBtn) { pauseBtn.textContent = '>'; pauseBtn.style.color = '#3fb950'; }
                        await new Promise(r => { this._pauseResolve = r; });
                        if (this._aborted) return;
                    }
                }
            }

            const delay = Settings.get('autoBuildContinueDelay') * 1000;
            this._updateHUD(`${step.label} complete! Next step in ${delay / 1000}s...`);

            // Check if paused
            if (this._paused) {
                this._updateHUD(`${step.label} complete! Paused - click resume to continue.`);
                await new Promise(r => { this._pauseResolve = r; });
                if (this._aborted) return;
            }

            await sleep(delay);
            if (this._aborted) return;
            this._nextStep();
        },

        _handleStuck() {
            // If error banner is visible, let the error watcher handle it
            if (this._findErrorBanner()) return;
            this._updateHUD(`Response appears stuck, sending continue...`);
            this._retries++;
            setTimeout(async () => {
                if (this._aborted) return;
                this._state = 'sending';
                await this._send('continue');
            }, 3000);
        },

        // ---- Error Banner Detection ----
        // Watches for "Claude's response could not be fully generated" + Retry button
        _startErrorWatch() {
            this._stopErrorWatch();
            this._errorPollTimer = setInterval(() => this._checkForErrorBanner(), 2500);
        },

        _stopErrorWatch() {
            if (this._errorPollTimer) { clearInterval(this._errorPollTimer); this._errorPollTimer = null; }
        },

        _findErrorBanner() {
            // Targeted: look for data-color-context containers with error text (avoids full div scan)
            const main = document.querySelector('main') || document.body;
            // Strategy 1: use the known data-color-context attribute
            for (const container of main.querySelectorAll('[data-color-context]')) {
                if (container.textContent.includes('could not be fully generated')) {
                    const retryBtn = container.querySelector('button');
                    if (retryBtn && retryBtn.textContent.trim().toLowerCase() === 'retry') {
                        return { container, retryBtn };
                    }
                }
            }
            // Strategy 2: fallback - limited scan of shallow error-like containers
            for (const el of main.querySelectorAll('div[role="alert"], div[class*="error"], div[class*="warning"]')) {
                if (el.textContent.includes('could not be fully generated')) {
                    let walker = el;
                    for (let i = 0; i < 4 && walker; i++) {
                        const btn = walker.querySelector('button');
                        if (btn && btn.textContent.trim().toLowerCase() === 'retry') {
                            return { container: walker, retryBtn: btn };
                        }
                        walker = walker.parentElement;
                    }
                }
            }
            return null;
        },

        async _checkForErrorBanner() {
            if (this._aborted || this._errorCooldown) return;
            if (this._state !== 'waiting' && this._state !== 'sending') return;

            const found = this._findErrorBanner();
            if (!found) return;

            // Prevent re-detecting same banner
            this._errorCooldown = true;
            this._errorHits++;

            const steps = this._activeSteps || this._getEnabledSteps();
            const step = steps[this._step];
            const stepLabel = step ? step.label : 'Step';

            if (this._errorHits <= 1) {
                // First hit: click Retry
                this._updateHUD(`${stepLabel}: generation failed, clicking Retry...`);
                showToast('Response failed - retrying automatically', 3000, 'warn');
                found.retryBtn.click();
                this._state = 'waiting';
                // Give the retry time to kick off before watching again
                await sleep(5000);
                this._errorCooldown = false;
            } else {
                // Subsequent hits: wait for the UI to settle, then send phased continue
                this._updateHUD(`${stepLabel}: generation failed again (${this._errorHits}x), sending phased continue...`);
                showToast('Response failed again - sending phased approach', 3000, 'warn');
                // Wait for things to settle
                await sleep(4000);
                if (this._aborted) return;
                this._state = 'sending';
                await this._send(`Your previous response could not be fully generated. Please continue from where you left off. If the task is too large for a single response, develop a phased approach - post the results of each phase but continue working through all phases until everything is complete. Do not stop between phases.`);
                this._errorCooldown = false;
            }
        },

        async _send(text) {
            try {
                await DOM.sendMessage(text);
                this._state = 'waiting';
                if (Settings.get('autoScroll')) setTimeout(() => AutoScrollModule.scrollToBottom(), 500);
            } catch (e) {
                this._updateHUD(`Send failed: ${e.message}. Retrying in 5s...`);
                await sleep(5000);
                if (!this._aborted) await this._send(text);
            }
        },

        async _nextStep() {
            this._step++;
            const steps = this._activeSteps || this._getEnabledSteps();
            if (this._step >= steps.length) {
                this._state = 'done';
                this._updateHUD('AutoBuild complete!');
                showToast('AutoBuild workflow finished!', 5000, 'success');
                this._showDoneState();
                return;
            }
            const step = steps[this._step];
            this._retries = 0;
            this._errorHits = 0;
            this._errorCooldown = false;
            this._updateHUD(`Step ${this._step + 1}/${steps.length}: ${step.desc}...`);
            this._updateProgress();
            this._state = 'sending';
            const ctx = { desc: this._projectDesc, context: this._projectContext };
            await this._send(step.msg(ctx));
        },

        start() {
            this._showInputDialog();
        },

        _showInputDialog() {
            if (this._overlay) this._overlay.remove();
            const ov = document.createElement('div');
            ov.id = PREFIX + '-ab-overlay';
            Object.assign(ov.style, {
                position: 'fixed', inset: '0', background: 'rgba(0,0,0,0.7)',
                zIndex: '200000', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif', backdropFilter: 'blur(4px)'
            });

            const dialog = document.createElement('div');
            Object.assign(dialog.style, {
                background: '#0d0d14', border: '1px solid #2a2a3a', borderRadius: '16px',
                width: '520px', maxWidth: '90vw', maxHeight: '85vh', overflow: 'hidden',
                boxShadow: '0 20px 60px rgba(0,0,0,0.8), 0 0 0 1px rgba(88,166,255,0.1)',
                display: 'flex', flexDirection: 'column'
            });

            setSafeHTML(dialog, `
                <div style="padding:20px 24px 0;flex-shrink:0">
                    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
                        <div>
                            <h2 style="margin:0;font-size:18px;font-weight:700;color:#e8e8f0;letter-spacing:-0.3px">AutoBuild</h2>
                            <div style="font-size:11px;color:#555;margin-top:2px">Automated build workflow engine</div>
                        </div>
                        <button id="${PREFIX}-ab-close" style="background:none;border:none;color:#555;font-size:22px;cursor:pointer;width:32px;height:32px;display:flex;align-items:center;justify-content:center;border-radius:8px;transition:all 0.15s">&times;</button>
                    </div>
                </div>
                <div style="padding:0 24px 20px;overflow-y:auto;flex:1">
                    <label style="display:block;margin-bottom:6px;font-size:12px;font-weight:600;color:#a8a8b8">What are you looking to create?</label>
                    <textarea id="${PREFIX}-ab-desc" placeholder="e.g. A PowerShell GUI tool that scans the network for open ports and displays results in a sortable table..." style="width:100%;height:80px;background:#1a1a2e;color:#e0e0f0;border:1px solid #2a2a3a;border-radius:10px;padding:12px;font-size:13px;font-family:inherit;resize:vertical;outline:none;transition:border-color 0.2s;box-sizing:border-box"></textarea>

                    <label style="display:block;margin:14px 0 6px;font-size:12px;font-weight:600;color:#a8a8b8">Context &amp; purpose <span style="color:#555;font-weight:400">(optional)</span></label>
                    <textarea id="${PREFIX}-ab-context" placeholder="e.g. This is for our IT team to quickly audit devices on the LAN. Needs to be turnkey with no dependencies..." style="width:100%;height:60px;background:#1a1a2e;color:#e0e0f0;border:1px solid #2a2a3a;border-radius:10px;padding:12px;font-size:13px;font-family:inherit;resize:vertical;outline:none;transition:border-color 0.2s;box-sizing:border-box"></textarea>

                    <div style="margin-top:16px;padding:12px;background:rgba(88,166,255,0.05);border:1px solid rgba(88,166,255,0.1);border-radius:10px">
                        <div style="font-size:11px;font-weight:600;color:#58a6ff;margin-bottom:8px">Workflow Steps</div>
                        <div style="display:flex;flex-wrap:wrap;gap:4px" id="${PREFIX}-ab-steps-preview"></div>
                    </div>

                    <div style="display:flex;gap:10px;margin-top:18px">
                        <button id="${PREFIX}-ab-launch" style="flex:1;padding:12px;background:linear-gradient(135deg,#58a6ff,#3d8bfd);color:#fff;border:none;border-radius:10px;font-size:14px;font-weight:600;cursor:pointer;transition:all 0.2s;letter-spacing:-0.2px">Launch AutoBuild</button>
                        <button id="${PREFIX}-ab-cancel" style="padding:12px 20px;background:#1a1a2e;color:#888;border:1px solid #2a2a3a;border-radius:10px;font-size:13px;cursor:pointer;transition:all 0.15s">Cancel</button>
                    </div>
                </div>
            `);

            ov.appendChild(dialog);
            document.body.appendChild(ov);
            this._overlay = ov;

            // Render step pills with enable/disable checkboxes
            const stepsContainer = $(`#${PREFIX}-ab-steps-preview`, dialog);
            this.STEPS.forEach((s, i) => {
                const pill = document.createElement('label');
                Object.assign(pill.style, {
                    padding: '3px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: '600',
                    background: s.enabled ? 'rgba(88,166,255,0.1)' : 'rgba(255,255,255,0.03)',
                    color: s.enabled ? '#58a6ff' : '#555',
                    border: `1px solid ${s.enabled ? 'rgba(88,166,255,0.15)' : 'rgba(255,255,255,0.06)'}`,
                    display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer',
                    transition: 'all 0.2s', userSelect: 'none'
                });
                const cb = document.createElement('input');
                cb.type = 'checkbox';
                cb.checked = s.enabled;
                Object.assign(cb.style, { width: '12px', height: '12px', margin: '0', cursor: 'pointer', accentColor: '#58a6ff' });
                cb.addEventListener('change', () => {
                    s.enabled = cb.checked;
                    pill.style.background = cb.checked ? 'rgba(88,166,255,0.1)' : 'rgba(255,255,255,0.03)';
                    pill.style.color = cb.checked ? '#58a6ff' : '#555';
                    pill.style.borderColor = cb.checked ? 'rgba(88,166,255,0.15)' : 'rgba(255,255,255,0.06)';
                });
                const label = document.createTextNode(`${i + 1}. ${s.label}`);
                pill.appendChild(cb);
                pill.appendChild(label);
                stepsContainer.appendChild(pill);
            });

            // Focus textarea styles
            const desc = $(`#${PREFIX}-ab-desc`, dialog);
            const ctx = $(`#${PREFIX}-ab-context`, dialog);
            [desc, ctx].forEach(ta => {
                ta.addEventListener('focus', () => ta.style.borderColor = '#58a6ff');
                ta.addEventListener('blur', () => ta.style.borderColor = '#2a2a3a');
            });

            // Events
            $(`#${PREFIX}-ab-close`, dialog).addEventListener('click', () => ov.remove());
            $(`#${PREFIX}-ab-cancel`, dialog).addEventListener('click', () => ov.remove());
            ov.addEventListener('click', (e) => { if (e.target === ov) ov.remove(); });

            $(`#${PREFIX}-ab-launch`, dialog).addEventListener('click', () => {
                const d = desc.value.trim();
                if (!d) { desc.style.borderColor = '#f85149'; showToast('Describe what you want to build', 2000, 'warn'); return; }
                this._projectDesc = d;
                this._projectContext = ctx.value.trim();
                ov.remove();
                this._overlay = null;
                this._launch();
            });

            desc.focus();
        },

        _launch() {
            this._aborted = false;
            this._paused = false;
            this._step = -1;
            this._retries = 0;
            this._errorHits = 0;
            this._errorCooldown = false;
            this._state = 'idle';
            this._activeSteps = this._getEnabledSteps();
            if (this._activeSteps.length === 0) {
                showToast('No steps enabled - enable at least one step', 3000, 'warn');
                return;
            }
            this._buildHUD();
            this._startErrorWatch();
            this._nextStep();
        },

        _buildHUD() {
            // Remove existing
            const existing = $(`#${PREFIX}-ab-hud`);
            if (existing) existing.remove();

            const hud = document.createElement('div');
            hud.id = PREFIX + '-ab-hud';
            Object.assign(hud.style, {
                position: 'fixed', bottom: '20px', left: '50%', transform: 'translateX(-50%)',
                background: '#0d0d14', border: '1px solid #2a2a3a', borderRadius: '14px',
                padding: '10px 16px', zIndex: '200001', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
                display: 'flex', alignItems: 'center', gap: '12px', minWidth: '380px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(88,166,255,0.08)'
            });

            setSafeHTML(hud, `
                <div style="display:flex;flex-direction:column;flex:1;min-width:0">
                    <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
                        <span style="font-size:11px;font-weight:700;color:#58a6ff;letter-spacing:0.5px">AUTOBUILD</span>
                        <div id="${PREFIX}-ab-progress" style="flex:1;height:3px;background:#1a1a2e;border-radius:2px;overflow:hidden">
                            <div id="${PREFIX}-ab-progress-bar" style="height:100%;background:linear-gradient(90deg,#58a6ff,#3fb950);width:0%;transition:width 0.5s ease;border-radius:2px"></div>
                        </div>
                        <span id="${PREFIX}-ab-step-count" style="font-size:10px;color:#555;flex-shrink:0">0/${(this._activeSteps || this._getEnabledSteps()).length}</span>
                    </div>
                    <div id="${PREFIX}-ab-status" style="font-size:11px;color:#a8a8b8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">Initializing...</div>
                </div>
                <div style="display:flex;gap:4px;flex-shrink:0">
                    <button id="${PREFIX}-ab-pause" title="Pause after current step" style="background:rgba(210,153,34,0.1);border:1px solid rgba(210,153,34,0.2);color:#d29922;width:28px;height:28px;border-radius:8px;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:13px;transition:all 0.15s">||</button>
                    <button id="${PREFIX}-ab-skip" title="Skip to next step" style="background:rgba(88,166,255,0.1);border:1px solid rgba(88,166,255,0.2);color:#58a6ff;width:28px;height:28px;border-radius:8px;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:11px;transition:all 0.15s;font-weight:700">>></button>
                    <button id="${PREFIX}-ab-abort" title="Abort AutoBuild" style="background:rgba(248,81,73,0.1);border:1px solid rgba(248,81,73,0.2);color:#f85149;width:28px;height:28px;border-radius:8px;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:14px;transition:all 0.15s">&times;</button>
                </div>
            `);

            document.body.appendChild(hud);
            this._statusEl = $(`#${PREFIX}-ab-status`, hud);

            // Bind HUD buttons
            $(`#${PREFIX}-ab-pause`, hud).addEventListener('click', () => this._togglePause());
            $(`#${PREFIX}-ab-skip`, hud).addEventListener('click', () => this._skipStep());
            $(`#${PREFIX}-ab-abort`, hud).addEventListener('click', () => this._abort());
        },

        _updateHUD(msg) {
            if (this._statusEl) this._statusEl.textContent = msg;
            console.log(`${LOG_TAG} [AutoBuild] ${msg}`);
        },

        _updateProgress() {
            const steps = this._activeSteps || this._getEnabledSteps();
            const bar = $(`#${PREFIX}-ab-progress-bar`);
            const count = $(`#${PREFIX}-ab-step-count`);
            if (bar) bar.style.width = `${((this._step + 1) / steps.length) * 100}%`;
            if (count) count.textContent = `${this._step + 1}/${steps.length}`;
        },

        _showDoneState() {
            this._stopErrorWatch();
            const bar = $(`#${PREFIX}-ab-progress-bar`);
            if (bar) {
                bar.style.width = '100%';
                bar.style.background = 'linear-gradient(90deg,#3fb950,#58a6ff)';
            }
            const pause = $(`#${PREFIX}-ab-pause`);
            const skip = $(`#${PREFIX}-ab-skip`);
            if (pause) pause.style.display = 'none';
            if (skip) skip.style.display = 'none';
            // Auto-remove HUD after 15s
            setTimeout(() => {
                const hud = $(`#${PREFIX}-ab-hud`);
                if (hud && this._state === 'done') {
                    hud.style.transition = 'opacity 0.5s, transform 0.5s';
                    hud.style.opacity = '0';
                    hud.style.transform = 'translateX(-50%) translateY(10px)';
                    setTimeout(() => hud.remove(), 500);
                }
            }, 15000);
        },

        _togglePause() {
            if (this._paused) {
                this._paused = false;
                this._updateHUD(`Resumed - continuing workflow...`);
                const btn = $(`#${PREFIX}-ab-pause`);
                if (btn) { btn.textContent = '||'; btn.title = 'Pause after current step'; btn.style.color = '#d29922'; btn.style.borderColor = 'rgba(210,153,34,0.2)'; btn.style.background = 'rgba(210,153,34,0.1)'; }
                if (this._pauseResolve) { this._pauseResolve(); this._pauseResolve = null; }
            } else {
                this._paused = true;
                this._updateHUD(`Paused - will hold after current response completes`);
                const btn = $(`#${PREFIX}-ab-pause`);
                if (btn) { btn.textContent = '>'; btn.title = 'Resume workflow'; btn.style.color = '#3fb950'; btn.style.borderColor = 'rgba(63,185,80,0.2)'; btn.style.background = 'rgba(63,185,80,0.1)'; }
            }
        },

        _skipStep() {
            if (this._state === 'done' || this._aborted) return;
            this._updateHUD(`Skipping to next step...`);
            this._state = 'idle'; // temporarily break out of waiting
            this._retries = 0;
            // Wait for any current generation to finish then advance
            const trySkip = () => {
                if (DOM.isGenerating()) {
                    setTimeout(trySkip, 1000);
                    return;
                }
                this._nextStep();
            };
            trySkip();
        },

        _abort() {
            this._aborted = true;
            this._paused = false;
            this._state = 'idle';
            this._stopErrorWatch();
            this._updateHUD('AutoBuild aborted');
            showToast('AutoBuild aborted', 3000, 'warn');
            if (this._pauseResolve) { this._pauseResolve(); this._pauseResolve = null; }
            const hud = $(`#${PREFIX}-ab-hud`);
            if (hud) {
                setTimeout(() => {
                    hud.style.transition = 'opacity 0.5s, transform 0.5s';
                    hud.style.opacity = '0';
                    hud.style.transform = 'translateX(-50%) translateY(10px)';
                    setTimeout(() => hud.remove(), 500);
                }, 2000);
            }
        },

        destroy() {
            this._stopErrorWatch();
            this._abort();
            if (this._listener) this._listener();
        }
    };

    // =====================================================================
    //  MODULE: SMART CONTINUE (floating pill on truncation)
    // =====================================================================
    const SmartContinueModule = {
        id: 'smartContinue',
        _pill: null,

        init() {
            EventBus.on('response:status', (s) => {
                if (s === 'truncated') this._show();
                else this._hide();
            });
            EventBus.on('navigation', () => this._hide());
        },

        _show() {
            if (this._pill) return;
            const pill = document.createElement('div');
            pill.id = PREFIX + '-smart-continue';
            Object.assign(pill.style, {
                position: 'fixed', bottom: '80px', right: '24px',
                background: 'linear-gradient(135deg, rgba(88,166,255,0.15), rgba(63,185,80,0.1))',
                border: '1px solid rgba(88,166,255,0.3)', borderRadius: '12px',
                padding: '8px 16px', zIndex: '99990', cursor: 'pointer',
                fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
                fontSize: '12px', fontWeight: '600', color: '#58a6ff',
                boxShadow: '0 4px 20px rgba(0,0,0,0.4)', transition: 'all 0.3s',
                display: 'flex', alignItems: 'center', gap: '6px',
                animation: `${PREFIX}-fade-in 0.3s ease`
            });
            pill.textContent = 'Continue Response';
            pill.title = 'Response was truncated — click to continue from where Claude left off';
            pill.addEventListener('mouseenter', () => { pill.style.background = 'linear-gradient(135deg, rgba(88,166,255,0.25), rgba(63,185,80,0.18))'; pill.style.transform = 'scale(1.03)'; });
            pill.addEventListener('mouseleave', () => { pill.style.background = 'linear-gradient(135deg, rgba(88,166,255,0.15), rgba(63,185,80,0.1))'; pill.style.transform = 'scale(1)'; });
            pill.addEventListener('click', async () => {
                this._hide();
                const lastResp = DOM.getLastResponse();
                const lastTail = lastResp.slice(-200); // remember end of truncated response
                try {
                    await DOM.sendMessage('Continue from where you left off. Do not repeat anything already written.');
                    if (Settings.get('autoScroll')) setTimeout(() => AutoScrollModule.scrollToBottom(), 500);
                    // Monitor next response to verify continuation
                    const unsub = EventBus.on('response:complete', () => {
                        unsub();
                        const newResp = DOM.getLastResponse();
                        if (newResp.length < 50) {
                            showToast('Continuation may have failed — response very short', 4000, 'warn');
                        } else if (newResp.includes('already completed') || newResp.includes('nothing to continue')) {
                            showToast('Claude says the response was already complete', 3000, 'info');
                        }
                    });
                    // Timeout the listener after 120s
                    setTimeout(unsub, 120000);
                } catch (e) {
                    showToast('Send failed: ' + e.message, 3000, 'error');
                }
            });
            document.body.appendChild(pill);
            this._pill = pill;
            // Auto-dismiss after 60s
            setTimeout(() => this._hide(), 60000);
        },

        _hide() {
            if (this._pill) {
                this._pill.style.opacity = '0';
                this._pill.style.transform = 'translateY(10px)';
                setTimeout(() => { if (this._pill) { this._pill.remove(); this._pill = null; } }, 300);
            }
        },

        destroy() { this._hide(); }
    };

    // =====================================================================
    //  MODULE: AUTO CONTINUE (auto-send "Please continue" on generation failure)
    // =====================================================================
    const AutoContinueModule = {
        id: 'autoContinue',
        _pollTimer: null,
        _cooldownUntil: 0,
        _consecutiveHits: 0,
        _MAX_CONSECUTIVE: 5,   // circuit breaker: stop after 5 rapid failures
        _COOLDOWN_MS: 12000,   // 12s cooldown between auto-continues
        _POLL_MS: 3000,        // check every 3s

        init() {
            EventBus.on('setting:autoContinue', (v) => v ? this._start() : this._stop());
            if (Settings.get('autoContinue')) this._start();
        },

        _start() {
            this._stop();
            this._consecutiveHits = 0;
            this._pollTimer = setInterval(() => this._check(), this._POLL_MS);
        },

        _stop() {
            if (this._pollTimer) { clearInterval(this._pollTimer); this._pollTimer = null; }
        },

        _findErrorBanner() {
            // STRICT detection: only match Claude's actual system error banner,
            // NOT text about this error that appears in conversation messages.
            //
            // The real banner structure:
            //   div.mt-2 > div[data-color-context="main"] > { info icon + error text + Retry button }
            // It sits OUTSIDE message content, as a sibling after the last message group.
            const main = document.querySelector('main') || document.body;
            for (const container of main.querySelectorAll('[data-color-context="main"]')) {
                // Must have a Retry button as a SHALLOW descendant (max 4 levels deep)
                const retryBtn = container.querySelector('button');
                if (!retryBtn || retryBtn.textContent.trim().toLowerCase() !== 'retry') continue;

                // Must NOT be inside a message content area (user or assistant message)
                // Claude wraps messages in elements with these identifiers
                if (container.closest('[data-message-author-role]')) continue;
                if (container.closest('[data-is-streaming]')) continue;
                if (container.closest('[contenteditable]')) continue;
                if (container.closest('article')) continue;

                // The error text must be in a SHALLOW child div, not deep in response content.
                // Walk only direct/near children (2 levels) for the exact error string.
                let hasErrorText = false;
                for (const child of container.querySelectorAll(':scope > div > div, :scope > div')) {
                    const t = child.textContent.trim();
                    // Exact match on the system error message (not a discussion about it)
                    if (t === "Claude's response could not be fully generated" ||
                        t === 'Claude\'s response could not be fully generated') {
                        hasErrorText = true;
                        break;
                    }
                }
                if (!hasErrorText) continue;

                // Must contain the info circle SVG icon (system UI marker)
                if (!container.querySelector('svg')) continue;

                // Must be visible (not hidden/collapsed)
                const rect = container.getBoundingClientRect();
                if (rect.height === 0 || rect.width === 0) continue;

                return { container, retryBtn };
            }
            return null;
        },

        async _check() {
            if (!Settings.get('autoContinue')) return;
            if (Date.now() < this._cooldownUntil) return;

            // Yield to AutoBuild if it's active
            if (typeof AutoBuildModule !== 'undefined' && AutoBuildModule._state && AutoBuildModule._state !== 'idle') return;

            // Don't fire if currently generating
            if (DOM.isGenerating()) return;

            const found = this._findErrorBanner();
            if (!found) {
                // No banner visible — reset consecutive counter
                this._consecutiveHits = 0;
                return;
            }

            // Circuit breaker
            this._consecutiveHits++;
            if (this._consecutiveHits > this._MAX_CONSECUTIVE) {
                showToast(`Auto Continue stopped — ${this._MAX_CONSECUTIVE} consecutive failures. Check your conversation.`, 5000, 'error');
                this._stop();
                return;
            }

            // Set cooldown
            this._cooldownUntil = Date.now() + this._COOLDOWN_MS;

            showToast(`Auto Continue: sending continue (${this._consecutiveHits}/${this._MAX_CONSECUTIVE})`, 3000, 'info');

            try {
                await sleep(1500); // brief pause for UI to settle
                if (DOM.isGenerating()) return; // user may have manually retried
                // Re-verify banner is still present (user may have clicked Retry manually)
                if (!this._findErrorBanner()) return;
                await DOM.sendMessage('Please continue');
                if (Settings.get('autoScroll')) setTimeout(() => AutoScrollModule.scrollToBottom(), 500);
            } catch (e) {
                showToast('Auto Continue: send failed — ' + e.message, 3000, 'error');
            }
        },

        destroy() { this._stop(); }
    };

    // =====================================================================
    //  MODULE: INPUT COUNTER (char/token overlay on editor)
    // =====================================================================
    const InputCounterModule = {
        id: 'inputCounter',
        _el: null,
        _handler: null,
        _lastEditor: null,
        _checkTimer: null,

        init() {
            this._injectStyles();
            // Light polling to detect editor appearance (only until attached, then stops)
            this._checkTimer = setInterval(() => this._attach(), 2000);
            this._attach();
            // Re-attach on navigation
            EventBus.on('navigation', () => {
                this._lastEditor = null;
                if (this._el) { this._el.remove(); this._el = null; }
                if (!this._checkTimer) this._checkTimer = setInterval(() => this._attach(), 2000);
            });
        },

        _injectStyles() {
            injectCSS(PREFIX + '-inputcount', `
                #${PREFIX}-input-counter {
                    position: absolute; bottom: 4px; right: 58px;
                    font-size: 10px; color: var(--cue-panel-text-faint, #555); font-family: -apple-system, monospace;
                    pointer-events: none; z-index: 10; transition: color 0.3s;
                    line-height: 1;
                }
                #${PREFIX}-input-counter.warn { color: var(--cue-panel-warn, #d29922); }
                #${PREFIX}-input-counter.danger { color: var(--cue-panel-danger, #f85149); }
            `);
        },

        _attach() {
            const editor = SelectorEngine.find('editor');
            if (!editor || editor === this._lastEditor) return;
            this._lastEditor = editor;
            // Stop polling once attached
            if (this._checkTimer) { clearInterval(this._checkTimer); this._checkTimer = null; }
            const parent = editor.closest('div[class]') || editor.parentElement;
            if (!parent) return;
            if (parent.style.position === '' || parent.style.position === 'static') parent.style.position = 'relative';
            if (this._el) this._el.remove();
            this._el = document.createElement('div');
            this._el.id = PREFIX + '-input-counter';
            parent.appendChild(this._el);
            // Remove old listener
            if (this._handler && this._lastEditor) {
                try { this._lastEditor.removeEventListener('input', this._handler); } catch(e){}
            }
            this._handler = () => this._update(editor);
            editor.addEventListener('input', this._handler);
            this._update(editor);
        },

        _update(editor) {
            if (!this._el) return;
            const text = editor.textContent || '';
            const chars = text.length;
            if (chars === 0) { this._el.textContent = ''; return; }
            const tokens = Math.ceil(chars / 4);
            this._el.textContent = `${chars.toLocaleString()}c / ~${tokens.toLocaleString()}t`;
            this._el.className = tokens > 30000 ? 'danger' : tokens > 15000 ? 'warn' : '';
        },

        destroy() {
            if (this._el) this._el.remove();
            if (this._checkTimer) clearInterval(this._checkTimer);
            removeCSS(PREFIX + '-inputcount');
        }
    };

    // =====================================================================
    //  MODULE: SESSION STATS
    // =====================================================================
    const SessionStats = {
        messagesSent: 0,
        totalGenTime: 0,
        sessionStart: Date.now(),

        init() {
            EventBus.on('stream:start', () => this.messagesSent++);
            EventBus.on('response:complete', (d) => {
                this.totalGenTime += d.duration || 0;
                this._render();
            });
        },

        getUptime() {
            return fmtDur(Date.now() - this.sessionStart);
        },

        _render() {
            const el = $(`#${PREFIX}-session-stats`);
            if (!el) return;
            el.textContent = `${this.messagesSent} msgs / ${fmtDur(this.totalGenTime)} gen / ${this.getUptime()} up`;
        }
    };

    // =====================================================================
    //  MODULE: SIDEBAR AUTO-EXPAND
    // =====================================================================
    const SidebarExpandModule = {
        id: 'sidebarExpand',
        _userClosed: false,
        _clickHandler: null,

        init() {
            if (!Settings.get('sidebarAutoExpand')) return;
            EventBus.on('setting:sidebarAutoExpand', (v) => {
                if (v) this._tryExpand();
            });
            EventBus.on('navigation', () => { this._userClosed = false; setTimeout(() => this._tryExpand(), 500); });
            // Detect manual close
            this._clickHandler = (e) => {
                const btn = e.target.closest('button');
                if (!btn) return;
                const label = (btn.getAttribute('aria-label') || '').toLowerCase();
                if (label.includes('sidebar') || label.includes('navigation') || label.includes('menu')) {
                    if (!this._isCollapsed()) this._userClosed = true;
                }
            };
            document.addEventListener('click', this._clickHandler, true);
            setTimeout(() => this._tryExpand(), 800);
            setTimeout(() => this._tryExpand(), 2000);
        },

        _isCollapsed() {
            const nav = document.querySelector('nav');
            if (nav && nav.offsetWidth < 50) return true;
            const btn = document.querySelector('button[aria-label*="sidebar" i], button[aria-label*="open navigation" i]');
            if (btn && (btn.getAttribute('aria-label') || '').toLowerCase().includes('open')) return true;
            return false;
        },

        _tryExpand() {
            if (this._userClosed || !Settings.get('sidebarAutoExpand') || !this._isCollapsed()) return;
            const candidates = [
                document.querySelector('button[aria-label*="sidebar" i]'),
                document.querySelector('button[aria-label*="navigation" i]'),
            ];
            for (const btn of candidates) { if (btn) { btn.click(); return; } }
        },

        destroy() {
            if (this._clickHandler) document.removeEventListener('click', this._clickHandler, true);
        }
    };

    // =====================================================================
    //  MODULE: STARRED CHAT HIGHLIGHTS
    // =====================================================================
    const StarredHighlightModule = {
        id: 'starredHighlight',

        init() {
            if (!Settings.get('starredHighlight')) return;
            this._injectStyles();
            EventBus.on('setting:starredHighlight', (v) => v ? this._injectStyles() : removeCSS(PREFIX + '-starred'));
        },

        _injectStyles() {
            injectCSS(PREFIX + '-starred', `
                nav a[href*="/chat/"][class*="starred"],
                nav a[href*="/chat/"]:has(svg[data-testid="star-icon"]),
                nav a[href*="/chat/"]:has([aria-label*="star" i]) {
                    position: relative !important;
                    background: rgba(63,185,80,0.06) !important;
                    border-left: 2px solid rgba(63,185,80,0.35) !important;
                }
                nav a[href*="/chat/"][class*="starred"]::before,
                nav a[href*="/chat/"]:has(svg[data-testid="star-icon"])::before {
                    content: ''; position: absolute; inset: 0; border-radius: inherit;
                    box-shadow: inset 0 0 8px rgba(63,185,80,0.08);
                    pointer-events: none;
                }
            `);
        },

        destroy() { removeCSS(PREFIX + '-starred'); }
    };

    // =====================================================================
    //  MODULE: QUICK CHAT RENAME (API-powered)
    // =====================================================================
    const ChatRenameModule = {
        id: 'chatRename',

        async rename(newName) {
            const uuid = ExportModule.getCurrentUUID();
            if (!uuid) { showToast('No active conversation', 2000, 'error'); return false; }
            const orgId = ClaudeAPI.getOrgId();
            if (!orgId) { showToast('Org ID not found — send a message first', 2000, 'error'); return false; }
            const base = `https://claude.ai/api/organizations/${orgId}/chat_conversations/${uuid}`;
            const combos = [
                ['PUT', { name: newName }], ['PUT', { title: newName }],
                ['PATCH', { name: newName }], ['PATCH', { title: newName }],
            ];
            for (const [method, body] of combos) {
                try {
                    const r = await fetch(base, {
                        method, credentials: 'include',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(body),
                    });
                    if (r.ok) {
                        showToast('Renamed: ' + newName, 2000, 'info');
                        return true;
                    }
                } catch (e) { /* try next */ }
            }
            showToast('Rename failed — API rejected all methods', 3000, 'error');
            return false;
        }
    };

    // =====================================================================
    //  BULK RENAME MODULE (fully automated AI-assisted chat renaming)
    // =====================================================================
    const BulkRenameModule = {
        _chats: [],
        _running: false,

        async fetchAllChats(onProgress) {
            const orgId = await ClaudeAPI.getOrgId();
            if (!orgId) throw new Error('Could not determine org ID');
            if (onProgress) onProgress(0, 0, 'Fetching page 1...');
            const PAGE = 80;
            let all = [], offset = 0, page = 0;
            while (true) {
                page++;
                let url = `/api/organizations/${orgId}/chat_conversations?limit=${PAGE}`;
                if (offset > 0) url += `&offset=${offset}`;
                let r;
                try { r = await fetch(url, { credentials: 'include' }); }
                catch (e) { throw new Error('Network error fetching page ' + page); }
                if (!r.ok) throw new Error(`API returned ${r.status} on page ${page}`);
                const d = await r.json();
                const batch = Array.isArray(d) ? d : (d?.data || d?.results || d?.conversations || []);
                if (!batch.length) break;
                all.push(...batch);
                offset += batch.length;
                if (onProgress) onProgress(all.length, batch.length < PAGE ? all.length : -1, `Fetched page ${page} (${all.length} chats)...`);
                if (batch.length < PAGE || all.length > 5000) break;
                await sleep(80);
            }
            all.sort((a, b) => new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0));
            this._chats = all;
            return all;
        },

        buildPrompt(chatBatch) {
            const lines = chatBatch.map(c => {
                const id = c.uuid || c.id;
                const name = c.name || c.title || '';
                const date = (c.updated_at || c.created_at || '').slice(0, 10);
                return `${id} | ${name} | ${date}`;
            });
            return [
                'I need you to suggest improved, more succinct names for my Claude chat history.',
                'Below is a list of my chats in the format: UUID | Current Name | Date',
                '',
                ...lines,
                '',
                'Rules for new names:',
                '- Keep names short and descriptive (under 60 chars)',
                '- Use "Project vX.Y.Z - Key Feature" format for dev chats when applicable',
                '- Capture the core topic/purpose, not filler words',
                '- If a name is already good, keep it exactly as-is',
                '- Skip any chat named "(untitled)" or with a blank name',
                '',
                'Respond ONLY with a JSON object mapping UUID to the new name.',
                'Only include chats that need renaming (skip ones that are already good).',
                'No markdown fences, no explanation, ONLY the raw JSON object.',
                'Example: {"uuid-1": "New Name", "uuid-2": "Better Name"}',
            ].join('\n');
        },

        getEligibleChats() {
            return this._chats.filter(c => {
                const name = (c.name || c.title || '').trim();
                return name && name !== '(untitled)';
            });
        },

        parseJSON(text) {
            let jsonStr = text.trim();
            // Extract from code fences
            const fenceMatches = [...jsonStr.matchAll(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/g)];
            if (fenceMatches.length) {
                jsonStr = fenceMatches.reduce((a, b) => a[1].length > b[1].length ? a : b)[1].trim();
            }
            // Find outermost braces
            if (!jsonStr.startsWith('{')) {
                const first = jsonStr.indexOf('{'), last = jsonStr.lastIndexOf('}');
                if (first !== -1 && last > first) jsonStr = jsonStr.substring(first, last + 1);
            }
            // Clean
            jsonStr = jsonStr
                .replace(/,\s*([\]}])/g, '$1')
                .replace(/[\u201C\u201D]/g, '"')
                .replace(/[\u2018\u2019]/g, "'")
                .replace(/\u2026/g, '...')
                .replace(/\r\n/g, '\n');
            jsonStr = jsonStr.replace(/,?\s*"\.\.\."\s*:\s*"[^"]*"/g, '');
            jsonStr = jsonStr.replace(/,?\s*"[^"]+"\s*:\s*"\.\.\."/g, '');

            const parsed = JSON.parse(jsonStr);
            if (typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Expected JSON object');
            const chatIds = new Set(this._chats.map(c => c.uuid || c.id));
            const valid = {};
            for (const [k, v] of Object.entries(parsed)) {
                if (typeof v === 'string' && v.trim() && chatIds.has(k)) valid[k] = v.trim();
            }
            return valid;
        },

        async sendToClaudeAPI(orgId, promptText, onChunk) {
            // 1. Create temp conversation
            const convId = crypto.randomUUID();
            const createR = await fetch(`/api/organizations/${orgId}/chat_conversations`, {
                method: 'POST', credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ uuid: convId, name: '' })
            });
            if (!createR.ok) throw new Error('Failed to create temp conversation (' + createR.status + ')');

            // 2. Send completion request
            let fullText = '';
            try {
                const compR = await fetch(`/api/organizations/${orgId}/chat_conversations/${convId}/completion`, {
                    method: 'POST', credentials: 'include',
                    headers: { 'Content-Type': 'application/json', 'Accept': 'text/event-stream' },
                    body: JSON.stringify({
                        prompt: promptText,
                        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York',
                        attachments: [], files: []
                    })
                });
                if (!compR.ok) throw new Error('Completion failed (' + compR.status + ')');

                // 3. Read SSE stream
                const reader = compR.body.getReader();
                const decoder = new TextDecoder();
                let buffer = '';
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    buffer += decoder.decode(value, { stream: true });
                    let idx;
                    while ((idx = buffer.indexOf('\n')) !== -1) {
                        const line = buffer.substring(0, idx).trim();
                        buffer = buffer.substring(idx + 1);
                        if (!line.startsWith('data: ')) continue;
                        const payload = line.substring(6).trim();
                        if (!payload || payload === '[DONE]') continue;
                        try {
                            const evt = JSON.parse(payload);
                            // Handle all known response formats
                            if (typeof evt.completion === 'string') {
                                fullText += evt.completion;
                            } else if (evt.delta?.type === 'text_delta' && evt.delta?.text) {
                                fullText += evt.delta.text;
                            } else if (evt.type === 'content_block_delta' && evt.delta?.text) {
                                fullText += evt.delta.text;
                            }
                            if (onChunk) onChunk(fullText);
                        } catch { /* skip non-JSON */ }
                    }
                }
            } finally {
                // 4. Always delete temp conversation
                try {
                    await fetch(`/api/organizations/${orgId}/chat_conversations/${convId}`, {
                        method: 'DELETE', credentials: 'include'
                    });
                } catch { /* cleanup failure non-critical */ }
            }
            return fullText;
        },

        async applyRenames(renameMap, onProgress) {
            const orgId = await ClaudeAPI.getOrgId();
            if (!orgId) throw new Error('Org ID not available');
            const entries = Object.entries(renameMap);
            let ok = 0, fail = 0;
            for (let i = 0; i < entries.length; i++) {
                const [uuid, newName] = entries[i];
                const base = `/api/organizations/${orgId}/chat_conversations/${uuid}`;
                let success = false;
                const combos = [
                    ['PUT', { name: newName }], ['PUT', { title: newName }],
                    ['PATCH', { name: newName }], ['PATCH', { title: newName }],
                ];
                for (const [method, body] of combos) {
                    try {
                        const r = await fetch(base, {
                            method, credentials: 'include',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(body),
                        });
                        if (r.ok) { success = true; break; }
                    } catch {}
                }
                if (success) ok++; else fail++;
                if (onProgress) onProgress(i + 1, entries.length, ok, fail, uuid, newName, success);
                await sleep(350);
            }
            return { ok, fail, total: entries.length };
        },
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

            try {
            // Apply saved width before styles render
            this._applyWidth(Settings.get('panelWidth'));

            // Create Shadow DOM host for CSS isolation
            this._host = document.createElement('div');
            this._host.id = PREFIX + '-shadow-host';
            this._host.style.cssText = 'position:fixed;top:0;right:0;width:0;height:0;z-index:2147483647;pointer-events:none';
            document.body.appendChild(this._host);
            this._root = this._host.attachShadow({ mode: 'open' });

            // Inject panel styles into shadow root (isolated from page CSS)
            const styleEl = document.createElement('style');
            styleEl.textContent = this._getShadowCSS();
            this._root.appendChild(styleEl);

            // Inject document-scope styles (hover strip, body margin for locked mode)
            this._createDocStyles();

            this._panel = document.createElement('div');
            this._panel.id = PREFIX + '-panel';
            if (!Settings.get('panelLocked')) {
                this._panel.className = PREFIX + '-panel-hidden';
            }

            // AbortController for all panel event listeners (cleanup on destroy)
            this._ac = new AbortController();

            setSafeHTML(this._panel, this._getHTML());
            this._root.appendChild(this._panel);
            this._bindEvents();
            this._initResize();
            this._loadData();

            // Restore lock state
            if (Settings.get('panelLocked')) {
                this._setLocked(true);
            }

            // Auto-refresh usage every 60s
            this._refreshTimer = setInterval(() => this._loadData(), 60000);

            } catch (e) {
                console.error(LOG_TAG, 'Panel build failed:', e);
                // Reset state so resilience can retry
                this._panel = null;
            }
        },

        _createDocStyles() {
            // Document-scope CSS: hover strip, body locked state, panel width var
            injectCSS(PREFIX + '-panel-css', `
                :root {
                    --cue-panel-bg: #0a0a14;
                    --cue-panel-bg2: #12121e;
                    --cue-panel-border: rgba(255,255,255,0.06);
                    --cue-panel-text: #d0d0e0;
                    --cue-panel-text-dim: #787890;
                    --cue-panel-text-faint: #4a4a60;
                    --cue-panel-accent: #58a6ff;
                    --cue-panel-success: #3fb950;
                    --cue-panel-danger: #f85149;
                    --cue-panel-warn: #d29922;
                }
                #${PREFIX}-hover-strip {
                    position: fixed; top: 20%; right: 0; width: 12px; height: 60vh;
                    z-index: 2147483646; cursor: pointer; pointer-events: auto;
                    isolation: isolate; contain: layout;
                }
                #${PREFIX}-hover-strip::after {
                    content: ''; position: absolute; top: 50%; right: 1px;
                    transform: translateY(-50%); width: 3px; height: 60px;
                    background: var(--strip-color, rgba(88,166,255,0.15)); border-radius: 2px;
                    transition: opacity 0.3s, background 0.3s, width 0.2s;
                }
                #${PREFIX}-hover-strip:hover::after { background: var(--strip-hover, rgba(88,166,255,0.4)); width: 5px; }
                body.${PREFIX}-panel-locked { margin-right: var(--cue-panel-w, 380px) !important; transition: margin-right 0.3s cubic-bezier(0.4,0,0.2,1); }
                body.${PREFIX}-panel-locked #${PREFIX}-hover-strip { display: none; }
            `);
        },

        _getShadowCSS() {
            return `
                /* CUE v${VERSION} Glassmorphism Panel (Shadow DOM Isolated) */
                *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

                /* Panel Container - Frosted Glass */
                #${PREFIX}-panel {
                    position: fixed; top: 0; right: 0; width: var(--cue-panel-w, 380px); height: 100vh;
                    background: rgba(8, 10, 20, 0.78);
                    backdrop-filter: blur(28px) saturate(1.4);
                    -webkit-backdrop-filter: blur(28px) saturate(1.4);
                    border-left: 1px solid rgba(255,255,255,0.06);
                    z-index: 2147483647;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
                    color: var(--cue-panel-text, #d0d0e0); font-size: 11px;
                    overflow-y: auto; overflow-x: hidden;
                    transition: transform 0.35s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease;
                    box-shadow: -8px 0 40px rgba(0,0,0,0.35), inset 1px 0 0 rgba(255,255,255,0.03);
                    display: flex; flex-direction: column;
                    pointer-events: auto;
                }
                #${PREFIX}-panel.${PREFIX}-panel-hidden { transform: translateX(100%); opacity: 0; pointer-events: none; }
                #${PREFIX}-panel.${PREFIX}-resizing { transition: none !important; }

                #${PREFIX}-panel::-webkit-scrollbar { width: 5px; }
                #${PREFIX}-panel::-webkit-scrollbar-track { background: transparent; }
                #${PREFIX}-panel::-webkit-scrollbar-thumb {
                    background: rgba(255,255,255,0.06); border-radius: 10px;
                }
                #${PREFIX}-panel::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.12); }

                /* Resize Handle */
                .${PREFIX}-resize-handle {
                    position: absolute; top: 0; left: -4px; width: 8px; height: 100%;
                    cursor: col-resize; z-index: 100000;
                }
                .${PREFIX}-resize-handle::after {
                    content: ''; position: absolute; top: 50%; left: 3px;
                    transform: translateY(-50%); width: 2px; height: 40px;
                    background: transparent; border-radius: 2px; transition: background 0.2s;
                }
                .${PREFIX}-resize-handle:hover::after,
                .${PREFIX}-resize-handle.active::after {
                    background: var(--cue-panel-accent, #58a6ff);
                    box-shadow: 0 0 8px rgba(88,166,255,0.3);
                }

                /* Header - Glass Bar */
                .${PREFIX}-hdr {
                    display: flex; align-items: center; justify-content: space-between;
                    padding: 8px 12px;
                    background: rgba(255,255,255,0.02);
                    border-bottom: 1px solid rgba(255,255,255,0.04);
                    flex-shrink: 0;
                }
                .${PREFIX}-hdr h2 {
                    margin: 0; font-size: 13px; font-weight: 700;
                    color: #f0f0ff; letter-spacing: -0.3px;
                }
                .${PREFIX}-hdr-ver {
                    font-size: 9px; color: var(--cue-panel-text-faint, #4a4a60); margin-left: 4px;
                    font-weight: 500;
                }
                .${PREFIX}-hdr-actions { display: flex; align-items: center; gap: 2px; }
                .${PREFIX}-lock-btn, .${PREFIX}-close {
                    background: none; border: 1px solid transparent;
                    color: var(--cue-panel-text-faint, #4a4a60); width: 24px; height: 24px;
                    cursor: pointer; display: flex; align-items: center;
                    justify-content: center; border-radius: 6px; transition: all 0.2s;
                }
                .${PREFIX}-lock-btn { font-size: 12px; }
                .${PREFIX}-close { font-size: 14px; }
                .${PREFIX}-lock-btn:hover {
                    color: var(--cue-panel-accent, #58a6ff); background: rgba(88,166,255,0.08);
                    border-color: rgba(88,166,255,0.12);
                }
                .${PREFIX}-lock-btn.locked { color: var(--cue-panel-accent, #58a6ff); background: rgba(88,166,255,0.1); }
                .${PREFIX}-close:hover {
                    color: var(--cue-panel-danger, #f85149); background: rgba(248,81,73,0.08);
                    border-color: rgba(248,81,73,0.12);
                }

                /* Error Bar */
                .${PREFIX}-error-bar {
                    display: flex; align-items: center; gap: 6px; padding: 6px 12px;
                    background: rgba(248,81,73,0.06); border-bottom: 1px solid rgba(248,81,73,0.12);
                    font-size: 10px; color: var(--cue-panel-danger, #f85149);
                }
                .${PREFIX}-error-bar button {
                    padding: 2px 10px; border-radius: 6px; border: 1px solid rgba(248,81,73,0.2);
                    background: rgba(248,81,73,0.08); color: var(--cue-panel-danger, #f85149); cursor: pointer;
                    font-size: 9px; font-weight: 600; transition: all 0.2s; margin-left: auto;
                }
                .${PREFIX}-error-bar button:hover { background: rgba(248,81,73,0.15); }
                .${PREFIX}-error-bar .dismiss { background: none; border: none; color: #555; cursor: pointer; font-size: 12px; padding: 0 4px; }

                /* Collapsible Groups - Glass Sections */
                .${PREFIX}-group {
                    border-bottom: 1px solid rgba(255,255,255,0.03);
                }
                .${PREFIX}-group-hdr {
                    display: flex; align-items: center; gap: 8px;
                    padding: 7px 12px; cursor: pointer; user-select: none;
                    transition: background 0.2s;
                }
                .${PREFIX}-group-hdr:hover { background: rgba(255,255,255,0.025); }
                .${PREFIX}-group-chevron {
                    font-size: 10px; color: var(--cue-panel-text-faint, #4a4a60); transition: transform 0.25s ease;
                    display: inline-block; width: 10px; text-align: center;
                }
                .${PREFIX}-group.open .${PREFIX}-group-chevron { transform: rotate(90deg); }
                .${PREFIX}-group-title {
                    font-size: 10px; font-weight: 700; text-transform: uppercase;
                    letter-spacing: 1px; color: var(--cue-panel-accent, #58a6ff);
                }
                .${PREFIX}-group-count {
                    font-size: 8px; color: var(--cue-panel-text-faint, #4a4a60); margin-left: auto;
                    background: rgba(255,255,255,0.04); border-radius: 4px; padding: 1px 5px;
                    font-weight: 600;
                }
                .${PREFIX}-group-body {
                    display: none; padding: 4px 12px 8px;
                }
                .${PREFIX}-group.open .${PREFIX}-group-body { display: block; }

                /* Sections */
                .${PREFIX}-section { padding: 4px 10px; border-bottom: 1px solid rgba(255,255,255,0.03); }
                .${PREFIX}-section-title {
                    font-size: 9px; font-weight: 700; text-transform: uppercase;
                    letter-spacing: 1px; color: var(--cue-panel-accent, #58a6ff); margin: 4px 0 2px;
                    opacity: 0.8;
                }

                /* Rows */
                .${PREFIX}-row {
                    display: flex; align-items: center; justify-content: space-between;
                    padding: 2px 0; min-height: 20px;
                }
                .${PREFIX}-row-label { color: var(--cue-panel-text-dim, #787890); font-size: 11px; }

                /* Toggle Switch - Glass Pill */
                .${PREFIX}-toggle {
                    position: relative; width: 32px; height: 16px; cursor: pointer;
                    display: inline-block; flex-shrink: 0;
                }
                .${PREFIX}-toggle input { opacity: 0; width: 0; height: 0; position: absolute; }
                .${PREFIX}-toggle-track {
                    position: absolute; inset: 0;
                    background: rgba(255,255,255,0.06); border-radius: 10px;
                    border: 1px solid rgba(255,255,255,0.06);
                    transition: all 0.25s ease;
                }
                .${PREFIX}-toggle input:checked + .${PREFIX}-toggle-track {
                    background: rgba(63,185,80,0.2);
                    border-color: rgba(63,185,80,0.3);
                    box-shadow: 0 0 10px rgba(63,185,80,0.15);
                }
                .${PREFIX}-toggle-thumb {
                    position: absolute; top: 2px; left: 2px; width: 12px; height: 12px;
                    background: rgba(255,255,255,0.7); border-radius: 50%;
                    transition: transform 0.25s cubic-bezier(0.4,0,0.2,1), background 0.2s;
                    box-shadow: 0 1px 4px rgba(0,0,0,0.3);
                }
                .${PREFIX}-toggle input:checked ~ .${PREFIX}-toggle-thumb {
                    transform: translateX(16px); background: #fff;
                    box-shadow: 0 1px 4px rgba(63,185,80,0.4);
                }

                /* Slider - Glass Track */
                .${PREFIX}-slider {
                    height: 4px; -webkit-appearance: none; appearance: none;
                    background: rgba(255,255,255,0.06); border-radius: 4px;
                    outline: none; margin: 0; border: none;
                }
                .${PREFIX}-slider::-webkit-slider-thumb {
                    -webkit-appearance: none; width: 14px; height: 14px;
                    background: var(--cue-panel-accent, #58a6ff); border-radius: 50%; cursor: pointer;
                    box-shadow: 0 0 8px rgba(88,166,255,0.3);
                }
                .${PREFIX}-slider::-webkit-slider-thumb:hover {
                    box-shadow: 0 0 14px rgba(88,166,255,0.5);
                }

                /* Select - Glass Dropdown */
                .${PREFIX}-select {
                    background: rgba(255,255,255,0.04); color: var(--cue-panel-text, #d0d0e0);
                    border: 1px solid rgba(255,255,255,0.06); border-radius: 6px;
                    padding: 2px 6px; font-size: 10px; cursor: pointer; outline: none;
                    transition: border-color 0.2s;
                }
                .${PREFIX}-select:hover { border-color: rgba(255,255,255,0.12); }
                .${PREFIX}-select:focus { border-color: var(--cue-panel-accent, #58a6ff); }

                /* Usage Bars - Glass Gauges */
                .${PREFIX}-usage-bar {
                    height: 6px; background: rgba(255,255,255,0.04); border-radius: 6px;
                    overflow: hidden; margin: 3px 0 2px;
                    border: 1px solid rgba(255,255,255,0.03);
                }
                .${PREFIX}-usage-fill {
                    height: 100%; border-radius: 5px; transition: width 0.6s ease;
                    background: linear-gradient(90deg, var(--cue-panel-success, #3fb950), var(--cue-panel-accent, #58a6ff));
                    box-shadow: 0 0 8px rgba(63,185,80,0.2);
                }
                .${PREFIX}-usage-fill.warn {
                    background: linear-gradient(90deg, var(--cue-panel-warn, #d29922), #e8a020);
                    box-shadow: 0 0 8px rgba(210,153,34,0.2);
                }
                .${PREFIX}-usage-fill.danger {
                    background: linear-gradient(90deg, var(--cue-panel-danger, #f85149), #ff6b6b);
                    box-shadow: 0 0 8px rgba(248,81,73,0.2);
                }
                .${PREFIX}-usage-pct { font-size: 10px; color: var(--cue-panel-text-dim, #787890); }

                /* Feature Toggle Rows */
                .${PREFIX}-feat-row {
                    display: flex; align-items: center; justify-content: space-between;
                    padding: 2px 0;
                }
                .${PREFIX}-feat-name { font-size: 11px; color: var(--cue-panel-text, #d0d0e0); }
                .${PREFIX}-feat-desc { display: none; }
                .${PREFIX}-feat-btn {
                    padding: 2px 10px; border-radius: 6px;
                    border: 1px solid rgba(255,255,255,0.06);
                    cursor: pointer; font-size: 9px; font-weight: 600;
                    transition: all 0.2s; min-width: 32px; text-align: center;
                    backdrop-filter: blur(4px);
                }
                .${PREFIX}-feat-btn.on {
                    background: rgba(63,185,80,0.1); color: var(--cue-panel-success, #3fb950);
                    border-color: rgba(63,185,80,0.2);
                    box-shadow: 0 0 8px rgba(63,185,80,0.08);
                }
                .${PREFIX}-feat-btn.off {
                    background: rgba(255,255,255,0.02); color: var(--cue-panel-text-dim, #787890);
                }
                .${PREFIX}-feat-btn:hover { border-color: rgba(255,255,255,0.12); }

                /* Glass Buttons */
                .${PREFIX}-export-btn {
                    display: block; width: 100%; padding: 5px 10px; margin: 0;
                    background: rgba(255,255,255,0.03);
                    color: var(--cue-panel-text-dim, #787890);
                    border: 1px solid rgba(255,255,255,0.05); border-radius: 8px;
                    cursor: pointer; font-size: 10px; font-weight: 500;
                    text-align: left; transition: all 0.2s;
                }
                .${PREFIX}-export-btn:hover {
                    background: rgba(88,166,255,0.06);
                    color: var(--cue-panel-accent, #58a6ff); border-color: rgba(88,166,255,0.15);
                    box-shadow: 0 0 12px rgba(88,166,255,0.06);
                }

                /* Status Dot */
                .${PREFIX}-status-dot {
                    width: 7px; height: 7px; border-radius: 50%; display: inline-block; margin-right: 5px;
                }
                .${PREFIX}-status-dot.idle { background: var(--cue-panel-text-faint, #4a4a60); }
                .${PREFIX}-status-dot.generating {
                    background: var(--cue-panel-warn, #d29922);
                    animation: ${PREFIX}-pulse 1.2s infinite;
                    box-shadow: 0 0 8px rgba(210,153,34,0.3);
                }
                .${PREFIX}-status-dot.complete {
                    background: var(--cue-panel-success, #3fb950);
                    box-shadow: 0 0 6px rgba(63,185,80,0.2);
                }
                .${PREFIX}-status-dot.stuck { background: var(--cue-panel-danger, #f85149); box-shadow: 0 0 6px rgba(248,81,73,0.3); }
                .${PREFIX}-status-dot.truncated { background: var(--cue-panel-danger, #f85149); box-shadow: 0 0 6px rgba(248,81,73,0.3); }
                @keyframes ${PREFIX}-pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }

                /* Prompt Section */
                .${PREFIX}-prompts-section { padding-bottom: 0 !important; }
                .${PREFIX}-prompt-tabs {
                    display: flex; gap: 3px; margin-bottom: 6px; flex-wrap: wrap;
                }
                .${PREFIX}-ptab {
                    padding: 3px 8px; border-radius: 6px;
                    border: 1px solid rgba(255,255,255,0.04);
                    background: rgba(255,255,255,0.02); color: var(--cue-panel-text-faint, #4a4a60);
                    cursor: pointer; font-size: 9px; font-weight: 600; transition: all 0.2s;
                }
                .${PREFIX}-ptab:hover { color: var(--cue-panel-text-dim, #787890); background: rgba(255,255,255,0.04); }
                .${PREFIX}-ptab.active {
                    color: var(--tab-color, var(--cue-panel-accent, #58a6ff));
                    border-color: var(--tab-color, var(--cue-panel-accent, #58a6ff));
                    background: rgba(88,166,255,0.06);
                    box-shadow: 0 0 8px rgba(88,166,255,0.06);
                }
                .${PREFIX}-prompt-row {
                    display: flex; align-items: center; gap: 3px; margin: 2px 0;
                }
                .${PREFIX}-prompt-btn {
                    display: flex; align-items: center; flex: 1; min-width: 0;
                    padding: 4px 8px; border-radius: 6px;
                    border: 1px solid rgba(255,255,255,0.04);
                    background: rgba(255,255,255,0.02); color: var(--cue-panel-text, #d0d0e0);
                    cursor: pointer; font-size: 10px; transition: all 0.2s;
                    text-align: left; overflow: hidden; white-space: nowrap;
                }
                .${PREFIX}-prompt-btn span { overflow: hidden; text-overflow: ellipsis; }
                .${PREFIX}-prompt-btn:hover {
                    background: rgba(88,166,255,0.06);
                    border-color: rgba(88,166,255,0.12); color: #fff;
                }
                .${PREFIX}-prompt-edit-btn {
                    background: none; border: 1px solid transparent;
                    color: var(--cue-panel-text-faint, #4a4a60); cursor: pointer;
                    font-size: 11px; width: 22px; height: 22px; border-radius: 6px;
                    display: flex; align-items: center; justify-content: center; flex-shrink: 0;
                    transition: all 0.2s;
                }
                .${PREFIX}-prompt-edit-btn:hover {
                    color: var(--cue-panel-accent, #58a6ff);
                    background: rgba(88,166,255,0.08); border-color: rgba(88,166,255,0.12);
                }
                .${PREFIX}-prompt-mgr-btn {
                    padding: 2px 8px; border-radius: 6px;
                    border: 1px solid rgba(255,255,255,0.04);
                    background: rgba(255,255,255,0.02); color: var(--cue-panel-text-dim, #787890);
                    cursor: pointer; font-size: 9px; font-weight: 600; transition: all 0.2s;
                }
                .${PREFIX}-prompt-mgr-btn:hover {
                    color: var(--cue-panel-accent, #58a6ff);
                    background: rgba(88,166,255,0.06); border-color: rgba(88,166,255,0.12);
                }

                /* Modal - Frosted Glass */
                .${PREFIX}-modal-overlay {
                    position: fixed; inset: 0; background: rgba(0,0,0,0.5);
                    z-index: 100000; display: flex; align-items: center; justify-content: center;
                    backdrop-filter: blur(8px);
                    pointer-events: auto;
                }
                .${PREFIX}-modal {
                    background: rgba(12, 14, 24, 0.92);
                    backdrop-filter: blur(24px) saturate(1.3);
                    border: 1px solid rgba(255,255,255,0.08);
                    border-radius: 14px; padding: 20px;
                    width: 500px; max-width: 90vw; max-height: 80vh;
                    overflow-y: auto;
                    box-shadow: 0 24px 80px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04);
                }
                .${PREFIX}-modal h3 { margin: 0 0 14px; color: #f0f0ff; font-size: 15px; font-weight: 700; }
                .${PREFIX}-modal input, .${PREFIX}-modal textarea {
                    width: 100%; background: rgba(255,255,255,0.04); color: var(--cue-panel-text, #d0d0e0);
                    border: 1px solid rgba(255,255,255,0.06); border-radius: 8px;
                    padding: 10px 12px; font-size: 12px; font-family: inherit; outline: none;
                    box-sizing: border-box; transition: border-color 0.2s, box-shadow 0.2s;
                }
                .${PREFIX}-modal input:focus, .${PREFIX}-modal textarea:focus {
                    border-color: var(--cue-panel-accent, #58a6ff);
                    box-shadow: 0 0 12px rgba(88,166,255,0.1);
                }
                .${PREFIX}-modal textarea { min-height: 180px; resize: vertical; margin-top: 8px; }
                .${PREFIX}-modal-actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 14px; }
                .${PREFIX}-modal-btn {
                    padding: 8px 16px; border-radius: 8px;
                    border: 1px solid rgba(255,255,255,0.06);
                    cursor: pointer; font-size: 12px; font-weight: 500; transition: all 0.2s;
                }
                .${PREFIX}-modal-btn.primary {
                    background: var(--cue-panel-accent, #58a6ff); color: #000;
                    border-color: var(--cue-panel-accent, #58a6ff);
                    box-shadow: 0 0 16px rgba(88,166,255,0.2);
                }
                .${PREFIX}-modal-btn.primary:hover { filter: brightness(1.2); box-shadow: 0 0 24px rgba(88,166,255,0.3); }
                .${PREFIX}-modal-btn.secondary { background: rgba(255,255,255,0.04); color: var(--cue-panel-text-dim, #787890); }
                .${PREFIX}-modal-btn.secondary:hover { color: #ccc; background: rgba(255,255,255,0.06); }
                .${PREFIX}-modal-btn.danger { background: rgba(248,81,73,0.06); color: var(--cue-panel-danger, #f85149); border-color: rgba(248,81,73,0.15); }
                .${PREFIX}-modal-btn.danger:hover { background: rgba(248,81,73,0.12); }

                /* Prompt Manager - Glass Overlay */
                .${PREFIX}-prompt-mgr {
                    width: 680px; max-width: 95vw; max-height: 85vh;
                    display: flex; flex-direction: column; padding: 0; overflow: hidden;
                }
                .${PREFIX}-mgr-header {
                    display: flex; align-items: center; justify-content: space-between;
                    padding: 14px 18px; border-bottom: 1px solid rgba(255,255,255,0.05);
                }
                .${PREFIX}-mgr-toolbar {
                    padding: 10px 18px; border-bottom: 1px solid rgba(255,255,255,0.05);
                    display: flex; flex-direction: column; gap: 8px;
                }
                .${PREFIX}-mgr-tabs { display: flex; gap: 3px; flex-wrap: wrap; }
                .${PREFIX}-mgr-search {
                    width: 100%; background: rgba(255,255,255,0.04); color: var(--cue-panel-text, #d0d0e0);
                    border: 1px solid rgba(255,255,255,0.06); border-radius: 8px;
                    padding: 8px 12px; font-size: 12px; outline: none; box-sizing: border-box;
                    transition: border-color 0.2s;
                }
                .${PREFIX}-mgr-search:focus { border-color: var(--cue-panel-accent, #58a6ff); }
                .${PREFIX}-mgr-list { flex: 1; overflow-y: auto; padding: 6px 18px; }
                .${PREFIX}-mgr-item {
                    padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.03);
                    transition: background 0.15s;
                }
                .${PREFIX}-mgr-item:hover {
                    background: rgba(255,255,255,0.02);
                    margin: 0 -10px; padding-left: 10px; padding-right: 10px; border-radius: 8px;
                }
                .${PREFIX}-mgr-item-head { display: flex; align-items: center; gap: 8px; }
                .${PREFIX}-mgr-item-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
                .${PREFIX}-mgr-item-label {
                    font-size: 12px; font-weight: 600; color: #e0e0f0; flex: 1; min-width: 0;
                    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
                }
                .${PREFIX}-mgr-item-cat {
                    font-size: 9px; color: var(--cue-panel-text-faint, #4a4a60); text-transform: uppercase;
                    letter-spacing: 0.5px; flex-shrink: 0;
                }
                .${PREFIX}-mgr-item-actions {
                    display: flex; gap: 3px; flex-shrink: 0; opacity: 0; transition: opacity 0.15s;
                }
                .${PREFIX}-mgr-item:hover .${PREFIX}-mgr-item-actions { opacity: 1; }
                .${PREFIX}-mgr-act {
                    background: none; border: 1px solid transparent; cursor: pointer;
                    width: 24px; height: 24px; border-radius: 6px; font-size: 12px;
                    display: flex; align-items: center; justify-content: center; transition: all 0.15s;
                }
                .${PREFIX}-mgr-act.edit { color: var(--cue-panel-accent, #58a6ff); }
                .${PREFIX}-mgr-act.edit:hover { background: rgba(88,166,255,0.08); border-color: rgba(88,166,255,0.15); }
                .${PREFIX}-mgr-act.del { color: var(--cue-panel-danger, #f85149); }
                .${PREFIX}-mgr-act.del:hover { background: rgba(248,81,73,0.08); border-color: rgba(248,81,73,0.15); }
                .${PREFIX}-mgr-act.move { color: #8b949e; font-size: 8px; padding: 2px 4px; min-width: 16px; }
                .${PREFIX}-mgr-act.move:hover { background: rgba(139,148,158,0.1); color: #c9d1d9; }
                .${PREFIX}-mgr-item-preview {
                    font-size: 10px; color: var(--cue-panel-text-faint, #4a4a60); margin-top: 3px;
                    line-height: 1.3; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
                }
                .${PREFIX}-mgr-footer {
                    display: flex; gap: 8px; padding: 14px 18px; flex-wrap: wrap;
                    border-top: 1px solid rgba(255,255,255,0.05);
                }

                /* Category Editor */
                .${PREFIX}-cat-editor {
                    width: 100%; display: flex; flex-direction: column; gap: 4px; padding: 8px 18px;
                    border-bottom: 1px solid rgba(255,255,255,0.04); background: rgba(0,0,0,0.1);
                }
                .${PREFIX}-cat-row { display: flex; align-items: center; gap: 6px; height: 30px; }
                .${PREFIX}-cat-row input[type="text"] {
                    flex: 1; background: rgba(255,255,255,0.04); color: var(--cue-panel-text, #d0d0e0);
                    border: 1px solid rgba(255,255,255,0.06); border-radius: 6px;
                    padding: 4px 8px; font-size: 11px; outline: none; min-width: 0;
                }
                .${PREFIX}-cat-row input[type="text"]:focus { border-color: var(--cue-panel-accent, #58a6ff); }
                .${PREFIX}-cat-row input[type="color"] {
                    width: 26px; height: 26px; border: none; background: none;
                    cursor: pointer; padding: 0; border-radius: 6px;
                }
                .${PREFIX}-cat-row .${PREFIX}-cat-count {
                    font-size: 9px; color: var(--cue-panel-text-faint, #4a4a60); min-width: 20px; text-align: center;
                }
                .${PREFIX}-cat-row .${PREFIX}-cat-del {
                    background: none; border: none; color: var(--cue-panel-danger, #f85149); cursor: pointer;
                    font-size: 14px; width: 24px; height: 24px; display: flex; align-items: center;
                    justify-content: center; border-radius: 6px; opacity: 0.5; transition: all 0.15s;
                }
                .${PREFIX}-cat-row .${PREFIX}-cat-del:hover { opacity: 1; background: rgba(248,81,73,0.08); }

                /* Settings Grid */
                .${PREFIX}-settings-grid { display: flex; flex-wrap: wrap; gap: 1px 12px; }

                /* Info Icon Tooltip */
                .${PREFIX}-info-icon {
                    display: inline-flex; align-items: center; justify-content: center;
                    width: 13px; height: 13px; border-radius: 50%;
                    background: rgba(255,255,255,0.04); color: var(--cue-panel-text-faint, #4a4a60);
                    font-size: 8px; font-weight: 700; cursor: help;
                    margin-left: 3px; vertical-align: middle; position: relative;
                    border: 1px solid rgba(255,255,255,0.06); transition: all 0.2s;
                }
                .${PREFIX}-info-icon:hover {
                    color: var(--cue-panel-accent, #58a6ff); border-color: rgba(88,166,255,0.2);
                    background: rgba(88,166,255,0.06);
                }
                .${PREFIX}-info-icon::after {
                    content: attr(data-tip); position: absolute; bottom: 120%; left: 50%;
                    transform: translateX(-50%); padding: 6px 10px;
                    background: rgba(12,14,24,0.95); backdrop-filter: blur(12px);
                    border: 1px solid rgba(255,255,255,0.08);
                    color: var(--cue-panel-text, #d0d0e0); font-size: 10px; font-weight: 400;
                    border-radius: 8px; white-space: nowrap; max-width: 260px;
                    pointer-events: none; opacity: 0; transition: opacity 0.2s;
                    z-index: 10; box-shadow: 0 8px 24px rgba(0,0,0,0.4);
                }
                .${PREFIX}-info-icon:hover::after { opacity: 1; }

                /* Model Badge - Glass Chip */
                .${PREFIX}-model-badge {
                    font-size: 9px; font-weight: 600;
                    padding: 2px 8px; border-radius: 6px;
                    background: rgba(255,255,255,0.04);
                    border: 1px solid rgba(255,255,255,0.06);
                    color: var(--cue-panel-text-dim, #787890); display: inline-block;
                    vertical-align: middle; margin-left: 4px;
                }
                .${PREFIX}-model-badge:empty { display: none; }
                .${PREFIX}-model-badge.opus {
                    color: #c9a0ff; border-color: rgba(201,160,255,0.2);
                    background: rgba(201,160,255,0.06);
                    box-shadow: 0 0 8px rgba(201,160,255,0.08);
                }
                .${PREFIX}-model-badge.sonnet {
                    color: #58a6ff; border-color: rgba(88,166,255,0.2);
                    background: rgba(88,166,255,0.06);
                }
                .${PREFIX}-model-badge.haiku {
                    color: #7ee787; border-color: rgba(126,231,135,0.2);
                    background: rgba(126,231,135,0.06);
                }

                /* Session Stats */
                .${PREFIX}-session-stats {
                    display: flex; gap: 8px; flex-wrap: wrap;
                    font-size: 10px; color: var(--cue-panel-text-dim, #787890);
                    padding: 2px 0;
                }
                .${PREFIX}-stat-item { display: flex; gap: 3px; align-items: center; }
                .${PREFIX}-stat-val { color: var(--cue-panel-text, #d0d0e0); font-weight: 600; }

                /* Response Sparkline */
                .${PREFIX}-sparkline {
                    display: flex; align-items: flex-end; gap: 1px;
                    height: 24px; padding: 2px 0;
                }
                .${PREFIX}-spark-bar {
                    flex: 1; min-width: 3px; max-width: 8px;
                    background: rgba(88,166,255,0.25); border-radius: 2px 2px 0 0;
                    transition: height 0.4s cubic-bezier(0.4,0,0.2,1);
                }
                .${PREFIX}-spark-bar.complete { background: rgba(63,185,80,0.3); }
                .${PREFIX}-spark-bar.truncated { background: rgba(248,81,73,0.3); }

                /* Prompt Variable Hint */
                .${PREFIX}-var-hint {
                    font-size: 9px; color: var(--cue-panel-text-faint, #4a4a60); margin-top: 4px;
                    padding: 4px 8px; background: rgba(255,255,255,0.02);
                    border-radius: 6px; border: 1px dashed rgba(255,255,255,0.04);
                }
                .${PREFIX}-var-hint code {
                    color: var(--cue-panel-accent, #58a6ff); font-size: 9px; opacity: 0.8;
                }

                /* Accent Color Dots */
                .${PREFIX}-accent-dots {
                    display: flex; gap: 4px; flex-wrap: wrap; align-items: center;
                }
                .${PREFIX}-accent-dot {
                    width: 14px; height: 14px; border-radius: 50%; cursor: pointer;
                    border: 2px solid transparent; transition: all 0.2s;
                    flex-shrink: 0;
                }
                .${PREFIX}-accent-dot:hover { transform: scale(1.25); }
                .${PREFIX}-accent-dot.active {
                    border-color: rgba(255,255,255,0.8); transform: scale(1.25);
                    box-shadow: 0 0 10px rgba(255,255,255,0.2);
                }
            `;
        },

        _getHTML() {
            const S = (k) => Settings.get(k);
            return `
                <div class="${PREFIX}-resize-handle" id="${PREFIX}-resize-handle"></div>
                <div class="${PREFIX}-hdr">
                    <h2>CUE <span class="${PREFIX}-hdr-ver">v${VERSION}</span> <span id="${PREFIX}-model-badge" class="${PREFIX}-model-badge" title="Current Claude model detected from the last response"></span></h2>
                    <div class="${PREFIX}-hdr-actions">
                        <button class="${PREFIX}-lock-btn${S('panelLocked') ? ' locked' : ''}" id="${PREFIX}-panel-lock" title="Lock panel open — keeps the panel visible and pushes the page content left">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                ${S('panelLocked')
                                    ? '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>'
                                    : '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 019.9-1"/>'
                                }
                            </svg>
                        </button>
                        <button class="${PREFIX}-close" id="${PREFIX}-panel-close" title="Close the panel (unlocks if locked)">&times;</button>
                    </div>
                </div>

                <!-- ═══ ERROR BAR (persistent, hidden by default) ═══ -->
                <div class="${PREFIX}-error-bar" id="${PREFIX}-error-bar" style="display:none">
                    <span id="${PREFIX}-error-msg"></span>
                    <button id="${PREFIX}-error-retry">Retry</button>
                    <span class="dismiss" id="${PREFIX}-error-dismiss">&times;</span>
                </div>

                <!-- ═══ STATUS ═══ -->
                <div class="${PREFIX}-section">
                    <div class="${PREFIX}-row"><span class="${PREFIX}-row-label">Response</span><span id="${PREFIX}-status"><span class="${PREFIX}-status-dot idle"></span>Idle</span></div>
                    <div class="${PREFIX}-row"><span class="${PREFIX}-row-label">Last</span><span id="${PREFIX}-last-resp" style="color:#666;font-size:10px">--</span></div>
                    <div id="${PREFIX}-sparkline-row" style="height:20px;margin:2px 0" title="Response duration history — taller bars = longer responses. Green = complete, red = truncated"></div>
                    <div style="font-size:9px;color:#444;margin-top:1px" id="${PREFIX}-session-stats" title="Messages sent / total generation time / session uptime"></div>
                </div>

                <!-- ═══ USAGE ═══ -->
                <div class="${PREFIX}-section">
                    <div id="${PREFIX}-usage-content"><span style="color:#555;font-size:10px">Loading usage...</span></div>
                </div>

                <!-- ═══ APPEARANCE ═══ -->
                <div class="${PREFIX}-group" data-group="appearance">
                    <div class="${PREFIX}-group-hdr" data-toggle="appearance">
                        <span class="${PREFIX}-group-chevron">&#9656;</span>
                        <span class="${PREFIX}-group-title">Appearance</span>
                        <span class="${PREFIX}-group-count">7</span>
                    </div>
                    <div class="${PREFIX}-group-body">
                        <div class="${PREFIX}-settings-grid">
                            ${this._makeToggle('themeEnabled', 'Theme', 'Apply a color theme to Claude.ai — choose Catppuccin flavors or CUE originals')}
                            ${this._makeToggle('fontOverride', 'Sans Fonts', 'Replace Claude\'s default serif font with a clean sans-serif for easier reading')}
                            ${this._makeToggle('wideMode', 'Wide Mode', 'Expand the chat area to use more of your screen')}
                            ${this._makeToggle('coloredButtons', 'Btn Colors', 'Colorize action buttons (copy, edit, retry) for quick identification')}
                            ${this._makeToggle('coloredBoldItalic', 'Bold/Italic', 'Make bold text green and italic text blue in responses')}
                            ${this._makeToggle('smoothAnimations', 'Animations', 'Add subtle hover transitions and focus outlines to buttons')}
                            ${this._makeToggle('customScrollbar', 'Scrollbar', 'Replace the browser scrollbar with a slim, dark-themed one')}
                        </div>
                        <div class="${PREFIX}-row" style="margin-top:4px">
                            <span class="${PREFIX}-row-label" style="font-size:10px">Theme</span>
                            <select class="${PREFIX}-select" id="${PREFIX}-set-themeVariant">
                                <optgroup label="Catppuccin">
                                    <option value="mocha">Mocha</option>
                                    <option value="macchiato">Macchiato</option>
                                    <option value="frappe">Frapp\u00e9</option>
                                    <option value="latte">Latte</option>
                                </optgroup>
                                <optgroup label="CUE Original">
                                    <option value="oceanic">Oceanic</option>
                                    <option value="midnight">Midnight</option>
                                </optgroup>
                                <option value="none">None</option>
                            </select>
                        </div>
                        <div class="${PREFIX}-row" id="${PREFIX}-accent-row" style="display:${CATPPUCCIN[S('themeVariant')] ? 'flex' : 'none'}">
                            <span class="${PREFIX}-row-label" style="font-size:10px">Accent</span>
                            <div id="${PREFIX}-accent-dots" class="${PREFIX}-accent-dots"></div>
                        </div>
                        <div class="${PREFIX}-row">
                            <span class="${PREFIX}-row-label" style="font-size:10px">Width: <span id="${PREFIX}-width-val">${S('chatWidthPct')}</span>%</span>
                            <input type="range" class="${PREFIX}-slider" id="${PREFIX}-set-chatWidthPct" min="50" max="100" value="${S('chatWidthPct')}" style="width:120px">
                        </div>
                    </div>
                </div>

                <!-- ═══ BEHAVIOR ═══ -->
                <div class="${PREFIX}-group" data-group="behavior">
                    <div class="${PREFIX}-group-hdr" data-toggle="behavior">
                        <span class="${PREFIX}-group-chevron">&#9656;</span>
                        <span class="${PREFIX}-group-title">Behavior</span>
                        <span class="${PREFIX}-group-count">7</span>
                    </div>
                    <div class="${PREFIX}-group-body">
                        <div class="${PREFIX}-settings-grid">
                            ${this._makeToggle('pasteFix', 'Paste Fix', 'Strip rich formatting on paste — plain text only, no broken HTML')}
                            ${this._makeToggle('chunkedPaste', 'Chunk Paste', 'Paste large text in chunks to bypass Claude\'s attachment detection popup')}
                            ${this._makeToggle('autoScroll', 'Auto-Scroll', 'Scroll to the bottom automatically as Claude generates a response')}
                            ${this._makeToggle('autoApprove', 'Auto-Approve', 'Automatically click "Allow" on tool-use permission dialogs')}
                            ${this._makeToggle('autoContinue', 'Auto Continue', 'Automatically send continue when Claude response fails to fully generate. Circuit breaker after 5 consecutive failures.')}
                            ${this._makeToggle('responseMonitor', 'Resp Monitor', 'Track response status, duration, and word count')}
                            ${this._makeToggle('domTrimmer', 'DOM Trimmer', 'Hide older messages to reduce memory in very long conversations')}
                        </div>
                        <div class="${PREFIX}-row">
                            <span class="${PREFIX}-row-label" style="font-size:10px">Keep: <span id="${PREFIX}-trim-val">${S('domKeepVisible')}</span> msgs</span>
                            <input type="range" class="${PREFIX}-slider" id="${PREFIX}-set-domKeepVisible" min="5" max="100" value="${S('domKeepVisible')}" style="width:120px">
                        </div>
                    </div>
                </div>

                <!-- ═══ NOTIFICATIONS ═══ -->
                <div class="${PREFIX}-group" data-group="notifications">
                    <div class="${PREFIX}-group-hdr" data-toggle="notifications">
                        <span class="${PREFIX}-group-chevron">&#9656;</span>
                        <span class="${PREFIX}-group-title">Notifications</span>
                        <span class="${PREFIX}-group-count">2</span>
                    </div>
                    <div class="${PREFIX}-group-body">
                        <div class="${PREFIX}-settings-grid">
                            ${this._makeToggle('notifySound', 'Sound Alert', 'Play a tone when Claude finishes generating — useful when tabbed away')}
                            ${this._makeToggle('notifyFlash', 'Tab Flash', 'Flash the browser tab title when a response completes')}
                        </div>
                    </div>
                </div>

                <!-- ═══ SIDEBAR ═══ -->
                <div class="${PREFIX}-group" data-group="sidebar">
                    <div class="${PREFIX}-group-hdr" data-toggle="sidebar">
                        <span class="${PREFIX}-group-chevron">&#9656;</span>
                        <span class="${PREFIX}-group-title">Sidebar</span>
                        <span class="${PREFIX}-group-count">4</span>
                    </div>
                    <div class="${PREFIX}-group-body">
                        <div class="${PREFIX}-settings-grid">
                            ${this._makeToggle('historyPanel', 'History Panel', 'Replace the native sidebar with a full-featured history panel — search, rename, delete, star, and more')}
                            ${this._makeToggle('sidebarAutoExpand', 'Auto-Expand', 'Expand the left sidebar on page load — respects manual close (native sidebar only)')}
                            ${this._makeToggle('starredHighlight', 'Star Glow', 'Green highlight on starred chats (native sidebar only)')}
                        </div>
                        <div style="margin-top:4px">
                            <input type="text" id="${PREFIX}-sidebar-search" placeholder="Filter chats..." style="width:100%;background:var(--cue-panel-bg2);color:var(--cue-panel-text);border:1px solid var(--cue-panel-border);border-radius:4px;padding:3px 8px;font-size:10px;outline:none;box-sizing:border-box" title="Type to filter sidebar conversations by name">
                        </div>
                    </div>
                </div>

                <!-- ═══ TOOLS ═══ -->
                <div class="${PREFIX}-group" data-group="tools">
                    <div class="${PREFIX}-group-hdr" data-toggle="tools">
                        <span class="${PREFIX}-group-chevron">&#9656;</span>
                        <span class="${PREFIX}-group-title">Tools</span>
                        <span class="${PREFIX}-group-count">6</span>
                    </div>
                    <div class="${PREFIX}-group-body">
                        <div style="display:flex;gap:4px;margin-bottom:4px">
                            <button class="${PREFIX}-export-btn" id="${PREFIX}-autobuild-btn" style="background:linear-gradient(135deg,rgba(88,166,255,0.12),rgba(63,185,80,0.08));border-color:rgba(88,166,255,0.25);color:#58a6ff;font-weight:600;flex:1;text-align:center">AutoBuild</button>
                            <button class="${PREFIX}-export-btn" id="${PREFIX}-rename-chat-btn" style="flex:1;text-align:center">Rename Chat</button>
                        </div>
                        <div style="margin-bottom:4px">
                            <button class="${PREFIX}-export-btn" id="${PREFIX}-bulk-rename-btn" style="width:100%;text-align:center;background:linear-gradient(135deg,rgba(201,160,255,0.08),rgba(88,166,255,0.06));border-color:rgba(201,160,255,0.18);color:#c9a0ff" title="Use AI to suggest better names for your entire chat history, then batch rename them">Improve Chat Names</button>
                        </div>
                        <div class="${PREFIX}-section-title">Export</div>
                        <div style="display:flex;gap:3px;margin-bottom:3px">
                            <button class="${PREFIX}-export-btn" id="${PREFIX}-export-json" style="flex:1;text-align:center">JSON</button>
                            <button class="${PREFIX}-export-btn" id="${PREFIX}-export-md" style="flex:1;text-align:center">Markdown</button>
                            <button class="${PREFIX}-export-btn" id="${PREFIX}-export-all" style="flex:1;text-align:center">All (ZIP)</button>
                        </div>
                        <div class="${PREFIX}-settings-grid">
                            ${this._makeToggle('exportBranchMode', 'Branches', 'Include all message branches and edits in the export')}
                            ${this._makeToggle('exportIncludeImages', 'Images', 'Embed images as base64 in the JSON export')}
                        </div>
                        <div class="${PREFIX}-section-title" style="margin-top:4px">Settings</div>
                        <div style="display:flex;gap:3px">
                            <button class="${PREFIX}-export-btn" id="${PREFIX}-settings-export" style="flex:1;text-align:center" title="Download all CUE settings + prompts as a JSON backup file">Backup</button>
                            <button class="${PREFIX}-export-btn" id="${PREFIX}-settings-import" style="flex:1;text-align:center" title="Restore CUE settings + prompts from a JSON backup file">Restore</button>
                        </div>
                    </div>
                </div>

                <!-- ═══ FEATURES (Claude beta) ═══ -->
                <div class="${PREFIX}-group" data-group="features">
                    <div class="${PREFIX}-group-hdr" data-toggle="features">
                        <span class="${PREFIX}-group-chevron">&#9656;</span>
                        <span class="${PREFIX}-group-title">Claude Features</span>
                    </div>
                    <div class="${PREFIX}-group-body" id="${PREFIX}-features-section">
                        <div id="${PREFIX}-features-content"><span style="color:#555;font-size:10px">Loading features...</span></div>
                    </div>
                </div>

                <!-- ═══ PROMPTS ═══ -->
                <div class="${PREFIX}-section ${PREFIX}-prompts-section" style="flex:1;overflow:hidden;display:flex;flex-direction:column;border-bottom:none">
                    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:3px">
                        <div class="${PREFIX}-section-title" style="margin:0">Prompts</div>
                        <div style="display:flex;gap:3px">
                            <button class="${PREFIX}-prompt-mgr-btn" id="${PREFIX}-prompt-add-quick" title="Create a new prompt">+</button>
                            <button class="${PREFIX}-prompt-mgr-btn" id="${PREFIX}-prompt-manage" title="Open the full prompt manager">Manage</button>
                        </div>
                    </div>
                    <div class="${PREFIX}-var-hint">Variables: <code>{{clipboard}}</code> <code>{{selection}}</code> <code>{{last_response}}</code> <code>{{model}}</code> <code>{{date}}</code> <code>{{url}}</code></div>
                    <div class="${PREFIX}-prompt-tabs" id="${PREFIX}-prompt-tabs"></div>
                    <div id="${PREFIX}-prompt-list" style="flex:1;overflow-y:auto;overflow-x:hidden"></div>
                </div>

                <div style="text-align:center;padding:4px 8px;border-top:1px solid rgba(255,255,255,0.04)"><span style="cursor:pointer;color:#58a6ff;font-size:9px" id="${PREFIX}-reset-settings" title="Reset every CUE setting to factory defaults and reload the page">Reset All Settings</span></div>
            `;
        },

        _makeToggle(key, label, tip = '') {
            const checked = Settings.get(key) ? 'checked' : '';
            const infoIcon = tip ? `<span class="${PREFIX}-info-icon" data-tip="${esc(tip)}">?</span>` : '';
            return `<div class="${PREFIX}-row" style="min-height:16px">
                    <span class="${PREFIX}-row-label" style="font-size:10px">${label}${infoIcon}</span>
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

            // Collapsible group headers
            this._panel.querySelectorAll(`.${PREFIX}-group-hdr`).forEach(hdr => {
                const group = hdr.closest(`.${PREFIX}-group`);
                const name = hdr.dataset.toggle;
                // Restore saved state (default: appearance & behavior open, rest closed)
                const defaultOpen = ['appearance', 'behavior', 'tools'].includes(name);
                const isOpen = GM_getValue(`${PREFIX}_group_${name}`, defaultOpen);
                if (isOpen) group.classList.add('open');
                hdr.addEventListener('click', () => {
                    group.classList.toggle('open');
                    GM_setValue(`${PREFIX}_group_${name}`, group.classList.contains('open'));
                });
            });

            // Theme variant select
            const themeSelect = $(`#${PREFIX}-set-themeVariant`);
            themeSelect.value = Settings.get('themeVariant');
            themeSelect.addEventListener('change', () => {
                Settings.set('themeVariant', themeSelect.value);
                // Show/hide accent row based on whether it's a Catppuccin flavor
                const accentRow = $(`#${PREFIX}-accent-row`);
                if (accentRow) accentRow.style.display = CATPPUCCIN[themeSelect.value] ? 'flex' : 'none';
                this._renderAccentDots();
            });

            // Accent color dots
            this._renderAccentDots();

            // Rename chat button
            const renameBtn = $(`#${PREFIX}-rename-chat-btn`);
            if (renameBtn) {
                renameBtn.addEventListener('click', () => {
                    const current = document.title.replace(/ - Claude$/, '').trim();
                    const name = prompt('Rename this conversation:', current);
                    if (name && name.trim()) ChatRenameModule.rename(name.trim());
                });
            }

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
            EventBus.on('response:complete', (d) => { this._updateLastResponse(d); this._renderSparkline(); SessionStats._render(); });
            EventBus.on('stream:messageLimit', (ml) => this._updateUsageFromStream(ml));
            EventBus.on('stream:model', (m) => this._updateModelBadge(m));

            // Bind export buttons
            const expJson = $(`#${PREFIX}-export-json`);
            const expMd = $(`#${PREFIX}-export-md`);
            const expAll = $(`#${PREFIX}-export-all`);
            if (expJson) expJson.addEventListener('click', () => ExportModule.exportCurrentJSON());
            if (expMd) expMd.addEventListener('click', () => ExportModule.exportMarkdown());
            if (expAll) expAll.addEventListener('click', () => ExportModule.exportAllZIP());

            // Bind AutoBuild button
            const abBtn = $(`#${PREFIX}-autobuild-btn`);
            if (abBtn) abBtn.addEventListener('click', () => AutoBuildModule.start());

            // Bind Bulk Rename button
            const brBtn = $(`#${PREFIX}-bulk-rename-btn`);
            if (brBtn) {
                console.log(LOG_TAG, 'Bulk rename button found, binding click handler');
                brBtn.addEventListener('click', () => {
                    console.log(LOG_TAG, 'Bulk rename button CLICKED');
                    this._showBulkRename();
                });
            } else {
                console.warn(LOG_TAG, 'Bulk rename button NOT found in DOM');
            }

            // #15: Settings backup/restore
            const settingsExport = $(`#${PREFIX}-settings-export`);
            if (settingsExport) settingsExport.addEventListener('click', () => this._exportSettings());
            const settingsImport = $(`#${PREFIX}-settings-import`);
            if (settingsImport) settingsImport.addEventListener('click', () => this._importSettings());

            // #17: Error bar events
            const errRetry = $(`#${PREFIX}-error-retry`);
            if (errRetry) errRetry.addEventListener('click', () => {
                if (this._errorRetryAction) this._errorRetryAction();
                this.hideError();
            });
            const errDismiss = $(`#${PREFIX}-error-dismiss`);
            if (errDismiss) errDismiss.addEventListener('click', () => this.hideError());

            // #12: Sidebar search/filter
            const sidebarSearch = $(`#${PREFIX}-sidebar-search`);
            if (sidebarSearch) {
                let searchTimer = null;
                sidebarSearch.addEventListener('input', () => {
                    clearTimeout(searchTimer);
                    searchTimer = setTimeout(() => this._filterSidebar(sidebarSearch.value.trim()), 200);
                });
            }

            // Listen for errors from modules
            EventBus.on('error:show', ({ msg, retryFn }) => this.showError(msg, retryFn));

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
                const dot = cat ? `<span style="color:${esc(cat.color)};margin-right:3px">&#9679;</span>` : '';
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
                <textarea id="${PREFIX}-pe-text" placeholder="Prompt text... Use {{clipboard}}, {{selection}}, {{last_response}}, {{model}}, {{date}}, {{time}}, {{url}}, {{conversation}} as dynamic variables">${existing ? esc(existing.prompt) : ''}</textarea>
                <div style="margin-top:6px;font-size:9px;color:#555;padding:4px 6px;background:rgba(88,166,255,0.03);border-radius:4px">
                    <strong style="color:#58a6ff">Variables:</strong>
                    <code style="color:#888">{{clipboard}}</code> <code style="color:#888">{{selection}}</code> <code style="color:#888">{{last_response}}</code>
                    <code style="color:#888">{{model}}</code> <code style="color:#888">{{date}}</code> <code style="color:#888">{{time}}</code>
                    <code style="color:#888">{{url}}</code> <code style="color:#888">{{conversation}}</code>
                </div>
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
            (ControlPanel._root || document.body).appendChild(overlay);
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
                            return `<button class="${PREFIX}-ptab${activeCat === c.id ? ' active' : ''}" data-mgr-cat="${esc(c.id)}" style="--tab-color:${esc(c.color)}">${esc(c.label)} (${cnt})</button>`;
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
                        const catColor = cat ? esc(cat.color) : '#888';
                        const catLabel = cat ? esc(cat.label) : esc(p.cat);
                        const preview = p.prompt ? p.prompt.substring(0, 120).replace(/\n/g, ' ') : '(empty)';
                        // Find real index in full prompts array for reorder
                        const realIdx = PromptModule.prompts.indexOf(p);
                        const isFirst = realIdx === 0;
                        const isLast = realIdx === PromptModule.prompts.length - 1;
                        html += `<div class="${PREFIX}-mgr-item" data-mgr-idx="${i}">
                            <div class="${PREFIX}-mgr-item-head">
                                <span class="${PREFIX}-mgr-item-dot" style="background:${catColor}"></span>
                                <span class="${PREFIX}-mgr-item-label">${esc(p.label)}</span>
                                <span class="${PREFIX}-mgr-item-cat">${catLabel}</span>
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
                                <input type="text" value="${esc(c.label)}" data-cat-rename="${esc(c.id)}" title="Rename group">
                                <span class="${PREFIX}-cat-count">${cnt}</span>
                                <button class="${PREFIX}-cat-del" data-cat-del="${esc(c.id)}" title="Delete group${cnt ? ' (' + cnt + ' prompts will move)' : ''}">&times;</button>
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
            (ControlPanel._root || document.body).appendChild(overlay);
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

        _updateModelBadge(model) {
            const el = $(`#${PREFIX}-model-badge`);
            if (!el) return;
            // Clean up model string: "claude-3-5-sonnet-20241022" -> "Sonnet 3.5"
            let short = model;
            const m = model.match(/claude[- ]?([\d.]+)?[- ]?(opus|sonnet|haiku)/i);
            if (m) {
                const ver = m[1] ? ` ${m[1]}` : '';
                short = m[2].charAt(0).toUpperCase() + m[2].slice(1) + ver;
            }
            el.textContent = short;
            el.title = `Model: ${model}`;
        },

        _renderSparkline() {
            const container = $(`#${PREFIX}-sparkline-row`);
            if (!container) return;
            const history = ResponseModule.history;
            if (history.length < 2) { container.textContent = ''; return; }
            const maxDur = Math.max(...history.map(h => h.duration), 1);
            let html = `<div class="${PREFIX}-sparkline">`;
            history.forEach(h => {
                const pct = Math.max(8, (h.duration / maxDur) * 100);
                const cls = h.status === 'truncated' ? ' truncated' : '';
                html += `<div class="${PREFIX}-spark-bar${cls}" style="height:${pct}%" title="${fmtDur(h.duration)} / ${fmtNum(h.words)} words"></div>`;
            });
            html += '</div>';
            setSafeHTML(container, html);
        },

        _renderAccentDots() {
            const container = $(`#${PREFIX}-accent-dots`);
            if (!container) return;
            const variant = Settings.get('themeVariant');
            const palette = CATPPUCCIN[variant];
            if (!palette) { container.textContent = ''; return; }
            const current = Settings.get('themeAccent');
            container.textContent = '';
            ACCENT_NAMES.forEach(name => {
                const dot = document.createElement('span');
                dot.className = `${PREFIX}-accent-dot${name === current ? ' active' : ''}`;
                dot.style.background = palette[name];
                dot.title = name.charAt(0).toUpperCase() + name.slice(1);
                dot.addEventListener('click', () => {
                    Settings.set('themeAccent', name);
                    container.querySelectorAll(`.${PREFIX}-accent-dot`).forEach(d => d.classList.remove('active'));
                    dot.classList.add('active');
                });
                container.appendChild(dot);
            });
        },

        // ─── Bulk Rename (AI-assisted chat name improvement) ───
        async _showBulkRename() {
            console.log(LOG_TAG, 'Bulk rename: starting automated flow');
            try {
            const overlay = document.createElement('div');
            overlay.id = PREFIX + '-br-overlay';
            overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:2147483647;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(8px);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif;font-size:12px;color:#d0d0e0';

            const modal = document.createElement('div');
            modal.style.cssText = 'width:700px;max-width:95vw;max-height:85vh;display:flex;flex-direction:column;overflow:hidden;background:rgba(12,14,24,0.95);backdrop-filter:blur(24px) saturate(1.3);border:1px solid rgba(255,255,255,0.08);border-radius:14px;padding:20px;box-shadow:0 24px 80px rgba(0,0,0,0.6),inset 0 1px 0 rgba(255,255,255,0.04)';

            const btnPrimary = 'padding:8px 20px;border-radius:8px;border:1px solid rgba(88,166,255,0.3);background:linear-gradient(135deg,rgba(88,166,255,0.15),rgba(88,166,255,0.08));color:#58a6ff;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit';
            const btnDanger = 'padding:8px 20px;border-radius:8px;border:1px solid rgba(248,81,73,0.3);background:rgba(248,81,73,0.06);color:#f85149;font-size:12px;cursor:pointer;font-family:inherit';

            setSafeHTML(modal, `
                <div style="display:flex;align-items:center;justify-content:space-between;padding-bottom:10px;border-bottom:1px solid rgba(255,255,255,0.05);margin-bottom:10px;flex-shrink:0">
                    <div style="font-size:15px;font-weight:600;color:#e0e0e0">Improve Chat Names</div>
                    <span id="${PREFIX}-br-close" style="cursor:pointer;color:#666;font-size:20px;padding:2px 6px;line-height:1;border-radius:4px">&times;</span>
                </div>
                <div style="flex-shrink:0;margin-bottom:10px">
                    <div style="display:flex;justify-content:space-between;font-size:10px;color:#787890;margin-bottom:4px">
                        <span id="${PREFIX}-br-phase">Ready</span>
                        <span id="${PREFIX}-br-stats"></span>
                    </div>
                    <div style="height:6px;background:rgba(255,255,255,0.04);border-radius:6px;overflow:hidden">
                        <div id="${PREFIX}-br-bar" style="height:100%;width:0%;border-radius:6px;background:linear-gradient(90deg,#c9a0ff,#58a6ff);transition:width 0.3s ease"></div>
                    </div>
                </div>
                <div id="${PREFIX}-br-body" style="flex:1;overflow-y:auto;overflow-x:hidden;min-height:0">
                    <div id="${PREFIX}-br-log" style="background:rgba(0,0,0,0.2);border:1px solid rgba(255,255,255,0.04);border-radius:8px;padding:8px 10px;min-height:60px;max-height:180px;overflow-y:auto;font-family:'Cascadia Code','Fira Code',monospace;font-size:10px;line-height:1.7;margin-bottom:10px"></div>
                    <div id="${PREFIX}-br-preview-area" style="max-height:260px;overflow-y:auto;border-radius:8px;margin-bottom:10px"></div>
                    <div style="display:flex;gap:8px;align-items:center">
                        <button id="${PREFIX}-br-start" style="${btnPrimary}">Start</button>
                        <button id="${PREFIX}-br-apply" style="${btnPrimary};display:none">Apply Renames</button>
                        <button id="${PREFIX}-br-cancel" style="${btnDanger};display:none">Cancel</button>
                        <span id="${PREFIX}-br-status" style="color:#666;font-size:11px"></span>
                    </div>
                </div>
            `);

            overlay.appendChild(modal);
            document.body.appendChild(overlay);

            overlay.addEventListener('click', (e) => { if (e.target === overlay && !BulkRenameModule._running) overlay.remove(); });
            document.getElementById(`${PREFIX}-br-close`).addEventListener('click', () => { if (!BulkRenameModule._running) overlay.remove(); });

            // UI helpers
            const phaseEl = document.getElementById(`${PREFIX}-br-phase`);
            const statsEl = document.getElementById(`${PREFIX}-br-stats`);
            const barEl = document.getElementById(`${PREFIX}-br-bar`);
            const logEl = document.getElementById(`${PREFIX}-br-log`);
            const previewArea = document.getElementById(`${PREFIX}-br-preview-area`);
            const startBtn = document.getElementById(`${PREFIX}-br-start`);
            const applyBtn = document.getElementById(`${PREFIX}-br-apply`);
            const cancelBtn = document.getElementById(`${PREFIX}-br-cancel`);
            const statusEl = document.getElementById(`${PREFIX}-br-status`);

            const setProgress = (pct, phase, stats) => {
                if (barEl) barEl.style.width = Math.min(100, Math.max(0, pct)) + '%';
                if (phase !== undefined && phaseEl) phaseEl.textContent = phase;
                if (stats !== undefined && statsEl) statsEl.textContent = stats;
            };
            const addLog = (msg, color = '#787890') => {
                if (!logEl) return;
                const line = document.createElement('div');
                line.style.color = color;
                line.textContent = msg;
                logEl.appendChild(line);
                logEl.scrollTop = logEl.scrollHeight;
            };
            const renderPreview = (renameMap) => {
                const chatMap = new Map(BulkRenameModule._chats.map(c => [c.uuid || c.id, c]));
                const count = Object.keys(renameMap).length;
                let html = `<div style="font-size:10px;color:#787890;margin-bottom:4px">${count} chats to rename:</div><div style="display:flex;flex-direction:column;gap:2px">`;
                for (const [uuid, newName] of Object.entries(renameMap)) {
                    const chat = chatMap.get(uuid);
                    const oldName = chat ? (chat.name || chat.title || '(untitled)') : uuid.slice(0, 8) + '...';
                    html += `<div style="display:flex;gap:8px;padding:4px 8px;border-radius:4px;font-size:10px;background:rgba(63,185,80,0.04);border:1px solid rgba(63,185,80,0.08)">
                        <span style="color:#f85149;text-decoration:line-through;opacity:0.6;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${esc(oldName)}">${esc(oldName)}</span>
                        <span style="color:#58a6ff;flex-shrink:0">&#10132;</span>
                        <span style="color:#3fb950;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${esc(newName)}">${esc(newName)}</span>
                    </div>`;
                }
                html += '</div>';
                setSafeHTML(previewArea, html);
            };

            let cancelled = false;
            let allRenames = {};

            cancelBtn.addEventListener('click', () => { cancelled = true; });

            // ─── Main automated flow ───
            startBtn.addEventListener('click', async () => {
                if (BulkRenameModule._running) return;
                BulkRenameModule._running = true;
                cancelled = false;
                startBtn.style.display = 'none';
                cancelBtn.style.display = 'inline-flex';
                applyBtn.style.display = 'none';
                allRenames = {};

                try {
                    // PHASE 1: Fetch chat history
                    addLog('Fetching chat history...', '#58a6ff');
                    barEl.style.background = 'linear-gradient(90deg,#c9a0ff,#58a6ff)';
                    barEl.style.transition = 'none';
                    let shimmerPos = 10;
                    const shimmer = setInterval(() => {
                        shimmerPos = shimmerPos >= 85 ? 10 : shimmerPos + 0.5;
                        if (barEl) barEl.style.width = shimmerPos + '%';
                    }, 50);

                    const chats = await BulkRenameModule.fetchAllChats((loaded, total, msg) => {
                        if (phaseEl) phaseEl.textContent = msg;
                        if (statsEl) statsEl.textContent = loaded + ' chats';
                    });
                    clearInterval(shimmer);
                    barEl.style.transition = 'width 0.3s ease';

                    const eligible = BulkRenameModule.getEligibleChats();
                    addLog(`Loaded ${chats.length} chats (${eligible.length} eligible for renaming)`, '#3fb950');
                    setProgress(100, 'Chat history loaded', eligible.length + ' eligible');
                    await sleep(300);

                    if (cancelled) throw new Error('Cancelled');
                    if (eligible.length === 0) { addLog('No eligible chats found.', '#d29922'); throw new Error('No chats to rename'); }

                    // PHASE 2: Send to Claude API in batches
                    const BATCH = 75;
                    const totalBatches = Math.ceil(eligible.length / BATCH);
                    const orgId = await ClaudeAPI.getOrgId();
                    if (!orgId) throw new Error('Org ID not available');

                    barEl.style.background = 'linear-gradient(90deg,#c9a0ff,#58a6ff)';
                    addLog(`Sending ${totalBatches} batch${totalBatches > 1 ? 'es' : ''} to Claude for analysis...`, '#58a6ff');

                    for (let b = 0; b < totalBatches; b++) {
                        if (cancelled) throw new Error('Cancelled');
                        const batch = eligible.slice(b * BATCH, (b + 1) * BATCH);
                        const batchLabel = totalBatches > 1 ? ` (batch ${b + 1}/${totalBatches})` : '';
                        setProgress(10 + (b / totalBatches) * 60, `Asking Claude for suggestions${batchLabel}...`, `${batch.length} chats`);
                        addLog(`Batch ${b + 1}: sending ${batch.length} chats to Claude...`, '#c9a0ff');

                        const promptText = BulkRenameModule.buildPrompt(batch);
                        let lastChunkLen = 0;

                        const responseText = await BulkRenameModule.sendToClaudeAPI(orgId, promptText, (partial) => {
                            // Show streaming progress
                            if (partial.length - lastChunkLen > 200) {
                                lastChunkLen = partial.length;
                                if (statusEl) statusEl.textContent = `Receiving... ${partial.length} chars`;
                            }
                        });

                        addLog(`Batch ${b + 1}: received ${responseText.length} chars`, '#787890');

                        // Parse response
                        try {
                            const batchRenames = BulkRenameModule.parseJSON(responseText);
                            const count = Object.keys(batchRenames).length;
                            Object.assign(allRenames, batchRenames);
                            addLog(`Batch ${b + 1}: ${count} renames parsed (${Object.keys(allRenames).length} total)`, '#3fb950');
                        } catch (e) {
                            addLog(`Batch ${b + 1}: parse failed - ${e.message}`, '#f85149');
                            addLog(`Raw response start: ${responseText.substring(0, 200)}...`, '#d29922');
                        }

                        if (statusEl) statusEl.textContent = '';

                        // Brief pause between batches
                        if (b < totalBatches - 1) await sleep(500);
                    }

                    if (cancelled) throw new Error('Cancelled');

                    // PHASE 3: Show results
                    const renameCount = Object.keys(allRenames).length;
                    if (renameCount === 0) {
                        setProgress(100, 'No renames suggested', '');
                        barEl.style.background = 'linear-gradient(90deg,#d29922,#58a6ff)';
                        addLog('Claude did not suggest any renames. Your chat names may already be good!', '#d29922');
                        cancelBtn.style.display = 'none';
                        startBtn.style.display = 'inline-flex';
                        startBtn.textContent = 'Try Again';
                        BulkRenameModule._running = false;
                        return;
                    }

                    setProgress(80, `${renameCount} renames ready`, 'Review below');
                    barEl.style.background = 'linear-gradient(90deg,#3fb950,#58a6ff)';
                    addLog(`Done! ${renameCount} improved names suggested. Review and apply below.`, '#3fb950');
                    renderPreview(allRenames);
                    cancelBtn.style.display = 'none';
                    applyBtn.style.display = 'inline-flex';
                    applyBtn.textContent = `Apply ${renameCount} Renames`;
                    BulkRenameModule._running = false;

                } catch (e) {
                    barEl.style.transition = 'width 0.3s ease';
                    if (e.message === 'Cancelled') {
                        addLog('Cancelled by user.', '#d29922');
                        setProgress(0, 'Cancelled', '');
                        barEl.style.background = 'linear-gradient(90deg,#d29922,#58a6ff)';
                    } else {
                        console.error(LOG_TAG, 'Bulk rename error:', e);
                        addLog('Error: ' + e.message, '#f85149');
                        setProgress(0, 'Error', e.message);
                        barEl.style.background = 'linear-gradient(90deg,#f85149,#d29922)';
                    }
                    cancelBtn.style.display = 'none';
                    startBtn.style.display = 'inline-flex';
                    startBtn.textContent = 'Retry';
                    BulkRenameModule._running = false;
                }
            });

            // ─── Apply renames ───
            applyBtn.addEventListener('click', async () => {
                if (BulkRenameModule._running) return;
                BulkRenameModule._running = true;
                const count = Object.keys(allRenames).length;
                applyBtn.style.display = 'none';
                previewArea.textContent = '';
                barEl.style.background = 'linear-gradient(90deg,#3fb950,#58a6ff)';
                setProgress(0, 'Renaming...', `0 / ${count}`);
                addLog(`Applying ${count} renames...`, '#58a6ff');

                try {
                    const result = await BulkRenameModule.applyRenames(allRenames, (i, total, ok, fail, uuid, name, success) => {
                        const pct = Math.round((i / total) * 100);
                        setProgress(pct, `Renaming ${i}/${total}`, `${ok} ok, ${fail} fail`);
                        addLog(`${success ? '+' : 'x'} ${name}`, success ? '#3fb950' : '#f85149');
                    });
                    addLog(`Complete: ${result.ok} renamed, ${result.fail} failed.`, '#58a6ff');
                    setProgress(100, 'Complete!', `${result.ok} ok, ${result.fail} fail`);
                    if (phaseEl) phaseEl.style.color = '#3fb950';
                    barEl.style.background = result.fail > 0
                        ? 'linear-gradient(90deg,#d29922,#3fb950)'
                        : 'linear-gradient(90deg,#3fb950,#58a6ff)';
                    if (result.ok > 0) showToast(`${result.ok} chats renamed`, 3000, 'success');
                } catch (e) {
                    addLog('Error: ' + e.message, '#f85149');
                    setProgress(0, 'Error', e.message);
                    barEl.style.background = 'linear-gradient(90deg,#f85149,#d29922)';
                }
                BulkRenameModule._running = false;
            });

            } catch (e) {
                console.error(LOG_TAG, 'Bulk rename: FATAL error building modal', e);
                showToast('Bulk rename error: ' + e.message, 5000, 'error');
            }
        },

        // ─── #15: Settings Import/Export ───
        _exportSettings() {
            const data = { _cueVersion: VERSION, _exportDate: new Date().toISOString() };
            // Export all settings
            for (const key of Object.keys(Settings.defaults())) {
                data[key] = Settings.get(key);
            }
            // Export prompt library
            data._prompts = GM_getValue(PREFIX + '_prompts', null);
            data._categories = GM_getValue(PREFIX + '_categories', null);
            // Export group collapse states
            for (const name of ['appearance','behavior','notifications','sidebar','tools','features']) {
                data[`_group_${name}`] = GM_getValue(`${PREFIX}_group_${name}`, null);
            }
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `cue_settings_backup_${new Date().toISOString().slice(0,10)}.json`;
            a.click();
            URL.revokeObjectURL(a.href);
            showToast('Settings backed up', 2500, 'success');
        },

        _importSettings() {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json';
            input.addEventListener('change', async () => {
                const file = input.files[0];
                if (!file) return;
                try {
                    const text = await file.text();
                    const data = JSON.parse(text);
                    if (!data._cueVersion) { showToast('Invalid backup file', 3000, 'error'); return; }
                    // Restore settings
                    const defaults = Settings.defaults();
                    for (const key of Object.keys(defaults)) {
                        if (key in data) Settings.set(key, data[key]);
                    }
                    // Restore prompts
                    if (data._prompts) GM_setValue(PREFIX + '_prompts', data._prompts);
                    if (data._categories) GM_setValue(PREFIX + '_categories', data._categories);
                    // Restore group states
                    for (const name of ['appearance','behavior','notifications','sidebar','tools','features']) {
                        if (data[`_group_${name}`] != null) GM_setValue(`${PREFIX}_group_${name}`, data[`_group_${name}`]);
                    }
                    showToast(`Settings restored from ${data._cueVersion} backup, reloading...`, 2000, 'success');
                    setTimeout(() => location.reload(), 2000);
                } catch (e) {
                    showToast('Import failed: ' + e.message, 3000, 'error');
                }
            });
            input.click();
        },

        // ─── #17: Error Recovery Bar ───
        _errorRetryAction: null,
        showError(msg, retryFn = null) {
            const bar = $(`#${PREFIX}-error-bar`);
            const msgEl = $(`#${PREFIX}-error-msg`);
            const retryBtn = $(`#${PREFIX}-error-retry`);
            if (!bar || !msgEl) return;
            msgEl.textContent = msg;
            this._errorRetryAction = retryFn;
            if (retryBtn) retryBtn.style.display = retryFn ? 'inline-block' : 'none';
            bar.style.display = 'flex';
        },
        hideError() {
            const bar = $(`#${PREFIX}-error-bar`);
            if (bar) bar.style.display = 'none';
            this._errorRetryAction = null;
        },

        // ─── #12: Sidebar Search/Filter ───
        _filterSidebar(query) {
            const nav = document.querySelector('nav');
            if (!nav) return;
            const links = nav.querySelectorAll('a[href*="/chat/"]');
            const q = query.toLowerCase();
            let hidden = 0;
            links.forEach(link => {
                const container = link.closest('li') || link.closest('div') || link;
                if (!q) {
                    container.style.display = '';
                    return;
                }
                const text = link.textContent.toLowerCase();
                if (text.includes(q)) {
                    container.style.display = '';
                } else {
                    container.style.display = 'none';
                    hidden++;
                }
            });
            // Clear filter indicator
            const input = $(`#${PREFIX}-sidebar-search`);
            if (input) input.style.borderColor = q ? (hidden > 0 ? 'var(--cue-panel-warn)' : 'var(--cue-panel-success)') : 'var(--cue-panel-border)';
        },

        buildGearButton() {
            if ($(`#${PREFIX}-hover-strip`)) return;
            const strip = document.createElement('div');
            strip.id = PREFIX + '-hover-strip';
            document.body.appendChild(strip);

            // Re-append strip as last body child periodically
            // so Claude's dynamic UI elements don't stack on top
            // Also: resilience check — rebuild shadow host if React wiped it
            this._stripGuard = setInterval(() => {
                // Resilience: if shadow host was removed from DOM, rebuild entire panel
                if (this._host && !this._host.isConnected) {
                    console.warn(LOG_TAG, 'Shadow host detached — rebuilding panel');
                    this._host = null;
                    this._root = null;
                    this._panel = null;
                    this.build().then(() => this._wireHoverEvents());
                    return;
                }
                if (this._locked) return;
                const s = document.getElementById(PREFIX + '-hover-strip');
                if (s && s !== document.body.lastElementChild && !this._resizing) {
                    document.body.appendChild(s);
                }
            }, 3000);

            let hideTimeout = null;
            this._showPanel = () => {
                if (this._locked) return; // locked panel is always visible
                clearTimeout(hideTimeout);
                if (this._panel && this._panel.classList.contains(PREFIX + '-panel-hidden')) {
                    this._panel.classList.remove(PREFIX + '-panel-hidden');
                    this._panel.style.pointerEvents = 'auto';
                    this._visible = true;
                }
            };
            this._scheduleHide = () => {
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
            this._clearHideTimeout = () => { if (!this._locked) clearTimeout(hideTimeout); };

            strip.addEventListener('mouseenter', this._showPanel);
            strip.addEventListener('mouseleave', this._scheduleHide);
            this._wireHoverEvents();
        },

        _wireHoverEvents() {
            if (this._panel) {
                this._panel.addEventListener('mouseenter', () => this._clearHideTimeout?.());
                this._panel.addEventListener('mouseleave', () => this._scheduleHide?.());
            }
        },

        destroy() {
            clearInterval(this._refreshTimer);
            clearInterval(this._stripGuard);
            if (this._ac) this._ac.abort(); // Cancel all panel listeners
            document.body.classList.remove(PREFIX + '-panel-locked');
            if (this._host) { this._host.remove(); this._host = null; this._root = null; this._panel = null; }
        }
    };


    // =====================================================================
    //  MODULE: HISTORY PANEL (Full Sidebar Replacement)
    //  Integrated from ClaudeHistoryPanel v0.2.2
    // =====================================================================
    const HistoryPanelModule = {
        id: 'historyPanel',
        _initialized: false,

        init() {
            if (!Settings.get('historyPanel')) return;
            if (this._initialized) return;
            this._initialized = true;
            this._boot();
            EventBus.on('setting:historyPanel', (v) => {
                if (v && !this._initialized) { this._initialized = true; this._boot(); }
                if (!v) this._teardown();
            });
        },

        _boot() {
            // Run the CHP code in our scope, sharing infrastructure
            this._runCHP();
        },

        _teardown() {
            this._initialized = false;
            if (this._resilienceObserver) { this._resilienceObserver.disconnect(); this._resilienceObserver = null; }
            const sb = document.getElementById('chp-sidebar');
            if (sb) sb.remove();
            const btn = document.getElementById('chp-expand-btn');
            if (btn) btn.remove();
            const css = document.getElementById('chp-main-css');
            if (css) css.remove();
            const persist = document.getElementById('chp-persist-css');
            if (persist) persist.remove();
            document.body.classList.remove('chp-sidebar-open');
            document.querySelectorAll('[data-chp-native-hidden]').forEach(el => el.removeAttribute('data-chp-native-hidden'));
        },

        _runCHP() {
            // ── Self-contained CHP implementation (shares CUE's TrustedTypes) ──

// -- State --
  let allChats = [];
  let starredChats = [];
  let orgId = null;
  let isLoading = false;
  let sidebarCollapsed = GM_getValue('chp_collapsed', false);
  let sidebarWidth = parseInt(GM_getValue('chp_width', '280'));
  let chatsLoaded = false;
  let groupMode = GM_getValue('chp_group_mode', 'date'); // date | alpha | project | type
  const GROUP_MODES = ['date', 'alpha', 'project', 'type'];
  const GROUP_LABELS = { date: 'Date', alpha: 'A-Z', project: 'Project', type: 'Type' };
  let selectMode = false;
  let selectedIds = new Set();
  let lastClickedId = null; // for shift+click range select
  let collapsedGroups = new Set(JSON.parse(GM_getValue('chp_collapsed_groups', '[]')));
  const PAGE_SIZE = 80;
  const CACHE_KEY = 'chp_chat_cache';
  const CACHE_TS_KEY = 'chp_cache_ts';
  const ANIM_STAGGER = 18;

  // -- Persistent stylesheet (injected on <html>, survives React hydration) --
  const persistStyle = document.createElement('style');
  persistStyle.id = 'chp-persist-css';
  persistStyle.textContent = `
    #chp-sidebar { opacity: 0; transition: opacity 0.15s ease 0.05s; }
    #chp-sidebar.chp-ready { opacity: 1; }
    [data-chp-native-hidden] {
      display: none !important; width: 0 !important; max-width: 0 !important;
      overflow: hidden !important; visibility: hidden !important;
      position: absolute !important; pointer-events: none !important;
    }
  `;
  document.documentElement.appendChild(persistStyle);

  // -- Cache --
  function loadCache() {
    try { const r = localStorage.getItem(CACHE_KEY); return r ? JSON.parse(r) : []; }
    catch { return []; }
  }
  function saveCache(chats) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(chats));
      localStorage.setItem(CACHE_TS_KEY, Date.now().toString());
    } catch {}
  }

  // -- Navigation --
  // Claude.ai uses Next.js internal router. pushState+popstate does NOT trigger
  // React route changes. Use real page navigation for all internal links.
  // The sidebar re-injects instantly via the resilience observer after page load.
  function hardNav(href) {
    if (!href) return;
    if (href.startsWith('http') && !href.startsWith(location.origin)) {
      window.open(href, '_blank');
    } else {
      location.href = href;
    }
  }

  // -- API --
  async function getOrgId() {
    if (orgId) return orgId;
    try {
      const r = await fetch('/api/organizations', { credentials: 'include' });
      const d = await r.json();
      orgId = d?.[0]?.uuid || d?.[0]?.id;
      return orgId;
    } catch { return null; }
  }

  async function apiRenameChat(chatId, newName) {
    const oid = await getOrgId(); if (!oid) return false;
    try {
      const r = await fetch(`/api/organizations/${oid}/chat_conversations/${chatId}`, {
        method: 'PATCH', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName })
      });
      return r.ok;
    } catch { return false; }
  }

  async function apiDeleteChat(chatId) {
    const oid = await getOrgId(); if (!oid) return false;
    try {
      const r = await fetch(`/api/organizations/${oid}/chat_conversations/${chatId}`, {
        method: 'DELETE', credentials: 'include'
      });
      return r.ok;
    } catch { return false; }
  }

  // Local star overrides (persisted to GM storage) for when API fails
  let localStarOverrides = JSON.parse(GM_getValue('chp_local_stars', '{}'));

  function isEffectivelyStarred(chat) {
    const id = chat.uuid || chat.id;
    if (id in localStarOverrides) return localStarOverrides[id];
    return !!chat.is_starred;
  }

  function applyLocalStars() {
    allChats.forEach(c => {
      const id = c.uuid || c.id;
      if (id in localStarOverrides) c.is_starred = localStarOverrides[id];
    });
    starredChats = allChats.filter(c => c.is_starred);
  }

  async function apiToggleStar(chatId, starred) {
    const oid = await getOrgId();
    // Check if we've discovered the real star endpoint via interceptor
    const discoveredEndpoint = GM_getValue('chp_star_endpoint', '');
    if (oid && discoveredEndpoint) {
      try {
        const [method, pathTemplate] = discoveredEndpoint.split('|');
        const url = pathTemplate.replace('{oid}', oid).replace('{cid}', chatId);
        // Try with body first, then without
        for (const body of [JSON.stringify({ is_starred: starred }), '{}']) {
          try {
            const r = await fetch(url, {
              method, credentials: 'include',
              headers: { 'Content-Type': 'application/json' },
              body
            });
            if (r.ok) {
              delete localStarOverrides[chatId];
              GM_setValue('chp_local_stars', JSON.stringify(localStarOverrides));
              return true;
            }
          } catch {}
        }
      } catch {}
    }
    // Apply locally and persist (no API probing to avoid console spam)
    localStarOverrides[chatId] = starred;
    GM_setValue('chp_local_stars', JSON.stringify(localStarOverrides));
    const chat = allChats.find(c => (c.uuid || c.id) === chatId);
    if (chat) chat.is_starred = starred;
    return 'local';
  }

  // -- Toast --
  function toast(msg, duration = 2200) {
    const existing = document.querySelector('.chp-toast');
    if (existing) existing.remove();
    const t = document.createElement('div');
    t.className = 'chp-toast';
    t.textContent = msg;
    document.body.appendChild(t);
    requestAnimationFrame(() => t.classList.add('chp-toast-show'));
    setTimeout(() => {
      t.classList.remove('chp-toast-show');
      t.classList.add('chp-toast-hide');
      setTimeout(() => t.remove(), 350);
    }, duration);
  }

  // -- Context menu --
  let activeCtx = null;
  function closeCtx() { if (activeCtx) { activeCtx.remove(); activeCtx = null; } }

  function showCtxMenu(e, chatId) {
    e.preventDefault(); e.stopPropagation();
    closeCtx(); closeUserMenu();
    const chat = allChats.find(c => (c.uuid || c.id) === chatId);
    if (!chat) return;
    const isStarred = chat.is_starred;
    const menu = document.createElement('div');
    menu.className = 'chp-ctx';
    menu.innerHTML = safeHTML(`
      <button class="chp-ctx-item" data-action="rename">${ICONS.rename}<span>Rename</span></button>
      <button class="chp-ctx-item" data-action="star">${isStarred ? ICONS.starFill : ICONS.star}<span>${isStarred ? 'Unstar' : 'Star'}</span></button>
      <button class="chp-ctx-item" data-action="copy">${ICONS.link}<span>Copy link</span></button>
      <div class="chp-ctx-sep"></div>
      <button class="chp-ctx-item chp-danger" data-action="delete">${ICONS.trash}<span>Delete</span></button>
    `);
    const btn = e.currentTarget || e.target;
    const rect = btn.getBoundingClientRect();
    document.body.appendChild(menu);
    const mRect = menu.getBoundingClientRect();
    let top = rect.bottom + 4, left = rect.left;
    if (top + mRect.height > window.innerHeight - 8) top = rect.top - mRect.height - 4;
    if (left + mRect.width > window.innerWidth - 8) left = window.innerWidth - mRect.width - 8;
    menu.style.top = top + 'px'; menu.style.left = left + 'px';
    activeCtx = menu;

    menu.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const action = btn.dataset.action;
        closeCtx();
        if (action === 'rename') {
          startRename(chatId, chat.name || 'Untitled');
        } else if (action === 'star') {
          const newVal = !isStarred;
          const ok = await apiToggleStar(chatId, newVal);
          if (ok) {
            chat.is_starred = newVal;
            starredChats = allChats.filter(c => c.is_starred);
            saveCache(allChats); renderChats(getSearchValue());
            const suffix = ok === 'local' ? ' (local)' : '';
            toast((newVal ? 'Starred' : 'Unstarred') + suffix);
          }
        } else if (action === 'copy') {
          navigator.clipboard.writeText(`https://claude.ai/chat/${chatId}`)
            .then(() => toast('Link copied')).catch(() => toast('Copy failed'));
        } else if (action === 'delete') {
          const ok = await apiDeleteChat(chatId);
          if (ok) {
            allChats = allChats.filter(c => (c.uuid || c.id) !== chatId);
            starredChats = allChats.filter(c => c.is_starred);
            selectedIds.delete(chatId);
            saveCache(allChats); renderChats(getSearchValue());
            toast('Chat deleted');
            if (location.pathname === `/chat/${chatId}`) hardNav('/new');
          } else toast('Delete failed');
        }
      });
    });
  }

  function startRename(chatId, currentName) {
    const item = document.querySelector(`[data-chp-nav="${chatId}"]`);
    if (!item) return;
    const nameEl = item.querySelector('.chp-chat-name');
    if (!nameEl) return;
    const input = document.createElement('input');
    input.className = 'chp-rename-input';
    input.value = currentName;
    nameEl.replaceWith(input);
    input.focus(); input.select();
    let finished = false;
    const finish = async (save) => {
      if (finished) return; finished = true;
      const newName = input.value.trim();
      if (save && newName && newName !== currentName) {
        const ok = await apiRenameChat(chatId, newName);
        if (ok) {
          const chat = allChats.find(c => (c.uuid || c.id) === chatId);
          if (chat) { chat.name = newName; saveCache(allChats); }
          toast('Renamed');
        } else toast('Rename failed');
      }
      renderChats(getSearchValue());
    };
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); finish(true); }
      if (e.key === 'Escape') { e.preventDefault(); finish(false); }
    });
    input.addEventListener('blur', () => finish(true));
  }

  function getSearchValue() {
    return document.getElementById('chp-search-input')?.value?.trim() || '';
  }

  // -- Global listeners (registered ONCE) --
  let globalListenersAttached = false;
  function attachGlobalListeners() {
    if (globalListenersAttached) return;
    globalListenersAttached = true;

    document.addEventListener('click', e => {
      if (activeCtx && !activeCtx.contains(e.target)) closeCtx();
      if (activeUserMenu && !activeUserMenu.contains(e.target) && !e.target.closest('#chp-userbar')) closeUserMenu();
    });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        closeCtx(); closeUserMenu();
        if (selectMode) {
          selectMode = false; selectedIds.clear(); lastClickedId = null;
          document.body.classList.remove('chp-select-mode');
          renderChats(getSearchValue()); updateBulkBar();
          return;
        }
        const wrap = document.getElementById('chp-search-wrap');
        if (wrap?.classList.contains('chp-show')) {
          wrap.classList.remove('chp-show');
          const inp = document.getElementById('chp-search-input');
          if (inp) inp.value = '';
          updateSearchClear();
          renderChats();
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        const wrap = document.getElementById('chp-search-wrap');
        if (wrap) {
          if (!wrap.classList.contains('chp-show')) wrap.classList.add('chp-show');
          const inp = document.getElementById('chp-search-input');
          if (inp) { inp.focus(); inp.select(); }
        }
      }
    });
  }

  // -- User menu --
  let activeUserMenu = null;
  function closeUserMenu() { if (activeUserMenu) { activeUserMenu.remove(); activeUserMenu = null; } }

  function showUserMenu(e) {
    e.preventDefault(); e.stopPropagation();
    if (activeUserMenu) { closeUserMenu(); return; }
    closeCtx();
    const menu = document.createElement('div');
    menu.className = 'chp-user-menu';
    menu.innerHTML = safeHTML(`
      <a class="chp-ctx-item" href="/settings">${ICONS.settings}<span>Settings</span></a>
      <a class="chp-ctx-item" href="/settings/profile">${ICONS.user}<span>Profile</span></a>
      <div class="chp-ctx-sep"></div>
      <a class="chp-ctx-item" href="/settings/billing">${ICONS.plans}<span>Plans & billing</span></a>
      <a class="chp-ctx-item" href="/downloads">${ICONS.download}<span>Apps & extensions</span></a>
      <div class="chp-ctx-sep"></div>
      <a class="chp-ctx-item" href="https://support.anthropic.com" target="_blank" rel="noopener">${ICONS.help}<span>Help & support</span></a>
      <a class="chp-ctx-item" href="https://www.anthropic.com" target="_blank" rel="noopener">${ICONS.info}<span>About Anthropic</span></a>
      <div class="chp-ctx-sep"></div>
      <button class="chp-ctx-item chp-danger" data-action="logout">${ICONS.logout}<span>Log out</span></button>
    `);
    const bar = document.getElementById('chp-userbar');
    if (!bar) return;
    const rect = bar.getBoundingClientRect();
    document.body.appendChild(menu);
    const mRect = menu.getBoundingClientRect();
    menu.style.left = (rect.left + 4) + 'px';
    menu.style.bottom = (window.innerHeight - rect.top + 4) + 'px';
    if (rect.left + mRect.width > window.innerWidth - 8)
      menu.style.left = (window.innerWidth - mRect.width - 8) + 'px';
    activeUserMenu = menu;

    // Internal links: just let them be normal <a> tags (browser navigates)
    // Only wire the logout button
    menu.querySelector('[data-action="logout"]')?.addEventListener('click', () => {
      closeUserMenu();
      fetch('/api/logout', { method: 'POST', credentials: 'include' })
        .finally(() => { location.href = '/login'; });
    });
    // Close menu on any link click
    menu.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => closeUserMenu());
    });
  }

  function updateSearchClear() {
    const inp = document.getElementById('chp-search-input');
    document.getElementById('chp-search-clear')?.classList.toggle('chp-vis', !!(inp && inp.value));
  }

  // -- Icons --
  const ICONS = {
    claude: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 68 16" height="16" fill="currentColor" aria-label="Claude"><path d="M7.98 15.73C6.50667 15.73 5.17667 15.4367 3.99 14.85C2.81 14.2567 1.88 13.4167 1.2 12.33C0.526669 11.2367 0.190002 9.96334 0.190002 8.51001C0.190002 7.01001 0.526669 5.67334 1.2 4.50001C1.87334 3.32668 2.8 2.41668 3.98 1.77001C5.16667 1.11668 6.49334 0.790009 7.96 0.790009C8.88667 0.790009 9.81667 0.896676 10.75 1.11001C11.69 1.32334 12.5033 1.64001 13.19 2.06001V5.36001H12.29C12.05 4.22668 11.5867 3.36334 10.9 2.77001C10.2133 2.17668 9.24 1.88001 7.98 1.88001C6.85334 1.88001 5.91334 2.15334 5.16 2.70001C4.40667 3.24001 3.84667 3.98334 3.48 4.93001C3.12 5.87001 2.94 6.94668 2.94 8.16001C2.94 9.37334 3.14667 10.4733 3.56 11.46C3.97334 12.44 4.57667 13.2167 5.37 13.79C6.16334 14.3567 7.11 14.64 8.21 14.64C8.97667 14.64 9.63667 14.4733 10.19 14.14C10.75 13.8 11.2167 13.3533 11.59 12.8C11.97 12.2467 12.3367 11.5667 12.69 10.76H13.63L12.99 14.43C12.35 14.8567 11.5733 15.18 10.66 15.4C9.75334 15.62 8.86 15.73 7.98 15.73ZM15.15 14.63C15.4833 14.5833 15.7433 14.53 15.93 14.47C16.1167 14.41 16.2633 14.3167 16.37 14.19C16.4767 14.0567 16.53 13.8733 16.53 13.64V2.96001L15.15 2.31001V1.65001L18.12 0.26001H18.91V13.64C18.91 13.8733 18.9633 14.0567 19.07 14.19C19.1767 14.3167 19.3233 14.41 19.51 14.47C19.6967 14.53 19.96 14.5833 20.3 14.63V15.5H15.15V14.63ZM24.44 15.73C23.8867 15.73 23.39 15.6167 22.95 15.39C22.51 15.1567 22.1667 14.8367 21.92 14.43C21.68 14.0233 21.56 13.5567 21.56 13.03C21.56 12.2633 21.7967 11.6233 22.27 11.11C22.75 10.5967 23.47 10.2033 24.43 9.93001L27.87 8.96001V7.56001C27.87 6.85334 27.7033 6.31668 27.37 5.95001C27.0433 5.58334 26.5633 5.40001 25.93 5.40001C25.37 5.40001 24.93 5.57668 24.61 5.93001C24.2967 6.27668 24.14 6.75668 24.14 7.37001V8.35001H22.47C22.2833 8.23001 22.1367 8.06334 22.03 7.85001C21.93 7.63668 21.88 7.40334 21.88 7.15001C21.88 6.67668 22.06 6.24001 22.42 5.84001C22.78 5.43334 23.2633 5.11334 23.87 4.88001C24.4833 4.64668 25.16 4.53001 25.9 4.53001C26.8133 4.53001 27.5933 4.67334 28.24 4.96001C28.8933 5.24668 29.39 5.66668 29.73 6.22001C30.0767 6.77334 30.25 7.43668 30.25 8.21001V13.5C30.25 13.7333 30.29 13.9133 30.37 14.04C30.45 14.1667 30.5867 14.2667 30.78 14.34C30.98 14.4133 31.2633 14.4767 31.63 14.53V15.39C31.0967 15.5967 30.5633 15.7 30.03 15.7C29.4367 15.7 28.9567 15.56 28.59 15.28C28.23 15 28.0067 14.6 27.92 14.08C27.44 14.62 26.9067 15.03 26.32 15.31C25.7333 15.59 25.1067 15.73 24.44 15.73ZM25.62 14.13C26.0067 14.13 26.3967 14.0433 26.79 13.87C27.1833 13.69 27.5433 13.4433 27.87 13.13V9.87001L25.43 10.61C24.9233 10.7567 24.5433 10.99 24.29 11.31C24.0433 11.6233 23.92 12.0267 23.92 12.52C23.92 12.8267 23.9933 13.1033 24.14 13.35C24.2867 13.59 24.49 13.78 24.75 13.92C25.01 14.06 25.3 14.13 25.62 14.13ZM36.56 15.73C35.48 15.73 34.68 15.4467 34.16 14.88C33.6467 14.3133 33.39 13.53 33.39 12.53V6.91001L32.01 6.37001V5.70001L34.98 4.53001H35.77V12.12C35.77 12.7533 35.9233 13.2233 36.23 13.53C36.5433 13.8367 37.0133 13.99 37.64 13.99C38.0533 13.99 38.4833 13.8967 38.93 13.71C39.3833 13.5167 39.8 13.27 40.18 12.97V6.91001L38.8 6.37001V5.70001L41.77 4.53001H42.56V12.91C42.56 13.17 42.6133 13.37 42.72 13.51C42.8333 13.65 42.9833 13.7533 43.17 13.82C43.3567 13.88 43.6167 13.9333 43.95 13.98V14.84L40.97 15.69H40.18V13.96C39.6667 14.4933 39.0867 14.9233 38.44 15.25C37.8 15.57 37.1733 15.73 36.56 15.73ZM49.61 15.73C48.7367 15.73 47.9567 15.51 47.27 15.07C46.5833 14.6233 46.0467 14.02 45.66 13.26C45.28 12.5 45.09 11.66 45.09 10.74C45.09 9.56668 45.3167 8.51001 45.77 7.57001C46.2233 6.63001 46.8733 5.89001 47.72 5.35001C48.5733 4.80334 49.5767 4.53001 50.73 4.53001C51.0767 4.53001 51.43 4.56668 51.79 4.64001C52.15 4.70668 52.4967 4.81001 52.83 4.95001V2.96001L51.45 2.31001V1.65001L54.42 0.26001H55.21V12.91C55.21 13.17 55.2633 13.37 55.37 13.51C55.4833 13.65 55.6333 13.7533 55.82 13.82C56.0067 13.88 56.2667 13.9333 56.6 13.98V14.84L53.62 15.69H52.83V14.39C52.3833 14.8167 51.8867 15.1467 51.34 15.38C50.7933 15.6133 50.2167 15.73 49.61 15.73ZM50.6 14.12C50.9867 14.12 51.3733 14.0467 51.76 13.9C52.1467 13.7467 52.5033 13.5367 52.83 13.27V6.38001C52.2567 5.92001 51.6167 5.69001 50.91 5.69001C50.1767 5.69001 49.5567 5.89001 49.05 6.29001C48.55 6.68334 48.1767 7.21334 47.93 7.88001C47.69 8.54668 47.57 9.28334 47.57 10.09C47.57 10.8567 47.6767 11.5433 47.89 12.15C48.11 12.7567 48.4467 13.2367 48.9 13.59C49.3533 13.9433 49.92 14.12 50.6 14.12ZM62.93 15.73C61.9433 15.73 61.0533 15.4967 60.26 15.03C59.4733 14.5567 58.8567 13.9033 58.41 13.07C57.9633 12.2367 57.74 11.3 57.74 10.26C57.74 9.18001 57.9667 8.20334 58.42 7.33001C58.88 6.45668 59.51 5.77334 60.31 5.28001C61.1167 4.78001 62.0167 4.53001 63.01 4.53001C63.77 4.53001 64.4667 4.68668 65.1 5.00001C65.7333 5.31334 66.2567 5.76001 66.67 6.34001C67.09 6.92001 67.37 7.59001 67.51 8.35001L60.14 10.66C60.3333 11.62 60.7267 12.38 61.32 12.94C61.92 13.4933 62.67 13.77 63.57 13.77C64.31 13.77 64.9767 13.5733 65.57 13.18C66.17 12.78 66.7 12.18 67.16 11.38L67.93 11.63C67.7633 12.4433 67.44 13.16 66.96 13.78C66.4867 14.4 65.9 14.88 65.2 15.22C64.5067 15.56 63.75 15.73 62.93 15.73ZM64.95 8.03001C64.8567 7.55668 64.6933 7.14001 64.46 6.78001C64.2267 6.42001 63.94 6.14001 63.6 5.94001C63.2667 5.74001 62.9033 5.64001 62.51 5.64001C62.01 5.64001 61.57 5.79334 61.19 6.10001C60.8167 6.40001 60.5267 6.83001 60.32 7.39001C60.1133 7.95001 60.01 8.60001 60.01 9.34001C60.01 9.46668 60.0133 9.56334 60.02 9.63001L64.95 8.03001Z"></path></svg>',
    plus: '<svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor"><path d="M10 3C10.4142 3 10.75 3.33579 10.75 3.75V9.25H16.25C16.6642 9.25 17 9.58579 17 10C17 10.3882 16.7051 10.7075 16.3271 10.7461L16.25 10.75H10.75V16.25C10.75 16.6642 10.4142 17 10 17C9.58579 17 9.25 16.6642 9.25 16.25V10.75H3.75C3.33579 10.75 3 10.4142 3 10C3 9.58579 3.33579 9.25 3.75 9.25H9.25V3.75C9.25 3.33579 9.58579 3 10 3Z"></path></svg>',
    search: '<svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor"><path d="M8.5 2C12.0899 2 15 4.91015 15 8.5C15 10.1149 14.4094 11.5908 13.4346 12.7275L17.8535 17.1465L17.918 17.2246C18.0461 17.4187 18.0244 17.6827 17.8535 17.8535C17.6827 18.0244 17.4187 18.0461 17.2246 17.918L17.1465 17.8535L12.7275 13.4346C11.5908 14.4094 10.1149 15 8.5 15C4.91015 15 2 12.0899 2 8.5C2 4.91015 4.91015 2 8.5 2ZM8.5 3C5.46243 3 3 5.46243 3 8.5C3 11.5376 5.46243 14 8.5 14C11.5376 14 14 11.5376 14 8.5C14 5.46243 11.5376 3 8.5 3Z"></path></svg>',
    customize: '<svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor"><path d="M12.5 3C13.3284 3 14 3.67157 14 4.5V6H14.5C16.433 6 18 7.567 18 9.5V15.5C18 16.3284 17.3284 17 16.5 17H3.5C2.72334 17 2.08461 16.4097 2.00781 15.6533L2 15.5V9.5C2 7.567 3.567 6 5.5 6H6V4.5C6 3.67157 6.67157 3 7.5 3H12.5ZM3 15.5L3.00977 15.6006C3.05629 15.8286 3.25829 16 3.5 16H16.5C16.7761 16 17 15.7761 17 15.5V12H13V12.5C13 12.7761 12.7761 13 12.5 13C12.2239 13 12 12.7761 12 12.5V12H8V12.5C8 12.7761 7.77614 13 7.5 13C7.22386 13 7 12.7761 7 12.5V12H3V15.5ZM5.5 7C4.11929 7 3 8.11929 3 9.5V11H7V10.5C7 10.2239 7.22386 10 7.5 10C7.77614 10 8 10.2239 8 10.5V11H12V10.5C12 10.2239 12.2239 10 12.5 10C12.7761 10 13 10.2239 13 10.5V11H17V9.5C17 8.11929 15.8807 7 14.5 7H5.5ZM7.5 4C7.22386 4 7 4.22386 7 4.5V6H13V4.5C13 4.22386 12.7761 4 12.5 4H7.5Z"></path></svg>',
    chats: '<svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor"><path d="M8.99962 2C12.3133 2 14.9996 4.68629 14.9996 8C14.9996 11.3137 12.3133 14 8.99962 14H2.49962C2.30105 13.9998 2.12113 13.8821 2.04161 13.7002C1.96224 13.5181 1.99835 13.3058 2.1334 13.1602L3.93516 11.2178C3.34317 10.2878 2.99962 9.18343 2.99962 8C2.99962 4.68643 5.68609 2.00022 8.99962 2ZM8.99962 3C6.23838 3.00022 3.99961 5.23871 3.99961 8C3.99961 9.11212 4.36265 10.1386 4.97618 10.9688C5.11884 11.1621 5.1035 11.4293 4.94004 11.6055L3.64512 13H8.99962C11.761 13 13.9996 10.7614 13.9996 8C13.9996 5.23858 11.761 3 8.99962 3Z"></path><path d="M16.5445 9.72754C16.4182 9.53266 16.1678 9.44648 15.943 9.53418C15.7183 9.62215 15.5932 9.85502 15.6324 10.084L15.7369 10.3955C15.9073 10.8986 16.0006 11.438 16.0006 12C16.0006 13.1123 15.6376 14.1386 15.024 14.9687C14.8811 15.1621 14.8956 15.4302 15.0592 15.6064L16.3531 17H11.0006C9.54519 17 8.23527 16.3782 7.32091 15.3848L7.07091 15.1103C6.88996 14.9645 6.62535 14.9606 6.43907 15.1143C6.25267 15.2682 6.20668 15.529 6.31603 15.7344L6.58458 16.0625C7.68048 17.253 9.25377 18 11.0006 18H17.5006C17.6991 17.9998 17.8791 17.8822 17.9586 17.7002C18.038 17.5181 18.0018 17.3058 17.8668 17.1602L16.0631 15.2178C16.6554 14.2876 17.0006 13.1837 17.0006 12C17.0006 11.3271 16.8891 10.6792 16.6842 10.0742L16.5445 9.72754Z"></path></svg>',
    projects: '<svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor"><path d="M15.8198 7C16.6885 7.00025 17.3624 7.73158 17.3178 8.57617L17.2993 8.74707L16.1332 15.7471C16.0126 16.4699 15.3865 16.9996 14.6538 17H5.34711C4.6142 16.9998 3.98833 16.47 3.86762 15.7471L2.7016 8.74707C2.54922 7.83277 3.25418 7 4.18109 7H15.8198ZM4.18109 8C3.87216 8 3.63722 8.27731 3.68793 8.58203L4.85394 15.582C4.89413 15.8229 5.10291 15.9998 5.34711 16H14.6538C14.8978 15.9996 15.1068 15.8228 15.1469 15.582L16.3129 8.58203L16.3188 8.46973C16.3036 8.21259 16.0899 8.00023 15.8198 8H4.18109Z"></path><path d="M16.0004 5.5C16.0004 5.224 15.7764 5.00024 15.5004 5H4.50043C4.22428 5 4.00043 5.22386 4.00043 5.5C4.00043 5.77614 4.22428 6 4.50043 6H15.5004C15.7764 5.99976 16.0004 5.776 16.0004 5.5Z"></path><path d="M14.5004 3.5C14.5004 3.224 14.2764 3.00024 14.0004 3H6.00043C5.72428 3 5.50043 3.22386 5.50043 3.5C5.50043 3.77614 5.72428 4 6.00043 4H14.0004C14.2764 3.99976 14.5004 3.776 14.5004 3.5Z"></path></svg>',
    dots: '<svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor"><path d="M6 10C6 10.8284 5.32843 11.5 4.5 11.5C3.67157 11.5 3 10.8284 3 10C3 9.17157 3.67157 8.5 4.5 8.5C5.32843 8.5 6 9.17157 6 10ZM11.5 10C11.5 10.8284 10.8284 11.5 10 11.5C9.17157 11.5 8.5 10.8284 8.5 10C8.5 9.17157 9.17157 8.5 10 8.5C10.8284 8.5 11.5 9.17157 11.5 10ZM15.5 11.5C16.3284 11.5 17 10.8284 17 10C17 9.17157 16.3284 8.5 15.5 8.5C14.6716 8.5 14 9.17157 14 10C14 10.8284 14.6716 11.5 15.5 11.5Z"></path></svg>',
    download: '<svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor"><path d="M16.5 13C16.7761 13 17 13.2239 17 13.5V15.5C17 16.3284 16.3284 17 15.5 17H4.5C3.67157 17 3 16.3284 3 15.5V13.5C3 13.2239 3.22386 13 3.5 13C3.77614 13 4 13.2239 4 13.5V15.5C4 15.7761 4.22386 16 4.5 16H15.5C15.7761 16 16 15.7761 16 15.5V13.5C16 13.2239 16.2239 13 16.5 13ZM10 3C10.2761 3 10.5 3.22386 10.5 3.5V12.1855L13.626 8.66797C13.8094 8.46166 14.1256 8.44275 14.332 8.62598C14.5383 8.80936 14.5573 9.12563 14.374 9.33203L10.374 13.832L10.2949 13.9033C10.21 13.9654 10.107 14 10 14C9.85718 14 9.72086 13.9388 9.62598 13.832L5.62598 9.33203L5.56738 9.25C5.45079 9.04872 5.48735 8.78653 5.66797 8.62598C5.84854 8.46567 6.1127 8.46039 6.29883 8.59961L6.37402 8.66797L9.5 12.1855V3.5C9.5 3.22386 9.72386 3 10 3Z"></path></svg>',
    chevronUp: '<svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor"><path d="M5.293 12.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L10 9.414l-3.293 3.293a1 1 0 01-1.414 0z"/></svg>',
    collapse: '<svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M14 4l-4 6 4 6"/><line x1="6" y1="4" x2="6" y2="16"/></svg>',
    expand: '<svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M8 4l4 6-4 6"/><line x1="16" y1="4" x2="16" y2="16"/></svg>',
    star: '<svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M10 2l2.4 5.2L18 8l-4 3.8 1 5.7L10 14.6 4.9 17.5l1-5.7L2 8l5.6-.8Z"/></svg>',
    starFill: '<svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor"><path d="M10 2l2.4 5.2L18 8l-4 3.8 1 5.7L10 14.6 4.9 17.5l1-5.7L2 8l5.6-.8Z"/></svg>',
    starAccent: '<svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor" style="color:hsl(var(--accent-main-100))"><path d="M10 2l2.4 5.2L18 8l-4 3.8 1 5.7L10 14.6 4.9 17.5l1-5.7L2 8l5.6-.8Z"/></svg>',
    rename: '<svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M13.5 3.5l3 3L6 17H3v-3L13.5 3.5z"/></svg>',
    trash: '<svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M4 6h12M8 6V4h4v2M6 6v10a1 1 0 001 1h6a1 1 0 001-1V6"/></svg>',
    link: '<svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M8 12l4-4M11 7h2a4 4 0 010 8h-2M9 15H7a4 4 0 010-8h2"/></svg>',
    settings: '<svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="10" cy="10" r="2.5"/><path d="M10 2v2M10 16v2M17.07 5l-1.73 1M4.66 14l-1.73 1M18 10h-2M4 10H2M17.07 15l-1.73-1M4.66 6L2.93 5"/></svg>',
    user: '<svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="10" cy="7" r="3.5"/><path d="M3 17.5c0-3.5 3-6 7-6s7 2.5 7 6"/></svg>',
    help: '<svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="10" cy="10" r="7.5"/><path d="M7.5 7.5a2.5 2.5 0 114 2c-.7.5-1.5 1-1.5 2M10 14.5v.01"/></svg>',
    plans: '<svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M3 5h14M3 10h14M3 15h10"/></svg>',
    info: '<svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="10" cy="10" r="7.5"/><path d="M10 9v5M10 6.5v.01"/></svg>',
    logout: '<svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M7 17H4a1 1 0 01-1-1V4a1 1 0 011-1h3M13 14l4-4-4-4M17 10H7"/></svg>',
    refresh: '<svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M3 10a7 7 0 0112.9-3.7M17 10a7 7 0 01-12.9 3.7"/><path d="M16 2v4.3h-4.3M4 18v-4.3h4.3"/></svg>',
    selectMode: '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><rect x="1.5" y="1.5" width="5" height="5" rx="1"/><rect x="1.5" y="9.5" width="5" height="5" rx="1"/><path d="M9 4h5M9 12h5"/></svg>',
    chevronDown: '<svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor"><path d="M4 6l4 4 4-4"/></svg>',
    clear: '<svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor"><path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z"/></svg>',
  };

  // -- CSS --
  const CSS = `
    :root {
      --chp-accent: hsl(var(--accent-main-100, 210 100% 60%));
      --chp-accent-dim: hsl(var(--accent-main-100, 210 100% 60%) / 0.12);
      --chp-accent-glow: hsl(var(--accent-main-100, 210 100% 60%) / 0.06);
      --chp-w: ${sidebarWidth}px;
    }
    #chp-sidebar, #chp-sidebar * { visibility: visible !important; pointer-events: auto !important; }
    #chp-sidebar {
      position: fixed !important; top: 0; left: 0; bottom: 0; z-index: 40;
      width: var(--chp-w) !important; max-width: var(--chp-w) !important;
      display: flex !important; flex-direction: column;
      background: linear-gradient(175deg, hsl(var(--bg-100) / 0.92) 0%, hsl(var(--bg-200) / 0.65) 100%);
      backdrop-filter: blur(24px) saturate(1.3);
      -webkit-backdrop-filter: blur(24px) saturate(1.3);
      border-right: 1px solid hsl(var(--border-300) / 0.5);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
      transition: transform 0.25s cubic-bezier(0.4,0,0.2,1), width 0.25s cubic-bezier(0.4,0,0.2,1);
      overflow: hidden;
    }
    #chp-sidebar.chp-collapsed {
      width: 0 !important; max-width: 0 !important;
      border-right-color: transparent; pointer-events: none;
    }
    body { transition: padding-left 0.25s cubic-bezier(0.4,0,0.2,1); }
    body.chp-sidebar-open { padding-left: var(--chp-w) !important; }
    #chp-expand-btn {
      position: fixed; top: 10px; left: 10px; z-index: 50;
      width: 34px; height: 34px; border-radius: 10px; border: none;
      background: hsl(var(--bg-200) / 0.8); backdrop-filter: blur(12px);
      cursor: pointer; display: none; align-items: center; justify-content: center;
      color: hsl(var(--text-400)); transition: all 0.15s;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
    }
    #chp-expand-btn:hover { background: hsl(var(--bg-300)); color: hsl(var(--text-100)); }
    #chp-expand-btn.chp-visible { display: flex; }
    .chp-topbar {
      display: flex; align-items: center; justify-content: space-between;
      padding: 10px 10px 6px 14px; flex-shrink: 0;
    }
    .chp-logo { display: flex; align-items: center; gap: 6px; }
    .chp-logo a { display: flex; color: hsl(var(--text-100)); text-decoration: none; transition: opacity 0.15s; }
    .chp-logo a:hover { opacity: 0.75; }
    .chp-logo svg { height: 16px; flex-shrink: 0; }
    .chp-topbar-actions { display: flex; align-items: center; gap: 2px; }
    .chp-icon-btn {
      width: 30px; height: 30px; border-radius: 8px; border: none;
      background: transparent; cursor: pointer; display: flex;
      align-items: center; justify-content: center;
      color: hsl(var(--text-400)); transition: all 0.15s;
    }
    .chp-icon-btn:hover { color: hsl(var(--text-100)); background: hsl(var(--bg-300) / 0.5); }
    .chp-icon-btn:active { transform: scale(0.92); }
    .chp-new-btn {
      display: flex; align-items: center; gap: 10px; width: calc(100% - 16px);
      margin: 4px 8px 2px; padding: 8px 12px; border-radius: 10px; border: none;
      background: var(--chp-accent-dim); color: hsl(var(--text-100)); cursor: pointer;
      font-size: 13.5px; font-weight: 500; font-family: inherit;
      transition: all 0.15s; text-align: left; text-decoration: none;
    }
    .chp-new-btn:hover { background: hsl(var(--accent-main-100) / 0.18); transform: translateY(-0.5px); }
    .chp-new-btn:active { transform: scale(0.985); }
    .chp-new-btn .chp-plus-circle {
      display: flex; align-items: center; justify-content: center;
      width: 22px; height: 22px; border-radius: 50%;
      background: var(--chp-accent); color: hsl(var(--bg-100));
      transition: transform 0.2s cubic-bezier(0.34,1.56,0.64,1); flex-shrink: 0;
    }
    .chp-new-btn:hover .chp-plus-circle { transform: rotate(90deg); }
    .chp-nav-links {
      display: flex; flex-direction: column; gap: 1px;
      padding: 6px 8px; border-bottom: 1px solid hsl(var(--border-300) / 0.4);
    }
    .chp-nav-link {
      display: flex; align-items: center; gap: 10px; width: 100%;
      height: 32px; padding: 0 10px; border-radius: 8px; border: none;
      background: transparent; color: hsl(var(--text-300)); cursor: pointer;
      font-size: 13px; text-decoration: none; font-family: inherit;
      transition: all 0.1s; text-align: left;
    }
    .chp-nav-link:hover { background: hsl(var(--bg-300) / 0.5); color: hsl(var(--text-200)); }
    .chp-nav-link:active { background: hsl(var(--bg-300)); }
    .chp-nav-link svg { flex-shrink: 0; opacity: 0.7; }
    .chp-nav-link:hover svg { opacity: 1; }
    .chp-nav-link span { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .chp-search-bar {
      padding: 6px 8px 2px; flex-shrink: 0; display: none; position: relative;
    }
    .chp-search-bar.chp-show { display: block; }
    .chp-search-bar .chp-search-icon {
      position: absolute; left: 18px; top: 50%; transform: translateY(-50%);
      color: hsl(var(--text-500)); pointer-events: none; display: flex; align-items: center;
    }
    .chp-search-bar .chp-search-clear {
      position: absolute; right: 18px; top: 50%; transform: translateY(-50%);
      width: 20px; height: 20px; border-radius: 50%; border: none;
      background: hsl(var(--text-500) / 0.15); color: hsl(var(--text-400));
      cursor: pointer; display: none; align-items: center; justify-content: center; transition: all 0.1s;
    }
    .chp-search-bar .chp-search-clear.chp-vis { display: flex; }
    .chp-search-bar .chp-search-clear:hover { background: hsl(var(--text-500) / 0.3); }
    .chp-search-input {
      width: 100%; box-sizing: border-box; padding: 7px 34px 7px 32px;
      background: hsl(var(--bg-200) / 0.4); border: 1px solid hsl(var(--border-300) / 0.5);
      border-radius: 10px; color: hsl(var(--text-100)); font-size: 13px;
      outline: none; transition: all 0.2s; font-family: inherit;
    }
    .chp-search-input::placeholder { color: hsl(var(--text-500)); }
    .chp-search-input:focus {
      border-color: var(--chp-accent); background: hsl(var(--bg-200) / 0.6);
      box-shadow: 0 0 0 2px var(--chp-accent-glow);
    }
    .chp-scroll {
      flex: 1; overflow-x: hidden; overflow-y: auto; padding: 0; outline: none;
      scrollbar-width: thin; scrollbar-color: hsl(var(--text-500) / 0.15) transparent;
    }
    .chp-scroll::-webkit-scrollbar { width: 5px; }
    .chp-scroll::-webkit-scrollbar-track { background: transparent; }
    .chp-scroll::-webkit-scrollbar-thumb { background: hsl(var(--text-500) / 0.15); border-radius: 4px; }
    .chp-scroll::-webkit-scrollbar-thumb:hover { background: hsl(var(--text-500) / 0.3); }
    .chp-section-hdr {
      color: hsl(var(--text-500)); padding: 12px 14px 4px;
      font-size: 11px; font-weight: 600; letter-spacing: 0.04em;
      text-transform: uppercase; user-select: none;
      display: flex; align-items: center; gap: 6px; cursor: pointer;
      border-radius: 6px; margin: 0 6px; transition: background 0.1s;
    }
    .chp-section-hdr:hover { background: hsl(var(--bg-300) / 0.25); }
    .chp-section-hdr:first-child { padding-top: 8px; }
    .chp-section-chevron {
      display: flex; align-items: center; transition: transform 0.2s ease;
      color: hsl(var(--text-500) / 0.5); flex-shrink: 0;
    }
    .chp-group-collapsed .chp-section-chevron { transform: rotate(-90deg); }
    .chp-group-collapsed + .chp-chat-list { display: none !important; }
    .chp-section-label { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .chp-section-count { color: hsl(var(--text-500) / 0.4); font-weight: 400; font-size: 10px; }
    .chp-section-actions {
      display: flex; gap: 2px; margin-left: auto; opacity: 0; transition: opacity 0.12s; flex-shrink: 0;
    }
    .chp-section-hdr:hover .chp-section-actions { opacity: 1; }
    .chp-section-act-btn {
      width: 20px; height: 20px; border-radius: 4px; border: none;
      background: transparent; cursor: pointer; display: flex;
      align-items: center; justify-content: center;
      color: hsl(var(--text-500)); transition: all 0.1s; padding: 0;
    }
    .chp-section-act-btn:hover { color: hsl(var(--text-200)); background: hsl(var(--bg-300) / 0.5); }
    .chp-section-act-btn.chp-danger:hover { color: #f85149; background: rgba(248,81,73,0.08); }
    .chp-chat-list { list-style: none; margin: 0; padding: 0 6px; display: flex; flex-direction: column; gap: 1px; }
    .chp-chat-item { position: relative; }
    .chp-chat-item a {
      display: flex; align-items: center; gap: 8px; width: 100%;
      min-height: 32px; padding: 5px 28px 5px 10px; border-radius: 8px;
      text-decoration: none; color: hsl(var(--text-300));
      transition: all 0.1s; overflow: hidden; font-size: 13.5px;
    }
    .chp-chat-item a:hover { background: hsl(var(--bg-300) / 0.45); color: hsl(var(--text-200)); }
    .chp-chat-item a:active { background: hsl(var(--bg-300) / 0.7); }
    .chp-chat-item.chp-active a { background: hsl(var(--bg-300) / 0.65); color: hsl(var(--text-100)); }
    .chp-chat-item.chp-selected a {
      background: hsl(var(--accent-main-100) / 0.08); border-left: 2px solid hsl(var(--accent-main-100) / 0.5);
    }
    .chp-quick-star {
      flex-shrink: 0; display: flex; align-items: center; cursor: pointer;
      opacity: 0; transition: opacity 0.12s, transform 0.15s; color: hsl(var(--text-500));
      padding: 2px; border-radius: 4px;
    }
    .chp-quick-star:hover { color: hsl(var(--accent-main-100)); transform: scale(1.2); }
    .chp-chat-item:hover .chp-quick-star { opacity: 0.6; }
    .chp-quick-star.chp-starred { opacity: 1 !important; color: hsl(var(--accent-main-100)); }
    .chp-chat-cb {
      width: 14px; height: 14px; flex-shrink: 0; accent-color: hsl(var(--accent-main-100));
      cursor: pointer; display: none; margin: 0;
    }
    body.chp-select-mode .chp-chat-cb { display: block; }
    body.chp-select-mode .chp-quick-star { display: none; }
    body.chp-select-mode .chp-chat-menu { display: none !important; }
    body.chp-select-mode .chp-chat-item a { padding-left: 6px; gap: 6px; pointer-events: none; }
    body.chp-select-mode .chp-chat-item a .chp-chat-cb { pointer-events: auto; }
    body.chp-select-mode .chp-chat-item { cursor: pointer; }
    .chp-bulk-bar {
      background: hsl(var(--bg-200) / 0.95); backdrop-filter: blur(12px);
      border-top: 1px solid hsl(var(--border-300) / 0.4);
      padding: 8px 10px; display: none; flex-shrink: 0;
      gap: 6px; align-items: center; z-index: 10;
      animation: chp-bar-in 0.18s ease-out;
    }
    @keyframes chp-bar-in { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
    .chp-bulk-bar.chp-show { display: flex; flex-wrap: wrap; }
    .chp-bulk-btn {
      padding: 5px 10px; border-radius: 6px; border: 1px solid hsl(var(--border-300) / 0.3);
      background: hsl(var(--bg-300) / 0.3); color: hsl(var(--text-300)); font-size: 11px;
      cursor: pointer; font-family: inherit; transition: all 0.1s; white-space: nowrap;
      display: flex; align-items: center; gap: 4px;
    }
    .chp-bulk-btn:hover { background: hsl(var(--bg-300) / 0.6); color: hsl(var(--text-100)); }
    .chp-bulk-btn.chp-bulk-danger { border-color: rgba(248,81,73,0.2); color: #f85149; }
    .chp-bulk-btn.chp-bulk-danger:hover { background: rgba(248,81,73,0.1); }
    .chp-bulk-btn.chp-bulk-star { border-color: hsl(var(--accent-main-100) / 0.2); color: hsl(var(--accent-main-100)); }
    .chp-bulk-btn.chp-bulk-star:hover { background: hsl(var(--accent-main-100) / 0.08); }
    .chp-bulk-count { font-size: 11px; color: hsl(var(--text-400)); margin-left: auto; white-space: nowrap; }
    .chp-select-btn {
      width: 20px; height: 20px; border-radius: 5px;
      border: none; background: transparent; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      color: hsl(var(--text-500)); transition: all 0.15s;
    }
    .chp-select-btn:hover { color: hsl(var(--text-200)); background: hsl(var(--bg-300) / 0.5); }
    .chp-select-btn.chp-active-mode { color: hsl(var(--accent-main-100)); }
    .chp-chat-name { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1; }
    .chp-chat-item:hover .chp-chat-name,
    .chp-chat-item.chp-active .chp-chat-name {
      mask-image: linear-gradient(to right, black 72%, transparent 96%);
      -webkit-mask-image: linear-gradient(to right, black 72%, transparent 96%);
    }
    .chp-chat-star-badge { flex-shrink: 0; display: flex; align-items: center; }
    .chp-chat-menu {
      position: absolute; right: 4px; top: 50%; transform: translateY(-50%);
      opacity: 0; transition: opacity 0.12s;
    }
    .chp-chat-item:hover .chp-chat-menu,
    .chp-chat-item.chp-active .chp-chat-menu { opacity: 1; }
    .chp-chat-menu button {
      width: 26px; height: 26px; border-radius: 6px; border: none;
      background: hsl(var(--bg-100) / 0.7); backdrop-filter: blur(4px);
      cursor: pointer; display: flex; align-items: center; justify-content: center;
      color: hsl(var(--text-400)); transition: all 0.12s;
    }
    .chp-chat-menu button:hover { color: hsl(var(--text-100)); background: hsl(var(--bg-300)); }
    @keyframes chp-row-in {
      from { opacity: 0; transform: translateX(-6px); }
      to   { opacity: 1; transform: translateX(0); }
    }
    .chp-chat-item { animation: chp-row-in 0.2s ease-out both; }
    .chp-status-bar {
      display: flex; align-items: center; gap: 6px;
      padding: 4px 14px 6px; font-size: 11px; color: hsl(var(--text-500));
      min-height: 22px; flex-shrink: 0;
    }
    .chp-spinner {
      width: 11px; height: 11px;
      border: 1.5px solid hsl(var(--text-500) / 0.2);
      border-top-color: var(--chp-accent);
      border-radius: 50%; flex-shrink: 0; animation: chp-spin 0.65s linear infinite;
    }
    @keyframes chp-spin { to { transform: rotate(360deg); } }
    .chp-status-count { color: hsl(var(--text-300)); font-weight: 500; }
    .chp-refresh-btn {
      width: 20px; height: 20px; border-radius: 5px;
      border: none; background: transparent; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      color: hsl(var(--text-500)); transition: all 0.15s;
    }
    .chp-refresh-btn:hover { color: hsl(var(--text-200)); background: hsl(var(--bg-300) / 0.5); }
    .chp-refresh-btn:active { transform: rotate(180deg); }
    .chp-refresh-btn.chp-spinning svg { animation: chp-spin 0.65s linear infinite; }
    .chp-group-btn {
      margin-left: auto; height: 20px; border-radius: 5px;
      border: none; background: transparent; cursor: pointer;
      display: flex; align-items: center; gap: 3px; padding: 0 5px;
      color: hsl(var(--text-500)); transition: all 0.15s; font-family: inherit; font-size: 9px; font-weight: 600;
      text-transform: uppercase; letter-spacing: 0.03em; white-space: nowrap;
    }
    .chp-group-btn:hover { color: hsl(var(--text-200)); background: hsl(var(--bg-300) / 0.5); }
    .chp-empty { padding: 48px 20px; text-align: center; color: hsl(var(--text-500)); font-size: 13px; line-height: 1.5; }
    .chp-userbar { border-top: 1px solid hsl(var(--border-300) / 0.4); flex-shrink: 0; }
    .chp-userbar-btn {
      display: flex; align-items: center; gap: 10px; width: 100%;
      padding: 10px 12px; border: none; background: transparent;
      cursor: pointer; font-family: inherit; transition: background 0.1s; min-width: 0;
    }
    .chp-userbar-btn:hover { background: hsl(var(--bg-300) / 0.3); }
    .chp-avatar {
      width: 32px; height: 32px; border-radius: 50%; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
      font-weight: 700; font-size: 14px; user-select: none;
      background: linear-gradient(135deg, hsl(var(--accent-main-100) / 0.7), hsl(var(--text-200)));
      color: hsl(var(--bg-100)); border: 1.5px solid hsl(var(--border-300) / 0.3); transition: all 0.15s;
    }
    .chp-userbar-btn:hover .chp-avatar {
      border-color: var(--chp-accent); box-shadow: 0 0 0 2px var(--chp-accent-glow);
    }
    .chp-user-info { display: flex; flex-direction: column; align-items: flex-start; min-width: 0; flex: 1; }
    .chp-user-name {
      font-size: 13px; font-weight: 500; color: hsl(var(--text-100));
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis; width: 100%; text-align: left;
    }
    .chp-user-plan { font-size: 11px; color: hsl(var(--text-500)); font-weight: 400; text-align: left; }
    .chp-user-chevron { flex-shrink: 0; color: hsl(var(--text-500)); transition: color 0.15s; }
    .chp-userbar-btn:hover .chp-user-chevron { color: hsl(var(--text-300)); }
    .chp-ctx, .chp-user-menu {
      position: fixed; z-index: 99999; min-width: 170px;
      background: hsl(var(--bg-100) / 0.95);
      backdrop-filter: blur(20px) saturate(1.2);
      -webkit-backdrop-filter: blur(20px) saturate(1.2);
      border: 1px solid hsl(var(--border-300) / 0.5);
      border-radius: 12px; padding: 5px;
      box-shadow: 0 12px 40px rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.2);
      animation: chp-menu-in 0.14s ease-out;
    }
    @keyframes chp-menu-in {
      from { opacity: 0; transform: scale(0.95) translateY(4px); }
      to   { opacity: 1; transform: scale(1) translateY(0); }
    }
    .chp-ctx-item {
      display: flex; align-items: center; gap: 10px; width: 100%;
      padding: 7px 12px; border-radius: 8px; border: none; background: transparent;
      color: hsl(var(--text-200)); font-size: 13px; cursor: pointer;
      font-family: inherit; text-align: left; transition: background 0.08s;
      text-decoration: none;
    }
    .chp-ctx-item:hover { background: hsl(var(--bg-300) / 0.6); }
    .chp-ctx-item.chp-danger { color: hsl(0 70% 62%); }
    .chp-ctx-item.chp-danger:hover { background: hsl(0 70% 62% / 0.1); }
    .chp-ctx-item svg { flex-shrink: 0; }
    .chp-ctx-sep { height: 1px; background: hsl(var(--border-300) / 0.4); margin: 4px 8px; }
    .chp-user-menu { min-width: 200px; }
    .chp-rename-input {
      width: 100%; box-sizing: border-box; padding: 3px 8px;
      background: hsl(var(--bg-200) / 0.6);
      border: 1.5px solid var(--chp-accent);
      border-radius: 6px; color: hsl(var(--text-100)); font-size: 13px;
      font-family: inherit; outline: none;
      box-shadow: 0 0 0 2px var(--chp-accent-glow);
    }
    .chp-toast {
      position: fixed; bottom: 24px; left: 50%; z-index: 100000;
      padding: 8px 18px; border-radius: 10px;
      background: hsl(var(--bg-100) / 0.92); backdrop-filter: blur(16px);
      border: 1px solid hsl(var(--border-300) / 0.5);
      color: hsl(var(--text-200)); font-size: 13px;
      box-shadow: 0 8px 30px rgba(0,0,0,0.35);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
      transform: translateX(-50%) translateY(12px);
      opacity: 0; transition: all 0.25s cubic-bezier(0.4,0,0.2,1);
      pointer-events: none;
    }
    .chp-toast.chp-toast-show { opacity: 1; transform: translateX(-50%) translateY(0); }
    .chp-toast.chp-toast-hide { opacity: 0; transform: translateX(-50%) translateY(-8px); }
    .chp-resize-handle {
      position: absolute; top: 0; right: -3px; bottom: 0; width: 6px; cursor: col-resize; z-index: 41;
    }
    .chp-resize-handle::after {
      content: ''; position: absolute; top: 0; right: 2px; bottom: 0; width: 2px;
      background: transparent; transition: background 0.15s; border-radius: 2px;
    }
    .chp-resize-handle:hover::after,
    .chp-resize-handle.chp-dragging::after { background: var(--chp-accent); }
  `;

  // -- Fetch chats --
  async function fetchPage(offset = 0) {
    const oid = await getOrgId(); if (!oid) return [];
    let url = `/api/organizations/${oid}/chat_conversations?limit=${PAGE_SIZE}`;
    if (offset > 0) url += `&offset=${offset}`;
    try {
      const r = await fetch(url, { credentials: 'include' });
      if (!r.ok) return [];
      const d = await r.json();
      return Array.isArray(d) ? d : (d?.data || d?.results || d?.conversations || []);
    } catch { return []; }
  }

  async function loadAllChats(statusEl, force = false) {
    if (isLoading) return;
    isLoading = true;
    const refreshBtn = document.getElementById('chp-refresh');
    if (refreshBtn) refreshBtn.classList.add('chp-spinning');

    const cached = force ? [] : loadCache();
    if (cached.length) {
      allChats = cached;
      applyLocalStars();
      starredChats = allChats.filter(c => c.is_starred);
      if (statusEl) statusEl.innerHTML = safeHTML(`<span class="chp-status-count">${allChats.length}</span> chats &middot; syncing...`);
      renderChats();
    }

    const cachedMap = new Map(allChats.map(c => [c.uuid || c.id, c]));
    let offset = 0, page = 0, newCount = 0, updatedCount = 0;
    while (true) {
      page++;
      if (statusEl && !cached.length)
        statusEl.innerHTML = safeHTML(`<span class="chp-spinner"></span> Loading page ${page}...`);
      const batch = await fetchPage(offset);
      if (!batch.length) break;
      let batchHasNew = false;
      for (const chat of batch) {
        const cid = chat.uuid || chat.id;
        const existing = cachedMap.get(cid);
        if (existing) {
          const newTs = new Date(chat.updated_at || 0).getTime();
          const oldTs = new Date(existing.updated_at || 0).getTime();
          if (newTs > oldTs) { Object.assign(existing, chat); updatedCount++; batchHasNew = true; }
        } else {
          allChats.push(chat); cachedMap.set(cid, chat);
          newCount++; batchHasNew = true;
        }
      }
      if (!batchHasNew && cached.length) break;
      offset += batch.length;
      if (batch.length < PAGE_SIZE || allChats.length > 5000) break;
      await new Promise(r => setTimeout(r, 100));
    }

    allChats.sort((a, b) => new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0));
    applyLocalStars();
    starredChats = allChats.filter(c => c.is_starred);
    saveCache(allChats);
    isLoading = false;
    chatsLoaded = true;

    if (refreshBtn) refreshBtn.classList.remove('chp-spinning');
    if (statusEl) {
      const parts = [`<span class="chp-status-count">${allChats.length}</span> chats`];
      if (newCount || updatedCount) {
        const bits = [];
        if (newCount) bits.push(`${newCount} new`);
        if (updatedCount) bits.push(`${updatedCount} updated`);
        parts.push(`&middot; ${bits.join(', ')}`);
      }
      statusEl.innerHTML = safeHTML(parts.join(' '));
    }
  }

  // -- User info --
  function getUserInfo() {
    const el = document.querySelector('[data-testid="user-menu-button"]');
    if (!el) return null;
    const spans = el.querySelectorAll('span');
    let name = '', plan = '';
    spans.forEach(s => {
      const t = s.textContent.trim();
      if (s.classList.contains('truncate') && !plan && t) name = t;
      if (s.classList.contains('text-xs') || s.className.includes('text-text-500')) plan = t;
    });
    const avatarEl = el.querySelector('.rounded-full.font-bold');
    const initial = avatarEl?.textContent?.trim() || (name?.[0] || '?');
    return { initial, name: name || 'User', plan: plan || '' };
  }

  // -- Time grouping --
  function getGroup(ts) {
    if (!ts) return 'Other';
    const d = new Date(ts), now = new Date();
    const diff = (now - d) / 86400000;
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const cd = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    if (cd.getTime() === today.getTime()) return 'Today';
    if (diff < 2) return 'Yesterday';
    if (diff < 7) return 'Previous 7 days';
    if (diff < 30) return 'Previous 30 days';
    return d.toLocaleString('default', { month: 'long', year: 'numeric' });
  }

  function getAlphaGroup(name) {
    const first = (name || '').trim().charAt(0).toUpperCase();
    return /[A-Z]/.test(first) ? first : '#';
  }

  function getProjectGroup(name) {
    if (!name) return 'Other';
    // Match patterns like "ProjectName - Feature", "ProjectName v1.2", "ProjectName:", etc.
    const m = name.match(/^([A-Za-z0-9_.\-]+(?:\s+[A-Za-z0-9_.\-]+)?)\s*(?:[-:v]|Phase)/);
    if (m) {
      let proj = m[1].trim();
      // Normalize: strip trailing version-like patterns
      proj = proj.replace(/\s+v?\d+(\.\d+)*$/i, '').trim();
      if (proj.length > 1 && proj.length < 40) return proj;
    }
    // Fallback: use first meaningful word(s) before common separators
    const f = name.split(/\s*[-:]\s*/)[0].trim();
    if (f.length > 1 && f.length < 40) return f;
    return 'Other';
  }

  const TYPE_RULES = [
    { label: 'Userscripts', keys: ['userscript', 'tampermonkey', 'greasemonkey', 'ytkit', 'adnull', 'scriptmonkey', 'imdbkit', 'gmailkit', 'instakit', 'redditkit', 'discordkit', 'mediakit', 'doordash'] },
    { label: 'PowerShell / Windows', keys: ['powershell', 'wpf', 'windows', 'win11', 'win10', 'defender', 'firewall', 'registry', 'debloat', 'winget', 'oobe', 'start menu', 'explorer', 'dell', '.ps1', 'mavenwinutil', 'winforge', 'netforge'] },
    { label: 'Python Apps', keys: ['python', 'pyqt', 'pyshop', 'tkinter', '.py', 'pip'] },
    { label: 'Web Apps', keys: ['html', 'react', 'leaflet', 'dashboard', 'weather', 'radar', 'stormview', 'skytrack', 'flight track', 'portfolio', 'website'] },
    { label: 'DICOM / Medical', keys: ['dicom', 'pacs', 'medical', 'imaging', 'x-ray', 'voyance', 'opal', 'spine', 'chiropractic'] },
    { label: 'Browser Extensions', keys: ['chrome extension', 'extension', 'chapterizer', 'chapterforge'] },
    { label: 'Android / Mobile', keys: ['android', 'kotlin', 'mobile', 'apk'] },
    { label: 'Music / Audio', keys: ['suno', 'music', 'audio', 'lyrics', 'chiptune', 'tts'] },
    { label: 'GitHub / Docs', keys: ['github', 'readme', 'documentation', 'repo'] },
    { label: 'Video / Media', keys: ['video', 'premiere', 'opencut', 'ffmpeg', 'compressor', 'gif', 'image editor', 'screenshot'] },
    { label: 'Networking / Security', keys: ['network', 'firewall', 'osint', 'spectre', 'pfsense', 'pfblocker', 'dns', 'cloudflare', 'teamviewer'] },
  ];

  function getTypeGroup(name) {
    if (!name) return 'Other';
    const lc = name.toLowerCase();
    for (const rule of TYPE_RULES) {
      for (const k of rule.keys) {
        if (lc.includes(k)) return rule.label;
      }
    }
    return 'Other';
  }

  function groupChats(chats, mode) {
    const groups = [];
    const map = new Map();
    const getKey = (c) => {
      const name = c.name || c.title || '';
      switch (mode) {
        case 'alpha': return getAlphaGroup(name);
        case 'project': return getProjectGroup(name);
        case 'type': return getTypeGroup(name);
        default: return getGroup(c.updated_at || c.created_at);
      }
    };
    chats.forEach(c => {
      const key = getKey(c);
      if (!map.has(key)) { map.set(key, []); groups.push(key); }
      map.get(key).push(c);
    });
    // Sort group keys for alpha and type modes
    if (mode === 'alpha') groups.sort((a, b) => a === '#' ? 1 : b === '#' ? -1 : a.localeCompare(b));
    if (mode === 'type') groups.sort((a, b) => a === 'Other' ? 1 : b === 'Other' ? -1 : a.localeCompare(b));
    if (mode === 'project') groups.sort((a, b) => a === 'Other' ? 1 : b === 'Other' ? -1 : a.localeCompare(b));
    return groups.map(key => ({ label: key, chats: map.get(key) }));
  }

  // -- Chat item HTML --
  function chatItemHTML(c, idx) {
    const id = c.uuid || c.id;
    const name = (c.name || 'Untitled').replace(/</g, '&lt;').replace(/"/g, '&quot;');
    const active = location.pathname === `/chat/${id}` ? ' chp-active' : '';
    const selected = selectedIds.has(id) ? ' chp-selected' : '';
    const isStarred = c.is_starred;
    const delay = Math.min(idx * ANIM_STAGGER, 600);
    return `<li class="chp-chat-item${active}${selected}" style="animation-delay:${delay}ms" data-chp-id="${id}">
      <a href="/chat/${id}" data-chp-nav="${id}" title="${name}">
        <input type="checkbox" class="chp-chat-cb" data-chp-cb="${id}" ${selectedIds.has(id) ? 'checked' : ''} />
        <span class="chp-quick-star${isStarred ? ' chp-starred' : ''}" data-chp-star="${id}" title="${isStarred ? 'Unstar' : 'Star'}">${isStarred ? ICONS.starFill : ICONS.star}</span>
        <span class="chp-chat-name">${name}</span>
      </a>
      <div class="chp-chat-menu"><button data-chp-menu="${id}" title="Options">${ICONS.dots}</button></div>
    </li>`;
  }

  // -- Render --
  function renderChats(filter = '') {
    const container = document.getElementById('chp-chatlist');
    if (!container) return;
    const lf = filter.toLowerCase();
    const filtered = lf ? allChats.filter(c => (c.name || '').toLowerCase().includes(lf)) : allChats;
    const starred = (lf ? starredChats.filter(c => (c.name || '').toLowerCase().includes(lf)) : starredChats);
    const nonStarred = filtered.filter(c => !c.is_starred);

    if (!filtered.length) {
      container.innerHTML = safeHTML(`<div class="chp-empty">${filter ? 'No matching conversations' : 'No conversations yet'}</div>`);
      updateBulkBar(); return;
    }

    let html = '', globalIdx = 0;

    const sectionHdr = (label, chatIds, isCollapsed, showActions = true) => {
      const count = chatIds.length;
      const collapseKey = `${groupMode}::${label}`;
      const collapsed = isCollapsed || collapsedGroups.has(collapseKey);
      const chevron = `<span class="chp-section-chevron">${ICONS.chevronDown}</span>`;
      const actions = showActions ? `<span class="chp-section-actions">
        <button class="chp-section-act-btn" data-grp-select="${collapseKey}" title="Select all in group">
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 8l3.5 3.5L13 4"/></svg>
        </button>
        <button class="chp-section-act-btn" data-grp-star="${collapseKey}" title="Star/Unstar all in group">
          ${ICONS.star}
        </button>
        <button class="chp-section-act-btn chp-danger" data-grp-delete="${collapseKey}" title="Delete all in group">
          ${ICONS.trash}
        </button>
      </span>` : '';
      return `<div class="chp-section-hdr${collapsed ? ' chp-group-collapsed' : ''}" data-grp-key="${collapseKey}" data-grp-ids="${chatIds.join(',')}">${chevron}<span class="chp-section-label">${label}</span><span class="chp-section-count">${count}</span>${actions}</div>`;
    };

    if (starred.length) {
      const ids = starred.map(c => c.uuid || c.id);
      html += sectionHdr('Starred', ids, false, true);
      html += '<ul class="chp-chat-list">';
      starred.forEach(c => { html += chatItemHTML(c, globalIdx++); });
      html += '</ul>';
    }

    const groups = groupChats(nonStarred, groupMode);
    groups.forEach(g => {
      if (!g.chats.length) return;
      const ids = g.chats.map(c => c.uuid || c.id);
      const collapseKey = `${groupMode}::${g.label}`;
      html += sectionHdr(g.label, ids, collapsedGroups.has(collapseKey));
      html += '<ul class="chp-chat-list">';
      g.chats.forEach(c => { html += chatItemHTML(c, globalIdx++); });
      html += '</ul>';
    });
    container.innerHTML = safeHTML(html);

    // Wire context menus
    container.querySelectorAll('[data-chp-menu]').forEach(btn => {
      btn.addEventListener('click', e => showCtxMenu(e, btn.dataset.chpMenu));
    });

    // Wire quick-star
    container.querySelectorAll('[data-chp-star]').forEach(el => {
      el.addEventListener('click', async (e) => {
        e.preventDefault(); e.stopPropagation();
        const chatId = el.dataset.chpStar;
        const chat = allChats.find(c => (c.uuid || c.id) === chatId);
        if (!chat) return;
        const newVal = !chat.is_starred;
        const ok = await apiToggleStar(chatId, newVal);
        if (ok) {
          chat.is_starred = newVal;
          starredChats = allChats.filter(c => c.is_starred);
          saveCache(allChats); renderChats(getSearchValue());
          const suffix = ok === 'local' ? ' (local)' : '';
          toast((newVal ? 'Starred' : 'Unstarred') + suffix);
        }
      });
    });

    // Wire checkboxes + item click in select mode
    container.querySelectorAll('.chp-chat-item').forEach(li => {
      const id = li.dataset.chpId;
      if (!id) return;
      li.addEventListener('click', (e) => {
        if (!selectMode) return;
        // Don't intercept star, menu, checkbox, or link clicks
        if (e.target.closest('[data-chp-star]') || e.target.closest('[data-chp-menu]') || e.target.classList.contains('chp-chat-cb')) return;
        e.preventDefault(); e.stopPropagation();
        toggleSelection(id, e.shiftKey);
      });
      // Also wire checkbox directly
      const cb = li.querySelector('.chp-chat-cb');
      if (cb) cb.addEventListener('change', (e) => {
        e.stopPropagation();
        toggleSelection(id, e.shiftKey);
      });
    });

    // Wire collapsible group headers
    container.querySelectorAll('.chp-section-hdr').forEach(hdr => {
      const key = hdr.dataset.grpKey;
      // Collapse/expand on header click (but not on action buttons)
      hdr.addEventListener('click', (e) => {
        if (e.target.closest('.chp-section-actions')) return;
        hdr.classList.toggle('chp-group-collapsed');
        if (hdr.classList.contains('chp-group-collapsed')) collapsedGroups.add(key);
        else collapsedGroups.delete(key);
        GM_setValue('chp_collapsed_groups', JSON.stringify([...collapsedGroups]));
      });

      // Group select all
      const selBtn = hdr.querySelector('[data-grp-select]');
      if (selBtn) selBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const ids = (hdr.dataset.grpIds || '').split(',').filter(Boolean);
        const allSelected = ids.every(id => selectedIds.has(id));
        ids.forEach(id => { if (allSelected) selectedIds.delete(id); else selectedIds.add(id); });
        if (!selectMode && selectedIds.size > 0) { selectMode = true; document.body.classList.add('chp-select-mode'); }
        renderChats(getSearchValue());
        updateBulkBar();
      });

      // Group star all
      const starBtn = hdr.querySelector('[data-grp-star]');
      if (starBtn) starBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const ids = (hdr.dataset.grpIds || '').split(',').filter(Boolean);
        const chatsInGroup = ids.map(id => allChats.find(c => (c.uuid || c.id) === id)).filter(Boolean);
        const shouldStar = chatsInGroup.some(c => !c.is_starred);
        toast(`${shouldStar ? 'Starring' : 'Unstarring'} ${chatsInGroup.length} chats...`);
        let apiOk = 0, localOnly = 0;
        for (const chat of chatsInGroup) {
          const cid = chat.uuid || chat.id;
          const result = await apiToggleStar(cid, shouldStar);
          if (result === true) apiOk++;
          else if (result === 'local') localOnly++;
          chat.is_starred = shouldStar;
          await sleep(200);
        }
        starredChats = allChats.filter(c => c.is_starred);
        saveCache(allChats); renderChats(getSearchValue());
        const suffix = localOnly > 0 ? ' (local)' : '';
        toast(`${chatsInGroup.length} chats ${shouldStar ? 'starred' : 'unstarred'}${suffix}`);
      });

      // Group delete all
      const delBtn = hdr.querySelector('[data-grp-delete]');
      if (delBtn) delBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const ids = (hdr.dataset.grpIds || '').split(',').filter(Boolean);
        await bulkDeleteChats(ids);
      });
    });

    // Update group mode button label
    const modeLabel = document.getElementById('chp-group-label');
    if (modeLabel) modeLabel.textContent = GROUP_LABELS[groupMode] || 'Date';

    updateBulkBar();
  }

  function toggleSelection(id, shiftKey) {
    if (shiftKey && lastClickedId) {
      // Range select: find all visible items between lastClicked and current
      const items = [...document.querySelectorAll('.chp-chat-item[data-chp-id]')];
      const ids = items.map(li => li.dataset.chpId);
      const a = ids.indexOf(lastClickedId), b = ids.indexOf(id);
      if (a !== -1 && b !== -1) {
        const [start, end] = a < b ? [a, b] : [b, a];
        for (let i = start; i <= end; i++) selectedIds.add(ids[i]);
      }
    } else {
      if (selectedIds.has(id)) selectedIds.delete(id); else selectedIds.add(id);
    }
    lastClickedId = id;
    renderChats(getSearchValue());
    updateBulkBar();
  }

  function updateBulkBar() {
    const bar = document.getElementById('chp-bulk-bar');
    if (!bar) return;
    const count = selectedIds.size;
    if (count > 0 || selectMode) {
      bar.classList.add('chp-show');
      const countEl = bar.querySelector('.chp-bulk-count');
      if (countEl) countEl.textContent = count > 0 ? `${count} selected` : 'Select chats';
    } else {
      bar.classList.remove('chp-show');
    }
    // Update select mode button appearance
    const selToggle = document.getElementById('chp-select-toggle');
    if (selToggle) selToggle.classList.toggle('chp-active-mode', selectMode);
  }

  async function bulkDeleteChats(ids) {
    if (!ids.length) return;
    toast(`Deleting ${ids.length} chats...`);
    let ok = 0, fail = 0;
    for (const id of ids) {
      if (await apiDeleteChat(id)) {
        allChats = allChats.filter(c => (c.uuid || c.id) !== id);
        selectedIds.delete(id);
        ok++;
      } else fail++;
      await sleep(200);
    }
    starredChats = allChats.filter(c => c.is_starred);
    saveCache(allChats); renderChats(getSearchValue());
    toast(`${ok} deleted${fail ? `, ${fail} failed` : ''}`);
    if (ids.includes(location.pathname.split('/chat/')[1])) hardNav('/new');
  }

  async function bulkToggleStar(ids, star) {
    if (!ids.length) return;
    toast(`${star ? 'Starring' : 'Unstarring'} ${ids.length} chats...`);
    let ok = 0, localOnly = 0;
    for (const id of ids) {
      const chat = allChats.find(c => (c.uuid || c.id) === id);
      if (chat) {
        const result = await apiToggleStar(id, star);
        if (result) { chat.is_starred = star; ok++; }
        if (result === 'local') localOnly++;
      }
      await sleep(200);
    }
    starredChats = allChats.filter(c => c.is_starred);
    saveCache(allChats); renderChats(getSearchValue());
    const suffix = localOnly > 0 ? ' (local)' : '';
    toast(`${ok} chats ${star ? 'starred' : 'unstarred'}${suffix}`);
  }

  function updateActive() {
    document.querySelectorAll('.chp-chat-item').forEach(li => {
      const a = li.querySelector('a');
      li.classList.toggle('chp-active', a?.getAttribute('href') === location.pathname);
    });
  }

  // -- Collapse / Expand --
  function setCollapsed(collapsed) {
    sidebarCollapsed = collapsed;
    GM_setValue('chp_collapsed', collapsed);
    applySidebarState();
  }

  function applySidebarState() {
    const sb = document.getElementById('chp-sidebar');
    const btn = document.getElementById('chp-expand-btn');
    if (sb) sb.classList.toggle('chp-collapsed', sidebarCollapsed);
    if (btn) btn.classList.toggle('chp-visible', sidebarCollapsed);
    document.body.classList.toggle('chp-sidebar-open', !sidebarCollapsed);
  }

  // -- Build sidebar (idempotent) --
  function buildSidebar() {
    if (document.getElementById('chp-sidebar')) { applySidebarState(); return; }
    if (!document.getElementById('chp-main-css')) {
      const s = document.createElement('style');
      s.id = 'chp-main-css';
      s.textContent = CSS;
      (document.head || document.documentElement).appendChild(s);
    }
    if (!document.getElementById('chp-expand-btn')) {
      const expandBtn = document.createElement('button');
      expandBtn.id = 'chp-expand-btn';
      expandBtn.innerHTML = safeHTML(ICONS.expand);
      expandBtn.title = 'Expand sidebar';
      expandBtn.addEventListener('click', () => setCollapsed(false));
      document.body.appendChild(expandBtn);
    }

    const sb = document.createElement('div');
    sb.id = 'chp-sidebar';
    // All nav links are plain <a> tags - no data-chp-native, no JS click handlers.
    // Browser handles navigation naturally. Sidebar re-injects after page load.
    sb.innerHTML = safeHTML(`
      <div class="chp-topbar">
        <div class="chp-logo"><a href="/new" aria-label="Home">${ICONS.claude}</a></div>
        <div class="chp-topbar-actions">
          <button class="chp-icon-btn" id="chp-search-toggle" title="Search (Ctrl+K)">${ICONS.search}</button>
          <button class="chp-icon-btn" id="chp-collapse-btn" title="Collapse sidebar">${ICONS.collapse}</button>
        </div>
      </div>
      <a href="/new" class="chp-new-btn">
        <div class="chp-plus-circle">${ICONS.plus}</div>
        <span>New chat</span>
      </a>
      <div class="chp-nav-links">
        <a href="/recents" class="chp-nav-link">${ICONS.chats}<span>All chats</span></a>
        <a href="/projects" class="chp-nav-link">${ICONS.projects}<span>Projects</span></a>
        <a href="/customize" class="chp-nav-link">${ICONS.customize}<span>Customize Claude</span></a>
      </div>
      <div class="chp-search-bar" id="chp-search-wrap">
        <span class="chp-search-icon">${ICONS.search}</span>
        <input class="chp-search-input" id="chp-search-input" placeholder="Search conversations..." spellcheck="false" autocomplete="off" />
        <button class="chp-search-clear" id="chp-search-clear" title="Clear">${ICONS.clear}</button>
      </div>
      <div class="chp-status-bar">
        <span id="chp-status"></span>
        <button class="chp-group-btn" id="chp-group-toggle" title="Group by: cycle through Date / A-Z / Project / Type">
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M2 4h12M2 8h9M2 12h6"/></svg>
          <span id="chp-group-label">${GROUP_LABELS[groupMode]}</span>
        </button>
        <button class="chp-select-btn" id="chp-select-toggle" title="Multi-select mode">${ICONS.selectMode}</button>
        <button class="chp-refresh-btn" id="chp-refresh" title="Refresh">${ICONS.refresh}</button>
      </div>
      <div class="chp-scroll" id="chp-scroll" tabindex="-1">
        <div id="chp-chatlist"></div>
      </div>
      <div class="chp-bulk-bar" id="chp-bulk-bar">
        <button class="chp-bulk-btn chp-bulk-star" id="chp-bulk-star" title="Star selected">${ICONS.star} Star</button>
        <button class="chp-bulk-btn chp-bulk-star" id="chp-bulk-unstar" title="Unstar selected">${ICONS.starFill} Unstar</button>
        <button class="chp-bulk-btn chp-bulk-danger" id="chp-bulk-delete" title="Delete selected">${ICONS.trash} Delete</button>
        <button class="chp-bulk-btn" id="chp-bulk-all" title="Select all visible">All</button>
        <button class="chp-bulk-btn" id="chp-bulk-none" title="Deselect all">None</button>
        <span class="chp-bulk-count">0 selected</span>
      </div>
      <div class="chp-userbar" id="chp-userbar"></div>
      <div class="chp-resize-handle" id="chp-resize"></div>
    `);
    document.body.appendChild(sb);

    // -- Wire sidebar-specific events --
    document.getElementById('chp-collapse-btn').addEventListener('click', () => setCollapsed(true));

    document.getElementById('chp-search-toggle').addEventListener('click', () => {
      const wrap = document.getElementById('chp-search-wrap');
      const inp = document.getElementById('chp-search-input');
      wrap.classList.toggle('chp-show');
      if (wrap.classList.contains('chp-show')) { inp.focus(); }
      else { inp.value = ''; updateSearchClear(); renderChats(); }
    });

    let debounce;
    const searchInput = document.getElementById('chp-search-input');
    searchInput.addEventListener('input', e => {
      clearTimeout(debounce);
      updateSearchClear();
      debounce = setTimeout(() => renderChats(e.target.value.trim()), 120);
    });
    document.getElementById('chp-search-clear').addEventListener('click', () => {
      searchInput.value = ''; updateSearchClear(); renderChats(); searchInput.focus();
    });

    document.getElementById('chp-refresh').addEventListener('click', () => {
      loadAllChats(document.getElementById('chp-status'), true).then(() => renderChats(getSearchValue()));
    });

    document.getElementById('chp-group-toggle').addEventListener('click', () => {
      const idx = GROUP_MODES.indexOf(groupMode);
      groupMode = GROUP_MODES[(idx + 1) % GROUP_MODES.length];
      GM_setValue('chp_group_mode', groupMode);
      renderChats(getSearchValue());
    });

    // Multi-select mode toggle
    document.getElementById('chp-select-toggle').addEventListener('click', () => {
      selectMode = !selectMode;
      document.body.classList.toggle('chp-select-mode', selectMode);
      if (!selectMode) { selectedIds.clear(); lastClickedId = null; }
      renderChats(getSearchValue());
      updateBulkBar();
    });

    // Bulk action bar
    document.getElementById('chp-bulk-star').addEventListener('click', () => {
      bulkToggleStar([...selectedIds], true);
    });
    document.getElementById('chp-bulk-unstar').addEventListener('click', () => {
      bulkToggleStar([...selectedIds], false);
    });
    document.getElementById('chp-bulk-delete').addEventListener('click', () => {
      bulkDeleteChats([...selectedIds]);
    });
    document.getElementById('chp-bulk-all').addEventListener('click', () => {
      document.querySelectorAll('.chp-chat-item[data-chp-id]').forEach(li => {
        selectedIds.add(li.dataset.chpId);
      });
      if (!selectMode) { selectMode = true; document.body.classList.add('chp-select-mode'); }
      renderChats(getSearchValue());
      updateBulkBar();
    });
    document.getElementById('chp-bulk-none').addEventListener('click', () => {
      selectedIds.clear(); lastClickedId = null;
      renderChats(getSearchValue());
      updateBulkBar();
    });

    // Resize handle
    const resizeHandle = document.getElementById('chp-resize');
    let resizing = false;
    resizeHandle.addEventListener('mousedown', e => {
      e.preventDefault(); resizing = true;
      resizeHandle.classList.add('chp-dragging');
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    });
    document.addEventListener('mousemove', e => {
      if (!resizing) return;
      const w = Math.max(220, Math.min(450, e.clientX));
      sidebarWidth = w;
      document.documentElement.style.setProperty('--chp-w', w + 'px');
    });
    document.addEventListener('mouseup', () => {
      if (!resizing) return;
      resizing = false;
      resizeHandle.classList.remove('chp-dragging');
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      GM_setValue('chp_width', sidebarWidth);
    });

    // Apply state and reveal
    applySidebarState();
    requestAnimationFrame(() => requestAnimationFrame(() => sb.classList.add('chp-ready')));

    // Load chats
    if (!chatsLoaded) {
      loadAllChats(document.getElementById('chp-status')).then(() => renderChats());
    } else {
      renderChats(getSearchValue());
    }

    // Build user bar
    tryBuildUserBar();
  }

  // -- User bar --
  let userBarBuilt = false;
  function tryBuildUserBar() {
    const info = getUserInfo();
    if (info) { buildUserBar(info); userBarBuilt = true; return; }
    if (!userBarBuilt) {
      const obs = new MutationObserver(() => {
        const info = getUserInfo();
        if (info) { obs.disconnect(); buildUserBar(info); userBarBuilt = true; }
      });
      if (document.body) obs.observe(document.body, { childList: true, subtree: true });
      setTimeout(() => {
        if (!userBarBuilt) { obs.disconnect(); buildUserBar({ initial: '?', name: 'User', plan: '' }); }
      }, 5000);
    }
  }

  function buildUserBar(u) {
    const bar = document.getElementById('chp-userbar');
    if (!bar) return;
    bar.innerHTML = safeHTML(`
      <button type="button" class="chp-userbar-btn" id="chp-user-btn">
        <div class="chp-avatar">${u.initial}</div>
        <div class="chp-user-info">
          <span class="chp-user-name">${u.name}</span>
          ${u.plan ? `<span class="chp-user-plan">${u.plan}</span>` : ''}
        </div>
        <span class="chp-user-chevron">${ICONS.chevronUp}</span>
      </button>
    `);
    document.getElementById('chp-user-btn')?.addEventListener('click', showUserMenu);
  }

  // -- Kill native sidebar --
  function hideNativeSidebar() {
    document.querySelectorAll('nav[aria-label="Sidebar"]').forEach(nav => {
      nav.setAttribute('data-chp-native-hidden', '');
      let el = nav.parentElement;
      while (el && el !== document.body) {
        if (el.id === 'chp-sidebar') return;
        if (el.classList.contains('shrink-0')) {
          el.setAttribute('data-chp-native-hidden', '');
          return;
        }
        el = el.parentElement;
      }
    });
  }

  // -- Resilience: re-inject if React wipes our sidebar --
  let resilienceObserver = null;
  function startResilience() {
    if (resilienceObserver) resilienceObserver.disconnect();
    hideNativeSidebar();

    resilienceObserver = new MutationObserver(() => {
      hideNativeSidebar();
      if (!document.getElementById('chp-sidebar') && document.body) buildSidebar();
      if (!document.getElementById('chp-expand-btn') && document.body) buildSidebar();
    });
    if (document.body) resilienceObserver.observe(document.body, { childList: true, subtree: true });

    // Aggressive interval for first 10 seconds
    let runs = 0;
    const iv = setInterval(() => {
      hideNativeSidebar();
      if (!document.getElementById('chp-sidebar') && document.body) buildSidebar();
      if (++runs > 50) clearInterval(iv);
    }, 200);
  }

  // -- Init --
  function init() {
    attachGlobalListeners();
    if (document.body) {
      buildSidebar();
      startResilience();
    } else {
      const bodyObs = new MutationObserver(() => {
        if (document.body) {
          bodyObs.disconnect();
          buildSidebar();
          startResilience();
        }
      });
      bodyObs.observe(document.documentElement, { childList: true });
    }
  }

  init();


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
        CodeCopyModule.init();
        ExportModule.init();
        ResponseModule.init();
        DomTrimmerModule.init();
        PromptModule.init();
        AutoBuildModule.init();
        SmartContinueModule.init();
        AutoContinueModule.init();
        InputCounterModule.init();
        SessionStats.init();
        HistoryPanelModule.init();
        // Skip native sidebar modules when history panel is active
        if (!Settings.get('historyPanel')) {
            SidebarExpandModule.init();
            StarredHighlightModule.init();
        }

        // Start consolidated DOM watcher (after all modules register handlers)
        DOMWatcher.start();

        // Build control panel
        ControlPanel.build();
        ControlPanel.buildGearButton();

        // Aggressive resilience for first 10s (React hydration can wipe the shadow host)
        let panelResRuns = 0;
        const panelResIv = setInterval(() => {
            if (ControlPanel._host && !ControlPanel._host.isConnected) {
                console.warn(LOG_TAG, 'Shadow host detached (early) — rebuilding panel');
                ControlPanel._host = null;
                ControlPanel._root = null;
                ControlPanel._panel = null;
                ControlPanel.build().then(() => ControlPanel._wireHoverEvents());
            }
            if (++panelResRuns > 50) clearInterval(panelResIv);
        }, 200);

        // URL change detection via History API interception (replaces setInterval polling)
        const _onNav = () => {
            SelectorEngine.invalidate();
            StreamMonitor.artifacts.clear();
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
        };
        const origPush = history.pushState.bind(history);
        const origReplace = history.replaceState.bind(history);
        history.pushState = (...args) => { origPush(...args); _onNav(); };
        history.replaceState = (...args) => { origReplace(...args); _onNav(); };
        window.addEventListener('popstate', _onNav);

        // First-run hover strip hint
        if (!GM_getValue(PREFIX + '_hintShown', false)) {
            GM_setValue(PREFIX + '_hintShown', true);
            setTimeout(() => {
                const strip = $(`#${PREFIX}-hover-strip`);
                if (strip) {
                    strip.style.transition = 'width 0.5s, opacity 0.5s';
                    strip.style.width = '24px';
                    strip.style.opacity = '1';
                    strip.style.setProperty('--strip-color', 'rgba(88,166,255,0.5)');
                    showToast('CUE panel: hover the right edge to open', 4000, 'info');
                    setTimeout(() => {
                        strip.style.width = '6px';
                        strip.style.setProperty('--strip-color', 'rgba(88,166,255,0.2)');
                    }, 3000);
                }
            }, 2000);
        }

        console.log(`%c${LOG_TAG} Ready! Hover right edge to open panel (v${VERSION}: glassmorphism UI, Shadow DOM isolation, frosted glass panel, backdrop-filter effects, CSS-isolated modals)`, 'color:#3fb950;font-weight:bold');
    }

    // Start
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();