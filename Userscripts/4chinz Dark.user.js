// ==UserScript==
// @name         4chinz Dark
// @namespace    http://tampermonkey.net/
// @version      2025-09-30
// @description  try to take over the world!
// @author       You
// @match        https://boards.4chan.org/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=4chan.org
// @grant        none
// ==/UserScript==

const darkModePreference = window.matchMedia("(prefers-color-scheme: dark)");

const handleDarkModeChange = (event) => {
 console.log('handleDarkModeChange')
 if (document.querySelector('#styleSelector')) {
 const origTheme = document.querySelector('#styleSelector').value
 const initialTheme = (origTheme != "Tomorrow" && origTheme.indexOf('Yotsuba') < 0) ? document.querySelector('#styleSelector').value : "Yotsuba B New"
 const theme = (event.matches) ? "Tomorrow" : initialTheme;
 document.querySelector('#styleSelector').value=theme;
 console.log('theme: ', theme)
 document.querySelector('#styleSelector').dispatchEvent(new Event("change", { bubbles: true }));
 }
};

// Listen for changes
darkModePreference.addEventListener("change", handleDarkModeChange);

// Initial check
handleDarkModeChange(darkModePreference);