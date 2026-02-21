// ==UserScript==
// @name         pfSense pfBlockerNG Ultimate Toolkit
// @namespace    https://github.com/SysAdminDoc
// @version      3.4.1
// @description  Ultimate pfBlockerNG toolkit: Presets, collapsible groups, search/filter, progress tracking, export/import, URL health check, duplicate detection, memory estimator. 19 groups, 160+ blocklists.
// @author       SysAdminDoc, Gemini, Claude
// @match        *://192.168.1.1/pfblockerng/*
// @match        *://192.168.1.1/*
// @grant        GM_addStyle
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @grant        GM.setValue
// @grant        GM.getValue
// @grant        GM.deleteValue
// @grant        unsafeWindow
// @require      https://code.jquery.com/jquery-3.5.1.min.js
// @run-at       document-start
// @license      MIT
// ==/UserScript==

/* global GM_setValue, GM_getValue, GM_deleteValue, GM_addStyle, jQuery, unsafeWindow */

// =========================================================================
// IMMEDIATE AUTO-CONFIRM - Runs BEFORE anything else at document-start
// Must be outside main IIFE to execute immediately
// =========================================================================
(function() {
    'use strict';

    // Use unsafeWindow to access the REAL page window, bypassing userscript sandbox
    const realWindow = (typeof unsafeWindow !== 'undefined') ? unsafeWindow : window;

    if (window.location.pathname.includes('/pfblockerng/pfblockerng_log.php')) {
        try {
            // Use hardcoded keys since CONFIG isn't defined yet
            const state = JSON.parse(localStorage.getItem('pfb_log_clear_state'));
            const autoStart = localStorage.getItem('pfb_log_auto_start_pending') === 'true';

            if ((state && state.running) || autoStart) {
                // Store original confirm
                const originalConfirm = realWindow.confirm;

                // Override confirm on the REAL window object (page context)
                realWindow.confirm = function(msg) {
                    console.log('[pfBlockerNG Toolkit] Auto-confirmed popup:', msg);
                    return true;
                };

                // Also try to override on window in case unsafeWindow doesn't work
                window.confirm = function(msg) {
                    console.log('[pfBlockerNG Toolkit] Auto-confirmed (sandbox):', msg);
                    return true;
                };

                console.log('[pfBlockerNG Toolkit] ✓ Auto-confirm ENABLED');
            }
        } catch (e) {
            console.error('[pfBlockerNG Toolkit] Auto-confirm setup error:', e);
        }
    }
})();

// =========================================================================
// MAIN SCRIPT
// =========================================================================
(function($) {
    'use strict';

    // =========================================================================
    // CONFIGURATION
    // =========================================================================
    const CONFIG = {
        // URL Paths
        BASE_URL_PATH: '/pfblockerng/',
        get ALERTS_PAGE() { return `${this.BASE_URL_PATH}pfblockerng_alerts.php`; },
        get LOG_PAGE() { return `${this.BASE_URL_PATH}pfblockerng_log.php`; },
        get CATEGORY_PATH() { return `${this.BASE_URL_PATH}pfblockerng_category.php`; },
        get EDIT_PATH() { return `${this.BASE_URL_PATH}pfblockerng_category_edit.php`; },
        get REDIRECT_URL() { return `https://${window.location.host}${this.ALERTS_PAGE}?view=unified`; },

        // Timing
        TOAST_DURATION: 3000,
        TOAST_DURATION_LONG: 5000,
        FILTER_DEBOUNCE_MS: 50,
        TRASH_CLICK_DELAY_MS: 250,
        REDIRECT_DELAY_MS: 2000,

        // Storage Keys
        STATE_KEY: 'pfb_log_clear_state',
        START_FLAG_KEY: 'pfb_log_auto_start_pending',
        KEY_PREFIX: 'pfb_toolkit_',
        get KEY_FILTER_STATE() { return `${this.KEY_PREFIX}filter_state_v2`; },
        get KEY_HIDDEN_ITEMS() { return `${this.KEY_PREFIX}hidden_items_v2`; },
        get KEY_HIDDEN_DOMAINS() { return `${this.KEY_PREFIX}hidden_domains_v1`; },
        get KEY_PANEL_POSITION() { return `${this.KEY_PREFIX}panel_position_v1`; },
        get KEY_PANEL_COLLAPSED() { return `${this.KEY_PREFIX}panel_collapsed_v1`; },
        get KEY_ACTIVE_TAB() { return `${this.KEY_PREFIX}active_tab_v1`; },
        get KEY_CONDENSE_VIEW() { return `${this.KEY_PREFIX}condense_view_v1`; },
        AUTOMATION_CONFIG_KEY: 'pfSenseAutomationConfig',
        FILL_GROUP_KEY: 'pfbGroupToFill',
        FILL_DATA_KEY: 'pfbGroupData',
        PFB_QUEUE_KEY: 'PFB_QUEUE',
        SUCCESS_FLAG_KEY: 'pfbAutoSaveSuccess',
        PROGRESS_KEY: 'pfbAutomationProgress',
        EXPANDED_GROUPS_KEY: 'pfbExpandedGroups',
        URL_HEALTH_CACHE_KEY: 'pfbUrlHealthCache',

        // Feature Settings
        URL_HEALTH_CACHE_HOURS: 24,
        HEALTH_CHECK_TIMEOUT_MS: 10000,
        ESTIMATED_DOMAINS_PER_LIST: {
            'HaGezi_Ultimate': 350000,
            'HaGezi_ProPlus': 200000,
            'HaGezi_Pro': 120000,
            'OISD_Full': 400000,
            'OISD_Big_Domains': 300000,
            '1Hosts_Xtra': 250000,
            'StevenBlack_Unified': 170000,
            'default': 15000
        }
    };

    // =========================================================================
    // BLOCKLIST DEFINITIONS - Organized by Category for Better Management
    // Updated: January 2026 - Comprehensive pfBlockerNG DNSBL Collection
    // =========================================================================
    const BLOCKLIST_DEFAULTS = {
        groups: {
            // =================================================================
            // COMPREHENSIVE LISTS (Pick 1-2 - These overlap significantly)
            // =================================================================
            "Comprehensive": {
                name: "DNSBL_Comprehensive", type: "dnsbl",
                description: "Major unified blocklists - Pick 1-2 to avoid overlap",
                lists: [
                    ["https://raw.githubusercontent.com/SysAdminDoc/HOSTShield/refs/heads/main/AdsTrackingAnalytics.txt", "HOSTShield_Ads"],
                    ["https://raw.githubusercontent.com/SysAdminDoc/HOSTShield/refs/heads/main/AdobeHosts.txt", "HOSTShield_Adobe"],
                    ["https://raw.githubusercontent.com/SysAdminDoc/HOSTShield/refs/heads/main/Apple.txt", "HOSTShield_Apple"],
                    ["https://raw.githubusercontent.com/SysAdminDoc/HOSTShield/refs/heads/main/Brave.txt", "HOSTShield_Brave"],
                    ["https://raw.githubusercontent.com/SysAdminDoc/HOSTShield/refs/heads/main/Microsoft.txt", "HOSTShield_Microsoft"],
                    ["https://cdn.jsdelivr.net/gh/hagezi/dns-blocklists@latest/hosts/hoster.txt", "HaGezi_BadwareHoster"],
                    ["https://cdn.jsdelivr.net/gh/hagezi/dns-blocklists@latest/hosts/popupads.txt", "HaGezi_PopupAds"],
                    ["https://cdn.jsdelivr.net/gh/hagezi/dns-blocklists@latest/hosts/dyndns.txt", "HaGezi_DynDNS"],
                    ["https://raw.githubusercontent.com/nextdns/ddns-domains/main/suffixes", "NextDNS_DDNS"],
                    // HaGeZi Native Trackers
                    ["https://cdn.jsdelivr.net/gh/hagezi/dns-blocklists@latest/hosts/native.amazon.txt", "Native_Amazon"],
                    ["https://cdn.jsdelivr.net/gh/hagezi/dns-blocklists@latest/hosts/native.apple.txt", "Native_Apple"],
                    ["https://cdn.jsdelivr.net/gh/hagezi/dns-blocklists@latest/hosts/native.huawei.txt", "Native_Huawei"],
                    ["https://cdn.jsdelivr.net/gh/hagezi/dns-blocklists@latest/hosts/native.lgwebos.txt", "Native_LG_WebOS"],
                    ["https://cdn.jsdelivr.net/gh/hagezi/dns-blocklists@latest/hosts/native.oppo-realme.txt", "Native_Oppo_Realme"],
                    ["https://cdn.jsdelivr.net/gh/hagezi/dns-blocklists@latest/hosts/native.roku.txt", "Native_Roku"],
                    ["https://cdn.jsdelivr.net/gh/hagezi/dns-blocklists@latest/hosts/native.samsung.txt", "Native_Samsung"],
                    ["https://cdn.jsdelivr.net/gh/hagezi/dns-blocklists@latest/hosts/native.tiktok.txt", "Native_TikTok"],
                    ["https://cdn.jsdelivr.net/gh/hagezi/dns-blocklists@latest/hosts/native.tiktok.extended.txt", "Native_TikTok_Ext"],
                    ["https://cdn.jsdelivr.net/gh/hagezi/dns-blocklists@latest/hosts/native.vivo.txt", "Native_Vivo"],
                    ["https://cdn.jsdelivr.net/gh/hagezi/dns-blocklists@latest/hosts/native.winoffice.txt", "Native_WinOffice"],
                    ["https://cdn.jsdelivr.net/gh/hagezi/dns-blocklists@latest/hosts/native.xiaomi.txt", "Native_Xiaomi"],
                    // NextDNS Native Tracking
                    ["https://raw.githubusercontent.com/nextdns/native-tracking-domains/main/domains/alexa", "NextDNS_Alexa"],
                    ["https://raw.githubusercontent.com/nextdns/native-tracking-domains/main/domains/apple", "NextDNS_Apple"],
                    ["https://raw.githubusercontent.com/nextdns/native-tracking-domains/main/domains/huawei", "NextDNS_Huawei"],
                    ["https://raw.githubusercontent.com/nextdns/native-tracking-domains/main/domains/roku", "NextDNS_Roku"],
                    ["https://raw.githubusercontent.com/nextdns/native-tracking-domains/main/domains/samsung", "NextDNS_Samsung"],
                    ["https://raw.githubusercontent.com/nextdns/native-tracking-domains/main/domains/sonos", "NextDNS_Sonos"],
                    ["https://raw.githubusercontent.com/nextdns/native-tracking-domains/main/domains/windows", "NextDNS_Windows"],
                    ["https://raw.githubusercontent.com/nextdns/native-tracking-domains/main/domains/xiaomi", "NextDNS_Xiaomi"],
                    // Perflyst Device Lists
                    ["https://raw.githubusercontent.com/Perflyst/PiHoleBlocklist/master/android-tracking.txt", "Perflyst_Android"],
                    ["https://raw.githubusercontent.com/Perflyst/PiHoleBlocklist/master/SmartTV.txt", "Perflyst_SmartTV"],
                    ["https://raw.githubusercontent.com/Perflyst/PiHoleBlocklist/master/AmazonFireTV.txt", "Perflyst_FireTV"],
                    ["https://v.firebog.net/hosts/Easyprivacy.txt", "EasyPrivacy_Hosts"],
                    ["https://easylist.to/easylist/easyprivacy.txt", "EasyPrivacy_Orig"],
                    ["https://s3.amazonaws.com/lists.disconnect.me/simple_tracking.txt", "Disconnect_Tracking"],
                    ["https://hostfiles.frogeye.fr/firstparty-trackers-hosts.txt", "Frogeye_1stParty"],
                    ["https://hostfiles.frogeye.fr/multiparty-trackers-hosts.txt", "Frogeye_MultiParty"],
                    ["https://raw.githubusercontent.com/nextdns/cname-cloaking-blocklist/master/domains", "NextDNS_CNAME"],
                    ["https://raw.githubusercontent.com/AdguardTeam/cname-trackers/master/data/combined_disguised_trackers.txt", "AdGuard_CNAME"],
                    ["https://gitlab.com/quidsup/notrack-blocklists/raw/master/notrack-blocklist.txt", "NoTrack_Tracking"],
                    ["https://raw.githubusercontent.com/crazy-max/WindowsSpyBlocker/master/data/hosts/spy.txt", "Windows_SpyBlocker"],
                    ["https://raw.githubusercontent.com/FadeMind/hosts.extras/master/add.2o7Net/hosts", "FadeMind_2o7"],
                    ["https://raw.githubusercontent.com/matomo-org/referrer-spam-blacklist/master/spammers.txt", "Matomo_ReferrerSpam"],
                    ["https://v.firebog.net/hosts/static/w3kbl.txt", "W3KBL"],
                    ["https://adaway.org/hosts.txt", "AdAway"],
                    ["https://v.firebog.net/hosts/AdguardDNS.txt", "AdGuard_DNS"],
                    ["https://adguardteam.github.io/AdGuardSDNSFilter/Filters/filter.txt", "AdGuard_SDNS"],
                    ["https://v.firebog.net/hosts/Easylist.txt", "EasyList_Hosts"],
                    ["https://v.firebog.net/hosts/Prigent-Ads.txt", "Prigent_Ads"],
                    ["https://v.firebog.net/hosts/Admiral.txt", "Admiral_AntiAdblock"],
                    ["https://pgl.yoyo.org/adservers/serverlist.php?hostformat=hosts&showintro=0&mimetype=plaintext", "Yoyo_AdServers"],
                    ["https://raw.githubusercontent.com/anudeepND/blacklist/master/adservers.txt", "Anudeep_AdServers"],
                    ["https://raw.githubusercontent.com/anudeepND/youtubeadsblacklist/master/domainlist.txt", "YouTube_Ads"],
                    ["https://s3.amazonaws.com/lists.disconnect.me/simple_ad.txt", "Disconnect_Ads"],
                    ["https://www.github.developerdan.com/hosts/lists/ads-and-tracking-extended.txt", "DevDan_AdsTracking"],
                    ["https://raw.githubusercontent.com/bigdargon/hostsVN/master/hosts", "BigDargon_HostsVN"],
                    ["https://raw.githubusercontent.com/PolishFiltersTeam/KADhosts/master/KADhosts.txt", "KAD_Hosts"],
                    ["https://paulgb.github.io/BarbBlock/blacklists/hosts-file.txt", "BarbBlock"],
                    ["https://raw.githubusercontent.com/jdlingyu/ad-wars/master/hosts", "JDlingyu_AdWars"],
                    ["https://raw.githubusercontent.com/Yhonay/antipopads/master/hosts", "Antipopads"],
                    ["https://raw.githubusercontent.com/FadeMind/hosts.extras/master/UncheckyAds/hosts", "FadeMind_Unchecky"],
                    // HaGeZi - HIGHLY RECOMMENDED (Best maintained)
                    ["https://cdn.jsdelivr.net/gh/hagezi/dns-blocklists@latest/hosts/ultimate.txt", "HaGezi_Ultimate"],
                    // OISD - Excellent comprehensive list
                    ["https://hosts.oisd.nl/", "OISD_Full"],
                    // StevenBlack Unified
                    ["https://raw.githubusercontent.com/StevenBlack/hosts/master/hosts", "StevenBlack_Unified"],
                    // NoTracking
                    ["https://raw.githubusercontent.com/notracking/hosts-blocklists/master/hostnames.txt", "NoTracking_Hosts"],
                    // Others
                    ["https://winhelp2002.mvps.org/hosts.txt", "MVPS_Hosts"],
                    ["https://someonewhocares.org/hosts/zero/hosts", "SomeoneWhoCares"],
                    ["https://cdn.jsdelivr.net/gh/neoFelhz/neohosts@gh-pages/basic/hosts", "NeoHosts_Basic"]
                ]
            },

            // =================================================================
            // THREAT INTELLIGENCE FEEDS
            // =================================================================
            "Threat Intel": {
                name: "DNSBL_ThreatIntel", type: "dnsbl",
                description: "Malware, Phishing, C2, Ransomware - Security focused",
                lists: [
                    // HaGeZi TIF (Threat Intelligence Feeds)
                    ["https://cdn.jsdelivr.net/gh/hagezi/dns-blocklists@latest/hosts/tif.txt", "HaGezi_TIF_Full"],
                    ["https://cdn.jsdelivr.net/gh/hagezi/dns-blocklists@latest/hosts/tif.medium.txt", "HaGezi_TIF_Medium"],
                    // abuse.ch
                    ["https://urlhaus.abuse.ch/downloads/hostfile/", "URLHaus_Malware"],
                    ["https://threatfox.abuse.ch/downloads/hostfile/", "ThreatFox_Domains"],
                    ["https://feodotracker.abuse.ch/downloads/domainblocklist.txt", "Feodo_Domains"],
                    // Malware Filter GitLab
                    ["https://malware-filter.gitlab.io/malware-filter/phishing-filter-hosts.txt", "MalwareFilter_Phishing"],
                    ["https://malware-filter.gitlab.io/malware-filter/urlhaus-filter-hosts.txt", "MalwareFilter_URLHaus"],
                    ["https://malware-filter.gitlab.io/malware-filter/pup-filter-hosts.txt", "MalwareFilter_PUP"],
                    // DandelionSprout Anti-Malware
                    ["https://raw.githubusercontent.com/DandelionSprout/adfilt/master/Alternate%20versions%20Anti-Malware%20List/AntiMalwareHosts.txt", "DandelionSprout_AntiMal"],
                    // Firebog Malware Lists
                    ["https://v.firebog.net/hosts/Prigent-Malware.txt", "Prigent_Malware"],
                    ["https://v.firebog.net/hosts/RPiList-Malware.txt", "RPiList_Malware"],
                    ["https://v.firebog.net/hosts/RPiList-Phishing.txt", "RPiList_Phishing"],
                    // Phishing
                    ["https://phishing.army/download/phishing_army_blocklist.txt", "Phishing_Army"],
                    ["https://phishing.army/download/phishing_army_blocklist_extended.txt", "Phishing_Army_Ext"],
                    ["https://openphish.com/feed.txt", "OpenPhish"],
                    ["https://raw.githubusercontent.com/mitchellkrogza/Phishing.Database/master/phishing-domains-ACTIVE.txt", "Phishing_Database"],
                    // Stamparm/Maltrail
                    ["https://raw.githubusercontent.com/stamparm/aux/master/maltrail-malware-domains.txt", "Stamparm_Maltrail"],
                    ["https://raw.githubusercontent.com/stamparm/blackbook/master/blackbook.txt", "Stamparm_Blackbook"],
                    // SANS ISC
                    ["https://isc.sans.edu/feeds/suspiciousdomains_High.txt", "SANS_Suspicious_High"],
                    ["https://isc.sans.edu/feeds/suspiciousdomains_Medium.txt", "SANS_Suspicious_Med"],
                    // Others
                    ["https://osint.digitalside.it/Threat-Intel/lists/latestdomains.txt", "DigitalSide_ThreatIntel"],
                    ["https://www.botvrij.eu/data/ioclist.domain.raw", "Botvrij_IOC"],
                    ["https://gitlab.com/quidsup/notrack-blocklists/raw/master/notrack-malware.txt", "NoTrack_Malware"],
                    ["https://raw.githubusercontent.com/mitchellkrogza/Badd-Boyz-Hosts/master/hosts", "Badd_Boyz"],
                    ["https://raw.githubusercontent.com/mitchellkrogza/The-Big-List-of-Hacked-Malware-Web-Sites/master/hosts", "BigList_Hacked"],
                    ["https://lists.cyberhost.uk/malware.txt", "CyberHost_Malware"],
                    ["https://bitbucket.org/ethanr/dns-blacklists/raw/8575c9f96e5b4a1308f2f12394abd86d0927a4a0/bad_lists/Mandiant_APT1_Report_Appendix_D.txt", "Mandiant_APT1"],
                    ["https://raw.githubusercontent.com/PeterDaveHello/threat-hostlist/main/hosts.txt", "PeterDave_ThreatList"],
                    ["https://malsilo.gitlab.io/feeds/dumps/domain_list.txt", "MalSilo_Domains"]
                ]
            },

            // =================================================================
            // ADVERTISING BLOCKLISTS
            // =================================================================
            "Advertising": {
                name: "DNSBL_Advertising", type: "dnsbl",
                description: "Ad servers, ad networks, and ad-related domains",
                lists: [
                    ["https://adaway.org/hosts.txt", "AdAway"],
                    ["https://v.firebog.net/hosts/AdguardDNS.txt", "AdGuard_DNS"],
                    ["https://adguardteam.github.io/AdGuardSDNSFilter/Filters/filter.txt", "AdGuard_SDNS"],
                    ["https://v.firebog.net/hosts/Easylist.txt", "EasyList_Hosts"],
                    ["https://v.firebog.net/hosts/Prigent-Ads.txt", "Prigent_Ads"],
                    ["https://v.firebog.net/hosts/Admiral.txt", "Admiral_AntiAdblock"],
                    ["https://pgl.yoyo.org/adservers/serverlist.php?hostformat=hosts&showintro=0&mimetype=plaintext", "Yoyo_AdServers"],
                    ["https://raw.githubusercontent.com/anudeepND/blacklist/master/adservers.txt", "Anudeep_AdServers"],
                    ["https://raw.githubusercontent.com/anudeepND/youtubeadsblacklist/master/domainlist.txt", "YouTube_Ads"],
                    ["https://s3.amazonaws.com/lists.disconnect.me/simple_ad.txt", "Disconnect_Ads"],
                    ["https://www.github.developerdan.com/hosts/lists/ads-and-tracking-extended.txt", "DevDan_AdsTracking"],
                    ["https://raw.githubusercontent.com/bigdargon/hostsVN/master/hosts", "BigDargon_HostsVN"],
                    ["https://raw.githubusercontent.com/PolishFiltersTeam/KADhosts/master/KADhosts.txt", "KAD_Hosts"],
                    ["https://paulgb.github.io/BarbBlock/blacklists/hosts-file.txt", "BarbBlock"],
                    ["https://raw.githubusercontent.com/jdlingyu/ad-wars/master/hosts", "JDlingyu_AdWars"],
                    ["https://raw.githubusercontent.com/Yhonay/antipopads/master/hosts", "Antipopads"],
                    ["https://raw.githubusercontent.com/FadeMind/hosts.extras/master/UncheckyAds/hosts", "FadeMind_Unchecky"],
                    ["https://raw.githubusercontent.com/MajkiIT/polish-ads-filter/master/polish-pihole-filters/hostfile.txt", "Polish_Ads"]
                ]
            },

            // =================================================================
            // TRACKING & ANALYTICS
            // =================================================================
            "Tracking": {
                name: "DNSBL_Tracking", type: "dnsbl",
                description: "Trackers, analytics, telemetry, and privacy-invading domains",
                lists: [
                    ["https://v.firebog.net/hosts/Easyprivacy.txt", "EasyPrivacy_Hosts"],
                    ["https://easylist.to/easylist/easyprivacy.txt", "EasyPrivacy_Orig"],
                    ["https://s3.amazonaws.com/lists.disconnect.me/simple_tracking.txt", "Disconnect_Tracking"],
                    ["https://hostfiles.frogeye.fr/firstparty-trackers-hosts.txt", "Frogeye_1stParty"],
                    ["https://hostfiles.frogeye.fr/multiparty-trackers-hosts.txt", "Frogeye_MultiParty"],
                    ["https://raw.githubusercontent.com/nextdns/cname-cloaking-blocklist/master/domains", "NextDNS_CNAME"],
                    ["https://raw.githubusercontent.com/AdguardTeam/cname-trackers/master/data/combined_disguised_trackers.txt", "AdGuard_CNAME"],
                    ["https://gitlab.com/quidsup/notrack-blocklists/raw/master/notrack-blocklist.txt", "NoTrack_Tracking"],
                    ["https://raw.githubusercontent.com/crazy-max/WindowsSpyBlocker/master/data/hosts/spy.txt", "Windows_SpyBlocker"],
                    ["https://raw.githubusercontent.com/FadeMind/hosts.extras/master/add.2o7Net/hosts", "FadeMind_2o7"],
                    ["https://raw.githubusercontent.com/matomo-org/referrer-spam-blacklist/master/spammers.txt", "Matomo_ReferrerSpam"],
                    ["https://v.firebog.net/hosts/static/w3kbl.txt", "W3KBL"]
                ]
            },

            // =================================================================
            // NATIVE DEVICE TELEMETRY
            // =================================================================
            "Native Telemetry": {
                name: "DNSBL_NativeTelemetry", type: "dnsbl",
                description: "Block telemetry from devices, OS, and platforms",
                lists: [
                    // HaGeZi Native Trackers
                    ["https://cdn.jsdelivr.net/gh/hagezi/dns-blocklists@latest/hosts/native.amazon.txt", "Native_Amazon"],
                    ["https://cdn.jsdelivr.net/gh/hagezi/dns-blocklists@latest/hosts/native.apple.txt", "Native_Apple"],
                    ["https://cdn.jsdelivr.net/gh/hagezi/dns-blocklists@latest/hosts/native.huawei.txt", "Native_Huawei"],
                    ["https://cdn.jsdelivr.net/gh/hagezi/dns-blocklists@latest/hosts/native.lgwebos.txt", "Native_LG_WebOS"],
                    ["https://cdn.jsdelivr.net/gh/hagezi/dns-blocklists@latest/hosts/native.oppo-realme.txt", "Native_Oppo_Realme"],
                    ["https://cdn.jsdelivr.net/gh/hagezi/dns-blocklists@latest/hosts/native.roku.txt", "Native_Roku"],
                    ["https://cdn.jsdelivr.net/gh/hagezi/dns-blocklists@latest/hosts/native.samsung.txt", "Native_Samsung"],
                    ["https://cdn.jsdelivr.net/gh/hagezi/dns-blocklists@latest/hosts/native.tiktok.txt", "Native_TikTok"],
                    ["https://cdn.jsdelivr.net/gh/hagezi/dns-blocklists@latest/hosts/native.tiktok.extended.txt", "Native_TikTok_Ext"],
                    ["https://cdn.jsdelivr.net/gh/hagezi/dns-blocklists@latest/hosts/native.vivo.txt", "Native_Vivo"],
                    ["https://cdn.jsdelivr.net/gh/hagezi/dns-blocklists@latest/hosts/native.winoffice.txt", "Native_WinOffice"],
                    ["https://cdn.jsdelivr.net/gh/hagezi/dns-blocklists@latest/hosts/native.xiaomi.txt", "Native_Xiaomi"],
                    // NextDNS Native Tracking
                    ["https://raw.githubusercontent.com/nextdns/native-tracking-domains/main/domains/alexa", "NextDNS_Alexa"],
                    ["https://raw.githubusercontent.com/nextdns/native-tracking-domains/main/domains/apple", "NextDNS_Apple"],
                    ["https://raw.githubusercontent.com/nextdns/native-tracking-domains/main/domains/huawei", "NextDNS_Huawei"],
                    ["https://raw.githubusercontent.com/nextdns/native-tracking-domains/main/domains/roku", "NextDNS_Roku"],
                    ["https://raw.githubusercontent.com/nextdns/native-tracking-domains/main/domains/samsung", "NextDNS_Samsung"],
                    ["https://raw.githubusercontent.com/nextdns/native-tracking-domains/main/domains/sonos", "NextDNS_Sonos"],
                    ["https://raw.githubusercontent.com/nextdns/native-tracking-domains/main/domains/windows", "NextDNS_Windows"],
                    ["https://raw.githubusercontent.com/nextdns/native-tracking-domains/main/domains/xiaomi", "NextDNS_Xiaomi"],
                    // Perflyst Device Lists
                    ["https://raw.githubusercontent.com/Perflyst/PiHoleBlocklist/master/android-tracking.txt", "Perflyst_Android"],
                    ["https://raw.githubusercontent.com/Perflyst/PiHoleBlocklist/master/SmartTV.txt", "Perflyst_SmartTV"],
                    ["https://raw.githubusercontent.com/Perflyst/PiHoleBlocklist/master/AmazonFireTV.txt", "Perflyst_FireTV"]
                ]
            },

            // =================================================================
            // CRYPTOJACKING / CRYPTOMINING
            // =================================================================
            "Cryptojacking": {
                name: "DNSBL_Cryptojacking", type: "dnsbl",
                description: "Block cryptomining and cryptojacking domains",
                lists: [
                    ["https://v.firebog.net/hosts/Prigent-Crypto.txt", "Prigent_Crypto"],
                    ["https://raw.githubusercontent.com/hoshsadiq/adblock-nocoin-list/master/hosts.txt", "NoCoin_List"],
                    ["https://zerodot1.gitlab.io/CoinBlockerLists/hosts_browser", "CoinBlocker_Browser"],
                    ["https://zerodot1.gitlab.io/CoinBlockerLists/hosts", "CoinBlocker_Hosts"],
                    ["https://raw.githubusercontent.com/Hestat/minerchk/master/hostslist.txt", "MinerChk"]
                ]
            },

            // =================================================================
            // SCAMS & FRAUD
            // =================================================================
            "Scams Fraud": {
                name: "DNSBL_ScamsFraud", type: "dnsbl",
                description: "Scam sites, fake stores, fraud domains",
                lists: [
                    ["https://cdn.jsdelivr.net/gh/hagezi/dns-blocklists@latest/hosts/fake.txt", "HaGezi_FakeStores"],
                    ["https://raw.githubusercontent.com/durablenapkin/scamblocklist/master/hosts.txt", "DurableNapkin_Scam"],
                    ["https://raw.githubusercontent.com/jarelllama/Scam-Blocklist/main/lists/wildcard_domains/scams.txt", "Jarelllama_Scams"],
                    ["https://raw.githubusercontent.com/Spam404/lists/master/main-blacklist.txt", "Spam404"],
                    ["https://raw.githubusercontent.com/Dawsey21/Lists/master/main-blacklist.txt", "Dawsey21_Blacklist"]
                ]
            },

            // =================================================================
            // SPAM & ABUSE
            // =================================================================
            "Spam Abuse": {
                name: "DNSBL_SpamAbuse", type: "dnsbl",
                description: "Spam domains, referrer spam, toxic domains",
                lists: [
                    ["https://raw.githubusercontent.com/FadeMind/hosts.extras/master/add.Spam/hosts", "FadeMind_Spam"],
                    ["https://raw.githubusercontent.com/FadeMind/hosts.extras/master/add.Risk/hosts", "FadeMind_Risk"],
                    ["https://www.stopforumspam.com/downloads/toxic_domains_whole.txt", "StopForumSpam_Toxic"],
                    ["https://www.joewein.net/dl/bl/dom-bl.txt", "JoeWein_Domains"],
                    ["https://www.joewein.net/dl/bl/dom-bl-base.txt", "JoeWein_Base"]
                ]
            },

            // =================================================================
            // DOH / VPN / PROXY BYPASS BLOCKING
            // =================================================================
            "DoH VPN Bypass": {
                name: "DNSBL_DoHBypass", type: "dnsbl",
                description: "Block DoH, VPN, and proxy bypass attempts",
                lists: [
                    ["https://cdn.jsdelivr.net/gh/hagezi/dns-blocklists@latest/hosts/doh-vpn-proxy-bypass.txt", "HaGezi_DoHBypass"],
                    ["https://raw.githubusercontent.com/bambenek/block-doh/master/doh-hosts.txt", "Bambenek_DoH"],
                    ["https://raw.githubusercontent.com/oneoffdallas/dohservers/master/list.txt", "OneOffDallas_DoH"]
                ]
            },

            // =================================================================
            // DYNAMIC DNS BLOCKING
            // =================================================================
            "DynDNS": {
                name: "DNSBL_DynDNS", type: "dnsbl",
                description: "Block Dynamic DNS services often used by malware",
                lists: [
                    ["https://cdn.jsdelivr.net/gh/hagezi/dns-blocklists@latest/hosts/dyndns.txt", "HaGezi_DynDNS"],
                    ["https://raw.githubusercontent.com/nextdns/ddns-domains/main/suffixes", "NextDNS_DDNS"]
                ]
            },

            // =================================================================
            // NEWLY REGISTERED DOMAINS (NRD)
            // =================================================================
            "NRD Blocking": {
                name: "DNSBL_NRD", type: "dnsbl",
                description: "Block Newly Registered Domains - May cause false positives",
                lists: [
                    ["https://cdn.jsdelivr.net/gh/hagezi/dns-blocklists@latest/hosts/nrd-14.txt", "HaGezi_NRD_14day"]
                ]
            },

            // =================================================================
            // MOST ABUSED TLDs
            // =================================================================
            "Abused TLDs": {
                name: "DNSBL_AbusedTLDs", type: "dnsbl",
                description: "Block commonly abused Top Level Domains",
                lists: [
                    ["https://cdn.jsdelivr.net/gh/hagezi/dns-blocklists@latest/hosts/tld.txt", "HaGezi_AbusedTLDs"]
                ]
            },

            // =================================================================
            // BADWARE HOSTERS & POPUP ADS
            // =================================================================
            "Badware Popup": {
                name: "DNSBL_BadwarePopup", type: "dnsbl",
                description: "Badware hosting services and popup ad networks",
                lists: [
                    ["https://cdn.jsdelivr.net/gh/hagezi/dns-blocklists@latest/hosts/hoster.txt", "HaGezi_BadwareHoster"],
                    ["https://cdn.jsdelivr.net/gh/hagezi/dns-blocklists@latest/hosts/popupads.txt", "HaGezi_PopupAds"]
                ]
            },

            // =================================================================
            // REGIONAL LISTS
            // =================================================================
            "Regional": {
                name: "DNSBL_Regional", type: "dnsbl",
                description: "Region-specific ad and tracking blocklists",
                lists: [
                    ["https://raw.githubusercontent.com/lassekongo83/Frellwits-filter-lists/master/Frellwits-Swedish-Hosts-File.txt", "Frellwit_Swedish"],
                    ["https://raw.githubusercontent.com/ABPindo/indonesianadblockrules/master/subscriptions/abpindo.txt", "ABPindo_Indonesian"],
                    ["https://raw.githubusercontent.com/yous/YousList/master/hosts.txt", "YousList_Korean"],
                    ["https://raw.githubusercontent.com/PaulSorensen/nordic-dns-blocklist/main/hosts.txt", "Nordic_DNS"],
                    ["https://raw.githubusercontent.com/vokins/yhosts/master/hosts.txt", "Vokins_Chinese"],
                    ["https://list.kwbt.de/fritzboxliste.txt", "Fritzbox_German"],
                    ["https://raw.githubusercontent.com/Sekhan/TheGreatWall/master/TheGreatWall.txt", "TheGreatWall_China"]
                ]
            },

            // =================================================================
            // SYSADMINDOC HOSTSHIELD CUSTOM LISTS
            // =================================================================
            "HOSTShield Custom": {
                name: "DNSBL_HOSTShield", type: "dnsbl",
                description: "SysAdminDoc HOSTShield custom blocklists",
                lists: [
                    ["https://github.com/SysAdminDoc/HOSTShield/releases/download/v.1/CombinedAll.txt", "HOSTShield_Combined"],
                    ["https://raw.githubusercontent.com/SysAdminDoc/HOSTShield/refs/heads/main/AdsTrackingAnalytics.txt", "HOSTShield_Ads"],
                    ["https://raw.githubusercontent.com/SysAdminDoc/HOSTShield/refs/heads/main/AdobeHosts.txt", "HOSTShield_Adobe"],
                    ["https://raw.githubusercontent.com/SysAdminDoc/HOSTShield/refs/heads/main/Apple.txt", "HOSTShield_Apple"],
                    ["https://raw.githubusercontent.com/SysAdminDoc/HOSTShield/refs/heads/main/Brave.txt", "HOSTShield_Brave"],
                    ["https://raw.githubusercontent.com/SysAdminDoc/HOSTShield/refs/heads/main/HOSTS2.txt", "HOSTShield_HOSTS2"],
                    ["https://raw.githubusercontent.com/SysAdminDoc/HOSTShield/refs/heads/main/HOSTS3.txt", "HOSTShield_HOSTS3"],
                    ["https://raw.githubusercontent.com/SysAdminDoc/HOSTShield/refs/heads/main/Microsoft.txt", "HOSTShield_Microsoft"],
                    ["https://raw.githubusercontent.com/SysAdminDoc/HOSTShield/refs/heads/main/Tiktok.txt", "HOSTShield_TikTok"],
                    ["https://raw.githubusercontent.com/SysAdminDoc/HOSTShield/refs/heads/main/Twitter.txt", "HOSTShield_Twitter"]
                ]
            },

            // =================================================================
            // ADULT CONTENT (NSFW) - Optional
            // =================================================================
            "NSFW Adult": {
                name: "DNSBL_NSFW", type: "dnsbl",
                description: "Adult/NSFW content blocking - Optional",
                lists: [
                    ["https://nsfw.oisd.nl/domainswild2", "OISD_NSFW"],
                    ["https://cdn.jsdelivr.net/gh/hagezi/dns-blocklists@latest/hosts/nsfw.txt", "HaGezi_NSFW"]
                ]
            },

            // =================================================================
            // GAMBLING - Optional
            // =================================================================
            "Gambling": {
                name: "DNSBL_Gambling", type: "dnsbl",
                description: "Gambling sites blocking - Optional",
                lists: [
                    ["https://cdn.jsdelivr.net/gh/hagezi/dns-blocklists@latest/hosts/gambling.txt", "HaGezi_Gambling"]
                ]
            },

            // =================================================================
            // SOCIAL MEDIA BLOCKING - Optional
            // =================================================================
            "Social Media": {
                name: "DNSBL_SocialMedia", type: "dnsbl",
                description: "Social media platform blocking - Optional",
                lists: [
                    ["https://raw.githubusercontent.com/anudeepND/blacklist/master/facebook.txt", "Anudeep_Facebook"]
                ]
            },

            // =================================================================
            // IPv4 BLOCKLISTS
            // =================================================================
            "IPV4": {
                name: "IPV4_ThreatFeeds", type: "ipv4",
                description: "Comprehensive IPv4 Blocklist - All threat feeds consolidated",
                lists: [
                    // abuse.ch
                    ["https://feodotracker.abuse.ch/downloads/ipblocklist_recommended.txt", "Abuse_Feodo_C2"],
                    ["https://sslbl.abuse.ch/blacklist/sslipblacklist.txt", "Abuse_SSLBL"],
                    // Major Threat Intel
                    ["https://cinsarmy.com/list/ci-badguys.txt", "CINS_Army"],
                    ["https://rules.emergingthreats.net/fwrules/emerging-Block-IPs.txt", "ET_Block"],
                    ["https://rules.emergingthreats.net/blockrules/compromised-ips.txt", "ET_Compromised"],
                    ["https://www.spamhaus.org/drop/drop.txt", "Spamhaus_Drop"],
                    ["https://www.spamhaus.org/drop/edrop.txt", "Spamhaus_eDrop"],
                    ["https://talosintelligence.com/documents/ip-blacklist", "Talos_BL"],
                    // SANS ISC
                    ["https://isc.sans.edu/block.txt", "ISC_Block"],
                    ["https://isc.sans.edu/api/threatlist/miner", "ISC_Miner"],
                    ["https://isc.sans.edu/api/threatlist/shodan/", "ISC_Shodan"],
                    // Blocklist.de
                    ["https://lists.blocklist.de/lists/all.txt", "BlockListDE_All"],
                    ["https://lists.blocklist.de/lists/ssh.txt", "BlockListDE_SSH"],
                    ["https://lists.blocklist.de/lists/bruteforcelogin.txt", "BlockListDE_Brute"],
                    // Others
                    ["https://blocklist.greensnow.co/greensnow.txt", "GreenSnow"],
                    ["https://www.binarydefense.com/banlist.txt", "BDS_Ban"],
                    ["https://www.botvrij.eu/data/ioclist.ip-dst.raw", "Botvrij_IP"],
                    ["https://zerodot1.gitlab.io/CoinBlockerLists/MiningServerIPList.txt", "CoinBlocker_IP"],
                    ["https://www.stopforumspam.com/downloads/toxic_ip_cidr.txt", "SFS_Toxic_IP"],
                    ["https://raw.githubusercontent.com/stamparm/maltrail/master/trails/static/mass_scanner.txt", "Maltrail_Scanners"],
                    // TOR (Optional - may block legitimate TOR users)
                    ["https://www.binarydefense.com/tor.txt", "BDS_TOR"],
                    ["https://check.torproject.org/torbulkexitlist", "TorProject_Exit"]
                ]
            }
        },
        customLists: []
    };

    // =========================================================================
    // AUTOMATION PRESETS - Quick selection profiles
    // =========================================================================
    const AUTOMATION_PRESETS = {
        minimal: {
            name: "Minimal",
            icon: "🎯",
            description: "Essential security - Low resource usage, minimal false positives",
            groups: [
                "Threat Intel",
                "Advertising",
                "Cryptojacking",
                "IPV4"
            ]
        },
        general: {
            name: "General",
            icon: "⚖️",
            description: "Balanced protection - Recommended for most users",
            groups: [
                "Comprehensive",
                "Threat Intel",
                "Advertising",
                "Tracking",
                "Native Telemetry",
                "Cryptojacking",
                "Scams Fraud",
                "DoH VPN Bypass",
                "HOSTShield Custom",
                "IPV4"
            ]
        },
        full: {
            name: "Full",
            icon: "🛡️",
            description: "Maximum protection - All security & privacy lists",
            groups: [
                "Comprehensive",
                "Threat Intel",
                "Advertising",
                "Tracking",
                "Native Telemetry",
                "Cryptojacking",
                "Scams Fraud",
                "Spam Abuse",
                "DoH VPN Bypass",
                "DynDNS",
                "NRD Blocking",
                "Abused TLDs",
                "Badware Popup",
                "Regional",
                "HOSTShield Custom",
                "IPV4"
            ]
        },
        everything: {
            name: "Everything",
            icon: "💀",
            description: "ALL lists including NSFW, Gambling, Social Media blocking",
            groups: "ALL"
        }
    };

    // =========================================================================
    // GLOBAL STATE
    // =========================================================================
    let automationConfig = {};
    let filters = { hideHidden: false, hideBlocked: false, showOnlyBlocked: false, hideIpBlockEvents: false };
    let hiddenItems = new Set();
    let hiddenDomains = new Set();
    let isCondensedView = false;
    let originalConfirm = null;
    let logTableBody = null;
    let condenseStyleElement = null;
    let filterDebounceTimer = null;
    let panelPosition = { x: 10, y: 100 };
    let isPanelCollapsed = false;
    let activeTab = 'automation';

    // New feature state
    let expandedGroups = new Set();
    let searchQuery = '';
    let urlHealthCache = {};
    let automationProgress = null;
    let disabledLists = new Set();

    // =========================================================================
    // STORAGE HELPERS
    // =========================================================================
    const storage = {
        async get(keys) {
            const results = {};
            const keysToFetch = Array.isArray(keys) ? keys : Object.keys(keys);
            const defaults = Array.isArray(keys) ? {} : keys;
            for (const key of keysToFetch) {
                try {
                    const val = await GM.getValue(key, defaults[key]);
                    results[key] = val;
                } catch {
                    results[key] = GM_getValue(key, defaults[key]);
                }
            }
            return results;
        },
        async set(items) {
            for (const [key, value] of Object.entries(items)) {
                try {
                    await GM.setValue(key, value);
                } catch {
                    GM_setValue(key, value);
                }
            }
        },
        async remove(keys) {
            const keysToRemove = Array.isArray(keys) ? keys : [keys];
            for (const key of keysToRemove) {
                try {
                    await GM.deleteValue(key);
                } catch {
                    GM_deleteValue(key);
                }
            }
        }
    };

    // =========================================================================
    // UTILITY FUNCTIONS
    // =========================================================================
    function showToast(msg, type = 'success', duration = CONFIG.TOAST_DURATION) {
        const existing = document.querySelector('.pfb-toolkit-toast');
        if (existing) existing.remove();

        const colors = {
            success: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            error: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
            warning: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
            info: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'
        };

        const toast = document.createElement('div');
        toast.className = 'pfb-toolkit-toast';
        toast.innerHTML = msg;
        Object.assign(toast.style, {
            position: 'fixed',
            bottom: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: colors[type] || colors.success,
            color: '#fff',
            padding: '12px 24px',
            borderRadius: '8px',
            boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
            zIndex: '100000',
            fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
            fontSize: '13px',
            fontWeight: '500',
            opacity: '0',
            transition: 'opacity 0.3s ease'
        });

        document.body.appendChild(toast);
        requestAnimationFrame(() => { toast.style.opacity = '1'; });
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }

    // =========================================================================
    // AUTOMATION CONFIG MANAGEMENT
    // =========================================================================
    function loadAutomationConfig() {
        let stored = GM_getValue(CONFIG.AUTOMATION_CONFIG_KEY);
        if (!stored) {
            stored = JSON.stringify(BLOCKLIST_DEFAULTS);
        }
        try {
            automationConfig = JSON.parse(stored);
        } catch {
            automationConfig = BLOCKLIST_DEFAULTS;
        }
        automationConfig.groups = automationConfig.groups || {};
        automationConfig.customLists = automationConfig.customLists || [];
    }

    function saveAutomationConfig() {
        GM_setValue(CONFIG.AUTOMATION_CONFIG_KEY, JSON.stringify(automationConfig));
    }

    function encodeGroupData(groupData) {
        const dataToStore = {
            name: groupData.name,
            type: groupData.type,
            description: groupData.description,
            lists: [...(groupData.lists || [])]
        };
        return btoa(encodeURIComponent(JSON.stringify(dataToStore)));
    }

    function decodeGroupData(encodedString) {
        try {
            return JSON.parse(decodeURIComponent(atob(encodedString)));
        } catch {
            return null;
        }
    }

    // =========================================================================
    // LOG CLEAR STATE MANAGEMENT
    // =========================================================================
    function getLogClearState() {
        try { return JSON.parse(localStorage.getItem(CONFIG.STATE_KEY)); } catch { return null; }
    }

    function setLogClearState(state) {
        localStorage.setItem(CONFIG.STATE_KEY, JSON.stringify(state));
    }

    function clearLogClearState() {
        localStorage.removeItem(CONFIG.STATE_KEY);
    }

    function isAutoStartPending() {
        return localStorage.getItem(CONFIG.START_FLAG_KEY) === 'true';
    }

    function setAutoStartFlag() {
        localStorage.setItem(CONFIG.START_FLAG_KEY, 'true');
    }

    function clearAutoStartFlag() {
        localStorage.removeItem(CONFIG.START_FLAG_KEY);
    }

    function enableAutoConfirm() {
        if (!originalConfirm) {
            const realWindow = (typeof unsafeWindow !== 'undefined') ? unsafeWindow : window;
            originalConfirm = realWindow.confirm;
            realWindow.confirm = () => true;
            window.confirm = () => true;
        }
    }

    function disableAutoConfirm() {
        if (originalConfirm) {
            const realWindow = (typeof unsafeWindow !== 'undefined') ? unsafeWindow : window;
            realWindow.confirm = originalConfirm;
            window.confirm = originalConfirm;
            originalConfirm = null;
        }
    }

    // =========================================================================
    // DOMAIN EXTRACTION
    // =========================================================================
    function extractCellText(cell) {
        if (!cell) return '';
        const clone = cell.cloneNode(true);
        clone.querySelector('small')?.remove();
        clone.querySelector('.pfb-hide-btn-wrap')?.remove();
        return clone.textContent.trim().replace(/\s+/g, ' ');
    }

    function extractRootDomain(domain) {
        if (!domain || /^[0-9.]+$/.test(domain) || /^[0-9a-fA-F:]+$/.test(domain)) return domain;
        const parts = domain.split('.');
        if (parts.length <= 2) return domain;
        const commonSLDs = ['co', 'com', 'org', 'net', 'gov', 'edu', 'ac'];
        if (parts[parts.length - 1].length === 2 && commonSLDs.includes(parts[parts.length - 2])) {
            return parts.length >= 3 ? parts.slice(-3).join('.') : domain;
        }
        return parts.slice(-2).join('.');
    }

    function isDomainHidden(host) {
        if (hiddenDomains.size === 0 || !host) return false;
        const root = extractRootDomain(host);
        return hiddenDomains.has(root) || hiddenDomains.has(host);
    }

    // =========================================================================
    // HIDING FUNCTIONS
    // =========================================================================
    async function hideItem(item) {
        if (!item || item.length < 3) return;
        hiddenItems.add(item);
        await storage.set({ [CONFIG.KEY_HIDDEN_ITEMS]: [...hiddenItems] });
        applyFilters();
        showToast(`Hidden: ${item}`, 'info');
    }

    async function hideDomain(item) {
        if (!item || item.length < 3) return;
        const domain = extractRootDomain(item);
        hiddenDomains.add(domain);
        await storage.set({ [CONFIG.KEY_HIDDEN_DOMAINS]: [...hiddenDomains] });
        applyFilters();
        showToast(`Hidden domain: ${domain}`, 'info');
    }

    async function clearHiddenItems() {
        if (hiddenItems.size === 0 && hiddenDomains.size === 0) {
            showToast('No hidden items to clear', 'warning');
            return;
        }
        const count = hiddenItems.size + hiddenDomains.size;
        hiddenItems.clear();
        hiddenDomains.clear();
        await storage.set({ [CONFIG.KEY_HIDDEN_ITEMS]: [], [CONFIG.KEY_HIDDEN_DOMAINS]: [] });
        applyFilters();
        showToast(`Cleared ${count} hidden items`, 'success');
    }

    // =========================================================================
    // FILTER APPLICATION
    // =========================================================================
    function applyFilters() {
        if (!logTableBody) return;
        if (filterDebounceTimer) clearTimeout(filterDebounceTimer);

        filterDebounceTimer = setTimeout(() => {
            const rows = logTableBody.querySelectorAll('tr');
            rows.forEach(row => {
                const cells = row.cells;
                if (cells.length < 8) return;

                const srcText = extractCellText(cells[2]);
                const dstText = extractCellText(cells[6]);
                const isBlocked = row.title?.includes("DNSBL Event") || row.style.backgroundColor === 'rgb(232, 78, 78)';
                const isIpBlock = row.title === "IP Block Event";

                if (row.dataset.buttonsAdded !== 'true') {
                    addHideButtons(srcText, cells[2], 'src');
                    addHideButtons(dstText, cells[6], 'dst');
                    row.dataset.buttonsAdded = 'true';
                }

                let visible = true;
                const isHiddenByList = hiddenItems.has(srcText) || hiddenItems.has(dstText) ||
                                       isDomainHidden(srcText) || isDomainHidden(dstText);

                if (filters.hideHidden && isHiddenByList) visible = false;
                else if (filters.hideIpBlockEvents && isIpBlock) visible = false;
                else if (filters.showOnlyBlocked && !isBlocked && !isIpBlock) visible = false;
                else if (filters.hideBlocked && isBlocked) visible = false;

                row.dataset.pfbHidden = visible ? 'false' : 'true';
            });
        }, CONFIG.FILTER_DEBOUNCE_MS);
    }

    function addHideButtons(item, cell, position) {
        if (!item || cell.querySelector('.pfb-hide-btn-wrap')) return;

        const wrap = document.createElement('span');
        wrap.className = 'pfb-hide-btn-wrap';
        wrap.style.cssText = 'display:inline;white-space:nowrap;margin-right:4px;vertical-align:middle;';

        const btn = document.createElement('a');
        btn.href = '#';
        btn.className = 'pfb-hide-btn';
        btn.textContent = 'HIDE';
        btn.onclick = (e) => { e.preventDefault(); hideItem(item); };
        wrap.appendChild(btn);

        const isIP = /^[0-9.]+$/.test(item) || /^[0-9a-fA-F:]+$/.test(item);

        if (position === 'dst' && !isIP) {
            // DST column: add DOMAIN button after HIDE
            const domBtn = document.createElement('a');
            domBtn.href = '#';
            domBtn.className = 'pfb-hide-btn';
            domBtn.textContent = 'DOMAIN';
            domBtn.style.marginLeft = '2px';
            domBtn.onclick = (e) => { e.preventDefault(); hideDomain(item); };
            wrap.appendChild(domBtn);
        }

        // Insert at the beginning of the cell for both SRC and DST
        cell.insertBefore(wrap, cell.firstChild);
    }

    function observeLogs() {
        if (!logTableBody) return;
        const observer = new MutationObserver(mutations => {
            if (mutations.some(m => Array.from(m.addedNodes).some(n => n.nodeName === 'TR'))) {
                applyFilters();
            }
        });
        observer.observe(logTableBody, { childList: true });
    }

    // =========================================================================
    // LOG CLEARING
    // =========================================================================
    function startLogClear(selectedLogs) {
        if (!selectedLogs?.length) {
            showToast('No logs selected', 'error');
            return;
        }
        setLogClearState({ running: true, logs: selectedLogs, index: 0 });
        clearAutoStartFlag();
        location.reload();
    }

    function stopLogClear() {
        clearLogClearState();
        disableAutoConfirm();
        clearAutoStartFlag();
        showToast('Log clearing stopped', 'warning');
        if (window.location.pathname.includes(CONFIG.LOG_PAGE)) {
            setTimeout(() => { window.location.href = CONFIG.REDIRECT_URL; }, 1000);
        }
    }

    function resumeLogClear() {
        const state = getLogClearState();
        const autoStart = isAutoStartPending();

        if (window.location.pathname.includes(CONFIG.LOG_PAGE) && autoStart && (!state || !state.running)) {
            const select = document.querySelector('select[name="logFile"]');
            const logs = select ? Array.from(select.options).map(o => o.value) : [];
            startLogClear(logs);
            return;
        }

        if (!state || !state.running) return;

        enableAutoConfirm();
        const { logs, index } = state;

        if (index >= logs.length) {
            clearLogClearState();
            disableAutoConfirm();
            showToast('All logs cleared!', 'success', CONFIG.TOAST_DURATION_LONG);
            setTimeout(() => { window.location.href = CONFIG.REDIRECT_URL; }, 1500);
            return;
        }

        const select = document.querySelector('select[name="logFile"]');
        const trash = document.getElementById('clearicon');
        if (!select || !trash) {
            clearLogClearState();
            disableAutoConfirm();
            showToast('Required elements not found', 'error');
            return;
        }

        const value = logs[index];
        const option = Array.from(select.options).find(o => o.value === value);
        if (!option) {
            state.index++;
            setLogClearState(state);
            location.reload();
            return;
        }

        select.value = value;
        select.dispatchEvent(new Event('change', { bubbles: true }));
        state.index++;
        setLogClearState(state);
        clearAutoStartFlag();

        setTimeout(() => { trash.click(); }, CONFIG.TRASH_CLICK_DELAY_MS);
    }

    // =========================================================================
    // ADVANCED FEATURES - Health Check, Duplicates, Memory, Export/Import
    // =========================================================================

    // URL Health Check
    async function checkUrlHealth(url, useCache = true) {
        const now = Date.now();
        const cacheKey = btoa(url).slice(0, 32);

        if (useCache && urlHealthCache[cacheKey]) {
            const cached = urlHealthCache[cacheKey];
            const hoursSince = (now - cached.timestamp) / (1000 * 60 * 60);
            if (hoursSince < CONFIG.URL_HEALTH_CACHE_HOURS) {
                return cached;
            }
        }

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), CONFIG.HEALTH_CHECK_TIMEOUT_MS);

            const response = await fetch(url, {
                method: 'HEAD',
                mode: 'no-cors',
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            const result = { url, status: 'ok', timestamp: now };
            urlHealthCache[cacheKey] = result;
            return result;
        } catch (error) {
            const result = {
                url,
                status: error.name === 'AbortError' ? 'timeout' : 'error',
                error: error.message,
                timestamp: now
            };
            urlHealthCache[cacheKey] = result;
            return result;
        }
    }

    async function checkAllUrlsHealth(progressCallback) {
        const allUrls = [];
        Object.entries(automationConfig.groups).forEach(([groupName, group]) => {
            (group.lists || []).forEach(list => {
                allUrls.push({ url: list[0], name: list[1], group: groupName });
            });
        });

        const results = { ok: [], failed: [], timeout: [] };
        let completed = 0;

        for (const item of allUrls) {
            const result = await checkUrlHealth(item.url, false);
            result.name = item.name;
            result.group = item.group;

            if (result.status === 'ok') results.ok.push(result);
            else if (result.status === 'timeout') results.timeout.push(result);
            else results.failed.push(result);

            completed++;
            if (progressCallback) {
                progressCallback(completed, allUrls.length, item.name);
            }
        }

        // Save cache
        GM_setValue(CONFIG.URL_HEALTH_CACHE_KEY, JSON.stringify(urlHealthCache));
        return results;
    }

    // Duplicate Detection
    function findDuplicates() {
        const urlMap = new Map();
        const duplicates = [];

        Object.entries(automationConfig.groups).forEach(([groupName, group]) => {
            (group.lists || []).forEach(list => {
                const url = list[0].toLowerCase().replace(/\/$/, '');
                if (urlMap.has(url)) {
                    duplicates.push({
                        url: list[0],
                        name: list[1],
                        groups: [urlMap.get(url).group, groupName]
                    });
                } else {
                    urlMap.set(url, { name: list[1], group: groupName });
                }
            });
        });

        return duplicates;
    }

    // Memory Estimation
    function estimateMemoryUsage(selectedGroups) {
        let totalDomains = 0;
        const breakdown = [];

        selectedGroups.forEach(groupName => {
            const group = automationConfig.groups[groupName];
            if (!group) return;

            let groupDomains = 0;
            (group.lists || []).forEach(list => {
                const listName = list[1];
                const estimate = CONFIG.ESTIMATED_DOMAINS_PER_LIST[listName] || CONFIG.ESTIMATED_DOMAINS_PER_LIST.default;
                groupDomains += estimate;
            });

            // Account for overlap within comprehensive lists (rough 30% dedup)
            if (groupName === 'Comprehensive') {
                groupDomains = Math.floor(groupDomains * 0.4);
            }

            breakdown.push({ group: groupName, domains: groupDomains });
            totalDomains += groupDomains;
        });

        // Account for cross-group overlap (rough 20% overlap)
        totalDomains = Math.floor(totalDomains * 0.8);

        // Estimate RAM: ~100 bytes per domain for unbound
        const ramMB = Math.ceil((totalDomains * 100) / (1024 * 1024));

        return {
            totalDomains,
            ramMB,
            breakdown,
            formatted: totalDomains > 1000000
                ? `~${(totalDomains/1000000).toFixed(1)}M domains (~${ramMB}MB RAM)`
                : `~${Math.round(totalDomains/1000)}K domains (~${ramMB}MB RAM)`
        };
    }

    // Export Configuration
    function exportConfig() {
        const exportData = {
            version: '3.4.0',
            exportDate: new Date().toISOString(),
            config: automationConfig,
            disabledLists: [...disabledLists],
            expandedGroups: [...expandedGroups]
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `pfblockerng-toolkit-config-${new Date().toISOString().slice(0,10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        showToast('Configuration exported!', 'success');
    }

    // Import Configuration
    function importConfig(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                if (data.config && data.config.groups) {
                    automationConfig = data.config;
                    disabledLists = new Set(data.disabledLists || []);
                    expandedGroups = new Set(data.expandedGroups || []);
                    saveAutomationConfig();
                    GM_setValue(CONFIG.EXPANDED_GROUPS_KEY, [...expandedGroups]);
                    showToast(`Imported config from ${data.exportDate || 'backup'}`, 'success');
                    renderTabContent();
                } else {
                    showToast('Invalid config file format', 'error');
                }
            } catch (err) {
                showToast('Failed to parse config file', 'error');
            }
        };
        reader.readAsText(file);
    }

    // Progress Tracking
    function getProgress() {
        try {
            return JSON.parse(sessionStorage.getItem(CONFIG.PROGRESS_KEY));
        } catch {
            return null;
        }
    }

    function setProgress(progress) {
        sessionStorage.setItem(CONFIG.PROGRESS_KEY, JSON.stringify(progress));
    }

    function clearProgress() {
        sessionStorage.removeItem(CONFIG.PROGRESS_KEY);
    }

    function updateProgressDisplay() {
        const progress = getProgress();
        const progressBar = document.getElementById('pfb-progress-bar');
        const progressText = document.getElementById('pfb-progress-text');

        if (!progress || !progressBar) return;

        const percent = Math.round((progress.completed / progress.total) * 100);
        progressBar.style.width = `${percent}%`;
        if (progressText) {
            progressText.textContent = `${progress.completed}/${progress.total} groups (${progress.current || ''})`;
        }
    }

    // =========================================================================
    // AUTOMATION FUNCTIONS
    // =========================================================================
    function processNextGroup() {
        const queueJson = sessionStorage.getItem(CONFIG.PFB_QUEUE_KEY);
        if (!queueJson) {
            clearProgress();
            return;
        }

        let queue;
        try { queue = JSON.parse(queueJson); } catch { sessionStorage.removeItem(CONFIG.PFB_QUEUE_KEY); clearProgress(); return; }
        if (queue.length === 0) {
            sessionStorage.removeItem(CONFIG.PFB_QUEUE_KEY);
            clearProgress();
            showToast('All groups processed!', 'success', CONFIG.TOAST_DURATION_LONG);
            return;
        }

        const next = queue.shift();
        sessionStorage.setItem(CONFIG.PFB_QUEUE_KEY, JSON.stringify(queue));

        // Update progress
        const progress = getProgress();
        if (progress) {
            progress.completed = progress.total - queue.length - 1;
            progress.current = next.name;
            setProgress(progress);
        }

        const groupData = automationConfig.groups[next.name];
        if (!groupData) { processNextGroup(); return; }

        sessionStorage.setItem(CONFIG.FILL_GROUP_KEY, groupData.name);
        sessionStorage.setItem(CONFIG.FILL_DATA_KEY, encodeGroupData(groupData));
        findOrCreateGroup(groupData);
    }

    function findOrCreateGroup(groupData) {
        const currentType = new URLSearchParams(window.location.search).get('type');
        const targetType = groupData.type;

        if (window.location.pathname === CONFIG.CATEGORY_PATH && currentType === targetType) {
            let editLink = null;
            $('table#mainarea tbody tr').each(function() {
                if ($(this).find('td:nth-child(2)').text().trim() === groupData.name) {
                    editLink = $(this).find('td:last-child a:first').attr('href');
                    return false;
                }
            });

            if (editLink) {
                window.location.href = editLink;
            } else {
                const addLink = $(`a.btn.btn-sm.btn-success[href*="${CONFIG.EDIT_PATH}?type=${targetType}"]`).attr('href');
                if (addLink) window.location.href = addLink;
                else processNextGroup();
            }
        } else {
            window.location.href = `${CONFIG.CATEGORY_PATH}?type=${targetType}`;
        }
    }

    function bulkFillGroup(groupData) {
        const lists = groupData.lists;
        if (!lists?.length) return false;

        $('#aliasname').val(groupData.name.replace(/\s/g, ''));
        $('#description').val(groupData.description);

        if (groupData.type === 'dnsbl') {
            $('#action').val('unbound');
            $('#logging').val('enabled');
        } else {
            $('#action').val('Disabled');
        }

        $('#sort').val('sort');
        $('#cron').val('Weekly');
        $('#dow').val('1');

        const rows = $('.panel-body .form-group.repeatable');
        for (let i = rows.length - 1; i > 0; i--) {
            $(`#deleterow${i}`).click();
        }

        const addBtn = $('#addrow');
        if (!addBtn.length) return false;

        lists.forEach((list, i) => {
            if (i > 0) addBtn.click();
            $(`#url-${i}`).val(list[0]);
            $(`#header-${i}`).val(list[1].replace(/\s/g, ''));
            $(`#format-${i}`).val('auto');
            $(`#state-${i}`).val('Enabled');
        });

        sessionStorage.setItem(CONFIG.SUCCESS_FLAG_KEY, 'true');
        $('#save').click();
        return true;
    }

    function autoFillOnPageLoad() {
        const groupName = sessionStorage.getItem(CONFIG.FILL_GROUP_KEY);
        const encoded = sessionStorage.getItem(CONFIG.FILL_DATA_KEY);
        if (!groupName || !encoded) return;

        const groupData = decodeGroupData(encoded);
        if (!groupData) return;

        const currentAlias = $('#aliasname').val();
        if (currentAlias === '' || currentAlias === groupData.name.replace(/\s/g, '')) {
            sessionStorage.removeItem(CONFIG.FILL_GROUP_KEY);
            sessionStorage.removeItem(CONFIG.FILL_DATA_KEY);
            bulkFillGroup(groupData);
        }
    }

    function handleSaveSuccess() {
        if (sessionStorage.getItem(CONFIG.SUCCESS_FLAG_KEY) !== 'true') return;
        sessionStorage.removeItem(CONFIG.SUCCESS_FLAG_KEY);

        const queueJson = sessionStorage.getItem(CONFIG.PFB_QUEUE_KEY);
        let queue = [];
        try { queue = queueJson ? JSON.parse(queueJson) : []; } catch {}

        if (queue.length > 0) {
            showToast(`Saved! Processing ${queue[0].name}...`, 'success');
            setTimeout(() => {
                window.location.href = `${CONFIG.CATEGORY_PATH}?type=${queue[0].type}`;
            }, CONFIG.REDIRECT_DELAY_MS);
        } else {
            showToast('✅ All groups processed!', 'success', CONFIG.TOAST_DURATION_LONG);
        }
    }

    // =========================================================================
    // PROFESSIONAL THEME CSS
    // =========================================================================
    const PROFESSIONAL_THEME_CSS = `
        /* ===== PROFESSIONAL PFSENSE THEME v3.0 ===== */
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&display=swap');

        /* === ROOT VARIABLES === */
        :root {
            --theme-bg-primary: #0a0e14;
            --theme-bg-secondary: #0d1117;
            --theme-bg-tertiary: #161b22;
            --theme-bg-card: #1c2128;
            --theme-bg-hover: #21262d;
            --theme-border: rgba(99, 179, 237, 0.15);
            --theme-border-bright: rgba(99, 179, 237, 0.3);
            --theme-text-primary: #e6edf3;
            --theme-text-secondary: #8b949e;
            --theme-text-muted: #6e7681;
            --theme-accent: #58a6ff;
            --theme-accent-hover: #79b8ff;
            --theme-success: #3fb950;
            --theme-warning: #d29922;
            --theme-danger: #f85149;
            --theme-danger-bg: rgba(248, 81, 73, 0.15);
            --theme-info: #58a6ff;
            --theme-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
            --theme-shadow-sm: 0 2px 8px rgba(0, 0, 0, 0.3);
            --theme-radius: 8px;
            --theme-radius-sm: 4px;
            --theme-transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }

        /* === BASE STYLES === */
        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
            background: linear-gradient(135deg, var(--theme-bg-primary) 0%, var(--theme-bg-secondary) 100%) !important;
            color: var(--theme-text-primary) !important;
            font-size: 13px !important;
            line-height: 1.5 !important;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
        }

        /* === SCROLLBAR === */
        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-track { background: var(--theme-bg-secondary); }
        ::-webkit-scrollbar-thumb {
            background: linear-gradient(180deg, var(--theme-accent) 0%, #1d4ed8 100%);
            border-radius: 4px;
        }
        ::-webkit-scrollbar-thumb:hover { background: var(--theme-accent-hover); }

        /* === TOP NAVIGATION === */
        #topmenu.navbar {
            background: linear-gradient(90deg, var(--theme-bg-tertiary) 0%, var(--theme-bg-secondary) 100%) !important;
            border-bottom: 1px solid var(--theme-border) !important;
            box-shadow: var(--theme-shadow-sm) !important;
            padding: 0 !important;
            min-height: 48px !important;
            margin-bottom: 0 !important;
        }

        .navbar-brand { padding: 8px 15px !important; }
        .navbar-brand svg { height: 28px !important; }

        .navbar-nav > li > a,
        .navbar-nav > li > a.dropdown-toggle {
            color: var(--theme-text-secondary) !important;
            font-size: 12px !important;
            font-weight: 500 !important;
            padding: 14px 12px !important;
            transition: var(--theme-transition) !important;
            letter-spacing: 0.3px;
        }

        .navbar-nav > li > a:hover,
        .navbar-nav > li.open > a {
            color: var(--theme-text-primary) !important;
            background: var(--theme-bg-hover) !important;
        }

        .dropdown-menu {
            background: var(--theme-bg-card) !important;
            border: 1px solid var(--theme-border-bright) !important;
            border-radius: var(--theme-radius) !important;
            box-shadow: var(--theme-shadow) !important;
            padding: 6px 0 !important;
            margin-top: 0 !important;
        }

        .dropdown-menu > li > a {
            color: var(--theme-text-secondary) !important;
            padding: 8px 16px !important;
            font-size: 12px !important;
            transition: var(--theme-transition) !important;
        }

        .dropdown-menu > li > a:hover {
            background: var(--theme-accent) !important;
            color: white !important;
        }

        .dropdown-menu .divider {
            background-color: var(--theme-border) !important;
            margin: 6px 0 !important;
        }

        /* === CONTAINER === */
        .container, .container.static {
            max-width: 100% !important;
            padding: 0 16px !important;
        }

        /* === HEADER === */
        .header {
            background: transparent !important;
            padding: 16px 0 8px !important;
            margin: 0 !important;
        }

        .header h1 {
            font-size: 20px !important;
            font-weight: 700 !important;
            color: var(--theme-text-primary) !important;
            margin: 0 !important;
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .header h1::before {
            content: '🛡️';
            font-size: 24px;
        }

        /* === NAV PILLS (TABS) === */
        .nav-pills {
            background: var(--theme-bg-tertiary) !important;
            border-radius: var(--theme-radius) !important;
            padding: 4px !important;
            margin: 8px 0 12px !important;
            display: inline-flex !important;
            gap: 4px;
            border: 1px solid var(--theme-border) !important;
        }

        .nav-pills > li {
            margin: 0 !important;
        }

        .nav-pills > li > a {
            color: var(--theme-text-secondary) !important;
            background: transparent !important;
            border-radius: 6px !important;
            padding: 8px 16px !important;
            font-size: 12px !important;
            font-weight: 600 !important;
            transition: var(--theme-transition) !important;
            border: none !important;
        }

        .nav-pills > li > a:hover {
            color: var(--theme-text-primary) !important;
            background: var(--theme-bg-hover) !important;
        }

        .nav-pills > li.active > a,
        .nav-pills > li.active > a:hover,
        .nav-pills > li.active > a:focus {
            background: linear-gradient(135deg, var(--theme-accent) 0%, #1d4ed8 100%) !important;
            color: white !important;
            box-shadow: 0 2px 8px rgba(88, 166, 255, 0.3) !important;
        }

        /* === PANELS === */
        .panel {
            background: var(--theme-bg-card) !important;
            border: 1px solid var(--theme-border) !important;
            border-radius: var(--theme-radius) !important;
            box-shadow: var(--theme-shadow-sm) !important;
            margin-bottom: 12px !important;
            overflow: hidden;
        }

        .panel-default > .panel-heading {
            background: linear-gradient(90deg, var(--theme-bg-tertiary) 0%, var(--theme-bg-card) 100%) !important;
            border-bottom: 1px solid var(--theme-border) !important;
            padding: 10px 16px !important;
        }

        .panel-heading h2,
        .panel-title {
            font-size: 13px !important;
            font-weight: 600 !important;
            color: var(--theme-text-primary) !important;
            margin: 0 !important;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .panel-body {
            padding: 12px !important;
            background: var(--theme-bg-card) !important;
        }

        /* === FORM CONTROLS === */
        .form-control,
        input[type="text"],
        input[type="number"],
        select {
            background: var(--theme-bg-secondary) !important;
            border: 1px solid var(--theme-border) !important;
            border-radius: var(--theme-radius-sm) !important;
            color: var(--theme-text-primary) !important;
            padding: 6px 10px !important;
            font-size: 12px !important;
            transition: var(--theme-transition) !important;
        }

        .form-control:focus,
        input:focus,
        select:focus {
            border-color: var(--theme-accent) !important;
            box-shadow: 0 0 0 3px rgba(88, 166, 255, 0.15) !important;
            outline: none !important;
        }

        /* === BUTTONS === */
        .btn {
            border-radius: var(--theme-radius-sm) !important;
            font-size: 12px !important;
            font-weight: 600 !important;
            padding: 6px 14px !important;
            transition: var(--theme-transition) !important;
            border: none !important;
            text-transform: none !important;
        }

        .btn-primary {
            background: linear-gradient(135deg, var(--theme-accent) 0%, #1d4ed8 100%) !important;
            color: white !important;
        }

        .btn-primary:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(88, 166, 255, 0.3) !important;
        }

        .btn-success {
            background: linear-gradient(135deg, var(--theme-success) 0%, #238636 100%) !important;
        }

        .btn-danger {
            background: linear-gradient(135deg, var(--theme-danger) 0%, #da3633 100%) !important;
        }

        .btn-default, .btn-secondary {
            background: var(--theme-bg-hover) !important;
            color: var(--theme-text-primary) !important;
            border: 1px solid var(--theme-border) !important;
        }

        .btn-default:hover {
            background: var(--theme-bg-tertiary) !important;
            border-color: var(--theme-border-bright) !important;
        }

        /* === MAIN DATA TABLE === */
        .table {
            background: transparent !important;
            margin-bottom: 0 !important;
            border-collapse: separate !important;
            border-spacing: 0 !important;
        }

        .table-responsive {
            border: none !important;
            border-radius: var(--theme-radius) !important;
            overflow: hidden;
        }

        /* Table Header */
        .table > thead > tr > th {
            background: linear-gradient(180deg, var(--theme-bg-tertiary) 0%, var(--theme-bg-secondary) 100%) !important;
            color: var(--theme-text-secondary) !important;
            font-size: 9px !important;
            font-weight: 700 !important;
            text-transform: uppercase !important;
            letter-spacing: 0.5px !important;
            padding: 4px 4px !important;
            border-bottom: 1px solid var(--theme-border-bright) !important;
            border-top: none !important;
            white-space: nowrap !important;
            position: sticky;
            top: 0;
            z-index: 10;
        }

        /* Sortable Header Indicators */
        .table > thead > tr > th[data-sorted="true"] {
            color: var(--theme-accent) !important;
        }

        /* Table Body Rows - Ultra Compact Excel Style */
        .table > tbody > tr {
            transition: none !important;
        }

        .table > tbody > tr > td {
            padding: 0 4px !important;
            border-top: 1px solid var(--theme-border) !important;
            font-size: 11px !important;
            vertical-align: middle !important;
            color: var(--theme-text-primary) !important;
            background: var(--theme-bg-card) !important;
            line-height: 16px !important;
            white-space: nowrap !important;
            margin: 0 !important;
        }

        .table > tbody > tr:hover > td {
            background: var(--theme-bg-hover) !important;
        }

        /* DNSBL Blocked Rows - Red accent */
        .table > tbody > tr[title="DNSBL Event"] > td,
        .table > tbody > tr[style*="background-color:#E84E4E"] > td,
        .table > tbody > tr[style*="background-color: rgb(232, 78, 78)"] > td {
            background: var(--theme-danger-bg) !important;
            border-left: 2px solid var(--theme-danger) !important;
        }

        .table > tbody > tr[title="DNSBL Event"]:hover > td {
            background: rgba(248, 81, 73, 0.25) !important;
        }

        /* IP Block Events - Orange accent */
        .table > tbody > tr[title="IP Block Event"] > td {
            background: rgba(210, 153, 34, 0.1) !important;
            border-left: 2px solid var(--theme-warning) !important;
        }

        .table > tbody > tr[title="IP Block Event"]:hover > td {
            background: rgba(210, 153, 34, 0.2) !important;
        }

        /* Permitted Events - Green accent */
        .table > tbody > tr[title*="Permit"] > td {
            border-left: 2px solid var(--theme-success) !important;
        }

        /* Table Cell Styling */
        .table td small {
            display: none !important;
        }

        .table td a {
            color: var(--theme-accent) !important;
            text-decoration: none !important;
            transition: var(--theme-transition) !important;
        }

        .table td a:hover {
            color: var(--theme-accent-hover) !important;
            text-decoration: underline !important;
        }

        /* Monospace for IPs and Domains */
        .table td:nth-child(3),
        .table td:nth-child(7) {
            font-family: 'JetBrains Mono', 'Fira Code', monospace !important;
            font-size: 11px !important;
        }

        /* === TABLE ICONS === */
        .table .fa,
        .table .icon-pointer {
            font-size: 12px !important;
            transition: var(--theme-transition) !important;
            opacity: 0.7;
        }

        .table .fa:hover,
        .table .icon-pointer:hover {
            opacity: 1;
            transform: scale(1.1);
        }

        .icon-primary { color: var(--theme-accent) !important; }
        .icon-success { color: var(--theme-success) !important; }
        .icon-danger { color: var(--theme-danger) !important; }
        .icon-warning { color: var(--theme-warning) !important; }

        /* === FOOTER === */
        .footer {
            background: var(--theme-bg-tertiary) !important;
            border-top: 1px solid var(--theme-border) !important;
            padding: 12px 0 !important;
            margin-top: 20px !important;
        }

        .footer a {
            color: var(--theme-text-muted) !important;
            font-size: 11px !important;
        }

        /* === INFO/HELP ICONS === */
        .fa-info-circle {
            color: var(--theme-accent) !important;
            opacity: 0.6;
        }

        /* === BADGES === */
        .badge, .label {
            font-size: 10px !important;
            font-weight: 600 !important;
            padding: 3px 8px !important;
            border-radius: 10px !important;
        }

        .label-success { background: var(--theme-success) !important; }
        .label-danger { background: var(--theme-danger) !important; }
        .label-warning { background: var(--theme-warning) !important; }
        .label-info { background: var(--theme-info) !important; }

        /* === ALERTS === */
        .alert {
            border-radius: var(--theme-radius) !important;
            border: none !important;
            padding: 12px 16px !important;
            font-size: 12px !important;
        }

        .alert-info {
            background: rgba(88, 166, 255, 0.1) !important;
            color: var(--theme-accent) !important;
            border-left: 3px solid var(--theme-accent) !important;
        }

        .alert-success {
            background: rgba(63, 185, 80, 0.1) !important;
            color: var(--theme-success) !important;
            border-left: 3px solid var(--theme-success) !important;
        }

        .alert-danger {
            background: rgba(248, 81, 73, 0.1) !important;
            color: var(--theme-danger) !important;
            border-left: 3px solid var(--theme-danger) !important;
        }

        /* === COLLAPSE PANELS === */
        .panel-heading .fa-plus-circle,
        .panel-heading .fa-minus-circle {
            color: var(--theme-accent) !important;
            transition: var(--theme-transition) !important;
        }

        .panel-heading:hover .fa-plus-circle,
        .panel-heading:hover .fa-minus-circle {
            transform: scale(1.1);
        }

        /* === TOOLTIP STYLING === */
        [title] {
            cursor: help;
        }

        /* === HIDE UNNECESSARY ELEMENTS FOR CONDENSED VIEW === */
        .pfb-condensed .footer { display: none !important; }
        .pfb-condensed .container.fixed > i.fa-info-circle { display: none !important; }

        /* === RESPONSIVE ADJUSTMENTS === */
        @media (max-width: 1200px) {
            .table > thead > tr > th,
            .table > tbody > tr > td {
                padding: 4px 6px !important;
                font-size: 11px !important;
            }
        }

        /* === ANIMATION KEYFRAMES === */
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(-10px); }
            to { opacity: 1; transform: translateY(0); }
        }

        .panel { animation: fadeIn 0.3s ease-out; }

        /* === SELECTION STYLING === */
        ::selection {
            background: var(--theme-accent);
            color: white;
        }

        /* === USER COMPACT OVERRIDES === */
        select.form-control {
            font-size: 11px !important;
            padding: 0 0 0 0 !important;
        }

        ol.breadcrumb {
            margin: 0 !important;
            padding: 0 !important;
        }

        i.fa.fa-question-circle {
            display: none !important;
        }

        i.fa.fa-info-circle.icon-pointer {
            display: none !important;
        }

        tfoot tr td {
            background-color: #9e1033 !important;
        }

        ul.nav.nav-pills {
            margin: 0 !important;
            padding: 0 !important;
        }

        div.panel.panel-default {
            padding: 0 !important;
            margin: 0 !important;
        }

        tbody tr td {
            padding-top: 0 !important;
            padding-bottom: 0 !important;
            margin: 0 !important;
        }

        footer.footer {
            display: none !important;
        }

        /* === CUSTOM CHECKBOX STYLING === */
        input[type="checkbox"] {
            accent-color: var(--theme-accent);
            width: 16px;
            height: 16px;
        }

        /* === LOCK ICON STYLING === */
        .fa-lock { color: var(--theme-danger) !important; }
        .fa-unlock { color: var(--theme-success) !important; }

        /* === HIDE BUTTON STYLING (Ultra Compact) === */
        .pfb-hide-btn {
            font-family: 'JetBrains Mono', monospace !important;
            font-size: 8px !important;
            font-weight: 600 !important;
            color: #58a6ff !important;
            background: transparent !important;
            padding: 0 3px !important;
            border: 1px solid rgba(88, 166, 255, 0.3) !important;
            border-radius: 2px !important;
            text-decoration: none !important;
            transition: all 0.15s ease !important;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            line-height: 14px !important;
            display: inline-block;
            vertical-align: middle;
            margin: 0 !important;
            padding-top: 0 !important;
            padding-bottom: 0 !important;
        }

        .pfb-hide-btn:hover {
            background: #58a6ff !important;
            color: #0a0e14 !important;
            border-color: #58a6ff !important;
        }

        span.pfb-hide-btn-wrap {
            padding: 0 !important;
            margin: 0 !important;
            vertical-align: middle;
            display: inline !important;
        }

        a.pfb-hide-btn {
            margin: 0 1px !important;
            padding-top: 0 !important;
            padding-bottom: 0 !important;
        }

        /* === PAGE-SPECIFIC OPTIMIZATIONS === */
        /* Alerts Page */
        body[id="2"] .panel-body {
            max-height: calc(100vh - 200px);
            overflow-y: auto;
        }

        /* Better spacing for info icons next to content */
        td .fa + span,
        td span + .fa {
            margin-left: 4px;
        }
    `;

    // =========================================================================
    // CONDENSE VIEW CSS (Enhanced)
    // =========================================================================
    const CONDENSE_CSS = `
        /* === CONDENSED VIEW OVERRIDES === */
        body { font-size: 11px !important; }

        /* Hide verbose columns */
        .table > thead > tr > th:nth-of-type(9),
        .table > tbody > tr > td:nth-of-type(9),
        .table > thead > tr > th:nth-of-type(5),
        .table > tbody > tr > td:nth-of-type(5),
        .table > thead > tr > th:nth-of-type(4),
        .table > tbody > tr > td:nth-of-type(4) {
            display: none !important;
        }

        /* Tighter spacing */
        .table > tbody > tr > td {
            padding: 3px 6px !important;
            line-height: 1.3 !important;
        }

        .table > thead > tr > th {
            padding: 6px !important;
        }

        /* Hide secondary info */
        tr td small { display: none !important; }

        /* Compact panels */
        .panel { margin-bottom: 8px !important; }
        .panel-body { padding: 8px !important; }
        .panel-heading { padding: 8px 12px !important; }

        /* Compact header */
        .header { padding: 8px 0 4px !important; }
        .header h1 { font-size: 16px !important; }

        /* Compact nav */
        .nav-pills { margin: 4px 0 8px !important; }
        .nav-pills > li > a { padding: 6px 12px !important; }

        /* Hide footer and info icons */
        .footer { display: none !important; }
        .container.fixed > i.fa-info-circle { display: none !important; }

        /* Smaller buttons */
        .pfb-hide-btn {
            font-size: 8px !important;
            padding: 1px 4px !important;
        }
    `;

    let themeStyleElement = null;

    function applyCondenseView() {
        if (isCondensedView && !condenseStyleElement) {
            condenseStyleElement = document.createElement('style');
            condenseStyleElement.textContent = CONDENSE_CSS;
            document.head.appendChild(condenseStyleElement);
        } else if (!isCondensedView && condenseStyleElement) {
            condenseStyleElement.remove();
            condenseStyleElement = null;
        }
    }

    function applyProfessionalTheme() {
        // Always apply theme on pfBlockerNG pages
        if (!themeStyleElement && window.location.pathname.includes('/pfblockerng/')) {
            themeStyleElement = document.createElement('style');
            themeStyleElement.id = 'pfb-professional-theme';
            themeStyleElement.textContent = PROFESSIONAL_THEME_CSS;
            document.head.appendChild(themeStyleElement);
        }
    }

    // =========================================================================
    // MAIN UI PANEL
    // =========================================================================
    function buildMainPanel() {
        if (document.getElementById('pfb-ultimate-toolkit')) return;

        const panel = document.createElement('div');
        panel.id = 'pfb-ultimate-toolkit';
        panel.innerHTML = `
            <div class="pfb-tk-header" id="pfb-tk-header">
                <div class="pfb-tk-title">
                    <span class="pfb-tk-icon">🛡️</span>
                    <span>pfBlockerNG Toolkit</span>
                    <span class="pfb-tk-version">v3.4.1</span>
                </div>
                <div class="pfb-tk-controls">
                    <button class="pfb-tk-ctrl-btn" id="pfb-tk-collapse" title="Collapse">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/>
                        </svg>
                    </button>
                </div>
            </div>
            <div class="pfb-tk-body" id="pfb-tk-body">
                <div class="pfb-tk-tabs">
                    <button class="pfb-tk-tab active" data-tab="automation">⚡ Automation</button>
                    <button class="pfb-tk-tab" data-tab="filters">🔍 Filters</button>
                    <button class="pfb-tk-tab" data-tab="tools">🔧 Tools</button>
                </div>
                <div class="pfb-tk-content" id="pfb-tk-content">
                    <!-- Content injected by JS -->
                </div>
            </div>
        `;

        document.body.appendChild(panel);
        initPanelPosition();
        initDraggable();
        initTabs();
        renderTabContent();

        document.getElementById('pfb-tk-collapse').onclick = () => {
            isPanelCollapsed = !isPanelCollapsed;
            panel.classList.toggle('collapsed', isPanelCollapsed);
            storage.set({ [CONFIG.KEY_PANEL_COLLAPSED]: isPanelCollapsed });
        };

        if (isPanelCollapsed) panel.classList.add('collapsed');
    }

    function initPanelPosition() {
        const panel = document.getElementById('pfb-ultimate-toolkit');
        panel.style.left = panelPosition.x + 'px';
        panel.style.top = panelPosition.y + 'px';
    }

    function initDraggable() {
        const panel = document.getElementById('pfb-ultimate-toolkit');
        const header = document.getElementById('pfb-tk-header');
        let isDragging = false, startX, startY, startLeft, startTop;

        header.addEventListener('mousedown', (e) => {
            if (e.target.closest('.pfb-tk-ctrl-btn')) return;
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            startLeft = panel.offsetLeft;
            startTop = panel.offsetTop;
            panel.style.transition = 'none';
            document.addEventListener('mousemove', onMove);
            document.addEventListener('mouseup', onUp);
        });

        function onMove(e) {
            if (!isDragging) return;
            let newX = startLeft + e.clientX - startX;
            let newY = startTop + e.clientY - startY;
            newX = Math.max(0, Math.min(newX, window.innerWidth - panel.offsetWidth));
            newY = Math.max(0, Math.min(newY, window.innerHeight - 50));
            panel.style.left = newX + 'px';
            panel.style.top = newY + 'px';
        }

        function onUp() {
            isDragging = false;
            panel.style.transition = '';
            panelPosition = { x: panel.offsetLeft, y: panel.offsetTop };
            storage.set({ [CONFIG.KEY_PANEL_POSITION]: panelPosition });
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
        }
    }

    function initTabs() {
        document.querySelectorAll('.pfb-tk-tab').forEach(tab => {
            tab.onclick = () => {
                document.querySelectorAll('.pfb-tk-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                activeTab = tab.dataset.tab;
                storage.set({ [CONFIG.KEY_ACTIVE_TAB]: activeTab });
                renderTabContent();
            };
        });
    }

    function renderTabContent() {
        const content = document.getElementById('pfb-tk-content');
        if (activeTab === 'automation') {
            renderAutomationTab(content);
        } else if (activeTab === 'filters') {
            renderFiltersTab(content);
        } else if (activeTab === 'tools') {
            renderToolsTab(content);
        }
    }

    function renderAutomationTab(container) {
        const groups = Object.entries(automationConfig.groups);
        const dnsbl = groups.filter(([,g]) => g.type === 'dnsbl');
        const ipv4 = groups.filter(([,g]) => g.type === 'ipv4');
        const progress = getProgress();

        // Calculate list counts for presets
        const getPresetListCount = (preset) => {
            if (preset.groups === "ALL") {
                return groups.reduce((sum, [,g]) => sum + (g.lists?.length || 0), 0);
            }
            return preset.groups.reduce((sum, name) => {
                const group = automationConfig.groups[name];
                return sum + (group?.lists?.length || 0);
            }, 0);
        };

        // Filter groups by search
        const filterGroups = (groupList) => {
            if (!searchQuery) return groupList;
            const q = searchQuery.toLowerCase();
            return groupList.filter(([name, g]) =>
                name.toLowerCase().includes(q) ||
                g.description?.toLowerCase().includes(q) ||
                (g.lists || []).some(l => l[1].toLowerCase().includes(q))
            );
        };

        const filteredDnsbl = filterGroups(dnsbl);
        const filteredIpv4 = filterGroups(ipv4);

        // Render group with collapsible list details
        const renderGroup = ([name, g]) => {
            const isExpanded = expandedGroups.has(name);
            const listCount = g.lists?.length || 0;
            return `
                <div class="pfb-group-wrapper">
                    <label class="pfb-tk-checkbox group-item">
                        <input type="checkbox" class="group-cb" value="${name}">
                        <span class="group-name">${name}</span>
                        <span class="list-count">${listCount}</span>
                        <button class="pfb-expand-btn" data-group="${name}" title="Show lists">
                            ${isExpanded ? '&#9660;' : '&#9654;'}
                        </button>
                    </label>
                    <div class="pfb-list-details ${isExpanded ? 'expanded' : ''}" data-group-details="${name}">
                        ${(g.lists || []).map((list, i) => `
                            <div class="pfb-list-item">
                                <span class="list-name" title="${list[0]}">${list[1]}</span>
                                <a href="${list[0]}" target="_blank" class="list-link" title="Open URL">&#128279;</a>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        };

        container.innerHTML = `
            ${progress ? `
                <div class="pfb-progress-section">
                    <div class="pfb-progress-header">Processing: ${progress.current || '...'}</div>
                    <div class="pfb-progress-bar-bg">
                        <div class="pfb-progress-bar" id="pfb-progress-bar" style="width:${Math.round((progress.completed/progress.total)*100)}%"></div>
                    </div>
                    <div class="pfb-progress-text" id="pfb-progress-text">${progress.completed}/${progress.total} groups</div>
                    <button class="pfb-tk-btn danger" id="pfb-cancel-progress">Cancel</button>
                </div>
            ` : ''}

            <div class="pfb-tk-section">
                <input type="text" class="pfb-search-input" id="pfb-search" placeholder="Search groups or lists..." value="${searchQuery}">
            </div>

            <div class="pfb-tk-section">
                <div class="pfb-tk-group-header">🚀 Quick Presets</div>
                <div class="pfb-preset-grid">
                    ${Object.entries(AUTOMATION_PRESETS).map(([key, preset]) => `
                        <button class="pfb-tk-btn preset-btn" data-preset="${key}" title="${preset.description}">
                            <span class="preset-icon">${preset.icon}</span>
                            <span class="preset-name">${preset.name}</span>
                            <span class="preset-count">${getPresetListCount(preset)} lists</span>
                        </button>
                    `).join('')}
                </div>
            </div>

            <div class="pfb-tk-section">
                <div class="pfb-memory-estimate" id="pfb-memory-estimate">Select groups to see estimate</div>
            </div>

            <div class="pfb-tk-section">
                <button class="pfb-tk-btn primary" id="pfb-process-selected">⚡ Process Selected Groups</button>
                <div style="display:flex;gap:8px;margin-top:8px;">
                    <label class="pfb-tk-checkbox" style="flex:1;">
                        <input type="checkbox" id="pfb-select-all">
                        <span>Select All</span>
                    </label>
                    <button class="pfb-tk-btn" id="pfb-clear-selection" style="flex:1;font-size:10px;">Clear</button>
                </div>
            </div>

            <div class="pfb-tk-section">
                <div class="pfb-tk-group-header">🔒 DNSBL Groups (${filteredDnsbl.length}/${dnsbl.length})</div>
                ${filteredDnsbl.map(renderGroup).join('')}
            </div>

            <div class="pfb-tk-section">
                <div class="pfb-tk-group-header">🌐 IPv4 Groups (${filteredIpv4.length}/${ipv4.length})</div>
                ${filteredIpv4.map(renderGroup).join('')}
            </div>
        `;

        // Search handler
        const searchInput = document.getElementById('pfb-search');
        let searchTimeout;
        searchInput.oninput = (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                searchQuery = e.target.value;
                renderTabContent();
            }, 300);
        };

        // Expand/collapse handlers
        container.querySelectorAll('.pfb-expand-btn').forEach(btn => {
            btn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                const groupName = btn.dataset.group;
                if (expandedGroups.has(groupName)) {
                    expandedGroups.delete(groupName);
                } else {
                    expandedGroups.add(groupName);
                }
                GM_setValue(CONFIG.EXPANDED_GROUPS_KEY, [...expandedGroups]);
                renderTabContent();
            };
        });

        // Memory estimate updater
        const updateMemoryEstimate = () => {
            const selected = [...container.querySelectorAll('.group-cb:checked')].map(cb => cb.value);
            const estimate = estimateMemoryUsage(selected);
            const el = document.getElementById('pfb-memory-estimate');
            if (el) {
                el.textContent = selected.length ? estimate.formatted : 'Select groups to see estimate';
                el.className = 'pfb-memory-estimate' + (estimate.ramMB > 512 ? ' warning' : '');
            }
        };

        // Preset button handlers
        container.querySelectorAll('.preset-btn').forEach(btn => {
            btn.onclick = () => {
                const presetKey = btn.dataset.preset;
                const preset = AUTOMATION_PRESETS[presetKey];
                const checkboxes = container.querySelectorAll('.group-cb');

                checkboxes.forEach(cb => cb.checked = false);

                if (preset.groups === "ALL") {
                    checkboxes.forEach(cb => cb.checked = true);
                } else {
                    preset.groups.forEach(groupName => {
                        const cb = container.querySelector(`.group-cb[value="${groupName}"]`);
                        if (cb) cb.checked = true;
                    });
                }

                const allChecked = [...checkboxes].every(cb => cb.checked);
                document.getElementById('pfb-select-all').checked = allChecked;

                container.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                const selectedCount = [...checkboxes].filter(cb => cb.checked).length;
                showToast(`${preset.icon} ${preset.name}: ${selectedCount} groups selected`, 'info');
                updateMemoryEstimate();
            };
        });

        // Checkbox change handlers
        container.querySelectorAll('.group-cb').forEach(cb => {
            cb.onchange = updateMemoryEstimate;
        });

        document.getElementById('pfb-select-all').onchange = (e) => {
            container.querySelectorAll('.group-cb').forEach(cb => cb.checked = e.target.checked);
            container.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
            updateMemoryEstimate();
        };

        document.getElementById('pfb-clear-selection').onclick = () => {
            container.querySelectorAll('.group-cb').forEach(cb => cb.checked = false);
            document.getElementById('pfb-select-all').checked = false;
            container.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
            updateMemoryEstimate();
        };

        // Cancel progress
        const cancelBtn = document.getElementById('pfb-cancel-progress');
        if (cancelBtn) {
            cancelBtn.onclick = () => {
                sessionStorage.removeItem(CONFIG.PFB_QUEUE_KEY);
                clearProgress();
                showToast('Automation cancelled', 'warning');
                renderTabContent();
            };
        }

        document.getElementById('pfb-process-selected').onclick = () => {
            const selected = [...container.querySelectorAll('.group-cb:checked')].map(cb => ({
                name: cb.value,
                type: automationConfig.groups[cb.value].type
            }));
            if (!selected.length) {
                showToast('Select at least one group', 'warning');
                return;
            }

            // Set up progress tracking
            setProgress({
                total: selected.length,
                completed: 0,
                current: selected[0].name,
                startTime: Date.now()
            });

            sessionStorage.setItem(CONFIG.PFB_QUEUE_KEY, JSON.stringify(selected));
            processNextGroup();
        };

        // Initial memory estimate
        updateMemoryEstimate();
    }

    function renderFiltersTab(container) {
        const isAlertsPage = window.location.pathname.includes(CONFIG.ALERTS_PAGE);

        container.innerHTML = `
            <div class="pfb-tk-section">
                ${[
                    { key: 'hideHidden', label: 'Hide User Hidden' },
                    { key: 'hideBlocked', label: 'Hide DNSBL Blocked' },
                    { key: 'hideIpBlockEvents', label: 'Hide IP Block Events' },
                    { key: 'showOnlyBlocked', label: 'Show Only Blocked' }
                ].map(f => `
                    <button class="pfb-tk-btn toggle ${filters[f.key] ? 'active' : ''}" data-filter="${f.key}" ${!isAlertsPage ? 'disabled' : ''}>
                        ${f.label}
                    </button>
                `).join('')}
            </div>
            <div class="pfb-tk-section">
                <button class="pfb-tk-btn toggle ${isCondensedView ? 'active' : ''}" id="pfb-condense" ${!isAlertsPage ? 'disabled' : ''}>
                    📐 Condense View
                </button>
            </div>
            <div class="pfb-tk-section">
                <button class="pfb-tk-btn danger" id="pfb-clear-hidden" ${!isAlertsPage ? 'disabled' : ''}>
                    🗑️ Clear Hidden Items (${hiddenItems.size + hiddenDomains.size})
                </button>
            </div>
            ${!isAlertsPage ? '<p class="pfb-tk-note">⚠️ Filter controls available on Alerts page</p>' : ''}
        `;

        container.querySelectorAll('[data-filter]').forEach(btn => {
            btn.onclick = async () => {
                const key = btn.dataset.filter;
                const exclusive = ['hideBlocked', 'showOnlyBlocked'];
                if (exclusive.includes(key) && !filters[key]) {
                    exclusive.forEach(k => { if (k !== key) filters[k] = false; });
                }
                filters[key] = !filters[key];
                await storage.set({ [CONFIG.KEY_FILTER_STATE]: filters });
                applyFilters();
                renderTabContent();
            };
        });

        const condenseBtn = document.getElementById('pfb-condense');
        if (condenseBtn) {
            condenseBtn.onclick = async () => {
                isCondensedView = !isCondensedView;
                await storage.set({ [CONFIG.KEY_CONDENSE_VIEW]: isCondensedView });
                applyCondenseView();
                renderTabContent();
            };
        }

        const clearBtn = document.getElementById('pfb-clear-hidden');
        if (clearBtn) clearBtn.onclick = clearHiddenItems;
    }

    function renderToolsTab(container) {
        const state = getLogClearState();
        const isRunning = state?.running;
        const duplicates = findDuplicates();

        container.innerHTML = `
            <div class="pfb-tk-section">
                <div class="pfb-tk-group-header">📋 Log Management</div>
                <button class="pfb-tk-btn ${isRunning ? 'danger' : 'warning'}" id="pfb-clear-logs">
                    ${isRunning ? '⏹ Stop Log Clear' : '🗑 Auto-Clear All Logs'}
                </button>
                ${isRunning ? `<p class="pfb-tk-note">Clearing log ${state.index + 1} of ${state.logs.length}...</p>` : ''}
            </div>

            <div class="pfb-tk-section">
                <div class="pfb-tk-group-header">💾 Backup & Restore</div>
                <div style="display:flex;gap:8px;">
                    <button class="pfb-tk-btn" id="pfb-export-config" style="flex:1;">📤 Export</button>
                    <label class="pfb-tk-btn" style="flex:1;text-align:center;cursor:pointer;">
                        📥 Import
                        <input type="file" id="pfb-import-config" accept=".json" style="display:none;">
                    </label>
                </div>
            </div>

            <div class="pfb-tk-section">
                <div class="pfb-tk-group-header">🔍 Diagnostics</div>
                <button class="pfb-tk-btn" id="pfb-health-check">🏥 Check URL Health</button>
                <button class="pfb-tk-btn ${duplicates.length ? 'warning' : ''}" id="pfb-find-duplicates">
                    🔄 Find Duplicates ${duplicates.length ? `(${duplicates.length})` : ''}
                </button>
                <div id="pfb-diagnostics-result"></div>
            </div>

            <div class="pfb-tk-section">
                <div class="pfb-tk-group-header">🔄 Quick Actions</div>
                <button class="pfb-tk-btn" id="pfb-goto-alerts">📊 Go to Alerts</button>
                <button class="pfb-tk-btn" id="pfb-goto-dnsbl">🔒 Go to DNSBL</button>
                <button class="pfb-tk-btn" id="pfb-goto-ipv4">🌐 Go to IPv4</button>
            </div>

            <div class="pfb-tk-section">
                <div class="pfb-tk-group-header">⚙ Configuration</div>
                <button class="pfb-tk-btn danger" id="pfb-reset-config">🔄 Reset to Defaults</button>
            </div>
        `;

        // Export config
        document.getElementById('pfb-export-config').onclick = exportConfig;

        // Import config
        document.getElementById('pfb-import-config').onchange = (e) => {
            if (e.target.files[0]) {
                importConfig(e.target.files[0]);
            }
        };

        // Health check
        document.getElementById('pfb-health-check').onclick = async () => {
            const resultDiv = document.getElementById('pfb-diagnostics-result');
            const btn = document.getElementById('pfb-health-check');
            btn.disabled = true;
            btn.textContent = '🏥 Checking...';
            resultDiv.innerHTML = '<div class="pfb-tk-note">Checking URLs (this may take a while)...</div>';

            try {
                const results = await checkAllUrlsHealth((done, total, current) => {
                    resultDiv.innerHTML = `<div class="pfb-tk-note">Checking ${done}/${total}: ${current}</div>`;
                });

                let html = `<div class="pfb-diagnostics-summary">`;
                html += `<div class="diag-ok">OK: ${results.ok.length}</div>`;
                if (results.timeout.length) {
                    html += `<div class="diag-warn">Timeout: ${results.timeout.length}</div>`;
                }
                if (results.failed.length) {
                    html += `<div class="diag-error">Failed: ${results.failed.length}</div>`;
                }
                html += `</div>`;

                if (results.failed.length || results.timeout.length) {
                    html += `<div class="pfb-diagnostics-details">`;
                    [...results.failed, ...results.timeout].slice(0, 10).forEach(r => {
                        html += `<div class="diag-item">${r.name} (${r.group})</div>`;
                    });
                    if (results.failed.length + results.timeout.length > 10) {
                        html += `<div class="diag-item">...and ${results.failed.length + results.timeout.length - 10} more</div>`;
                    }
                    html += `</div>`;
                }

                resultDiv.innerHTML = html;
            } catch (err) {
                resultDiv.innerHTML = `<div class="pfb-tk-note" style="color:#ef4444;">Error: ${err.message}</div>`;
            }

            btn.disabled = false;
            btn.textContent = '🏥 Check URL Health';
        };

        // Find duplicates
        document.getElementById('pfb-find-duplicates').onclick = () => {
            const resultDiv = document.getElementById('pfb-diagnostics-result');
            const duplicates = findDuplicates();

            if (duplicates.length === 0) {
                resultDiv.innerHTML = '<div class="pfb-tk-note" style="color:#10b981;">No duplicate URLs found!</div>';
                return;
            }

            let html = `<div class="pfb-diagnostics-summary"><div class="diag-warn">Found ${duplicates.length} duplicates</div></div>`;
            html += `<div class="pfb-diagnostics-details">`;
            duplicates.slice(0, 10).forEach(d => {
                html += `<div class="diag-item">${d.name}: ${d.groups.join(' & ')}</div>`;
            });
            if (duplicates.length > 10) {
                html += `<div class="diag-item">...and ${duplicates.length - 10} more</div>`;
            }
            html += `</div>`;
            resultDiv.innerHTML = html;
        };

        document.getElementById('pfb-clear-logs').onclick = () => {
            if (isRunning) {
                stopLogClear();
            } else {
                setAutoStartFlag();
                showToast('Navigating to clear logs...', 'info');
                window.location.href = `https://${window.location.host}${CONFIG.LOG_PAGE}`;
            }
        };

        document.getElementById('pfb-goto-alerts').onclick = () => {
            window.location.href = CONFIG.REDIRECT_URL;
        };

        document.getElementById('pfb-goto-dnsbl').onclick = () => {
            window.location.href = `${CONFIG.CATEGORY_PATH}?type=dnsbl`;
        };

        document.getElementById('pfb-goto-ipv4').onclick = () => {
            window.location.href = `${CONFIG.CATEGORY_PATH}?type=ipv4`;
        };

        document.getElementById('pfb-reset-config').onclick = () => {
            if (confirm('Reset all toolkit settings to defaults?')) {
                GM_deleteValue(CONFIG.AUTOMATION_CONFIG_KEY);
                automationConfig = JSON.parse(JSON.stringify(BLOCKLIST_DEFAULTS));
                showToast('Configuration reset!', 'success');
                renderTabContent();
            }
        };
    }

    // =========================================================================
    // STYLES
    // =========================================================================
    GM_addStyle(`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

        #pfb-ultimate-toolkit {
            position: fixed;
            z-index: 99999;
            width: 320px;
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            background: linear-gradient(145deg, #1e293b 0%, #0f172a 100%);
            border: 1px solid rgba(99, 179, 237, 0.3);
            border-radius: 12px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.5), 0 0 40px rgba(99, 179, 237, 0.1);
            overflow: hidden;
            transition: all 0.3s ease;
        }

        #pfb-ultimate-toolkit.collapsed .pfb-tk-body { display: none; }
        #pfb-ultimate-toolkit.collapsed { width: auto; }

        .pfb-tk-header {
            background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
            padding: 12px 16px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            cursor: move;
            user-select: none;
        }

        .pfb-tk-title {
            display: flex;
            align-items: center;
            gap: 8px;
            color: white;
            font-weight: 600;
            font-size: 14px;
        }

        .pfb-tk-icon { font-size: 18px; }
        .pfb-tk-version {
            font-size: 10px;
            background: rgba(255,255,255,0.2);
            padding: 2px 6px;
            border-radius: 4px;
        }

        .pfb-tk-ctrl-btn {
            background: rgba(255,255,255,0.15);
            border: none;
            border-radius: 6px;
            width: 28px;
            height: 28px;
            color: white;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: background 0.2s;
        }

        .pfb-tk-ctrl-btn:hover { background: rgba(255,255,255,0.25); }

        .pfb-tk-body {
            max-height: calc(100vh - 200px);
            overflow-y: auto;
        }

        .pfb-tk-body::-webkit-scrollbar { width: 6px; }
        .pfb-tk-body::-webkit-scrollbar-thumb { background: rgba(99, 179, 237, 0.3); border-radius: 3px; }

        .pfb-tk-tabs {
            display: flex;
            background: rgba(0,0,0,0.3);
            padding: 8px;
            gap: 4px;
        }

        .pfb-tk-tab {
            flex: 1;
            padding: 8px 12px;
            background: transparent;
            border: none;
            color: #94a3b8;
            font-size: 11px;
            font-weight: 600;
            cursor: pointer;
            border-radius: 6px;
            transition: all 0.2s;
        }

        .pfb-tk-tab:hover { background: rgba(255,255,255,0.05); color: #e2e8f0; }
        .pfb-tk-tab.active { background: #3b82f6; color: white; }

        .pfb-tk-content { padding: 12px; }

        .pfb-tk-section {
            margin-bottom: 12px;
            display: flex;
            flex-direction: column;
            gap: 6px;
        }

        .pfb-tk-group-header {
            font-size: 11px;
            font-weight: 700;
            color: #63b3ed;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            padding: 8px 0 4px;
            border-bottom: 1px solid rgba(99, 179, 237, 0.2);
            margin-bottom: 6px;
        }

        .pfb-tk-btn {
            width: 100%;
            padding: 10px 14px;
            border: none;
            border-radius: 8px;
            font-size: 12px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
            background: rgba(255,255,255,0.08);
            color: #e2e8f0;
        }

        .pfb-tk-btn:hover:not(:disabled) { background: rgba(255,255,255,0.12); transform: translateY(-1px); }
        .pfb-tk-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .pfb-tk-btn.primary { background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; }
        .pfb-tk-btn.primary:hover { box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4); }
        .pfb-tk-btn.danger { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; }
        .pfb-tk-btn.warning { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; }
        .pfb-tk-btn.toggle.active { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; }

        /* Preset Grid Styles */
        .pfb-preset-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 6px;
        }

        .preset-btn {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 10px 8px !important;
            min-height: 60px;
            text-align: center;
            border: 1px solid rgba(99, 179, 237, 0.2) !important;
        }

        .preset-btn:hover {
            border-color: rgba(99, 179, 237, 0.5) !important;
            background: rgba(59, 130, 246, 0.15) !important;
        }

        .preset-btn.active {
            background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%) !important;
            border-color: #3b82f6 !important;
            color: white !important;
        }

        .preset-icon {
            font-size: 18px;
            line-height: 1;
            margin-bottom: 4px;
        }

        .preset-name {
            font-size: 11px;
            font-weight: 600;
        }

        .preset-count {
            font-size: 9px;
            opacity: 0.7;
            margin-top: 2px;
        }

        .pfb-tk-checkbox {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 8px 10px;
            background: rgba(255,255,255,0.03);
            border-radius: 6px;
            cursor: pointer;
            font-size: 12px;
            color: #e2e8f0;
            transition: background 0.2s;
        }

        .pfb-tk-checkbox:hover { background: rgba(255,255,255,0.06); }
        .pfb-tk-checkbox input { accent-color: #10b981; width: 16px; height: 16px; }
        .pfb-tk-checkbox .list-count {
            margin-left: auto;
            font-size: 10px;
            background: rgba(100, 116, 139, 0.3);
            padding: 2px 6px;
            border-radius: 4px;
            color: #94a3b8;
        }

        .pfb-tk-note {
            font-size: 11px;
            color: #94a3b8;
            text-align: center;
            padding: 8px;
            margin: 0;
        }

        /* Search Input */
        .pfb-search-input {
            width: 100%;
            padding: 8px 12px;
            background: rgba(0,0,0,0.3);
            border: 1px solid rgba(99, 179, 237, 0.2);
            border-radius: 6px;
            color: #e2e8f0;
            font-size: 12px;
            outline: none;
            transition: border-color 0.2s;
        }
        .pfb-search-input:focus {
            border-color: #3b82f6;
        }
        .pfb-search-input::placeholder {
            color: #64748b;
        }

        /* Collapsible Groups */
        .pfb-group-wrapper {
            margin-bottom: 4px;
        }
        .pfb-expand-btn {
            background: none;
            border: none;
            color: #64748b;
            cursor: pointer;
            padding: 4px 8px;
            font-size: 10px;
            margin-left: auto;
            transition: color 0.2s;
        }
        .pfb-expand-btn:hover {
            color: #3b82f6;
        }
        .pfb-tk-checkbox .group-name {
            flex: 1;
        }
        .pfb-list-details {
            display: none;
            margin-left: 26px;
            padding: 4px 0;
            border-left: 2px solid rgba(99, 179, 237, 0.2);
            margin-top: 2px;
        }
        .pfb-list-details.expanded {
            display: block;
        }
        .pfb-list-item {
            display: flex;
            align-items: center;
            padding: 3px 8px;
            font-size: 10px;
            color: #94a3b8;
            gap: 6px;
        }
        .pfb-list-item:hover {
            background: rgba(255,255,255,0.03);
        }
        .pfb-list-item .list-name {
            flex: 1;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
        .pfb-list-item .list-link {
            color: #64748b;
            text-decoration: none;
            font-size: 12px;
        }
        .pfb-list-item .list-link:hover {
            color: #3b82f6;
        }

        /* Progress Bar */
        .pfb-progress-section {
            background: rgba(59, 130, 246, 0.1);
            border: 1px solid rgba(59, 130, 246, 0.3);
            border-radius: 8px;
            padding: 12px;
            margin-bottom: 12px;
        }
        .pfb-progress-header {
            font-size: 11px;
            font-weight: 600;
            color: #63b3ed;
            margin-bottom: 8px;
        }
        .pfb-progress-bar-bg {
            height: 8px;
            background: rgba(0,0,0,0.3);
            border-radius: 4px;
            overflow: hidden;
            margin-bottom: 6px;
        }
        .pfb-progress-bar {
            height: 100%;
            background: linear-gradient(90deg, #3b82f6, #10b981);
            border-radius: 4px;
            transition: width 0.3s ease;
        }
        .pfb-progress-text {
            font-size: 10px;
            color: #94a3b8;
            text-align: center;
            margin-bottom: 8px;
        }

        /* Memory Estimate */
        .pfb-memory-estimate {
            background: rgba(16, 185, 129, 0.1);
            border: 1px solid rgba(16, 185, 129, 0.3);
            border-radius: 6px;
            padding: 8px 12px;
            font-size: 11px;
            color: #10b981;
            text-align: center;
        }
        .pfb-memory-estimate.warning {
            background: rgba(245, 158, 11, 0.1);
            border-color: rgba(245, 158, 11, 0.3);
            color: #f59e0b;
        }

        /* Diagnostics Results */
        .pfb-diagnostics-summary {
            display: flex;
            gap: 8px;
            margin-top: 8px;
            flex-wrap: wrap;
        }
        .pfb-diagnostics-summary > div {
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 10px;
            font-weight: 600;
        }
        .diag-ok {
            background: rgba(16, 185, 129, 0.2);
            color: #10b981;
        }
        .diag-warn {
            background: rgba(245, 158, 11, 0.2);
            color: #f59e0b;
        }
        .diag-error {
            background: rgba(239, 68, 68, 0.2);
            color: #ef4444;
        }
        .pfb-diagnostics-details {
            margin-top: 8px;
            max-height: 150px;
            overflow-y: auto;
            background: rgba(0,0,0,0.2);
            border-radius: 4px;
            padding: 4px;
        }
        .diag-item {
            font-size: 9px;
            color: #94a3b8;
            padding: 2px 6px;
            border-bottom: 1px solid rgba(255,255,255,0.05);
        }
        .diag-item:last-child {
            border-bottom: none;
        }

        tr[data-pfb-hidden="true"] { display: none !important; }
    `);

    // =========================================================================
    // INITIALIZATION
    // =========================================================================
    async function initialize() {
        // Load configs
        loadAutomationConfig();

        const stored = await storage.get({
            [CONFIG.KEY_FILTER_STATE]: filters,
            [CONFIG.KEY_HIDDEN_ITEMS]: [],
            [CONFIG.KEY_HIDDEN_DOMAINS]: [],
            [CONFIG.KEY_PANEL_POSITION]: { x: 10, y: 100 },
            [CONFIG.KEY_PANEL_COLLAPSED]: false,
            [CONFIG.KEY_ACTIVE_TAB]: 'automation',
            [CONFIG.KEY_CONDENSE_VIEW]: false
        });

        filters = { ...filters, ...stored[CONFIG.KEY_FILTER_STATE] };
        hiddenItems = new Set(stored[CONFIG.KEY_HIDDEN_ITEMS]);
        hiddenDomains = new Set(stored[CONFIG.KEY_HIDDEN_DOMAINS]);
        panelPosition = stored[CONFIG.KEY_PANEL_POSITION];
        isPanelCollapsed = stored[CONFIG.KEY_PANEL_COLLAPSED];
        activeTab = stored[CONFIG.KEY_ACTIVE_TAB];
        isCondensedView = stored[CONFIG.KEY_CONDENSE_VIEW];

        // Load new feature state
        try {
            const savedExpanded = GM_getValue(CONFIG.EXPANDED_GROUPS_KEY, []);
            expandedGroups = new Set(savedExpanded);

            const savedHealth = GM_getValue(CONFIG.URL_HEALTH_CACHE_KEY, '{}');
            urlHealthCache = JSON.parse(savedHealth);
        } catch (e) {
            expandedGroups = new Set();
            urlHealthCache = {};
        }

        // Wait for DOM
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', onDOMReady);
        } else {
            onDOMReady();
        }
    }

    function onDOMReady() {
        const path = window.location.pathname;

        // Handle automation pages - EDIT PAGE
        if (path.startsWith(CONFIG.EDIT_PATH) || path.includes('pfblockerng_category_edit')) {
            // Check if we just saved and need to redirect back to category page
            if (sessionStorage.getItem(CONFIG.SUCCESS_FLAG_KEY) === 'true') {
                sessionStorage.removeItem(CONFIG.SUCCESS_FLAG_KEY);

                const queueJson = sessionStorage.getItem(CONFIG.PFB_QUEUE_KEY);
                let queue = [];
                try { queue = queueJson ? JSON.parse(queueJson) : []; } catch {}

                // Determine the type from URL or queue
                const urlType = new URLSearchParams(window.location.search).get('type');
                const nextType = queue.length > 0 ? queue[0].type : urlType;

                if (queue.length > 0) {
                    showToast(`Saved! Processing next: ${queue[0].name}...`, 'success');
                } else {
                    showToast('Group saved! Returning to list...', 'success');
                }

                // Redirect back to category page
                setTimeout(() => {
                    window.location.href = `${CONFIG.CATEGORY_PATH}?type=${nextType || 'dnsbl'}`;
                }, CONFIG.REDIRECT_DELAY_MS);
                return; // Don't run other edit page logic
            }

            // Normal edit page - check if we need to fill the form
            autoFillOnPageLoad();
        }

        // Handle CATEGORY PAGE
        if (path === CONFIG.CATEGORY_PATH || path.includes('pfblockerng_category.php')) {
            handleSaveSuccess();
            const queue = sessionStorage.getItem(CONFIG.PFB_QUEUE_KEY);
            if (queue) {
                try {
                    const parsed = JSON.parse(queue);
                    if (parsed.length > 0) {
                        processNextGroup();
                    }
                } catch {}
            }
        }

        // Handle log clearing
        if (path.includes(CONFIG.LOG_PAGE)) {
            resumeLogClear();
        }

        // Handle alerts page
        if (path.includes(CONFIG.ALERTS_PAGE)) {
            applyCondenseView();
            logTableBody = document.querySelector('div.panel-body table[data-sortable] tbody');
            if (logTableBody) {
                applyFilters();
                observeLogs();
            } else {
                const obs = new MutationObserver((_, o) => {
                    logTableBody = document.querySelector('div.panel-body table[data-sortable] tbody');
                    if (logTableBody) {
                        applyFilters();
                        observeLogs();
                        o.disconnect();
                    }
                });
                obs.observe(document.body, { childList: true, subtree: true });
            }
        }

        // Build main panel on pfBlockerNG pages
        if (path.includes('/pfblockerng/')) {
            // Apply professional theme
            applyProfessionalTheme();

            buildMainPanel();
            // Restore active tab
            const tabBtn = document.querySelector(`.pfb-tk-tab[data-tab="${activeTab}"]`);
            if (tabBtn) {
                document.querySelectorAll('.pfb-tk-tab').forEach(t => t.classList.remove('active'));
                tabBtn.classList.add('active');
                renderTabContent();
            }
        }

        // Clear flags on non-pfblocker pages
        if (!path.includes('/pfblockerng/')) {
            sessionStorage.removeItem(CONFIG.FILL_DATA_KEY);
            sessionStorage.removeItem(CONFIG.FILL_GROUP_KEY);
            sessionStorage.removeItem(CONFIG.PFB_QUEUE_KEY);
        }
    }

    // Start
    initialize();

})(typeof jQuery !== 'undefined' ? jQuery : null);