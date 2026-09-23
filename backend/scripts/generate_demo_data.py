"""Generate deterministic, explicitly synthetic demo data and JSON Schemas."""

import argparse
import csv
import json
import random
from datetime import date, timedelta
from pathlib import Path

from pydantic import TypeAdapter

from backend.data_loader import DEFAULT_DATA_DIR, HISTORY_COLUMNS
from backend.models import Dataset

ROLES = {
    "Backend Engineer": ["PYTHON", "SYSTEM_DESIGN", "SQL", "TESTING"],
    "Frontend Engineer": ["JAVASCRIPT", "REACT", "ACCESSIBILITY", "TESTING"],
    "Data Analyst": ["SQL", "STATISTICS", "VISUALIZATION", "PYTHON"],
    "Product Manager": ["DISCOVERY", "PRIORITIZATION", "ANALYTICS", "STRATEGY"],
}
SHARED = ["COMMUNICATION", "PUBLIC_SPEAKING", "LEADERSHIP"]
GRADES = ["Junior", "Middle", "Senior", "Lead"]


def build_demo(seed: int = 42) -> Dataset:
    rng = random.Random(seed)
    skill_names = sorted(set(SHARED).union(*(set(s) for s in ROLES.values())))
    catalog = [{"skill_id": f"SK_{s}", "name": s.replace("_", " ").title(),
                "category": "interpersonal" if s in SHARED else "technical",
                "max_level": 5} for s in skill_names]
    tracks = []
    for role, technical in ROLES.items():
        requirements = {}
        for index, grade in enumerate(GRADES):
            req = {f"SK_{s}": {"level": min(index + 2, 5), "importance": 1.0,
                               "mandatory": True} for s in technical}
            req["SK_COMMUNICATION"] = {"level": index + 1, "importance": 0.8, "mandatory": True}
            req["SK_PUBLIC_SPEAKING"] = {"level": max(1, index), "importance": 0.4, "mandatory": False}
            if grade == "Lead":
                req["SK_LEADERSHIP"] = {"level": 4, "importance": 1.0, "mandatory": True}
            requirements[grade] = req
        tracks.append({"role": role, "grades": GRADES, "requirements": requirements})

    # Two formats per role-specific primary skill, plus shared development activities.
    events = []

    def add_event(title, kind, category, audience, skill, cap=4, active=True):
        events.append({"event_id": f"EV{len(events) + 1:03d}", "title": title,
                       "type": kind, "category": category, "audience": audience,
                       "skills": [{"skill_id": f"SK_{skill}", "gain": 1, "max_level": cap}],
                       "duration_hours": 8.0, "active": active})

    add_event("System Design Workshop", "workshop", "architecture", ["Backend Engineer"], "SYSTEM_DESIGN")
    add_event("Architecture Mentoring", "mentoring", "architecture", ["Backend Engineer"], "SYSTEM_DESIGN", 5)
    add_event("Public Speaking Meetup", "meetup", "public_speaking", list(ROLES), "PUBLIC_SPEAKING")
    for role, skills in ROLES.items():
        for skill in skills[:2]:
            for kind in ("course", "project"):
                add_event(f"{role}: {skill.replace('_', ' ').title()} {kind.title()}",
                          kind, skill.lower(), [role], skill, 4 if kind == "course" else 5)
    for skill in SHARED:
        for kind in ("workshop", "mentoring"):
            add_event(f"{skill.replace('_', ' ').title()} {kind.title()}", kind,
                      skill.lower(), list(ROLES), skill)
    add_event("Archived Python Workshop", "workshop", "python", ["Backend Engineer"], "PYTHON", active=False)

    employees = []
    for i in range(48):
        role = list(ROLES)[i % len(ROLES)]
        grade_index = (i // len(ROLES)) % len(GRADES)
        skills = {f"SK_{s}": rng.randint(max(0, grade_index), min(5, grade_index + 3))
                  for s in ROLES[role] + SHARED}
        employees.append({"employee_id": f"E{i + 1:03d}", "name": f"Demo Employee {i + 1:03d}",
                          "role": role, "grade": GRADES[grade_index],
                          "tenure_months": rng.randint(1, 96), "skills": skills})
    employees[0].update(grade="Middle", skills={"SK_PYTHON": 3, "SK_SYSTEM_DESIGN": 2,
                       "SK_SQL": 4, "SK_TESTING": 4, "SK_COMMUNICATION": 3,
                       "SK_PUBLIC_SPEAKING": 1})
    # Named edge cases: no history; no measured skills; exceeded requirements;
    # highest grade; technical gap with no matching development event.
    employees[1].update(grade="Middle", skills={})
    employees[2].update(grade="Middle", skills={f"SK_{s}": 5 for s in skill_names})
    employees[3].update(grade="Lead")
    employees[4].update(grade="Middle", skills={f"SK_{s}": 5 for s in skill_names})
    employees[4]["skills"]["SK_TESTING"] = 0
    history = []

    def record(employee_id, event_id, status, day):
        history.append({"record_id": f"H{len(history) + 1:04d}", "employee_id": employee_id,
                        "event_id": event_id, "status": status,
                        "event_date": (date(2026, 1, 1) + timedelta(days=day)).isoformat()})

    for day, status in enumerate(["skipped", "skipped", "declined"]):
        record("E001", "EV003", status, 30 * day)
    record("E001", "EV001", "completed", 95)
    record("E001", "EV026", "completed", 110)
    for employee in employees[2:]:
        eligible = [e for e in events if employee["role"] in e["audience"]]
        for day in sorted(rng.sample(range(180), 5)):
            event = rng.choice(eligible)
            status = rng.choices(["completed", "skipped", "declined", "invited", "enrolled"],
                                 weights=[6, 2, 1, 1, 1])[0]
            record(employee["employee_id"], event["event_id"], status, day)
    return Dataset.model_validate({"employees": employees, "events": events,
                                   "skills": {"schema_version": "1.0", "skill_catalog": catalog,
                                              "career_tracks": tracks}, "activity_history": history})


def write_demo(dataset: Dataset, output: Path, force: bool = False):
    targets = [output / name for name in ("employees.json", "events.json", "skills.json", "activity_history.csv")]
    if not force and any(path.exists() for path in targets):
        raise FileExistsError("Dataset files already exist; choose another --output or explicitly use --force")
    output.mkdir(parents=True, exist_ok=True)
    payload = dataset.model_dump(mode="json")
    for field in ("employees", "events", "skills"):
        (output / f"{field}.json").write_text(
            json.dumps(payload[field], ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    with (output / "activity_history.csv").open("w", encoding="utf-8", newline="") as stream:
        writer = csv.DictWriter(stream, fieldnames=HISTORY_COLUMNS, lineterminator="\n")
        writer.writeheader()
        writer.writerows(payload["activity_history"])


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=DEFAULT_DATA_DIR)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--force", action="store_true")
    parser.add_argument("--schemas", type=Path, help="Export JSON Schemas to this directory")
    args = parser.parse_args()
    try:
        dataset = build_demo(args.seed)
        write_demo(dataset, args.output, args.force)
    except (OSError, ValueError) as exc:
        parser.exit(1, f"{exc}\n")
    if args.schemas:
        args.schemas.mkdir(parents=True, exist_ok=True)
        schema_models = {
            name: Dataset.model_fields[field].rebuild_annotation()
            for name, field in [("employees", "employees"), ("events", "events"),
                                ("skills", "skills"), ("history", "activity_history")]
        }
        schema_models["dataset"] = Dataset
        for name, model in schema_models.items():
            schema = TypeAdapter(model).json_schema()
            schema["$schema"] = "https://json-schema.org/draft/2020-12/schema"
            (args.schemas / f"{name}.schema.json").write_text(json.dumps(schema, indent=2) + "\n", encoding="utf-8")
    print(f"Generated {len(dataset.employees)} employees, {len(dataset.events)} events, "
          f"{len(dataset.skills.skill_catalog)} skills, {len(dataset.activity_history)} history records")


if __name__ == "__main__":
    main()
