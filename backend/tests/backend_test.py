"""Backend API tests for INTERNEW Orçamentos."""
import os
import pytest
import requests

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://whatsapp-quote-app.preview.emergentagent.com').rstrip('/')
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@internew.com.br"
ADMIN_PASSWORD = "Internew@2026"


@pytest.fixture(scope="module")
def client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def token(client):
    r = client.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


@pytest.fixture(scope="module")
def auth_client(token):
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json", "Authorization": f"Bearer {token}"})
    return s


# ------ Public routes ------
class TestPublic:
    def test_get_company(self, client):
        r = client.get(f"{API}/company")
        assert r.status_code == 200
        data = r.json()
        assert "name" in data and "whatsapp" in data
        assert "INTERNEW" in data["name"]

    def test_create_and_track_quote(self, client):
        payload = {
            "customer_name": "TEST_Hospital",
            "customer_phone": "48999990000",
            "customer_email": "test@example.com",
            "address": "Rua X, 123 - Florianopolis/SC",
            "delivery_location": "UTI 3o andar",
            "request_type": "Locação",
            "category": "Equipamento",
            "product": "Monitor multiparâmetro",
            "quantity": "3",
            "unit": "Unidade",
            "specification": "Test spec",
            "delivery_time": "15 dias",
        }
        r = client.post(f"{API}/quotes", json=payload)
        assert r.status_code == 200, r.text
        q = r.json()
        assert len(q["code"]) == 6
        assert q["status"] == "pending"
        pytest.quote_id = q["id"]
        pytest.quote_code = q["code"]

        # track
        r2 = client.get(f"{API}/quotes/track/{q['code']}")
        assert r2.status_code == 200
        assert r2.json()["id"] == q["id"]

    def test_track_not_found(self, client):
        r = client.get(f"{API}/quotes/track/ZZZZZZ")
        assert r.status_code == 404


# ------ Auth ------
class TestAuth:
    def test_login_success(self, client):
        r = client.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
        assert r.status_code == 200
        assert "access_token" in r.json()

    def test_login_wrong_password(self, client):
        r = client.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": "wrong"})
        assert r.status_code == 401

    def test_me_no_token(self, client):
        r = client.get(f"{API}/auth/me")
        assert r.status_code == 401

    def test_me_with_token(self, auth_client):
        r = auth_client.get(f"{API}/auth/me")
        assert r.status_code == 200
        assert r.json()["email"] == ADMIN_EMAIL


# ------ Admin ------
class TestAdmin:
    def test_list_quotes_unauth(self, client):
        r = client.get(f"{API}/admin/quotes")
        assert r.status_code == 401

    def test_list_quotes(self, auth_client):
        r = auth_client.get(f"{API}/admin/quotes")
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_filter_pending(self, auth_client):
        r = auth_client.get(f"{API}/admin/quotes?status_filter=pending")
        assert r.status_code == 200
        for q in r.json():
            assert q["status"] == "pending"

    def test_stats(self, auth_client):
        r = auth_client.get(f"{API}/admin/quotes/stats")
        assert r.status_code == 200
        d = r.json()
        assert set(d.keys()) >= {"total", "pending", "responded"}
        assert d["total"] == d["pending"] + d["responded"]

    def test_get_single(self, auth_client):
        r = auth_client.get(f"{API}/admin/quotes/{pytest.quote_id}")
        assert r.status_code == 200
        assert r.json()["id"] == pytest.quote_id

    def test_reply_and_track_shows_reply(self, auth_client, client):
        r = auth_client.post(
            f"{API}/admin/quotes/{pytest.quote_id}/reply",
            json={"price": "R$ 1.500,00", "message": "TEST reply message"},
        )
        assert r.status_code == 200, r.text
        assert r.json()["status"] == "responded"
        assert r.json()["reply_message"] == "TEST reply message"

        # verify via public tracking
        r2 = client.get(f"{API}/quotes/track/{pytest.quote_code}")
        assert r2.status_code == 200
        d = r2.json()
        assert d["status"] == "responded"
        assert d["reply_message"] == "TEST reply message"
        assert d["reply_price"] == "R$ 1.500,00"

    def test_filter_responded(self, auth_client):
        r = auth_client.get(f"{API}/admin/quotes?status_filter=responded")
        assert r.status_code == 200
        for q in r.json():
            assert q["status"] == "responded"

    def test_update_company(self, auth_client):
        r0 = auth_client.get(f"{API}/company")  # this endpoint is public
        base = requests.get(f"{API}/company").json()
        payload = dict(base)
        payload["tagline"] = "TEST tagline updated"
        r = auth_client.put(f"{API}/admin/company", json=payload)
        assert r.status_code == 200
        assert r.json()["tagline"] == "TEST tagline updated"
        # restore
        auth_client.put(f"{API}/admin/company", json=base)

    def test_update_company_unauth(self, client):
        r = client.put(f"{API}/admin/company", json={"name": "x", "tagline": "y", "whatsapp": "1", "email": "a@b.com", "about": ""})
        assert r.status_code == 401
