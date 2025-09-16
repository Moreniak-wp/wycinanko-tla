// remover.js v28.2 - z trzema warstwami ochrony (EventHandler, PropertyDefine i natywne Proxy)
// Plik ten jest tzw. "content scriptem" dla rozszerzenia Chrome. Oznacza to, że jest wstrzykiwany i wykonywany
// w kontekście każdej otwartej strony internetowej, aby móc na niej działać i modyfikować jej zawartość (DOM).
// Jego głównym zadaniem jest wykrywanie i blokowanie reklam.
console.log("WP Ad Inspector (v28.2) - CONTROLLER - Initialized.");

// --- SEKCJA KONFIGURACJI I ZMIENNYCH GLOBALNYCH ---

// Definicja kluczy używanych do przechowywania danych w lokalnym magazynie rozszerzenia (chrome.storage.local).
const BLOCKING_STATE_KEY = 'isBlockingEnabled'; // Klucz przechowujący stan włączenia/wyłączenia blokowania.
const CUSTOM_RULES_KEY = 'customBlockedSelectors'; // Klucz przechowujący listę niestandardowych reguł blokowania stworzonych przez użytkownika.
const WHITELIST_KEY = 'whitelistedDomains'; // Klucz przechowujący listę domen, na których blokowanie jest wyłączone (tzw. "biała lista").

// Tablica predefiniowanych selektorów CSS, które służą do identyfikacji typowych elementów reklamowych.
// Są to m.in. identyfikatory i klasy nadawane przez popularne systemy reklamowe jak Google AdSense, AdOcean, Gemius.
const MONITORED_AD_SELECTORS = [
    '[id^="google_ads_iframe_"]', '[id^="div-gpt-ad-"]', '.adsbygoogle',
    '[id*="adocean"]', '[id*="gemius"]', '[data-ad-placeholder]', '[data-ad-slot]',
    'ins.adsbygoogle', 'iframe[src*="googlesyndication.com"]', 'iframe[src*="doubleclick.net"]',
    'div[data-google-query-id]', '[aria-label="Advertisement"]',
    'a[href*="doubleclick.net"]', 'a[href*="ad.wp.pl"]'
];

// Używamy WeakMap do przechowywania "opakowanych" elementów (Proxy).
// WeakMap jest specjalnym rodzajem mapy, która nie zapobiega usunięciu jej kluczy (w tym przypadku elementów DOM)
// przez mechanizm garbage collector. Jeśli element zostanie usunięty ze strony, WeakMap automatycznie usunie
// powiązany z nim wpis, co zapobiega wyciekom pamięci.
const elementProxyMap = new WeakMap();

// Zmienne stanu dla funkcji "Pickera" (narzędzia do ręcznego wybierania elementów do zablokowania).
let isPickerActive = false; // Flaga określająca, czy tryb wyboru elementu jest aktywny.
let highlightedElement = null; // Przechowuje referencję do ostatnio podświetlonego elementu na stronie.

// --- SEKCJA FUNKCJI ---

/**
 * Centralna funkcja do logowania zdarzeń.
 * Zapisuje komunikaty w konsoli deweloperskiej oraz w magazynie rozszerzenia,
 * aby można je było później przejrzeć w panelu inspekcyjnym.
 * @param {string} message - Treść komunikatu do zalogowania.
 * @param {Element} [element=null] - Opcjonalny element DOM, którego dotyczy zdarzenie.
 * @param {boolean} [isAdBlocked=false] - Flaga informująca, czy zdarzenie dotyczyło zablokowania reklamy.
 */
function logEvent(message, element = null, isAdBlocked = false) {
    const timestamp = new Date().toLocaleTimeString();
    let logMessage = `[${timestamp}] ${message}`;
    if (element) {
        const tag = element.tagName;
        const id = element.id ? `#${element.id}` : '';
        const classes = element.className ? `.${element.className.split(' ').join('.')}` : '';
        logMessage += ` | Element: ${tag}${id}${classes}`;
    }
    console.log(`[WP Ad Inspector] ${logMessage}`, element || '');

    // Zapisywanie logów w pamięci rozszerzenia
    chrome.storage.local.get(['inspector_logs'], (result) => {
        const logs = result.inspector_logs || [];
        logs.push(logMessage);
        chrome.storage.local.set({ 'inspector_logs': logs });
    });

    // Jeśli reklama została zablokowana, wysyła wiadomość do innych części rozszerzenia (np. do badge'a na ikonie).
    if (isAdBlocked) {
        chrome.runtime.sendMessage({ type: "AD_BLOCKED" }).catch(error => {
            console.error("Błąd podczas wysyłania wiadomosci AD_BLOCKED:", error);
        });
    }
}

// --- SEKCJA WARSTW OCHRONY PRZED REKLAMAMI ---

/**
 * WARSTWA 1: Ochrona przez przechwytywanie `addEventListener`.
 * Ta funkcja nadpisuje globalną metodę `Element.prototype.addEventListener`. Dzięki temu może sprawdzić
 * każdy przypadek próby dodania nasłuchu na zdarzenia (np. 'click'). Jeśli skrypt reklamowy próbuje
 * dodać listener do elementu zidentyfikowanego jako reklama, próba ta jest blokowana, a reklama ukrywana.
 * Jest to bardzo skuteczna, globalna metoda ochrony.
 */
function interceptEventHandlers() {
    const originalAddEventListener = Element.prototype.addEventListener;
    const monitoredEvents = ['click', 'mousedown', 'mouseup', 'touchstart']; // Zdarzenia, które nas interesują
    const selectorsString = MONITORED_AD_SELECTORS.join(',');

    Element.prototype.addEventListener = function(type, listener, options) {
        // Sprawdź, czy zdarzenie jest jednym z monitorowanych ORAZ czy element pasuje do selektorów reklam.
        if (monitoredEvents.includes(type) && this.matches(selectorsString)) {
            logEvent(`EventHandler-Guard (L1): Zablokowano próbę dodania '${type}' do reklamy.`, this, true);
            this.style.setProperty('display', 'none', 'important'); // Ukryj element reklamy
            return; // Przerwij działanie, nie dodawaj listenera.
        }
        // Jeśli to nie jest reklama, zawołaj oryginalną funkcję addEventListener.
        originalAddEventListener.call(this, type, listener, options);
    };
    logEvent("Init: Warstwa 1 (EventHandler-Guard) jest aktywna.");
}

/**
 * WARSTWA 2: Ochrona przez modyfikację właściwości obiektu DOM (`Object.defineProperty`).
 * Ta funkcja dynamicznie znajduje elementy reklamowe na stronie i modyfikuje ich właściwości
 * zdarzeniowe (np. `onclick`, `onmousedown`). Używa `Object.defineProperty`, aby zdefiniować
 * niestandardowy "setter" dla tych właściwości. Każda próba przypisania nowej funkcji do `onclick`
 * elementu reklamowego zostanie przechwycona, zablokowana i zalogowana.
 */
async function applyPropertyGuardToElements() {
    // Pobierz niestandardowe reguły i połącz je z predefiniowanymi selektorami reklam.
    const result = await chrome.storage.local.get({ [CUSTOM_RULES_KEY]: [] });
    const allSelectors = [...new Set([...MONITORED_AD_SELECTORS, ...result[CUSTOM_RULES_KEY]])];
    const eventProperties = ['onclick', 'onmousedown', 'onmouseup', 'ontouchstart'];

    document.querySelectorAll(allSelectors.join(',')).forEach(element => {
        // `dataset.propertyGuarded` to flaga zapobiegająca wielokrotnemu aplikowaniu ochrony na ten sam element.
        if (element.dataset.propertyGuarded) return;
        element.dataset.propertyGuarded = 'true';

        eventProperties.forEach(prop => {
            Object.defineProperty(element, prop, {
                configurable: true, // Pozwala na ewentualne późniejsze zmiany tej definicji.
                set: function(handler) {
                    logEvent(`Property-Guard (L2): Zablokowano próbę ustawienia '${prop}' na reklamie.`, this, true);
                    this.style.setProperty('display', 'none', 'important'); // Ukryj element.
                    // Nie przypisujemy `handler`, efektywnie blokując operację.
                }
            });
        });
    });
}

/**
 * WARSTWA 3: Ochrona z użyciem natywnego JS Proxy.
 * Proxy to obiekt "opakowujący" inny obiekt (w tym przypadku element DOM) i przechwytujący
 * fundamentalne operacje na nim, takie jak ustawianie (`set`) właściwości.
 * Ta funkcja tworzy Proxy dla każdego znalezionego elementu reklamowego. Handler `set` w proxy
 * sprawdza, czy skrypt próbuje ustawić właściwość zdarzeniową (np. `onclick`). Jeśli tak,
 * blokuje operację i ukrywa reklamę.
 */
function applyTrueProxyGuard() {
    const selectorsString = MONITORED_AD_SELECTORS.join(',');
    const elementsToProxy = document.querySelectorAll(selectorsString);

    elementsToProxy.forEach(el => {
        // Sprawdzamy w `elementProxyMap`, czy dla tego elementu nie stworzono już proxy.
        if (elementProxyMap.has(el)) {
            return;
        }

        const handler = {
            set: function(target, prop, value) {
                const eventProperties = ['onclick', 'onmousedown', 'onmouseup', 'ontouchstart'];
                if (eventProperties.includes(prop)) {
                    logEvent(`Proxy-Guard (L3): Przechwycono próbę ustawienia '${prop}' przez Proxy.`, target, true);
                    target.style.setProperty('display', 'none', 'important');
                    // Zwracamy true, aby oszukać skrypt, że operacja się powiodła, ale w rzeczywistości ją blokujemy.
                    return true;
                }
                // Dla wszystkich innych właściwości pozwalamy na normalne działanie, używając `Reflect.set`.
                return Reflect.set(target, prop, value);
            }
        };

        const proxy = new Proxy(el, handler);
        elementProxyMap.set(el, proxy); // Zapisujemy stworzone proxy w mapie.
    });
}


// --- SEKCJA FUNKCJI "PICKERA" (NARZĘDZIE DO RĘCZNEGO BLOKOWANIA) ---

/**
 * Generuje unikalny selektor CSS dla danego elementu.
 * Selektor ten jest na tyle precyzyjny, aby jednoznacznie zidentyfikować kliknięty element,
 * co pozwala na jego trwałe zablokowanie przez dodanie nowej reguły.
 * Potrafi również obsługiwać elementy wewnątrz Shadow DOM.
 * @param {Element} el - Element DOM, dla którego ma zostać wygenerowany selektor.
 * @returns {string|null} - Wygenerowany selektor CSS lub null w przypadku błędu.
 */
function generateSelector(el) {
    if (!(el instanceof Element)) return null;
    const root = el.getRootNode();
    // Specjalna obsługa dla elementów wewnątrz Shadow DOM
    if (root instanceof ShadowRoot) {
        if (el.id) return `#${CSS.escape(el.id)}`;
        return `${el.tagName.toLowerCase()}`;
    }
    const parts = [];
    while (el && el.nodeType === Node.ELEMENT_NODE) {
        let selector = el.nodeName.toLowerCase();
        if (el.id) {
            try {
                // Sprawdzenie, czy ID jest unikalne na stronie
                if (document.querySelector(el.nodeName.toLowerCase() + '#' + CSS.escape(el.id)) === el) {
                    selector += '#' + CSS.escape(el.id);
                    parts.unshift(selector);
                    break; // ID jest unikalne, nie trzeba dalej budować ścieżki
                }
            } catch (e) {  }
        }
        // Obsługa :nth-of-type, jeśli element nie ma unikalnego ID
        let sib = el, nth = 1;
        while (sib = sib.previousElementSibling) {
            if (sib.nodeName.toLowerCase() == selector) nth++;
        }
        if (nth != 1) selector += `:nth-of-type(${nth})`;
        parts.unshift(selector);
        el = el.parentNode;
    }
    return parts.join(' > ');
}

/**
 * Zapisuje nową, niestandardową regułę blokowania w pamięci rozszerzenia.
 * @param {string} selector - Selektor CSS do zapisania.
 */
async function saveNewCustomRule(selector) {
    if (!selector) return;
    logEvent(`Picker: Zapisywanie reguły dla selektora: ${selector}`);
    const result = await chrome.storage.local.get({ [CUSTOM_RULES_KEY]: [] });
    const customRules = result[CUSTOM_RULES_KEY];
    if (!customRules.includes(selector)) {
        customRules.push(selector);
        await chrome.storage.local.set({ [CUSTOM_RULES_KEY]: customRules });
        logEvent(`Picker: Zapisano nową regułę. Całkowita liczba reguł niestandardowych: ${customRules.length}`);
    } else {
        logEvent(`Picker: Reguła już istnieje. Nie podjęto żadnej akcji.`);
    }
}

/**
 * Obsługuje zdarzenie kliknięcia, gdy "Picker" jest aktywny.
 * Identyfikuje kliknięty element, usuwa go ze strony i zapisuje regułę do jego blokowania w przyszłości.
 * @param {MouseEvent} e - Obiekt zdarzenia myszy.
 */
function handleElementSelection(e) {
    // Zatrzymanie domyślnej akcji (np. przejścia do linku) i propagacji zdarzenia.
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();

    // Identyfikacja "prawdziwego" celu kliknięcia, nawet jeśli jest on wewnątrz Shadow DOM.
    const trueTarget = e.composedPath && e.composedPath()[0] || e.target;
    let elementToRemove = trueTarget;
    let selector = null;
    try {
        const root = trueTarget.getRootNode();
        if (root instanceof ShadowRoot) {
            logEvent("Picker: Wykryto Shadow DOM. Celuję w element-hosta.", root.host);
            elementToRemove = root.host; // W przypadku Shadow DOM, blokujemy cały komponent.
        }
        selector = generateSelector(elementToRemove);
    } catch (err) {
        logEvent(`!!! Błąd Pickera: Nie udało się przeanalizować elementu. Awaryjne usuwanie celu. Błąd: ${err.message}`);
        elementToRemove = trueTarget;
    }

    // Usunięcie elementu ze strony.
    if (elementToRemove && elementToRemove.remove) {
        elementToRemove.remove();
        logEvent("Picker: Element usunięty pomyślnie.", elementToRemove);
    } else {
        logEvent("Picker: NIE udało się usunąć elementu.", elementToRemove);
    }

    deactivatePicker(); // Wyłączenie trybu wyboru.
    saveNewCustomRule(selector); // Zapisanie reguły.
    return false;
}

/**
 * Obsługuje zdarzenie najechania myszą, gdy "Picker" jest aktywny.
 * Podświetla element, nad którym znajduje się kursor, dając wizualną informację zwrotną użytkownikowi.
 * @param {MouseEvent} e - Obiekt zdarzenia myszy.
 */
function handleMouseOver(e) {
    const trueTarget = e.composedPath && e.composedPath()[0] || e.target;
    if (highlightedElement === trueTarget) return; // Unikaj przerysowywania, jeśli kursor jest nad tym samym elemencie.
    
    // Usunięcie podświetlenia z poprzedniego elementu.
    if (highlightedElement) {
        try {
            highlightedElement.style.outline = '';
        } catch (e) {  }
    }
    
    // Podświetlenie nowego elementu.
    highlightedElement = trueTarget;
    highlightedElement.style.outline = '3px dashed #FF00FF';
}

/**
 * Aktywuje tryb "Picker".
 * Dodaje nasłuchiwacze zdarzeń do podświetlania i wybierania elementów.
 */
function activatePicker() {
    if (isPickerActive) return;
    isPickerActive = true;
    logEvent("Picker: Aktywowano.");
    // Użycie `true` w addEventListener (capture phase) zapewnia, że nasze listenery wykonają się jako pierwsze.
    document.addEventListener('mouseover', handleMouseOver, true);
    document.addEventListener('mousedown', handleElementSelection, true);
    document.addEventListener('click', handleElementSelection, true);
}

/**
 * Deaktywuje tryb "Picker".
 * Usuwa podświetlenie i nasłuchiwacze zdarzeń.
 */
function deactivatePicker() {
    if (!isPickerActive) return;
    isPickerActive = false;
    if (highlightedElement) {
        try {
            highlightedElement.style.outline = '';
        } catch (e) { }
    }
    document.removeEventListener('mouseover', handleMouseOver, true);
    document.removeEventListener('mousedown', handleElementSelection, true);
    document.removeEventListener('click', handleElementSelection, true);
    logEvent("Picker: Deaktywowano.");
}


// --- SEKCJA GŁÓWNYCH MECHANIZMÓW BLOKUJĄCYCH ---

/**
 * Aplikuje niestandardowe reguły blokowania stworzone przez użytkownika.
 * Pobiera listę selektorów ze storage i ukrywa wszystkie pasujące elementy na stronie,
 * przeszukując zarówno główny DOM, jak i wszystkie napotkane Shadow DOM.
 */
async function applyCustomRules() {
    const result = await chrome.storage.local.get({ [CUSTOM_RULES_KEY]: [] });
    const customRules = result[CUSTOM_RULES_KEY];
    if (customRules.length === 0) return;

    for (const selector of customRules) {
        try {
            // Ukrywanie w głównym DOM
            document.querySelectorAll(selector).forEach(element => {
                if (element.style.display !== 'none') {
                    element.style.setProperty('display', 'none', 'important');
                }
            });
            // Ukrywanie wewnątrz Shadow DOM
            document.querySelectorAll('*').forEach(el => {
                if (el.shadowRoot) {
                    el.shadowRoot.querySelectorAll(selector).forEach(shadowEl => {
                        shadowEl.style.setProperty('display', 'none', 'important');
                    });
                }
            });
        } catch (e) {
            logEvent(`Błąd reguły niestandardowej: Nieprawidłowy selektor '${selector}'.`);
        }
    }
}

/**
 * Podstawowe ukrywanie reklam na podstawie predefiniowanej listy selektorów.
 * Znajduje elementy pasujące do `MONITORED_AD_SELECTORS` i ukrywa je.
 */
function hidePrimaryAds() {
    document.querySelectorAll(MONITORED_AD_SELECTORS.join(',')).forEach(element => {
        // Czasem reklama jest wewnątrz innego kontenera, próbujemy znaleźć najbliższy wspólny element.
        const target = element.closest('div, ins, iframe, a');
        if (target && target.parentElement && target.style.display !== 'none') {
            logEvent("Wykrywanie Główne: Ukrywanie generycznego elementu reklamowego.", target, true);
            target.style.setProperty('display', 'none', 'important');
        }
    });
}

/**
 * Heurystyczne, awaryjne ukrywanie reklam ("Hunter").
 * Ta funkcja próbuje znaleźć reklamy, które nie zostały zidentyfikowane przez proste selektory.
 * Używa bardziej złożonej logiki, analizując m.in. źródła obrazków, długość linków,
 * obecność słów kluczowych i strukturę DOM.
 */
function hideFallbackAds() {
    // Parametry heurystyki
    const FALLBACK_CDN_HOST = 'v.wpimg.pl'; // Host CDN, z którego często serwowane są obrazki reklamowe.
    const TRACKING_LINK_LENGTH_THRESHOLD = 150; // Długość linku, powyżej której może być to link śledzący.
    const AD_DOMAINS = ['ads.wp.pl', 'doubleclick.net', 'gemius.pl']; // Domeny reklamowe.
    const MAX_AD_HEIGHT_PX = 450; // Maksymalna wysokość, aby nie ukryć przypadkiem dużych sekcji strony.
    const DO_NOT_HIDE_SELECTORS = ['#wp-site-main', 'main', '#page', '#app', '#root', '.article-body', '.wp-section-aside']; // Ważne kontenery, których nie należy ruszać.
    const CONTENT_TAGS = ['h2', 'h3', 'h4', 'h5', 'p', 'span']; // Tagi sugerujące, że w kontenerze jest treść, a nie tylko reklama.
    const AD_KEYWORDS = ['REKLAMA', 'SPONSOROWANY', 'PROMOCJA', 'MAT. SPONSOROWANY', 'MAT. P']; // Słowa kluczowe.

    document.querySelectorAll(`img[src*="${FALLBACK_CDN_HOST}"]`).forEach(img => {
        const link = img.closest('a');
        if (!link || !link.href) return;

        // Sprawdzenie, czy link jest długim przekierowaniem lub prowadzi bezpośrednio do domeny reklamowej.
        const isLongRedirect = link.href.startsWith('https://www.wp.pl/') && link.href.length > TRACKING_LINK_LENGTH_THRESHOLD;
        const isDirectAdDomain = AD_DOMAINS.some(domain => link.href.includes(domain));
        if (!isLongRedirect && !isDirectAdDomain) { return; }

        const container = link.parentElement;
        if (!container || container.style.display === 'none') return;
        
        // Sprawdzenia bezpieczeństwa, aby nie ukryć ważnych części strony.
        if (DO_NOT_HIDE_SELECTORS.some(selector => container.matches(selector))) { return; }
        if (container.getBoundingClientRect().height > MAX_AD_HEIGHT_PX) { return; }

        // Sprawdzenie, czy kontener zawiera tagi z treścią.
        const hasContentTags = CONTENT_TAGS.some(selector => container.querySelector(selector));
        if (hasContentTags) {
            // Jeśli są tagi treści, dodatkowo sprawdzamy, czy są też słowa kluczowe wskazujące na reklamę.
            const textContent = container.textContent.toLowerCase();
            const hasAdKeywords = AD_KEYWORDS.some(keyword => textContent.includes(keyword.toLowerCase()));
            if (hasAdKeywords) {
                logEvent(`HunterGuard: Ukrywanie kontenera ze słowami reklamowymi pomimo obecności tagów treści.`, container, true);
                container.style.setProperty('display', 'none', 'important');
            }
        } else {
            // Jeśli nie ma tagów treści, zakładamy, że to kontener tylko na reklamę.
            logEvent("Wykrywanie Awaryjne (Hunter): Ukrywanie kontenera wyłącznie z reklamą.", container, true);
            container.style.setProperty('display', 'none', 'important');
        }
    });
}

/**
 * Ukrywa kontenery-placeholdery, które często zostają puste po usunięciu reklam.
 */
function hidePlaceholders() {
    const placeholderSelector = '.wp-section-placeholder-container';
    document.querySelectorAll(placeholderSelector).forEach(element => {
        if (element.style.display !== 'none') {
            element.style.setProperty('display', 'none', 'important');
        }
    });
}

/**
 * Siatka bezpieczeństwa (SafetyNet).
 * Ta funkcja sprawdza, czy kluczowe elementy struktury strony (jak `body`, `main`)
 * nie zostały przypadkowo ukryte przez zbyt agresywną regułę. Jeśli tak, przywraca ich widoczność.
 * Jest to kluczowe dla zapobiegania "zepsuciu" strony przez bloker.
 */
function applySafetyNet() {
    const CRITICAL_SELECTORS = ['body', '#wp-site-main', 'main', '#page', '#app', '#root'];
    CRITICAL_SELECTORS.forEach(selector => {
        const element = document.querySelector(selector);
        if (element && getComputedStyle(element).display === 'none') {
            element.style.setProperty('display', 'block', 'important');
            logEvent(`!!! SafetyNet URUCHOMIONY: Krytyczny element '${selector}' był ukryty, widoczność przywrócona.`);
        }
    });
}


// --- SEKCJA GŁÓWNEJ PĘTLI I INICJALIZACJI ---

/**
 * Główna funkcja sterująca, uruchamiająca wszystkie mechanizmy blokowania.
 * Działa w pętli, aby radzić sobie z reklamami ładowanymi dynamicznie (np. po przewinięciu strony).
 */
async function runAllRoutines() {
    // Sprawdzenie ogólnego stanu blokowania i białej listy.
    const result = await chrome.storage.local.get({ [BLOCKING_STATE_KEY]: true, [WHITELIST_KEY]: [] });
    if (!result[BLOCKING_STATE_KEY]) {
        if (!window.blockingDisabledLogged) {
            logEvent("Kontroler: Blokowanie wyłączone przez użytkownika. Pomijam wszystkie zadania.");
            window.blockingDisabledLogged = true; // Loguj tę informację tylko raz.
        }
        return; 
    }
    const whitelistedDomains = result[WHITELIST_KEY];
    const currentHostname = window.location.hostname;
    if (whitelistedDomains.includes(currentHostname)) {
        if (!window.whitelistMessageLogged) { 
            logEvent(`Kontroler: Domena '${currentHostname}' jest na białej liście. Pomijam wszystkie zadania.`);
            window.whitelistMessageLogged = true; // Loguj tylko raz.
        }
        return; 
    }
    
    // Reset flag logowania, jeśli blokowanie znów jest aktywne.
    if(window.whitelistMessageLogged) {
         window.whitelistMessageLogged = false;
    }
    if (window.blockingDisabledLogged) {
        window.blockingDisabledLogged = false;
    }

    // Uruchamianie wszystkich funkcji i warstw ochrony.
    await applyCustomRules();
    await applyPropertyGuardToElements(); // Warstwa 2
    applyTrueProxyGuard();              // Warstwa 3
    hidePrimaryAds();
    hideFallbackAds();
    hidePlaceholders();
    applySafetyNet();
}

// Uruchomienie Warstwy 1 natychmiast po załadowaniu skryptu, aby była aktywna jak najwcześniej.
interceptEventHandlers();

// Opóźnione pierwsze uruchomienie głównej pętli (500ms), aby dać stronie czas na wstępne załadowanie.
setTimeout(async () => {
    const result = await chrome.storage.local.get({ [BLOCKING_STATE_KEY]: true });
    logEvent(`Init: Skrypt v28.2 (Shadow of the PIPIS) uruchomiony. Blokowanie jest ${result[BLOCKING_STATE_KEY] ? 'WŁĄCZONE' : 'WYŁĄCZONE'}.`);
    await runAllRoutines();
}, 500);

// Ustawienie interwału, który będzie cyklicznie uruchamiał `runAllRoutines`,
// aby wykrywać i blokować reklamy ładowane dynamicznie w trakcie interakcji ze stroną.
setInterval(runAllRoutines, 1500);

// Nasłuchiwanie na wiadomości od innych części rozszerzenia (np. od okna popup).
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "ACTIVATE_PICKER") {
        activatePicker();
        sendResponse({ status: "Pipis tryb aktywny, spróbuj nie rozpierdolić strony" });
        return true; // `return true` jest wymagane dla asynchronicznej odpowiedzi.
    }
});

logEvent("Init: Bezpieczny mechanizm cyklicznego sprawdzania jest teraz aktywny.");

