// ==UserScript==
// @name         NextDNS Bulk Deleter (Rate Limit Safe)
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Clicks the delete button 10 times, refreshes, waits 2 minutes, and repeats.
// @author       You
// @match        https://my.nextdns.io/*
// @exclude      https://my.nextdns.io/d76abd/logs
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // --- Configuration ---
    const BATCH_SIZE = 30;           // How many items to delete at once
    const WAIT_TIME_MS = 10000;     // 2 minutes in milliseconds
    const CLICK_DELAY_MS = 300;      // Small delay between clicks to prevent browser stutter
    const STORAGE_KEY = 'nextdns_deleter_next_run';

    // --- UI Helper ---
    // Create a fixed status box to let the user know what's happening
    const statusBox = document.createElement('div');
    statusBox.style.position = 'fixed';
    statusBox.style.bottom = '20px';
    statusBox.style.right = '20px';
    statusBox.style.padding = '15px';
    statusBox.style.backgroundColor = '#222';
    statusBox.style.color = '#fff';
    statusBox.style.zIndex = '9999';
    statusBox.style.borderRadius = '8px';
    statusBox.style.fontFamily = 'monospace';
    statusBox.style.boxShadow = '0 4px 6px rgba(0,0,0,0.3)';
    statusBox.innerText = 'NextDNS Deleter: Initializing...';
    document.body.appendChild(statusBox);

    function updateStatus(text) {
        statusBox.innerText = `NextDNS Deleter: ${text}`;
    }

    // --- Main Logic ---

    // 1. Check if we need to wait (Rate Limit Cooling)
    const nextRun = localStorage.getItem(STORAGE_KEY);
    const now = Date.now();

    if (nextRun && now < parseInt(nextRun)) {
        // We are in the cooling period
        const interval = setInterval(() => {
            const remaining = parseInt(nextRun) - Date.now();
            if (remaining <= 0) {
                clearInterval(interval);
                runDeletionBatch();
            } else {
                const secondsLeft = Math.ceil(remaining / 1000);
                updateStatus(`Waiting ${secondsLeft}s for rate limit cooldown...`);
            }
        }, 1000);
    } else {
        // No wait needed, run immediately
        // We add a small delay on load just to ensure DOM is ready
        setTimeout(runDeletionBatch, 2000);
    }

    async function runDeletionBatch() {
        updateStatus('Scanning for delete buttons...');

        // Find all buttons containing the xmark svg
        // We look for the SVG class 'fa-xmark' and get the closest button parent
        const deleteIcons = Array.from(document.querySelectorAll('svg.fa-xmark'));
        const buttons = deleteIcons.map(icon => icon.closest('button')).filter(btn => btn !== null);

        if (buttons.length === 0) {
            updateStatus('No entries found. Script finished.');
            // Clear the storage so it doesn't wait next time you add items
            localStorage.removeItem(STORAGE_KEY);
            return;
        }

        const buttonsToClick = buttons.slice(0, BATCH_SIZE);
        updateStatus(`Found ${buttons.length} entries. Deleting batch of ${buttonsToClick.length}...`);

        for (let i = 0; i < buttonsToClick.length; i++) {
            updateStatus(`Deleting item ${i + 1}/${buttonsToClick.length}...`);
            buttonsToClick[i].click();
            await new Promise(r => setTimeout(r, CLICK_DELAY_MS));
        }

        updateStatus('Batch complete. Setting timer and refreshing...');

        // Set the timer for the NEXT run
        localStorage.setItem(STORAGE_KEY, Date.now() + WAIT_TIME_MS);

        // Wait a moment for requests to fire, then reload
        setTimeout(() => {
            window.location.reload();
        }, 2000);
    }

})();