import os
os.environ["ADE_SECRET_KEY"] = "test_secret_key_needs_to_be_32_characters_long_minimum!"

from fastapi.testclient import TestClient
from web.backend.app import app

client = TestClient(app)

def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}

def test_auth_login_signup():
    client.post("/auth/signup", json={"email": "test@apex.com", "password": "password123"})
    res_login = client.post("/auth/login", json={"email": "test@apex.com", "password": "password123"})
    assert res_login.status_code == 200
    print(res_login.json())
    assert "access_token" in res_login.json() or "error" not in res_login.json()

    res_login_bad = client.post("/auth/login", json={"email": "test@apex.com", "password": "wrong"})
    assert res_login_bad.status_code == 200
    assert "error" in res_login_bad.json()

def test_trades_run_requires_auth():
    response = client.post("/trades/run")
    assert response.status_code == 401

def test_trades_run_with_auth():
    # Ensure fresh user
    import uuid
    email = f"auth{uuid.uuid4().hex[:6]}@apex.com"
    client.post("/auth/signup", json={"email": email, "password": "password123"})
    res_login = client.post("/auth/login", json={"email": email, "password": "password123"})
    token = res_login.json()["access_token"]
    
    response = client.post("/trades/run", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    assert "trades" in response.json()
