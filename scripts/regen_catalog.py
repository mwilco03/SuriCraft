#!/usr/bin/env python3
"""
Driver: refresh reference data from upstream Wireshark + Suricata.

Run when bumping the pinned upstream versions or when Wireshark releases
a new dissector. After running, `git diff catalog/` shows what changed.

Usage:
  python scripts/regen_catalog.py
  python scripts/regen_catalog.py --wireshark-branch release-4.4 --suricata-branch master --all
"""
from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def run(cmd: list[str]) -> int:
    print("\n$ " + " ".join(cmd))
    return subprocess.call(cmd)


def main() -> int:
    ap = argparse.ArgumentParser(description="Refresh upstream reference data.")
    ap.add_argument("--wireshark-branch", default="master")
    ap.add_argument("--suricata-branch", default="master")
    ap.add_argument("--all", action="store_true", help="extract every known protocol from Wireshark, not just the curated subset")
    ap.add_argument("--protocols", default=None, help="comma-separated subset (overrides --all)")
    args = ap.parse_args()

    py = sys.executable
    rc = 0
    rc |= run([py, str(ROOT / "scripts" / "extract_suricata.py"), "--branch", args.suricata_branch])
    ws_args = [py, str(ROOT / "scripts" / "extract_wireshark.py"), "--branch", args.wireshark_branch]
    if args.protocols:
        ws_args += ["--protocols", args.protocols]
    elif args.all:
        ws_args += ["--all"]
    rc |= run(ws_args)
    if rc != 0:
        print("\n[FAIL] one or more extraction steps failed", file=sys.stderr)
        return rc
    print("\n[OK] reference data refreshed; review with: git diff catalog/")
    return 0


if __name__ == "__main__":
    sys.exit(main())
