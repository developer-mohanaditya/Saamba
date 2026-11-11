"""
Cryptographic Supabase JWT Authentication & Security Verification for Saamba Backend.
Validates Bearer tokens, extracts verified user claims, and provides FastAPI dependencies.
"""

import os
import time
import hashlib
import logging
from typing import Optional, Dict, Tuple, Any
import httpx
import jwt
from fastapi import Header, HTTPException, status

logger = logging.getLogger("saamba.security")

SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://swapfqsivtuqbrczrmns.supabase.co").rstrip("/")
SUPABASE_ANON_KEY = os.environ.get("SUPABASE_ANON_KEY", "sb_publishable_Zwuj9xis9GU1DbzH2MCR-A_FwxGcKhU")
SUPABASE_JWT_SECRET = os.environ.get("SUPABASE_JWT_SECRET")

# In-memory token cache: { token_hash: (user_data, expire_timestamp) }
_token_cache: Dict[str, Tuple[Dict[str, Any], float]] = {}
CACHE_TTL_SECONDS = 300  # Cache verified tokens for 5 minutes

def clear_token_cache() -> None:
    """Clear in-memory token cache (primarily for tests)."""
    global _token_cache
    _token_cache = {}

def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()

async def verify_supabase_token(token: str) -> Dict[str, Any]:
    """
    Cryptographically verify a Supabase JWT token.
    1. Checks in-memory cache first for fast path (< 0.1ms).
    2. If SUPABASE_JWT_SECRET is configured, verifies signature locally via PyJWT.
    3. Otherwise verifies against Supabase Auth API (/auth/v1/user).
    """
    if not token or not isinstance(token, str):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token_hash = _hash_token(token)
    now = time.time()

    # 1. Fast cache check
    cached = _token_cache.get(token_hash)
    if cached:
        user_data, expire_time = cached
        if now < expire_time:
            return user_data
        else:
            _token_cache.pop(token_hash, None)

    # 2. Local JWT secret verification if available
    if SUPABASE_JWT_SECRET:
        try:
            payload = jwt.decode(
                token,
                SUPABASE_JWT_SECRET,
                algorithms=["HS256"],
                options={"verify_aud": False}
            )
            user_id = payload.get("sub")
            if not user_id:
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token claims: missing subject")
            user_data = {
                "id": user_id,
                "email": payload.get("email"),
                "role": payload.get("role", "authenticated"),
                "app_metadata": payload.get("app_metadata", {}),
                "user_metadata": payload.get("user_metadata", {})
            }
            exp = payload.get("exp", now + CACHE_TTL_SECONDS)
            ttl = min(CACHE_TTL_SECONDS, max(10, exp - now))
            _token_cache[token_hash] = (user_data, now + ttl)
            return user_data
        except jwt.PyJWTError as e:
            logger.debug(f"Local JWT verification failed: {e}")

    # 3. Remote verification via Supabase Auth API
    verify_url = f"{SUPABASE_URL}/auth/v1/user"
    headers = {
        "Authorization": f"Bearer {token}",
        "apikey": SUPABASE_ANON_KEY
    }

    try:
        async with httpx.AsyncClient(timeout=6.0) as client:
            resp = await client.get(verify_url, headers=headers)
            if resp.status_code != 200:
                logger.warning(f"Supabase auth validation returned HTTP {resp.status_code}")
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid or expired authentication token",
                    headers={"WWW-Authenticate": "Bearer"},
                )
            data = resp.json()
            user_id = data.get("id")
            if not user_id:
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid user object from identity provider")

            user_data = {
                "id": user_id,
                "email": data.get("email"),
                "role": data.get("role", "authenticated"),
                "app_metadata": data.get("app_metadata", {}),
                "user_metadata": data.get("user_metadata", {})
            }

            _token_cache[token_hash] = (user_data, now + CACHE_TTL_SECONDS)
            return user_data
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error contacting Supabase Auth API: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication verification failed",
            headers={"WWW-Authenticate": "Bearer"},
        )

async def get_current_user(authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
    """
    FastAPI dependency that enforces a valid Supabase Bearer token.
    Raises HTTP 401 Unauthorized if missing, malformed, or invalid.
    """
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header is required",
            headers={"WWW-Authenticate": "Bearer"},
        )

    parts = authorization.split(" ", 1)
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Authorization header format. Expected 'Bearer <token>'.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = parts[1].strip()
    return await verify_supabase_token(token)

async def get_optional_user(authorization: Optional[str] = Header(None)) -> Optional[Dict[str, Any]]:
    """
    FastAPI dependency that extracts user context if a valid Bearer token is present,
    or returns None without raising 401.
    """
    if not authorization or not authorization.lower().startswith("bearer "):
        return None
    token = authorization.split(" ", 1)[1].strip()
    try:
        return await verify_supabase_token(token)
    except HTTPException:
        return None
