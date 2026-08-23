"""Backend API tests for INTERNEW Orçamentos — session-token auth model."""
import os
import pytest
import requests

BASE_URL = os.environ['EXPO_PUBLIC_BACKEND_URL'].rstrip('/')
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@internew.com.br"
ADMIN_PASSWORD = "Internew@2026"


@pytest.fixture(scope="module")
def client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def admin_token(client):
    r = client.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, r.text
    body = r.json()
    assert "session_token" in body, body
    assert body["user"]["role"] == "company_admin"
    return body["session_token"]


@pytest.fixture(scope="module")
def auth_client(admin_token):
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json", "Authorization": f"Bearer {admin_token}"})
    return s


# ------ Public routes ------
class TestPublic:
    def test_get_company(self, client):
        r = client.get(f"{API}/company")
        assert r.status_code == 200
        data = r.json()
        assert "INTERNEW" in data["name"]

    def test_create_and_track_quote_anonymous(self, client):
        payload = {
            "customer_name": "TEST_Hospital_Anon",
            "customer_phone": "48999990000",
            "customer_email": "test_anon@example.com",
            "address": "Rua X, 123",
            "delivery_location": "UTI",
            "request_type": "Locação",
            "category": "Equipamento",
            "product": "Monitor",
            "quantity": "3",
            "unit": "Unidade",
            "specification": "spec",
            "delivery_time": "15 dias",
        }
        r = client.post(f"{API}/quotes", json=payload)
        assert r.status_code == 200, r.text
        q = r.json()
        assert len(q["code"]) == 6
        assert q["status"] == "pending"
        assert q.get("customer_user_id") in (None, "")
        pytest.anon_quote_id = q["id"]
        pytest.anon_quote_code = q["code"]

        r2 = client.get(f"{API}/quotes/track/{q['code']}")
        assert r2.status_code == 200
        assert r2.json()["id"] == q["id"]

    def test_track_not_found(self, client):
        r = client.get(f"{API}/quotes/track/ZZZZZZ")
        assert r.status_code == 404


# ------ Auth: login/me/logout ------
class TestAuth:
    def test_login_success_returns_session_token(self, client):
        r = client.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
        assert r.status_code == 200
        d = r.json()
        assert "session_token" in d and isinstance(d["session_token"], str)
        assert d["user"]["email"] == ADMIN_EMAIL
        assert d["user"]["role"] == "company_admin"

    def test_login_wrong_password_401(self, client):
        r = client.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": "wrong"})
        assert r.status_code == 401

    def test_me_no_token_returns_401_not_403(self, client):
        r = client.get(f"{API}/auth/me")
        assert r.status_code == 401, f"expected 401 got {r.status_code}"

    def test_me_invalid_token_401(self, client):
        r = requests.get(f"{API}/auth/me", headers={"Authorization": "Bearer notarealtoken"})
        assert r.status_code == 401

    def test_me_with_token(self, auth_client):
        r = auth_client.get(f"{API}/auth/me")
        assert r.status_code == 200
        d = r.json()
        assert d["email"] == ADMIN_EMAIL
        assert d["role"] == "company_admin"

    def test_apple_invalid_token_401(self, client):
        r = client.post(f"{API}/auth/apple", json={"identity_token": "invalid.jwt.token"})
        assert r.status_code == 401

    def test_google_session_invalid_401(self, client):
        r = client.post(f"{API}/auth/session", json={"session_id": "definitely-not-valid-xyz"})
        assert r.status_code == 401

    def test_logout_invalidates_session(self, client):
        # login a fresh session
        r = client.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
        token = r.json()["session_token"]
        h = {"Authorization": f"Bearer {token}"}
        # confirm valid
        assert requests.get(f"{API}/auth/me", headers=h).status_code == 200
        # logout
        rl = requests.post(f"{API}/auth/logout", headers=h)
        assert rl.status_code == 200
        # now invalid
        r2 = requests.get(f"{API}/auth/me", headers=h)
        assert r2.status_code == 401


# ------ /my/quotes and quote linking ------
class TestMyQuotes:
    def test_my_quotes_requires_auth(self, client):
        r = client.get(f"{API}/my/quotes")
        assert r.status_code == 401

    def test_my_quotes_with_admin_token_returns_list(self, auth_client):
        r = auth_client.get(f"{API}/my/quotes")
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_authenticated_quote_is_linked_and_appears_in_my_quotes(self, auth_client, admin_token):
        payload = {
            "customer_name": "TEST_Linked",
            "customer_phone": "48988887777",
            "customer_email": "",
            "address": "Rua Y",
            "delivery_location": "Setor B",
            "request_type": "Venda",
            "category": "Consumível",
            "product": "Seringa",
            "quantity": "10",
            "unit": "Unidade",
            "specification": "",
            "delivery_time": "7 dias",
        }
        r = auth_client.post(f"{API}/quotes", json=payload)
        assert r.status_code == 200, r.text
        q = r.json()
        assert q.get("customer_user_id"), "quote should be linked to authenticated user"
        # email should be filled in from admin user
        assert q["customer_email"] == ADMIN_EMAIL

        # verify shows up in /my/quotes
        r2 = auth_client.get(f"{API}/my/quotes")
        assert r2.status_code == 200
        ids = [x["id"] for x in r2.json()]
        assert q["id"] in ids


# ------ Admin routes ------
class TestAdmin:
    def test_list_quotes_unauth_401(self, client):
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
        r = auth_client.get(f"{API}/admin/quotes/{pytest.anon_quote_id}")
        assert r.status_code == 200
        assert r.json()["id"] == pytest.anon_quote_id

    def test_reply_and_track(self, auth_client, client):
        r = auth_client.post(
            f"{API}/admin/quotes/{pytest.anon_quote_id}/reply",
            json={"price": "R$ 1.500,00", "message": "TEST reply msg"},
        )
        assert r.status_code == 200, r.text
        assert r.json()["status"] == "responded"

        r2 = client.get(f"{API}/quotes/track/{pytest.anon_quote_code}")
        d = r2.json()
        assert d["status"] == "responded"
        assert d["reply_message"] == "TEST reply msg"
        assert d["reply_price"] == "R$ 1.500,00"

    def test_update_company(self, auth_client):
        base = requests.get(f"{API}/company").json()
        payload = dict(base)
        payload["tagline"] = "TEST tagline updated"
        r = auth_client.put(f"{API}/admin/company", json=payload)
        assert r.status_code == 200
        assert r.json()["tagline"] == "TEST tagline updated"
        auth_client.put(f"{API}/admin/company", json=base)

    def test_update_company_unauth(self, client):
        r = client.put(
            f"{API}/admin/company",
            json={"name": "x", "tagline": "y", "whatsapp": "1", "email": "a@b.com", "about": ""},
        )
        assert r.status_code == 401
