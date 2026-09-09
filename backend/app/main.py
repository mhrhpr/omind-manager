from uuid import UUID
import secrets

from fastapi import Depends, FastAPI, File, Form, Header, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select
from sqlalchemy.orm import Session

from .auth import hash_token, issue_token, require_workspace
from .db import get_db
from .models import AnalysisRecord, DecisionRecord, WorkspaceRecord
from .schemas import AnalysisResponse, DecisionCreate, DecisionOutcomeUpdate, DecisionResponse, WorkspaceBootstrap, WorkspaceResponse
from .server_engine import analyze_rows, parse_upload
from .settings import settings
from .storage import storage

app=FastAPI(title=settings.app_name,version='1.0.0')
app.add_middleware(CORSMiddleware,allow_origins=settings.cors_origin_list,allow_credentials=False,allow_methods=['GET','POST','PATCH'],allow_headers=['Authorization','Content-Type'])

def workspace_view(record:WorkspaceRecord)->WorkspaceResponse:return WorkspaceResponse(id=record.id,plan=record.plan,analysis_limit=record.analysis_limit,analyses_used=record.analyses_used,remaining=max(0,record.analysis_limit-record.analyses_used))

def auth_workspace_for_analysis(analysis_id:UUID,authorization:str|None,db:Session)->WorkspaceRecord:
 if not authorization or not authorization.startswith('Bearer '):raise HTTPException(401,'workspace authentication required')
 analysis=db.get(AnalysisRecord,analysis_id)
 if analysis is None:raise HTTPException(404,'analysis not found')
 workspace=db.get(WorkspaceRecord,analysis.workspace_id);token=authorization.removeprefix('Bearer ').strip()
 if workspace is None or not workspace.auth_token_hash or not secrets.compare_digest(workspace.auth_token_hash,hash_token(token)):raise HTTPException(403,'workspace access denied')
 return workspace

@app.get('/health')
def health()->dict[str,str]:return {'status':'ok','service':'omind-api'}

@app.post('/workspaces',response_model=WorkspaceBootstrap)
def create_workspace(db:Session=Depends(get_db))->WorkspaceBootstrap:
 token=issue_token();record=WorkspaceRecord(auth_token_hash=hash_token(token));db.add(record);db.commit();db.refresh(record);return WorkspaceBootstrap(**workspace_view(record).model_dump(),access_token=token)

@app.get('/workspaces/{workspace_id}',response_model=WorkspaceResponse)
def get_workspace(workspace_id:UUID,workspace:WorkspaceRecord=Depends(require_workspace))->WorkspaceResponse:return workspace_view(workspace)

@app.get('/workspaces/{workspace_id}/analyses',response_model=list[AnalysisResponse])
def list_analyses(workspace_id:UUID,workspace:WorkspaceRecord=Depends(require_workspace),db:Session=Depends(get_db))->list[AnalysisResponse]:
 records=db.scalars(select(AnalysisRecord).where(AnalysisRecord.workspace_id==workspace_id).order_by(AnalysisRecord.created_at.desc())).all();return [AnalysisResponse(**r.__dict__,result=r.result_json) for r in records]

@app.post('/analyses',response_model=AnalysisResponse)
async def create_analysis(file:UploadFile=File(...),question:str=Form(''),role:str=Form('manager'),workspace_id:UUID=Form(...),authorization:str|None=Header(default=None),db:Session=Depends(get_db))->AnalysisResponse:
 require_workspace(workspace_id,authorization,db)
 if not file.filename:raise HTTPException(400,'filename is required')
 if len(file.filename)>255:raise HTTPException(422,'filename is too long')
 if not file.filename.lower().endswith(('.csv','.xlsx','.xls','.json')):raise HTTPException(415,'unsupported file type')
 content=await file.read()
 if len(content)>settings.max_upload_bytes:raise HTTPException(413,'file exceeds upload limit')
 try: rows=parse_upload(file.filename,content);result=analyze_rows(rows,question,role)
 except (ValueError,UnicodeDecodeError,ImportError) as exc:raise HTTPException(422,str(exc)) from exc
 workspace=db.execute(select(WorkspaceRecord).where(WorkspaceRecord.id==workspace_id).with_for_update()).scalar_one()
 if workspace.analyses_used>=workspace.analysis_limit:raise HTTPException(402,'analysis quota exhausted')
 key=storage.put(file.filename,content)
 try:
  record=AnalysisRecord(workspace_id=workspace_id,filename=file.filename,question=result['resolved_question'],raw_file_key=key,rows=result['rows'],columns=len(result['columns']),health=result['health'],confidence=result['confidence'],result_json=result)
  workspace.analyses_used+=1;db.add(record);db.commit();db.refresh(record)
 except Exception:
  db.rollback();storage.delete(key);raise
 return AnalysisResponse(**record.__dict__,result=record.result_json)

@app.get('/analyses/{analysis_id}',response_model=AnalysisResponse)
def get_analysis(analysis_id:UUID,authorization:str|None=Header(default=None),db:Session=Depends(get_db))->AnalysisResponse:
 auth_workspace_for_analysis(analysis_id,authorization,db);record=db.get(AnalysisRecord,analysis_id)
 if record is None:raise HTTPException(404,'analysis not found')
 return AnalysisResponse(**record.__dict__,result=record.result_json)

@app.post('/decisions',response_model=DecisionResponse)
def create_decision(payload:DecisionCreate,authorization:str|None=Header(default=None),db:Session=Depends(get_db))->DecisionResponse:
 auth_workspace_for_analysis(payload.analysis_id,authorization,db);record=DecisionRecord(**payload.model_dump());db.add(record);db.commit();db.refresh(record);return DecisionResponse.model_validate(record)

@app.get('/decisions',response_model=list[DecisionResponse])
def list_decisions(workspace_id:UUID,authorization:str|None=Header(default=None),db:Session=Depends(get_db))->list[DecisionResponse]:
 require_workspace(workspace_id,authorization,db);stmt=select(DecisionRecord).join(AnalysisRecord,DecisionRecord.analysis_id==AnalysisRecord.id).where(AnalysisRecord.workspace_id==workspace_id).order_by(DecisionRecord.created_at.desc());return [DecisionResponse.model_validate(r) for r in db.scalars(stmt).all()]

@app.patch('/decisions/{decision_id}/outcome',response_model=DecisionResponse)
def update_outcome(decision_id:UUID,payload:DecisionOutcomeUpdate,authorization:str|None=Header(default=None),db:Session=Depends(get_db))->DecisionResponse:
 record=db.get(DecisionRecord,decision_id)
 if record is None:raise HTTPException(404,'decision not found')
 auth_workspace_for_analysis(record.analysis_id,authorization,db);record.actual_outcome=payload.actual_outcome;record.lesson=payload.lesson;record.status=payload.status;db.commit();db.refresh(record);return DecisionResponse.model_validate(record)
