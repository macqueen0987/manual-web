"""
Move legacy root-level and ``*.{en,ko}.md`` files into ``en/`` / ``ko/`` subfolders.

  docker compose -f docker-compose.dev.yml exec backend python scripts/migrate_doc_locale_dirs.py
"""

from __future__ import annotations

import shutil
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.core.config import get_settings
from app.core.paths import docs_root, localized_doc_path

settings = get_settings()
DEFAULT = settings.DEFAULT_LOCALE
LOCALES = ("en", "ko")


def migrate_version_dir(version_dir: Path) -> int:
    moved = 0
    if not version_dir.is_dir():
        return 0

    for md in list(version_dir.glob("*.md")):
        target = localized_doc_path(md, DEFAULT)
        target.parent.mkdir(parents=True, exist_ok=True)
        if target.exists():
            md.unlink()
        else:
            shutil.move(str(md), str(target))
            print(f"  {md.name} -> {target.relative_to(version_dir)}")
        moved += 1

    for loc in LOCALES:
        for md in list(version_dir.glob(f"*.{loc}.md")):
            base_name = md.name[: -len(f".{loc}.md")] + ".md"
            target = version_dir / loc / base_name
            target.parent.mkdir(parents=True, exist_ok=True)
            if target.exists():
                md.unlink()
            else:
                shutil.move(str(md), str(target))
                print(f"  {md.name} -> {target.relative_to(version_dir)}")
            moved += 1

    return moved


def main() -> None:
    root = docs_root()
    if not root.is_dir():
        print(f"No docs root at {root}")
        return

    total = 0
    for product_dir in sorted(root.iterdir()):
        if not product_dir.is_dir():
            continue
        for version_dir in sorted(product_dir.iterdir()):
            if not version_dir.is_dir() or version_dir.name in LOCALES:
                continue
            rel = version_dir.relative_to(root)
            n = migrate_version_dir(version_dir)
            if n:
                print(f"{rel}: {n} file(s)")
            total += n

    print(f"Done. {total} file(s) processed. Default locale folder: {DEFAULT}/")


if __name__ == "__main__":
    main()
