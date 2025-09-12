// background.js - v7.5 
console.log(STRINGS.BACKGROUND.INIT);

async function applyProxySettings() {
    try {
        const keys = [
            STORAGE_KEYS.PROXY_ENABLED,
            STORAGE_KEYS.PROXY_HOST,
            STORAGE_KEYS.PROXY_PORT
        ];
        const storage = await chrome.storage.local.get(keys);

        const isEnabled = storage[STORAGE_KEYS.PROXY_ENABLED];
        const host = storage[STORAGE_KEYS.PROXY_HOST];
        const port = storage[STORAGE_KEYS.PROXY_PORT];

        if (isEnabled && host && port) {
            const config = {
                mode: "fixed_servers",
                rules: {
                    singleProxy: { scheme: "http", host: host, port: parseInt(port) },
                    bypassList: ["<local>"]
                }
            };
            await chrome.proxy.settings.set({ value: config, scope: 'regular' });
            console.log(STRINGS.PROXY.ENABLED, host, port);
        } else {
            await chrome.proxy.settings.clear({ scope: 'regular' });
            console.log(STRINGS.PROXY.DISABLED);
        }
    } catch (error) {
        console.error(STRINGS.PROXY.SETUP_ERROR, error);
    }
}

function setupNetRules() {
    const LONG_URL_RULE_ID = 1001;
    const longUrlRule = {
        id: LONG_URL_RULE_ID,
        priority: 1,
        action: { type: 'block' },
        condition: {
            regexFilter: '.{150,}',
            resourceTypes: ["main_frame", "sub_frame", "stylesheet", "script", "image", "font", "object", "xmlhttprequest", "ping", "csp_report", "media", "websocket", "other"]
        }
    };
    chrome.declarativeNetRequest.getDynamicRules(existingRules => {
        const ruleIdsToRemove = existingRules.map(rule => rule.id);
        chrome.declarativeNetRequest.updateDynamicRules({
            removeRuleIds: ruleIdsToRemove,
            addRules: [longUrlRule]
        }, () => {
            if (chrome.runtime.lastError) {
                console.error(STRINGS.BACKGROUND.RULES_SETUP_ERROR, chrome.runtime.lastError);
            } else {
                console.log(STRINGS.BACKGROUND.RULES_SETUP_SUCCESS);
            }
        });
    });
}


const ICON_PATHS = {
    ENABLED: { "16": "icons/icon16_active.png", "48": "icons/icon48_active.png", "128": "icons/icon128_active.png" },
    DISABLED: { "16": "icons/icon16_inactive.png", "48": "icons/icon48_inactive.png", "128": "icons/icon128_inactive.png" }
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

chrome.runtime.onInstalled.addListener(() => {
    setupNetRules();
    applyProxySettings();
    chrome.storage.local.get({ [STORAGE_KEYS.IS_BLOCKING_ENABLED]: true }, (result) => {
        updateExtensionIcon(result[STORAGE_KEYS.IS_BLOCKING_ENABLED]);
        updateBadgeText();
    });
});

chrome.runtime.onStartup.addListener(() => {
    setupNetRules();
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
            sendResponse({ status: STRINGS.BACKGROUND.RESPONSE_ICON_UPDATED });
            break;

        case MESSAGE_TYPES.AD_BLOCKED:
            chrome.storage.local.get(STORAGE_KEYS.BLOCKED_ADS_COUNT, (result) => {
                const currentCount = result[STORAGE_KEYS.BLOCKED_ADS_COUNT] || 0;
                chrome.storage.local.set({ [STORAGE_KEYS.BLOCKED_ADS_COUNT]: currentCount + 1 }, () => {
                    updateBadgeText();
                });
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
            console.log(STRINGS.PROXY.RESPONSE_UPDATED);
            break;
    }
    return true;
});
