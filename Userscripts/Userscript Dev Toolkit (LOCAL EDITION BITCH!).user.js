// ==UserScript==
// @name         Userscript Dev Toolkit (LOCAL EDITION BITCH!)
// @namespace    https://github.com/SysAdminDoc/Userscript-Dev-Toolkit
// @version      5.3.5
// @description  A professional, customizable, and AI-powered toolkit for userscript development with an advanced filter generator.
// @author       Matthew Parker (Major Refactor by Gemini)
// @match        file:///*
// @exclude      http://*
// @exclude      https://*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_addStyle
// @grant        GM_info
// @grant        GM_download
// @grant        GM_registerMenuCommand
// @grant        GM_xmlhttpRequest
// @grant        GM_setClipboard
// @grant        GM_listValues
// @run-at       document-start
// @license      MIT
// ==/UserScript==

(function() {
    'use strict';

    // --- Safe GM_* Wrappers ---
    const safeGM = (fn, fallback) => typeof fn === 'function' ? fn : fallback;
    const GM = {
        getValue: safeGM(GM_getValue, async (key, def) => def),
        setValue: safeGM(GM_setValue, async () => {}),
        addStyle: safeGM(GM_addStyle, (css) => { const style = document.createElement('style'); style.textContent = css; document.head.appendChild(style); }),
        download: safeGM(GM_download, () => console.warn('GM_download not supported')),
        xmlhttpRequest: safeGM(GM_xmlhttpRequest, () => console.warn('GM_xmlhttpRequest not supported')),
        setClipboard: safeGM(GM_setClipboard, (data) => navigator.clipboard.writeText(data)),
        listValues: safeGM(GM_listValues, () => []),
        registerMenuCommand: safeGM(GM_registerMenuCommand, () => console.warn('GM_registerMenuCommand not supported')),
    };

    // --- HELPER FUNCTIONS ---
    const qs = (selector, parent = document) => parent.querySelector(selector);
    const qsa = (selector, parent = document) => parent.querySelectorAll(selector);
    const clamp = (val, min, max) => Math.max(min, Math.min(val, max));
    const clearElement = (el) => { while (el.firstChild) { el.removeChild(el.firstChild); } };
    const createElement = (tag, classes = [], attributes = {}, text = '') => {
        const el = document.createElement(tag);
        if (classes.length) el.classList.add(...classes.filter(Boolean));
        Object.entries(attributes).forEach(([key, value]) => el.setAttribute(key, value));
        if (text) el.textContent = text;
        el.setAttribute('data-devtoolkit', 'true');
        return el;
    };
    const colorUtils = {
        hexToRgb: (hex) => {
            let result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            return result ? `rgb(${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)})` : null;
        },
        hexToHsl: (hex) => {
            let result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            if (!result) return null;
            let r = parseInt(result[1], 16) / 255, g = parseInt(result[2], 16) / 255, b = parseInt(result[3], 16) / 255;
            let max = Math.max(r, g, b), min = Math.min(r, g, b);
            let h, s, l = (max + min) / 2;
            if (max === min) { h = s = 0; }
            else {
                let d = max - min;
                s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
                switch (max) {
                    case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                    case g: h = (b - r) / d + 2; break;
                    case b: h = (r - g) / d + 4; break;
                }
                h /= 6;
            }
            return `hsl(${Math.round(h * 360)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`;
        }
    };

    class DevToolkit {
        constructor() {
            this.id = 'userscript-dev-toolkit';
            this.isLocked = false;
            this.isPickerActive = false;
            this.onPickerClickCallback = null;
            this.lastHighlightedElement = null;
            this.countdownInterval = null;
            this.toastTimeout = null;
            this.devToolsCheckInterval = null;

            this.settings = new SettingsManager(this);
            this.components = {};

            this.componentDefinitions = [
                AIComponent,
                InspectorComponent,
                HtmlStripperComponent,
                uBlockComponent,
                CSSViewerComponent,
                CSSToolsComponent,
                DebuggerComponent,
            ];
        }

        async init() {
            console.log('DevToolkit initializing for:', window.location.href);
            this.el = createElement('div', [], { id: this.id });
            console.log('Element created:', this.el);
            this.registerComponents();
            await this.settings.load();
            this.injectCoreMarkup();
            this.injectStyles();
            this.renderTabs();
            this.renderActiveContent();
            this.applyPreferences();
            this.bindCoreEvents();
            this.showToast(`Dev Toolkit v5.3.5 Initialized.`, 2000);
        }

        injectCoreMarkup() {
            const toast = createElement('div', ['toast-container'], { id: `${this.id}-toast` });
            const handle = createElement('div', [], { id: `${this.id}-handle`, title: 'Show Dev Toolkit' }, '🛠️');
            const resizer = createElement('div', [], { id: `${this.id}-resizer`, title: 'Resize Panel' });
            const mainContainer = createElement('div', ['main-container'], { id: `${this.id}-main-container` });
            const tabsContainer = createElement('div', ['tabs-container'], { id: `${this.id}-tabs-container` });
            const contentWrapper = createElement('div', ['content-wrapper'], { id: `${this.id}-content-wrapper` });
            const header = createElement('div', [], { id: `${this.id}-header` });
            const title = createElement('span', [], { id: `${this.id}-title` }, 'Dev Toolkit');
            const headerButtons = createElement('div', ['header-buttons'], { id: `${this.id}-header-buttons` });
            headerButtons.append(
                createElement('button', ['header-icon-btn'], { id: `${this.id}-side-switch-btn`, title: 'Switch Side' }, '↔️'),
                createElement('button', ['header-icon-btn'], { id: `${this.id}-lock-btn`, title: 'Lock Panel Open' }, '🔓'),
                createElement('button', ['header-icon-btn'], { id: `${this.id}-settings-btn`, title: 'Settings' }, '⚙️')
            );
            header.append(title, headerButtons);
            const content = createElement('div', [], { id: `${this.id}-content` });
            const settingsMenu = createElement('div', ['settings-menu'], { id: `${this.id}-settings-menu` });
            settingsMenu.style.display = 'none';

            contentWrapper.append(header, content, settingsMenu);
            mainContainer.append(tabsContainer, contentWrapper);
            this.el.append(toast, handle, resizer, mainContainer);
            document.body.appendChild(this.el);
        }

        injectStyles() {
            GM.addStyle(`
                :root {
                    --bg: #202124; --bg-alt: #2d2e30; --fg: #e8eaed; --border: #5f6368;
                    --accent: #8ab4f8; --accent-fg: #202124; --shadow: rgba(0,0,0,0.5);
                    --error: #f48a8a; --selected: #1a73e8;
                    --panel-width: 450px; --tabs-width: 60px;
                }
                #${this.id} {
                    position: fixed; z-index: 9999999; top: 0; height: 100vh;
                    width: var(--panel-width);
                    transition: transform 0.3s ease-in-out;
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
                    font-size: 14px;
                    color: var(--fg);
                }
                #${this.id} * { box-sizing: border-box; }
                #${this.id}.left { left: 0; transform: translateX(calc(-1 * var(--panel-width))); }
                #${this.id}.right { right: 0; transform: translateX(var(--panel-width)); }
                #${this.id}.expanded { transform: translateX(0); }
                .main-container { display: flex; height: 100%; width: 100%; background-color: var(--bg); box-shadow: 0 0 20px var(--shadow); }
                #${this.id}-resizer {
                    position: absolute; top: 0; height: 100%; width: 5px; cursor: col-resize; z-index: 10;
                }
                #${this.id}.left #${this.id}-resizer { right: -2.5px; }
                #${this.id}.right #${this.id}-resizer { left: -2.5px; }
                #${this.id}-handle {
                    position: absolute; top: 50%; transform: translateY(-50%);
                    width: 25px; height: 60px; background-color: var(--accent); color: var(--accent-fg);
                    cursor: pointer; display: flex; align-items: center; justify-content: center;
                    font-size: 20px; box-shadow: 2px 0 8px var(--shadow); border-radius: 0 8px 8px 0;
                }
                #${this.id}.left #${this.id}-handle { right: -25px; border-radius: 0 8px 8px 0; }
                #${this.id}.right #${this.id}-handle { left: -25px; border-radius: 8px 0 0 8px; }
                .tabs-container {
                    width: var(--tabs-width); flex-shrink: 0; background-color: var(--bg-alt);
                    display: flex; flex-direction: column; padding-top: 10px;
                    border-right: 1px solid var(--border); user-select: none;
                }
                #${this.id}.right .tabs-container { border-right: none; border-left: 1px solid var(--border); order: 2; }
                .tab-btn {
                    padding: 12px 5px; background: transparent; color: var(--fg); border: none;
                    cursor: pointer; opacity: 0.6; transition: all 0.2s;
                    display: flex; flex-direction: column; align-items: center; justify-content: center;
                    gap: 4px; font-size: 11px; text-align: center; border-left: 3px solid transparent;
                }
                .tab-btn.dragging { opacity: 0.4; }
                .tab-btn.drag-over { border-top: 2px solid var(--accent); }
                .tab-btn:hover { opacity: 1; background-color: var(--border); }
                .tab-btn.active { opacity: 1; font-weight: bold; background-color: var(--bg); border-left-color: var(--accent); }
                .tab-btn .picker-active-dot { width: 8px; height: 8px; background-color: #ff4136; border-radius: 50%; animation: pulse 1s infinite; }
                .content-wrapper { flex-grow: 1; display: flex; flex-direction: column; overflow: hidden; }
                #${this.id}-header {
                    padding: 8px 12px; background-color: var(--bg-alt); border-bottom: 1px solid var(--border);
                    display: flex; justify-content: space-between; align-items: center; flex-shrink: 0;
                }
                #${this.id}-title { font-weight: bold; }
                .header-buttons { display: flex; align-items: center; gap: 5px; }
                .header-icon-btn { cursor: pointer; background: none; border: none; color: var(--fg); font-size: 18px; opacity: 0.7; padding: 4px; border-radius: 4px; line-height: 1; }
                .header-icon-btn:hover { opacity: 1; background-color: var(--border); }
                .header-icon-btn.locked { color: var(--accent); opacity: 1; }
                #${this.id}-content { padding: 15px; overflow-y: auto; flex-grow: 1; display: flex; flex-direction: column;}
                .tab-content { display: none; height: 100%; flex-direction: column; }
                .tab-content.active { display: flex; animation: fadeIn 0.3s; }
                .element-highlight { outline: 3px solid #ff00ff !important; box-shadow: 0 0 12px #ff00ff !important; background-color: rgba(255, 0, 255, 0.25) !important; }
                .element-selected-permanent { outline: 3px solid var(--selected) !important; box-shadow: 0 0 12px var(--selected) !important; }
                .settings-menu { position: absolute; top: 45px; right: 10px; background-color: var(--bg-alt); border: 1px solid var(--border); border-radius: 6px; box-shadow: 0 4px 12px var(--shadow); z-index: 10; padding: 12px; width: 320px; max-height: 80vh; overflow-y: auto; }
                .settings-menu h5 { margin: 10px 0 10px 0; padding-bottom: 5px; border-bottom: 1px solid var(--border); font-weight: bold; }
                .setting-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
                .input-group, .log-box { font-family: "SF Mono", "Fira Code", Consolas, monospace; }
                .input-group { display: flex; margin-bottom: 5px; }
                .input-group input, .input-group textarea, .toolkit-textarea { width: 100%; flex-grow: 1; background-color: var(--bg); color: var(--fg); border: 1px solid var(--border); padding: 8px; border-radius: 4px; }
                .input-group .copy-btn { border: 1px solid var(--border); padding: 8px; background-color: var(--bg-alt); cursor: pointer; display:flex; align-items:center; border-left: none; border-radius: 0 4px 4px 0; }
                .toolkit-btn { background-color: var(--bg-alt); border: 1px solid var(--border); color: var(--fg); padding: 8px 12px; border-radius: 4px; cursor: pointer; transition: background-color 0.2s; }
                .toolkit-btn:hover { background-color: var(--border); }
                .toolkit-btn.primary { background-color: var(--accent); color: var(--accent-fg); border-color: var(--accent); }
                .toolkit-select { width: 100%; background-color: var(--bg); color: var(--fg); border: 1px solid var(--border); padding: 8px; border-radius: 4px; height: 38px; }
                .toast-container { position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); background-color: #333; color: white; padding: 8px 16px; border-radius: 6px; z-index: 10000000; font-size: 0.9em; transition: opacity 0.3s, transform 0.3s; opacity: 0; pointer-events: none; }
                .toast-container.show { opacity: 1; transform: translate(-50%, -10px); }
                .dom-navigator-item { cursor: pointer; padding: 4px 8px; border-radius: 4px; margin-bottom: 4px; font-family: "SF Mono", "Fira Code", Consolas, monospace; font-size: 0.9em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
                .dom-navigator-item:hover { background-color: var(--border); }
                .dom-navigator-item.selected { background-color: var(--selected); color: white; font-weight: bold; }
                .dom-navigator-item .label { color: #9e9e9e; margin-right: 8px; }
                .inspector-children-list { border-top: 1px solid var(--border); margin-top: 10px; padding-top: 10px; }
                .inspector-children-list .child-item { margin-left: 15px; }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
            `);
        }

        renderTabs() {
            const tabsContainer = qs('.tabs-container', this.el);
            clearElement(tabsContainer);
            this.getVisibleComponents().forEach(comp => {
                const tabBtn = createElement('button', ['tab-btn'], { 'data-tab': comp.id, title: comp.name, draggable: 'true' });
                const icon = createElement('span', [], {}, comp.name.split(' ')[0]);
                tabBtn.append(icon, comp.name.substring(comp.name.indexOf(' ') + 1));
                tabsContainer.appendChild(tabBtn);
            });
        }

        renderActiveContent() {
            const contentContainer = qs(`#${this.id}-content`);
            clearElement(contentContainer);
            this.getEnabledComponents().forEach(comp => {
                try {
                    const contentEl = comp.render();
                    contentContainer.appendChild(contentEl);
                } catch (e) {
                    console.error(`Failed to render component ${comp.id}:`, e);
                    contentContainer.appendChild(createElement('div', ['tab-content'], { 'data-tab': comp.id }, `Error: ${comp.name} failed to load.`));
                }
            });
            this.setActiveTab(this.settings.get('activeTab'));
        }

        renderSettingsMenu() {
            const menu = qs('.settings-menu', this.el);
            clearElement(menu);
            const components = this.settings.get('components');

            menu.append(
                createElement('h5', [], {}, 'Functionality'),
                Object.assign(document.createElement('div'), { className: 'setting-row', append: function(...args) { HTMLElement.prototype.append.apply(this, args); return this; } }).append(
                    createElement('label', [], {}, 'Sync with DevTools'),
                    this.createToggle('settings-devtools-sync', this.settings.get('debug.autoToggleWithDevTools'))
                ),
                createElement('h5', [], {}, '🧠 AI Integration'),
                Object.assign(document.createElement('div'), { className: 'setting-row', append: function(...args) { HTMLElement.prototype.append.apply(this, args); return this; } }).append(
                    createElement('label', [], {}, 'Enable AI Features'),
                    this.createToggle('settings-ai-enabled', this.settings.get('ai.enabled'))
                ),
                createElement('h5', [], {}, 'Visible Tabs')
            );
            this.getOrderedComponents().forEach(comp => {
                const isVisible = components[comp.id]?.showInToolbar ?? true;
                const compRow = createElement('div', ['setting-row']);
                compRow.append(createElement('label', [], {}, comp.name), this.createToggle(null, isVisible, {'data-component-id': comp.id}));
                menu.append(compRow);
            });
            this.bindSettingsMenuEvents();
        }

        createToggle(id, isChecked, attributes = {}) {
            const label = createElement('label', ['toggle-switch']);
            const input = createElement('input', [], { type: 'checkbox', ...attributes });
            if (id) input.id = id;
            input.checked = isChecked;
            const slider = createElement('span', ['toggle-slider']);
            label.append(input, slider);
            return label;
        }

        registerComponents() { this.componentDefinitions.forEach(CompClass => { const instance = new CompClass(this); this.components[instance.id] = instance; }); }
        getOrderedComponents() {
            const order = this.settings.get('components.order') || [];
            const componentMap = new Map(Object.values(this.components).map(c => [c.id, c]));
            const ordered = order.map(id => componentMap.get(id)).filter(Boolean);
            const unordered = Object.values(this.components).filter(c => !order.includes(c.id));
            return [...ordered, ...unordered];
        }
        getEnabledComponents() { return this.getOrderedComponents().filter(c => this.settings.getComponentState(c.id)?.enabled); }
        getVisibleComponents() { return this.getOrderedComponents().filter(c => this.settings.getComponentState(c.id)?.showInToolbar); }

        applyPreferences() {
            const prefs = this.settings.get('ui');
            document.documentElement.style.setProperty('--panel-width', `${prefs.panelWidth}px`);
            this.el.classList.remove('left', 'right', 'expanded');
            this.el.classList.add(prefs.positionSide);
            this.isLocked = prefs.isLocked;
            this.updateLockState();
            this.toggleDevToolsSync(this.settings.get('debug.autoToggleWithDevTools'));
            if (this.isLocked) {
                this.el.classList.add('expanded');
            }
        }

        setActiveTab(tabId) {
            const activeComponent = this.components[tabId];
            if (!activeComponent || !this.settings.getComponentState(tabId)?.showInToolbar) {
                tabId = this.getVisibleComponents()[0]?.id;
            }
            if (!tabId) return;
            qsa('.tab-btn', this.el).forEach(btn => btn.classList.toggle('active', btn.dataset.tab === tabId));
            qsa('.tab-content', this.el).forEach(content => content.classList.toggle('active', content.dataset.tab === tabId));
            this.settings.set('activeTab', tabId);
        }

        toggleLock() {
            this.isLocked = !this.isLocked;
            this.settings.set('ui.isLocked', this.isLocked);
            this.updateLockState();
            if (this.isLocked) this.el.classList.add('expanded');
        }

        updateLockState() {
            const lockBtn = qs(`#${this.id}-lock-btn`);
            lockBtn.textContent = this.isLocked ? '🔒' : '🔓';
            lockBtn.classList.toggle('locked', this.isLocked);
            lockBtn.title = this.isLocked ? 'Unlock Panel (will auto-collapse)' : 'Lock Panel Open';
        }

        switchSide() {
            const currentSide = this.settings.get('ui.positionSide');
            const newSide = currentSide === 'left' ? 'right' : 'left';
            this.settings.set('ui.positionSide', newSide);
            this.el.classList.remove('left', 'right');
            this.el.classList.add(newSide);
        }

        toggleDevToolsSync(enabled) {
            if (enabled && !this.devToolsCheckInterval) {
                this.devToolsCheckInterval = setInterval(() => {
                    const isOpen = window.outerWidth - window.innerWidth > 160 || window.outerHeight - window.innerHeight > 160;
                    const isVisible = this.el.classList.contains('expanded');
                    if (isOpen && !isVisible) {
                        this.el.classList.add('expanded');
                    }
                }, 1000);
            } else if (!enabled && this.devToolsCheckInterval) {
                clearInterval(this.devToolsCheckInterval);
                this.devToolsCheckInterval = null;
            }
        }

        showToast(message, duration = 3000) {
            const toast = qs('.toast-container', this.el);
            if (!toast) return;
            toast.textContent = message;
            toast.classList.add('show');
            clearTimeout(this.toastTimeout);
            this.toastTimeout = setTimeout(() => toast.classList.remove('show'), duration);
        }

        startPicker(callback, cursor = 'crosshair', highlight = true, sourceComponent) {
            if (this.isPickerActive) return;
            this.isPickerActive = true;
            this.onPickerClickCallback = callback;
            document.body.style.cursor = cursor;
            this.onPickerHover = (e) => {
                if (e.target.closest('[data-devtoolkit]')) { this.removeHighlight(); return; }
                if (e.target === this.lastHighlightedElement) return;
                if (highlight) {
                    this.removeHighlight();
                    this.lastHighlightedElement = e.target;
                    this.lastHighlightedElement.classList.add('element-highlight');
                }
            };
            this.onPickerClick = (e) => {
                if (e.target.closest('[data-devtoolkit]')) return;
                e.preventDefault(); e.stopPropagation();
                if (this.onPickerClickCallback) this.onPickerClickCallback(e.target);
                this.stopPicker();
            };
            document.addEventListener('mousemove', this.onPickerHover, true);
            document.addEventListener('click', this.onPickerClick, true);
            sourceComponent?.updatePickerButton(true);
        }

        stopPicker() {
            if (!this.isPickerActive) return;
            this.isPickerActive = false;
            document.body.style.cursor = '';
            document.removeEventListener('mousemove', this.onPickerHover, true);
            document.removeEventListener('click', this.onPickerClick, true);
            this.removeHighlight();
            Object.values(this.components).forEach(c => c.updatePickerButton?.(false));
        }

        removeHighlight() { if (this.lastHighlightedElement) { this.lastHighlightedElement.classList.remove('element-highlight'); this.lastHighlightedElement = null; } }

        bindCoreEvents() {
            qs(`#${this.id}-handle`).addEventListener('mouseenter', () => !this.isLocked && this.el.classList.add('expanded'));
            this.el.addEventListener('mouseleave', () => !this.isLocked && this.el.classList.remove('expanded'));

            const settingsBtn = qs(`#${this.id}-settings-btn`);
            settingsBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const menu = qs('.settings-menu', this.el);
                const isVisible = menu.style.display === 'block';
                if (!isVisible) this.renderSettingsMenu();
                menu.style.display = isVisible ? 'none' : 'block';
            });
            document.addEventListener('click', (e) => {
                const menu = qs('.settings-menu', this.el);
                if (menu.style.display === 'block' && !menu.contains(e.target) && !settingsBtn.contains(e.target)) {
                    menu.style.display = 'none';
                }
            });

            qs(`#${this.id}-side-switch-btn`).addEventListener('click', () => this.switchSide());
            qs(`#${this.id}-lock-btn`).addEventListener('click', () => this.toggleLock());
            qs('.tabs-container', this.el).addEventListener('click', e => { const tabId = e.target.closest('.tab-btn')?.dataset.tab; if (tabId) this.setActiveTab(tabId); });
            this.el.addEventListener('click', e => { const copyBtn = e.target.closest('.copy-btn'); if (copyBtn) { const input = copyBtn.previousElementSibling; if (input) { GM.setClipboard(input.value); this.showToast('Copied to clipboard!'); } } });

            GM.registerMenuCommand('Toggle Dev Toolkit', () => this.el.classList.toggle('expanded'));
            this.bindResizeEvents();
            this.bindTabDragEvents();
        }

        bindSettingsMenuEvents() {
            qs('#settings-devtools-sync').addEventListener('change', e => { this.settings.set('debug.autoToggleWithDevTools', e.target.checked); this.toggleDevToolsSync(e.target.checked); });
            qs('#settings-ai-enabled').addEventListener('change', e => { this.settings.set('ai.enabled', e.target.checked); this.renderTabs(); this.renderActiveContent(); });
            qsa('.settings-menu [data-component-id]').forEach(toggle => {
                toggle.addEventListener('change', e => {
                    const id = e.target.dataset.componentId;
                    this.settings.setComponentState(id, { ...this.settings.getComponentState(id), showInToolbar: e.target.checked });
                    this.renderTabs();
                    this.renderActiveContent();
                });
            });
        }

        bindResizeEvents() {
            const resizer = qs(`#${this.id}-resizer`);
            const onMouseDown = (e) => {
                e.preventDefault();
                const startX = e.clientX;
                const startWidth = this.el.offsetWidth;
                const side = this.settings.get('ui.positionSide');

                const onMouseMove = (moveEvent) => {
                    const dx = moveEvent.clientX - startX;
                    const newWidth = clamp(side === 'left' ? startWidth + dx : startWidth - dx, 300, 1000);
                    document.documentElement.style.setProperty('--panel-width', `${newWidth}px`);
                };
                const onMouseUp = () => {
                    document.removeEventListener('mousemove', onMouseMove);
                    document.removeEventListener('mouseup', onMouseUp);
                    this.settings.set('ui.panelWidth', this.el.offsetWidth);
                };
                document.addEventListener('mousemove', onMouseMove);
                document.addEventListener('mouseup', onMouseUp);
            };
            resizer.addEventListener('mousedown', onMouseDown);
        }

        bindTabDragEvents() {
            const container = qs('.tabs-container', this.el);
            let draggedItem = null;
            container.addEventListener('dragstart', e => {
                draggedItem = e.target.closest('.tab-btn');
                if (draggedItem) {
                    setTimeout(() => draggedItem.classList.add('dragging'), 0);
                }
            });
            container.addEventListener('dragend', () => {
                if (draggedItem) {
                    draggedItem.classList.remove('dragging');
                    draggedItem = null;
                }
            });
            container.addEventListener('dragover', e => {
                e.preventDefault();
                const target = e.target.closest('.tab-btn');
                if (target && target !== draggedItem) {
                    qsa('.tab-btn', container).forEach(t => t.classList.remove('drag-over'));
                    target.classList.add('drag-over');
                }
            });
            container.addEventListener('dragleave', e => { if (e.target.closest('.tab-btn')) e.target.closest('.tab-btn').classList.remove('drag-over'); });
            container.addEventListener('drop', e => {
                e.preventDefault();
                const target = e.target.closest('.tab-btn');
                if (target) target.classList.remove('drag-over');
                if (draggedItem && target && draggedItem !== target) {
                    const currentOrder = this.getOrderedComponents().map(c => c.id);
                    const fromId = draggedItem.dataset.tab;
                    const toId = target.dataset.tab;
                    const fromIndex = currentOrder.indexOf(fromId);
                    currentOrder.splice(fromIndex, 1);
                    const toIndex = currentOrder.indexOf(toId);
                    currentOrder.splice(toIndex, 0, fromId);

                    this.settings.set('components.order', currentOrder);
                    this.renderTabs();
                }
            });
        }
    }

    class ToolkitComponent {
        constructor(toolkit, id, name) { this.toolkit = toolkit; this.id = id; this.name = name; this.el = null; }
        render() {
            if (!this.el) { this.el = createElement('div', ['tab-content'], { 'data-tab': this.id }); this.buildContent(); this.bindEvents(); }
            return this.el;
        }
        buildContent() { this.el.append(createElement('h4', [], {}, this.name), createElement('p', [], {}, 'Component not implemented.')); }
        bindEvents() {}
        update() {}
        updatePickerButton(isPickerActive, btnClass = '.picker-btn') {
            const btn = qs(btnClass, this.el);
            if (btn) {
                btn.textContent = isPickerActive ? 'Cancel Picking' : btn.dataset.defaultText || 'Pick';
                btn.classList.toggle('primary', !isPickerActive);
                const tabBtn = qs(`.tab-btn[data-tab="${this.id}"]`);
                if(tabBtn) {
                    let dot = qs('.picker-active-dot', tabBtn);
                    if (isPickerActive && !dot) {
                        const iconSpan = qs('span:first-child', tabBtn);
                        if(iconSpan) iconSpan.appendChild(createElement('span', ['picker-active-dot']));
                    } else if (!isPickerActive && dot) { dot.remove(); }
                }
            }
        }
        createInputGroup(labelText, inputId, withCopy = true) {
            const group = createElement('div', ['input-group']);
            const label = createElement('label', [], { for: inputId }, labelText);
            const input = createElement('input', [], { id: inputId, readonly: true });
            group.append(input);
            if (withCopy) group.append(createElement('button', ['copy-btn'], { title: 'Copy' }, '📋'));
            return [label, group];
        }
    }

    class AIComponent extends ToolkitComponent {
        constructor(toolkit) { super(toolkit, 'ai', '🧠 AI'); this.context = { data: '', userScript: '' }; }
        buildContent() {
            const btnContainer = createElement('div', [], { style: 'display:flex; gap:10px; margin-top:10px;' });
            btnContainer.append(
                createElement('button', ['toolkit-btn', 'primary'], {id: 'ai-send-btn'}, 'Send to AI'),
                createElement('button', ['toolkit-btn'], {id: 'ai-copy-btn'}, 'Copy Full Prompt')
            );
            this.el.append(
                createElement('h4', [], {}, 'Smart Prompt Aggregator'),
                createElement('select', ['toolkit-select'], { id: 'ai-prompt-template', style: 'margin-bottom: 10px;' }),
                createElement('textarea', ['toolkit-textarea'], {id: 'ai-prompt-preview', rows: 8, placeholder: 'Click a 🧠 button or select a template to begin...'}),
                btnContainer,
                createElement('h5', [], {style: 'margin-top: 15px;'}, 'Upload Userscript for Context'),
                createElement('input', [], {type: 'file', id: 'ai-upload-script', accept: '.js,.user.js'}),
                createElement('span', [], {id: 'ai-upload-filename', style: 'margin-left: 10px; opacity: 0.7;'}),
                createElement('h5', [], {style: 'margin-top: 15px;'}, 'AI Response'),
                createElement('div', ['ai-response-box'], {}, 'AI response will appear here...')
            );
        }
        render() { super.render(); this.loadPromptTemplates(); return this.el; }
        loadPromptTemplates() {
            const templates = this.toolkit.settings.get('ai.promptTemplates');
            const select = qs('#ai-prompt-template', this.el);
            clearElement(select);
            for (const key in templates) { select.add(new Option(templates[key].name, key)); }
        }
        setPromptContext(data, templateKey) { this.context.data = data; qs('#ai-prompt-template', this.el).value = templateKey; this.compilePrompt(); this.toolkit.setActiveTab(this.id); }
        compilePrompt() {
            const templates = this.toolkit.settings.get('ai.promptTemplates');
            const selectedKey = qs('#ai-prompt-template', this.el).value;
            const template = templates[selectedKey].prompt;
            let fullPrompt = `${template}\n\n--- CONTEXT DATA ---\n${this.context.data}`;
            if (this.context.userScript) { fullPrompt += `\n\n--- FULL USERSCRIPT FOR ANALYSIS ---\n${this.context.userScript}`; }
            qs('#ai-prompt-preview', this.el).value = fullPrompt;
        }
        sendToAI() {
            const aiPrefs = this.toolkit.settings.get('ai');
            const prompt = qs('#ai-prompt-preview', this.el).value;
            if (!prompt) { this.toolkit.showToast('Prompt is empty.'); return; }
            if (aiPrefs.mode === 'newtab') {
                const chatUrl = { gemini: 'https://gemini.google.com/app', chatgpt: 'https://chat.openai.com/', claude: 'https://claude.ai/chats' }[aiPrefs.provider] || 'https://google.com/search?q=';
                GM.setClipboard(prompt); window.open(chatUrl, '_blank');
                this.toolkit.showToast('Prompt copied! Paste it into the new tab.');
            } else { this.toolkit.showToast('API mode is not yet implemented.'); }
        }
        bindEvents() {
            qs('#ai-prompt-template', this.el).addEventListener('change', () => this.compilePrompt());
            qs('#ai-send-btn', this.el).addEventListener('click', () => this.sendToAI());
            qs('#ai-copy-btn', this.el).addEventListener('click', () => { GM.setClipboard(qs('#ai-prompt-preview', this.el).value); this.toolkit.showToast('Full prompt copied!'); });
            qs('#ai-upload-script', this.el).addEventListener('change', e => {
                const file = e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = (evt) => { this.context.userScript = evt.target.result; qs('#ai-upload-filename', this.el).textContent = file.name; this.compilePrompt(); };
                    reader.readAsText(file);
                }
            });
        }
    }

    class InspectorComponent extends ToolkitComponent {
        constructor(toolkit) { super(toolkit, 'inspector', '🔍 Inspector'); this.selectedElement = null; }
        buildContent() {
            this.el.append(
                createElement('h4', [], {}, 'Element Inspector'),
                createElement('p', [], {}, 'Pick an element to inspect it and its parent hierarchy.'),
                createElement('button', ['toolkit-btn', 'primary', 'picker-btn'], {'data-default-text': 'Pick Element'}, 'Pick Element'),
                createElement('div', ['inspector-breadcrumbs'], {id: 'inspector-breadcrumbs'}),
                createElement('div', ['inspector-children-list'], {id: 'inspector-children-list'}),
                createElement('div', ['inspector-results'], { style: 'margin-top: 10px;' })
            );
        }
        bindEvents() {
            qs('.picker-btn', this.el).addEventListener('click', () => {
                if (this.toolkit.isPickerActive) {
                    this.toolkit.stopPicker();
                } else {
                    if (this.selectedElement) this.selectedElement.classList.remove('element-selected-permanent');
                    this.toolkit.startPicker(target => this.update(target), 'crosshair', true, this);
                }
            });
            const navClickListener = e => {
                const targetCrumb = e.target.closest('.dom-navigator-item');
                if(targetCrumb && targetCrumb.elementRef) this.update(targetCrumb.elementRef);
            };
            qs('#inspector-breadcrumbs', this.el).addEventListener('click', navClickListener);
            qs('#inspector-children-list', this.el).addEventListener('click', navClickListener);
        }
        update(target) {
            if (this.selectedElement) this.selectedElement.classList.remove('element-selected-permanent');
            this.selectedElement = target;
            this.selectedElement.classList.add('element-selected-permanent');

            this.renderBreadcrumbs();
            this.renderChildrenList();
            this.renderResults();
            const stripperComp = this.toolkit.components['html-stripper'];
            if(stripperComp) {
                const rawInput = qs('#stripper-raw-html', stripperComp.el);
                if (rawInput) {
                    rawInput.value = this.selectedElement.outerHTML;
                    rawInput.dispatchEvent(new Event('input', { bubbles: true }));
                }
            }
        }
        createNavElement(node, prefix = '') {
            let desc = node.tagName.toLowerCase();
            if (node.id) desc += `#${node.id.split(' ')[0]}`;
            if (node.className && typeof node.className === 'string') { const cls = node.className.trim().split(' ')[0]; if(cls) desc += `.${cls}`; }
            const crumb = createElement('div', ['dom-navigator-item'], {}, `${prefix}${desc}`);
            crumb.elementRef = node;
            return crumb;
        }
        renderBreadcrumbs() {
            const container = qs('#inspector-breadcrumbs', this.el);
            clearElement(container);
            let path = [];
            let el = this.selectedElement;
            while (el && el.tagName !== 'BODY' && el.tagName !== 'HTML') {
                path.unshift(el);
                el = el.parentElement;
            }
            path.forEach(node => {
                const crumb = this.createNavElement(node);
                if (node === this.selectedElement) crumb.classList.add('selected');
                container.append(crumb);
            });
        }
        renderChildrenList() {
            const container = qs('#inspector-children-list', this.el);
            clearElement(container);
            if (this.selectedElement && this.selectedElement.children.length > 0) {
                const label = createElement('h6', [], {style:'margin: 5px 0;'}, 'Children:');
                container.append(label);
                Array.from(this.selectedElement.children).forEach(node => {
                    const childItem = this.createNavElement(node, '↳ ');
                    childItem.classList.add('child-item');
                    container.append(childItem);
                });
            }
        }
        renderResults() {
            const container = qs('.inspector-results', this.el);
            clearElement(container);
            const [cssPathLabel, cssPathGroup] = super.createInputGroup('CSS Path:', 'css-path-result');
            const [outerHtmlLabel] = super.createInputGroup('OuterHTML:', 'outerhtml-result-label');
            qs('input', cssPathGroup).value = getCssPath(this.selectedElement);
            const outerHTMLTextarea = createElement('textarea', ['toolkit-textarea'], {id:'outerhtml-result', readonly:true, rows: 6});
            outerHTMLTextarea.value = this.selectedElement.outerHTML;

            const copyBtn = createElement('button', ['copy-btn'], {title: 'Copy'}, '📋');
            const newOuterGroup = createElement('div', ['input-group']);
            newOuterGroup.append(outerHTMLTextarea, copyBtn);

            container.append(cssPathLabel, cssPathGroup, outerHtmlLabel, newOuterGroup);
        }
    }

    class HtmlStripperComponent extends ToolkitComponent {
        constructor(toolkit) { super(toolkit, 'html-stripper', '✂️ Stripper'); this.ATTRIBUTE_WHITELIST = [ 'id', 'class', 'role', 'href', 'src', 'alt', 'title', 'aria-label', 'aria-labelledby', 'aria-describedby', 'tabindex', 'target', 'rel', 'd' ]; }
        buildContent() {
            this.el.classList.add('stripper-container');
            const ioGrid = createElement('div', ['io-grid']);
            const inputCol = createElement('div');
            inputCol.append(
                createElement('label', [], { for: 'stripper-raw-html' }, 'Raw HTML Input'),
                createElement('textarea', ['toolkit-textarea'], { id: 'stripper-raw-html', placeholder: 'Paste outerHTML here...' })
            );
            const outputCol = createElement('div');
            const relativeWrapper = createElement('div', ['relative']);
            relativeWrapper.append(
                createElement('textarea', ['toolkit-textarea'], { id: 'stripper-clean-html', readonly: true, placeholder: 'Clean HTML appears here...' }),
                createElement('button', ['toolkit-btn', 'copy-btn'], { title: 'Copy' }, '📋')
            );
            outputCol.append( createElement('label', [], { for: 'stripper-clean-html' }, 'Cleaned HTML Output'), relativeWrapper );
            ioGrid.append(inputCol, outputCol);
            this.el.append(
                createElement('h4', [], {}, 'HTML Stripper Tool'),
                createElement('p', [], {}, 'Removes dynamic/unnecessary attributes for cleaner selectors.'),
                ioGrid
            );
        }
        bindEvents() {
            const stripAndDisplay = () => {
                const rawHtmlInput = qs('#stripper-raw-html', this.el);
                const strippedHtmlOutput = qs('#stripper-clean-html', this.el);
                if (!rawHtmlInput.value) { strippedHtmlOutput.value = "Paste HTML to begin."; return; }
                try {
                    const tempDiv = document.createElement('div');
                    tempDiv.innerHTML = rawHtmlInput.value;
                    this._cleanElement(tempDiv.firstElementChild);
                    strippedHtmlOutput.value = this._formatHtml(tempDiv.innerHTML);
                } catch (error) { strippedHtmlOutput.value = `Error: ${error.message}`; }
            };
            qs('#stripper-raw-html', this.el).addEventListener('input', stripAndDisplay);
        }
        _cleanElement(element) {
            if (!element) return;
            Array.from(element.attributes).forEach(attr => {
                const attrName = attr.name.toLowerCase();
                if (!this.ATTRIBUTE_WHITELIST.includes(attrName)) { element.removeAttribute(attr.name); return; }
                if (attrName === 'class') {
                    const cleanClasses = attr.value.split(' ').filter(cls => !/^(x[a-z0-9-]{5,})|(__fb-dark-mode)|(html-.*)$/.test(cls) && cls.trim() !== '');
                    if (cleanClasses.length > 0) { element.setAttribute('class', cleanClasses.join(' ')); } else { element.removeAttribute('class'); }
                }
            });
            Array.from(element.children).forEach(child => this._cleanElement(child));
        }
        _formatHtml(htmlString) {
            let formatted = '', indentLevel = 0, tab = '  ';
            htmlString.replace(/></g, '>\n<').split('\n').forEach(line => {
                const trimmed = line.trim();
                if (!trimmed) return;
                if (trimmed.startsWith('</')) indentLevel = Math.max(0, indentLevel - 1);
                formatted += tab.repeat(indentLevel) + trimmed + '\n';
                if (trimmed.startsWith('<') && !trimmed.startsWith('</') && !trimmed.endsWith('/>') && !/<\w+.*?\/>/.test(trimmed)) indentLevel++;
            });
            return formatted.trim();
        }
    }

    class uBlockComponent extends ToolkitComponent {
        constructor(toolkit) { super(toolkit, 'ublock', '🛡️ uBlock'); this.focusedElement = null; }
        buildContent() {
            this.el.append(
                createElement('h4', [], {}, 'Advanced uBlock Filter Generator'),
                createElement('p', [], {}, 'Pick an element, then explore its relatives to generate the perfect filter.'),
                createElement('button', ['toolkit-btn', 'primary', 'picker-btn'], {'data-default-text': 'Pick Element'}, 'Pick Element'),
                createElement('div', ['ublock-navigator'], {id: 'ublock-navigator', style: 'margin-top: 15px;'}),
                createElement('hr', [], {style: 'margin: 10px 0; border-color: var(--border);'}),
                createElement('div', ['ublock-output'], {id: 'ublock-output'})
            );
        }
        bindEvents() {
            qs('.picker-btn', this.el).addEventListener('click', () => {
                if (this.toolkit.isPickerActive) {
                    this.toolkit.stopPicker();
                } else {
                    if (this.focusedElement) this.focusedElement.classList.remove('element-selected-permanent');
                    this.toolkit.startPicker(target => this.update(target), 'crosshair', true, this);
                }
            });
            qs('#ublock-navigator', this.el).addEventListener('click', e => {
                const targetItem = e.target.closest('.dom-navigator-item');
                if (targetItem && targetItem.elementRef) {
                    this.update(targetItem.elementRef);
                }
            });
        }
        update(target) {
            if (this.focusedElement) this.focusedElement.classList.remove('element-selected-permanent');
            this.focusedElement = target;
            this.focusedElement.classList.add('element-selected-permanent');

            this.renderNavigator();
            this.generateAndShowFilters();
        }
        createNavItem(el, label) {
            if (!el || el === document.documentElement) return null;
            let desc = el.tagName.toLowerCase();
            if (el.id) desc += `#${el.id.split(' ')[0]}`;
            if (el.className && typeof el.className === 'string') { const cls = el.className.trim().split(' ')[0]; if(cls) desc += `.${cls}`; }

            const item = createElement('div', ['dom-navigator-item']);
            item.innerHTML = `<span class="label">${label}</span>${desc}`;
            item.elementRef = el;
            if (el === this.focusedElement) item.classList.add('selected');
            return item;
        }
        renderNavigator() {
            const container = qs('#ublock-navigator', this.el);
            clearElement(container);
            const parent = this.createNavItem(this.focusedElement.parentElement, 'Parent');
            const self = this.createNavItem(this.focusedElement, 'Target');
            if (parent) container.append(parent);
            if (self) container.append(self);

            const children = Array.from(this.focusedElement.children);
            if (children.length > 0) {
                const childrenLabel = createElement('h6', [], {style:'margin: 10px 0 5px;'}, 'Children:');
                container.append(childrenLabel);
                children.slice(0, 5).forEach(child => { // Limit to 5 children for UI sanity
                    const childItem = this.createNavItem(child, '↳');
                    if (childItem) container.append(childItem);
                });
            }
        }
        generateAndShowFilters() {
            const output = qs('#ublock-output', this.el);
            clearElement(output);
            const filters = this.generateFilters(this.focusedElement);
            if (filters.length === 0) {
                output.textContent = 'Could not generate any specific filters for this element.';
            } else {
                filters.forEach(f => {
                    const [label, group] = super.createInputGroup(f.desc, `ublock-${f.desc.replace(/\s/g, '-')}`);
                    qs('input', group).value = f.rule;
                    output.append(label, group);
                });
            }
        }
        generateFilters(el) {
            const filters = new Map();
            const domain = window.location.hostname;
            const tag = el.tagName.toLowerCase();
            const addFilter = (desc, rule) => { if (rule && !filters.has(rule)) filters.set(rule, { desc, rule }); };

            if (el.id) addFilter('By ID (Strongest)', `${domain}##${tag}#${el.id}`);

            const cleanClasses = Array.from(el.classList).filter(c => !/^(x[a-z0-9-]{5,})|([a-zA-Z0-9_-]{20,})/.test(c) && !c.startsWith('element-'));
            if (cleanClasses.length > 0) addFilter('By Classes', `${domain}##${tag}.${cleanClasses.join('.')}`);

            ['data-testid', 'aria-label', 'name', 'title'].forEach(attr => {
                if (el.hasAttribute(attr)) addFilter(`By Attribute [${attr}]`, `${domain}##${tag}[${attr}="${el.getAttribute(attr)}"]`);
            });

            const directText = Array.from(el.childNodes).find(n => n.nodeType === Node.TEXT_NODE && n.textContent.trim());
            if (directText) {
                const text = directText.textContent.trim().replace(/([\\"])/g, '\\$1').substring(0, 50);
                if (text) addFilter('By Text Content', `${domain}##${tag}:has-text(/${text.replace(/\//g, '\\/').replace(/'/g, "\\'")}/)`);
            }

            const specificChild = qs('svg[aria-label], img[src], [data-testid]', el);
            if (specificChild && specificChild !== el) {
                const childTag = specificChild.tagName.toLowerCase();
                const childAttr = specificChild.hasAttribute('data-testid') ? `[data-testid="${specificChild.getAttribute('data-testid')}"]` :
                                  specificChild.hasAttribute('aria-label') ? `[aria-label="${specificChild.getAttribute('aria-label')}"]` :
                                  `[src="${specificChild.getAttribute('src')}"]`;
                addFilter('By Specific Child', `${domain}##${tag}:has(> ${childTag}${childAttr})`);
            }

            const stableParent = el.closest('[id]');
            if (stableParent && stableParent !== document.body) {
                addFilter('By Parent ID', `${domain}##${stableParent.tagName.toLowerCase()}#${stableParent.id} ${tag}`);
            }

            if (filters.size === 0) addFilter('By CSS Path (Fallback)', `${domain}##${getCssPath(el)}`);

            return Array.from(filters.values());
        }
    }

    class CSSViewerComponent extends ToolkitComponent {
        constructor(toolkit) { super(toolkit, 'css-viewer', '🎨 CSS Viewer'); this.rawCss = ''; }
        buildContent() {
            const btnContainer = createElement('div', [], { style: 'display:flex; flex-wrap: wrap; gap: 8px; margin-bottom: 10px;' });
            btnContainer.append(
                createElement('button', ['toolkit-btn', 'primary'], { id: 'fetch-styles-btn', style: 'flex:1;' }, 'Fetch All Styles'),
                createElement('button', ['toolkit-btn'], { id: 'copy-styles-btn', style: 'display: none;' }, 'Copy CSS'),
                createElement('button', ['toolkit-btn'], { id: 'export-styles-btn', style: 'display: none;' }, 'Download .css')
            );
            const toggleContainer = createElement('div', ['setting-row'], {style: 'font-size: 0.9em;'});
            toggleContainer.append( createElement('label', [], {}, 'Remove junk/empty styles'), this.toolkit.createToggle('clean-css-toggle', true) );
            this.el.append(
                createElement('h4', [], {}, 'Page Stylesheet Viewer'),
                createElement('p', [], {}, 'Fetch, clean, and download all page styles from the current document.'),
                btnContainer, toggleContainer,
                createElement('hr', [], { style: 'border-color: var(--border); margin: 15px 0;' }),
                createElement('pre', ['log-box'], { id: 'styles-log-box', 'data-placeholder': "Click 'Fetch' to load styles.", style: 'max-height: none; flex-grow: 1;' })
            );
        }
        bindEvents() {
            qs('#fetch-styles-btn', this.el).addEventListener('click', () => this.fetchAllStyles());
            qs('#export-styles-btn', this.el).addEventListener('click', () => this.exportCss());
            qs('#copy-styles-btn', this.el).addEventListener('click', () => { GM.setClipboard(qs('#styles-log-box', this.el).textContent); this.toolkit.showToast('CSS copied!'); });
            qs('#clean-css-toggle', this.el).addEventListener('change', () => this.displayCss());
        }
        exportCss() {
            const css = qs('#styles-log-box', this.el).textContent;
            if (!css) { this.toolkit.showToast('No CSS to export.'); return; }
            const blob = new Blob([css], { type: 'text/css' });
            const url = URL.createObjectURL(blob);
            GM.download({ url: url, name: `page-styles-${window.location.hostname}.css`, onload: () => URL.revokeObjectURL(url) });
        }
        async fetchAllStyles() {
            qs('#styles-log-box', this.el).textContent = 'Fetching...';
            this.toolkit.showToast('Starting stylesheet fetch...');
            const promises = Array.from(document.styleSheets).map(sheet => {
                try {
                    if (sheet.href && window.location.protocol !== 'file:') {
                        return new Promise(resolve => {
                            GM.xmlhttpRequest({
                                method: 'GET',
                                url: sheet.href,
                                onload: r => resolve(`/* From ${sheet.href} */\n${r.responseText}\n`),
                                onerror: () => resolve(`/* FAILED: ${sheet.href} */\n`)
                            });
                        });
                    } else if (sheet.cssRules) {
                        return Promise.resolve(`/* Inline <style> */\n${Array.from(sheet.cssRules).map(r => r.cssText).join('\n')}\n`);
                    }
                    return Promise.resolve('/* Skipped a stylesheet with no href and no accessible rules */');
                } catch (e) {
                    return Promise.resolve(`/* Could not read stylesheet (CORS issue?): ${sheet.href || 'inline'} */\n`);
                }
            });
            this.rawCss = (await Promise.all(promises)).join('\n');
            this.displayCss();
            qs('#copy-styles-btn', this.el).style.display = 'inline-block';
            qs('#export-styles-btn', this.el).style.display = 'inline-block';
            this.toolkit.showToast('Style fetching complete.');
        }
        cleanCss(css) { return css.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[ \t]*[^{}]+\{\s*\}/gm, '').replace(/(\r\n|\n|\r){2,}/g, '$1').trim(); }
        displayCss() { qs('#styles-log-box', this.el).textContent = qs('#clean-css-toggle', this.el).checked ? this.cleanCss(this.rawCss) : this.rawCss; }
    }

    class CSSToolsComponent extends ToolkitComponent {
        constructor(toolkit) { super(toolkit, 'css-tools', '🛠️ Tools'); }
        buildContent() {
            this.el.append(
                createElement('h4', [], {}, 'Advanced Color Picker'),
                createElement('p', [], {}, "Use the browser's eyedropper to select any color on the screen."),
                createElement('div', [], { id: 'color-picker-container' })
            );
            const container = qs('#color-picker-container', this.el);
            const preview = createElement('div', [], { id: 'color-preview' }, 'Click to Pick');
            const values = createElement('div', [], { id: 'color-values' });
            const [hexLabel, hexGroup] = super.createInputGroup('HEX', 'color-hex');
            const [rgbLabel, rgbGroup] = super.createInputGroup('RGB', 'color-rgb');
            const [hslLabel, hslGroup] = super.createInputGroup('HSL', 'color-hsl');
            values.append(hexLabel, hexGroup, rgbLabel, rgbGroup, hslLabel, hslGroup);
            container.append(preview, values);
        }
        bindEvents() {
            qs('#color-preview', this.el).addEventListener('click', () => this.startColorPicker());
        }
        async startColorPicker() {
            if (!('EyeDropper' in window)) {
                this.toolkit.showToast('EyeDropper not supported. Picking element background instead.');
                this.toolkit.startPicker(target => this.updateColorDisplay(window.getComputedStyle(target).backgroundColor), 'copy', false, this);
                return;
            }
            try {
                const result = await new EyeDropper().open();
                this.updateColorDisplay(result?.sRGBHex);
            } catch (e) { this.toolkit.showToast('Color picking cancelled.'); }
        }
        updateColorDisplay(color) {
            if (!color) return;
            const hexColor = color.startsWith('rgb') ? `#${[...color.matchAll(/\d+/g)].map(m=>parseInt(m[0]).toString(16).padStart(2,'0')).join('')}`.toUpperCase() : color.toUpperCase();
            qs('#color-preview', this.el).style.backgroundColor = hexColor;
            qs('#color-hex', this.el).value = hexColor;
            qs('#color-rgb', this.el).value = colorUtils.hexToRgb(hexColor);
            qs('#color-hsl', this.el).value = colorUtils.hexToHsl(hexColor);
        }
    }

    class DebuggerComponent extends ToolkitComponent {
        constructor(toolkit) { super(toolkit, 'debugger', '⏸️ Pause'); }
        buildContent() {
            const container = createElement('div', ['d-flex', 'gap-10', 'align-center'], { style: 'margin-bottom: 15px;' });
            const select = createElement('select', ['toolkit-select'], { id: 'debugger-delay' });
            [['Instant', 0], ['3 seconds', 3000], ['6 seconds', 6000], ['9 seconds', 9000]].forEach(([text, val]) => select.add(new Option(text, val)));
            container.append( createElement('label', [], { for: 'debugger-delay' }, 'Delay:'), select, createElement('button', ['toolkit-btn', 'primary'], { id: 'trigger-debugger-btn' }, 'Trigger Pause') );
            this.el.append(
                createElement('h4', [], {}, 'JavaScript Debugger'),
                createElement('p', [], {}, 'Pauses script execution with an optional delay.'),
                container, createElement('hr'),
                createElement('h4', [], {}, 'Userscript Error Log'),
                createElement('div', ['log-box'], {id: 'userscript-error-log'}, 'No userscript errors captured.')
            );
        }
        bindEvents() {
            qs('#trigger-debugger-btn', this.el).addEventListener('click', () => {
                const isOpen = window.outerWidth - window.innerWidth > 160 || window.outerHeight - window.innerHeight > 160;
                if (!isOpen) { alert('DevTools is not open. Please open DevTools (F12) before triggering the pause.'); return; }

                clearInterval(this.toolkit.countdownInterval);
                const delay = parseInt(qs('#debugger-delay', this.el).value, 10);
                if (delay === 0) { this.toolkit.showToast('Pausing now...'); debugger; return; }

                let remaining = delay / 1000;
                this.toolkit.showToast(`Pausing in ${remaining}s...`, 1100);
                remaining--;

                this.toolkit.countdownInterval = setInterval(() => {
                    if (remaining > 0) {
                        this.toolkit.showToast(`Pausing in ${remaining}s...`, 1100);
                        remaining--;
                    } else {
                        clearInterval(this.toolkit.countdownInterval);
                        this.toolkit.showToast('Pausing now...');
                        debugger;
                    }
                }, 1000);
            });
            window.addEventListener('error', (e) => this.handleGlobalError(e));
        }
        handleGlobalError(error) {
            if (!error.filename || !(error.filename.includes('userscript.html') || error.filename.startsWith('blob:'))) return;
            const logBox = qs('#userscript-error-log', this.el);
            if (!logBox) return;
            if (logBox.textContent === 'No userscript errors captured.') clearElement(logBox);
            const msg = `[${new Date().toLocaleTimeString()}] ${error.message} (at ${error.filename.split('/').pop()}:${error.lineno})`;
            const item = createElement('div', ['error-item'], {}, msg);
            logBox.prepend(item);
        }
    }

    class SettingsManager {
        constructor(toolkit) { this.toolkit = toolkit; this.prefs = {}; this.STORAGE_KEY = 'dev-toolkit-prefs-v5.3.0'; }
        getDefaults() {
            const defaultOrder = this.toolkit.componentDefinitions.map(c => new c(this.toolkit).id);
            return {
                ui: { positionSide: 'left', isLocked: false, panelWidth: 450 },
                activeTab: 'inspector',
                components: Object.fromEntries(this.toolkit.componentDefinitions.map(c => [new c(this.toolkit).id, { enabled: true, showInToolbar: true }])),
                debug: { autoToggleWithDevTools: false },
                ai: { enabled: true, provider: 'gemini', mode: 'newtab', promptTemplates: {
                    errorFix: { name: 'Fix an Error', prompt: 'You are a professional userscript JavaScript developer specializing in debugging. Analyze the following captured error message and suggest a fix. If a full script is provided, reference it to provide a more accurate solution.' },
                    domExplain: { name: 'Explain an Element', prompt: 'You are a web developer expert. Describe the following HTML element, its purpose, and any notable attributes.' }
                }},
                'components.order': defaultOrder
            };
        }
        async load() {
            const defaults = this.getDefaults();
            const loadedPrefs = await GM.getValue(this.STORAGE_KEY, defaults);
            this.prefs = loadedPrefs;
            for (const key in defaults) { if (typeof defaults[key] === 'object' && defaults[key] !== null && !Array.isArray(defaults[key])) { this.prefs[key] = { ...defaults[key], ...(this.prefs[key] || {}) }; } else if (this.prefs[key] === undefined) { this.prefs[key] = defaults[key]; } }
            const defaultOrder = this.toolkit.componentDefinitions.map(c => new c(this.toolkit).id);
            if(!this.prefs['components.order'] || this.prefs['components.order'].length !== defaultOrder.length) this.prefs['components.order'] = defaultOrder;
            await this.save();
        }
        async save() { await GM.setValue(this.STORAGE_KEY, this.prefs); }
        get(key) { return key.split('.').reduce((o, i) => o?.[i], this.prefs); }
        set(key, value) {
            const keys = key.split('.');
            let obj = this.prefs;
            for (let i = 0; i < keys.length - 1; i++) {
                if (obj[keys[i]] === undefined || typeof obj[keys[i]] !== 'object') obj[keys[i]] = {};
                obj = obj[keys[i]];
            }
            obj[keys[keys.length - 1]] = value;
            this.save();
        }
        getComponentState(id) { return this.prefs.components[id]; }
        setComponentState(id, state) { this.prefs.components[id] = state; this.save(); }
    }

    function getCssPath(el) {
        if (!(el instanceof Element)) return '';
        let path = [];
        while (el && el.nodeType === Node.ELEMENT_NODE) {
            let selector = el.nodeName.toLowerCase();
            if (el.id) {
                selector += '#' + el.id.trim().split(' ')[0].replace(/(:|\.|\[|\]|,|=)/g, '\\$1');
                path.unshift(selector);
                break;
            } else {
                let sib = el, nth = 1;
                while ((sib = sib.previousElementSibling)) {
                    if (sib.nodeName.toLowerCase() == selector) nth++;
                }
                if (nth != 1) selector += `:nth-of-type(${nth})`;
            }
            path.unshift(selector);
            el = el.parentNode;
        }
        return path.join(" > ");
    }

    // --- INITIALIZATION ---
    new DevToolkit().init();

})();