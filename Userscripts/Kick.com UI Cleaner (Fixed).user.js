// ==UserScript==
// @name         Kick.com UI Cleaner (Fixed)
// @namespace    http://tampermonkey.net/
// @version      2.5
// @description  Hide UI elements, enable a Twitch-like layout with reliable hover pop-out header/sidebar, and tweak navigation on Kick.com.
// @author       Gemini & FuttBuckers
// @match        https://kick.com/*
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// ==/UserScript==

(function() {
    'use strict';

    /**
     * Configuration for the elements you want to control.
     */
    const SETTINGS_CONFIG = {
        twitchMode: {
            label: 'Toggle Twitch Mode Layout',
            isLayout: true
        },
        changeLogoLink: {
            label: 'Change Logo Link to Following Page',
            isLogic: true
        },
        hideFollowButton: {
            label: 'Toggle Follow Button',
            selector: 'button[data-testid="follow-button"]'
        },
        hideGiftButton: {
            label: 'Toggle Gift Subs Button',
            selector: 'button[data-testid="gift-sub-button"]'
        },
        hideSubButton: {
            label: 'Toggle Subscribe Button',
            selector: 'button[data-testid="sub-button"]'
        },
        hideRecommended: {
            label: 'Toggle Recommended Sections',
            selector: 'section:has([data-testid^="sidebar-recommended-channel"])'
        }
    };

    let styleElement = null;
    let logoClickHandler = null; // Store the click handler to properly remove it

    /**
     * Changes the Kick logo link and adds/removes a click listener to bypass SPA routing.
     */
    function handleLogoLink() {
        const logoLink = document.querySelector('nav a[title="Home"]');
        if (!logoLink) return;

        // Clean up any previous listener before deciding what to do next
        if (logoClickHandler) {
            logoLink.removeEventListener('click', logoClickHandler, true);
            logoClickHandler = null;
        }
        logoLink.removeAttribute('data-userscript-click-handler');

        if (GM_getValue('changeLogoLink', false)) {
            logoLink.href = '/following';

            logoClickHandler = (e) => {
                // Final check in case the setting was toggled while the page was loading
                if (GM_getValue('changeLogoLink', false)) {
                    e.preventDefault();
                    e.stopPropagation();
                    window.location.href = logoLink.href; // Force navigation
                }
            };

            logoLink.addEventListener('click', logoClickHandler, true);
            logoLink.setAttribute('data-userscript-click-handler', 'true');
        } else {
            // Revert to the original link if the setting is disabled
            logoLink.href = '/';
        }
    }


    /**
     * Reads the saved settings and applies the necessary CSS.
     */
    function applyStyles() {
        if (styleElement) {
            styleElement.remove();
        }

        const twitchModeEnabled = GM_getValue('twitchMode', false);
        let cssToApply = '';

        if (twitchModeEnabled) {
            document.body.classList.add('kick-twitch-mode');
            cssToApply += `
                /* --- Twitch Mode CSS --- */

                /* Hide the info box below the video */
                body.kick-twitch-mode #channel-content {
                    display: none !important;
                }

                /* --- Pop-down Header on Hover --- */
                body.kick-twitch-mode nav {
                    position: fixed !important;
                    display: flex !important;
                    top: calc(-1 * var(--navbar-height, 60px)); /* Hide nav completely */
                    padding-bottom: 25px; /* Add a 25px invisible hover area at the bottom */
                    clip-path: inset(0 0 -25px 0); /* Make the padded area hoverable */
                    left: 0;
                    right: 0;
                    z-index: 1000;
                    transition: top 0.2s ease-in-out;
                }

                body.kick-twitch-mode nav:hover {
                    top: 0 !important;
                }

                /* --- Pop-out Sidebar on Hover --- */
                body.kick-twitch-mode #sidebar-wrapper {
                    display: flex !important;
                    position: fixed !important;
                    left: calc(-1 * var(--sidebar-expanded-width, 240px));
                    padding-right: 25px; /* Add a 25px invisible hover area */
                    clip-path: inset(0 -25px 0 0); /* Make the padded area hoverable */
                    top: 0;
                    bottom: 0;
                    height: 100vh !important;
                    z-index: 1001; /* Higher z-index to overlap header */
                    transition: left 0.2s ease-in-out;
                }

                body.kick-twitch-mode #sidebar-wrapper:hover {
                    left: 0 !important;
                }

                /* Make the main flex container full viewport height */
                body.kick-twitch-mode .w-xvw.flex.flex-1 {
                    padding-top: 0 !important;
                    height: 100vh;
                    max-height: 100vh;
                }

                /* Main container for video and chat */
                body.kick-twitch-mode .bg-surface-lower.flex.lg\\:flex-1 {
                    height: 100% !important;
                    max-height: 100vh !important;
                }

                /* Video player container adjustments */
                body.kick-twitch-mode main[data-theatre-mode-container="true"] {
                    width: 100%;
                }
                body.kick-twitch-mode main[data-theatre-mode-container="true"] > div:first-child,
                body.kick-twitch-mode #injected-channel-player {
                    height: 100vh !important;
                    max-height: 100vh !important;
                }

                /* Chat column styling */
                body.kick-twitch-mode #channel-chatroom {
                    width: 340px !important;
                    min-width: 340px !important;
                    flex-shrink: 0;
                    height: 100vh !important;
                    max-height: 100vh !important;
                    opacity: 1 !important;
                }
            `;
        } else {
            document.body.classList.remove('kick-twitch-mode');
        }

        // Apply simple hide toggles
        for (const key in SETTINGS_CONFIG) {
            const config = SETTINGS_CONFIG[key];
            if (config.selector && GM_getValue(key, false)) {
                cssToApply += `${config.selector} { display: none !important; }\n`;
            }
        }

        if (cssToApply) {
            styleElement = GM_addStyle(cssToApply);
        }
    }

    /**
     * This function runs all the modifications (CSS and JavaScript based).
     */
    function applyAllChanges() {
        applyStyles();
        handleLogoLink();
    }

    /**
     * Registers a command in the userscript manager's menu for a specific setting.
     */
    function setupMenuCommand(key, config) {
        GM_registerMenuCommand(config.label, () => {
            const currentValue = GM_getValue(key, false);
            GM_setValue(key, !currentValue);
            applyAllChanges();
        });
    }

    // --- Main Execution ---

    // Set up the menu commands.
    for (const key in SETTINGS_CONFIG) {
        setupMenuCommand(key, SETTINGS_CONFIG[key]);
    }

    // Apply all changes when the script first loads.
    applyAllChanges();

    // Set up an observer to re-apply changes when the page navigates.
    const observer = new MutationObserver(() => {
        applyAllChanges();
    });

    observer.observe(document.body, { childList: true, subtree: true });

})();

