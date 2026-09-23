"""Run validation and inspect skill gaps without an HTTP server."""

import argparse
import json

from backend.data_loader import DEFAULT_DATA_DIR, DatasetValidationError, load_dataset
from backend.engine.skill_gap import SkillGapError, get_employee_skill_gaps


def main():
    parser = argparse.ArgumentParser(description="Career Quest: dataset validation and skill gaps")
    parser.add_argument("--data-dir", default=str(DEFAULT_DATA_DIR))
    subcommands = parser.add_subparsers(dest="command", required=True)
    subcommands.add_parser("validate", help="Validate all four files and their references")
    gaps = subcommands.add_parser("gaps", help="Calculate requirements for the next grade")
    gaps.add_argument("employee_id")
    args = parser.parse_args()
    try:
        dataset = load_dataset(args.data_dir)
        if args.command == "validate":
            result = {"status": "valid", "schema_version": dataset.skills.schema_version,
                      "employees": len(dataset.employees), "events": len(dataset.events),
                      "skills": len(dataset.skills.skill_catalog),
                      "career_tracks": len(dataset.skills.career_tracks),
                      "history_records": len(dataset.activity_history)}
        else:
            result = get_employee_skill_gaps(dataset, args.employee_id).model_dump(mode="json")
    except (DatasetValidationError, SkillGapError) as exc:
        error = {"error": getattr(exc, "code", "invalid_dataset"), "message": str(exc)}
        parser.exit(1, json.dumps(error, ensure_ascii=True, indent=2) + "\n")
    print(json.dumps(result, ensure_ascii=True, indent=2))


if __name__ == "__main__":
    main()
