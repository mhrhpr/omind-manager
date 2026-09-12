from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class AuthPayload(BaseModel):
    email: str = Field(min_length=5, max_length=320)
    password: str = Field(min_length=8, max_length=200)


class SignupPayload(AuthPayload):
    name: str = Field(min_length=2, max_length=120)


class WorkspaceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    plan: str
    analysis_limit: int
    analyses_used: int
    remaining: int


class WorkspaceBootstrap(WorkspaceResponse):
    access_token: str


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    name: str
    email: str


class AuthResponse(BaseModel):
    access_token: str
    user: UserResponse
    workspace: WorkspaceResponse


class AnalysisResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    workspace_id: UUID
    filename: str
    question: str
    rows: int
    columns: int
    health: int
    confidence: int
    created_at: datetime
    result: dict


class DecisionCreate(BaseModel):
    analysis_id: UUID
    problem: str = Field(min_length=1)
    evidence: dict = Field(default_factory=dict)
    assumptions: list[str] = Field(default_factory=list)
    hypotheses: list[str] = Field(default_factory=list)
    decision: str = Field(min_length=1)
    expected_outcome: str = Field(min_length=1)
    experiment: str = Field(min_length=1)


class DecisionOutcomeUpdate(BaseModel):
    actual_outcome: str = Field(min_length=1)
    lesson: str = Field(min_length=1)
    status: str = Field(pattern='^(success|incomplete|failure|retest)$')


class DecisionResponse(DecisionCreate):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    actual_outcome: str | None
    lesson: str | None
    status: str
    created_at: datetime
