import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from uuid import UUID

from fastapi import Depends, Header, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from .db import get_db
from .models import SessionRecord, UserRecord, WorkspaceRecord


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode('utf-8')).hexdigest()


def issue_token() -> str:
    return secrets.token_urlsafe(32)


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.scrypt(password.encode('utf-8'), salt=salt, n=2**14, r=8, p=1)
    return f'scrypt${salt.hex()}${digest.hex()}'


def verify_password(password: str, encoded: str) -> bool:
    try:
        _, salt_hex, digest_hex = encoded.split('$', 2)
        salt = bytes.fromhex(salt_hex)
        digest = hashlib.scrypt(password.encode('utf-8'), salt=salt, n=2**14, r=8, p=1)
        return secrets.compare_digest(digest.hex(), digest_hex)
    except (ValueError, TypeError):
        return False


def create_session(db: Session, user_id: UUID, workspace_id: UUID) -> str:
    token = issue_token()
    record = SessionRecord(user_id=user_id, workspace_id=workspace_id, token_hash=hash_token(token), expires_at=datetime.now(timezone.utc) + timedelta(days=30))
    db.add(record)
    return token


def current_session(token: str, db: Session) -> SessionRecord | None:
    record = db.scalar(select(SessionRecord).where(SessionRecord.token_hash == hash_token(token)))
    if record is None or record.expires_at < datetime.now(timezone.utc):
        return None
    return record


def require_workspace(workspace_id: UUID, authorization: str | None = Header(default=None), db: Session = Depends(get_db)) -> WorkspaceRecord:
    if not authorization or not authorization.startswith('Bearer '):
        raise HTTPException(401, 'workspace authentication required')
    token = authorization.removeprefix('Bearer ').strip()
    workspace = db.get(WorkspaceRecord, workspace_id)
    if workspace is None:
        raise HTTPException(404, 'workspace not found')
    if workspace.auth_token_hash and secrets.compare_digest(workspace.auth_token_hash, hash_token(token)):
        return workspace
    session = current_session(token, db)
    if session is None or session.workspace_id != workspace_id:
        raise HTTPException(403, 'workspace access denied')
    return workspace


def current_user(authorization: str | None, db: Session) -> UserRecord:
    if not authorization or not authorization.startswith('Bearer '):
        raise HTTPException(401, 'authentication required')
    session = current_session(authorization.removeprefix('Bearer ').strip(), db)
    if session is None:
        raise HTTPException(401, 'session expired or invalid')
    user = db.get(UserRecord, session.user_id)
    if user is None:
        raise HTTPException(401, 'user not found')
    return user
