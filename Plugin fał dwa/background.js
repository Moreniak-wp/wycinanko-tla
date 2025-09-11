// background.js - v7.1
console.log("WP Ad Remover (v7.1 Pro) - URUCHAMIAM TRYB CICHY.");

function clearAllRules() {
    chrome.declarativeNetRequest.getDynamicRules(existingRules => {
        if (existingRules.length > 0) {
            const ruleIdsToRemove = existingRules.map(rule => rule.id);
            chrome.declarativeNetRequest.updateDynamicRules({
                removeRuleIds: ruleIdsToRemove, addRules: []
            }, () => {
                if (chrome.runtime.lastError) console.error("Blomd podczas czyszczenia regul:", chrome.runtime.lastError);
                else console.log("Regu,y blokowania sieciowego wyczyszczone.");
            });
        }
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
    clearAllRules();
    chrome.storage.local.get({ isBlockingEnabled: true }, (result) => {
        updateExtensionIcon(result.isBlockingEnabled);
        updateBadgeText(); 
    });
});
chrome.runtime.onStartup.addListener(() => {
    clearAllRules();
    chrome.storage.local.get({ isBlockingEnabled: true }, (result) => {
        updateExtensionIcon(result.isBlockingEnabled);
        updateBadgeText(); 
    });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "UPDATE_BLOCKING_STATE") {
        updateExtensionIcon(message.isEnabled);
        sendResponse({ status: "Ikona zaktualizowana" });
    } else if (message.type === "AD_BLOCKED") {
        chrome.storage.local.get('blockedAdsCount', (result) => {
            const currentCount = result.blockedAdsCount || 0;
            const newCount = currentCount + 1;
            chrome.storage.local.set({ blockedAdsCount: newCount }, () => {
                updateBadgeText();
            });
        });
        sendResponse({ status: "Licznik reklam zaktualizowany" });
    } else if (message.type === "RESET_AD_COUNT") {
        chrome.storage.local.set({ blockedAdsCount: 0 }, () => {
            updateBadgeText();
            sendResponse({ status: "Licznik reklam zresetowany" });
        });
    }
});