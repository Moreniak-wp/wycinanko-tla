// strings.js
const STRINGS = {
    POPUP: {
        TITLE: "WP Ad Remover",
        HEADER: "WP Ad Remover",
        TOGGLE_ENABLED: 'Dezaktywuj blokowanie',
        TOGGLE_DISABLED: 'Aktywuj blokowanie',
        WHITELIST_ADD: 'Dodaj do listy wyjątków',
        WHITELIST_REMOVE: 'Usuń z listy wyjątków',
        WHITELIST_NOT_APPLICABLE: 'Opcja niedostępna dla tej strony',
        SETTINGS_SHOW: 'Ustawienia',
        SETTINGS_PICK_ELEMENT: 'Wybierz element do ukrycia',
        SETTINGS_RESET_CUSTOM_RULES: 'Resetuj własne reguły',
        SETTINGS_RESET_COUNTER: 'Zresetuj licznik',
        SETTINGS_DOWNLOAD_LOGS: 'Pobierz dziennik zdarzeń',
        SETTINGS_CLEAR_LOGS: 'Wyczyść dziennik zdarzeń',
        SETTINGS_BACK: 'Powrót',
        LOADING: 'Ładowanie...',
        WHITELIST_BUTTON_DEFAULT: 'Lista wyjątków',
        STATUS_PICKER_UNAVAILABLE: "Narzędzie wyboru jest niedostępne",
        STATUS_PICKER_NO_TAB: "Brak aktywnej karty",
        STATUS_WHITELIST_NO_PERMISSIONS: "Brak uprawnień do modyfikacji strony",
        STATUS_WHITELIST_REMOVED: (hostname) => `Blokowanie reklam na ${hostname} zostało przywrócone.`,
        STATUS_WHITELIST_ADDED: (hostname) => `Domena ${hostname} została dodana do listy wyjątków.`,
        STATUS_LOGS_DOWNLOAD_EMPTY: 'Dziennik zdarzeń jest pusty. Brak danych do pobrania.',
        STATUS_LOGS_CLEARED: 'Dziennik zdarzeń został wyczyszczony.',
        STATUS_COUNTER_RESET: 'Licznik zablokowanych reklam został zresetowany.',
        STATUS_CUSTOM_RULES_RESET: 'Własne reguły ukrywania elementów zostały zresetowane.',
        LOG_FILE_HEADER: "Dziennik zdarzeń sesji - WP Ad Inspector\n========================================\n\n",
        LOG_FILE_NAME: (timestamp) => `wp_ad_remover_logs_${timestamp}.txt`
    },
    BACKGROUND: {
        INIT: "WP Ad Remover - Inicjalizacja rozszerzenia.",
        RULES_SETUP_ERROR: "Błąd podczas konfiguracji reguł sieciowych:",
        RULES_SETUP_SUCCESS: "Reguły sieciowe zostały poprawnie załadowane.",
        AD_BLOCKING_RULES_SETUP_SUCCESS: "Reguły blokowania reklam na poziomie sieci zostały poprawnie załadowane.",
        AD_BLOCKING_RULES_SETUP_ERROR: "Błąd podczas konfiguracji reguł blokowania reklam na poziomie sieci:",
        RESPONSE_ICON_UPDATED: "Ikona rozszerzenia została zaktualizowana.",
        RESPONSE_AD_COUNTER_UPDATED: "Licznik reklam został zaktualizowany.",
        RESPONSE_AD_COUNTER_RESET: "Licznik reklam został zresetowany."
    },
    PROXY: {
        ENABLED: "[Proxy] Połączenie przez serwer proxy jest aktywne.",
        DISABLED: "[Proxy] Połączenie przez serwer proxy jest nieaktywne. Używane są ustawienia systemowe.",
        SETUP_ERROR: "[Proxy] Wystąpił błąd podczas konfiguracji serwera proxy:",
        RESPONSE_UPDATED: "Ustawienia serwera proxy zostały zaktualizowane."
    },
    REMOVER: {
        INIT: "WP Ad Inspector - Kontroler zainicjalizowany.",
        INIT_SAFE_POLLING: "Inicjalizacja: Aktywowano mechanizm bezpiecznego odpytywania.",
        INIT_STATUS: (state) => `Init: Skrypt uruchomiony. Blokowanie jest ${state ? 'AKTYWNE' : 'NIEAKTYWNE'}.`,
        LOG_MESSAGE: (timestamp, message) => `[${timestamp}] ${message}`,
        LOG_ELEMENT_DETAILS: (tag, id, classes) => ` | Element: ${tag}${id}${classes}`,
        LOG_PREFIX: (logMessage) => `[WP Ad Inspector] ${logMessage}`,
        AD_BLOCKED_MESSAGE_ERROR: "Wystąpił błąd podczas wysyłania komunikatu AD_BLOCKED:",
        PICKER_SAVING_RULE: (selector) => `Tryb wyboru: Zapisywanie reguły dla selektora: ${selector}`,
        PICKER_RULE_SAVED: (count) => `Tryb wyboru: Nowa reguła została zapisana. Liczba własnych reguł: ${count}`,
        PICKER_RULE_EXISTS: `Tryb wyboru: Taka reguła już istnieje. Nie podjęto żadnej akcji.`,
        PICKER_SHADOW_DOM_DETECTED: "Tryb wyboru: Wykryto Shadow DOM. Celowanie w element nadrzędny.",
        PICKER_ERROR: (errorMessage) => `Błąd trybu wyboru: Analiza elementu nie powiodła się. Przywracanie do pierwotnego celu. Błąd: ${errorMessage}`,
        PICKER_ELEMENT_REMOVED: "Tryb wyboru: Element został pomyślnie usunięty.",
        PICKER_ELEMENT_REMOVE_FAILED: "Tryb wyboru: Usunięcie elementu nie powiodło się.",
        PICKER_ACTIVATED: "Tryb wyboru: Aktywowany.",
        PICKER_DEACTIVATED: "Tryb wyboru: Deaktywowany.",
        RESPONSE_PICKER_ACTIVATED: "Tryb wyboru elementu aktywny. Kliknij element, który chcesz ukryć.",
        CUSTOM_RULE_ERROR: (selector) => `Błąd własnej reguły: Nieprawidłowy selektor '${selector}'.`,
        PRIMARY_AD_HIDDEN: "Detekcja podstawowa: Ukryto ogólny element reklamowy.",
        FALLBACK_HUNTER_GUARD_HIDDEN: `HunterGuard: Ukryto kontener ze słowami kluczowymi reklam, pomimo obecności tagów treści.`,
        FALLBACK_HUNTER_HIDDEN: "Detekcja pomocnicza (Hunter): Ukryto kontener zawierający wyłącznie reklamy.",
        SAFETY_NET_TRIGGERED: (selector) => `Ostrzeżenie (SafetyNet): Kluczowy element '${selector}' został ukryty. Przywrócono widoczność.`,
        CONTROLLER_BLOCKING_DISABLED: "Kontroler: Blokowanie wyłączone przez użytkownika. Pomijanie procedur.",
        CONTROLLER_DOMAIN_WHITELISTED: (hostname) => `Kontroler: Domena '${hostname}' znajduje się na liście wyjątków. Pomijanie procedur.`
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
