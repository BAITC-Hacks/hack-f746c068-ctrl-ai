"""Read-only activity preview and factual comparison of development options.

The preview deliberately reuses the completion rule, including its history-aware
recommendation recalculation. Its returned dataset is discarded, never stored.
"""

from datetime import datetime, timezone
from uuid import uuid4

from pydantic import Field

from backend.engine.grade_progress import GradeReadinessResult
from backend.engine.progress import SkillChange, complete_activity
from backend.engine.recommendation import Recommendation, RecommendationResult, get_all_recommendations
from backend.engine.skill_gap import SkillGapResult, get_employee_skill_gaps
from backend.models import Dataset, Model


class SimulationError(ValueError):
    def __init__(self, code: str, message: str):
        self.code = code
        super().__init__(message)


class SimulationResult(Model):
    employee_id: str
    event_id: str
    title: str
    target_grade: str | None
    skill_changes: list[SkillChange]
    readiness_before: GradeReadinessResult
    readiness_after: GradeReadinessResult
    gaps_before: SkillGapResult
    gaps_after: SkillGapResult
    recommendations_after: RecommendationResult


class ComparisonResult(Model):
    employee_id: str
    target_grade: str | None
    first: Recommendation
    second: Recommendation
    preferred_event_id: str
    score_delta: float = Field(ge=0)
    explanation: str
    readiness_after_first: GradeReadinessResult
    readiness_after_second: GradeReadinessResult


def simulate_activity(dataset: Dataset, employee_id: str, event_id: str) -> SimulationResult:
    """Preview exactly what a new completion would calculate, without a write."""
    existing_ids = {record.record_id for record in dataset.activity_history}
    record_id = f"SIM_{uuid4().hex}"
    while record_id in existing_ids:
        record_id = f"SIM_{uuid4().hex}"

    projected, completion = complete_activity(
        dataset, employee_id, event_id, record_id, datetime.now(timezone.utc).date(),
    )
    event = next(event for event in dataset.events if event.event_id == event_id)
    return SimulationResult(
        employee_id=employee_id, event_id=event_id, title=event.title,
        target_grade=completion.readiness_before.target_grade,
        skill_changes=completion.skill_changes,
        readiness_before=completion.readiness_before,
        readiness_after=completion.readiness_after,
        gaps_before=get_employee_skill_gaps(dataset, employee_id),
        gaps_after=get_employee_skill_gaps(projected, employee_id),
        recommendations_after=completion.recommendations_after,
    )


def compare_activities(
    dataset: Dataset, employee_id: str, first_event_id: str, second_event_id: str,
) -> ComparisonResult:
    """Compare two useful events using the same ranking and completion rules."""
    if first_event_id == second_event_id:
        raise SimulationError("same_event", "Choose two different activities to compare")

    ranked = get_all_recommendations(dataset, employee_id)
    first_preview = simulate_activity(dataset, employee_id, first_event_id)
    second_preview = simulate_activity(dataset, employee_id, second_event_id)
    candidates = {item.event_id: item for item in ranked.recommendations}
    for event_id in (first_event_id, second_event_id):
        if event_id not in candidates:
            raise SimulationError(
                "not_relevant",
                f"Activity '{event_id}' does not reduce a current next-grade skill gap",
            )

    first = candidates[first_event_id]
    second = candidates[second_event_id]
    preferred = first if (-first.score, first.event_id) < (-second.score, second.event_id) else second
    delta = abs(first.score - second.score)
    basis = (
        f"{first.title}: {first.score:g} = {first.grade_gap_benefit:g} × "
        f"{first.history_multiplier:g}; {second.title}: {second.score:g} = "
        f"{second.grade_gap_benefit:g} × {second.history_multiplier:g}. "
    )
    if delta == 0:
        explanation = basis + f"Оценки равны; {preferred.title} выбрана по идентификатору активности."
    else:
        explanation = basis + f"{preferred.title} выше на {delta:g} по оценке сокращения разрыва с учётом истории."

    return ComparisonResult(
        employee_id=employee_id, target_grade=ranked.target_grade,
        first=first, second=second, preferred_event_id=preferred.event_id,
        score_delta=delta, explanation=explanation,
        readiness_after_first=first_preview.readiness_after,
        readiness_after_second=second_preview.readiness_after,
    )
