import uuid
from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import Settings, get_settings
from app.db import get_db
from app.models.user import User
from app.security import TokenError, decode_token

DbSession = Annotated[AsyncSession, Depends(get_db)]
SettingsDep = Annotated[Settings, Depends(get_settings)]

_oauth2 = OAuth2PasswordBearer(tokenUrl="/auth/login", auto_error=True)


async def get_current_user(
    token: Annotated[str, Depends(_oauth2)],
    db: DbSession,
    settings: SettingsDep,
) -> User:
    try:
        payload = decode_token(token, settings=settings, expected_type="access")
    except TokenError as e:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, str(e)) from e

    try:
        user_id = uuid.UUID(payload["sub"])
    except (KeyError, ValueError) as e:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "malformed token") from e

    user = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
    if user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "user not found")

    if payload.get("ver") != user.token_version:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "token revoked")

    return user


CurrentUser = Annotated[User, Depends(get_current_user)]
