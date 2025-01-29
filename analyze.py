import os
import sys
import base64
import mimetypes
import openai
from dotenv import load_dotenv
from PyPDF2 import PdfReader

# Load environment variables
load_dotenv()

# Set OpenAI API Key
openai.api_key = os.getenv('OPENAI_API_KEY')
if not openai.api_key:
    print("Error: OPENAI_API_KEY not found. Make sure it's set in the .env file.")
    sys.exit(1)

# Supported image types
SUPPORTED_IMAGE_TYPES = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp'
}

def split_text(text, max_tokens=3000):
    """Split text into smaller chunks to avoid token limit."""
    sentences = text.split('\n')  # تقسيم النص بناءً على الأسطر
    chunks = []
    current_chunk = []

    for sentence in sentences:
        current_chunk.append(sentence)
        if len(' '.join(current_chunk)) > max_tokens:
            chunks.append('\n'.join(current_chunk))
            current_chunk = []

    if current_chunk:
        chunks.append('\n'.join(current_chunk))

    return chunks

def analyze_file(file_path, question="What's in this file?"):
    try:
        file_ext = os.path.splitext(file_path.lower())[1]

        # Check if file is PDF
        if file_ext == '.pdf':
            reader = PdfReader(file_path)
            text = ""
            for page in reader.pages:
                text += page.extract_text().strip() + "\n"

            # تقسيم النص إلى أجزاء صغيرة
            chunks = split_text(text, max_tokens=3000)

            # إرسال كل جزء على حدة
            results = []
            for chunk in chunks:
                messages = [
                    {
                        "role": "user",
                        "content": f"PDF Content:\n\n{chunk}\n\nQuestion: {question}"
                    }
                ]
                response = openai.ChatCompletion.create(
                    model="gpt-4",  # استخدام gpt-4
                    messages=messages
                )
                results.append(response.choices[0].message['content'])

            return "\n\n".join(results)

        elif file_ext in SUPPORTED_IMAGE_TYPES:
            with open(file_path, "rb") as file:
                base64_file = base64.b64encode(file.read()).decode('utf-8')

            messages = [
                {
                    "role": "user",
                    "content": f"Image Content (Base64): {base64_file}\n\nQuestion: {question}"
                }
            ]
            response = openai.ChatCompletion.create(
                model="gpt-4",
                messages=messages
            )
            return response.choices[0].message['content']

        else:
            return f"Unsupported file type. Supported formats: PDF and images ({', '.join(SUPPORTED_IMAGE_TYPES.keys())})"

    except Exception as e:
        return f"Error: {str(e)}"

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Error: No file path provided.")
        sys.exit(1)

    file_path = sys.argv[1]
    print(analyze_file(file_path))
