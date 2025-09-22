// popup.js - Zaktualizowany o zarządzanie regułami

document.addEventListener('DOMContentLoaded', () => {
    // --- SEKCJA POBIERANIA ELEMENTÓW DOM ---
    const headerTitle = document.getElementById('headerTitle');
    const statusMessage = document.getElementById('statusMessage');

    // Przyciski i widoki
    const mainView = document.getElementById('main-view');
    const settingsView = document.getElementById('settings-view');
    const rulesView = document.getElementById('rules-view'); 

    // Przyciski widoku głównego
    const toggleButton = document.getElementById('toggleBlocking');
    const toggleWhitelistButton = document.getElementById('toggleWhitelist');
    const pickElementButton = document.getElementById('pickElement');
    const showSettingsButton = document.getElementById('showSettings');
    
    // Przyciski widoku ustawień
    const showMainButton = document.getElementById('showMain');
    const manageRulesButton = document.getElementById('manageRules'); 
    const resetCustomRulesButton = document.getElementById('resetCustomRules');
    const resetCountButton = document.getElementById('resetCount');
    const downloadButton = document.getElementById('downloadLogs');
    const clearButton = document.getElementById('clearLog`s');

    // Elementy widoku zarządzania regułami
    const rulesViewHeader = document.getElementById('rulesViewHeader');
    const rulesListContainer = document.getElementById('rulesListContainer');
    const backToSettingsButton = document.getElementById('backToSettings'); 

    // --- ZMIENNE GLOBALNE I STAŁE ---
    let statusTimeout;
    const { CUSTOM_RULES_KEY, WHITELIST_KEY, IS_BLOCKING_ENABLED } = STORAGE_KEYS;

    // --- FUNKCJE INICJALIZACYJNE I POMOCNICZE ---

    /**
     * Ustawia początkowe teksty interfejsu na podstawie pliku strings.js
     */
    function initializeUI() {
        document.title = STRINGS.POPUP.TITLE;
        headerTitle.textContent = STRINGS.POPUP.HEADER;
        
        // Widok główny
        toggleButton.textContent = STRINGS.POPUP.LOADING;
        toggleWhitelistButton.textContent = STRINGS.POPUP.WHITELIST_BUTTON_DEFAULT;
        pickElementButton.textContent = STRINGS.POPUP.SETTINGS_PICK_ELEMENT;
        showSettingsButton.textContent = STRINGS.POPUP.SETTINGS_SHOW;
        
        // Widok ustawień
        manageRulesButton.textContent = STRINGS.POPUP.SETTINGS_MANAGE_RULES;
        resetCustomRulesButton.textContent = STRINGS.POPUP.SETTINGS_RESET_CUSTOM_RULES;
        resetCountButton.textContent = STRINGS.POPUP.SETTINGS_RESET_COUNTER;
        downloadButton.textContent = STRINGS.POPUP.SETTINGS_DOWNLOAD_LOGS;
        clearButton.textContent = STRINGS.POPUP.SETTINGS_CLEAR_LOGS;
        showMainButton.textContent = STRINGS.POPUP.SETTINGS_BACK;

        // Widok reguł
        rulesViewHeader.textContent = STRINGS.POPUP.RULES_VIEW_HEADER;
        backToSettingsButton.textContent = STRINGS.POPUP.SETTINGS_BACK;
    }

    /**
     * Wyświetla komunikat dla użytkownika na określony czas.
     * @param {string} message - Treść komunikatu.
     * @param {number} [duration=2500] - Czas wyświetlania w milisekundach.
     */
    function showStatus(message, duration = 2500) {
        clearTimeout(statusTimeout);
        statusMessage.textContent = message;
        statusMessage.style.opacity = '1';

        statusTimeout = setTimeout(() => {
            statusMessage.style.opacity = '0';
        }, duration);
    }

    /**
     * Odświeża aktywną kartę w przeglądarce.
     * @param {number} [delay=500] - Opóźnienie przed odświeżeniem.
     */
    function reloadCurrentTab(delay = 500) {
        setTimeout(() => {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (tabs[0] && tabs[0].id) {
                    chrome.tabs.reload(tabs[0].id);
                }
            });
        }, delay);
    }

    // --- FUNKCJE AKTUALIZACJI STANU UI ---

    /**
     * Aktualizuje wygląd i treść przycisku włączania/wyłączania blokowania.
     * @param {boolean} isEnabled - Czy blokowanie jest aktywne.
     */
    function updateToggleButtonState(isEnabled) {
        if (isEnabled) {
            toggleButton.textContent = STRINGS.POPUP.TOGGLE_ENABLED;
            toggleButton.className = 'enabled';
        } else {
            toggleButton.textContent = STRINGS.POPUP.TOGGLE_DISABLED;
            toggleButton.className = 'disabled';
        }
        chrome.runtime.sendMessage({ type: MESSAGE_TYPES.UPDATE_BLOCKING_STATE, isEnabled: isEnabled });
    }

    /**
     * Aktualizuje przycisk białej listy na podstawie bieżącej domeny.
     * @param {string} hostname - Hostname bieżącej karty.
     * @param {string[]} whitelistedDomains - Tablica domen z białej listy.
     */
    function updateWhitelistButton(hostname, whitelistedDomains) {
        if (whitelistedDomains.includes(hostname)) {
            toggleWhitelistButton.textContent = STRINGS.POPUP.WHITELIST_REMOVE;
            toggleWhitelistButton.className = 'whitelisted btn-primary';
        } else {
            toggleWhitelistButton.textContent = STRINGS.POPUP.WHITELIST_ADD;
            toggleWhitelistButton.className = 'not-whitelisted btn-primary';
        }
    }

    // --- NOWA LOGIKA: ZARZĄDZANIE REGUŁAMI ---
    
    /**
     * Generuje i wyświetla listę własnych reguł użytkownika.
     */
    function populateRulesList() {
        chrome.storage.local.get({ [CUSTOM_RULES_KEY]: [] }, (result) => {
            const customRules = result[CUSTOM_RULES_KEY];
            rulesListContainer.innerHTML = ''; // Wyczyść kontener

            if (customRules.length === 0) {
                rulesListContainer.innerHTML = `<div class="rules-empty-message">${STRINGS.POPUP.RULES_VIEW_EMPTY}</div>`;
                return;
            }

            customRules.forEach(ruleSelector => {
                const ruleItem = document.createElement('div');
                ruleItem.className = 'rule-item';

                const selectorSpan = document.createElement('span');
                selectorSpan.className = 'rule-selector';
                selectorSpan.textContent = ruleSelector;

                const deleteButton = document.createElement('button');
                deleteButton.className = 'delete-rule-btn';
                deleteButton.textContent = STRINGS.POPUP.RULES_VIEW_DELETE_RULE;

                deleteButton.addEventListener('click', () => {
                    deleteRule(ruleSelector);
                });

                ruleItem.appendChild(selectorSpan);
                ruleItem.appendChild(deleteButton);
                rulesListContainer.appendChild(ruleItem);
            });
        });
    }

    /**
     * Usuwa wybraną regułę ze storage i odświeża widok.
     * @param {string} ruleSelector - Selektor reguły do usunięcia.
     */
    function deleteRule(ruleSelector) {
        chrome.storage.local.get({ [CUSTOM_RULES_KEY]: [] }, (result) => {
            let customRules = result[CUSTOM_RULES_KEY];
            customRules = customRules.filter(rule => rule !== ruleSelector);
            
            chrome.storage.local.set({ [CUSTOM_RULES_KEY]: customRules }, () => {
                showStatus(STRINGS.POPUP.STATUS_RULE_DELETED);
                populateRulesList(); 
                reloadCurrentTab(); 
            });
        });
    }
    initializeUI();
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const currentTab = tabs[0];
        const isHttpPage = currentTab && currentTab.url && currentTab.url.startsWith('http');

        chrome.storage.local.get({ [IS_BLOCKING_ENABLED]: true, [WHITELIST_KEY]: [] }, (result) => {
            updateToggleButtonState(result[IS_BLOCKING_ENABLED]);
            if (isHttpPage) {
                const url = new URL(currentTab.url);
                updateWhitelistButton(url.hostname, result[WHITELIST_KEY]);
            } else {
                toggleWhitelistButton.disabled = true;
                toggleWhitelistButton.textContent = STRINGS.POPUP.WHITELIST_NOT_APPLICABLE;
            }
        });
    });

    showSettingsButton.addEventListener('click', () => {
        mainView.style.display = 'none';
        settingsView.style.display = 'block';
    });

    showMainButton.addEventListener('click', () => {
        settingsView.style.display = 'none';
        mainView.style.display = 'block';
    });

    manageRulesButton.addEventListener('click', () => {
        settingsView.style.display = 'none';
        rulesView.style.display = 'block';
        populateRulesList(); 
    });

    backToSettingsButton.addEventListener('click', () => {
        rulesView.style.display = 'none';
        settingsView.style.display = 'block';
    });

    toggleButton.addEventListener('click', () => {
        chrome.storage.local.get({ [IS_BLOCKING_ENABLED]: true }, (result) => {
            const newState = !result[IS_BLOCKING_ENABLED];
            chrome.storage.local.set({ [IS_BLOCKING_ENABLED]: newState }, () => {
                updateToggleButtonState(newState);
                reloadCurrentTab();
            });
        });
    });

    toggleWhitelistButton.addEventListener('click', () => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            const currentTab = tabs[0];
            if (!currentTab || !currentTab.url || !currentTab.url.startsWith('http')) {
                showStatus(STRINGS.POPUP.STATUS_WHITELIST_NO_PERMISSIONS, 3000);
                return;
            }
            const url = new URL(currentTab.url);
            const currentHostname = url.hostname;
            chrome.storage.local.get({ [WHITELIST_KEY]: [] }, (result) => {
                let whitelistedDomains = result[WHITELIST_KEY];
                const isWhitelisted = whitelistedDomains.includes(currentHostname);
                
                let statusMsg;
                if (isWhitelisted) {
                    whitelistedDomains = whitelistedDomains.filter(domain => domain !== currentHostname);
                    statusMsg = STRINGS.POPUP.STATUS_WHITELIST_REMOVED(currentHostname);
                } else {
                    whitelistedDomains.push(currentHostname);
                    statusMsg = STRINGS.POPUP.STATUS_WHITELIST_ADDED(currentHostname);
                }

                chrome.storage.local.set({ [WHITELIST_KEY]: whitelistedDomains }, () => {
                    updateWhitelistButton(currentHostname, whitelistedDomains);
                    showStatus(statusMsg);
                    reloadCurrentTab();
                });
            });
        });
    });

    pickElementButton.addEventListener('click', () => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0] && tabs[0].id) {
                chrome.tabs.sendMessage(tabs[0].id, { type: MESSAGE_TYPES.ACTIVATE_PICKER }, (response) => {
                    if (chrome.runtime.lastError) {
                        showStatus(STRINGS.POPUP.STATUS_PICKER_UNAVAILABLE, 3500);
                    } else {
                        console.log(response.status);
                        window.close(); 
                    }
                });
            } else {
                 showStatus(STRINGS.POPUP.STATUS_PICKER_NO_TAB, 3000);
            }
        });
    });

    resetCustomRulesButton.addEventListener('click', () => {
        chrome.storage.local.remove(CUSTOM_RULES_KEY, () => {
            showStatus(STRINGS.POPUP.STATUS_CUSTOM_RULES_RESET);
            reloadCurrentTab(1000);
        });
    });

    downloadButton.addEventListener('click', () => {
        chrome.storage.local.get([STORAGE_KEYS.INSPECTOR_LOGS], (result) => {
            const logs = result[STORAGE_KEYS.INSPECTOR_LOGS];
            if (logs && logs.length > 0) {
                const formattedLogs = STRINGS.POPUP.LOG_FILE_HEADER + logs.join('\n');
                const blob = new Blob([formattedLogs], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                const a_moment = new Date();
                const timestamp = a_moment.getFullYear() + ('0' + (a_moment.getMonth() + 1)).slice(-2) + ('0' + a_moment.getDate()).slice(-2) + "_" + ('0' + a_moment.getHours()).slice(-2) + ('0' + a_moment.getMinutes()).slice(-2);
                a.href = url;
                a.download = STRINGS.POPUP.LOG_FILE_NAME(timestamp);
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            } else {
                showStatus(STRINGS.POPUP.STATUS_LOGS_DOWNLOAD_EMPTY);
            }
        });
    });

    clearButton.addEventListener('click', () => {
        chrome.storage.local.remove(STORAGE_KEYS.INSPECTOR_LOGS, () => {
             showStatus(STRINGS.POPUP.STATUS_LOGS_CLEARED);
        });
    });

    resetCountButton.addEventListener('click', () => {
        chrome.runtime.sendMessage({ type: MESSAGE_TYPES.RESET_AD_COUNT }, () => {
             showStatus(STRINGS.POPUP.STATUS_COUNTER_RESET);
        });
    });
});
