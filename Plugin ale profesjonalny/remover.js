// remover.js v28.2 - z trzema warstwami ochrony (EventHandler, PropertyDefine i natywne Proxy)
console.log("WP Ad Inspector (v28.2) - CONTROLLER - Initialized.");

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

// Używamy WeakMap, aby przechowywać nasze proxy. Zapobiega to wyciekom pamięci.
// Jeśli element zostanie usunięty z DOM, garbage collector usunie go również z mapy.
const elementProxyMap = new WeakMap();

let isPickerActive = false;
let highlightedElement = null;

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
            console.error("Błąd podczas wysyłania wiadomosci AD_BLOCKED:", error);
        });
    }
}

// WARSTWA 1: Przechwytywanie przez nadpisanie prototypu (globalne, najskuteczniejsze)
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

// WARSTWA 2: Ochrona przez modyfikację właściwości obiektu DOM (globalne)
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

// NOWA SEKCJA: WARSTWA 3: Ochrona z użyciem JS Proxy (działa wewnątrz content_script)
function applyTrueProxyGuard() {
    const selectorsString = MONITORED_AD_SELECTORS.join(',');
    const elementsToProxy = document.querySelectorAll(selectorsString);

    elementsToProxy.forEach(el => {
        // Sprawdzamy, czy dla tego elementu nie stworzyliśmy już proxy
        if (elementProxyMap.has(el)) {
            return;
        }

        const handler = {
            set: function(target, prop, value) {
                const eventProperties = ['onclick', 'onmousedown', 'onmouseup', 'ontouchstart'];
                if (eventProperties.includes(prop)) {
                    logEvent(`Proxy-Guard (L3): Przechwycono próbę ustawienia '${prop}' przez Proxy.`, target, true);
                    target.style.setProperty('display', 'none', 'important');
                    // Zwracamy true, aby udawać, że operacja się powiodła, ale w rzeczywistości ją blokujemy
                    return true;
                }
                // Dla wszystkich innych właściwości pozwalamy na normalne działanie
                return Reflect.set(target, prop, value);
            }
        };

        const proxy = new Proxy(el, handler);
        elementProxyMap.set(el, proxy);
    });
}


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
    logEvent(`Picker: Saving rule for selector: ${selector}`);
    const result = await chrome.storage.local.get({ [CUSTOM_RULES_KEY]: [] });
    const customRules = result[CUSTOM_RULES_KEY];
    if (!customRules.includes(selector)) {
        customRules.push(selector);
        await chrome.storage.local.set({ [CUSTOM_RULES_KEY]: customRules });
        logEvent(`Picker: New rule saved. Total custom rules: ${customRules.length}`);
    } else {
        logEvent(`Picker: Rule already exists. No action taken.`);
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
            logEvent("Picker: Shadow DOM detected. Targeting host element.", root.host);
            elementToRemove = root.host;
        }
        selector = generateSelector(elementToRemove);
    } catch (err) {
        logEvent(`!!! Picker Error: Failed during element analysis. Fallback to removing true target. Error: ${err.message}`);
        elementToRemove = trueTarget;
    }
    if (elementToRemove && elementToRemove.remove) {
        elementToRemove.remove();
        logEvent("Picker: Element removed successfully.", elementToRemove);
    } else {
        logEvent("Picker: FAILED to remove element.", elementToRemove);
    }
    deactivatePicker();
    saveNewCustomRule(selector);
    return false;
}

function handleMouseOver(e) {
    const trueTarget = e.composedPath && e.composedPath()[0] || e.target;
    if (highlightedElement === trueTarget) return;
    if (highlightedElement) {
        try {
            highlightedElement.style.outline = '';
        } catch (e) {  }
    }
    highlightedElement = trueTarget;
    highlightedElement.style.outline = '3px dashed #FF00FF';
}

function activatePicker() {
    if (isPickerActive) return;
    isPickerActive = true;
    logEvent("Picker: Activated.");
    document.addEventListener('mouseover', handleMouseOver, true);
    document.addEventListener('mousedown', handleElementSelection, true);
    document.addEventListener('click', handleElementSelection, true);
}

function deactivatePicker() {
    if (!isPickerActive) return;
    isPickerActive = false;
    if (highlightedElement) {
        try {
            highlightedElement.style.outline = '';
        } catch (e) { }
    }
    document.removeEventListener('mouseover', handleMouseOver, true);
    document.removeEventListener('mousedown', handleElementSelection, true);
    document.removeEventListener('click', handleElementSelection, true);
    logEvent("Picker: Deactivated.");
}

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
            logEvent(`CustomRule Error: Invalid selector '${selector}'.`);
        }
    }
}

function hidePrimaryAds() {
    document.querySelectorAll(MONITORED_AD_SELECTORS.join(',')).forEach(element => {
        const target = element.closest('div, ins, iframe, a');
        if (target && target.parentElement && target.style.display !== 'none') {
            logEvent("PrimaryDetection: Hiding generic ad element.", target, true);
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
                logEvent(`HunterGuard: Hiding container with ad keywords despite content tags.`, container, true);
                container.style.setProperty('display', 'none', 'important');
            }
        } else {
            logEvent("FallbackDetection (Hunter): Hiding ad-only container.", container, true);
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
        const element = document.querySelector(selector);
        if (element && getComputedStyle(element).display === 'none') {
            element.style.setProperty('display', 'block', 'important');
            logEvent(`!!! SafetyNet TRIGGERED: Critical element '${selector}' was hidden, visibility restored.`);
        }
    });
}

async function runAllRoutines() {
    const result = await chrome.storage.local.get({ [BLOCKING_STATE_KEY]: true, [WHITELIST_KEY]: [] });
    if (!result[BLOCKING_STATE_KEY]) {
        if (!window.blockingDisabledLogged) {
            logEvent("Controller: Blocking is disabled by user. Skipping all routines.");
            window.blockingDisabledLogged = true;
        }
        return; 
    }
    const whitelistedDomains = result[WHITELIST_KEY];
    const currentHostname = window.location.hostname;
    if (whitelistedDomains.includes(currentHostname)) {
        if (!window.whitelistMessageLogged) { 
            logEvent(`Controller: Domain '${currentHostname}' is on the whitelist. Skipping all routines.`);
            window.whitelistMessageLogged = true;
        }
        return; 
    }
    if(window.whitelistMessageLogged) {
         window.whitelistMessageLogged = false;
    }
    if (window.blockingDisabledLogged) {
        window.blockingDisabledLogged = false;
    }

    // Uruchamianie wszystkich warstw obrony w pętli
    await applyCustomRules();
    await applyPropertyGuardToElements(); // Warstwa 2
    applyTrueProxyGuard();              // Warstwa 3 (eksperymentalna)
    hidePrimaryAds();
    hideFallbackAds();
    hidePlaceholders();
    applySafetyNet();
}

// Uruchomienie globalnego przechwytywania (Warstwa 1) na samym początku
interceptEventHandlers();

setTimeout(async () => {
    const result = await chrome.storage.local.get({ [BLOCKING_STATE_KEY]: true });
    logEvent(`Init: Script v28.2 (Shadow of the PIPIS) started. Blocking is currently ${result[BLOCKING_STATE_KEY] ? 'ENABLED' : 'DISABLED'}.`);
    await runAllRoutines();
}, 500);

setInterval(runAllRoutines, 1500);

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "ACTIVATE_PICKER") {
        activatePicker();
        sendResponse({ status: "Pipis tryb aktywny, spróbuj nie rozpierdolić strony" });
        return true;
    }
});

logEvent("Init: Safe polling mechanism for all routines is now active.");
