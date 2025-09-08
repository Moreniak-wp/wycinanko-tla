// js/crop-algorithm-advanced.js - Zaawansowane algorytmy wykrywania tła
// Główna funkcja zaawansowanego wykrywania
function findObjectBoundsAdvanced(image, options = {}) {
    const {
        method = 'dominant',
        threshold = 30,
        margin = 5,
        minObjectSize = 100,
        cornerSampleSize = 20
    } = options;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = image.width;
    canvas.height = image.height;
    ctx.drawImage(image, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let backgroundColor;
    switch (method) {
        case 'corner':
            backgroundColor = detectBackgroundFromCorners(imageData, cornerSampleSize);
            break;
        case 'edge':
            backgroundColor = detectBackgroundFromEdges(imageData);
            break;
        case 'dominant':
        default:
            backgroundColor = detectDominantBackgroundColor(imageData);
            break;
    }
    const bounds = findObjectBoundsWithBackground(imageData, backgroundColor, threshold);
    if (bounds.width * bounds.height < minObjectSize) {
        return {
            x: 0,
            y: 0,
            width: canvas.width,
            height: canvas.height,
            error: 'Wykryty obiekt jest zbyt mały',
            detectedBackground: backgroundColor
        };
    }
    // Dodanie marginesu
    const finalBounds = {
        x: Math.max(0, bounds.x - margin),
        y: Math.max(0, bounds.y - margin),
        width: Math.min(canvas.width, bounds.width + 2 * margin),
        height: Math.min(canvas.height, bounds.height + 2 * margin),
        method: `Advanced (${method})`,
        detectedBackground: backgroundColor
    };
    // Korekta szerokości i wysokości jeśli wykraczają poza granice
    if (finalBounds.x + finalBounds.width > canvas.width) {
        finalBounds.width = canvas.width - finalBounds.x;
    }
    if (finalBounds.y + finalBounds.height > canvas.height) {
        finalBounds.height = canvas.height - finalBounds.y;
    }
    return finalBounds;
}
// Wykrywanie koloru tła na podstawie narożników
function detectBackgroundFromCorners(imageData, sampleSize = 20) {
    const { width, height, data } = imageData;
    const colors = [];   
    // Próbkowanie z każdego narożnika
    const corners = [
        { x: 0, y: 0 }, // lewy górny
        { x: width - sampleSize, y: 0 }, // prawy górny
        { x: 0, y: height - sampleSize }, // lewy dolny
        { x: width - sampleSize, y: height - sampleSize } // prawy dolny
    ];
    corners.forEach(corner => {
        for (let y = corner.y; y < corner.y + sampleSize && y < height; y++) {
            for (let x = corner.x; x < corner.x + sampleSize && x < width; x++) {
                const index = (y * width + x) * 4;
                colors.push({
                    r: data[index],
                    g: data[index + 1],
                    b: data[index + 2],
                    a: data[index + 3]
                });
            }
        }
    });
    return findMostFrequentColor(colors);
}
// Wykrywanie koloru tła na podstawie brzegów
function detectBackgroundFromEdges(imageData) {
    const { width, height, data } = imageData;
    const colors = [];   
    // Skanowanie górnego i dolnego brzegu
    for (let x = 0; x < width; x++) {
        // Górny brzeg
        let index = x * 4;
        colors.push({
            r: data[index],
            g: data[index + 1],
            b: data[index + 2],
            a: data[index + 3]
        });
        // Dolny brzeg
        index = ((height - 1) * width + x) * 4;
        colors.push({
            r: data[index],
            g: data[index + 1],
            b: data[index + 2],
            a: data[index + 3]
        });
    }
    // Skanowanie lewego i prawego brzegu
    for (let y = 1; y < height - 1; y++) {
        // Lewy brzeg
        let index = (y * width) * 4;
        colors.push({
            r: data[index],
            g: data[index + 1],
            b: data[index + 2],
            a: data[index + 3]
        });
        
        // Prawy brzeg
        index = (y * width + width - 1) * 4;
        colors.push({
            r: data[index],
            g: data[index + 1],
            b: data[index + 2],
            a: data[index + 3]
        });
    }
    
    return findMostFrequentColor(colors);
}
// Wykrywanie dominującego koloru tła (próbkowanie całego obrazu)
function detectDominantBackgroundColor(imageData) {
    const { width, height, data } = imageData;
    const colorHistogram = new Map();
    
    // Próbkowanie co 10. piksel dla wydajności
    const step = 10;
    
    for (let y = 0; y < height; y += step) {
        for (let x = 0; x < width; x += step) {
            const index = (y * width + x) * 4;
            const r = data[index];
            const g = data[index + 1];
            const b = data[index + 2];
            const a = data[index + 3];
            
            if (a > 0) {
                // Grupowanie podobnych kolorów (redukcja dokładności)
                const groupedR = Math.floor(r / 16) * 16;
                const groupedG = Math.floor(g / 16) * 16;
                const groupedB = Math.floor(b / 16) * 16;
                
                const colorKey = `${groupedR},${groupedG},${groupedB}`;
                colorHistogram.set(colorKey, (colorHistogram.get(colorKey) || 0) + 1);
            }
        }
    }
    
    // Znajdowanie najczęstszego koloru
    let maxCount = 0;
    let dominantColor = { r: 255, g: 255, b: 255, a: 255 };
    
    for (const [colorKey, count] of colorHistogram) {
        if (count > maxCount) {
            maxCount = count;
            const [r, g, b] = colorKey.split(',').map(Number);
            dominantColor = { r, g, b, a: 255 };
        }
    }
    
    return dominantColor;
}

// Znajdowanie najczęstszego koloru z tablicy kolorów
function findMostFrequentColor(colors) {
    const colorCounts = new Map();
    
    colors.forEach(color => {
        if (color.a > 0) {
            // Grupowanie podobnych kolorów
            const groupedR = Math.floor(color.r / 8) * 8;
            const groupedG = Math.floor(color.g / 8) * 8;
            const groupedB = Math.floor(color.b / 8) * 8;
            
            const colorKey = `${groupedR},${groupedG},${groupedB}`;
            colorCounts.set(colorKey, (colorCounts.get(colorKey) || 0) + 1);
        }
    });
    
    if (colorCounts.size === 0) {
        return { r: 255, g: 255, b: 255, a: 255 };
    }
    
    let maxCount = 0;
    let mostFrequent = { r: 255, g: 255, b: 255, a: 255 };
    
    for (const [colorKey, count] of colorCounts) {
        if (count > maxCount) {
            maxCount = count;
            const [r, g, b] = colorKey.split(',').map(Number);
            mostFrequent = { r, g, b, a: 255 };
        }
    }
    
    return mostFrequent;
}

// Znajdowanie granic obiektu na podstawie wykrytego koloru tła
function findObjectBoundsWithBackground(imageData, backgroundColor, threshold) {
    const { width, height, data } = imageData;
    
    let minX = width;
    let minY = height;
    let maxX = 0;
    let maxY = 0;
    
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const index = (y * width + x) * 4;
            const r = data[index];
            const g = data[index + 1];
            const b = data[index + 2];
            const alpha = data[index + 3];
            
            if (alpha > 0) {
                const colorDistance = calculateColorDistance(
                    { r, g, b },
                    backgroundColor
                );
                
                // Jeśli kolor znacznie różni się od tła, to prawdopodobnie jest częścią obiektu
                if (colorDistance > threshold) {
                    minX = Math.min(minX, x);
                    minY = Math.min(minY, y);
                    maxX = Math.max(maxX, x);
                    maxY = Math.max(maxY, y);
                }
            }
        }
    }
    
    // Sprawdzenie czy znaleziono jakikolwiek obiekt
    if (minX >= width || minY >= height) {
        return {
            x: 0,
            y: 0,
            width: width,
            height: height
        };
    }
    
    return {
        x: minX,
        y: minY,
        width: maxX - minX + 1,
        height: maxY - minY + 1
    };
}

// Obliczanie odległości między kolorami (wzór Euclidesa)
function calculateColorDistance(color1, color2) {
    const deltaR = color1.r - color2.r;
    const deltaG = color1.g - color2.g;
    const deltaB = color1.b - color2.b;
    
    return Math.sqrt(deltaR * deltaR + deltaG * deltaG + deltaB * deltaB);
}

// Algorytm wykrywania krawędzi (uproszczona wersja edge detection)
function findObjectBoundsWithEdgeDetection(image) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = image.width;
    canvas.height = image.height;
    
    ctx.drawImage(image, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const { width, height, data } = imageData;
    
    // Konwersja do skali szarości
    const grayData = new Uint8Array(width * height);
    for (let i = 0; i < data.length; i += 4) {
        const gray = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
        grayData[i / 4] = gray;
    }
    
    // Filtr Sobela dla wykrywania krawędzi
    const edges = applySobelFilter(grayData, width, height);
    
    // Znajdowanie granic na podstawie krawędzi
    const threshold = 50; // próg dla krawędzi
    let minX = width, minY = height, maxX = 0, maxY = 0;
    
    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            const edgeStrength = edges[y * width + x];
            
            if (edgeStrength > threshold) {
                minX = Math.min(minX, x);
                minY = Math.min(minY, y);
                maxX = Math.max(maxX, x);
                maxY = Math.max(maxY, y);
            }
        }
    }
    
    // Dodanie marginesu
    const margin = 10;
    return {
        x: Math.max(0, minX - margin),
        y: Math.max(0, minY - margin),
        width: Math.min(width, maxX - minX + 1 + 2 * margin),
        height: Math.min(height, maxY - minY + 1 + 2 * margin),
        method: 'Edge Detection (Sobel)'
    };
}

// Implementacja filtru Sobela
function applySobelFilter(grayData, width, height) {
    const sobelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
    const sobelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1];
    const edges = new Float32Array(width * height);
    
    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            let gx = 0, gy = 0;
            
            for (let ky = -1; ky <= 1; ky++) {
                for (let kx = -1; kx <= 1; kx++) {
                    const pixel = grayData[(y + ky) * width + (x + kx)];
                    const kernelIndex = (ky + 1) * 3 + (kx + 1);
                    
                    gx += pixel * sobelX[kernelIndex];
                    gy += pixel * sobelY[kernelIndex];
                }
            }
            
            edges[y * width + x] = Math.sqrt(gx * gx + gy * gy);
        }
    }
    
    return edges;
}

// Funkcja pomocnicza do debugowania - wizualizacja wykrytego tła
function visualizeBackgroundDetection(image, backgroundColor) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = image.width;
    canvas.height = image.height;
    
    ctx.drawImage(image, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    // Oznaczenie pikseli tła na czerwono
    for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        
        const distance = calculateColorDistance({ r, g, b }, backgroundColor);
        
        if (distance < 30) { // próg podobieństwa
            data[i] = 255;     // R
            data[i + 1] = 0;   // G
            data[i + 2] = 0;   // B
            data[i + 3] = 128; // Półprzeźroczysty
        }
    }
    
    ctx.putImageData(imageData, 0, 0);
    return canvas;
}