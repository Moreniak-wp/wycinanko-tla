// background.js - v7.0
console.log("WP Ad Remover (v7.0 Pro) - URUCHAMIAM TRYB CICHY.");
function clearAllRules() {  }
chrome.runtime.onInstalled.addListener(clearAllRules);
chrome.runtime.onStartup.addListener(clearAllRules);
function clearAllRules() {
    chrome.declarativeNetRequest.getDynamicRules(existingRules => {
        if (existingRules.length > 0) {
            const ruleIdsToRemove = existingRules.map(rule => rule.id);
            chrome.declarativeNetRequest.updateDynamicRules({
                removeRuleIds: ruleIdsToRemove, addRules: []
            }, () => {
                if (chrome.runtime.lastError) console.error("Błąd podczas czyszczenia reguł:", chrome.runtime.lastError);
                else console.log("Reguły blokowania sieciowego wyczyszczone.");
            });
        }
    });
}
chrome.runtime.onInstalled.addListener(clearAllRules);
chrome.runtime.onStartup.addListener(clearAllRules);