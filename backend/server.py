from fastapi import FastAPI, APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import jwt
from passlib.context import CryptContext


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Auth config
JWT_SECRET = os.environ['JWT_SECRET']
JWT_ALGO = "HS256"
TOKEN_HOURS = 24 * 7
ADMIN_EMAIL = os.environ['ADMIN_EMAIL']
ADMIN_PASSWORD = os.environ['ADMIN_PASSWORD']

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer(auto_error=False)

app = FastAPI()
api_router = APIRouter(prefix="/api")

logger = logging.getLogger(__name__)


def now_utc() -> str:
    return datetime.now(timezone.utc).isoformat()


# ----------------- Models -----------------
class QuoteCreate(BaseModel):
    customer_name: str
    customer_phone: str
    customer_email: Optional[str] = ""
    address: str
    delivery_location: str
    request_type: str            # "Locação" | "Venda"
    category: str                # "Equipamento" | "Acessório" | "Consumível"
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
    status: str = "pending"       # pending | responded
    reply_price: str = ""
    reply_message: str = ""
    replied_at: Optional[str] = None
    created_at: str = Field(default_factory=now_utc)


class LoginInput(BaseModel):
    email: EmailStr
    password: str


class CompanySettings(BaseModel):
    name: str = "INTERNEW Tecnologia em Saúde"
    tagline: str = "Locação e venda de equipamentos médicos, acessórios e consumíveis"
    whatsapp: str = "5548999999999"        # digits only, country code included
    phone: str = ""
    email: str = "contato@internew.com.br"
    about: str = ("Há mais de 33 anos no mercado, com sede em Santa Catarina e atuação no "
                  "Rio de Janeiro e demais estados do Brasil, atendendo os setores público e privado.")


# ----------------- Auth helpers -----------------
def create_token(sub: str) -> str:
    payload = {
        "sub": sub,
        "role": "company_admin",
        "exp": datetime.now(timezone.utc) + timedelta(hours=TOKEN_HOURS),
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGO)


async def get_current_admin(creds: Optional[HTTPAuthorizationCredentials] = Depends(security)):
    if creds is None:
        raise HTTPException(status_code=401, detail="Não autenticado")
    try:
        payload = jwt.decode(creds.credentials, JWT_SECRET, algorithms=[JWT_ALGO])
        if payload.get("role") != "company_admin":
            raise HTTPException(status_code=401, detail="Token inválido")
        return payload["sub"]
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Sessão expirada ou inválida")


# ----------------- Startup: seed admin & settings -----------------
@app.on_event("startup")
async def seed():
    existing = await db.admins.find_one({"email": ADMIN_EMAIL.lower()})
    if not existing:
        await db.admins.insert_one({
            "id": str(uuid.uuid4()),
            "email": ADMIN_EMAIL.lower(),
            "password_hash": pwd_context.hash(ADMIN_PASSWORD),
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
async def create_quote(data: QuoteCreate):
    quote = Quote(**data.dict())
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
    admin = await db.admins.find_one({"email": data.email.lower()})
    valid = admin and pwd_context.verify(data.password, admin["password_hash"])
    if not valid:
        raise HTTPException(status_code=401, detail="Credenciais inválidas")
    token = create_token(admin["id"])
    return {"access_token": token, "token_type": "bearer", "email": admin["email"]}


@api_router.get("/auth/me")
async def me(admin_id: str = Depends(get_current_admin)):
    admin = await db.admins.find_one({"id": admin_id}, {"_id": 0, "password_hash": 0})
    if not admin:
        raise HTTPException(status_code=404, detail="Admin não encontrado")
    return admin


# ----------------- Admin routes -----------------
@api_router.get("/admin/quotes", response_model=List[Quote])
async def list_quotes(status_filter: Optional[str] = None, admin_id: str = Depends(get_current_admin)):
    query = {}
    if status_filter in ("pending", "responded"):
        query["status"] = status_filter
    docs = await db.quotes.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return [Quote(**d) for d in docs]


@api_router.get("/admin/quotes/stats")
async def stats(admin_id: str = Depends(get_current_admin)):
    total = await db.quotes.count_documents({})
    pending = await db.quotes.count_documents({"status": "pending"})
    responded = await db.quotes.count_documents({"status": "responded"})
    return {"total": total, "pending": pending, "responded": responded}


@api_router.get("/admin/quotes/{quote_id}", response_model=Quote)
async def get_quote(quote_id: str, admin_id: str = Depends(get_current_admin)):
    doc = await db.quotes.find_one({"id": quote_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Orçamento não encontrado")
    return Quote(**doc)


@api_router.post("/admin/quotes/{quote_id}/reply", response_model=Quote)
async def reply_quote(quote_id: str, data: QuoteReply, admin_id: str = Depends(get_current_admin)):
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
async def update_company(data: CompanySettings, admin_id: str = Depends(get_current_admin)):
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
