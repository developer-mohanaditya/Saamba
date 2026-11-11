import pytest
import time
from unittest.mock import patch, AsyncMock
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.testclient import TestClient

# We will test auth_security.get_current_user and verify_supabase_token
from auth_security import get_current_user, verify_supabase_token, clear_token_cache

app = FastAPI()

@app.get("/protected")
async def protected_endpoint(user: dict = Depends(get_current_user)):
    return {"status": "ok", "user_id": user["id"], "email": user.get("email")}

client = TestClient(app)

def test_missing_auth_header_returns_401():
    response = client.get("/protected")
    assert response.status_code == status.HTTP_401_UNAUTHORIZED
    assert "Authorization" in response.json().get("detail", "")

def test_malformed_auth_header_returns_401():
    response = client.get("/protected", headers={"Authorization": "Basic 12345"})
    assert response.status_code == status.HTTP_401_UNAUTHORIZED

def test_invalid_bearer_token_returns_401():
    clear_token_cache()
    with patch("httpx.AsyncClient.get", return_value=AsyncMock(status_code=401, json=lambda: {"error": "invalid token"})):
        response = client.get("/protected", headers={"Authorization": "Bearer bad_token_12345"})
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

def test_valid_bearer_token_returns_user_data():
    clear_token_cache()
    mock_user_data = {
        "id": "user-uuid-12345",
        "email": "test.user@saamba.ai",
        "role": "authenticated"
    }
    with patch("httpx.AsyncClient.get", return_value=AsyncMock(status_code=200, json=lambda: mock_user_data)):
        response = client.get("/protected", headers={"Authorization": "Bearer valid_jwt_token_abc"})
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["status"] == "ok"
        assert data["user_id"] == "user-uuid-12345"
        assert data["email"] == "test.user@saamba.ai"

def test_token_caching_avoids_repeated_network_calls():
    clear_token_cache()
    mock_user_data = {
        "id": "cached-user-999",
        "email": "cached@saamba.ai",
    }
    with patch("httpx.AsyncClient.get", return_value=AsyncMock(status_code=200, json=lambda: mock_user_data)) as mock_get:
        # First call hits mock
        r1 = client.get("/protected", headers={"Authorization": "Bearer cached_jwt_token_xyz"})
        assert r1.status_code == 200
        assert mock_get.call_count == 1

        # Second call should use in-memory cache and not call mock
        r2 = client.get("/protected", headers={"Authorization": "Bearer cached_jwt_token_xyz"})
        assert r2.status_code == 200
        assert mock_get.call_count == 1
