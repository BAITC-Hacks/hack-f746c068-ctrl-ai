import unittest
from datetime import date

from backend.engine.progress import ProgressError, complete_activity
from backend.models import Dataset
from backend.scripts.generate_demo_data import build_demo


class ProgressTests(unittest.TestCase):
    def setUp(self):
        self.dataset = build_demo()

    def test_e001_completion_recalculates_readiness_and_recommendations(self):
        before = self.dataset.model_dump(mode="json")
        updated, result = complete_activity(
            self.dataset, "E001", "EV002", "NEW-E001-EV002", date(2026, 9, 23))
        self.assertEqual(result.status, "completed")
        self.assertEqual(len(updated.activity_history), len(self.dataset.activity_history) + 1)
        self.assertEqual(updated.activity_history[-1].status, "completed")
        self.assertEqual(updated.activity_history[-1].record_id, "NEW-E001-EV002")
        self.assertEqual((result.skill_changes[0].before, result.skill_changes[0].after), (2, 3))
        self.assertEqual(result.skill_changes[0].applied_gain, 1)
        self.assertAlmostEqual(result.readiness_before.readiness_percent, 100 * 4.25 / 5.2)
        self.assertAlmostEqual(result.readiness_after.readiness_percent, 100 * 4.5 / 5.2)
        self.assertEqual(result.recommendations_before.recommendations[0].event_id, "EV002")
        self.assertEqual(result.recommendations_after.recommendations[0].event_id, "EV006")
        self.assertEqual(self.dataset.model_dump(mode="json"), before)

        repeated, duplicate = complete_activity(
            updated, "E001", "EV002", "NEW-E001-EV002", date(2026, 9, 23))
        self.assertIs(repeated, updated)
        self.assertEqual(duplicate.status, "already_completed")
        self.assertEqual(duplicate.skill_changes, [])
        self.assertEqual(len(repeated.activity_history), len(updated.activity_history))

    def test_multiple_gains_respect_each_cap_and_never_reduce_a_skill(self):
        payload = self.dataset.model_dump(mode="json")
        event = next(e for e in payload["events"] if e["event_id"] == "EV002")
        event["skills"] = [
            {"skill_id": "SK_SYSTEM_DESIGN", "gain": 2, "max_level": 3},
            {"skill_id": "SK_PYTHON", "gain": 2, "max_level": 4},
        ]
        dataset = Dataset.model_validate(payload)
        updated, result = complete_activity(dataset, "E001", "EV002", "MULTI-1", date(2026, 9, 23))
        changes = {change.skill_id: change for change in result.skill_changes}
        self.assertEqual((changes["SK_SYSTEM_DESIGN"].before,
                          changes["SK_SYSTEM_DESIGN"].after), (2, 3))
        self.assertEqual((changes["SK_PYTHON"].before, changes["SK_PYTHON"].after), (3, 4))
        employee = next(e for e in updated.employees if e.employee_id == "E001")
        self.assertEqual(employee.skills["SK_SYSTEM_DESIGN"], 3)
        self.assertEqual(employee.skills["SK_PYTHON"], 4)

        payload = self.dataset.model_dump(mode="json")
        employee = next(e for e in payload["employees"] if e["employee_id"] == "E001")
        employee["skills"]["SK_SYSTEM_DESIGN"] = 5
        dataset = Dataset.model_validate(payload)
        updated, result = complete_activity(dataset, "E001", "EV001", "CAP-1", date(2026, 9, 23))
        self.assertEqual(result.skill_changes[0].applied_gain, 0)
        self.assertEqual(result.skill_changes[0].after, 5)
        self.assertEqual(next(e for e in updated.employees if e.employee_id == "E001")
                         .skills["SK_SYSTEM_DESIGN"], 5)

    def test_new_profile_with_history_uses_same_rules(self):
        payload = self.dataset.model_dump(mode="json")
        payload["employees"].append({
            "employee_id": "E999", "name": "Synthetic New Employee", "role": "Backend Engineer",
            "grade": "Middle", "tenure_months": 12, "skills": {},
        })
        payload["activity_history"].append({
            "record_id": "NEW-H1", "employee_id": "E999", "event_id": "EV003",
            "status": "skipped", "event_date": "2026-09-01",
        })
        dataset = Dataset.model_validate(payload)
        updated, result = complete_activity(dataset, "E999", "EV002", "NEW-H2", date(2026, 9, 23))
        self.assertEqual(result.skill_changes[0].before, 0)
        self.assertEqual(result.skill_changes[0].after, 1)
        self.assertGreater(result.readiness_after.readiness_percent,
                           result.readiness_before.readiness_percent)
        self.assertEqual(sum(r.employee_id == "E999" for r in updated.activity_history), 2)

    def test_invalid_completion_does_not_change_input(self):
        before = self.dataset.model_dump(mode="json")
        cases = [
            ("absent", "EV002", "X1", "employee_not_found"),
            ("E001", "absent", "X2", "event_not_found"),
            ("E001", "EV026", "X3", "inactive_event"),
            ("E002", "EV002", "X4", "ineligible_role"),
            ("E001", "EV002", "H0001", "record_id_conflict"),
        ]
        for employee_id, event_id, record_id, code in cases:
            with self.subTest(code=code), self.assertRaises(ProgressError) as caught:
                complete_activity(self.dataset, employee_id, event_id, record_id, date(2026, 9, 23))
            self.assertEqual(caught.exception.code, code)
        self.assertEqual(self.dataset.model_dump(mode="json"), before)


if __name__ == "__main__":
    unittest.main()
