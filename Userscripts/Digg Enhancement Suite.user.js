// ==UserScript==
// @name         Digg Enhancement Suite
// @namespace    http://tampermonkey.net/
// @version      4.0
// @description  Adds multiple themes (Dark, Liquid Glass, Catppuccin, Classic Digg), a redesigned keyword filter, a "Squarify" mode, and a collapsible/lockable sidebar to the Digg Beta.
// @author       Your Name & Gemini
// @match        https://beta.digg.com/*
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_listValues
// @grant        GM_deleteValue
// ==/UserScript==

(function() {
    'use strict';

    // --- 1. STYLES ---
    GM_addStyle(`
        /* --- Settings Modal & General UI --- */
        .des-modal { display: none; position: fixed; z-index: 1001; left: 0; top: 0; width: 100%; height: 100%; overflow: auto; background-color: rgba(0,0,0,0.5); backdrop-filter: blur(4px); }
        .des-modal-content { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background-color: #fff; margin: 5% auto; padding: 24px; border: 1px solid #dee2e6; width: 90%; max-width: 680px; border-radius: 16px; box-shadow: 0 10px 25px rgba(0,0,0,0.1); }
        .des-modal-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e9ecef; padding-bottom: 16px; margin-bottom: 20px; }
        .des-modal-header h2 { margin: 0; font-size: 1.5em; color: #212529; }
        .des-modal-header .des-close-button { font-size: 24px; font-weight: bold; color: #6c757d; cursor: pointer; background: none; border: none; }
        .des-modal-content h3 { margin-top: 24px; margin-bottom: 16px; font-size: 1.1em; color: #495057; border-bottom: 1px solid #e9ecef; padding-bottom: 8px;}
        .des-modal-footer { text-align: center; margin-top: 24px; padding-top: 16px; border-top: 1px solid #e9ecef; }
        .des-modal-footer p { margin: 0; font-style: italic; color: #6c757d; }

        /* Generic UI Components */
        .des-setting-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; gap: 16px; }
        .des-setting-row label { color: #212529; font-size: 1em; }
        .des-select-wrapper { position: relative; display: inline-block; }
        .des-select-wrapper select { -webkit-appearance: none; -moz-appearance: none; appearance: none; background-color: #f8f9fa; border: 1px solid #ced4da; border-radius: 8px; padding: 8px 32px 8px 12px; font-size: 1em; cursor: pointer; min-width: 200px; }
        .des-select-wrapper::after { content: '▾'; font-size: 1.2em; color: #6c757d; position: absolute; right: 12px; top: 50%; transform: translateY(-50%); pointer-events: none; }
        .des-toggle-switch { position: relative; display: inline-block; width: 50px; height: 28px; }
        .des-toggle-switch input { opacity: 0; width: 0; height: 0; }
        .des-slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #ccc; transition: .4s; border-radius: 28px; }
        .des-slider:before { position: absolute; content: ""; height: 20px; width: 20px; left: 4px; bottom: 4px; background-color: white; transition: .4s; border-radius: 50%; }
        input:checked + .des-slider { background-color: #2563eb; }
        input:checked + .des-slider:before { transform: translateX(22px); }

        /* --- Keyword Filter UI --- */
        #des-keyword-filter-ui { display: flex; flex-wrap: wrap; align-items: flex-start; gap: 12px; }
        #des-keyword-input-group { display: flex; flex-grow: 1; min-width: 250px; }
        #des-keyword-input { flex-grow: 1; border: 1px solid #ced4da; border-right: 0; padding: 10px; font-size: 1em; border-radius: 8px 0 0 8px; }
        #des-keyword-input:focus { outline: none; border-color: #2563eb; box-shadow: 0 0 0 1px #2563eb; }
        #des-add-keyword-btn { padding: 10px 15px; border: 1px solid #2563eb; background-color: #2563eb; color: white; font-weight: bold; cursor: pointer; border-radius: 0 8px 8px 0; transition: background-color 0.2s; }
        #des-add-keyword-btn:hover { background-color: #1d4ed8; }
        #des-keyword-list { display: flex; flex-wrap: wrap; gap: 8px; flex-basis: 100%; margin-top: 8px; }
        .des-keyword-tag { display: flex; align-items: center; background-color: #e9ecef; color: #495057; padding: 6px 10px; border-radius: 16px; font-size: 0.9em; }
        .des-keyword-tag button { background: none; border: none; color: #6c757d; font-size: 1.2em; cursor: pointer; margin-left: 6px; padding: 0; line-height: 1; }
        .des-keyword-tag button:hover { color: #212529; }

        /* --- Collapsible Sidebar & Layout Fixes --- */
        body.des-sidebar-enabled aside.py-10.pl-4 { position: fixed !important; right: 0 !important; transform: translateX(calc(100% - 40px)); transition: transform 0.3s ease, top 0.3s, height 0.3s; z-index: 49; display: flex !important; align-items: center; padding-left: 0 !important; margin-right: 0 !important; background-color: #fff; box-shadow: -10px 0 20px rgba(0,0,0,0.2); }
        .des-sidebar-handle { width: 40px; height: 100%; background-image: linear-gradient(to bottom, #2563eb, #1d4ed8); box-shadow: inset 1px 0 4px rgba(0,0,0,0.3); display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer; flex-shrink: 0; position: relative; transition: all 0.3s; }
        .des-sidebar-handle svg { color: white; width: 24px; height: 24px; }
        .des-lock-button { position: absolute; top: 50px; background: none; border: none; padding: 10px 0; cursor: pointer; }
        .des-chevron-icon { position: absolute; top: calc(50% - 12px); }
        body.des-sidebar-enabled aside.py-10.pl-4:hover { transform: translateX(0); }
        body.des-sidebar-locked aside.py-10.pl-4 { transform: translateX(0) !important; }
        /* Layout Fix */
        body.des-sidebar-locked main, body.des-sidebar-locked header.sticky { transition: margin-right 0.35s ease-in-out; margin-right: 404px !important; }
        html.des-theme-dark body.des-sidebar-enabled aside.py-10.pl-4 { background-color: var(--dark-surface-1, #1E1E1E) !important; }

        /* --- Feature: Squarify --- */
        body.des-squarify-enabled img,
        body.des-squarify-enabled .rounded-full { border-radius: 4px !important; }

        /* --- THEME: Dark --- */
        html.des-theme-dark {
            --dark-bg: #121212; --dark-surface-1: #1E1E1E; --dark-surface-2: #2a2a2e; --dark-border: #333538; --dark-text-primary: #EAEAEA; --dark-text-secondary: #9E9E9E; --dark-accent: #3b82f6; --dark-accent-hover: #60a5fa;
            color-scheme: dark;
        }
        html.des-theme-dark body { background-color: var(--dark-bg) !important; color: var(--dark-text-primary) !important; }
        html.des-theme-dark header.sticky, html.des-theme-dark aside .rounded-xl.border { background-color: var(--dark-surface-1) !important; border-color: var(--dark-border) !important; }
        html.des-theme-dark header img[src="/digg.svg"] { filter: invert(1); }
        html.des-theme-dark input, html.des-theme-dark .relative.p-\\[5px\\] article.bg-white, html.des-theme-dark footer button.bg-white, html.des-theme-dark .bg-neutral-50 { background-color: var(--dark-surface-2) !important; }
        html.des-theme-dark .text-neutral-900, html.des-theme-dark .text-neutral-700, html.des-theme-dark h1, html.des-theme-dark h2, html.des-theme-dark h3, html.des-theme-dark h4 { color: var(--dark-text-primary) !important; }
        html.des-theme-dark .text-neutral-600, html.des-theme-dark p, html.des-theme-dark span:not([class*="text-white"]){ color: var(--dark-text-secondary) !important; }
        html.des-theme-dark main section.xl\\:border-r, html.des-theme-dark .border-neutral-100, html.des-theme-dark .border-neutral-200 { border-color: var(--dark-border) !important; }
        html.des-theme-dark a .group-hover\\:text-blue-600, html.des-theme-dark .text-text-brand-default { color: var(--dark-accent) !important; }
        html.des-theme-dark a:hover .group-hover\\:text-blue-600, html.des-theme-dark a:hover .text-text-brand-default { color: var(--dark-accent-hover) !important; }
        html.des-theme-dark .bg-gradient-to-r, html.des-theme-dark .bg-gradient-to-l { background-image: none !important; }

        /* --- THEME: Liquid Glass --- */
        html.des-theme-glass { color-scheme: dark; }
        html.des-theme-glass body { background: #1a202c url('https://images.unsplash.com/photo-1553095066-5014bc7b7f2d?q=80&w=2400') center/cover fixed !important; color: #f7fafc !important; }
        html.des-theme-glass header.sticky, html.des-theme-glass aside .rounded-xl.border, html.des-theme-glass .relative.p-\\[5px\\] article.bg-white, html.des-theme-glass .bg-neutral-50, html.des-theme-glass footer button.bg-white {
            background-color: rgba(26, 32, 44, 0.7) !important; backdrop-filter: blur(10px) !important; -webkit-backdrop-filter: blur(10px) !important; border: 1px solid rgba(255, 255, 255, 0.15) !important; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        html.des-theme-glass header img[src="/digg.svg"] { filter: invert(1) brightness(1.5); }
        html.des-theme-glass .text-neutral-900, html.des-theme-glass .text-neutral-700, html.des-theme-glass h1, html.des-theme-glass h2, html.des-theme-glass h3, html.des-theme-glass h4 { color: #edf2f7 !important; }
        html.des-theme-glass .text-neutral-600, html.des-theme-glass p { color: #a0aec0 !important; }
        html.des-theme-glass a .group-hover\\:text-blue-600 { color: #63b3ed !important; }
        html.des-theme-glass a:hover .group-hover\\:text-blue-600 { color: #90cdf4 !important; }
        html.des-theme-glass main section.xl\\:border-r, html.des-theme-glass .border-neutral-100 { border-color: rgba(255, 255, 255, 0.1) !important; }

        /* --- THEME: Catppuccin (Mocha) --- */
        html.des-theme-cat-mocha {
            --base: #1e1e2e; --mantle: #181825; --crust: #11111b; --text: #cdd6f4; --subtext0: #a6adc8; --overlay2: #9399b2; --surface0: #313244; --surface1: #45475a; --blue: #89b4fa; --mauve: #cba6f7;
            color-scheme: dark;
        }
        html.des-theme-cat-mocha body { background-color: var(--base) !important; color: var(--text) !important; }
        html.des-theme-cat-mocha header.sticky, html.des-theme-cat-mocha aside .rounded-xl.border { background-color: var(--crust) !important; border-color: var(--surface0) !important; }
        html.des-theme-cat-mocha .relative.p-\\[5px\\] article.bg-white, html.des-theme-cat-mocha .bg-neutral-50, html.des-theme-cat-mocha footer button.bg-white { background-color: var(--mantle) !important; }
        html.des-theme-cat-mocha header img[src="/digg.svg"] { filter: invert(1); }
        html.des-theme-cat-mocha h1, html.des-theme-cat-mocha h2, html.des-theme-cat-mocha h3 { color: var(--mauve) !important; }
        html.des-theme-cat-mocha .text-neutral-900, html.des-theme-cat-mocha .text-neutral-700 { color: var(--text) !important; }
        html.des-theme-cat-mocha .text-neutral-600, html.des-theme-cat-mocha p { color: var(--subtext0) !important; }
        html.des-theme-cat-mocha a .group-hover\\:text-blue-600 { color: var(--blue) !important; }
        html.des-theme-cat-mocha main section.xl\\:border-r, html.des-theme-cat-mocha .border-neutral-100 { border-color: var(--surface1) !important; }

        /* --- THEME: Catppuccin (Latte) --- */
        html.des-theme-cat-latte {
            --base: #eff1f5; --crust: #dce0e8; --mantle: #e6e9ef; --text: #4c4f69; --subtext0: #6c6f85; --surface2: #ccd0da; --mauve: #8839ef; --blue: #1e66f5;
            color-scheme: light;
        }
        html.des-theme-cat-latte body { background-color: var(--base) !important; color: var(--text) !important; }
        html.des-theme-cat-latte header.sticky, html.des-theme-cat-latte aside .rounded-xl.border { background-color: var(--crust) !important; border-color: var(--surface2) !important; }
        html.des-theme-cat-latte .relative.p-\\[5px\\] article.bg-white, html.des-theme-cat-latte .bg-neutral-50, html.des-theme-cat-latte footer button.bg-white { background-color: var(--mantle) !important; }
        html.des-theme-cat-latte h1, html.des-theme-cat-latte h2, html.des-theme-cat-latte h3 { color: var(--mauve) !important; }
        html.des-theme-cat-latte .text-neutral-900, html.des-theme-cat-latte .text-neutral-700 { color: var(--text) !important; }
        html.des-theme-cat-latte .text-neutral-600, html.des-theme-cat-latte p { color: var(--subtext0) !important; }
        html.des-theme-cat-latte a .group-hover\\:text-blue-600 { color: var(--blue) !important; }
        html.des-theme-cat-latte main section.xl\\:border-r, html.des-theme-cat-latte .border-neutral-100 { border-color: var(--surface2) !important; }

        /* --- THEME: Classic Digg --- */
        html.des-theme-classic { font-family: Arial, Helvetica, sans-serif !important; }
        html.des-theme-classic body { background-color: #fff !important; }
        html.des-theme-classic header.sticky { background-color: #00519A !important; }
        html.des-theme-classic header img[src="/digg.svg"] { filter: brightness(0) invert(1); }
        html.des-theme-classic .text-neutral-900, html.des-theme-classic h3 { color: #00519A !important; font-weight: bold; }
        html.des-theme-classic .text-neutral-600, html.des-theme-classic p { color: #333 !important; font-size: 1em; }
        html.des-theme-classic .relative.p-\\[5px\\] article.bg-white { background-color: #f0f0f0 !important; border: 1px solid #ccc !important; border-radius: 3px !important; }
        html.des-theme-classic a { color: #00519A !important; text-decoration: none !important; }
        html.des-theme-classic a:hover { text-decoration: underline !important; }
    `);

    // --- 2. FEATURE LOGIC ---

    function applyFeatures() {
        const theme = GM_getValue('des_theme', 'light');
        document.documentElement.className = document.documentElement.className.replace(/\bdes-theme-\S+/g, '');
        if (theme !== 'light') {
            document.documentElement.classList.add(`des-theme-${theme}`);
        }

        const sidebarEnabled = GM_getValue('des_sidebar', false);
        document.body.classList.toggle('des-sidebar-enabled', sidebarEnabled);
        if(sidebarEnabled) {
             const sidebarLocked = GM_getValue('des_sidebarLocked', false);
             document.body.classList.toggle('des-sidebar-locked', sidebarLocked);
        } else {
             document.body.classList.remove('des-sidebar-locked');
        }

        const squarifyEnabled = GM_getValue('des_squarify', false);
        document.body.classList.toggle('des-squarify-enabled', squarifyEnabled);

        const aside = document.querySelector('aside.py-10.pl-4.hidden.xl\\:block');
        if (sidebarEnabled && aside) {
            const header = document.querySelector('header.sticky.top-0.z-50');
            const headerHeight = header ? header.offsetHeight : 0;
            aside.style.top = `${headerHeight}px`;
            aside.style.height = `calc(100vh - ${headerHeight}px)`;

            if (!document.getElementById('des-sidebar-handle')) {
                const handle = document.createElement('div');
                handle.id = 'des-sidebar-handle';
                handle.className = 'des-sidebar-handle';
                handle.innerHTML = `<svg class="des-chevron-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" /></svg>`;
                aside.prepend(handle);
                handle.addEventListener('click', () => {
                     GM_setValue('des_sidebarLocked', !GM_getValue('des_sidebarLocked', false));
                     applyFeatures();
                });
            }
        }
    }

    function applyKeywordFilter() {
        const keywords = GM_getValue('des_keywords', []);
        document.querySelectorAll('section.relative.flex.gap-6.filtered-post').forEach(post => post.classList.remove('filtered-post'));
        if (!keywords || keywords.length === 0) return;

        const posts = document.querySelectorAll('section.relative.flex.gap-6');
        posts.forEach(post => {
            const postText = (post.querySelector('h3')?.innerText + ' ' + post.querySelector('p')?.innerText).toLowerCase();
            if (keywords.some(keyword => postText.includes(keyword.toLowerCase()))) {
                post.classList.add('filtered-post');
            }
        });
    }

    // --- 3. UI SETUP ---
    function addSettingsUI() {
        if (document.getElementById('des-cog')) return;
        const masthead = document.querySelector('aside > section.flex.items-center.gap-2');
        if (!masthead) return;

        const settingsCog = document.createElement('button');
        settingsCog.innerHTML = '⚙️';
        settingsCog.id = 'des-cog';
        settingsCog.title = 'Digg Enhancement Suite Settings';
        settingsCog.style.cssText = 'font-size: 24px; background: none; border: none; cursor: pointer; margin-left: 10px; padding: 5px; line-height: 1;';
        masthead.appendChild(settingsCog);

        const modalHTML = `
            <div class="des-modal-content">
                <div class="des-modal-header">
                    <h2>Digg Enhancement Suite</h2>
                    <button class="des-close-button">&times;</button>
                </div>

                <h3>Appearance</h3>
                <div class="des-setting-row">
                    <label for="des-theme-select">Theme</label>
                    <div class="des-select-wrapper">
                        <select id="des-theme-select">
                            <option value="light">Light</option>
                            <option value="dark">Dark</option>
                            <option value="glass">Liquid Glass</option>
                            <option value="cat-latte">Catppuccin Latte</option>
                            <option value="cat-mocha">Catppuccin Mocha</option>
                            <option value="classic">Classic Digg</option>
                        </select>
                    </div>
                </div>
                <div class="des-setting-row">
                    <label for="des-squarify-toggle">Squarify Elements (convert circles to squares)</label>
                    <label class="des-toggle-switch"><input type="checkbox" id="des-squarify-toggle"><span class="des-slider"></span></label>
                </div>

                <h3>Functionality</h3>
                <div class="des-setting-row">
                    <label for="des-sidebar-toggle">Enable Collapsible Sidebar</label>
                    <label class="des-toggle-switch"><input type="checkbox" id="des-sidebar-toggle"><span class="des-slider"></span></label>
                </div>

                <h3>Keyword Filter</h3>
                <div id="des-keyword-filter-ui">
                    <div id="des-keyword-input-group">
                        <input type="text" id="des-keyword-input" placeholder="Add a keyword...">
                        <button id="des-add-keyword-btn">Add</button>
                    </div>
                    <div id="des-keyword-list"></div>
                </div>

                <div class="des-modal-footer">
                    <p>DES v4.0</p>
                </div>
            </div>`;

        const modal = document.createElement('div');
        modal.id = 'des-modal';
        modal.className = 'des-modal';
        modal.innerHTML = modalHTML;
        document.body.appendChild(modal);

        // --- Event Listeners & UI Logic ---
        const themeSelect = modal.querySelector('#des-theme-select');
        const squarifyToggle = modal.querySelector('#des-squarify-toggle');
        const sidebarToggle = modal.querySelector('#des-sidebar-toggle');
        const keywordInput = modal.querySelector('#des-keyword-input');
        const addKeywordBtn = modal.querySelector('#des-add-keyword-btn');
        const keywordListDiv = modal.querySelector('#des-keyword-list');

        const renderKeywords = () => {
            const keywords = GM_getValue('des_keywords', []);
            keywordListDiv.innerHTML = '';
            keywords.forEach(keyword => {
                const tag = document.createElement('span');
                tag.className = 'des-keyword-tag';
                tag.textContent = keyword;
                const removeBtn = document.createElement('button');
                removeBtn.innerHTML = '&times;';
                removeBtn.title = `Remove "${keyword}"`;
                removeBtn.onclick = () => {
                    const currentKeywords = GM_getValue('des_keywords', []);
                    const newKeywords = currentKeywords.filter(k => k !== keyword);
                    GM_setValue('des_keywords', newKeywords);
                    renderKeywords();
                };
                tag.appendChild(removeBtn);
                keywordListDiv.appendChild(tag);
            });
        };

        const addKeyword = () => {
            const newKeyword = keywordInput.value.trim();
            if (newKeyword) {
                const keywords = GM_getValue('des_keywords', []);
                if (!keywords.includes(newKeyword)) {
                    keywords.push(newKeyword);
                    GM_setValue('des_keywords', keywords);
                    renderKeywords();
                }
                keywordInput.value = '';
            }
        };

        addKeywordBtn.addEventListener('click', addKeyword);
        keywordInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') addKeyword(); });

        themeSelect.addEventListener('change', () => {
            GM_setValue('des_theme', themeSelect.value);
            applyFeatures();
        });

        squarifyToggle.addEventListener('change', () => {
            GM_setValue('des_squarify', squarifyToggle.checked);
            applyFeatures();
        });

        sidebarToggle.addEventListener('change', () => {
            GM_setValue('des_sidebar', sidebarToggle.checked);
            applyFeatures();
        });

        const openModal = () => {
            themeSelect.value = GM_getValue('des_theme', 'light');
            squarifyToggle.checked = GM_getValue('des_squarify', false);
            sidebarToggle.checked = GM_getValue('des_sidebar', false);
            renderKeywords();
            modal.style.display = 'block';
        };

        const closeModal = () => {
            applyKeywordFilter();
            modal.style.display = 'none';
        };

        settingsCog.addEventListener('click', openModal);
        modal.querySelector('.des-close-button').addEventListener('click', closeModal);
        window.addEventListener('click', (event) => { if (event.target == modal) closeModal(); });
    }

    // --- 4. MAIN EXECUTION ---
    function run() {
        addSettingsUI();
        applyFeatures();
        applyKeywordFilter();
    }

    // Run on page load and observe for dynamic content changes
    const observer = new MutationObserver(run);
    observer.observe(document.body, { childList: true, subtree: true });

    // A fallback run in case the observer is slow to fire
    if (document.readyState === 'loading') {
        window.addEventListener('DOMContentLoaded', run);
    } else {
        run();
    }
})();
