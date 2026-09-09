import json
from uuid import UUID

from fastapi import Depends, FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select
from sqlalchemy.orm import Session

from .db import Base, engine, get_db
from .models import AnalysisRecord, DecisionRecord, WorkspaceRecord
from .schemas import AnalysisResponse, DecisionCreate, DecisionOutcomeUpdate, DecisionResponse, WorkspaceResponse
from .settings import settings
from .storage import storage

app = FastAPI(title=settings.app_name, version='0.2.1')
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=['GET', 'POST', 'PATCH'],
    allow_headers=['*'],
)


@app.on_event('startup')
def startup() -> None:
    Base.metadata.create_all(bind=engine)


def workspace_view(record: WorkspaceRecord) -> WorkspaceResponse:
    return WorkspaceResponse(
        id=record.id,
        plan=record.plan,
        analysis_limit=record.analysis_limit,
        analyses_used=record.analyses_used,
        remaining=max(0, record.analysis_limit - record.analyses_used),
    )


@app.get('/health')
def health() -> dict[str, str]:
    return {'status': 'ok', 'service': 'omind-api'}


@app.get('/workspaces/{workspace_id}', response_model=WorkspaceResponse)
def get_workspace(workspace_id: UUID, db: Session = Depends(get_db)) -> WorkspaceResponse:
    record = db.get(WorkspaceRecord, workspace_id)
    if record is None:
        record = WorkspaceRecord(id=workspace_id)
        db.add(record)
        db.commit()
        db.refresh(record)
    return workspace_view(record)


@app.post('/workspaces/{workspace_id}/consume-analysis', response_model=WorkspaceResponse)
def consume_analysis(workspace_id: UUID, db: Session = Depends(get_db)) -> WorkspaceResponse:
    record = db.get(WorkspaceRecord, workspace_id, with_for_update=True)
    if record is None:
        record = WorkspaceRecord(id=workspace_id)
        db.add(record)
        db.flush()
    if record.analyses_used >= record.analysis_limit:
        raise HTTPException(402, 'analysis quota exhausted')
    record.analyses_used += 1
    db.commit()
    db.refresh(record)
    return workspace_view(record)


@app.post('/analyses', response_model=AnalysisResponse)
async def create_analysis(
    file: UploadFile = File(...),
    question: str = Form(...),
    result_json: str = Form(...),
    workspace_id: UUID = Form(...),
    db: Session = Depends(get_db),
) -> AnalysisResponse:
    if not file.filename:
        raise HTTPException(400, 'filename is required')
    content = await file.read()
    if len(content) > settings.max_upload_bytes:
        raise HTTPException(413, 'file exceeds upload limit')
    try:
        result = json.loads(result_json)
    except json.JSONDecodeError as exc:
        raise HTTPException(422, 'result_json must be valid JSON') from exc
    if not isinstance(result, dict):
        raise HTTPException(422, 'result_json must be an object')

    workspace = db.get(WorkspaceRecord, workspace_id, with_for_update=True)
    if workspace is None:
        workspace = WorkspaceRecord(id=workspace_id)
        db.add(workspace)
        db.flush()
    if workspace.analyses_used >= workspace.analysis_limit:
        raise HTTPException(402, 'analysis quota exhausted')

    key = storage.put(file.filename, content)
    record = AnalysisRecord(
        workspace_id=workspace_id,
        filename=file.filename,
        question=question.strip(),
        raw_file_key=key,
        rows=int(result.get('rows', 0)),
        columns=int(len(result.get('columns', []))),
        health=int(result.get('health', 0)),
        confidence=int(result.get('confidence', 0)),
        result_json=result,
    )
    workspace.analyses_used += 1
    db.add(record)
    db.commit()
    db.refresh(record)
    return AnalysisResponse(**record.__dict__, result=record.result_json)


@app.get('/workspaces/{workspace_id}/analyses', response_model=list[AnalysisResponse])
def list_analyses(workspace_id: UUID, db: Session = Depends(get_db)) -> list[AnalysisResponse]:
    records = db.scalars(select(AnalysisRecord).where(AnalysisRecord.workspace_id == workspace_id).order_by(AnalysisRecord.created_at.desc())).all()
    return [AnalysisResponse(**record.__dict__, result=record.result_json) for record in records]


@app.get('/analyses/{analysis_id}', response_model=AnalysisResponse)
def get_analysis(analysis_id: UUID, db: Session = Depends(get_db)) -> AnalysisResponse:
    record = db.get(AnalysisRecord, analysis_id)
    if record is None:
        raise HTTPException(404, 'analysis not found')
    return AnalysisResponse(**record.__dict__, result=record.result_json)


@app.post('/decisions', response_model=DecisionResponse)
def create_decision(payload: DecisionCreate, db: Session = Depends(get_db)) -> DecisionResponse:
    if db.get(AnalysisRecord, payload.analysis_id) is None:
        raise HTTPException(404, 'analysis not found')
    record = DecisionRecord(**payload.model_dump())
    db.add(record)
    db.commit()
    db.refresh(record)
    return DecisionResponse.model_validate(record)


@app.get('/decisions', response_model=list[DecisionResponse])
def list_decisions(db: Session = Depends(get_db)) -> list[DecisionResponse]:
    records = db.scalars(select(DecisionRecord).order_by(DecisionRecord.created_at.desc())).all()
    return [DecisionResponse.model_validate(record) for record in records]


@app.patch('/decisions/{decision_id}/outcome', response_model=DecisionResponse)
def update_outcome(decision_id: UUID, payload: DecisionOutcomeUpdate, db: Session = Depends(get_db)) -> DecisionResponse:
    record = db.get(DecisionRecord, decision_id)
    if record is None:
        raise HTTPException(404, 'decision not found')
    record.actual_outcome = payload.actual_outcome
    record.lesson = payload.lesson
    record.status = payload.status
    db.commit()
    db.refresh(record)
    return DecisionResponse.model_validate(record)
