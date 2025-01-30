const API_BASE_URL = "wajez-production.up.railway.app"; // رابط الباك-إند على Render

const fileInput = document.getElementById('fileInput');
const uploadBox = document.getElementById('uploadBox');
const fileInfo = document.getElementById('fileInfo');
const fileName = document.getElementById('fileName');
const summarizeBtn = document.getElementById('summarizeBtn');
const deleteFileBtn = document.getElementById('deleteFileBtn');

let fileUrl = '';

uploadBox.addEventListener('dragover', (e) => {
  e.preventDefault();
  uploadBox.classList.add('drag-over');
});

uploadBox.addEventListener('dragleave', () => {
  uploadBox.classList.remove('drag-over');
});

uploadBox.addEventListener('drop', (e) => {
  e.preventDefault();
  uploadBox.classList.remove('drag-over');
  if (e.dataTransfer.files.length > 0) {
    handleFile(e.dataTransfer.files[0]);
  }
});

fileInput.addEventListener('change', () => {
  if (fileInput.files.length > 0) {
    handleFile(fileInput.files[0]);
  }
});

function handleFile(file) {
  const allowedTypes = ['application/pdf'];

  if (allowedTypes.includes(file.type)) {
    fileName.textContent = file.name;
    fileInfo.classList.remove('hidden');
    fileInfo.classList.add('visible');
    summarizeBtn.disabled = false;

    fileUrl = URL.createObjectURL(file);

    sessionStorage.setItem('uploadedFile', JSON.stringify({ name: file.name, url: fileUrl }));
    sessionStorage.setItem('uploadedFileName', file.name);
  } else {
    alert('Unsupported file type. Please upload a PDF file.');
    fileInput.value = '';
  }
}

// حذف الملف عند الضغط على أيقونة الحذف
deleteFileBtn.addEventListener('click', async () => {
  const uploadedFileName = sessionStorage.getItem('uploadedFileName');

  if (!uploadedFileName) {
    resetUploadUI();
    return;
  }

  try {
    await fetch(`${API_BASE_URL}/delete/${uploadedFileName}`, {
      method: 'DELETE',
    });

    resetUploadUI(); 
  } catch (error) {
    console.error('Error:', error);
  }
});

function resetUploadUI() {
  fileInput.value = '';  
  fileInfo.classList.remove('visible'); 
  fileInfo.classList.add('hidden'); 
  summarizeBtn.disabled = true; 
  sessionStorage.removeItem('uploadedFile');
  sessionStorage.removeItem('uploadedFileName');
}

// رفع الملف عند الضغط على "Summarize"
summarizeBtn.addEventListener('click', async () => {
  const file = fileInput.files[0];
  if (!file) {
    alert('Please upload a file first!');
    return;
  }

  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await fetch(`${API_BASE_URL}/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      alert(`Error: ${error.message}`);
      return;
    }

    const result = await response.json();
    sessionStorage.setItem('uploadedFileName', result.fileName);
    window.location.href = 'r.html';
  } catch (error) {
    console.error('Error:', error);
  }
});


