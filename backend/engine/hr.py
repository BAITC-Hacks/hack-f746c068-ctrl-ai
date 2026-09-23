"""Aggregate validated employee data for an HR-only dashboard."""

from collections import Counter
from typing import Literal

from pydantic import Field

from backend.engine.grade_progress import calculate_readiness_from_gaps
from backend.engine.recommendation import get_recommendations
from backend.engine.skill_gap import get_employee_skill_gaps
from backend.models import Dataset, Model


class ParticipationCounts(Model):
    invited: int = Field(default=0, ge=0)
    enrolled: int = Field(default=0, ge=0)
    completed: int = Field(default=0, ge=0)
    skipped: int = Field(default=0, ge=0)
    declined: int = Field(default=0, ge=0)


class ActivityParticipation(Model):
    event_id: str
    title: str
    active: bool
    total_records: int = Field(ge=0)
    unique_employees: int = Field(ge=0)
    completed_employees: int = Field(ge=0)
    counts: ParticipationCounts


class SkillDeficit(Model):
    skill_id: str
    skill_name: str
    eligible_employees: int = Field(ge=0)
    affected_employees: int = Field(ge=0)
    total_gap: int = Field(ge=0)
    average_gap_when_affected: float = Field(ge=0)


class RoleSkillDeficit(Model):
    role: str
    skill_id: str
    skill_name: str
    eligible_employees: int = Field(ge=0)
    affected_employees: int = Field(ge=0)
    average_gap_across_role: float = Field(ge=0)


class EmployeeWithoutStep(Model):
    employee_id: str
    name: str
    role: str
    grade: str
    status: Literal["top_grade", "no_skill_gaps", "no_matching_activity"]
    action_required: bool
    gap_skill_ids: list[str]
    reason: str


class HRSummary(Model):
    total_employees: int = Field(ge=0)
    readiness_employee_count: int = Field(ge=0)
    average_readiness_percent: float | None = Field(default=None, ge=0, le=100)
    skill_deficits: list[SkillDeficit]
    role_skill_deficits: list[RoleSkillDeficit]
    employees_without_step: list[EmployeeWithoutStep]
    participation_by_activity: list[ActivityParticipation]
    participation_totals: ParticipationCounts


def _counts(counter: Counter) -> ParticipationCounts:
    return ParticipationCounts(
        invited=counter["invited"], enrolled=counter["enrolled"],
        completed=counter["completed"], skipped=counter["skipped"],
        declined=counter["declined"],
    )


def get_hr_summary(dataset: Dataset) -> HRSummary:
    """Compute aggregate deficits, uncovered employees, and event participation.

    The caller must enforce HR access before exposing this result. Employees at
    the top grade and those who already meet the next grade are listed without
    a step, but only ``no_matching_activity`` is marked for HR action.
    """
    names = {skill.skill_id: skill.name for skill in dataset.skills.skill_catalog}
    global_gaps = {}
    role_gaps = {}
    without_step = []
    readiness_sum = 0.0
    readiness_count = 0

    for employee in dataset.employees:
        gaps = get_employee_skill_gaps(dataset, employee.employee_id)
        readiness = calculate_readiness_from_gaps(gaps)
        if readiness.readiness_percent is not None:
            readiness_sum += readiness.readiness_percent
            readiness_count += 1
        for skill_id, item in gaps.gaps.items():
            global_stats = global_gaps.setdefault(skill_id, [0, 0, 0])
            role_stats = role_gaps.setdefault((employee.role, skill_id), [0, 0, 0])
            for stats in (global_stats, role_stats):
                stats[0] += 1  # employees with this target-grade requirement
                stats[1] += item.gap > 0
                stats[2] += item.gap

        recommendation = get_recommendations(dataset, employee.employee_id, limit=1)
        if not recommendation.recommendations:
            status = recommendation.status
            gap_skill_ids = sorted(skill_id for skill_id, item in gaps.gaps.items()
                                   if item.gap > 0)
            if status == "top_grade":
                reason = "Последний грейд: следующая ступень не задана."
            elif status == "no_skill_gaps":
                reason = "Требования следующего грейда уже закрыты."
            else:
                reason = "Нет активной подходящей активности для разрывов: " + ", ".join(gap_skill_ids)
            without_step.append(EmployeeWithoutStep(
                employee_id=employee.employee_id, name=employee.name,
                role=employee.role, grade=employee.grade, status=status,
                action_required=status == "no_matching_activity",
                gap_skill_ids=gap_skill_ids, reason=reason,
            ))

    skill_deficits = [
        SkillDeficit(
            skill_id=skill_id, skill_name=names[skill_id],
            eligible_employees=eligible, affected_employees=affected,
            total_gap=total, average_gap_when_affected=total / affected if affected else 0,
        )
        for skill_id, (eligible, affected, total) in global_gaps.items() if affected > 0
    ]
    skill_deficits.sort(key=lambda item: (-item.affected_employees,
                                          -item.average_gap_when_affected, item.skill_id))
    role_skill_deficits = [
        RoleSkillDeficit(
            role=role, skill_id=skill_id, skill_name=names[skill_id],
            eligible_employees=eligible, affected_employees=affected,
            average_gap_across_role=total / eligible,
        )
        for (role, skill_id), (eligible, affected, total) in role_gaps.items()
    ]
    role_skill_deficits.sort(key=lambda item: (item.role, item.skill_id))

    by_event = {event.event_id: Counter() for event in dataset.events}
    employees_by_event = {event.event_id: set() for event in dataset.events}
    completed_by_event = {event.event_id: set() for event in dataset.events}
    totals = Counter()
    for record in dataset.activity_history:
        by_event[record.event_id][record.status] += 1
        employees_by_event[record.event_id].add(record.employee_id)
        if record.status == "completed":
            completed_by_event[record.event_id].add(record.employee_id)
        totals[record.status] += 1
    participation = [
        ActivityParticipation(
            event_id=event.event_id, title=event.title, active=event.active,
            total_records=sum(by_event[event.event_id].values()),
            unique_employees=len(employees_by_event[event.event_id]),
            completed_employees=len(completed_by_event[event.event_id]),
            counts=_counts(by_event[event.event_id]),
        )
        for event in dataset.events
    ]

    return HRSummary(
        total_employees=len(dataset.employees),
        readiness_employee_count=readiness_count,
        average_readiness_percent=readiness_sum / readiness_count if readiness_count else None,
        skill_deficits=skill_deficits, role_skill_deficits=role_skill_deficits,
        employees_without_step=without_step,
        participation_by_activity=participation, participation_totals=_counts(totals),
    )
