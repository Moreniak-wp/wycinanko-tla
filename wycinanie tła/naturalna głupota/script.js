const imageInput = document.getElementById('imageInput');
const toleranceSlider = document.getElementById('tolerance');
const toleranceValue = document.getElementById('toleranceValue');
const canvas = document.getElementById('Kanawa');
const processedCanvas = document.getElementById('Konowo');
const marginSlider = document.getElementById('margin');
const marginValue = document.getElementById('marginValue');
const ctx = canvas.getContext('2d');
const processedCtx = processedCanvas.getContext('2d');

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

// Załaduj i DODAJ obrazy do listy
imageInput.addEventListener('change', function() {
  const newFiles = Array.from(this.files);
  if (newFiles.length === 0) return;

  const existingFileNames = new Set(loadedImages.map(item => item.name));
  const filesToAdd = newFiles.filter(file => !existingFileNames.has(file.name));

  if (filesToAdd.length < newFiles.length) {
    alert('Niektóre z wybranych plików już znajdują się na liście i zostały pominięte.');
  }
  if (filesToAdd.length === 0) {
    this.value = null; return;
  }
  
  const firstNewImageIndex = loadedImages.length;
  const fileReadPromises = filesToAdd.map(file => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const img = new Image();
        img.onload = () => resolve({ image: img, name: file.name, processed: null });
        img.src = evt.target.result;
      };
      reader.readAsDataURL(file);
    });
  });

  Promise.all(fileReadPromises).then((newImageObjects) => {
    loadedImages.push(...newImageObjects);
    updateFileList();
    displayImage(firstNewImageIndex);
  });
  this.value = null;
});

// Aktualizuj listę plików
function updateFileList() {
  const fileList = document.getElementById('fileList');
  fileList.innerHTML = '';
  fileList.style.display = loadedImages.length > 1 ? 'block' : 'none';
  
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
  
  canvas.width = item.image.width;
  canvas.height = item.image.height;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(item.image, 0, 0);
  
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

function removeImage(event, index) {
  event.stopPropagation();
  loadedImages.splice(index, 1);
  currentImageIndex = Math.max(0, Math.min(index, loadedImages.length - 1));
  
  if (loadedImages.length === 0) {
    document.getElementById('fileList').style.display = 'none';
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    processedCtx.clearRect(0, 0, processedCanvas.width, processedCanvas.height);
  } else {
    displayImage(currentImageIndex);
  }
}

function colorsAreSimilar(c1, c2, t) { return Math.abs(c1.r-c2.r)<=t && Math.abs(c1.g-c2.g)<=t && Math.abs(c1.b-c2.b)<=t; }
function isColumnUniform(d,x,w,h,t){if(h<2)return!1;const f={r:d.data[4*(0*w+x)],g:d.data[4*(0*w+x)+1],b:d.data[4*(0*w+x)+2]};for(let y=1;y<h;y++){const c={r:d.data[4*(y*w+x)],g:d.data[4*(y*w+x)+1],b:d.data[4*(y*w+x)+2]};if(!colorsAreSimilar(f,c,t))return!1}return!0}
function isRowUniform(d,y,w,h,t){if(h<=1||w<=1)return!1;const f={r:d.data[4*(y*w+0)],g:d.data[4*(y*w+0)+1],b:d.data[4*(y*w+0)+2]};for(let x=1;x<w;x++){const c={r:d.data[4*(y*w+x)],g:d.data[4*(y*w+x)+1],b:d.data[4*(y*w+x)+2]};if(!colorsAreSimilar(f,c,t))return!1}return!0}

function processImage(imageData, width, height, tolerance, doRemoveColumns, doRemoveRows) {
  const columnsToKeep = [];
  if (doRemoveColumns) {
    for (let x = 0; x < width; x++) { if (!isColumnUniform(imageData, x, width, height, tolerance)) columnsToKeep.push(x); }
  } else { for (let x = 0; x < width; x++) columnsToKeep.push(x); }

  const rowsToKeep = [];
  if (doRemoveRows) {
    for (let y = 0; y < height; y++) { if (!isRowUniform(imageData, y, width, height, tolerance)) rowsToKeep.push(y); }
  } else { for (let y = 0; y < height; y++) rowsToKeep.push(y); }

  if (columnsToKeep.length === 0 || rowsToKeep.length === 0) return null;

  const newWidth = columnsToKeep.length;
  const newHeight = rowsToKeep.length;
  
  // Tworzy nowy, niezależny obiekt ImageData
  const newImageData = new ImageData(newWidth, newHeight);

  for (let newY = 0; newY < newHeight; newY++) {
    const oldY = rowsToKeep[newY];
    for (let newX = 0; newX < newWidth; newX++) {
      const oldX = columnsToKeep[newX];
      const oldIndex = (oldY * width + oldX) * 4;
      const newIndex = (newY * newWidth + newX) * 4;
      for (let i = 0; i < 4; i++) {
        newImageData.data[newIndex + i] = imageData.data[oldIndex + i];
      }
    }
  }
  return newImageData;
}

const processSingle = (processingFunction) => {
  if (loadedImages.length === 0) {
    alert('Czy tobie się wąski sufit na łeb nie spadł? Plik daj najpierw dzbanie jeden');
    return;
  }
  const currentItem = loadedImages[currentImageIndex];
  const processedImageData = processingFunction(currentItem.image);

  if (processedImageData) {
    currentItem.processed = processedImageData;
    displayImage(currentImageIndex);
  } else {
    alert('Chyba cię pojebało, usunąłeś wszystko co się dało');
  }
};

const processBatch = async (processingFunction) => {
  if (loadedImages.length === 0) {
    alert('Czy tobie się wąski sufit na łeb nie spadł? Plik daj najpierw dzbanie jeden');
    return;
  }

  const progressContainer = document.getElementById('progressContainer');
  const progressBar = document.getElementById('progressBar');
  const progressText = document.getElementById('progressText');
  progressContainer.style.display = 'block';
  
  const total = loadedImages.length;
  for (let i = 0; i < total; i++) {
    const item = loadedImages[i];
    const processedImageData = processingFunction(item.image);
    if (processedImageData) item.processed = processedImageData;

    const progress = ((i + 1) / total) * 100;
    progressBar.style.width = `${progress}%`;
    progressText.textContent = `${i + 1}/${total}`;
    await new Promise(resolve => setTimeout(resolve, 10));
  }

  setTimeout(() => { progressContainer.style.display = 'none'; }, 1500);
  displayImage(currentImageIndex);
  alert(`Przetworzono ${total} obrazów!`);
};

// Logika dla przycisku "Przetwórz" / "Przetwórz wszystkie"
document.getElementById('processBtn').addEventListener('click', () => processSingle(getImageForScaling));
document.getElementById('processBatchBtn').addEventListener('click', () => processBatch(getImageForScaling));

// Logika dla przycisku "Przytnij brzegi"
document.getElementById('trimBtn').addEventListener('click', () => processSingle(getImageForTrimming));

// Funkcja pomocnicza, która przygotowuje dane dla szkalowania 
function getImageForScaling(image) {
  const tolerance = parseInt(toleranceSlider.value);
  const doRemoveColumns = document.getElementById('removeColumns').checked;
  const doRemoveRows = document.getElementById('removeRows').checked;
  
  if (!doRemoveColumns && !doRemoveRows) {
    alert('knyfla przynajmniej jednego kliknij no');
    return null;
  }
  
  const tempCtx = document.createElement('canvas').getContext('2d');
  tempCtx.canvas.width = image.width;
  tempCtx.canvas.height = image.height;
  tempCtx.drawImage(image, 0, 0);
  const imageData = tempCtx.getImageData(0, 0, image.width, image.height);
  
  return processImage(imageData, image.width, image.height, tolerance, doRemoveColumns, doRemoveRows);
}

function getImageForTrimming(image) {
  const tolerance = parseInt(toleranceSlider.value);
  const margin = parseInt(marginSlider.value);
  const doRemoveColumns = document.getElementById('removeColumns').checked;
  const doRemoveRows = document.getElementById('removeRows').checked;

  if (!doRemoveColumns && !doRemoveRows) {
    alert('knyfla przynajmniej jednego kliknij no');
    return null;
  }

  const tempCtx = document.createElement('canvas').getContext('2d');
  tempCtx.canvas.width = image.width;
  tempCtx.canvas.height = image.height;
  tempCtx.drawImage(image, 0, 0);
  const imageData = tempCtx.getImageData(0, 0, image.width, image.height);

  let leftBound = 0, rightBound = image.width - 1, topBound = 0, bottomBound = image.height - 1;

  if (doRemoveColumns) {
    for (let x = 0; x < image.width; x++) { if (!isColumnUniform(imageData, x, image.width, image.height, tolerance)) { leftBound = Math.max(0, x - margin); break; } leftBound = x + 1; }
    for (let x = image.width - 1; x >= 0; x--) { if (!isColumnUniform(imageData, x, image.width, image.height, tolerance)) { rightBound = Math.min(image.width - 1, x + margin); break; } rightBound = x - 1; }
  }
  if (doRemoveRows) {
    for (let y = 0; y < image.height; y++) { if (!isRowUniform(imageData, y, image.width, image.height, tolerance)) { topBound = Math.max(0, y - margin); break; } topBound = y + 1; }
    for (let y = image.height - 1; y >= 0; y--) { if (!isRowUniform(imageData, y, image.width, image.height, tolerance)) { bottomBound = Math.min(image.height - 1, y + margin); break; } bottomBound = y - 1; }
  }
  
  if (leftBound >= rightBound || topBound >= bottomBound) return null;

  const newWidth = rightBound - leftBound + 1;
  const newHeight = bottomBound - topBound + 1;

  return tempCtx.getImageData(leftBound, topBound, newWidth, newHeight);
}


document.getElementById('downloadBtn').addEventListener('click', function() {
  const currentItem = loadedImages[currentImageIndex];
  if (!currentItem || !currentItem.processed) {
    alert('Najpierw przetwórz obraz!'); return;
  }
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = currentItem.processed.width;
  tempCanvas.height = currentItem.processed.height;
  tempCanvas.getContext('2d').putImageData(currentItem.processed, 0, 0);
  
  const link = document.createElement('a');
  link.download = currentItem.name.replace(/\.[^/.]+$/, '') + '_processed.png';
  link.href = tempCanvas.toDataURL('image/png');
  link.click();
});

document.getElementById('downloadAllBtn').addEventListener('click', async function() {
  const processedItems = loadedImages.filter(item => item.processed);
  if (processedItems.length === 0) {
    alert('Najpierw przetwórz przynajmniej jeden obraz!'); return;
  }
  for (const item of processedItems) {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = item.processed.width;
    tempCanvas.height = item.processed.height;
    tempCanvas.getContext('2d').putImageData(item.processed, 0, 0);
    const link = document.createElement('a');
    link.download = item.name.replace(/\.[^/.]+$/, '') + '_processed.png';
    link.href = tempCanvas.toDataURL('image/png');
    link.click();
    await new Promise(resolve => setTimeout(resolve, 200));
  }
});

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
  } catch (err) { /* ignore */ }
});

document.addEventListener('keydown', function(e) {
  if (document.activeElement.tagName==='INPUT'||document.activeElement.tagName==='BUTTON')return;
  if (e.key==='Enter') document.getElementById('processBtn')?.click();
  else if (e.key==='ArrowLeft'&&loadedImages.length>1) displayImage(currentImageIndex>0?currentImageIndex-1:loadedImages.length-1);
  else if (e.key==='ArrowRight'&&loadedImages.length>1) displayImage(currentImageIndex<loadedImages.length-1?currentImageIndex+1:0);
});

document.querySelectorAll('.tolerance-presets button').forEach(b => {
  b.addEventListener('click', function() {
    toleranceSlider.value = this.dataset.tolerance;
    toleranceValue.textContent = this.dataset.tolerance;
  });
});
