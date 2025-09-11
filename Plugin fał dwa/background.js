// background.js - v7.0
// Utrzymujemy TRYB CICHY.
console.log("WP Ad Remover (v7.0 Pro) - URUCHAMIAM TRYB CICHY.");
function clearAllRules() {  }
chrome.runtime.onInstalled.addListener(clearAllRules);
chrome.runtime.onStartup.addListener(clearAllRules);
// Funkcja czyszcząca wszystkie dynamiczne reguły
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
// Uruchom czyszczenie przy instalacji/aktualizacji wtyczki
chrome.runtime.onInstalled.addListener(clearAllRules);
// Uruchom czyszczenie również przy starcie przeglądarki
chrome.runtime.onStartup.addListener(clearAllRules);
