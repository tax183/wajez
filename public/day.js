const fileInput = document.getElementById('fileInput');
const uploadBox = document.getElementById('uploadBox');
const fileInfo = document.getElementById('fileInfo');
const fileName = document.getElementById('fileName');
const summarizeBtn = document.getElementById('summarizeBtn');

// إنشاء أيقونات PDF والحذف
const fileIcon = document.createElement('img');
fileIcon.src = 'img/bi_filetype-pdf.png';
fileIcon.classList.add('pdf-icon');

const deleteFileBtn = document.createElement('img');
deleteFileBtn.src = 'img/delete_24dp_5F6368_FILL0_wght400_GRAD0_opsz24 2.png';
deleteFileBtn.classList.add('delete');
deleteFileBtn.style.cursor = 'pointer';

// ترتيب العناصر داخل المستطيل
fileInfo.appendChild(fileIcon);
fileInfo.appendChild(deleteFileBtn);

let fileUrl = '';

// السحب والإفلات
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
  const files = e.dataTransfer.files;

  if (files.length > 0) {
    handleFile(files[0]);
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
    await fetch(`http://localhost:3000/delete/${uploadedFileName}`, {
      method: 'DELETE',
    });

    resetUploadUI(); // إعادة ضبط الواجهة بعد الحذف
  } catch (error) {
    console.error('Error:', error);
  }
});

// دالة إعادة ضبط الواجهة بعد حذف الملف
function resetUploadUI() {
  fileInput.value = '';  
  fileInfo.classList.remove('visible'); // إزالة الـ visible
  fileInfo.classList.add('hidden'); // إضافة hidden لجعل المستطيل يختفي
  summarizeBtn.disabled = true; 
  sessionStorage.removeItem('uploadedFile');
  sessionStorage.removeItem('uploadedFileName');
}

