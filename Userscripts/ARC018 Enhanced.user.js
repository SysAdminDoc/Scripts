// ==UserScript==
// @name         ARC018 Enhanced
// @namespace    https://github.com/SysAdminDoc
// @version      1.1.0
// @description  Enhances ARC018 with full-viewport watch page, cleaner UI, and improved browsing flow
// @author       SysAdminDoc
// @match        https://arc018.to/*
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';

    // ==================== CONFIGURATION ====================
    const CONFIG = {
        ACCENT_COLOR: '#e50914',
        ACCENT_HOVER: '#ff1a25',
        BG_PRIMARY: '#0a0a0f',
        BG_SECONDARY: '#12121a',
        BG_CARD: '#16161f',
        BG_CARD_HOVER: '#1e1e2a',
        TEXT_PRIMARY: '#e8e8ec',
        TEXT_SECONDARY: '#8888a0',
        BORDER_COLOR: '#1e1e2e',
        HEADER_BG: 'rgba(10, 10, 15, 0.92)',
        TRANSITION_FAST: '0.2s ease',
        TRANSITION_NORMAL: '0.3s ease',
        BORDER_RADIUS: '8px',
    };

    // ==================== PAGE DETECTION ====================
    function isWatchPage() {
        return /\/(watch-movie|watch-tv|watch-)/.test(window.location.pathname);
    }

    function isListingPage() {
        const p = window.location.pathname;
        return p === '/movie' || p === '/tv-show' || p.startsWith('/movie?') || p.startsWith('/tv-show?')
            || p.startsWith('/genre/') || p.startsWith('/country/') || p.startsWith('/search/')
            || p === '/' || p === '/home';
    }

    // ==================== GLOBAL STYLES ====================
    GM_addStyle(`
        /* ===== GLOBAL OVERRIDES ===== */
        body {
            background: ${CONFIG.BG_PRIMARY} !important;
            color: ${CONFIG.TEXT_PRIMARY} !important;
            scrollbar-width: thin !important;
            scrollbar-color: #2a2a3a ${CONFIG.BG_PRIMARY} !important;
        }
        body::-webkit-scrollbar { width: 8px; }
        body::-webkit-scrollbar-track { background: ${CONFIG.BG_PRIMARY}; }
        body::-webkit-scrollbar-thumb { background: #2a2a3a; border-radius: 4px; }
        body::-webkit-scrollbar-thumb:hover { background: #3a3a4a; }

        /* ===== HEADER ===== */
        #header {
            background: ${CONFIG.HEADER_BG} !important;
            backdrop-filter: blur(20px) saturate(180%) !important;
            -webkit-backdrop-filter: blur(20px) saturate(180%) !important;
            border-bottom: 1px solid ${CONFIG.BORDER_COLOR} !important;
            transition: transform ${CONFIG.TRANSITION_NORMAL}, opacity ${CONFIG.TRANSITION_NORMAL} !important;
            z-index: 9999 !important;
        }
        #header .container { max-width: 1400px !important; }

        /* Header auto-hide on watch pages */
        body.arc-watch-page #header {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            right: 0 !important;
            z-index: 99999 !important;
            transform: translateY(-100%) !important;
            opacity: 0 !important;
        }
        body.arc-watch-page #header:hover,
        body.arc-watch-page.arc-header-visible #header {
            transform: translateY(0) !important;
            opacity: 1 !important;
        }
        /* Thin hover trigger zone at top */
        body.arc-watch-page::before {
            content: '';
            position: fixed;
            top: 0; left: 0; right: 0;
            height: 8px;
            z-index: 99998;
        }
        body.arc-watch-page:hover::before { height: 50px; }
        body.arc-watch-page #header:hover {
            transform: translateY(0) !important;
            opacity: 1 !important;
        }

        /* ===== SEARCH BAR ===== */
        #search .search-content input.search-input {
            background: ${CONFIG.BG_SECONDARY} !important;
            border: 1px solid ${CONFIG.BORDER_COLOR} !important;
            border-radius: 20px !important;
            color: ${CONFIG.TEXT_PRIMARY} !important;
            transition: border-color ${CONFIG.TRANSITION_FAST} !important;
        }
        #search .search-content input.search-input:focus {
            border-color: ${CONFIG.ACCENT_COLOR} !important;
            box-shadow: 0 0 0 2px rgba(229, 9, 20, 0.15) !important;
        }

        /* ================================================================
           WATCH PAGE - FULL VIEWPORT PLAYER
           ================================================================ */
        body.arc-watch-page .watching_player {
            position: relative !important;
            width: 100% !important;
            min-height: 100vh !important;
            display: flex !important;
            flex-direction: column !important;
            background: #000 !important;
            padding: 0 !important;
            margin: 0 !important;
        }
        body.arc-watch-page .watching_player .watching_player-area {
            width: 100% !important;
            max-width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
            flex: 1 1 auto !important;
            display: flex !important;
            flex-direction: column !important;
            min-height: 0 !important;
        }

        /* Iframe container - fill remaining space */
        body.arc-watch-page #watch-iframe {
            position: relative !important;
            width: 100% !important;
            height: calc(100vh - 50px) !important;
            padding-bottom: 0 !important;
            flex: 1 1 auto !important;
        }
        body.arc-watch-page #watch-iframe iframe#iframe-embed {
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            height: 100% !important;
        }
        body.arc-watch-page #watch-player,
        body.arc-watch-page #mask-player {
            padding-bottom: 0 !important;
            height: calc(100vh - 50px) !important;
        }

        /* Player controls bar */
        body.arc-watch-page .watching_player-control {
            background: ${CONFIG.BG_SECONDARY} !important;
            padding: 0 20px !important;
            display: flex !important;
            align-items: center !important;
            gap: 8px !important;
            border-top: 1px solid ${CONFIG.BORDER_COLOR} !important;
            height: 50px !important;
            flex: 0 0 50px !important;
        }
        body.arc-watch-page .watching_player-control .clearfix { display: none !important; }
        body.arc-watch-page .watching_player-control .btn {
            background: ${CONFIG.BG_CARD} !important;
            border: 1px solid ${CONFIG.BORDER_COLOR} !important;
            color: ${CONFIG.TEXT_PRIMARY} !important;
            border-radius: 6px !important;
            transition: all ${CONFIG.TRANSITION_FAST} !important;
            font-size: 13px !important;
            margin: 0 !important;
            float: none !important;
            white-space: nowrap !important;
        }
        body.arc-watch-page .watching_player-control .btn:hover {
            background: ${CONFIG.BG_CARD_HOVER} !important;
            border-color: ${CONFIG.ACCENT_COLOR} !important;
            color: ${CONFIG.ACCENT_COLOR} !important;
        }

        /* Alert banner above player */
        body.arc-watch-page .watching_player .alert-dg {
            background: rgba(229, 9, 20, 0.08) !important;
            border: 1px solid rgba(229, 9, 20, 0.2) !important;
            color: ${CONFIG.TEXT_SECONDARY} !important;
            text-align: center !important;
            padding: 8px 16px !important;
            font-size: 12px !important;
            margin: 0 !important;
            border-radius: 0 !important;
            flex: 0 0 auto !important;
        }

        /* Scroll-down indicator */
        body.arc-watch-page .arc-scroll-hint {
            position: fixed;
            bottom: 24px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 9999;
            color: rgba(255,255,255,0.4);
            font-size: 12px;
            letter-spacing: 1px;
            text-transform: uppercase;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 6px;
            pointer-events: none;
            transition: opacity 0.5s ease;
            animation: arc-bounce 2s ease infinite;
        }
        body.arc-watch-page .arc-scroll-hint.hidden { opacity: 0; }
        body.arc-watch-page .arc-scroll-hint svg { width: 20px; height: 20px; }
        @keyframes arc-bounce {
            0%, 20%, 50%, 80%, 100% { transform: translateX(-50%) translateY(0); }
            40% { transform: translateX(-50%) translateY(-8px); }
            60% { transform: translateX(-50%) translateY(-4px); }
        }

        /* ================================================================
           WATCH PAGE - DETAIL SECTION (below fold)
           ================================================================ */
        body.arc-watch-page .detail_page.watch_page {
            background: ${CONFIG.BG_PRIMARY} !important;
            padding-top: 30px !important;
        }
        .detail_page .container { max-width: 1200px !important; }

        /* --- Server Selector ---
           Fix: The site uses Bootstrap .nav (float-based) with .nav-item children.
           Override to proper flexbox with explicit gap instead of margin. */
        .detail_page-servers {
            background: ${CONFIG.BG_SECONDARY} !important;
            border-radius: ${CONFIG.BORDER_RADIUS} !important;
            padding: 16px 20px !important;
            margin-bottom: 20px !important;
            border: 1px solid ${CONFIG.BORDER_COLOR} !important;
        }
        .detail_page-servers .server-notice {
            color: ${CONFIG.TEXT_SECONDARY} !important;
            font-size: 13px !important;
            margin-bottom: 12px !important;
        }
        .detail_page-servers .dp-s-line { margin-bottom: 8px !important; }
        .detail_page-servers ul.nav {
            display: flex !important;
            flex-wrap: wrap !important;
            gap: 8px !important;
            list-style: none !important;
            padding: 0 !important;
            margin: 0 !important;
        }
        .detail_page-servers ul.nav > .nav-item {
            float: none !important;
            position: relative !important;
            margin: 0 !important;
            padding: 0 !important;
            flex: 0 0 auto !important;
        }
        .detail_page-servers ul.nav > .nav-item > .link-item {
            display: inline-flex !important;
            align-items: center !important;
            gap: 6px !important;
            background: ${CONFIG.BG_CARD} !important;
            border: 1px solid ${CONFIG.BORDER_COLOR} !important;
            color: ${CONFIG.TEXT_PRIMARY} !important;
            border-radius: 6px !important;
            padding: 8px 16px !important;
            margin: 0 !important;
            transition: all ${CONFIG.TRANSITION_FAST} !important;
            white-space: nowrap !important;
            font-size: 13px !important;
            line-height: 1.4 !important;
        }
        .detail_page-servers ul.nav > .nav-item > .link-item i {
            margin: 0 !important;
            padding: 0 !important;
            font-size: 12px !important;
        }
        .detail_page-servers ul.nav > .nav-item > .link-item span {
            margin: 0 !important;
            padding: 0 !important;
        }
        .detail_page-servers ul.nav > .nav-item > .link-item:hover {
            background: ${CONFIG.BG_CARD_HOVER} !important;
            border-color: ${CONFIG.ACCENT_COLOR} !important;
            color: ${CONFIG.ACCENT_COLOR} !important;
        }
        .detail_page-servers ul.nav > .nav-item > .link-item.active {
            background: ${CONFIG.ACCENT_COLOR} !important;
            border-color: ${CONFIG.ACCENT_COLOR} !important;
            color: #fff !important;
        }

        /* --- Movie Info Section --- */
        .detail_page-infor {
            background: ${CONFIG.BG_SECONDARY} !important;
            border-radius: ${CONFIG.BORDER_RADIUS} !important;
            padding: 24px !important;
            border: 1px solid ${CONFIG.BORDER_COLOR} !important;
        }
        .dp-i-content { display: flex !important; gap: 24px !important; }
        .dp-i-c-poster .film-poster {
            padding-bottom: 0 !important;
            position: relative !important;
            overflow: visible !important;
        }
        .dp-i-c-poster .film-poster .film-poster-img {
            position: relative !important;
            width: 100% !important;
            min-height: auto !important;
            border-radius: ${CONFIG.BORDER_RADIUS} !important;
            box-shadow: 0 4px 20px rgba(0,0,0,0.5) !important;
        }
        .dp-i-c-right .heading-name a {
            color: ${CONFIG.TEXT_PRIMARY} !important;
            font-weight: 700 !important;
            font-size: 1.6rem !important;
        }
        .dp-i-c-right .description {
            color: ${CONFIG.TEXT_SECONDARY} !important;
            line-height: 1.7 !important;
            margin: 12px 0 !important;
        }
        .dp-i-stats {
            display: flex !important;
            flex-wrap: wrap !important;
            align-items: center !important;
            gap: 8px !important;
            margin-bottom: 12px !important;
        }
        .dp-i-stats .item { margin: 0 !important; }
        .dp-i-stats .btn-trailer {
            background: ${CONFIG.ACCENT_COLOR} !important;
            border-color: ${CONFIG.ACCENT_COLOR} !important;
            color: #fff !important;
        }
        .dp-i-stats .btn-quality {
            background: rgba(229, 9, 20, 0.15) !important;
            border-color: ${CONFIG.ACCENT_COLOR} !important;
            color: ${CONFIG.ACCENT_COLOR} !important;
        }
        .dp-i-stats .btn-imdb {
            background: #f5c518 !important;
            border-color: #f5c518 !important;
            color: #000 !important;
            font-weight: 700 !important;
        }
        .elements .row-line {
            color: ${CONFIG.TEXT_SECONDARY} !important;
            padding: 4px 0 !important;
            font-size: 14px !important;
        }
        .elements .row-line strong { color: ${CONFIG.TEXT_PRIMARY} !important; }
        .elements .row-line a {
            color: ${CONFIG.ACCENT_COLOR} !important;
            transition: color ${CONFIG.TRANSITION_FAST} !important;
        }
        .elements .row-line a:hover { color: ${CONFIG.ACCENT_HOVER} !important; }

        /* --- Rating Block --- */
        .block-rating { margin-top: 12px !important; }
        .block-rating .rr-mark { color: ${CONFIG.TEXT_SECONDARY} !important; }
        .block-rating .rr-mark span { color: ${CONFIG.ACCENT_COLOR} !important; font-weight: 700 !important; }
        .block-rating .progress {
            background: ${CONFIG.BG_PRIMARY} !important;
            border-radius: 4px !important;
            overflow: hidden !important;
        }
        .block-rating .btn-focus {
            background: rgba(40, 167, 69, 0.15) !important;
            border: 1px solid #28a745 !important;
            color: #28a745 !important;
        }
        .block-rating .btn-focus:hover { background: rgba(40, 167, 69, 0.3) !important; }

        /* ================================================================
           LISTING PAGES - MOVIE/TV GRID
           ================================================================ */

        /* Convert float grid to CSS Grid */
        .film_list .film_list-wrap {
            display: grid !important;
            grid-template-columns: repeat(auto-fill, minmax(165px, 1fr)) !important;
            gap: 16px 12px !important;
            margin: 0 !important;
            padding: 0 !important;
        }
        .film_list-grid-big .film_list-wrap {
            grid-template-columns: repeat(auto-fill, minmax(185px, 1fr)) !important;
        }
        .flw-item {
            float: none !important;
            width: auto !important;
            padding: 0 !important;
            margin: 0 !important;
            background: ${CONFIG.BG_CARD} !important;
            border-radius: ${CONFIG.BORDER_RADIUS} !important;
            overflow: hidden !important;
            border: 1px solid ${CONFIG.BORDER_COLOR} !important;
            transition: transform ${CONFIG.TRANSITION_NORMAL}, border-color ${CONFIG.TRANSITION_NORMAL}, box-shadow ${CONFIG.TRANSITION_NORMAL} !important;
        }
        .flw-item:hover {
            transform: translateY(-4px) !important;
            border-color: ${CONFIG.ACCENT_COLOR} !important;
            box-shadow: 0 8px 30px rgba(229, 9, 20, 0.15), 0 4px 15px rgba(0,0,0,0.3) !important;
        }
        .flw-item > .clearfix { display: none !important; }

        /* --- Film Poster Container ---
           Site uses padding-bottom:148% with absolutely positioned img.
           Keep that intact, just restyle the container. */
        .flw-item .film-poster {
            position: relative !important;
            width: 100% !important;
            padding-bottom: 148% !important;
            overflow: hidden !important;
            margin-bottom: 0 !important;
            border-radius: 0 !important;
            background: ${CONFIG.BG_PRIMARY} !important;
        }
        .flw-item .film-poster .film-poster-img {
            position: absolute !important;
            inset: 0 !important;
            width: 100% !important;
            min-height: 100% !important;
            object-fit: cover !important;
            transition: transform 0.4s ease !important;
        }
        .flw-item:hover .film-poster .film-poster-img {
            transform: scale(1.05) !important;
        }

        /* --- Quality Badge --- */
        .flw-item .pick.film-poster-quality {
            position: absolute !important;
            top: 8px !important;
            left: 8px !important;
            right: auto !important;
            background: ${CONFIG.ACCENT_COLOR} !important;
            color: #fff !important;
            font-size: 11px !important;
            font-weight: 700 !important;
            padding: 2px 8px !important;
            border-radius: 4px !important;
            z-index: 6 !important;
            letter-spacing: 0.5px !important;
        }

        /* --- Play Button Overlay ---
           The site uses ::before (circle) and i (icon) with absolute positioning
           and margin-based centering from top:50%/left:50%. We must keep this
           approach and only restyle colors/sizes. Using flexbox here breaks it. */
        .flw-item .film-poster .film-poster-ahref {
            position: absolute !important;
            inset: 0 !important;
            z-index: 3 !important;
            display: block !important;
        }
        /* Dark overlay on hover */
        .flw-item .film-poster .film-poster-ahref::after {
            content: "" !important;
            position: absolute !important;
            inset: 0 !important;
            width: 100% !important;
            height: 100% !important;
            opacity: 0 !important;
            background: rgba(10, 10, 15, 0.55) !important;
            z-index: 1 !important;
            transition: opacity ${CONFIG.TRANSITION_NORMAL} !important;
        }
        /* Play circle - margin-based centering (matches site's approach) */
        .flw-item .film-poster .film-poster-ahref::before {
            content: "" !important;
            position: absolute !important;
            top: 50% !important;
            left: 50% !important;
            width: 52px !important;
            height: 52px !important;
            margin-top: -26px !important;
            margin-left: -26px !important;
            border-radius: 50% !important;
            background: ${CONFIG.ACCENT_COLOR} !important;
            opacity: 0 !important;
            z-index: 2 !important;
            transition: opacity ${CONFIG.TRANSITION_NORMAL}, transform ${CONFIG.TRANSITION_NORMAL} !important;
            transform: scale(0.85) !important;
        }
        /* Play icon - margin-based centering (matches site's approach) */
        .flw-item .film-poster .film-poster-ahref i {
            position: absolute !important;
            top: 50% !important;
            left: 50% !important;
            font-size: 18px !important;
            line-height: 1 !important;
            width: auto !important;
            margin-top: -9px !important;
            margin-left: -7px !important;
            color: #fff !important;
            z-index: 4 !important;
            opacity: 0 !important;
            transition: opacity ${CONFIG.TRANSITION_NORMAL} !important;
        }
        /* Hover states */
        .flw-item .film-poster:hover .film-poster-ahref::after {
            opacity: 1 !important;
        }
        .flw-item .film-poster:hover .film-poster-ahref::before {
            opacity: 1 !important;
            transform: scale(1) !important;
        }
        .flw-item .film-poster:hover .film-poster-ahref i {
            opacity: 1 !important;
        }

        /* --- Film Detail Text Below Poster --- */
        .flw-item .film-detail {
            padding: 10px 12px !important;
            margin: 0 !important;
        }
        .flw-item .film-name {
            font-size: 13.5px !important;
            line-height: 1.3 !important;
            margin: 0 0 6px 0 !important;
        }
        .flw-item .film-name a {
            color: ${CONFIG.TEXT_PRIMARY} !important;
            text-decoration: none !important;
            transition: color ${CONFIG.TRANSITION_FAST} !important;
            display: -webkit-box !important;
            -webkit-line-clamp: 2 !important;
            -webkit-box-orient: vertical !important;
            overflow: hidden !important;
        }
        .flw-item:hover .film-name a { color: ${CONFIG.ACCENT_COLOR} !important; }
        .fd-infor {
            font-size: 12px !important;
            color: ${CONFIG.TEXT_SECONDARY} !important;
            display: flex !important;
            align-items: center !important;
        }
        .fd-infor .dot {
            width: 3px !important;
            height: 3px !important;
            border-radius: 50% !important;
            background: ${CONFIG.TEXT_SECONDARY} !important;
            display: inline-block !important;
            margin: 0 6px !important;
        }
        .fdi-type {
            background: rgba(229, 9, 20, 0.12) !important;
            color: ${CONFIG.ACCENT_COLOR} !important;
            padding: 1px 6px !important;
            border-radius: 3px !important;
            font-size: 11px !important;
            font-weight: 600 !important;
            margin-left: auto !important;
        }

        /* ===== PAGINATION ===== */
        .pre-pagination { margin: 30px 0 !important; }
        .pagination {
            display: flex !important;
            flex-wrap: wrap !important;
            gap: 4px !important;
            justify-content: center !important;
        }
        .pagination .page-item { margin: 0 !important; }
        .pagination .page-item .page-link {
            background: ${CONFIG.BG_CARD} !important;
            border: 1px solid ${CONFIG.BORDER_COLOR} !important;
            color: ${CONFIG.TEXT_PRIMARY} !important;
            border-radius: 6px !important;
            margin: 0 !important;
            min-width: 40px !important;
            height: 40px !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            transition: all ${CONFIG.TRANSITION_FAST} !important;
            font-weight: 500 !important;
        }
        .pagination .page-item .page-link:hover {
            background: ${CONFIG.BG_CARD_HOVER} !important;
            border-color: ${CONFIG.ACCENT_COLOR} !important;
            color: ${CONFIG.ACCENT_COLOR} !important;
        }
        .pagination .page-item.active .page-link {
            background: ${CONFIG.ACCENT_COLOR} !important;
            border-color: ${CONFIG.ACCENT_COLOR} !important;
            color: #fff !important;
        }

        /* ===== SECTION HEADERS ===== */
        .block_area .block_area-header {
            border-bottom: 2px solid ${CONFIG.BORDER_COLOR} !important;
            padding-bottom: 12px !important;
            margin-bottom: 20px !important;
        }
        .block_area .cat-heading {
            color: ${CONFIG.TEXT_PRIMARY} !important;
            font-weight: 700 !important;
            font-size: 1.3rem !important;
        }
        .block_area .block_area-header a {
            color: ${CONFIG.ACCENT_COLOR} !important;
        }

        /* ===== SIDEBAR ===== */
        #sidebar_menu {
            background: ${CONFIG.BG_SECONDARY} !important;
            border-right: 1px solid ${CONFIG.BORDER_COLOR} !important;
        }
        .sidebar_menu-list .nav-link {
            color: ${CONFIG.TEXT_PRIMARY} !important;
            transition: all ${CONFIG.TRANSITION_FAST} !important;
            border-radius: 6px !important;
        }
        .sidebar_menu-list .nav-link:hover {
            color: ${CONFIG.ACCENT_COLOR} !important;
            background: rgba(229, 9, 20, 0.08) !important;
        }
        .sidebar_menu-sub .nav-link {
            color: ${CONFIG.TEXT_SECONDARY} !important;
            font-size: 13px !important;
        }

        /* ===== FOOTER ===== */
        #footer {
            background: ${CONFIG.BG_SECONDARY} !important;
            border-top: 1px solid ${CONFIG.BORDER_COLOR} !important;
            padding: 30px 0 !important;
        }
        .footer-about .footer-fa-text {
            color: ${CONFIG.TEXT_SECONDARY} !important;
            font-size: 13px !important;
            line-height: 1.7 !important;
        }
        .footer-fa-menu a {
            color: ${CONFIG.TEXT_SECONDARY} !important;
            transition: color ${CONFIG.TRANSITION_FAST} !important;
        }
        .footer-fa-menu a:hover { color: ${CONFIG.ACCENT_COLOR} !important; }
        .footer-fa-menu .space { color: ${CONFIG.TEXT_SECONDARY} !important; opacity: 0.3 !important; }
        .footer-notice span { color: ${CONFIG.TEXT_SECONDARY} !important; opacity: 0.6 !important; font-size: 12px !important; }

        /* ===== MODALS ===== */
        .modal-content {
            background: ${CONFIG.BG_SECONDARY} !important;
            border: 1px solid ${CONFIG.BORDER_COLOR} !important;
            border-radius: 12px !important;
        }
        .modal-header { border-bottom-color: ${CONFIG.BORDER_COLOR} !important; }
        .modal-title { color: ${CONFIG.TEXT_PRIMARY} !important; }
        .close { color: ${CONFIG.TEXT_SECONDARY} !important; }

        /* ===== HEADER NAV DROPDOWN ===== */
        #header_menu .header_menu-sub {
            background: ${CONFIG.BG_SECONDARY} !important;
            border: 1px solid ${CONFIG.BORDER_COLOR} !important;
            border-radius: ${CONFIG.BORDER_RADIUS} !important;
            box-shadow: 0 8px 30px rgba(0,0,0,0.4) !important;
        }
        #header_menu .header_menu-sub ul.sub-menu li a {
            color: ${CONFIG.TEXT_PRIMARY} !important;
            transition: all ${CONFIG.TRANSITION_FAST} !important;
        }
        #header_menu .header_menu-sub ul.sub-menu li:hover a {
            background: ${CONFIG.ACCENT_COLOR} !important;
            color: #fff !important;
        }

        /* ===== NAV LINKS ===== */
        #header_menu ul.header_menu-list .nav-item > a {
            color: ${CONFIG.TEXT_PRIMARY} !important;
            font-weight: 500 !important;
            transition: color ${CONFIG.TRANSITION_FAST} !important;
        }
        #header_menu ul.header_menu-list .nav-item:hover > a,
        #header_menu ul.header_menu-list .nav-item > a:hover {
            color: ${CONFIG.ACCENT_COLOR} !important;
        }
        #header_menu ul.header_menu-list .nav-item.active > a::before {
            background: ${CONFIG.ACCENT_COLOR} !important;
        }

        /* ===== BUTTONS GLOBAL ===== */
        .btn-secondary {
            background: ${CONFIG.BG_CARD} !important;
            border-color: ${CONFIG.BORDER_COLOR} !important;
            color: ${CONFIG.TEXT_PRIMARY} !important;
        }
        .btn-secondary:hover {
            background: ${CONFIG.BG_CARD_HOVER} !important;
            border-color: ${CONFIG.ACCENT_COLOR} !important;
            color: ${CONFIG.ACCENT_COLOR} !important;
        }
        .btn-primary, .btn-focus {
            background: ${CONFIG.ACCENT_COLOR} !important;
            border-color: ${CONFIG.ACCENT_COLOR} !important;
            color: #fff !important;
        }
        .btn-primary:hover, .btn-focus:hover {
            background: ${CONFIG.ACCENT_HOVER} !important;
            border-color: ${CONFIG.ACCENT_HOVER} !important;
            color: #fff !important;
        }

        /* ===== FORM ELEMENTS ===== */
        .form-control {
            background: ${CONFIG.BG_PRIMARY} !important;
            border-color: ${CONFIG.BORDER_COLOR} !important;
            color: ${CONFIG.TEXT_PRIMARY} !important;
            border-radius: 6px !important;
        }
        .form-control:focus {
            border-color: ${CONFIG.ACCENT_COLOR} !important;
            box-shadow: 0 0 0 2px rgba(229, 9, 20, 0.15) !important;
        }

        /* ===== TV SHOW SEASON/EPISODE LIST ===== */
        .ss-list {
            display: flex !important;
            flex-wrap: wrap !important;
            gap: 6px !important;
            margin-bottom: 12px !important;
        }
        .ss-list .ssl-item {
            float: none !important;
            margin: 0 !important;
        }
        .ss-list .ssl-item a {
            color: ${CONFIG.TEXT_PRIMARY} !important;
            background: ${CONFIG.BG_CARD} !important;
            border: 1px solid ${CONFIG.BORDER_COLOR} !important;
            border-radius: 6px !important;
            padding: 6px 14px !important;
            display: inline-block !important;
            transition: all ${CONFIG.TRANSITION_FAST} !important;
        }
        .ss-list .ssl-item a:hover {
            border-color: ${CONFIG.ACCENT_COLOR} !important;
            color: ${CONFIG.ACCENT_COLOR} !important;
        }
        .ss-list .ssl-item a.active {
            background: ${CONFIG.ACCENT_COLOR} !important;
            border-color: ${CONFIG.ACCENT_COLOR} !important;
            color: #fff !important;
        }
        .ep-list {
            display: flex !important;
            flex-wrap: wrap !important;
            gap: 6px !important;
        }
        .ep-list .ssl-item {
            float: none !important;
            margin: 0 !important;
        }
        .ep-list .ssl-item a {
            background: ${CONFIG.BG_CARD} !important;
            border: 1px solid ${CONFIG.BORDER_COLOR} !important;
            color: ${CONFIG.TEXT_PRIMARY} !important;
            border-radius: 6px !important;
            padding: 6px 12px !important;
            display: inline-block !important;
            transition: all ${CONFIG.TRANSITION_FAST} !important;
        }
        .ep-list .ssl-item a:hover {
            border-color: ${CONFIG.ACCENT_COLOR} !important;
            color: ${CONFIG.ACCENT_COLOR} !important;
        }
        .ep-list .ssl-item a.active {
            background: ${CONFIG.ACCENT_COLOR} !important;
            border-color: ${CONFIG.ACCENT_COLOR} !important;
            color: #fff !important;
        }

        /* ===== HIDE SHARE BUTTONS & AD PLACEHOLDERS ===== */
        .sharethis-inline-share-buttons { display: none !important; }
        [id$="-top"][style*="display: none"],
        [id$="-bottom"][style*="display: none"],
        [id$="-middle"][style*="display: none"] {
            display: none !important;
        }
        iframe[style*="display: none"] { display: none !important; }

        /* ===== SMOOTH SCROLL ===== */
        html { scroll-behavior: smooth !important; }

        /* ===== FILM TIP TOOLTIP ===== */
        .film-tip {
            background: ${CONFIG.BG_SECONDARY} !important;
            border: 1px solid ${CONFIG.BORDER_COLOR} !important;
            border-radius: ${CONFIG.BORDER_RADIUS} !important;
            box-shadow: 0 8px 30px rgba(0,0,0,0.5) !important;
        }

        /* ===== LOADING ANIMATION ===== */
        .loading .span1, .loading .span2, .loading .span3 {
            background: ${CONFIG.ACCENT_COLOR} !important;
        }

        /* ===== LINK HIGHLIGHTS ===== */
        a:hover { color: ${CONFIG.ACCENT_COLOR} !important; }
        .highlight-text { color: ${CONFIG.ACCENT_COLOR} !important; }

        /* ===== RESPONSIVE ===== */
        @media (max-width: 991px) {
            .film_list .film_list-wrap {
                grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)) !important;
                gap: 12px 8px !important;
            }
        }
        @media (max-width: 575px) {
            .film_list .film_list-wrap {
                grid-template-columns: repeat(3, 1fr) !important;
                gap: 10px 6px !important;
            }
            body.arc-watch-page #watch-iframe {
                height: calc(100vh - 44px) !important;
            }
            body.arc-watch-page .watching_player-control {
                height: 44px !important;
                flex: 0 0 44px !important;
                padding: 0 10px !important;
                gap: 4px !important;
            }
            body.arc-watch-page .watching_player-control .btn {
                font-size: 11px !important;
                padding: 4px 8px !important;
            }
            .dp-i-content {
                flex-direction: column !important;
                gap: 16px !important;
            }
        }
        @media (min-width: 1600px) {
            .film_list .film_list-wrap {
                grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)) !important;
            }
        }
    `);

    // ==================== WATCH PAGE ENHANCEMENTS ====================
    function initWatchPage() {
        document.body.classList.add('arc-watch-page');

        // Add scroll-down hint (no innerHTML)
        const hint = document.createElement('div');
        hint.className = 'arc-scroll-hint';
        const hintSpan = document.createElement('span');
        hint.appendChild(hintSpan);
        svg.setAttribute('viewBox', '0 0 24 24');
        svg.setAttribute('fill', 'none');
        svg.setAttribute('stroke', 'currentColor');
        svg.setAttribute('stroke-width', '2');
        path.setAttribute('d', 'M7 13l5 5 5-5M7 7l5 5 5-5');
        svg.appendChild(path);
        hint.appendChild(svg);
        document.body.appendChild(hint);

        // Show header when scrolled past the player, hide hint
        const scrollHandler = () => {
            const scrollY = window.scrollY;
            const vh = window.innerHeight;
            document.body.classList.toggle('arc-header-visible', scrollY > vh * 0.8);
            hint.classList.toggle('hidden', scrollY > 50);
        };

        window.addEventListener('scroll', scrollHandler, { passive: true });
        scrollHandler();

        // Keyboard: Escape scrolls back to player
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !e.target.closest('input, textarea')) {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        });
    }

    // ==================== LISTING PAGE ENHANCEMENTS ====================
    function initListingPage() {
        // Trigger lazy-load for images in viewport
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    if (img.dataset.src && !img.src.includes(img.dataset.src)) {
                        img.src = img.dataset.src;
                    }
                    observer.unobserve(img);
                }
            });
        }, { rootMargin: '200px' });

        document.querySelectorAll('.film-poster-img[data-src]').forEach(img => {
            observer.observe(img);
        });
    }

    // ==================== GLOBAL ENHANCEMENTS ====================
    function initGlobal() {
        // Clean up hidden ad iframes dynamically injected
        const adObserver = new MutationObserver(mutations => {
            for (const m of mutations) {
                for (const node of m.addedNodes) {
                    if (node.nodeType !== 1) continue;
                    if (node.tagName === 'IFRAME' && node.style.display === 'none') {
                        node.remove();
                    }
                }
            }
        });
        adObserver.observe(document.body, { childList: true, subtree: true });
    }

    // ==================== INITIALIZATION ====================
    function init() {
        initGlobal();
        if (isWatchPage()) initWatchPage();
        if (isListingPage()) initListingPage();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();