// ==UserScript==
// @name         Videos.com: Watch Inline Highest Quality + Auto Pager
// @namespace    steve.videos.watch.inline.autopager
// @version      2.0.0
// @description  On watch pages: auto-embed highest quality video and hide the rest of the page. On non-watch pages: auto-click "Show more" when scrolling near bottom.
// @match        https://noodlemagazine.com/*
// @run-at       document-idle
// @grant        GM_addStyle
// ==/UserScript==


(function () {
  "use strict";

  // ---------------------------
  // Shared utils
  // ---------------------------
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const isWatchPage = /^\/watch\//.test(location.pathname);

  function addStyle(css) {
    if (typeof GM_addStyle === "function") {
      GM_addStyle(css);
    } else {
      const s = document.createElement("style");
      s.textContent = css;
      document.head.appendChild(s);
    }
  }

  function wait(ms) {
    return new Promise((res) => setTimeout(res, ms));
  }

  // ---------------------------
  // WATCH PAGE: inline highest quality, hide rest, no extra buttons
  // ---------------------------
  if (isWatchPage) {
    // Qualities to try, highest first
    const QUALITIES = [1080, 720, 480, 360, 240];

    // Pattern A: .../videos/.../vid_720p.mp4 or vid_720.mp4
    const CDN_REGEX_VID = /^https?:\/\/[^/]+\/videos\/[^?#]*\/vid_(\d+)(p)?\.mp4(\?[^\s"']*)?$/i;

    // Pattern B: .../videos/720/-196881923_456242868.mp4
    const CDN_REGEX_DIR = /^https?:\/\/[^/]+\/videos\/(\d+)\/[^?#]+\.mp4(\?[^\s"']*)?$/i;

    // Styles: full-viewport, hide rest of page
    addStyle(`
      html, body {
        margin: 0 !important;
        padding: 0 !important;
        height: 100% !important;
        background: #000 !important;
        overflow: hidden !important;
      }
      body > *:not(#userscript-player-container) {
        display: none !important;
      }
      #userscript-player-container {
        position: fixed !important;
        inset: 0 !important;
        background: #000 !important;
        z-index: 2147483647 !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
      }
      #userscript-player {
        width: 100% !important;
        height: 100% !important;
        object-fit: contain !important;
        background: #000 !important;
        outline: none !important;
      }
    `);

    // Utilities specific to watch page
    function toAbsoluteUrl(url) {
      try {
        return new URL(url, location.href).href;
      } catch {
        return url;
      }
    }

    function parseQualityFromUrl(url) {
      let m = url.match(/\/vid_(\d+)(p)?\.mp4/i);
      if (m) return parseInt(m[1], 10);
      m = url.match(/\/videos\/(\d+)\//i);
      if (m) return parseInt(m[1], 10);
      return null;
    }

    // Build a new URL at the requested quality, preserving original style:
    // - If original was vid_###p.mp4 or vid_###.mp4, keep with/without "p"
    // - If original was /videos/###/filename.mp4, replace that ### segment
    function makeUrlWithQuality(original, quality) {
      if (CDN_REGEX_VID.test(original)) {
        return original.replace(/vid_(\d+)(p)?\.mp4/i, (m, num, hasP) =>
          hasP ? `vid_${quality}p.mp4` : `vid_${quality}.mp4`
        );
      }
      if (CDN_REGEX_DIR.test(original)) {
        return original.replace(/(\/videos\/)(\d+)(\/[^?#]+\.mp4)/i, (m, pre, q, post) =>
          `${pre}${quality}${post}`
        );
      }
      return null;
    }

    function findCdnUrls() {
      const urls = new Set();

      // 1) Anchors
      $$('a[href*="/videos/"]').forEach((a) => {
        const href = a.getAttribute("href");
        if (!href) return;
        const abs = toAbsoluteUrl(href);
        if (CDN_REGEX_VID.test(abs) || CDN_REGEX_DIR.test(abs)) urls.add(abs);
      });

      // 2) Text nodes / inline JSON
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
      let node;
      while ((node = walker.nextNode())) {
        const text = node.nodeValue;
        if (!text) continue;
        // Broad capture of any .mp4 under /videos/, then filter
        const matches = text.match(/https?:\/\/[^\s"'<>]+\/videos\/[^\s"'<>]+\.mp4[^\s"'<>]*/gi);
        if (matches) {
          for (const u of matches) {
            if (CDN_REGEX_VID.test(u) || CDN_REGEX_DIR.test(u)) {
              urls.add(u);
            }
          }
        }
      }

      return Array.from(urls);
    }

    function probeVideoUrl(url, timeoutMs = 8000) {
      return new Promise((resolve, reject) => {
        const v = document.createElement("video");
        v.preload = "metadata";
        v.muted = true;

        let finished = false;
        const cleanup = () => {
          v.removeAttribute("src");
          v.load();
        };

        const timer = setTimeout(() => {
          if (finished) return;
          finished = true;
          cleanup();
          reject(new Error("Timeout " + url));
        }, timeoutMs);

        const ok = () => {
          if (finished) return;
          finished = true;
          clearTimeout(timer);
          cleanup();
          resolve(url);
        };

        v.addEventListener("loadedmetadata", ok, { once: true });
        v.addEventListener("canplay", ok, { once: true });
        v.addEventListener("error", () => {
          if (finished) return;
          finished = true;
          clearTimeout(timer);
          cleanup();
          reject(new Error("Error " + url));
        }, { once: true });

        v.src = url;
        v.load();
      });
    }

    async function pickBestQuality(baseUrl) {
      for (const q of QUALITIES) {
        const candidate = makeUrlWithQuality(baseUrl, q);
        if (!candidate) continue;
        try {
          const ok = await probeVideoUrl(candidate);
          return { url: ok, quality: q };
        } catch {}
      }
      // Fallback to base
      try {
        const ok = await probeVideoUrl(baseUrl);
        return { url: ok, quality: parseQualityFromUrl(baseUrl) || "unknown" };
      } catch {
        return null;
      }
    }

    function ensurePlayerContainer() {
      let container = $("#userscript-player-container");
      if (!container) {
        container = document.createElement("div");
        container.id = "userscript-player-container";
        const video = document.createElement("video");
        video.id = "userscript-player";
        video.controls = true;
        video.autoplay = true;
        video.playsInline = true;
        container.appendChild(video);
        document.body.appendChild(container);
      }
      return container;
    }

    function setPlayerSource(url) {
      ensurePlayerContainer();
      const video = $("#userscript-player");
      if (!video) return;
      video.src = url;
      video.play().catch(() => {});
    }

    async function autoEmbedFirstFound() {
      const urls = findCdnUrls();
      if (urls.length === 0) return;
      const base = urls[0];
      const best = await pickBestQuality(base);
      if (best) setPlayerSource(best.url);
      else setPlayerSource(base);
    }

    // Intercept direct CDN .mp4 link clicks to play inline
    document.addEventListener(
      "click",
      async (evt) => {
        const a = evt.target && evt.target.closest ? evt.target.closest("a[href]") : null;
        if (!a) return;
        const href = a.getAttribute("href");
        if (!href) return;
        const abs = toAbsoluteUrl(href);
        if (!CDN_REGEX_VID.test(abs) && !CDN_REGEX_DIR.test(abs)) return;

        evt.preventDefault();
        evt.stopPropagation();

        ensurePlayerContainer();
        const best = await pickBestQuality(abs);
        if (best) setPlayerSource(best.url);
        else setPlayerSource(abs);
      },
      true
    );

    // Boot on watch page
    ensurePlayerContainer();
    autoEmbedFirstFound();

    return; // Stop here for watch pages
  }

  // ---------------------------
  // NON-WATCH PAGES: auto pager on scroll
  // ---------------------------

  let isLoading = false;

  function getMoreButton() {
    const btns = $$(".more");
    if (btns.length === 0) return null;
    // Use the last one if multiple are present
    return btns[btns.length - 1];
  }

  async function clickMoreOnce() {
    const btn = getMoreButton();
    if (!btn) return false;

    const loading = btn.getAttribute("data-loading");
    if (loading === "1") {
      // Still loading, skip for now
      return false;
    }

    const listEl = $("#list_videos");
    const beforeCount = listEl ? $$(".item", listEl).length : 0;
    const beforePage = btn.getAttribute("data-page");

    // Trigger click
    btn.click();

    // Wait for either page increment or more items
    const ok = await waitForAdvance(beforePage, beforeCount, 15000);
    return ok;
  }

  async function waitForAdvance(beforePage, beforeCount, timeoutMs) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const currBtn = getMoreButton();
      const listEl = $("#list_videos");

      const nowCount = listEl ? $$(".item", listEl).length : 0;
      const dp = currBtn ? currBtn.getAttribute("data-page") : null;
      const dl = currBtn ? currBtn.getAttribute("data-loading") : null;

      // Conditions indicating success:
      // 1) item count increased, or
      // 2) data-page increased
      if ((nowCount > beforeCount) || (dp && dp !== beforePage)) {
        // Ensure not in loading state
        if (dl !== "1") return true;
      }
      await wait(250);
    }
    return false;
  }

  function nearBottom(offsetPx = 1200) {
    const scrollY = window.scrollY || window.pageYOffset;
    const viewport = window.innerHeight || document.documentElement.clientHeight;
    const full = Math.max(
      document.body.scrollHeight,
      document.documentElement.scrollHeight
    );
    return scrollY + viewport + offsetPx >= full;
  }

  async function onScroll() {
    if (isLoading) return;
    const btn = getMoreButton();
    if (!btn) return;
    if (!nearBottom()) return;

    // Avoid spamming; load one page at a time
    isLoading = true;
    try {
      await clickMoreOnce();
    } finally {
      isLoading = false;
    }
  }

  // Attach listener
  window.addEventListener(
    "scroll",
    () => {
      onScroll();
    },
    { passive: true }
  );

  // Also attempt a load if we start already near bottom
  onScroll();

})();