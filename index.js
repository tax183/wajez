const express = require('express');
const multer = require('multer');
const { SQSClient, SendMessageCommand } = require('@aws-sdk/client-sqs');
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

// إعداد AWS SQS
const sqsClient = new SQSClient({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY,
        secretAccessKey: process.env.AWS_SECRET_KEY,
    },
});
const queueUrl = process.env.SQS_QUEUE_URL;

// إرسال رسالة إلى SQS
const sendMessage = async (filePath, originalName) => {
    const params = {
        QueueUrl: queueUrl,
        MessageBody: JSON.stringify({ filePath, originalName }),
    };

    try {
        await sqsClient.send(new SendMessageCommand(params));
        console.log(`Message sent to SQS for file: ${originalName}`);
    } catch (error) {
        console.error(`Error sending message for file: ${originalName}`, error);
    }
};

// نقطة نهاية لرفع الملفات
app.post('/upload', upload.single('file'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded!' });
    }

    console.log(`Uploaded file: ${req.file.filename}`);
    await sendMessage(req.file.path, req.file.filename);

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

// تشغيل `worker.js` داخل السيرفر
const workerProcess = spawn('node', ['worker.js'], { stdio: 'inherit' });

workerProcess.on('exit', (code) => {
    console.log(`Worker exited with code ${code}`);
});

// تشغيل السيرفر
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

