"""Unit tests for app/db/migrate.py (Alembic startup branches)."""

from unittest.mock import MagicMock, patch

from app.db import migrate as migrate_module


def test_run_migrations_empty_db():
    mock_insp = MagicMock()
    mock_insp.has_table.return_value = False
    cfg = MagicMock()

    with (
        patch.object(migrate_module, "inspect", return_value=mock_insp),
        patch.object(migrate_module, "_alembic_config", return_value=cfg),
        patch.object(migrate_module, "_head_revision", return_value="head-rev"),
        patch.object(migrate_module.command, "upgrade") as upgrade,
        patch.object(migrate_module.command, "stamp") as stamp,
    ):
        migrate_module.run_migrations()

    upgrade.assert_called_once_with(cfg, "head")
    stamp.assert_not_called()


def test_run_migrations_legacy_stamp():
    mock_insp = MagicMock()
    mock_insp.has_table.return_value = True
    cfg = MagicMock()

    with (
        patch.object(migrate_module, "inspect", return_value=mock_insp),
        patch.object(migrate_module, "_alembic_config", return_value=cfg),
        patch.object(migrate_module, "_head_revision", return_value="head-rev"),
        patch.object(migrate_module, "_current_revision", return_value=None),
        patch.object(migrate_module.command, "upgrade") as upgrade,
        patch.object(migrate_module.command, "stamp") as stamp,
    ):
        migrate_module.run_migrations()

    stamp.assert_called_once_with(cfg, "head")
    upgrade.assert_not_called()


def test_run_migrations_up_to_date():
    mock_insp = MagicMock()
    mock_insp.has_table.return_value = True
    cfg = MagicMock()

    with (
        patch.object(migrate_module, "inspect", return_value=mock_insp),
        patch.object(migrate_module, "_alembic_config", return_value=cfg),
        patch.object(migrate_module, "_head_revision", return_value="abc"),
        patch.object(migrate_module, "_current_revision", return_value="abc"),
        patch.object(migrate_module.command, "upgrade") as upgrade,
        patch.object(migrate_module.command, "stamp") as stamp,
    ):
        migrate_module.run_migrations()

    upgrade.assert_not_called()
    stamp.assert_not_called()


def test_run_migrations_upgrade_needed():
    mock_insp = MagicMock()
    mock_insp.has_table.return_value = True
    cfg = MagicMock()

    with (
        patch.object(migrate_module, "inspect", return_value=mock_insp),
        patch.object(migrate_module, "_alembic_config", return_value=cfg),
        patch.object(migrate_module, "_head_revision", return_value="003"),
        patch.object(migrate_module, "_current_revision", return_value="001"),
        patch.object(migrate_module.command, "upgrade") as upgrade,
        patch.object(migrate_module.command, "stamp") as stamp,
    ):
        migrate_module.run_migrations()

    upgrade.assert_called_once_with(cfg, "head")
    stamp.assert_not_called()
