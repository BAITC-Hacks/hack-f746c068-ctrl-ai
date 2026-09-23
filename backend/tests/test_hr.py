import unittest
from collections import Counter
from datetime import date

from backend.engine.hr import get_hr_summary
from backend.engine.progress import complete_activity
from backend.scripts.generate_demo_data import build_demo


class HRSummaryTests(unittest.TestCase):
    def setUp(self):
        self.dataset = build_demo()

    def test_deficits_no_step_reasons_and_participation(self):
        before = self.dataset.model_dump(mode="json")
        summary = get_hr_summary(self.dataset)
        self.assertEqual(summary.total_employees, 48)
        self.assertEqual(summary.readiness_employee_count, 35)
        self.assertGreater(summary.average_readiness_percent, 0)
        self.assertLessEqual(summary.average_readiness_percent, 100)
        no_step = {e.employee_id: e for e in summary.employees_without_step}
        self.assertEqual(no_step["E005"].status, "no_matching_activity")
        self.assertTrue(no_step["E005"].action_required)
        self.assertIn("SK_TESTING", no_step["E005"].gap_skill_ids)
        self.assertEqual(no_step["E003"].status, "no_skill_gaps")
        self.assertFalse(no_step["E003"].action_required)
        self.assertEqual(no_step["E004"].status, "top_grade")
        self.assertFalse(no_step["E004"].action_required)

        system_design = next(s for s in summary.skill_deficits
                             if s.skill_id == "SK_SYSTEM_DESIGN")
        self.assertGreater(system_design.affected_employees, 0)
        self.assertGreaterEqual(system_design.eligible_employees,
                                system_design.affected_employees)
        self.assertAlmostEqual(system_design.average_gap_when_affected,
                               system_design.total_gap / system_design.affected_employees)
        self.assertTrue(any(r.role == "Backend Engineer" and r.skill_id == "SK_SYSTEM_DESIGN"
                            for r in summary.role_skill_deficits))
        actual = Counter(record.status for record in self.dataset.activity_history)
        for status in ("invited", "enrolled", "completed", "skipped", "declined"):
            self.assertEqual(getattr(summary.participation_totals, status), actual[status])
        self.assertEqual(len(summary.participation_by_activity), len(self.dataset.events))
        self.assertEqual(sum(e.total_records for e in summary.participation_by_activity),
                         len(self.dataset.activity_history))
        self.assertTrue(all(e.completed_employees <= e.unique_employees <= e.total_records
                            for e in summary.participation_by_activity))
        self.assertEqual(self.dataset.model_dump(mode="json"), before)

    def test_completion_updates_hr_aggregates(self):
        before = get_hr_summary(self.dataset)
        updated, _ = complete_activity(
            self.dataset, "E001", "EV002", "HR-NEW-1", date(2026, 9, 23))
        after = get_hr_summary(updated)
        self.assertGreater(after.average_readiness_percent, before.average_readiness_percent)
        before_gap = next(s for s in before.skill_deficits if s.skill_id == "SK_SYSTEM_DESIGN")
        after_gap = next(s for s in after.skill_deficits if s.skill_id == "SK_SYSTEM_DESIGN")
        self.assertEqual(after_gap.total_gap, before_gap.total_gap - 1)
        self.assertEqual(after.participation_totals.completed,
                         before.participation_totals.completed + 1)
        before_event = next(e for e in before.participation_by_activity if e.event_id == "EV002")
        after_event = next(e for e in after.participation_by_activity if e.event_id == "EV002")
        self.assertEqual(after_event.counts.completed, before_event.counts.completed + 1)


if __name__ == "__main__":
    unittest.main()
