"""Stage 2: skill shortfalls; no ranking, progression, or profile mutations."""

from typing import Literal

from pydantic import Field

from backend.models import CareerTrack, Dataset, Employee, Model


class SkillGapError(ValueError):
    def __init__(self, code: str, message: str):
        self.code = code
        super().__init__(message)


class SkillGapItem(Model):
    current: int = Field(ge=0, le=5)
    required: int = Field(ge=1, le=5)
    gap: int = Field(ge=0, le=5)
    normalized_gap: float = Field(ge=0, le=1)
    importance: float = Field(gt=0, le=1)
    weighted_gap: float = Field(ge=0, le=1)
    mandatory: bool
    fulfilled: bool


class SkillGapResult(Model):
    employee_id: str
    role: str
    current_grade: str
    target_grade: str | None
    status: Literal["calculated", "top_grade"]
    total_target_skills: int = Field(ge=0)
    fulfilled_target_skills: int = Field(ge=0)
    skills_with_gap: int = Field(ge=0)
    mandatory_skills_with_gap: int = Field(ge=0)
    gaps: dict[str, SkillGapItem]


def calculate_skill_gaps(employee: Employee, career_track: CareerTrack) -> SkillGapResult:
    """Calculate every target requirement in stable skill-ID order.

    Missing skills have level zero under this demo contract. Additional employee
    skills do not affect the result. Passing validated models is required.
    """
    if employee.role != career_track.role:
        raise SkillGapError("career_track_mismatch",
                            f"Track '{career_track.role}' does not match employee role '{employee.role}'")
    if employee.grade not in career_track.grades:
        raise SkillGapError("grade_not_found",
                            f"Grade '{employee.grade}' is not defined for '{employee.role}'")
    index = career_track.grades.index(employee.grade)
    common = dict(employee_id=employee.employee_id, role=employee.role, current_grade=employee.grade)
    if index == len(career_track.grades) - 1:
        return SkillGapResult(**common, target_grade=None, status="top_grade", gaps={},
                              total_target_skills=0, fulfilled_target_skills=0,
                              skills_with_gap=0, mandatory_skills_with_gap=0)

    target = career_track.grades[index + 1]
    requirements = career_track.requirements.get(target)
    if not requirements:
        raise SkillGapError("empty_grade_requirements",
                            f"No requirements configured for '{employee.role}' / '{target}'")
    gaps = {}
    for skill_id, requirement in sorted(requirements.items()):
        current = employee.skills.get(skill_id, 0)
        gap = max(requirement.level - current, 0)
        normalized = gap / requirement.level
        gaps[skill_id] = SkillGapItem(
            current=current, required=requirement.level, gap=gap,
            normalized_gap=normalized, importance=requirement.importance,
            weighted_gap=normalized * requirement.importance,
            mandatory=requirement.mandatory, fulfilled=gap == 0,
        )
    return SkillGapResult(
        **common, target_grade=target, status="calculated", gaps=gaps,
        total_target_skills=len(gaps),
        fulfilled_target_skills=sum(item.fulfilled for item in gaps.values()),
        skills_with_gap=sum(item.gap > 0 for item in gaps.values()),
        mandatory_skills_with_gap=sum(item.gap > 0 and item.mandatory for item in gaps.values()),
    )


def get_employee_skill_gaps(dataset: Dataset, employee_id: str) -> SkillGapResult:
    employee = next((e for e in dataset.employees if e.employee_id == employee_id), None)
    if employee is None:
        raise SkillGapError("employee_not_found", f"Employee '{employee_id}' not found")
    track = next((t for t in dataset.skills.career_tracks if t.role == employee.role), None)
    if track is None:
        raise SkillGapError("career_track_not_found", f"Career track not found for '{employee.role}'")
    return calculate_skill_gaps(employee, track)
