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
    alert('Najpierw przetwórz obraz!');
    return;
  }
  const link = document.createElement('a');
  link.download = 'processed_image.png';
  link.href = processedCanvas.toDataURL('image/png');
  link.click();
});


  // co ja robię tu, u u


  // ugułem pracuje nad tą funkcją poniżej dlatego zakomentowana jest żeby nie rozjebać absolutnie wszystkiego cnie
  //więc proszę nie tykać, bo wezmę pasek
/*
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
*/