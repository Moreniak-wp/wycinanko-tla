   const imageInput = document.getElementById('imageInput');
  const toleranceSlider = document.getElementById('tolerance');
  const toleranceValue = document.getElementById('toleranceValue');
  const canvas = document.getElementById('Kanawa');
  const processedCanvas = DocumentFragment.getElementById('Konowo');
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