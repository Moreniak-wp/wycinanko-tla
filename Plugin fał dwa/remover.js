// remover.js - v26.2 - "The Controller Patch"
console.log("WP Ad Inspector (v26.2) - CONTROLLER - Initialized.");

const BLOCKING_STATE_KEY = 'isBlockingEnabled'; 

function logEvent(message, element = null) {
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
            logEvent("PrimaryDetection: Hiding generic ad element.", target);
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
    const AD_KEYWORDS = ['REKLAMA', 'SPONSOROWANY', 'PROMOCJA','MAT. SPONSOROWANY, MAT. P'];
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
            const hasAdKeywords = AD_KEYWORDS.some(keyword => textContent.includes(keyword));
            if (hasAdKeywords) { logEvent(`HunterGuard: Hiding container with ad keywords despite content tags.`, container); container.style.setProperty('display', 'none', 'important'); }
            else { logEvent(`HunterGuard: Spared container because it has content tags and no ad keywords.`, container); }
        } else { logEvent("FallbackDetection (Hunter): Hiding ad-only container.", container); container.style.setProperty('display', 'none', 'important'); }
    });
}
function hidePlaceholders() {
    const placeholderSelector = '.wp-section-placeholder-container';
    document.querySelectorAll(placeholderSelector).forEach(element => {
        if (element.style.display !== 'none') {
            logEvent("PlaceholderCollapse: Hiding dedicated ad placeholder container.", element);
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

function runAllRoutines() {
    chrome.storage.local.get({ [BLOCKING_STATE_KEY]: true }, (result) => {
        const isEnabled = result[BLOCKING_STATE_KEY];
        
        if (!isEnabled) {
            if (!window.blockingDisabledLogged) {
                logEvent("Controller: Blocking is disabled by user. Skipping all routines.");
                window.blockingDisabledLogged = true; 
            }
            return;
        }
        
        hidePrimaryAds();
        hideFallbackAds();
        hidePlaceholders();
        applySafetyNet();
    });
}

// Ioanetylizancjum
setTimeout(() => {
    chrome.storage.local.get({ [BLOCKING_STATE_KEY]: true }, (result) => {
        const isEnabled = result[BLOCKING_STATE_KEY];
        logEvent(`Init: Script v26.2 (The Controller Patch) started. Blocking is currently ${isEnabled ? 'ENABLED' : 'DISABLED'}.`);
        runAllRoutines();
    });
}, 500);

setInterval(runAllRoutines, 1500);
logEvent("Init: Safe polling mechanism for all routines is now active.");