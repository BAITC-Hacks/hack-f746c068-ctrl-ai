import unittest

from backend.engine.skill_gap import SkillGapError, calculate_skill_gaps, get_employee_skill_gaps
from backend.models import CareerTrack, Employee
from backend.scripts.generate_demo_data import build_demo


class SkillGapTests(unittest.TestCase):
    def setUp(self):
        self.dataset = build_demo()

    def test_known_profile_and_counters(self):
        result = get_employee_skill_gaps(self.dataset, "E001")
        self.assertEqual(result.target_grade, "Senior")
        self.assertEqual(result.status, "calculated")
        self.assertEqual(result.gaps["SK_SYSTEM_DESIGN"].gap, 2)
        self.assertEqual(result.gaps["SK_SYSTEM_DESIGN"].normalized_gap, 0.5)
        self.assertEqual(result.gaps["SK_PYTHON"].gap, 1)
        self.assertTrue(result.gaps["SK_COMMUNICATION"].fulfilled)
        self.assertFalse(result.gaps["SK_PUBLIC_SPEAKING"].mandatory)
        self.assertAlmostEqual(result.gaps["SK_PUBLIC_SPEAKING"].weighted_gap, 0.2)
        self.assertEqual(result.total_target_skills, 6)
        self.assertEqual(result.fulfilled_target_skills, 3)
        self.assertEqual(result.skills_with_gap, 3)
        self.assertEqual(result.mandatory_skills_with_gap, 2)

    def test_missing_skills_mean_zero(self):
        result = get_employee_skill_gaps(self.dataset, "E002")
        self.assertTrue(all(g.current == 0 and g.gap == g.required and g.normalized_gap == 1
                            for g in result.gaps.values()))

    def test_excess_skills_do_not_compensate_or_go_negative(self):
        result = get_employee_skill_gaps(self.dataset, "E003")
        self.assertTrue(all(g.gap == 0 and g.normalized_gap == 0 for g in result.gaps.values()))
        self.assertNotIn("SK_LEADERSHIP", result.gaps)
        result = get_employee_skill_gaps(self.dataset, "E005")
        self.assertEqual(result.skills_with_gap, 1)
        self.assertEqual(result.gaps["SK_TESTING"].gap, 4)

    def test_top_grade_is_distinct_from_completed_requirements(self):
        result = get_employee_skill_gaps(self.dataset, "E004")
        self.assertIsNone(result.target_grade)
        self.assertEqual(result.status, "top_grade")
        self.assertEqual(result.gaps, {})
        self.assertEqual(result.total_target_skills, 0)
        self.assertEqual(get_employee_skill_gaps(self.dataset, "E003").status, "calculated")

    def test_unknown_employee_role_and_grade(self):
        with self.assertRaises(SkillGapError) as caught:
            get_employee_skill_gaps(self.dataset, "absent")
        self.assertEqual(caught.exception.code, "employee_not_found")
        employee = self.dataset.employees[0]
        with self.assertRaises(SkillGapError) as caught:
            calculate_skill_gaps(employee, self.dataset.skills.career_tracks[1])
        self.assertEqual(caught.exception.code, "career_track_mismatch")
        payload = employee.model_dump()
        payload["grade"] = "Unknown"
        with self.assertRaises(SkillGapError) as caught:
            calculate_skill_gaps(Employee.model_validate(payload), self.dataset.skills.career_tracks[0])
        self.assertEqual(caught.exception.code, "grade_not_found")

    def test_uses_configured_order_and_is_pure(self):
        track = CareerTrack.model_validate({
            "role": "Custom", "grades": ["Apprentice", "Practitioner", "Expert"],
            "requirements": {grade: {"SK_ONE": {"level": level}}
                             for grade, level in [("Apprentice", 1), ("Practitioner", 3), ("Expert", 5)]},
        })
        employee = Employee(employee_id="E", name="Demo", role="Custom", grade="Apprentice",
                            tenure_months=1, skills={"SK_ONE": 1})
        before = (employee.model_dump(), track.model_dump())
        first = calculate_skill_gaps(employee, track)
        self.assertEqual(first.target_grade, "Practitioner")
        self.assertEqual(first.gaps["SK_ONE"].gap, 2)
        self.assertEqual(first, calculate_skill_gaps(employee, track))
        self.assertEqual(before, (employee.model_dump(), track.model_dump()))

    def test_all_profiles_obey_gap_invariants(self):
        before = self.dataset.model_dump(mode="json")
        for employee in self.dataset.employees:
            result = get_employee_skill_gaps(self.dataset, employee.employee_id)
            for item in result.gaps.values():
                self.assertGreaterEqual(item.gap, 0)
                self.assertLessEqual(item.normalized_gap, 1)
                self.assertEqual(item.fulfilled, item.current >= item.required)
            self.assertEqual(result.total_target_skills,
                             result.fulfilled_target_skills + result.skills_with_gap)
        self.assertEqual(before, self.dataset.model_dump(mode="json"))


if __name__ == "__main__":
    unittest.main()
