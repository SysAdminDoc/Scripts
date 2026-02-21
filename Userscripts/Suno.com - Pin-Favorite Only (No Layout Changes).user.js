// ==UserScript==
// @name         Suno.com - Pin/Favorite Only (No Layout Changes)
// @namespace    http://tampermonkey.net/
// @version      8.0
// @description  Adds a pinning/favorites system to Suno.com without altering the native layout or styling of the page.
// @author       You
// @match        https://suno.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=suno.com
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // --- Configuration ---
    const STORAGE_KEY = 'suno_favorites_list';

    // Selectors
    const ROW_SELECTOR = '[data-testid="clip-row"]';
    const LIST_CONTAINER_SELECTOR = '[role="rowgroup"]';

    // --- 1. Inject Custom CSS (Functional Only) ---
    const style = document.createElement('style');
    style.innerHTML = `
        /* --- 1. Sorting Mechanics --- */
        /* Force the list container to use Flexbox Column so 'order' works */
        ${LIST_CONTAINER_SELECTOR} {
            display: flex !important;
            flex-direction: column !important;
        }

        /* Default order for all unpinned items */
        ${LIST_CONTAINER_SELECTOR} > div {
            order: 1;
        }

        /* --- 2. Positioning Context --- */
        /* Ensure the album art container allows absolute positioning of the star */
        ${ROW_SELECTOR} .clip-image-container {
            position: relative !important;
        }

        /* --- 3. Star Button Styling --- */
        .suno-fav-star {
            position: absolute;
            top: 4px;
            left: 4px;
            width: 24px;
            height: 24px;
            background: rgba(0, 0, 0, 0.6);
            border-radius: 50%;
            color: #aaa;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 16px;
            cursor: pointer;
            z-index: 50; /* Ensure it sits above the image/play overlay */
            border: 1px solid rgba(255,255,255,0.3);
            transition: transform 0.2s, color 0.2s, background 0.2s;
            backdrop-filter: blur(2px);
        }

        .suno-fav-star:hover {
            transform: scale(1.1);
            color: #fff;
            background: rgba(0, 0, 0, 0.8);
            border-color: #fff;
        }

        .suno-fav-star.is-active {
            color: #FFD700; /* Gold */
            border-color: #FFD700;
            background: rgba(0, 0, 0, 0.9);
            text-shadow: 0 0 5px rgba(255, 215, 0, 0.5);
        }
    `;
    document.head.appendChild(style);

    // --- 2. Helper Functions ---

    function getFavorites() {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        } catch (e) {
            return [];
        }
    }

    function saveFavorites(favs) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(favs));
    }

    function getRowId(row) {
        // Try to get ID from the song link
        const link = row.querySelector('a[href*="/song/"]');
        if (link) {
            return link.href.split('/').pop();
        }
        // Fallback: Hash the text content if link not found
        return row.innerText.substring(0, 20).replace(/\W/g, '');
    }

    // Find the wrapper element that is the direct child of the rowgroup
    // This is the element we must apply the CSS 'order' property to.
    function getSortableParent(row) {
        const rowGroup = row.closest(LIST_CONTAINER_SELECTOR);
        if (!rowGroup) return null;

        let current = row;
        while (current && current.parentElement !== rowGroup) {
            current = current.parentElement;
        }
        return current;
    }

    // --- 3. Interaction Logic ---

    function toggleFavorite(e) {
        e.stopPropagation(); // Stop Suno from playing the song when clicking star
        e.preventDefault();

        const btn = e.currentTarget;
        const row = btn.closest(ROW_SELECTOR);
        const id = getRowId(row);
        let favs = getFavorites();

        if (favs.includes(id)) {
            // Un-Favorite
            favs = favs.filter(f => f !== id);
            btn.classList.remove('is-active');
            btn.innerHTML = '&#9734;'; // Empty Star

            const sortWrapper = getSortableParent(row);
            if(sortWrapper) sortWrapper.style.order = '1'; // Return to normal order

        } else {
            // Favorite
            favs.push(id);
            btn.classList.add('is-active');
            btn.innerHTML = '&#9733;'; // Filled Star

            const sortWrapper = getSortableParent(row);
            if(sortWrapper) sortWrapper.style.order = '-1'; // Move to top
        }

        saveFavorites(favs);
    }

    // --- 4. Main Processing ---

    function processRow(row) {
        // Prevent duplicate buttons
        if (row.dataset.sunoPinTool) return;
        row.dataset.sunoPinTool = "true";

        const id = getRowId(row);
        const favs = getFavorites();
        const isFav = favs.includes(id);

        // Find the album art container to place the star
        const imgContainer = row.querySelector('.clip-image-container');

        // Safety check: if view changes and image container is gone, we skip or fallback
        if (imgContainer) {
            // Create Star Button
            const btn = document.createElement('div');
            btn.className = `suno-fav-star ${isFav ? 'is-active' : ''}`;
            btn.innerHTML = isFav ? '&#9733;' : '&#9734;';
            btn.title = "Pin to Top";
            btn.addEventListener('click', toggleFavorite);

            // Inject Star
            imgContainer.appendChild(btn);
        }

        // Apply Sorting immediately if it was already favorited
        const sortWrapper = getSortableParent(row);
        if (sortWrapper && isFav) {
            sortWrapper.style.order = '-1';
        }
    }

    // --- 5. Observer ---
    // Watches for Suno loading new rows as you scroll
    const observer = new MutationObserver((mutations) => {
        const rows = document.querySelectorAll(ROW_SELECTOR);
        rows.forEach(processRow);
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    // Initial Run on page load
    setTimeout(() => {
        document.querySelectorAll(ROW_SELECTOR).forEach(processRow);
    }, 1000);

})();