// js/crop-algorithm.js - Podstawowy algorytm dla białego tła

function findObjectBoundsJS(image) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = image.width;
    canvas.height = image.height;
    
    ctx.drawImage(image, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    // Próg dla wykrywania białego tła (tolerancja)
    const threshold = 240;
    
    let minX = canvas.width;
    let minY = canvas.height;
    let maxX = 0;
    let maxY = 0;
    
    // Skanowanie pikseli w poszukiwaniu nie-białych obszarów
    for (let y = 0; y < canvas.height; y++) {
        for (let x = 0; x < canvas.width; x++) {
            const index = (y * canvas.width + x) * 4;
            const r = data[index];
            const g = data[index + 1];
            const b = data[index + 2];
            const alpha = data[index + 3];
            
            // Sprawdzanie czy piksel nie jest białym tłem
            if (alpha > 0 && (r < threshold || g < threshold || b < threshold)) {
                minX = Math.min(minX, x);
                minY = Math.min(minY, y);
                maxX = Math.max(maxX, x);
                maxY = Math.max(maxY, y);
            }
        }
    }
    
    // Sprawdzenie czy znaleziono jakikolwiek obiekt
    if (minX >= canvas.width || minY >= canvas.height) {
        return {
            x: 0,
            y: 0,
            width: canvas.width,
            height: canvas.height,
            error: 'Nie znaleziono obiektu na białym tle'
        };
    }
    
    // Dodanie małego marginesu
    const margin = parseInt(document.getElementById('margin')?.value) || 5;
    minX = Math.max(0, minX - margin);
    minY = Math.max(0, minY - margin);
    maxX = Math.min(canvas.width - 1, maxX + margin);
    maxY = Math.min(canvas.height - 1, maxY + margin);
    
    return {
        x: minX,
        y: minY,
        width: maxX - minX + 1,
        height: maxY - minY + 1,
        method: 'JavaScript (białe tło)'
    };
}

// Optymalizowana wersja JS z early stopping
function findObjectBoundsOptimized(image) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = image.width;
    canvas.height = image.height;
    
    ctx.drawImage(image, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    const threshold = 240;
    let minX = canvas.width, minY = canvas.height;
    let maxX = 0, maxY = 0;
    
    // Optymalizacja: skanowanie od brzegów do środka
    // Top edge
    for (let y = 0; y < canvas.height && minY === canvas.height; y++) {
        for (let x = 0; x < canvas.width; x++) {
            const index = (y * canvas.width + x) * 4;
            if (isNotWhiteBackground(data, index, threshold)) {
                minY = y;
                break;
            }
        }
    }
    
    // Bottom edge
    for (let y = canvas.height - 1; y >= 0 && maxY === 0; y--) {
        for (let x = 0; x < canvas.width; x++) {
            const index = (y * canvas.width + x) * 4;
            if (isNotWhiteBackground(data, index, threshold)) {
                maxY = y;
                break;
            }
        }
    }
    
    // Left edge
    for (let x = 0; x < canvas.width && minX === canvas.width; x++) {
        for (let y = minY; y <= maxY; y++) {
            const index = (y * canvas.width + x) * 4;
            if (isNotWhiteBackground(data, index, threshold)) {
                minX = x;
                break;
            }
        }
    }
    
    // Right edge
    for (let x = canvas.width - 1; x >= 0 && maxX === 0; x--) {
        for (let y = minY; y <= maxY; y++) {
            const index = (y * canvas.width + x) * 4;
            if (isNotWhiteBackground(data, index, threshold)) {
                maxX = x;
                break;
            }
        }
    }
    
    const margin = parseInt(document.getElementById('margin')?.value) || 5;
    return {
        x: Math.max(0, minX - margin),
        y: Math.max(0, minY - margin),
        width: Math.min(canvas.width, maxX - minX + 1 + 2 * margin),
        height: Math.min(canvas.height, maxY - minY + 1 + 2 * margin),
        method: 'JavaScript (zoptymalizowany)'
    };
}

function isNotWhiteBackground(data, index, threshold) {
    const r = data[index];
    const g = data[index + 1];
    const b = data[index + 2];
    const alpha = data[index + 3];
    
    return alpha > 0 && (r < threshold || g < threshold || b < threshold);
}

// Funkcja dla WebAssembly (placeholder - wymaga kompilacji WASM)
async function findObjectBoundsWASM(image) {
    console.log('WASM: Symulacja działania WebAssembly...');
    
    // Symulacja opóźnienia WASM
    await new Promise(resolve => setTimeout(resolve, Math.random() * 10 + 5));
    
    // Używamy algorytmu JS jako fallback dla prototypu
    const result = findObjectBoundsOptimized(image);
    result.method = 'WebAssembly (symulacja)';
    return result;
}
