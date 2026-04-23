import uuid
from datetime import datetime, timedelta, timezone
from typing import Literal

import bcrypt
from jose import JWTError, jwt

from app.config import Settings

TokenType = Literal["access", "refresh"]

_BCRYPT_MAX_BYTES = 72


def _prepare(password: str) -> bytes:
    return password.encode("utf-8")[:_BCRYPT_MAX_BYTES]


def hash_password(password: str) -> str:
    return bcrypt.hashpw(_prepare(password), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(_prepare(password), hashed.encode("utf-8"))
    except ValueError:
        return False


def _now() -> datetime:
    return datetime.now(timezone.utc)


def create_token(
    *,
    settings: Settings,
    user_id: uuid.UUID,
    token_version: int,
    token_type: TokenType,
) -> str:
    if token_type == "access":
        expires = _now() + timedelta(minutes=settings.access_token_ttl_min)
    else:
        expires = _now() + timedelta(days=settings.refresh_token_ttl_days)
    payload = {
        "sub": str(user_id),
        "type": token_type,
        "ver": token_version,
        "iat": int(_now().timestamp()),
        "exp": int(expires.timestamp()),
        "jti": uuid.uuid4().hex,
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


class TokenError(Exception):
    pass


def decode_token(token: str, *, settings: Settings, expected_type: TokenType) -> dict:
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    except JWTError as e:
        raise TokenError(f"invalid token: {e}") from e
    if payload.get("type") != expected_type:
        raise TokenError(f"expected {expected_type} token, got {payload.get('type')}")
    return payload
