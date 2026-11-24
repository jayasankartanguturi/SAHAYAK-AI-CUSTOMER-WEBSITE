import logging
import re
from datetime import datetime, timedelta, timezone
from typing import Optional
from .config import settings
from .rag import rag_store

logger = logging.getLogger(__name__)

IST = timezone(timedelta(hours=5, minutes=30))
_TIME_DATE_PATTERN = re.compile(
    r"(what('s|\s+is|\s+the)?\s+(current\s+)?(time|date|day)|whats\s+the\s+time|time\s+now|today'?s?\s+date)",
    re.IGNORECASE,
)

_GREETING_PATTERNS = re.compile(
    r"^(hi+|hello+|hey+|hii+|namaste|namaskaram|good\s*(morning|afternoon|evening|night)|"
    r"how\s*are\s*you|what\s*are\s*you\s*doing|howdy|sup|నమస్కారం|హలో|హాయ్|नमस्ते|हैलो)[!?. ]*$",
    re.IGNORECASE,
)
_THANKS_PATTERNS = re.compile(
    r"^(thanks?|thank\s*you|thx|ok\s*thanks?|dhanyavaad|ధన్యవాదాలు|धन्यवाद)[!?. ]*$",
    re.IGNORECASE,
)
_INTRO_PATTERNS = re.compile(
    r"^(who\s*are\s*you|what\s*can\s*you\s*do|help\s*me|introduce\s*yourself)[!?. ]*$",
    re.IGNORECASE,
)
_FOLLOWUP_PATTERNS = re.compile(
    r"^(yes|ok|okay|sure|tell\s*me\s*more|more\s*details|continue|next\s*step|explain\s*more)[!?. ]*$",
    re.IGNORECASE,
)


def classify_intent(text: str) -> str:
    cleaned = text.strip()
    if _GREETING_PATTERNS.match(cleaned):
        return "greeting"
    if _THANKS_PATTERNS.match(cleaned):
        return "thanks"
    if _INTRO_PATTERNS.match(cleaned):
        return "intro"
    if _FOLLOWUP_PATTERNS.match(cleaned):
        return "followup"
    return "factual"


def generate_conversation_title(text: str) -> str:
    """Generates a clean, meaningful conversation title from the first user message."""
    intent = classify_intent(text)
    if intent in ("greeting", "thanks", "intro"):
        return "General Chat"

    cleaned = text.strip()
    cleaned = re.sub(
        r"^(please\s+)?(explain|tell\s+me\s+about|what\s+is|what\s+are|how\s+do\s+i|how\s+to|give\s+me|check)\s+",
        "",
        cleaned,
        flags=re.IGNORECASE,
    )
    cleaned = re.sub(r"[?!.]+$", "", cleaned).strip()
    if not cleaned:
        return "General Chat"

    words = cleaned.split()
    short = " ".join(words[:6])
    if len(short) > 48:
        short = short[:45].rstrip() + "..."
    # Capitalize nicely for ASCII titles
    if re.match(r"^[a-zA-Z]", short):
        short = short[0].upper() + short[1:]
    return short


_B2B_DIRECTORY = {
    "Farmer": [
        {"name": "e-NAM (B2B Mandi Trading)", "desc": "Direct farm-to-buyer wholesale agricultural market", "url": "https://enam.gov.in"},
        {"name": "IFFCO eBazar (Agri Inputs)", "desc": "Seeds, fertilizers & agri-inputs supplier portal", "url": "https://www.iffcobazar.in"},
        {"name": "FPO / GeM Agri Portal", "desc": "Connect Farmer Producer Organizations to institutional buyers", "url": "https://gem.gov.in"},
    ],
    "Fisherman": [
        {"name": "MPEDA (Seafood B2B & Export)", "desc": "Marine products export & buyer-seller directory", "url": "https://mpeda.gov.in"},
        {"name": "NFDB Fisheries Portal", "desc": "Cold-chain, ice plants & aquaculture B2B support", "url": "https://nfdb.gov.in"},
    ],
    "Business Owner": [
        {"name": "GeM (Government e-Marketplace)", "desc": "Sell goods & services directly to government & B2B buyers", "url": "https://gem.gov.in"},
        {"name": "ONDC Network", "desc": "Open B2B & B2C digital commerce onboarding", "url": "https://ondc.org"},
        {"name": "MSME Mart / Udyam", "desc": "B2B tender alerts, raw material & MSME support", "url": "https://udyamregistration.gov.in"},
    ],
    "Street Vendor": [
        {"name": "ONDC Seller Network", "desc": "Digital storefront & wholesale supply onboarding", "url": "https://ondc.org"},
        {"name": "PM SVANidhi Portal", "desc": "Working capital & digital payment partner banks", "url": "https://pmsvanidhi.mohua.gov.in"},
    ],
    "Artisan": [
        {"name": "GeM Artisan & Handicrafts", "desc": "Direct B2B institutional sales for verified artisans", "url": "https://gem.gov.in"},
        {"name": "EPCH (Handicrafts B2B Export)", "desc": "Export promotion & global craft buyer fairs", "url": "https://epch.in"},
        {"name": "ONDC Craft Market", "desc": "Sell handmade products across digital buyer apps", "url": "https://ondc.org"},
    ],
    "Student": [
        {"name": "National Career Service (NCS)", "desc": "Verified employers, apprenticeships & skill partners", "url": "https://www.ncs.gov.in"},
        {"name": "SWAYAM Portal", "desc": "Industry & university certification courses", "url": "https://swayam.gov.in"},
    ],
    "General Citizen": [
        {"name": "GeM Public Services", "desc": "Verified B2B & public service procurement portal", "url": "https://gem.gov.in"},
        {"name": "India.gov Citizen Services", "desc": "Official public service directory", "url": "https://services.india.gov.in"},
    ],
}


def get_b2b_referrals(profession: str) -> list[dict]:
    return _B2B_DIRECTORY.get(profession, _B2B_DIRECTORY["General Citizen"])


def detect_query_language(text: str) -> str:
    """Detects Telugu, Hindi (Devanagari), or English from script characters."""
    if re.search(r"[\u0C00-\u0C7F]", text):
        return "Telugu"
    if re.search(r"[\u0900-\u097F]", text):
        return "Hindi"
    return "English"


def _call_gemini_text(prompt: str) -> Optional[str]:
    if not settings.GEMINI_API_KEY:
        return None
    try:
        from google import genai
        from google.genai import types

        timeout_ms = max(12000, settings.GEMINI_TIMEOUT_SECONDS * 1000)
        client = genai.Client(
            api_key=settings.GEMINI_API_KEY,
            http_options=types.HttpOptions(timeout=timeout_ms),
        )
        models_to_try = [settings.GEMINI_MODEL]
        for fallback in ("gemini-3.5-flash-lite", "gemini-3.1-flash-lite", "gemini-2.5-flash-lite"):
            if fallback not in models_to_try:
                models_to_try.append(fallback)

        for model_name in models_to_try:
            try:
                response = client.models.generate_content(
                    model=model_name,
                    contents=prompt,
                )
                if response.text:
                    return response.text
            except Exception as exc:
                logger.warning("Gemini model %s failed: %s", model_name, exc)
                continue
        return None
    except Exception as exc:
        logger.warning("Gemini API setup failed, falling back to RAG response: %s", exc)
        return None


def _call_gemini_vision(prompt: str, image_bytes: bytes, mime_type: str) -> Optional[str]:
    if not settings.GEMINI_API_KEY:
        return None
    try:
        from google import genai
        from google.genai import types

        timeout_ms = max(15000, settings.GEMINI_TIMEOUT_SECONDS * 1000)
        client = genai.Client(
            api_key=settings.GEMINI_API_KEY,
            http_options=types.HttpOptions(timeout=timeout_ms),
        )
        response = client.models.generate_content(
            model=settings.GEMINI_MODEL,
            contents=[
                types.Part.from_bytes(data=image_bytes, mime_type=mime_type),
                prompt,
            ],
        )
        return response.text
    except Exception as exc:
        logger.warning("Gemini Vision call failed: %s", exc)
        return None


def _casual_reply(intent: str, query: str, language: str, profession: str) -> str:
    lang = language.lower()
    if intent == "greeting":
        if lang == "telugu":
            return (
                f"నమస్కారం! నేను **సహాయక్ AI**ని — **{profession}** కోసం మీ స్మార్ట్ సహాయకుడిని.\n\n"
                "ఈరోజు మీకు నేను ఎలా సహాయపడగలను? మీరు ప్రభుత్వ పథకాలు (ఉదా. పీఎం కిసాన్), "
                "పంట సలహాలు, వాతావరణం, మార్కెట్ ధరలు లేదా మీ డాక్యుమెంట్ల గురించి ఏదైనా అడగవచ్చు."
            )
        if lang == "hindi":
            return (
                f"नमस्ते! मैं **सहायक AI** हूँ — **{profession}** के लिए आपका स्मार्ट सहायक।\n\n"
                "आज मैं आपकी क्या मदद कर सकता हूँ? आप सरकारी योजनाओं (जैसे पीएम किसान), "
                "फसल सलाह, मौसम, मंडी भाव या अपने दस्तावेज़ों के बारे में कुछ भी पूछ सकते हैं।"
            )
        return (
            f"Hello! I'm **Sahayak AI**, your multilingual assistant tailored for **{profession}s**.\n\n"
            "How can I help you today? You can ask me about government schemes (like PM-KISAN or Mudra), "
            "crop or marine guidance, weather updates, scholarships, or upload a document or photo."
        )

    if intent == "thanks":
        if lang == "telugu":
            return "మీకు స్వాగతం! మీకు ఇంకేమైనా ప్రశ్నలు ఉంటే ఎప్పుడైనా అడగండి."
        if lang == "hindi":
            return "आपका स्वागत है! यदि आपका कोई और प्रश्न है, तो बेझिझक पूछें।"
        return "You're welcome! Let me know anytime if you have another question."

    if intent == "intro":
        if lang == "telugu":
            return (
                f"నేను **సహాయక్ AI**. **{profession}** వృత్తిదారులకు మరియు పౌరులకు తెలుగు, హిందీ మరియు ఇంగ్లీష్‌లో "
                "ప్రభుత్వ పథకాలు, వాతావరణం, పత్రాల సారాంశం మరియు చిత్ర విశ్లేషణలో సహాయం చేస్తాను."
            )
        if lang == "hindi":
            return (
                f"मैं **सहायक AI** हूँ। मैं **{profession}** और नागरिकों को हिंदी, तेलुगु और अंग्रेज़ी में "
                "सरकारी योजनाओं, मौसम, दस्तावेज़ सारांश और छवि विश्लेषण में मदद करता हूँ।"
            )
        return (
            f"I'm **Sahayak AI**, built to help **{profession}s** and citizens in multiple languages. "
            "I can explain government schemes, check eligibility, analyze crop or document photos, "
            "summarize PDFs, and share local safety and weather guidance."
        )

    return ""


def generate_chat_answer(
    query: str,
    language: str = "English",
    profession: str = "Farmer",
    doc_id: Optional[str] = None,
    conversation_history: Optional[list[dict]] = None,
) -> dict:
    """
    Handles casual greetings/thanks naturally without triggering RAG verification,
    and uses profession-aware RAG + Gemini for factual questions.
    """
    detected_lang = detect_query_language(query)
    intent = classify_intent(query)

    # 0. Instant local time/date utility
    if _TIME_DATE_PATTERN.search(query.strip()):
        now_ist = datetime.now(IST)
        formatted = now_ist.strftime("%I:%M %p, %A, %d %B %Y (IST)")
        if language.lower() == "telugu":
            ans = f"ప్రస్తుత సమయం మరియు తేదీ: **{formatted}**"
        elif language.lower() == "hindi":
            ans = f"वर्तमान समय और तिथि: **{formatted}**"
        else:
            ans = f"The current time and date is **{formatted}**."
        return {
            "answer": ans,
            "sources": [],
            "rag_used": False,
            "confidence": "high",
            "uncertain": False,
            "detected_language": detected_lang,
            "response_language": language,
            "mode": "utility-clock",
            "disclaimer": None,
        }

    # 1. Handle greetings, thanks, and introductions naturally (no RAG sources!)
    if intent in ("greeting", "thanks", "intro") and not doc_id:
        lang_note = (
            "Respond warmly in Telugu (తెలుగు)."
            if language.lower() == "telugu"
            else f"Respond warmly in {language}."
        )
        ai_text = _call_gemini_text(
            f"You are Sahayak AI, a friendly assistant for {profession}s in India. "
            f"{lang_note} Reply naturally and briefly (2-3 sentences) to: \"{query}\". "
            f"Do not cite sources or mention missing knowledge bases."
        )
        mode = "live-gemini" if ai_text else "conversational"
        if not ai_text:
            ai_text = _casual_reply(intent, query, language, profession)

        return {
            "answer": ai_text,
            "sources": [],
            "rag_used": False,
            "confidence": "high",
            "uncertain": False,
            "detected_language": detected_lang,
            "response_language": language,
            "mode": mode,
            "disclaimer": None,
        }

    # 2. If simple follow-up ("tell me more", "next step"), expand using last user message
    effective_query = query
    if intent == "followup" and conversation_history:
        last_user = next(
            (m.get("content", "") for m in reversed(conversation_history) if m.get("role") == "user"),
            "",
        )
        if last_user:
            effective_query = f"{last_user} {query}"

    matches = rag_store.search(effective_query, top_k=3, doc_id_filter=doc_id, profession=profession)
    top_score = matches[0]["score"] if matches else 0.0

    if top_score >= 0.25:
        confidence = "high"
    elif top_score >= 0.08:
        confidence = "medium"
    else:
        confidence = "low"

    uncertain = confidence == "low"

    context_text = "\n\n".join(
        f"[{m['title']} | Source: {m['source']} | URL: {m.get('source_url', '')} | Updated: {m.get('last_updated', '')}]\n{m['text']}"
        for m in matches
    )

    history_block = ""
    if conversation_history:
        recent = conversation_history[-6:]
        history_block = "\n".join(
            f"{m.get('role', 'user').capitalize()}: {m.get('content', '')[:300]}"
            for m in recent
        )

    lang_note = (
        "Respond in clear, simple Telugu (తెలుగు) script."
        if language.lower() == "telugu"
        else f"Respond in clear, simple {language}."
    )

    uncertainty_rule = (
        "Answer the user's question directly and helpfully using general verified knowledge if it is "
        "a general educational, farming, study, or practical question (such as crops, soil, study tips, or business basics). "
        "However, NEVER invent specific government scheme payouts, live market prices, or live weather/disaster alerts."
        if uncertain
        else (
            "Use the Retrieved Knowledge Context if it directly answers the user's question, and cite the source. "
            "If the user is asking a general practical question (e.g. 'tell me about crops'), answer their actual question "
            "directly and helpfully instead of forcing an unrelated insurance scheme."
        )
    )

    system_prompt = (
        f"You are Sahayak AI, a trusted multilingual assistant for {profession}s and citizens in India.\n"
        f"{lang_note} Preserve exact meaning for numbers, eligibility rules, and safety instructions.\n"
        f"{uncertainty_rule}\n"
        f"Organize the answer clearly with short headings and numbered steps.\n\n"
        f"Recent Conversation Context:\n{history_block or 'New conversation.'}\n\n"
        f"Retrieved Knowledge Context:\n{context_text or 'No verified document matched.'}\n\n"
        f"User Question (detected {detected_lang}): {query}"
    )

    ai_text = _call_gemini_text(system_prompt)
    mode = "live-gemini" if ai_text else "demo-rag"

    if not ai_text:
        lang_headers = {
            "telugu": (
                "సహాయక్ AI మార్గదర్శకత్వం",
                "తదుపరి సూచనలు",
                "అధికారిక పోర్టల్‌లో వివరాలు నిర్ధారించుకోండి.",
                "ఆధార్, బ్యాంక్ పాస్‌బుక్ మరియు వృత్తి పత్రాలు సిద్ధంగా ఉంచుకోండి.",
                "ఈ నిర్దిష్ట ప్రశ్నకు సంబంధించిన ధృవీకరించిన సమాచారం ప్రస్తుతం మా డేటాబేస్‌లో అందుబాటులో లేదు. దయచేసి అధికారిక ప్రభుత్వ పోర్టల్ లేదా నిపుణుల సహాయం ద్వారా నిర్ధారించుకోండి.",
            ),
            "hindi": (
                "सहायक AI मार्गदर्शन",
                "अगले कदम",
                "आधिकारिक पोर्टल पर विवरण सत्यापित करें।",
                "आधार, बैंक पासबुक और आवश्यक प्रमाणपत्र तैयार रखें।",
                "इस विशिष्ट प्रश्न के लिए सत्यापित आधिकारिक जानकारी वर्तमान में हमारे नॉलेज बेस में उपलब्ध नहीं है। कृपया आधिकारिक सरकारी पोर्टल या विशेषज्ञ सहायता से जांचें।",
            ),
        }
        loc = lang_headers.get(language.lower())

        if matches and not uncertain:
            top = matches[0]
            if loc:
                ai_text = (
                    f"### {loc[0]} ({language}) — {top['title']}\n\n"
                    f"{top['text']}\n\n"
                    f"### {loc[1]}\n"
                    f"1. {loc[2]} (`{top['source']}`)\n"
                    f"2. {loc[3]}\n\n"
                    f"*Note: Grounded RAG demo mode ({language}). Set `GEMINI_API_KEY` in `backend/.env` for full live {language} Gemini generation.*"
                )
            else:
                ai_text = (
                    f"### {top['title']}\n\n"
                    f"{top['text']}\n\n"
                    f"### Recommended Next Steps\n"
                    f"1. **Verify Official Details:** Check `{top['source']}` ({top.get('source_url') or 'official portal'}) for the latest circulars.\n"
                    f"2. **Prepare Documents:** Keep your Aadhaar, bank passbook, and relevant profession/income proof ready.\n"
                    f"3. **Local Assistance:** Visit your nearest Common Service Centre (CSC) or Krishi Vigyan Kendra (KVK) if needed.\n\n"
                    f"*Note: Running in grounded RAG fallback mode (Gemini API temporarily unavailable).*"
                )
        else:
            if loc:
                ai_text = (
                    f"### {loc[0]} ({profession} • {language})\n\n"
                    f"{loc[4]}\n\n"
                    f"1. {loc[2]}\n"
                    f"2. {loc[3]}\n\n"
                    f"*Note: Grounded RAG uncertainty notice ({language}).*"
                )
            else:
                ai_text = (
                    f"### Verified Information Unavailable ({profession})\n\n"
                    f"I could not find a high-confidence verified source in the current knowledge base for **\"{query}\"**.\n\n"
                    f"### Safe Next Steps\n"
                    f"1. **Avoid Guessing:** Sahayak AI does not invent official schemes, prices, or legal rules.\n"
                    f"2. **Try Specific Topics:** Ask about *PM Kisan*, *PMFBY*, *PMMSY*, *National Scholarship Portal*, *PM Mudra*, *PM Vishwakarma*, *Crop Disease*, or *Disaster Helplines*.\n"
                    f"3. **Upload or Escalate:** Upload your own PDF in **Document Assistant** or contact **Expert Support**."
                )

    sources = (
        [
            {
                "title": m["title"],
                "source": m["source"],
                "url": m.get("source_url", ""),
                "last_updated": m.get("last_updated", ""),
                "score": m.get("score", 0.0),
            }
            for m in matches
        ]
        if not uncertain
        else []
    )

    return {
        "answer": ai_text,
        "sources": sources,
        "b2b_referrals": get_b2b_referrals(profession),
        "rag_used": not uncertain and len(sources) > 0,
        "confidence": confidence,
        "uncertain": uncertain,
        "detected_language": detected_lang,
        "response_language": language,
        "mode": mode,
        "disclaimer": (
            "AI guidance is for informational purposes only and is not a substitute for "
            "certified legal, medical, financial, or agronomic advice."
        ),
    }


def summarize_document_text(filename: str, extracted_text: str, language: str = "English") -> dict:
    snippet = extracted_text[:4500]
    prompt = (
        f"Summarize the uploaded document '{filename}' in {language} using short bullet points "
        f"and key action items for a citizen:\n\n{snippet}"
    )
    ai_summary = _call_gemini_text(prompt)
    if ai_summary:
        return {"summary": ai_summary, "mode": "live-gemini"}

    lines = [ln.strip() for ln in extracted_text.splitlines() if ln.strip()]
    preview_lines = "\n".join(f"- {ln[:160]}" for ln in lines[:5]) or "- No selectable text found."
    return {
        "summary": (
            f"Document Summary ({filename} • Demo Extractive Mode):\n"
            f"{preview_lines}\n\n"
            f"Ask any specific question below to search this document with RAG."
        ),
        "mode": "demo-extractive",
    }


def analyze_image_content(
    image_bytes: bytes,
    mime_type: str,
    prompt: str = "Analyze this image and provide helpful guidance.",
    language: str = "English",
    profession: str = "Farmer",
) -> dict:
    full_prompt = (
        f"You are Sahayak AI assisting a {profession} in {language}. "
        f"Analyze the uploaded image carefully. If it shows a crop leaf, identify visible symptoms "
        f"(spots, yellowing, pests) and suggest safe, non-destructive next steps including consulting a local KVK. "
        f"If it shows a document or receipt, summarize key fields clearly without inventing unreadable text. "
        f"User prompt: {prompt}"
    )
    ai_text = _call_gemini_vision(full_prompt, image_bytes, mime_type)
    mode = "live-gemini-vision" if ai_text else "demo-vision"

    if not ai_text:
        size_kb = max(1, round(len(image_bytes) / 1024))
        if language.lower() == "telugu":
            ai_text = (
                f"### చిత్ర విశ్లేషణ సారాంశం (డెమో మోడ్ • {size_kb} KB)\n\n"
                f"**{profession}** సందర్భం కోసం మీ చిత్రం స్వీకరించబడింది మరియు పరిశీలించబడింది.\n\n"
                f"### పరిశీలనలు & సూచనలు\n"
                f"1. **స్పష్టత:** ఆకు, పత్రం లేదా వస్తువు స్పష్టంగా మరియు మంచి వెలుతురులో ఉండేలా చూడండి.\n"
                f"2. **పంట ఆకుల ఫోటోల కోసం:** మచ్చలు లేదా పురుగుల కోసం ఆకుల పైభాగం మరియు అడుగు భాగాన్ని పరిశీలించండి. రసాయనాలు పిచికారీ చేసే ముందు స్థానిక **కృషి విజ్ఞాన కేంద్రం (KVK)** నిపుణులను సంప్రదించండి.\n"
                f"3. **పత్రాల కోసం:** మీ పేరు, ఆధార్/ఐడీ సంఖ్య మరియు తేదీ అధికారిక రికార్డులతో సరిపోలుతున్నాయో తనిఖీ చేయండి.\n\n"
                f"*గమనిక: లైవ్ Gemini విజన్ విశ్లేషణ కోసం `backend/.env` లో `GEMINI_API_KEY` సెట్ చేయండి.*"
            )
        elif language.lower() == "hindi":
            ai_text = (
                f"### छवि विश्लेषण सारांश (डेमो मोड • {size_kb} KB)\n\n"
                f"**{profession}** संदर्भ के लिए आपकी छवि प्राप्त और जांची गई है।\n\n"
                f"### मुख्य सुझाव\n"
                f"1. **स्पष्टता:** सुनिश्चित करें कि पत्ती, दस्तावेज़ या वस्तु अच्छी रोशनी और फोकस में हो।\n"
                f"2. **फसल की पत्तियों के लिए:** धब्बों या कीटों के लिए पत्ती के ऊपर और नीचे दोनों तरफ जांचें। किसी भी छिड़काव से पहले अपने स्थानीय **कृषि विज्ञान केंद्र (KVK)** से सलाह लें।\n"
                f"3. **दस्तावेज़ों के लिए:** जांचें कि आपका नाम, आधार/आईडी नंबर और तारीख आधिकारिक रिकॉर्ड से मेल खाते हैं।\n\n"
                f"*नोट: लाइव Gemini विज़न विश्लेषण के लिए `backend/.env` में `GEMINI_API_KEY` सेट करें।*"
            )
        else:
            ai_text = (
                f"### Image Analysis Summary (Demo Mode • {size_kb} KB)\n\n"
                f"Your image has been received and inspected for **{profession}** context.\n\n"
                f"### Observations & Recommended Checks\n"
                f"1. **Visual Clarity:** Ensure the subject (leaf, document, or product) is well-lit and in focus.\n"
                f"2. **For Crop / Leaf Photos:** Check both upper and lower leaf surfaces for spots, rust, or insects. "
                f"Avoid spraying chemicals before confirming with your local **Krishi Vigyan Kendra (KVK)**.\n"
                f"3. **For Documents / Forms:** Verify your name, Aadhaar/ID number, and date of issue match official records.\n\n"
                f"*Note: Set `GEMINI_API_KEY` in `backend/.env` to enable live Gemini Vision analysis.*"
            )

    return {
        "analysis": ai_text,
        "mode": mode,
        "disclaimer": "Visual AI analysis may contain inaccuracies; verify critical crop or document decisions with a local expert.",
    }
