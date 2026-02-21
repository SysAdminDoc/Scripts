// ==UserScript==
// @name         Redirect userscript.zone → GreasyFork (any URL)
// @namespace    https://mattparker.tools/
// @version      1.1
// @description  Instantly redirect any userscript.zone page to GreasyFork, preserving ?q= search when present
// @author       Matt
// @match        *://userscript.zone/*
// @match        *://www.userscript.zone/*
// @run-at       document-start
// @grant        none
// @noframes
// ==/UserScript==

(function () {
  'use strict';

  // If a search query exists, send to GreasyFork search, otherwise send to the GreasyFork homepage
  try {
    const url = new URL(location.href);
    const q = url.searchParams.get('q');

    const target = q && q.trim().length
      ? `https://greasyfork.org/en/scripts?sort=updated&q=${encodeURIComponent(q)}`
      : `https://greasyfork.org/en`;

    // Use replace to avoid polluting history
    location.replace(target);
  } catch (e) {
    // Fallback: if URL parsing somehow fails, just go to GreasyFork home
    location.replace('https://greasyfork.org/en');
  }
})();
