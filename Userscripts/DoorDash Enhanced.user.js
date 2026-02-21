// ==UserScript==
// @name         DoorDash Enhanced
// @namespace    https://github.com/SysAdminDoc
// @version      2.8.0
// @description  Comprehensive DoorDash enhancer: dark mode (always-on), ad/promo blocking, fee transparency, UI cleanup, and more. Performance-optimized single-observer architecture.
// @author       SysAdminDoc
// @match        https://www.doordash.com/*
// @match        https://doordash.com/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @run-at       document-start
// @icon         data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAOEAAADhCAMAAAAJbSJIAAAAyVBMVEX/////MAj///7xj374JADunIj//f//LQD/7+n9////JADwRCn/LwX///z9MAj75dvnKwD7//v/+/b6//vvHgDzJgD/8OX///j2GwD6MwX/9u32wLf1u7XtJAD/LQ3sLwD1pprzj3/ylYT4ppT9s6P639T5z8DmOA3oRCbtZVDsOhvwbVjvsqH10sbwf2boblnqemnxqZPnXED93c32vavuoYnqhW7xmYPvYUfrTTb2xb3qXDvqlYrphXXlOBroZkv/6uvlcFToTzpo9Jb4AAAIc0lEQVR4nO2cC1fbOhLHZUVIllfjxEkcJ2FtHi2Q8CiXR3vb3nsLy/f/UDtjh245W2IIlk3OmR+0h/a0sf+WNC+NLATDMAzDMAzDMAzDMAzDMAzDMAzDMAzDMAzDMAzDMAzDMAzDMAzDMAzDMM1j8Qt/t94vJKEELyVBer/aL0AGidR4Xe+sLqiFtAn4f6K/gg81aUHhSqcUWrcqD0cvgRavKWkwIUlau6CwWoPQLazDR+QvM7YVEiBT0+ol2xUoNPT3e72DXlsc7nz4uHs0H7Yo8fhkGqmoPZSa5oPF8mC3DzicCa4SMj9Ac9ePNRgulAti54IWcc4YlZ+enU9KWQl6ELTnvrzkxdi5IjZtClzJNCY9+XSRZUlleQAtgi+FQRwX7SuMYxcU0fjyQtJkBZqtfiSGe8bF7etDhTiM8Sw26R9HaO/kCBV6mqbnuQvcrBORpQFwanA1tDJJfK1DDVfjoP1RLE1bXH2b9PoG0OB4UohR9xWNYlAErQ6k++UnZwa3ZdQB0mIE2XBAkGib7Y9djAu/k5laYfLPmRgByoNENByz4vrW4gNKJIvanUaTfsHFiBGyGDWrT1Aqg2vgQ+ocuozOFLqimH4aYmwjKRVoVqEUo0RLnKimG3u6oojjKY6izmTjmQeIBGeHhp1xOYodEc/QuE57mQWwSdasQotuSOPkIIndDWJMjjEYX2F0Q9OqYSjExyUud1KHgVQctBqEP8HsHVOhyo9fTDRkO1MS2OVqNIsQmnYWj1ApQ9BaLLoUWUT/ZOCpZqTRRqPEtEDf3908jV2+27i3WGExP8OJ+nc+m3UljxQG5mHuKYkCWToN+Semi506xvRj81FNBUVM6G3hcOq6HMXAnYS+SnGYZVt6eodpUDqNVYbTLvhwpx/wcZelGy8yKdM4nGIIPuvG2mCCYxZztAm4GD2li/TZB1N8lh0MIHoLNOUuvaUCHPiqaWhcjNBLg45imwIfrPuaaUqk/GAxgLOj7BADuJZrqCX0WOM4v8BBBE8SQVsMb+ywN43LZd+ywBnF4IHqoV2HhjOMRzDTsFpqDV8o0+hgntLUMd/meCOexhDnP0Y3ADrrTUlgk1OVfFBZXSvWlKBjqvvlmGJ4cvuPgLDDw2lV6m9KYvwYKZVzY+2nqj+97/eR88/OB2pV1GxMY1yNUZ0VM9cgPEWnj1CeAdDvnY6VUqlqEEPV0VlNVc8M+mhMvSoU2YiiJju/OL/6vNMcvbNFXjdFETe+JYvuVSGG4FokzVa9aDMdwu/Lca2rddGO8LwSdbm1D1QU0k3Fh+Umr7Z2+Dk3dYs7+gTl5f0hQevHbUtJtaEGoGdFn2XF7l6NwthcD1tuZ2gQnP6wn9asRLMIMc3p+lY3hGLq4V81u+pmcOSr5NYCgGb6drxeoUsvRMutb02Ca3F4un4QnTreYoVaJiK7jNYPotr1a0p9Iinqhb9VjcJ/b69CKCu+6xXGpLDVLttGoQ1C+KduHe6K7R1ESrKz65qwTX3v+jY3h0I36Oc1Y5get9wR2iCS9pYOp+vH0OQ3oummk/aALOkPzPrA1Pzob+8Y4o3P79T6joHYfJt3qc8CAJpDDP7p++fXkx8f//jzr8uOJ/x/+FeTS+XWJxcuustsl+5CWqjC4tcdQxBlnR6Ov1G5ee0kDaKe7NBbgCxDxvC1TCb39/dHH8/yyNUMYRBPb7tSV2JFpr8v/7UJp3u5os6kuMaUDo58NX2/BI0z9HigzEZQkbmobYYwi8x6riauJRN6aah+/UpWVoR2XmsWYnQghfTV9v0CJHVOb1InrrpmY1fXe+Xy72hJfRdM15DA/AcqdNSn5Yx7KdX4VdOzxt8vQjS93cU0uECg6p4K6oz+BuBHFqonki7dIXpDMbyMylb7xiXG8Swo9i6qB9kh1s7/Qyls0fwg4iI1S8yS2z7+9VQfNd7M71KMLZveQqVDJnG6W7YpdKkQKGgLL5WHFj/8SPOQoUJf/XsvAdchaKvl/Kyucr2BQFQ43sWoHrPI7irCtNOvaZc4XKqfY9iQVlqFd0Bxr+y+5o3LZH6pqsfeWE8DOtj8psOI9AkZPurwTFGM0pzTKGK1A936if8hNa6UkJJZvK+mOm9icx2+mwINZesZzK9T15zTcIbaocQ7maU2KVM4NDeusX4NN963nvd+X0WCnl+IybIxp+FUD/2Er6OkG2CtzHAYw2X0Jonx6vfYqbO50PCOFK5AvxgFb5ioMR0JwszfRdeTrrX8DgAJuBZnpdMIXn1uquySqp6OevDW4P0mML4ZiXsyN26zTKNq4isCtZy8F1f/FKqEZhA+UDK10XLE6UnudHoZyi6j7TVgmIoyw68bOg06uDoLzPhwCN5b2TaEDkwBOQ210eE+jPhmTp2eS/luFVZOQ8jwa/Qqha6sgtBPZnp3Q41m1MLwnrHhQ0R37OoLVG51GL88tGqiwc6865t/CVpm6DTKeVc/eNU/Ixsaq/yPo63IIZT0Dpb7a0X++wVOERdfmY6o/PIY46JtUEhOA2CCTuOF9gbnqFH5lxst7CjbivYnSeUbO7mbGlOsP6jh3GzmTKTyv6761f/1dvKgSdAQgkaVw/1FHj1f6S/3nyKV7i3Oro5oE5ReFNf8CXwfWHpbIL3WQoT7Z4uTwXOc/Pi2vDw4P5rQv7dV/7Gns9vewCAu7D/LZBJSUtnpJv2boEKuHY2eL1hTCl++IG4LVt5vqc4Mal32dYvVr/KLvqsjhav3XnV7o2+AXrz2zHHz8nWCICuzsgW25feghGff9wQ4jJIcg279xYLNQTdOJf/fIavXGmw5Eh47ov4fm1Suoe1XXzIMwzAMwzAMwzAMwzAMwzAMwzAMwzAMwzAMwzAMwzAMwzAMwzAMwzAM84T/AnqWqa1aUynCAAAAAElFTkSuQmCC
// @downloadURL  https://github.com/SysAdminDoc/Doordash-Enhanced/raw/refs/heads/main/DoorDashEnhanced.user.js
// @updateURL    https://github.com/SysAdminDoc/Doordash-Enhanced/raw/refs/heads/main/DoorDashEnhanced.user.js
// @license      MIT
// ==/UserScript==

(function() {
    'use strict';

    var SCRIPT_ID = 'dd-enhanced';
    var VERSION   = '2.8.0';

    // =================================================================
    //  FIX #13: Anti-FOUC - set dark bg on <html> before anything loads
    // =================================================================
    document.documentElement.style.setProperty('background-color', '#111118', 'important');
    document.documentElement.style.setProperty('color-scheme', 'dark', 'important');

    var DEFAULT_SETTINGS = {
        blockDashPassPromos: true,
        blockPopups:         true,
        blockSponsoredCards: true,
        feeHighlighter:      true,
        hideHeroCarousel:    false,
        cleanFooter:         true,
        quickSearch:         true,
        priceCalculator:     true,
        wideLayout:          false,
        stickyCart:          true,
        autoExpandFees:      true,
        hideTurnstile:       true,
        visualFlair:         true,
        hideElectronics:     true,
        tipDefault:          'off',
        checkoutFlair:       true,
        storePolish:         true,
    };

    function getSetting(key) { return GM_getValue(SCRIPT_ID + '_' + key, DEFAULT_SETTINGS[key]); }
    function setSetting(key, val) { GM_setValue(SCRIPT_ID + '_' + key, val); }


    // =====================================================================
    //  SHARED OBSERVER ENGINE - Single MutationObserver, debounced dispatch
    //
    //  Instead of 9+ separate MutationObservers all firing on every DOM
    //  change, we use ONE observer that collects added nodes and dispatches
    //  them to registered handlers via requestAnimationFrame batching.
    //  This prevents the page lockups seen during order status transitions.
    // =====================================================================
    var _sharedCallbacks = [];
    var _sharedObserver = null;
    var _pendingNodes = [];
    var _rafScheduled = false;
    var PENDING_NODES_CAP = 200; // FIX #6: cap pending nodes

    function _flushPending() {
        _rafScheduled = false;
        if (_pendingNodes.length === 0 || _sharedCallbacks.length === 0) {
            _pendingNodes = [];
            return;
        }
        var nodes = _pendingNodes;
        _pendingNodes = [];
        var cbs = _sharedCallbacks;
        for (var c = 0; c < cbs.length; c++) {
            var cb = cbs[c];
            if (!cb) continue;
            try {
                for (var n = 0; n < nodes.length; n++) {
                    cb(nodes[n]);
                }
            } catch(e) { /* silent */ }
        }
    }

    function _onMutations(mutations) {
        for (var i = 0; i < mutations.length; i++) {
            var added = mutations[i].addedNodes;
            for (var j = 0; j < added.length; j++) {
                if (added[j].nodeType === 1) {
                    _pendingNodes.push(added[j]);
                }
            }
        }
        // FIX #6: if mutation storm overflows, keep only the latest batch
        if (_pendingNodes.length > PENDING_NODES_CAP) {
            _pendingNodes = _pendingNodes.slice(-PENDING_NODES_CAP);
        }
        if (_pendingNodes.length > 0 && !_rafScheduled) {
            _rafScheduled = true;
            requestAnimationFrame(_flushPending);
        }
    }

    function _ensureSharedObserver() {
        if (_sharedObserver) return;
        _sharedObserver = new MutationObserver(_onMutations);
        function attach() {
            if (document.body) {
                _sharedObserver.observe(document.body, { childList: true, subtree: true });
            }
        }
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', attach);
        } else {
            attach();
        }
    }

    // FIX #2: Compact null entries periodically instead of leaking
    var _compactCounter = 0;
    function registerObserverHandler(callback) {
        _ensureSharedObserver();
        _sharedCallbacks.push(callback);
        // Compact every 20 registrations
        _compactCounter++;
        if (_compactCounter >= 20) {
            _compactCounter = 0;
            _sharedCallbacks = _sharedCallbacks.filter(function(cb) { return cb !== null; });
        }
        return {
            disconnect: function() {
                var idx = _sharedCallbacks.indexOf(callback);
                if (idx !== -1) _sharedCallbacks[idx] = null;
            }
        };
    }

    // FIX #11: Cancelable throttle - returns object with .call() and .cancel()
    function throttle(fn, interval) {
        var last = 0, timer = null;
        function invoke() {
            var now = Date.now();
            if (now - last >= interval) {
                last = now;
                fn();
            } else if (!timer) {
                timer = setTimeout(function() {
                    last = Date.now();
                    timer = null;
                    fn();
                }, interval - (now - last));
            }
        }
        invoke.cancel = function() {
            if (timer) { clearTimeout(timer); timer = null; }
        };
        return invoke;
    }


    // =====================================================================
    //  FEATURES
    // =====================================================================
    var features = [

        // -- WIDE LAYOUT --------------------------------------------------
        {
            key: 'wideLayout',
            name: 'Wide Layout',
            group: 'Appearance',
            desc: 'Use full browser width for content',
            styleId: SCRIPT_ID + '-wide',
            init: function() {
                injectStyle(this.styleId,
                    '[data-testid="ThemingWrapper"] > div > div { max-width: 100% !important; padding-left: 24px !important; padding-right: 24px !important; }'
                );
            },
            destroy: function() { removeStyle(this.styleId); }
        },

        // -- BLOCK DASHPASS PROMOS ----------------------------------------
        {
            key: 'blockDashPassPromos',
            name: 'Block DashPass Promos',
            group: 'Ad Blocking',
            desc: 'Hide DashPass upsell banners and promotions',
            styleId: SCRIPT_ID + '-dashpass',
            init: function() {
                injectStyle(this.styleId, [
                    '[data-testid*="dashpass" i],',
                    '[data-testid*="DashPass" i],',
                    '[data-testid="homepage-banner-button"],',
                    '[data-testid="homepage-banner-link"],',
                    '[aria-label*="DashPass" i],',
                    'a[href*="dashpass"],',
                    'a[href*="/consumer/membership"] {',
                    '  display: none !important;',
                    '}',
                ].join('\n'));
                var dashpassRe = /(try dashpass|get dashpass|join dashpass|dashpass free|free.{0,10}delivery.{0,10}30 days|upgrade to dashpass)/i;
                this._obs = registerObserverHandler(function(node) {
                    var text = node.textContent || '';
                    if (text.length < 5 || text.length > 250) return;
                    if (node.querySelector && node.querySelector('[data-testid="card.store"], [data-anchor-id="StoreCard"]')) return;
                    if (node.querySelectorAll && node.querySelectorAll('a[href]').length > 6) return;
                    if (dashpassRe.test(text)) {
                        node.style.setProperty('display', 'none', 'important');
                    }
                });
            },
            destroy: function() { removeStyle(this.styleId); if (this._obs) this._obs.disconnect(); }
        },

        // -- BLOCK POPUPS -------------------------------------------------
        {
            key: 'blockPopups',
            name: 'Block Popups & Overlays',
            group: 'Ad Blocking',
            desc: 'Auto-close promotional modals and sheets',
            init: function() {
                var promoRe = /(dashpass|free delivery|sign up|promo|get \$|% off your|exclusive offer|limited.time)/i;
                this._obs = registerObserverHandler(function(node) {
                    if (!node.matches || !node.matches('[data-testid="LAYER-MANAGER-MODAL"], [data-testid="LAYER-MANAGER-SHEET"]')) return;
                    var inner = node.querySelector('[data-testid="overlay-content"]');
                    if (!inner) return;
                    var text = inner.textContent || '';
                    if (text.length < 500 && promoRe.test(text)) {
                        var btn = node.querySelector('button[aria-label="Close"], button[aria-label="close"], [data-testid*="close" i]');
                        if (btn) btn.click(); else node.style.setProperty('display', 'none', 'important');
                    }
                });
            },
            destroy: function() { if (this._obs) this._obs.disconnect(); }
        },

        // -- BLOCK SPONSORED ----------------------------------------------
        {
            key: 'blockSponsoredCards',
            name: 'Hide Sponsored Listings',
            group: 'Ad Blocking',
            desc: 'Remove sponsored/promoted store cards, carousels, and retail items',
            styleId: SCRIPT_ID + '-nosponsor',
            init: function() {
                injectStyle(this.styleId, '.' + SCRIPT_ID + '-sponsored-hidden { display: none !important; }');

                var self = this;
                var hiddenClass = SCRIPT_ID + '-sponsored-hidden';

                function isCardBoundary(el) {
                    if (!el) return false;
                    var tid = (el.dataset && (el.dataset.testid || '')) || '';
                    if (/^sc-615f47d9-2\b/.test(el.className || '') ||
                        /sc-2c225cf6-\d/.test(el.className || '')) return true;
                    if (tid === 'RetailItemCardCardContent') return true;
                    if (tid === 'LegoStandardCarouselContainer') return true;
                    if (/sc-51d1bf93-0\b/.test(el.className || '') && el.style && el.style.minHeight) return true;
                    return false;
                }

                function hideSponsored(root) {
                    if (!root || !root.querySelectorAll) return;
                    var walker = document.createTreeWalker(
                        root, NodeFilter.SHOW_TEXT,
                        { acceptNode: function(n) {
                            return n.textContent.trim() === 'Sponsored' ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
                        }}
                    );
                    var node;
                    while ((node = walker.nextNode())) {
                        var el = node.parentElement;
                        if (!el) continue;
                        var p = el;
                        for (var i = 0; i < 25 && p && p !== document.body; i++) {
                            if (isCardBoundary(p)) {
                                if (!p.classList.contains(hiddenClass)) {
                                    p.classList.add(hiddenClass);
                                }
                                break;
                            }
                            p = p.parentElement;
                        }
                    }
                }

                function fullSweep() { hideSponsored(document.body); }

                // FIX #5: Scope TreeWalker to added node first, full sweep only on timer
                self._throttledSweep = throttle(fullSweep, 800);
                fullSweep();
                self._obs = registerObserverHandler(function(node) {
                    // Quick check: only process if added node might contain sponsored text
                    var text = node.textContent || '';
                    if (text.indexOf('Sponsored') !== -1) {
                        hideSponsored(node);
                    }
                });
                self._timer = setInterval(fullSweep, 3000);
            },
            destroy: function() {
                removeStyle(this.styleId);
                if (this._obs) this._obs.disconnect();
                if (this._timer) clearInterval(this._timer);
                if (this._throttledSweep) this._throttledSweep.cancel();
                document.querySelectorAll('.' + SCRIPT_ID + '-sponsored-hidden').forEach(function(el) {
                    el.classList.remove(SCRIPT_ID + '-sponsored-hidden');
                });
            }
        },

        // -- FEE HIGHLIGHTER (checkout/cart only) -------------------------
        {
            key: 'feeHighlighter',
            name: 'Fee Highlighter',
            group: 'Transparency',
            desc: 'Color-code fees on checkout page',
            styleId: SCRIPT_ID + '-fees',
            init: function() {
                injectStyle(this.styleId, feeHighlighterCSS());
                this._throttled = throttle(annotateFees, 500);
                this._obs = registerObserverHandler(this._throttled);
                annotateFees();
            },
            destroy: function() {
                removeStyle(this.styleId);
                if (this._obs) this._obs.disconnect();
                if (this._throttled) this._throttled.cancel();
                document.querySelectorAll('.' + SCRIPT_ID + '-fee-tag').forEach(function(t) { t.remove(); });
                document.querySelectorAll('[data-' + SCRIPT_ID + '-tagged]').forEach(function(el) { el.removeAttribute('data-' + SCRIPT_ID + '-tagged'); });
            }
        },

        // -- AUTO-EXPAND FEES ---------------------------------------------
        {
            key: 'autoExpandFees',
            name: 'Auto-Expand Fee Details',
            group: 'Transparency',
            desc: 'Automatically expand fee breakdowns on checkout',
            init: function() {
                this._obs = registerObserverHandler(function(node) {
                    // FIX #7: Short-circuit with URL check before expensive querySelector
                    if (!/\/checkout/i.test(location.pathname)) return;
                    var buttons = node.querySelectorAll ? node.querySelectorAll('button') : [];
                    buttons.forEach(function(btn) {
                        if (/fees.*estimated.*tax|estimated.*tax.*fees/i.test(btn.textContent || '') &&
                            btn.getAttribute('aria-expanded') === 'false') btn.click();
                    });
                });
            },
            destroy: function() { if (this._obs) this._obs.disconnect(); }
        },

        // -- PRICE CALCULATOR ---------------------------------------------
        {
            key: 'priceCalculator',
            name: 'Running Price Calculator',
            group: 'Utilities',
            desc: 'Show estimated total while browsing a store menu',
            init: function() {
                this._loop = setInterval(function() {
                    if (!isStorePage()) { var el = document.getElementById(SCRIPT_ID + '-calc'); if (el) el.remove(); return; }
                    updatePriceCalc();
                }, 2000);
            },
            onNavigate: function() { if (!isStorePage()) { var el = document.getElementById(SCRIPT_ID + '-calc'); if (el) el.remove(); } },
            destroy: function() { clearInterval(this._loop); var el = document.getElementById(SCRIPT_ID + '-calc'); if (el) el.remove(); }
        },

        // -- HIDE HERO CAROUSEL -------------------------------------------
        {
            key: 'hideHeroCarousel',
            name: 'Hide Hero Carousel',
            group: 'UI Cleanup',
            desc: 'Remove the promotional carousel at the top of homepage',
            styleId: SCRIPT_ID + '-hero',
            init: function() {
                injectStyle(this.styleId,
                    '[data-testid="horizontal-linear-content-wrapper"], [data-testid="HeroImageContainer"] { display: none !important; }'
                );
            },
            destroy: function() { removeStyle(this.styleId); }
        },

        // -- CLEAN FOOTER -------------------------------------------------
        {
            key: 'cleanFooter',
            name: 'Clean Footer',
            group: 'UI Cleanup',
            desc: 'Simplify the cluttered footer',
            styleId: SCRIPT_ID + '-footer',
            init: function() {
                injectStyle(this.styleId,
                    '[data-testid="Footer"], footer, [role="contentinfo"] { max-height: 200px !important; overflow: hidden !important; }'
                );
            },
            destroy: function() { removeStyle(this.styleId); }
        },

        // -- HIDE TURNSTILE -----------------------------------------------
        {
            key: 'hideTurnstile',
            name: 'Hide Turnstile Banners',
            group: 'UI Cleanup',
            desc: 'Hide Cloudflare turnstile banners when not needed',
            styleId: SCRIPT_ID + '-turnstile',
            init: function() {
                injectStyle(this.styleId, [
                    '[data-testid="turnstile/banner"]:not(:has(iframe)),',
                    '[data-testid="turnstile/overlay"]:not(:has(iframe)),',
                    '[data-testid="turnstile/widget"]:not(:has(iframe)) { display: none !important; }',
                ].join('\n'));
            },
            destroy: function() { removeStyle(this.styleId); }
        },

        // -- STICKY CART --------------------------------------------------
        {
            key: 'stickyCart',
            name: 'Sticky Cart Button',
            group: 'Utilities',
            desc: 'Keep the cart button visible while scrolling',
            styleId: SCRIPT_ID + '-sticky',
            init: function() {
                injectStyle(this.styleId,
                    '[data-testid="OrderCartIconButton"] { position: sticky !important; top: 80px !important; z-index: 1000 !important; }'
                );
            },
            destroy: function() { removeStyle(this.styleId); }
        },

        // -- SEARCH HISTORY -----------------------------------------------
        {
            key: 'quickSearch',
            name: 'Search History',
            group: 'Utilities',
            desc: 'Remember and suggest previous searches',
            init: function() {
                this._obs = registerObserverHandler(function(node) {
                    var input = (node.matches && node.matches('[data-anchor-id="HeaderSearchInputField"]')) ? node :
                                (node.querySelector ? node.querySelector('[data-anchor-id="HeaderSearchInputField"]') : null);
                    if (input && !input.dataset.ddEnhanced) {
                        input.dataset.ddEnhanced = 'true';
                        input.addEventListener('focus', function() {
                            var h = JSON.parse(GM_getValue(SCRIPT_ID + '_search_history', '[]'));
                            if (h.length > 0) showSearchHistory(input, h);
                        });
                        input.addEventListener('keydown', function(e) {
                            if (e.key === 'Enter' && input.value.trim()) {
                                var h = JSON.parse(GM_getValue(SCRIPT_ID + '_search_history', '[]'));
                                var val = input.value.trim();
                                GM_setValue(SCRIPT_ID + '_search_history', JSON.stringify([val].concat(h.filter(function(x) { return x !== val; })).slice(0, 10)));
                            }
                        });
                    }
                });
            },
            destroy: function() { if (this._obs) this._obs.disconnect(); var el = document.getElementById(SCRIPT_ID + '-search-history'); if (el) el.remove(); }
        },

        // -- HIDE ELECTRONICS SIDEBAR -------------------------------------
        {
            key: 'hideElectronics',
            name: 'Hide Electronics',
            group: 'UI Cleanup',
            desc: 'Remove Electronics category from the sidebar',
            styleId: SCRIPT_ID + '-noelec',
            init: function() { injectStyle(this.styleId, '#Electronics { display: none !important; }'); },
            destroy: function() { removeStyle(this.styleId); }
        },

        // -- DEFAULT TIP --------------------------------------------------
        {
            key: 'tipDefault',
            name: 'Default Tip',
            group: 'Checkout',
            desc: 'Auto-select your preferred tip on checkout',
            custom: true,
            init: function() { initTipDefault(); },
            destroy: function() { destroyTipDefault(); }
        },

        // -- CHECKOUT FLAIR -----------------------------------------------
        {
            key: 'checkoutFlair',
            name: 'Checkout Page Styling',
            group: 'Appearance',
            desc: 'Premium look for checkout: glassmorphism, animated totals, polished layout',
            styleId: SCRIPT_ID + '-checkout',
            init: function() { injectStyle(this.styleId, checkoutFlairCSS()); },
            destroy: function() { removeStyle(this.styleId); }
        },

        // -- STORE PAGE POLISH ---------------------------------------------
        {
            key: 'storePolish',
            name: 'Store Page Polish',
            group: 'Appearance',
            desc: 'Enhanced convenience/retail store layout, compact spacing, and dark mode fixes',
            styleId: SCRIPT_ID + '-store',
            init: function() { injectStyle(this.styleId, storePolishCSS()); },
            destroy: function() { removeStyle(this.styleId); }
        },

        // -- VISUAL FLAIR -------------------------------------------------
        {
            key: 'visualFlair',
            name: 'Visual Flair & Animations',
            group: 'Appearance',
            desc: 'Animated badges, card hovers, sparkles, and micro-interactions',
            styleId: SCRIPT_ID + '-flair',
            init: function() {
                injectStyle(this.styleId, visualFlairCSS());
                this._throttled = throttle(function() { applyFlairAttributes(document.body); }, 500);
                this._obs = registerObserverHandler(this._throttled);
                applyFlairAttributes(document.body);
            },
            destroy: function() {
                removeStyle(this.styleId);
                if (this._obs) this._obs.disconnect();
                if (this._throttled) this._throttled.cancel();
            }
        },
    ];


    // =====================================================================
    //  DARK MODE CSS - Always On - Override DoorDash Prism Design Tokens
    // =====================================================================
    function darkModeCSS() {
        return [
        '.prism-theme.prism-theme,',
        '[data-testid="ThemingWrapper"][data-testid="ThemingWrapper"] {',
        '  --base-color-white:      #111118ff !important;',
        '  --base-color-neutral-0:  #1a1a22ff !important;',
        '  --base-color-neutral-5:  #1e1e28ff !important;',
        '  --base-color-neutral-10: #2a2a35ff !important;',
        '  --base-color-neutral-20: #3a3a45ff !important;',
        '  --base-color-neutral-30: #4a4a55ff !important;',
        '  --base-color-neutral-40: #5a5a65ff !important;',
        '  --base-color-neutral-50: #7a7a85ff !important;',
        '  --base-color-neutral-60: #8a8a95ff !important;',
        '  --base-color-neutral-70: #9a9aa5ff !important;',
        '  --base-color-neutral-80: #b0b0bbff !important;',
        '  --base-color-neutral-90: #c8c8d0ff !important;',
        '  --base-color-neutral-95: #d8d8e0ff !important;',
        '  --base-color-neutral-100: #e8e8f0ff !important;',
        '  --base-color-black:      #ffffffff !important;',
        '  --usage-color-border-default: #2a2a35ff !important;',
        '  --usage-color-border-focused: #e8e8f0a8 !important;',
        '  color-scheme: dark !important;',
        '}',
        'html, body { background-color: #111118 !important; color: #e8e8f0 !important; }',
        // FIX #9: Broadened inline-style overrides beyond just div
        '*[style*="background-color: rgb(255, 255, 255)"],',
        '*[style*="background-color: white"],',
        '*[style*="background: white"],',
        '*[style*="background: rgb(255, 255, 255)"] { background-color: #111118 !important; }',
        '*[style*="background-color: rgb(247"],',
        '*[style*="background-color: rgb(248"],',
        '*[style*="background-color: rgb(249"],',
        '*[style*="background-color: rgb(250"],',
        '*[style*="background-color: rgb(251"],',
        '*[style*="background-color: rgb(252"],',
        '*[style*="background-color: rgb(253"],',
        '*[style*="background-color: rgb(254"],',
        '*[style*="background-color: rgb(241"],',
        '*[style*="background-color: rgb(242"],',
        '*[style*="background-color: rgb(243"],',
        '*[style*="background-color: rgb(244"],',
        '*[style*="background-color: rgb(245"] { background-color: #1a1a22 !important; }',
        '::-webkit-scrollbar { width: 10px; height: 10px; }',
        '::-webkit-scrollbar-track { background: #111118; }',
        '::-webkit-scrollbar-thumb { background: #3a3a45; border-radius: 5px; }',
        '::-webkit-scrollbar-thumb:hover { background: #4a4a55; }',
        'img { border-radius: 8px; }',
        '.mapboxgl-map { filter: invert(1) hue-rotate(180deg) brightness(1.1) contrast(0.9) !important; }',
        '.mapboxgl-marker, .mapboxgl-ctrl, .mapboxgl-ctrl-logo, .mapboxgl-popup,',
        '[data-testid="MarkerContainer"], [data-testid="ZoomControl"] {',
        '  filter: invert(1) hue-rotate(180deg) !important;',
        '}',
        ].join('\n');
    }


    // =====================================================================
    //  FEE HIGHLIGHTER
    // =====================================================================
    function feeHighlighterCSS() {
        var s = SCRIPT_ID;
        return [
        '.' + s + '-fee-tag { display:inline-block; font-size:10px; font-weight:700; padding:2px 6px; border-radius:4px; margin-left:6px; vertical-align:middle; letter-spacing:0.3px; }',
        '.' + s + '-fee-tag.platform  { background:rgba(255,80,40,0.15); color:#ff5028; border:1px solid rgba(255,80,40,0.3); }',
        '.' + s + '-fee-tag.delivery  { background:rgba(255,180,0,0.15); color:#e6a200; border:1px solid rgba(255,180,0,0.3); }',
        '.' + s + '-fee-tag.regulatory{ background:rgba(100,100,255,0.15); color:#8888ff; border:1px solid rgba(100,100,255,0.3); }',
        '.' + s + '-fee-tag.tax       { background:rgba(100,200,100,0.15); color:#60c060; border:1px solid rgba(100,200,100,0.3); }',
        ].join('\n');
    }

    var FEE_PATTERNS = [
        { regex: /service\s*fee/i,       type: 'platform',   label: 'PLATFORM FEE' },
        { regex: /delivery\s*fee/i,      type: 'delivery',   label: 'DELIVERY' },
        { regex: /small\s*order\s*fee/i, type: 'platform',   label: 'SMALL ORDER' },
        { regex: /regulatory.*fee/i,     type: 'regulatory', label: 'NOT A TAX' },
        { regex: /chicago\s*fee/i,       type: 'regulatory', label: 'NOT A TAX' },
        { regex: /expanded\s*range/i,    type: 'delivery',   label: 'DISTANCE FEE' },
        { regex: /priority.*fee/i,       type: 'delivery',   label: 'PRIORITY FEE' },
        { regex: /express.*fee/i,        type: 'delivery',   label: 'EXPRESS FEE' },
    ];

    function annotateFees() {
        var lineItems = document.querySelector('[data-testid="LineItems"]');
        if (!lineItems) return;
        lineItems.querySelectorAll('[data-testid]').forEach(function(el) {
            if (el.getAttribute('data-' + SCRIPT_ID + '-tagged')) return;
            var testId = el.getAttribute('data-testid') || '';
            var text = el.textContent || '';
            if (text.length > 300) return;
            for (var i = 0; i < FEE_PATTERNS.length; i++) {
                var p = FEE_PATTERNS[i];
                if (p.regex.test(text) || p.regex.test(testId)) {
                    el.setAttribute('data-' + SCRIPT_ID + '-tagged', 'true');
                    var labelEl = el.querySelector('span') || el;
                    if (!labelEl.querySelector('.' + SCRIPT_ID + '-fee-tag')) {
                        var tag = document.createElement('span');
                        tag.className = SCRIPT_ID + '-fee-tag ' + p.type;
                        tag.textContent = p.label;
                        labelEl.appendChild(tag);
                    }
                    break;
                }
            }
        });
    }


    // =====================================================================
    //  VISUAL FLAIR - Animations & Micro-interactions
    // =====================================================================
    function visualFlairCSS() {
        return [

        // FIX #12: Respect prefers-reduced-motion
        '@media (prefers-reduced-motion: reduce) {',
        '  *, *::before, *::after {',
        '    animation-duration: 0.01ms !important;',
        '    animation-iteration-count: 1 !important;',
        '    transition-duration: 0.01ms !important;',
        '  }',
        '}',

        '@keyframes dd-shimmer {',
        '  0% { background-position: -200% center; }',
        '  100% { background-position: 200% center; }',
        '}',
        '@keyframes dd-glow-pulse {',
        '  0%, 100% { box-shadow: 0 0 4px rgba(0,184,148,0.3), 0 0 0px rgba(0,184,148,0); }',
        '  50% { box-shadow: 0 0 8px rgba(0,184,148,0.5), 0 0 20px rgba(0,184,148,0.15); }',
        '}',
        '@keyframes dd-badge-entrance {',
        '  0% { opacity: 0; transform: scale(0.6) translateY(4px); }',
        '  50% { transform: scale(1.08) translateY(-1px); }',
        '  100% { opacity: 1; transform: scale(1) translateY(0); }',
        '}',
        '@keyframes dd-card-entrance {',
        '  from { opacity: 0; transform: translateY(16px); }',
        '  to   { opacity: 1; transform: translateY(0); }',
        '}',
        '@keyframes dd-sparkle {',
        '  0%, 100% { opacity: 0; transform: scale(0) rotate(0deg); }',
        '  50% { opacity: 1; transform: scale(1) rotate(180deg); }',
        '}',
        '@keyframes dd-float {',
        '  0%, 100% { transform: translateY(0); }',
        '  50% { transform: translateY(-3px); }',
        '}',
        '@keyframes dd-ring-pulse {',
        '  0% { box-shadow: 0 0 0 0 rgba(255,48,8,0.4); }',
        '  70% { box-shadow: 0 0 0 8px rgba(255,48,8,0); }',
        '  100% { box-shadow: 0 0 0 0 rgba(255,48,8,0); }',
        '}',

        '[class*="TagWrapper-sc-"] {',
        '  position: relative;',
        '  animation: dd-badge-entrance 0.5s ease-out both, dd-glow-pulse 3s ease-in-out infinite 1s;',
        '  transition: transform 0.2s ease, box-shadow 0.2s ease;',
        '  overflow: hidden;',
        '}',
        '[class*="TagWrapper-sc-"]::after {',
        '  content: "";',
        '  position: absolute; inset: 0;',
        '  background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.2) 40%, rgba(255,255,255,0.4) 50%, rgba(255,255,255,0.2) 60%, transparent 100%);',
        '  background-size: 200% 100%;',
        '  animation: dd-shimmer 3s ease-in-out infinite;',
        '  pointer-events: none;',
        '  border-radius: inherit;',
        '}',
        '[class*="TagWrapper-sc-"]:hover {',
        '  transform: scale(1.08);',
        '  box-shadow: 0 0 12px rgba(0,184,148,0.5), 0 2px 8px rgba(0,0,0,0.2);',
        '}',

        '[data-anchor-id="StoreCard"],',
        '[data-testid="card.store"] {',
        '  transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1),',
        '              box-shadow 0.3s ease !important;',
        '  animation: dd-card-entrance 0.4s ease-out both;',
        '}',
        '[data-anchor-id="StoreCard"]:hover,',
        '[data-testid="card.store"]:hover {',
        '  transform: translateY(-6px) scale(1.02) !important;',
        '  box-shadow: 0 12px 32px rgba(0,0,0,0.15), 0 4px 12px rgba(0,0,0,0.1) !important;',
        '  z-index: 10 !important;',
        '}',

        '[data-anchor-id="StoreCard"] img,',
        '[data-testid="card.store"] img {',
        '  transition: transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94) !important;',
        '}',
        '[data-anchor-id="StoreCard"]:hover img,',
        '[data-testid="card.store"]:hover img {',
        '  transform: scale(1.06) !important;',
        '}',

        '[data-dd-flair-stagger] { animation-delay: var(--dd-stagger, 0ms); }',

        '[data-testid="GenericItemCard"] {',
        '  transition: transform 0.25s ease, box-shadow 0.25s ease, background 0.25s ease !important;',
        '  border-radius: 12px;',
        '}',
        '[data-testid="GenericItemCard"]:hover {',
        '  transform: translateX(4px) !important;',
        '  background: var(--usage-color-background-hovered, rgba(0,0,0,0.03)) !important;',
        '}',

        '[data-testid="GenericItemCard"]:hover [class*="sc-62d4eb3a-10"] {',
        '  text-shadow: 0 0 8px rgba(255,48,8,0.4);',
        '  transition: text-shadow 0.3s ease;',
        '}',

        '[class*="ButtonRoot-sc-"] {',
        '  transition: transform 0.15s ease, box-shadow 0.2s ease !important;',
        '}',
        '[class*="ButtonRoot-sc-"]:hover {',
        '  transform: translateY(-1px) !important;',
        '}',
        '[class*="ButtonRoot-sc-"]:active {',
        '  transform: translateY(1px) scale(0.97) !important;',
        '}',

        '[data-testid="OrderCartIconButton"] {',
        '  animation: dd-ring-pulse 2.5s ease-in-out infinite;',
        '  transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.2s ease !important;',
        '}',
        '[data-testid="OrderCartIconButton"]:hover {',
        '  transform: scale(1.08) !important;',
        '  animation: none;',
        '}',

        '[data-testid="DasherPreferredProfileDetails"] {',
        '  animation: dd-float 4s ease-in-out infinite;',
        '}',

        '[data-testid="DasherPreferredProfileDetails"] [class*="Text-sc-"]:first-child {',
        '  position: relative;',
        '}',

        '[data-testid="DeliverySection"],',
        '[data-testid="OrderStatusSection"] {',
        '  animation: dd-card-entrance 0.5s ease-out both;',
        '}',

        '[data-testid="horizontal-linear-content-wrapper"] > * {',
        '  transition: transform 0.3s ease !important;',
        '}',
        '[data-testid="horizontal-linear-content-wrapper"] > *:hover {',
        '  transform: scale(1.04) !important;',
        '}',

        '[data-testid="HeaderNotificationBellIcon"]:hover svg {',
        '  animation: dd-wiggle 0.5s ease;',
        '}',
        '@keyframes dd-wiggle {',
        '  0%, 100% { transform: rotate(0deg); }',
        '  20% { transform: rotate(12deg); }',
        '  40% { transform: rotate(-10deg); }',
        '  60% { transform: rotate(6deg); }',
        '  80% { transform: rotate(-4deg); }',
        '}',

        '[data-anchor-id="HeaderSearchInputField"]:focus {',
        '  box-shadow: 0 0 0 3px rgba(255,48,8,0.2), 0 0 16px rgba(255,48,8,0.1) !important;',
        '  transition: box-shadow 0.3s ease !important;',
        '}',

        'html { scroll-behavior: smooth; }',

        '#' + SCRIPT_ID + '-hdr-btns button:hover svg {',
        '  transform: rotate(20deg);',
        '  transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);',
        '}',

        'footer a, [data-testid="Footer"] a {',
        '  transition: color 0.2s ease, transform 0.2s ease !important;',
        '  display: inline-block;',
        '}',
        'footer a:hover, [data-testid="Footer"] a:hover {',
        '  transform: translateY(-1px) !important;',
        '}',

        ].join('\n');
    }

    function applyFlairAttributes(root) {
        if (!root || !root.querySelectorAll) return;
        var cards = root.querySelectorAll('[data-anchor-id="StoreCard"]:not([data-dd-flair-stagger]), [data-testid="card.store"]:not([data-dd-flair-stagger])');
        cards.forEach(function(card, i) {
            card.setAttribute('data-dd-flair-stagger', 'true');
            card.style.setProperty('--dd-stagger', (i * 60) + 'ms');
        });
        var items = root.querySelectorAll('[data-testid="GenericItemCard"]:not([data-dd-flair-stagger])');
        items.forEach(function(item, i) {
            item.setAttribute('data-dd-flair-stagger', 'true');
            item.style.setProperty('--dd-stagger', (i * 40) + 'ms');
        });
    }


    // =====================================================================
    //  CHECKOUT PAGE STYLING
    // =====================================================================
    function checkoutFlairCSS() {
        return [

        '@keyframes dd-ck-slide-in {',
        '  from { opacity: 0; transform: translateY(20px); }',
        '  to   { opacity: 1; transform: translateY(0); }',
        '}',
        '@keyframes dd-ck-total-glow {',
        '  0%, 100% { text-shadow: 0 0 6px rgba(255,48,8,0.2); }',
        '  50% { text-shadow: 0 0 16px rgba(255,48,8,0.45), 0 0 30px rgba(255,48,8,0.1); }',
        '}',
        '@keyframes dd-ck-progress-shine {',
        '  0% { background-position: -200% center; }',
        '  100% { background-position: 200% center; }',
        '}',
        '@keyframes dd-ck-bounce-in {',
        '  0% { opacity: 0; transform: scale(0.85); }',
        '  60% { transform: scale(1.04); }',
        '  100% { opacity: 1; transform: scale(1); }',
        '}',
        '@keyframes dd-ck-pulse-border {',
        '  0%, 100% { border-color: rgba(255,48,8,0.3); }',
        '  50% { border-color: rgba(255,48,8,0.7); }',
        '}',

        '[data-testid^="Checkout-vertical-stepper-"] {',
        '  animation: dd-ck-slide-in 0.4s ease-out both;',
        '  transition: background 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease;',
        '  border-radius: 14px !important;',
        '  padding: 16px !important;',
        '  margin-bottom: 8px !important;',
        '  border: 1px solid var(--usage-color-border-default, #e0e0e0) !important;',
        '}',
        '[data-testid^="Checkout-vertical-stepper-"][aria-expanded="true"] {',
        '  background: var(--usage-color-background-elevated-default, rgba(255,255,255,0.6)) !important;',
        '  box-shadow: 0 4px 24px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04) !important;',
        '  border-color: rgba(255,48,8,0.25) !important;',
        '}',
        '[data-anchor-id="ACCOUNT_DETAILS"] { animation-delay: 0ms; }',
        '[data-anchor-id="SHIPPING_DETAILS"] { animation-delay: 100ms; }',
        '[data-anchor-id="PAYMENT_DETAILS"]  { animation-delay: 200ms; }',

        '[data-anchor-id="step-label"] {',
        '  font-weight: 700 !important;',
        '  letter-spacing: 0.3px;',
        '}',

        '[data-testid="PlaceOrderButton"] {',
        '  border-radius: 14px !important;',
        '  font-size: 16px !important;',
        '  font-weight: 700 !important;',
        '  letter-spacing: 0.5px;',
        '  min-height: 52px !important;',
        '  position: relative;',
        '  overflow: hidden;',
        '  animation: dd-ck-bounce-in 0.5s ease-out 0.3s both;',
        '  transition: transform 0.2s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.25s ease !important;',
        '  box-shadow: 0 4px 16px rgba(255,48,8,0.3), 0 2px 4px rgba(255,48,8,0.2) !important;',
        '}',
        '[data-testid="PlaceOrderButton"]:hover {',
        '  transform: translateY(-2px) scale(1.01) !important;',
        '  box-shadow: 0 8px 28px rgba(255,48,8,0.4), 0 4px 8px rgba(255,48,8,0.25) !important;',
        '}',
        '[data-testid="PlaceOrderButton"]:active {',
        '  transform: translateY(1px) scale(0.98) !important;',
        '}',
        '[data-testid="PlaceOrderButton"]::after {',
        '  content: "";',
        '  position: absolute; inset: 0;',
        '  background: linear-gradient(105deg, transparent 35%, rgba(255,255,255,0.2) 45%, rgba(255,255,255,0.35) 50%, rgba(255,255,255,0.2) 55%, transparent 65%);',
        '  background-size: 250% 100%;',
        '  animation: dd-ck-progress-shine 4s ease-in-out infinite;',
        '  pointer-events: none;',
        '  border-radius: inherit;',
        '}',

        '[data-testid="OrderCartTotal"] {',
        '  font-weight: 800 !important;',
        '}',

        '[data-anchor-id="OrderItemContainer"] {',
        '  transition: transform 0.2s ease, background 0.25s ease !important;',
        '  border-radius: 12px !important;',
        '  padding: 8px !important;',
        '}',
        '[data-anchor-id="OrderItemContainer"]:hover {',
        '  background: var(--usage-color-background-hovered, rgba(0,0,0,0.03)) !important;',
        '  transform: translateX(4px) !important;',
        '}',

        '[data-anchor-id="OrderItemContainer"] picture img {',
        '  border-radius: 10px !important;',
        '  transition: transform 0.3s ease, box-shadow 0.3s ease !important;',
        '}',
        '[data-anchor-id="OrderItemContainer"]:hover picture img {',
        '  transform: scale(1.08) !important;',
        '  box-shadow: 0 4px 12px rgba(0,0,0,0.15) !important;',
        '}',

        '[data-testid="QuantityContainer"] {',
        '  border-radius: 10px !important;',
        '  transition: box-shadow 0.2s ease !important;',
        '}',
        '[data-testid="QuantityContainer"]:hover {',
        '  box-shadow: 0 0 0 2px rgba(255,48,8,0.2) !important;',
        '}',
        '[data-testid="stepper-expanded-quantity"] {',
        '  font-weight: 700 !important;',
        '  transition: transform 0.15s ease;',
        '}',
        '[data-testid="stepper-increment-button"]:active ~ [data-testid="stepper-expanded-quantity"],',
        '[data-testid="stepper-decrement-button"]:active ~ [data-testid="stepper-expanded-quantity"] {',
        '  transform: scale(1.2);',
        '}',

        '[data-testid="LineItems"] {',
        '  border-radius: 14px !important;',
        '  padding: 12px 16px !important;',
        '  border: 1px solid var(--usage-color-border-default, #e0e0e0) !important;',
        '  background: var(--usage-color-background-elevated-default, rgba(255,255,255,0.5)) !important;',
        '  animation: dd-ck-slide-in 0.4s ease-out 0.15s both;',
        '}',

        '[data-testid="Subtotal"],',
        '[data-testid="Delivery Fee"],',
        '[data-testid="Fees & Estimated Tax"],',
        '[data-testid="Dasher Tip"] {',
        '  padding: 6px 0 !important;',
        '  transition: background 0.2s ease, padding-left 0.2s ease !important;',
        '  border-radius: 6px;',
        '}',
        '[data-testid="Subtotal"]:hover,',
        '[data-testid="Delivery Fee"]:hover,',
        '[data-testid="Fees & Estimated Tax"]:hover,',
        '[data-testid="Dasher Tip"]:hover {',
        '  background: var(--usage-color-background-hovered, rgba(0,0,0,0.02)) !important;',
        '  padding-left: 6px !important;',
        '}',

        '[data-testid="Total"] {',
        '  padding: 12px 0 4px !important;',
        '  margin-top: 4px !important;',
        '  border-top: 2px solid var(--usage-color-border-default, #e0e0e0) !important;',
        '}',
        '[data-testid="Total"] [class*="Text-sc-"]:last-child {',
        '  font-size: 20px !important;',
        '  font-weight: 800 !important;',
        '  animation: dd-ck-total-glow 3s ease-in-out infinite;',
        '}',

        '[data-anchor-id="TipPickerOption"] {',
        '  border-radius: 12px !important;',
        '  transition: transform 0.15s ease, box-shadow 0.2s ease !important;',
        '  min-width: 56px;',
        '}',
        '[data-anchor-id="TipPickerOption"]:hover {',
        '  transform: translateY(-2px) !important;',
        '  box-shadow: 0 4px 12px rgba(0,0,0,0.1) !important;',
        '}',
        '[data-anchor-id="TipPickerOption"]:active {',
        '  transform: scale(0.95) !important;',
        '}',
        '[data-anchor-id="TipPickerOption"][aria-checked="true"] {',
        '  box-shadow: 0 2px 12px rgba(255,48,8,0.25) !important;',
        '}',

        '[class*="sc-4851ec00-0"] {',
        '  border-radius: 14px !important;',
        '  transition: transform 0.2s ease, box-shadow 0.2s ease !important;',
        '}',
        '[class*="sc-4851ec00-0"]:hover {',
        '  transform: translateY(-2px) !important;',
        '  box-shadow: 0 4px 16px rgba(0,0,0,0.08) !important;',
        '}',
        '[class*="sc-4851ec00-0"][aria-checked="true"] {',
        '  box-shadow: 0 2px 12px rgba(255,48,8,0.2) !important;',
        '}',

        '[data-testid="time-range"] {',
        '  font-weight: 700 !important;',
        '  letter-spacing: 0.2px;',
        '}',

        '[data-testid="store-loyalty-banner"] {',
        '  border-radius: 14px !important;',
        '  padding: 14px 16px !important;',
        '  position: relative;',
        '  overflow: hidden;',
        '  animation: dd-ck-slide-in 0.4s ease-out 0.2s both;',
        '  transition: transform 0.2s ease, box-shadow 0.2s ease !important;',
        '}',
        '[data-testid="store-loyalty-banner"]:hover {',
        '  transform: translateY(-2px) !important;',
        '  box-shadow: 0 4px 16px rgba(0,0,0,0.1) !important;',
        '}',
        '[data-testid="store-loyalty-banner-title"] {',
        '  font-weight: 700 !important;',
        '}',

        '[data-testid="ProgressBar"] {',
        '  border-radius: 20px !important;',
        '  overflow: hidden;',
        '  position: relative;',
        '}',
        '[data-testid="ProgressBar"]::after {',
        '  content: "";',
        '  position: absolute; inset: 0;',
        '  background: linear-gradient(90deg, transparent 30%, rgba(255,255,255,0.5) 50%, transparent 70%);',
        '  background-size: 200% 100%;',
        '  animation: dd-ck-progress-shine 2.5s ease-in-out infinite;',
        '  pointer-events: none;',
        '}',

        '[data-testid="StoreLogo"] {',
        '  border-radius: 12px !important;',
        '  transition: transform 0.3s ease, box-shadow 0.3s ease !important;',
        '  box-shadow: 0 2px 8px rgba(0,0,0,0.1);',
        '}',
        '[data-testid="StoreLogo"]:hover {',
        '  transform: scale(1.08) rotate(2deg) !important;',
        '  box-shadow: 0 4px 16px rgba(0,0,0,0.2) !important;',
        '}',

        '[data-testid="giftListCell"] {',
        '  border-radius: 14px !important;',
        '  transition: transform 0.2s ease, background 0.2s ease !important;',
        '}',
        '[data-testid="giftListCell"]:hover {',
        '  transform: translateX(4px) !important;',
        '  background: var(--usage-color-background-hovered, rgba(0,0,0,0.03)) !important;',
        '}',

        '[data-testid$="-edit-button"] {',
        '  border-radius: 10px !important;',
        '  transition: transform 0.15s ease, background 0.2s ease !important;',
        '}',
        '[data-testid$="-edit-button"]:hover {',
        '  transform: scale(1.05) !important;',
        '}',

        '[data-anchor-id="OpenPromoCodeModalButton"] {',
        '  border-radius: 10px !important;',
        '  transition: transform 0.2s ease, color 0.2s ease !important;',
        '}',
        '[data-anchor-id="OpenPromoCodeModalButton"]:hover {',
        '  transform: translateX(3px) !important;',
        '}',
        '[data-anchor-id="OpenPromoCodeModalButton"]:hover svg {',
        '  transform: rotate(8deg) scale(1.1); transition: transform 0.3s ease;',
        '}',

        '[class*="ListCellContainer-sc-f56khb"][aria-label*="click to open modal"] {',
        '  transition: transform 0.2s ease, background 0.2s ease !important;',
        '  border-radius: 10px !important;',
        '}',
        '[class*="ListCellContainer-sc-f56khb"][aria-label*="click to open modal"]:hover {',
        '  transform: translateX(4px) !important;',
        '  background: var(--usage-color-background-hovered, rgba(0,0,0,0.03)) !important;',
        '}',
        '[class*="ListCellContainer-sc-f56khb"][aria-label*="click to open modal"]:hover picture img {',
        '  transform: scale(1.08); transition: transform 0.3s ease;',
        '}',

        '[data-testid="store-loyalty-banner"]::after {',
        '  content: ""; position: absolute; inset: 0;',
        '  background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.08) 45%, rgba(255,255,255,0.15) 50%, rgba(255,255,255,0.08) 55%, transparent 100%);',
        '  background-size: 200% 100%;',
        '  animation: dd-ck-progress-shine 5s ease-in-out infinite;',
        '  pointer-events: none;',
        '}',

        '[class*="sc-c6cb4208-1"] {',
        '  animation: dd-ck-slide-in 0.5s ease-out 0.1s both;',
        '}',
        '[class*="sc-c6cb4208-2"] {',
        '  animation: dd-ck-slide-in 0.5s ease-out 0.25s both;',
        '}',

        '[data-testid="checkoutItemDetailsWrapper"] {',
        '  border-radius: 14px !important; overflow: hidden;',
        '}',

        '.mapboxgl-map {',
        '  border-radius: 14px !important;',
        '  overflow: hidden !important;',
        '  box-shadow: 0 4px 20px rgba(0,0,0,0.12) !important;',
        '}',

        ].join('\n');
    }


    // =====================================================================
    //  DEFAULT TIP - Auto-select preferred tip on checkout
    // =====================================================================
    var _tipObs = null;
    var _tipApplied = false;

    function initTipDefault() {
        _tipApplied = false;
        _tipObs = registerObserverHandler(function() { applyTipDefault(); });
        applyTipDefault();
    }

    function destroyTipDefault() {
        if (_tipObs) { _tipObs.disconnect(); _tipObs = null; }
    }

    function applyTipDefault() {
        if (_tipApplied) return;
        var mode = getSetting('tipDefault');
        if (!mode || mode === 'off') return;

        var group = document.querySelector('[role="radiogroup"][aria-label="Tip Amount"]');
        if (!group) return;

        if (!group.dataset.ddTipWatching) {
            group.dataset.ddTipWatching = '1';
            group.addEventListener('click', function(e) {
                var btn = e.target.closest('[data-anchor-id="TipPickerOption"]');
                if (!btn) return;
                setTimeout(function() {
                    var text = btn.textContent.trim();
                    if (text && text !== 'Other' && text.startsWith('$')) {
                        GM_setValue(SCRIPT_ID + '_tipLastAmount', text.replace('$', ''));
                    }
                }, 100);
            });
        }

        var targetAmount;
        if (mode === 'remember') {
            targetAmount = GM_getValue(SCRIPT_ID + '_tipLastAmount', null);
            if (!targetAmount) return;
        } else {
            targetAmount = mode;
        }

        var buttons = group.querySelectorAll('[data-anchor-id="TipPickerOption"]');
        var matched = false;
        var otherBtn = null;
        var targetFloat = parseFloat(targetAmount);

        buttons.forEach(function(btn) {
            var text = btn.textContent.trim();
            if (text === 'Other') { otherBtn = btn; return; }
            var val = parseFloat(text.replace('$', ''));
            if (!isNaN(val) && Math.abs(val - targetFloat) < 0.01) {
                if (btn.getAttribute('aria-checked') !== 'true') {
                    btn.click();
                }
                matched = true;
            }
        });

        if (!matched && otherBtn) {
            if (otherBtn.getAttribute('aria-checked') !== 'true') {
                otherBtn.click();
            }
            setTimeout(function() {
                var input = group.closest('[class*="sc-a1750b88"]');
                if (!input) input = group.parentElement;
                var allInputs = input ? input.querySelectorAll('input') : document.querySelectorAll('[role="radiogroup"][aria-label="Tip Amount"] ~ * input, [class*="sc-a1750b88"] input');
                if (!allInputs.length) {
                    var tipSection = group.closest('[class*="StyledStackChildren"]') || group.parentElement.parentElement;
                    if (tipSection) allInputs = tipSection.querySelectorAll('input[type="text"], input[type="number"], input:not([type])');
                }
                if (allInputs.length) {
                    var tipInput = allInputs[allInputs.length - 1];
                    var nativeSet = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
                    nativeSet.call(tipInput, targetAmount);
                    tipInput.dispatchEvent(new Event('input', { bubbles: true }));
                    tipInput.dispatchEvent(new Event('change', { bubbles: true }));
                    setTimeout(function() {
                        tipInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true }));
                        var parent = tipInput.closest('div[class*="sc-"]') || tipInput.parentElement;
                        if (parent) {
                            var applyBtn = parent.querySelector('button');
                            if (applyBtn) applyBtn.click();
                        }
                    }, 100);
                }
            }, 400);
        }

        _tipApplied = true;
        if (mode !== 'remember') {
            GM_setValue(SCRIPT_ID + '_tipLastAmount', targetAmount);
        }
    }


    // =====================================================================
    //  STORE PAGE POLISH
    // =====================================================================
    function storePolishCSS() {
        return [

        '@keyframes dd-sp-slide-up {',
        '  from { opacity: 0; transform: translateY(14px); }',
        '  to   { opacity: 1; transform: translateY(0); }',
        '}',
        '@keyframes dd-sp-pop {',
        '  0% { transform: scale(0.92); opacity: 0; }',
        '  60% { transform: scale(1.03); }',
        '  100% { transform: scale(1); opacity: 1; }',
        '}',

        '[class*="sc-dd3a85f9-2"] {',
        '  margin-top: 70px !important;',
        '  margin-bottom: 0 !important;',
        '}',

        '[class*="sc-9ef7f31f-1"] {',
        '  padding: 0 !important;',
        '  margin: 0 !important;',
        '}',

        '[data-anchor-id="ConvenienceStoreHeaderLogo"] {',
        '  border-radius: 14px !important;',
        '  overflow: hidden;',
        '  box-shadow: 0 2px 12px rgba(0,0,0,0.12);',
        '  transition: transform 0.3s ease, box-shadow 0.3s ease;',
        '}',
        '[data-anchor-id="ConvenienceStoreHeaderLogo"]:hover {',
        '  transform: scale(1.05);',
        '  box-shadow: 0 4px 20px rgba(0,0,0,0.18);',
        '}',
        '[data-anchor-id="ConvenienceStoreHeaderLogo"] img {',
        '  border-radius: 14px !important;',
        '}',

        '[data-testid="CurrentOrderInfoDetail"] {',
        '  padding: 4px 0 !important;',
        '}',

        '[data-testid="delivery-fee-container"] {',
        '  border-radius: 10px !important;',
        '  transition: transform 0.2s ease;',
        '}',
        '[data-testid="delivery-fee-container"]:hover {',
        '  transform: translateY(-1px);',
        '}',

        '[class*="StyledInlineChildren-sc-1dbwnk9-0"][class*="eVPsWJ"] {',
        '  background: linear-gradient(135deg, #92700a, #b8860b) !important;',
        '  border-radius: 8px !important; padding: 2px 8px !important;',
        '  box-shadow: 0 2px 8px rgba(184,134,11,0.3);',
        '  transition: transform 0.2s ease, box-shadow 0.2s ease;',
        '}',
        '[class*="StyledInlineChildren-sc-1dbwnk9-0"][class*="eVPsWJ"]:hover {',
        '  transform: scale(1.08);',
        '  box-shadow: 0 4px 14px rgba(184,134,11,0.4);',
        '}',
        '[class*="StyledInlineChildren-sc-1dbwnk9-0"][class*="eVPsWJ"] span {',
        '  color: #fff !important; font-weight: 700 !important;',
        '}',

        '[class*="StyledMotionBody-sc-wwjeiz"] {',
        '  color: var(--usage-color-text-default, inherit);',
        '}',

        '[class*="sc-e91617d-4"] {',
        '  color: var(--usage-color-text-default, inherit);',
        '}',

        '.prism-side-nav-item a {',
        '  transition: background 0.2s ease, transform 0.15s ease !important;',
        '  border-radius: 10px !important;',
        '}',
        '.prism-side-nav-item a:hover {',
        '  background: var(--usage-color-background-hovered, rgba(0,0,0,0.05)) !important;',
        '}',

        '[class*="StyledText-sc-1ypoh6y-0"] {',
        '  color: var(--usage-color-text-default, inherit) !important;',
        '}',

        '[class*="StyledInlineChildren-sc-1dbwnk9-0"][class*="eFINKY"] {',
        '  padding: 0 !important; margin: 0 !important;',
        '}',

        '[data-testid="ConvenienceStorePageCarouselItem"] {',
        '  transition: transform 0.2s ease;',
        '}',
        '[data-testid="ConvenienceStorePageCarouselItem"]:hover {',
        '  transform: translateY(-2px);',
        '}',

        '[class*="sc-76f6277e-3"] img {',
        '  transition: transform 0.3s cubic-bezier(0.34,1.56,0.64,1);',
        '}',
        '[data-testid="ConvenienceStorePageCarouselItem"]:hover [class*="sc-76f6277e-3"] img {',
        '  transform: scale(1.15) rotate(-5deg);',
        '}',

        '[data-testid="ConvenienceStorePageCarouselItem"][data-is-selected="true"] [class*="sc-76f6277e-2"] {',
        '  box-shadow: 0 2px 8px rgba(255,48,8,0.2);',
        '}',

        '[class*="Root-sc-nmoa4y-4"] {',
        '  padding: 0 !important; margin: 0 !important;',
        '}',

        '[class*="sc-1fe87388-0"] {',
        '  padding: 0 !important; margin: 0 !important;',
        '}',

        '[data-anchor-id="CarouselControllerTitleContent"] {',
        '  transition: color 0.2s ease;',
        '}',

        '[class*="sc-1fe87388-1"] a:hover {',
        '  text-decoration: none !important;',
        '  opacity: 0.8;',
        '}',

        '[data-testid="RetailItemCardCardContent"] {',
        '  border-radius: 14px !important;',
        '  transition: transform 0.25s cubic-bezier(0.34,1.56,0.64,1),',
        '              box-shadow 0.25s ease !important;',
        '  animation: dd-sp-slide-up 0.4s ease-out both;',
        '  overflow: hidden;',
        '}',
        '[data-testid="RetailItemCardCardContent"]:hover {',
        '  transform: translateY(-4px) scale(1.02) !important;',
        '  box-shadow: 0 8px 24px rgba(0,0,0,0.12) !important;',
        '  z-index: 5 !important; position: relative;',
        '}',

        '[data-testid="RetailItemCardImageWithOptionalStepper"] img {',
        '  transition: transform 0.4s cubic-bezier(0.25,0.46,0.45,0.94) !important;',
        '  border-radius: 10px !important;',
        '}',
        '[data-testid="RetailItemCardCardContent"]:hover [data-testid="RetailItemCardImageWithOptionalStepper"] img {',
        '  transform: scale(1.06) !important;',
        '}',

        '[class*="sc-85923f71-0"] {',
        '  font-weight: 700 !important;',
        '}',

        '[data-testid="price-name-info-opacity-wrapper"] {',
        '  transition: transform 0.2s ease;',
        '}',
        '[data-testid="RetailItemCardCardContent"]:hover [data-testid="price-name-info-opacity-wrapper"] {',
        '  transform: translateY(-1px);',
        '}',

        '[data-testid="add-button-label"] {',
        '  transition: transform 0.15s ease;',
        '}',
        '[class*="sc-76322cb4-4"][class*="ffjZqa"] {',
        '  background: linear-gradient(135deg, #2d9a06, #3eae0a) !important;',
        '  color: #fff !important;',
        '  border-radius: 8px !important;',
        '  box-shadow: 0 2px 8px rgba(62,174,10,0.3);',
        '  transition: transform 0.2s cubic-bezier(0.34,1.56,0.64,1),',
        '              box-shadow 0.2s ease !important;',
        '}',
        '[class*="sc-76322cb4-4"][class*="ffjZqa"]:hover {',
        '  transform: scale(1.08) !important;',
        '  box-shadow: 0 4px 14px rgba(62,174,10,0.45) !important;',
        '}',

        '[class*="Text-sc-1nn8hom-0"][class*="dfSikg"] {',
        '  font-weight: 600 !important;',
        '}',

        '[data-testid="RetailItemCardStepperContainer"] {',
        '  transition: opacity 0.2s ease;',
        '}',
        '[data-testid="RetailItemCardQuantityStepperContainer"] [data-testid="QuantityContainer"] {',
        '  border-radius: 10px !important;',
        '  transition: box-shadow 0.2s ease;',
        '}',
        '[data-testid="RetailItemCardQuantityStepperContainer"] [data-testid="QuantityContainer"]:hover {',
        '  box-shadow: 0 0 0 2px rgba(255,48,8,0.2);',
        '}',

        '[data-testid="sticky-store-search-v2"] [class*="InputContainer-sc-"] {',
        '  border-radius: 12px !important;',
        '  transition: box-shadow 0.3s ease !important;',
        '}',
        '[data-testid="sticky-store-search-v2"] input:focus {',
        '  box-shadow: 0 0 0 3px rgba(255,48,8,0.15) !important;',
        '}',

        '[data-testid="lego-facet-card-creative-cell"] {',
        '  border-radius: 14px !important;',
        '  overflow: hidden;',
        '  transition: transform 0.25s ease, box-shadow 0.25s ease !important;',
        '}',
        '[data-testid="lego-facet-card-creative-cell"]:hover {',
        '  transform: translateY(-3px) !important;',
        '  box-shadow: 0 8px 24px rgba(0,0,0,0.12) !important;',
        '}',

        '[data-testid="ConvenienceLegoSectionContainer"] {',
        '  animation: dd-sp-slide-up 0.5s ease-out both;',
        '}',

        '[class*="sc-dd3a85f9"] > div > div {',
        '  margin-bottom: 0 !important;',
        '}',

        '[data-testid*="carousel-left-button"], [data-testid*="carousel-right-button"] {',
        '  transition: transform 0.15s ease, opacity 0.2s ease !important;',
        '}',
        '[data-testid*="carousel-left-button"]:hover, [data-testid*="carousel-right-button"]:hover {',
        '  transform: scale(1.15) !important;',
        '}',
        '[data-testid*="carousel-left-button"]:active, [data-testid*="carousel-right-button"]:active {',
        '  transform: scale(0.9) !important;',
        '}',

        '[data-testid*="best_value"] {',
        '  animation: dd-sp-pop 0.4s ease-out both;',
        '}',

        // FIX #8: Use partial class matches instead of fully-qualified obfuscated names
        '[class*="StyledInlineChildren-sc-"][class*="bApFGz"] {',
        '  color: #ffffff !important;',
        '}',

        '[class*="StyledStackChildren-sc-"][class*="sc-afac318a-0"] {',
        '  background-color: transparent !important;',
        '}',

        ].join("\n");
    }


    // =====================================================================
    //  SEARCH HISTORY
    // =====================================================================
    function showSearchHistory(inputEl, history) {
        var old = document.getElementById(SCRIPT_ID + '-search-history');
        if (old) old.remove();
        var bg = '#222230';
        var fg = '#e0e0e8';
        var hoverBg = '#2a2a35';
        var bdr = '#3a3a45';

        var dropdown = document.createElement('div');
        dropdown.id = SCRIPT_ID + '-search-history';
        Object.assign(dropdown.style, {
            position: 'absolute', top: (inputEl.offsetHeight + 4) + 'px', left: '0', right: '0',
            background: bg, border: '1px solid ' + bdr, borderRadius: '8px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)', zIndex: '99999', maxHeight: '300px', overflowY: 'auto',
        });
        var title = document.createElement('div');
        title.textContent = 'Recent Searches';
        Object.assign(title.style, { padding: '8px 12px', fontSize: '11px', color: '#888', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' });
        dropdown.appendChild(title);
        history.forEach(function(term) {
            var item = document.createElement('div');
            item.textContent = term;
            Object.assign(item.style, { padding: '8px 12px', cursor: 'pointer', fontSize: '14px', color: fg, transition: 'background 0.15s' });
            item.onmouseenter = function() { item.style.background = hoverBg; };
            item.onmouseleave = function() { item.style.background = 'transparent'; };
            item.onclick = function() { inputEl.value = term; inputEl.dispatchEvent(new Event('input', { bubbles: true })); dropdown.remove(); };
            dropdown.appendChild(item);
        });
        var wrapper = inputEl.closest('[data-testid="SearchInput"]') || inputEl.parentElement;
        if (wrapper) { wrapper.style.position = 'relative'; wrapper.appendChild(dropdown); }
        setTimeout(function() {
            document.addEventListener('click', function handler(e) {
                if (!dropdown.contains(e.target) && e.target !== inputEl) { dropdown.remove(); document.removeEventListener('click', handler); }
            });
        }, 100);
    }


    // =====================================================================
    //  PRICE CALCULATOR
    // =====================================================================
    function updatePriceCalc() {
        var subtotal = 0, itemCount = 0;
        var subtotalEl = document.querySelector('[data-testid="Subtotal"]');
        if (subtotalEl) {
            var m = (subtotalEl.textContent || '').match(/\$(\d+\.?\d*)/);
            if (m) { subtotal = parseFloat(m[1]); itemCount = 1; }
        }
        if (itemCount === 0) {
            document.querySelectorAll('[data-testid="GenericItemCard"]').forEach(function(card) {
                var pm = (card.textContent || '').match(/\$(\d+\.?\d*)/);
                if (pm) { subtotal += parseFloat(pm[1]); itemCount++; }
            });
        }
        var calc = document.getElementById(SCRIPT_ID + '-calc');
        if (itemCount === 0) { if (calc) calc.remove(); return; }

        var sf = subtotal * 0.15, df = 3.99, tx = subtotal * 0.10, total = subtotal + sf + df + tx;
        var bgC = '#1c1c25', fgC = '#e0e0e8';
        var bc = '#2a2a35', fb = 'rgba(255,80,40,0.08)';
        if (!calc) {
            calc = document.createElement('div');
            calc.id = SCRIPT_ID + '-calc';
            Object.assign(calc.style, {
                position: 'fixed', bottom: '80px', right: '20px', zIndex: '99998',
                background: bgC, borderRadius: '12px', padding: '16px', border: '1px solid ' + bc,
                boxShadow: '0 4px 20px rgba(0,0,0,0.3)', minWidth: '220px', fontSize: '13px', color: fgC,
            });
            document.body.appendChild(calc);
        }
        calc.innerHTML =
            '<div style="font-weight:700;font-size:14px;margin-bottom:8px">Estimated Total</div>' +
            '<div style="display:flex;justify-content:space-between;padding:4px 0"><span>Subtotal</span><span>$' + subtotal.toFixed(2) + '</span></div>' +
            '<div style="display:flex;justify-content:space-between;padding:4px 0;color:#ff5028;background:' + fb + ';margin:0 -16px;padding:4px 16px"><span>~Service Fee (15%)</span><span>$' + sf.toFixed(2) + '</span></div>' +
            '<div style="display:flex;justify-content:space-between;padding:4px 0;color:#e6a200"><span>~Delivery</span><span>$' + df.toFixed(2) + '</span></div>' +
            '<div style="display:flex;justify-content:space-between;padding:4px 0"><span>~Tax (10%)</span><span>$' + tx.toFixed(2) + '</span></div>' +
            '<div style="height:1px;background:' + bc + ';margin:8px 0"></div>' +
            '<div style="display:flex;justify-content:space-between;padding:4px 0;font-weight:700;font-size:15px"><span>Grand Total</span><span>$' + total.toFixed(2) + '</span></div>' +
            '<div style="font-size:10px;color:#888;margin-top:8px;text-align:center">Estimates only. Actual fees may vary.</div>';
    }


    // =====================================================================
    //  UTILITIES
    // =====================================================================
    function injectStyle(id, css) {
        removeStyle(id);
        var el = document.createElement('style');
        el.id = id;
        el.textContent = css;
        (document.head || document.documentElement).appendChild(el);
    }
    function removeStyle(id) { var el = document.getElementById(id); if (el) el.remove(); }
    function isStorePage() { return /\/store\//.test(location.pathname); }
    // FIX #7: URL-first short-circuit for checkout detection
    function isCheckoutPage() { return /\/checkout/i.test(location.pathname); }


    // =====================================================================
    //  SPA NAVIGATION
    // =====================================================================
    function setupSPAHandler() {
        var origPush = history.pushState;
        var origReplace = history.replaceState;
        history.pushState = function() { origPush.apply(this, arguments); window.dispatchEvent(new Event('dd-nav')); };
        history.replaceState = function() { origReplace.apply(this, arguments); window.dispatchEvent(new Event('dd-nav')); };
        window.addEventListener('popstate', function() { window.dispatchEvent(new Event('dd-nav')); });
        window.addEventListener('dd-nav', function() {
            _tipApplied = false;
            setTimeout(function() {
                features.forEach(function(f) { if (getSetting(f.key) && f.onNavigate) f.onNavigate(); });
                if (getSetting('feeHighlighter')) annotateFees();
            }, 500);
        });
    }


    // =====================================================================
    //  HEADER BUTTONS (draggable settings gear, fixed position)
    // =====================================================================
    var GEAR_SVG = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/></svg>';

    function initHeaderButtons() {
        // FIX #1: Wait for body before appending
        if (document.body) {
            placeHeaderButtons();
        } else {
            document.addEventListener('DOMContentLoaded', placeHeaderButtons);
        }
    }

    function placeHeaderButtons() {
        var existing = document.getElementById(SCRIPT_ID + '-hdr-btns');
        if (existing && document.contains(existing)) return;
        if (existing) existing.remove();

        var container = document.createElement('div');
        container.id = SCRIPT_ID + '-hdr-btns';

        // Restore saved position or default to bottom-left
        var savedPos = GM_getValue(SCRIPT_ID + '_gearPos', null);
        if (savedPos) {
            var x = Math.max(0, Math.min(savedPos.x, window.innerWidth - 42));
            var y = Math.max(0, Math.min(savedPos.y, window.innerHeight - 42));
            container.style.left = x + 'px';
            container.style.top = y + 'px';
        } else {
            container.style.left = '16px';
            container.style.top = (window.innerHeight - 56) + 'px';
        }

        var settingsBtn = document.createElement('button');
        settingsBtn.title = 'DoorDash Enhanced Settings';
        settingsBtn.setAttribute('aria-label', 'DoorDash Enhanced Settings');
        settingsBtn.innerHTML = GEAR_SVG;

        container.appendChild(settingsBtn);
        document.body.appendChild(container);

        // --- FIX #3: Drag logic with scoped document listeners ---
        var dragging = false, hasDragged = false;
        var startX, startY, startLeft, startTop;

        function onMove(e) {
            if (!dragging) return;
            var evt = e.touches ? e.touches[0] : e;
            var dx = evt.clientX - startX;
            var dy = evt.clientY - startY;
            if (!hasDragged && Math.abs(dx) < 4 && Math.abs(dy) < 4) return;
            hasDragged = true;
            var newX = Math.max(0, Math.min(startLeft + dx, window.innerWidth - 42));
            var newY = Math.max(0, Math.min(startTop + dy, window.innerHeight - 42));
            container.style.left = newX + 'px';
            container.style.top = newY + 'px';
        }

        function onUp() {
            if (!dragging) return;
            dragging = false;
            container.classList.remove('dd-dragging');
            // Remove document-level listeners immediately
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
            document.removeEventListener('touchmove', onMove);
            document.removeEventListener('touchend', onUp);
            if (hasDragged) {
                GM_setValue(SCRIPT_ID + '_gearPos', {
                    x: parseInt(container.style.left, 10),
                    y: parseInt(container.style.top, 10)
                });
            } else {
                toggleSettingsPanel();
            }
        }

        function onDown(e) {
            if (e.button && e.button !== 0) return;
            dragging = true;
            hasDragged = false;
            var evt = e.touches ? e.touches[0] : e;
            startX = evt.clientX;
            startY = evt.clientY;
            var rect = container.getBoundingClientRect();
            startLeft = rect.left;
            startTop = rect.top;
            container.classList.add('dd-dragging');
            // Attach document listeners only during active drag
            document.addEventListener('mousemove', onMove);
            document.addEventListener('mouseup', onUp);
            document.addEventListener('touchmove', onMove, { passive: false });
            document.addEventListener('touchend', onUp);
            e.preventDefault();
        }

        container.addEventListener('mousedown', onDown);
        container.addEventListener('touchstart', onDown, { passive: false });
    }


    // =====================================================================
    //  SETTINGS PANEL (always dark themed)
    // =====================================================================
    function toggleSettingsPanel() {
        var existing = document.getElementById(SCRIPT_ID + '-settings');
        if (existing) { existing.remove(); var bd = document.getElementById(SCRIPT_ID + '-backdrop'); if (bd) bd.remove(); return; }

        var bg = '#1a1a25';
        var fg = '#e0e0e8';
        var borderC = '#2a2a35';
        var groupBg = '#141420';
        var rowHov = '#222230';

        var panel = document.createElement('div');
        panel.id = SCRIPT_ID + '-settings';
        Object.assign(panel.style, {
            position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
            background: bg, color: fg, borderRadius: '16px', zIndex: '100000',
            width: '440px', maxHeight: '80vh', overflowY: 'auto',
            boxShadow: '0 20px 60px rgba(0,0,0,0.5)', border: '1px solid ' + borderC,
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        });

        var hdr = document.createElement('div');
        Object.assign(hdr.style, { padding: '20px 24px', borderBottom: '1px solid ' + borderC, display: 'flex', justifyContent: 'space-between', alignItems: 'center' });
        hdr.innerHTML = '<div><div style="font-size:18px;font-weight:700">DoorDash Enhanced</div><div style="font-size:12px;color:#888;margin-top:2px">v' + VERSION + ' &mdash; Dark Mode Always On</div></div>';
        var closeBtn = document.createElement('button');
        Object.assign(closeBtn.style, { background: 'transparent', border: 'none', color: fg, cursor: 'pointer', fontSize: '24px', padding: '4px 8px', lineHeight: '1' });
        closeBtn.textContent = '\u00D7';
        closeBtn.addEventListener('click', function() { panel.remove(); var bd2 = document.getElementById(SCRIPT_ID + '-backdrop'); if (bd2) bd2.remove(); });
        hdr.appendChild(closeBtn);
        panel.appendChild(hdr);

        var groups = {};
        features.forEach(function(f) { if (!groups[f.group]) groups[f.group] = []; groups[f.group].push(f); });

        var content = document.createElement('div');
        content.style.padding = '16px 24px';

        Object.keys(groups).forEach(function(groupName) {
            var items = groups[groupName];
            var groupEl = document.createElement('div');
            groupEl.style.marginBottom = '16px';
            var titleEl = document.createElement('div');
            Object.assign(titleEl.style, { fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', color: '#888', marginBottom: '8px' });
            titleEl.textContent = groupName;
            groupEl.appendChild(titleEl);

            var box = document.createElement('div');
            Object.assign(box.style, { background: groupBg, borderRadius: '10px', border: '1px solid ' + borderC, overflow: 'hidden' });

            items.forEach(function(f, idx) {
                var row = document.createElement('div');
                Object.assign(row.style, {
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '12px 14px', cursor: f.custom ? 'default' : 'pointer',
                    borderBottom: idx < items.length - 1 ? '1px solid ' + borderC : 'none',
                    transition: 'background 0.15s',
                });
                if (!f.custom) {
                    row.onmouseenter = function() { row.style.background = rowHov; };
                    row.onmouseleave = function() { row.style.background = 'transparent'; };
                }

                var label = document.createElement('div');
                label.style.flex = '1';
                label.innerHTML = '<div style="font-size:14px;font-weight:500">' + f.name + '</div><div style="font-size:11px;color:#888;margin-top:2px">' + f.desc + '</div>';

                // --- Custom UI for tipDefault ---
                if (f.key === 'tipDefault') {
                    var tipVal = getSetting('tipDefault') || 'off';
                    var ctrl = document.createElement('div');
                    ctrl.style.cssText = 'flex-shrink:0;margin-left:12px;display:flex;align-items:center;gap:6px';

                    var sel = document.createElement('select');
                    Object.assign(sel.style, {
                        background: '#222230', color: fg,
                        border: '1px solid ' + borderC, borderRadius: '8px',
                        padding: '6px 8px', fontSize: '13px', cursor: 'pointer',
                        outline: 'none',
                    });
                    var opts = [
                        { val: 'off', text: 'Off' },
                        { val: 'remember', text: 'Remember last' },
                        { val: 'custom', text: 'Fixed amount' },
                    ];
                    opts.forEach(function(o) {
                        var opt = document.createElement('option');
                        opt.value = o.val; opt.textContent = o.text;
                        if (o.val === 'off' && tipVal === 'off') opt.selected = true;
                        if (o.val === 'remember' && tipVal === 'remember') opt.selected = true;
                        if (o.val === 'custom' && tipVal !== 'off' && tipVal !== 'remember') opt.selected = true;
                        sel.appendChild(opt);
                    });

                    var amtWrap = document.createElement('div');
                    amtWrap.style.cssText = 'display:flex;align-items:center;gap:2px';
                    var dollar = document.createElement('span');
                    dollar.textContent = '$';
                    dollar.style.cssText = 'font-size:14px;font-weight:600;color:' + fg;
                    var amtInput = document.createElement('input');
                    Object.assign(amtInput.style, {
                        width: '60px', background: '#222230', color: fg,
                        border: '1px solid ' + borderC, borderRadius: '8px',
                        padding: '6px 8px', fontSize: '13px', outline: 'none',
                    });
                    amtInput.type = 'text'; amtInput.placeholder = '0.00';
                    if (tipVal !== 'off' && tipVal !== 'remember') amtInput.value = tipVal;

                    function toggleAmtInput() {
                        var show = sel.value === 'custom';
                        amtWrap.style.display = show ? 'flex' : 'none';
                    }
                    toggleAmtInput();

                    function saveTipSetting() {
                        var v = sel.value;
                        if (v === 'custom') {
                            var amt = amtInput.value.replace(/[^0-9.]/g, '');
                            if (!amt || isNaN(parseFloat(amt))) amt = '0';
                            v = parseFloat(amt).toFixed(2);
                            amtInput.value = v;
                        }
                        setSetting('tipDefault', v);
                        _tipApplied = false;
                        try { if (v !== 'off') { initTipDefault(); } else { destroyTipDefault(); } } catch(e) {}
                    }

                    sel.addEventListener('change', function() { toggleAmtInput(); saveTipSetting(); });
                    amtInput.addEventListener('change', saveTipSetting);
                    amtInput.addEventListener('keydown', function(e) { if (e.key === 'Enter') saveTipSetting(); });

                    var remembered = GM_getValue(SCRIPT_ID + '_tipLastAmount', null);
                    if (remembered && tipVal === 'remember') {
                        label.querySelector('div:last-child').textContent = f.desc + ' (last: $' + remembered + ')';
                    }

                    amtWrap.appendChild(dollar);
                    amtWrap.appendChild(amtInput);
                    ctrl.appendChild(sel);
                    ctrl.appendChild(amtWrap);
                    row.appendChild(label);
                    row.appendChild(ctrl);
                    box.appendChild(row);
                    return;
                }

                // --- Standard boolean toggle ---
                var toggle = document.createElement('div');
                toggle.style.cssText = 'flex-shrink:0;margin-left:12px';
                function renderToggle(on) {
                    toggle.innerHTML = '<div style="width:44px;height:24px;border-radius:12px;background:' + (on ? '#ff3008' : '#555') + ';position:relative;transition:background 0.2s">' +
                        '<div style="width:20px;height:20px;border-radius:50%;background:#fff;position:absolute;top:2px;left:' + (on ? '22px' : '2px') + ';transition:left 0.2s;box-shadow:0 1px 3px rgba(0,0,0,0.3)"></div></div>';
                }
                renderToggle(getSetting(f.key));
                row.addEventListener('click', function() {
                    var cur = getSetting(f.key);
                    setSetting(f.key, !cur);
                    renderToggle(!cur);
                    try { if (!cur) f.init(); else f.destroy(); } catch(e) { console.error('[DD Enhanced] ' + f.key + ':', e); }
                });
                row.appendChild(label);
                row.appendChild(toggle);
                box.appendChild(row);
            });
            groupEl.appendChild(box);
            content.appendChild(groupEl);
        });

        var resetBtn = document.createElement('button');
        Object.assign(resetBtn.style, {
            width: '100%', padding: '10px', background: 'transparent',
            border: '1px solid ' + borderC, borderRadius: '8px',
            color: '#ff3008', cursor: 'pointer', fontSize: '13px', fontWeight: '500', margin: '8px 0',
        });
        resetBtn.textContent = 'Reset All Settings';
        resetBtn.addEventListener('click', function() {
            features.forEach(function(f) { try { f.destroy(); } catch(e) {} setSetting(f.key, DEFAULT_SETTINGS[f.key]); });
            // FIX #4: Also clear gear position and other non-feature keys
            GM_setValue(SCRIPT_ID + '_gearPos', null);
            GM_setValue(SCRIPT_ID + '_search_history', '[]');
            GM_setValue(SCRIPT_ID + '_tipLastAmount', null);
            panel.remove(); var bd3 = document.getElementById(SCRIPT_ID + '-backdrop'); if (bd3) bd3.remove();
            location.reload();
        });
        content.appendChild(resetBtn);
        panel.appendChild(content);

        var backdrop = document.createElement('div');
        Object.assign(backdrop.style, { position: 'fixed', inset: '0', background: 'rgba(0,0,0,0.5)', zIndex: '99999' });
        backdrop.id = SCRIPT_ID + '-backdrop';
        backdrop.addEventListener('click', function() { panel.remove(); backdrop.remove(); });
        document.body.appendChild(backdrop);
        document.body.appendChild(panel);
    }


    // =====================================================================
    //  INIT
    // =====================================================================
    function init() {
        // Dark mode is always on - inject immediately (works at document-start)
        injectStyle(SCRIPT_ID + '-dark', darkModeCSS());

        // FIX #8: Use partial class matches for core CSS overrides
        injectStyle(SCRIPT_ID + '-core', [
            '/* Dark mode overrides - partial class matches */',
            '[class*="StyledStackChildren-sc-"][class*="sc-afac318a-0"] {',
            '  background-color: transparent !important;',
            '}',
            '[class*="StyledInlineChildren-sc-"][class*="bApFGz"] {',
            '  color: #ffffff !important;',
            '}',
            '/* Sidebar icon slots - blue accent */',
            '[class*="IconSlot-sc-"] {',
            '  background-color: #1e88e5 !important;',
            '  border-radius: 8px;',
            '}',
            '/* Hide misc promo element */',
            'div.sc-b24365ad-0.jWrhwp {',
            '  display: none !important;',
            '}',
            '/* Hide ALL CMS promotional banners */',
            '[class*="sc-34f18914-0"],',
            '[class*="sc-34f18914-1"],',
            '[class*="sc-34f18914-2"],',
            '[class*="sc-34f18914-4"],',
            '[class*="sc-34f18914-5"] {',
            '  display: none !important;',
            '}',
            '/* Hide carousel pagination dots */',
            '[class*="Root-sc-nmoa4y-4"][class*="cAkoGG"] {',
            '  display: none !important;',
            '}',
            '#' + SCRIPT_ID + '-hdr-btns {',
            '  position: fixed; z-index: 99999;',
            '  display: inline-flex; align-items: center; gap: 2px;',
            '  background: #1a1a22; border-radius: 50%; padding: 0;',
            '  box-shadow: 0 2px 12px rgba(0,0,0,0.4);',
            '  border: 1px solid #2a2a35;',
            '  transition: box-shadow 0.2s ease;',
            '  cursor: grab; touch-action: none; user-select: none;',
            '}',
            '#' + SCRIPT_ID + '-hdr-btns.dd-dragging {',
            '  cursor: grabbing; box-shadow: 0 6px 24px rgba(0,0,0,0.6); opacity: 0.85;',
            '}',
            '#' + SCRIPT_ID + '-hdr-btns:hover {',
            '  box-shadow: 0 4px 20px rgba(0,0,0,0.5);',
            '}',
            '#' + SCRIPT_ID + '-hdr-btns button {',
            '  width: 40px; height: 40px; border: none; border-radius: 50%;',
            '  background: transparent; color: #e0e0e8;',
            '  cursor: inherit; display: flex; align-items: center; justify-content: center;',
            '  transition: color 0.15s; padding: 0; pointer-events: none;',
            '}',
            '#' + SCRIPT_ID + '-hdr-btns:hover button {',
            '  color: #ff3008;',
            '}',
        ].join('\n'));

        // FIX #1: Defer body-dependent work until DOM is ready
        function initFeatures() {
            features.forEach(function(f) {
                if (f.custom) {
                    var val = getSetting(f.key);
                    if (val && val !== 'off') {
                        try { f.init(); } catch(e) { console.error('[DD Enhanced] Init ' + f.key + ':', e); }
                    }
                } else if (getSetting(f.key)) {
                    try { f.init(); } catch(e) { console.error('[DD Enhanced] Init ' + f.key + ':', e); }
                }
            });

            setupSPAHandler();
            initHeaderButtons();
            GM_registerMenuCommand('Open Settings', toggleSettingsPanel);
            console.log('[DoorDash Enhanced] v' + VERSION + ' loaded. Dark mode always on. Single-observer architecture.');
        }

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initFeatures);
        } else {
            initFeatures();
        }
    }

    init();

})();