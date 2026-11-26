import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from ..auth import get_current_user
from ..database import db_manager
from ..gemini_service import (
    generate_chat_answer,
    generate_conversation_title,
    translate_text,
)
from ..schemas import (
    ChatRequest,
    ConversationCreate,
    ConversationMessageCreate,
    ConversationRename,
    TranslateRequest,
    VoiceRequest,
)

router = APIRouter(tags=["Chat & Conversations"])


def _run_chat_turn(
    conv_id: str,
    user_id: str,
    message_text: str,
    language: str,
    profession: str,
    doc_id: Optional[str] = None,
) -> dict:
    now = datetime.now(timezone.utc).isoformat()
    conversations = db_manager.collection("conversations")
    messages_col = db_manager.collection("messages")

    existing_conv = conversations.find_one({"id": conv_id})
    if existing_conv and existing_conv.get("user_id") != user_id:
        raise HTTPException(status_code=403, detail="Access denied to this conversation")

    if not existing_conv:
        conv_title = generate_conversation_title(message_text)
        conversations.insert_one({
            "id": conv_id,
            "user_id": user_id,
            "title": conv_title,
            "archived": False,
            "profession": profession,
            "language": language,
            "created_at": now,
            "updated_at": now,
            "last_message_at": now,
        })
    else:
        conv_title = existing_conv.get("title", "General Chat")
        if conv_title in ("General Chat", "New Conversation"):
            upgraded = generate_conversation_title(message_text)
            if upgraded != "General Chat":
                conv_title = upgraded

    prior_messages = list(messages_col.find({"conversation_id": conv_id, "user_id": user_id}))

    result = generate_chat_answer(
        query=message_text.strip(),
        language=language,
        profession=profession,
        doc_id=doc_id,
        conversation_history=prior_messages,
    )

    user_msg_id = str(uuid.uuid4())
    ai_msg_id = str(uuid.uuid4())
    ai_now = datetime.now(timezone.utc).isoformat()

    messages_col.insert_one({
        "id": user_msg_id,
        "conversation_id": conv_id,
        "user_id": user_id,
        "role": "user",
        "content": message_text.strip(),
        "created_at": now,
    })
    messages_col.insert_one({
        "id": ai_msg_id,
        "conversation_id": conv_id,
        "user_id": user_id,
        "role": "assistant",
        "content": result["answer"],
        "sources": result["sources"],
        "b2b_referrals": result.get("b2b_referrals", []),
        "rag_used": result.get("rag_used", True),
        "mode": result["mode"],
        "created_at": ai_now,
    })

    conversations.update_one(
        {"id": conv_id, "user_id": user_id},
        {"$set": {"title": conv_title, "updated_at": ai_now, "last_message_at": ai_now}},
    )

    return {
        **result,
        "conversation_id": conv_id,
        "conversation_title": conv_title,
        "user_message_id": user_msg_id,
        "assistant_message_id": ai_msg_id,
    }


@router.post("/api/conversations")
def create_conversation(
    payload: ConversationCreate,
    current_user: dict = Depends(get_current_user),
):
    conv_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    conv = {
        "id": conv_id,
        "user_id": current_user["user_id"],
        "title": payload.title.strip() or "General Chat",
        "archived": False,
        "profession": payload.profession,
        "language": payload.language,
        "created_at": now,
        "updated_at": now,
        "last_message_at": now,
    }
    db_manager.collection("conversations").insert_one(conv)
    conv.pop("_id", None)
    return conv


@router.post("/api/chat")
def chat(payload: ChatRequest, current_user: dict = Depends(get_current_user)):
    conv_id = payload.conversation_id or str(uuid.uuid4())
    return _run_chat_turn(
        conv_id=conv_id,
        user_id=current_user["user_id"],
        message_text=payload.message,
        language=payload.language,
        profession=payload.profession,
        doc_id=payload.doc_id,
    )


@router.post("/api/conversations/{conv_id}/messages")
def add_conversation_message(
    conv_id: str,
    payload: ConversationMessageCreate,
    current_user: dict = Depends(get_current_user),
):
    conv = db_manager.collection("conversations").find_one(
        {"id": conv_id, "user_id": current_user["user_id"]}
    )
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return _run_chat_turn(
        conv_id=conv_id,
        user_id=current_user["user_id"],
        message_text=payload.message,
        language=payload.language,
        profession=payload.profession,
        doc_id=payload.doc_id,
    )


@router.post("/api/voice/assist")
def voice_assist(payload: VoiceRequest, current_user: dict = Depends(get_current_user)):
    return generate_chat_answer(
        query=payload.transcript.strip(),
        language=payload.language,
        profession=payload.profession,
    )


@router.post("/api/translate")
def translate_endpoint(payload: TranslateRequest, current_user: dict = Depends(get_current_user)):
    return translate_text(
        text=payload.text,
        target_language=payload.target_language,
        profession=payload.profession,
    )


@router.get("/api/conversations")
def list_conversations(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: dict = Depends(get_current_user),
):
    items = list(db_manager.collection("conversations").find({"user_id": current_user["user_id"]}))
    for i in items:
        i.pop("_id", None)
    ordered = list(reversed(items))
    return {"items": ordered[offset : offset + limit], "total": len(ordered)}


@router.get("/api/conversations/{conv_id}")
@router.get("/api/conversations/{conv_id}/messages")
def get_conversation_messages(conv_id: str, current_user: dict = Depends(get_current_user)):
    conv = db_manager.collection("conversations").find_one(
        {"id": conv_id, "user_id": current_user["user_id"]}
    )
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    conv.pop("_id", None)
    msgs = list(db_manager.collection("messages").find(
        {"conversation_id": conv_id, "user_id": current_user["user_id"]}
    ))
    for m in msgs:
        m.pop("_id", None)
    msgs.sort(key=lambda m: m.get("created_at", ""))
    return {"conversation": conv, "conversation_id": conv_id, "messages": msgs}


@router.patch("/api/conversations/{conv_id}")
def rename_conversation(
    conv_id: str,
    payload: ConversationRename,
    current_user: dict = Depends(get_current_user),
):
    updates = {"updated_at": datetime.now(timezone.utc).isoformat()}
    if payload.title is not None:
        updates["title"] = payload.title.strip()
    if payload.archived is not None:
        updates["archived"] = payload.archived

    updated = db_manager.collection("conversations").update_one(
        {"id": conv_id, "user_id": current_user["user_id"]},
        {"$set": updates},
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return {"id": conv_id, **updates}


@router.delete("/api/conversations/{conv_id}")
def delete_conversation(conv_id: str, current_user: dict = Depends(get_current_user)):
    deleted = db_manager.collection("conversations").delete_one(
        {"id": conv_id, "user_id": current_user["user_id"]}
    )
    if not deleted:
        raise HTTPException(status_code=404, detail="Conversation not found")
    db_manager.collection("messages").delete_many(
        {"conversation_id": conv_id, "user_id": current_user["user_id"]}
    )
    return {"deleted": True}
