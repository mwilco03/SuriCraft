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

## Pending

- [ ] **Validate generated rules.** Client-side syntax checker before export. Catch missing `sid`, unbalanced parens, unknown keywords, duplicate SIDs across the bundle. (Will be TDD'd on Linux; not for the Windows dev path.)
- [ ] **Asset-model diff on import.** When importing an `asset-model.json`, show what changed (added / removed / modified assets, edges, detection toggles) before applying.
- [ ] **Device archetype suggestions (opt-in).** Optional `catalog/device-archetypes.json` mapping vendor+model strings (e.g. "Siemens S7-1515-2 PN", not "PLC") to suggested `(role, protocol)` pairs. UI presents matches against asset names as suggestions only; never auto-applies. Goal: halve role-tagging time for common controllers without creating false confidence in a fake taxonomy.
- [ ] **Cross-protocol bulk apply in step 2.** Currently access categories are checked per protocol. A multi-asset, multi-protocol bulk apply ("these 5 HMIs are operator for Modbus + S7Comm + SRTP") would speed up multi-protocol sites.

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
