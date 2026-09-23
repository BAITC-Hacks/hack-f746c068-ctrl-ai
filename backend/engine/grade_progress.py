"""Stage 3: explainable readiness for the next grade."""

from typing import Literal

from pydantic import Field

from backend.engine.skill_gap import (
    SkillGapResult,
    calculate_skill_gaps,
    get_employee_skill_gaps,
)
from backend.models import CareerTrack, Dataset, Employee, Model


class SkillProgressItem(Model):
    current: int = Field(ge=0, le=5)
    required: int = Field(ge=1, le=5)
    progress_percent: float = Field(ge=0, le=100)
    importance: float = Field(gt=0, le=1)
    mandatory: bool
    fulfilled: bool


class GradeReadinessResult(Model):
    employee_id: str
    role: str
    current_grade: str
    target_grade: str | None
    status: Literal["calculated", "top_grade"]
    readiness_percent: float | None = Field(default=None, ge=0, le=100)
    mandatory_readiness_percent: float | None = Field(default=None, ge=0, le=100)
    meets_mandatory: bool | None = None
    skills: dict[str, SkillProgressItem]


def calculate_readiness_from_gaps(gaps: SkillGapResult) -> GradeReadinessResult:
    """Compute weighted averages from exactly the same requirements as stage 2.

    Percentages are not rounded here; the UI may round for display. Completion
    is determined by actual gaps, never by a displayed percentage.
    """
    common = dict(employee_id=gaps.employee_id, role=gaps.role,
                  current_grade=gaps.current_grade, target_grade=gaps.target_grade,
                  status=gaps.status)
    if gaps.status == "top_grade":
        return GradeReadinessResult(**common, skills={})

    skills = {}
    total_weight = 0.0
    earned_weight = 0.0
    mandatory_weight = 0.0
    mandatory_earned = 0.0
    for skill_id, item in gaps.gaps.items():
        progress = min(item.current / item.required, 1.0)
        skills[skill_id] = SkillProgressItem(
            current=item.current, required=item.required,
            progress_percent=100.0 * progress,
            importance=item.importance, mandatory=item.mandatory,
            fulfilled=item.fulfilled,
        )
        total_weight += item.importance
        earned_weight += item.importance * progress
        if item.mandatory:
            mandatory_weight += item.importance
            mandatory_earned += item.importance * progress

    # Dataset validation guarantees nonempty requirements and a mandatory skill.
    if total_weight <= 0 or mandatory_weight <= 0:
        raise ValueError("Target grade needs at least one mandatory skill with positive weight")
    return GradeReadinessResult(
        **common,
        readiness_percent=min(100.0, 100.0 * (earned_weight / total_weight)),
        mandatory_readiness_percent=min(100.0, 100.0 * (mandatory_earned / mandatory_weight)),
        meets_mandatory=all(item.fulfilled for item in gaps.gaps.values() if item.mandatory),
        skills=skills,
    )


def calculate_grade_readiness(employee: Employee, career_track: CareerTrack) -> GradeReadinessResult:
    return calculate_readiness_from_gaps(calculate_skill_gaps(employee, career_track))


def get_employee_grade_readiness(dataset: Dataset, employee_id: str) -> GradeReadinessResult:
    return calculate_readiness_from_gaps(get_employee_skill_gaps(dataset, employee_id))
