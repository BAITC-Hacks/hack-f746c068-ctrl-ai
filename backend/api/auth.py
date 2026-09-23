"""Local demo bearer accounts; no credentials are exposed over HTTP."""

import json
import secrets
from pathlib import Path
from typing import Literal

from fastapi import Depends, HTTPException, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import Field, model_validator

from backend.models import Identifier, Model


class Account(Model):
    account_id: Identifier
    token: str = Field(min_length=16)
    role: Literal["employee", "hr"]
    employee_id: Identifier | None = None

    @model_validator(mode="after")
    def employee_identity(self):
        if self.role == "employee" and self.employee_id is None:
            raise ValueError("Employee account requires employee_id")
        return self


def load_accounts(path: Path, employee_id: str) -> list[Account]:
    path.parent.mkdir(parents=True, exist_ok=True)
    if not path.exists():
        accounts = [Account(account_id="hr", role="hr", token=secrets.token_urlsafe(32)),
                    Account(account_id="employee", role="employee", employee_id=employee_id,
                            token=secrets.token_urlsafe(32))]
        # Exclusive creation prevents overwriting existing access configuration.
        try:
            with path.open("x", encoding="utf-8") as stream:
                json.dump([account.model_dump() for account in accounts], stream, indent=2)
        except FileExistsError:
            pass
    accounts = [Account.model_validate(item) for item in json.loads(path.read_text(encoding="utf-8"))]
    if not accounts or len({a.token for a in accounts}) != len(accounts) or len({a.account_id for a in accounts}) != len(accounts):
        raise ValueError("Auth accounts and tokens must be nonempty and unique")
    return accounts


bearer = HTTPBearer(auto_error=False)


def current_account(request: Request, credentials: HTTPAuthorizationCredentials | None = Depends(bearer)) -> Account:
    if credentials is not None:
        for account in request.app.state.accounts:
            if secrets.compare_digest(credentials.credentials.encode(), account.token.encode()):
                return account
    raise HTTPException(401, detail={"error": "unauthorized", "message": "Valid bearer token required"},
                        headers={"WWW-Authenticate": "Bearer"})


def require_hr(account: Account = Depends(current_account)) -> Account:
    if account.role != "hr":
        raise HTTPException(403, detail={"error": "forbidden", "message": "HR access required"})
    return account


def require_employee_access(employee_id: str, account: Account = Depends(current_account)) -> Account:
    if account.role != "hr" and account.employee_id != employee_id:
        raise HTTPException(403, detail={"error": "forbidden", "message": "Access to another employee is not allowed"})
    return account
