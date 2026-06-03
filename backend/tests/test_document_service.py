import pytest

from app.models.document import Document
from app.models.product import Product
from app.models.version import Version
from app.services import document_service


def _seed_doc_tree(db):
    product = Product(name="Test", slug="test", description=None)
    db.add(product)
    db.flush()
    version = Version(
        product_id=product.id,
        name="Latest",
        slug="latest",
        is_latest=True,
        is_published=False,
    )
    db.add(version)
    db.flush()
    parent = Document(
        version_id=version.id,
        parent_id=None,
        title="Parent",
        slug="parent",
        file_path="test/latest/parent.md",
        sort_order=0,
    )
    child = Document(
        version_id=version.id,
        parent_id=None,
        title="Child",
        slug="child",
        file_path="test/latest/child.md",
        sort_order=1,
    )
    db.add_all([parent, child])
    db.commit()
    db.refresh(parent)
    db.refresh(child)
    child.parent_id = parent.id
    db.commit()
    return parent, child


def test_slugify_title_non_latin_uses_hash(db):
    slug = document_service.slugify_title("시작하기")
    assert slug.startswith("page-")
    assert len(slug) == len("page-") + 8


def test_slugify_title_ascii(db):
    assert document_service.slugify_title("Getting Started") == "getting-started"


def test_delete_document_rejects_when_children_exist(db):
    parent, _child = _seed_doc_tree(db)
    with pytest.raises(ValueError, match="child pages"):
        document_service.delete_document(db, parent)


def test_reposition_rejects_move_under_descendant(db):
    parent, child = _seed_doc_tree(db)
    with pytest.raises(ValueError, match="descendant"):
        document_service.reposition_document(db, parent, child.id, 0)
