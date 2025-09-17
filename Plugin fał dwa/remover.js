// remover.js v30.3 - Wersja "Duch"
console.log("WP Ad Inspector (v30.3) - REMOVER/STEALTH - Initialized.");

// --- BROŃ NR 1: MECHANIZM ANTY-ANTY-ADBLOCK ("KŁAMCA") ---
try {
    const originalGetComputedStyle = window.getComputedStyle;
    window.getComputedStyle = function(element, pseudoElt) {
        const baitSelectors = ['.adsbygoogle', '[class*="ad-"]', '[id*="-ad-"]', '[id*="adocean"]'];
        if (element && baitSelectors.some(selector => element.matches(selector))) {
            if (element.style.display === 'none') {
                const originalStyle = originalGetComputedStyle.call(this, element, pseudoElt);
                return new Proxy(originalStyle, {
                    get: function(target, prop) {
                        if (prop === 'display' || prop === 'visibility') {
                            return 'block'; // Kłamiemy, że element jest widoczny.
                        }
                        return Reflect.get(target, prop);
                    }
                });
            }
        }
        return originalGetComputedStyle.call(this, element, pseudoElt);
    };
    console.log("WP Ad Inspector: Mechanizm Anty-Anty-Adblock jest AKTYWNY.");
} catch(e) { console.error("Nie udało się aktywować ochrony przed wykrywaniem.", e); }


// --- SEKCJA KONFIGURACJI I ZMIENNYCH GLOBALNYCH (z v28.2) ---
const BLOCKING_STATE_KEY = 'isBlockingEnabled';
const CUSTOM_RULES_KEY = 'customBlockedSelectors';
const WHITELIST_KEY = 'whitelistedDomains';
const MONITORED_AD_SELECTORS = [
    '[id^="google_ads_iframe_"]', '[id^="div-gpt-ad-"]', '.adsbygoogle',
    '[id*="adocean"]', '[id*="gemius"]', '[data-ad-placeholder]', '[data-ad-slot]',
    'ins.adsbygoogle', 'iframe[src*="googlesyndication.com"]', 'iframe[src*="doubleclick.net"]',
    'div[data-google-query-id]', '[aria-label="Advertisement"]',
    'a[href*="doubleclick.net"]', 'a[href*="ad.wp.pl"]'
];
const elementProxyMap = new WeakMap();
let isPickerActive = false;
let highlightedElement = null;


// --- SEKCJA FUNKCJI (z v28.2) ---
function logEvent(message, element = null, isAdBlocked = false) {
    const timestamp = new Date().toLocaleTimeString();
    let logMessage = `[${timestamp}] ${message}`;
    if (element) {
        const tag = element.tagName;
        const id = element.id ? `#${element.id}` : '';
        const classes = element.className ? `.${element.className.split(' ').join('.')}` : '';
        logMessage += ` | Element: ${tag}${id}${classes}`;
    }
    console.log(`[WP Ad Inspector] ${logMessage}`, element || '');

    chrome.storage.local.get(['inspector_logs'], (result) => {
        const logs = result.inspector_logs || [];
        logs.push(logMessage);
        chrome.storage.local.set({ 'inspector_logs': logs });
    });

    if (isAdBlocked) {
        chrome.runtime.sendMessage({ type: "AD_BLOCKED" }).catch(error => {
            if (!error.message.includes("Receiving end does not exist")) {
                 console.error("Błąd podczas wysyłania wiadomosci AD_BLOCKED:", error);
            }
        });
    }
}

// --- SEKCJA WARSTW OCHRONY PRZED REKLAMAMI (z v28.2) ---
function interceptEventHandlers() {
    const originalAddEventListener = Element.prototype.addEventListener;
    const monitoredEvents = ['click', 'mousedown', 'mouseup', 'touchstart'];
    const selectorsString = MONITORED_AD_SELECTORS.join(',');

    Element.prototype.addEventListener = function(type, listener, options) {
        if (monitoredEvents.includes(type) && this.matches(selectorsString)) {
            logEvent(`EventHandler-Guard (L1): Zablokowano próbę dodania '${type}' do reklamy.`, this, true);
            this.style.setProperty('display', 'none', 'important');
            return;
        }
        originalAddEventListener.call(this, type, listener, options);
    };
    logEvent("Init: Warstwa 1 (EventHandler-Guard) jest aktywna.");
}

async function applyPropertyGuardToElements() {
    const result = await chrome.storage.local.get({ [CUSTOM_RULES_KEY]: [] });
    const allSelectors = [...new Set([...MONITORED_AD_SELECTORS, ...result[CUSTOM_RULES_KEY]])];
    const eventProperties = ['onclick', 'onmousedown', 'onmouseup', 'ontouchstart'];

    document.querySelectorAll(allSelectors.join(',')).forEach(element => {
        if (element.dataset.propertyGuarded) return;
        element.dataset.propertyGuarded = 'true';

        eventProperties.forEach(prop => {
            Object.defineProperty(element, prop, {
                configurable: true,
                set: function(handler) {
                    logEvent(`Property-Guard (L2): Zablokowano próbę ustawienia '${prop}' na reklamie.`, this, true);
                    this.style.setProperty('display', 'none', 'important');
                }
            });
        });
    });
}

function applyTrueProxyGuard() {
    const selectorsString = MONITORED_AD_SELECTORS.join(',');
    const elementsToProxy = document.querySelectorAll(selectorsString);

    elementsToProxy.forEach(el => {
        if (elementProxyMap.has(el)) {
            return;
        }
        const handler = {
            set: function(target, prop, value) {
                const eventProperties = ['onclick', 'onmousedown', 'onmouseup', 'ontouchstart'];
                if (eventProperties.includes(prop)) {
                    logEvent(`Proxy-Guard (L3): Przechwycono próbę ustawienia '${prop}' przez Proxy.`, target, true);
                    target.style.setProperty('display', 'none', 'important');
                    return true;
                }
                return Reflect.set(target, prop, value);
            }
        };
        const proxy = new Proxy(el, handler);
        elementProxyMap.set(el, proxy);
    });
}

// --- SEKCJA FUNKCJI "PICKERA" (z v28.2) ---
function generateSelector(el) {
    if (!(el instanceof Element)) return null;
    const root = el.getRootNode();
    if (root instanceof ShadowRoot) {
        if (el.id) return `#${CSS.escape(el.id)}`;
        return `${el.tagName.toLowerCase()}`;
    }
    const parts = [];
    while (el && el.nodeType === Node.ELEMENT_NODE) {
        let selector = el.nodeName.toLowerCase();
        if (el.id) {
            try {
                if (document.querySelector(el.nodeName.toLowerCase() + '#' + CSS.escape(el.id)) === el) {
                    selector += '#' + CSS.escape(el.id);
                    parts.unshift(selector);
                    break;
                }
            } catch (e) {  }
        }
        let sib = el, nth = 1;
        while (sib = sib.previousElementSibling) {
            if (sib.nodeName.toLowerCase() == selector) nth++;
        }
        if (nth != 1) selector += `:nth-of-type(${nth})`;
        parts.unshift(selector);
        el = el.parentNode;
    }
    return parts.join(' > ');
}

async function saveNewCustomRule(selector) {
    if (!selector) return;
    logEvent(`Picker: Zapisywanie reguły dla selektora: ${selector}`);
    const result = await chrome.storage.local.get({ [CUSTOM_RULES_KEY]: [] });
    const customRules = result[CUSTOM_RULES_KEY];
    if (!customRules.includes(selector)) {
        customRules.push(selector);
        await chrome.storage.local.set({ [CUSTOM_RULES_KEY]: customRules });
        logEvent(`Picker: Zapisano nową regułę. Całkowita liczba reguł niestandardowych: ${customRules.length}`);
    } else {
        logEvent(`Picker: Reguła już istnieje. Nie podjęto żadnej akcji.`);
    }
}

function handleElementSelection(e) {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    const trueTarget = e.composedPath && e.composedPath()[0] || e.target;
    let elementToRemove = trueTarget;
    let selector = null;
    try {
        const root = trueTarget.getRootNode();
        if (root instanceof ShadowRoot) {
            logEvent("Picker: Wykryto Shadow DOM. Celuję w element-hosta.", root.host);
            elementToRemove = root.host;
        }
        selector = generateSelector(elementToRemove);
    } catch (err) {
        logEvent(`!!! Błąd Pickera: Nie udało się przeanalizować elementu. Awaryjne usuwanie celu. Błąd: ${err.message}`);
        elementToRemove = trueTarget;
    }
    if (elementToRemove && elementToRemove.remove) {
        elementToRemove.remove();
        logEvent("Picker: Element usunięty pomyślnie.", elementToRemove);
    } else {
        logEvent("Picker: NIE udało się usunąć elementu.", elementToRemove);
    }
    deactivatePicker();
    saveNewCustomRule(selector);
    return false;
}

function handleMouseOver(e) {
    const trueTarget = e.composedPath && e.composedPath()[0] || e.target;
    if (highlightedElement === trueTarget) return;
    if (highlightedElement) {
        try { highlightedElement.style.outline = ''; } catch (e) { }
    }
    highlightedElement = trueTarget;
    highlightedElement.style.outline = '3px dashed #FF00FF';
}

function activatePicker() {
    if (isPickerActive) return;
    isPickerActive = true;
    logEvent("Picker: Aktywowano.");
    document.addEventListener('mouseover', handleMouseOver, true);
    document.addEventListener('mousedown', handleElementSelection, true);
    document.addEventListener('click', handleElementSelection, true);
}

function deactivatePicker() {
    if (!isPickerActive) return;
    isPickerActive = false;
    if (highlightedElement) {
        try { highlightedElement.style.outline = ''; } catch (e) { }
    }
    document.removeEventListener('mouseover', handleMouseOver, true);
    document.removeEventListener('mousedown', handleElementSelection, true);
    document.removeEventListener('click', handleElementSelection, true);
    logEvent("Picker: Deaktywowano.");
}

// --- SEKCJA GŁÓWNYCH MECHANIZMÓW BLOKUJĄCYCH W DOM (z v28.2) ---
async function applyCustomRules() {
    const result = await chrome.storage.local.get({ [CUSTOM_RULES_KEY]: [] });
    const customRules = result[CUSTOM_RULES_KEY];
    if (customRules.length === 0) return;
    for (const selector of customRules) {
        try {
            document.querySelectorAll(selector).forEach(element => {
                if (element.style.display !== 'none') {
                    element.style.setProperty('display', 'none', 'important');
                }
            });
            document.querySelectorAll('*').forEach(el => {
                if (el.shadowRoot) {
                    el.shadowRoot.querySelectorAll(selector).forEach(shadowEl => {
                        shadowEl.style.setProperty('display', 'none', 'important');
                    });
                }
            });
        } catch (e) {
            logEvent(`Błąd reguły niestandardowej: Nieprawidłowy selektor '${selector}'.`);
        }
    }
}

function hidePrimaryAds() {
    document.querySelectorAll(MONITORED_AD_SELECTORS.join(',')).forEach(element => {
        const target = element.closest('div, ins, iframe, a');
        if (target && target.parentElement && target.style.display !== 'none') {
            logEvent("Wykrywanie Główne: Ukrywanie generycznego elementu reklamowego.", target, true);
            target.style.setProperty('display', 'none', 'important');
        }
    });
}

function hideFallbackAds() {
    const FALLBACK_CDN_HOST = 'v.wpimg.pl';
    const TRACKING_LINK_LENGTH_THRESHOLD = 150;
    const AD_DOMAINS = ['ads.wp.pl', 'doubleclick.net', 'gemius.pl'];
    const MAX_AD_HEIGHT_PX = 450;
    const DO_NOT_HIDE_SELECTORS = ['#wp-site-main', 'main', '#page', '#app', '#root', '.article-body', '.wp-section-aside'];
    const CONTENT_TAGS = ['h2', 'h3', 'h4', 'h5', 'p', 'span'];
    const AD_KEYWORDS = ['REKLAMA', 'SPONSOROWANY', 'PROMOCJA', 'MAT. SPONSOROWANY', 'MAT. P'];
    document.querySelectorAll(`img[src*="${FALLBACK_CDN_HOST}"]`).forEach(img => {
        const link = img.closest('a');
        if (!link || !link.href) return;
        const isLongRedirect = link.href.startsWith('https://www.wp.pl/') && link.href.length > TRACKING_LINK_LENGTH_THRESHOLD;
        const isDirectAdDomain = AD_DOMAINS.some(domain => link.href.includes(domain));
        if (!isLongRedirect && !isDirectAdDomain) { return; }
        const container = link.parentElement;
        if (!container || container.style.display === 'none') return;
        if (DO_NOT_HIDE_SELECTORS.some(selector => container.matches(selector))) { return; }
        if (container.getBoundingClientRect().height > MAX_AD_HEIGHT_PX) { return; }
        const hasContentTags = CONTENT_TAGS.some(selector => container.querySelector(selector));
        if (hasContentTags) {
            const textContent = container.textContent.toLowerCase();
            const hasAdKeywords = AD_KEYWORDS.some(keyword => textContent.includes(keyword.toLowerCase()));
            if (hasAdKeywords) {
                logEvent(`HunterGuard: Ukrywanie kontenera ze słowami reklamowymi pomimo obecności tagów treści.`, container, true);
                container.style.setProperty('display', 'none', 'important');
            }
        } else {
            logEvent("Wykrywanie Awaryjne (Hunter): Ukrywanie kontenera wyłącznie z reklamą.", container, true);
            container.style.setProperty('display', 'none', 'important');
        }
    });
}

function hidePlaceholders() {
    const placeholderSelector = '.wp-section-placeholder-container';
    document.querySelectorAll(placeholderSelector).forEach(element => {
        if (element.style.display !== 'none') {
            element.style.setProperty('display', 'none', 'important');
        }
    });
}

function applySafetyNet() {
    const CRITICAL_SELECTORS = ['body', '#wp-site-main', 'main', '#page', '#app', '#root'];
    CRITICAL_SELECTORS.forEach(selector => {
        try {
            const element = document.querySelector(selector);
            if (element && window.getComputedStyle(element).display === 'none') {
                element.style.setProperty('display', 'block', 'important');
                logEvent(`!!! SafetyNet URUCHOMIONY: Krytyczny element '${selector}' był ukryty, widoczność przywrócona.`);
            }
        } catch (e) { /* Może się zdarzyć, że getComputedStyle rzuci błędem na wczesnym etapie */ }
    });
}


// --- GŁÓWNA PĘTLA I INICJALIZACJA ---
async function runAllRoutines() {
    const result = await chrome.storage.local.get({ [BLOCKING_STATE_KEY]: true, [WHITELIST_KEY]: [] });
    if (!result[BLOCKING_STATE_KEY] || (result[WHITELIST_KEY] && result[WHITELIST_KEY].includes(window.location.hostname))) {
        return; 
    }
    await applyCustomRules();
    await applyPropertyGuardToElements();
    applyTrueProxyGuard();
    hidePrimaryAds();
    hideFallbackAds();
    hidePlaceholders();
    applySafetyNet();
}

// Uruchomienie Warstwy 1 natychmiast.
interceptEventHandlers();
// Pierwsze uruchomienie od razu.
runAllRoutines();

// --- BROŃ NR 2: BŁYSKAWICZNY REAKTOR (MutationObserver) ---
const observer = new MutationObserver((mutations) => {
    runAllRoutines();
});
observer.observe(document.documentElement, {
    childList: true,
    subtree: true
});
console.log("WP Ad Inspector: Błyskawiczny Reaktor (MutationObserver) jest AKTYWNY.");

// Listener na wiadomości.
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "ACTIVATE_PICKER") {
        activatePicker();
        sendResponse({ status: "Pipis tryb aktywny, spróbuj nie rozpierdolić strony" });
        return true;
    }
});
chrome.runtime.sendMessage({ type: "CONTENT_SCRIPT_LOADED" }).catch(error => {
    if (!error.message.includes("Receiving end does not exist")) {
         console.error("Błąd podczas wysyłania wiadomosci CONTENT_SCRIPT_LOADED:", error);
    }
});

// Końcowy log.
console.log("WP Ad Inspector (v30.3) - REMOVER/STEALTH - Wszystkie mechanizmy aktywne.");