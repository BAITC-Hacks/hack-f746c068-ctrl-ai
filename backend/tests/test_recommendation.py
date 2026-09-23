import unittest

from backend.engine.recommendation import RecommendationError, get_recommendations
from backend.engine.skill_gap import SkillGapError
from backend.models import Dataset
from backend.scripts.generate_demo_data import build_demo


class RecommendationTests(unittest.TestCase):
    def setUp(self):
        self.dataset = build_demo()

    def test_conflicting_factors_choose_required_skill(self):
        before = self.dataset.model_dump(mode="json")
        result = get_recommendations(self.dataset, "E001", limit=1)
        self.assertEqual(result.status, "recommended")
        self.assertEqual(result.current_grade, "Middle")
        self.assertEqual(result.target_grade, "Senior")
        choice = result.recommendations[0]
        self.assertEqual(choice.event_id, "EV002")
        self.assertEqual(choice.skill_impact[0].skill_id, "SK_SYSTEM_DESIGN")
        self.assertEqual((choice.skill_impact[0].current, choice.skill_impact[0].required), (2, 4))
        self.assertEqual(choice.skill_impact[0].projected, 3)
        self.assertEqual(choice.participation.completed, 1)
        self.assertIn("Middle → Senior", choice.explanation)
        self.assertIn("SK_SYSTEM_DESIGN: 2/4", choice.explanation)
        self.assertIn("завершено 1", choice.explanation)
        self.assertNotEqual(choice.event_id, "EV003")  # lowest skill was Public Speaking
        self.assertEqual(self.dataset.model_dump(mode="json"), before)

    def test_new_profile_and_history_affect_rank(self):
        payload = self.dataset.model_dump(mode="json")
        payload["employees"].append({
            "employee_id": "E999", "name": "Synthetic New Employee", "role": "Backend Engineer",
            "grade": "Middle", "tenure_months": 12,
            "skills": {"SK_SYSTEM_DESIGN": 2, "SK_PYTHON": 4, "SK_SQL": 4,
                       "SK_TESTING": 4, "SK_COMMUNICATION": 3, "SK_PUBLIC_SPEAKING": 0},
        })
        for i, status in enumerate(("skipped", "skipped", "declined"), start=1):
            payload["activity_history"].append({
                "record_id": f"NEW{i}", "employee_id": "E999", "event_id": "EV003",
                "status": status, "event_date": f"2026-01-0{i}",
            })
        for event in payload["events"]:
            event["active"] = event["event_id"] in {"EV001", "EV003"}
        dataset = Dataset.model_validate(payload)
        result = get_recommendations(dataset, "E999")
        self.assertEqual(result.recommendations[0].event_id, "EV001")
        speaking = next((r for r in result.recommendations if r.event_id == "EV003"), None)
        self.assertIsNotNone(speaking)
        self.assertEqual(speaking.participation.skipped, 2)
        self.assertEqual(speaking.participation.declined, 1)
        self.assertLess(speaking.score, result.recommendations[0].score)

    def test_only_useful_active_role_eligible_events_are_candidates(self):
        payload = self.dataset.model_dump(mode="json")
        event = next(e for e in payload["events"] if e["event_id"] == "EV001")
        event["skills"][0]["max_level"] = 2  # E001 is already at this cap
        dataset = Dataset.model_validate(payload)
        result = get_recommendations(dataset, "E001")
        ids = [r.event_id for r in result.recommendations]
        self.assertNotIn("EV001", ids)
        self.assertNotIn("EV026", ids)  # archived
        self.assertEqual(ids[0], "EV002")
        for choice in result.recommendations:
            event = next(e for e in dataset.events if e.event_id == choice.event_id)
            self.assertIn("Backend Engineer", event.audience)
            self.assertTrue(all(item.gap_reduction > 0 for item in choice.skill_impact))

    def test_no_step_cases_and_errors(self):
        self.assertEqual(get_recommendations(self.dataset, "E003").status, "no_skill_gaps")
        self.assertEqual(get_recommendations(self.dataset, "E004").status, "top_grade")
        self.assertEqual(get_recommendations(self.dataset, "E005").status, "no_matching_activity")
        self.assertEqual(get_recommendations(self.dataset, "E005").recommendations, [])
        with self.assertRaises(SkillGapError):
            get_recommendations(self.dataset, "unknown")
        with self.assertRaises(RecommendationError):
            get_recommendations(self.dataset, "E001", limit=4)


if __name__ == "__main__":
    unittest.main()
