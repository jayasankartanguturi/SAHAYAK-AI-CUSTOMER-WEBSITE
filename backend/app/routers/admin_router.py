import uuid
from datetime import datetime, timezone
from typing import Optional

import fitz  # PyMuPDF
from fastapi import APIRouter, Depends, File, Form, Header, HTTPException, UploadFile

from ..config import settings
from ..rag import rag_store
from ..schemas import AdminKnowledgeCreate

router = APIRouter(prefix="/api/admin/knowledge", tags=["Knowledge Administration"])


def require_admin(x_admin_key: Optional[str] = Header(default=None)):
    if not x_admin_key or x_admin_key != settings.ADMIN_API_KEY:
        raise HTTPException(status_code=403, detail="Invalid or missing X-Admin-Key")
    return True


@router.get("/sources")
def admin_list_knowledge(_: bool = Depends(require_admin)):
    items = [
        {
            "id": d["id"],
            "title": d.get("title", ""),
            "source": d.get("source", ""),
            "source_url": d.get("source_url", ""),
            "last_updated": d.get("last_updated", d.get("updated", "")),
            "professions": d.get("professions", []),
            "category": d.get("category", ""),
        }
        for d in rag_store.documents
    ]
    return {"total_indexed_chunks": len(items), "items": items}


@router.post("/documents")
def admin_add_knowledge(payload: AdminKnowledgeCreate, _: bool = Depends(require_admin)):
    doc_id = payload.id or f"admin-{str(uuid.uuid4())[:8]}"
    rag_store.remove_by_id(doc_id)
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    entry = {
        "id": doc_id,
        "title": payload.title,
        "source": payload.source,
        "source_url": payload.source_url,
        "last_updated": now,
        "professions": payload.professions,
        "category": payload.category,
        "text": payload.text,
    }
    rag_store.add_document(entry)
    return {"indexed": True, "id": doc_id, "last_updated": now}


@router.post("/upload-pdf")
async def admin_upload_pdf(
    file: UploadFile = File(...),
    source: str = Form("Official Admin Upload"),
    source_url: str = Form(""),
    profession: str = Form("General Citizen"),
    _: bool = Depends(require_admin),
):
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")
    raw = await file.read()
    pdf = fitz.open(stream=raw, filetype="pdf")
    text = "\n".join(page.get_text("text") for page in pdf).strip()
    pages = len(pdf)
    pdf.close()

    doc_id = f"adminpdf-{str(uuid.uuid4())[:8]}"
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    chunks = [text[i : i + 700] for i in range(0, len(text), 700)] or [text or "Empty PDF"]
    for idx, ch in enumerate(chunks[:30]):
        rag_store.add_document({
            "id": f"{doc_id}-{idx}",
            "title": f"{file.filename} (Part {idx + 1})",
            "source": source,
            "source_url": source_url,
            "last_updated": now,
            "professions": [profession],
            "category": "admin_pdf",
            "text": ch,
        })
    return {"indexed": True, "doc_id": doc_id, "pages": pages, "chunks": len(chunks[:30])}


@router.delete("/documents/{doc_id}")
def admin_delete_knowledge(doc_id: str, _: bool = Depends(require_admin)):
    removed = rag_store.remove_by_id(doc_id)
    if not removed:
        rag_store.remove_by_prefix(f"{doc_id}-")
    return {"deleted": True, "id": doc_id}
