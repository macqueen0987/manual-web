from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.rate_limit import rate_limit
from app.db.session import get_db
from app.services import search_service

router = APIRouter()


@router.get("/search")
def search(
    q: str = Query(..., min_length=1),
    product: str | None = None,
    db: Session = Depends(get_db),
    _rate: None = rate_limit(max_calls=30, window_seconds=60, scope="search"),
):
    search_service.ensure_fts_populated(db)
    results = search_service.search_documents(db, q, product_slug=product)
    return {"query": q, "count": len(results), "results": results}
