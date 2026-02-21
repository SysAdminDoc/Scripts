// ==UserScript==
// @name         1337x Enhanced
// @namespace    https://github.com/SysAdminDoc
// @version      2.5.0
// @description  Declutter, beautify, and supercharge 1337x — full-width layout, ad removal, dark pro theme, magnet tools, and more
// @author       SysAdminDoc
// @match        *://1337x.to/*
// @match        *://www.1337x.to/*
// @match        *://1337x.st/*
// @match        *://1337x.gd/*
// @match        *://1337x.is/*
// @match        *://1337x.ws/*
// @match        *://x1337x.cc/*
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_setClipboard
// @grant        GM_registerMenuCommand
// @run-at       document-start
// @noframes
// ==/UserScript==

(function() {
    'use strict';

    /* =========================================================================
       CONFIGURATION
    ========================================================================= */
    const DEFAULTS = {
        removeAds:        true,
        darkTheme:        true,
        fullWidth:        true,
        compactRows:      true,
        compactHeader:    true,
        denseMode:        false,
        sidebarCollapsed: true,
        colorSeeds:       true,
        uploaderBadges:   true,
        magnetLinks:      true,
        moreTrackers:     true,
        highlightVisited: true,
        quickFilters:     false,
        hideFooterLinks:  true,
        cleanupDOM:       true,
        infohashCopy:     true,
    };

    function cfg(k)       { return GM_getValue(k, DEFAULTS[k]); }
    function setCfg(k, v) { GM_setValue(k, v); }

    /* =========================================================================
       AD / TRACKER BLOCKLIST
    ========================================================================= */
    const blockedHosts = [
        'adexchangeclear.com','limeiptv.to','nsdzyfrgyhzpe.online',
        'aauvdpyzffajh.site','popads.net','popcash.net','doubleclick.net',
        'adserving.com','popunder.com','exoclick.com','juicyads.com',
        'trafficjunky.com','propellerads.com','clickadu.com',
    ];
    function isBlocked(url) {
        try { const u = new URL(url, location.origin); return blockedHosts.some(h => u.hostname.includes(h)); }
        catch { return false; }
    }
    // Intercept ad XHR
    const _open = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function(m, url) {
        if (isBlocked(url)) { this.send = () => {}; return; }
        return _open.apply(this, arguments);
    };

    /* =========================================================================
       MASTER CSS
       -----------------------------------------------------------------------
       Every rule uses body.x13-dark prefix so the entire theme can be toggled
       with a single class. Organized by page region, then by page type.
       -----------------------------------------------------------------------
       Color palette (Sflashy "1337x Beauty" base, extended):
         --bg:       rgb(24,27,38)    primary background
         --bg2:      rgb(20,23,31)    recessed / secondary bg
         --bg-el:    rgb(30,34,48)    elevated surfaces (headers, cards)
         --bg-hov:   rgb(38,43,60)    hover state
         --bdr:      #2d2d2d          primary border
         --bdr-l:    #1e2230          subtle border
         --accent:   #58a6ff          links, active states
         --green:    #3fb950          seeds, magnet, positive
         --red:      #f85149          leeches, negative
         --brand:    #a42a01          1337x brand red (search btn, sidebar h2)
    ========================================================================= */
    const CSS = `
/* ==================================================================
   AD REMOVAL (active regardless of theme)
================================================================== */
[id*="befeaeb"],[id*="baeedf"],[id*="popMag"],[class*="popMag"],
iframe[style*="position: absolute"][style*="top: -"],
iframe[style*="visibility: hidden"][style*="position: absolute"],
a[style*="display: none"][style*="visibility: hidden"],
link[rel="dns-prefetch"]{
  display:none!important;height:0!important;width:0!important;
  overflow:hidden!important;pointer-events:none!important;
}

/* ==================================================================
   DARK THEME — VARIABLES
================================================================== */
body.x13-dark{
  --bg:rgb(24,27,38);--bg2:rgb(20,23,31);--bg-el:rgb(30,34,48);
  --bg-hov:rgb(38,43,60);--bdr:#2d2d2d;--bdr-l:#1e2230;
  --txt:#e6edf3;--txt-s:#b0b8c1;--txt-m:#6e7681;--txt-d:#484f58;
  --accent:#58a6ff;--accent-h:#79c0ff;
  --green:#3fb950;--green-d:#238636;--red:#f85149;--red-d:#da3633;
  --orange:#d29922;--yellow:#e3b341;--purple:#8b5cf6;
  --brand:#a42a01;--brand-h:#c43301;
  --shadow:0 0 10px #0c0c0c;--shadow-lg:0 4px 24px rgba(0,0,0,.5);
  --radius:6px;--mono:'Consolas','SF Mono','Fira Code',monospace;
  background:var(--bg)!important;color:var(--txt)!important;
  -webkit-font-smoothing:antialiased;
}
body.x13-dark a{transition:color .12s,background .12s!important}
body.x13-dark b,body.x13-dark strong{color:var(--txt)!important}
body.x13-dark ::selection{background:rgba(88,166,255,.25)!important;color:var(--txt)!important}

/* Scrollbar — branded orange gradient */
body.x13-dark ::-webkit-scrollbar-track{
  -webkit-box-shadow:inset 0 0 0px rgba(0,0,0,.3);border-radius:2px;background-color:#212121;
}
body.x13-dark ::-webkit-scrollbar{width:8px;background-color:#212121}
body.x13-dark ::-webkit-scrollbar-thumb{
  border-radius:2px;-webkit-box-shadow:inset 0 0 6px rgba(0,0,0,.6);
  background:linear-gradient(180deg,#f14e13,#f85c27);
}

/* ==================================================================
   TOP BAR
================================================================== */
body.x13-dark .top-bar{
  background:var(--bg2)!important;border:none!important;
  box-shadow:var(--shadow)!important;padding:3px 0!important;
}
body.x13-dark .top-bar a,body.x13-dark .top-bar-nav a{color:var(--txt-m)!important;font-size:12px!important}
body.x13-dark .top-bar-nav a:hover,body.x13-dark .top-bar-nav li.active a{color:var(--accent)!important}

/* ==================================================================
   HEADER & NAV
================================================================== */
body.x13-dark header{background:var(--bg)!important;border:none!important;box-shadow:var(--shadow)!important}
body.x13-dark header nav{border-top:1px solid var(--bdr)!important;margin:0!important}
body.x13-dark nav ul{background:var(--bg2)!important;box-shadow:none!important}
body.x13-dark .main-navigation li{border:none!important}
body.x13-dark .main-navigation a{color:var(--txt-s)!important}
body.x13-dark .main-navigation a:hover,body.x13-dark .main-navigation .active a{color:var(--accent)!important}
body.x13-dark .mobile-menu{background:var(--bg2)!important}
body.x13-dark .mobile-menu a{color:var(--txt-s)!important}
body.x13-dark .navbar-menu span{background:var(--txt-s)!important}

/* ==================================================================
   SEARCH
================================================================== */
body.x13-dark .search-box .form-control{
  background:var(--bg2)!important;border:1px solid var(--bdr)!important;
  color:var(--txt)!important;box-shadow:none!important;
}
body.x13-dark .search-box .form-control::placeholder{color:var(--txt-m)!important}
body.x13-dark .search-box .form-control:focus{
  border-color:var(--accent)!important;box-shadow:0 0 0 2px rgba(88,166,255,.15)!important;
}
body.x13-dark .btn-search{background:var(--brand)!important;border:none!important;color:#fff!important;box-shadow:none!important}
body.x13-dark .btn-search:hover{background:var(--brand-h)!important}

/* Autocomplete */
body.x13-dark .ui-autocomplete,body.x13-dark .ui-widget-content{
  background:var(--bg2)!important;border:1px solid var(--bdr)!important;
  border-radius:var(--radius)!important;box-shadow:var(--shadow-lg)!important;
}
body.x13-dark .ui-menu-item a,body.x13-dark .ui-autocomplete li a{color:var(--txt)!important;background:transparent!important}
body.x13-dark .ui-state-focus,body.x13-dark .ui-menu-item a:hover{background:var(--bg-hov)!important;color:var(--accent)!important}

/* ==================================================================
   SIDEBAR
================================================================== */
body.x13-dark .list-box{border:none!important}
body.x13-dark .list-box ul{background:var(--bg)!important;box-shadow:var(--shadow)!important;border-radius:0 0 var(--radius) var(--radius)!important}
body.x13-dark .list-box li{border:none!important}
body.x13-dark .list-box li a{color:var(--txt-s)!important;border:none!important;transition:color .12s!important}
body.x13-dark .list-box li a:hover{color:var(--accent)!important}
body.x13-dark .list-box li a i{color:var(--txt-m)!important}
body.x13-dark .list-box h2{
  background:var(--brand)!important;border:none!important;color:#fff!important;
  box-shadow:var(--shadow)!important;border-radius:var(--radius) var(--radius) 0 0!important;margin:0!important;
}

/* ==================================================================
   TORRENT TABLE (listing pages)
================================================================== */
body.x13-dark .table-list{
  box-shadow:var(--shadow)!important;border:none!important;
  border-radius:var(--radius)!important;overflow:hidden!important;
}
/* Table header */
body.x13-dark .table-list thead th,
body.x13-dark th.coll-1,body.x13-dark th.coll-2,body.x13-dark th.coll-3,
body.x13-dark th.coll-4,body.x13-dark th.coll-5,body.x13-dark th.coll-date{
  background:var(--bg-el)!important;border:none!important;
  border-bottom:2px solid var(--bdr)!important;
  color:var(--txt-m)!important;text-transform:uppercase!important;
  font-size:10px!important;font-weight:700!important;letter-spacing:.7px!important;
  padding:7px 10px!important;
}
/* Table rows — all stripes uniform */
body.x13-dark .table-striped>tbody>tr td,
body.x13-dark .table-striped>tbody>tr:nth-of-type(odd) td,
body.x13-dark .table-striped>tbody>tr:nth-of-type(even) td{
  background:var(--bg)!important;border:none!important;
  border-bottom:1px solid var(--bdr-l)!important;transition:background .1s!important;
}
body.x13-dark .table-striped>tbody>tr:hover td{background:var(--bg-hov)!important}
/* Table cells */
body.x13-dark .table-list td a:not(.icon):not(.x13-magnet-link){color:var(--accent)!important}
body.x13-dark .table-list td a:not(.icon):not(.x13-magnet-link):hover{color:var(--accent-h)!important}
body.x13-dark .table-list td.coll-1 .icon i{color:var(--txt-d)!important}
body.x13-dark .table-list td.coll-date{color:var(--txt-m)!important}
body.x13-dark .table-list td.coll-4{color:var(--txt-s)!important}
/* Comment count badge */
body.x13-dark .table-list .name .comments{
  background:var(--bg-el)!important;color:var(--txt-m)!important;
  border:1px solid var(--bdr)!important;border-radius:3px!important;
}
/* Mobile seed count inside coll-4 — hide in desktop view */
body.x13-dark .table-list .coll-4 .seeds{display:none!important}

/* Uploader column — role colors */
body.x13-dark .table-list td.coll-5 a{color:var(--txt-m)!important}
body.x13-dark .table-list td.coll-5 a:hover{color:var(--accent)!important}
body.x13-dark .table-list td.coll-5.vip a{color:var(--green)!important}
body.x13-dark .table-list td.coll-5.vip a:hover{color:#56d364!important}
body.x13-dark .table-list td.coll-5.trial-uploader a{color:var(--yellow)!important}
body.x13-dark .table-list td.coll-5.trial-uploader a:hover{color:#f0d050!important}
/* Mobile uploader badges on coll-4 */
body.x13-dark .table-list td.mob-vip,
body.x13-dark .table-list td.mob-trial-uploader,
body.x13-dark .table-list td.mob-uploader{color:var(--txt-s)!important}

/* "View More" button at bottom of tables */
body.x13-dark .table-btn-wrap{
  background:var(--bg)!important;border-top:1px solid var(--bdr-l)!important;
  text-align:center!important;padding:8px 0!important;
  border-radius:0 0 var(--radius) var(--radius)!important;
}
body.x13-dark .btn-view-all{
  background:var(--bg-el)!important;color:var(--txt-s)!important;
  border:1px solid var(--bdr)!important;border-radius:4px!important;
  padding:5px 20px!important;font-size:12px!important;font-weight:600!important;
  text-transform:uppercase!important;letter-spacing:.5px!important;
  transition:all .12s!important;text-decoration:none!important;
}
body.x13-dark .btn-view-all:hover{
  background:var(--bg-hov)!important;color:var(--accent)!important;border-color:var(--accent)!important;
}

/* ==================================================================
   BOX-INFO — News/announcement boxes
================================================================== */
body.x13-dark .box-info{
  box-shadow:var(--shadow)!important;border-radius:var(--radius)!important;
  overflow:hidden!important;margin-bottom:14px!important;
}
body.x13-dark .box-info .box-info-heading{
  background:var(--bg-el)!important;box-shadow:none!important;
  border-bottom:1px solid var(--bdr)!important;padding:10px 16px!important;
}
body.x13-dark .box-info-heading h1,body.x13-dark .box-info-heading h2{
  color:var(--txt)!important;font-size:15px!important;margin:0!important;
}
body.x13-dark .box-info-heading .featured-icon i{color:var(--accent)!important}
body.x13-dark .box-info-right,body.x13-dark .box-info-time{color:var(--txt-m)!important}
body.x13-dark .box-info-time i{color:var(--txt-m)!important}
body.x13-dark .box-info-detail{background:var(--bg)!important;padding:12px 16px!important}
body.x13-dark .box-info-detail p{color:var(--txt-s)!important;line-height:1.55!important;margin:0!important}
body.x13-dark .box-info-detail p a{color:var(--accent)!important}
body.x13-dark .box-info-detail p a:hover{color:var(--accent-h)!important}

/* ==================================================================
   MOVIE CAROUSEL / BANNER BOX
================================================================== */
body.x13-dark .banner-box{margin:14px 0!important}
body.x13-dark .banner-box li{
  border:none!important;box-shadow:var(--shadow)!important;
  border-radius:var(--radius)!important;overflow:hidden!important;
  transition:transform .2s,box-shadow .2s!important;background:var(--bg2)!important;
}
body.x13-dark .banner-box li:hover{transform:scale(1.04)!important;box-shadow:var(--shadow-lg)!important}
body.x13-dark .banner-box li img{border-radius:var(--radius) var(--radius) 0 0!important}
/* Resolution badge */
body.x13-dark .banner-box li a span{
  background:rgba(0,0,0,.75)!important;color:var(--accent)!important;
  font-weight:700!important;border-radius:3px!important;font-size:11px!important;
}
/* Slick arrows */
body.x13-dark .slick-prev,body.x13-dark .slick-next{
  background:var(--bg-el)!important;border:1px solid var(--bdr)!important;
  border-radius:50%!important;opacity:.8!important;z-index:10!important;
}
body.x13-dark .slick-prev:hover,body.x13-dark .slick-next:hover{
  background:var(--bg-hov)!important;border-color:var(--accent)!important;opacity:1!important;
}

/* ==================================================================
   FEATURED HEADING (Popular Movie Torrents, etc.)
   Includes .popular / .active tab links within h3
================================================================== */
body.x13-dark .featured-list{margin-bottom:14px!important}
body.x13-dark .featured-heading{
  background:var(--bg-el)!important;color:var(--txt)!important;
  border:none!important;box-shadow:var(--shadow)!important;
  border-radius:var(--radius) var(--radius) 0 0!important;
  padding:9px 16px!important;margin-bottom:0!important;
}
body.x13-dark .featured-heading strong{color:var(--txt)!important}
body.x13-dark .featured-heading .featured-icon i{color:var(--accent)!important}
/* "Popular This Week" / "Trending This Week" tab links inside h3 */
body.x13-dark .featured-heading a{
  color:var(--txt-m)!important;font-size:12px!important;
  padding:3px 10px!important;border-radius:12px!important;
  border:1px solid transparent!important;transition:all .12s!important;
  text-decoration:none!important;margin-left:4px!important;
}
body.x13-dark .featured-heading a:hover{
  color:var(--accent)!important;border-color:var(--accent)!important;
  background:rgba(88,166,255,.08)!important;
}
body.x13-dark .featured-heading a.active,
body.x13-dark .featured-heading a.popular.active{
  color:var(--accent)!important;background:rgba(88,166,255,.12)!important;
  border-color:rgba(88,166,255,.3)!important;font-weight:600!important;
}

/* ==================================================================
   TRENDING / CATEGORY / FILTER PAGES
================================================================== */
body.x13-dark .trending-torrent-explore .box-info.trending h1{color:var(--txt)!important}
body.x13-dark .trending-torrent-explore .box-info.filter-list,
body.x13-dark .trending-torrent-explore .box-info.filter-list .black-box,
body.x13-dark .filter-list .box-info-heading{
  background:var(--bg)!important;box-shadow:var(--shadow)!important;border-radius:var(--radius)!important;
}
body.x13-dark .filter{background:var(--bg)!important;box-shadow:var(--shadow)!important;border-radius:var(--radius)!important}
body.x13-dark .filter label{color:var(--txt-s)!important}
body.x13-dark .filter-list.small-list li a{
  color:var(--txt-s)!important;background:var(--bg-el)!important;
  border:1px solid var(--bdr)!important;border-radius:4px!important;
}
body.x13-dark .filter-list.small-list li a:hover{
  background:var(--bg-hov)!important;color:var(--accent)!important;border-color:var(--accent)!important;
}

/* ==================================================================
   DIVIDER & USER-BOX (bottom of home page)
================================================================== */
body.x13-dark hr.divider{
  border:none!important;border-top:1px solid var(--bdr)!important;
  margin:16px 0!important;
}
body.x13-dark .user-box{margin-bottom:16px!important}
body.x13-dark .user-box ul{display:flex!important;gap:8px!important;flex-wrap:wrap!important;padding:0!important;margin:0!important;list-style:none!important}
body.x13-dark .user-box li{
  padding:5px 14px!important;border-radius:4px!important;
  font-size:11px!important;font-weight:600!important;text-transform:uppercase!important;
  letter-spacing:.5px!important;
}
body.x13-dark .user-box li.admin{background:rgba(248,81,73,.12)!important;color:var(--red)!important;border:1px solid rgba(248,81,73,.25)!important}
body.x13-dark .user-box li.mod{background:rgba(88,166,255,.12)!important;color:var(--accent)!important;border:1px solid rgba(88,166,255,.25)!important}
body.x13-dark .user-box li.vip{background:rgba(63,185,80,.12)!important;color:var(--green)!important;border:1px solid rgba(63,185,80,.25)!important}
body.x13-dark .user-box li.uplo{background:rgba(210,153,34,.12)!important;color:var(--orange)!important;border:1px solid rgba(210,153,34,.25)!important}
body.x13-dark .user-box li.trial{background:rgba(227,179,65,.1)!important;color:var(--yellow)!important;border:1px solid rgba(227,179,65,.2)!important}
body.x13-dark .user-box li.user{background:var(--bg-el)!important;color:var(--txt-m)!important;border:1px solid var(--bdr)!important}

/* ==================================================================
   TORRENT DETAIL PAGE
================================================================== */
/* Title heading */
body.x13-dark .torrent-detail-page .box-info-heading{padding:12px 18px!important}
body.x13-dark .torrent-detail-page .box-info-heading h1{
  font-size:17px!important;font-weight:600!important;line-height:1.3!important;
}

/* Outer wrapper (.no-top-radius + obfuscated hash class) */
body.x13-dark .no-top-radius,
body.x13-dark .lfcc511197dc2c6b8c7607a7000683205e005e7aa{
  background:var(--bg)!important;border:none!important;padding:0!important;
}
/* Inner clearfix wrapper */
body.x13-dark .l1688bc7311ee7b3e68e33d5ba5357e132def79a3{
  background:var(--bg)!important;padding:12px 16px!important;
}
/* Download button list — the UL wrapper */
body.x13-dark .l698b7daec6f367a44f203e1ec325ea3ba61e0814{
  display:flex!important;flex-wrap:wrap!important;gap:8px!important;
  align-items:center!important;padding:0!important;margin:0 0 12px!important;
  list-style:none!important;
}
/* KILL empty spacer <li> elements (these cause ~200px dead space) */
body.x13-dark .l698b7daec6f367a44f203e1ec325ea3ba61e0814>li[style*="margin-top:0px"]:empty,
body.x13-dark .l698b7daec6f367a44f203e1ec325ea3ba61e0814>li[style*="margin-top: 0px"]:empty,
.torrent-detail-page li[style*="margin-top:0px"]:empty,
.torrent-detail-page li[style*="margin-top: 0px"]:empty{
  display:none!important;
}
/* All download button anchors (common base class) */
body.x13-dark .lcd018bca04816403cfdf6788d07c72d3a7738f0d{
  background:var(--bg-el)!important;border:1px solid var(--bdr)!important;
  color:var(--txt)!important;border-radius:var(--radius)!important;
  padding:8px 16px!important;display:inline-flex!important;align-items:center!important;
  gap:8px!important;font-weight:600!important;font-size:13px!important;
  transition:all .15s!important;text-decoration:none!important;
  white-space:nowrap!important;
}
/* Magnet Download button — green accent */
body.x13-dark .lfbf51ae415d407246cbd19fc760b942febceebb5{
  border-color:rgba(63,185,80,.35)!important;
}
body.x13-dark .lfbf51ae415d407246cbd19fc760b942febceebb5:hover{
  background:var(--green-d)!important;border-color:var(--green)!important;color:#fff!important;
}
/* Torrent Download dropdown button */
body.x13-dark .l8808f81d51797cd08f7a20e82ada8ff92773fc40:hover{
  background:var(--bg-hov)!important;border-color:var(--accent)!important;color:var(--accent)!important;
}
/* Mirror download links */
body.x13-dark .l1c7311f1d4295c7763d07fe832c019706f0b711c:hover{
  background:var(--bg-hov)!important;border-color:var(--accent)!important;color:var(--accent)!important;
}
/* Fallback: any unmatched download link in the button area */
body.x13-dark .torrent-detail-page .clearfix ul li>a[href^="magnet:"]:not(.x13-magnet-link){
  border-color:rgba(63,185,80,.35)!important;
}

/* Dropdown menus (torrent mirror list) */
body.x13-dark .dropdown-menu{
  background:var(--bg2)!important;border:1px solid var(--bdr)!important;
  border-radius:var(--radius)!important;box-shadow:var(--shadow-lg)!important;
  padding:4px!important;
}
body.x13-dark .dropdown-menu li{background:transparent!important}
body.x13-dark .dropdown-menu li a{
  color:var(--txt-s)!important;border-radius:4px!important;padding:8px 12px!important;
}
body.x13-dark .dropdown-menu li a:hover{background:var(--bg-hov)!important;color:var(--accent)!important}

/* Metadata lists (Category, Size, Seeders etc) */
body.x13-dark .torrent-detail-page .list{border:none!important;margin:0!important;padding:2px 0!important}
body.x13-dark .torrent-detail-page .list li{
  border-bottom:1px solid var(--bdr-l)!important;padding:6px 12px!important;
  display:flex!important;align-items:center!important;justify-content:space-between!important;
  color:var(--txt-s)!important;
}
body.x13-dark .torrent-detail-page .list li:last-child{border-bottom:none!important}
body.x13-dark .torrent-detail-page .list li strong{
  color:var(--txt-m)!important;font-weight:600!important;font-size:11px!important;
  text-transform:uppercase!important;letter-spacing:.4px!important;min-width:95px!important;
}
body.x13-dark .torrent-detail-page .list li span{color:var(--txt)!important}
body.x13-dark .torrent-detail-page .list li a{color:var(--accent)!important}
body.x13-dark .torrent-detail-page .list li a:hover{color:var(--accent-h)!important}
body.x13-dark .torrent-detail-page .list li .seeds{color:var(--green)!important;font-weight:600!important}
body.x13-dark .torrent-detail-page .list li .leeches{color:var(--red)!important}
body.x13-dark .torrent-detail-page .list li small.uploader{display:none!important}

/* Infohash box */
body.x13-dark .infohash-box{
  background:var(--bg2)!important;border:1px solid var(--bdr)!important;
  border-radius:var(--radius)!important;padding:8px 14px!important;margin:6px 0!important;
}
body.x13-dark .infohash-box p{margin:0!important}
body.x13-dark .infohash-box strong{color:var(--txt-m)!important;font-size:11px!important}
body.x13-dark .infohash-box span{
  color:var(--txt-m)!important;font-family:var(--mono)!important;
  font-size:12px!important;user-select:all!important;
}
body.x13-dark .manage-box{padding:4px 0!important;margin:0!important}

/* Kill hidden-div spacing spam (20+ empty display:none divs) */
body.x13-dark .torrent-detail-page div[style*="display: none"],
body.x13-dark .torrent-detail-page div[style*="display:none"]{
  height:0!important;margin:0!important;padding:0!important;
  line-height:0!important;font-size:0!important;
}

/* ==================================================================
   TABS (Description / Files / Comments / Trackers)
================================================================== */
body.x13-dark .torrent-tabs{margin-top:12px!important}
body.x13-dark .torrent-tabs .tab-nav{
  background:var(--bg-el)!important;border:none!important;
  box-shadow:var(--shadow)!important;border-radius:var(--radius) var(--radius) 0 0!important;
  padding:0!important;display:flex!important;
}
body.x13-dark .tab-nav li,body.x13-dark .tab-nav li a{
  background:transparent!important;border:none!important;
  color:var(--txt-m)!important;padding:9px 16px!important;transition:color .12s!important;
}
body.x13-dark .tab-nav li.active a{
  color:var(--accent)!important;border-bottom:2px solid var(--accent)!important;font-weight:600!important;
}
body.x13-dark .tab-nav li a:hover{color:var(--accent)!important}
/* Comment count badge inside tab */
body.x13-dark .tab-nav li a span.active{
  background:var(--bg-hov)!important;color:var(--txt-m)!important;
  border-radius:10px!important;padding:1px 7px!important;font-size:10px!important;margin-left:3px!important;
}
body.x13-dark .tab-content{
  background:var(--bg)!important;box-shadow:var(--shadow)!important;
  border:none!important;border-radius:0 0 var(--radius) var(--radius)!important;
  padding:14px 16px!important;
}
/* Description */
body.x13-dark .tab-content #description p,body.x13-dark .tab-content #description{
  color:var(--txt-s)!important;line-height:1.65!important;
}
body.x13-dark .descrimg{
  border-radius:var(--radius)!important;border:1px solid var(--bdr)!important;
  margin:8px 0!important;max-width:100%!important;
}
/* Files */
body.x13-dark .file-content h2{color:var(--txt)!important;font-size:14px!important}
body.x13-dark .file-content span.head{color:var(--orange)!important;font-weight:600!important}
body.x13-dark .file-content span.head i{color:var(--orange)!important}
body.x13-dark .file-content li{color:var(--txt-s)!important;padding:2px 0!important}
body.x13-dark .file-content li i{color:var(--txt-m)!important;margin-right:5px!important}
/* Comments */
body.x13-dark #comments h2{color:var(--txt-m)!important;font-size:13px!important}
body.x13-dark .comment-info .detail{
  background:var(--bg)!important;box-shadow:var(--shadow)!important;
  border:1px solid var(--bdr)!important;border-radius:var(--radius)!important;
}
body.x13-dark .comment-info .detail .user-name a{color:var(--accent)!important;text-shadow:none!important}
body.x13-dark .comment-info .detail p{color:var(--txt-s)!important}
/* Tracker list */
body.x13-dark #tracker-list h3{color:var(--txt)!important;font-size:13px!important}
body.x13-dark #tracker-list li{
  color:var(--txt-m)!important;padding:3px 0!important;
  font-family:var(--mono)!important;font-size:12px!important;
}

/* ==================================================================
   TORRENT IMAGE (movie detail pages)
================================================================== */
body.x13-dark .torrent-detail .torrent-image-wrap{
  box-shadow:var(--shadow)!important;border:1px solid var(--bdr)!important;
  border-radius:var(--radius)!important;overflow:hidden!important;
  transition:transform .2s!important;
}
body.x13-dark .torrent-detail .torrent-image-wrap:hover{transform:scale(1.02)!important}

/* ==================================================================
   RECENT EPISODES / SEARCH RESULTS
================================================================== */
body.x13-dark .recent-episodes li,body.x13-dark .recent-episodes.box-info{background:var(--bg)!important}
body.x13-dark .recent-episodes .torrent-detail-info p{color:var(--txt-s)!important}
body.x13-dark .recent-episodes .torrent-detail-info h3 a{color:var(--accent)!important}
body.x13-dark .recent-episodes .torrent-detail-info h3 a:hover{color:var(--accent-h)!important}
body.x13-dark .search-page .box-info .box-info-heading h1 span{color:var(--txt-s)!important}

/* ==================================================================
   PAGINATION
================================================================== */
body.x13-dark .pagination{margin:12px 0!important;padding:0!important}
body.x13-dark .pagination li a{
  background:var(--bg2)!important;color:var(--txt-s)!important;
  border:1px solid var(--bdr)!important;border-radius:4px!important;
  padding:4px 11px!important;transition:all .12s!important;
}
body.x13-dark .pagination li a:hover{
  background:var(--bg-hov)!important;color:var(--accent)!important;border-color:var(--accent)!important;
}
body.x13-dark .pagination li.active a{
  background:var(--accent)!important;color:#fff!important;border-color:var(--accent)!important;font-weight:600!important;
}

/* ==================================================================
   FOOTER
================================================================== */
body.x13-dark footer{
  background:var(--bg2)!important;border:none!important;
  box-shadow:var(--shadow)!important;padding:14px 0!important;
}
body.x13-dark footer a,body.x13-dark footer p{color:var(--txt-m)!important}
body.x13-dark footer a:hover{color:var(--accent)!important}
body.x13-dark .bitcoin{
  background:var(--bg-el)!important;border-radius:var(--radius)!important;padding:6px 14px!important;
}
body.x13-dark .bitcoin-text a{color:var(--txt-m)!important;font-family:var(--mono)!important;font-size:12px!important}
body.x13-dark .scroll-top{
  background:var(--bg-el)!important;border:1px solid var(--bdr)!important;
  color:var(--txt-m)!important;border-radius:50%!important;
}
body.x13-dark .scroll-top:hover{background:var(--bg-hov)!important;color:var(--accent)!important}

/* ==================================================================
   MODAL (redirect warning popup)
================================================================== */
body.x13-dark .modal-content{
  background:var(--bg2)!important;border:1px solid var(--bdr)!important;
  color:var(--txt)!important;border-radius:10px!important;
}
body.x13-dark .modal-header{border-bottom:1px solid var(--bdr)!important}
body.x13-dark .modal-title{color:var(--txt)!important}
body.x13-dark .modal-body p{color:var(--txt-s)!important}
body.x13-dark .modal-header .close{color:var(--txt-m)!important}
body.x13-dark .modal-backdrop{background:rgba(0,0,0,.6)!important}


/* ==================================================================
   LAYOUT: FULL-WIDTH
================================================================== */
body.x13-wide .container{max-width:100%!important;width:calc(100% - 40px)!important;padding:0 20px!important}

/* ==================================================================
   LAYOUT: COMPACT HEADER
================================================================== */
body.x13-compact-hdr .top-bar{padding:1px 0!important}
body.x13-compact-hdr .top-bar-nav li a{padding:2px 10px!important;font-size:11px!important}
body.x13-compact-hdr header{padding:6px 0 0!important}
body.x13-compact-hdr header .clearfix{margin-bottom:4px!important}
body.x13-compact-hdr .logo img{max-height:26px!important}
body.x13-compact-hdr .main-navigation li a{padding:7px 12px!important;font-size:12.5px!important}
body.x13-compact-hdr header nav{margin:0!important}

/* ==================================================================
   LAYOUT: SIDEBAR COLLAPSE
================================================================== */
body.x13-sidebar-collapsed aside.col-3{display:none!important}
body.x13-sidebar-collapsed .col-9{width:100%!important;flex:0 0 100%!important;max-width:100%!important}

/* ==================================================================
   LAYOUT: COMPACT ROWS
================================================================== */
body.x13-compact .table-list tbody td{padding:4px 10px!important;font-size:13px!important;line-height:1.3!important}
body.x13-compact .table-list thead th{padding:6px 10px!important}
body.x13-compact main.container{padding-top:8px!important}
body.x13-compact .featured-list{margin-bottom:10px!important}
body.x13-compact .box-info{margin-bottom:10px!important}
body.x13-compact .banner-box{margin:10px 0!important}

/* ---- Dense mode: maximum information density ---- */
body.x13-dense .top-bar,
body.x13-dense footer,
body.x13-dense header nav,
body.x13-dense .category-name,
body.x13-dense .infohash-box,
body.x13-dense .box-info-detail,
body.x13-dense .banner-box,
body.x13-dense .bitcoin,
body.x13-dense .scroll-top,
body.x13-dense img.descrimg,
body.x13-dense .torrent-image-wrap{display:none!important}

body.x13-dense header{padding:4px 0 0!important}
body.x13-dense header .clearfix{margin-bottom:2px!important}
body.x13-dense .logo img{max-height:22px!important}
body.x13-dense main.container{padding-top:4px!important}

body.x13-dense .table-list tbody td{
  padding:1px 8px!important;margin:0!important;
  font-size:12.5px!important;line-height:1.25!important;
  border-bottom:1px solid var(--border-l,#1a1a1a)!important;
}
body.x13-dense .table-list thead th{
  padding:3px 8px!important;font-size:10px!important;
}
body.x13-dense .table-list .coll-1 a:not(.icon):not(.x13-magnet-link){
  margin-left:0!important;
}
body.x13-dense .table-list .coll-1 .icon{display:none!important}
body.x13-dense .table-list .name .comments{
  padding:0 4px!important;font-size:9px!important;
  margin-left:4px!important;line-height:1.4!important;
}
body.x13-dense .featured-heading{
  padding:5px 12px!important;font-size:12px!important;
}
body.x13-dense .featured-heading strong{font-size:12px!important}
body.x13-dense .featured-list{margin-bottom:4px!important}
body.x13-dense .box-info{margin-bottom:6px!important}
body.x13-dense .box-info .box-info-heading{padding:6px 12px!important}
body.x13-dense .box-info-heading h1{font-size:13px!important}

/* Dense detail page: tighten metadata */
body.x13-dense .torrent-detail-page .list li{padding:3px 10px!important}
body.x13-dense .torrent-detail-page .list li strong{font-size:11px!important;min-width:80px!important}
body.x13-dense .tab-nav li a{padding:6px 12px!important;font-size:12px!important}
body.x13-dense .tab-content{padding:10px!important}


/* ==================================================================
   ENHANCEMENTS: SEED/LEECH COLORING
================================================================== */
body.x13-colors td.coll-2.seeds,body.x13-colors .table-list td .seeds{color:var(--green)!important;font-weight:600!important}
body.x13-colors td.coll-3.leeches{color:var(--red)!important}
body.x13-colors .seeds-high{color:#3fb950!important;font-weight:700!important;text-shadow:0 0 8px rgba(63,185,80,.2)}
body.x13-colors .seeds-med{color:#d29922!important;font-weight:600!important}
body.x13-colors .seeds-low{color:#f85149!important}
body.x13-colors .seeds-dead{color:#484f58!important;font-style:italic!important}

/* ==================================================================
   ENHANCEMENTS: VISITED LINKS
================================================================== */
body.x13-visited .table-list .coll-1 a:visited:not(.icon):not(.x13-magnet-link){
  color:var(--purple)!important;opacity:.65!important;
}

/* ==================================================================
   ENHANCEMENTS: HIDE EXTERNAL LINKS SIDEBAR
================================================================== */
body.x13-hide-footer-links .list-box:has(.list),
body.x13-hide-footer-links .list-box .list{display:none!important}

/* ==================================================================
   MAGNET LINKS (inline on listings)
================================================================== */
.x13-magnet-link{
  display:inline-flex;align-items:center;margin-left:5px;
  color:#3fb950;cursor:pointer;transition:all .12s;
  text-decoration:none!important;vertical-align:middle;
  font-size:13px;opacity:.7;
}
.x13-magnet-link:hover{opacity:1;color:#56d364!important;transform:scale(1.15)}
.x13-magnet-link.x13-fetching{opacity:.4;pointer-events:none}
td.coll-6.dl-magnet{
  padding:0 4px!important;text-align:center!important;width:30px!important;
}
th.coll-6{text-align:center!important;width:30px!important}

/* ==================================================================
   INFOHASH CLICK-TO-COPY
================================================================== */
.x13-hash-copy{cursor:pointer!important;transition:color .12s!important}
.x13-hash-copy:hover{color:var(--accent,#58a6ff)!important}
.x13-hash-copy::after{
  content:' [copy]';font-size:9px;color:var(--txt-m,#6e7681);
  opacity:0;transition:opacity .12s;
}
.x13-hash-copy:hover::after{opacity:1}

/* ==================================================================
   UPLOADER BADGES (inline in tables)
================================================================== */
.x13-badge{
  display:inline-block;font-size:9px;font-weight:700;text-transform:uppercase;
  letter-spacing:.4px;padding:1px 5px;border-radius:3px;margin-right:3px;
  vertical-align:middle;line-height:1.4;
}
.x13-badge-vip{background:rgba(63,185,80,.12);color:#3fb950;border:1px solid rgba(63,185,80,.25)}
.x13-badge-trial{background:rgba(227,179,65,.1);color:#e3b341;border:1px solid rgba(227,179,65,.2)}

/* ==================================================================
   SETTINGS PANEL & OVERLAY
   CRITICAL: pointer-events:none when inactive so page is clickable
================================================================== */
.x13-settings-overlay{
  position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:999998;
  backdrop-filter:blur(3px);opacity:0;pointer-events:none;transition:opacity .2s;
}
.x13-settings-overlay.active{opacity:1;pointer-events:auto}
.x13-settings{
  position:fixed;top:50%;left:50%;
  transform:translate(-50%,-50%) scale(.96);
  background:rgb(24,27,38);color:#e6edf3;border:1px solid #30363d;
  border-radius:12px;width:440px;max-height:85vh;overflow-y:auto;
  z-index:999999;box-shadow:0 20px 70px rgba(0,0,0,.6);
  font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
  opacity:0;pointer-events:none;
  transition:all .25s cubic-bezier(.16,1,.3,1);
}
.x13-settings.active{opacity:1;pointer-events:auto;transform:translate(-50%,-50%) scale(1)}
.x13-settings-hdr{
  display:flex;align-items:center;justify-content:space-between;
  padding:14px 18px;border-bottom:1px solid #30363d;
  position:sticky;top:0;background:rgb(24,27,38);
  border-radius:12px 12px 0 0;z-index:1;
}
.x13-settings-hdr h2{margin:0;font-size:14px;font-weight:600;color:#e6edf3}
.x13-settings-x{
  background:none;border:none;color:#8b949e;font-size:18px;
  cursor:pointer;padding:2px 6px;border-radius:4px;line-height:1;
}
.x13-settings-x:hover{background:#21262d;color:#e6edf3}
.x13-settings-body{padding:4px 18px 16px}
.x13-grp-lbl{
  font-size:9px;font-weight:700;text-transform:uppercase;
  letter-spacing:1px;color:#6e7681;padding:10px 0 3px;
}
.x13-row{
  display:flex;align-items:center;justify-content:space-between;
  padding:7px 0;border-bottom:1px solid #1b2030;
}
.x13-row:last-child{border-bottom:none}
.x13-lbl{font-size:12.5px;color:#e6edf3;font-weight:500}
.x13-desc{font-size:10.5px;color:#6e7681;margin-top:1px}
/* Toggle switch */
.x13-tog{position:relative;width:34px;height:18px;flex-shrink:0;margin-left:10px}
.x13-tog input{opacity:0;width:0;height:0;position:absolute}
.x13-tog .x13-sl{
  position:absolute;inset:0;background:#30363d;border-radius:9px;
  cursor:pointer;transition:.2s;
}
.x13-tog .x13-sl::before{
  content:'';position:absolute;width:12px;height:12px;
  left:3px;bottom:3px;background:#cdd9e5;border-radius:50%;transition:.2s;
}
.x13-tog input:checked+.x13-sl{background:#238636}
.x13-tog input:checked+.x13-sl::before{transform:translateX(16px)}

/* ==================================================================
   FAB
================================================================== */
.x13-fab{
  position:fixed;bottom:16px;right:16px;width:38px;height:38px;
  background:#a42a01;color:#fff;border:none;border-radius:50%;
  font-size:17px;cursor:pointer;z-index:99997;
  box-shadow:0 3px 14px rgba(0,0,0,.4);transition:all .15s;
  display:flex;align-items:center;justify-content:center;
}
.x13-fab:hover{background:#c43301;transform:scale(1.1)}

/* ==================================================================
   TOAST
================================================================== */
.x13-toast{
  position:fixed;bottom:64px;right:16px;
  background:rgb(24,27,38);color:#e6edf3;padding:7px 14px;
  border-radius:6px;border:1px solid #30363d;
  box-shadow:0 6px 24px rgba(0,0,0,.5);z-index:999999;
  font-size:12px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
  opacity:0;transform:translateY(6px);
  transition:all .2s cubic-bezier(.16,1,.3,1);pointer-events:none;
}
.x13-toast.show{opacity:1;transform:translateY(0)}

/* ==================================================================
   QUICK FILTER BAR
================================================================== */
.x13-fbar{display:flex;gap:6px;align-items:center;padding:5px 0;flex-wrap:wrap}
.x13-finp{
  background:rgb(20,23,31);border:1px solid #2d2d2d;color:#e6edf3;
  padding:4px 10px;border-radius:5px;font-size:12px;
  flex:1;min-width:160px;max-width:300px;outline:none;transition:border-color .12s;
}
.x13-finp:focus{border-color:#58a6ff}
.x13-finp::placeholder{color:#6e7681}
.x13-ftag{
  background:rgb(30,34,48);border:1px solid #2d2d2d;color:#8b949e;
  padding:2px 9px;border-radius:10px;font-size:10.5px;
  cursor:pointer;transition:all .12s;white-space:nowrap;user-select:none;
}
.x13-ftag:hover,.x13-ftag.active{
  background:rgba(88,166,255,.12);border-color:#58a6ff;color:#58a6ff;
}

/* ==================================================================
   LAYOUT CLEANUP — declutter & polish
================================================================== */
/* Hide news/announcement box headings */
body.x13-dark div.box-info-heading.clearfix{text-align:center;display:none}

/* Content padding */
body.x13-dark div div p{padding-left:15px}
body.x13-dark div div h2{padding-left:15px}

/* Transparent backgrounds */
body.x13-dark div ul li{background-color:transparent}
body.x13-dark div div h3{background-color:transparent}

/* Hide download button icons */
body.x13-dark span.icon{display:none}

/* File tree indent */
body.x13-dark span.head{padding-left:10px}

/* Center featured headings */
body.x13-dark h3.featured-heading{text-align:center}

/* View All button */
body.x13-dark a.btn.btn-view-all{
  width:600px;background-color:#bf360c;
  padding-top:0;padding-bottom:0;
}

/* Magnet icon color */
body.x13-dark i.flaticon-magnet{color:#388e3c}

/* Hide user role boxes on profile/user pages */
body.x13-dark li.uplo{display:none}
body.x13-dark li.user{display:none}
body.x13-dark li.trial{display:none}
body.x13-dark li.vip{display:none}
body.x13-dark li.mod{display:none}
body.x13-dark li.admin{display:none}

/* Hide dividers and torrent work headings */
body.x13-dark hr.divider{display:none}
body.x13-dark div.torrent-work-heading{display:none}

/* Torrent detail padding */
body.x13-dark div.torrent-work-detail.no-top-radius{padding-left:15px}

/* Hide quote icons */
body.x13-dark i.flaticon-quote-right{display:none}
body.x13-dark i.flaticon-quote-left{display:none}

/* Strip borders everywhere */
body.x13-dark .pagination{background-color:transparent;border-style:none}
body.x13-dark div div ul{background-color:transparent;border-style:none}
body.x13-dark div.col-9.page-content.trending-torrent-explore{border-style:none}
body.x13-dark div.featured-list{border-style:none}
body.x13-dark html{border-style:none}
body.x13-dark ul li a{border-style:none}

/* ==================================================================
   ANIMATIONS & VISUAL FLAIR
================================================================== */

/* ---- Keyframes ---- */
@keyframes x13-fadeIn{from{opacity:0}to{opacity:1}}
@keyframes x13-slideUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
@keyframes x13-slideIn{from{opacity:0;transform:translateX(-10px)}to{opacity:1;transform:translateX(0)}}
@keyframes x13-pulse{0%,100%{box-shadow:0 0 0 0 rgba(164,42,1,.4)}50%{box-shadow:0 0 0 8px rgba(164,42,1,0)}}
@keyframes x13-glow{0%,100%{text-shadow:0 0 4px rgba(63,185,80,.3)}50%{text-shadow:0 0 10px rgba(63,185,80,.6)}}
@keyframes x13-shimmer{0%{background-position:-200% center}100%{background-position:200% center}}
@keyframes x13-spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
@keyframes x13-borderGlow{0%,100%{border-color:rgba(88,166,255,.3)}50%{border-color:rgba(88,166,255,.7)}}

/* ---- Page reveal ---- */
body.x13-dark{animation:x13-fadeIn .25s ease-out}

/* ---- Table rows: staggered entrance ---- */
body.x13-dark .table-list tbody tr{
  animation:x13-slideUp .3s ease-out both;
}
body.x13-dark .table-list tbody tr:nth-child(1){animation-delay:0s}
body.x13-dark .table-list tbody tr:nth-child(2){animation-delay:.02s}
body.x13-dark .table-list tbody tr:nth-child(3){animation-delay:.04s}
body.x13-dark .table-list tbody tr:nth-child(4){animation-delay:.06s}
body.x13-dark .table-list tbody tr:nth-child(5){animation-delay:.08s}
body.x13-dark .table-list tbody tr:nth-child(6){animation-delay:.1s}
body.x13-dark .table-list tbody tr:nth-child(7){animation-delay:.12s}
body.x13-dark .table-list tbody tr:nth-child(8){animation-delay:.14s}
body.x13-dark .table-list tbody tr:nth-child(9){animation-delay:.16s}
body.x13-dark .table-list tbody tr:nth-child(10){animation-delay:.18s}
body.x13-dark .table-list tbody tr:nth-child(n+11){animation-delay:.2s}

/* ---- Row hover: left accent border slide + glow ---- */
body.x13-dark .table-list tbody tr{
  transition:all .15s ease!important;
  border-left:3px solid transparent!important;
}
body.x13-dark .table-list tbody tr:hover{
  border-left:3px solid var(--brand,#a42a01)!important;
  box-shadow:inset 40px 0 80px -40px rgba(164,42,1,.06)!important;
}

/* ---- Movie carousel: lift + glow on hover ---- */
body.x13-dark .banner-box li{
  transition:transform .25s cubic-bezier(.16,1,.3,1),box-shadow .25s ease!important;
}
body.x13-dark .banner-box li:hover{
  transform:translateY(-4px) scale(1.03)!important;
  box-shadow:0 12px 40px rgba(0,0,0,.5),0 0 20px rgba(164,42,1,.15)!important;
}

/* ---- Search box: focus glow ring ---- */
body.x13-dark .search-box .form-control:focus{
  border-color:var(--accent)!important;
  box-shadow:0 0 0 3px rgba(88,166,255,.15),0 0 20px rgba(88,166,255,.08)!important;
  animation:x13-borderGlow 2s ease-in-out infinite!important;
}

/* ---- Nav links: underline slide ---- */
body.x13-dark .main-navigation a{
  position:relative!important;
}
body.x13-dark .main-navigation a::after{
  content:''!important;position:absolute!important;bottom:0!important;left:50%!important;
  width:0!important;height:2px!important;
  background:var(--brand,#a42a01)!important;
  transition:width .25s ease,left .25s ease!important;
}
body.x13-dark .main-navigation a:hover::after,
body.x13-dark .main-navigation .active a::after{
  width:100%!important;left:0!important;
}

/* ---- FAB: pulse heartbeat ---- */
.x13-fab{animation:x13-pulse 2.5s ease-in-out infinite}
.x13-fab:hover{animation:none}

/* ---- High seed glow ---- */
body.x13-colors .seeds-high{
  animation:x13-glow 3s ease-in-out infinite;
}

/* ---- Magnet icon: spin while fetching ---- */
.x13-magnet-link.x13-fetching i{
  animation:x13-spin .8s linear infinite!important;
}

/* ---- Featured heading: shimmer gradient ---- */
body.x13-dark .featured-heading{
  background:linear-gradient(
    90deg,
    var(--bg-el) 0%,var(--bg-el) 40%,
    rgba(164,42,1,.12) 50%,
    var(--bg-el) 60%,var(--bg-el) 100%
  )!important;
  background-size:200% 100%!important;
  animation:x13-shimmer 6s ease-in-out infinite!important;
}

/* ---- Logo hover glow ---- */
body.x13-dark .logo a{transition:filter .3s ease!important}
body.x13-dark .logo a:hover{
  filter:drop-shadow(0 0 8px rgba(248,92,39,.5))!important;
}

/* ---- Sidebar links: slide-in on hover ---- */
body.x13-dark .list-box li a{
  transition:all .15s ease!important;padding-left:10px!important;
}
body.x13-dark .list-box li a:hover{
  padding-left:16px!important;
  color:var(--accent)!important;
}

/* ---- Pagination: lift on hover ---- */
body.x13-dark .pagination li a{
  transition:all .15s ease!important;
}
body.x13-dark .pagination li a:hover{
  transform:translateY(-2px)!important;
  box-shadow:0 4px 12px rgba(0,0,0,.3)!important;
}

/* ---- Detail page tabs: active glow ---- */
body.x13-dark .tab-nav li.active a{
  text-shadow:0 0 12px rgba(88,166,255,.25)!important;
}

/* ---- Box-info entrance ---- */
body.x13-dark .box-info{
  animation:x13-slideUp .35s ease-out both;
}

/* ---- Download buttons: glow on hover ---- */
body.x13-dark .torrent-detail-page ul li>a[href^="magnet:"]:hover{
  box-shadow:0 0 15px rgba(35,134,54,.25)!important;
}
body.x13-dark .torrent-detail-page ul li>a[data-toggle="dropdown"]:hover{
  box-shadow:0 0 15px rgba(88,166,255,.2)!important;
}

/* ---- Toast: spring entrance ---- */
.x13-toast.show{
  animation:x13-slideUp .3s cubic-bezier(.16,1,.3,1)!important;
}

/* ---- Settings panel: scale entrance ---- */
.x13-sett.active{
  animation:x13-fadeIn .2s ease-out!important;
}

/* ---- Comment/detail boxes: hover lift ---- */
body.x13-dark .comment-info .detail{
  transition:transform .15s ease,box-shadow .15s ease!important;
}
body.x13-dark .comment-info .detail:hover{
  transform:translateY(-2px)!important;
  box-shadow:0 6px 20px rgba(0,0,0,.4)!important;
}

/* ---- Torrent image hover: float + glow ---- */
body.x13-dark .torrent-image-wrap{
  transition:transform .3s cubic-bezier(.16,1,.3,1),box-shadow .3s ease!important;
}
body.x13-dark .torrent-image-wrap:hover{
  transform:translateY(-4px) scale(1.02)!important;
  box-shadow:0 12px 30px rgba(0,0,0,.5),0 0 15px rgba(164,42,1,.1)!important;
}

/* ---- Scroll-to-top button ---- */
body.x13-dark .scroll-top{
  transition:all .2s ease!important;
}
body.x13-dark .scroll-top:hover{
  transform:translateY(-3px)!important;
  box-shadow:0 4px 15px rgba(88,166,255,.2)!important;
}
`;

    /* =========================================================================
       INJECT CSS AT DOCUMENT-START
    ========================================================================= */
    (function inject() {
        const t = document.head || document.documentElement;
        if (!t) return document.addEventListener('DOMContentLoaded', inject);
        const s = document.createElement('style');
        s.id = 'x13-css';
        s.textContent = CSS;
        t.appendChild(s);

        // Anti-FOUC: hide page until body classes are applied
        const af = document.createElement('style');
        af.id = 'x13-antifouc';
        af.textContent = 'html{visibility:hidden!important}';
        t.appendChild(af);
        // Safety: never leave page hidden longer than 500ms
        setTimeout(() => { if (af.parentNode) af.remove(); }, 500);
    })();

    /* =========================================================================
       EARLY BODY CLASS APPLICATION — fires as soon as <body> exists
       This eliminates the flash of unstyled content (FOUC)
    ========================================================================= */
    function applyClasses() {
        const map = {
            'x13-dark':'darkTheme', 'x13-wide':'fullWidth',
            'x13-compact-hdr':'compactHeader', 'x13-sidebar-collapsed':'sidebarCollapsed',
            'x13-compact':'compactRows', 'x13-dense':'denseMode', 'x13-colors':'colorSeeds',
            'x13-visited':'highlightVisited', 'x13-hide-footer-links':'hideFooterLinks',
        };
        for (const [c, k] of Object.entries(map))
            document.body.classList.toggle(c, cfg(k));
        // Reveal the page — CSS is now matching
        const af = document.getElementById('x13-antifouc');
        if (af) af.remove();
    }

    // Apply classes at the earliest possible moment
    (function earlyApply() {
        if (document.body) return applyClasses();
        // Body doesn't exist yet — watch for it
        const obs = new MutationObserver(() => {
            if (document.body) {
                obs.disconnect();
                applyClasses();
            }
        });
        obs.observe(document.documentElement, { childList: true });
    })();

    /* =========================================================================
       MAIN INIT
    ========================================================================= */
    let ready = false;
    function init() {
        if (ready) return;
        ready = true;
        // Classes already applied by earlyApply, but ensure they're set
        if (document.body) applyClasses();
        if (cfg('removeAds'))      removeAds();
        if (cfg('cleanupDOM'))     cleanupDOM();
        if (cfg('colorSeeds'))     colorizeSeeds();
        if (cfg('uploaderBadges')) addUploaderBadges();
        if (cfg('magnetLinks'))   addMagnetLinks();
        if (cfg('moreTrackers'))  enrichTrackers();
        if (cfg('infohashCopy'))   setupInfohashCopy();
        buildToast();
        buildSettings();
        buildFAB();
        if (cfg('quickFilters'))   setupFilters();

        // Observe for dynamically injected ads
        new MutationObserver(ms => {
            for (const m of ms) for (const n of m.addedNodes) {
                if (n.nodeType === 1) killAdNode(n);
            }
        }).observe(document.body, { childList: true, subtree: true });
    }
    if (document.body) init();
    else document.addEventListener('DOMContentLoaded', init);

    /* =========================================================================
       AD REMOVAL
    ========================================================================= */
    function removeAds() {
        // Remove known ad elements by selector
        ['[id*="befeaeb"]','[id*="baeedf"]','[id*="popMag"]',
         'iframe[style*="position: absolute"][style*="top: -"]',
         'a[style*="display: none"][style*="visibility: hidden"]',
         'link[rel="dns-prefetch"]',
        ].forEach(s => document.querySelectorAll(s).forEach(e => e.remove()));

        // Remove banner containers linking to blocked hosts
        document.querySelectorAll('a').forEach(a => {
            const h = a.getAttribute('href') || '';
            if (!blockedHosts.some(d => h.includes(d))) return;
            let box = a.closest('center') || a.closest('div[style*="text-align"]');
            if (box) {
                let sib = box.nextElementSibling;
                while (sib && sib.tagName === 'BR') { const n = sib.nextElementSibling; sib.remove(); sib = n; }
                box.remove();
            } else a.remove();
        });

        // Clean orphan <center> tags in main content
        document.querySelectorAll('main center').forEach(el => {
            if (!el.textContent.trim() && !el.querySelector('table,img:not([src*="lime"])')) el.remove();
        });

        // Block popunder
        const _wo = window.open;
        window.open = function(url) {
            if (url && isBlocked(url)) return null;
            return _wo.apply(this, arguments);
        };

        // Block clicks ONLY on ad-domain links
        document.addEventListener('click', e => {
            const a = e.target.closest('a');
            if (!a) return;
            if (isBlocked(a.getAttribute('href') || '')) { e.preventDefault(); e.stopPropagation(); }
        }, true);
    }

    function killAdNode(node) {
        if (!cfg('removeAds') || !node.outerHTML) return;
        if (blockedHosts.some(h => node.outerHTML.includes(h))) { node.remove(); return; }
        if (node.tagName === 'IFRAME' && (node.getAttribute('style') || '').includes('top: -')) node.remove();
    }

    /* =========================================================================
       DOM CLEANUP
       Removes empty spacer <li> elements and hidden <div> spam that cause
       ~200px dead space in the download button area on detail pages.
    ========================================================================= */
    function cleanupDOM() {
        // Kill empty spacer <li style="margin-top:0px;"> (18+ on detail pages)
        document.querySelectorAll('li[style*="margin-top"]').forEach(li => {
            if (!li.textContent.trim() && !li.children.length) li.remove();
        });
        // Kill empty hidden divs (20+ on detail pages)
        document.querySelectorAll('.torrent-detail-page div[style*="display: none"], .torrent-detail-page div[style*="display:none"]').forEach(d => {
            if (!d.textContent.trim() && !d.children.length) d.remove();
        });
        // Collapse mobile-menu duplicate on desktop
        const mob = document.querySelector('.mobile-menu');
        if (mob && window.innerWidth > 768) mob.style.display = 'none';
    }

    /* =========================================================================
       SEED/LEECH COLORING
    ========================================================================= */
    function colorizeSeeds() {
        document.querySelectorAll('.table-list td.coll-2').forEach(el => {
            const v = parseInt(el.textContent);
            el.classList.remove('seeds-high','seeds-med','seeds-low','seeds-dead');
            if (isNaN(v) || v === 0) el.classList.add('seeds-dead');
            else if (v >= 50) el.classList.add('seeds-high');
            else if (v >= 10) el.classList.add('seeds-med');
            else el.classList.add('seeds-low');
        });
    }

    /* =========================================================================
       UPLOADER ROLE BADGES
       Adds colored [VIP] / [TRIAL] badges inline in the uploader column
    ========================================================================= */
    function addUploaderBadges() {
        document.querySelectorAll('.table-list td.coll-5').forEach(cell => {
            if (cell.querySelector('.x13-badge')) return;
            let cls = '';
            if (cell.classList.contains('vip')) cls = 'vip';
            else if (cell.classList.contains('trial-uploader')) cls = 'trial';
            if (!cls) return;
            const badge = document.createElement('span');
            badge.className = 'x13-badge x13-badge-' + cls;
            badge.textContent = cls.toUpperCase();
            cell.prepend(badge);
        });
    }

    /* =========================================================================
       MAGNET LINKS — inline magnet download icons on listing pages
       Based on "1337X - Magnet/Torrent links everywhere" by NotNeo
    ========================================================================= */
    function addMagnetLinks() {
        // Only on pages with torrent tables (not detail pages)
        const tables = document.querySelectorAll('table.table-list');
        if (!tables.length) return;

        tables.forEach(table => {
            // Add header column after name
            const hdrRow = table.querySelector('thead tr');
            if (hdrRow && !hdrRow.querySelector('.coll-6')) {
                const th = document.createElement('th');
                th.className = 'coll-6';
                th.style.textAlign = 'center';
                th.textContent = 'dl';
                const nameCol = hdrRow.querySelector('.coll-1.name, .name');
                if (nameCol) nameCol.after(th);
                else hdrRow.appendChild(th);
            }

            // Add magnet icon per row
            table.querySelectorAll('tbody tr').forEach(row => {
                if (row.querySelector('.dl-magnet')) return;
                const nameCell = row.querySelector('.coll-1, .name');
                const torrentLink = nameCell?.querySelector('a[href*="/torrent/"]');
                if (!torrentLink) return;

                const td = document.createElement('td');
                td.className = 'coll-6 dl-magnet';

                const a = document.createElement('a');
                a.href = '#';
                a.className = 'x13-magnet-link';
                a.title = 'Download via magnet';
                a.innerHTML = '<i class="flaticon-magnet"></i>';

                a.addEventListener('click', async e => {
                    e.preventDefault();
                    e.stopPropagation();
                    // If already resolved, navigate
                    if (a.dataset.magnetUrl) {
                        window.location.href = a.dataset.magnetUrl;
                        return;
                    }
                    a.classList.add('x13-fetching');
                    a.title = 'Fetching magnet link...';
                    try {
                        const resp = await fetch(torrentLink.href);
                        const html = await resp.text();
                        const doc = new DOMParser().parseFromString(html, 'text/html');
                        const magnetEl = doc.querySelector('a[href^="magnet:?"]');
                        if (magnetEl) {
                            let magnetUrl = magnetEl.getAttribute('href').replace(/&amp;/g, '&');
                            // Append extra trackers if available
                            if (_extraTrackers) magnetUrl += _extraTrackers;
                            a.dataset.magnetUrl = magnetUrl;
                            a.href = magnetUrl;
                            a.title = 'Download via magnet';
                            window.location.href = magnetUrl;
                        } else {
                            a.title = 'Magnet not found';
                            showToast('Magnet link not found');
                        }
                    } catch (err) {
                        a.title = 'Fetch failed';
                        showToast('Failed to fetch magnet');
                    }
                    a.classList.remove('x13-fetching');
                });

                td.appendChild(a);
                const nameCol = row.querySelector('.coll-1, .name');
                if (nameCol) nameCol.after(td);
                else row.appendChild(td);
            });
        });
    }

    /* =========================================================================
       MORE TRACKERS — fetches live trackers and appends to all magnet links
       Based on "MOREtrackers" by metinsanli
    ========================================================================= */
    let _extraTrackers = '';

    function enrichTrackers() {
        const xhr = new XMLHttpRequest();
        xhr.open('GET', 'https://newtrackon.com/api/live', true);
        xhr.withCredentials = false;
        xhr.onreadystatechange = function() {
            if (xhr.readyState !== XMLHttpRequest.DONE) return;
            if (xhr.status >= 200 && xhr.status < 400) {
                const trackers = xhr.responseText.split('\n')
                    .filter(t => t.trim())
                    .map(t => '&tr=' + encodeURIComponent(t.trim()))
                    .join('');
                _extraTrackers = trackers;
                // Enrich existing magnet links on the page (detail pages)
                document.querySelectorAll('a[href^="magnet:"]').forEach(a => {
                    if (!a.dataset.enriched) {
                        a.href += trackers;
                        a.dataset.enriched = '1';
                    }
                });
            } else {
                console.warn('1337x Enhanced: Could not fetch extra trackers');
            }
        };
        xhr.send();
    }

    /* =========================================================================
       INFOHASH CLICK-TO-COPY
    ========================================================================= */
    function setupInfohashCopy() {
        document.querySelectorAll('.infohash-box span').forEach(span => {
            const hash = span.textContent.trim();
            if (!hash || hash.length < 20) return;
            span.classList.add('x13-hash-copy');
            span.title = 'Click to copy';
            span.addEventListener('click', () => {
                GM_setClipboard(hash);
                const orig = span.textContent;
                span.textContent = 'Copied!';
                showToast('Infohash copied');
                setTimeout(() => span.textContent = orig, 1500);
            });
        });
    }

    /* =========================================================================
       QUICK FILTER BAR
    ========================================================================= */
    function setupFilters() {
        const table = document.querySelector('.table-list');
        if (!table) return;
        const bar = document.createElement('div');
        bar.className = 'x13-fbar';
        const inp = document.createElement('input');
        inp.type = 'text'; inp.className = 'x13-finp'; inp.placeholder = 'Filter\u2026';
        bar.appendChild(inp);
        [{l:'Seeds > 0',f:'seeds'},{l:'< 1 GB',f:'small'},{l:'< 5 GB',f:'med'}].forEach(t => {
            const tag = document.createElement('span');
            tag.className = 'x13-ftag'; tag.textContent = t.l; tag.dataset.f = t.f;
            bar.appendChild(tag);
        });
        table.parentElement.insertBefore(bar, table);
        const act = new Set();
        function gb(t) {
            const m = t.match(/([\d.]+)\s*(KB|MB|GB|TB)/i);
            if (!m) return 0; const v = parseFloat(m[1]);
            return ({TB:v*1024,GB:v,MB:v/1024,KB:v/1048576})[m[2].toUpperCase()] || 0;
        }
        function run() {
            const q = inp.value.toLowerCase();
            document.querySelectorAll('.table-list tbody tr').forEach(row => {
                const name = (row.querySelector('.coll-1')?.textContent||'').toLowerCase();
                const seeds = parseInt(row.querySelector('.coll-2')?.textContent)||0;
                const sz = gb(row.querySelector('.coll-4')?.textContent||'');
                let ok = true;
                if (q && !name.includes(q)) ok = false;
                if (act.has('seeds') && seeds===0) ok = false;
                if (act.has('small') && sz>=1) ok = false;
                if (act.has('med') && sz>=5) ok = false;
                row.style.display = ok ? '' : 'none';
            });
        }
        inp.addEventListener('input', run);
        bar.querySelectorAll('.x13-ftag').forEach(tag => {
            tag.addEventListener('click', () => {
                const f = tag.dataset.f;
                if (act.has(f)) { act.delete(f); tag.classList.remove('active'); }
                else {
                    if (f==='small'||f==='med') ['small','med'].forEach(s => { if(s!==f){act.delete(s);bar.querySelector(`[data-f="${s}"]`)?.classList.remove('active');} });
                    act.add(f); tag.classList.add('active');
                }
                run();
            });
        });
    }

    /* =========================================================================
       SETTINGS PANEL
    ========================================================================= */
    const FEATS = [
        { g:'Appearance', i:[
            {k:'darkTheme',       l:'Dark Theme',        d:'Deep dark color scheme'},
            {k:'fullWidth',       l:'Full-Width Layout',d:'Use entire browser width'},
            {k:'compactHeader',   l:'Compact Header',   d:'Reduce header vertical space'},
            {k:'sidebarCollapsed',l:'Collapse Sidebar', d:'Hide right sidebar'},
            {k:'compactRows',     l:'Compact Rows',     d:'Tighter table spacing'},
            {k:'denseMode',       l:'Dense Mode',       d:'Zero-padding rows, hide nav/footer/images'},
            {k:'hideFooterLinks', l:'Hide Ext. Links',  d:'Remove "1337x Links" sidebar'},
        ]},
        { g:'Enhancements', i:[
            {k:'removeAds',       l:'Remove Ads',        d:'Block ads, popups, trackers'},
            {k:'cleanupDOM',      l:'Clean Up DOM',      d:'Remove empty spacers on detail pages'},
            {k:'colorSeeds',      l:'Color-Code Seeds',  d:'Green/yellow/red seed counts'},
            {k:'uploaderBadges',  l:'Uploader Badges',   d:'Show VIP/Trial badges on uploaders'},
            {k:'highlightVisited',l:'Visited Links',     d:'Dim already-clicked torrents'},
            {k:'magnetLinks',     l:'Magnet Links',      d:'Magnet download icons on listing pages'},
            {k:'moreTrackers',    l:'More Trackers',     d:'Inject extra live trackers into magnets'},
            {k:'infohashCopy',    l:'Infohash Copy',     d:'Click infohash to copy'},
            {k:'quickFilters',    l:'Quick Filters',     d:'Text + tag filters above tables'},
        ]},
    ];

    let _panel, _overlay;
    function buildSettings() {
        _overlay = document.createElement('div');
        _overlay.className = 'x13-settings-overlay';
        _overlay.addEventListener('click', closeSett);
        document.body.appendChild(_overlay);

        _panel = document.createElement('div');
        _panel.className = 'x13-settings';

        const hdr = document.createElement('div');
        hdr.className = 'x13-settings-hdr';
        const t = document.createElement('h2'); t.textContent = '1337x Enhanced'; hdr.appendChild(t);
        const x = document.createElement('button'); x.className = 'x13-settings-x'; x.textContent = '\u2715'; x.addEventListener('click', closeSett); hdr.appendChild(x);
        _panel.appendChild(hdr);

        const body = document.createElement('div');
        body.className = 'x13-settings-body';

        FEATS.forEach(g => {
            const grp = document.createElement('div');
            const gl = document.createElement('div'); gl.className = 'x13-grp-lbl'; gl.textContent = g.g; grp.appendChild(gl);
            g.i.forEach(item => {
                const row = document.createElement('div'); row.className = 'x13-row';
                const info = document.createElement('div');
                const nm = document.createElement('div'); nm.className = 'x13-lbl'; nm.textContent = item.l; info.appendChild(nm);
                if (item.d) { const d = document.createElement('div'); d.className = 'x13-desc'; d.textContent = item.d; info.appendChild(d); }
                row.appendChild(info);
                const tog = document.createElement('label'); tog.className = 'x13-tog';
                const cb = document.createElement('input'); cb.type = 'checkbox'; cb.checked = cfg(item.k);
                cb.addEventListener('change', () => { setCfg(item.k, cb.checked); showToast(item.l+': '+(cb.checked?'ON':'OFF')); });
                const sl = document.createElement('span'); sl.className = 'x13-sl';
                tog.appendChild(cb); tog.appendChild(sl); row.appendChild(tog); grp.appendChild(row);
            });
            body.appendChild(grp);
        });

        // Reload btn
        const rr = document.createElement('div'); rr.style.cssText='padding:12px 0 4px;text-align:center';
        const rb = document.createElement('button');
        rb.textContent = 'Reload to Apply';
        rb.style.cssText = 'background:#a42a01;color:#fff;border:none;padding:6px 20px;border-radius:5px;font-size:11.5px;font-weight:600;cursor:pointer';
        rb.addEventListener('click', () => location.reload());
        rb.addEventListener('mouseenter', () => rb.style.background='#c43301');
        rb.addEventListener('mouseleave', () => rb.style.background='#a42a01');
        rr.appendChild(rb); body.appendChild(rr);

        const ver = document.createElement('div');
        ver.style.cssText='text-align:center;padding:5px 0 0;font-size:9.5px;color:#484f58';
        ver.textContent='v2.5.0';
        body.appendChild(ver);

        _panel.appendChild(body);
        document.body.appendChild(_panel);
    }
    function openSett()  { _overlay?.classList.add('active'); _panel?.classList.add('active'); }
    function closeSett() { _overlay?.classList.remove('active'); _panel?.classList.remove('active'); }

    /* =========================================================================
       FAB + TOAST + HINT
    ========================================================================= */
    function buildFAB() {
        const fab = document.createElement('button');
        fab.className = 'x13-fab'; fab.textContent = '\u2699'; fab.title = 'Settings (,)';
        fab.addEventListener('click', e => {
            e.preventDefault(); e.stopPropagation();
            _panel?.classList.contains('active') ? closeSett() : openSett();
        });
        document.body.appendChild(fab);
    }

    let _toast, _tt;
    function buildToast() {
        _toast = document.createElement('div');
        _toast.className = 'x13-toast';
        document.body.appendChild(_toast);
    }
    function showToast(msg, ms=2200) {
        if (!_toast) return;
        clearTimeout(_tt); _toast.textContent = msg; _toast.classList.add('show');
        _tt = setTimeout(() => _toast.classList.remove('show'), ms);
    }

    /* =========================================================================
       TAMPERMONKEY MENU
    ========================================================================= */
    GM_registerMenuCommand('1337x Enhanced Settings', openSett);

})();