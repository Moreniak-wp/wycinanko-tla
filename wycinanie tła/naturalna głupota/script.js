  const imageInput = document.getElementById('imageInput');
  const toleranceSlider = document.getElementById('tolerance');
  const toleranceValue = document.getElementById('toleranceValue');
  const canvas = document.getElementById('Kanawa');
  const processedCanvas = document.getElementById('Konowo');
  const ctx = canvas.getContext('2d');
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

  // Przetwarzanie obrazu (na razie wrzuca tylko obraz który wrzuciliśmy)
  document.getElementById('processBtn').addEventListener('click', function() {
    if (!currentImage) {
      alert('Zapomniałeś chyba plik wybrać');
      return;
    }
    // Na razie rysujemy w kanwie nasz wrzucony obrazek
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(currentImage, 0, 0);
  });

  // Guzik pobierz
  document.getElementById('downloadBtn').addEventListener('click', function() {
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = 'image.png';
    link.href = canvas.toDataURL('image/png');
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