// ==UserScript==
// @name         Auto-Check Google reCAPTCHA (Brute Force)
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  Attempts to auto-check Google reCAPTCHA checkbox despite CSP, with human-like behavior
// @author       Grok
// @match        https://www.google.com/sorry/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    // Random delay to mimic human behavior
    function randomDelay(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    // Simulate mouse movement event
    function simulateMouseMove(element, callback) {
        try {
            const rect = element.getBoundingClientRect();
            const x = rect.left + rect.width / 2 + (Math.random() * 50 - 25);
            const y = rect.top + rect.height / 2 + (Math.random() * 50 - 25);

            const mouseMove = new MouseEvent('mousemove', {
                view: window,
                bubbles: true,
                cancelable: true,
                clientX: x,
                clientY: y
            });
            document.dispatchEvent(mouseMove);
            if (callback) {
                setTimeout(callback, randomDelay(100, 300));
            }
        } catch (e) {
            console.log('Mouse move simulation failed:', e.message);
        }
    }

    // Simulate human-like click
    function simulateHumanClick(element) {
        try {
            const events = [
                ['mouseover', {}],
                ['mousedown', {}],
                ['click', {}],
                ['mouseup', {}]
            ];

            events.forEach(([type, options]) => {
                const event = new MouseEvent(type, {
                    view: window,
                    bubbles: true,
                    cancelable: true
                });
                element.dispatchEvent(event);
            });
            console.log('Simulated click on reCAPTCHA checkbox');
        } catch (e) {
            console.log('Click simulation failed:', e.message);
        }
    }

    // Check and click the checkbox (main page or iframe)
    function checkRecaptcha() {
        let checkbox = document.querySelector('#recaptcha-anchor');

        // If not found, try iframes
        if (!checkbox) {
            const iframes = document.querySelectorAll('iframe[src*="recaptcha/api2/anchor"]');
            for (const iframe of iframes) {
                try {
                    const frameDoc = iframe.contentDocument || iframe.contentWindow.document;
                    checkbox = frameDoc.querySelector('#recaptcha-anchor');
                    if (checkbox) break;
                } catch (e) {
                    console.log('Iframe access failed:', e.message);
                    continue;
                }
            }
        }

        if (checkbox && checkbox.getAttribute('aria-checked') === 'false') {
            simulateMouseMove(checkbox, () => {
                setTimeout(() => {
                    simulateHumanClick(checkbox);
                }, randomDelay(500, 1500));
            });
            return true;
        } else if (!checkbox) {
            console.log('reCAPTCHA checkbox not found, retrying...');
            return false;
        } else {
            console.log('reCAPTCHA checkbox already checked');
            return true;
        }
    }

    // Retry mechanism for dynamic loading
    function retryCheck(maxRetries, attempt = 0) {
        if (attempt >= maxRetries) {
            console.log('Max retries reached, giving up.');
            return;
        }

        setTimeout(() => {
            if (!checkRecaptcha()) {
                retryCheck(maxRetries, attempt + 1);
            }
        }, randomDelay(500, 2000));
    }

    // Start the process
    function init() {
        // Run immediately and retry up to 5 times
        retryCheck(5);

        // Observe DOM changes for dynamic loading
        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.addedNodes.length) {
                    if (checkRecaptcha()) {
                        observer.disconnect(); // Stop observing once successful
                    }
                }
            }
        });

        observer.observe(document, {
            childList: true,
            subtree: true
        });
    }

    // Try running as early as possible
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(init, randomDelay(1000, 3000));
        });
    } else {
        setTimeout(init, randomDelay(1000, 3000));
    }
})();