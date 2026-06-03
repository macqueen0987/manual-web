import hashlib
import secrets
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.refresh_token import RefreshToken

settings = get_settings()


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def store_refresh_token(db: Session, user_id: int, token: str, jti: str, expires_at: datetime) -> None:
    db.add(
        RefreshToken(
            user_id=user_id,
            token_hash=_hash_token(token),
            jti=jti,
            expires_at=expires_at,
            revoked=False,
        )
    )
    db.commit()


def is_refresh_token_valid(db: Session, token: str, jti: str) -> bool:
    row = (
        db.query(RefreshToken)
        .filter(
            RefreshToken.jti == jti,
            RefreshToken.token_hash == _hash_token(token),
            RefreshToken.revoked == False,
        )
        .first()
    )
    if not row:
        return False
    expires = row.expires_at
    if expires.tzinfo is None:
        expires = expires.replace(tzinfo=timezone.utc)
    return expires > datetime.now(timezone.utc)


def revoke_refresh_token(db: Session, token: str, jti: str) -> None:
    row = (
        db.query(RefreshToken)
        .filter(RefreshToken.jti == jti, RefreshToken.token_hash == _hash_token(token))
        .first()
    )
    if row:
        row.revoked = True
        db.commit()


def revoke_all_user_tokens(db: Session, user_id: int) -> None:
    db.query(RefreshToken).filter(RefreshToken.user_id == user_id).update({"revoked": True})
    db.commit()


def new_jti() -> str:
    return secrets.token_urlsafe(32)
