from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class AnalysisResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
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


class DecisionResponse(DecisionCreate):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    actual_outcome: str | None
    lesson: str | None
    status: str
    created_at: datetime
