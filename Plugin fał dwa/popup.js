// popup.js v7.3 

document.addEventListener('DOMContentLoaded', () => {
    const toggleButton = document.getElementById('toggleBlocking');
    const downloadButton = document.getElementById('downloadLogs');
    const clearButton = document.getElementById('clearLogs');
    const resetCountButton = document.getElementById('resetCount');

    const pickElementButton = document.getElementById('pickElement');

    const BLOCKING_STATE_KEY = 'isBlockingEnabled';

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
                    if (tabs[0]) {
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
                        console.error("Nie można aktywować pipety na tej stronie:", chrome.runtime.lastError.message);
                        alert("Nie można aktywować pipety na tej stronie. Upewnij się, że jesteś na stronie obsługiwanej przez rozszerzenie (np. wp.pl).");
                    } else {
                        console.log(response.status);
                    }
                });
                window.close();
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
                alert('Brak logów do pobrania w tej sesji.');
            }
        });
    });

    clearButton.addEventListener('click', () => {
        chrome.storage.local.remove('inspector_logs', () => {
            alert('Logi commited die.');
        });
    });

    resetCountButton.addEventListener('click', () => {
        chrome.runtime.sendMessage({ type: "RESET_AD_COUNT" }, (response) => {
            alert('Licznik reklam został zresetowany.');
        });
    });
});
