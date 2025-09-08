const imageInput = document.getElementById('imageInput');
  const toleranceSlider = document.getElementById('tolerance');
  const toleranceValue = document.getElementById('toleranceValue');
  const canvas = document.getElementById('Kanawa');
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

  // helper: convert rgb to hex
  function rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
  }

  // detect background color by sampling pixels along the image edges
  function detectBackgroundColor() {
    if (!canvas || !ctx) return null;
    const w = canvas.width, h = canvas.height;
    if (w === 0 || h === 0) return null;
    const imgData = ctx.getImageData(0, 0, w, h);
    const data = imgData.data;
    let rSum = 0, gSum = 0, bSum = 0, count = 0;
    const step = Math.max(1, Math.floor(Math.min(w, h) / 100)); // sample ~100 points per side

    // top and bottom rows
    for (let x = 0; x < w; x += step) {
      let idxTop = (0 * w + x) * 4;
      rSum += data[idxTop]; gSum += data[idxTop + 1]; bSum += data[idxTop + 2]; count++;
      let idxBottom = ((h - 1) * w + x) * 4;
      rSum += data[idxBottom]; gSum += data[idxBottom + 1]; bSum += data[idxBottom + 2]; count++;
    }

    // left and right columns (skip corners already sampled)
    for (let y = step; y < h - step; y += step) {
      let idxLeft = (y * w + 0) * 4;
      rSum += data[idxLeft]; gSum += data[idxLeft + 1]; bSum += data[idxLeft + 2]; count++;
      let idxRight = (y * w + (w - 1)) * 4;
      rSum += data[idxRight]; gSum += data[idxRight + 1]; bSum += data[idxRight + 2]; count++;
    }

    if (count === 0) return null;
    const avgR = Math.round(rSum / count);
    const avgG = Math.round(gSum / count);
    const avgB = Math.round(bSum / count);
    const hex = rgbToHex(avgR, avgG, avgB);
    return { r: avgR, g: avgG, b: avgB, hex };
  }

  // Przetwarzanie obrazu (na razie wrzuca tylko obraz który wrzuciliśmy)
  document.getElementById('processBtn').addEventListener('click', function() {
    if (!currentImage) {
      alert('Zapomniałeś chyba plik wybrać');
      return;
    }
    // Na razie rysujemy w kanwie nasz wrzucony obrazek
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(currentImage, 0, 0);

    // wykryj kolor tła i pokaż wynik
    const bg = detectBackgroundColor();
    if (bg) {
      console.log('Detected background color:', bg);
      alert('Kolor tła: ' + bg.hex + ' (rgb: ' + bg.r + ',' + bg.g + ',' + bg.b + ')');
      // narysuj mały prostokąt z kolorem w rogu
      ctx.save();
      ctx.fillStyle = bg.hex;
      ctx.strokeStyle = '#000';
      ctx.fillRect(5, 5, 50, 30);
      ctx.strokeRect(5, 5, 50, 30);
      ctx.restore();
    } else {
      alert('Nie udało się wykryć koloru tła.');
    }
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