import hashlib
import secrets
from uuid import UUID

from fastapi import Depends, Header, HTTPException
from sqlalchemy.orm import Session

from .db import get_db
from .models import WorkspaceRecord


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode('utf-8')).hexdigest()


def issue_token() -> str:
    return secrets.token_urlsafe(32)


def require_workspace(workspace_id: UUID, authorization: str | None = Header(default=None), db: Session = Depends(get_db)) -> WorkspaceRecord:
    if not authorization or not authorization.startswith('Bearer '):
        raise HTTPException(401, 'workspace authentication required')
    token = authorization.removeprefix('Bearer ').strip()
    record = db.get(WorkspaceRecord, workspace_id)
    if record is None or not record.auth_token_hash or not secrets.compare_digest(record.auth_token_hash, hash_token(token)):
        raise HTTPException(403, 'workspace access denied')
    return record
