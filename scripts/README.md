# Reference data extraction

Two scripts pull upstream reference data and write it under `catalog/` so the SPA can use authoritative function/service code names without us hand-curating them.

## Sources of truth

| What | Source | Auto-extractable? |
|---|---|---|
| Which protocols Suricata can parse as app-layer | `OISF/suricata` `src/app-layer-<proto>.{c,rs}` | partially — file presence is checked, keyword names hand-curated |
| Function / service / opcode enumerations | `wireshark/wireshark` `epan/dissectors/packet-<proto>.c` `static const value_string` | yes, regex-grade |
| Suricata keyword names + docs URLs | docs.suricata.io | hand-curated table in `extract_suricata.py` |
| CVE-driven detection signatures | CISA, Exploit-DB, vendor advisories | no — pure curation, future workstream |

## Files

- `extract_suricata.py` - verifies inventory of Suricata ICS app-layer parsers; writes `catalog/suricata-parsers.json`. Hand-curated keyword names with citations.
- `extract_wireshark.py` - fetches Wireshark dissector source by URL, regex-extracts every `static const value_string` table, writes `catalog/wireshark-tables/<protocol>.json`.
- `regen_catalog.py` - one-shot driver that runs both. Run when bumping pinned upstream versions.

## How to refresh

```sh
python scripts/regen_catalog.py
git diff catalog/
```

Pin a specific Wireshark or Suricata version:

```sh
python scripts/regen_catalog.py --wireshark-branch release-4.4 --suricata-branch master
```

Pull every known protocol (not just the curated 5):

```sh
python scripts/regen_catalog.py --all
```

## What the SPA does with this

Right now: nothing yet (Phase 1 is just the data extraction). Future phases will use the reference data to:

1. Auto-derive `msg:` text in generated rules from Wireshark display names instead of hand-typed strings in the catalog.
2. Show "Wireshark knows about these N function codes; SuriCraft has detections for these M; click to add a starter detection for the rest" in step 4.
3. Cross-check the curated catalog at load time and warn if a `func` value's display name has drifted from upstream.

See `docs/roadmap.md` for the full phasing plan.

## No git clone, no build step

Both scripts pull source files directly via `raw.githubusercontent.com`. No git clone of Wireshark or Suricata is required (Wireshark alone is ~1 GB). The trade is per-protocol HTTP fetches at run time, which take a few seconds.

## Limitations of the Wireshark extractor

- `static const value_string` is the common pattern; tables defined via macros, generated tables, or tables expressed as `value_string_ext` arrays referencing helper functions are not always extracted cleanly.
- Entries using `#define`d constants are resolved when the constant is defined in the same file; cross-file constants are skipped.
- Unicode in display strings is preserved as-is.

If a table appears truncated or missing, open the dissector source manually and confirm the pattern. The script's [err] / [skip] output names every protocol that failed.
