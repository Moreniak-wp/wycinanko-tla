console.log(STRINGS.BACKGROUND.INIT);

function setupNetRules() {
    const LONG_URL_RULE_ID = 1001; 
    const longUrlRule = {
        id: LONG_URL_RULE_ID,
        priority: 1, 
        action: { type: 'block' }, 
        condition: {
            regexFilter: '.{150,}',
            resourceTypes: [
                "main_frame", "sub_frame", "stylesheet", "script",
                "image", "font", "object", "xmlhttprequest", "ping",
                "csp_report", "media", "websocket", "other"
            ]
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
    ENABLED: {
        "16": "icons/icon16_active.png",
        "48": "icons/icon48_active.png",
        "128": "icons/icon128_active.png"
    },
    DISABLED: {
        "16": "icons/icon16_inactive.png",
        "48": "icons/icon48_inactive.png",
        "128": "icons/icon128_inactive.png"
    }
};

function updateExtensionIcon(isEnabled) {
    const path = isEnabled ? ICON_PATHS.ENABLED : ICON_PATHS.DISABLED;
    chrome.action.setIcon({ path: path });
}

async function updateBadgeText() {
    const result = await chrome.storage.local.get('blockedAdsCount');
    const count = result.blockedAdsCount || 0;
    chrome.action.setBadgeBackgroundColor({ color: [255, 0, 0, 255] });
    chrome.action.setBadgeText({ text: count > 0 ? count.toString() : '' });
}

chrome.runtime.onInstalled.addListener(() => {
    setupNetRules(); 
    chrome.storage.local.get({ isBlockingEnabled: true }, (result) => {
        updateExtensionIcon(result.isBlockingEnabled);
        updateBadgeText();
    });
});

chrome.runtime.onStartup.addListener(() => {
    setupNetRules(); 
    chrome.storage.local.get({ isBlockingEnabled: true }, (result) => {
        updateExtensionIcon(result.isBlockingEnabled);
        updateBadgeText();
    });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "UPDATE_BLOCKING_STATE") {
        updateExtensionIcon(message.isEnabled);
        sendResponse({ status: STRINGS.BACKGROUND.RESPONSE_ICON_UPDATED });
    } else if (message.type === "AD_BLOCKED") {
        chrome.storage.local.get('blockedAdsCount', (result) => {
            const currentCount = result.blockedAdsCount || 0;
            const newCount = currentCount + 1;
            chrome.storage.local.set({ blockedAdsCount: newCount }, () => {
                updateBadgeText();
            });
        });
        sendResponse({ status: STRINGS.BACKGROUND.RESPONSE_AD_COUNTER_UPDATED });
    } else if (message.type === "RESET_AD_COUNT") {
        chrome.storage.local.set({ blockedAdsCount: 0 }, () => {
            updateBadgeText();
            sendResponse({ status: STRINGS.BACKGROUND.RESPONSE_AD_COUNTER_RESET });
        });
    }
    return true;
});
