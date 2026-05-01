#!/usr/bin/env python3
"""
Verify the inventory of Suricata app-layer ICS parsers and emit a JSON
manifest. Keyword names are hand-curated with citations to the Suricata
docs site; the script confirms the upstream parser source files still
exist at the cited paths.

Auto-extracting keyword names from the C/Rust source is left for a
follow-up; the registration patterns vary per parser (sigmatch_table[]
in C, SCSigTableElmt in Rust) and a robust extractor is more work than
it is worth for the small number of OT app-layer parsers.

Usage:
  python scripts/extract_suricata.py
  python scripts/extract_suricata.py --branch master
"""
from __future__ import annotations

import argparse
import json
import sys
import urllib.request
from datetime import datetime, timezone
from pathlib import Path


SURICATA_RAW_BASE = "https://raw.githubusercontent.com/OISF/suricata/{branch}/"

# Hand-curated. Each entry's `sources` list is verified by the script.
# `keywords` and `docs` are statements we maintain by reading
# docs.suricata.io; refresh when bumping the pinned Suricata version.
PARSERS: dict[str, dict] = {
    "modbus": {
        "sources": ["src/app-layer-modbus.c", "src/detect-modbus.c"],
        "keywords": ["modbus"],
        "docs": "https://docs.suricata.io/en/latest/rules/modbus-keyword.html",
        "notes": "Single keyword `modbus:` with subfields function/access/unit_id.",
    },
    "dnp3": {
        "sources": ["src/app-layer-dnp3.c"],
        "keywords": ["dnp3_func", "dnp3_ind", "dnp3_obj", "dnp3_data"],
        "docs": "https://docs.suricata.io/en/latest/rules/dnp3-keywords.html",
        "notes": "Separate keywords for function code, internal indications, object groups, and data block matching.",
    },
    "enip": {
        "sources": ["rust/src/enip/mod.rs"],
        "keywords": ["enip_command", "cip_service"],
        "docs": "https://docs.suricata.io/en/latest/rules/enip-keyword.html",
        "notes": "ENIP framing keyword + CIP service code keyword. cip_service: takes a decimal service code. Migrated from C (src/app-layer-enip.c) to Rust in newer Suricata versions.",
    },
}

# Protocols Suricata does NOT have a native app-layer parser for at the time
# of this snapshot. Rules for these must use byte-pattern matching
# (content + offset/depth/distance/within).
NO_PARSER: list[str] = ["s7comm", "srtp", "iec104", "bacnet", "opcua", "mms", "profinet"]


def head_ok(url: str, timeout: int = 15) -> bool:
    req = urllib.request.Request(
        url,
        method="HEAD",
        headers={"User-Agent": "SuriCraft-extractor/1.0"},
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:  # nosec
            return r.status == 200
    except Exception:
        # raw.githubusercontent.com sometimes refuses HEAD; fall back to
        # a 1-byte GET probe.
        try:
            req = urllib.request.Request(
                url,
                headers={"User-Agent": "SuriCraft-extractor/1.0", "Range": "bytes=0-0"},
            )
            with urllib.request.urlopen(req, timeout=timeout) as r:  # nosec
                return r.status in (200, 206)
        except Exception:
            return False


def main() -> int:
    ap = argparse.ArgumentParser(description="Verify Suricata ICS parser inventory.")
    ap.add_argument("--branch", default="master")
    ap.add_argument("--out", default="catalog/suricata-parsers.json")
    args = ap.parse_args()

    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)

    base = SURICATA_RAW_BASE.format(branch=args.branch)
    parsers_out: dict[str, dict] = {}
    failures = 0
    for proto, meta in PARSERS.items():
        verified = []
        for src in meta["sources"]:
            url = base + src
            present = head_ok(url)
            verified.append({"path": src, "url": url, "present": present})
        all_present = all(v["present"] for v in verified)
        if not all_present:
            failures += 1
        parsers_out[proto] = {
            "keywords": meta["keywords"],
            "docs": meta["docs"],
            "notes": meta["notes"],
            "sources_verified": verified,
            "all_sources_present": all_present,
        }
        status = "ok" if all_present else "MISSING"
        print(f"  {proto:8s} [{status}] keywords={meta['keywords']}")

    out = {
        "extracted_at_utc": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "suricata_branch": args.branch,
        "parsers": parsers_out,
        "byte_rule_protocols": NO_PARSER,
        "byte_rule_note": (
            "Protocols listed under byte_rule_protocols have no native Suricata "
            "app-layer parser at the snapshot time. Detection rules for these "
            "must use byte-pattern matching (content + offset/depth/within)."
        ),
    }
    out_path.write_text(json.dumps(out, indent=2), encoding="utf-8")
    print(f"\nWrote {out_path}")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
