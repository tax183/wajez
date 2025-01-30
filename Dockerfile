# استخدام Node.js كأساس لتشغيل التطبيق
FROM node:18

# تحديد مجلد العمل داخل الحاوية
WORKDIR /app

# نسخ ملفات `package.json` لتثبيت مكتبات Node.js أولًا
COPY package.json package-lock.json ./

# تثبيت مكتبات Node.js
RUN npm install --legacy-peer-deps

# نسخ باقي ملفات المشروع
COPY . .

# تحديث الحزم وتثبيت Python 3 و pip
RUN apt-get update && apt-get install -y python3 python3-venv python3-pip

# إنشاء بيئة افتراضية داخل الحاوية
RUN python3 -m venv /app/venv

# تثبيت الحزم داخل البيئة الافتراضية
RUN /app/venv/bin/pip install --no-cache-dir -r requirements.txt

# تحديد المنفذ الذي يعمل عليه التطبيق
EXPOSE 3000

# تشغيل التطبيق عند تشغيل الحاوية
CMD ["npm", "start"]
