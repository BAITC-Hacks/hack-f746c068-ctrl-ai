from datetime import date
import unittest

from backend.engine.grade_progress import get_employee_grade_readiness
from backend.engine.progress import ProgressError
from backend.api.presenters import complete_activity_response as complete_activity
from backend.engine.recommendation import get_recommendations
from backend.models import Dataset
from backend.scripts.generate_demo_data import build_demo


class ProgressTests(unittest.TestCase):
    def setUp(self):
        self.dataset = build_demo()
        self.today = date(2026, 9, 23)

    def test_completion_recalculates_gaps_readiness_and_history_factors(self):
        original = self.dataset.model_dump(mode="json")
        updated, result = complete_activity(self.dataset, "E001", "EV002", "COMP_1", self.today)
        self.assertEqual([(c.skill_id, c.before, c.after, c.gain_applied)
                          for c in result.skill_changes], [("SK_SYSTEM_DESIGN", 2, 3, 1)])
        self.assertEqual(result.skill_gaps.gaps["SK_SYSTEM_DESIGN"].gap, 1)
        self.assertAlmostEqual(result.readiness_before.readiness_percent, 100 * 4.25 / 5.2)
        self.assertAlmostEqual(result.readiness_after.readiness_percent, 100 * 4.50 / 5.2)
        self.assertEqual(result.recommendations, get_recommendations(updated, "E001"))
        architecture = next(item for item in result.recommendations.recommendations
                            if any(impact.skill_id == "SK_SYSTEM_DESIGN" for impact in item.skill_impact))
        self.assertEqual(architecture.participation.completed, 2)
        self.assertNotEqual(result.recommendations.recommendations[0].event_id, "EV002")
        self.assertEqual(updated.activity_history[-1].record_id, "COMP_1")
        self.assertEqual(updated.activity_history[-1].status, "completed")
        self.assertEqual(updated.activity_history[-1].event_date, self.today)
        self.assertEqual(updated.employees[0].grade, "Middle")
        self.assertEqual(self.dataset.model_dump(mode="json"), original)
        updated.skills.skill_catalog[0].name = "Changed copy"
        self.assertEqual(self.dataset.model_dump(mode="json"), original)

    def test_caps_truncate_gain_without_lowering_an_existing_skill(self):
        payload = self.dataset.model_dump()
        payload["employees"][0]["skills"]["SK_SYSTEM_DESIGN"] = 3
        payload["employees"][0]["skills"]["SK_PYTHON"] = 5
        payload["events"][0]["skills"] = [
            {"skill_id": "SK_SYSTEM_DESIGN", "gain": 3, "max_level": 4},
            {"skill_id": "SK_PYTHON", "gain": 1, "max_level": 4},
            {"skill_id": "SK_LEADERSHIP", "gain": 2, "max_level": 4},
        ]
        dataset = Dataset.model_validate(payload)
        updated, result = complete_activity(dataset, "E001", "EV001", "CAP", self.today)
        changes = {item.skill_id: item for item in result.skill_changes}
        self.assertEqual((changes["SK_SYSTEM_DESIGN"].after, changes["SK_SYSTEM_DESIGN"].gain_applied), (4, 1))
        self.assertEqual((changes["SK_PYTHON"].after, changes["SK_PYTHON"].gain_applied), (5, 0))
        self.assertEqual((changes["SK_LEADERSHIP"].before, changes["SK_LEADERSHIP"].after), (0, 2))
        self.assertEqual(updated.employees[0].skills["SK_LEADERSHIP"], 2)

    def test_repeated_catalog_activity_requires_a_new_record_id(self):
        updated, _ = complete_activity(self.dataset, "E001", "EV001", "REPEAT_1", self.today)
        unchanged, duplicate = complete_activity(updated, "E001", "EV001", "REPEAT_1", self.today)
        self.assertEqual(unchanged, updated)
        self.assertEqual(duplicate.skill_changes, [])
        repeated, result = complete_activity(updated, "E001", "EV001", "REPEAT_2", self.today)
        self.assertEqual(result.skill_changes[0].after, 4)
        self.assertEqual(len(repeated.activity_history), len(self.dataset.activity_history) + 2)
        capped, result = complete_activity(repeated, "E001", "EV001", "REPEAT_3", self.today)
        self.assertEqual(result.skill_changes[0].gain_applied, 0)
        self.assertEqual(len(capped.activity_history), len(self.dataset.activity_history) + 3)

    def test_failures_do_not_change_the_input(self):
        original = self.dataset.model_dump()
        cases = [
            ("UNKNOWN", "EV001", "NEW", "employee_not_found"),
            ("E001", "UNKNOWN", "NEW", "event_not_found"),
            ("E001", "EV026", "NEW", "inactive_event"),
            ("E002", "EV001", "NEW", "ineligible_role"),
            ("E001", "EV001", self.dataset.activity_history[0].record_id, "record_id_conflict"),
        ]
        for employee_id, event_id, record_id, code in cases:
            with self.subTest(code=code), self.assertRaises(ProgressError) as error:
                complete_activity(self.dataset, employee_id, event_id, record_id, self.today)
            self.assertEqual(error.exception.code, code)
            self.assertEqual(self.dataset.model_dump(), original)

    def test_new_profile_with_skips_and_refusals_can_complete_recommended_step(self):
        payload = self.dataset.model_dump(mode="json")
        payload["employees"].append({
            "employee_id": "NEW_PERSON", "name": "Synthetic newcomer", "role": "Backend Engineer",
            "grade": "Middle", "tenure_months": 12,
            "skills": {"SK_SYSTEM_DESIGN": 2, "SK_PYTHON": 4, "SK_SQL": 4,
                       "SK_TESTING": 4, "SK_COMMUNICATION": 3},
        })
        for index, status in enumerate(("skipped", "skipped", "declined")):
            payload["activity_history"].append({
                "record_id": f"NEW_HISTORY_{index}", "employee_id": "NEW_PERSON",
                "event_id": "EV003", "status": status, "event_date": "2026-09-01",
            })
        imported = Dataset.model_validate(payload)
        choice = get_recommendations(imported, "NEW_PERSON").recommendations[0]
        self.assertEqual(choice.skill_impact[0].skill_id, "SK_SYSTEM_DESIGN")
        updated, result = complete_activity(imported, "NEW_PERSON", choice.event_id, "NEW_DONE", self.today)
        self.assertGreater(result.readiness_after.readiness_percent, result.readiness_before.readiness_percent)
        self.assertEqual(result.skill_gaps.gaps["SK_SYSTEM_DESIGN"].current, 3)
        self.assertEqual(updated.activity_history[-1].employee_id, "NEW_PERSON")
        self.assertEqual(sum(record.status == "skipped" for record in updated.activity_history
                             if record.employee_id == "NEW_PERSON"), 2)
        self.assertEqual(result.readiness_after, get_employee_grade_readiness(updated, "NEW_PERSON"))

    def test_top_grade_completion_keeps_readiness_undefined(self):
        updated, result = complete_activity(self.dataset, "E004", "EV003", "TOP", self.today)
        self.assertIsNone(result.readiness_before.readiness_percent)
        self.assertIsNone(result.readiness_after.readiness_percent)
        self.assertEqual(result.recommendations.status, "top_grade")
        self.assertEqual(len(updated.activity_history), len(self.dataset.activity_history) + 1)


if __name__ == "__main__":
    unittest.main()
