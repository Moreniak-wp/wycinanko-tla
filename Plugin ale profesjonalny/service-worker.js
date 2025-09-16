// service-worker.js - v30.0
// Główny skrypt tła łączący trzy warstwy obrony:
// 1. Natychmiastowe wstrzykiwanie CSS (Filtrowanie kosmetyczne) - eliminuje "mignięcie"
// 2. Blokowanie zapytań sieciowych (declarativeNetRequest) - blokuje pobieranie reklam
// 3. Logika proxy i obsługa zdarzeń

console.log("WP Ad Inspector (v30.0) - SERVICE WORKER - Initialized.");

// --- WARSTWA 1: FILTROWANIE KOSMETYCZNE (NAJWAŻNIEJSZA ZMIANA) ---
// Te selektory CSS zostaną wstrzyknięte na każdą stronę, zanim jeszcze zacznie się ona renderować.
// Dzięki temu kontenery na reklamy znikają natychmiast, bez "mignięcia".
const COSMETIC_FILTERS_CSS = `
    [id^="google_ads_iframe_"], [id^="div-gpt-ad-"], .adsbygoogle,
    [id*="adocean"], [id*="gemius"], [data-ad-placeholder], [data-ad-slot],
    ins.adsbygoogle, iframe[src*="googlesyndication.com"], iframe[src*="doubleclick.net"],
    div[data-google-query-id], [aria-label="Advertisement"],
    a[href*="doubleclick.net"], a[href*="ad.wp.pl"], .wp-section-placeholder-container {
        display: none !important;
        visibility: hidden !important;
    }
`;

// Rejestrujemy skrypt CSS, aby był stosowany automatycznie i natychmiastowo.
chrome.scripting.registerContentScripts([{
    id: "global-cosmetic-filters",
    css: [COSMETIC_FILTERS_CSS],
    matches: ["<all_urls>"],
    allFrames: true,
    runAt: "document_start"
}]).then(() => console.log("Filtrowanie kosmetyczne (CSS) zostało zarejestrowane."));


// --- WARSTWA 2: BLOKOWANIE SIECIOWE (declarativeNetRequest) ---
function setupAdBlockingNetRules() {
    const adBlockingFilters = [
        "*://*.googlesyndication.com/*", "*://*.doubleclick.net/*", "*://*.adocean.pl/*",
        "*://*.adocean.net/*", "*://*.gemius.pl/*", "*://*.gemius.net/*", "*://ad.wp.pl/*",
        "*://ads.wp.pl/*", "*://www.google-analytics.com/*", "*://googletagservices.com/*",
        "*://cdn.ad.plus/*", "*://securepubads.g.doubleclick.net/*", "*://pagead2.googlesyndication.com/*",
        "*://*.adservice.google.com/*", "*://*.advertising.com/*", "*://*.adform.net/*",
        "*://*.adroll.com/*", "*://*.criteo.com/*", "*://*.adnxs.com/*", "*://*.taboola.com/*",
        "*://*.outbrain.com/*", "*://*.mgid.com/*", "*://*.revcontent.com/*", "*://*.openx.net/*",
        "*://*.rubiconproject.com/*", "*://*.appnexus.com/*", "*://*.yieldlab.net/*",
        "*://*.pubmatic.com/*", "*://*.bidswitch.net/*", "*://*.indexww.com/*", "*://*.krxd.net/*",
        "*://*.quantserve.com/*", "*://*.scorecardresearch.com/*", "*://*.zedo.com/*",
        "*://*.serving-sys.com/*", "*://*.innovid.com/*", "*://*.demdex.net/*",
        "*://*.dpm.demdex.net/*", "*://*.casalemedia.com/*", "*://*.specificmedia.com/*",
        "*://*.sharethrough.com/*", "*://*.simpli.fi/*", "*://*.teads.tv/*", "*://*.adition.com/*",
        "*://*.smartadserver.com/*", "*://*.adspirit.de/*", "*://*.adlibr.com/*",
        "*://*.medianet.com/*", "*://*.contextweb.com/*", "*://*.pulsepoint.com/*",
        "*://*.gumgum.com/*", "*://*.bidthentic.com/*", "*://*.advertising.com/*",
        "*://*.tremorhub.com/*", "*://*.brightroll.com/*", "*://*.freewheel.tv/*",
        "*://*.sizmek.com/*", "*://*.spotx.tv/*", "*://*.videology.com/*", "*://*.verizonmedia.com/*"
    ];

    const rules = adBlockingFilters.map((filter, index) => ({
        id: 10000 + index,
        priority: 1,
        action: { type: 'block' },
        condition: {
            urlFilter: filter,
            resourceTypes: ["main_frame", "sub_frame", "stylesheet", "script", "image", "xmlhttprequest", "media"]
        }
    }));

    // UWAGA: Agresywna reguła blokująca wszystkie zasoby o URL dłuższym niż 150 znaków.
    // Zgodnie z Twoją prośbą, zostaje przywrócona.
    rules.push({
        id: 19999,
        priority: 1,
        action: { type: 'block' },
        condition: {
            regexFilter: '.{150,}',
            resourceTypes: ["main_frame", "sub_frame", "stylesheet", "script", "image", "font", "object", "xmlhttprequest", "ping", "csp_report", "media", "websocket", "other"]
        }
    });

    chrome.declarativeNetRequest.getDynamicRules((existingRules) => {
        const ruleIdsToRemove = existingRules.map(rule => rule.id);
        chrome.declarativeNetRequest.updateDynamicRules({
            removeRuleIds: ruleIdsToRemove,
            addRules: rules
        }, () => {
            if (chrome.runtime.lastError) {
                console.error("Błąd ustawiania reguł sieciowych:", chrome.runtime.lastError);
            } else {
                console.log("Reguły sieciowe zostały pomyślnie zaktualizowane. Liczba reguł:", rules.length);
            }
        });
    });
}


// --- POZOSTAŁA LOGIKA TŁA (PROXY, OBSŁUGA ZDARZEŃ) ---
// Te funkcje zostały przeniesione z Twojego pliku background.js

async function applyProxySettings() {
    // Ta funkcja pozostaje bez zmian
    try {
        const keys = [STORAGE_KEYS.PROXY_ENABLED, STORAGE_KEYS.PROXY_HOST, STORAGE_KEYS.PROXY_PORT];
        const storage = await chrome.storage.local.get(keys);
        const isEnabled = storage[STORAGE_KEYS.PROXY_ENABLED];
        const host = storage[STORAGE_KEYS.PROXY_HOST];
        const port = storage[STORAGE_KEYS.PROXY_PORT];
        if (isEnabled && host && port) {
            const config = { mode: "fixed_servers", rules: { singleProxy: { scheme: "http", host: host, port: parseInt(port) }, bypassList: ["<local>"] } };
            await chrome.proxy.settings.set({ value: config, scope: 'regular' });
            console.log(STRINGS.PROXY.ENABLED, host, port);
        } else {
            await chrome.proxy.settings.clear({ scope: 'regular' });
            console.log(STRINGS.PROXY.DISABLED);
        }
    } catch (error) { console.error(STRINGS.PROXY.SETUP_ERROR, error); }
}

const ICON_PATHS = {
    ENABLED: { "16": "pliki/icons/icon16_active.png", "32": "pliki/icons/icon32_active.png", "48": "pliki/icons/icon48_active.png", "128": "pliki/icons/icon128_active.png" },
    DISABLED: { "16": "pliki/icons/icon16_inactive.png", "32": "pliki/icons/icon32_inactive.png", "48": "pliki/icons/icon48_inactive.png", "128": "pliki/icons/icon128_inactive.png" }
};

function updateExtensionIcon(isEnabled) {
    const path = isEnabled ? ICON_PATHS.ENABLED : ICON_PATHS.DISABLED;
    chrome.action.setIcon({ path: path });
}

async function updateBadgeText() {
    const result = await chrome.storage.local.get(STORAGE_KEYS.BLOCKED_ADS_COUNT);
    const count = result[STORAGE_KEYS.BLOCKED_ADS_COUNT] || 0;
    chrome.action.setBadgeBackgroundColor({ color: [255, 0, 0, 255] });
    chrome.action.setBadgeText({ text: count > 0 ? count.toString() : '' });
}

// Event Listeners
chrome.runtime.onInstalled.addListener(() => {
    setupAdBlockingNetRules();
    applyProxySettings();
    chrome.storage.local.get({ [STORAGE_KEYS.IS_BLOCKING_ENABLED]: true }, (result) => {
        updateExtensionIcon(result[STORAGE_KEYS.IS_BLOCKING_ENABLED]);
        updateBadgeText();
    });
});

chrome.runtime.onStartup.addListener(() => {
    setupAdBlockingNetRules();
    applyProxySettings();
    chrome.storage.local.get({ [STORAGE_KEYS.IS_BLOCKING_ENABLED]: true }, (result) => {
        updateExtensionIcon(result[STORAGE_KEYS.IS_BLOCKING_ENABLED]);
        updateBadgeText();
    });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    switch (message.type) {
        case MESSAGE_TYPES.UPDATE_BLOCKING_STATE:
            updateExtensionIcon(message.isEnabled);
            if (message.isEnabled) setupAdBlockingNetRules();
            sendResponse({ status: STRINGS.BACKGROUND.RESPONSE_ICON_UPDATED });
            break;
        case MESSAGE_TYPES.AD_BLOCKED:
            chrome.storage.local.get(STORAGE_KEYS.BLOCKED_ADS_COUNT, (result) => {
                const currentCount = result[STORAGE_KEYS.BLOCKED_ADS_COUNT] || 0;
                chrome.storage.local.set({ [STORAGE_KEYS.BLOCKED_ADS_COUNT]: currentCount + 1 }, () => updateBadgeText());
            });
            sendResponse({ status: STRINGS.BACKGROUND.RESPONSE_AD_COUNTER_UPDATED });
            break;
        case MESSAGE_TYPES.RESET_AD_COUNT:
            chrome.storage.local.set({ [STORAGE_KEYS.BLOCKED_ADS_COUNT]: 0 }, () => {
                updateBadgeText();
                sendResponse({ status: STRINGS.BACKGROUND.RESPONSE_AD_COUNTER_RESET });
            });
            break;
        case MESSAGE_TYPES.UPDATE_PROXY_SETTINGS:
            applyProxySettings();
            sendResponse({ status: STRINGS.PROXY.RESPONSE_UPDATED });
            break;
        // Dodany listener z remover.js
        case "ACTIVATE_PICKER":
            chrome.tabs.sendMessage(sender.tab.id, message, (response) => {
                if(chrome.runtime.lastError) console.warn(chrome.runtime.lastError.message);
                else sendResponse(response);
            });
            break;
    }
    return true;
});
