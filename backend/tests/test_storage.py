"""Transactions must prevent duplicate gains and lost concurrent updates."""

from concurrent.futures import ThreadPoolExecutor
from datetime import date
from pathlib import Path
from tempfile import TemporaryDirectory
from threading import Barrier
import unittest

from backend.engine.progress import complete_activity
from backend.scripts.generate_demo_data import build_demo
from backend.storage import DatasetStore


class StorageTests(unittest.TestCase):
    def setUp(self):
        self.directory = TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.seed = build_demo()
        self.path = Path(self.directory.name) / "state.sqlite3"
        self.store = DatasetStore(self.path, self.seed)

    def test_concurrent_retries_apply_one_gain_and_one_history_record(self):
        barrier = Barrier(2)

        def worker(index):
            repository = DatasetStore(self.path, self.seed)
            barrier.wait(timeout=10)
            return repository.complete(
                "employee", "same-key", "E001/EV002",
                lambda dataset: complete_activity(dataset, "E001", "EV002", f"CONCURRENT_{index}", date(2026, 9, 23)),
            )

        with ThreadPoolExecutor(max_workers=2) as executor:
            results = list(executor.map(worker, (1, 2)))
        self.assertEqual(sorted(replayed for _, replayed in results), [False, True])
        self.assertEqual(results[0][0], results[1][0])
        updated = self.store.snapshot()
        self.assertEqual(len(updated.activity_history), len(self.seed.activity_history) + 1)
        self.assertEqual(updated.employees[0].skills["SK_SYSTEM_DESIGN"], 3)

    def test_concurrent_distinct_completions_do_not_lose_updates(self):
        barrier = Barrier(2)

        def worker(index):
            repository = DatasetStore(self.path, self.seed)
            barrier.wait(timeout=10)
            return repository.complete(
                "employee", f"key-{index}", "E001/EV002",
                lambda dataset: complete_activity(dataset, "E001", "EV002", f"CONCURRENT_{index}", date(2026, 9, 23)),
            )

        with ThreadPoolExecutor(max_workers=2) as executor:
            results = list(executor.map(worker, (1, 2)))
        self.assertTrue(all(not replayed for _, replayed in results))
        updated = self.store.snapshot()
        self.assertEqual(len(updated.activity_history), len(self.seed.activity_history) + 2)
        self.assertEqual(updated.employees[0].skills["SK_SYSTEM_DESIGN"], 4)
        self.assertEqual({r.record_id for r in updated.activity_history if r.record_id.startswith("CONCURRENT_")},
                         {"CONCURRENT_1", "CONCURRENT_2"})

    def test_transform_failure_rolls_back_and_store_remains_usable(self):
        before = self.store.snapshot().model_dump(mode="json")

        def invalid_update(dataset):
            dataset.employees[0].skills["SK_SYSTEM_DESIGN"] = 5
            raise ValueError("failed after editing in-memory state")

        with self.assertRaisesRegex(ValueError, "failed after editing"):
            self.store.update(invalid_update)
        self.assertEqual(self.store.snapshot().model_dump(mode="json"), before)
        response, replayed = self.store.complete(
            "employee", "after-failure", "E001/EV002",
            lambda dataset: complete_activity(dataset, "E001", "EV002", "RECOVERED", date(2026, 9, 23)),
        )
        self.assertFalse(replayed)
        self.assertEqual(response["skill_changes"][0]["after"], 3)


if __name__ == "__main__":
    unittest.main()
