// ==UserScript==
// @name         Chrome Web Store Dark Mode
// @namespace    https://chromewebstore.google.com/
// @version      1.0
// @description  Dark theme for Chrome Web Store
// @author       Matt
// @match        *chromewebstore.google.com/*
// @grant        GM_addStyle
// @run-at       document-start
// ==/UserScript==

GM_addStyle(`
    /* Base dark theme */
    :root {
        --cws-bg-primary: #020617 !important;
        --cws-bg-secondary: #0f172a !important;
        --cws-bg-tertiary: #1e293b !important;
        --cws-text-primary: #f1f5f9 !important;
        --cws-text-secondary: #94a3b8 !important;
        --cws-accent: #22c55e !important;
        --cws-border: #334155 !important;
    }

    /* Global overrides */
    html, body {
        background-color: var(--cws-bg-primary) !important;
        color: var(--cws-text-primary) !important;
    }

    /* Main containers */
    .RdFlTe, .g9KhVe, .HbUFEc, .wCshce,
    [role="main"], [role="navigation"],
    header, nav, main, section, article, aside, footer {
        background-color: var(--cws-bg-primary) !important;
    }

    /* Cards and tiles */
    .Cb7Kte, .VfPpkd-WsjYwc, .a-na-d-K-ea,
    [class*="card"], [class*="Card"], [class*="tile"], [class*="Tile"] {
        background-color: var(--cws-bg-secondary) !important;
        border-color: var(--cws-border) !important;
    }

    /* Text elements */
    h1, h2, h3, h4, h5, h6, p, span, div, a, label, li {
        color: var(--cws-text-primary) !important;
    }

    /* Secondary text */
    .e-f-yb, .eFSVhf, .rsw-stars + span, .Y30Tfd,
    [class*="subtitle"], [class*="description"], [class*="meta"] {
        color: var(--cws-text-secondary) !important;
    }

    /* Links and accent elements */
    a:hover, .VfPpkd-vQzf8d, .UywwFc-vQzf8d {
        color: var(--cws-accent) !important;
    }

    /* Buttons */
    .VfPpkd-LgbsSe {
        background-color: var(--cws-bg-tertiary) !important;
        color: var(--cws-text-primary) !important;
        border-color: var(--cws-border) !important;
    }

    /* Primary/Install button */
    .VfPpkd-LgbsSe-OWXEXe-k8QpJ,
    [class*="primary"], [aria-label*="Add to Chrome"] {
        background-color: var(--cws-accent) !important;
        color: #020617 !important;
    }

    /* Input fields */
    input, textarea, select,
    .VfPpkd-fmcmS-wGMbrd, .VfPpkd-TkwUic {
        background-color: var(--cws-bg-secondary) !important;
        color: var(--cws-text-primary) !important;
        border-color: var(--cws-border) !important;
    }

    /* Search bar */
    .VfPpkd-WsjYwc-OWXEXe-INsAgc, .cws-search-box,
    [role="search"], [role="searchbox"] {
        background-color: var(--cws-bg-secondary) !important;
    }

    /* Dialogs and modals */
    .VfPpkd-cnG4Wd, [role="dialog"], [role="alertdialog"] {
        background-color: var(--cws-bg-secondary) !important;
        border-color: var(--cws-border) !important;
    }

    /* Dropdown menus */
    .VfPpkd-xl07Ob, [role="menu"], [role="listbox"] {
        background-color: var(--cws-bg-secondary) !important;
    }

    /* Dividers and borders */
    hr, .VfPpkd-kBDsod {
        border-color: var(--cws-border) !important;
        background-color: var(--cws-border) !important;
    }

    /* Hover states */
    .VfPpkd-LgbsSe:hover, [class*="card"]:hover, [class*="tile"]:hover {
        background-color: var(--cws-bg-tertiary) !important;
    }

    /* Rating stars - keep visible */
    .rsw-stars, [class*="rating"], [class*="star"] {
        filter: none !important;
    }

    /* Images - don't invert */
    img, svg, [class*="icon"], [class*="Icon"] {
        filter: none !important;
    }

    /* Scrollbar */
    ::-webkit-scrollbar {
        width: 10px;
        height: 10px;
    }
    ::-webkit-scrollbar-track {
        background: var(--cws-bg-primary);
    }
    ::-webkit-scrollbar-thumb {
        background: var(--cws-border);
        border-radius: 5px;
    }
    ::-webkit-scrollbar-thumb:hover {
        background: var(--cws-accent);
    }

    /* Force dark on any remaining light backgrounds */
    [style*="background-color: rgb(255"], [style*="background-color: white"],
    [style*="background: rgb(255"], [style*="background: white"],
    [style*="background-color:#fff"], [style*="background-color: #fff"] {
        background-color: var(--cws-bg-primary) !important;
    }
`);