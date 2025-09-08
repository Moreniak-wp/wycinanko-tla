// js/performance-test.js

async function runPerformanceTest() {
    if (!currentImage) {
        alert('Proszę najpierw wczytać obrazek');
        return;
    }

    const iterations = 10;
    const results = {
        js: [],
        jsOptimized: [],
        wasm: []
    };

    // Test JavaScript
    for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        findObjectBoundsJS(currentImage);
        const end = performance.now();
        results.js.push(end - start);
    }

    // Test JavaScript Optimized
    for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        findObjectBoundsOptimized(currentImage);
        const end = performance.now();
        results.jsOptimized.push(end - start);
    }

    // Test WebAssembly (symulacja)
    for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        await findObjectBoundsWASM(currentImage);
        const end = performance.now();
        results.wasm.push(end - start);
    }

    displayPerformanceResults(results);
}

function displayPerformanceResults(results) {
    const avgJS = average(results.js);
    const avgJSOptimized = average(results.jsOptimized);
    const avgWASM = average(results.wasm);

    const performanceDiv = document.getElementById('performanceResults');
    performanceDiv.innerHTML = `
        <h3>Wyniki testów wydajności (10 iteracji)</h3>
        <table style="width: 100%; border-collapse: collapse;">
            <tr style="background: #ddd;">
                <th style="padding: 8px; border: 1px solid #ccc;">Metoda</th>
                <th style="padding: 8px; border: 1px solid #ccc;">Średni czas (ms)</th>
                <th style="padding: 8px; border: 1px solid #ccc;">Min (ms)</th>
                <th style="padding: 8px; border: 1px solid #ccc;">Max (ms)</th>
                <th style="padding: 8px; border: 1px solid #ccc;">Poprawa względem JS</th>
            </tr>
            <tr>
                <td style="padding: 8px; border: 1px solid #ccc;">JavaScript</td>
                <td style="padding: 8px; border: 1px solid #ccc;">${avgJS.toFixed(2)}</td>
                <td style="padding: 8px; border: 1px solid #ccc;">${Math.min(...results.js).toFixed(2)}</td>
                <td style="padding: 8px; border: 1px solid #ccc;">${Math.max(...results.js).toFixed(2)}</td>
                <td style="padding: 8px; border: 1px solid #ccc;">-</td>
            </tr>
            <tr>
                <td style="padding: 8px; border: 1px solid #ccc;">JavaScript Opt.</td>
                <td style="padding: 8px; border: 1px solid #ccc;">${avgJSOptimized.toFixed(2)}</td>
                <td style="padding: 8px; border: 1px solid #ccc;">${Math.min(...results.jsOptimized).toFixed(2)}</td>
                <td style="padding: 8px; border: 1px solid #ccc;">${Math.max(...results.jsOptimized).toFixed(2)}</td>
                <td style="padding: 8px; border: 1px solid #ccc;">${((avgJS / avgJSOptimized - 1) * 100).toFixed(1)}%</td>
            </tr>
            <tr>
                <td style="padding: 8px; border: 1px solid #ccc;">WebAssembly*</td>
                <td style="padding: 8px; border: 1px solid #ccc;">${avgWASM.toFixed(2)}</td>
                <td style="padding: 8px; border: 1px solid #ccc;">${Math.min(...results.wasm).toFixed(2)}</td>
                <td style="padding: 8px; border: 1px solid #ccc;">${Math.max(...results.wasm).toFixed(2)}</td>
                <td style="padding: 8px; border: 1px solid #ccc;">symulacja</td>
            </tr>
        </table>
        <p style="font-size: 0.9em; color: #666;">*WebAssembly w prototypie to symulacja</p>
    `;
}

function average(arr) {
    return arr.reduce((a, b) => a + b, 0) / arr.length;
}
