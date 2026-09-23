"""Serve the built web app and its API together: python -m backend.web."""

from contextlib import asynccontextmanager
import os
from pathlib import Path
import re

from fastapi import FastAPI
from starlette.exceptions import HTTPException
from starlette.staticfiles import StaticFiles

from backend.api.app import create_app as create_api


class FrontendFiles(StaticFiles):
    """Use the SPA entrypoint only for known frontend page routes."""

    async def get_response(self, path, scope):
        try:
            return await super().get_response(path, scope)
        except HTTPException as exc:
            page = re.fullmatch(r"(?:login|register|hr|employee/[^/]+(?:/history)?)/?",
                                path.replace("\\", "/"))
            if exc.status_code == 404 and page:
                return await super().get_response("index.html", scope)
            raise


def create_app(frontend_dir: str | Path | None = None, **api_options) -> FastAPI:
    frontend = Path(frontend_dir or os.environ.get(
        "CAREER_QUEST_FRONTEND_DIR", Path(__file__).resolve().parents[1] / "frontend" / "dist"))
    if not (frontend / "index.html").is_file():
        raise RuntimeError(f"Frontend build missing in {frontend}; run npm run build in frontend first")
    api = create_api(**api_options)

    @asynccontextmanager
    async def lifespan(application):
        # Mounted applications do not receive startup/shutdown automatically.
        async with api.router.lifespan_context(api):
            yield

    application = FastAPI(lifespan=lifespan, docs_url=None, redoc_url=None, openapi_url=None)
    application.mount("/api", api)
    application.mount("/", FrontendFiles(directory=frontend, html=True))
    return application


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("backend.web:create_app", factory=True, host="0.0.0.0",
                port=int(os.environ.get("PORT", "8000")))
