// remover.js - v26.0 - "The Hunter Patch"
console.log("WP Ad Inspector (v26.0) - HUNTER - Initialized.");

// --- MODULE: Logging (bez zmian) ---
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

// --- DETECTION ROUTINE 1: Primary Ad Content (bez zmian) ---
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
            target.style.setProperty('display', 'none', 'important');
        }
    });
}

// --- DETECTION ROUTINE 2: Fallback Ad Content (LOGIKA HUNTER) ---
function hideFallbackAds() {
    const FALLBACK_CDN_HOST = 'v.wpimg.pl';
    const TRACKING_LINK_LENGTH_THRESHOLD = 150;
    const AD_DOMAINS = ['ads.wp.pl', 'doubleclick.net', 'gemius.pl'];
    const MAX_AD_HEIGHT_PX = 450;
    const DO_NOT_HIDE_SELECTORS = ['#wp-site-main', 'main', '#page', '#app', '#root', '.article-body', '.wp-section-aside'];
    
    // Lista tagów, które ZAZWYCZAJ wskazują na treść.
    const CONTENT_TAGS = ['h2', 'h3', 'h4', 'h5', 'p', 'span'];
    // Słowa-klucze, które demaskują reklamę, nawet jeśli ma tagi treści.
    const AD_KEYWORDS = ['REKLAMA', 'SPONSOROWANY', 'PROMOCJA','MAT. SPONSOROWANY, MAT. P'];

    document.querySelectorAll(`img[src*="${FALLBACK_CDN_HOST}"]`).forEach(img => {
        const link = img.closest('a');
        if (!link || !link.href) return;

        const isLongRedirect = link.href.startsWith('https://www.wp.pl/') && link.href.length > TRACKING_LINK_LENGTH_THRESHOLD;
        const isDirectAdDomain = AD_DOMAINS.some(domain => link.href.includes(domain));
        if (!isLongRedirect && !isDirectAdDomain) return;

        const container = link.parentElement;
        if (!container || container.style.display === 'none') return;
        
        if (DO_NOT_HIDE_SELECTORS.some(selector => container.matches(selector))) return;
        if (container.getBoundingClientRect().height > MAX_AD_HEIGHT_PX) return;
        
        // --- NOWA LOGIKA "HUNTER" ---
        const hasContentTags = CONTENT_TAGS.some(selector => container.querySelector(selector));
        
        if (hasContentTags) {
            // Kontener ma tagi treści. Sprawdźmy, czy nie jest to pułapka.
            const textContent = container.textContent.toLowerCase();
            const hasAdKeywords = AD_KEYWORDS.some(keyword => textContent.includes(keyword));

            if (hasAdKeywords) {
                // To jest reklama udająca treść. Zneutralizować.
                logEvent(`HunterGuard: Hiding container with ad keywords despite content tags.`, container);
                container.style.setProperty('display', 'none', 'important');
            } else {
                // To prawdopodobnie prawdziwa treść. Zostawiamy.
                logEvent(`HunterGuard: Spared container because it has content tags and no ad keywords.`, container);
            }
        } else {
            // Kontener nie ma żadnych tagów treści. To czysta reklama. Zneutralizować.
            logEvent("FallbackDetection (Hunter): Hiding ad-only container.", container);
            container.style.setProperty('display', 'none', 'important');
        }
    });
}

// --- DETECTION ROUTINE 3: Hiding Ad Placeholders (bez zmian) ---
function hidePlaceholders() {
    const placeholderSelector = '.wp-section-placeholder-container';
    document.querySelectorAll(placeholderSelector).forEach(element => {
        if (element.style.display !== 'none') {
            logEvent("PlaceholderCollapse: Hiding dedicated ad placeholder container.", element);
            element.style.setProperty('display', 'none', 'important');
        }
    });
}

// --- MODUŁ: Siatka bezpieczeństwa (bez zmian) ---
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

// --- Main Execution ---
function runAllRoutines() {
    hidePrimaryAds();
    hideFallbackAds();
    hidePlaceholders();
    applySafetyNet();
}

// --- Initialization ---
setTimeout(() => {
    chrome.storage.local.remove('inspector_logs', () => {
        logEvent("Init: Script v26.0 (The Hunter Patch) started. Logs cleared.");
        runAllRoutines();
    });
}, 500);

setInterval(runAllRoutines, 1500);
logEvent("Init: Safe polling mechanism for all routines is now active.");
