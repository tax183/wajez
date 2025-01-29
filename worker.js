const AWS = require('aws-sdk');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
require('dotenv').config(); // تحميل متغيرات البيئة

// تحقق من متغيرات البيئة
if (!process.env.AWS_REGION || !process.env.AWS_ACCESS_KEY || !process.env.AWS_SECRET_KEY || !process.env.SQS_QUEUE_URL) {
    console.error("Error: Missing AWS configuration in .env file.");
    process.exit(1);
}

// إعداد AWS SQS
AWS.config.update({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY,
        secretAccessKey: process.env.AWS_SECRET_KEY,
    },
});

const sqs = new AWS.SQS();
const queueUrl = process.env.SQS_QUEUE_URL;

const resultsDir = path.join(__dirname, 'results');
if (!fs.existsSync(resultsDir)) fs.mkdirSync(resultsDir);

// قائمة لتجنب التكرار
const processedMessages = new Set();

const processMessages = async () => {
    const params = {
        QueueUrl: queueUrl,
        MaxNumberOfMessages: 1,
        WaitTimeSeconds: 10,
    };

    try {
        const response = await sqs.receiveMessage(params).promise();

        if (!response.Messages || response.Messages.length === 0) {
            console.log('No messages to process.');
            return;
        }

        for (const message of response.Messages) {
            const { filePath, originalName } = JSON.parse(message.Body);

            if (processedMessages.has(message.MessageId)) {
                console.log(`Skipping already processed file: ${originalName}`);
                continue;
            }

            console.log(`Processing file: ${originalName}`);
            processedMessages.add(message.MessageId);

            exec(`python analyze.py "${filePath}"`, (error, stdout, stderr) => {
                if (error) {
                    console.error(`Error processing file ${originalName}:`, error.message);
                    return;
                }

                const analysisResult = stdout.trim();
                console.log(`Analysis result for ${originalName}:`, analysisResult);

                const resultPath = path.join(resultsDir, `${originalName}.txt`);
                fs.writeFileSync(resultPath, analysisResult, 'utf8');

                const deleteParams = {
                    QueueUrl: queueUrl,
                    ReceiptHandle: message.ReceiptHandle,
                };

                sqs.deleteMessage(deleteParams).promise()
                    .then(() => console.log(`Message deleted for file: ${originalName}`))
                    .catch(err => console.error(`Error deleting message for file: ${originalName}`, err));
            });
        }
    } catch (error) {
        console.error('Error processing messages:', error);
    }
};

setInterval(processMessages, 5000);
