"""FastAPI application factory. Run: python -m uvicorn backend.api.app:app."""

from contextlib import asynccontextmanager
from datetime import datetime, timezone
import os
from pathlib import Path
import sqlite3
from typing import Literal
from uuid import UUID, uuid4

from fastapi import Depends, FastAPI, File, Form, Header, Query, Request, Response, UploadFile
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import ValidationError
from starlette.exceptions import HTTPException

from backend.api.auth import Account, current_account, load_accounts, require_employee_access, require_hr
from backend.api.imports import import_dataset, parse_upload
from backend.data_loader import DEFAULT_DATA_DIR, DatasetValidationError, load_dataset
from backend.engine.grade_progress import GradeReadinessResult, get_employee_grade_readiness
from backend.engine.hr import HRDashboardResult, get_hr_dashboard
from backend.engine.progress import CompletionResult, ProgressError, complete_activity
from backend.engine.recommendation import RecommendationError, RecommendationResult, get_recommendations
from backend.engine.skill_gap import SkillGapError, SkillGapResult, get_employee_skill_gaps
from backend.models import Activity, CareerTrack, Employee, HistoryRecord, Model, Skill
from backend.storage import DatasetStore, StateConflict

RUNTIME_DIR = Path(__file__).resolve().parents[1] / "runtime"
MAX_UPLOAD_BYTES = 5 * 1024 * 1024


class HistoryEntry(HistoryRecord):
    event_title: str
    event_type: str


class ProfileResponse(Model):
    employee: Employee
    career_track: CareerTrack
    history: list[HistoryEntry]
    skill_catalog: list[Skill]
    skill_gaps: SkillGapResult
    readiness: GradeReadinessResult
    recommendations: RecommendationResult


class EmployeeSummary(Model):
    employee_id: str
    name: str
    role: str
    grade: str


class Identity(Model):
    account_id: str
    role: Literal["employee", "hr"]
    employee_id: str | None


def store(request: Request) -> DatasetStore:
    return request.app.state.store


def create_app(*, state_path: str | Path | None = None, data_dir: str | Path | None = None,
               auth_path: str | Path | None = None, accounts: list[Account] | None = None) -> FastAPI:
    @asynccontextmanager
    async def lifespan(application):
        seed = load_dataset(data_dir or os.environ.get("CAREER_QUEST_DATA_DIR", DEFAULT_DATA_DIR))
        application.state.store = DatasetStore(
            state_path or os.environ.get("CAREER_QUEST_STATE_PATH", RUNTIME_DIR / "state.sqlite3"), seed)
        application.state.accounts = accounts if accounts is not None else load_accounts(
            Path(auth_path or os.environ.get("CAREER_QUEST_AUTH_FILE", RUNTIME_DIR / "access.json")),
            application.state.store.snapshot().employees[0].employee_id)
        yield

    application = FastAPI(title="Career Quest API", version="0.1.0", lifespan=lifespan)
    origins = [value.strip() for value in os.environ.get("CAREER_QUEST_CORS_ORIGINS", "").split(",") if value.strip()]
    if origins:
        application.add_middleware(CORSMiddleware, allow_origins=origins,
                                   allow_methods=["GET", "POST"],
                                   allow_headers=["Authorization", "Content-Type", "Idempotency-Key"],
                                   expose_headers=["Idempotency-Replayed"])

    @application.exception_handler(HTTPException)
    async def http_error(request, exc):
        detail = exc.detail if isinstance(exc.detail, dict) else {"error": "http_error", "message": str(exc.detail)}
        return JSONResponse(detail, status_code=exc.status_code, headers=exc.headers)

    @application.exception_handler(RequestValidationError)
    async def request_error(request, exc):
        issues = [{"location": ".".join(map(str, error["loc"])), "message": error["msg"]}
                  for error in exc.errors()]
        return JSONResponse({"error": "invalid_request", "message": "Request validation failed", "issues": issues}, status_code=422)

    @application.exception_handler(ValidationError)
    async def validation_error(request, exc):
        issues = [{"location": ".".join(map(str, error["loc"])) or "dataset", "message": error["msg"]}
                  for error in exc.errors(include_input=False, include_url=False)]
        return JSONResponse({"error": "invalid_dataset", "message": "Dataset validation failed", "issues": issues}, status_code=422)

    async def domain_error(request, exc):
        code = getattr(exc, "code", "invalid_dataset")
        status = 404 if code in {"employee_not_found", "event_not_found"} else 422
        if isinstance(exc, StateConflict):
            status = 409
        return JSONResponse({"error": code, "message": str(exc)}, status_code=status)

    for error_type in (SkillGapError, RecommendationError, ProgressError, DatasetValidationError, StateConflict):
        application.add_exception_handler(error_type, domain_error)

    @application.exception_handler(sqlite3.OperationalError)
    async def storage_error(request, exc):
        return JSONResponse({"error": "storage_unavailable", "message": "Unable to save or read state; retry later"}, status_code=503)

    @application.get("/health")
    def health():
        return {"status": "ok"}

    @application.get("/auth/me", response_model=Identity)
    def identity(account: Account = Depends(current_account)):
        return Identity(**account.model_dump(exclude={"token"}))

    @application.get("/employees", response_model=list[EmployeeSummary])
    def employees(account: Account = Depends(require_hr), repository: DatasetStore = Depends(store)):
        return [EmployeeSummary(**employee.model_dump(include={"employee_id", "name", "role", "grade"}))
                for employee in repository.snapshot().employees]

    @application.get("/employees/{employee_id}", response_model=ProfileResponse)
    def profile(employee_id: str, account: Account = Depends(require_employee_access),
                repository: DatasetStore = Depends(store)):
        dataset = repository.snapshot()
        gaps = get_employee_skill_gaps(dataset, employee_id)
        employee = next(e for e in dataset.employees if e.employee_id == employee_id)
        catalog = {event.event_id: event for event in dataset.events}
        return ProfileResponse(
            employee=employee,
            career_track=next(t for t in dataset.skills.career_tracks if t.role == employee.role),
            history=[HistoryEntry(**r.model_dump(), event_title=catalog[r.event_id].title,
                                  event_type=catalog[r.event_id].type)
                     for r in dataset.activity_history if r.employee_id == employee_id],
            skill_catalog=dataset.skills.skill_catalog,
            skill_gaps=gaps, readiness=get_employee_grade_readiness(dataset, employee_id),
            recommendations=get_recommendations(dataset, employee_id),
        )

    @application.get("/employees/{employee_id}/recommendations", response_model=RecommendationResult)
    def recommendations(employee_id: str, limit: int = Query(3, ge=1, le=3),
                        account: Account = Depends(require_employee_access), repository: DatasetStore = Depends(store)):
        return get_recommendations(repository.snapshot(), employee_id, limit)

    @application.get("/events", response_model=list[Activity])
    def events(account: Account = Depends(current_account), repository: DatasetStore = Depends(store)):
        dataset = repository.snapshot()
        if account.role == "hr":
            return dataset.events
        employee = next((e for e in dataset.employees if e.employee_id == account.employee_id), None)
        if employee is None:
            raise SkillGapError("employee_not_found", "Employee profile not found")
        return [e for e in dataset.events if e.active and employee.role in e.audience]

    @application.post("/employees/{employee_id}/activities/{event_id}/complete", response_model=CompletionResult)
    def complete(employee_id: str, event_id: str, response: Response,
                 idempotency_key: UUID = Header(alias="Idempotency-Key"),
                 account: Account = Depends(require_employee_access), repository: DatasetStore = Depends(store)):
        result, replayed = repository.complete(
            account.account_id, str(idempotency_key), f"{employee_id}/{event_id}",
            lambda dataset: complete_activity(dataset, employee_id, event_id,
                                             f"CMP_{uuid4().hex}", datetime.now(timezone.utc).date()),
        )
        response.headers["Idempotency-Replayed"] = str(replayed).lower()
        return result

    @application.get("/hr/dashboard", response_model=HRDashboardResult)
    def dashboard(account: Account = Depends(require_hr), repository: DatasetStore = Depends(store)):
        return get_hr_dashboard(repository.snapshot())

    @application.post("/dataset/import")
    def upload_dataset(
        mode: Literal["append", "replace"] = Form("append"),
        employees: UploadFile | None = File(None), events: UploadFile | None = File(None),
        skills: UploadFile | None = File(None), activity_history: UploadFile | None = File(None),
        account: Account = Depends(require_hr), repository: DatasetStore = Depends(store),
    ):
        parts = {}
        for name, upload in {"employees": employees, "events": events,
                             "skills": skills, "activity_history": activity_history}.items():
            if upload is not None:
                content = upload.file.read(MAX_UPLOAD_BYTES + 1)
                if len(content) > MAX_UPLOAD_BYTES:
                    raise HTTPException(413, detail={"error": "file_too_large", "message": f"{name}: maximum size is 5 MiB"})
                parts[name] = parse_upload(name, content)
        return repository.update(lambda dataset: import_dataset(dataset, parts, mode), replace=mode == "replace")

    return application


app = create_app()
