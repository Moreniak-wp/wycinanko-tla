// popup.js v7.4 
document.addEventListener('DOMContentLoaded', () => {
    const toggleButton = document.getElementById('toggleBlocking');
    const downloadButton = document.getElementById('downloadLogs');
    const clearButton = document.getElementById('clearLogs');
    const resetCountButton = document.getElementById('resetCount');
    const pickElementButton = document.getElementById('pickElement');
    const resetCustomRulesButton = document.getElementById('resetCustomRules');
    const statusMessage = document.getElementById('statusMessage');
    let statusTimeout; 
    const BLOCKING_STATE_KEY = 'isBlockingEnabled';
    const CUSTOM_RULES_KEY = 'customBlockedSelectors';
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
            toggleButton.textContent = 'Zatrzymaj Blokowanie';
            toggleButton.className = 'enabled';
        } else {
            toggleButton.textContent = 'Uruchom Blokowanie';
            toggleButton.className = 'disabled';
        }
        chrome.runtime.sendMessage({ type: "UPDATE_BLOCKING_STATE", isEnabled: isEnabled });
    }
    chrome.storage.local.get({ [BLOCKING_STATE_KEY]: true }, (result) => {
        updateButtonState(result[BLOCKING_STATE_KEY]);
    });
    toggleButton.addEventListener('click', () => {
        chrome.storage.local.get({ [BLOCKING_STATE_KEY]: true }, (result) => {
            const currentState = result[BLOCKING_STATE_KEY];
            const newState = !currentState;
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
                        showStatus("Pipeta jest niedostępna na tej stronie.", 3500);
                    } else {
                        console.log(response.status);
                        window.close();
                    }
                });
            } else {
                 showStatus("Nie znaleziono aktywnej karty.", 3000);
            }
        });
    });
    downloadButton.addEventListener('click', () => {
        chrome.storage.local.get(['inspector_logs'], (result) => {
            if (result.inspector_logs && result.inspector_logs.length > 0) {
                const logs = result.inspector_logs;
                const formattedLogs = "Logi z sesji - WP Ad Inspector\n" +
                                    "========================================\n\n" +
                                    logs.join('\n');
                const blob = new Blob([formattedLogs], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                const a_moment = new Date();
                const timestamp = a_moment.getFullYear() + ('0' + (a_moment.getMonth() + 1)).slice(-2) + ('0' + a_moment.getDate()).slice(-2) + "_" + ('0' + a_moment.getHours()).slice(-2) + ('0' + a_moment.getMinutes()).slice(-2);
                a.href = url;
                a.download = `wp_inspector_logs_${timestamp}.txt`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            } else {
                showStatus('Brak logów do pobrania.');
            }
        });
    });
    clearButton.addEventListener('click', () => {
        chrome.storage.local.remove('inspector_logs', () => {
             showStatus('Logi commited die.');
        });
    });
    resetCountButton.addEventListener('click', () => {
        chrome.runtime.sendMessage({ type: "RESET_AD_COUNT" }, (response) => {
             showStatus('Licznik reklam został zresetowany.');
        });
    });
    resetCustomRulesButton.addEventListener('click', () => {
        chrome.storage.local.remove(CUSTOM_RULES_KEY, () => {
            showStatus('Reguły pipisa zresetowane');
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