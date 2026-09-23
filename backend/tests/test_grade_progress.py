import unittest

from backend.engine.grade_progress import (
    calculate_grade_readiness,
    get_employee_grade_readiness,
)
from backend.models import CareerTrack, Employee
from backend.scripts.generate_demo_data import build_demo


class GradeProgressTests(unittest.TestCase):
    def setUp(self):
        self.dataset = build_demo()

    def test_known_profile_has_explainable_weighted_result(self):
        result = get_employee_grade_readiness(self.dataset, "E001")
        self.assertEqual((result.current_grade, result.target_grade), ("Middle", "Senior"))
        self.assertAlmostEqual(result.readiness_percent, 100 * 4.25 / 5.2)
        self.assertAlmostEqual(result.mandatory_readiness_percent, 100 * 4.05 / 4.8)
        self.assertFalse(result.meets_mandatory)
        self.assertEqual(result.skills["SK_SYSTEM_DESIGN"].progress_percent, 50)
        self.assertEqual(result.skills["SK_PUBLIC_SPEAKING"].progress_percent, 50)
        self.assertFalse(result.skills["SK_PUBLIC_SPEAKING"].mandatory)

    def test_zero_full_and_last_grade(self):
        missing = get_employee_grade_readiness(self.dataset, "E002")
        self.assertEqual(missing.readiness_percent, 0)
        self.assertEqual(missing.mandatory_readiness_percent, 0)
        self.assertFalse(missing.meets_mandatory)
        full = get_employee_grade_readiness(self.dataset, "E003")
        self.assertEqual(full.readiness_percent, 100)
        self.assertTrue(full.meets_mandatory)
        top = get_employee_grade_readiness(self.dataset, "E004")
        self.assertEqual(top.status, "top_grade")
        self.assertIsNone(top.readiness_percent)
        self.assertIsNone(top.mandatory_readiness_percent)
        self.assertIsNone(top.meets_mandatory)
        self.assertEqual(top.skills, {})

    def test_optional_gap_does_not_block_mandatory_requirements(self):
        track = CareerTrack.model_validate({
            "role": "Custom", "grades": ["Junior", "Senior"],
            "requirements": {
                "Junior": {"SK_CORE": {"level": 1}},
                "Senior": {
                    "SK_CORE": {"level": 4, "importance": 1.0, "mandatory": True},
                    "SK_EXTRA": {"level": 2, "importance": 0.5, "mandatory": False},
                },
            },
        })
        employee = Employee(employee_id="E", name="Demo", role="Custom",
                            grade="Junior", tenure_months=12, skills={"SK_CORE": 4})
        result = calculate_grade_readiness(employee, track)
        self.assertAlmostEqual(result.readiness_percent, 100 / 1.5)
        self.assertEqual(result.mandatory_readiness_percent, 100)
        self.assertTrue(result.meets_mandatory)

    def test_full_readiness_with_fractional_weights_stays_at_100(self):
        employee = self.dataset.employees[0].model_copy(deep=True)
        track = self.dataset.skills.career_tracks[0].model_copy(deep=True)
        weights = [0.74, 0.46, 0.59, 0.35, 0.85, 0.71]
        for (skill_id, requirement), weight in zip(track.requirements["Senior"].items(), weights):
            requirement.importance = weight
            employee.skills[skill_id] = requirement.level
        result = calculate_grade_readiness(employee, track)
        self.assertEqual(result.readiness_percent, 100)
        self.assertEqual(result.mandatory_readiness_percent, 100)
        self.assertTrue(result.meets_mandatory)

    def test_skill_increase_is_monotonic_and_inputs_are_unchanged(self):
        employee = self.dataset.employees[0]
        track = self.dataset.skills.career_tracks[0]
        original = employee.model_dump()
        before = calculate_grade_readiness(employee, track)
        advanced = employee.model_copy(update={"skills": {**employee.skills, "SK_SYSTEM_DESIGN": 3}})
        after = calculate_grade_readiness(advanced, track)
        self.assertGreater(after.readiness_percent, before.readiness_percent)
        self.assertGreater(after.mandatory_readiness_percent, before.mandatory_readiness_percent)
        self.assertEqual(employee.model_dump(), original)

    def test_all_demo_profiles_have_bounded_consistent_progress(self):
        for employee in self.dataset.employees:
            result = get_employee_grade_readiness(self.dataset, employee.employee_id)
            if result.status == "top_grade":
                continue
            self.assertGreaterEqual(result.readiness_percent, 0)
            self.assertLessEqual(result.readiness_percent, 100)
            self.assertGreaterEqual(result.mandatory_readiness_percent, 0)
            self.assertLessEqual(result.mandatory_readiness_percent, 100)
            self.assertEqual(result.meets_mandatory,
                             all(skill.fulfilled for skill in result.skills.values() if skill.mandatory))


if __name__ == "__main__":
    unittest.main()
