"""Apply one completion and explain its effect without mutating the input."""

from datetime import date

from pydantic import Field

from backend.engine.grade_progress import GradeReadinessResult, get_employee_grade_readiness
from backend.engine.recommendation import RecommendationResult, get_recommendations
from backend.engine.skill_gap import SkillGapResult, get_employee_skill_gaps
from backend.models import Dataset, HistoryRecord, Model


class ProgressError(ValueError):
    def __init__(self, code: str, message: str):
        self.code = code
        self.message = message
        super().__init__(message)


class SkillChange(Model):
    skill_id: str
    before: int = Field(ge=0, le=5)
    after: int = Field(ge=0, le=5)
    gain_applied: int = Field(ge=0, le=5)


class CompletionResult(Model):
    employee_id: str
    event_id: str
    record_id: str
    skill_changes: list[SkillChange]
    readiness_before: GradeReadinessResult
    readiness_after: GradeReadinessResult
    skill_gaps: SkillGapResult
    recommendations: RecommendationResult


def complete_activity(
    dataset: Dataset,
    employee_id: str,
    event_id: str,
    completion_id: str,
    completed_on: date,
) -> tuple[Dataset, CompletionResult]:
    """Return a new validated snapshot and the recalculated employee results.

    Activity IDs identify recurring catalog entries, not individual sessions.
    Distinct completion IDs therefore allow repeat participation; an existing
    history record ID is rejected. The API/storage layer handles retry keys.
    Every listed skill is updated, including skills outside grade requirements.
    The cap limits growth and never lowers an existing skill. No grade promotion
    is automatic. The caller is responsible for authorizing and saving results.
    """
    employee = next((item for item in dataset.employees if item.employee_id == employee_id), None)
    if employee is None:
        raise ProgressError("employee_not_found", f"Employee '{employee_id}' not found")
    event = next((item for item in dataset.events if item.event_id == event_id), None)
    if event is None:
        raise ProgressError("event_not_found", f"Activity '{event_id}' not found")
    if not event.active:
        raise ProgressError("event_inactive", f"Activity '{event_id}' is inactive")
    if employee.role not in event.audience:
        raise ProgressError("role_mismatch", f"Activity '{event_id}' is not available for '{employee.role}'")
    if any(record.record_id == completion_id for record in dataset.activity_history):
        raise ProgressError("duplicate_record", f"History record '{completion_id}' already exists")

    record = HistoryRecord(record_id=completion_id, employee_id=employee_id,
                           event_id=event_id, status="completed", event_date=completed_on)
    readiness_before = get_employee_grade_readiness(dataset, employee_id)
    updated = dataset.model_copy(deep=True)
    updated_employee = next(item for item in updated.employees if item.employee_id == employee_id)
    changes = []
    for gain in event.skills:
        before = updated_employee.skills.get(gain.skill_id, 0)
        after = max(before, min(before + gain.gain, gain.max_level))
        updated_employee.skills[gain.skill_id] = after
        changes.append(SkillChange(skill_id=gain.skill_id, before=before,
                                   after=after, gain_applied=after - before))
    updated.activity_history.append(record)
    updated = Dataset.model_validate(updated.model_dump())

    return updated, CompletionResult(
        employee_id=employee_id,
        event_id=event_id,
        record_id=completion_id,
        skill_changes=changes,
        readiness_before=readiness_before,
        readiness_after=get_employee_grade_readiness(updated, employee_id),
        skill_gaps=get_employee_skill_gaps(updated, employee_id),
        recommendations=get_recommendations(updated, employee_id),
    )
