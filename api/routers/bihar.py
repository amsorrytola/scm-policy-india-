"""api/routers/bihar.py — All Bihar endpoints."""

from fastapi import APIRouter, HTTPException, Request
from slowapi import Limiter
from slowapi.util import get_remote_address

from api.models import RefitRequest, AskRequest, AskResponse
from api.services import scm_service, gemini_service

router  = APIRouter()
limiter = Limiter(key_func=get_remote_address)


@router.get("/case/bihar")
def get_case_metadata():
    return scm_service.get_case_metadata()


@router.get("/case/bihar/scm")
def get_scm():
    try:
        return scm_service.get_precomputed("scm")
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/case/bihar/bsts")
def get_bsts():
    try:
        return scm_service.get_precomputed("bsts")
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/case/bihar/scm/tax")
def get_scm_tax():
    try:
        return scm_service.get_precomputed("scm_tax")
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/case/bihar/bsts/tax")
def get_bsts_tax():
    try:
        return scm_service.get_precomputed("bsts_tax")
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/case/bihar/scm/growth")
def get_scm_growth():
    try:
        return scm_service.get_precomputed("scm_growth")
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/case/bihar/data")
def get_panel_data():
    import json
    panel = scm_service.get_panel()
    # pandas to_json handles NaN -> null; ISO-format dates as strings
    return json.loads(panel.to_json(orient="records", date_format="iso"))


@router.post("/case/bihar/refit")
@limiter.limit("8/minute")
def refit(request: Request, body: RefitRequest):
    try:
        result = scm_service.refit_scm(
            donor_pool = body.donor_pool,
            predictors = body.predictors,
            outcome    = body.outcome,
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500,
                            detail=f"SCM refit failed: {str(e)}")


@router.post("/ask", response_model=AskResponse)
@limiter.limit("20/minute")
async def ask(request: Request, body: AskRequest):
    result = await gemini_service.ask_gemini(
        question = body.question,
        method   = body.method or "scm",
    )
    return result
