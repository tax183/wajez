const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
require('dotenv').config();

const app = express();
const PORT = 3000;

// إنشاء المجلدات إذا لم تكن موجودة
const ensureDirectoryExists = (dir) => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`Created directory: ${dir}`);
    }
};

const resultsDir = path.join(__dirname, 'results');
const uploadsDir = path.join(__dirname, 'uploads');
ensureDirectoryExists(resultsDir);
ensureDirectoryExists(uploadsDir);

// تقديم الملفات الثابتة (Front-End)
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(uploadsDir));

// إعداد Multer لرفع الملفات
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadsDir),
    filename: (req, file, cb) => cb(null, file.originalname),
});

const upload = multer({
    storage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Unsupported file type. Only PDF is allowed.'));
        }
    },
});

// نقطة نهاية لرفع الملفات
app.post('/upload', upload.single('file'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded!' });
    }

    console.log(`Uploaded file: ${req.file.filename}`);

    res.status(201).json({
        message: 'File uploaded successfully!',
        fileName: req.file.filename,
    });
});

// نقطة نهاية لحذف الملفات
app.delete('/delete/:filename', (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(uploadsDir, filename);

    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        res.sendStatus(200);
    } else {
        res.sendStatus(404);
    }
});

// تشغيل `worker.js` داخل السيرفر (مؤقتًا معلق لأنه مرتبط بـ SQS)
// const workerProcess = spawn('node', ['worker.js'], { stdio: 'inherit' });

// تشغيل السيرفر
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
