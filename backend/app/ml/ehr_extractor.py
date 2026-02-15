"""
EHR Document NLP Extraction.

Extracts structured medical information from uploaded PDF documents:
- Raw text (PDF text extraction or OCR for scanned)
- Medication lists
- Diagnosis keywords
- Allergy information
- Clinical keywords
"""
from __future__ import annotations

import re
import io
from pathlib import Path
from typing import Optional

try:
    from PyPDF2 import PdfReader
except ImportError:
    PdfReader = None

try:
    from PIL import Image
    import pytesseract
except ImportError:
    Image = None
    pytesseract = None


# ── Medical term patterns for extraction ─────────────────────────
MEDICATION_PATTERNS = [
    r"\b(aspirin|metformin|lisinopril|atorvastatin|amlodipine|metoprolol)\b",
    r"\b(omeprazole|losartan|albuterol|gabapentin|hydrochlorothiazide)\b",
    r"\b(sertraline|amoxicillin|azithromycin|ciprofloxacin|prednisone)\b",
    r"\b(warfarin|heparin|enoxaparin|clopidogrel|insulin|levothyroxine)\b",
    r"\b(ibuprofen|acetaminophen|morphine|fentanyl|tramadol|oxycodone)\b",
    r"\b(furosemide|spironolactone|digoxin|nitroglycerin|diltiazem)\b",
    r"\b(pantoprazole|esomeprazole|dexamethasone|hydrocortisone)\b",
    r"\b(vancomycin|meropenem|piperacillin|ceftriaxone|doxycycline)\b",
]

DIAGNOSIS_PATTERNS = [
    r"\b(hypertension|diabetes|mellitus|COPD|asthma|pneumonia)\b",
    r"\b(heart\s*failure|coronary\s*artery\s*disease|atrial\s*fibrillation)\b",
    r"\b(stroke|myocardial\s*infarction|pulmonary\s*embolism)\b",
    r"\b(sepsis|cellulitis|UTI|urinary\s*tract\s*infection)\b",
    r"\b(chronic\s*kidney\s*disease|cirrhosis|hepatitis|pancreatitis)\b",
    r"\b(epilepsy|seizure\s*disorder|migraine|Parkinson)\b",
    r"\b(fracture|laceration|concussion|hemorrhage|anemia)\b",
    r"\b(appendicitis|cholecystitis|diverticulitis|bowel\s*obstruction)\b",
    r"\b(cancer|carcinoma|tumor|malignancy|lymphoma|leukemia)\b",
]

ALLERGY_PATTERNS = [
    r"(?:allerg(?:y|ies|ic)\s*(?:to)?:?\s*)([^\n.;]+)",
    r"(?:NKDA|no\s*known\s*(?:drug\s*)?allergies)",
    r"(?:adverse\s*reaction\s*to:?\s*)([^\n.;]+)",
]

_compiled_meds = [re.compile(p, re.IGNORECASE) for p in MEDICATION_PATTERNS]
_compiled_diag = [re.compile(p, re.IGNORECASE) for p in DIAGNOSIS_PATTERNS]
_compiled_allergy = [re.compile(p, re.IGNORECASE) for p in ALLERGY_PATTERNS]


def extract_text_from_pdf(file_bytes: bytes) -> str:
    """Extract text from a PDF file (text-based)."""
    if PdfReader is None:
        raise ImportError("PyPDF2 is required: pip install PyPDF2")

    reader = PdfReader(io.BytesIO(file_bytes))
    text_parts = []
    for page in reader.pages:
        page_text = page.extract_text()
        if page_text:
            text_parts.append(page_text)
    return "\n".join(text_parts)


def extract_text_ocr(file_bytes: bytes) -> str:
    """Extract text from a scanned/image PDF using OCR."""
    if Image is None or pytesseract is None:
        raise ImportError("Pillow and pytesseract are required for OCR")

    try:
        # Try to open as image directly
        img = Image.open(io.BytesIO(file_bytes))
        return pytesseract.image_to_string(img)
    except Exception:
        # For multi-page PDFs, would need pdf2image (optional dependency)
        return ""


def extract_text(file_bytes: bytes) -> str:
    """Extract text from PDF, falling back to OCR if text extraction yields little."""
    text = extract_text_from_pdf(file_bytes)
    # If very little text extracted, likely a scanned document → try OCR
    if len(text.strip()) < 50:
        ocr_text = extract_text_ocr(file_bytes)
        if ocr_text:
            text = ocr_text
    return text


def extract_medications(text: str) -> list[str]:
    """Find medication names in text."""
    meds = set()
    for pattern in _compiled_meds:
        for match in pattern.finditer(text):
            meds.add(match.group(0).lower())
    return sorted(meds)


def extract_diagnoses(text: str) -> list[str]:
    """Find diagnosis keywords in text."""
    diags = set()
    for pattern in _compiled_diag:
        for match in pattern.finditer(text):
            diags.add(match.group(0).lower())
    return sorted(diags)


def extract_allergies(text: str) -> list[str]:
    """Find allergy information in text."""
    allergies = set()
    for pattern in _compiled_allergy:
        for match in pattern.finditer(text):
            allergy_text = match.group(0).strip()
            allergies.add(allergy_text.lower())
    return sorted(allergies)


def extract_clinical_keywords(text: str) -> list[str]:
    """Extract all clinically relevant keywords from text."""
    keywords = set()
    keywords.update(extract_medications(text))
    keywords.update(extract_diagnoses(text))

    # Additional clinical terms
    additional = re.findall(
        r"\b(?:acute|chronic|severe|moderate|mild|bilateral|unilateral|"
        r"elevated|decreased|abnormal|positive|negative|history of)\b",
        text, re.IGNORECASE
    )
    keywords.update(w.lower() for w in additional)

    return sorted(keywords)


def process_ehr(file_bytes: bytes) -> dict:
    """
    Full EHR processing pipeline.

    Returns dict with keys: raw_text, medications, diagnoses, allergies, keywords
    """
    raw_text = extract_text(file_bytes)
    return {
        "raw_text": raw_text,
        "medications": extract_medications(raw_text),
        "diagnoses": extract_diagnoses(raw_text),
        "allergies": extract_allergies(raw_text),
        "keywords": extract_clinical_keywords(raw_text),
    }
