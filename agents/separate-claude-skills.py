#!/usr/bin/env python3
"""Separate Claude-owned skills from a legacy shared skills directory."""
import argparse
from pathlib import Path
import shutil

VENDOR_SKILLS = {
    "docs", "chrome-browser", "computer-use", "morning", "deep-research",
    "built-in-browser", "pdf", "pptx", "docx", "import-memory",
    "skill-creator", "xlsx", "google-workspace",
}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, default=Path(__file__).resolve().parents[1] / "skills")
    parser.add_argument("--destination", type=Path, default=Path.home() / ".claude/skills")
    args = parser.parse_args()
    source = args.source.resolve()
    destination = args.destination.expanduser()
    # Detach the old directory link before Claude can sync into the checkout.
    if destination.is_symlink():
        if destination.resolve() != source:
            parser.error(f"unexpected destination symlink: {destination}")
        destination.unlink()
    destination.mkdir(parents=True, exist_ok=True)
    # Copy, rather than move, so running this never modifies the source checkout.
    for name in sorted(VENDOR_SKILLS | {".metadata"}):
        old = source / name
        new = destination / name
        if old.is_dir() and not new.exists() and not new.is_symlink():
            shutil.copytree(old, new, symlinks=True)
    for old in sorted(source.iterdir()):
        if old.name.startswith(".") or old.name in VENDOR_SKILLS or not old.is_dir():
            continue
        new = destination / old.name
        if new.is_symlink() and new.resolve() == old.resolve():
            continue
        if new.exists() or new.is_symlink():
            raise SystemExit(f"Refusing to replace existing skill: {new}")
        new.symlink_to(old, target_is_directory=True)
    print(f"Claude-owned skills: {destination}; managed skills linked from {source}")


if __name__ == "__main__":
    main()
