from fastapi import APIRouter, Body, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.security import create_access_token, create_refresh_token, decode_token
from app.core.rate_limit import rate_limit
from app.db.session import get_db
from app.models.user import User
from app.schemas.auth import LoginRequest, RefreshRequest, Token
from app.schemas.user import UserOut
from app.services.auth_service import authenticate_user
from app.services.refresh_token_service import (
    is_refresh_token_valid,
    revoke_all_user_tokens,
    revoke_refresh_token,
    store_refresh_token,
)

router = APIRouter()


def _issue_tokens(db: Session, user: User) -> dict:
    access_token = create_access_token(data={"sub": user.id})
    refresh_token, jti, expires_at = create_refresh_token(data={"sub": user.id})
    store_refresh_token(db, user.id, refresh_token, jti, expires_at)
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
    }


@router.post("/login", response_model=Token)
def login(
    request: LoginRequest,
    db: Session = Depends(get_db),
    _rate: None = rate_limit(max_calls=10, window_seconds=60, scope="login"),
):
    user = authenticate_user(db, request.email, request.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )
    return _issue_tokens(db, user)


@router.post("/refresh", response_model=Token)
def refresh(
    request: RefreshRequest,
    db: Session = Depends(get_db),
    _rate: None = rate_limit(max_calls=30, window_seconds=60, scope="refresh"),
):
    payload = decode_token(request.token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        )
    jti = payload.get("jti")
    if not jti or not is_refresh_token_valid(db, request.token, jti):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or revoked refresh token",
        )
    try:
        user_id = int(payload.get("sub"))
    except (TypeError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        )
    user = db.query(User).filter(User.id == user_id).first()
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
        )
    revoke_refresh_token(db, request.token, jti)
    return _issue_tokens(db, user)


@router.post("/logout")
def logout(
    request: RefreshRequest | None = Body(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if request and request.token:
        payload = decode_token(request.token)
        if payload and payload.get("jti"):
            revoke_refresh_token(db, request.token, payload["jti"])
    else:
        revoke_all_user_tokens(db, current_user.id)
    return {"message": "Logged out successfully"}


@router.get("/me", response_model=UserOut)
def read_users_me(current_user: User = Depends(get_current_user)):
    return current_user
