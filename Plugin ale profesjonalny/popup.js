document.addEventListener('DOMContentLoaded', () => {
    const toggleButton = document.getElementById('toggleBlocking');
    const downloadButton = document.getElementById('downloadLogs');
    const clearButton = document.getElementById('clearLogs');
    const resetCountButton = document.getElementById('resetCount');
    const pickElementButton = document.getElementById('pickElement');
    const resetCustomRulesButton = document.getElementById('resetCustomRules');
    const toggleWhitelistButton = document.getElementById('toggleWhitelist');
    const statusMessage = document.getElementById('statusMessage');
    const mainView = document.getElementById('main-view');
    const settingsView = document.getElementById('settings-view');
    const showSettingsButton = document.getElementById('showSettings');
    const showMainButton = document.getElementById('showMain');
    const headerTitle = document.getElementById('headerTitle');
    let statusTimeout;
    const BLOCKING_STATE_KEY = 'isBlockingEnabled';
    const CUSTOM_RULES_KEY = 'customBlockedSelectors';
    const WHITELIST_KEY = 'whitelistedDomains';
    function initializeUI() {
        document.title = STRINGS.POPUP.TITLE;
        headerTitle.textContent = STRINGS.POPUP.HEADER;
        toggleButton.textContent = STRINGS.POPUP.LOADING;
        toggleWhitelistButton.textContent = STRINGS.POPUP.WHITELIST_BUTTON_DEFAULT;
        showSettingsButton.textContent = STRINGS.POPUP.SETTINGS_SHOW;
        pickElementButton.textContent = STRINGS.POPUP.SETTINGS_PICK_ELEMENT;
        resetCustomRulesButton.textContent = STRINGS.POPUP.SETTINGS_RESET_CUSTOM_RULES;
        resetCountButton.textContent = STRINGS.POPUP.SETTINGS_RESET_COUNTER;
        downloadButton.textContent = STRINGS.POPUP.SETTINGS_DOWNLOAD_LOGS;
        clearButton.textContent = STRINGS.POPUP.SETTINGS_CLEAR_LOGS;
        showMainButton.textContent = STRINGS.POPUP.SETTINGS_BACK;
    }
    function showStatus(message, duration = 2500) {
        clearTimeout(statusTimeout);
        statusMessage.textContent = message;
        statusMessage.style.opacity = '1';

        statusTimeout = setTimeout(() => {
            statusMessage.style.opacity = '0';
        }, duration);
    }
    function updateButtonState(isEnabled) {
        if (isEnabled) {
            toggleButton.textContent = STRINGS.POPUP.TOGGLE_ENABLED;
            toggleButton.className = 'enabled';
        } else {
            toggleButton.textContent = STRINGS.POPUP.TOGGLE_DISABLED;
            toggleButton.className = 'disabled';
        }
        chrome.runtime.sendMessage({ type: "updateBlockingState", isEnabled: isEnabled });
    }
    function updateWhitelistButton(hostname, whitelistedDomains) {
        if (whitelistedDomains.includes(hostname)) {
            toggleWhitelistButton.textContent = STRINGS.POPUP.WHITELIST_REMOVE;
            toggleWhitelistButton.className = 'whitelisted';
        } else {
            toggleWhitelistButton.textContent = STRINGS.POPUP.WHITELIST_ADD;
            toggleWhitelistButton.className = 'not-whitelisted';
        }
    }
    initializeUI();
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const currentTab = tabs[0];
        if (currentTab && currentTab.url && currentTab.url.startsWith('http')) {
            const url = new URL(currentTab.url);
            const currentHostname = url.hostname;
            chrome.storage.local.get({ [BLOCKING_STATE_KEY]: true, [WHITELIST_KEY]: [] }, (result) => {
                updateButtonState(result[BLOCKING_STATE_KEY]);
                updateWhitelistButton(currentHostname, result[WHITELIST_KEY]);
            });
        } else {
            toggleWhitelistButton.disabled = true;
            toggleWhitelistButton.textContent = STRINGS.POPUP.WHITELIST_NOT_APPLICABLE;
            chrome.storage.local.get({ [BLOCKING_STATE_KEY]: true }, (result) => {
                updateButtonState(result[BLOCKING_STATE_KEY]);
            });
        }
    });
    showSettingsButton.addEventListener('click', () => {
        mainView.style.display = 'none';
        settingsView.style.display = 'block';
    });
    showMainButton.addEventListener('click', () => {
        settingsView.style.display = 'none';
        mainView.style.display = 'block';
    });
 toggleButton.addEventListener('click', () => {
    chrome.storage.local.get({ [BLOCKING_STATE_KEY]: true }, (result) => {
        const currentState = result[BLOCKING_STATE_KEY];
        const newState = !currentState
        chrome.storage.local.set({ [BLOCKING_STATE_KEY]: newState }, () => {
            updateButtonState(newState);
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (tabs[0] && tabs[0].id) {
                    chrome.tabs.reload(tabs[0].id);
                }
            });
        });
    });
});

    pickElementButton.addEventListener('click', () => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0] && tabs[0].id) {
                chrome.tabs.sendMessage(tabs[0].id, { type: "ACTIVATE_PICKER" }, (response) => {
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
                let statusMessage;
                if (isWhitelisted) {
                    whitelistedDomains = whitelistedDomains.filter(domain => domain !== currentHostname);
                    statusMessage = STRINGS.POPUP.STATUS_WHITELIST_REMOVED(currentHostname);
                } else {
                    whitelistedDomains.push(currentHostname);
                    statusMessage = STRINGS.POPUP.STATUS_WHITELIST_ADDED(currentHostname);
                }
                showStatus(statusMessage);
                chrome.storage.local.set({ [WHITELIST_KEY]: whitelistedDomains }, () => {
                    updateWhitelistButton(currentHostname, whitelistedDomains);
                    setTimeout(() => {
                        if (currentTab && currentTab.id) {
                            chrome.tabs.reload(currentTab.id);
                        }
                    }, 500);
                });
            });
        });
    });
    downloadButton.addEventListener('click', () => {
        chrome.storage.local.get(['inspector_logs'], (result) => {
            if (result.inspector_logs && result.inspector_logs.length > 0) {
                const logs = result.inspector_logs;
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
        chrome.storage.local.remove('inspector_logs', () => {
             showStatus(STRINGS.POPUP.STATUS_LOGS_CLEARED);
        });
    });
    resetCountButton.addEventListener('click', () => {
        chrome.runtime.sendMessage({ type: "RESET_AD_COUNT" }, (response) => {
             showStatus(STRINGS.POPUP.STATUS_COUNTER_RESET);
        });
    });
    resetCustomRulesButton.addEventListener('click', () => {
        chrome.storage.local.remove(CUSTOM_RULES_KEY, () => {
            showStatus(STRINGS.POPUP.STATUS_CUSTOM_RULES_RESET);
            setTimeout(() => {
                chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                    if (tabs[0] && tabs[0].id) {
                        chrome.tabs.reload(tabs[0].id);
                    }
                });
            }, 1000); 
        });
    });
});
