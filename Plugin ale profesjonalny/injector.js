// injector.js - v30.2 (Shadow Injector)
// Ten skrypt ma jedno zadanie: wstrzyknąć style blokujące do głównego dokumentu
// oraz do każdego Shadow DOM, istniejącego i tworzonego w przyszłości.
// Działa błyskawicznie, eliminując "mignięcie" reklam.

const COSMETIC_FILTERS_CSS = `
    [id^="google_ads_iframe_"], [id^="div-gpt-ad-"], .adsbygoogle,
    [id*="adocean"], [id*="gemius"], [data-ad-placeholder], [data-ad-slot],
    ins.adsbygoogle, iframe[src*="googlesyndication.com"], iframe[src*="doubleclick.net"],
    div[data-google-query-id], [aria-label="Advertisement"],
    a[href*="doubleclick.net"], a[href*="ad.wp.pl"], .wp-section-placeholder-container {
        display: none !important;
        visibility: hidden !important;
    }
`;

// 1. Stwórz element <style>, który będziemy wstrzykiwać
const styleSheet = document.createElement('style');
styleSheet.textContent = COSMETIC_FILTERS_CSS;
styleSheet.id = 'wp-ad-inspector-styles';

// 2. Wstrzyknij style do głównego dokumentu <head> natychmiast
document.documentElement.appendChild(styleSheet);

// 3. Funkcja do wstrzykiwania stylów do dowolnego roota (główny dokument lub Shadow DOM)
const injectIntoRoot = (root) => {
    if (root && !root.querySelector('#wp-ad-inspector-styles')) {
        root.appendChild(styleSheet.cloneNode(true));
    }
};

// 4. Wstrzyknij do wszystkich już istniejących Shadow DOM
document.querySelectorAll('*').forEach(el => {
    if (el.shadowRoot) {
        injectIntoRoot(el.shadowRoot);
    }
});

// 5. Użyj MutationObserver, aby obserwować całą stronę i wstrzykiwać style
//    do każdego NOWO utworzonego komponentu z Shadow DOM. To jest kluczowe!
const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
            // Sprawdzamy czy dodany węzeł to element i czy ma Shadow Root
            if (node.nodeType === 1 && node.shadowRoot) {
                injectIntoRoot(node.shadowRoot);
            }
        }
    }
});

observer.observe(document.documentElement, {
    childList: true,
    subtree: true
});

console.log("WP Ad Inspector: Wstrzykiwacz Cieni (injector.js) jest aktywny.");
