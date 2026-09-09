from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import DateTime, Integer, JSON, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from .db import Base


class WorkspaceRecord(Base):
    __tablename__ = 'workspace_records'

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    plan: Mapped[str] = mapped_column(String(32), default='free')
    analysis_limit: Mapped[int] = mapped_column(Integer, default=3)
    analyses_used: Mapped[int] = mapped_column(Integer, default=0)
    auth_token_hash: Mapped[str] = mapped_column(String(64), nullable=False, unique=True, default=lambda: '')
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class AnalysisRecord(Base):
    __tablename__ = 'analysis_records'

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    workspace_id: Mapped[UUID] = mapped_column(index=True)
    filename: Mapped[str] = mapped_column(String(255))
    question: Mapped[str] = mapped_column(Text)
    raw_file_key: Mapped[str] = mapped_column(String(512))
    rows: Mapped[int] = mapped_column(Integer)
    columns: Mapped[int] = mapped_column(Integer)
    health: Mapped[int] = mapped_column(Integer)
    confidence: Mapped[int] = mapped_column(Integer)
    result_json: Mapped[dict] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class DecisionRecord(Base):
    __tablename__ = 'decision_records'

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    analysis_id: Mapped[UUID] = mapped_column(index=True)
    problem: Mapped[str] = mapped_column(Text)
    evidence: Mapped[dict] = mapped_column(JSON)
    assumptions: Mapped[list] = mapped_column(JSON, default=list)
    hypotheses: Mapped[list] = mapped_column(JSON, default=list)
    decision: Mapped[str] = mapped_column(Text)
    expected_outcome: Mapped[str] = mapped_column(Text)
    experiment: Mapped[str] = mapped_column(Text)
    actual_outcome: Mapped[str | None] = mapped_column(Text, nullable=True)
    lesson: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(32), default='planned')
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
