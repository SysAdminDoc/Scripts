// ==UserScript==
// @name         Scribd Cleaner & Downloader (Consolidated)
// @namespace    http://tampermonkey.net/
// @version      3.9.0
// @description  Combines logic to automatically redirect to embed view, clean document clutter, remove blur/paywalls, and trigger print-to-PDF for downloading Scribd documents. Ensures the processing popup is hidden during print.
// @author       Consolidator
// @match        https://www.scribd.com/*
// @icon         https://www.scribd.com/favicon.ico
// @grant        GM_addStyle
// @grant        GM_openInTab
// @grant        GM_setValue
// @grant        GM_getValue
// @run-at       document-idle
// @license      MIT
// ==/UserScript==

(function() {
    'use strict';

    // ==================== CONFIG & UTILITIES ====================

    const BUTTON_DELAY = 1500;
    const EMBED_URL_TEMPLATE = "https://www.scribd.com/embeds/{id}/content";
    const AUTO_REDIRECT_KEY = 'sd_auto_redirect_enabled';

    /**
     * Extracts the Scribd document ID from a URL.
     * @param {string} url The URL to check.
     * @returns {string|null} The document ID or null.
     */
    function getDocId(url = window.location.href) {
        try {
            const u = new URL(url, window.location.origin);
            const path = u.pathname;
            let m = path.match(/\/(?:doc|document|book|embeds|read)\/(\d+)/i);
            if (m && m[1]) return m[1];
            m = path.match(/\/(\d+)(?:$|\/)/);
            if (m && m[1]) return m[1];
        } catch (e) {
            console.error("Error extracting Scribd ID:", e);
        }
        return null;
    }

    /**
     * Checks if the current page is an Scribd embed view.
     * @returns {boolean} True if on an embed page.
     */
    function isEmbed() {
        return window.location.pathname.includes('/embeds/');
    }

    /**
     * Sleeps for a given duration.
     * @param {number} ms Milliseconds to wait.
     * @returns {Promise<void>}
     */
    function sleep(ms) {
        return new Promise(r => setTimeout(r, ms));
    }

    // ==================== STYLES (Minimal & Print) ====================

    GM_addStyle(`
        /* Floating Button - Main Page */
        #sd-floating-btn, #sd-download-btn, #sd-redirect-toggle {
            position: fixed !important;
            z-index: 2147483647 !important;
            border: none !important;
            font-weight: 700 !important;
            cursor: pointer !important;
            transition: all 0.3s ease !important;
            display: flex !important;
            align-items: center !important;
            gap: 8px !important;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
        }

        #sd-floating-btn {
            top: 80px !important;
            right: 20px !important;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
            color: white !important;
            padding: 12px 20px !important;
            border-radius: 12px !important;
            font-size: 14px !important;
            box-shadow: 0 4px 15px rgba(102, 126, 234, 0.5) !important;
        }

        /* Redirect Toggle Button */
        #sd-redirect-toggle {
            top: 145px !important;
            right: 20px !important;
            background: #444 !important;
            color: #eee !important;
            padding: 8px 12px !important;
            border-radius: 8px !important;
            font-size: 12px !important;
            box-shadow: 0 2px 5px rgba(0,0,0,0.3) !important;
        }
        #sd-redirect-toggle.enabled {
            background: #28a745 !important;
        }
        #sd-redirect-toggle.disabled {
            background: #dc3545 !important;
        }


        #sd-download-btn {
            top: 20px !important;
            right: 20px !important;
            background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%) !important;
            color: white !important;
            padding: 14px 24px !important;
            border-radius: 12px !important;
            font-size: 15px !important;
            box-shadow: 0 4px 15px rgba(17, 153, 142, 0.5) !important;
        }

        #sd-floating-btn:hover, #sd-download-btn:hover, #sd-redirect-toggle:hover {
            transform: scale(1.05) !important;
        }

        #sd-floating-btn.loading, #sd-download-btn.loading {
            background: linear-gradient(135deg, #ffa726 0%, #fb8c00 100%) !important;
            pointer-events: none !important;
        }

        /* Progress Popup */
        #sd-progress-popup {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            height: 100% !important;
            background: rgba(0,0,0,0.9) !important;
            z-index: 2147483647 !important;
            display: flex !important;
            justify-content: center !important;
            align-items: center !important;
        }

        /* Prevent scrolling interruption */
        .sd-no-scroll {
            overflow: hidden !important;
        }

        /* --- GENERAL Cleanup (New CSS for Osano Banner, Pop-up & Spam) --- */
        /* Hide the Osano Cookie/Opt-Out Banner using its ID */
        #515b43f3-d38b-4a48-8e79-ebbe7e1a6e25 {
            display: none !important;
        }

        /* Hide common transient privacy/toast notifications (Opt-Out Signal Honored) */
        [class*="opt-out"], [class*="toast"], [class*="snackbar"] {
            display: none !important;
        }

        /* Hide original 'Download this PDF' link in embed toolbar */
        .toolbarDownload {
            display: none !important;
        }

        /* Hide common promotional elements on the main document page */
        body:not(.embed) [class*="upsell"],
        body:not(.embed) [class*="paywall"],
        body:not(.embed) [class*="sign_in_prompt"],
        body:not(.embed) [class*="subscribe_prompt"],
        body:not(.embed) [class*="download_cta"],
        body:not(.embed) [class*="ads_container"],
        /* Hide specific elements found in the sample */
        body:not(.embed) [data-e2e="download_button"],
        body:not(.embed) .cta_element {
            display: none !important;
        }


        /* Critical Print CSS Improvement */
        @media print {
            /* HIDE: download buttons, redirect toggle, notification popups, processing popup, and Osano banner */
            #sd-download-btn, #sd-notification-popup, #sd-redirect-toggle, #sd-progress-popup, #515b43f3-d38b-4a48-8e79-ebbe7e1a6e25 {
                display: none !important;
            }

            /* Ensure the content uses 100% width and height, enforce page breaks */
            .page, .page_container {
                width: 100% !important;
                height: auto !important;
                min-height: 0 !important;
                margin: 0 !important;
                padding: 0 !important;
                box-sizing: border-box !important;
                page-break-before: always;
                page-break-after: always;
            }
            /* Remove background images/containers that interfere with printing */
            .reader_page_bg, .page_overlay, .page_blur {
                display: none !important;
            }
            /* Ensure content text is black and visible */
            * {
                color: #000 !important;
                background: none !important;
                box-shadow: none !important;
                text-shadow: none !important;
                border: none !important;
            }
        }
    `);

    // ==================== MAIN PAGE LOGIC (Redirect/Button) ====================

    function getDocumentTitle() {
        // Attempt to grab title from the main page document header first
        const mainPageTitleElement = document.querySelector('h1[data-e2e="document_page_title"] p');
        if (mainPageTitleElement) {
            let title = mainPageTitleElement.textContent.trim();
            title = title.replace(/[\\/:*?"<>|]/g, '').trim(); // Clean for filename safety
            return title || 'Scribd Document';
        }

        // Fallback to the title on the embed page structure
        const embedPageTitleElement = document.querySelector('[data-e2e="doc_page_title"] p');
        if (embedPageTitleElement) {
            let title = embedPageTitleElement.textContent.trim();
            title = title.replace(/[\\/:*?"<>|]/g, '').trim();
            return title || 'Scribd Document';
        }

        // Final fallback
        return document.title.replace(/[\\/:*?"<>|]/g, '').trim() || 'Scribd Document';
    }

    function toggleRedirect(currentStatus) {
        const newStatus = !currentStatus;
        GM_setValue(AUTO_REDIRECT_KEY, newStatus);

        const toggleBtn = document.getElementById('sd-redirect-toggle');
        if (toggleBtn) {
            toggleBtn.classList.toggle('enabled', newStatus);
            toggleBtn.classList.toggle('disabled', !newStatus);
            toggleBtn.innerHTML = newStatus ? '↪️ Auto Redirect: **ON**' : '↪️ Auto Redirect: **OFF**';
        }
    }

    function handleDocumentPageRedirect() {
        // Read preference, default to true
        const autoRedirectEnabled = GM_getValue(AUTO_REDIRECT_KEY, true);
        if (!autoRedirectEnabled) return;

        const id = getDocId(window.location.href);
        if (!id) return;
        if (isEmbed()) return;

        const embedUrl = EMBED_URL_TEMPLATE.replace("{id}", id) + "?view_mode=scroll";

        if (embedUrl !== window.location.href) {
            console.log(`Redirecting document ${id} to embed view: ${embedUrl}`);
            window.location.replace(embedUrl);
        }
    }

    function showMainButton() {
        if (document.getElementById('sd-floating-btn')) return;

        const docId = getDocId();
        if (!docId) return;

        // Set the document title immediately on the main page for pre-emptive print naming
        document.title = getDocumentTitle();

        // --- Main Button (Open Embed) ---
        const btn = document.createElement('button');
        btn.id = 'sd-floating-btn';
        btn.innerHTML = '🚀 Open Embed Page';
        btn.onclick = () => {
            const embedUrl = EMBED_URL_TEMPLATE.replace("{id}", docId);
            btn.classList.add('loading');
            btn.innerHTML = '⏳ Opening...';

            if (typeof GM_openInTab === 'function') {
                GM_openInTab(embedUrl, { active: true });
            } else {
                window.open(embedUrl, '_blank');
            }

            setTimeout(() => {
                btn.classList.remove('loading');
                btn.innerHTML = '✅ Opened!';
                setTimeout(() => {
                    btn.innerHTML = '🚀 Open Embed Page';
                }, 3000);
            }, 500);
        };
        document.body.appendChild(btn);

        // --- Toggle Button (Auto Redirect) ---
        const autoRedirectEnabled = GM_getValue(AUTO_REDIRECT_KEY, true);
        const toggleBtn = document.createElement('button');
        toggleBtn.id = 'sd-redirect-toggle';
        toggleRedirect(autoRedirectEnabled); // Initialize display
        toggleBtn.onclick = () => toggleRedirect(GM_getValue(AUTO_REDIRECT_KEY, true));
        document.body.appendChild(toggleBtn);
    }

    // ==================== EMBED PAGE LOGIC (Download Process) ====================

    // Global event handlers for print button visibility and title setting
    let originalTitle = document.title;
    let titleSet = false;

    window.onbeforeprint = function() {
        const btn = document.getElementById('sd-download-btn');
        const popup = document.getElementById('sd-progress-popup');

        if (btn) btn.style.display = 'none';
        if (popup) popup.style.display = 'none'; // Ensure popup is hidden during print

        // Only set the title if it hasn't been set by the initialization process
        if (!titleSet) {
             originalTitle = document.title; // Save original title
             document.title = getDocumentTitle(); // Set new title
             titleSet = true;
        }
    };

    window.onafterprint = function() {
        const btn = document.getElementById('sd-download-btn');
        const popup = document.getElementById('sd-progress-popup');

        if (btn) btn.style.display = 'flex'; // Restore visibility
        if (popup) popup.style.display = 'flex'; // Restore visibility if it was meant to be shown (should have been removed)

        // Restore the original document title
        if (titleSet) {
            document.title = originalTitle;
            titleSet = false;
        }
    };


    function showEmbedButton() {
        if (document.getElementById('sd-download-btn')) return;

        const btn = document.createElement('button');
        btn.id = 'sd-download-btn';
        btn.innerHTML = '⬇️ Prepare & Print PDF';

        // Set the document title immediately on embed page load for print naming
        document.title = getDocumentTitle();
        titleSet = true;

        btn.onclick = startDownloadProcess;
        document.body.appendChild(btn);
    }

    async function startDownloadProcess() {
        const btn = document.getElementById('sd-download-btn');
        btn.classList.add('loading');
        btn.innerHTML = '⏳ Processing...';

        // 1. Setup Progress UI and temporary scroll lock
        const progress = document.createElement('div');
        progress.id = 'sd-progress-popup';
        progress.innerHTML = `
            <div id="sd-progress-content">
                <h2>📚 Preparing PDF...</h2>
                <div id="sd-progress-text">Loading pages...</div>
                <div id="sd-progress-bar">
                    <div id="sd-progress-fill"></div>
                </div>
                <p style="color: #888; font-size: 12px; margin-top: 15px;">
                    Please wait, this may take a moment. Do not interact with the page.
                </p>
            </div>
        `;
        document.body.appendChild(progress);

        const fill = document.getElementById('sd-progress-fill');
        const text = document.getElementById('sd-progress-text');

        // Prevent scrolling interruption
        document.documentElement.classList.add('sd-no-scroll');
        document.body.classList.add('sd-no-scroll');

        try {
            // 2. Scroll all pages to force load
            text.textContent = '📄 Loading all pages...';

            const scroller = document.querySelector('.document_scroller');

            if (!scroller) {
                text.textContent = '❌ Error: Could not find document scroller.';
                throw new Error('Document scroller not found.');
            }

            const scrollStep = 300;
            const scrollInterval = 16;
            const maxScrollTime = 60000; // 60 seconds timeout
            const startTime = Date.now();

            await new Promise((resolve, reject) => {
                let lastScrollTop = scroller.scrollTop;
                let scrollAttemptsAtBottom = 0;

                const intervalId = setInterval(() => {
                    if (Date.now() - startTime > maxScrollTime) {
                        clearInterval(intervalId);
                        reject(new Error('Scroll timeout reached.'));
                        return;
                    }

                    lastScrollTop = scroller.scrollTop;
                    scroller.scrollTop += scrollStep;

                    // Check for end of scroll
                    if (scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight || scroller.scrollTop === lastScrollTop) {
                        scrollAttemptsAtBottom++;
                        // Require 20 continuous attempts at the bottom to ensure all dynamic content loaded
                        if (scrollAttemptsAtBottom > 20) {
                             clearInterval(intervalId);
                             resolve();
                        }
                    } else {
                        scrollAttemptsAtBottom = 0; // Reset if scroll was successful
                    }

                    // Progress is now estimated based on scroll position and height
                    const currentScrollPercent = Math.min(100, Math.round((scroller.scrollTop / scroller.scrollHeight) * 50));
                    fill.style.width = currentScrollPercent + '%';
                    text.textContent = `📄 Force-loading document (approx ${currentScrollPercent}% complete)`;

                }, scrollInterval);
            });

            // 3. Remove junk/clutter/paywalls
            fill.style.width = '60%';
            text.textContent = '🧹 Cleaning up clutter and paywalls...';
            await sleep(200);

            const junkSelectors = [
                '.toolbar_top', '.toolbar_bottom', '.promo_div', '.ReactModalPortal',
                '[class*="paywall"]', '[class*="overlay"]', '[class*="upsell"]',
                '[class*="signup"]', '[class*="banner"]', '[class*="modal"]',
                '.toolbar_drop', '.mobile_overlay', '.comments_container',
                'footer', '.footer', '.bottom-bar', 'header', '.header', '.site_header',
                '.authed_doc_page_wrapper', '.page_blur', '.page_scroller_mask',
                '.abs_mask'
            ];

            junkSelectors.forEach(sel => {
                try {
                    document.querySelectorAll(sel).forEach(el => el.remove());
                } catch(e) {}
            });

            // Remove the document_scroller class to fix layout issues
            if (scroller) {
                scroller.classList.remove('document_scroller');
                scroller.style.overflow = 'visible'; // Ensure content is not clipped for print
            }


            // 4. Fix visibility (remove blur and low opacity)
            fill.style.width = '80%';
            text.textContent = '✨ Optimizing visibility...';
            await sleep(200);

            // Target pages and critical wrappers first
            document.querySelectorAll('.page, .page_container, [id^="page_wrapper_"]').forEach(el => {
                el.style.filter = 'none';
                el.style.opacity = '1';
                el.style.visibility = 'visible';
            });

            // Fallback for all elements
            document.querySelectorAll('*').forEach(el => {
                try {
                    const s = getComputedStyle(el);
                    if (s.filter?.includes('blur')) el.style.filter = 'none';
                    if (parseFloat(s.opacity) < 1) el.style.opacity = '1';
                    if (s.visibility === 'hidden' && el.classList.contains('page_content')) el.style.visibility = 'visible';
                } catch(e) {}
            });

            // Scroll to top for a clean printout start
            window.scrollTo(0, 0);

            // 5. Print
            fill.style.width = '100%';
            text.textContent = '✅ Ready! Opening print dialog...';
            await sleep(400);

            progress.remove();

            // Remove scroll lock
            document.documentElement.classList.remove('sd-no-scroll');
            document.body.classList.remove('sd-no-scroll');

            // window.onbeforeprint handles setting the document.title and hiding the button/popup
            window.print();
            // window.onafterprint handles restoring the title and button visibility

            // Reset button
            btn.classList.remove('loading');
            btn.innerHTML = '✅ Done! Print again?';

            setTimeout(() => {
                btn.innerHTML = '⬇️ Prepare & Print PDF';
            }, 5000);

        } catch (err) {
            console.error('Download process error:', err);

            // Remove scroll lock
            document.documentElement.classList.remove('sd-no-scroll');
            document.body.classList.remove('sd-no-scroll');

            progress.remove();
            btn.classList.remove('loading');
            btn.innerHTML = '❌ Error - Try again';

            setTimeout(() => {
                btn.innerHTML = '⬇️ Prepare & Print PDF';
            }, 3000);

            alert(`Scribd Downloader Error: ${err.message}. Try manually scrolling to the end and running the script again.`);
        }
    }


    // ==================== INITIALIZATION ====================

    function init() {
        if (!window.location.hostname.includes('scribd.com')) return;

        if (isEmbed()) {
            showEmbedButton();
        } else if (getDocId()) {
            handleDocumentPageRedirect();
            setTimeout(showMainButton, BUTTON_DELAY);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();