"""FastAPI service for central fertilizer MRP checks, booking agent, and farmer complaints."""

import asyncio
import copy
import json
import os
import re
import secrets
import threading
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional
from uuid import uuid4

from dotenv import load_dotenv
from fastapi import FastAPI, File, Form, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from google import genai
from google.genai import types
from pydantic import BaseModel, Field

try:
    from booking_agent import run_booking_agent
except ImportError:  # Support importing the app as ``backend.main`` as well.
    from .booking_agent import run_booking_agent


BASE_DIR = Path(__file__).resolve().parent
MRP_FILE = BASE_DIR / "mrp_data.json"
COMPLAINTS_FILE = BASE_DIR / "complaints.json"
FARMERS_FILE = BASE_DIR / "farmers.json"

load_dotenv(BASE_DIR / ".env")
load_dotenv()


def load_mrps() -> list[dict]:
    try:
        with MRP_FILE.open("r", encoding="utf-8") as mrp_file:
            records = json.load(mrp_file)
    except FileNotFoundError as exc:
        raise RuntimeError(f"MRP data file not found: {MRP_FILE}") from exc
    if not isinstance(records, list):
        raise RuntimeError("mrp_data.json must contain a JSON list")
    return records


mrp_data = load_mrps()


def get_allowed_origins() -> list[str]:
    raw_origins = os.getenv("ALLOWED_ORIGINS", "").strip()
    if not raw_origins or raw_origins == "*":
        return ["*"]
    return [origin.strip().rstrip("/") for origin in raw_origins.split(",") if origin.strip()]


allowed_origins = get_allowed_origins()

app = FastAPI(title="Central Fertilizer Price Verification & Booking API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=allowed_origins != ["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def refresh_mrp_data() -> None:
    """Load the current MRP list when the service starts."""
    global mrp_data
    mrp_data = load_mrps()


class PriceCheckResult(BaseModel):
    fertilizer_name: str
    matched_mrp_id: str
    # government_declared means the product matches mrp_data.json; market_estimate
    # means no declared MRP was found and official_mrp holds a typical market benchmark.
    mrp_status: str = "government_declared"
    official_mrp: float
    quoted_price: float
    is_overcharged: bool
    overcharge_amount: float
    explanation_en: str
    explanation_te: str
    explanation_localized: str = ""


class ComplaintRequest(BaseModel):
    farmer_name: str
    ppb_number: str
    shop_name: str
    district: str
    fertilizer_name: str
    official_mrp: float = Field(ge=0)
    charged_price: float = Field(ge=0)
    overcharge_amount: float = Field(ge=0)


class FarmerRegistration(BaseModel):
    full_name: str
    mobile: str
    ppb_number: str
    district: str
    mandal: str
    village: str
    preferred_shop: Optional[str] = None
    land_acres: float = Field(ge=0)


class AgentBookingIntent(BaseModel):
    shop_keyword: str = "Central Fertilizer Depot"
    bags: int = Field(default=1, ge=1, le=5)
    fertilizer_type: str = "Subsidized Fertilizer"
    shop_explicit: bool = False


class AgentBookingRequest(BaseModel):
    message: str
    ppb_number: str = "IND-PPB-2026-0001"
    otp: str = "1234"
    language: str = "en"


class LocalizedConfirmation(BaseModel):
    message_en: str
    message_te: str
    message_localized: str


SUPPORTED_LANGUAGES = {"en", "te", "hi", "ta", "ml"}
LANGUAGE_NAMES = {
    "en": "English",
    "te": "Telugu",
    "hi": "Hindi",
    "ta": "Tamil",
    "ml": "Malayalam",
}
AGENT_JOBS: dict[str, dict] = {}
AGENT_JOBS_LOCK = threading.Lock()
AGENT_TASKS: dict[str, asyncio.Task] = {}
FARMERS_LOCK = threading.Lock()
COMPLAINTS_LOCK = threading.Lock()


def normalize_language(language: Optional[str]) -> str:
    cleaned = (language or "en").strip().lower()
    return cleaned if cleaned in SUPPORTED_LANGUAGES else "en"


def finalize_price_result(result: PriceCheckResult, quoted_price: Optional[float]) -> PriceCheckResult:
    """Enforce arithmetic and use the JSON file as the source of statutory MRPs."""
    result.quoted_price = float(quoted_price if quoted_price is not None else (result.quoted_price or 0.0))
    listed_item = next(
        (
            item
            for item in mrp_data
            if str(item.get("id", "")).strip().casefold() == result.matched_mrp_id.strip().casefold()
        ),
        None,
    )
    if listed_item is not None and result.mrp_status != "market_estimate":
        result.mrp_status = "government_declared"
        result.official_mrp = float(listed_item["mrp_inr"])
    else:
        result.mrp_status = "market_estimate"
        result.matched_mrp_id = "MARKET-ESTIMATE"
        result.official_mrp = max(float(result.official_mrp or 0.0), 0.0)
    result.overcharge_amount = max(round(result.quoted_price - result.official_mrp, 2), 0.0)
    result.is_overcharged = bool(result.quoted_price > result.official_mrp) if result.quoted_price > 0 else False
    return result


def explicit_shop_from_message(message: str) -> Optional[str]:
    normalized = message.casefold()
    known_locations = ("Shadnagar", "Chevella", "Ibrahimpatnam", "Maheshwaram")
    return next((location for location in known_locations if location.casefold() in normalized), None)


def read_farmers_unlocked() -> dict[str, dict]:
    if not FARMERS_FILE.exists():
        return {}
    try:
        with FARMERS_FILE.open("r", encoding="utf-8") as farmers_file:
            records = json.load(farmers_file)
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=500, detail="farmers.json contains invalid JSON") from exc
    if not isinstance(records, dict):
        raise HTTPException(status_code=500, detail="farmers.json must contain an object keyed by PPB number")
    return records


def write_farmers_unlocked(records: dict[str, dict]) -> None:
    temporary_file = FARMERS_FILE.with_suffix(".json.tmp")
    try:
        with temporary_file.open("w", encoding="utf-8") as farmers_file:
            json.dump(records, farmers_file, ensure_ascii=False, indent=2)
            farmers_file.write("\n")
        temporary_file.replace(FARMERS_FILE)
    except OSError as exc:
        raise HTTPException(status_code=500, detail="Could not save farmer profile") from exc


def find_farmer(identifier: str) -> Optional[dict]:
    key = identifier.strip().casefold()
    if not key:
        return None
    with FARMERS_LOCK:
        farmers = read_farmers_unlocked()
        for ppb, profile in farmers.items():
            if (
                ppb.casefold() == key
                or str(profile.get("ppb_number", "")).casefold() == key
                or str(profile.get("mobile", "")).casefold() == key
            ):
                return copy.deepcopy(profile)
    return None


def save_booking_for_farmer(ppb_number: str, intent: AgentBookingIntent, booking_result: dict) -> Optional[dict]:
    if booking_result.get("status") != "success":
        return None
    receipt_text = str(booking_result.get("receipt_text", ""))
    booking_match = re.search(r"FFS-(?:IN|TS)-2026-\d{4}", receipt_text)
    booking_id = booking_match.group(0) if booking_match else f"FFS-IN-2026-{secrets.randbelow(10000):04d}"
    with FARMERS_LOCK:
        farmers = read_farmers_unlocked()
        normalized_ppb = ppb_number.strip().casefold()
        farmer_key = next(
            (
                key
                for key, value in farmers.items()
                if key.casefold() == normalized_ppb
                or str(value.get("ppb_number", "")).casefold() == normalized_ppb
                or str(value.get("mobile", "")).casefold() == normalized_ppb
            ),
            None,
        )
        if farmer_key is None:
            return None
        profile = farmers[farmer_key]
        shop_selected = str(booking_result.get("shop_selected", "")).strip()
        shop_name = shop_selected.split(" - ", 1)[0].strip() or intent.shop_keyword or profile.get("preferred_shop") or profile.get("mandal", "")
        shop_mandals = {
            "Shadnagar Agro Kendra": "Shadnagar",
            "Chevella Rythu Seva": "Chevella",
            "Maheshwaram Agri Depot": "Maheshwaram",
        }
        resolved_product = str(booking_result.get("fertilizer_type") or intent.fertilizer_type or "Subsidized Fertilizer").strip()
        qr_payload = f"{booking_id} | {profile.get('ppb_number', ppb_number)} | {resolved_product} | {shop_name} | {intent.bags}"
        record = {
            "booking_id": booking_id,
            "fertilizer_type": resolved_product,
            "bags": intent.bags,
            "shop_selected": shop_name,
            "mandal": shop_mandals.get(shop_name, intent.shop_keyword or profile.get("mandal", "")),
            "district": profile.get("district", ""),
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "qr_payload": qr_payload,
        }
        profile.setdefault("bookings", []).append(record)
        farmers[farmer_key] = profile
        write_farmers_unlocked(farmers)
        return copy.deepcopy(record)


def build_confirmation_prompt(booking_result: dict, intent: AgentBookingIntent, language: str) -> str:
    booking_summary = json.dumps(booking_result, ensure_ascii=False)
    return (
        "Write short, friendly booking status messages. Provide message_en in English, "
        "message_te in simple Telugu, and message_localized in "
        f"{LANGUAGE_NAMES[language]} (language code {language}). Mention {intent.bags} "
        f"bag(s) of {intent.fertilizer_type}. "
        "If the browser booking succeeded, say it is confirmed and include the selected shop. "
        "If it failed, clearly and politely say it could not be completed. Do not claim success "
        f"unless the status is success. Booking result: {booking_summary}"
    )


def fallback_confirmation(booking_result: dict, language: str) -> LocalizedConfirmation:
    succeeded = booking_result.get("status") == "success"
    english_fallback = "Your booking is confirmed." if succeeded else "Booking could not be completed. Please try again."
    telugu_fallback = "బుకింగ్ విజయవంతమైంది." if succeeded else "బుకింగ్ పూర్తి కాలేదు. మళ్లీ ప్రయత్నించండి."
    localized_fallbacks = {
        "en": english_fallback,
        "te": telugu_fallback,
        "hi": "आपकी बुकिंग सफल हुई।" if succeeded else "बुकिंग पूरी नहीं हो सकी। फिर से कोशिश करें।",
        "ta": "முன்பதிவு வெற்றிகரமாக முடிந்தது." if succeeded else "முன்பதிவை முடிக்க முடியவில்லை. மீண்டும் முயற்சிக்கவும்.",
        "ml": "ബുക്കിംഗ് വിജയകരമായി പൂർത്തിയായി." if succeeded else "ബുക്കിംഗ് പൂർത്തിയാക്കാനായില്ല. വീണ്ടും ശ്രമിക്കുക.",
    }
    return LocalizedConfirmation(
        message_en=english_fallback,
        message_te=telugu_fallback,
        message_localized=localized_fallbacks[language],
    )


def generate_booking_confirmation(client, booking_result: dict, intent: AgentBookingIntent, language: str) -> LocalizedConfirmation:
    confirmation_prompt = build_confirmation_prompt(booking_result, intent, language)
    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=confirmation_prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=LocalizedConfirmation,
            ),
        )
        if response.parsed is not None:
            return (
                response.parsed
                if isinstance(response.parsed, LocalizedConfirmation)
                else LocalizedConfirmation.model_validate(response.parsed)
            )
        if response.text:
            return LocalizedConfirmation.model_validate_json(response.text)
        raise ValueError("Gemini returned an empty confirmation")
    except Exception:
        return fallback_confirmation(booking_result, language)


async def run_agent_job(job_id: str, client, request: AgentBookingRequest, intent: AgentBookingIntent, language: str) -> None:
    def publish_progress(milestone: dict) -> None:
        with AGENT_JOBS_LOCK:
            job = AGENT_JOBS.get(job_id)
            if job is not None:
                job["current_step"] = milestone["step"]
                job["steps"].append(milestone)

    try:
        booking_result = await asyncio.to_thread(
            run_booking_agent,
            request.ppb_number,
            request.otp,
            intent.shop_keyword,
            intent.bags,
            progress_callback=publish_progress,
            fertilizer_type=intent.fertilizer_type,
        )
        booking_result.setdefault("fertilizer_type", intent.fertilizer_type)
        booking_record = save_booking_for_farmer(request.ppb_number, intent, booking_result)
        confirmation = await asyncio.to_thread(generate_booking_confirmation, client, booking_result, intent, language)
        result = {
            "intent": intent.model_dump(),
            "booking_result": booking_result,
            "booking_record": booking_record,
            "confirmation_en": confirmation.message_en,
            "confirmation_te": confirmation.message_te,
            "confirmation_localized": confirmation.message_localized,
        }
        with AGENT_JOBS_LOCK:
            job = AGENT_JOBS.get(job_id)
            if job is not None:
                job.update(status=booking_result.get("status", "error"), result=result)
                job["current_step"] = "completed" if booking_result.get("status") == "success" else "failed"
    except Exception as exc:
        with AGENT_JOBS_LOCK:
            job = AGENT_JOBS.get(job_id)
            if job is not None:
                job.update(status="error", current_step="failed", error=str(exc))


def snapshot_agent_job(job_id: str) -> Optional[dict]:
    with AGENT_JOBS_LOCK:
        job = AGENT_JOBS.get(job_id)
        if job is None:
            return None
        return {**job, "steps": list(job.get("steps", []))}


@app.get("/health")
def health_check() -> dict:
    return {"status": "ok", "service": "KisanSathi AI Central Backend"}


@app.get("/mrps")
def get_mrps() -> list[dict]:
    return mrp_data


@app.post("/farmers/register")
def register_farmer(request: FarmerRegistration) -> dict:
    profile = request.model_dump()
    profile["full_name"] = profile["full_name"].strip()
    profile["mobile"] = profile["mobile"].strip()
    profile["ppb_number"] = profile["ppb_number"].strip()
    profile["district"] = profile["district"].strip()
    profile["mandal"] = profile["mandal"].strip()
    profile["village"] = profile["village"].strip()
    profile["preferred_shop"] = (profile.get("preferred_shop") or profile["mandal"]).strip()
    profile["bookings"] = []
    if not all(profile[key] for key in ("full_name", "mobile", "ppb_number", "district", "mandal", "village")):
        raise HTTPException(status_code=422, detail="All farmer profile fields are required")
    with FARMERS_LOCK:
        farmers = read_farmers_unlocked()
        requested_ppb = profile["ppb_number"].casefold()
        requested_mobile = profile["mobile"].casefold()
        ppb_owner = next(
            (
                key
                for key, saved in farmers.items()
                if key.casefold() == requested_ppb or str(saved.get("ppb_number", "")).casefold() == requested_ppb
            ),
            None,
        )
        mobile_owner = next(
            (
                key
                for key, saved in farmers.items()
                if str(saved.get("mobile", "")).casefold() == requested_mobile
            ),
            None,
        )
        if ppb_owner and mobile_owner and ppb_owner != mobile_owner:
            raise HTTPException(status_code=409, detail="This passbook number and mobile number belong to different farmer profiles")
        if ppb_owner and not mobile_owner and str(farmers[ppb_owner].get("mobile", "")).strip():
            raise HTTPException(status_code=409, detail="This passbook number is already registered with another mobile number")

        existing_owner = mobile_owner or ppb_owner
        if existing_owner:
            previous_profile = farmers.pop(existing_owner)
            profile["bookings"] = previous_profile.get("bookings", [])
        else:
            profile["bookings"] = []
        farmers[profile["ppb_number"]] = profile
        write_farmers_unlocked(farmers)
    return profile


@app.get("/farmers/{identifier}")
def get_farmer(identifier: str) -> dict:
    profile = find_farmer(identifier)
    if profile is None:
        raise HTTPException(status_code=404, detail="Farmer profile not found. Please register first.")
    return profile


@app.post("/agent-book")
async def agent_book(request: AgentBookingRequest, live: bool = Query(False)) -> dict:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=503, detail="GEMINI_API_KEY is not configured.")

    language = normalize_language(request.language)
    farmer_profile = find_farmer(request.ppb_number)
    profile_shop = (
        (farmer_profile or {}).get("preferred_shop")
        or (farmer_profile or {}).get("mandal")
        or "Central Fertilizer Depot"
    )
    prompt = (
        "Extract the farmer's preferred fertilizer shop, village, or mandal and the "
        "number of bags and the exact fertilizer product/grade from the message. Support all "
        "central government subsidized or monitored fertilizer products including Urea, DAP, MOP, "
        "SSP, NPK complex grades (preserve the exact grade), Ammonium Sulphate, TSP, and MAP. "
        "Never replace a requested product with Urea. Use fertilizer_type='Subsidized Fertilizer' "
        "only when no specific fertilizer is stated, and bags=1 when no quantity is stated. "
        "Set shop_explicit=true only if the farmer's message names a shop, mandal, or location; "
        "otherwise set it to false. Return only the requested structured fields.\n"
        f"Registered farmer preferred shop/mandal: {profile_shop}. Use this as the default "
        "when the message does not explicitly request another location.\n\n"
        f"Farmer message: {request.message}\n"
        f"The booking confirmation should be written in {LANGUAGE_NAMES[language]} (language code {language})."
    )
    try:
        client = genai.Client(api_key=api_key, http_options={"api_version": "v1beta"})
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=AgentBookingIntent,
            ),
        )
        if response.parsed is not None:
            intent = (
                response.parsed
                if isinstance(response.parsed, AgentBookingIntent)
                else AgentBookingIntent.model_validate(response.parsed)
            )
        elif response.text:
            intent = AgentBookingIntent.model_validate_json(response.text)
        else:
            raise ValueError("Gemini returned an empty intent response")
        explicit_shop = explicit_shop_from_message(request.message)
        if explicit_shop:
            intent.shop_keyword = explicit_shop
            intent.shop_explicit = True
        elif not intent.shop_explicit:
            intent.shop_keyword = profile_shop
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Could not understand booking request: {exc}") from exc

    if live:
        job_id = uuid4().hex
        with AGENT_JOBS_LOCK:
            AGENT_JOBS[job_id] = {
                "job_id": job_id,
                "status": "running",
                "current_step": "navigating",
                "steps": [],
                "intent": intent.model_dump(),
            }
        task = asyncio.create_task(run_agent_job(job_id, client, request, intent, language))
        AGENT_TASKS[job_id] = task
        task.add_done_callback(lambda _task, key=job_id: AGENT_TASKS.pop(key, None))
        return {"job_id": job_id, "status": "running", "intent": intent.model_dump()}

    booking_result = await asyncio.to_thread(
        run_booking_agent,
        request.ppb_number,
        request.otp,
        intent.shop_keyword,
        intent.bags,
        fertilizer_type=intent.fertilizer_type,
    )
    booking_result.setdefault("fertilizer_type", intent.fertilizer_type)
    booking_record = save_booking_for_farmer(request.ppb_number, intent, booking_result)
    confirmation = await asyncio.to_thread(generate_booking_confirmation, client, booking_result, intent, language)

    return {
        "intent": intent.model_dump(),
        "booking_result": booking_result,
        "booking_record": booking_record,
        "confirmation_en": confirmation.message_en,
        "confirmation_te": confirmation.message_te,
        "confirmation_localized": confirmation.message_localized,
    }


@app.get("/agent-book/status/{job_id}")
def get_agent_booking_status(job_id: str) -> dict:
    job = snapshot_agent_job(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Booking job was not found.")
    return job


@app.post("/verify-price", response_model=PriceCheckResult)
def verify_price(
    file: Optional[UploadFile] = File(None),
    fertilizer_text: Optional[str] = Form(None),
    quoted_price: Optional[float] = Form(None),
    language: str = Form("en"),
) -> PriceCheckResult:
    if file is None and not fertilizer_text and quoted_price is None:
        raise HTTPException(
            status_code=422,
            detail="Provide a fertilizer image, fertilizer text, or quoted price.",
        )

    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=503, detail="GEMINI_API_KEY is not configured.")

    normalized_lang = normalize_language(language)
    prompt = (
        "Identify the exact fertilizer product and pack size from the supplied image/text. "
        "Use the provided Government of India MRP list as the primary reference. Only classify "
        "an item as government_declared when the product AND pack size match an entry in that list; "
        "return its exact id and listed price. Do not map a different product to the nearest entry. "
        "For a product not listed (including bio-fertilizer, liquid, or specialty products), use "
        "mrp_status='market_estimate', matched_mrp_id='MARKET-ESTIMATE', and give a realistic "
        "typical Indian retail price in INR for that exact product and pack size in official_mrp. "
        "This is a market benchmark, not a government-declared MRP. In explanation_en AND "
        "explanation_localized explicitly say whether a government-declared MRP applies; for an "
        "unlisted item state that it is market-priced and the comparison uses an estimated typical "
        "retail price, not statutory MRP. Explain the estimate is indicative. Also provide a simple "
        "Telugu explanation in explanation_te. Return a PriceCheckResult using the JSON schema. "
        "Use the supplied quoted price exactly when present; if absent, use 0. Set "
        "overcharge_amount=max(quoted_price-official_mrp,0) and is_overcharged=(quoted_price>official_mrp). "
        "When quoted_price is 0, set is_overcharged=false and overcharge_amount=0.\n\n"
        f"Official MRP data:\n{json.dumps(mrp_data, ensure_ascii=False)}\n\n"
        f"User's fertilizer description: {fertilizer_text or '(not provided)'}\n"
        f"User's quoted price in INR: {quoted_price if quoted_price is not None else 'not provided; use 0'}\n"
        f"The localized explanation language is {LANGUAGE_NAMES[normalized_lang]} ({normalized_lang})."
    )

    contents: list = [prompt]
    if file is not None:
        image_bytes = file.file.read()
        if not image_bytes:
            raise HTTPException(status_code=400, detail="The uploaded image is empty.")
        mime_type = file.content_type or "application/octet-stream"
        contents.append(types.Part.from_bytes(data=image_bytes, mime_type=mime_type))

    try:
        client = genai.Client(api_key=api_key, http_options={"api_version": "v1beta"})
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=contents,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=PriceCheckResult,
            ),
        )
        if response.parsed is not None:
            result = response.parsed
            result = result if isinstance(result, PriceCheckResult) else PriceCheckResult.model_validate(result)
            return finalize_price_result(result, quoted_price)
        if response.text:
            result = PriceCheckResult.model_validate_json(response.text)
            return finalize_price_result(result, quoted_price)
        raise ValueError("Gemini returned an empty response")
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Price verification failed: {exc}") from exc


def read_complaints() -> list[dict]:
    if not COMPLAINTS_FILE.exists():
        return []
    try:
        with COMPLAINTS_FILE.open("r", encoding="utf-8") as complaints_file:
            records = json.load(complaints_file)
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=500, detail="complaints.json contains invalid JSON") from exc
    if not isinstance(records, list):
        raise HTTPException(status_code=500, detail="complaints.json must contain a JSON list")
    return records


@app.post("/file-complaint")
def file_complaint(complaint: ComplaintRequest) -> dict:
    with COMPLAINTS_LOCK:
        records = read_complaints()
        saved = {
            "id": f"AGRI-IN-2026-{secrets.randbelow(10000):04d}",
            **complaint.model_dump(),
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        records.append(saved)
        temporary_file = COMPLAINTS_FILE.with_suffix(".json.tmp")
        try:
            with temporary_file.open("w", encoding="utf-8") as complaints_file:
                json.dump(records, complaints_file, ensure_ascii=False, indent=2)
                complaints_file.write("\n")
            temporary_file.replace(COMPLAINTS_FILE)
        except OSError as exc:
            raise HTTPException(status_code=500, detail="Could not save the complaint") from exc
        return saved


@app.get("/complaints")
def get_complaints() -> list[dict]:
    with COMPLAINTS_LOCK:
        return read_complaints()