import uuid
from datetime import datetime, timezone

import fitz  # PyMuPDF
from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile

from ..auth import get_current_user
from ..config import settings
from ..database import db_manager
from ..gemini_service import (
    analyze_image_content,
    generate_chat_answer,
    summarize_document_text,
)
from ..rag import rag_store
from ..schemas import ChatRequest
from ..security import validate_image_magic_bytes, validate_pdf_magic_bytes

router = APIRouter(tags=["Image & Document Assistants"])

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}
ALLOWED_DOC_EXTENSIONS = (".pdf", ".txt", ".md", ".csv")


@router.post("/api/image/analyze")
async def image_analyze(
    file: UploadFile = File(...),
    prompt: str = Form("Analyze this image and provide helpful guidance."),
    language: str = Form("English"),
    profession: str = Form("Farmer"),
    current_user: dict = Depends(get_current_user),
):
    if not file.content_type or file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(status_code=400, detail="Unsupported image type. Allowed: JPG, PNG, WEBP.")

    image_bytes = await file.read()
    if len(image_bytes) == 0:
        raise HTTPException(status_code=400, detail="Uploaded image is empty.")
    if len(image_bytes) > settings.MAX_IMAGE_MB * 1024 * 1024:
        raise HTTPException(status_code=400, detail=f"Image size must be under {settings.MAX_IMAGE_MB} MB.")
    if not validate_image_magic_bytes(image_bytes, file.content_type):
        raise HTTPException(status_code=400, detail="Image file content does not match declared MIME type.")

    return analyze_image_content(
        image_bytes=image_bytes,
        mime_type=file.content_type,
        prompt=prompt,
        language=language,
        profession=profession,
    )


@router.post("/api/documents/upload")
async def upload_document(
    file: UploadFile = File(...),
    language: str = Form("English"),
    current_user: dict = Depends(get_current_user),
):
    filename = file.filename or "document.pdf"
    if not filename.lower().endswith(ALLOWED_DOC_EXTENSIONS):
        raise HTTPException(status_code=400, detail="Unsupported file type. Allowed: PDF, TXT, MD, CSV.")

    raw = await file.read()
    if len(raw) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")
    if len(raw) > settings.MAX_DOCUMENT_MB * 1024 * 1024:
        raise HTTPException(status_code=400, detail=f"Document size must be under {settings.MAX_DOCUMENT_MB} MB.")

    extracted_text = ""
    page_count = 1

    if filename.lower().endswith(".pdf"):
        if not validate_pdf_magic_bytes(raw):
            raise HTTPException(status_code=400, detail="Invalid PDF file header.")
        try:
            doc = fitz.open(stream=raw, filetype="pdf")
            page_count = len(doc)
            if page_count > settings.MAX_PDF_PAGES:
                doc.close()
                raise HTTPException(status_code=400, detail=f"PDF exceeds maximum of {settings.MAX_PDF_PAGES} pages.")
            pages_text = [page.get_text("text") for page in doc]
            extracted_text = "\n".join(pages_text).strip()
            doc.close()
        except HTTPException:
            raise
        except Exception as exc:
            raise HTTPException(status_code=400, detail=f"Could not parse PDF: {exc}")
    else:
        extracted_text = raw.decode("utf-8", errors="ignore").strip()

    if not extracted_text:
        extracted_text = "No selectable text found in this file (it may be a scanned image PDF)."

    doc_id = str(uuid.uuid4())
    chunk_size = 700
    chunks = [extracted_text[i : i + chunk_size] for i in range(0, len(extracted_text), chunk_size)] or [extracted_text]
    for idx, chunk in enumerate(chunks[:25]):
        rag_store.add_document({
            "id": f"doc-{doc_id}-{idx}",
            "doc_id": doc_id,
            "title": f"{filename} (Part {idx + 1})",
            "source": f"Uploaded Document: {filename}",
            "updated": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
            "category": "user_document",
            "text": chunk,
        })

    summary_res = summarize_document_text(filename, extracted_text, language)
    preview = extracted_text[:450] + ("..." if len(extracted_text) > 450 else "")
    doc_record = {
        "id": doc_id,
        "user_id": current_user["user_id"],
        "filename": filename,
        "pages": page_count,
        "size_kb": max(1, round(len(raw) / 1024)),
        "chunk_count": len(chunks[:25]),
        "preview": preview,
        "summary": summary_res["summary"],
        "uploaded_at": datetime.now(timezone.utc).isoformat(),
    }
    db_manager.collection("documents").insert_one(doc_record)
    doc_record.pop("_id", None)
    return doc_record


@router.get("/api/documents")
def list_documents(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: dict = Depends(get_current_user),
):
    docs = list(db_manager.collection("documents").find({"user_id": current_user["user_id"]}))
    for d in docs:
        d.pop("_id", None)
    ordered = list(reversed(docs))
    return {"documents": ordered[offset : offset + limit], "total": len(ordered)}


@router.delete("/api/documents/{doc_id}")
def delete_document(doc_id: str, current_user: dict = Depends(get_current_user)):
    deleted = db_manager.collection("documents").delete_one(
        {"id": doc_id, "user_id": current_user["user_id"]}
    )
    if not deleted:
        raise HTTPException(status_code=404, detail="Document not found")
    rag_store.remove_by_prefix(f"doc-{doc_id}-")
    return {"deleted": True, "id": doc_id}


@router.post("/api/documents/{doc_id}/ask")
def ask_document(doc_id: str, payload: ChatRequest, current_user: dict = Depends(get_current_user)):
    doc = db_manager.collection("documents").find_one(
        {"id": doc_id, "user_id": current_user["user_id"]}
    )
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found or access denied")
    return generate_chat_answer(
        query=payload.message,
        language=payload.language,
        profession=payload.profession,
        doc_id=doc_id,
    )
