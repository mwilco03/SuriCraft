#!/usr/bin/env python3
"""
Extract `static const value_string` tables from Wireshark dissectors and
emit JSON. Pulls source files via raw.githubusercontent.com so no git
clone is required.

Usage:
  python scripts/extract_wireshark.py
  python scripts/extract_wireshark.py --all
  python scripts/extract_wireshark.py --branch release-4.4 --protocols dnp3,modbus
"""
from __future__ import annotations

import argparse
import json
import re
import sys
import urllib.request
from datetime import datetime, timezone
from pathlib import Path


# Map our protocol keys to the dissector filename(s) under
# epan/dissectors/. Multiple files are concatenated; emitted table names
# are prefixed with the source file stem to keep them distinct.
# Mainline Wireshark filenames as of 2026-05. Renames: packet-dnp3.c was
# renamed packet-dnp.c. GE-SRTP has no upstream Wireshark dissector;
# detection rules for it stay hand-curated as byte-pattern rules in
# catalog/default-detections.json.
DISSECTORS: dict[str, list[str]] = {
    "dnp3":     ["packet-dnp.c"],
    "modbus":   ["packet-mbtcp.c"],
    "enip":     ["packet-enip.c"],
    "cip":      ["packet-cip.c"],
    "s7comm":   ["packet-s7comm.c"],
    # "srtp": no upstream Wireshark dissector; GE-SRTP rules remain hand-curated.
    "iec104":   ["packet-iec104.c"],
    "bacnet":   ["packet-bacapp.c"],
    "opcua":    ["packet-opcua.c"],
    "mms":      ["packet-mms.c"],
    "profinet": ["packet-pn-rt.c", "packet-pn-dcp.c", "packet-pn-io.c"],
}

WIRESHARK_RAW_BASE = "https://raw.githubusercontent.com/wireshark/wireshark/{branch}/epan/dissectors/"

# Match `static const value_string <name>[] = { ... };` and the _ext variant.
ARRAY_DECL = re.compile(
    r"static\s+const\s+value_string(?:_ext)?\s+(\w+)\s*\[\s*\]\s*=\s*\{(.*?)\}\s*;",
    re.DOTALL,
)

# A table entry: `{ <code-or-symbol>, "<display>" }`. Whitespace tolerant.
ENTRY = re.compile(
    r"\{\s*"
    r"(-?0[xX][0-9A-Fa-f]+|-?\d+|[A-Za-z_]\w*)"
    r"\s*,\s*"
    r'"((?:[^"\\]|\\.)*)"'
    r"\s*\}",
    re.DOTALL,
)

# `#define NAME 0xNN` or `#define NAME 123` (parens around value tolerated).
DEFINE = re.compile(
    r"^\s*#\s*define\s+(\w+)\s+\(?\s*(-?0[xX][0-9A-Fa-f]+|-?\d+)\s*\)?\s*(?:/\*|//|$)",
    re.MULTILINE,
)


def strip_comments(src: str) -> str:
    src = re.sub(r"/\*.*?\*/", "", src, flags=re.DOTALL)
    src = re.sub(r"//[^\n]*", "", src)
    return src


def fetch_text(url: str, timeout: int = 30) -> str:
    req = urllib.request.Request(
        url,
        headers={"User-Agent": "SuriCraft-extractor/1.0"},
    )
    with urllib.request.urlopen(req, timeout=timeout) as r:  # nosec - controlled URL
        return r.read().decode("utf-8", errors="replace")


def parse_value_string_tables(src: str) -> dict[str, list[dict]]:
    src_clean = strip_comments(src)

    defines: dict[str, int] = {}
    for m in DEFINE.finditer(src_clean):
        token = m.group(2)
        try:
            defines[m.group(1)] = int(token, 0)
        except ValueError:
            continue

    tables: dict[str, list[dict]] = {}
    for arr_match in ARRAY_DECL.finditer(src_clean):
        name = arr_match.group(1)
        body = arr_match.group(2)
        entries: list[dict] = []
        for em in ENTRY.finditer(body):
            token = em.group(1)
            label = em.group(2)
            if not label:
                # `{ 0, NULL }` terminators get matched as "{ 0, "" }" only if
                # the label is the empty string — those we drop explicitly.
                continue
            code: int | None = None
            tlow = token.lower()
            if tlow.startswith("0x") or tlow.startswith("-0x"):
                try:
                    code = int(token, 16)
                except ValueError:
                    code = None
            elif token.lstrip("-").isdigit():
                code = int(token)
            elif token in defines:
                code = defines[token]
            if code is None:
                continue
            entries.append({"code": code, "name": label})
        if entries:
            tables[name] = entries
    return tables


def extract_protocol(proto: str, files: list[str], branch: str, out_dir: Path) -> tuple[Path, int, int]:
    base = WIRESHARK_RAW_BASE.format(branch=branch)
    aggregated: dict[str, list[dict]] = {}
    sources: list[dict] = []
    total_entries = 0
    for fname in files:
        url = base + fname
        try:
            src = fetch_text(url)
        except Exception as exc:  # noqa: BLE001 - we want the message
            sources.append({"file": fname, "url": url, "error": str(exc)})
            continue
        sources.append({"file": fname, "url": url, "size_bytes": len(src)})
        tables = parse_value_string_tables(src)
        prefix = (Path(fname).stem.replace("packet-", "") + ".") if len(files) > 1 else ""
        for k, v in tables.items():
            aggregated[prefix + k] = v
            total_entries += len(v)
    out = {
        "protocol": proto,
        "wireshark_branch": branch,
        "sources": sources,
        "extracted_at_utc": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "table_count": len(aggregated),
        "entry_count": total_entries,
        "tables": aggregated,
    }
    out_path = out_dir / f"{proto}.json"
    out_path.write_text(json.dumps(out, indent=2), encoding="utf-8")
    return out_path, len(aggregated), total_entries


def main() -> int:
    ap = argparse.ArgumentParser(description="Extract Wireshark value_string tables.")
    ap.add_argument("--branch", default="master", help="Wireshark git branch/tag (default: master)")
    ap.add_argument(
        "--protocols",
        default="dnp3,modbus,enip,cip,s7comm",
        help="comma-separated protocol keys (default: native-parser protocols in the curated catalog; GE-SRTP has no upstream dissector and is omitted)",
    )
    ap.add_argument("--all", action="store_true", help="extract every known protocol")
    ap.add_argument("--out-dir", default="catalog/wireshark-tables")
    args = ap.parse_args()

    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    proto_list = list(DISSECTORS.keys()) if args.all else [p.strip() for p in args.protocols.split(",") if p.strip()]
    print(f"Extracting from Wireshark @ {args.branch}: {proto_list}")
    fails = 0
    for proto in proto_list:
        files = DISSECTORS.get(proto)
        if not files:
            print(f"  [skip] {proto}: no dissector mapping; add one to DISSECTORS")
            fails += 1
            continue
        try:
            path, t_count, e_count = extract_protocol(proto, files, args.branch, out_dir)
            print(f"  [ok]   {proto}: {t_count} tables, {e_count} entries -> {path}")
        except Exception as exc:  # noqa: BLE001
            print(f"  [err]  {proto}: {exc}")
            fails += 1
    return 1 if fails else 0


if __name__ == "__main__":
    sys.exit(main())
