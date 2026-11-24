import logging
import math
import re
from collections import Counter
from typing import Optional
from .config import settings

logger = logging.getLogger(__name__)


def _tokenize(text: str) -> list[str]:
    return re.findall(r"[a-z0-9]+", text.lower())


def _cosine_dense(a: list[float], b: list[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b))
    na = math.sqrt(sum(x * x for x in a))
    nb = math.sqrt(sum(y * y for y in b))
    if na == 0 or nb == 0:
        return 0.0
    return dot / (na * nb)


def _embed_text_gemini(text: str) -> Optional[list[float]]:
    if not settings.GEMINI_API_KEY:
        return None
    try:
        from google import genai

        client = genai.Client(api_key=settings.GEMINI_API_KEY)
        res = client.models.embed_content(
            model="text-embedding-004",
            contents=text[:2000],
        )
        if res.embeddings and len(res.embeddings) > 0:
            return list(res.embeddings[0].values)
    except Exception as exc:
        logger.debug("Gemini embedding skipped, using TF-IDF vector search: %s", exc)
    return None


class VectorRAGStore:
    """
    Hybrid Vector Database (Gemini Embeddings when available + TF-IDF cosine similarity
    with profession-context boosting). Stores curated trusted knowledge sources and
    user/admin-uploaded PDF chunks with full source metadata.
    """

    def __init__(self):
        self.documents: list[dict] = []
        self._seed_knowledge()

    def _seed_knowledge(self):
        seed_chunks = [
            {
                "id": "kb-pm-kisan",
                "title": "PM-KISAN (Pradhan Mantri Kisan Samman Nidhi)",
                "source": "pmkisan.gov.in (Ministry of Agriculture & Farmers Welfare)",
                "source_url": "https://pmkisan.gov.in",
                "last_updated": "2026-11-01 (Verified Reference)",
                "professions": ["Farmer"],
                "category": "schemes",
                "text": (
                    "PM-KISAN provides income support of Rs. 6,000 per year in three equal "
                    "installments of Rs. 2,000 directly into the bank accounts of eligible "
                    "landholding farmer families via Direct Benefit Transfer (DBT). "
                    "Required documents: Aadhaar Card, Landholding papers / Record of Rights (RoR), "
                    "Bank Passbook with Aadhaar seeding, and e-KYC completion on pmkisan.gov.in or CSC."
                ),
            },
            {
                "id": "kb-pmfby",
                "title": "Pradhan Mantri Fasal Bima Yojana (PMFBY)",
                "source": "pmfby.gov.in (Ministry of Agriculture)",
                "source_url": "https://pmfby.gov.in",
                "last_updated": "2026-11-01 (Verified Reference)",
                "professions": ["Farmer"],
                "category": "schemes",
                "text": (
                    "PMFBY offers crop insurance against natural calamities, pests, and diseases. "
                    "Farmers pay a uniform maximum premium of 2% for Kharif crops, 1.5% for Rabi "
                    "crops, and 5% for annual commercial/horticultural crops. Documents needed: "
                    "Aadhaar, Land record (RoR), Sowing certificate, and Bank account details."
                ),
            },
            {
                "id": "kb-crop-disease",
                "title": "Integrated Pest, Crop Disease & Fertilizer Management",
                "source": "icar.org.in (ICAR Krishi Vigyan Kendra)",
                "source_url": "https://icar.org.in",
                "last_updated": "2026-11-01 (ICAR Reference)",
                "professions": ["Farmer"],
                "category": "agriculture",
                "text": (
                    "Crop guidance & disease care: For leaf spots, blight, or yellowing in paddy, cotton, "
                    "or chilli: 1) Inspect undersides of leaves for aphids, whiteflies, or fungal spores. "
                    "2) Remove severely infected leaves early and ensure proper field drainage. "
                    "3) Follow soil-test-based balanced NPK fertilizer schedules and avoid excess nitrogen. "
                    "4) Consult your nearest Krishi Vigyan Kendra (KVK) or Kisan Call Centre (1800-180-1551) "
                    "before applying fungicides or pesticides."
                ),
            },
            {
                "id": "kb-pmmsy",
                "title": "Pradhan Mantri Matsya Sampada Yojana (PMMSY) & Marine Safety",
                "source": "dof.gov.in (Department of Fisheries)",
                "source_url": "https://dof.gov.in",
                "last_updated": "2026-11-01 (Verified Reference)",
                "professions": ["Fisherman"],
                "category": "fisheries",
                "text": (
                    "PMMSY supports fishermen and fish farmers with financial assistance for "
                    "motorized boats, safety kits, life jackets, cold storage, ice boxes, and aquaculture ponds. "
                    "Subsidy ranges from 40% for general category to 60% for SC/ST/women beneficiaries. "
                    "Marine safety advisory: Always check IMD coastal wind & wave warnings before sailing, "
                    "carry communication gear, and register on the Fisherfolk ID portal. "
                    "Required: Fisherman ID card, Aadhaar, Bank details, and Project proposal."
                ),
            },
            {
                "id": "kb-nsp",
                "title": "National Scholarship Portal (NSP) & Student Career Support",
                "source": "scholarships.gov.in (Ministry of Education)",
                "source_url": "https://scholarships.gov.in",
                "last_updated": "2026-11-01 (Verified Reference)",
                "professions": ["Student"],
                "category": "students",
                "text": (
                    "The National Scholarship Portal (NSP) hosts Central, UGC, AICTE, and State "
                    "scholarships for school and college students. Eligibility depends on family income "
                    "limits, attendance/marks, and an Aadhaar-seeded bank account. Required: Bonafide "
                    "certificate, Income certificate, Caste/Domicile certificate (if applicable), and marksheet. "
                    "Students can also access free NCERT/SWAYAM learning resources at swayam.gov.in."
                ),
            },
            {
                "id": "kb-mudra-svanidhi",
                "title": "PM Mudra Yojana (PMMY), Pricing & PM SVANidhi for Vendors",
                "source": "mudra.org.in / pmsvanidhi.mohua.gov.in",
                "source_url": "https://www.mudra.org.in",
                "last_updated": "2026-11-01 (Verified Reference)",
                "professions": ["Business Owner", "Street Vendor"],
                "category": "business",
                "text": (
                    "PM Mudra Yojana provides collateral-free micro-enterprise loans up to Rs. 10 lakh "
                    "(Shishu up to Rs. 50,000, Kishor up to Rs. 5 lakh, Tarun up to Rs. 10 lakh) and "
                    "MSME Udyam registration is free at udyamregistration.gov.in. "
                    "PM SVANidhi provides working capital micro-loans starting at Rs. 10,000 for street "
                    "vendors with digital UPI cashback incentives. Business tip: Track daily inventory "
                    "and calculate unit cost + overhead + target margin before setting retail prices."
                ),
            },
            {
                "id": "kb-vishwakarma",
                "title": "PM Vishwakarma Scheme & Craft Market Guidance for Artisans",
                "source": "pmvishwakarma.gov.in (Ministry of MSME)",
                "source_url": "https://pmvishwakarma.gov.in",
                "last_updated": "2026-11-01 (Verified Reference)",
                "professions": ["Artisan"],
                "category": "artisan",
                "text": (
                    "PM Vishwakarma supports 18 traditional trades including potters, carpenters, "
                    "weavers, blacksmiths, goldsmiths, and cobblers. Benefits include PM Vishwakarma "
                    "Certificate & ID card, skill upgradation stipend (Rs. 500/day), toolkit "
                    "incentive up to Rs. 15,000, and collateral-free credit at 5% interest. "
                    "Artisans can also register on GeM / ONDC craft marketplaces for wider buyer reach."
                ),
            },
            {
                "id": "kb-citizen-services",
                "title": "General Citizen Public Services, Documents & CSC Guide",
                "source": "digitalindia.gov.in / services.india.gov.in",
                "source_url": "https://services.india.gov.in",
                "last_updated": "2026-11-01 (Verified Reference)",
                "professions": ["General Citizen"],
                "category": "citizen",
                "text": (
                    "For Aadhaar updates, ration card, income/caste certificates, or pension applications, "
                    "citizens can apply online via state e-Seva / DigiLocker (digilocker.gov.in) or visit "
                    "the nearest Common Service Centre (CSC). Keep original Aadhaar, address proof, "
                    "passport photo, and an active mobile number for OTP verification."
                ),
            },
            {
                "id": "kb-disaster",
                "title": "Emergency, Cyclone, Flood, Heatwave & Disaster Safety (NDMA)",
                "source": "ndma.gov.in (National Disaster Management Authority)",
                "source_url": "https://ndma.gov.in",
                "last_updated": "2026-11-01 (Verified Helpline Reference)",
                "professions": ["Farmer", "Fisherman", "Student", "Artisan", "Business Owner", "Street Vendor", "General Citizen"],
                "category": "emergency",
                "text": (
                    "National Emergency Number: 112. Disaster Management Helpline: 1078 / 1070. "
                    "Ambulance: 108. Fire: 101. Police: 100. Kisan Call Centre: 1800-180-1551. "
                    "During cyclones, floods, or heatwaves: stay indoors away from power lines, "
                    "drink ORS/water during heatwaves, keep emergency kit & waterproof document pouch ready, "
                    "and follow official IMD (mausam.imd.gov.in) & District Collector advisories."
                ),
            },
        ]
        for chunk in seed_chunks:
            self.add_document(chunk, compute_embedding=False)

    def add_document(self, doc: dict, compute_embedding: bool = True):
        text_for_index = f"{doc.get('title', '')} {doc.get('text', '')}"
        tokens = _tokenize(text_for_index)
        embedding = _embed_text_gemini(text_for_index) if compute_embedding else None
        doc_entry = {
            **doc,
            "_tokens": tokens,
            "_tf": Counter(tokens),
            "_embedding": embedding,
        }
        self.documents.append(doc_entry)

    def remove_by_prefix(self, prefix: str):
        self.documents = [d for d in self.documents if not d.get("id", "").startswith(prefix)]

    def remove_by_id(self, doc_id: str) -> bool:
        before = len(self.documents)
        self.documents = [d for d in self.documents if d.get("id") != doc_id]
        return len(self.documents) < before

    def search(
        self,
        query: str,
        top_k: int = 3,
        doc_id_filter: Optional[str] = None,
        profession: Optional[str] = None,
    ) -> list[dict]:
        q_tokens = _tokenize(query)
        if not q_tokens:
            return []
        q_tf = Counter(q_tokens)

        pool = self.documents
        if doc_id_filter:
            pool = [d for d in self.documents if d.get("doc_id") == doc_id_filter]

        if not pool:
            return []

        has_dense = any(d.get("_embedding") is not None for d in pool)
        q_embedding = _embed_text_gemini(query) if has_dense else None

        n_docs = len(pool)
        df = Counter()
        for doc in pool:
            for term in set(doc["_tokens"]):
                df[term] += 1

        scored = []
        for doc in pool:
            score = 0.0
            doc_norm = 0.0
            q_norm = 0.0
            for term, q_count in q_tf.items():
                idf = math.log((n_docs + 1) / (df[term] + 1)) + 1.0
                qw = q_count * idf
                dw = doc["_tf"].get(term, 0) * idf
                score += qw * dw
                q_norm += qw * qw
                doc_norm += dw * dw

            tfidf_cos = score / (math.sqrt(q_norm) * math.sqrt(doc_norm)) if (doc_norm > 0 and q_norm > 0) else 0.0

            if q_embedding and doc.get("_embedding"):
                emb_cos = _cosine_dense(q_embedding, doc["_embedding"])
                combined = 0.65 * emb_cos + 0.35 * tfidf_cos
            else:
                combined = tfidf_cos

            # Gentle profession boost without restricting cross-domain questions
            if profession and profession in doc.get("professions", []) and combined > 0:
                combined *= 1.15

            if combined > 0:
                scored.append((combined, doc))

        scored.sort(key=lambda x: x[0], reverse=True)
        return [
            {
                "id": d["id"],
                "title": d.get("title", "Document Chunk"),
                "source": d.get("source", "Uploaded Document"),
                "source_url": d.get("source_url", ""),
                "last_updated": d.get("last_updated", d.get("updated", "")),
                "updated": d.get("last_updated", d.get("updated", "")),
                "professions": d.get("professions", []),
                "text": d.get("text", ""),
                "score": round(s, 4),
            }
            for s, d in scored[:top_k]
        ]


rag_store = VectorRAGStore()
