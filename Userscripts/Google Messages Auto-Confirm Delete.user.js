// ==UserScript==
// @name         Google Messages Auto-Confirm Delete
// @namespace    https://messages.google.com
// @version      1.0
// @description  Automatically clicks Delete on confirmation dialogs
// @match        https://messages.google.com/web/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';

    const observer = new MutationObserver(() => {
        const confirmBtn = document.querySelector('mat-dialog-container [data-e2e-action-button-confirm]');
        if (confirmBtn) {
            confirmBtn.click();
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });
})();