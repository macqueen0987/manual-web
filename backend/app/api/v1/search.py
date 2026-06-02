from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.document import Document
from app.models.product import Product
from app.models.version import Version
from app.services.document_service import read_document_content

router = APIRouter()


@router.get("/search")
def search(
    q: str = Query(..., min_length=1),
    product: str | None = None,
    db: Session = Depends(get_db),
):
    query = db.query(Document).join(Version).join(Product)

    if product:
        query = query.filter(Product.slug == product)

    docs = query.all()
    results = []
    search_term = q.lower()

    for doc in docs:
        content = read_document_content(doc)
        title_match = search_term in doc.title.lower()
        content_match = search_term in content.lower()

        if title_match or content_match:
            excerpt = content.replace("\n", " ").strip()
            idx = excerpt.lower().find(search_term)
            if idx >= 0:
                start = max(0, idx - 80)
                end = min(len(excerpt), idx + len(q) + 80)
                excerpt = ("..." if start > 0 else "") + excerpt[start:end] + ("..." if end < len(excerpt) else "")
            else:
                excerpt = excerpt[:160] + "..." if len(excerpt) > 160 else excerpt

            results.append({
                "id": doc.id,
                "title": doc.title,
                "slug": doc.slug,
                "product_slug": doc.version.product.slug,
                "product_name": doc.version.product.name,
                "version_slug": doc.version.slug,
                "version_name": doc.version.name,
                "excerpt": excerpt,
            })

    return {"query": q, "count": len(results), "results": results}
