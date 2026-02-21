// ==UserScript==
// @name         Glassdoor Paywall Remover v1.3
// @description  Applies display:none on #unified-user-auth and removes the lock on the body.
// @author       Percio Andrade
// @version      1.3
// @include      http*://*glassdoor.*
// @namespace    http://www.greasyfork.org
// @license      MIT
// @run-at       document-start
// @downloadURL https://update.greasyfork.org/scripts/531857/Glassdoor%20Paywall%20Remover%20v13.user.js
// @updateURL https://update.greasyfork.org/scripts/531857/Glassdoor%20Paywall%20Remover%20v13.meta.js
// ==/UserScript==

(function() {
    'use strict';

    // 1. IMMEDIATE CSS: Hides the auth container before it renders
    const style = document.createElement('style');
    style.innerHTML = `
        /* The target you identified */
        #unified-user-auth,
        .unified-user-auth,
        div[id*="Hardsell"],
        div[class*="Hardsell"] {
            display: none !important;
            visibility: hidden !important;
            pointer-events: none !important;
        }

        /* Ensures scrolling works even if JS lags */
        body, html {
            overflow: auto !important;
            position: static !important;
        }
    `;
    document.documentElement.appendChild(style);

    // 2. BODY TAG CLEANUP
    // Removes the entire 'style' attribute to clear "overflow: hidden; position: fixed;"
    function cleanBody() {
        const body = document.body;
        if (body && body.getAttribute('style')) {
            // Only remove if it contains the locking properties
            const style = body.getAttribute('style');
            if (style.includes('overflow') || style.includes('fixed')) {
                body.removeAttribute('style');
            }
        }
    }

    // 3. MONITORING
    // Since the site re-applies the style, we remove it again.
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.target === document.body && mutation.type === 'attributes') {
                cleanBody();
            }
        });
    });

    // Starts as soon as the body exists
    const init = setInterval(() => {
        if (document.body) {
            cleanBody();
            
            // Activates the observer to ensure the lock doesn't return
            observer.observe(document.body, {
                attributes: true,
                attributeFilter: ['style']
            });
            
            clearInterval(init);
        }
    }, 50);

    // Backup: Runs every second just to be sure
    setInterval(cleanBody, 1000);

})();