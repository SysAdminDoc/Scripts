// ==UserScript==
// @name         ScriptSpy
// @namespace    https://github.com/SysAdminDoc
// @version      0.3.0
// @description  Full-featured userscript debugger. Console capture, hide/mute errors, pause/resume, network bodies, storage monitor, pin entries, multi-select AI report, auto-open on error, copy-as-fetch, tab unread dots, persistent panel size.
// @author       SysAdminDoc
// @match        *://*/*
// @grant        GM_registerMenuCommand
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_addStyle
// @grant        GM_info
// @grant        GM_setClipboard
// @grant        GM_listValues
// @run-at       document-start
// ==/UserScript==

(function () {
'use strict';

const VERSION = '0.3.0';

// ═══════════════════════════════════════════════════════════════
//  TRUSTEDTYPES — required on Google/YouTube (strict-TT sites)
// ═══════════════════════════════════════════════════════════════
try {
    if (window.trustedTypes && window.trustedTypes.createPolicy) {
        window.trustedTypes.createPolicy('scriptspy-v1', { createHTML: s => s });
    }
} catch (_) {}

// NEVER use innerHTML = '' — throws on strict-TT pages.
// DOM child removal works everywhere with no TrustedTypes requirement.
const clearEl = n => { while (n.lastChild) n.removeChild(n.lastChild); };

// ═══════════════════════════════════════════════════════════════
//  STATE
// ═══════════════════════════════════════════════════════════════
let panelVisible  = false;
let panelDocked   = false;
let activeTab     = GM_getValue('ss_tab', 'console');
let persistHist   = GM_getValue('ss_persist', true);
let maxHist       = GM_getValue('ss_maxHist', 200);
let autoOpenOnErr = GM_getValue('ss_autoOpen', false);
let savedW        = GM_getValue('ss_panW', 740);
let savedH        = GM_getValue('ss_panH', 580);

let entries        = [];
let entryMap       = new Map();   // id → entry, for O(1) lookups
let netEntries     = [];
let scriptReg      = {};
let entryId        = 0;
let netId          = 0;
let dedupeMap      = {};          // "type:message" → entry id
let perfTimers     = {};
let pinnedIds      = new Set();
let selectedIds    = new Set();
let capturePaused  = false;
let captureBuffer  = [];
let storageChanges = [];
let tabUnread      = { console: 0, scripts: 0, network: 0, storage: 0, tools: 0 };
let autoOpenFired  = false;

// Muted patterns — persisted. Entries matching any pattern are hidden from view.
let mutedPatterns = new Set(JSON.parse(GM_getValue('ss_muted', '[]') || '[]'));

let conFilter = { type: 'all', text: '', regex: false, script: 'all', hidePageErrors: false };
let netFilter = 'all';
let stSubTab  = 'gm';

let panel = null, logList = null, netList = null;
let scriptsList = null, storageContent = null, storageChangeList = null;
let pauseBanner = null;

// Debounce timer for scripts tab rebuild
let _scriptTabTimer = null;

// ═══════════════════════════════════════════════════════════════
//  SCRIPT NAME RESOLVER
// ═══════════════════════════════════════════════════════════════
function extractScriptName(stack) {
    if (!stack) return null;
    const nm = stack.match(/[?&]name=([^&)\s:#"]+)/);
    if (nm) { try { return decodeURIComponent(nm[1].replace(/\+/g, ' ')); } catch (_) {} }
    const js = stack.match(/\/([^/\s):#"]+\.user\.js)/);
    if (js) return js[1].replace(/\.user\.js$/, '');
    const id = stack.match(/id=([a-f0-9-]{8,})/i);
    if (id) return `Script-${id[1].slice(0, 8)}`;
    return null;
}
function getStack() { try { throw new Error(); } catch (e) { return e.stack || ''; } }
function usLines(stack) {
    return stack.split('\n').slice(1).filter(l =>
        /userscript|tampermonkey|violentmonkey|greasemonkey|\.user\.js|chrome-extension|moz-extension/i.test(l));
}
function isUsSource(stack) {
    return /userscript|tampermonkey|violentmonkey|greasemonkey|GM_|\.user\.js|chrome-extension|moz-extension/i.test(stack);
}

// ═══════════════════════════════════════════════════════════════
//  FORMAT STRING PARSER (%c %s %d %f %o %O)
// ═══════════════════════════════════════════════════════════════
function parseFormatArgs(args) {
    if (!args.length || typeof args[0] !== 'string') return null;
    if (!/%[csdifоoO]/.test(args[0])) return null;
    const fmt = args[0];
    const parts = []; let ai = 1, rem = fmt, style = '';
    while (rem.length) {
        const pi = rem.indexOf('%');
        if (pi === -1) { if (rem) parts.push({ text: rem, style }); break; }
        if (pi > 0)    { parts.push({ text: rem.slice(0, pi), style }); rem = rem.slice(pi); }
        const sp = rem[1], val = ai < args.length ? args[ai] : undefined;
        if      (sp === 'c')               { style = val != null ? String(val) : ''; ai++; rem = rem.slice(2); }
        else if (sp === 's')               { parts.push({ text: String(val ?? ''), style }); ai++; rem = rem.slice(2); }
        else if (sp === 'd' || sp === 'i') { parts.push({ text: String(parseInt(val ?? 0)), style }); ai++; rem = rem.slice(2); }
        else if (sp === 'f')               { parts.push({ text: String(parseFloat(val ?? 0)), style }); ai++; rem = rem.slice(2); }
        else if (sp === 'o' || sp === 'O') { let t; try { t = JSON.stringify(val, null, 2); } catch { t = String(val); } parts.push({ text: t, style: 'font-family:monospace;white-space:pre' }); ai++; rem = rem.slice(2); }
        else { parts.push({ text: rem.slice(0, 2), style }); rem = rem.slice(2); }
    }
    while (ai < args.length) { const a = args[ai++]; let t; try { t = typeof a === 'object' ? ' '+JSON.stringify(a,null,2) : ' '+String(a); } catch { t = ' '+String(a); } parts.push({ text: t, style: '' }); }
    return parts.length ? parts : null;
}

// ═══════════════════════════════════════════════════════════════
//  CONSOLE.TABLE PARSER
// ═══════════════════════════════════════════════════════════════
function parseTableData(data) {
    if (!data || typeof data !== 'object') return null;
    const isArr = Array.isArray(data);
    const rows  = isArr ? data : Object.entries(data).map(([k, v]) => ({ '(index)': k, Value: v }));
    if (!rows.length) return null;
    const cols = ['(index)'];
    rows.forEach(row => {
        if (typeof row === 'object' && row !== null)
            Object.keys(row).forEach(k => { if (!cols.includes(k) && k !== '(index)') cols.push(k); });
        else if (!cols.includes('Values')) cols.push('Values');
    });
    return { cols, rows, isArr };
}

// ═══════════════════════════════════════════════════════════════
//  SCRIPT REGISTRY
// ═══════════════════════════════════════════════════════════════
function regScript(name, type) {
    if (!name) return;
    if (!scriptReg[name]) scriptReg[name] = { errors: 0, warns: 0, logs: 0, infos: 0, lastSeen: '', status: 'ok' };
    const r = scriptReg[name];
    if      (type === 'error') { r.errors++; r.status = 'error'; }
    else if (type === 'warn')  { r.warns++;  if (r.status !== 'error') r.status = 'warn'; }
    else if (type === 'info')  r.infos++;
    else                       r.logs++;
    r.lastSeen = new Date().toLocaleTimeString('en-US', { hour12: false });
    // Debounced DOM rebuild — avoids O(n) DOM thrash on every log line
    if (scriptsList) {
        clearTimeout(_scriptTabTimer);
        _scriptTabTimer = setTimeout(updateScriptsTab, 120);
    }
}

// ═══════════════════════════════════════════════════════════════
//  MUTED PATTERNS
// ═══════════════════════════════════════════════════════════════
function isMuted(entry) {
    if (!mutedPatterns.size) return false;
    for (const pat of mutedPatterns) {
        if (entry.message.includes(pat)) return true;
    }
    return false;
}
function muteEntry(entry) {
    // Use first 100 chars of message as the mute key
    const key = entry.message.slice(0, 100).trim();
    if (!key) return;
    mutedPatterns.add(key);
    saveMuted();
    rerenderConsole();
    renderMutedList();
}
function unmutePat(pat) {
    mutedPatterns.delete(pat);
    saveMuted();
    rerenderConsole();
    renderMutedList();
}
function saveMuted() {
    GM_setValue('ss_muted', JSON.stringify([...mutedPatterns]));
}

// ═══════════════════════════════════════════════════════════════
//  CAPTURE ENGINE
// ═══════════════════════════════════════════════════════════════
function capture(type, args, stack, force) {
    // Capture everything — page scripts, userscripts, extensions, all of it.
    const lines    = usLines(stack);
    const allLines = stack.split('\n').slice(1).filter(l => l.trim());
    const scriptName = extractScriptName(stack) || extractScriptName(lines.join('\n')) || (isUsSource(stack) ? 'Userscript' : 'Page');
    const srcLine  = lines[0] || allLines[0] || '';
    let message, formatParts = null, tableData = null;

    if (type === 'table') {
        tableData = parseTableData(args[0]);
        message   = `console.table — ${Array.isArray(args[0]) ? args[0].length + ' rows' : Object.keys(args[0] || {}).length + ' keys'}`;
    } else {
        formatParts = parseFormatArgs(args);
        message = formatParts
            ? formatParts.map(p => p.text).join('')
            : args.map(a => { if (typeof a === 'string') return a; if (a instanceof Error) return `${a.name}: ${a.message}`; try { return JSON.stringify(a, null, 2); } catch { return String(a); } }).join(' ');
    }

    const now  = new Date();
    const ts   = now.getTime();
    const time = now.toLocaleTimeString('en-US', { hour12: false }) + '.' + String(now.getMilliseconds()).padStart(3, '0');
    const src  = srcLine ? srcLine.trim().replace(/^at\s+/, '') : '';

    // Deduplication — O(1) via entryMap
    const dk = `${type}:${message}`;
    if (dedupeMap[dk] !== undefined) {
        const ex = entryMap.get(dedupeMap[dk]);
        if (ex) {
            ex.count++; ex.lastTime = time; ex.lastTs = ts;
            if (logList && !capturePaused) updateDedupe(ex.id, ex.count, time, ts - ex.firstTs);
            regScript(scriptName, type);
            updateHandleBadge();
            return;
        }
    }

    const id    = ++entryId;
    const entry = { id, type, time, ts, firstTs: ts, lastTs: ts, message, source: src, stack: lines.join('\n'), scriptName, count: 1, formatParts, tableData, pinned: false };
    entries.push(entry);
    entryMap.set(id, entry);
    dedupeMap[dk] = id;
    regScript(scriptName, type);

    if (capturePaused) {
        captureBuffer.push(entry);
        updatePauseBanner();
    } else {
        if (logList) renderEntry(entry);
    }

    // updateHandleBadge is called by updateFooterCounts — don't call it twice
    updateFooterCounts();
    if (persistHist && (type === 'error' || type === 'warn')) saveEntry(entry);
    if (activeTab !== 'console') { tabUnread.console++; updateTabUnread('console'); }

    // Auto-open on first error
    if (type === 'error' && autoOpenOnErr && !panelVisible && !autoOpenFired) {
        autoOpenFired = true;
        if (panel) { panel.classList.add('on'); panelVisible = true; switchTab('console', true); }
    }
}

// ═══════════════════════════════════════════════════════════════
//  CONSOLE PATCHING
// ═══════════════════════════════════════════════════════════════
const _c = {
    log: console.log.bind(console), warn: console.warn.bind(console),
    error: console.error.bind(console), info: console.info.bind(console),
    debug: console.debug.bind(console), trace: console.trace?.bind(console),
    table: console.table?.bind(console), time: console.time?.bind(console),
    timeEnd: console.timeEnd?.bind(console), assert: console.assert?.bind(console),
    dir: console.dir?.bind(console),
};
['log','warn','error','info','debug'].forEach(m => {
    console[m] = function (...a) { _c[m](...a); capture(m, a, getStack()); };
});
if (console.trace)   console.trace   = function (...a) { _c.trace?.(...a);  capture('log', ['trace:', ...a], getStack()); };
if (console.table)   console.table   = function (d, c)  { _c.table?.(d, c); capture('table', [d], getStack()); };
if (console.time)    console.time    = function (l = 'default') { _c.time?.(l);  perfTimers[l] = performance.now(); };
if (console.timeEnd) console.timeEnd = function (l = 'default') {
    _c.timeEnd?.(l);
    if (perfTimers[l] != null) { const ms = (performance.now()-perfTimers[l]).toFixed(2); capture('info', [`Timer "${l}": ${ms}ms`], getStack()); delete perfTimers[l]; }
};
if (console.assert) console.assert = function (cond, ...a) {
    _c.assert?.(cond, ...a);
    if (!cond) capture('error', ['Assertion failed:', ...(a.length ? a : ['console.assert'])], getStack());
};
if (console.dir) console.dir = function (o) { _c.dir?.(o); capture('log', [o], getStack()); };

window.addEventListener('error', e => {
    capture('error', [`${e.message} (${e.filename}:${e.lineno}:${e.colno})`], e.error?.stack||'', true);
}, true);
window.addEventListener('unhandledrejection', e => {
    const r = e.reason;
    capture('error', [r instanceof Error ? `Unhandled Promise: ${r.message}` : `Unhandled Promise: ${String(r)}`], r?.stack||'', true);
}, true);
document.addEventListener('securitypolicyviolation', e => {
    capture('error', [`CSP Violation: "${e.violatedDirective}" blocked "${e.blockedURI}" [${e.disposition}] at ${e.sourceFile}:${e.lineNumber}`], '', true);
});

// ═══════════════════════════════════════════════════════════════
//  NETWORK INTERCEPTION — XHR (request + response bodies)
// ═══════════════════════════════════════════════════════════════
const _XOpen = XMLHttpRequest.prototype.open;
const _XSend = XMLHttpRequest.prototype.send;
XMLHttpRequest.prototype.open = function (method, url, ...rest) {
    const stack = getStack();
    this._ss = { id: ++netId, type: 'xhr', method: (method||'GET').toUpperCase(), url: String(url), status: 'pending', duration: 0, size: 0, startTime: null, scriptName: extractScriptName(stack)||'Page', reqBody: null, resBody: null };
    return _XOpen.call(this, method, url, ...rest);
};
XMLHttpRequest.prototype.send = function (body) {
    if (this._ss) {
        try {
            if (body != null) {
                this._ss.reqBody = typeof body === 'string' ? body.slice(0, 2000) :
                                   body instanceof FormData ? '[FormData]' :
                                   body instanceof ArrayBuffer ? `[ArrayBuffer ${body.byteLength}b]` :
                                   String(body).slice(0, 2000);
            }
        } catch (_) {}
        this._ss.startTime = performance.now();
        netEntries.push(this._ss);
        if (netList && !capturePaused) renderNetEntry(this._ss);
        const req = this._ss;
        // Use loadend only — it fires for success, error, and abort.
        // Adding separate error/abort listeners caused fin() to run twice on failures.
        this.addEventListener('loadend', () => {
            // status 0 = network error or abort
            req.status   = this.status || 0;
            req.duration = Math.round(performance.now() - req.startTime);
            // Guard responseType before touching responseText (throws on 'json', 'blob', etc.)
            try {
                if (!this.responseType || this.responseType === '' || this.responseType === 'text') {
                    req.size    = this.responseText?.length ?? 0;
                    if (this.responseText) req.resBody = this.responseText.slice(0, 2000);
                } else if (this.responseType === 'json') {
                    if (this.response != null) {
                        const s = JSON.stringify(this.response);
                        req.size = s.length; req.resBody = s.slice(0, 2000);
                    }
                } else {
                    req.size = this.response?.byteLength ?? this.response?.size ?? 0;
                    req.resBody = `[${this.responseType}, ${req.size}b]`;
                }
            } catch (_) {}
            if (netList) updateNetEntry(req);
            updateNetBadge();
            if (activeTab !== 'network') { tabUnread.network++; updateTabUnread('network'); }
        });
    }
    return _XSend.call(this, body);
};

// ═══════════════════════════════════════════════════════════════
//  NETWORK INTERCEPTION — fetch (request + response bodies)
// ═══════════════════════════════════════════════════════════════
if (typeof window.fetch === 'function') {
    const _f = window.fetch;
    window.fetch = function (...args) {
        const stack = getStack(), input = args[0], init = args[1] || {};
        const url    = typeof input === 'string' ? input : (input?.url || String(input));
        const method = (init.method || (typeof input === 'object' && input?.method) || 'GET').toUpperCase();
        let reqBody  = null;
        try {
            if (init.body != null) {
                reqBody = typeof init.body === 'string' ? init.body.slice(0, 2000) :
                          init.body instanceof FormData ? '[FormData]' :
                          init.body instanceof ArrayBuffer ? `[ArrayBuffer ${init.body.byteLength}b]` :
                          String(init.body).slice(0, 2000);
            }
        } catch (_) {}
        const entry = { id: ++netId, type: 'fetch', method, url, status: 'pending', duration: 0, size: 0, startTime: performance.now(), scriptName: extractScriptName(stack)||'Page', reqBody, resBody: null };
        netEntries.push(entry);
        if (netList && !capturePaused) renderNetEntry(entry);
        return _f.apply(this, args)
            .then(res => {
                entry.status = res.status; entry.statusText = res.statusText || '';
                entry.duration = Math.round(performance.now() - entry.startTime);
                try {
                    res.clone().text().then(txt => {
                        entry.resBody = txt.slice(0, 2000); entry.size = txt.length;
                        if (netList) updateNetEntry(entry);
                    }).catch(() => {});
                } catch (_) {}
                if (netList) updateNetEntry(entry);
                updateNetBadge();
                if (activeTab !== 'network') { tabUnread.network++; updateTabUnread('network'); }
                return res;
            })
            .catch(err => {
                entry.status = 'error'; entry.duration = Math.round(performance.now() - entry.startTime);
                if (netList) updateNetEntry(entry); updateNetBadge(); throw err;
            });
    };
}

// ═══════════════════════════════════════════════════════════════
//  STORAGE CHANGE MONITOR
// ═══════════════════════════════════════════════════════════════
(function patchStorage() {
    try {
        const _setItem    = Storage.prototype.setItem;
        const _removeItem = Storage.prototype.removeItem;
        const _clear      = Storage.prototype.clear;
        Storage.prototype.setItem = function (k, v) {
            const old = this.getItem(k); _setItem.call(this, k, v);
            logStorageChange('set', this === localStorage ? 'localStorage' : 'sessionStorage', k, old, v);
        };
        Storage.prototype.removeItem = function (k) {
            const old = this.getItem(k); _removeItem.call(this, k);
            logStorageChange('remove', this === localStorage ? 'localStorage' : 'sessionStorage', k, old, null);
        };
        Storage.prototype.clear = function () {
            _clear.call(this);
            logStorageChange('clear', this === localStorage ? 'localStorage' : 'sessionStorage', '*', null, null);
        };
    } catch (_) {}
})();

function logStorageChange(op, store, key, oldVal, newVal) {
    const now  = new Date();
    const time = now.toLocaleTimeString('en-US', { hour12: false }) + '.' + String(now.getMilliseconds()).padStart(3, '0');
    const change = { op, store, key, oldVal: oldVal != null ? String(oldVal).slice(0, 200) : null, newVal: newVal != null ? String(newVal).slice(0, 200) : null, time };
    storageChanges.push(change);
    if (storageChangeList) renderStorageChange(change);
    if (activeTab !== 'storage') { tabUnread.storage++; updateTabUnread('storage'); }
}

// ═══════════════════════════════════════════════════════════════
//  PERSISTENCE
// ═══════════════════════════════════════════════════════════════
function saveEntry(entry) {
    try {
        let h = GM_getValue('ss_hist', '[]'); if (typeof h === 'string') h = JSON.parse(h); if (!Array.isArray(h)) h = [];
        h.push({ type: entry.type, time: entry.time, message: entry.message, source: entry.source, scriptName: entry.scriptName, url: location.href });
        if (h.length > maxHist) h = h.slice(-maxHist);
        GM_setValue('ss_hist', JSON.stringify(h));
    } catch (_) {}
}
function loadHistory() {
    if (!persistHist) return;
    try {
        let h = GM_getValue('ss_hist', '[]'); if (typeof h === 'string') h = JSON.parse(h); if (!Array.isArray(h) || !h.length) return;
        h.filter(x => x.url === location.href).forEach(x => {
            const id = ++entryId;
            const e = { id, type: x.type||'error', time: x.time||'', ts: 0, firstTs: 0, lastTs: 0, message: x.message||'', source: x.source||'', stack: '', scriptName: x.scriptName||'Unknown', count: 1, persisted: true, fromUrl: x.url||'', pinned: false };
            entries.push(e);
            entryMap.set(id, e);
        });
    } catch (_) {}
}

// ═══════════════════════════════════════════════════════════════
//  CLIPBOARD / AI / EXPORT
// ═══════════════════════════════════════════════════════════════
function copyText(t) {
    try { if (typeof GM_setClipboard === 'function') { GM_setClipboard(t); return; } } catch (_) {}
    try { navigator.clipboard?.writeText(t); } catch (_) {}
}
function flashBtn(btn, msg, ms = 2000) {
    const orig = btn.textContent; btn.textContent = msg;
    setTimeout(() => { btn.textContent = orig; }, ms);
}
function dlBlob(blob, name) {
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click();
    setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(a.href); }, 1000);
}
function exportConsole(fmt) {
    const vis  = entries.filter(conMatchFn());
    const blob = fmt === 'json'
        ? new Blob([JSON.stringify(vis.map(e => ({ time: e.time, type: e.type, script: e.scriptName, message: e.message, source: e.source })), null, 2)], { type: 'application/json' })
        : new Blob([vis.map(e => `[${e.time}] [${e.type.toUpperCase()}] [${e.scriptName}] ${e.message}`).join('\n')], { type: 'text/plain' });
    dlBlob(blob, `scriptspy-console-${Date.now()}.${fmt === 'json' ? 'json' : 'txt'}`);
}
function exportNet() {
    dlBlob(new Blob([JSON.stringify(netEntries.map(e => ({ type: e.type, method: e.method, url: e.url, status: e.status, duration: e.duration, script: e.scriptName, reqBody: e.reqBody, resBody: e.resBody })), null, 2)], { type: 'application/json' }), `scriptspy-network-${Date.now()}.json`);
}
function exportStorage() {
    dlBlob(new Blob([JSON.stringify(buildStorageData(), null, 2)], { type: 'application/json' }), `scriptspy-storage-${Date.now()}.json`);
}
function copyAsFetch(e) {
    const bodyPart = e.reqBody ? `,\n  body: ${JSON.stringify(e.reqBody)}` : '';
    copyText(`fetch(${JSON.stringify(e.url)}, {\n  method: ${JSON.stringify(e.method)}${bodyPart}\n});`);
}
function aiPrompt(e) {
    return `USERSCRIPT ERROR ANALYSIS\n\nScript: ${e.scriptName}\nPage: ${location.href}\nType: ${e.type.toUpperCase()}\nTime: ${e.time}\n\nMessage:\n${e.message}\n\nStack Trace:\n${e.stack||'Not available'}\n\nPlease analyze this error and suggest a fix.`;
}
function buildSelectedAIReport() {
    const sel = entries.filter(e => selectedIds.has(e.id));
    if (!sel.length) return '';
    const lines = [];
    lines.push('╔══════════════════════════════════════════════════════════╗');
    lines.push('║        SCRIPTSPY SELECTED ENTRIES REPORT                 ║');
    lines.push('╚══════════════════════════════════════════════════════════╝');
    lines.push('');
    lines.push(`Page URL : ${location.href}`);
    lines.push(`Selected : ${sel.length} entries`);
    lines.push('');
    sel.forEach((e, i) => {
        lines.push('─'.repeat(55));
        lines.push(`[${i+1}] ${e.type.toUpperCase()}  [${e.scriptName}]  ${e.time}${e.count > 1 ? `  (x${e.count})` : ''}`);
        lines.push(`  ${e.message}`);
        if (e.source) lines.push(`  @ ${e.source}`);
        if (e.stack)  lines.push(`  Stack:\n${e.stack.split('\n').map(l => '    '+l).join('\n')}`);
        lines.push('');
    });
    return lines.join('\n');
}

// ═══════════════════════════════════════════════════════════════
//  AI REPORT BUILDER
// ═══════════════════════════════════════════════════════════════
function buildAIReport() {
    const now = new Date().toLocaleString();
    const lines = [];
    const hr = s => `${'─'.repeat(60)}\n${s}\n${'─'.repeat(60)}`;
    const sh = s => `\n── ${s} ──`;

    lines.push('╔══════════════════════════════════════════════════════════╗');
    lines.push('║           SCRIPTSPY DIAGNOSTIC REPORT                   ║');
    lines.push('╚══════════════════════════════════════════════════════════╝');
    lines.push('');
    lines.push(`Generated   : ${now}`);
    lines.push(`Page URL    : ${location.href}`);
    lines.push(`Page Title  : ${document.title||'(none)'}`);
    lines.push(`Scope       : This page only`);
    lines.push(`User Agent  : ${navigator.userAgent}`);
    try { const gm = typeof GM_info !== 'undefined' ? GM_info : null; if (gm) { lines.push(`Script Mgr  : ${gm.scriptHandler||'Tampermonkey'} v${gm.version||'?'}`); lines.push(`ScriptSpy   : v${VERSION}`); } } catch (_) {}
    lines.push('');

    const snames = Object.keys(scriptReg);
    if (snames.length) {
        lines.push(hr('ACTIVE USERSCRIPTS'));
        snames.forEach(name => {
            const r = scriptReg[name];
            const flags = [];
            if (r.errors > 0) flags.push(`${r.errors} error${r.errors>1?'s':''}`);
            if (r.warns  > 0) flags.push(`${r.warns} warning${r.warns>1?'s':''}`);
            const health = r.status==='error' ? '[ERRORS]' : r.status==='warn' ? '[WARNINGS]' : '[OK]';
            lines.push(`  ${health} ${name}`);
            if (flags.length) lines.push(`          Issues: ${flags.join(', ')}`);
            if (r.logs+r.infos > 0) lines.push(`          Logs/Info: ${r.logs+r.infos}`);
            if (r.lastSeen) lines.push(`          Last activity: ${r.lastSeen}`);
        });
        lines.push('');
    }

    const errors = entries.filter(e => e.type === 'error');
    if (errors.length) {
        lines.push(hr(`ERRORS  (${errors.length} total)`));
        errors.forEach((e, i) => {
            lines.push(''); lines.push(`[Error ${i+1}]`);
            lines.push(`  Time     : ${e.time}${e.count>1?`  (repeated ${e.count}x)`:''}`);
            lines.push(`  Script   : ${e.scriptName}`);
            lines.push(`  Message  : ${e.message}`);
            if (e.source) lines.push(`  Source   : ${e.source}`);
            if (e.stack)  lines.push(`  Stack    :\n${e.stack.split('\n').map(l=>'    '+l).join('\n')}`);
        });
        lines.push('');
    } else { lines.push(hr('ERRORS')); lines.push('  No errors captured.'); lines.push(''); }

    const warns = entries.filter(e => e.type === 'warn');
    if (warns.length) {
        lines.push(hr(`WARNINGS  (${warns.length} total)`));
        warns.forEach((e, i) => {
            lines.push(`[Warning ${i+1}]  ${e.time}  [${e.scriptName}]${e.count>1?`  (x${e.count})`:''}`);
            lines.push(`  ${e.message}`);
            if (e.source) lines.push(`  @ ${e.source}`);
        });
        lines.push('');
    }

    const netFails = netEntries.filter(e => e.status==='error'||(typeof e.status==='number'&&e.status>=400));
    if (netFails.length) {
        lines.push(hr(`NETWORK FAILURES  (${netFails.length} total)`));
        netFails.forEach((e, i) => {
            lines.push(`[Request ${i+1}]`);
            lines.push(`  ${e.type.toUpperCase()}  ${e.method}  ${e.status}  ${e.duration}ms`);
            lines.push(`  URL: ${e.url}`);
            lines.push(`  Script: ${e.scriptName}`);
            if (e.reqBody) lines.push(`  Request Body:\n    ${e.reqBody.slice(0,500)}`);
            if (e.resBody) lines.push(`  Response Body:\n    ${e.resBody.slice(0,500)}`);
        });
        lines.push('');
    }

    const infoLogs = entries.filter(e => e.type==='info'||e.type==='log');
    if (infoLogs.length) {
        lines.push(hr(`CONSOLE LOGS  (${infoLogs.length} entries)`));
        infoLogs.slice(-40).forEach(e => {
            const rep = e.count>1?` (x${e.count})`:'';
            lines.push(`  [${e.time}] [${e.type.toUpperCase()}] [${e.scriptName}]${rep}  ${e.message.slice(0,200)}${e.message.length>200?'…':''}`);
        });
        if (infoLogs.length>40) lines.push(`  … (${infoLogs.length-40} earlier entries omitted)`);
        lines.push('');
    }

    if (netEntries.length) {
        const ok  = netEntries.filter(e=>typeof e.status==='number'&&e.status>=200&&e.status<300).length;
        const red = netEntries.filter(e=>typeof e.status==='number'&&e.status>=300&&e.status<400).length;
        const err = netEntries.filter(e=>e.status==='error'||(typeof e.status==='number'&&e.status>=400)).length;
        const pnd = netEntries.filter(e=>e.status==='pending').length;
        lines.push(hr(`NETWORK SUMMARY  (${netEntries.length} requests)`));
        lines.push(`  2xx Success : ${ok}`);
        lines.push(`  3xx Redirect: ${red}`);
        lines.push(`  4xx/5xx Err : ${err}`);
        lines.push(`  Pending     : ${pnd}`);
        const slow = netEntries.filter(e=>typeof e.duration==='number'&&e.duration>2000);
        if (slow.length) { lines.push(sh('Slow Requests (>2s)')); slow.forEach(e=>lines.push(`  ${e.duration}ms  ${e.method}  ${e.url}`)); }
        lines.push('');
    }

    try {
        const gmKeys = typeof GM_listValues==='function' ? (GM_listValues()||[]) : [];
        if (gmKeys.length) {
            lines.push(hr('GM STORAGE KEYS'));
            gmKeys.forEach(k => {
                let preview;
                try {
                    const v = GM_getValue(k);
                    if (typeof v==='boolean') preview=String(v);
                    else if (typeof v==='number') preview=String(v);
                    else if (typeof v==='string'&&v.length<60) preview=JSON.stringify(v);
                    else if (typeof v==='string') preview=`"[string, ${v.length} chars]"`;
                    else preview=`[${typeof v}]`;
                } catch { preview='[error reading]'; }
                lines.push(`  ${k} = ${preview}`);
            });
            lines.push('');
        }
    } catch (_) {}

    lines.push(hr('HOW TO USE THIS REPORT'));
    lines.push('Paste this entire report into your AI assistant and describe what');
    lines.push('your userscript is supposed to do. Ask it to:');
    lines.push('  1. Identify the root cause of each error');
    lines.push('  2. Explain why each error is occurring');
    lines.push('  3. Suggest specific code fixes');
    lines.push('  4. Flag network failures that may be causing issues');
    lines.push('');
    return lines.join('\n');
}

function buildStorageData() {
    const out = {};
    const tab = stSubTab === 'changes' ? 'gm' : stSubTab;
    if (tab === 'gm') {
        try { (GM_listValues()||[]).forEach(k => { try { out[k] = GM_getValue(k); } catch (_) {} }); } catch (_) {}
    } else if (tab === 'local') {
        try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); out[k] = localStorage.getItem(k); } } catch (_) {}
    } else if (tab === 'session') {
        try { for (let i = 0; i < sessionStorage.length; i++) { const k = sessionStorage.key(i); out[k] = sessionStorage.getItem(k); } } catch (_) {}
    } else if (tab === 'cookie') {
        try { document.cookie.split(';').forEach(pair => { const [k, v] = pair.split('='); if (k) out[k.trim()] = decodeURIComponent((v||'').trim()); }); } catch (_) {}
    }
    return out;
}

// ═══════════════════════════════════════════════════════════════
//  STYLES
// ═══════════════════════════════════════════════════════════════
function injectStyles() {
    GM_addStyle(`
    :root{--B:#0d1117;--B2:#161b22;--B3:#21262d;--BD:#30363d;--A:#7c3aed;--A2:#a855f7;
          --T:#e6edf3;--M:#8b949e;--E:#f85149;--W:#d29922;--I:#58a6ff;--L:#3fb950;
          --D:#8b949e;--R:10px;--PIN:#f0a500;
          --SH:0 24px 64px rgba(0,0,0,.85),0 0 0 1px rgba(124,58,237,.25);
          --F:'SF Mono','Fira Code','Cascadia Code',ui-monospace,monospace;}
    /* ── Floating panel ── */
    #ss-pan{position:fixed;bottom:24px;right:24px;width:740px;max-width:calc(100vw - 48px);
      height:580px;max-height:calc(100vh - 80px);background:var(--B);border:1px solid var(--BD);
      border-radius:var(--R);box-shadow:var(--SH);z-index:2147483645;display:flex;flex-direction:column;
      font-family:var(--F);font-size:12px;color:var(--T);
      opacity:0;transform:translateY(16px) scale(.97);pointer-events:none;
      transition:opacity .22s ease,transform .22s cubic-bezier(.34,1.56,.64,1);overflow:hidden;}
    #ss-pan.on{opacity:1;transform:translateY(0) scale(1);pointer-events:all;}
    /* ── Docked mode ── */
    #ss-pan.docked{bottom:0!important;right:0!important;top:0!important;left:auto!important;
      height:100vh!important;max-height:100vh!important;
      width:min(740px,calc(100vw - 28px))!important;max-width:none!important;
      border-radius:0!important;opacity:1!important;pointer-events:all!important;
      transform:translateX(calc(100% - 28px))!important;
      transition:transform .32s cubic-bezier(.4,0,.2,1)!important;
      box-shadow:-6px 0 40px rgba(0,0,0,.7),0 0 0 1px rgba(124,58,237,.2)!important;}
    #ss-pan.docked.dock-open{transform:translateX(0)!important;}
    /* ── Dock handle strip ── */
    #ss-handle{display:none;position:absolute;left:0;top:0;width:28px;height:100%;
      background:linear-gradient(180deg,var(--A) 0%,var(--A2) 100%);
      cursor:pointer;z-index:3;flex-direction:column;align-items:center;justify-content:center;gap:8px;
      border-right:1px solid rgba(168,85,247,.3);transition:background .2s;}
    #ss-handle:hover{background:linear-gradient(180deg,#6d28d9 0%,var(--A) 100%);}
    #ss-pan.docked #ss-handle{display:flex;}
    #ss-hlbl{writing-mode:vertical-rl;transform:rotate(180deg);font-family:var(--F);
      font-size:9px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;
      color:#fff;pointer-events:none;user-select:none;opacity:.9;}
    /* Handle error badge */
    #ss-hbdg{display:flex;align-items:center;justify-content:center;min-width:18px;height:18px;
      padding:0 4px;border-radius:9px;background:var(--E);color:#fff;
      font-family:var(--F);font-size:10px;font-weight:800;
      box-shadow:0 2px 8px rgba(248,81,73,.6);opacity:0;transition:opacity .2s;
      pointer-events:none;user-select:none;}
    #ss-hbdg.on{opacity:1;}
    @keyframes ssPulse{0%{transform:scale(.7)}60%{transform:scale(1.3)}100%{transform:scale(1)}}
    /* ── Header ── */
    #ss-hdr{display:flex;align-items:center;gap:8px;padding:8px 14px;background:var(--B2);
      border-bottom:1px solid var(--BD);cursor:move;user-select:none;flex-shrink:0;}
    #ss-hdr-t{font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;
      background:linear-gradient(90deg,var(--A2),#c084fc);-webkit-background-clip:text;
      -webkit-text-fill-color:transparent;background-clip:text;flex-shrink:0;}
    #ss-hdr-u{flex:1;font-size:10px;color:var(--M);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0;}
    .ss-hac{display:flex;gap:5px;margin-left:auto;flex-shrink:0;}
    /* ── Buttons ── */
    .ss-btn{padding:3px 9px;border-radius:5px;border:1px solid var(--BD);background:var(--B3);
      color:var(--M);font-family:var(--F);font-size:10px;font-weight:600;cursor:pointer;
      transition:background .15s,color .15s,border-color .15s;white-space:nowrap;}
    .ss-btn:hover{background:var(--BD);color:var(--T);}
    .ss-btn.dng:hover{background:rgba(248,81,73,.2);color:var(--E);border-color:var(--E);}
    .ss-btn.pri{background:rgba(124,58,237,.2);color:var(--A2);border-color:rgba(124,58,237,.4);}
    .ss-btn.pri:hover{background:rgba(124,58,237,.35);}
    .ss-btn.on{background:rgba(255,193,0,.15);color:#fbbf24;border-color:rgba(251,191,36,.4);}
    .ss-btn.on:hover{background:rgba(255,193,0,.28);}
    .ss-airpt{background:rgba(63,185,80,.12);color:var(--L);border-color:rgba(63,185,80,.35);font-weight:700;}
    .ss-airpt:hover{background:rgba(63,185,80,.25);color:#4ade80;border-color:rgba(63,185,80,.6);}
    .ss-airpt.ok{background:rgba(63,185,80,.3);color:#4ade80;border-color:var(--L);animation:ssAiPop .25s cubic-bezier(.34,1.56,.64,1);}
    @keyframes ssAiPop{from{transform:scale(.92)}to{transform:scale(1)}}
    /* ── Tabs ── */
    #ss-tabs{display:flex;background:var(--B2);border-bottom:1px solid var(--BD);flex-shrink:0;overflow-x:auto;}
    #ss-tabs::-webkit-scrollbar{display:none;}
    .ss-tab{padding:7px 13px;font-size:10px;font-weight:600;color:var(--M);cursor:pointer;
      border-bottom:2px solid transparent;transition:color .15s,border-color .15s;
      white-space:nowrap;display:flex;align-items:center;gap:5px;
      letter-spacing:.04em;text-transform:uppercase;flex-shrink:0;position:relative;}
    .ss-tab:hover{color:var(--T);}
    .ss-tab.on{color:var(--A2);border-bottom-color:var(--A2);}
    .ss-tbdg{display:inline-flex;align-items:center;justify-content:center;min-width:15px;height:15px;
      padding:0 3px;border-radius:7px;font-size:9px;font-weight:700;background:rgba(255,255,255,.08);}
    .ss-tbdg.e{background:rgba(248,81,73,.2);color:var(--E);}
    .ss-tab-unread{position:absolute;top:5px;right:3px;width:5px;height:5px;border-radius:50%;
      background:var(--A2);display:none;box-shadow:0 0 5px rgba(168,85,247,.8);}
    .ss-tab-unread.on{display:block;}
    /* ── Pause banner ── */
    #ss-pause-banner{display:none;background:rgba(255,193,0,.1);border-bottom:1px solid rgba(251,191,36,.25);
      padding:4px 10px;font-size:10px;color:#fbbf24;font-weight:600;flex-shrink:0;
      align-items:center;gap:8px;justify-content:space-between;}
    #ss-pause-banner.on{display:flex;}
    /* ── Multi-select bar ── */
    #ss-sel-bar{display:none;align-items:center;gap:6px;padding:4px 10px;
      background:rgba(124,58,237,.1);border-bottom:1px solid rgba(124,58,237,.25);
      font-size:10px;color:var(--A2);flex-shrink:0;}
    #ss-sel-bar.on{display:flex;}
    /* ── Tab content ── */
    .ss-tc{display:none;flex-direction:column;flex:1;overflow:hidden;min-height:0;}
    .ss-tc.on{display:flex;}
    /* ── Console toolbar ── */
    .ss-ctb{display:flex;align-items:center;gap:5px;padding:6px 10px;background:var(--B2);
      border-bottom:1px solid var(--BD);flex-shrink:0;flex-wrap:wrap;row-gap:4px;}
    .ss-fb{padding:3px 8px;border-radius:20px;border:1px solid transparent;background:transparent;
      color:var(--M);font-family:var(--F);font-size:10px;font-weight:600;cursor:pointer;
      transition:all .15s;display:flex;align-items:center;gap:4px;}
    .ss-fb:hover{color:var(--T);background:var(--B3);}
    .ss-fb.on{background:var(--B3);border-color:var(--BD);color:var(--T);}
    .ss-fb.on.te{border-color:var(--E);color:var(--E);}.ss-fb.on.tw{border-color:var(--W);color:var(--W);}
    .ss-fb.on.ti{border-color:var(--I);color:var(--I);}.ss-fb.on.tl{border-color:var(--L);color:var(--L);}
    .ss-fb.on.tt{border-color:var(--A);color:var(--A2);}
    /* Hide Page toggle */
    .ss-fb.hide-pg{border-color:transparent;}
    .ss-fb.hide-pg.on{border-color:var(--W);color:var(--W);background:rgba(210,153,34,.1);}
    .ss-fc{display:inline-flex;align-items:center;justify-content:center;min-width:14px;height:14px;
      padding:0 3px;border-radius:7px;font-size:9px;font-weight:700;background:rgba(255,255,255,.07);}
    #ss-sw{flex:1;min-width:80px;display:flex;align-items:center;gap:4px;}
    #ss-srch{flex:1;background:var(--B3);border:1px solid var(--BD);border-radius:5px;
      padding:3px 8px;color:var(--T);font-family:var(--F);font-size:11px;outline:none;transition:border-color .15s;}
    #ss-srch:focus{border-color:var(--A);}
    #ss-srch::placeholder{color:var(--M);}
    #ss-rx{padding:2px 6px;border-radius:4px;border:1px solid var(--BD);background:var(--B3);
      color:var(--M);font-family:var(--F);font-size:10px;cursor:pointer;transition:all .15s;}
    #ss-rx.on{border-color:var(--A);color:var(--A2);background:rgba(124,58,237,.15);}
    #ss-sf{background:var(--B3);border:1px solid var(--BD);border-radius:5px;padding:3px 6px;
      color:var(--T);font-family:var(--F);font-size:10px;outline:none;cursor:pointer;max-width:120px;}
    /* ── Scrollable lists ── */
    .ss-ll{flex:1;overflow-y:auto;overflow-x:hidden;padding:2px 0;scroll-behavior:smooth;}
    .ss-ll::-webkit-scrollbar{width:5px;}
    .ss-ll::-webkit-scrollbar-thumb{background:var(--BD);border-radius:3px;}
    .ss-ll::-webkit-scrollbar-thumb:hover{background:var(--M);}
    /* ── Console entries ── */
    .ss-e{display:flex;gap:7px;padding:5px 10px;border-bottom:1px solid rgba(48,54,61,.4);
      transition:background .1s;align-items:flex-start;animation:ssIn .12s ease both;
      border-left:3px solid transparent;cursor:pointer;}
    .ss-e:hover{background:rgba(255,255,255,.025);}
    .ss-e.pinned{border-left-color:var(--PIN);background:rgba(240,165,0,.04);}
    .ss-e.selected{background:rgba(124,58,237,.1);border-left-color:var(--A2);}
    @keyframes ssIn{from{opacity:0;transform:translateX(5px)}to{opacity:1;transform:none}}
    /* Checkbox — hidden until multi-select active */
    .ss-e-check{flex-shrink:0;display:none;margin-top:2px;width:14px;height:14px;
      border-radius:3px;border:1px solid var(--BD);cursor:pointer;
      background:var(--B3);accent-color:var(--A);}
    .selecting .ss-e-check{display:block;}
    .ss-ebdg{flex-shrink:0;margin-top:1px;padding:1px 4px;border-radius:3px;font-size:8.5px;
      font-weight:700;letter-spacing:.05em;text-transform:uppercase;min-width:34px;text-align:center;}
    .ss-e.te .ss-ebdg{background:rgba(248,81,73,.2);color:var(--E);}
    .ss-e.tw .ss-ebdg{background:rgba(210,153,34,.2);color:var(--W);}
    .ss-e.ti .ss-ebdg{background:rgba(88,166,255,.2);color:var(--I);}
    .ss-e.tl .ss-ebdg{background:rgba(63,185,80,.2);color:var(--L);}
    .ss-e.td .ss-ebdg{background:rgba(139,148,158,.15);color:var(--D);}
    .ss-e.tt .ss-ebdg{background:rgba(124,58,237,.2);color:var(--A2);}
    .ss-escr{flex-shrink:0;margin-top:1px;padding:1px 5px;border-radius:3px;font-size:8.5px;
      font-weight:600;background:rgba(255,255,255,.05);color:var(--M);
      max-width:110px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
    .ss-escr.us{background:rgba(124,58,237,.15);color:var(--A2);}
    .ss-ebody{flex:1;min-width:0;}
    .ss-emsg{word-break:break-word;white-space:pre-wrap;line-height:1.5;font-size:11px;}
    .ss-e.te .ss-emsg{color:var(--E);}.ss-e.tw .ss-emsg{color:var(--W);}
    .ss-e.ti .ss-emsg,.ss-e.tl .ss-emsg,.ss-e.tt .ss-emsg{color:var(--T);}
    .ss-e.td .ss-emsg{color:var(--M);}
    .ss-esrc{margin-top:2px;font-size:9.5px;color:var(--M);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
    /* Stack — click-to-expand */
    .ss-stk{display:none;margin-top:4px;padding:5px 7px;background:var(--B3);border-radius:4px;
      font-size:9.5px;color:var(--M);white-space:pre-wrap;word-break:break-all;
      line-height:1.6;border-left:2px solid var(--BD);position:relative;}
    .ss-stk.open{display:block;}
    .ss-stk-copy{position:absolute;top:3px;right:4px;padding:1px 5px;border-radius:3px;
      border:1px solid var(--BD);background:transparent;color:var(--M);font-family:var(--F);
      font-size:9px;cursor:pointer;transition:all .15s;}
    .ss-stk-copy:hover{background:var(--B3);color:var(--T);}
    .ss-efoot{display:flex;align-items:center;gap:6px;margin-top:3px;flex-wrap:wrap;}
    .ss-etime{font-size:9px;color:var(--M);}
    .ss-dd{padding:0 5px;height:14px;border-radius:7px;font-size:9px;font-weight:700;
      background:rgba(248,81,73,.2);color:var(--E);display:inline-flex;align-items:center;}
    .ss-rate{font-size:9px;color:var(--W);}
    .ss-ai,.ss-pin,.ss-hide{padding:1px 5px;border-radius:4px;border:1px solid transparent;background:transparent;
      font-family:var(--F);font-size:9px;cursor:pointer;transition:all .15s;}
    .ss-ai{color:var(--M);}.ss-ai:hover{background:rgba(124,58,237,.2);color:var(--A2);border-color:var(--A);}
    .ss-pin{color:var(--M);font-size:11px;}.ss-pin:hover{color:var(--PIN);}
    .ss-pin.on{color:var(--PIN);}
    .ss-hide{color:var(--M);}.ss-hide:hover{background:rgba(248,81,73,.15);color:var(--E);border-color:rgba(248,81,73,.4);}
    .ss-prev{display:inline-block;padding:0 4px;border-radius:3px;font-size:8px;
      background:rgba(88,166,255,.15);color:var(--I);margin-right:4px;}
    .ss-e.hist{opacity:.65;}
    /* console.table */
    .ss-tbl{margin-top:5px;border-collapse:collapse;font-size:10px;max-width:100%;overflow-x:auto;display:block;}
    .ss-tbl th{padding:3px 8px;background:var(--B3);color:var(--M);border:1px solid var(--BD);font-weight:700;text-align:left;white-space:nowrap;}
    .ss-tbl td{padding:2px 8px;border:1px solid rgba(48,54,61,.5);color:var(--T);white-space:nowrap;}
    .ss-tbl tr:hover td{background:rgba(255,255,255,.03);}
    /* Muted patterns list in Tools */
    .ss-mpat{display:flex;align-items:center;gap:6px;padding:4px 6px;
      background:rgba(248,81,73,.06);border:1px solid rgba(248,81,73,.15);border-radius:4px;
      margin-bottom:4px;font-size:10px;color:var(--T);}
    .ss-mpat-txt{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--M);}
    .ss-mpat-rm{padding:1px 5px;border-radius:3px;border:1px solid var(--BD);background:transparent;
      color:var(--M);font-family:var(--F);font-size:9px;cursor:pointer;flex-shrink:0;}
    .ss-mpat-rm:hover{background:rgba(248,81,73,.2);color:var(--E);border-color:var(--E);}
    /* ── Footer ── */
    #ss-foot{padding:4px 12px;background:var(--B2);border-top:1px solid var(--BD);
      font-size:10px;color:var(--M);display:flex;align-items:center;justify-content:space-between;flex-shrink:0;gap:8px;}
    #ss-fs{display:flex;gap:10px;}
    .ss-fst{display:flex;gap:4px;align-items:center;}
    .ss-fdot{width:5px;height:5px;border-radius:50%;}
    .ss-fst.te .ss-fdot{background:var(--E);}.ss-fst.tw .ss-fdot{background:var(--W);}
    .ss-fst.tl .ss-fdot{background:var(--L);}.ss-fst.ti .ss-fdot{background:var(--I);}
    .ss-fjump{display:flex;gap:3px;}
    .ss-jbtn{padding:1px 6px;border-radius:3px;border:1px solid var(--BD);background:transparent;
      color:var(--M);font-family:var(--F);font-size:9px;cursor:pointer;transition:all .15s;}
    .ss-jbtn:hover{background:var(--B3);color:var(--T);}
    /* ── Scripts tab ── */
    .ss-shdr,.ss-srow{display:grid;grid-template-columns:1fr 58px 48px 48px 48px 76px;
      gap:6px;padding:5px 12px;border-bottom:1px solid rgba(48,54,61,.4);align-items:center;}
    .ss-shdr{background:var(--B2);border-bottom:1px solid var(--BD);flex-shrink:0;}
    .ss-shdr span{font-size:9px;font-weight:700;color:var(--M);text-transform:uppercase;letter-spacing:.05em;}
    .ss-srow{animation:ssIn .12s ease both;cursor:pointer;transition:background .1s;}
    .ss-srow:hover{background:rgba(124,58,237,.08);}
    .ss-srow:hover .ss-sn{color:var(--A2);}
    .ss-sn{font-size:11px;color:var(--T);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;transition:color .15s;}
    .ss-sst{font-size:10px;font-weight:700;}
    .ss-sst.ok{color:var(--L);}.ss-sst.error{color:var(--E);}.ss-sst.warn{color:var(--W);}
    .ss-snum{font-size:10px;color:var(--M);text-align:right;}
    .ss-snum.e{color:var(--E);}.ss-snum.w{color:var(--W);}
    .ss-stm{font-size:9px;color:var(--M);}
    /* ── Network tab ── */
    .ss-ntb{display:flex;align-items:center;gap:5px;padding:6px 10px;background:var(--B2);
      border-bottom:1px solid var(--BD);flex-shrink:0;flex-wrap:wrap;}
    .ss-nhdr,.ss-ne{display:grid;grid-template-columns:54px 50px 1fr 64px 100px;
      gap:6px;padding:5px 10px;border-bottom:1px solid rgba(48,54,61,.4);align-items:start;}
    .ss-nhdr{background:var(--B2);border-bottom:1px solid var(--BD);flex-shrink:0;}
    .ss-nhdr span{font-size:9px;font-weight:700;color:var(--M);text-transform:uppercase;letter-spacing:.05em;}
    .ss-ne{cursor:pointer;transition:background .1s;animation:ssIn .12s ease both;}
    .ss-ne:hover{background:rgba(255,255,255,.025);}
    .ss-nm{padding:1px 4px;border-radius:3px;font-size:9px;font-weight:700;text-align:center;white-space:nowrap;}
    .GET{background:rgba(63,185,80,.2);color:var(--L);}.POST{background:rgba(124,58,237,.2);color:var(--A2);}
    .PUT{background:rgba(210,153,34,.2);color:var(--W);}.PATCH{background:rgba(210,153,34,.15);color:var(--W);}
    .DELETE{background:rgba(248,81,73,.2);color:var(--E);}.FETCH{background:rgba(88,166,255,.2);color:var(--I);}
    .HEAD{background:rgba(139,148,158,.15);color:var(--D);}
    .ss-nst{font-size:10px;font-weight:700;}
    .ss-nst.ok{color:var(--L);}.ss-nst.rd{color:var(--W);}.ss-nst.er{color:var(--E);}.ss-nst.pn{color:var(--M);}
    .ss-nu{font-size:10px;color:var(--T);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
    .ss-nd{font-size:10px;color:var(--M);text-align:right;white-space:nowrap;}
    .ss-nscr{font-size:9.5px;color:var(--M);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
    .ss-nscr.us{color:var(--A2);}
    /* Network expandable detail */
    .ss-ned{display:none;grid-column:1/-1;margin-top:4px;border-radius:4px;overflow:hidden;}
    .ss-ned.open{display:block;}
    .ss-ned-sec{padding:5px 8px;background:var(--B3);font-size:9.5px;color:var(--M);
      border-left:2px solid var(--BD);word-break:break-all;white-space:pre-wrap;margin-bottom:2px;}
    .ss-ned-sec:last-child{margin-bottom:0;}
    .ss-ned-hdr{display:flex;align-items:center;justify-content:space-between;margin-bottom:3px;}
    .ss-ned-lbl{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--A2);}
    .ss-ncp{padding:1px 5px;border-radius:3px;border:1px solid var(--BD);background:transparent;
      color:var(--M);font-family:var(--F);font-size:9px;cursor:pointer;transition:all .15s;}
    .ss-ncp:hover{background:var(--B3);color:var(--T);}
    /* ── Storage tab ── */
    .ss-stabs{display:flex;background:var(--B2);border-bottom:1px solid var(--BD);flex-shrink:0;overflow-x:auto;}
    .ss-stabs::-webkit-scrollbar{display:none;}
    .ss-stab{padding:6px 12px;font-size:10px;font-weight:600;color:var(--M);cursor:pointer;
      border-bottom:2px solid transparent;transition:color .15s,border-color .15s;
      text-transform:uppercase;letter-spacing:.04em;white-space:nowrap;flex-shrink:0;
      display:flex;align-items:center;gap:4px;}
    .ss-stab:hover{color:var(--T);}
    .ss-stab.on{color:var(--A2);border-bottom-color:var(--A2);}
    .ss-stbar{display:flex;align-items:center;gap:6px;padding:6px 10px;background:var(--B2);
      border-bottom:1px solid var(--BD);flex-shrink:0;}
    .ss-stsch{flex:1;background:var(--B3);border:1px solid var(--BD);border-radius:5px;
      padding:3px 8px;color:var(--T);font-family:var(--F);font-size:11px;outline:none;}
    .ss-stsch::placeholder{color:var(--M);}
    .ss-kv{display:grid;grid-template-columns:180px 1fr 40px;gap:6px;padding:5px 10px;
      border-bottom:1px solid rgba(48,54,61,.4);align-items:start;transition:background .1s;}
    .ss-kv:hover{background:rgba(255,255,255,.025);}
    .ss-kvk{font-size:10.5px;color:var(--I);word-break:break-all;}
    .ss-kvv{font-size:10px;color:var(--T);word-break:break-all;white-space:pre-wrap;max-height:64px;overflow:hidden;}
    .ss-kvc{padding:2px 5px;border-radius:3px;border:1px solid var(--BD);background:transparent;
      color:var(--M);font-family:var(--F);font-size:9px;cursor:pointer;transition:all .15s;}
    .ss-kvc:hover{background:var(--B3);color:var(--T);}
    /* Storage changes */
    .ss-sch{display:grid;grid-template-columns:54px 90px 1fr 1fr;gap:6px;padding:5px 10px;
      border-bottom:1px solid rgba(48,54,61,.4);align-items:start;animation:ssIn .12s ease both;font-size:10px;}
    .ss-sch:hover{background:rgba(255,255,255,.025);}
    .ss-sch-op{padding:1px 5px;border-radius:3px;font-size:9px;font-weight:700;text-align:center;}
    .ss-sch-op.set{background:rgba(63,185,80,.2);color:var(--L);}
    .ss-sch-op.remove{background:rgba(248,81,73,.2);color:var(--E);}
    .ss-sch-op.clear{background:rgba(210,153,34,.2);color:var(--W);}
    /* ── Tools tab ── */
    .ss-tools{flex:1;overflow-y:auto;padding:12px;}
    .ss-tools::-webkit-scrollbar{width:5px;}
    .ss-tools::-webkit-scrollbar-thumb{background:var(--BD);border-radius:3px;}
    .ss-card{background:var(--B2);border:1px solid var(--BD);border-radius:8px;padding:12px;margin-bottom:12px;}
    .ss-card:last-child{margin-bottom:0;}
    .ss-ct{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--A2);margin-bottom:10px;}
    .ss-tr{display:flex;align-items:center;gap:8px;margin-bottom:8px;flex-wrap:wrap;}
    .ss-tr:last-child{margin-bottom:0;}
    .ss-tl{font-size:10px;color:var(--M);flex-shrink:0;}
    .ss-ti{background:var(--B3);border:1px solid var(--BD);border-radius:5px;padding:3px 8px;
      color:var(--T);font-family:var(--F);font-size:11px;outline:none;width:80px;transition:border-color .15s;}
    .ss-ti:focus{border-color:var(--A);}
    .ss-info{background:rgba(88,166,255,.07);border:1px solid rgba(88,166,255,.18);border-radius:6px;
      padding:8px 10px;font-size:10px;color:var(--I);line-height:1.7;margin-top:8px;}
    /* ── Empty state ── */
    .ss-mpty{display:flex;flex-direction:column;align-items:center;justify-content:center;
      height:100%;gap:10px;color:var(--M);font-size:11px;padding:20px;}
    .ss-mpty svg{opacity:.2;}
    .ss-mpty p{margin:0;text-align:center;line-height:1.7;}
    /* ── Resize ── */
    #ss-rsz{position:absolute;top:0;left:0;width:12px;height:12px;cursor:nw-resize;z-index:4;}
    `);
}

// ═══════════════════════════════════════════════════════════════
//  DOM HELPERS
// ═══════════════════════════════════════════════════════════════
function mkEl(tag, attrs = {}) {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
        if      (k === 'className') n.className = v;
        else if (k === 'id')        n.id = v;
        else if (k === 'text')      n.textContent = v;
        else if (k === 'data')      Object.entries(v).forEach(([dk, dv]) => (n.dataset[dk] = dv));
        else                         n.setAttribute(k, v);
    }
    return n;
}
function mkSvg(tag, attrs = {}) {
    const n = document.createElementNS('http://www.w3.org/2000/svg', tag);
    Object.entries(attrs).forEach(([k, v]) => n.setAttribute(k, v));
    return n;
}
function append(p, ...c) { c.forEach(x => x && p.appendChild(x)); return p; }
function txt(s) { return document.createTextNode(s); }
function mptyNode(msg, id) {
    const w = mkEl('div', { className: 'ss-mpty', id });
    const s = mkSvg('svg', { width:'36', height:'36', viewBox:'0 0 24 24', fill:'none', stroke:'#8b949e', 'stroke-width':'1.5' });
    append(s, mkSvg('circle', { cx:'12', cy:'12', r:'10' }), mkSvg('path', { d:'M12 8v4m0 4h.01' }));
    const p = mkEl('p'); p.textContent = msg;
    return append(w, s, p);
}
function flashBtn(btn, msg, ms = 2000) {
    const orig = btn.textContent; btn.textContent = msg;
    setTimeout(() => { btn.textContent = orig; }, ms);
}

// ═══════════════════════════════════════════════════════════════
//  BUILD UI
// ═══════════════════════════════════════════════════════════════
function buildUI() {
    if (document.getElementById('ss-pan')) return;

    panel = mkEl('div', { id: 'ss-pan' });
    panel.style.width  = `${savedW}px`;
    panel.style.height = `${savedH}px`;
    panel.appendChild(mkEl('div', { id: 'ss-rsz' }));

    // Dock handle with error badge
    const handle = mkEl('div', { id: 'ss-handle' });
    append(handle, mkEl('span', { id: 'ss-hlbl', text: 'ScriptSpy' }), mkEl('div', { id: 'ss-hbdg', text: '0' }));
    handle.addEventListener('click', undockPanel);
    panel.appendChild(handle);

    // Header
    const hdr = mkEl('div', { id: 'ss-hdr' });
    const hac = mkEl('div', { className: 'ss-hac' });
    const btnAI = mkEl('button', { className: 'ss-btn ss-airpt', text: 'Copy AI Report' });
    btnAI.addEventListener('click', () => {
        copyText(buildAIReport()); btnAI.textContent = 'Copied!'; btnAI.classList.add('ok');
        setTimeout(() => { btnAI.textContent = 'Copy AI Report'; btnAI.classList.remove('ok'); }, 2200);
    });
    const btnHide = mkEl('button', { className: 'ss-btn', text: 'Hide' });
    btnHide.addEventListener('click', dockPanel);
    const btnCC = mkEl('button', { className: 'ss-btn dng', text: 'Clear' });
    btnCC.addEventListener('click', clearConsole);
    append(hac, btnAI, btnHide, btnCC);
    append(hdr, mkEl('span', { id: 'ss-hdr-t', text: `ScriptSpy v${VERSION}` }), mkEl('span', { id: 'ss-hdr-u', text: location.hostname }), hac);
    panel.appendChild(hdr);

    // Tab bar
    const tabbar = mkEl('div', { id: 'ss-tabs' });
    [['console','Console'],['scripts','Scripts'],['network','Network'],['storage','Storage'],['tools','Tools']].forEach(([id, lbl]) => {
        const t   = mkEl('div', { className: `ss-tab${activeTab === id ? ' on' : ''}`, data: { tab: id } });
        const dot = mkEl('span', { className: 'ss-tab-unread', id: `ss-tu-${id}` });
        append(t, txt(lbl + '\u00A0'), mkEl('span', { className: 'ss-tbdg', id: `ss-tb-${id}`, text: '0' }), dot);
        t.addEventListener('click', () => switchTab(id));
        tabbar.appendChild(t);
    });
    panel.appendChild(tabbar);

    panel.appendChild(buildConsoleTab());
    panel.appendChild(buildScriptsTabEl());
    panel.appendChild(buildNetworkTabEl());
    panel.appendChild(buildStorageTabEl());
    panel.appendChild(buildToolsTabEl());

    // Footer
    const foot = mkEl('div', { id: 'ss-foot' });
    const fs   = mkEl('div', { id: 'ss-fs' });
    [['te','fs-e'],['tw','fs-w'],['tl','fs-l'],['ti','fs-i']].forEach(([cls, id]) => {
        const st = mkEl('div', { className: `ss-fst ${cls}` });
        append(st, mkEl('span', { className: 'ss-fdot' }), mkEl('span', { id, text: '0' }));
        fs.appendChild(st);
    });
    const jmp  = mkEl('div', { className: 'ss-fjump' });
    const jTop = mkEl('button', { className: 'ss-jbtn', text: '\u2191 Top' });
    jTop.addEventListener('click', () => { if (logList) logList.scrollTop = 0; });
    const jBot = mkEl('button', { className: 'ss-jbtn', text: '\u2193 Latest' });
    jBot.addEventListener('click', () => { if (logList) logList.scrollTop = logList.scrollHeight; });
    append(jmp, jTop, jBot);
    append(foot, fs, mkEl('span', { id: 'ss-ftot', text: '0 entries' }), jmp);
    panel.appendChild(foot);

    document.body.appendChild(panel);
    makeDraggable(hdr, panel);
    makeResizable(document.getElementById('ss-rsz'), panel);

    loadHistory();
    // Bulk render without calling updateFooterCounts on every single entry (was O(n²))
    if (entries.length) {
        const frag = document.createDocumentFragment();
        const fn = conMatchFn();
        entries.forEach(e => { if (fn(e)) frag.appendChild(buildEntryNode(e)); });
        logList.appendChild(frag);
    } else {
        logList.appendChild(mptyNode('No userscript logs captured yet.', 'ss-mpty-con'));
    }
    netEntries.forEach(renderNetEntry);
    if (!netEntries.length) netList.appendChild(mptyNode('No network requests detected.', 'ss-mpty-net'));
    updateScriptsTab();
    updateFooterCounts();  // single call after bulk render
    updateHandleBadge();
    switchTab(activeTab, true);
}

// ─── Console Tab ───────────────────────────────────────────────
function buildConsoleTab() {
    const wrap = mkEl('div', { className: `ss-tc${activeTab==='console'?' on':''}`, id: 'tc-console' });
    const tb   = mkEl('div', { className: 'ss-ctb' });

    [['all','All'],['error','Error','te'],['warn','Warn','tw'],['info','Info','ti'],['log','Log','tl'],['table','Table','tt']].forEach(([type, lbl, cls]) => {
        const btn = mkEl('button', { className: `ss-fb${cls?' '+cls:''}${conFilter.type===type?' on':''}`, data: { type } });
        append(btn, txt(lbl+'\u00A0'), mkEl('span', { className: 'ss-fc', id: `fc-${type}`, text: '0' }));
        btn.addEventListener('click', () => {
            conFilter.type = type;
            tb.querySelectorAll('.ss-fb[data-type]').forEach(b => b.classList.toggle('on', b===btn));
            rerenderConsole();
        });
        tb.appendChild(btn);
    });

    // Hide Page Errors toggle
    const btnHP = mkEl('button', { className: `ss-fb hide-pg${conFilter.hidePageErrors?' on':''}`, text: 'Hide Page' });
    btnHP.addEventListener('click', () => {
        conFilter.hidePageErrors = !conFilter.hidePageErrors;
        btnHP.classList.toggle('on', conFilter.hidePageErrors);
        rerenderConsole();
    });
    tb.appendChild(btnHP);

    const sw   = mkEl('div', { id: 'ss-sw' });
    const srch = mkEl('input', { id: 'ss-srch', type: 'text', placeholder: 'Filter...' });
    srch.addEventListener('input', e => { conFilter.text = e.target.value; rerenderConsole(); });
    const rx = mkEl('button', { id: 'ss-rx', text: '.*', title: 'Toggle regex' });
    rx.addEventListener('click', () => { conFilter.regex = !conFilter.regex; rx.classList.toggle('on', conFilter.regex); rerenderConsole(); });
    append(sw, srch, rx);

    const sf = mkEl('select', { id: 'ss-sf' });
    const ao = mkEl('option', { text: 'All Scripts' }); ao.value = 'all'; sf.appendChild(ao);
    sf.addEventListener('change', e => { conFilter.script = e.target.value; rerenderConsole(); });

    const btnPause = mkEl('button', { className: 'ss-btn', id: 'ss-pause', text: 'Pause' });
    btnPause.addEventListener('click', toggleCapturePause);
    append(tb, sw, sf, btnPause);
    wrap.appendChild(tb);

    // Pause banner
    pauseBanner = mkEl('div', { id: 'ss-pause-banner' });
    const pbTxt   = mkEl('span', { id: 'ss-pb-txt', text: 'Capture paused — 0 buffered' });
    const pbFlush = mkEl('button', { className: 'ss-btn', text: 'Resume & Flush' });
    pbFlush.addEventListener('click', resumeCapture);
    append(pauseBanner, pbTxt, pbFlush);
    wrap.appendChild(pauseBanner);

    // Multi-select bar
    const selBar  = mkEl('div', { id: 'ss-sel-bar' });
    const selCnt  = mkEl('span', { id: 'ss-sel-cnt', text: '0 selected' });
    const selCopy = mkEl('button', { className: 'ss-btn pri', text: 'Copy Selected AI Report' });
    selCopy.addEventListener('click', () => { const r = buildSelectedAIReport(); if (r) { copyText(r); flashBtn(selCopy, 'Copied!'); } });
    const selClr  = mkEl('button', { className: 'ss-btn', text: 'Deselect All' });
    selClr.addEventListener('click', clearSelection);
    append(selBar, selCnt, selCopy, selClr);
    wrap.appendChild(selBar);

    logList = mkEl('div', { className: 'ss-ll', id: 'ss-ll' });
    wrap.appendChild(logList);
    return wrap;
}

// ─── Scripts Tab ───────────────────────────────────────────────
function buildScriptsTabEl() {
    const wrap = mkEl('div', { className: `ss-tc${activeTab==='scripts'?' on':''}`, id: 'tc-scripts' });
    const hdr  = mkEl('div', { className: 'ss-shdr' });
    ['Script','Status','Errors','Warns','Logs','Last Seen'].forEach(h => hdr.appendChild(mkEl('span', { text: h })));
    const hint = mkEl('div', { className: 'ss-info' });
    hint.style.cssText = 'margin:6px 10px;padding:4px 8px;font-size:9px;';
    hint.textContent = 'Click a row to filter Console to that script.';
    append(wrap, hdr, hint);
    scriptsList = mkEl('div', { className: 'ss-ll', id: 'ss-scl' });
    wrap.appendChild(scriptsList);
    return wrap;
}

// ─── Network Tab ───────────────────────────────────────────────
function buildNetworkTabEl() {
    const wrap = mkEl('div', { className: `ss-tc${activeTab==='network'?' on':''}`, id: 'tc-network' });
    const tb   = mkEl('div', { className: 'ss-ntb' });
    ['all','xhr','fetch','errors'].forEach(f => {
        const btn = mkEl('button', { className: `ss-fb${netFilter===f?' on':''}` });
        btn.textContent = f==='all' ? 'All' : f.toUpperCase();
        btn.addEventListener('click', () => { netFilter=f; tb.querySelectorAll('.ss-fb').forEach(b=>b.classList.toggle('on',b===btn)); rerenderNet(); });
        tb.appendChild(btn);
    });
    const clrN = mkEl('button', { className: 'ss-btn dng', text: 'Clear' });
    clrN.style.marginLeft = 'auto';
    clrN.addEventListener('click', () => { netEntries=[]; clearEl(netList); netList.appendChild(mptyNode('Network log cleared.','ss-mpty-net')); updateNetBadge(); });
    const expN = mkEl('button', { className: 'ss-btn', text: 'Export JSON' });
    expN.addEventListener('click', exportNet);
    append(tb, clrN, expN);
    wrap.appendChild(tb);
    const nhdr = mkEl('div', { className: 'ss-nhdr' });
    ['Type','Status','URL','Duration','Script'].forEach(h => nhdr.appendChild(mkEl('span', { text: h })));
    wrap.appendChild(nhdr);
    netList = mkEl('div', { className: 'ss-ll', id: 'ss-nl' });
    wrap.appendChild(netList);
    return wrap;
}

// ─── Storage Tab ───────────────────────────────────────────────
function buildStorageTabEl() {
    const wrap  = mkEl('div', { className: `ss-tc${activeTab==='storage'?' on':''}`, id: 'tc-storage' });
    const stabs = mkEl('div', { className: 'ss-stabs' });
    [['gm','GM Storage'],['local','localStorage'],['session','sessionStorage'],['cookie','Cookies'],['changes','Changes']].forEach(([id, lbl]) => {
        const t = mkEl('div', { className: `ss-stab${stSubTab===id?' on':''}`, data: { stab: id } });
        if (id === 'changes') { append(t, txt('Changes\u00A0'), mkEl('span', { className: 'ss-tbdg', id: 'ss-stch-cnt', text: '0' })); }
        else t.textContent = lbl;
        t.addEventListener('click', () => { stSubTab=id; stabs.querySelectorAll('.ss-stab').forEach(s=>s.classList.toggle('on',s.dataset.stab===id)); renderStorage(); });
        stabs.appendChild(t);
    });
    wrap.appendChild(stabs);

    const stbar = mkEl('div', { className: 'ss-stbar' });
    const stsch = mkEl('input', { className: 'ss-stsch', type: 'text', placeholder: 'Filter keys...', id: 'ss-stsch' });
    stsch.addEventListener('input', renderStorage);
    const btnR = mkEl('button', { className: 'ss-btn', text: 'Refresh' });
    btnR.addEventListener('click', renderStorage);
    const btnE = mkEl('button', { className: 'ss-btn', text: 'Export JSON' });
    btnE.addEventListener('click', exportStorage);
    append(stbar, stsch, btnR, btnE);
    wrap.appendChild(stbar);

    storageContent    = mkEl('div', { className: 'ss-ll', id: 'ss-stc' });
    storageChangeList = mkEl('div', { className: 'ss-ll', id: 'ss-schl' });
    storageChangeList.style.display = 'none';
    append(wrap, storageContent, storageChangeList);
    return wrap;
}

// ─── Tools Tab ─────────────────────────────────────────────────
function buildToolsTabEl() {
    const wrap = mkEl('div', { className: `ss-tc${activeTab==='tools'?' on':''}`, id: 'tc-tools' });
    const cont = mkEl('div', { className: 'ss-tools' });

    // Delayed Debugger
    const dbgC = mkEl('div', { className: 'ss-card' });
    dbgC.appendChild(mkEl('div', { className: 'ss-ct', text: 'Delayed Debugger Trigger' }));
    const dr1  = mkEl('div', { className: 'ss-tr' });
    dr1.appendChild(mkEl('span', { className: 'ss-tl', text: 'Delay (ms):' }));
    const dlIn  = mkEl('input', { className: 'ss-ti', type: 'number', id: 'ss-ddi' }); dlIn.value='2000'; dlIn.min='0';
    const armBtn= mkEl('button', { className: 'ss-btn pri', text: 'Arm Trigger' });
    const dbgSt = mkEl('span', { id: 'ss-dst', text: 'Not armed' });
    append(dr1, dlIn, armBtn, dbgSt);
    let dbgTmr = null;
    armBtn.addEventListener('click', () => {
        if (dbgTmr) clearTimeout(dbgTmr);
        const delay = parseInt(dlIn.value)||2000;
        dbgSt.textContent=`Armed — fires in ${delay}ms`; dbgSt.style.color='#fbbf24';
        dbgTmr = setTimeout(() => { dbgSt.textContent='Fired!'; dbgSt.style.color='#3fb950'; dbgTmr=null; debugger; }, delay); // eslint-disable-line no-debugger
    });
    const dr2   = mkEl('div', { className: 'ss-tr' });
    const canBtn= mkEl('button', { className: 'ss-btn', text: 'Cancel' });
    canBtn.addEventListener('click', () => { if (dbgTmr){clearTimeout(dbgTmr);dbgTmr=null;} dbgSt.textContent='Cancelled'; dbgSt.style.color=''; });
    dr2.appendChild(canBtn);
    const dbgInfo = mkEl('div', { className: 'ss-info' });
    dbgInfo.textContent = 'Fires debugger after a delay. Use to catch hover/tooltip states that vanish when DevTools opens normally.';
    append(dbgC, dr1, dr2, dbgInfo);

    // Muted Patterns
    const mutC = mkEl('div', { className: 'ss-card' });
    mutC.appendChild(mkEl('div', { className: 'ss-ct', text: 'Hidden Error Patterns' }));
    const mutInfo = mkEl('div', { className: 'ss-info' });
    mutInfo.textContent = 'Entries matching these patterns are hidden from the Console. Click "Hide This" on any entry to add it. Patterns match against the first 100 characters of the message.';
    mutC.appendChild(mutInfo);
    const mutList = mkEl('div', { id: 'ss-mut-list', style: 'margin-top:8px;' });
    mutC.appendChild(mutList);
    const mutTr = mkEl('div', { className: 'ss-tr' });
    mutTr.style.marginTop = '8px';
    const clrMut = mkEl('button', { className: 'ss-btn dng', text: 'Clear All Hidden' });
    clrMut.addEventListener('click', () => { mutedPatterns.clear(); saveMuted(); rerenderConsole(); renderMutedList(); });
    mutTr.appendChild(clrMut);
    mutC.appendChild(mutTr);

    // Behavior
    const behC = mkEl('div', { className: 'ss-card' });
    behC.appendChild(mkEl('div', { className: 'ss-ct', text: 'Behavior' }));
    const aoe1   = mkEl('div', { className: 'ss-tr' });
    aoe1.appendChild(mkEl('span', { className: 'ss-tl', text: 'Auto-open panel on first error:' }));
    const aoeTog = mkEl('button', { className: `ss-btn${autoOpenOnErr?' on':''}`, text: autoOpenOnErr?'Enabled':'Disabled' });
    aoeTog.addEventListener('click', () => {
        autoOpenOnErr=!autoOpenOnErr; autoOpenFired=false;
        GM_setValue('ss_autoOpen', autoOpenOnErr);
        aoeTog.textContent=autoOpenOnErr?'Enabled':'Disabled';
        aoeTog.classList.toggle('on', autoOpenOnErr);
    });
    aoe1.appendChild(aoeTog);
    behC.appendChild(aoe1);

    // Export
    const expC = mkEl('div', { className: 'ss-card' });
    expC.appendChild(mkEl('div', { className: 'ss-ct', text: 'Export' }));
    const er1 = mkEl('div', { className: 'ss-tr' });
    const bEJ = mkEl('button', { className: 'ss-btn pri', text: 'Console JSON' }); bEJ.addEventListener('click',()=>exportConsole('json'));
    const bET = mkEl('button', { className: 'ss-btn pri', text: 'Console Text' }); bET.addEventListener('click',()=>exportConsole('text'));
    const bNE = mkEl('button', { className: 'ss-btn', text: 'Network JSON' });     bNE.addEventListener('click', exportNet);
    append(er1, bEJ, bET, bNE);
    const er2 = mkEl('div', { className: 'ss-tr' });
    const bCA = mkEl('button', { className: 'ss-btn', text: 'Copy All Logs' });
    bCA.addEventListener('click', () => copyText(entries.map(e=>`[${e.time}] [${e.type.toUpperCase()}] [${e.scriptName}] ${e.message}`).join('\n')));
    const bLE = mkEl('button', { className: 'ss-btn', text: 'Copy Last Error AI Prompt' });
    bLE.addEventListener('click', () => { const last=[...entries].reverse().find(e=>e.type==='error'); if(last) copyText(aiPrompt(last)); });
    append(er2, bCA, bLE);
    append(expC, er1, er2);

    // Persistence
    const perC = mkEl('div', { className: 'ss-card' });
    perC.appendChild(mkEl('div', { className: 'ss-ct', text: 'Persistence' }));
    const pr1  = mkEl('div', { className: 'ss-tr' });
    pr1.appendChild(mkEl('span', { className: 'ss-tl', text: 'Save errors across navigations:' }));
    const ptog = mkEl('button', { className: `ss-btn${persistHist?' pri':''}`, text: persistHist?'Enabled':'Disabled' });
    ptog.addEventListener('click', () => { persistHist=!persistHist; GM_setValue('ss_persist',persistHist); ptog.textContent=persistHist?'Enabled':'Disabled'; ptog.classList.toggle('pri',persistHist); });
    pr1.appendChild(ptog);
    const pr2  = mkEl('div', { className: 'ss-tr' });
    pr2.appendChild(mkEl('span', { className: 'ss-tl', text: 'Max entries saved:' }));
    const maxI = mkEl('input', { className: 'ss-ti', type: 'number' }); maxI.value=String(maxHist);
    maxI.addEventListener('change', e => { maxHist=parseInt(e.target.value)||200; GM_setValue('ss_maxHist',maxHist); });
    pr2.appendChild(maxI);
    append(perC, pr1, pr2);

    // Clear / Reset
    const clrC = mkEl('div', { className: 'ss-card' });
    clrC.appendChild(mkEl('div', { className: 'ss-ct', text: 'Clear / Reset' }));
    const clr1 = mkEl('div', { className: 'ss-tr' });
    const bCon = mkEl('button', { className: 'ss-btn dng', text: 'Clear Console' }); bCon.addEventListener('click', clearConsole);
    const bNet = mkEl('button', { className: 'ss-btn dng', text: 'Clear Network' });
    bNet.addEventListener('click',()=>{netEntries=[];clearEl(netList);netList.appendChild(mptyNode('Network log cleared.','ss-mpty-net'));updateNetBadge();});
    const bHis = mkEl('button', { className: 'ss-btn dng', text: 'Clear History' }); bHis.addEventListener('click',()=>GM_setValue('ss_hist','[]'));
    const bAll = mkEl('button', { className: 'ss-btn dng', text: 'Clear All' });
    bAll.addEventListener('click',()=>{clearConsole();netEntries=[];storageChanges=[];clearEl(netList);netList.appendChild(mptyNode('Network log cleared.','ss-mpty-net'));GM_setValue('ss_hist','[]');updateNetBadge();});
    append(clr1, bCon, bNet, bHis, bAll);
    clrC.appendChild(clr1);

    const abt = mkEl('div', { className: 'ss-info' });
    abt.textContent = `ScriptSpy v${VERSION} — Per-page console capture, hide/mute errors, pause/resume, network req+res bodies, storage change monitor, pin entries, multi-select AI report, auto-open on error, copy-as-fetch, tab unread dots, persistent panel size.`;

    append(cont, dbgC, mutC, behC, expC, perC, clrC, abt);
    wrap.appendChild(cont);

    // Render muted list now that DOM is built
    renderMutedList();
    return wrap;
}

function renderMutedList() {
    const el = document.getElementById('ss-mut-list'); if (!el) return;
    clearEl(el);
    if (!mutedPatterns.size) {
        const empty = mkEl('div'); empty.style.cssText='font-size:10px;color:var(--M);padding:4px 0;';
        empty.textContent = 'No hidden patterns. Use "Hide This" on any console entry.';
        el.appendChild(empty); return;
    }
    const frag = document.createDocumentFragment();
    mutedPatterns.forEach(pat => {
        const row = mkEl('div', { className: 'ss-mpat' });
        const t   = mkEl('div', { className: 'ss-mpat-txt', title: pat }); t.textContent = pat;
        const rm  = mkEl('button', { className: 'ss-mpat-rm', text: 'Unhide' });
        rm.addEventListener('click', () => unmutePat(pat));
        append(row, t, rm);
        frag.appendChild(row);
    });
    el.appendChild(frag);
}

// ═══════════════════════════════════════════════════════════════
//  PAUSE / RESUME
// ═══════════════════════════════════════════════════════════════
function toggleCapturePause() { capturePaused ? resumeCapture() : pauseCapture(); }
function pauseCapture() {
    capturePaused = true;
    const btn = document.getElementById('ss-pause');
    if (btn) { btn.textContent='Resume'; btn.classList.add('on'); }
    if (pauseBanner) pauseBanner.classList.add('on');
}
function resumeCapture() {
    capturePaused = false;
    const btn = document.getElementById('ss-pause');
    if (btn) { btn.textContent='Pause'; btn.classList.remove('on'); }
    if (pauseBanner) pauseBanner.classList.remove('on');
    captureBuffer.splice(0).forEach(e => { if (logList) renderEntry(e); });
}
function updatePauseBanner() {
    const el = document.getElementById('ss-pb-txt');
    if (el) el.textContent = `Capture paused — ${captureBuffer.length} buffered`;
}

// ═══════════════════════════════════════════════════════════════
//  SELECTION
// ═══════════════════════════════════════════════════════════════
function toggleSelect(id, checked) {
    if (checked) selectedIds.add(id); else selectedIds.delete(id);
    const row = logList?.querySelector(`.ss-e[data-id="${id}"]`);
    if (row) row.classList.toggle('selected', checked);
    updateSelBar();
}
function clearSelection() {
    selectedIds.clear();
    if (logList) logList.querySelectorAll('.ss-e.selected').forEach(r => { r.classList.remove('selected'); const cb=r.querySelector('.ss-e-check'); if(cb) cb.checked=false; });
    updateSelBar();
}
function updateSelBar() {
    const bar = document.getElementById('ss-sel-bar');
    const cnt = document.getElementById('ss-sel-cnt');
    if (!bar||!cnt) return;
    const n = selectedIds.size;
    cnt.textContent = `${n} selected`;
    bar.classList.toggle('on', n > 0);
    if (logList) logList.classList.toggle('selecting', n > 0);
}

// ═══════════════════════════════════════════════════════════════
//  TAB SWITCH
// ═══════════════════════════════════════════════════════════════
function switchTab(id, silent) {
    activeTab = id;
    if (!silent) GM_setValue('ss_tab', id);
    if (panel) {
        panel.querySelectorAll('.ss-tab').forEach(t => t.classList.toggle('on', t.dataset.tab===id));
        panel.querySelectorAll('.ss-tc').forEach(c => c.classList.toggle('on', c.id===`tc-${id}`));
    }
    tabUnread[id] = 0; updateTabUnread(id);
    if (id === 'storage') renderStorage();
    if (id === 'scripts') updateScriptsTab();
}
function updateTabUnread(tab) {
    const dot = document.getElementById(`ss-tu-${tab}`);
    if (dot) dot.classList.toggle('on', tabUnread[tab] > 0 && activeTab !== tab);
}

// ═══════════════════════════════════════════════════════════════
//  CONSOLE RENDERING
// ═══════════════════════════════════════════════════════════════
function typeClass(t) { return { error:'te', warn:'tw', info:'ti', log:'tl', debug:'td', table:'tt' }[t]||'tl'; }

// Returns a compiled filter function — regex is compiled ONCE per filter call,
// not re-compiled for every entry (was the previous bug).
function conMatchFn() {
    const { type, script, text, regex, hidePageErrors } = conFilter;
    let rxObj = null;
    if (text && regex) { try { rxObj = new RegExp(text, 'i'); } catch { return () => false; } }
    const lcText = text ? text.toLowerCase() : '';

    return function(e) {
        if (type !== 'all' && e.type !== type) return false;
        if (script !== 'all' && e.scriptName !== script) return false;
        if (hidePageErrors && e.scriptName === 'Page') return false;
        if (isMuted(e)) return false;
        if (text) {
            if (rxObj) return rxObj.test(e.message) || rxObj.test(e.source);
            if (!e.message.toLowerCase().includes(lcText) && !e.source.toLowerCase().includes(lcText)) return false;
        }
        return true;
    };
}

function buildEntryNode(e) {
    const isUs = e.scriptName && e.scriptName !== 'Page';
    const row  = mkEl('div', { className: `ss-e ${typeClass(e.type)}${e.persisted?' hist':''}${e.pinned?' pinned':''}${selectedIds.has(e.id)?' selected':''}`, data: { id: String(e.id) } });

    const cb = mkEl('input', { type: 'checkbox', className: 'ss-e-check' });
    if (selectedIds.has(e.id)) cb.checked = true;
    cb.addEventListener('change', ev => { ev.stopPropagation(); toggleSelect(e.id, cb.checked); });
    row.appendChild(cb);

    row.appendChild(mkEl('div', { className: 'ss-ebdg', text: e.type }));
    row.appendChild(mkEl('div', { className: `ss-escr${isUs?' us':''}`, text: e.scriptName||'Page', title: e.scriptName||'Page' }));

    const body = mkEl('div', { className: 'ss-ebody' });
    const msg  = mkEl('div', { className: 'ss-emsg' });
    if (e.persisted) msg.appendChild(mkEl('span', { className: 'ss-prev', text: 'PREV' }));

    if (e.formatParts) {
        e.formatParts.forEach(p => { const sp=mkEl('span'); if(p.style) sp.style.cssText=p.style; sp.textContent=p.text; msg.appendChild(sp); });
    } else {
        msg.appendChild(txt(e.message));
    }
    body.appendChild(msg);

    if (e.tableData) {
        const { cols, rows, isArr } = e.tableData;
        const tbl = mkEl('table', { className: 'ss-tbl' });
        const th  = mkEl('thead'), hr2 = mkEl('tr');
        cols.forEach(c => hr2.appendChild(mkEl('th', { text: c })));
        th.appendChild(hr2); tbl.appendChild(th);
        const tb2 = mkEl('tbody');
        rows.forEach((rd, i) => {
            const tr = mkEl('tr');
            cols.forEach(c => {
                const td = mkEl('td');
                if (c==='(index)') td.textContent=String(isArr?i:(typeof rd==='object'?rd['(index)']??i:i));
                else { const v=typeof rd==='object'&&rd!==null?rd[c]:(c==='Values'?rd:undefined); td.textContent=v!==undefined?String(v):''; }
                tr.appendChild(td);
            });
            tb2.appendChild(tr);
        });
        tbl.appendChild(tb2); body.appendChild(tbl);
    }

    if (e.source) body.appendChild(mkEl('div', { className: 'ss-esrc', text: e.source, title: e.source }));

    // Stack trace — click-to-expand, with copy button
    if (e.stack) {
        const stkWrap = mkEl('div', { className: 'ss-stk', id: `sstk-${e.id}` });
        const stkHdr  = mkEl('div', { className: 'ss-ned-hdr' });
        const stkCopy = mkEl('button', { className: 'ss-stk-copy', text: 'Copy Stack' });
        stkCopy.addEventListener('click', ev => { ev.stopPropagation(); copyText(e.stack); flashBtn(stkCopy,'Copied!',1500); });
        stkHdr.appendChild(stkCopy);
        stkWrap.appendChild(stkHdr);
        stkWrap.appendChild(txt(e.stack));
        body.appendChild(stkWrap);
    }

    const foot = mkEl('div', { className: 'ss-efoot' });
    foot.appendChild(mkEl('span', { className: 'ss-etime', id: `set-${e.id}`, text: e.time }));
    if (e.count > 1) {
        foot.appendChild(mkEl('span', { className: 'ss-dd', id: `sdd-${e.id}`, text: `x${e.count}` }));
        if (e.firstTs && e.lastTs && e.lastTs > e.firstTs) {
            const ms = e.lastTs - e.firstTs;
            foot.appendChild(mkEl('span', { className: 'ss-rate', id: `srate-${e.id}`, text: `in ${ms<1000?ms+'ms':(ms/1000).toFixed(1)+'s'}` }));
        }
    }
    const pin = mkEl('button', { className: `ss-pin${e.pinned?' on':''}`, text: '\uD83D\uDCCC', title: e.pinned?'Unpin':'Pin (survives Clear)' });
    pin.addEventListener('click', ev => { ev.stopPropagation(); togglePin(e.id, pin, row); });
    foot.appendChild(pin);

    // Hide This — mutes the error pattern
    const hideBtn = mkEl('button', { className: 'ss-hide', text: 'Hide This' });
    hideBtn.addEventListener('click', ev => { ev.stopPropagation(); muteEntry(e); });
    foot.appendChild(hideBtn);

    if (e.type==='error'||e.type==='warn') {
        const ai = mkEl('button', { className: 'ss-ai', text: 'AI Prompt' });
        ai.addEventListener('click', ev => { ev.stopPropagation(); copyText(aiPrompt(e)); flashBtn(ai,'Copied!',1500); });
        foot.appendChild(ai);
    }
    body.appendChild(foot);
    row.appendChild(body);

    // Click row to toggle stack
    row.addEventListener('click', ev => {
        if (ev.target.closest('button')||ev.target.closest('input')) return;
        const stk = document.getElementById(`sstk-${e.id}`);
        if (stk) stk.classList.toggle('open');
    });
    return row;
}

function togglePin(id, pinBtn, row) {
    const e = entryMap.get(id); if (!e) return;  // O(1) via Map
    e.pinned = !e.pinned;
    if (e.pinned) pinnedIds.add(id); else pinnedIds.delete(id);
    pinBtn.classList.toggle('on', e.pinned);
    pinBtn.title = e.pinned ? 'Unpin' : 'Pin (survives Clear)';
    row.classList.toggle('pinned', e.pinned);
}

function renderEntry(e) {
    if (!logList) return;
    // NOTE: updateFooterCounts is NOT called here — caller is responsible.
    // This avoids O(n²) during bulk render in buildUI.
    if (!conMatchFn()(e)) return;
    const em = document.getElementById('ss-mpty-con'); if (em) em.remove();
    logList.appendChild(buildEntryNode(e));
    const atBot = logList.scrollHeight - logList.scrollTop - logList.clientHeight < 80;
    if (atBot) logList.scrollTop = logList.scrollHeight;
}

function rerenderConsole() {
    if (!logList) return;
    clearEl(logList);
    // Compile filter function once, not per-entry
    const fn  = conMatchFn();
    const vis = entries.filter(fn);
    if (!vis.length) { logList.appendChild(mptyNode('No matching entries.','ss-mpty-con')); return; }
    const frag = document.createDocumentFragment();
    vis.forEach(e => frag.appendChild(buildEntryNode(e)));
    logList.appendChild(frag);
    updateFooterCounts();
}

function updateDedupe(id, count, time, elapsedMs) {
    const dd = document.getElementById(`sdd-${id}`);
    if (dd) dd.textContent = `x${count}`;
    else {
        const rowEl = logList?.querySelector(`.ss-e[data-id="${id}"]`);
        if (rowEl) {
            const foot = rowEl.querySelector('.ss-efoot');
            if (foot) foot.insertBefore(mkEl('span',{className:'ss-dd',id:`sdd-${id}`,text:`x${count}`}), foot.children[1]||null);
        }
    }
    const te = document.getElementById(`set-${id}`); if (te) te.textContent = time;
    if (elapsedMs > 0) {
        const rateStr = elapsedMs<1000?`in ${elapsedMs}ms`:`in ${(elapsedMs/1000).toFixed(1)}s`;
        const rateEl  = document.getElementById(`srate-${id}`);
        if (rateEl) { rateEl.textContent = rateStr; }
        else {
            const rowEl = logList?.querySelector(`.ss-e[data-id="${id}"]`);
            if (rowEl) {
                const foot = rowEl.querySelector('.ss-efoot');
                if (foot) { const sp=mkEl('span',{className:'ss-rate',id:`srate-${id}`,text:rateStr}); foot.insertBefore(sp, foot.querySelector('.ss-pin')||null); }
            }
        }
    }
}

// ═══════════════════════════════════════════════════════════════
//  SCRIPTS TAB — click row to filter console
// ═══════════════════════════════════════════════════════════════
function updateScriptsTab() {
    if (!scriptsList) return;
    clearEl(scriptsList);
    const names = Object.keys(scriptReg);
    if (!names.length) { scriptsList.appendChild(mptyNode('No userscript activity detected yet.','ss-mpty-sc')); updateTabBadge('scripts',0); return; }
    const frag = document.createDocumentFragment();
    names.forEach(name => {
        const r   = scriptReg[name];
        const row = mkEl('div', { className: 'ss-srow', title: 'Click to filter Console to this script' });
        row.appendChild(mkEl('span', { className: 'ss-sn', text: name, title: name }));
        row.appendChild(mkEl('span', { className: `ss-sst ${r.status}`, text: r.status==='error'?'Error':r.status==='warn'?'Warn':'OK' }));
        row.appendChild(mkEl('span', { className: `ss-snum${r.errors>0?' e':''}`, text: String(r.errors) }));
        row.appendChild(mkEl('span', { className: `ss-snum${r.warns>0?' w':''}`,  text: String(r.warns)  }));
        row.appendChild(mkEl('span', { className: 'ss-snum', text: String(r.logs+r.infos) }));
        row.appendChild(mkEl('span', { className: 'ss-stm',  text: r.lastSeen }));
        row.addEventListener('click', () => {
            conFilter.script = name;
            const sf = document.getElementById('ss-sf'); if (sf) sf.value = name;
            switchTab('console'); rerenderConsole();
        });
        frag.appendChild(row);
    });
    scriptsList.appendChild(frag);
    updateTabBadge('scripts', names.length, names.reduce((s,n)=>s+scriptReg[n].errors,0) > 0);
    const sel = document.getElementById('ss-sf');
    if (sel) {
        const cur = sel.value; clearEl(sel);
        const ao2 = mkEl('option',{text:'All Scripts'}); ao2.value='all'; sel.appendChild(ao2);
        names.forEach(n => { const o=mkEl('option',{text:n}); o.value=n; if(n===cur) o.selected=true; sel.appendChild(o); });
        if (cur==='all') ao2.selected = true;
    }
}

// ═══════════════════════════════════════════════════════════════
//  NETWORK RENDERING — with bodies
// ═══════════════════════════════════════════════════════════════
function stCls(s) {
    if (s==='pending') return 'pn';
    if (s==='error'||s==='aborted'||s===0) return 'er';
    if (typeof s==='number') { if(s>=200&&s<300) return 'ok'; if(s>=300&&s<400) return 'rd'; return 'er'; }
    return 'pn';
}
function netMatchFn(e) {
    if (netFilter==='all')    return true;
    if (netFilter==='xhr')    return e.type==='xhr';
    if (netFilter==='fetch')  return e.type==='fetch';
    if (netFilter==='errors') return e.status==='error'||e.status===0||(typeof e.status==='number'&&e.status>=400);
    return false;
}

function buildNetNode(e) {
    const row  = mkEl('div', { className: 'ss-ne', data: { nid: String(e.id) } });
    const mkey = e.type==='fetch'?'FETCH':e.method;
    row.appendChild(mkEl('div', { className: `ss-nm ${mkey}`, text: mkey }));
    row.appendChild(mkEl('div', { className: `ss-nst ${stCls(e.status)}`, id: `sns-${e.id}`, text: e.status==='pending'?'…':String(e.status) }));
    let short; try { short=new URL(e.url,location.href).pathname; } catch { short=e.url; }
    row.appendChild(mkEl('div', { className: 'ss-nu', text: short, title: e.url }));
    row.appendChild(mkEl('div', { className: 'ss-nd', id: `snd-${e.id}`, text: e.status==='pending'?'…':`${e.duration}ms` }));
    const isUs = e.scriptName && e.scriptName !== 'Page';
    row.appendChild(mkEl('div', { className: `ss-nscr${isUs?' us':''}`, text: e.scriptName, title: e.scriptName }));

    const det = mkEl('div', { className: 'ss-ned', id: `ned-${e.id}` });

    // URL + copy-as-fetch
    const urlSec = mkEl('div', { className: 'ss-ned-sec' });
    const urlHdr = mkEl('div', { className: 'ss-ned-hdr' });
    urlHdr.appendChild(mkEl('span', { className: 'ss-ned-lbl', text: 'URL' }));
    const fetchBtn = mkEl('button', { className: 'ss-ncp', text: 'Copy as fetch()' });
    fetchBtn.addEventListener('click', ev => { ev.stopPropagation(); copyAsFetch(e); flashBtn(fetchBtn,'Copied!',1500); });
    urlHdr.appendChild(fetchBtn);
    urlSec.appendChild(urlHdr);
    urlSec.appendChild(txt(e.url));
    det.appendChild(urlSec);

    if (e.reqBody) {
        const rqSec = mkEl('div', { className: 'ss-ned-sec' });
        const rqHdr = mkEl('div', { className: 'ss-ned-hdr' });
        rqHdr.appendChild(mkEl('span', { className: 'ss-ned-lbl', text: 'Request Body' }));
        const rqCp = mkEl('button', { className: 'ss-ncp', text: 'Copy' });
        rqCp.addEventListener('click', ev => { ev.stopPropagation(); copyText(e.reqBody); flashBtn(rqCp,'Copied!',1500); });
        rqHdr.appendChild(rqCp);
        rqSec.appendChild(rqHdr);
        rqSec.appendChild(txt(e.reqBody+(e.reqBody.length>=2000?'\n…(truncated)':'')));
        det.appendChild(rqSec);
    }

    const resSec = mkEl('div', { className: 'ss-ned-sec' });
    const resHdr = mkEl('div', { className: 'ss-ned-hdr' });
    resHdr.appendChild(mkEl('span', { className: 'ss-ned-lbl', text: 'Response Body' }));
    const resCp = mkEl('button', { className: 'ss-ncp', text: 'Copy' });
    resCp.addEventListener('click', ev => { ev.stopPropagation(); if(e.resBody) copyText(e.resBody); });
    resHdr.appendChild(resCp);
    resSec.appendChild(resHdr);
    resSec.appendChild(mkEl('span', { id: `nrst-${e.id}`, text: e.resBody?(e.resBody.length>=2000?e.resBody+'\n…(truncated)':e.resBody):'Pending…' }));
    det.appendChild(resSec);

    row.appendChild(det);
    row.addEventListener('click', () => det.classList.toggle('open'));
    return row;
}

function renderNetEntry(e) {
    if (!netList||!netMatchFn(e)) return;
    const em = document.getElementById('ss-mpty-net'); if (em) em.remove();
    netList.appendChild(buildNetNode(e));
    updateNetBadge();
}
function updateNetEntry(e) {
    if (!netList) return;
    const s = document.getElementById(`sns-${e.id}`);
    if (s) { s.textContent=String(e.status); s.className=`ss-nst ${stCls(e.status)}`; }
    const d = document.getElementById(`snd-${e.id}`); if (d) d.textContent=`${e.duration}ms`;
    const rb = document.getElementById(`nrst-${e.id}`);
    if (rb&&e.resBody) rb.textContent = e.resBody.length>=2000?e.resBody+'\n…(truncated)':e.resBody;
}
function rerenderNet() {
    if (!netList) return;
    clearEl(netList);
    const vis = netEntries.filter(netMatchFn);
    if (!vis.length) { netList.appendChild(mptyNode('No matching requests.','ss-mpty-net')); return; }
    const frag = document.createDocumentFragment();
    vis.forEach(e => frag.appendChild(buildNetNode(e)));
    netList.appendChild(frag);
}

// ═══════════════════════════════════════════════════════════════
//  STORAGE RENDERING
// ═══════════════════════════════════════════════════════════════
function renderStorage() {
    if (!storageContent||!storageChangeList) return;
    const isChanges = stSubTab === 'changes';
    storageContent.style.display    = isChanges ? 'none' : '';
    storageChangeList.style.display = isChanges ? '' : 'none';

    if (isChanges) {
        clearEl(storageChangeList);
        if (!storageChanges.length) { storageChangeList.appendChild(mptyNode('No storage changes captured yet.','ss-mpty-stch')); return; }
        const frag = document.createDocumentFragment();
        const hdr  = mkEl('div', { className: 'ss-sch' });
        hdr.style.cssText = 'background:var(--B2);border-bottom:1px solid var(--BD);';
        ['Op','Store','Key','New Value'].forEach(h => {
            const sp = mkEl('span'); sp.style.cssText='font-size:9px;font-weight:700;color:var(--M);text-transform:uppercase;';
            sp.textContent = h; hdr.appendChild(sp);
        });
        frag.appendChild(hdr);
        storageChanges.slice(-200).forEach(c => frag.appendChild(buildStorageChangeNode(c)));
        storageChangeList.appendChild(frag);
        return;
    }

    clearEl(storageContent);
    const q    = (document.getElementById('ss-stsch')?.value||'').toLowerCase();
    const data = buildStorageData();
    const keys = Object.keys(data).filter(k => !q||k.toLowerCase().includes(q)||String(data[k]).toLowerCase().includes(q));
    if (!keys.length) { storageContent.appendChild(mptyNode('No entries found.','ss-mpty-st')); return; }
    const frag = document.createDocumentFragment();
    keys.forEach(k => {
        const row = mkEl('div', { className: 'ss-kv' });
        row.appendChild(mkEl('div', { className: 'ss-kvk', text: k, title: k }));
        let val; try { const p=JSON.parse(data[k]); val=typeof p==='object'?JSON.stringify(p,null,2):String(data[k]); } catch { val=String(data[k]); }
        row.appendChild(mkEl('div', { className: 'ss-kvv', text: val, title: val }));
        const cp = mkEl('button', { className: 'ss-kvc', text: 'Copy' });
        cp.addEventListener('click', () => copyText(String(data[k])));
        row.appendChild(cp);
        frag.appendChild(row);
    });
    storageContent.appendChild(frag);
}

function buildStorageChangeNode(c) {
    const row = mkEl('div', { className: 'ss-sch' });
    const op  = mkEl('div', { className: `ss-sch-op ${c.op}`, text: c.op });
    const store = mkEl('div'); store.style.cssText='font-size:9.5px;color:var(--M);'; store.textContent=c.store;
    const key   = mkEl('div'); key.style.cssText='font-size:10px;color:var(--I);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;'; key.textContent=c.key;
    const val   = mkEl('div'); val.style.cssText='font-size:10px;color:var(--T);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;'; val.textContent=c.newVal!=null?c.newVal:'(removed)';
    append(row, op, store, key, val);
    return row;
}

function renderStorageChange(c) {
    if (!storageChangeList) return;
    const cnt = document.getElementById('ss-stch-cnt'); if (cnt) cnt.textContent=String(storageChanges.length);
    if (stSubTab!=='changes') return;
    const em = storageChangeList.querySelector('.ss-mpty'); if (em) em.remove();
    storageChangeList.appendChild(buildStorageChangeNode(c));
    storageChangeList.scrollTop = storageChangeList.scrollHeight;
}

// ═══════════════════════════════════════════════════════════════
//  BADGES / COUNTS
// ═══════════════════════════════════════════════════════════════
let _prevErrCount = 0;
function updateHandleBadge() {
    const el = document.getElementById('ss-hbdg'); if (!el) return;
    const n  = entries.filter(e => e.type==='error').length;
    el.textContent = n > 99 ? '99+' : String(n);
    const newErr = n > _prevErrCount;
    _prevErrCount = n;
    el.classList.toggle('on', n > 0);
    if (newErr && n > 0) { el.style.animation='none'; void el.offsetWidth; el.style.animation='ssPulse .45s ease'; }
}
function updateTabBadge(tab, count, isErr) {
    const el = document.getElementById(`ss-tb-${tab}`); if (!el) return;
    el.textContent = String(count); el.classList.toggle('e', !!isErr);
}
function updateNetBadge() {
    const el = document.getElementById('ss-tb-network'); if (el) el.textContent=String(netEntries.length);
}
function updateFooterCounts() {
    const c = { error:0, warn:0, log:0, info:0, debug:0, table:0 };
    entries.forEach(e => { c[e.type]=(c[e.type]||0)+1; });
    const total = entries.length;
    const set   = (id, v) => { const n=document.getElementById(id); if(n) n.textContent=v; };
    set('fc-all',total); set('fc-error',c.error||0); set('fc-warn',c.warn||0);
    set('fc-info',c.info||0); set('fc-log',c.log||0); set('fc-table',c.table||0);
    set('fs-e',c.error||0); set('fs-w',c.warn||0); set('fs-l',c.log||0); set('fs-i',c.info||0);
    const ft = document.getElementById('ss-ftot'); if (ft) ft.textContent=`${total} entr${total===1?'y':'ies'}`;
    updateTabBadge('console', total, c.error > 0);
    updateHandleBadge();
}

// ═══════════════════════════════════════════════════════════════
//  CLEAR — preserves pinned entries
// ═══════════════════════════════════════════════════════════════
function clearConsole() {
    const pinned = entries.filter(e => e.pinned);
    entries = pinned;
    entryMap.clear();
    pinned.forEach(e => { entryMap.set(e.id, e); });
    dedupeMap = {};
    pinned.forEach(e => { dedupeMap[`${e.type}:${e.message}`] = e.id; });
    clearSelection();
    if (logList) {
        clearEl(logList);
        if (pinned.length) pinned.forEach(e => logList.appendChild(buildEntryNode(e)));
        else logList.appendChild(mptyNode('Console cleared.','ss-mpty-con'));
    }
    _prevErrCount = 0;
    updateHandleBadge();
    updateFooterCounts();
}

// ═══════════════════════════════════════════════════════════════
//  DRAG + RESIZE (dimensions persisted)
// ═══════════════════════════════════════════════════════════════
function makeDraggable(handle, target) {
    handle.addEventListener('mousedown', e => {
        if (e.target.tagName==='BUTTON'||e.target.tagName==='INPUT'||e.target.tagName==='SELECT') return;
        e.preventDefault();
        const rect=target.getBoundingClientRect();
        const sx=e.clientX,sy=e.clientY,sr=window.innerWidth-rect.right,sb=window.innerHeight-rect.bottom;
        const mv = e2 => { target.style.right=`${Math.max(0,sr+(sx-e2.clientX))}px`; target.style.bottom=`${Math.max(0,sb+(sy-e2.clientY))}px`; target.style.left='auto'; target.style.top='auto'; };
        const up = () => { document.removeEventListener('mousemove',mv); document.removeEventListener('mouseup',up); };
        document.addEventListener('mousemove',mv); document.addEventListener('mouseup',up);
    });
}
function makeResizable(handle, target) {
    handle.addEventListener('mousedown', e => {
        e.preventDefault();
        const sx=e.clientX,sy=e.clientY,sw=target.offsetWidth,sh=target.offsetHeight;
        const mv = e2 => {
            target.style.width  = `${Math.max(420,sw+(sx-e2.clientX))}px`;
            target.style.height = `${Math.max(320,sh+(sy-e2.clientY))}px`;
        };
        const up = () => {
            document.removeEventListener('mousemove',mv); document.removeEventListener('mouseup',up);
            savedW=target.offsetWidth; savedH=target.offsetHeight;
            GM_setValue('ss_panW',savedW); GM_setValue('ss_panH',savedH);
        };
        document.addEventListener('mousemove',mv); document.addEventListener('mouseup',up);
    });
}

// ═══════════════════════════════════════════════════════════════
//  TOGGLE + DOCK + INIT
// ═══════════════════════════════════════════════════════════════
function togglePanel() {
    if (!panel) { injectStyles(); buildUI(); }
    if (panelDocked) { undockPanel(); return; }
    panelVisible = !panelVisible;
    panel.classList.toggle('on', panelVisible);
    if (panelVisible) { tabUnread[activeTab]=0; updateTabUnread(activeTab); }
}
function dockPanel() {
    if (!panel) return;
    panelDocked=true; panelVisible=false;
    panel.classList.remove('on');
    panel.classList.add('docked');
    panel.classList.remove('dock-open');
    panel.addEventListener('mouseenter', _onDockEnter);
    panel.addEventListener('mouseleave', _onDockLeave);
}
function undockPanel() {
    if (!panel) return;
    panelDocked=false;
    panel.classList.remove('docked','dock-open');
    panel.classList.add('on');
    panelVisible=true;
    panel.removeEventListener('mouseenter', _onDockEnter);
    panel.removeEventListener('mouseleave', _onDockLeave);
    clearTimeout(_dockTimer);
    tabUnread[activeTab]=0; updateTabUnread(activeTab);
}
let _dockTimer = null;
function _onDockEnter() {
    clearTimeout(_dockTimer);
    _dockTimer = setTimeout(() => { if(panelDocked&&panel) panel.classList.add('dock-open'); }, 150);
}
function _onDockLeave() {
    clearTimeout(_dockTimer);
    _dockTimer = setTimeout(() => { if(panelDocked&&panel) panel.classList.remove('dock-open'); }, 500);
}

GM_registerMenuCommand('ScriptSpy: Toggle Debug Panel', togglePanel);

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { injectStyles(); buildUI(); });
} else {
    injectStyles(); buildUI();
}

})();