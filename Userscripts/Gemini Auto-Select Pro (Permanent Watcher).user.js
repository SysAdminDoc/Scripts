// ==UserScript==
// @name         Gemini Auto-Select Pro (Permanent Watcher)
// @namespace    http://tampermonkey.net/
// @version      2.1
// @description  Continuously ensures the "Pro" or "Advanced" model is selected.
// @author       You
// @match        https://gemini.google.com/*
// @grant        none
// @run-at       document-idle
// @license MIT
// @downloadURL https://update.greasyfork.org/scripts/564627/Gemini%20Auto-Select%20Pro%20%28Permanent%20Watcher%29.user.js
// @updateURL https://update.greasyfork.org/scripts/564627/Gemini%20Auto-Select%20Pro%20%28Permanent%20Watcher%29.meta.js
// ==/UserScript==

(function() {
    'use strict';

    // 1. CONFIGURATION
    // Add exact keywords that appear in your menu here if they differ.
    const TARGET_KEYWORDS = ["Pro", "Advanced", "Ultra", "1.5 Pro"];
    const CHECK_INTERVAL_MS = 2000; // Check every 2 seconds

    let isSwitching = false;

    function checkAndSwitchModel() {
        // Prevent overlapping attempts
        if (isSwitching) return;

        // A. Find the picker container
        const pickerBtn = document.querySelector('button[aria-label="Open mode picker"]');


        if (!pickerBtn) return; // UI hasn't loaded yet

        // B. Check what is currently selected
        const currentLabel = pickerBtn.innerText || "";

        // If we are already on a target model, do nothing.
        if (TARGET_KEYWORDS.some(keyword => currentLabel.includes(keyword))) {
            return;
        }

        // C. Start the switching process
        isSwitching = true;
        console.log("Gemini Auto-Switcher: Detected '" + currentLabel + "'. Switching to Pro...");

        // Click to open the menu
        pickerBtn.click();

        // Wait for menu animation (500ms)
        setTimeout(() => {
            // Find all menu options
            const menuItems = document.querySelectorAll('.mat-mdc-menu-item-text, div[role="menu"] button');
            let found = false;

            for (let item of menuItems) {
                const itemText = item.innerText;
                // Check if this item is one of our targets
                if (TARGET_KEYWORDS.some(keyword => itemText.includes(keyword))) {
                    const clickableItem = item.closest('button') || item;
                    clickableItem.click();
                    console.log("Gemini Auto-Switcher: Selected " + itemText);
                    found = true;
                    break;
                }
            }

            // If we failed to find the button, close the menu to reset state
            if (!found) {
                console.log("Gemini Auto-Switcher: Target model not found in menu.");
                // Click body to dismiss menu
                document.body.click();
            }

            // Reset flag so we can check again next interval
            isSwitching = false;

        }, 500);
    }

    // 2. PERMANENT LOOP
    // We use setInterval instead of MutationObserver for better stability on SPAs
    setInterval(checkAndSwitchModel, CHECK_INTERVAL_MS);

})();