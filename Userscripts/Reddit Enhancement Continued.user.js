// ==UserScript==
// @name         Reddit Enhancement Continued
// @namespace    https://github.com/SysAdminDoc/Reddit-Enhancement-Continued
// @version      2.8.1
// @description  A comprehensive enhancement suite for old.reddit.com - themes, navigation, filtering, media, and more
// @author       Reddit Enhancement Continued
// @match        https://old.reddit.com/*
// @match        https://www.reddit.com/*
// @match        https://reddit.com/*
// @exclude      https://*.reddit.com/poll/*
// @exclude      https://*.reddit.com/gallery/*
// @exclude      https://www.reddit.com/media*
// @exclude      https://chat.reddit.com/*
// @exclude      https://www.reddit.com/appeal*
// @exclude      https://www.reddit.com/notifications*
// @exclude      https://embed.reddit.com/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_deleteValue
// @grant        GM_addStyle
// @grant        GM_registerMenuCommand
// @grant        GM_xmlhttpRequest
// @grant        GM_setClipboard
// @connect      i.redd.it
// @connect      v.redd.it
// @connect      preview.redd.it
// @connect      imgur.com
// @connect      i.imgur.com
// @connect      gfycat.com
// @connect      redgifs.com
// @connect      streamable.com
// @connect      reddit.com
// @connect      old.reddit.com
// @connect      www.reddit.com
// @connect      api.reddit.com
// @run-at       document-start
// @icon         https://b.thumbs.redditmedia.com/JeP1WF0kEiiH1gT8vOr_7kFAwIlHzRBHjLDZIkQP61Q.jpg
// @downloadURL  https://github.com/SysAdminDoc/Reddit-Enhancement-Continued/raw/refs/heads/main/RedditEnhancementContinued.user.js
// @updateURL    https://github.com/SysAdminDoc/Reddit-Enhancement-Continued/raw/refs/heads/main/RedditEnhancementContinued.user.js
// @noframes
// ==/UserScript==

(function() {
    'use strict';

    // =========================================================================
    // CONFIGURATION & STORAGE
    // =========================================================================
    const VERSION = '2.8.1';

    const CONFIG = {
        version: VERSION,
        storageKeys: {
            settings: 'rel_settings_v2',
            userTags: 'rel_user_tags',
            visitedComments: 'rel_visited_comments',
            filters: 'rel_filters_v2',
            subredditShortcuts: 'rel_sr_shortcuts',
            ignoredUsers: 'rel_ignored_users',
            voteWeights: 'rel_vote_weights',
            commentMacros: 'rel_comment_macros',
            settingsBackup: 'rel_backup'
        },
        defaults: {
            // Core
            darkMode: true,
            theme: 'amoled',
            neverEndingReddit: true,
            nerPauseAfterPages: 0,
            inlineImageExpansion: true,
            userTagging: true,
            keyboardNav: true,
            commentHighlighting: true,
            collapseChildComments: true,
            collapseChildCommentsDefault: true,
            collapseChildCommentsNested: false,
            collapseChildCommentsHideNested: false,
            postFiltering: true,
            highlightNewComments: true,
            oldRedditRedirect: true,
            oldFavicon: true,
            collapsibleSidebar: true,
            hideAutoModerator: true,
            embedYouTube: true,
            embedRedditPreviews: true,
            inlineImageFix: true,
            embedSocialMedia: true,
            // New v2 features
            commentDepthIndicators: true,
            formattingToolbar: true,
            livePreview: true,
            voteEnhancements: true,
            singleClickOpener: true,
            pageNavigator: true,
            subredditShortcuts: true,
            userHighlighter: true,
            selectedEntryHighlight: true,
            expandContinueThread: true,
            noParticipation: true,
            showTimestamps: true,
            hideGoldButton: true,
            hideShareButton: true,
            hideSaveButton: true,
            hideCrosspostButton: true,
            hideReportButton: true,
            hideSidebar: true,
            autoHideAfterVote: false,
            scrollToTopOnNav: true,
            showUserInfo: true,
            customCSS: '',
            // Depth color scheme
            depthColorScheme: 'rainbow',
            // Keyboard shortcut modifier
            kbModifier: 'none',
            // New v2.1 features from uploaded scripts
            removeSubredditStyles: true,
            wideView: true,
            subredditDescription: true,
            stateSaver: true,
            downloadButtons: true,
            adBlocker: true,
            // v2.4 UX enhancements
            enhancedUI: true,
            // v2.7 Classic Reddit++ features
            viewCounter: true,
            voteEstimator: true,
            fullScores: true,
            userPrefix: true,
            notificationRedirect: true,
            trendingSubreddits: false,
            // Migration flag (skip v2.2.1 migration for new installs)
            _migratedV221: true
        }
    };

    // =========================================================================
    // STORAGE ENGINE
    // =========================================================================
    const Storage = {
        get(key, defaultValue = null) {
            try {
                const value = GM_getValue(key, null);
                return value !== null ? JSON.parse(value) : defaultValue;
            } catch (e) {
                return defaultValue;
            }
        },
        set(key, value) {
            GM_setValue(key, JSON.stringify(value));
        },
        remove(key) {
            GM_deleteValue(key);
        },
        exportAll() {
            const data = {};
            Object.entries(CONFIG.storageKeys).forEach(([name, key]) => {
                data[name] = Storage.get(key);
            });
            return JSON.stringify(data, null, 2);
        },
        importAll(jsonString) {
            try {
                const data = JSON.parse(jsonString);
                Object.entries(CONFIG.storageKeys).forEach(([name, key]) => {
                    if (data[name] !== undefined) {
                        Storage.set(key, data[name]);
                    }
                });
                return true;
            } catch (e) {
                return false;
            }
        }
    };

    // Load settings with migration from v1
    let settings = Storage.get(CONFIG.storageKeys.settings, null);
    if (!settings) {
        const oldSettings = Storage.get('rel_settings', null);
        settings = oldSettings ? { ...CONFIG.defaults, ...oldSettings } : { ...CONFIG.defaults };
    }
    Object.keys(CONFIG.defaults).forEach(key => {
        if (settings[key] === undefined) settings[key] = CONFIG.defaults[key];
    });

    // Migration from v2.2.0: reset features that caused post hiding
    if (!settings._migratedV221) {
        settings.adBlocker = CONFIG.defaults.adBlocker;
        settings.removeSubredditStyles = CONFIG.defaults.removeSubredditStyles;
        settings._migratedV221 = true;
        Storage.set(CONFIG.storageKeys.settings, settings);
        console.log('REL: Migrated settings from v2.2.0 - reset adBlocker and removeSubredditStyles to safe defaults');
    }

    let userTags = Storage.get(CONFIG.storageKeys.userTags, {});
    let filters = Storage.get(CONFIG.storageKeys.filters, {
        keywords: [], domains: [], subreddits: [], flairs: [], users: [],
        useRegex: false, hideNSFW: false, hideVisited: false
    });
    let visitedComments = Storage.get(CONFIG.storageKeys.visitedComments, {});
    let ignoredUsers = Storage.get(CONFIG.storageKeys.ignoredUsers, []);
    let voteWeights = Storage.get(CONFIG.storageKeys.voteWeights, {});
    let subredditShortcuts = Storage.get(CONFIG.storageKeys.subredditShortcuts, []);
    let commentMacros = Storage.get(CONFIG.storageKeys.commentMacros, [
        { name: 'Shrug', text: String.fromCharCode(175) + '\\_(ツ)_/' + String.fromCharCode(175) },
        { name: 'Table Flip', text: '(' + String.fromCharCode(9583) + String.fromCharCode(176) + String.fromCharCode(9633) + String.fromCharCode(176) + ')' + String.fromCharCode(9583) + String.fromCharCode(65077) + ' ' + String.fromCharCode(9531) + String.fromCharCode(9473) + String.fromCharCode(9531) },
        { name: 'Disapproval', text: String.fromCharCode(3232) + '_' + String.fromCharCode(3232) }
    ]);

    function saveSettings() { Storage.set(CONFIG.storageKeys.settings, settings); }
    function saveUserTags() { Storage.set(CONFIG.storageKeys.userTags, userTags); }
    function saveFilters() { Storage.set(CONFIG.storageKeys.filters, filters); }
    function saveVisitedComments() { Storage.set(CONFIG.storageKeys.visitedComments, visitedComments); }
    function saveIgnoredUsers() { Storage.set(CONFIG.storageKeys.ignoredUsers, ignoredUsers); }
    function saveVoteWeights() { Storage.set(CONFIG.storageKeys.voteWeights, voteWeights); }
    function saveShortcuts() { Storage.set(CONFIG.storageKeys.subredditShortcuts, subredditShortcuts); }
    function saveMacros() { Storage.set(CONFIG.storageKeys.commentMacros, commentMacros); }

    // =========================================================================
    // OLD REDDIT REDIRECT
    // =========================================================================
    if (settings.oldRedditRedirect && window.location.hostname === 'www.reddit.com') {
        if (!window.location.pathname.startsWith('/media') &&
            !window.location.pathname.startsWith('/poll') &&
            !window.location.pathname.startsWith('/gallery') &&
            !window.location.pathname.startsWith('/appeal') &&
            !window.location.pathname.startsWith('/notifications') &&
            !window.location.pathname.startsWith('/chat')) {
            window.location.hostname = 'old.reddit.com';
            return;
        }
    }

    // =========================================================================
    // UTILITY FUNCTIONS
    // =========================================================================
    const Utils = {
        isOldReddit() {
            return window.location.hostname === 'old.reddit.com' ||
                   document.querySelector('#header') !== null;
        },
        isCommentsPage() {
            return document.body?.classList.contains('comments-page') ||
                   window.location.pathname.includes('/comments/');
        },
        isListingPage() {
            return document.body?.classList.contains('listing-page') ||
                   document.querySelector('.sitetable.linklisting') !== null;
        },
        isSubreddit() {
            const m = window.location.pathname.match(/^\/r\/([^/]+)/);
            return m ? m[1] : null;
        },
        isUserPage() {
            return window.location.pathname.startsWith('/user/') ||
                   window.location.pathname.startsWith('/u/');
        },
        getUsername() {
            const el = document.querySelector('.user a');
            return el ? el.textContent : null;
        },
        debounce(fn, delay) {
            let timer;
            return function(...args) {
                clearTimeout(timer);
                timer = setTimeout(() => fn.apply(this, args), delay);
            };
        },
        throttle(fn, limit) {
            let waiting = false;
            return function(...args) {
                if (!waiting) {
                    fn.apply(this, args);
                    waiting = true;
                    setTimeout(() => { waiting = false; }, limit);
                }
            };
        },
        createElement(tag, attrs = {}, children = []) {
            const el = document.createElement(tag);
            Object.entries(attrs).forEach(([k, v]) => {
                if (k === 'className') el.className = v;
                else if (k === 'innerHTML') el.innerHTML = v;
                else if (k === 'textContent') el.textContent = v;
                else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
                else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
                else el.setAttribute(k, v);
            });
            children.forEach(child => {
                if (typeof child === 'string') el.appendChild(document.createTextNode(child));
                else if (child) el.appendChild(child);
            });
            return el;
        },
        formatNumber(num) {
            if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
            if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
            return String(num);
        },
        timeAgo(date) {
            const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
            if (seconds < 60) return 'just now';
            if (seconds < 3600) return Math.floor(seconds / 60) + 'm ago';
            if (seconds < 86400) return Math.floor(seconds / 3600) + 'h ago';
            if (seconds < 2592000) return Math.floor(seconds / 86400) + 'd ago';
            if (seconds < 31536000) return Math.floor(seconds / 2592000) + 'mo ago';
            return Math.floor(seconds / 31536000) + 'y ago';
        },
        escapeHTML(str) {
            const div = document.createElement('div');
            div.textContent = str;
            return div.innerHTML;
        },
        copyToClipboard(text) {
            try { GM_setClipboard(text); return true; }
            catch (e) {
                try {
                    const ta = document.createElement('textarea');
                    ta.value = text;
                    ta.style.position = 'fixed';
                    ta.style.left = '-9999px';
                    document.body.appendChild(ta);
                    ta.select();
                    document.execCommand('copy');
                    document.body.removeChild(ta);
                    return true;
                } catch (e2) { return false; }
            }
        },
        getThingData(thing) {
            if (!thing) return null;
            return {
                id: thing.getAttribute('data-fullname') || thing.id,
                author: thing.getAttribute('data-author') || thing.querySelector('.author')?.textContent,
                subreddit: thing.getAttribute('data-subreddit') || thing.querySelector('.subreddit')?.textContent?.replace('/r/', ''),
                domain: thing.getAttribute('data-domain'),
                url: thing.getAttribute('data-url'),
                isNSFW: thing.classList.contains('over18'),
                score: parseInt(thing.querySelector('.score.unvoted')?.title || '0'),
                permalink: thing.getAttribute('data-permalink'),
                flair: thing.querySelector('.linkflairlabel')?.textContent?.trim()
            };
        },
        notify(message, type = 'info', duration = 3000) {
            const toast = Utils.createElement('div', {
                className: `rel-toast rel-toast-${type}`,
                textContent: message
            });
            document.body.appendChild(toast);
            requestAnimationFrame(() => toast.classList.add('rel-toast-show'));
            setTimeout(() => {
                toast.classList.remove('rel-toast-show');
                setTimeout(() => toast.remove(), 300);
            }, duration);
        },
        processNewContent(container) {
            if (settings.inlineImageExpansion) ImageExpansionModule.process(container);
            if (settings.userTagging) UserTaggingModule.process(container);
            if (settings.collapseChildComments) CollapseChildCommentsModule.process(container);
            if (settings.commentHighlighting) CommentHighlightingModule.process(container);
            if (settings.hideAutoModerator) HideAutoModeratorModule.process(container);
            IgnoredUsersModule.process(container);
            if (settings.embedYouTube) YouTubeEmbedModule.process(container);
            if (settings.embedRedditPreviews) RedditPreviewModule.process(container);
            if (settings.inlineImageFix) InlineImageFixModule.process(container);
            if (settings.embedSocialMedia) SocialMediaPreviewModule.process(container);
            if (settings.commentDepthIndicators) CommentDepthModule.process(container);
            if (settings.singleClickOpener) SingleClickModule.process(container);
            if (settings.userHighlighter) UserHighlighterModule.process(container);
            if (settings.showTimestamps) TimestampModule.process(container);
            if (settings.expandContinueThread) ExpandThreadModule.process(container);
            if (settings.voteEnhancements) VoteEnhancementsModule.process(container);
            if (settings.formattingToolbar) FormattingToolbarModule.process(container);
            if (settings.selectedEntryHighlight) SelectedEntryModule.process(container);
            if (settings.postFiltering) FilterModule.process(container);
            if (settings.noParticipation) NoParticipationModule.process(container);
            if (settings.showUserInfo) UserInfoModule.process(container);
            if (settings.downloadButtons) DownloadButtonsModule.process(container);
            if (settings.adBlocker) AdBlockModule.process(container);
            if (settings.viewCounter) ViewCounterModule.process(container);
            if (settings.voteEstimator) VoteEstimatorModule.process(container);
        }
    };

    // =========================================================================
    // THEME ENGINE
    // =========================================================================
    const Themes = {
        // Base color definitions per theme
        definitions: {
            dracula: {
                name: 'Dracula',
                bg: '#282a36', bgAlt: '#21222c', bgLight: '#343746',
                surface: '#44475a', surfaceHover: '#4e5270',
                fg: '#f8f8f2', fgMuted: '#bbb8c3', fgDim: '#6272a4',
                accent: '#bd93f9', accentHover: '#caa4ff',
                link: '#8be9fd', linkVisited: '#ff79c6',
                upvote: '#ff79c6', downvote: '#50fa7b',
                border: '#44475a', borderLight: '#383a4a',
                success: '#50fa7b', warning: '#f1fa8c', error: '#ff5555',
                highlight: 'rgba(189,147,249,0.12)', selection: 'rgba(189,147,249,0.25)',
                headerBg: '#21222c', headerFg: '#f8f8f2',
                inputBg: '#383a4a', inputFg: '#f8f8f2', inputBorder: '#555770',
                tagBg: '#44475a', tagFg: '#f8f8f2',
                buttonBg: '#6272a4', buttonFg: '#f8f8f2',
                shadow: 'rgba(0,0,0,0.4)', overlay: 'rgba(0,0,0,0.75)',
                scrollbar: '#555770', scrollbarHover: '#6272a4'
            },
            nord: {
                name: 'Nord',
                bg: '#2e3440', bgAlt: '#272c36', bgLight: '#3b4252',
                surface: '#434c5e', surfaceHover: '#4c566a',
                fg: '#eceff4', fgMuted: '#bfc5cf', fgDim: '#7b88a1',
                accent: '#88c0d0', accentHover: '#8fbcbb',
                link: '#88c0d0', linkVisited: '#b48ead',
                upvote: '#bf616a', downvote: '#a3be8c',
                border: '#3b4252', borderLight: '#434c5e',
                success: '#a3be8c', warning: '#ebcb8b', error: '#bf616a',
                highlight: 'rgba(136,192,208,0.12)', selection: 'rgba(136,192,208,0.25)',
                headerBg: '#272c36', headerFg: '#eceff4',
                inputBg: '#3b4252', inputFg: '#eceff4', inputBorder: '#4c566a',
                tagBg: '#434c5e', tagFg: '#eceff4',
                buttonBg: '#5e81ac', buttonFg: '#eceff4',
                shadow: 'rgba(0,0,0,0.35)', overlay: 'rgba(0,0,0,0.7)',
                scrollbar: '#4c566a', scrollbarHover: '#5e81ac'
            },
            solarizedDark: {
                name: 'Solarized Dark',
                bg: '#002b36', bgAlt: '#002029', bgLight: '#073642',
                surface: '#0a4050', surfaceHover: '#0d4f60',
                fg: '#fdf6e3', fgMuted: '#c4bda8', fgDim: '#657b83',
                accent: '#268bd2', accentHover: '#2e9ee8',
                link: '#268bd2', linkVisited: '#d33682',
                upvote: '#cb4b16', downvote: '#859900',
                border: '#073642', borderLight: '#094452',
                success: '#859900', warning: '#b58900', error: '#dc322f',
                highlight: 'rgba(38,139,210,0.12)', selection: 'rgba(38,139,210,0.25)',
                headerBg: '#002029', headerFg: '#fdf6e3',
                inputBg: '#073642', inputFg: '#fdf6e3', inputBorder: '#0a4050',
                tagBg: '#0a4050', tagFg: '#fdf6e3',
                buttonBg: '#268bd2', buttonFg: '#fdf6e3',
                shadow: 'rgba(0,0,0,0.4)', overlay: 'rgba(0,0,0,0.75)',
                scrollbar: '#0a4050', scrollbarHover: '#268bd2'
            },
            gruvbox: {
                name: 'Gruvbox',
                bg: '#282828', bgAlt: '#1d2021', bgLight: '#3c3836',
                surface: '#504945', surfaceHover: '#665c54',
                fg: '#ebdbb2', fgMuted: '#c9b88c', fgDim: '#928374',
                accent: '#fabd2f', accentHover: '#fdd560',
                link: '#83a598', linkVisited: '#d3869b',
                upvote: '#fb4934', downvote: '#b8bb26',
                border: '#3c3836', borderLight: '#504945',
                success: '#b8bb26', warning: '#fabd2f', error: '#fb4934',
                highlight: 'rgba(250,189,47,0.12)', selection: 'rgba(250,189,47,0.25)',
                headerBg: '#1d2021', headerFg: '#ebdbb2',
                inputBg: '#3c3836', inputFg: '#ebdbb2', inputBorder: '#504945',
                tagBg: '#504945', tagFg: '#ebdbb2',
                buttonBg: '#689d6a', buttonFg: '#ebdbb2',
                shadow: 'rgba(0,0,0,0.4)', overlay: 'rgba(0,0,0,0.75)',
                scrollbar: '#504945', scrollbarHover: '#689d6a'
            },
            catppuccin: {
                name: 'Catppuccin Mocha',
                bg: '#1e1e2e', bgAlt: '#181825', bgLight: '#313244',
                surface: '#45475a', surfaceHover: '#585b70',
                fg: '#cdd6f4', fgMuted: '#b0b8d1', fgDim: '#6c7086',
                accent: '#cba6f7', accentHover: '#dbb8ff',
                link: '#89b4fa', linkVisited: '#f38ba8',
                upvote: '#f38ba8', downvote: '#a6e3a1',
                border: '#313244', borderLight: '#45475a',
                success: '#a6e3a1', warning: '#f9e2af', error: '#f38ba8',
                highlight: 'rgba(203,166,247,0.12)', selection: 'rgba(203,166,247,0.25)',
                headerBg: '#181825', headerFg: '#cdd6f4',
                inputBg: '#313244', inputFg: '#cdd6f4', inputBorder: '#45475a',
                tagBg: '#45475a', tagFg: '#cdd6f4',
                buttonBg: '#74c7ec', buttonFg: '#1e1e2e',
                shadow: 'rgba(0,0,0,0.4)', overlay: 'rgba(0,0,0,0.75)',
                scrollbar: '#45475a', scrollbarHover: '#74c7ec'
            },
            amoled: {
                name: 'AMOLED Black',
                bg: '#000000', bgAlt: '#000000', bgLight: '#111111',
                surface: '#1a1a1a', surfaceHover: '#252525',
                fg: '#e0e0e0', fgMuted: '#aaaaaa', fgDim: '#666666',
                accent: '#4fc3f7', accentHover: '#6dd3ff',
                link: '#4fc3f7', linkVisited: '#ce93d8',
                upvote: '#ff5252', downvote: '#69f0ae',
                border: '#1a1a1a', borderLight: '#222222',
                success: '#69f0ae', warning: '#ffd740', error: '#ff5252',
                highlight: 'rgba(79,195,247,0.1)', selection: 'rgba(79,195,247,0.2)',
                headerBg: '#000000', headerFg: '#e0e0e0',
                inputBg: '#111111', inputFg: '#e0e0e0', inputBorder: '#333333',
                tagBg: '#1a1a1a', tagFg: '#e0e0e0',
                buttonBg: '#333333', buttonFg: '#e0e0e0',
                shadow: 'rgba(0,0,0,0.6)', overlay: 'rgba(0,0,0,0.85)',
                scrollbar: '#333333', scrollbarHover: '#4fc3f7'
            },
            oneDark: {
                name: 'One Dark',
                bg: '#282c34', bgAlt: '#21252b', bgLight: '#2c313c',
                surface: '#3e4451', surfaceHover: '#4b5263',
                fg: '#abb2bf', fgMuted: '#9199a5', fgDim: '#5c6370',
                accent: '#61afef', accentHover: '#74baf2',
                link: '#61afef', linkVisited: '#c678dd',
                upvote: '#e06c75', downvote: '#98c379',
                border: '#3e4451', borderLight: '#2c313c',
                success: '#98c379', warning: '#e5c07b', error: '#e06c75',
                highlight: 'rgba(97,175,239,0.12)', selection: 'rgba(97,175,239,0.25)',
                headerBg: '#21252b', headerFg: '#abb2bf',
                inputBg: '#2c313c', inputFg: '#abb2bf', inputBorder: '#3e4451',
                tagBg: '#3e4451', tagFg: '#abb2bf',
                buttonBg: '#528bca', buttonFg: '#abb2bf',
                shadow: 'rgba(0,0,0,0.4)', overlay: 'rgba(0,0,0,0.75)',
                scrollbar: '#3e4451', scrollbarHover: '#528bca'
            },
            light: {
                name: 'Light (Reddit Classic)',
                bg: '#ffffff', bgAlt: '#f6f7f8', bgLight: '#eef0f2',
                surface: '#e2e4e6', surfaceHover: '#d6d8da',
                fg: '#1a1a1b', fgMuted: '#5a5c5e', fgDim: '#878a8c',
                accent: '#0079d3', accentHover: '#005fa3',
                link: '#0079d3', linkVisited: '#7b5090',
                upvote: '#ff4500', downvote: '#7193ff',
                border: '#e2e4e6', borderLight: '#edeff1',
                success: '#46d160', warning: '#e9a820', error: '#ea0027',
                highlight: 'rgba(0,121,211,0.08)', selection: 'rgba(0,121,211,0.15)',
                headerBg: '#cee3f8', headerFg: '#1a1a1b',
                inputBg: '#ffffff', inputFg: '#1a1a1b', inputBorder: '#c4c6c8',
                tagBg: '#e2e4e6', tagFg: '#1a1a1b',
                buttonBg: '#0079d3', buttonFg: '#ffffff',
                shadow: 'rgba(0,0,0,0.1)', overlay: 'rgba(0,0,0,0.5)',
                scrollbar: '#c4c6c8', scrollbarHover: '#888'
            },
            tokyoNight: {
                name: 'Tokyo Night',
                bg: '#1a1b26', bgAlt: '#16161e', bgLight: '#24283b',
                surface: '#2f3549', surfaceHover: '#3b4261',
                fg: '#c0caf5', fgMuted: '#9aa5ce', fgDim: '#565f89',
                accent: '#7aa2f7', accentHover: '#89b4fa',
                link: '#7dcfff', linkVisited: '#bb9af7',
                upvote: '#f7768e', downvote: '#9ece6a',
                border: '#292e42', borderLight: '#3b4261',
                success: '#9ece6a', warning: '#e0af68', error: '#f7768e',
                highlight: 'rgba(122,162,247,0.12)', selection: 'rgba(122,162,247,0.25)',
                headerBg: '#16161e', headerFg: '#c0caf5',
                inputBg: '#24283b', inputFg: '#c0caf5', inputBorder: '#3b4261',
                tagBg: '#2f3549', tagFg: '#c0caf5',
                buttonBg: '#7aa2f7', buttonFg: '#1a1b26',
                shadow: 'rgba(0,0,0,0.45)', overlay: 'rgba(0,0,0,0.75)',
                scrollbar: '#3b4261', scrollbarHover: '#7aa2f7'
            },
            rosePine: {
                name: 'Rose Pine',
                bg: '#191724', bgAlt: '#1f1d2e', bgLight: '#26233a',
                surface: '#312e48', surfaceHover: '#3d3958',
                fg: '#e0def4', fgMuted: '#bfbdd4', fgDim: '#6e6a86',
                accent: '#c4a7e7', accentHover: '#d4bff7',
                link: '#9ccfd8', linkVisited: '#f6c177',
                upvote: '#eb6f92', downvote: '#31748f',
                border: '#26233a', borderLight: '#312e48',
                success: '#9ccfd8', warning: '#f6c177', error: '#eb6f92',
                highlight: 'rgba(196,167,231,0.12)', selection: 'rgba(196,167,231,0.25)',
                headerBg: '#1f1d2e', headerFg: '#e0def4',
                inputBg: '#26233a', inputFg: '#e0def4', inputBorder: '#3d3958',
                tagBg: '#312e48', tagFg: '#e0def4',
                buttonBg: '#c4a7e7', buttonFg: '#191724',
                shadow: 'rgba(0,0,0,0.45)', overlay: 'rgba(0,0,0,0.75)',
                scrollbar: '#3d3958', scrollbarHover: '#c4a7e7'
            },
            kanagawa: {
                name: 'Kanagawa',
                bg: '#1f1f28', bgAlt: '#16161d', bgLight: '#2a2a37',
                surface: '#363646', surfaceHover: '#43434f',
                fg: '#dcd7ba', fgMuted: '#c8c093', fgDim: '#727169',
                accent: '#7e9cd8', accentHover: '#8fb4e8',
                link: '#7fb4ca', linkVisited: '#957fb8',
                upvote: '#e82424', downvote: '#98bb6c',
                border: '#2a2a37', borderLight: '#363646',
                success: '#98bb6c', warning: '#e6c384', error: '#e82424',
                highlight: 'rgba(126,156,216,0.12)', selection: 'rgba(126,156,216,0.25)',
                headerBg: '#16161d', headerFg: '#dcd7ba',
                inputBg: '#2a2a37', inputFg: '#dcd7ba', inputBorder: '#43434f',
                tagBg: '#363646', tagFg: '#dcd7ba',
                buttonBg: '#7e9cd8', buttonFg: '#1f1f28',
                shadow: 'rgba(0,0,0,0.45)', overlay: 'rgba(0,0,0,0.75)',
                scrollbar: '#43434f', scrollbarHover: '#7e9cd8'
            },
            everforest: {
                name: 'Everforest',
                bg: '#2d353b', bgAlt: '#272e33', bgLight: '#343f44',
                surface: '#3d484d', surfaceHover: '#475258',
                fg: '#d3c6aa', fgMuted: '#b8ad92', fgDim: '#7a8478',
                accent: '#a7c080', accentHover: '#b8d190',
                link: '#83c092', linkVisited: '#d699b6',
                upvote: '#e67e80', downvote: '#83c092',
                border: '#3d484d', borderLight: '#475258',
                success: '#83c092', warning: '#dbbc7f', error: '#e67e80',
                highlight: 'rgba(167,192,128,0.12)', selection: 'rgba(167,192,128,0.25)',
                headerBg: '#272e33', headerFg: '#d3c6aa',
                inputBg: '#343f44', inputFg: '#d3c6aa', inputBorder: '#475258',
                tagBg: '#3d484d', tagFg: '#d3c6aa',
                buttonBg: '#a7c080', buttonFg: '#2d353b',
                shadow: 'rgba(0,0,0,0.4)', overlay: 'rgba(0,0,0,0.7)',
                scrollbar: '#475258', scrollbarHover: '#a7c080'
            },
            synthwave: {
                name: 'Synthwave',
                bg: '#1b1720', bgAlt: '#151019', bgLight: '#261e2e',
                surface: '#352b3f', surfaceHover: '#433752',
                fg: '#f0e4fc', fgMuted: '#c8b8dc', fgDim: '#7b6995',
                accent: '#ff7edb', accentHover: '#ff9ce5',
                link: '#36f9f6', linkVisited: '#fede5d',
                upvote: '#fe4450', downvote: '#72f1b8',
                border: '#2a2139', borderLight: '#352b3f',
                success: '#72f1b8', warning: '#fede5d', error: '#fe4450',
                highlight: 'rgba(255,126,219,0.12)', selection: 'rgba(255,126,219,0.25)',
                headerBg: '#151019', headerFg: '#f0e4fc',
                inputBg: '#261e2e', inputFg: '#f0e4fc', inputBorder: '#433752',
                tagBg: '#352b3f', tagFg: '#f0e4fc',
                buttonBg: '#ff7edb', buttonFg: '#1b1720',
                shadow: 'rgba(0,0,0,0.5)', overlay: 'rgba(0,0,0,0.8)',
                scrollbar: '#433752', scrollbarHover: '#ff7edb'
            },
            githubDark: {
                name: 'GitHub Dark',
                bg: '#0d1117', bgAlt: '#010409', bgLight: '#161b22',
                surface: '#21262d', surfaceHover: '#30363d',
                fg: '#e6edf3', fgMuted: '#b1bac4', fgDim: '#7d8590',
                accent: '#58a6ff', accentHover: '#79c0ff',
                link: '#58a6ff', linkVisited: '#bc8cff',
                upvote: '#f85149', downvote: '#3fb950',
                border: '#21262d', borderLight: '#30363d',
                success: '#3fb950', warning: '#d29922', error: '#f85149',
                highlight: 'rgba(88,166,255,0.1)', selection: 'rgba(88,166,255,0.2)',
                headerBg: '#010409', headerFg: '#e6edf3',
                inputBg: '#161b22', inputFg: '#e6edf3', inputBorder: '#30363d',
                tagBg: '#21262d', tagFg: '#e6edf3',
                buttonBg: '#238636', buttonFg: '#ffffff',
                shadow: 'rgba(0,0,0,0.5)', overlay: 'rgba(0,0,0,0.8)',
                scrollbar: '#30363d', scrollbarHover: '#58a6ff'
            }
        },

        getTheme() {
            return this.definitions[settings.theme] || this.definitions.dracula;
        },

        isDark() {
            return settings.darkMode && settings.theme !== 'light';
        },

        generateCSS() {
            const t = this.getTheme();
            if (!settings.darkMode) return '';
            if (settings.theme === 'light') return '';

            return `
                /* ===== THEME: ${t.name} ===== */

                /* === GLOBAL FOUNDATIONS === */
                html, body {
                    background-color: ${t.bg} !important;
                    color: ${t.fg} !important;
                }
                body > .content, .content[role="main"],
                .side, .footer-parent, .footer,
                .drop-choices, .drop-choices a.choice,
                .linklisting, .commentarea, .sitetable,
                .wiki-page, .wiki-page-content,
                .search-page, .login-page, .submit-page,
                #sr-header-area, .listing-chooser,
                .organic-listing, .infobar,
                .roundfield, .roundfield legend,
                .login-form, .login-form-side {
                    background-color: ${t.bg} !important;
                    color: ${t.fg} !important;
                }

                /* === HEADER === */
                #header { background-color: ${t.headerBg} !important; border-bottom: 1px solid ${t.border} !important; }
                #header-img { opacity: 0.9; }
                #header .tabmenu li a { color: ${t.fgMuted} !important; background: transparent !important; border: none !important; }
                #header .tabmenu li a:hover { color: ${t.fg} !important; }
                #header .tabmenu li.selected a {
                    background-color: ${t.accent} !important; color: ${t.bg} !important;
                    border: none !important; border-radius: 3px 3px 0 0 !important;
                }
                #header-bottom-left { background: transparent !important; }
                #header-bottom-left a, .pagename a, #header .hover { color: ${t.headerFg} !important; }
                #header-bottom-right { color: ${t.fgMuted} !important; }
                #header-bottom-right a { color: ${t.fgMuted} !important; }
                #header-bottom-right a:hover { color: ${t.accent} !important; }
                #header-bottom-right .separator { color: ${t.fgDim} !important; }

                /* Subreddit bar */
                #sr-header-area {
                    background-color: ${t.bgAlt} !important;
                    border-color: ${t.border} !important;
                    color: ${t.fgMuted} !important;
                }
                #sr-header-area a, #sr-header-area .separator,
                #sr-header-area .sr-list a, #sr-header-area .dropdown { color: ${t.fgMuted} !important; }
                #sr-header-area a:hover { color: ${t.accent} !important; }
                #sr-header-area .width-clip { background: transparent !important; }
                #sr-more-link { color: ${t.fgDim} !important; }

                /* === LINKS === */
                a { color: ${t.link} !important; }
                a:visited { color: ${t.linkVisited} !important; }
                .thing .title a.title { color: ${t.fg} !important; }
                .thing .title a.title:visited { color: ${t.fgMuted} !important; }

                /* === POSTS / THINGS === */
                .thing { background-color: ${t.bg} !important; border-color: ${t.border} !important; }
                .thing:hover { background-color: ${t.bgLight} !important; }
                .thing .midcol, .thing .thumbnail { background: transparent !important; }
                .thing .thumbnail.self, .thing .thumbnail.default,
                .thing .thumbnail.nsfw, .thing .thumbnail.image {
                    background: ${t.bgLight} !important; border: 1px solid ${t.border} !important; border-radius: 6px;
                    display: flex !important; align-items: center; justify-content: center;
                    min-width: 70px; min-height: 50px; position: relative;
                }
                /* Icon indicators for empty thumbnails */
                .thing .thumbnail.self::after {
                    content: '\\1F4DD'; font-size: 20px; opacity: 0.25;
                    position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
                }
                .thing .thumbnail.default::after {
                    content: '\\1F517'; font-size: 20px; opacity: 0.25;
                    position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
                }
                .thing .thumbnail.nsfw::after {
                    content: '18+'; font-size: 11px; font-weight: 700; opacity: 0.4;
                    color: ${t.error}; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
                }
                .thing .thumbnail.image::after {
                    content: '\\1F5BC'; font-size: 20px; opacity: 0.25;
                    position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
                }
                /* Hide icon when thumbnail has an actual image */
                .thing .thumbnail img ~ ::after,
                .thing .thumbnail:has(img)::after { display: none !important; }
                .tagline, .tagline a, .tagline .stickied-tagline, .search-result-meta { color: ${t.fgDim} !important; }
                .tagline a:hover { color: ${t.accent} !important; }
                .tagline .author { color: ${t.link} !important; }
                .tagline .submitter { color: ${t.success} !important; }
                .tagline .moderator { color: ${t.accent} !important; }
                .tagline .admin { color: ${t.error} !important; }
                .tagline .friend { color: ${t.warning} !important; }
                .tagline time { color: ${t.fgDim} !important; }
                p.title .domain { color: ${t.fgDim} !important; }
                p.title .domain a { color: ${t.fgDim} !important; }
                .flat-list, .flat-list li, .buttons li { background: transparent !important; }
                .flat-list li a, .buttons li a { color: ${t.fgDim} !important; }
                .flat-list li a:hover, .buttons li a:hover { color: ${t.accent} !important; }

                /* Hide child comments toggle buttons */
                .rel-collapse-btn { color: ${t.fgDim} !important; }
                .rel-collapse-btn:hover { color: ${t.accent} !important; }
                .rel-toggle-all-children { color: ${t.fgDim} !important; }
                .rel-toggle-all-children:hover { color: ${t.accent} !important; }
                .menuarea { color: ${t.fgDim} !important; }
                .rank { color: ${t.fgDim} !important; }
                .score { color: ${t.fgMuted} !important; }
                .entry .buttons li { background: none !important; }
                .thing .entry { background: transparent !important; }
                .link .entry .buttons li a { color: ${t.fgDim} !important; }
                .stickied-tagline { color: ${t.success} !important; }
                .thing.stickied .entry a.title { color: ${t.success} !important; }
                .reportbtn, .reportbtn a { color: ${t.fgDim} !important; }

                /* Crosspost */
                .crosspost-preview, .crosspost-thing-preview {
                    background: ${t.bgLight} !important; border-color: ${t.border} !important;
                    color: ${t.fg} !important;
                }

                /* Self text / expando on listing pages */
                .self-text, .expando .usertext-body {
                    background: transparent !important; color: ${t.fg} !important;
                }
                .expando {
                    background: ${t.bgLight} !important;
                    border: 1px solid ${t.border} !important;
                    border-radius: 4px !important;
                }
                .expando .usertext-body .md {
                    background: ${t.bgLight} !important;
                    color: ${t.fg} !important;
                }
                .expando .usertext-body .md p,
                .expando .usertext-body .md li,
                .expando .usertext-body .md span,
                .expando .usertext-body .md h1,
                .expando .usertext-body .md h2,
                .expando .usertext-body .md h3 {
                    color: ${t.fg} !important;
                }
                .expando .usertext-body .md a {
                    color: ${t.link} !important;
                }
                .thing .expando {
                    background: ${t.bgLight} !important;
                    border: 1px solid ${t.border} !important;
                }

                /* === VOTING ARROWS === */
                .midcol { background: transparent !important; }
                .arrow { filter: brightness(0.7) saturate(0.5); }
                .arrow.up:hover, .arrow.upmod { filter: none; }
                .arrow.down:hover, .arrow.downmod { filter: none; }
                .score.likes { color: ${t.upvote} !important; }
                .score.dislikes { color: ${t.downvote} !important; }
                .score.unvoted { color: ${t.fgMuted} !important; }

                /* === COMMENTS === */
                .comment { background-color: ${t.bg} !important; border-color: ${t.border} !important; }
                .comment:hover { background-color: transparent !important; }
                .comment .child { border-left: 2px solid ${t.border} !important; }
                .comment .md, .comment .md p, .comment .md li { color: ${t.fg} !important; }
                .comment.collapsed .entry { opacity: 0.5; }
                .commentarea { background-color: ${t.bg} !important; }
                .commentarea .menuarea { background: ${t.bg} !important; color: ${t.fgDim} !important; }
                .commentarea .panestack-title { border-color: ${t.border} !important; color: ${t.fg} !important; }
                .commentarea .menuarea .toggle a { color: ${t.fgDim} !important; }
                .comment-visits-box { background: ${t.bgLight} !important; border-color: ${t.border} !important; color: ${t.fg} !important; }
                .morecomments a, .morerecursion a { color: ${t.accent} !important; }
                .expand { color: ${t.fgDim} !important; }
                .noncollapsed .expand:hover { color: ${t.accent} !important; }
                .deleted .entry .tagline { color: ${t.fgDim} !important; }
                .grayed .entry .tagline { color: ${t.fgDim} !important; }

                /* Comment form */
                .usertext-edit { background: ${t.bg} !important; border: 1px solid ${t.border} !important; border-radius: 4px; }
                .usertext-edit textarea {
                    background: ${t.inputBg} !important; color: ${t.inputFg} !important;
                    border-color: ${t.inputBorder} !important;
                }
                .usertext-edit .bottom-area { background: ${t.bgLight} !important; }
                .usertext-edit .bottom-area a, .usertext-edit .markhelp { color: ${t.fgDim} !important; }
                .usertext-edit .md { background: ${t.bg} !important; }
                .markhelp { background: ${t.bgLight} !important; border-color: ${t.border} !important; }
                .markhelp td, .markhelp th { border-color: ${t.border} !important; color: ${t.fg} !important; }

                /* === SIDEBAR === */
                .side {
                    background-color: ${t.bg} !important; color: ${t.fg} !important;
                    border-left: 1px solid ${t.border} !important;
                }
                .side *, .side .titlebox *, .side .spacer *, .side .md *,
                .side h1, .side h2, .side h3, .side h4, .side h5, .side h6,
                .side p, .side li, .side span, .side div,
                .side .titlebox .bottom, .side .redditname a {
                    color: ${t.fg} !important;
                }
                .side a { color: ${t.link} !important; }
                .side a:visited { color: ${t.linkVisited} !important; }
                .sidecontentbox { background: transparent !important; border-color: ${t.border} !important; }
                .sidecontentbox .title h1 { color: ${t.fg} !important; }
                .sidecontentbox .content { background: transparent !important; border-color: ${t.border} !important; }
                .icon-menu a { color: ${t.fg} !important; }
                .icon-menu a:hover { background: ${t.bgLight} !important; }
                .titlebox .bottom { border-color: ${t.border} !important; }
                .titlebox .word { color: ${t.fgMuted} !important; }
                .titlebox .number { color: ${t.fg} !important; }
                .subscribers .word, .users-online .word { color: ${t.fgMuted} !important; }
                .subscribers .number, .users-online .number { color: ${t.fg} !important; }
                .titlebox form.toggle { color: ${t.fgDim} !important; }
                .titlebox .tagline { color: ${t.fgDim} !important; }
                .side .spacer { background: transparent !important; }
                .side .searchpane { background: transparent !important; border-color: ${t.border} !important; }
                .linkinfo { background: ${t.bgLight} !important; border-color: ${t.border} !important; color: ${t.fg} !important; }
                .linkinfo .shortlink input { background: ${t.inputBg} !important; color: ${t.inputFg} !important; border-color: ${t.inputBorder} !important; }

                /* Subscribe / submit buttons */
                .morelink, .morelink a {
                    background: ${t.buttonBg} !important; color: ${t.buttonFg} !important;
                    border: none !important; border-radius: 4px !important;
                }
                .morelink:hover, .morelink:hover a { background: ${t.accentHover} !important; }
                .morelink .nub { display: none !important; }
                .fancy-toggle-button a, .option.active { background: ${t.accent} !important; color: ${t.bg} !important; border-radius: 3px !important; }

                /* Sidebar account activity */
                .account-activity-box { background: ${t.bgLight} !important; border-color: ${t.border} !important; color: ${t.fg} !important; }
                .account-activity-box a { color: ${t.link} !important; }

                /* Sidebar rules */
                .md ol, .md ul { color: ${t.fg} !important; }

                /* === INPUTS & FORMS === */
                input[type="text"], input[type="search"], input[type="url"],
                input[type="password"], input[type="email"], input[type="number"],
                textarea, select, .c-form-control {
                    background-color: ${t.inputBg} !important;
                    color: ${t.inputFg} !important;
                    border-color: ${t.inputBorder} !important;
                }
                input[type="text"]:focus, input[type="search"]:focus,
                input[type="url"]:focus, input[type="password"]:focus,
                textarea:focus, select:focus {
                    border-color: ${t.accent} !important;
                    outline: none !important;
                    box-shadow: 0 0 0 2px ${t.selection} !important;
                }
                input[type="checkbox"], input[type="radio"] { accent-color: ${t.accent}; }

                /* Buttons (scoped to avoid breaking arrows) */
                .side .morelink, button.btn, input[type="submit"],
                .save-button button, .cancel-button button,
                .c-btn-primary, .newbutton {
                    background: ${t.buttonBg} !important;
                    color: ${t.buttonFg} !important;
                    border: 1px solid ${t.border} !important;
                    border-radius: 3px !important;
                }
                .c-btn-primary:hover { background: ${t.accentHover} !important; }

                /* === DROPDOWNS & MENUS === */
                .drop-choices {
                    background: ${t.bgLight} !important; border: 1px solid ${t.border} !important;
                    box-shadow: 0 2px 8px ${t.shadow} !important;
                }
                .drop-choices a.choice { color: ${t.fg} !important; }
                .drop-choices a.choice:hover { background: ${t.surface} !important; color: ${t.accent} !important; }
                .hover-bubble, .reddit-infobar { background: ${t.bgLight} !important; border-color: ${t.border} !important; color: ${t.fg} !important; }

                /* === SEARCH === */
                #search input[type="text"], #searchexpander {
                    background: ${t.inputBg} !important; color: ${t.inputFg} !important;
                    border-color: ${t.inputBorder} !important;
                }
                .search-result { background: ${t.bg} !important; border-color: ${t.border} !important; }
                .search-result-header .search-title { color: ${t.fg} !important; }
                .search-result-body { color: ${t.fgMuted} !important; }
                .search-expando { background: ${t.bgLight} !important; border-color: ${t.border} !important; }
                .search-result-group-header { background: ${t.bgLight} !important; color: ${t.fg} !important; border-color: ${t.border} !important; }
                .combined-search-page .search-result-listing { background: ${t.bg} !important; }
                .combined-search-page .search-result-listing .contents { border-color: ${t.border} !important; }
                .searchfacets .searchfacet { background: ${t.bgLight} !important; border-color: ${t.border} !important; }
                .searchfacets .searchfacet .title { color: ${t.fg} !important; }

                /* === WIKI & MARKDOWN === */
                .wiki-page, .wiki-page .wiki-page-content, .wiki-page-content .md {
                    background: ${t.bg} !important; color: ${t.fg} !important;
                }
                .wiki-page .pageactions { background: ${t.bgLight} !important; border-color: ${t.border} !important; }
                .wiki-page .pageactions .wikiaction { color: ${t.fgDim} !important; }
                .wiki-page .pageactions .wikiaction-current { color: ${t.accent} !important; border-color: ${t.accent} !important; }
                .md blockquote { border-left: 3px solid ${t.accent} !important; color: ${t.fgMuted} !important; background: ${t.bgLight} !important; padding: 4px 8px !important; }
                .md code { background: ${t.bgLight} !important; color: ${t.accent} !important; border: 1px solid ${t.border} !important; padding: 1px 4px; border-radius: 3px; }
                .md pre { background: ${t.bgLight} !important; color: ${t.fg} !important; border: 1px solid ${t.border} !important; padding: 8px; border-radius: 4px; }
                .md pre code { border: none !important; padding: 0; background: transparent !important; color: ${t.fg} !important; }
                .md table { border-color: ${t.border} !important; border-collapse: collapse; }
                .md th { background: ${t.bgLight} !important; color: ${t.fg} !important; border: 1px solid ${t.border} !important; padding: 4px 8px; }
                .md td { border: 1px solid ${t.border} !important; color: ${t.fg} !important; padding: 4px 8px; }
                .md hr { border-color: ${t.border} !important; }
                .md a { color: ${t.link} !important; }
                .md h1, .md h2, .md h3, .md h4, .md h5, .md h6 { color: ${t.fg} !important; }
                .md em { color: ${t.fgMuted} !important; }
                .md strong { color: ${t.fg} !important; }
                .md del { color: ${t.fgDim} !important; }
                .md sup { color: ${t.fgMuted} !important; }
                .md .spoiler { background: ${t.surface} !important; color: transparent; }
                .md .spoiler:hover { color: ${t.fg} !important; }

                /* === EXPANDO === */
                .expando {
                    background: ${t.bgLight} !important; border: 1px solid ${t.border} !important;
                    border-radius: 4px; margin: 4px 0;
                }
                .expando-button { filter: brightness(0.8) !important; }

                /* === INFO BARS === */
                .infobar { background: ${t.bgLight} !important; color: ${t.fg} !important; border-color: ${t.border} !important; }
                .infobar.welcomebar { background: ${t.bgLight} !important; }

                /* === FLAIR === */
                .flair, .linkflairlabel {
                    background: ${t.tagBg} !important; color: ${t.tagFg} !important;
                    border: 1px solid ${t.border} !important; border-radius: 3px !important;
                }

                /* === MODALS & OVERLAYS === */
                .modal-dialog { background: ${t.bgLight} !important; color: ${t.fg} !important; border-color: ${t.border} !important; }
                .modal-dialog .modal-header { background: ${t.bgAlt} !important; border-color: ${t.border} !important; color: ${t.fg} !important; }
                .modal-dialog .modal-body { background: ${t.bgLight} !important; color: ${t.fg} !important; }
                .modal-dialog .modal-footer { background: ${t.bgAlt} !important; border-color: ${t.border} !important; }

                /* === SUBMIT PAGE === */
                .submit-page .formtabs-content { background: ${t.bg} !important; border-color: ${t.border} !important; }
                .submit-page .formtab-content { background: ${t.bg} !important; }
                .submit-page .tabmenu li a { background: ${t.bgLight} !important; color: ${t.fgMuted} !important; border-color: ${t.border} !important; }
                .submit-page .tabmenu li.selected a { background: ${t.accent} !important; color: ${t.bg} !important; }
                .submit-page .roundfield { background: ${t.bgLight} !important; border-color: ${t.border} !important; color: ${t.fg} !important; }
                .submit-page .roundfield legend { background: ${t.bgLight} !important; color: ${t.fg} !important; }
                .linefield { background: transparent !important; border-color: ${t.border} !important; }
                .submit_text { color: ${t.fgMuted} !important; }

                /* === USER PROFILE PAGES === */
                .profilepage .spacer, .profilepage .sidecontentbox {
                    background: transparent !important; color: ${t.fg} !important;
                }
                .trophy-area { background: transparent !important; }
                .trophy-area .content, .trophy-name, .trophy-description { color: ${t.fg} !important; }
                .trophy-area .trophy-info { color: ${t.fgDim} !important; }
                .titlebox .karma { color: ${t.fg} !important; }
                .titlebox .karma-breakdown { color: ${t.fgMuted} !important; }

                /* Tabmenu on user pages */
                .tabmenu { background: transparent !important; }
                .tabmenu li a { color: ${t.fgMuted} !important; background: transparent !important; }
                .tabmenu li.selected a { color: ${t.accent} !important; border-bottom: 2px solid ${t.accent} !important; }

                /* === LOGIN / REGISTER === */
                .login-form, .login-form-side {
                    background: ${t.bgLight} !important; color: ${t.fg} !important;
                    border-color: ${t.border} !important;
                }
                .login-form label, .login-form-side label { color: ${t.fg} !important; }
                .login-form .error, .login-form-side .error { color: ${t.error} !important; }
                .login-form .bottom-btn { color: ${t.fgDim} !important; }

                /* === SCROLLBAR === */
                ::-webkit-scrollbar { width: 10px; }
                ::-webkit-scrollbar-track { background: ${t.bgAlt}; }
                ::-webkit-scrollbar-thumb { background: ${t.scrollbar}; border-radius: 5px; }
                ::-webkit-scrollbar-thumb:hover { background: ${t.scrollbarHover}; }

                /* === PROMOTED / ADS - handled by AdBlockModule === */
                .goldvertisement, .premium-banner-outer { display: none !important; }

                /* === FOOTER === */
                .footer, .footer-parent, .bottommenu { background: ${t.bgAlt} !important; border-color: ${t.border} !important; color: ${t.fgDim} !important; }
                .footer a, .bottommenu a { color: ${t.fgDim} !important; }
                .debuginfo { background: ${t.bgAlt} !important; color: ${t.fgDim} !important; }

                /* === LISTINGS === */
                .listing-chooser { background: ${t.bg} !important; border-color: ${t.border} !important; }
                .listing-chooser li { border-color: ${t.border} !important; }
                .listing-chooser li:hover { background: ${t.bgLight} !important; }
                .listing-chooser .grippy { background: ${t.surface} !important; }
                .organic-listing { background: ${t.bg} !important; border-color: ${t.border} !important; }

                /* Nav pills (sort tabs) */
                .menuarea, .nav-buttons { background: transparent !important; }
                .menuarea .spacer { background: transparent !important; }

                /* === MISC REMAINING === */
                .rank { color: ${t.fgDim} !important; }
                .thing .title.click .may-blank { color: ${t.fgMuted} !important; }
                .liveupdate-listing { background: ${t.bg} !important; }
                .rounded { background: ${t.bgLight} !important; border-color: ${t.border} !important; }
                .message { background: ${t.bg} !important; border-color: ${t.border} !important; }
                .message.unread { background: ${t.bgLight} !important; border-left: 3px solid ${t.accent} !important; }
                .message .entry { background: transparent !important; }
                .message .subject a { color: ${t.fg} !important; }
                .message .head { color: ${t.fgDim} !important; }
                .messagepage .sitetable { background: transparent !important; }
                .multi-page .sidebar { background: ${t.bg} !important; }

                /* Share overlay / popup */
                .c-close, .c-close:hover { color: ${t.fgDim} !important; }

                /* RES compatibility classes */
                .res-nightmode .thing, .res-nightmode .comment { background-color: ${t.bg} !important; }

                /* === SELECTION === */
                ::selection { background: ${t.selection} !important; color: ${t.fg} !important; }

                /* === OVERRIDE SUBREDDIT CUSTOM STYLESHEETS === */
                .link .usertext-body .md, .usertext-body .md { color: ${t.fg} !important; }
            `;
        }
    };

    // =========================================================================
    // BASE STYLES
    // =========================================================================
    const Styles = {
        base: `
            /* Toast Notifications */
            .rel-toast {
                position: fixed; bottom: 20px; right: 20px; z-index: 1000001;
                padding: 12px 20px; border-radius: 6px; font-size: 13px;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3); transform: translateY(100px);
                opacity: 0; transition: all 0.3s ease; max-width: 350px;
            }
            .rel-toast-show { transform: translateY(0); opacity: 1; }
            .rel-toast-info { background: #0079d3; color: #fff; }
            .rel-toast-success { background: #46d160; color: #fff; }
            .rel-toast-error { background: #ea0027; color: #fff; }
            .rel-toast-warning { background: #e9a820; color: #222; }

            /* REL Buttons */
            .rel-button {
                display: inline-block; padding: 2px 8px; margin: 0 4px;
                font-size: 11px; font-weight: bold; cursor: pointer;
                border: 1px solid #ccc; border-radius: 3px;
                background: linear-gradient(to bottom, #fff 0%, #e9e9e9 100%);
                color: #333; font-family: verdana, arial, helvetica, sans-serif;
                transition: all 0.15s ease;
            }
            .rel-button:hover { background: linear-gradient(to bottom, #f5f5f5 0%, #ddd 100%); border-color: #999; }

            /* Settings Gear Button */
            .rel-settings-btn {
                cursor: pointer; padding: 0 8px; font-size: 16px;
                opacity: 0.7; transition: opacity 0.2s;
            }
            .rel-settings-btn:hover { opacity: 1; }

            /* Settings Panel */
            .rel-settings-overlay {
                position: fixed; top: 0; left: 0; right: 0; bottom: 0;
                background: rgba(0,0,0,0.7); z-index: 999999;
                display: flex; align-items: center; justify-content: center;
                backdrop-filter: blur(2px);
            }
            .rel-settings-panel {
                background: #1e1e2e; color: #cdd6f4;
                border-radius: 12px; max-width: 750px; width: 92%;
                max-height: 88vh; display: flex; flex-direction: column;
                box-shadow: 0 8px 32px rgba(0,0,0,0.5);
                overflow: hidden;
            }
            .rel-settings-header {
                display: flex; align-items: center; justify-content: space-between;
                padding: 16px 20px; border-bottom: 1px solid #313244;
            }
            .rel-settings-header h2 {
                margin: 0; font-size: 18px; color: #cdd6f4;
                display: flex; align-items: center; gap: 8px;
            }
            .rel-settings-header .rel-version { font-size: 11px; color: #6c7086; font-weight: normal; }
            .rel-settings-close {
                background: none; border: none; color: #6c7086; font-size: 22px;
                cursor: pointer; padding: 4px 8px; border-radius: 4px;
            }
            .rel-settings-close:hover { color: #f38ba8; background: rgba(243,139,168,0.1); }

            /* Settings Tabs */
            .rel-settings-tabs {
                display: flex; border-bottom: 1px solid #313244;
                padding: 0 16px; overflow-x: auto; flex-shrink: 0;
            }
            .rel-tab {
                padding: 10px 14px; font-size: 12px; cursor: pointer;
                color: #6c7086; border-bottom: 2px solid transparent;
                transition: all 0.2s; white-space: nowrap; background: none; border-top: none; border-left: none; border-right: none;
            }
            .rel-tab:hover { color: #cdd6f4; }
            .rel-tab.active { color: #cba6f7; border-bottom-color: #cba6f7; }

            /* Settings Body */
            .rel-settings-body {
                flex: 1; overflow-y: auto; padding: 16px 20px;
            }
            .rel-tab-content { display: none; }
            .rel-tab-content.active { display: block; }

            .rel-settings-section { margin-bottom: 16px; }
            .rel-settings-section h3 {
                margin: 0 0 8px 0; color: #a6adc8; font-size: 12px;
                text-transform: uppercase; letter-spacing: 0.5px;
            }
            .rel-setting-item {
                display: flex; align-items: center; justify-content: space-between;
                padding: 10px 12px; background: #313244; border-radius: 6px;
                margin-bottom: 6px; gap: 12px;
            }
            .rel-setting-item:hover { background: #3b3d54; }
            .rel-setting-info { flex: 1; min-width: 0; }
            .rel-setting-info label { font-size: 13px; color: #cdd6f4; display: block; }
            .rel-setting-info .rel-setting-desc { font-size: 11px; color: #6c7086; margin-top: 2px; }

            /* Toggle Switch */
            .rel-toggle { position: relative; width: 40px; height: 22px; flex-shrink: 0; }
            .rel-toggle input { opacity: 0; width: 0; height: 0; }
            .rel-toggle-slider {
                position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0;
                background-color: #45475a; transition: 0.25s; border-radius: 22px;
            }
            .rel-toggle-slider:before {
                position: absolute; content: ""; height: 16px; width: 16px;
                left: 3px; bottom: 3px; background: #6c7086;
                transition: 0.25s; border-radius: 50%;
            }
            .rel-toggle input:checked + .rel-toggle-slider { background-color: #cba6f7; }
            .rel-toggle input:checked + .rel-toggle-slider:before { transform: translateX(18px); background: #1e1e2e; }

            /* Theme Picker */
            .rel-theme-grid {
                display: grid; grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
                gap: 8px; margin: 8px 0;
            }
            .rel-theme-card {
                border: 2px solid #45475a; border-radius: 8px; padding: 8px;
                cursor: pointer; text-align: center; transition: all 0.2s;
            }
            .rel-theme-card:hover { border-color: #6c7086; }
            .rel-theme-card.active { border-color: #cba6f7; box-shadow: 0 0 8px rgba(203,166,247,0.3); }
            .rel-theme-preview {
                height: 36px; border-radius: 4px; margin-bottom: 6px;
                display: flex; align-items: stretch; overflow: hidden;
            }
            .rel-theme-preview > div { flex: 1; }
            .rel-theme-name { font-size: 11px; color: #a6adc8; }

            /* Select Dropdown */
            .rel-select {
                background: #313244; color: #cdd6f4; border: 1px solid #45475a;
                border-radius: 4px; padding: 4px 8px; font-size: 12px; cursor: pointer;
            }
            .rel-select:focus { border-color: #cba6f7; outline: none; }

            /* Input Fields */
            .rel-input {
                background: #313244; color: #cdd6f4; border: 1px solid #45475a;
                border-radius: 4px; padding: 6px 10px; font-size: 12px; width: 100%;
            }
            .rel-input:focus { border-color: #cba6f7; outline: none; }
            .rel-textarea {
                background: #313244; color: #cdd6f4; border: 1px solid #45475a;
                border-radius: 4px; padding: 8px 10px; font-size: 12px;
                width: 100%; min-height: 60px; resize: vertical; font-family: monospace;
            }

            /* Filter List */
            .rel-filter-list { margin: 8px 0; }
            .rel-filter-item {
                display: flex; align-items: center; justify-content: space-between;
                padding: 6px 10px; background: #313244; border-radius: 4px;
                margin-bottom: 4px; font-size: 12px;
            }
            .rel-filter-item .rel-filter-remove {
                color: #f38ba8; cursor: pointer; padding: 2px 6px; border-radius: 3px;
                background: none; border: none; font-size: 14px;
            }
            .rel-filter-item .rel-filter-remove:hover { background: rgba(243,139,168,0.15); }
            .rel-filter-add-row { display: flex; gap: 6px; margin-top: 6px; }
            .rel-filter-add-row .rel-input { flex: 1; }
            .rel-btn-small {
                padding: 4px 12px; border-radius: 4px; font-size: 12px; cursor: pointer;
                border: none; transition: all 0.15s;
            }
            .rel-btn-primary { background: #cba6f7; color: #1e1e2e; }
            .rel-btn-primary:hover { background: #dbb8ff; }
            .rel-btn-danger { background: #f38ba8; color: #1e1e2e; }
            .rel-btn-danger:hover { background: #f5a0b5; }
            .rel-btn-secondary { background: #45475a; color: #cdd6f4; }
            .rel-btn-secondary:hover { background: #585b70; }

            /* Settings Footer */
            .rel-settings-footer {
                padding: 12px 20px; border-top: 1px solid #313244;
                display: flex; justify-content: space-between; align-items: center;
            }
            .rel-settings-footer .rel-footer-actions { display: flex; gap: 8px; }

            /* Page Navigator */
            .rel-page-nav {
                position: fixed; right: 16px; bottom: 80px; z-index: 99999;
                display: flex; flex-direction: column; gap: 6px;
            }
            .rel-page-nav-btn {
                width: 36px; height: 36px; border-radius: 50%;
                display: flex; align-items: center; justify-content: center;
                cursor: pointer; font-size: 16px; transition: all 0.2s;
                border: none; box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            }

            /* Comment Depth Indicators */
            .rel-depth-0 > .entry { border-left: 3px solid #ff5555 !important; padding-left: 6px; }
            .rel-depth-1 > .entry { border-left: 3px solid #ff79c6 !important; padding-left: 6px; }
            .rel-depth-2 > .entry { border-left: 3px solid #ffb86c !important; padding-left: 6px; }
            .rel-depth-3 > .entry { border-left: 3px solid #f1fa8c !important; padding-left: 6px; }
            .rel-depth-4 > .entry { border-left: 3px solid #50fa7b !important; padding-left: 6px; }
            .rel-depth-5 > .entry { border-left: 3px solid #8be9fd !important; padding-left: 6px; }
            .rel-depth-6 > .entry { border-left: 3px solid #bd93f9 !important; padding-left: 6px; }
            .rel-depth-7 > .entry { border-left: 3px solid #ff5555 !important; padding-left: 6px; }
            .rel-depth-8 > .entry { border-left: 3px solid #ff79c6 !important; padding-left: 6px; }
            .rel-depth-9 > .entry { border-left: 3px solid #ffb86c !important; padding-left: 6px; }

            /* Formatting Toolbar */
            .rel-format-bar {
                display: flex; gap: 2px; padding: 4px 6px;
                border-bottom: 1px solid #45475a; flex-wrap: wrap; align-items: center;
            }
            .rel-format-btn {
                padding: 3px 7px; border-radius: 3px; font-size: 12px;
                cursor: pointer; border: 1px solid transparent; transition: all 0.15s;
                font-family: monospace; line-height: 1;
            }
            .rel-format-btn:hover { border-color: #6c7086; }
            .rel-format-sep { width: 1px; height: 18px; margin: 0 4px; }

            /* Live Preview */
            .rel-live-preview {
                padding: 8px 12px; font-size: 13px; max-height: 200px;
                overflow-y: auto; border-top: 1px solid #45475a; display: none;
            }
            .rel-live-preview.active { display: block; }
            .rel-live-preview h1, .rel-live-preview h2, .rel-live-preview h3 { margin: 4px 0; }

            /* Single Click Opener */
            .rel-sco { font-size: 10px; margin-left: 4px; }
            .rel-sco a { text-decoration: none !important; }

            /* User Highlighter */
            .rel-user-op { color: #50fa7b !important; font-weight: bold; }
            .rel-user-admin { color: #ff5555 !important; font-weight: bold; }
            .rel-user-mod { color: #8be9fd !important; font-weight: bold; }
            .rel-user-friend { color: #ffb86c !important; font-weight: bold; }

            /* Selected Entry */
            .rel-selected-thing { outline: 2px solid rgba(203,166,247,0.4); outline-offset: -2px; border-radius: 2px; }

            /* User Info Popup */
            .rel-user-info-popup {
                position: absolute; z-index: 100000; border-radius: 8px;
                padding: 12px; min-width: 220px; max-width: 300px;
                box-shadow: 0 4px 16px rgba(0,0,0,0.4); font-size: 12px;
                pointer-events: auto;
            }
            .rel-user-info-popup h4 { margin: 0 0 8px 0; font-size: 14px; }
            .rel-user-info-stat { display: flex; justify-content: space-between; padding: 3px 0; }

            /* Continue Thread Expander */
            .rel-expand-thread {
                cursor: pointer; padding: 2px 8px; margin-left: 4px;
                font-size: 11px; border-radius: 3px;
            }
            .rel-expand-thread:hover { opacity: 0.8; }

            /* Vote Weight Badge */
            .rel-vote-weight {
                font-size: 10px; padding: 0 4px; border-radius: 3px;
                margin-left: 4px; font-weight: bold;
            }

            /* NER Page Marker */
            .rel-ner-marker {
                text-align: center; padding: 10px; margin: 10px 0;
                border-top: 1px dashed; font-size: 12px; opacity: 0.6;
            }

            /* Subreddit Shortcuts Bar */
            .rel-sr-shortcuts {
                display: inline-flex; gap: 4px; margin-left: 8px; align-items: center;
            }
            .rel-sr-shortcuts a {
                padding: 1px 6px; border-radius: 3px; font-size: 11px;
                text-decoration: none; transition: all 0.15s;
            }
            .rel-sr-shortcuts a:hover { opacity: 0.8; text-decoration: underline; }
            .rel-sr-shortcuts .rel-sr-add {
                cursor: pointer; font-size: 13px; opacity: 0.6; padding: 0 4px;
            }
            .rel-sr-shortcuts .rel-sr-add:hover { opacity: 1; }

            /* Macro Menu */
            .rel-macro-menu {
                position: absolute; z-index: 100001; border-radius: 6px;
                box-shadow: 0 4px 16px rgba(0,0,0,0.4); overflow: hidden;
                min-width: 150px;
            }
            .rel-macro-item {
                padding: 8px 12px; font-size: 12px; cursor: pointer; border: none;
                width: 100%; text-align: left;
            }
            .rel-macro-item:hover { opacity: 0.85; }

            /* Timestamp enhancements */
            .rel-timestamp { font-size: 10px; cursor: help; }

            /* Ignored user */
            .rel-ignored-user { opacity: 0.25; transition: opacity 0.2s; }
            .rel-ignored-user:hover { opacity: 1; }

            /* Keyboard nav hint */
            .rel-kb-hint {
                position: fixed; bottom: 8px; left: 8px; z-index: 99998;
                font-size: 10px; opacity: 0.4; pointer-events: none;
            }

            /* Hide gold button */
            .rel-hide-gold .give-gold-button { display: none !important; }
            .rel-hide-share li.share { display: none !important; }
            .rel-hide-save li.link-save-button, .rel-hide-save li.comment-save-button { display: none !important; }
            .rel-hide-crosspost li.crosspost-button { display: none !important; }
            .rel-hide-report li.report-button { display: none !important; }

            /* Tag styles */
            .rel-user-tag {
                display: inline-block; padding: 0 5px; border-radius: 3px;
                font-size: 10px; margin-left: 4px; cursor: pointer;
                font-weight: bold; vertical-align: middle;
            }
            .rel-tag-popup {
                position: fixed; z-index: 100001; border-radius: 8px;
                padding: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.4);
                min-width: 280px;
            }
            .rel-tag-popup input, .rel-tag-popup select {
                width: 100%; padding: 6px; margin: 4px 0; border-radius: 4px;
                font-size: 12px;
            }

            /* Collapse child comment buttons */
            .rel-collapse-btn {
                font-size: 10px; cursor: pointer; margin-left: 6px;
                opacity: 0.7; transition: opacity 0.2s;
            }
            .rel-collapse-btn:hover { opacity: 1; }

            /* Page-wide toggle all children link */
            .rel-toggle-all-children {
                cursor: pointer; font-size: 12px;
                opacity: 0.8; transition: opacity 0.2s;
            }
            .rel-toggle-all-children:hover { opacity: 1; text-decoration: underline; }

            /* Download button */
            .flat-list li a[title="Download image"] { font-weight: bold; }

            /* Subreddit description box */
            #rel-sr-description h3 { font-weight: bold; }
            #rel-sr-description p { line-height: 1.5; }

            /* State saver indicator */
            .rel-state-indicator {
                position: fixed; bottom: 8px; right: 60px; z-index: 99998;
                font-size: 10px; opacity: 0; pointer-events: none;
                transition: opacity 0.3s;
            }
            .rel-state-indicator.active { opacity: 0.5; }
        `,

        getThemedBase() {
            const t = Themes.getTheme();
            if (!settings.darkMode || settings.theme === 'light') return '';
            return `
                /* Themed component overrides */
                .rel-settings-header .rel-version { color: ${t.fgDim}; }
                .rel-settings-panel { background: ${t.bgLight}; color: ${t.fg}; }
                .rel-settings-header { border-color: ${t.border}; }
                .rel-settings-header h2 { color: ${t.fg}; }
                .rel-settings-close { color: ${t.fgDim}; }
                .rel-settings-close:hover { color: ${t.error}; background: rgba(255,0,0,0.08); }
                .rel-settings-tabs { border-color: ${t.border}; }
                .rel-tab { color: ${t.fgDim}; }
                .rel-tab:hover { color: ${t.fg}; }
                .rel-tab.active { color: ${t.accent}; border-bottom-color: ${t.accent}; }
                .rel-setting-item { background: ${t.surface}; }
                .rel-setting-item:hover { background: ${t.surfaceHover}; }
                .rel-setting-info label { color: ${t.fg}; }
                .rel-setting-info .rel-setting-desc { color: ${t.fgDim}; }
                .rel-settings-section h3 { color: ${t.fgMuted}; }
                .rel-toggle-slider { background-color: ${t.surface}; }
                .rel-toggle-slider:before { background: ${t.fgDim}; }
                .rel-toggle input:checked + .rel-toggle-slider { background-color: ${t.accent}; }
                .rel-toggle input:checked + .rel-toggle-slider:before { background: ${t.bg}; }
                .rel-theme-card { border-color: ${t.surface}; }
                .rel-theme-card:hover { border-color: ${t.fgDim}; }
                .rel-theme-card.active { border-color: ${t.accent}; box-shadow: 0 0 8px ${t.selection}; }
                .rel-theme-name { color: ${t.fgMuted}; }
                .rel-select, .rel-input, .rel-textarea { background: ${t.inputBg}; color: ${t.inputFg}; border-color: ${t.inputBorder}; }
                .rel-select:focus, .rel-input:focus, .rel-textarea:focus { border-color: ${t.accent}; }
                .rel-filter-item { background: ${t.surface}; color: ${t.fg}; }
                .rel-filter-item .rel-filter-remove { color: ${t.error}; }
                .rel-btn-primary { background: ${t.accent}; color: ${t.bg}; }
                .rel-btn-danger { background: ${t.error}; color: ${t.bg}; }
                .rel-btn-secondary { background: ${t.surface}; color: ${t.fg}; }
                .rel-settings-footer { border-color: ${t.border}; }
                .rel-page-nav-btn { background: ${t.surface}; color: ${t.fg}; }
                .rel-page-nav-btn:hover { background: ${t.surfaceHover}; }
                .rel-format-bar { border-color: ${t.border}; background: ${t.bgLight}; }
                .rel-format-btn { color: ${t.fg}; background: transparent; }
                .rel-format-btn:hover { background: ${t.surface}; border-color: ${t.border}; }
                .rel-format-sep { background: ${t.border}; }
                .rel-live-preview { background: ${t.bgAlt}; color: ${t.fg}; border-color: ${t.border}; }
                .rel-user-info-popup { background: ${t.bgLight}; color: ${t.fg}; border: 1px solid ${t.border}; }
                .rel-expand-thread { background: ${t.surface}; color: ${t.accent}; }
                .rel-macro-menu { background: ${t.bgLight}; border: 1px solid ${t.border}; }
                .rel-macro-item { background: ${t.bgLight}; color: ${t.fg}; }
                .rel-macro-item:hover { background: ${t.surface}; }
                .rel-toast-info { background: ${t.accent}; color: ${t.bg}; }
                .rel-toast-success { background: ${t.success}; color: ${t.bg}; }
                .rel-toast-error { background: ${t.error}; color: ${t.bg}; }
                .rel-tag-popup { background: ${t.bgLight}; color: ${t.fg}; border: 1px solid ${t.border}; }
                .rel-tag-popup input, .rel-tag-popup select { background: ${t.inputBg}; color: ${t.inputFg}; border: 1px solid ${t.inputBorder}; }
                .rel-button { background: ${t.surface}; color: ${t.fg}; border-color: ${t.border}; }
                .rel-button:hover { background: ${t.surfaceHover}; border-color: ${t.fgDim}; }
                .rel-ner-marker { border-color: ${t.border}; color: ${t.fgDim}; }
                .rel-sr-shortcuts a { background: ${t.surface}; color: ${t.fg}; }
                .rel-kb-hint { color: ${t.fgDim}; }
                .rel-selected-thing { outline-color: ${t.selection}; }
            `;
        },

        generateUXCSS() {
            if (!settings.enhancedUI) return '';
            const t = Themes.getTheme();
            const isDark = settings.darkMode && settings.theme !== 'light';
            const bA = isDark ? '0.08' : '0.12';
            const bHA = isDark ? '0.16' : '0.2';
            const hA = isDark ? '0.05' : '0.04';
            const sA = isDark ? '0.03' : '0.02';
            const nc = isDark
                ? ['#5b8aff','#5ec46a','#e8a54b','#e85d5d','#b36bdb','#3dc5c9']
                : ['#3b6fd4','#3a8a42','#c98620','#c94040','#8e4ab5','#2a9a9e'];

            return `
                /* ==== REL UX ENHANCEMENTS v2.4 ==== */

                /* --- TYPOGRAPHY SYSTEM --- */
                body, .md, .usertext-body, .side, .commentarea, .content, .sitetable,
                .thing .entry, .menuarea, .infobar, .footer, .footer-parent {
                    font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI',
                                 Roboto, Oxygen-Sans, Ubuntu, Cantarell, 'Helvetica Neue',
                                 Arial, sans-serif !important;
                }
                .md code, .md pre, .md pre code {
                    font-family: 'Cascadia Code', 'Fira Code', 'SF Mono', 'JetBrains Mono',
                                 Consolas, 'DejaVu Sans Mono', Menlo, monospace !important;
                }
                textarea, input[type="text"], input[type="search"], input[type="url"],
                input[type="password"], input[type="email"], select { font-family: inherit !important; }

                .md { font-size: 15px !important; line-height: 1.6 !important; }
                .comment .md { font-size: 14.5px !important; line-height: 1.6 !important; }
                .comment .md p { margin: 0.4em 0 !important; }
                .comment .md p:first-child { margin-top: 0 !important; }
                .comment .md p:last-child { margin-bottom: 0 !important; }
                .link p.title { font-size: 16px !important; line-height: 1.4 !important; }
                .link .title a.title { font-weight: 500 !important; letter-spacing: -0.01em; }
                .tagline { font-size: 12px !important; line-height: 1.5 !important; letter-spacing: 0.01em; }
                .flat-list li a, .flat-list li .toggle a, .buttons li a {
                    font-size: 12px !important; font-weight: 500 !important;
                }
                p.title .domain { font-size: 11px !important; }
                .score { font-weight: 700 !important; }
                .selftext .md { max-width: none; }
                .comment .md { max-width: none; }
                .md h1, .md h2, .md h3, .md h4, .md h5, .md h6 {
                    line-height: 1.3 !important; letter-spacing: -0.01em;
                    margin-top: 1em !important; margin-bottom: 0.4em !important;
                }
                .md h1 { font-size: 1.5em !important; font-weight: 700 !important; }
                .md h2 { font-size: 1.3em !important; font-weight: 600 !important; }
                .md h3 { font-size: 1.15em !important; font-weight: 600 !important; }

                /* --- TRANSITIONS --- */
                a, .tagline a, .flat-list li a, .buttons li a, .expand,
                .arrow, .morelink, .rel-collapse-btn, .rel-toggle-all-children {
                    transition: color 0.15s ease, background-color 0.12s ease,
                                border-color 0.15s ease, opacity 0.15s ease !important;
                }
                .thing, .thing.link, .comment .entry {
                    transition: background-color 0.15s ease, border-color 0.2s ease,
                                box-shadow 0.25s cubic-bezier(.25,.8,.25,1) !important;
                }
                textarea, input[type="text"], input[type="search"], select {
                    transition: border-color 0.15s ease, box-shadow 0.15s ease !important;
                }
                .comment .child { transition: border-color 0.15s ease !important; }
                @media (prefers-reduced-motion: reduce) {
                    *, *::before, *::after {
                        transition-duration: 0.01ms !important;
                        animation-duration: 0.01ms !important;
                    }
                }

                /* --- CARD POST LAYOUT (listing pages) --- */
                body.listing-page .linklisting .thing.link {
                    margin: 0 0 8px 0 !important;
                    padding: 10px 14px 8px !important;
                    border: 1px solid ${isDark ? 'rgba(255,255,255,'+bA+')' : 'rgba(0,0,0,'+bA+')'} !important;
                    border-radius: 8px !important;
                }
                body.listing-page .linklisting .thing.link:hover {
                    border-color: ${isDark ? 'rgba(255,255,255,'+bHA+')' : 'rgba(0,0,0,'+bHA+')'} !important;
                    box-shadow: 0 2px 12px ${t.shadow} !important;
                }
                body.listing-page .link .rank { display: none !important; }
                .thumbnail { border-radius: 6px !important; overflow: hidden; margin-right: 12px !important; position: relative !important; }
                .thumbnail img { border-radius: 6px !important; position: relative; z-index: 1; }
                .thing .entry { padding: 2px 0 0 4px !important; }
                .thing .tagline { margin-bottom: 3px !important; }
                .link .usertext-body .md {
                    padding: 10px 14px !important; border-radius: 6px !important;
                    margin-top: 6px !important;
                    border: 1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)'} !important;
                }

                /* --- COMMENTS - ENHANCED THREADS --- */
                .commentarea .comment > .entry {
                    padding: 6px 10px 4px !important; border-radius: 4px !important;
                }
                .commentarea .comment > .entry:hover {
                    background: ${isDark ? 'rgba(255,255,255,'+hA+')' : 'rgba(0,0,0,'+hA+')'} !important;
                }

                /* Rainbow thread nesting */
                .commentarea .comment .child {
                    margin-left: 4px !important; padding-left: 14px !important;
                    border-left-width: 2px !important; border-left-style: solid !important;
                }
                .commentarea .sitetable.nestedlisting > .comment > .child { border-left-color: ${nc[0]} !important; }
                .commentarea .child .comment > .child { border-left-color: ${nc[1]} !important; }
                .commentarea .child .child .comment > .child { border-left-color: ${nc[2]} !important; }
                .commentarea .child .child .child .comment > .child { border-left-color: ${nc[3]} !important; }
                .commentarea .child .child .child .child .comment > .child { border-left-color: ${nc[4]} !important; }
                .commentarea .child .child .child .child .child .comment > .child { border-left-color: ${nc[5]} !important; }
                .commentarea .child .child .child .child .child .child .comment > .child { border-left-color: ${nc[0]} !important; }
                .commentarea .child .child .child .child .child .child .child .comment > .child { border-left-color: ${nc[1]} !important; }
                .commentarea .comment > .child:hover { border-left-color: ${t.accent} !important; }

                /* Top-level comment separator */
                .commentarea > .sitetable.nestedlisting > .comment {
                    padding-top: 10px !important; padding-bottom: 4px !important;
                    margin-bottom: 2px !important;
                    border-bottom: 1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)'} !important;
                }

                /* Collapse toggle */
                .comment .entry .tagline .expand {
                    display: inline-block !important; font-weight: 700 !important;
                    font-size: 13px !important; padding: 1px 5px !important;
                    border-radius: 4px !important; cursor: pointer !important; margin-right: 4px !important;
                }
                .comment .entry .tagline .expand:hover {
                    background: ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'} !important;
                    color: ${t.accent} !important;
                }
                .comment.collapsed .entry { opacity: 0.5 !important; }
                .comment.collapsed:hover .entry { opacity: 0.75 !important; }

                /* More comments */
                .morecomments { margin: 6px 0 !important; }
                .morecomments a {
                    padding: 3px 10px !important; border-radius: 4px !important;
                    font-size: 12px !important; font-weight: 500 !important;
                }
                .morecomments a:hover {
                    background: ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'} !important;
                }

                /* --- ACTION BUTTONS --- */
                ul.flat-list.buttons {
                    display: flex !important; flex-wrap: wrap !important;
                    gap: 1px !important; padding: 2px 0 0 !important; margin: 0 !important;
                }
                .flat-list.buttons li a,
                .flat-list.buttons li .toggle a,
                .flat-list.buttons li span a {
                    display: inline-block !important; padding: 3px 8px !important;
                    border-radius: 4px !important; text-decoration: none !important;
                }
                .flat-list.buttons li a:hover,
                .flat-list.buttons li .toggle a:hover,
                .flat-list.buttons li span a:hover {
                    background: ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'} !important;
                    color: ${t.fg} !important;
                }
                .flat-list.buttons li:first-child a { font-weight: 600 !important; }

                /* --- VOTE COLUMN --- */
                .midcol { text-align: center !important; margin-right: 6px !important; }
                .arrow { border-radius: 2px !important; }
                .arrow:hover { opacity: 0.8 !important; }
                .arrow.up:hover, .arrow.upmod { opacity: 1 !important; }
                .arrow.down:hover, .arrow.downmod { opacity: 1 !important; }

                /* --- BLOCKQUOTES --- */
                .md blockquote {
                    border-left: 3px solid ${t.accent} !important;
                    background: ${isDark ? 'rgba(255,255,255,'+sA+')' : 'rgba(0,0,0,'+sA+')'} !important;
                    margin: 0.6em 0 !important; padding: 0.5em 1em !important;
                    border-radius: 0 6px 6px 0 !important; font-size: 0.95em !important;
                }
                .md blockquote blockquote {
                    border-left-color: ${t.fgDim} !important;
                    background: ${isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)'} !important;
                }
                .md blockquote p:first-child { margin-top: 0 !important; }
                .md blockquote p:last-child { margin-bottom: 0 !important; }

                /* --- CODE BLOCKS --- */
                .md code {
                    background: ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)'} !important;
                    padding: 0.15em 0.4em !important; border-radius: 4px !important;
                    font-size: 0.88em !important; border: none !important;
                    color: ${isDark ? '#e06c75' : '#d63384'} !important;
                }
                .md pre {
                    background: ${isDark ? '#0d1117' : '#f6f8fa'} !important;
                    color: ${isDark ? '#c9d1d9' : '#24292f'} !important;
                    padding: 14px 16px !important; border-radius: 8px !important;
                    border: 1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)'} !important;
                    overflow-x: auto !important; font-size: 13px !important;
                    line-height: 1.55 !important; tab-size: 4 !important; margin: 0.6em 0 !important;
                }
                .md pre code {
                    background: transparent !important; padding: 0 !important;
                    border: none !important; color: inherit !important;
                    font-size: inherit !important; border-radius: 0 !important;
                }

                /* --- TABLES --- */
                .md table { border-collapse: collapse !important; margin: 0.6em 0 !important; font-size: 13px !important; }
                .md th, .md td { padding: 8px 12px !important; text-align: left !important; }
                .md th {
                    font-weight: 600 !important;
                    background: ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'} !important;
                }
                .md tr:nth-child(even) td {
                    background: ${isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)'} !important;
                }

                /* --- LINKS IN MARKDOWN --- */
                .md a {
                    text-decoration: underline !important;
                    text-decoration-color: ${isDark ? 'rgba(125,180,255,0.3)' : 'rgba(0,90,180,0.25)'} !important;
                    text-underline-offset: 0.15em !important;
                    text-decoration-thickness: 1px !important;
                    text-decoration-skip-ink: auto !important;
                }
                .md a:hover {
                    text-decoration-color: ${isDark ? 'rgba(125,180,255,0.8)' : 'rgba(0,90,180,0.7)'} !important;
                }
                .tagline a, .flat-list a, .title a, .morecomments a,
                .tabmenu a, .side a, #header a, .search-result a { text-decoration: none !important; }

                /* --- FLAIR & BADGES --- */
                .flair, .linkflairlabel {
                    border-radius: 10px !important; padding: 1px 8px !important;
                    font-size: 11px !important; font-weight: 500 !important;
                }
                .linkflairlabel {
                    background: ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)'} !important;
                    border: 1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'} !important;
                }
                /* Role badges styled in ROLE FLAIR section below */

                /* --- HEADER & NAV --- */
                #header { box-shadow: 0 1px 3px ${t.shadow} !important; }
                #sr-header-area { border: none !important; line-height: 28px !important; font-size: 12px !important; }
                #header-bottom-left .tabmenu li a {
                    display: inline-block !important; padding: 5px 12px !important;
                    border-radius: 6px !important; font-size: 13px !important;
                    font-weight: 500 !important; border: none !important;
                }
                #header-bottom-left .tabmenu li a:hover {
                    background: ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'} !important;
                }
                #header-bottom-left .tabmenu li.selected a {
                    border-radius: 6px !important; font-weight: 600 !important;
                }
                .pagename a { font-weight: 700 !important; font-size: 18px !important; letter-spacing: -0.02em !important; }
                .pagename { margin-right: 8px !important; }

                /* --- SEARCH --- */
                #search input[type="text"] {
                    padding: 7px 12px !important; border-radius: 6px !important; font-size: 13px !important;
                }

                /* --- SIDEBAR --- */
                .side { font-size: 13px !important; }
                .side .md { line-height: 1.5 !important; font-size: 13px !important; }
                .side .titlebox { padding: 12px !important; border-radius: 8px !important; }
                .morelink { border-radius: 8px !important; text-align: center !important; font-weight: 600 !important; }
                .morelink .nub { display: none !important; }
                .sidebox.create { display: none !important; }

                /* --- TEXTAREA & INPUTS --- */
                .usertext-edit textarea {
                    font-size: 14px !important; line-height: 1.6 !important;
                    padding: 10px 12px !important; border-radius: 6px !important;
                    min-height: 100px !important; resize: vertical !important;
                }
                .usertext-edit .bottom-area { border-radius: 0 0 6px 6px !important; padding: 6px 10px !important; }
                .usertext-edit { border-radius: 8px !important; overflow: hidden !important; }

                /* --- FOCUS STATES --- */
                a:focus-visible, button:focus-visible, .arrow:focus-visible,
                textarea:focus-visible, input:focus-visible, select:focus-visible {
                    outline: none !important;
                    box-shadow: 0 0 0 2px ${isDark ? 'rgba(88,166,255,0.5)' : 'rgba(0,90,180,0.4)'} !important;
                    border-radius: 4px;
                }
                textarea:focus, input[type="text"]:focus, input[type="search"]:focus,
                input[type="url"]:focus, input[type="password"]:focus, select:focus {
                    box-shadow: 0 0 0 3px ${isDark ? 'rgba(88,166,255,0.15)' : 'rgba(0,90,180,0.12)'} !important;
                    outline: none !important;
                }

                /* --- MENUS & DROPDOWNS --- */
                .commentarea .menuarea { padding: 8px 0 !important; margin-bottom: 6px !important; }
                .menuarea .dropdown.lightdrop .selected { font-weight: 600 !important; font-size: 12px !important; }
                .drop-choices { border-radius: 6px !important; overflow: hidden !important; box-shadow: 0 4px 16px ${t.shadow} !important; }
                .drop-choices a.choice { padding: 6px 14px !important; font-size: 13px !important; }
                .expando-button { border-radius: 4px !important; }
                .linkinfo { border-radius: 8px !important; padding: 10px 14px !important; }

                /* --- MISC POLISH --- */
                .rel-ner-marker {
                    border-radius: 6px !important; padding: 8px 16px !important;
                    margin: 12px 0 !important; font-size: 11px !important; font-weight: 600 !important;
                    letter-spacing: 0.03em !important; text-transform: uppercase !important;
                }
                .rel-page-nav-btn { border-radius: 8px !important; backdrop-filter: blur(8px) !important; }
                .md .spoiler { border-radius: 4px !important; padding: 1px 6px !important; cursor: pointer !important; }
                ::-webkit-scrollbar { width: 8px !important; }
                ::-webkit-scrollbar-thumb { border-radius: 8px !important; }
                .md hr { border: none !important; border-top: 1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'} !important; margin: 1em 0 !important; }
                .md ul, .md ol { padding-left: 1.8em !important; margin: 0.4em 0 !important; }
                .md li { margin: 0.15em 0 !important; line-height: 1.55 !important; }
                .md img:not(.flair):not([width="16"]):not([height="16"]) { border-radius: 6px !important; max-width: 100% !important; }
                html { scroll-behavior: smooth; }
                body.listing-page .nav-buttons { padding: 12px 0 !important; }
                body.listing-page .nav-buttons .nextprev a {
                    padding: 6px 16px !important; border-radius: 6px !important;
                    font-weight: 500 !important; font-size: 13px !important;
                }
                .promoted-tag, .sponsored-indicator, .promotedlink .promoted-tag { display: none !important; }

                /* --- CAKE DAY CELEBRATION --- */
                @keyframes rel-cakeday-shimmer {
                    0% { background-position: -200% center; }
                    100% { background-position: 200% center; }
                }
                /* Entry highlight for comments with cake day users */
                .comment .entry:has(a.cakeday) {
                    border-left: 3px solid transparent !important;
                    border-image: linear-gradient(180deg, #ff6b6b, #ffa726, #ffee58, #66bb6a, #42a5f5, #ab47bc) 1 !important;
                    padding-left: 10px !important;
                    background: ${isDark
                        ? 'linear-gradient(135deg, rgba(255,167,38,0.06) 0%, rgba(255,87,34,0.03) 50%, rgba(171,71,188,0.04) 100%)'
                        : 'linear-gradient(135deg, rgba(255,167,38,0.08) 0%, rgba(255,87,34,0.04) 50%, rgba(171,71,188,0.05) 100%)'
                    } !important;
                    border-radius: 6px !important;
                    position: relative !important;
                }
                /* Shimmer bar on top */
                .comment .entry:has(a.cakeday)::before {
                    content: '' !important;
                    position: absolute !important;
                    top: 0 !important; left: 0 !important; right: 0 !important;
                    height: 2px !important;
                    background: linear-gradient(90deg,
                        transparent, #ff6b6b, #ffa726, #ffee58, #66bb6a, #42a5f5, #ab47bc, transparent
                    ) !important;
                    background-size: 200% 100% !important;
                    animation: rel-cakeday-shimmer 3s linear infinite !important;
                    border-radius: 6px 6px 0 0 !important;
                }
                /* Cake day badge after username */
                .tagline .userattrs:has(a.cakeday)::after {
                    content: 'Cake Day!' !important;
                    display: inline-block !important;
                    margin-left: 6px !important;
                    padding: 1px 8px !important;
                    border-radius: 10px !important;
                    font-size: 10px !important;
                    font-weight: 700 !important;
                    letter-spacing: 0.03em !important;
                    background: linear-gradient(135deg, #ffa726, #ff7043) !important;
                    color: #fff !important;
                    vertical-align: middle !important;
                    text-shadow: 0 1px 2px rgba(0,0,0,0.2) !important;
                    box-shadow: 0 1px 4px rgba(255,167,38,0.3) !important;
                }
                /* Animated glow on cake emoji */
                @keyframes rel-cakeday-flame {
                    0%, 100% { d: path('M10 3.5 Q10 1 10 1 Q10 1 10 3.5'); opacity: 0.9; }
                    25% { d: path('M10 3.5 Q8.5 1 10 0.5 Q11 1 10 3.5'); opacity: 1; }
                    50% { d: path('M10 3.5 Q9 0.5 10 0 Q11.5 1 10 3.5'); opacity: 0.95; }
                    75% { d: path('M10 3.5 Q11 1 10 0.5 Q9 0.8 10 3.5'); opacity: 1; }
                }
                @keyframes rel-cakeday-flame-glow {
                    0%, 100% { filter: drop-shadow(0 0 2px #ff9800) drop-shadow(0 0 4px rgba(255,152,0,0.4)); }
                    50% { filter: drop-shadow(0 0 3px #ffb74d) drop-shadow(0 0 6px rgba(255,152,0,0.6)); }
                }
                @keyframes rel-cakeday-name {
                    0% { color: #ff6b6b; text-shadow: 0 0 6px rgba(255,107,107,0.6), 0 0 12px rgba(255,107,107,0.3); }
                    16% { color: #ffa726; text-shadow: 0 0 6px rgba(255,167,38,0.6), 0 0 12px rgba(255,167,38,0.3); }
                    33% { color: #ffee58; text-shadow: 0 0 6px rgba(255,238,88,0.6), 0 0 12px rgba(255,238,88,0.3); }
                    50% { color: #66bb6a; text-shadow: 0 0 6px rgba(102,187,106,0.6), 0 0 12px rgba(102,187,106,0.3); }
                    66% { color: #42a5f5; text-shadow: 0 0 6px rgba(66,165,245,0.6), 0 0 12px rgba(66,165,245,0.3); }
                    83% { color: #ab47bc; text-shadow: 0 0 6px rgba(171,71,188,0.6), 0 0 12px rgba(171,71,188,0.3); }
                    100% { color: #ff6b6b; text-shadow: 0 0 6px rgba(255,107,107,0.6), 0 0 12px rgba(255,107,107,0.3); }
                }
                a.author.cakeday {
                    animation: rel-cakeday-name 3s linear infinite !important;
                    font-weight: 700 !important;
                    font-size: 13px !important;
                    letter-spacing: 0.02em !important;
                }
                .userattrs a.cakeday {
                    font-size: 0 !important;
                    line-height: 0 !important;
                    display: inline-block !important;
                    width: 20px !important; height: 20px !important;
                    vertical-align: middle !important;
                    text-decoration: none !important;
                    background: none !important;
                    position: relative !important;
                    animation: rel-cakeday-flame-glow 1.5s ease-in-out infinite !important;
                }
                .userattrs a.cakeday::before {
                    content: '' !important;
                    position: absolute !important;
                    inset: 0 !important;
                    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20'%3E%3Cdefs%3E%3ClinearGradient id='cake' x1='0' y1='0' x2='0' y2='1'%3E%3Cstop offset='0%25' stop-color='%23ff7eb3'/%3E%3Cstop offset='100%25' stop-color='%23ff3d7f'/%3E%3C/linearGradient%3E%3ClinearGradient id='frost' x1='0' y1='0' x2='0' y2='1'%3E%3Cstop offset='0%25' stop-color='%23fff3e0'/%3E%3Cstop offset='100%25' stop-color='%23ffe0b2'/%3E%3C/linearGradient%3E%3ClinearGradient id='fl' x1='0' y1='0' x2='0' y2='1'%3E%3Cstop offset='0%25' stop-color='%23fff176'/%3E%3Cstop offset='40%25' stop-color='%23ffb74d'/%3E%3Cstop offset='100%25' stop-color='%23ff7043'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect x='3' y='10' width='14' height='7' rx='2' fill='url(%23cake)'/%3E%3Crect x='3' y='10' width='14' height='3' rx='1.5' fill='url(%23frost)'/%3E%3Ccircle cx='6' cy='11.5' r='0.8' fill='%23e91e63' opacity='0.6'/%3E%3Ccircle cx='10' cy='11.5' r='0.8' fill='%234caf50' opacity='0.6'/%3E%3Ccircle cx='14' cy='11.5' r='0.8' fill='%232196f3' opacity='0.6'/%3E%3Crect x='9.5' y='5' width='1' height='5.5' rx='0.5' fill='%23fff9c4'/%3E%3Cellipse cx='10' cy='3' rx='2' ry='3' fill='url(%23fl)' opacity='0.9'%3E%3Canimate attributeName='ry' values='3;2.5;3.2;2.8;3' dur='0.8s' repeatCount='indefinite'/%3E%3Canimate attributeName='rx' values='2;1.6;2.2;1.8;2' dur='0.6s' repeatCount='indefinite'/%3E%3Canimate attributeName='opacity' values='0.9;1;0.85;1;0.9' dur='0.7s' repeatCount='indefinite'/%3E%3C/ellipse%3E%3Crect x='2' y='16' width='16' height='1.5' rx='0.75' fill='%23e0e0e0' opacity='0.15'/%3E%3C/svg%3E") !important;
                    background-size: contain !important;
                    background-repeat: no-repeat !important;
                    background-position: center !important;
                }
                /* Post listing entries with cake day */
                .thing.link .entry:has(a.cakeday) {
                    border-left: 3px solid transparent !important;
                    border-image: linear-gradient(180deg, #ff6b6b, #ffa726, #ffee58, #66bb6a, #42a5f5, #ab47bc) 1 !important;
                    padding-left: 10px !important;
                    background: ${isDark
                        ? 'linear-gradient(135deg, rgba(255,167,38,0.05) 0%, rgba(171,71,188,0.03) 100%)'
                        : 'linear-gradient(135deg, rgba(255,167,38,0.07) 0%, rgba(171,71,188,0.04) 100%)'
                    } !important;
                    border-radius: 6px !important;
                }

                /* --- ROLE FLAIR: OP / MOD / ADMIN --- */
                @keyframes rel-op-glow {
                    0%, 100% { text-shadow: 0 0 4px rgba(56,139,253,0.4); }
                    50% { text-shadow: 0 0 8px rgba(56,139,253,0.7), 0 0 16px rgba(56,139,253,0.3); }
                }
                @keyframes rel-mod-glow {
                    0%, 100% { text-shadow: 0 0 4px rgba(45,164,78,0.4); }
                    50% { text-shadow: 0 0 8px rgba(45,164,78,0.7), 0 0 16px rgba(45,164,78,0.3); }
                }
                @keyframes rel-admin-glow {
                    0%, 100% { text-shadow: 0 0 4px rgba(207,34,46,0.4); }
                    50% { text-shadow: 0 0 8px rgba(207,34,46,0.7), 0 0 16px rgba(207,34,46,0.3); }
                }

                /* OP (Submitter) - Blue theme */
                a.author.submitter {
                    color: #58a6ff !important;
                    font-weight: 700 !important;
                    animation: rel-op-glow 2.5s ease-in-out infinite !important;
                }
                .tagline .userattrs a.submitter {
                    background: linear-gradient(135deg, #1f6feb, #388bfd) !important;
                    color: #fff !important;
                    padding: 1px 8px !important; border-radius: 10px !important;
                    font-size: 10px !important; font-weight: 700 !important;
                    text-decoration: none !important;
                    box-shadow: 0 1px 4px rgba(56,139,253,0.3) !important;
                    letter-spacing: 0.03em !important;
                }
                .tagline .userattrs a.submitter::before {
                    content: '📢 ' !important;
                    font-size: 10px !important;
                }
                /* OP comment highlight */
                .comment .entry:has(a.author.submitter) {
                    border-left: 2px solid #388bfd !important;
                    padding-left: 8px !important;
                    background: ${isDark ? 'rgba(56,139,253,0.04)' : 'rgba(56,139,253,0.06)'} !important;
                    border-radius: 4px !important;
                }

                /* Moderator - Green theme */
                a.author.moderator {
                    color: #3fb950 !important;
                    font-weight: 700 !important;
                    animation: rel-mod-glow 2.5s ease-in-out infinite !important;
                }
                .tagline .userattrs a.moderator {
                    background: linear-gradient(135deg, #238636, #2da44e) !important;
                    color: #fff !important;
                    padding: 1px 8px !important; border-radius: 10px !important;
                    font-size: 10px !important; font-weight: 700 !important;
                    text-decoration: none !important;
                    box-shadow: 0 1px 4px rgba(45,164,78,0.3) !important;
                    letter-spacing: 0.03em !important;
                }
                .tagline .userattrs a.moderator::before {
                    content: '🛡 ' !important;
                    font-size: 10px !important;
                }
                /* Mod comment highlight */
                .comment .entry:has(a.author.moderator) {
                    border-left: 2px solid #2da44e !important;
                    padding-left: 8px !important;
                    background: ${isDark ? 'rgba(45,164,78,0.04)' : 'rgba(45,164,78,0.06)'} !important;
                    border-radius: 4px !important;
                }

                /* Admin - Red theme */
                a.author.admin {
                    color: #f85149 !important;
                    font-weight: 700 !important;
                    animation: rel-admin-glow 2.5s ease-in-out infinite !important;
                }
                .tagline .userattrs a.admin {
                    background: linear-gradient(135deg, #b62324, #cf222e) !important;
                    color: #fff !important;
                    padding: 1px 8px !important; border-radius: 10px !important;
                    font-size: 10px !important; font-weight: 700 !important;
                    text-decoration: none !important;
                    box-shadow: 0 1px 4px rgba(207,34,46,0.3) !important;
                    letter-spacing: 0.03em !important;
                }
                .tagline .userattrs a.admin::before {
                    content: '👑 ' !important;
                    font-size: 10px !important;
                }
                /* Admin comment highlight */
                .comment .entry:has(a.author.admin) {
                    border-left: 2px solid #cf222e !important;
                    padding-left: 8px !important;
                    background: ${isDark ? 'rgba(207,34,46,0.04)' : 'rgba(207,34,46,0.06)'} !important;
                    border-radius: 4px !important;
                }

                /* Friend - Orange theme */
                a.author.friend {
                    color: #f0883e !important;
                    font-weight: 600 !important;
                }
                .tagline .userattrs a.friend {
                    background: linear-gradient(135deg, #bd561d, #db6d28) !important;
                    color: #fff !important;
                    padding: 1px 8px !important; border-radius: 10px !important;
                    font-size: 10px !important; font-weight: 700 !important;
                    text-decoration: none !important;
                    box-shadow: 0 1px 4px rgba(219,109,40,0.3) !important;
                }
                .tagline .userattrs a.friend::before {
                    content: '⭐ ' !important;
                    font-size: 10px !important;
                }

                /* --- HIDE UNNECESSARY ELEMENTS --- */
                a.reddiquette { display: none !important; }
                a.option.active { display: none !important; }
                div.nav-buttons { display: none !important; }
                div.rel-ner-marker { display: none !important; }
                div.footer-parent { display: none !important; }
                div.ad-container.link.promoted { display: none !important; }
                a.about-this-ad-button { display: none !important; }
                span.selected.title { color: #999999 !important; }
                #header-bottom-right { background: ${t.bg} !important; }
                #header-bottom-left { background: ${t.bg} !important; }
                body #header #header-bottom-left { background: ${t.bg} !important; background-image: none !important; }
                #sr-more-link { background-color: #000000 !important; }

                /* --- COMMENT TEXTAREA FULL WIDTH --- */
                div.usertext-edit.md-container { width: 100% !important; box-sizing: border-box !important; }
                div.usertext-edit textarea { width: 100% !important; box-sizing: border-box !important; }
                div.usertext-edit p { width: 100% !important; box-sizing: border-box !important; }

                /* --- BOTTOM AREA TIGHTEN --- */
                div.bottom-area { margin-top: -14px !important; margin-bottom: -10px !important; }
            `;
        }
    };

    // =========================================================================
    // SETTINGS MODULE (Tabbed Panel with Theme Picker)
    // =========================================================================
    const SettingsModule = {
        init() {
            // Add gear icon to userbar
            const userbar = document.querySelector('#header-bottom-right');
            if (userbar) {
                const gear = Utils.createElement('span', {
                    className: 'rel-settings-btn',
                    textContent: '\u2699',
                    title: 'Reddit Enhancement Continued Settings',
                    onClick: () => this.showPanel()
                });
                userbar.prepend(gear);
            }
            GM_registerMenuCommand('REL Settings', () => this.showPanel());
        },

        showPanel() {
            if (document.querySelector('.rel-settings-overlay')) return;

            const t = Themes.getTheme();
            const overlay = Utils.createElement('div', { className: 'rel-settings-overlay' });

            const tabs = [
                { id: 'appearance', label: 'Appearance' },
                { id: 'content', label: 'Content' },
                { id: 'comments', label: 'Comments' },
                { id: 'navigation', label: 'Navigation' },
                { id: 'filtering', label: 'Filtering' },
                { id: 'privacy', label: 'Privacy' },
                { id: 'backup', label: 'Backup' }
            ];

            const settingDefs = {
                appearance: [
                    { key: 'darkMode', label: 'Dark Mode', desc: 'Enable dark theme' },
                    { key: 'theme', label: 'Theme', desc: 'Choose color scheme', type: 'theme' },
                    { key: 'oldFavicon', label: 'Old Reddit Favicon', desc: 'Restore the classic Snoo favicon' },
                    { key: 'collapsibleSidebar', label: 'Collapsible Sidebar', desc: 'Toggle sidebar visibility' },
                    { key: 'hideGoldButton', label: 'Hide Gold Button', desc: 'Remove give gold buttons' },
                    { key: 'hideShareButton', label: 'Hide Share Button', desc: 'Remove share buttons from posts and comments' },
                    { key: 'hideSaveButton', label: 'Hide Save Button', desc: 'Remove save buttons from posts and comments' },
                    { key: 'hideCrosspostButton', label: 'Hide Crosspost Button', desc: 'Remove crosspost buttons from posts' },
                    { key: 'hideReportButton', label: 'Hide Report Button', desc: 'Remove report buttons from posts and comments' },
                    { key: 'hideSidebar', label: 'Auto-Hide Sidebar', desc: 'Start with sidebar collapsed' },
                    { key: 'selectedEntryHighlight', label: 'Selected Entry Highlight', desc: 'Outline currently focused post/comment' },
                    { key: 'customCSS', label: 'Custom CSS', desc: 'Add your own CSS rules', type: 'textarea' },
                    { key: 'removeSubredditStyles', label: 'Remove Subreddit Styles', desc: 'Strip custom CSS from subreddits for consistent dark mode' },
                    { key: 'wideView', label: 'Wide View', desc: 'Expand content area to use full screen width' },
                    { key: 'enhancedUI', label: 'Enhanced UI', desc: 'Modern typography, card layouts, rainbow threads, polished interactions' }
                ],
                content: [
                    { key: 'inlineImageExpansion', label: 'Inline Image Expansion', desc: 'Expand images and videos inline' },
                    { key: 'inlineImageFix', label: 'Inline Image Fix', desc: 'Auto-convert image links in comments' },
                    { key: 'embedYouTube', label: 'YouTube Embeds', desc: 'Embed YouTube videos inline' },
                    { key: 'embedRedditPreviews', label: 'Reddit Post Previews', desc: 'Preview linked Reddit posts' },
                    { key: 'embedSocialMedia', label: 'Social Media Previews', desc: 'Preview Twitter/X and other links' },
                    { key: 'singleClickOpener', label: 'Single Click Opener', desc: 'Add [l+c] links to open link and comments' },
                    { key: 'showTimestamps', label: 'Enhanced Timestamps', desc: 'Show full timestamps on hover' },
                    { key: 'voteEnhancements', label: 'Vote Enhancements', desc: 'Color-coded scores and vote weight tracking' },
                    { key: 'showUserInfo', label: 'User Info Popup', desc: 'Show user info on hover' },
                    { key: 'downloadButtons', label: 'Download Buttons', desc: 'Add download buttons for images on posts' },
                    { key: 'subredditDescription', label: 'Subreddit Description', desc: 'Show About Community box in sidebar from new Reddit API' },
                    { key: 'viewCounter', label: 'Post View Counter', desc: 'Display estimated view counts on posts (from Classic Reddit++)' },
                    { key: 'voteEstimator', label: 'Vote Estimator', desc: 'Show estimated upvote/downvote counts and percentage (from Classic Reddit++)' },
                    { key: 'fullScores', label: 'Full Scores', desc: 'Show full numbers instead of abbreviated (e.g. 1,234 vs 1.2k)' },
                    { key: 'userPrefix', label: 'Username /u/ Prefix', desc: 'Add /u/ before usernames' },
                    { key: 'trendingSubreddits', label: 'Trending Subreddits', desc: 'Show simulated trending subreddits bar on front page' }
                ],
                comments: [
                    { key: 'commentHighlighting', label: 'Comment Highlighting', desc: 'Highlight new comments since last visit' },
                    { key: 'commentDepthIndicators', label: 'Depth Indicators', desc: 'Rainbow color bars showing comment depth' },
                    { key: 'collapseChildComments', label: 'Hide Child Comments', desc: 'Add per-comment and page-wide toggle buttons to collapse reply threads (RES-style)' },
                    { key: 'collapseChildCommentsDefault', label: 'Auto-Hide Children', desc: 'Automatically hide all child comments on page load' },
                    { key: 'collapseChildCommentsNested', label: 'Nested Toggle Buttons', desc: 'Add hide/show buttons on all comments with children, not just top-level' },
                    { key: 'collapseChildCommentsHideNested', label: 'Hide Deeply Nested', desc: 'When hiding all, also recursively hide children of nested comments' },
                    { key: 'formattingToolbar', label: 'Formatting Toolbar', desc: 'Markdown formatting buttons and live preview' },
                    { key: 'livePreview', label: 'Live Preview', desc: 'Preview markdown as you type' },
                    { key: 'expandContinueThread', label: 'Expand Continue Thread', desc: 'Load continued threads inline' },
                    { key: 'hideAutoModerator', label: 'Hide Bot Comments', desc: 'Auto-collapse AutoModerator, mod-bots, and other known bot comments' },
                    { key: 'depthColorScheme', label: 'Depth Colors', desc: 'Color scheme for depth indicators', type: 'select',
                      options: [
                          { value: 'rainbow', label: 'Rainbow' },
                          { value: 'warm', label: 'Warm' },
                          { value: 'cool', label: 'Cool' },
                          { value: 'pastel', label: 'Pastel' }
                      ]
                    }
                ],
                navigation: [
                    { key: 'neverEndingReddit', label: 'Never Ending Reddit', desc: 'Infinite scroll through pages' },
                    { key: 'keyboardNav', label: 'Keyboard Navigation', desc: 'Navigate with j/k, vote with a/z' },
                    { key: 'pageNavigator', label: 'Page Navigator', desc: 'Floating scroll-to-top/bottom buttons' },
                    { key: 'subredditShortcuts', label: 'Subreddit Shortcuts', desc: 'Custom subreddit shortcut bar' },
                    { key: 'oldRedditRedirect', label: 'Old Reddit Redirect', desc: 'Redirect to old.reddit.com automatically' },
                    { key: 'scrollToTopOnNav', label: 'Scroll to Top', desc: 'Scroll to top when navigating pages' },
                    { key: 'nerPauseAfterPages', label: 'NER Pause After Pages', desc: 'Pause infinite scroll after N pages (0 = never)', type: 'number', min: 0, max: 50 },
                    { key: 'autoHideAfterVote', label: 'Auto-Hide After Vote', desc: 'Hide posts after upvoting or downvoting' },
                    { key: 'stateSaver', label: 'State Saver', desc: 'Preserve scroll position when navigating back from posts' },
                    { key: 'notificationRedirect', label: 'Notification Redirect', desc: 'Redirect old.reddit.com/notifications to sh.reddit.com (which actually works)' }
                ],
                filtering: [
                    { key: 'postFiltering', label: 'Post Filtering', desc: 'Filter posts by keyword, domain, subreddit, flair' },
                    { key: 'userTagging', label: 'User Tagging', desc: 'Tag users with custom labels and colors' },
                    { key: 'userHighlighter', label: 'User Highlighter', desc: 'Color-code OP, mods, admins, and friends' },
                    { type: 'filterEditor' }
                ],
                privacy: [
                    { key: 'adBlocker', label: 'Ad Blocker', desc: 'Hide all promoted posts, sponsored content, gold ads, and Reddit Premium banners' },
                    { key: 'noParticipation', label: 'No Participation', desc: 'Enforce NP mode on np.reddit.com links' },
                    { type: 'ignoredUsers' }
                ],
                backup: [
                    { type: 'backupRestore' }
                ]
            };

            const panel = Utils.createElement('div', { className: 'rel-settings-panel' });

            // Header
            const header = Utils.createElement('div', { className: 'rel-settings-header' });
            header.innerHTML = `<h2>\u2699 Reddit Enhancement Continued <span class="rel-version">v${VERSION}</span></h2>`;
            const closeBtn = Utils.createElement('button', { className: 'rel-settings-close', textContent: '\u2715', onClick: () => overlay.remove() });
            header.appendChild(closeBtn);
            panel.appendChild(header);

            // Tabs
            const tabBar = Utils.createElement('div', { className: 'rel-settings-tabs' });
            tabs.forEach((tab, i) => {
                const btn = Utils.createElement('button', {
                    className: 'rel-tab' + (i === 0 ? ' active' : ''),
                    textContent: tab.label,
                    'data-tab': tab.id,
                    onClick: (e) => {
                        tabBar.querySelectorAll('.rel-tab').forEach(t => t.classList.remove('active'));
                        e.target.classList.add('active');
                        body.querySelectorAll('.rel-tab-content').forEach(c => c.classList.remove('active'));
                        body.querySelector(`[data-content="${tab.id}"]`).classList.add('active');
                    }
                });
                tabBar.appendChild(btn);
            });
            panel.appendChild(tabBar);

            // Body
            const body = Utils.createElement('div', { className: 'rel-settings-body' });
            tabs.forEach((tab, i) => {
                const content = Utils.createElement('div', {
                    className: 'rel-tab-content' + (i === 0 ? ' active' : ''),
                    'data-content': tab.id
                });

                const defs = settingDefs[tab.id] || [];
                defs.forEach(def => {
                    if (def.type === 'theme') {
                        content.appendChild(this.buildThemePicker());
                    } else if (def.type === 'filterEditor') {
                        content.appendChild(this.buildFilterEditor());
                    } else if (def.type === 'backupRestore') {
                        content.appendChild(this.buildBackupRestore());
                    } else if (def.type === 'ignoredUsers') {
                        content.appendChild(this.buildIgnoredUsers());
                    } else if (def.type === 'textarea') {
                        content.appendChild(this.buildTextareaSetting(def));
                    } else if (def.type === 'select') {
                        content.appendChild(this.buildSelectSetting(def));
                    } else if (def.type === 'number') {
                        content.appendChild(this.buildNumberSetting(def));
                    } else {
                        content.appendChild(this.buildToggle(def));
                    }
                });

                body.appendChild(content);
            });
            panel.appendChild(body);

            // Footer
            const footer = Utils.createElement('div', { className: 'rel-settings-footer' });
            footer.innerHTML = `<span style="font-size:11px;opacity:0.5;">Changes auto-save. Reload for some settings.</span>`;
            const actions = Utils.createElement('div', { className: 'rel-footer-actions' });
            const reloadBtn = Utils.createElement('button', {
                className: 'rel-btn-small rel-btn-primary',
                textContent: 'Reload Page',
                onClick: () => location.reload()
            });
            actions.appendChild(reloadBtn);
            footer.appendChild(actions);
            panel.appendChild(footer);

            overlay.appendChild(panel);
            overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
            document.body.appendChild(overlay);
        },

        buildToggle(def) {
            const item = Utils.createElement('div', { className: 'rel-setting-item' });
            item.innerHTML = `
                <div class="rel-setting-info">
                    <label>${Utils.escapeHTML(def.label)}</label>
                    <div class="rel-setting-desc">${Utils.escapeHTML(def.desc)}</div>
                </div>
            `;
            const toggle = Utils.createElement('label', { className: 'rel-toggle' });
            const input = Utils.createElement('input', { type: 'checkbox' });
            input.checked = !!settings[def.key];
            input.addEventListener('change', () => {
                settings[def.key] = input.checked;
                saveSettings();
                if (def.key === 'darkMode') {
                    document.body.classList.toggle('rel-dark-mode', input.checked);
                    this.applyThemeCSS();
                }
                if (def.key === 'hideGoldButton') {
                    document.body.classList.toggle('rel-hide-gold', input.checked);
                }
                if (def.key === 'hideShareButton') {
                    document.body.classList.toggle('rel-hide-share', input.checked);
                }
                if (def.key === 'hideSaveButton') {
                    document.body.classList.toggle('rel-hide-save', input.checked);
                }
                if (def.key === 'hideCrosspostButton') {
                    document.body.classList.toggle('rel-hide-crosspost', input.checked);
                }
                if (def.key === 'hideReportButton') {
                    document.body.classList.toggle('rel-hide-report', input.checked);
                }
            });
            toggle.appendChild(input);
            toggle.appendChild(Utils.createElement('span', { className: 'rel-toggle-slider' }));
            item.appendChild(toggle);
            return item;
        },

        buildSelectSetting(def) {
            const item = Utils.createElement('div', { className: 'rel-setting-item' });
            item.innerHTML = `
                <div class="rel-setting-info">
                    <label>${Utils.escapeHTML(def.label)}</label>
                    <div class="rel-setting-desc">${Utils.escapeHTML(def.desc)}</div>
                </div>
            `;
            const select = Utils.createElement('select', { className: 'rel-select' });
            def.options.forEach(opt => {
                const option = Utils.createElement('option', { value: opt.value, textContent: opt.label });
                if (settings[def.key] === opt.value) option.selected = true;
                select.appendChild(option);
            });
            select.addEventListener('change', () => {
                settings[def.key] = select.value;
                saveSettings();
            });
            item.appendChild(select);
            return item;
        },

        buildNumberSetting(def) {
            const item = Utils.createElement('div', { className: 'rel-setting-item' });
            item.innerHTML = `
                <div class="rel-setting-info">
                    <label>${Utils.escapeHTML(def.label)}</label>
                    <div class="rel-setting-desc">${Utils.escapeHTML(def.desc)}</div>
                </div>
            `;
            const input = Utils.createElement('input', {
                type: 'number', className: 'rel-input', style: { width: '60px' },
            });
            input.min = def.min || 0;
            input.max = def.max || 999;
            input.value = settings[def.key] || 0;
            input.addEventListener('change', () => {
                settings[def.key] = parseInt(input.value) || 0;
                saveSettings();
            });
            item.appendChild(input);
            return item;
        },

        buildTextareaSetting(def) {
            const section = Utils.createElement('div', { className: 'rel-settings-section' });
            section.innerHTML = `<h3>${Utils.escapeHTML(def.label)}</h3><div class="rel-setting-desc" style="margin-bottom:6px;">${Utils.escapeHTML(def.desc)}</div>`;
            const ta = Utils.createElement('textarea', { className: 'rel-textarea' });
            ta.value = settings[def.key] || '';
            ta.addEventListener('input', Utils.debounce(() => {
                settings[def.key] = ta.value;
                saveSettings();
            }, 500));
            section.appendChild(ta);
            return section;
        },

        buildThemePicker() {
            const section = Utils.createElement('div', { className: 'rel-settings-section' });
            section.innerHTML = '<h3>Theme</h3>';
            const grid = Utils.createElement('div', { className: 'rel-theme-grid' });

            Object.entries(Themes.definitions).forEach(([id, theme]) => {
                const card = Utils.createElement('div', {
                    className: 'rel-theme-card' + (settings.theme === id ? ' active' : ''),
                    onClick: () => {
                        settings.theme = id;
                        if (id === 'light') { settings.darkMode = false; }
                        else { settings.darkMode = true; }
                        saveSettings();
                        grid.querySelectorAll('.rel-theme-card').forEach(c => c.classList.remove('active'));
                        card.classList.add('active');
                        this.applyThemeCSS();
                        Utils.notify(`Theme: ${theme.name}`, 'success', 1500);
                    }
                });

                const preview = Utils.createElement('div', { className: 'rel-theme-preview' });
                preview.innerHTML = `<div style="background:${theme.bg}"></div><div style="background:${theme.surface}"></div><div style="background:${theme.accent}"></div><div style="background:${theme.link}"></div>`;
                card.appendChild(preview);
                card.appendChild(Utils.createElement('div', { className: 'rel-theme-name', textContent: theme.name }));
                grid.appendChild(card);
            });

            section.appendChild(grid);
            return section;
        },

        buildFilterEditor() {
            const section = Utils.createElement('div', { className: 'rel-settings-section' });
            section.innerHTML = '<h3>Content Filters</h3>';

            const filterTypes = [
                { key: 'keywords', label: 'Keywords (title text)', placeholder: 'Enter keyword or /regex/' },
                { key: 'domains', label: 'Domains', placeholder: 'example.com' },
                { key: 'subreddits', label: 'Subreddits', placeholder: 'subreddit name' },
                { key: 'flairs', label: 'Flairs', placeholder: 'flair text' }
            ];

            filterTypes.forEach(ft => {
                const group = Utils.createElement('div', { style: { marginBottom: '12px' } });
                group.innerHTML = `<label style="font-size:12px;font-weight:bold;display:block;margin-bottom:4px;">${ft.label}</label>`;

                const list = Utils.createElement('div', { className: 'rel-filter-list' });
                const renderList = () => {
                    list.innerHTML = '';
                    (filters[ft.key] || []).forEach((val, i) => {
                        const item = Utils.createElement('div', { className: 'rel-filter-item' });
                        item.innerHTML = `<span>${Utils.escapeHTML(val)}</span>`;
                        const removeBtn = Utils.createElement('button', {
                            className: 'rel-filter-remove',
                            textContent: '\u2715',
                            onClick: () => {
                                filters[ft.key].splice(i, 1);
                                saveFilters();
                                renderList();
                            }
                        });
                        item.appendChild(removeBtn);
                        list.appendChild(item);
                    });
                };
                renderList();
                group.appendChild(list);

                const addRow = Utils.createElement('div', { className: 'rel-filter-add-row' });
                const addInput = Utils.createElement('input', { className: 'rel-input', placeholder: ft.placeholder });
                const addBtn = Utils.createElement('button', {
                    className: 'rel-btn-small rel-btn-primary', textContent: 'Add',
                    onClick: () => {
                        const val = addInput.value.trim();
                        if (val && !filters[ft.key].includes(val)) {
                            filters[ft.key].push(val);
                            saveFilters();
                            renderList();
                            addInput.value = '';
                        }
                    }
                });
                addInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') addBtn.click(); });
                addRow.appendChild(addInput);
                addRow.appendChild(addBtn);
                group.appendChild(addRow);
                section.appendChild(group);
            });

            return section;
        },

        buildIgnoredUsers() {
            const section = Utils.createElement('div', { className: 'rel-settings-section' });
            section.innerHTML = '<h3>Ignored Users</h3>';

            const list = Utils.createElement('div', { className: 'rel-filter-list' });
            const renderList = () => {
                list.innerHTML = '';
                ignoredUsers.forEach((user, i) => {
                    const item = Utils.createElement('div', { className: 'rel-filter-item' });
                    item.innerHTML = `<span>/u/${Utils.escapeHTML(user)}</span>`;
                    const removeBtn = Utils.createElement('button', {
                        className: 'rel-filter-remove', textContent: '\u2715',
                        onClick: () => {
                            ignoredUsers.splice(i, 1);
                            saveIgnoredUsers();
                            renderList();
                        }
                    });
                    item.appendChild(removeBtn);
                    list.appendChild(item);
                });
            };
            renderList();
            section.appendChild(list);

            const addRow = Utils.createElement('div', { className: 'rel-filter-add-row' });
            const addInput = Utils.createElement('input', { className: 'rel-input', placeholder: 'username' });
            const addBtn = Utils.createElement('button', {
                className: 'rel-btn-small rel-btn-primary', textContent: 'Add',
                onClick: () => {
                    const val = addInput.value.trim().replace(/^\/?u\//, '');
                    if (val && !ignoredUsers.includes(val)) {
                        ignoredUsers.push(val);
                        saveIgnoredUsers();
                        renderList();
                        addInput.value = '';
                    }
                }
            });
            addRow.appendChild(addInput);
            addRow.appendChild(addBtn);
            section.appendChild(addRow);
            return section;
        },

        buildBackupRestore() {
            const section = Utils.createElement('div', { className: 'rel-settings-section' });
            section.innerHTML = '<h3>Backup & Restore</h3><div class="rel-setting-desc" style="margin-bottom:10px;">Export or import all settings, tags, filters, and macros.</div>';

            const row = Utils.createElement('div', { style: { display: 'flex', gap: '8px', marginBottom: '12px' } });

            const exportBtn = Utils.createElement('button', {
                className: 'rel-btn-small rel-btn-primary', textContent: 'Export Settings',
                onClick: () => {
                    const data = Storage.exportAll();
                    const blob = new Blob([data], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url; a.download = `rel-backup-${new Date().toISOString().slice(0,10)}.json`;
                    a.click(); URL.revokeObjectURL(url);
                    Utils.notify('Settings exported!', 'success');
                }
            });

            const importBtn = Utils.createElement('button', {
                className: 'rel-btn-small rel-btn-secondary', textContent: 'Import Settings',
                onClick: () => {
                    const input = document.createElement('input');
                    input.type = 'file'; input.accept = '.json';
                    input.addEventListener('change', () => {
                        const file = input.files[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = () => {
                            if (Storage.importAll(reader.result)) {
                                Utils.notify('Settings imported! Reloading...', 'success');
                                setTimeout(() => location.reload(), 1000);
                            } else {
                                Utils.notify('Invalid backup file', 'error');
                            }
                        };
                        reader.readAsText(file);
                    });
                    input.click();
                }
            });

            const resetBtn = Utils.createElement('button', {
                className: 'rel-btn-small rel-btn-danger', textContent: 'Reset All',
                onClick: () => {
                    if (confirm('Reset ALL Reddit Enhancement Continued settings to defaults? This cannot be undone.')) {
                        Object.values(CONFIG.storageKeys).forEach(key => Storage.remove(key));
                        Utils.notify('All settings reset. Reloading...', 'warning');
                        setTimeout(() => location.reload(), 1000);
                    }
                }
            });

            row.appendChild(exportBtn);
            row.appendChild(importBtn);
            row.appendChild(resetBtn);
            section.appendChild(row);

            // Copy to clipboard
            const copyBtn = Utils.createElement('button', {
                className: 'rel-btn-small rel-btn-secondary', textContent: 'Copy Settings to Clipboard',
                onClick: () => {
                    Utils.copyToClipboard(Storage.exportAll());
                    Utils.notify('Settings copied to clipboard!', 'success');
                }
            });
            section.appendChild(copyBtn);

            // User Tags export/import
            const tagLabel = Utils.createElement('h3', {
                textContent: 'User Tags',
                style: { margin: '14px 0 6px', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }
            });
            section.appendChild(tagLabel);

            const tagRow = Utils.createElement('div', { style: { display: 'flex', gap: '8px', flexWrap: 'wrap' } });

            const exportTagsBtn = Utils.createElement('button', {
                className: 'rel-btn-small rel-btn-secondary', textContent: 'Export Tags',
                onClick: () => {
                    const data = JSON.stringify(userTags, null, 2);
                    const blob = new Blob([data], { type: 'application/json' });
                    const a = document.createElement('a');
                    a.href = URL.createObjectURL(blob);
                    a.download = `rel-user-tags-${new Date().toISOString().slice(0,10)}.json`;
                    a.click();
                    URL.revokeObjectURL(a.href);
                    Utils.notify(`Exported ${Object.keys(userTags).length} tags`, 'success');
                }
            });

            const importTagsBtn = Utils.createElement('button', {
                className: 'rel-btn-small rel-btn-secondary', textContent: 'Import Tags',
                onClick: () => {
                    const input = document.createElement('input');
                    input.type = 'file'; input.accept = '.json';
                    input.addEventListener('change', () => {
                        const file = input.files[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = () => {
                            try {
                                const imported = JSON.parse(reader.result);
                                if (typeof imported !== 'object' || Array.isArray(imported)) throw new Error('Invalid format');
                                let count = 0;
                                Object.entries(imported).forEach(([user, tag]) => {
                                    if (tag && typeof tag === 'object' && tag.text) {
                                        userTags[user] = tag;
                                        count++;
                                    }
                                });
                                saveUserTags();
                                Utils.notify(`Imported ${count} tags. Reload to see changes.`, 'success');
                            } catch (e) {
                                Utils.notify('Invalid tags file', 'error');
                            }
                        };
                        reader.readAsText(file);
                    });
                    input.click();
                }
            });

            tagRow.appendChild(exportTagsBtn);
            tagRow.appendChild(importTagsBtn);
            section.appendChild(tagRow);

            return section;
        },

        applyThemeCSS() {
            // Remove old theme styles
            document.querySelectorAll('[data-rel-theme]').forEach(el => el.remove());
            if (settings.darkMode && settings.theme !== 'light') {
                const themeCSS = Themes.generateCSS();
                const style1 = document.createElement('style');
                style1.setAttribute('data-rel-theme', 'main');
                style1.textContent = themeCSS;
                document.head.appendChild(style1);

                const themedBase = Styles.getThemedBase();
                const style2 = document.createElement('style');
                style2.setAttribute('data-rel-theme', 'components');
                style2.textContent = themedBase;
                document.head.appendChild(style2);

                document.body.classList.add('rel-dark-mode');
            } else {
                document.body.classList.remove('rel-dark-mode');
            }

            // UX enhancements (works with any theme including light)
            const uxCSS = Styles.generateUXCSS();
            if (uxCSS) {
                const style3 = document.createElement('style');
                style3.setAttribute('data-rel-theme', 'ux');
                style3.textContent = uxCSS;
                document.head.appendChild(style3);
            }
        }
    };

    // =========================================================================
    // DARK MODE MODULE
    // =========================================================================
    const DarkModeModule = {
        init() {
            if (settings.darkMode && settings.theme !== 'light') {
                document.body.classList.add('rel-dark-mode');
            }
            if (settings.hideGoldButton) {
                document.body.classList.add('rel-hide-gold');
            }
            if (settings.hideShareButton) {
                document.body.classList.add('rel-hide-share');
            }
            if (settings.hideSaveButton) {
                document.body.classList.add('rel-hide-save');
            }
            if (settings.hideCrosspostButton) {
                document.body.classList.add('rel-hide-crosspost');
            }
            if (settings.hideReportButton) {
                document.body.classList.add('rel-hide-report');
            }
        }
    };

    // =========================================================================
    // OLD FAVICON MODULE
    // =========================================================================
    const OldFaviconModule = {
        init() {
            if (!settings.oldFavicon) return;
            const setFavicon = () => {
                const icons = [...document.querySelectorAll('link[rel~="icon"]')];
                if (!icons.length) return;
                const copy = icons[0].cloneNode(true);
                copy.href = 'https://b.thumbs.redditmedia.com/JeP1WF0kEiiH1gT8vOr_7kFAwIlHzRBHjLDZIkQP61Q.jpg';
                icons.forEach(x => x.parentNode.removeChild(x));
                document.head.appendChild(copy);
            };
            setFavicon();
            window.addEventListener('load', setFavicon);
        }
    };

    // =========================================================================
    // COLLAPSIBLE SIDEBAR MODULE
    // =========================================================================
    const CollapsibleSidebarModule = {
        _storageKey: 'rel_sidebar_hidden',

        _applyState(side, btn, hidden) {
            side.style.display = hidden ? 'none' : '';
            btn.textContent = hidden ? '\u25B6 Sidebar' : '\u25C0 Sidebar';
            const content = document.querySelector('.content[role="main"]');
            if (content) content.style.marginRight = hidden ? '0' : '';
            Storage.set(this._storageKey, hidden);
        },

        init() {
            if (!settings.collapsibleSidebar) return;
            const side = document.querySelector('.side');
            if (!side) return;

            // Persisted state wins; fall back to hideSidebar default
            const savedState = Storage.get(this._storageKey, null);
            const startHidden = savedState !== null ? savedState : !!settings.hideSidebar;

            const self = this;
            const btn = Utils.createElement('div', {
                style: {
                    position: 'fixed', right: '0', top: '50%', transform: 'translateY(-50%)',
                    zIndex: '99997', cursor: 'pointer', padding: '8px 4px',
                    borderRadius: '4px 0 0 4px', fontSize: '14px', opacity: '0.6',
                    transition: 'opacity 0.2s', writingMode: 'vertical-lr'
                },
                textContent: '\u25C0 Sidebar',
                onClick: () => {
                    const isHidden = side.style.display === 'none';
                    self._applyState(side, btn, !isHidden);
                }
            });

            const t = Themes.getTheme();
            if (settings.darkMode) {
                btn.style.background = t.surface;
                btn.style.color = t.fg;
            } else {
                btn.style.background = '#e0e0e0';
                btn.style.color = '#333';
            }
            btn.addEventListener('mouseenter', () => { btn.style.opacity = '1'; });
            btn.addEventListener('mouseleave', () => { btn.style.opacity = '0.6'; });

            document.body.appendChild(btn);

            // Apply initial state
            if (startHidden) {
                this._applyState(side, btn, true);
            }
        }
    };

    // =========================================================================
    // USER TAGGING MODULE
    // =========================================================================
    const UserTaggingModule = {
        tagColors: {
            none: 'transparent', aqua: '#5bc0de', blue: '#0079d3', green: '#5cb85c',
            orange: '#f0ad4e', pink: '#ff79c6', purple: '#bd93f9', red: '#d9534f',
            teal: '#20c997', yellow: '#f1fa8c'
        },

        init() {
            if (!settings.userTagging) return;
            this.process(document);
        },

        process(container) {
            if (!settings.userTagging) return;
            const authors = container.querySelectorAll('.author:not([data-rel-tagged])');
            authors.forEach(author => {
                author.setAttribute('data-rel-tagged', '1');
                const username = author.textContent;
                if (!username) return;

                const tagBtn = Utils.createElement('span', {
                    className: 'rel-user-tag',
                    textContent: userTags[username] ? userTags[username].text : '\u2605',
                    title: 'Tag user',
                    onClick: (e) => { e.preventDefault(); e.stopPropagation(); this.showTagPopup(username, e); }
                });

                if (userTags[username]) {
                    const color = this.tagColors[userTags[username].color] || userTags[username].color;
                    tagBtn.style.background = color;
                    tagBtn.style.color = '#fff';
                } else {
                    tagBtn.style.opacity = '0.4';
                    tagBtn.style.fontSize = '9px';
                }

                author.parentNode.insertBefore(tagBtn, author.nextSibling);
            });
        },

        showTagPopup(username, event) {
            document.querySelectorAll('.rel-tag-popup').forEach(p => p.remove());

            const popup = Utils.createElement('div', { className: 'rel-tag-popup' });
            const existing = userTags[username] || { text: '', color: 'none' };

            popup.innerHTML = `
                <h4 style="margin:0 0 10px;font-size:14px;">Tag: ${Utils.escapeHTML(username)}</h4>
                <input type="text" class="rel-tag-text" placeholder="Tag text" value="${Utils.escapeHTML(existing.text)}" style="margin-bottom:8px;">
                <select class="rel-tag-color" style="margin-bottom:10px;">
                    ${Object.keys(this.tagColors).map(c => `<option value="${c}" ${existing.color === c ? 'selected' : ''}>${c}</option>`).join('')}
                </select>
                <div style="display:flex;gap:6px;">
                    <button class="rel-btn-small rel-btn-primary rel-tag-save">Save</button>
                    <button class="rel-btn-small rel-btn-danger rel-tag-remove">Remove</button>
                    <button class="rel-btn-small rel-btn-secondary rel-tag-cancel">Cancel</button>
                </div>
            `;

            popup.style.left = Math.min(event.clientX, window.innerWidth - 300) + 'px';
            popup.style.top = Math.min(event.clientY, window.innerHeight - 200) + 'px';

            // AbortController for clean listener cleanup
            const ac = new AbortController();
            const closePopup = () => { popup.remove(); ac.abort(); };

            popup.querySelector('.rel-tag-save').addEventListener('click', () => {
                const text = popup.querySelector('.rel-tag-text').value.trim();
                const color = popup.querySelector('.rel-tag-color').value;
                if (text) {
                    userTags[username] = { text, color };
                    saveUserTags();
                    this.updateAllTags(username);
                }
                closePopup();
            });

            popup.querySelector('.rel-tag-remove').addEventListener('click', () => {
                delete userTags[username];
                saveUserTags();
                this.updateAllTags(username);
                closePopup();
            });

            popup.querySelector('.rel-tag-cancel').addEventListener('click', closePopup);

            const textInput = popup.querySelector('.rel-tag-text');
            setTimeout(() => textInput.focus(), 50);
            textInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') popup.querySelector('.rel-tag-save').click();
                if (e.key === 'Escape') closePopup();
            });

            document.body.appendChild(popup);
            document.addEventListener('click', (e) => {
                if (!popup.contains(e.target) && !e.target.classList.contains('rel-user-tag')) {
                    closePopup();
                }
            }, { signal: ac.signal });
        },

        updateAllTags(username) {
            document.querySelectorAll('.author').forEach(author => {
                if (author.textContent === username) {
                    const tag = author.nextElementSibling;
                    if (tag && tag.classList.contains('rel-user-tag')) {
                        if (userTags[username]) {
                            tag.textContent = userTags[username].text;
                            const color = this.tagColors[userTags[username].color] || userTags[username].color;
                            tag.style.background = color;
                            tag.style.color = '#fff';
                            tag.style.opacity = '1';
                            tag.style.fontSize = '';
                        } else {
                            tag.textContent = '\u2605';
                            tag.style.background = 'transparent';
                            tag.style.opacity = '0.4';
                            tag.style.fontSize = '9px';
                        }
                    }
                }
            });
        }
    };

    // =========================================================================
    // IMAGE EXPANSION MODULE
    // =========================================================================
    const ImageExpansionModule = {
        imageHosts: {
            'i.redd.it': url => url,
            'preview.redd.it': url => url,
            'i.imgur.com': url => url,
            'imgur.com': url => {
                const m = url.match(/imgur\.com\/(?:a\/|gallery\/)?(\w+)/);
                return m ? `https://i.imgur.com/${m[1]}.jpg` : null;
            }
        },
        videoHosts: ['v.redd.it', 'gfycat.com', 'redgifs.com', 'streamable.com'],

        init() {
            if (!settings.inlineImageExpansion) return;
            this.process(document);
        },

        process(container) {
            if (!settings.inlineImageExpansion) return;
            const things = container.querySelectorAll('.thing.link:not([data-rel-expanded])');
            things.forEach(thing => {
                thing.setAttribute('data-rel-expanded', '1');
                const url = thing.getAttribute('data-url') || '';
                const entry = thing.querySelector('.entry');
                if (!entry) return;

                // Skip if Reddit already has a working expando
                const existingExpando = thing.querySelector('.expando-button');
                if (existingExpando && !existingExpando.classList.contains('collapsed')) return;

                const isImage = /\.(jpg|jpeg|png|gif|webp|bmp)(\?.*)?$/i.test(url) ||
                                Object.keys(this.imageHosts).some(h => url.includes(h));
                const isVideo = this.videoHosts.some(h => url.includes(h));
                const isGallery = url.includes('/gallery/') || thing.classList.contains('gallery');

                if (isImage || isVideo || isGallery) {
                    const label = isGallery ? '[+gallery]' : (isImage ? '[+img]' : '[+vid]');
                    const type = isGallery ? 'gallery' : (isImage ? 'image' : 'video');
                    const expandBtn = Utils.createElement('span', {
                        className: 'rel-button',
                        textContent: label,
                        style: { marginLeft: '4px' },
                        onClick: () => this.toggleExpand(thing, url, type, expandBtn)
                    });
                    const buttons = entry.querySelector('.flat-list.buttons');
                    if (buttons) buttons.prepend(expandBtn);
                }
            });
        },

        toggleExpand(thing, url, type, btn) {
            const existing = thing.querySelector('.rel-media-expando');
            if (existing) {
                existing.remove();
                btn.textContent = type === 'gallery' ? '[+gallery]' : (type === 'image' ? '[+img]' : '[+vid]');
                return;
            }

            const container = Utils.createElement('div', {
                className: 'rel-media-expando',
                style: { margin: '8px 0', maxWidth: '100%', overflow: 'hidden' }
            });

            if (type === 'image') {
                let imgUrl = url;
                for (const [host, resolver] of Object.entries(this.imageHosts)) {
                    if (url.includes(host)) { imgUrl = resolver(url) || url; break; }
                }
                const img = Utils.createElement('img', {
                    src: imgUrl, style: { maxWidth: '100%', maxHeight: '600px', cursor: 'pointer', borderRadius: '4px' },
                    onClick: () => window.open(imgUrl, '_blank')
                });
                img.addEventListener('error', () => { container.innerHTML = `<a href="${Utils.escapeHTML(url)}" target="_blank">[Image failed to load]</a>`; });

                // Drag to resize
                let startY, startH;
                img.addEventListener('mousedown', (e) => {
                    if (e.button !== 0) return;
                    e.preventDefault();
                    startY = e.clientY;
                    startH = img.offsetHeight;
                    const onMove = (e2) => {
                        img.style.maxHeight = 'none';
                        img.style.height = Math.max(50, startH + (e2.clientY - startY)) + 'px';
                    };
                    const onUp = () => {
                        document.removeEventListener('mousemove', onMove);
                        document.removeEventListener('mouseup', onUp);
                    };
                    document.addEventListener('mousemove', onMove);
                    document.addEventListener('mouseup', onUp);
                });
                container.appendChild(img);
            } else if (type === 'video') {
                // v.redd.it uses DASH - embed via Reddit's own player
                const fullname = thing.getAttribute('data-fullname') || '';
                if (url.includes('v.redd.it') && fullname) {
                    const postId = fullname.replace('t3_', '');
                    const iframe = document.createElement('iframe');
                    iframe.src = `https://www.redditmedia.com/${postId}?ref_source=embed&ref=share&embed=true&theme=dark`;
                    iframe.style.cssText = 'width:100%;max-width:640px;height:360px;border:none;border-radius:6px;';
                    iframe.setAttribute('allowfullscreen', '');
                    iframe.setAttribute('loading', 'lazy');
                    container.appendChild(iframe);
                } else {
                    container.innerHTML = `<video controls style="max-width:100%;max-height:500px;border-radius:4px;"><source src="${Utils.escapeHTML(url)}">Your browser does not support video.</video>`;
                }
            } else if (type === 'gallery') {
                this.loadGallery(thing, container);
            }

            const entry = thing.querySelector('.entry');
            entry.appendChild(container);
            btn.textContent = type === 'gallery' ? '[-gallery]' : (type === 'image' ? '[-img]' : '[-vid]');
        },

        async loadGallery(thing, container) {
            const t = Themes.getTheme();
            container.innerHTML = `<div style="padding:10px;color:${t.fgDim};font-size:12px;">Loading gallery...</div>`;
            try {
                const fullname = thing.getAttribute('data-fullname') || '';
                const postId = fullname.replace('t3_', '');
                if (!postId) throw new Error('No post ID');

                const resp = await fetch(`https://old.reddit.com/by_id/${fullname}.json`);
                const data = await resp.json();
                const post = data?.data?.children?.[0]?.data;
                if (!post) throw new Error('No post data');

                const galleryData = post.gallery_data?.items || [];
                const mediaMetadata = post.media_metadata || {};

                if (galleryData.length === 0) throw new Error('No gallery items');

                const images = galleryData.map(item => {
                    const meta = mediaMetadata[item.media_id];
                    if (!meta) return null;
                    // Get the highest resolution source
                    const src = meta.s;
                    if (!src) return null;
                    return {
                        url: (src.u || src.gif || '').replace(/&amp;/g, '&'),
                        width: src.x,
                        height: src.y,
                        caption: item.caption || ''
                    };
                }).filter(Boolean);

                if (images.length === 0) throw new Error('No images found');

                container.innerHTML = '';
                let currentIdx = 0;

                const viewer = document.createElement('div');
                viewer.style.cssText = 'position:relative;text-align:center;';

                const img = document.createElement('img');
                img.src = images[0].url;
                img.style.cssText = 'max-width:100%;max-height:600px;border-radius:6px;cursor:pointer;';
                img.addEventListener('click', () => window.open(images[currentIdx].url, '_blank'));
                viewer.appendChild(img);

                const counter = document.createElement('div');
                counter.style.cssText = `font-size:12px;color:${t.fgMuted};padding:6px 0;display:flex;align-items:center;justify-content:center;gap:12px;`;

                const updateView = () => {
                    img.src = images[currentIdx].url;
                    label.textContent = `${currentIdx + 1} / ${images.length}${images[currentIdx].caption ? ' - ' + images[currentIdx].caption : ''}`;
                };

                const prevBtn = document.createElement('button');
                prevBtn.textContent = '\u25C0 Prev';
                prevBtn.style.cssText = `padding:4px 10px;border-radius:4px;cursor:pointer;border:1px solid ${t.border};background:${t.surface};color:${t.fg};font-size:12px;`;
                prevBtn.addEventListener('click', () => { currentIdx = (currentIdx - 1 + images.length) % images.length; updateView(); });

                const label = document.createElement('span');
                label.textContent = `1 / ${images.length}`;

                const nextBtn = document.createElement('button');
                nextBtn.textContent = 'Next \u25B6';
                nextBtn.style.cssText = prevBtn.style.cssText;
                nextBtn.addEventListener('click', () => { currentIdx = (currentIdx + 1) % images.length; updateView(); });

                counter.appendChild(prevBtn);
                counter.appendChild(label);
                counter.appendChild(nextBtn);

                container.appendChild(viewer);
                container.appendChild(counter);
            } catch (e) {
                container.innerHTML = `<div style="padding:8px;color:${t.fgDim};font-size:12px;">Gallery could not be loaded. <a href="${Utils.escapeHTML(thing.getAttribute('data-url') || '#')}" target="_blank" style="color:${t.accent};">Open on Reddit</a></div>`;
            }
        }
    };

    // =========================================================================
    // NEVER ENDING REDDIT MODULE
    // =========================================================================
    const NeverEndingRedditModule = {
        currentPage: 1,
        loading: false,
        paused: false,

        init() {
            if (!settings.neverEndingReddit) return;
            if (!Utils.isListingPage()) return;

            this.nextPageUrl = this.getNextPageUrl();
            if (!this.nextPageUrl) return;

            window.addEventListener('scroll', Utils.throttle(() => {
                if (this.loading || this.paused) return;
                const scrollPos = window.innerHeight + window.scrollY;
                const docHeight = document.documentElement.scrollHeight;
                if (scrollPos >= docHeight - 1000) {
                    this.loadNextPage();
                }
            }, 300));
        },

        getNextPageUrl() {
            const next = document.querySelector('.next-button a');
            return next ? next.href : null;
        },

        async loadNextPage() {
            if (this.loading || !this.nextPageUrl) return;
            this.loading = true;

            // Check pause threshold
            if (settings.nerPauseAfterPages > 0 && this.currentPage >= settings.nerPauseAfterPages) {
                this.showPauseButton();
                return;
            }

            const loader = Utils.createElement('div', {
                className: 'rel-ner-marker',
                textContent: 'Loading page ' + (this.currentPage + 1) + '...'
            });
            const sitetable = document.querySelector('.sitetable.linklisting');
            if (!sitetable) { this.loading = false; return; }
            sitetable.appendChild(loader);

            try {
                const resp = await fetch(this.nextPageUrl);
                const html = await resp.text();
                const parser = new DOMParser();
                const doc = parser.parseFromString(html, 'text/html');
                const newPosts = doc.querySelectorAll('.sitetable.linklisting > .thing');

                this.currentPage++;
                loader.textContent = '\u2014 Page ' + this.currentPage + ' \u2014';

                newPosts.forEach(post => sitetable.appendChild(post));

                const nextBtn = doc.querySelector('.next-button a');
                this.nextPageUrl = nextBtn ? nextBtn.href : null;

                // Only process newly added posts, not the entire sitetable
                newPosts.forEach(post => Utils.processNewContent(post));
            } catch (e) {
                loader.textContent = 'Error loading next page. Click to retry.';
                loader.style.cursor = 'pointer';
                loader.addEventListener('click', () => {
                    loader.remove();
                    this.loading = false;
                    this.loadNextPage();
                });
            }
            this.loading = false;
        },

        showPauseButton() {
            const sitetable = document.querySelector('.sitetable.linklisting');
            if (!sitetable) return;
            const t = Themes.getTheme();
            const pauseDiv = Utils.createElement('div', {
                className: 'rel-ner-marker',
                style: { cursor: 'pointer', padding: '15px', fontSize: '14px' },
                innerHTML: `<strong>Paused after ${this.currentPage} pages.</strong> Click to load more.`,
                onClick: () => {
                    pauseDiv.remove();
                    this.currentPage = 0;
                    this.loading = false;
                    this.loadNextPage();
                }
            });
            sitetable.appendChild(pauseDiv);
        }
    };

    // =========================================================================
    // COLLAPSE CHILD COMMENTS MODULE
    // =========================================================================
    // =========================================================================
    // HIDE CHILD COMMENTS MODULE (RES-style)
    // =========================================================================
    const CollapseChildCommentsModule = {
        // Track global hide-all state for NER integration
        allChildrenHidden: false,
        pageToggleLink: null,

        init() {
            if (!settings.collapseChildComments) return;
            if (!Utils.isCommentsPage()) return;

            // Add page-wide toggle button to menuarea
            this.addPageToggle();

            // Process existing comments
            this.process(document);

            // Auto-hide on load if enabled
            if (settings.collapseChildCommentsDefault) {
                this.toggleAll(true);
            }
        },

        // Page-wide "hide all child comments" toggle in the comment area menubar
        addPageToggle() {
            const menuarea = document.querySelector('.commentarea .menuarea');
            if (!menuarea) return;
            if (menuarea.querySelector('.rel-toggle-all-children')) return;

            const sep = document.createTextNode(' | ');
            const link = Utils.createElement('a', {
                className: 'rel-toggle-all-children',
                href: 'javascript:void(0)',
                textContent: 'hide all child comments',
                title: 'Toggle visibility of all child comments (Shift+C)',
                onClick: (e) => {
                    e.preventDefault();
                    this.toggleAll(!this.allChildrenHidden);
                }
            });
            menuarea.appendChild(sep);
            menuarea.appendChild(link);
            this.pageToggleLink = link;
        },

        // Toggle ALL child comments on the page
        toggleAll(hide) {
            this.allChildrenHidden = hide;

            // Update page toggle text
            if (this.pageToggleLink) {
                this.pageToggleLink.textContent = hide ? 'show all child comments' : 'hide all child comments';
            }

            // Get all top-level comments
            const commentArea = document.querySelector('.commentarea > .sitetable.nestedlisting');
            if (!commentArea) return;

            const topLevelComments = commentArea.querySelectorAll(':scope > .thing.comment');
            topLevelComments.forEach(comment => {
                this.setChildVisibility(comment, hide, settings.collapseChildCommentsHideNested);
            });

            // If hideNested is enabled, also process nested comments
            if (hide && settings.collapseChildCommentsHideNested) {
                document.querySelectorAll('.thing.comment').forEach(comment => {
                    this.setChildVisibility(comment, true, true);
                });
            }
        },

        // Set visibility on a single comment's .child container
        setChildVisibility(comment, hide, recursive) {
            const childDiv = comment.querySelector(':scope > .child');
            if (!childDiv) return;
            const childComments = childDiv.querySelectorAll(':scope .comment');
            if (childComments.length === 0) return;

            childDiv.style.display = hide ? 'none' : '';

            // Update the per-comment toggle button if it exists
            const btn = comment.querySelector(':scope > .entry .rel-collapse-btn');
            if (btn) {
                const count = childDiv.querySelectorAll(':scope > .sitetable > .comment, :scope > .sitetable > .thing.comment').length || childComments.length;
                btn.textContent = hide ?
                    `[+] show ${count} ${count === 1 ? 'child' : 'children'}` :
                    `[\u2013] hide ${count} ${count === 1 ? 'child' : 'children'}`;
            }

            // Recursively process nested comments if requested
            if (recursive && hide) {
                childComments.forEach(nested => {
                    this.setChildVisibility(nested, true, true);
                });
            }
        },

        // Process new comments (initial load + NER)
        process(container) {
            if (!settings.collapseChildComments) return;
            const comments = container.querySelectorAll('.comment:not([data-rel-collapse])');
            comments.forEach(comment => {
                comment.setAttribute('data-rel-collapse', '1');
                const childDiv = comment.querySelector(':scope > .child');
                if (!childDiv || !childDiv.querySelector('.comment')) return;

                // Determine if this is a top-level comment
                const isTopLevel = comment.parentElement?.classList.contains('nestedlisting') &&
                    comment.parentElement?.parentElement?.classList.contains('commentarea');

                // Only add buttons to top-level by default, or all if nested option enabled
                if (!isTopLevel && !settings.collapseChildCommentsNested) return;

                const flatList = comment.querySelector(':scope > .entry .flat-list.buttons');
                if (!flatList || flatList.querySelector('.rel-collapse-btn')) return;

                const directChildren = childDiv.querySelectorAll(':scope > .sitetable > .comment, :scope > .sitetable > .thing.comment');
                const count = directChildren.length || childDiv.querySelectorAll('.comment').length;

                const btn = Utils.createElement('li', {});
                const link = Utils.createElement('a', {
                    className: 'rel-collapse-btn',
                    textContent: `[\u2013] hide ${count} ${count === 1 ? 'child' : 'children'}`,
                    href: 'javascript:void(0)',
                    onClick: (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const isHidden = childDiv.style.display === 'none';
                        childDiv.style.display = isHidden ? '' : 'none';
                        link.textContent = isHidden ?
                            `[\u2013] hide ${count} ${count === 1 ? 'child' : 'children'}` :
                            `[+] show ${count} ${count === 1 ? 'child' : 'children'}`;
                    }
                });
                btn.appendChild(link);
                flatList.appendChild(btn);

                // If auto-hide is active (either from default or from toggleAll), apply
                if (this.allChildrenHidden && isTopLevel) {
                    childDiv.style.display = 'none';
                    link.textContent = `[+] show ${count} ${count === 1 ? 'child' : 'children'}`;
                } else if (settings.collapseChildCommentsDefault && isTopLevel) {
                    childDiv.style.display = 'none';
                    link.textContent = `[+] show ${count} ${count === 1 ? 'child' : 'children'}`;
                }
            });
        }
    };

    // =========================================================================
    // COMMENT HIGHLIGHTING MODULE
    // =========================================================================
    const CommentHighlightingModule = {
        init() {
            if (!settings.commentHighlighting) return;
            if (!Utils.isCommentsPage()) return;
            this.process(document);
        },

        process(container) {
            if (!settings.commentHighlighting || !Utils.isCommentsPage()) return;
            const threadId = window.location.pathname.split('/')[4];
            if (!threadId) return;

            const lastVisit = visitedComments[threadId] || 0;
            const now = Date.now();

            const comments = container.querySelectorAll('.comment:not([data-rel-highlighted])');
            const t = Themes.getTheme();

            comments.forEach(comment => {
                comment.setAttribute('data-rel-highlighted', '1');
                const timeEl = comment.querySelector('time');
                if (!timeEl) return;
                const commentTime = new Date(timeEl.getAttribute('datetime')).getTime();
                if (commentTime > lastVisit && lastVisit > 0) {
                    const age = now - commentTime;
                    const maxAge = 3 * 24 * 60 * 60 * 1000;
                    const intensity = Math.max(0.05, Math.min(0.2, 0.2 * (1 - age / maxAge)));
                    const color = settings.darkMode ? t.accent : '#0079d3';
                    comment.style.borderLeft = `3px solid ${color}`;
                    // Convert hex or rgb to rgba
                    let rgba;
                    if (color.startsWith('#')) {
                        const r = parseInt(color.slice(1,3), 16), g = parseInt(color.slice(3,5), 16), b = parseInt(color.slice(5,7), 16);
                        rgba = `rgba(${r},${g},${b},${intensity})`;
                    } else if (color.startsWith('rgb')) {
                        rgba = color.replace(')', `,${intensity})`).replace('rgb(', 'rgba(');
                    } else {
                        rgba = color;
                    }
                    comment.style.backgroundColor = rgba;
                }
            });

            visitedComments[threadId] = now;

            // Clean old entries (>7 days)
            const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
            Object.keys(visitedComments).forEach(key => {
                if (visitedComments[key] < weekAgo) delete visitedComments[key];
            });
            saveVisitedComments();
        }
    };

    // =========================================================================
    // KEYBOARD NAVIGATION MODULE
    // =========================================================================
    const KeyboardNavModule = {
        currentIndex: -1,
        things: [],
        _dirty: true,

        init() {
            if (!settings.keyboardNav) return;
            this.updateThings();
            document.addEventListener('keydown', (e) => this.handleKey(e));
            // Invalidate cache when DOM changes (NER pages, expand thread, etc)
            new MutationObserver(() => { this._dirty = true; }).observe(
                document.querySelector('.sitetable') || document.body,
                { childList: true, subtree: true }
            );
        },

        updateThings() {
            if (!this._dirty) return;
            this.things = Array.from(document.querySelectorAll('.thing.link, .thing.comment'));
            this._dirty = false;
        },

        handleKey(e) {
            if (!settings.keyboardNav) return;
            // Ignore when typing in inputs
            if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
            if (e.target.isContentEditable) return;

            const key = e.key.toLowerCase();

            // Shift+C: Toggle all child comments (RES-style)
            if (e.shiftKey && key === 'c' && Utils.isCommentsPage()) {
                e.preventDefault();
                if (settings.collapseChildComments) {
                    CollapseChildCommentsModule.toggleAll(!CollapseChildCommentsModule.allChildrenHidden);
                }
                return;
            }

            // Don't process modified keys for other shortcuts (except Shift for ? help)
            if (e.ctrlKey || e.altKey || e.metaKey) return;
            if (e.shiftKey && key !== '?') return;

            switch (key) {
                case 'j': this.move(1); break;
                case 'k': this.move(-1); break;
                case 'a': this.vote('up'); break;
                case 'z': this.vote('down'); break;
                case 'x': this.expandMedia(); break;
                case 'enter': this.openLink(); break;
                case 'c': this.openComments(); break;
                case 'l': this.openLink(); break;
                case 'h': this.hidePost(); break;
                case 'r': this.replyToThing(); break;
                case '?': this.showHelp(); e.preventDefault(); break;
                case '.': this.showCommandLine(); e.preventDefault(); break;
                default: return;
            }
        },

        move(direction) {
            this.updateThings();
            if (this.things.length === 0) return;

            // Remove highlight from current
            if (this.currentIndex >= 0 && this.things[this.currentIndex]) {
                this.things[this.currentIndex].classList.remove('rel-selected-thing');
            }

            this.currentIndex = Math.max(0, Math.min(this.things.length - 1, this.currentIndex + direction));
            const thing = this.things[this.currentIndex];
            if (thing) {
                thing.classList.add('rel-selected-thing');
                thing.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        },

        vote(direction) {
            if (this.currentIndex < 0) return;
            const thing = this.things[this.currentIndex];
            if (!thing) return;
            const arrow = thing.querySelector(direction === 'up' ? '.arrow.up, .arrow.upmod' : '.arrow.down, .arrow.downmod');
            if (arrow) arrow.click();
            if (settings.autoHideAfterVote && thing.classList.contains('link')) {
                setTimeout(() => {
                    thing.style.opacity = '0.3';
                    thing.style.maxHeight = '40px';
                    thing.style.overflow = 'hidden';
                    thing.style.transition = 'all 0.3s';
                }, 300);
            }
        },

        expandMedia() {
            if (this.currentIndex < 0) return;
            const thing = this.things[this.currentIndex];
            if (!thing) return;
            const expandBtn = thing.querySelector('.expando-button, .rel-button');
            if (expandBtn) expandBtn.click();
        },

        openLink() {
            if (this.currentIndex < 0) return;
            const thing = this.things[this.currentIndex];
            if (!thing) return;
            const link = thing.querySelector('a.title') || thing.querySelector('.entry a');
            if (link) window.open(link.href, '_blank');
        },

        openComments() {
            if (this.currentIndex < 0) return;
            const thing = this.things[this.currentIndex];
            if (!thing) return;
            const comments = thing.querySelector('.comments, a[href*="/comments/"]');
            if (comments) window.open(comments.href, '_blank');
        },

        hidePost() {
            if (this.currentIndex < 0) return;
            const thing = this.things[this.currentIndex];
            if (!thing) return;
            const hideBtn = thing.querySelector('.hide-button a, form.hide-button .option');
            if (hideBtn) hideBtn.click();
        },

        replyToThing() {
            if (this.currentIndex < 0) return;
            const thing = this.things[this.currentIndex];
            if (!thing) return;
            const replyBtn = thing.querySelector('.flat-list a[onclick*="reply"]') ||
                             thing.querySelector('a.comments');
            if (replyBtn) replyBtn.click();
        },

        showHelp() {
            const existing = document.querySelector('.rel-kb-help-overlay');
            if (existing) { existing.remove(); return; }

            const overlay = Utils.createElement('div', {
                className: 'rel-kb-help-overlay rel-settings-overlay',
                onClick: (e) => { if (e.target === overlay) overlay.remove(); }
            });

            const t = Themes.getTheme();
            const panel = Utils.createElement('div', {
                className: 'rel-settings-panel',
                style: { maxWidth: '500px', padding: '20px' }
            });

            panel.innerHTML = `
                <h2 style="margin:0 0 16px;border-bottom:1px solid ${t.border};padding-bottom:10px;">Keyboard Shortcuts</h2>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;font-size:13px;">
                    <div><kbd style="background:${t.surface};padding:2px 6px;border-radius:3px;">j</kbd> / <kbd style="background:${t.surface};padding:2px 6px;border-radius:3px;">k</kbd> - Next / Previous</div>
                    <div><kbd style="background:${t.surface};padding:2px 6px;border-radius:3px;">a</kbd> / <kbd style="background:${t.surface};padding:2px 6px;border-radius:3px;">z</kbd> - Upvote / Downvote</div>
                    <div><kbd style="background:${t.surface};padding:2px 6px;border-radius:3px;">x</kbd> - Expand media</div>
                    <div><kbd style="background:${t.surface};padding:2px 6px;border-radius:3px;">Enter</kbd> / <kbd style="background:${t.surface};padding:2px 6px;border-radius:3px;">l</kbd> - Open link</div>
                    <div><kbd style="background:${t.surface};padding:2px 6px;border-radius:3px;">c</kbd> - Open comments</div>
                    <div><kbd style="background:${t.surface};padding:2px 6px;border-radius:3px;">h</kbd> - Hide post</div>
                    <div><kbd style="background:${t.surface};padding:2px 6px;border-radius:3px;">r</kbd> - Reply</div>
                    <div><kbd style="background:${t.surface};padding:2px 6px;border-radius:3px;">Shift</kbd>+<kbd style="background:${t.surface};padding:2px 6px;border-radius:3px;">C</kbd> - Hide/show all child comments</div>
                    <div><kbd style="background:${t.surface};padding:2px 6px;border-radius:3px;">.</kbd> - Command line</div>
                    <div><kbd style="background:${t.surface};padding:2px 6px;border-radius:3px;">?</kbd> - This help</div>
                </div>
                <p style="margin:12px 0 0;font-size:11px;opacity:0.5;">Press Escape or click outside to close</p>
            `;
            overlay.appendChild(panel);
            document.body.appendChild(overlay);
            document.addEventListener('keydown', function esc(e) {
                if (e.key === 'Escape') { overlay.remove(); document.removeEventListener('keydown', esc); }
            });
        },

        showCommandLine() {
            const existing = document.querySelector('.rel-command-line');
            if (existing) { existing.remove(); return; }

            const t = Themes.getTheme();
            const cl = Utils.createElement('div', {
                className: 'rel-command-line',
                style: {
                    position: 'fixed', top: '30%', left: '50%', transform: 'translateX(-50%)',
                    zIndex: '1000000', width: '500px', maxWidth: '90vw'
                }
            });
            const input = Utils.createElement('input', {
                type: 'text', className: 'rel-input',
                placeholder: '/r/subreddit, /u/user, or search...',
                style: {
                    width: '100%', fontSize: '16px', padding: '12px 16px',
                    borderRadius: '8px', boxShadow: `0 4px 20px ${t.shadow}`,
                    background: settings.darkMode ? t.bgLight : '#fff',
                    color: settings.darkMode ? t.fg : '#333',
                    border: `2px solid ${t.accent}`
                }
            });

            input.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') { cl.remove(); return; }
                if (e.key !== 'Enter') return;
                const val = input.value.trim();
                if (!val) return;
                if (val.startsWith('/r/')) {
                    window.location.href = `https://old.reddit.com${val}`;
                } else if (val.startsWith('/u/') || val.startsWith('u/')) {
                    window.location.href = `https://old.reddit.com/${val.startsWith('/') ? val : '/' + val}`;
                } else {
                    window.location.href = `https://old.reddit.com/search?q=${encodeURIComponent(val)}`;
                }
            });

            cl.appendChild(input);
            document.body.appendChild(cl);
            setTimeout(() => input.focus(), 50);

            document.addEventListener('click', function handler(e) {
                if (!cl.contains(e.target)) { cl.remove(); document.removeEventListener('click', handler); }
            });
        }
    };

    // =========================================================================
    // FILTER MODULE
    // =========================================================================
    const FilterModule = {
        init() {
            if (!settings.postFiltering) return;
            this.process(document);
        },

        process(container) {
            if (!settings.postFiltering) return;
            const things = container.querySelectorAll('.thing.link:not([data-rel-filtered])');
            if (things.length === 0) return;

            let hiddenCount = 0;
            things.forEach(thing => {
                thing.setAttribute('data-rel-filtered', '1');
                const data = Utils.getThingData(thing);
                if (!data) return;

                if (this.shouldFilter(data)) {
                    hiddenCount++;
                    // SAFETY: If we would hide ALL posts, something is wrong - abort
                    if (hiddenCount >= things.length) {
                        console.warn('REL FilterModule: Would hide ALL posts - aborting filter. Check your filter settings.');
                        container.querySelectorAll('.thing.link[data-rel-hidden]').forEach(t => {
                            t.style.display = '';
                            t.removeAttribute('data-rel-hidden');
                        });
                        return;
                    }
                    thing.style.display = 'none';
                    thing.setAttribute('data-rel-hidden', '1');
                }
            });

            // Also filter by ignored users
            if (ignoredUsers.length > 0) {
                const allThings = container.querySelectorAll('.thing:not([data-rel-ignore-checked])');
                allThings.forEach(thing => {
                    thing.setAttribute('data-rel-ignore-checked', '1');
                    const author = thing.getAttribute('data-author') || thing.querySelector('.author')?.textContent;
                    if (author && ignoredUsers.includes(author)) {
                        thing.classList.add('rel-ignored-user');
                    }
                });
            }
        },

        shouldFilter(data) {
            // NSFW filter
            if (filters.hideNSFW && data.isNSFW) return true;

            // Keyword filter
            const title = data.url ? document.querySelector(`[data-fullname="${data.id}"] a.title`)?.textContent || '' : '';
            for (const kw of (filters.keywords || [])) {
                if (kw.startsWith('/') && kw.endsWith('/')) {
                    try {
                        const regex = new RegExp(kw.slice(1, -1), 'i');
                        if (regex.test(title)) return true;
                    } catch (e) {}
                } else {
                    if (title.toLowerCase().includes(kw.toLowerCase())) return true;
                }
            }

            // Domain filter
            if (data.domain) {
                for (const d of (filters.domains || [])) {
                    if (data.domain.includes(d)) return true;
                }
            }

            // Subreddit filter
            if (data.subreddit) {
                for (const sr of (filters.subreddits || [])) {
                    if (data.subreddit.toLowerCase() === sr.toLowerCase()) return true;
                }
            }

            // Flair filter
            if (data.flair) {
                for (const f of (filters.flairs || [])) {
                    if (data.flair.toLowerCase().includes(f.toLowerCase())) return true;
                }
            }

            // User filter
            if (data.author) {
                for (const u of (filters.users || [])) {
                    if (data.author.toLowerCase() === u.toLowerCase()) return true;
                }
            }

            return false;
        }
    };

    // =========================================================================
    // HIDE AUTOMODERATOR MODULE
    // =========================================================================
    const HideAutoModeratorModule = {
        // Common bot/automod patterns
        botPatterns: [
            'automoderator', 'botdefense', 'assistantbot', 'remindmebot',
            'sneakpeekbot', 'wikisummarizerbot', 'fatfingerhelperbot',
            'repostsleuthbot', 'savevideo', 'haikibot', 'sub_doesnt_exist_bot'
        ],

        isBot(name) {
            if (!name) return false;
            const lower = name.toLowerCase();
            // Exact match against known bots
            if (this.botPatterns.includes(lower)) return true;
            // Suffix match for subreddit mod-bots (e.g. ClaudeAI-mod-bot)
            if (lower.endsWith('-mod-bot') || lower.endsWith('_mod_bot') || lower.endsWith('modbot')) return true;
            return false;
        },

        init() {
            if (!settings.hideAutoModerator) return;
            this.injectCSS();
            this.process(document);
        },

        injectCSS() {
            const t = Themes.getTheme();
            GM_addStyle(`
                .rel-automod-hidden > .entry > .usertext-body,
                .rel-automod-hidden > .entry > form > .usertext-body,
                .rel-automod-hidden > .child,
                .rel-automod-hidden > .entry > .flat-list {
                    display: none !important;
                }
                .rel-automod-label {
                    display: none;
                    font-size: 11px;
                    color: ${t.fgDim};
                    margin-left: 6px;
                    cursor: pointer;
                    font-style: italic;
                    opacity: 0.7;
                }
                .rel-automod-label:hover {
                    opacity: 1;
                    color: ${t.accent};
                    text-decoration: underline;
                }
                .rel-automod-hidden > .entry > .tagline .rel-automod-label {
                    display: inline !important;
                }
                .rel-automod-hidden > .entry {
                    opacity: 0.5 !important;
                    padding: 4px 10px !important;
                }
                .rel-automod-hidden > .entry:hover {
                    opacity: 0.8 !important;
                }
                .rel-automod-hidden > .midcol {
                    display: none !important;
                }
            `);
        },

        process(container) {
            if (!settings.hideAutoModerator) return;
            const comments = container.querySelectorAll('.comment:not([data-rel-automod])');
            comments.forEach(comment => {
                comment.setAttribute('data-rel-automod', '1');
                const authorName = comment.getAttribute('data-author') ||
                    comment.querySelector('.author')?.textContent;

                if (!this.isBot(authorName)) return;

                // Hide via our own class (no jQuery dependency)
                comment.classList.add('rel-automod-hidden');

                // Add toggle label to tagline
                const tagline = comment.querySelector('.tagline');
                if (tagline && !tagline.querySelector('.rel-automod-label')) {
                    const label = document.createElement('span');
                    label.className = 'rel-automod-label';
                    label.textContent = '[bot comment hidden - click to show]';
                    label.addEventListener('click', (e) => {
                        e.stopPropagation();
                        comment.classList.toggle('rel-automod-hidden');
                        label.textContent = comment.classList.contains('rel-automod-hidden')
                            ? '[bot comment hidden - click to show]'
                            : '[click to hide]';
                    });
                    tagline.appendChild(label);
                }
            });
        }
    };

    // =========================================================================
    // IGNORED USERS MODULE
    // =========================================================================
    const IgnoredUsersModule = {
        init() {
            if (!ignoredUsers.length) return;
            this.process(document);
        },

        process(container) {
            if (!ignoredUsers.length) return;
            const comments = container.querySelectorAll('.comment:not([data-rel-ignored])');
            const t = Themes.getTheme();
            comments.forEach(comment => {
                comment.setAttribute('data-rel-ignored', '1');
                const authorName = (comment.getAttribute('data-author') ||
                    comment.querySelector('.author')?.textContent || '').toLowerCase();
                if (!authorName || !ignoredUsers.some(u => u.toLowerCase() === authorName)) return;

                comment.classList.add('rel-ignored-user');
                const entry = comment.querySelector(':scope > .entry');
                const child = comment.querySelector(':scope > .child');
                if (entry) {
                    // Hide comment body and children
                    const body = entry.querySelector('.usertext-body') || entry.querySelector('form > .usertext-body');
                    if (body) body.style.display = 'none';
                    if (child) child.style.display = 'none';
                    const buttons = entry.querySelector('.flat-list.buttons');
                    if (buttons) buttons.style.display = 'none';
                    entry.style.opacity = '0.4';
                    entry.style.padding = '4px 10px';

                    const tagline = entry.querySelector('.tagline');
                    if (tagline && !tagline.querySelector('.rel-ignored-label')) {
                        const label = document.createElement('span');
                        label.className = 'rel-ignored-label';
                        label.textContent = '[ignored user - click to show]';
                        label.style.cssText = `font-size:11px;color:${t.fgDim};margin-left:6px;cursor:pointer;font-style:italic;opacity:0.7;`;
                        label.addEventListener('mouseenter', () => { label.style.opacity = '1'; label.style.color = t.accent; });
                        label.addEventListener('mouseleave', () => { label.style.opacity = '0.7'; label.style.color = t.fgDim; });
                        label.addEventListener('click', (e) => {
                            e.stopPropagation();
                            const isHidden = comment.classList.contains('rel-ignored-user');
                            comment.classList.toggle('rel-ignored-user');
                            if (isHidden) {
                                if (body) body.style.display = '';
                                if (child) child.style.display = '';
                                if (buttons) buttons.style.display = '';
                                entry.style.opacity = '';
                                entry.style.padding = '';
                                label.textContent = '[click to hide]';
                            } else {
                                if (body) body.style.display = 'none';
                                if (child) child.style.display = 'none';
                                if (buttons) buttons.style.display = 'none';
                                entry.style.opacity = '0.4';
                                entry.style.padding = '4px 10px';
                                label.textContent = '[ignored user - click to show]';
                            }
                        });
                        tagline.appendChild(label);
                    }
                }
            });
        }
    };

    // =========================================================================
    // YOUTUBE EMBED MODULE
    // =========================================================================
    const YouTubeEmbedModule = {
        init() {
            if (!settings.embedYouTube) return;
            this.process(document);
        },

        process(container) {
            if (!settings.embedYouTube) return;
            const links = container.querySelectorAll('.md a[href*="youtube.com"], .md a[href*="youtu.be"]');
            links.forEach(link => {
                if (link.getAttribute('data-rel-yt')) return;
                link.setAttribute('data-rel-yt', '1');

                const videoId = this.extractVideoId(link.href);
                if (!videoId) return;

                const btn = Utils.createElement('span', {
                    className: 'rel-button',
                    textContent: '[\u25B6 YT]',
                    style: { marginLeft: '4px', fontSize: '10px' },
                    onClick: (e) => {
                        e.preventDefault();
                        const existing = link.parentNode.querySelector('.rel-yt-embed');
                        if (existing) { existing.remove(); btn.textContent = '[\u25B6 YT]'; return; }
                        const iframe = Utils.createElement('div', {
                            className: 'rel-yt-embed',
                            innerHTML: `<iframe width="560" height="315" src="https://www.youtube-nocookie.com/embed/${videoId}" frameborder="0" allowfullscreen style="max-width:100%;border-radius:6px;margin:6px 0;"></iframe>`
                        });
                        link.parentNode.insertBefore(iframe, link.nextSibling);
                        btn.textContent = '[\u25BC YT]';
                    }
                });
                link.parentNode.insertBefore(btn, link.nextSibling);
            });
        },

        extractVideoId(url) {
            const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
            return m ? m[1] : null;
        }
    };

    // =========================================================================
    // REDDIT POST PREVIEW MODULE
    // =========================================================================
    const RedditPreviewModule = {
        cache: {},

        init() {
            if (!settings.embedRedditPreviews) return;
            this.process(document);
        },

        process(container) {
            if (!settings.embedRedditPreviews) return;
            const links = container.querySelectorAll('.md a[href*="reddit.com/r/"]:not([data-rel-preview])');
            links.forEach(link => {
                link.setAttribute('data-rel-preview', '1');
                // Only match post links
                if (!/\/comments\/\w+/.test(link.href) && !/\/r\/\w+\/s\//.test(link.href)) return;
                if (link.href === window.location.href) return;

                const btn = Utils.createElement('span', {
                    className: 'rel-button',
                    textContent: '[\u25B6 Preview]',
                    style: { marginLeft: '4px', fontSize: '10px' },
                    onClick: (e) => {
                        e.preventDefault();
                        const existing = link.parentNode.querySelector('.rel-reddit-preview');
                        if (existing) { existing.remove(); btn.textContent = '[\u25B6 Preview]'; return; }
                        this.loadPreview(link, btn);
                    }
                });
                link.parentNode.insertBefore(btn, link.nextSibling);
            });
        },

        async loadPreview(link, btn) {
            const t = Themes.getTheme();
            const url = link.href.split('?')[0];
            const jsonUrl = url.endsWith('/') ? url + '.json' : url + '/.json';

            try {
                const cacheKey = jsonUrl;
                let data = this.cache[cacheKey];
                if (!data) {
                    const resp = await fetch(jsonUrl, { headers: { 'Accept': 'application/json' } });
                    data = await resp.json();
                    this.cache[cacheKey] = data;
                }

                const post = data[0]?.data?.children?.[0]?.data;
                if (!post) return;

                const preview = Utils.createElement('div', {
                    className: 'rel-reddit-preview',
                    style: {
                        margin: '6px 0', padding: '10px', borderRadius: '6px',
                        border: `1px solid ${settings.darkMode ? t.border : '#ddd'}`,
                        background: settings.darkMode ? t.bgLight : '#f9f9f9',
                        fontSize: '12px', maxWidth: '600px'
                    }
                });

                preview.innerHTML = `
                    <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
                        <strong style="color:${settings.darkMode ? t.fg : '#333'}">${Utils.escapeHTML(post.title)}</strong>
                        <span style="color:${settings.darkMode ? t.fgDim : '#888'}">\u2B06 ${Utils.formatNumber(post.score)}</span>
                    </div>
                    <div style="color:${settings.darkMode ? t.fgDim : '#666'};font-size:11px;">
                        r/${Utils.escapeHTML(post.subreddit)} \u00B7 u/${Utils.escapeHTML(post.author)} \u00B7 ${post.num_comments} comments
                    </div>
                    ${post.selftext ? `<div style="margin-top:6px;color:${settings.darkMode ? t.fgMuted : '#444'};max-height:100px;overflow:hidden;">${Utils.escapeHTML(post.selftext.substring(0, 300))}${post.selftext.length > 300 ? '...' : ''}</div>` : ''}
                `;

                link.parentNode.insertBefore(preview, link.nextSibling.nextSibling || link.nextSibling);
                btn.textContent = '[\u25BC Preview]';
            } catch (e) {
                btn.textContent = '[Preview failed]';
            }
        }
    };

    // =========================================================================
    // INLINE IMAGE FIX MODULE
    // =========================================================================
    const InlineImageFixModule = {
        imagePatterns: [
            /\.(jpg|jpeg|png|gif|webp|bmp)(\?.*)?$/i,
            /i\.redd\.it\//i,
            /i\.imgur\.com\//i,
            /preview\.redd\.it\//i
        ],

        init() {
            if (!settings.inlineImageFix) return;
            this.process(document);
        },

        process(container) {
            if (!settings.inlineImageFix) return;
            const links = container.querySelectorAll('.md a:not([data-rel-imgfix])');
            links.forEach(link => {
                link.setAttribute('data-rel-imgfix', '1');
                const href = link.href;
                const isImage = this.imagePatterns.some(p => p.test(href));
                if (!isImage) return;

                // Check if link text is just a URL or image placeholder
                const text = link.textContent.trim();
                const isPlaceholder = /^(<?\s*)?(https?:\/\/|image|img|\[img\]|photo|pic)/i.test(text) || text === href;
                if (!isPlaceholder && !text.match(/\.(jpg|png|gif|webp)/i)) return;

                const container = Utils.createElement('div', {
                    style: { margin: '6px 0', display: 'inline-block' }
                });
                const img = Utils.createElement('img', {
                    src: href,
                    style: { maxWidth: '100%', maxHeight: '400px', borderRadius: '4px', cursor: 'pointer' },
                    onClick: () => window.open(href, '_blank'),
                    loading: 'lazy'
                });
                img.addEventListener('error', () => {
                    container.innerHTML = `<a href="${Utils.escapeHTML(href)}" target="_blank">${Utils.escapeHTML(text)}</a>`;
                });
                container.appendChild(img);
                link.parentNode.insertBefore(container, link.nextSibling);
                link.style.display = 'none';
            });
        }
    };

    // =========================================================================
    // SOCIAL MEDIA PREVIEW MODULE
    // =========================================================================
    const SocialMediaPreviewModule = {
        platforms: {
            twitter: { pattern: /(?:twitter\.com|x\.com)\/\w+\/status\/(\d+)/, label: 'Tweet' },
        },

        init() {
            if (!settings.embedSocialMedia) return;
            this.process(document);
        },

        process(container) {
            if (!settings.embedSocialMedia) return;
            const links = container.querySelectorAll('.md a:not([data-rel-social])');
            links.forEach(link => {
                link.setAttribute('data-rel-social', '1');
                for (const [platform, config] of Object.entries(this.platforms)) {
                    if (config.pattern.test(link.href)) {
                        const btn = Utils.createElement('span', {
                            className: 'rel-button',
                            textContent: `[\u25B6 ${config.label}]`,
                            style: { marginLeft: '4px', fontSize: '10px' },
                            onClick: (e) => {
                                e.preventDefault();
                                const existing = link.parentNode.querySelector('.rel-social-preview');
                                if (existing) { existing.remove(); return; }
                                const t = Themes.getTheme();
                                const preview = Utils.createElement('div', {
                                    className: 'rel-social-preview',
                                    style: {
                                        margin: '6px 0', padding: '10px', borderRadius: '6px',
                                        border: `1px solid ${settings.darkMode ? t.border : '#ddd'}`,
                                        background: settings.darkMode ? t.bgLight : '#f0f0f0',
                                        fontSize: '12px'
                                    },
                                    innerHTML: `<a href="${Utils.escapeHTML(link.href)}" target="_blank" style="color:${settings.darkMode ? t.accent : '#1da1f2'}">Open ${config.label} in new tab \u2197</a>`
                                });
                                link.parentNode.insertBefore(preview, link.nextSibling);
                            }
                        });
                        link.parentNode.insertBefore(btn, link.nextSibling);
                        break;
                    }
                }
            });
        }
    };

    // =========================================================================
    // COMMENT DEPTH INDICATORS MODULE
    // =========================================================================
    const CommentDepthModule = {
        colors: {
            rainbow: ['#ff5555','#ff79c6','#ffb86c','#f1fa8c','#50fa7b','#8be9fd','#bd93f9','#ff5555','#ff79c6','#ffb86c'],
            warm: ['#ff6b6b','#ee5a24','#f0932b','#ffbe76','#f9ca24','#ff6348','#eb4d4b','#e55039','#fa8231','#fed330'],
            cool: ['#70a1ff','#5352ed','#3742fa','#2ed573','#1e90ff','#7bed9f','#00d2d3','#54a0ff','#5f27cd','#01a3a4'],
            pastel: ['#ffa8a8','#fcc2d7','#eebefa','#d0bfff','#bac8ff','#a5d8ff','#99e9f2','#96f2d7','#b2f2bb','#ffec99']
        },

        init() {
            if (!settings.commentDepthIndicators) return;
            this.process(document);
        },

        process(container) {
            if (!settings.commentDepthIndicators) return;
            const comments = container.querySelectorAll('.comment:not([data-rel-depth])');
            comments.forEach(comment => {
                let depth = 0;
                let parent = comment.parentElement;
                while (parent) {
                    if (parent.classList && parent.classList.contains('comment')) depth++;
                    parent = parent.parentElement;
                }
                comment.setAttribute('data-rel-depth', depth);
                comment.classList.add('rel-depth-' + (depth % 10));

                // Apply dynamic color based on scheme
                const scheme = this.colors[settings.depthColorScheme] || this.colors.rainbow;
                const color = scheme[depth % scheme.length];
                const entry = comment.querySelector(':scope > .entry');
                if (entry) {
                    entry.style.borderLeft = `3px solid ${color}`;
                    entry.style.paddingLeft = '6px';
                }
            });
        }
    };

    // =========================================================================
    // COMMENT NAVIGATOR MODULE
    // =========================================================================
    const CommentNavigatorModule = {
        currentIndex: -1,
        mode: 'top', // 'top', 'new', 'op'
        comments: [],

        init() {
            if (!Utils.isCommentsPage()) return;
            this.buildUI();
        },

        buildUI() {
            const t = Themes.getTheme();
            const isDark = settings.darkMode && settings.theme !== 'light';

            const nav = document.createElement('div');
            nav.className = 'rel-comment-nav';
            nav.style.cssText = `position:fixed;right:10px;bottom:80px;z-index:99996;display:flex;flex-direction:column;gap:4px;opacity:0;pointer-events:none;transition:opacity 0.3s;`;

            const modes = [
                { id: 'top', label: 'Top', title: 'Navigate top-level comments' },
                { id: 'new', label: 'New', title: 'Navigate new/highlighted comments' },
                { id: 'op', label: 'OP', title: 'Navigate OP comments' }
            ];

            const modeRow = document.createElement('div');
            modeRow.style.cssText = 'display:flex;gap:2px;border-radius:6px;overflow:hidden;';
            modes.forEach(m => {
                const btn = document.createElement('button');
                btn.textContent = m.label;
                btn.title = m.title;
                btn.dataset.mode = m.id;
                btn.style.cssText = `padding:4px 8px;font-size:10px;font-weight:600;cursor:pointer;border:none;background:${m.id === this.mode ? t.accent : t.surface};color:${m.id === this.mode ? t.bg : t.fg};transition:all 0.15s;`;
                btn.addEventListener('click', () => {
                    this.mode = m.id;
                    this.currentIndex = -1;
                    this.updateComments();
                    modeRow.querySelectorAll('button').forEach(b => {
                        b.style.background = b.dataset.mode === m.id ? t.accent : t.surface;
                        b.style.color = b.dataset.mode === m.id ? t.bg : t.fg;
                    });
                    countLabel.textContent = `${this.comments.length} ${m.label.toLowerCase()}`;
                });
                modeRow.appendChild(btn);
            });
            nav.appendChild(modeRow);

            const countLabel = document.createElement('div');
            countLabel.style.cssText = `font-size:10px;text-align:center;color:${t.fgDim};padding:2px;`;
            nav.appendChild(countLabel);

            const btnRow = document.createElement('div');
            btnRow.style.cssText = 'display:flex;gap:4px;';

            const prevBtn = document.createElement('button');
            prevBtn.innerHTML = '\u25B2';
            prevBtn.title = 'Previous comment';
            prevBtn.style.cssText = `flex:1;padding:6px;border-radius:6px;cursor:pointer;border:1px solid ${t.border};background:${t.surface};color:${t.fg};font-size:12px;`;
            prevBtn.addEventListener('click', () => this.navigate(-1, countLabel));

            const nextBtn = document.createElement('button');
            nextBtn.innerHTML = '\u25BC';
            nextBtn.title = 'Next comment';
            nextBtn.style.cssText = prevBtn.style.cssText;
            nextBtn.addEventListener('click', () => this.navigate(1, countLabel));

            btnRow.appendChild(prevBtn);
            btnRow.appendChild(nextBtn);
            nav.appendChild(btnRow);

            document.body.appendChild(nav);

            // Show/hide based on scroll
            let visible = false;
            window.addEventListener('scroll', Utils.throttle(() => {
                const shouldShow = window.scrollY > 300;
                if (shouldShow !== visible) {
                    nav.style.opacity = shouldShow ? '1' : '0';
                    nav.style.pointerEvents = shouldShow ? 'auto' : 'none';
                    visible = shouldShow;
                }
            }, 200));

            this.updateComments();
            countLabel.textContent = `${this.comments.length} top`;
        },

        updateComments() {
            switch (this.mode) {
                case 'top':
                    this.comments = Array.from(document.querySelectorAll('.commentarea > .sitetable.nestedlisting > .comment'));
                    break;
                case 'new':
                    this.comments = Array.from(document.querySelectorAll('.comment[style*="border-left: 3px"]'));
                    break;
                case 'op':
                    this.comments = Array.from(document.querySelectorAll('.comment:has(.author.submitter)'));
                    break;
            }
        },

        navigate(direction, label) {
            this.updateComments();
            if (this.comments.length === 0) return;
            this.currentIndex = Math.max(0, Math.min(this.comments.length - 1, this.currentIndex + direction));
            const comment = this.comments[this.currentIndex];
            if (comment) {
                comment.scrollIntoView({ behavior: 'smooth', block: 'start' });
                // Brief highlight flash
                const entry = comment.querySelector(':scope > .entry');
                if (entry) {
                    const t = Themes.getTheme();
                    entry.style.outline = `2px solid ${t.accent}`;
                    setTimeout(() => { entry.style.outline = ''; }, 1500);
                }
            }
            if (label) label.textContent = `${this.currentIndex + 1}/${this.comments.length}`;
        }
    };

    // =========================================================================
    // COMMENT SEARCH MODULE
    // =========================================================================
    const CommentSearchModule = {
        init() {
            if (!Utils.isCommentsPage()) return;
            this.addSearchButton();
        },

        addSearchButton() {
            const menuarea = document.querySelector('.commentarea .menuarea');
            if (!menuarea) return;
            const t = Themes.getTheme();
            const btn = document.createElement('span');
            btn.className = 'rel-comment-search-btn';
            btn.textContent = '\uD83D\uDD0D Search Comments';
            btn.title = 'Search within comments';
            btn.style.cssText = `cursor:pointer;font-size:12px;color:${t.accent};margin-left:10px;font-weight:500;`;
            btn.addEventListener('click', () => this.showSearchBar());
            menuarea.appendChild(btn);
        },

        showSearchBar() {
            let existing = document.querySelector('.rel-comment-search-bar');
            if (existing) { existing.remove(); return; }

            const t = Themes.getTheme();
            const bar = document.createElement('div');
            bar.className = 'rel-comment-search-bar';
            bar.style.cssText = `position:sticky;top:0;z-index:99998;padding:8px 14px;display:flex;align-items:center;gap:8px;background:${t.bgLight};border-bottom:1px solid ${t.border};box-shadow:0 2px 8px ${t.shadow};`;

            const input = document.createElement('input');
            input.type = 'text';
            input.placeholder = 'Search comments...';
            input.style.cssText = `flex:1;padding:6px 10px;border-radius:6px;border:1px solid ${t.border};background:${t.inputBg};color:${t.inputFg};font-size:13px;font-family:inherit;`;

            const countSpan = document.createElement('span');
            countSpan.style.cssText = `font-size:12px;color:${t.fgDim};white-space:nowrap;min-width:60px;`;

            const closeBtn = document.createElement('button');
            closeBtn.textContent = '\u2715';
            closeBtn.style.cssText = `background:none;border:none;color:${t.fgDim};font-size:16px;cursor:pointer;padding:4px;`;
            closeBtn.addEventListener('click', () => { this.clearHighlights(); bar.remove(); });

            bar.appendChild(input);
            bar.appendChild(countSpan);
            bar.appendChild(closeBtn);

            const commentarea = document.querySelector('.commentarea');
            if (commentarea) commentarea.insertBefore(bar, commentarea.firstChild);

            input.focus();
            let currentMatch = -1;
            let matches = [];

            const doSearch = () => {
                this.clearHighlights();
                const query = input.value.trim().toLowerCase();
                if (!query || query.length < 2) { countSpan.textContent = ''; matches = []; return; }

                matches = [];
                document.querySelectorAll('.comment .md').forEach(md => {
                    if (md.textContent.toLowerCase().includes(query)) {
                        matches.push(md);
                        md.classList.add('rel-search-match');
                        md.style.outline = `2px solid ${t.accent}`;
                        md.style.outlineOffset = '2px';
                        md.style.borderRadius = '4px';
                        // Ensure parent comments are uncollapsed
                        let parent = md.closest('.comment');
                        while (parent) {
                            if (parent.classList.contains('collapsed')) {
                                parent.classList.remove('collapsed');
                                parent.classList.add('noncollapsed');
                            }
                            const childDiv = parent.closest('.child');
                            if (childDiv && childDiv.style.display === 'none') childDiv.style.display = '';
                            parent = childDiv?.closest('.comment');
                        }
                    }
                });
                countSpan.textContent = matches.length ? `${matches.length} found` : 'No results';
                currentMatch = -1;
            };

            input.addEventListener('input', Utils.debounce(doSearch, 250));
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') { this.clearHighlights(); bar.remove(); return; }
                if (e.key === 'Enter' && matches.length > 0) {
                    currentMatch = (currentMatch + 1) % matches.length;
                    matches[currentMatch].scrollIntoView({ behavior: 'smooth', block: 'center' });
                    countSpan.textContent = `${currentMatch + 1}/${matches.length}`;
                }
            });
        },

        clearHighlights() {
            document.querySelectorAll('.rel-search-match').forEach(el => {
                el.classList.remove('rel-search-match');
                el.style.outline = '';
                el.style.outlineOffset = '';
            });
        }
    };

    // =========================================================================
    // FORMATTING TOOLBAR MODULE
    // =========================================================================
    const FormattingToolbarModule = {
        init() {
            if (!settings.formattingToolbar) return;
            this.process(document);
        },

        process(container) {
            if (!settings.formattingToolbar) return;
            const textareas = container.querySelectorAll('.usertext-edit textarea:not([data-rel-toolbar])');
            textareas.forEach(ta => {
                ta.setAttribute('data-rel-toolbar', '1');
                const edit = ta.closest('.usertext-edit');
                if (!edit) return;

                const toolbar = Utils.createElement('div', { className: 'rel-format-bar' });

                const buttons = [
                    { label: 'B', title: 'Bold (Ctrl+B)', wrap: ['**', '**'] },
                    { label: 'I', title: 'Italic (Ctrl+I)', wrap: ['*', '*'] },
                    { label: '~~', title: 'Strikethrough', wrap: ['~~', '~~'] },
                    { label: 'sup', title: 'Superscript', wrap: ['^(', ')'] },
                    { type: 'sep' },
                    { label: '\u{1F517}', title: 'Link', action: 'link' },
                    { label: '""', title: 'Quote', action: 'quote' },
                    { label: '<>', title: 'Code', wrap: ['`', '`'] },
                    { label: '{}', title: 'Code Block', action: 'codeblock' },
                    { type: 'sep' },
                    { label: '\u2022', title: 'Bullet List', action: 'bullet' },
                    { label: '1.', title: 'Numbered List', action: 'number' },
                    { label: 'H', title: 'Heading', wrap: ['\n## ', '\n'] },
                    { label: '\u2014', title: 'Horizontal Rule', action: 'hr' },
                    { type: 'sep' },
                    { label: '\u2318', title: 'Macros', action: 'macros' },
                    { label: '\u{1F441}', title: 'Toggle Preview', action: 'preview' }
                ];

                buttons.forEach(b => {
                    if (b.type === 'sep') {
                        toolbar.appendChild(Utils.createElement('div', { className: 'rel-format-sep' }));
                        return;
                    }
                    const btn = Utils.createElement('button', {
                        className: 'rel-format-btn',
                        textContent: b.label,
                        title: b.title,
                        type: 'button',
                        onClick: (e) => {
                            e.preventDefault();
                            if (b.wrap) this.wrapSelection(ta, b.wrap[0], b.wrap[1]);
                            else if (b.action) this.doAction(ta, b.action, e);
                        }
                    });
                    toolbar.appendChild(btn);
                });

                try { ta.before(toolbar); } catch(e) { edit.prepend(toolbar); }

                // Live preview
                if (settings.livePreview) {
                    const preview = Utils.createElement('div', { className: 'rel-live-preview' });
                    edit.appendChild(preview);
                    ta.addEventListener('input', Utils.debounce(() => {
                        if (preview.classList.contains('active')) {
                            preview.innerHTML = this.renderMarkdown(ta.value);
                        }
                    }, 300));
                }

                // Ctrl+B, Ctrl+I shortcuts
                ta.addEventListener('keydown', (e) => {
                    if (e.ctrlKey || e.metaKey) {
                        if (e.key === 'b') { e.preventDefault(); this.wrapSelection(ta, '**', '**'); }
                        if (e.key === 'i') { e.preventDefault(); this.wrapSelection(ta, '*', '*'); }
                    }
                });
            });
        },

        wrapSelection(ta, before, after) {
            const start = ta.selectionStart;
            const end = ta.selectionEnd;
            const selected = ta.value.substring(start, end) || 'text';
            const newText = before + selected + after;
            ta.setRangeText(newText, start, end, 'select');
            ta.focus();
            ta.dispatchEvent(new Event('input'));
        },

        doAction(ta, action, event) {
            switch (action) {
                case 'link': {
                    const selected = ta.value.substring(ta.selectionStart, ta.selectionEnd) || 'link text';
                    this.wrapSelection(ta, '[', `](https://)`);
                    break;
                }
                case 'quote':
                    this.wrapSelection(ta, '\n> ', '\n');
                    break;
                case 'codeblock':
                    this.wrapSelection(ta, '\n    ', '\n');
                    break;
                case 'bullet': {
                    const selected = ta.value.substring(ta.selectionStart, ta.selectionEnd);
                    const lines = selected ? selected.split('\n').map(l => '* ' + l).join('\n') : '* item';
                    ta.setRangeText('\n' + lines + '\n', ta.selectionStart, ta.selectionEnd, 'end');
                    ta.dispatchEvent(new Event('input'));
                    break;
                }
                case 'number': {
                    const selected = ta.value.substring(ta.selectionStart, ta.selectionEnd);
                    const lines = selected ? selected.split('\n').map((l, i) => `${i + 1}. ${l}`).join('\n') : '1. item';
                    ta.setRangeText('\n' + lines + '\n', ta.selectionStart, ta.selectionEnd, 'end');
                    ta.dispatchEvent(new Event('input'));
                    break;
                }
                case 'hr':
                    ta.setRangeText('\n\n---\n\n', ta.selectionStart, ta.selectionEnd, 'end');
                    ta.dispatchEvent(new Event('input'));
                    break;
                case 'macros':
                    this.showMacroMenu(ta, event);
                    break;
                case 'preview': {
                    const preview = ta.closest('.usertext-edit').querySelector('.rel-live-preview');
                    if (preview) {
                        preview.classList.toggle('active');
                        if (preview.classList.contains('active')) {
                            preview.innerHTML = this.renderMarkdown(ta.value);
                        }
                    }
                    break;
                }
            }
        },

        showMacroMenu(ta, event) {
            document.querySelectorAll('.rel-macro-menu').forEach(m => m.remove());
            const menu = Utils.createElement('div', { className: 'rel-macro-menu' });
            menu.style.left = event.clientX + 'px';
            menu.style.top = event.clientY + 'px';

            commentMacros.forEach(macro => {
                const item = Utils.createElement('button', {
                    className: 'rel-macro-item',
                    textContent: macro.name,
                    onClick: () => {
                        let text = macro.text;
                        const sr = Utils.isSubreddit();
                        text = text.replace(/\{\{subreddit\}\}/g, sr || '');
                        text = text.replace(/\{\{selected\}\}/g, ta.value.substring(ta.selectionStart, ta.selectionEnd));
                        ta.setRangeText(text, ta.selectionStart, ta.selectionEnd, 'end');
                        ta.dispatchEvent(new Event('input'));
                        menu.remove();
                    }
                });
                menu.appendChild(item);
            });

            document.body.appendChild(menu);
            document.addEventListener('click', function handler(e) {
                if (!menu.contains(e.target)) { menu.remove(); document.removeEventListener('click', handler); }
            });
        },

        renderMarkdown(text) {
            // Simple markdown rendering
            let html = Utils.escapeHTML(text);
            // Bold
            html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
            // Italic
            html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
            // Strikethrough
            html = html.replace(/~~(.+?)~~/g, '<del>$1</del>');
            // Code
            html = html.replace(/`(.+?)`/g, '<code style="background:rgba(128,128,128,0.2);padding:1px 4px;border-radius:2px;">$1</code>');
            // Headings
            html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
            html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
            html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');
            // Links
            html = html.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>');
            // Quotes
            html = html.replace(/^&gt; (.+)$/gm, '<blockquote style="border-left:3px solid #666;padding-left:8px;margin:4px 0;opacity:0.8;">$1</blockquote>');
            // HR
            html = html.replace(/^---$/gm, '<hr>');
            // Newlines
            html = html.replace(/\n/g, '<br>');
            return html;
        }
    };

    // =========================================================================
    // SINGLE CLICK OPENER MODULE
    // =========================================================================
    const SingleClickModule = {
        init() { if (settings.singleClickOpener) this.process(document); },
        process(container) {
            if (!settings.singleClickOpener) return;
            const things = container.querySelectorAll('.thing.link:not([data-rel-sco])');
            things.forEach(thing => {
                thing.setAttribute('data-rel-sco', '1');
                const buttons = thing.querySelector('.flat-list.buttons');
                if (!buttons) return;

                const titleLink = thing.querySelector('a.title');
                const commentsLink = thing.querySelector('a.comments, .flat-list a.bylink');
                if (!titleLink || !commentsLink) return;

                const sco = Utils.createElement('li', { className: 'rel-sco' });
                sco.innerHTML = `<a href="javascript:void(0)" title="Open link + comments in new tabs">[l+c]</a>`;
                sco.querySelector('a').addEventListener('click', (e) => {
                    e.preventDefault();
                    window.open(titleLink.href, '_blank');
                    window.open(commentsLink.href, '_blank');
                });
                buttons.appendChild(sco);
            });
        }
    };

    // =========================================================================
    // USER HIGHLIGHTER MODULE
    // =========================================================================
    const UserHighlighterModule = {
        init() { if (settings.userHighlighter) this.process(document); },
        process(container) {
            if (!settings.userHighlighter) return;
            const authors = container.querySelectorAll('.author:not([data-rel-highlight])');
            authors.forEach(author => {
                author.setAttribute('data-rel-highlight', '1');
                if (author.classList.contains('submitter')) author.classList.add('rel-user-op');
                if (author.classList.contains('moderator')) author.classList.add('rel-user-mod');
                if (author.classList.contains('admin')) author.classList.add('rel-user-admin');
                if (author.classList.contains('friend')) author.classList.add('rel-user-friend');
            });
        }
    };

    // =========================================================================
    // TIMESTAMP MODULE
    // =========================================================================
    const TimestampModule = {
        init() { if (settings.showTimestamps) this.process(document); },
        process(container) {
            if (!settings.showTimestamps) return;
            const times = container.querySelectorAll('time:not([data-rel-timestamp])');
            times.forEach(time => {
                time.setAttribute('data-rel-timestamp', '1');
                const dt = time.getAttribute('datetime');
                if (dt) {
                    const date = new Date(dt);
                    time.title = date.toLocaleString() + ' (' + Utils.timeAgo(dt) + ')';
                }
            });
        }
    };

    // =========================================================================
    // EXPAND CONTINUE THREAD MODULE
    // =========================================================================
    const ExpandThreadModule = {
        init() { if (settings.expandContinueThread) this.process(document); },
        process(container) {
            if (!settings.expandContinueThread) return;
            const moreLinks = container.querySelectorAll('.morecomments a:not([data-rel-expand])');
            moreLinks.forEach(link => {
                link.setAttribute('data-rel-expand', '1');
                if (!link.textContent.includes('continue this thread')) return;

                const expandBtn = Utils.createElement('span', {
                    className: 'rel-expand-thread',
                    textContent: '[load inline]',
                    onClick: async (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        expandBtn.textContent = '[loading...]';
                        try {
                            const resp = await fetch(link.href);
                            const html = await resp.text();
                            const parser = new DOMParser();
                            const doc = parser.parseFromString(html, 'text/html');
                            const newComments = doc.querySelector('.commentarea .sitetable');
                            if (newComments) {
                                const parent = link.closest('.morecomments') || link.closest('.child');
                                if (parent) {
                                    const wrapper = Utils.createElement('div', { className: 'rel-expanded-thread' });
                                    wrapper.innerHTML = newComments.innerHTML;
                                    parent.parentNode.insertBefore(wrapper, parent.nextSibling);
                                    Utils.processNewContent(wrapper);
                                    expandBtn.textContent = '[loaded]';
                                    link.style.display = 'none';
                                }
                            } else {
                                expandBtn.textContent = '[no comments]';
                            }
                        } catch (err) {
                            expandBtn.textContent = '[error]';
                        }
                    }
                });
                link.parentNode.insertBefore(expandBtn, link.nextSibling);
            });
        }
    };

    // =========================================================================
    // VOTE ENHANCEMENTS MODULE
    // =========================================================================
    const VoteEnhancementsModule = {
        init() {
            if (settings.voteEnhancements) {
                this.injectCSS();
                this.process(document);
            }
        },

        injectCSS() {
            const t = Themes.getTheme();
            GM_addStyle(`
                @keyframes rel-vote-bounce {
                    0% { transform: scale(1); }
                    30% { transform: scale(1.6); }
                    50% { transform: scale(0.85); }
                    70% { transform: scale(1.15); }
                    100% { transform: scale(1); }
                }
                @keyframes rel-vote-particle {
                    0% { opacity: 1; transform: translate(var(--vx), var(--vy)) scale(1); }
                    100% { opacity: 0; transform: translate(calc(var(--vx) * 3.5), calc(var(--vy) * 3.5)) scale(0); }
                }
                @keyframes rel-vote-ring {
                    0% { opacity: 0.6; transform: translate(-50%, -50%) scale(0.3); }
                    100% { opacity: 0; transform: translate(-50%, -50%) scale(2.2); }
                }
                @keyframes rel-vote-flash {
                    0% { opacity: 0.5; }
                    100% { opacity: 0; }
                }
                .rel-vote-burst {
                    position: absolute; pointer-events: none; z-index: 99999;
                }
                .rel-vote-particle {
                    position: absolute; border-radius: 50%;
                    animation: rel-vote-particle 0.6s cubic-bezier(.25,.8,.25,1) forwards;
                }
                .rel-vote-ring {
                    position: absolute; top: 50%; left: 50%;
                    width: 30px; height: 30px; border-radius: 50%;
                    border: 2px solid currentColor; background: none;
                    animation: rel-vote-ring 0.5s ease-out forwards;
                    pointer-events: none;
                }
                .rel-vote-flash {
                    position: absolute; top: 50%; left: 50%;
                    width: 20px; height: 20px; border-radius: 50%;
                    transform: translate(-50%, -50%);
                    animation: rel-vote-flash 0.3s ease-out forwards;
                    pointer-events: none;
                }
                .arrow.rel-vote-anim {
                    animation: rel-vote-bounce 0.4s cubic-bezier(.25,.8,.25,1) !important;
                }
            `);
        },

        spawnBurst(arrow, direction) {
            const t = Themes.getTheme();
            const colors = direction === 'up'
                ? [t.upvote, '#ffb74d', '#fff176', '#ff8a65']
                : [t.downvote, '#64b5f6', '#81c784', '#4dd0e1'];

            const rect = arrow.getBoundingClientRect();
            const cx = rect.left + rect.width / 2;
            const cy = rect.top + rect.height / 2;

            const burst = document.createElement('div');
            burst.className = 'rel-vote-burst';
            burst.style.cssText = `position:fixed;left:${cx}px;top:${cy}px;width:0;height:0;`;

            // Ring
            const ring = document.createElement('div');
            ring.className = 'rel-vote-ring';
            ring.style.color = colors[0];
            ring.style.borderColor = colors[0];
            burst.appendChild(ring);

            // Flash
            const flash = document.createElement('div');
            flash.className = 'rel-vote-flash';
            flash.style.background = `radial-gradient(circle, ${colors[0]}80, transparent)`;
            burst.appendChild(flash);

            // Particles
            const count = 8;
            for (let i = 0; i < count; i++) {
                const angle = (i / count) * Math.PI * 2 + (Math.random() * 0.4 - 0.2);
                const dist = 8 + Math.random() * 6;
                const vx = Math.cos(angle) * dist;
                const vy = Math.sin(angle) * dist - (direction === 'up' ? 4 : -4);
                const p = document.createElement('div');
                p.className = 'rel-vote-particle';
                const size = 3 + Math.random() * 3;
                p.style.cssText = `
                    width:${size}px;height:${size}px;
                    background:${colors[Math.floor(Math.random() * colors.length)]};
                    --vx:${vx}px;--vy:${vy}px;
                    animation-delay:${Math.random() * 0.08}s;
                    box-shadow: 0 0 ${size}px ${colors[0]}80;
                `;
                burst.appendChild(p);
            }

            document.body.appendChild(burst);

            // Bounce the arrow
            arrow.classList.remove('rel-vote-anim');
            void arrow.offsetWidth;
            arrow.classList.add('rel-vote-anim');

            setTimeout(() => {
                burst.remove();
                arrow.classList.remove('rel-vote-anim');
            }, 700);
        },

        // Native vote handler - toggles visual state and submits vote via fetch
        castVote(thing, direction) {
            const fullname = thing.getAttribute('data-fullname');
            if (!fullname) return;

            const midcol = thing.querySelector(':scope > .midcol');
            const entry = thing.querySelector(':scope > .entry');
            const upArrow = thing.querySelector(':scope > .midcol .arrow.up, :scope > .midcol .arrow.upmod');
            const downArrow = thing.querySelector(':scope > .midcol .arrow.down, :scope > .midcol .arrow.downmod');

            // Determine current state
            const wasUpvoted = upArrow && upArrow.classList.contains('upmod');
            const wasDownvoted = downArrow && downArrow.classList.contains('downmod');

            let dir = 0; // 0 = unvote, 1 = upvote, -1 = downvote
            if (direction === 'up') {
                dir = wasUpvoted ? 0 : 1; // Toggle: if already upvoted, unvote
            } else {
                dir = wasDownvoted ? 0 : -1; // Toggle: if already downvoted, unvote
            }

            // Update arrow classes
            if (upArrow) {
                upArrow.classList.toggle('up', dir !== 1);
                upArrow.classList.toggle('upmod', dir === 1);
            }
            if (downArrow) {
                downArrow.classList.toggle('down', dir !== -1);
                downArrow.classList.toggle('downmod', dir === -1);
            }

            // Update thing/entry/midcol vote state classes
            [thing, entry, midcol].forEach(el => {
                if (!el) return;
                el.classList.toggle('unvoted', dir === 0);
                el.classList.toggle('likes', dir === 1);
                el.classList.toggle('dislikes', dir === -1);
            });

            // Submit vote to Reddit API
            const modhash = document.querySelector('input[name="uh"]')?.value
                || (typeof unsafeWindow !== 'undefined' && unsafeWindow?.reddit?.modhash)
                || '';
            const form = new URLSearchParams({ id: fullname, dir: dir, uh: modhash });
            fetch('/api/vote', {
                method: 'POST',
                credentials: 'same-origin',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: form.toString()
            }).catch(() => {}); // Silent fail - visual state already updated
        },

        process(container) {
            if (!settings.voteEnhancements) return;
            const t = Themes.getTheme();

            // Color-code scores
            const scores = container.querySelectorAll('.score:not([data-rel-vote])');
            scores.forEach(score => {
                score.setAttribute('data-rel-vote', '1');
                const val = parseInt(score.title || score.textContent);
                if (isNaN(val)) return;
                if (val > 100) score.style.color = t.success;
                else if (val > 50) score.style.color = t.accent;
                else if (val < -5) score.style.color = t.error;
            });

            // Vote weight tracking
            const things = container.querySelectorAll('.thing:not([data-rel-vw])');
            things.forEach(thing => {
                thing.setAttribute('data-rel-vw', '1');
                const author = thing.getAttribute('data-author') || thing.querySelector('.author')?.textContent;
                if (!author) return;

                // Display existing vote weight
                if (voteWeights[author]) {
                    const weight = voteWeights[author];
                    const badge = Utils.createElement('span', {
                        className: 'rel-vote-weight',
                        textContent: `[${weight > 0 ? '+' : ''}${weight}]`,
                        style: {
                            color: weight > 0 ? t.success : t.error,
                            background: weight > 0 ? 'rgba(80,250,123,0.1)' : 'rgba(255,85,85,0.1)'
                        }
                    });
                    const tagline = thing.querySelector(':scope > .entry .tagline');
                    if (tagline) tagline.appendChild(badge);
                }

                // Track votes
                const upArrow = thing.querySelector(':scope > .entry .arrow.up, :scope > .entry .arrow.upmod, :scope > .midcol .arrow.up, :scope > .midcol .arrow.upmod');
                const downArrow = thing.querySelector(':scope > .entry .arrow.down, :scope > .entry .arrow.downmod, :scope > .midcol .arrow.down, :scope > .midcol .arrow.downmod');

                if (upArrow) {
                    upArrow.addEventListener('click', (e) => {
                        e.preventDefault();
                        e.stopImmediatePropagation();
                        if (!voteWeights[author]) voteWeights[author] = 0;
                        const wasUp = upArrow.classList.contains('upmod');
                        // Toggle off = undo previous upvote; toggle on = new upvote
                        voteWeights[author] += wasUp ? -1 : 1;
                        if (voteWeights[author] === 0) delete voteWeights[author];
                        saveVoteWeights();
                        this.castVote(thing, 'up');
                        if (!wasUp) this.spawnBurst(upArrow, 'up');
                    }, true);
                }
                if (downArrow) {
                    downArrow.addEventListener('click', (e) => {
                        e.preventDefault();
                        e.stopImmediatePropagation();
                        if (!voteWeights[author]) voteWeights[author] = 0;
                        const wasDown = downArrow.classList.contains('downmod');
                        voteWeights[author] += wasDown ? 1 : -1;
                        if (voteWeights[author] === 0) delete voteWeights[author];
                        saveVoteWeights();
                        this.castVote(thing, 'down');
                        if (!wasDown) this.spawnBurst(downArrow, 'down');
                    }, true);
                }
            });
        }
    };

    // =========================================================================
    // PAGE NAVIGATOR MODULE
    // =========================================================================
    const PageNavigatorModule = {
        init() {
            if (!settings.pageNavigator) return;
            const t = Themes.getTheme();
            const nav = Utils.createElement('div', { className: 'rel-page-nav' });

            const topBtn = Utils.createElement('button', {
                className: 'rel-page-nav-btn',
                innerHTML: '\u25B2',
                title: 'Scroll to top',
                onClick: () => window.scrollTo({ top: 0, behavior: 'smooth' })
            });

            const bottomBtn = Utils.createElement('button', {
                className: 'rel-page-nav-btn',
                innerHTML: '\u25BC',
                title: 'Scroll to bottom',
                onClick: () => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })
            });

            nav.appendChild(topBtn);
            nav.appendChild(bottomBtn);
            document.body.appendChild(nav);

            // Show/hide based on scroll
            let visible = false;
            window.addEventListener('scroll', Utils.throttle(() => {
                const shouldShow = window.scrollY > 300;
                if (shouldShow !== visible) {
                    nav.style.opacity = shouldShow ? '1' : '0';
                    nav.style.pointerEvents = shouldShow ? 'auto' : 'none';
                    visible = shouldShow;
                }
            }, 200));
            nav.style.opacity = '0';
            nav.style.pointerEvents = 'none';
            nav.style.transition = 'opacity 0.3s';
        }
    };

    // =========================================================================
    // SUBREDDIT SHORTCUTS MODULE
    // =========================================================================
    const SubredditShortcutsModule = {
        container: null,

        init() {
            if (!settings.subredditShortcuts) return;
            const srBar = document.querySelector('#sr-header-area .sr-list');
            if (!srBar) return;

            if (subredditShortcuts.length === 0) {
                const existing = srBar.querySelectorAll('a.choice');
                existing.forEach(a => {
                    const sr = a.textContent.trim();
                    if (sr && !subredditShortcuts.includes(sr)) {
                        subredditShortcuts.push(sr);
                    }
                });
                if (subredditShortcuts.length > 0) saveShortcuts();
            }

            this.container = Utils.createElement('span', { className: 'rel-sr-shortcuts' });
            srBar.appendChild(this.container);
            this.render();
        },

        render() {
            if (!this.container) return;
            const t = Themes.getTheme();
            this.container.innerHTML = '';
            const isDark = settings.darkMode && settings.theme !== 'light';

            subredditShortcuts.forEach((sr, idx) => {
                const wrapper = document.createElement('span');
                wrapper.style.cssText = 'position:relative;display:inline-block;';

                const link = Utils.createElement('a', {
                    href: `/r/${sr}`,
                    textContent: sr,
                    title: `/r/${sr}`
                });
                wrapper.appendChild(link);

                const removeBtn = document.createElement('span');
                removeBtn.textContent = '\u00D7';
                removeBtn.title = `Remove /r/${sr}`;
                removeBtn.style.cssText = `position:absolute;top:-4px;right:-4px;font-size:10px;font-weight:700;cursor:pointer;color:${t.error};background:${t.bg};border-radius:50%;width:12px;height:12px;line-height:12px;text-align:center;display:none;border:1px solid ${t.border};z-index:1;`;
                removeBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    subredditShortcuts.splice(idx, 1);
                    saveShortcuts();
                    this.render();
                    Utils.notify(`Removed /r/${sr}`, 'info');
                });
                wrapper.appendChild(removeBtn);

                wrapper.addEventListener('mouseenter', () => { removeBtn.style.display = 'block'; });
                wrapper.addEventListener('mouseleave', () => { removeBtn.style.display = 'none'; });

                this.container.appendChild(wrapper);
            });

            // Add button
            const addBtn = Utils.createElement('span', {
                className: 'rel-sr-add',
                textContent: '+',
                title: 'Add subreddit shortcut',
                onClick: () => {
                    const sr = prompt('Enter subreddit name:');
                    if (sr) {
                        const clean = sr.replace(/^\/?r\//, '').trim();
                        if (clean && !subredditShortcuts.includes(clean)) {
                            subredditShortcuts.push(clean);
                            saveShortcuts();
                            this.render();
                            Utils.notify(`Added /r/${clean}`, 'success');
                        }
                    }
                }
            });
            this.container.appendChild(addBtn);
        }
    };

    // =========================================================================
    // SELECTED ENTRY MODULE
    // =========================================================================
    const SelectedEntryModule = {
        init() { /* Handled by keyboard nav */ },
        process(container) { /* Markers applied by keyboard nav */ }
    };

    // =========================================================================
    // NO PARTICIPATION MODULE
    // =========================================================================
    const NoParticipationModule = {
        init() {
            if (!settings.noParticipation) return;
            if (window.location.hostname === 'np.reddit.com') {
                // Disable voting
                GM_addStyle(`
                    .arrow { pointer-events: none !important; opacity: 0.3 !important; }
                    .reply-button, [data-event-action="comment"] { pointer-events: none !important; opacity: 0.3 !important; }
                `);
                Utils.notify('No Participation mode active - voting and commenting disabled', 'warning', 5000);
            }
        },
        process(container) {
            if (!settings.noParticipation) return;
            // Convert np links to regular in link lists
            const links = container.querySelectorAll('a[href*="np.reddit.com"]:not([data-rel-np])');
            links.forEach(link => {
                link.setAttribute('data-rel-np', '1');
                link.title = 'NP link - No Participation';
                link.style.opacity = '0.7';
            });
        }
    };

    // =========================================================================
    // USER INFO POPUP MODULE
    // =========================================================================
    const UserInfoModule = {
        cache: {},
        hoverTimer: null,
        currentPopup: null,

        init() { if (settings.showUserInfo) this.process(document); },
        process(container) {
            if (!settings.showUserInfo) return;
            const authors = container.querySelectorAll('.author:not([data-rel-userinfo])');
            authors.forEach(author => {
                author.setAttribute('data-rel-userinfo', '1');
                author.addEventListener('mouseenter', (e) => {
                    clearTimeout(this.hoverTimer);
                    this.hoverTimer = setTimeout(() => this.showPopup(author, e), 500);
                });
                author.addEventListener('mouseleave', () => {
                    clearTimeout(this.hoverTimer);
                    setTimeout(() => {
                        if (this.currentPopup && !this.currentPopup.matches(':hover')) {
                            this.currentPopup.remove();
                            this.currentPopup = null;
                        }
                    }, 300);
                });
            });
        },

        async showPopup(author, event) {
            if (this.currentPopup) { this.currentPopup.remove(); this.currentPopup = null; }

            const username = author.textContent;
            if (!username || username === '[deleted]') return;

            const t = Themes.getTheme();
            const popup = Utils.createElement('div', { className: 'rel-user-info-popup' });
            popup.style.left = (event.clientX + 10) + 'px';
            popup.style.top = (event.clientY + 10) + 'px';
            popup.innerHTML = `<h4>u/${Utils.escapeHTML(username)}</h4><div style="opacity:0.6;">Loading...</div>`;

            popup.addEventListener('mouseleave', () => {
                popup.remove();
                this.currentPopup = null;
            });

            document.body.appendChild(popup);
            this.currentPopup = popup;

            // Ensure popup stays on screen
            const rect = popup.getBoundingClientRect();
            if (rect.right > window.innerWidth) popup.style.left = (window.innerWidth - rect.width - 10) + 'px';
            if (rect.bottom > window.innerHeight) popup.style.top = (window.innerHeight - rect.height - 10) + 'px';

            try {
                let data = this.cache[username];
                if (!data) {
                    const resp = await fetch(`https://old.reddit.com/user/${username}/about.json`);
                    data = await resp.json();
                    this.cache[username] = data;
                }

                const d = data.data;
                if (!d) { popup.innerHTML = `<h4>u/${Utils.escapeHTML(username)}</h4><div>User not found</div>`; return; }

                const created = new Date(d.created_utc * 1000);
                const age = Utils.timeAgo(created);

                popup.innerHTML = `
                    <h4 style="color:${t.accent};">u/${Utils.escapeHTML(username)}</h4>
                    <div class="rel-user-info-stat"><span>Post Karma:</span><span>${Utils.formatNumber(d.link_karma)}</span></div>
                    <div class="rel-user-info-stat"><span>Comment Karma:</span><span>${Utils.formatNumber(d.comment_karma)}</span></div>
                    <div class="rel-user-info-stat"><span>Account Age:</span><span>${age}</span></div>
                    <div class="rel-user-info-stat"><span>Created:</span><span>${created.toLocaleDateString()}</span></div>
                    ${d.is_gold ? '<div style="color:#ffd700;font-size:11px;margin-top:4px;">Gold member</div>' : ''}
                    ${d.is_mod ? '<div style="color:#5bc0de;font-size:11px;margin-top:2px;">Moderator</div>' : ''}
                    ${voteWeights[username] ? `<div style="margin-top:4px;font-size:11px;">Vote weight: <strong style="color:${voteWeights[username] > 0 ? t.success : t.error}">${voteWeights[username] > 0 ? '+' : ''}${voteWeights[username]}</strong></div>` : ''}
                    ${userTags[username] ? `<div style="margin-top:4px;font-size:11px;">Tag: <span style="background:${UserTaggingModule.tagColors[userTags[username].color] || '#666'};color:#fff;padding:1px 5px;border-radius:3px;">${Utils.escapeHTML(userTags[username].text)}</span></div>` : ''}
                `;
            } catch (e) {
                popup.innerHTML = `<h4>u/${Utils.escapeHTML(username)}</h4><div style="opacity:0.6;">Could not load user info</div>`;
            }
        }
    };

    // =========================================================================
    // AD BLOCKER MODULE
    // =========================================================================
    const AdBlockModule = {
        init() {
            if (!settings.adBlocker) return;
            this.injectCSS();
        },

        injectCSS() {
            // MINIMAL safe CSS - only target elements that are guaranteed ads
            GM_addStyle(`
                /* REL Ad Blocker - minimal safe rules */
                .thing.promoted { display: none !important; }
                .thing.promotedlink { display: none !important; }
                #siteTable_organic { display: none !important; }
                .goldvertisement { display: none !important; }

                /* Reddit nag bars and banners */
                div.reddit-infobar.md-container-small.with-icon.locked-infobar { display: none !important; }
                div.email-collection-banner { display: none !important; }
                button.redesign-beta-optin { display: none !important; }
                form.premium-banner { display: none !important; }
                div.hidden-post-placeholder { display: none !important; }
            `);
        },

        process(container) {
            if (!settings.adBlocker) return;
            container.querySelectorAll('.thing.promoted, .thing.promotedlink').forEach(el => {
                el.style.display = 'none';
            });
        }
    };

    // =========================================================================
    // SUBREDDIT STYLE REMOVER MODULE
    // =========================================================================
    const SubredditStyleRemoverModule = {
        init() {
            if (!settings.removeSubredditStyles) return;
            // Skip observer if early init already set it up (avoid duplicate)
            if (!this._earlyInitDone) {
                const disableStyles = () => {
                    document.querySelectorAll(
                        'link[rel="applied_subreddit_stylesheet"], link[title="applied_subreddit_stylesheet"]'
                    ).forEach(s => {
                        if (s.getAttribute('media') !== 'not all') {
                            s.setAttribute('data-rel-disabled', '1');
                            s.setAttribute('media', 'not all');
                        }
                    });
                };
                disableStyles();
                const head = document.head || document.documentElement;
                new MutationObserver(disableStyles).observe(head, { childList: true });
            }
            // Also uncheck "Use subreddit style" checkbox if present
            const styleOverride = document.getElementById('sr-style-bar');
            if (styleOverride) {
                const checkbox = styleOverride.querySelector('input[type="checkbox"]');
                if (checkbox && checkbox.checked) {
                    checkbox.click();
                }
            }
        }
    };

    // =========================================================================
    // WIDE VIEW MODULE
    // =========================================================================
    const WideViewModule = {
        init() {
            if (!settings.wideView) return;
            GM_addStyle(`
                body > .content { max-width: none !important; margin: 0 !important; padding: 0 16px !important; }
                .content[role="main"] { max-width: none !important; }
                .sitetable, .linklisting { max-width: none !important; }
                .side { position: sticky; top: 0; max-height: 100vh; overflow-y: auto; }
                .thing .title { max-width: none !important; }
                .commentarea { max-width: none !important; }
                body.listing-page .content { margin: 0 auto !important; max-width: 100% !important; }
                .wiki-page .wiki-page-content { max-width: none !important; }
                .searchpane { max-width: none !important; }
            `);
        }
    };

    // =========================================================================
    // SUBREDDIT DESCRIPTION MODULE
    // =========================================================================
    const SubredditDescriptionModule = {
        TTL_MS: 7 * 24 * 60 * 60 * 1000, // 7 days cache

        init() {
            if (!settings.subredditDescription) return;
            const sr = Utils.isSubreddit();
            if (!sr) return;
            this.loadDescription(sr);
        },

        getCacheKey(sub) { return 'rel_srdesc_' + sub.toLowerCase(); },

        readCache(sub) {
            try {
                const raw = localStorage.getItem(this.getCacheKey(sub));
                if (!raw) return null;
                const parsed = JSON.parse(raw);
                if (!parsed || typeof parsed.v !== 'string' || typeof parsed.t !== 'number') return null;
                if ((Date.now() - parsed.t) > this.TTL_MS) return null;
                return parsed.v;
            } catch { return null; }
        },

        writeCache(sub, desc) {
            try { localStorage.setItem(this.getCacheKey(sub), JSON.stringify({ v: desc, t: Date.now() })); } catch {}
        },

        async loadDescription(subreddit) {
            const sidebar = document.querySelector('.side');
            if (!sidebar) return;

            // Check cache first
            let desc = this.readCache(subreddit);

            if (!desc) {
                try {
                    const resp = await fetch(`https://old.reddit.com/r/${subreddit}/about.json`, {
                        headers: { 'Accept': 'application/json' }
                    });
                    const json = await resp.json();
                    desc = json?.data?.public_description?.trim() || '';
                    if (desc) this.writeCache(subreddit, desc);
                } catch (e) {
                    console.error('REL: Failed to load subreddit description', e);
                    return;
                }
            }

            if (!desc) return;

            // Check if sidebar already has a description
            const existingDesc = sidebar.querySelector('.titlebox .md p');
            if (existingDesc && existingDesc.textContent.trim().length > 20) return;

            const t = Themes.getTheme();
            const box = Utils.createElement('div', {
                id: 'rel-sr-description',
                className: 'spacer',
                style: {
                    background: settings.darkMode ? t.bgLight : '#f6f7f8',
                    border: `1px solid ${settings.darkMode ? t.border : '#e0e0e0'}`,
                    borderRadius: '6px', padding: '12px', marginBottom: '10px'
                }
            });
            box.innerHTML = `
                <h3 style="margin:0 0 6px;font-size:13px;font-weight:bold;color:${settings.darkMode ? t.fg : '#1a1a1b'};">About Community</h3>
                <p style="margin:0;font-size:12px;color:${settings.darkMode ? t.fgMuted : '#5a5c5e'};line-height:1.5;">${Utils.escapeHTML(desc)}</p>
            `;

            // Insert before the existing titlebox
            const titlebox = sidebar.querySelector('.titlebox');
            if (titlebox) {
                sidebar.insertBefore(box, titlebox.closest('.spacer') || titlebox);
            } else {
                sidebar.prepend(box);
            }
        }
    };

    // =========================================================================
    // STATE SAVER MODULE
    // =========================================================================
    const StateSaverModule = {
        init() {
            if (!settings.stateSaver) return;
            if (!Utils.isListingPage()) return;

            // Save scroll position before navigating to a comments page
            document.addEventListener('click', (e) => {
                const a = e.target.closest('a');
                if (!a || !a.href) return;
                // Only intercept comment links
                if (!a.href.includes('/comments/')) return;
                // Don't intercept external links
                if (!a.href.includes('reddit.com')) return;
                // Don't intercept if modifier keys held (user wants new tab)
                if (e.ctrlKey || e.metaKey || e.shiftKey || e.button !== 0) return;

                // Save current scroll and page state
                const stateKey = 'rel_state_' + window.location.pathname + window.location.search;
                try {
                    sessionStorage.setItem(stateKey, JSON.stringify({
                        scrollY: window.scrollY,
                        timestamp: Date.now()
                    }));
                } catch {}
            });

            // Restore scroll position on page load
            this.restoreState();
        },

        restoreState() {
            const stateKey = 'rel_state_' + window.location.pathname + window.location.search;
            try {
                const raw = sessionStorage.getItem(stateKey);
                if (!raw) return;
                const state = JSON.parse(raw);
                // Only restore if less than 30 minutes old
                if (Date.now() - state.timestamp > 30 * 60 * 1000) {
                    sessionStorage.removeItem(stateKey);
                    return;
                }
                // Use performance navigation to detect back/forward
                const navType = performance.getEntriesByType('navigation')[0]?.type;
                if (navType === 'back_forward' || document.referrer.includes('/comments/')) {
                    // Wait for content to render then scroll
                    requestAnimationFrame(() => {
                        setTimeout(() => {
                            window.scrollTo(0, state.scrollY);
                        }, 100);
                    });
                }
                // Clean up after restore
                sessionStorage.removeItem(stateKey);
            } catch {}
        }
    };

    // =========================================================================
    // DOWNLOAD BUTTONS MODULE
    // =========================================================================
    const DownloadButtonsModule = {
        init() {
            if (!settings.downloadButtons) return;
            this.process(document);
        },

        process(container) {
            if (!settings.downloadButtons) return;
            const things = container.querySelectorAll('.thing.link:not([data-rel-download])');
            things.forEach(thing => {
                thing.setAttribute('data-rel-download', '1');
                const url = thing.getAttribute('data-url') || '';
                if (!url) return;

                // Check if this is a downloadable image
                const isImage = /\.(jpg|jpeg|png|gif|webp|bmp)(\?.*)?$/i.test(url) ||
                                url.includes('i.redd.it') || url.includes('i.imgur.com') ||
                                url.includes('preview.redd.it');
                if (!isImage) return;

                const buttons = thing.querySelector('.flat-list.buttons');
                if (!buttons) return;

                const t = Themes.getTheme();
                const dlBtn = Utils.createElement('li', {});
                const dlLink = Utils.createElement('a', {
                    href: 'javascript:void(0)',
                    textContent: '\u2913 download',
                    title: 'Download image',
                    style: {
                        color: settings.darkMode ? t.accent : '#0079d3',
                        cursor: 'pointer'
                    },
                    onClick: (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        this.downloadImage(url, thing, dlLink);
                    }
                });
                dlBtn.appendChild(dlLink);
                buttons.appendChild(dlBtn);
            });
        },

        async downloadImage(url, thing, btn) {
            const originalText = btn.textContent;
            btn.textContent = '\u2913 downloading...';

            // Resolve the actual image URL
            let imgUrl = url;
            if (url.includes('imgur.com') && !url.includes('i.imgur.com')) {
                const m = url.match(/imgur\.com\/(?:a\/|gallery\/)?(\w+)/);
                if (m) imgUrl = `https://i.imgur.com/${m[1]}.jpg`;
            }

            // Get filename from title
            const title = thing.querySelector('a.title')?.textContent || 'reddit-image';
            const cleanTitle = title.replace(/[^a-z0-9]/gi, '-').replace(/-+/g, '-').replace(/^-+|-+$/g, '').toLowerCase().substring(0, 80);
            const ext = imgUrl.match(/\.(jpg|jpeg|png|gif|webp|bmp)/i)?.[1] || 'jpg';
            const filename = `${cleanTitle}.${ext}`;

            try {
                // Use GM_xmlhttpRequest to bypass CORS
                GM_xmlhttpRequest({
                    method: 'GET',
                    url: imgUrl,
                    responseType: 'blob',
                    onload: (response) => {
                        try {
                            const blob = response.response;
                            const a = document.createElement('a');
                            a.href = URL.createObjectURL(blob);
                            a.download = filename;
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                            URL.revokeObjectURL(a.href);
                            btn.textContent = '\u2713 saved';
                            setTimeout(() => { btn.textContent = originalText; }, 3000);
                        } catch (err) {
                            btn.textContent = '\u2717 error';
                            setTimeout(() => { btn.textContent = originalText; }, 3000);
                        }
                    },
                    onerror: () => {
                        // Fallback: open in new tab for manual save
                        window.open(imgUrl, '_blank');
                        btn.textContent = originalText;
                    }
                });
            } catch (e) {
                window.open(imgUrl, '_blank');
                btn.textContent = originalText;
            }
        }
    };

    // =========================================================================
    // INITIALIZATION
    // =========================================================================
    function init() {
        // Disable subreddit styles IMMEDIATELY at document-start
        // Uses media="not all" instead of .remove() to preserve layout-critical CSS
        // Notification redirect (runs early, before DOM processing)
        NotificationRedirectModule.init();

        if (settings.removeSubredditStyles) {
            SubredditStyleRemoverModule._earlyInitDone = true;
            const disableStyles = () => {
                document.querySelectorAll(
                    'link[rel="applied_subreddit_stylesheet"], link[title="applied_subreddit_stylesheet"]'
                ).forEach(s => {
                    if (s.getAttribute('media') !== 'not all') {
                        s.setAttribute('data-rel-disabled', '1');
                        s.setAttribute('media', 'not all');
                    }
                });
            };
            disableStyles();
            // Watch for late-loading sheets
            const head = document.head || document.documentElement;
            if (head) {
                new MutationObserver(disableStyles).observe(head, { childList: true });
            }
        }

        // Inject ad-block CSS at document-start for zero-flicker
        // MINIMAL: only .thing.promoted and .thing.promotedlink
        if (settings.adBlocker) {
            GM_addStyle(`
                .thing.promoted { display: none !important; }
                .thing.promotedlink { display: none !important; }
                #siteTable_organic { display: none !important; }
                div.reddit-infobar.md-container-small.with-icon.locked-infobar { display: none !important; }
                div.email-collection-banner { display: none !important; }
                button.redesign-beta-optin { display: none !important; }
                form.premium-banner { display: none !important; }
                div.hidden-post-placeholder { display: none !important; }
            `);
        }

        // Inject base styles immediately
        GM_addStyle(Styles.base);

        // Apply theme CSS
        if (settings.darkMode && settings.theme !== 'light') {
            GM_addStyle(Themes.generateCSS());
            GM_addStyle(Styles.getThemedBase());
        }

        // Apply UX enhancements
        const uxInit = Styles.generateUXCSS();
        if (uxInit) GM_addStyle(uxInit);

        // Apply custom CSS
        if (settings.customCSS) {
            GM_addStyle(settings.customCSS);
        }

        // Note: Reddit's jQuery is closure-scoped in their bundles, so we cannot
        // polyfill missing methods (slideUp, ajax, thing, etc.) from userscript context.
        // Instead, we intercept clicks and handle reply/vote/collapse natively above.

        // Wait for DOM ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initModules);
        } else {
            initModules();
        }
    }

    // =========================================================================
    // CLASSIC REDDIT++ FEATURES (adapted from Classic Reddit++ by SlippingGitty)
    // =========================================================================

    // --- Notification Redirect ---
    const NotificationRedirectModule = {
        init() {
            if (!settings.notificationRedirect) return;
            if (window.location.href.includes('old.reddit.com/notifications')) {
                window.location.href = window.location.href.replace('old.reddit.com/notifications', 'sh.reddit.com/notifications');
            }
        }
    };

    // --- Shared Post Data Cache (used by ViewCounter + VoteEstimator) ---
    const PostDataCache = {
        cache: {},
        pending: {},
        fetch(postId, callback) {
            if (this.cache[postId]) { callback(this.cache[postId]); return; }
            if (this.pending[postId]) { this.pending[postId].push(callback); return; }
            this.pending[postId] = [callback];
            GM_xmlhttpRequest({
                method: 'GET',
                url: `https://www.reddit.com/by_id/t3_${postId}.json`,
                headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' },
                onload: (response) => {
                    try {
                        const data = JSON.parse(response.responseText);
                        const post = data.data.children[0].data;
                        this.cache[postId] = post;
                        (this.pending[postId] || []).forEach(cb => cb(post));
                    } catch (e) {
                        (this.pending[postId] || []).forEach(cb => cb(null));
                    }
                    delete this.pending[postId];
                },
                onerror: () => {
                    (this.pending[postId] || []).forEach(cb => cb(null));
                    delete this.pending[postId];
                }
            });
        }
    };

    // --- View Counter ---
    const ViewCounterModule = {
        init() {
            if (!settings.viewCounter) return;
            this.process(document);
        },
        process(container) {
            if (!settings.viewCounter) return;
            // Comment page - single post
            if (window.location.pathname.includes('/comments/')) {
                const urlMatch = window.location.pathname.match(/\/comments\/([a-z0-9]+)\//i);
                const postId = urlMatch ? urlMatch[1] : null;
                const selfPost = document.querySelector('.thing.self, .thing.link');
                if (postId && selfPost && !selfPost.hasAttribute('data-rel-views')) {
                    selfPost.setAttribute('data-rel-views', '1');
                    PostDataCache.fetch(postId, (post) => this.insertViewCount(selfPost, post));
                }
                return;
            }
            // Listing page
            container.querySelectorAll('.thing.link:not([data-rel-views])').forEach(el => {
                el.setAttribute('data-rel-views', '1');
                const postId = el.dataset.fullname?.replace('t3_', '');
                if (!postId) return;
                PostDataCache.fetch(postId, (post) => this.insertViewCount(el, post));
            });
        },
        formatNumber(num) {
            if (!num || num === 0) return '? views';
            if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M views';
            if (num >= 1000) return (num / 1000).toFixed(1) + 'K views';
            return num + ' views';
        },
        insertViewCount(el, post) {
            const tagline = el.querySelector('.tagline');
            if (!tagline || tagline.querySelector('.rel-view-count')) return;
            let views = null;
            if (post) {
                views = post.view_count || post.num_views || post.viewCount || null;
                if (!views) {
                    const score = post.score || 0;
                    const ratio = post.upvote_ratio || 0.5;
                    if (ratio > 0.5) views = Math.round(score / (2 * ratio - 1)) * 25;
                }
            }
            const t = Themes.getTheme();
            const span = document.createElement('span');
            span.className = 'rel-view-count';
            span.textContent = this.formatNumber(views);
            span.style.cssText = `margin-right:6px;color:${t.fgMuted};font-size:0.85em;opacity:0.8;`;
            const score = tagline.querySelector('.score');
            if (score) score.after(span);
            else tagline.prepend(span);
        }
    };

    // --- Vote Estimator ---
    const VoteEstimatorModule = {
        init() {
            if (!settings.voteEstimator) return;
            this.addEstimatesToCommentPage();
            this.process(document);
        },
        process(container) {
            if (!settings.voteEstimator) return;
            const linkListing = document.querySelector('.linklisting');
            if (!linkListing) return;
            container.querySelectorAll('.thing.link:not([data-rel-votes])').forEach(post => {
                post.setAttribute('data-rel-votes', '1');
                const postId = post.dataset.fullname?.replace('t3_', '');
                if (!postId) return;
                PostDataCache.fetch(postId, (pd) => {
                    if (!pd) return;
                    const score = pd.score || 0;
                    const ratio = pd.upvote_ratio || 0.5;
                    const pct = Math.round(ratio * 100);
                    const upvotes = this.calcUpvotes(score, pct);
                    if (upvotes === null) return;
                    const downvotes = upvotes - score;
                    const tagline = post.querySelector('.tagline');
                    if (!tagline || tagline.querySelector('.rel-vote-est')) return;
                    const t = Themes.getTheme();
                    const span = document.createElement('span');
                    span.className = 'rel-vote-est';
                    span.style.cssText = 'font-size:0.85em;margin-left:4px;';
                    span.innerHTML = `(<span style="color:${t.upvote || '#ff8b60'}">${this.addCommas(upvotes)}</span>|<span style="color:${t.downvote || '#9494ff'}">${this.addCommas(downvotes)}</span>|<span style="color:${t.success || '#50fa7b'}">${pct}%</span>)`;
                    const scoreEl = tagline.querySelector('.score');
                    if (scoreEl) scoreEl.after(span);
                });
            });
        },
        addCommas(n) {
            return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        },
        calcUpvotes(score, pct) {
            if (score === 0 || pct === 50) return null;
            return Math.round((pct / 100 * score) / (2 * (pct / 100) - 1));
        },
        addEstimatesToCommentPage() {
            const linkinfoScores = document.querySelectorAll('.linkinfo .score');
            linkinfoScores.forEach(scoreEl => {
                const numEl = scoreEl.querySelector('.number');
                if (!numEl) return;
                const points = parseInt(numEl.textContent.replace(/[^0-9]/g, ''), 10);
                const pctMatch = scoreEl.textContent.match(/(\d{1,3})\s?%/);
                const pct = pctMatch ? parseInt(pctMatch[1], 10) : 0;
                if (points === 50 && pct === 50) return;
                const upvotes = this.calcUpvotes(points, pct);
                if (upvotes === null) return;
                const downvotes = upvotes - points;
                const total = upvotes + downvotes;
                const t = Themes.getTheme();
                scoreEl.insertAdjacentHTML('afterend', `
                    <span style="font-size:80%;color:${t.upvote || '#ff8b60'};margin-left:5px;">${this.addCommas(upvotes)} upvotes</span>
                    <span style="font-size:80%;color:${t.downvote || '#9494ff'};margin-left:5px;">${this.addCommas(downvotes)} downvotes</span>
                    <span style="font-size:80%;color:${t.fgMuted};margin-left:5px;">${this.addCommas(total)} total</span>
                `);
            });
        }
    };

    // --- Full Scores ---
    const FullScoresModule = {
        init() {
            if (!settings.fullScores) return;
            GM_addStyle(`
                .link .score { font-size: 0 !important; }
                .link .score::before { content: attr(title); font-size: 12px !important; }
                .link .score::first-letter { font-size: 12px !important; }
            `);
        }
    };

    // --- Username /u/ Prefix ---
    const UserPrefixModule = {
        init() {
            if (!settings.userPrefix) return;
            GM_addStyle(`a.author::before { content: "/u/"; text-transform: none !important; }`);
        }
    };

    // --- Trending Subreddits ---
    const TrendingSubredditsModule = {
        subredditsPool: [
            '/r/AskReddit','/r/funny','/r/pics','/r/gaming','/r/science','/r/worldnews','/r/movies',
            '/r/todayilearned','/r/memes','/r/technology','/r/news','/r/space','/r/interestingasfuck',
            '/r/art','/r/personalfinance','/r/books','/r/history','/r/food','/r/sports','/r/Music',
            '/r/travel','/r/photography','/r/gadgets','/r/television','/r/aww','/r/anime','/r/manga',
            '/r/programming','/r/python','/r/buildapc','/r/cars','/r/fitness','/r/cooking',
            '/r/coffee','/r/nature','/r/mademesmile','/r/nostalgia','/r/futurology','/r/dataisbeautiful'
        ],
        init() {
            if (!settings.trendingSubreddits) return;
            const isFrontPage = window.location.pathname === '/' || window.location.pathname === '/index.html';
            if (!isFrontPage) return;

            const siteTable = document.getElementById('siteTable');
            if (!siteTable) return;

            const t = Themes.getTheme();
            const isDark = settings.darkMode && settings.theme !== 'light';

            // Pick 5 random subreddits (cached daily via GM storage)
            const cacheKey = 'rel_trending_cache';
            const now = Date.now();
            let cached = null;
            try { cached = JSON.parse(GM_getValue(cacheKey, 'null')); } catch(e) {}

            let subs;
            if (cached && (now - cached.ts < 86400000)) {
                subs = cached.subs;
            } else {
                const shuffled = [...this.subredditsPool].sort(() => 0.5 - Math.random());
                subs = shuffled.slice(0, 5);
                GM_setValue(cacheKey, JSON.stringify({ subs, ts: now }));
            }

            const bar = document.createElement('div');
            bar.className = 'rel-trending-bar';
            bar.style.cssText = `display:flex;flex-wrap:wrap;align-items:center;gap:8px;padding:8px 14px;margin-bottom:8px;border-radius:6px;font-size:12px;background:${isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'};border:1px solid ${t.border};`;

            const icon = document.createElement('span');
            icon.textContent = '\uD83D\uDD25';
            icon.style.fontSize = '14px';
            bar.appendChild(icon);

            const label = document.createElement('strong');
            label.textContent = 'Trending:';
            label.style.color = t.fg;
            bar.appendChild(label);

            subs.forEach(sub => {
                const a = document.createElement('a');
                a.href = sub;
                a.textContent = sub;
                a.style.cssText = `color:${t.link};text-decoration:none;padding:2px 6px;border-radius:4px;background:${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'};`;
                bar.appendChild(a);
            });

            siteTable.insertBefore(bar, siteTable.firstChild);
        }
    };

    function initModules() {
        // Apply body classes
        DarkModeModule.init();

        // Style/Layout modules (run early)
        SubredditStyleRemoverModule.init();
        WideViewModule.init();
        AdBlockModule.init();

        // UI modules
        CollapsibleSidebarModule.init();
        OldFaviconModule.init();
        SettingsModule.init();
        PageNavigatorModule.init();
        SubredditShortcutsModule.init();
        SubredditDescriptionModule.init();

        // Content modules
        UserTaggingModule.init();
        UserHighlighterModule.init();
        ImageExpansionModule.init();
        InlineImageFixModule.init();
        YouTubeEmbedModule.init();
        RedditPreviewModule.init();
        SocialMediaPreviewModule.init();
        SingleClickModule.init();
        TimestampModule.init();
        DownloadButtonsModule.init();

        // Comment modules
        CollapseChildCommentsModule.init();
        CommentHighlightingModule.init();
        CommentDepthModule.init();
        FormattingToolbarModule.init();
        ExpandThreadModule.init();
        HideAutoModeratorModule.init();
        IgnoredUsersModule.init();
        CommentNavigatorModule.init();
        CommentSearchModule.init();

        // Fallback comment toggle - handles expand/collapse when Reddit's jQuery is broken
        // ($(...).thing / $(...).slideUp errors in reddit-init.js)
        // Override Reddit's global togglecomment which relies on broken jQuery .thing() plugin
        const nativeToggle = function(el) {
            const comment = el.closest ? el.closest('.comment') : el.parentElement && el.parentElement.closest('.comment');
            if (!comment) return false;
            const isCollapsed = comment.classList.contains('collapsed');
            if (isCollapsed) {
                comment.classList.remove('collapsed');
                comment.classList.add('noncollapsed');
            } else {
                comment.classList.add('collapsed');
                comment.classList.remove('noncollapsed');
            }
            return false;
        };
        // Inject togglecomment override into page scope
        const script = document.createElement('script');
        script.textContent = `window.togglecomment = ${nativeToggle.toString()};`;
        document.documentElement.appendChild(script);
        script.remove();

        // Native reply handler - intercepts reply clicks before Reddit's broken jQuery runs
        // Strip inline onclick from all reply buttons to prevent Reddit's broken reply() from firing
        const stripReplyOnclick = (root) => {
            root.querySelectorAll('.reply-button a[onclick], a[onclick*="reply"]').forEach(a => {
                a.removeAttribute('onclick');
                a.setAttribute('data-rel-reply', '1');
            });
        };
        stripReplyOnclick(document);
        // Native dropdown menu handler - Reddit's open_menu() uses broken jQuery
        // Strip inline onclick from all dropdowns
        const stripDropdownOnclick = (root) => {
            root.querySelectorAll('.dropdown[onclick*="open_menu"]').forEach(dd => {
                dd.removeAttribute('onclick');
                dd.setAttribute('data-rel-dropdown', '1');
                dd.style.cursor = 'pointer';
            });
        };
        stripDropdownOnclick(document);
        // Single consolidated MutationObserver for both reply and dropdown onclick stripping
        new MutationObserver(muts => {
            muts.forEach(m => m.addedNodes.forEach(n => {
                if (n.nodeType === 1) {
                    stripReplyOnclick(n);
                    stripDropdownOnclick(n);
                }
            }));
        }).observe(document.body || document.documentElement, { childList: true, subtree: true });

        document.addEventListener('click', function(e) {
            const replyLink = e.target.closest('.reply-button a, a[data-rel-reply]');
            if (!replyLink) return;
            e.preventDefault();
            e.stopPropagation();

            // Walk up to the .entry, then to the .thing - avoids nesting confusion
            const entry = replyLink.closest('.entry');
            const thing = entry?.closest('.thing');
            if (!thing || !entry) return;

            // Check for our existing reply form (toggle it)
            const existingRelForm = entry.querySelector(':scope > .rel-reply-form');
            if (existingRelForm) {
                const isHidden = existingRelForm.style.display === 'none';
                existingRelForm.style.display = isHidden ? 'block' : 'none';
                if (isHidden) {
                    const ta = existingRelForm.querySelector('textarea');
                    if (ta) ta.focus();
                }
                return;
            }

            const thingId = thing.getAttribute('data-fullname') || '';
            const modhash = document.querySelector('input[name="uh"]')?.value || '';
            const t = Themes.getTheme();

            const formWrapper = document.createElement('div');
            formWrapper.className = 'rel-reply-form';
            formWrapper.style.cssText = 'margin: 6px 0; padding: 0;';
            formWrapper.innerHTML = `
                <div class="usertext-edit md-container" style="width:100%;box-sizing:border-box;">
                    <div class="md">
                        <textarea rows="6" name="text" style="width:100%;box-sizing:border-box;min-height:120px;resize:vertical;padding:10px 12px;border-radius:6px;font-size:14px;line-height:1.6;background:${t.bgLight};color:${t.fg};border:1px solid ${t.border};font-family:inherit;"></textarea>
                    </div>
                    <div class="bottom-area" style="padding:6px 0;">
                        <div class="usertext-buttons" style="display:flex;gap:8px;">
                            <button type="button" class="rel-reply-save" style="padding:6px 16px;border-radius:6px;cursor:pointer;font-weight:600;font-size:13px;border:none;background:${t.accent};color:${t.bg};">save</button>
                            <button type="button" class="rel-reply-cancel" style="padding:6px 16px;border-radius:6px;cursor:pointer;font-size:13px;border:1px solid ${t.border};background:${t.surface};color:${t.fg};">cancel</button>
                        </div>
                    </div>
                </div>`;

            // Insert form INSIDE the .entry, after the buttons - avoids .child nesting issues
            entry.appendChild(formWrapper);

            const textarea = formWrapper.querySelector('textarea');
            const saveBtn = formWrapper.querySelector('.rel-reply-save');
            const cancelBtn = formWrapper.querySelector('.rel-reply-cancel');

            textarea.focus();

            cancelBtn.addEventListener('click', () => { formWrapper.style.display = 'none'; });

            saveBtn.addEventListener('click', () => {
                const text = textarea.value.trim();
                if (!text) return;
                saveBtn.textContent = 'saving...';
                saveBtn.disabled = true;

                const body = new URLSearchParams({ thing_id: thingId, uh: modhash, text: text, api_type: 'json' });
                fetch('/api/comment', {
                    method: 'POST',
                    credentials: 'same-origin',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: body.toString()
                }).then(r => r.json()).then(data => {
                    let inserted = false;
                    let child = thing.querySelector(':scope > .child');
                    if (!child) {
                        child = document.createElement('div');
                        child.className = 'child';
                        thing.appendChild(child);
                    }

                    // Try jquery format first (HTML blob from Reddit)
                    if (data?.jquery) {
                        for (const cmd of data.jquery) {
                            if (cmd[3]?.[0] && typeof cmd[3][0] === 'string' && cmd[3][0].includes('class="thing')) {
                                child.insertAdjacentHTML('afterbegin', cmd[3][0]);
                                inserted = true;
                                break;
                            }
                        }
                    }

                    // Fallback: JSON format (api_type=json response)
                    if (!inserted && data?.json?.data?.things?.[0]?.data) {
                        const c = data.json.data.things[0].data;
                        const loggedUser = document.querySelector('.user a')?.textContent || c.author || 'you';
                        const commentHtml = `
                            <div class="thing comment id-${c.name} noncollapsed" data-fullname="${c.name}" data-author="${c.author}">
                                <div class="entry">
                                    <p class="tagline">
                                        <a href="/user/${c.author}" class="author">${c.author}</a>
                                        <span class="score dislikes">1 point</span>
                                        <span class="score unvoted">1 point</span>
                                        <span class="score likes">1 point</span>
                                        <time class="live-timestamp" datetime="${new Date().toISOString()}">just now</time>
                                    </p>
                                    <div class="md"><p>${c.body_html ? new DOMParser().parseFromString(c.body_html, 'text/html').body.innerHTML : Utils.escapeHTML(text)}</p></div>
                                    <ul class="flat-list buttons">
                                        <li class="first"><a class="bylink" href="${c.permalink || '#'}">permalink</a></li>
                                    </ul>
                                </div>
                                <div class="child"></div>
                            </div>`;
                        child.insertAdjacentHTML('afterbegin', commentHtml);
                        inserted = true;
                    }

                    formWrapper.style.display = 'none';
                    textarea.value = '';
                    saveBtn.textContent = 'save';
                    saveBtn.disabled = false;

                    // Process new comment for theming, tagging, depth indicators etc
                    if (inserted && child.firstElementChild) {
                        Utils.processNewContent(child.firstElementChild);
                    }
                }).catch(() => {
                    saveBtn.textContent = 'save';
                    saveBtn.disabled = false;
                    alert('Error posting comment. Please try again.');
                });
            });
        }, true);

        // Toggle dropdown on click
        document.addEventListener('click', function(e) {
            const dropdown = e.target.closest('.dropdown[data-rel-dropdown]');
            if (!dropdown) return;
            e.preventDefault();
            e.stopPropagation();

            // Find the associated .drop-choices (next sibling)
            const choices = dropdown.parentElement?.querySelector('.drop-choices');
            if (!choices) return;

            // Close all other open dropdowns first
            document.querySelectorAll('.drop-choices').forEach(d => {
                if (d !== choices) d.style.display = 'none';
            });

            // Toggle this one
            const isOpen = choices.style.display === 'block';
            choices.style.display = isOpen ? 'none' : 'block';

            // Position the dropdown
            if (!isOpen) {
                const rect = dropdown.getBoundingClientRect();
                choices.style.position = 'absolute';
                choices.style.top = (rect.bottom + window.scrollY) + 'px';
                choices.style.left = rect.left + 'px';
            }
        }, true);

        // Close dropdowns when clicking outside
        document.addEventListener('click', function(e) {
            if (e.target.closest('.dropdown[data-rel-dropdown]')) return;
            document.querySelectorAll('.drop-choices').forEach(d => {
                if (!d.contains(e.target)) d.style.display = 'none';
            });
        }, false);

        // Vote modules
        VoteEnhancementsModule.init();

        // Navigation modules
        NeverEndingRedditModule.init();
        KeyboardNavModule.init();
        NoParticipationModule.init();
        UserInfoModule.init();
        StateSaverModule.init();

        // Classic Reddit++ features
        ViewCounterModule.init();
        VoteEstimatorModule.init();
        FullScoresModule.init();
        UserPrefixModule.init();
        TrendingSubredditsModule.init();

        // Filter module (run last)
        FilterModule.init();

        console.log(`Reddit Enhancement Continued v${VERSION} loaded - ${Object.keys(Themes.definitions).length} themes, ${Object.keys(settings).filter(k => settings[k] === true).length} features active`);

        // Safety check: verify posts are visible after all modules loaded
        setTimeout(() => {
            const allThings = document.querySelectorAll('#siteTable .thing.link');
            const visibleThings = document.querySelectorAll('#siteTable .thing.link:not([style*="display: none"])');

            if (allThings.length > 0 && visibleThings.length === 0) {
                console.warn('REL: All posts hidden via inline styles - restoring visibility');
                allThings.forEach(el => { el.style.display = ''; el.removeAttribute('data-rel-hidden'); });
            } else if (allThings.length > 0) {
                let cssHiddenCount = 0;
                allThings.forEach(el => {
                    if (window.getComputedStyle(el).display === 'none') cssHiddenCount++;
                });
                if (cssHiddenCount > 0 && cssHiddenCount >= allThings.length * 0.9) {
                    console.warn(`REL: ${cssHiddenCount}/${allThings.length} posts hidden by CSS - removing ad blocker styles`);
                    document.querySelectorAll('style').forEach(s => {
                        if (s.textContent.includes('.thing.promoted') || s.textContent.includes('REL Ad Blocker')) {
                            s.remove();
                        }
                    });
                }
            }
        }, 1000);
    }

    // Start
    init();

})();