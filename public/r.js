const pdfViewer = document.getElementById('pdfViewer');
const resultText = document.getElementById('resultText');
const fileInput = document.createElement('input');
fileInput.type = 'file';
fileInput.accept = 'application/pdf';
const newFileBtn = document.getElementById('newFileBtn');

// استرجاع الملف المرفوع
const uploadedFileName = sessionStorage.getItem('uploadedFileName');

if (uploadedFileName) {
  pdfViewer.src = `http://localhost:3000/uploads/${uploadedFileName}`;

  fetch(`http://localhost:3000/result/${uploadedFileName}`)
    .then((response) => response.json())
    .then((data) => {
      resultText.textContent = data.summary || 'No summary available.';
    })
    .catch((error) => {
      console.error('Error:', error);
    });
}

newFileBtn.addEventListener('click', () => {
  fileInput.click();
});

fileInput.addEventListener('change', (event) => {
  const file = event.target.files[0];
  if (file) {
    const formData = new FormData();
    formData.append('file', file);

    fetch('http://localhost:3000/upload', {
      method: 'POST',
      body: formData,
    })
      .then((response) => response.json())
      .then((data) => {
        sessionStorage.setItem('uploadedFileName', data.fileName);
        location.reload(); // إعادة تحميل الصفحة لعرض الملف الجديد
      })
      .catch((error) => console.error('Upload Error:', error));
  }
});
