"""Shared seed data for API and MCP integration tests."""

from app.core.security import get_password_hash
from app.models.document import Document
from app.models.product import Product
from app.models.user import User
from app.models.version import Version

TEST_ADMIN_EMAIL = "mcp-test@example.com"
TEST_ADMIN_PASSWORD = "test-password-32chars-minimum!!"


def seed_admin_user(db) -> User:
    user = User(
        email=TEST_ADMIN_EMAIL,
        hashed_password=get_password_hash(TEST_ADMIN_PASSWORD),
        full_name="MCP Test",
        is_active=True,
        is_superuser=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def seed_product_with_versions(db, *, slug: str = "api-prod") -> tuple[Product, Version, Version]:
    product = Product(
        name="API Product",
        slug=slug,
        description="For integration tests",
        is_active=True,
    )
    db.add(product)
    db.flush()
    latest = Version(
        product_id=product.id,
        name="작업 중",
        slug="latest",
        is_latest=True,
        is_published=False,
    )
    published = Version(
        product_id=product.id,
        name="2026.01.01",
        slug="pub-01",
        is_published=True,
    )
    db.add_all([latest, published])
    db.flush()
    return product, latest, published


def seed_document(
    db,
    *,
    version_id: int,
    title: str,
    slug: str,
    file_path: str,
    parent_id: int | None = None,
) -> Document:
    doc = Document(
        version_id=version_id,
        parent_id=parent_id,
        title=title,
        slug=slug,
        file_path=file_path,
        sort_order=0,
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return doc
