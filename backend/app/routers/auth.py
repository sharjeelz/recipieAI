import uuid

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.deps import CurrentUser, DbSession, SettingsDep
from app.models.user import User
from app.schemas.auth import LoginIn, RefreshIn, RegisterIn, TokenPair, UserOut
from app.security import (
    TokenError,
    create_token,
    decode_token,
    hash_password,
    verify_password,
)

router = APIRouter()


def _issue_tokens(settings, user: User) -> TokenPair:
    return TokenPair(
        access_token=create_token(
            settings=settings,
            user_id=user.id,
            token_version=user.token_version,
            token_type="access",
        ),
        refresh_token=create_token(
            settings=settings,
            user_id=user.id,
            token_version=user.token_version,
            token_type="refresh",
        ),
    )


@router.post("/register", response_model=TokenPair, status_code=status.HTTP_201_CREATED)
async def register(body: RegisterIn, db: DbSession, settings: SettingsDep) -> TokenPair:
    user = User(
        email=body.email.lower(),
        password_hash=hash_password(body.password),
        display_name=body.display_name,
    )
    db.add(user)
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, "email already registered") from None
    await db.refresh(user)
    return _issue_tokens(settings, user)


@router.post("/login", response_model=TokenPair)
async def login(body: LoginIn, db: DbSession, settings: SettingsDep) -> TokenPair:
    user = (
        await db.execute(select(User).where(User.email == body.email.lower()))
    ).scalar_one_or_none()
    if user is None or not verify_password(body.password, user.password_hash):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "invalid credentials")
    return _issue_tokens(settings, user)


@router.post("/refresh", response_model=TokenPair)
async def refresh(body: RefreshIn, db: DbSession, settings: SettingsDep) -> TokenPair:
    try:
        payload = decode_token(body.refresh_token, settings=settings, expected_type="refresh")
    except TokenError as e:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, str(e)) from e
    try:
        user_id = uuid.UUID(payload["sub"])
    except (KeyError, ValueError) as e:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "malformed token") from e
    user = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
    if user is None or payload.get("ver") != user.token_version:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "token revoked")
    return _issue_tokens(settings, user)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(user: CurrentUser, db: DbSession) -> None:
    user.token_version += 1
    await db.commit()


@router.get("/me", response_model=UserOut)
async def me(user: CurrentUser) -> User:
    return user
