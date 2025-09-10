const imageInput = document.getElementById('imageInput');
const toleranceSlider = document.getElementById('tolerance');
const toleranceValue = document.getElementById('toleranceValue');
const canvas = document.getElementById('Kanawa');
const processedCanvas = document.getElementById('Konowo');
const marginSlider = document.getElementById('margin'); 
const marginValue = document.getElementById('marginValue'); 
const ctx = canvas.getContext('2d');
const processedCtx = processedCanvas.getContext('2d');

// Nowe zmienne dla obsługi wielu plików
let loadedImages = [];
let currentImageIndex = 0;

// mądre rzeczy
toleranceSlider.addEventListener('input', function() {
  toleranceValue.textContent = this.value;
});

//granica Polsko-Białoruska
marginSlider.addEventListener('input', function() {
  marginValue.textContent = this.value;
});

// Załaduj obrazy 
imageInput.addEventListener('change', function() {
  const files = Array.from(this.files);
  if (files.length === 0) return;
  
  loadedImages = [];
  currentImageIndex = 0;
  
  const fileList = document.getElementById('fileList');
  fileList.innerHTML = '';
  fileList.style.display = files.length > 1 ? 'block' : 'none';
  
  Promise.all(files.map((file, index) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = function(evt) {
        const img = new Image();
        img.onload = function() {
          loadedImages[index] = {
            image: img,
            name: file.name,
            processed: null
          };
          resolve();
        };
        img.src = evt.target.result;
      };
      reader.readAsDataURL(file);
    });
  })).then(() => {
    // Wszystkie obrazy załadowane
    updateFileList();
    displayImage(0);
  });
});

// Aktualizuj listę plików
function updateFileList() {
  const fileList = document.getElementById('fileList');
  fileList.innerHTML = '';
  
  loadedImages.forEach((item, index) => {
    const fileItem = document.createElement('div');
    fileItem.className = `file-item ${index === currentImageIndex ? 'active' : ''}`;
    fileItem.innerHTML = `
      <span onclick="displayImage(${index})" style="cursor: pointer; flex: 1;">${item.name}</span>
      <button onclick="removeImage(event, ${index})">×</button>
    `;
    fileList.appendChild(fileItem);
  });
}

// Wyświetl obraz o danym indeksie
function displayImage(index) {
  if (index < 0 || index >= loadedImages.length) return;
  
  currentImageIndex = index;
  const item = loadedImages[index];
  
  // Wyświetl oryginalny obraz
  canvas.width = item.image.width;
  canvas.height = item.image.height;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(item.image, 0, 0);
  
  // Wyświetl przetworzony obraz jeśli istnieje
  if (item.processed) {
    processedCanvas.width = item.processed.width;
    processedCanvas.height = item.processed.height;
    processedCtx.clearRect(0, 0, processedCanvas.width, processedCanvas.height);
    processedCtx.putImageData(item.processed, 0, 0);
  } else {
    processedCtx.clearRect(0, 0, processedCanvas.width, processedCanvas.height);
  }
  
  updateFileList();
}

// Usuń obraz z listy
function removeImage(event, index) {
  event.stopPropagation(); 
  loadedImages.splice(index, 1);
  if (currentImageIndex >= loadedImages.length) {
    currentImageIndex = Math.max(0, loadedImages.length - 1);
  }
  
  if (loadedImages.length === 0) {
    document.getElementById('fileList').style.display = 'none';
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    processedCtx.clearRect(0, 0, processedCanvas.width, processedCanvas.height);
  } else {
    displayImage(currentImageIndex);
  }
}

//Kolor inspektor
function colorsAreSimilar(color1, color2, tolerance) {
  const rDiff = Math.abs(color1.r - color2.r);
  const gDiff = Math.abs(color1.g - color2.g);
  const bDiff = Math.abs(color1.b - color2.b);
  return rDiff <= tolerance && gDiff <= tolerance && bDiff <= tolerance;
}

function isColumnUniform(imageData, x, width, height, tolerance) {
  if (height < 2) return false;
  
  const firstPixelIndex = (0 * width + x) * 4;
  const firstColor = {
    r: imageData.data[firstPixelIndex],
    g: imageData.data[firstPixelIndex + 1],
    b: imageData.data[firstPixelIndex + 2]
  };

  for (let y = 1; y < height; y++) {
    const pixelIndex = (y * width + x) * 4;
    const currentColor = {
      r: imageData.data[pixelIndex],
      g: imageData.data[pixelIndex + 1],
      b: imageData.data[pixelIndex + 2]
    };

    if (!colorsAreSimilar(firstColor, currentColor, tolerance)) {
      return false;
    }
  }
  return true;
}

function isRowUniform(imageData, y, width, height, tolerance) {
  if (height == 1) return false;
  if (width < 2) return false;

  const firstPixelIndex = (y * width + 0) * 4;
  const firstColor = {
    r: imageData.data[firstPixelIndex],
    g: imageData.data[firstPixelIndex + 1],
    b: imageData.data[firstPixelIndex + 2]
  };

  for (let x = 1; x < width; x++) {
    const pixelIndex = (y * width + x) * 4;
    const currentColor = {
      r: imageData.data[pixelIndex],
      g: imageData.data[pixelIndex + 1],
      b: imageData.data[pixelIndex + 2]
    };

    if (!colorsAreSimilar(firstColor, currentColor, tolerance)) {
      return false;
    }
  }
  return true;
}

// Funkcja przetwarzania obrazu 
function processImage(imageData, width, height, tolerance, margin, doRemoveColumns, doRemoveRows) {
  const columnsToKeep = [];
  if (doRemoveColumns) {
    for (let x = 0; x < width; x++) {
      if (!isColumnUniform(imageData, x, width, height, tolerance)) {
        columnsToKeep.push(x);
      }
    }
  } else {
    for (let x = 0; x < width; x++) columnsToKeep.push(x);
  }

  const rowsToKeep = [];
  if (doRemoveRows) {
    for (let y = 0; y < height; y++) {
      if (!isRowUniform(imageData, y, width, height, tolerance)) {
        rowsToKeep.push(y);
      }
    }
  } else {
    for (let y = 0; y < height; y++) rowsToKeep.push(y);
  }

  if (columnsToKeep.length === 0 || rowsToKeep.length === 0) {
    return null;
  }

  const newWidth = columnsToKeep.length;
  const newHeight = rowsToKeep.length;
  
  const tempCanvas = document.createElement('canvas');
  const tempCtx = tempCanvas.getContext('2d');
  tempCanvas.width = newWidth;
  tempCanvas.height = newHeight;
  
  const newImageData = tempCtx.createImageData(newWidth, newHeight);

  for (let newY = 0; newY < newHeight; newY++) {
    const oldY = rowsToKeep[newY];
    for (let newX = 0; newX < newWidth; newX++) {
      const oldX = columnsToKeep[newX];
      
      const oldIndex = (oldY * width + oldX) * 4;
      const newIndex = (newY * newWidth + newX) * 4;

      newImageData.data[newIndex] = imageData.data[oldIndex];
      newImageData.data[newIndex + 1] = imageData.data[oldIndex + 1];
      newImageData.data[newIndex + 2] = imageData.data[oldIndex + 2];
      newImageData.data[newIndex + 3] = imageData.data[oldIndex + 3];
    }
  }

  return newImageData;
}

// Przetwarzanie pojedynczego obrazu 
document.getElementById('processBtn').addEventListener('click', function() {
  if (loadedImages.length === 0) {
    alert('Czy tobie się wąski sufit na łeb nie spadł? Plik daj najpierw dzbanie jeden');
    return;
  }

  const tolerance = parseInt(toleranceSlider.value);
  const margin = parseInt(marginSlider.value);
  const currentItem = loadedImages[currentImageIndex];
  const width = currentItem.image.width;
  const height = currentItem.image.height;

  const tempCanvas = document.createElement('canvas');
  const tempCtx = tempCanvas.getContext('2d');
  tempCanvas.width = width;
  tempCanvas.height = height;
  tempCtx.drawImage(currentItem.image, 0, 0);
  const imageData = tempCtx.getImageData(0, 0, width, height);

  const doRemoveColumns = document.getElementById('removeColumns').checked;
  const doRemoveRows = document.getElementById('removeRows').checked;

  if (!doRemoveColumns && !doRemoveRows) {
    alert('knyfla przynajmniej jednego kliknij no');
    return;
  }

  const processedImageData = processImage(imageData, width, height, tolerance, margin, doRemoveColumns, doRemoveRows);
  
  if (!processedImageData) {
    alert('Chyba cię pojebało, usunąłeś wszystko co się dało');
    return;
  }

  currentItem.processed = processedImageData;
  
  processedCanvas.width = processedImageData.width;
  processedCanvas.height = processedImageData.height;
  processedCtx.putImageData(processedImageData, 0, 0);
});

// Przetwarzanie wsadowe wszystkich obrazów
document.getElementById('processBatchBtn').addEventListener('click', async function() {
  if (loadedImages.length === 0) {
    alert('Czy tobie się wąski sufit na łeb nie spadł? Plik daj najpierw dzbanie jeden');
    return;
  }

  const tolerance = parseInt(toleranceSlider.value);
  const margin = parseInt(marginSlider.value);
  const doRemoveColumns = document.getElementById('removeColumns').checked;
  const doRemoveRows = document.getElementById('removeRows').checked;

  if (!doRemoveColumns && !doRemoveRows) {
    alert('knyfla przynajmniej jednego kliknij no');
    return;
  }

  const progressContainer = document.getElementById('progressContainer');
  const progressBar = document.getElementById('progressBar');
  const progressText = document.getElementById('progressText');
  progressContainer.style.display = 'block';
  
  let processedCount = 0;
  const total = loadedImages.length;

  for (let i = 0; i < loadedImages.length; i++) {
    const item = loadedImages[i];
    const width = item.image.width;
    const height = item.image.height;

    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    tempCanvas.width = width;
    tempCanvas.height = height;
    tempCtx.drawImage(item.image, 0, 0);
    const imageData = tempCtx.getImageData(0, 0, width, height);

    const processedImageData = processImage(imageData, width, height, tolerance, margin, doRemoveColumns, doRemoveRows);
    
    if (processedImageData) {
      item.processed = processedImageData;
    }

    processedCount++;
    const progress = (processedCount / total) * 100;
    progressBar.style.width = `${progress}%`;
    progressText.textContent = `${processedCount}/${total}`;

    await new Promise(resolve => setTimeout(resolve, 10));
  }

  setTimeout(() => {
    progressContainer.style.display = 'none';
  }, 1500);

  displayImage(currentImageIndex);
  
  alert(`Przetworzono ${processedCount} obrazów!`);
});

// Pobierz pojedynczy obraz
document.getElementById('downloadBtn').addEventListener('click', function() {
  if (loadedImages.length === 0 || !loadedImages[currentImageIndex].processed) {
    alert('Najpierw przetwórz obraz!');
    return;
  }
  
  const currentItem = loadedImages[currentImageIndex];
  const tempCanvas = document.createElement('canvas');
  const tempCtx = tempCanvas.getContext('2d');
  tempCanvas.width = currentItem.processed.width;
  tempCanvas.height = currentItem.processed.height;
  tempCtx.putImageData(currentItem.processed, 0, 0);
  
  const link = document.createElement('a');
  const fileName = currentItem.name.replace(/\.[^/.]+$/, '') + '_processed.png';
  link.download = fileName;
  link.href = tempCanvas.toDataURL('image/png');
  link.click();
});

// Pobierz wszystkie przetworzone obrazy
document.getElementById('downloadAllBtn').addEventListener('click', async function() {
  const processedItems = loadedImages.filter(item => item.processed);
  
  if (processedItems.length === 0) {
    alert('Najpierw przetwórz przynajmniej jeden obraz!');
    return;
  }

  for (let i = 0; i < processedItems.length; i++) {
    const item = processedItems[i];
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    tempCanvas.width = item.processed.width;
    tempCanvas.height = item.processed.height;
    tempCtx.putImageData(item.processed, 0, 0);
    
    const link = document.createElement('a');
    const fileName = item.name.replace(/\.[^/.]+$/, '') + '_processed.png';
    link.download = fileName;
    link.href = tempCanvas.toDataURL('image/png');
    link.click();
    
    await new Promise(resolve => setTimeout(resolve, 200));
  }
});

// Sample color
canvas.addEventListener('click', function(e) {
  if (!canvas.width || !canvas.height) return;
  const rect = canvas.getBoundingClientRect();
  const x = Math.floor((e.clientX - rect.left) * (canvas.width / rect.width));
  const y = Math.floor((e.clientY - rect.top) * (canvas.height / rect.height));
  try {
    const px = ctx.getImageData(x, y, 1, 1).data;
    const hex = '#' + ([px[0], px[1], px[2]]).map(v => v.toString(16).padStart(2, '0')).join('');
    const box = document.getElementById('sampleColorBox');
    if (box) {
      box.style.background = hex;
      box.textContent = `${hex} rgba(${px[0]},${px[1]},${px[2]},${(px[3]/255).toFixed(2)})`;
    }
  } catch (err) {
    // wypadł poza świat
  }
});

// Skróty klawiszowe
document.addEventListener('keydown', function(e) {
  if (e.key === 'Enter') {
    document.getElementById('processBtn')?.click();
  } else if (e.key === 'ArrowLeft' && loadedImages.length > 1) {
    const newIndex = currentImageIndex > 0 ? currentImageIndex - 1 : loadedImages.length - 1;
    displayImage(newIndex);
  } else if (e.key === 'ArrowRight' && loadedImages.length > 1) {
    const newIndex = currentImageIndex < loadedImages.length - 1 ? currentImageIndex + 1 : 0;
    displayImage(newIndex);
  }
});

// Przycinanie brzegów 
document.getElementById('trimBtn').addEventListener('click', function() {
  if (loadedImages.length === 0) {
    alert('Czy tobie się wąski sufit na łeb nie spadł? Plik daj najpierw dzbanie jeden');
    return;
  }

  const tolerance = parseInt(toleranceSlider.value);
  const margin = parseInt(marginSlider.value);
  const currentItem = loadedImages[currentImageIndex];
  const width = currentItem.image.width;
  const height = currentItem.image.height;

  const tempCanvas = document.createElement('canvas');
  const tempCtx = tempCanvas.getContext('2d');
  tempCanvas.width = width;
  tempCanvas.height = height;
  tempCtx.drawImage(currentItem.image, 0, 0);
  const imageData = tempCtx.getImageData(0, 0, width, height);

  const doRemoveColumns = document.getElementById('removeColumns').checked;
  const doRemoveRows = document.getElementById('removeRows').checked;

  if (!doRemoveColumns && !doRemoveRows) {
    alert('knyfla przynajmniej jednego kliknij no');
    return;
  }

  let leftBound = 0;
  if (doRemoveColumns) {
    for (let x = 0; x < width; x++) {
      if (!isColumnUniform(imageData, x, width, height, tolerance)) {
        leftBound = Math.max(0, x - margin);
        break;
      }
      leftBound = x + 1;
    }
  }

  let rightBound = width - 1;
  if (doRemoveColumns) {
    for (let x = width - 1; x >= 0; x--) {
      if (!isColumnUniform(imageData, x, width, height, tolerance)) {
        rightBound = Math.min(width - 1, x + margin);
        break;
      }
      rightBound = x - 1;
    }
  }

  let topBound = 0;
  if (doRemoveRows) {
    for (let y = 0; y < height; y++) {
      if (!isRowUniform(imageData, y, width, height, tolerance)) {
        topBound = Math.max(0, y - margin);
        break;
      }
      topBound = y + 1;
    }
  }

  let bottomBound = height - 1;
  if (doRemoveRows) {
    for (let y = height - 1; y >= 0; y--) {
      if (!isRowUniform(imageData, y, width, height, tolerance)) {
        bottomBound = Math.min(height - 1, y + margin);
        break;
      }
      bottomBound = y - 1;
    }
  }

  if (leftBound >= rightBound || topBound >= bottomBound) {
    alert('Chyba cię pojebało, usunąłeś wszystko co się dało');
    return;
  }

  const newWidth = rightBound - leftBound + 1;
  const newHeight = bottomBound - topBound + 1;

  const newImageData = processedCtx.createImageData(newWidth, newHeight);

  for (let newY = 0; newY < newHeight; newY++) {
    const oldY = topBound + newY;
    for (let newX = 0; newX < newWidth; newX++) {
      const oldX = leftBound + newX;
      
      const oldIndex = (oldY * width + oldX) * 4;
      const newIndex = (newY * newWidth + newX) * 4;

      newImageData.data[newIndex] = imageData.data[oldIndex];
      newImageData.data[newIndex + 1] = imageData.data[oldIndex + 1];
      newImageData.data[newIndex + 2] = imageData.data[oldIndex + 2];
      newImageData.data[newIndex + 3] = imageData.data[oldIndex + 3];
    }
  }

  currentItem.processed = newImageData;
  
  processedCanvas.width = newImageData.width;
  processedCanvas.height = newImageData.height;
  processedCtx.putImageData(newImageData, 0, 0);
});

// Presety tolerancji
document.querySelectorAll('.tolerance-presets button').forEach(button => {
  button.addEventListener('click', function() {
    const presetTolerance = this.dataset.tolerance;
    toleranceSlider.value = presetTolerance;
    toleranceValue.textContent = presetTolerance;
  });
});
