"""api/models.py — Pydantic request/response schemas."""

from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any


class RefitRequest(BaseModel):
    donor_pool: List[str] = Field(..., min_length=2)
    predictors: List[str] = Field(..., min_length=1)
    outcome: Optional[str] = None  # defaults to primary


class AskRequest(BaseModel):
    question: str = Field(..., min_length=3, max_length=500)
    method: Optional[str] = "scm"  # "scm" | "bsts" | "both"


class AskResponse(BaseModel):
    answer: str
    sources_used: List[str]
