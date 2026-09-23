"""CI check for a fresh demo container; completes one activity in its test volume."""

import argparse
import json
import os
from pathlib import Path
from urllib.error import HTTPError
from urllib.request import Request, urlopen


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--replay", action="store_true", help="Require persisted completion from the first run")
    args = parser.parse_args()
    base = "http://127.0.0.1:" + os.environ.get("PORT", "8000")
    accounts = json.loads(Path(os.environ.get("CAREER_QUEST_AUTH_FILE", "/var/data/access.json")).read_text())
    hr = next(account for account in accounts if account["role"] == "hr")
    employee = next(account for account in accounts if account["role"] == "employee")
    employee_id = employee["employee_id"]

    def call(path, *, token=None, method="GET", headers=None, expected=200):
        request_headers = dict(headers or {})
        if token:
            request_headers["Authorization"] = "Bearer " + token
        try:
            response = urlopen(Request(base + path, method=method, headers=request_headers), timeout=10)
        except HTTPError as error:
            response = error
        with response:
            assert response.status == expected, f"{method} {path}: HTTP {response.status}, expected {expected}"
            content = response.read()
            result = json.loads(content) if "application/json" in response.headers.get("Content-Type", "") else content
            return result, response.headers

    assert call("/api/health")[0] == {"status": "ok"}
    assert b"<html" in call("/")[0].lower()
    assert b"<html" in call(f"/employee/{employee_id}")[0].lower()
    call("/api/docs")
    call("/api/employees", expected=401)
    call("/api/hr/dashboard", token=employee["token"], expected=403)
    call("/api/hr/dashboard", token=hr["token"])
    identity, _ = call("/api/auth/me", token=employee["token"])
    assert identity["employee_id"] == employee_id

    headers = {"Idempotency-Key": "7d1b544a-0ba4-4bde-90c7-1762a9965a72"}
    result, response_headers = call(f"/api/employees/{employee_id}/activities/EV002/complete",
                                    token=employee["token"], method="POST", headers=headers)
    assert response_headers["Idempotency-Replayed"] == ("true" if args.replay else "false")
    repeated, response_headers = call(f"/api/employees/{employee_id}/activities/EV002/complete",
                                      token=employee["token"], method="POST", headers=headers)
    assert response_headers["Idempotency-Replayed"] == "true" and repeated == result
    profile, _ = call(f"/api/employees/{employee_id}", token=employee["token"])
    assert sum(item["record_id"] == result["record_id"] for item in profile["history"]) == 1
    if not os.environ.get("OPENAI_API_KEY"):
        ai, _ = call(f"/api/employees/{employee_id}/ai/recommendations", token=employee["token"], method="POST")
        assert ai["source"] == "rules" and ai["fallback_reason"] == "not_configured"
    print("Container smoke checks passed" + ("; persisted state verified" if args.replay else ""))


if __name__ == "__main__":
    main()
