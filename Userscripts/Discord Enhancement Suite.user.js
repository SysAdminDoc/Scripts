// ==UserScript==
// @name         Discord Enhancement Suite
// @namespace    https://github.com/SysAdminDoc/DiscordEnhancementSuite
// @version      2.0.0
// @description  27-feature Discord power-user toolkit: message tools, privacy controls, image enhancements, user notes, IRC colors, and more.
// @author       Matt (SysAdminDoc)
// @license      MIT
// @match        https://discord.com/*
// @match        https://*.discord.com/*
// @exclude      https://discord.com/login*
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_download
// @grant        GM_setClipboard
// @grant        GM_registerMenuCommand
// @grant        GM_xmlhttpRequest
// @connect      api.mymemory.translated.net
// @run-at       document-start
// @downloadURL  https://github.com/SysAdminDoc/DiscordEnhancementSuite/raw/main/DiscordEnhancementSuite.user.js
// @updateURL    https://github.com/SysAdminDoc/DiscordEnhancementSuite/raw/main/DiscordEnhancementSuite.meta.js
// ==/UserScript==

(function () {
    'use strict';

    const SCRIPT_PREFIX = 'DES';
    const VERSION = '2.0.0';

    const DEFAULT_SETTINGS = {
        instantDelete:true, quickReactions:true, copyMessageText:true, copyMessageLink:true,
        copyMessageId:true, messageBookmarks:true, bulkSelect:true,
        keyboardShortcuts:true, hideTitleBar:true, hideBlockedMsgs:true, fixExpiredLinks:true,
        fullTimestamps:true, ircColors:true, alwaysAnimate:true,
        silentTyping:true, noTracking:true, clearTrackingUrls:true, alwaysTrust:true,
        fullResImages:true, imageZoom:true, reverseImgSearch:true, voiceMsgDownload:true,
        userNotes:true, whoReacted:true,
        quickImageDownload:true, userIdCopy:true,
        quickEmoji:[
            {name:'thumbsup',unicode:'\u{1F44D}'},{name:'heart',unicode:'\u{2764}\u{FE0F}'},
            {name:'laughing',unicode:'\u{1F606}'},{name:'eyes',unicode:'\u{1F440}'},
            {name:'fire',unicode:'\u{1F525}'},{name:'check_mark',unicode:'\u{2705}'},
        ],
        toolbarOpacity:0.85,
    };

    // =========================================================================
    //  SETTINGS MANAGER
    // =========================================================================
    const Settings = {
        _cache:null,
        load(){
            try{const r=(typeof GM_getValue!=='undefined')?GM_getValue(`${SCRIPT_PREFIX}_settings`,null):localStorage.getItem(`${SCRIPT_PREFIX}_settings`);this._cache=r?JSON.parse(r):{...DEFAULT_SETTINGS};}catch{this._cache={...DEFAULT_SETTINGS};}
            for(const[k,v]of Object.entries(DEFAULT_SETTINGS)){if(!(k in this._cache))this._cache[k]=v;}return this._cache;
        },
        save(){const j=JSON.stringify(this._cache);try{if(typeof GM_setValue!=='undefined')GM_setValue(`${SCRIPT_PREFIX}_settings`,j);else localStorage.setItem(`${SCRIPT_PREFIX}_settings`,j);}catch{}},
        get(key){if(!this._cache)this.load();return this._cache[key];},
        set(key,value){if(!this._cache)this.load();this._cache[key]=value;this.save();},
        getAll(){if(!this._cache)this.load();return{...this._cache};},
    };
    Settings.load();

    // =========================================================================
    //  FETCH INTERCEPTOR (runs BEFORE Discord loads)
    //  Silent Typing + Analytics Blocker
    // =========================================================================
    const _origFetch = window.fetch;
    window.fetch = function(url, opts){
        const u = (typeof url==='string') ? url : (url?.url||String(url));
        if(Settings.get('silentTyping') && /\/typing$/i.test(u) && opts?.method?.toUpperCase()==='POST')
            return Promise.resolve(new Response('{}',{status:204,statusText:'Blocked by DES'}));
        if(Settings.get('noTracking')){
            if(/\/(science|track|metrics|experiments)$/i.test(u)||/sentry\.io/i.test(u)||/discord\.com\/api\/v\d+\/science/i.test(u)||/discord\.com\/error-reporting/i.test(u))
                return Promise.resolve(new Response('{}',{status:204,statusText:'Blocked by DES'}));
        }
        return _origFetch.apply(this,arguments);
    };

    // =========================================================================
    //  RESILIENT SELECTORS
    // =========================================================================
    const S = {
        messageListItem:'li[id^="chat-messages-"]',
        messageArticle:'[role="article"][data-list-item-id*="chat-messages"]',
        messageContent:'[class*="messageContent_"]',
        messageHeader:'[class*="header_c19a55"],[class*="header_"][class*="c19a55"]',
        messageTimestamp:'time[id^="message-timestamp-"]',
        contentsWrap:'[class*="contents_c19a55"],[class*="contents_"]',
        buttonContainer:'[class*="buttonContainer_c19a55"],[class*="buttonContainer_"]',
        messageButtons:'[role="group"][aria-label="Message Actions"]',
        hoverBar:'[class*="buttonsInner_"]',
        reactions:'[class*="reactions_"]',
        reaction:'[class*="reaction_"]',
        chatContent:'[class*="chatContent_"]',
        messagesWrapper:'[class*="messagesWrapper_"]',
        scrollerInner:'[class*="scrollerInner_"]',
        channelTextArea:'[class*="channelTextArea_"]',
        sidebar:'[class*="sidebar_"]',
        blockedMessage:'[class*="blockedSystemMessage"]',
        avatar:'[class*="avatar_c19a55"]',
        username:'[class*="username_c19a55"],[class*="username_"]',
        imageWrapper:'[class*="imageWrapper_"]',
    };

    // =========================================================================
    //  SVG ICONS
    // =========================================================================
    const Icons = {
        trash:`<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>`,
        copy:`<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`,
        link:`<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>`,
        bookmark:`<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>`,
        bookmarkFilled:`<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>`,
        hash:`<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/><line x1="10" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="14" y2="21"/></svg>`,
        select:`<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>`,
        settings:`<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`,
        download:`<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`,
        pin:`<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="17" x2="12" y2="22"/><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24z"/></svg>`,
        keyboard:`<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2" ry="2"/><line x1="6" y1="8" x2="6" y2="8"/><line x1="10" y1="8" x2="10" y2="8"/><line x1="14" y1="8" x2="14" y2="8"/><line x1="18" y1="8" x2="18" y2="8"/><line x1="8" y1="12" x2="8" y2="12"/><line x1="12" y1="12" x2="12" y2="12"/><line x1="16" y1="12" x2="16" y2="12"/><line x1="7" y1="16" x2="17" y2="16"/></svg>`,
        search:`<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,
        note:`<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`,
    };

    // =========================================================================
    //  GLOBAL STYLES
    // =========================================================================
    const injectStyles = () => {
        const css = `
#des-toast-container{position:fixed;top:24px;right:24px;z-index:99999;display:flex;flex-direction:column;gap:8px;pointer-events:none}
.des-toast{pointer-events:auto;background:var(--background-floating,#18191c);color:var(--text-normal,#dcddde);border:1px solid var(--background-modifier-accent,#40444b);border-radius:8px;padding:10px 16px;font:500 13px/1.4 'gg sans','Noto Sans',sans-serif;box-shadow:0 8px 24px rgba(0,0,0,.4);display:flex;align-items:center;gap:8px;animation:des-toast-in .25s ease-out;max-width:360px}
.des-toast.des-toast-out{animation:des-toast-out .2s ease-in forwards}
.des-toast-success{border-left:3px solid #3ba55d}.des-toast-error{border-left:3px solid #ed4245}.des-toast-info{border-left:3px solid #5865f2}.des-toast-warn{border-left:3px solid #faa61a}
@keyframes des-toast-in{from{opacity:0;transform:translateX(80px)}to{opacity:1;transform:translateX(0)}}
@keyframes des-toast-out{from{opacity:1;transform:translateX(0)}to{opacity:0;transform:translateX(80px)}}

.des-msg-actions{position:absolute;top:-16px;right:0;display:none;align-items:center;gap:2px;background:var(--background-floating,#18191c);border:1px solid var(--background-modifier-accent,#40444b);border-radius:6px;padding:2px 4px;z-index:100;box-shadow:0 2px 8px rgba(0,0,0,.3);transition:right .08s ease-out;pointer-events:auto}
${S.messageArticle}:hover .des-msg-actions,.des-msg-actions:hover{display:flex!important}
.des-bar-sep{width:1px;height:20px;margin:0 3px;flex-shrink:0;background:var(--background-modifier-accent,#40444b)}
.des-action-btn{display:flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:4px;cursor:pointer;color:var(--interactive-normal,#b9bbbe);transition:background .12s,color .12s;position:relative}
.des-action-btn:hover{background:var(--background-modifier-hover,#32353b);color:var(--interactive-hover,#dcddde)}
.des-action-btn.des-delete:hover{color:#ed4245}.des-action-btn.des-bookmark-active{color:#faa61a}.des-action-btn svg{width:18px;height:18px}
.des-reaction-btn{display:flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:4px;cursor:pointer;font-size:18px;line-height:1;transition:background .12s,transform .12s;position:relative}
.des-reaction-btn:hover{background:var(--background-modifier-hover,#32353b);transform:scale(1.25)}
.des-action-btn::after,.des-reaction-btn::after{content:attr(data-tooltip);position:absolute;bottom:calc(100% + 6px);left:50%;transform:translateX(-50%);white-space:nowrap;background:var(--background-floating,#18191c);color:var(--text-normal,#dcddde);border:1px solid var(--background-modifier-accent,#40444b);border-radius:4px;padding:4px 8px;font-size:12px;pointer-events:none;opacity:0;transition:opacity .15s;box-shadow:0 2px 8px rgba(0,0,0,.3);z-index:101}
.des-action-btn:hover::after,.des-reaction-btn:hover::after{opacity:1}

.des-bulk-mode ${S.messageArticle}{cursor:crosshair}
.des-bulk-mode ${S.messageArticle}:hover{outline:1px dashed var(--brand-experiment,#5865f2);outline-offset:-1px}
.des-bulk-selected{background:rgba(88,101,242,.12)!important;outline:1px solid var(--brand-experiment,#5865f2)!important;outline-offset:-1px}
.des-select-check{position:absolute;left:8px;top:50%;transform:translateY(-50%);width:20px;height:20px;border-radius:4px;border:2px solid var(--interactive-normal,#b9bbbe);display:none;align-items:center;justify-content:center;background:transparent;z-index:50}
.des-bulk-mode .des-select-check{display:flex}
.des-bulk-selected .des-select-check{background:var(--brand-experiment,#5865f2);border-color:var(--brand-experiment,#5865f2);color:#fff}
#des-bulk-bar{position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:var(--background-floating,#18191c);border:1px solid var(--background-modifier-accent,#40444b);border-radius:10px;padding:10px 20px;display:none;align-items:center;gap:16px;z-index:99998;box-shadow:0 8px 32px rgba(0,0,0,.5);font:500 14px/1 'gg sans','Noto Sans',sans-serif;color:var(--text-normal,#dcddde)}
#des-bulk-bar.active{display:flex}
#des-bulk-bar button{background:none;border:none;color:inherit;cursor:pointer;padding:6px 14px;border-radius:6px;font:inherit;transition:background .12s}
#des-bulk-bar button:hover{background:var(--background-modifier-hover,#32353b)}
#des-bulk-bar .des-bulk-danger{color:#ed4245}#des-bulk-bar .des-bulk-danger:hover{background:rgba(237,66,69,.15)}
#des-bulk-bar .des-bulk-count{font-weight:700;color:var(--brand-experiment,#5865f2);min-width:30px;text-align:center}

.des-full-timestamp{font-size:11px;color:var(--text-muted,#72767d);margin-left:4px;font-weight:400}

#des-settings-overlay{position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:100000;display:none;align-items:center;justify-content:center}
#des-settings-overlay.active{display:flex}
#des-settings-panel{background:var(--background-primary,#36393f);border:1px solid var(--background-modifier-accent,#40444b);border-radius:12px;width:560px;max-height:85vh;overflow-y:auto;color:var(--text-normal,#dcddde);box-shadow:0 16px 48px rgba(0,0,0,.5);font-family:'gg sans','Noto Sans',sans-serif}
#des-settings-panel::-webkit-scrollbar{width:8px}#des-settings-panel::-webkit-scrollbar-thumb{background:var(--scrollbar-thin-thumb,#1a1b1e);border-radius:4px}#des-settings-panel::-webkit-scrollbar-track{background:var(--scrollbar-thin-track,#2b2d31)}
.des-settings-header{display:flex;align-items:center;justify-content:space-between;padding:20px 24px;border-bottom:1px solid var(--background-modifier-accent,#40444b);position:sticky;top:0;background:var(--background-primary,#36393f);z-index:1}
.des-settings-header h2{font-size:18px;font-weight:700;margin:0;display:flex;align-items:center;gap:8px}
.des-settings-header .des-version{font-size:11px;padding:2px 8px;border-radius:10px;background:var(--brand-experiment,#5865f2);color:#fff}
.des-settings-close{background:none;border:none;color:var(--interactive-normal,#b9bbbe);cursor:pointer;font-size:20px;width:32px;height:32px;display:flex;align-items:center;justify-content:center;border-radius:50%;transition:background .12s}
.des-settings-close:hover{background:var(--background-modifier-hover,#32353b)}
.des-settings-body{padding:16px 24px 24px}
.des-settings-section{margin-bottom:20px}
.des-settings-section h3{font-size:12px;font-weight:700;text-transform:uppercase;color:var(--header-secondary,#b5bac1);margin:0 0 12px;letter-spacing:.02em}
.des-toggle-row{display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid rgba(255,255,255,.04)}
.des-toggle-row:last-child{border-bottom:none}
.des-toggle-label{font-size:14px}.des-toggle-desc{font-size:12px;color:var(--text-muted,#72767d);margin-top:2px}
.des-switch{position:relative;width:40px;height:22px;flex-shrink:0}
.des-switch input{opacity:0;width:0;height:0}
.des-switch-slider{position:absolute;inset:0;cursor:pointer;background:var(--input-background,#1e1f22);border-radius:22px;transition:background .2s}
.des-switch-slider::before{content:'';position:absolute;width:18px;height:18px;left:2px;top:2px;background:#72767d;border-radius:50%;transition:transform .2s,background .2s}
.des-switch input:checked+.des-switch-slider{background:var(--brand-experiment,#5865f2)}
.des-switch input:checked+.des-switch-slider::before{transform:translateX(18px);background:#fff}

.des-emoji-grid{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px}
.des-emoji-chip{display:flex;align-items:center;gap:4px;background:var(--background-secondary,#2b2d31);border:1px solid var(--background-modifier-accent,#40444b);border-radius:6px;padding:4px 8px;font-size:18px;cursor:default;transition:border-color .15s}
.des-emoji-chip:hover{border-color:var(--brand-experiment,#5865f2)}
.des-emoji-chip .des-emoji-remove{display:flex;align-items:center;justify-content:center;width:18px;height:18px;border-radius:50%;background:transparent;border:none;color:var(--text-muted,#72767d);cursor:pointer;font-size:14px;line-height:1;transition:background .12s,color .12s}
.des-emoji-chip .des-emoji-remove:hover{background:rgba(237,66,69,.2);color:#ed4245}
.des-emoji-add-row{display:flex;gap:8px;margin-bottom:12px}
.des-emoji-input{flex:1;background:var(--input-background,#1e1f22);border:1px solid var(--input-border,#40444b);border-radius:6px;padding:6px 10px;font-size:16px;color:var(--text-normal,#dcddde);outline:none;transition:border-color .15s}
.des-emoji-input:focus{border-color:var(--brand-experiment,#5865f2)}
.des-emoji-input::placeholder{color:var(--text-muted,#72767d)}
.des-emoji-add-btn{background:var(--brand-experiment,#5865f2);color:#fff;border:none;border-radius:6px;padding:6px 16px;font:500 14px/1 'gg sans','Noto Sans',sans-serif;cursor:pointer;transition:opacity .12s}
.des-emoji-add-btn:hover{opacity:.85}
.des-emoji-presets{display:flex;flex-wrap:wrap;gap:4px}
.des-emoji-preset{display:flex;align-items:center;justify-content:center;width:34px;height:34px;border-radius:6px;font-size:20px;background:var(--background-secondary,#2b2d31);border:1px solid transparent;cursor:pointer;transition:border-color .12s,transform .12s}
.des-emoji-preset:hover{border-color:var(--brand-experiment,#5865f2);transform:scale(1.15)}
.des-emoji-preset.des-emoji-active{border-color:var(--brand-experiment,#5865f2);background:rgba(88,101,242,.15)}
.des-shortcut-list{list-style:none;padding:0;margin:0}
.des-shortcut-list li{display:flex;align-items:center;justify-content:space-between;padding:6px 0;font-size:13px}
.des-kbd{display:inline-flex;align-items:center;gap:4px;background:var(--background-secondary,#2b2d31);border:1px solid var(--background-modifier-accent,#40444b);border-radius:4px;padding:2px 8px;font-size:12px;font-family:monospace;color:var(--text-muted,#72767d)}

.des-hide-titlebar .visual-refresh{--custom-app-top-bar-height:0px !important}
.des-hide-titlebar [class*="title_"][class*="c38106"],.des-hide-titlebar [class*="title__85643"]{visibility:hidden!important}
.des-hide-titlebar [class*="trailing_c38106"],.des-hide-titlebar [class*="trailing_"][class*="c38106"]{position:absolute;top:12px;right:10px;z-index:101}
.des-hide-titlebar [class*="sidebarListRounded_"]{border-top-left-radius:0!important;border-top:none!important}
.des-hide-titlebar [class*="chat_"][data-has-border=true]{border-top:none!important}

${S.messageArticle}{position:relative}

#des-fab{position:fixed;bottom:24px;right:24px;z-index:99997;width:42px;height:42px;border-radius:50%;background:var(--brand-experiment,#5865f2);color:#fff;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 16px rgba(0,0,0,.4);transition:transform .2s,box-shadow .2s}
#des-fab:hover{transform:scale(1.1);box-shadow:0 6px 24px rgba(0,0,0,.5)}
#des-fab svg{width:22px;height:22px}

/* === V2 NEW FEATURE STYLES === */
.des-always-animate [class*="avatar_"] img[src*=".gif"],.des-always-animate img[class*="emoji"][src*=".gif"]{content-visibility:auto!important}
.des-always-animate [class*="avatar_"] img{animation-play-state:running!important}
.des-always-animate [class*="animatedContainer_"]{animation-play-state:running!important}
.des-irc-colored{color:var(--des-user-color)!important}
.des-zoom-level{position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,.7);color:#fff;padding:4px 12px;border-radius:16px;font:500 13px/1 'gg sans',sans-serif;z-index:100001;pointer-events:none;opacity:0;transition:opacity .2s}
.des-zoom-level.visible{opacity:1}
.des-img-search-btn{position:absolute;top:8px;right:8px;z-index:50;width:32px;height:32px;border-radius:6px;background:rgba(0,0,0,.6);color:#fff;border:none;cursor:pointer;display:none;align-items:center;justify-content:center;backdrop-filter:blur(4px);transition:background .12s}
.des-img-search-btn:hover{background:rgba(88,101,242,.8)}
.des-img-search-btn svg{width:16px;height:16px}
[class*="imageWrapper_"]:hover .des-img-search-btn,[class*="imageContainer_"]:hover .des-img-search-btn{display:flex!important}
.des-voice-dl-btn{display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:50%;margin-left:6px;background:var(--background-modifier-hover,#32353b);color:var(--interactive-normal,#b9bbbe);border:none;cursor:pointer;transition:color .12s,background .12s;vertical-align:middle}
.des-voice-dl-btn:hover{color:#3ba55d;background:var(--background-modifier-accent,#40444b)}
.des-voice-dl-btn svg{width:16px;height:16px}
.des-user-notes{padding:8px 12px;border-top:1px solid var(--background-modifier-accent,#40444b)}
.des-user-notes-label{font-size:11px;font-weight:700;text-transform:uppercase;color:var(--header-secondary,#b5bac1);margin-bottom:4px;display:flex;align-items:center;gap:4px}
.des-user-notes-label svg{width:12px;height:12px}
.des-user-notes textarea{width:100%;min-height:48px;max-height:120px;resize:vertical;background:var(--input-background,#1e1f22);border:1px solid var(--input-border,#40444b);border-radius:6px;padding:6px 8px;font:400 13px/1.4 'gg sans','Noto Sans',sans-serif;color:var(--text-normal,#dcddde);outline:none;transition:border-color .15s;box-sizing:border-box}
.des-user-notes textarea:focus{border-color:var(--brand-experiment,#5865f2)}
.des-user-notes textarea::placeholder{color:var(--text-muted,#72767d)}
.des-reactor-tooltip{position:absolute;bottom:calc(100% + 6px);left:50%;transform:translateX(-50%);background:var(--background-floating,#18191c);color:var(--text-normal,#dcddde);border:1px solid var(--background-modifier-accent,#40444b);border-radius:6px;padding:6px 10px;font-size:12px;white-space:nowrap;max-width:250px;box-shadow:0 4px 12px rgba(0,0,0,.4);z-index:200;pointer-events:none;opacity:0;transition:opacity .15s}
.des-reactor-tooltip.visible{opacity:1}
.des-reactor-tooltip .des-reactor-name{display:block;overflow:hidden;text-overflow:ellipsis}
.des-url-cleaned{text-decoration-style:dotted!important}
`;
        if(typeof GM_addStyle!=='undefined')GM_addStyle(css);else{const s=document.createElement('style');s.textContent=css;(document.head||document.documentElement).appendChild(s);}
    };

    // =========================================================================
    //  UTILITIES
    // =========================================================================
    const Utils = {
        getToken(){try{const f=document.createElement('iframe');f.style.display='none';document.body.appendChild(f);const t=JSON.parse(f.contentWindow.localStorage.getItem('token'));f.remove();return t;}catch{try{let t=null;window.webpackChunkdiscord_app.push([[Symbol()],{},o=>{for(const e of Object.values(o.c)){try{if(!e.exports||e.exports===window)continue;if(e.exports?.getToken)t=e.exports.getToken();for(const k in e.exports){if(e.exports?.[k]?.getToken&&e.exports[k][Symbol.toStringTag]!=='IntlMessagesProxy')t=e.exports[k].getToken();}}catch{}}}]);window.webpackChunkdiscord_app.pop();return t;}catch{return null;}}},
        async apiRequest(endpoint,method='GET',body=null){
            const token=this.getToken();if(!token){Toast.show('Auth token not found.','error');return null;}
            const opts={method,headers:{'Authorization':token,'Content-Type':'application/json'}};
            if(body)opts.body=JSON.stringify(body);
            try{const r=await fetch(`https://discord.com/api/v9${endpoint}`,opts);
                if(r.status===429){const d=await r.json().catch(()=>({}));const w=(d.retry_after||1)*1000+100;Toast.show(`Rate limited ${Math.ceil(w/1000)}s`,'warn');await new Promise(r=>setTimeout(r,w));return this.apiRequest(endpoint,method,body);}
                if(r.status===204)return true;if(!r.ok)return null;return r.json().catch(()=>true);
            }catch(err){console.error(`${SCRIPT_PREFIX} API:`,err);return null;}
        },
        getMessageId(el){const li=el.closest(S.messageListItem);if(!li)return null;const p=li.id.split('-');return p[p.length-1];},
        getChannelId(el){const li=el.closest(S.messageListItem);if(!li)return null;const p=li.id.split('-');return p.length>=4?p[2]:null;},
        getChannelIdFromUrl(){const m=location.pathname.match(/\/channels\/(\d+)\/(\d+)/);return m?m[2]:null;},
        getGuildIdFromUrl(){const m=location.pathname.match(/\/channels\/(\d+)\/(\d+)/);return m?m[1]:null;},
        waitForElement(sel,timeout=15000){return new Promise((res,rej)=>{const el=document.querySelector(sel);if(el)return res(el);const o=new MutationObserver((_,ob)=>{const f=document.querySelector(sel);if(f){ob.disconnect();res(f);}});o.observe(document.documentElement,{childList:true,subtree:true});setTimeout(()=>{o.disconnect();rej(new Error('Timeout'));},timeout);});},
        debounce(fn,ms){let t;return(...a)=>{clearTimeout(t);t=setTimeout(()=>fn(...a),ms);};},
        copyToClipboard(text){if(typeof GM_setClipboard!=='undefined'){GM_setClipboard(text);return true;}return navigator.clipboard.writeText(text).then(()=>true).catch(()=>false);},
        hashColor(str){let h=0;for(let i=0;i<str.length;i++)h=str.charCodeAt(i)+((h<<5)-h);return`hsl(${Math.abs(h%360)},70%,65%)`;},
        cleanUrl(urlStr){try{const u=new URL(urlStr);const tp=['utm_source','utm_medium','utm_campaign','utm_term','utm_content','fbclid','gclid','gclsrc','dclid','gbraid','wbraid','msclkid','mc_cid','mc_eid','twclid','igshid','s_kwcid'];let c=false;tp.forEach(p=>{if(u.searchParams.has(p)){u.searchParams.delete(p);c=true;}});return c?u.toString():null;}catch{return null;}},
        getUserIdFromPopout(popout){const av=popout.querySelector('img[src*="/avatars/"]');if(av){const m=av.src.match(/\/avatars\/(\d+)\//);if(m)return m[1];}return popout.closest('[data-user-id]')?.dataset?.userId||null;},
    };

    // =========================================================================
    //  TOAST
    // =========================================================================
    const Toast = {
        _container:null,
        _ensureContainer(){if(this._container)return;this._container=document.createElement('div');this._container.id='des-toast-container';document.body.appendChild(this._container);},
        show(msg,type='info',dur=3000){this._ensureContainer();const el=document.createElement('div');el.className=`des-toast des-toast-${type}`;el.textContent=msg;this._container.appendChild(el);setTimeout(()=>{el.classList.add('des-toast-out');el.addEventListener('animationend',()=>el.remove());},dur);},
    };

    // =========================================================================
    //  BOOKMARKS + USER NOTES (localStorage)
    // =========================================================================
    const Bookmarks = {
        _key:`${SCRIPT_PREFIX}_bookmarks`,
        _load(){try{return JSON.parse(localStorage.getItem(this._key)||'{}');}catch{return{};}},
        _save(d){localStorage.setItem(this._key,JSON.stringify(d));},
        isBookmarked(c,m){return!!this._load()[`${c}-${m}`];},
        toggle(c,m,content){const d=this._load();const k=`${c}-${m}`;if(d[k]){delete d[k];this._save(d);return false;}d[k]={channelId:c,messageId:m,content:content?.substring(0,200)||'',timestamp:Date.now(),url:`https://discord.com/channels/${Utils.getGuildIdFromUrl()||'@me'}/${c}/${m}`};this._save(d);return true;},
        getAll(){return Object.values(this._load()).sort((a,b)=>b.timestamp-a.timestamp);},
    };
    const UserNotes = {
        _key:`${SCRIPT_PREFIX}_usernotes`,
        _load(){try{return JSON.parse(localStorage.getItem(this._key)||'{}');}catch{return{};}},
        _save(d){localStorage.setItem(this._key,JSON.stringify(d));},
        get(uid){return this._load()[uid]||'';},
        set(uid,note){const d=this._load();if(note.trim())d[uid]=note.trim();else delete d[uid];this._save(d);},
    };

    // =========================================================================
    //  BULK SELECT
    // =========================================================================
    const BulkSelect = {
        active:false,selected:new Set(),
        toggle(){this.active=!this.active;document.body.classList.toggle('des-bulk-mode',this.active);if(!this.active)this.clearAll();this._updateBar();},
        toggleMessage(el){if(!this.active)return;const mid=Utils.getMessageId(el),cid=Utils.getChannelId(el);if(!mid)return;const art=el.closest(S.messageArticle)||el;const k=`${cid}:${mid}`;if(this.selected.has(k)){this.selected.delete(k);art.classList.remove('des-bulk-selected');}else{this.selected.add(k);art.classList.add('des-bulk-selected');}this._updateBar();},
        clearAll(){this.selected.clear();document.querySelectorAll('.des-bulk-selected').forEach(el=>el.classList.remove('des-bulk-selected'));this._updateBar();},
        async deleteSelected(){if(this.selected.size===0)return;const n=this.selected.size;Toast.show(`Deleting ${n} msg(s)...`,'info');let d=0;for(const k of[...this.selected]){const[c,m]=k.split(':');const r=await Utils.apiRequest(`/channels/${c}/messages/${m}`,'DELETE');if(r!==null){d++;this.selected.delete(k);}await new Promise(r=>setTimeout(r,150+Math.random()*100));}Toast.show(`Deleted ${d}/${n}`,d===n?'success':'warn');this.clearAll();},
        _updateBar(){const b=document.getElementById('des-bulk-bar');if(!b)return;b.classList.toggle('active',this.active);const c=b.querySelector('.des-bulk-count');if(c)c.textContent=this.selected.size;},
    };

    // =========================================================================
    //  MESSAGE ENHANCER
    // =========================================================================
    const MessageEnhancer = {
        _processed:new WeakSet(),
        enhance(messageEl){
            if(this._processed.has(messageEl))return;this._processed.add(messageEl);
            const article=messageEl.querySelector(S.messageArticle)||messageEl;
            if(!article.matches(S.messageArticle))return;
            const settings=Settings.getAll();

            const bar=document.createElement('div');bar.className='des-msg-actions';
            if(settings.quickReactions&&settings.quickEmoji.length>0){
                settings.quickEmoji.forEach(({name,unicode})=>{const btn=document.createElement('div');btn.className='des-reaction-btn';btn.textContent=unicode;btn.dataset.tooltip=`:${name}:`;btn.addEventListener('click',async(e)=>{e.stopPropagation();const c=Utils.getChannelId(article),m=Utils.getMessageId(article);if(!c||!m)return;const r=await Utils.apiRequest(`/channels/${c}/messages/${m}/reactions/${encodeURIComponent(unicode)}/@me`,'PUT');if(r!==null){btn.style.transform='scale(1.4)';setTimeout(()=>btn.style.transform='',200);}});bar.appendChild(btn);});
                const sep=document.createElement('div');sep.className='des-bar-sep';bar.appendChild(sep);
            }
            const addA=(icon,tip,cls,fn)=>{const b=document.createElement('div');b.className=`des-action-btn ${cls}`;b.innerHTML=icon;b.dataset.tooltip=tip;b.addEventListener('click',(e)=>{e.stopPropagation();fn(e,article);});bar.appendChild(b);};
            if(settings.instantDelete)addA(Icons.trash,'Delete','des-delete',async(e,a)=>{const c=Utils.getChannelId(a),m=Utils.getMessageId(a);if(!c||!m)return;(await Utils.apiRequest(`/channels/${c}/messages/${m}`,'DELETE'))!==null?Toast.show('Deleted','success',1500):Toast.show('Failed','error');});
            if(settings.copyMessageText)addA(Icons.copy,'Copy text','des-copy',(e,a)=>{const t=a.querySelector(S.messageContent)?.textContent?.trim();t?(Utils.copyToClipboard(t),Toast.show('Copied','success',1500)):Toast.show('No text','warn',1500);});
            if(settings.copyMessageLink)addA(Icons.link,'Copy link','des-link',(e,a)=>{const c=Utils.getChannelId(a),m=Utils.getMessageId(a),g=Utils.getGuildIdFromUrl()||'@me';if(c&&m){Utils.copyToClipboard(`https://discord.com/channels/${g}/${c}/${m}`);Toast.show('Link copied','success',1500);}});
            if(settings.copyMessageId)addA(Icons.hash,'Copy ID','des-id',(e,a)=>{const m=Utils.getMessageId(a);if(m){Utils.copyToClipboard(m);Toast.show(`ID: ${m}`,'success',1500);}});
            if(settings.messageBookmarks){const ci=Utils.getChannelId(article),mi=Utils.getMessageId(article),bm=ci&&mi&&Bookmarks.isBookmarked(ci,mi);addA(bm?Icons.bookmarkFilled:Icons.bookmark,'Bookmark',`des-bookmark ${bm?'des-bookmark-active':''}`,(e,a)=>{const c=Utils.getChannelId(a),m=Utils.getMessageId(a),tx=a.querySelector(S.messageContent)?.textContent?.trim()||'';if(!c||!m)return;const added=Bookmarks.toggle(c,m,tx);const b=e.currentTarget;b.innerHTML=added?Icons.bookmarkFilled:Icons.bookmark;b.classList.toggle('des-bookmark-active',added);Toast.show(added?'Bookmarked':'Removed','success',1500);});}
            addA(Icons.pin,'Pin/Unpin','des-pin',async(e,a)=>{const c=Utils.getChannelId(a),m=Utils.getMessageId(a);if(!c||!m)return;let r=await Utils.apiRequest(`/channels/${c}/pins/${m}`,'PUT');if(r!==null){Toast.show('Pinned','success',1500);return;}r=await Utils.apiRequest(`/channels/${c}/pins/${m}`,'DELETE');r!==null?Toast.show('Unpinned','success',1500):Toast.show('Failed','error');});
            if(settings.bulkSelect)addA(Icons.select,'Select','des-select',(e,a)=>{if(!BulkSelect.active)BulkSelect.toggle();BulkSelect.toggleMessage(a);});
            article.appendChild(bar);

            // Dynamic positioning
            const posBar=()=>{const d=article.querySelector('[role="group"][aria-label="Message Actions"]:not(.des-msg-actions)');if(d&&d.offsetWidth>0){bar.style.right=(d.offsetWidth+8)+'px';return true;}bar.style.right='280px';return false;};
            article.addEventListener('mouseenter',()=>{if(!posBar())requestAnimationFrame(()=>{if(!posBar())setTimeout(posBar,50);});});

            // IRC Colors
            if(settings.ircColors){const u=article.querySelector(S.username);if(u&&!u.dataset.desColored){u.dataset.desColored='1';const n=u.textContent.trim();if(n){u.classList.add('des-irc-colored');u.style.setProperty('--des-user-color',Utils.hashColor(n));}}}

            // Full Timestamps
            if(settings.fullTimestamps){const t=article.querySelector(S.messageTimestamp);if(t&&!t.dataset.desProcessed){t.dataset.desProcessed='1';const dt=t.getAttribute('datetime');if(dt){const s=document.createElement('span');s.className='des-full-timestamp';s.textContent=new Date(dt).toLocaleString(undefined,{weekday:'short',year:'numeric',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit'});const ts=t.closest('[class*="timestamp_"]');if(ts&&!ts.querySelector('.des-full-timestamp'))ts.appendChild(s);}}}

            // Reverse Image Search
            if(settings.reverseImgSearch){article.querySelectorAll('[class*="imageWrapper_"]').forEach(w=>{if(w.querySelector('.des-img-search-btn'))return;w.style.position='relative';const b=document.createElement('button');b.className='des-img-search-btn';b.innerHTML=Icons.search;b.title='Reverse image search';b.addEventListener('click',(e)=>{e.stopPropagation();e.preventDefault();const img=w.querySelector('img');if(img?.src)window.open(`https://lens.google.com/uploadbyurl?url=${encodeURIComponent(img.src)}`,'_blank');});w.appendChild(b);});}

            // Voice Message Download
            if(settings.voiceMsgDownload){article.querySelectorAll('[class*="audioControls_"],[class*="waveform_"]').forEach(v=>{if(v.querySelector('.des-voice-dl-btn'))return;const au=article.querySelector('audio');if(!au?.src)return;const b=document.createElement('button');b.className='des-voice-dl-btn';b.innerHTML=Icons.download;b.title='Download voice message';b.addEventListener('click',(e)=>{e.stopPropagation();if(typeof GM_download!=='undefined')GM_download({url:au.src,name:`voice_${Utils.getMessageId(article)||Date.now()}.ogg`});else{const a=document.createElement('a');a.href=au.src;a.download=`voice_${Date.now()}.ogg`;document.body.appendChild(a);a.click();a.remove();}Toast.show('Downloading','success',1500);});v.appendChild(b);});}

            // Clear Tracking URLs
            if(settings.clearTrackingUrls){article.querySelectorAll('a[href]').forEach(link=>{if(link.dataset.desCleaned)return;link.dataset.desCleaned='1';const cleaned=Utils.cleanUrl(link.href);if(cleaned){link.href=cleaned;link.classList.add('des-url-cleaned');link.title='Tracking params removed by DES';}});}

            // Who Reacted
            if(settings.whoReacted){article.querySelectorAll('[class*="reaction_"]').forEach(rx=>{if(rx.dataset.desReactor)return;rx.dataset.desReactor='1';rx.style.position='relative';let tip=null;rx.addEventListener('mouseenter',async()=>{const cid=Utils.getChannelId(article),mid=Utils.getMessageId(article);if(!cid||!mid)return;const imgEl=rx.querySelector('img');const emojiText=rx.querySelector('[class*="emoji"]')?.textContent;let ep='';if(imgEl?.src){const m=imgEl.src.match(/emojis\/(\d+)/);if(m)ep=`${(imgEl.alt||'e').replace(/:/g,'')}:${m[1]}`;}else if(emojiText)ep=encodeURIComponent(emojiText.trim());if(!ep)return;if(!tip){tip=document.createElement('div');tip.className='des-reactor-tooltip';rx.appendChild(tip);}tip.textContent='Loading...';tip.classList.add('visible');const data=await Utils.apiRequest(`/channels/${cid}/messages/${mid}/reactions/${ep}?limit=10`);if(Array.isArray(data)&&data.length>0)tip.innerHTML=data.map(u=>`<span class="des-reactor-name">${u.global_name||u.username}</span>`).join('');else tip.textContent='No data';});rx.addEventListener('mouseleave',()=>{if(tip)tip.classList.remove('visible');});});}

            // Bulk click
            article.addEventListener('click',(e)=>{if(!BulkSelect.active)return;if(e.target.closest('.des-action-btn')||e.target.closest('.des-reaction-btn'))return;BulkSelect.toggleMessage(article);});
        },
        enhanceAll(){document.querySelectorAll(S.messageListItem).forEach(li=>this.enhance(li));},
    };

    // =========================================================================
    //  KEYBOARD SHORTCUTS
    // =========================================================================
    const KeyboardShortcuts = {
        _hov:null,
        init(){
            if(!Settings.get('keyboardShortcuts'))return;
            document.addEventListener('mouseover',(e)=>{const a=e.target.closest(S.messageArticle);if(a)this._hov=a;});
            document.addEventListener('mouseout',(e)=>{const a=e.target.closest(S.messageArticle);if(a&&a===this._hov&&!a.contains(e.relatedTarget))this._hov=null;});
            document.addEventListener('keydown',(e)=>{
                const ac=document.activeElement;if(ac&&(ac.isContentEditable||ac.tagName==='INPUT'||ac.tagName==='TEXTAREA'))return;
                if(e.ctrlKey&&e.shiftKey&&e.code==='KeyD'){e.preventDefault();this._del();return;}
                if(e.ctrlKey&&e.shiftKey&&e.code==='KeyR'){e.preventDefault();this._react();return;}
                if(e.ctrlKey&&e.shiftKey&&e.code==='KeyC'){e.preventDefault();this._copy();return;}
                if(e.ctrlKey&&e.shiftKey&&e.code==='KeyB'){e.preventDefault();BulkSelect.toggle();Toast.show(BulkSelect.active?'Bulk ON':'Bulk OFF','info',1500);return;}
                if(e.ctrlKey&&e.shiftKey&&e.code==='KeyS'){e.preventDefault();SettingsPanel.toggle();return;}
                if(e.code==='Escape'&&BulkSelect.active){BulkSelect.toggle();Toast.show('Bulk OFF','info',1500);}
            },true);
        },
        async _del(){if(!this._hov)return Toast.show('Hover a message first','warn',1500);const c=Utils.getChannelId(this._hov),m=Utils.getMessageId(this._hov);if(!c||!m)return;(await Utils.apiRequest(`/channels/${c}/messages/${m}`,'DELETE'))!==null?Toast.show('Deleted','success',1500):Toast.show('Failed','error');},
        async _react(){if(!this._hov)return Toast.show('Hover a message first','warn',1500);const c=Utils.getChannelId(this._hov),m=Utils.getMessageId(this._hov);if(!c||!m)return;const em=Settings.get('quickEmoji')?.[0];if(!em)return;await Utils.apiRequest(`/channels/${c}/messages/${m}/reactions/${encodeURIComponent(em.unicode)}/@me`,'PUT');},
        _copy(){if(!this._hov)return Toast.show('Hover a message first','warn',1500);const t=this._hov.querySelector(S.messageContent)?.textContent?.trim();t?(Utils.copyToClipboard(t),Toast.show('Copied','success',1500)):Toast.show('No text','warn',1500);},
    };

    // =========================================================================
    //  SETTINGS PANEL
    // =========================================================================
    const SettingsPanel = {
        _overlay:null,
        toggle(){this._overlay?(this._overlay.classList.toggle('active')&&this._render()):this._create();},
        _create(){this._overlay=document.createElement('div');this._overlay.id='des-settings-overlay';this._overlay.classList.add('active');this._overlay.addEventListener('click',(e)=>{if(e.target===this._overlay)this._overlay.classList.remove('active');});const p=document.createElement('div');p.id='des-settings-panel';this._overlay.appendChild(p);document.body.appendChild(this._overlay);this._render();},
        _render(){
            const panel=document.getElementById('des-settings-panel');if(!panel)return;
            const s=Settings.getAll();
            const groups=[
                {title:'Message Toolbar',features:[
                    {key:'instantDelete',label:'Instant Delete',desc:'One-click delete, no confirmation.'},
                    {key:'quickReactions',label:'Quick Reactions',desc:'Emoji bar on hover for instant reactions.'},
                    {key:'copyMessageText',label:'Copy Text',desc:'Copy message text content.'},
                    {key:'copyMessageLink',label:'Copy Link',desc:'Copy direct message link.'},
                    {key:'copyMessageId',label:'Copy ID',desc:'Copy Snowflake message ID.'},
                    {key:'messageBookmarks',label:'Bookmarks',desc:'Locally bookmark messages.'},
                    {key:'bulkSelect',label:'Bulk Select & Delete',desc:'Multi-select for batch deletion.'},
                ]},
                {title:'Privacy & Security',features:[
                    {key:'silentTyping',label:'Silent Typing',desc:'Hide your typing indicator from others.'},
                    {key:'noTracking',label:'Block Analytics',desc:'Block Discord telemetry, science, and Sentry.'},
                    {key:'clearTrackingUrls',label:'Clean Tracking URLs',desc:'Strip UTM, fbclid, gclid params from links.'},
                    {key:'alwaysTrust',label:'Auto-Trust Links',desc:'Skip "Leaving Discord" external link warnings.'},
                ]},
                {title:'Media Enhancements',features:[
                    {key:'fullResImages',label:'Full-Res Images',desc:'Load original resolution (strip CDN compression).'},
                    {key:'imageZoom',label:'Image Zoom',desc:'Shift+Scroll to zoom in lightbox images.'},
                    {key:'reverseImgSearch',label:'Reverse Image Search',desc:'Google Lens button on hover over images.'},
                    {key:'voiceMsgDownload',label:'Voice Msg Download',desc:'Download button on voice messages.'},
                ]},
                {title:'Social Features',features:[
                    {key:'userNotes',label:'User Notes',desc:'Add private notes to any user via their popout.'},
                    {key:'whoReacted',label:'Who Reacted',desc:'Hover reactions to see who reacted.'},
                ]},
                {title:'UI Enhancements',features:[
                    {key:'ircColors',label:'IRC Username Colors',desc:'Unique color per username based on hash.'},
                    {key:'alwaysAnimate',label:'Always Animate',desc:'Force animated avatars and emoji.'},
                    {key:'fullTimestamps',label:'Full Timestamps',desc:'Detailed date/time on every message.'},
                    {key:'hideTitleBar',label:'Hide Title Bar',desc:'Remove Discord\'s top title bar.'},
                    {key:'hideBlockedMsgs',label:'Hide Blocked Msgs',desc:'Completely hide blocked user messages.'},
                    {key:'fixExpiredLinks',label:'Fix Expired Links',desc:'Redirect expired CDN links.'},
                    {key:'keyboardShortcuts',label:'Keyboard Shortcuts',desc:'Power-user hotkeys.'},
                ]},
            ];
            const shortcuts=[{keys:'Ctrl+Shift+D',action:'Delete hovered message'},{keys:'Ctrl+Shift+R',action:'React to hovered message'},{keys:'Ctrl+Shift+C',action:'Copy hovered message text'},{keys:'Ctrl+Shift+B',action:'Toggle bulk select'},{keys:'Ctrl+Shift+S',action:'Open settings'},{keys:'Escape',action:'Exit bulk / close panel'}];
            panel.innerHTML=`
                <div class="des-settings-header"><h2>${Icons.settings} Discord Enhancement Suite <span class="des-version">v${VERSION}</span></h2><button class="des-settings-close" id="des-settings-close-btn">&times;</button></div>
                <div class="des-settings-body">
                    ${groups.map(g=>`<div class="des-settings-section"><h3>${g.title}</h3>${g.features.map(f=>`<div class="des-toggle-row"><div><div class="des-toggle-label">${f.label}</div><div class="des-toggle-desc">${f.desc}</div></div><label class="des-switch"><input type="checkbox" data-key="${f.key}" ${s[f.key]?'checked':''}><span class="des-switch-slider"></span></label></div>`).join('')}</div>`).join('')}
                    <div class="des-settings-section"><h3>${Icons.keyboard} Keyboard Shortcuts</h3><ul class="des-shortcut-list">${shortcuts.map(x=>`<li><span>${x.action}</span><span class="des-kbd">${x.keys}</span></li>`).join('')}</ul></div>
                    <div class="des-settings-section"><h3>Quick Reaction Emoji</h3><div class="des-toggle-desc" style="margin-bottom:12px">Click to remove, or add from input/presets.</div><div class="des-emoji-grid" id="des-emoji-grid">${s.quickEmoji.map((e,i)=>`<div class="des-emoji-chip" data-index="${i}"><span>${e.unicode}</span><button class="des-emoji-remove" data-index="${i}" title="Remove :${e.name}:">&times;</button></div>`).join('')}</div><div class="des-emoji-add-row"><input type="text" class="des-emoji-input" id="des-emoji-input" placeholder="Paste or type an emoji..." maxlength="8"><button class="des-emoji-add-btn" id="des-emoji-add-btn">Add</button></div><div class="des-toggle-desc" style="margin-bottom:8px">Quick add:</div><div class="des-emoji-presets" id="des-emoji-presets">${[{u:'\u{1F44D}',n:'thumbsup'},{u:'\u{2764}\u{FE0F}',n:'heart'},{u:'\u{1F606}',n:'laughing'},{u:'\u{1F440}',n:'eyes'},{u:'\u{1F525}',n:'fire'},{u:'\u{2705}',n:'check_mark'},{u:'\u{1F44E}',n:'thumbsdown'},{u:'\u{1F622}',n:'cry'},{u:'\u{1F60D}',n:'heart_eyes'},{u:'\u{1F914}',n:'thinking'},{u:'\u{1F389}',n:'tada'},{u:'\u{1F4AF}',n:'100'},{u:'\u{1F44F}',n:'clap'},{u:'\u{1F602}',n:'joy'},{u:'\u{1F62E}',n:'open_mouth'},{u:'\u{1F631}',n:'scream'},{u:'\u{2B50}',n:'star'},{u:'\u{1F4A9}',n:'poop'},{u:'\u{1F480}',n:'skull'},{u:'\u{1F64F}',n:'pray'},{u:'\u{270C}\u{FE0F}',n:'v'},{u:'\u{1F44C}',n:'ok_hand'},{u:'\u{1F60E}',n:'sunglasses'},{u:'\u{1F923}',n:'rofl'}].map(p=>{const a=s.quickEmoji.some(e=>e.unicode===p.u);return'<div class="des-emoji-preset'+(a?' des-emoji-active':'')+'" data-unicode="'+p.u+'" data-name="'+p.n+'" title=":'+p.n+':">'+p.u+'</div>';}).join('')}</div></div>
                    <div class="des-settings-section" style="text-align:center;opacity:.5;font-size:12px;">Discord Enhancement Suite v${VERSION} by SysAdminDoc<br>27 features | Changes take effect after page reload.</div>
                </div>`;
            panel.querySelector('#des-settings-close-btn').addEventListener('click',()=>this._overlay.classList.remove('active'));
            panel.querySelectorAll('input[type="checkbox"][data-key]').forEach(inp=>{inp.addEventListener('change',()=>{Settings.set(inp.dataset.key,inp.checked);Toast.show(`${inp.dataset.key}: ${inp.checked?'ON':'OFF'}`,'info',1500);});});
            const refresh=()=>this._render();
            panel.querySelectorAll('.des-emoji-remove').forEach(b=>{b.addEventListener('click',(e)=>{e.stopPropagation();const i=parseInt(b.dataset.index,10);const em=Settings.get('quickEmoji');if(i>=0&&i<em.length){const rm=em.splice(i,1)[0];Settings.set('quickEmoji',em);Toast.show(`Removed :${rm.name}:`,'info',1500);refresh();}});});
            const addEmoji=()=>{const inp=panel.querySelector('#des-emoji-input');const v=inp?.value?.trim();if(!v)return;const match=v.match(/\p{Emoji_Presentation}|\p{Emoji}\uFE0F/u);const ch=match?match[0]:v.substring(0,2);const em=Settings.get('quickEmoji');if(em.some(e=>e.unicode===ch))return Toast.show('Already added','warn',1500);if(em.length>=12)return Toast.show('Max 12','warn',1500);em.push({name:v.replace(/[^\w]/g,'')||'custom_'+Date.now().toString(36),unicode:ch});Settings.set('quickEmoji',em);Toast.show(`Added ${ch}`,'success',1500);refresh();};
            const ab=panel.querySelector('#des-emoji-add-btn');if(ab)ab.addEventListener('click',addEmoji);
            const ei=panel.querySelector('#des-emoji-input');if(ei)ei.addEventListener('keydown',(e)=>{if(e.key==='Enter'){e.preventDefault();addEmoji();}});
            panel.querySelectorAll('.des-emoji-preset').forEach(pb=>{pb.addEventListener('click',()=>{const u=pb.dataset.unicode,n=pb.dataset.name;const em=Settings.get('quickEmoji');const idx=em.findIndex(e=>e.unicode===u);if(idx>=0){em.splice(idx,1);Settings.set('quickEmoji',em);Toast.show(`Removed :${n}:`,'info',1500);}else{if(em.length>=12)return Toast.show('Max 12','warn',1500);em.push({name:n,unicode:u});Settings.set('quickEmoji',em);Toast.show(`Added :${n}:`,'success',1500);}refresh();});});
        },
    };

    // =========================================================================
    //  STANDALONE FEATURES
    // =========================================================================
    const BlockedMessages={init(){if(!Settings.get('hideBlockedMsgs'))return;this.hideAll();},hideAll(){document.querySelectorAll(S.blockedMessage).forEach(el=>{const p=el.parentElement?.parentElement;if(p)p.style.display='none';});}};
    const ExpiredLinkFixer={init(){if(!Settings.get('fixExpiredLinks'))return;if(location.hostname.includes('discordapp')||location.hostname.includes('cdn.discord')){if(document.body?.innerText?.trim()==='This content is no longer available.')location.href='https://fixcdn.hyonsu.com/'+location.href.split('/').slice(3).join('/');}}};
    const TitleBar={init(){document.body.classList.toggle('des-hide-titlebar',Settings.get('hideTitleBar'));}};
    const AlwaysAnimate={init(){document.body.classList.toggle('des-always-animate',Settings.get('alwaysAnimate'));}};

    const AlwaysTrust={init(){
        if(!Settings.get('alwaysTrust'))return;
        new MutationObserver(()=>{
            document.querySelectorAll('[class*="modal_"] [class*="root_"],[class*="focusLock_"]').forEach(modal=>{
                const h=modal.querySelector('h1,[class*="heading_"]');if(!h)return;
                const t=h.textContent.toLowerCase();
                if(t.includes('leaving discord')||t.includes('hold up')||t.includes('external link')){
                    const link=modal.querySelector('a[href][rel*="noreferrer"],a[href][class*="link_"]');
                    if(link){link.click();return;}
                    for(const btn of modal.querySelectorAll('button')){const bt=btn.textContent.toLowerCase();if(bt.includes('visit')||bt.includes('yep')||bt.includes('continue')||bt.includes('trust')){btn.click();return;}}
                }
            });
        }).observe(document.body,{childList:true,subtree:true});
    }};

    const FullResImages={init(){if(!Settings.get('fullResImages'))return;this._processAll();},_processAll(){document.querySelectorAll('img[src*="cdn.discordapp.com"],img[src*="media.discordapp.net"]').forEach(img=>{if(img.dataset.desFullRes)return;img.dataset.desFullRes='1';try{const u=new URL(img.src);['width','height','size'].forEach(p=>u.searchParams.delete(p));if(u.searchParams.has('quality'))u.searchParams.set('quality','lossless');if(img.src!==u.toString())img.src=u.toString();}catch{}});}};

    const ImageZoom={_zoom:1,_indicator:null,init(){
        if(!Settings.get('imageZoom'))return;
        document.addEventListener('wheel',(e)=>{
            if(!e.shiftKey)return;const modal=e.target.closest('[class*="modal_"]');if(!modal)return;
            const img=modal.querySelector('img[class*="zoomedMediaFit_"],img[class*="mediaBarItem_"],[class*="imageContainer_"] img,img[class*="lazyImg_"]');if(!img)return;
            e.preventDefault();e.stopPropagation();
            this._zoom=Math.max(0.25,Math.min(10,this._zoom+(e.deltaY>0?-0.15:0.15)));
            const r=img.getBoundingClientRect();const x=(e.clientX-r.left)/r.width*100;const y=(e.clientY-r.top)/r.height*100;
            img.style.transformOrigin=`${x}% ${y}%`;img.style.transform=`scale(${this._zoom})`;img.style.transition='transform .08s ease-out';
            this._showLevel();
        },{passive:false,capture:true});
        new MutationObserver(()=>{if(!document.querySelector('[class*="modal_"] img'))this._zoom=1;}).observe(document.body,{childList:true,subtree:true});
    },_showLevel(){if(!this._indicator){this._indicator=document.createElement('div');this._indicator.className='des-zoom-level';document.body.appendChild(this._indicator);}this._indicator.textContent=`${Math.round(this._zoom*100)}%`;this._indicator.classList.add('visible');clearTimeout(this._timer);this._timer=setTimeout(()=>this._indicator.classList.remove('visible'),1200);}};

    const UserNotesUI={_processed:new WeakSet(),init(){if(!Settings.get('userNotes'))return;},processPopouts(){
        document.querySelectorAll('[class*="userPopoutInner_"],[class*="userProfileInner_"],[class*="userProfileOuterThemed_"]').forEach(pop=>{
            if(this._processed.has(pop))return;this._processed.add(pop);
            const uid=Utils.getUserIdFromPopout(pop);if(!uid||pop.querySelector('.des-user-notes'))return;
            const c=document.createElement('div');c.className='des-user-notes';
            c.innerHTML=`<div class="des-user-notes-label">${Icons.note} DES Notes</div><textarea placeholder="Add a private note..." maxlength="1000"></textarea>`;
            const ta=c.querySelector('textarea');ta.value=UserNotes.get(uid);
            let t;ta.addEventListener('input',()=>{clearTimeout(t);t=setTimeout(()=>UserNotes.set(uid,ta.value),500);});
            ta.addEventListener('click',(e)=>e.stopPropagation());
            (pop.querySelector('[class*="body_"]')||pop).appendChild(c);
        });
    }};

    const BulkBar={init(){if(!Settings.get('bulkSelect'))return;const b=document.createElement('div');b.id='des-bulk-bar';b.innerHTML=`<span>Selected: <span class="des-bulk-count">0</span></span><button class="des-bulk-danger" id="des-bulk-delete-btn">Delete Selected</button><button id="des-bulk-clear-btn">Clear</button><button id="des-bulk-exit-btn">Exit</button>`;document.body.appendChild(b);b.querySelector('#des-bulk-delete-btn').addEventListener('click',()=>BulkSelect.deleteSelected());b.querySelector('#des-bulk-clear-btn').addEventListener('click',()=>BulkSelect.clearAll());b.querySelector('#des-bulk-exit-btn').addEventListener('click',()=>{BulkSelect.toggle();Toast.show('Bulk OFF','info',1500);});}};
    const FAB={init(){const b=document.createElement('button');b.id='des-fab';b.innerHTML=Icons.settings;b.title='DES Settings';b.addEventListener('click',()=>SettingsPanel.toggle());document.body.appendChild(b);}};

    // =========================================================================
    //  MUTATION OBSERVER
    // =========================================================================
    const Observer={_obs:null,init(){
        this._obs=new MutationObserver(Utils.debounce(()=>{
            MessageEnhancer.enhanceAll();
            if(Settings.get('hideBlockedMsgs'))BlockedMessages.hideAll();
            if(Settings.get('fullResImages'))FullResImages._processAll();
            if(Settings.get('userNotes'))UserNotesUI.processPopouts();
        },100));
        this._obs.observe(document.documentElement,{childList:true,subtree:true});
    }};

    // =========================================================================
    //  MENU COMMANDS
    // =========================================================================
    const registerMenuCommands=()=>{
        if(typeof GM_registerMenuCommand==='undefined')return;
        GM_registerMenuCommand('DES Settings',()=>SettingsPanel.toggle());
        GM_registerMenuCommand('DES Toggle Bulk Mode',()=>{BulkSelect.toggle();Toast.show(BulkSelect.active?'Bulk ON':'Bulk OFF','info',1500);});
        GM_registerMenuCommand('DES Toggle Silent Typing',()=>{const c=Settings.get('silentTyping');Settings.set('silentTyping',!c);Toast.show(`Silent typing: ${!c?'ON':'OFF'}`,'info',2000);});
        GM_registerMenuCommand('DES Copy My User ID',()=>{try{const f=document.createElement('iframe');f.style.display='none';document.body.appendChild(f);const t=JSON.parse(f.contentWindow.localStorage.getItem('token'));f.remove();if(t){const uid=atob(t.split('.')[0]);Utils.copyToClipboard(uid);Toast.show(`User ID: ${uid}`,'success');}}catch{Toast.show('Could not extract user ID','error');}});
    };

    // =========================================================================
    //  BOOTSTRAP
    // =========================================================================
    const init=async()=>{
        injectStyles();
        try{await Utils.waitForElement(S.chatContent,30000);}catch{console.log(`${SCRIPT_PREFIX}: Chat not found, starting anyway`);}
        TitleBar.init();AlwaysAnimate.init();AlwaysTrust.init();BlockedMessages.init();ExpiredLinkFixer.init();
        FullResImages.init();ImageZoom.init();UserNotesUI.init();
        FAB.init();BulkBar.init();KeyboardShortcuts.init();registerMenuCommands();
        MessageEnhancer.enhanceAll();Observer.init();
        console.log(`%c ${SCRIPT_PREFIX} v${VERSION} loaded (27 features)`,'color:#5865f2;font-weight:bold;font-size:14px;');
    };
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();