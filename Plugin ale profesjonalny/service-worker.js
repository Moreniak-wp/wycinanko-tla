// service-worker.js - v30.3 (stabilna wersja tła)
console.log("WP Ad Inspector (v30.3) - SERVICE WORKER - Initialized.");

// --- SEKCJA STAŁYCH ---
const STORAGE_KEYS = {
    PROXY_ENABLED: 'isProxyEnabled',
    PROXY_HOST: 'proxyHost',
    PROXY_PORT: 'proxyPort',
    IS_BLOCKING_ENABLED: 'isBlockingEnabled',
    BLOCKED_ADS_COUNT: 'blockedAdsCount',
    CUSTOM_RULES_KEY: 'customBlockedSelectors'
};

const MESSAGE_TYPES = {
    UPDATE_BLOCKING_STATE: 'updateBlockingState',
    AD_BLOCKED: 'AD_BLOCKED',
    RESET_AD_COUNT: 'resetAdCount',
    UPDATE_PROXY_SETTINGS: 'updateProxySettings',
    ACTIVATE_PICKER: 'ACTIVATE_PICKER'
};

const STRINGS = {
    PROXY: {
        ENABLED: "Proxy włączone:",
        DISABLED: "Proxy wyłączone.",
        SETUP_ERROR: "Błąd konfiguracji proxy:",
        RESPONSE_UPDATED: "Ustawienia proxy zaktualizowane."
    },
    BACKGROUND: {
        RESPONSE_ICON_UPDATED: "Ikona zaktualizowana.",
        RESPONSE_AD_COUNTER_UPDATED: "Licznik reklam zaktualizowany.",
        RESPONSE_AD_COUNTER_RESET: "Licznik reklam zresetowany."
    }
};

const ICON_PATHS = {
    ENABLED: { "16": "pliki/icons/icon16_active.png", "32": "pliki/icons/icon32_active.png", "48": "pliki/icons/icon48_active.png", "128": "pliki/icons/icon128_active.png" },
    DISABLED: { "16": "pliki/icons/icon16_inactive.png", "32": "pliki/icons/icon32_inactive.png", "48": "pliki/icons/icon48_inactive.png", "128": "pliki/icons/icon128_inactive.png" }
};


// --- BLOKOWANIE SIECIOWE (declarativeNetRequest) ---
function setupAdBlockingNetRules() {
    const adBlockingFilters = ["*://*.googlesyndication.com/*","*://*.doubleclick.net/*","*://*.adocean.pl/*","*://*.adocean.net/*","*://*.gemius.pl/*","*://*.gemius.net/*","*://ad.wp.pl/*","*://ads.wp.pl/*","*://www.google-analytics.com/*","*://googletagservices.com/*","*://cdn.ad.plus/*","*://securepubads.g.doubleclick.net/*","*://pagead2.googlesyndication.com/*","*://*.adservice.google.com/*","*://*.advertising.com/*","*://*.adform.net/*","*://*.adroll.com/*","*://*.criteo.com/*","*://*.adnxs.com/*","*://*.taboola.com/*","*://*.outbrain.com/*","*://*.mgid.com/*","*://*.revcontent.com/*","*://*.openx.net/*","*://*.rubiconproject.com/*","*://*.appnexus.com/*","*://*.yieldlab.net/*","*://*.pubmatic.com/*","*://*.bidswitch.net/*","*://*.indexww.com/*","*://*.krxd.net/*","*://*.quantserve.com/*","*://*.scorecardresearch.com/*","*://*.zedo.com/*","*://*.serving-sys.com/*","*://*.innovid.com/*","*://*.demdex.net/*","*://*.dpm.demdex.net/*","*://*.casalemedia.com/*","*://*.specificmedia.com/*","*://*.sharethrough.com/*","*://*.simpli.fi/*","*://*.teads.tv/*","*://*.adition.com/*","*://*.smartadserver.com/*","*://*.adspirit.de/*","*://*.adlibr.com/*","*://*.medianet.com/*","*://*.contextweb.com/*","*://*.pulsepoint.com/*","*://*.gumgum.com/*","*://*.bidthentic.com/*","*://*.advertising.com/*","*://*.tremorhub.com/*","*://*.brightroll.com/*","*://*.freewheel.tv/*","*://*.sizmek.com/*","*://*.spotx.tv/*","*://*.videology.com/*","*://*.verizonmedia.com/*"];
    const rules = adBlockingFilters.map((filter, index) => ({ id: 10000 + index, priority: 1, action: { type: 'block' }, condition: { urlFilter: filter, resourceTypes: ["main_frame", "sub_frame", "stylesheet", "script", "image", "xmlhttprequest", "media"] } }));
    rules.push({ id: 19999, priority: 1, action: { type: 'block' }, condition: { regexFilter: '.{150,}', resourceTypes: ["main_frame", "sub_frame", "stylesheet", "script", "image", "font", "object", "xmlhttprequest", "ping", "csp_report", "media", "websocket", "other"] } });

    chrome.declarativeNetRequest.getDynamicRules((existingRules) => {
        const ruleIdsToRemove = existingRules.map(rule => rule.id);
        chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds: ruleIdsToRemove, addRules: rules }, () => {
            if (chrome.runtime.lastError) console.error("Błąd ustawiania reguł sieciowych:", chrome.runtime.lastError.message);
            else console.log("Reguły sieciowe zostały pomyślnie zaktualizowane. Liczba reguł:", rules.length);
        });
    });
}

// --- LOGIKA TŁA (PROXY, OBSŁUGA ZDARZEŃ) ---
async function applyProxySettings() {
    try {
        const storage = await chrome.storage.local.get([STORAGE_KEYS.PROXY_ENABLED, STORAGE_KEYS.PROXY_HOST, STORAGE_KEYS.PROXY_PORT]);
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

function updateExtensionIcon(isEnabled) {
    chrome.action.setIcon({ path: isEnabled ? ICON_PATHS.ENABLED : ICON_PATHS.DISABLED });
}

async function updateBadgeText() {
    const result = await chrome.storage.local.get(STORAGE_KEYS.BLOCKED_ADS_COUNT);
    const count = result[STORAGE_KEYS.BLOCKED_ADS_COUNT] || 0;
    chrome.action.setBadgeBackgroundColor({ color: [255, 0, 0, 255] });
    chrome.action.setBadgeText({ text: count > 0 ? count.toString() : '' });
}

// --- GŁÓWNE LISTENERY ZDARZEŃ ---
chrome.runtime.onInstalled.addListener(() => {
    console.log("Wydarzenie: onInstalled");
    setupAdBlockingNetRules();
    applyProxySettings();
    chrome.storage.local.get({ [STORAGE_KEYS.IS_BLOCKING_ENABLED]: true }, (result) => {
        updateExtensionIcon(result[STORAGE_KEYS.IS_BLOCKING_ENABLED]);
        updateBadgeText();
    });
});

chrome.runtime.onStartup.addListener(() => {
    console.log("Wydarzenie: onStartup");
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
        case MESSAGE_TYPES.ACTIVATE_PICKER:
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (tabs[0] && tabs[0].id) {
                    chrome.tabs.sendMessage(tabs[0].id, message, (response) => {
                        if (chrome.runtime.lastError) console.warn("Błąd wysyłania do content script:", chrome.runtime.lastError.message);
                        else sendResponse(response);
                    });
                }
            });
            break;
    }
    return true; // Ważne dla asynchronicznych odpowiedzi
});
chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local') {
        if (STORAGE_KEYS.IS_BLOCKING_ENABLED in changes) {
            updateExtensionIcon(changes[STORAGE_KEYS.IS_BLOCKING_ENABLED].newValue);
        }
    }
});