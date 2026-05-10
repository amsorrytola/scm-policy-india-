"""api/main.py — FastAPI app entry point."""

import os
import logging
import traceback
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

load_dotenv(Path(__file__).resolve().parent / ".env")

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("scm-api")

from api.routers.bihar import router as bihar_router, limiter

app = FastAPI(
    title="SCM Policy India — Bihar API",
    description="Bihar Prohibition (Apr 2016) synthetic-control case study API.",
    version="0.1.0",
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ── CORS — must be added FIRST so it wraps even error responses ──────────────
frontend = os.getenv("FRONTEND_URL", "http://localhost:3000")
allowed_origins = list(dict.fromkeys([
    frontend,
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://scm-policy-india.vercel.app",  # canonical prod
]))

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=r"https://scm-policy-india.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)


# ── Global exception handler — guarantees CORS headers on ANY uncaught error ──
# Without this, a crash in /ask returns a 500 with no CORS headers, and the
# browser shows "CORS error" instead of the real 500. This is the bug you
# were hitting.
@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    log.error("Unhandled exception in %s %s", request.method, request.url.path)
    log.error("%s: %s", type(exc).__name__, exc)
    log.error(traceback.format_exc())

    origin = request.headers.get("origin", "")
    cors_origin = origin if (
        origin in allowed_origins
        or ("scm-policy-india" in origin and origin.endswith(".vercel.app"))
    ) else allowed_origins[0]

    return JSONResponse(
        status_code=500,
        content={
            "detail": f"{type(exc).__name__}: {str(exc)[:200]}",
            "path": request.url.path,
        },
        headers={
            "Access-Control-Allow-Origin": cors_origin,
            "Access-Control-Allow-Credentials": "true",
        },
    )


app.include_router(bihar_router, prefix="/api")


@app.get("/")
def root():
    return {
        "service": "scm-policy-india-api",
        "case": "bihar",
        "version": "0.1.0",
        "docs": "/docs",
        "gemini_key_configured": bool(os.getenv("GEMINI_API_KEY", "").strip()),
    }


@app.get("/health")
def health():
    return {
        "status": "ok",
        "gemini_key_configured": bool(os.getenv("GEMINI_API_KEY", "").strip()),
    }