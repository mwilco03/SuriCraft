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
- [x] Bulk role tagging (multi-select assets, apply / remove `(role, protocol)` pair to all selected)
- [x] Hide detections without coverable target by default; toggle to show orphans
- [x] Quick-filter presets in step 4: defaults, critical only, writes only, all on, all off
- [x] Per-protocol app-layer overlay: only emit `app-layer.protocols.<p>` blocks for protocols actually used by an asset role
- [x] Vendor cdnjs libs into `vendor/` so the SPA works air-gapped (React, ReactDOM, Babel-standalone, JSZip)

## Pending

- [ ] **Validate generated rules.** Client-side syntax checker before export. Catch missing `sid`, unbalanced parens, unknown keywords, duplicate SIDs across the bundle. (Will be TDD'd on Linux; not for the Windows dev path.)
- [ ] **Asset-model diff on import.** When importing an `asset-model.json`, show what changed (added / removed / modified assets, edges, detection toggles) before applying.

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
