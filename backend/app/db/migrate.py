import logging

from alembic import command
from alembic.config import Config
from alembic.runtime.migration import MigrationContext
from alembic.script import ScriptDirectory
from sqlalchemy import inspect

from app.db.session import engine

logger = logging.getLogger(__name__)


def _alembic_config() -> Config:
    from pathlib import Path

    root = Path(__file__).resolve().parents[2]
    cfg = Config(str(root / "alembic.ini"))
    return cfg


def _current_revision() -> str | None:
    with engine.connect() as conn:
        context = MigrationContext.configure(conn)
        return context.get_current_revision()


def _head_revision(cfg: Config) -> str | None:
    script = ScriptDirectory.from_config(cfg)
    return script.get_current_head()


def run_migrations() -> None:
    insp = inspect(engine)
    has_users = insp.has_table("users")
    cfg = _alembic_config()
    head = _head_revision(cfg)

    if not has_users:
        logger.info("Empty database; running initial Alembic upgrade")
        command.upgrade(cfg, "head")
        return

    current = _current_revision()
    if current is None:
        # Legacy DB (create_all / manual setup): tables exist but alembic_version is empty.
        logger.info("Existing database without Alembic revision; stamping %s", head)
        command.stamp(cfg, "head")
        return

    if current == head:
        logger.debug("Database schema up to date (revision %s)", current)
        return

    logger.info("Upgrading database from %s to %s", current, head)
    command.upgrade(cfg, "head")
