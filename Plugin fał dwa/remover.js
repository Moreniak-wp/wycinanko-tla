console.log(STRINGS.REMOVER.INIT);

const BLOCKING_STATE_KEY = 'isBlockingEnabled';
const CUSTOM_RULES_KEY = 'customBlockedSelectors';
const WHITELIST_KEY = 'whitelistedDomains';

let isPickerActive = false;
let highlightedElement = null;

function logEvent(message, element = null, isAdBlocked = false) {
    const timestamp = new Date().toLocaleTimeString();
    let logMessage = STRINGS.REMOVER.LOG_MESSAGE(timestamp, message);
    if (element) {
        const tag = element.tagName;
        const id = element.id ? `#${element.id}` : '';
        const classes = element.className ? `.${element.className.split(' ').join('.')}` : '';
        logMessage += STRINGS.REMOVER.LOG_ELEMENT_DETAILS(tag, id, classes);
    }
    console.log(STRINGS.REMOVER.LOG_PREFIX(logMessage), element || '');
    chrome.storage.local.get(['inspector_logs'], (result) => {
        const logs = result.inspector_logs || [];
        logs.push(logMessage);
        chrome.storage.local.set({ 'inspector_logs': logs });
    });

    if (isAdBlocked) {
        chrome.runtime.sendMessage({ type: "AD_BLOCKED" }).catch(error => {
            console.error(STRINGS.REMOVER.AD_BLOCKED_MESSAGE_ERROR, error);
        });
    }
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
    logEvent(STRINGS.REMOVER.PICKER_SAVING_RULE(selector));
    const result = await chrome.storage.local.get({ [CUSTOM_RULES_KEY]: [] });
    const customRules = result[CUSTOM_RULES_KEY];
    if (!customRules.includes(selector)) {
        customRules.push(selector);
        await chrome.storage.local.set({ [CUSTOM_RULES_KEY]: customRules });
        logEvent(STRINGS.REMOVER.PICKER_RULE_SAVED(customRules.length));
    } else {
        logEvent(STRINGS.REMOVER.PICKER_RULE_EXISTS);
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
            logEvent(STRINGS.REMOVER.PICKER_SHADOW_DOM_DETECTED, root.host);
            elementToRemove = root.host;
        }
        selector = generateSelector(elementToRemove);
    } catch (err) {
        logEvent(STRINGS.REMOVER.PICKER_ERROR(err.message));
        elementToRemove = trueTarget;
    }

    if (elementToRemove && elementToRemove.remove) {
        elementToRemove.remove();
        logEvent(STRINGS.REMOVER.PICKER_ELEMENT_REMOVED, elementToRemove);
    } else {
        logEvent(STRINGS.REMOVER.PICKER_ELEMENT_REMOVE_FAILED, elementToRemove);
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
    logEvent(STRINGS.REMOVER.PICKER_ACTIVATED);
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
    logEvent(STRINGS.REMOVER.PICKER_DEACTIVATED);
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
            logEvent(STRINGS.REMOVER.CUSTOM_RULE_ERROR(selector));
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
        const target = element.closest('div, ins, iframe');
        if (target && target.parentElement && target.style.display !== 'none') {
            logEvent(STRINGS.REMOVER.PRIMARY_AD_HIDDEN, target, true);
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
                logEvent(STRINGS.REMOVER.FALLBACK_HUNTER_GUARD_HIDDEN, container, true);
                container.style.setProperty('display', 'none', 'important');
            }
        } else {
            logEvent(STRINGS.REMOVER.FALLBACK_HUNTER_HIDDEN, container, true);
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
            logEvent(STRINGS.REMOVER.SAFETY_NET_TRIGGERED(selector));
        }
    });
}

async function runAllRoutines() {
    const result = await chrome.storage.local.get({ [BLOCKING_STATE_KEY]: true, [WHITELIST_KEY]: [] });
    if (!result[BLOCKING_STATE_KEY]) {
        if (!window.blockingDisabledLogged) {
            logEvent(STRINGS.REMOVER.CONTROLLER_BLOCKING_DISABLED);
            window.blockingDisabledLogged = true;
        }
        return; 
    }
    const whitelistedDomains = result[WHITELIST_KEY];
    const currentHostname = window.location.hostname;
    if (whitelistedDomains.includes(currentHostname)) {
        if (!window.whitelistMessageLogged) { 
            logEvent(STRINGS.REMOVER.CONTROLLER_DOMAIN_WHITELISTED(currentHostname));
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
    await applyCustomRules();
    hidePrimaryAds();
    hideFallbackAds();
    hidePlaceholders();
    applySafetyNet();
}

setTimeout(async () => {
    const result = await chrome.storage.local.get({ [BLOCKING_STATE_KEY]: true });
    logEvent(STRINGS.REMOVER.INIT_STATUS(result[BLOCKING_STATE_KEY]));
    await runAllRoutines();
}, 500);

setInterval(runAllRoutines, 1500);

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "ACTIVATE_PICKER") {
        activatePicker();
        sendResponse({ status: STRINGS.REMOVER.RESPONSE_PICKER_ACTIVATED });
        return true;
    }
});

logEvent(STRINGS.REMOVER.INIT_SAFE_POLLING);
