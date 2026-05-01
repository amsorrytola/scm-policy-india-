"""api/main.py — FastAPI app entry point.

Run from project root:
    cd api && uvicorn main:app --reload
or (preserving the api package import):
    uvicorn api.main:app --reload
"""

import os
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

# Load .env from the api/ directory if present
load_dotenv(Path(__file__).resolve().parent / ".env")

from api.routers.bihar import router as bihar_router, limiter

app = FastAPI(
    title="SCM Policy India — Bihar API",
    description=(
        "FastAPI backend for the Bihar Prohibition (April 2016) "
        "synthetic-control case study. Serves precomputed SCM/BSTS results, "
        "supports live SCM refits, and proxies natural-language questions "
        "to Gemini grounded in the analysis output."
    ),
    version="0.1.0",
)

# Rate-limiter wiring (slowapi)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS — allow the local frontend dev server (and an optional prod origin via env)
frontend = os.getenv("FRONTEND_URL", "http://localhost:3000")
allowed_origins = [frontend, "http://localhost:3000", "http://127.0.0.1:3000"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=list(dict.fromkeys(allowed_origins)),  # dedupe, keep order
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

app.include_router(bihar_router, prefix="/api")


@app.get("/")
def root():
    return {
        "service": "scm-policy-india-api",
        "case"   : "bihar",
        "version": "0.1.0",
        "docs"   : "/docs",
    }


@app.get("/health")
def health():
    return {"status": "ok"}
