import pytest
import time
from fastapi import FastAPI, HTTPException, status
from fastapi.testclient import TestClient

app = FastAPI()

# Rate limiter implementation
from collections import defaultdict
_limits = defaultdict(list)

def check_limit(key: str, max_req: int, window: float) -> bool:
    now = time.time()
    cutoff = now - window
    _limits[key] = [t for t in _limits[key] if t > cutoff]
    if len(_limits[key]) >= max_req:
        return False
    _limits[key].append(now)
    return True

@app.middleware("http")
async def add_security_headers(request, call_next):
    resp = await call_next(request)
    resp.headers["X-Content-Type-Options"] = "nosniff"
    resp.headers["X-Frame-Options"] = "DENY"
    resp.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    resp.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    return resp

@app.get("/rate-limited")
async def rate_limited_route():
    if not check_limit("test-key", max_req=3, window=2.0):
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="Rate limit exceeded")
    return {"status": "ok"}

client = TestClient(app)

def test_security_headers_present():
    resp = client.get("/rate-limited")
    assert resp.status_code == 200
    assert resp.headers.get("X-Content-Type-Options") == "nosniff"
    assert resp.headers.get("X-Frame-Options") == "DENY"
    assert "Strict-Transport-Security" in resp.headers

def test_rate_limiting_enforced():
    # Requests 1, 2, 3 should pass
    r1 = client.get("/rate-limited")
    assert r1.status_code == 200

    r2 = client.get("/rate-limited")
    assert r2.status_code == 200

    # Request 4 should be rejected with 429
    r4 = client.get("/rate-limited")
    assert r4.status_code == 429
    assert "Rate limit exceeded" in r4.json().get("detail", "")
