# Roadmap

Items to address. Scope: standalone Suricata-authoring SPA. No platform integrations, no databases, no SIEM coupling.

Found a bug or want a feature? [Open an issue](https://github.com/mwilco03/SuriCraft/issues).

## Done

- [x] CSV / TSV paste import (step 1)
- [x] CSV file import via file picker (step 1)
- [x] Example CSV file at `examples/inventory-example.csv` (loadable from the paste UI)
- [x] CSV export of current inventory (round-trip out)
- [x] Generic Suricata bundle (no Malcolm / Security Onion / Hedgehog assumptions)
- [x] Catalog-driven detections (40 entries across Modbus, DNP3, CIP, S7Comm, GE-SRTP)
- [x] localStorage persistence; reset clears state
- [x] Bulk role tagging via per-asset checkboxes (superseded by step 2 redesign below)
- [x] Hide detections without coverable target by default; toggle to show orphans
- [x] Quick-filter presets in step 4: defaults, critical only, writes only, all on, all off
- [x] Per-protocol app-layer overlay: only emit `app-layer.protocols.<p>` blocks for protocols actually used by an asset role
- [x] Vendor cdnjs libs into `vendor/` so the SPA works air-gapped (React, ReactDOM, Babel-standalone, JSZip)
- [x] Rename asset.type to asset.notes (free-form, unparsed by the tool)
- [x] Step 2 redesign: replace abstract role-tagging with "access per protocol" — explicit target / operator / engineering / peer allow-lists per protocol. Internal storage still uses the role model for backward compat with previously-exported asset-model.json.
- [x] Footer links from the SPA to the docs (how this works, deployment, schema, limitations, roadmap, report issue, source).
- [x] `docs/how-this-works.md` explaining the access model, severity, threshold, byte-rules vs native parsers.
- [x] **Phase 1: extract reference data from Wireshark + Suricata upstream.** `scripts/extract_wireshark.py` pulls `static const value_string` tables from each dissector via raw.githubusercontent.com (no git clone) and emits `catalog/wireshark-tables/<proto>.json`. `scripts/extract_suricata.py` verifies app-layer parser file presence and writes `catalog/suricata-parsers.json` with hand-curated keyword names + docs URLs. Initial extraction covers dnp3, modbus, enip, cip, s7comm. Notes on limitations: Modbus function codes are #defines (not value_string) so its table count is small; GE-SRTP has no upstream Wireshark dissector and stays hand-curated.

## Pending

- [ ] **Validate generated rules.** Client-side syntax checker before export. Catch missing `sid`, unbalanced parens, unknown keywords, duplicate SIDs across the bundle. (Will be TDD'd on Linux; not for the Windows dev path.)
- [ ] **Asset-model diff on import.** When importing an `asset-model.json`, show what changed (added / removed / modified assets, edges, detection toggles) before applying.
- [ ] **Device archetype suggestions (opt-in).** Optional `catalog/device-archetypes.json` mapping vendor+model strings (e.g. "Siemens S7-1515-2 PN", not "PLC") to suggested `(role, protocol)` pairs. UI presents matches against asset names as suggestions only; never auto-applies. Goal: halve role-tagging time for common controllers without creating false confidence in a fake taxonomy.
- [ ] **Cross-protocol bulk apply in step 2.** Currently access categories are checked per protocol. A multi-asset, multi-protocol bulk apply ("these 5 HMIs are operator for Modbus + S7Comm + SRTP") would speed up multi-protocol sites.
- [ ] **Phase 2: extend Wireshark extraction to stub protocols.** Run `extract_wireshark.py` against iec104, bacnet, opcua, mms, profinet. Produces reference data for protocols where rule renderers are deferred but assets may carry the role.
- [ ] **Phase 3: renderer auto-derives `msg:` from Wireshark display names.** Catalog `title` becomes optional; when absent, look up the `(protocol, func)` in `catalog/wireshark-tables/` and synthesize the message string. Eliminates duplicate hand-typed display strings in the catalog.
- [ ] **Phase 4: "browse all known codes" panel in step 4.** Show every function/service code Wireshark knows about for each protocol, mark which ones SuriCraft has detections for, click-to-add a starter detection for the rest.
- [ ] **CI/CD for reference data.** GitHub Action that runs `scripts/regen_catalog.py` on a schedule (e.g. weekly) and opens a PR if `catalog/wireshark-tables/` or `catalog/suricata-parsers.json` change. Auto-tracks upstream Wireshark/Suricata releases without manual refresh. Pinning: action passes `--wireshark-branch` and `--suricata-branch` from a single config file checked into the repo.
- [ ] **CVE-driven detection workstream.** Separate `catalog/cve-detections.json` schema for signatures pulled from CISA ICS advisories and Exploit-DB. Hand-curated, no auto-extraction (advisory text is unstructured). Out of scope for Phase 1.

## Non-goals (explicit)

To keep the tool standalone and easy to audit, these are out of scope:

- PCAP analysis or capture
- SIEM, OpenSearch, ELK, Splunk, etc. query templates or back-end integration
- Vendor-specific deploy bundles (Malcolm, Security Onion, Hedgehog, etc.)
- CLI mode / CI integration
- Multi-user / team collaboration features
- Backend storage of any kind
- Live PCAP-based rule validation

If you want any of those, fork the repo and build it as a separate companion tool. The SPA stays focused on rule authoring.
