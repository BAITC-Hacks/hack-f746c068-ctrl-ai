import json
import tempfile
import unittest
from pathlib import Path

from pydantic import ValidationError

from backend.data_loader import DEFAULT_DATA_DIR, DatasetValidationError, load_dataset
from backend.models import Dataset
from backend.scripts.generate_demo_data import build_demo, write_demo


class DatasetTests(unittest.TestCase):
    def setUp(self):
        self.payload = build_demo().model_dump(mode="json")

    def test_demo_reproducible_and_diverse(self):
        self.assertEqual(self.payload, build_demo().model_dump(mode="json"))
        self.assertNotEqual(self.payload, build_demo(7).model_dump(mode="json"))
        self.assertEqual(len(self.payload["employees"]), 48)
        self.assertEqual(len(self.payload["skills"]["career_tracks"]), 4)

    def test_file_round_trip(self):
        with tempfile.TemporaryDirectory() as directory:
            write_demo(build_demo(), Path(directory))
            self.assertEqual(load_dataset(directory).model_dump(mode="json"), self.payload)
            with self.assertRaises(FileExistsError):
                write_demo(build_demo(), Path(directory))

    def test_checked_in_dataset_matches_generator(self):
        self.assertEqual(load_dataset(DEFAULT_DATA_DIR).model_dump(mode="json"), self.payload)

    def test_broken_references_and_duplicates(self):
        mutations = [
            (lambda p: p["employees"][1].update(employee_id="E001"), "duplicate"),
            (lambda p: p["employees"][0].update(role="Unknown"), "unknown role"),
            (lambda p: p["employees"][0].update(grade="Expert"), "unknown grade"),
            (lambda p: p["employees"][0]["skills"].update(SK_FAKE=1), "unknown skill"),
            (lambda p: p["events"][0].update(audience=["Unknown"]), "unknown role"),
            (lambda p: p["activity_history"][0].update(event_id="EV_FAKE"), "unknown event"),
            (lambda p: p["activity_history"][0].update(employee_id="E_FAKE"), "unknown employee"),
        ]
        for mutate, message in mutations:
            with self.subTest(message=message):
                payload = build_demo().model_dump(mode="json")
                mutate(payload)
                with self.assertRaisesRegex(ValidationError, message):
                    Dataset.model_validate(payload)

    def test_invalid_levels_types_and_required_fields(self):
        for value in [-1, 6, True, "3", 2.5]:
            with self.subTest(level=value):
                self.payload["employees"][0]["skills"]["SK_PYTHON"] = value
                with self.assertRaises(ValidationError):
                    Dataset.model_validate(self.payload)
        del self.payload["employees"][0]["employee_id"]
        with self.assertRaisesRegex(ValidationError, "employee_id"):
            Dataset.model_validate(self.payload)

    def test_empty_missing_or_duplicate_grade_configuration(self):
        for mutation in [
            lambda t: t["requirements"].update(Senior={}),
            lambda t: t["requirements"].pop("Senior"),
            lambda t: t["grades"].append("Senior"),
        ]:
            payload = build_demo().model_dump(mode="json")
            mutation(payload["skills"]["career_tracks"][0])
            with self.assertRaises(ValidationError):
                Dataset.model_validate(payload)

    def test_catalog_caps_and_history_format(self):
        self.payload["skills"]["skill_catalog"][0]["max_level"] = 1
        with self.assertRaisesRegex(ValidationError, "exceeds skill max_level"):
            Dataset.model_validate(self.payload)
        for field, value in [("status", "unknown"), ("event_date", "2026-02-30"),
                             ("event_date", "0"), ("event_date", "2026-01-01T00:00:00")]:
            payload = build_demo().model_dump(mode="json")
            payload["activity_history"][0][field] = value
            with self.assertRaises(ValidationError):
                Dataset.model_validate(payload)

    def test_nonfinite_duration_is_rejected(self):
        self.payload["events"][0]["duration_hours"] = float("inf")
        with self.assertRaises(ValidationError):
            Dataset.model_validate(self.payload)

    def test_import_errors_have_context(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            with self.assertRaisesRegex(DatasetValidationError, "employees.json"):
                load_dataset(root)
            write_demo(build_demo(), root)
            employees = root / "employees.json"
            employees.write_text('{"x": 1, "x": 2}', encoding="utf-8")
            with self.assertRaisesRegex(DatasetValidationError, "duplicate JSON key"):
                load_dataset(root)
            employees.write_text("{", encoding="utf-8")
            with self.assertRaisesRegex(DatasetValidationError, "employees.json"):
                load_dataset(root)
            employees.write_text(json.dumps(self.payload["employees"]), encoding="utf-8")
            for content in ["bad,headers\na,b\n", "record_id,employee_id,event_id,status,event_date\nH,E,EV\n"]:
                (root / "activity_history.csv").write_text(content, encoding="utf-8")
                with self.assertRaisesRegex(DatasetValidationError, "activity_history.csv"):
                    load_dataset(root)


if __name__ == "__main__":
    unittest.main()
