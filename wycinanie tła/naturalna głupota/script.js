  const imageInput = document.getElementById('imageInput');
  const toleranceSlider = document.getElementById('tolerance');
  const toleranceValue = document.getElementById('toleranceValue');
  const canvas = document.getElementById('Kanawa');
  const processedCanvas = document.getElementById('Konowo');
  const ctx = canvas.getContext('2d');
  const processedCtx = processedCanvas.getContext('2d');
  let currentImage = null;
// mądre rzeczy
  toleranceSlider.addEventListener('input', function() {
    toleranceValue.textContent = this.value;
  });

  // Załaduj obraz
  imageInput.addEventListener('change', function() {
    const file = this.files && this.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(evt) {
      const img = new Image();
      img.onload = function() {
        currentImage = img;
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
      };
      img.src = evt.target.result;
    };
    reader.readAsDataURL(file);
  });

  //Kolor inspektor
function colorsAreSimilar(color1, color2, tolerance) {
  const rDiff = Math.abs(color1.r - color2.r);
  const gDiff = Math.abs(color1.g - color2.g);
  const bDiff = Math.abs(color1.b - color2.b);
  return rDiff <= tolerance && gDiff <= tolerance && bDiff <= tolerance;
}

function isColumnUniform(imageData, x, width, height, tolerance) {
  if (height < 2) return false;
  
  //pierwsza kolor państwa Konowo
  const firstPixelIndex = (0 * width + x) * 4;
  const firstColor = {
    r: imageData.data[firstPixelIndex],
    g: imageData.data[firstPixelIndex + 1],
    b: imageData.data[firstPixelIndex + 2]
  };

  //pozostałe kolor państwa Konanowa
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


  // Przetwarzanie obrazu 
 document.getElementById('processBtn').addEventListener('click', function() {
  if (!currentImage) {
    alert('Zapomniałeś chyba plik wybrać');
    return;
  }

  const tolerance = parseInt(toleranceSlider.value);
  const width = currentImage.width;
  const height = currentImage.height;

  // Pobierz dane pikseli z ich dowodu osobistego
  const imageData = ctx.getImageData(0, 0, width, height);

  //sprawdź jakie kolumny oszczędzić podczas ludobójstwa
  const columnsToKeep = [];
  for (let x = 0; x < width; x++) {
    if (!isColumnUniform(imageData, x, width, height, tolerance)) {
      columnsToKeep.push(x);
    }
  }

  console.log(`Usunięto ${width - columnsToKeep.length} kolumn z ${width}`);

  if (columnsToKeep.length === 0) {
    alert('No chyba cię coś boli');
    return;
  }
  
    // Nowy obraz na żydzie
    const newWidth = columnsToKeep.length;
  processedCanvas.width = newWidth;
  processedCanvas.height = height;

  const newImageData = processedCtx.createImageData(newWidth, height);

  //masowa emigracja 
  // Kopiuj piksele z zachowanych kolumn
  for (let y = 0; y < height; y++) {
    for (let newX = 0; newX < newWidth; newX++) {
      const oldX = columnsToKeep[newX];
      
      const oldIndex = (y * width + oldX) * 4;
      const newIndex = (y * newWidth + newX) * 4;

      newImageData.data[newIndex] = imageData.data[oldIndex];         // R
      newImageData.data[newIndex + 1] = imageData.data[oldIndex + 1]; // G
      newImageData.data[newIndex + 2] = imageData.data[oldIndex + 2]; // B
      newImageData.data[newIndex + 3] = imageData.data[oldIndex + 3]; // A
    }
  }

  processedCtx.putImageData(newImageData, 0, 0);
});

  // Guzik pobierz
  document.getElementById('downloadBtn').addEventListener('click', function() {
  if (!processedCanvas.width) {
    alert('Przedwóż obraz');
    return;
  }
  const link = document.createElement('a');
  link.download = 'processed_image.png';
  link.href = processedCanvas.toDataURL('image/png');
  link.click();
});