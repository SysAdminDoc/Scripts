// ==UserScript==
// @name         pfSense Auto Login
// @namespace    https://192.168.1.1/
// @version      1.1
// @description  Automatically fills and submits pfSense login form with progress indicator
// @author       Matt
// @match        *://192.168.1.1/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';

    const CREDENTIALS = {
        username: 'admin',
        password: '!2L1ng3r!'
    };

    const REDIRECT_URL = 'http://192.168.1.1/pfblockerng/pfblockerng_alerts.php?view=unified';

    // Progress popup
    const popup = {
        element: null,
        statusEl: null,

        create() {
            const container = document.createElement('div');
            container.id = 'pfsense-autologin-popup';
            container.innerHTML = `
                <div class="popup-content">
                    <div class="spinner"></div>
                    <div class="status">Initializing...</div>
                </div>
            `;

            const style = document.createElement('style');
            style.textContent = `
                #pfsense-autologin-popup {
                    position: fixed;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    z-index: 999999;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                }
                #pfsense-autologin-popup .popup-content {
                    background: linear-gradient(145deg, #1a1a2e, #16213e);
                    border: 1px solid #0f3460;
                    border-radius: 12px;
                    padding: 24px 32px;
                    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
                    display: flex;
                    align-items: center;
                    gap: 16px;
                }
                #pfsense-autologin-popup .spinner {
                    width: 24px;
                    height: 24px;
                    border: 3px solid #0f3460;
                    border-top-color: #4ade80;
                    border-radius: 50%;
                    animation: spin 0.8s linear infinite;
                }
                #pfsense-autologin-popup .status {
                    color: #e2e8f0;
                    font-size: 14px;
                    font-weight: 500;
                    min-width: 180px;
                }
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
            `;

            document.head.appendChild(style);
            document.body.appendChild(container);

            this.element = container;
            this.statusEl = container.querySelector('.status');
        },

        show(message) {
            if (!this.element) this.create();
            this.statusEl.textContent = message;
            this.element.style.display = 'block';
        },

        hide() {
            if (this.element) this.element.style.display = 'none';
        }
    };

    function fillAndSubmit() {
        const userField = document.getElementById('usernamefld');
        const passField = document.getElementById('passwordfld');

        if (!userField || !passField) return false;
        if (userField.dataset.autofilled) return false;

        popup.show('Filling credentials...');

        userField.value = CREDENTIALS.username;
        passField.value = CREDENTIALS.password;
        userField.dataset.autofilled = 'true';

        setTimeout(() => {
            popup.show('Submitting login...');

            const submitBtn = document.querySelector('input[name="login"]');
            if (submitBtn) {
                // Store redirect flag before form submission
                sessionStorage.setItem('pfsense-autologin-redirect', 'true');
                submitBtn.click();
            }
        }, 300);

        return true;
    }

    // Check if we need to redirect after login
    function checkRedirect() {
        if (sessionStorage.getItem('pfsense-autologin-redirect') === 'true') {
            // Check if login was successful (no login form present)
            const loginForm = document.querySelector('form.login');
            if (!loginForm && window.location.href !== REDIRECT_URL) {
                sessionStorage.removeItem('pfsense-autologin-redirect');
                popup.show('Redirecting to pfBlockerNG...');
                setTimeout(() => {
                    window.location.href = REDIRECT_URL;
                }, 500);
                return true;
            }
        }
        return false;
    }

    // Main logic
    if (checkRedirect()) return;

    if (fillAndSubmit()) return;

    // Watch for form appearing after timeout
    const observer = new MutationObserver(() => {
        if (fillAndSubmit()) observer.disconnect();
    });

    observer.observe(document.body, { childList: true, subtree: true });

    setTimeout(() => observer.disconnect(), 60000);
})();