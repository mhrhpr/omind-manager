import json
from uuid import UUID

from fastapi import Depends, FastAPI, File, Form, HTTPException, UploadFile
from sqlalchemy import select
from sqlalchemy.orm import Session

from .db import Base, engine, get_db
from .models import AnalysisRecord, DecisionRecord
from .schemas import AnalysisResponse, DecisionCreate, DecisionResponse
from .settings import settings
from .storage import storage

app = FastAPI(title=settings.app_name, version='0.1.0')


@app.on_event('startup')
def startup() -> None:
    Base.metadata.create_all(bind=engine)


@app.get('/health')
def health() -> dict[str, str]:
    return {'status': 'ok', 'service': 'omind-api'}


@app.post('/analyses', response_model=AnalysisResponse)
async def create_analysis(
    file: UploadFile = File(...),
    question: str = Form(...),
    result_json: str = Form(...),
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

    key = storage.put(file.filename, content)
    record = AnalysisRecord(
        filename=file.filename,
        question=question.strip(),
        raw_file_key=key,
        rows=int(result.get('rows', 0)),
        columns=int(len(result.get('columns', []))),
        health=int(result.get('health', 0)),
        confidence=int(result.get('confidence', 0)),
        result_json=result,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return AnalysisResponse(**record.__dict__, result=record.result_json)


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
