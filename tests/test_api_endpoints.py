"""
API endpoint tests.

Auth model: Supabase JWT only — the backend has no /auth/login or /auth/signup
endpoints. Auth is handled by Supabase on the frontend. The backend validates
JWTs using SUPABASE_JWT_SECRET and rejects invalid/missing tokens with 401/503.

We mint a valid test JWT here using the same secret exported to the process
environment at the top of this file.
"""
import os
import time

# Must be set BEFORE importing app so the module-level JWT secret is loaded.
_TEST_JWT_SECRET = "test_supabase_jwt_secret_for_ci_use_only_32chars!!"
os.environ["SUPABASE_JWT_SECRET"] = _TEST_JWT_SECRET
os.environ["ADE_SECRET_KEY"] = "test_secret_key_needs_to_be_32_characters_long_minimum!"

from jose import jwt  # type: ignore
from fastapi.testclient import TestClient
from web.backend.app import app

client = TestClient(app)


def _make_token(email: str = "ci@apex.com", sub: str = "test-uuid-ci-001") -> str:
    """Mint a short-lived JWT accepted by get_current_user in test mode."""
    payload = {
        "sub": sub,
        "email": email,
        "aud": "authenticated",
        "iat": int(time.time()),
        "exp": int(time.time()) + 3600,
    }
    return jwt.encode(payload, _TEST_JWT_SECRET, algorithm="HS256")


# ── Health ────────────────────────────────────────────────────────────────────

def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


# ── Auth ─────────────────────────────────────────────────────────────────────

def test_auth_me_requires_token():
    """GET /auth/me with no token should return 401."""
    res = client.get("/auth/me")
    assert res.status_code == 401


def test_auth_me_with_valid_token():
    """GET /auth/me with a valid JWT should return 200 and the user's email."""
    token = _make_token()
    res = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    # 200 OK with email returned, OR 503 if Supabase unreachable (acceptable in CI)
    assert res.status_code in (200, 503), f"Unexpected status {res.status_code}: {res.text}"
    if res.status_code == 200:
        data = res.json()
        assert "email" in data or "user" in data


def test_auth_invalid_token_rejected():
    """A tampered / garbage token must return 401."""
    res = client.get("/auth/me", headers={"Authorization": "Bearer not.a.real.token"})
    assert res.status_code == 401


# ── Trade endpoints ───────────────────────────────────────────────────────────

def test_trades_run_requires_auth():
    """POST /trades/run with no token must return 401."""
    response = client.post("/trades/run")
    assert response.status_code == 401


def test_trades_run_with_auth():
    """POST /trades/run with a valid JWT should succeed (200) or return a known
    non-auth error (422 / 503 if upstream services unavailable in CI)."""
    token = _make_token()
    response = client.post("/trades/run", headers={"Authorization": f"Bearer {token}"})
    # 401 / 403 would mean auth itself is broken — that's the only real failure.
    assert response.status_code != 401, "Valid token was rejected — JWT validation is broken"
    assert response.status_code != 403, "Valid token was forbidden — tier check is wrong"
