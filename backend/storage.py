"""Transactional local state; seed JSON/CSV files are never modified."""

from contextlib import closing
import json
from pathlib import Path
import sqlite3
from uuid import uuid4

from backend.models import Dataset


class StateConflict(ValueError):
    def __init__(self, code: str, message: str):
        self.code = code
        super().__init__(message)


class DatasetStore:
    def __init__(self, path: str | Path, seed: Dataset):
        self.path = Path(path)
        self.path.parent.mkdir(parents=True, exist_ok=True)
        with closing(self._connect()) as connection, connection:
            connection.execute("CREATE TABLE IF NOT EXISTS state "
                               "(id INTEGER PRIMARY KEY CHECK (id = 1), epoch TEXT NOT NULL, payload TEXT NOT NULL)")
            connection.execute("CREATE TABLE IF NOT EXISTS requests "
                               "(scope TEXT, request_key TEXT, target TEXT NOT NULL, epoch TEXT NOT NULL, "
                               "response TEXT NOT NULL, PRIMARY KEY (scope, request_key))")
            connection.execute("INSERT OR IGNORE INTO state VALUES (1, ?, ?)",
                               (uuid4().hex, seed.model_dump_json()))
        self.snapshot()  # Fail on corrupt state instead of silently resetting progress.

    def _connect(self):
        return sqlite3.connect(self.path, timeout=15)

    def snapshot(self) -> Dataset:
        with closing(self._connect()) as connection:
            row = connection.execute("SELECT payload FROM state WHERE id=1").fetchone()
            return Dataset.model_validate_json(row[0])

    def update(self, transform, *, replace: bool = False):
        """Serialize validation, modification and commit across threads/processes."""
        with closing(self._connect()) as connection, connection:
            connection.execute("BEGIN IMMEDIATE")
            epoch, payload = connection.execute("SELECT epoch, payload FROM state WHERE id=1").fetchone()
            dataset, result = transform(Dataset.model_validate_json(payload))
            validated = Dataset.model_validate(dataset.model_dump(mode="json"))
            connection.execute("UPDATE state SET epoch=?, payload=? WHERE id=1",
                               (uuid4().hex if replace else epoch, validated.model_dump_json()))
            return result

    def complete(self, scope: str, request_key: str, target: str, transform):
        """Persist response and state together; retries replay the original response."""
        with closing(self._connect()) as connection, connection:
            connection.execute("BEGIN IMMEDIATE")
            epoch, payload = connection.execute("SELECT epoch, payload FROM state WHERE id=1").fetchone()
            prior = connection.execute(
                "SELECT target, epoch, response FROM requests WHERE scope=? AND request_key=?",
                (scope, request_key),
            ).fetchone()
            if prior:
                if prior[0] != target:
                    raise StateConflict("idempotency_conflict", "This key was used for a different activity or employee")
                if prior[1] != epoch:
                    raise StateConflict("dataset_replaced", "Dataset was replaced; use a new completion key")
                return json.loads(prior[2]), True
            dataset, result = transform(Dataset.model_validate_json(payload))
            validated = Dataset.model_validate(dataset.model_dump(mode="json"))
            response = result.model_dump(mode="json")
            connection.execute("UPDATE state SET payload=? WHERE id=1", (validated.model_dump_json(),))
            connection.execute("INSERT INTO requests VALUES (?, ?, ?, ?, ?)",
                               (scope, request_key, target, epoch, json.dumps(response)))
            return response, False
