"""Explainable development activity recommendations for the next grade."""

from typing import Literal

from pydantic import Field

from backend.engine.skill_gap import get_employee_skill_gaps
from backend.models import Dataset, Model


class RecommendationError(ValueError):
    def __init__(self, code: str, message: str):
        self.code = code
        super().__init__(message)


class SkillImpact(Model):
    skill_id: str
    current: int
    required: int
    gap: int
    gain: int
    max_level: int
    projected: int
    projected_gap: int
    gap_reduction: int
    importance: float
    mandatory: bool
    weighted_gap_reduction: float
    mandatory_factor: float
    benefit: float


class Participation(Model):
    completed: int = 0
    skipped: int = 0
    declined: int = 0
    same_event_completed: int = 0


class Recommendation(Model):
    event_id: str
    title: str
    score: float = Field(gt=0)
    grade_gap_benefit: float = Field(gt=0)
    skill_impact: list[SkillImpact]
    participation: Participation
    history_multiplier: float = Field(ge=0.25, le=1.25)
    explanation: str


class RecommendationResult(Model):
    employee_id: str
    role: str
    current_grade: str
    target_grade: str | None
    status: Literal["recommended", "top_grade", "no_skill_gaps", "no_matching_activity"]
    recommendations: list[Recommendation]


def get_all_recommendations(dataset: Dataset, employee_id: str) -> RecommendationResult:
    """Rank every useful activity with the same scoring used for the top three."""
    gaps = get_employee_skill_gaps(dataset, employee_id)
    common = dict(employee_id=employee_id, role=gaps.role,
                  current_grade=gaps.current_grade, target_grade=gaps.target_grade)
    if gaps.status == "top_grade":
        return RecommendationResult(**common, status="top_grade", recommendations=[])
    if gaps.skills_with_gap == 0:
        return RecommendationResult(**common, status="no_skill_gaps", recommendations=[])

    employee = next(e for e in dataset.employees if e.employee_id == employee_id)
    events = {event.event_id: event for event in dataset.events}
    history = [record for record in dataset.activity_history
               if record.employee_id == employee_id]
    candidates = []

    for event in dataset.events:
        if not event.active or employee.role not in event.audience:
            continue
        impacts = []
        for gain in event.skills:
            gap = gaps.gaps.get(gain.skill_id)
            if gap is None or gap.gap == 0:
                continue
            projected = min(gap.current + gain.gain, gain.max_level)
            reduction = min(gap.gap, max(0, projected - gap.current))
            if reduction == 0:
                continue
            weighted_reduction = reduction / gap.required * gap.importance
            mandatory_factor = 1.5 if gap.mandatory else 1.0
            impacts.append(SkillImpact(
                skill_id=gain.skill_id, current=gap.current,
                required=gap.required, gap=gap.gap, gain=gain.gain,
                max_level=gain.max_level, projected=projected,
                projected_gap=gap.gap - reduction, gap_reduction=reduction,
                importance=gap.importance, mandatory=gap.mandatory,
                weighted_gap_reduction=weighted_reduction,
                mandatory_factor=mandatory_factor,
                benefit=weighted_reduction * mandatory_factor,
            ))
        if not impacts:
            continue

        affected_skills = {impact.skill_id for impact in impacts}
        related = [record for record in history
                   if any(gain.skill_id in affected_skills
                          for gain in events[record.event_id].skills)]
        participation = Participation(
            completed=sum(r.status == "completed" for r in related),
            skipped=sum(r.status == "skipped" for r in related),
            declined=sum(r.status == "declined" for r in related),
            same_event_completed=sum(r.status == "completed" and r.event_id == event.event_id
                                     for r in related),
        )
        multiplier = max(0.25, min(1.25,
            1 + 0.05 * participation.completed - 0.15 * participation.skipped
              - 0.25 * participation.declined - 0.10 * participation.same_event_completed))
        benefit = sum(impact.benefit for impact in impacts)
        score = benefit * multiplier
        details = "; ".join(
            f"{impact.skill_id}: {impact.current}/{impact.required}, "
            f"разрыв {impact.gap}, после активности {impact.projected}/{impact.required}, "
            f"важность {impact.importance:g}, "
            f"{'обязательный' if impact.mandatory else 'дополнительный'} "
            f"(коэффициент {impact.mandatory_factor:g})"
            for impact in impacts
        )
        explanation = (
            f"Для перехода {gaps.current_grade} → {gaps.target_grade}: {details}. "
            f"История по развиваемым навыкам: завершено {participation.completed}, "
            f"пропущено {participation.skipped}, отказов {participation.declined}; "
            f"эту активность уже завершали {participation.same_event_completed} раз(а). "
            f"Оценка {score:g} = сокращение взвешенного разрыва {benefit:g} "
            f"× коэффициент истории {multiplier:g}."
        )
        candidates.append(Recommendation(
            event_id=event.event_id, title=event.title, score=score,
            grade_gap_benefit=benefit,
            skill_impact=impacts, participation=participation,
            history_multiplier=multiplier, explanation=explanation,
        ))

    candidates.sort(key=lambda item: (-item.score, item.event_id))
    return RecommendationResult(
        **common, status="recommended" if candidates else "no_matching_activity",
        recommendations=candidates,
    )


def get_recommendations(dataset: Dataset, employee_id: str, limit: int = 3) -> RecommendationResult:
    """Return 1–3 ranked activities without changing the validated dataset.

    History changes preference, but cannot make an activity with no useful skill
    gain relevant. Comparison uses the same ranking over all eligible activities.
    """
    if type(limit) is not int or not 1 <= limit <= 3:
        raise RecommendationError("invalid_limit", "limit must be an integer from 1 to 3")
    ranked = get_all_recommendations(dataset, employee_id)
    return ranked.model_copy(update={"recommendations": ranked.recommendations[:limit]})
