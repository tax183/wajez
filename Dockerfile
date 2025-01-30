# استخدام Node.js كأساس
FROM node:18

WORKDIR /app

# تثبيت مكتبات Node.js أولاً
COPY package.json package-lock.json ./
RUN npm install --legacy-peer-deps

# نسخ باقي ملفات المشروع
COPY . .

# تحديث النظام وتثبيت Python 3
RUN apt-get update && apt-get install -y python3 python3-venv python3-pip

# إنشاء بيئة افتراضية
RUN python3 -m venv /app/venv
RUN /app/venv/bin/pip install --no-cache-dir -r requirements.txt

# جعل المنفذ مرنًا
EXPOSE 5000

# تشغيل التطبيق داخل البيئة الافتراضية
CMD ["sh", "-c", ". /app/venv/bin/activate && npm start"]
