const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// إنشاء المجلدات إذا لم تكن موجودة
const ensureDirectoryExists = (dir) => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`✅ Created directory: ${dir}`);
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
            cb(new Error('❌ Unsupported file type. Only PDF is allowed.'));
        }
    },
});

// نقطة نهاية لرفع الملفات
app.post('/upload', upload.single('file'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: '❌ No file uploaded!' });
    }

    console.log(`📂 Uploaded file: ${req.file.filename}`);

    res.status(201).json({
        message: '✅ File uploaded successfully!',
        fileName: req.file.filename,
    });
});

// نقطة نهاية لحذف الملفات
app.delete('/delete/:filename', (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(uploadsDir, filename);

    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`🗑 Deleted file: ${filename}`);
        res.sendStatus(200);
    } else {
        res.sendStatus(404);
    }
});

// ⚡ تحسين معالجة الملفات بدون SQS
const processLocalFiles = () => {
    console.log("🔄 Checking for new files...");

    fs.readdir(uploadsDir, async (err, files) => {
        if (err) {
            console.error('❌ Error reading uploads directory:', err);
            return;
        }

        for (const file of files) {
            const filePath = path.join(uploadsDir, file);
            const resultPath = path.join(resultsDir, `${file}.txt`);

            if (fs.existsSync(resultPath)) {
                console.log(`⚠️ Skipping already processed file: ${file}`);
                continue;
            }

            console.log(`📑 Processing file: ${file}`);

            try {
                const analysisResult = await runPythonScript(filePath);
                if (analysisResult) {
                    fs.writeFileSync(resultPath, analysisResult, 'utf8');
                    console.log(`✅ Saved result for ${file}`);
                }
            } catch (error) {
                console.error(`❌ Error processing file ${file}:`, error);
            }
        }
    });
};

// تشغيل المعالجة كل 10 ثواني (إذا لم يكن هناك عملية أخرى قيد التشغيل)
let isProcessing = false;

setInterval(() => {
    if (!isProcessing) {
        isProcessing = true;
        processLocalFiles().finally(() => {
            isProcessing = false;
        });
    }
}, 10000);

// تشغيل `worker.js` داخل السيرفر (معطل مؤقتًا لتجنب تعليق التطبيق)
// const workerProcess = spawn('node', ['worker.js'], { stdio: 'inherit' });

// تشغيل السيرفر
app.listen(PORT, () => {
    console.log(`🚀 Server is running on http://localhost:${PORT}`);
});

// 🔹 تحسين تشغيل `analyze.py` بدون `exec`
const runPythonScript = (filePath) => {
    return new Promise((resolve, reject) => {
        exec(`python3 analyze.py "${filePath}"`, (error, stdout, stderr) => {
            if (error) {
                console.error(`❌ Python script error:`, error.message);
                reject(error.message);
            } else if (stderr) {
                console.warn(`⚠️ Python script warning:`, stderr);
                resolve(stderr.trim());
            } else {
                resolve(stdout.trim());
            }
        });
    });
};
