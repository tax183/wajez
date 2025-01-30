from flask import Flask, request, jsonify
from flask_cors import CORS
import os
from werkzeug.utils import secure_filename
from PIL import Image, ImageEnhance
import pytesseract
import io
import fitz  # PyMuPDF for PDF processing
from openai import OpenAI
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Initialize OpenAI client
client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))

# Set Tesseract path for Windows
pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

app = Flask(__name__)
CORS(app)

# Supported file types
SUPPORTED_FILE_TYPES = {'.pdf', '.png', '.jpg', '.jpeg', '.gif', '.webp'}

def perform_ocr_on_image(image):
    try:
        if image.mode != 'L':
            image = image.convert('L')
        enhancer = ImageEnhance.Contrast(image)
        image = enhancer.enhance(2.0)
        enhancer = ImageEnhance.Sharpness(image)
        image = enhancer.enhance(2.0)
        text = pytesseract.image_to_string(image, config=r'--oem 3 --psm 6')
        return text.strip() if text.strip() else None
    except Exception as e:
        print(f"OCR Error: {str(e)}")
        return None

def process_with_llm(content):
    try:
        system_prompt = """
        You are an AI that organizes extracted text into structured tables.
        - Convert all extracted text into well-formatted markdown tables.
        - Group relevant information together.
        - Ensure column names are descriptive.
        - Avoid unnecessary explanations.
        """
        
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Format the extracted content into structured tables:\n\n{content}"}
            ],
            temperature=0.7,
            max_tokens=2000
        )
        return response.choices[0].message.content
    except Exception as e:
        print(f"LLM processing error: {str(e)}")
        return None

def process_pdf(pdf_path):
    try:
        doc = fitz.open(pdf_path)
        all_text = []
        for page_num, page in enumerate(doc, 1):
            page_text = page.get_text().strip()
            if page_text:
                all_text.append(f"Page {page_num} Text:\n{page_text}")
            
            image_list = page.get_images()
            for img_index, image in enumerate(image_list):
                try:
                    xref = image[0]
                    base_image = doc.extract_image(xref)
                    image_bytes = base_image["image"]
                    image = Image.open(io.BytesIO(image_bytes))
                    ocr_text = perform_ocr_on_image(image)
                    if ocr_text:
                        all_text.append(f"Page {page_num} Image {img_index + 1} Text:\n{ocr_text}")
                except Exception as img_error:
                    print(f"Error processing image {img_index + 1} on page {page_num}: {str(img_error)}")
        
        combined_text = "\n\n".join(all_text)
        if combined_text:
            llm_result = process_with_llm(combined_text)
            return llm_result if llm_result else "Raw extracted text:\n\n" + combined_text
        return "No text found in the PDF."
    except Exception as e:
        print(f"PDF processing error: {str(e)}")
        return f"Error processing PDF: {str(e)}"

def analyze_file(file_path):
    try:
        file_ext = os.path.splitext(file_path.lower())[1]
        if file_ext == '.pdf':
            return process_pdf(file_path)
        elif file_ext in SUPPORTED_FILE_TYPES:
            with Image.open(file_path) as image:
                if image.mode == 'RGBA':
                    image = image.convert('RGB')
                text = perform_ocr_on_image(image)
                if not text:
                    return "No text detected in the image."
                llm_result = process_with_llm(text)
                return llm_result if llm_result else "Raw extracted text:\n\n" + text
        else:
            return "Unsupported file type. Please upload a PDF or image file."
    except Exception as e:
        print(f"File analysis error: {str(e)}")
        return f"Error analyzing file: {str(e)}"

@app.route('/analyze', methods=['POST'])
def analyze():
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        os.makedirs('temp', exist_ok=True)
        filename = secure_filename(file.filename)
        temp_path = os.path.join('temp', filename)
        
        try:
            file.save(temp_path)
            result = analyze_file(temp_path)
            return jsonify({'result': result})
        except Exception as process_error:
            print(f"Processing error: {str(process_error)}")
            return jsonify({'error': str(process_error)}), 500
        finally:
            if os.path.exists(temp_path):
                os.remove(temp_path)
    except Exception as e:
        print(f"Request error: {str(e)}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    os.makedirs('temp', exist_ok=True)
    
    # تحديد منفذ مرن لتجنب تعارض المنافذ
    port = int(os.environ.get('PORT', 5000))
    app.run(debug=True, port=port, host='0.0.0.0')
