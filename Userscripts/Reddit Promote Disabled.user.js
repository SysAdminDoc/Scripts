// ==UserScript==
// @name         Reddit Promote Disabled
// @namespace    http://tampermonkey.net/
// @version      2.1
// @description  Removes promoted posts from Reddit feed
// @author       dil83
// @license      MIT
// @match        https://www.reddit.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=reddit.com
// @grant        none
// @downloadURL https://update.greasyfork.org/scripts/552500/Reddit%20Promote%20Disabled.user.js
// @updateURL https://update.greasyfork.org/scripts/552500/Reddit%20Promote%20Disabled.meta.js
// ==/UserScript==

(function() {
    'use strict';

    const CONFIG = {
        promotedSelectors: ['shreddit-ad-post', '[data-testid="post-container"][data-promoted="true"]'],
        scanInterval: 1000,
        maxRetries: 3
    };

    let isProcessing = false;
    let pendingMutations = [];

    function throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        }
    }

    function removePromotedPosts() {
        if (isProcessing) {
            return;
        }

        isProcessing = true;

        try {
            CONFIG.promotedSelectors.forEach(selector => {
                const promotedPosts = document.querySelectorAll(selector);
                promotedPosts.forEach(post => {
                    if (post.parentNode) {
                        post.remove();
                        console.log('Removed promoted post:', selector);
                    }
                });
            });
        } catch (error) {
            console.warn('Error removing promoted posts:', error);
        } finally {
            isProcessing = false;
        }
    }

    const throttledRemovePromoted = throttle(removePromotedPosts, 250);

    throttledRemovePromoted();

    const observer = new MutationObserver((mutations) => {
        let shouldProcess = false;

        mutations.forEach((mutation) => {
            if (mutation.type === 'childList') {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        CONFIG.promotedSelectors.some(selector => {
                            if ((node.matches && node.matches(selector)) ||
                                (node.querySelector && node.querySelector(selector))) {
                                shouldProcess = true;
                                return true;
                            }
                            return false;
                        });
                    }
                });
            }
        });

        if (shouldProcess) {
            throttledRemovePromoted();
        }
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    setInterval(throttledRemovePromoted, CONFIG.scanInterval);

})();
