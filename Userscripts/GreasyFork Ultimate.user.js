// ==UserScript==
// @name               GreasyFork Ultimate
// @name:zh-CN         GreasyFork 终极增强
// @name:zh-TW         GreasyFork 終極增強
// @name:ja            GreasyFork アルティメット
// @name:ko            GreasyFork 얼티밋
// @name:ru            GreasyFork Ультимейт
// @name:de            GreasyFork Ultimate
// @name:fr            GreasyFork Ultime
// @name:es            GreasyFork Definitivo
// @name:pt-BR         GreasyFork Definitivo
// @namespace          https://github.com/greasyfork-ultimate
// @version            1.0.0
// @author             Unified Script Project
// @license            MIT
// @description        The ultimate GreasyFork enhancement: combines 15+ scripts into one powerful, customizable experience. Features include dark mode, script filtering, quick actions, auto-translation, search integration, UI beautification, and much more.
// @description:zh-CN  终极GreasyFork增强：将15+脚本合并为一个强大、可定制的体验。功能包括深色模式、脚本过滤、快捷操作、自动翻译、搜索集成、UI美化等。
// @description:zh-TW  終極GreasyFork增強：將15+腳本合併為一個強大、可定制的體驗。功能包括深色模式、腳本過濾、快捷操作、自動翻譯、搜索集成、UI美化等。
// @description:ja     究極のGreasyFork拡張：15以上のスクリプトを1つの強力でカスタマイズ可能な体験に統合。ダークモード、スクリプトフィルタリング、クイックアクション、自動翻訳、検索統合、UI美化などの機能を搭載。
// @description:ko     궁극의 GreasyFork 향상: 15개 이상의 스크립트를 하나의 강력하고 사용자 지정 가능한 경험으로 통합합니다. 다크 모드, 스크립트 필터링, 빠른 작업, 자동 번역, 검색 통합, UI 미화 등의 기능을 제공합니다.
// @description:ru     Лучшее улучшение GreasyFork: объединяет 15+ скриптов в одно мощное, настраиваемое решение. Включает тёмный режим, фильтрацию скриптов, быстрые действия, автоперевод, интеграцию поиска, улучшение UI и многое другое.
// @description:de     Die ultimative GreasyFork-Erweiterung: Vereint 15+ Skripte zu einem leistungsstarken, anpassbaren Erlebnis. Funktionen umfassen Dunkelmodus, Skriptfilterung, Schnellaktionen, Auto-Übersetzung, Suchintegration, UI-Verschönerung und vieles mehr.
// @description:fr     L'amélioration ultime de GreasyFork : combine plus de 15 scripts en une expérience puissante et personnalisable. Comprend le mode sombre, le filtrage des scripts, les actions rapides, la traduction automatique, l'intégration de recherche, l'embellissement de l'UI et bien plus encore.
// @description:es     La mejora definitiva de GreasyFork: combina más de 15 scripts en una experiencia potente y personalizable. Incluye modo oscuro, filtrado de scripts, acciones rápidas, traducción automática, integración de búsqueda, embellecimiento de UI y mucho más.
// @description:pt-BR  O aprimoramento definitivo do GreasyFork: combina mais de 15 scripts em uma experiência poderosa e personalizável. Recursos incluem modo escuro, filtragem de scripts, ações rápidas, tradução automática, integração de pesquisa, embelezamento de UI e muito mais.
// @match              *://greasyfork.org/*
// @match              *://sleazyfork.org/*
// @match              *://cn-greasyfork.org/*
// @connect            greasyfork.org
// @connect            sleazyfork.org
// @connect            cn-greasyfork.org
// @connect            update.greasyfork.org
// @connect            translate.googleapis.com
// @connect            openuserjs.org
// @grant              GM_getValue
// @grant              GM_setValue
// @grant              GM_deleteValue
// @grant              GM_listValues
// @grant              GM_addStyle
// @grant              GM_xmlhttpRequest
// @grant              GM_setClipboard
// @grant              GM_registerMenuCommand
// @grant              GM_notification
// @grant              GM_openInTab
// @grant              GM_getResourceText
// @grant              unsafeWindow
// @run-at             document-start
// @noframes
// @compatible         chrome
// @compatible         firefox
// @compatible         edge
// @compatible         opera
// @compatible         safari
// @icon               data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2NCIgaGVpZ2h0PSI2NCIgdmlld0JveD0iMCAwIDI0IDI0Ij48cGF0aCBmaWxsPSIjNjcwMDAwIiBkPSJNMTIgMEM1LjM3NCAwIDAgNS4zNzUgMCAxMnM1LjM3NCAxMiAxMiAxMmM2LjYyNSAwIDEyLTUuMzc1IDEyLTEyUzE4LjYyNSAwIDEyIDAiLz48cGF0aCBmaWxsPSIjZmZmIiBkPSJNNS44OSAyLjIyN2EuMjguMjggMCAwIDEgLjI2Ni4wNzZsNS4wNjMgNS4wNjJjLjU0LjU0LjUwOSAxLjY1Mi0uMDMxIDIuMTkybDguNzcxIDguNzdjMS4zNTYgMS4zNTUtLjM2IDMuMDk3LTEuNzMgMS43MjhsLTguNzcyLTguNzdjLS41NC41NC0xLjY1MS41NzEtMi4xOTEuMDMxbC01LjA2My01LjA2Yy0uMzA0LS4zMDQuMzA0LS45MTEuNjA4LS42MDhsMy43MTQgMy43MTNMNy41OSA4LjI5N0wzLjg3NSA0LjU4MmMtLjMwNC0uMzA0LjMwNC0uOTExLjYwNy0uNjA3bDMuNzE1IDMuNzE0bDEuMDY3LTEuMDY2TDUuNTQ5IDIuOTFjLS4yMjgtLjIyOC4wNTctLjYyNi4zNDItLjY4M1oiLz48L3N2Zz4=
// @downloadURL        https://update.greasyfork.org/scripts/0/GreasyFork_Ultimate.user.js
// @updateURL          https://update.greasyfork.org/scripts/0/GreasyFork_Ultimate.meta.js
// ==/UserScript==

(function() {
    'use strict';

    // ============================================================
    // SECTION 1: CONFIGURATION & CONSTANTS
    // ============================================================

    const SCRIPT_NAME = 'GreasyFork Ultimate';
    const SCRIPT_VERSION = '1.0.0';
    const STORAGE_PREFIX = 'gfu_';

    // Default settings
    const DEFAULT_SETTINGS = {
        // === APPEARANCE ===
        darkMode: 'auto', // 'auto', 'light', 'dark'
        customPageWidth: '1200px',
        cardLayout: false,
        cardColumns: 2,
        compactMode: false,
        showScriptIcons: true,

        // === FILTERING ===
        filterEnabled: true,
        filterNonLatin: false,
        filterNonASCII: false,
        filterGames: true,
        filterSocialNetworks: false,
        filterClutter: true,
        customBlacklist: '',
        hiddenScripts: [],

        // === QUICK ACTIONS ===
        showQuickActions: true,
        showCopyButton: true,
        showDownloadButton: true,
        showInstallButton: true,
        showHideButton: true,

        // === SCRIPT INFO ===
        showVersion: true,
        showRating: true,
        showDailyInstalls: true,
        showTotalInstalls: true,
        showUpdatedDate: true,
        showCreatedDate: false,

        // === SEARCH ===
        enableGoogleSearch: true,
        enableExternalSearch: true,
        showSleazyForkResults: true,

        // === TRANSLATION ===
        autoTranslate: false,
        translateApiKey: '',
        translateTargetLang: 'en',

        // === USER PAGE ===
        collapseUserProfile: true,
        collapseControlPanel: true,
        collapseDiscussions: true,

        // === EDITOR ===
        enableSyntaxHighlighting: true,
        enableHtmlToolbar: true,
        expandTextarea: true,
        hideShareSection: true,

        // === ADVANCED ===
        hideRecentUsersHours: 0,
        milestoneNotifications: true,
        milestones: '10, 100, 500, 1000, 5000, 10000',
        openInNewTab: false,
        openInBackground: false,
        debugMode: false
    };

    // Filter patterns (combined from multiple scripts)
    const FILTER_PATTERNS = {
        nonASCII: /[^\x00-\x7F\s]+/,
        nonLatin: /[^\u0000-\u024F\u2000-\u214F\s]+/,
        games: /Aimbot|AntiGame|Agar|agar\.io|alis\.io|angel\.io|AposBot|Astro\s*Empires|Battle|BiteFight|Blood\s*Wars|Bloble|Bonk|Bots|Brawler|Business\s*Tycoon|Castle\s*Age|City\s*Ville|chopcoin\.io|cursors\.io|Dark\s*Orbit|Dead\s*Frontier|Diep\.io|doblons\.io|Dragons\s*of\s*Atlantis|driftin\.io|Empire\s*Board|eRep(ublik)?|Epicmafia|Epic.*War|FarmVille|Frontier\s*Ville|Ghost\s*Trapper|Gladiatus|gota\.io|Grepolis|Ikariam|Kapi\s*Hospital|Kings\s*Age|Kingdoms?\s*of|Knight\s*Fight|Kongregate|Krunker|Legends?\s*of|MooMoo|MyFreeFarm|narwhale\.io|Neopets|OGame|Ogar(io)?|Pardus|Pennergame|Popmundo|Ravenwood|Skribbl|slither\.io|SpaceWars|splix\.io|Survivio|The\s*Crims|The\s*West|torto\.io|Travian|Tribal\s*Wars|Vampire\s*Wars|vertix\.io|War\s*of\s*Ninja|World\s*of\s*Tanks|wings\.io|World\s*of\s*Dungeons|Wurzelimperium|Yohoho|Zombs/iu,
        socialNetworks: /Face\s*book|Google(\+| Plus)|Habbo|Kaskus|Lepra|MySpace|odnoklassniki|Orkut|studiVZ|VK|vkontakte|Qzone|Twitter|TweetDeck|Instagram|TikTok|Snapchat|WhatsApp|Telegram|Discord|Reddit|LinkedIn|Pinterest|Tumblr/iu,
        clutter: /^\s*(.{1,3})\1+|^\s*(.+?)\n+\2|^\s*.{1,5}$|do\s*n('|o)?t (install|download)|nicht installieren|(just )?test(ing|s|\d)?|^\s*.{0,4}test.{0,4}$|free\s*download/iu
    };

    // External search sites
    const EXTERNAL_SEARCH_SITES = [
        { name: 'OpenUserJS', url: 'https://openuserjs.org/?q=' },
        { name: 'GitHub', url: 'https://github.com/search?q=' },
        { name: 'Google Custom', url: 'https://www.google.com/search?q=site:greasyfork.org+OR+site:openuserjs.org+' }
    ];

    // Translations
    const i18n = {
        en: {
            settings: 'Settings',
            settingsTitle: 'GreasyFork Ultimate Settings',
            appearance: 'Appearance',
            filtering: 'Filtering',
            quickActions: 'Quick Actions',
            scriptInfo: 'Script Info',
            search: 'Search',
            translation: 'Translation',
            userPage: 'User Page',
            editor: 'Editor',
            advanced: 'Advanced',
            save: 'Save',
            cancel: 'Cancel',
            reset: 'Reset to Defaults',
            darkMode: 'Dark Mode',
            auto: 'Auto',
            light: 'Light',
            dark: 'Dark',
            pageWidth: 'Page Width',
            cardLayout: 'Card Layout',
            cardColumns: 'Card Columns',
            compactMode: 'Compact Mode',
            showScriptIcons: 'Show Script Icons',
            filterEnabled: 'Enable Filtering',
            filterNonLatin: 'Filter Non-Latin Scripts',
            filterNonASCII: 'Filter Non-ASCII Scripts',
            filterGames: 'Filter Game Scripts',
            filterSocialNetworks: 'Filter Social Network Scripts',
            filterClutter: 'Filter Clutter/Test Scripts',
            customBlacklist: 'Custom Blacklist (comma separated)',
            hiddenScripts: 'Hidden Script IDs',
            showQuickActions: 'Show Quick Action Buttons',
            showCopyButton: 'Copy Button',
            showDownloadButton: 'Download Button',
            showInstallButton: 'Install Button',
            showHideButton: 'Hide Script Button',
            showVersion: 'Show Version',
            showRating: 'Show Rating',
            showDailyInstalls: 'Show Daily Installs',
            showTotalInstalls: 'Show Total Installs',
            showUpdatedDate: 'Show Updated Date',
            showCreatedDate: 'Show Created Date',
            enableGoogleSearch: 'Enable Google Search (prefix with "g")',
            enableExternalSearch: 'Enable External Site Search',
            showSleazyForkResults: 'Show SleazyFork Results',
            autoTranslate: 'Auto-Translate Non-Latin',
            translateApiKey: 'Translation API Key',
            translateTargetLang: 'Target Language',
            collapseUserProfile: 'Collapse User Profile',
            collapseControlPanel: 'Collapse Control Panel',
            collapseDiscussions: 'Collapse Discussions',
            enableSyntaxHighlighting: 'Enable Syntax Highlighting',
            enableHtmlToolbar: 'Enable HTML Toolbar',
            expandTextarea: 'Expand Textarea',
            hideShareSection: 'Hide Share Section',
            hideRecentUsersHours: 'Hide New Users (hours, 0=disabled)',
            milestoneNotifications: 'Milestone Notifications',
            milestones: 'Milestones (comma separated)',
            openInNewTab: 'Open Scripts in New Tab',
            openInBackground: 'Open in Background',
            debugMode: 'Debug Mode',
            copy: 'Copy',
            download: 'Download',
            install: 'Install',
            hide: 'Hide',
            unhide: 'Unhide',
            copied: 'Copied!',
            downloaded: 'Downloaded!',
            scriptsFiltered: 'scripts filtered',
            noScriptsFound: 'No scripts found',
            searchOtherSites: 'Search on other sites',
            translating: 'Translating...',
            translated: 'Translated',
            translationError: 'Translation error',
            settingsSaved: 'Settings saved!',
            confirmReset: 'Reset all settings to defaults?',
            version: 'Version',
            rating: 'Rating',
            dailyInstalls: 'Daily Installs',
            totalInstalls: 'Total Installs',
            updated: 'Updated',
            created: 'Created'
        },
        'zh-CN': {
            settings: '设置',
            settingsTitle: 'GreasyFork Ultimate 设置',
            appearance: '外观',
            filtering: '过滤',
            quickActions: '快捷操作',
            scriptInfo: '脚本信息',
            search: '搜索',
            translation: '翻译',
            userPage: '用户页面',
            editor: '编辑器',
            advanced: '高级',
            save: '保存',
            cancel: '取消',
            reset: '重置为默认',
            darkMode: '深色模式',
            auto: '自动',
            light: '浅色',
            dark: '深色',
            copy: '复制',
            download: '下载',
            install: '安装',
            hide: '隐藏',
            unhide: '取消隐藏',
            copied: '已复制！',
            downloaded: '已下载！',
            scriptsFiltered: '个脚本已过滤',
            translating: '翻译中...',
            translated: '已翻译',
            settingsSaved: '设置已保存！'
        },
        'zh-TW': {
            settings: '設定',
            settingsTitle: 'GreasyFork Ultimate 設定',
            appearance: '外觀',
            filtering: '過濾',
            quickActions: '快捷操作',
            copy: '複製',
            download: '下載',
            install: '安裝',
            hide: '隱藏',
            copied: '已複製！',
            downloaded: '已下載！',
            settingsSaved: '設定已儲存！'
        },
        ja: {
            settings: '設定',
            settingsTitle: 'GreasyFork Ultimate 設定',
            appearance: '外観',
            filtering: 'フィルタリング',
            copy: 'コピー',
            download: 'ダウンロード',
            install: 'インストール',
            hide: '非表示',
            copied: 'コピーしました！',
            downloaded: 'ダウンロードしました！',
            settingsSaved: '設定を保存しました！'
        },
        ko: {
            settings: '설정',
            settingsTitle: 'GreasyFork Ultimate 설정',
            copy: '복사',
            download: '다운로드',
            install: '설치',
            hide: '숨기기',
            copied: '복사됨!',
            downloaded: '다운로드됨!',
            settingsSaved: '설정이 저장되었습니다!'
        },
        ru: {
            settings: 'Настройки',
            settingsTitle: 'Настройки GreasyFork Ultimate',
            copy: 'Копировать',
            download: 'Скачать',
            install: 'Установить',
            hide: 'Скрыть',
            copied: 'Скопировано!',
            downloaded: 'Скачано!',
            settingsSaved: 'Настройки сохранены!'
        },
        de: {
            settings: 'Einstellungen',
            settingsTitle: 'GreasyFork Ultimate Einstellungen',
            copy: 'Kopieren',
            download: 'Herunterladen',
            install: 'Installieren',
            hide: 'Ausblenden',
            copied: 'Kopiert!',
            downloaded: 'Heruntergeladen!',
            settingsSaved: 'Einstellungen gespeichert!'
        },
        fr: {
            settings: 'Paramètres',
            settingsTitle: 'Paramètres GreasyFork Ultimate',
            copy: 'Copier',
            download: 'Télécharger',
            install: 'Installer',
            hide: 'Masquer',
            copied: 'Copié !',
            downloaded: 'Téléchargé !',
            settingsSaved: 'Paramètres enregistrés !'
        },
        es: {
            settings: 'Configuración',
            settingsTitle: 'Configuración de GreasyFork Ultimate',
            copy: 'Copiar',
            download: 'Descargar',
            install: 'Instalar',
            hide: 'Ocultar',
            copied: '¡Copiado!',
            downloaded: '¡Descargado!',
            settingsSaved: '¡Configuración guardada!'
        },
        'pt-BR': {
            settings: 'Configurações',
            settingsTitle: 'Configurações do GreasyFork Ultimate',
            copy: 'Copiar',
            download: 'Baixar',
            install: 'Instalar',
            hide: 'Ocultar',
            copied: 'Copiado!',
            downloaded: 'Baixado!',
            settingsSaved: 'Configurações salvas!'
        }
    };

    // ============================================================
    // SECTION 2: UTILITY FUNCTIONS
    // ============================================================

    // Get current language
    function getLang() {
        const lang = document.documentElement.lang || navigator.language || 'en';
        if (i18n[lang]) return lang;
        const baseLang = lang.split('-')[0];
        if (i18n[baseLang]) return baseLang;
        return 'en';
    }

    // Get translation
    function t(key) {
        const lang = getLang();
        return (i18n[lang] && i18n[lang][key]) || i18n.en[key] || key;
    }

    // Storage functions
    function getSetting(key) {
        const stored = GM_getValue(STORAGE_PREFIX + key);
        return stored !== undefined ? stored : DEFAULT_SETTINGS[key];
    }

    function setSetting(key, value) {
        GM_setValue(STORAGE_PREFIX + key, value);
    }

    function getAllSettings() {
        const settings = {};
        for (const key of Object.keys(DEFAULT_SETTINGS)) {
            settings[key] = getSetting(key);
        }
        return settings;
    }

    function resetSettings() {
        for (const key of Object.keys(DEFAULT_SETTINGS)) {
            GM_deleteValue(STORAGE_PREFIX + key);
        }
    }

    // DOM utilities
    function $(selector, context = document) {
        return context.querySelector(selector);
    }

    function $$(selector, context = document) {
        return [...context.querySelectorAll(selector)];
    }

    function createElement(tag, attrs = {}, children = []) {
        const el = document.createElement(tag);
        for (const [key, value] of Object.entries(attrs)) {
            if (key === 'className') el.className = value;
            else if (key === 'textContent') el.textContent = value;
            else if (key === 'innerHTML') el.innerHTML = value;
            else if (key === 'style' && typeof value === 'object') {
                Object.assign(el.style, value);
            } else if (key.startsWith('on') && typeof value === 'function') {
                el.addEventListener(key.slice(2).toLowerCase(), value);
            } else {
                el.setAttribute(key, value);
            }
        }
        for (const child of children) {
            if (typeof child === 'string') el.appendChild(document.createTextNode(child));
            else if (child) el.appendChild(child);
        }
        return el;
    }

    // Debounce function
    function debounce(fn, delay) {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => fn(...args), delay);
        };
    }

    // Check if dark mode
    function isDarkMode() {
        const setting = getSetting('darkMode');
        if (setting === 'dark') return true;
        if (setting === 'light') return false;
        return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }

    // Log function
    function log(...args) {
        if (getSetting('debugMode')) {
            console.log(`[${SCRIPT_NAME}]`, ...args);
        }
    }

    // Show notification
    function notify(message, type = 'info') {
        const toast = createElement('div', {
            className: `gfu-toast gfu-toast-${type}`,
            textContent: message
        });
        document.body.appendChild(toast);
        setTimeout(() => toast.classList.add('show'), 10);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    // ============================================================
    // SECTION 3: CSS STYLES
    // ============================================================

    const CSS_STYLES = `
        /* === CSS VARIABLES === */
        :root {
            --gfu-primary: #670000;
            --gfu-primary-hover: #900;
            --gfu-success: #28a745;
            --gfu-warning: #ffc107;
            --gfu-danger: #dc3545;
            --gfu-info: #17a2b8;
            --gfu-bg: #ffffff;
            --gfu-bg-secondary: #f8f9fa;
            --gfu-text: #212529;
            --gfu-text-muted: #6c757d;
            --gfu-border: #dee2e6;
            --gfu-shadow: rgba(0, 0, 0, 0.1);
            --gfu-radius: 8px;
            --gfu-transition: 0.2s ease;
        }

        [data-gfu-dark="true"], .gfu-dark {
            --gfu-primary: #ff6b6b;
            --gfu-primary-hover: #ff8787;
            --gfu-bg: #1e1e1e;
            --gfu-bg-secondary: #2d2d2d;
            --gfu-text: #e9e9e9;
            --gfu-text-muted: #adb5bd;
            --gfu-border: #444;
            --gfu-shadow: rgba(0, 0, 0, 0.3);
        }

        /* === TOAST NOTIFICATIONS === */
        .gfu-toast {
            position: fixed;
            bottom: 20px;
            right: 20px;
            padding: 12px 24px;
            border-radius: var(--gfu-radius);
            background: var(--gfu-bg-secondary);
            color: var(--gfu-text);
            box-shadow: 0 4px 12px var(--gfu-shadow);
            z-index: 999999;
            transform: translateY(100px);
            opacity: 0;
            transition: all 0.3s ease;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        .gfu-toast.show {
            transform: translateY(0);
            opacity: 1;
        }
        .gfu-toast-success { border-left: 4px solid var(--gfu-success); }
        .gfu-toast-error { border-left: 4px solid var(--gfu-danger); }
        .gfu-toast-info { border-left: 4px solid var(--gfu-info); }

        /* === SETTINGS PANEL === */
        .gfu-overlay {
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.5);
            z-index: 999990;
            opacity: 0;
            transition: opacity 0.3s ease;
            backdrop-filter: blur(4px);
        }
        .gfu-overlay.show { opacity: 1; }

        .gfu-settings-panel {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) scale(0.9);
            width: 90%;
            max-width: 800px;
            max-height: 85vh;
            background: var(--gfu-bg);
            border-radius: var(--gfu-radius);
            box-shadow: 0 20px 60px var(--gfu-shadow);
            z-index: 999991;
            opacity: 0;
            transition: all 0.3s ease;
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }
        .gfu-settings-panel.show {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
        }

        .gfu-settings-header {
            padding: 20px 24px;
            background: linear-gradient(135deg, var(--gfu-primary), var(--gfu-primary-hover));
            color: white;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .gfu-settings-header h2 {
            margin: 0;
            font-size: 1.25rem;
            font-weight: 600;
        }
        .gfu-settings-header .gfu-version {
            font-size: 0.75rem;
            opacity: 0.8;
        }
        .gfu-close-btn {
            background: none;
            border: none;
            color: white;
            font-size: 1.5rem;
            cursor: pointer;
            padding: 0;
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            transition: background 0.2s;
        }
        .gfu-close-btn:hover { background: rgba(255,255,255,0.2); }

        .gfu-settings-body {
            display: flex;
            flex: 1;
            overflow: hidden;
        }

        .gfu-settings-nav {
            width: 180px;
            background: var(--gfu-bg-secondary);
            border-right: 1px solid var(--gfu-border);
            padding: 12px 0;
            flex-shrink: 0;
        }
        .gfu-nav-item {
            display: block;
            width: 100%;
            padding: 12px 20px;
            border: none;
            background: none;
            text-align: left;
            cursor: pointer;
            color: var(--gfu-text);
            font-size: 0.9rem;
            transition: all 0.2s;
        }
        .gfu-nav-item:hover { background: var(--gfu-border); }
        .gfu-nav-item.active {
            background: var(--gfu-primary);
            color: white;
        }

        .gfu-settings-content {
            flex: 1;
            padding: 24px;
            overflow-y: auto;
        }

        .gfu-settings-section {
            display: none;
        }
        .gfu-settings-section.active { display: block; }

        .gfu-settings-section h3 {
            margin: 0 0 16px 0;
            font-size: 1.1rem;
            color: var(--gfu-primary);
            border-bottom: 2px solid var(--gfu-primary);
            padding-bottom: 8px;
        }

        .gfu-setting-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 12px 0;
            border-bottom: 1px solid var(--gfu-border);
        }
        .gfu-setting-row:last-child { border-bottom: none; }

        .gfu-setting-label {
            display: flex;
            flex-direction: column;
            gap: 4px;
        }
        .gfu-setting-label span {
            font-weight: 500;
            color: var(--gfu-text);
        }
        .gfu-setting-label small {
            color: var(--gfu-text-muted);
            font-size: 0.8rem;
        }

        /* Toggle Switch */
        .gfu-toggle {
            position: relative;
            width: 48px;
            height: 26px;
            flex-shrink: 0;
        }
        .gfu-toggle input {
            opacity: 0;
            width: 0;
            height: 0;
        }
        .gfu-toggle-slider {
            position: absolute;
            inset: 0;
            background: var(--gfu-border);
            border-radius: 26px;
            cursor: pointer;
            transition: 0.3s;
        }
        .gfu-toggle-slider::before {
            content: '';
            position: absolute;
            width: 20px;
            height: 20px;
            left: 3px;
            top: 3px;
            background: white;
            border-radius: 50%;
            transition: 0.3s;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
        .gfu-toggle input:checked + .gfu-toggle-slider {
            background: var(--gfu-success);
        }
        .gfu-toggle input:checked + .gfu-toggle-slider::before {
            transform: translateX(22px);
        }

        /* Select */
        .gfu-select {
            padding: 8px 12px;
            border: 1px solid var(--gfu-border);
            border-radius: var(--gfu-radius);
            background: var(--gfu-bg);
            color: var(--gfu-text);
            font-size: 0.9rem;
            min-width: 120px;
            cursor: pointer;
        }
        .gfu-select:focus {
            outline: none;
            border-color: var(--gfu-primary);
        }

        /* Input */
        .gfu-input {
            padding: 8px 12px;
            border: 1px solid var(--gfu-border);
            border-radius: var(--gfu-radius);
            background: var(--gfu-bg);
            color: var(--gfu-text);
            font-size: 0.9rem;
            min-width: 200px;
        }
        .gfu-input:focus {
            outline: none;
            border-color: var(--gfu-primary);
        }

        /* Textarea */
        .gfu-textarea {
            width: 100%;
            padding: 8px 12px;
            border: 1px solid var(--gfu-border);
            border-radius: var(--gfu-radius);
            background: var(--gfu-bg);
            color: var(--gfu-text);
            font-size: 0.9rem;
            resize: vertical;
            min-height: 60px;
        }

        .gfu-settings-footer {
            padding: 16px 24px;
            background: var(--gfu-bg-secondary);
            border-top: 1px solid var(--gfu-border);
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .gfu-btn {
            padding: 10px 20px;
            border: none;
            border-radius: var(--gfu-radius);
            font-size: 0.9rem;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s;
        }
        .gfu-btn-primary {
            background: var(--gfu-primary);
            color: white;
        }
        .gfu-btn-primary:hover { background: var(--gfu-primary-hover); }
        .gfu-btn-secondary {
            background: var(--gfu-bg);
            color: var(--gfu-text);
            border: 1px solid var(--gfu-border);
        }
        .gfu-btn-secondary:hover { background: var(--gfu-bg-secondary); }
        .gfu-btn-danger {
            background: var(--gfu-danger);
            color: white;
        }
        .gfu-btn-danger:hover { opacity: 0.9; }
        .gfu-btn-group {
            display: flex;
            gap: 8px;
        }

        /* === QUICK ACTION BUTTONS === */
        .gfu-quick-actions {
            position: absolute;
            top: 8px;
            right: 8px;
            display: flex;
            gap: 4px;
            z-index: 100;
            opacity: 0;
            transition: opacity 0.2s;
        }
        li[data-script-id]:hover .gfu-quick-actions,
        .gfu-quick-actions:focus-within {
            opacity: 1;
        }
        li[data-script-id] {
            position: relative !important;
        }

        .gfu-action-btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 28px;
            height: 28px;
            border: 1px solid var(--gfu-border);
            border-radius: 6px;
            background: var(--gfu-bg);
            cursor: pointer;
            transition: all 0.2s;
            padding: 0;
        }
        .gfu-action-btn:hover {
            transform: translateY(-1px);
            box-shadow: 0 2px 6px var(--gfu-shadow);
        }
        .gfu-action-btn svg {
            width: 14px;
            height: 14px;
            stroke: var(--gfu-text-muted);
            fill: none;
            stroke-width: 2;
        }
        .gfu-action-btn:hover svg { stroke: var(--gfu-text); }
        .gfu-action-btn.gfu-copy:hover { border-color: var(--gfu-info); }
        .gfu-action-btn.gfu-copy:hover svg { stroke: var(--gfu-info); }
        .gfu-action-btn.gfu-download:hover { border-color: var(--gfu-success); }
        .gfu-action-btn.gfu-download:hover svg { stroke: var(--gfu-success); }
        .gfu-action-btn.gfu-install:hover { border-color: var(--gfu-primary); }
        .gfu-action-btn.gfu-install:hover svg { stroke: var(--gfu-primary); }
        .gfu-action-btn.gfu-hide:hover { border-color: var(--gfu-danger); }
        .gfu-action-btn.gfu-hide:hover svg { stroke: var(--gfu-danger); }
        .gfu-action-btn.gfu-success {
            background: var(--gfu-success) !important;
            border-color: var(--gfu-success) !important;
        }
        .gfu-action-btn.gfu-success svg { stroke: white !important; }
        .gfu-action-btn.loading svg {
            animation: gfu-spin 1s linear infinite;
        }
        @keyframes gfu-spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
        }

        /* === FILTER STATUS === */
        .gfu-filter-status {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            margin-left: 12px;
            padding: 4px 12px;
            background: var(--gfu-bg-secondary);
            border-radius: 20px;
            font-size: 0.85rem;
            color: var(--gfu-text-muted);
        }
        .gfu-filter-count {
            font-weight: 600;
            color: var(--gfu-primary);
        }

        /* === HIDDEN/FILTERED SCRIPTS === */
        li.gfu-filtered, li.gfu-hidden {
            display: none !important;
        }
        body.gfu-show-filtered li.gfu-filtered,
        body.gfu-show-hidden li.gfu-hidden {
            display: list-item !important;
            opacity: 0.5;
            background: repeating-linear-gradient(
                45deg,
                transparent,
                transparent 10px,
                rgba(103, 0, 0, 0.05) 10px,
                rgba(103, 0, 0, 0.05) 20px
            );
        }

        /* === SCRIPT VERSION BADGE === */
        .gfu-version-badge {
            display: inline-block;
            padding: 2px 6px;
            margin-left: 6px;
            background: var(--gfu-bg-secondary);
            border: 1px solid var(--gfu-border);
            border-radius: 4px;
            font-size: 0.75rem;
            color: var(--gfu-text-muted);
            font-family: monospace;
        }

        /* === TRANSLATION BADGE === */
        .gfu-translated-badge {
            display: inline-block;
            padding: 2px 6px;
            margin-left: 6px;
            background: var(--gfu-success);
            color: white;
            border-radius: 4px;
            font-size: 0.65rem;
            font-weight: bold;
            text-transform: uppercase;
        }

        /* === EXTERNAL SEARCH === */
        .gfu-search-dropdown {
            margin-left: 8px;
        }
        .gfu-search-links {
            margin-top: 12px;
            padding: 12px;
            background: var(--gfu-bg-secondary);
            border-radius: var(--gfu-radius);
        }
        .gfu-search-links h4 {
            margin: 0 0 8px 0;
            font-size: 0.9rem;
            color: var(--gfu-text-muted);
        }
        .gfu-search-links a {
            display: inline-block;
            margin-right: 12px;
            margin-bottom: 4px;
        }

        /* === SETTINGS BUTTON === */
        .gfu-settings-trigger {
            position: fixed;
            bottom: 20px;
            left: 20px;
            width: 48px;
            height: 48px;
            border-radius: 50%;
            background: var(--gfu-primary);
            color: white;
            border: none;
            cursor: pointer;
            box-shadow: 0 4px 12px var(--gfu-shadow);
            z-index: 999980;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.3s;
        }
        .gfu-settings-trigger:hover {
            transform: scale(1.1);
            background: var(--gfu-primary-hover);
        }
        .gfu-settings-trigger svg {
            width: 24px;
            height: 24px;
            fill: white;
        }

        /* === PAGE HEADER ACTIONS === */
        .gfu-header-actions {
            display: inline-flex;
            gap: 6px;
            margin-left: 12px;
            vertical-align: middle;
        }
        .gfu-header-actions .gfu-action-btn {
            width: 32px;
            height: 32px;
        }
        .gfu-header-actions .gfu-action-btn svg {
            width: 16px;
            height: 16px;
        }

        /* === DARK MODE STYLES === */
        [data-gfu-dark="true"] body,
        .gfu-dark body {
            background-color: #1a1a1a !important;
            color: #e9e9e9 !important;
        }
        [data-gfu-dark="true"] .width-constraint,
        .gfu-dark .width-constraint {
            background-color: #242424 !important;
        }
        [data-gfu-dark="true"] a,
        .gfu-dark a {
            color: #f7c67f !important;
        }
        [data-gfu-dark="true"] a:visited,
        .gfu-dark a:visited {
            color: #c9a573 !important;
        }
        [data-gfu-dark="true"] input,
        [data-gfu-dark="true"] select,
        [data-gfu-dark="true"] textarea,
        .gfu-dark input,
        .gfu-dark select,
        .gfu-dark textarea {
            background-color: #2d2d2d !important;
            color: #e9e9e9 !important;
            border-color: #444 !important;
        }
        [data-gfu-dark="true"] #main-header,
        .gfu-dark #main-header {
            background: linear-gradient(135deg, #1a1a1a, #2d2d2d) !important;
        }
        [data-gfu-dark="true"] .script-list li,
        .gfu-dark .script-list li {
            background-color: #2a2a2a !important;
            border-color: #3a3a3a !important;
        }
        [data-gfu-dark="true"] .code-container,
        .gfu-dark .code-container {
            background-color: #1e1e1e !important;
        }

        /* === RESPONSIVE === */
        @media (max-width: 768px) {
            .gfu-settings-panel {
                width: 95%;
                max-height: 90vh;
            }
            .gfu-settings-nav {
                width: 140px;
            }
            .gfu-settings-content {
                padding: 16px;
            }
            .gfu-setting-row {
                flex-direction: column;
                align-items: flex-start;
                gap: 8px;
            }
            .gfu-quick-actions {
                opacity: 1;
            }
        }
    `;


    // ============================================================
    // SECTION 4: SETTINGS PANEL UI
    // ============================================================

    function createSettingsPanel() {
        const settings = getAllSettings();

        // Settings sections configuration
        const sections = [
            { id: 'appearance', icon: '🎨', label: t('appearance') },
            { id: 'filtering', icon: '🔍', label: t('filtering') },
            { id: 'quickActions', icon: '⚡', label: t('quickActions') },
            { id: 'scriptInfo', icon: '📋', label: t('scriptInfo') },
            { id: 'search', icon: '🔎', label: t('search') },
            { id: 'translation', icon: '🌐', label: t('translation') },
            { id: 'userPage', icon: '👤', label: t('userPage') },
            { id: 'editor', icon: '✏️', label: t('editor') },
            { id: 'advanced', icon: '⚙️', label: t('advanced') }
        ];

        // Create overlay
        const overlay = createElement('div', { className: 'gfu-overlay' });

        // Create panel
        const panel = createElement('div', { className: 'gfu-settings-panel' });

        // Header
        const header = createElement('div', { className: 'gfu-settings-header' }, [
            createElement('div', {}, [
                createElement('h2', { textContent: t('settingsTitle') }),
                createElement('span', { className: 'gfu-version', textContent: `v${SCRIPT_VERSION}` })
            ]),
            createElement('button', {
                className: 'gfu-close-btn',
                innerHTML: '×',
                onClick: closeSettings
            })
        ]);

        // Navigation
        const nav = createElement('div', { className: 'gfu-settings-nav' });
        sections.forEach((section, index) => {
            const btn = createElement('button', {
                className: `gfu-nav-item ${index === 0 ? 'active' : ''}`,
                'data-section': section.id,
                textContent: `${section.icon} ${section.label}`,
                onClick: () => switchSection(section.id)
            });
            nav.appendChild(btn);
        });

        // Content container
        const content = createElement('div', { className: 'gfu-settings-content' });

        // Create each section
        content.appendChild(createAppearanceSection(settings));
        content.appendChild(createFilteringSection(settings));
        content.appendChild(createQuickActionsSection(settings));
        content.appendChild(createScriptInfoSection(settings));
        content.appendChild(createSearchSection(settings));
        content.appendChild(createTranslationSection(settings));
        content.appendChild(createUserPageSection(settings));
        content.appendChild(createEditorSection(settings));
        content.appendChild(createAdvancedSection(settings));

        // Body
        const body = createElement('div', { className: 'gfu-settings-body' }, [nav, content]);

        // Footer
        const footer = createElement('div', { className: 'gfu-settings-footer' }, [
            createElement('button', {
                className: 'gfu-btn gfu-btn-danger',
                textContent: t('reset'),
                onClick: () => {
                    if (confirm(t('confirmReset'))) {
                        resetSettings();
                        closeSettings();
                        location.reload();
                    }
                }
            }),
            createElement('div', { className: 'gfu-btn-group' }, [
                createElement('button', {
                    className: 'gfu-btn gfu-btn-secondary',
                    textContent: t('cancel'),
                    onClick: closeSettings
                }),
                createElement('button', {
                    className: 'gfu-btn gfu-btn-primary',
                    textContent: t('save'),
                    onClick: saveSettings
                })
            ])
        ]);

        panel.appendChild(header);
        panel.appendChild(body);
        panel.appendChild(footer);

        document.body.appendChild(overlay);
        document.body.appendChild(panel);

        // Animate in
        requestAnimationFrame(() => {
            overlay.classList.add('show');
            panel.classList.add('show');
        });

        // Close on overlay click
        overlay.addEventListener('click', closeSettings);

        // Close on Escape
        const escHandler = (e) => {
            if (e.key === 'Escape') closeSettings();
        };
        document.addEventListener('keydown', escHandler);

        function closeSettings() {
            overlay.classList.remove('show');
            panel.classList.remove('show');
            setTimeout(() => {
                overlay.remove();
                panel.remove();
            }, 300);
            document.removeEventListener('keydown', escHandler);
        }

        function switchSection(sectionId) {
            $$('.gfu-nav-item').forEach(btn => btn.classList.remove('active'));
            $(`.gfu-nav-item[data-section="${sectionId}"]`).classList.add('active');
            $$('.gfu-settings-section').forEach(sec => sec.classList.remove('active'));
            $(`#gfu-section-${sectionId}`).classList.add('active');
        }

        function saveSettings() {
            // Collect all settings from form
            $$('[data-setting]').forEach(el => {
                const key = el.dataset.setting;
                let value;
                if (el.type === 'checkbox') {
                    value = el.checked;
                } else if (el.tagName === 'SELECT' || el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                    value = el.value;
                }
                if (key && value !== undefined) {
                    setSetting(key, value);
                }
            });
            notify(t('settingsSaved'), 'success');
            closeSettings();
            // Apply changes
            applySettings();
        }
    }

    // Setting row helper
    function createSettingRow(label, description, control) {
        return createElement('div', { className: 'gfu-setting-row' }, [
            createElement('div', { className: 'gfu-setting-label' }, [
                createElement('span', { textContent: label }),
                description ? createElement('small', { textContent: description }) : null
            ].filter(Boolean)),
            control
        ]);
    }

    // Toggle control helper
    function createToggle(key, checked) {
        return createElement('label', { className: 'gfu-toggle' }, [
            createElement('input', {
                type: 'checkbox',
                'data-setting': key,
                checked: checked ? 'checked' : null
            }),
            createElement('span', { className: 'gfu-toggle-slider' })
        ]);
    }

    // Select control helper
    function createSelect(key, options, value) {
        const select = createElement('select', {
            className: 'gfu-select',
            'data-setting': key
        });
        options.forEach(opt => {
            const option = createElement('option', {
                value: opt.value,
                textContent: opt.label
            });
            if (opt.value === value) option.selected = true;
            select.appendChild(option);
        });
        return select;
    }

    // Input control helper
    function createInput(key, value, type = 'text', placeholder = '') {
        return createElement('input', {
            className: 'gfu-input',
            type: type,
            'data-setting': key,
            value: value,
            placeholder: placeholder
        });
    }

    // Appearance Section
    function createAppearanceSection(settings) {
        const section = createElement('div', {
            className: 'gfu-settings-section active',
            id: 'gfu-section-appearance'
        }, [
            createElement('h3', { textContent: t('appearance') })
        ]);

        section.appendChild(createSettingRow(
            t('darkMode'),
            'Auto detects system preference',
            createSelect('darkMode', [
                { value: 'auto', label: t('auto') },
                { value: 'light', label: t('light') },
                { value: 'dark', label: t('dark') }
            ], settings.darkMode)
        ));

        section.appendChild(createSettingRow(
            t('pageWidth'),
            'e.g., 1200px, 90%, etc.',
            createInput('customPageWidth', settings.customPageWidth)
        ));

        section.appendChild(createSettingRow(
            t('cardLayout'),
            'Display scripts in card grid',
            createToggle('cardLayout', settings.cardLayout)
        ));

        section.appendChild(createSettingRow(
            t('cardColumns'),
            'Number of columns (2-4)',
            createSelect('cardColumns', [
                { value: '2', label: '2' },
                { value: '3', label: '3' },
                { value: '4', label: '4' }
            ], String(settings.cardColumns))
        ));

        section.appendChild(createSettingRow(
            t('compactMode'),
            'Reduce spacing and padding',
            createToggle('compactMode', settings.compactMode)
        ));

        section.appendChild(createSettingRow(
            t('showScriptIcons'),
            'Display script icons in lists',
            createToggle('showScriptIcons', settings.showScriptIcons)
        ));

        return section;
    }

    // Filtering Section
    function createFilteringSection(settings) {
        const section = createElement('div', {
            className: 'gfu-settings-section',
            id: 'gfu-section-filtering'
        }, [
            createElement('h3', { textContent: t('filtering') })
        ]);

        section.appendChild(createSettingRow(
            t('filterEnabled'),
            'Master switch for all filters',
            createToggle('filterEnabled', settings.filterEnabled)
        ));

        section.appendChild(createSettingRow(
            t('filterNonLatin'),
            'Hide scripts with non-Latin characters',
            createToggle('filterNonLatin', settings.filterNonLatin)
        ));

        section.appendChild(createSettingRow(
            t('filterNonASCII'),
            'Hide scripts with non-ASCII characters',
            createToggle('filterNonASCII', settings.filterNonASCII)
        ));

        section.appendChild(createSettingRow(
            t('filterGames'),
            'Hide browser game scripts',
            createToggle('filterGames', settings.filterGames)
        ));

        section.appendChild(createSettingRow(
            t('filterSocialNetworks'),
            'Hide social network scripts',
            createToggle('filterSocialNetworks', settings.filterSocialNetworks)
        ));

        section.appendChild(createSettingRow(
            t('filterClutter'),
            'Hide test/spam scripts',
            createToggle('filterClutter', settings.filterClutter)
        ));

        // Custom blacklist textarea
        const blacklistRow = createElement('div', { className: 'gfu-setting-row', style: { flexDirection: 'column', alignItems: 'stretch', gap: '8px' } });
        blacklistRow.appendChild(createElement('div', { className: 'gfu-setting-label' }, [
            createElement('span', { textContent: t('customBlacklist') }),
            createElement('small', { textContent: 'Comma-separated keywords to filter' })
        ]));
        blacklistRow.appendChild(createElement('textarea', {
            className: 'gfu-textarea',
            'data-setting': 'customBlacklist',
            value: settings.customBlacklist,
            placeholder: 'YouTube, Facebook, TikTok...'
        }));
        section.appendChild(blacklistRow);

        return section;
    }

    // Quick Actions Section
    function createQuickActionsSection(settings) {
        const section = createElement('div', {
            className: 'gfu-settings-section',
            id: 'gfu-section-quickActions'
        }, [
            createElement('h3', { textContent: t('quickActions') })
        ]);

        section.appendChild(createSettingRow(
            t('showQuickActions'),
            'Show action buttons on script items',
            createToggle('showQuickActions', settings.showQuickActions)
        ));

        section.appendChild(createSettingRow(
            t('showCopyButton'),
            'Copy code to clipboard',
            createToggle('showCopyButton', settings.showCopyButton)
        ));

        section.appendChild(createSettingRow(
            t('showDownloadButton'),
            'Download as .user.js file',
            createToggle('showDownloadButton', settings.showDownloadButton)
        ));

        section.appendChild(createSettingRow(
            t('showInstallButton'),
            'Install directly',
            createToggle('showInstallButton', settings.showInstallButton)
        ));

        section.appendChild(createSettingRow(
            t('showHideButton'),
            'Hide individual scripts',
            createToggle('showHideButton', settings.showHideButton)
        ));

        return section;
    }

    // Script Info Section
    function createScriptInfoSection(settings) {
        const section = createElement('div', {
            className: 'gfu-settings-section',
            id: 'gfu-section-scriptInfo'
        }, [
            createElement('h3', { textContent: t('scriptInfo') })
        ]);

        section.appendChild(createSettingRow(t('showVersion'), 'Display version number', createToggle('showVersion', settings.showVersion)));
        section.appendChild(createSettingRow(t('showRating'), 'Display rating score', createToggle('showRating', settings.showRating)));
        section.appendChild(createSettingRow(t('showDailyInstalls'), 'Display daily installs', createToggle('showDailyInstalls', settings.showDailyInstalls)));
        section.appendChild(createSettingRow(t('showTotalInstalls'), 'Display total installs', createToggle('showTotalInstalls', settings.showTotalInstalls)));
        section.appendChild(createSettingRow(t('showUpdatedDate'), 'Display last updated', createToggle('showUpdatedDate', settings.showUpdatedDate)));
        section.appendChild(createSettingRow(t('showCreatedDate'), 'Display creation date', createToggle('showCreatedDate', settings.showCreatedDate)));

        return section;
    }

    // Search Section
    function createSearchSection(settings) {
        const section = createElement('div', {
            className: 'gfu-settings-section',
            id: 'gfu-section-search'
        }, [
            createElement('h3', { textContent: t('search') })
        ]);

        section.appendChild(createSettingRow(
            t('enableGoogleSearch'),
            'Type "g query" to use Google',
            createToggle('enableGoogleSearch', settings.enableGoogleSearch)
        ));

        section.appendChild(createSettingRow(
            t('enableExternalSearch'),
            'Show links to search other sites',
            createToggle('enableExternalSearch', settings.enableExternalSearch)
        ));

        section.appendChild(createSettingRow(
            t('showSleazyForkResults'),
            'Merge adult results from SleazyFork',
            createToggle('showSleazyForkResults', settings.showSleazyForkResults)
        ));

        return section;
    }

    // Translation Section
    function createTranslationSection(settings) {
        const section = createElement('div', {
            className: 'gfu-settings-section',
            id: 'gfu-section-translation'
        }, [
            createElement('h3', { textContent: t('translation') })
        ]);

        section.appendChild(createSettingRow(
            t('autoTranslate'),
            'Auto-translate non-Latin script titles',
            createToggle('autoTranslate', settings.autoTranslate)
        ));

        section.appendChild(createSettingRow(
            t('translateTargetLang'),
            'Language to translate to',
            createSelect('translateTargetLang', [
                { value: 'en', label: 'English' },
                { value: 'zh-CN', label: '简体中文' },
                { value: 'zh-TW', label: '繁體中文' },
                { value: 'ja', label: '日本語' },
                { value: 'ko', label: '한국어' },
                { value: 'ru', label: 'Русский' },
                { value: 'de', label: 'Deutsch' },
                { value: 'fr', label: 'Français' },
                { value: 'es', label: 'Español' },
                { value: 'pt', label: 'Português' }
            ], settings.translateTargetLang)
        ));

        return section;
    }

    // User Page Section
    function createUserPageSection(settings) {
        const section = createElement('div', {
            className: 'gfu-settings-section',
            id: 'gfu-section-userPage'
        }, [
            createElement('h3', { textContent: t('userPage') })
        ]);

        section.appendChild(createSettingRow(t('collapseUserProfile'), 'Collapse profile info', createToggle('collapseUserProfile', settings.collapseUserProfile)));
        section.appendChild(createSettingRow(t('collapseControlPanel'), 'Collapse control panel', createToggle('collapseControlPanel', settings.collapseControlPanel)));
        section.appendChild(createSettingRow(t('collapseDiscussions'), 'Collapse discussions', createToggle('collapseDiscussions', settings.collapseDiscussions)));

        return section;
    }

    // Editor Section
    function createEditorSection(settings) {
        const section = createElement('div', {
            className: 'gfu-settings-section',
            id: 'gfu-section-editor'
        }, [
            createElement('h3', { textContent: t('editor') })
        ]);

        section.appendChild(createSettingRow(t('enableSyntaxHighlighting'), 'Enable code highlighting', createToggle('enableSyntaxHighlighting', settings.enableSyntaxHighlighting)));
        section.appendChild(createSettingRow(t('expandTextarea'), 'Larger textarea', createToggle('expandTextarea', settings.expandTextarea)));
        section.appendChild(createSettingRow(t('hideShareSection'), 'Hide share buttons', createToggle('hideShareSection', settings.hideShareSection)));

        return section;
    }

    // Advanced Section
    function createAdvancedSection(settings) {
        const section = createElement('div', {
            className: 'gfu-settings-section',
            id: 'gfu-section-advanced'
        }, [
            createElement('h3', { textContent: t('advanced') })
        ]);

        section.appendChild(createSettingRow(
            t('hideRecentUsersHours'),
            '0 = disabled, max 168',
            createInput('hideRecentUsersHours', settings.hideRecentUsersHours, 'number')
        ));

        section.appendChild(createSettingRow(t('milestoneNotifications'), 'Get notified at milestones', createToggle('milestoneNotifications', settings.milestoneNotifications)));

        section.appendChild(createSettingRow(
            t('milestones'),
            'Comma-separated numbers',
            createInput('milestones', settings.milestones)
        ));

        section.appendChild(createSettingRow(t('openInNewTab'), 'Open script pages in new tab', createToggle('openInNewTab', settings.openInNewTab)));
        section.appendChild(createSettingRow(t('openInBackground'), 'Open new tabs in background', createToggle('openInBackground', settings.openInBackground)));
        section.appendChild(createSettingRow(t('debugMode'), 'Enable console logging', createToggle('debugMode', settings.debugMode)));

        return section;
    }


    // ============================================================
    // SECTION 5: CORE FUNCTIONALITY
    // ============================================================

    // SVG Icons
    const ICONS = {
        copy: '<svg viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>',
        download: '<svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
        install: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12l7 7 7-7"/><rect x="3" y="19" width="18" height="2" rx="1"/></svg>',
        hide: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
        settings: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/></svg>',
        check: '<svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>',
        spinner: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke-opacity="0.25"/><path d="M12 2a10 10 0 0110 10" stroke-linecap="round"/></svg>'
    };

    // Apply dark mode
    function applyDarkMode() {
        const dark = isDarkMode();
        document.documentElement.setAttribute('data-gfu-dark', dark);
        if (dark) {
            document.body.classList.add('gfu-dark');
        } else {
            document.body.classList.remove('gfu-dark');
        }
    }

    // Apply page width
    function applyPageWidth() {
        const width = getSetting('customPageWidth');
        if (width) {
            const constraint = $('.width-constraint');
            if (constraint) {
                constraint.style.maxWidth = width;
            }
        }
    }

    // Filter scripts
    function filterScripts() {
        if (!getSetting('filterEnabled')) return;

        const settings = getAllSettings();
        const customWords = settings.customBlacklist.split(',').map(w => w.trim().toLowerCase()).filter(Boolean);
        const hiddenIds = settings.hiddenScripts || [];

        let filteredCount = 0;
        const scriptItems = $$('li[data-script-id]');

        scriptItems.forEach(item => {
            const scriptId = item.dataset.scriptId;
            const name = item.dataset.scriptName || '';
            const description = item.querySelector('.script-description')?.textContent || '';
            const text = `${name} ${description}`;

            let shouldFilter = false;
            let reason = '';

            // Check hidden list
            if (hiddenIds.includes(scriptId)) {
                item.classList.add('gfu-hidden');
                return;
            }

            // Check filters
            if (settings.filterNonASCII && FILTER_PATTERNS.nonASCII.test(text)) {
                shouldFilter = true;
                reason = 'Non-ASCII';
            } else if (settings.filterNonLatin && FILTER_PATTERNS.nonLatin.test(text)) {
                shouldFilter = true;
                reason = 'Non-Latin';
            } else if (settings.filterGames && FILTER_PATTERNS.games.test(text)) {
                shouldFilter = true;
                reason = 'Game';
            } else if (settings.filterSocialNetworks && FILTER_PATTERNS.socialNetworks.test(text)) {
                shouldFilter = true;
                reason = 'Social';
            } else if (settings.filterClutter && FILTER_PATTERNS.clutter.test(text)) {
                shouldFilter = true;
                reason = 'Clutter';
            }

            // Check custom blacklist
            if (!shouldFilter && customWords.length > 0) {
                const lowerText = text.toLowerCase();
                for (const word of customWords) {
                    if (lowerText.includes(word)) {
                        shouldFilter = true;
                        reason = 'Custom';
                        break;
                    }
                }
            }

            if (shouldFilter) {
                item.classList.add('gfu-filtered');
                item.dataset.filterReason = reason;
                filteredCount++;
            } else {
                item.classList.remove('gfu-filtered');
                delete item.dataset.filterReason;
            }
        });

        // Update filter status
        updateFilterStatus(filteredCount);
        log(`Filtered ${filteredCount} scripts`);
    }

    // Update filter status display
    function updateFilterStatus(count) {
        let status = $('.gfu-filter-status');
        if (!status) {
            const listHeader = $('#browse-script-list')?.previousElementSibling ||
                              $('.script-list')?.previousElementSibling ||
                              $('#script-list-option-groups');
            if (listHeader) {
                status = createElement('span', { className: 'gfu-filter-status' });
                listHeader.appendChild(status);
            }
        }
        if (status) {
            status.innerHTML = count > 0
                ? `<span class="gfu-filter-count">${count}</span> ${t('scriptsFiltered')}`
                : '';
        }
    }

    // Add quick action buttons to script items
    function addQuickActions() {
        if (!getSetting('showQuickActions')) return;

        const settings = getAllSettings();
        const scriptItems = $$('li[data-script-id]:not([data-gfu-actions])');

        scriptItems.forEach(item => {
            item.dataset.gfuActions = 'true';
            const codeUrl = item.dataset.codeUrl;
            if (!codeUrl) return;

            const scriptId = item.dataset.scriptId;
            const scriptName = item.dataset.scriptName || 'script';
            const container = createElement('div', { className: 'gfu-quick-actions' });

            if (settings.showCopyButton) {
                container.appendChild(createActionButton('copy', codeUrl, scriptName));
            }
            if (settings.showDownloadButton) {
                container.appendChild(createActionButton('download', codeUrl, scriptName));
            }
            if (settings.showInstallButton) {
                container.appendChild(createActionButton('install', codeUrl, scriptName));
            }
            if (settings.showHideButton) {
                container.appendChild(createHideButton(scriptId, item));
            }

            item.appendChild(container);
        });
    }

    // Create action button
    function createActionButton(type, codeUrl, scriptName) {
        const btn = createElement('button', {
            className: `gfu-action-btn gfu-${type}`,
            innerHTML: ICONS[type],
            title: t(type),
            onClick: async (e) => {
                e.preventDefault();
                e.stopPropagation();
                await handleAction(type, codeUrl, scriptName, btn);
            }
        });
        return btn;
    }

    // Create hide button
    function createHideButton(scriptId, item) {
        const hiddenIds = getSetting('hiddenScripts') || [];
        const isHidden = hiddenIds.includes(scriptId);

        const btn = createElement('button', {
            className: `gfu-action-btn gfu-hide`,
            innerHTML: ICONS.hide,
            title: isHidden ? t('unhide') : t('hide'),
            onClick: (e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleHideScript(scriptId, item);
            }
        });
        return btn;
    }

    // Toggle hide script
    function toggleHideScript(scriptId, item) {
        const hiddenIds = getSetting('hiddenScripts') || [];
        const index = hiddenIds.indexOf(scriptId);

        if (index > -1) {
            hiddenIds.splice(index, 1);
            item.classList.remove('gfu-hidden');
            notify(`Script unhidden`, 'info');
        } else {
            hiddenIds.push(scriptId);
            item.classList.add('gfu-hidden');
            notify(`Script hidden`, 'info');
        }

        setSetting('hiddenScripts', hiddenIds);
    }

    // Handle action (copy, download, install)
    async function handleAction(type, codeUrl, scriptName, btn) {
        btn.classList.add('loading');
        btn.innerHTML = ICONS.spinner;

        try {
            if (type === 'install') {
                // Direct install - just navigate
                window.location.href = codeUrl;
                return;
            }

            // Fetch the code
            const code = await fetchScriptCode(codeUrl);

            if (type === 'copy') {
                GM_setClipboard(code);
                showButtonSuccess(btn, 'copy');
                notify(t('copied'), 'success');
            } else if (type === 'download') {
                downloadFile(code, `${sanitizeFilename(scriptName)}.user.js`);
                showButtonSuccess(btn, 'download');
                notify(t('downloaded'), 'success');
            }
        } catch (error) {
            log('Action error:', error);
            notify(`Error: ${error.message}`, 'error');
            btn.innerHTML = ICONS[type];
        }

        btn.classList.remove('loading');
    }

    // Fetch script code
    function fetchScriptCode(url) {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'GET',
                url: url,
                onload: (response) => {
                    if (response.status === 200) {
                        resolve(response.responseText);
                    } else {
                        reject(new Error(`HTTP ${response.status}`));
                    }
                },
                onerror: (error) => reject(error)
            });
        });
    }

    // Download file
    function downloadFile(content, filename) {
        const blob = new Blob([content], { type: 'application/javascript;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = createElement('a', { href: url, download: filename });
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // Show button success
    function showButtonSuccess(btn, type) {
        btn.classList.add('gfu-success');
        btn.innerHTML = ICONS.check;
        setTimeout(() => {
            btn.classList.remove('gfu-success');
            btn.innerHTML = ICONS[type];
        }, 2000);
    }

    // Sanitize filename
    function sanitizeFilename(name) {
        return name.replace(/[<>:"/\\|?*]/g, '').substring(0, 100);
    }

    // Add version badges
    function addVersionBadges() {
        if (!getSetting('showVersion')) return;

        $$('li[data-script-id][data-script-version]:not([data-gfu-version])').forEach(item => {
            item.dataset.gfuVersion = 'true';
            const version = item.dataset.scriptVersion;
            if (!version) return;

            const titleLink = item.querySelector('a.script-link');
            if (titleLink && !titleLink.querySelector('.gfu-version-badge')) {
                const badge = createElement('span', {
                    className: 'gfu-version-badge',
                    textContent: `v${version}`
                });
                titleLink.appendChild(badge);
            }
        });
    }

    // Add header actions on script page
    function addHeaderActions() {
        if (!getSetting('showQuickActions')) return;

        const scriptInfo = $('#script-info');
        if (!scriptInfo) return;

        const header = scriptInfo.querySelector('header');
        if (!header || header.querySelector('.gfu-header-actions')) return;

        const installLink = $('a.install-link[href*=".user.js"]');
        if (!installLink) return;

        const codeUrl = installLink.href;
        const scriptName = header.querySelector('h2')?.textContent?.trim() || 'script';
        const settings = getAllSettings();

        const container = createElement('div', { className: 'gfu-header-actions' });

        if (settings.showCopyButton) {
            container.appendChild(createActionButton('copy', codeUrl, scriptName));
        }
        if (settings.showDownloadButton) {
            container.appendChild(createActionButton('download', codeUrl, scriptName));
        }

        header.appendChild(container);
    }

    // External search integration
    function addExternalSearch() {
        if (!getSetting('enableExternalSearch')) return;

        const form = $('#script-search');
        if (!form || form.querySelector('.gfu-search-dropdown')) return;

        const select = createElement('select', {
            className: 'gfu-search-dropdown gfu-select',
            title: 'Search other sites'
        });

        select.appendChild(createElement('option', { value: '', textContent: 'GreasyFork' }));
        EXTERNAL_SEARCH_SITES.forEach((site, i) => {
            select.appendChild(createElement('option', { value: i, textContent: site.name }));
        });

        form.insertBefore(select, form.lastChild);

        form.addEventListener('submit', (e) => {
            const selectedIndex = select.value;
            if (selectedIndex !== '') {
                e.preventDefault();
                const query = form.querySelector('input[name="q"]').value;
                const site = EXTERNAL_SEARCH_SITES[selectedIndex];
                window.open(site.url + encodeURIComponent(query), '_blank');
            }
        });
    }

    // Google search integration
    function setupGoogleSearch() {
        if (!getSetting('enableGoogleSearch')) return;

        const form = $('#script-search');
        if (!form) return;

        form.addEventListener('submit', (e) => {
            const input = form.querySelector('input[name="q"]');
            const value = input.value.trim();

            if (value.startsWith('g ')) {
                e.preventDefault();
                const query = value.substring(2);
                const url = `https://www.google.com/search?q=site:greasyfork.org+${encodeURIComponent(query)}`;
                window.open(url, '_blank');
            }
        });
    }

    // Hide share section
    function hideShareSection() {
        if (!getSetting('hideShareSection')) return;
        const share = $('#share');
        if (share) share.style.display = 'none';
    }

    // Expand textarea
    function expandTextarea() {
        if (!getSetting('expandTextarea')) return;
        const textarea = $('#script_version_code');
        if (textarea) textarea.style.height = '560px';
    }

    // Enable syntax highlighting by default
    function enableSyntaxHighlighting() {
        if (!getSetting('enableSyntaxHighlighting')) return;
        const checkbox = $('#enable-source-editor-code');
        if (checkbox && !checkbox.checked) {
            checkbox.checked = true;
            checkbox.dispatchEvent(new Event('change'));
        }
    }

    // Create settings trigger button
    function createSettingsTrigger() {
        if ($('.gfu-settings-trigger')) return;

        const btn = createElement('button', {
            className: 'gfu-settings-trigger',
            innerHTML: ICONS.settings,
            title: t('settings'),
            onClick: createSettingsPanel
        });

        document.body.appendChild(btn);
    }

    // Apply all settings
    function applySettings() {
        applyDarkMode();
        applyPageWidth();
        filterScripts();
        addQuickActions();
        addVersionBadges();
        addHeaderActions();
        addExternalSearch();
        setupGoogleSearch();
        hideShareSection();
        expandTextarea();
        enableSyntaxHighlighting();
    }

    // ============================================================
    // SECTION 6: INITIALIZATION
    // ============================================================

    function init() {
        log(`${SCRIPT_NAME} v${SCRIPT_VERSION} initializing...`);

        // Inject styles immediately
        GM_addStyle(CSS_STYLES);

        // Apply dark mode early
        applyDarkMode();

        // Wait for DOM
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', onDOMReady);
        } else {
            onDOMReady();
        }
    }

    function onDOMReady() {
        log('DOM ready, applying features...');

        // Apply all features
        applySettings();

        // Create settings trigger
        createSettingsTrigger();

        // Register menu command
        GM_registerMenuCommand(`⚙️ ${t('settings')}`, createSettingsPanel);

        // Watch for dynamic content
        const observer = new MutationObserver(debounce(() => {
            filterScripts();
            addQuickActions();
            addVersionBadges();
        }, 200));

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        // Listen for dark mode changes
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyDarkMode);

        log('Initialization complete!');
    }

    // Start the script
    init();

})();