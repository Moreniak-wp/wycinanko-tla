// service-worker.js

// Reguła, która naśladuje logikę "długiego linku śledzącego" z remover.js
const TRACKING_REDIRECT_RULE = {
  id: 101, // Ważne, aby ID nie kolidowało z rules.json
  priority: 2,
  action: { type: 'block' },
  condition: {
    // Ta reguła celuje w żądania nawigacyjne (kliknięcia w linki)
    resource_types: ['main_frame', 'sub_frame'],
    // Używamy wyrażenia regularnego, aby znaleźć linki, które:
    // - Zaczynają się od domeny wp.pl
    // - Mają bardzo długi ciąg parametrów (np. co najmniej 3 parametry)
    // - Często zawierają słowa kluczowe jak "redirect", "campaign", "source"
    "regexFilter": "^https?:\/\/(www\\.)?wp\\.pl\/.*\\?.*&.*&.*(redirect|campaign|source).*"
  }
};

// Po zainstalowaniu rozszerzenia, dodaj naszą dynamiczną regułę
chrome.runtime.onInstalled.addListener(() => {
  chrome.declarativeNetRequest.getDynamicRules(existingRules => {
    const existingRuleIds = new Set(existingRules.map(r => r.id));
    const rulesToAdd = [];

    if (!existingRuleIds.has(TRACKING_REDIRECT_RULE.id)) {
      rulesToAdd.push(TRACKING_REDIRECT_RULE);
    }
    
    if (rulesToAdd.length > 0) {
      chrome.declarativeNetRequest.updateDynamicRules({
        addRules: rulesToAdd
      }, () => {
        console.log("WP Ad Inspector: Dynamiczna reguła blokująca przekierowania reklamowe została dodana.");
      });
    }
  });
});
