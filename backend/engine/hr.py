"""HR-only aggregates based on current next-grade gaps and participation records."""

from typing import Literal

from pydantic import Field

from backend.engine.recommendation import get_recommendations
from backend.engine.skill_gap import get_employee_skill_gaps
from backend.models import Dataset, Model

PARTICIPATION_STATUSES = ("invited", "enrolled", "completed", "skipped", "declined")


class SkillGapSummary(Model):
    skill_id: str
    skill_name: str
    employee_count: int = Field(ge=0)
    mandatory_employee_count: int = Field(ge=0)
    total_gap: int = Field(ge=0)


class EmployeeWithoutRecommendations(Model):
    employee_id: str
    name: str
    role: str
    grade: str
    reason: Literal["top_grade", "no_skill_gaps", "no_matching_activity"]


class ActivityParticipation(Model):
    event_id: str
    title: str
    active: bool
    total_records: int = Field(ge=0)
    unique_employees: int = Field(ge=0)
    status_counts: dict[str, int]


class HRDashboardResult(Model):
    total_employees: int = Field(ge=0)
    top_skill_gaps: list[SkillGapSummary]
    employees_without_recommendations: list[EmployeeWithoutRecommendations]
    participation: dict[str, int]
    activities: list[ActivityParticipation]


def get_hr_dashboard(dataset: Dataset) -> HRDashboardResult:
    """Return deterministic aggregates; authorization belongs to the API.

    Gap prevalence counts each employee once per unmet next-grade skill.
    Participation counts history records, which may represent repeated sessions
    and statuses, rather than treating the history as unique attendance. All five
    statuses and all activities (including inactive/unused ones) are included.
    Employees at the top grade or with no gaps are labeled accordingly, not
    treated as disengaged. Input models are never mutated.
    """
    skill_names = {item.skill_id: item.name for item in dataset.skills.skill_catalog}
    gaps_by_skill: dict[str, SkillGapSummary] = {}
    without_recommendations = []
    for employee in sorted(dataset.employees, key=lambda item: item.employee_id):
        gaps = get_employee_skill_gaps(dataset, employee.employee_id)
        for skill_id, gap in gaps.gaps.items():
            if gap.gap == 0:
                continue
            summary = gaps_by_skill.setdefault(skill_id, SkillGapSummary(
                skill_id=skill_id, skill_name=skill_names[skill_id], employee_count=0,
                mandatory_employee_count=0, total_gap=0,
            ))
            summary.employee_count += 1
            summary.mandatory_employee_count += int(gap.mandatory)
            summary.total_gap += gap.gap
        recommendations = get_recommendations(dataset, employee.employee_id)
        if not recommendations.recommendations:
            without_recommendations.append(EmployeeWithoutRecommendations(
                employee_id=employee.employee_id, name=employee.name,
                role=employee.role, grade=employee.grade, reason=recommendations.status,
            ))

    participation = dict.fromkeys(PARTICIPATION_STATUSES, 0)
    event_counts = {event.event_id: dict.fromkeys(PARTICIPATION_STATUSES, 0)
                    for event in dataset.events}
    event_employees: dict[str, set[str]] = {event.event_id: set() for event in dataset.events}
    for record in dataset.activity_history:
        participation[record.status] += 1
        event_counts[record.event_id][record.status] += 1
        event_employees[record.event_id].add(record.employee_id)

    return HRDashboardResult(
        total_employees=len(dataset.employees),
        top_skill_gaps=sorted(gaps_by_skill.values(),
                             key=lambda item: (-item.employee_count, -item.total_gap, item.skill_id)),
        employees_without_recommendations=without_recommendations,
        participation=participation,
        activities=[ActivityParticipation(
            event_id=event.event_id, title=event.title, active=event.active,
            total_records=sum(event_counts[event.event_id].values()),
            unique_employees=len(event_employees[event.event_id]),
            status_counts=event_counts[event.event_id],
        ) for event in sorted(dataset.events, key=lambda item: item.event_id)],
    )
