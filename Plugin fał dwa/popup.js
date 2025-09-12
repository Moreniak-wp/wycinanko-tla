// popup.js v7.5 - Białolist
document.addEventListener('DOMContentLoaded', () => {
    const toggleButton = document.getElementById('toggleBlocking');
    const downloadButton = document.getElementById('downloadLogs');
    const clearButton = document.getElementById('clearLogs');
    const resetCountButton = document.getElementById('resetCount');
    const pickElementButton = document.getElementById('pickElement');
    const resetCustomRulesButton = document.getElementById('resetCustomRules');
    const toggleWhitelistButton = document.getElementById('toggleWhitelist'); 
    const statusMessage = document.getElementById('statusMessage');
    let statusTimeout;
    
    const BLOCKING_STATE_KEY = 'isBlockingEnabled';
    const CUSTOM_RULES_KEY = 'customBlockedSelectors';
    const WHITELIST_KEY = 'whitelistedDomains'; 

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
            toggleButton.textContent = 'Przyzwij TrUSKa';
            toggleButton.className = 'enabled';
        } else {
            toggleButton.textContent = 'Obudź Papaja';
            toggleButton.className = 'disabled';
        }
        chrome.runtime.sendMessage({ type: "UPDATE_BLOCKING_STATE", isEnabled: isEnabled });
    }
    
    function updateWhitelistButton(hostname, whitelistedDomains) {
        if (whitelistedDomains.includes(hostname)) {
            toggleWhitelistButton.textContent = 'Włącz blokowanie';
            toggleWhitelistButton.className = 'whitelisted';
        } else {
            toggleWhitelistButton.textContent = 'Wyłącz blokowanie';
            toggleWhitelistButton.className = 'not-whitelisted';
        }
    }
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
            toggleWhitelistButton.textContent = 'Tutaj to chuja a nie coś zrobię';
            chrome.storage.local.get({ [BLOCKING_STATE_KEY]: true }, (result) => {
                updateButtonState(result[BLOCKING_STATE_KEY]);
            });
        }
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
                        showStatus("Pipis nie ma tu władzy", 3500);
                    } else {
                        console.log(response.status);
                        window.close();
                    }
                });
            } else {
                 showStatus("Aktywna karta machen", 3000);
            }
        });
    });
    toggleWhitelistButton.addEventListener('click', () => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            const currentTab = tabs[0];
            if (!currentTab || !currentTab.url || !currentTab.url.startsWith('http')) {
                showStatus("Ni ma pozwulynia na edycje stryny", 3000);
                return;
            }

            const url = new URL(currentTab.url);
            const currentHostname = url.hostname;

            chrome.storage.local.get({ [WHITELIST_KEY]: [] }, (result) => {
                let whitelistedDomains = result[WHITELIST_KEY];
                const isWhitelisted = whitelistedDomains.includes(currentHostname);

                if (isWhitelisted) {
                    whitelistedDomains = whitelistedDomains.filter(domain => domain !== currentHostname);
                    showStatus(`chcesz reklamy abyśmy usuwali? co my jesteśmy? adblock, a nie czej. na ${currentHostname} reklamy będą blokowane`);
                } else {
                    whitelistedDomains.push(currentHostname);
                    showStatus(`Skoro ładnie poprosiłeś to możemy dla ${currentHostname} nie blokować reklam`);
                }
                
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
                showStatus('Jak ty chcesz pobrać logi jak ich kurwa nie ma???');
            }
        });
    });

    clearButton.addEventListener('click', () => {
        chrome.storage.local.remove('inspector_logs', () => {
             showStatus('Mi logi...');
        });
    });

    resetCountButton.addEventListener('click', () => {
        chrome.runtime.sendMessage({ type: "RESET_AD_COUNT" }, (response) => {
             showStatus('Jesteś z siebie dumny debilu? Tera od nowa muszę liczyć.');
        });
    });

    resetCustomRulesButton.addEventListener('click', () => {
        chrome.storage.local.remove(CUSTOM_RULES_KEY, () => {
            showStatus('Pipis chwilowo odsuniety od rządu.');
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
