const API_BASE_URL = "https://wajez-api.onrender.com"; // رابط الباك-إند على Render

const pdfViewer = document.getElementById('pdfViewer');
const resultText = document.getElementById('resultText');
const newFileBtn = document.getElementById('newFileBtn');
const fileInput = document.createElement('input');
fileInput.type = 'file';
fileInput.accept = 'application/pdf';

const uploadedFileName = sessionStorage.getItem('uploadedFileName');

if (uploadedFileName) {
  pdfViewer.src = `${API_BASE_URL}/uploads/${uploadedFileName}`;

  fetch(`${API_BASE_URL}/result/${uploadedFileName}`)
    .then(response => response.json())
    .then(data => {
      resultText.textContent = data.summary || 'No summary available.';
    })
    .catch(error => {
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

    fetch(`${API_BASE_URL}/upload`, {
      method: 'POST',
      body: formData,
    })
      .then(response => response.json())
      .then(data => {
        sessionStorage.setItem('uploadedFileName', data.fileName);
        location.reload();
      })
      .catch(error => console.error('Upload Error:', error));
  }
});

