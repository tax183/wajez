const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// تأكد من وجود مجلد results
const resultsDir = path.join(__dirname, 'results');
if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
    console.log("Created results directory.");
}

// بدلاً من استخدام SQS، يمكن تشغيل تحليل الملفات من المجلد مباشرةً
const processLocalFiles = () => {
    console.log("Checking for new files...");

    fs.readdir('uploads', (err, files) => {
        if (err) {
            console.error('Error reading uploads directory:', err);
            return;
        }

        files.forEach(file => {
            const filePath = path.join('uploads', file);
            const resultPath = path.join(resultsDir, `${file}.txt`);

            if (fs.existsSync(resultPath)) {
                console.log(`Skipping already processed file: ${file}`);
                return;
            }

            console.log(`Processing file: ${file}`);

            exec(`python3 analyze.py "${filePath}"`, (error, stdout, stderr) => {
                if (error) {
                    console.error(`Error processing file ${file}:`, error.message);
                    return;
                }

                const analysisResult = stdout.trim();
                console.log(`Analysis result for ${file}:`, analysisResult);

                fs.writeFileSync(resultPath, analysisResult, 'utf8');
            });
        });
    });
};

// تشغيل المعالجة كل 10 ثواني
setInterval(processLocalFiles, 10000);
