from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import secrets
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import jwt
import httpx
from passlib.context import CryptContext


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

ADMIN_EMAIL = os.environ['ADMIN_EMAIL']
ADMIN_PASSWORD = os.environ['ADMIN_PASSWORD']
ADMIN_EMAILS = {e.strip().lower() for e in os.environ.get('ADMIN_EMAILS', ADMIN_EMAIL).split(',') if e.strip()}
APPLE_AUDIENCES = {a.strip() for a in os.environ.get('APPLE_AUDIENCES', '').split(',') if a.strip()}

EMERGENT_SESSION_URL = "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data"
APPLE_JWKS_URL = "https://appleid.apple.com/auth/keys"
APPLE_ISSUER = "https://appleid.apple.com"
SESSION_DAYS = 7

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

app = FastAPI()
api_router = APIRouter(prefix="/api")
logger = logging.getLogger(__name__)


def now_utc() -> str:
    return datetime.now(timezone.utc).isoformat()


def new_user_id() -> str:
    return f"user_{uuid.uuid4().hex[:12]}"


def role_for_email(email: Optional[str]) -> str:
    if email and email.lower() in ADMIN_EMAILS:
        return "company_admin"
    return "customer"


# ----------------- Models -----------------
class QuoteCreate(BaseModel):
    customer_name: str
    customer_phone: str
    customer_email: Optional[str] = ""
    address: str
    delivery_location: str
    request_type: str
    category: str
    product: str
    quantity: str
    unit: str
    specification: Optional[str] = ""
    delivery_time: str


class QuoteReply(BaseModel):
    price: Optional[str] = ""
    message: str


class Quote(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    code: str = Field(default_factory=lambda: uuid.uuid4().hex[:6].upper())
    customer_name: str
    customer_phone: str
    customer_email: str = ""
    address: str
    delivery_location: str
    request_type: str
    category: str
    product: str
    quantity: str
    unit: str
    specification: str = ""
    delivery_time: str
    status: str = "pending"
    reply_price: str = ""
    reply_message: str = ""
    replied_at: Optional[str] = None
    customer_user_id: Optional[str] = None
    created_at: str = Field(default_factory=now_utc)


class LoginInput(BaseModel):
    email: EmailStr
    password: str


class GoogleSessionInput(BaseModel):
    session_id: str


class AppleInput(BaseModel):
    identity_token: str
    name: Optional[str] = None
    email: Optional[str] = None


class CompanySettings(BaseModel):
    name: str = "INTERNEW Tecnologia em Saúde"
    tagline: str = "Locação e venda de equipamentos médicos, acessórios e consumíveis"
    whatsapp: str = "5548999999999"
    phone: str = ""
    email: str = "contato@internew.com.br"
    about: str = ("Há mais de 33 anos no mercado, com sede em Santa Catarina e atuação no "
                  "Rio de Janeiro e demais estados do Brasil, atendendo os setores público e privado.")


# ----------------- Session helpers -----------------
async def create_session(user_id: str) -> str:
    token = secrets.token_urlsafe(32)
    await db.user_sessions.insert_one({
        "session_token": token,
        "user_id": user_id,
        "created_at": datetime.now(timezone.utc),
        "expires_at": datetime.now(timezone.utc) + timedelta(days=SESSION_DAYS),
    })
    return token


def public_user(u: dict) -> dict:
    return {
        "user_id": u["user_id"],
        "email": u.get("email", ""),
        "name": u.get("name", ""),
        "picture": u.get("picture", ""),
        "role": u.get("role", "customer"),
    }


async def get_current_user(request: Request) -> dict:
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Não autenticado")
    token = auth.split(" ", 1)[1].strip()
    session = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=401, detail="Sessão inválida")
    exp = session["expires_at"]
    if exp.tzinfo is None:
        exp = exp.replace(tzinfo=timezone.utc)
    if exp < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Sessão expirada")
    user = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Usuário não encontrado")
    return user


async def get_current_admin(request: Request) -> dict:
    user = await get_current_user(request)
    if user.get("role") != "company_admin":
        raise HTTPException(status_code=403, detail="Acesso restrito à empresa")
    return user


async def get_optional_user(request: Request) -> Optional[dict]:
    try:
        return await get_current_user(request)
    except HTTPException:
        return None


# ----------------- Startup -----------------
@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True, sparse=True)
    await db.users.create_index("user_id", unique=True)
    await db.users.create_index("apple_sub", unique=True, sparse=True)
    await db.user_sessions.create_index("session_token", unique=True)
    await db.user_sessions.create_index("expires_at", expireAfterSeconds=0)

    admin = await db.users.find_one({"email": ADMIN_EMAIL.lower()})
    if not admin:
        await db.users.insert_one({
            "user_id": new_user_id(),
            "email": ADMIN_EMAIL.lower(),
            "name": "INTERNEW",
            "picture": "",
            "role": "company_admin",
            "password_hash": pwd_context.hash(ADMIN_PASSWORD),
            "providers": ["password"],
            "created_at": now_utc(),
        })
        logger.info("Seeded admin %s", ADMIN_EMAIL)

    settings = await db.settings.find_one({"_id": "company"})
    if not settings:
        doc = CompanySettings().dict()
        doc["_id"] = "company"
        await db.settings.insert_one(doc)


# ----------------- Public routes -----------------
@api_router.get("/")
async def root():
    return {"message": "INTERNEW Orçamentos API"}


@api_router.get("/company", response_model=CompanySettings)
async def get_company():
    doc = await db.settings.find_one({"_id": "company"})
    if not doc:
        return CompanySettings()
    doc.pop("_id", None)
    return CompanySettings(**doc)


@api_router.post("/quotes", response_model=Quote)
async def create_quote(data: QuoteCreate, user: Optional[dict] = Depends(get_optional_user)):
    quote = Quote(**data.dict())
    if user:
        quote.customer_user_id = user["user_id"]
        if not quote.customer_email and user.get("email"):
            quote.customer_email = user["email"]
    await db.quotes.insert_one(quote.dict())
    return quote


@api_router.get("/quotes/track/{code}", response_model=Quote)
async def track_quote(code: str):
    doc = await db.quotes.find_one({"code": code.upper()}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Orçamento não encontrado")
    return Quote(**doc)


# ----------------- Auth routes -----------------
@api_router.post("/auth/login")
async def login(data: LoginInput):
    user = await db.users.find_one({"email": data.email.lower()})
    valid = user and user.get("password_hash") and pwd_context.verify(data.password, user["password_hash"])
    if not valid:
        raise HTTPException(status_code=401, detail="Credenciais inválidas")
    token = await create_session(user["user_id"])
    return {"session_token": token, "user": public_user(user)}


@api_router.post("/auth/session")
async def google_session(data: GoogleSessionInput):
    async with httpx.AsyncClient(timeout=15) as hc:
        resp = await hc.get(EMERGENT_SESSION_URL, headers={"X-Session-ID": data.session_id})
    if resp.status_code != 200:
        raise HTTPException(status_code=401, detail="Sessão do Google inválida")
    info = resp.json()
    email = (info.get("email") or "").lower()
    name = info.get("name") or ""
    picture = info.get("picture") or ""

    existing = await db.users.find_one({"email": email}) if email else None
    if existing:
        user_id = existing["user_id"]
        await db.users.update_one({"user_id": user_id}, {"$set": {
            "name": name or existing.get("name", ""),
            "picture": picture or existing.get("picture", ""),
        }, "$addToSet": {"providers": "google"}})
        user = await db.users.find_one({"user_id": user_id})
    else:
        user = {
            "user_id": new_user_id(),
            "email": email,
            "name": name,
            "picture": picture,
            "role": role_for_email(email),
            "providers": ["google"],
            "created_at": now_utc(),
        }
        await db.users.insert_one(user)

    token = await create_session(user["user_id"])
    return {"session_token": token, "user": public_user(user)}


@api_router.post("/auth/apple")
async def apple_login(data: AppleInput):
    try:
        jwk_client = jwt.PyJWKClient(APPLE_JWKS_URL)
        signing_key = jwk_client.get_signing_key_from_jwt(data.identity_token)
        claims = jwt.decode(
            data.identity_token,
            signing_key.key,
            algorithms=["RS256"],
            audience=list(APPLE_AUDIENCES) if APPLE_AUDIENCES else None,
            issuer=APPLE_ISSUER,
            options={"verify_aud": bool(APPLE_AUDIENCES)},
        )
    except Exception as e:  # noqa: BLE001
        logger.warning("Apple token verification failed: %s", e)
        raise HTTPException(status_code=401, detail="Token da Apple inválido")

    apple_sub = claims.get("sub")
    if not apple_sub:
        raise HTTPException(status_code=401, detail="Token da Apple inválido")
    email = (data.email or claims.get("email") or "").lower()

    existing = await db.users.find_one({"apple_sub": apple_sub})
    if existing:
        user = existing
    else:
        user = {
            "user_id": new_user_id(),
            "apple_sub": apple_sub,
            "email": email,
            "name": data.name or "",
            "picture": "",
            "role": role_for_email(email),
            "providers": ["apple"],
            "created_at": now_utc(),
        }
        await db.users.insert_one(user)

    token = await create_session(user["user_id"])
    return {"session_token": token, "user": public_user(user)}


@api_router.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return public_user(user)


@api_router.post("/auth/logout")
async def logout(request: Request):
    auth = request.headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        token = auth.split(" ", 1)[1].strip()
        await db.user_sessions.delete_one({"session_token": token})
    return {"ok": True}


@api_router.get("/my/quotes", response_model=List[Quote])
async def my_quotes(user: dict = Depends(get_current_user)):
    q = {"$or": [{"customer_user_id": user["user_id"]}]}
    if user.get("email"):
        q["$or"].append({"customer_email": user["email"]})
    docs = await db.quotes.find(q, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return [Quote(**d) for d in docs]


# ----------------- Admin routes -----------------
@api_router.get("/admin/quotes", response_model=List[Quote])
async def list_quotes(status_filter: Optional[str] = None, admin: dict = Depends(get_current_admin)):
    query = {}
    if status_filter in ("pending", "responded"):
        query["status"] = status_filter
    docs = await db.quotes.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return [Quote(**d) for d in docs]


@api_router.get("/admin/quotes/stats")
async def stats(admin: dict = Depends(get_current_admin)):
    total = await db.quotes.count_documents({})
    pending = await db.quotes.count_documents({"status": "pending"})
    responded = await db.quotes.count_documents({"status": "responded"})
    return {"total": total, "pending": pending, "responded": responded}


@api_router.get("/admin/quotes/{quote_id}", response_model=Quote)
async def get_quote(quote_id: str, admin: dict = Depends(get_current_admin)):
    doc = await db.quotes.find_one({"id": quote_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Orçamento não encontrado")
    return Quote(**doc)


@api_router.post("/admin/quotes/{quote_id}/reply", response_model=Quote)
async def reply_quote(quote_id: str, data: QuoteReply, admin: dict = Depends(get_current_admin)):
    result = await db.quotes.update_one(
        {"id": quote_id},
        {"$set": {
            "reply_price": data.price or "",
            "reply_message": data.message,
            "status": "responded",
            "replied_at": now_utc(),
        }},
    )
    if result.matched_count != 1:
        raise HTTPException(status_code=404, detail="Orçamento não encontrado")
    doc = await db.quotes.find_one({"id": quote_id}, {"_id": 0})
    return Quote(**doc)


@api_router.put("/admin/company", response_model=CompanySettings)
async def update_company(data: CompanySettings, admin: dict = Depends(get_current_admin)):
    doc = data.dict()
    await db.settings.update_one({"_id": "company"}, {"$set": doc}, upsert=True)
    return data


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
