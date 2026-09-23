from datetime import date
import unittest

from backend.api.presenters import PARTICIPATION_STATUSES, get_hr_dashboard
from backend.engine.hr import get_hr_summary
from backend.engine.progress import complete_activity
from backend.models import Dataset
from backend.scripts.generate_demo_data import build_demo


class HRDashboardTests(unittest.TestCase):
    def setUp(self):
        payload = build_demo().model_dump()
        payload["employees"] = payload["employees"][:5]
        payload["activity_history"] = [item for item in payload["activity_history"]
                                       if item["employee_id"] in {"E001", "E002", "E003", "E004", "E005"}]
        self.dataset = Dataset.model_validate(payload)

    def test_gap_prevalence_and_no_step_reasons_are_explicit(self):
        original = self.dataset.model_dump()
        result = get_hr_dashboard(self.dataset)
        summary = get_hr_summary(self.dataset)
        self.assertEqual(result.total_employees, 5)
        self.assertEqual(result.average_readiness_percent, summary.average_readiness_percent)
        self.assertEqual(result.role_skill_deficits, summary.role_skill_deficits)
        backend_design = next(item for item in result.role_skill_deficits
                              if item.role == "Backend Engineer"
                              and item.skill_id == "SK_SYSTEM_DESIGN")
        self.assertEqual((backend_design.eligible_employees,
                          backend_design.affected_employees,
                          backend_design.average_gap_across_role), (2, 1, 1.0))
        gaps = {item.skill_id: item for item in result.top_skill_gaps}
        self.assertEqual((gaps["SK_SYSTEM_DESIGN"].employee_count, gaps["SK_SYSTEM_DESIGN"].total_gap), (1, 2))
        self.assertEqual((gaps["SK_PUBLIC_SPEAKING"].employee_count,
                          gaps["SK_PUBLIC_SPEAKING"].mandatory_employee_count,
                          gaps["SK_PUBLIC_SPEAKING"].total_gap), (2, 0, 3))
        self.assertEqual((gaps["SK_TESTING"].employee_count,
                          gaps["SK_TESTING"].mandatory_employee_count,
                          gaps["SK_TESTING"].total_gap), (2, 2, 8))
        self.assertEqual(result.top_skill_gaps[0].skill_id, "SK_TESTING")
        reasons = {item.employee_id: item.reason for item in result.employees_without_recommendations}
        self.assertEqual(reasons, {"E003": "no_skill_gaps", "E004": "top_grade", "E005": "no_matching_activity"})
        self.assertEqual(self.dataset.model_dump(), original)

    def test_all_statuses_activities_and_repeated_sessions_are_counted(self):
        result = get_hr_dashboard(self.dataset)
        self.assertEqual(set(result.participation), set(PARTICIPATION_STATUSES))
        self.assertEqual(sum(result.participation.values()), len(self.dataset.activity_history))
        self.assertEqual(len(result.activities), len(self.dataset.events))
        self.assertEqual(sum(item.total_records for item in result.activities), len(self.dataset.activity_history))
        speaking = next(item for item in result.activities if item.event_id == "EV003")
        records = [item for item in self.dataset.activity_history if item.event_id == "EV003"]
        self.assertEqual(speaking.total_records, len(records))
        self.assertEqual(speaking.unique_employees, len({item.employee_id for item in records}))
        self.assertGreaterEqual(speaking.status_counts["skipped"], 2)
        self.assertGreaterEqual(speaking.status_counts["declined"], 1)
        archived = next(item for item in result.activities if item.event_id == "EV026")
        self.assertFalse(archived.active)
        self.assertGreaterEqual(archived.total_records, 1)

    def test_completion_is_reflected_in_gaps_and_participation(self):
        before = get_hr_dashboard(self.dataset)
        updated, _ = complete_activity(self.dataset, "E001", "EV001", "HR_DONE", date(2026, 9, 23))
        after = get_hr_dashboard(updated)
        self.assertGreater(after.average_readiness_percent, before.average_readiness_percent)
        self.assertEqual(after.participation["completed"], before.participation["completed"] + 1)
        design = next(item for item in after.top_skill_gaps if item.skill_id == "SK_SYSTEM_DESIGN")
        self.assertEqual(design.total_gap, 1)
        workshop = next(item for item in after.activities if item.event_id == "EV001")
        earlier_workshop = next(item for item in before.activities if item.event_id == "EV001")
        self.assertEqual(workshop.total_records, earlier_workshop.total_records + 1)
        self.assertEqual(workshop.unique_employees, earlier_workshop.unique_employees)
        before_role_gap = next(item for item in before.role_skill_deficits
                               if item.role == "Backend Engineer"
                               and item.skill_id == "SK_SYSTEM_DESIGN")
        after_role_gap = next(item for item in after.role_skill_deficits
                              if item.role == "Backend Engineer"
                              and item.skill_id == "SK_SYSTEM_DESIGN")
        self.assertLess(after_role_gap.average_gap_across_role,
                        before_role_gap.average_gap_across_role)

    def test_empty_history_and_catalog_return_zero_counts(self):
        payload = self.dataset.model_dump()
        payload["events"] = []
        payload["activity_history"] = []
        result = get_hr_dashboard(Dataset.model_validate(payload))
        self.assertEqual(result.participation, dict.fromkeys(PARTICIPATION_STATUSES, 0))
        self.assertEqual(result.activities, [])
        self.assertEqual(len(result.employees_without_recommendations), 5)


if __name__ == "__main__":
    unittest.main()
