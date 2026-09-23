"""Load the complete snapshot atomically: invalid input never returns partial data."""

import csv
import json
from pathlib import Path

from pydantic import ValidationError

from backend.models import Dataset

DEFAULT_DATA_DIR = Path(__file__).resolve().parent / "data"
HISTORY_COLUMNS = ["record_id", "employee_id", "event_id", "status", "event_date"]


class DatasetValidationError(ValueError):
    """User-facing import error with a file or field location."""


def reject_duplicate_keys(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise ValueError(f"duplicate JSON key '{key}'")
        result[key] = value
    return result


def load_dataset(directory: str | Path = DEFAULT_DATA_DIR) -> Dataset:
    directory = Path(directory)
    payload = {}
    for field in ("employees", "events", "skills"):
        path = directory / f"{field}.json"
        try:
            payload[field] = json.loads(
                path.read_text(encoding="utf-8-sig"),
                object_pairs_hook=reject_duplicate_keys,
            )
        except (OSError, UnicodeError, ValueError) as exc:
            raise DatasetValidationError(f"{path.name}: {exc}") from exc

    path = directory / "activity_history.csv"
    try:
        with path.open(encoding="utf-8-sig", newline="") as stream:
            reader = csv.DictReader(stream, strict=True)
            headers = reader.fieldnames or []
            if len(headers) != len(HISTORY_COLUMNS) or set(headers) != set(HISTORY_COLUMNS):
                raise ValueError(f"expected CSV columns: {', '.join(HISTORY_COLUMNS)}")
            records = []
            for row in reader:
                if None in row or any(value is None for value in row.values()):
                    raise ValueError(f"line {reader.line_num}: incorrect number of columns")
                records.append(row)
            payload["activity_history"] = records
    except (OSError, UnicodeError, ValueError, csv.Error) as exc:
        raise DatasetValidationError(f"{path.name}: {exc}") from exc

    try:
        return Dataset.model_validate(payload)
    except ValidationError as exc:
        messages = []
        for error in exc.errors(include_url=False, include_input=False):
            location = ".".join(map(str, error["loc"])) or "dataset"
            messages.append(f"{location}: {error['msg']}")
        raise DatasetValidationError("\n".join(messages)) from exc
