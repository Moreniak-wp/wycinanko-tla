const STRINGS = {
    POPUP: {
        TITLE: "WP Ad Remover",
        HEADER: "WP Ad Remover Pro Ultra Max",
        TOGGLE_ENABLED: 'Przyzwij TrUSKa',
        TOGGLE_DISABLED: 'Obudź Papaja',
        WHITELIST_ADD: 'Wyłącz blokowanie',
        WHITELIST_REMOVE: 'Włącz blokowanie',
        WHITELIST_NOT_APPLICABLE: 'Tutaj to chuja a nie coś zrobię',
        SETTINGS_SHOW: 'Ciemna strona księżyca ',
        SETTINGS_PICK_ELEMENT: 'AtaKPiPiS',
        SETTINGS_RESET_CUSTOM_RULES: 'Odsuń Pipisa od rządu',
        SETTINGS_RESET_COUNTER: 'Atak kamikadze na licznik reklam',
        SETTINGS_DOWNLOAD_LOGS: 'Wykradnij dane żądowe',
        SETTINGS_CLEAR_LOGS: 'Zajeb Logi',
        SETTINGS_BACK: 'Jasna strona księżyca',
        LOADING: 'Ładuje sie kurde ten',
        WHITELIST_BUTTON_DEFAULT: 'Białalista',
        STATUS_PICKER_UNAVAILABLE: "Pipis nie ma tu władzy",
        STATUS_PICKER_NO_TAB: "Aktywna karta machen",
        STATUS_WHITELIST_NO_PERMISSIONS: "Ni ma pozwulynia na edycje stryny",
        STATUS_WHITELIST_REMOVED: (hostname) => `Chcesz reklamy abyśmy usuwali? Co my jesteśmy? Adblock, a nie czej.`,
        STATUS_WHITELIST_ADDED: (hostname) => `Skoro ładnie poprosiłeś, to możemy dla ${hostname} nie blokować reklam`,
        STATUS_LOGS_DOWNLOAD_EMPTY: 'Jak ty chcesz pobrać logi jak ich kurwa nie ma???',
        STATUS_LOGS_CLEARED: 'Mi logi...',
        STATUS_COUNTER_RESET: 'Jesteś z siebie dumny debilu? Tera od nowa muszę liczyć.',
        STATUS_CUSTOM_RULES_RESET: 'Pipis chwilowo odsuniety od rządu.',
        LOG_FILE_HEADER: "Logi z sesji - WP Ad Inspector\n========================================\n\n",
        LOG_FILE_NAME: (timestamp) => `wp_inspector_logs_${timestamp}.txt`
    },
    BACKGROUND: {
        INIT: "WP Ad Remover (v7.5 Pro) - URUCHAMIAM TRYB CICHY.",
        RULES_SETUP_ERROR: "Błąd podczas ustawiania reguł sieciowych:",
        RULES_SETUP_SUCCESS: "Reguły sieciowe zostały ustawione. Reguła blokowania długich URL jest aktywna.",
        RESPONSE_ICON_UPDATED: "Ikona zaktualizowana",
        RESPONSE_AD_COUNTER_UPDATED: "Licznik reklam zaktualizowany",
        RESPONSE_AD_COUNTER_RESET: "Licznik reklam zresetowany"
    },
    PROXY: {
        ENABLED: "[Proxy] Proxy włączone:",
        DISABLED: "[Proxy] Proxy wyłączone. Używane są ustawienia systemowe.",
        SETUP_ERROR: "[Proxy] Błąd podczas konfiguracji proxy:",
        RESPONSE_UPDATED: "Ustawienia proxy zostały zaktualizowane"
    },
    REMOVER: {
        INIT: "WP Ad Inspector (v27.0) - CONTROLLER - Initialized.",
        INIT_SAFE_POLLING: "Init: Safe polling mechanism for all routines is now active.",
        INIT_STATUS: (state) => `Init: Script v27.0 (Shadow of the PIPIS) started. Blocking is currently ${state ? 'ENABLED' : 'DISABLED'}.`,
        LOG_MESSAGE: (timestamp, message) => `[${timestamp}] ${message}`,
        LOG_ELEMENT_DETAILS: (tag, id, classes) => ` | Element: ${tag}${id}${classes}`,
        LOG_PREFIX: (logMessage) => `[WP Ad Inspector] ${logMessage}`,
        AD_BLOCKED_MESSAGE_ERROR: "Błąd podczas wysyłania wiadomosci AD_BLOCKED:",
        PICKER_SAVING_RULE: (selector) => `Picker: Saving rule for selector: ${selector}`,
        PICKER_RULE_SAVED: (count) => `Picker: New rule saved. Total custom rules: ${count}`,
        PICKER_RULE_EXISTS: `Picker: Rule already exists. No action taken.`,
        PICKER_SHADOW_DOM_DETECTED: "Picker: Shadow DOM detected. Targeting host element.",
        PICKER_ERROR: (errorMessage) => `!!! Picker Error: Failed during element analysis. Fallback to removing true target. Error: ${errorMessage}`,
        PICKER_ELEMENT_REMOVED: "Picker: Element removed successfully.",
        PICKER_ELEMENT_REMOVE_FAILED: "Picker: FAILED to remove element.",
        PICKER_ACTIVATED: "Picker: Activated.",
        PICKER_DEACTIVATED: "Picker: Deactivated.",
        RESPONSE_PICKER_ACTIVATED: "Pipis tryb aktywny, spróbuj nie rozpierdolić strony",
        CUSTOM_RULE_ERROR: (selector) => `CustomRule Error: Invalid selector '${selector}'.`,
        PRIMARY_AD_HIDDEN: "PrimaryDetection: Hiding generic ad element.",
        FALLBACK_HUNTER_GUARD_HIDDEN: `HunterGuard: Hiding container with ad keywords despite content tags.`,
        FALLBACK_HUNTER_HIDDEN: "FallbackDetection (Hunter): Hiding ad-only container.",
        SAFETY_NET_TRIGGERED: (selector) => `!!! SafetyNet TRIGGERED: Critical element '${selector}' was hidden, visibility restored.`,
        CONTROLLER_BLOCKING_DISABLED: "Controller: Blocking is disabled by user. Skipping all routines.",
        CONTROLLER_DOMAIN_WHITELISTED: (hostname) => `Controller: Domain '${hostname}' is on the whitelist. Skipping all routines.`
    }
};

const STORAGE_KEYS = {
    IS_BLOCKING_ENABLED: 'isBlockingEnabled',
    BLOCKED_ADS_COUNT: 'blockedAdsCount',
    CUSTOM_RULES_KEY: 'customBlockedSelectors',
    WHITELIST_KEY: 'whitelistedDomains',
    INSPECTOR_LOGS: 'inspector_logs',
    PROXY_ENABLED: 'proxyEnabled',
    PROXY_HOST: 'proxyHost',
    PROXY_PORT: 'proxyPort'
};

const MESSAGE_TYPES = {
    UPDATE_BLOCKING_STATE: "UPDATE_BLOCKING_STATE",
    AD_BLOCKED: "AD_BLOCKED",
    RESET_AD_COUNT: "RESET_AD_COUNT",
    UPDATE_PROXY_SETTINGS: "UPDATE_PROXY_SETTINGS",
    ACTIVATE_PICKER: "ACTIVATE_PICKER"
};

