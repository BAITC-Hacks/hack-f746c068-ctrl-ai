import json
import subprocess
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


class CliTests(unittest.TestCase):
    def run_cli(self, *args):
        return subprocess.run([sys.executable, "-m", "backend", *args], cwd=ROOT,
                              capture_output=True, text=True, check=False)

    def test_validate_and_top_grade(self):
        validation = self.run_cli("validate")
        self.assertEqual(validation.returncode, 0, validation.stderr)
        self.assertEqual(json.loads(validation.stdout)["status"], "valid")
        top_grade = self.run_cli("gaps", "E004")
        self.assertEqual(top_grade.returncode, 0, top_grade.stderr)
        self.assertEqual(json.loads(top_grade.stdout)["status"], "top_grade")

    def test_unknown_employee_exits_with_structured_error(self):
        result = self.run_cli("gaps", "not-an-employee")
        self.assertEqual(result.returncode, 1)
        self.assertEqual(result.stdout, "")
        self.assertEqual(json.loads(result.stderr)["error"], "employee_not_found")

    def test_readiness_command(self):
        result = self.run_cli("readiness", "E001")
        self.assertEqual(result.returncode, 0, result.stderr)
        payload = json.loads(result.stdout)
        self.assertEqual(payload["target_grade"], "Senior")
        self.assertAlmostEqual(payload["readiness_percent"], 100 * 4.25 / 5.2)


if __name__ == "__main__":
    unittest.main()
