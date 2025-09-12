// remover.js - v26.5 - "Pipis Fix" 
console.log("WP Ad Inspector (v26.3) - CONTROLLER - Initialized.");

const BLOCKING_STATE_KEY = 'isBlockingEnabled';
const CUSTOM_RULES_KEY = 'customBlockedSelectors';

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

function generateSelector(el) {
    if (!(el instanceof Element)) return;
    const parts = [];
    while (el && el.nodeType === Node.ELEMENT_NODE) {
        let selector = el.nodeName.toLowerCase();
        if (el.id) {
            selector += '#' + el.id;
            parts.unshift(selector);
            break;
        } else {
            let sib = el, nth = 1;
            while (sib = sib.previousElementSibling) {
                if (sib.nodeName.toLowerCase() == selector) nth++;
            }
            if (nth != 1) selector += `:nth-of-type(${nth})`;
        }
        parts.unshift(selector);
        el = el.parentNode;
    }
    return parts.join(' > ');
}

async function processElementSelection(target) {
    const newSelector = generateSelector(target);

    logEvent(`Picker: User selected element to hide with selector: ${newSelector}`, target);

    const result = await chrome.storage.local.get({ [CUSTOM_RULES_KEY]: [] });
    const customRules = result[CUSTOM_RULES_KEY];
    if (!customRules.includes(newSelector)) {
        customRules.push(newSelector);
        await chrome.storage.local.set({ [CUSTOM_RULES_KEY]: customRules });
        logEvent(`Picker: New rule saved. Total custom rules: ${customRules.length}`);
    }

    target.style.display = 'none';
    deactivatePicker();
}

function handleClick(e) {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    processElementSelection(e.target);
}

function handleMouseOver(e) {
    if (highlightedElement) {
        highlightedElement.style.outline = '';
    }
    highlightedElement = e.target;
    highlightedElement.style.outline = '2px dashed red';
}

function activatePicker() {
    if (isPickerActive) return;
    isPickerActive = true;
    logEvent("Picker: Activated.");
    document.addEventListener('mouseover', handleMouseOver, true);
    document.addEventListener('pointerdown', handleClick, true);
    document.addEventListener('mousedown', handleClick, true);
    document.addEventListener('click', handleClick, true);
}

function deactivatePicker() {
    if (!isPickerActive) return;
    isPickerActive = false;
    if (highlightedElement) {
        highlightedElement.style.outline = '';
    }
    document.removeEventListener('mouseover', handleMouseOver, true);
    document.removeEventListener('pointerdown', handleClick, true);
    document.removeEventListener('mousedown', handleClick, true);
    document.removeEventListener('click', handleClick, true);
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
                    logEvent(`CustomRule: Hiding element matching '${selector}'.`, element);
                    element.style.setProperty('display', 'none', 'important');
                }
            });
        } catch (e) {
            logEvent(`CustomRule Error: Invalid selector '${selector}'.`);
        }
    }
}

function hidePrimaryAds() {
    const primaryAdSelectors = [
        '[id^="google_ads_iframe_"]', '[id^="div-gpt-ad-"]', '.adsbygoogle',
        '[id*="adocean"]', '[id*="gemius"]', '[data-ad-placeholder]', '[data-ad-slot]',
        'ins.adsbygoogle', 'iframe[src*="googlesyndication.com"]', 'iframe[src*="doubleclick.net"]',
        'div[data-google-query-id]', '[aria-label="Advertisement"]'
    ];
    document.querySelectorAll(primaryAdSelectors.join(',')).forEach(element => {
        const target = element.tagName === 'IFRAME' ? element.parentElement : element;
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
        if (!isLongRedirect && !isDirectAdDomain) { logEvent(`FallbackGuard: Link is not a tracking link. Sparing.`, link); return; }
        const container = link.parentElement;
        if (!container || container.style.display === 'none') return;
        if (DO_NOT_HIDE_SELECTORS.some(selector => container.matches(selector))) { logEvent(`FallbackGuard: Container matches a DO_NOT_HIDE selector. Sparing.`, container); return; }
        if (container.getBoundingClientRect().height > MAX_AD_HEIGHT_PX) { logEvent(`FallbackGuard: Container is taller than MAX_AD_HEIGHT_PX. Sparing.`, container); return; }
        const hasContentTags = CONTENT_TAGS.some(selector => container.querySelector(selector));
        if (hasContentTags) {
            const textContent = container.textContent.toLowerCase();
            const hasAdKeywords = AD_KEYWORDS.some(keyword => textContent.includes(keyword.toLowerCase()));
            if (hasAdKeywords) { logEvent(`HunterGuard: Hiding container with ad keywords despite content tags.`, container, true); container.style.setProperty('display', 'none', 'important'); }
            else { logEvent(`HunterGuard: Spared container because it has content tags and no ad keywords.`, container); }
        } else { logEvent("FallbackDetection (Hunter): Hiding ad-only container.", container, true); container.style.setProperty('display', 'none', 'important'); }
    });
}

function hidePlaceholders() {
    const placeholderSelector = '.wp-section-placeholder-container';
    document.querySelectorAll(placeholderSelector).forEach(element => {
        if (element.style.display !== 'none') {
            logEvent("PlaceholderCollapse: Hiding dedicated ad placeholder container.", element, true);
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
    const result = await chrome.storage.local.get({ [BLOCKING_STATE_KEY]: true });
    if (!result[BLOCKING_STATE_KEY]) {
        if (!window.blockingDisabledLogged) {
            logEvent("Controller: Blocking is disabled by user. Skipping all routines.");
            window.blockingDisabledLogged = true;
        }
        return;
    }

    if (window.blockingDisabledLogged) {
        window.blockingDisabledLogged = false;
    }

    await applyCustomRules();

    hidePrimaryAds();
    hideFallbackAds();
    hidePlaceholders();
    applySafetyNet();
}

setTimeout(async () => {
    const result = await chrome.storage.local.get({ [BLOCKING_STATE_KEY]: true });
    logEvent(`Init: Script v26.5 (PIPIS Fix) started. Blocking is currently ${result[BLOCKING_STATE_KEY] ? 'ENABLED' : 'DISABLED'}.`);
    await runAllRoutines();
}, 500);

setInterval(runAllRoutines, 1500);

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "ACTIVATE_PICKER") {
        activatePicker();
        sendResponse({ status: "Picker mode activated on page" });
        return true;
    }
});

logEvent("Init: Safe polling mechanism for all routines is now active.");
