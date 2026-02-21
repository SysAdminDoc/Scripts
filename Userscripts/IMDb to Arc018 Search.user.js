// ==UserScript==
// @name         IMDb to Arc018 Search
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  Adds a floating button to IMDb title pages to quickly search for the movie or show on arc018.to
// @author       Gemini
// @match        https://www.imdb.com/title/tt*/*
// @grant        none
// @homepage     https://github.com/
// ==/UserScript==

(function() {
    'use strict';

    /**
     * Creates and styles the search button next to the title.
     * @param {string} url - The URL the button will navigate to when clicked.
     * @param {HTMLElement} parentElement - The element to append the button to.
     */
    function createSearchButton(url, parentElement) {
        // Create the button element
        const searchButton = document.createElement('button');
        searchButton.innerText = 'Search on Arc018';

        // Apply styles to place it next to the title
        Object.assign(searchButton.style, {
            backgroundColor: '#f5c518', // IMDb's brand yellow
            color: '#000000',
            border: 'none',
            borderRadius: '8px',
            padding: '8px 16px',
            fontSize: '14px',
            fontWeight: 'bold',
            cursor: 'pointer',
            marginLeft: '16px',
            transition: 'transform 0.2s ease-in-out, background-color 0.2s',
            flexShrink: '0', // Prevents shrinking in flex container
        });

        // Add hover effects for better user experience
        searchButton.onmouseover = () => {
            searchButton.style.transform = 'scale(1.05)';
            searchButton.style.backgroundColor = '#E7B500';
        };
        searchButton.onmouseout = () => {
            searchButton.style.transform = 'scale(1)';
            searchButton.style.backgroundColor = '#f5c518';
        };

        // Add the click event listener to open the search URL in a new tab
        searchButton.addEventListener('click', () => {
            window.open(url, '_blank');
        });

        // Append the button to the provided parent element
        parentElement.appendChild(searchButton);
    }

    /**
     * Main function to find the title and initialize the button.
     */
    function init() {
        // Find the title element to get the text
        const titleElement = document.querySelector('span[data-testid="hero__primary-text"]');
        // Find the H1 container for the title, which we'll use to find the parent
        const titleContainer = document.querySelector('[data-testid="hero__pageTitle"]');

        if (!titleElement || !titleContainer || !titleContainer.parentElement) {
            console.log('IMDb to Arc018: Could not find the title element or its container on this page.');
            return;
        }

        const buttonContainer = titleContainer.parentElement;
        const title = titleElement.innerText;

        // Format the title for the URL:
        // 1. Convert to lowercase.
        // 2. Replace all non-alphanumeric characters (except spaces) with an empty string.
        // 3. Replace one or more spaces with a single hyphen.
        const formattedTitle = title
            .toLowerCase()
            .replace(/[^a-z0-9\s]/g, '')
            .replace(/\s+/g, '-');

        // Construct the final search URL
        const searchUrl = `https://arc018.to/search/${formattedTitle}`;

        // Create the button and append it to the title's container
        createSearchButton(searchUrl, buttonContainer);
    }

    // Since IMDb pages can load content dynamically, we'll wait for the window
    // to be fully loaded to ensure the title element is available.
    if (document.readyState === 'complete') {
        init();
    } else {
        window.addEventListener('load', init);
    }
})();

